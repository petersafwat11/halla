import { useQuery } from "@tanstack/react-query";
import { ENDPOINTS } from "../../config/api";
import { apiFetch } from "../../services/http";
import { useAuthStore } from "../../stores/authStore";
import { eventsKeys } from "./keys";

const eventsRequest = async (path, options = {}) => {
  const fetchOpts = {
    method: options.method || "GET",
    headers: options.headers || {},
  };
  if (options.body !== undefined && options.body !== null) {
    fetchOpts.body =
      typeof options.body === "string" ? JSON.parse(options.body) : options.body;
  }
  const res = await apiFetch(path, fetchOpts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "API request failed");
  return data;
};

// Exposed so cross-domain hooks (users/subscriptionInfo, staff/tokens) share
// the same request shape without re-importing the deleted service.
export { eventsRequest };

/**
 * Fetch user events with statistics.
 */
export function useUserEventsWithStats() {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: eventsKeys.userStats(),
    queryFn: async () => {
      const data = await eventsRequest(ENDPOINTS.EVENTS.STATS);
      const stats = data?.data || {};
      return {
        totalEvents: stats.totalEvents || 0,
        activeEvents: stats.activeEvents || 0,
        completedEvents: stats.completedEvents || 0,
        totalGuests: stats.totalGuests || 0,
        confirmedGuests: stats.confirmedGuests || 0,
      };
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
      const [statsData, eventsData] = await Promise.all([
        eventsRequest(ENDPOINTS.EVENTS.STATS),
        eventsRequest(`${ENDPOINTS.EVENTS.MY_EVENTS}?limit=50`),
      ]);
      const stats = statsData?.data || {};
      const events = Array.isArray(eventsData?.data) ? eventsData.data : [];
      const totalGuests = stats.totalGuests || 0;
      const confirmedGuests = stats.confirmedGuests || 0;
      const respondedGuests = confirmedGuests + (stats.checkedInGuests || 0);
      return {
        allGuests: totalGuests,
        attendanceRate:
          totalGuests > 0 ? Math.round((confirmedGuests / totalGuests) * 100) : 0,
        responseRate:
          totalGuests > 0 ? Math.round((respondedGuests / totalGuests) * 100) : 0,
        events,
      };
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
      const [statsRes, eventRes] = await Promise.all([
        eventsRequest(ENDPOINTS.EVENTS.SINGLE_STATS(eventId)),
        eventsRequest(ENDPOINTS.EVENTS.BY_ID(eventId)),
      ]);
      const stats = statsRes?.data || {};
      const eventData = eventRes?.data || {};
      const guestList = Array.isArray(eventData.guestList) ? eventData.guestList : [];
      const staffList = Array.isArray(eventData.staffList) ? eventData.staffList : [];
      const guests = guestList.map((guest) => ({
        guestId: guest._id || guest.id,
        name: guest.name || "ضيف",
        phone: guest.phone || "",
        status: guest.status || "invited",
        respondedAt: guest.rsvp?.respondedAt || guest.respondedAt || null,
        addedBy: guest.addedBy || "",
      }));
      return {
        event: eventData,
        guests,
        staff: staffList,
        confirmed: stats.confirmed || 0,
        declined: stats.declined || 0,
        pending: stats.pending || 0,
        maybe: stats.maybe || 0,
        checkedIn: stats.checkedIn || 0,
        totalGuests: stats.totalGuests || 0,
      };
    },
    enabled: !!token && !!eventId,
    staleTime: refetchInterval ? 0 : 2 * 60 * 1000,
    refetchInterval,
    refetchIntervalInBackground: false,
  });
}

/**
 * Fetch a single event by id. Returns the event payload (backend's
 * `data` field). Used as a `useQuery` where reactive caching is wanted;
 * imperative load paths (e.g. update-event gate) inline `apiFetch`
 * directly.
 */
export function useEventById(eventId, opts = {}) {
  const token = useAuthStore((state) => state.token);
  return useQuery({
    queryKey: eventsKeys.detail(eventId),
    queryFn: async () => {
      const data = await eventsRequest(ENDPOINTS.EVENTS.BY_ID(eventId));
      return data?.data || {};
    },
    enabled: !!token && !!eventId,
    staleTime: 60 * 1000,
    ...opts,
  });
}
