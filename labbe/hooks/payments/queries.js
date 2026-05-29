"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";
import { paymentsKeys } from "./keys";

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
    queryKey: paymentsKeys.poll3ds(moyasarId),
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

  useEffect(() => {
    attemptsRef.current = 0;
    setReachedMaxAttempts(false);
  }, [moyasarId]);

  const payment = query.data?.data ?? null;
  const status = payment?.status;
  const isTerminal = !!status && TERMINAL.has(status);

  return { ...query, payment, status, isTerminal, reachedMaxAttempts };
};
