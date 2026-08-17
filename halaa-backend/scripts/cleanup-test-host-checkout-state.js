/**
 * One-off cleanup for test.host@labbe.sa after the failed-then-succeeded
 * checkout incident (2026-05-10):
 *
 *   1. Remove orphan Payment rows in `pending` status with
 *      moyasarPaymentId === null for this user. These collide with the
 *      unique index on subsequent attempts.
 *   2. Remove the cached `payment.charge` IdempotencyKey row for this
 *      user's checkout, so the next charge() actually hits Moyasar
 *      again instead of replaying the previous transactionId.
 *   3. Backfill `metadata.checkoutKey` on existing successful Payments
 *      created before checkout-level idempotency was added. Without
 *      this the new replay-short-circuit can't find them, the next
 *      charge() reaches Moyasar with a deterministic given_id, Moyasar
 *      returns the original payment, and we 409 on the unique index.
 *
 * NOT touched (intentional — they reflect a real successful charge):
 *   - Payment 6a00b614371286f147ae16d3 (status: paid, real Moyasar id)
 *   - Subscription 6a00b620371286f147ae170f
 *   If you want a fully clean slate, refund the Moyasar payment from
 *   their dashboard and delete those two rows by hand.
 *
 * Pass --dry-run to preview without writing.
 *
 * Usage: node scripts/cleanup-test-host-checkout-state.js [--dry-run]
 */
require("dotenv").config({ path: __dirname + "/../config.env" });
const path = require("path");
const mongoose = require("mongoose");
const Payment = require("../models/PaymentModel");
const IdempotencyKey = require("../models/IdempotencyKeyModel");
const User = require("../models/UserModel");

const EMAIL = "test.host@labbe.sa";
const DRY = process.argv.includes("--dry-run");
const tag = DRY ? "[dry-run]" : "[cleanup]";

(async () => {
  const certPath = process.env.DATABASE_CERT_PATH
    ? path.resolve(__dirname, "..", process.env.DATABASE_CERT_PATH)
    : null;
  const opts = {};
  if (certPath) {
    opts.tls = true;
    opts.tlsCertificateKeyFile = certPath;
  }
  await mongoose.connect(process.env.DATABASE, opts);

  const user = await User.findOne({ email: EMAIL }).select("_id email").lean();
  if (!user) {
    console.error(`User ${EMAIL} not found`);
    await mongoose.disconnect();
    process.exit(1);
  }

  // ── Step 1: orphan PENDING payments with no provider ID ─────────────
  const orphanFilter = {
    userId: user._id,
    status: Payment.PAYMENT_STATUS.PENDING,
    $or: [{ moyasarPaymentId: null }, { moyasarPaymentId: { $exists: false } }],
  };
  const orphans = await Payment.find(orphanFilter)
    .select("_id amount description createdAt")
    .lean();
  console.log(`${tag} Found ${orphans.length} orphan PENDING payment(s):`);
  orphans.forEach((p) =>
    console.log("  -", {
      _id: p._id,
      amount: p.amount,
      description: p.description,
      createdAt: p.createdAt,
    })
  );
  if (!DRY && orphans.length) {
    const res = await Payment.deleteMany(orphanFilter);
    console.log(`${tag} Deleted ${res.deletedCount} payment row(s).`);
  }

  // ── Step 2: cached payment.charge IdempotencyKey row(s) ─────────────
  // Key shape: `payment:checkout:<userId>:<planCode>:<total>:<addonCount>`
  // We match by userId + scope + key prefix to catch all checkout
  // variants (different plans / totals / addons) for this user.
  const idemFilter = {
    userId: user._id,
    scope: "payment.charge",
    key: { $regex: `^payment:checkout:${user._id}:` },
  };
  const idemRows = await IdempotencyKey.find(idemFilter)
    .select("_id key status createdAt completedAt")
    .lean();
  console.log(
    `\n${tag} Found ${idemRows.length} cached payment.charge IdempotencyKey row(s):`
  );
  idemRows.forEach((r) =>
    console.log("  -", {
      _id: r._id,
      key: r.key,
      status: r.status,
      createdAt: r.createdAt,
    })
  );
  if (!DRY && idemRows.length) {
    const res = await IdempotencyKey.deleteMany(idemFilter);
    console.log(`${tag} Deleted ${res.deletedCount} idempotency row(s).`);
  }

  // ── Step 3: backfill metadata.checkoutKey on legacy paid rows ───────
  // The new checkout idempotency lookup keys on metadata.checkoutKey;
  // Payments created before that field was introduced won't be matched
  // and would 409 on retry. Reconstruct the key from existing fields.
  const legacyPaid = await Payment.find({
    userId: user._id,
    status: {
      $in: [
        Payment.PAYMENT_STATUS.PENDING_3DS,
        Payment.PAYMENT_STATUS.AUTHORIZED,
        Payment.PAYMENT_STATUS.PAID,
        Payment.PAYMENT_STATUS.CAPTURED,
      ],
    },
    "metadata.purpose": "checkout",
    "metadata.checkoutKey": { $exists: false },
    "metadata.planCode": { $exists: true },
  });

  console.log(
    `\n${tag} Found ${legacyPaid.length} successful payment(s) missing metadata.checkoutKey:`
  );
  for (const p of legacyPaid) {
    const planCode = p.metadata?.planCode;
    const addonCount = p.metadata?.addonCount ?? 0;
    const total = p.amount;
    const key = `checkout:${user._id}:${planCode}:${total}:${addonCount}`;
    console.log("  -", { _id: p._id, key });
    if (!DRY) {
      p.metadata = { ...(p.metadata || {}), checkoutKey: key };
      p.markModified("metadata");
      await p.save();
    }
  }
  if (!DRY && legacyPaid.length) {
    console.log(`${tag} Backfilled ${legacyPaid.length} payment row(s).`);
  }

  if (DRY) console.log("\n(dry run — pass without --dry-run to apply)");
  await mongoose.disconnect();
})().catch(async (e) => {
  console.error(e);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
