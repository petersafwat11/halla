/**
 * Purchase readiness state model (PURE — node-testable, no react-native import).
 *
 * Implements the 10 discrete purchase readiness states defined in Phase 5A:
 *   - loading
 *   - sdk_unconfigured
 *   - user_unidentified
 *   - catalog_error
 *   - offerings_error
 *   - entry_missing
 *   - not_store_eligible
 *   - package_missing
 *   - price_missing
 *   - ready
 *
 * Guarantees that native purchase surfaces fail closed:
 * NEVER substitute a backend SAR amount for a missing store package price.
 */

"use strict";

const { getEntry, findPackage, packagePriceString } = require("./catalog");

const READINESS_STATES = {
  LOADING: "loading",
  SDK_UNCONFIGURED: "sdk_unconfigured",
  USER_UNIDENTIFIED: "user_unidentified",
  CATALOG_ERROR: "catalog_error",
  OFFERINGS_ERROR: "offerings_error",
  ENTRY_MISSING: "entry_missing",
  NOT_STORE_ELIGIBLE: "not_store_eligible",
  PACKAGE_MISSING: "package_missing",
  PRICE_MISSING: "price_missing",
  READY: "ready",
};

/**
 * Determine purchase readiness given the SDK, query, identity, catalog, and offerings state.
 *
 * @param {Object} params
 * @param {boolean} [params.isConfigured=true] - RevenueCat SDK configured with a valid platform key
 * @param {boolean} [params.isUserIdentified=true] - Authenticated user has billingUserId identified
 * @param {boolean} [params.isCatalogLoading=false] - /payments/revenuecat/catalog query in flight
 * @param {boolean} [params.isOfferingsLoading=false] - Purchases.getOfferings() in flight
 * @param {boolean|Error|Object} [params.catalogError=null] - Catalog network/server error
 * @param {boolean|Error|Object} [params.offeringsError=null] - RevenueCat offerings network/store error
 * @param {Array} [params.entries=[]] - Store catalog entries from GET /payments/revenuecat/catalog
 * @param {Object} [params.offerings=null] - RevenueCat offerings map or object
 * @param {string} params.targetCode - Internal target code (plan or add-on)
 * @returns {{ state: string, ready: boolean, entry: Object|null, pkg: Object|null, priceString: string|null, retryable: boolean }}
 */
function getPurchaseReadiness({
  isConfigured = true,
  isUserIdentified = true,
  isCatalogLoading = false,
  isOfferingsLoading = false,
  catalogError = null,
  offeringsError = null,
  entries = [],
  offerings = null,
  targetCode = null,
}) {
  if (isCatalogLoading || isOfferingsLoading) {
    return {
      state: READINESS_STATES.LOADING,
      ready: false,
      entry: null,
      pkg: null,
      priceString: null,
      retryable: false,
    };
  }

  if (!isConfigured) {
    return {
      state: READINESS_STATES.SDK_UNCONFIGURED,
      ready: false,
      entry: null,
      pkg: null,
      priceString: null,
      retryable: false,
    };
  }

  if (!isUserIdentified) {
    return {
      state: READINESS_STATES.USER_UNIDENTIFIED,
      ready: false,
      entry: null,
      pkg: null,
      priceString: null,
      retryable: false,
    };
  }

  if (catalogError) {
    return {
      state: READINESS_STATES.CATALOG_ERROR,
      ready: false,
      entry: null,
      pkg: null,
      priceString: null,
      retryable: true,
    };
  }

  if (offeringsError) {
    return {
      state: READINESS_STATES.OFFERINGS_ERROR,
      ready: false,
      entry: null,
      pkg: null,
      priceString: null,
      retryable: true,
    };
  }

  const entry = getEntry(entries, targetCode);
  if (!entry) {
    return {
      state: READINESS_STATES.ENTRY_MISSING,
      ready: false,
      entry: null,
      pkg: null,
      priceString: null,
      retryable: false,
    };
  }

  if (!entry.storeEligible || entry.isTrial || entry.isUnlimited) {
    return {
      state: READINESS_STATES.NOT_STORE_ELIGIBLE,
      ready: false,
      entry,
      pkg: null,
      priceString: null,
      retryable: false,
    };
  }

  const pkg = findPackage(offerings, entry);
  if (!pkg) {
    return {
      state: READINESS_STATES.PACKAGE_MISSING,
      ready: false,
      entry,
      pkg: null,
      priceString: null,
      retryable: false,
    };
  }

  const priceString = packagePriceString(pkg);
  if (!priceString) {
    return {
      state: READINESS_STATES.PRICE_MISSING,
      ready: false,
      entry,
      pkg,
      priceString: null,
      retryable: false,
    };
  }

  return {
    state: READINESS_STATES.READY,
    ready: true,
    entry,
    pkg,
    priceString,
    retryable: false,
  };
}

/**
 * Map a readiness state to its i18n reason key for user-facing surfaces.
 * Returns null for states that carry no user-facing reason (loading/ready).
 *
 * @param {string} state
 * @returns {string|null}
 */
function readinessReasonKey(state) {
  switch (state) {
    case READINESS_STATES.SDK_UNCONFIGURED:
    case READINESS_STATES.USER_UNIDENTIFIED:
    case READINESS_STATES.CATALOG_ERROR:
    case READINESS_STATES.OFFERINGS_ERROR:
    case READINESS_STATES.ENTRY_MISSING:
    case READINESS_STATES.NOT_STORE_ELIGIBLE:
    case READINESS_STATES.PACKAGE_MISSING:
    case READINESS_STATES.PRICE_MISSING:
      return `checkout.iap.reasons.${state}`;
    default:
      return null;
  }
}

module.exports = {
  READINESS_STATES,
  getPurchaseReadiness,
  readinessReasonKey,
};
