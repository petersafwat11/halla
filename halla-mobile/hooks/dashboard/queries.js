import { useQuery } from "@tanstack/react-query";
import { ENDPOINTS } from "../../config/api";
import { apiFetch } from "../../services/http";
import { useAuthStore } from "../../stores/authStore";
import { dashboardKeys } from "./keys";

/**
 * Returns: { stats, lastEvent, subscription, hasEvents }
 */
export function useHostDashboard() {
  const token = useAuthStore((state) => state.token);
  return useQuery({
    queryKey: dashboardKeys.host(),
    queryFn: async () => {
      const res = await apiFetch(ENDPOINTS.DASHBOARD.HOST, { method: "GET" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Failed to fetch host dashboard");
      }
      return data.data;
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAdminDashboard(period = "month") {
  const token = useAuthStore((state) => state.token);
  return useQuery({
    queryKey: dashboardKeys.admin(period),
    queryFn: async () => {
      const qs = period ? `?period=${period}` : "";
      const res = await apiFetch(`${ENDPOINTS.DASHBOARD.ADMIN}${qs}`, {
        method: "GET",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Failed to fetch admin dashboard");
      }
      return data.data;
    },
    enabled: !!token,
    staleTime: 3 * 60 * 1000,
  });
}
