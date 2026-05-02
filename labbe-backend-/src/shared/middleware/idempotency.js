/**
 * Idempotency middleware.
 *
 * Reads the `Idempotency-Key` header on POST/PUT/PATCH requests. If the key
 * has already produced a response in the last 24h (and the request body
 * hashes to the same value), the cached response is replayed and the
 * handler does not run. If the key is reused with a different body we
 * return 409 — the caller is mixing requests under one key.
 *
 * Usage:
 *   router.post("/purchase", protect, idempotency({ scope: "addons.purchase" }), addonsController.purchaseAddon);
 *
 * The middleware caches successful responses (2xx). Errors are NOT cached —
 * the next retry runs through the handler again. This matches the standard
 * Stripe-style semantics.
 */

const IdempotencyKey = require("../../../models/IdempotencyKeyModel");
const { _sha256 } = require("../utils/idempotency");

const HEADER = "idempotency-key";

const idempotency = ({ scope = "", required = false } = {}) => {
  return async function idempotencyMiddleware(req, res, next) {
    if (!["POST", "PUT", "PATCH"].includes(req.method)) {
      return next();
    }

    const key = req.get(HEADER);
    if (!key) {
      if (required) {
        return res
          .status(400)
          .json({ status: "error", message: "Idempotency-Key header is required" });
      }
      return next();
    }

    const requestHash = _sha256(req.body || {});

    const existing = await IdempotencyKey.findOne({ key });
    if (existing) {
      if (existing.requestHash && existing.requestHash !== requestHash) {
        return res
          .status(409)
          .json({ status: "error", message: "Idempotency-Key reused with a different body" });
      }
      return res.status(existing.response.status).json(existing.response.body);
    }

    // Capture the response payload to cache after the handler resolves.
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      // Only cache successful responses; failures must be safely retryable.
      if (res.statusCode >= 200 && res.statusCode < 300) {
        IdempotencyKey.create({
          key,
          scope,
          requestHash,
          response: { status: res.statusCode, body },
          userId: req.user?._id || null,
        }).catch((err) => {
          if (err.code !== 11000) {
            // duplicate-key from a parallel request is fine; otherwise log.
            // Don't fail the response — caching is best-effort.
            // eslint-disable-next-line no-console
            console.error("[idempotency] cache write failed:", err.message);
          }
        });
      }
      return originalJson(body);
    };

    next();
  };
};

module.exports = { idempotency };
