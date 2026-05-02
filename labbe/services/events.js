/**
 * Events Service Functions
 * API calls for events listing, single event details, and home page stats
 * Based on backend API documentation
 */

import apiClient from "./apiClient";

/**
 * Events Service API
 */
export const eventsService = {
  /**
   * Get user's events with stats
   * GET /events/my-events
   * @param {Object} params - Query parameters
   * @param {number} [params.page=1] - Page number
   * @param {number} [params.limit=10] - Items per page
   * @param {string} [token] - Optional auth token
   * @returns {Promise<Object>} Events list with pagination
   */
  getMyEvents: async (params = {}, token = null) => {
    const { page = 1, limit = 10 } = params;
    const queryString = apiClient.buildQueryString({ page, limit });
    return apiClient.get(`/events/my-events${queryString}`, { token });
  },

  /**
   * Get aggregated event stats (for events page and home page)
   * GET /events/stats
   * @param {string} [token] - Optional auth token
   * @returns {Promise<Object>} Aggregated stats with events list
   */
  getEventsStats: async (token = null) => {
    return apiClient.get("/events/stats", { token });
  },

  /**
   * Get single event stats
   * GET /events/stats/:id
   * @param {string} eventId - Event ID
   * @param {string} [token] - Optional auth token
   * @returns {Promise<Object>} Single event stats
   */
  getEventStats: async (eventId, token = null) => {
    if (!eventId) {
      throw new Error("Event ID is required");
    }
    return apiClient.get(`/events/stats/${eventId}`, { token });
  },

  /**
   * Get event details by ID
   * GET /events/:id
   * @param {string} eventId - Event ID
   * @param {string} [token] - Optional auth token
   * @returns {Promise<Object>} Event details
   */
  getEventById: async (eventId, token = null) => {
    if (!eventId) {
      throw new Error("Event ID is required");
    }
    return apiClient.get(`/events/${eventId}`, { token });
  },

  /**
   * Delete event
   * DELETE /events/:id
   * @param {string} eventId - Event ID
   * @param {string} [token] - Optional auth token
   * @returns {Promise<Object>} Deletion result
   */
  deleteEvent: async (eventId, token = null) => {
    if (!eventId) {
      throw new Error("Event ID is required");
    }
    return apiClient.delete(`/events/${eventId}`, { token });
  },

  /**
   * Bulk delete events
   * POST /events/bulk-delete
   * @param {string[]} eventIds - Array of event IDs to delete
   * @param {string} [token] - Optional auth token
   * @returns {Promise<Object>} Deletion result with count
   */
  bulkDeleteEvents: async (eventIds, token = null) => {
    if (!eventIds || !Array.isArray(eventIds) || eventIds.length === 0) {
      throw new Error("Event IDs array is required");
    }
    if (eventIds.length > 100) {
      throw new Error("Cannot delete more than 100 events at once");
    }
    const objectIdRegex = /^[a-fA-F0-9]{24}$/;
    const invalidIds = eventIds.filter((id) => !objectIdRegex.test(id));
    if (invalidIds.length > 0) {
      throw new Error(`Invalid ObjectId format: ${invalidIds[0]}`);
    }
    return apiClient.post(`/events/bulk-delete`, { eventIds }, { token });
  },

  /**
   * Export events as Excel file
   * GET /events/export/events
   * @param {string} [token] - Optional auth token
   */
  exportEvents: async (token = null) => {
    const blob = await apiClient.get("/events/export/events", { token });

    // Create a download link
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "events-export.xlsx";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    return { success: true, message: "Events exported successfully" };
  },

  /**
   * Export event guests as Excel file
   * GET /events/export/:id/guests
   * @param {string} eventId - Event ID
   * @param {string} [token] - Optional auth token
   */
  exportEventGuests: async (eventId, token = null) => {
    if (!eventId) {
      throw new Error("Event ID is required");
    }

    const blob = await apiClient.get(`/events/export/${eventId}/guests`, {
      token,
    });

    // Create a download link
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `event-${eventId}-guests.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    return { success: true, message: "Guests exported successfully" };
  },

  /**
   * Send test message for event
   * PATCH /events/:id/test-message
   * @param {string} eventId - Event ID
   * @param {string} phoneNumber - Phone number to send test message to
   * @param {string} [channel='whatsapp'] - Channel to use (whatsapp/sms)
   * @param {string} [token] - Optional auth token
   * @returns {Promise<Object>} Result
   */
  sendTestMessage: async (eventId, phoneNumber, channel = 'whatsapp', token = null) => {
    if (!eventId) {
      throw new Error("Event ID is required");
    }
    return apiClient.patch(`/events/${eventId}/test-message`, { phoneNumber, channel }, { token });
  },

  /**
   * Get subscription info for event creation
   * GET /events/subscription-info
   * @param {string} [token] - Optional auth token
   * @returns {Promise<Object>} Subscription info with limits and usage
   */
  getSubscriptionInfo: async (token = null) => {
    return apiClient.get("/events/subscription-info", { token });
  },
};

/**
 * Helper functions for events
 */
export const eventsHelpers = {
  /**
   * Get event status label
   * @param {string} status - Event status
   * @param {Function} t - Translation function
   * @returns {string} Translated status label
   */
  getStatusLabel: (status, t) => {
    const statusLabels = {
      draft: t?.("events.status.draft") || "مسودة",
      scheduled: t?.("events.status.scheduled") || "مجدولة",
      live: t?.("events.status.live") || "مباشرة",
      completed: t?.("events.status.completed") || "منتهية",
      cancelled: t?.("events.status.cancelled") || "ملغية",
    };
    return statusLabels[status] || status;
  },

  /**
   * Get event status color
   * @param {string} status - Event status
   * @returns {Object} Color configuration
   */
  getStatusColor: (status) => {
    const statusColors = {
      draft: { bg: "#F3F4F6", color: "#6B7280" },
      scheduled: { bg: "#DBEAFE", color: "#1E40AF" },
      live: { bg: "#DCFCE7", color: "#166534" },
      completed: { bg: "#E5E7EB", color: "#374151" },
      cancelled: { bg: "#FEE2E2", color: "#991B1B" },
    };
    return statusColors[status] || statusColors.draft;
  },

  /**
   * Format event date
   * @param {string} date - Date string
   * @param {string} locale - Locale (ar/en)
   * @returns {string} Formatted date
   */
  formatEventDate: (date, locale = "ar") => {
    if (!date) return "";
    try {
      const dateObj = new Date(date);
      return dateObj.toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return date;
    }
  },

  /**
   * Format event time
   * @param {string} time - Time string
   * @param {string} locale - Locale (ar/en)
   * @returns {string} Formatted time
   */
  formatEventTime: (time, locale = "ar") => {
    if (!time) return "";
    try {
      // Parse time string (e.g., "12:00:AM" or "14:30")
      const [timePart, period] = time.split(":");
      if (period && (period.includes("AM") || period.includes("PM"))) {
        return time;
      }
      // Convert 24h to 12h format
      const [hours, minutes] = time.split(":");
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? "PM" : "AM";
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minutes} ${ampm}`;
    } catch {
      return time;
    }
  },

  /**
   * Calculate response rate
   * @param {Object} stats - Event stats
   * @returns {number} Response rate percentage
   */
  calculateResponseRate: (stats) => {
    if (!stats) return 0;
    const { confirmed = 0, declined = 0, totalInvites = 0 } = stats;
    if (totalInvites === 0) return 0;
    const totalResponses = confirmed + declined;
    return Math.round((totalResponses / totalInvites) * 100);
  },

  /**
   * Get event type label
   * @param {string} type - Event type
   * @param {Function} t - Translation function
   * @returns {string} Translated type label
   */
  getEventTypeLabel: (type, t) => {
    const typeLabels = {
      wedding: t?.("events.types.wedding") || "زفاف",
      engagement: t?.("events.types.engagement") || "خطوبة",
      birthday: t?.("events.types.birthday") || "عيد ميلاد",
      graduation: t?.("events.types.graduation") || "تخرج",
      corporate: t?.("events.types.corporate") || "مؤتمر",
      other: t?.("events.types.other") || "أخرى",
    };
    return typeLabels[type] || type;
  },

  /**
   * Check if event is editable
   * @param {Object} event - Event object
   * @returns {boolean} Is editable
   */
  isEventEditable: (event) => {
    if (!event) return false;
    const editableStatuses = ["draft", "scheduled"];
    return editableStatuses.includes(event.status);
  },

  /**
   * Check if event can be launched
   * @param {Object} event - Event object
   * @returns {boolean} Can be launched
   */
  canLaunchEvent: (event) => {
    if (!event) return false;
    return (
      event.status === "scheduled" &&
      event.guestList?.length > 0 &&
      event.invitationSettings?.templateImage
    );
  },
};

// Alias for backward compatibility
export const eventAPI = eventsService;

export default eventsService;
