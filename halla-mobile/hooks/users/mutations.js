import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  updateProfileAPI,
  changePasswordAPI,
  updateNotificationPreferencesAPI,
} from "../../services/settingsService";
import { usersKeys } from "./keys";

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profileData) => {
      const response = await updateProfileAPI(profileData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersKeys.profile() });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (passwordData) => {
      const response = await changePasswordAPI(passwordData);
      return response.data;
    },
  });
}

export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settingsData) => {
      const response = await updateNotificationPreferencesAPI(settingsData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersKeys.notificationSettings() });
    },
  });
}
