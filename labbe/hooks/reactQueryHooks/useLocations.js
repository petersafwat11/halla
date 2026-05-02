"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";

// ============================================
// LOCATIONS QUERIES (Public Routes)
// ============================================

/**
 * Hook to fetch all Saudi Arabia regions
 * @returns {UseQueryResult}
 */
export const useRegions = (options = {}) => {
  return useQuery({
    queryKey: ["locations", "regions"],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.locations.getRegions,
      }),
    staleTime: 60 * 60 * 1000, // 1 hour - regions rarely change
    ...options,
  });
};

/**
 * Hook to fetch cities by region
 * @param {string} regionId
 * @returns {UseQueryResult}
 */
export const useCitiesByRegion = (regionId, options = {}) => {
  return useQuery({
    queryKey: ["locations", "cities", regionId],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.locations.getCitiesByRegion(regionId),
      }),
    enabled: !!regionId,
    staleTime: 60 * 60 * 1000,
    ...options,
  });
};

/**
 * Hook to fetch districts by city
 * @param {string} cityId
 * @returns {UseQueryResult}
 */
export const useDistrictsByCity = (cityId, options = {}) => {
  return useQuery({
    queryKey: ["locations", "districts", cityId],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.locations.getDistrictsByCity(cityId),
      }),
    enabled: !!cityId,
    staleTime: 60 * 60 * 1000,
    ...options,
  });
};

/**
 * Hook to fetch all locations (regions with cities and districts)
 * @returns {UseQueryResult}
 */
export const useAllLocations = (options = {}) => {
  return useQuery({
    queryKey: ["locations", "all"],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.locations.getAllLocations,
      }),
    staleTime: 60 * 60 * 1000,
    ...options,
  });
};

/**
 * Hook to search locations
 * @param {string} query
 * @returns {UseQueryResult}
 */
export const useSearchLocations = (query, options = {}) => {
  return useQuery({
    queryKey: ["locations", "search", query],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.locations.searchLocations,
        params: { q: query },
      }),
    enabled: !!query && query.length >= 2,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Hook to resolve location names from IDs
 * @param {Object} locationIds - { regionId, cityId, districtId }
 * @returns {UseQueryResult}
 */
export const useResolveLocationNames = (locationIds, options = {}) => {
  const { regionId, cityId, districtId } = locationIds || {};

  return useQuery({
    queryKey: ["locations", "resolve", regionId, cityId, districtId],
    queryFn: () =>
      apiRequest({
        method: "POST",
        path: API_PATHS.locations.resolveLocationNames,
        data: { regionId, cityId, districtId },
      }),
    enabled: !!(regionId || cityId || districtId),
    staleTime: 60 * 60 * 1000,
    ...options,
  });
};
