/**
 * Native-billing configuration + readiness (BILL-10 · §9 · closes P0-14).
 *
 * Strict, Zod-validated loader for every RevenueCat/native-billing setting, plus
 * a readiness contribution that FAILS CLOSED when native billing is enabled but
 * any value is missing, malformed, a placeholder, or contradictory (e.g. the
 * configured recurring entitlement id disagrees with the catalog, or a pinned
 * manifest hash disagrees with the committed manifest).
 *
 * Local tests never need real credentials: when `NATIVE_BILLING_ENABLED` is not
 * "true" the billing gate is simply "not required" and the loader validates an
 * empty/disabled config without provider access or a database.
 *
 * Secrets (`REVENUECAT_WEBHOOK_AUTH`, `REVENUECAT_API_KEY`) stay backend-only —
 * this module reads them but only ever reports variable NAMES and reasons,
 * never values.
 */

const { z } = require("zod");
const commerce = require("../../shared/commerce");
const { resolveProductMaps } = require("../../shared/commerce/catalog.resolver");

const ALLOWED_STORES = ["APP_STORE", "PLAY_STORE", "AMAZON", "STRIPE", "MAC_APP_STORE", "PROMOTIONAL"];
const ENVIRONMENTS = ["SANDBOX", "PRODUCTION"];

// Reject obvious placeholders so a copy-pasted example can never look "ready".
const PLACEHOLDER_RE = /^(changeme|change_me|placeholder|example|your[_-]|xxx+|todo|tbd|<.*>|\.\.\.)/i;
const isPlaceholder = (v) => typeof v === "string" && PLACEHOLDER_RE.test(v.trim());
const present = (v) => typeof v === "string" && v.trim() !== "";

const secret = (name) =>
  z
    .string({ required_error: `${name} is required when native billing is enabled` })
    .trim()
    .min(1, `${name} must not be empty`)
    .refine((v) => !isPlaceholder(v), `${name} looks like a placeholder`);

const csv = (raw, fallback = []) =>
  present(raw) ? raw.split(",").map((s) => s.trim()).filter(Boolean) : fallback;

/**
 * The schema applied ONLY when native billing is enabled. Each field maps to a
 * required env var; the messages name the variable, never the value.
 */
const EnabledSchema = z
  .object({
    REVENUECAT_WEBHOOK_AUTH: secret("REVENUECAT_WEBHOOK_AUTH"),
    REVENUECAT_API_KEY: secret("REVENUECAT_API_KEY"),
    REVENUECAT_APP_ID: secret("REVENUECAT_APP_ID"),
    REVENUECAT_ENVIRONMENT: z.enum(ENVIRONMENTS, {
      errorMap: () => ({ message: "REVENUECAT_ENVIRONMENT must be SANDBOX or PRODUCTION" }),
    }),
    REVENUECAT_RECURRING_ENTITLEMENT_ID: secret("REVENUECAT_RECURRING_ENTITLEMENT_ID"),
  })
  .passthrough();

/**
 * Load + validate the billing config.
 * @param {object} [env=process.env]
 * @returns {{ ok:boolean, enabled:boolean, value:object|null, errors:string[] }}
 */
function loadBillingConfig(env = process.env) {
  const enabled = String(env.NATIVE_BILLING_ENABLED).toLowerCase() === "true";
  if (!enabled) {
    return { ok: true, enabled: false, value: { enabled: false }, errors: [] };
  }

  const parsed = EnabledSchema.safeParse(env);
  const errors = [];
  if (!parsed.success) {
    for (const issue of parsed.error.issues) errors.push(issue.message);
  }

  const allowedStores = csv(env.REVENUECAT_ALLOWED_STORES, ["APP_STORE", "PLAY_STORE"]);
  for (const s of allowedStores) {
    if (!ALLOWED_STORES.includes(s)) errors.push(`REVENUECAT_ALLOWED_STORES contains unknown store "${s}"`);
  }

  const apiVersions = csv(env.REVENUECAT_API_VERSION_ALLOWLIST, ["1.0"]);
  if (!apiVersions.length) errors.push("REVENUECAT_API_VERSION_ALLOWLIST must list at least one api_version");

  // Contradiction: the configured recurring entitlement must equal the catalog's.
  const catalogEntitlement = commerce.RECURRING_ENTITLEMENT_ID;
  const configuredEntitlement = env.REVENUECAT_RECURRING_ENTITLEMENT_ID;
  if (present(configuredEntitlement) && configuredEntitlement !== catalogEntitlement) {
    errors.push(
      `REVENUECAT_RECURRING_ENTITLEMENT_ID (${configuredEntitlement}) disagrees with the catalog entitlement (${catalogEntitlement})`
    );
  }

  // Optional manifest pin: if the deploy pins a version/hash it must match the
  // committed manifest (contradictory pin → not ready).
  const integrity = commerce.getCatalogIntegrity();
  if (present(env.CATALOG_MANIFEST_VERSION) && env.CATALOG_MANIFEST_VERSION !== integrity.catalogVersion) {
    errors.push(`CATALOG_MANIFEST_VERSION (${env.CATALOG_MANIFEST_VERSION}) != manifest (${integrity.catalogVersion})`);
  }
  if (present(env.CATALOG_MANIFEST_HASH) && env.CATALOG_MANIFEST_HASH !== integrity.catalogHash) {
    errors.push("CATALOG_MANIFEST_HASH does not match the committed manifest");
  }

  const leaseMs = Number(env.REVENUECAT_LEASE_MS || 120000);
  if (!Number.isFinite(leaseMs) || leaseMs < 1000) errors.push("REVENUECAT_LEASE_MS must be >= 1000 ms");
  const maxAttempts = Number(env.REVENUECAT_MAX_ATTEMPTS || 8);
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) errors.push("REVENUECAT_MAX_ATTEMPTS must be a positive integer");

  const value = {
    enabled: true,
    webhookAuth: env.REVENUECAT_WEBHOOK_AUTH,
    apiKey: env.REVENUECAT_API_KEY,
    appId: env.REVENUECAT_APP_ID,
    environment: env.REVENUECAT_ENVIRONMENT,
    recurringEntitlementId: configuredEntitlement || catalogEntitlement,
    allowedStores,
    apiVersions,
    leaseMs,
    maxAttempts,
    alertEnabled: String(env.REVENUECAT_ALERT_ENABLED).toLowerCase() === "true",
    catalogVersion: integrity.catalogVersion,
    catalogHash: integrity.catalogHash,
  };

  return { ok: errors.length === 0, enabled: true, value, errors };
}

/**
 * Billing readiness contribution. When enabled, combines config validity,
 * catalog integrity, and product-map validity into one fail-closed verdict.
 * @param {object} [env=process.env]
 * @returns {{ ready:boolean, enabled:boolean, checks:object, errors:string[] }}
 */
function getBillingReadiness(env = process.env) {
  const cfg = loadBillingConfig(env);
  if (!cfg.enabled) {
    return { ready: true, enabled: false, checks: { billing: "disabled" }, errors: [] };
  }

  const integrity = commerce.getCatalogIntegrity();
  const maps = resolveProductMaps(env);

  const errors = [...cfg.errors];
  if (!integrity.ok) errors.push(`catalog integrity: ${integrity.reason}`);
  if (!maps.ok) {
    for (const e of maps.errors) errors.push(`product map [${e.map}] ${e.code}: ${e.detail}`);
  }
  // Coverage: at least one store-eligible plan and add-on must resolve.
  if (Object.keys(maps.planMap).length === 0) errors.push("no store-eligible plan products resolved");
  if (Object.keys(maps.addonMap).length === 0) errors.push("no store-eligible add-on products resolved");

  return {
    ready: errors.length === 0,
    enabled: true,
    checks: {
      config: cfg.ok,
      catalogIntegrity: integrity.ok,
      catalogVersion: integrity.catalogVersion,
      catalogHash: integrity.catalogHash,
      productMaps: maps.ok,
      planProducts: Object.keys(maps.planMap).length,
      addonProducts: Object.keys(maps.addonMap).length,
    },
    errors,
  };
}

module.exports = {
  loadBillingConfig,
  getBillingReadiness,
  isPlaceholder,
  ALLOWED_STORES,
  ENVIRONMENTS,
};
