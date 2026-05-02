#!/usr/bin/env node
/**
 * Phase 3e.4 / FLOW-21-F03 / decision D8 — backfill `expiresAt` on legacy
 * `GuestAccessToken` rows that are missing it.
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
 * Safety: do NOT run during a live launch window. The Phase 3de close-out
 * prompt is the expected runner.
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

  // Loop in chunks to keep the working set small. We can't do this in a
  // single update because each row needs `createdAt + DAYS` (different
  // per-row).
  const cursor = GuestAccessToken.find(filter).cursor();
  let touched = 0;
  for await (const doc of cursor) {
    const baseMs = doc.createdAt ? doc.createdAt.getTime() : Date.now();
    const expiresAt = new Date(baseMs + DAYS * 24 * 60 * 60 * 1000);
    await GuestAccessToken.updateOne({ _id: doc._id }, { $set: { expiresAt } });
    touched++;
    if (touched % 100 === 0) console.log(`[backfill] ${touched}/${count} processed`);
  }

  console.log(`[backfill] DONE. Touched ${touched}/${count} row(s).`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("[backfill] FATAL:", err);
  process.exit(1);
});
