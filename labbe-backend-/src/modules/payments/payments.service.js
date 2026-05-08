/**
 * Payments service.
 *
 * Read paths against the Payment collection, plus admin actions
 * (refund, capture, void) that wrap the provider and reconcile the
 * Payment row.
 */

const mongoose = require('mongoose');
const Payment = require('../../../models/PaymentModel');
const Subscription = require('../../../models/SubscriptionModel');
const paymentProvider = require('../../infrastructure/paymentProvider');
const {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} = require('../../shared/errors');
const { logAudit } = require('../../shared/utils/auditLog');
const logger = require('../../shared/utils/logger');
const { ROLES, SUBSCRIPTION_STATUS } = require('../../shared/constants');

const ADMIN_LIKE_ROLES = new Set([
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.MODERATOR,
  ROLES.WHITELABEL_ADMIN,
  ROLES.WHITELABEL_MODERATOR,
]);

class PaymentsService {
  /**
   * Host-self read. Admin-class roles MUST go through `/admin/payments/:id`
   * (which enforces whitelabel scope); they get a typed 403 here.
   *
   * The id may be either a Mongo `_id` (24-char hex, used by admin tooling
   * and canonical fetches) OR a Moyasar payment id (UUID-like, sent by the
   * 3DS callback `?id=…`). We detect format and dispatch accordingly.
   */
  async getById(paymentId, requestingUser) {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(String(paymentId || ''));
    const query = isObjectId
      ? Payment.findById(paymentId)
      : Payment.findOne({ moyasarPaymentId: paymentId });
    const p = await query
      .populate('userId', 'name email phoneNumber')
      .populate('subscriptionId')
      .populate('addonId');
    if (!p) throw new NotFoundError('Payment');

    if (requestingUser) {
      if (ADMIN_LIKE_ROLES.has(requestingUser.role)) {
        throw new ForbiddenError(
          'Admin reads of /payments/:id are not permitted; use /admin/payments/:id'
        );
      }
      const ownerId = String(p.userId?._id || p.userId);
      if (ownerId !== String(requestingUser._id)) {
        throw new ForbiddenError('You do not have permission to view this payment');
      }
    }
    return p;
  }

  async getByMoyasarId(moyasarPaymentId) {
    return Payment.findOne({ moyasarPaymentId });
  }

  /**
   * Reconcile a Payment row with Moyasar's view of the payment.
   * Used by the webhook handler and the reconciliation cron. Idempotent
   * — repeated calls converge to the same state.
   */
  async reconcileWithProvider(paymentId) {
    const payment = await Payment.findById(paymentId);
    if (!payment) throw new NotFoundError('Payment');
    if (!payment.moyasarPaymentId) return payment;

    const result = await paymentProvider.fetchPayment(payment.moyasarPaymentId);
    if (!result.success) {
      logger.error('[payments.reconcile] fetch failed', { error: result.error });
      return payment;
    }
    payment.applyMoyasarSnapshot(result.data);
    await payment.save();
    return payment;
  }

  /**
   * Run the matching finalization for a paid Payment. Single source of
   * truth shared by webhook, /payments/:id/poll, and the reconcile cron.
   * Idempotent — guarded by the metadata flags + linked-id checks each
   * downstream service already enforces.
   */
  async runFinalization(payment) {
    if (!payment) return;
    const purpose = payment.metadata?.purpose;
    if (!purpose) return;
    try {
      if (
        purpose === 'addon' &&
        payment.metadata?.pendingAddonIntent &&
        !payment.addonId
      ) {
        const addonsService = require('../addons/addons.service');
        await addonsService.finalizePending3ds(payment._id);
      } else if (
        purpose === 'checkout' &&
        payment.metadata?.pendingCheckoutIntent &&
        !payment.metadata?.checkoutFinalizedAt
      ) {
        const checkoutService = require('./checkout.service');
        await checkoutService.finalizePending3ds(payment._id);
      }
    } catch (err) {
      logger.error('[payments.finalize] failed', {
        paymentId: String(payment._id),
        purpose,
        error: err?.message,
      });
    }
  }

  async issueRefund({ paymentId, amount, reason, actorUserId, actorRole }) {
    const payment = await Payment.findById(paymentId);
    if (!payment) throw new NotFoundError('Payment');
    if (
      ![
        Payment.PAYMENT_STATUS.PAID,
        Payment.PAYMENT_STATUS.CAPTURED,
        Payment.PAYMENT_STATUS.PARTIALLY_REFUNDED,
      ].includes(payment.status)
    ) {
      throw new ValidationError(`Cannot refund payment in status "${payment.status}"`);
    }
    if (typeof amount === 'number' && amount <= 0) {
      throw new ValidationError('Refund amount must be greater than 0');
    }
    const remaining = payment.amount - (payment.refundedAmount || 0);
    if (typeof amount === 'number' && amount > remaining) {
      throw new ValidationError(`Refund amount ${amount} exceeds remaining ${remaining}`);
    }

    const result = await paymentProvider.refund({
      moyasarPaymentId: payment.moyasarPaymentId,
      amount,
    });
    if (!result.success) {
      throw new ValidationError(result.error || 'Refund failed at provider');
    }

    const refundEntry = {
      amount: typeof amount === 'number' ? amount : remaining,
      reason: reason || null,
      createdAt: new Date(),
      createdBy: actorUserId || null,
      moyasarRefundResponseStatus: result.providerStatus,
    };

    // Provider has already moved the funds — wrap the local writes in a
    // transaction so we never end up with `payment.refunded` on disk while
    // the linked subscription stays `active`. Falls back to sequential
    // writes when the underlying Mongo deployment doesn't support
    // transactions (e.g. standalone dev nodes), with a logger warning so
    // ops sees the missed atomicity guarantee.
    const applyWrites = async (session) => {
      payment.refunds.push(refundEntry);
      payment.refundedAmount = (payment.refundedAmount || 0) + refundEntry.amount;
      payment.refundedAt = new Date();
      payment.providerStatus = result.providerStatus;
      payment.status =
        payment.refundedAmount >= payment.amount
          ? Payment.PAYMENT_STATUS.REFUNDED
          : Payment.PAYMENT_STATUS.PARTIALLY_REFUNDED;
      await payment.save(session ? { session } : undefined);

      if (
        payment.status === Payment.PAYMENT_STATUS.REFUNDED &&
        payment.subscriptionId
      ) {
        const sub = session
          ? await Subscription.findById(payment.subscriptionId).session(session)
          : await Subscription.findById(payment.subscriptionId);
        if (
          sub &&
          (sub.status === SUBSCRIPTION_STATUS.ACTIVE ||
            sub.status === SUBSCRIPTION_STATUS.TRIAL)
        ) {
          sub.status = SUBSCRIPTION_STATUS.CANCELLED;
          sub.cancelledAt = new Date();
          sub.cancelReason = 'refund_issued';
          await sub.save(session ? { session } : undefined);
        }
      }
    };

    let session;
    try {
      session = await mongoose.startSession();
      await session.withTransaction(() => applyWrites(session));
    } catch (err) {
      const standaloneNote =
        err?.message?.includes('Transaction numbers are only allowed') ||
        err?.code === 20 ||
        err?.codeName === 'IllegalOperation';
      if (standaloneNote) {
        logger.warn(
          '[payments.refund] Mongo deployment does not support transactions; falling back to sequential writes (refund will not be atomic)',
          { paymentId: String(payment._id) }
        );
        try {
          await applyWrites(null);
        } catch (innerErr) {
          await logAudit({
            action: 'payment.refund_partial_failure',
            actor: { _id: actorUserId, role: actorRole || ROLES.ADMIN },
            targetType: 'payment',
            targetId: payment._id,
            metadata: {
              amount: refundEntry.amount,
              reason,
              moyasarPaymentId: payment.moyasarPaymentId,
              providerStatus: result.providerStatus,
              error: innerErr?.message,
            },
          });
          throw innerErr;
        }
      } else {
        await logAudit({
          action: 'payment.refund_partial_failure',
          actor: { _id: actorUserId, role: actorRole || ROLES.ADMIN },
          targetType: 'payment',
          targetId: payment._id,
          metadata: {
            amount: refundEntry.amount,
            reason,
            moyasarPaymentId: payment.moyasarPaymentId,
            providerStatus: result.providerStatus,
            error: err?.message,
          },
        });
        throw err;
      }
    } finally {
      if (session) session.endSession();
    }

    await logAudit({
      action: 'payment.refunded',
      actor: { _id: actorUserId, role: actorRole || ROLES.ADMIN },
      targetType: 'payment',
      targetId: payment._id,
      metadata: {
        amount: refundEntry.amount,
        reason,
        moyasarPaymentId: payment.moyasarPaymentId,
      },
    });

    return payment;
  }

  async capturePayment({ paymentId, amount, actorUserId, actorRole }) {
    const payment = await Payment.findById(paymentId);
    if (!payment) throw new NotFoundError('Payment');
    if (payment.status !== Payment.PAYMENT_STATUS.AUTHORIZED) {
      throw new ValidationError(`Cannot capture payment in status "${payment.status}"`);
    }
    if (typeof amount === 'number' && amount <= 0) {
      throw new ValidationError('Capture amount must be greater than 0');
    }
    const result = await paymentProvider.capture({
      moyasarPaymentId: payment.moyasarPaymentId,
      amount,
    });
    if (!result.success) throw new ValidationError(result.error || 'Capture failed at provider');

    payment.capturedAmount = result.capturedAmount || payment.amount;
    payment.capturedAt = new Date();
    payment.providerStatus = result.providerStatus;
    payment.status = Payment.PAYMENT_STATUS.CAPTURED;
    await payment.save();

    await logAudit({
      action: 'payment.captured',
      actor: { _id: actorUserId, role: actorRole || ROLES.ADMIN },
      targetType: 'payment',
      targetId: payment._id,
      metadata: { amount: payment.capturedAmount, moyasarPaymentId: payment.moyasarPaymentId },
    });
    return payment;
  }

  async voidPayment({ paymentId, actorUserId, actorRole }) {
    const payment = await Payment.findById(paymentId);
    if (!payment) throw new NotFoundError('Payment');
    if (payment.status !== Payment.PAYMENT_STATUS.AUTHORIZED) {
      throw new ValidationError(`Cannot void payment in status "${payment.status}"`);
    }
    const result = await paymentProvider.voidPayment({
      moyasarPaymentId: payment.moyasarPaymentId,
    });
    if (!result.success) throw new ValidationError(result.error || 'Void failed at provider');

    payment.voidedAt = new Date();
    payment.providerStatus = result.providerStatus;
    payment.status = Payment.PAYMENT_STATUS.VOIDED;
    await payment.save();

    await logAudit({
      action: 'payment.voided',
      actor: { _id: actorUserId, role: actorRole || ROLES.ADMIN },
      targetType: 'payment',
      targetId: payment._id,
      metadata: { moyasarPaymentId: payment.moyasarPaymentId },
    });
    return payment;
  }
}

module.exports = new PaymentsService();
