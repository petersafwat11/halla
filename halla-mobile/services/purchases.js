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
let currentAppUserId = null;
let signedOut = false;

/** True when react-native-purchases can run and an API key is present. */
export const isPurchasesAvailable = () =>
  Platform.OS !== "web" && !!Purchases && !!apiKey;

/**
 * True only when RevenueCat is configured with an IDENTIFIED, signed-in user.
 * Purchase/restore must be disabled otherwise (§9.1) so a purchase never lands
 * on an anonymous RevenueCat id.
 */
export const canPurchase = () =>
  isPurchasesAvailable() && configured && !signedOut && !!currentAppUserId;

/**
 * Configure / re-identify RevenueCat with the signed-in user's STABLE billing
 * id (User.billingUserId — never the Mongo _id, phone, or email; §9.1).
 *
 * - First authed user: `configure({ appUserID })`.
 * - Account switch: `Purchases.logIn(newId)` — we deliberately DO NOT call
 *   `logOut()` (it creates an anonymous RevenueCat id that purchases could
 *   attach to). Signed-out state just disables purchasing until the next
 *   `initPurchases`.
 * Safe to call repeatedly / when unavailable.
 */
export const initPurchases = async (appUserId) => {
  if (!isPurchasesAvailable() || !appUserId) return;
  const id = String(appUserId);
  try {
    if (!configured) {
      Purchases.configure({ apiKey, appUserID: id });
      configured = true;
      currentAppUserId = id;
    } else if (currentAppUserId !== id) {
      await Purchases.logIn(id);
      currentAppUserId = id;
    }
    signedOut = false;
  } catch (err) {
    console.error("[purchases] configure/logIn failed:", err);
  }
};

/**
 * Call on logout. Disables purchasing without calling `Purchases.logOut()`
 * (which would mint an anonymous id). The next `initPurchases` re-identifies.
 */
export const onSignedOut = () => {
  signedOut = true;
  currentAppUserId = null;
};

/** The current offering (set of purchasable packages) from RevenueCat. */
export const getCurrentOffering = async () => {
  if (!isPurchasesAvailable()) return null;
  const offerings = await Purchases.getOfferings();
  return offerings?.current || null;
};

/** Purchase a package; resolves to the updated CustomerInfo. */
export const purchasePackage = async (pkg) => {
  if (!canPurchase()) {
    throw new Error("In-app purchases are not available on this device.");
  }
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo;
};

/** Restore previously-purchased entitlements (required by App Store review). */
export const restorePurchases = async () => {
  if (!canPurchase()) return null;
  return Purchases.restorePurchases();
};

/** Current entitlement/customer snapshot. */
export const getCustomerInfo = async () => {
  if (!isPurchasesAvailable()) return null;
  return Purchases.getCustomerInfo();
};
