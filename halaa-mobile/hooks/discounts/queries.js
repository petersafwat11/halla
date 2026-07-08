import { useQuery } from "@tanstack/react-query";
import { ENDPOINTS } from "../../config/api";
import { useAuthStore } from "../../stores/authStore";
import { adminQs, adminRequest } from "../admin/_request";
import { discountsKeys } from "./keys";

/**
 * Admin discounts list. Key shape matches web (`['discounts','admin',params]`)
 * so a future shared cache stays in sync.
 *
 * Returns the parsed backend body — components read `data?.data` for the
 * array and `data?.pagination` for paging.
 */
export function useAdminDiscounts(params = {}) {
  const token = useAuthStore((state) => state.token);
  return useQuery({
    queryKey: discountsKeys.adminList(params),
    queryFn: async () => {
      const response = await adminRequest(
        `${ENDPOINTS.ADMIN.DISCOUNTS.BASE}${adminQs(params)}`,
      );
      return response.data;
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });
}
