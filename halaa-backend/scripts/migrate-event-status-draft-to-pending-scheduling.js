/**
 * migrate-event-status-draft-to-pending-scheduling
 *
 * Updates all events in the database that currently have status = 'draft'
 * (or previousStatus = 'draft') to 'pending_scheduling'.
 *
 * Usage:
 *   node scripts/migrate-event-status-draft-to-pending-scheduling.js --dry-run
 *   node scripts/migrate-event-status-draft-to-pending-scheduling.js --apply
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const Event = require('../models/EventModel');

const APPLY = process.argv.includes('--apply');
const DRY = !APPLY;

async function run() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE;
  if (!uri) throw new Error('MONGODB_URI/DATABASE connection string is not set in env');

  await mongoose.connect(uri);

  console.log(`[migrate-event-status] mode: ${DRY ? 'DRY RUN' : 'APPLY'}`);

  const candidatesCount = await Event.countDocuments({
    $or: [
      { status: 'draft' },
      { previousStatus: 'draft' }
    ]
  });

  console.log(`[migrate] candidates found with 'draft' status: ${candidatesCount}`);

  if (DRY) {
    const sample = await Event.find({
      $or: [
        { status: 'draft' },
        { previousStatus: 'draft' }
      ]
    })
      .select('title status previousStatus createdAt')
      .limit(10)
      .lean();
    console.log(`[migrate] sample candidates (up to 10):`);
    for (const row of sample) {
      console.log(`  ID: ${row._id} | title: ${row.title || '—'} | status: ${row.status} | previousStatus: ${row.previousStatus}`);
    }
    console.log(`[migrate] DRY RUN — no changes applied. Re-run with --apply to perform updates.`);
  } else {
    const resStatus = await Event.updateMany(
      { status: 'draft' },
      { $set: { status: 'pending_scheduling' } }
    );
    console.log(`[migrate status] matched=${resStatus.matchedCount} modified=${resStatus.modifiedCount}`);

    const resPrevStatus = await Event.updateMany(
      { previousStatus: 'draft' },
      { $set: { previousStatus: 'pending_scheduling' } }
    );
    console.log(`[migrate previousStatus] matched=${resPrevStatus.matchedCount} modified=${resPrevStatus.modifiedCount}`);
  }

  await mongoose.disconnect();
  console.log('[migrate] done');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
