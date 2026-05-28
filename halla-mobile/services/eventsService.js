/**
 * Consolidated events service.
 *
 * Replaces the prior `eventsService.{crud,http,guests,settings,staff,exports}.js`
 * shards + `eventsService2.js` façade with a single file. The default export
 * exposes the events surface as five sub-objects (`crud`, `guests`, `staff`,
 * `settings`, `exports`); every function is also re-exported by name so the
 * existing `import { foo } from "../services/eventsService"` call sites
 * continue to resolve.
 *
 * Per-guest CRUD lives in `services/eventGuestsService.js` because its
 * canonical mount is `/guests/events/:eventId/...` (logically event-scoped
 * but on the guests module). Only the bulk `updateGuestList` (events module)
 * is exposed here.
 *
 * Every call routes through `apiFetch`, which auto-refreshes the access
 * token on 401 and retries. The legacy `_token` arg every function carries
 * is ignored — apiFetch sources the in-memory token from the auth store.
 * Preserved to minimise the diff at call sites.
 */

import { ENDPOINTS } from "../config/api";
import { apiFetch } from "./apiClient";

const authenticatedFetch = async (path, _legacyToken, options = {}) => {
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

// ===========================================================================
// CRUD + stats
// ===========================================================================

export const getUserEventsWithStats = async (_token) => {
  const data = await authenticatedFetch(ENDPOINTS.EVENTS.STATS, _token);
  const stats = data?.data || {};
  return {
    totalEvents: stats.totalEvents || 0,
    activeEvents: stats.activeEvents || 0,
    completedEvents: stats.completedEvents || 0,
    totalGuests: stats.totalGuests || 0,
    confirmedGuests: stats.confirmedGuests || 0,
  };
};

export const getEventStats = async (_token) => {
  const [statsData, eventsData] = await Promise.all([
    authenticatedFetch(ENDPOINTS.EVENTS.STATS, _token),
    authenticatedFetch(`${ENDPOINTS.EVENTS.MY_EVENTS}?limit=50`, _token),
  ]);

  const stats = statsData?.data || {};
  const events = Array.isArray(eventsData?.data) ? eventsData.data : [];
  const totalGuests = stats.totalGuests || 0;
  const confirmedGuests = stats.confirmedGuests || 0;
  const respondedGuests = confirmedGuests + (stats.checkedInGuests || 0);

  return {
    allGuests: totalGuests,
    attendanceRate:
      totalGuests > 0 ? Math.round((confirmedGuests / totalGuests) * 100) : 0,
    responseRate:
      totalGuests > 0 ? Math.round((respondedGuests / totalGuests) * 100) : 0,
    events,
  };
};

/**
 * Backend `getEventById` returns `{ status, data: {...event} }` — the event
 * object IS `data`, not `data.event`.
 */
export const getEventById = async (eventId, _token) => {
  const data = await authenticatedFetch(
    ENDPOINTS.EVENTS.BY_ID(eventId),
    _token,
  );
  return data?.data || {};
};

export const getSingleEventStats = async (eventId, _token) => {
  const [statsRes, eventRes] = await Promise.all([
    authenticatedFetch(ENDPOINTS.EVENTS.SINGLE_STATS(eventId), _token),
    authenticatedFetch(ENDPOINTS.EVENTS.BY_ID(eventId), _token),
  ]);

  const stats = statsRes?.data || {};
  const eventData = eventRes?.data || {};
  const guestList = Array.isArray(eventData.guestList) ? eventData.guestList : [];
  const staffList = Array.isArray(eventData.staffList) ? eventData.staffList : [];

  const guests = guestList.map((guest) => ({
    guestId: guest._id || guest.id,
    name: guest.name || "ضيف",
    phone: guest.phone || "",
    status: guest.status || "invited",
    respondedAt: guest.rsvp?.respondedAt || guest.respondedAt || null,
    addedBy: guest.addedBy || "",
  }));

  return {
    event: eventData,
    guests,
    staff: staffList,
    confirmed: stats.confirmed || 0,
    declined: stats.declined || 0,
    pending: stats.pending || 0,
    maybe: stats.maybe || 0,
    checkedIn: stats.checkedIn || 0,
    totalGuests: stats.totalGuests || 0,
  };
};

/**
 * Atomic guest+staff update. Hits `PATCH /events/:id/step2` so a capacity-
 * guard rejection on either side leaves both fields at their pre-call values.
 * Backend normalises both `supervisorsList` (web) and `staffList` (mobile);
 * this client always sends `staffList`.
 */
export const updateEventStep2 = async (eventId, payload, _token) => {
  const data = await authenticatedFetch(
    ENDPOINTS.EVENTS.UPDATE_STEP2(eventId),
    _token,
    {
      method: "PATCH",
      body: JSON.stringify({
        guestList: Array.isArray(payload?.guestList) ? payload.guestList : [],
        staffList: Array.isArray(payload?.staffList) ? payload.staffList : [],
      }),
    },
  );
  return data?.data?.event;
};

export const deleteEvent = async (eventId, _token) => {
  await authenticatedFetch(ENDPOINTS.EVENTS.DELETE(eventId), _token, {
    method: "DELETE",
  });
};

export const bulkDeleteEvents = async (eventIds, _token) => {
  if (!eventIds || !Array.isArray(eventIds) || eventIds.length === 0) {
    throw new Error("Event IDs array is required");
  }
  if (eventIds.length > 100) {
    throw new Error("Cannot delete more than 100 events at once");
  }
  return authenticatedFetch(ENDPOINTS.EVENTS.BULK_DELETE, _token, {
    method: "POST",
    body: JSON.stringify({ eventIds }),
  });
};

export const getSubscriptionInfo = async (_token) =>
  authenticatedFetch(ENDPOINTS.EVENTS.SUBSCRIPTION_INFO, _token);

// ===========================================================================
// Guest list (bulk; per-guest CRUD lives in eventGuestsService.js)
// ===========================================================================

/**
 * Bulk update of an event's guestList sub-document. Replaces the entire
 * array in one shot; used by the create/update wizard.
 */
export const updateGuestList = async (
  eventId,
  guestList,
  _token,
  staffList = null,
) => {
  const body = { guestList };
  if (staffList) body.staffList = staffList;

  const data = await authenticatedFetch(
    ENDPOINTS.EVENTS.UPDATE_GUEST_LIST(eventId),
    _token,
    { method: "PATCH", body: JSON.stringify(body) },
  );
  return data?.data?.event;
};

// ===========================================================================
// Staff
// ===========================================================================

export const updateStaffList = async (eventId, staffList, _token) => {
  const data = await authenticatedFetch(
    ENDPOINTS.EVENTS.UPDATE_STAFF_LIST(eventId),
    _token,
    { method: "PATCH", body: JSON.stringify({ staffList }) },
  );
  return data?.data?.event;
};

export const addStaff = async (eventId, staffData, _token) => {
  const data = await authenticatedFetch(
    ENDPOINTS.EVENTS.ADD_STAFF(eventId),
    _token,
    { method: "POST", body: JSON.stringify(staffData) },
  );
  return data?.data?.staff;
};

export const updateStaff = async (eventId, staffId, staffData, _token) => {
  const data = await authenticatedFetch(
    ENDPOINTS.EVENTS.UPDATE_STAFF(eventId, staffId),
    _token,
    { method: "PUT", body: JSON.stringify(staffData) },
  );
  return data?.data?.staff;
};

export const deleteStaff = async (eventId, staffId, _token) => {
  await authenticatedFetch(
    ENDPOINTS.EVENTS.DELETE_STAFF(eventId, staffId),
    _token,
    { method: "DELETE" },
  );
};

/**
 * GET /events/:eventId/staff-tokens — active+revoked staff access tokens.
 */
export const listStaffTokens = async (eventId) => {
  if (!eventId) throw new Error("eventId is required");
  const data = await authenticatedFetch(
    ENDPOINTS.EVENTS.LIST_STAFF_TOKENS(eventId),
  );
  return data?.data || {};
};

/**
 * Idempotent. `staffId` is the event.staffList sub-document _id, not the
 * StaffAccessToken doc id — backend resolves the token from staff phone.
 */
export const revokeStaffAccess = async (eventId, staffId, _token) => {
  if (!eventId || !staffId)
    throw new Error("eventId and staffId are required");
  const idempotencyKey = `staff-revoke-${eventId}-${staffId}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
  const data = await authenticatedFetch(
    ENDPOINTS.EVENTS.REVOKE_STAFF(eventId, staffId),
    _token,
    { method: "POST", headers: { "Idempotency-Key": idempotencyKey } },
  );
  return data?.data || data;
};

// ===========================================================================
// Settings / launch / messaging-on-event-doc
// ===========================================================================

/**
 * Update invitation settings. Backend expects multipart/form-data
 * (uploadTemplateImage middleware); apiFetch detects FormData and skips JSON
 * serialization (Content-Type set by fetch boundary).
 */
export const updateInvitationSettings = async (
  eventId,
  invitationSettings,
  _token,
) => {
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

  if (templateImage && typeof templateImage === "object" && templateImage.uri) {
    formData.append("templateImage", {
      uri: templateImage.uri,
      type: templateImage.type || "image/jpeg",
      name: templateImage.fileName || "template.jpg",
    });
  }

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

/**
 * Manually retry a failed event launch. RBAC enforced server-side. Per-click
 * idempotency key protects against double-tap.
 */
export const retryLaunch = async (eventId, _token) => {
  const idempotencyKey = `retry-${eventId}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
  const data = await authenticatedFetch(
    ENDPOINTS.EVENTS.RETRY_LAUNCH(eventId),
    _token,
    { method: "POST", headers: { "Idempotency-Key": idempotencyKey } },
  );
  return data?.data || data;
};

export const updateLaunchSettings = async (eventId, launchSettings, _token) => {
  if (!eventId) throw new Error("Event ID is required");
  return authenticatedFetch(ENDPOINTS.EVENTS.UPDATE_LAUNCH(eventId), _token, {
    method: "PATCH",
    body: JSON.stringify(launchSettings),
  });
};

export const sendTestMessage = async (eventId, phoneNumber, channel, _token) => {
  if (!eventId) throw new Error("Event ID is required");
  return authenticatedFetch(ENDPOINTS.EVENTS.TEST_MESSAGE(eventId), _token, {
    method: "PATCH",
    body: JSON.stringify({ phoneNumber, channel }),
  });
};

export const updateEventDetails = async (eventId, eventDetails, _token) => {
  if (!eventId) throw new Error("Event ID is required");
  return authenticatedFetch(ENDPOINTS.EVENTS.UPDATE_DETAILS(eventId), _token, {
    method: "PATCH",
    body: JSON.stringify(eventDetails),
  });
};

// ===========================================================================
// Exports
// ===========================================================================

/**
 * Export events to XLSX. Returns a blob the caller hands to
 * `saveBlobAndShare`.
 */
export const exportEvents = async (_legacyToken) => {
  const response = await apiFetch(ENDPOINTS.EVENTS.EXPORT_EVENTS, {
    method: "GET",
    timeoutMs: 60 * 1000,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to export events");
  }

  const blob = await response.blob();
  return { success: true, blob, filename: "events-export.xlsx" };
};

// ===========================================================================
// Display / formatting utilities (pure)
// ===========================================================================

export const formatEventForDisplay = (event) => {
  if (!event) return null;
  return {
    id: event._id,
    title: event.eventDetails?.title || "Untitled Event",
    type: event.eventDetails?.type || "other",
    date: event.eventDetails?.date || null,
    time: event.eventDetails?.time || null,
    location: event.eventDetails?.location || null,
    description: event.eventDetails?.description || "",
    guestCount: event.guestList?.length || 0,
    status: event.status || "draft",
    createdAt: event.createdAt,
  };
};

export const formatGuestForDisplay = (guest) => {
  if (!guest) return null;
  return {
    id: guest._id || guest.guestId,
    name: guest.name || "",
    phone: guest.phone || "",
    status: guest.status || "invited",
    respondedAt: guest.rsvp?.respondedAt || guest.respondedAt || null,
    addedBy: guest.addedBy || "Unknown",
  };
};

export const calculateResponseRate = (guests) => {
  if (!guests || guests.length === 0) return 0;
  const responded = guests.filter(
    (g) => g.status === "confirmed" || g.status === "declined",
  );
  return Math.round((responded.length / guests.length) * 100);
};

export const groupGuestsByStatus = (guests) => {
  if (!guests) return {};
  return {
    confirmed: guests.filter((g) => g.status === "confirmed"),
    declined: guests.filter((g) => g.status === "declined"),
    maybe: guests.filter((g) => g.status === "maybe"),
    noResponse: guests.filter((g) => g.status === "no-response"),
    invited: guests.filter((g) => g.status === "invited"),
    attended: guests.filter((g) => g.status === "attended"),
  };
};

// ===========================================================================
// Default export — namespaced surface mirroring the plan's shape
// ===========================================================================

const crud = {
  getUserEventsWithStats,
  getEventStats,
  getEventById,
  getSingleEventStats,
  updateEventStep2,
  updateEventDetails,
  deleteEvent,
  bulkDeleteEvents,
  getSubscriptionInfo,
  formatEventForDisplay,
  formatGuestForDisplay,
  calculateResponseRate,
  groupGuestsByStatus,
};

const guests = {
  updateGuestList,
};

const staff = {
  updateStaffList,
  addStaff,
  updateStaff,
  deleteStaff,
  listStaffTokens,
  revokeStaffAccess,
};

const settings = {
  updateInvitationSettings,
  retryLaunch,
  updateLaunchSettings,
  sendTestMessage,
};

const exportsApi = {
  exportEvents,
};

const eventsService = {
  ...crud,
  ...guests,
  ...staff,
  ...settings,
  ...exportsApi,
  crud,
  guests,
  staff,
  settings,
  exports: exportsApi,
};

export default eventsService;
