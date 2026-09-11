#!/usr/bin/env node
/**
 * @halaa-checkin/api
 * Event purge CLI (retention enforcement).
 *
 * Dry-run by default: prints the resolved event and the exact counts that
 * WOULD be removed. Execution requires BOTH an explicit --eventId and
 * --confirm. Removes ONLY that event's guests, audits, export jobs (plus
 * their private artifact files), idempotency records and user assignments,
 * then verifies the result.
 *
 * Safety properties:
 * - Fails fast unless the configured database uses the documented mini-app
 *   prefix (never Halaa's database).
 * - Every destructive query is filtered by the single resolved eventId; a
 *   before/after count of OTHER events' guests is asserted unchanged.
 * - Artifact deletion is confined to EXPORT_DIR basenames stored on this
 *   event's jobs (no path component from guest/event names is trusted).
 * - This is a retention tool, never a seed/reset shortcut: it deletes the
 *   event itself and refuses demo-seed event names without --confirm.
 *
 * Usage:
 *   node api/scripts/purge-event.mjs --eventId <ObjectId>            # dry run
 *   node api/scripts/purge-event.mjs --eventId <ObjectId> --confirm  # execute
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { config, validateConfig } from '../src/config.js';
import { connectDb, disconnectDb } from '../src/db/connection.js';
import { Event } from '../src/modules/events/event.model.js';
import { Guest } from '../src/modules/guests/guest.model.js';
import { Audit } from '../src/modules/audit/audit.model.js';
import { Idempotency } from '../src/modules/idempotency/idempotency.model.js';
import { ExportJob } from '../src/modules/exports/exportJob.model.js';
import { User } from '../src/modules/auth/user.model.js';

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { eventId: '', confirm: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--eventId' && args[i + 1]) out.eventId = args[++i];
    else if (args[i] === '--confirm') out.confirm = true;
    else if (args[i] === '--help' || args[i] === '-h') {
      console.log('Usage: purge-event.mjs --eventId <ObjectId> [--confirm]');
      process.exit(0);
    }
  }
  return out;
}

async function collectCounts(eventId) {
  const [guestsTotal, guestsActive, guestsAdmitted, audits, idempotency, jobs, assignedUsers] =
    await Promise.all([
      Guest.countDocuments({ eventId }),
      Guest.countDocuments({ eventId, deletedAt: null }),
      Guest.countDocuments({ eventId, deletedAt: null, checkIn: { $ne: null } }),
      Audit.countDocuments({ eventId }),
      Idempotency.countDocuments({ eventId }),
      ExportJob.countDocuments({ eventId }),
      User.countDocuments({ assignedEventIds: eventId }),
    ]);
  const jobsWithArtifacts = await ExportJob.find({ eventId }).select('artifactBasename').lean();
  const basenames = jobsWithArtifacts.map((j) => j.artifactBasename).filter(Boolean);
  return { guestsTotal, guestsActive, guestsAdmitted, audits, idempotency, jobs, assignedUsers, basenames };
}

function resolveArtifactPath(exportDir, basename) {
  // Confine to EXPORT_DIR: basename only, no directories, final parent must match.
  const base = path.basename(String(basename));
  if (!base || base !== String(basename) || base.includes('\0')) return null;
  const resolved = path.resolve(exportDir, base);
  if (path.dirname(resolved) !== path.resolve(exportDir)) return null;
  return resolved;
}

async function main() {
  const { eventId, confirm } = parseArgs();
  if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
    console.error('Refusing: --eventId <Mongo ObjectId> is required.');
    process.exit(1);
  }

  try {
    validateConfig(config);
    console.log(`Database: ${config.mongodb.dbName} (prefix-validated)`);
    await connectDb(config);

    const eventObjectId = new mongoose.Types.ObjectId(eventId);
    const event = await Event.findById(eventObjectId).lean();
    if (!event) {
      console.error(`No event found with id ${eventId}. Nothing to do.`);
      await disconnectDb();
      process.exit(1);
    }

    const otherGuestsBeforeDocs = await Guest.find({ eventId: { $ne: eventObjectId } }).select('_id').lean();
    const otherGuestIdsBefore = new Set(otherGuestsBeforeDocs.map((g) => String(g._id)));
    const otherGuestsBefore = otherGuestIdsBefore.size;
    const counts = await collectCounts(eventObjectId);

    console.log('--- Event purge selection ---');
    console.log(`Event:  ${event.name}`);
    console.log(`ID:     ${event._id}`);
    console.log(`Venue:  ${event.venue}`);
    console.log(`Status: ${event.status}  startsAt: ${new Date(event.startsAt).toISOString()}`);
    console.log('--- Records in scope ---');
    console.log(`Guests: ${counts.guestsTotal} total (${counts.guestsActive} active, ${counts.guestsAdmitted} admitted)`);
    console.log(`Audits: ${counts.audits}`);
    console.log(`Idempotency records: ${counts.idempotency}`);
    console.log(`Export jobs: ${counts.jobs} (${counts.basenames.length} with artifact files)`);
    console.log(`User assignments referencing event: ${counts.assignedUsers}`);
    console.log(`Other events' guests (must stay ${otherGuestsBefore}): ${otherGuestsBefore}`);

    if (!confirm) {
      console.log('');
      console.log('DRY RUN: nothing was deleted. Re-run with --confirm to execute.');
      await disconnectDb();
      process.exit(0);
    }

    console.log('');
    console.log('--confirm supplied: executing purge...');
    console.log('Fencing event and draining its export jobs before removal...');

    // F27: fence the event to prevent new admissions/imports during purge.
    await Event.updateOne({ _id: eventObjectId }, { $set: { status: 'closed', closedAt: new Date(), purgingAt: new Date() }, $inc: { version: 1, activitySeq: 1 } });

    // F27: cancel/drain this event's queued/running export jobs (release quotas).
    const activeJobs = await ExportJob.find({ eventId: eventObjectId, state: { $in: ['queued', 'running'] } });
    for (const j of activeJobs) {
      try {
        j.state = 'failed';
        j.errorCode = 'EXPORT_FAILED';
        j.errorMessage = 'Cancelled for event purge';
        j.leaseOwner = null;
        j.leaseUntil = null;
        await j.save();

      } catch (err) {
        throw new Error(`Could not cancel job ${j._id}: ${err.message}`);
      }
    }

    // 1. Private artifact files (confined to EXPORT_DIR).
    let removedFiles = 0;
    const fencedCounts = await collectCounts(eventObjectId);
    for (const basename of fencedCounts.basenames) {
      const filePath = resolveArtifactPath(config.export.dir, basename);
      if (!filePath) {
        console.warn(`Skipping unresolvable artifact name: ${basename}`);
        continue;
      }
      try {
        await fs.promises.unlink(filePath);
        removedFiles++;
      } catch (err) {
        if (err.code !== 'ENOENT') throw err;
      }
      // Also remove a leftover .tmp sibling if the worker died mid-write.
      try {
        await fs.promises.unlink(`${filePath}.tmp`);
      } catch {
        // Ignore: tmp file usually absent.
      }
    }

    // 2. Database records, all scoped to this single eventId (F27: atomic where
    // practical via transaction; no parallel uncoordinated deletes).
    const { withTransaction } = await import('../src/db/transaction.js');
    let jobsRes, idemRes, auditRes, guestRes, eventRes, assignRes;
    await withTransaction(async (session) => {
      jobsRes = await ExportJob.deleteMany({ eventId: eventObjectId }).session(session);
      idemRes = await Idempotency.deleteMany({ eventId: eventObjectId }).session(session);
      auditRes = await Audit.deleteMany({ eventId: eventObjectId }).session(session);
      guestRes = await Guest.deleteMany({ eventId: eventObjectId }).session(session);
      eventRes = await Event.deleteOne({ _id: eventObjectId }).session(session);
      assignRes = await User.updateMany(
        { assignedEventIds: eventObjectId },
        { $pull: { assignedEventIds: eventObjectId } },
      ).session(session);
    });

    // 3. Verification: everything in scope is gone; other-event records intact
    // (F27: scope-based, not exact unrelated totals which may legitimately change).
    const after = await collectCounts(eventObjectId);
    const eventGone = (await Event.countDocuments({ _id: eventObjectId })) === 0;
    const staleAssignments = await User.countDocuments({ assignedEventIds: eventObjectId });
    const otherGuestsAfterDocs = await Guest.find({ eventId: { $ne: eventObjectId } }).select('_id').lean();
    const otherIdsAfter = new Set(otherGuestsAfterDocs.map((g) => String(g._id)));
    let otherPreserved = true;
    for (const id of otherGuestIdsBefore) {
      if (!otherIdsAfter.has(id)) { otherPreserved = false; break; }
    }

    console.log('--- Purge result ---');
    console.log(`Export jobs removed: ${jobsRes.deletedCount}, artifact files removed: ${removedFiles}`);
    console.log(`Idempotency removed: ${idemRes.deletedCount}`);
    console.log(`Audits removed: ${auditRes.deletedCount}`);
    console.log(`Guests removed: ${guestRes.deletedCount}`);
    console.log(`Event removed: ${eventRes.deletedCount}, assignments cleaned: ${assignRes.modifiedCount}`);

    const clean =
      eventGone &&
      after.guestsTotal === 0 &&
      after.audits === 0 &&
      after.idempotency === 0 &&
      after.jobs === 0 &&
      staleAssignments === 0 &&
      otherPreserved;

    if (!clean) {
      console.error('VERIFICATION FAILED: residual records remain. See counts above.');
      console.error(JSON.stringify({ after, eventGone, staleAssignments, otherPreserved, otherBefore: otherGuestsBefore, otherAfter: otherIdsAfter.size }));
      await disconnectDb();
      process.exit(1);
    }

    console.log(`Verified: event ${eventId} fully purged; ${otherIdsAfter.size} other-event guests preserved (scope check).`);
    await disconnectDb();
    process.exit(0);
  } catch (err) {
    console.error('Purge failed:', err.message);
    try {
      await disconnectDb();
    } catch {
      // Ignore disconnect errors on fatal exit.
    }
    process.exit(1);
  }
}

const invokedAsMain =
  typeof process.argv[1] === 'string' &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (invokedAsMain) {
  main();
}
