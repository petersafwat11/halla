/**
 * Templates service — visual template CRUD plus host-facing list. Image
 * storage is via the configured storage driver; sharp generates a webp thumbnail at
 * 320 wide on commit. Orphan cleanup runs inline on every create/update
 * failure; a daily GC job (`scripts/gcOrphanTemplateImages.js`) sweeps
 * any stragglers.
 */

const Template = require("../../../models/TemplateModel");
const TemplateCategory = require("../../../models/TemplateCategoryModel");
const { logAudit } = require("../../shared/utils/auditLog");
const logger = require("../../shared/utils/logger");
const { ROLES } = require("../../shared/constants/roles");
const {
  NotFoundError,
  ValidationError,
  AppError,
} = require("../../shared/errors");

const {
  normalizeObjectKey,
  localRefForKey,
  writeLocalObject,
  readLocalObject,
  deleteLocalObject,
  contentTypeForRef,
} = require("../../shared/utils/localStorage");

// `sharp` is loaded lazily so a dev environment without `npm install`
// still boots; the admin upload path surfaces a clear error otherwise.
let sharp = null;
try {
  sharp = require("sharp");
} catch (_) {
  sharp = null;
}

function storedImageUrl(ref) {
  return localRefForKey(ref);
}

async function deleteStoredImage(ref) {
  if (!ref) return;
  try {
    await deleteLocalObject(ref);
  } catch (err) {
    logger.error("[templates.service] local delete failed", { message: err.message });
  }
}

/**
 * Persist a template image under the VPS upload root.
 */
async function handleImageUpload({ fileBuffer, filename, contentType, templateId = "new" }) {
  if (!/^image\/(jpeg|png|webp)$/.test(contentType)) {
    throw new ValidationError("contentType must be image/jpeg, image/png, or image/webp");
  }
  if (!filename || filename.length > 200) {
    throw new ValidationError("filename is required (max 200 chars)");
  }
  const safeFilename = String(filename).replace(/[^a-zA-Z0-9._-]/g, "-");
  const key = `templates/${templateId}/original-${Date.now()}-${safeFilename}`;

  const imageRef = await writeLocalObject({ key, body: fileBuffer });
  return { imageRef };
}

/**
 * Generate a 320px webp thumbnail and return its local reference.
 */
async function processImage(imageRef) {
  if (!sharp) {
    // Dev-mode fallback: accept the original as-is, no thumbnail.
    return {
      thumbnailRef: null,
      naturalWidth: 1080,
      naturalHeight: 1350,
    };
  }
  const buffer = await readLocalObject(imageRef);

  const meta = await sharp(buffer).metadata();
  const naturalWidth = meta.width || 1080;
  const naturalHeight = meta.height || 1350;

  const thumbBuffer = await sharp(buffer).resize({ width: 320 }).webp({ quality: 80 }).toBuffer();
  const originalKey = normalizeObjectKey(imageRef);
  const thumbnailKey = originalKey.replace(/^(templates\/[^/]+)\/original-(.+)$/, (_m, dir, name) => {
    return `${dir}/thumb-${name}.webp`;
  });

  const thumbnailRef = await writeLocalObject({ key: thumbnailKey, body: thumbBuffer });
  return { thumbnailRef, naturalWidth, naturalHeight };
}

// ============================================
// CRUD
// ============================================

const LIST_LIMIT = 200;

/**
 * Public origin every client-facing media URL is built from. Compose sets
 * PUBLIC_MEDIA_BASE_URL explicitly; BACKEND_URL (localhost default) is only
 * a dev fallback. Empty result yields root-relative URLs, which both apps'
 * resolvers join against their own API origin.
 */
function publicMediaOrigin() {
  return String(
    process.env.PUBLIC_MEDIA_BASE_URL ||
      process.env.BACKEND_URL ||
      ""
  ).replace(/\/$/, "");
}

/**
 * Return stable API asset URLs; the authenticated asset route streams files
 * from the persistent VPS upload volume.
 */
function withAssetUrls(doc) {
  if (!doc) return doc;
  const plain = doc.toObject ? doc.toObject() : { ...doc };
  const id = String(plain._id || plain.id || "");
  if (!id) return plain;
  const assetBase = `${publicMediaOrigin()}/api/v2/templates/${id}/asset`;
  return {
    ...plain,
    imageUrl: `${assetBase}?variant=original`,
    thumbnailUrl: `${assetBase}?variant=thumbnail`,
  };
}

// Categories whose templates / chips are intentionally hidden from the
// host-facing endpoints (home page + create-event step 3). They drive
// admin/internal flows — post-event content and staff/moderator entry —
// not the invitations a host would pick for a new event.
const HOST_HIDDEN_CATEGORY_CODES = ["post_event", "staff_access"];

async function listForHost({ category } = {}) {
  if (category && HOST_HIDDEN_CATEGORY_CODES.includes(category)) return [];

  const query = { active: true, deletedAt: null };
  if (category) {
    query.categories = category;
  } else {
    query.categories = { $nin: HOST_HIDDEN_CATEGORY_CODES };
  }

  const docs = await Template.find(query)
    .select("-imageRef -createdBy -updatedBy -version -__v")
    .sort({ sortOrder: 1, createdAt: -1 })
    .limit(LIST_LIMIT)
    .lean();
  return docs.map(withAssetUrls);
}

async function listForAdmin({ query: rawQuery = {}, actor } = {}) {
  const isSuperAdmin = actor?.role === ROLES.SUPER_ADMIN;
  const includeInactive = rawQuery.includeInactive !== "false";
  const includeDeleted = rawQuery.includeDeleted === "true";

  const query = {};
  if (!includeDeleted || !isSuperAdmin) query.deletedAt = null;
  if (!includeInactive) query.active = true;
  if (rawQuery.category) query.categories = rawQuery.category;
  if (rawQuery.search) {
    const escaped = String(rawQuery.search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    query.$or = [
      { nameEn: { $regex: escaped, $options: "i" } },
      { nameAr: { $regex: escaped, $options: "i" } },
    ];
  }

  const docs = await Template.find(query)
    .sort({ sortOrder: 1, createdAt: -1 })
    .limit(LIST_LIMIT)
    .lean();
  return docs.map(withAssetUrls);
}

async function getById(id) {
  const doc = await Template.findById(id).lean();
  if (!doc || doc.deletedAt) throw new NotFoundError("Template");
  return withAssetUrls(doc);
}

async function getAsset(id, variant = "thumbnail") {
  const doc = await Template.findById(id)
    .select("imageRef thumbnailRef active deletedAt")
    .lean();
  if (!doc || doc.deletedAt || !doc.active) throw new NotFoundError("Template");

  const key =
    variant === "original"
      ? doc.imageRef
      : doc.thumbnailRef || doc.imageRef;
  if (!key) throw new NotFoundError("Template image");

  try {
    return {
      body: await readLocalObject(key),
      contentType: contentTypeForRef(key),
      etag: null,
    };
  } catch (err) {
    if (err.code === "ENOENT") throw new NotFoundError("Template image");
    throw err;
  }
}

async function createTemplate(payload, actor) {
  const { imageRef, ...templateFields } = payload;

  let processed;
  try {
    processed = await processImage(imageRef);
    const doc = await Template.create({
      ...templateFields,
      imageRef,
      imageUrl: storedImageUrl(imageRef),
      thumbnailRef: processed.thumbnailRef,
      thumbnailUrl: processed.thumbnailRef ? storedImageUrl(processed.thumbnailRef) : null,
      naturalWidth: processed.naturalWidth,
      naturalHeight: processed.naturalHeight,
      createdBy: actor?._id || null,
      version: 0,
    });

    await logAudit({
      action: "template.create",
      actor,
      targetType: "template",
      targetId: doc._id,
      metadata: { nameEn: doc.nameEn, categories: doc.categories },
    });

    return withAssetUrls(doc);
  } catch (err) {
    await deleteStoredImage(imageRef).catch(() => {});
    if (processed?.thumbnailRef) await deleteStoredImage(processed.thumbnailRef).catch(() => {});
    throw err;
  }
}

async function updateTemplate(id, payload, actor) {
  const doc = await Template.findById(id);
  if (!doc || doc.deletedAt) throw new NotFoundError("Template");

  const { imageRef, expectedVersion, ...rest } = payload;

  // Optimistic locking: editor sends the version it loaded; if another
  // admin saved in the meantime the stamp won't match and we 409 instead
  // of silently overwriting their changes.
  if ((doc.version || 0) !== expectedVersion) {
    throw new AppError(
      "Template was modified by another editor. Reload and re-apply your changes.",
      409,
      "TEMPLATE_VERSION_CONFLICT"
    );
  }

  let newProcessed = null;
  let oldImageKey = null;
  let oldThumbKey = null;

  try {
    if (imageRef && imageRef !== doc.imageRef) {
      newProcessed = await processImage(imageRef);
      oldImageKey = doc.imageRef;
      oldThumbKey = doc.thumbnailRef;
      doc.imageRef = imageRef;
      doc.imageUrl = storedImageUrl(imageRef);
      doc.thumbnailRef = newProcessed.thumbnailRef;
      doc.thumbnailUrl = newProcessed.thumbnailRef
        ? storedImageUrl(newProcessed.thumbnailRef)
        : null;
      doc.naturalWidth = newProcessed.naturalWidth;
      doc.naturalHeight = newProcessed.naturalHeight;
    }

    const writableFields = [
      "nameEn",
      "nameAr",
      "categories",
      "fields",
      "overlays",
      "decorations",
      "sortOrder",
      "active",
    ];
    for (const f of writableFields) {
      if (rest[f] !== undefined) doc[f] = rest[f];
    }
    doc.updatedBy = actor?._id || null;
    doc.version = (doc.version || 0) + 1;

    await doc.save();

    if (oldImageKey) await deleteStoredImage(oldImageKey).catch(() => {});
    if (oldThumbKey) await deleteStoredImage(oldThumbKey).catch(() => {});

    await logAudit({
      action: "template.update",
      actor,
      targetType: "template",
      targetId: doc._id,
      metadata: { nameEn: doc.nameEn, version: doc.version },
    });

    return withAssetUrls(doc);
  } catch (err) {
    if (imageRef && imageRef !== oldImageKey) await deleteStoredImage(imageRef).catch(() => {});
    if (newProcessed?.thumbnailRef) await deleteStoredImage(newProcessed.thumbnailRef).catch(() => {});
    throw err;
  }
}

async function deleteTemplate(id, actor) {
  const doc = await Template.findById(id);
  if (!doc || doc.deletedAt) throw new NotFoundError("Template");

  doc.deletedAt = new Date();
  doc.deletedBy = actor?._id || null;
  doc.active = false;
  await doc.save();

  await logAudit({
    action: "template.delete",
    actor,
    targetType: "template",
    targetId: doc._id,
    metadata: { nameEn: doc.nameEn },
  });
  return { id: doc._id };
}

async function duplicateTemplate(id, actor) {
  const src = await Template.findById(id);
  if (!src || src.deletedAt) throw new NotFoundError("Template");

  const clone = await Template.create({
    nameEn: `${src.nameEn} (Copy)`,
    nameAr: `${src.nameAr} (نسخة)`,
    categories: src.categories,
    imageUrl: src.imageUrl,
    imageRef: src.imageRef, // shares the original — admin should re-upload before publishing
    thumbnailUrl: src.thumbnailUrl,
    thumbnailRef: src.thumbnailRef,
    naturalWidth: src.naturalWidth,
    naturalHeight: src.naturalHeight,
    fields: src.fields,
    overlays: src.overlays,
    decorations: src.decorations,
    sortOrder: src.sortOrder + 1,
    active: false,
    createdBy: actor?._id || null,
    version: 0,
  });

  await logAudit({
    action: "template.duplicate",
    actor,
    targetType: "template",
    targetId: clone._id,
    metadata: { sourceId: src._id, nameEn: clone.nameEn },
  });

  return withAssetUrls(clone);
}

// ============================================
// CATEGORIES
// ============================================

async function listCategories({ includeInactive = false, forHost = false } = {}) {
  const query = {};
  if (!includeInactive) query.active = true;
  if (forHost) query.code = { $nin: HOST_HIDDEN_CATEGORY_CODES };
  return TemplateCategory.find(query).sort({ sortOrder: 1, code: 1 }).lean();
}

async function createCategory(payload, actor) {
  const code = String(payload.code).toLowerCase().replace(/[^a-z0-9_]/g, "_");
  const doc = await TemplateCategory.create({
    code,
    nameEn: payload.nameEn,
    nameAr: payload.nameAr,
    sortOrder: payload.sortOrder || 0,
    active: payload.active !== false,
    createdBy: actor?._id || null,
  });
  await logAudit({
    action: "template_category.create",
    actor,
    targetType: "template_category",
    targetId: doc._id,
    metadata: { code: doc.code },
  });
  return doc;
}

async function updateCategory(id, payload, actor) {
  const doc = await TemplateCategory.findById(id);
  if (!doc) throw new NotFoundError("TemplateCategory");
  ["nameEn", "nameAr", "sortOrder", "active"].forEach((f) => {
    if (payload[f] !== undefined) doc[f] = payload[f];
  });
  doc.updatedBy = actor?._id || null;
  await doc.save();
  await logAudit({
    action: "template_category.update",
    actor,
    targetType: "template_category",
    targetId: doc._id,
  });
  return doc;
}

async function deleteCategory(id, actor) {
  const doc = await TemplateCategory.findById(id);
  if (!doc) throw new NotFoundError("TemplateCategory");
  // Soft via active=false; hard delete would orphan templates referencing it.
  doc.active = false;
  doc.updatedBy = actor?._id || null;
  await doc.save();
  await logAudit({
    action: "template_category.deactivate",
    actor,
    targetType: "template_category",
    targetId: doc._id,
  });
  return { id: doc._id };
}

module.exports = {
  // CRUD
  listForHost,
  listForAdmin,
  getById,
  getAsset,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
  // Upload
  handleImageUpload,
  processImage,
  storedImageUrl,
  deleteStoredImage,
  // Asset URL helpers (reused by events.crud for populated templateRefs)
  publicMediaOrigin,
  withAssetUrls,
  // Categories
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
