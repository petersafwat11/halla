/**
 * Staff Service (Mobile)
 * API calls for the staff portal — guest check-in and event stats.
 * Uses AsyncStorage for session token (no cookies on mobile).
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL, ENDPOINTS } from "../config/api";
import { fetchWithTimeout } from "./apiClient";

const STAFF_TOKEN_KEY = "staffSessionToken";

// ============================================================
// TOKEN UTILITIES
// ============================================================

export const getStaffToken = async () => {
  try {
    return await AsyncStorage.getItem(STAFF_TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setStaffToken = async (token) => {
  try {
    await AsyncStorage.setItem(STAFF_TOKEN_KEY, token);
  } catch (err) {
    console.error("[StaffService] Failed to save token:", err);
  }
};

export const clearStaffToken = async () => {
  try {
    await AsyncStorage.removeItem(STAFF_TOKEN_KEY);
  } catch (err) {
    console.error("[StaffService] Failed to clear token:", err);
  }
};

// ============================================================
// INTERNAL FETCH HELPER
// ============================================================

/**
 * Authenticated fetch using the staff session JWT (not the user's
 * Bearer token).
 *
 * Phase 4 W0-AUTH: routes through `fetchWithTimeout` so staff requests
 * inherit the 30 s default timeout. Does NOT use `apiFetch` because the
 * staff session token must NOT trigger the user-token refresh path on
 * 401 — a 401 here means the staff session expired and the operator
 * needs to re-verify.
 */
const staffFetch = async (path, options = {}) => {
  const token = await getStaffToken();
  const url = `${API_BASE_URL}${path}`;

  const response = await fetchWithTimeout(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `Request failed (${response.status})`);
  }

  return data;
};

// ============================================================
// VERIFICATION
// ============================================================

/**
 * Verify staff access by phone + eventId.
 * Stores the returned sessionToken in AsyncStorage.
 * @param {string} phone
 * @param {string} eventId
 * @returns {Promise<{ staff, event, sessionToken }>}
 */
export const verifyByPhone = async (phone, eventId) => {
  const url = `${API_BASE_URL}${ENDPOINTS.STAFF.VERIFY}?phone=${encodeURIComponent(phone)}&eventId=${encodeURIComponent(eventId)}`;

  const response = await fetchWithTimeout(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Verification failed");
  }

  if (data?.data?.sessionToken) {
    await setStaffToken(data.data.sessionToken);
  }

  return data?.data;
};

/**
 * Verify staff access by token (from deep link / QR).
 * @param {string} token
 */
export const verifyByToken = async (token) => {
  const url = `${API_BASE_URL}${ENDPOINTS.STAFF.VERIFY}?token=${encodeURIComponent(token)}`;

  const response = await fetchWithTimeout(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Verification failed");
  }

  if (data?.data?.sessionToken) {
    await setStaffToken(data.data.sessionToken);
  }

  return data?.data;
};

// ============================================================
// GUEST MANAGEMENT
// ============================================================

/**
 * Get paginated guest list for an event.
 * @param {string} eventId
 * @param {{ search?: string, status?: string, page?: number, limit?: number }} options
 */
export const getEventGuests = async (eventId, options = {}) => {
  const params = new URLSearchParams();
  if (options.search) params.set("search", options.search);
  if (options.status) params.set("status", options.status);
  if (options.page) params.set("page", String(options.page));
  if (options.limit) params.set("limit", String(options.limit));

  const query = params.toString() ? `?${params.toString()}` : "";
  const data = await staffFetch(`${ENDPOINTS.STAFF.EVENT_GUESTS(eventId)}${query}`);

  return data?.data || { guests: [], stats: {}, pagination: {} };
};

/**
 * Check in a guest by guest ID (after tapping from the list).
 * @param {string} eventId
 * @param {string} guestId
 */
export const checkInById = async (eventId, guestId) => {
  const data = await staffFetch(ENDPOINTS.STAFF.CHECK_IN(eventId), {
    method: "POST",
    body: JSON.stringify({ guestId }),
  });
  return data?.data;
};

/**
 * Check in a guest by QR code string.
 * @param {string} eventId
 * @param {string} qrCode
 */
export const checkInByQR = async (eventId, qrCode) => {
  const data = await staffFetch(ENDPOINTS.STAFF.CHECK_IN(eventId), {
    method: "POST",
    body: JSON.stringify({ qrCode }),
  });
  return data?.data;
};

/**
 * Check in a guest by phone number.
 * @param {string} eventId
 * @param {string} phone
 */
export const checkInByPhone = async (eventId, phone) => {
  const data = await staffFetch(ENDPOINTS.STAFF.CHECK_IN(eventId), {
    method: "POST",
    body: JSON.stringify({ phone }),
  });
  return data?.data;
};

// ============================================================
// STATISTICS
// ============================================================

/**
 * Get real-time event stats (total, confirmed, checkedIn, declined, pending).
 * @param {string} eventId
 */
export const getEventStats = async (eventId) => {
  const data = await staffFetch(ENDPOINTS.STAFF.EVENT_STATS(eventId));
  return data?.data?.stats || {};
};
