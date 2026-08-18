/**
 * Store overlay (CAT-01) — the small, hand-authored layer of store-specific
 * attributes that do NOT exist in the business data (`planDefaults.js` /
 * `addons.js`). Keyed by `planType` (plans) and add-on family (add-ons), so it
 * stays compact: one entry per family, not per SKU. `buildCatalog.js` merges
 * this with the price/name/tier business data and computes the deterministic
 * per-SKU identifiers.
 *
 * Every value here traces to a SIGNED owner decision
 * (`docs/store-readiness-DECISION-RECORD.md`, 2026-07-01) — see the citation on
 * each block. External identifiers derived from these are PROPOSED only.
 *
 * DEC-01  keep six-tier / 34 plans (current catalog is canonical).
 * DEC-02  business first self-serve on web+mobile; compare by EXACT code.
 * DEC-03  extra invites + business customization unchanged (managed service).
 * DEC-03L design templates = single-use managed service, NON-refundable from
 *         creation, no restore obligation.
 * DEC-04  "Keep with original App User ID" (restore semantics; entitlements
 *         stay with the original Halaa user).
 * PRICE-OWNER current prices final; Saudi storefront; stores collect 15% VAT.
 */

const { RECURRING_ENTITLEMENT_ID } = require("./catalog.schema");

// ── audience → role/account-type expansion (derived, single source) ────────
const AUDIENCE_ELIGIBILITY = {
  personal_host: { roles: ["host"], accountTypes: ["personal"] },
  business_host: { roles: ["host"], accountTypes: ["business"] },
  platform_internal: { roles: ["admin", "super_admin"], accountTypes: ["platform"] },
};

// Map the DB `availableFor` value to a catalog audience.
const AVAILABLE_FOR_TO_AUDIENCE = {
  host: "personal_host",
  business: "business_host",
  platform_admin: "platform_internal",
};

// ── PLAN overlay, keyed by planType ────────────────────────────────────────
const PLAN_OVERLAY = {
  // trial — free, auto-granted; NOT a store product (DEC-01 / SKU-matrix).
  trial: {
    kind: "internal",
    storeEligible: false,
    isTrial: true,
    fulfillment: "auto_granted",
    repurchasePolicy: "not_applicable",
    restoreBehavior: "none",
    refundPolicy: "not_applicable",
    providerRefundReconcile: false,
    providerExclusionReason: "free_auto_granted",
    hasManagedAcquisitionPath: false,
    setupFeeWaivedInStore: false,
  },
  // unlimited — admin/internal plan; NOT a store product.
  unlimited: {
    kind: "internal",
    storeEligible: false,
    isUnlimited: true,
    fulfillment: "admin_only",
    repurchasePolicy: "not_applicable",
    restoreBehavior: "none",
    refundPolicy: "not_applicable",
    providerRefundReconcile: false,
    providerExclusionReason: "admin_internal",
    hasManagedAcquisitionPath: false,
    setupFeeWaivedInStore: false,
  },

  // Personal-host event packages (one-time consumables).
  basic_event: eventConsumable("host_plans"),
  premium_event: eventConsumable("host_plans"),

  // Personal-host recurring subscriptions (monthly).
  basic_monthly: subscription("host_plans", "monthly"),
  premium_monthly: subscription("host_plans", "monthly"),

  // Business event package — self-serve simplified tier; the 1,200 SAR setup
  // fee is waived in-app (D8); the same code is ALSO acquirable via the
  // web/admin managed/negotiated flow — that is an acquisition path, NOT a
  // separate SKU (Task 3: do not duplicate).
  business_event: {
    ...eventConsumable("business_plans"),
    hasManagedAcquisitionPath: true,
    setupFeeWaivedInStore: true,
  },

  // Business recurring subscriptions. The simplified self-serve tier is sold
  // natively; the negotiated/managed contract (quote/tax/setup) stays
  // web/admin-only — same code, no duplicate product.
  business_quarterly: { ...subscription("business_plans", "quarterly"), hasManagedAcquisitionPath: true },

  // business_annual — REMOVED from all stores by owner directive (2026-08-16):
  // the Apple shell was deleted in App Store Connect and the product is not to
  // be created on Google Play or RevenueCat. The plan remains in the backend
  // catalog for the web/admin managed/negotiated acquisition path only, exactly
  // like trial/unlimited it now creates ZERO store products.
  business_annual: {
    kind: "internal",
    storeEligible: false,
    isTrial: false,
    isUnlimited: false,
    fulfillment: "admin_only",
    repurchasePolicy: "not_applicable",
    restoreBehavior: "none",
    refundPolicy: "not_applicable",
    providerRefundReconcile: false,
    providerExclusionReason: "owner_directive_2026_08_16_store_removed_managed_acquisition_only",
    hasManagedAcquisitionPath: true,
    setupFeeWaivedInStore: false,
  },
};

// ── ADD-ON overlay, keyed by add-on family ─────────────────────────────────
const ADDON_OVERLAY = {
  // Extra invites — repeatable consumable top-ups (DEC-03, unchanged). Host
  // add-on that is ALSO surfaced to business accounts (SKU-matrix). Refund =
  // clawback unused delta only (billing §4.3; built in ADD-02, not this session).
  extra_invites: {
    family: "extra_invites",
    kind: "addon_consumable",
    storeEligible: true,
    eligibleAudiences: ["personal_host", "business_host"],
    revenueCatOfferingId: "host_addons",
    crossSurfacedOffering: "business_addons",
    fulfillment: "automatic",
    repurchasePolicy: "repeatable",
    restoreBehavior: "backend_ledger",
    refundPolicy: "clawback_unused",
    providerRefundReconcile: true,
    hasManagedAcquisitionPath: false,
    setupFeeWaivedInStore: false,
  },

  // Design templates — single-use MANAGED SERVICE requests (SIGNED DEC-03L):
  // purchase → admin dashboard → assign designer → WhatsApp → prepare →
  // revisions → complete. NOT a reusable asset; NO Restore-Purchases
  // obligation; NON-refundable from creation. Store-forced refunds
  // (Apple/Google) are the reconcile exception, hence providerRefundReconcile.
  design_template: {
    family: "design_template",
    kind: "addon_consumable",
    storeEligible: true,
    eligibleAudiences: ["personal_host"],
    revenueCatOfferingId: "host_addons",
    fulfillment: "managed_service_admin",
    repurchasePolicy: "repeatable",
    restoreBehavior: "none",
    refundPolicy: "non_refundable_from_creation",
    providerRefundReconcile: true,
    hasManagedAcquisitionPath: false,
    setupFeeWaivedInStore: false,
  },

  // Business customization — managed/provisioned service (DEC-03 "unchanged":
  // pending_provisioning → admin activates). Store TYPE is a documented,
  // NON-BLOCKING ambiguity (see Task 3 / final report):
  //   • SIGNED DEC-03 says "unchanged managed service" (silent on store type);
  //   • DECISION-RECORD §D.4 table *recommends* "non-consumable, 1/org";
  //   • the current SKU-matrix.md lists it as "consumable".
  // Resolution: CONSUMABLE (one-time). A non-consumable would owe Apple Restore
  // Purchases, but there is NO restorable digital entitlement (it's a service),
  // so non-consumable is self-contradictory here; "consumable" also matches the
  // current SKU-matrix and the same shape the owner signed for design templates.
  // We deliberately do NOT add the §D.3 "one-per-org guard" — that is NEW
  // commercial behavior that "unchanged" forbids (Session-2+ territory).
  // Refund is DISTINCT from design templates: business customization refund is
  // "before/after work = legal" (NOT signed non-refundable) → legal review.
  business_customization: {
    family: "business_customization",
    kind: "addon_consumable",
    storeEligible: true,
    eligibleAudiences: ["business_host"],
    revenueCatOfferingId: "business_addons",
    fulfillment: "managed_service_admin",
    repurchasePolicy: "repeatable",
    restoreBehavior: "none",
    refundPolicy: "managed_service_legal_review",
    providerRefundReconcile: true,
    hasManagedAcquisitionPath: true, // provisioned/managed via admin flow
    setupFeeWaivedInStore: false,
  },
};

// ── shared plan-overlay factories ──────────────────────────────────────────
function eventConsumable(offering) {
  return {
    kind: "event_consumable",
    storeEligible: true,
    revenueCatOfferingId: offering,
    entitlementId: null, // consumables NEVER carry the recurring entitlement
    fulfillment: "automatic",
    repurchasePolicy: "repeatable",
    restoreBehavior: "backend_ledger", // receipts don't restore consumables; backend ledger is authoritative
    refundPolicy: "unused_only",
    providerRefundReconcile: true,
    isTrial: false,
    isUnlimited: false,
    hasManagedAcquisitionPath: false,
    setupFeeWaivedInStore: false,
  };
}

function subscription(offering, period) {
  return {
    kind: "subscription",
    storeEligible: true,
    billingPeriodOverride: period,
    androidBasePlanId: period, // PROPOSED base-plan id convention
    revenueCatOfferingId: offering,
    entitlementId: RECURRING_ENTITLEMENT_ID,
    fulfillment: "automatic",
    repurchasePolicy: "single_active_subscription", // single-active recurring by design
    restoreBehavior: "store_restore",
    refundPolicy: "standard_store",
    providerRefundReconcile: true,
    isTrial: false,
    isUnlimited: false,
    hasManagedAcquisitionPath: false,
    setupFeeWaivedInStore: false,
  };
}

module.exports = {
  PLAN_OVERLAY,
  ADDON_OVERLAY,
  AUDIENCE_ELIGIBILITY,
  AVAILABLE_FOR_TO_AUDIENCE,
};
