const Addon = require('../../../models/AddonModel');
const Subscription = require('../../../models/SubscriptionModel');
const Event = require('../../../models/EventModel');
const Payment = require('../../../models/PaymentModel');
const {
  ADDON_TYPES,
  EXTRA_INVITES_TIERS,
  DESIGN_TEMPLATE_TIERS,
  BUSINESS_CUSTOMIZATION,
  DESIGN_FULFILLMENT_STATUS,
  isValidDesignFulfillmentTransition,
  deriveExpectedDeliveryDate,
} = require('../../shared/constants/addons');
const { ROLES, isAdminRole } = require('../../shared/constants/roles');
const { ValidationError, NotFoundError, ConflictError, ForbiddenError } = require('../../shared/errors');
const paymentProvider = require('../../infrastructure/paymentProvider');
const { logAudit } = require('../../shared/utils/auditLog');
const logger = require('../../shared/utils/logger');
const { computePrice, resolveScope } = require('./addons.pricing');
const { applyQuota, clawbackExtraInvites } = require('./addons.quota');
// Late-bound handle so the store-grant path's quota call is stubbable in tests
// (the in-transaction rollback path, §10).
const addonsQuota = require('./addons.quota');
const { recordPendingRefund } = require('./addons.refund');
const { withTransaction } = require('../../shared/utils/withTransaction');

class AddonsService {
  getAvailableAddons() {
    return {
      extra_invites: EXTRA_INVITES_TIERS,
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
        : addonType === ADDON_TYPES.DESIGN_TEMPLATE
          ? 'paid'
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
        fulfillment:
          addonType === ADDON_TYPES.DESIGN_TEMPLATE
            ? {
                requestedAt: new Date(),
                expectedDeliveryAt: deriveExpectedDeliveryDate(templateType, new Date()),
              }
            : undefined,
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

  /**
   * Admin-only: list custom-design addon fulfillment queue.
   * Paginated and filterable by status, templateType, and search.
   */
  async listAdminDesignFulfillment({ status, templateType, search, page = 1, limit = 20, skip = 0 } = {}) {
    const query = { addonType: ADDON_TYPES.DESIGN_TEMPLATE };

    if (status && status !== 'all') {
      query.status = status;
    }

    if (templateType) {
      query.templateType = templateType;
    }

    if (search && search.trim()) {
      const s = search.trim();
      if (/^[0-9a-fA-F]{24}$/.test(s)) {
        query.$or = [{ _id: s }, { userId: s }, { eventId: s }];
      } else {
        const User = require('../../../models/UserModel');
        const users = await User.find({
          $or: [
            { name: { $regex: s, $options: 'i' } },
            { email: { $regex: s, $options: 'i' } },
            { phone: { $regex: s, $options: 'i' } },
          ],
        }).select('_id').lean();
        const userIds = users.map((u) => u._id);
        query.userId = { $in: userIds };
      }
    }

    const [items, total] = await Promise.all([
      Addon.find(query)
        .sort({ 'fulfillment.requestedAt': -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'name email phone')
        .populate('eventId', 'title eventDate')
        .populate('fulfillment.updatedBy', 'name')
        .lean(),
      Addon.countDocuments(query),
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
   * Admin-only: transition custom design fulfillment status.
   * Allowed sequence: paid -> queued -> in_progress -> fulfilled
   * Same-state requests are idempotent.
   * Skipped/reversed transitions return 409 Conflict.
   */
  async transitionDesignFulfillment(adminUser, addonId, { toStatus, customerNote, internalNotes, expectedDeliveryAt } = {}) {
    const addon = await Addon.findById(addonId);
    if (!addon) throw new NotFoundError('Addon');

    if (addon.addonType !== ADDON_TYPES.DESIGN_TEMPLATE) {
      throw new ValidationError('Only design_template addons participate in fulfillment workflow');
    }

    const fromStatus = addon.status;

    // Idempotent same-state check
    if (fromStatus === toStatus) {
      let modified = false;
      if (customerNote !== undefined && customerNote !== addon.fulfillment?.customerNote) {
        addon.fulfillment = addon.fulfillment || {};
        addon.fulfillment.customerNote = customerNote;
        modified = true;
      }
      if (internalNotes !== undefined && internalNotes !== addon.fulfillment?.internalNotes) {
        addon.fulfillment = addon.fulfillment || {};
        addon.fulfillment.internalNotes = internalNotes;
        modified = true;
      }
      if (expectedDeliveryAt !== undefined) {
        addon.fulfillment = addon.fulfillment || {};
        addon.fulfillment.expectedDeliveryAt = expectedDeliveryAt ? new Date(expectedDeliveryAt) : null;
        modified = true;
      }
      if (modified) {
        await addon.save();
      }
      return addon;
    }

    // State machine check: paid -> queued -> in_progress -> fulfilled
    if (!isValidDesignFulfillmentTransition(fromStatus, toStatus)) {
      throw new ConflictError(
        `Cannot transition design fulfillment from '${fromStatus}' to '${toStatus}'. Allowed sequence: paid -> queued -> in_progress -> fulfilled.`
      );
    }

    addon.status = toStatus;
    addon.fulfillment = addon.fulfillment || {};
    addon.fulfillment.updatedBy = adminUser?._id || null;

    const now = new Date();
    if (toStatus === DESIGN_FULFILLMENT_STATUS.QUEUED) {
      addon.fulfillment.queuedAt = now;
    } else if (toStatus === DESIGN_FULFILLMENT_STATUS.IN_PROGRESS) {
      addon.fulfillment.inProgressAt = now;
    } else if (toStatus === DESIGN_FULFILLMENT_STATUS.FULFILLED) {
      addon.fulfillment.fulfilledAt = now;
    }

    if (customerNote !== undefined) {
      addon.fulfillment.customerNote = customerNote;
    }
    if (internalNotes !== undefined) {
      addon.fulfillment.internalNotes = internalNotes;
    }
    if (expectedDeliveryAt !== undefined) {
      addon.fulfillment.expectedDeliveryAt = expectedDeliveryAt ? new Date(expectedDeliveryAt) : null;
    }

    await addon.save();

    // Audit logging (non-blocking / failure-safe)
    try {
      await logAudit({
        action: 'addon.fulfillment_transition',
        actor: { _id: adminUser?._id, role: adminUser?.role || ROLES.SUPER_ADMIN },
        targetType: 'addon',
        targetId: addon._id,
        metadata: {
          addonId: addon._id,
          addonType: addon.addonType,
          templateType: addon.templateType,
          fromStatus,
          toStatus,
          customerNote: customerNote || null,
          internalNotes: internalNotes || null,
        },
      });
    } catch (auditErr) {
      logger.error('[addons.transitionFulfillment] audit log failed', {
        addonId: addon._id,
        error: auditErr?.message,
      });
    }

    // Post-commit notification to host (non-blocking / failure-safe)
    try {
      if (addon.userId) {
        const notificationsService = require('../notifications/notifications.service');
        const NOTIFICATION_MESSAGES = {
          [DESIGN_FULFILLMENT_STATUS.QUEUED]: {
            titleAr: 'تم إدراج طلب التصميم في قائمة التنفيذ',
            titleEn: 'Your custom design request is queued',
            messageAr: customerNote || 'تم استلام طلب التصميم وإدراجه في قائمة التنفيذ لدى فريق التصميم.',
            messageEn: customerNote || 'Your custom design request has been received and queued for execution.',
          },
          [DESIGN_FULFILLMENT_STATUS.IN_PROGRESS]: {
            titleAr: 'بدأ فريق التصميم العمل على طلبك',
            titleEn: 'Design work is now in progress',
            messageAr: customerNote || 'بدأ مصمم هلا العمل على تصميم دعوتك المخصصة وسيتواصل معك قريباً.',
            messageEn: customerNote || 'Our designer has started working on your custom invitation design and will reach out shortly.',
          },
          [DESIGN_FULFILLMENT_STATUS.FULFILLED]: {
            titleAr: 'تم إكمال وتوصيل تصميم دعوتك بنجاح',
            titleEn: 'Your custom design is completed and delivered',
            messageAr: customerNote || 'تم الانتهاء من تصميم دعوتك المخصصة بنجاح. شكراً لاختيارك هلا!',
            messageEn: customerNote || 'Your custom invitation design is completed and delivered. Thank you for choosing Halaa!',
          },
        };

        const msg = NOTIFICATION_MESSAGES[toStatus];
        if (msg) {
          await notificationsService.createNotification(addon.userId, {
            type: 'custom',
            title: msg.titleEn,
            titleAr: msg.titleAr,
            message: msg.messageEn,
            messageAr: msg.messageAr,
            idempotencyKey: `notification:${addon.userId}:design_fulfillment:${addon._id}:${toStatus}`,
            data: {
              entityType: 'user',
              entityId: addon.userId,
              metadata: {
                addonId: String(addon._id),
                status: toStatus,
              },
            },
            priority: 'high',
          });
        }
      }
    } catch (notifErr) {
      logger.error('[addons.transitionFulfillment] notification dispatch failed', {
        addonId: addon._id,
        error: notifErr?.message,
      });
    }

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
        : addonType === ADDON_TYPES.DESIGN_TEMPLATE
          ? 'paid'
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
        fulfillment:
          addonType === ADDON_TYPES.DESIGN_TEMPLATE
            ? {
                requestedAt: new Date(),
                expectedDeliveryAt: deriveExpectedDeliveryDate(templateType, new Date()),
              }
            : undefined,
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

  /**
   * Grant an add-on from a store (RevenueCat/IAP) purchase — no charge here
   * (the store already collected payment; the money is recorded in the Payment
   * ledger by the RevenueCat webhook). Mirrors the post-charge half of
   * `purchaseAddon`: create the Addon row + apply quota. Idempotent on the store
   * transaction id so a re-delivered webhook never double-grants. (§9.4 add-ons)
   *
   * @param {Object} p
   * @param {string} p.userId
   * @param {string} p.addonType  - extra_invites | design_template | business_customization
   * @param {number} [p.quantity] - extra_invites
   * @param {string} [p.templateType] - design_template
   * @param {string} p.providerTransactionId - store transaction id (dedupe key)
   * @param {string} [p.rcEventId]
   * @param {string} [p.store]
   */
  async grantAddonFromStore({
    userId,
    addonType,
    quantity,
    templateType,
    catalogCode,
    providerTransactionId,
    originalTransactionId,
    rcEventId,
    store,
    environment,
    catalogVersion,
    catalogHash,
  }) {
    if (!Object.values(ADDON_TYPES).includes(addonType)) {
      throw new ValidationError(`Invalid addon type: ${addonType}`);
    }
    // Idempotent on the FIRST-CLASS unique provider transaction id (ADD-01;
    // fixes P0-10 which relied on a non-unique metadata lookup + no index).
    if (providerTransactionId) {
      const existing = await Addon.findOne({ providerTransactionId });
      if (existing) return existing;
    }

    const price = computePrice(addonType, { quantity, templateType });
    const scope = resolveScope(addonType, undefined, {});

    // Resolve the EXACT target subscription BEFORE creating `active` (P0-10).
    let subscriptionId = null;
    if (scope === "pool" || scope === "org") {
      const activeSubs = (await Subscription.findActiveForUser(userId)) || [];
      subscriptionId = activeSubs[0]?._id || null;
    }

    // Per-type initial state:
    //  business_customization → pending_provisioning (managed service).
    //  design_template        → paid (managed-service workflow paid→…→fulfilled).
    //  extra_invites          → active (quota applied atomically below).
    const initialStatus =
      addonType === ADDON_TYPES.BUSINESS_CUSTOMIZATION
        ? "pending_provisioning"
        : addonType === ADDON_TYPES.DESIGN_TEMPLATE
          ? "paid"
          : "active";

    const needsQuota = addonType === ADDON_TYPES.EXTRA_INVITES && initialStatus === "active";

    const baseDoc = {
      userId,
      addonType,
      quantity: quantity || 1,
      templateType: templateType || null,
      price,
      currency: "SAR",
      subscriptionId,
      scope,
      source: "revenuecat",
      providerTransactionId: providerTransactionId || null,
      originalTransactionId: originalTransactionId || null,
      store: store || null,
      environment: environment || null,
      revenueCatEventId: rcEventId || null,
      catalogCode: catalogCode || null,
      catalogVersion: catalogVersion || null,
      catalogHash: catalogHash || null,
      metadata: { source: "revenuecat", rcEventId: rcEventId || null, store: store || null },
      fulfillment:
        addonType === ADDON_TYPES.DESIGN_TEMPLATE
          ? {
              requestedAt: new Date(),
              expectedDeliveryAt: deriveExpectedDeliveryDate(templateType, new Date()),
            }
          : undefined,
    };

    // Missing quota target is an ERROR, not a silent success (P0-10): record a
    // durable failed_quota + refund_required row and alert.
    if (needsQuota && !subscriptionId) {
      const failed = await Addon.create({ ...baseDoc, status: "failed_quota", refundState: "refund_required", grantedDelta: quantity || 1 });
      await recordPendingRefund({ userId, amount: price, currency: "SAR", reason: "addon_iap_missing_target_subscription", addonType, scope, providerTransactionId }).catch(() => {});
      logger.error("[addons.grantFromStore] no target subscription for pool/org add-on → failed_quota", { addonId: failed._id, providerTransactionId });
      return failed;
    }

    // SUCCESS path: create + apply quota ATOMICALLY.
    let addon;
    try {
      addon = await withTransaction(async (session) => {
        const [a] = await Addon.create(
          [{ ...baseDoc, status: initialStatus, grantedDelta: needsQuota ? quantity || 1 : null, metadata: { ...baseDoc.metadata, activatedAt: initialStatus === "active" ? new Date().toISOString() : null } }],
          session ? { session } : undefined
        );
        if (needsQuota) await addonsQuota.applyQuota(a, { session });
        return a;
      }, { label: "addon.grantFromStore" });
    } catch (err) {
      if (err.code === 11000) return Addon.findOne({ providerTransactionId }); // concurrent dup
      // Quota failed AFTER charge → durable observable failure + refund queue.
      addon = await Addon.create({ ...baseDoc, status: "failed_quota", refundState: "refund_required", grantedDelta: needsQuota ? quantity || 1 : null, metadata: { ...baseDoc.metadata, quotaError: err.message } });
      await recordPendingRefund({ userId, amount: price, currency: "SAR", reason: "addon_iap_quota_failed", detail: err.message, addonType, scope, providerTransactionId }).catch(() => {});
      logger.error("[addons.grantFromStore] applyQuota failed → failed_quota", { addonId: addon._id, error: err.message });
      return addon;
    }

    logAudit({
      action: "addon.purchased_iap",
      actor: { _id: userId, role: ROLES.HOST },
      targetType: "system",
      targetId: addon._id,
      metadata: { addonId: addon._id, addonType, quantity: quantity || 1, scope, status: addon.status, providerTransactionId: providerTransactionId || null, rcEventId: rcEventId || null },
    }).catch(() => {});

    return addon;
  }

  /**
   * Store-driven refund/reversal of an add-on (ADD-02 · §8), keyed to the EXACT
   * provider transaction. Refund handling differs by signed policy:
   *  - extra_invites (clawback_unused): reclaim only the still-unused delta,
   *    never below consumed usage.
   *  - design_template (non_refundable_from_creation): Halaa does not refund, but
   *    a store-FORCED refund is recorded + reconciled WITHOUT pretending the
   *    service work was undone.
   *  - business_customization (managed_service_legal_review): route to legal
   *    review; no automatic reversal.
   * Idempotent on the refund state.
   */
  async refundAddonFromStore({ providerTransactionId, rcEventId }) {
    if (!providerTransactionId) return null;
    const addon = await Addon.findOne({ providerTransactionId });
    if (!addon) return null;
    if (addon.refundState === "refunded" || addon.refundState === "reversed") return addon; // idempotent

    if (addon.addonType === ADDON_TYPES.EXTRA_INVITES) {
      const reclaimed = await withTransaction(async (session) => clawbackExtraInvites(addon, { session }), { label: "addon.refundClawback" });
      addon.clawedBackDelta = (addon.clawedBackDelta || 0) + reclaimed;
      addon.refundState = "refunded";
      addon.status = "refunded";
      addon.refundedAt = new Date();
      addon.refundReason = `store_refund_clawback_unused(reclaimed=${reclaimed})`;
      await addon.save();
      logger.warn("[addons.refundFromStore] extra_invites clawback", { addonId: addon._id, reclaimed });
      return addon;
    }

    if (addon.addonType === ADDON_TYPES.DESIGN_TEMPLATE) {
      // Signed DEC-03L: non-refundable from creation. A store-forced refund is
      // recorded + reconciled but the delivered/creative work is NOT undone.
      addon.refundState = "refunded";
      addon.refundedAt = new Date();
      addon.refundReason = "store_forced_refund_non_refundable_policy";
      await addon.save();
      await recordPendingRefund({ userId: addon.userId, amount: addon.price, currency: addon.currency, reason: "design_template_store_forced_refund", addonType: addon.addonType, providerTransactionId }).catch(() => {});
      return addon;
    }

    // business_customization → managed-service legal review, no auto reversal.
    addon.refundState = "manual_review";
    addon.refundedAt = new Date();
    addon.refundReason = "managed_service_legal_review";
    await addon.save();
    await recordPendingRefund({ userId: addon.userId, amount: addon.price, currency: addon.currency, reason: "business_customization_store_refund_manual_review", addonType: addon.addonType, providerTransactionId }).catch(() => {});
    return addon;
  }

  /**
   * Reverse a prior refund for the EXACT transaction (REFUND_REVERSED), once.
   * For extra_invites, restore exactly the clawed-back delta.
   */
  async reverseAddonRefund({ providerTransactionId }) {
    if (!providerTransactionId) return null;
    const addon = await Addon.findOne({ providerTransactionId });
    if (!addon) return null;
    if (addon.refundState === "reversed" || addon.refundState === "none") return addon; // idempotent

    if (addon.addonType === ADDON_TYPES.EXTRA_INVITES && (addon.clawedBackDelta || 0) > 0 && addon.subscriptionId) {
      const restore = addon.clawedBackDelta;
      await withTransaction(async (session) => {
        await Subscription.findByIdAndUpdate(addon.subscriptionId, { $inc: { invitePool: restore } }, session ? { session } : {});
      }, { label: "addon.reverseRefund" });
      addon.clawedBackDelta = 0;
      addon.status = "active";
    }
    addon.refundState = "reversed";
    addon.refundReason = `reversed(${addon.refundReason || ""})`;
    await addon.save();
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
