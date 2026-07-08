/**
 * Migration: idempotency_keys index — global-unique → compound-unique
 * ────────────────────────────────────────────────────────────────────
 *
 * Context (H-5 in PRODUCTION_READINESS_REVIEW.md):
 *   The `IdempotencyKey` collection originally had a global-unique index
 *   on `{ key: 1 }`. Two different users supplying the same client-chosen
 *   `Idempotency-Key` value would collide — User B could replay User A's
 *   cached response (data leak) or get a 409 they shouldn't see.
 *
 *   The fix is to partition the keyspace by `{ userId, scope, key }`. The
 *   model now declares this compound unique index, but live deployments
 *   still carry the legacy `key_1` index.
 *
 * What this script does:
 *   1. Connect to Mongo (`MONGODB_URI`).
 *   2. List indexes on `idempotency_keys`.
 *   3. Drop `key_1` (the legacy global-unique index) if present.
 *   4. Create `userId_1_scope_1_key_1` unique compound index if absent.
 *   5. Idempotent: safe to re-run.
 *
 * Modes:
 *   - Dry-run (default): prints what it would do, makes no changes.
 *   - Apply: pass `--apply` to actually mutate the indexes.
 *
 * Usage:
 *   node scripts/migrate-idempotency-key-index.js              # dry-run
 *   node scripts/migrate-idempotency-key-index.js --apply      # do it
 *
 * Operator notes:
 *   - Run during a low-traffic window. Index drop/create on Mongo is fast
 *     for `idempotency_keys` (TTL-pruned, never large) but takes a brief
 *     write lock on the collection.
 *   - The collection keeps working through the swap — the new index is
 *     created before the old one is dropped only if both are present at
 *     once is acceptable; this script drops first then creates because
 *     the compound index supersedes the global one and we want the new
 *     uniqueness semantics in force immediately.
 *   - If duplicates exist that would violate the new compound index, the
 *     `createIndex` call fails. The script reports the duplicates so the
 *     operator can resolve them (typically: just delete — entries are
 *     ephemeral and TTL-pruned in <24h).
 */

/* eslint-disable no-console */

const path = require("path");
const dotenv = require("dotenv");

// Load env from the backend root regardless of cwd.
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const mongoose = require("mongoose");

const COLLECTION = "idempotencykeys"; // mongoose default-pluralized collection name
const LEGACY_INDEX_NAME = "key_1";
const NEW_INDEX_KEYS = { userId: 1, scope: 1, key: 1 };
const NEW_INDEX_NAME = "userId_1_scope_1_key_1";

const apply = process.argv.includes("--apply");

const log = (...args) => console.log("[migrate-idempotency-index]", ...args);

const main = async () => {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error(
      "MONGODB_URI (or MONGO_URI) is not set in the environment. Aborting."
    );
    process.exit(1);
  }

  log(`mode: ${apply ? "APPLY" : "dry-run (pass --apply to commit)"}`);
  log("connecting…");
  await mongoose.connect(uri);

  try {
    const db = mongoose.connection.db;
    const collections = await db
      .listCollections({ name: COLLECTION })
      .toArray();
    if (collections.length === 0) {
      log(
        `collection '${COLLECTION}' does not exist yet — nothing to migrate. ` +
          "It will be created with the correct compound index by the model."
      );
      return;
    }

    const coll = db.collection(COLLECTION);
    const indexes = await coll.indexes();
    log("current indexes:");
    indexes.forEach((idx) => log("  -", idx.name, JSON.stringify(idx.key)));

    const hasLegacy = indexes.some(
      (idx) =>
        idx.name === LEGACY_INDEX_NAME ||
        (Object.keys(idx.key).length === 1 && idx.key.key === 1 && idx.unique)
    );
    const hasNew = indexes.some((idx) => idx.name === NEW_INDEX_NAME);

    // ─── Step 1 — drop legacy ────────────────────────────────────────
    if (hasLegacy) {
      const legacyIdx = indexes.find(
        (idx) =>
          idx.name === LEGACY_INDEX_NAME ||
          (Object.keys(idx.key).length === 1 && idx.key.key === 1 && idx.unique)
      );
      log(
        `legacy global-unique index found: '${legacyIdx.name}' — ${
          apply ? "dropping…" : "would drop."
        }`
      );
      if (apply) {
        await coll.dropIndex(legacyIdx.name);
        log(`  ✓ dropped '${legacyIdx.name}'`);
      }
    } else {
      log("no legacy global-unique 'key_1' index present — skipping drop.");
    }

    // ─── Step 2 — create compound unique ─────────────────────────────
    if (hasNew) {
      log(`compound index '${NEW_INDEX_NAME}' already exists — skipping create.`);
    } else {
      log(
        `compound unique index '${NEW_INDEX_NAME}' missing — ${
          apply ? "creating…" : "would create."
        }`
      );
      if (apply) {
        try {
          await coll.createIndex(NEW_INDEX_KEYS, {
            unique: true,
            name: NEW_INDEX_NAME,
          });
          log(`  ✓ created '${NEW_INDEX_NAME}'`);
        } catch (err) {
          if (err.code === 11000) {
            console.error(
              "Cannot create compound unique index — duplicate documents exist. " +
                "Inspect with: db.idempotencykeys.aggregate([" +
                "{ $group: { _id: { u:'$userId', s:'$scope', k:'$key' }, n: { $sum: 1 } } }," +
                "{ $match: { n: { $gt: 1 } } }])"
            );
          }
          throw err;
        }
      }
    }

    // ─── Step 3 — verify ─────────────────────────────────────────────
    if (apply) {
      const after = await coll.indexes();
      log("post-migration indexes:");
      after.forEach((idx) =>
        log("  -", idx.name, JSON.stringify(idx.key), idx.unique ? "(unique)" : "")
      );
    }

    log(apply ? "migration complete." : "dry-run complete. Re-run with --apply to commit.");
  } finally {
    await mongoose.disconnect();
  }
};

main().catch((err) => {
  console.error("[migrate-idempotency-index] FAILED:", err);
  process.exit(1);
});
