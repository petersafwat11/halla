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
const Payment = require('../../../models/PaymentModel');
const BusinessSetupFee = require('../../../models/BusinessSetupFeeModel');
const { isPerEventPlan, isPoolPlan, COMPENSATION_PERCENTAGE } = require('../../shared/constants/plans');
const notificationService = require('../notifications/notifications.service');
const { logAudit } = require('../../shared/utils/auditLog');
const paymentProvider = require('../../infrastructure/paymentProvider');
const Addon = require('../../../models/AddonModel');
const { ADDON_TYPES } = require('../../shared/constants/addons');

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

    // Dynamic event count only matters when the plan caps total events (maxEvents > 0).
    // Pool plans have maxEvents = -1 (unlimited events; cap is invitePool).
    let dynamicEventCount = null;
    const maxEvents = subscription.limits?.maxEvents;
    if (userId && maxEvents > 0) {
      dynamicEventCount = await this.countEventsInBillingPeriod(userId, subscription);
    }

    // FLOW-12-F02: read active extra_invites addons from Addon collection
    const addonExtraGuests = await this._getAddonExtraGuests(subscription._id);
    const limits = this._getPackageLimits(subscription, dynamicEventCount, addonExtraGuests);

    // Check event limit (only applies when the plan has a finite maxEvents)
    if (limits.maxEvents > 0 && limits.eventsRemaining <= 0) {
      return {
        allowed: false,
        reason: `You have reached your event limit of ${limits.maxEvents} events. Please upgrade your plan.`,
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
   * Sum active extra_invites addons for a subscription (FLOW-12-F02)
   * @param {ObjectId} subscriptionId
   * @returns {Promise<number>}
   * @private
   */
  async _getAddonExtraGuests(subscriptionId) {
    if (!subscriptionId) return 0;
    const result = await Addon.aggregate([
      { $match: { subscriptionId, addonType: ADDON_TYPES.EXTRA_INVITES, status: 'active' } },
      { $group: { _id: null, total: { $sum: '$quantity' } } },
    ]);
    return result[0]?.total || 0;
  }

  /**
   * Get package limits for a subscription
   * @param {Object} subscription
   * @param {number|null} dynamicEventCount - If provided, use this instead of usage counters
   * @param {number} addonExtraGuests - Pre-fetched active addon quantity (FLOW-12-F02)
   * @private
   */
  _getPackageLimits(subscription, dynamicEventCount = null, addonExtraGuests = 0) {
    if (!subscription) {
      return {
        maxEvents: 0,
        eventsUsed: 0,
        eventsRemaining: 0,
        totalGuestLimit: 0,
      };
    }

    const planType = subscription.planId?.planType || subscription.planType;
    const eventsUsed = dynamicEventCount !== null
      ? dynamicEventCount
      : (subscription.usage?.eventsCreated || 0);

    // Pool plans: events are unlimited; the cap is the invite pool.
    if (isPoolPlan(planType)) {
      const invitePool = subscription.invitePool ?? 0;
      const compensationPool = subscription.compensationPool ?? 0;
      const invitesConsumed = subscription.invitesConsumed || 0;
      const invitesRemaining = Math.max(0, invitePool + compensationPool - invitesConsumed);
      return {
        maxEvents: -1,
        eventsUsed,
        eventsRemaining: -1,
        invitePool,
        compensationPool,
        invitesConsumed,
        invitesRemaining,
      };
    }

    // Per-event plans: 1 event, fixed maxInvitesPerEvent.
    if (isPerEventPlan(planType)) {
      const maxEvents = subscription.limits?.maxEvents ?? 1;
      const maxInvitesPerEvent = subscription.limits?.maxInvitesPerEvent ?? 0;
      return {
        maxEvents,
        maxInvitesPerEvent,
        eventsUsed,
        eventsRemaining: maxEvents === -1 ? -1 : Math.max(0, maxEvents - eventsUsed),
      };
    }

    // Generic plans (e.g. unlimited platform plan).
    const maxEvents = subscription.limits?.maxEvents ?? -1;
    const maxGuests = subscription.limits?.maxInvitesPerEvent ?? 0;
    const totalGuestLimit = maxGuests === -1 ? -1 : maxGuests + addonExtraGuests;
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
      maxEvents,
      maxInvitesPerEvent: maxGuests,
      addOnGuests: addonExtraGuests,
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
    // ─── Charge ───────────────────────────────────────────────────
    // Only `paymentRecord` is the source of truth for the charge. The
    // legacy `paymentTransactionId` local + subscription.metadata field
    // have been removed (§2.1) — `subscription.metadata.paymentId`
    // refers to the Payment row, which carries the moyasarPaymentId.
    let paymentRecord = null;
    let pendingRedirect = null;

    if (!isFreePlan) {
      const derivedKey =
        subscriptionData?.idempotencyKey
          || `subscribe:${userId}:${plan.code}:${planPrice}`;

      const callbackUrl =
        (subscriptionData?.callbackUrl)
          || `${process.env.FRONTEND_URL || ''}/host/payments/return`;

      const chargeParams = {
        amount: planPrice,
        currency: plan?.currency || 'SAR',
        // Default `creditcard` is the stub's immediate-paid path. Tests
        // that need to exercise the 3DS redirect/poll flow opt in by
        // passing `source: { type: 'creditcard_3ds_test' }`. The real
        // frontend always sends a populated `source` in production.
        source: subscriptionData?.source || { type: 'creditcard' },
        customer: { id: userId },
        callbackUrl,
        userId,
        idempotencyKey: derivedKey,
        description: `Subscription to ${plan.code}`,
        metadata: {
          planCode: plan.code,
          discountCode,
          purpose: 'subscription',
          userId: String(userId),
        },
      };

      // Pre-create a Payment row in `pending` so we have a stable id
      // before we hit Moyasar. If the charge call itself throws, we
      // mark the row failed; if it succeeds (paid / authorized /
      // initiated) we update accordingly.
      paymentRecord = await Payment.create({
        userId,
        whitelabelId: user.whitelabelId || null,
        amount: planPrice,
        currency: plan?.currency || 'SAR',
        provider: 'moyasar',
        status: Payment.PAYMENT_STATUS.PENDING,
        callbackUrl,
        description: `Subscription to ${plan.code}`,
        // `purpose` is the dispatch key used by webhook/reconcile/poll
        // to decide which finalizePending3ds path to call.
        metadata: { planCode: plan.code, discountCode, purpose: 'subscription' },
      });

      const charge = await paymentProvider.charge(chargeParams);

      if (!charge.success) {
        paymentRecord.status = Payment.PAYMENT_STATUS.FAILED;
        paymentRecord.failedAt = new Date();
        paymentRecord.providerStatus = charge.providerStatus || charge.error || 'unknown';
        await paymentRecord.save().catch(() => {});

        // eslint-disable-next-line no-console
        console.error(
          '[subscribe] payment provider error:',
          charge.error || charge.providerStatus || 'unknown'
        );
        throw new ValidationError('Payment failed; subscription not activated');
      }

      paymentRecord.moyasarPaymentId = charge.transactionId;
      paymentRecord.givenId = charge.givenId || null;
      paymentRecord.providerStatus = charge.providerStatus;
      paymentRecord.fee = charge.fee || 0;
      if (charge.paymentMethod) paymentRecord.paymentMethod = charge.paymentMethod;

      if (charge.requiresAction) {
        // 3DS: don't activate the subscription yet. Save the redirect
        // URL on the payment, return it to the controller, and let the
        // webhook (or the frontend's polling page) finish the job.
        paymentRecord.status = Payment.PAYMENT_STATUS.PENDING_3DS;
        paymentRecord.redirectUrl = charge.redirectUrl;
        await paymentRecord.save();
        pendingRedirect = charge.redirectUrl;
      } else {
        paymentRecord.status = charge.providerStatus === 'authorized'
          ? Payment.PAYMENT_STATUS.AUTHORIZED
          : Payment.PAYMENT_STATUS.PAID;
        if (paymentRecord.status === Payment.PAYMENT_STATUS.PAID) paymentRecord.paidAt = new Date();
        if (paymentRecord.status === Payment.PAYMENT_STATUS.AUTHORIZED) paymentRecord.authorizedAt = new Date();
        await paymentRecord.save();
      }
    }

    // If 3DS is required, defer subscription creation. We record
    // the intent on the Payment so the webhook can finish it.
    if (pendingRedirect) {
      paymentRecord.metadata = {
        ...(paymentRecord.metadata || {}),
        pendingSubscribeIntent: {
          planId: plan._id,
          planCode: plan.code,
          discountCode,
          existingActiveIds: existingActive.map((s) => s._id),
        },
      };
      await paymentRecord.save();
      return {
        requiresAction: true,
        redirectUrl: pendingRedirect,
        paymentId: paymentRecord._id,
      };
    }

    // B-3: charge succeeded (or wasn't needed) — NOW cancel the old subs.
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
      }
    }

    // Create new subscription.
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

      if (planCode === 'trial') {
        const TRIAL_DURATION_DAYS = 14;
        const trialExpiresAt = new Date(
          (subscription.activatedAt || subscription.createdAt).getTime()
            + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000
        );
        subscription.expiresAt = trialExpiresAt;
      }

      if (paymentRecord) {
        subscription.metadata = {
          ...(subscription.metadata || {}),
          paymentId: paymentRecord._id,
        };
        if (paymentRecord.paymentMethod?.type) {
          subscription.paymentMethod = {
            type: paymentRecord.paymentMethod.type,
            last4: paymentRecord.paymentMethod.last4,
            brand: paymentRecord.paymentMethod.company,
            expiryMonth: paymentRecord.paymentMethod.expiryMonth,
            expiryYear: paymentRecord.paymentMethod.expiryYear,
          };
        }
      }

      if (planCode === 'trial' || paymentRecord) {
        await subscription.save();
      }

      // Backlink the payment to the new subscription.
      if (paymentRecord) {
        paymentRecord.subscriptionId = subscription._id;
        await paymentRecord.save();
      }
    } catch (createErr) {
      // HIGH-6: payment succeeded but the subscription record didn't
      // land. Record a pending-refund audit row + admin alert; surface
      // a clear "money taken" error.
      if (paymentRecord) {
        try {
          await this._recordPendingRefund({
            userId,
            amount: planPrice,
            currency: plan?.currency || 'SAR',
            paymentId: paymentRecord._id,
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
   * Finalize a pending-3ds subscription purchase. Called by:
   *   - the webhook handler when `payment_paid` arrives
   *   - the frontend's poll endpoint when the user is back from the
   *     3DS challenge and we want to finish synchronously
   *
   * Idempotent: if the subscription is already created (paymentRecord
   * has a subscriptionId), it returns the existing one.
   */
  async finalizePending3ds(paymentId) {
    const payment = await Payment.findById(paymentId);
    if (!payment) throw new NotFoundError('Payment');

    if (payment.subscriptionId) {
      const existing = await Subscription.findById(payment.subscriptionId).populate('planId');
      if (existing) return existing;
    }

    if (payment.status !== Payment.PAYMENT_STATUS.PAID
        && payment.status !== Payment.PAYMENT_STATUS.AUTHORIZED) {
      throw new ValidationError(
        `Payment ${paymentId} is in status "${payment.status}", cannot finalize`
      );
    }

    const intent = payment.metadata?.pendingSubscribeIntent;
    if (!intent) {
      throw new ValidationError(`Payment ${paymentId} has no subscribe intent`);
    }

    const plan = await Plan.findById(intent.planId);
    if (!plan) throw new ValidationError(`Plan ${intent.planId} no longer exists`);

    // Cancel existing active subs (matching the pre-charge snapshot)
    if (Array.isArray(intent.existingActiveIds)) {
      for (const sid of intent.existingActiveIds) {
        try {
          const old = await Subscription.findById(sid);
          if (old && (old.status === SUBSCRIPTION_STATUS.ACTIVE || old.status === SUBSCRIPTION_STATUS.TRIAL)) {
            old.status = SUBSCRIPTION_STATUS.CANCELLED;
            old.cancelledAt = new Date();
            old.cancelReason = `Auto-cancelled on 3DS-confirmed new subscribe to ${plan.code}`;
            await old.save();
          }
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error('[finalize3ds] cancel-old failed:', e?.message);
        }
      }
    }

    let subscription;
    try {
      subscription = await Subscription.createForUser(payment.userId, plan, {
        pricePaid: payment.amount,
        currency: payment.currency,
        status: plan.code === 'trial' ? SUBSCRIPTION_STATUS.TRIAL : SUBSCRIPTION_STATUS.ACTIVE,
        createdBy: { user: payment.userId, onBehalfOf: false },
      });

      if (plan.code === 'trial') {
        const TRIAL_DURATION_DAYS = 14;
        subscription.expiresAt = new Date(
          (subscription.activatedAt || subscription.createdAt).getTime()
            + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000
        );
      }

      subscription.metadata = {
        ...(subscription.metadata || {}),
        paymentId: payment._id,
      };
      if (payment.paymentMethod?.type) {
        subscription.paymentMethod = {
          type: payment.paymentMethod.type,
          last4: payment.paymentMethod.last4,
          brand: payment.paymentMethod.company,
          expiryMonth: payment.paymentMethod.expiryMonth,
          expiryYear: payment.paymentMethod.expiryYear,
        };
      }
      await subscription.save();

      payment.subscriptionId = subscription._id;
      await payment.save();
    } catch (createErr) {
      await this._recordPendingRefund({
        userId: payment.userId,
        amount: payment.amount,
        currency: payment.currency,
        paymentId: payment._id,
        reason: 'subscribe_finalize3ds_failed',
        detail: createErr?.message,
        planCode: plan.code,
      });
      throw createErr;
    }

    if (intent.discountCode) {
      try {
        const discountsService = require('../discounts/discounts.service');
        await discountsService.applyDiscount(intent.discountCode);
      } catch (e) { /* non-fatal */ }
    }
    await User.findByIdAndUpdate(payment.userId, {
      subscription: subscription._id,
      'profile.hostData.subscribedBefore': true,
    });
    notificationService.sendToUser(payment.userId, {
      type: 'subscription_activated',
      title: 'Subscription Activated',
      titleAr: 'تم تفعيل الاشتراك',
      message: `Your ${plan.code} subscription has been activated successfully.`,
      messageAr: `تم تفعيل اشتراكك في باقة ${plan.code} بنجاح.`,
      data: { entityType: 'subscription', entityId: subscription._id, metadata: { planCode: plan.code } },
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

  /**
   * Phase 3 §6.2 — Renew a subscription via a Moyasar invoice.
   *
   * Called by `scheduleSubscriptionRenewal()` daily for subscriptions
   * expiring within 3 days. Per-event and trial plans are skipped (they
   * don't renew). Opens an invoice, stores the id on
   * `subscription.metadata.pendingInvoiceId` so the
   * `invoice_paid` / `invoice_failed` webhook handler can find it
   * later, and emails the host the payment link.
   */
  async renewSubscription(subscriptionId) {
    const subscription = await Subscription.findById(subscriptionId).populate('planId');
    if (!subscription) throw new NotFoundError('Subscription');

    const plan = subscription.planId;
    if (!plan) throw new ValidationError('Subscription has no plan');

    // Per-event and trial plans don't renew.
    if (plan.code === 'trial' || isPerEventPlan(plan.planType)) {
      return { skipped: true, reason: 'non_renewable_plan' };
    }
    if (subscription.metadata?.pendingInvoiceId) {
      return { skipped: true, reason: 'already_pending_invoice' };
    }

    const amount = plan.pricing?.recurring ?? plan.pricing?.oneTime ?? subscription.pricePaid;
    if (!amount || amount <= 0) {
      return { skipped: true, reason: 'no_renewal_price' };
    }

    const callbackUrl = `${process.env.FRONTEND_URL || ''}/host/payments/return`;
    const invoice = await paymentProvider.createInvoice({
      amount,
      currency: subscription.currency || 'SAR',
      description: `Renewal — ${plan.code}`,
      callbackUrl,
      metadata: {
        purpose: 'subscription_renewal',
        subscriptionId: String(subscription._id),
        userId: String(subscription.userId),
        planCode: plan.code,
      },
    });
    if (!invoice.success) {
      // eslint-disable-next-line no-console
      console.error('[renewSubscription] invoice creation failed:', invoice.error);
      return { skipped: true, reason: 'invoice_failed', error: invoice.error };
    }

    subscription.metadata = {
      ...(subscription.metadata || {}),
      pendingInvoiceId: invoice.invoiceId,
      pendingInvoiceUrl: invoice.url,
      pendingInvoiceOpenedAt: new Date().toISOString(),
    };
    await subscription.save();

    // Notify the host (non-blocking).
    notificationService.sendToUser(subscription.userId, {
      type: 'subscription_renewal_invoice',
      title: 'Renew your subscription',
      titleAr: 'جدد اشتراكك',
      message: `Your ${plan.code} subscription is renewing soon. Pay here: ${invoice.url}`,
      messageAr: `سيتم تجديد اشتراك ${plan.code} قريبًا. ادفع هنا: ${invoice.url}`,
      data: {
        entityType: 'subscription',
        entityId: subscription._id,
        metadata: { invoiceId: invoice.invoiceId, invoiceUrl: invoice.url },
      },
    }).catch(console.error);

    return { ok: true, invoiceId: invoice.invoiceId, invoiceUrl: invoice.url };
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
    const addonExtraGuests = subscription ? await this._getAddonExtraGuests(subscription._id) : 0;
    return this._getPackageLimits(subscription, null, addonExtraGuests);
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

  // ============================================
  // PAYMENT HISTORY (Host-facing)
  // ============================================

  /**
   * Map subscription status to payment status for display
   * @private
   */
  _mapSubStatusToPayment(subscriptionStatus) {
    switch (subscriptionStatus) {
      case 'active':
      case 'completed':
        return 'completed';
      case 'trial':
        return 'pending';
      case 'cancelled':
      case 'expired':
        return 'failed';
      default:
        return 'pending';
    }
  }

  /**
   * Get current user's payment history (backed by Payment collection)
   * @param {string} userId
   * @param {Object} options - { page, limit, status, from, to }
   * @returns {Promise<Object>}
   */
  async getMyPayments(userId, options = {}) {
    const { page = 1, limit = 20, status = 'all', from, to } = options;
    const skip = (page - 1) * limit;

    const match = { userId };

    if (status && status !== 'all') {
      const statusMap = {
        completed: { $in: ['paid', 'captured', 'partially_refunded'] },
        pending: { $in: ['pending', 'pending_3ds', 'authorized'] },
        failed: { $in: ['failed', 'voided'] },
        refunded: { $in: ['refunded', 'partially_refunded'] },
      };
      if (statusMap[status]) {
        match.status = statusMap[status];
      }
    }

    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = new Date(from);
      if (to) match.createdAt.$lte = new Date(to);
    }

    const [rows, total] = await Promise.all([
      Payment.find(match)
        .populate('subscriptionId', 'planId pricePaid')
        .populate('addonId', 'addonType price')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Payment.countDocuments(match),
    ]);

    const payments = rows.map((p) => ({
      id: p._id,
      service: p.metadata?.purpose === 'addon'
        ? `Addon: ${p.metadata?.addonType || p.addonId?.addonType || ''}`
        : `Subscription: ${p.metadata?.planCode || ''}`,
      amount: p.amount,
      currency: p.currency || 'SAR',
      status: ['paid', 'captured'].includes(p.status)
        ? 'completed'
        : ['pending', 'pending_3ds', 'authorized'].includes(p.status)
        ? 'pending'
        : ['failed', 'voided'].includes(p.status)
        ? 'failed'
        : ['refunded', 'partially_refunded'].includes(p.status)
        ? 'refunded'
        : p.status,
      providerStatus: p.status,
      paymentMethod: p.paymentMethod?.type || null,
      paymentMethodLast4: p.paymentMethod?.last4 || null,
      transactionId: p.moyasarPaymentId,
      refundedAmount: p.refundedAmount || 0,
      createdAt: p.createdAt,
    }));

    return {
      payments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
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
    paymentId,
    reason,
    detail,
    planCode,
  }) {
    const moyasarPaymentId = paymentId
      ? (await Payment.findById(paymentId).select('moyasarPaymentId'))?.moyasarPaymentId
      : null;

    // eslint-disable-next-line no-console
    console.error(
      '[subscribe] PENDING REFUND %s userId=%s amount=%s paymentId=%s moyasarId=%s detail=%s',
      reason,
      userId,
      amount,
      paymentId || 'n/a',
      moyasarPaymentId || 'n/a',
      detail || 'n/a'
    );
    await logAudit({
      action: 'subscription.pending_refund',
      actor: { _id: userId, role: 'host' },
      targetType: 'payment',
      targetId: paymentId || userId,
      metadata: {
        reason,
        amount,
        currency,
        paymentId,
        moyasarPaymentId,
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
          + `paymentId ${paymentId || 'n/a'} moyasarId ${moyasarPaymentId || 'n/a'} userId ${userId} plan ${planCode || 'n/a'}.`,
        data: {
          entityType: 'payment',
          entityId: paymentId || userId,
          metadata: { reason, amount, currency, paymentId, moyasarPaymentId, planCode },
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
