"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/http";
import { API_PATHS } from "@halaa/shared/api/paths";
import { checkoutKeys } from "./keys";

export const useCheckoutQuote = ({
  planCode,
  addons = [],
  discountCode = null,
  enabled = true,
} = {}) => {
  return useQuery({
    queryKey: checkoutKeys.quote({ planCode, addons, discountCode }),
    queryFn: async () => {
      if (!planCode) return null;
      const res = await apiRequest({
        method: "POST",
        path: API_PATHS.hostPayments.quote,
        data: {
          planCode,
          addons,
          ...(discountCode ? { discountCode } : {}),
        },
      });
      return res?.data || res;
    },
    enabled: Boolean(planCode) && enabled,
    staleTime: 60 * 1000,
  });
};
