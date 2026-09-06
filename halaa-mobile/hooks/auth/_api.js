/**
 * Auth API helpers. Lives inside `hooks/auth/` because the auth store +
 * auth mutation hooks are the only consumers — there's no domain-service
 * indirection to keep around.
 *
 * Uses the throwing helpers in `services/authErrors.js` (`postJson`,
 * `postForm`, `patchJson`, `requestJson`) because those wrap
 * `fetchWithTimeout` with the canonical ApiError shape that the auth
 * error UI is wired to. Login / OTP / refresh / logout deliberately
 * bypass `apiFetch` — they own the token lifecycle themselves and must
 * not trigger the 401 refresh path.
 */

import { API_BASE_URL, ENDPOINTS } from "../../config/api";
import { apiErrorFromResponse, patchJson, postForm, postJson } from "../../services/authErrors";
import { apiFetch, fetchWithTimeout } from "../../services/http";
import { dlog } from "../../utils/log";

/**
 * Strip token + refreshToken before logging an auth response. Keeping the
 * raw values in the React Native log stream would leak credentials to
 * Metro / device logs.
 */
const redactTokens = (data) => {
  if (!data || typeof data !== "object") return data;
  const out = { ...data };
  if (out.token) out.token = "[REDACTED]";
  if (out.refreshToken) out.refreshToken = "[REDACTED]";
  return out;
};

export const loginWithEmail = async ({ email, password }) => {
  dlog("[AUTH] Login attempt:", { email });
  const data = await postJson(ENDPOINTS.AUTH.LOGIN, { email, password });
  dlog("[AUTH] Response data:", redactTokens(data));
  return {
    token: data.token,
    refreshToken: data.refreshToken,
    user: data.data?.user,
    subscription: data.data?.subscription,
  };
};

import { normalizeRNFile } from "../../utils/fileUtils";
import { buildVendorFormData } from "../../utils/vendorSignupSerializer";

export { normalizeRNFile };

export const _buildVendorFormData = buildVendorFormData;

export const signupVendor = async (vendorData) => {
  dlog(
    "[AUTH] Vendor signup:",
    vendorData instanceof FormData ? "[FormData]" : vendorData.identity?.email,
  );
  const formData = _buildVendorFormData(vendorData);
  const data = await postForm(ENDPOINTS.AUTH.SIGNUP_VENDOR, formData);
  return {
    token: data.token || null,
    refreshToken: data.refreshToken || null,
    user: data.data?.user,
    applicationId: data.data?.applicationId || data.applicationId || data.data?.user?._id,
    status: data.data?.status || data.status || "pending",
    pendingApproval: true,
  };
};

export const sendOTP = async ({ mobile, type = "login" }) => {
  const endpoint =
    type === "signup" ? ENDPOINTS.AUTH.OTP_SEND_SIGNUP : ENDPOINTS.AUTH.OTP_SEND_LOGIN;
  const data = await postJson(endpoint, { phoneNumber: mobile });
  return { success: true, message: data.message || "OTP sent successfully" };
};

export const verifyOTP = async ({ mobile, otp }) => {
  const data = await postJson(ENDPOINTS.AUTH.OTP_VERIFY_LOGIN, {
    phoneNumber: mobile,
    otp,
  });
  return {
    token: data.token,
    refreshToken: data.refreshToken,
    user: data.data?.user,
    subscription: data.data?.subscription,
    profileCompleted: data.data?.profileCompleted,
  };
};

export const signupWithPhone = async ({ mobile }) => {
  await sendOTP({ mobile, type: "signup" });
  return { success: true, message: "OTP sent successfully" };
};

export const verifySignupOTP = async ({ mobile, otp }) => {
  const data = await postJson(ENDPOINTS.AUTH.OTP_VERIFY_SIGNUP, {
    phoneNumber: mobile,
    otp,
  });
  return {
    token: data.token,
    refreshToken: data.refreshToken,
    user: data.data?.user,
    subscription: data.data?.subscription,
    profileCompleted: data.data?.profileCompleted,
  };
};

export const completeProfile = async ({ name, email, password, token }) => {
  const body = {
    name,
    email,
    password,
    passwordConfirm: password,
  };
  const res = await apiFetch(ENDPOINTS.AUTH.COMPLETE_PROFILE, {
    method: "PATCH",
    body,
    ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw apiErrorFromResponse({ status: res.status, data: data || {} });
  }
  return {
    token: data.token,
    refreshToken: data.refreshToken,
    user: data.data?.user,
  };
};

export const forgotPassword = async ({ email }) => {
  const data = await postJson(ENDPOINTS.AUTH.FORGOT_PASSWORD, { email });
  return { success: true, message: data.message || "Password reset email sent" };
};

export const resendOTP = async ({ mobile, type = "login" }) => {
  const data = await postJson(ENDPOINTS.AUTH.OTP_RESEND, {
    phoneNumber: mobile,
    type,
  });
  return {
    success: true,
    message: data.message || "OTP resent successfully",
    // Surface the server's expiry + cooldown so the UI timer matches
    // exactly what the backend enforces — hardcoding e.g. 90s lets users
    // tap "Resend" before the server-side cooldown has reset.
    expiresIn: data.data?.expiresIn ?? null,
    cooldownSeconds: data.data?.cooldownSeconds ?? null,
  };
};

/**
 * Logout — revoke the current refresh token on the backend. Best-effort:
 * local state must be cleared regardless of network outcome, so this
 * never throws.
 */
export const logout = async ({ accessToken, refreshToken } = {}) => {
  try {
    if (!refreshToken && !accessToken) return;
    await fetchWithTimeout(`${API_BASE_URL}${ENDPOINTS.AUTH.LOGOUT}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Client": "mobile",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ refreshToken }),
    });
  } catch (error) {
    console.error("[AUTH] Logout error:", error);
    // Don't throw — local state must clear regardless.
  }
};

/**
 * Rotate access + refresh tokens. Mobile sends the refresh token in the
 * request body because there is no cookie jar on React Native.
 */
export const refreshTokens = async (refreshToken) => {
  if (!refreshToken) throw new Error("No refresh token available");
  const data = await postJson(ENDPOINTS.AUTH.REFRESH, { refreshToken });
  return {
    accessToken: data.token,
    refreshToken: data.refreshToken,
    user: data.data?.user,
  };
};

export const resetPassword = async ({ token, password, passwordConfirm }) => {
  const data = await patchJson(ENDPOINTS.AUTH.RESET_PASSWORD(token), {
    password,
    passwordConfirm,
  });
  return {
    accessToken: data.token,
    refreshToken: data.refreshToken,
    user: data.data?.user,
  };
};
