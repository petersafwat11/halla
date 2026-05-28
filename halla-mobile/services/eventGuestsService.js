/**
 * Per-guest CRUD service (renamed from `guestsService.js`). Backend mount is
 * `/guests/events/:eventId/...` — logically event-scoped, but kept separate
 * from `eventsService.js` because the route shape is on the guests module.
 *
 * Every call routes through `apiFetch` so the in-memory access token is
 * attached, 401 triggers a refresh + replay, and the 30 s default timeout is
 * inherited. Paths are sourced from `ENDPOINTS.GUESTS.*` so this file owns
 * no hardcoded URL strings.
 */

import { ENDPOINTS } from "../config/api";
import { apiFetch } from "./apiClient";

const GUESTS_BASE = "/guests";

/**
 * Resolve a path against the `/guests` mount. Accepts either a full
 * `ENDPOINTS.GUESTS.*` path (already prefixed) or a relative segment.
 */
const _resolvePath = (path) => {
  if (!path) return GUESTS_BASE;
  if (path.startsWith(GUESTS_BASE)) return path;
  return `${GUESTS_BASE}${path.startsWith("/") ? path : `/${path}`}`;
};

const guestFetch = async (path, init, errorMessage) => {
  const response = await apiFetch(_resolvePath(path), init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || errorMessage);
  return data;
};

const _idempotencyKey = (label, eventId, guestId) =>
  `${label}-${eventId}-${guestId}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;

/**
 * GET /guests/events/:eventId — list guests for an event.
 */
export const getEventGuests = async (eventId) => {
  if (!eventId) throw new Error("eventId is required");
  return guestFetch(
    ENDPOINTS.GUESTS.EVENT_GUESTS(eventId),
    { method: "GET" },
    "Failed to load guests"
  );
};

/**
 * POST /guests/events/:eventId — add a new guest.
 */
export const addGuest = async (eventId, guestData) => {
  if (!eventId) throw new Error("eventId is required");
  const data = await guestFetch(
    ENDPOINTS.GUESTS.EVENT_GUESTS(eventId),
    { method: "POST", body: guestData },
    "Failed to add guest"
  );
  return data?.data?.guest ?? data?.data ?? data;
};

/**
 * PATCH /guests/events/:eventId/guests/:guestId — update name/email/
 * phone/status. Collapsed signature replaces the prior `updateGuest` /
 * `updateGuestStatus` split.
 */
export const updateGuest = async (eventId, guestId, payload) => {
  if (!eventId || !guestId)
    throw new Error("eventId and guestId are required");
  const data = await guestFetch(
    `${ENDPOINTS.GUESTS.EVENT_GUESTS(eventId)}/guests/${guestId}`,
    { method: "PATCH", body: payload || {} },
    "Failed to update guest"
  );
  return data?.data?.guest ?? data?.data ?? data;
};

/**
 * DELETE /guests/events/:eventId/guests/:guestId — remove a guest.
 */
export const deleteGuest = async (eventId, guestId) => {
  if (!eventId || !guestId)
    throw new Error("eventId and guestId are required");
  await guestFetch(
    `${ENDPOINTS.GUESTS.EVENT_GUESTS(eventId)}/guests/${guestId}`,
    { method: "DELETE" },
    "Failed to delete guest"
  );
};

/**
 * POST /guests/events/:eventId/guests/:guestId/rotate-qr — rotate the
 * guest QR. Old scans return 410 with `reason: 'qr_rotated'`.
 */
export const rotateGuestQr = async (eventId, guestId) => {
  if (!eventId || !guestId)
    throw new Error("eventId and guestId are required");
  const data = await guestFetch(
    ENDPOINTS.GUESTS.ROTATE_QR(eventId, guestId),
    {
      method: "POST",
      headers: {
        "Idempotency-Key": _idempotencyKey("qr-rotate", eventId, guestId),
      },
    },
    "Failed to rotate QR"
  );
  return data?.data ?? data;
};

/**
 * POST /guests/events/:eventId/guests/:guestId/revoke-access — revoke
 * post-event content access without minting a new QR.
 */
export const revokeGuestAccess = async (eventId, guestId) => {
  if (!eventId || !guestId)
    throw new Error("eventId and guestId are required");
  const data = await guestFetch(
    ENDPOINTS.GUESTS.REVOKE_ACCESS(eventId, guestId),
    {
      method: "POST",
      headers: {
        "Idempotency-Key": _idempotencyKey("gat-revoke", eventId, guestId),
      },
    },
    "Failed to revoke guest access"
  );
  return data?.data ?? data;
};

/**
 * GET /guests/events/:eventId/export — XLSX download. Returns a blob so
 * the caller can hand it to `saveBlobAndShare`.
 */
export const exportEventGuests = async (eventId) => {
  if (!eventId) throw new Error("eventId is required");
  const response = await apiFetch(ENDPOINTS.GUESTS.EXPORT(eventId), {
    method: "GET",
    timeoutMs: 60 * 1000,
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to export guests");
  }
  const blob = await response.blob();
  return {
    success: true,
    blob,
    filename: `event-${eventId}-guests.xlsx`,
  };
};

export default {
  getEventGuests,
  addGuest,
  updateGuest,
  deleteGuest,
  rotateGuestQr,
  revokeGuestAccess,
  exportEventGuests,
};
