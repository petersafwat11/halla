"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";

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
