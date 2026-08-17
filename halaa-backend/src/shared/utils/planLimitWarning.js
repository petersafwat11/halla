/**
 * Plan-usage warning helper.
 *
 * Emits a `plan_limit_warning` notification when a host crosses the 80% or 95%
 * threshold of their invite pool. Crossing detection is loose — we fire on any
 * snapshot that lands in either band; the notifications service dedupes by
 * (userId, type, entityId) within its idempotency window so duplicate ticks
 * within hours are absorbed.
 *
 * Consumption now happens at SEND time, so this is called from the send path
 * (not guest-add). Best-effort — callers should not await/await-and-fail on it.
 */
const logger = require('./logger');

async function maybeNotifyPlanLimit(userId, sub) {
  try {
    if (!userId || !sub) return;
    const pool = (sub.invitePool || 0) + (sub.compensationPool || 0);
    if (pool <= 0) return;
    const used = sub.invitesConsumed || 0;
    const ratio = used / pool;
    if (ratio < 0.8) return;
    const remaining = Math.max(0, pool - used);
    const band = ratio >= 0.95 ? '95' : '80';
    // Lazy require to avoid a boot-time cycle (notifications → ... → utils).
    const notificationService = require('../../modules/notifications/notifications.service');
    await notificationService.sendToUser(userId, {
      type: 'plan_limit_warning',
      title: 'Plan Usage Warning',
      titleAr: 'تنبيه استهلاك الباقة',
      message: `You've used ${Math.round(ratio * 100)}% of your invite quota (${remaining} remaining).`,
      messageAr: `استهلكت ${Math.round(ratio * 100)}% من رصيد الدعوات (${remaining} متبقية).`,
      data: {
        entityType: 'subscription',
        entityId: sub._id,
        metadata: { used, pool, remaining, band },
      },
      priority: band === '95' ? 'high' : 'normal',
    });
  } catch (err) {
    logger.warn('plan_limit_warning notify failed', { err: err?.message });
  }
}

module.exports = { maybeNotifyPlanLimit };
