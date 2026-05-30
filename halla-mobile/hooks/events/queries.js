import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../stores/authStore";
import * as eventsService2 from "../../services/eventsService";
import { eventsKeys } from "./keys";

/**
 * Fetch user events with statistics.
 */
export function useUserEventsWithStats() {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: eventsKeys.userStats(),
    queryFn: async () => {
      const response = await eventsService2.getUserEventsWithStats();
      return response;
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch event statistics for all user events.
 */
export function useEventStats() {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: eventsKeys.stats(),
    queryFn: async () => {
      const response = await eventsService2.getEventStats();
      return response;
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Stats polling cadence:
 *
 *   live      → 30s
 *   completed → 5min
 *   draft / scheduled / failed → no polling
 *
 * Override for QA via the `EXPO_PUBLIC_STATS_POLL_INTERVAL_MS` env var.
 */
const POLL_INTERVALS = {
  live: 30 * 1000,
  completed: 5 * 60 * 1000,
};

const _statsPollInterval = (eventStatus) => {
  const override = parseInt(
    process.env.EXPO_PUBLIC_STATS_POLL_INTERVAL_MS || "",
    10
  );
  if (Number.isFinite(override) && override >= 1000) return override;
  return POLL_INTERVALS[eventStatus] || false;
};

/**
 * Fetch statistics for a single event.
 *
 * Signature is options-object first to match the web hook
 * (`labbe/hooks/events/queries/useSingleEventStats.js`). Calls that
 * pass a positional eventStatus (legacy mobile pattern) still work
 * via a backwards-compatible shim — but new code should pass
 * `{ eventStatus }` so the two tiers stay structurally identical.
 *
 * Pass `eventStatus` to enable status-keyed polling. Without it the
 * hook is one-shot (with a 2-minute staleTime as before).
 *
 * @param {string} eventId
 * @param {{ eventStatus?: string } | string} [opts]
 */
export function useSingleEventStats(eventId, opts) {
  const eventStatus = typeof opts === "string" ? opts : opts?.eventStatus;
  const token = useAuthStore((state) => state.token);
  const refetchInterval = _statsPollInterval(eventStatus);

  return useQuery({
    queryKey: eventsKeys.singleStats(eventId),
    queryFn: async () => {
      const response = await eventsService2.getSingleEventStats(eventId);
      return response;
    },
    enabled: !!token && !!eventId,
    staleTime: refetchInterval ? 0 : 2 * 60 * 1000,
    refetchInterval,
    refetchIntervalInBackground: false,
  });
}
