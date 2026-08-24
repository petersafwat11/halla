/**
 * Billing config + readiness tests (BILL-10 · §9). DB-free, credential-free.
 */

const test = require("node:test");
const assert = require("node:assert/strict");

const { loadBillingConfig, getBillingReadiness, isPlaceholder } = require("../src/modules/payments/revenuecat.config");

// A fully-valid enabled env (fake but non-placeholder values).
const validEnv = () => ({
  NATIVE_BILLING_ENABLED: "true",
  REVENUECAT_WEBHOOK_AUTH: "whauth_" + "a".repeat(24),
  REVENUECAT_API_KEY: "sk_test_" + "b".repeat(24),
  REVENUECAT_APP_IDS: "app1a2b3c4d,app5e6f7g8h",
  REVENUECAT_ENVIRONMENT: "PRODUCTION",
  REVENUECAT_RECURRING_ENTITLEMENT_ID: "recurring_access",
});

test("disabled billing is trivially ready and requires nothing", () => {
  const cfg = loadBillingConfig({ NATIVE_BILLING_ENABLED: "false" });
  assert.equal(cfg.enabled, false);
  assert.equal(cfg.ok, true);
  assert.equal(getBillingReadiness({ NATIVE_BILLING_ENABLED: "false" }).ready, true);
});

test("enabled billing with full valid config is ready", () => {
  const cfg = loadBillingConfig(validEnv());
  assert.equal(cfg.ok, true, JSON.stringify(cfg.errors));
  const r = getBillingReadiness(validEnv());
  assert.equal(r.ready, true, JSON.stringify(r.errors));
  assert.equal(r.checks.catalogIntegrity, true);
  assert.equal(r.checks.catalogVersion, "1.0.0");
  assert.ok(r.checks.planProducts > 0 && r.checks.addonProducts > 0);
});

test("enabled billing accepts an explicit SANDBOX + PRODUCTION allowlist", () => {
  const env = {
    ...validEnv(),
    REVENUECAT_ENVIRONMENT: undefined,
    REVENUECAT_ENVIRONMENTS: "SANDBOX,PRODUCTION",
  };
  const cfg = loadBillingConfig(env);
  assert.equal(cfg.ok, true, JSON.stringify(cfg.errors));
  assert.deepEqual(cfg.value.environments, ["SANDBOX", "PRODUCTION"]);
  assert.equal(cfg.value.environment, null);
});

test("enabled billing accepts App Store + Play Store app id allowlist", () => {
  const cfg = loadBillingConfig(validEnv());
  assert.deepEqual(cfg.value.appIds, ["app1a2b3c4d", "app5e6f7g8h"]);
  assert.equal(cfg.value.appId, null);
});

test("enabled billing fails when required secrets are missing", () => {
  const env = { NATIVE_BILLING_ENABLED: "true" };
  const cfg = loadBillingConfig(env);
  assert.equal(cfg.ok, false);
  assert.ok(cfg.errors.some((e) => e.includes("REVENUECAT_WEBHOOK_AUTH")));
  assert.ok(cfg.errors.some((e) => e.includes("REVENUECAT_API_KEY")));
  assert.ok(cfg.errors.some((e) => e.includes("REVENUECAT_APP_IDS")));
  assert.equal(getBillingReadiness(env).ready, false);
});

test("placeholder values are rejected", () => {
  assert.equal(isPlaceholder("changeme"), true);
  assert.equal(isPlaceholder("<your-key>"), true);
  assert.equal(isPlaceholder("your_api_key"), true);
  assert.equal(isPlaceholder("sk_live_realkey123"), false);
  const env = { ...validEnv(), REVENUECAT_API_KEY: "changeme" };
  assert.equal(loadBillingConfig(env).ok, false);
});

test("a recurring entitlement id that disagrees with the catalog is contradictory", () => {
  const env = { ...validEnv(), REVENUECAT_RECURRING_ENTITLEMENT_ID: "some_other_entitlement" };
  const cfg = loadBillingConfig(env);
  assert.equal(cfg.ok, false);
  assert.ok(cfg.errors.some((e) => e.includes("disagrees with the catalog")));
});

test("a pinned manifest hash that mismatches fails readiness", () => {
  const env = { ...validEnv(), CATALOG_MANIFEST_HASH: "deadbeef" };
  assert.equal(loadBillingConfig(env).ok, false);
});

test("an invalid product-override map fails readiness (composed with resolver)", () => {
  const env = { ...validEnv(), REVENUECAT_PRODUCT_PLAN_MAP: "{bad json" };
  const r = getBillingReadiness(env);
  assert.equal(r.ready, false);
  assert.ok(r.errors.some((e) => e.includes("product map")));
});

test("unknown environment value is rejected", () => {
  const env = { ...validEnv(), REVENUECAT_ENVIRONMENT: "STAGING" };
  assert.equal(loadBillingConfig(env).ok, false);
});

test("unknown environment in the allowlist is rejected", () => {
  const env = {
    ...validEnv(),
    REVENUECAT_ENVIRONMENT: undefined,
    REVENUECAT_ENVIRONMENTS: "SANDBOX,STAGING",
  };
  const cfg = loadBillingConfig(env);
  assert.equal(cfg.ok, false);
  assert.ok(cfg.errors.some((e) => e.includes('unknown environment "STAGING"')));
});

test("unknown allowed-store value is rejected", () => {
  const env = { ...validEnv(), REVENUECAT_ALLOWED_STORES: "APP_STORE,NINTENDO" };
  const cfg = loadBillingConfig(env);
  assert.equal(cfg.ok, false);
  assert.ok(cfg.errors.some((e) => e.includes("unknown store")));
});
