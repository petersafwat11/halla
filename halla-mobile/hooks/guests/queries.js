import { useQuery } from "@tanstack/react-query";
import { ENDPOINTS } from "../../config/api";
import { apiFetch } from "../../services/http";
import { useAuthStore } from "../../stores/authStore";
import { guestsKeys } from "./keys";

const GUESTS_BASE = "/guests";

const _resolvePath = (path) => {
  if (!path) return GUESTS_BASE;
  if (path.startsWith(GUESTS_BASE)) return path;
  return `${GUESTS_BASE}${path.startsWith("/") ? path : `/${path}`}`;
};

export const guestsFetch = async (path, init, errorMessage) => {
  const response = await apiFetch(_resolvePath(path), init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || errorMessage);
  return data;
};

/**
 * Fetch the guest list for an event.
 *
 * Backend: GET /guests/events/:eventId.
 * Returns the raw `sendPaginated` envelope `{ success, status, data: [...], pagination }`.
 */
export function useEventGuests(eventId) {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: guestsKeys.forEvent(eventId),
    queryFn: () => {
      if (!eventId) throw new Error("eventId is required");
      return guestsFetch(
        ENDPOINTS.GUESTS.EVENT_GUESTS(eventId),
        { method: "GET" },
        "Failed to load guests",
      );
    },
    enabled: !!eventId && !!token,
    staleTime: 3 * 60 * 1000,
  });
}

export default useEventGuests;
