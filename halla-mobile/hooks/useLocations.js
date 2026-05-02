import { useQuery } from "@tanstack/react-query";
import { API_BASE_URL, ENDPOINTS } from "../config/api";

const fetchJSON = async (url) => {
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
};

export const useRegions = (options = {}) =>
  useQuery({
    queryKey: ["locations", "regions"],
    queryFn: () => fetchJSON(`${API_BASE_URL}${ENDPOINTS.REGIONS.ALL}`),
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    ...options,
  });

export const useCitiesByRegion = (regionId, options = {}) =>
  useQuery({
    queryKey: ["locations", "cities", regionId],
    queryFn: () => fetchJSON(`${API_BASE_URL}${ENDPOINTS.REGIONS.CITIES_BY_REGION(regionId)}`),
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    enabled: !!regionId,
    ...options,
  });

export const useDistrictsByCity = (cityId, options = {}) =>
  useQuery({
    queryKey: ["locations", "districts", cityId],
    queryFn: () => fetchJSON(`${API_BASE_URL}${ENDPOINTS.REGIONS.DISTRICTS_BY_CITY(cityId)}`),
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    enabled: !!cityId,
    ...options,
  });

export const useEnterprisePlans = (options = {}) =>
  useQuery({
    queryKey: ["plans", "enterprise"],
    queryFn: () => fetchJSON(`${API_BASE_URL}${ENDPOINTS.PLANS.ENTERPRISE}`),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    ...options,
  });
