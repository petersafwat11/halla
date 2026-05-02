/**
 * Centralized API Client
 * Single source for all API requests - eliminates duplicate request logic
 */

import Cookies from "js-cookie";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

/**
 * User-friendly error messages (EN/AR)
 */
const ERROR_MESSAGES = {
  DUPLICATE_EMAIL: {
    en: "This email is already registered. Please use a different email or login.",
    ar: "هذا البريد الإلكتروني مسجل بالفعل. يرجى استخدام بريد آخر أو تسجيل الدخول.",
  },
  DUPLICATE_PHONE: {
    en: "This phone number is already registered. Please use a different number or login.",
    ar: "رقم الهاتف هذا مسجل بالفعل. يرجى استخدام رقم آخر أو تسجيل الدخول.",
  },
  DUPLICATE_USERNAME: {
    en: "This username is already taken. Please choose a different one.",
    ar: "اسم المستخدم هذا مستخدم بالفعل. يرجى اختيار اسم آخر.",
  },
  DUPLICATE_GENERIC: {
    en: "This information already exists in the system.",
    ar: "هذه المعلومات موجودة بالفعل في النظام.",
  },
  VALIDATION_ERROR: {
    en: "Please check your input and try again.",
    ar: "يرجى التحقق من البيانات المدخلة والمحاولة مرة أخرى.",
  },
  UNAUTHORIZED: {
    en: "Please login to continue.",
    ar: "يرجى تسجيل الدخول للمتابعة.",
  },
  FORBIDDEN: {
    en: "You don't have permission to perform this action.",
    ar: "ليس لديك صلاحية للقيام بهذا الإجراء.",
  },
  NOT_FOUND: {
    en: "The requested resource was not found.",
    ar: "لم يتم العثور على المورد المطلوب.",
  },
  SERVER_ERROR: {
    en: "Something went wrong. Please try again later.",
    ar: "حدث خطأ ما. يرجى المحاولة مرة أخرى لاحقاً.",
  },
  NETWORK_ERROR: {
    en: "Network error. Please check your connection.",
    ar: "خطأ في الشبكة. يرجى التحقق من اتصالك.",
  },
};

/**
 * Get current language from document or default to 'ar'
 */
const getCurrentLang = () => {
  if (typeof document !== "undefined") {
    return document.documentElement.lang || "ar";
  }
  return "ar";
};

/**
 * Extract user-friendly error message from API response
 */
const extractUserFriendlyMessage = (errorData, status) => {
  const lang = getCurrentLang();
  const message = errorData?.message || "";

  // Handle MongoDB duplicate key errors (E11000)
  if (message.includes("E11000") || message.includes("duplicate key")) {
    if (message.includes("email")) {
      return ERROR_MESSAGES.DUPLICATE_EMAIL[lang];
    }
    if (message.includes("phoneNumber") || message.includes("phone")) {
      return ERROR_MESSAGES.DUPLICATE_PHONE[lang];
    }
    if (message.includes("username")) {
      return ERROR_MESSAGES.DUPLICATE_USERNAME[lang];
    }
    return ERROR_MESSAGES.DUPLICATE_GENERIC[lang];
  }

  // Handle by status code
  if (status === 409) {
    if (errorData.field === "email") {
      return ERROR_MESSAGES.DUPLICATE_EMAIL[lang];
    }
    if (errorData.field === "phoneNumber" || errorData.field === "phone") {
      return ERROR_MESSAGES.DUPLICATE_PHONE[lang];
    }
    return ERROR_MESSAGES.DUPLICATE_GENERIC[lang];
  }

  if (status === 400) {
    return errorData.message || ERROR_MESSAGES.VALIDATION_ERROR[lang];
  }

  if (status === 401) {
    return errorData.message || ERROR_MESSAGES.UNAUTHORIZED[lang];
  }

  if (status === 403) {
    return errorData.message || ERROR_MESSAGES.FORBIDDEN[lang];
  }

  if (status === 404) {
    return errorData.message || ERROR_MESSAGES.NOT_FOUND[lang];
  }

  if (status >= 500) {
    return ERROR_MESSAGES.SERVER_ERROR[lang];
  }

  return errorData.message || ERROR_MESSAGES.SERVER_ERROR[lang];
};

/**
 * Custom API Error class
 */
export class APIError extends Error {
  constructor(message, status, data = {}) {
    super(message);
    this.name = "APIError";
    this.status = status;
    this.data = data;
  }
}

/**
 * API Client singleton
 */
class APIClient {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  /**
   * Get auth token from cookies
   */
  getToken() {
    if (typeof window !== "undefined") {
      return Cookies.get("token") || null;
    }
    return null;
  }

  /**
   * Make API request
   * @param {string} endpoint - API endpoint (e.g., "/auth/login")
   * @param {Object} options - Fetch options
   * @param {string} options.method - HTTP method
   * @param {Object|FormData} options.body - Request body
   * @param {Object} options.headers - Additional headers
   * @param {string} options.token - Override auth token
   * @returns {Promise<any>} - Response data
   */
  async request(endpoint, options = {}) {
    const token = options.token || this.getToken();
    const isFormData = options.body instanceof FormData;

    // Build headers
    const headers = {
      ...(!isFormData && { "Content-Type": "application/json" }),
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    // Build request options
    const fetchOptions = {
      method: options.method || "GET",
      headers,
      credentials: "include",
    };

    // Add body if present
    if (options.body) {
      fetchOptions.body = isFormData
        ? options.body
        : JSON.stringify(options.body);
    }

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, fetchOptions);

      // Handle error responses
      if (!response.ok) {
        let errorData = {};
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { message: response.statusText };
        }

        const userFriendlyMessage = extractUserFriendlyMessage(
          errorData,
          response.status,
        );

        throw new APIError(userFriendlyMessage, response.status, errorData);
      }

      // Handle different response types
      const contentType = response.headers.get("content-type");

      if (contentType?.includes("application/json")) {
        return response.json();
      }

      if (
        contentType?.includes("spreadsheetml") ||
        contentType?.includes("octet-stream")
      ) {
        return response.blob();
      }

      // No content
      if (response.status === 204) {
        return { success: true };
      }

      return { success: true, message: "Request completed successfully" };
    } catch (error) {
      // Re-throw API errors as-is
      if (error instanceof APIError) {
        throw error;
      }

      // Wrap other errors with bilingual network error message
      console.error("API request error:", error);
      const lang = getCurrentLang();
      throw new APIError(ERROR_MESSAGES.NETWORK_ERROR[lang], 0, {});
    }
  }

  /**
   * GET request
   */
  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: "GET" });
  }

  /**
   * POST request
   */
  post(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: "POST", body });
  }

  /**
   * PATCH request
   */
  patch(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: "PATCH", body });
  }

  /**
   * PUT request
   */
  put(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: "PUT", body });
  }

  /**
   * DELETE request
   */
  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: "DELETE" });
  }

  /**
   * Build query string from object
   */
  buildQueryString(params) {
    const filtered = Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    );
    return filtered.length > 0
      ? `?${new URLSearchParams(filtered).toString()}`
      : "";
  }
}

// Export singleton instance
const apiClient = new APIClient();
export default apiClient;

/**
 * Legacy compatibility - makeAuthenticatedRequest
 * For gradual migration of existing services
 */
export const makeAuthenticatedRequest = async (
  url,
  options = {},
  token = null,
) => {
  return apiClient.request(url, { ...options, token });
};

/**
 * Legacy compatibility - getAuthToken
 */
export const getAuthToken = () => apiClient.getToken();
