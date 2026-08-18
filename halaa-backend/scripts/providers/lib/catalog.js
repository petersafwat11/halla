const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const BACKEND_ROOT = path.resolve(__dirname, "../../..");
const WORKSPACE_ROOT = path.resolve(BACKEND_ROOT, "..");
const CATALOG_PATH = path.join(
  BACKEND_ROOT,
  "src",
  "shared",
  "commerce",
  "storeCatalog.generated.json",
);

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function loadCatalog() {
  const raw = fs.readFileSync(CATALOG_PATH);
  const catalog = JSON.parse(raw.toString("utf8"));
  const entries = catalog.entries.filter((entry) => entry.storeEligible);

  const subscriptions = entries.filter((entry) => entry.kind === "subscription");
  const consumables = entries.filter((entry) => entry.kind !== "subscription");

  const errors = [];
  if (entries.length !== 53) errors.push(`expected 53 store products, found ${entries.length}`);
  if (subscriptions.length !== 13) errors.push(`expected 13 subscriptions, found ${subscriptions.length}`);
  if (consumables.length !== 40) errors.push(`expected 40 consumables, found ${consumables.length}`);
  if (new Set(entries.map((entry) => entry.internalCode)).size !== entries.length) {
    errors.push("internal catalog codes are not unique");
  }
  if (new Set(entries.map((entry) => entry.iosProductId)).size !== entries.length) {
    errors.push("Apple product IDs are not unique");
  }
  if (new Set(entries.map((entry) => entry.androidProductId)).size !== entries.length) {
    errors.push("Google product IDs are not unique");
  }

  const entitled = entries.filter((entry) => entry.revenueCatEntitlementId != null);
  if (
    entitled.length !== 13 ||
    entitled.some(
      (entry) =>
        entry.kind !== "subscription" ||
        entry.revenueCatEntitlementId !== catalog.recurringEntitlementId,
    )
  ) {
    errors.push("recurring entitlement membership is not exactly the 13 subscriptions");
  }

  if (errors.length) {
    const error = new Error(`Provider catalog preflight failed:\n- ${errors.join("\n- ")}`);
    error.code = "PROVIDER_CATALOG_INVALID";
    throw error;
  }

  return {
    catalog,
    entries: [...entries].sort((a, b) => a.internalCode.localeCompare(b.internalCode)),
    subscriptions,
    consumables,
    manifestSha256: sha256(raw),
  };
}

module.exports = {
  BACKEND_ROOT,
  WORKSPACE_ROOT,
  CATALOG_PATH,
  loadCatalog,
};
