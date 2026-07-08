"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/http";
import { API_PATHS } from "@halaa/shared/api/paths";
import { businessKeys } from "./keys";

/**
 * Public hosted-checkout summary for a business plan assignment. Keyed by the
 * opaque checkout token (the credential — no auth). The backend throws for
 * non-pending links (expired / used / invalid), surfaced here as the query
 * error so the page can render a graceful "link no longer valid" state.
 */
export const useBusinessCheckoutSummary = (token, options = {}) => {
  return useQuery({
    queryKey: businessKeys.checkoutSummary(token),
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.business.checkoutSummary(token),
      }),
    enabled: !!token,
    retry: false,
    staleTime: 30 * 1000,
    ...options,
  });
};
