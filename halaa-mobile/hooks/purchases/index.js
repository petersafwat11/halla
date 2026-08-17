/**
 * React Query hooks over the RevenueCat wrapper (services/purchases.js) + the
 * native-billing backend client (services/billingApi.js).
 * Use these in the plans/checkout/add-on UI on native platforms (web continues
 * to use the Moyasar checkout).
 */
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  getCurrentOffering,
  getAllOfferings,
  purchasePackage,
  restorePurchases,
  isPurchasesAvailable,
} from "../../services/purchases";
import { fetchStoreCatalog, fetchFulfillment } from "../../services/billingApi";

export { usePurchaseFlow } from "./usePurchaseFlow";

export const purchasesKeys = {
  offering: () => ["purchases", "offering"],
  offerings: () => ["purchases", "offerings"],
  storeCatalog: () => ["purchases", "store-catalog"],
  fulfillment: (txnId) => ["purchases", "fulfillment", txnId],
};

/** Fetch the current RevenueCat offering (purchasable packages). */
export function useOffering() {
  return useQuery({
    queryKey: purchasesKeys.offering(),
    queryFn: getCurrentOffering,
    enabled: isPurchasesAvailable(),
    staleTime: 5 * 60 * 1000,
  });
}

/** All configured offerings, indexed by id (host_plans, business_plans, …). */
export function useAllOfferings() {
  return useQuery({
    queryKey: purchasesKeys.offerings(),
    queryFn: getAllOfferings,
    enabled: isPurchasesAvailable(),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Store-safe catalog (code → product/package/offering + policy flags). Drives
 * store-eligibility, disclosures, exact-code current-plan matching, and add-on
 * eligibility. Prices still come from the RevenueCat package, never from here.
 */
export function useStoreCatalog() {
  return useQuery({
    queryKey: purchasesKeys.storeCatalog(),
    queryFn: fetchStoreCatalog,
    enabled: isPurchasesAvailable(),
    staleTime: 30 * 60 * 1000,
  });
}

/** Fulfillment status/history for a specific store transaction (add-on/event). */
export function useFulfillment(transactionId) {
  return useQuery({
    queryKey: purchasesKeys.fulfillment(transactionId),
    queryFn: () => fetchFulfillment(transactionId),
    enabled: !!transactionId && isPurchasesAvailable(),
    staleTime: 15 * 1000,
  });
}

/**
 * Purchase a package; returns the FULL correlation set ({ transactionId,
 * storeProductId, customerInfo, transaction }). Prefer `usePurchaseFlow` for the
 * full guard→purchase→exact-reconcile lifecycle.
 */
export function usePurchasePackage() {
  return useMutation({
    mutationFn: ({ pkg, changeInfo = null }) => purchasePackage(pkg, changeInfo),
  });
}

/** Restore prior purchases (App Store review requires a restore action). */
export function useRestorePurchases() {
  return useMutation({
    mutationFn: () => restorePurchases(),
  });
}
