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

/**
 * Hook to fetch approved vendors (marketplace)
 * @param {Object} params - Query parameters (filters, pagination)
 * @returns {UseQueryResult}
 */
export const useVendors = (params = {}, options = {}) => {
  return useQuery({
    queryKey: ["vendors", "marketplace", params],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.vendors.getVendors,
        params,
      }),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Hook to fetch single vendor by ID
 * @param {string} vendorId
 * @returns {UseQueryResult}
 */
export const useVendorPublic = (vendorId, options = {}) => {
  return useQuery({
    queryKey: ["vendors", "public", vendorId],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.vendors.getVendorById(vendorId),
      }),
    enabled: !!vendorId,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};
