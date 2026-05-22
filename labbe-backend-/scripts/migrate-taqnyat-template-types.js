/**
 * migrate-taqnyat-template-types
 *
 * Backfills TaqnyatTemplate.type for templates that already have a category
 * assigned but no type yet. Convention: anything assigned before now is
 * treated as 'invite' — admins will re-tag the reminder/post-event/staff
 * templates in the updated Assign popup (Type dropdown).
 *
 * Templates without a category remain `type: null` (unassigned) — they will
 * surface in the admin Assign popup and be tagged from there.
 *
 * Usage:
 *   node scripts/migrate-taqnyat-template-types.js --dry-run
 *   node scripts/migrate-taqnyat-template-types.js --apply
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const TaqnyatTemplate = require('../models/TaqnyatTemplateModel');

const APPLY = process.argv.includes('--apply');
const DRY = !APPLY;

async function run() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');

  await mongoose.connect(uri);

  console.log(`[migrate-taqnyat-template-types] mode: ${DRY ? 'DRY RUN' : 'APPLY'}`);

  const filter = {
    $and: [
      { $or: [{ type: { $exists: false } }, { type: null }] },
      { category: { $ne: null } },
    ],
  };

  const candidates = await TaqnyatTemplate.countDocuments(filter);
  console.log(`[migrate] candidates with category but no type: ${candidates}`);

  if (DRY) {
    const sample = await TaqnyatTemplate.find(filter)
      .select('taqnyatId templateName category type')
      .limit(10)
      .lean();
    console.log(`[migrate] sample (up to 10):`);
    for (const row of sample) {
      console.log(`  ${row.taqnyatId}  ${row.templateName}  category=${row.category}  type=${row.type ?? 'null'}`);
    }
    console.log(`[migrate] DRY RUN — no changes applied. Re-run with --apply to backfill.`);
  } else {
    const res = await TaqnyatTemplate.updateMany(filter, { $set: { type: 'invite' } });
    console.log(`[migrate] matched=${res.matchedCount} modified=${res.modifiedCount}`);
  }

  await mongoose.disconnect();
  console.log('[migrate] done');
}

if (require.main === module) {
  run().catch((err) => {
    console.error('[migrate] failed:', err);
    process.exit(1);
  });
}

module.exports = { run };
