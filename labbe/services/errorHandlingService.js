/**
 * Centralized Error Handling Service
 * Provides unified error handling, parsing, and user-friendly messages
 */

import { toastUtils } from "@/utils/toastUtils";


// Error types for categorization
export const ErrorTypes = {
  NETWORK: "NETWORK",
  VALIDATION: "VALIDATION",
  AUTH: "AUTH",
  NOT_FOUND: "NOT_FOUND",
  SERVER: "SERVER",
  TIMEOUT: "TIMEOUT",
  UNKNOWN: "UNKNOWN",
};

// HTTP status code mappings
const STATUS_CODE_MESSAGES = {
  400: "errors.bad_request",
  401: "errors.unauthorized",
  403: "errors.forbidden",
  404: "errors.not_found",
  408: "errors.timeout",
  422: "errors.validation_failed",
  429: "errors.rate_limit",
  500: "errors.server_error",
  502: "errors.bad_gateway",
  503: "errors.service_unavailable",
  504: "errors.gateway_timeout",
};

/**
 * Parse error and extract useful information
 * @param {Error|Object} error - The error to parse
 * @returns {Object} Parsed error object with all structured fields the
 *   backend returns (code, field, errors[], meta, otpErrorType,
 *   accountStatus, remainingMinutes, retryAfterSeconds).
 */
export const parseError = (error) => {
  // Handle axios/fetch response errors
  if (error.response) {
    const { status, data } = error.response;
    return {
      type: getErrorType(status),
      status,
      code: data?.code || null,
      field: data?.field || null,
      message: data?.message || data?.error || STATUS_CODE_MESSAGES[status],
      details: data?.details || data?.errors || null,
      errors: Array.isArray(data?.errors) ? data.errors : null,
      meta: data?.meta || null,
      otpErrorType: data?.otpErrorType || null,
      accountStatus: data?.accountStatus || null,
      remainingMinutes: data?.remainingMinutes ?? null,
      retryAfterSeconds: data?.retryAfterSeconds ?? null,
      originalError: error,
    };
  }

  // Handle network errors
  if (error.message === "Network Error" || !navigator.onLine) {
    return {
      type: ErrorTypes.NETWORK,
      status: 0,
      message: "errors.network_error",
      details: null,
      originalError: error,
    };
  }

  // Handle timeout errors
  if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
    return {
      type: ErrorTypes.TIMEOUT,
      status: 408,
      message: "errors.timeout",
      details: null,
      originalError: error,
    };
  }

  // Handle generic errors
  return {
    type: ErrorTypes.UNKNOWN,
    status: null,
    message: error.message || "errors.unknown",
    details: null,
    originalError: error,
  };
};

/**
 * Get error type from status code
 * @param {number} status - HTTP status code
 * @returns {string} Error type
 */
const getErrorType = (status) => {
  if (status >= 400 && status < 500) {
    if (status === 401 || status === 403) return ErrorTypes.AUTH;
    if (status === 404) return ErrorTypes.NOT_FOUND;
    if (status === 422) return ErrorTypes.VALIDATION;
    return ErrorTypes.VALIDATION;
  }
  if (status >= 500) return ErrorTypes.SERVER;
  return ErrorTypes.UNKNOWN;
};

/**
 * Resolve a parsed auth error to a translated user-friendly message.
 *
 * The lookup walks structured fields the backend exposes (otpErrorType,
 * accountStatus, remainingMinutes, meta) so the message reflects the
 * actual scenario in the user's language — even when the backend's
 * English `message` would otherwise be shown verbatim.
 *
 * @param {Object} errorObj - Parsed error from `parseError`
 * @param {Function} t - i18n translation function (common namespace)
 * @returns {{ message: string, type: string, field: string|null, actionLink: string|boolean, code: string|null }}
 */
export const getAuthErrorMessage = (errorObj, t) => {
  if (!errorObj) return null;
  const {
    code,
    field,
    status,
    otpErrorType,
    accountStatus,
    remainingMinutes,
    meta,
  } = errorObj;
  const prefix = "authErrors";

  // 1) OTP subtypes — backend ships `otpErrorType` ∈ {invalid, expired,
  //    max_attempts, cooldown, not_found, send_failed}. Pick the
  //    contextual variant when meta carries extra detail.
  if (code === "OTP_ERROR" && otpErrorType) {
    let key = `${prefix}.OTP_ERROR.${otpErrorType}`;
    let interp = {};
    if (otpErrorType === "cooldown" && meta?.waitSeconds) {
      key = `${prefix}.OTP_ERROR.cooldown_with_seconds`;
      interp = { seconds: meta.waitSeconds };
    } else if (otpErrorType === "invalid" && meta?.attemptsLeft > 0) {
      key = `${prefix}.OTP_ERROR.invalid_with_attempts`;
      interp = { attemptsLeft: meta.attemptsLeft };
    }
    const msg = t(key, { defaultValue: "", ...interp });
    if (msg) {
      return { message: msg, type: "otp", field: null, actionLink: false, code };
    }
  }

  // 2) Account status (suspended / pending / rejected / inactive)
  if (code === "ACCOUNT_STATUS_ERROR" && accountStatus) {
    const msg = t(`${prefix}.ACCOUNT_STATUS_ERROR.${accountStatus}`, { defaultValue: "" });
    if (msg) {
      return { message: msg, type: "account", field: null, actionLink: false, code };
    }
  }

  // 3) Account lockout with dynamic minutes
  if (code === "ACCOUNT_LOCKED" && remainingMinutes) {
    const msg = t(`${prefix}.ACCOUNT_LOCKED_WITH_MINUTES`, {
      defaultValue: "",
      minutes: remainingMinutes,
    });
    if (msg) {
      return { message: msg, type: "account", field: null, actionLink: false, code };
    }
  }

  // 4) Code + field (CONFLICT.email, DUPLICATE_FIELD.phoneNumber, ...)
  if (code && field) {
    const key = `${prefix}.${code}.${field}`;
    const msg = t(key, { defaultValue: "" });
    if (msg) {
      const isConflict = code === "CONFLICT" || code === "DUPLICATE_FIELD";
      return { message: msg, type: isConflict ? "duplicate" : "validation", field, actionLink: isConflict ? "login" : false, code };
    }
  }

  // 5) Token-expired family → offer a "request new link" action
  if (code === "TOKEN_INVALID_OR_EXPIRED" || code === "VERIFICATION_LINK_EXPIRED") {
    const msg = t(`${prefix}.${code}`, { defaultValue: "" });
    if (msg) {
      return { message: msg, type: "token", field: null, actionLink: "requestNewLink", code };
    }
  }

  // 6) Code with default subkey
  if (code) {
    const defaultKey = `${prefix}.${code}.default`;
    const directKey = `${prefix}.${code}`;
    const msg = t(defaultKey, { defaultValue: "" }) || t(directKey, { defaultValue: "" });
    if (msg && typeof msg === "string") {
      const isConflict = code === "CONFLICT" || code === "DUPLICATE_FIELD";
      return {
        message: msg,
        type: isConflict ? "duplicate" : "validation",
        field: field || null,
        actionLink: isConflict ? "login" : false,
        code,
      };
    }
  }

  // 7) Fallback by status
  if (status >= 500) return { message: t(`${prefix}.SERVER`), type: "general", field: null, actionLink: false, code };
  if (status === 0) return { message: t(`${prefix}.NETWORK`), type: "general", field: null, actionLink: false, code };

  return { message: t(`${prefix}.UNKNOWN`), type: "general", field: null, actionLink: false, code };
};

/**
 * Handle error with toast notification
 * @param {Error|Object} error - The error to handle
 * @param {Function} t - Translation function
 * @param {Object} options - Options for error handling
 */
export const handleError = (error, t, options = {}) => {
  const {
    fallbackMessage = "errors.unknown",
    showToast = true,
    logError = true,
  } = options;

  const parsed = parseError(error);

  if (logError) {
    console.error("[ErrorHandler]", {
      type: parsed.type,
      status: parsed.status,
      message: parsed.message,
      details: parsed.details,
    });
  }

  if (showToast) {
    const message = t
      ? t(parsed.message) || t(fallbackMessage)
      : parsed.message || fallbackMessage;
    toastUtils.error(message);
  }

  return parsed;
};

/**
 * Create an async error handler wrapper
 * @param {Function} asyncFn - Async function to wrap
 * @param {Function} t - Translation function
 * @param {Object} options - Error handling options
 */
export const withErrorHandling = (asyncFn, t, options = {}) => {
  return async (...args) => {
    try {
      return await asyncFn(...args);
    } catch (error) {
      handleError(error, t, options);
      throw error;
    }
  };
};

/**
 * Retry an async operation with exponential backoff
 * @param {Function} asyncFn - Async function to retry
 * @param {Object} options - Retry options
 */
export const withRetry = async (asyncFn, options = {}) => {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    retryCondition = (error) => {
      const parsed = parseError(error);
      return (
        parsed.type === ErrorTypes.NETWORK ||
        parsed.type === ErrorTypes.TIMEOUT ||
        parsed.status >= 500
      );
    },
  } = options;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await asyncFn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries || !retryCondition(error)) {
        throw error;
      }

      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};

/**
 * Create a mutation error handler for React Query
 * @param {Function} t - Translation function
 * @param {Object} options - Error handling options
 */
export const createMutationErrorHandler = (t, options = {}) => {
  return (error) => {
    handleError(error, t, {
      fallbackMessage: options.fallbackMessage || "errors.operation_failed",
      ...options,
    });
  };
};

/**
 * Create a query error handler for React Query
 * @param {Function} t - Translation function
 * @param {Object} options - Error handling options
 */
export const createQueryErrorHandler = (t, options = {}) => {
  return (error) => {
    const parsed = parseError(error);

    // Don't show toast for 404s on queries (expected behavior)
    if (parsed.type === ErrorTypes.NOT_FOUND && !options.showNotFoundToast) {
      console.warn("[QueryError] Resource not found:", error);
      return;
    }

    handleError(error, t, {
      fallbackMessage: options.fallbackMessage || "errors.fetch_failed",
      ...options,
    });
  };
};

export default {
  ErrorTypes,
  parseError,
  handleError,
  withErrorHandling,
  withRetry,
  createMutationErrorHandler,
  createQueryErrorHandler,
  getAuthErrorMessage,
};
