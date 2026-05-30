/**
 * User-account API helpers. Replaces the prior services/userAccountService.js +
 * services/settingsService.js indirection. Exposed so the vendor hook layer
 * and the settings UI can share the same request shapes.
 */
import { ENDPOINTS } from "../../config/api";
import { apiFetch } from "../../services/http";

const _request = async (path, init = {}, errorMessage) => {
  const response = await apiFetch(path, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || errorMessage);
  }
  return data;
};

export const usersApi = {
  getProfile: () =>
    _request(ENDPOINTS.USERS.PROFILE, { method: "GET" }, "Failed to get profile"),

  updateProfile: (data) =>
    _request(
      ENDPOINTS.USERS.UPDATE_PROFILE,
      { method: "PATCH", body: data },
      "Failed to update profile",
    ),

  updateProfileWithFiles: (formData) =>
    _request(
      ENDPOINTS.USERS.UPDATE_PROFILE,
      { method: "PATCH", body: formData, timeoutMs: 60 * 1000 },
      "Failed to update profile",
    ),

  updateProfileSection: (section, data) =>
    _request(
      ENDPOINTS.USERS.UPDATE_PROFILE_SECTION(section),
      { method: "PATCH", body: data },
      "Failed to update profile section",
    ),

  updateProfileSectionWithFiles: (section, formData) =>
    _request(
      ENDPOINTS.USERS.UPDATE_PROFILE_SECTION(section),
      { method: "PATCH", body: formData, timeoutMs: 60 * 1000 },
      "Failed to update profile section",
    ),

  updatePassword: (data) =>
    _request(
      ENDPOINTS.USERS.UPDATE_PASSWORD,
      { method: "PATCH", body: data },
      "Failed to update password",
    ),

  deleteAccount: () =>
    _request(ENDPOINTS.USERS.PROFILE, { method: "DELETE" }, "Failed to delete account"),

  sendPhoneChangeOtp: (phoneNumber) =>
    _request(
      ENDPOINTS.USERS.SEND_PHONE_CHANGE_OTP,
      { method: "POST", body: { phoneNumber } },
      "Failed to send verification code",
    ),

  updatePhone: (phoneNumber, otp) =>
    _request(
      ENDPOINTS.USERS.UPDATE_PHONE,
      { method: "PATCH", body: { phoneNumber, otp } },
      "Failed to update phone number",
    ),

  deleteVendorImage: (field, key) =>
    _request(
      ENDPOINTS.USERS.DELETE_VENDOR_IMAGE,
      { method: "DELETE", body: { field, key } },
      "Failed to delete image",
    ),
};

/**
 * Settings-specific endpoints (notification preferences, email
 * verification) live alongside the user-account surface because they
 * share the /users mount + the same auth path.
 */
export const settingsApi = {
  getNotificationPreferences: () =>
    _request(
      ENDPOINTS.USERS.NOTIFICATION_SETTINGS,
      { method: "GET" },
      "Failed to get notification preferences",
    ),

  updateNotificationPreferences: (data) =>
    _request(
      ENDPOINTS.USERS.NOTIFICATION_SETTINGS,
      { method: "PATCH", body: data },
      "Failed to update notification preferences",
    ),

  uploadProfileImage: (imageFile) => {
    const formData = new FormData();
    formData.append("avatar", imageFile);
    return usersApi.updateProfileWithFiles(formData);
  },

  sendEmailVerificationCode: () =>
    _request(
      ENDPOINTS.AUTH.SEND_VERIFICATION_CODE,
      { method: "POST" },
      "Failed to send verification code",
    ),

  verifyEmail: (code) =>
    _request(
      ENDPOINTS.AUTH.VERIFY_EMAIL,
      { method: "POST", body: { code } },
      "Failed to verify email",
    ),
};
