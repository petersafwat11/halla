"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";
import { dashboardKeys } from "./keys";

export const useHostDashboard = (options = {}) => {
  return useQuery({
    queryKey: dashboardKeys.host(),
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.dashboard.getHostDashboard,
      }),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};
