import { useMutation, useQueryClient } from "@tanstack/react-query";
import { settingsApi, usersApi } from "./_api";
import { usersKeys } from "./keys";

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profileData) => {
      const response = await usersApi.updateProfile(profileData);
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
      const response = await usersApi.updatePassword(passwordData);
      return response.data;
    },
  });
}

export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settingsData) => {
      const response = await settingsApi.updateNotificationPreferences(settingsData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersKeys.notificationSettings() });
    },
  });
}

/**
 * Self-service account deletion (Apple 5.1.1(v) / Google Play data-deletion).
 * The authenticated user is deleted server-side (PII anonymized, owned data
 * cascaded, refresh tokens revoked); on success we wipe the React Query cache.
 * Callers must also clear the auth session (e.g. `authStore.logout()`).
 */
export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    // body carries the reauth credential: `{ password }` or `{ otp }` (§4.1).
    mutationFn: async (body = {}) => usersApi.deleteAccount(body),
    onSuccess: () => {
      queryClient.clear();
    },
  });
}
