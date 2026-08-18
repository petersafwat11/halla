const test = require("node:test");
const assert = require("node:assert/strict");
const { buildDesiredState } = require("../scripts/providers/lib/desiredState");
const { diffProvider } = require("../scripts/providers/lib/diff");
const { sealPlan, verifyPlan } = require("../scripts/providers/lib/plan");
const {
  buildApplePlan,
  buildGooglePlan,
  buildRevenueCatPlan,
} = require("../scripts/providers/lib/providerPlans");
const { chunks } = require("../scripts/providers/providers/revenuecatApply");
const {
  buildSubscriptionResource,
  buildOneTimeResource,
} = require("../scripts/providers/providers/googleApply");
const {
  appleSubscriptionPeriod,
  buildIapAvailabilityRequest,
  buildIapCreateRequest,
  buildIapLocalizationCreateRequest,
  buildIapPriceScheduleRequest,
  buildLocalizationRequest,
  buildSubscriptionAvailabilityRequest,
  buildSubscriptionCreateRequest,
  buildSubscriptionGroupRequest,
  buildSubscriptionLocalizationCreateRequest,
  buildSubscriptionPriceRequest,
  buildVersionCreateRequest,
} = require("../scripts/providers/providers/appleApply");

test("provider desired state has exact frozen counts", () => {
  const desired = buildDesiredState();
  assert.equal(desired.apple.products.length, 53);
  assert.equal(desired.google.products.length, 53);
  assert.equal(desired.revenueCat.products.length, 106);
  assert.equal(desired.revenueCat.entitlements.length, 1);
  assert.equal(desired.revenueCat.offerings.length, 4);
  assert.equal(
    desired.revenueCat.offerings.reduce((sum, offering) => sum + offering.packages.length, 0),
    53,
  );
  assert.ok(
    desired.apple.products.every((product) => product.productId !== "com.halaa.business_annual"),
  );
});

test("all generated Apple localizations fit App Store Connect limits", () => {
  const desired = buildDesiredState();
  for (const product of desired.apple.products) {
    for (const localization of product.localizations) {
      assert.ok(localization.name.length <= 30, `${product.code}:${localization.locale} name`);
      assert.ok(
        localization.description.length <= 45,
        `${product.code}:${localization.locale} description`,
      );
    }
  }
});

test("subscription-level proposal is complete and orders higher benefits first", () => {
  const desired = buildDesiredState();
  const proposals = desired.approvalReview.products.filter(
    (product) => product.type === "AUTO_RENEWABLE_SUBSCRIPTION",
  );
  assert.equal(proposals.length, 13);
  assert.ok(proposals.every((product) => Number.isInteger(product.proposedSubscriptionLevel)));
  assert.deepEqual(
    proposals.filter((product) => product.code.startsWith("business_")).map((product) => product.proposedSubscriptionLevel),
    [1],
  );
  const premium200 = proposals.find((product) => product.code === "premium_monthly_200");
  const premium25 = proposals.find((product) => product.code === "premium_monthly_25");
  const basic200 = proposals.find((product) => product.code === "basic_monthly_200");
  assert.ok(premium200.proposedSubscriptionLevel < premium25.proposedSubscriptionLevel);
  assert.ok(premium25.proposedSubscriptionLevel < basic200.proposedSubscriptionLevel);
});

test("RevenueCat entitlement contains both platform connections for subscriptions only", () => {
  const desired = buildDesiredState();
  const [entitlement] = desired.revenueCat.entitlements;
  assert.equal(entitlement.lookupKey, "recurring_access");
  assert.equal(entitlement.productConnectionKeys.length, 26);
  assert.ok(entitlement.productConnectionKeys.every((key) => key.startsWith("ios:") || key.startsWith("android:")));
  assert.ok(
    desired.revenueCat.products
      .filter((product) => entitlement.productConnectionKeys.includes(product.connectionKey))
      .every((product) => product.type === "subscription" && product.consumable === false),
  );
});

test("every package has matching iOS and Android connections", () => {
  const desired = buildDesiredState();
  const connections = new Set(desired.revenueCat.products.map((product) => product.connectionKey));
  for (const offering of desired.revenueCat.offerings) {
    for (const pkg of offering.packages) {
      assert.ok(connections.has(pkg.iosConnectionKey));
      assert.ok(connections.has(pkg.androidConnectionKey));
    }
  }
});

test("Google subscription store identifiers include base plan", () => {
  const desired = buildDesiredState();
  const subscriptions = desired.google.products.filter((product) => product.type === "SUBSCRIPTION");
  assert.equal(subscriptions.length, 13);
  assert.ok(subscriptions.every((product) => product.storeIdentifier === `${product.productId}:${product.basePlanId}`));
});

test("strict diff is clean for an exact export and reports drift", () => {
  const desired = buildDesiredState();
  assert.equal(diffProvider(desired, { apple: desired.apple }, "apple").clean, true);
  const actual = structuredClone(desired.apple);
  actual.products.pop();
  const result = diffProvider(desired, { apple: actual }, "apple");
  assert.equal(result.clean, false);
  assert.ok(result.differenceCount > 0);
});

test("sealed plans detect any post-review mutation", () => {
  const sealed = sealPlan({ provider: "apple", operations: [{ id: "one" }] });
  assert.equal(verifyPlan(sealed), true);
  sealed.operations[0].id = "changed";
  assert.equal(verifyPlan(sealed), false);
});

test("bootstrap plans are deterministic, zero-write, and blocked on readback", () => {
  const desired = buildDesiredState();
  const first = buildApplePlan(desired);
  const second = buildApplePlan(desired);
  assert.equal(first.planHash, second.planHash);
  assert.equal(first.externalWrites, 0);
  assert.ok(first.blockers.includes("CURRENT_READ_ONLY_EXPORT_REQUIRED_BEFORE_APPLY"));
  assert.equal(first.operations.filter((item) => item.action === "create_subscription").length, 13);
  assert.equal(first.operations.filter((item) => item.action === "create_iap").length, 40);
});

test("Apple shell stage requires approved copy and levels but defers price-point IDs", () => {
  const base = buildDesiredState();
  const approvals = structuredClone(base.approvalTemplate);
  approvals.generatedLocalizationDescriptionsApproved = true;
  const proposals = base.approvalReview.products.filter(
    (product) => product.type === "AUTO_RENEWABLE_SUBSCRIPTION",
  );
  for (const product of proposals) {
    approvals.apple.subscriptionLevels[product.productId] = product.proposedSubscriptionLevel;
  }
  const desired = buildDesiredState({ approvals });
  const actual = { inAppPurchases: [], subscriptions: [], subscriptionGroups: [] };
  const plan = buildApplePlan(desired, actual, { stage: "shells" });
  assert.equal(plan.stage, "shells");
  assert.deepEqual(plan.blockers, []);
  assert.equal(plan.operations.length, 54);
  assert.equal(plan.operations.filter((operation) => operation.action === "create_iap").length, 40);
  assert.equal(
    plan.operations.filter((operation) => operation.action === "create_subscription").length,
    13,
  );
});

test("Apple prices stage includes only explicitly approved price points", () => {
  const base = buildDesiredState();
  const approvals = structuredClone(base.approvalTemplate);
  approvals.apple.pricePointIds[base.apple.products[0].productId] = "approved-price-point";
  const desired = buildDesiredState({ approvals });
  const actual = {
    inAppPurchases: desired.apple.products
      .filter((product) => product.type === "CONSUMABLE")
      .map((product, index) => ({ id: `iap-${index}`, attributes: { productId: product.productId } })),
    subscriptions: desired.apple.products
      .filter((product) => product.type === "AUTO_RENEWABLE_SUBSCRIPTION")
      .map((product, index) => ({ id: `sub-${index}`, attributes: { productId: product.productId } })),
    subscriptionGroups: [],
  };
  const plan = buildApplePlan(desired, actual, { stage: "prices" });
  assert.equal(plan.blockers.length, 0);
  assert.equal(plan.conflicts.length, 0);
  assert.equal(plan.operations.length, 1);
  assert.equal(plan.deferred.length, 52);
  assert.equal(plan.operations[0].payload.applePricePointId, "approved-price-point");
  const approvedProduct = desired.apple.products[0];

  const appliedActual = {
    ...actual,
    iapPrices: [
      {
        id: "price-1",
        iapId: "iap-0",
        productId: approvedProduct.productId,
        pricePointId: "approved-price-point",
        territory: "SAU",
        startDate: "2026-08-16",
      },
    ],
  };
  const idempotent = buildApplePlan(desired, appliedActual, { stage: "prices" });
  assert.equal(idempotent.operations.length, 0);
  assert.equal(idempotent.conflicts.length, 0);
  assert.equal(idempotent.deferred.length, 52);

  const mismatchedActual = {
    ...actual,
    iapPrices: [
      { id: "price-2", iapId: "iap-0", productId: approvedProduct.productId, pricePointId: "other-point", territory: "SAU", startDate: null },
    ],
  };
  const mismatched = buildApplePlan(desired, mismatchedActual, { stage: "prices" });
  assert.ok(mismatched.conflicts.some((item) => item.reason === "APPLE_PRICE_MISMATCH"));
  assert.equal(mismatched.operations.length, 0);
});

test("Apple availability stage creates Saudi UPFRONT availability for all approved subscriptions", () => {
  const base = buildDesiredState();
  const approvals = structuredClone(base.approvalTemplate);
  approvals.generatedLocalizationDescriptionsApproved = true;
  for (const product of base.approvalReview.products.filter(
    (product) => product.type === "AUTO_RENEWABLE_SUBSCRIPTION",
  )) {
    approvals.apple.subscriptionLevels[product.productId] = product.proposedSubscriptionLevel;
    approvals.apple.pricePointIds[product.productId] = "approved-price-point";
  }
  const desired = buildDesiredState({ approvals });
  const subscriptions = desired.apple.products
    .filter((product) => product.type === "AUTO_RENEWABLE_SUBSCRIPTION")
    .map((product, index) => ({ id: `sub-${index}`, attributes: { productId: product.productId } }));
  const plan = buildApplePlan(desired, {
    inAppPurchases: [],
    subscriptions,
    subscriptionGroups: [],
    subscriptionPlanAvailabilities: [],
  }, { stage: "availability" });
  assert.equal(plan.stage, "availability");
  assert.equal(plan.externalWrites, 0);
  assert.deepEqual(plan.blockers, []);
  assert.equal(plan.conflicts.length, 0);
  assert.equal(plan.operations.length, 13);
  assert.equal(plan.deferred.length, 0);
  for (const operation of plan.operations) {
    assert.equal(operation.action, "set_subscription_availability");
    assert.equal(operation.payload.planType, "UPFRONT");
    assert.deepEqual(operation.payload.territories, ["SAU"]);
    assert.ok(operation.payload.appleResourceId);
    assert.ok(subscriptions.some((item) => item.id === operation.payload.appleResourceId));
  }
});

test("Apple availability stage is idempotent and fails closed on territory drift", () => {
  const base = buildDesiredState();
  const approvals = structuredClone(base.approvalTemplate);
  approvals.generatedLocalizationDescriptionsApproved = true;
  const subscriptionProducts = base.apple.products.filter(
    (product) => product.type === "AUTO_RENEWABLE_SUBSCRIPTION",
  );
  for (const product of subscriptionProducts) {
    approvals.apple.subscriptionLevels[product.productId] = 1;
    approvals.apple.pricePointIds[product.productId] = "approved-price-point";
  }
  const desired = buildDesiredState({ approvals });
  const subscriptions = subscriptionProducts.map(
    (product, index) => ({ id: `sub-${index}`, attributes: { productId: product.productId } }),
  );
  const appliedAvailability = subscriptions.map((item, index) => ({
    id: `availability-${index}`,
    subscriptionId: item.id,
    productId: item.attributes.productId,
    planType: "UPFRONT",
    availableInNewTerritories: false,
    territories: ["SAU"],
  }));

  const cleanPlan = buildApplePlan(desired, {
    inAppPurchases: [],
    subscriptions,
    subscriptionGroups: [],
    subscriptionPlanAvailabilities: appliedAvailability,
  }, { stage: "availability" });
  assert.equal(cleanPlan.operations.length, 0);
  assert.equal(cleanPlan.conflicts.length, 0);

  const drifted = structuredClone(appliedAvailability);
  drifted[0].territories = ["SAU", "ARE"];
  const driftedPlan = buildApplePlan(desired, {
    inAppPurchases: [],
    subscriptions,
    subscriptionGroups: [],
    subscriptionPlanAvailabilities: drifted,
  }, { stage: "availability" });
  assert.ok(driftedPlan.conflicts.some((item) => item.reason === "APPLE_SUBSCRIPTION_AVAILABILITY_TERRITORY_DRIFT"));
  assert.equal(driftedPlan.operations.length, 0);
  assert.equal(driftedPlan.deferred.length, 0);

  const monthlyRecord = structuredClone(appliedAvailability);
  monthlyRecord[0].planType = "MONTHLY";
  const monthlyPlan = buildApplePlan(desired, {
    inAppPurchases: [],
    subscriptions,
    subscriptionGroups: [],
    subscriptionPlanAvailabilities: monthlyRecord,
  }, { stage: "availability" });
  assert.ok(
    monthlyPlan.conflicts.some((item) => item.reason === "APPLE_SUBSCRIPTION_AVAILABILITY_PLAN_TYPE_UNEXPECTED"),
  );
});

test("Apple localization stage plans 108 direct-attach localizations and fails closed on drift", () => {
  const base = buildDesiredState();
  const approvals = structuredClone(base.approvalTemplate);
  approvals.generatedLocalizationDescriptionsApproved = true;
  const desired = buildDesiredState({ approvals });
  const subscriptions = desired.apple.products
    .filter((product) => product.type === "AUTO_RENEWABLE_SUBSCRIPTION")
    .map((product, index) => ({ id: `sub-${index}`, attributes: { productId: product.productId } }));
  const iaps = desired.apple.products
    .filter((product) => product.type === "CONSUMABLE")
    .map((product, index) => ({ id: `iap-${index}`, attributes: { productId: product.productId } }));
  const emptyActual = {
    inAppPurchases: iaps,
    subscriptions,
    subscriptionGroups: [],
    subscriptionLocalizations: [],
    iapLocalizations: [],
  };
  const plan = buildApplePlan(desired, emptyActual, { stage: "localization" });
  assert.equal(plan.stage, "localization");
  assert.equal(plan.externalWrites, 0);
  assert.deepEqual(plan.blockers, []);
  assert.equal(plan.conflicts.length, 0);
  assert.equal(plan.operations.length, 106);
  assert.equal(
    plan.operations.filter((operation) => operation.action === "create_subscription_localization").length,
    26,
  );
  assert.equal(plan.operations.filter((operation) => operation.action === "create_iap_localization").length, 80);
  for (const operation of plan.operations) {
    assert.match(operation.key, /^com\.halaa\.[a-z0-9_]+:(ar-SA|en-US)$/);
    assert.ok(operation.payload.appleResourceId);
    assert.ok(operation.payload.locale && operation.payload.name && operation.payload.description);
  }

  const unapproved = buildApplePlan(buildDesiredState(), emptyActual, { stage: "localization" });
  assert.ok(unapproved.blockers.includes("GENERATED_PRODUCT_DESCRIPTION_APPROVAL_REQUIRED"));

  const drifted = {
    ...emptyActual,
    subscriptionLocalizations: [
      {
        id: "loc-1",
        subscriptionId: "sub-0",
        productId: subscriptions[0].attributes.productId,
        locale: "ar-SA",
        name: "wrong",
        description: "wrong",
      },
    ],
  };
  const driftedPlan = buildApplePlan(desired, drifted, { stage: "localization" });
  assert.ok(driftedPlan.conflicts.some((item) => item.reason === "APPLE_LOCALIZATION_CONTENT_MISMATCH"));
  const extraLocale = {
    ...emptyActual,
    iapLocalizations: [
      { id: "loc-2", iapId: "iap-0", productId: iaps[0].attributes.productId, locale: "fr-FR", name: "x", description: "x" },
    ],
  };
  const extraPlan = buildApplePlan(desired, extraLocale, { stage: "localization" });
  assert.ok(extraPlan.conflicts.some((item) => item.reason === "EXTRA_APPLE_LOCALIZATION"));
});

test("Apple iap_availability stage plans 40 Saudi-only consumables and fails closed on drift", () => {
  const base = buildDesiredState();
  const approvals = structuredClone(base.approvalTemplate);
  approvals.generatedLocalizationDescriptionsApproved = true;
  const desired = buildDesiredState({ approvals });
  const iaps = desired.apple.products
    .filter((product) => product.type === "CONSUMABLE")
    .map((product, index) => ({ id: `iap-${index}`, attributes: { productId: product.productId } }));
  const plan = buildApplePlan(desired, {
    inAppPurchases: iaps,
    subscriptions: [],
    subscriptionGroups: [],
    iapAvailabilities: [],
  }, { stage: "iap_availability" });
  assert.equal(plan.stage, "iap_availability");
  assert.equal(plan.operations.length, 40);
  assert.equal(plan.conflicts.length, 0);
  for (const operation of plan.operations) {
    assert.equal(operation.action, "set_iap_availability");
    assert.deepEqual(operation.payload.territories, ["SAU"]);
    assert.equal(operation.payload.availableInNewTerritories, false);
  }

  const applied = iaps.map((item, index) => ({
    id: `availability-${index}`,
    iapId: item.id,
    productId: item.attributes.productId,
    availableInNewTerritories: false,
    territories: ["SAU"],
  }));
  const idempotent = buildApplePlan(desired, {
    inAppPurchases: iaps,
    subscriptions: [],
    subscriptionGroups: [],
    iapAvailabilities: applied,
  }, { stage: "iap_availability" });
  assert.equal(idempotent.operations.length, 0);
  assert.equal(idempotent.conflicts.length, 0);

  const drifted = structuredClone(applied);
  drifted[0].territories = ["SAU", "ARE"];
  const driftedPlan = buildApplePlan(desired, {
    inAppPurchases: iaps,
    subscriptions: [],
    subscriptionGroups: [],
    iapAvailabilities: drifted,
  }, { stage: "iap_availability" });
  assert.ok(driftedPlan.conflicts.some((item) => item.reason === "APPLE_IAP_AVAILABILITY_TERRITORY_DRIFT"));
});

test("Apple direct-attach localization create requests match the live API contract", () => {
  const subscriptionRequest = buildSubscriptionLocalizationCreateRequest("sub-id", {
    locale: "ar-SA",
    name: "اسم",
    description: "وصف",
  });
  assert.equal(subscriptionRequest.data.type, "subscriptionLocalizations");
  assert.equal(subscriptionRequest.data.attributes.locale, "ar-SA");
  assert.equal(subscriptionRequest.data.relationships.subscription.data.type, "subscriptions");
  assert.equal(subscriptionRequest.data.relationships.subscription.data.id, "sub-id");
  assert.throws(
    () => buildSubscriptionLocalizationCreateRequest("sub-id", { locale: "ar-SA" }),
    /requires locale, name, and description/,
  );

  const iapRequest = buildIapLocalizationCreateRequest("iap-id", {
    locale: "en-US",
    name: "Name",
    description: "Description",
  });
  assert.equal(iapRequest.data.type, "inAppPurchaseLocalizations");
  assert.equal(iapRequest.data.relationships.inAppPurchaseV2.data.type, "inAppPurchases");
  assert.equal(iapRequest.data.relationships.inAppPurchaseV2.data.id, "iap-id");
  assert.throws(
    () => buildIapLocalizationCreateRequest("iap-id", { locale: "en-US", name: "Name" }),
    /requires locale, name, and description/,
  );
});

test("provider planners detect immutable cross-type conflicts", () => {
  const desired = buildDesiredState();
  const appleProduct = desired.apple.products.find((item) => item.type === "AUTO_RENEWABLE_SUBSCRIPTION");
  const applePlan = buildApplePlan(desired, {
    inAppPurchases: [{ attributes: { productId: appleProduct.productId, inAppPurchaseType: "CONSUMABLE" } }],
    subscriptions: [],
    subscriptionGroups: [],
  });
  assert.ok(applePlan.conflicts.some((item) => item.reason === "IMMUTABLE_PRODUCT_TYPE_CONFLICT"));

  const googleProduct = desired.google.products.find((item) => item.type === "SUBSCRIPTION");
  const googlePlan = buildGooglePlan(desired, {
    subscriptions: [],
    oneTimeProducts: [{ productId: googleProduct.productId }],
  });
  assert.ok(googlePlan.conflicts.some((item) => item.reason === "IMMUTABLE_PRODUCT_TYPE_CONFLICT"));
});

test("RevenueCat planner reports existing test catalog drift", () => {
  const desired = buildDesiredState();
  const previousIos = process.env.REVENUECAT_IOS_APP_ID;
  const previousAndroid = process.env.REVENUECAT_ANDROID_APP_ID;
  process.env.REVENUECAT_IOS_APP_ID = "app_ios";
  process.env.REVENUECAT_ANDROID_APP_ID = "app_android";
  try {
    const plan = buildRevenueCatPlan(desired, {
      products: [{ id: "test-product", app_id: "test-app", store_identifier: "monthly", type: "subscription" }],
      entitlements: [],
      offerings: [{ id: "default", lookup_key: "default", packages: [] }],
    });
    assert.ok(plan.conflicts.some((item) => item.reason === "EXTRA_REVENUECAT_PRODUCT_CONNECTION"));
    assert.ok(plan.conflicts.some((item) => item.reason === "EXTRA_REVENUECAT_OFFERING"));
  } finally {
    if (previousIos == null) delete process.env.REVENUECAT_IOS_APP_ID;
    else process.env.REVENUECAT_IOS_APP_ID = previousIos;
    if (previousAndroid == null) delete process.env.REVENUECAT_ANDROID_APP_ID;
    else process.env.REVENUECAT_ANDROID_APP_ID = previousAndroid;
  }
});

test("RevenueCat attachment requests stay within the API batch limit", () => {
  const values = Array.from({ length: 108 }, (_, index) => `prod-${index}`);
  const batches = chunks(values);
  assert.deepEqual(batches.map((batch) => batch.length), [50, 50, 8]);
  assert.deepEqual(batches.flat(), values);
});

test("Google resources are Saudi-only drafts with exact product and base-plan IDs", () => {
  const desired = buildDesiredState({ googleRegionsVersion: "2026/08" });
  const subscription = desired.google.products.find((item) => item.type === "SUBSCRIPTION");
  const subscriptionResource = buildSubscriptionResource(subscription, desired.google.packageName);
  assert.equal(subscriptionResource.productId, subscription.productId);
  assert.equal(subscriptionResource.basePlans[0].basePlanId, subscription.basePlanId);
  assert.equal(subscriptionResource.basePlans[0].autoRenewingBasePlanType.billingPeriodDuration, subscription.duration);
  assert.deepEqual(subscriptionResource.basePlans[0].regionalConfigs.map((item) => item.regionCode), ["SA"]);
  assert.equal(subscriptionResource.otherRegionsConfig, undefined);

  const oneTime = desired.google.products.find((item) => item.type === "ONE_TIME_PRODUCT");
  const oneTimeResource = buildOneTimeResource(oneTime, desired.google.packageName);
  assert.equal(oneTimeResource.productId, oneTime.productId);
  assert.deepEqual(
    oneTimeResource.purchaseOptions[0].regionalPricingAndAvailabilityConfigs.map((item) => item.regionCode),
    ["SA"],
  );
  assert.equal(oneTimeResource.purchaseOptions[0].purchaseOptionId, "buy");
  assert.equal(oneTimeResource.purchaseOptions[0].buyOption.multiQuantityEnabled, false);
});

test("Apple shell request builders use exact App Store Connect JSON:API shapes", () => {
  const desired = buildDesiredState();
  const group = buildSubscriptionGroupRequest("123456789", "halaa_recurring");
  assert.equal(group.data.type, "subscriptionGroups");
  assert.equal(group.data.relationships.app.data.id, "123456789");

  const consumable = desired.apple.products.find((item) => item.type === "CONSUMABLE");
  const iap = buildIapCreateRequest("123456789", consumable);
  assert.equal(iap.data.type, "inAppPurchases");
  assert.equal(iap.data.attributes.productId, consumable.productId);
  assert.equal(iap.data.attributes.inAppPurchaseType, "CONSUMABLE");
  assert.equal(iap.data.attributes.familySharable, false);

  const subscription = desired.apple.products.find(
    (item) => item.type === "AUTO_RENEWABLE_SUBSCRIPTION",
  );
  subscription.subscriptionLevel = 1;
  const request = buildSubscriptionCreateRequest("group-id", subscription);
  assert.equal(request.data.type, "subscriptions");
  assert.equal(request.data.relationships.group.data.id, "group-id");
  assert.equal(request.data.attributes.subscriptionPeriod, appleSubscriptionPeriod(subscription.duration));
  assert.equal(request.data.attributes.groupLevel, 1);
});

test("Apple subscription requests fail closed without an approved level", () => {
  const desired = buildDesiredState();
  const subscription = desired.apple.products.find(
    (item) => item.type === "AUTO_RENEWABLE_SUBSCRIPTION",
  );
  assert.throws(
    () => buildSubscriptionCreateRequest("group-id", subscription),
    /level is not approved/,
  );
});

test("Apple metadata, Saudi availability, and pricing builders match the current OpenAPI contract", () => {
  const subscriptionVersion = buildVersionCreateRequest("subscriptions", "sub-id");
  assert.equal(subscriptionVersion.data.type, "subscriptionVersions");
  assert.equal(subscriptionVersion.data.relationships.subscription.data.id, "sub-id");
  const localization = buildLocalizationRequest("subscriptionVersions", "version-id", {
    locale: "ar-SA",
    name: "اسم",
    description: "وصف",
  });
  assert.equal(localization.data.type, "subscriptionLocalizations");
  assert.equal(localization.data.relationships.version.data.id, "version-id");

  const subscriptionAvailability = buildSubscriptionAvailabilityRequest("sub-id", ["SAU"], "UPFRONT");
  assert.equal(subscriptionAvailability.data.attributes.availableInNewTerritories, false);
  assert.equal(subscriptionAvailability.data.attributes.planType, "UPFRONT");
  assert.deepEqual(subscriptionAvailability.data.relationships.availableTerritories.data, [
    { type: "territories", id: "SAU" },
  ]);
  const iapAvailability = buildIapAvailabilityRequest("iap-id");
  assert.deepEqual(iapAvailability.data.relationships.availableTerritories.data, [
    { type: "territories", id: "SAU" },
  ]);

  const subscriptionPrice = buildSubscriptionPriceRequest("sub-id", "sub-price-point");
  assert.equal(
    subscriptionPrice.data.relationships.subscriptionPricePoint.data.id,
    "sub-price-point",
  );
  assert.equal(subscriptionPrice.data.attributes.planType, "UPFRONT");
  assert.equal(subscriptionPrice.data.relationships.territory.data.id, "SAU");
  const iapPrice = buildIapPriceScheduleRequest("iap-id", "iap-price-point");
  assert.equal(iapPrice.data.relationships.baseTerritory.data.id, "SAU");
  assert.match(iapPrice.included[0].attributes.startDate, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(iapPrice.included[0].relationships.inAppPurchasePricePoint.data.id, "iap-price-point");
  assert.throws(
    () => buildSubscriptionAvailabilityRequest("sub-id"),
    /requires an approved MONTHLY or UPFRONT/,
  );
});

test("approval overlay is catalog-bound and resolves only explicit choices", () => {
  const base = buildDesiredState();
  const approvals = structuredClone(base.approvalTemplate);
  approvals.generatedLocalizationDescriptionsApproved = true;
  for (const key of Object.keys(approvals.apple.pricePointIds)) approvals.apple.pricePointIds[key] = `price-${key}`;
  for (const key of Object.keys(approvals.apple.subscriptionLevels)) approvals.apple.subscriptionLevels[key] = 1;
  const approved = buildDesiredState({ approvals });
  assert.equal(approved.unresolvedApprovals.applePricePoints, 0);
  assert.equal(approved.unresolvedApprovals.appleSubscriptionLevels, 0);
  assert.deepEqual(approved.unresolvedApprovals.generatedLocalizationDescriptions, []);

  approvals.catalogHash = "wrong";
  assert.throws(() => buildDesiredState({ approvals }), /catalogHash does not match/);
});
