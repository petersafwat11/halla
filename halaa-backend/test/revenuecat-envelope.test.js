/**
 * Strict envelope validation tests (BILL-01 · §2). DB-free — uses the real
 * catalog resolver + a fixed valid config.
 */

const test = require("node:test");
const assert = require("node:assert/strict");

const commerce = require("../src/shared/commerce");
const { resolveProductMaps } = require("../src/shared/commerce/catalog.resolver");
const { validateEnvelope } = require("../src/modules/payments/revenuecat.envelope");
const { normalizeEvent } = require("../src/modules/payments/revenuecat.normalize");

const maps = resolveProductMaps({});
const baseCtx = () => ({
  config: {
    apiVersions: ["1.0"],
    appId: "app1",
    environment: "PRODUCTION",
    allowedStores: ["APP_STORE", "PLAY_STORE"],
    recurringEntitlementId: "recurring_access",
  },
  planMap: maps.planMap,
  addonMap: maps.addonMap,
  getEntryByCode: commerce.getEntryByCode,
  integrity: maps.integrity,
});

const SUB = "com.halaa.premium_monthly_100";
const EVT = "com.halaa.basic_event_50";
const ADDON = "com.halaa.extra_invites_50";

const body = (over = {}) => ({
  api_version: "1.0",
  event: {
    id: "e1",
    type: "INITIAL_PURCHASE",
    app_id: "app1",
    app_user_id: "u1",
    store: "APP_STORE",
    environment: "PRODUCTION",
    transaction_id: "t1",
    original_transaction_id: "o1",
    product_id: SUB,
    entitlement_ids: ["recurring_access"],
    ...over,
  },
});

const run = (over, ctx = baseCtx()) => validateEnvelope(normalizeEvent(body(over)), ctx);

// ── accept ───────────────────────────────────────────────────────────────────
test("valid subscription INITIAL_PURCHASE is accepted with resolved catalog item", () => {
  const r = run({});
  assert.equal(r.disposition, "accept");
  assert.equal(r.catalogCode, "premium_monthly_100");
  assert.equal(r.catalogItem.kind, "subscription");
});

test("valid event consumable NON_RENEWING_PURCHASE is accepted", () => {
  const r = run({ type: "NON_RENEWING_PURCHASE", product_id: EVT, entitlement_ids: [] });
  assert.equal(r.disposition, "accept");
  assert.equal(r.catalogItem.kind, "event_consumable");
});

test("valid add-on purchase is accepted", () => {
  const r = run({ type: "NON_RENEWING_PURCHASE", product_id: ADDON, entitlement_ids: [] });
  assert.equal(r.disposition, "accept");
  assert.equal(r.catalogItem.catalogType, "addon");
});

test("TRANSFER is accepted product-less (reducer sends it to manual review)", () => {
  const r = run({ type: "TRANSFER", product_id: undefined });
  assert.equal(r.disposition, "accept");
  assert.equal(r.catalogItem, null);
});

// ── ignore ───────────────────────────────────────────────────────────────────
test("environment mismatch → ignore", () => {
  assert.equal(run({ environment: "SANDBOX" }).code, "environment_mismatch");
});
test("app id mismatch → ignore", () => {
  assert.equal(run({ app_id: "other" }).code, "app_id_mismatch");
});
test("unsupported store → ignore", () => {
  assert.equal(run({ store: "AMAZON" }).code, "store_not_allowed");
});
test("unknown event type → ignore", () => {
  assert.equal(run({ type: "FUTURE_EVENT" }).code, "unknown_type");
});
test("TEST event → ignore", () => {
  assert.equal(run({ type: "TEST", product_id: undefined }).code, "test_event");
});

// ── dead_letter ──────────────────────────────────────────────────────────────
test("missing app_user_id → dead_letter", () => {
  const r = run({ app_user_id: undefined });
  assert.equal(r.disposition, "dead_letter");
  assert.equal(r.code, "missing_app_user_id");
});
test("api_version not allowed → dead_letter", () => {
  const b = normalizeEvent(body());
  b.apiVersion = "2.0";
  assert.equal(validateEnvelope(b, baseCtx()).code, "api_version_not_allowed");
});
test("unmapped product → dead_letter", () => {
  assert.equal(run({ product_id: "com.halaa.does_not_exist" }).code, "unmapped_product");
});
test("missing transaction id on a purchase → dead_letter", () => {
  assert.equal(run({ transaction_id: undefined }).code, "missing_transaction_id");
});
test("RENEWAL on a consumable product → event_product_incompatible", () => {
  assert.equal(run({ type: "RENEWAL", product_id: EVT, entitlement_ids: [] }).code, "event_product_incompatible");
});
test("NON_RENEWING_PURCHASE on a subscription product → event_product_incompatible", () => {
  assert.equal(run({ type: "NON_RENEWING_PURCHASE", product_id: SUB }).code, "event_product_incompatible");
});
test("subscription event whose entitlement_ids omit the recurring id → entitlement_mismatch", () => {
  assert.equal(run({ entitlement_ids: ["some_other"] }).code, "entitlement_mismatch");
});
test("consumable carrying the recurring entitlement → dead_letter (P0-09)", () => {
  const r = run({ type: "NON_RENEWING_PURCHASE", product_id: EVT, entitlement_ids: ["recurring_access"] });
  assert.equal(r.code, "consumable_carries_recurring_entitlement");
});
test("catalog unavailable → distinct catalog_unavailable dead_letter (not unmapped_product)", () => {
  const ctx = baseCtx();
  ctx.integrity = { ok: false, reason: "manifest_hash_mismatch" };
  assert.equal(run({}, ctx).code, "catalog_unavailable");
});
test("missing event id → dead_letter", () => {
  const n = normalizeEvent(body({ id: undefined }));
  assert.equal(validateEnvelope(n, baseCtx()).code, "missing_event_id");
});
