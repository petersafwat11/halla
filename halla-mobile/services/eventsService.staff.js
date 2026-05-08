import { ENDPOINTS } from "../config/api";
import { authenticatedFetch } from "./eventsService.http";

// ==================== STAFF LIST APIs ====================

/**
 * Replace the entire staff list for an event
 * @param {string} eventId - Event ID
 * @param {Array} staffList - Array of {name, phone}
 * @param {string} token - Auth token
 * @returns {Promise<Object>}
 */
export const updateStaffList = async (eventId, staffList, token) => {
  const data = await authenticatedFetch(
    ENDPOINTS.EVENTS.UPDATE_STAFF_LIST(eventId),
    token,
    {
      method: "PATCH",
      body: JSON.stringify({ staffList }),
    },
  );
  return data?.data?.event;
};

// ==================== STAFF MANAGEMENT APIs ====================

/**
 * Add a staff member to an event
 * @param {string} eventId - Event ID
 * @param {Object} staffData - Staff data
 * @param {string} token - Auth token
 * @returns {Promise<Object>}
 */
export const addStaff = async (eventId, staffData, token) => {
  const data = await authenticatedFetch(
    ENDPOINTS.EVENTS.ADD_STAFF(eventId),
    token,
    {
      method: "POST",
      body: JSON.stringify(staffData),
    },
  );
  return data?.data?.staff;
};

/**
 * Update staff information
 * @param {string} eventId - Event ID
 * @param {string} staffId - Staff ID
 * @param {Object} staffData - Updated staff data
 * @returns {Promise<Object>}
 */
export const updateStaff = async (eventId, staffId, staffData, token) => {
  const data = await authenticatedFetch(
    ENDPOINTS.EVENTS.UPDATE_STAFF(eventId, staffId),
    token,
    {
      method: "PUT",
      body: JSON.stringify(staffData),
    },
  );
  return data?.data?.staff;
};

/**
 * Delete a staff member from an event
 * @param {string} eventId - Event ID
 * @param {string} staffId - Staff ID
 * @param {string} token - Auth token
 * @returns {Promise<void>}
 */
export const deleteStaff = async (eventId, staffId, token) => {
  await authenticatedFetch(
    ENDPOINTS.EVENTS.DELETE_STAFF(eventId, staffId),
    token,
    {
      method: "DELETE",
    },
  );
};

// ==================== STAFF ACCESS TOKEN APIs ====================

/**
 * List active + revoked staff access tokens for an event.
 * Backend: GET /events/:eventId/staff-tokens. Returns rows with
 * `_id, phone, staffName, isRevoked, isExpired, lastUsedAt, useCount,
 * expiresAt, revokedAt, revokedBy, createdAt` so the SingleEventStats
 * staff tab can surface token lifecycle (active vs revoked) rather
 * than only walking `event.staffList`.
 *
 * @param {string} eventId
 * @returns {Promise<{tokens: Array}>}
 */
export const listStaffTokens = async (eventId) => {
  if (!eventId) throw new Error("eventId is required");
  const data = await authenticatedFetch(
    ENDPOINTS.EVENTS.LIST_STAFF_TOKENS(eventId),
  );
  return data?.data || {};
};

/**
 * Revoke a staff member's access token.
 *
 * Backend: POST /events/:eventId/staff/:staffId/revoke. `staffId` is the
 * staff sub-document _id from `event.staffList[i]._id`, NOT the
 * StaffAccessToken doc id — the backend resolves the token from the
 * staff phone. Idempotent: re-revoking returns 200 with
 * `wasAlreadyRevoked: true`.
 *
 * @param {string} eventId
 * @param {string} staffId - staff sub-document _id
 * @param {string} [token] - legacy; ignored (apiFetch reads from store)
 */
export const revokeStaffAccess = async (eventId, staffId, token) => {
  if (!eventId || !staffId)
    throw new Error("eventId and staffId are required");
  // Per-click idempotency key — same shape as retryLaunch.
  const idempotencyKey = `staff-revoke-${eventId}-${staffId}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
  const data = await authenticatedFetch(
    ENDPOINTS.EVENTS.REVOKE_STAFF(eventId, staffId),
    token,
    { method: "POST", headers: { "Idempotency-Key": idempotencyKey } },
  );
  return data?.data || data;
};
