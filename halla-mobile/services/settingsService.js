/**
 * Settings service.
 *
 * Phase 4 W0-AUTH: routed through `apiFetch` so the centralized
 * interceptor handles `Authorization` attachment, 401 → refresh, and the
 * 30 s default timeout. Legacy callers that still pass a `token`
 * argument continue to work — the argument is ignored because the
 * wrapper reads the in-memory access token directly.
 */

import { ENDPOINTS } from "../config/api";
import { apiFetch } from "./apiClient";

const _request = async (path, init = {}, errorMessage) => {
  const response = await apiFetch(path, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || errorMessage);
  }
  return data;
};

/**
 * Get user profile.
 * @param {string} [_legacyToken] - ignored; kept for caller compatibility
 */
export const getProfileAPI = async (_legacyToken) =>
  _request(ENDPOINTS.USERS.PROFILE, { method: "GET" }, "Failed to get profile");

/**
 * Update user profile.
 */
export const updateProfileAPI = async (data, _legacyToken) =>
  _request(
    ENDPOINTS.USERS.UPDATE_PROFILE,
    { method: "PATCH", body: data },
    "Failed to update profile"
  );

/**
 * Upload profile image (multipart). Goes through `apiFetch` so we still
 * inherit the timeout — note the wrapper does not retry FormData on 401.
 */
export const uploadProfileImageAPI = async (imageFile, _legacyToken) => {
  const formData = new FormData();
  formData.append("avatar", imageFile);
  return _request(
    ENDPOINTS.USERS.UPDATE_PROFILE,
    { method: "PATCH", body: formData, timeoutMs: 60 * 1000 },
    "Failed to upload profile image"
  );
};

/**
 * Change password.
 */
export const changePasswordAPI = async (passwordData, token) => {
  let currentPassword;
  let newPassword;
  if (typeof passwordData === "object") {
    currentPassword = passwordData.oldPassword || passwordData.currentPassword;
    newPassword = passwordData.newPassword;
  } else {
    currentPassword = passwordData;
    newPassword = token;
  }

  return _request(
    ENDPOINTS.AUTH.UPDATE_PASSWORD,
    {
      method: "PATCH",
      body: { currentPassword, newPassword, passwordConfirm: newPassword },
    },
    "Failed to change password"
  );
};

export const deleteAccountAPI = async (_legacyToken) =>
  _request(ENDPOINTS.USERS.PROFILE, { method: "DELETE" }, "Failed to delete account");

export const updateAccountAPI = async (data, _legacyToken) =>
  _request(
    ENDPOINTS.USERS.UPDATE_PROFILE,
    { method: "PATCH", body: data },
    "Failed to update account"
  );

export const getNotificationPreferencesAPI = async (_legacyToken) =>
  _request(
    ENDPOINTS.USERS.NOTIFICATION_SETTINGS,
    { method: "GET" },
    "Failed to get notification preferences"
  );

export const updateNotificationPreferencesAPI = async (data, _legacyToken) =>
  _request(
    ENDPOINTS.USERS.NOTIFICATION_SETTINGS,
    { method: "PATCH", body: data },
    "Failed to update notification preferences"
  );

export const sendEmailVerificationCodeAPI = async (_legacyToken) =>
  _request(
    ENDPOINTS.AUTH.SEND_VERIFICATION_CODE,
    { method: "POST" },
    "Failed to send verification code"
  );

export const verifyEmailAPI = async (code, _legacyToken) =>
  _request(
    ENDPOINTS.AUTH.VERIFY_EMAIL,
    { method: "POST", body: { code } },
    "Failed to verify email"
  );
