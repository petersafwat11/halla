/**
 * Migration: payments.moyasarPaymentId index — sparse → partialFilterExpression
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Context:
 *   The schema declares `moyasarPaymentId` with `default: null` and a
 *   `{ unique: true, sparse: true }` index. Sparse only excludes
 *   documents where the field is *missing*; an explicit `null` is a
 *   value and IS indexed. So two rows with `moyasarPaymentId: null`
 *   (e.g. concurrent first-time checkouts that haven't yet called
 *   Moyasar, or a failed charge that left the row at null followed by
 *   any retry) collide with E11000.
 *
 *   The model has been updated to use:
 *       partialFilterExpression: { moyasarPaymentId: { $type: "string" } }
 *   …which excludes nulls (and any non-string value) from the index
 *   while still enforcing uniqueness across real provider IDs.
 *
 *   Mongoose's autoIndex does NOT rewrite an existing index whose
 *   options changed — it only creates missing indexes by name. This
 *   script performs the swap explicitly.
 *
 * What this script does:
 *   1. Connect to Mongo using the same env/cert as the app.
 *   2. List indexes on `payments`.
 *   3. Inspect the existing `moyasarPaymentId_1` index. If it already
 *      has the new `partialFilterExpression`, exit (idempotent).
 *   4. Otherwise drop it and create the new partial index.
 *
 * Modes:
 *   - Dry-run (default): prints what it would do, makes no changes.
 *   - Apply: pass `--apply` to mutate.
 *
 * Usage:
 *   node scripts/migrate-payment-moyasar-id-index.js          # dry-run
 *   node scripts/migrate-payment-moyasar-id-index.js --apply  # do it
 *
 * Operator notes:
 *   - The collection keeps working through the swap, but the brief
 *     window between drop and recreate is unprotected: two concurrent
 *     inserts with the same string ID could both succeed. Run during a
 *     low-traffic window. The `payments` collection is small enough
 *     that index creation is fast.
 *   - If duplicate string IDs already exist (they shouldn't — the old
 *     index forbade them), `createIndex` fails. The script reports
 *     them so the operator can resolve manually.
 */

/* eslint-disable no-console */

require("dotenv").config({ path: __dirname + "/../config.env" });
const path = require("path");
const mongoose = require("mongoose");

const COLLECTION = "payments";
const INDEX_NAME = "moyasarPaymentId_1";
const NEW_INDEX_KEYS = { moyasarPaymentId: 1 };
const NEW_INDEX_OPTIONS = {
  name: INDEX_NAME,
  unique: true,
  partialFilterExpression: { moyasarPaymentId: { $type: "string" } },
};

const apply = process.argv.includes("--apply");
const log = (...args) => console.log("[migrate-payment-moyasar-id-index]", ...args);

const partialFiltersMatch = (existing, expected) => {
  if (!existing) return false;
  try {
    return JSON.stringify(existing) === JSON.stringify(expected);
  } catch {
    return false;
  }
};

(async () => {
  log(`mode: ${apply ? "APPLY" : "dry-run (pass --apply to commit)"}`);

  const certPath = process.env.DATABASE_CERT_PATH
    ? path.resolve(__dirname, "..", process.env.DATABASE_CERT_PATH)
    : null;
  const opts = {};
  if (certPath) {
    opts.tls = true;
    opts.tlsCertificateKeyFile = certPath;
  }

  await mongoose.connect(process.env.DATABASE, opts);
  const db = mongoose.connection.db;
  const coll = db.collection(COLLECTION);

  const indexes = await coll.indexes();
  const existing = indexes.find((idx) => idx.name === INDEX_NAME);

  if (!existing) {
    log(`No existing ${INDEX_NAME}. Will create new partial index.`);
  } else {
    log(`Existing index:`, {
      name: existing.name,
      key: existing.key,
      unique: existing.unique,
      sparse: existing.sparse,
      partialFilterExpression: existing.partialFilterExpression,
    });
    if (
      existing.unique &&
      partialFiltersMatch(
        existing.partialFilterExpression,
        NEW_INDEX_OPTIONS.partialFilterExpression
      )
    ) {
      log("Index already has the desired partialFilterExpression. Nothing to do.");
      await mongoose.disconnect();
      return;
    }
  }

  // Sanity check: any duplicate non-null string IDs that would block
  // the new index from being created uniquely.
  const dups = await coll
    .aggregate([
      { $match: { moyasarPaymentId: { $type: "string" } } },
      { $group: { _id: "$moyasarPaymentId", count: { $sum: 1 }, ids: { $push: "$_id" } } },
      { $match: { count: { $gt: 1 } } },
    ])
    .toArray();

  if (dups.length) {
    log(`⚠️ Found ${dups.length} duplicate string moyasarPaymentId value(s). New index would fail.`);
    dups.forEach((d) => log("  -", d));
    log("Resolve manually before re-running.");
    await mongoose.disconnect();
    process.exit(1);
  }

  if (!apply) {
    log("Would: drop index", INDEX_NAME);
    log("Would: create index", NEW_INDEX_KEYS, NEW_INDEX_OPTIONS);
    log("(dry run — pass --apply to commit)");
    await mongoose.disconnect();
    return;
  }

  if (existing) {
    log(`Dropping ${INDEX_NAME}…`);
    await coll.dropIndex(INDEX_NAME);
    log("Dropped.");
  }

  log(`Creating new partial index…`);
  await coll.createIndex(NEW_INDEX_KEYS, NEW_INDEX_OPTIONS);
  log("Created.");

  const after = (await coll.indexes()).find((idx) => idx.name === INDEX_NAME);
  log("Result:", {
    name: after?.name,
    key: after?.key,
    unique: after?.unique,
    partialFilterExpression: after?.partialFilterExpression,
  });

  await mongoose.disconnect();
})().catch(async (e) => {
  console.error(e);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
