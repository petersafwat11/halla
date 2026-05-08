import { ENDPOINTS } from "../config/api";
import { authenticatedFetch } from "./eventsService.http";

// ==================== GUEST LIST APIs ====================

/**
 * Bulk update of an event's guestList sub-document.
 *
 * Distinct from the per-guest CRUD endpoints (which now live in
 * `services/guestsService.js` and call `/guests/events/:eventId/...`).
 * This endpoint replaces the entire `guestList` array on the event in
 * one shot and is used by the create/update wizard.
 *
 * @param {string} eventId
 * @param {Array}  guestList
 * @param {string} _legacyToken - ignored; apiFetch reads from auth store
 * @param {Array} [staffList]   - optional bulk staff update in same call
 * @returns {Promise<Object>}
 */
export const updateGuestList = async (
  eventId,
  guestList,
  _legacyToken,
  staffList = null,
) => {
  const body = { guestList };
  if (staffList) {
    body.staffList = staffList;
  }

  const data = await authenticatedFetch(
    ENDPOINTS.EVENTS.UPDATE_GUEST_LIST(eventId),
    null,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );

  return data?.data?.event;
};
