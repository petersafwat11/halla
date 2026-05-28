import { useQuery } from "@tanstack/react-query";
import * as staffService from "../../services/staffService";
import { listStaffTokens } from "../../services/eventsService";
import { useAuthStore } from "../../stores/authStore";

const EMPTY_GUEST_RESULT = { guests: [], stats: {}, pagination: {} };

/**
 * Hook to fetch the staff portal guest list. Enabled on `!!eventId`;
 * the staff session token is read inside `staffService.getEventGuests`
 * via `secureStorage`. By the time PortalView mounts, `LoginView` has
 * already awaited the token persist, so the read is non-racy.
 */
export function useStaffEventGuests(eventId, filters = {}, options = {}) {
  const { search = "", status = "", page, limit } = filters;
  return useQuery({
    queryKey: ["staff", "guests", eventId, { search, status, page, limit }],
    queryFn: async () => {
      const data = await staffService.getEventGuests(eventId, {
        search: search || undefined,
        status: status || undefined,
        page,
        limit,
      });
      return data || EMPTY_GUEST_RESULT;
    },
    enabled: !!eventId,
    staleTime: 30 * 1000,
    ...options,
  });
}

/**
 * Hook to list staff access tokens for an event (host-facing).
 */
export function useEventStaffTokens(eventId, options = {}) {
  const token = useAuthStore((state) => state.token);
  return useQuery({
    queryKey: ["events", eventId, "staff-tokens"],
    queryFn: async () => {
      const data = await listStaffTokens(eventId);
      return data || { tokens: [] };
    },
    enabled: !!eventId && !!token,
    staleTime: 30 * 1000,
    ...options,
  });
}
