const Addon = require('../../../models/AddonModel');
const Subscription = require('../../../models/SubscriptionModel');
const Event = require('../../../models/EventModel');
const {
  ADDON_TYPES,
  EXTRA_INVITES_TIERS,
  EXTRA_REMINDERS_TIERS,
  DESIGN_TEMPLATE_TIERS,
  BUSINESS_CUSTOMIZATION,
} = require('../../shared/constants/addons');
const { ValidationError, NotFoundError } = require('../../shared/errors');
const paymentProvider = require('../../infrastructure/paymentProvider');
const { logAudit } = require('../../shared/utils/auditLog');
const notificationService = require('../notifications/notifications.service');

/**
 * Default scope per addon type. Used when the request body does not
 * supply an explicit `scope`. FLOW-10-F02.
 */
const DEFAULT_SCOPE_BY_TYPE = {
  [ADDON_TYPES.EXTRA_INVITES]:        'pool',
  [ADDON_TYPES.EXTRA_REMINDERS]:      'org',
  [ADDON_TYPES.DESIGN_TEMPLATE]:      'org',
  [ADDON_TYPES.BUSINESS_CUSTOMIZATION]: 'org',
};

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
   * Full purchase pipeline (FLOW-10-F01 / F02 / F03).
   * Validate → price → charge → activate → quota update → audit.
   *
   * @param {string} userId
   * @param {Object} data - { addonType, quantity, templateType, subscriptionId, eventId, scope }
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
    } = data || {};

    if (!Object.values(ADDON_TYPES).includes(addonType)) {
      throw new ValidationError(`Invalid addon type: ${addonType}`);
    }

    const price = this._computePrice(addonType, { quantity, templateType });
    const scope = this._resolveScope(addonType, data?.scope, { eventId });

    // Event-scoped addons must specify the target event; we additionally
    // verify host ownership so a host can't bump someone else's event.
    let targetEvent = null;
    if (scope === 'event') {
      if (!eventId) {
        throw new ValidationError('eventId is required for event-scoped addons');
      }
      targetEvent = await Event.findById(eventId);
      if (!targetEvent) throw new NotFoundError('Event');
      const hostId = targetEvent.host?.toString?.() || targetEvent.host;
      if (hostId && hostId.toString() !== userId.toString()) {
        throw new ValidationError('eventId does not belong to current user');
      }
    }

    // FLOW-10-F03: idempotency is layered. The route-level middleware
    // short-circuits when an `Idempotency-Key` header is present and the
    // body matches a cached request. We pass that same caller-supplied
    // key down to paymentProvider.charge so the outbound charge is also
    // exactly-once.
    //
    // We deliberately do NOT derive a fallback key here. If the client
    // omits the header, paymentProvider runs without idempotency — that
    // gives at-least-once charge semantics on a double-tap. A derived
    // key (e.g. userId+addonType+quantity) would dedup the *charge* on
    // a repeat call but NOT dedup the surrounding service work, which
    // would create a second Addon record + quota update against a
    // single charge: the worst possible outcome (double-credit /
    // single-charge). The client is expected to send Idempotency-Key.
    const idempotencyKey =
      options.idempotencyKey || data?.idempotencyKey || null;

    // FLOW-10-F01: skip payment for free addons (matches the 3.1 trial
    // guard pattern). Today no addon tier is free, but we keep the guard
    // explicit so promotional / zero-price tiers don't surprise the
    // provider.
    let paymentTransactionId = null;
    if (price > 0) {
      const chargeParams = {
        amount: price,
        currency: 'SAR',
        customer: { id: userId },
        userId, // H-5 — scope idempotency cache row by user
        metadata: {
          addonType,
          quantity: quantity || 1,
          templateType: templateType || null,
          scope,
          subscriptionId: subscriptionId || null,
          eventId: eventId || null,
          description: `Addon purchase ${addonType}`,
        },
      };
      // Derived key when client did not supply one — guards against
      // double-tap double-charge even without explicit Idempotency-Key.
      chargeParams.idempotencyKey =
        idempotencyKey
          || `addon:${userId}:${addonType}:${scope}:${eventId || 'pool'}:${price}`;
      const charge = await paymentProvider.charge(chargeParams);
      if (!charge.success) {
        // H-11: don't leak provider error string to client.
        // eslint-disable-next-line no-console
        console.error(
          '[addons.purchase] payment provider error:',
          charge.error || charge.providerStatus || 'unknown'
        );
        throw new ValidationError('Payment failed; addon not activated');
      }
      paymentTransactionId = charge.transactionId || null;
    }

    // Decide initial status. Business customization is provisioned
    // manually so it lands as `pending_provisioning`; everything else
    // activates immediately on a successful charge.
    const isBusinessCustomization = addonType === ADDON_TYPES.BUSINESS_CUSTOMIZATION;
    const initialStatus = isBusinessCustomization ? 'pending_provisioning' : 'active';

    // Resolve the subscription we'll be crediting (if any). Pool/org
    // scopes need it; event scope ignores it.
    let resolvedSubscriptionId = subscriptionId || null;
    if (!resolvedSubscriptionId && (scope === 'pool' || scope === 'org')) {
      const activeSubs = await Subscription.findActiveForUser(userId);
      const activeSub = activeSubs[0] || null;
      if (activeSub) resolvedSubscriptionId = activeSub._id;
    }

    // Guard: extra_invites with pool/org scope must have a target
    // subscription. Without one, the charge would go through but
    // _applyQuota would silently no-op — the host would pay and get
    // no quota benefit. Reject upfront so the host isn't billed.
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

    // B-4: addon record creation + quota update happen AFTER a successful
    // charge. If either throws, the customer has been charged but receives
    // no addon — money taken with no benefit. We can't currently issue a
    // real refund (Moyasar refund flow not implemented), so on failure we:
    //   1. log a structured error so ops gets paged
    //   2. write a `pending_refund` audit row that the reconciliation job
    //      can pick up
    //   3. surface a clear "money taken, contact support" error to the
    //      caller so the host knows not to retry blindly
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
          paymentTransactionId,
          idempotencyKey: idempotencyKey || null,
          activatedAt: initialStatus === 'active' ? new Date().toISOString() : null,
        },
      });
    } catch (createErr) {
      await this._recordPendingRefund({
        userId,
        amount: price,
        currency: 'SAR',
        paymentTransactionId,
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

    // FLOW-10-F02: branch on scope and apply the quota update only when
    // the addon is fully active. Business customization waits for admin
    // approval.
    if (initialStatus === 'active') {
      try {
        await this._applyQuota(addon, { targetEvent });
      } catch (quotaErr) {
        // Compensating action: roll the addon row back to a `failed_quota`
        // state and emit the same pending-refund audit entry. Without
        // this, the addon shows as `active` in the DB but the quota was
        // never applied — admin reconciliation cannot tell what happened.
        try {
          addon.status = 'failed_quota';
          addon.metadata = {
            ...(addon.metadata || {}),
            quotaError: quotaErr?.message || 'unknown',
          };
          await addon.save();
        } catch (_) { /* swallow — we'll still record the pending refund */ }
        await this._recordPendingRefund({
          userId,
          amount: price,
          currency: 'SAR',
          paymentTransactionId,
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

    await logAudit({
      action: 'addon.purchased',
      actor: { _id: userId, role: 'host' },
      targetType: 'system',
      targetId: addon._id,
      metadata: {
        addonId: addon._id,
        addonType,
        quantity: quantity || 1,
        scope,
        price,
        status: initialStatus,
        paymentTransactionId,
        eventId: eventId || null,
        subscriptionId: resolvedSubscriptionId || null,
      },
    });

    return addon;
  }

  /**
   * Admin-only: flip a `pending_provisioning` business-customization
   * addon to `active`. Quota is then applied (no-op for business
   * customization but the hook is symmetrical for future addon types).
   */
  async activateAddonAsAdmin(adminUserId, addonId, notes) {
    const addon = await Addon.findById(addonId);
    if (!addon) throw new NotFoundError('Addon');

    if (addon.status === 'active') {
      // Idempotent: already active, return as-is.
      return addon;
    }
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

    await this._applyQuota(addon, {});

    // Audit log is emitted by the route-level auditLog middleware
    // (addons.routes.js — admin/:id/activate). Adding a service-level
    // logAudit here would duplicate the row.

    return addon;
  }

  async getMyAddons(userId) {
    return Addon.find({ userId }).sort({ createdAt: -1 });
  }

  // ---- internals ----

  _computePrice(addonType, { quantity, templateType }) {
    if (addonType === ADDON_TYPES.EXTRA_INVITES) {
      const tier = EXTRA_INVITES_TIERS.find((t) => t.quantity === quantity);
      if (!tier) throw new ValidationError('Invalid extra invites quantity');
      return tier.price;
    }
    if (addonType === ADDON_TYPES.EXTRA_REMINDERS) {
      const tier = EXTRA_REMINDERS_TIERS.find((t) => t.quantity === quantity);
      if (!tier) throw new ValidationError('Invalid extra reminders quantity');
      return tier.price;
    }
    if (addonType === ADDON_TYPES.DESIGN_TEMPLATE) {
      const tier = DESIGN_TEMPLATE_TIERS.find((t) => t.type === templateType);
      if (!tier) throw new ValidationError('Invalid template type');
      return tier.price;
    }
    if (addonType === ADDON_TYPES.BUSINESS_CUSTOMIZATION) {
      return BUSINESS_CUSTOMIZATION.price;
    }
    return 0;
  }

  _resolveScope(addonType, requestedScope, { eventId } = {}) {
    if (requestedScope) {
      if (!['event', 'pool', 'org'].includes(requestedScope)) {
        throw new ValidationError(`Invalid scope: ${requestedScope}`);
      }
      return requestedScope;
    }
    // If the caller supplied an eventId without an explicit scope, treat
    // that as event-scoped — otherwise the addon's quantity would land
    // on a pool counter that per-event plans never read, silently
    // wasting the addon for per-event-plan hosts.
    if (eventId) return 'event';
    return DEFAULT_SCOPE_BY_TYPE[addonType] || 'org';
  }

  /**
   * B-4: record a "money taken, no benefit" event so on-call can reconcile.
   * Today this is an audit-log entry. Once the Moyasar refund flow is
   * implemented this method should attempt the refund inline and only
   * surface to ops if that also fails.
   *
   * Idempotent on (paymentTransactionId, reason) — replays of the same
   * failure case do not generate a second pending-refund row, so re-tries
   * by an automated reconciliation job are safe.
   */
  async _recordPendingRefund({
    userId,
    amount,
    currency,
    paymentTransactionId,
    reason,
    detail,
    addonType,
    scope,
    eventId,
    addonId,
  }) {
    try {
      // eslint-disable-next-line no-console
      console.error(
        '[addons.purchase] PENDING REFUND %s userId=%s amount=%s tx=%s detail=%s',
        reason,
        userId,
        amount,
        paymentTransactionId || 'n/a',
        detail || 'n/a'
      );
      await logAudit({
        action: 'addon.pending_refund',
        actor: { _id: userId, role: 'host' },
        targetType: 'system',
        targetId: addonId || paymentTransactionId || userId,
        metadata: {
          reason,
          amount,
          currency,
          paymentTransactionId,
          addonType,
          scope,
          eventId,
          detail,
        },
        status: 'failure',
      });
      // Best-effort admin notification — failure here does NOT cascade.
      try {
        await notificationService.sendToAdmins({
          type: 'addon_pending_refund',
          title: 'Addon purchase requires refund',
          titleAr: 'مشتريات إضافة تحتاج إلى استرداد',
          message: `Charge succeeded but addon could not be activated. Tx ${paymentTransactionId || 'n/a'} userId ${userId}.`,
          data: {
            entityType: 'addon',
            entityId: addonId || null,
            metadata: { reason, amount, currency, paymentTransactionId },
          },
          priority: 'high',
        });
      } catch (notifyErr) {
        // eslint-disable-next-line no-console
        console.warn('[addons.purchase] admin notify failed:', notifyErr?.message);
      }
    } catch (auditErr) {
      // The audit failure is logged but doesn't override the original
      // ValidationError — losing the audit row would be terrible, but
      // throwing here would replace the user-visible error with a
      // generic 500.
      // eslint-disable-next-line no-console
      console.error('[addons.purchase] _recordPendingRefund logAudit failed:', auditErr?.message);
    }
  }

  /**
   * FLOW-10-F02: branch on `scope` and apply the addon's quantity to
   * the right counter.
   */
  async _applyQuota(addon, { targetEvent } = {}) {
    const { scope, addonType, quantity = 1 } = addon;

    // Only EXTRA_INVITES has a quota effect today. Reminders, templates,
    // and business customization track usage elsewhere.
    if (addonType !== ADDON_TYPES.EXTRA_INVITES) return;

    if (scope === 'pool') {
      // Pool plans: bump invitePool on the linked subscription.
      if (!addon.subscriptionId) return;
      await Subscription.findByIdAndUpdate(addon.subscriptionId, {
        $inc: { invitePool: quantity },
      });
      return;
    }

    if (scope === 'event') {
      // Per-event plans: bump the linked event's per-event invite ceiling.
      // Snapshot field is `guestLimit` (frozen from subscription at
      // creation time per EventModel.js:278). Treat null/-1 (unlimited)
      // as a no-op — the host already has unlimited capacity.
      const event =
        targetEvent
        || (addon.eventId ? await Event.findById(addon.eventId) : null);
      if (!event) return;
      const current = event.guestLimit;
      if (current === null || current === -1) return;
      await Event.findByIdAndUpdate(event._id, {
        $set: { guestLimit: current + quantity },
      });
      return;
    }

    if (scope === 'org') {
      // Organization-wide bucket: today the same Subscription is the
      // org-level container, so behave like pool. When a real org-level
      // counter is introduced this branch can target it without
      // affecting other scopes.
      if (!addon.subscriptionId) return;
      await Subscription.findByIdAndUpdate(addon.subscriptionId, {
        $inc: { invitePool: quantity },
      });
    }
  }
}

module.exports = new AddonsService();
