import { useQuery } from "@tanstack/react-query";
import locationsService from "../../services/locationsService";
import { locationsKeys } from "./keys";

const STALE_TIME = 60 * 60 * 1000;
const GC_TIME = 24 * 60 * 60 * 1000;

export const useRegions = (options = {}) =>
  useQuery({
    queryKey: locationsKeys.regions(),
    queryFn: () => locationsService.getRegions(),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    ...options,
  });

export const useCitiesByRegion = (regionId, options = {}) =>
  useQuery({
    queryKey: locationsKeys.cities(regionId),
    queryFn: () => locationsService.getCitiesByRegion(regionId),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    enabled: !!regionId,
    ...options,
  });

export const useDistrictsByCity = (cityId, options = {}) =>
  useQuery({
    queryKey: locationsKeys.districts(cityId),
    queryFn: () => locationsService.getDistrictsByCity(cityId),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    enabled: !!cityId,
    ...options,
  });

export const useAllLocations = (options = {}) =>
  useQuery({
    queryKey: locationsKeys.allList(),
    queryFn: () => locationsService.getAllLocations(),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    ...options,
  });

export const useSearchLocations = (query, options = {}) =>
  useQuery({
    queryKey: locationsKeys.search(query),
    queryFn: () => locationsService.searchLocations(query),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!query && query.length >= 2,
    ...options,
  });
