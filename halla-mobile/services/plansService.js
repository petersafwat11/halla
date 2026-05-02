/**
 * Plans Service
 * Handles all subscription plans-related API calls
 */

import { API_BASE_URL, ENDPOINTS } from "../config/api";

class PlansService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  /**
   * Make request with error handling
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Fetch options
   * @param {string} token - Optional auth token
   * @returns {Promise<Object>}
   */
  async request(endpoint, options = {}, token = null) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.message || "Request failed");
      error.status = response.status;
      error.data = data;
      error.field = data.field;
      throw error;
    }

    return data;
  }

  /**
   * Get all active plans
   * GET /plans
   */
  async getPlans() {
    return await this.request(ENDPOINTS.PLANS.ALL, { method: "GET" });
  }

  /**
   * Get all host plans (single event and monthly)
   * GET /plans/host
   */
  async getHostPlans() {
    return await this.request(ENDPOINTS.PLANS.HOST_PLANS, { method: "GET" });
  }

  /**
   * Get enterprise plans
   * GET /plans/enterprise
   */
  async getEnterprisePlans() {
    return await this.request(ENDPOINTS.PLANS.ENTERPRISE, { method: "GET" });
  }

  /**
   * Get plan by code
   * GET /plans/code/:code
   */
  async getPlanByCode(code) {
    return await this.request(ENDPOINTS.PLANS.BY_CODE(code), { method: "GET" });
  }

  /**
   * Get plan by ID
   * GET /plans/:id
   */
  async getPlanById(id) {
    return await this.request(ENDPOINTS.PLANS.BY_ID(id), { method: "GET" });
  }
}

export default new PlansService();
