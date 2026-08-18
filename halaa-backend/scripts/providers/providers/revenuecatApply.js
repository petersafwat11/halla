const path = require("node:path");
const { requestJson } = require("../lib/http");
const { exportRevenueCat } = require("./revenuecat");
const { stable } = require("../lib/diff");
const { canonicalJson, sha256 } = require("../lib/plan");
const { appendJournal, completedOperationIds } = require("../lib/journal");
const { associationProductId, buildRevenueCatPlan } = require("../lib/providerPlans");

const BASE_URL = "https://api.revenuecat.com/v2";

function chunks(items, size = 50) {
  const result = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

function stateHash(state) {
  return sha256(canonicalJson(stable(state)));
}

function indexState(state, desired) {
  const productsByProviderKey = new Map(
    state.products.map((item) => [`${item.app_id}:${item.store_identifier}`, item]),
  );
  const productsByConnectionKey = new Map();
  for (const product of desired.products) {
    const appId = product.platform === "ios"
      ? process.env.REVENUECAT_IOS_APP_ID
      : process.env.REVENUECAT_ANDROID_APP_ID;
    const existing = productsByProviderKey.get(`${appId}:${product.storeIdentifier}`);
    if (existing) productsByConnectionKey.set(product.connectionKey, existing);
  }
  const entitlementsByLookupKey = new Map(
    state.entitlements.map((item) => [item.lookup_key, item]),
  );
  const offeringsByLookupKey = new Map(state.offerings.map((item) => [item.lookup_key, item]));
  const packagesByKey = new Map();
  for (const offering of state.offerings) {
    for (const pkg of offering.packages || []) {
      packagesByKey.set(`${offering.lookup_key}:${pkg.lookup_key}`, pkg);
    }
  }
  return {
    productsByConnectionKey,
    entitlementsByLookupKey,
    offeringsByLookupKey,
    packagesByKey,
  };
}

function idsFromAssociations(items) {
  return new Set((items || []).map(associationProductId).filter(Boolean));
}

async function reconcileEntitlement(projectPath, headers, operation, index) {
  const entitlement = index.entitlementsByLookupKey.get(operation.payload.lookupKey);
  if (!entitlement) throw new Error(`Entitlement not found after create: ${operation.payload.lookupKey}`);
  const desiredIds = operation.payload.productConnectionKeys.map((key) => {
    const product = index.productsByConnectionKey.get(key);
    if (!product) throw new Error(`RevenueCat product connection not found: ${key}`);
    return product.id;
  });
  const currentIds = idsFromAssociations(entitlement.products);
  const missing = desiredIds.filter((id) => !currentIds.has(id));
  const desiredSet = new Set(desiredIds);
  const extra = [...currentIds].filter((id) => !desiredSet.has(id));

  for (const batch of chunks(extra)) {
    await requestJson(
      `${projectPath}/entitlements/${encodeURIComponent(entitlement.id)}/actions/detach_products`,
      { method: "POST", headers, body: { product_ids: batch } },
    );
  }
  for (const batch of chunks(missing)) {
    await requestJson(
      `${projectPath}/entitlements/${encodeURIComponent(entitlement.id)}/actions/attach_products`,
      { method: "POST", headers, body: { product_ids: batch } },
    );
  }
  entitlement.products = desiredIds.map((id) => ({ id }));
}

async function reconcilePackage(projectPath, headers, operation, index) {
  const pkg = index.packagesByKey.get(operation.key);
  if (!pkg) throw new Error(`Package not found after create: ${operation.key}`);
  const desiredIds = [operation.payload.iosConnectionKey, operation.payload.androidConnectionKey].map(
    (key) => {
      const product = index.productsByConnectionKey.get(key);
      if (!product) throw new Error(`RevenueCat product connection not found: ${key}`);
      return product.id;
    },
  );
  const currentIds = idsFromAssociations(pkg.products);
  const missing = desiredIds.filter((id) => !currentIds.has(id));
  const desiredSet = new Set(desiredIds);
  const extra = [...currentIds].filter((id) => !desiredSet.has(id));

  for (const batch of chunks(extra)) {
    await requestJson(
      `${projectPath}/packages/${encodeURIComponent(pkg.id)}/actions/detach_products`,
      { method: "POST", headers, body: { product_ids: batch } },
    );
  }
  for (const batch of chunks(missing)) {
    await requestJson(
      `${projectPath}/packages/${encodeURIComponent(pkg.id)}/actions/attach_products`,
      {
        method: "POST",
        headers,
        body: {
          products: batch.map((productId) => ({
            product_id: productId,
            eligibility_criteria: "all",
          })),
        },
      },
    );
  }
  pkg.products = desiredIds.map((id) => ({ id }));
}

async function executeOperation(projectPath, headers, operation, index) {
  if (operation.action === "create_product_connection") {
    if (index.productsByConnectionKey.has(operation.key)) return;
    const created = await requestJson(`${projectPath}/products`, {
      method: "POST",
      headers,
      body: {
        store_identifier: operation.payload.storeIdentifier,
        app_id: operation.payload.appId,
        type: operation.payload.type,
        display_name: operation.payload.displayName,
      },
    });
    index.productsByConnectionKey.set(operation.key, created);
    return;
  }
  if (operation.action === "create_entitlement") {
    if (index.entitlementsByLookupKey.has(operation.key)) return;
    const created = await requestJson(`${projectPath}/entitlements`, {
      method: "POST",
      headers,
      body: {
        lookup_key: operation.payload.lookupKey,
        display_name: operation.payload.displayName,
      },
    });
    created.products = created.products?.items || [];
    index.entitlementsByLookupKey.set(operation.key, created);
    return;
  }
  if (operation.action === "create_offering") {
    if (index.offeringsByLookupKey.has(operation.key)) return;
    const created = await requestJson(`${projectPath}/offerings`, {
      method: "POST",
      headers,
      body: {
        lookup_key: operation.payload.lookupKey,
        display_name: operation.payload.displayName,
      },
    });
    created.packages = [];
    index.offeringsByLookupKey.set(operation.key, created);
    return;
  }
  if (operation.action === "create_package") {
    if (index.packagesByKey.has(operation.key)) return;
    const offering = index.offeringsByLookupKey.get(operation.payload.offeringLookupKey);
    if (!offering) throw new Error(`Offering not found after create: ${operation.payload.offeringLookupKey}`);
    const created = await requestJson(
      `${projectPath}/offerings/${encodeURIComponent(offering.id)}/packages`,
      {
        method: "POST",
        headers,
        body: {
          lookup_key: operation.payload.lookupKey,
          display_name: operation.payload.lookupKey,
          position: operation.payload.position,
        },
      },
    );
    created.products = created.products?.items || [];
    index.packagesByKey.set(operation.key, created);
    return;
  }
  if (operation.action === "reconcile_entitlement_products") {
    await reconcileEntitlement(projectPath, headers, operation, index);
    return;
  }
  if (operation.action === "reconcile_package_products") {
    await reconcilePackage(projectPath, headers, operation, index);
    return;
  }
  throw new Error(`Unsupported RevenueCat operation: ${operation.action}`);
}

async function applyRevenueCatPlan(plan, desiredState, options = {}) {
  const apiKey = process.env.REVENUECAT_API_KEY;
  const projectId = process.env.REVENUECAT_PROJECT_ID || desiredState.revenueCat.projectId;
  if (!apiKey) throw new Error("RevenueCat apply requires REVENUECAT_API_KEY");
  if (!process.env.REVENUECAT_IOS_APP_ID || !process.env.REVENUECAT_ANDROID_APP_ID) {
    throw new Error("RevenueCat apply requires REVENUECAT_IOS_APP_ID and REVENUECAT_ANDROID_APP_ID");
  }
  const headers = { Authorization: `Bearer ${apiKey}` };
  const projectPath = `${BASE_URL}/projects/${encodeURIComponent(projectId)}`;
  const journalPath = path.resolve(options.journalPath);
  const completed = completedOperationIds(journalPath, plan.planHash);
  const current = await exportRevenueCat();

  if (completed.size === 0 && stateHash(current) !== plan.actualStateHash) {
    throw new Error("RevenueCat state changed after the reviewed export; regenerate and reapprove the plan");
  }
  const livePlan = buildRevenueCatPlan(desiredState, current);
  if (livePlan.conflicts.length) {
    throw new Error(`RevenueCat live state has ${livePlan.conflicts.length} conflict(s); apply stopped`);
  }

  const index = indexState(current, desiredState.revenueCat);
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
      await executeOperation(projectPath, headers, operation, index);
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
  return { provider: "revenueCat", planHash: plan.planHash, journalPath };
}

module.exports = { applyRevenueCatPlan, stateHash, chunks };
