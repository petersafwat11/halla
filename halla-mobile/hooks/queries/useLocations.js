import { useQuery } from "@tanstack/react-query";
import locationsService from "../../services/locationsService";

const STALE_TIME = 60 * 60 * 1000;
const GC_TIME = 24 * 60 * 60 * 1000;

export const useRegions = (options = {}) =>
  useQuery({
    queryKey: ["locations", "regions"],
    queryFn: () => locationsService.getRegions(),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    ...options,
  });

export const useCitiesByRegion = (regionId, options = {}) =>
  useQuery({
    queryKey: ["locations", "cities", regionId],
    queryFn: () => locationsService.getCitiesByRegion(regionId),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    enabled: !!regionId,
    ...options,
  });

export const useDistrictsByCity = (cityId, options = {}) =>
  useQuery({
    queryKey: ["locations", "districts", cityId],
    queryFn: () => locationsService.getDistrictsByCity(cityId),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    enabled: !!cityId,
    ...options,
  });

export const useAllLocations = (options = {}) =>
  useQuery({
    queryKey: ["locations", "all"],
    queryFn: () => locationsService.getAllLocations(),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    ...options,
  });

export const useSearchLocations = (query, options = {}) =>
  useQuery({
    queryKey: ["locations", "search", query],
    queryFn: () => locationsService.searchLocations(query),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!query && query.length >= 2,
    ...options,
  });
