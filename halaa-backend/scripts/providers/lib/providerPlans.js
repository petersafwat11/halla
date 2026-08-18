const { makeOperation, sealPlan, sha256, canonicalJson } = require("./plan");
const { stable } = require("./diff");

function planEnvelope(provider, desired, source, actual, stage = "full") {
  const actualProvided = Boolean(actual);
  return {
    schemaVersion: 1,
    mode: "DRY_RUN",
    externalWrites: 0,
    provider,
    stage,
    source,
    actualStateBasis: actualProvided ? "READ_ONLY_EXPORT" : "ASSUME_EMPTY_FOR_BOOTSTRAP_ONLY",
    actualStateHash: actualProvided ? sha256(canonicalJson(stable(actual))) : null,
    blockers: actualProvided ? [] : ["CURRENT_READ_ONLY_EXPORT_REQUIRED_BEFORE_APPLY"],
    conflicts: [],
    operations: [],
  };
}

function appleType(type) {
  return String(type || "").toUpperCase();
}

function buildApplePlan(desiredState, actual, options = {}) {
  const stage = options.stage || "full";
  const desired = desiredState.apple;
  const plan = planEnvelope("apple", desired, desiredState.source, actual, stage);
  const actualState = actual && (actual.apple || actual);
  const currentIaps = new Map(
    (actualState?.inAppPurchases || []).map((item) => [item.attributes?.productId, item]),
  );
  const currentSubscriptions = new Map(
    (actualState?.subscriptions || []).map((item) => [item.attributes?.productId, item]),
  );
  const currentGroups = new Map(
    (actualState?.subscriptionGroups || []).map((item) => [item.attributes?.referenceName, item]),
  );

  if (stage === "prices") {
    plan.deferred = [];
    const appliedPriceByProduct = new Map();
    for (const record of [
      ...(actualState?.subscriptionPrices || []),
      ...(actualState?.iapPrices || []),
    ]) {
      if (record.productId) appliedPriceByProduct.set(record.productId, record);
    }
    for (const product of desired.products) {
      const expectedSubscription = product.type === "AUTO_RENEWABLE_SUBSCRIPTION";
      const existing = expectedSubscription
        ? currentSubscriptions.get(product.productId)
        : currentIaps.get(product.productId);
      if (!existing) {
        plan.conflicts.push({
          key: product.productId,
          reason: "APPLE_PRODUCT_SHELL_REQUIRED",
          expected: product.type,
          actual: null,
        });
        continue;
      }
      if (!product.applePricePointId) {
        plan.deferred.push({ key: product.productId, reason: "PRICE_POINT_APPROVAL_DEFERRED" });
        continue;
      }
      const applied = appliedPriceByProduct.get(product.productId);
      if (applied) {
        if (applied.pricePointId === product.applePricePointId && applied.territory === "SAU") {
          continue;
        }
        plan.conflicts.push({
          key: product.productId,
          reason: "APPLE_PRICE_MISMATCH",
          expected: { pricePointId: product.applePricePointId, territory: "SAU" },
          actual: { pricePointId: applied.pricePointId, territory: applied.territory },
        });
        continue;
      }
      plan.operations.push(
        makeOperation(
          "apple",
          40,
          expectedSubscription ? "set_subscription_price" : "set_iap_price",
          product.productId,
          { ...product, appleResourceId: existing.id },
        ),
      );
    }
    return sealPlan(plan);
  }

  if (stage === "availability") {
    const expectedAvailability = { planType: "UPFRONT", availableInNewTerritories: false, territories: ["SAU"] };
    const upfrontBySubscription = new Map();
    for (const record of actualState?.subscriptionPlanAvailabilities || []) {
      if (record.planType === "UPFRONT") {
        upfrontBySubscription.set(record.subscriptionId, record);
      }
    }
    plan.deferred = [];
    for (const product of desired.products) {
      if (product.type !== "AUTO_RENEWABLE_SUBSCRIPTION") continue;
      const existing = currentSubscriptions.get(product.productId);
      if (!existing) {
        plan.conflicts.push({
          key: product.productId,
          reason: "APPLE_PRODUCT_SHELL_REQUIRED",
          expected: product.type,
          actual: null,
        });
        continue;
      }
      if (!product.applePricePointId) {
        plan.deferred.push({ key: product.productId, reason: "PRICE_POINT_APPROVAL_DEFERRED" });
        continue;
      }
      const unexpected = (actualState?.subscriptionPlanAvailabilities || []).filter(
        (record) => record.subscriptionId === existing.id && record.planType !== "UPFRONT",
      );
      if (unexpected.length) {
        plan.conflicts.push({
          key: product.productId,
          reason: "APPLE_SUBSCRIPTION_AVAILABILITY_PLAN_TYPE_UNEXPECTED",
          expected: expectedAvailability.planType,
          actual: unexpected.map((record) => record.planType),
        });
        continue;
      }
      const applied = upfrontBySubscription.get(existing.id);
      if (applied) {
        const matches =
          applied.availableInNewTerritories === expectedAvailability.availableInNewTerritories &&
          Array.isArray(applied.territories) &&
          applied.territories.length === expectedAvailability.territories.length &&
          expectedAvailability.territories.every((territory) => applied.territories.includes(territory));
        if (matches) continue;
        plan.conflicts.push({
          key: product.productId,
          reason: "APPLE_SUBSCRIPTION_AVAILABILITY_TERRITORY_DRIFT",
          expected: expectedAvailability,
          actual: {
            planType: applied.planType,
            availableInNewTerritories: applied.availableInNewTerritories,
            territories: applied.territories,
          },
        });
        continue;
      }
      plan.operations.push(
        makeOperation("apple", 35, "set_subscription_availability", product.productId, {
          ...product,
          appleResourceId: existing.id,
          territories: expectedAvailability.territories,
          planType: expectedAvailability.planType,
        }),
      );
    }
    return sealPlan(plan);
  }

  if (stage === "localization") {
    if (desiredState.unresolvedApprovals.generatedLocalizationDescriptions.length) {
      plan.blockers.push("GENERATED_PRODUCT_DESCRIPTION_APPROVAL_REQUIRED");
    }
    const currentSubscriptionLocalizations = new Map();
    for (const record of actualState?.subscriptionLocalizations || []) {
      if (!currentSubscriptionLocalizations.has(record.subscriptionId)) {
        currentSubscriptionLocalizations.set(record.subscriptionId, []);
      }
      currentSubscriptionLocalizations.get(record.subscriptionId).push(record);
    }
    const currentIapLocalizations = new Map();
    for (const record of actualState?.iapLocalizations || []) {
      if (!currentIapLocalizations.has(record.iapId)) {
        currentIapLocalizations.set(record.iapId, []);
      }
      currentIapLocalizations.get(record.iapId).push(record);
    }
    const desiredLocales = new Set(["ar-SA", "en-US"]);
    for (const product of desired.products) {
      const expectedSubscription = product.type === "AUTO_RENEWABLE_SUBSCRIPTION";
      const existing = expectedSubscription
        ? currentSubscriptions.get(product.productId)
        : currentIaps.get(product.productId);
      if (!existing) {
        plan.conflicts.push({
          key: product.productId,
          reason: "APPLE_PRODUCT_SHELL_REQUIRED",
          expected: product.type,
          actual: null,
        });
        continue;
      }
      const current = expectedSubscription
        ? currentSubscriptionLocalizations.get(existing.id) || []
        : currentIapLocalizations.get(existing.id) || [];
      for (const record of current) {
        if (!desiredLocales.has(record.locale)) {
          plan.conflicts.push({
            key: `${product.productId}:${record.locale}`,
            reason: "EXTRA_APPLE_LOCALIZATION",
            expected: [...desiredLocales],
            actual: record.locale,
          });
        }
      }
      for (const localization of product.localizations) {
        const match = current.find((record) => record.locale === localization.locale);
        if (match) {
          if (match.name !== localization.name || match.description !== localization.description) {
            plan.conflicts.push({
              key: `${product.productId}:${localization.locale}`,
              reason: "APPLE_LOCALIZATION_CONTENT_MISMATCH",
              expected: { name: localization.name, description: localization.description },
              actual: { name: match.name, description: match.description },
            });
          }
          continue;
        }
        plan.operations.push(
          makeOperation(
            "apple",
            45,
            expectedSubscription ? "create_subscription_localization" : "create_iap_localization",
            `${product.productId}:${localization.locale}`,
            {
              productId: product.productId,
              appleResourceId: existing.id,
              locale: localization.locale,
              name: localization.name,
              description: localization.description,
            },
          ),
        );
      }
    }
    return sealPlan(plan);
  }

  if (stage === "iap_availability") {
    const expectedTerritories = ["SAU"];
    const availabilityByIap = new Map(
      (actualState?.iapAvailabilities || []).map((record) => [record.iapId, record]),
    );
    for (const product of desired.products) {
      if (product.type !== "CONSUMABLE") continue;
      const existing = currentIaps.get(product.productId);
      if (!existing) {
        plan.conflicts.push({
          key: product.productId,
          reason: "APPLE_PRODUCT_SHELL_REQUIRED",
          expected: product.type,
          actual: null,
        });
        continue;
      }
      const applied = availabilityByIap.get(existing.id);
      if (applied) {
        const matches =
          applied.availableInNewTerritories === false &&
          Array.isArray(applied.territories) &&
          applied.territories.length === expectedTerritories.length &&
          expectedTerritories.every((territory) => applied.territories.includes(territory));
        if (matches) continue;
        plan.conflicts.push({
          key: product.productId,
          reason: "APPLE_IAP_AVAILABILITY_TERRITORY_DRIFT",
          expected: { availableInNewTerritories: false, territories: expectedTerritories },
          actual: {
            availableInNewTerritories: applied.availableInNewTerritories,
            territories: applied.territories,
          },
        });
        continue;
      }
      plan.operations.push(
        makeOperation("apple", 36, "set_iap_availability", product.productId, {
          productId: product.productId,
          appleResourceId: existing.id,
          territories: expectedTerritories,
          availableInNewTerritories: false,
        }),
      );
    }
    return sealPlan(plan);
  }

  if (!currentGroups.has("halaa_recurring")) {
    plan.operations.push(
      makeOperation("apple", 10, "create_subscription_group", "halaa_recurring", {
        referenceName: "halaa_recurring",
      }),
    );
  }

  for (const product of desired.products) {
    const expectedSubscription = product.type === "AUTO_RENEWABLE_SUBSCRIPTION";
    const existing = expectedSubscription
      ? currentSubscriptions.get(product.productId)
      : currentIaps.get(product.productId);
    const wrongCollection = expectedSubscription
      ? currentIaps.get(product.productId)
      : currentSubscriptions.get(product.productId);
    if (wrongCollection) {
      plan.conflicts.push({
        key: product.productId,
        reason: "IMMUTABLE_PRODUCT_TYPE_CONFLICT",
        expected: product.type,
        actual: wrongCollection.type || wrongCollection.attributes?.inAppPurchaseType || "other",
      });
      continue;
    }
    if (existing) {
      const existingType = appleType(existing.attributes?.inAppPurchaseType || existing.type);
      if (!expectedSubscription && existingType && !existingType.includes("CONSUMABLE")) {
        plan.conflicts.push({
          key: product.productId,
          reason: "IMMUTABLE_PRODUCT_TYPE_CONFLICT",
          expected: product.type,
          actual: existingType,
        });
        continue;
      }
    }
    if (stage === "shells" && existing) continue;
    plan.operations.push(
      makeOperation(
        "apple",
        existing ? 30 : 20,
        existing ? "verify_or_update_product" : expectedSubscription ? "create_subscription" : "create_iap",
        product.productId,
        product,
      ),
    );
  }

  if (stage !== "shells" && desiredState.unresolvedApprovals.applePricePoints > 0) {
    plan.blockers.push("APPLE_PRICE_POINT_APPROVAL_REQUIRED");
  }
  if (desiredState.unresolvedApprovals.appleSubscriptionLevels > 0) {
    plan.blockers.push("APPLE_SUBSCRIPTION_LEVEL_APPROVAL_REQUIRED");
  }
  if (desiredState.unresolvedApprovals.generatedLocalizationDescriptions.length > 0) {
    plan.blockers.push("GENERATED_PRODUCT_DESCRIPTION_APPROVAL_REQUIRED");
  }
  if (stage !== "shells") {
    plan.blockers.push("APPLE_LOCALIZATION_PRICE_AVAILABILITY_ADAPTER_NOT_ENABLED");
  }
  return sealPlan(plan);
}

function buildGooglePlan(desiredState, actual) {
  const desired = desiredState.google;
  const plan = planEnvelope("google", desired, desiredState.source, actual);
  const actualState = actual && (actual.google || actual);
  const currentSubscriptions = new Map(
    (actualState?.subscriptions || []).map((item) => [item.productId, item]),
  );
  const currentOneTime = new Map(
    (actualState?.oneTimeProducts || []).map((item) => [item.productId, item]),
  );

  for (const product of desired.products) {
    const expectedSubscription = product.type === "SUBSCRIPTION";
    const existing = expectedSubscription
      ? currentSubscriptions.get(product.productId)
      : currentOneTime.get(product.productId);
    const wrongCollection = expectedSubscription
      ? currentOneTime.get(product.productId)
      : currentSubscriptions.get(product.productId);
    if (wrongCollection) {
      plan.conflicts.push({
        key: product.productId,
        reason: "IMMUTABLE_PRODUCT_TYPE_CONFLICT",
        expected: product.type,
        actual: expectedSubscription ? "ONE_TIME_PRODUCT" : "SUBSCRIPTION",
      });
      continue;
    }
    plan.operations.push(
      makeOperation(
        "google",
        existing ? 30 : 20,
        existing
          ? "verify_or_update_product"
          : expectedSubscription
            ? "create_subscription_draft"
            : "create_one_time_product",
        product.productId,
        product,
      ),
    );
  }
  if (!desired.regionsVersion) plan.blockers.push("GOOGLE_REGIONS_VERSION_READBACK_REQUIRED");
  if (desiredState.unresolvedApprovals.generatedLocalizationDescriptions.length > 0) {
    plan.blockers.push("GENERATED_PRODUCT_DESCRIPTION_APPROVAL_REQUIRED");
  }
  return sealPlan(plan);
}

function revenueCatProductType(type) {
  const normalized = String(type || "").toLowerCase();
  if (["one_time", "consumable"].includes(normalized)) return "consumable";
  return normalized;
}

function associationProductId(item) {
  return item?.product?.id || item?.id || item?.product_id || null;
}

function setsEqual(left, right) {
  return left.size === right.size && [...left].every((item) => right.has(item));
}

function buildRevenueCatPlan(desiredState, actual) {
  const desired = desiredState.revenueCat;
  const plan = planEnvelope("revenueCat", desired, desiredState.source, actual);
  const actualState = actual && (actual.revenueCat || actual);
  const iosAppId = process.env.REVENUECAT_IOS_APP_ID || null;
  const androidAppId = process.env.REVENUECAT_ANDROID_APP_ID || null;
  if (!iosAppId) plan.blockers.push("REVENUECAT_IOS_APP_ID_REQUIRED");
  if (!androidAppId) plan.blockers.push("REVENUECAT_ANDROID_APP_ID_REQUIRED");

  const currentProducts = new Map(
    (actualState?.products || []).map((item) => [`${item.app_id}:${item.store_identifier}`, item]),
  );
  const currentProductByConnectionKey = new Map();
  const desiredProductKeys = new Set();
  for (const product of desired.products) {
    const appId = product.platform === "ios" ? iosAppId : androidAppId;
    const key = `${appId}:${product.storeIdentifier}`;
    desiredProductKeys.add(key);
    const existing = currentProducts.get(key);
    const expectedType = product.type === "subscription" ? "subscription" : "consumable";
    if (existing && revenueCatProductType(existing.type) !== expectedType) {
      plan.conflicts.push({
        key: product.connectionKey,
        reason: "PRODUCT_TYPE_CONFLICT",
        expected: expectedType,
        actual: existing.type,
      });
      continue;
    }
    if (existing) currentProductByConnectionKey.set(product.connectionKey, existing);
    if (!existing) {
      plan.operations.push(
        makeOperation("revenueCat", 20, "create_product_connection", product.connectionKey, {
          ...product,
          appId,
          type: expectedType,
        }),
      );
    }
  }

  for (const existing of actualState?.products || []) {
    const key = `${existing.app_id}:${existing.store_identifier}`;
    if (!desiredProductKeys.has(key)) {
      plan.conflicts.push({
        key,
        reason: "EXTRA_REVENUECAT_PRODUCT_CONNECTION",
        actual: existing.store_identifier,
      });
    }
  }

  const currentEntitlements = new Map(
    (actualState?.entitlements || []).map((item) => [item.lookup_key, item]),
  );
  for (const extra of [...currentEntitlements.keys()].filter(
    (key) => !desired.entitlements.some((item) => item.lookupKey === key),
  )) {
    plan.conflicts.push({ key: extra, reason: "EXTRA_REVENUECAT_ENTITLEMENT" });
  }
  for (const entitlement of desired.entitlements) {
    const existingEntitlement = currentEntitlements.get(entitlement.lookupKey);
    if (!existingEntitlement) {
      plan.operations.push(
        makeOperation("revenueCat", 30, "create_entitlement", entitlement.lookupKey, {
          lookupKey: entitlement.lookupKey,
          displayName: entitlement.displayName,
        }),
      );
    }
    const desiredIds = new Set(
      entitlement.productConnectionKeys
        .map((key) => currentProductByConnectionKey.get(key)?.id)
        .filter(Boolean),
    );
    const currentIds = new Set(
      (existingEntitlement?.products || []).map(associationProductId).filter(Boolean),
    );
    if (!existingEntitlement || desiredIds.size !== entitlement.productConnectionKeys.length || !setsEqual(desiredIds, currentIds)) {
      plan.operations.push(
        makeOperation(
          "revenueCat",
          60,
          "reconcile_entitlement_products",
          entitlement.lookupKey,
          entitlement,
        ),
      );
    }
  }

  const currentOfferings = new Map(
    (actualState?.offerings || []).map((item) => [item.lookup_key, item]),
  );
  for (const extra of [...currentOfferings.keys()].filter(
    (key) => !desired.offerings.some((item) => item.lookupKey === key),
  )) {
    plan.conflicts.push({ key: extra, reason: "EXTRA_REVENUECAT_OFFERING" });
  }
  for (const offering of desired.offerings) {
    const existingOffering = currentOfferings.get(offering.lookupKey);
    if (!existingOffering) {
      plan.operations.push(
        makeOperation("revenueCat", 30, "create_offering", offering.lookupKey, {
          lookupKey: offering.lookupKey,
          displayName: offering.displayName,
        }),
      );
    }
    const currentPackages = new Map(
      (existingOffering?.packages || []).map((item) => [item.lookup_key, item]),
    );
    for (const extra of [...currentPackages.keys()].filter(
      (key) => !offering.packages.some((item) => item.lookupKey === key),
    )) {
      plan.conflicts.push({
        key: `${offering.lookupKey}:${extra}`,
        reason: "EXTRA_REVENUECAT_PACKAGE",
      });
    }
    for (const [position, pkg] of offering.packages.entries()) {
      const existingPackage = currentPackages.get(pkg.lookupKey);
      if (!existingPackage) {
        plan.operations.push(
          makeOperation(
            "revenueCat",
            40,
            "create_package",
            `${offering.lookupKey}:${pkg.lookupKey}`,
            { ...pkg, offeringLookupKey: offering.lookupKey, position: position + 1 },
          ),
        );
      }
      const desiredIds = new Set(
        [pkg.iosConnectionKey, pkg.androidConnectionKey]
          .map((key) => currentProductByConnectionKey.get(key)?.id)
          .filter(Boolean),
      );
      const currentIds = new Set(
        (existingPackage?.products || []).map(associationProductId).filter(Boolean),
      );
      if (!existingPackage || desiredIds.size !== 2 || !setsEqual(desiredIds, currentIds)) {
        plan.operations.push(
          makeOperation(
            "revenueCat",
            60,
            "reconcile_package_products",
            `${offering.lookupKey}:${pkg.lookupKey}`,
            { ...pkg, offeringLookupKey: offering.lookupKey, position: position + 1 },
          ),
        );
      }
    }
  }

  if (!actual || plan.conflicts.some((item) => item.reason.includes("EXTRA_REVENUECAT"))) {
    plan.blockers.push("EXISTING_TEST_STORE_DISPOSITION_APPROVAL_REQUIRED");
  }
  return sealPlan(plan);
}

function buildProviderPlan(desiredState, provider, actual, options = {}) {
  if (provider === "apple") return buildApplePlan(desiredState, actual, options);
  if (provider === "google") return buildGooglePlan(desiredState, actual);
  if (provider === "revenueCat") return buildRevenueCatPlan(desiredState, actual);
  throw new Error(`Unknown provider: ${provider}`);
}

module.exports = {
  buildApplePlan,
  buildGooglePlan,
  buildRevenueCatPlan,
  buildProviderPlan,
  associationProductId,
};
