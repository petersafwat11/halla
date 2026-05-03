/**
 * Tickets service.
 *
 * Phase 4 W0-AUTH: routed through `apiFetch` so token attach + 401
 * refresh + 30 s timeout are inherited. Token argument is accepted but
 * ignored.
 */

import { ENDPOINTS } from "../config/api";
import { apiFetch } from "./apiClient";

const _request = async (path, init, errorMessage) => {
  const response = await apiFetch(path, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || errorMessage);
  return data;
};

export const getTicketsAPI = async (_legacyToken, filters = {}) => {
  const queryString = new URLSearchParams(filters).toString();
  const path = `${ENDPOINTS.TICKETS.BASE}${queryString ? `?${queryString}` : ""}`;
  return _request(path, { method: "GET" }, "Failed to get tickets");
};

export const getTicketAPI = async (ticketId, _legacyToken) =>
  _request(
    `${ENDPOINTS.TICKETS.BASE}/${ticketId}`,
    { method: "GET" },
    "Failed to get ticket"
  );
