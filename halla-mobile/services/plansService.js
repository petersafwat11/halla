/**
 * Plans Service
 * Handles all subscription plans-related API calls.
 *
 * Routed through `apiFetch` so plan fetches inherit the 30 s timeout.
 * Plans are public reads; `apiFetch` still attaches the user's token if
 * present (the backend ignores it for the public reads).
 */

import { ENDPOINTS } from "../config/api";
import { apiFetch } from "./http";

class PlansService {
  async request(endpoint, options = {}) {
    const response = await apiFetch(endpoint, {
      method: options.method || "GET",
      body: options.body,
      headers: options.headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(data.message || "Request failed");
      error.status = response.status;
      error.data = data;
      error.field = data.field;
      throw error;
    }

    return data;
  }

  async getPlans() {
    return this.request(ENDPOINTS.PLANS.ALL, { method: "GET" });
  }

  async getHostPlans() {
    return this.request(ENDPOINTS.PLANS.HOST_PLANS, { method: "GET" });
  }

  async getBusinessPlans() {
    return this.request(ENDPOINTS.PLANS.BUSINESS, { method: "GET" });
  }

  async getPlanByCode(code) {
    return this.request(ENDPOINTS.PLANS.BY_CODE(code), { method: "GET" });
  }

  async getPlanById(id) {
    return this.request(ENDPOINTS.PLANS.BY_ID(id), { method: "GET" });
  }
}

export default new PlansService();
