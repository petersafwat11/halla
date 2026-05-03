/**
 * Template service.
 *
 * Phase 4 W0-AUTH: routed through `apiFetch` for the 30 s timeout +
 * auth-refresh interceptor. Token argument retained for caller
 * compatibility but ignored.
 */

import { ENDPOINTS } from "../config/api";
import { apiFetch } from "./apiClient";

const request = async (path, _legacyToken, options = {}) => {
  const response = await apiFetch(path, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
};

const buildQuery = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return qs ? `?${qs}` : "";
};

export const templateService = {
  getCategories: (token) => request(ENDPOINTS.TEMPLATES.CATEGORIES, token),

  getTemplates: (params = {}, token) =>
    request(`${ENDPOINTS.TEMPLATES.LIST}${buildQuery(params)}`, token),
};
