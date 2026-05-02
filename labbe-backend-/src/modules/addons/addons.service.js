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
    const scope = this._resolveScope(addonType, data?.scope);

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

    // FLOW-10-F03: idempotency. The route-level middleware short-circuits
    // duplicate identical bodies. The service layer also passes the key
    // through to paymentProvider.charge so the charge itself is exactly
    // once. If the route-level middleware did not run (e.g., service is
    // called directly from a worker), we still get end-to-end safety.
    const idempotencyKey =
      options.idempotencyKey
      || data?.idempotencyKey
      || `addon:${userId}:${addonType}:${quantity || 1}:${templateType || ''}:${eventId || ''}`;

    // FLOW-10-F01: skip payment for free addons (matches the 3.1 trial
    // guard pattern). Today no addon tier is free, but we keep the guard
    // explicit so promotional / zero-price tiers don't surprise the
    // provider.
    let paymentTransactionId = null;
    if (price > 0) {
      const charge = await paymentProvider.charge({
        amount: price,
        currency: 'SAR',
        customer: { id: userId },
        metadata: {
          addonType,
          quantity: quantity || 1,
          templateType: templateType || null,
          scope,
          subscriptionId: subscriptionId || null,
          eventId: eventId || null,
          description: `Addon purchase ${addonType}`,
        },
        idempotencyKey,
      });
      if (!charge.success) {
        throw new ValidationError(
          charge.error || 'Payment failed; addon not activated'
        );
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

    const addon = await Addon.create({
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
        idempotencyKey,
        activatedAt: initialStatus === 'active' ? new Date().toISOString() : null,
      },
    });

    // FLOW-10-F02: branch on scope and apply the quota update only when
    // the addon is fully active. Business customization waits for admin
    // approval.
    if (initialStatus === 'active') {
      await this._applyQuota(addon, { targetEvent });
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

    await logAudit({
      action: 'addon.activated_by_admin',
      actor: { _id: adminUserId, role: 'super_admin' },
      targetType: 'system',
      targetId: addon._id,
      metadata: {
        addonId: addon._id,
        addonType: addon.addonType,
        scope: addon.scope,
        notes: notes || null,
      },
    });

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

  _resolveScope(addonType, requestedScope) {
    if (requestedScope) {
      if (!['event', 'pool', 'org'].includes(requestedScope)) {
        throw new ValidationError(`Invalid scope: ${requestedScope}`);
      }
      return requestedScope;
    }
    return DEFAULT_SCOPE_BY_TYPE[addonType] || 'org';
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
