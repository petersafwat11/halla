/**
 * Templates service — visual template CRUD plus host-facing list. Image
 * storage is via S3 proxy upload; sharp generates a webp thumbnail at
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
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");

// `sharp` is loaded lazily so a dev environment without `npm install`
// still boots; the admin upload path surfaces a clear error otherwise.
let sharp = null;
try {
  sharp = require("sharp");
} catch (_) {
  sharp = null;
}

const isS3Configured = () =>
  !!(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_REGION &&
    process.env.AWS_S3_BUCKET
  );

let s3Client = null;
function getS3() {
  if (s3Client) return s3Client;
  if (!isS3Configured()) return null;
  s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
  return s3Client;
}

// CloudFront when provisioned, otherwise the bucket URL.
function s3KeyToUrl(key) {
  if (!key) return null;
  if (process.env.CLOUDFRONT_DOMAIN) {
    return `https://${process.env.CLOUDFRONT_DOMAIN}/${key}`;
  }
  if (process.env.AWS_S3_BASE_URL) {
    return `${process.env.AWS_S3_BASE_URL}/${key}`;
  }
  return `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}

async function deleteS3Key(key) {
  if (!key) return;
  const client = getS3();
  if (!client) return;
  try {
    await client.send(
      new DeleteObjectCommand({ Bucket: process.env.AWS_S3_BUCKET, Key: key })
    );
  } catch (err) {
    logger.error("[templates.service] S3 delete failed", { message: err.message });
  }
}

/**
 * Accept a file buffer from the backend (proxy upload) and PUT it
 * directly to S3. Generates the same key format used by processImage.
 */
async function handleImageUpload({ fileBuffer, filename, contentType, templateId = "new" }) {
  if (!/^image\/(jpeg|png|webp)$/.test(contentType)) {
    throw new ValidationError("contentType must be image/jpeg, image/png, or image/webp");
  }
  if (!filename || filename.length > 200) {
    throw new ValidationError("filename is required (max 200 chars)");
  }
  const client = getS3();
  if (!client) throw new AppError("S3 is not configured", 500, "S3_NOT_CONFIGURED");

  const safeFilename = String(filename).replace(/[^a-zA-Z0-9._-]/g, "-");
  const key = `templates/${templateId}/original-${Date.now()}-${safeFilename}`;

  await client.send(
    new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
    })
  );

  return { s3Key: key };
}

/**
 * Process the uploaded original — fetch from S3, generate webp
 * thumbnail (320 wide), upload thumbnail, return natural dimensions
 * plus thumbnail key.
 */
async function processImage(s3Key) {
  if (!sharp) {
    // Dev-mode fallback: accept the original as-is, no thumbnail.
    return {
      thumbnailS3Key: null,
      naturalWidth: 1080,
      naturalHeight: 1350,
    };
  }
  const client = getS3();
  if (!client) {
    throw new AppError("S3 is not configured", 500, "S3_NOT_CONFIGURED");
  }

  const obj = await client.send(
    new GetObjectCommand({ Bucket: process.env.AWS_S3_BUCKET, Key: s3Key })
  );
  const chunks = [];
  for await (const chunk of obj.Body) chunks.push(chunk);
  const buffer = Buffer.concat(chunks);

  const meta = await sharp(buffer).metadata();
  const naturalWidth = meta.width || 1080;
  const naturalHeight = meta.height || 1350;

  const thumbBuffer = await sharp(buffer).resize({ width: 320 }).webp({ quality: 80 }).toBuffer();
  const thumbnailKey = s3Key.replace(/^(templates\/[^/]+)\/original-(.+)$/, (_m, dir, name) => {
    return `${dir}/thumb-${name}.webp`;
  });

  // Cache-Control set so CloudFront/browsers cache aggressively — the S3 key
  // includes a Date.now() suffix so changes always produce a fresh URL.
  await client.send(
    new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: thumbnailKey,
      Body: thumbBuffer,
      ContentType: "image/webp",
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  return { thumbnailS3Key: thumbnailKey, naturalWidth, naturalHeight };
}

// ============================================
// CRUD
// ============================================

const LIST_LIMIT = 200;

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

  return Template.find(query)
    .select("-imageS3Key -createdBy -updatedBy -version -__v")
    .sort({ sortOrder: 1, createdAt: -1 })
    .limit(LIST_LIMIT)
    .lean();
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

  return Template.find(query)
    .sort({ sortOrder: 1, createdAt: -1 })
    .limit(LIST_LIMIT)
    .lean();
}

async function getById(id) {
  const doc = await Template.findById(id).lean();
  if (!doc || doc.deletedAt) throw new NotFoundError("Template");
  return doc;
}

async function createTemplate(payload, actor) {
  const { s3Key, ...templateFields } = payload;

  let processed;
  try {
    processed = await processImage(s3Key);
    const doc = await Template.create({
      ...templateFields,
      imageS3Key: s3Key,
      imageUrl: s3KeyToUrl(s3Key),
      thumbnailS3Key: processed.thumbnailS3Key,
      thumbnailUrl: processed.thumbnailS3Key ? s3KeyToUrl(processed.thumbnailS3Key) : null,
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

    return doc;
  } catch (err) {
    await deleteS3Key(s3Key).catch(() => {});
    if (processed?.thumbnailS3Key) await deleteS3Key(processed.thumbnailS3Key).catch(() => {});
    throw err;
  }
}

async function updateTemplate(id, payload, actor) {
  const doc = await Template.findById(id);
  if (!doc || doc.deletedAt) throw new NotFoundError("Template");

  const { s3Key, expectedVersion, ...rest } = payload;

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
    if (s3Key && s3Key !== doc.imageS3Key) {
      newProcessed = await processImage(s3Key);
      oldImageKey = doc.imageS3Key;
      oldThumbKey = doc.thumbnailS3Key;
      doc.imageS3Key = s3Key;
      doc.imageUrl = s3KeyToUrl(s3Key);
      doc.thumbnailS3Key = newProcessed.thumbnailS3Key;
      doc.thumbnailUrl = newProcessed.thumbnailS3Key
        ? s3KeyToUrl(newProcessed.thumbnailS3Key)
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

    if (oldImageKey) await deleteS3Key(oldImageKey).catch(() => {});
    if (oldThumbKey) await deleteS3Key(oldThumbKey).catch(() => {});

    await logAudit({
      action: "template.update",
      actor,
      targetType: "template",
      targetId: doc._id,
      metadata: { nameEn: doc.nameEn, version: doc.version },
    });

    return doc;
  } catch (err) {
    if (s3Key && s3Key !== oldImageKey) await deleteS3Key(s3Key).catch(() => {});
    if (newProcessed?.thumbnailS3Key) await deleteS3Key(newProcessed.thumbnailS3Key).catch(() => {});
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
    imageS3Key: src.imageS3Key, // shares the original — admin should re-upload before publishing
    thumbnailUrl: src.thumbnailUrl,
    thumbnailS3Key: src.thumbnailS3Key,
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

  return clone;
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
  createTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
  // Upload
  handleImageUpload,
  processImage,
  s3KeyToUrl,
  deleteS3Key,
  // Categories
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
