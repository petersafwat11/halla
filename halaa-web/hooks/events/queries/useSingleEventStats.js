"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/http";
import { API_PATHS } from "@halaa/shared/api/paths";

/**
 * Stats polling cadence:
 *   live      → 30s
 *   completed → 5min
 *   draft / scheduled / failed → no polling
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
    } catch (_) {}
  }
  return POLL_INTERVALS[eventStatus] || false;
};

/**
 * Hook to fetch single event stats with dynamic query status polling callback.
 *
 * @param {string} eventId
 * @param {Object} [options]
 * @param {string} [options.eventStatus]
 */
export const useSingleEventStats = (eventId, options = {}) => {
  const { eventStatus, ...rest } = options;

  return useQuery({
    queryKey: ["events", eventId, "stats"],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.events.getSingleEventStats(eventId),
      }),
    enabled: !!eventId,
    staleTime: 0,
    refetchInterval: (query) => {
      const resp = query?.state?.data?.data;
      const currentStatus = resp?.status || resp?.event?.status || eventStatus;
      return getPollInterval(currentStatus);
    },
    refetchIntervalInBackground: false,
    ...rest,
  });
};

export default useSingleEventStats;
