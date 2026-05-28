import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../stores/authStore";
import { getEventGuests } from "../../services/eventGuestsService";

/**
 * Fetch the guest list for an event.
 *
 * Backend: GET /guests/events/:eventId.
 * Returns the raw `sendPaginated` envelope `{ success, status, data: [...], pagination }`.
 */
export function useEventGuests(eventId) {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: ["guests", "events", eventId],
    queryFn: () => getEventGuests(eventId),
    enabled: !!eventId && !!token,
    staleTime: 3 * 60 * 1000,
  });
}

export default useEventGuests;
