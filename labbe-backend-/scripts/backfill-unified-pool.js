/**
 * One-off DEV backfill for the unified-pool rework (Phases 0-4).
 * Idempotent — safe to re-run.
 *
 *   1. Backfill invitePool/compensationPool on subscriptions from their
 *      (reseeded) plan, so per-event subs created before the rework get a pool.
 *   2. Recompute invitesConsumed = count of guests with invitation.sent === true
 *      across each subscription's events, so consumption reflects the new
 *      send-time model (was guests-added under the old model).
 *
 * Usage: node scripts/backfill-unified-pool.js
 */
require('dotenv').config({ path: './config.env' });
const mongoose = require('mongoose');
require('../models/PlanModel'); // register Plan schema for populate
const Subscription = require('../models/SubscriptionModel');
const Event = require('../models/EventModel');
const Guest = require('../models/GuestModel');
const { COMPENSATION_PERCENTAGE } = require('../src/shared/constants/plans');

const MONGODB_URI = process.env.DATABASE
  ? process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD)
  : process.env.MONGODB_URI;

async function run() {
  const opts = {};
  if (process.env.DATABASE_CERT_PATH) {
    opts.tls = true;
    opts.tlsCertificateKeyFile = process.env.DATABASE_CERT_PATH;
  }
  await mongoose.connect(MONGODB_URI, opts);
  console.log('Connected to MongoDB');

  const subs = await Subscription.find({}).populate('planId', 'limits planType code');
  let poolBackfilled = 0;
  let consumedRecomputed = 0;

  for (const sub of subs) {
    const set = {};
    const planPool = sub.planId?.limits?.invitePool ?? null;

    // (1) Backfill pool fields from the plan when the sub has none yet.
    if (planPool !== null && (sub.invitePool === null || sub.invitePool === undefined)) {
      set.invitePool = planPool;
      set.compensationPool = Math.floor((planPool * COMPENSATION_PERCENTAGE) / 100);
      poolBackfilled += 1;
    }

    // (2) Recompute invitesConsumed from actually-sent guests.
    const eventIds = (await Event.find({ subscriptionId: sub._id }).select('_id').lean())
      .map((e) => e._id);
    let sentCount = 0;
    if (eventIds.length) {
      sentCount = await Guest.countDocuments({
        event: { $in: eventIds },
        'invitation.sent': true,
      });
    }
    if ((sub.invitesConsumed || 0) !== sentCount) {
      set.invitesConsumed = sentCount;
      consumedRecomputed += 1;
    }

    if (Object.keys(set).length > 0) {
      await Subscription.updateOne({ _id: sub._id }, { $set: set });
    }
  }

  console.log(`\nSubscriptions scanned:      ${subs.length}`);
  console.log(`Pool fields backfilled:     ${poolBackfilled}`);
  console.log(`invitesConsumed recomputed: ${consumedRecomputed}`);
  console.log('\n✅ Backfill complete');
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
