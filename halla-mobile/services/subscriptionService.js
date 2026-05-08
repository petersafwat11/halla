/**
 * Subscription Service — routed through `apiFetch`. Reads/payments only;
 * self-subscribe + plan-switch flow through the bundled checkout in
 * `services/checkoutService.js` → POST /payments/checkout.
 */

import { ENDPOINTS } from "../config/api";
import { apiFetch } from "./apiClient";

class SubscriptionService {
  async request(endpoint, options = {}) {
    const response = await apiFetch(endpoint, {
      method: options.method || "GET",
      body: options.body
        ? typeof options.body === "string"
          ? JSON.parse(options.body)
          : options.body
        : undefined,
      headers: options.headers,
      params: options.params,
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

  async getMySubscription() {
    return this.request(ENDPOINTS.SUBSCRIPTIONS.MY_SUBSCRIPTION, {
      method: "GET",
    });
  }

  async getMyPayments(params = {}) {
    return this.request(ENDPOINTS.SUBSCRIPTIONS.MY_PAYMENTS, {
      method: "GET",
      params,
    });
  }
}

export default new SubscriptionService();
