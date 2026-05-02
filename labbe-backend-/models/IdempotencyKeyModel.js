/**
 * IdempotencyKey Model
 *
 * Phase 1b foundation. Stores the result of a successful state-mutating
 * request keyed by an `Idempotency-Key` header. A duplicate request that
 * presents the same key replays the cached response instead of running the
 * handler again, guaranteeing at-most-once semantics for external side
 * effects (charge, SMS send, RSVP submission).
 *
 * - `key`         : caller-provided string (required to be unique per route).
 * - `requestHash` : sha256 of the canonical request body. If the same key is
 *                   reused with a different body we treat it as a conflict.
 * - `response`    : { status, body } cached for replay.
 * - `createdAt`   : TTL index — 24h. External calls that haven't repeated in
 *                   24 hours are no longer expected to replay; if they do
 *                   the handler runs fresh.
 */

const mongoose = require("mongoose");

const idempotencyKeySchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    scope: { type: String, default: "" }, // e.g. route name; useful for debugging only
    requestHash: { type: String, required: true },
    response: {
      status: { type: Number, required: true },
      body: { type: mongoose.Schema.Types.Mixed },
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

idempotencyKeySchema.index({ createdAt: 1 }, { expireAfterSeconds: 24 * 60 * 60 });

const IdempotencyKey = mongoose.model("IdempotencyKey", idempotencyKeySchema);
module.exports = IdempotencyKey;
