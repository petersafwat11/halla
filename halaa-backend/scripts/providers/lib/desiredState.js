const path = require("node:path");
const { loadCatalog, WORKSPACE_ROOT } = require("./catalog");

const OUTPUT_ROOT = path.join(
  WORKSPACE_ROOT,
  "docs",
  "evidence",
  "store-readiness",
  "provider-payloads",
);

const OFFERING_IDS = ["host_plans", "business_plans", "host_addons", "business_addons"];

function durationIso(entry) {
  const durations = { monthly: "P1M", quarterly: "P3M", annual: "P1Y" };
  return durations[entry.billingPeriod] || null;
}

function generatedLocalization(entry) {
  const inviteMatch = entry.internalCode.match(/^(basic|premium|business)_(event|monthly)_(\d+)$/);
  if (inviteMatch) {
    const [, tier, cadence, inviteCount] = inviteMatch;
    const tierEn = `${tier[0].toUpperCase()}${tier.slice(1)}`;
    const tierAr = { basic: "بيسك", premium: "بريميوم", business: "أعمال" }[tier];
    if (cadence === "monthly") {
      return {
        nameEn: `Halaa ${tierEn} ${inviteCount} Monthly`,
        descriptionEn: `Monthly ${tierEn} plan: ${inviteCount} invitations`,
        nameAr: `هلا ${tierAr} ${inviteCount} — شهري`,
        descriptionAr: `اشتراك ${tierAr} شهري يشمل ${inviteCount} دعوة`,
      };
    }
    return {
      nameEn: `Halaa ${tierEn} ${inviteCount} Invites`,
      descriptionEn: `One-time ${tierEn} package: ${inviteCount} invitations`,
      nameAr: `هلا ${tierAr} ${inviteCount} دعوة`,
      descriptionAr: `باقة ${tierAr} لمرة واحدة تشمل ${inviteCount} دعوة`,
    };
  }

  const exact = {
    business_quarterly: {
      nameEn: "Halaa Business 3 Months",
      descriptionEn: "Business subscription billed every 3 months",
      nameAr: "هلا أعمال — 3 أشهر",
      descriptionAr: "اشتراك أعمال لمدة 3 أشهر",
    },
    design_template_ready_made: {
      nameEn: "Ready-made Invitation Design",
      descriptionEn: "Ready-made design for men or women",
      nameAr: "تصميم دعوة جاهزة",
      descriptionAr: "تصميم جاهز لدعوات الرجال أو النساء",
    },
    design_template_custom_male: {
      nameEn: "Custom Men's Invitation",
      descriptionEn: "Custom invitation design for men",
      nameAr: "تصميم دعوة رجالية مخصصة",
      descriptionAr: "تصميم مخصص لدعوات الرجال",
    },
    design_template_custom_themed: {
      nameEn: "Custom Themed Invitation",
      descriptionEn: "Custom invitation matching your event theme",
      nameAr: "تصميم دعوة حسب الثيم",
      descriptionAr: "تصميم دعوة مخصص حسب ثيم المناسبة",
    },
    design_template_animated: {
      nameEn: "Animated Invitation Design",
      descriptionEn: "Invitation design with animated backgrounds",
      nameAr: "تصميم دعوة متحركة",
      descriptionAr: "تصميم دعوة بخلفيات متحركة",
    },
    design_template_3d: {
      nameEn: "3D Invitation Design",
      descriptionEn: "Custom three-dimensional invitation design",
      nameAr: "تصميم دعوة ثلاثية الأبعاد",
      descriptionAr: "تصميم دعوة مخصص ثلاثي الأبعاد",
    },
    business_customization: {
      nameEn: "Business Brand Customization",
      descriptionEn: "Custom page and four WhatsApp templates",
      nameAr: "تخصيص هوية العلامة",
      descriptionAr: "صفحة مخصصة وأربعة قوالب واتساب",
    },
  };
  if (exact[entry.internalCode]) return exact[entry.internalCode];

  return {
    nameEn: entry.nameEn,
    descriptionEn:
      entry.descriptionEn ||
      (entry.kind === "subscription" ? "Recurring Halaa subscription" : "One-time Halaa purchase"),
    nameAr: entry.nameAr,
    descriptionAr: entry.descriptionAr || entry.nameAr,
  };
}

function localizations(entry) {
  const generated = generatedLocalization(entry);
  const values = [
    {
      locale: "ar-SA",
      name: generated.nameAr,
      description: generated.descriptionAr,
      descriptionSource: entry.descriptionAr === generated.descriptionAr ? "catalog" : "generated_fallback",
    },
    {
      locale: "en-US",
      name: generated.nameEn,
      description: generated.descriptionEn,
      descriptionSource: entry.descriptionEn === generated.descriptionEn ? "catalog" : "generated_fallback",
    },
  ];
  for (const value of values) {
    if (value.name.length > 30 || value.description.length > 45) {
      throw new Error(
        `${entry.internalCode}:${value.locale} exceeds Apple localization limits ` +
          `(name ${value.name.length}/30, description ${value.description.length}/45)`,
      );
    }
  }
  return values;
}

function proposedSubscriptionLevel(entry) {
  if (entry.internalCode === "business_quarterly") return 1;
  const match = entry.internalCode.match(/^(premium|basic)_monthly_(25|50|75|100|150|200)$/);
  if (!match) return null;
  const [, tier, capacity] = match;
  const capacityRank = { 200: 0, 150: 1, 100: 2, 75: 3, 50: 4, 25: 5 }[capacity];
  return (tier === "premium" ? 2 : 8) + capacityRank;
}

function googleStoreIdentifier(entry) {
  return entry.androidBasePlanId
    ? `${entry.androidProductId}:${entry.androidBasePlanId}`
    : entry.androidProductId;
}

function approvalTemplate(entries, catalogHash) {
  return {
    schemaVersion: 1,
    catalogHash,
    generatedLocalizationDescriptionsApproved: false,
    apple: {
      pricePointIds: Object.fromEntries(entries.map((entry) => [entry.iosProductId, null])),
      subscriptionLevels: Object.fromEntries(
        entries
          .filter((entry) => entry.kind === "subscription")
          .map((entry) => [entry.iosProductId, null]),
      ),
    },
    revenueCat: {
      existingTestStoreDisposition: null,
    },
  };
}

function validateApprovals(approvals, catalogHash) {
  if (!approvals) return;
  if (approvals.schemaVersion !== 1) throw new Error("approval overlay schemaVersion must be 1");
  if (approvals.catalogHash !== catalogHash) {
    throw new Error("approval overlay catalogHash does not match the frozen catalog");
  }
}

function buildDesiredState(options = {}) {
  const { catalog, entries, manifestSha256 } = loadCatalog();
  const approvals = options.approvals || null;
  validateApprovals(approvals, catalog.catalogHash);
  const appBundleId = options.appBundleId || "com.halaa.app";
  const revenueCatProjectId = options.revenueCatProjectId || "projc49d20a4";

  const appleProducts = entries.map((entry) => ({
    code: entry.internalCode,
    productId: entry.iosProductId,
    type: entry.kind === "subscription" ? "AUTO_RENEWABLE_SUBSCRIPTION" : "CONSUMABLE",
    referenceName: entry.nameEn,
    duration: durationIso(entry),
    subscriptionGroupReferenceName: entry.kind === "subscription" ? "halaa_recurring" : null,
    subscriptionLevel: approvals?.apple?.subscriptionLevels?.[entry.iosProductId] ?? null,
    localizations: localizations(entry),
    availability: ["SAU"],
    targetPrice: { currency: "SAR", amount: entry.price },
    applePricePointId: approvals?.apple?.pricePointIds?.[entry.iosProductId] ?? null,
    entitlement: entry.revenueCatEntitlementId,
  }));

  const googleProducts = entries.map((entry) => ({
    code: entry.internalCode,
    productId: entry.androidProductId,
    type: entry.kind === "subscription" ? "SUBSCRIPTION" : "ONE_TIME_PRODUCT",
    basePlanId: entry.androidBasePlanId,
    duration: durationIso(entry),
    storeIdentifier: googleStoreIdentifier(entry),
    localizations: localizations(entry),
    regionalAvailability: [{ regionCode: "SA", newSubscriberAvailability: true }],
    targetPrice: { currencyCode: "SAR", units: String(entry.price), nanos: 0 },
    otherRegionsAvailability: false,
    consumeAfterVerifiedGrant: entry.googleConsumable,
    desiredState: "DRAFT_UNTIL_REVENUECAT_VALIDATED",
    entitlement: entry.revenueCatEntitlementId,
  }));

  const revenueCatProducts = entries.flatMap((entry) => [
    {
      connectionKey: `ios:${entry.internalCode}`,
      platform: "ios",
      appId: null,
      storeIdentifier: entry.iosProductId,
      displayName: entry.nameEn,
      type: entry.kind === "subscription" ? "subscription" : "consumable",
      duration: durationIso(entry),
      consumable: entry.kind !== "subscription",
      entitlement: entry.revenueCatEntitlementId,
    },
    {
      connectionKey: `android:${entry.internalCode}`,
      platform: "android",
      appId: null,
      storeIdentifier: googleStoreIdentifier(entry),
      displayName: entry.nameEn,
      type: entry.kind === "subscription" ? "subscription" : "consumable",
      duration: durationIso(entry),
      consumable: entry.kind !== "subscription",
      entitlement: entry.revenueCatEntitlementId,
    },
  ]);

  const offerings = OFFERING_IDS.map((offeringId) => ({
    lookupKey: offeringId,
    displayName: offeringId,
    packages: entries
      .filter((entry) => entry.revenueCatOfferingId === offeringId)
      .map((entry) => ({
        lookupKey: entry.internalCode,
        iosConnectionKey: `ios:${entry.internalCode}`,
        androidConnectionKey: `android:${entry.internalCode}`,
      })),
  }));

  const fallbackDescriptions = entries.flatMap((entry) =>
    localizations(entry)
      .filter((item) => item.descriptionSource === "generated_fallback")
      .map((item) => `${entry.internalCode}:${item.locale}`),
  );

  const unresolvedApplePricePoints = appleProducts.filter((item) => !item.applePricePointId).length;
  const unresolvedAppleSubscriptionLevels = appleProducts.filter(
    (item) => item.type === "AUTO_RENEWABLE_SUBSCRIPTION" && !Number.isInteger(item.subscriptionLevel),
  ).length;
  const generatedDescriptionsApproved = approvals?.generatedLocalizationDescriptionsApproved === true;

  return {
    schemaVersion: 1,
    source: {
      catalogVersion: catalog.catalogVersion,
      catalogHash: catalog.catalogHash,
      manifestSha256,
    },
    invariants: {
      productsPerPlatform: 53,
      subscriptionsPerPlatform: 13,
      consumablesPerPlatform: 40,
      revenueCatProductConnections: 106,
      revenueCatEntitlements: 1,
      revenueCatOfferings: 4,
      revenueCatPackages: 53,
    },
    unresolvedApprovals: {
      applePricePoints: unresolvedApplePricePoints,
      appleSubscriptionLevels: unresolvedAppleSubscriptionLevels,
      generatedLocalizationDescriptions: generatedDescriptionsApproved ? [] : fallbackDescriptions,
      revenueCatExistingDefaultTestOfferingDisposition:
        approvals?.revenueCat?.existingTestStoreDisposition || "OWNER_APPROVAL_REQUIRED",
    },
    apple: {
      appBundleId,
      appStoreConnectAppId: options.appleAppId || null,
      subscriptionGroups: [{ referenceName: "halaa_recurring", subscriptions: 13 }],
      products: appleProducts,
    },
    google: {
      packageName: appBundleId,
      regionsVersion: options.googleRegionsVersion || null,
      products: googleProducts,
    },
    revenueCat: {
      projectId: revenueCatProjectId,
      requiredTransferBehavior: "KEEP_WITH_ORIGINAL_APP_USER_ID",
      products: revenueCatProducts,
      entitlements: [
        {
          lookupKey: catalog.recurringEntitlementId,
          displayName: "Recurring access",
          productConnectionKeys: revenueCatProducts
            .filter((product) => product.entitlement === catalog.recurringEntitlementId)
            .map((product) => product.connectionKey),
        },
      ],
      offerings,
    },
    approvalTemplate: approvalTemplate(entries, catalog.catalogHash),
    approvalReview: {
      schemaVersion: 1,
      status: "AWAITING_EXPLICIT_OWNER_APPROVAL",
      externalWrites: 0,
      localizationLimits: { nameCharacters: 30, descriptionCharacters: 45 },
      applePriceSelection: {
        baseTerritory: "SAU",
        currency: "SAR",
        exactPricePointIdsStatus: "RESOLVE_AFTER_APPROVED_PRODUCT_SHELL_CREATION",
      },
      subscriptionLevelSemantics: "1 is the highest service level; larger numbers are lower levels",
      subscriptionGroupRisk:
        "All 14 subscriptions share one group; sandbox testing must confirm personal and business eligibility separation.",
      products: appleProducts.map((product) => ({
        code: product.code,
        productId: product.productId,
        type: product.type,
        duration: product.duration,
        targetPriceSar: product.targetPrice.amount,
        proposedSubscriptionLevel:
          product.type === "AUTO_RENEWABLE_SUBSCRIPTION"
            ? proposedSubscriptionLevel(entries.find((entry) => entry.internalCode === product.code))
            : null,
        localizations: product.localizations,
      })),
    },
  };
}

module.exports = {
  OUTPUT_ROOT,
  OFFERING_IDS,
  approvalTemplate,
  buildDesiredState,
  googleStoreIdentifier,
  localizations,
  proposedSubscriptionLevel,
  validateApprovals,
};
