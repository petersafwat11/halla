import { apiFetch } from "./apiClient";
import { ENDPOINTS } from "../config/api";

const INVITATIONS_BASE = "/messaging";

/**
 * Routes messaging calls through `apiFetch` so 401-on-expired-token
 * auto-refreshes.
 */
const authenticatedFetch = async (endpoint, options = {}) => {
  const path = `${INVITATIONS_BASE}${endpoint}`;
  const fetchOpts = {
    method: options.method || "GET",
    headers: options.headers || {},
  };
  if (options.body !== undefined && options.body !== null) {
    if (typeof options.body === "string") {
      try {
        fetchOpts.body = JSON.parse(options.body);
      } catch (_) {
        fetchOpts.body = options.body;
      }
    } else {
      fetchOpts.body = options.body;
    }
  }
  const response = await apiFetch(path, fetchOpts);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "API request failed");
  }
  return data;
};

// ==================== INVITATION APIs ====================

/**
 * Send invitation to a single guest.
 * @param {string} guestId
 * @param {string} eventId
 * @param {string} channel - 'sms' or 'whatsapp'
 */
export const sendInvitation = async (guestId, eventId, channel = "sms") => {
  return authenticatedFetch("/send", {
    method: "POST",
    body: JSON.stringify({ guestId, eventId, channel }),
  });
};

/**
 * Send invitations to multiple guests.
 * @param {string[]} guestIds
 * @param {string} eventId
 * @param {string} channel - 'sms' or 'whatsapp'
 */
export const sendBulkInvitations = async (guestIds, eventId, channel = "sms") => {
  return authenticatedFetch("/send-bulk", {
    method: "POST",
    body: JSON.stringify({ guestIds, eventId, channel }),
  });
};

/**
 * Retry failed invitations for an event.
 * @param {string} eventId
 * @param {string} channel - 'sms' or 'whatsapp'
 */
export const retryFailedInvitations = async (eventId, channel = "sms") => {
  return authenticatedFetch("/retry", {
    method: "POST",
    body: JSON.stringify({ eventId, channel }),
  });
};

/**
 * Send a test invitation (host preview) via the canonical events route.
 * PATCH /events/:eventId/test-message — body: { phoneNumber, channel }.
 */
export const sendTestInvitation = async (phoneNumber, eventId, channel = "sms") => {
  const response = await apiFetch(ENDPOINTS.EVENTS.TEST_MESSAGE(eventId), {
    method: "PATCH",
    body: { phoneNumber, channel },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "API request failed");
  }
  return data;
};

/**
 * Send reminder to pending guests.
 * @param {string} eventId
 * @param {string} channel - 'sms' or 'whatsapp'
 * @param {string|null} customMessage
 */
export const sendReminder = async (eventId, channel = "sms", customMessage = null) => {
  const body = { eventId, channel };
  if (customMessage) body.customMessage = customMessage;
  return authenticatedFetch("/send-reminder", {
    method: "POST",
    body: JSON.stringify(body),
  });
};

export default {
  sendInvitation,
  sendBulkInvitations,
  retryFailedInvitations,
  sendTestInvitation,
  sendReminder,
};
