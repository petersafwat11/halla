import { useQuery } from "@tanstack/react-query";
import { ENDPOINTS } from "../../config/api";
import { apiFetch } from "../../services/http";
import { locationsKeys } from "./keys";

const STALE_TIME = 60 * 60 * 1000;
const GC_TIME = 24 * 60 * 60 * 1000;

const _request = async (path, errorMessage) => {
  const response = await apiFetch(path, { method: "GET" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || errorMessage);
  return data;
};

export const useRegions = (options = {}) =>
  useQuery({
    queryKey: locationsKeys.regions(),
    queryFn: () => _request(ENDPOINTS.LOCATIONS.REGIONS, "Failed to fetch regions"),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    ...options,
  });

export const useCitiesByRegion = (regionId, options = {}) =>
  useQuery({
    queryKey: locationsKeys.cities(regionId),
    queryFn: () =>
      _request(
        ENDPOINTS.LOCATIONS.CITIES_BY_REGION(regionId),
        "Failed to fetch cities",
      ),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    enabled: !!regionId,
    ...options,
  });

export const useDistrictsByCity = (cityId, options = {}) =>
  useQuery({
    queryKey: locationsKeys.districts(cityId),
    queryFn: () =>
      _request(
        ENDPOINTS.LOCATIONS.DISTRICTS_BY_CITY(cityId),
        "Failed to fetch districts",
      ),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    enabled: !!cityId,
    ...options,
  });

export const useAllLocations = (options = {}) =>
  useQuery({
    queryKey: locationsKeys.allList(),
    queryFn: () => _request(ENDPOINTS.LOCATIONS.ALL, "Failed to fetch all locations"),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    ...options,
  });

export const useSearchLocations = (query, options = {}) =>
  useQuery({
    queryKey: locationsKeys.search(query),
    queryFn: () =>
      _request(
        `${ENDPOINTS.LOCATIONS.SEARCH}?q=${encodeURIComponent(query)}`,
        "Failed to search locations",
      ),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!query && query.length >= 2,
    ...options,
  });
