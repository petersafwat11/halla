// Mobile Taqnyat templates client — host-facing list only (admin is web-only).

import { ENDPOINTS } from "../config/api";
import { apiFetch } from "./http";

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
  getTemplates: ({ category, type } = {}) =>
    request(
      `${ENDPOINTS.TAQNYAT_TEMPLATES.LIST}${buildQuery({ category, type })}`
    ),
};

export default taqnyatTemplatesService;
