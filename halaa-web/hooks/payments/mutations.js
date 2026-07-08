"use client";

import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/services/http";
import { API_PATHS } from "@halaa/shared/api/paths";

/**
 * Trigger an Excel export of the calling user's payments. Mirrors
 * `useAdminPaymentsExport` but hits `/subscriptions/payments/export`.
 */
export const useMyPaymentsExport = () => {
  return useMutation({
    mutationFn: async (filters = {}) => {
      const blob = await apiRequest({
        method: "GET",
        path: API_PATHS.hostPayments.export,
        params: filters,
        isExport: true,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `my_payments_${new Date()
        .toISOString()
        .split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      return { ok: true };
    },
  });
};
