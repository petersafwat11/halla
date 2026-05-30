import { ENDPOINTS } from "../config/api";
import { apiFetch } from "./http";

export const getHostDashboard = async () => {
  const response = await apiFetch(ENDPOINTS.DASHBOARD.HOST, { method: "GET" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch host dashboard");
  }
  return data.data;
};

export const getAdminDashboard = async (period = "month") => {
  const qs = period ? `?period=${period}` : "";
  const response = await apiFetch(`${ENDPOINTS.DASHBOARD.ADMIN}${qs}`, {
    method: "GET",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch admin dashboard");
  }
  return data.data;
};
