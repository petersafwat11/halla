import test from "node:test";
import assert from "node:assert/strict";
import {
  getPurchaseReadiness,
  READINESS_STATES,
  readinessReasonKey,
} from "../../services/billing/purchaseReadiness.js";

const mockEntry = {
  internalCode: "host_pro_monthly",
  code: "host_pro_monthly",
  storeEligible: true,
  isTrial: false,
  isUnlimited: false,
  revenueCatPackageLookupKey: "host_pro_monthly",
  iosProductId: "com.halaa.host_pro_monthly",
};

const mockPackage = {
  identifier: "host_pro_monthly",
  product: {
    identifier: "com.halaa.host_pro_monthly",
    priceString: "SAR 149.99",
  },
};

const mockOfferings = {
  availablePackages: [mockPackage],
};

test("Purchase readiness: loading state while queries are in flight", () => {
  const r1 = getPurchaseReadiness({ isCatalogLoading: true, targetCode: "host_pro_monthly" });
  assert.equal(r1.state, READINESS_STATES.LOADING);
  assert.equal(r1.ready, false);

  const r2 = getPurchaseReadiness({ isOfferingsLoading: true, targetCode: "host_pro_monthly" });
  assert.equal(r2.state, READINESS_STATES.LOADING);
  assert.equal(r2.ready, false);
});

test("Purchase readiness: sdk_unconfigured when SDK key is absent", () => {
  const r = getPurchaseReadiness({
    isConfigured: false,
    entries: [mockEntry],
    offerings: mockOfferings,
    targetCode: "host_pro_monthly",
  });
  assert.equal(r.state, READINESS_STATES.SDK_UNCONFIGURED);
  assert.equal(r.ready, false);
});

test("Purchase readiness: user_unidentified when user lacks billingUserId", () => {
  const r = getPurchaseReadiness({
    isUserIdentified: false,
    entries: [mockEntry],
    offerings: mockOfferings,
    targetCode: "host_pro_monthly",
  });
  assert.equal(r.state, READINESS_STATES.USER_UNIDENTIFIED);
  assert.equal(r.ready, false);
});

test("Purchase readiness: catalog_error when backend catalog fails", () => {
  const r = getPurchaseReadiness({
    catalogError: new Error("Network offline"),
    entries: [],
    offerings: mockOfferings,
    targetCode: "host_pro_monthly",
  });
  assert.equal(r.state, READINESS_STATES.CATALOG_ERROR);
  assert.equal(r.ready, false);
  assert.equal(r.retryable, true);
});

test("Purchase readiness: offerings_error when RevenueCat offerings fail", () => {
  const r = getPurchaseReadiness({
    offeringsError: new Error("Store unreachable"),
    entries: [mockEntry],
    offerings: null,
    targetCode: "host_pro_monthly",
  });
  assert.equal(r.state, READINESS_STATES.OFFERINGS_ERROR);
  assert.equal(r.ready, false);
  assert.equal(r.retryable, true);
});

test("Purchase readiness: entry_missing when targetCode not in catalog", () => {
  const r = getPurchaseReadiness({
    entries: [mockEntry],
    offerings: mockOfferings,
    targetCode: "unknown_code",
  });
  assert.equal(r.state, READINESS_STATES.ENTRY_MISSING);
  assert.equal(r.ready, false);
});

test("Purchase readiness: not_store_eligible for trial / unlimited entries", () => {
  const trialEntry = {
    ...mockEntry,
    internalCode: "trial",
    isTrial: true,
    storeEligible: false,
  };
  const r = getPurchaseReadiness({
    entries: [trialEntry],
    offerings: mockOfferings,
    targetCode: "trial",
  });
  assert.equal(r.state, READINESS_STATES.NOT_STORE_ELIGIBLE);
  assert.equal(r.ready, false);
});

test("Purchase readiness: package_missing when store offering lacks matching package", () => {
  const r = getPurchaseReadiness({
    entries: [mockEntry],
    offerings: { availablePackages: [] },
    targetCode: "host_pro_monthly",
  });
  assert.equal(r.state, READINESS_STATES.PACKAGE_MISSING);
  assert.equal(r.ready, false);
  assert.equal(r.priceString, null);
});

test("Purchase readiness: price_missing when package lacks localized price string", () => {
  const pkgNoPrice = {
    identifier: "host_pro_monthly",
    product: { identifier: "com.halaa.host_pro_monthly", priceString: null },
  };
  const r = getPurchaseReadiness({
    entries: [mockEntry],
    offerings: { availablePackages: [pkgNoPrice] },
    targetCode: "host_pro_monthly",
  });
  assert.equal(r.state, READINESS_STATES.PRICE_MISSING);
  assert.equal(r.ready, false);
});

test("Purchase readiness: ready with resolved store price string", () => {
  const r = getPurchaseReadiness({
    entries: [mockEntry],
    offerings: mockOfferings,
    targetCode: "host_pro_monthly",
  });
  assert.equal(r.state, READINESS_STATES.READY);
  assert.equal(r.ready, true);
  assert.equal(r.priceString, "SAR 149.99");
  assert.equal(r.pkg, mockPackage);
});

test("readinessReasonKey maps every blocker state to an i18n reason key", () => {
  const blockerStates = [
    READINESS_STATES.SDK_UNCONFIGURED,
    READINESS_STATES.USER_UNIDENTIFIED,
    READINESS_STATES.CATALOG_ERROR,
    READINESS_STATES.OFFERINGS_ERROR,
    READINESS_STATES.ENTRY_MISSING,
    READINESS_STATES.NOT_STORE_ELIGIBLE,
    READINESS_STATES.PACKAGE_MISSING,
    READINESS_STATES.PRICE_MISSING,
  ];

  for (const state of blockerStates) {
    assert.equal(
      readinessReasonKey(state),
      `checkout.iap.reasons.${state}`,
      `${state} must map to a reason key`
    );
  }

  // Non-blocker states carry no user-facing reason.
  assert.equal(readinessReasonKey(READINESS_STATES.LOADING), null);
  assert.equal(readinessReasonKey(READINESS_STATES.READY), null);
});
