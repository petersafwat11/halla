'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';

/**
 * Hook for polling and managing event-wide attendance statistics.
 * Refreshes every 5 seconds while visible, never flashes zeros on error.
 */
export function useStats(eventId) {
  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ['stats', eventId],
    queryFn: () => api.get(`/events/${eventId}/stats`),
    enabled: !!eventId,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: false,
    // Retain previous data only within the same event (F18); failed fetches
    // must not become zero totals — callers surface error instead (F11).
    placeholderData: (previousData, previousQuery) => {
      const prevEventId = previousQuery?.queryKey?.[1];
      if (prevEventId && prevEventId === eventId) return previousData;
      return undefined;
    },
    staleTime: 4000,
  });

  const rawStats = data?.data || {};
  const stats = {
    totalInvitations: rawStats.totalInvitations || 0,
    totalExpected: rawStats.expectedPeople ?? rawStats.totalExpected ?? 0,
    expectedPeople: rawStats.expectedPeople ?? rawStats.totalExpected ?? 0,
    admittedInvitations: rawStats.admittedInvitations || 0,
    totalAttendees: rawStats.actualAttendees ?? rawStats.totalAttendees ?? 0,
    actualAttendees: rawStats.actualAttendees ?? rawStats.totalAttendees ?? 0,
    pendingInvitations: rawStats.pendingInvitations || 0,
    didNotAttendInvitations: rawStats.didNotAttendInvitations ?? rawStats.pendingInvitations ?? 0,
    attendanceRate: rawStats.invitationAttendanceRate ?? rawStats.attendanceRate ?? 0,
    invitationAttendanceRate: rawStats.invitationAttendanceRate ?? rawStats.attendanceRate ?? 0,
    headCountRate: rawStats.capacityAttendanceRate ?? rawStats.headCountRate ?? 0,
    capacityAttendanceRate: rawStats.capacityAttendanceRate ?? rawStats.headCountRate ?? 0,
    asOf: rawStats.asOf || null,
  };

  return {
    stats,
    isLoading: isLoading && !data,
    isFetching,
    error,
    refetch,
  };
}
