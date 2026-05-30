/**
 * userAccountService — single source of truth for the /users/profile +
 * /users/password endpoint family on mobile.
 *
 * Before Phase 8 both `vendorService` and `settingsService` reimplemented
 * the same six request bodies (`GET /users/profile`, `PATCH
 * /users/profile`, `PATCH /users/profile/:section`, `PATCH
 * /users/password`, `POST /users/phone/send-otp`, `PATCH /users/phone`).
 * They now delegate here so the endpoint shape lives in one place.
 *
 * Web has the same surface but already collapsed into
 * `labbe/hooks/users/mutations.js#useUserMutation`, so no parallel
 * extraction is needed on that side.
 */
import { ENDPOINTS } from "../config/api";
import { apiFetch } from "./http";

const _request = async (path, init = {}, errorMessage) => {
  const response = await apiFetch(path, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || errorMessage);
  }
  return data;
};

export const userAccountService = {
  getProfile: () =>
    _request(ENDPOINTS.USERS.PROFILE, { method: "GET" }, "Failed to get profile"),

  updateProfile: (data) =>
    _request(
      ENDPOINTS.USERS.UPDATE_PROFILE,
      { method: "PATCH", body: data },
      "Failed to update profile"
    ),

  updateProfileWithFiles: (formData) =>
    _request(
      ENDPOINTS.USERS.UPDATE_PROFILE,
      { method: "PATCH", body: formData, timeoutMs: 60 * 1000 },
      "Failed to update profile"
    ),

  updateProfileSection: (section, data) =>
    _request(
      ENDPOINTS.USERS.UPDATE_PROFILE_SECTION(section),
      { method: "PATCH", body: data },
      "Failed to update profile section"
    ),

  updateProfileSectionWithFiles: (section, formData) =>
    _request(
      ENDPOINTS.USERS.UPDATE_PROFILE_SECTION(section),
      { method: "PATCH", body: formData, timeoutMs: 60 * 1000 },
      "Failed to update profile section"
    ),

  updatePassword: (data) =>
    _request(
      ENDPOINTS.USERS.UPDATE_PASSWORD,
      { method: "PATCH", body: data },
      "Failed to update password"
    ),

  deleteAccount: () =>
    _request(ENDPOINTS.USERS.PROFILE, { method: "DELETE" }, "Failed to delete account"),

  sendPhoneChangeOtp: (phoneNumber) =>
    _request(
      ENDPOINTS.USERS.SEND_PHONE_CHANGE_OTP,
      { method: "POST", body: { phoneNumber } },
      "Failed to send verification code"
    ),

  updatePhone: (phoneNumber, otp) =>
    _request(
      ENDPOINTS.USERS.UPDATE_PHONE,
      { method: "PATCH", body: { phoneNumber, otp } },
      "Failed to update phone number"
    ),

  deleteVendorImage: (field, key) =>
    _request(
      ENDPOINTS.USERS.DELETE_VENDOR_IMAGE,
      { method: "DELETE", body: { field, key } },
      "Failed to delete image"
    ),
};

export default userAccountService;
