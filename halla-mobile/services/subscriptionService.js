/**
 * Subscription Service
 *
 * Phase 4 W0-AUTH: routed through `apiFetch`. Token args are accepted
 * but ignored — the wrapper reads the in-memory access token directly
 * and handles 401 → refresh.
 */

import { ENDPOINTS } from "../config/api";
import { apiFetch } from "./apiClient";

class SubscriptionService {
  async request(endpoint, options = {}, _legacyToken) {
    const response = await apiFetch(endpoint, {
      method: options.method || "GET",
      body: options.body
        ? typeof options.body === "string"
          ? JSON.parse(options.body)
          : options.body
        : undefined,
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

  async getMySubscription(token) {
    return this.request(
      ENDPOINTS.SUBSCRIPTIONS.MY_SUBSCRIPTION,
      { method: "GET" },
      token
    );
  }

  async subscribe({ planCode, discountCode }, token) {
    const payload = { planCode };
    if (discountCode) payload.discountCode = discountCode;
    return this.request(
      ENDPOINTS.SUBSCRIPTIONS.SUBSCRIBE,
      { method: "POST", body: payload },
      token
    );
  }

  async upgrade(upgradeData, token) {
    return this.request(
      ENDPOINTS.SUBSCRIPTIONS.CHANGE_PLAN,
      { method: "POST", body: upgradeData },
      token
    );
  }

  async cancel(cancelData, token) {
    return this.request(
      ENDPOINTS.SUBSCRIPTIONS.CANCEL,
      { method: "POST", body: cancelData },
      token
    );
  }

  async validateLimits(action, count, token) {
    return this.request(
      ENDPOINTS.SUBSCRIPTIONS.VALIDATE_LIMITS,
      { method: "POST", body: { action, count } },
      token
    );
  }

  async getLimits(token) {
    return this.request(ENDPOINTS.SUBSCRIPTIONS.LIMITS, { method: "GET" }, token);
  }
}

export default new SubscriptionService();
