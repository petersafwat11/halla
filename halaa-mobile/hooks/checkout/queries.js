import { useQuery } from "@tanstack/react-query";
import { ENDPOINTS } from "../../config/api";
import { apiFetch } from "../../services/http";
import { checkoutKeys } from "./keys";

export const useCheckoutQuote = ({
  planCode,
  addons = [],
  discountCode = null,
  enabled = true,
} = {}) => useQuery({
  queryKey: checkoutKeys.quote({ planCode, addons, discountCode }),
  queryFn: async () => {
    const response = await apiFetch(ENDPOINTS.PAYMENTS.QUOTE, {
      method: "POST",
      body: {
        planCode,
        addons,
        ...(discountCode ? { discountCode } : {}),
      },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload?.message || "Quote request failed");
      error.status = response.status;
      error.data = payload;
      throw error;
    }
    return payload?.data || payload;
  },
  enabled: Boolean(planCode) && enabled,
  staleTime: 60 * 1000,
});
