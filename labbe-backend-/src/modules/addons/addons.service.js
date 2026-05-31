const Addon = require('../../../models/AddonModel');
const Subscription = require('../../../models/SubscriptionModel');
const Event = require('../../../models/EventModel');
const Payment = require('../../../models/PaymentModel');
const {
  ADDON_TYPES,
  EXTRA_INVITES_TIERS,
  EXTRA_REMINDERS_TIERS,
  DESIGN_TEMPLATE_TIERS,
  BUSINESS_CUSTOMIZATION,
} = require('../../shared/constants/addons');
const { ROLES } = require('../../shared/constants/roles');
const { ValidationError, NotFoundError } = require('../../shared/errors');
const paymentProvider = require('../../infrastructure/paymentProvider');
const { logAudit } = require('../../shared/utils/auditLog');
const logger = require('../../shared/utils/logger');
const { computePrice, resolveScope } = require('./addons.pricing');
const { applyQuota } = require('./addons.quota');
const { recordPendingRefund } = require('./addons.refund');

class AddonsService {
  getAvailableAddons() {
    return {
      extra_invites: EXTRA_INVITES_TIERS,
      extra_reminders: EXTRA_REMINDERS_TIERS,
      design_template: DESIGN_TEMPLATE_TIERS,
      business_customization: BUSINESS_CUSTOMIZATION,
    };
  }

  /**
   * Full purchase pipeline: validate → price → charge → activate → quota → audit.
   *
   * @param {string} userId
   * @param {Object} data - { addonType, quantity, templateType, subscriptionId, eventId, scope, source }
   * @param {Object} [options]
   * @param {string} [options.idempotencyKey]
   */
  async purchaseAddon(userId, data, options = {}) {
    const {
      addonType,
      quantity,
      templateType,
      subscriptionId,
      eventId,
      callbackUrl,
    } = data || {};

    if (!Object.values(ADDON_TYPES).includes(addonType)) {
      throw new ValidationError(`Invalid addon type: ${addonType}`);
    }

    const price = computePrice(addonType, { quantity, templateType });
    const scope = resolveScope(addonType, data?.scope, { eventId });

    const targetEvent = await this._loadAndValidateTargetEvent({
      scope, eventId, userId, addonType,
    });

    // Idempotency is layered: route-level middleware short-circuits when
    // Idempotency-Key is present and the body matches a cached request. We
    // pass that same key to paymentProvider.charge so the outbound charge
    // is also exactly-once. We do NOT derive a fallback key — without the
    // header, a double-tap creates a second Addon record + quota update
    // against a single charge (double-credit / single-charge), which is
    // the worst possible outcome.
    const idempotencyKey =
      options.idempotencyKey || data?.idempotencyKey || null;

    let paymentRecord = null;
    if (price > 0) {
      paymentRecord = await this._chargeForPurchase({
        userId, price, addonType, quantity, templateType, scope, subscriptionId, eventId,
        source: data?.source, idempotencyKey, callbackUrl,
      });
      if (paymentRecord.requiresAction) return paymentRecord.requiresActionResponse;
    }

    const initialStatus =
      addonType === ADDON_TYPES.BUSINESS_CUSTOMIZATION
        ? 'pending_provisioning'
        : 'active';

    let resolvedSubscriptionId = subscriptionId || null;
    if (!resolvedSubscriptionId && (scope === 'pool' || scope === 'org')) {
      const activeSubs = await Subscription.findActiveForUser(userId);
      const activeSub = activeSubs[0] || null;
      if (activeSub) resolvedSubscriptionId = activeSub._id;
    }

    // Pool/org extra_invites without a subscription would silently no-op in
    // applyQuota — host pays, no benefit. Reject upfront so they aren't billed.
    if (
      addonType === ADDON_TYPES.EXTRA_INVITES
      && (scope === 'pool' || scope === 'org')
      && !resolvedSubscriptionId
    ) {
      throw new ValidationError(
        'Cannot purchase pool/org addon: no active subscription. '
        + 'Subscribe to a plan first or pass scope: "event" with an eventId.'
      );
    }

    // Addon row + quota happen AFTER a successful charge. If either throws,
    // the customer has been charged but receives no addon — money taken with
    // no benefit. Moyasar refund flow is not implemented yet, so on failure:
    //   1. log a structured error so ops gets paged
    //   2. write a pending_refund audit row that the reconciliation job picks up
    //   3. surface a clear "money taken, contact support" error to the caller
    let addon;
    try {
      addon = await Addon.create({
        userId,
        addonType,
        quantity: quantity || 1,
        templateType: templateType || null,
        price,
        currency: 'SAR',
        subscriptionId: resolvedSubscriptionId,
        eventId: eventId || null,
        status: initialStatus,
        scope,
        metadata: {
          paymentId: paymentRecord?._id || null,
          idempotencyKey: idempotencyKey || null,
          activatedAt: initialStatus === 'active' ? new Date().toISOString() : null,
        },
      });

      if (paymentRecord) {
        paymentRecord.addonId = addon._id;
        try {
          await paymentRecord.save();
        } catch (saveErr) {
          // Non-fatal: addon was created and quota will be applied; this
          // misses the back-reference. Reconciliation can recover via
          // Payment.metadata.purpose === 'addon'.
          logger.error('[addons.purchase] failed to persist payment.addonId back-reference', {
            paymentId: paymentRecord._id,
            addonId: addon._id,
            error: saveErr?.message,
          });
        }
      }
    } catch (createErr) {
      await recordPendingRefund({
        userId,
        amount: price,
        currency: 'SAR',
        paymentId: paymentRecord?._id || null,
        reason: 'addon_create_failed',
        detail: createErr?.message,
        addonType,
        scope,
        eventId,
      });
      throw new ValidationError(
        'Payment was processed but the addon could not be activated. '
        + 'Our team has been notified — please contact support with your transaction reference.'
      );
    }

    if (initialStatus === 'active') {
      await this._applyQuotaWithCompensation({
        addon, targetEvent, paymentRecord, addonType, scope, eventId, price, userId,
      });
    }

    await logAudit({
      action: 'addon.purchased',
      actor: { _id: userId, role: ROLES.HOST },
      targetType: 'system',
      targetId: addon._id,
      metadata: {
        addonId: addon._id,
        addonType,
        quantity: quantity || 1,
        scope,
        price,
        status: initialStatus,
        paymentId: paymentRecord?._id || null,
        moyasarPaymentId: paymentRecord?.moyasarPaymentId || null,
        eventId: eventId || null,
        subscriptionId: resolvedSubscriptionId || null,
      },
    });

    return addon;
  }

  /**
   * Admin-only: flip a `pending_provisioning` business-customization addon
   * to `active`. Quota is then applied (no-op for business customization
   * but the hook is symmetrical for future addon types).
   *
   * Audit log is emitted by the route-level auditLog middleware — adding a
   * service-level logAudit here would duplicate the row.
   */
  async activateAddonAsAdmin(adminUserId, addonId, notes) {
    const addon = await Addon.findById(addonId);
    if (!addon) throw new NotFoundError('Addon');

    if (addon.status === 'active') return addon; // idempotent

    if (addon.status !== 'pending_provisioning' && addon.status !== 'pending') {
      throw new ValidationError(
        `Cannot activate addon in status "${addon.status}"`
      );
    }

    addon.status = 'active';
    addon.metadata = {
      ...(addon.metadata || {}),
      activatedAt: new Date().toISOString(),
      activatedBy: adminUserId,
      activationNotes: notes || null,
    };
    await addon.save();

    await applyQuota(addon, {});

    return addon;
  }

  async getMyAddons(userId, { page = 1, limit = 20, skip = 0 } = {}) {
    const [items, total] = await Promise.all([
      Addon.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Addon.countDocuments({ userId }),
    ]);
    return {
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Finalize a pending-3DS addon purchase. Idempotent — if the addon row
   * already exists (Payment.addonId is set), returns it as-is.
   *
   * Called by:
   *   - the webhook handler on payment_paid
   *   - the frontend's poll endpoint when the user returns from 3DS
   *   - the reconciliation cron when it spots a stale pending_3ds row
   */
  async finalizePending3ds(paymentId) {
    const payment = await Payment.findById(paymentId);
    if (!payment) throw new NotFoundError('Payment');

    if (payment.addonId) {
      const existing = await Addon.findById(payment.addonId);
      if (existing) return existing;
    }

    if (![Payment.PAYMENT_STATUS.PAID, Payment.PAYMENT_STATUS.AUTHORIZED]
        .includes(payment.status)) {
      throw new ValidationError(
        `Payment ${paymentId} is in status "${payment.status}", cannot finalize`
      );
    }

    const intent = payment.metadata?.pendingAddonIntent;
    if (!intent) {
      throw new ValidationError(`Payment ${paymentId} has no addon intent`);
    }

    const { addonType, quantity, templateType, subscriptionId, eventId, scope } = intent;
    const userId = payment.userId;
    const price = payment.amount;

    let resolvedSubscriptionId = subscriptionId || null;
    if (!resolvedSubscriptionId && (scope === 'pool' || scope === 'org')) {
      const activeSubs = await Subscription.findActiveForUser(userId);
      const activeSub = activeSubs[0] || null;
      if (activeSub) resolvedSubscriptionId = activeSub._id;
    }

    let targetEvent = null;
    if (scope === 'event' && eventId) {
      targetEvent = await Event.findById(eventId);
      if (!targetEvent) throw new NotFoundError('Event');
    }

    const initialStatus =
      addonType === ADDON_TYPES.BUSINESS_CUSTOMIZATION
        ? 'pending_provisioning'
        : 'active';

    let addon;
    try {
      addon = await Addon.create({
        userId,
        addonType,
        quantity: quantity || 1,
        templateType: templateType || null,
        price,
        currency: 'SAR',
        subscriptionId: resolvedSubscriptionId,
        eventId: eventId || null,
        status: initialStatus,
        scope,
        metadata: {
          paymentId: payment._id,
          activatedAt: initialStatus === 'active' ? new Date().toISOString() : null,
        },
      });
      payment.addonId = addon._id;
      await payment.save();
    } catch (createErr) {
      await recordPendingRefund({
        userId,
        amount: price,
        currency: 'SAR',
        paymentId: payment._id,
        reason: 'addon_finalize3ds_create_failed',
        detail: createErr?.message,
        addonType,
        scope,
        eventId,
      });
      throw createErr;
    }

    if (initialStatus === 'active') {
      try {
        await applyQuota(addon, { targetEvent });
      } catch (quotaErr) {
        try {
          addon.status = 'failed_quota';
          addon.metadata = {
            ...(addon.metadata || {}),
            quotaError: quotaErr?.message || 'unknown',
          };
          await addon.save();
        } catch (saveErr) {
          logger.warn('[addons.finalize3ds] failed to mark addon failed_quota', {
            addonId: addon._id,
            error: saveErr?.message,
          });
        }
        await recordPendingRefund({
          userId,
          amount: price,
          currency: 'SAR',
          paymentId: payment._id,
          reason: 'addon_finalize3ds_quota_failed',
          detail: quotaErr?.message,
          addonType,
          scope,
          eventId,
          addonId: addon._id,
        });
        throw quotaErr;
      }
    }

    await logAudit({
      action: 'addon.purchased_3ds',
      actor: { _id: userId, role: ROLES.HOST },
      targetType: 'system',
      targetId: addon._id,
      metadata: {
        addonId: addon._id,
        addonType,
        quantity: quantity || 1,
        scope,
        price,
        status: initialStatus,
        paymentId: payment._id,
        moyasarPaymentId: payment.moyasarPaymentId,
        eventId: eventId || null,
        subscriptionId: resolvedSubscriptionId || null,
      },
    });

    return addon;
  }

  // ---- internals ----

  async _loadAndValidateTargetEvent({ scope, eventId, userId, addonType }) {
    if (scope !== 'event') return null;
    if (!eventId) {
      throw new ValidationError('eventId is required for event-scoped addons');
    }
    const targetEvent = await Event.findById(eventId);
    if (!targetEvent) throw new NotFoundError('Event');
    const hostId = targetEvent.host?.toString?.() || targetEvent.host;
    if (hostId && hostId.toString() !== userId.toString()) {
      throw new ValidationError('eventId does not belong to current user');
    }
    // Reject extra_invites for an event with unlimited capacity. applyQuota
    // would silently no-op on guestLimit null/-1 — without this guard the
    // host would pay and get nothing back.
    if (
      addonType === ADDON_TYPES.EXTRA_INVITES
      && (targetEvent.guestLimit === null || targetEvent.guestLimit === -1)
    ) {
      throw new ValidationError(
        'Cannot purchase extra invites: this event already has unlimited capacity.'
      );
    }
    return targetEvent;
  }

  async _chargeForPurchase({
    userId, price, addonType, quantity, templateType, scope, subscriptionId, eventId,
    source, idempotencyKey, callbackUrl: callbackUrlArg,
  }) {
    // Honor a caller-supplied deep link (mobile) so 3DS returns to the app;
    // fall back to the web return page when omitted (web clients).
    const callbackUrl =
      callbackUrlArg || `${process.env.FRONTEND_URL || ''}/host/payments/return`;
    const derivedKey = idempotencyKey
      || `addon:${userId}:${addonType}:${scope}:${eventId || 'pool'}:${price}`;

    const paymentRecord = await Payment.create({
      userId,
      amount: price,
      currency: 'SAR',
      provider: 'moyasar',
      status: Payment.PAYMENT_STATUS.PENDING,
      callbackUrl,
      description: `Addon purchase ${addonType}`,
      // `purpose: 'addon'` is the dispatch key used by webhook/reconcile/poll.
      metadata: {
        addonType,
        quantity: quantity || 1,
        templateType: templateType || null,
        scope,
        eventId: eventId || null,
        purpose: 'addon',
      },
    });

    const charge = await paymentProvider.charge({
      amount: price,
      currency: 'SAR',
      source: source || { type: 'creditcard' },
      customer: { id: userId },
      callbackUrl,
      userId,
      idempotencyKey: derivedKey,
      description: `Addon purchase ${addonType}`,
      metadata: {
        addonType,
        quantity: quantity || 1,
        templateType: templateType || null,
        scope,
        subscriptionId: subscriptionId || null,
        eventId: eventId || null,
        purpose: 'addon',
        userId: String(userId),
      },
    });

    if (!charge.success) {
      paymentRecord.status = Payment.PAYMENT_STATUS.FAILED;
      paymentRecord.failedAt = new Date();
      paymentRecord.providerStatus = charge.providerStatus || charge.error || 'unknown';
      try {
        await paymentRecord.save();
      } catch (saveErr) {
        logger.error('[addons.purchase] failed to persist FAILED payment status', {
          paymentId: paymentRecord._id,
          error: saveErr?.message,
        });
      }
      logger.error('[addons.purchase] payment provider error', {
        error: charge.error || charge.providerStatus || 'unknown',
        paymentId: paymentRecord._id,
      });
      throw new ValidationError('Payment failed; addon not activated');
    }

    paymentRecord.moyasarPaymentId = charge.transactionId;
    paymentRecord.givenId = charge.givenId || null;
    paymentRecord.providerStatus = charge.providerStatus;
    paymentRecord.fee = charge.fee || 0;
    if (charge.paymentMethod) paymentRecord.paymentMethod = charge.paymentMethod;

    if (charge.requiresAction) {
      paymentRecord.status = Payment.PAYMENT_STATUS.PENDING_3DS;
      paymentRecord.redirectUrl = charge.redirectUrl;
      paymentRecord.metadata = {
        ...(paymentRecord.metadata || {}),
        pendingAddonIntent: {
          addonType,
          quantity: quantity || 1,
          templateType: templateType || null,
          subscriptionId,
          eventId,
          scope,
        },
      };
      await paymentRecord.save();
      paymentRecord.requiresAction = true;
      paymentRecord.requiresActionResponse = {
        requiresAction: true,
        redirectUrl: charge.redirectUrl,
        paymentId: paymentRecord._id,
      };
      return paymentRecord;
    }

    paymentRecord.status = charge.providerStatus === 'authorized'
      ? Payment.PAYMENT_STATUS.AUTHORIZED
      : Payment.PAYMENT_STATUS.PAID;
    if (paymentRecord.status === Payment.PAYMENT_STATUS.PAID) paymentRecord.paidAt = new Date();
    if (paymentRecord.status === Payment.PAYMENT_STATUS.AUTHORIZED) paymentRecord.authorizedAt = new Date();
    await paymentRecord.save();
    return paymentRecord;
  }

  async _applyQuotaWithCompensation({
    addon, targetEvent, paymentRecord, addonType, scope, eventId, price, userId,
  }) {
    try {
      await applyQuota(addon, { targetEvent });
    } catch (quotaErr) {
      // Compensating action: roll the addon back to `failed_quota` and emit
      // the same pending-refund audit entry. Without this, the addon shows
      // as `active` but the quota was never applied — admin reconciliation
      // cannot tell what happened.
      try {
        addon.status = 'failed_quota';
        addon.metadata = {
          ...(addon.metadata || {}),
          quotaError: quotaErr?.message || 'unknown',
        };
        await addon.save();
      } catch (saveErr) {
        logger.warn('[addons.purchase] failed to mark addon failed_quota', {
          addonId: addon._id,
          error: saveErr?.message,
        });
      }
      await recordPendingRefund({
        userId,
        amount: price,
        currency: 'SAR',
        paymentId: paymentRecord?._id || null,
        reason: 'addon_quota_failed',
        detail: quotaErr?.message,
        addonType,
        scope,
        eventId,
        addonId: addon._id,
      });
      throw new ValidationError(
        'Payment was processed but the addon credit could not be applied. '
        + 'Our team has been notified — please contact support.'
      );
    }
  }
}

module.exports = new AddonsService();
