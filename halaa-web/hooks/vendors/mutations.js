"use client";

import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/services/http";
import { API_PATHS } from "@halaa/shared/api/paths";

/**
 * Hook to track marketplace analytics events (service_view, vendor_view, contact_click)
 */
export const useTrackMarketplaceAnalytics = (options = {}) => {
  return useMutation({
    mutationFn: ({ eventType, targetType, targetId, contactMethod, metadata }) =>
      apiRequest({
        method: "POST",
        path: API_PATHS.vendors.trackAnalytics,
        data: {
          eventType,
          targetType,
          targetId,
          contactMethod,
          metadata,
        },
      }),
    ...options,
  });
};
