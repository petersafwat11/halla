// Taqnyat templates API client — host list + admin sync/create/assign/delete.

import { apiRequest } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";

const buildQuery = (params = {}) => {
  const q = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  return q ? `?${q}` : "";
};

export const taqnyatTemplatesService = {
  /** Host-facing — used by wizard StepFour after the category in step 3 is locked. */
  getTemplates: ({ category, type } = {}) =>
    apiRequest({
      method: "GET",
      path: `${API_PATHS.taqnyatTemplates.list}${buildQuery({ category, type })}`,
    }),

  // Admin
  adminList: (params = {}) =>
    apiRequest({
      method: "GET",
      path: `${API_PATHS.taqnyatTemplates.adminList}${buildQuery(params)}`,
    }),

  adminSync: () =>
    apiRequest({ method: "POST", path: API_PATHS.taqnyatTemplates.adminSync }),

  adminCreate: (body) =>
    apiRequest({
      method: "POST",
      path: API_PATHS.taqnyatTemplates.adminCreate,
      data: body,
    }),

  adminAssign: (id, body) =>
    apiRequest({
      method: "PATCH",
      path: API_PATHS.taqnyatTemplates.adminAssign(id),
      data: body,
    }),

  adminDelete: (id) =>
    apiRequest({
      method: "DELETE",
      path: API_PATHS.taqnyatTemplates.adminDelete(id),
    }),
};

export default taqnyatTemplatesService;
