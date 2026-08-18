const { createAppleToken } = require("../auth/apple");
const { collectJsonApiPages, requestJson } = require("../lib/http");

const BASE_URL = "https://api.appstoreconnect.apple.com/v1";
const API_ROOT = "https://api.appstoreconnect.apple.com";

function selectResource(resource) {
  return {
    id: resource.id,
    type: resource.type,
    attributes: resource.attributes || {},
    relationships: Object.fromEntries(
      Object.entries(resource.relationships || {}).map(([key, relationship]) => [
        key,
        relationship.data || null,
      ]),
    ),
  };
}

async function readSubscriptionPlanAvailabilities(subscription, headers) {
  const records = await collectJsonApiPages(
    `${BASE_URL}/subscriptions/${encodeURIComponent(subscription.id)}/planAvailabilities?limit=10`,
    headers,
  );
  return Promise.all(
    records.map(async (record) => {
      const territories = await collectJsonApiPages(
        `${BASE_URL}/subscriptionPlanAvailabilities/${encodeURIComponent(record.id)}/availableTerritories?limit=200`,
        headers,
      );
      return {
        id: record.id,
        subscriptionId: subscription.id,
        productId: subscription.attributes?.productId || null,
        planType: record.attributes?.planType || null,
        availableInNewTerritories: record.attributes?.availableInNewTerritories ?? null,
        territories: territories.map((territory) => territory.id),
      };
    }),
  );
}

async function readSubscriptionLocalizations(subscription, headers) {
  const records = await collectJsonApiPages(
    `${BASE_URL}/subscriptions/${encodeURIComponent(subscription.id)}/subscriptionLocalizations?limit=20`,
    headers,
  );
  return records.map((record) => ({
    id: record.id,
    subscriptionId: subscription.id,
    productId: subscription.attributes?.productId || null,
    locale: record.attributes?.locale || null,
    name: record.attributes?.name || null,
    description: record.attributes?.description || null,
  }));
}

async function readIapLocalizations(iap, headers) {
  const records = await collectJsonApiPages(
    `${BASE_URL}/v2/inAppPurchases/${encodeURIComponent(iap.id)}/inAppPurchaseLocalizations?limit=20`,
    headers,
  );
  return records.map((record) => ({
    id: record.id,
    iapId: iap.id,
    productId: iap.attributes?.productId || null,
    locale: record.attributes?.locale || null,
    name: record.attributes?.name || null,
    description: record.attributes?.description || null,
  }));
}

async function readIapAvailability(iap, headers) {
  let availability;
  try {
    availability = await requestJson(
      `${BASE_URL}/v2/inAppPurchases/${encodeURIComponent(iap.id)}/inAppPurchaseAvailability`,
      { headers },
    );
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }
  const record = availability?.data;
  if (!record) return null;
  let territories = null;
  for (const candidate of ["v1", "v2"]) {
    try {
      const items = await collectJsonApiPages(
        `${API_ROOT}/${candidate}/inAppPurchaseAvailabilities/${encodeURIComponent(record.id)}/availableTerritories?limit=200`,
        headers,
      );
      territories = items.map((territory) => territory.id);
      break;
    } catch (error) {
      if (error.status !== 404) throw error;
    }
  }
  return {
    id: record.id,
    iapId: iap.id,
    productId: iap.attributes?.productId || null,
    availableInNewTerritories: record.attributes?.availableInNewTerritories ?? null,
    territories,
  };
}

async function readSubscriptionPrices(subscription, headers) {
  let page;
  try {
    page = await requestJson(
      `${BASE_URL}/subscriptions/${encodeURIComponent(subscription.id)}/prices?include=subscriptionPricePoint,territory&limit=10`,
      { headers },
    );
  } catch (error) {
    if (error.status === 404) return [];
    throw error;
  }
  const included = page?.included || [];
  const point = included.find((item) => item.type === "subscriptionPricePoints");
  const territory = included.find((item) => item.type === "territories");
  return (page?.data || []).map((record) => ({
    id: record.id,
    subscriptionId: subscription.id,
    productId: subscription.attributes?.productId || null,
    pricePointId: point?.id || null,
    territory: territory?.id || null,
    startDate: record.attributes?.startDate || null,
  }));
}

async function readIapPrices(iap, headers) {
  let page;
  try {
    page = await requestJson(
      `${BASE_URL}/v1/inAppPurchasePriceSchedules/${encodeURIComponent(iap.id)}/manualPrices?include=inAppPurchasePricePoint,territory&limit=10`,
      { headers },
    );
  } catch (error) {
    if (error.status === 404) return [];
    throw error;
  }
  const included = page?.included || [];
  const point = included.find((item) => item.type === "inAppPurchasePricePoints");
  const territory = included.find((item) => item.type === "territories");
  return (page?.data || []).map((record) => ({
    id: record.id,
    iapId: iap.id,
    productId: iap.attributes?.productId || null,
    pricePointId: point?.id || null,
    territory: territory?.id || null,
    startDate: record.attributes?.startDate || null,
  }));
}

async function exportApple() {
  const appId = process.env.APPLE_APP_ID;
  if (!appId) throw new Error("Apple export requires APPLE_APP_ID");
  const headers = { Authorization: `Bearer ${createAppleToken()}` };

  const inAppPurchases = await collectJsonApiPages(
    `${BASE_URL}/apps/${encodeURIComponent(appId)}/inAppPurchasesV2?limit=200`,
    headers,
  );
  const groups = await collectJsonApiPages(
    `${BASE_URL}/apps/${encodeURIComponent(appId)}/subscriptionGroups?limit=200`,
    headers,
  );
  const subscriptions = [];
  for (const group of groups) {
    const items = await collectJsonApiPages(
      `${BASE_URL}/subscriptionGroups/${encodeURIComponent(group.id)}/subscriptions?limit=200`,
      headers,
    );
    subscriptions.push(...items);
  }

  const planAvailabilities = [];
  const subscriptionLocalizations = [];
  const subscriptionPrices = [];
  for (const subscription of subscriptions) {
    planAvailabilities.push(...(await readSubscriptionPlanAvailabilities(subscription, headers)));
    subscriptionLocalizations.push(...(await readSubscriptionLocalizations(subscription, headers)));
    subscriptionPrices.push(...(await readSubscriptionPrices(subscription, headers)));
  }

  const iapLocalizations = [];
  const iapAvailabilities = [];
  const iapPrices = [];
  for (const iap of inAppPurchases) {
    iapLocalizations.push(...(await readIapLocalizations(iap, headers)));
    const availability = await readIapAvailability(iap, headers);
    if (availability) iapAvailabilities.push(availability);
    iapPrices.push(...(await readIapPrices(iap, headers)));
  }

  return {
    provider: "apple",
    appId,
    inAppPurchases: inAppPurchases.map(selectResource),
    subscriptionGroups: groups.map(selectResource),
    subscriptions: subscriptions.map(selectResource),
    subscriptionPlanAvailabilities: planAvailabilities,
    subscriptionLocalizations,
    subscriptionPrices,
    iapLocalizations,
    iapAvailabilities,
    iapPrices,
  };
}

async function findSaudiPricePoint(resourceType, resourceId, targetAmount, headers) {
  const endpoint = resourceType === "AUTO_RENEWABLE_SUBSCRIPTION"
    ? `v1/subscriptions/${encodeURIComponent(resourceId)}/pricePoints`
    : `v2/inAppPurchases/${encodeURIComponent(resourceId)}/pricePoints`;
  const first = new URL(`${API_ROOT}/${endpoint}`);
  first.searchParams.set("filter[territory]", "SAU");
  first.searchParams.set("limit", "200");
  let next = first.toString();
  let pagesRead = 0;
  let nearestLower = null;
  let nearestHigher = null;
  while (next) {
    const page = await requestJson(next, { headers });
    pagesRead += 1;
    const matches = (page.data || []).filter(
      (item) => Number(item.attributes?.customerPrice) === Number(targetAmount),
    );
    if (matches.length > 1) {
      throw new Error(`${resourceType} ${resourceId} returned duplicate Saudi price points for SAR ${targetAmount}`);
    }
    if (matches.length === 1) {
      const match = matches[0];
      return {
        id: match.id,
        customerPrice: match.attributes?.customerPrice,
        proceeds: match.attributes?.proceeds ?? null,
        pagesRead,
        nearestLower: null,
        nearestHigher: null,
      };
    }
    for (const item of page.data || []) {
      const amount = Number(item.attributes?.customerPrice);
      const option = {
        id: item.id,
        customerPrice: item.attributes?.customerPrice,
        proceeds: item.attributes?.proceeds ?? null,
      };
      if (amount < Number(targetAmount) && (!nearestLower || amount > Number(nearestLower.customerPrice))) {
        nearestLower = option;
      }
      if (amount > Number(targetAmount) && (!nearestHigher || amount < Number(nearestHigher.customerPrice))) {
        nearestHigher = option;
      }
    }
    next = page.links?.next || null;
  }
  return {
    id: null,
    customerPrice: null,
    proceeds: null,
    pagesRead,
    nearestLower,
    nearestHigher,
  };
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

async function buildApplePricePointReview(desiredState) {
  const current = await exportApple();
  const iaps = new Map(current.inAppPurchases.map((item) => [item.attributes?.productId, item]));
  const subscriptions = new Map(current.subscriptions.map((item) => [item.attributes?.productId, item]));
  const headers = { Authorization: `Bearer ${createAppleToken()}` };
  const products = await mapWithConcurrency(desiredState.apple.products, 4, async (product) => {
    const shell = product.type === "AUTO_RENEWABLE_SUBSCRIPTION"
      ? subscriptions.get(product.productId)
      : iaps.get(product.productId);
    if (!shell) {
      return { code: product.code, productId: product.productId, status: "SHELL_NOT_FOUND" };
    }
    const candidate = await findSaudiPricePoint(
      product.type,
      shell.id,
      product.targetPrice.amount,
      headers,
    );
    const alternatives = [candidate.nearestLower, candidate.nearestHigher].filter(Boolean);
    const requiresHigherAccess = !candidate.id && !candidate.nearestHigher && Boolean(candidate.nearestLower);
    const recommended = candidate.id
      ? { id: candidate.id, customerPrice: candidate.customerPrice, proceeds: candidate.proceeds }
      : requiresHigherAccess
        ? null
      : alternatives.toSorted(
          (left, right) =>
            Math.abs(Number(left.customerPrice) - Number(product.targetPrice.amount)) -
            Math.abs(Number(right.customerPrice) - Number(product.targetPrice.amount)),
        )[0] || null;
    return {
      code: product.code,
      productId: product.productId,
      appleResourceId: shell.id,
      type: product.type,
      targetCurrency: "SAR",
      targetAmount: product.targetPrice.amount,
      candidatePricePointId: candidate.id,
      appleCustomerPrice: candidate.customerPrice,
      estimatedProceeds: candidate.proceeds,
      nearestLower: candidate.nearestLower,
      nearestHigher: candidate.nearestHigher,
      recommendedPricePointId: recommended?.id || null,
      recommendedCustomerPrice: recommended?.customerPrice || null,
      differenceFromTarget: recommended
        ? Number((Number(recommended.customerPrice) - Number(product.targetPrice.amount)).toFixed(2))
        : null,
      status: candidate.id
        ? "EXACT_SAR_MATCH_AWAITING_APPROVAL"
        : requiresHigherAccess
          ? "HIGHER_PRICE_POINT_ACCESS_REQUIRED"
          : "NEAREST_PRICE_AWAITING_APPROVAL",
      pagesRead: candidate.pagesRead,
    };
  });
  return {
    schemaVersion: 1,
    mode: "READ_ONLY_PRICE_POINT_REVIEW",
    externalWrites: 0,
    baseTerritory: "SAU",
    currency: "SAR",
    catalogHash: desiredState.source.catalogHash,
    products,
    summary: {
      products: products.length,
      exactMatches: products.filter((product) => product.status === "EXACT_SAR_MATCH_AWAITING_APPROVAL").length,
      nearestPriceApprovals: products.filter((product) => product.status === "NEAREST_PRICE_AWAITING_APPROVAL").length,
      higherPricePointAccessRequired: products.filter(
        (product) => product.status === "HIGHER_PRICE_POINT_ACCESS_REQUIRED",
      ).length,
      unresolved: products.filter((product) => !product.recommendedPricePointId).length,
    },
  };
}

module.exports = { buildApplePricePointReview, exportApple, findSaudiPricePoint };
