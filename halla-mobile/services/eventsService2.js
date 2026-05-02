import { API_BASE_URL, ENDPOINTS } from "../config/api";

/**
 * Make authenticated API request
 * @param {string} endpoint - API endpoint
 * @param {string} token - Auth token from useAuthStore
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>}
 */
const authenticatedFetch = async (endpoint, token, options = {}) => {
  if (!token) {
    throw new Error("No authentication token found");
  }

  const url = `${API_BASE_URL}${ENDPOINTS.EVENTS.BASE}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  const data = await response.json();

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

    const url = `${API_BASE_URL}${ENDPOINTS.EVENTS.BASE}/${eventId}/invitation-settings`;

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

    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        // Do NOT set Content-Type — let fetch set multipart boundary
      },
      body: formData,
    });

    const data = await response.json();

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
    const data = await authenticatedFetch(`/${eventId}/retry-launch`, token, {
      method: "POST",
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
export const exportEvents = async (token) => {
  try {
    console.log("[EVENTS SERVICE] Exporting events...");

    const url = `${API_BASE_URL}${ENDPOINTS.EVENTS.BASE}/export/events`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
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
export const exportEventGuests = async (eventId, token) => {
  try {
    console.log("[EVENTS SERVICE] Exporting guests for event:", eventId);

    if (!eventId) {
      throw new Error("Event ID is required");
    }

    const url = `${API_BASE_URL}${ENDPOINTS.EVENTS.BASE}/export/${eventId}/guests`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
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
