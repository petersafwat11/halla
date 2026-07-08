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
async function applyQuota(addon, { targetEvent, session } = {}) {
  const { scope, addonType, quantity = 1 } = addon;
  const opts = session ? { session } : {};

  if (addonType !== ADDON_TYPES.EXTRA_INVITES) return;

  if (scope === 'pool') {
    if (!addon.subscriptionId) throw new Error('extra_invites pool grant has no target subscription');
    await Subscription.findByIdAndUpdate(addon.subscriptionId, { $inc: { invitePool: quantity } }, opts);
    return;
  }

  if (scope === 'event') {
    const eq = addon.eventId ? Event.findById(addon.eventId) : null;
    if (session && eq) eq.session(session);
    const event = targetEvent || (eq ? await eq : null);
    if (!event) throw new Error('extra_invites event grant has no target event');
    const current = event.guestLimit;
    // Snapshot field is `guestLimit`, frozen from subscription at event
    // creation. null/-1 == unlimited; bumping it would be meaningless.
    if (current === null || current === -1) return;
    await Event.findByIdAndUpdate(event._id, { $set: { guestLimit: current + quantity } }, opts);
    return;
  }

  if (scope === 'org') {
    // Today the same Subscription is the org-level container, so behave like
    // pool. When a real org-level counter ships this branch can target it
    // without affecting pool-scoped addons.
    if (!addon.subscriptionId) throw new Error('extra_invites org grant has no target subscription');
    await Subscription.findByIdAndUpdate(addon.subscriptionId, { $inc: { invitePool: quantity } }, opts);
  }
}

/**
 * Claw back UNUSED extra-invite credits on a refund (§8): remove only the
 * still-unused portion of the granted delta, never reducing the allowance below
 * what has already been consumed. Returns the amount actually reclaimed.
 */
async function clawbackExtraInvites(addon, { session } = {}) {
  const opts = session ? { session } : {};
  if (addon.addonType !== ADDON_TYPES.EXTRA_INVITES) return 0;
  if (!addon.subscriptionId) return 0;
  const granted = typeof addon.grantedDelta === 'number' ? addon.grantedDelta : addon.quantity || 0;
  const alreadyClawed = addon.clawedBackDelta || 0;
  const outstanding = granted - alreadyClawed;
  if (outstanding <= 0) return 0;

  const subQ = Subscription.findById(addon.subscriptionId);
  if (session) subQ.session(session);
  const sub = await subQ;
  if (!sub) return 0;
  const remaining = (sub.invitePool || 0) + (sub.compensationPool || 0) - (sub.invitesConsumed || 0);
  // Never claw back more than is still unused in the pool.
  const reclaim = Math.max(0, Math.min(outstanding, remaining));
  if (reclaim > 0) {
    await Subscription.findByIdAndUpdate(addon.subscriptionId, { $inc: { invitePool: -reclaim } }, opts);
  }
  return reclaim;
}

module.exports = { applyQuota, clawbackExtraInvites };
