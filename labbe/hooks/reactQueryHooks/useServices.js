"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";

// ============================================
// VENDOR SERVICES QUERIES (Public)
// ============================================

/**
 * Hook to fetch all public vendor services with filtering and pagination
 * @param {Object} params - Filter and pagination params
 * @param {string} params.search - Search query
 * @param {string} params.category - Category filter
 * @param {string} params.regionId - Region filter
 * @param {string} params.cityId - City filter
 * @param {string[]} params.districtIds - Districts filter
 * @param {number} params.minPrice - Min price filter
 * @param {number} params.maxPrice - Max price filter
 * @param {number} params.minRating - Min rating filter
 * @param {number} params.page - Page number
 * @param {number} params.limit - Items per page
 * @returns {UseQueryResult}
 */
export const usePublicVendorServices = (params = {}, options = {}) => {
  const {
    search,
    category,
    regionId,
    cityId,
    districtIds,
    minPrice,
    maxPrice,
    minRating,
    page = 1,
    limit = 12,
  } = params;

  // Build query string for server-side filtering
  const buildQueryString = () => {
    const queryParams = new URLSearchParams();
    if (search) queryParams.append("search", search);
    if (category) queryParams.append("category", category);
    if (regionId) queryParams.append("regionId", regionId);
    if (cityId) queryParams.append("cityId", cityId);
    if (districtIds?.length) queryParams.append("districtIds", districtIds.join(","));
    if (minPrice) queryParams.append("minPrice", minPrice);
    if (maxPrice) queryParams.append("maxPrice", maxPrice);
    if (minRating) queryParams.append("minRating", minRating);
    queryParams.append("page", page);
    queryParams.append("limit", limit);
    return queryParams.toString();
  };

  const queryString = buildQueryString();

  return useQuery({
    queryKey: ["vendor-services", "public", queryString, params],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: `${API_PATHS.vendorServices.getPublicServices}?${queryString}`,
      }),
    staleTime: 2 * 60 * 1000,
    ...options,
  });
};

/**
 * Hook to fetch vendor services by category
 * Uses the public services endpoint with category filter
 * @param {string} category
 * @returns {UseQueryResult}
 */
export const useVendorServicesByCategory = (category, options = {}) => {
  return useQuery({
    queryKey: ["vendor-services", "category", category],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.vendorServices.getPublicServices,
        params: { category },
      }),
    enabled: !!category,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

// ============================================
// VENDOR SERVICES QUERIES (Protected)
// ============================================

/**
 * Hook to fetch my vendor services
 * @returns {UseQueryResult}
 */
export const useMyServices = (options = {}) => {
  return useQuery({
    queryKey: ["vendor-services", "my-services"],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.vendorServices.getMyServices,
      }),
    staleTime: 2 * 60 * 1000,
    ...options,
  });
};

/**
 * Hook to fetch vendor service stats
 * @returns {UseQueryResult}
 */
export const useServiceStats = (options = {}) => {
  return useQuery({
    queryKey: ["vendor-services", "stats"],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.vendorServices.getMyStats,
      }),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Hook to fetch single vendor service
 * @param {string} serviceId
 * @returns {UseQueryResult}
 */
export const useVendorService = (serviceId, options = {}) => {
  return useQuery({
    queryKey: ["vendor-services", serviceId],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.vendorServices.getService(serviceId),
      }),
    enabled: !!serviceId,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

// ============================================
// VENDOR SERVICES MUTATIONS
// ============================================

/**
 * Unified Vendor Services Mutation Hook
 * @param {string} action - The service action to perform
 * @returns {UseMutationResult}
 */
export const useServiceMutation = (action) => {
  const queryClient = useQueryClient();

  const mutations = {
    // Create Service
    createService: {
      mutationFn: (serviceData) =>
        apiRequest({
          method: "POST",
          path: API_PATHS.vendorServices.createService,
          data: serviceData,
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["vendor-services"] });
      },
    },

    // Update Service
    updateService: {
      mutationFn: ({ serviceId, data }) =>
        apiRequest({
          method: "PATCH",
          path: API_PATHS.vendorServices.updateService(serviceId),
          data,
        }),
      onSuccess: (_, { serviceId }) => {
        queryClient.invalidateQueries({ queryKey: ["vendor-services", serviceId] });
        queryClient.invalidateQueries({ queryKey: ["vendor-services", "my-services"] });
      },
    },

    // Delete Service
    deleteService: {
      mutationFn: (serviceId) =>
        apiRequest({
          method: "DELETE",
          path: API_PATHS.vendorServices.deleteService(serviceId),
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["vendor-services"] });
      },
    },

    // Toggle Service Status
    toggleStatus: {
      mutationFn: (serviceId) =>
        apiRequest({
          method: "PATCH",
          path: API_PATHS.vendorServices.toggleServiceStatus(serviceId),
        }),
      onSuccess: (_, serviceId) => {
        queryClient.invalidateQueries({ queryKey: ["vendor-services", serviceId] });
        queryClient.invalidateQueries({ queryKey: ["vendor-services", "my-services"] });
      },
    },
  };

  const mutationConfig = mutations[action];

  if (!mutationConfig) {
    throw new Error(`Unknown service action: ${action}`);
  }

  return useMutation({
    ...mutationConfig,
    onError: (error) => {
      console.error(`Service mutation error (${action}):`, error);
    },
  });
};
