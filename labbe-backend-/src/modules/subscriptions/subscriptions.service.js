/**
 * Subscriptions Service
 * Business logic for subscription management - NO HTTP concerns
 * @module modules/subscriptions/subscriptions.service
 */

const config = require('../../config');
const {
  SUBSCRIPTION_STATUS,
  PLAN_TYPES,
  BILLING_CYCLES,
  ROLES,
} = require('../../shared/constants');
const {
  NotFoundError,
  ValidationError,
  PackageLimitError,
  PaymentRequiredError,
} = require('../../shared/errors');

// Import existing models during migration
const Subscription = require('../../../models/SubscriptionModel');
const Plan = require('../../../models/PlanModel');
const User = require('../../../models/UserModel');
const BusinessSetupFee = require('../../../models/BusinessSetupFeeModel');
const { isPerEventPlan, isPoolPlan, COMPENSATION_PERCENTAGE } = require('../../shared/constants/plans');
const notificationService = require('../notifications/notifications.service');

class SubscriptionsService {
  // ============================================
  // INTEGRATED PACKAGESERVICE METHODS
  // ============================================

  /**
   * Validate if user can create an event
   * @param {Object} subscription - User's subscription object
   * @param {number} guestCount - Number of guests for the event
   * @param {string|null} userId - User ID for dynamic event counting
   * @returns {Promise<Object>} {allowed: boolean, reason: string, limits: Object}
   */
  async validateEventCreation(subscription, guestCount = 0, userId = null) {
    if (!subscription) {
      return {
        allowed: false,
        reason: "No active subscription found. Please subscribe to a plan to create events.",
        limits: null,
      };
    }

    // FIX Bug 3: Accept both active and trial
    if (!["active", "trial"].includes(subscription.status)) {
      return {
        allowed: false,
        reason: `Subscription is ${subscription.status}. Please activate your subscription to create events.`,
        limits: null,
      };
    }

    // FIX Bugs 1,2: Dynamic event count for billing period
    let dynamicEventCount = null;
    if (userId && subscription.limits?.maxEventsPerMonth > 0) {
      dynamicEventCount = await this.countEventsInBillingPeriod(userId, subscription);
    }

    const limits = this._getPackageLimits(subscription, dynamicEventCount);

    // Check event limit
    if (limits.maxEventsPerMonth !== -1 && limits.eventsRemaining <= 0) {
      return {
        allowed: false,
        reason: `You have reached your monthly event limit of ${limits.maxEventsPerMonth} events. Please upgrade your plan or wait for next month.`,
        limits,
      };
    }

    // Check guest limit
    if (guestCount > 0) {
      if (limits.totalGuestLimit !== -1 && guestCount > limits.totalGuestLimit) {
        return {
          allowed: false,
          reason: `Guest count (${guestCount}) exceeds your limit of ${limits.totalGuestLimit} guests per event. Please reduce guests or upgrade your plan.`,
          limits,
        };
      }
    }

    return { allowed: true, reason: "", limits };
  }

  /**
   * Count events created in the current billing period (dynamic counting)
   * @param {string} userId
   * @param {Object} subscription
   * @returns {Promise<number>}
   */
  async countEventsInBillingPeriod(userId, subscription) {
    const Event = require('../../../models/EventModel');
    const billingStart = subscription.getBillingPeriodStart
      ? subscription.getBillingPeriodStart()
      : (subscription.startDate || subscription.createdAt);
    return Event.countDocuments({
      host: userId,
      createdAt: { $gte: billingStart },
      status: { $ne: 'deleted' },
    });
  }

  /**
   * Get package limits for a subscription
   * @param {Object} subscription
   * @param {number|null} dynamicEventCount - If provided, use this instead of usage counters
   * @private
   */
  _getPackageLimits(subscription, dynamicEventCount = null) {
    if (!subscription) {
      return {
        maxEventsPerMonth: 0,
        maxGuestsPerEvent: 0,
        eventsUsed: 0,
        eventsRemaining: 0,
        totalGuestLimit: 0,
      };
    }

    const planType = subscription.planId?.planType || subscription.planType;

    // Pool plans: return pool-based limits
    if (isPoolPlan(planType)) {
      const invitePool = subscription.invitePool ?? subscription.limits?.invitePool ?? 0;
      const compensationPool = subscription.compensationPool ?? Math.floor(invitePool * 0.15);
      const invitesConsumed = subscription.invitesConsumed || 0;
      const invitesRemaining = Math.max(0, invitePool + compensationPool - invitesConsumed);
      return {
        invitePool,
        compensationPool,
        invitesConsumed,
        invitesRemaining,
      };
    }

    // Per-event plans: return per-event limits
    if (isPerEventPlan(planType)) {
      const maxInvitesPerEvent = subscription.limits?.maxInvitesPerEvent ?? subscription.limits?.maxGuestsPerEvent ?? 0;
      const maxEvents = subscription.limits?.maxEvents || 1;
      return {
        maxInvitesPerEvent,
        maxEvents,
      };
    }

    // Fallback (legacy / unknown plan types)
    const maxEvents = subscription.limits?.maxEventsPerMonth || 0;
    const maxGuests = subscription.limits?.maxInvitesPerEvent ?? subscription.limits?.maxGuestsPerEvent ?? 0;
    const addOnGuests = subscription.addOns?.extraGuests || 0;
    const totalGuestLimit = maxGuests === -1 ? -1 : maxGuests + addOnGuests;

    const eventsUsed = dynamicEventCount !== null
      ? dynamicEventCount
      : (subscription.usage?.eventsCreated || 0);
    const eventsRemaining = maxEvents === -1 ? -1 : Math.max(0, maxEvents - eventsUsed);

    let compensationInvites = 0;
    if (
      subscription.features?.hasCompensationInvites &&
      maxGuests > 0 &&
      maxGuests !== -1
    ) {
      const percentage = subscription.features?.compensationPercentage || COMPENSATION_PERCENTAGE;
      compensationInvites = Math.floor(maxGuests * (percentage / 100));
    }

    return {
      maxEventsPerMonth: maxEvents,
      maxInvitesPerEvent: maxGuests,
      maxGuestsPerEvent: maxGuests, // alias for backward compat
      addOnGuests,
      compensationInvites,
      totalGuestLimit: totalGuestLimit === -1 ? -1 : totalGuestLimit + compensationInvites,
      eventsUsed,
      eventsRemaining,
      isUnlimited: maxEvents === -1,
    };
  }

  /**
   * Validate guest limit for a subscription (by ID)
   * @param {string} subscriptionId - Subscription ID
   * @param {number} guestCount - Number of guests to validate
   * @returns {Promise<Object>}
   */
  async validateGuestLimit(subscriptionId, guestCount) {
    const subscription = await Subscription.findById(subscriptionId).populate("planId");
    if (!subscription) {
      return { allowed: false, message: "Subscription not found", limit: 0 };
    }

    const result = subscription.canAddGuests(guestCount);
    return {
      allowed: result.allowed,
      message: result.reason || "",
      limit: result.maxAllowed,
    };
  }

  /**
   * Validate moderator limit for a subscription (by ID)
   * @param {string} subscriptionId - Subscription ID
   * @param {number} moderatorCount - Number of moderators to validate
   * @returns {Promise<Object>}
   */
  async validateModeratorLimit(subscriptionId, moderatorCount) {
    const subscription = await Subscription.findById(subscriptionId).populate("planId");
    if (!subscription) {
      return { allowed: false, message: "Subscription not found", limit: 0 };
    }

    // Moderator limits are typically in metadata.teamLimit
    const teamLimit = subscription.planId?.metadata?.teamLimit || 5;
    if (teamLimit === -1) {
      return { allowed: true, message: "", limit: -1 };
    }

    if (moderatorCount > teamLimit) {
      return {
        allowed: false,
        message: `Moderator limit exceeded. Maximum ${teamLimit} moderators allowed.`,
        limit: teamLimit,
      };
    }

    return { allowed: true, message: "", limit: teamLimit };
  }

  /**
   * Check if subscription can access a feature
   * @param {Object} subscription - Subscription object
   * @param {string} featureName - Feature to check
   * @returns {boolean}
   */
  canAccessFeature(subscription, featureName) {
    if (!subscription || !subscription.features) {
      return false;
    }
    return subscription.features[featureName] === true;
  }

  // ============================================
  // SUBSCRIPTION QUERIES
  // ============================================

  /**
   * Get user's active subscription
   * @param {string} userId
   * @returns {Promise<Object|null>}
   */
  async getMySubscription(userId) {
    const subscriptions = await Subscription.findActiveForUser(userId);
    return subscriptions.map(sub => sub.getSummary());
  }

  /**
   * Get subscription by ID
   * @param {string} subscriptionId
   * @returns {Promise<Object>}
   */
  async getSubscriptionById(subscriptionId) {
    const subscription = await Subscription.findById(subscriptionId)
      .populate('planId')
      .populate('userId', 'name email phoneNumber role');

    if (!subscription) {
      throw new NotFoundError('Subscription');
    }

    return subscription.getSummary ? subscription.getSummary() : subscription;
  }

  // ============================================
  // SUBSCRIPTION CREATION
  // ============================================

  /**
   * Create a new subscription
   * @param {string} userId
   * @param {Object} subscriptionData
   * @returns {Promise<Object>}
   */
  async subscribe(userId, subscriptionData) {
    const { planCode, discountCode } = subscriptionData;

    // Get or create plan
    const plan = await Plan.getOrCreateByCode(planCode);
    if (!plan) {
      throw new ValidationError('Invalid plan code');
    }

    // Validate plan availability for user's role
    const user = await User.findById(userId);
    if (plan.availableFor === 'whitelabel' && user.role !== ROLES.WHITELABEL_ADMIN) {
      throw new ValidationError('This plan is only available for whitelabel accounts');
    }
    if (plan.availableFor === 'host' && ![ROLES.HOST].includes(user.role)) {
      throw new ValidationError('This plan is not available for your account type');
    }

    // Prevent trial re-subscription
    if (planCode === 'trial') {
      const hadSubscriptionBefore = await Subscription.findOne({
        userId,
        status: { $ne: SUBSCRIPTION_STATUS.CANCELLED },
      });
      if (hadSubscriptionBefore) {
        throw new ValidationError('Trial plan can only be used once. Please choose a paid plan.');
      }
    }

    // Business event plans require setup fee to be paid
    if (plan.planType === 'business_event') {
      const setupFee = await BusinessSetupFee.findOne({ organizationId: userId, status: 'paid' });
      if (!setupFee) throw new Error('Business setup fee must be paid before subscribing to business event plans');
    }

    // Concurrent subscriptions are allowed — do NOT cancel existing

    // Create new subscription
    const subscription = await Subscription.createForUser(userId, plan, {
      createdBy: {
        user: userId,
        onBehalfOf: false,
      },
    });

    // Apply discount if code was provided
    if (discountCode) {
      try {
        const discountsService = require('../discounts/discounts.service');
        await discountsService.applyDiscount(discountCode);
      } catch (e) {
        // Non-fatal — subscription was created; discount increment failure is logged only
        console.error('Failed to increment discount usage:', e.message);
      }
    }

    // Update user's subscription reference
    await User.findByIdAndUpdate(userId, { subscription: subscription._id });

    // Mark that user has subscribed before
    await User.findByIdAndUpdate(userId, {
      'profile.hostData.subscribedBefore': true,
    });

    // Notify user of new subscription (non-blocking)
    notificationService.sendToUser(userId, {
      type: 'subscription_activated',
      title: 'Subscription Activated',
      titleAr: 'تم تفعيل الاشتراك',
      message: `Your ${planCode} subscription has been activated successfully.`,
      messageAr: `تم تفعيل اشتراكك في باقة ${planCode} بنجاح.`,
      data: { entityType: 'subscription', entityId: subscription._id, metadata: { planCode } },
    }).catch(console.error);

    return subscription.getSummary ? subscription.getSummary() : subscription;
  }

  /**
   * Change subscription plan (upgrade or downgrade)
   * @param {string} userId
   * @param {string} newPlanCode
   * @returns {Promise<Object>}
   */
  async changePlan(userId, newPlanCode) {
    const subscriptions = await Subscription.findActiveForUser(userId);
    const currentSubscription = subscriptions[0] || null;

    if (!currentSubscription) {
      throw new NotFoundError('No active subscription to change');
    }

    const newPlan = await Plan.getOrCreateByCode(newPlanCode);
    if (!newPlan) {
      throw new ValidationError('Invalid plan code');
    }

    // Prevent changing to same plan
    if (currentSubscription.planId?.toString() === newPlan._id.toString()) {
      throw new ValidationError('You are already on this plan');
    }

    // Mark old subscription as changed
    currentSubscription.status = SUBSCRIPTION_STATUS.CANCELLED;
    currentSubscription.cancelReason = `Changed to ${newPlanCode}`;
    currentSubscription.cancelledAt = new Date();
    await currentSubscription.save();

    // Create new subscription
    const newSubscription = await Subscription.createForUser(userId, newPlan, {
      billingCycle: currentSubscription.billingCycle,
      changedFrom: currentSubscription._id,
    });

    // Carry forward event usage to prevent gaming
    if (currentSubscription.usage) {
      newSubscription.usage.eventsCreated = currentSubscription.usage.eventsCreated || 0;
      newSubscription.usage.guestsUsed = currentSubscription.usage.guestsUsed || 0;
      newSubscription.usage.totalGuests = currentSubscription.usage.totalGuests || 0;
      await newSubscription.save();
    }

    await User.findByIdAndUpdate(userId, { subscription: newSubscription._id });

    // Notify user of plan change (non-blocking)
    notificationService.sendToUser(userId, {
      type: 'subscription_changed',
      title: 'Subscription Plan Changed',
      titleAr: 'تم تغيير باقة الاشتراك',
      message: `Your subscription plan has been changed to ${newPlanCode}.`,
      messageAr: `تم تغيير باقة اشتراكك إلى ${newPlanCode}.`,
      data: { entityType: 'subscription', entityId: newSubscription._id, metadata: { newPlanCode } },
    }).catch(console.error);

    return newSubscription.getSummary ? newSubscription.getSummary() : newSubscription;
  }

  /**
   * Cancel subscription
   * @param {string} userId
   * @param {string} reason
   * @returns {Promise<Object>}
   */
  async cancelSubscription(userId, reason = '') {
    const subscriptions = await Subscription.findActiveForUser(userId);
    const subscription = subscriptions[0] || null;

    if (!subscription) {
      throw new NotFoundError('No active subscription to cancel');
    }

    subscription.status = SUBSCRIPTION_STATUS.CANCELLED;
    subscription.cancelledAt = new Date();
    subscription.cancelReason = reason || 'User cancelled';
    await subscription.save();

    // Notify user of cancellation (non-blocking)
    notificationService.sendToUser(userId, {
      type: 'subscription_cancelled',
      title: 'Subscription Cancelled',
      titleAr: 'تم إلغاء الاشتراك',
      message: 'Your subscription has been cancelled. You can resubscribe at any time.',
      messageAr: 'تم إلغاء اشتراكك. يمكنك الاشتراك مرة أخرى في أي وقت.',
      data: { entityType: 'subscription', entityId: subscription._id },
    }).catch(console.error);

    return subscription.getSummary ? subscription.getSummary() : subscription;
  }

  // ============================================
  // PACKAGE/LIMIT VALIDATION
  // ============================================

  /**
   * Validate action against package limits
   * @param {string} userId
   * @param {string} action - 'event' | 'guest' | 'moderator'
   * @param {number} [count=1]
   * @returns {Promise<Object>}
   */
  async validateLimits(userId, action, count = 1) {
    const subscriptions = await Subscription.findActiveForUser(userId);
    const subscription = subscriptions[0] || null;

    if (!subscription) {
      throw new PaymentRequiredError('No active subscription found');
    }

    let validation;

    switch (action) {
      case 'event':
        validation = await this.validateEventCreation(subscription, 0, userId);
        break;

      case 'guest':
        validation = await this.validateGuestLimit(subscription._id, count);
        break;

      case 'moderator':
        validation = await this.validateModeratorLimit(subscription._id, count);
        break;

      default:
        throw new ValidationError(`Unknown action type: ${action}`);
    }

    return validation;
  }

  /**
   * Check if user can access a feature
   * @param {string} userId
   * @param {string} featureName
   * @returns {Promise<boolean>}
   */
  async canAccessFeature(userId, featureName) {
    const subscriptions = await Subscription.findActiveForUser(userId);
    const subscription = subscriptions[0] || null;

    if (!subscription) {
      return false;
    }

    return subscription.planId?.features?.[featureName] === true;
  }

  /**
   * Get package limits for user
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async getPackageLimits(userId) {
    const subscriptions = await Subscription.findActiveForUser(userId);
    const subscription = subscriptions[0] || null;
    return this._getPackageLimits(subscription);
  }

  /**
   * Increment usage counter
   * @param {string} userId
   * @param {string} usageType - 'events' | 'guests' | 'sms' | 'whatsapp'
   * @param {number} [amount=1]
   * @returns {Promise<void>}
   */
  async incrementUsage(userId, usageType, amount = 1) {
    const subscriptions = await Subscription.findActiveForUser(userId);
    const subscription = subscriptions[0] || null;

    if (!subscription) {
      throw new PaymentRequiredError('No active subscription');
    }

    const usageField = {
      events: 'usage.eventsCreated',
      guests: 'usage.guestsUsed',
      sms: 'usage.smsUsed',
      whatsapp: 'usage.whatsappUsed',
    };

    if (!usageField[usageType]) {
      throw new ValidationError(`Unknown usage type: ${usageType}`);
    }

    await Subscription.findByIdAndUpdate(subscription._id, {
      $inc: { [usageField[usageType]]: amount },
    });
  }

  // ============================================
  // PLANS
  // ============================================

  /**
   * Get all available plans
   * @param {string} [forRole='host'] - 'host' | 'whitelabel'
   * @returns {Promise<Array>}
   */
  async getAvailablePlans(forRole = 'host') {
    const plans = await Plan.find({
      availableFor: forRole,
      isActive: true,
      isPublic: true,
    }).sort({ sortOrder: 1 });

    return plans.map((plan) => this._formatPlan(plan));
  }

  /**
   * Get plan by code
   * @param {string} planCode
   * @returns {Promise<Object>}
   */
  async getPlanByCode(planCode) {
    const plan = await Plan.getOrCreateByCode(planCode);

    if (!plan) {
      throw new NotFoundError('Plan');
    }

    return this._formatPlan(plan);
  }

  /**
   * Format plan for response
   * @private
   */
  _formatPlan(plan) {
    return {
      id: plan._id,
      code: plan.code,
      name: plan.name,
      nameAr: plan.nameAr,
      description: plan.description,
      descriptionAr: plan.descriptionAr,
      planType: plan.planType,
      pricing: plan.pricing,
      limits: plan.limits,
      features: plan.features,
      isPopular: plan.isPopular,
      sortOrder: plan.sortOrder,
    };
  }
}

module.exports = new SubscriptionsService();
