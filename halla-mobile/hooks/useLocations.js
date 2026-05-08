import { useQuery } from "@tanstack/react-query";
import { API_BASE_URL, ENDPOINTS } from "../config/api";
import { fetchWithTimeout } from "../services/apiClient";

/**
 * Routed through `fetchWithTimeout` so locations lookups time out at
 * 30 s instead of hanging on a flaky link. No auth needed (public
 * endpoints), so we don't go through `apiFetch`.
 */
const fetchJSON = async (url) => {
  const response = await fetchWithTimeout(url);
  const data = await response.json().catch(() => ({}));
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
