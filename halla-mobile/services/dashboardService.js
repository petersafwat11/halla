import { ENDPOINTS } from "../config/api";
import { apiFetch } from "./apiClient";

/**
 * Get host dashboard stats.
 * M-13: routed through apiFetch so a 401 from an expired access token
 * triggers an automatic refresh + retry instead of failing the call
 * mid-session. Token arg ignored.
 *
 * @returns {Promise<Object>} { stats, lastEvent, subscription, hasEvents }
 */
export const getHostDashboard = async () => {
  const response = await apiFetch(ENDPOINTS.DASHBOARD.HOST, { method: "GET" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch host dashboard");
  }
  return data.data;
};
