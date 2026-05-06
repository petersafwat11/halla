"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { staffService } from "@/services/staff";

const EMPTY_STATS = {
  total: 0,
  confirmed: 0,
  checkedIn: 0,
  declined: 0,
  pending: 0,
};

/**
 * React Query hook for the staff portal guest list.
 * Enabled only when both eventId is set and the staff member is authenticated.
 *
 * Returns the standard React Query shape plus a `refetch` helper bound to
 * the query key so check-in mutations can invalidate cleanly.
 */
export function useStaffGuests(eventId, isAuthenticated) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["staff", "guests", eventId],
    queryFn: async () => {
      const response = await staffService.getGuests(eventId);
      return response.data || { guests: [], stats: EMPTY_STATS };
    },
    enabled: !!eventId && isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["staff", "guests", eventId] });

  return {
    guests: query.data?.guests || [],
    stats: query.data?.stats || EMPTY_STATS,
    isLoading: query.isLoading,
    isError: query.isError,
    invalidate,
  };
}
