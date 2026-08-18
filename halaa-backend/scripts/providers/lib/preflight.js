const fs = require("node:fs");
const path = require("node:path");
const { WORKSPACE_ROOT } = require("./catalog");
const { isWithin } = require("./files");

function credentialFileStatus(environmentName) {
  const configuredPath = process.env[environmentName];
  if (!configuredPath) return { configured: false, exists: false, outsideRepository: null };
  const resolved = path.resolve(configuredPath);
  return {
    configured: true,
    exists: fs.existsSync(resolved),
    outsideRepository: !isWithin(WORKSPACE_ROOT, resolved),
  };
}

function buildPreflight(desiredState) {
  const appleKey = credentialFileStatus("APPLE_PRIVATE_KEY_PATH");
  const googleKey = credentialFileStatus("GOOGLE_SERVICE_ACCOUNT_PATH");
  const missing = [];

  if (!process.env.APPLE_APP_ID) missing.push("APPLE_APP_ID");
  if (!process.env.APPLE_ISSUER_ID) missing.push("APPLE_ISSUER_ID");
  if (!process.env.APPLE_KEY_ID) missing.push("APPLE_KEY_ID");
  if (!appleKey.configured) missing.push("APPLE_PRIVATE_KEY_PATH");
  if (!googleKey.configured) missing.push("GOOGLE_SERVICE_ACCOUNT_PATH");
  if (!process.env.REVENUECAT_API_KEY) missing.push("REVENUECAT_API_KEY");

  const unsafeCredentials = [appleKey, googleKey].some(
    (item) => item.configured && (!item.exists || !item.outsideRepository),
  );

  return {
    readyForLocalGeneration: true,
    readyForProviderRead: missing.length === 0 && !unsafeCredentials,
    readyForProviderApply:
      missing.length === 0 &&
      !unsafeCredentials &&
      desiredState.unresolvedApprovals.applePricePoints === 0 &&
      desiredState.unresolvedApprovals.appleSubscriptionLevels === 0,
    missingConfigurationNames: missing,
    credentialFiles: {
      applePrivateKey: appleKey,
      googleServiceAccount: googleKey,
    },
    providerPrerequisites: {
      apple: [
        "UPDATED_DEVELOPER_AGREEMENT_ACCEPTED",
        "LEGAL_ENTITY_UPDATED",
        "PAID_APPS_AGREEMENT_ACTIVE",
        "TAX_AND_BANKING_COMPLETE",
        "APP_CONTAINER_CREATED",
      ],
      google: [
        "IDENTITY_VERIFIED",
        "WEBSITE_VERIFIED",
        "PHONE_VERIFIED",
        "APP_CONTAINER_CREATED",
        "PAYMENTS_AND_TAX_COMPLETE",
      ],
      revenueCat: ["EMAIL_CONFIRMED", "TWO_FACTOR_ENABLED", "REAL_STORE_APPS_CREATED"],
    },
  };
}

module.exports = { buildPreflight };
