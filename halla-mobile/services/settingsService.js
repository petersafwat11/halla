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

export const getProfileAPI = () =>
  _request(ENDPOINTS.USERS.PROFILE, { method: "GET" }, "Failed to get profile");

export const updateProfileAPI = (data) =>
  _request(
    ENDPOINTS.USERS.UPDATE_PROFILE,
    { method: "PATCH", body: data },
    "Failed to update profile"
  );

export const uploadProfileImageAPI = (imageFile) => {
  const formData = new FormData();
  formData.append("avatar", imageFile);
  return _request(
    ENDPOINTS.USERS.UPDATE_PROFILE,
    { method: "PATCH", body: formData, timeoutMs: 60 * 1000 },
    "Failed to upload profile image"
  );
};

export const changePasswordAPI = ({ currentPassword, newPassword, passwordConfirm }) =>
  _request(
    ENDPOINTS.USERS.UPDATE_PASSWORD,
    {
      method: "PATCH",
      body: { currentPassword, newPassword, passwordConfirm },
    },
    "Failed to change password"
  );

export const deleteAccountAPI = () =>
  _request(ENDPOINTS.USERS.PROFILE, { method: "DELETE" }, "Failed to delete account");

export const updateAccountAPI = (data) =>
  _request(
    ENDPOINTS.USERS.UPDATE_PROFILE,
    { method: "PATCH", body: data },
    "Failed to update account"
  );

export const getNotificationPreferencesAPI = () =>
  _request(
    ENDPOINTS.USERS.NOTIFICATION_SETTINGS,
    { method: "GET" },
    "Failed to get notification preferences"
  );

export const updateNotificationPreferencesAPI = (data) =>
  _request(
    ENDPOINTS.USERS.NOTIFICATION_SETTINGS,
    { method: "PATCH", body: data },
    "Failed to update notification preferences"
  );

export const sendEmailVerificationCodeAPI = () =>
  _request(
    ENDPOINTS.AUTH.SEND_VERIFICATION_CODE,
    { method: "POST" },
    "Failed to send verification code"
  );

export const verifyEmailAPI = (code) =>
  _request(
    ENDPOINTS.AUTH.VERIFY_EMAIL,
    { method: "POST", body: { code } },
    "Failed to verify email"
  );
