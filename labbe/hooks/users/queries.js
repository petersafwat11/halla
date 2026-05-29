"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";
import { usersKeys } from "./keys";

export const useMyProfile = (options = {}) => {
  return useQuery({
    queryKey: usersKeys.myProfile(),
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
    queryKey: usersKeys.notificationPreferences(),
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.users.getNotificationPreferences,
      }),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};
