"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";
import { discountsKeys } from "./keys";

export const useDiscounts = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: discountsKeys.adminList(filters),
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.discounts.list,
        params: filters,
      }),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export const useDiscount = (id, options = {}) => {
  return useQuery({
    queryKey: discountsKeys.detail(id),
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.discounts.byId(id),
      }),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};
