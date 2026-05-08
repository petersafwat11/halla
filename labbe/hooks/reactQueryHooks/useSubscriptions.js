"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";

/**
 * Fetch the calling user's active subscription summary.
 */
export const useMySubscription = (options = {}) => {
  return useQuery({
    queryKey: ["subscriptions", "my-subscription"],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.subscriptions.getMySubscription,
      }),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Fetch the calling user's payment history (paginated).
 */
export const useMyPayments = (params = {}, options = {}) => {
  return useQuery({
    queryKey: ["subscriptions", "my-payments", params],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.subscriptions.getMyPayments,
        params,
      }),
    staleTime: 2 * 60 * 1000,
    ...options,
  });
};
