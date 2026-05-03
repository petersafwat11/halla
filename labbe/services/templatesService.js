/**
 * Visual Templates Service — Phase 4c W1-VISUAL
 *
 * Wraps `apiRequest` with the templates + categories + fonts endpoints
 * registered in `services/new-backend/api.config.js`.
 */

import { apiRequest } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";

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
    apiRequest({ method: "POST", path: API_PATHS.templates.adminCreate, body }),

  adminUpdateTemplate: (id, body) =>
    apiRequest({ method: "PUT", path: API_PATHS.templates.adminUpdate(id), body }),

  adminDeleteTemplate: (id) =>
    apiRequest({ method: "DELETE", path: API_PATHS.templates.adminDelete(id) }),

  adminDuplicateTemplate: (id) =>
    apiRequest({ method: "POST", path: API_PATHS.templates.adminDuplicate(id) }),

  /**
   * Get a presigned POST policy from the backend, then upload the file
   * directly to S3 via multipart form POST. Returns the s3Key the
   * backend should reference when persisting the Template doc.
   */
  adminUploadImage: async (file, { templateId = "new", onProgress } = {}) => {
    const presignRes = await apiRequest({
      method: "POST",
      path: `${API_PATHS.templates.adminUploadUrl}?templateId=${encodeURIComponent(templateId)}`,
      body: { filename: file.name, contentType: file.type },
    });

    const presigned =
      presignRes?.data || presignRes; // apiClient may unwrap; tolerate both

    const { url, fields, s3Key } = presigned;

    const formData = new FormData();
    Object.entries(fields).forEach(([k, v]) => formData.append(k, v));
    formData.append("file", file);

    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", url);
      if (typeof onProgress === "function") {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
        };
      }
      xhr.onload = () => (xhr.status === 204 || xhr.status === 201 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`)));
      xhr.onerror = () => reject(new Error("Upload network error"));
      xhr.send(formData);
    });

    return { s3Key };
  },

  // ── Categories — admin ───────────────────────────────────────────────────
  adminListCategories: () =>
    apiRequest({ method: "GET", path: API_PATHS.templates.adminCategories }),
  adminCreateCategory: (body) =>
    apiRequest({ method: "POST", path: API_PATHS.templates.adminCreateCategory, body }),
  adminUpdateCategory: (id, body) =>
    apiRequest({ method: "PUT", path: API_PATHS.templates.adminUpdateCategory(id), body }),
  adminDeleteCategory: (id) =>
    apiRequest({ method: "DELETE", path: API_PATHS.templates.adminDeleteCategory(id) }),
};

export default templatesService;
