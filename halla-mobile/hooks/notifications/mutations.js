import { useMutation, useQueryClient } from "@tanstack/react-query";
import notificationService from "../../services/notificationService";
import { notificationsKeys } from "./keys";

export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const response = await notificationService.markAsRead(id);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationsKeys.all });
    },
  });
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await notificationService.markAllAsRead();
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationsKeys.all });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const response = await notificationService.deleteNotification(id);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationsKeys.all });
    },
  });
}

export function useClearAllNotifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await notificationService.clearAllNotifications();
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationsKeys.all });
    },
  });
}

export function useSendNotification() {
  return useMutation({
    mutationFn: async (data) => {
      const response = await notificationService.sendNotification(data);
      return response.data;
    },
  });
}

export function useBroadcastNotification() {
  return useMutation({
    mutationFn: async (data) => {
      const response = await notificationService.broadcastNotification(data);
      return response.data;
    },
  });
}
