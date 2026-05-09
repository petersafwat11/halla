"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";

export const useMyProfile = (options = {}) => {
  return useQuery({
    queryKey: ["users", "my-profile"],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.users.getMyProfile,
      }),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export const useNotificationPreferences = (options = {}) => {
  return useQuery({
    queryKey: ["users", "notification-preferences"],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.users.getNotificationPreferences,
      }),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export const useUserMutation = (action) => {
  const queryClient = useQueryClient();

  const mutations = {
    updateProfile: {
      mutationFn: (profileData) =>
        apiRequest({
          method: "PATCH",
          path: API_PATHS.users.updateMyProfile,
          data: profileData,
          config: profileData instanceof FormData
            ? { headers: { "Content-Type": "multipart/form-data" } }
            : undefined,
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["users", "my-profile"] });
      },
    },

    updateProfileSection: {
      mutationFn: ({ section, data }) =>
        apiRequest({
          method: "PATCH",
          path: API_PATHS.users.updateMyProfileSection(section),
          data,
          config: data instanceof FormData
            ? { headers: { "Content-Type": "multipart/form-data" } }
            : undefined,
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["users", "my-profile"] });
      },
    },

    updatePassword: {
      mutationFn: (passwordData) =>
        apiRequest({
          method: "PATCH",
          path: API_PATHS.users.updateMyPassword,
          data: passwordData,
        }),
    },

    updateNotificationPreferences: {
      mutationFn: (preferences) =>
        apiRequest({
          method: "PATCH",
          path: API_PATHS.users.updateNotificationPreferences,
          data: preferences,
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["users", "notification-preferences"] });
      },
    },
  };

  const mutationConfig = mutations[action];

  if (!mutationConfig) {
    throw new Error(`Unknown user action: ${action}`);
  }

  return useMutation(mutationConfig);
};
