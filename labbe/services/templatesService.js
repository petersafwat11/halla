/**
 * Visual templates service. Wraps `apiRequest` for the templates,
 * categories, and fonts endpoints declared in `@halla/shared/api/paths`.
 */

import { apiRequest } from "@/services/http";
import { API_PATHS } from "@halla/shared/api/paths";

const buildQuery = (params = {}) => {
  const q = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  return q ? `?${q}` : "";
};

export const templatesService = {
  // ── Host-facing ──────────────────────────────────────────────────────────
  getTemplates: ({ category } = {}) =>
    apiRequest({
      method: "GET",
      path: `${API_PATHS.templates.list}${buildQuery({ category })}`,
    }),

  getTemplateById: (id) =>
    apiRequest({ method: "GET", path: API_PATHS.templates.getById(id) }),

  getCategories: () =>
    apiRequest({ method: "GET", path: API_PATHS.templates.categories }),

  getFonts: () =>
    apiRequest({ method: "GET", path: API_PATHS.templates.fonts }),

  // ── Admin ────────────────────────────────────────────────────────────────
  adminListTemplates: (params = {}) =>
    apiRequest({
      method: "GET",
      path: `${API_PATHS.templates.adminList}${buildQuery(params)}`,
    }),

  adminGetTemplate: (id) =>
    apiRequest({ method: "GET", path: API_PATHS.templates.adminGetById(id) }),

  adminCreateTemplate: (body) =>
    apiRequest({ method: "POST", path: API_PATHS.templates.adminCreate, data: body }),

  adminUpdateTemplate: (id, body) =>
    apiRequest({ method: "PUT", path: API_PATHS.templates.adminUpdate(id), data: body }),

  adminDeleteTemplate: (id) =>
    apiRequest({ method: "DELETE", path: API_PATHS.templates.adminDelete(id) }),

  adminDuplicateTemplate: (id) =>
    apiRequest({ method: "POST", path: API_PATHS.templates.adminDuplicate(id) }),

  /**
   * Send the file to the backend, which proxies it to S3.
   * Avoids the browser→S3 CORS restriction of the old presigned-POST flow.
   */
  adminUploadImage: async (file, { templateId = "new", onProgress } = {}) => {
    const formData = new FormData();
    formData.append("image", file);

    const result = await apiRequest({
      method: "POST",
      path: `${API_PATHS.templates.adminUploadImage}?templateId=${encodeURIComponent(templateId)}`,
      data: formData,
      config: {
        headers: { "Content-Type": undefined },
        ...(typeof onProgress === "function" && {
          onUploadProgress: (e) => {
            if (e.total) onProgress(Math.round((e.loaded / e.total) * 100));
          },
        }),
      },
    });

    const { s3Key } = result?.data || result;
    return { s3Key };
  },

  // ── Categories — admin ───────────────────────────────────────────────────
  adminListCategories: () =>
    apiRequest({ method: "GET", path: API_PATHS.templates.adminCategories }),
  adminCreateCategory: (body) =>
    apiRequest({ method: "POST", path: API_PATHS.templates.adminCreateCategory, data: body }),
  adminUpdateCategory: (id, body) =>
    apiRequest({ method: "PUT", path: API_PATHS.templates.adminUpdateCategory(id), data: body }),
  adminDeleteCategory: (id) =>
    apiRequest({ method: "DELETE", path: API_PATHS.templates.adminDeleteCategory(id) }),
};

export default templatesService;
