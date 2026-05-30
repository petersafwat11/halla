import { useQuery } from "@tanstack/react-query";
import { ENDPOINTS } from "../../config/api";
import { apiFetch } from "../../services/http";
import { useAuthStore } from "../../stores/authStore";
import { subscriptionsKeys } from "./keys";

const _request = async (endpoint, options = {}) => {
  const response = await apiFetch(endpoint, {
    method: options.method || "GET",
    body: options.body
      ? typeof options.body === "string"
        ? JSON.parse(options.body)
        : options.body
      : undefined,
    headers: options.headers,
    params: options.params,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || "Request failed");
    error.status = response.status;
    error.data = data;
    error.field = data.field;
    throw error;
  }
  return data;
};

// Exported so the cross-domain `useMySubscription` (in hooks/users/) can
// share the same request shape after the subscriptionService deletion.
export { _request as subscriptionsRequest };

/**
 * Fetch the calling user's payment history (paginated). Mirrors web `useMyPayments`.
 */
export function useMyPayments(params = {}) {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: subscriptionsKeys.myPayments(params),
    queryFn: () =>
      _request(ENDPOINTS.SUBSCRIPTIONS.MY_PAYMENTS, {
        method: "GET",
        params,
      }),
    enabled: !!token,
    staleTime: 2 * 60 * 1000,
  });
}
