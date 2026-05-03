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
    activatedAt:      { type: Date, default: null },
    expiresAt:        { type: Date, default: null },

    // Cancellation
    cancelledAt: Date,
    cancelReason: String,
    cancelAtPeriodEnd: { type: Boolean, default: false },

    // ============ SINGLE EVENT LINK ============
    // For single event plans, link to the specific event
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      default: null,
    },

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

    // ============ MULTI-TENANT ============
    whitelabelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

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
subscriptionSchema.index({ whitelabelId: 1, status: 1 });
subscriptionSchema.index({ planId: 1, status: 1 });
subscriptionSchema.index({ eventId: 1 }, { sparse: true });

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

subscriptionSchema.virtual("invitesRemaining").get(function () {
  if (this.invitePool === null) return null;
  return (this.invitePool || 0) + (this.compensationPool || 0) - (this.invitesConsumed || 0);
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
      maxEventsPerMonth: -1,
      maxInvitesPerEvent: 50,
    }
  );
});

// Get features from populated plan (requires population)
subscriptionSchema.virtual("features").get(function () {
  return this.planId?.features || {};
});

// Events remaining (requires populated planId)
subscriptionSchema.virtual("eventsRemaining").get(function () {
  const limits = this.limits;
  const planType = this.planId?.planType;

  // Per-event plans - max 1 event
  if (isPerEventPlan(planType)) {
    const maxEvents = limits.maxEvents || 1;
    return Math.max(0, maxEvents - (this.usage?.eventsCreated || 0));
  }

  // Unlimited plans
  if (isUnlimited(limits.maxEventsPerMonth)) return -1;
  return Math.max(
    0,
    limits.maxEventsPerMonth - (this.usage?.eventsCreated || 0)
  );
});

// Get max invites from plan (requires populated planId)
subscriptionSchema.virtual("maxInvites").get(function () {
  return this.limits.maxInvitesPerEvent || 50;
});

// Alias for backward compatibility
subscriptionSchema.virtual("maxGuests").get(function () {
  return this.limits.maxInvitesPerEvent || 50;
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

  // Per-event plans - 1 event only
  if (isPerEventPlan(planType)) {
    if (this.eventId) {
      return { allowed: false, reason: "This plan has already been used for an event" };
    }
    if ((this.usage?.eventsCreated || 0) >= 1) {
      return { allowed: false, reason: "Per-event plan already used" };
    }
    return { allowed: true };
  }

  // Unlimited plans
  if (isUnlimited(this.limits.maxEventsPerMonth)) {
    return { allowed: true };
  }

  // Return true here — the service layer does dynamic counting
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
 * Track event creation with timestamp
 * @param {ObjectId} eventId - For single event plans
 * @returns {Promise}
 */
subscriptionSchema.methods.trackEventCreation = async function (
  eventId = null
) {
  this.usage.eventsCreated = (this.usage.eventsCreated || 0) + 1;
  this.usage.lastEventDate = new Date();

  // For per-event plans, link the event
  if (isPerEventPlan(this.planId?.planType) && eventId) {
    this.eventId = eventId;
  }

  return this.save();
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
 * Check if a feature is available (requires planId populated)
 * @param {string} featureName
 * @returns {boolean}
 */
subscriptionSchema.methods.hasFeature = function (featureName) {
  if (!this.isActive) return false;

  // Check features from plan
  const featureValue = this.features?.[featureName];
  if (typeof featureValue === "boolean") return featureValue;
  if (typeof featureValue === "number") return featureValue > 0;

  // Check limits from plan
  const limitValue = this.limits?.[featureName];
  if (typeof limitValue === "boolean") return limitValue;
  if (typeof limitValue === "number") return limitValue !== 0;

  return false;
};

/**
 * Increment event usage
 * @param {ObjectId} eventId - For single event plans
 * @returns {Promise}
 */
subscriptionSchema.methods.incrementEventUsage = async function (
  eventId = null
) {
  this.usage.eventsCreated = (this.usage.eventsCreated || 0) + 1;

  // For per-event plans, link the event
  if (isPerEventPlan(this.planId?.planType) && eventId) {
    this.eventId = eventId;
  }

  return this.save();
};

/**
 * Reset usage counters
 * @returns {Promise}
 */
subscriptionSchema.methods.resetUsage = async function () {
  this.usage.eventsCreated = 0;
  this.usage.totalGuests = 0;
  this.usage.guestsUsed = 0;
  this.usage.lastEventDate = null;
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
  this.invitesConsumed = 0;
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
    activatedAt: this.activatedAt,
    expiresAt: this.expiresAt,
    pricePaid: this.pricePaid,
    paymentTransactionId: this.metadata?.paymentTransactionId || null,
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
  // FLOW-12-F01 / FLOW-09-F02: sort newest-first so callers that grab
  // [0] always see the most recently created active subscription. The
  // primary fix is `subscribe()` auto-cancelling old subs (matches
  // changePlan), but we keep this as defence-in-depth in case a stray
  // historical record slips through.
  // M-16: sort with `_id` as tiebreaker. With identical createdAt timestamps
  // (sub-millisecond inserts during a test seed or a concurrent burst),
  // single-key createdAt sort is non-deterministic. ObjectId's monotonic
  // counter makes _id a stable secondary key.
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
 * @param {Object} options - { activatedAt, status, pricePaid, currency, whitelabelId, createdBy }
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
    whitelabelId: options.whitelabelId || null, createdBy: options.createdBy || {},
  });
};

/**
 * Consume invites from a subscription
 * @param {ObjectId} subscriptionId
 * @param {number} count
 * @returns {Promise<Subscription>}
 */
subscriptionSchema.statics.consumeInvites = async function (subscriptionId, count) {
  const sub = await this.findOneAndUpdate(
    {
      _id: subscriptionId,
      $expr: {
        $lte: [
          { $add: ['$invitesConsumed', count] },
          { $add: [{ $ifNull: ['$invitePool', 0] }, { $ifNull: ['$compensationPool', 0] }] },
        ],
      },
    },
    { $inc: { invitesConsumed: count } },
    { new: true }
  );
  if (!sub) throw new Error('Insufficient invites or subscription not found');
  return sub;
};

/**
 * Release invites back to a subscription
 * @param {ObjectId} subscriptionId
 * @param {number} count
 * @returns {Promise<Subscription>}
 */
subscriptionSchema.statics.releaseInvites = async function (subscriptionId, count) {
  return this.findByIdAndUpdate(
    subscriptionId,
    { $inc: { invitesConsumed: -count } },
    { new: true }
  );
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
    .filter(s => isPerEventPlan(s.planId?.planType) && !s.eventId && (s.usage?.eventsCreated || 0) < 1)
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
 * @param {ObjectId} whitelabelId - Optional
 * @returns {Promise<Object>}
 */
subscriptionSchema.statics.getStats = async function (whitelabelId = null) {
  const matchStage = {};
  if (whitelabelId !== undefined) {
    matchStage.whitelabelId = whitelabelId;
  }

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

/**
 * Get whitelabel subscriptions
 * @param {ObjectId} whitelabelId
 * @returns {Promise<Subscription[]>}
 */
subscriptionSchema.statics.findForWhitelabel = async function (whitelabelId) {
  return this.find({
    whitelabelId,
    status: { $in: [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.TRIAL] },
  })
    .populate("planId")
    .populate("userId", "name email phoneNumber");
};

// ============================================
// CREATE MODEL
// ============================================

const Subscription = mongoose.model("Subscription", subscriptionSchema);

module.exports = Subscription;
