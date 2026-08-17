/**
 * ProcessorErasure (DEL-02 · LEGAL §7 "downstream processor erasure/tombstone").
 *
 * A durable, append-only erasure request/tombstone for each third-party data
 * PROCESSOR that holds data about a deleted account and that Halaa cannot (or
 * does not automatically) erase in-band via an API at deletion time.
 *
 * Why a record and not a live API call: for some processors (Sentry, the SMS/
 * email/WhatsApp providers) there is no wired server-side erasure API in this
 * codebase, and RevenueCat purchases stay with the original App User ID by
 * signed owner decision DEC-04 ("Keep with original App User ID" — no
 * cross-account transfer, no proactive customer wipe). The deletion pipeline
 * therefore records a per-processor erasure obligation with a deterministic
 * status so ops/legal can (a) prove the obligation exists and (b) action or
 * reconcile it, rather than the request silently claiming everything downstream
 * is gone. NEVER stores restored PII — only the processor name, the pseudonymous
 * external reference (e.g. billingUserId / appUserId), a reason, and status.
 *
 * status:
 *   pending    — obligation recorded, not yet actioned
 *   requested  — an erasure request was submitted to the processor
 *   acknowledged — processor acknowledged / completed
 *   not_applicable — nothing to erase (e.g. account never used the processor)
 *   retained_by_policy — intentionally retained (e.g. RevenueCat purchase kept
 *                        with the original App User ID per DEC-04)
 *   failed     — an attempt failed (retryable)
 */

const mongoose = require("mongoose");

const processorErasureSchema = new mongoose.Schema(
  {
    // Links back to the deletion request (not the deleted user's PII).
    deletionRequestId: { type: String, required: true, index: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    processor: {
      type: String,
      required: true,
      enum: ["revenuecat", "sentry", "taqnyat", "email", "sms", "push"],
      index: true,
    },
    // Pseudonymous external reference only (billingUserId / appUserId / hashed
    // id). NEVER a phone/email/name.
    externalRef: { type: String, default: null },
    status: {
      type: String,
      enum: [
        "pending",
        "requested",
        "acknowledged",
        "not_applicable",
        "retained_by_policy",
        "failed",
      ],
      default: "pending",
      index: true,
    },
    reason: { type: String, default: null }, // sanitized — no PII
    attempts: { type: Number, default: 0 },
    lastError: { type: String, default: null }, // sanitized message only
    requestedAt: { type: Date, default: Date.now },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// One obligation per (deletion request, processor).
processorErasureSchema.index(
  { deletionRequestId: 1, processor: 1 },
  { unique: true }
);

module.exports =
  mongoose.models.ProcessorErasure ||
  mongoose.model("ProcessorErasure", processorErasureSchema);
