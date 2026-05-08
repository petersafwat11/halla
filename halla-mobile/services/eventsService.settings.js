import { ENDPOINTS } from "../config/api";
import { apiFetch } from "./apiClient";
import { authenticatedFetch } from "./eventsService.http";

// ==================== INVITATION SETTINGS APIs ====================

/**
 * Update invitation settings
 * Backend expects multipart/form-data (uploadTemplateImage middleware).
 * @param {string} eventId - Event ID
 * @param {Object} invitationSettings - Updated invitation settings
 * @param {string} token - Auth token
 * @returns {Promise<Object>}
 */
export const updateInvitationSettings = async (
  eventId,
  invitationSettings,
  token,
) => {
  // Build FormData (backend expects multipart/form-data for file uploads)
  // Controller passes req.body fields directly (no JSON.parse), so append each field individually
  const formData = new FormData();

  const { templateImage, ...restSettings } = invitationSettings;
  Object.entries(restSettings).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(
        key,
        typeof value === "object" ? JSON.stringify(value) : String(value),
      );
    }
  });

  // Append template image file if present
  if (templateImage && typeof templateImage === "object" && templateImage.uri) {
    formData.append("templateImage", {
      uri: templateImage.uri,
      type: templateImage.type || "image/jpeg",
      name: templateImage.fileName || "template.jpg",
    });
  }

  // Route through apiFetch so the multipart upload also gets the auth
  // header + 60s timeout. apiFetch detects FormData and skips JSON
  // serialization (Content-Type set by fetch boundary).
  const response = await apiFetch(ENDPOINTS.EVENTS.UPDATE_INVITATION(eventId), {
    method: "PATCH",
    body: formData,
    timeoutMs: 60 * 1000,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Failed to update invitation settings");
  }

  return data?.data?.event;
};

// ==================== LAUNCH APIs ====================

/**
 * Manually retry a failed event launch. RBAC enforced server-side.
 * @param {string} eventId
 * @param {string} token
 * @returns {Promise<Object>}
 */
export const retryLaunch = async (eventId, token) => {
  // Per-click idempotency key — protects against double-tap on mobile UI
  // when the spinner doesn't quite catch the second press.
  const idempotencyKey = `retry-${eventId}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
  const data = await authenticatedFetch(
    ENDPOINTS.EVENTS.RETRY_LAUNCH(eventId),
    token,
    {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
    },
  );
  return data?.data || data;
};

/**
 * Update launch settings for event
 * @param {string} eventId - Event ID
 * @param {Object} launchSettings - Launch settings data
 * @param {string} token - Auth token
 * @returns {Promise<Object>}
 */
export const updateLaunchSettings = async (
  eventId,
  launchSettings,
  token,
) => {
  if (!eventId) {
    throw new Error("Event ID is required");
  }

  return await authenticatedFetch(
    ENDPOINTS.EVENTS.UPDATE_LAUNCH(eventId),
    token,
    {
      method: "PATCH",
      body: JSON.stringify(launchSettings),
    },
  );
};

// ==================== EVENT DETAILS / TEST MESSAGE APIs ====================

/**
 * Send test message for event
 * @param {string} eventId - Event ID
 * @param {string} phoneNumber
 * @param {string} channel
 * @param {string} token - Auth token
 * @returns {Promise<Object>}
 */
export const sendTestMessage = async (
  eventId,
  phoneNumber,
  channel,
  token,
) => {
  if (!eventId) {
    throw new Error("Event ID is required");
  }

  return await authenticatedFetch(
    ENDPOINTS.EVENTS.TEST_MESSAGE(eventId),
    token,
    {
      method: "PATCH",
      body: JSON.stringify({ phoneNumber, channel }),
    },
  );
};

/**
 * Update event details
 * @param {string} eventId - Event ID
 * @param {Object} eventDetails - Event details data
 * @param {string} token - Auth token
 * @returns {Promise<Object>}
 */
export const updateEventDetails = async (eventId, eventDetails, token) => {
  if (!eventId) {
    throw new Error("Event ID is required");
  }

  return await authenticatedFetch(
    ENDPOINTS.EVENTS.UPDATE_DETAILS(eventId),
    token,
    {
      method: "PATCH",
      body: JSON.stringify(eventDetails),
    },
  );
};
