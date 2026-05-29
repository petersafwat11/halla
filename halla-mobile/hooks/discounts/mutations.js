import { useMutation, useQueryClient } from "@tanstack/react-query";
import adminDashboardService from "../../services/adminDashboardService";
import { useAuthStore } from "../../stores/authStore";
import { discountsKeys } from "./keys";

const assertOk = (response) => {
  if (!response?.success) {
    throw new Error(response?.error || "Request failed");
  }
  return response.data;
};

export function useCreateDiscount() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  return useMutation({
    mutationFn: async (data) => {
      const response = await adminDashboardService.discounts.create(token, data);
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: discountsKeys.all });
    },
  });
}

export function useUpdateDiscount() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await adminDashboardService.discounts.update(token, id, data);
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: discountsKeys.all });
    },
  });
}

export function useDeleteDiscount() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  return useMutation({
    mutationFn: async (id) => {
      const response = await adminDashboardService.discounts.delete(token, id);
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: discountsKeys.all });
    },
  });
}

export function useToggleDiscount() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  return useMutation({
    mutationFn: async (id) => {
      const response = await adminDashboardService.discounts.toggleStatus(token, id);
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
  const token = useAuthStore((state) => state.token);
  return useMutation({
    mutationFn: async ({ code, amount, planType = null }) => {
      const response = await adminDashboardService.discounts.validate(token, {
        code,
        amount,
        planType,
      });
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
