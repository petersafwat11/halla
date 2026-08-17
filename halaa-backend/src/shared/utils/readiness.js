/**
 * Deployment readiness checks (§3.2).
 *
 * Source review cannot prove a deployed environment is safe, so we expose a
 * runtime readiness probe (`GET /health/ready`) and a boot-time validator that
 * a deploy can opt into failing closed on. The probe reports the truth always;
 * the boot validator only *exits* when `STRICT_CONFIG=true`, so simply shipping
 * this code never takes down a running prod that is mid-migration to a secret
 * store — the operator flips strict mode on once rotation (§3.1) is complete.
 */

const mongoose = require("mongoose");

/**
 * Secrets that MUST be present for a PRODUCTION deploy to be considered ready.
 * Missing any of these in production is a fail-closed condition. Keep this in
 * sync with the secrets the running services actually require.
 */
const PRODUCTION_REQUIRED_SECRETS = [
  "JWT_SECRET",
  "DATABASE",
  "MOYASAR_API_KEY", // web payments
  "MOYASAR_WEBHOOK_SECRET", // Moyasar webhook auth
];

const unsignedWhatsAppWebhooksAllowed = () =>
  String(process.env.WHATSAPP_WEBHOOK_ALLOW_UNSIGNED ?? "true").toLowerCase() !==
  "false";

const getProductionRequiredSecrets = () => [
  ...PRODUCTION_REQUIRED_SECRETS,
  ...(!unsignedWhatsAppWebhooksAllowed() ? ["WHATSAPP_APP_SECRET"] : []),
];

const isPresent = (key) =>
  typeof process.env[key] === "string" && process.env[key].trim() !== "";

const checkSecrets = () => {
  const isProd = process.env.NODE_ENV === "production";
  const required = isProd
    ? getProductionRequiredSecrets()
    : ["JWT_SECRET", "DATABASE"];
  const missing = required.filter((k) => !isPresent(k));
  return { ok: missing.length === 0, missing };
};

/**
 * @returns {{ ready: boolean, checks: object }}
 */
const getReadiness = () => {
  const readyState = mongoose.connection?.readyState;
  const db = { ok: readyState === 1, readyState };
  const secrets = checkSecrets();
  // At least one allowed origin must be configured so CORS isn't wide open or
  // entirely broken in production.
  const origins = { ok: isPresent("FRONTEND_URL") };

  // Native billing (§9): when enabled, missing/malformed/placeholder/
  // contradictory RevenueCat config or a corrupt/hash-mismatched catalog
  // manifest FAILS readiness observably. Loaded lazily so simply requiring this
  // module never pulls the commerce/catalog chain into unrelated code paths.
  let billing = { ok: true, enabled: false };
  try {
    // eslint-disable-next-line global-require
    const { getBillingReadiness } = require("../../modules/payments/revenuecat.config");
    const r = getBillingReadiness();
    billing = { ok: r.ready, enabled: r.enabled, checks: r.checks, errors: r.errors };
  } catch (err) {
    billing = { ok: false, enabled: true, errors: [`billing readiness threw: ${err.message}`] };
  }

  const ready = db.ok && secrets.ok && origins.ok && billing.ok;
  return { ready, checks: { db, secrets, origins, billing } };
};

/**
 * Boot-time production config gate. Warns by default; exits the process when
 * `STRICT_CONFIG=true` so a deploy fails closed on missing secrets (§3.2).
 */
const assertProductionConfigOrWarn = ({ strict } = {}) => {
  if (process.env.NODE_ENV !== "production") return;
  const { secrets, origins, billing } = getReadiness().checks;
  const problems = [];
  if (!secrets.ok) {
    problems.push(`missing required secrets: ${secrets.missing.join(", ")}`);
  }
  if (!origins.ok) problems.push("FRONTEND_URL (allowed origin) is not set");
  // Only gate on billing when native billing is explicitly enabled.
  if (billing && billing.enabled && !billing.ok) {
    problems.push(`native billing not ready: ${(billing.errors || []).join("; ")}`);
  }
  if (problems.length === 0) return;

  const strictMode = strict ?? process.env.STRICT_CONFIG === "true";
  const message = `[startup] Production config incomplete — ${problems.join("; ")}`;
  if (strictMode) {
    // eslint-disable-next-line no-console
    console.error("❌ " + message + " (STRICT_CONFIG=true → failing closed)");
    process.exit(1);
  }
  // eslint-disable-next-line no-console
  console.warn(
    "⚠️  " +
      message +
      " — set STRICT_CONFIG=true to fail the deploy closed once secrets are rotated (§3.1/§3.2)."
  );
};

module.exports = {
  getReadiness,
  assertProductionConfigOrWarn,
  PRODUCTION_REQUIRED_SECRETS,
  getProductionRequiredSecrets,
};
