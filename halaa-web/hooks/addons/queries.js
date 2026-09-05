"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/http";
import { API_PATHS } from "@halaa/shared/api/paths";
import { addonsKeys } from "./keys";

/**
 * Catalog of available addons (extra invites / reminders / design tiers /
 * business customization). Public endpoint, very long stale time — the tier
 * prices change at most once per business cycle.
 */
export const useAvailableAddons = (options = {}) => {
  return useQuery({
    queryKey: addonsKeys.catalog(),
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.addons.getCatalog,
      }),
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    ...options,
  });
};

/**
 * Current user's purchased addons. Paginated.
 */
export const useMyAddons = (params = {}, options = {}) => {
  return useQuery({
    queryKey: addonsKeys.my(params),
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.addons.listMine,
        params,
      }),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Admin fulfillment queue for custom designs. Paginated and filterable.
 */
export const useAdminFulfillment = (params = {}, options = {}) => {
  return useQuery({
    queryKey: addonsKeys.adminFulfillment(params),
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.addons.adminFulfillment,
        params,
      }),
    staleTime: 30 * 1000,
    ...options,
  });
};
