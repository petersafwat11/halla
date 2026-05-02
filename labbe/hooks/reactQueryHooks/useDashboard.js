"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";

// ============================================
// DASHBOARD QUERIES
// ============================================

/**
 * Hook to fetch admin dashboard stats
 * @returns {UseQueryResult}
 */
export const useAdminDashboard = (options = {}) => {
  return useQuery({
    queryKey: ["dashboard", "admin"],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.dashboard.getAdminDashboard,
      }),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Hook to fetch host dashboard stats
 * @returns {UseQueryResult}
 */
export const useHostDashboard = (options = {}) => {
  return useQuery({
    queryKey: ["dashboard", "host"],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.dashboard.getHostDashboard,
      }),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Hook to fetch vendor dashboard stats
 * @returns {UseQueryResult}
 */
export const useVendorDashboard = (options = {}) => {
  return useQuery({
    queryKey: ["dashboard", "vendor"],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.dashboard.getVendorDashboard,
      }),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};
