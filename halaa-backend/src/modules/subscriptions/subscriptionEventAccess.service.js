/**
 * Helpers for event-scoped subscription access.
 *
 * A plan change creates a new subscription for future events, while existing
 * events keep the subscription they were created with. If that old
 * subscription was cancelled because it was replaced, it remains usable only
 * by events already stamped with its id.
 */

const Subscription = require('../../../models/SubscriptionModel');
const { SUBSCRIPTION_STATUS } = require('../../shared/constants');

const ACTIVE_STATUSES = [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.TRIAL];

const isExpired = (sub) =>
  !!(sub?.expiresAt && new Date(sub.expiresAt).getTime() < Date.now());

const isReplacedSubscriptionForEvent = (sub, event) =>
  !!(
    sub &&
    event?.subscriptionId &&
    sub.status === SUBSCRIPTION_STATUS.CANCELLED &&
    sub.metadata?.replacedBySubscription &&
    String(sub._id) === String(event.subscriptionId)
  );

const isUsableForEvent = (sub, event) => {
  if (!sub || isExpired(sub)) return false;
  return ACTIVE_STATUSES.includes(sub.status) || isReplacedSubscriptionForEvent(sub, event);
};

async function findForEvent(event, ownerId, options = {}) {
  const allowFallback = options.allowFallback !== false;

  if (event?.subscriptionId) {
    const sub = await Subscription.findById(event.subscriptionId).populate('planId');
    if (!sub) return null;
    if (ownerId && String(sub.userId) !== String(ownerId)) return null;
    return isUsableForEvent(sub, event) ? sub : null;
  }

  if (!allowFallback || !ownerId) return null;
  const active = await Subscription.findActiveForUser(ownerId);
  return active[0] || null;
}

module.exports = {
  findForEvent,
  isReplacedSubscriptionForEvent,
  isUsableForEvent,
};
