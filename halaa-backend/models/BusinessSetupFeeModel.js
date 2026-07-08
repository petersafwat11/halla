/**
 * Business Setup-Fee Entitlement
 *
 * ONE record per business account (unique on `businessUserId`). Tracks the
 * lifecycle of the once-per-account setup fee under the
 * settle-on-first-activation rule (business-account plan #2/#5):
 *
 *   - The fee settles PERMANENTLY on the FIRST activation of ANY business plan.
 *   - A direct grant (mode A) or a zero-fee first plan (quarterly/annual)
 *     settles it as `waived` / `paid(0)` permanently → a later event plan is
 *     never charged.
 *   - Amount = the activating plan's `setupFeeAmount` (event = 1200, q/a = 0).
 *   - Not discountable.
 *   - Refund of a setup fee re-opens eligibility ONLY in the
 *     paid-but-activation-failed case (no setup delivered); non-refundable
 *     after a successful activation.
 *
 * STATUS:
 *   not_applicable | waived | pending | processing | paid
 *   | refund_pending | refunded | failed
 *
 * `settled:true` is the terminal "this account will never be charged a setup
 * fee again" flag (set on waived / paid).
 */

const mongoose = require('mongoose');

const SETUP_FEE_STATUS = Object.freeze({
  NOT_APPLICABLE: 'not_applicable',
  WAIVED: 'waived',
  PENDING: 'pending',
  PROCESSING: 'processing',
  PAID: 'paid',
  REFUND_PENDING: 'refund_pending',
  REFUNDED: 'refunded',
  FAILED: 'failed',
});

const businessSetupFeeSchema = new mongoose.Schema(
  {
    // The business account this entitlement belongs to. UNIQUE — one per
    // business. (Legacy field was `organizationId`; migrated to businessUserId.)
    businessUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },

    status: {
      type: String,
      enum: Object.values(SETUP_FEE_STATUS),
      default: SETUP_FEE_STATUS.PENDING,
    },

    // Terminal "never charge again" flag — set when waived or paid.
    settled: { type: Boolean, default: false },
    settledAt: { type: Date, default: null },

    amount: { type: Number, default: 1200 }, // SAR major units
    currency: { type: String, default: 'SAR' },

    // Audit / linkage refs.
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
    lineItemId: { type: mongoose.Schema.Types.ObjectId, default: null },
    assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'BusinessPlanAssignment', default: null },
    settledByPlanId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', default: null },

    waivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    waiveReason: { type: String, default: null },

    paidAt: { type: Date, default: null },
    refundedAt: { type: Date, default: null },
    notes: String,
  },
  { timestamps: true }
);

businessSetupFeeSchema.index({ businessUserId: 1, status: 1 });

businessSetupFeeSchema.statics.SETUP_FEE_STATUS = SETUP_FEE_STATUS;

const BusinessSetupFee =
  mongoose.models.BusinessSetupFee ||
  mongoose.model('BusinessSetupFee', businessSetupFeeSchema);

module.exports = BusinessSetupFee;
module.exports.SETUP_FEE_STATUS = SETUP_FEE_STATUS;
