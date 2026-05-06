/**
 * Staff Portal Service
 * API calls for staff portal - guest check-in and event management
 */

import apiClient from "./apiClient";
import Cookies from "js-cookie";
import { API_PATHS } from "./new-backend/api.config";

/**
 * Get staff token from cookies (separate from main auth token)
 */
const getStaffToken = () => {
  if (typeof window !== "undefined") {
    return Cookies.get("staffToken") || null;
  }
  return null;
};

/**
 * Set staff session token in cookie
 */
const setStaffToken = (token) => {
  if (typeof window !== "undefined") {
    Cookies.set("staffToken", token, {
      expires: 1,
      path: "/",
      sameSite: "Lax",
    });
  }
};

/**
 * Clear staff session token
 */
const clearStaffToken = () => {
  if (typeof window !== "undefined") {
    Cookies.remove("staffToken", { path: "/" });
  }
};

/**
 * Staff Portal Service API
 */
export const staffService = {
  // ============================================
  // AUTHENTICATION
  // ============================================

  /**
   * Verify staff access via token
   * @param {string} token - Access token from URL
   */
  verifyByToken: async (token) => {
    const response = await apiClient.get(
      `${API_PATHS.staff.verifyStaffAccess}?token=${encodeURIComponent(token)}`
    );

    // Store session token if verification successful
    if (response.data?.sessionToken) {
      setStaffToken(response.data.sessionToken);
    }

    return response;
  },

  /**
   * Verify staff access via phone and eventId
   * @param {string} phone - Staff phone number
   * @param {string} eventId - Event ID
   */
  verifyByPhone: async (phone, eventId) => {
    const response = await apiClient.get(
      `${API_PATHS.staff.verifyStaffAccess}?phone=${encodeURIComponent(
        phone
      )}&eventId=${encodeURIComponent(eventId)}`
    );

    if (response.data?.sessionToken) {
      setStaffToken(response.data.sessionToken);
    }

    return response;
  },

  /**
   * Logout - clear staff session
   */
  logout: () => {
    clearStaffToken();
  },

  /**
   * Check if staff is authenticated
   */
  isAuthenticated: () => {
    return !!getStaffToken();
  },

  // ============================================
  // GUEST MANAGEMENT
  // ============================================

  /**
   * Get guest list for event
   * @param {string} eventId - Event ID
   * @param {Object} options - { search, status, page, limit }
   */
  getGuests: async (eventId, options = {}) => {
    const queryString = apiClient.buildQueryString(options);
    return apiClient.get(`${API_PATHS.staff.getEventGuests(eventId)}${queryString}`, {
      token: getStaffToken(),
    });
  },

  /**
   * Check in guest via QR code
   * @param {string} eventId - Event ID
   * @param {string} qrCode - QR code data
   */
  checkInByQR: async (eventId, qrCode) => {
    return apiClient.post(
      API_PATHS.staff.checkInGuest(eventId),
      { qrCode },
      { token: getStaffToken() }
    );
  },

  /**
   * Check in guest by ID
   * @param {string} eventId - Event ID
   * @param {string} guestId - Guest ID
   */
  checkInById: async (eventId, guestId) => {
    return apiClient.post(
      API_PATHS.staff.checkInGuest(eventId),
      { guestId },
      { token: getStaffToken() }
    );
  },

  /**
   * Check in guest by phone
   * @param {string} eventId - Event ID
   * @param {string} phone - Guest phone number
   */
  checkInByPhone: async (eventId, phone) => {
    return apiClient.post(
      API_PATHS.staff.checkInGuest(eventId),
      { phone },
      { token: getStaffToken() }
    );
  },

  /**
   * Manual check-in with note
   * @param {string} eventId - Event ID
   * @param {string} guestId - Guest ID
   * @param {string} note - Optional note
   * @param {boolean} overrideDeclined - Override if guest declined
   */
  manualCheckIn: async (
    eventId,
    guestId,
    note = null,
    overrideDeclined = false
  ) => {
    return apiClient.post(
      API_PATHS.staff.manualCheckIn(eventId),
      { guestId, note, overrideDeclined },
      { token: getStaffToken() }
    );
  },

  // ============================================
  // STATISTICS
  // ============================================

  /**
   * Get real-time event stats
   * @param {string} eventId - Event ID
   */
  getStats: async (eventId) => {
    return apiClient.get(API_PATHS.staff.getEventStats(eventId), {
      token: getStaffToken(),
    });
  },
};

// Export token utilities for external use
export const staffTokenUtils = {
  getToken: getStaffToken,
  setToken: setStaffToken,
  clearToken: clearStaffToken,
};

export default staffService;
