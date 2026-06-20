const Subscription = require('../../../models/SubscriptionModel');
const Event = require('../../../models/EventModel');
const { ADDON_TYPES } = require('../../shared/constants/addons');

/**
 * Apply an addon's quantity to the right counter for its scope.
 * EXTRA_INVITES bumps invitePool (scope-dependent). Templates and business
 * customization track usage elsewhere.
 *
 * For event scope, an unlimited event (guestLimit null/-1) is a no-op — the
 * purchase guard upstream rejects this case before charging, so reaching it
 * here means a legacy/pre-guard row is being applied; we leave the counter
 * untouched rather than corrupting the unlimited semantics.
 */
async function applyQuota(addon, { targetEvent } = {}) {
  const { scope, addonType, quantity = 1 } = addon;

  if (addonType !== ADDON_TYPES.EXTRA_INVITES) return;

  if (scope === 'pool') {
    if (!addon.subscriptionId) return;
    await Subscription.findByIdAndUpdate(addon.subscriptionId, {
      $inc: { invitePool: quantity },
    });
    return;
  }

  if (scope === 'event') {
    const event =
      targetEvent
      || (addon.eventId ? await Event.findById(addon.eventId) : null);
    if (!event) return;
    const current = event.guestLimit;
    // Snapshot field is `guestLimit`, frozen from subscription at event
    // creation. null/-1 == unlimited; bumping it would be meaningless.
    if (current === null || current === -1) return;
    await Event.findByIdAndUpdate(event._id, {
      $set: { guestLimit: current + quantity },
    });
    return;
  }

  if (scope === 'org') {
    // Today the same Subscription is the org-level container, so behave like
    // pool. When a real org-level counter ships this branch can target it
    // without affecting pool-scoped addons.
    if (!addon.subscriptionId) return;
    await Subscription.findByIdAndUpdate(addon.subscriptionId, {
      $inc: { invitePool: quantity },
    });
  }
}

module.exports = { applyQuota };
