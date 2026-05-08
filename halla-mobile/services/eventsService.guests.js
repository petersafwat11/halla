import { ENDPOINTS } from "../config/api";
import { apiFetch } from "./apiClient";
import { authenticatedFetch } from "./eventsService.http";

// ==================== GUEST LIST APIs ====================

/**
 * Update guest list
 * @param {string} eventId - Event ID
 * @param {Array} guestList - Updated guest list
 * @param {string} token - Auth token
 * @param {Array} staffList - Updated staff list (optional)
 * @returns {Promise<Object>}
 */
export const updateGuestList = async (
  eventId,
  guestList,
  token,
  staffList = null,
) => {
  const body = { guestList };
  if (staffList) {
    body.staffList = staffList;
  }

  const data = await authenticatedFetch(
    ENDPOINTS.EVENTS.UPDATE_GUEST_LIST(eventId),
    token,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );

  return data?.data?.event;
};

// ==================== GUEST MANAGEMENT APIs ====================

/**
 * Add a new guest to an event
 * @param {string} eventId - Event ID
 * @param {Object} guestData - Guest data
 * @param {string} token - Auth token
 * @returns {Promise<Object>}
 */
export const addGuest = async (eventId, guestData, token) => {
  const data = await authenticatedFetch(
    ENDPOINTS.EVENTS.ADD_GUEST(eventId),
    token,
    {
      method: "POST",
      body: JSON.stringify(guestData),
    },
  );
  return data?.data?.guest;
};

/**
 * Update guest status
 * @param {string} eventId - Event ID
 * @param {string} guestId - Guest ID
 * @param {string} status - New status
 * @param {string} token - Auth token
 * @returns {Promise<Object>}
 */
export const updateGuestStatus = async (eventId, guestId, status, token) => {
  const data = await authenticatedFetch(
    ENDPOINTS.EVENTS.UPDATE_GUEST(eventId, guestId),
    token,
    {
      method: "PUT",
      body: JSON.stringify({ status }),
    },
  );
  return data?.data?.guest;
};

/**
 * Delete a guest from an event
 * @param {string} eventId - Event ID
 * @param {string} guestId - Guest ID
 * @param {string} token - Auth token
 * @returns {Promise<void>}
 */
export const deleteGuest = async (eventId, guestId, token) => {
  await authenticatedFetch(
    ENDPOINTS.EVENTS.DELETE_GUEST(eventId, guestId),
    token,
    {
      method: "DELETE",
    },
  );
};

/**
 * Update single guest
 * @param {string} eventId - Event ID
 * @param {string} guestId - Guest ID
 * @param {Object} guestData - Updated guest data
 * @param {string} token - Auth token
 * @returns {Promise<Object>}
 */
export const updateGuest = async (eventId, guestId, guestData, token) => {
  if (!eventId) {
    throw new Error("Event ID is required");
  }

  if (!guestId) {
    throw new Error("Guest ID is required");
  }

  return await authenticatedFetch(
    ENDPOINTS.EVENTS.UPDATE_GUEST(eventId, guestId),
    token,
    {
      method: "PUT",
      body: JSON.stringify(guestData),
    },
  );
};

// ==================== GUEST ACCESS TOKEN APIs ====================

/**
 * Rotate a guest's QR code.
 *
 * Backend: POST /guests/events/:eventId/guests/:guestId/rotate-qr.
 * Returns the new `qrUrl` and `expiresAt`. Old QR scans return 410 with
 * `reason: 'qr_rotated'`.
 */
export const rotateGuestQr = async (eventId, guestId, _token) => {
  if (!eventId || !guestId)
    throw new Error("eventId and guestId are required");
  const idempotencyKey = `qr-rotate-${eventId}-${guestId}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
  // Note: this endpoint lives under the `/guests/...` mount, NOT under
  // `/events/...` — use the GUESTS subtree path.
  const response = await apiFetch(
    ENDPOINTS.GUESTS.ROTATE_QR(eventId, guestId),
    { method: "POST", headers: { "Idempotency-Key": idempotencyKey } },
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Failed to rotate QR");
  }
  return data?.data || data;
};

/**
 * Manually revoke a guest's post-event access token.
 *
 * Backend: POST /guests/events/:eventId/guests/:guestId/revoke-access.
 * Distinct from QR rotate: this revokes post-event content access
 * (photos, comments) without minting a new token.
 */
export const revokeGuestAccess = async (eventId, guestId, _token) => {
  if (!eventId || !guestId)
    throw new Error("eventId and guestId are required");
  const idempotencyKey = `gat-revoke-${eventId}-${guestId}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
  const response = await apiFetch(
    ENDPOINTS.GUESTS.REVOKE_ACCESS(eventId, guestId),
    { method: "POST", headers: { "Idempotency-Key": idempotencyKey } },
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Failed to revoke guest access");
  }
  return data?.data || data;
};
