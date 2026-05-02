/**
 * Event-level launch lock (Phase 3a.3).
 *
 * Two cron ticks (or a cron tick and a manual retry) firing within the
 * same minute would otherwise both call `sendBulk` and double-message
 * every guest. The fix: a per-event lock stamped onto the Event document
 * before any send runs.
 *
 * Implementation: Option A from PHASE_3abc_PLAN.md — `launchLock.lockedAt`
 * and `launchLock.lockedBy` directly on the Event doc. No new collection.
 *
 * Acquire: atomic `findOneAndUpdate` that succeeds only if the existing
 * lock is null OR older than `STALE_AFTER_MS` (10 min). Stale locks are
 * forcibly retaken to recover from a crashed worker.
 *
 * Release: clear both fields. Idempotent — safe to call even if the lock
 * was never acquired by this caller.
 */

const Event = require("../../../models/EventModel");

const STALE_AFTER_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Try to acquire the launch lock for `eventId`.
 *
 * @param {string} eventId
 * @param {string} workerId — opaque caller identifier; useful in logs.
 * @returns {Promise<{ acquired: true, event: Object } | { acquired: false }>}
 */
async function acquire(eventId, workerId) {
  const now = new Date();
  const staleCutoff = new Date(now.getTime() - STALE_AFTER_MS);

  const event = await Event.findOneAndUpdate(
    {
      _id: eventId,
      $or: [
        { "launchLock.lockedAt": null },
        { "launchLock.lockedAt": { $exists: false } },
        { "launchLock.lockedAt": { $lt: staleCutoff } },
      ],
    },
    {
      $set: {
        "launchLock.lockedAt": now,
        "launchLock.lockedBy": workerId || "unknown",
      },
    },
    { new: true }
  );

  if (!event) return { acquired: false };
  return { acquired: true, event };
}

/**
 * Release the lock. Always succeeds; clears the fields unconditionally.
 *
 * @param {string} eventId
 * @returns {Promise<void>}
 */
async function release(eventId) {
  await Event.updateOne(
    { _id: eventId },
    {
      $set: {
        "launchLock.lockedAt": null,
        "launchLock.lockedBy": null,
      },
    }
  );
}

module.exports = {
  acquire,
  release,
  STALE_AFTER_MS,
};
