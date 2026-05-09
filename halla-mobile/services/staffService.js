/**
 * Staff Service (Mobile)
 *
 * The staff session JWT lives in expo-secure-store (mobile equivalent of
 * an HttpOnly cookie). We use a separate `staffFetch` rather than the
 * shared `apiFetch` because the staff session token must NOT trigger the
 * user-token refresh path on 401 — a 401 here means the staff session
 * expired and the operator needs to re-verify.
 */

import { API_BASE_URL, ENDPOINTS } from "../config/api";
import { fetchWithTimeout } from "./apiClient";
import {
  saveStaffToken as secureSaveStaffToken,
  loadStaffToken as secureLoadStaffToken,
  clearStaffToken as secureClearStaffToken,
} from "./secureStorage";

// ============================================================
// TOKEN UTILITIES
// ============================================================

export const getStaffToken = async () => {
  try {
    return await secureLoadStaffToken();
  } catch {
    return null;
  }
};

export const setStaffToken = async (token) => {
  await secureSaveStaffToken(token);
};

export const clearStaffToken = async () => {
  await secureClearStaffToken();
};

// ============================================================
// INTERNAL FETCH HELPER
// ============================================================

const buildVerifyError = (response, data) => {
  const err = new Error(data?.message || `Request failed (${response.status})`);
  err.status = response.status;
  err.reason = data?.reason || null;
  return err;
};

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
    throw buildVerifyError(response, data);
  }

  return data;
};

// ============================================================
// VERIFICATION
// ============================================================

export const verifyByPhone = async (phone, eventId) => {
  const url = `${API_BASE_URL}${ENDPOINTS.STAFF.VERIFY}?phone=${encodeURIComponent(
    phone
  )}&eventId=${encodeURIComponent(eventId)}`;

  const response = await fetchWithTimeout(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw buildVerifyError(response, data);
  }

  if (data?.data?.sessionToken) {
    await setStaffToken(data.data.sessionToken);
  }

  return data?.data;
};

export const verifyByToken = async (token) => {
  const url = `${API_BASE_URL}${ENDPOINTS.STAFF.VERIFY}?token=${encodeURIComponent(
    token
  )}`;

  const response = await fetchWithTimeout(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw buildVerifyError(response, data);
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
 * @param {{search?: string, status?: string, page?: number, limit?: number}} options
 */
export const getEventGuests = async (eventId, options = {}) => {
  const params = new URLSearchParams();
  if (options.search) params.set("search", options.search);
  if (options.status) params.set("status", options.status);
  if (options.page) params.set("page", String(options.page));
  if (options.limit) params.set("limit", String(options.limit));

  const query = params.toString() ? `?${params.toString()}` : "";
  const data = await staffFetch(
    `${ENDPOINTS.STAFF.EVENT_GUESTS(eventId)}${query}`
  );

  return data?.data || { guests: [], stats: {}, pagination: {} };
};

export const checkInById = async (eventId, guestId) => {
  const data = await staffFetch(ENDPOINTS.STAFF.CHECK_IN(eventId), {
    method: "POST",
    body: JSON.stringify({ guestId }),
  });
  return data?.data;
};

export const checkInByQR = async (eventId, qrCode) => {
  const data = await staffFetch(ENDPOINTS.STAFF.CHECK_IN(eventId), {
    method: "POST",
    body: JSON.stringify({ qrCode }),
  });
  return data?.data;
};

export const checkInByPhone = async (eventId, phone) => {
  const data = await staffFetch(ENDPOINTS.STAFF.CHECK_IN(eventId), {
    method: "POST",
    body: JSON.stringify({ phone }),
  });
  return data?.data;
};
