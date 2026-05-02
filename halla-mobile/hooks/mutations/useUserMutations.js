import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import {
  updateProfileAPI,
  changePasswordAPI,
  updateNotificationPreferencesAPI,
} from '../../services/settingsService';

/**
 * Hook to update user profile
 * @returns {Object} Mutation object
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);

  return useMutation({
    mutationFn: async (profileData) => {
      const response = await updateProfileAPI(profileData, token);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate user profile query
      queryClient.invalidateQueries({ queryKey: ['user', 'profile'] });
    },
  });
}

/**
 * Hook to change user password
 * @returns {Object} Mutation object
 */
export function useChangePassword() {
  const token = useAuthStore((state) => state.token);

  return useMutation({
    mutationFn: async (passwordData) => {
      const response = await changePasswordAPI(passwordData, token);
      return response.data;
    },
  });
}

/**
 * Hook to update notification settings
 * @returns {Object} Mutation object
 */
export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);

  return useMutation({
    mutationFn: async (settingsData) => {
      const response = await updateNotificationPreferencesAPI(settingsData, token);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate notification settings query
      queryClient.invalidateQueries({ queryKey: ['user', 'notification-settings'] });
    },
  });
}
