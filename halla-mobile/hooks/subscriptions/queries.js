import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../stores/authStore";
import subscriptionService from "../../services/subscriptionService";
import { subscriptionsKeys } from "./keys";

/**
 * Fetch the calling user's payment history (paginated). Mirrors web `useMyPayments`.
 */
export function useMyPayments(params = {}) {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: subscriptionsKeys.myPayments(params),
    queryFn: () => subscriptionService.getMyPayments(params),
    enabled: !!token,
    staleTime: 2 * 60 * 1000,
  });
}
