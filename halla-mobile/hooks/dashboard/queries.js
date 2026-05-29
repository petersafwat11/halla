import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../stores/authStore";
import { getHostDashboard, getAdminDashboard } from "../../services/dashboardService";
import { dashboardKeys } from "./keys";

/**
 * Returns: { stats, lastEvent, subscription, hasEvents }
 */
export function useHostDashboard() {
  const token = useAuthStore((state) => state.token);
  return useQuery({
    queryKey: dashboardKeys.host(),
    queryFn: () => getHostDashboard(),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAdminDashboard(period = "month") {
  const token = useAuthStore((state) => state.token);
  return useQuery({
    queryKey: dashboardKeys.admin(period),
    queryFn: () => getAdminDashboard(period),
    enabled: !!token,
    staleTime: 3 * 60 * 1000,
  });
}
