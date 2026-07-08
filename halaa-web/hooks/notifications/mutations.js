"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/http";
import { API_PATHS } from "@halla/shared/api/paths";
import { notificationsKeys } from "./keys";

export const useNotificationMutation = (action) => {
  const queryClient = useQueryClient();

  const mutations = {
    markAsRead: {
      mutationFn: (notificationId) =>
        apiRequest({
          method: "PATCH",
          path: API_PATHS.notifications.markAsRead(notificationId),
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: notificationsKeys.all });
      },
    },

    markAllAsRead: {
      mutationFn: () =>
        apiRequest({
          method: "PATCH",
          path: API_PATHS.notifications.markAllAsRead,
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: notificationsKeys.all });
      },
    },

    deleteNotification: {
      mutationFn: (notificationId) =>
        apiRequest({
          method: "DELETE",
          path: API_PATHS.notifications.deleteNotification(notificationId),
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: notificationsKeys.all });
      },
    },

    clearAll: {
      mutationFn: () =>
        apiRequest({
          method: "DELETE",
          path: API_PATHS.notifications.clearAllNotifications,
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: notificationsKeys.all });
      },
    },

    adminSend: {
      mutationFn: (data) =>
        apiRequest({
          method: "POST",
          path: API_PATHS.notifications.sendNotification,
          data,
        }),
    },

    adminBroadcast: {
      mutationFn: (data) =>
        apiRequest({
          method: "POST",
          path: API_PATHS.notifications.broadcastNotification,
          data,
        }),
    },
  };

  const mutationConfig = mutations[action];

  if (!mutationConfig) {
    throw new Error(`Unknown notification action: ${action}`);
  }

  return useMutation({
    ...mutationConfig,
    onError: (error) => {
      console.error(`Notification mutation error (${action}):`, error);
    },
  });
};
