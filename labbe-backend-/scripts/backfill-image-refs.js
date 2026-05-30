/**
 * Backfill image references on User and Service docs.
 *
 * Older code paths persisted `file.location` (the full S3 URL) instead of
 * `file.key`. On read, `signStoredImage` then signed the whole URL as if it
 * were a key, producing `https://bucket.s3.amazonaws.com/https%3A//bucket.s3.amazonaws.com/<real-key>`.
 *
 * This script normalizes every image field on Users and Services:
 *   - Full URL → our S3 bucket: extract the key, store the key.
 *   - Full URL → external host: leave as-is (passes through signStoredImage).
 *   - Bare key: leave as-is.
 *   - Local `/uploads/...` path: leave as-is.
 *
 * Usage:
 *   node scripts/backfill-image-refs.js            # apply changes
 *   node scripts/backfill-image-refs.js --dry-run  # report without writing
 */

require("dotenv").config({ path: __dirname + "/../config.env" });
const mongoose = require("mongoose");
const { connectDB, disconnectDB } = require("../src/config/database");

const User = require("../models/UserModel");
const Service = require("../models/ServiceModel");

const DRY_RUN = process.argv.includes("--dry-run");
const log = (...args) => console.log("[backfill-images]", ...args);

const BASE_URL = process.env.AWS_S3_BASE_URL;
const BUCKET = process.env.AWS_S3_BUCKET;

const extractKeyFromOurS3Url = (url) => {
  if (typeof url !== "string") return null;
  if (!url.startsWith("http://") && !url.startsWith("https://")) return null;

  try {
    const u = new URL(url);
    if (BASE_URL && url.startsWith(BASE_URL + "/")) {
      const after = url.slice(BASE_URL.length + 1);
      const qIdx = after.indexOf("?");
      const path = qIdx === -1 ? after : after.slice(0, qIdx);
      return path ? decodeURIComponent(path) : null;
    }
    if (!BUCKET) return null;
    const host = u.hostname;
    const isVirtualHost =
      host === `${BUCKET}.s3.amazonaws.com` ||
      (host.startsWith(`${BUCKET}.`) &&
        /^([a-z0-9.-]+)\.s3[.-][a-z0-9-]+\.amazonaws\.com$/.test(host));
    const isPathStyle =
      host === "s3.amazonaws.com" || /^s3[.-][a-z0-9-]+\.amazonaws\.com$/.test(host);

    const pathname = u.pathname.startsWith("/") ? u.pathname.slice(1) : u.pathname;
    if (!pathname) return null;
    if (isVirtualHost) return decodeURIComponent(pathname);
    if (isPathStyle && pathname.startsWith(`${BUCKET}/`)) {
      return decodeURIComponent(pathname.slice(BUCKET.length + 1));
    }
    return null;
  } catch {
    return null;
  }
};

const normalize = (value) => {
  if (!value || typeof value !== "string") return { changed: false, value };
  const key = extractKeyFromOurS3Url(value);
  if (!key) return { changed: false, value };
  return { changed: true, value: key };
};

const normalizeArray = (arr) => {
  if (!Array.isArray(arr)) return { changed: false, value: arr };
  let changed = false;
  const next = arr.map((v) => {
    const r = normalize(v);
    if (r.changed) changed = true;
    return r.value;
  });
  return { changed, value: next };
};

const stats = {
  usersScanned: 0,
  usersUpdated: 0,
  servicesScanned: 0,
  servicesUpdated: 0,
  fieldsRewritten: 0,
};

const backfillUsers = async () => {
  const cursor = User.find({}).cursor();
  for await (const user of cursor) {
    stats.usersScanned += 1;
    let touched = false;

    {
      const r = normalize(user.avatar);
      if (r.changed) {
        user.avatar = r.value;
        stats.fieldsRewritten += 1;
        touched = true;
      }
    }

    const vd = user.profile?.vendorData;
    if (vd) {
      const singles = [
        "businessLogo",
        "nationalIdImage",
        "commercialRecordImage",
        "profileFile",
        "cv",
      ];
      for (const field of singles) {
        const r = normalize(vd[field]);
        if (r.changed) {
          vd[field] = r.value;
          stats.fieldsRewritten += 1;
          touched = true;
        }
      }
      for (const field of ["portfolioImages", "pricePackages"]) {
        const r = normalizeArray(vd[field]);
        if (r.changed) {
          vd[field] = r.value;
          stats.fieldsRewritten += 1;
          touched = true;
        }
      }
    }

    const docs = user.profile?.documents;
    if (docs) {
      for (const field of ["nationalIdImage", "commercialRecordImage"]) {
        const r = normalize(docs[field]);
        if (r.changed) {
          docs[field] = r.value;
          stats.fieldsRewritten += 1;
          touched = true;
        }
      }
    }

    if (touched) {
      stats.usersUpdated += 1;
      user.markModified("profile");
      if (!DRY_RUN) await user.save({ validateBeforeSave: false });
    }
  }
};

const backfillServices = async () => {
  const cursor = Service.find({}).cursor();
  for await (const service of cursor) {
    stats.servicesScanned += 1;
    const r = normalize(service.image);
    if (r.changed) {
      service.image = r.value;
      stats.fieldsRewritten += 1;
      stats.servicesUpdated += 1;
      if (!DRY_RUN) await service.save({ validateBeforeSave: false });
    }
  }
};

(async () => {
  try {
    if (!BASE_URL && !BUCKET) {
      log("AWS_S3_BASE_URL / AWS_S3_BUCKET not set — nothing to do.");
      process.exit(0);
    }
    log(`Mode: ${DRY_RUN ? "DRY RUN" : "WRITE"}`);
    log(`Bucket: ${BUCKET}, BaseURL: ${BASE_URL}`);
    await connectDB();
    await backfillUsers();
    await backfillServices();
    log("Stats:", JSON.stringify(stats, null, 2));
  } catch (e) {
    console.error("[backfill-images] ERROR", e);
    process.exitCode = 1;
  } finally {
    await disconnectDB().catch(() => {});
    await mongoose.disconnect().catch(() => {});
  }
})();
