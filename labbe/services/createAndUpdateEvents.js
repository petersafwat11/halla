/**
 * Create and Update Events Service Functions
 * API calls for creating and updating events
 * Based on backend API documentation
 */

import packageService from "./packageService";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v2";

/**
 * Get authorization token from cookies
 */
const getAuthToken = () => {
  if (typeof window !== "undefined") {
    const cookies = document.cookie.split(";");
    const tokenCookie = cookies.find((cookie) =>
      cookie.trim().startsWith("token="),
    );
    return tokenCookie ? tokenCookie.split("=")[1] : null;
  }
  return null;
};

/**
 * Make authenticated API request with enhanced error handling
 */
const makeAuthenticatedRequest = async (url, options = {}, token = null) => {
  const authToken = token || getAuthToken();

  // Don't set Content-Type for FormData - let browser set it with boundary
  const isFormData = options.body instanceof FormData;

  const defaultOptions = {
    headers: {
      ...(!isFormData && { "Content-Type": "application/json" }),
      ...(authToken && { Authorization: `Bearer ${authToken}` }),
    },
    credentials: "include",
  };

  try {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      // Create error object with status and data
      const error = new Error(errorData.message || "Request failed");
      error.status = response.status;
      error.data = errorData;
      throw error;
    }

    return response.json();
  } catch (error) {
    console.error("API request error:", error);
    throw error;
  }
};

/**
 * Create and Update Events Service API
 */
export const createUpdateEventsService = {
  /**
   * Create new event with package limit validation
   * POST /events
   * @param {Object} eventData - Event data
   * @param {string} [token] - Optional auth token
   * @returns {Promise<Object>} Created event
   */
  createEvent: async (eventData, token = null) => {
    // Validate event creation limit before attempting
    try {
      const validation = await packageService.validateEventCreation(token);
      if (!validation.canCreate) {
        const error = new Error(
          `You've reached your event limit (${validation.current}/${validation.limit}). Please upgrade your plan to create more events.`,
        );
        error.status = 403;
        error.data = {
          code: "PACKAGE_LIMIT_EXCEEDED",
          limitType: "events",
          current: validation.current,
          limit: validation.limit,
          suggestedPlan: validation.suggestedPlan,
        };
        throw error;
      }
    } catch (error) {
      // If validation fails, throw the error
      if (packageService.isPackageLimitError(error)) {
        throw error;
      }
      // If validation endpoint doesn't exist, continue (backward compatibility)
      console.warn("Package validation not available:", error);
    }

    // Always use FormData to match backend expectations
    const formData = new FormData();

    // Add template image file if present
    if (eventData.invitationSettings?.templateImage instanceof File) {
      formData.append(
        "templateImage",
        eventData.invitationSettings.templateImage,
      );
    }

    // Add individual fields as JSON strings (matching backend expectations)
    if (eventData.guestList) {
      formData.append("guestList", JSON.stringify(eventData.guestList));
    }

    if (eventData.eventDetails) {
      formData.append("eventDetails", JSON.stringify(eventData.eventDetails));
    }

    if (eventData.staffList) {
      formData.append("staffList", JSON.stringify(eventData.staffList));
    }

    if (eventData.invitationSettings) {
      // Remove the file from invitationSettings since it's handled separately
      const { templateImage, ...restInvitationSettings } =
        eventData.invitationSettings;
      formData.append(
        "invitationSettings",
        JSON.stringify(restInvitationSettings),
      );
    }

    if (eventData.launchSettings) {
      formData.append(
        "launchSettings",
        JSON.stringify(eventData.launchSettings),
      );
    }

    return makeAuthenticatedRequest(
      "/events",
      {
        method: "POST",
        body: formData,
      },
      token,
    );
  },

  /**
   * Update event details (partial update)
   * PATCH /events/:id/event-details
   * @param {string} eventId - Event ID
   * @param {Object} eventDetails - Event details to update
   * @param {string} [token] - Optional auth token
   * @returns {Promise<Object>} Updated event
   */
  updateEventDetails: async (eventId, eventDetails, token = null) => {
    if (!eventId) {
      throw new Error("Event ID is required");
    }

    if (!eventDetails) {
      throw new Error("Event details are required");
    }

    return makeAuthenticatedRequest(
      `/events/${eventId}/event-details`,
      {
        method: "PATCH",
        body: JSON.stringify(eventDetails),
      },
      token,
    );
  },

  /**
   * Update guest list (partial update)
   * PATCH /events/:id/guest-list
   * @param {string} eventId - Event ID
   * @param {Array} guestList - Guest list
   * @param {Array} [staffList] - Optional staff list
   * @param {string} [token] - Optional auth token
   * @returns {Promise<Object>} Updated event
   */
  updateGuestList: async (
    eventId,
    guestList,
    staffList = null,
    token = null,
  ) => {
    if (!eventId) {
      throw new Error("Event ID is required");
    }

    const body = { guestList };
    if (staffList) {
      body.staffList = staffList;
    }

    return makeAuthenticatedRequest(
      `/events/${eventId}/guest-list`,
      {
        method: "PATCH",
        body: JSON.stringify(body),
      },
      token,
    );
  },

  /**
   * Update invitation settings (partial update)
   * PATCH /events/:id/invitation-settings
   * @param {string} eventId - Event ID
   * @param {Object} invitationSettings - Invitation settings
   * @param {string} [token] - Optional auth token
   * @returns {Promise<Object>} Updated event
   */
  updateInvitationSettings: async (
    eventId,
    invitationSettings,
    token = null,
  ) => {
    if (!eventId) {
      throw new Error("Event ID is required");
    }

    if (!invitationSettings) {
      throw new Error("Invitation settings are required");
    }

    const formData = new FormData();

    // Add template image file if present
    if (invitationSettings.templateImage instanceof File) {
      formData.append("templateImage", invitationSettings.templateImage);
    }

    // Add invitation settings as JSON string (excluding file)
    const { templateImage, ...restInvitationSettings } = invitationSettings;
    formData.append(
      "invitationSettings",
      JSON.stringify(restInvitationSettings),
    );

    return makeAuthenticatedRequest(
      `/events/${eventId}/invitation-settings`,
      {
        method: "PATCH",
        body: formData,
      },
      token,
    );
  },

  /**
   * Update launch settings (partial update)
   * PATCH /events/:id/launch-settings
   * @param {string} eventId - Event ID
   * @param {Object} launchSettings - Launch settings
   * @param {string} [token] - Optional auth token
   * @returns {Promise<Object>} Updated event
   */
  updateLaunchSettings: async (eventId, launchSettings, token = null) => {
    if (!eventId) {
      throw new Error("Event ID is required");
    }

    if (!launchSettings) {
      throw new Error("Launch settings are required");
    }

    return makeAuthenticatedRequest(
      `/events/${eventId}/launch-settings`,
      {
        method: "PATCH",
        body: JSON.stringify(launchSettings),
      },
      token,
    );
  },

  /**
   * Add guest to event with limit validation
   * POST /events/:eventId/guests
   * @param {string} eventId - Event ID
   * @param {Object} guestData - Guest data
   * @param {string} [token] - Optional auth token
   * @returns {Promise<Object>} Added guest
   */
  addGuest: async (eventId, guestData, token = null) => {
    if (!eventId) {
      throw new Error("Event ID is required");
    }

    if (!guestData.name) {
      throw new Error("Guest name is required");
    }

    // Validate guest limit before adding
    try {
      const validation = await packageService.checkGuestLimit(
        eventId,
        1,
        token,
      );
      if (!validation.canAdd) {
        const error = new Error(
          `You've reached your guest limit (${validation.current}/${validation.limit}). Please upgrade your plan to add more guests.`,
        );
        error.status = 403;
        error.data = {
          code: "PACKAGE_LIMIT_EXCEEDED",
          limitType: "guests",
          current: validation.current,
          limit: validation.limit,
          suggestedPlan: validation.suggestedPlan,
        };
        throw error;
      }
    } catch (error) {
      if (packageService.isPackageLimitError(error)) {
        throw error;
      }
      console.warn("Guest limit validation not available:", error);
    }

    return makeAuthenticatedRequest(
      `/events/${eventId}/guests`,
      {
        method: "POST",
        body: JSON.stringify(guestData),
      },
      token,
    );
  },

  /**
   * Update guest in event
   * PUT /events/:eventId/guests/:guestId
   * @param {string} eventId - Event ID
   * @param {string} guestId - Guest ID
   * @param {Object} guestData - Guest data
   * @param {string} [token] - Optional auth token
   * @returns {Promise<Object>} Updated guest
   */
  updateGuest: async (eventId, guestId, guestData, token = null) => {
    if (!eventId) {
      throw new Error("Event ID is required");
    }

    if (!guestId) {
      throw new Error("Guest ID is required");
    }

    return makeAuthenticatedRequest(
      `/events/${eventId}/guests/${guestId}`,
      {
        method: "PUT",
        body: JSON.stringify(guestData),
      },
      token,
    );
  },

  /**
   * Remove guest from event
   * DELETE /events/:eventId/guests/:guestId
   * @param {string} eventId - Event ID
   * @param {string} guestId - Guest ID
   * @param {string} [token] - Optional auth token
   * @returns {Promise<Object>} Deletion result
   */
  removeGuest: async (eventId, guestId, token = null) => {
    if (!eventId) {
      throw new Error("Event ID is required");
    }

    if (!guestId) {
      throw new Error("Guest ID is required");
    }

    return makeAuthenticatedRequest(
      `/events/${eventId}/guests/${guestId}`,
      { method: "DELETE" },
      token,
    );
  },

  /**
   * Add staff to event with limit validation
   * POST /events/:eventId/staff
   * @param {string} eventId - Event ID
   * @param {Object} staffData - Staff data
   * @param {string} [token] - Optional auth token
   * @returns {Promise<Object>} Added staff member
   */
  addStaff: async (eventId, staffData, token = null) => {
    if (!eventId) {
      throw new Error("Event ID is required");
    }

    if (!staffData.name || staffData.name.length < 2) {
      throw new Error("Staff name must be at least 2 characters");
    }

    if (staffData.name.length > 100) {
      throw new Error("Staff name cannot exceed 100 characters");
    }

    if (!staffData.phone) {
      throw new Error("Staff phone is required");
    }

    const phoneRegex = /^[0-9]{7,15}$/;
    if (!phoneRegex.test(staffData.phone.replace(/\D/g, ""))) {
      throw new Error("Phone number must be 7-15 digits");
    }

    // Validate moderator limit before adding
    try {
      const validation = await packageService.checkModeratorLimit(
        eventId,
        1,
        token,
      );
      if (!validation.canAdd) {
        const error = new Error(
          `You've reached your moderator limit (${validation.current}/${validation.limit}). Please upgrade your plan to add more moderators.`,
        );
        error.status = 403;
        error.data = {
          code: "PACKAGE_LIMIT_EXCEEDED",
          limitType: "moderators",
          current: validation.current,
          limit: validation.limit,
          suggestedPlan: validation.suggestedPlan,
        };
        throw error;
      }
    } catch (error) {
      if (packageService.isPackageLimitError(error)) {
        throw error;
      }
      console.warn("Moderator limit validation not available:", error);
    }

    return makeAuthenticatedRequest(
      `/events/${eventId}/staff`,
      {
        method: "POST",
        body: JSON.stringify(staffData),
      },
      token,
    );
  },

  /**
   * Update staff in event
   * PUT /events/:eventId/staff/:id
   * @param {string} eventId - Event ID
   * @param {string} staffId - Staff ID
   * @param {Object} staffData - Staff data
   * @param {string} [token] - Optional auth token
   * @returns {Promise<Object>} Updated staff member
   */
  updateStaff: async (
    eventId,
    staffId,
    staffData,
    token = null,
  ) => {
    if (!eventId) {
      throw new Error("Event ID is required");
    }

    if (!staffId) {
      throw new Error("Staff ID is required");
    }

    const objectIdRegex = /^[a-fA-F0-9]{24}$/;
    if (!objectIdRegex.test(staffId)) {
      throw new Error("Invalid staff ID format");
    }

    return makeAuthenticatedRequest(
      `/events/${eventId}/staff/${staffId}`,
      {
        method: "PUT",
        body: JSON.stringify(staffData),
      },
      token,
    );
  },

  /**
   * Update staff status
   * PUT /events/:eventId/staff/:id/status
   * @param {string} eventId - Event ID
   * @param {string} staffId - Staff ID
   * @param {string} status - New status
   * @param {string} [token] - Optional auth token
   * @returns {Promise<Object>} Updated staff member
   */
  updateStaffStatus: async (
    eventId,
    staffId,
    status,
    token = null,
  ) => {
    if (!eventId) {
      throw new Error("Event ID is required");
    }

    if (!staffId) {
      throw new Error("Staff ID is required");
    }

    const objectIdRegex = /^[a-fA-F0-9]{24}$/;
    if (!objectIdRegex.test(staffId)) {
      throw new Error("Invalid staff ID format");
    }

    if (!["active", "inactive", "pending"].includes(status)) {
      throw new Error("Invalid status value");
    }

    return makeAuthenticatedRequest(
      `/events/${eventId}/staff/${staffId}/status`,
      {
        method: "PUT",
        body: JSON.stringify({ status }),
      },
      token,
    );
  },

  /**
   * Remove staff from event
   * DELETE /events/:eventId/staff/:id
   * @param {string} eventId - Event ID
   * @param {string} staffId - Staff ID
   * @param {string} [token] - Optional auth token
   * @returns {Promise<Object>} Deletion result
   */
  removeStaff: async (eventId, staffId, token = null) => {
    if (!eventId) {
      throw new Error("Event ID is required");
    }

    if (!staffId) {
      throw new Error("Staff ID is required");
    }

    const objectIdRegex = /^[a-fA-F0-9]{24}$/;
    if (!objectIdRegex.test(staffId)) {
      throw new Error("Invalid staff ID format");
    }

    return makeAuthenticatedRequest(
      `/events/${eventId}/staff/${staffId}`,
      { method: "DELETE" },
      token,
    );
  },
};

/**
 * Helper functions for event creation/update
 */
export const createUpdateEventsHelpers = {
  /**
   * Transform form data to API format for event creation
   * @param {Object} formData - Form data from react-hook-form
   * @returns {Object} Transformed data for API
   */
  transformFormDataToAPI: (formData) => {
    return {
      eventDetails: {
        title: formData.eventName,
        type: formData.eventType,
        date: formData.eventDate,
        time: formData.eventTime,
        location: formData.address,
        description: "",
      },
      guestList: (formData.guestList || []).map((guest) => ({
        name: guest.name,
        phone: guest.mobile || guest.phone,
        email: guest.email || "",
      })),
      staffList: (formData.staffList || []).map((s) => ({
        name: s.name,
        phone: s.mobile || s.phone,
      })),
      invitationSettings: {
        selectedTemplate: formData.selectedTemplate,
        attendanceAutoReply: formData.attendanceAutoReply,
        absenceAutoReply: formData.absenceAutoReply,
        expectedAttendanceAutoReply: formData.expectedAttendanceAutoReply,
        templateImage: formData.templateImage,
        guestReplies: formData.guestReplies,
      },
      launchSettings: {
        sendSchedule: formData.sendSchedule || "now",
        scheduledDate: formData.scheduleDate,
        scheduledTime: formData.scheduleTime,
      },
    };
  },

  /**
   * Transform API data to form format for editing
   * @param {Object} event - Event data from API
   * @returns {Object} Transformed data for form
   */
  transformAPIDataToForm: (event) => {
    // Transform guest list: map phone -> mobile
    const transformedGuestList = (event.guestList || []).map((guest) => ({
      id: guest._id || guest.id || Date.now() + Math.random(),
      name: guest.name || "",
      mobile: guest.phone || "",
      email: guest.email || "",
    }));

    // Transform staff list: map phone -> mobile
    const transformedStaffList = (event.staffList || []).map(
      (s) => ({
        id: s._id || s.id || Date.now() + Math.random(),
        name: s.name || "",
        mobile: s.phone || "",
      }),
    );

    return {
      eventType: event.eventDetails?.type || "",
      eventName: event.eventDetails?.title || "",
      eventDate: event.eventDetails?.date || "",
      eventTime: event.eventDetails?.time || "12:00:AM",
      address: event.eventDetails?.location || {
        address: "",
        latitude: 24.7136,
        longitude: 46.6753,
        city: "",
        country: "",
      },
      guestList: transformedGuestList,
      staffList: transformedStaffList,
      // Phase 4c W0-RENAME — read canonical fields first, fall back
      // to legacy `invitationSettings.*` during the dual-write window.
      selectedTemplate: event.invitationSettings?.selectedTemplate || null,
      taqnyatTemplate: event.taqnyatTemplate || null,
      visualTemplate: event.visualTemplate || event.invitationSettings?.visualTemplate || null,
      templateImage:
        event.visualTemplate?.bakedImagePath ||
        event.invitationSettings?.templateImage ||
        "",
      attendanceAutoReply:
        event.guestReplies?.onAttend ||
        event.invitationSettings?.attendanceAutoReply ||
        "",
      absenceAutoReply:
        event.guestReplies?.onAbsent ||
        event.invitationSettings?.absenceAutoReply ||
        "",
      expectedAttendanceAutoReply:
        event.guestReplies?.onExpected ||
        event.invitationSettings?.expectedAttendanceAutoReply ||
        "",
      guestReplies: event.guestReplies || {
        onAttend: event.invitationSettings?.attendanceAutoReply || "",
        onAbsent: event.invitationSettings?.absenceAutoReply || "",
        onExpected: event.invitationSettings?.expectedAttendanceAutoReply || "",
      },
      sendSchedule: event.launchSettings?.sendSchedule || "now",
      scheduleDate: event.launchSettings?.scheduledDate || "",
      scheduleTime: event.launchSettings?.scheduledTime || "",
    };
  },

  /**
   * Validate step data
   * @param {number} step - Current step
   * @param {Object} formData - Form data
   * @returns {boolean} Is valid
   */
  validateStep: (step, formData) => {
    switch (step) {
      case 1:
        return (
          formData.eventType &&
          formData.eventName &&
          formData.eventDate &&
          formData.eventTime
        );
      case 2:
        return formData.guestList && formData.guestList.length > 0;
      case 3:
        return formData.selectedTemplate !== null;
      case 4:
        return formData.confirmReviewed === true;
      default:
        return false;
    }
  },

  getDefaultFormValues: () => ({
    eventType: "",
    eventName: "",
    eventDate: "",
    eventTime: "12:00:AM",
    address: {
      address: "",
      latitude: 24.7136,
      longitude: 46.6753,
      city: "",
      country: "",
    },
    guestList: [],
    staffList: [],
    selectedTemplate: null,
    templateImage: "",
    attendanceAutoReply: "",
    absenceAutoReply: "",
    expectedAttendanceAutoReply: "",
    guestReplies: {
      onAttend: "",
      onAbsent: "",
      onExpected: "",
    },
    sendSchedule: "now",
    scheduleDate: "",
    scheduleTime: "",
    confirmReviewed: false,
  }),
};

export default createUpdateEventsService;
