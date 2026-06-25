/**
 * BusinessPlanAssignment
 *
 * A DURABLE record of an admin assigning a business plan to a business account
 * (business-account plan #1/#2/#5). A persisted state machine that webhook +
 * browser callback + reconciliation can drive without ever double-activating.
 *
 * MODES
 *   - 'grant'    (mode A): direct grant, no payment, setup fee waived. Goes
 *                 straight to `active`.
 *   - 'checkout' (mode B): a hosted-summary checkout link delivered over
 *                 WhatsApp (+ SMS fallback). The business pays plan + setup fee.
 *
 * STATES
 *   pending_payment → payment_processing → paid → active
 *   off-happy:
 *     paid → activation_failed → refund_pending → refunded
 *     payment_processing → failed
 *     pending_payment → expired      (cron; RETAINED, never TTL-deleted)
 *     pending_payment|payment_processing → cancelled
 *     pending_payment → superseded   (only pending_payment may be superseded)
 *   grant: → active directly.
 *
 * `paid` ≠ `active`: a paid-but-not-activated assignment is `activation_failed`,
 * not ambiguously `failed`.
 *
 * CONCURRENCY
 *   - `version` (optimistic lock) + compare-and-set transitions so the webhook,
 *     the browser callback, and reconciliation can never activate twice.
 *   - Partial unique index = at most ONE *actionable* assignment per business
 *     (`status ∈ {pending_payment, payment_processing, paid}`).
 *
 * The checkout token is stored ONLY as a hash (`tokenHash`, unique). The raw
 * token lives in the delivered link and is never persisted.
 */

const mongoose = require('mongoose');

const ASSIGNMENT_MODE = Object.freeze({ GRANT: 'grant', CHECKOUT: 'checkout' });

const ASSIGNMENT_STATUS = Object.freeze({
  PENDING_PAYMENT: 'pending_payment',
  PAYMENT_PROCESSING: 'payment_processing',
  PAID: 'paid',
  ACTIVE: 'active',
  ACTIVATION_FAILED: 'activation_failed',
  REFUND_PENDING: 'refund_pending',
  REFUNDED: 'refunded',
  FAILED: 'failed',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
  SUPERSEDED: 'superseded',
});

// The set of statuses that count as "actionable" (an open, in-flight
// assignment). The partial unique index enforces at most one of these per
// business at a time.
const ACTIONABLE_STATUSES = [
  ASSIGNMENT_STATUS.PENDING_PAYMENT,
  ASSIGNMENT_STATUS.PAYMENT_PROCESSING,
  ASSIGNMENT_STATUS.PAID,
];

const deliveryAttemptSchema = new mongoose.Schema(
  {
    channel: { type: String, enum: ['whatsapp', 'sms', 'manual_copy'] },
    status: { type: String, enum: ['sent', 'failed'], default: 'sent' },
    providerMessageId: { type: String, default: null },
    error: { type: String, default: null },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const lineItemSnapshotSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['plan', 'setup_fee', 'addon', 'discount', 'tax'] },
    referenceId: { type: mongoose.Schema.Types.ObjectId, default: null },
    label: { type: String, default: '' },
    quantity: { type: Number, default: 1 },
    unitAmount: { type: Number, default: 0 },
    subtotal: { type: Number, default: 0 },
    discountAllocation: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  { _id: false }
);

const businessPlanAssignmentSchema = new mongoose.Schema(
  {
    businessUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
    planCode: { type: String, default: null },

    mode: { type: String, enum: Object.values(ASSIGNMENT_MODE), required: true },
    status: {
      type: String,
      enum: Object.values(ASSIGNMENT_STATUS),
      default: ASSIGNMENT_STATUS.PENDING_PAYMENT,
      index: true,
    },

    // Optimistic lock for compare-and-set transitions. NOTE: this is a
    // user-managed counter, distinct from Mongoose's internal __v.
    version: { type: Number, default: 0 },

    failureCode: { type: String, default: null },

    // Immutable snapshots taken at creation — never read live.
    planPriceSnapshot: { type: Number, default: 0 },
    setupFeeSnapshot: { type: Number, default: 0 },
    discountSnapshot: { type: Number, default: 0 },
    discountCode: { type: String, default: null },
    currency: { type: String, default: 'SAR' },
    totalSnapshot: { type: Number, default: 0 },
    lineItems: { type: [lineItemSnapshotSchema], default: [] },
    quoteExpiresAt: { type: Date, default: null },

    // Checkout-link (mode B) fields.
    tokenHash: { type: String, default: null },
    expiresAt: { type: Date, default: null },
    usedAt: { type: Date, default: null },
    deliveryAttempts: { type: [deliveryAttemptSchema], default: [] },

    // Direct-grant (mode A) fields.
    grantReason: { type: String, default: null },

    // Linkage.
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
    subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', default: null },
    supersededBy: { type: mongoose.Schema.Types.ObjectId, ref: 'BusinessPlanAssignment', default: null },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// At most ONE actionable assignment per business. Partial filter so terminal
// records (expired/cancelled/refunded/active/superseded/...) don't block a new
// assignment. Retained records are never TTL-deleted (financial/audit).
businessPlanAssignmentSchema.index(
  { businessUserId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ACTIONABLE_STATUSES } },
    name: 'one_actionable_assignment_per_business',
  }
);

// Unique hashed token among live tokens.
businessPlanAssignmentSchema.index(
  { tokenHash: 1 },
  { unique: true, partialFilterExpression: { tokenHash: { $type: 'string' } } }
);

businessPlanAssignmentSchema.statics.ASSIGNMENT_STATUS = ASSIGNMENT_STATUS;
businessPlanAssignmentSchema.statics.ASSIGNMENT_MODE = ASSIGNMENT_MODE;
businessPlanAssignmentSchema.statics.ACTIONABLE_STATUSES = ACTIONABLE_STATUSES;

/**
 * Compare-and-set transition. Atomically moves the assignment from `fromStatus`
 * (and the version we read) to `toStatus`, bumping `version`. Returns the
 * updated doc, or null if another actor already transitioned it (lost race).
 *
 * @param {string} id
 * @param {string|string[]} fromStatus - allowed current status(es)
 * @param {number} expectedVersion
 * @param {string} toStatus
 * @param {Object} [set] - extra fields to set
 * @returns {Promise<Object|null>}
 */
businessPlanAssignmentSchema.statics.transition = function (
  id,
  fromStatus,
  expectedVersion,
  toStatus,
  set = {}
) {
  const from = Array.isArray(fromStatus) ? fromStatus : [fromStatus];
  return this.findOneAndUpdate(
    { _id: id, status: { $in: from }, version: expectedVersion },
    { $set: { status: toStatus, ...set }, $inc: { version: 1 } },
    { new: true }
  );
};

const BusinessPlanAssignment =
  mongoose.models.BusinessPlanAssignment ||
  mongoose.model('BusinessPlanAssignment', businessPlanAssignmentSchema);

module.exports = BusinessPlanAssignment;
module.exports.ASSIGNMENT_STATUS = ASSIGNMENT_STATUS;
module.exports.ASSIGNMENT_MODE = ASSIGNMENT_MODE;
module.exports.ACTIONABLE_STATUSES = ACTIONABLE_STATUSES;
