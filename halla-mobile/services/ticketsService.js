import { ENDPOINTS } from "../config/api";
import { apiFetch } from "./http";
import { saveBlobAndShare } from "../utils/download";

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
  const base = segments[segments.length - 2] || segments[segments.length - 1] || "export";
  return `${base}.xlsx`;
};

/**
 * Fetches an XLSX export with the auth-attached `apiFetch`, then hands
 * the blob to the native share sheet. Replaces the old
 * `Linking.openURL` flow which can't carry the access token in a
 * header and so always tripped the backend 401.
 */
const _openExportUrl = async (path, filters = {}) => {
  const clean = Object.fromEntries(
    Object.entries(filters).filter(
      ([, v]) => v !== undefined && v !== null && v !== "",
    ),
  );
  const qs = new URLSearchParams(clean).toString();
  const fullPath = `${path}${qs ? `?${qs}` : ""}`;
  const response = await apiFetch(fullPath, { method: "GET" });
  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      if (body?.message) message = body.message;
    } catch (_) {
      // non-JSON body
    }
    throw new Error(message);
  }
  const blob = await response.blob();
  const filename = _filenameFromResponse(response, path);
  return saveBlobAndShare(blob, filename);
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
