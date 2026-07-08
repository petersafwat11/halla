/**
 * Ad-hoc query: dump all payment + subscription records for test.host@labbe.sa
 * Usage: node scripts/check-test-host-payments.js
 */
require("dotenv").config({ path: __dirname + "/../config.env" });
const path = require("path");
const mongoose = require("mongoose");

const User = require("../models/UserModel");
const Payment = require("../models/PaymentModel");
const Subscription = require("../models/SubscriptionModel");
const Addon = require("../models/AddonModel");

const EMAIL = "test.host@labbe.sa";

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
  console.log("Connected.");

  const user = await User.findOne({ email: EMAIL }).lean();
  if (!user) {
    console.log(`No user found with email ${EMAIL}`);
    await mongoose.disconnect();
    return;
  }
  console.log("─── USER ───");
  console.log({
    _id: user._id,
    email: user.email,
    role: user.role,
    status: user.status,
    activeSubscriptionId: user.activeSubscriptionId,
    createdAt: user.createdAt,
  });

  console.log("\n─── SUBSCRIPTIONS ───");
  const subs = await Subscription.find({ userId: user._id })
    .sort({ createdAt: -1 })
    .lean();
  console.log(`count: ${subs.length}`);
  subs.forEach((s, i) => {
    console.log(`\n[Sub ${i}]`, {
      _id: s._id,
      planId: s.planId,
      status: s.status,
      startDate: s.startDate,
      endDate: s.endDate,
      paymentMethod: s.paymentMethod,
      metadata: s.metadata,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    });
  });

  console.log("\n─── ADDONS ───");
  const addons = await Addon.find({ userId: user._id })
    .sort({ createdAt: -1 })
    .lean();
  console.log(`count: ${addons.length}`);
  addons.forEach((a, i) => {
    console.log(`\n[Addon ${i}]`, {
      _id: a._id,
      type: a.type,
      status: a.status,
      metadata: a.metadata,
      createdAt: a.createdAt,
    });
  });

  console.log("\n─── PAYMENTS ───");
  const payments = await Payment.find({ userId: user._id })
    .sort({ createdAt: -1 })
    .lean();
  console.log(`count: ${payments.length}`);
  payments.forEach((p, i) => {
    console.log(`\n[Payment ${i}]`, {
      _id: p._id,
      provider: p.provider,
      moyasarPaymentId: p.moyasarPaymentId,
      moyasarInvoiceId: p.moyasarInvoiceId,
      givenId: p.givenId,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      providerStatus: p.providerStatus,
      subscriptionId: p.subscriptionId,
      addonId: p.addonId,
      paymentMethod: p.paymentMethod,
      redirectUrl: p.redirectUrl,
      callbackUrl: p.callbackUrl,
      description: p.description,
      metadata: p.metadata,
      initiatedAt: p.initiatedAt,
      paidAt: p.paidAt,
      failedAt: p.failedAt,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    });
  });

  await mongoose.disconnect();
  console.log("\nDone.");
})().catch(async (e) => {
  console.error(e);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
