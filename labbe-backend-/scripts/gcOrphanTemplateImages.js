/**
 * gcOrphanTemplateImages
 *
 * Walk every S3 key under `templates/*` whose LastModified is older than
 * 24 h, then delete the ones that have no matching `imageS3Key` or
 * `thumbnailS3Key` row in the Template collection.
 *
 * Run manually:
 *   node scripts/gcOrphanTemplateImages.js [--dry-run]
 */

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const Template = require("../models/TemplateModel");

const DRY_RUN = process.argv.includes("--dry-run");
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

async function main() {
  if (!process.env.AWS_S3_BUCKET || !process.env.AWS_REGION || !process.env.MONGO_URI) {
    console.error("[gc] Required env missing (AWS_S3_BUCKET, AWS_REGION, MONGO_URI).");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);

  const s3 = new S3Client({ region: process.env.AWS_REGION });
  const cutoff = new Date(Date.now() - MAX_AGE_MS);
  const listed = [];
  let continuationToken;

  do {
    const res = await s3.send(
      new ListObjectsV2Command({
        Bucket: process.env.AWS_S3_BUCKET,
        Prefix: "templates/",
        ContinuationToken: continuationToken,
      })
    );
    for (const obj of res.Contents || []) {
      if (obj.LastModified < cutoff) listed.push(obj.Key);
    }
    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (continuationToken);

  const knownKeys = new Set(
    (await Template.find({}, { imageS3Key: 1, thumbnailS3Key: 1 }).lean())
      .flatMap((t) => [t.imageS3Key, t.thumbnailS3Key].filter(Boolean))
  );

  const orphans = listed.filter((k) => !knownKeys.has(k));
  console.log(`[gc] Found ${orphans.length} orphan(s) of ${listed.length} listed keys`);

  for (const key of orphans) {
    if (DRY_RUN) {
      console.log(`[gc] (dry) would delete: ${key}`);
      continue;
    }
    await s3.send(
      new DeleteObjectCommand({ Bucket: process.env.AWS_S3_BUCKET, Key: key })
    );
    console.log(`[gc] deleted orphan: ${key}`);
  }

  await mongoose.disconnect();
  console.log("[gc] done");
}

main().catch((err) => {
  console.error("[gc] FAILED:", err);
  process.exit(1);
});
