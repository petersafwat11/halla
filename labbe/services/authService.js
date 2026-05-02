/**
 * Authentication Service
 * Client-side authentication API functions
 */

import { cookieUtils } from "@/utils/cookieUtils";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v2";

/**
 * Custom API Error class for better error handling
 */
class AuthAPIError extends Error {
  constructor(message, status, data = {}) {
    super(message);
    this.name = "AuthAPIError";
    this.status = status;
    this.data = data;
  }
}

/**
 * Extract user-friendly error message from API response
 */
// Extract user-friendly error message from API response
const extractErrorMessage = (errorData, status) => {
  const message = errorData?.message || "";

  // Handle MongoDB duplicate key errors (E11000)
  if (message.includes("E11000") || message.includes("duplicate key")) {
    if (message.includes("email") || (errorData.keyPattern && errorData.keyPattern.email)) {
      return "This email address is already registered. Please use a different email or login to your existing account.";
    }
    if (
      message.includes("phoneNumber") || 
      message.includes("mobile") || 
      (errorData.keyPattern && (errorData.keyPattern.phoneNumber || errorData.keyPattern.mobile))
    ) {
      return "This mobile number is already registered. Please use a different number or login to your existing account.";
    }
    if (message.includes("username") || (errorData.keyPattern && errorData.keyPattern.username)) {
      return "This username is already taken. Please choose a different one.";
    }
    return "This information is already registered in our system.";
  }

  // Handle duplicate errors (409 Conflict)
  if (status === 409) {
    if (errorData.field === "email") {
      return "This email address is already registered. Please use a different email or login to your existing account.";
    }
    if (errorData.field === "mobile" || errorData.field === "phoneNumber") {
      return "This mobile number is already registered. Please use a different number or login to your existing account.";
    }
    return (
      errorData.message ||
      "This information is already registered in our system."
    );
  }

  // Handle package limit errors (403 Forbidden)
  if (status === 403) {
    if (errorData.code === "PACKAGE_LIMIT_EXCEEDED") {
      return (
        errorData.message ||
        "You have reached your package limit. Please upgrade your plan to continue."
      );
    }
    return (
      errorData.message || "You don't have permission to perform this action."
    );
  }

  // Handle validation errors (400 Bad Request)
  if (status === 400) {
    return (
      errorData.message ||
      "Invalid input. Please check your information and try again."
    );
  }

  // Handle authentication errors (401 Unauthorized)
  if (status === 401) {
    return errorData.message || "Authentication failed. Please login again.";
  }

  // Default error message
  return errorData.message || "An unexpected error occurred. Please try again.";
};

/**
 * Generic API request function with enhanced error handling
 */
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;

  const defaultOptions = {
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
    },
    credentials: "include",
  };

  const requestOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, requestOptions);

    if (!response.ok) {
      let errorData = {};
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { message: response.statusText };
      }

      const userMessage = extractErrorMessage(errorData, response.status);
      const error = new AuthAPIError(userMessage, response.status, errorData);
      throw error;
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return await response.json();
    } else {
      return { success: true, message: "Request completed successfully" };
    }
  } catch (error) {
    console.error("API Request Error:", error);
    // Re-throw AuthAPIError as-is, wrap other errors
    if (error instanceof AuthAPIError) {
      throw error;
    }
    throw new AuthAPIError(
      error.message || "Network error. Please check your connection.",
      0,
      {},
    );
  }
};

/**
 * Authentication API functions
 */
export const authAPI = {
  // Host Initial Signup
  signupHost: async (phoneNumber) => {
    // Host signup now uses OTP flow
    return apiRequest("/auth/otp/send-signup", {
      method: "POST",
      body: JSON.stringify({ phoneNumber }),
    });
  },

  // Complete Host Profile
  completeHostProfile: async (profileData, token) => {
    return apiRequest("/auth/complete-profile", {
      method: "PATCH",
      body: JSON.stringify(profileData),
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  // Vendor Signup with File Upload
  signupVendor: async (formData, uploadedFiles) => {
    const uploadData = new FormData();

    if (uploadedFiles) {
      if (uploadedFiles.portfolioImages?.length > 0) {
        uploadedFiles.portfolioImages.forEach((file) => {
          uploadData.append("portfolioImages", file);
        });
      }
      if (uploadedFiles.businessLogo) {
        uploadData.append("businessLogo", uploadedFiles.businessLogo);
      }
      if (uploadedFiles.pricePackages?.length > 0) {
        uploadedFiles.pricePackages.forEach((file) => {
          uploadData.append("pricePackages", file);
        });
      }
      if (uploadedFiles.commercialRecord) {
        uploadData.append("commercialRecord", uploadedFiles.commercialRecord);
      }
      if (uploadedFiles.profileFile) {
        uploadData.append("profileFile", uploadedFiles.profileFile);
      }
    }

    uploadData.append("identity", JSON.stringify(formData.identity));
    uploadData.append("serviceData", JSON.stringify(formData.serviceData));
    uploadData.append(
      "samplesAndPackages",
      JSON.stringify(formData.samplesAndPackages),
    );
    uploadData.append(
      "commercialVerification",
      JSON.stringify(formData.commercialVerification),
    );
    uploadData.append(
      "otherLinksAndData",
      JSON.stringify(formData.otherLinksAndData),
    );

    return apiRequest("/auth/signup/vendor", {
      method: "POST",
      body: uploadData,
    });
  },

  // WhiteLabel Signup with File Upload
  signupWhiteLabel: async (formData, logoFile) => {
    const uploadData = new FormData();

    if (logoFile) {
      uploadData.append("logo", logoFile);
    }

    uploadData.append("identity", JSON.stringify(formData.identity));
    uploadData.append("loginData", JSON.stringify(formData.loginData));
    uploadData.append(
      "systemRequirements",
      JSON.stringify(formData.systemRequirements),
    );
    if (formData.planSelection) {
      uploadData.append(
        "planSelection",
        JSON.stringify(formData.planSelection),
      );
    }

    return apiRequest("/auth/signup/whitelabel", {
      method: "POST",
      body: uploadData,
    });
  },

  // Login with Email/Password
  login: async (email, password) => {
    return apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  // Send Signup OTP
  sendSignupOTP: async (phoneNumber) => {
    return apiRequest("/auth/otp/send-signup", {
      method: "POST",
      body: JSON.stringify({ phoneNumber }),
    });
  },

  // Send Login OTP
  sendLoginOTP: async (phoneNumber) => {
    return apiRequest("/auth/otp/send-login", {
      method: "POST",
      body: JSON.stringify({ phoneNumber }),
    });
  },

  // Verify Signup OTP
  verifySignupOTP: async (phoneNumber, otp) => {
    return apiRequest("/auth/otp/verify-signup", {
      method: "POST",
      body: JSON.stringify({ phoneNumber, otp }),
    });
  },

  // Verify Login OTP
  verifyLoginOTP: async (phoneNumber, otp) => {
    return apiRequest("/auth/otp/verify-login", {
      method: "POST",
      body: JSON.stringify({ phoneNumber, otp }),
    });
  },

  // Resend OTP
  resendOTP: async (phoneNumber) => {
    return apiRequest("/auth/otp/resend", {
      method: "POST",
      body: JSON.stringify({ phoneNumber }),
    });
  },

  // Legacy OTP methods for backward compatibility
  // @deprecated Use sendSignupOTP or sendLoginOTP instead
  sendOTP: async (phoneNumber, type = "signup") => {
    const endpoint =
      type === "login" ? "/auth/otp/send-login" : "/auth/otp/send-signup";
    return apiRequest(endpoint, {
      method: "POST",
      body: JSON.stringify({ phoneNumber }),
    });
  },

  // @deprecated Use verifySignupOTP or verifyLoginOTP instead
  verifyOTP: async (phoneNumber, otp, type = "signup") => {
    const endpoint =
      type === "login" ? "/auth/otp/verify-login" : "/auth/otp/verify-signup";
    return apiRequest(endpoint, {
      method: "POST",
      body: JSON.stringify({ phoneNumber, otp }),
    });
  },

  // Logout
  logout: async () => {
    try {
      cookieUtils.clearAuthCookies();
      await apiRequest("/auth/logout", { method: "POST" });
      localStorage.removeItem("user");
      return { success: true };
    } catch (error) {
      console.error("Logout error:", error);
      cookieUtils.clearAuthCookies();
      localStorage.removeItem("user");
      throw error;
    }
  },

  // Forgot Password
  forgotPassword: async (email) => {
    return apiRequest("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  // Reset Password
  resetPassword: async (token, password, passwordConfirm) => {
    return apiRequest(`/auth/reset-password/${token}`, {
      method: "PATCH",
      body: JSON.stringify({ password, passwordConfirm }),
    });
  },

  // Update Account Settings for Host
  updateHostAccountSettings: async (data) => {
    const backendData = {
      username: data.username,
      email: data.email,
    };

    if (data.password && data.confirmPassword) {
      backendData.password = data.password;
      backendData.passwordConfirm = data.confirmPassword;
    }

    return apiRequest("/auth/update-me", {
      method: "PATCH",
      body: JSON.stringify(backendData),
    });
  },

  // Update Account Settings for Admin
  updateAdminAccountSettings: async (data) => {
    const backendData = {
      username: data.username,
      email: data.email,
    };

    if (data.password && data.confirmPassword) {
      backendData.password = data.password;
      backendData.passwordConfirm = data.confirmPassword;
    }

    return apiRequest("/auth/update-me", {
      method: "PATCH",
      body: JSON.stringify(backendData),
    });
  },

  // Send Email Verification Code
  sendEmailVerificationCode: async (token) => {
    return apiRequest("/auth/send-verification-code", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  // Verify Email Verification Code
  verifyEmail: async (verificationCode, token) => {
    return apiRequest("/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ verificationCode }),
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },
};

/**
 * Handle API errors
 */
export const handleAPIError = (error) => {
  console.error("API Error:", error);

  // If it's our custom AuthAPIError, return the user-friendly message
  if (error instanceof AuthAPIError) {
    return {
      message: error.message,
      status: error.status,
      field: error.data?.field,
      code: error.data?.code,
    };
  }

  return {
    message: error.message || "An unexpected error occurred. Please try again.",
    status: 0,
  };
};

export { AuthAPIError };
export default authAPI;
