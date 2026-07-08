/**
 * Canonical store-catalog schema (CAT-01).
 *
 * ONE validated schema for every sellable/non-sellable commercial product
 * (plans + add-ons). The builder (`buildCatalog.js`) derives each entry from
 * the authoritative business data (`planDefaults.js` + `addons.js`) plus the
 * store overlay (`catalog.overlay.js`), then validates it here. Incomplete,
 * duplicated, or contradictory entries are REJECTED at build time — there is
 * no silent fallback.
 *
 * Authority: `docs/store-readiness-DECISION-RECORD.md` (signed 2026-07-01).
 * All external identifiers produced from this schema are PROPOSED manifest
 * values only — no immutable Apple/Google/RevenueCat products are created.
 *
 * CommonJS + zod (backend is CJS and already depends on zod; it does NOT
 * import the ESM `@halla/shared` workspace — see the module README).
 */

const { z } = require("zod");

// The single recurring-access entitlement id (billing plan §2.5 /
// REVENUECAT_RECURRING_ENTITLEMENT_ID). PROPOSED. Consumables/add-ons must
// NEVER carry this id (P0-09: a consumable attached to an entitlement unlocks
// it forever).
const RECURRING_ENTITLEMENT_ID = "recurring_access";

// Deterministic store product-id prefix. ios id === android id so a single
// product→code map covers both stores (SKU-matrix convention). PROPOSED.
const PRODUCT_ID_PREFIX = "com.halla.";

const CATALOG_TYPES = ["plan", "addon"];
const KINDS = ["subscription", "event_consumable", "addon_consumable", "internal"];
const BILLING_PERIODS = ["one_time", "monthly", "quarterly", "annual", "none"];
const APPLE_PRODUCT_TYPES = [
  "auto_renewable_subscription",
  "consumable",
  "non_consumable",
  "none",
];
const GOOGLE_PRODUCT_TYPES = ["subs", "inapp", "none"];
const REVENUECAT_TYPES = ["subscription", "consumable", "none"];
const OFFERINGS = ["host_plans", "business_plans", "host_addons", "business_addons"];
const FULFILLMENTS = ["automatic", "managed_service_admin", "auto_granted", "admin_only"];
const REPURCHASE_POLICIES = ["repeatable", "single_active_subscription", "not_applicable"];
const RESTORE_BEHAVIORS = ["store_restore", "backend_ledger", "none"];
const REFUND_POLICIES = [
  "standard_store", // subscriptions — store-driven, backend reconciles
  "unused_only", // event package — refund before first-send only
  "clawback_unused", // extra invites — remove unused delta only (ADD-02)
  "non_refundable_from_creation", // design templates — SIGNED DEC-03L
  "managed_service_legal_review", // business customization — before/after work is legal (NOT signed non-refundable)
  "not_applicable", // trial / unlimited
];
const AUDIENCES = ["personal_host", "business_host", "platform_internal"];
const ROLES = ["host", "admin", "super_admin"];
const ACCOUNT_TYPES = ["personal", "business", "platform"];

const nonEmpty = z.string().trim().min(1);

const catalogEntrySchema = z
  .object({
    // ── identity ────────────────────────────────────────────────────────
    internalCode: nonEmpty.regex(
      /^[a-z][a-z0-9_]*$/,
      "internalCode must be lowercase snake_case starting with a letter"
    ),
    catalogType: z.enum(CATALOG_TYPES),
    family: nonEmpty, // basic | premium | business | extra_invites | design_template | business_customization | internal
    planType: z.string().nullable(), // plan planType, else null
    kind: z.enum(KINDS),

    // ── audience / eligibility ──────────────────────────────────────────
    eligibleAudiences: z.array(z.enum(AUDIENCES)).min(1),
    eligibleRoles: z.array(z.enum(ROLES)).min(1),
    eligibleAccountTypes: z.array(z.enum(ACCOUNT_TYPES)).min(1),

    // ── ordering ────────────────────────────────────────────────────────
    tier: z.number().int().nullable(), // invite tier (plans) / quantity (extra invites) / null
    sortOrder: z.number().int(),

    // ── commercial ──────────────────────────────────────────────────────
    billingPeriod: z.enum(BILLING_PERIODS),
    price: z.number().nonnegative(),
    currency: z.literal("SAR"),

    // ── metadata (AR/EN) ────────────────────────────────────────────────
    nameAr: nonEmpty,
    nameEn: nonEmpty,
    descriptionAr: z.string().nullable(), // optional — most tiers use featureBullets, not descriptions
    descriptionEn: z.string().nullable(),

    // ── store eligibility & provider typing ─────────────────────────────
    storeEligible: z.boolean(),
    appleProductType: z.enum(APPLE_PRODUCT_TYPES),
    googleProductType: z.enum(GOOGLE_PRODUCT_TYPES),
    googleConsumable: z.boolean(), // true for one-time consumables; false for subs / non-store
    revenueCatType: z.enum(REVENUECAT_TYPES),

    // ── PROPOSED external identifiers (not yet created) ──────────────────
    iosProductId: z.string().nullable(),
    androidProductId: z.string().nullable(),
    androidBasePlanId: z.string().nullable(), // subscriptions only
    revenueCatPackageLookupKey: z.string().nullable(),
    revenueCatEntitlementId: z.string().nullable(),
    revenueCatOfferingId: z.enum(OFFERINGS).nullable(),

    // ── behavior ────────────────────────────────────────────────────────
    fulfillment: z.enum(FULFILLMENTS),
    repurchasePolicy: z.enum(REPURCHASE_POLICIES),
    restoreBehavior: z.enum(RESTORE_BEHAVIORS),
    refundPolicy: z.enum(REFUND_POLICIES),
    providerRefundReconcile: z.boolean(), // store CAN force a refund even when Halaa policy = non-refundable

    // ── flags ───────────────────────────────────────────────────────────
    isTrial: z.boolean(),
    isUnlimited: z.boolean(),
    isProviderExcluded: z.boolean(), // excluded from ALL store providers (trial/unlimited)
    providerExclusionReason: z.string().nullable(),
    hasManagedAcquisitionPath: z.boolean(), // also acquirable via web/admin managed/negotiated flow (same code, no duplicate SKU)
    setupFeeWaivedInStore: z.boolean(),

    // ── current-plan identity ────────────────────────────────────────────
    // Current-plan matching MUST use this exact key, never planType alone
    // (DEC-02). It always equals internalCode.
    currentPlanIdentityKey: nonEmpty,
  })
  .strict()
  .superRefine((e, ctx) => {
    const fail = (path, message) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });

    if (e.currentPlanIdentityKey !== e.internalCode) {
      fail("currentPlanIdentityKey", "must equal internalCode");
    }

    // Non-store (trial / unlimited): no provider identifiers at all.
    if (!e.storeEligible) {
      if (e.kind !== "internal") fail("kind", "non-store entry must be kind=internal");
      if (e.iosProductId !== null) fail("iosProductId", "must be null when not store-eligible");
      if (e.androidProductId !== null) fail("androidProductId", "must be null when not store-eligible");
      if (e.androidBasePlanId !== null) fail("androidBasePlanId", "must be null when not store-eligible");
      if (e.revenueCatPackageLookupKey !== null) fail("revenueCatPackageLookupKey", "must be null when not store-eligible");
      if (e.revenueCatEntitlementId !== null) fail("revenueCatEntitlementId", "must be null when not store-eligible");
      if (e.revenueCatOfferingId !== null) fail("revenueCatOfferingId", "must be null when not store-eligible");
      if (e.appleProductType !== "none") fail("appleProductType", "must be none when not store-eligible");
      if (e.googleProductType !== "none") fail("googleProductType", "must be none when not store-eligible");
      if (e.revenueCatType !== "none") fail("revenueCatType", "must be none when not store-eligible");
      if (!e.isProviderExcluded) fail("isProviderExcluded", "non-store entry must be provider-excluded");
      if (!e.providerExclusionReason) fail("providerExclusionReason", "provider-excluded entry needs a reason");
      return;
    }

    // Store-eligible: deterministic proposed identifiers.
    const expectedId = PRODUCT_ID_PREFIX + e.internalCode;
    if (e.iosProductId !== expectedId) fail("iosProductId", `must equal ${expectedId}`);
    if (e.androidProductId !== expectedId) fail("androidProductId", `must equal ${expectedId}`);
    if (e.revenueCatPackageLookupKey !== e.internalCode) {
      fail("revenueCatPackageLookupKey", "must equal internalCode");
    }
    if (e.isProviderExcluded) fail("isProviderExcluded", "store-eligible entry cannot be provider-excluded");
    if (e.revenueCatOfferingId === null) fail("revenueCatOfferingId", "store-eligible entry needs an offering");

    if (e.kind === "subscription") {
      if (!["monthly", "quarterly", "annual"].includes(e.billingPeriod)) {
        fail("billingPeriod", "subscription must be monthly/quarterly/annual");
      }
      if (e.appleProductType !== "auto_renewable_subscription") fail("appleProductType", "subscription must be auto_renewable_subscription");
      if (e.googleProductType !== "subs") fail("googleProductType", "subscription must be subs");
      if (e.googleConsumable) fail("googleConsumable", "subscription is not consumable");
      if (!e.androidBasePlanId) fail("androidBasePlanId", "subscription needs an android base-plan id");
      if (e.revenueCatType !== "subscription") fail("revenueCatType", "subscription revenueCatType mismatch");
      if (e.revenueCatEntitlementId !== RECURRING_ENTITLEMENT_ID) {
        fail("revenueCatEntitlementId", `subscription must carry ${RECURRING_ENTITLEMENT_ID}`);
      }
      if (e.restoreBehavior !== "store_restore") fail("restoreBehavior", "subscription restores via store");
      if (e.repurchasePolicy !== "single_active_subscription") fail("repurchasePolicy", "subscription is single-active by design");
    } else if (e.kind === "event_consumable" || e.kind === "addon_consumable") {
      if (e.billingPeriod !== "one_time") fail("billingPeriod", "consumable must be one_time");
      if (e.appleProductType !== "consumable") fail("appleProductType", "consumable must be consumable");
      if (e.googleProductType !== "inapp") fail("googleProductType", "consumable must be inapp");
      if (!e.googleConsumable) fail("googleConsumable", "consumable must be googleConsumable");
      if (e.androidBasePlanId !== null) fail("androidBasePlanId", "consumable has no base-plan id");
      if (e.revenueCatType !== "consumable") fail("revenueCatType", "consumable revenueCatType mismatch");
      // CRITICAL (P0-09 / billing §0.3): a consumable/add-on must NEVER carry
      // the recurring-access entitlement, or it unlocks recurring access forever.
      if (e.revenueCatEntitlementId !== null) {
        fail("revenueCatEntitlementId", "consumable/add-on must NOT carry any entitlement id");
      }
    } else if (e.kind === "internal") {
      fail("kind", "internal entry cannot be store-eligible");
    }
  });

module.exports = {
  catalogEntrySchema,
  RECURRING_ENTITLEMENT_ID,
  PRODUCT_ID_PREFIX,
  // enums exported so tests and the generator can assert against them
  CATALOG_TYPES,
  KINDS,
  BILLING_PERIODS,
  APPLE_PRODUCT_TYPES,
  GOOGLE_PRODUCT_TYPES,
  REVENUECAT_TYPES,
  OFFERINGS,
  FULFILLMENTS,
  REPURCHASE_POLICIES,
  RESTORE_BEHAVIORS,
  REFUND_POLICIES,
  AUDIENCES,
  ROLES,
  ACCOUNT_TYPES,
};
