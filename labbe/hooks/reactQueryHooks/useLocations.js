"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";

export const useRegions = (options = {}) => {
  return useQuery({
    queryKey: ["locations", "regions"],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.locations.getRegions,
      }),
    staleTime: 60 * 60 * 1000,
    ...options,
  });
};

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
