import { useMutation } from "@tanstack/react-query";
import { ENDPOINTS } from "../../config/api";
import { apiFetch } from "../../services/http";

/**
 * Mutation hook to track marketplace analytics events on mobile (service_view, vendor_view, contact_click)
 */
export function useTrackMarketplaceAnalytics(options = {}) {
  return useMutation({
    mutationFn: async ({ eventType, targetType, targetId, contactMethod, metadata }) => {
      const res = await apiFetch(ENDPOINTS.VENDORS.TRACK_ANALYTICS, {
        method: "POST",
        body: {
          eventType,
          targetType,
          targetId,
          contactMethod,
          metadata,
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to track analytics event");
      }
      return res.json();
    },
    ...options,
  });
}
