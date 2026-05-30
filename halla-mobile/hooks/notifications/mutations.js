import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsKeys } from "./keys";
import { notificationsRequest } from "./queries";

export function useMarkAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const response = await notificationsRequest(`/${id}/read`, {
        method: "PATCH",
      });
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
      const response = await notificationsRequest("/read-all", {
        method: "PATCH",
      });
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
      const response = await notificationsRequest(`/${id}`, {
        method: "DELETE",
      });
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
      const response = await notificationsRequest("/clear-all", {
        method: "DELETE",
      });
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
      const response = await notificationsRequest("/send", {
        method: "POST",
        body: data,
      });
      return response.data;
    },
  });
}

export function useBroadcastNotification() {
  return useMutation({
    mutationFn: async (data) => {
      const response = await notificationsRequest("/broadcast", {
        method: "POST",
        body: data,
      });
      return response.data;
    },
  });
}
