/**
 * Error Handler Utilities
 * Centralized error handling for API responses
 * Handles 409 (duplicate), 402 (payment required), 403 (limit exceeded) errors
 */

/**
 * Error types for consistent handling
 */
export const ERROR_TYPES = {
  DUPLICATE_EMAIL: "DUPLICATE_EMAIL",
  DUPLICATE_MOBILE: "DUPLICATE_MOBILE",
  DUPLICATE: "DUPLICATE",
  SUBSCRIPTION_EXPIRED: "SUBSCRIPTION_EXPIRED",
  SUBSCRIPTION_REQUIRED: "SUBSCRIPTION_REQUIRED",
  PAYMENT_REQUIRED: "PAYMENT_REQUIRED",
  LIMIT_EXCEEDED: "LIMIT_EXCEEDED",
  EVENT_LIMIT: "EVENT_LIMIT",
  GUEST_LIMIT: "GUEST_LIMIT",
  MODERATOR_LIMIT: "MODERATOR_LIMIT",
  UNAUTHORIZED: "UNAUTHORIZED",
  NETWORK_ERROR: "NETWORK_ERROR",
  UNKNOWN: "UNKNOWN",
};

/**
 * Error messages in Arabic and English
 */
export const ERROR_MESSAGES = {
  [ERROR_TYPES.DUPLICATE_EMAIL]: {
    ar: "هذا البريد مسجل مسبقاً. يرجى استخدام بريد مختلف أو تسجيل الدخول.",
    en: "This email is already registered. Please use a different email or login.",
  },
  [ERROR_TYPES.DUPLICATE_MOBILE]: {
    ar: "هذا الرقم مسجل مسبقاً. يرجى استخدام رقم مختلف أو تسجيل الدخول.",
    en: "This mobile is already registered. Please use a different number or login.",
  },
  [ERROR_TYPES.DUPLICATE]: {
    ar: "هذه المعلومات مسجلة مسبقاً.",
    en: "This information is already registered.",
  },
  [ERROR_TYPES.SUBSCRIPTION_EXPIRED]: {
    ar: "انتهت صلاحية اشتراكك. يرجى التجديد للمتابعة.",
    en: "Your subscription has expired. Please renew to continue.",
  },
  [ERROR_TYPES.SUBSCRIPTION_REQUIRED]: {
    ar: "يجب الاشتراك أولاً للوصول إلى هذه الميزة.",
    en: "A subscription is required to access this feature.",
  },
  [ERROR_TYPES.PAYMENT_REQUIRED]: {
    ar: "يرجى إكمال الدفع للمتابعة.",
    en: "Please complete payment to continue.",
  },
  [ERROR_TYPES.EVENT_LIMIT]: {
    ar: "وصلت للحد الأقصى من المناسبات. يرجى ترقية باقتك.",
    en: "You have reached your event limit. Please upgrade your plan.",
  },
  [ERROR_TYPES.GUEST_LIMIT]: {
    ar: "وصلت للحد الأقصى من الضيوف. يرجى ترقية باقتك.",
    en: "You have reached your guest limit. Please upgrade your plan.",
  },
  [ERROR_TYPES.MODERATOR_LIMIT]: {
    ar: "وصلت للحد الأقصى من المشرفين. يرجى ترقية باقتك.",
    en: "You have reached your moderator limit. Please upgrade your plan.",
  },
  [ERROR_TYPES.LIMIT_EXCEEDED]: {
    ar: "تجاوزت الحد المسموح. يرجى ترقية باقتك.",
    en: "Limit exceeded. Please upgrade your plan.",
  },
  [ERROR_TYPES.UNAUTHORIZED]: {
    ar: "يرجى تسجيل الدخول للمتابعة.",
    en: "Please login to continue.",
  },
  [ERROR_TYPES.NETWORK_ERROR]: {
    ar: "حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى.",
    en: "Network error. Please try again.",
  },
  [ERROR_TYPES.UNKNOWN]: {
    ar: "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.",
    en: "An unexpected error occurred. Please try again.",
  },
};

/**
 * Parse API error and return structured error object
 * @param {Error} error - Error object from API call
 * @returns {Object} Structured error with type, message, field, and actions
 */
export const parseApiError = (error) => {
  const status = error.status || error.response?.status;
  const data = error.data || error.response?.data || {};
  const field = data.field || error.field;
  const serverMessage = data.message || error.message;

  // Handle 409 Conflict - Duplicate email/mobile
  if (status === 409) {
    if (field === "email") {
      return {
        type: ERROR_TYPES.DUPLICATE_EMAIL,
        message: ERROR_MESSAGES[ERROR_TYPES.DUPLICATE_EMAIL],
        field: "email",
        serverMessage,
        actions: ["login", "change_email"],
      };
    }
    if (field === "mobile" || field === "phoneNumber") {
      return {
        type: ERROR_TYPES.DUPLICATE_MOBILE,
        message: ERROR_MESSAGES[ERROR_TYPES.DUPLICATE_MOBILE],
        field: "mobile",
        serverMessage,
        actions: ["login", "change_mobile"],
      };
    }
    return {
      type: ERROR_TYPES.DUPLICATE,
      message: ERROR_MESSAGES[ERROR_TYPES.DUPLICATE],
      field,
      serverMessage,
      actions: ["login"],
    };
  }

  // Handle 402 Payment Required - Subscription issues
  if (status === 402) {
    const isExpired = serverMessage?.toLowerCase().includes("expired");
    const type = isExpired
      ? ERROR_TYPES.SUBSCRIPTION_EXPIRED
      : ERROR_TYPES.PAYMENT_REQUIRED;
    return {
      type,
      message: ERROR_MESSAGES[type],
      serverMessage,
      actions: ["subscribe", "renew"],
    };
  }

  // Handle 403 Forbidden - Limit exceeded or feature access denied
  if (status === 403) {
    const code = data.code;
    const limitType = data.limitType;

    if (code === "PACKAGE_LIMIT_EXCEEDED" || limitType) {
      let type = ERROR_TYPES.LIMIT_EXCEEDED;
      if (
        limitType === "events" ||
        serverMessage?.toLowerCase().includes("event")
      ) {
        type = ERROR_TYPES.EVENT_LIMIT;
      } else if (
        limitType === "guests" ||
        serverMessage?.toLowerCase().includes("guest")
      ) {
        type = ERROR_TYPES.GUEST_LIMIT;
      } else if (
        limitType === "moderators" ||
        serverMessage?.toLowerCase().includes("moderator")
      ) {
        type = ERROR_TYPES.MODERATOR_LIMIT;
      }

      return {
        type,
        message: ERROR_MESSAGES[type],
        serverMessage,
        limit: data.limit,
        current: data.current,
        actions: ["upgrade"],
      };
    }

    return {
      type: ERROR_TYPES.LIMIT_EXCEEDED,
      message: ERROR_MESSAGES[ERROR_TYPES.LIMIT_EXCEEDED],
      serverMessage,
      actions: ["upgrade"],
    };
  }

  // Handle 401 Unauthorized
  if (status === 401) {
    return {
      type: ERROR_TYPES.UNAUTHORIZED,
      message: ERROR_MESSAGES[ERROR_TYPES.UNAUTHORIZED],
      serverMessage,
      actions: ["login"],
    };
  }

  // Handle network errors
  if (!status || error.message === "Network request failed") {
    return {
      type: ERROR_TYPES.NETWORK_ERROR,
      message: ERROR_MESSAGES[ERROR_TYPES.NETWORK_ERROR],
      serverMessage: error.message,
      actions: ["retry"],
    };
  }

  // Unknown error
  return {
    type: ERROR_TYPES.UNKNOWN,
    message: ERROR_MESSAGES[ERROR_TYPES.UNKNOWN],
    serverMessage,
    status,
    actions: ["retry"],
  };
};

/**
 * Get localized error message
 * @param {Object} parsedError - Parsed error from parseApiError
 * @param {string} locale - 'ar' or 'en'
 * @returns {string} Localized error message
 */
export const getLocalizedErrorMessage = (parsedError, locale = "ar") => {
  if (parsedError.message) {
    return (
      parsedError.message[locale] ||
      parsedError.message.en ||
      parsedError.serverMessage
    );
  }
  return (
    parsedError.serverMessage || ERROR_MESSAGES[ERROR_TYPES.UNKNOWN][locale]
  );
};

/**
 * Check if error requires upgrade action
 * @param {Object} parsedError - Parsed error from parseApiError
 * @returns {boolean}
 */
export const requiresUpgrade = (parsedError) => {
  return parsedError.actions?.includes("upgrade");
};

/**
 * Check if error requires login action
 * @param {Object} parsedError - Parsed error from parseApiError
 * @returns {boolean}
 */
export const requiresLogin = (parsedError) => {
  return (
    parsedError.actions?.includes("login") &&
    parsedError.type === ERROR_TYPES.UNAUTHORIZED
  );
};

/**
 * Check if error requires subscription action
 * @param {Object} parsedError - Parsed error from parseApiError
 * @returns {boolean}
 */
export const requiresSubscription = (parsedError) => {
  return (
    parsedError.actions?.includes("subscribe") ||
    parsedError.actions?.includes("renew") ||
    parsedError.type === ERROR_TYPES.SUBSCRIPTION_EXPIRED ||
    parsedError.type === ERROR_TYPES.PAYMENT_REQUIRED
  );
};

/**
 * Check if error is a duplicate field error
 * @param {Object} parsedError - Parsed error from parseApiError
 * @returns {boolean}
 */
export const isDuplicateError = (parsedError) => {
  return [
    ERROR_TYPES.DUPLICATE,
    ERROR_TYPES.DUPLICATE_EMAIL,
    ERROR_TYPES.DUPLICATE_MOBILE,
  ].includes(parsedError.type);
};

export default {
  ERROR_TYPES,
  ERROR_MESSAGES,
  parseApiError,
  getLocalizedErrorMessage,
  requiresUpgrade,
  requiresLogin,
  requiresSubscription,
  isDuplicateError,
};
