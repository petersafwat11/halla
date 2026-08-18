function appleSubscriptionPeriod(duration) {
  const periods = {
    P1W: "ONE_WEEK",
    P1M: "ONE_MONTH",
    P2M: "TWO_MONTHS",
    P3M: "THREE_MONTHS",
    P6M: "SIX_MONTHS",
    P1Y: "ONE_YEAR",
  };
  const period = periods[duration];
  if (!period) throw new Error(`Unsupported Apple subscription duration: ${duration}`);
  return period;
}

function buildSubscriptionGroupRequest(appId, referenceName) {
  if (!appId) throw new Error("Apple subscription group request requires an app ID");
  return {
    data: {
      type: "subscriptionGroups",
      attributes: { referenceName },
      relationships: {
        app: { data: { type: "apps", id: String(appId) } },
      },
    },
  };
}

function buildIapCreateRequest(appId, product) {
  if (!appId) throw new Error("Apple IAP request requires an app ID");
  if (product.type !== "CONSUMABLE") {
    throw new Error(`Apple IAP adapter refuses unexpected type: ${product.type}`);
  }
  return {
    data: {
      type: "inAppPurchases",
      attributes: {
        familySharable: false,
        inAppPurchaseType: "CONSUMABLE",
        name: product.referenceName,
        productId: product.productId,
      },
      relationships: {
        app: { data: { type: "apps", id: String(appId) } },
      },
    },
  };
}

function buildSubscriptionCreateRequest(groupId, product) {
  if (!groupId) throw new Error("Apple subscription request requires a subscription group ID");
  if (product.type !== "AUTO_RENEWABLE_SUBSCRIPTION") {
    throw new Error(`Apple subscription adapter refuses unexpected type: ${product.type}`);
  }
  if (!Number.isInteger(product.subscriptionLevel) || product.subscriptionLevel < 1) {
    throw new Error(`Apple subscription level is not approved: ${product.productId}`);
  }
  return {
    data: {
      type: "subscriptions",
      attributes: {
        familySharable: false,
        groupLevel: product.subscriptionLevel,
        name: product.referenceName,
        productId: product.productId,
        subscriptionPeriod: appleSubscriptionPeriod(product.duration),
      },
      relationships: {
        group: { data: { type: "subscriptionGroups", id: String(groupId) } },
      },
    },
  };
}

function buildVersionCreateRequest(resourceType, resourceId) {
  const definitions = {
    subscriptions: {
      versionType: "subscriptionVersions",
      relationship: "subscription",
    },
    inAppPurchases: {
      versionType: "inAppPurchaseVersions",
      relationship: "inAppPurchase",
    },
  };
  const definition = definitions[resourceType];
  if (!definition) throw new Error(`Unsupported Apple version resource: ${resourceType}`);
  return {
    data: {
      type: definition.versionType,
      relationships: {
        [definition.relationship]: {
          data: { type: resourceType, id: String(resourceId) },
        },
      },
    },
  };
}

function buildLocalizationRequest(versionType, versionId, localization) {
  const localizationType = {
    subscriptionVersions: "subscriptionLocalizations",
    inAppPurchaseVersions: "inAppPurchaseLocalizations",
  }[versionType];
  if (!localizationType) throw new Error(`Unsupported Apple localization version: ${versionType}`);
  return {
    data: {
      type: localizationType,
      attributes: {
        name: localization.name,
        locale: localization.locale,
        description: localization.description,
      },
      relationships: {
        version: { data: { type: versionType, id: String(versionId) } },
      },
    },
  };
}

function territoryLinkages(territoryIds) {
  if (!Array.isArray(territoryIds) || territoryIds.length === 0) {
    throw new Error("Apple availability requires at least one territory");
  }
  return territoryIds.map((id) => ({ type: "territories", id }));
}

function buildIapAvailabilityRequest(iapId, territoryIds = ["SAU"]) {
  return {
    data: {
      type: "inAppPurchaseAvailabilities",
      attributes: { availableInNewTerritories: false },
      relationships: {
        inAppPurchase: { data: { type: "inAppPurchases", id: String(iapId) } },
        availableTerritories: { data: territoryLinkages(territoryIds) },
      },
    },
  };
}

function buildSubscriptionAvailabilityRequest(subscriptionId, territoryIds = ["SAU"], planType) {
  if (!["MONTHLY", "UPFRONT"].includes(planType)) {
    throw new Error("Apple subscription availability requires an approved MONTHLY or UPFRONT plan type");
  }
  return {
    data: {
      type: "subscriptionPlanAvailabilities",
      attributes: { availableInNewTerritories: false, planType },
      relationships: {
        subscription: { data: { type: "subscriptions", id: String(subscriptionId) } },
        availableTerritories: { data: territoryLinkages(territoryIds) },
      },
    },
  };
}

function buildSubscriptionPriceRequest(subscriptionId, pricePointId, territoryId = "SAU") {
  if (!pricePointId) throw new Error("Apple subscription price request requires an approved price-point ID");
  return {
    data: {
      type: "subscriptionPrices",
      attributes: {
        planType: "UPFRONT",
        preserveCurrentPrice: false,
        startDate: null,
      },
      relationships: {
        subscription: { data: { type: "subscriptions", id: String(subscriptionId) } },
        subscriptionPricePoint: {
          data: { type: "subscriptionPricePoints", id: String(pricePointId) },
        },
        territory: { data: { type: "territories", id: territoryId } },
      },
    },
  };
}

function buildIapPriceScheduleRequest(iapId, pricePointId, territoryId = "SAU") {
  if (!pricePointId) throw new Error("Apple IAP price request requires an approved price-point ID");
  const inlineId = "${current-price}";
  return {
    data: {
      type: "inAppPurchasePriceSchedules",
      relationships: {
        inAppPurchase: { data: { type: "inAppPurchases", id: String(iapId) } },
        baseTerritory: { data: { type: "territories", id: territoryId } },
        manualPrices: { data: [{ type: "inAppPurchasePrices", id: inlineId }] },
      },
    },
    included: [
      {
        type: "inAppPurchasePrices",
        id: inlineId,
        attributes: { startDate: new Date().toISOString().slice(0, 10) },
        relationships: {
          inAppPurchaseV2: { data: { type: "inAppPurchases", id: String(iapId) } },
          inAppPurchasePricePoint: {
            data: { type: "inAppPurchasePricePoints", id: String(pricePointId) },
          },
        },
      },
    ],
  };
}

function appleStateHash(state) {
  return sha256(canonicalJson(stable(state)));
}

function appleHeaders() {
  return { Authorization: `Bearer ${createAppleToken()}` };
}

async function executeAppleShellOperation(operation, appId, groupId) {
  if (operation.action === "create_subscription_group") {
    const response = await requestJson(`${API_ROOT}/v1/subscriptionGroups`, {
      method: "POST",
      headers: appleHeaders(),
      body: buildSubscriptionGroupRequest(appId, operation.payload.referenceName),
    });
    return response?.data?.id || null;
  }
  if (operation.action === "create_iap") {
    await requestJson(`${API_ROOT}/v2/inAppPurchases`, {
      method: "POST",
      headers: appleHeaders(),
      body: buildIapCreateRequest(appId, operation.payload),
    });
    return groupId;
  }
  if (operation.action === "create_subscription") {
    if (!groupId) throw new Error("Apple subscription shell creation requires the subscription group ID");
    await requestJson(`${API_ROOT}/v1/subscriptions`, {
      method: "POST",
      headers: appleHeaders(),
      body: buildSubscriptionCreateRequest(groupId, operation.payload),
    });
    return groupId;
  }
  throw new Error(`Unsupported Apple shell operation: ${operation.action}`);
}

async function executeAppleAvailabilityOperation(operation) {
  if (operation.action !== "set_subscription_availability") {
    throw new Error(`Unsupported Apple availability operation: ${operation.action}`);
  }
  await requestJson(`${API_ROOT}/v1/subscriptionPlanAvailabilities`, {
    method: "POST",
    headers: appleHeaders(),
    body: buildSubscriptionAvailabilityRequest(
      operation.payload.appleResourceId,
      operation.payload.territories,
      operation.payload.planType,
    ),
  });
}

function buildSubscriptionLocalizationCreateRequest(subscriptionId, localization) {
  if (!localization.locale || !localization.name || !localization.description) {
    throw new Error("Apple subscription localization requires locale, name, and description");
  }
  return {
    data: {
      type: "subscriptionLocalizations",
      attributes: {
        locale: localization.locale,
        name: localization.name,
        description: localization.description,
      },
      relationships: {
        subscription: { data: { type: "subscriptions", id: String(subscriptionId) } },
      },
    },
  };
}

function buildIapLocalizationCreateRequest(iapId, localization) {
  if (!localization.locale || !localization.name || !localization.description) {
    throw new Error("Apple in-app purchase localization requires locale, name, and description");
  }
  return {
    data: {
      type: "inAppPurchaseLocalizations",
      attributes: {
        locale: localization.locale,
        name: localization.name,
        description: localization.description,
      },
      relationships: {
        inAppPurchaseV2: { data: { type: "inAppPurchases", id: String(iapId) } },
      },
    },
  };
}

async function executeAppleLocalizationOperation(operation) {
  const payload = operation.payload;
  if (operation.action === "create_subscription_localization") {
    await requestJson(`${API_ROOT}/v1/subscriptionLocalizations`, {
      method: "POST",
      headers: appleHeaders(),
      body: buildSubscriptionLocalizationCreateRequest(payload.appleResourceId, payload),
    });
    return;
  }
  if (operation.action === "create_iap_localization") {
    await requestJson(`${API_ROOT}/v1/inAppPurchaseLocalizations`, {
      method: "POST",
      headers: appleHeaders(),
      body: buildIapLocalizationCreateRequest(payload.appleResourceId, payload),
    });
    return;
  }
  throw new Error(`Unsupported Apple localization operation: ${operation.action}`);
}

async function executeAppleIapAvailabilityOperation(operation) {
  if (operation.action !== "set_iap_availability") {
    throw new Error(`Unsupported Apple iap availability operation: ${operation.action}`);
  }
  await requestJson(`${API_ROOT}/v1/inAppPurchaseAvailabilities`, {
    method: "POST",
    headers: appleHeaders(),
    body: buildIapAvailabilityRequest(operation.payload.appleResourceId, operation.payload.territories),
  });
}

async function executeApplePriceOperation(operation) {
  const product = operation.payload;
  if (operation.action === "set_subscription_price") {
    await requestJson(`${API_ROOT}/v1/subscriptionPrices`, {
      method: "POST",
      headers: appleHeaders(),
      body: buildSubscriptionPriceRequest(product.appleResourceId, product.applePricePointId),
    });
    return;
  }
  if (operation.action === "set_iap_price") {
    await requestJson(`${API_ROOT}/v1/inAppPurchasePriceSchedules`, {
      method: "POST",
      headers: appleHeaders(),
      body: buildIapPriceScheduleRequest(product.appleResourceId, product.applePricePointId),
    });
    return;
  }
  throw new Error(`Unsupported Apple price operation: ${operation.action}`);
}

async function applyApplePlan(plan, desiredState, options = {}) {
  if (!new Set(["shells", "prices", "availability", "localization", "iap_availability"]).has(plan.stage)) {
    throw new Error("Apple apply only supports reviewed shells, prices, availability, localization, or iap_availability stages");
  }
  const appId = process.env.APPLE_APP_ID || desiredState.apple.appStoreConnectAppId;
  if (!appId) throw new Error("Apple shell apply requires APPLE_APP_ID");
  const journalPath = path.resolve(options.journalPath);
  const completed = completedOperationIds(journalPath, plan.planHash);
  const current = await exportApple();
  if (completed.size === 0 && appleStateHash(current) !== plan.actualStateHash) {
    throw new Error("App Store Connect state changed after the reviewed export; regenerate and reapprove the plan");
  }
  const livePlan = buildApplePlan(desiredState, current, { stage: plan.stage });
  if (livePlan.conflicts.length) {
    throw new Error(`App Store Connect live state has ${livePlan.conflicts.length} conflict(s); apply stopped`);
  }

  let groupId = current.subscriptionGroups.find(
    (group) => group.attributes?.referenceName === "halaa_recurring",
  )?.id || null;
  const operations = [...plan.operations].sort(
    (left, right) =>
      left.phase - right.phase ||
      Number(right.action === "set_iap_price") - Number(left.action === "set_iap_price") ||
      left.id.localeCompare(right.id),
  );
  let applied = 0;
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
      if (plan.stage === "shells") {
        groupId = await executeAppleShellOperation(operation, appId, groupId);
      } else if (plan.stage === "availability") {
        await executeAppleAvailabilityOperation(operation);
      } else if (plan.stage === "localization") {
        await executeAppleLocalizationOperation(operation);
      } else if (plan.stage === "iap_availability") {
        await executeAppleIapAvailabilityOperation(operation);
      } else {
        await executeApplePriceOperation(operation);
      }
      applied += 1;
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
  return { provider: "apple", stage: plan.stage, planHash: plan.planHash, applied, journalPath };
}

module.exports = {
  appleSubscriptionPeriod,
  appleStateHash,
  applyApplePlan,
  buildIapAvailabilityRequest,
  buildIapLocalizationCreateRequest,
  buildIapCreateRequest,
  buildIapPriceScheduleRequest,
  buildLocalizationRequest,
  buildSubscriptionCreateRequest,
  buildSubscriptionAvailabilityRequest,
  buildSubscriptionGroupRequest,
  buildSubscriptionLocalizationCreateRequest,
  buildSubscriptionPriceRequest,
  buildVersionCreateRequest,
};
const path = require("node:path");
const { createAppleToken } = require("../auth/apple");
const { requestJson } = require("../lib/http");
const { stable } = require("../lib/diff");
const { canonicalJson, sha256 } = require("../lib/plan");
const { appendJournal, completedOperationIds } = require("../lib/journal");
const { buildApplePlan } = require("../lib/providerPlans");
const { exportApple } = require("./apple");

const API_ROOT = "https://api.appstoreconnect.apple.com";
