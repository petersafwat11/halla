const { PackageLimitError } = require('../../shared/errors');
const subscriptionEventAccess = require('../subscriptions/subscriptionEventAccess.service');

// Listing is free. Sending consumes balance separately; the list is bounded
// by the stamped subscription's total pool, including compensation.
async function resolveEventGuestCapacity(event, actor, session) {
  let limit = Number.isFinite(event.guestLimit) && event.guestLimit >= 0
    ? event.guestLimit : Infinity;
  if (event.subscriptionId) {
    const ownerId = event.host?._id || event.host || actor?._id || actor;
    const subscription = await subscriptionEventAccess.findForEvent(event, ownerId, {
      allowFallback: false, session,
    });
    if (!subscription) {
      throw new PackageLimitError('subscription', 0, 'This event subscription is no longer available');
    }
    if (subscription.invitePool != null) {
      limit = Math.min(limit, subscription.invitePool + (subscription.compensationPool || 0));
    }
  }
  return limit;
}

async function assertEventGuestCapacity(event, actor, count, session) {
  const capacity = await resolveEventGuestCapacity(event, actor, session);
  if (count > capacity) {
    throw new PackageLimitError('guests', capacity, `Guest list exceeds your plan capacity of ${capacity} invites.`);
  }
  return capacity;
}

module.exports = { resolveEventGuestCapacity, assertEventGuestCapacity };
