import { ENDPOINTS, API_BASE_URL } from "../config/api";
import { apiFetch } from "./http";
import { getStaticAssetBaseUrl } from "@halla/shared/utils/media";

const _request = async (path, init, errorMessage) => {
  const response = await apiFetch(path, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || errorMessage);
  return data;
};

class MarketplaceService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  /**
   * Get service types/categories
   * @returns {Promise<Object>} Service types data
   */
  async getServiceTypes() {
    return _request(
      ENDPOINTS.VENDORS.CATEGORIES,
      { method: "GET" },
      "Failed to fetch service types"
    );
  }

  /**
   * Get vendors/services with filters
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Vendors data
   */
  async getMarketplaceServices(params = {}) {
    try {
      const queryParams = new URLSearchParams();

      if (params.search) queryParams.append("search", params.search);
      if (params.serviceType && params.serviceType !== "all") {
        queryParams.append("category", params.serviceType);
      }
      if (params.regionId) queryParams.append("regionId", params.regionId);
      if (params.cityId) queryParams.append("cityId", params.cityId);
      if (params.districtIds) {
        queryParams.append("districtIds", params.districtIds);
      }
      if (params.minPrice) queryParams.append("minPrice", params.minPrice);
      if (params.maxPrice) queryParams.append("maxPrice", params.maxPrice);
      if (params.minRating) queryParams.append("minRating", params.minRating);
      if (params.page) queryParams.append("page", params.page);
      if (params.limit) queryParams.append("limit", params.limit);

      const path = `${ENDPOINTS.SERVICES.PUBLIC}${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
      return _request(path, { method: "GET" }, "Failed to fetch marketplace services");
    } catch (error) {
      console.error("Error fetching marketplace services:", error);
      throw error;
    }
  }

  /**
   * Get image URL
   * @param {string} imagePath - Image path
   * @returns {string|null} Full image URL
   */
  getImageUrl(imagePath) {
    if (!imagePath) return null;
    if (imagePath.startsWith("http")) return imagePath;
    const origin = getStaticAssetBaseUrl(API_BASE_URL);
    const cleanPath = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
    return `${origin}${cleanPath}`;
  }
}

export default new MarketplaceService();
