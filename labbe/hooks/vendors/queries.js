"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";
import { vendorsKeys } from "./keys";

export const useVendorCategories = (options = {}) => {
  return useQuery({
    queryKey: vendorsKeys.categories(),
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.vendors.getCategories,
      }),
    staleTime: 60 * 60 * 1000,
    ...options,
  });
};
