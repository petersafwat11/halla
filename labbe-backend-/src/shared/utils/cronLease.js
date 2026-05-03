/**
 * Cron-lease helper for multi-instance deploys.
 *
 * M-17: when the backend runs on >1 node (typical Railway / horizontal-
 * scale setups), every node fires the same `cron.schedule` callback at
 * the same wall-clock minute. For idempotent jobs the worst case is a
 * duplicate audit log entry; for non-idempotent ones (notifications,
 * dispatches) it is double-fire.
 *
 * The fix: each cron tick attempts to claim a short-lived lease keyed
 * on the cron's name. Only the winning node runs; the others log and
 * return.
 *
 * Implementation: a `CronLease` Mongo collection with a TTL index on
 * `expiresAt`. Acquire via `findOneAndUpdate` with `upsert + $setOnInsert`,
 * succeeding only if no live lease exists. Release via deleteOne.
 *
 * Why not use the Event-level eventLock util? eventLock is keyed on a
 * specific Event document; cron jobs don't have an Event scope.
 */

const mongoose = require("mongoose");

const cronLeaseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, index: true },
    holder: { type: String, default: null },
    acquiredAt: { type: Date, default: Date.now },
    // TTL: set to acquiredAt + ttlMs at acquire time. Mongo's TTL sweeper
    // reaps expired leases within ~60s, so even a crashed holder doesn't
    // block forever — the worst case is one missed cron tick.
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { collection: "cron_leases" }
);

const CronLease = mongoose.models.CronLease || mongoose.model("CronLease", cronLeaseSchema);

/**
 * Try to acquire the cron lease for `name`. Returns true if THIS process
 * holds the lease for the next ~ttlMs window. If false, another node
 * already holds it — caller should skip the work.
 *
 * @param {string} name - cron job identifier (e.g. "subscription_status_update")
 * @param {Object} [opts]
 * @param {number} [opts.ttlMs=300000] - lease lifetime; default 5 minutes,
 *                                       comfortably longer than any cron
 *                                       tick we have today.
 * @param {string} [opts.holder] - process identifier for logs/debug.
 * @returns {Promise<boolean>}
 */
async function acquire(name, opts = {}) {
  const ttlMs = opts.ttlMs && opts.ttlMs > 0 ? opts.ttlMs : 5 * 60 * 1000;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMs);
  const holder = opts.holder || `${process.pid}@${process.env.HOSTNAME || "node"}`;

  try {
    // Attempt insert. If a live lease exists, the unique index on `name`
    // throws E11000 — interpret that as "another node already holds it".
    await CronLease.create({ name, holder, acquiredAt: now, expiresAt });
    return true;
  } catch (err) {
    if (err && err.code === 11000) {
      // Another node has the lease. Defense-in-depth: if the existing
      // lease is past its TTL but Mongo's sweeper hasn't reaped yet,
      // adopt it.
      const existing = await CronLease.findOne({ name }).lean();
      if (existing && existing.expiresAt && existing.expiresAt < now) {
        // Stale — try to take it over. If the takeover loses to another
        // node racing for the same stale lease, we just lose the tick.
        const claimed = await CronLease.findOneAndUpdate(
          { name, expiresAt: { $lt: now } },
          { $set: { holder, acquiredAt: now, expiresAt } },
          { new: true }
        );
        return !!claimed;
      }
      return false;
    }
    // eslint-disable-next-line no-console
    console.error(`[cronLease] acquire(${name}) failed:`, err.message);
    return false; // fail-closed
  }
}

/**
 * Release the lease for `name`. Idempotent — safe to call even if we
 * never held it.
 */
async function release(name) {
  try {
    await CronLease.deleteOne({ name });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`[cronLease] release(${name}) failed:`, err.message);
  }
}

/**
 * Convenience wrapper: try to acquire, run the function, release. Skips
 * silently when the lease is held elsewhere. The function MUST be safe
 * to retry next tick.
 *
 * @param {string} name
 * @param {() => Promise<*>} fn
 * @param {Object} [opts] - forwarded to acquire()
 */
async function withLease(name, fn, opts = {}) {
  const got = await acquire(name, opts);
  if (!got) return { ran: false, reason: "lease_held_elsewhere" };
  try {
    const value = await fn();
    return { ran: true, value };
  } finally {
    await release(name);
  }
}

module.exports = { acquire, release, withLease };
