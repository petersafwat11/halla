import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";

const TERMINAL = new Set([
  "paid",
  "captured",
  "failed",
  "refunded",
  "voided",
  "partially_refunded",
]);

/**
 * Poll a payment's status during a 3DS return until it lands on a
 * terminal state. The backend `/payments/:id/poll` runs the matching
 * finalization (subscription / addon / checkout bundle) when the row
 * flips to `paid`, so callers only need to read the resolved status.
 *
 * `refetchInterval` flips off once the status is terminal and after the
 * configured `maxAttempts` to avoid runaway polling.
 */
export const usePoll3DS = (moyasarId, options = {}) => {
  const { maxAttempts = 30, intervalMs = 2000, ...rest } = options;
  const attemptsRef = useRef(0);
  const [reachedMaxAttempts, setReachedMaxAttempts] = useState(false);

  const query = useQuery({
    queryKey: ["payments", "poll3ds", moyasarId],
    queryFn: async () => {
      const res = await apiRequest({
        method: "GET",
        path: API_PATHS.hostPayments.poll3ds(moyasarId),
      });
      attemptsRef.current += 1;
      if (attemptsRef.current >= maxAttempts) setReachedMaxAttempts(true);
      return res;
    },
    enabled: !!moyasarId,
    // React Query v5: refetchInterval receives the Query instance.
    refetchInterval: (q) => {
      const status = q.state.data?.data?.status;
      if (status && TERMINAL.has(status)) return false;
      if (attemptsRef.current >= maxAttempts) return false;
      return intervalMs;
    },
    refetchIntervalInBackground: true,
    staleTime: 0,
    ...rest,
  });

  // Reset attempt counter when the polled id changes.
  useEffect(() => {
    attemptsRef.current = 0;
    setReachedMaxAttempts(false);
  }, [moyasarId]);

  const payment = query.data?.data ?? null;
  const status = payment?.status;
  const isTerminal = !!status && TERMINAL.has(status);

  return { ...query, payment, status, isTerminal, reachedMaxAttempts };
};

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
