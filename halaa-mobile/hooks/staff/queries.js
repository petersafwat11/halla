import { useQuery } from "@tanstack/react-query";
import { API_BASE_URL, ENDPOINTS } from "../../config/api";
import { fetchWithTimeout } from "../../services/http";
import { loadStaffToken } from "../../services/secureStorage";
import { useAuthStore } from "../../stores/authStore";
import { eventsKeys } from "../events/keys";
import { eventsRequest } from "../events/queries";
import { staffKeys } from "./keys";

const EMPTY_GUEST_RESULT = { guests: [], stats: {}, pagination: {} };

/**
 * Internal helper for staff-portal calls. Staff session JWT lives in
 * expo-secure-store and is read fresh per call. We deliberately use
 * `fetchWithTimeout` (not `apiFetch`) because a 401 here means the staff
 * session expired and the operator must re-verify — we don't want to
 * trigger the user-token refresh path that `apiFetch` runs.
 */
const _buildVerifyError = (response, data) => {
  const err = new Error(data?.message || `Request failed (${response.status})`);
  err.status = response.status;
  err.reason = data?.reason || null;
  return err;
};

export const staffFetch = async (path, options = {}) => {
  const token = await loadStaffToken();
  const url = `${API_BASE_URL}${path}`;
  const response = await fetchWithTimeout(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw _buildVerifyError(response, data);
  return data;
};

/**
 * Hook to fetch the staff portal guest list. Enabled on `!!eventId`;
 * the staff session token is read inside `staffFetch` via secureStorage.
 * By the time PortalView mounts, `LoginView` has already awaited the
 * token persist, so the read is non-racy.
 */
export function useStaffEventGuests(eventId, filters = {}, options = {}) {
  const { search = "", status = "", page, limit } = filters;
  return useQuery({
    queryKey: staffKeys.guests(eventId, { search, status, page, limit }),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      if (page) params.set("page", String(page));
      if (limit) params.set("limit", String(limit));
      const query = params.toString() ? `?${params.toString()}` : "";
      const data = await staffFetch(
        `${ENDPOINTS.STAFF.EVENT_GUESTS(eventId)}${query}`,
      );
      return data?.data || EMPTY_GUEST_RESULT;
    },
    enabled: !!eventId,
    staleTime: 30 * 1000,
    ...options,
  });
}

/**
 * Hook to list staff access tokens for an event (host-facing).
 */
export function useEventStaffTokens(eventId, options = {}) {
  const token = useAuthStore((state) => state.token);
  return useQuery({
    queryKey: eventsKeys.staffTokens(eventId),
    queryFn: async () => {
      if (!eventId) throw new Error("eventId is required");
      const res = await eventsRequest(ENDPOINTS.EVENTS.LIST_STAFF_TOKENS(eventId));
      return res?.data || { tokens: [] };
    },
    enabled: !!eventId && !!token,
    staleTime: 30 * 1000,
    ...options,
  });
}
