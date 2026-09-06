"use client";

import { fetchCompleteGuestList } from "@halaa/shared/utils/guestPagination";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/http";
import { API_PATHS } from "@halaa/shared/api/paths";

/**
 * Hook to fetch guests for a specific event
 * Uses the dedicated guests module endpoint
 * @param {string} eventId - The event ID
 * @param {object} options - Additional query options
 * @returns {UseQueryResult}
 */
export const useEventGuests = (eventId, options = {}) => {
  const { params, ...queryOptions } = options;
  return useQuery({
    queryKey: ["guests", "events", eventId, params || "complete"],
    queryFn: async ({ signal }) => {
      const fetchPage = (pageParams) => apiRequest({
        method: "GET", path: API_PATHS.guests.getEventGuests(eventId),
        params: pageParams, config: { signal },
      });
      if (params) return fetchPage(params);
      const [list, preview] = await Promise.all([
        fetchCompleteGuestList(fetchPage),
        apiRequest({ method: "GET", path: API_PATHS.guests.getEventGuests(eventId) + "/audience-preview", config: { signal } }),
      ]);
      return { ...list, audiencePreview: preview?.data || preview };
    },
    enabled: !!eventId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...queryOptions,
  });
};

export default useEventGuests;
