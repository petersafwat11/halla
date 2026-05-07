/**
 * Payments service.
 *
 * Read paths against the Payment collection, plus admin actions
 * (refund, capture, void) that wrap the provider and reconcile the
 * Payment row.
 */

const Payment = require('../../../models/PaymentModel');
const Subscription = require('../../../models/SubscriptionModel');
const Addon = require('../../../models/AddonModel');
const paymentProvider = require('../../infrastructure/paymentProvider');
const { NotFoundError, ValidationError } = require('../../shared/errors');
const { logAudit } = require('../../shared/utils/auditLog');

class PaymentsService {
  async getById(paymentId) {
    const p = await Payment.findById(paymentId)
      .populate('userId', 'name email phoneNumber')
      .populate('subscriptionId')
      .populate('addonId');
    if (!p) throw new NotFoundError('Payment');
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
      // eslint-disable-next-line no-console
      console.error('[payments.reconcile] fetch failed:', result.error);
      return payment;
    }
    payment.applyMoyasarSnapshot(result.data);
    await payment.save();
    return payment;
  }

  async issueRefund({ paymentId, amount, reason, actorUserId }) {
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
    payment.refunds.push(refundEntry);
    payment.refundedAmount = (payment.refundedAmount || 0) + refundEntry.amount;
    payment.refundedAt = new Date();
    payment.providerStatus = result.providerStatus;
    payment.status =
      payment.refundedAmount >= payment.amount
        ? Payment.PAYMENT_STATUS.REFUNDED
        : Payment.PAYMENT_STATUS.PARTIALLY_REFUNDED;
    await payment.save();

    await logAudit({
      action: 'payment.refunded',
      actor: { _id: actorUserId, role: 'admin' },
      targetType: 'payment',
      targetId: payment._id,
      metadata: {
        amount: refundEntry.amount,
        reason,
        moyasarPaymentId: payment.moyasarPaymentId,
      },
    });

    // Cancel the linked subscription if the refund is full and the sub
    // is still active. Addon-side cleanup is intentionally manual:
    // refunding an addon with consumed quota is a real ops decision.
    if (payment.status === Payment.PAYMENT_STATUS.REFUNDED && payment.subscriptionId) {
      const sub = await Subscription.findById(payment.subscriptionId);
      if (sub && (sub.status === 'active' || sub.status === 'trial')) {
        sub.status = 'cancelled';
        sub.cancelledAt = new Date();
        sub.cancelReason = 'refund_issued';
        await sub.save();
      }
    }

    return payment;
  }

  async capturePayment({ paymentId, amount, actorUserId }) {
    const payment = await Payment.findById(paymentId);
    if (!payment) throw new NotFoundError('Payment');
    if (payment.status !== Payment.PAYMENT_STATUS.AUTHORIZED) {
      throw new ValidationError(`Cannot capture payment in status "${payment.status}"`);
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
      actor: { _id: actorUserId, role: 'admin' },
      targetType: 'payment',
      targetId: payment._id,
      metadata: { amount: payment.capturedAmount, moyasarPaymentId: payment.moyasarPaymentId },
    });
    return payment;
  }

  async voidPayment({ paymentId, actorUserId }) {
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
      actor: { _id: actorUserId, role: 'admin' },
      targetType: 'payment',
      targetId: payment._id,
      metadata: { moyasarPaymentId: payment.moyasarPaymentId },
    });
    return payment;
  }
}

module.exports = new PaymentsService();
