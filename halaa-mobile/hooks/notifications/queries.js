import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { ENDPOINTS } from "../../config/api";
import { apiFetch } from "../../services/http";
import { useAuthStore } from "../../stores/authStore";
import { notificationsKeys } from "./keys";

const buildQueryString = (params = {}) => {
  const qs = new URLSearchParams(
    Object.entries(params).filter(
      ([, v]) => v !== undefined && v !== null && v !== ""
    )
  ).toString();
  return qs ? `?${qs}` : "";
};

const notificationsRequest = async (suffix = "", options = {}) => {
  const path = `${ENDPOINTS.NOTIFICATIONS.BASE}${suffix}`;
  const fetchOpts = {
    method: options.method || "GET",
    headers: options.headers || {},
  };
  if (options.body !== undefined && options.body !== null) {
    if (typeof options.body === "string") {
      try {
        fetchOpts.body = JSON.parse(options.body);
      } catch (_) {
        fetchOpts.body = options.body;
      }
    } else {
      fetchOpts.body = options.body;
    }
  }
  const res = await apiFetch(path, fetchOpts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "API request failed");
  return data;
};

// Exported so mutations.js shares the same request shape.
export { notificationsRequest };

export function useNotifications(params = {}) {
  const token = useAuthStore((state) => state.token);
  const limit = params.limit || 20;

  return useInfiniteQuery({
    queryKey: notificationsKeys.list({ limit }),
    queryFn: async ({ pageParam = 1 }) => {
      const response = await notificationsRequest(
        buildQueryString({ ...params, page: pageParam, limit })
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
      const response = await notificationsRequest("/unread-count");
      return { count: response.data?.unreadCount || 0 };
    },
    enabled: !!token,
    staleTime: 1 * 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
  });
}
