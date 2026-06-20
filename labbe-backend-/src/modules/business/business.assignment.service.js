/**
 * Business Plan Assignment Service
 *
 * The durable assignment + payment + entitlement state machine
 * (business-account plan #1/#2/#5). Two modes:
 *
 *   A. GRANT    — admin directly grants a plan (no payment; setup waived).
 *   B. CHECKOUT — admin issues a hosted checkout link (WhatsApp + SMS fallback);
 *                 the business pays plan + setup fee on a summary page.
 *
 * All money comes from the server quote. All activations are idempotent via
 * compare-and-set on the assignment `version`, so webhook + browser callback +
 * reconciliation can never double-activate.
 *
 * @module modules/business/business.assignment.service
 */

const mongoose = require('mongoose');

const User = require('../../../models/UserModel');
const Plan = require('../../../models/PlanModel');
const Subscription = require('../../../models/SubscriptionModel');
const Payment = require('../../../models/PaymentModel');
const BusinessPlanAssignment = require('../../../models/BusinessPlanAssignmentModel');
const { ASSIGNMENT_STATUS, ASSIGNMENT_MODE } = require('../../../models/BusinessPlanAssignmentModel');

const { ValidationError, NotFoundError, ConflictError } = require('../../shared/errors');
const { SUBSCRIPTION_STATUS, ACCOUNT_TYPES } = require('../../shared/constants');
const { round2 } = require('../../shared/utils/money');
const { generateCheckoutToken, hashCheckoutToken } = require('../../shared/utils/checkoutToken');
const { logAudit } = require('../../shared/utils/auditLog');
const logger = require('../../shared/utils/logger');
const config = require('../../config');

const quoteService = require('./business.quote.service');
const setupFeeService = require('./business.setupFee.service');
const paymentProvider = require('../../infrastructure/paymentProvider');
const { recordPendingRefund } = require('../addons/addons.refund');
const notificationService = require('../notifications/notifications.service');

const LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

class BusinessAssignmentService {
  // ─── loaders / guards ────────────────────────────────────────────────

  async _loadBusinessUser(businessUserId) {
    const user = await User.findById(businessUserId);
    if (!user) throw new NotFoundError('Business');
    if (user.accountType !== ACCOUNT_TYPES.BUSINESS) {
      throw new ValidationError('Target user is not a business account');
    }
    return user;
  }

  async _loadBusinessPlan(planCode) {
    const plan = await Plan.findOne({ code: planCode });
    if (!plan) throw new NotFoundError('Plan');
    if (plan.availableFor !== 'business') {
      throw new ValidationError('Only business plans can be assigned to a business account');
    }
    if (!plan.isActive) throw new ValidationError('Plan is not active');
    return plan;
  }

  /**
   * Supersede an existing PENDING_PAYMENT assignment so a new one can be issued.
   * Refuses if an in-flight `payment_processing`/`paid` assignment exists — those
   * must NOT be cancelled by a new assignment. [#3-of-review]
   */
  async _supersedePending(businessUserId, replacementId = null) {
    const inFlight = await BusinessPlanAssignment.findOne({
      businessUserId,
      status: { $in: [ASSIGNMENT_STATUS.PAYMENT_PROCESSING, ASSIGNMENT_STATUS.PAID] },
    });
    if (inFlight) {
      throw new ConflictError(
        'A payment is already in progress for this business; resolve it before assigning a new plan'
      );
    }
    const pending = await BusinessPlanAssignment.findOne({
      businessUserId,
      status: ASSIGNMENT_STATUS.PENDING_PAYMENT,
    });
    if (pending) {
      await BusinessPlanAssignment.transition(
        pending._id,
        ASSIGNMENT_STATUS.PENDING_PAYMENT,
        pending.version,
        ASSIGNMENT_STATUS.SUPERSEDED,
        { supersededBy: replacementId, completedAt: new Date() }
      );
    }
  }

  // ─── MODE A: direct grant ────────────────────────────────────────────

  /**
   * Directly grant a business plan. No payment; setup fee waived; audited and
   * distinguishable from a paid activation.
   */
  async assignGrant({ businessUserId, planCode, grantReason, createdBy }) {
    const user = await this._loadBusinessUser(businessUserId);
    const plan = await this._loadBusinessPlan(planCode);

    await this._supersedePending(businessUserId);

    const planPrice = round2(plan?.pricing?.oneTime ?? 0);
    const assignment = await BusinessPlanAssignment.create({
      businessUserId,
      planId: plan._id,
      planCode: plan.code,
      mode: ASSIGNMENT_MODE.GRANT,
      status: ASSIGNMENT_STATUS.ACTIVE,
      planPriceSnapshot: planPrice,
      setupFeeSnapshot: 0, // waived
      currency: plan.currency || 'SAR',
      totalSnapshot: 0, // nominal — no charge
      grantReason: grantReason || 'admin_grant',
      createdBy: createdBy || null,
      completedAt: new Date(),
    });

    try {
      const subscription = await this._activateSubscription({
        businessUserId,
        plan,
        assignment,
        paymentRecord: null,
      });
      await setupFeeService.settleWaived(businessUserId, {
        plan,
        assignmentId: assignment._id,
        waivedBy: createdBy,
        reason: grantReason || 'direct_grant',
      });
      assignment.subscriptionId = subscription._id;
      await assignment.save();

      await logAudit({
        action: 'business.plan.granted',
        actor: { _id: createdBy, role: 'admin' },
        targetType: 'user',
        targetId: businessUserId,
        metadata: { planCode: plan.code, assignmentId: assignment._id, mode: 'grant' },
      });

      notificationService
        .sendToUser(businessUserId, {
          type: 'subscription_activated',
          title: 'Plan Activated',
          titleAr: 'تم تفعيل الباقة',
          message: `Your ${plan.nameEn || plan.code} plan has been activated.`,
          messageAr: `تم تفعيل باقة ${plan.nameAr || plan.code}.`,
          data: { entityType: 'subscription', entityId: subscription._id },
        })
        .catch(() => {});

      return { assignment, subscription };
    } catch (err) {
      assignment.status = ASSIGNMENT_STATUS.ACTIVATION_FAILED;
      assignment.failureCode = err?.message || 'activation_failed';
      await assignment.save().catch(() => {});
      throw err;
    }
  }

  // ─── MODE B: checkout link ───────────────────────────────────────────

  /**
   * Issue a hosted checkout link. Builds the server quote, snapshots it, stores
   * a hashed token, and delivers the link over WhatsApp (+ SMS fallback).
   *
   * @returns {Promise<{ assignment, rawToken, link }>}
   */
  async assignCheckout({ businessUserId, planCode, discountCode, createdBy, deliver = true }) {
    const user = await this._loadBusinessUser(businessUserId);
    const plan = await this._loadBusinessPlan(planCode);

    let discountAmount = 0;
    let validatedDiscountCode = null;
    if (discountCode) {
      const discountsService = require('../discounts/discounts.service');
      const planPrice = round2(plan?.pricing?.oneTime ?? 0);
      const result = await discountsService.validate(discountCode, planPrice, plan.planType);
      if (!result.valid) throw new ValidationError(`Discount code: ${result.reason}`);
      discountAmount = result.discountAmount || 0;
      validatedDiscountCode = result.code;
    }

    const quote = await quoteService.buildQuote({
      plan,
      businessUserId,
      discountAmount,
      discountCode: validatedDiscountCode,
    });

    await this._supersedePending(businessUserId);

    const { raw, hash } = generateCheckoutToken();
    const now = Date.now();
    const assignment = await BusinessPlanAssignment.create({
      businessUserId,
      planId: plan._id,
      planCode: plan.code,
      mode: ASSIGNMENT_MODE.CHECKOUT,
      status: ASSIGNMENT_STATUS.PENDING_PAYMENT,
      planPriceSnapshot: quote.planPrice,
      setupFeeSnapshot: quote.setupFee,
      discountSnapshot: quote.discount,
      discountCode: validatedDiscountCode,
      currency: quote.currency,
      totalSnapshot: quote.total,
      lineItems: quote.lineItems,
      quoteExpiresAt: quote.quoteExpiresAt,
      tokenHash: hash,
      expiresAt: new Date(now + LINK_TTL_MS),
      createdBy: createdBy || null,
    });

    const link = `${config.frontend.canonicalUrl}/business/checkout/${raw}`;

    if (deliver) {
      await this._deliverLink(assignment, user, link);
    }

    await logAudit({
      action: 'business.plan.checkout_link_created',
      actor: { _id: createdBy, role: 'admin' },
      targetType: 'user',
      targetId: businessUserId,
      metadata: { planCode: plan.code, assignmentId: assignment._id, mode: 'checkout' },
    });

    return { assignment, rawToken: raw, link };
  }

  /**
   * Deliver the checkout link over WhatsApp with SMS fallback. Records each
   * attempt on the assignment. Best-effort — never throws (admin can copy link).
   */
  async _deliverLink(assignment, user, link) {
    const attempts = [];
    try {
      const messagingProvider = this._getMessagingProvider();
      if (messagingProvider?.sendCheckoutLink) {
        const res = await messagingProvider.sendCheckoutLink({
          to: user.mobile || user.phoneNumber,
          link,
          businessName: user.name,
        });
        attempts.push({
          channel: 'whatsapp',
          status: res?.success ? 'sent' : 'failed',
          providerMessageId: res?.messageId || null,
          error: res?.success ? null : res?.error || 'unknown',
        });
        if (!res?.success && messagingProvider.sendSmsFallback) {
          const sms = await messagingProvider.sendSmsFallback({
            to: user.mobile || user.phoneNumber,
            link,
          });
          attempts.push({
            channel: 'sms',
            status: sms?.success ? 'sent' : 'failed',
            providerMessageId: sms?.messageId || null,
            error: sms?.success ? null : sms?.error || 'unknown',
          });
        }
      }
    } catch (err) {
      attempts.push({ channel: 'whatsapp', status: 'failed', error: err?.message });
      logger.warn('[business.assignment] link delivery failed', { error: err?.message });
    }
    if (attempts.length) {
      assignment.deliveryAttempts.push(...attempts);
      await assignment.save().catch(() => {});
    }
    return attempts;
  }

  // Lazily resolve a messaging provider that knows how to send the
  // `business_checkout` template. Returns null if not wired yet (link still
  // returned to the admin to copy).
  _getMessagingProvider() {
    try {
      return require('../messaging/messaging.businessLink.service');
    } catch {
      return null;
    }
  }

  // ─── public hosted-summary ───────────────────────────────────────────

  /**
   * Public summary for the hosted checkout page. NO sensitive business data —
   * only what's needed to render the plan + setup-fee summary. Token is NOT
   * consumed here (consumed on submit). [#security]
   */
  async getPublicSummary(rawToken) {
    const hash = hashCheckoutToken(rawToken);
    const assignment = await BusinessPlanAssignment.findOne({ tokenHash: hash });
    if (!assignment) throw new NotFoundError('Checkout link');

    if (assignment.status !== ASSIGNMENT_STATUS.PENDING_PAYMENT) {
      throw new ValidationError(`This checkout link is ${assignment.status}`);
    }
    if (assignment.expiresAt && assignment.expiresAt.getTime() < Date.now()) {
      throw new ValidationError('This checkout link has expired');
    }

    const plan = await Plan.findById(assignment.planId).select(
      'nameAr nameEn planType billingType limits features'
    );

    return {
      status: assignment.status,
      plan: plan
        ? {
            nameAr: plan.nameAr,
            nameEn: plan.nameEn,
            planType: plan.planType,
            billingType: plan.billingType,
          }
        : null,
      lineItems: assignment.lineItems.map((li) => ({
        type: li.type,
        label: li.label,
        quantity: li.quantity,
        unitAmount: li.unitAmount,
        discountAllocation: li.discountAllocation,
        total: li.total,
      })),
      setupFee: assignment.setupFeeSnapshot,
      total: assignment.totalSnapshot,
      currency: assignment.currency,
      expiresAt: assignment.expiresAt,
    };
  }

  // ─── submit / pay ────────────────────────────────────────────────────

  /**
   * The business submits the hosted checkout. Consumes the token (on submit,
   * not view), claims the assignment via compare-and-set, creates a Payment
   * with the durable line-item ledger, and charges. On immediate success it
   * activates; on 3DS it returns a redirect and finalizes later.
   */
  async submitCheckout(rawToken, { source, callbackUrl } = {}) {
    const hash = hashCheckoutToken(rawToken);
    const assignment = await BusinessPlanAssignment.findOne({ tokenHash: hash });
    if (!assignment) throw new NotFoundError('Checkout link');

    if (assignment.status !== ASSIGNMENT_STATUS.PENDING_PAYMENT) {
      throw new ValidationError(`This checkout link is ${assignment.status}`);
    }
    if (assignment.expiresAt && assignment.expiresAt.getTime() < Date.now()) {
      await BusinessPlanAssignment.transition(
        assignment._id,
        ASSIGNMENT_STATUS.PENDING_PAYMENT,
        assignment.version,
        ASSIGNMENT_STATUS.EXPIRED,
        { completedAt: new Date() }
      );
      throw new ValidationError('This checkout link has expired');
    }

    // Claim it: pending_payment → payment_processing (consume token on submit).
    const claimed = await BusinessPlanAssignment.transition(
      assignment._id,
      ASSIGNMENT_STATUS.PENDING_PAYMENT,
      assignment.version,
      ASSIGNMENT_STATUS.PAYMENT_PROCESSING,
      { usedAt: new Date() }
    );
    if (!claimed) {
      throw new ConflictError('This checkout is already being processed');
    }

    const plan = await Plan.findById(claimed.planId);
    const total = claimed.totalSnapshot;

    // Zero-total (fully-discounted, no setup) → activate directly.
    if (total <= 0) {
      const paid = await BusinessPlanAssignment.transition(
        claimed._id,
        ASSIGNMENT_STATUS.PAYMENT_PROCESSING,
        claimed.version,
        ASSIGNMENT_STATUS.PAID
      );
      return this.finalizeActivation(claimed._id, { plan });
    }

    const finalCallbackUrl =
      callbackUrl ||
      `${config.frontend.canonicalUrl}/business/checkout/${rawToken}/return`;

    const paymentRecord = await Payment.create({
      userId: claimed.businessUserId,
      amount: total,
      currency: claimed.currency,
      provider: 'moyasar',
      status: Payment.PAYMENT_STATUS.PENDING,
      callbackUrl: finalCallbackUrl,
      description: `Business plan ${claimed.planCode}`,
      lineItems: claimed.lineItems.map((li) => ({
        type: li.type,
        referenceId: li.referenceId,
        label: li.label,
        quantity: li.quantity,
        unitAmount: li.unitAmount,
        subtotal: li.subtotal,
        discountAllocation: li.discountAllocation,
        taxAmount: li.taxAmount,
        total: li.total,
        refundableAmount: li.total,
        refundedAmount: 0,
      })),
      metadata: {
        purpose: 'business_checkout',
        planCode: claimed.planCode,
        assignmentId: String(claimed._id),
        businessUserId: String(claimed.businessUserId),
      },
    });

    await BusinessPlanAssignment.updateOne(
      { _id: claimed._id },
      { $set: { paymentId: paymentRecord._id } }
    );

    const charge = await paymentProvider.charge({
      amount: total,
      currency: claimed.currency,
      source: source || { type: 'creditcard' },
      customer: { id: claimed.businessUserId },
      callbackUrl: finalCallbackUrl,
      userId: claimed.businessUserId,
      idempotencyKey: `business_checkout:${claimed._id}`,
      description: `Business plan ${claimed.planCode}`,
      metadata: { purpose: 'business_checkout', assignmentId: String(claimed._id) },
    });

    if (!charge.success) {
      paymentRecord.status = Payment.PAYMENT_STATUS.FAILED;
      paymentRecord.failedAt = new Date();
      paymentRecord.providerStatus = charge.providerStatus || charge.error || 'unknown';
      await paymentRecord.save().catch(() => {});
      await BusinessPlanAssignment.transition(
        claimed._id,
        ASSIGNMENT_STATUS.PAYMENT_PROCESSING,
        claimed.version,
        ASSIGNMENT_STATUS.FAILED,
        { failureCode: 'charge_failed', completedAt: new Date() }
      );
      throw new ValidationError('Payment failed; nothing was activated');
    }

    paymentRecord.moyasarPaymentId = charge.transactionId;
    paymentRecord.givenId = charge.givenId || null;
    paymentRecord.providerStatus = charge.providerStatus;

    if (charge.requiresAction) {
      paymentRecord.status = Payment.PAYMENT_STATUS.PENDING_3DS;
      paymentRecord.redirectUrl = charge.redirectUrl;
      await paymentRecord.save();
      // Stays payment_processing; finalized by callback/webhook after 3DS.
      return { requiresAction: true, redirectUrl: charge.redirectUrl, assignmentId: claimed._id };
    }

    paymentRecord.status = Payment.PAYMENT_STATUS.PAID;
    paymentRecord.paidAt = new Date();
    await paymentRecord.save();

    // payment_processing → paid (compare-and-set), then activate.
    await BusinessPlanAssignment.transition(
      claimed._id,
      ASSIGNMENT_STATUS.PAYMENT_PROCESSING,
      claimed.version,
      ASSIGNMENT_STATUS.PAID
    );
    return this.finalizeActivation(claimed._id, { plan, paymentRecord });
  }

  /**
   * Idempotent activation. Compare-and-set PAID → ACTIVE so webhook + browser
   * callback + reconciliation can all call this safely. On activation failure
   * after a paid charge → ACTIVATION_FAILED → REFUND_PENDING (refund incl. the
   * setup line) and re-open setup eligibility.
   *
   * @param {string} assignmentId
   */
  async finalizeActivation(assignmentId, { plan, paymentRecord } = {}) {
    const assignment = await BusinessPlanAssignment.findById(assignmentId);
    if (!assignment) throw new NotFoundError('Assignment');

    if (assignment.status === ASSIGNMENT_STATUS.ACTIVE) {
      // Already activated — idempotent.
      const subscription = assignment.subscriptionId
        ? await Subscription.findById(assignment.subscriptionId)
        : null;
      return { assignment, subscription, alreadyActive: true };
    }
    if (assignment.status !== ASSIGNMENT_STATUS.PAID) {
      throw new ValidationError(
        `Assignment ${assignmentId} is ${assignment.status}, cannot activate`
      );
    }

    const planDoc = plan || (await Plan.findById(assignment.planId));
    const payment =
      paymentRecord ||
      (assignment.paymentId ? await Payment.findById(assignment.paymentId) : null);

    try {
      const subscription = await this._activateSubscription({
        businessUserId: assignment.businessUserId,
        plan: planDoc,
        assignment,
        paymentRecord: payment,
      });

      // Settle setup fee PAID permanently (amount = setup line on the quote).
      const setupLine = (assignment.lineItems || []).find((li) => li.type === 'setup_fee');
      await setupFeeService.settlePaid(assignment.businessUserId, {
        plan: planDoc,
        amount: assignment.setupFeeSnapshot,
        paymentId: payment?._id || null,
        assignmentId: assignment._id,
      });

      const activated = await BusinessPlanAssignment.transition(
        assignment._id,
        ASSIGNMENT_STATUS.PAID,
        assignment.version,
        ASSIGNMENT_STATUS.ACTIVE,
        { subscriptionId: subscription._id, completedAt: new Date() }
      );
      if (!activated) {
        // Lost the race — another actor already activated. Idempotent success.
        return { assignment, subscription, alreadyActive: true };
      }

      if (payment) {
        payment.subscriptionId = subscription._id;
        await payment.save().catch(() => {});
      }

      await logAudit({
        action: 'business.plan.activated',
        actor: { _id: assignment.businessUserId, role: 'host' },
        targetType: 'subscription',
        targetId: subscription._id,
        metadata: { planCode: assignment.planCode, assignmentId: assignment._id, paid: !!payment },
      });

      return { assignment: activated, subscription };
    } catch (err) {
      // Paid-but-activation-failed: full refund incl. setup, re-open eligibility.
      await BusinessPlanAssignment.transition(
        assignment._id,
        ASSIGNMENT_STATUS.PAID,
        assignment.version,
        ASSIGNMENT_STATUS.ACTIVATION_FAILED,
        { failureCode: err?.message || 'activation_failed' }
      );
      if (payment) {
        await recordPendingRefund({
          userId: assignment.businessUserId,
          amount: payment.amount,
          currency: payment.currency || 'SAR',
          paymentId: payment._id,
          reason: 'business_activation_failed',
          detail: err?.message,
        }).catch(() => {});
        const fresh = await BusinessPlanAssignment.findById(assignment._id);
        await BusinessPlanAssignment.transition(
          assignment._id,
          ASSIGNMENT_STATUS.ACTIVATION_FAILED,
          fresh.version,
          ASSIGNMENT_STATUS.REFUND_PENDING
        );
        await setupFeeService.reopenAfterFailedActivation(assignment.businessUserId).catch(() => {});
      }
      logger.error('[business.assignment] activation failed', {
        assignmentId: String(assignment._id),
        error: err?.message,
      });
      throw new ValidationError(
        'Payment was processed but the plan could not be activated. Our team has been notified.'
      );
    }
  }

  /**
   * Create the business subscription + carry over invites from a replaced
   * business subscription (merged-pool carryover), then cancel the old one.
   * [#7 invite-pool carryover]
   */
  async _activateSubscription({ businessUserId, plan, assignment, paymentRecord }) {
    const existingActive = await Subscription.find({
      userId: businessUserId,
      status: { $in: [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.TRIAL] },
    });

    const subscription = await Subscription.createForUser(businessUserId, plan, {
      pricePaid: assignment?.planPriceSnapshot ?? plan?.pricing?.oneTime ?? 0,
      currency: plan?.currency || 'SAR',
      status: SUBSCRIPTION_STATUS.ACTIVE,
      createdBy: { user: assignment?.createdBy || businessUserId, onBehalfOf: true },
    });

    // Invite-pool carryover: carry remaining (base+compensation−consumed) from
    // the replaced business subscription onto the new one's compensation pool.
    let carried = 0;
    for (const old of existingActive) {
      const remaining =
        old.invitePool === null || old.invitePool === undefined
          ? 0
          : Math.max(
              0,
              (old.invitePool || 0) + (old.compensationPool || 0) - (old.invitesConsumed || 0)
            );
      carried += remaining;
    }
    if (carried > 0 && subscription.invitePool !== null && subscription.invitePool !== undefined) {
      subscription.compensationPool = (subscription.compensationPool || 0) + carried;
      await subscription.save();
    }

    if (paymentRecord) {
      subscription.metadata = { ...(subscription.metadata || {}), paymentId: paymentRecord._id };
      await subscription.save();
    }

    // Link user → subscription; cancel old actives.
    await User.findByIdAndUpdate(businessUserId, { subscription: subscription._id });
    for (const old of existingActive) {
      try {
        old.status = SUBSCRIPTION_STATUS.CANCELLED;
        old.cancelledAt = new Date();
        old.cancelReason = `Replaced by business plan ${plan?.code}`;
        await old.save();
      } catch (e) {
        logger.error('[business.assignment] failed to cancel old subscription', {
          oldSubscriptionId: old._id,
          error: e?.message,
        });
      }
    }

    return subscription;
  }

  // ─── lifecycle ops ───────────────────────────────────────────────────

  /** Revoke an open checkout link (admin). pending_payment → cancelled. */
  async revoke(assignmentId, actorId) {
    const a = await BusinessPlanAssignment.findById(assignmentId);
    if (!a) throw new NotFoundError('Assignment');
    const updated = await BusinessPlanAssignment.transition(
      a._id,
      ASSIGNMENT_STATUS.PENDING_PAYMENT,
      a.version,
      ASSIGNMENT_STATUS.CANCELLED,
      { failureCode: 'revoked_by_admin', completedAt: new Date() }
    );
    if (!updated) {
      throw new ConflictError('Only a pending checkout link can be revoked');
    }
    return updated;
  }

  /** Regenerate a link: supersede current pending, issue a fresh one. */
  async regenerate(assignmentId, actorId) {
    const a = await BusinessPlanAssignment.findById(assignmentId);
    if (!a) throw new NotFoundError('Assignment');
    if (a.mode !== ASSIGNMENT_MODE.CHECKOUT) {
      throw new ValidationError('Only checkout assignments can be regenerated');
    }
    return this.assignCheckout({
      businessUserId: a.businessUserId,
      planCode: a.planCode,
      discountCode: a.discountCode,
      createdBy: actorId,
    });
  }

  /** Cron: expire stale pending links. Retained (never deleted). */
  async expireStale(now = new Date()) {
    const stale = await BusinessPlanAssignment.find({
      status: ASSIGNMENT_STATUS.PENDING_PAYMENT,
      expiresAt: { $lt: now },
    }).select('_id version');
    let expired = 0;
    for (const a of stale) {
      const r = await BusinessPlanAssignment.transition(
        a._id,
        ASSIGNMENT_STATUS.PENDING_PAYMENT,
        a.version,
        ASSIGNMENT_STATUS.EXPIRED,
        { completedAt: new Date() }
      );
      if (r) expired += 1;
    }
    if (expired) logger.info(`[business.assignment] expired ${expired} stale checkout link(s)`);
    return expired;
  }

  /** List assignments for a business (admin view). */
  async listForBusiness(businessUserId) {
    return BusinessPlanAssignment.find({ businessUserId })
      .sort({ createdAt: -1 })
      .lean();
  }
}

module.exports = new BusinessAssignmentService();
