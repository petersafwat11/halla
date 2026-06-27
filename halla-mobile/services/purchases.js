/**
 * RevenueCat (in-app purchases) wrapper.
 *
 * Apple App Store + Google Play require native in-app billing for digital
 * goods in the Saudi storefront (StoreKit / Play Billing) — the in-app Moyasar
 * card flow is web-only. RevenueCat abstracts both stores and validates
 * receipts server-side, notifying our backend via webhook to grant the plan.
 *
 * `react-native-purchases` is a native module with no web support, so it is
 * required lazily on native only — importing it on web would break the bundle.
 * Every function no-ops safely when purchases aren't configured (no keys, or
 * web), so callers can call them unconditionally.
 *
 * Keys come from app.config.js `extra.revenueCat` (REVENUECAT_IOS_KEY /
 * REVENUECAT_ANDROID_KEY env vars). Until they're set, IAP is inert.
 */
import { Platform } from "react-native";
import Constants from "expo-constants";

let Purchases = null;
if (Platform.OS !== "web") {
  // eslint-disable-next-line global-require
  Purchases = require("react-native-purchases").default;
}

const keys = Constants.expoConfig?.extra?.revenueCat || {};
const apiKey = Platform.OS === "ios" ? keys.iosKey : keys.androidKey;

let configured = false;

/** True when react-native-purchases can run and an API key is present. */
export const isPurchasesAvailable = () =>
  Platform.OS !== "web" && !!Purchases && !!apiKey;

/**
 * Configure RevenueCat with the signed-in user's id so purchases are attached
 * to the account (and the backend webhook can map app_user_id -> our user).
 * Safe to call repeatedly / when unavailable.
 */
export const initPurchases = async (appUserId) => {
  if (!isPurchasesAvailable() || configured) return;
  try {
    Purchases.configure({
      apiKey,
      appUserID: appUserId ? String(appUserId) : undefined,
    });
    configured = true;
  } catch (err) {
    console.error("[purchases] configure failed:", err);
  }
};

/** The current offering (set of purchasable packages) from RevenueCat. */
export const getCurrentOffering = async () => {
  if (!isPurchasesAvailable()) return null;
  const offerings = await Purchases.getOfferings();
  return offerings?.current || null;
};

/** Purchase a package; resolves to the updated CustomerInfo. */
export const purchasePackage = async (pkg) => {
  if (!isPurchasesAvailable()) {
    throw new Error("In-app purchases are not available on this device.");
  }
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo;
};

/** Restore previously-purchased entitlements (required by App Store review). */
export const restorePurchases = async () => {
  if (!isPurchasesAvailable()) return null;
  return Purchases.restorePurchases();
};

/** Current entitlement/customer snapshot. */
export const getCustomerInfo = async () => {
  if (!isPurchasesAvailable()) return null;
  return Purchases.getCustomerInfo();
};
