/**
 * Store commerce catalog — public module API (CAT-01).
 *
 * Runtime consumers read the committed, pre-validated JSON manifest
 * (`storeCatalog.generated.json`) produced by `scripts/generateStoreCatalog.js`
 * from the single builder. Reads are fail-safe: a missing/corrupt manifest
 * degrades to an empty catalog (never throws at module load), preserving the
 * pre-existing "empty map" posture of the RevenueCat webhook rather than
 * crashing boot.
 *
 * The proposed product→code maps here REPLACE the hand-maintained
 * `REVENUECAT_PRODUCT_PLAN_MAP` / `REVENUECAT_ADDON_PRODUCT_MAP` env JSON as the
 * DEFAULT source (env still overrides — see revenuecat.service.js). All product
 * ids are PROPOSED (`com.halla.<code>`) and not yet created in any store.
 *
 * NOTE ON PLACEMENT: this module lives in the backend (CJS) rather than
 * billing-plan §0.2's suggested `shared/commerce/` because the backend is
 * CommonJS and does NOT import the ESM `@halla/shared` workspace (verified: 0
 * imports). Keeping it next to the price/name authority (`planDefaults.js` /
 * `addons.js`) avoids a fragile CJS→ESM runtime bridge. Web/mobile stay
 * API-driven and do not import this module.
 */

const { buildCatalog, catalogCounts } = require("./buildCatalog");
const { RECURRING_ENTITLEMENT_ID } = require("./catalog.schema");
const { verifyManifest } = require("./catalog.integrity");

let _manifest = null;
let _loadError = null;
try {
  // eslint-disable-next-line global-require
  _manifest = require("./storeCatalog.generated.json");
} catch (err) {
  _manifest = null; // not generated yet / unreadable — degrade gracefully
  _loadError = err.message;
}

/** Raw committed manifest (or null). */
function getManifest() {
  return _manifest;
}

/** Catalog entries from the committed manifest (fail-safe empty array). */
function getCatalog() {
  return _manifest?.entries || [];
}

/**
 * Runtime catalog integrity (§1). Fail-safe: never throws. Returns the verified
 * version/hash when the committed manifest is present and self-consistent, else
 * `{ ok:false, reason }` so billing readiness can fail OBSERVABLY (a corrupt /
 * hash-mismatched / missing production manifest is a hard billing-not-ready
 * condition — the runtime never silently accepts catalog drift).
 */
function getCatalogIntegrity() {
  if (!_manifest) {
    return { ok: false, reason: _loadError ? "manifest_unreadable" : "manifest_missing", catalogVersion: null, catalogHash: null, entryCount: 0 };
  }
  return verifyManifest(_manifest);
}

const memo = {};
const memoize = (key, fn) => {
  if (!(key in memo)) memo[key] = fn();
  return memo[key];
};

/**
 * Proposed { <store_product_id>: <plan_code> } for every store-eligible PLAN.
 * ios id === android id, so one key covers both stores.
 */
function getStorePlanProductMap() {
  return memoize("planMap", () => {
    const map = {};
    for (const e of getCatalog()) {
      if (e.catalogType === "plan" && e.storeEligible) {
        if (e.iosProductId) map[e.iosProductId] = e.internalCode;
        if (e.androidProductId) map[e.androidProductId] = e.internalCode;
      }
    }
    return map;
  });
}

/** Proposed { <store_product_id>: <addon_code> } for every store-eligible ADD-ON. */
function getStoreAddonProductMap() {
  return memoize("addonMap", () => {
    const map = {};
    for (const e of getCatalog()) {
      if (e.catalogType === "addon" && e.storeEligible) {
        if (e.iosProductId) map[e.iosProductId] = e.internalCode;
        if (e.androidProductId) map[e.androidProductId] = e.internalCode;
      }
    }
    return map;
  });
}

/** Fast lookup of a catalog entry by its internal code (fail-safe). */
function getEntryByCode(code) {
  if (!code) return null;
  return getCatalog().find((e) => e.internalCode === code) || null;
}

/** Set of store-eligible internal codes for a catalog type ('plan' | 'addon'). */
function storeEligibleCodes(catalogType) {
  return new Set(
    getCatalog()
      .filter((e) => e.catalogType === catalogType && e.storeEligible)
      .map((e) => e.internalCode)
  );
}

module.exports = {
  getManifest,
  getCatalog,
  getCatalogIntegrity,
  getEntryByCode,
  storeEligibleCodes,
  getStorePlanProductMap,
  getStoreAddonProductMap,
  // build-time / test helpers (validate on call)
  buildCatalog,
  catalogCounts,
  RECURRING_ENTITLEMENT_ID,
};
