/**
 * AccountDeletionRequest (SHIP §4.1)
 *
 * Append-only record of a self-service account-deletion request. Gives the user
 * a durable request ID + status (used by the in-app flow and the public
 * /delete-account page, which polls by the unguessable `requestId` since the
 * session is gone after deletion). Stores step outcomes and the retention
 * disclosure snapshot — NEVER any deleted PII.
 */

const mongoose = require("mongoose");
const crypto = require("crypto");

const stepSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    status: { type: String, enum: ["ok", "failed", "skipped"], default: "ok" },
    mandatory: { type: Boolean, default: false },
    error: String, // sanitized message only — no PII
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const accountDeletionRequestSchema = new mongoose.Schema(
  {
    requestId: {
      type: String,
      required: true,
      unique: true,
      default: () => crypto.randomUUID(),
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    channel: {
      type: String,
      enum: ["app", "web", "support"],
      default: "app",
    },
    status: {
      type: String,
      // `pending_retry` (DEL-02): the account is CLOSED (user anonymized +
      // sessions revoked) but a non-blocking cleanup step (S3 objects /
      // downstream processor erasure) has not yet fully succeeded. The retry
      // worker re-runs until clean, then flips to `completed`. A request must
      // NEVER report `completed` while personal S3 objects remain (P1-02).
      enum: ["processing", "completed", "partial", "pending_retry", "failed"],
      default: "processing",
      index: true,
    },
    steps: [stepSchema],
    // Snapshot of the retention matrix shown to the user at request time.
    retainedDisclosure: { type: mongoose.Schema.Types.Mixed },
    // Pseudonymous billing id, retained so a post-deletion RevenueCat webhook
    // (a trailing EXPIRATION/CANCELLATION for the now-deleted user) can be
    // classified deterministically as `account_deleted` instead of an
    // unknown-user permanent dead-letter (LEGAL §7). NOT PII.
    billingUserId: { type: String, default: null, index: true },
    // Outstanding S3 object keys still to delete (for the retry worker). Bare
    // keys only — never full URLs or PII. Cleared as they are deleted.
    pendingS3Keys: { type: [String], default: [] },
    // Retry bookkeeping for the durable cleanup worker.
    retryCount: { type: Number, default: 0 },
    lastRetryAt: { type: Date, default: null },
    nextRetryAt: { type: Date, default: null, index: true },
    requestedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.AccountDeletionRequest ||
  mongoose.model("AccountDeletionRequest", accountDeletionRequestSchema);
