/**
 * Account-bound persistent storage for the native purchase queue (PR5 / F-08).
 *
 * Enforces:
 *   - Keyed specifically to billingUserId (never cross-account).
 *   - No tokens, receipts, or sensitive PII payload is stored.
 *   - Survives app kill, crash, and restart.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { sanitizeQueueForStorage, purchaseQueueSchema } from "@halaa/shared/schemas/purchaseQueue";

const STORAGE_PREFIX = "@purchaseQueue:";

export const getQueueStorageKey = (billingUserId) => {
  if (!billingUserId || typeof billingUserId !== "string") return null;
  return `${STORAGE_PREFIX}${billingUserId.trim()}`;
};

export async function savePurchaseQueue(billingUserId, queue) {
  const key = getQueueStorageKey(billingUserId);
  if (!key || !queue) return;

  try {
    const sanitized = sanitizeQueueForStorage(queue);
    await AsyncStorage.setItem(key, JSON.stringify(sanitized));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[purchaseQueueStorage] Failed to save queue:", error?.message);
  }
}

export async function loadPurchaseQueue(billingUserId) {
  const key = getQueueStorageKey(billingUserId);
  if (!key) return null;

  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.billingUserId !== billingUserId.trim()) {
      return null;
    }
    return purchaseQueueSchema.parse(parsed);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[purchaseQueueStorage] Failed to load queue:", error?.message);
    return null;
  }
}

export async function clearPurchaseQueue(billingUserId) {
  const key = getQueueStorageKey(billingUserId);
  if (!key) return;

  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[purchaseQueueStorage] Failed to clear queue:", error?.message);
  }
}
