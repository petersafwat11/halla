"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/http";
import { API_PATHS } from "@halla/shared/api/paths";

/**
 * Hook to fetch subscription info for event creation
 * @returns {UseQueryResult}
 */
export const useSubscriptionInfo = (options = {}) => {
  return useQuery({
    queryKey: ["events", "subscription-info"],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.events.getSubscriptionInfo,
      }),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

// Alias for backward compatibility
export const useEventSubscriptionInfo = useSubscriptionInfo;

export default useSubscriptionInfo;
