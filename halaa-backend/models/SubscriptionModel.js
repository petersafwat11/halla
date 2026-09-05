/**
 * Subscription Model
 * Tracks user's active subscription and usage
 * References Plan for limits/features - no duplication
 */

const mongoose = require("mongoose");
const {
  SUBSCRIPTION_STATUS,
  isUnlimited,
} = require("../src/shared/constants");
const { isPerEventPlan, isPoolPlan, isManagedPlan, COMPENSATION_PERCENTAGE } = require('../src/shared/constants/plans');

// ============================================
// SUB-SCHEMAS (Subscription-specific only)
// ============================================

/**
 * Usage tracking schema - tracks actual usage
 */
const usageSchema = new mongoose.Schema(
  {
    eventsCreated: { type: Number, default: 0 },
    totalGuests: { type: Number, default: 0 },
    guestsUsed: { type: Number, default: 0 }, // Track guests across all events
    lastEventDate: { type: Date, default: null }, // Track last event creation
  },
  { _id: false }
);

/**
 * Price paid schema - what user actually paid
 */
const pricePaidSchema = new mongoose.Schema(
  {
    amount: { type: Number, default: 0 },
    currency: { type: String, default: "SAR" },
    discountCode: String,
    discountAmount: { type: Number, default: 0 },
  },
  { _id: false }
);

/**
 * Created by schema
 */
const createdBySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    role: String,
    onBehalfOf: { type: Boolean, default: false },
  },
  { _id: false }
);

// ============================================
// MAIN SUBSCRIPTION SCHEMA
// ============================================

const subscriptionSchema = new mongoose.Schema(
  {
    // ============ OWNER ============
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Subscription must belong to a user"],
      index: true,
    },
    privacySubjectDeletedAt: { type: Date, default: null },

    // ============ PLAN REFERENCE ============
    // All plan details come from populated planId
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      required: [true, "Plan reference is required"],
    },

    // Package type: event (single event), subscription (monthly), hybrid
    packageType: {
      type: String,
      enum: ["event", "subscription", "hybrid"],
      default: "subscription",
    },

    // ============ BILLING ============
    status: {
      type: String,
      enum: Object.values(SUBSCRIPTION_STATUS),
      default: SUBSCRIPTION_STATUS.TRIAL,
    },

    invitePool:       { type: Number, default: null },
    compensationPool: { type: Number, default: null },
    invitesConsumed:  { type: Number, default: 0 },

    // Set the first time a real message is dispatched on this subscription
    // (initial send, resend, or extra reminder). This is the authoritative
    // "sending has started" signal for the per-event re-creation gate —
    // distinct from `invitesConsumed`, which an admin partial-refund clawback
    // can also increase WITHOUT any message having been sent.
    firstSendAt:      { type: Date, default: null },

    activatedAt:      { type: Date, default: null },
    expiresAt:        { type: Date, default: null },

    // Cancellation
    cancelledAt: Date,
    cancelReason: String,
    cancelAtPeriodEnd: { type: Boolean, default: false },

    // ============ PRICING ============
    pricePaid: {
      type: pricePaidSchema,
      default: () => ({}),
    },

    // ============ USAGE ============
    usage: {
      type: usageSchema,
      default: () => ({}),
    },

    // ============ PAYMENT ============
    paymentMethod: {
      type: { type: String }, // card, bank_transfer, etc.
      last4: String,
      brand: String,
      expiryMonth: Number,
      expiryYear: Number,
    },

    // ============ STORE / IAP (RevenueCat) (§9.2) ============
    // Null for web/admin subscriptions. Set for native store subscriptions so
    // access is derived from the canonical store entitlement/expiry, not guessed.
    provider: { type: String, default: null }, // revenuecat | appstore | playstore
    storeProductId: { type: String, default: null },
    storeOriginalTransactionId: { type: String, default: null },
    storeExpiresAt: { type: Date, default: null },
    storeAutoRenewStatus: { type: Boolean, default: null },

    // ============ CREATED BY ============
    createdBy: {
      type: createdBySchema,
      default: () => ({}),
    },

    // ============ METADATA ============
    notes: String,
    metadata: mongoose.Schema.Types.Mixed,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ============================================
// INDEXES
// ============================================

subscriptionSchema.index({ userId: 1, status: 1 });
subscriptionSchema.index({ status: 1, expiresAt: 1 });
subscriptionSchema.index({ planId: 1, status: 1 });
subscriptionSchema.index({ status: 1, updatedAt: 1 }, { name: "retention_status_updated" });
subscriptionSchema.index({ privacySubjectDeletedAt: 1 }, { name: "retention_subject_deleted" });
// Idempotency backstop: one subscription per RevenueCat event id (§9.2).
subscriptionSchema.index(
  { "metadata.rcEventId": 1 },
  {
    unique: true,
    partialFilterExpression: { "metadata.rcEventId": { $type: "string" } },
  }
);

// ============================================
// VIRTUALS
// ============================================

// Get planCode from populated plan
subscriptionSchema.virtual("planCode").get(function () {
  return this.planId?.code || null;
});

// Get planType from populated plan
subscriptionSchema.virtual("planType").get(function () {
  return this.planId?.planType || null;
});

// Check if subscription is active
subscriptionSchema.virtual("isActive").get(function () {
  const validStatuses = ['active', 'trial'];
  if (!validStatuses.includes(this.status)) return false;
  if (this.expiresAt && new Date(this.expiresAt) <= new Date()) return false;
  return true;
});

subscriptionSchema.virtual("isPoolSubscription").get(function () {
  return isPoolPlan(this.planId?.planType);
});

subscriptionSchema.virtual("invitationBalance").get(function () {
  const { calculateInvitationBalance } = require("../src/modules/subscriptions/invitationBalance.presenter");
  return calculateInvitationBalance(this, this.planId);
});

subscriptionSchema.virtual("invitesRemaining").get(function () {
  return this.invitationBalance.remaining;
});

// Days remaining in current period
subscriptionSchema.virtual("daysRemaining").get(function () {
  if (!this.expiresAt) return -1; // No end date (e.g., single event)
  const now = new Date();
  const end = new Date(this.expiresAt);
  const diff = end - now;
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
});

// Check if in trial
subscriptionSchema.virtual("isInTrial").get(function () {
  return this.status === SUBSCRIPTION_STATUS.TRIAL;
});

// Check if per-event plan (all new plan types are per-event)
subscriptionSchema.virtual("isSingleEvent").get(function () {
  return isPerEventPlan(this.planId?.planType);
});

// Check if managed service — now encoded in planType
subscriptionSchema.virtual("isManaged").get(function () {
  return isManagedPlan(this.planId?.planType);
});

// Get limits from populated plan (requires population)
subscriptionSchema.virtual("limits").get(function () {
  return (
    this.planId?.limits || {
      maxEvents: 1,
      maxInvitesPerEvent: 50,
    }
  );
});

// Get features from populated plan (requires population)
subscriptionSchema.virtual("features").get(function () {
  return this.planId?.features || {};
});

// Events remaining (requires populated planId)
// Plan schema field is `maxEvents`: -1 = unlimited (pool plans), 1 = per-event.
subscriptionSchema.virtual("eventsRemaining").get(function () {
  const maxEvents = this.limits.maxEvents;
  if (isUnlimited(maxEvents)) return -1;
  return Math.max(0, (maxEvents || 1) - (this.usage?.eventsCreated || 0));
});

// Total invite capacity: invitePool + compensationPool.
// invitePool === null/undefined means an unlimited plan → -1.
subscriptionSchema.virtual("maxInvites").get(function () {
  if (this.invitePool === null || this.invitePool === undefined) return -1;
  return (this.invitePool || 0) + (this.compensationPool || 0);
});

// Alias kept for callers (e.g. canAddGuests) — same total-capacity semantics.
subscriptionSchema.virtual("maxGuests").get(function () {
  if (this.invitePool === null || this.invitePool === undefined) return -1;
  return (this.invitePool || 0) + (this.compensationPool || 0);
});

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Check if user can create a new event
 * Requires planId to be populated
 * @returns {Object} { allowed: boolean, reason?: string }
 */
subscriptionSchema.methods.canCreateEvent = function () {
  if (!this.isActive) {
    return { allowed: false, reason: "Subscription is not active" };
  }

  const planType = this.planId?.planType;

  // Per-event plans: "used up" the moment sending starts (even one guest).
  // `firstSendAt` is set the first time a real message goes out on this
  // subscription — permanently blocked thereafter, even after the event is
  // cancelled or deleted. We key on `firstSendAt` (NOT `invitesConsumed`)
  // because an admin partial-refund clawback bumps `invitesConsumed` without
  // any send, and must not lock an otherwise-unused per-event plan. The "no
  // currently-active event" part is a dynamic count handled in the async
  // service layer (subscriptions.service.validateEventCreation).
  if (isPerEventPlan(planType)) {
    if (this.firstSendAt) {
      return {
        allowed: false,
        reason: "This event plan has already been used to send invitations",
      };
    }
    return { allowed: true };
  }

  // Pool / unlimited plans — service layer does dynamic counting
  return { allowed: true };
};

/**
 * Get the start of the current billing period for dynamic event counting
 * @returns {Date}
 */
subscriptionSchema.methods.getBillingPeriodStart = function () {
  return this.activatedAt || this.createdAt;
};

/**
 * Check if event can have specified number of guests
 * @param {number} guestCount - Number of guests to add
 * @returns {Object} { allowed: boolean, reason?: string, maxAllowed?: number }
 */
subscriptionSchema.methods.canAddGuests = function (guestCount) {
  if (!this.isActive) {
    return { allowed: false, reason: "Subscription is not active" };
  }

  const maxAllowed = this.maxGuests; // Uses virtual that includes add-ons

  if (isUnlimited(maxAllowed)) {
    return { allowed: true, maxAllowed: -1 };
  }

  if (guestCount > maxAllowed) {
    return {
      allowed: false,
      reason: `Guest limit exceeded. Max ${maxAllowed} guests allowed`,
      maxAllowed,
    };
  }

  return { allowed: true, maxAllowed };
};

/**
 * Track guest addition across events
 * @param {number} count - Number of guests to track
 * @returns {Promise}
 */
subscriptionSchema.methods.trackGuestAddition = async function (count) {
  this.usage.guestsUsed = (this.usage.guestsUsed || 0) + count;
  this.usage.totalGuests = (this.usage.totalGuests || 0) + count;
  return this.save();
};

/**
 * Renew subscription for next period
 * @returns {Promise}
 */
subscriptionSchema.methods.renew = async function () {
  const plan = this.planId;
  const durationDays = plan?.limits?.durationDays;
  if (!durationDays || durationDays <= 0) return this;
  this.activatedAt = new Date();
  this.expiresAt = new Date(this.activatedAt.getTime() + durationDays * 24 * 60 * 60 * 1000);

  // Rebuild the pool from the plan's BASE entitlement so one-time extra-invite
  // add-ons do not carry over period after period. Renewal restores base +
  // base-derived compensation; the host must re-purchase extras for the new
  // period.
  const basePool = plan?.limits?.invitePool ?? null;
  if (basePool !== null) {
    this.invitePool = basePool;
    this.compensationPool = Math.floor((basePool * COMPENSATION_PERCENTAGE) / 100);
  }
  this.invitesConsumed = 0;
  this.firstSendAt = null;
  this.status = 'active';
  return this.save();
};

/**
 * Cancel subscription
 * @param {string} reason
 * @param {boolean} immediate - Cancel immediately or at period end
 * @returns {Promise}
 */
subscriptionSchema.methods.cancel = async function (reason, immediate = false) {
  this.cancelReason = reason;
  this.cancelledAt = new Date();

  if (immediate) {
    this.status = SUBSCRIPTION_STATUS.CANCELLED;
    this.expiresAt = new Date();
  } else {
    this.cancelAtPeriodEnd = true;
  }

  return this.save();
};

/**
 * Mark single event subscription as completed
 * @returns {Promise}
 */
subscriptionSchema.methods.complete = async function () {
  this.status = SUBSCRIPTION_STATUS.COMPLETED;
  return this.save();
};

/**
 * Upgrade to new plan
 * @param {ObjectId} newPlanId - Plan document ID
 * @param {number} pricePaid
 * @returns {Promise}
 */
subscriptionSchema.methods.upgradeTo = async function (
  newPlanId,
  pricePaid = 0
) {
  this.planId = newPlanId;
  this.status = SUBSCRIPTION_STATUS.ACTIVE;

  if (pricePaid) {
    this.pricePaid.amount = pricePaid;
  }

  // Rebuild the pool from the NEW plan's base entitlement so the host's
  // capacity matches the tier they now pay for. Carry forward already-consumed
  // invites (clamped to the new capacity) so an upgrade never resurrects spent
  // invites.
  const Plan = mongoose.model('Plan');
  const plan = await Plan.findById(newPlanId).select('limits');
  const basePool = plan?.limits?.invitePool ?? null;
  if (basePool !== null) {
    this.invitePool = basePool;
    this.compensationPool = Math.floor((basePool * COMPENSATION_PERCENTAGE) / 100);
    const capacity = this.invitePool + this.compensationPool;
    this.invitesConsumed = Math.min(this.invitesConsumed || 0, capacity);
  } else {
    // Upgrading to an unlimited plan.
    this.invitePool = null;
    this.compensationPool = null;
  }

  return this.save();
};

/**
 * Get subscription summary for display
 * Requires planId to be populated for limits/features
 * @returns {Object}
 */
subscriptionSchema.methods.getSummary = function () {
  return {
    id: this._id,
    planId: this.planId?._id || this.planId,
    planCode: this.planCode, // From virtual
    planType: this.planType, // From virtual
    planFamily: this.planId?.planFamily || null,
    billingType: this.planId?.billingType || null,
    status: this.status,
    isActive: this.isActive,
    isManaged: this.isManaged,
    isSingleEvent: this.isSingleEvent,
    isPoolSubscription: this.isPoolSubscription,
    invitePool: this.invitePool,
    compensationPool: this.compensationPool,
    invitesConsumed: this.invitesConsumed,
    invitesRemaining: this.invitesRemaining,
    invitationBalance: this.invitationBalance,
    activatedAt: this.activatedAt,
    expiresAt: this.expiresAt,
    pricePaid: this.pricePaid,
    paymentId: this.metadata?.paymentId || null,
    daysRemaining: this.daysRemaining,
    limits: this.limits,
    features: this.features,
    usage: this.usage,
    eventsRemaining: this.eventsRemaining,
    maxGuests: this.maxGuests,
    events: {
      canCreate: this.canCreateEvent(),
      remaining: this.eventsRemaining,
    },
  };
};

// ============================================
// STATIC METHODS
// ============================================

/**
 * Find all active subscriptions for user
 * @param {ObjectId} userId
 * @returns {Promise<Subscription[]>}
 */
subscriptionSchema.statics.findActiveForUser = async function (userId) {
  // Sort newest-first (with _id as a stable tiebreaker for sub-ms inserts)
  // so callers that grab [0] always see the most recently created active
  // subscription. The single-active invariant is enforced upstream in the
  // checkout flow; this sort is defence-in-depth for stray historical rows.
  return this.find({
    userId,
    status: { $in: ['active', 'trial'] },
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
  })
    .populate('planId')
    .sort({ createdAt: -1, _id: -1 });
};

/**
 * Find all subscriptions for user
 * @param {ObjectId} userId
 * @returns {Promise<Subscription[]>}
 */
subscriptionSchema.statics.findAllForUser = async function (userId) {
  return this.find({ userId }).sort({ createdAt: -1 }).populate("planId");
};

/**
 * Find expiring subscriptions
 * @param {number} daysFromNow
 * @returns {Promise<Subscription[]>}
 */
subscriptionSchema.statics.findExpiring = async function (daysFromNow = 7) {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysFromNow);
  return this.find({
    status: 'active',
    expiresAt: { $lte: futureDate, $gt: now },
  }).populate('userId', 'email name phoneNumber');
};

/**
 * Create subscription for user
 * @param {ObjectId} userId
 * @param {Object} plan - Populated plan document
 * @param {Object} options - { activatedAt, status, pricePaid, currency, createdBy }
 * @returns {Promise<Subscription>}
 */
subscriptionSchema.statics.createForUser = async function (userId, plan, options = {}) {
  const now = options.activatedAt || new Date();
  const durationDays = plan.limits?.durationDays;
  const expiresAt = durationDays && durationDays > 0
    ? new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000)
    : null;

  const invitePool = plan.limits?.invitePool ?? null;
  const compensationPool = invitePool !== null
    ? Math.floor(invitePool * COMPENSATION_PERCENTAGE / 100)
    : null;

  return this.create({
    userId, planId: plan._id, status: options.status || 'active',
    activatedAt: now, expiresAt, invitePool, compensationPool, invitesConsumed: 0,
    pricePaid: { amount: options.pricePaid || 0, currency: options.currency || 'SAR' },
    createdBy: options.createdBy || {},
  });
};

/**
 * Get best subscription to use for an event with specified guest count
 * @param {ObjectId} userId
 * @param {number} guestCount
 * @returns {Promise<Subscription|null>}
 */
subscriptionSchema.statics.getCapacityForEvent = async function (userId, guestCount = 0) {
  const subs = await this.findActiveForUser(userId);
  if (!subs.length) return null;

  const byExpiry = (a, b) => {
    const aE = a.expiresAt ? new Date(a.expiresAt) : new Date(9999, 0);
    const bE = b.expiresAt ? new Date(b.expiresAt) : new Date(9999, 0);
    return aE - bE;
  };

  const perEvent = subs
    .filter(s => isPerEventPlan(s.planId?.planType) && !s.firstSendAt)
    .sort(byExpiry);

  const pool = subs
    .filter(s => isPoolPlan(s.planId?.planType))
    .filter(s => {
      const remaining = (s.invitePool || 0) + (s.compensationPool || 0) - (s.invitesConsumed || 0);
      return guestCount === 0 || remaining >= guestCount;
    })
    .sort(byExpiry);

  return perEvent[0] || pool[0] || null;
};

/**
 * Get subscription stats
 * @returns {Promise<Object>}
 */
subscriptionSchema.statics.getStats = async function () {
  const matchStage = {};

  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          planId: "$planId",
          status: "$status",
        },
        count: { $sum: 1 },
        revenue: { $sum: "$pricePaid.amount" },
      },
    },
  ]);

  return stats;
};

// ============================================
// CREATE MODEL
// ============================================

const Subscription = mongoose.model("Subscription", subscriptionSchema);

module.exports = Subscription;
