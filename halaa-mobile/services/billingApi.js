/**
 * Native-billing backend client (RevenueCat reconcile / preflight / catalog /
 * fulfillment). Thin I/O over `apiFetch` + the shared REVENUECAT endpoints.
 * Pure decision logic lives in services/billing/* (node-testable); this module
 * is the authenticated transport only.
 */

import { apiFetch } from "./http";
import { ENDPOINTS } from "../config/api";

const unwrap = async (res) => {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      body?.message ||
      body?.error ||
      body?.errors?.[0]?.message ||
      `Request failed with status ${res.status}`;
    const error = new Error(message);
    error.status = res.status;
    error.data = body;
    error.code = body?.code;
    throw error;
  }
  return body && body.data !== undefined ? body.data : body;
};

/** Store-safe catalog (store-eligible entries + per-caller eligibility). */
export async function fetchStoreCatalog() {
  const res = await apiFetch(ENDPOINTS.REVENUECAT.STORE_CATALOG, { method: "GET" });
  return unwrap(res);
}

/**
 * Deterministic state of the EXACT attempted purchase. Never reports success
 * from unrelated access (P0-02). `transactionId`/`storeProductId` correlate to
 * the store transaction just made.
 */
export async function reconcileExact({ catalogCode, transactionId, storeProductId, operation }) {
  const res = await apiFetch(ENDPOINTS.REVENUECAT.RECONCILE_EXACT, {
    method: "POST",
    body: {
      catalogCode,
      ...(transactionId ? { transactionId } : {}),
      ...(storeProductId ? { storeProductId } : {}),
      ...(operation ? { operation } : {}),
    },
  });
  return unwrap(res);
}

/** Event-package purchase preflight (call immediately before the store sheet). */
export async function eventPreflight(catalogCode) {
  const res = await apiFetch(ENDPOINTS.REVENUECAT.EVENT_PREFLIGHT, {
    method: "POST",
    body: { catalogCode },
  });
  return unwrap(res);
}

/** Add-on purchase preflight (eligibility + target checks). */
export async function addonPreflight(catalogCode) {
  const res = await apiFetch(ENDPOINTS.REVENUECAT.ADDON_PREFLIGHT, {
    method: "POST",
    body: { catalogCode },
  });
  return unwrap(res);
}

/** Fulfillment status/history for a transaction (add-on / event entitlement). */
export async function fetchFulfillment(transactionId) {
  const path = `${ENDPOINTS.REVENUECAT.FULFILLMENT}?transactionId=${encodeURIComponent(transactionId)}`;
  const res = await apiFetch(path, { method: "GET" });
  return unwrap(res);
}

/** Generic canonical state (subscription + unused event + store snapshot). */
export async function reconcileGeneric() {
  const res = await apiFetch(ENDPOINTS.REVENUECAT.RECONCILE, { method: "GET" });
  return unwrap(res);
}
