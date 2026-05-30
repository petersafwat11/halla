import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ENDPOINTS } from "../../config/api";
import { adminRequest } from "../admin/_request";
import { discountsKeys } from "./keys";

const assertOk = (response) => {
  if (!response?.success) {
    throw new Error(response?.error || "Request failed");
  }
  return response.data;
};

export function useCreateDiscount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await adminRequest(
        ENDPOINTS.ADMIN.DISCOUNTS.BASE,
        "POST",
        data,
      );
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: discountsKeys.all });
    },
  });
}

export function useUpdateDiscount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await adminRequest(
        ENDPOINTS.ADMIN.DISCOUNTS.BY_ID(id),
        "PATCH",
        data,
      );
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: discountsKeys.all });
    },
  });
}

export function useDeleteDiscount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const response = await adminRequest(
        ENDPOINTS.ADMIN.DISCOUNTS.BY_ID(id),
        "DELETE",
      );
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: discountsKeys.all });
    },
  });
}

export function useToggleDiscount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const response = await adminRequest(
        ENDPOINTS.ADMIN.DISCOUNTS.TOGGLE(id),
        "PATCH",
      );
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: discountsKeys.all });
    },
  });
}

/**
 * One-shot validation for the host plan-summary screen. No caching — the
 * caller stores the resolved discount in local state.
 */
export function useValidateDiscount() {
  return useMutation({
    mutationFn: async ({ code, amount, planType = null }) => {
      const response = await adminRequest(
        ENDPOINTS.ADMIN.DISCOUNTS.VALIDATE,
        "POST",
        { code, amount, planType },
      );
      // Don't assertOk: the validate endpoint may legitimately return
      // `valid: false` with a 200 + reason. Surface the body so the caller
      // decides what to do.
      if (!response?.success) {
        throw new Error(response?.error || "Validate request failed");
      }
      return response.data;
    },
  });
}
