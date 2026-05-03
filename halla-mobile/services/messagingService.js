import { apiFetch } from "./apiClient";

const INVITATIONS_BASE = "/messaging";

/**
 * M-13: routes messaging calls through `apiFetch` so 401-on-expired-token
 * auto-refreshes. Token arg ignored — apiFetch reads in-memory token.
 */
const authenticatedFetch = async (endpoint, _legacyToken, options = {}) => {
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
 * Send invitation to a single guest
 * @param {string} guestId - Guest ID
 * @param {string} eventId - Event ID
 * @param {string} channel - 'sms' or 'whatsapp'
 * @param {string} lang - Language code ('ar' or 'en')
 * @param {string} token - Auth token
 * @returns {Promise<Object>}
 */
export const sendInvitation = async (
  guestId,
  eventId,
  channel = "sms",
  token
) => {
  try {
    console.log("[MESSAGING SERVICE] Sending invitation:", {
      guestId,
      eventId,
      channel,
    });

    const data = await authenticatedFetch("/send", token, {
      method: "POST",
      body: JSON.stringify({
        guestId,
        eventId,
        channel,
      }),
    });

    console.log("[MESSAGING SERVICE] Invitation sent successfully");

    return data;
  } catch (error) {
    console.error("[MESSAGING SERVICE] Error sending invitation:", error.message);
    throw error;
  }
};

/**
 * Send invitations to multiple guests
 * @param {string[]} guestIds - Array of guest IDs
 * @param {string} eventId - Event ID
 * @param {string} channel - 'sms' or 'whatsapp'
 * @param {string} lang - Language code ('ar' or 'en')
 * @param {string} token - Auth token
 * @returns {Promise<Object>}
 */
export const sendBulkInvitations = async (
  guestIds,
  eventId,
  channel = "sms",
  token
) => {
  try {
    console.log("[MESSAGING SERVICE] Sending bulk invitations:", {
      guestCount: guestIds.length,
      eventId,
      channel,
    });

    const data = await authenticatedFetch("/send-bulk", token, {
      method: "POST",
      body: JSON.stringify({
        guestIds,
        eventId,
        channel,
      }),
    });

    console.log("[MESSAGING SERVICE] Bulk invitations sent successfully");

    return data;
  } catch (error) {
    console.error(
      "[MESSAGING SERVICE] Error sending bulk invitations:",
      error.message
    );
    throw error;
  }
};

/**
 * Retry failed invitations for an event
 * @param {string} eventId - Event ID
 * @param {string} channel - 'sms' or 'whatsapp'
 * @param {string} lang - Language code ('ar' or 'en')
 * @param {string} token - Auth token
 * @returns {Promise<Object>}
 */
export const retryFailedInvitations = async (
  eventId,
  channel = "sms",
  token
) => {
  try {
    console.log("[MESSAGING SERVICE] Retrying failed invitations:", {
      eventId,
      channel,
    });

    const data = await authenticatedFetch("/retry", token, {
      method: "POST",
      body: JSON.stringify({
        eventId,
        channel,
      }),
    });

    console.log("[MESSAGING SERVICE] Failed invitations retried successfully");

    return data;
  } catch (error) {
    console.error(
      "[MESSAGING SERVICE] Error retrying invitations:",
      error.message
    );
    throw error;
  }
};

/**
 * Send test invitation (for host preview)
 * @param {string} phoneNumber - Phone number to send test to
 * @param {string} eventId - Event ID
 * @param {string} channel - 'sms' or 'whatsapp'
 * @param {string} lang - Language code ('ar' or 'en')
 * @param {string} token - Auth token
 * @returns {Promise<Object>}
 */
export const sendTestInvitation = async (
  phoneNumber,
  eventId,
  channel = "sms",
  token
) => {
  try {
    console.log("[MESSAGING SERVICE] Sending test invitation:", {
      phoneNumber,
      eventId,
      channel,
    });

    const data = await authenticatedFetch("/test", token, {
      method: "POST",
      body: JSON.stringify({
        phoneNumber,
        eventId,
        channel,
      }),
    });

    console.log("[MESSAGING SERVICE] Test invitation sent successfully");

    return data;
  } catch (error) {
    console.error(
      "[MESSAGING SERVICE] Error sending test invitation:",
      error.message
    );
    throw error;
  }
};

/**
 * Send reminder to pending guests
 * @param {string} eventId - Event ID
 * @param {string} channel - 'sms' or 'whatsapp'
 * @param {string} lang - Language code ('ar' or 'en')
 * @param {string} message - Custom message (optional)
 * @param {string} token - Auth token
 * @returns {Promise<Object>}
 */
export const sendReminder = async (
  eventId,
  channel = "sms",
  customMessage = null,
  token
) => {
  try {
    console.log("[MESSAGING SERVICE] Sending reminder:", {
      eventId,
      channel,
    });

    const body = {
      eventId,
      channel,
    };

    if (customMessage) {
      body.customMessage = customMessage;
    }

    const data = await authenticatedFetch("/send-reminder", token, {
      method: "POST",
      body: JSON.stringify(body),
    });

    console.log("[MESSAGING SERVICE] Reminder sent successfully");

    return data;
  } catch (error) {
    console.error("[MESSAGING SERVICE] Error sending reminder:", error.message);
    throw error;
  }
};

/**
 * Get invitation statistics for an event
 * @param {string} eventId - Event ID
 * @param {string} token - Auth token
 * @returns {Promise<Object>}
 */
export const getInvitationStats = async (eventId, token) => {
  try {
    console.log("[MESSAGING SERVICE] Fetching invitation stats:", eventId);

    const data = await authenticatedFetch(`/stats/${eventId}`, token);

    console.log("[MESSAGING SERVICE] Invitation stats received");

    return data;
  } catch (error) {
    console.error(
      "[MESSAGING SERVICE] Error fetching invitation stats:",
      error.message
    );
    throw error;
  }
};

/**
 * Check SMS/WhatsApp balance
 * @param {string} token - Auth token
 * @returns {Promise<Object>}
 */
export const checkBalance = async (token) => {
  try {
    console.log("[MESSAGING SERVICE] Checking balance...");

    const data = await authenticatedFetch("/balance", token);

    console.log("[MESSAGING SERVICE] Balance received:", data);

    return data;
  } catch (error) {
    console.error("[MESSAGING SERVICE] Error checking balance:", error.message);
    throw error;
  }
};

/**
 * Get approved WhatsApp templates from Taqnyat
 * @param {string} token - Auth token
 * @returns {Promise<Object>}
 */
export const getApprovedTemplates = async (token) => {
  try {
    const data = await authenticatedFetch("/templates/approved", token);
    return data;
  } catch (error) {
    console.error("[MESSAGING SERVICE] Error fetching approved templates:", error.message);
    throw error;
  }
};

// Export all functions as default object for alternative import style
export default {
  sendInvitation,
  sendBulkInvitations,
  retryFailedInvitations,
  sendTestInvitation,
  sendReminder,
  getInvitationStats,
  checkBalance,
  getApprovedTemplates,
};
