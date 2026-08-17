"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/http";
import { API_PATHS } from "@halaa/shared/api/paths";

/**
 * Hook to fetch my events
 * @returns {UseQueryResult}
 */
export const useMyEvents = (options = {}) => {
  return useQuery({
    queryKey: ["events", "my-events"],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.events.getMyEvents,
      }),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export default useMyEvents;
