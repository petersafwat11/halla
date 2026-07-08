/**
 * Migration: plans.availableFor  'whitelabel' → 'business'
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Context (business-account plan, phase B1):
 *   The business-plan catalog historically rode on the `availableFor:'whitelabel'`
 *   plan-availability tag (a leftover from the removed whitelabel product). The
 *   business-account feature renames that tag to the self-describing
 *   `'business'`. The PlanModel enum, the seed defaults, the plans service
 *   query, swagger, and the shared zod enum were all updated in lockstep.
 *
 *   Existing Plan documents in Mongo still carry `availableFor:'whitelabel'`.
 *   Mongoose only validates on write, so reads keep working, but the
 *   `getBusinessPlans` query now filters on `'business'` and would return
 *   nothing until the stored docs are migrated. This script performs the swap.
 *
 * Modes:
 *   - Dry-run (default): prints what it would do, makes no changes.
 *   - Apply: pass `--apply` to mutate.
 *
 * Usage:
 *   node scripts/migrate-plan-availability-whitelabel-to-business.js          # dry-run
 *   node scripts/migrate-plan-availability-whitelabel-to-business.js --apply  # do it
 *
 * Idempotent: re-running after a successful apply is a no-op (0 matched).
 */

/* eslint-disable no-console */

require("dotenv").config({ path: __dirname + "/../config.env" });
const path = require("path");
const mongoose = require("mongoose");

const COLLECTION = "plans";
const apply = process.argv.includes("--apply");
const log = (...args) =>
  console.log("[migrate-plan-availability-whitelabel-to-business]", ...args);

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

  const matchCount = await coll.countDocuments({ availableFor: "whitelabel" });
  log(`Found ${matchCount} plan(s) with availableFor:'whitelabel'.`);

  if (matchCount === 0) {
    log("Nothing to migrate.");
    await mongoose.disconnect();
    return;
  }

  if (!apply) {
    const sample = await coll
      .find({ availableFor: "whitelabel" })
      .project({ code: 1, planType: 1 })
      .limit(20)
      .toArray();
    log("Would update (sample):", sample.map((p) => p.code));
    log("Dry-run complete. Pass --apply to commit.");
    await mongoose.disconnect();
    return;
  }

  const res = await coll.updateMany(
    { availableFor: "whitelabel" },
    { $set: { availableFor: "business" } }
  );
  log(`Updated ${res.modifiedCount} plan(s) → availableFor:'business'.`);

  await mongoose.disconnect();
  log("Done.");
})().catch((err) => {
  console.error("[migrate-plan-availability-whitelabel-to-business] FAILED", err);
  process.exit(1);
});
