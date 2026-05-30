/**
 * Staff Portal Service
 * API calls for staff portal — guest check-in and event management.
 *
 * The staff session token is stored in a JS-readable cookie. This is
 * intentional and consistent with the main app token. A future
 * cookie-hardening pass should switch both to HttpOnly, backend-issued
 * cookies (documented future-hardening item, §7.1).
 *
 * Phase 8: retired the `legacyClientAdapter` `.get/.post/.patch/.delete`
 * façade; every call now goes through `apiRequest` directly. Staff
 * session token attached via axios `config.headers.Authorization`.
 */

import Cookies from "js-cookie";
import { API_PATHS } from "@halla/shared/api/paths";
import { apiRequest } from "./http";

const getStaffToken = () => {
  if (typeof window !== "undefined") {
    return Cookies.get("staffToken") || null;
  }
  return null;
};

const setStaffToken = (token) => {
  if (typeof window !== "undefined") {
    Cookies.set("staffToken", token, {
      expires: 1,
      path: "/",
      sameSite: "Lax",
    });
  }
};

const clearStaffToken = () => {
  if (typeof window !== "undefined") {
    Cookies.remove("staffToken", { path: "/" });
  }
};

const staffAuthConfig = () => {
  const token = getStaffToken();
  return token
    ? { headers: { Authorization: `Bearer ${token}` } }
    : {};
};

export const staffService = {
  // ============================================
  // AUTHENTICATION
  // ============================================

  verifyByToken: async (token) => {
    const response = await apiRequest({
      method: "GET",
      path: API_PATHS.staff.verifyStaffAccess,
      params: { token },
    });
    if (response.data?.sessionToken) {
      setStaffToken(response.data.sessionToken);
    }
    return response;
  },

  verifyByPhone: async (phone, eventId) => {
    const response = await apiRequest({
      method: "GET",
      path: API_PATHS.staff.verifyStaffAccess,
      params: { phone, eventId },
    });
    if (response.data?.sessionToken) {
      setStaffToken(response.data.sessionToken);
    }
    return response;
  },

  logout: () => {
    clearStaffToken();
  },

  isAuthenticated: () => {
    return !!getStaffToken();
  },

  // ============================================
  // GUEST MANAGEMENT
  // ============================================

  /**
   * Get guest list for event.
   * @param {string} eventId
   * @param {{search?: string, status?: string, page?: number, limit?: number}} options
   */
  getGuests: async (eventId, options = {}) =>
    apiRequest({
      method: "GET",
      path: API_PATHS.staff.getEventGuests(eventId),
      params: options,
      config: staffAuthConfig(),
    }),

  checkInByQR: async (eventId, qrCode) =>
    apiRequest({
      method: "POST",
      path: API_PATHS.staff.checkInGuest(eventId),
      data: { qrCode },
      config: staffAuthConfig(),
    }),

  checkInById: async (eventId, guestId) =>
    apiRequest({
      method: "POST",
      path: API_PATHS.staff.checkInGuest(eventId),
      data: { guestId },
      config: staffAuthConfig(),
    }),

  checkInByPhone: async (eventId, phone) =>
    apiRequest({
      method: "POST",
      path: API_PATHS.staff.checkInGuest(eventId),
      data: { phone },
      config: staffAuthConfig(),
    }),
};

export const staffTokenUtils = {
  getToken: getStaffToken,
  setToken: setStaffToken,
  clearToken: clearStaffToken,
};

export default staffService;
