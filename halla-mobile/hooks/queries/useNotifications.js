import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import notificationService from '../../services/notificationService';

/**
 * Hook to fetch user notifications with infinite scroll
 * @param {Object} params - Optional parameters (limit, type, etc.)
 * @returns {Object} Infinite query result with notifications data
 */
export function useNotifications(params = {}) {
  const token = useAuthStore((state) => state.token);
  const limit = params.limit || 20;

  return useInfiniteQuery({
    queryKey: ['notifications', { limit }],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await notificationService.getNotifications(
        { ...params, page: pageParam, limit },
        token,
      );
      // Backend returns: { success, status, data: { notifications, pagination, unreadCount } }
      return {
        notifications: response.data?.notifications || [],
        pagination: response.data?.pagination || {},
        unreadCount: response.data?.unreadCount || 0,
      };
    },
    getNextPageParam: (lastPage) => {
      const { pagination } = lastPage;
      if (pagination.page < pagination.pages) {
        return pagination.page + 1;
      }
      return undefined;
    },
    enabled: !!token,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook to fetch unread notification count
 * @returns {Object} Query result with unread count
 */
export function useUnreadCount() {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const response = await notificationService.getUnreadCount(token);
      return { count: response.data?.unreadCount || 0 };
    },
    enabled: !!token,
    staleTime: 1 * 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
  });
}
