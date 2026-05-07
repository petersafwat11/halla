/**
 * One-time backfill from Subscription/Addon legacy fields to the new
 * Payment collection.
 *
 * For every Subscription with `metadata.paymentTransactionId` set:
 *   1. If a Payment row already exists for that moyasarPaymentId, skip
 *      (the script is idempotent — re-runs are safe).
 *   2. Otherwise create a Payment row in `paid` status with the values
 *      we can reconstruct from the Subscription (amount, currency,
 *      timestamps, paymentMethod sub-doc).
 *   3. Set `subscription.metadata.paymentId = newPayment._id` and
 *      unset `subscription.metadata.paymentTransactionId`.
 *
 * Same loop for Addons (`metadata.paymentTransactionId` → Payment row,
 * `metadata.paymentId` set, legacy field unset).
 *
 * Usage:
 *   NODE_ENV=production node scripts/backfill-payments.js
 *   NODE_ENV=production node scripts/backfill-payments.js --dry-run
 */

require('dotenv').config({ path: __dirname + '/../config.env' });
const mongoose = require('mongoose');

const Subscription = require('../models/SubscriptionModel');
const Addon = require('../models/AddonModel');
const Payment = require('../models/PaymentModel');

const DRY_RUN = process.argv.includes('--dry-run');

const log = (...args) => {
  // eslint-disable-next-line no-console
  console.log('[backfill]', ...args);
};

const reconstructPaymentMethod = (sub) => {
  const pm = sub.paymentMethod || {};
  return {
    type: pm.type || 'creditcard',
    company: pm.brand || null,
    last4: pm.last4 || null,
    expiryMonth: pm.expiryMonth || null,
    expiryYear: pm.expiryYear || null,
  };
};

const backfillSubscriptions = async () => {
  const cursor = Subscription.find({
    'metadata.paymentTransactionId': { $exists: true, $ne: null },
  }).cursor();

  let scanned = 0;
  let created = 0;
  let linked = 0;
  for await (const sub of cursor) {
    scanned += 1;
    const moyasarPaymentId = sub.metadata.paymentTransactionId;

    let payment = await Payment.findOne({ moyasarPaymentId });
    if (!payment) {
      const doc = {
        userId: sub.userId,
        whitelabelId: sub.whitelabelId || null,
        subscriptionId: sub._id,
        amount: sub.pricePaid?.amount ?? sub.pricePaid ?? 0,
        currency: sub.pricePaid?.currency || sub.currency || 'SAR',
        provider: 'moyasar',
        status: Payment.PAYMENT_STATUS.PAID,
        moyasarPaymentId,
        paymentMethod: reconstructPaymentMethod(sub),
        description: `Subscription (backfill) ${sub.planId}`,
        metadata: { backfilledFrom: 'subscription', purpose: 'subscription' },
        initiatedAt: sub.activatedAt || sub.createdAt,
        paidAt: sub.activatedAt || sub.createdAt,
      };
      if (!DRY_RUN) payment = await Payment.create(doc);
      created += 1;
    }

    if (!DRY_RUN && payment) {
      await Subscription.updateOne(
        { _id: sub._id },
        {
          $set: { 'metadata.paymentId': payment._id },
          $unset: { 'metadata.paymentTransactionId': '' },
        }
      );
    }
    linked += 1;
  }
  log(`subscriptions: scanned=${scanned} created=${created} linked=${linked}`);
};

const backfillAddons = async () => {
  const cursor = Addon.find({
    'metadata.paymentTransactionId': { $exists: true, $ne: null },
  }).cursor();

  let scanned = 0;
  let created = 0;
  let linked = 0;
  for await (const addon of cursor) {
    scanned += 1;
    const moyasarPaymentId = addon.metadata.paymentTransactionId;

    let payment = await Payment.findOne({ moyasarPaymentId });
    if (!payment) {
      const doc = {
        userId: addon.userId,
        addonId: addon._id,
        amount: addon.price,
        currency: addon.currency || 'SAR',
        provider: 'moyasar',
        status: Payment.PAYMENT_STATUS.PAID,
        moyasarPaymentId,
        description: `Addon (backfill) ${addon.addonType}`,
        metadata: {
          backfilledFrom: 'addon',
          purpose: 'addon',
          addonType: addon.addonType,
        },
        initiatedAt: addon.createdAt,
        paidAt: addon.createdAt,
      };
      if (!DRY_RUN) payment = await Payment.create(doc);
      created += 1;
    }

    if (!DRY_RUN && payment) {
      await Addon.updateOne(
        { _id: addon._id },
        {
          $set: { 'metadata.paymentId': payment._id },
          $unset: { 'metadata.paymentTransactionId': '' },
        }
      );
    }
    linked += 1;
  }
  log(`addons: scanned=${scanned} created=${created} linked=${linked}`);
};

const main = async () => {
  if (!process.env.DATABASE) throw new Error('DATABASE env var missing');
  await mongoose.connect(process.env.DATABASE);
  log(DRY_RUN ? 'DRY RUN — no writes' : 'WRITE MODE');
  await backfillSubscriptions();
  await backfillAddons();
  await mongoose.disconnect();
  log('done');
};

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[backfill] failed:', err);
  process.exit(1);
});
