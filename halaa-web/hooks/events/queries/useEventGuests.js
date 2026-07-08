"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/http";
import { API_PATHS } from "@halla/shared/api/paths";

/**
 * Hook to fetch guests for a specific event
 * Uses the dedicated guests module endpoint
 * @param {string} eventId - The event ID
 * @param {object} options - Additional query options
 * @returns {UseQueryResult}
 */
export const useEventGuests = (eventId, options = {}) => {
  return useQuery({
    queryKey: ["guests", "events", eventId],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.guests.getEventGuests(eventId),
      }),
    enabled: !!eventId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

export default useEventGuests;
