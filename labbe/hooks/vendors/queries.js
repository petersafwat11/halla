"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/http";
import { API_PATHS } from "@halla/shared/api/paths";
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
