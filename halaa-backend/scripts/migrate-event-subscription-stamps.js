/**
 * Migration Script: Stamp events with canonical subscription and plan references (PR4 / F-11)
 *
 * Scans all Event documents.
 * Ensures every event is stamped with:
 *   - subscriptionId: ObjectId reference to canonical Subscription
 *   - planId: ObjectId reference to canonical Plan
 *
 * Reports orphaned records by ID (no PII).
 * Quarantines orphaned records (marks quarantined: true) before switching reads.
 *
 * Usage:
 *   node scripts/migrate-event-subscription-stamps.js --dry-run
 *   node scripts/migrate-event-subscription-stamps.js --execute
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../config.env') });

const MONGODB_URI = process.env.DATABASE
  ? process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD)
  : (process.env.MONGODB_URI || 'mongodb://localhost:27017/labbe');

async function runMigration(options = {}) {
  const isExecute = options.execute === true || process.argv.includes('--execute');
  const modeLabel = isExecute ? 'EXECUTE' : 'DRY-RUN';
  console.log(`[migrate-event-subscription-stamps] Running in ${modeLabel} mode...`);

  let shouldCloseConnection = false;
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGODB_URI);
    shouldCloseConnection = true;
  }

  try {
    const db = mongoose.connection.db;
    const eventsCollection = db.collection('events');
    const subscriptionsCollection = db.collection('subscriptions');

    const cursor = eventsCollection.find({});
    let scanned = 0;
    let alreadyStamped = 0;
    let stamped = 0;
    let orphaned = 0;
    const remediationIds = [];
    const bulkOps = [];

    while (await cursor.hasNext()) {
      const event = await cursor.next();
      scanned++;

      let targetSubId = event.subscriptionId || null;
      let targetPlanId = event.planId || null;
      let isOrphan = false;
      let needsUpdate = false;
      let updateSet = {};

      if (targetSubId) {
        const sub = await subscriptionsCollection.findOne({ _id: targetSubId });
        if (sub) {
          if (!targetPlanId || String(targetPlanId) !== String(sub.planId)) {
            targetPlanId = sub.planId;
            updateSet.planId = targetPlanId;
            needsUpdate = true;
          }
        } else {
          // Dangling subscription pointer
          isOrphan = true;
        }
      } else {
        // Event has no subscriptionId stamped — resolve from host's subscriptions
        const hostId = event.host;
        if (hostId) {
          // Look for active subscription or latest subscription for this host
          const candidateSub = await subscriptionsCollection.findOne(
            {
              userId: hostId,
              status: { $in: ['active', 'trial', 'cancelled', 'completed'] },
            },
            { sort: { createdAt: -1 } }
          );

          if (candidateSub) {
            targetSubId = candidateSub._id;
            targetPlanId = candidateSub.planId;
            updateSet.subscriptionId = targetSubId;
            if (targetPlanId) {
              updateSet.planId = targetPlanId;
            }
            needsUpdate = true;
          } else {
            isOrphan = true;
          }
        } else {
          isOrphan = true;
        }
      }

      if (isOrphan) {
        orphaned++;
        remediationIds.push(String(event._id));
        updateSet.quarantined = true;
        updateSet.quarantineReason = targetSubId ? 'dangling_subscription' : 'missing_subscription';
        updateSet.quarantinedAt = new Date();
        needsUpdate = true;
      } else if (needsUpdate) {
        stamped++;
      } else {
        alreadyStamped++;
      }

      if (isExecute && needsUpdate && Object.keys(updateSet).length > 0) {
        bulkOps.push({
          updateOne: {
            filter: { _id: event._id },
            update: { $set: updateSet },
          },
        });
      }
    }

    console.log(`[migrate-event-subscription-stamps] Summary:`);
    console.log(`  Scanned:         ${scanned}`);
    console.log(`  Already stamped: ${alreadyStamped}`);
    console.log(`  Stamped/Updated: ${stamped}`);
    console.log(`  Orphaned:        ${orphaned}`);

    if (orphaned > 0) {
      console.log(`[migrate-event-subscription-stamps] Orphaned Records Report (IDs only):`);
      for (const id of remediationIds) {
        console.log(`  - ${id}`);
      }
    }

    if (isExecute && bulkOps.length > 0) {
      console.log(`[migrate-event-subscription-stamps] Executing ${bulkOps.length} updates in bulk...`);
      const res = await eventsCollection.bulkWrite(bulkOps);
      console.log(`[migrate-event-subscription-stamps] Bulk write complete. Modified: ${res.modifiedCount}`);
    } else if (!isExecute) {
      console.log(`[migrate-event-subscription-stamps] Dry-run completed. No data was modified.`);
    }

    return { mode: modeLabel, scanned, alreadyStamped, stamped, orphaned, remediationIds };
  } finally {
    if (shouldCloseConnection) {
      await mongoose.disconnect();
    }
  }
}

if (require.main === module) {
  runMigration()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(`[migrate-event-subscription-stamps] Fatal:`, err.message);
      process.exit(1);
    });
}

module.exports = { runMigration };
