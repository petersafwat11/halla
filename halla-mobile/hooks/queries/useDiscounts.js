import { useQuery } from "@tanstack/react-query";
import adminDashboardService from "../../services/adminDashboardService";
import { useAuthStore } from "../../stores/authStore";

/**
 * Admin discounts list. Query key + invalidation prefix match the web client
 * (`['discounts', 'admin', params]`) so a future shared cache stays in sync.
 *
 * Returns the parsed backend body — components read `data?.data` for the
 * array and `data?.pagination` for paging.
 */
export function useAdminDiscounts(params = {}) {
  const token = useAuthStore((state) => state.token);
  return useQuery({
    queryKey: ["discounts", "admin", params],
    queryFn: async () => {
      const response = await adminDashboardService.discounts.getAll(token, params);
      return response.data;
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });
}
