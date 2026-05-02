"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";

/**
 * Hook to fetch single event stats
 * @param {string} eventId
 * @returns {UseQueryResult}
 */
export const useSingleEventStats = (eventId, options = {}) => {
  return useQuery({
    queryKey: ["events", eventId, "stats"],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.events.getSingleEventStats(eventId),
      }),
    enabled: !!eventId,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export default useSingleEventStats;
