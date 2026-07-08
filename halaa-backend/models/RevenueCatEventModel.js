/**
 * RevenueCatEvent (SHIP §9.2 · BILL-01/02).
 *
 * Durable, idempotent record of every AUTHENTICATED RevenueCat webhook event —
 * including ones we reject. The unique `eventId` is the dedupe key. Processing
 * is guarded by an atomic lease (`processing` + `leaseOwner` + `leaseUntil`) so
 * a simultaneous retry can never run a grant twice; a crashed holder's stuck
 * lease is reclaimed after `leaseUntil` (mirrors the cronLease idiom).
 *
 * The payload is stored REDACTED (no receipts/tokens/subscriber PII); every
 * field the processor + replay need is lifted into explicit typed columns at
 * ingest, so processing/replay read the columns, never the blob. Each record is
 * stamped with the catalog version/hash it was resolved against.
 */

const mongoose = require("mongoose");

const resolutionSchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    action: { type: String }, // reducer action / admin action
    status: { type: String }, // resulting status
    reason: { type: String },
    actor: { type: String }, // "system" | staff user id
    note: { type: String },
  },
  { _id: false }
);

const revenueCatEventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    type: { type: String, required: true },
    apiVersion: { type: String },

    // ── identity / routing (typed columns lifted at ingest) ──────────────────
    appUserId: { type: String, index: true },
    originalAppUserId: { type: String },
    aliases: [{ type: String }],
    appId: { type: String },
    productId: { type: String },
    store: { type: String }, // APP_STORE | PLAY_STORE | ...
    environment: { type: String, enum: ["SANDBOX", "PRODUCTION", null], index: true },

    // ── transaction lineage (§2.6) ───────────────────────────────────────────
    transactionId: { type: String, index: true },
    originalTransactionId: { type: String, index: true },
    cancelReason: { type: String },
    entitlementIds: [{ type: String }],
    // money — purchased currency is authoritative; USD kept separate (P0-05).
    priceInPurchasedCurrency: { type: Number, default: null },
    currency: { type: String, default: null },
    priceUsd: { type: Number, default: null },

    // ── provider + payload timestamps / schema (§2.2) ────────────────────────
    eventTimestampMs: { type: Number, default: null }, // provider event time
    purchasedAtMs: { type: Number, default: null },
    expirationAtMs: { type: Number, default: null },
    payloadSchemaVersion: { type: String, default: null },
    payloadHash: { type: String, default: null },

    // ── catalog provenance (§1) ──────────────────────────────────────────────
    catalogCode: { type: String, default: null }, // resolved internal code
    catalogVersion: { type: String, default: null },
    catalogHash: { type: String, default: null },

    // ── processing lifecycle ─────────────────────────────────────────────────
    status: {
      type: String,
      enum: ["received", "processing", "processed", "ignored", "dead_letter", "manual_review", "resolved"],
      default: "received",
      index: true,
    },
    reason: { type: String }, // why ignored / dead-lettered / action taken
    error: { type: String },

    // Atomic claim / lease (replay + concurrency safety).
    processing: { type: Boolean, default: false },
    leaseOwner: { type: String, default: null },
    leaseUntil: { type: Date, default: null },
    attemptCount: { type: Number, default: 0 },
    lastAttemptAt: { type: Date, default: null },

    // Resolution audit trail + staff replay metadata.
    resolutionHistory: { type: [resolutionSchema], default: [] },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    resolvedAt: { type: Date, default: null },

    // ── resolved links (filled during processing) ────────────────────────────
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: "Subscription" },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: "Payment" },
    eventEntitlementId: { type: mongoose.Schema.Types.ObjectId, ref: "EventEntitlement" },
    addonId: { type: mongoose.Schema.Types.ObjectId, ref: "Addon" },

    // Redacted, audit-only. Processing/replay read the typed columns above.
    rawPayload: { type: mongoose.Schema.Types.Mixed },
    processedAt: { type: Date },
  },
  { timestamps: true }
);

revenueCatEventSchema.index({ status: 1, createdAt: -1 });
// Reclaim sweep: find stuck `processing` leases past their deadline.
revenueCatEventSchema.index({ processing: 1, leaseUntil: 1 });

module.exports =
  mongoose.models.RevenueCatEvent ||
  mongoose.model("RevenueCatEvent", revenueCatEventSchema);
