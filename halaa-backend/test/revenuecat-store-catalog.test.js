/**
 * Store-safe catalog projection contract (MOB-03 · Session 3).
 *
 * The mobile client consumes GET /payments/revenuecat/catalog to map its
 * internal plan/add-on codes to RevenueCat products/packages/offerings. These
 * tests lock the store-safe guarantees of the projection (pure, DB-free):
 *   - only store-eligible entries (trial/unlimited can never leak);
 *   - NO price/currency (native prices come from the store package — P0-13/§2);
 *   - exactly the allowlisted fields (no server config/secret);
 *   - the RevenueCat mapping fields the client needs are present + consistent;
 *   - subscriptions carry the recurring entitlement; consumables/add-ons never do.
 */

const { test } = require("node:test");
const assert = require("node:assert/strict");

const commerce = require("../src/shared/commerce");
const { STORE_SAFE_FIELDS } = require("../src/shared/commerce");

// Fields that must NEVER appear in the store-safe projection.
const FORBIDDEN = ["price", "currency", "apiKey", "webhookAuth", "secret", "REVENUECAT_API_KEY"];

test("returns only store-eligible entries — trial/unlimited/business_annual never leak", () => {
  const cat = commerce.getStoreSafeCatalog();
  assert.ok(cat.length > 0, "catalog must not be empty");
  // 31 store-eligible plans + 22 add-ons = 53 store products
  // (business_annual removed from stores by owner directive, 2026-08-16).
  assert.equal(cat.length, 53);
  for (const e of cat) {
    assert.equal(e.storeEligible, true);
    assert.equal(e.isTrial, false);
    assert.equal(e.isUnlimited, false);
    assert.notEqual(e.internalCode, "business_annual");
  }
});

test("projection omits price/currency and any secret; only the allowlist is present", () => {
  const cat = commerce.getStoreSafeCatalog();
  const allow = [...STORE_SAFE_FIELDS].sort();
  for (const e of cat) {
    for (const f of FORBIDDEN) {
      assert.ok(!(f in e), `store-safe entry must not expose "${f}"`);
    }
    assert.deepEqual(Object.keys(e).sort(), allow);
  }
});

test("entries carry the fields the mobile needs to resolve RevenueCat products", () => {
  const cat = commerce.getStoreSafeCatalog();
  const offerings = ["host_plans", "business_plans", "host_addons", "business_addons"];
  for (const e of cat) {
    assert.equal(typeof e.internalCode, "string");
    assert.equal(e.revenueCatPackageLookupKey, e.internalCode);
    assert.equal(e.iosProductId, `com.halaa.${e.internalCode}`);
    assert.equal(e.androidProductId, `com.halaa.${e.internalCode}`);
    assert.ok(offerings.includes(e.revenueCatOfferingId));
    assert.ok(e.nameAr && e.nameEn, "AR/EN names required");
    assert.equal(e.currentPlanIdentityKey, e.internalCode);
  }
});

test("subscriptions carry the recurring entitlement; consumables/add-ons never do", () => {
  const cat = commerce.getStoreSafeCatalog();
  for (const e of cat) {
    if (e.kind === "subscription") {
      assert.equal(e.revenueCatEntitlementId, "recurring_access");
      assert.equal(e.androidBasePlanId != null, true, "subscription needs a base-plan id");
    } else {
      assert.equal(e.revenueCatEntitlementId, null);
      assert.equal(e.androidBasePlanId, null);
    }
  }
});

test("design templates and business customization carry their signed policies", () => {
  const cat = commerce.getStoreSafeCatalog();
  const design = cat.filter((e) => e.family === "design_template");
  const biz = cat.find((e) => e.family === "business_customization");
  assert.ok(design.length >= 5);
  for (const d of design) {
    assert.equal(d.refundPolicy, "non_refundable_from_creation");
    // never a restorable digital entitlement (managed service)
    assert.notEqual(d.restoreBehavior, "store_restore");
  }
  assert.ok(biz);
  assert.equal(biz.refundPolicy, "managed_service_legal_review");
  assert.notEqual(biz.restoreBehavior, "store_restore");
});
