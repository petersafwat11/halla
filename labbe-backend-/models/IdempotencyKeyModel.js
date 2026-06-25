/**
 * IdempotencyKey Model
 *
 * Stores the result of a successful state-mutating
 * request keyed by an `Idempotency-Key` header. A duplicate request that
 * presents the same key replays the cached response instead of running the
 * handler again, guaranteeing at-most-once semantics for external side
 * effects (charge, SMS send, RSVP submission).
 *
 * Uniqueness contract:
 *   The combination `{ userId, scope, key }` is unique — NOT `key` alone.
 *   Two different users may legitimately submit the same client-supplied
 *   Idempotency-Key value; partitioning by userId+scope prevents
 *   cross-user replay/leakage and 409 false positives. `userId` may be
 *   null for unauthenticated flows; in that case the partitioning is by
 *   `{ scope, key }` (with `userId` literally null).
 *
 * Status state machine:
 *   - `pending`   : a row was inserted up-front by the first caller; the
 *                    handler is still running. Concurrent callers with the
 *                    same `requestHash` poll until the row transitions.
 *   - `completed` : handler returned 2xx; `response` is populated and
 *                    duplicate callers replay it.
 *   - `failed`    : handler threw; this row should be deleted promptly so
 *                    the next attempt can retry. Its presence is a
 *                    transient artifact, not a permanent decision.
 *
 * - `key`         : caller-provided string.
 * - `scope`       : route / call-site label (`addons.purchase`,
 *                    `payment.charge`, etc.). Required for partitioning.
 * - `requestHash` : sha256 of the canonical request body. If the same key
 *                    is reused with a different body we treat it as a
 *                    conflict.
 * - `response`    : { status, body } cached for replay. Only populated
 *                    after `completed`. Note: only `{ status, body }` is
 *                    stored — replay loses Set-Cookie / Location headers.
 * - `createdAt`   : TTL index — 24h. External calls that haven't repeated
 *                    in 24 hours are no longer expected to replay; if they
 *                    do the handler runs fresh.
 */

const mongoose = require("mongoose");

const idempotencyKeySchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    scope: { type: String, default: "" }, // e.g. route name; partitioning + debugging
    requestHash: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
      index: true,
    },
    response: {
      status: { type: Number },
      body: { type: mongoose.Schema.Types.Mixed },
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    createdAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
  },
  { timestamps: false }
);

// Compound unique index — partition the keyspace per-user-per-scope.
idempotencyKeySchema.index({ userId: 1, scope: 1, key: 1 }, { unique: true });

idempotencyKeySchema.index({ createdAt: 1 }, { expireAfterSeconds: 24 * 60 * 60 });

const IdempotencyKey = mongoose.model("IdempotencyKey", idempotencyKeySchema);
module.exports = IdempotencyKey;
