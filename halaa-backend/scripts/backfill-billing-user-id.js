/**
 * Backfill User.billingUserId (SHIP §9.1).
 *
 * New users get a billingUserId by schema default; existing users need one
 * before they can use native IAP (it's the RevenueCat App User ID). Idempotent:
 * only fills users that lack it. Safe to re-run.
 *
 * Usage: node scripts/backfill-billing-user-id.js
 */

const mongoose = require("mongoose");
const crypto = require("crypto");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../config.env") });

const User = require("../models/UserModel");

async function run() {
  let DB = process.env.DATABASE;
  if (!DB) {
    console.error("❌ DATABASE env var is not set (config.env).");
    process.exit(1);
  }
  if (process.env.DATABASE_PASSWORD && DB.includes("<PASSWORD>")) {
    DB = DB.replace("<PASSWORD>", process.env.DATABASE_PASSWORD);
  }
  const opts = {};
  if (process.env.DATABASE_CERT_PATH) {
    opts.tls = true;
    opts.tlsCertificateKeyFile = process.env.DATABASE_CERT_PATH;
  }

  await mongoose.connect(DB, opts);
  console.log("✅ Connected");

  const cursor = User.find({
    $or: [{ billingUserId: { $exists: false } }, { billingUserId: null }],
  })
    .select("_id")
    .cursor();

  let n = 0;
  for (let doc = await cursor.next(); doc; doc = await cursor.next()) {
    await User.updateOne(
      { _id: doc._id, $or: [{ billingUserId: { $exists: false } }, { billingUserId: null }] },
      { $set: { billingUserId: crypto.randomUUID() } }
    );
    n += 1;
    if (n % 200 === 0) console.log(`  …${n}`);
  }

  console.log(`✅ Backfilled billingUserId for ${n} user(s).`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Backfill failed:", err);
  process.exit(1);
});
