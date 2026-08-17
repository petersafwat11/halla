"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/http";
import { API_PATHS } from "@halaa/shared/api/paths";
import { subscriptionsKeys } from "./keys";

/**
 * Fetch the calling user's active subscription summary.
 */
export const useMySubscription = (options = {}) => {
  return useQuery({
    queryKey: subscriptionsKeys.mine(),
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
    queryKey: subscriptionsKeys.myPayments(params),
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
