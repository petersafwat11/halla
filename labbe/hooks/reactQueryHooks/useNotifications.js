"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";

// ============================================
// NOTIFICATIONS QUERIES
// ============================================

/**
 * Hook to fetch user notifications
 * @param {Object} params - Query parameters
 * @returns {UseQueryResult}
 */
export const useNotifications = (params = {}, options = {}) => {
  return useQuery({
    queryKey: ["notifications", params],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.notifications.getNotifications,
        params,
      }),
    staleTime: 30 * 1000, // 30 seconds
    ...options,
  });
};

/**
 * Hook to fetch unread notification count
 * @returns {UseQueryResult}
 */
export const useUnreadNotificationCount = (options = {}) => {
  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.notifications.getUnreadCount,
      }),
    staleTime: 15 * 1000, // 15 seconds
    refetchInterval: 30 * 1000, // Poll every 30 seconds
    ...options,
  });
};

/**
 * Hook to fetch single notification
 * @param {string} notificationId
 * @returns {UseQueryResult}
 */
export const useNotification = (notificationId, options = {}) => {
  return useQuery({
    queryKey: ["notifications", notificationId],
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

// ============================================
// NOTIFICATIONS MUTATIONS
// ============================================

/**
 * Unified Notifications Mutation Hook
 * @param {string} action - The notification action to perform
 * @returns {UseMutationResult}
 */
export const useNotificationMutation = (action) => {
  const queryClient = useQueryClient();

  const mutations = {
    // Mark notification as read
    markAsRead: {
      mutationFn: (notificationId) =>
        apiRequest({
          method: "PATCH",
          path: API_PATHS.notifications.markAsRead(notificationId),
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
      },
    },

    // Mark all notifications as read
    markAllAsRead: {
      mutationFn: () =>
        apiRequest({
          method: "PATCH",
          path: API_PATHS.notifications.markAllAsRead,
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
      },
    },

    // Delete notification
    deleteNotification: {
      mutationFn: (notificationId) =>
        apiRequest({
          method: "DELETE",
          path: API_PATHS.notifications.deleteNotification(notificationId),
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
      },
    },

    // Clear all notifications
    clearAll: {
      mutationFn: () =>
        apiRequest({
          method: "DELETE",
          path: API_PATHS.notifications.clearAllNotifications,
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
      },
    },

    // Admin: Send notification
    adminSend: {
      mutationFn: (data) =>
        apiRequest({
          method: "POST",
          path: API_PATHS.notifications.sendNotification,
          data,
        }),
    },

    // Admin: Broadcast notification
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
