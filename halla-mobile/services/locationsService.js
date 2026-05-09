import { ENDPOINTS } from "../config/api";
import { apiFetch } from "./apiClient";

const _request = async (path, init, errorMessage) => {
  const response = await apiFetch(path, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || errorMessage);
  return data;
};

const locationsService = {
  getRegions: () => _request(ENDPOINTS.LOCATIONS.REGIONS, { method: "GET" }, "Failed to fetch regions"),
  getCitiesByRegion: (regionId) => _request(ENDPOINTS.LOCATIONS.CITIES_BY_REGION(regionId), { method: "GET" }, "Failed to fetch cities"),
  getDistrictsByCity: (cityId) => _request(ENDPOINTS.LOCATIONS.DISTRICTS_BY_CITY(cityId), { method: "GET" }, "Failed to fetch districts"),
  getAllLocations: () => _request(ENDPOINTS.LOCATIONS.ALL, { method: "GET" }, "Failed to fetch all locations"),
  searchLocations: (query) => _request(`${ENDPOINTS.LOCATIONS.SEARCH}?q=${encodeURIComponent(query)}`, { method: "GET" }, "Failed to search locations"),
};

export default locationsService;
