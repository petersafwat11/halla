/**
 * Seed Halaa plans — 54-plan structure (rev. 2)
 * Idempotent: upserts by `code` so re-running is safe.
 *
 * Usage:
 *   node scripts/seedPlans.js
 *
 * When the schema changes shape (e.g. removed fields), drop the collection
 * manually first (`db.plans.drop()`) so stale paths don't linger.
 */
require('dotenv').config({ path: './config.env' });
const mongoose = require('mongoose');
const Plan = require('../models/PlanModel');
const { PLAN_DEFAULTS } = require('../src/shared/constants/planDefaults');

const MONGODB_URI = process.env.DATABASE
  ? process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD)
  : process.env.MONGODB_URI;

async function seed() {
  const mongoOptions = {};
  if (process.env.DATABASE_CERT_PATH) {
    mongoOptions.tls = true;
    mongoOptions.tlsCertificateKeyFile = process.env.DATABASE_CERT_PATH;
  }
  await mongoose.connect(MONGODB_URI, mongoOptions);
  console.log('Connected to MongoDB');

  const entries = Object.entries(PLAN_DEFAULTS);
  const upserted = [], errors = [];

  for (const [code, config] of entries) {
    try {
      const doc = await Plan.findOneAndUpdate(
        { code },
        { $set: { code, ...config, isActive: true, isPublic: true } },
        { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true },
      );
      upserted.push({ code, planType: doc.planType });
      console.log(`✓ ${code}`);
    } catch (err) {
      errors.push({ code, error: err.message });
      console.error(`✗ ${code}: ${err.message}`);
    }
  }

  console.log(`\nUpserted ${upserted.length} plans (${errors.length} errors)\n`);
  const byType = {};
  for (const p of upserted) byType[p.planType] = (byType[p.planType] || 0) + 1;
  console.table(byType);

  const EXPECTED = {
    trial: 1,
    basic_event: 6,
    basic_monthly: 6,
    premium_event: 6,
    premium_monthly: 6,
    business_event: 6,
    business_quarterly: 1,
    business_annual: 1,
    unlimited: 1,
  };
  const EXPECTED_TOTAL = 34;

  console.log('\n── Validation ──');
  let allOk = true;
  for (const [type, expected] of Object.entries(EXPECTED)) {
    const actual = byType[type] || 0;
    const ok = actual === expected;
    if (!ok) allOk = false;
    console.log(`${ok ? '✓' : '✗'} ${type}: expected ${expected}, got ${actual}`);
  }
  const totalOk = upserted.length === EXPECTED_TOTAL;
  if (!totalOk) allOk = false;
  console.log(`${totalOk ? '✓' : '✗'} TOTAL: expected ${EXPECTED_TOTAL}, got ${upserted.length}`);

  // Sanity: business_event_500 must be gone after this seed.
  const stray500 = await Plan.findOne({ code: 'business_event_500' });
  if (stray500) {
    allOk = false;
    console.log("✗ stale plan 'business_event_500' still in DB — drop the collection and re-run");
  } else {
    console.log("✓ business_event_500 absent");
  }

  console.log(allOk ? '\n✅ All counts correct!' : '\n❌ Count mismatch — check planDefaults.js');

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
