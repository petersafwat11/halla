/**
 * React Query hooks over the RevenueCat wrapper (services/purchases.js).
 * Use these in the plans/checkout UI on native platforms to present and run
 * in-app purchases (web continues to use the Moyasar checkout).
 */
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  getCurrentOffering,
  purchasePackage,
  restorePurchases,
  isPurchasesAvailable,
} from "../../services/purchases";

export const purchasesKeys = {
  offering: () => ["purchases", "offering"],
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

/** Purchase a package; backend grants the plan via the RevenueCat webhook. */
export function usePurchasePackage() {
  return useMutation({
    mutationFn: (pkg) => purchasePackage(pkg),
  });
}

/** Restore prior purchases (App Store review requires a restore action). */
export function useRestorePurchases() {
  return useMutation({
    mutationFn: () => restorePurchases(),
  });
}
