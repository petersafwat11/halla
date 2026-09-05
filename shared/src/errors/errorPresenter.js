/**
 * Shared Error Presenter
 *
 * Canonical error presentation contract for web and mobile (PR3 / F-16).
 *
 * Requirements:
 * 1. Derives a 12-character uppercase support reference from the full request ID / UUID.
 * 2. Never exposes the raw UUID to users in visible messages, toasts, or alerts.
 * 3. Preserves the full ID in the returned object for Sentry/telemetry logging.
 * 4. Maps stable backend/client codes and HTTP statuses to localized, actionable messages (AR and EN).
 */

/**
 * Derives a 12-character uppercase alphanumeric support reference from a full request ID or UUID.
 *
 * @param {string|null|undefined} fullId
 * @returns {string} 12-character uppercase string, or "" if no ID is present.
 */
export function deriveSupportReference(fullId) {
  if (!fullId || typeof fullId !== "string") return "";
  const trimmed = fullId.trim();
  if (!trimmed) return "";

  // Strip non-alphanumeric characters (UUID hyphens, prefixes like req_, etc.)
  const alphanumeric = trimmed.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

  // If already at least 12 characters, return the first 12 characters
  if (alphanumeric.length >= 12) {
    return alphanumeric.slice(0, 12);
  }

  // If shorter, pad deterministically using a simple hash of the input
  let hash = 0;
  for (let i = 0; i < trimmed.length; i++) {
    hash = (hash * 31 + trimmed.charCodeAt(i)) >>> 0;
  }
  const pad = hash.toString(36).toUpperCase().padStart(12 - alphanumeric.length, "0");
  return (alphanumeric + pad).slice(0, 12);
}

const ACTION_MESSAGES = {
  EVENT_IMAGE_TOO_LARGE: {
    ar: "حجم صورة الدعوة كبير جداً. يرجى اختيار صورة أصغر من 10 ميجابايت والمحاولة مجدداً.",
    en: "The invitation image is too large. Please select an image under 10 MB and try again.",
  },
  EVENT_IMAGE_UNPROCESSABLE: {
    ar: "تعذر معالجة صورة الدعوة. يرجى اختيار صورة بتنسيق مدعوم (JPG، PNG، WebP) والمحاولة مجدداً.",
    en: "Could not process the invitation image. Please choose a supported format (JPG, PNG, WebP) and try again.",
  },
  EVENT_CREATE_TIMEOUT: {
    ar: "استغرقت عملية إنشاء المناسبة وقتاً أطول من المتوقع. بياناتك محفوظة، يرجى المحاولة مرة أخرى.",
    en: "Creating the event took longer than expected. Your form data is saved, please try again.",
  },
  IDEMPOTENCY_CONFLICT: {
    ar: "تم إرسال طلب مكرر ببيانات مختلفة. يرجى مراجعة بيانات المناسبة والمحاولة مجدداً.",
    en: "A duplicate request was detected with different data. Please review the details and try again.",
  },
  IDEMPOTENCY_PENDING: {
    ar: "جاري إنشاء المناسبة حالياً، يرجى الانتظار لحظات.",
    en: "Your event is currently being created, please wait a moment.",
  },
  IDEMPOTENCY_KEY_REQUIRED: {
    ar: "تعذر إتمام العملية بسبب نقص في بيانات التحقق. يرجى المحاولة مرة أخرى.",
    en: "Could not complete the operation due to missing verification data. Please try again.",
  },
  EVENT_DATE_TOO_SOON: {
    ar: "تاريخ المناسبة قريب جداً بالنسبة للباقة المختارة. يرجى تحديد موعد لاحق.",
    en: "The event date is too soon for your plan. Please choose a later date.",
  },
  PACKAGE_LIMIT_EXCEEDED: {
    ar: "تم تجاوز الحد المسموح به للمناسبات أو المدعوين في باقتك الحالية.",
    en: "You have reached the event or guest limit for your current subscription.",
  },
  FORBIDDEN: {
    ar: "ليس لديك صلاحية لإجراء هذه العملية. إذا كنت تعتقد أن هذا خطأ، تواصل مع الدعم.",
    en: "You do not have permission to perform this action. Contact support if you believe this is a mistake.",
  },
  UNAUTHORIZED: {
    ar: "انتهت جلسة تسجيل الدخول. يرجى تسجيل الدخول ثم المحاولة مرة أخرى.",
    en: "Your sign-in session has expired. Please sign in and try again.",
  },
  NETWORK_ERROR: {
    ar: "تعذر الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مجدداً.",
    en: "Could not connect to the server. Please check your internet connection and try again.",
  },
  TIMEOUT: {
    ar: "انتهت مهلة الطلب. بياناتك محفوظة، يرجى المحاولة مرة أخرى.",
    en: "Request timed out. Your information is saved, please try again.",
  },
  VALIDATION_ERROR: {
    ar: "يرجى التحقق من صحة البيانات المدخلة والمحاولة مجدداً.",
    en: "Please check the entered information and try again.",
  },
  SERVER_ERROR: {
    ar: "حدث خطأ غير متوقع أثناء معالجة طلبك. يرجى المحاولة لاحقاً.",
    en: "An unexpected error occurred while processing your request. Please try again later.",
  },
};

/**
 * Maps an error or status to a structured presented error object.
 *
 * @param {Error|object|string} error
 * @param {object} [options]
 * @param {"ar"|"en"} [options.language="ar"]
 * @returns {{
 *   code: string,
 *   status: number,
 *   actionMessage: string,
 *   supportReference: string,
 *   fullRequestId: string,
 *   isRetryable: boolean
 * }}
 */
export function presentError(error, { language = "ar" } = {}) {
  const lang = language === "en" ? "en" : "ar";

  // Normalize error input
  const status =
    error?.status ||
    error?.response?.status ||
    error?.statusCode ||
    0;

  const rawCode =
    error?.code ||
    error?.data?.code ||
    error?.response?.data?.code ||
    "";

  const fullRequestId =
    error?.requestId ||
    error?.data?.requestId ||
    error?.response?.data?.requestId ||
    error?.response?.headers?.["x-request-id"] ||
    error?.headers?.get?.("x-request-id") ||
    "";

  const supportReference = deriveSupportReference(fullRequestId);

  // Classify code and message
  let resolvedKey = "";
  let isRetryable = false;

  if (
    rawCode === "EVENT_IMAGE_TOO_LARGE" ||
    rawCode === "LIMIT_FILE_SIZE" ||
    rawCode === "INVITATION_IMAGE_TOO_LARGE_AFTER_COMPRESSION"
  ) {
    resolvedKey = "EVENT_IMAGE_TOO_LARGE";
    isRetryable = true;
  } else if (
    rawCode === "EVENT_IMAGE_UNPROCESSABLE" ||
    rawCode === "INVITATION_IMAGE_DECODE_FAILED" ||
    rawCode === "INVITATION_IMAGE_ENCODE_FAILED" ||
    rawCode === "INVITATION_IMAGE_CANVAS_UNAVAILABLE"
  ) {
    resolvedKey = "EVENT_IMAGE_UNPROCESSABLE";
    isRetryable = true;
  } else if (
    rawCode === "EVENT_CREATE_TIMEOUT" ||
    rawCode === "TIMEOUT" ||
    status === 408
  ) {
    resolvedKey = "EVENT_CREATE_TIMEOUT";
    isRetryable = true;
  } else if (
    rawCode === "IDEMPOTENCY_CONFLICT" ||
    (status === 409 && rawCode === "IDEMPOTENCY_CONFLICT")
  ) {
    resolvedKey = "IDEMPOTENCY_CONFLICT";
    isRetryable = false;
  } else if (
    rawCode === "IDEMPOTENCY_PENDING" ||
    rawCode === "IDEMPOTENCY_PENDING_TIMEOUT"
  ) {
    resolvedKey = "IDEMPOTENCY_PENDING";
    isRetryable = true;
  } else if (rawCode === "IDEMPOTENCY_KEY_REQUIRED") {
    resolvedKey = "IDEMPOTENCY_KEY_REQUIRED";
    isRetryable = true;
  } else if (rawCode === "EVENT_DATE_TOO_SOON") {
    resolvedKey = "EVENT_DATE_TOO_SOON";
    isRetryable = false;
  } else if (
    rawCode === "PACKAGE_LIMIT_EXCEEDED" ||
    rawCode === "PACKAGE_LIMIT"
  ) {
    resolvedKey = "PACKAGE_LIMIT_EXCEEDED";
    isRetryable = false;
  } else if (status === 401) {
    resolvedKey = "UNAUTHORIZED";
    isRetryable = false;
  } else if (status === 403) {
    resolvedKey = "FORBIDDEN";
    isRetryable = false;
  } else if (rawCode === "NETWORK_ERROR" || status === 0) {
    resolvedKey = "NETWORK_ERROR";
    isRetryable = true;
  } else if (status === 400 || status === 422 || rawCode === "VALIDATION_ERROR") {
    resolvedKey = "VALIDATION_ERROR";
    isRetryable = false;
  } else {
    resolvedKey = "SERVER_ERROR";
    isRetryable = true;
  }

  const actionMessage = ACTION_MESSAGES[resolvedKey][lang];

  return {
    code: resolvedKey,
    status,
    actionMessage,
    supportReference,
    fullRequestId: fullRequestId ? String(fullRequestId) : "",
    isRetryable,
  };
}

/**
 * Format presented error for user-facing display (Toast, Alert, Banner).
 * Never exposes the full UUID / internal request ID to the user.
 *
 * @param {ReturnType<typeof presentError>} presentedError
 * @param {"ar"|"en"} [language="ar"]
 * @returns {string} Formatted user-facing error message with support reference.
 */
export function formatErrorDisplay(presentedError, language = "ar") {
  const lang = language === "en" ? "en" : "ar";
  const { actionMessage, supportReference } = presentedError;
  if (!supportReference) {
    return actionMessage;
  }
  const refPrefix = lang === "ar" ? "رقم المرجع" : "Reference ID";
  return `${actionMessage}\n(${refPrefix}: ${supportReference})`;
}
