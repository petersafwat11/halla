import { useQuery } from "@tanstack/react-query";
import { ENDPOINTS } from "../../config/api";
import { apiFetch } from "../../services/http";
import { saveBlobAndShare } from "../../utils/download";
import { useAuthStore } from "../../stores/authStore";
import { ticketsKeys } from "./keys";

const _request = async (path, init, errorMessage) => {
  const response = await apiFetch(path, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || errorMessage);
  return data;
};

const _filenameFromResponse = (response, path) => {
  const cd = response.headers?.get?.("content-disposition") || "";
  const match = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(cd);
  if (match?.[1]) {
    try {
      return decodeURIComponent(match[1].replace(/"/g, "").trim());
    } catch (_) {
      return match[1].replace(/"/g, "").trim();
    }
  }
  const segments = String(path).split("/").filter(Boolean);
  const base =
    segments[segments.length - 2] || segments[segments.length - 1] || "export";
  return `${base}.xlsx`;
};

/**
 * Internal ticket-domain API helpers. Exposed so hooks/admin/mutations.js
 * can call the same shapes without re-importing the deleted service.
 */
export const ticketsApi = {
  getTickets: async (filters = {}) => {
    const queryString = new URLSearchParams(filters).toString();
    const path = `${ENDPOINTS.TICKETS.BASE}${queryString ? `?${queryString}` : ""}`;
    return _request(path, { method: "GET" }, "Failed to get tickets");
  },
  getTicket: async (ticketId) =>
    _request(
      ENDPOINTS.TICKETS.BY_ID(ticketId),
      { method: "GET" },
      "Failed to get ticket",
    ),
  getTicketForRating: async (ticketId) =>
    _request(
      ENDPOINTS.TICKETS.RATING_INFO(ticketId),
      { method: "GET" },
      "Failed to load rating info",
    ),
  createTicket: async (data) =>
    _request(
      ENDPOINTS.TICKETS.BASE,
      { method: "POST", body: data },
      "Failed to create ticket",
    ),
  updateTicket: async (ticketId, data) =>
    _request(
      ENDPOINTS.TICKETS.BY_ID(ticketId),
      { method: "PATCH", body: data },
      "Failed to update ticket",
    ),
  deleteTicket: async (ticketId) =>
    _request(
      ENDPOINTS.TICKETS.BY_ID(ticketId),
      { method: "DELETE" },
      "Failed to delete ticket",
    ),
  rateTicket: async (ticketId, { rating, feedback } = {}) =>
    _request(
      ENDPOINTS.TICKETS.RATE(ticketId),
      { method: "PATCH", body: { rating, feedback } },
      "Failed to rate ticket",
    ),
  assignTicket: async (ticketId, assigneeId) =>
    _request(
      ENDPOINTS.TICKETS.ASSIGN(ticketId),
      { method: "PATCH", body: { assigneeId } },
      "Failed to assign ticket",
    ),
  updateTicketStatus: async (ticketId, { status, resolution } = {}) =>
    _request(
      ENDPOINTS.TICKETS.STATUS(ticketId),
      {
        method: "PATCH",
        body: { status, ...(resolution !== undefined && { resolution }) },
      },
      "Failed to update ticket status",
    ),
  exportTickets: async (filters = {}) => {
    const clean = Object.fromEntries(
      Object.entries(filters).filter(
        ([, v]) => v !== undefined && v !== null && v !== "",
      ),
    );
    const qs = new URLSearchParams(clean).toString();
    const fullPath = `${ENDPOINTS.TICKETS.EXPORT}${qs ? `?${qs}` : ""}`;
    const response = await apiFetch(fullPath, { method: "GET" });
    if (!response.ok) {
      let message = `HTTP ${response.status}`;
      try {
        const body = await response.json();
        if (body?.message) message = body.message;
      } catch (_) {}
      throw new Error(message);
    }
    const blob = await response.blob();
    const filename = _filenameFromResponse(response, ENDPOINTS.TICKETS.EXPORT);
    return saveBlobAndShare(blob, filename);
  },
};

export function useTickets(filters = {}) {
  const token = useAuthStore((state) => state.token);
  return useQuery({
    queryKey: ticketsKeys.list(filters),
    queryFn: () => ticketsApi.getTickets(filters),
    enabled: !!token,
    staleTime: 3 * 60 * 1000,
  });
}

export function useTicket(ticketId) {
  const token = useAuthStore((state) => state.token);
  return useQuery({
    queryKey: ticketsKeys.detail(ticketId),
    queryFn: () => ticketsApi.getTicket(ticketId),
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
      _request(
        `${ENDPOINTS.TICKETS.BASE}/assignees`,
        { method: "GET" },
        "Failed to get assignees",
      ),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });
}
