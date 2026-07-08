/**
 * Find Payment rows with moyasarPaymentId == null. These collide with
 * the unique index. Run with --delete to remove them (only safe if they
 * are not in `paid`/`captured`/`refunded`/`partially_refunded`).
 *
 * Usage:
 *   node scripts/check-null-moyasar-payments.js
 *   node scripts/check-null-moyasar-payments.js --delete
 */
require("dotenv").config({ path: __dirname + "/../config.env" });
const path = require("path");
const mongoose = require("mongoose");
const Payment = require("../models/PaymentModel");

const DELETE = process.argv.includes("--delete");
const TERMINAL_GOOD = new Set(["paid", "captured", "refunded", "partially_refunded", "authorized"]);

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

  const rows = await Payment.find({
    $or: [{ moyasarPaymentId: null }, { moyasarPaymentId: { $exists: false } }],
  }).lean();

  console.log(`Found ${rows.length} payment rows with null moyasarPaymentId\n`);
  rows.forEach((r, i) => {
    console.log(`[${i}]`, {
      _id: r._id,
      userId: r.userId,
      amount: r.amount,
      status: r.status,
      providerStatus: r.providerStatus,
      description: r.description,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    });
  });

  if (DELETE) {
    const deletable = rows.filter((r) => !TERMINAL_GOOD.has(r.status));
    if (deletable.length === 0) {
      console.log("\nNo deletable rows (all are in a successful state — keep them).");
    } else {
      console.log(`\nDeleting ${deletable.length} non-successful null-id rows...`);
      const ids = deletable.map((r) => r._id);
      const res = await Payment.deleteMany({ _id: { $in: ids } });
      console.log("deleteMany result:", res);
    }
  } else {
    console.log("\n(dry run — pass --delete to remove non-successful rows)");
  }

  await mongoose.disconnect();
})().catch(async (e) => {
  console.error(e);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
