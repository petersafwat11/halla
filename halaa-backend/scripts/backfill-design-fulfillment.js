/**
 * Backfill Script: Populate fulfillment timestamps on existing custom-design addons (PR6 / F-12)
 *
 * Scans all design_template Addon documents.
 * Ensures every design template addon has:
 *   - fulfillment.requestedAt (backfilled from createdAt / activatedAt)
 *   - fulfillment.expectedDeliveryAt (derived strictly from SLA)
 *   - Does NOT invent progress (does not artificially mark queued/in_progress/fulfilled)
 *
 * Reports ID-only counts (no PII):
 *   - scanned, updated, alreadyValid, errors
 *
 * Usage:
 *   node scripts/backfill-design-fulfillment.js --dry-run
 *   node scripts/backfill-design-fulfillment.js --execute
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../config.env') });

const {
  ADDON_TYPES,
  DESIGN_FULFILLMENT_STATUS,
  deriveExpectedDeliveryDate,
} = require('../src/shared/constants/addons');

const MONGODB_URI = process.env.DATABASE
  ? process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD)
  : (process.env.MONGODB_URI || 'mongodb://localhost:27017/labbe');

async function runBackfill(options = {}) {
  const isExecute = options.execute === true || process.argv.includes('--execute');
  const modeLabel = isExecute ? 'EXECUTE' : 'DRY-RUN';
  console.log(`[backfill-design-fulfillment] Running in ${modeLabel} mode...`);

  let shouldCloseConnection = false;
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGODB_URI);
    shouldCloseConnection = true;
  }

  try {
    const db = mongoose.connection.db;
    const addonsCollection = db.collection('addons');

    const cursor = addonsCollection.find({ addonType: ADDON_TYPES.DESIGN_TEMPLATE });

    let scanned = 0;
    let updated = 0;
    let alreadyValid = 0;
    let errors = 0;
    const updatedIds = [];

    while (await cursor.hasNext()) {
      const addon = await cursor.next();
      scanned++;

      const existingFulfillment = addon.fulfillment || {};
      const requestedAt = existingFulfillment.requestedAt;

      if (requestedAt) {
        alreadyValid++;
        continue;
      }

      // Backfill requestedAt from createdAt or activatedAt or now
      const fallbackDate =
        addon.createdAt ||
        (addon.metadata && addon.metadata.activatedAt ? new Date(addon.metadata.activatedAt) : new Date());

      const requestedDate = fallbackDate instanceof Date ? fallbackDate : new Date(fallbackDate);
      const expectedDeliveryDate = deriveExpectedDeliveryDate(addon.templateType, requestedDate);

      const updateFields = {
        'fulfillment.requestedAt': requestedDate,
        'fulfillment.expectedDeliveryAt': existingFulfillment.expectedDeliveryAt || expectedDeliveryDate,
      };

      // Only if the record is ALREADY in terminal fulfilled status in production, backfill fulfilledAt from updatedAt
      if (addon.status === DESIGN_FULFILLMENT_STATUS.FULFILLED && !existingFulfillment.fulfilledAt) {
        updateFields['fulfillment.fulfilledAt'] = addon.updatedAt || requestedDate;
      }

      if (isExecute) {
        try {
          await addonsCollection.updateOne(
            { _id: addon._id },
            { $set: updateFields }
          );
          updated++;
          updatedIds.push(String(addon._id));
        } catch (err) {
          errors++;
          console.error(`[backfill-design-fulfillment] Error updating addon ${addon._id}:`, err.message);
        }
      } else {
        // DRY RUN
        updated++;
        updatedIds.push(String(addon._id));
      }
    }

    console.log(`[backfill-design-fulfillment] ${modeLabel} Summary:`);
    console.log(`  Scanned:       ${scanned}`);
    console.log(`  Updated:       ${updated}`);
    console.log(`  Already Valid: ${alreadyValid}`);
    console.log(`  Errors:        ${errors}`);

    return {
      scanned,
      updated,
      alreadyValid,
      errors,
      updatedIds,
    };
  } finally {
    if (shouldCloseConnection) {
      await mongoose.disconnect();
    }
  }
}

if (require.main === module) {
  runBackfill()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[backfill-design-fulfillment] Fatal error:', err);
      process.exit(1);
    });
}

module.exports = { runBackfill };
