/**
 * RevenueCatEvent (SHIP §9.2)
 *
 * Durable, idempotent record of every RevenueCat webhook event. The unique
 * `eventId` is the dedupe key: a retried delivery hits the unique index and is
 * acknowledged (2xx) WITHOUT reprocessing. Unknown user/product or invalid
 * mapping is parked in `dead_letter` (never silently dropped) for alerting +
 * manual replay. Stores the raw payload for audit/replay — no extra PII beyond
 * what RevenueCat sends.
 */

const mongoose = require("mongoose");

const revenueCatEventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    type: { type: String, required: true },
    appUserId: { type: String, index: true },
    aliases: [{ type: String }],
    productId: { type: String },
    store: { type: String }, // APP_STORE | PLAY_STORE | ...
    environment: { type: String, enum: ["SANDBOX", "PRODUCTION"], index: true },
    apiVersion: { type: String },

    status: {
      type: String,
      enum: ["received", "processed", "dead_letter", "ignored"],
      default: "received",
      index: true,
    },
    reason: { type: String }, // why ignored / dead-lettered
    error: { type: String },

    // Resolved links (filled during processing).
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: "Subscription" },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: "Payment" },
    eventEntitlementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EventEntitlement",
    },
    addonId: { type: mongoose.Schema.Types.ObjectId, ref: "Addon" },

    rawPayload: { type: mongoose.Schema.Types.Mixed },
    processedAt: { type: Date },
  },
  { timestamps: true }
);

revenueCatEventSchema.index({ status: 1, createdAt: -1 });

module.exports =
  mongoose.models.RevenueCatEvent ||
  mongoose.model("RevenueCatEvent", revenueCatEventSchema);
