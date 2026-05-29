"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";
import { discountsKeys } from "./keys";

export const useCreateDiscount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) =>
      apiRequest({
        method: "POST",
        path: API_PATHS.discounts.create,
        data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: discountsKeys.all });
    },
  });
};

export const useUpdateDiscount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) =>
      apiRequest({
        method: "PATCH",
        path: API_PATHS.discounts.update(id),
        data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: discountsKeys.all });
    },
  });
};

export const useToggleDiscount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) =>
      apiRequest({
        method: "PATCH",
        path: API_PATHS.discounts.toggle(id),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: discountsKeys.all });
    },
  });
};

export const useDeleteDiscount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) =>
      apiRequest({
        method: "DELETE",
        path: API_PATHS.discounts.delete(id),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: discountsKeys.all });
    },
  });
};

// Why: validation is a one-shot mutation (not a query) — the caller wants the
// fresh result every time, no cache. The host plan-summary page applies the
// code on a button click, then keeps the resolved discount in local state.
export const useValidateDiscount = () => {
  return useMutation({
    mutationFn: ({ code, amount, planType = null }) =>
      apiRequest({
        method: "POST",
        path: API_PATHS.discounts.validate,
        data: { code, amount, planType },
      }),
  });
};
