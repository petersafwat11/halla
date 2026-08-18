const path = require("node:path");
const { createGoogleAccessToken } = require("../auth/google");
const { requestJson } = require("../lib/http");
const { exportGoogle } = require("./google");
const { stable } = require("../lib/diff");
const { canonicalJson, sha256 } = require("../lib/plan");
const { appendJournal, completedOperationIds } = require("../lib/journal");
const { buildGooglePlan } = require("../lib/providerPlans");

const BASE_URL = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications";

function stateHash(state) {
  return sha256(canonicalJson(stable(state)));
}

function googleLanguageCode(locale) {
  if (locale === "ar-SA") return "ar";
  return locale;
}

function googleListings(product) {
  return product.localizations.map((item) => ({
    languageCode: googleLanguageCode(item.locale),
    title: item.name,
    description: item.description,
  }));
}

function buildSubscriptionResource(product, packageName) {
  return {
    packageName,
    productId: product.productId,
    basePlans: [
      {
        basePlanId: product.basePlanId,
        regionalConfigs: product.regionalAvailability.map((availability) => ({
          regionCode: availability.regionCode,
          newSubscriberAvailability: availability.newSubscriberAvailability,
          price: product.targetPrice,
        })),
        autoRenewingBasePlanType: {
          billingPeriodDuration: product.duration,
          resubscribeState: "RESUBSCRIBE_STATE_ACTIVE",
          prorationMode: "SUBSCRIPTION_PRORATION_MODE_CHARGE_ON_NEXT_BILLING_DATE",
        },
      },
    ],
    listings: googleListings(product),
  };
}

function buildOneTimeResource(product, packageName) {
  return {
    packageName,
    productId: product.productId,
    listings: googleListings(product),
    purchaseOptions: [
      {
        purchaseOptionId: "buy",
        regionalPricingAndAvailabilityConfigs: product.regionalAvailability.map((availability) => ({
          regionCode: availability.regionCode,
          price: product.targetPrice,
          availability: "AVAILABLE",
        })),
        buyOption: { legacyCompatible: true, multiQuantityEnabled: false },
      },
    ],
  };
}

async function executeGoogleOperation(packagePath, headers, regionsVersion, operation) {
  const product = operation.payload;
  if (product.type === "SUBSCRIPTION") {
    const resource = buildSubscriptionResource(product, product.packageName || process.env.GOOGLE_PACKAGE_NAME || "com.halaa.app");
    if (operation.action === "create_subscription_draft") {
      const url = new URL(`${packagePath}/subscriptions`);
      url.searchParams.set("productId", product.productId);
      url.searchParams.set("regionsVersion.version", regionsVersion);
      await requestJson(url, { method: "POST", headers, body: resource });
      return;
    }
    if (operation.action === "verify_or_update_product") {
      const url = new URL(`${packagePath}/subscriptions/${encodeURIComponent(product.productId)}`);
      url.searchParams.set("updateMask", "basePlans,listings");
      url.searchParams.set("regionsVersion.version", regionsVersion);
      await requestJson(url, { method: "PATCH", headers, body: resource });
      return;
    }
  }

  if (product.type === "ONE_TIME_PRODUCT") {
    const resource = buildOneTimeResource(product, process.env.GOOGLE_PACKAGE_NAME || "com.halaa.app");
    await requestJson(`${packagePath}/oneTimeProducts:batchUpdate`, {
      method: "POST",
      headers,
      body: {
        requests: [
          {
            oneTimeProduct: resource,
            updateMask: "listings,purchaseOptions",
            regionsVersion: { version: regionsVersion },
            allowMissing: operation.action === "create_one_time_product",
          },
        ],
      },
    });
    return;
  }
  throw new Error(`Unsupported Google operation: ${operation.action} (${product.type})`);
}

async function applyGooglePlan(plan, desiredState, options = {}) {
  const packageName = process.env.GOOGLE_PACKAGE_NAME || desiredState.google.packageName;
  const regionsVersion = desiredState.google.regionsVersion;
  if (!regionsVersion) throw new Error("Google apply requires GOOGLE_REGIONS_VERSION");
  const token = await createGoogleAccessToken();
  const headers = { Authorization: `Bearer ${token}` };
  const packagePath = `${BASE_URL}/${encodeURIComponent(packageName)}`;
  const journalPath = path.resolve(options.journalPath);
  const completed = completedOperationIds(journalPath, plan.planHash);
  const current = await exportGoogle();
  if (completed.size === 0 && stateHash(current) !== plan.actualStateHash) {
    throw new Error("Google Play state changed after the reviewed export; regenerate and reapprove the plan");
  }
  const livePlan = buildGooglePlan(desiredState, current);
  if (livePlan.conflicts.length) {
    throw new Error(`Google Play live state has ${livePlan.conflicts.length} conflict(s); apply stopped`);
  }

  const operations = [...plan.operations].sort((left, right) => left.phase - right.phase || left.id.localeCompare(right.id));
  for (const operation of operations) {
    if (completed.has(operation.id)) continue;
    appendJournal(journalPath, {
      planHash: plan.planHash,
      operationId: operation.id,
      provider: operation.provider,
      action: operation.action,
      key: operation.key,
      status: "started",
    });
    try {
      await executeGoogleOperation(packagePath, headers, regionsVersion, operation);
      appendJournal(journalPath, {
        planHash: plan.planHash,
        operationId: operation.id,
        provider: operation.provider,
        action: operation.action,
        key: operation.key,
        status: "completed",
      });
    } catch (error) {
      appendJournal(journalPath, {
        planHash: plan.planHash,
        operationId: operation.id,
        provider: operation.provider,
        action: operation.action,
        key: operation.key,
        status: "failed",
        httpStatus: error.status,
        errorCode: error.code || "OPERATION_FAILED",
      });
      throw error;
    }
  }
  return { provider: "google", planHash: plan.planHash, journalPath };
}

module.exports = {
  applyGooglePlan,
  buildSubscriptionResource,
  buildOneTimeResource,
  stateHash,
};
