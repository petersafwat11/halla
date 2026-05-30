"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/http";
import { API_PATHS } from "@halla/shared/api/paths";
import { usersKeys } from "./keys";

export const useUserMutation = (action) => {
  const queryClient = useQueryClient();

  const formDataConfig = (data) =>
    data instanceof FormData
      ? { headers: { "Content-Type": "multipart/form-data" } }
      : undefined;

  const invalidateProfile = () =>
    queryClient.invalidateQueries({ queryKey: usersKeys.myProfile() });

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
        queryClient.invalidateQueries({ queryKey: usersKeys.notificationPreferences() });
      },
    },
  };

  const mutationConfig = mutations[action];

  if (!mutationConfig) {
    throw new Error(`Unknown user action: ${action}`);
  }

  return useMutation(mutationConfig);
};
