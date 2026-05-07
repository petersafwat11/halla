/**
 * Addons Service
 *
 * Wraps GET /addons (catalog), GET /addons/my, POST /addons/purchase, and
 * POST /addons/admin/:id/activate. Uses the throwing apiFetch wrapper so
 * non-2xx responses raise instead of returning an envelope — that prevents
 * the silent-failure bug the legacy `addons` export in adminDashboardService
 * has on 4xx/5xx.
 */

import { ENDPOINTS } from "../config/api";
import { apiFetch } from "./apiClient";

const newIdempotencyKey = (prefix) => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

class AddonsService {
  async _request(endpoint, options = {}) {
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
      throw error;
    }
    return data;
  }

  async getCatalog() {
    return this._request(ENDPOINTS.ADDONS.CATALOG, { method: "GET" });
  }

  async getMyAddons(params = {}) {
    const qs = Object.keys(params).length
      ? `?${new URLSearchParams(params).toString()}`
      : "";
    return this._request(`${ENDPOINTS.ADDONS.MY}${qs}`, { method: "GET" });
  }

  async purchase(data) {
    const idempotencyKey = newIdempotencyKey(`addon-${data.addonType}`);
    return this._request(ENDPOINTS.ADDONS.PURCHASE, {
      method: "POST",
      body: data,
      headers: { "Idempotency-Key": idempotencyKey },
    });
  }

  async adminActivate(addonId, data = {}) {
    if (!addonId) throw new Error("addonId is required");
    const idempotencyKey = newIdempotencyKey(`addon-activate-${addonId}`);
    return this._request(ENDPOINTS.ADDONS.ADMIN_ACTIVATE(addonId), {
      method: "POST",
      body: data,
      headers: { "Idempotency-Key": idempotencyKey },
    });
  }
}

export default new AddonsService();
