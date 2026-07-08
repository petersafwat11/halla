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

/**
 * All configured offerings, indexed by identifier ({ host_plans, business_plans,
 * host_addons, business_addons } — billing §5.5). Returns `offerings.all` (a map
 * keyed by offering id) so the client can resolve a package from ANY offering by
 * its canonical lookup key, not just `current`.
 */
export const getAllOfferings = async () => {
  if (!isPurchasesAvailable()) return null;
  const offerings = await Purchases.getOfferings();
  return offerings?.all || null;
};

/**
 * Purchase a package. Resolves to the FULL correlation set the exact-reconcile
 * contract needs (P0-02 / MOB-01): the store `transactionId` + `storeProductId`,
 * plus `customerInfo` and the raw `transaction`. Never discard these — the
 * backend reconciles the EXACT attempted transaction, not "some access".
 *
 * `changeInfo` (Android subscription upgrade/downgrade, P0-07/MOB-02):
 *   { oldProductIdentifier, replacementMode } where replacementMode is a
 *   STORE_REPLACEMENT_MODE key string (e.g. "CHARGE_PRORATED_PRICE",
 *   "DEFERRED"). iOS ignores it — StoreKit resolves plan changes at the
 *   subscription-group level — so it is applied on Android only.
 */
export const purchasePackage = async (pkg, changeInfo = null) => {
  if (!canPurchase()) {
    throw new Error("In-app purchases are not available on this device.");
  }

  let productChangeInfo = null;
  if (Platform.OS === "android" && changeInfo?.oldProductIdentifier) {
    const modes = Purchases?.STORE_REPLACEMENT_MODE || {};
    productChangeInfo = {
      oldProductIdentifier: changeInfo.oldProductIdentifier,
      // Enum values ARE the string keys; map through the enum when present so we
      // stay correct across SDK versions, else fall back to the literal.
      replacementMode: modes[changeInfo.replacementMode] || changeInfo.replacementMode,
    };
  }

  const result = await Purchases.purchasePackage(pkg, null, productChangeInfo);
  const transaction = result?.transaction || null;
  return {
    customerInfo: result?.customerInfo || null,
    productIdentifier: result?.productIdentifier || null,
    transaction,
    // The store transaction id used for exact reconciliation.
    transactionId: transaction?.transactionIdentifier || null,
    // The store product id (== com.halaa.<code>); used as the reconcile fallback
    // correlator and to verify the effective product.
    storeProductId: transaction?.productIdentifier || result?.productIdentifier || null,
  };
};

/**
 * Restore previously-purchased entitlements (required by App Store review).
 * Subscriptions restore via the store; consumables/event packages/add-ons are
 * NOT restorable durable entitlements — the authenticated backend ledger is
 * authoritative for those (reconcile after restore). Resolves to CustomerInfo.
 */
export const restorePurchases = async () => {
  if (!canPurchase()) return null;
  return Purchases.restorePurchases();
};

/** Current entitlement/customer snapshot. */
export const getCustomerInfo = async () => {
  if (!isPurchasesAvailable()) return null;
  return Purchases.getCustomerInfo();
};
