import { useMutation, useQueryClient } from "@tanstack/react-query";
import { settingsApi, usersApi } from "./_api";
import { usersKeys } from "./keys";
import { useAuthStore } from "../../stores/authStore";

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
      const user = response?.data?.user || response?.user;
      const accessToken = response?.token || response?.accessToken;
      const refreshToken = response?.refreshToken;

      if (accessToken && refreshToken) {
        const authStore = useAuthStore.getState();
        const role = user?.role || authStore.role;
        await authStore._persistAuth({
          user: user || authStore.user,
          accessToken,
          refreshToken,
          role,
        });
      }

      return response?.data || response;
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
 * Email verification (SET-02). On success the backend returns the updated
 * user DTO; we flip `emailVerified` in the persisted auth-store snapshot
 * immediately AND invalidate the canonical profile query so every surface
 * reflects the verified state without an app relaunch.
 */
export function useVerifyEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (code) => {
      const response = await settingsApi.verifyEmail(code);
      return response?.data || response;
    },
    onSuccess: async (data) => {
      const authStore = useAuthStore.getState();
      const updatedUser = {
        ...(authStore.user || {}),
        ...(data?.user || {}),
        emailVerified: true,
      };
      await authStore.setUser(updatedUser);
      queryClient.invalidateQueries({ queryKey: usersKeys.profile() });
      return updatedUser;
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
