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
 *   moyasarPaymentId is unique among rows whose value is a string
 *   (`stub-...` in stub mode, UUID/`pay_...` from Moyasar). The index
 *   uses a partialFilterExpression on `$type: "string"` instead of
 *   `sparse: true` because the field has `default: null` — sparse only
 *   excludes *missing* fields, so two rows with explicit null would
 *   still collide on the unique constraint and break concurrent
 *   first-time checkouts. The partial filter excludes nulls properly.
 *   It is the join key with Moyasar webhooks.
 *   Schema migrations: scripts/migrate-payment-moyasar-id-index.js
 *   drops the legacy `sparse` index and creates the partial one;
 *   Mongoose will not rewrite an index whose options changed.
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
          // Invite clawback applied alongside this (partial) refund — number
          // of invites debited from the linked subscription's pool.
          deductInvites: { type: Number, default: 0 },
        },
        { _id: true }
      ),
    ],
  },
  { timestamps: true }
);

paymentSchema.index(
  { moyasarPaymentId: 1 },
  {
    unique: true,
    partialFilterExpression: { moyasarPaymentId: { $type: "string" } },
  }
);
paymentSchema.index({ userId: 1, status: 1, createdAt: -1 });
paymentSchema.index({ status: 1, createdAt: -1 });
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


// ============================================
// MIDDLEWARE HOOKS & NOTIFICATION DISPATCH
// ============================================

paymentSchema.pre("save", function (next) {
  if (this.isModified("status")) {
    this._statusWasModified = true;
  }
  if (this.isModified("refunds")) {
    this._refundsWereModified = true;
  }
  next();
});

paymentSchema.post("save", async function (doc, next) {
  const statusChanged = doc._statusWasModified;
  const refundsChanged = doc._refundsWereModified;

  // Reset the temporary flags
  doc._statusWasModified = false;
  doc._refundsWereModified = false;

  const finalStatuses = ["paid", "captured", "failed", "voided"];

  if (
    (statusChanged && finalStatuses.includes(doc.status)) ||
    refundsChanged
  ) {
    sendPaymentNotifications(doc).catch((err) => {
      console.error("[PaymentModel] Notification dispatch failed:", err);
    });
  }
  if (typeof next === "function") next();
});

async function sendPaymentNotifications(payment) {
  try {
    const User = require("./UserModel");
    const notificationsService = require("../src/modules/notifications/notifications.service");
    const config = require("../src/config");

    // Fetch user who made the payment
    const payer = await User.findById(payment.userId).select("name username email role");
    if (!payer) {
      console.warn(`[PaymentNotification] Payer user ${payment.userId} not found`);
      return;
    }

    const items = resolveItemDetails(payment);
    const amountStr = `${payment.amount} ${payment.currency}`;
    const payerName = payer.name || payer.username || payer.email || "Client";
    const frontendUrl = config.frontend?.url || "";

    // For refunds, determine the most recent refund transaction amount
    const lastRefund = payment.refunds && payment.refunds.length > 0
      ? payment.refunds[payment.refunds.length - 1]
      : null;
    const lastRefundAmt = lastRefund ? lastRefund.amount : payment.refundedAmount;
    const lastRefundAmtStr = `${lastRefundAmt} ${payment.currency}`;

    // Determine notification title and message based on status
    let type = "custom";
    let title = "";
    let titleAr = "";
    let message = "";
    let messageAr = "";
    let priority = "normal";

    switch (payment.status) {
      case "paid":
      case "captured":
        type = "payment_successful";
        title = "Payment Successful";
        titleAr = "تمت عملية الدفع بنجاح";
        message = `Your payment of ${amountStr} for ${items.en} was successful.`;
        messageAr = `تمت عملية الدفع بنجاح بقيمة ${amountStr} لـ ${items.ar}.`;
        break;
      case "failed":
        type = "payment_failed";
        title = "Payment Failed";
        titleAr = "فشلت عملية الدفع";
        message = `Your payment of ${amountStr} for ${items.en} failed.`;
        messageAr = `فشلت عملية الدفع بقيمة ${amountStr} لـ ${items.ar}.`;
        priority = "high";
        break;
      case "refunded":
        type = "payment_refunded";
        title = "Payment Refunded";
        titleAr = "تم استرجاع مبلغ الدفع";
        const refundVal = lastRefund ? lastRefundAmtStr : amountStr;
        message = `Your payment of ${amountStr} for ${items.en} has been fully refunded (amount: ${refundVal}).`;
        messageAr = `تم استرجاع مبلغ دفعتك بالكامل بقيمة ${amountStr} لـ ${items.ar} (المبلغ المسترجع: ${refundVal}).`;
        break;
      case "partially_refunded":
        type = "payment_partially_refunded";
        title = "Payment Partially Refunded";
        titleAr = "تم استرجاع جزء من مبلغ الدفع";
        message = `Your payment of ${amountStr} for ${items.en} was partially refunded by ${lastRefundAmtStr}.`;
        messageAr = `تم استرجاع جزء من دفعتك لـ ${items.ar} بقيمة ${lastRefundAmtStr} من إجمالي ${amountStr}.`;
        break;
      case "voided":
        type = "payment_voided";
        title = "Payment Voided";
        titleAr = "تم إلغاء عملية الدفع";
        message = `Your payment of ${amountStr} for ${items.en} was voided.`;
        messageAr = `تم إلغاء عملية الدفع لـ ${items.ar} بقيمة ${amountStr}.`;
        break;
      default:
        return; // Do not notify for other statuses
    }

    // Determine target URL for payer
    const payerActionUrl = `${frontendUrl}/ar/host/subscription`;

    // 1. Notify the payer (a host)
    if (payer.role === "host") {
      await notificationsService.sendToUser(payer._id, {
        type,
        title,
        titleAr,
        message,
        messageAr,
        priority,
        actionUrl: payerActionUrl,
        data: {
          entityType: "payment",
          entityId: payment._id,
          metadata: {
            status: payment.status,
            amount: payment.amount,
            currency: payment.currency,
          }
        }
      });
    }

    // 2. Notify Platform-Wide Admins, Super Admins, and Moderators
    let adminTitle = "";
    let adminTitleAr = "";
    let adminMessage = "";
    let adminMessageAr = "";

    switch (payment.status) {
      case "paid":
      case "captured":
        adminTitle = "New Payment Received";
        adminTitleAr = "تم استلام دفعة جديدة";
        adminMessage = `A payment of ${amountStr} has been received from ${payerName} for ${items.en}.`;
        adminMessageAr = `تم استلام دفعة بقيمة ${amountStr} من ${payerName} لـ ${items.ar}.`;
        break;
      case "failed":
        adminTitle = "Payment Failed Alert";
        adminTitleAr = "فشلت عملية دفع";
        adminMessage = `A payment of ${amountStr} from ${payerName} for ${items.en} failed.`;
        adminMessageAr = `فشلت عملية دفع بقيمة ${amountStr} من ${payerName} لـ ${items.ar}.`;
        break;
      case "refunded":
        adminTitle = "Payment Refunded";
        adminTitleAr = "تم استرجاع دفعة";
        const refundValAdmin = lastRefund ? lastRefundAmtStr : amountStr;
        adminMessage = `A payment of ${amountStr} for ${payerName} was fully refunded (amount: ${refundValAdmin}).`;
        adminMessageAr = `تم استرجاع دفعة لـ ${payerName} بالكامل بقيمة ${amountStr} (المبلغ المسترجع: ${refundValAdmin}).`;
        break;
      case "partially_refunded":
        adminTitle = "Payment Partially Refunded";
        adminTitleAr = "تم استرجاع جزء من دفعة";
        adminMessage = `A payment of ${amountStr} for ${payerName} was partially refunded by ${lastRefundAmtStr}.`;
        adminMessageAr = `تم استرجاع جزء من دفعة لـ ${payerName} بقيمة ${lastRefundAmtStr} من إجمالي ${amountStr}.`;
        break;
      case "voided":
        adminTitle = "Payment Voided";
        adminTitleAr = "تم إلغاء دفعة";
        adminMessage = `A payment of ${amountStr} for ${payerName} was voided.`;
        adminMessageAr = `تم إلغاء دفعة بقيمة ${amountStr} لـ ${payerName}.`;
        break;
    }

    if (adminTitle) {
      await notificationsService.sendToPlatformAdmins({
        type,
        title: adminTitle,
        titleAr: adminTitleAr,
        message: adminMessage,
        messageAr: adminMessageAr,
        priority,
        actionUrl: `${frontendUrl}/ar/admin-dash/payments`,
        data: {
          entityType: "payment",
          entityId: payment._id,
          metadata: {
            status: payment.status,
            amount: payment.amount,
            currency: payment.currency,
            payerId: payer._id,
            payerName,
          }
        }
      });
    }
  } catch (err) {
    console.error("[PaymentNotification] Error in sendPaymentNotifications:", err);
  }
}

function resolveItemDetails(payment) {
  const purpose = payment.metadata?.purpose;
  const planCode = payment.metadata?.planCode;
  const addonType = payment.metadata?.addonType;
  const quantity = payment.metadata?.quantity;

  const planNames = {
    basic: { en: "Basic Plan", ar: "الباقة الأساسية" },
    premium: { en: "Premium Plan", ar: "الباقة المميزة" },
    business: { en: "Business Plan", ar: "باقة الأعمال" },
    trial: { en: "Trial Plan", ar: "الباقة التجريبية" },
  };

  const addonNames = {
    invitation: { en: "Extra Invitations", ar: "دعوات إضافية" },
    template: { en: "Extra Templates", ar: "قوالب إضافية" },
    whatsapp: { en: "WhatsApp Credits", ar: "رصيد واتساب" },
    sms: { en: "SMS Credits", ar: "رصيد رسائل نصية" },
  };

  if (purpose === "checkout" || purpose === "subscription_renewal") {
    const plan = planNames[planCode?.toLowerCase()] || { en: planCode || "Subscription", ar: planCode || "الاشتراك" };
    return {
      en: `${plan.en} Subscription`,
      ar: `اشتراك ${plan.ar}`,
    };
  }

  if (purpose === "addon") {
    const addon = addonNames[addonType?.toLowerCase()] || { en: addonType || "Addon", ar: addonType || "إضافة" };
    const qtyStr = quantity ? ` (${quantity})` : "";
    return {
      en: `${addon.en}${qtyStr}`,
      ar: `${addon.ar}${qtyStr}`,
    };
  }

  return {
    en: payment.description || "Payment",
    ar: "دفعة مالية",
  };
}

const Payment = mongoose.models.Payment || mongoose.model("Payment", paymentSchema);
module.exports = Payment;
module.exports.PAYMENT_STATUS = PAYMENT_STATUS;

