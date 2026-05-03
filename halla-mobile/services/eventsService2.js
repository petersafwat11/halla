import { ENDPOINTS } from "../config/api";
import { apiFetch } from "./apiClient";

/**
 * M-13: events calls now flow through `apiFetch`, which auto-refreshes
 * the access token on 401 and retries. Caller-supplied `token` arg is
 * ignored — apiFetch sources the in-memory token from the auth store.
 */
const authenticatedFetch = async (endpoint, _legacyToken, options = {}) => {
  const path = `${ENDPOINTS.EVENTS.BASE}${endpoint}`;
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

// ==================== HOME SCREEN APIs ====================

/**
 * Get user events with statistics for home screen
 * Returns: endedEvents, liveEvents, allEvents stats, and lastEvent details
 * @param {string} token - Auth token
 * @returns {Promise<Object>}
 */
export const getUserEventsWithStats = async (token) => {
  try {
    const data = await authenticatedFetch("/stats", token);
    const stats = data.data || {};

    return {
      totalEvents: stats.totalEvents || 0,
      activeEvents: stats.activeEvents || 0,
      completedEvents: stats.completedEvents || 0,
      totalGuests: stats.totalGuests || 0,
      confirmedGuests: stats.confirmedGuests || 0,
    };
  } catch (error) {
    console.error("[EVENTS SERVICE] Error fetching user events stats:", error.message);
    throw error;
  }
};

// ==================== EVENTS SCREEN APIs ====================

/**
 * Get all events with detailed statistics for events screen
 * Returns: liveEvents count, endedEvents count, attendanceRate, and events array
 * @param {string} token - Auth token
 * @returns {Promise<Object>}
 */
export const getEventStats = async (token) => {
  try {
    const [statsData, eventsData] = await Promise.all([
      authenticatedFetch("/stats", token),
      authenticatedFetch("/my-events?limit=50", token),
    ]);

    const stats = statsData.data || {};
    const events = eventsData.data || [];

    const totalGuests = stats.totalGuests || 0;
    const confirmedGuests = stats.confirmedGuests || 0;
    const respondedGuests = confirmedGuests + (stats.checkedInGuests || 0);

    return {
      allGuests: totalGuests,
      attendanceRate: totalGuests > 0
        ? Math.round((confirmedGuests / totalGuests) * 100)
        : 0,
      responseRate: totalGuests > 0
        ? Math.round((respondedGuests / totalGuests) * 100)
        : 0,
      events: Array.isArray(events) ? events : [],
    };
  } catch (error) {
    console.error("[EVENTS SERVICE] Error fetching event stats:", error.message);
    throw error;
  }
};

// ==================== EVENT DETAILS APIs ====================

/**
 * Get single event by ID for viewing details
 * Returns: Full event object with populated guest list and host
 * @param {string} eventId - Event ID
 * @param {string} token - Auth token
 * @returns {Promise<Object>}
 */
export const getEventById = async (eventId, token) => {
  try {
    const data = await authenticatedFetch(`/${eventId}`, token);
    return data.data;
  } catch (error) {
    console.error("[EVENTS SERVICE] Error fetching event by ID:", error.message);
    throw error;
  }
};

/**
 * Get single event statistics with detailed guest info
 * Returns: Event details, guests array, staff array, and overall status counts
 * @param {string} eventId - Event ID
 * @param {string} token - Auth token
 * @returns {Promise<Object>}
 */
export const getSingleEventStats = async (eventId, token) => {
  try {
    // Fetch both stats and full event data in parallel
    const [statsRes, eventRes] = await Promise.all([
      authenticatedFetch(`/stats/${eventId}`, token),
      authenticatedFetch(`/${eventId}`, token),
    ]);

    const stats = statsRes.data || {};
    const eventData = eventRes.data?.event || eventRes.data || {};

    // Extract guest list from the full event (populated by getEventById)
    const guestList = Array.isArray(eventData.guestList) ? eventData.guestList : [];
    const staffList = Array.isArray(eventData.staffList) ? eventData.staffList : [];

    // Map guests with their details
    const guests = guestList.map((guest) => ({
      guestId: guest._id || guest.id,
      name: guest.name || "ضيف",
      phone: guest.phone || "",
      email: guest.email || "",
      status: guest.status || "invited",
      respondAt: guest.respondAt || guest.respondedAt || null,
      addedBy: guest.addedBy || "",
    }));

    return {
      event: eventData,
      guests,
      staff: staffList,
      confirmed: stats.confirmed || 0,
      declined: stats.declined || 0,
      noResponse: stats.pending || 0,
      maybe: 0,
    };
  } catch (error) {
    console.error("[EVENTS SERVICE] Error fetching single event stats:", error.message);
    throw error;
  }
};

// ==================== EVENT MANAGEMENT APIs ====================

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
  try {
    console.log("[EVENTS SERVICE] Updating guest list:", eventId);

    const body = { guestList };
    if (staffList) {
      body.staffList = staffList;
    }

    const data = await authenticatedFetch(`/${eventId}/guest-list`, token, {
      method: "PATCH",
      body: JSON.stringify(body),
    });

    console.log("[EVENTS SERVICE] Guest list updated");

    return data.data.event;
  } catch (error) {
    console.error("[EVENTS SERVICE] Error updating guest list:", error.message);
    throw error;
  }
};

/**
 * Replace the entire staff list for an event
 * @param {string} eventId - Event ID
 * @param {Array} staffList - Array of {name, phone}
 * @param {string} token - Auth token
 * @returns {Promise<Object>}
 */
export const updateStaffList = async (eventId, staffList, token) => {
  const data = await authenticatedFetch(`/${eventId}/staff-list`, token, {
    method: "PATCH",
    body: JSON.stringify({ staffList }),
  });
  return data.data?.event;
};

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
  try {
    console.log("[EVENTS SERVICE] Updating invitation settings:", eventId);

    // Build FormData (backend expects multipart/form-data for file uploads)
    // Controller passes req.body fields directly (no JSON.parse), so append each field individually
    const formData = new FormData();

    const { templateImage, ...restSettings } = invitationSettings;
    Object.entries(restSettings).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, typeof value === "object" ? JSON.stringify(value) : String(value));
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

    // Phase 4 W0-AUTH: route through apiFetch so the multipart upload
    // also gets the auth header + 60s timeout. apiFetch detects FormData
    // and skips JSON serialization (Content-Type set by fetch boundary).
    const response = await apiFetch(`${ENDPOINTS.EVENTS.BASE}/${eventId}/invitation-settings`, {
      method: "PATCH",
      body: formData,
      timeoutMs: 60 * 1000,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || "Failed to update invitation settings");
    }

    console.log("[EVENTS SERVICE] Invitation settings updated");

    return data.data.event;
  } catch (error) {
    console.error(
      "[EVENTS SERVICE] Error updating invitation settings:",
      error.message,
    );
    throw error;
  }
};

/**
 * Phase 3c.1 — manually retry a failed event launch.
 * RBAC enforced server-side.
 * @param {string} eventId
 * @param {string} token
 * @returns {Promise<Object>}
 */
export const retryLaunch = async (eventId, token) => {
  try {
    // M-19: per-click idempotency key — protects against double-tap on
    // mobile UI when the spinner doesn't quite catch the second press.
    const idempotencyKey = `retry-${eventId}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 10)}`;
    const data = await authenticatedFetch(`/${eventId}/retry-launch`, token, {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
    });
    return data?.data || data;
  } catch (error) {
    console.error("[EVENTS SERVICE] Error retrying launch:", error.message);
    throw error;
  }
};

/**
 * Delete an event
 * @param {string} eventId - Event ID
 * @param {string} token - Auth token
 * @returns {Promise<void>}
 */
export const deleteEvent = async (eventId, token) => {
  try {
    console.log("[EVENTS SERVICE] Deleting event:", eventId);

    await authenticatedFetch(`/${eventId}`, token, {
      method: "DELETE",
    });

    console.log("[EVENTS SERVICE] Event deleted successfully");
  } catch (error) {
    console.error("[EVENTS SERVICE] Error deleting event:", error.message);
    throw error;
  }
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
  try {
    console.log("[EVENTS SERVICE] Adding guest to event:", eventId);

    const data = await authenticatedFetch(`/${eventId}/guests`, token, {
      method: "POST",
      body: JSON.stringify(guestData),
    });

    console.log("[EVENTS SERVICE] Guest added successfully");

    return data.data.guest;
  } catch (error) {
    console.error("[EVENTS SERVICE] Error adding guest:", error.message);
    throw error;
  }
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
  try {
    console.log("[EVENTS SERVICE] Updating guest status:", {
      eventId,
      guestId,
      status,
    });

    const data = await authenticatedFetch(
      `/${eventId}/guests/${guestId}`,
      token,
      {
        method: "PUT",
        body: JSON.stringify({ status }),
      },
    );

    console.log("[EVENTS SERVICE] Guest status updated");

    return data.data.guest;
  } catch (error) {
    console.error(
      "[EVENTS SERVICE] Error updating guest status:",
      error.message,
    );
    throw error;
  }
};

/**
 * Delete a guest from an event
 * @param {string} eventId - Event ID
 * @param {string} guestId - Guest ID
 * @param {string} token - Auth token
 * @returns {Promise<void>}
 */
export const deleteGuest = async (eventId, guestId, token) => {
  try {
    console.log("[EVENTS SERVICE] Deleting guest:", { eventId, guestId });

    await authenticatedFetch(`/${eventId}/guests/${guestId}`, token, {
      method: "DELETE",
    });

    console.log("[EVENTS SERVICE] Guest deleted successfully");
  } catch (error) {
    console.error("[EVENTS SERVICE] Error deleting guest:", error.message);
    throw error;
  }
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
  try {
    console.log("[EVENTS SERVICE] Adding staff to event:", eventId);

    const data = await authenticatedFetch(`/${eventId}/staff`, token, {
      method: "POST",
      body: JSON.stringify(staffData),
    });

    console.log("[EVENTS SERVICE] Staff added successfully");

    return data.data.staff;
  } catch (error) {
    console.error("[EVENTS SERVICE] Error adding staff:", error.message);
    throw error;
  }
};

/**
 * Update staff information
 * @param {string} eventId - Event ID
 * @param {string} staffId - Staff ID
 * @param {Object} staffData - Updated staff data
 * @returns {Promise<Object>}
 */
export const updateStaff = async (
  eventId,
  staffId,
  staffData,
  token,
) => {
  try {
    console.log("[EVENTS SERVICE] Updating staff:", {
      eventId,
      staffId,
    });

    const data = await authenticatedFetch(
      `/${eventId}/staff/${staffId}`,
      token,
      {
        method: "PUT",
        body: JSON.stringify(staffData),
      },
    );

    console.log("[EVENTS SERVICE] Staff updated successfully");

    return data.data.staff;
  } catch (error) {
    console.error("[EVENTS SERVICE] Error updating staff:", error.message);
    throw error;
  }
};

/**
 * Delete a staff member from an event
 * @param {string} eventId - Event ID
 * @param {string} staffId - Staff ID
 * @param {string} token - Auth token
 * @returns {Promise<void>}
 */
export const deleteStaff = async (eventId, staffId, token) => {
  try {
    console.log("[EVENTS SERVICE] Deleting staff:", {
      eventId,
      staffId,
    });

    await authenticatedFetch(`/${eventId}/staff/${staffId}`, token, {
      method: "DELETE",
    });

    console.log("[EVENTS SERVICE] Staff deleted successfully");
  } catch (error) {
    console.error("[EVENTS SERVICE] Error deleting staff:", error.message);
    throw error;
  }
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
 * Format guest data for display
 * @param {Object} guest - Raw guest data from backend
 * @returns {Object} Formatted guest data
 */
export const formatGuestForDisplay = (guest) => {
  if (!guest) return null;

  return {
    id: guest._id || guest.guestId,
    name: guest.name || "",
    phone: guest.phone || "",
    email: guest.email || "not provided",
    status: guest.status || "invited",
    respondedAt: guest.respondAt || guest.rsvp?.respondedAt || null,
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

// ==================== BULK OPERATIONS APIs ====================

/**
 * Bulk delete events
 * @param {string[]} eventIds - Array of event IDs to delete
 * @param {string} token - Auth token
 * @returns {Promise<Object>}
 */
export const bulkDeleteEvents = async (eventIds, token) => {
  try {
    console.log("[EVENTS SERVICE] Bulk deleting events:", eventIds.length);

    if (!eventIds || !Array.isArray(eventIds) || eventIds.length === 0) {
      throw new Error("Event IDs array is required");
    }

    if (eventIds.length > 100) {
      throw new Error("Cannot delete more than 100 events at once");
    }

    const data = await authenticatedFetch("/bulk-delete", token, {
      method: "POST",
      body: JSON.stringify({ eventIds }),
    });

    console.log("[EVENTS SERVICE] Bulk delete completed");

    return data;
  } catch (error) {
    console.error("[EVENTS SERVICE] Error bulk deleting events:", error.message);
    throw error;
  }
};

// ==================== EXPORT APIs ====================

/**
 * Export events to Excel
 * Note: Returns blob URL for download on mobile
 * @param {string} token - Auth token
 * @returns {Promise<Object>}
 */
export const exportEvents = async (_legacyToken) => {
  try {
    console.log("[EVENTS SERVICE] Exporting events...");

    // Phase 4 W0-AUTH: route through apiFetch so the export gets the
    // refreshed access token automatically. Allow up to 60 s — XLSX
    // generation can be slow when the host has many events.
    const response = await apiFetch(`${ENDPOINTS.EVENTS.BASE}/export/events`, {
      method: "GET",
      timeoutMs: 60 * 1000,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Failed to export events");
    }

    const blob = await response.blob();

    console.log("[EVENTS SERVICE] Events exported successfully");

    return {
      success: true,
      blob,
      filename: "events-export.xlsx",
    };
  } catch (error) {
    console.error("[EVENTS SERVICE] Error exporting events:", error.message);
    throw error;
  }
};

/**
 * Export event guests to Excel
 * Note: Returns blob URL for download on mobile
 * @param {string} eventId - Event ID
 * @param {string} token - Auth token
 * @returns {Promise<Object>}
 */
export const exportEventGuests = async (eventId, _legacyToken) => {
  try {
    console.log("[EVENTS SERVICE] Exporting guests for event:", eventId);

    if (!eventId) {
      throw new Error("Event ID is required");
    }

    // Phase 4 W0-AUTH: route through apiFetch so the export gets the
    // refreshed access token automatically.
    const response = await apiFetch(`${ENDPOINTS.EVENTS.BASE}/export/${eventId}/guests`, {
      method: "GET",
      timeoutMs: 60 * 1000,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Failed to export guests");
    }

    const blob = await response.blob();

    console.log("[EVENTS SERVICE] Guests exported successfully");

    return {
      success: true,
      blob,
      filename: `event-${eventId}-guests.xlsx`,
    };
  } catch (error) {
    console.error("[EVENTS SERVICE] Error exporting guests:", error.message);
    throw error;
  }
};

// ==================== EVENT SETTINGS APIs ====================

/**
 * Send test message for event
 * @param {string} eventId - Event ID
 * @param {string} token - Auth token
 * @returns {Promise<Object>}
 */
export const sendTestMessage = async (eventId, phoneNumber, channel, token) => {
  try {
    console.log("[EVENTS SERVICE] Sending test message for event:", eventId);

    if (!eventId) {
      throw new Error("Event ID is required");
    }

    const data = await authenticatedFetch(`/${eventId}/test-message`, token, {
      method: "PATCH",
      body: JSON.stringify({ phoneNumber, channel }),
    });

    console.log("[EVENTS SERVICE] Test message sent successfully");

    return data;
  } catch (error) {
    console.error("[EVENTS SERVICE] Error sending test message:", error.message);
    throw error;
  }
};

/**
 * Update launch settings for event
 * @param {string} eventId - Event ID
 * @param {Object} launchSettings - Launch settings data
 * @param {string} token - Auth token
 * @returns {Promise<Object>}
 */
export const updateLaunchSettings = async (eventId, launchSettings, token) => {
  try {
    console.log("[EVENTS SERVICE] Updating launch settings:", eventId);

    if (!eventId) {
      throw new Error("Event ID is required");
    }

    const data = await authenticatedFetch(`/${eventId}/launch-settings`, token, {
      method: "PATCH",
      body: JSON.stringify(launchSettings),
    });

    console.log("[EVENTS SERVICE] Launch settings updated successfully");

    return data;
  } catch (error) {
    console.error(
      "[EVENTS SERVICE] Error updating launch settings:",
      error.message
    );
    throw error;
  }
};

/**
 * Update event details
 * @param {string} eventId - Event ID
 * @param {Object} eventDetails - Event details data
 * @param {string} token - Auth token
 * @returns {Promise<Object>}
 */
export const updateEventDetails = async (eventId, eventDetails, token) => {
  try {
    console.log("[EVENTS SERVICE] Updating event details:", eventId);

    if (!eventId) {
      throw new Error("Event ID is required");
    }

    const data = await authenticatedFetch(`/${eventId}/event-details`, token, {
      method: "PATCH",
      body: JSON.stringify(eventDetails),
    });

    console.log("[EVENTS SERVICE] Event details updated successfully");

    return data;
  } catch (error) {
    console.error(
      "[EVENTS SERVICE] Error updating event details:",
      error.message
    );
    throw error;
  }
};

/**
 * Update single guest
 * @param {string} eventId - Event ID
 * @param {string} guestId - Guest ID
 * @param {Object} guestData - Updated guest data
 * @param {string} token - Auth token
 * @returns {Promise<Object>}
 */
/**
 * Get subscription info for event creation (enriched with dynamic event counting)
 */
export const getSubscriptionInfo = async (token) => {
  try {
    const data = await authenticatedFetch("/subscription-info", token);
    return data;
  } catch (error) {
    console.error("[EVENTS SERVICE] Error fetching subscription info:", error.message);
    throw error;
  }
};

export const updateGuest = async (eventId, guestId, guestData, token) => {
  try {
    console.log("[EVENTS SERVICE] Updating guest:", { eventId, guestId });

    if (!eventId) {
      throw new Error("Event ID is required");
    }

    if (!guestId) {
      throw new Error("Guest ID is required");
    }

    const data = await authenticatedFetch(
      `/${eventId}/guests/${guestId}`,
      token,
      {
        method: "PUT",
        body: JSON.stringify(guestData),
      }
    );

    console.log("[EVENTS SERVICE] Guest updated successfully");

    return data;
  } catch (error) {
    console.error("[EVENTS SERVICE] Error updating guest:", error.message);
    throw error;
  }
};

// ==================== STAFF / GUEST ACCESS TOKEN APIs ====================

/**
 * Phase 4b W2-STAFF — list active + revoked staff access tokens for an
 * event. Backend: GET /events/:eventId/staff-tokens (added in W0-STAFF
 * this phase). Returns `{ tokens: [...] }` where each row carries
 * `_id, phone, staffName, isRevoked, isExpired, lastUsedAt, useCount,
 * expiresAt, revokedAt, revokedBy, createdAt`.
 *
 * Phase 4 mobile shipped a revoke flow that walked `event.staffList`
 * and passed the staff sub-doc _id directly into the existing revoke
 * endpoint — that still works (the backend resolves to all tokens for
 * that staff phone), but doesn't surface token lifecycle (active vs
 * revoked). Peter asked for an explicit list view; this endpoint
 * powers it. Mobile UI consumer: `SingleEventStats.js` staff tab.
 *
 * @param {string} eventId
 * @returns {Promise<{tokens: Array}>}
 */
export const listStaffTokens = async (eventId) => {
  if (!eventId) throw new Error("eventId is required");
  const data = await authenticatedFetch(`/${eventId}/staff-tokens`);
  return data?.data || data;
};

/**
 * Phase 4 W2-STAFF — revoke a staff member's access token.
 *
 * Backend: POST /events/:eventId/staff/:staffId/revoke (Phase 3e.1).
 * `staffId` is the staff sub-document _id from `event.staffList[i]._id`,
 * NOT the StaffAccessToken doc id — the backend resolves the token from
 * the staff phone. Idempotent: re-revoking returns 200 with
 * `wasAlreadyRevoked: true`.
 *
 * @param {string} eventId
 * @param {string} staffId - staff sub-document _id
 * @param {string} [token] - legacy; ignored (apiFetch reads from store)
 */
export const revokeStaffAccess = async (eventId, staffId, token) => {
  if (!eventId || !staffId) throw new Error("eventId and staffId are required");
  // Per-click idempotency key — same shape as retryLaunch.
  const idempotencyKey = `staff-revoke-${eventId}-${staffId}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
  const data = await authenticatedFetch(
    `/${eventId}/staff/${staffId}/revoke`,
    token,
    { method: "POST", headers: { "Idempotency-Key": idempotencyKey } }
  );
  return data?.data || data;
};

/**
 * Phase 4 W2-QR — rotate a guest's QR code.
 *
 * Backend: POST /events/:eventId/guests/:guestId/rotate-qr (Phase 3e.3).
 * Returns the new `qrUrl` and `expiresAt`. Old QR scans return 410 with
 * `reason: 'qr_rotated'`.
 */
export const rotateGuestQr = async (eventId, guestId, token) => {
  if (!eventId || !guestId) throw new Error("eventId and guestId are required");
  const idempotencyKey = `qr-rotate-${eventId}-${guestId}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
  // Note: this endpoint lives under the `/guests/...` mount, NOT under
  // `/events/...`. We can't use authenticatedFetch (which prepends the
  // EVENTS base) — go direct via apiFetch.
  const response = await apiFetch(
    `/guests/events/${eventId}/guests/${guestId}/rotate-qr`,
    { method: "POST", headers: { "Idempotency-Key": idempotencyKey } }
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Failed to rotate QR");
  }
  return data?.data || data;
};

/**
 * Phase 4 W2-GAT — manually revoke a guest's post-event access token.
 *
 * Backend: POST /events/:eventId/guests/:guestId/revoke-access
 * (Phase 3e.4). Distinct from QR rotate: this revokes post-event content
 * access (photos, comments) without minting a new token.
 */
export const revokeGuestAccess = async (eventId, guestId, token) => {
  if (!eventId || !guestId) throw new Error("eventId and guestId are required");
  const idempotencyKey = `gat-revoke-${eventId}-${guestId}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
  const response = await apiFetch(
    `/guests/events/${eventId}/guests/${guestId}/revoke-access`,
    { method: "POST", headers: { "Idempotency-Key": idempotencyKey } }
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Failed to revoke guest access");
  }
  return data?.data || data;
};
