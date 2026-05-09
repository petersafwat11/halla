/**
 * migrate-service-type-to-category
 *
 * One-shot migration that renames `Service.type` → `Service.category` and
 * drops the dropped engagement counter fields:
 *   - Service.inquiryCount, Service.bookingCount
 *   - User.profile.vendorData.inquiryCount, .bookingCount
 *
 * Project is in dev — single-shot rename, no expand/contract dance.
 *
 * Usage:
 *   node scripts/migrate-service-type-to-category.js --dry-run
 *   node scripts/migrate-service-type-to-category.js --apply
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const mongoose = require('mongoose');

const APPLY = process.argv.includes('--apply');
const DRY = !APPLY;

async function run() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');

  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  console.log(`[migrate] mode: ${DRY ? 'DRY RUN' : 'APPLY'}`);

  const services = db.collection('services');
  const users = db.collection('users');

  const renameCount = await services.countDocuments({ type: { $exists: true } });
  const orphanServiceCounters = await services.countDocuments({
    $or: [{ inquiryCount: { $exists: true } }, { bookingCount: { $exists: true } }],
  });
  const orphanUserCounters = await users.countDocuments({
    $or: [
      { 'profile.vendorData.inquiryCount': { $exists: true } },
      { 'profile.vendorData.bookingCount': { $exists: true } },
    ],
  });

  console.log(`[migrate] services with legacy 'type' field: ${renameCount}`);
  console.log(`[migrate] services with orphan counters: ${orphanServiceCounters}`);
  console.log(`[migrate] users with orphan vendor counters: ${orphanUserCounters}`);

  if (DRY) {
    console.log('[migrate] dry-run: no writes performed. Pass --apply to execute.');
    await mongoose.disconnect();
    return;
  }

  // Drop the legacy index on `type` if present (ignore "ns not found")
  try {
    const indexes = await services.indexes();
    const legacyIdx = indexes.find((i) => i.key && i.key.type === 1 && i.key.status === 1);
    if (legacyIdx) {
      console.log(`[migrate] dropping legacy index ${legacyIdx.name}`);
      await services.dropIndex(legacyIdx.name);
    }
  } catch (err) {
    console.warn(`[migrate] index drop warning: ${err.message}`);
  }

  // Rename type -> category, drop orphan counters in one update
  const renameRes = await services.updateMany(
    { type: { $exists: true } },
    [
      { $set: { category: '$type' } },
      { $unset: ['type', 'inquiryCount', 'bookingCount'] },
    ]
  );
  console.log(`[migrate] services rename: matched=${renameRes.matchedCount} modified=${renameRes.modifiedCount}`);

  // Drop counters from services that didn't have `type` but still carry counters
  const cleanupRes = await services.updateMany(
    { $or: [{ inquiryCount: { $exists: true } }, { bookingCount: { $exists: true } }] },
    { $unset: { inquiryCount: '', bookingCount: '' } }
  );
  console.log(`[migrate] services counter cleanup: modified=${cleanupRes.modifiedCount}`);

  const userCleanup = await users.updateMany(
    {
      $or: [
        { 'profile.vendorData.inquiryCount': { $exists: true } },
        { 'profile.vendorData.bookingCount': { $exists: true } },
      ],
    },
    {
      $unset: {
        'profile.vendorData.inquiryCount': '',
        'profile.vendorData.bookingCount': '',
      },
    }
  );
  console.log(`[migrate] user counter cleanup: modified=${userCleanup.modifiedCount}`);

  // Rebuild the new index
  await services.createIndex({ category: 1, status: 1 });
  console.log('[migrate] created index { category: 1, status: 1 }');

  await mongoose.disconnect();
  console.log('[migrate] done');
}

run().catch((err) => {
  console.error('[migrate] failed:', err);
  process.exit(1);
});
