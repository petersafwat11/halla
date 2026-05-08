import { ENDPOINTS } from "../config/api";
import { apiFetch } from "./apiClient";

// ==================== EXPORT APIs ====================

/**
 * Export events to Excel
 * Note: Returns blob URL for download on mobile
 * @param {string} _legacyToken - ignored; apiFetch reads from auth store
 * @returns {Promise<Object>}
 */
export const exportEvents = async (_legacyToken) => {
  // Route through apiFetch so the export gets the refreshed access token
  // automatically. Allow up to 60 s — XLSX generation can be slow when
  // the host has many events.
  const response = await apiFetch(ENDPOINTS.EVENTS.EXPORT_EVENTS, {
    method: "GET",
    timeoutMs: 60 * 1000,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to export events");
  }

  const blob = await response.blob();

  return {
    success: true,
    blob,
    filename: "events-export.xlsx",
  };
};
