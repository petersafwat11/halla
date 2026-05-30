/**
 * Template service. Routes through `apiFetch` which handles the 30s
 * timeout, auth refresh, and reads the access token from `useAuthStore`.
 */

import { ENDPOINTS } from "../config/api";
import { apiFetch } from "./http";

const request = async (path, options = {}) => {
  const response = await apiFetch(path, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
};

const buildQuery = (params = {}) => {
  const filtered = Object.fromEntries(
    Object.entries(params).filter(
      ([, v]) => v !== undefined && v !== null && v !== ""
    )
  );
  const qs = new URLSearchParams(filtered).toString();
  return qs ? `?${qs}` : "";
};

export const templateService = {
  getCategories: () => request(ENDPOINTS.TEMPLATES.CATEGORIES),
  getTemplates: (params = {}) =>
    request(`${ENDPOINTS.TEMPLATES.LIST}${buildQuery(params)}`),
  getFonts: () => request(ENDPOINTS.FONTS.LIST),
};
