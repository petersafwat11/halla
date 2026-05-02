"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";

/**
 * Stats polling cadence (Phase 3d.4 / decision D4).
 *
 *   live      → 30s
 *   completed → 5min
 *   draft / scheduled / failed → no polling
 *
 * The `eventStatus` argument flips the React Query `refetchInterval` on
 * the next render. React Query also handles unmount cleanup and
 * cancellation of inflight queries on re-poll automatically (same
 * queryKey).
 *
 * Override for QA: set `localStorage.STATS_POLL_INTERVAL_MS = "<ms>"`
 * (number) to use a fixed interval regardless of status.
 */
const POLL_INTERVALS = {
  live: 30 * 1000,
  completed: 5 * 60 * 1000,
};

const getPollInterval = (eventStatus) => {
  if (typeof window !== "undefined") {
    try {
      const override = parseInt(
        window.localStorage?.getItem?.("STATS_POLL_INTERVAL_MS") || "",
        10
      );
      if (Number.isFinite(override) && override >= 1000) return override;
    } catch (_) {
      /* ignore */
    }
  }
  return POLL_INTERVALS[eventStatus] || false;
};

/**
 * Hook to fetch single event stats. Pass the event's current status to
 * activate the polling cadence; omit it (or pass null) for one-shot.
 *
 * @param {string} eventId
 * @param {Object} [options]
 * @param {string} [options.eventStatus]
 */
export const useSingleEventStats = (eventId, options = {}) => {
  const { eventStatus, ...rest } = options;
  const refetchInterval = getPollInterval(eventStatus);

  return useQuery({
    queryKey: ["events", eventId, "stats"],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.events.getSingleEventStats(eventId),
      }),
    enabled: !!eventId,
    staleTime: refetchInterval ? 0 : 5 * 60 * 1000,
    refetchInterval,
    refetchIntervalInBackground: false,
    ...rest,
  });
};

export default useSingleEventStats;
