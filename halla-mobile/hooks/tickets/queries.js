import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../stores/authStore";
import { apiFetch } from "../../services/apiClient";
import { ENDPOINTS } from "../../config/api";
import { getTicketsAPI, getTicketAPI } from "../../services/ticketsService";
import { ticketsKeys } from "./keys";

const _request = async (path, errorMessage) => {
  const response = await apiFetch(path, { method: "GET" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || errorMessage);
  return data;
};

export function useTickets(filters = {}) {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: ticketsKeys.list(filters),
    queryFn: async () => {
      const response = await getTicketsAPI(filters);
      return response;
    },
    enabled: !!token,
    staleTime: 3 * 60 * 1000,
  });
}

export function useTicket(ticketId) {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: ticketsKeys.detail(ticketId),
    queryFn: async () => {
      const response = await getTicketAPI(ticketId);
      return response;
    },
    enabled: !!token && !!ticketId,
    staleTime: 3 * 60 * 1000,
  });
}

/**
 * Fetches assignees (admins + moderators with `manage_tickets`) for the
 * AssignTicketModal. Backed by GET /tickets/assignees — same source web uses.
 */
export function useTicketAssignees() {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: ticketsKeys.assignees(),
    queryFn: () =>
      _request(`${ENDPOINTS.TICKETS.BASE}/assignees`, "Failed to get assignees"),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });
}
