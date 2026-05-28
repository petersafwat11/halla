/**
 * Staff Portal Service
 * API calls for staff portal — guest check-in and event management.
 *
 * The staff session token is stored in a JS-readable cookie. This is
 * intentional and consistent with the main app token (`Cookies.get("token")`
 * in apiClient). A future cookie-hardening pass should switch both to
 * HttpOnly, backend-issued cookies.
 */

// Phase 3: migrated from the legacy fetch-based `./apiClient` to the
// canonical axios pipeline via legacyAdapter. Staff portal session token
// remains JS-readable for now (documented future-hardening item, §7.1).
import { legacyClientAdapter as apiClient } from "./new-backend/legacyAdapter";
import Cookies from "js-cookie";
import { API_PATHS } from "./new-backend/api.config";

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

export const staffService = {
  // ============================================
  // AUTHENTICATION
  // ============================================

  verifyByToken: async (token) => {
    const qs = apiClient.buildQueryString({ token });
    const response = await apiClient.get(
      `${API_PATHS.staff.verifyStaffAccess}${qs}`
    );
    if (response.data?.sessionToken) {
      setStaffToken(response.data.sessionToken);
    }
    return response;
  },

  verifyByPhone: async (phone, eventId) => {
    const qs = apiClient.buildQueryString({ phone, eventId });
    const response = await apiClient.get(
      `${API_PATHS.staff.verifyStaffAccess}${qs}`
    );
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
  getGuests: async (eventId, options = {}) => {
    const queryString = apiClient.buildQueryString(options);
    return apiClient.get(
      `${API_PATHS.staff.getEventGuests(eventId)}${queryString}`,
      { token: getStaffToken() }
    );
  },

  checkInByQR: async (eventId, qrCode) => {
    return apiClient.post(
      API_PATHS.staff.checkInGuest(eventId),
      { qrCode },
      { token: getStaffToken() }
    );
  },

  checkInById: async (eventId, guestId) => {
    return apiClient.post(
      API_PATHS.staff.checkInGuest(eventId),
      { guestId },
      { token: getStaffToken() }
    );
  },

  checkInByPhone: async (eventId, phone) => {
    return apiClient.post(
      API_PATHS.staff.checkInGuest(eventId),
      { phone },
      { token: getStaffToken() }
    );
  },
};

export const staffTokenUtils = {
  getToken: getStaffToken,
  setToken: setStaffToken,
  clearToken: clearStaffToken,
};

export default staffService;
