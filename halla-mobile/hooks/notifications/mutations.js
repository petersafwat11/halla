import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../stores/authStore";
import notificationService from "../../services/notificationService";
import { notificationsKeys } from "./keys";

export function useMarkAsRead() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);

  return useMutation({
    mutationFn: async (id) => {
      const response = await notificationService.markAsRead(id, token);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationsKeys.all });
    },
  });
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);

  return useMutation({
    mutationFn: async () => {
      const response = await notificationService.markAllAsRead(token);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationsKeys.all });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);

  return useMutation({
    mutationFn: async (id) => {
      const response = await notificationService.deleteNotification(id, token);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationsKeys.all });
    },
  });
}

export function useClearAllNotifications() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);

  return useMutation({
    mutationFn: async () => {
      const response = await notificationService.clearAllNotifications(token);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationsKeys.all });
    },
  });
}

export function useSendNotification() {
  const token = useAuthStore((state) => state.token);

  return useMutation({
    mutationFn: async (data) => {
      const response = await notificationService.sendNotification(data, token);
      return response.data;
    },
  });
}

export function useBroadcastNotification() {
  const token = useAuthStore((state) => state.token);

  return useMutation({
    mutationFn: async (data) => {
      const response = await notificationService.broadcastNotification(data, token);
      return response.data;
    },
  });
}
