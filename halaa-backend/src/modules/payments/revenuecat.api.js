/**
 * RevenueCat REST client (SHIP §9.2 · BILL-07 · §5).
 *
 * CANONICAL reconciliation source for destructive lifecycle changes. Two fixes
 * over the previous version:
 *   - P0-08: it DISTINGUISHES an unavailable snapshot (network / timeout / 5xx /
 *     auth) from a definitive "no such subscriber" (404). Unavailable →
 *     `{ available:false }` so the reducer returns a RETRYable failure and the
 *     webhook 500s for RevenueCat to retry — it NEVER silently revokes on a
 *     transient lookup failure.
 *   - P0-09: recurring state is derived from ONE configured entitlement id, not
 *     "whichever active entitlement was seen last" (a consumable attached to an
 *     entitlement must never masquerade as the subscription).
 *
 * The server key (`REVENUECAT_API_KEY`) is backend-only and never exposed to
 * mobile.
 */

const axios = require("axios");
const logger = require("../../shared/utils/logger");
const commerce = require("../../shared/commerce");

const BASE = process.env.REVENUECAT_API_BASE || "https://api.revenuecat.com/v1";

const isConfigured = () => Boolean(process.env.REVENUECAT_API_KEY);

const recurringEntitlementId = () =>
  process.env.REVENUECAT_RECURRING_ENTITLEMENT_ID || commerce.RECURRING_ENTITLEMENT_ID;

/**
 * Fetch the subscriber snapshot.
 * @returns {Promise<{available:boolean, notFound:boolean, subscriber:object|null, reason:string|null}>}
 *   available:false  → transient/unavailable (retry; NEVER revoke).
 *   available:true, notFound:true → definitively no subscriber (safe to revoke).
 */
const getSubscriberResult = async (appUserId) => {
  if (!isConfigured()) return { available: false, notFound: false, subscriber: null, reason: "api_key_not_configured" };
  if (!appUserId) return { available: false, notFound: false, subscriber: null, reason: "no_app_user_id" };
  try {
    const res = await axios.get(`${BASE}/subscribers/${encodeURIComponent(appUserId)}`, {
      headers: { Authorization: `Bearer ${process.env.REVENUECAT_API_KEY}` },
      timeout: 10000,
    });
    return { available: true, notFound: false, subscriber: res.data?.subscriber || null, reason: null };
  } catch (err) {
    const status = err.response?.status;
    if (status === 404) {
      // Definitive: RevenueCat has no such subscriber → no active entitlement.
      return { available: true, notFound: true, subscriber: null, reason: "not_found" };
    }
    // Everything else (network, timeout, 401/403, 429, 5xx) is UNAVAILABLE.
    logger.warn("[revenuecat.api] getSubscriber unavailable", { appUserId, status, error: err.message });
    return { available: false, notFound: false, subscriber: null, reason: status ? `http_${status}` : "network_error" };
  }
};

/** Back-compat: the raw subscriber object or null (non-destructive reads). */
const getSubscriber = async (appUserId) => {
  const r = await getSubscriberResult(appUserId);
  return r.subscriber;
};

/**
 * Derive the canonical recurring entitlement, scoped to ONE entitlement id.
 * @param {object|null} subscriber
 * @param {string} [entitlementId]
 * @returns {{ active:boolean, productId:string|null, expiresAtMs:number|null }}
 */
const deriveRecurringEntitlement = (subscriber, entitlementId = recurringEntitlementId()) => {
  const ent = subscriber?.entitlements?.[entitlementId];
  if (!ent) return { active: false, productId: null, expiresAtMs: null };
  const expMs = ent.expires_date ? Date.parse(ent.expires_date) : null;
  // A recurring entitlement with no expiry is treated as active; otherwise it is
  // active only while unexpired.
  const active = expMs === null || expMs > Date.now();
  return { active, productId: ent.product_identifier || null, expiresAtMs: expMs };
};

/**
 * Normalized recurring snapshot for the reducer.
 * @returns {Promise<{available:boolean, entitlementActive:boolean, effectiveProductId:string|null, expiresAtMs:number|null, reason:string|null}>}
 */
const getRecurringSnapshot = async (appUserId, entitlementId = recurringEntitlementId()) => {
  const r = await getSubscriberResult(appUserId);
  if (!r.available) {
    return { available: false, entitlementActive: false, effectiveProductId: null, expiresAtMs: null, reason: r.reason };
  }
  const ent = deriveRecurringEntitlement(r.subscriber, entitlementId);
  return {
    available: true,
    entitlementActive: ent.active,
    effectiveProductId: ent.productId,
    expiresAtMs: ent.expiresAtMs,
    reason: r.notFound ? "not_found" : null,
  };
};

/**
 * Legacy shim used by the read-only reconcile endpoint. Now scoped to the
 * configured entitlement (P0-09) instead of "last active entitlement".
 */
const deriveActiveEntitlement = (subscriber) => deriveRecurringEntitlement(subscriber);

module.exports = {
  isConfigured,
  recurringEntitlementId,
  getSubscriber,
  getSubscriberResult,
  getRecurringSnapshot,
  deriveRecurringEntitlement,
  deriveActiveEntitlement,
};
