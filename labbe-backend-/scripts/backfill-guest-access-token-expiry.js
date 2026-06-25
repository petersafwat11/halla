#!/usr/bin/env node
/**
 * Backfill `expiresAt` on legacy `GuestAccessToken` rows that are missing it.
 *
 * The current schema requires `expiresAt`, so all post-creation tokens
 * already carry one. This script defends against any pre-existing rows
 * that may have slipped through schema migrations and is idempotent (a
 * second run finds zero affected).
 *
 * Usage:
 *   node scripts/backfill-guest-access-token-expiry.js          (default: --dry-run)
 *   node scripts/backfill-guest-access-token-expiry.js --apply  (writes)
 *   node scripts/backfill-guest-access-token-expiry.js --apply --days=180
 *
 * Safety: do NOT run during a live launch window.
 */

require("dotenv").config({ path: require("path").resolve(__dirname, "../config.env") });
const mongoose = require("mongoose");
const path = require("path");

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const DAYS_ARG = args.find((a) => a.startsWith("--days="));
const DAYS = DAYS_ARG ? parseInt(DAYS_ARG.split("=")[1], 10) : 365;

if (!Number.isFinite(DAYS) || DAYS <= 0) {
  console.error("Invalid --days value");
  process.exit(2);
}

async function main() {
  const dbUri = (process.env.DATABASE || "").replace(
    "<PASSWORD>",
    process.env.DATABASE_PASSWORD || ""
  );
  if (!dbUri) {
    console.error("DATABASE env var not set");
    process.exit(1);
  }

  await mongoose.connect(dbUri);

  const GuestAccessToken = require(path.join(__dirname, "..", "models", "GuestAccessTokenModel"));

  const filter = {
    $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }],
  };

  const count = await GuestAccessToken.countDocuments(filter);
  console.log(
    `[backfill] ${count} GuestAccessToken row(s) missing expiresAt. ` +
      `Will set expiresAt = createdAt + ${DAYS} days.`
  );

  // Warn the operator about TTL-driven deletion side-effects.
  // When `expiresAt` is set in the past (i.e. createdAt + DAYS < now), the
  // TTL background sweeper will delete the row within ~60 seconds. For a
  // 90-day backfill on tokens older than 90 days, those rows ARE expired
  // by definition and should be cleaned — but the operator should know
  // this is happening rather than be surprised when the collection size
  // drops post-run.
  const cutoff = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000);
  const willBeTtlSwept = await GuestAccessToken.countDocuments({
    ...filter,
    createdAt: { $lt: cutoff },
  });
  if (willBeTtlSwept > 0) {
    console.log(
      `[backfill] WARNING: ${willBeTtlSwept} of ${count} row(s) will be ` +
        `IMMEDIATELY deleted by the TTL sweep after backfill (their ` +
        `createdAt + ${DAYS} days has already passed). These tokens were ` +
        `de-facto expired anyway; this just makes the deletion explicit.`
    );
  }

  if (!APPLY) {
    console.log("[backfill] DRY RUN — no writes performed. Re-run with --apply to commit.");
    await mongoose.disconnect();
    process.exit(0);
  }

  if (count === 0) {
    console.log("[backfill] Nothing to do. Idempotent — exiting.");
    await mongoose.disconnect();
    process.exit(0);
  }

  // Bulk-write in batches of 500. Each row needs an individual
  // expiresAt (createdAt + DAYS), so we can't issue a single updateMany;
  // bulkWrite gives us O(roundtrip / 500) instead of O(roundtrip) per
  // row. At 100K rows this drops a multi-hour run to ~minutes.
  // We also throttle between batches so the backfill doesn't compete
  // with hot-path reads for IOPS.
  const BATCH_SIZE = 500;
  const THROTTLE_MS = parseInt(
    args.find((a) => a.startsWith("--throttle="))?.split("=")[1] || "200",
    10
  );

  const cursor = GuestAccessToken.find(filter).cursor();
  let touched = 0;
  let batch = [];

  const flushBatch = async () => {
    if (!batch.length) return;
    const ops = batch;
    batch = [];
    await GuestAccessToken.bulkWrite(ops, { ordered: false });
  };

  for await (const doc of cursor) {
    const baseMs = doc.createdAt ? doc.createdAt.getTime() : Date.now();
    const expiresAt = new Date(baseMs + DAYS * 24 * 60 * 60 * 1000);
    batch.push({
      updateOne: {
        filter: { _id: doc._id },
        update: { $set: { expiresAt } },
      },
    });
    if (batch.length >= BATCH_SIZE) {
      await flushBatch();
      touched += BATCH_SIZE;
      console.log(`[backfill] ${touched}/${count} processed`);
      if (THROTTLE_MS > 0) await new Promise((r) => setTimeout(r, THROTTLE_MS));
    }
  }
  if (batch.length) {
    const tail = batch.length;
    await flushBatch();
    touched += tail;
  }

  console.log(`[backfill] DONE. Touched ${touched}/${count} row(s).`);
  console.log(
    "[backfill] NOTE: run during a maintenance window. The TTL sweeper " +
      "will reclaim already-expired rows within ~60 seconds."
  );
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("[backfill] FATAL:", err);
  process.exit(1);
});
