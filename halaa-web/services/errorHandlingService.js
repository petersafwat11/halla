/**
 * Centralized error handling for the web app.
 *
 * The toast wiring, `parseError` (reads axios's `error.response` shape),
 * `handleError`, and retry-with-backoff helpers depend on `toastUtils`
 * and the axios `error.response` convention, so they live here.
 */

import { toastUtils } from "@/utils/toastUtils";
import {
  ErrorTypes,
  STATUS_CODE_MESSAGES,
  errorTypeFromStatus,
  authErrorMessage as sharedAuthErrorMessage,
  presentError,
  formatErrorDisplay,
  deriveSupportReference,
} from "@halaa/shared/errors";

export { ErrorTypes, presentError, formatErrorDisplay, deriveSupportReference };

/**
 * Parse error and extract useful information.
 *
 * Reads the axios `error.response.{status,data}` shape.
 */
export const parseError = (error, { language = "ar" } = {}) => {
  const presented = presentError(error, { language });

  if (error?.response) {
    const { status, data } = error.response;
    return {
      type: errorTypeFromStatus(status),
      status,
      code: data?.code || presented.code || null,
      field: data?.field || null,
      message: data?.message || data?.error || STATUS_CODE_MESSAGES[status],
      details: data?.details || data?.errors || null,
      errors: Array.isArray(data?.errors) ? data.errors : null,
      meta: data?.meta || null,
      otpErrorType: data?.otpErrorType || null,
      accountStatus: data?.accountStatus || null,
      remainingMinutes: data?.remainingMinutes ?? null,
      retryAfterSeconds: data?.retryAfterSeconds ?? null,
      requestId: presented.fullRequestId || null,
      supportReference: presented.supportReference || null,
      presented,
      originalError: error,
    };
  }

  if (error?.message === "Network Error" || (typeof navigator !== "undefined" && !navigator?.onLine)) {
    return {
      type: ErrorTypes.NETWORK,
      status: 0,
      code: presented.code || "NETWORK_ERROR",
      message: "errors.network_error",
      details: null,
      requestId: presented.fullRequestId || null,
      supportReference: presented.supportReference || null,
      presented,
      originalError: error,
    };
  }

  if (error?.code === "ECONNABORTED" || error?.message?.includes("timeout")) {
    return {
      type: ErrorTypes.TIMEOUT,
      status: 408,
      code: presented.code || "TIMEOUT",
      message: "errors.timeout",
      details: null,
      requestId: presented.fullRequestId || null,
      supportReference: presented.supportReference || null,
      presented,
      originalError: error,
    };
  }

  return {
    type: ErrorTypes.UNKNOWN,
    status: null,
    code: presented.code || null,
    message: error?.message || "errors.unknown",
    details: null,
    requestId: presented.fullRequestId || null,
    supportReference: presented.supportReference || null,
    presented,
    originalError: error,
  };
};

export const getAuthErrorMessage = sharedAuthErrorMessage;

export const handleError = (error, t, options = {}) => {
  const {
    fallbackMessage = "errors.unknown",
    showToast = true,
    logError = true,
    language = "ar",
  } = options;

  const parsed = parseError(error, { language });
  const presented = parsed.presented || presentError(error, { language });

  if (logError) {
    console.error("[ErrorHandler]", {
      type: parsed.type,
      status: parsed.status,
      code: presented.code,
      message: parsed.message,
      fullRequestId: presented.fullRequestId, // Full ID preserved for telemetry/logging
      supportReference: presented.supportReference,
      details: parsed.details,
    });
  }

  if (showToast) {
    let displayMessage;
    if (presented.actionMessage) {
      displayMessage = formatErrorDisplay(presented, language);
    } else {
      displayMessage = t
        ? t(parsed.message) || t(fallbackMessage)
        : parsed.message || fallbackMessage;
    }
    toastUtils.error(displayMessage);
  }

  return parsed;
};

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

export const createMutationErrorHandler = (t, options = {}) => {
  return (error) => {
    handleError(error, t, {
      fallbackMessage: options.fallbackMessage || "errors.operation_failed",
      ...options,
    });
  };
};

export const createQueryErrorHandler = (t, options = {}) => {
  return (error) => {
    const parsed = parseError(error);

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
