import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../stores/authStore";
import notificationService from "../../services/notificationService";
import { notificationsKeys } from "./keys";

export function useNotifications(params = {}) {
  const token = useAuthStore((state) => state.token);
  const limit = params.limit || 20;

  return useInfiniteQuery({
    queryKey: notificationsKeys.list({ limit }),
    queryFn: async ({ pageParam = 1 }) => {
      const response = await notificationService.getNotifications(
        { ...params, page: pageParam, limit },
        token,
      );
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

export function useUnreadCount() {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: notificationsKeys.unreadCount(),
    queryFn: async () => {
      const response = await notificationService.getUnreadCount(token);
      return { count: response.data?.unreadCount || 0 };
    },
    enabled: !!token,
    staleTime: 1 * 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
  });
}
