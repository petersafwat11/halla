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

  const formDataConfig = (data) =>
    data instanceof FormData
      ? { headers: { "Content-Type": "multipart/form-data" } }
      : undefined;

  const invalidateProfile = () =>
    queryClient.invalidateQueries({ queryKey: ["users", "my-profile"] });

  const mutations = {
    updateProfile: {
      mutationFn: (profileData) =>
        apiRequest({
          method: "PATCH",
          path: API_PATHS.users.updateMyProfile,
          data: profileData,
          config: formDataConfig(profileData),
        }),
      onSuccess: invalidateProfile,
    },

    updateProfileSection: {
      mutationFn: ({ section, data }) =>
        apiRequest({
          method: "PATCH",
          path: API_PATHS.users.updateMyProfileSection(section),
          data,
          config: formDataConfig(data),
        }),
      onSuccess: invalidateProfile,
    },

    updatePassword: {
      mutationFn: (passwordData) =>
        apiRequest({
          method: "PATCH",
          path: API_PATHS.users.updateMyPassword,
          data: passwordData,
        }),
    },

    sendPhoneChangeOtp: {
      mutationFn: ({ phoneNumber }) =>
        apiRequest({
          method: "POST",
          path: API_PATHS.users.sendPhoneChangeOtp,
          data: { phoneNumber },
        }),
    },

    updatePhone: {
      mutationFn: ({ phoneNumber, otp }) =>
        apiRequest({
          method: "PATCH",
          path: API_PATHS.users.updatePhone,
          data: { phoneNumber, otp },
        }),
      onSuccess: invalidateProfile,
    },

    deleteVendorImage: {
      mutationFn: ({ field, key }) =>
        apiRequest({
          method: "DELETE",
          path: API_PATHS.users.deleteVendorImage,
          data: { field, key },
        }),
      onSuccess: invalidateProfile,
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
