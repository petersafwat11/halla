"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";

// ============================================
// VENDORS QUERIES (Public Routes)
// ============================================

/**
 * Hook to fetch vendor categories
 * @returns {UseQueryResult}
 */
export const useVendorCategories = (options = {}) => {
  return useQuery({
    queryKey: ["vendors", "categories"],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.vendors.getCategories,
      }),
    staleTime: 60 * 60 * 1000, // 1 hour - categories rarely change
    ...options,
  });
};
