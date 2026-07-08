/**
 * Store catalog helpers (PURE — node-testable, no react-native import).
 *
 * Operates on the store-safe catalog from GET /payments/revenuecat/catalog and
 * on RevenueCat offering objects (plain data). Product display prices come ONLY
 * from the resolved store package — never a backend price (P0-13 / §2). A
 * missing package is a hard "unavailable" state, not a fallback price.
 */

"use strict";

/** Index store-safe catalog entries by internalCode. */
function indexByCode(entries) {
  const map = {};
  for (const e of entries || []) map[e.internalCode] = e;
  return map;
}

/** Look up a catalog entry by internal code (accepts either code or entry.code). */
function getEntry(entries, code) {
  if (!code) return null;
  return (entries || []).find((e) => e.internalCode === code || e.code === code) || null;
}

/** Entries the caller may buy (backend-computed eligibleForCaller) and can be sold. */
function eligibleEntries(entries) {
  return (entries || []).filter(
    (e) => e.storeEligible && !e.isTrial && !e.isUnlimited && e.eligibleForCaller !== false
  );
}

/**
 * True only if `code` maps to a store-eligible product. Trial/unlimited are
 * never store products, so they can never render as a purchasable card (§2).
 */
function isStoreEligibleCode(entries, code) {
  const e = getEntry(entries, code);
  return !!(e && e.storeEligible && !e.isTrial && !e.isUnlimited);
}

/**
 * Flatten candidate packages from `offerings`. Accepts either the SDK
 * `offerings.all` map OR a single offering object ({ availablePackages }).
 * When a map, the preferred offering's packages come first.
 */
function collectPackages(offerings, preferredOfferingId) {
  if (!offerings) return [];
  if (Array.isArray(offerings.availablePackages)) return [...offerings.availablePackages];
  const out = [];
  const push = (off) => {
    if (off && Array.isArray(off.availablePackages)) out.push(...off.availablePackages);
  };
  if (preferredOfferingId && offerings[preferredOfferingId]) push(offerings[preferredOfferingId]);
  for (const key of Object.keys(offerings)) {
    if (key === preferredOfferingId) continue;
    push(offerings[key]);
  }
  return out;
}

/**
 * Resolve the RevenueCat package for a catalog entry. Match order:
 *   package.identifier === lookupKey (canonical) →
 *   package.product.identifier === productId (com.halla.<code>) →
 *   package.product.identifier === lookupKey (legacy naming).
 */
function findPackage(offerings, entry) {
  if (!entry) return null;
  const lookupKey = entry.revenueCatPackageLookupKey || entry.internalCode || entry.code;
  const productId = entry.iosProductId || entry.androidProductId || null;
  const packages = collectPackages(offerings, entry.revenueCatOfferingId);
  return (
    packages.find((p) => p && p.identifier === lookupKey) ||
    (productId && packages.find((p) => p && p.product && p.product.identifier === productId)) ||
    packages.find((p) => p && p.product && p.product.identifier === lookupKey) ||
    null
  );
}

/** Store price string of a resolved package (never a backend price). Null if absent. */
function packagePriceString(pkg) {
  return (pkg && pkg.product && pkg.product.priceString) || null;
}

/**
 * Resolve a purchasable: entry + store package + store price. `available:false`
 * (with a reason) means the CTA must be disabled with a safe unavailable state
 * — the UI must NOT substitute a backend price.
 */
function resolvePurchasable(entries, offerings, code) {
  const entry = getEntry(entries, code);
  if (!entry) return { entry: null, pkg: null, priceString: null, available: false, reason: "unknown_code" };
  if (!entry.storeEligible || entry.isTrial || entry.isUnlimited) {
    return { entry, pkg: null, priceString: null, available: false, reason: "not_store_eligible" };
  }
  const pkg = findPackage(offerings, entry);
  if (!pkg) {
    return { entry, pkg: null, priceString: null, available: false, reason: "package_missing" };
  }
  return { entry, pkg, priceString: packagePriceString(pkg), available: true, reason: null };
}

/** The canonical add-on catalog code for an add-on shape (matches backend grammar). */
function addonCatalogCode(addon) {
  if (!addon) return null;
  const type = addon.addonType || addon.type;
  if (type === "extra_invites") {
    const qty = addon.quantity != null ? addon.quantity : addon.tier;
    return qty != null ? `extra_invites_${qty}` : null;
  }
  if (type === "design_template") {
    const tt = addon.templateType || addon.type;
    return tt ? `design_template_${tt}` : null;
  }
  if (type === "business_customization") return "business_customization";
  return null;
}

module.exports = {
  indexByCode,
  getEntry,
  eligibleEntries,
  isStoreEligibleCode,
  collectPackages,
  findPackage,
  packagePriceString,
  resolvePurchasable,
  addonCatalogCode,
};
