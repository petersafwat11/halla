/**
 * Migration: backfill users.accountType = 'personal' for existing hosts
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Context (business-account plan, phase B2A):
 *   `role:'host'` users now carry an `accountType` discriminator
 *   ('personal' | 'business'). Existing host documents predate the field and
 *   have it null/missing. The account-scope helpers FAIL CLOSED — a null
 *   accountType is treated as neither personal nor business, so such hosts
 *   would disappear from both the Hosts and Businesses admin pages.
 *
 *   Every pre-existing host is, by definition, a PERSONAL host (business
 *   accounts are admin-created and always set the field). This script backfills
 *   them to 'personal'. Business accounts are created with accountType already
 *   set and are never touched (filter excludes any non-null value).
 *
 * Modes:
 *   - Dry-run (default): prints the count, makes no changes.
 *   - Apply: pass `--apply` to mutate.
 *
 * Usage:
 *   node scripts/migrate-host-account-type-backfill.js          # dry-run
 *   node scripts/migrate-host-account-type-backfill.js --apply  # do it
 *
 * Idempotent: re-running after apply matches 0 documents.
 */

/* eslint-disable no-console */

require("dotenv").config({ path: __dirname + "/../config.env" });
const path = require("path");
const mongoose = require("mongoose");

const COLLECTION = "users";
const apply = process.argv.includes("--apply");
const log = (...args) =>
  console.log("[migrate-host-account-type-backfill]", ...args);

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

  const filter = {
    role: "host",
    $or: [{ accountType: null }, { accountType: { $exists: false } }],
  };

  const matchCount = await coll.countDocuments(filter);
  log(`Found ${matchCount} host(s) with missing/null accountType.`);

  if (matchCount === 0) {
    log("Nothing to backfill.");
    await mongoose.disconnect();
    return;
  }

  if (!apply) {
    log("Dry-run complete. Pass --apply to set them to 'personal'.");
    await mongoose.disconnect();
    return;
  }

  const res = await coll.updateMany(filter, {
    $set: { accountType: "personal" },
  });
  log(`Backfilled ${res.modifiedCount} host(s) → accountType:'personal'.`);

  await mongoose.disconnect();
  log("Done.");
})().catch((err) => {
  console.error("[migrate-host-account-type-backfill] FAILED", err);
  process.exit(1);
});
