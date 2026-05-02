import { API_BASE_URL, ENDPOINTS } from "../config/api";

/**
 * Get all tickets for the authenticated user
 * @param {string} token - Auth token
 * @param {Object} filters - Optional filter parameters
 * @returns {Promise<{status: string, data: Array}>}
 */
export const getTicketsAPI = async (token, filters = {}) => {
  const queryString = new URLSearchParams(filters).toString();
  const url = `${API_BASE_URL}${ENDPOINTS.TICKETS.BASE}${queryString ? `?${queryString}` : ''}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to get tickets");
  }

  return data;
};

/**
 * Get a single ticket by ID
 * @param {string} ticketId - Ticket ID
 * @param {string} token - Auth token
 * @returns {Promise<{status: string, data: Object}>}
 */
export const getTicketAPI = async (ticketId, token) => {
  const response = await fetch(`${API_BASE_URL}${ENDPOINTS.TICKETS.BASE}/${ticketId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to get ticket");
  }

  return data;
};
