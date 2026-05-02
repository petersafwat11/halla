/**
 * Seed Halaa plans — 36-plan structure
 * node scripts/seedPlans.js
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
  await Plan.deleteMany({});
  console.log('Cleared existing plans');

  const entries = Object.entries(PLAN_DEFAULTS);
  const created = [], errors = [];

  for (const [code, config] of entries) {
    try {
      await Plan.create({ code, ...config, isActive: true, isPublic: true });
      created.push({ code, planType: config.planType });
      console.log(`✓ ${code}`);
    } catch (err) {
      errors.push({ code, error: err.message });
      console.error(`✗ ${code}: ${err.message}`);
    }
  }

  console.log(`\nSeeded ${created.length} plans (${errors.length} errors)\n`);
  const byType = {};
  for (const p of created) byType[p.planType] = (byType[p.planType] || 0) + 1;
  console.table(byType);

  const EXPECTED = {
    trial: 1, basic_event: 8, basic_monthly: 5,
    premium_event: 8, premium_monthly: 5,
    business_event: 6, business_quarterly: 1, business_annual: 1, unlimited: 1,
  };
  const EXPECTED_TOTAL = 36;

  console.log('\n── Validation ──');
  let allOk = true;
  for (const [type, expected] of Object.entries(EXPECTED)) {
    const actual = byType[type] || 0;
    const ok = actual === expected;
    if (!ok) allOk = false;
    console.log(`${ok ? '✓' : '✗'} ${type}: expected ${expected}, got ${actual}`);
  }
  const totalOk = created.length === EXPECTED_TOTAL;
  if (!totalOk) allOk = false;
  console.log(`${totalOk ? '✓' : '✗'} TOTAL: expected ${EXPECTED_TOTAL}, got ${created.length}`);
  console.log(allOk ? '\n✅ All counts correct!' : '\n❌ Count mismatch — check planDefaults.js');

  await mongoose.disconnect();
}

seed().catch(console.error);
