"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";

// ============================================
// PLANS QUERIES
// ============================================

/**
 * Hook to fetch all active plans
 * @returns {UseQueryResult}
 */
export const usePlans = (options = {}) => {
  return useQuery({
    queryKey: ["plans", "all"],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.plans.getPlans,
      }),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Hook to fetch host plans (single event + monthly)
 * @returns {UseQueryResult}
 */
export const useHostPlans = (options = {}) => {
  return useQuery({
    queryKey: ["plans", "host"],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.plans.getHostPlans,
      }),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export const useBusinessPlans = (options = {}) => {
  return useQuery({
    queryKey: ['plans', 'business'],
    queryFn: () => apiRequest({ method: 'GET', path: API_PATHS.plans.getBusinessPlans }),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};
