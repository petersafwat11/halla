/**
 * Idempotently restore active visual-template backgrounds from the tracked
 * canonical masters into persistent VPS storage.
 *
 * This intentionally does not attempt to delete legacy S3 objects. It only
 * updates a template row after both its local original and generated thumbnail
 * have been written successfully.
 */

const fs = require("fs");
const path = require("path");

const { connectDB, disconnectDB } = require("../src/config/database");
const Template = require("../models/TemplateModel");
const templatesService = require("../src/modules/templates/templates.service");
const { TEMPLATES } = require("./precisionTemplateSpecs");
const {
  isLocalStorage,
  resolveLocalPath,
} = require("../src/shared/utils/storageDriver");

const SOURCE_ROOT = path.resolve(
  process.env.TEMPLATE_SOURCE_PATH || path.join(__dirname, "..", "template-cards")
);

const contentTypeFor = (filename) => {
  const extension = path.extname(filename).toLowerCase();
  if (extension === ".png") return "image/png";
  if (extension === ".webp") return "image/webp";
  return "image/jpeg";
};

const localFileExists = (ref) => {
  const target = resolveLocalPath(ref);
  return !!target && fs.existsSync(target);
};

async function main() {
  if (!isLocalStorage()) {
    throw new Error(
      "restoreTemplatesToLocalStorage requires FILE_STORAGE_DRIVER=local"
    );
  }
  if (!fs.existsSync(SOURCE_ROOT)) {
    throw new Error(`Template source directory not found: ${SOURCE_ROOT}`);
  }

  await connectDB();
  const sourceByName = new Map(TEMPLATES.map((item) => [item.nameEn, item.file]));
  const active = await Template.find({ active: true, deletedAt: null }).sort({
    sortOrder: 1,
  });

  const summary = { active: active.length, restored: 0, alreadyLocal: 0, missing: [] };

  for (const template of active) {
    const sourceFilename = sourceByName.get(template.nameEn);
    if (!sourceFilename) {
      summary.missing.push(`${template.nameEn}: no tracked source mapping`);
      continue;
    }

    const sourcePath = path.resolve(SOURCE_ROOT, sourceFilename);
    const sourceRelative = path.relative(SOURCE_ROOT, sourcePath);
    if (
      sourceRelative.startsWith("..") ||
      path.isAbsolute(sourceRelative) ||
      !fs.existsSync(sourcePath)
    ) {
      summary.missing.push(`${template.nameEn}: source file missing`);
      continue;
    }

    if (
      String(template.imageS3Key || "").startsWith("/uploads/") &&
      String(template.thumbnailS3Key || "").startsWith("/uploads/") &&
      localFileExists(template.imageS3Key) &&
      localFileExists(template.thumbnailS3Key)
    ) {
      summary.alreadyLocal += 1;
      continue;
    }

    const { s3Key: originalRef } = await templatesService.handleImageUpload({
      fileBuffer: fs.readFileSync(sourcePath),
      filename: sourceFilename,
      contentType: contentTypeFor(sourceFilename),
      templateId: String(template._id),
    });
    const processed = await templatesService.processImage(originalRef);
    if (!processed.thumbnailS3Key) {
      throw new Error(`Thumbnail generation failed for ${template.nameEn}`);
    }

    await Template.updateOne(
      { _id: template._id },
      {
        $set: {
          imageS3Key: originalRef,
          imageUrl: originalRef,
          thumbnailS3Key: processed.thumbnailS3Key,
          thumbnailUrl: processed.thumbnailS3Key,
          naturalWidth: processed.naturalWidth,
          naturalHeight: processed.naturalHeight,
        },
        $inc: { version: 1 },
      }
    );
    summary.restored += 1;
  }

  if (summary.missing.length) {
    throw new Error(
      `Template restoration incomplete: ${summary.missing.join("; ")}`
    );
  }

  console.log(JSON.stringify(summary));
}

main()
  .then(() => disconnectDB())
  .catch(async (err) => {
    console.error(`[template-local-restore] ${err.message}`);
    try {
      await disconnectDB();
    } catch (_) {
      // Preserve the original failure.
    }
    process.exit(1);
  });

