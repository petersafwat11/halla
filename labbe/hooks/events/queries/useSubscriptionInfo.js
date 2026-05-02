"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";

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
