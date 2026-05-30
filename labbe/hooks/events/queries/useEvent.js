"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/http";
import { API_PATHS } from "@halla/shared/api/paths";

/**
 * Hook to fetch single event by ID
 * @param {string} eventId
 * @returns {UseQueryResult}
 */
export const useEvent = (eventId, options = {}) => {
  return useQuery({
    queryKey: ["events", eventId],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.events.getEventById(eventId),
      }),
    enabled: !!eventId,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

// Alias for backward compatibility
export const useEventById = useEvent;

export default useEvent;
