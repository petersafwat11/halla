/**
 * settingsService — user-settings-screen-specific endpoints.
 *
 * Phase 8: profile / password endpoints delegated to
 * `userAccountService`. The settings screen also drives notification
 * preferences and email verification, which stay here because vendor
 * code never touches them.
 */
import { ENDPOINTS } from "../config/api";
import { apiFetch } from "./http";
import { userAccountService } from "./userAccountService";

const _request = async (path, init = {}, errorMessage) => {
  const response = await apiFetch(path, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || errorMessage);
  }
  return data;
};

export const getProfileAPI = () => userAccountService.getProfile();

export const updateProfileAPI = (data) => userAccountService.updateProfile(data);

export const uploadProfileImageAPI = (imageFile) => {
  const formData = new FormData();
  formData.append("avatar", imageFile);
  return userAccountService.updateProfileWithFiles(formData);
};

export const changePasswordAPI = ({ currentPassword, newPassword, passwordConfirm }) =>
  userAccountService.updatePassword({ currentPassword, newPassword, passwordConfirm });

export const deleteAccountAPI = () => userAccountService.deleteAccount();

export const updateAccountAPI = (data) => userAccountService.updateProfile(data);

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
