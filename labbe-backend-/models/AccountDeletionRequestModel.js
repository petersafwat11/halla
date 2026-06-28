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
      enum: ["processing", "completed", "partial", "failed"],
      default: "processing",
      index: true,
    },
    steps: [stepSchema],
    // Snapshot of the retention matrix shown to the user at request time.
    retainedDisclosure: { type: mongoose.Schema.Types.Mixed },
    requestedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.AccountDeletionRequest ||
  mongoose.model("AccountDeletionRequest", accountDeletionRequestSchema);
