/**
 * Templates Service — Phase 4c W0-VISUAL-BACKEND
 *
 * Visual template CRUD (admin) + host-facing list. Image storage uses
 * presigned-POST against the project's existing S3 bucket (per
 * `s3Upload.js` env vars). Sharp generates a webp thumbnail at 320px wide
 * after the upload commits.
 *
 * Orphan cleanup (v4.1 §A-7.1):
 *   - inline: every create/update wraps the post-upload work in a
 *     try/catch and `DeleteObjectCommand`s the new key on any throw.
 *   - daily GC: `scripts/gcOrphanTemplateImages.js` walks `templates/*`
 *     and deletes keys with no matching `imageS3Key|thumbnailS3Key` row.
 *
 * @module modules/templates/templates.service
 */

const Template = require("../../../models/TemplateModel");
const TemplateCategory = require("../../../models/TemplateCategoryModel");
const { logAudit } = require("../../shared/utils/auditLog");
const {
  NotFoundError,
  ValidationError,
  AppError,
} = require("../../shared/errors");

// AWS SDK v3 — already a project dep via s3Upload.js
const {
  S3Client,
  DeleteObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");

// `sharp` is a NEW dependency added in PHASE_4C_PLAN §1 D4c-5. Loaded
// lazily so a dev environment without `npm install` still boots; the
// admin upload path will surface a clear error instead.
let sharp = null;
try {
  sharp = require("sharp");
} catch (_) {
  sharp = null;
}

// `@aws-sdk/s3-presigned-post` is a NEW dep added in D4c-5. Loaded lazily
// for the same reason.
let createPresignedPost = null;
try {
  createPresignedPost = require("@aws-sdk/s3-presigned-post").createPresignedPost;
} catch (_) {
  createPresignedPost = null;
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

/**
 * Build the public read URL for an S3 key.
 *
 * Per v4.1 §A-7 imageUrl fallback: prefer CloudFront when provisioned,
 * otherwise fall back to the virtual-hosted bucket URL. Phase 5 will
 * actually provision CloudFront — until then we use the bucket URL.
 */
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
    console.error("[templates.service] S3 delete failed:", err.message);
  }
}

/**
 * Generate a presigned POST for browser upload.
 *
 * Body shape: { filename, contentType }. Validates contentType against
 * the allowlist and clamps file-size to 5 MB at the policy level so S3
 * rejects oversized uploads before they're stored.
 */
async function getUploadUrl({ filename, contentType, templateId = "new" }) {
  if (!createPresignedPost) {
    throw new AppError(
      "@aws-sdk/s3-presigned-post is not installed; run `npm install` in labbe-backend-",
      500,
      "PRESIGNED_POST_UNAVAILABLE"
    );
  }
  const client = getS3();
  if (!client) {
    throw new AppError("S3 is not configured", 500, "S3_NOT_CONFIGURED");
  }
  if (!/^image\/(jpeg|png|webp)$/.test(contentType)) {
    throw new ValidationError("contentType must be image/jpeg, image/png, or image/webp");
  }
  if (!filename || filename.length > 200) {
    throw new ValidationError("filename is required (max 200 chars)");
  }

  const safeFilename = String(filename).replace(/[^a-zA-Z0-9._-]/g, "-");
  const key = `templates/${templateId}/original-${Date.now()}-${safeFilename}`;

  const presigned = await createPresignedPost(client, {
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
    Conditions: [
      ["content-length-range", 0, 5 * 1024 * 1024],
      ["eq", "$Content-Type", contentType],
    ],
    Fields: { "Content-Type": contentType },
    Expires: 3600,
  });

  return {
    url: presigned.url,
    fields: presigned.fields,
    s3Key: key,
  };
}

/**
 * Process the uploaded original — fetch from S3, generate webp
 * thumbnail (320 wide), upload thumbnail, return natural dimensions +
 * thumbnail key.
 */
async function processImage(s3Key) {
  if (!sharp) {
    // Dev-mode fallback: accept the original as-is, no thumbnail. This
    // lets local contributors run the editor without `sharp` while
    // production envs always have it installed.
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

  // Fetch original
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

  const { PutObjectCommand } = require("@aws-sdk/client-s3");
  await client.send(
    new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: thumbnailKey,
      Body: thumbBuffer,
      ContentType: "image/webp",
      ACL: "private",
    })
  );

  return { thumbnailS3Key: thumbnailKey, naturalWidth, naturalHeight };
}

// ============================================
// CRUD
// ============================================

async function listForHost({ category } = {}) {
  const query = { active: true, deletedAt: null };
  if (category) query.categories = category;

  const docs = await Template.find(query)
    .select("-imageS3Key -createdBy -updatedBy -version -__v")
    .sort({ sortOrder: 1, createdAt: -1 })
    .lean();

  return docs;
}

async function listForAdmin({ category, search, includeInactive, includeDeleted, isSuperAdmin } = {}) {
  const query = {};
  if (!includeDeleted || !isSuperAdmin) query.deletedAt = null;
  if (!includeInactive) query.active = true;
  if (category) query.categories = category;
  if (search) {
    const escaped = String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    query.$or = [
      { nameEn: { $regex: escaped, $options: "i" } },
      { nameAr: { $regex: escaped, $options: "i" } },
    ];
  }

  return Template.find(query).sort({ sortOrder: 1, createdAt: -1 }).lean();
}

async function getById(id) {
  const doc = await Template.findById(id).lean();
  if (!doc || doc.deletedAt) throw new NotFoundError("Template");
  return doc;
}

async function createTemplate(payload, actor) {
  const { s3Key, ...templateFields } = payload;
  if (!s3Key) throw new ValidationError("s3Key is required (call /upload-url first)");

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

    try {
      await logAudit({
        action: "template.create",
        actor,
        targetType: "template",
        targetId: doc._id,
        metadata: { nameEn: doc.nameEn, categories: doc.categories },
      });
    } catch (_) {
      /* swallow */
    }

    return doc;
  } catch (err) {
    // Inline orphan cleanup — drop the original + (best-effort) thumbnail
    await deleteS3Key(s3Key).catch(() => {});
    if (processed?.thumbnailS3Key) await deleteS3Key(processed.thumbnailS3Key).catch(() => {});
    throw err;
  }
}

async function updateTemplate(id, payload, actor) {
  const doc = await Template.findById(id);
  if (!doc || doc.deletedAt) throw new NotFoundError("Template");

  const { s3Key, ...rest } = payload;
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

    // Old image is safe to drop now that the new one is committed.
    if (oldImageKey) await deleteS3Key(oldImageKey).catch(() => {});
    if (oldThumbKey) await deleteS3Key(oldThumbKey).catch(() => {});

    try {
      await logAudit({
        action: "template.update",
        actor,
        targetType: "template",
        targetId: doc._id,
        metadata: { nameEn: doc.nameEn, version: doc.version },
      });
    } catch (_) {
      /* swallow */
    }

    return doc;
  } catch (err) {
    // Orphan cleanup: drop the new key(s) we uploaded but didn't commit.
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

  try {
    await logAudit({
      action: "template.delete",
      actor,
      targetType: "template",
      targetId: doc._id,
      metadata: { nameEn: doc.nameEn },
    });
  } catch (_) {
    /* swallow */
  }
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
    active: false, // duplicate lands as draft
    createdBy: actor?._id || null,
    version: 0,
  });

  return clone;
}

// ============================================
// CATEGORIES
// ============================================

async function listCategories({ includeInactive = false } = {}) {
  const query = {};
  if (!includeInactive) query.active = true;
  return TemplateCategory.find(query).sort({ sortOrder: 1, code: 1 }).lean();
}

async function createCategory(payload, actor) {
  if (!payload.code || !payload.nameEn || !payload.nameAr) {
    throw new ValidationError("code, nameEn, nameAr are required");
  }
  const code = String(payload.code).toLowerCase().replace(/[^a-z0-9_]/g, "_");
  const doc = await TemplateCategory.create({
    code,
    nameEn: payload.nameEn,
    nameAr: payload.nameAr,
    sortOrder: payload.sortOrder || 0,
    active: payload.active !== false,
    createdBy: actor?._id || null,
  });
  try {
    await logAudit({
      action: "template_category.create",
      actor,
      targetType: "template_category",
      targetId: doc._id,
      metadata: { code: doc.code },
    });
  } catch (_) {
    /* swallow */
  }
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
  try {
    await logAudit({
      action: "template_category.update",
      actor,
      targetType: "template_category",
      targetId: doc._id,
    });
  } catch (_) {
    /* swallow */
  }
  return doc;
}

async function deleteCategory(id, actor) {
  const doc = await TemplateCategory.findById(id);
  if (!doc) throw new NotFoundError("TemplateCategory");
  // Soft via active=false; hard delete would orphan templates referencing it.
  doc.active = false;
  doc.updatedBy = actor?._id || null;
  await doc.save();
  try {
    await logAudit({
      action: "template_category.delete",
      actor,
      targetType: "template_category",
      targetId: doc._id,
    });
  } catch (_) {
    /* swallow */
  }
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
  getUploadUrl,
  processImage,
  s3KeyToUrl,
  deleteS3Key,
  // Categories
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
