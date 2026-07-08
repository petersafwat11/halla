/**
 * Canonical store-catalog contract tests (CAT-01).
 *
 * Proves the generated catalog matches the SIGNED six-tier / 34-plan + 22
 * add-on catalog (docs/store-readiness-DECISION-RECORD.md, 2026-07-01) and that
 * every downstream artifact stays in sync — with no DB, credentials, or network.
 *
 * Run:  node --test test/store-catalog.test.js
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { buildCatalog, catalogCounts } = require("../src/shared/commerce/buildCatalog");
const { RECURRING_ENTITLEMENT_ID, PRODUCT_ID_PREFIX } = require("../src/shared/commerce/catalog.schema");
const { PLAN_DEFAULTS } = require("../src/shared/constants/planDefaults");
const { PLAN_CODES } = require("../src/shared/constants/plans");
const {
  EXTRA_INVITES_TIERS,
  DESIGN_TEMPLATE_TIERS,
  BUSINESS_CUSTOMIZATION,
} = require("../src/shared/constants/addons");
const manifest = require("../src/shared/commerce/storeCatalog.generated.json");
const commerce = require("../src/shared/commerce");
const generator = require("../scripts/generateStoreCatalog");

const catalog = buildCatalog();
const counts = catalogCounts(catalog);
const plans = catalog.filter((e) => e.catalogType === "plan");
const addonsE = catalog.filter((e) => e.catalogType === "addon");
const storePlans = plans.filter((e) => e.storeEligible);
const storeAddons = addonsE.filter((e) => e.storeEligible);
const repoRoot = path.join(__dirname, "..", "..");

// ── counts ───────────────────────────────────────────────────────────────────
test("exactly 34 database plans, correct per planType", () => {
  assert.equal(plans.length, 34);
  assert.deepEqual(counts.perPlanType, {
    trial: 1,
    basic_event: 6,
    basic_monthly: 6,
    premium_event: 6,
    premium_monthly: 6,
    business_event: 6,
    business_quarterly: 1,
    business_annual: 1,
    unlimited: 1,
  });
});

test("exactly 32 store-eligible plans (18 event consumables + 14 subscriptions)", () => {
  assert.equal(storePlans.length, 32);
  assert.equal(counts.eventConsumables, 18);
  assert.equal(counts.subscriptions, 14);
});

test("exactly 22 add-ons, all store-eligible", () => {
  assert.equal(addonsE.length, 22);
  assert.equal(storeAddons.length, 22);
  assert.equal(EXTRA_INVITES_TIERS.length, 16);
  assert.equal(DESIGN_TEMPLATE_TIERS.length, 5);
});

test("exactly 54 proposed store products per platform", () => {
  assert.equal(counts.proposedProductsPerPlatform, 54);
  const iosIds = catalog.filter((e) => e.iosProductId).map((e) => e.iosProductId);
  const androidIds = catalog.filter((e) => e.androidProductId).map((e) => e.androidProductId);
  assert.equal(iosIds.length, 54);
  assert.equal(androidIds.length, 54);
});

test("zero trial / unlimited store products", () => {
  for (const e of catalog) {
    if (e.isTrial || e.isUnlimited || e.planType === "trial" || e.planType === "unlimited") {
      assert.equal(e.storeEligible, false, `${e.internalCode} must not be store-eligible`);
      assert.equal(e.iosProductId, null);
      assert.equal(e.androidProductId, null);
      assert.equal(e.revenueCatPackageLookupKey, null);
      assert.equal(e.revenueCatEntitlementId, null);
      assert.equal(e.isProviderExcluded, true);
    }
  }
  assert.equal(counts.nonStore, 2);
});

// ── membership / no ten-tier ──────────────────────────────────────────────────
test("exact six-tier membership; no 250/300/350/400 plan codes", () => {
  const tieredFamilies = ["basic_event", "basic_monthly", "premium_event", "premium_monthly", "business_event"];
  const expectedTiers = [25, 50, 75, 100, 150, 200];
  for (const fam of tieredFamilies) {
    const tiers = plans.filter((p) => p.planType === fam).map((p) => p.tier).sort((a, b) => a - b);
    assert.deepEqual(tiers, expectedTiers, `${fam} must have exactly the six tiers`);
  }
  const banned = [250, 300, 350, 400, 500];
  for (const p of plans) {
    assert.ok(!banned.includes(p.tier), `plan ${p.internalCode} carries a removed tier`);
  }
});

test("catalog plan codes exactly equal PLAN_CODES enum", () => {
  const enumCodes = new Set(Object.values(PLAN_CODES));
  const catCodes = new Set(plans.map((p) => p.internalCode));
  assert.deepEqual([...catCodes].sort(), [...enumCodes].sort());
});

// ── uniqueness ────────────────────────────────────────────────────────────────
const uniq = (arr) => new Set(arr).size === arr.length;

test("unique internal codes", () => {
  assert.ok(uniq(catalog.map((e) => e.internalCode)));
  assert.equal(catalog.length, 56); // 34 plans + 22 add-ons
});

test("unique Apple product IDs", () => {
  const ids = catalog.filter((e) => e.iosProductId).map((e) => e.iosProductId);
  assert.ok(uniq(ids));
});

test("unique Google productId + basePlanId combinations", () => {
  const combos = catalog
    .filter((e) => e.androidProductId)
    .map((e) => `${e.androidProductId}::${e.androidBasePlanId ?? ""}`);
  assert.ok(uniq(combos));
});

test("unique RevenueCat package lookup keys", () => {
  const keys = catalog.filter((e) => e.revenueCatPackageLookupKey).map((e) => e.revenueCatPackageLookupKey);
  assert.ok(uniq(keys));
  // package lookup key === internal code (mobile matches packages by code)
  for (const e of catalog.filter((x) => x.storeEligible)) {
    assert.equal(e.revenueCatPackageLookupKey, e.internalCode);
  }
});

test("proposed product ids follow com.halla.<code> (ios === android)", () => {
  for (const e of catalog.filter((x) => x.storeEligible)) {
    assert.equal(e.iosProductId, PRODUCT_ID_PREFIX + e.internalCode);
    assert.equal(e.androidProductId, e.iosProductId);
  }
});

// ── audience / eligibility ────────────────────────────────────────────────────
test("valid audience / role / account-type mappings", () => {
  const expect = {
    personal_host: { roles: ["host"], accountTypes: ["personal"] },
    business_host: { roles: ["host"], accountTypes: ["business"] },
    platform_internal: { roles: ["admin", "super_admin"], accountTypes: ["platform"] },
  };
  for (const e of catalog) {
    const roles = new Set();
    const accts = new Set();
    for (const a of e.eligibleAudiences) {
      expect[a].roles.forEach((r) => roles.add(r));
      expect[a].accountTypes.forEach((t) => accts.add(t));
    }
    assert.deepEqual([...roles].sort(), [...e.eligibleRoles].sort(), `${e.internalCode} roles`);
    assert.deepEqual([...accts].sort(), [...e.eligibleAccountTypes].sort(), `${e.internalCode} accountTypes`);
  }
  // business plans → business_host; basic/premium → personal_host.
  for (const p of plans.filter((x) => x.storeEligible)) {
    if (p.planType.startsWith("business")) assert.deepEqual(p.eligibleAudiences, ["business_host"], p.internalCode);
    else assert.deepEqual(p.eligibleAudiences, ["personal_host"], p.internalCode);
  }
});

// ── product-type / duration combinations ──────────────────────────────────────
test("valid product-type and duration combinations per kind", () => {
  for (const e of catalog) {
    if (e.kind === "subscription") {
      assert.ok(["monthly", "quarterly", "annual"].includes(e.billingPeriod), e.internalCode);
      assert.equal(e.appleProductType, "auto_renewable_subscription");
      assert.equal(e.googleProductType, "subs");
      assert.equal(e.revenueCatType, "subscription");
      assert.ok(e.androidBasePlanId, `${e.internalCode} needs base plan`);
      assert.equal(e.revenueCatEntitlementId, RECURRING_ENTITLEMENT_ID);
      assert.equal(e.restoreBehavior, "store_restore");
    } else if (e.kind === "event_consumable" || e.kind === "addon_consumable") {
      assert.equal(e.billingPeriod, "one_time", e.internalCode);
      assert.equal(e.appleProductType, "consumable");
      assert.equal(e.googleProductType, "inapp");
      assert.equal(e.revenueCatType, "consumable");
      assert.equal(e.androidBasePlanId, null);
      assert.equal(e.revenueCatEntitlementId, null);
    } else {
      assert.equal(e.kind, "internal");
      assert.equal(e.storeEligible, false);
      assert.equal(e.billingPeriod, "none");
    }
  }
});

// ── metadata ──────────────────────────────────────────────────────────────────
test("required AR/EN names present on every product", () => {
  for (const e of catalog) {
    assert.ok(typeof e.nameAr === "string" && e.nameAr.trim().length > 0, `${e.internalCode} nameAr`);
    assert.ok(typeof e.nameEn === "string" && e.nameEn.trim().length > 0, `${e.internalCode} nameEn`);
  }
  // extra-invite names are synthesized (source has none) — must be non-empty + contain the qty.
  for (const e of addonsE.filter((x) => x.family === "extra_invites")) {
    assert.ok(e.nameEn.includes(String(e.tier)), `${e.internalCode} synthesized name`);
    assert.ok(e.nameAr.includes(String(e.tier)), `${e.internalCode} synthesized AR name`);
  }
});

// ── ordering ──────────────────────────────────────────────────────────────────
test("numeric tier ordering (sortOrder increases with tier)", () => {
  const families = ["basic_event", "basic_monthly", "premium_event", "premium_monthly", "business_event"];
  for (const fam of families) {
    const rows = plans.filter((p) => p.planType === fam).sort((a, b) => a.sortOrder - b.sortOrder);
    for (let i = 1; i < rows.length; i += 1) {
      assert.ok(rows[i].tier > rows[i - 1].tier, `${fam} tier ordering`);
      assert.ok(rows[i].sortOrder > rows[i - 1].sortOrder, `${fam} sortOrder ordering`);
    }
  }
  const inv = addonsE.filter((e) => e.family === "extra_invites").sort((a, b) => a.sortOrder - b.sortOrder);
  for (let i = 1; i < inv.length; i += 1) {
    assert.ok(inv[i].tier > inv[i - 1].tier, "extra_invites tier ordering");
  }
});

// ── backend parity (no missing / orphan) ───────────────────────────────────────
test("catalog codes exactly cover PLAN_DEFAULTS keys + add-on codes (no missing/orphan)", () => {
  const planDefaultCodes = new Set(Object.keys(PLAN_DEFAULTS));
  const catPlanCodes = new Set(plans.map((p) => p.internalCode));
  assert.deepEqual([...catPlanCodes].sort(), [...planDefaultCodes].sort());

  const expectedAddon = new Set([
    ...EXTRA_INVITES_TIERS.map((t) => `extra_invites_${t.quantity}`),
    ...DESIGN_TEMPLATE_TIERS.map((t) => `design_template_${t.type}`),
    "business_customization",
  ]);
  const catAddonCodes = new Set(addonsE.map((a) => a.internalCode));
  assert.deepEqual([...catAddonCodes].sort(), [...expectedAddon].sort());
});

test("add-on codes match the RevenueCat parseAddonCode grammar", () => {
  for (const a of addonsE) {
    const ok =
      /^extra_invites_\d+$/.test(a.internalCode) ||
      /^design_template_.+$/.test(a.internalCode) ||
      a.internalCode === "business_customization";
    assert.ok(ok, `${a.internalCode} does not match the add-on code grammar`);
  }
});

test("price parity: catalog price equals the source business data", () => {
  for (const p of plans) {
    assert.equal(p.price, PLAN_DEFAULTS[p.internalCode].pricing.oneTime, `${p.internalCode} price`);
  }
  for (const t of EXTRA_INVITES_TIERS) {
    const e = addonsE.find((x) => x.internalCode === `extra_invites_${t.quantity}`);
    assert.equal(e.price, t.price);
  }
  for (const t of DESIGN_TEMPLATE_TIERS) {
    const e = addonsE.find((x) => x.internalCode === `design_template_${t.type}`);
    assert.equal(e.price, t.price);
  }
  assert.equal(
    addonsE.find((x) => x.internalCode === "business_customization").price,
    BUSINESS_CUSTOMIZATION.price
  );
});

// ── entitlement safety (P0-09 / billing §0.3) ──────────────────────────────────
test("no consumable or add-on carries the recurring entitlement id", () => {
  for (const e of catalog) {
    if (e.kind !== "subscription") {
      assert.equal(e.revenueCatEntitlementId, null, `${e.internalCode} must not carry an entitlement`);
    }
  }
  // Exactly the 14 subscriptions carry it.
  const withEnt = catalog.filter((e) => e.revenueCatEntitlementId === RECURRING_ENTITLEMENT_ID);
  assert.equal(withEnt.length, 14);
  assert.ok(withEnt.every((e) => e.kind === "subscription"));
});

// ── signed classifications (DEC-03 / DEC-03L) ──────────────────────────────────
test("design templates, extra invites, and business customization match signed classifications", () => {
  for (const e of addonsE.filter((x) => x.family === "design_template")) {
    assert.equal(e.kind, "addon_consumable");
    assert.equal(e.refundPolicy, "non_refundable_from_creation"); // SIGNED DEC-03L
    assert.equal(e.restoreBehavior, "none"); // no restore obligation
    assert.equal(e.fulfillment, "managed_service_admin");
    assert.equal(e.repurchasePolicy, "repeatable");
  }
  for (const e of addonsE.filter((x) => x.family === "extra_invites")) {
    assert.equal(e.kind, "addon_consumable");
    assert.equal(e.refundPolicy, "clawback_unused");
    assert.equal(e.restoreBehavior, "backend_ledger");
    assert.equal(e.fulfillment, "automatic");
    assert.deepEqual(e.eligibleAudiences, ["personal_host", "business_host"]);
  }
  const bc = addonsE.find((x) => x.internalCode === "business_customization");
  assert.equal(bc.kind, "addon_consumable");
  // DISTINCT from design templates: NOT signed non-refundable — before/after work is legal review.
  assert.equal(bc.refundPolicy, "managed_service_legal_review");
  assert.notEqual(bc.refundPolicy, "non_refundable_from_creation");
  assert.equal(bc.fulfillment, "managed_service_admin");
  assert.deepEqual(bc.eligibleAudiences, ["business_host"]);
});

// ── cross-surface staleness (backend + web + mobile source) ────────────────────
test("no removed ten-tier plan code appears in backend/web/mobile source", () => {
  // The 20 removed ten-tier plan codes. NOT `business_event_500` — seedPlans.js
  // deliberately references it in a guard asserting that stale code is ABSENT
  // from the DB (anti-staleness code, not a stale definition); the catalog-level
  // membership test above already bans a 500 tier from the catalog itself.
  const families = ["basic_event", "basic_monthly", "premium_event", "premium_monthly", "business_event"];
  const staleCodes = [];
  for (const fam of families) for (const t of [250, 300, 350, 400]) staleCodes.push(`${fam}_${t}`);

  const roots = [
    "labbe-backend-/src",
    "labbe-backend-/scripts",
    "labbe-backend-/models",
    "labbe/app",
    "labbe/ui",
    "labbe/hooks",
    "labbe/services",
    "halla-mobile/screens",
    "halla-mobile/components",
    "halla-mobile/services",
    "halla-mobile/hooks",
    "shared/src",
  ];
  const SKIP = new Set(["node_modules", ".next", ".expo", "android", "ios", "build", "dist", "coverage", ".git"]);
  const exts = new Set([".js", ".jsx", ".ts", ".tsx", ".json"]);
  const hits = [];
  let scanned = 0;

  const walk = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const d of entries) {
      if (SKIP.has(d.name)) continue;
      const full = path.join(dir, d.name);
      if (d.isDirectory()) {
        walk(full);
      } else if (exts.has(path.extname(d.name))) {
        let src;
        try {
          const stat = fs.statSync(full);
          if (stat.size > 512 * 1024) continue;
          src = fs.readFileSync(full, "utf8");
        } catch {
          continue;
        }
        scanned += 1;
        for (const code of staleCodes) {
          if (src.includes(code)) hits.push(`${path.relative(repoRoot, full)} → ${code}`);
        }
      }
    }
  };
  for (const r of roots) walk(path.join(repoRoot, r));

  assert.ok(scanned > 50, `expected to scan source files, only scanned ${scanned}`);
  assert.deepEqual(hits, [], `stale ten-tier plan codes found:\n${hits.join("\n")}`);
});

test("stale '54-plan / 54 entries' comments were removed from source", () => {
  const seed = fs.readFileSync(path.join(repoRoot, "labbe-backend-/scripts/seedPlans.js"), "utf8");
  const defs = fs.readFileSync(path.join(repoRoot, "labbe-backend-/src/shared/constants/planDefaults.js"), "utf8");
  assert.ok(/EXPECTED_TOTAL = 34/.test(seed), "seedPlans EXPECTED_TOTAL must be 34");
  assert.ok(!/54-plan|54 entries|54 total/.test(seed), "seedPlans still has a stale 54 comment");
  assert.ok(!/54 entries|54-plan|54 total/.test(defs), "planDefaults still has a stale 54 comment");
});

// ── generated-artifact reproducibility / drift ─────────────────────────────────
test("committed JSON manifest matches the builder (in-process)", () => {
  assert.equal(manifest.recurringEntitlementId, RECURRING_ENTITLEMENT_ID);
  assert.deepEqual(manifest.counts, counts);
  assert.deepEqual(manifest.entries, JSON.parse(JSON.stringify(catalog)));
});

test("all generated artifacts are reproducible and currently synchronized", () => {
  const drift = generator.findDrift();
  assert.deepEqual(drift, [], `generated artifacts drift from source:\n${drift.join("\n")}\nRun: npm run catalog:generate`);
});

// ── runtime product→code maps (the RevenueCat webhook consumer) ────────────────
test("generated product→code maps: 32 plans, 22 add-ons, com.halla.<code>, no trial/unlimited", () => {
  const planMap = commerce.getStorePlanProductMap();
  const addonMap = commerce.getStoreAddonProductMap();

  // ios id === android id, so one key per store-eligible product.
  assert.equal(Object.keys(planMap).length, 32);
  assert.equal(Object.keys(addonMap).length, 22);

  for (const [productId, code] of [...Object.entries(planMap), ...Object.entries(addonMap)]) {
    assert.equal(productId, `com.halla.${code}`, `${productId} must be com.halla.<code>`);
  }
  // trial / unlimited must never resolve a store product.
  assert.ok(!("com.halla.trial" in planMap), "trial must not be in the plan map");
  assert.ok(!("com.halla.unlimited" in planMap), "unlimited must not be in the plan map");

  // Maps must resolve real catalog codes (no orphan values).
  const codes = new Set(catalog.map((e) => e.internalCode));
  for (const code of [...Object.values(planMap), ...Object.values(addonMap)]) {
    assert.ok(codes.has(code), `map resolves unknown code ${code}`);
  }
});
