/**
 * Payment Model
 *
 * Tracks an individual payment transaction independently of the
 * subscription/addon it activated. A subscription owns 0..N payments
 * over its lifetime (initial + renewals + upgrades + addons). A
 * payment row is the single source of truth for refund amount,
 * capture state, 3DS status, and the Moyasar IDs.
 *
 * STATUS LIFECYCLE
 *   pending      → before/while Moyasar is processing (rarely seen
 *                   externally; we usually have an immediate
 *                   `pending_3ds`, `paid`, or `failed`)
 *   pending_3ds  → Moyasar returned `initiated`; user must complete
 *                   the redirect challenge at `redirectUrl`. Also
 *                   covers STC Pay's OTP-collection redirect.
 *   authorized   → manual:true charges before capture
 *   paid         → terminal success
 *   captured     → captured an authorized payment (subset of paid)
 *   failed       → terminal failure
 *   refunded     → terminal; full refund issued
 *   partially_refunded → at least one refund < amount issued
 *   voided       → authorized payment voided (no funds moved)
 *
 * REFUND ACCOUNTING
 *   refundedAmount accumulates partials. `refunded` status is set
 *   when refundedAmount >= amount; `partially_refunded` otherwise.
 *
 * UNIQUENESS
 *   moyasarPaymentId is unique (sparse, because dev/stub IDs are
 *   `stub-...` strings and we want to catch duplicate inserts). It
 *   is the join key with Moyasar webhooks.
 */

const mongoose = require("mongoose");

const PAYMENT_STATUS = Object.freeze({
  PENDING: "pending",
  PENDING_3DS: "pending_3ds",
  AUTHORIZED: "authorized",
  PAID: "paid",
  CAPTURED: "captured",
  FAILED: "failed",
  REFUNDED: "refunded",
  PARTIALLY_REFUNDED: "partially_refunded",
  VOIDED: "voided",
});

const paymentMethodSchema = new mongoose.Schema(
  {
    type: { type: String }, // creditcard | applepay | samsungpay | stcpay | token
    company: { type: String }, // visa | mada | master | amex
    last4: { type: String },
    bin: { type: String }, // first 6 digits, masked
    expiryMonth: { type: Number },
    expiryYear: { type: Number },
    issuerName: { type: String },
    issuerCountry: { type: String },
  },
  { _id: false }
);

const paymentSchema = new mongoose.Schema(
  {
    // ─── OWNER & SCOPE ───
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    whitelabelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    // ─── ACTIVATION TARGETS (sparse) ───
    // A payment may activate either a subscription, an addon, or both
    // (e.g. a checkout that bundles plan + extra invites). We keep
    // both refs sparse and indexed so reverse-lookups are O(1).
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      default: null,
      index: true,
      sparse: true,
    },
    addonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Addon",
      default: null,
      index: true,
      sparse: true,
    },

    // ─── MONEY ───
    amount: { type: Number, required: true }, // SAR major units
    currency: { type: String, default: "SAR" },
    refundedAmount: { type: Number, default: 0 }, // SAR major units
    capturedAmount: { type: Number, default: 0 }, // SAR major units
    fee: { type: Number, default: 0 }, // estimated by Moyasar, halalas

    // ─── STATUS ───
    status: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
      index: true,
    },
    providerStatus: { type: String }, // raw Moyasar status

    // ─── PROVIDER IDS ───
    provider: { type: String, default: "moyasar" }, // moyasar | stub
    moyasarPaymentId: { type: String, default: null }, // POST /v1/payments → id
    moyasarInvoiceId: { type: String, default: null }, // if paid via invoice
    givenId: { type: String, default: null }, // UUID v4 we sent for idempotency

    // ─── PAYMENT METHOD ───
    paymentMethod: {
      type: paymentMethodSchema,
      default: () => ({}),
    },

    // ─── 3DS / REDIRECT ───
    redirectUrl: { type: String, default: null }, // source.transaction_url
    callbackUrl: { type: String, default: null },

    // ─── CONTEXT ───
    description: { type: String },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },

    // ─── TIMESTAMPS ───
    initiatedAt: { type: Date, default: Date.now },
    authorizedAt: { type: Date, default: null },
    paidAt: { type: Date, default: null },
    capturedAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },
    refundedAt: { type: Date, default: null },
    voidedAt: { type: Date, default: null },

    // ─── REFUND TRAIL ───
    refunds: [
      new mongoose.Schema(
        {
          amount: { type: Number, required: true },
          reason: { type: String },
          createdAt: { type: Date, default: Date.now },
          createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          moyasarRefundResponseStatus: { type: String },
        },
        { _id: true }
      ),
    ],
  },
  { timestamps: true }
);

paymentSchema.index({ moyasarPaymentId: 1 }, { unique: true, sparse: true });
paymentSchema.index({ userId: 1, status: 1, createdAt: -1 });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ whitelabelId: 1, status: 1, createdAt: -1 });
paymentSchema.index(
  { status: 1, initiatedAt: 1 },
  { partialFilterExpression: { status: { $in: ["pending", "pending_3ds"] } } }
);

paymentSchema.statics.STATUS = PAYMENT_STATUS;
paymentSchema.statics.PAYMENT_STATUS = PAYMENT_STATUS;

paymentSchema.statics.findByMoyasarId = function (moyasarPaymentId) {
  if (!moyasarPaymentId) return null;
  return this.findOne({ moyasarPaymentId });
};

paymentSchema.methods.applyMoyasarSnapshot = function (snapshot = {}) {
  // snapshot is the body of GET /v1/payments/:id or a webhook `data` field.
  const status = snapshot.status;
  this.providerStatus = status;
  if (typeof snapshot.fee === "number") this.fee = snapshot.fee;
  if (typeof snapshot.refunded === "number") this.refundedAmount = snapshot.refunded / 100;
  if (typeof snapshot.captured === "number") this.capturedAmount = snapshot.captured / 100;

  const src = snapshot.source || {};
  if (!this.paymentMethod) this.paymentMethod = {};
  if (src.type) this.paymentMethod.type = src.type;
  if (src.company) this.paymentMethod.company = src.company;
  if (typeof src.number === "string" && src.number.length >= 4) {
    this.paymentMethod.last4 = src.number.slice(-4);
    this.paymentMethod.bin = src.number.slice(0, 6);
  }
  if (src.issuer_name) this.paymentMethod.issuerName = src.issuer_name;
  if (src.issuer_country) this.paymentMethod.issuerCountry = src.issuer_country;
  if (typeof src.month === "number") this.paymentMethod.expiryMonth = src.month;
  if (typeof src.year === "number") this.paymentMethod.expiryYear = src.year;
  if (src.transaction_url) this.redirectUrl = src.transaction_url;

  const map = {
    initiated: PAYMENT_STATUS.PENDING_3DS,
    paid: PAYMENT_STATUS.PAID,
    authorized: PAYMENT_STATUS.AUTHORIZED,
    captured: PAYMENT_STATUS.CAPTURED,
    failed: PAYMENT_STATUS.FAILED,
    refunded: PAYMENT_STATUS.REFUNDED,
    voided: PAYMENT_STATUS.VOIDED,
    verified: PAYMENT_STATUS.PAID,
  };
  const internal = map[status];
  if (internal) {
    // §15.4: Partial-refund detection. Moyasar reports partial refunds
    // with status: 'paid'/'captured' and a non-zero `refunded` field;
    // only flips to status: 'refunded' on a full refund. Detect both.
    if (
      (internal === PAYMENT_STATUS.PAID || internal === PAYMENT_STATUS.CAPTURED) &&
      this.refundedAmount > 0 &&
      this.refundedAmount < this.amount
    ) {
      this.status = PAYMENT_STATUS.PARTIALLY_REFUNDED;
    } else if (
      internal === PAYMENT_STATUS.REFUNDED &&
      this.refundedAmount < this.amount
    ) {
      this.status = PAYMENT_STATUS.PARTIALLY_REFUNDED;
    } else {
      this.status = internal;
    }
    const now = new Date();
    if (internal === PAYMENT_STATUS.PAID && !this.paidAt) this.paidAt = now;
    if (internal === PAYMENT_STATUS.AUTHORIZED && !this.authorizedAt) this.authorizedAt = now;
    if (internal === PAYMENT_STATUS.CAPTURED && !this.capturedAt) this.capturedAt = now;
    if (internal === PAYMENT_STATUS.FAILED && !this.failedAt) this.failedAt = now;
    if (internal === PAYMENT_STATUS.REFUNDED && !this.refundedAt) this.refundedAt = now;
    if (internal === PAYMENT_STATUS.VOIDED && !this.voidedAt) this.voidedAt = now;
  }
  return this;
};

const Payment = mongoose.models.Payment || mongoose.model("Payment", paymentSchema);
module.exports = Payment;
module.exports.PAYMENT_STATUS = PAYMENT_STATUS;
