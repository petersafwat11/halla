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
const { logAudit } = require('../../shared/utils/auditLog');
const paymentProvider = require('../../infrastructure/paymentProvider');

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

    // FLOW-12-F01 / FLOW-09-F02: a host can never have two active
    // subscriptions. Direct subscribe() now matches changePlan() — any
    // existing active sub is cancelled before the new one is created.
    //
    // B-3 fix: cancel the old subscription **AFTER** the charge succeeds.
    // The previous order (cancel → charge) left the user with no active
    // subscription if the charge failed — a brutal UX failure mode. We now
    // (1) snapshot existing active subs, (2) charge, (3) cancel old subs
    // only on charge success. If creation of the new subscription throws
    // after a successful charge, we attempt to refund (best-effort) and
    // surface a "money taken, please contact support" error rather than
    // leave a silent inconsistency.
    const existingActive = await Subscription.find({
      userId,
      status: { $in: [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.TRIAL] },
    });

    // Phase 2 (FLOW-09-F01 / trial guard): Plan schema stores price in
    // `pricing.oneTime`. Free / trial plans must skip the payment provider —
    // the stub returns synthetic success today, but real Moyasar rejects
    // zero-amount charges.
    const planPrice = plan?.pricing?.oneTime ?? 0;
    const isFreePlan = planCode === 'trial' || planPrice <= 0;

    // Idempotency: explicit Idempotency-Key from client (preferred) OR a
    // server-derived key tied to (userId, planCode, intent fingerprint).
    // The derived key prevents double-charge on double-tap when the client
    // forgets the header — combined with the compound {userId,scope,key}
    // unique index in IdempotencyKeyModel (H-5), accidental cross-user
    // collision is impossible.
    let paymentTransactionId = null;
    if (!isFreePlan) {
      const derivedKey =
        subscriptionData?.idempotencyKey
          || `subscribe:${userId}:${plan.code}:${planPrice}`;
      const chargeParams = {
        amount: planPrice,
        currency: plan?.currency || 'SAR',
        customer: { id: userId },
        userId, // H-5: scope cache-row by user
        idempotencyKey: derivedKey,
        metadata: {
          planCode: plan.code,
          discountCode,
          description: `Subscription to ${plan.code}`,
        },
      };
      const charge = await paymentProvider.charge(chargeParams);
      if (!charge.success) {
        throw new ValidationError(
          // H-11: don't leak provider error string to client; log it,
          // surface a generic message.
          (() => {
            try {
              // eslint-disable-next-line no-console
              console.error(
                '[subscribe] payment provider error:',
                charge.error || charge.providerStatus || 'unknown'
              );
            } catch (_) { /* swallow */ }
            return 'Payment failed; subscription not activated';
          })()
        );
      }
      paymentTransactionId = charge.transactionId || null;
    }

    // B-3: charge succeeded (or wasn't needed) — NOW cancel the old subs.
    // If this loop throws (very unlikely; just save() calls), the new
    // subscription create below will not run and we'll be left with the
    // old sub still active and a money charge already taken. We log the
    // partial failure so ops can reconcile.
    for (const existing of existingActive) {
      try {
        existing.status = SUBSCRIPTION_STATUS.CANCELLED;
        existing.cancelledAt = new Date();
        existing.cancelReason = `Auto-cancelled on new subscribe to ${planCode}`;
        await existing.save();
      } catch (cancelErr) {
        // eslint-disable-next-line no-console
        console.error(
          '[subscribe] failed to cancel existing subscription %s after charge: %s',
          existing._id,
          cancelErr?.message
        );
        // Continue — better to have two active subs than to refund the
        // user. Operations can clean this up; the audit log captures it.
      }
    }

    // Create new subscription.
    //
    // HIGH-6 review: if anything from this point through subscription.save()
    // throws AFTER a successful charge, we have a money-taken-no-benefit
    // case symmetric to addons.purchase (B-4). Wrap and emit the same
    // pending-refund signal so on-call can reconcile.
    let subscription;
    try {
      subscription = await Subscription.createForUser(userId, plan, {
        pricePaid: isFreePlan ? 0 : planPrice,
        currency: plan?.currency || 'SAR',
        status: planCode === 'trial' ? SUBSCRIPTION_STATUS.TRIAL : SUBSCRIPTION_STATUS.ACTIVE,
        createdBy: {
          user: userId,
          onBehalfOf: false,
        },
      });

      // FLOW-09-F02: trial duration is **14 days** regardless of the
      // plan's configured durationDays. createForUser reads
      // plan.limits.durationDays (currently 90 for the trial plan, used
      // for event-creation lifecycle math); we override expiresAt here so
      // the daily expiry cron transitions the trial subscription to
      // `expired` after two weeks. Documented in PHASE_2_PLAN.md.
      if (planCode === 'trial') {
        const TRIAL_DURATION_DAYS = 14;
        const trialExpiresAt = new Date(
          (subscription.activatedAt || subscription.createdAt).getTime()
            + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000
        );
        subscription.expiresAt = trialExpiresAt;
      }

      if (paymentTransactionId) {
        subscription.metadata = {
          ...(subscription.metadata || {}),
          paymentTransactionId,
        };
      }

      if (planCode === 'trial' || paymentTransactionId) {
        await subscription.save();
      }
    } catch (createErr) {
      // HIGH-6: payment succeeded but the subscription record didn't
      // land. Record a pending-refund audit row + admin alert; surface
      // a clear "money taken" error.
      if (paymentTransactionId) {
        try {
          await this._recordPendingRefund({
            userId,
            amount: planPrice,
            currency: plan?.currency || 'SAR',
            paymentTransactionId,
            reason: 'subscribe_create_failed',
            detail: createErr?.message,
            planCode: plan?.code,
          });
        } catch (refundLogErr) {
          // eslint-disable-next-line no-console
          console.error(
            '[subscribe] _recordPendingRefund logAudit failed:',
            refundLogErr?.message
          );
        }
        throw new ValidationError(
          'Payment was processed but the subscription could not be activated. '
            + 'Our team has been notified — please contact support with your transaction reference.'
        );
      }
      // No charge → just rethrow.
      throw createErr;
    }

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
   * Admin-assign a plan to a user. Skips payment (admin-assigned plans
   * are free or billed externally). Auto-cancels any existing active
   * subscription for the target user. Designed to be called from a
   * SUPER_ADMIN-only route with audit + idempotency middleware wired in.
   *
   * @param {string} adminUserId   - the acting admin
   * @param {Object} input         - { userId, planCode, notes }
   * @returns {Promise<Object>}
   */
  async assignSubscription(adminUserId, input) {
    const { userId, planCode, notes } = input || {};
    if (!userId) throw new ValidationError('userId is required');
    if (!planCode) throw new ValidationError('planCode is required');

    const targetUser = await User.findById(userId);
    if (!targetUser) throw new NotFoundError('User');

    const plan = await Plan.getOrCreateByCode(planCode);
    if (!plan) throw new ValidationError('Invalid plan code');

    // FLOW-12-F01 / FLOW-09-F02: enforce single-active invariant.
    //
    // MED-8 review: emit a per-cancellation audit row so the admin's
    // override leaves a forensic trail (who, what was active before,
    // why). The route-level audit middleware records the assign; this
    // covers the cancellations that the assign implies.
    const existingActive = await Subscription.find({
      userId,
      status: { $in: [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.TRIAL] },
    });
    for (const existing of existingActive) {
      const before = { status: existing.status, planId: existing.planId };
      existing.status = SUBSCRIPTION_STATUS.CANCELLED;
      existing.cancelledAt = new Date();
      existing.cancelReason = `Auto-cancelled on admin-assign to ${planCode}`;
      await existing.save();
      try {
        await logAudit({
          action: 'subscription.auto_cancelled',
          actor: { _id: adminUserId, role: ROLES.SUPER_ADMIN },
          targetType: 'subscription',
          targetId: existing._id,
          whitelabelId: existing.whitelabelId || null,
          changes: { before, after: { status: SUBSCRIPTION_STATUS.CANCELLED } },
          metadata: {
            userId,
            triggeredBy: 'admin_assign',
            newPlanCode: planCode,
          },
        });
      } catch (auditErr) {
        // eslint-disable-next-line no-console
        console.warn(
          '[assignSubscription] audit failed for cancelled sub %s: %s',
          existing._id,
          auditErr?.message
        );
      }
    }

    const subscription = await Subscription.createForUser(userId, plan, {
      pricePaid: 0,
      currency: plan?.currency || 'SAR',
      status: planCode === 'trial' ? SUBSCRIPTION_STATUS.TRIAL : SUBSCRIPTION_STATUS.ACTIVE,
      whitelabelId: targetUser.whitelabelId || null,
      createdBy: { user: adminUserId, role: ROLES.SUPER_ADMIN, onBehalfOf: true },
    });

    if (planCode === 'trial') {
      const TRIAL_DURATION_DAYS = 14;
      subscription.expiresAt = new Date(
        (subscription.activatedAt || subscription.createdAt).getTime()
          + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000
      );
    }

    if (notes) subscription.notes = notes;
    subscription.metadata = {
      ...(subscription.metadata || {}),
      assignedBy: adminUserId,
      assignedAt: new Date().toISOString(),
    };
    await subscription.save();

    await User.findByIdAndUpdate(userId, { subscription: subscription._id });

    notificationService.sendToUser(userId, {
      type: 'subscription_activated',
      title: 'Subscription Activated',
      titleAr: 'تم تفعيل الاشتراك',
      message: `An administrator activated your ${planCode} subscription.`,
      messageAr: `قام أحد المسؤولين بتفعيل اشتراك ${planCode} الخاص بك.`,
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

  /**
   * HIGH-6 review: subscription parallel of `addons.service._recordPendingRefund`.
   *
   * Called when a charge succeeded but the subsequent
   * `Subscription.createForUser` / `save()` failed. Records a structured
   * audit row + admin notification so on-call can reconcile (refund or
   * manual create) without losing the trail.
   *
   * Idempotent at the audit-row level: re-runs of the same failure
   * surface a fresh row, but the dedup happens via `paymentTransactionId`
   * downstream.
   */
  async _recordPendingRefund({
    userId,
    amount,
    currency,
    paymentTransactionId,
    reason,
    detail,
    planCode,
  }) {
    // eslint-disable-next-line no-console
    console.error(
      '[subscribe] PENDING REFUND %s userId=%s amount=%s tx=%s detail=%s',
      reason,
      userId,
      amount,
      paymentTransactionId || 'n/a',
      detail || 'n/a'
    );
    await logAudit({
      action: 'subscription.pending_refund',
      actor: { _id: userId, role: 'host' },
      targetType: 'system',
      targetId: paymentTransactionId || userId,
      metadata: {
        reason,
        amount,
        currency,
        paymentTransactionId,
        planCode,
        detail,
      },
      status: 'failure',
    });
    try {
      await notificationService.sendToAdmins({
        type: 'subscription_pending_refund',
        title: 'Subscription purchase requires refund',
        titleAr: 'اشتراك يحتاج إلى استرداد',
        message:
          `Charge succeeded but the subscription record could not be created. `
          + `Tx ${paymentTransactionId || 'n/a'} userId ${userId} plan ${planCode || 'n/a'}.`,
        data: {
          entityType: 'subscription',
          entityId: paymentTransactionId || userId,
          metadata: { reason, amount, currency, paymentTransactionId, planCode },
        },
        priority: 'high',
      });
    } catch (notifyErr) {
      // eslint-disable-next-line no-console
      console.warn(
        '[subscribe] _recordPendingRefund admin notify failed:',
        notifyErr?.message
      );
    }
  }
}

module.exports = new SubscriptionsService();
