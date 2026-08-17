/**
 * Migration: PostEventContent — `posts[]` → `media[]` + canonical `taqnyatTemplate.templateRef`
 * ──────────────────────────────────────────────────────────────────────────
 *
 * Context:
 *   The post-event module previously stored uploaded photos and videos in a
 *   polymorphic `posts[]` array under PostEventContent, with each subdoc
 *   carrying `{ type, content: { mediaUrl, ... } }`. The new shape flattens
 *   this to a `media[]` array of `{ type: 'photo'|'video', url, ... }`
 *   subdocs (one record per uploaded file, comments + likes hang off it).
 *
 *   The new shape also adds `taqnyatTemplate.templateRef` (canonical-only,
 *   identical to `Event.taqnyatTemplate.templateRef`) so the host can pick
 *   a Taqnyat WhatsApp template for access-link dispatch — same StepFour
 *   pattern used by events.
 *
 * What this script does (per document):
 *   1. Map every `posts[]` entry to a `media[]` entry:
 *        - `type` is preserved when it's 'photo' or 'video'; 'message' and
 *          'gallery' types (which are unused in current routes) are dropped.
 *        - `content.mediaUrl` → `url`
 *        - `content.thumbnailUrl` → `thumbnailUrl`
 *        - `likes`, `comments`, `order`, `isPublished`, `createdAt`,
 *          `updatedAt`, `_id` are preserved.
 *   2. Unset the legacy `posts` field.
 *   3. Initialise `taqnyatTemplate: { templateRef: null }` if absent.
 *
 * Modes:
 *   - Dry-run (default): prints counts, makes no changes.
 *   - Apply: pass `--apply` to actually mutate documents.
 *
 * Usage:
 *   node scripts/migrate-post-event-media-and-template.js              # dry-run
 *   node scripts/migrate-post-event-media-and-template.js --apply      # do it
 *
 * Idempotent: safe to re-run. Documents with `posts` already migrated
 * (no `posts` field, `media` populated) are skipped.
 */

/* eslint-disable no-console */

const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const mongoose = require("mongoose");

const COLLECTION = "posteventcontents";
const apply = process.argv.includes("--apply");

const log = (...args) => console.log("[migrate-post-event]", ...args);

const mapPostToMedia = (post) => {
  if (!post || (post.type !== "photo" && post.type !== "video")) return null;
  const url =
    post.content?.mediaUrl
    || post.url
    || null;
  if (!url) return null;
  return {
    _id: post._id,
    type: post.type,
    url,
    thumbnailUrl: post.content?.thumbnailUrl || post.thumbnailUrl || undefined,
    mimeType: post.mimeType,
    size: post.size,
    order: post.order || 0,
    likes: post.likes || [],
    comments: post.comments || [],
    isPublished: post.isPublished !== false,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  };
};

const main = async () => {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error("MONGODB_URI (or MONGO_URI) is not set. Aborting.");
    process.exit(1);
  }

  log(`mode: ${apply ? "APPLY" : "dry-run (pass --apply to commit)"}`);
  log("connecting…");
  await mongoose.connect(uri);

  try {
    const coll = mongoose.connection.db.collection(COLLECTION);
    const total = await coll.countDocuments({});
    log(`scanning ${total} documents in '${COLLECTION}'…`);

    const cursor = coll.find({});
    let migrated = 0;
    let skipped = 0;
    let droppedItems = 0;

    while (await cursor.hasNext()) {
      const doc = await cursor.next();

      const hasPosts = Array.isArray(doc.posts);
      const hasMedia = Array.isArray(doc.media);
      const hasTemplate = doc.taqnyatTemplate
        && Object.prototype.hasOwnProperty.call(doc.taqnyatTemplate, "templateRef");

      if (!hasPosts && hasMedia && hasTemplate) {
        skipped += 1;
        continue;
      }

      const update = {};
      const unset = {};

      if (hasPosts) {
        const newMedia = doc.posts
          .map((p) => {
            const mapped = mapPostToMedia(p);
            if (!mapped) droppedItems += 1;
            return mapped;
          })
          .filter(Boolean);
        update.media = newMedia;
        unset.posts = "";
      } else if (!hasMedia) {
        update.media = [];
      }

      if (!hasTemplate) {
        update.taqnyatTemplate = { templateRef: null };
      }

      if (Object.keys(update).length === 0 && Object.keys(unset).length === 0) {
        skipped += 1;
        continue;
      }

      if (apply) {
        const op = {};
        if (Object.keys(update).length > 0) op.$set = update;
        if (Object.keys(unset).length > 0) op.$unset = unset;
        await coll.updateOne({ _id: doc._id }, op);
      }
      migrated += 1;
    }

    log(`done. ${apply ? "migrated" : "would migrate"}: ${migrated}, skipped: ${skipped}, dropped non-media items: ${droppedItems}`);
  } finally {
    await mongoose.disconnect();
  }
};

main().catch((err) => {
  console.error("[migrate-post-event] fatal:", err);
  process.exit(1);
});
