"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/http";
import { API_PATHS } from "@halaa/shared/api/paths";
import { eventsKeys } from "../keys";

/**
 * Hook to fetch event capabilities / entitlement based on event owner and stamped subscription.
 * Resolves EVT-10 for admin-on-behalf event editing.
 * @param {string} eventId
 * @param {Object} options
 * @returns {UseQueryResult}
 */
export const useEventCapabilities = (eventId, options = {}) => {
  return useQuery({
    queryKey: eventsKeys.capabilities(eventId),
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.events.capabilities(eventId),
      }),
    enabled: !!eventId,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export const useEventEntitlement = useEventCapabilities;

export default useEventCapabilities;
