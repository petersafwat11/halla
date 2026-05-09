import { Linking } from "react-native";
import { API_BASE_URL, ENDPOINTS } from "../config/api";
import { apiFetch } from "./apiClient";
import { useAuthStore } from "../stores/authStore";

const _request = async (path, init, errorMessage) => {
  const response = await apiFetch(path, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || errorMessage);
  return data;
};

const _openExportUrl = async (path, filters = {}) => {
  const token = useAuthStore.getState().token;
  const clean = Object.fromEntries(
    Object.entries({ token, ...filters }).filter(
      ([, v]) => v !== undefined && v !== null && v !== "",
    ),
  );
  const params = new URLSearchParams(clean);
  const url = `${API_BASE_URL}${path}?${params.toString()}`;
  await Linking.openURL(url);
  return { success: true };
};

export const getTicketsAPI = async (filters = {}) => {
  const queryString = new URLSearchParams(filters).toString();
  const path = `${ENDPOINTS.TICKETS.BASE}${queryString ? `?${queryString}` : ""}`;
  return _request(path, { method: "GET" }, "Failed to get tickets");
};

export const getTicketAPI = async (ticketId) =>
  _request(
    ENDPOINTS.TICKETS.BY_ID(ticketId),
    { method: "GET" },
    "Failed to get ticket",
  );

export const getTicketForRatingAPI = async (ticketId) =>
  _request(
    ENDPOINTS.TICKETS.RATING_INFO(ticketId),
    { method: "GET" },
    "Failed to load rating info",
  );

export const createTicketAPI = async (data) =>
  _request(
    ENDPOINTS.TICKETS.BASE,
    { method: "POST", body: data },
    "Failed to create ticket",
  );

export const updateTicketAPI = async (ticketId, data) =>
  _request(
    ENDPOINTS.TICKETS.BY_ID(ticketId),
    { method: "PATCH", body: data },
    "Failed to update ticket",
  );

export const deleteTicketAPI = async (ticketId) =>
  _request(
    ENDPOINTS.TICKETS.BY_ID(ticketId),
    { method: "DELETE" },
    "Failed to delete ticket",
  );

export const rateTicketAPI = async (ticketId, { rating, feedback } = {}) =>
  _request(
    ENDPOINTS.TICKETS.RATE(ticketId),
    { method: "PATCH", body: { rating, feedback } },
    "Failed to rate ticket",
  );

export const assignTicketAPI = async (ticketId, assigneeId) =>
  _request(
    ENDPOINTS.TICKETS.ASSIGN(ticketId),
    { method: "PATCH", body: { assigneeId } },
    "Failed to assign ticket",
  );

export const updateTicketStatusAPI = async (ticketId, { status, resolution } = {}) =>
  _request(
    ENDPOINTS.TICKETS.STATUS(ticketId),
    {
      method: "PATCH",
      body: { status, ...(resolution !== undefined && { resolution }) },
    },
    "Failed to update ticket status",
  );

export const exportTicketsAPI = async (filters = {}) =>
  _openExportUrl(ENDPOINTS.TICKETS.EXPORT, filters);
