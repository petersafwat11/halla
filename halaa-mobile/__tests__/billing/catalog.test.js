/**
 * Pure store-catalog helper tests (node --test, no react-native).
 * Covers: package lookup, store-eligibility filtering (trial never sellable),
 * and store-only pricing (no backend price fallback — P0-13).
 */

const { test } = require("node:test");
const assert = require("node:assert/strict");

const c = require("../../services/billing/catalog");

const ENTRIES = [
  {
    internalCode: "basic_monthly_25",
    kind: "subscription",
    storeEligible: true,
    isTrial: false,
    isUnlimited: false,
    eligibleForCaller: true,
    revenueCatPackageLookupKey: "basic_monthly_25",
    iosProductId: "com.halaa.basic_monthly_25",
    androidProductId: "com.halaa.basic_monthly_25",
    revenueCatOfferingId: "host_plans",
  },
  {
    internalCode: "basic_event_25",
    kind: "event_consumable",
    storeEligible: true,
    isTrial: false,
    isUnlimited: false,
    eligibleForCaller: true,
    revenueCatPackageLookupKey: "basic_event_25",
    iosProductId: "com.halaa.basic_event_25",
    androidProductId: "com.halaa.basic_event_25",
    revenueCatOfferingId: "host_plans",
  },
  { internalCode: "trial", kind: "internal", storeEligible: false, isTrial: true, isUnlimited: false, eligibleForCaller: true },
  {
    internalCode: "business_quarterly",
    kind: "subscription",
    storeEligible: true,
    isTrial: false,
    isUnlimited: false,
    eligibleForCaller: false, // caller is a personal host
    revenueCatPackageLookupKey: "business_quarterly",
    iosProductId: "com.halaa.business_quarterly",
    androidProductId: "com.halaa.business_quarterly",
    revenueCatOfferingId: "business_plans",
  },
];

const OFFERINGS = {
  host_plans: {
    availablePackages: [
      { identifier: "basic_monthly_25", product: { identifier: "com.halaa.basic_monthly_25", priceString: "SAR 125.00" } },
      { identifier: "basic_event_25", product: { identifier: "com.halaa.basic_event_25", priceString: "SAR 95.00" } },
    ],
  },
  business_plans: {
    availablePackages: [
      { identifier: "business_quarterly", product: { identifier: "com.halaa.business_quarterly", priceString: "SAR 999.00" } },
    ],
  },
};

test("getEntry finds by internalCode; null for unknown", () => {
  assert.equal(c.getEntry(ENTRIES, "basic_event_25").kind, "event_consumable");
  assert.equal(c.getEntry(ENTRIES, "missing"), null);
});

test("eligibleEntries drops trial and not-eligible-for-caller", () => {
  const codes = c.eligibleEntries(ENTRIES).map((e) => e.internalCode);
  assert.deepEqual(codes, ["basic_monthly_25", "basic_event_25"]);
});

test("isStoreEligibleCode: trial is never store-eligible", () => {
  assert.equal(c.isStoreEligibleCode(ENTRIES, "basic_monthly_25"), true);
  assert.equal(c.isStoreEligibleCode(ENTRIES, "trial"), false);
});

test("resolvePurchasable returns the STORE price string from the package", () => {
  const r = c.resolvePurchasable(ENTRIES, OFFERINGS, "basic_monthly_25");
  assert.equal(r.available, true);
  assert.equal(r.priceString, "SAR 125.00");
});

test("resolvePurchasable: missing package => unavailable, NO fallback price", () => {
  const r = c.resolvePurchasable(ENTRIES, { host_plans: { availablePackages: [] } }, "basic_monthly_25");
  assert.equal(r.available, false);
  assert.equal(r.reason, "package_missing");
  assert.equal(r.priceString, null);
});

test("resolvePurchasable: trial/unlimited can never resolve to a store product", () => {
  const r = c.resolvePurchasable(ENTRIES, OFFERINGS, "trial");
  assert.equal(r.available, false);
  assert.equal(r.reason, "not_store_eligible");
});

test("findPackage accepts a single offering object too", () => {
  const pkg = c.findPackage(OFFERINGS.host_plans, ENTRIES[0]);
  assert.equal(pkg.identifier, "basic_monthly_25");
});

test("addonCatalogCode composes the exact backend grammar", () => {
  assert.equal(c.addonCatalogCode({ addonType: "extra_invites", quantity: 50 }), "extra_invites_50");
  assert.equal(c.addonCatalogCode({ addonType: "design_template", templateType: "animated" }), "design_template_animated");
  assert.equal(c.addonCatalogCode({ addonType: "business_customization" }), "business_customization");
  assert.equal(c.addonCatalogCode({ addonType: "unknown" }), null);
});
