"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";

/**
 * ============================================
 * LOCATIONS QUERIES - Saudi Arabia Location Data
 * ============================================
 */

// Default stale/cache times for locations (rarely change)
const LOCATIONS_STALE_TIME = 60 * 60 * 1000; // 1 hour
const LOCATIONS_CACHE_TIME = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Hook to fetch all regions
 * @returns {UseQueryResult} Array of Saudi regions
 */
export const useRegions = (options = {}) => {
  return useQuery({
    queryKey: ["locations", "regions"],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.locations.getRegions,
      }),
    staleTime: LOCATIONS_STALE_TIME,
    cacheTime: LOCATIONS_CACHE_TIME,
    ...options,
  });
};

/**
 * Hook to fetch cities by region ID
 * @param {string} regionId - The region ID
 * @param {Object} options - Additional query options
 * @returns {UseQueryResult} Array of cities in the region
 */
export const useCitiesByRegion = (regionId, options = {}) => {
  return useQuery({
    queryKey: ["locations", "cities", regionId],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.locations.getCitiesByRegion(regionId),
      }),
    staleTime: LOCATIONS_STALE_TIME,
    cacheTime: LOCATIONS_CACHE_TIME,
    enabled: !!regionId, // Only fetch if regionId is provided
    ...options,
  });
};

/**
 * Hook to fetch districts by city ID
 * @param {string} cityId - The city ID
 * @param {Object} options - Additional query options
 * @returns {UseQueryResult} Array of districts in the city
 */
export const useDistrictsByCity = (cityId, options = {}) => {
  return useQuery({
    queryKey: ["locations", "districts", cityId],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.locations.getDistrictsByCity(cityId),
      }),
    staleTime: LOCATIONS_STALE_TIME,
    cacheTime: LOCATIONS_CACHE_TIME,
    enabled: !!cityId, // Only fetch if cityId is provided
    ...options,
  });
};

/**
 * Hook to fetch all locations (nested structure)
 * @returns {UseQueryResult} Complete location hierarchy
 */
export const useAllLocations = (options = {}) => {
  return useQuery({
    queryKey: ["locations", "all"],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.locations.getAllLocations,
      }),
    staleTime: LOCATIONS_STALE_TIME,
    cacheTime: LOCATIONS_CACHE_TIME,
    ...options,
  });
};

/**
 * Hook to search locations
 * @param {string} query - Search query
 * @param {Object} options - Additional query options
 * @returns {UseQueryResult} Search results
 */
export const useSearchLocations = (query, options = {}) => {
  return useQuery({
    queryKey: ["locations", "search", query],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: `${API_PATHS.locations.searchLocations}?q=${encodeURIComponent(query)}`,
      }),
    staleTime: 5 * 60 * 1000, // 5 minutes for search
    cacheTime: 10 * 60 * 1000,
    enabled: !!query && query.length > 0, // Only fetch if query is provided
    ...options,
  });
};

/**
 * ============================================
 * PLANS QUERIES - For WhiteLabel Signup
 * ============================================
 */

const PLANS_STALE_TIME = 5 * 60 * 1000; // 5 minutes
const PLANS_CACHE_TIME = 10 * 60 * 1000; // 10 minutes

/**
 * Hook to fetch all active plans
 * @returns {UseQueryResult} Array of plans
 */
export const usePlans = (options = {}) => {
  return useQuery({
    queryKey: ["plans"],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.plans.getPlans,
      }),
    staleTime: PLANS_STALE_TIME,
    cacheTime: PLANS_CACHE_TIME,
    ...options,
  });
};

/**
 * Hook to fetch enterprise plans for WhiteLabel
 * @returns {UseQueryResult} Array of enterprise plans
 */
export const useEnterprisePlans = (options = {}) => {
  return useQuery({
    queryKey: ["plans", "enterprise"],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.plans.getEnterprisePlans,
      }),
    staleTime: PLANS_STALE_TIME,
    cacheTime: PLANS_CACHE_TIME,
    ...options,
  });
};

/**
 * Hook to fetch host plans
 * @returns {UseQueryResult} Array of host plans
 */
export const useHostPlans = (options = {}) => {
  return useQuery({
    queryKey: ["plans", "host"],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.plans.getHostPlans,
      }),
    staleTime: PLANS_STALE_TIME,
    cacheTime: PLANS_CACHE_TIME,
    ...options,
  });
};

/**
 * Hook to fetch plan by code
 * @param {string} code - Plan code
 * @returns {UseQueryResult} Plan details
 */
export const usePlanByCode = (code, options = {}) => {
  return useQuery({
    queryKey: ["plans", "code", code],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.plans.getPlanByCode(code),
      }),
    staleTime: PLANS_STALE_TIME,
    cacheTime: PLANS_CACHE_TIME,
    enabled: !!code,
    ...options,
  });
};

/**
 * Hook to fetch plan by ID
 * @param {string} id - Plan ID
 * @returns {UseQueryResult} Plan details
 */
export const usePlanById = (id, options = {}) => {
  return useQuery({
    queryKey: ["plans", id],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.plans.getPlanById(id),
      }),
    staleTime: PLANS_STALE_TIME,
    cacheTime: PLANS_CACHE_TIME,
    enabled: !!id,
    ...options,
  });
};

// Default export
export default {
  useRegions,
  useCitiesByRegion,
  useDistrictsByCity,
  useAllLocations,
  useSearchLocations,
  usePlans,
  useEnterprisePlans,
  useHostPlans,
  usePlanByCode,
  usePlanById,
};
