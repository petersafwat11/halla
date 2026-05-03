/**
 * Taqnyat Templates Service (mobile) — Phase 4c W2-MOBILE-WIZARD
 *
 * Public host endpoint — backend cache filtered by category. The
 * mobile app does NOT call any admin endpoints (admin Taqnyat
 * management is web-only per D4c-3).
 */

import { ENDPOINTS } from "../config/api";
import { apiFetch } from "./apiClient";

const buildQuery = (params = {}) => {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
  ).toString();
  return qs ? `?${qs}` : "";
};

async function request(path) {
  const res = await apiFetch(path);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

export const taqnyatTemplatesService = {
  getTemplates: ({ category } = {}) =>
    request(`${ENDPOINTS.TAQNYAT_TEMPLATES.LIST}${buildQuery({ category })}`),
};

export default taqnyatTemplatesService;
