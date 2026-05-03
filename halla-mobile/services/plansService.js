/**
 * Plans Service
 * Handles all subscription plans-related API calls.
 *
 * Phase 4 W0-AUTH: routed through `apiFetch` so plan fetches inherit
 * the 30 s timeout. Plans are public; we pass `skipAuth: true` for the
 * GETs that the backend allows unauthenticated, but `apiFetch` still
 * attaches the user's token if present (the backend ignores it for the
 * public reads).
 */

import { ENDPOINTS } from "../config/api";
import { apiFetch } from "./apiClient";

class PlansService {
  async request(endpoint, options = {}, _legacyToken = null) {
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

  async getEnterprisePlans() {
    return this.request(ENDPOINTS.PLANS.ENTERPRISE, { method: "GET" });
  }

  async getPlanByCode(code) {
    return this.request(ENDPOINTS.PLANS.BY_CODE(code), { method: "GET" });
  }

  async getPlanById(id) {
    return this.request(ENDPOINTS.PLANS.BY_ID(id), { method: "GET" });
  }
}

export default new PlansService();
