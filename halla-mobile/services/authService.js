import { API_BASE_URL, ENDPOINTS } from "../config/api";
import { fetchWithTimeout } from "./apiClient";

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

/**
 * L-3: dev-only logger. The auth-service log stream has historically
 * included PII (email, phone) so support engineers could trace flows.
 * In production builds (`__DEV__ === false`) we mute these to avoid
 * leaking PII into release-build crash reporters or device logs. Errors
 * still log so we don't lose visibility on real failures.
 *
 * Use `dlog(...)` for chatty info; keep `console.error(...)` for
 * exceptions because release builds need those.
 */
const dlog = (...args) => {
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
};

/**
 * Login with email and password (Vendors/Admins)
 * @param {Object} credentials - { email, password }
 * @returns {Promise<{token: string, user: Object}>}
 */
export const loginWithEmailAPI = async ({ email, password }) => {
  try {
    dlog("[AUTH SERVICE] Login attempt:", { email });
    dlog("[AUTH SERVICE] API URL:", `${API_BASE_URL}/login`);

    const response = await fetchWithTimeout(`${API_BASE_URL}${ENDPOINTS.AUTH.LOGIN}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    dlog("[AUTH SERVICE] Response status:", response.status);

    const data = await response.json();
    dlog("[AUTH SERVICE] Response data:", redactTokens(data));

    if (!response.ok) {
      throw new Error(data.message || "Login failed");
    }

    dlog("[AUTH SERVICE] Login successful:", data.user?.email);

    return {
      token: data.token,
      refreshToken: data.refreshToken,
      user: data.data?.user,
      subscription: data.data?.subscription,
    };
  } catch (error) {
    console.error("[AUTH SERVICE] Login error:", error.message);
    throw error;
  }
};

/**
 * Vendor signup with email and password
 * @param {Object} data - { email, password, brandName, ownerFullName, phoneNumber, serviceDescription, etc. }
 * @returns {Promise<{token: string, user: Object}>}
 */
export const signupVendorAPI = async (vendorData) => {
  try {
    dlog("[AUTH SERVICE] Vendor signup:", vendorData instanceof FormData ? "[FormData]" : vendorData.email);

    let formData;
    if (vendorData instanceof FormData) {
      formData = vendorData;
    } else {
      formData = new FormData();
      const { identity, serviceData, samplesAndPackages, commercialVerification, socialLinks } = vendorData;

      if (identity?.email) formData.append("email", identity.email);
      if (identity?.phoneNumber) formData.append("phoneNumber", identity.phoneNumber);
      if (identity?.password) formData.append("password", identity.password);
      if (identity?.brandName) formData.append("brandName", identity.brandName);
      if (identity?.ownerFullName) formData.append("ownerFullName", identity.ownerFullName);

      if (serviceData?.serviceDescription) formData.append("serviceDescription", serviceData.serviceDescription);
      if (serviceData?.serviceCategories) formData.append("serviceCategories", JSON.stringify(serviceData.serviceCategories));

      if (commercialVerification?.nationalId) formData.append("nationalId", commercialVerification.nationalId);
      if (commercialVerification?.nationalIdImage) formData.append("nationalIdImage", commercialVerification.nationalIdImage);
      if (commercialVerification?.commercialRecordImage) formData.append("commercialRecordImage", commercialVerification.commercialRecordImage);

      if (samplesAndPackages?.portfolioImages?.length) {
        samplesAndPackages.portfolioImages.forEach((img) => formData.append("portfolioImages", img));
      }
      if (samplesAndPackages?.pricePackages?.length) {
        formData.append("pricePackages", JSON.stringify(samplesAndPackages.pricePackages));
      }

      if (socialLinks) {
        formData.append("socialLinks", JSON.stringify(socialLinks));
      }
    }

    const response = await fetchWithTimeout(`${API_BASE_URL}${ENDPOINTS.AUTH.SIGNUP_VENDOR}`, {
      method: "POST",
      body: formData,
    });

    dlog("[AUTH SERVICE] Response status:", response.status);

    const data = await response.json();
    dlog("[AUTH SERVICE] Response data:", redactTokens(data));

    if (!response.ok) {
      throw new Error(data.message || "Vendor signup failed");
    }

    dlog("[AUTH SERVICE] Vendor signup successful");

    return {
      token: data.token,
      refreshToken: data.refreshToken,
      user: data.data?.user,
    };
  } catch (error) {
    console.error("[AUTH SERVICE] Vendor signup error:", error.message);
    throw error;
  }
};

/**
 * Whitelabel signup
 * @param {Object} data - whitelabel form data
 * @returns {Promise<{token: string, user: Object}>}
 */
export const signupWhitelabelAPI = async (whitelabelData) => {
  try {
    const { identity, loginData, systemRequirements, planSelection } = whitelabelData;
    dlog("[AUTH SERVICE] Whitelabel signup:", loginData?.email);

    const formData = new FormData();

    // Core user fields — FLAT at root level (backend reads req.body.email, req.body.phoneNumber)
    if (loginData?.email) formData.append("email", loginData.email);
    if (loginData?.phoneNumber) formData.append("phoneNumber", loginData.phoneNumber);

    // Identity fields — FLAT
    if (identity?.arabicName) formData.append("arabicName", identity.arabicName);
    if (identity?.englishName) {
      formData.append("englishName", identity.englishName);
      formData.append("platformName", identity.englishName);
    }
    if (identity?.companyName) formData.append("companyName", identity.companyName);
    if (identity?.licenseNumber) formData.append("licenseNumber", identity.licenseNumber);
    if (identity?.taxNumber) formData.append("taxNumber", identity.taxNumber);

    // Address — as JSON string (backend calls _parseJsonField on it)
    if (identity?.address) {
      formData.append("address", JSON.stringify(identity.address));
    }

    // Requirements — as JSON string
    const requirements = {
      numberOfEventsMonthly: parseInt(systemRequirements?.numberOfEventsMonthly) || 0,
      numberOfGuestsMonthly: parseInt(systemRequirements?.numberOfGuestsMonthly) || 0,
      eventTypes: systemRequirements?.eventTypes || [],
      eventsTypesOther: systemRequirements?.eventsTypesOther || "",
    };
    formData.append("requirements", JSON.stringify(requirements));

    // Plan selection — as JSON string
    formData.append("planSelection", JSON.stringify({
      planCode: planSelection?.planCode || "pro",
      billingCycle: planSelection?.billingCycle || "yearly",
      needsCustomBranding: planSelection?.needsCustomBranding || false,
    }));

    const response = await fetchWithTimeout(`${API_BASE_URL}${ENDPOINTS.AUTH.SIGNUP_WHITELABEL}`, {
      method: "POST",
      body: formData,
    });

    dlog("[AUTH SERVICE] Response status:", response.status);

    const data = await response.json();
    dlog("[AUTH SERVICE] Response data:", redactTokens(data));

    if (!response.ok) {
      throw new Error(data.message || "Whitelabel signup failed");
    }

    dlog("[AUTH SERVICE] Whitelabel signup successful");

    return {
      token: data.token,
      refreshToken: data.refreshToken,
      user: data.data?.user,
    };
  } catch (error) {
    console.error("[AUTH SERVICE] Whitelabel signup error:", error.message);
    throw error;
  }
};

/**
 * Send OTP to mobile number
 * @param {Object} data - { mobile, type }
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const sendOTPAPI = async ({ mobile, type = "login" }) => {
  try {
    dlog("[AUTH SERVICE] Sending OTP to:", mobile, "Type:", type);

    const endpoint = type === "signup" ? ENDPOINTS.AUTH.OTP_SEND_SIGNUP : ENDPOINTS.AUTH.OTP_SEND_LOGIN;
    const response = await fetchWithTimeout(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber: mobile }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to send OTP");
    }

    dlog("[AUTH SERVICE] OTP sent successfully to:", mobile);

    return {
      success: true,
      message: data.message || "OTP sent successfully",
    };
  } catch (error) {
    console.error("[AUTH SERVICE] Send OTP error:", error);
    throw error;
  }
};

/**
 * Verify OTP code for login
 * @param {Object} data - { mobile, otp }
 * @returns {Promise<{token: string, user: Object}>}
 */
export const verifyOTPAPI = async ({ mobile, otp }) => {
  try {
    console.log(
      "[AUTH SERVICE] Verifying OTP for login:",
      mobile,
      "Code:",
      otp,
    );

    const response = await fetchWithTimeout(`${API_BASE_URL}${ENDPOINTS.AUTH.OTP_VERIFY_LOGIN}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber: mobile, otp }),
    });

    dlog("[AUTH SERVICE] Response status:", response.status);

    const data = await response.json();
    dlog("[AUTH SERVICE] Response data:", redactTokens(data));

    if (!response.ok) {
      throw new Error(data.message || "Invalid OTP code");
    }

    console.log(
      "[AUTH SERVICE] OTP verified successfully:",
      data.user?.phoneNumber,
    );

    return {
      token: data.token,
      refreshToken: data.refreshToken,
      user: data.data?.user,
      subscription: data.data?.subscription,
      profileCompleted: data.data?.profileCompleted,
    };
  } catch (error) {
    console.error("[AUTH SERVICE] Verify OTP error:", error);
    throw error;
  }
};

/**
 * Step 1: Signup with phone number only (Host)
 * @param {Object} data - { mobile }
 * @returns {Promise<{token: string, user: Object}>}
 */
export const signupWithPhoneAPI = async ({ mobile }) => {
  try {
    dlog("[AUTH SERVICE] Signup with phone:", mobile);

    // First send OTP for signup
    await sendOTPAPI({ mobile, type: "signup" });

    dlog("[AUTH SERVICE] OTP sent for signup, waiting for verification");

    return {
      success: true,
      message: "OTP sent successfully",
    };
  } catch (error) {
    console.error("[AUTH SERVICE] Signup error:", error.message);
    throw error;
  }
};

/**
 * Verify OTP code for signup
 * @param {Object} data - { mobile, otp }
 * @returns {Promise<{token: string, user: Object}>}
 */
export const verifySignupOTPAPI = async ({ mobile, otp }) => {
  try {
    console.log(
      "[AUTH SERVICE] Verifying OTP for signup:",
      mobile,
      "Code:",
      otp,
    );

    const response = await fetchWithTimeout(`${API_BASE_URL}${ENDPOINTS.AUTH.OTP_VERIFY_SIGNUP}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber: mobile, otp }),
    });

    dlog("[AUTH SERVICE] Response status:", response.status);

    const data = await response.json();
    dlog("[AUTH SERVICE] Response data:", redactTokens(data));

    if (!response.ok) {
      throw new Error(data.message || "Invalid OTP code");
    }

    dlog("[AUTH SERVICE] Signup OTP verified successfully");

    return {
      token: data.token,
      refreshToken: data.refreshToken,
      user: data.data?.user,
      subscription: data.data?.subscription,
      profileCompleted: data.data?.profileCompleted,
    };
  } catch (error) {
    console.error("[AUTH SERVICE] Verify signup OTP error:", error);
    throw error;
  }
};

/**
 * Step 2: Complete profile with email, username, password
 * @param {Object} data - { username, email, password, token }
 * @returns {Promise<{token: string, user: Object}>}
 */
export const completeProfileAPI = async ({
  username,
  email,
  password,
  token,
}) => {
  try {
    dlog("[AUTH SERVICE] Complete profile:", { username, email });

    const response = await fetchWithTimeout(`${API_BASE_URL}${ENDPOINTS.AUTH.COMPLETE_PROFILE}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        username,
        email,
        password,
        passwordConfirm: password,
      }),
    });

    dlog("[AUTH SERVICE] Response status:", response.status);

    const data = await response.json();
    dlog("[AUTH SERVICE] Response data:", redactTokens(data));

    if (!response.ok) {
      throw new Error(data.message || "Failed to complete profile");
    }

    console.log(
      "[AUTH SERVICE] Profile completed successfully:",
      data.user?.email,
    );

    return {
      token: data.token,
      refreshToken: data.refreshToken,
      user: data.data?.user,
    };
  } catch (error) {
    console.error("[AUTH SERVICE] Complete profile error:", error.message);
    throw error;
  }
};

/**
 * Request password reset
 * @param {Object} data - { email }
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const forgotPasswordAPI = async ({ email }) => {
  try {
    dlog("[AUTH SERVICE] Forgot password request for:", email);

    const response = await fetchWithTimeout(`${API_BASE_URL}${ENDPOINTS.AUTH.FORGOT_PASSWORD}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to send reset email");
    }

    dlog("[AUTH SERVICE] Password reset email sent successfully");

    return {
      success: true,
      message: data.message || "Password reset email sent",
    };
  } catch (error) {
    console.error("[AUTH SERVICE] Forgot password error:", error.message);
    throw error;
  }
};

/**
 * Resend OTP to mobile number
 * @param {Object} data - { mobile, type }
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const resendOTPAPI = async ({ mobile, type = "login" }) => {
  try {
    dlog("[AUTH SERVICE] Resending OTP to:", mobile, "Type:", type);

    const response = await fetchWithTimeout(`${API_BASE_URL}${ENDPOINTS.AUTH.OTP_RESEND}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber: mobile, type }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to resend OTP");
    }

    dlog("[AUTH SERVICE] OTP resent successfully to:", mobile);

    return {
      success: true,
      message: data.message || "OTP resent successfully",
    };
  } catch (error) {
    console.error("[AUTH SERVICE] Resend OTP error:", error);
    throw error;
  }
};

/**
 * Logout — revoke the current refresh token on the backend.
 *
 * Phase 1a: best-effort. Local state must be cleared regardless of network
 * outcome, so this never throws.
 *
 * @param {Object} params
 * @param {string} [params.accessToken]
 * @param {string} [params.refreshToken]
 * @returns {Promise<void>}
 */
export const logoutAPI = async ({ accessToken, refreshToken } = {}) => {
  try {
    if (!refreshToken && !accessToken) return;
    await fetchWithTimeout(`${API_BASE_URL}${ENDPOINTS.AUTH.LOGOUT}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ refreshToken }),
    });
  } catch (error) {
    console.error("[AUTH SERVICE] Logout error:", error);
    // Don't throw — local state must clear regardless.
  }
};

/**
 * Rotate access + refresh tokens.
 *
 * Phase 1a (FLOW-01-F02): mobile sends the refresh token in the request body
 * because there is no cookie jar on React Native. The response carries a
 * fresh access token (mobile keeps it in-memory) and a fresh refresh token
 * (mobile writes it to expo-secure-store).
 *
 * @param {string} refreshToken - Current refresh token
 * @returns {Promise<{accessToken: string, refreshToken: string, user: Object}>}
 */
export const refreshTokenAPI = async (refreshToken) => {
  if (!refreshToken) {
    throw new Error("No refresh token available");
  }

  const response = await fetchWithTimeout(`${API_BASE_URL}${ENDPOINTS.AUTH.REFRESH}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Password reset failed");
  }

  return {
    accessToken: data.token,
    refreshToken: data.refreshToken,
    user: data.data?.user,
  };
};

/**
 * Reset password with a token from the forgot-password email.
 * Phase 1a (FLOW-06-F03).
 */
export const resetPasswordAPI = async ({ token, password, passwordConfirm }) => {
  const response = await fetchWithTimeout(`${API_BASE_URL}${ENDPOINTS.AUTH.RESET_PASSWORD(token)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password, passwordConfirm }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Password reset failed");
  }

  return {
    accessToken: data.token,
    refreshToken: data.refreshToken,
    user: data.data?.user,
  };
};

/**
 * Phase 4 W3-WL — set the initial password for a whitelabel admin (or
 * any user holding a one-time setup token) after they tap the email
 * link. Backend: POST /auth/setup-password.
 *
 * Returns the same token-pair shape as login so the auth store can
 * authenticate the user immediately.
 */
export const setupPasswordAPI = async ({ token, password, passwordConfirm }) => {
  if (!token || !password) {
    throw new Error("Token and password are required");
  }
  const response = await fetchWithTimeout(`${API_BASE_URL}${ENDPOINTS.AUTH.SETUP_PASSWORD}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password, passwordConfirm }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Password setup failed");
  }

  return {
    accessToken: data.token,
    refreshToken: data.refreshToken,
    user: data.data?.user,
  };
};
