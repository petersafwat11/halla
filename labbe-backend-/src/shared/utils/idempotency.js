/**
 * Idempotency helpers.
 *
 * `withIdempotency(key, fn)` — guard a non-HTTP code path (cron, webhook
 * worker) against double execution. The first caller runs `fn`, the result
 * is cached, every later caller returns the cached value.
 *
 * The HTTP-side middleware lives in `src/shared/middleware/idempotency.js`
 * and uses the same model.
 */

const crypto = require("crypto");
const IdempotencyKey = require("../../../models/IdempotencyKeyModel");

const sha256 = (value) =>
  crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value || {})).digest("hex");

/**
 * Run `fn` exactly once for the lifetime of `key`. The return value is
 * cached so duplicate calls receive the same payload. If `fn` throws, the
 * key is **not** persisted — the next caller can retry.
 *
 * @template T
 * @param {string} key
 * @param {() => Promise<T>} fn
 * @param {Object} [opts]
 * @param {string} [opts.scope]
 * @returns {Promise<T>}
 */
async function withIdempotency(key, fn, opts = {}) {
  if (!key) throw new Error("withIdempotency: key is required");

  const existing = await IdempotencyKey.findOne({ key });
  if (existing) {
    return existing.response.body;
  }

  const result = await fn();

  // Best-effort persist. If two workers race here, the unique index on `key`
  // makes the second insert fail — the loser refetches and returns the
  // already-cached value.
  try {
    await IdempotencyKey.create({
      key,
      scope: opts.scope || "",
      requestHash: sha256(opts.requestHash || ""),
      response: { status: 200, body: result },
      userId: opts.userId || null,
    });
  } catch (err) {
    if (err.code === 11000) {
      const winner = await IdempotencyKey.findOne({ key });
      return winner ? winner.response.body : result;
    }
    throw err;
  }

  return result;
}

module.exports = {
  withIdempotency,
  _sha256: sha256,
};
