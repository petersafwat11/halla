/**
 * EventEntitlement (SHIP §9.4)
 *
 * Idempotent LEDGER for a ONE-TIME single-event package bought as a store
 * CONSUMABLE (or via web). ACCESS + consume semantics use the existing per-event
 * Subscription flow (`subscriptionId` below): the mature
 * `subscriptionEventAccess` / `canCreateEvent` / `firstSendAt` machinery already
 * grants exactly one event and marks it used on the first successful send, so we
 * reuse it rather than reinventing access. This row exists to:
 *  - dedupe store deliveries (unique `providerTransactionId`) + support restore;
 *  - drive the second-purchase guard (block buying another event package while
 *    the linked per-event subscription is still unconsumed);
 *  - record refunds (refund before use → `refunded`).
 */

const mongoose = require("mongoose");

const eventEntitlementSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    planCode: { type: String, required: true },
    planId: { type: mongoose.Schema.Types.ObjectId, ref: "Plan" },
    // The per-event Subscription that actually grants + consumes the event
    // (existing access flow). The ledger row tracks the store purchase that
    // created it.
    subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: "Subscription" },

    source: {
      type: String,
      enum: ["revenuecat", "appstore", "playstore", "moyasar"],
      required: true,
    },
    // Store transaction id — unique so duplicate webhook/restore can't double-grant.
    providerTransactionId: { type: String, unique: true, sparse: true },
    originalTransactionId: { type: String, index: true },
    store: { type: String },
    environment: { type: String, enum: ["SANDBOX", "PRODUCTION"] },

    invitePool: { type: Number, default: 0 }, // allowance this event package grants

    status: {
      type: String,
      enum: ["unused", "consumed", "refunded"],
      default: "unused",
      index: true,
    },
    // Deterministic routing for a legitimately-delivered transaction whose
    // eligibility changed during the store-sheet race (§7). A row is ALWAYS
    // recorded; `resolution` says what must happen to it:
    //   fulfilled       — normal: a usable per-event subscription was created.
    //   manual_review   — delivered while a recurring/pool plan is active (no
    //                     per-event sub created; ops decide credit/refund).
    //   credited        — reconciled as a ledger credit.
    //   refund_required — must be refunded (store-forced or ineligible).
    resolution: {
      type: String,
      enum: ["fulfilled", "manual_review", "credited", "refund_required", "none"],
      default: "none",
      index: true,
    },
    consumedEventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event" },
    consumedAt: { type: Date },
    refundedAt: { type: Date },
    refundReason: { type: String },

    // Catalog provenance (§1).
    catalogVersion: { type: String, default: null },
    catalogHash: { type: String, default: null },
    revenueCatEventId: { type: String, default: null },

    purchasedAt: { type: Date, default: Date.now },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

// Fast "does this user have an unused event entitlement?" guard lookups.
eventEntitlementSchema.index({ userId: 1, status: 1 });

/**
 * True when the user already holds a USABLE unused event entitlement (block the
 * 2nd buy). A `manual_review`/`credited`/`refund_required` row is NOT usable and
 * must never block a legitimate future purchase (fixes the P0-03 dead-grant).
 */
eventEntitlementSchema.statics.hasUnused = function (userId) {
  return this.exists({
    userId,
    status: "unused",
    resolution: { $in: ["fulfilled", "none"] },
    subscriptionId: { $ne: null },
  });
};

module.exports =
  mongoose.models.EventEntitlement ||
  mongoose.model("EventEntitlement", eventEntitlementSchema);
