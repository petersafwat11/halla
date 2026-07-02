/**
 * Transaction-lineage location (BILL-08 · §2.6 · §5 · closes P0-04/P0-08).
 *
 * Destructive operations must act on the EXACT subscription/entitlement/add-on
 * identified by the store transaction lineage — never "the first active store
 * subscription" (which could revoke a newer, unrelated plan on an out-of-order
 * event). `matchesLineage` is a pure predicate (unit-testable); the finders are
 * thin, index-backed queries scoped to the owning user.
 */

const Subscription = require("../../../models/SubscriptionModel");
const EventEntitlement = require("../../../models/EventEntitlementModel");
const Addon = require("../../../models/AddonModel");

const STORE_PROVIDERS = ["revenuecat", "appstore", "playstore"];

/**
 * Pure: does this subscription belong to the given store lineage? Match order:
 * original transaction id (stable across renewals) → transaction id → product id.
 * @param {object} sub subscription doc/plain object
 * @param {{originalTransactionId?:string, transactionId?:string, productId?:string}} lineage
 */
function matchesLineage(sub, lineage = {}) {
  if (!sub) return false;
  const { originalTransactionId, transactionId, productId } = lineage;
  if (originalTransactionId && sub.storeOriginalTransactionId === originalTransactionId) return true;
  if (transactionId && sub.storeOriginalTransactionId === transactionId) return true;
  if (
    productId &&
    sub.storeProductId === productId &&
    !sub.storeOriginalTransactionId &&
    STORE_PROVIDERS.includes(sub.provider)
  ) {
    // product-only fallback ONLY when there is no transaction id to match on.
    return true;
  }
  return false;
}

/** Locate the exact store subscription for a lineage (or null). */
async function findSubscriptionByLineage(userId, lineage, session = null) {
  const q = Subscription.findOne({
    userId,
    provider: { $in: STORE_PROVIDERS },
    $or: [
      lineage.originalTransactionId ? { storeOriginalTransactionId: lineage.originalTransactionId } : null,
      lineage.transactionId ? { storeOriginalTransactionId: lineage.transactionId } : null,
    ].filter(Boolean),
  }).sort({ createdAt: -1 });
  if (session) q.session(session);
  const sub = await q;
  if (sub) return sub;
  // product-only fallback (no lineage sub found and a productId is known).
  if (lineage.productId) {
    const q2 = Subscription.findOne({
      userId,
      provider: { $in: STORE_PROVIDERS },
      storeProductId: lineage.productId,
    }).sort({ createdAt: -1 });
    if (session) q2.session(session);
    return q2;
  }
  return null;
}

async function findEventEntitlementByTxn(txnId, session = null) {
  if (!txnId) return null;
  const q = EventEntitlement.findOne({ providerTransactionId: txnId });
  if (session) q.session(session);
  return q;
}

async function findAddonByTxn(txnId, session = null) {
  if (!txnId) return null;
  const q = Addon.findOne({ providerTransactionId: txnId });
  if (session) q.session(session);
  return q;
}

/**
 * Event fallback for exact reconciliation when the store transaction id the SDK
 * returned does not equal the webhook's `transaction_id` (observed on Android,
 * where a null Play orderId yields a synthetic SDK id). Safe because
 * `event-preflight` blocks buying an event package while an UNUSED entitlement
 * already exists for that user — so at purchase time there is no pre-existing
 * unused entitlement for `planCode`, and a spent one is `consumed` (excluded
 * here), not `unused`. Never widens to a different product. User-scoped, so the
 * result is inherently owned by the caller.
 */
async function findNewestUnusedEventForCode(userId, planCode, session = null) {
  if (!userId || !planCode) return null;
  const q = EventEntitlement.findOne({
    userId,
    planCode,
    status: "unused",
    resolution: { $in: ["fulfilled", "none"] },
  }).sort({ createdAt: -1 });
  if (session) q.session(session);
  return q;
}

module.exports = {
  matchesLineage,
  findSubscriptionByLineage,
  findEventEntitlementByTxn,
  findNewestUnusedEventForCode,
  findAddonByTxn,
  STORE_PROVIDERS,
};
