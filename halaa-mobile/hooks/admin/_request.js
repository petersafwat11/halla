/**
 * Internal request helpers for the admin hook layer. Replaces the
 * `services/adminDashboardService.js` indirection. Returns the legacy
 * `{ success, data, error }` envelope so every hook's response handling
 * stays unchanged after the inline migration.
 */

import { ENDPOINTS } from "../../config/api";
import { apiFetch } from "../../services/http";
import { saveBlobAndShare } from "../../utils/download";

export const adminRequest = async (
  endpoint,
  method = "GET",
  data = null,
  extraHeaders = null,
) => {
  try {
    const isFormData = typeof FormData !== "undefined" && data instanceof FormData;
    const init = {
      method,
      headers: extraHeaders || undefined,
    };
    if (data && (method === "POST" || method === "PUT" || method === "PATCH")) {
      init.body = data;
    }
    if (isFormData) {
      init.timeoutMs = 60 * 1000;
    }

    const response = await apiFetch(endpoint, init);
    const responseData = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        success: false,
        data: null,
        error: responseData.message || `HTTP error! status: ${response.status}`,
      };
    }

    return { success: true, data: responseData, error: null };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error.message || "An unexpected error occurred",
    };
  }
};

/**
 * Build `?a=b&c=d` from a params object, ignoring empty values.
 */
export const adminQs = (params = {}) => {
  const clean = Object.fromEntries(
    Object.entries(params).filter(
      ([, v]) => v !== undefined && v !== null && v !== "",
    ),
  );
  const qs = new URLSearchParams(clean).toString();
  return qs ? `?${qs}` : "";
};

const _filenameFromResponse = (response, path) => {
  const cd = response.headers?.get?.("content-disposition") || "";
  const match = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(cd);
  if (match?.[1]) {
    try {
      return decodeURIComponent(match[1].replace(/"/g, "").trim());
    } catch (_) {
      return match[1].replace(/"/g, "").trim();
    }
  }
  const segments = String(path).split("/").filter(Boolean);
  const base =
    segments[segments.length - 2] || segments[segments.length - 1] || "export";
  return `${base}.xlsx`;
};

/**
 * Fetches a server-generated XLSX export with the in-memory auth token,
 * then hands the blob to `saveBlobAndShare` so the user gets a native
 * "save / share" sheet.
 */
export const adminExport = async (path, filters = {}) => {
  const fullPath = `${path}${adminQs(filters)}`;
  const response = await apiFetch(fullPath, { method: "GET" });
  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      if (body?.message) message = body.message;
    } catch (_) {
      // non-JSON error body — fall back to status code.
    }
    throw new Error(message);
  }
  const blob = await response.blob();
  const filename = _filenameFromResponse(response, path);
  return saveBlobAndShare(blob, filename);
};

export { ENDPOINTS };
