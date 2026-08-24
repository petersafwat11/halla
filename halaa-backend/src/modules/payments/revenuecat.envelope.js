/**
 * Strict RevenueCat webhook envelope validation (BILL-01 · §2).
 *
 * PURE. Given the normalized event, the validated config, and the resolved
 * product maps + catalog accessor, it validates every required field and
 * classifies the event into one of three dispositions:
 *
 *   - "accept"      — structurally + semantically valid; proceed to reduce.
 *   - "ignore"      — authenticated but not for us / benign (wrong environment,
 *                     wrong app, unsupported store, unknown type, TEST) →
 *                     persist status "ignored", 200, no grant.
 *   - "dead_letter" — authenticated but INVALID/contradictory (missing user,
 *                     unmapped product, catalog unavailable, event/product
 *                     incompatible, wrong entitlement, missing txn) → persist
 *                     status "dead_letter", 200, alert, no grant.
 *
 * NEVER grants from an unknown or contradictory event. A catalog outage yields a
 * DISTINCT `catalog_unavailable` reason (advisor guidance) — not a pile of
 * `unmapped_product`s.
 */

const { KNOWN_TYPES } = require("./revenuecat.reducer");

// Product-less event types (no catalog mapping required).
const PRODUCTLESS = new Set(["TRANSFER", "TEMPORARY_ENTITLEMENT_GRANT", "TEST"]);
// Financial events that MUST carry a store transaction id.
const NEEDS_TXN = new Set(["INITIAL_PURCHASE", "RENEWAL", "NON_RENEWING_PURCHASE", "PRODUCT_CHANGE", "REFUND", "REFUND_REVERSED"]);
// Subscription-lifecycle events that must carry an original transaction id.
const NEEDS_ORIGINAL_TXN = new Set(["CANCELLATION", "UNCANCELLATION", "EXPIRATION", "SUBSCRIPTION_PAUSED", "SUBSCRIPTION_EXTENDED", "BILLING_ISSUE"]);

const accept = (catalogCode, catalogItem, code = "ok") => ({ ok: true, disposition: "accept", code, catalogCode, catalogItem });
const ignore = (code) => ({ ok: false, disposition: "ignore", code, catalogCode: null, catalogItem: null });
const dead = (code) => ({ ok: false, disposition: "dead_letter", code, catalogCode: null, catalogItem: null });

/**
 * @param {object} n normalized event (from normalizeEvent)
 * @param {object} ctx
 * @param {object} ctx.config validated billing config value
 * @param {Record<string,string>} ctx.planMap product→plan-code
 * @param {Record<string,string>} ctx.addonMap product→addon-code
 * @param {(code:string)=>object|null} ctx.getEntryByCode catalog accessor
 * @param {object} ctx.integrity catalog integrity result
 * @returns {{ok:boolean, disposition:string, code:string, catalogCode:string|null, catalogItem:object|null}}
 */
function validateEnvelope(n, ctx) {
  const { config, planMap, addonMap, getEntryByCode, integrity } = ctx;

  // ── envelope basics ────────────────────────────────────────────────────────
  if (!n.eventId) return dead("missing_event_id");
  if (!n.type) return dead("missing_type");
  if (!KNOWN_TYPES.includes(n.type)) return ignore("unknown_type");

  // api_version allowlist.
  if (config.apiVersions && config.apiVersions.length) {
    if (!n.apiVersion || !config.apiVersions.includes(n.apiVersion)) {
      return dead("api_version_not_allowed");
    }
  }
  // App id allowlist. RevenueCat represents the App Store and Play Store apps
  // with different ids even when both belong to this project.
  const appIds = Array.isArray(config.appIds) && config.appIds.length
    ? config.appIds
    : config.appId
      ? [config.appId]
      : [];
  if (appIds.length && n.appId && !appIds.includes(n.appId)) return ignore("app_id_mismatch");
  if (appIds.length && !n.appId) return dead("missing_app_id");
  // Environment allowlist. TestFlight purchases are SANDBOX even when the app
  // binary uses the production bundle id, so deployments may explicitly accept
  // both while still rejecting unknown/missing environments fail-closed.
  const environments = Array.isArray(config.environments) && config.environments.length
    ? config.environments
    : config.environment
      ? [config.environment]
      : [];
  if (environments.length && n.environment && !environments.includes(n.environment)) {
    return ignore("environment_mismatch");
  }
  if (environments.length && !n.environment) return dead("missing_environment");

  // App User ID (or original/alias) must be present to resolve the account.
  if (!n.appUserId && !n.originalAppUserId && (!n.aliases || !n.aliases.length)) {
    return dead("missing_app_user_id");
  }

  // ── product-less events short-circuit here ─────────────────────────────────
  if (PRODUCTLESS.has(n.type)) {
    if (n.type === "TEST") return ignore("test_event");
    return accept(null, null, "productless"); // TRANSFER / TEMPORARY → reducer → manual review
  }

  // store allowlist (product events only; product-less TEST already handled).
  if (config.allowedStores && config.allowedStores.length && n.store) {
    if (!config.allowedStores.includes(n.store)) return ignore("store_not_allowed");
  }

  // ── catalog availability is a HARD, DISTINCT fail-closed condition ─────────
  if (!integrity || !integrity.ok) return dead("catalog_unavailable");

  // required transaction identifiers.
  if (NEEDS_TXN.has(n.type) && !n.transactionId) return dead("missing_transaction_id");
  if (NEEDS_ORIGINAL_TXN.has(n.type) && !n.originalTransactionId && !n.transactionId) {
    return dead("missing_original_transaction_id");
  }

  // ── resolve product → code (canonical + validated overrides) ──────────────
  if (!n.productId) return dead("missing_product_id");
  const planCode = planMap[n.productId];
  const addonCode = addonMap[n.productId];
  if (!planCode && !addonCode) return dead("unmapped_product");
  if (planCode && addonCode) return dead("ambiguous_product_mapping");

  const code = planCode || addonCode;
  const item = getEntryByCode(code);
  if (!item) return dead("unmapped_product"); // mapped to a code with no catalog entry

  // ── event/product compatibility ───────────────────────────────────────────
  const isSub = item.kind === "subscription";
  const isEvent = item.kind === "event_consumable";
  const isAddon = item.catalogType === "addon";

  // Subscription-only event types must map to a subscription product.
  const SUBSCRIPTION_ONLY = new Set(["RENEWAL", "PRODUCT_CHANGE", "UNCANCELLATION", "EXPIRATION", "SUBSCRIPTION_PAUSED", "SUBSCRIPTION_EXTENDED", "BILLING_ISSUE"]);
  if (SUBSCRIPTION_ONLY.has(n.type) && !isSub) return dead("event_product_incompatible");
  // NON_RENEWING_PURCHASE must be a one-time product (event or add-on).
  if (n.type === "NON_RENEWING_PURCHASE" && isSub) return dead("event_product_incompatible");

  // ── exact recurring entitlement for subscriptions ─────────────────────────
  // If the event carries entitlement ids on a subscription product, they must
  // include EXACTLY the one configured recurring entitlement (P0-09). A
  // consumable/add-on must NEVER carry it.
  if (isSub && n.entitlementIds && n.entitlementIds.length) {
    if (!n.entitlementIds.includes(config.recurringEntitlementId)) {
      return dead("entitlement_mismatch");
    }
  }
  if ((isEvent || isAddon) && n.entitlementIds && n.entitlementIds.includes(config.recurringEntitlementId)) {
    return dead("consumable_carries_recurring_entitlement");
  }

  return accept(code, item, "ok");
}

module.exports = { validateEnvelope, PRODUCTLESS, NEEDS_TXN, NEEDS_ORIGINAL_TXN };
