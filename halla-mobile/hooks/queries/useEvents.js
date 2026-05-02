import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import * as eventsService2 from '../../services/eventsService2';
import { getHostDashboard } from '../../services/dashboardService';

/**
 * Hook to fetch user events with statistics
 * @returns {Object} Query result with events and stats data
 */
export function useUserEventsWithStats() {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: ['events', 'user-stats'],
    queryFn: async () => {
      const response = await eventsService2.getUserEventsWithStats(token);
      return response;
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch event statistics for all user events
 * @returns {Object} Query result with event stats
 */
export function useEventStats() {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: ['events', 'stats'],
    queryFn: async () => {
      const response = await eventsService2.getEventStats(token);
      return response;
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch statistics for a single event
 * @param {string} eventId - Event ID
 * @returns {Object} Query result with single event stats
 */
export function useSingleEventStats(eventId) {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: ['events', 'single-stats', eventId],
    queryFn: async () => {
      const response = await eventsService2.getSingleEventStats(eventId, token);
      return response;
    },
    enabled: !!token && !!eventId,
    staleTime: 2 * 60 * 1000, // 2 minutes (more frequent for active event)
  });
}

/**
 * Hook to fetch host dashboard stats
 * Matches web frontend's useHostDashboard -> GET /dashboard/host
 * Returns: { stats, lastEvent, subscription, hasEvents }
 */
export function useHostDashboard() {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: ['dashboard', 'host'],
    queryFn: () => getHostDashboard(token),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });
}
