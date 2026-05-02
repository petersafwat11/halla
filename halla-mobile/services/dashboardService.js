import { API_BASE_URL, ENDPOINTS } from "../config/api";

/**
 * Get host dashboard stats
 * Matches web frontend's useHostDashboard -> GET /dashboard/host
 * @param {string} token - Auth token
 * @returns {Promise<Object>} { stats, lastEvent, subscription, hasEvents }
 */
export const getHostDashboard = async (token) => {
  const response = await fetch(`${API_BASE_URL}${ENDPOINTS.DASHBOARD.HOST}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch host dashboard");
  }

  return data.data;
};
