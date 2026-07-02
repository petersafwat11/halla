/**
 * Current-plan identity by EXACT code (DEC-02 / MOB-04). PURE — node-testable.
 *
 * Comparison is ALWAYS by the exact plan code, NEVER by planType — otherwise two
 * products that share a planType/family both read as "current" (the P0-12 bug).
 */

"use strict";

/** The exact plan code of a subscription (accepts several shapes; never planType). */
function subscriptionCode(subscription) {
  if (!subscription) return null;
  return (
    subscription.planCode ||
    (subscription.planId && subscription.planId.code) ||
    subscription.code ||
    null
  );
}

/**
 * Exact-code match between an active subscription and a catalog entry / plan.
 * Uses the entry's `currentPlanIdentityKey` (== internalCode) when present, else
 * its `internalCode` / `code`.
 */
function isCurrentPlan(subscription, entry) {
  if (!subscription || !entry) return false;
  const code = subscriptionCode(subscription);
  if (!code) return false;
  const key = entry.currentPlanIdentityKey || entry.internalCode || entry.code || null;
  return !!key && code === key;
}

module.exports = { subscriptionCode, isCurrentPlan };
