"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";
import { notificationsKeys } from "./keys";

export const useNotifications = (params = {}, options = {}) => {
  return useQuery({
    queryKey: notificationsKeys.list(params),
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.notifications.getNotifications,
        params,
      }),
    staleTime: 30 * 1000,
    ...options,
  });
};

export const useUnreadNotificationCount = (options = {}) => {
  return useQuery({
    queryKey: notificationsKeys.unreadCount(),
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.notifications.getUnreadCount,
      }),
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000,
    ...options,
  });
};

export const useNotification = (notificationId, options = {}) => {
  return useQuery({
    queryKey: notificationsKeys.detail(notificationId),
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.notifications.getNotification(notificationId),
      }),
    enabled: !!notificationId,
    staleTime: 30 * 1000,
    ...options,
  });
};
