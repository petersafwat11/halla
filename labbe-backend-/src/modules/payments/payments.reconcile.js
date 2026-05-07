/**
 * Payment reconciliation cron entry.
 *
 * Runs every 5 minutes (registered in scheduledTasks.js). For every
 * Payment row in `pending` or `pending_3ds` for more than 2 minutes,
 * call Moyasar to fetch the current state. If the state has flipped
 * to `paid`/`failed`/etc., update the row and (if relevant) finalize
 * any pending subscription/addon intent the way the webhook would.
 *
 * Multi-instance safe via cronLease.
 *
 * Bounded: at most BATCH_LIMIT rows per tick to keep Moyasar request
 * rates predictable. We sort by initiatedAt ASC so the oldest pending
 * row is reconciled first.
 */

const Payment = require('../../../models/PaymentModel');
const paymentsService = require('./payments.service');
const subscriptionsService = require('../subscriptions/subscriptions.service');

const BATCH_LIMIT = 50;
const STALE_AFTER_MS = 2 * 60 * 1000;

exports.runReconcileTick = async () => {
  const cutoff = new Date(Date.now() - STALE_AFTER_MS);
  const pendings = await Payment.find({
    status: { $in: [Payment.PAYMENT_STATUS.PENDING, Payment.PAYMENT_STATUS.PENDING_3DS] },
    initiatedAt: { $lte: cutoff },
    moyasarPaymentId: { $ne: null },
  })
    .sort({ initiatedAt: 1 })
    .limit(BATCH_LIMIT);

  let reconciled = 0;
  for (const p of pendings) {
    try {
      const before = p.status;
      const updated = await paymentsService.reconcileWithProvider(p._id);
      if (updated.status !== before) {
        reconciled += 1;
        if (updated.status === Payment.PAYMENT_STATUS.PAID) {
          const purpose = updated.metadata?.purpose;
          try {
            if (
              purpose === 'subscription' &&
              updated.metadata?.pendingSubscribeIntent &&
              !updated.subscriptionId
            ) {
              await subscriptionsService.finalizePending3ds(updated._id);
            } else if (
              purpose === 'addon' &&
              updated.metadata?.pendingAddonIntent &&
              !updated.addonId
            ) {
              const addonsService = require('../addons/addons.service');
              await addonsService.finalizePending3ds(updated._id);
            }
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error('[reconcile] finalize3ds failed:', err?.message);
          }
        }
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[reconcile] payment %s error: %s', p._id, err?.message);
    }
  }
  return { scanned: pendings.length, reconciled };
};
