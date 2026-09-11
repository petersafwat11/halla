/**
 * PaymentLink Model — durable admin-generated payment request.
 *
 * A PaymentLink is a fixed-amount SAR request fulfilled on Moyasar's hosted
 * invoice page. It is NOT a subscription/addon checkout: actual money movement
 * is recorded on Payment rows (purpose='admin_payment_link') linked via
 * `paymentLinkId`. The link row is the durable request + reconciliation state.
 *
 * Creation states: creating → ready | creation_failed | creation_unknown
 * Lifecycle (derived badge): awaiting_payment | processing | paid |
 *   expired | canceled | partially_refunded | refunded | needs_review | unavailable
 *
 * Money is stored in minor units (halalas) as positive safe integers.
 * No TTL deletion — financial requests are retained.
 */

const mongoose = require("mongoose");

const CREATION_STATE = Object.freeze({
  CREATING: "creating",
  READY: "ready",
  CREATION_UNKNOWN: "creation_unknown",
  CREATION_FAILED: "creation_failed",
});

const LINK_STATUS = Object.freeze({
  AWAITING_PAYMENT: "awaiting_payment",
  PROCESSING: "processing",
  PAID: "paid",
  EXPIRED: "expired",
  CANCELED: "canceled",
  PARTIALLY_REFUNDED: "partially_refunded",
  REFUNDED: "refunded",
  NEEDS_REVIEW: "needs_review",
  UNAVAILABLE: "unavailable",
});

const paymentLinkSchema = new mongoose.Schema(
  {
    reference: { type: String, required: true, unique: true, index: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
    },
    creatorSnapshot: {
      name: { type: String, default: null },
      email: { type: String, default: null },
      role: { type: String, default: null },
    },
    amountHalalas: {
      type: Number,
      required: true,
      min: 100,
      validate: {
        validator: (v) => Number.isSafeInteger(v) && v > 0,
        message: "amountHalalas must be a positive safe integer",
      },
      immutable: true,
    },
    currency: { type: String, enum: ["SAR"], default: "SAR", immutable: true },
    description: { type: String, default: "", maxlength: 200, immutable: true },
    clientLabel: { type: String, default: null, maxlength: 100 },
    locale: { type: String, enum: ["ar", "en"], default: "ar" },

    creationState: {
      type: String,
      enum: Object.values(CREATION_STATE),
      default: CREATION_STATE.CREATING,
      index: true,
    },
    invoiceStatus: { type: String, default: null },
    status: {
      type: String,
      enum: Object.values(LINK_STATUS),
      default: LINK_STATUS.AWAITING_PAYMENT,
      index: true,
    },
    providerInvoiceId: { type: String, default: null },
    hostedUrl: { type: String, default: null },
    environment: { type: String, enum: ["test", "live"], default: "test" },
    provider: { type: String, default: "moyasar", immutable: true },

    expiresAt: { type: Date, required: true },
    paidAt: { type: Date, default: null },
    canceledAt: { type: Date, default: null },
    financialActivityAt: { type: Date, default: null },

    collectedHalalas: { type: Number, default: 0 },
    refundedHalalas: { type: Number, default: 0 },
    linkedPaymentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Payment" }],

    creationKey: { type: String, default: null },
    requestHash: { type: String, default: null },
    reconcileVersion: { type: Number, default: 0 },
    lastSyncedAt: { type: Date, default: null },
    nextReconcileAt: { type: Date, default: null },
    leaseToken: { type: String, default: null, select: false },
    leaseUntil: { type: Date, default: null },
    wakeVersion: { type: Number, default: 0 },
    lastRefreshRequestedAt: { type: Date, default: null },
    reconcileAttempts: { type: Number, default: 0 },
    syncError: { type: String, default: null },
    cancelPending: { type: Boolean, default: false },
    lastFailureSummary: { type: String, default: null },
    rawSnapshot: { type: mongoose.Schema.Types.Mixed, default: null, select: false },
  },
  { timestamps: true }
);

paymentLinkSchema.index(
  { providerInvoiceId: 1, environment: 1 },
  {
    unique: true,
    partialFilterExpression: { providerInvoiceId: { $type: "string" } },
    name: "paymentlink_provider_invoice_env",
  }
);
paymentLinkSchema.index(
  { createdBy: 1, creationKey: 1 },
  {
    unique: true,
    partialFilterExpression: { creationKey: { $type: "string" } },
    name: "paymentlink_creator_key",
  }
);
paymentLinkSchema.index({ createdAt: -1, _id: -1 });
paymentLinkSchema.index({ status: 1, createdAt: -1 });
paymentLinkSchema.index({ createdBy: 1, createdAt: -1 });
paymentLinkSchema.index({ nextReconcileAt: 1 }, { name: "paymentlink_next_reconcile" });
paymentLinkSchema.index({ status: 1, financialActivityAt: 1 });

paymentLinkSchema.statics.CREATION_STATE = CREATION_STATE;
paymentLinkSchema.statics.LINK_STATUS = LINK_STATUS;

paymentLinkSchema.methods.amountSar = function () {
  return (this.amountHalalas || 0) / 100;
};

const PaymentLink =
  mongoose.models.PaymentLink || mongoose.model("PaymentLink", paymentLinkSchema);
module.exports = PaymentLink;
module.exports.CREATION_STATE = CREATION_STATE;
module.exports.LINK_STATUS = LINK_STATUS;
