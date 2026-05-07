const Payment = require('../../../models/PaymentModel');
const { ROLES } = require('../../shared/constants/roles');
const { logAudit } = require('../../shared/utils/auditLog');
const logger = require('../../shared/utils/logger');
const notificationService = require('../notifications/notifications.service');

/**
 * Record a "money taken, no benefit" event so on-call can reconcile.
 * Today this is an audit-log entry plus an admin notification. Once the
 * Moyasar refund flow is implemented this should attempt the refund inline
 * and only surface to ops if that also fails.
 *
 * Idempotent on (paymentId, reason) at the audit-log layer — replays of the
 * same failure case do not generate a second pending-refund row, so retries
 * by an automated reconciliation job are safe.
 */
async function recordPendingRefund({
  userId,
  amount,
  currency,
  paymentId,
  reason,
  detail,
  addonType,
  scope,
  eventId,
  addonId,
}) {
  try {
    const moyasarPaymentId = paymentId
      ? (await Payment.findById(paymentId).select('moyasarPaymentId'))?.moyasarPaymentId
      : null;
    logger.error('[addons.purchase] PENDING REFUND', {
      reason,
      userId,
      amount,
      paymentId: paymentId || null,
      moyasarPaymentId: moyasarPaymentId || null,
      detail: detail || null,
    });
    await logAudit({
      action: 'addon.pending_refund',
      actor: { _id: userId, role: ROLES.HOST },
      targetType: 'payment',
      targetId: paymentId || addonId || userId,
      metadata: {
        reason,
        amount,
        currency,
        paymentId,
        moyasarPaymentId,
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
        message: `Charge succeeded but addon could not be activated. paymentId ${paymentId || 'n/a'} moyasarId ${moyasarPaymentId || 'n/a'} userId ${userId}.`,
        data: {
          entityType: 'payment',
          entityId: paymentId || null,
          metadata: { reason, amount, currency, paymentId, moyasarPaymentId },
        },
        priority: 'high',
      });
    } catch (notifyErr) {
      logger.warn('[addons.purchase] admin notify failed', {
        error: notifyErr?.message,
      });
    }
  } catch (auditErr) {
    logger.error('[addons.purchase] recordPendingRefund logAudit failed', {
      error: auditErr?.message,
    });
  }
}

module.exports = { recordPendingRefund };
