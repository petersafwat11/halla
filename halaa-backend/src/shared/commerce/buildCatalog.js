/**
 * Catalog builder (CAT-01) — the single derivation path.
 *
 * Combines the authoritative business data (`planDefaults.js` + `addons.js`,
 * which DEC-01/PRICE-OWNER freeze as canonical) with the store overlay
 * (`catalog.overlay.js`), computes the deterministic PROPOSED per-SKU
 * identifiers, validates every entry against `catalog.schema.js`, and enforces
 * global uniqueness + count invariants. Any incomplete, duplicated, or
 * contradictory entry throws — there is no silent fallback.
 *
 * Pure and DB-free: safe to run in CI without credentials or a database. Used
 * by the generator (`scripts/generateStoreCatalog.js`) and the contract tests
 * (`test/store-catalog.test.js`). The committed JSON manifest is the runtime
 * artifact; this builder is its single source.
 */

const { PLAN_DEFAULTS } = require("../constants/planDefaults");
const {
  EXTRA_INVITES_TIERS,
  DESIGN_TEMPLATE_TIERS,
  BUSINESS_CUSTOMIZATION,
} = require("../constants/addons");
const {
  catalogEntrySchema,
  PRODUCT_ID_PREFIX,
  RECURRING_ENTITLEMENT_ID,
} = require("./catalog.schema");
const {
  PLAN_OVERLAY,
  ADDON_OVERLAY,
  AUDIENCE_ELIGIBILITY,
  AVAILABLE_FOR_TO_AUDIENCE,
} = require("./catalog.overlay");

// Stable global output ordering (keeps the generated JSON byte-reproducible).
const PLAN_TYPE_RANK = {
  trial: 0,
  basic_event: 1,
  basic_monthly: 2,
  premium_event: 3,
  premium_monthly: 4,
  business_event: 5,
  business_quarterly: 6,
  business_annual: 7,
  unlimited: 8,
};
const ADDON_FAMILY_RANK = {
  extra_invites: 0,
  design_template: 1,
  business_customization: 2,
};

const productIdFor = (code, storeEligible) =>
  storeEligible ? PRODUCT_ID_PREFIX + code : null;

/** Expand an audience list into deduped role + account-type lists. */
const expandEligibility = (audiences) => {
  const roles = new Set();
  const accountTypes = new Set();
  for (const a of audiences) {
    const map = AUDIENCE_ELIGIBILITY[a];
    if (!map) throw new Error(`Unknown audience "${a}" in overlay`);
    map.roles.forEach((r) => roles.add(r));
    map.accountTypes.forEach((t) => accountTypes.add(t));
  }
  return { roles: [...roles], accountTypes: [...accountTypes] };
};

const parseTier = (code) => {
  const m = String(code).match(/_(\d+)$/);
  return m ? Number(m[1]) : null;
};

// ── plan entries (34) ──────────────────────────────────────────────────────
const buildPlanEntry = (code, def) => {
  const overlay = PLAN_OVERLAY[def.planType];
  if (!overlay) throw new Error(`No store overlay for planType "${def.planType}" (code ${code})`);

  const storeEligible = overlay.storeEligible;
  const kind = overlay.kind;
  const isSubscription = kind === "subscription";
  const isConsumable = kind === "event_consumable";

  const audience = AVAILABLE_FOR_TO_AUDIENCE[def.availableFor];
  if (!audience) throw new Error(`No audience mapping for availableFor "${def.availableFor}" (code ${code})`);
  const eligibleAudiences = [audience];
  const { roles, accountTypes } = expandEligibility(eligibleAudiences);

  let billingPeriod = "none";
  if (isSubscription) billingPeriod = overlay.billingPeriodOverride;
  else if (isConsumable) billingPeriod = "one_time";

  return {
    internalCode: code,
    catalogType: "plan",
    family: def.planFamily || "internal",
    planType: def.planType,
    kind,

    eligibleAudiences,
    eligibleRoles: roles,
    eligibleAccountTypes: accountTypes,

    tier: parseTier(code),
    sortOrder: def.sortOrder,

    billingPeriod,
    price: def.pricing?.oneTime ?? 0,
    currency: "SAR",

    nameAr: def.nameAr,
    nameEn: def.nameEn,
    descriptionAr: def.descriptionAr ?? null,
    descriptionEn: def.descriptionEn ?? null,

    storeEligible,
    appleProductType: !storeEligible
      ? "none"
      : isSubscription
        ? "auto_renewable_subscription"
        : "consumable",
    googleProductType: !storeEligible ? "none" : isSubscription ? "subs" : "inapp",
    googleConsumable: storeEligible && isConsumable,
    revenueCatType: !storeEligible ? "none" : isSubscription ? "subscription" : "consumable",

    iosProductId: productIdFor(code, storeEligible),
    androidProductId: productIdFor(code, storeEligible),
    androidBasePlanId: isSubscription ? overlay.androidBasePlanId : null,
    revenueCatPackageLookupKey: storeEligible ? code : null,
    revenueCatEntitlementId: isSubscription ? RECURRING_ENTITLEMENT_ID : null,
    revenueCatOfferingId: storeEligible ? overlay.revenueCatOfferingId : null,

    fulfillment: overlay.fulfillment,
    repurchasePolicy: overlay.repurchasePolicy,
    restoreBehavior: overlay.restoreBehavior,
    refundPolicy: overlay.refundPolicy,
    providerRefundReconcile: overlay.providerRefundReconcile,

    isTrial: !!overlay.isTrial,
    isUnlimited: !!overlay.isUnlimited,
    isProviderExcluded: !storeEligible,
    providerExclusionReason: storeEligible ? null : overlay.providerExclusionReason || null,
    hasManagedAcquisitionPath: !!overlay.hasManagedAcquisitionPath,
    setupFeeWaivedInStore: !!overlay.setupFeeWaivedInStore,

    currentPlanIdentityKey: code,
  };
};

// ── add-on entries (22) ──────────────────────────────────────────────────────
const buildAddonEntry = ({ code, family, tier, sortOrder, price, nameAr, nameEn, descriptionAr, descriptionEn }) => {
  const overlay = ADDON_OVERLAY[family];
  if (!overlay) throw new Error(`No store overlay for add-on family "${family}" (code ${code})`);
  const { roles, accountTypes } = expandEligibility(overlay.eligibleAudiences);

  return {
    internalCode: code,
    catalogType: "addon",
    family,
    planType: null,
    kind: "addon_consumable",

    eligibleAudiences: overlay.eligibleAudiences,
    eligibleRoles: roles,
    eligibleAccountTypes: accountTypes,

    tier: tier ?? null,
    sortOrder,

    billingPeriod: "one_time",
    price,
    currency: "SAR",

    nameAr,
    nameEn,
    descriptionAr: descriptionAr ?? null,
    descriptionEn: descriptionEn ?? null,

    storeEligible: true,
    appleProductType: "consumable",
    googleProductType: "inapp",
    googleConsumable: true,
    revenueCatType: "consumable",

    iosProductId: productIdFor(code, true),
    androidProductId: productIdFor(code, true),
    androidBasePlanId: null,
    revenueCatPackageLookupKey: code,
    revenueCatEntitlementId: null, // add-ons NEVER carry the recurring entitlement (P0-09)
    revenueCatOfferingId: overlay.revenueCatOfferingId,

    fulfillment: overlay.fulfillment,
    repurchasePolicy: overlay.repurchasePolicy,
    restoreBehavior: overlay.restoreBehavior,
    refundPolicy: overlay.refundPolicy,
    providerRefundReconcile: overlay.providerRefundReconcile,

    isTrial: false,
    isUnlimited: false,
    isProviderExcluded: false,
    providerExclusionReason: null,
    hasManagedAcquisitionPath: !!overlay.hasManagedAcquisitionPath,
    setupFeeWaivedInStore: false,

    currentPlanIdentityKey: code,
  };
};

const buildAddonEntries = () => {
  const entries = [];

  // Extra invites — 16 tiers. No AR/EN names in source → synthesize
  // deterministic names so the metadata contract holds (advisor note #2).
  for (const { quantity, price } of EXTRA_INVITES_TIERS) {
    entries.push(
      buildAddonEntry({
        code: `extra_invites_${quantity}`,
        family: "extra_invites",
        tier: quantity,
        sortOrder: quantity,
        price,
        nameAr: `${quantity} دعوة إضافية`,
        nameEn: `${quantity} Extra Invites`,
        descriptionAr: `إضافة ${quantity} دعوة إلى رصيدك`,
        descriptionEn: `Add ${quantity} invitations to your balance`,
      })
    );
  }

  // Design templates — 5 types (names exist in source).
  DESIGN_TEMPLATE_TIERS.forEach((t, idx) => {
    entries.push(
      buildAddonEntry({
        code: `design_template_${t.type}`,
        family: "design_template",
        tier: null,
        sortOrder: idx,
        price: t.price,
        nameAr: t.nameAr,
        nameEn: t.nameEn,
        descriptionAr: null,
        descriptionEn: null,
      })
    );
  });

  // Business customization — 1.
  entries.push(
    buildAddonEntry({
      code: "business_customization",
      family: "business_customization",
      tier: null,
      sortOrder: 0,
      price: BUSINESS_CUSTOMIZATION.price,
      nameAr: BUSINESS_CUSTOMIZATION.nameAr,
      nameEn: BUSINESS_CUSTOMIZATION.nameEn,
      descriptionAr: BUSINESS_CUSTOMIZATION.descriptionAr ?? null,
      descriptionEn: BUSINESS_CUSTOMIZATION.descriptionEn ?? null,
    })
  );

  return entries;
};

// ── stable ordering ─────────────────────────────────────────────────────────
const rankOf = (e) => {
  if (e.catalogType === "plan") {
    return [0, PLAN_TYPE_RANK[e.planType] ?? 99, e.sortOrder, e.internalCode];
  }
  return [1, ADDON_FAMILY_RANK[e.family] ?? 99, e.sortOrder, e.internalCode];
};
const compareEntries = (a, b) => {
  const ra = rankOf(a);
  const rb = rankOf(b);
  for (let i = 0; i < ra.length; i += 1) {
    if (ra[i] < rb[i]) return -1;
    if (ra[i] > rb[i]) return 1;
  }
  return 0;
};

// ── validation + invariants ──────────────────────────────────────────────────
const assertUnique = (label, values) => {
  const seen = new Set();
  const dupes = new Set();
  for (const v of values) {
    if (v === null || v === undefined) continue;
    if (seen.has(v)) dupes.add(v);
    seen.add(v);
  }
  if (dupes.size) {
    throw new Error(`Catalog invariant failed: duplicate ${label}: ${[...dupes].join(", ")}`);
  }
};

/**
 * Build, validate, and return the canonical catalog (sorted, frozen).
 * @returns {ReadonlyArray<object>}
 */
function buildCatalog() {
  const raw = [
    ...Object.entries(PLAN_DEFAULTS).map(([code, def]) => buildPlanEntry(code, def)),
    ...buildAddonEntries(),
  ].sort(compareEntries);

  // Per-entry schema validation (rejects incomplete/contradictory).
  const errors = [];
  const entries = raw.map((entry) => {
    const parsed = catalogEntrySchema.safeParse(entry);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        errors.push(`  [${entry.internalCode}] ${issue.path.join(".")}: ${issue.message}`);
      }
      return entry;
    }
    return parsed.data;
  });
  if (errors.length) {
    throw new Error(`Catalog schema validation failed (${errors.length} issue(s)):\n${errors.join("\n")}`);
  }

  // Global uniqueness (rejects duplicates).
  assertUnique("internalCode", entries.map((e) => e.internalCode));
  assertUnique("iosProductId", entries.map((e) => e.iosProductId));
  assertUnique(
    "androidProductId+basePlanId",
    entries
      .filter((e) => e.androidProductId)
      .map((e) => `${e.androidProductId}::${e.androidBasePlanId ?? ""}`)
  );
  assertUnique("revenueCatPackageLookupKey", entries.map((e) => e.revenueCatPackageLookupKey));

  return Object.freeze(entries.map((e) => Object.freeze(e)));
}

/** Count summary used by the generator + contract tests. */
function catalogCounts(entries = buildCatalog()) {
  const plans = entries.filter((e) => e.catalogType === "plan");
  const addons = entries.filter((e) => e.catalogType === "addon");
  const storePlans = plans.filter((e) => e.storeEligible);
  const storeAddons = addons.filter((e) => e.storeEligible);
  const perFamily = {};
  for (const p of plans) perFamily[p.planType] = (perFamily[p.planType] || 0) + 1;
  return {
    dbPlans: plans.length,
    storeEligiblePlans: storePlans.length,
    addons: addons.length,
    storeEligibleAddons: storeAddons.length,
    proposedProductsPerPlatform: storePlans.length + storeAddons.length,
    perPlanType: perFamily,
    subscriptions: entries.filter((e) => e.kind === "subscription").length,
    eventConsumables: entries.filter((e) => e.kind === "event_consumable").length,
    addonConsumables: entries.filter((e) => e.kind === "addon_consumable").length,
    nonStore: entries.filter((e) => !e.storeEligible).length,
  };
}

module.exports = {
  buildCatalog,
  catalogCounts,
  PLAN_TYPE_RANK,
  ADDON_FAMILY_RANK,
};
