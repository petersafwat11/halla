"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/http";
import { API_PATHS } from "@halla/shared/api/paths";

/**
 * Hook to fetch event stats
 * @returns {UseQueryResult}
 */
export const useEventStats = (options = {}) => {
  return useQuery({
    queryKey: ["events", "stats"],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.events.getEventStats,
      }),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export default useEventStats;
