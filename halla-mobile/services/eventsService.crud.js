import { ENDPOINTS } from "../config/api";
import { authenticatedFetch } from "./eventsService.http";

// ==================== HOME SCREEN APIs ====================

/**
 * Get user events with statistics for home screen
 * Returns: endedEvents, liveEvents, allEvents stats, and lastEvent details
 * @param {string} token - Auth token
 * @returns {Promise<Object>}
 */
export const getUserEventsWithStats = async (token) => {
  const data = await authenticatedFetch(ENDPOINTS.EVENTS.STATS, token);
  const stats = data?.data || {};

  return {
    totalEvents: stats.totalEvents || 0,
    activeEvents: stats.activeEvents || 0,
    completedEvents: stats.completedEvents || 0,
    totalGuests: stats.totalGuests || 0,
    confirmedGuests: stats.confirmedGuests || 0,
  };
};

// ==================== EVENTS SCREEN APIs ====================

/**
 * Get all events with detailed statistics for events screen
 * Returns: liveEvents count, endedEvents count, attendanceRate, and events array
 * @param {string} token - Auth token
 * @returns {Promise<Object>}
 */
export const getEventStats = async (token) => {
  const [statsData, eventsData] = await Promise.all([
    authenticatedFetch(ENDPOINTS.EVENTS.STATS, token),
    authenticatedFetch(`${ENDPOINTS.EVENTS.MY_EVENTS}?limit=50`, token),
  ]);

  const stats = statsData?.data || {};
  // Backend `sendPaginated` returns `{ status, data: [...], pagination }`
  const events = Array.isArray(eventsData?.data)
    ? eventsData.data
    : [];

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

// ==================== EVENT DETAILS APIs ====================

/**
 * Get single event by ID for viewing details.
 * Backend `getEventById` returns `{ status, data: {...event} }` — the
 * event object IS `data`, not `data.event`.
 * @param {string} eventId - Event ID
 * @param {string} token - Auth token
 * @returns {Promise<Object>}
 */
export const getEventById = async (eventId, token) => {
  const data = await authenticatedFetch(
    ENDPOINTS.EVENTS.BY_ID(eventId),
    token,
  );
  return data?.data || {};
};

/**
 * Get single event statistics with detailed guest info
 * Returns: Event details, guests array, staff array, and overall status counts
 * @param {string} eventId - Event ID
 * @param {string} token - Auth token
 * @returns {Promise<Object>}
 */
export const getSingleEventStats = async (eventId, token) => {
  // Fetch both stats and full event data in parallel
  const [statsRes, eventRes] = await Promise.all([
    authenticatedFetch(ENDPOINTS.EVENTS.SINGLE_STATS(eventId), token),
    authenticatedFetch(ENDPOINTS.EVENTS.BY_ID(eventId), token),
  ]);

  const stats = statsRes?.data || {};
  // `getEventById` returns the event object as `data` itself.
  const eventData = eventRes?.data || {};

  // Extract guest list from the full event (populated by getEventById)
  const guestList = Array.isArray(eventData.guestList)
    ? eventData.guestList
    : [];
  const staffList = Array.isArray(eventData.staffList)
    ? eventData.staffList
    : [];

  // Map guests with their details. Backend `Guest` schema only emits
  // `phone` and `rsvp.respondedAt` — no `mobile`, no `respondAt`.
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

// ==================== EVENT MANAGEMENT APIs ====================

/**
 * Atomic guest+staff update.
 *
 * Calls `PATCH /events/:id/step2` so the wizard's step 2 save dispatches
 * a single request instead of the legacy
 * `Promise.all([updateGuestList, updateStaffList])`. The backend
 * normalises both `supervisorsList` (web) and `staffList` (mobile) at
 * the controller boundary; this client always sends `staffList`.
 *
 * Backend wraps the result via `sendSuccess` so the canonical response
 * shape is `{ status, data: { event, guests, staff } }`. Callers that
 * need `guests`/`staff` arrays should read them off `data.data`
 * separately — this helper returns the event document only.
 *
 * @param {string} eventId
 * @param {{ guestList: Array, staffList: Array }} payload
 * @param {string} _token - kept for the legacy fetch signature; apiFetch
 *                         resolves the in-memory access token itself.
 * @returns {Promise<Object>}
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

/**
 * Delete an event
 * @param {string} eventId - Event ID
 * @param {string} token - Auth token
 * @returns {Promise<void>}
 */
export const deleteEvent = async (eventId, token) => {
  await authenticatedFetch(ENDPOINTS.EVENTS.DELETE(eventId), token, {
    method: "DELETE",
  });
};

// ==================== BULK OPERATIONS APIs ====================

/**
 * Bulk delete events
 * @param {string[]} eventIds - Array of event IDs to delete
 * @param {string} token - Auth token
 * @returns {Promise<Object>}
 */
export const bulkDeleteEvents = async (eventIds, token) => {
  if (!eventIds || !Array.isArray(eventIds) || eventIds.length === 0) {
    throw new Error("Event IDs array is required");
  }

  if (eventIds.length > 100) {
    throw new Error("Cannot delete more than 100 events at once");
  }

  const data = await authenticatedFetch(ENDPOINTS.EVENTS.BULK_DELETE, token, {
    method: "POST",
    body: JSON.stringify({ eventIds }),
  });

  return data;
};

/**
 * Get subscription info for event creation (enriched with dynamic event counting)
 * @param {string} token - Auth token
 * @returns {Promise<Object>}
 */
export const getSubscriptionInfo = async (token) => {
  return await authenticatedFetch(
    ENDPOINTS.EVENTS.SUBSCRIPTION_INFO,
    token,
  );
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Format event data for display
 * @param {Object} event - Raw event data from backend
 * @returns {Object} Formatted event data
 */
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

/**
 * Format guest data for display.
 * Backend Guest schema only emits `phone` and `rsvp.respondedAt`.
 * @param {Object} guest - Raw guest data from backend
 * @returns {Object} Formatted guest data
 */
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

/**
 * Calculate response rate from guest list
 * @param {Array} guests - Array of guests
 * @returns {number} Response rate percentage
 */
export const calculateResponseRate = (guests) => {
  if (!guests || guests.length === 0) return 0;

  const respondedGuests = guests.filter(
    (g) => g.status === "confirmed" || g.status === "declined",
  );

  return Math.round((respondedGuests.length / guests.length) * 100);
};

/**
 * Group guests by status
 * @param {Array} guests - Array of guests
 * @returns {Object} Guests grouped by status
 */
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
