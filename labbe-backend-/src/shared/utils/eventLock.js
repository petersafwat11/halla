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

const STALE_AFTER_MS = 10 * 60 * 1000; // 10 minutes — default
const HEARTBEAT_INTERVAL_MS = 60 * 1000; // 1 minute
// Headroom over the worst-case sendBulk wall clock so a transient pause
// (DB hiccup, GC pause) doesn't immediately make the lock stale.
const TTL_BUFFER_MS = 2 * 60 * 1000;

/**
 * H-17: estimate how long a `sendBulk` for `guestCount` invitees will take
 * given the rate cap (10 sends/sec × concurrency 5). Used by the cron path
 * to derive a safe TTL — at 6000 guests sendBulk runs ~10min, a 10min lock
 * with no heartbeat would expire the moment the second cron tick fires.
 *
 * Returns a value in ms, never less than the legacy 10-minute floor.
 */
function estimateLockTtl(guestCount, ratePerSecond = 10) {
  if (!guestCount || guestCount <= 0) return STALE_AFTER_MS;
  const wallMs = Math.ceil(guestCount / ratePerSecond) * 1000 + TTL_BUFFER_MS;
  return Math.max(STALE_AFTER_MS, wallMs);
}

/**
 * Try to acquire the launch lock for `eventId`.
 *
 * The atomic `findOneAndUpdate` with the `$or` predicate is the
 * concurrency primitive: only one worker's update can win when the lock
 * is null, missing, or stale. The losers fall through to `acquired:
 * false` and back off.
 *
 * @param {string} eventId
 * @param {string} workerId — opaque caller identifier; useful in logs.
 * @param {Object} [opts]
 * @param {number} [opts.ttlMs=STALE_AFTER_MS] - per-call stale window.
 * @returns {Promise<{ acquired: true, event: Object, ttlMs: number } | { acquired: false }>}
 */
async function acquire(eventId, workerId, opts = {}) {
  const now = new Date();
  const ttlMs = opts.ttlMs && opts.ttlMs > 0 ? opts.ttlMs : STALE_AFTER_MS;
  const staleCutoff = new Date(now.getTime() - ttlMs);

  try {
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
    return { acquired: true, event, ttlMs };
  } catch (err) {
    // Treat any DB error as "could not acquire" so the caller falls back
    // to its skip path. We never want a transient lookup failure to
    // silently double-launch.
    console.error(`[eventLock] acquire(${eventId}) failed:`, err.message);
    return { acquired: false, error: err.message };
  }
}

/**
 * Release the lock. Idempotent — safe to call multiple times. The caller
 * should still wrap in their own try/catch if they're inside a `finally`
 * block (don't let release errors mask the original error).
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

/**
 * H-17: heartbeat helper. Refreshes the lock's `lockedAt` timestamp so a
 * long-running `sendBulk` doesn't trip the stale window and let a second
 * worker double-fire. Returns a `stop()` function the caller MUST invoke
 * before releasing the lock (typically inside `finally`).
 *
 * @param {string} eventId
 * @param {string} workerId
 * @param {number} [intervalMs=HEARTBEAT_INTERVAL_MS]
 * @returns {{ stop: () => void }}
 */
function heartbeat(eventId, workerId, intervalMs = HEARTBEAT_INTERVAL_MS) {
  let stopped = false;
  const tick = async () => {
    if (stopped) return;
    try {
      await Event.updateOne(
        { _id: eventId, "launchLock.lockedBy": workerId || "unknown" },
        { $set: { "launchLock.lockedAt": new Date() } }
      );
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`[eventLock] heartbeat(${eventId}) failed:`, err.message);
    }
  };
  const handle = setInterval(tick, intervalMs);
  return {
    stop: () => {
      stopped = true;
      clearInterval(handle);
    },
  };
}

module.exports = {
  acquire,
  release,
  heartbeat,
  estimateLockTtl,
  STALE_AFTER_MS,
  HEARTBEAT_INTERVAL_MS,
};
