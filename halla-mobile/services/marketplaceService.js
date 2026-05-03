import axios from "axios";
import { API_BASE_URL } from "../config/api";
import { DEFAULT_TIMEOUT_MS } from "./apiClient";

/**
 * Marketplace Service
 * Handles all marketplace and vendor-related API calls.
 *
 * Phase 4 W0-AUTH: dedicated axios instance with the same 30 s default
 * timeout as `apiFetch`. Marketplace calls are largely public reads so
 * we don't add auth-refresh — but bounded latency is still important.
 */

const marketplaceAxios = axios.create({
  baseURL: API_BASE_URL,
  timeout: DEFAULT_TIMEOUT_MS,
});

class MarketplaceService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  /**
   * Get service types/categories
   * @param {string} lang - Language code (ar/en)
   * @returns {Promise<Object>} Service types data
   */
  async getServiceTypes(lang = "ar") {
    try {
      const response = await marketplaceAxios.get(
        `${this.baseURL}/vendors/categories`,
        {
          params: { lang },
        },
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching service types:", error);
      throw error;
    }
  }

  /**
   * Get vendors/services with filters
   * @param {Object} params - Query parameters
   * @param {string} params.search - Search query
   * @param {string} params.serviceType - Service type filter
   * @param {string} params.regionId - Region ID
   * @param {string} params.cityId - City ID
   * @param {string} params.districtIds - Comma-separated district IDs
   * @param {number} params.minPrice - Minimum price
   * @param {number} params.maxPrice - Maximum price
   * @param {number} params.minRating - Minimum rating
   * @param {number} params.page - Page number
   * @param {number} params.limit - Items per page
   * @returns {Promise<Object>} Vendors data
   */
  async getVendors(params = {}) {
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

      const response = await marketplaceAxios.get(
        `${this.baseURL}/services/public?${queryParams.toString()}`,
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching vendors:", error);
      throw error;
    }
  }

  /**
   * Get vendor details by ID
   * @param {string} vendorId - Vendor ID
   * @returns {Promise<Object>} Vendor details
   */
  async getVendorDetails(vendorId) {
    try {
      const response = await marketplaceAxios.get(
        `${this.baseURL}/vendors/${vendorId}`,
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching vendor details:", error);
      throw error;
    }
  }

  /**
   * Get regions
   * @returns {Promise<Object>} Regions data
   */
  async getRegions() {
    try {
      const response = await marketplaceAxios.get(`${this.baseURL}/locations/regions`);
      return response.data;
    } catch (error) {
      console.error("Error fetching regions:", error);
      throw error;
    }
  }

  /**
   * Get cities by region
   * @param {string} regionId - Region ID
   * @returns {Promise<Object>} Cities data
   */
  async getCities(regionId) {
    try {
      const response = await marketplaceAxios.get(
        `${this.baseURL}/locations/cities/${regionId}`,
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching cities:", error);
      throw error;
    }
  }

  /**
   * Get districts by city
   * @param {string} cityId - City ID
   * @returns {Promise<Object>} Districts data
   */
  async getDistricts(cityId) {
    try {
      const response = await marketplaceAxios.get(
        `${this.baseURL}/locations/districts/${cityId}`,
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching districts:", error);
      throw error;
    }
  }

  /**
   * Get image URL for vendor/service
   * @param {string} imagePath - Image path from API
   * @returns {string} Full image URL
   */
  getImageUrl(imagePath) {
    if (!imagePath) return null;
    if (imagePath.startsWith("http")) return imagePath;
    const cleanPath = imagePath.startsWith("/")
      ? imagePath.slice(1)
      : imagePath;
    return `${API_BASE_URL.replace("/api/v2", "")}/${cleanPath}`;
  }
}

export default new MarketplaceService();
