/**
 * Subscriptions Service
 * Business logic for subscription management - NO HTTP concerns
 * @module modules/subscriptions/subscriptions.service
 */

const {
  SUBSCRIPTION_STATUS,
  ROLES,
} = require('../../shared/constants');
const {
  NotFoundError,
  ValidationError,
} = require('../../shared/errors');

const Subscription = require('../../../models/SubscriptionModel');
const Plan = require('../../../models/PlanModel');
const User = require('../../../models/UserModel');
const Payment = require('../../../models/PaymentModel');
const { isPerEventPlan, isPoolPlan, COMPENSATION_PERCENTAGE } = require('../../shared/constants/plans');
const notificationService = require('../notifications/notifications.service');
const { logAudit } = require('../../shared/utils/auditLog');
const paymentProvider = require('../../infrastructure/paymentProvider');
const Addon = require('../../../models/AddonModel');
const { ADDON_TYPES } = require('../../shared/constants/addons');
const logger = require('../../shared/utils/logger');

class SubscriptionsService {
  // ============================================
  // EVENT-CREATION GATING
  // ============================================

  /**
   * Validate if user can create an event.
   * Called from events.crud.service before persisting a new Event.
   */
  async validateEventCreation(subscription, guestCount = 0, userId = null) {
    if (!subscription) {
      return {
        allowed: false,
        reason: 'No active subscription found. Please subscribe to a plan to create events.',
        limits: null,
      };
    }

    if (!['active', 'trial'].includes(subscription.status)) {
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

    const addonExtraGuests = await this._getAddonExtraGuests(subscription._id);
    const limits = this._getPackageLimits(subscription, dynamicEventCount, addonExtraGuests);

    if (limits.maxEvents > 0 && limits.eventsRemaining <= 0) {
      return {
        allowed: false,
        reason: `You have reached your event limit of ${limits.maxEvents} events. Please upgrade your plan.`,
        limits,
      };
    }

    if (guestCount > 0) {
      if (limits.totalGuestLimit !== -1 && guestCount > limits.totalGuestLimit) {
        return {
          allowed: false,
          reason: `Guest count (${guestCount}) exceeds your limit of ${limits.totalGuestLimit} guests per event. Please reduce guests or upgrade your plan.`,
          limits,
        };
      }
    }

    return { allowed: true, reason: '', limits };
  }

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

  async _getAddonExtraGuests(subscriptionId) {
    if (!subscriptionId) return 0;
    const result = await Addon.aggregate([
      { $match: { subscriptionId, addonType: ADDON_TYPES.EXTRA_INVITES, status: 'active' } },
      { $group: { _id: null, total: { $sum: '$quantity' } } },
    ]);
    return result[0]?.total || 0;
  }

  /**
   * Compute live limits from a subscription.
   * @param {number|null} dynamicEventCount - if provided, overrides usage counter
   * @param {number} addonExtraGuests - active extra_invites addon quantity
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

    const maxEvents = subscription.limits?.maxEvents ?? -1;
    const maxGuests = subscription.limits?.maxInvitesPerEvent ?? 0;
    const totalGuestLimit = maxGuests === -1 ? -1 : maxGuests + addonExtraGuests;
    const eventsRemaining = maxEvents === -1 ? -1 : Math.max(0, maxEvents - eventsUsed);

    const compensationInvites =
      maxGuests > 0 && maxGuests !== -1
        ? Math.floor(maxGuests * (COMPENSATION_PERCENTAGE / 100))
        : 0;

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

  // ============================================
  // SUBSCRIPTION QUERIES
  // ============================================

  async getMySubscription(userId) {
    const subscriptions = await Subscription.findActiveForUser(userId);
    return subscriptions.map((sub) => sub.getSummary());
  }

  // ============================================
  // ADMIN ASSIGN
  // ============================================

  /**
   * Admin-assign a plan to a user. Skips payment (admin-assigned plans
   * are free or billed externally). Auto-cancels any existing active
   * subscription for the target user. Designed to be called from a
   * SUPER_ADMIN-only route with audit + idempotency middleware wired in.
   */
  async assignSubscription(adminUserId, input) {
    const { userId, planCode, notes } = input || {};
    if (!userId) throw new ValidationError('userId is required');
    if (!planCode) throw new ValidationError('planCode is required');

    const targetUser = await User.findById(userId);
    if (!targetUser) throw new NotFoundError('User');

    const plan = await Plan.getOrCreateByCode(planCode);
    if (!plan) throw new ValidationError('Invalid plan code');

    // Single-active invariant: cancel any existing active/trial sub for the target user.
    // Per-cancellation audit row leaves a forensic trail of the admin override
    // (the route-level audit middleware records the assign itself).
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
        logger.warn('[assignSubscription] audit failed for cancelled sub', {
          subscriptionId: String(existing._id),
          error: auditErr?.message,
        });
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
    }).catch((err) => logger.warn('[assignSubscription] notify failed', { error: err?.message }));

    return subscription.getSummary();
  }

  // ============================================
  // RENEWAL (cron)
  // ============================================

  /**
   * Renew a subscription via a Moyasar invoice. Called by the daily
   * scheduled task for subscriptions expiring within 3 days. Per-event
   * and trial plans are skipped (they don't renew). Stores the invoice
   * id on `subscription.metadata.pendingInvoiceId` so the
   * `invoice_paid` / `invoice_failed` webhook handler can find it later,
   * and emails the host the payment link.
   */
  async renewSubscription(subscriptionId) {
    const subscription = await Subscription.findById(subscriptionId).populate('planId');
    if (!subscription) throw new NotFoundError('Subscription');

    const plan = subscription.planId;
    if (!plan) throw new ValidationError('Subscription has no plan');

    if (plan.code === 'trial' || isPerEventPlan(plan.planType)) {
      return { skipped: true, reason: 'non_renewable_plan' };
    }
    if (subscription.metadata?.pendingInvoiceId) {
      return { skipped: true, reason: 'already_pending_invoice' };
    }

    // PlanModel has `pricing.oneTime` (SAR major units) — there is no
    // separate `recurring` field today. Fall back to the price paid on
    // the existing subscription record.
    const amount =
      plan.pricing?.recurring
      ?? plan.pricing?.oneTime
      ?? subscription.pricePaid?.amount
      ?? 0;
    if (!amount || amount <= 0) {
      return { skipped: true, reason: 'no_renewal_price' };
    }

    const callbackUrl = `${process.env.FRONTEND_URL || ''}/host/payments/return`;
    const invoice = await paymentProvider.createInvoice({
      amount,
      currency: subscription.pricePaid?.currency || plan.currency || 'SAR',
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
      logger.error('[renewSubscription] invoice creation failed', { error: invoice.error });
      return { skipped: true, reason: 'invoice_failed', error: invoice.error };
    }

    subscription.metadata = {
      ...(subscription.metadata || {}),
      pendingInvoiceId: invoice.invoiceId,
      pendingInvoiceUrl: invoice.url,
      pendingInvoiceOpenedAt: new Date().toISOString(),
    };
    await subscription.save();

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
    }).catch((err) => logger.warn('[renewSubscription] notify failed', { error: err?.message }));

    return { ok: true, invoiceId: invoice.invoiceId, invoiceUrl: invoice.url };
  }

  // ============================================
  // PAYMENT HISTORY (Host-facing)
  // ============================================

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
   * Export the current user's payments as a flat array of rows suitable
   * for `generateExcel`.
   */
  async exportMyPayments(userId, options = {}) {
    const { status = 'all', from, to } = options;
    const match = { userId };
    if (status && status !== 'all') {
      const statusMap = {
        completed: { $in: ['paid', 'captured', 'partially_refunded'] },
        pending: { $in: ['pending', 'pending_3ds', 'authorized'] },
        failed: { $in: ['failed', 'voided'] },
        refunded: { $in: ['refunded', 'partially_refunded'] },
      };
      if (statusMap[status]) match.status = statusMap[status];
    }
    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = new Date(from);
      if (to) match.createdAt.$lte = new Date(to);
    }
    const rows = await Payment.find(match)
      .populate('subscriptionId', 'planId pricePaid')
      .populate('addonId', 'addonType price')
      .sort({ createdAt: -1 })
      .lean();
    return rows.map((p) => ({
      Service:
        p.metadata?.purpose === 'addon'
          ? `Addon: ${p.metadata?.addonType || p.addonId?.addonType || ''}`
          : `Subscription: ${p.metadata?.planCode || ''}`,
      Amount: `${p.amount || 0} ${p.currency || 'SAR'}`,
      'Refunded Amount': `${p.refundedAmount || 0} ${p.currency || 'SAR'}`,
      Status: p.status,
      'Payment Method': p.paymentMethod?.type || '-',
      Last4: p.paymentMethod?.last4 || '-',
      'Transaction ID': p.moyasarPaymentId || '-',
      'Created At': p.createdAt ? new Date(p.createdAt).toISOString().split('T')[0] : '-',
    }));
  }
}

module.exports = new SubscriptionsService();
