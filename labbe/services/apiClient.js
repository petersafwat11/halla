/**
 * Centralized API Client
 * Single source for all API requests - eliminates duplicate request logic
 */

import Cookies from "js-cookie";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v2";

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
 *
 * Phase 1a (FLOW-01-F01..F05): authentication tokens live in HttpOnly cookies
 * (`access_token`, `refresh_token`). The client sets `credentials: "include"`
 * on every request so the browser ships them automatically; we never read or
 * write the tokens from JS. On a 401 the client transparently calls
 * `/auth/refresh` once. If the refresh succeeds the original request is
 * retried; if it fails the user is redirected to the login screen.
 */
class APIClient {
  constructor() {
    this.baseURL = API_BASE_URL;
    // Coalesce concurrent refresh attempts so a burst of 401s only triggers
    // one rotation (refresh tokens are single-use; parallel hits cause replay
    // detection on the backend and force-logout the user).
    this._refreshPromise = null;
  }

  /**
   * Legacy: kept for backward-compatible callers that still want a Bearer
   * token. The cookie-based flow is preferred — this only returns a value if
   * a `token` cookie was set explicitly (e.g. by tests or server-side code).
   */
  getToken() {
    if (typeof window !== "undefined") {
      return Cookies.get("token") || null;
    }
    return null;
  }

  /**
   * Trigger a single in-flight refresh and reuse it for concurrent callers.
   * Resolves to true on success, false on failure.
   */
  async _refreshOnce() {
    if (this._refreshPromise) return this._refreshPromise;

    this._refreshPromise = (async () => {
      try {
        const res = await fetch(`${this.baseURL}/auth/refresh`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        return res.ok;
      } catch (e) {
        return false;
      } finally {
        // Clear after a microtask so concurrent callers see the same result
        Promise.resolve().then(() => {
          this._refreshPromise = null;
        });
      }
    })();

    return this._refreshPromise;
  }

  /**
   * Redirect to login on terminal auth failure. Best-effort; safe to skip
   * during SSR.
   */
  _redirectToLogin() {
    if (typeof window === "undefined") return;
    const lang = getCurrentLang();
    // Avoid bouncing if we're already on the login page
    if (window.location.pathname.endsWith("/login")) return;
    window.location.assign(`/${lang}/login`);
  }

  /**
   * Internal request helper used by `request` (so we can re-call it after a
   * silent refresh). The original behaviour — friendly errors, FormData
   * handling, blob/JSON detection — is preserved.
   */
  async _doRequest(endpoint, options) {
    const token = options.token || this.getToken();
    const isFormData = options.body instanceof FormData;

    const headers = {
      ...(!isFormData && { "Content-Type": "application/json" }),
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    const fetchOptions = {
      method: options.method || "GET",
      headers,
      credentials: "include",
    };

    if (options.body) {
      fetchOptions.body = isFormData
        ? options.body
        : JSON.stringify(options.body);
    }

    return fetch(`${this.baseURL}${endpoint}`, fetchOptions);
  }

  /**
   * Make API request with transparent 401 → refresh → retry.
   * @param {string} endpoint - API endpoint (e.g., "/auth/login")
   * @param {Object} options - Fetch options
   * @returns {Promise<any>} - Response data
   */
  async request(endpoint, options = {}) {
    try {
      let response = await this._doRequest(endpoint, options);

      // Silent-refresh: skip refresh attempts on the auth routes themselves
      // to avoid infinite loops (a 401 from /auth/refresh means the refresh
      // cookie itself is invalid).
      const skipRefresh =
        options.skipAuthRefresh === true ||
        endpoint.startsWith("/auth/refresh") ||
        endpoint.startsWith("/auth/login") ||
        endpoint.startsWith("/auth/logout");

      if (response.status === 401 && !skipRefresh) {
        const refreshed = await this._refreshOnce();
        if (refreshed) {
          response = await this._doRequest(endpoint, options);
        } else {
          this._redirectToLogin();
        }
      }

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
