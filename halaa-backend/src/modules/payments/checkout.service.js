const crypto = require('crypto');
const Plan = require('../../../models/PlanModel');
const Subscription = require('../../../models/SubscriptionModel');
const Payment = require('../../../models/PaymentModel');
const Addon = require('../../../models/AddonModel');
const User = require('../../../models/UserModel');
const {
  ADDON_TYPES,
  deriveExpectedDeliveryDate,
} = require('../../shared/constants/addons');
const {
  SUBSCRIPTION_STATUS,
  ROLES,
} = require('../../shared/constants');
const { isPerEventPlan } = require('../../shared/constants/plans');
const { AppError, ValidationError, NotFoundError } = require('../../shared/errors');
const paymentProvider = require('../../infrastructure/paymentProvider');
const { logAudit } = require('../../shared/utils/auditLog');
const logger = require('../../shared/utils/logger');
const { computePrice, resolveScope } = require('../addons/addons.pricing');
const { applyQuota } = require('../addons/addons.quota');
const { recordPendingRefund } = require('../addons/addons.refund');
const notificationService = require('../notifications/notifications.service');
const email = require('../../../email');
const config = require('../../config');
const subscriptionLifecycle = require('../subscriptions/subscriptionLifecycle.service');
const {
  round2,
  toHalalas,
  halalasToSar,
  formatSar,
  buildCheckoutQuote,
} = require('../../shared/utils/money');
const setupFeeService = require('../business/business.setupFee.service');

class CheckoutService {
  _quoteSignaturePayload(userId, quote, expiresAt) {
    return JSON.stringify({
      userId: String(userId || 'anon'),
      planCode: quote.plan?.code || null,
      currency: quote.currency,
      totalHalalas: quote.totalHalalas,
      discountCode: quote.discountCode || null,
      setupFeeHalalas: quote.setupFeeHalalas,
      expiresAt: new Date(expiresAt).getTime(),
      lineItems: quote.lineItems.map((item) => ({
        type: item.type,
        code: item.code || null,
        addonType: item.addonType || null,
        templateType: item.templateType || null,
        referenceId: item.referenceId ? String(item.referenceId) : null,
        quantity: item.quantity,
        unitAmount: item.unitAmount,
        subtotal: item.subtotal,
        discountAllocation: item.discountAllocation,
        totalHalalas: item.totalHalalas,
      })),
    });
  }

  _signQuote(userId, quote, expiresAt) {
    const secret = process.env.CHECKOUT_QUOTE_SECRET || config.jwt?.secret || process.env.JWT_SECRET;
    if (!secret) throw new Error('Checkout quote signing secret is not configured');
    return `quote_${crypto.createHmac('sha256', secret)
      .update(this._quoteSignaturePayload(userId, quote, expiresAt))
      .digest('hex')}`;
  }

  _verifyQuote(userId, quote, quoteId, quoteExpiresAt) {
    if (!quoteId || !quoteExpiresAt) {
      throw new AppError('A current checkout quote is required. Please refresh and review the amount.', 409, 'QUOTE_REQUIRED');
    }
    const expiresAt = new Date(quoteExpiresAt);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
      throw new AppError('Quote has expired. Please refresh and review the updated amount.', 409, 'QUOTE_EXPIRED');
    }
    const expectedId = this._signQuote(userId, quote, expiresAt);
    const supplied = Buffer.from(String(quoteId));
    const expected = Buffer.from(expectedId);
    if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) {
      throw new AppError('The selected items or price changed. Please refresh and review the updated quote.', 409, 'QUOTE_CHANGED');
    }
    quote.quoteId = String(quoteId);
    quote.quoteExpiresAt = expiresAt;
  }

  /**
   * Authoritative checkout quote calculation (PLN-02).
   * Computes exact plan price, addons subtotal, discount allocation, setup fee,
   * currency, totals in SAR major and Halalas integer minor units, and quote signature.
   */
  async getQuote(userId, body = {}) {
    const { planCode, addons = [], discountCode } = body;

    const plan = await Plan.getOrCreateByCode(planCode);
    if (!plan) throw new ValidationError('Invalid plan code');

    let user = null;
    if (userId) {
      user = await User.findById(userId);
      if (user) {
        if (plan.availableFor === 'business' && user.accountType !== 'business') {
          throw new ValidationError('This plan is reserved for business accounts');
        }
        if (plan.availableFor === 'host' && user.role !== ROLES.HOST) {
          throw new ValidationError('This plan is not available for your account type');
        }
        if (planCode === 'trial') {
          const hadSubscriptionBefore = await Subscription.findOne({
            userId,
            status: { $ne: SUBSCRIPTION_STATUS.CANCELLED },
          });
          if (hadSubscriptionBefore) {
            throw new ValidationError('Trial plan can only be used once. Please choose a paid plan.');
          }
        }
      }
    }

    const planPrice = round2(plan?.pricing?.oneTime ?? 0);
    const isFreePlan = planCode === 'trial' || planPrice <= 0;

    if (isFreePlan && addons.length > 0) {
      throw new ValidationError(
        'Add-ons cannot be combined with the trial plan. Subscribe to a paid plan first.'
      );
    }

    const resolvedAddons = this._resolveAndPriceAddons(addons, plan);
    const addonsTotal = round2(resolvedAddons.reduce((s, a) => s + (a.price || 0), 0));
    const subtotal = round2(planPrice + addonsTotal);

    let discountAmount = 0;
    let validatedDiscountCode = null;
    let discountValid = null;
    let discountReason = null;

    if (discountCode) {
      const discountsService = require('../discounts/discounts.service');
      const result = await discountsService.validate(
        discountCode,
        subtotal,
        plan.planType
      );
      if (result.valid) {
        discountAmount = round2(result.discountAmount || 0);
        validatedDiscountCode = result.code;
        discountValid = true;
      } else {
        discountValid = false;
        discountReason = result.reason;
      }
    }

    let setupFee = 0;
    if (user && user.accountType === 'business' && plan.availableFor === 'business') {
      setupFee = round2(await setupFeeService.computeOwed(userId, plan));
    }

    const quote = buildCheckoutQuote({
      plan,
      addons: resolvedAddons,
      discountAmount,
      discountCode: validatedDiscountCode,
      setupFee,
      currency: plan?.currency || 'SAR',
    });

    if (discountCode && discountValid === false) {
      quote.discountValid = false;
      quote.discountReason = discountReason;
    } else if (discountCode && discountValid === true) {
      quote.discountValid = true;
    }

    quote.quoteId = this._signQuote(userId, quote, quote.quoteExpiresAt);

    return quote;
  }

  /**
   * Bundled plan + addons checkout. Charges plan+addons−discount as a single
   * Moyasar transaction, then on success activates the subscription and
   * creates each addon row. On 3DS, the intent is stashed on
   * Payment.metadata.pendingCheckoutIntent and finalized later.
   *
   * Compensating actions on partial failure:
   *   - Subscription create fails after charge → full pending_refund.
   *   - Addon create fails after subscription is up → line-item pending_refund
   *     for that addon's price; subscription stays. The user keeps what they
   *     actually got, ops handles the failed lines.
   */
  async checkout(userId, body, { idempotencyKey } = {}) {
    const {
      planCode,
      addons = [],
      discountCode,
      source,
      callbackUrl,
      expectedAmount,
      expectedTotal,
      quoteId,
      quoteExpiresAt,
    } = body;

    const user = await User.findById(userId);
    if (!user) throw new NotFoundError('User');

    const quote = await this.getQuote(userId, body);
    this._verifyQuote(userId, quote, quoteId, quoteExpiresAt);

    if (discountCode && quote.discountValid === false) {
      throw new ValidationError(`Discount code: ${quote.discountReason || 'invalid'}`);
    }

    // Price change verification (PLN-02)
    const expected = expectedAmount != null ? expectedAmount : expectedTotal;
    if (expected != null && toHalalas(expected) !== quote.totalHalalas) {
      throw new ValidationError(
        `Price changed since quote was generated. Expected ${expected} SAR, but current total is ${quote.total} SAR. Please review the updated quote.`
      );
    }

    const plan = await Plan.getOrCreateByCode(planCode);
    const planPrice = quote.planPrice;
    // Keep the operational add-on fields (price and resolved scope) for
    // fulfillment. Quote line items are presentation records and intentionally
    // do not carry every field needed to create an Addon document.
    const resolvedAddons = this._resolveAndPriceAddons(addons, plan);
    const addonsTotal = quote.addonsTotal;
    const discountAmount = quote.discountAmount;
    const validatedDiscountCode = quote.discountCode;
    const total = quote.total;
    const isFreePlan = planCode === 'trial' || (planPrice <= 0 && addonsTotal <= 0);

    // Free path: trial or fully discounted. No charge → fulfill immediately.
    if (total <= 0 || isFreePlan) {
      return this._fulfillBundle({
        userId,
        plan,
        planCode,
        discountCode: validatedDiscountCode,
        paymentRecord: null,
        addons: resolvedAddons,
        totals: {
          planPrice,
          addonsTotal,
          discountAmount,
          total: 0,
          totalHalalas: 0,
          quoteId: quote.quoteId,
        },
      });
    }

    // Pre-create Payment row + run Moyasar charge for the combined total.
    const finalCallbackUrl =
      callbackUrl || `${process.env.FRONTEND_URL || ''}/host/payments/return`;
    const derivedKey =
      idempotencyKey
      || `checkout:${userId}:${plan.code}:${total}:${resolvedAddons.length}`;

    // Checkout-level idempotency. The charge() call is wrapped by
    // withIdempotency, which replays the cached transactionId on retry.
    // Moyasar also dedupes server-side on `given_id`, which moyasar.js
    // derives via SHA-256 of the idempotency key — so the same
    // (user, plan, total, addonCount) tuple maps to the same Moyasar
    // payment id permanently, not just for the IdempotencyKey TTL. If
    // we don't short-circuit here, every retry inserts a fresh Payment
    // row and tries to attach the same moyasarPaymentId to it,
    // colliding with the prior row's unique index. No createdAt filter
    // for this reason: a stale match is still better than a 409.
    const existingCheckout = await Payment.findOne({
      userId,
      'metadata.checkoutKey': derivedKey,
      status: {
        $in: [
          Payment.PAYMENT_STATUS.PENDING_3DS,
          Payment.PAYMENT_STATUS.AUTHORIZED,
          Payment.PAYMENT_STATUS.PAID,
          Payment.PAYMENT_STATUS.CAPTURED,
        ],
      },
    }).sort({ createdAt: -1 });

    if (existingCheckout) {
      if (existingCheckout.status === Payment.PAYMENT_STATUS.PENDING_3DS) {
        return {
          requiresAction: true,
          redirectUrl: existingCheckout.redirectUrl,
          paymentId: existingCheckout._id,
          totals: {
            planPrice,
            addonsTotal,
            discountAmount,
            total,
            totalHalalas: quote.totalHalalas,
            quoteId: quote.quoteId,
          },
        };
      }
      // PAID/AUTHORIZED/CAPTURED — return the bundle that was already
      // activated by the first call. Never re-run _fulfillBundle on a
      // payment whose subscription is already attached: that would
      // create a duplicate subscription and auto-cancel the old one.
      if (existingCheckout.subscriptionId) {
        const subscription = await Subscription.findById(
          existingCheckout.subscriptionId
        ).populate('planId');
        return {
          subscription,
          addons: [],
          failedAddons: existingCheckout.metadata?.checkoutFailedAddons || [],
          alreadyFinalized: true,
          paymentId: existingCheckout._id,
          totals: {
            planPrice,
            addonsTotal,
            discountAmount,
            total,
            totalHalalas: quote.totalHalalas,
            quoteId: quote.quoteId,
          },
        };
      }
      // Paid but no subscription yet — finalize now (idempotent via
      // metadata.checkoutFinalizedAt). Used when the 3DS callback or a
      // crash interrupted the first attempt between charge and fulfill.
      if (existingCheckout.metadata?.pendingCheckoutIntent) {
        return this.finalizePending3ds(existingCheckout._id);
      }
      return this._fulfillBundle({
        userId,
        plan,
        planCode,
        discountCode: validatedDiscountCode,
        paymentRecord: existingCheckout,
        addons: resolvedAddons,
        totals: {
          planPrice,
          addonsTotal,
          discountAmount,
          total,
          totalHalalas: quote.totalHalalas,
          quoteId: quote.quoteId,
        },
      });
    }

    const paymentRecord = await Payment.create({
      userId,
      amount: total,
      currency: plan?.currency || 'SAR',
      provider: 'moyasar',
      status: Payment.PAYMENT_STATUS.PENDING,
      callbackUrl: finalCallbackUrl,
      description: this._describeCheckout(planCode, resolvedAddons.length),
      // `purpose: 'checkout'` is the dispatch key used by webhook/poll3ds to
      // route this payment through finalizePending3ds. `checkoutKey` is the
      // lookup field for the replay short-circuit above.
      metadata: {
        purpose: 'checkout',
        planCode,
        planId: plan._id,
        discountCode: validatedDiscountCode,
        discountAmount,
        addonCount: resolvedAddons.length,
        userId: String(userId),
        checkoutKey: derivedKey,
        quoteId: body.quoteId || quote.quoteId,
        totalHalalas: quote.totalHalalas,
        planPrice: quote.planPrice,
        addonsTotal: quote.addonsTotal,
        lineItems: quote.lineItems,
      },
    });

    const charge = await paymentProvider.charge({
      amount: total,
      currency: plan?.currency || 'SAR',
      source: source || { type: 'creditcard' },
      customer: { id: userId },
      callbackUrl: finalCallbackUrl,
      userId,
      idempotencyKey: derivedKey,
      description: this._describeCheckout(planCode, resolvedAddons.length),
      metadata: {
        purpose: 'checkout',
        planCode,
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
        logger.error('[checkout] failed to persist FAILED payment status', {
          paymentId: paymentRecord._id,
          error: saveErr?.message,
        });
      }
      logger.error('[checkout] payment provider error', {
        error: charge.error || charge.providerStatus || 'unknown',
        paymentId: paymentRecord._id,
      });
      throw new ValidationError('Payment failed; nothing was activated');
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
        pendingCheckoutIntent: {
          planId: plan._id,
          planCode: plan.code,
          discountCode: validatedDiscountCode,
          discountAmount,
          addons: resolvedAddons.map((a) => ({
            addonType: a.addonType,
            quantity: a.quantity,
            templateType: a.templateType || null,
            scope: a.scope,
            price: a.price,
          })),
        },
      };
      await paymentRecord.save();
      return {
        requiresAction: true,
        redirectUrl: charge.redirectUrl,
        paymentId: paymentRecord._id,
        totals: {
          planPrice,
          addonsTotal,
          discountAmount,
          total,
          totalHalalas: quote.totalHalalas,
          quoteId: quote.quoteId,
        },
      };
    }

    paymentRecord.status = charge.providerStatus === 'authorized'
      ? Payment.PAYMENT_STATUS.AUTHORIZED
      : Payment.PAYMENT_STATUS.PAID;
    if (paymentRecord.status === Payment.PAYMENT_STATUS.PAID) paymentRecord.paidAt = new Date();
    if (paymentRecord.status === Payment.PAYMENT_STATUS.AUTHORIZED) paymentRecord.authorizedAt = new Date();
    await paymentRecord.save();

    return this._fulfillBundle({
      userId,
      plan,
      planCode,
      discountCode: validatedDiscountCode,
      paymentRecord,
      addons: resolvedAddons,
      totals: {
        planPrice,
        addonsTotal,
        discountAmount,
        total,
        totalHalalas: quote.totalHalalas,
        quoteId: quote.quoteId,
      },
    });
  }

  /**
   * Resume a 3DS-paused checkout. Idempotent via Payment.metadata.checkoutFinalizedAt:
   * once finalized, repeated calls return the same subscription + addons.
   *
   * Called by:
   *   - the webhook handler on payment_paid (purpose=checkout)
   *   - the frontend's poll endpoint when the user returns from 3DS
   *   - the reconciliation cron when it spots a stale pending_3ds row
   */
  async finalizePending3ds(paymentId) {
    const payment = await Payment.findById(paymentId);
    if (!payment) throw new NotFoundError('Payment');

    if (payment.metadata?.checkoutFinalizedAt) {
      // Already finalized — return the bundle so callers can refresh views.
      const subscription = payment.subscriptionId
        ? await Subscription.findById(payment.subscriptionId).populate('planId')
        : null;
      return { subscription, addons: [], failedAddons: [], alreadyFinalized: true };
    }

    if (![Payment.PAYMENT_STATUS.PAID, Payment.PAYMENT_STATUS.AUTHORIZED]
      .includes(payment.status)) {
      throw new ValidationError(
        `Payment ${paymentId} is in status "${payment.status}", cannot finalize checkout`
      );
    }

    const intent = payment.metadata?.pendingCheckoutIntent;
    if (!intent) {
      throw new ValidationError(`Payment ${paymentId} has no checkout intent`);
    }

    const plan = await Plan.findById(intent.planId);
    if (!plan) throw new ValidationError(`Plan ${intent.planId} no longer exists`);

    return this._fulfillBundle({
      userId: payment.userId,
      plan,
      planCode: intent.planCode,
      discountCode: intent.discountCode,
      paymentRecord: payment,
      addons: intent.addons || [],
      totals: {
        planPrice: plan?.pricing?.oneTime ?? 0,
        addonsTotal: (intent.addons || []).reduce((s, a) => s + (a.price || 0), 0),
        discountAmount: intent.discountAmount || 0,
        total: payment.amount,
        totalHalalas: toHalalas(payment.amount),
        quoteId: payment.metadata?.quoteId || null,
      },
    });
  }

  // ---- internals ----

  _describeCheckout(planCode, addonCount) {
    if (!addonCount) return `Subscription to ${planCode}`;
    return `Subscription to ${planCode} + ${addonCount} addon(s)`;
  }

  _resolveAndPriceAddons(items, plan) {
    return items.map((item) => {
      const price = computePrice(item.addonType, {
        quantity: item.quantity,
        templateType: item.templateType,
      });
      const scope = resolveScope(item.addonType, item.scope, { eventId: null });
      // Belt-and-suspenders: schema already excludes 'event'. If a future
      // schema relaxation lets it through, reject here too.
      if (scope === 'event') {
        throw new ValidationError(
          'event-scoped addons cannot be combined with checkout; purchase them after the event is created.'
        );
      }
      // NOTE: extra_invites ARE valid on per-event plans — per-event plans carry
      // an invitePool, and the addon folds straight into it via applyQuota. Do
      // NOT reject here.
      return { ...item, price, scope };
    });
  }

  /**
   * Charge already happened (or wasn't needed). Create subscription + addons,
   * write line-item compensations on partial failure, mark
   * Payment.metadata.checkoutFinalizedAt for idempotency.
   */
  async _fulfillBundle({ userId, plan, planCode, discountCode, paymentRecord, addons, totals }) {
    const subscription = await this._createSubscriptionFromCheckout({
      userId, plan, planCode, paymentRecord,
    });

    if (paymentRecord) {
      paymentRecord.subscriptionId = subscription._id;
      try {
        await paymentRecord.save();
      } catch (saveErr) {
        logger.error('[checkout] failed to persist payment.subscriptionId back-reference', {
          paymentId: paymentRecord._id,
          subscriptionId: subscription._id,
          error: saveErr?.message,
        });
      }
    }

    if (discountCode) {
      try {
        const discountsService = require('../discounts/discounts.service');
        await discountsService.applyDiscount(discountCode);
      } catch (e) {
        logger.warn('[checkout] failed to increment discount usage', {
          code: discountCode,
          error: e?.message,
        });
      }
    }

    // Mark user-level housekeeping flags.
    await User.findByIdAndUpdate(userId, {
      subscription: subscription._id,
      'profile.hostData.subscribedBefore': true,
    });

    // Sequential addon fulfillment. Each addon failure is its own line-item
    // pending refund — the subscription stays.
    const createdAddons = [];
    const failedAddons = [];
    for (const item of addons) {
      try {
        const addon = await this._createAddonFromCheckout({
          userId,
          item,
          subscriptionId: subscription._id,
          paymentRecord,
        });
        createdAddons.push(addon);
      } catch (addonErr) {
        failedAddons.push({
          addonType: item.addonType,
          quantity: item.quantity || 1,
          price: item.price,
          reason: addonErr?.message || 'unknown',
        });
        logger.error('[checkout] addon fulfillment failed', {
          addonType: item.addonType,
          paymentId: paymentRecord?._id,
          error: addonErr?.message,
        });
        if (paymentRecord) {
          await recordPendingRefund({
            userId,
            amount: item.price,
            currency: 'SAR',
            paymentId: paymentRecord._id,
            reason: 'checkout_addon_create_failed',
            detail: addonErr?.message,
            addonType: item.addonType,
            scope: item.scope,
          });
        }
      }
    }

    // Mark the checkout fully finalized so 3DS resume / webhook reruns
    // are no-ops. This is the bundled-flow analogue of payment.subscriptionId
    // / payment.addonId guards in the per-flow finalizePending3ds.
    if (paymentRecord) {
      paymentRecord.metadata = {
        ...(paymentRecord.metadata || {}),
        checkoutFinalizedAt: new Date(),
        checkoutFailedAddons: failedAddons.length ? failedAddons : undefined,
      };
      try {
        await paymentRecord.save();
      } catch (saveErr) {
        logger.error('[checkout] failed to persist checkoutFinalizedAt', {
          paymentId: paymentRecord._id,
          error: saveErr?.message,
        });
      }
    }

    await logAudit({
      action: 'checkout.completed',
      actor: { _id: userId, role: ROLES.HOST },
      targetType: 'payment',
      targetId: paymentRecord?._id || subscription._id,
      metadata: {
        planCode,
        subscriptionId: subscription._id,
        paymentId: paymentRecord?._id || null,
        moyasarPaymentId: paymentRecord?.moyasarPaymentId || null,
        addonCount: addons.length,
        addonsCreated: createdAddons.length,
        addonsFailed: failedAddons.length,
        ...totals,
      },
    });

    notificationService.sendToUser(userId, {
      type: 'subscription_activated',
      title: 'Subscription Activated',
      titleAr: 'تم تفعيل الاشتراك',
      message: `Your ${planCode} subscription has been activated.`,
      messageAr: `تم تفعيل اشتراكك في باقة ${planCode}.`,
      data: { entityType: 'subscription', entityId: subscription._id, metadata: { planCode } },
    }).catch((e) => logger.warn('[checkout] notify user failed', { error: e?.message }));

    // Plan/payment emails always fire — host has no opt-out for these.
    // `_fulfillBundle` only receives `userId`, so load the user here (the
    // outer `checkout()` `user` binding is not in scope on this path).
    const user = await User.findById(userId).select('email name role');
    if (user?.email) {
      const frontendUrl = config.frontendUrl || process.env.FRONTEND_URL || '';
      email.send.paymentConfirmation(user.email, {
        recipientName: user.name || '',
        amount: totals?.totalAmount ?? totals?.amount ?? paymentRecord?.amount ?? 0,
        currency: paymentRecord?.currency || plan?.currency || 'SAR',
        planName: plan?.name || planCode,
        paymentDate: new Date(),
        invoiceNumber: paymentRecord?.moyasarPaymentId || String(paymentRecord?._id || ''),
        paymentMethod: paymentRecord?.paymentMethod || paymentRecord?.metadata?.source || 'card',
        invoiceUrl: `${frontendUrl}/ar/${user.role || 'host'}/plans`,
      }).catch((e) =>
        logger.warn('[checkout] payment confirmation email failed', { error: e?.message })
      );
    }

    return {
      subscription: subscription.getSummary ? subscription.getSummary() : subscription,
      addons: createdAddons,
      failedAddons,
      paymentId: paymentRecord?._id || null,
      totals,
    };
  }

  async _createSubscriptionFromCheckoutLegacy({ userId, plan, planCode, paymentRecord }) {
    // Post-charge ordering: cancel existing actives only AFTER we know the
    // charge succeeded (paymentRecord is set or the plan is free). On creation
    // failure with a paid charge, raise pending_refund and surface the
    // user-facing "money taken" message.
    const existingActive = await Subscription.find({
      userId,
      status: { $in: [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.TRIAL] },
    });

    let subscription;
    try {
      const planPrice = plan?.pricing?.oneTime ?? 0;
      const isFreePlan = planCode === 'trial' || planPrice <= 0;

      subscription = await Subscription.createForUser(userId, plan, {
        // pricePaid records the plan price only; bundle totals (with addons +
        // discount) live on Payment.amount. Reporting / downgrade-credit
        // calculations downstream read this field as the plan's price.
        pricePaid: isFreePlan ? 0 : planPrice,
        currency: plan?.currency || 'SAR',
        status: planCode === 'trial' ? SUBSCRIPTION_STATUS.TRIAL : SUBSCRIPTION_STATUS.ACTIVE,
        createdBy: { user: userId, onBehalfOf: false },
      });

      if (planCode === 'trial') {
        const TRIAL_DURATION_DAYS = 14;
        subscription.expiresAt = new Date(
          (subscription.activatedAt || subscription.createdAt).getTime()
          + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000
        );
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
    } catch (createErr) {
      if (paymentRecord) {
        await recordPendingRefund({
          userId,
          amount: paymentRecord.amount,
          currency: paymentRecord.currency || 'SAR',
          paymentId: paymentRecord._id,
          reason: 'checkout_subscribe_create_failed',
          detail: createErr?.message,
        });
        throw new ValidationError(
          'Payment was processed but the subscription could not be activated. '
          + 'Our team has been notified — please contact support with your transaction reference.'
        );
      }
      throw createErr;
    }

    // Business self-upgrade: carry remaining (base+compensation−consumed)
    // invites from the subscription(s) being replaced onto the new one's
    // compensation pool, per the merged-pool carryover rule. Only for
    // business plans; host checkout behaviour is unchanged.
    if (plan.availableFor === 'business' && existingActive.length > 0) {
      let carried = 0;
      for (const old of existingActive) {
        if (old.invitePool === null || old.invitePool === undefined) continue;
        carried += Math.max(
          0,
          (old.invitePool || 0) + (old.compensationPool || 0) - (old.invitesConsumed || 0)
        );
      }
      if (
        carried > 0 &&
        subscription.invitePool !== null &&
        subscription.invitePool !== undefined
      ) {
        subscription.compensationPool = (subscription.compensationPool || 0) + carried;
        await subscription.save();
      }
    }

    // Subscription is up — now cancel old actives.
    for (const existing of existingActive) {
      try {
        existing.status = SUBSCRIPTION_STATUS.CANCELLED;
        existing.cancelledAt = new Date();
        existing.cancelReason = `Auto-cancelled on checkout to ${planCode}`;
        await existing.save();
      } catch (cancelErr) {
        logger.error('[checkout] failed to cancel existing subscription after charge', {
          oldSubscriptionId: existing._id,
          error: cancelErr?.message,
        });
      }
    }

    return subscription;
  }

  async _createSubscriptionFromCheckout({ userId, plan, planCode, paymentRecord }) {
    const planPrice = plan?.pricing?.oneTime ?? 0;
    const isFreePlan = planCode === 'trial' || planPrice <= 0;

    try {
      const { subscription } = await subscriptionLifecycle.changePlan(userId, plan, {
        actor: { _id: userId, role: ROLES.HOST, onBehalfOf: false },
        reason: 'self_service_checkout',
        pricePaid: isFreePlan ? 0 : planPrice,
        currency: plan?.currency || 'SAR',
        status: planCode === 'trial' ? SUBSCRIPTION_STATUS.TRIAL : SUBSCRIPTION_STATUS.ACTIVE,
        createdBy: { user: userId, onBehalfOf: false },
        paymentRecord,
        metadata: {
          checkoutPlanCode: planCode,
        },
        cancelReason: `Auto-cancelled on checkout to ${planCode}`,
      });

      return subscription;
    } catch (createErr) {
      if (paymentRecord) {
        await recordPendingRefund({
          userId,
          amount: paymentRecord.amount,
          currency: paymentRecord.currency || 'SAR',
          paymentId: paymentRecord._id,
          reason: 'checkout_subscribe_create_failed',
          detail: createErr?.message,
        });
        throw new ValidationError(
          'Payment was processed but the subscription could not be activated. '
          + 'Our team has been notified - please contact support with your transaction reference.'
        );
      }
      throw createErr;
    }
  }

  async _createAddonFromCheckout({ userId, item, subscriptionId, paymentRecord }) {
    const requestedAt = new Date();
    const initialStatus =
      item.addonType === ADDON_TYPES.BUSINESS_CUSTOMIZATION
        ? 'pending_provisioning'
        : item.addonType === ADDON_TYPES.DESIGN_TEMPLATE
          ? 'paid'
          : 'active';

    const addon = await Addon.create({
      userId,
      addonType: item.addonType,
      quantity: item.quantity || 1,
      templateType: item.templateType || null,
      price: item.price,
      currency: 'SAR',
      subscriptionId,
      eventId: null,
      status: initialStatus,
      scope: item.scope,
      metadata: {
        paymentId: paymentRecord?._id || null,
        viaCheckout: true,
        activatedAt: initialStatus === 'active' ? new Date().toISOString() : null,
      },
      fulfillment:
        item.addonType === ADDON_TYPES.DESIGN_TEMPLATE
          ? {
              requestedAt,
              expectedDeliveryAt: deriveExpectedDeliveryDate(item.templateType, requestedAt),
            }
          : undefined,
    });

    if (initialStatus === 'active') {
      try {
        await applyQuota(addon, {});
      } catch (quotaErr) {
        // Compensating action: roll the addon to failed_quota and surface a
        // line-item refund. Subscription stays.
        try {
          addon.status = 'failed_quota';
          addon.metadata = {
            ...(addon.metadata || {}),
            quotaError: quotaErr?.message || 'unknown',
          };
          await addon.save();
        } catch (saveErr) {
          logger.warn('[checkout] failed to mark addon failed_quota', {
            addonId: addon._id,
            error: saveErr?.message,
          });
        }
        throw quotaErr;
      }
    }

    return addon;
  }
}

module.exports = new CheckoutService();
