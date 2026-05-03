/**
 * Idempotency helpers.
 *
 * `withIdempotency(key, fn, opts)` — guard a non-HTTP code path (cron,
 * webhook worker, outbound payment call) against double execution.
 *
 * Race-safe contract (post-H-6):
 *   1. Insert a `pending` row up-front via upsert keyed on
 *      `{ userId, scope, key }`. If we lost the race (existing row),
 *      we either replay the cached `completed` body, poll for a peer
 *      `pending` row to finish, or throw on a body-hash mismatch.
 *   2. If we won the race, run `fn`. On success update the row to
 *      `completed` and return the result. On failure delete the
 *      `pending` row so a retry can run cleanly.
 *
 * Callers MUST pass:
 *   - `opts.scope`         — partition label (`payment.charge`, etc.)
 *   - `opts.requestHash`   — sha256 (or any stable string) of the
 *                             logical request payload. We refuse to
 *                             default this so conflict detection works.
 *   - `opts.userId`        — optional; defaults to null for system jobs.
 *
 * The HTTP-side middleware lives in `src/shared/middleware/idempotency.js`
 * and uses the same model + same state machine.
 */

const crypto = require("crypto");
const IdempotencyKey = require("../../../models/IdempotencyKeyModel");

const sha256 = (value) =>
  crypto
    .createHash("sha256")
    .update(typeof value === "string" ? value : JSON.stringify(value || {}))
    .digest("hex");

const POLL_INTERVAL_MS = 200;
const POLL_TIMEOUT_MS = 10_000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class IdempotencyConflictError extends Error {
  constructor(message = "Idempotency-Key reused with a different body") {
    super(message);
    this.name = "IdempotencyConflictError";
    this.code = "IDEMPOTENCY_CONFLICT";
    this.statusCode = 409;
  }
}

class IdempotencyPendingTimeoutError extends Error {
  constructor(message = "Idempotency-Key still pending after timeout") {
    super(message);
    this.name = "IdempotencyPendingTimeoutError";
    this.code = "IDEMPOTENCY_PENDING_TIMEOUT";
    this.statusCode = 409;
  }
}

/**
 * Run `fn` exactly once for the lifetime of `{ userId, scope, key }`.
 *
 * @template T
 * @param {string} key
 * @param {() => Promise<T>} fn
 * @param {Object} opts
 * @param {string} opts.scope             REQUIRED. Partition label.
 * @param {string} opts.requestHash       REQUIRED. Stable digest of payload.
 * @param {import('mongoose').Types.ObjectId|string|null} [opts.userId]
 * @returns {Promise<T>}
 */
async function withIdempotency(key, fn, opts = {}) {
  if (!key) throw new Error("withIdempotency: key is required");
  if (!opts.scope) throw new Error("withIdempotency: opts.scope is required");
  if (!opts.requestHash) {
    throw new Error(
      "withIdempotency: opts.requestHash is required (no implicit empty default — would defeat conflict detection)"
    );
  }

  const userId = opts.userId || null;
  const scope = opts.scope;
  const requestHash = opts.requestHash;

  // Step 1 — atomically reserve a `pending` row OR get the existing one.
  // We use findOneAndUpdate with upsert and `$setOnInsert`: when no row
  // exists Mongo inserts ours, when one exists we get it back unchanged.
  const filter = { userId, scope, key };
  const reservation = await IdempotencyKey.findOneAndUpdate(
    filter,
    {
      $setOnInsert: {
        userId,
        scope,
        key,
        requestHash,
        status: "pending",
        createdAt: new Date(),
      },
    },
    { upsert: true, new: false, setDefaultsOnInsert: true, rawResult: true }
  );

  const updatedExisting = reservation?.lastErrorObject?.updatedExisting === true;
  const existing = reservation?.value || null;

  if (updatedExisting && existing) {
    // Existing row — handle by status.
    if (existing.requestHash && existing.requestHash !== requestHash) {
      throw new IdempotencyConflictError();
    }
    if (existing.status === "completed") {
      return existing.response?.body;
    }
    if (existing.status === "failed") {
      // Stale failure row — sweep it and retry by re-entering this function.
      await IdempotencyKey.deleteOne({ _id: existing._id, status: "failed" });
      return withIdempotency(key, fn, opts);
    }
    // status === 'pending' → poll.
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    while (Date.now() < deadline) {
      await sleep(POLL_INTERVAL_MS);
      const refreshed = await IdempotencyKey.findOne(filter);
      if (!refreshed) break; // peer failed and deleted; retry.
      if (refreshed.status === "completed") return refreshed.response?.body;
      if (refreshed.status === "failed") {
        await IdempotencyKey.deleteOne({ _id: refreshed._id, status: "failed" });
        return withIdempotency(key, fn, opts);
      }
    }
    throw new IdempotencyPendingTimeoutError();
  }

  // Step 2 — we inserted; we own this key. Run fn.
  let result;
  try {
    result = await fn();
  } catch (err) {
    // Delete the pending row so a fresh retry can proceed.
    await IdempotencyKey.deleteOne({ userId, scope, key, status: "pending" }).catch(() => {});
    throw err;
  }

  // Step 3 — persist the cached response.
  await IdempotencyKey.updateOne(
    { userId, scope, key },
    {
      $set: {
        status: "completed",
        response: { status: 200, body: result },
        completedAt: new Date(),
      },
    }
  ).catch((err) => {
    // Cache write is best-effort; the work already happened.
    // eslint-disable-next-line no-console
    console.error("[withIdempotency] failed to persist completed cache:", err.message);
  });

  return result;
}

module.exports = {
  withIdempotency,
  _sha256: sha256,
  sha256,
  IdempotencyConflictError,
  IdempotencyPendingTimeoutError,
};
