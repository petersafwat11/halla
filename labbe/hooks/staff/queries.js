"use client";

import { useQuery } from "@tanstack/react-query";
import { staffService } from "@/services/staff";
import { apiRequest } from "@/services/http";
import { API_PATHS } from "@halla/shared/api/paths";
import { staffKeys } from "./keys";
import { eventsKeys } from "@/hooks/events/keys";

/**
 * Hook to fetch event guests for staff portal.
 */
export const useStaffEventGuests = (eventId, filters = {}, options = {}) => {
  const { search = "", status = "", page = 1, limit = 50 } = filters;
  return useQuery({
    queryKey: staffKeys.guests(eventId, { search, status, page, limit }),
    queryFn: async () => {
      const response = await staffService.getGuests(eventId, {
        search,
        status,
        page,
        limit,
      });
      return response.data || { guests: [], stats: {}, pagination: {} };
    },
    enabled: !!eventId,
    staleTime: 30 * 1000,
    ...options,
  });
};

/**
 * Hook to list staff access tokens for an event (host-facing).
 */
export const useEventStaffTokens = (eventId, options = {}) => {
  return useQuery({
    queryKey: eventsKeys.staffTokens(eventId),
    queryFn: async () => {
      const response = await apiRequest({
        method: "GET",
        path: API_PATHS.events.listStaffTokens(eventId),
      });
      return response.data || { tokens: [] };
    },
    enabled: !!eventId,
    staleTime: 30 * 1000,
    ...options,
  });
};
