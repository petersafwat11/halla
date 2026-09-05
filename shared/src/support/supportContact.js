import { LEGAL_CONTACT } from "../legal/contact.js";

/**
 * Valid support request sources across web and mobile.
 */
export const SUPPORT_SOURCE = Object.freeze({
  MANAGED_EVENT: "managed_event",
  HOME_HEADER: "home_header",
  EVENT_DETAILS: "event_details",
  ADDON_FULFILLMENT: "addon_fulfillment",
  GENERAL: "general",
});

const VALID_SOURCES = new Set(Object.values(SUPPORT_SOURCE));
const VALID_REFERENCE_KINDS = new Set(["event", "addon", "request"]);
const OPAQUE_ID_REGEX = /^[A-Za-z0-9_-]{1,64}$/;

const BASE_MESSAGES = {
  [SUPPORT_SOURCE.MANAGED_EVENT]: {
    ar: "مرحباً، أود الاستفسار عن خدمة إدارة المناسبات (دعوتك علينا).",
    en: "Hello, I would like to inquire about the managed event service (Your invitation is on us).",
  },
  [SUPPORT_SOURCE.HOME_HEADER]: {
    ar: "مرحباً، أحتاج إلى مساعدة بخصوص حسابي في تطبيق هلا.",
    en: "Hello, I need assistance with my Halaa app account.",
  },
  [SUPPORT_SOURCE.EVENT_DETAILS]: {
    ar: "مرحباً، أحتاج إلى مساعدة بخصوص مناسبتي في تطبيق هلا.",
    en: "Hello, I need assistance with my event in the Halaa app.",
  },
  [SUPPORT_SOURCE.ADDON_FULFILLMENT]: {
    ar: "مرحباً، أود الاستفسار عن طلب التصميم الخاص بي في تطبيق هلا.",
    en: "Hello, I would like to inquire about my custom design request in the Halaa app.",
  },
  [SUPPORT_SOURCE.GENERAL]: {
    ar: "مرحباً، أود التواصل مع فريق دعم تطبيق هلا.",
    en: "Hello, I would like to contact Halaa app support.",
  },
};

const REFERENCE_PREFIXES = {
  event: {
    ar: "رقم المناسبة",
    en: "Event ID",
  },
  addon: {
    ar: "رقم الطلب",
    en: "Order ID",
  },
  request: {
    ar: "رقم المرجع",
    en: "Reference ID",
  },
};

/**
 * Validates opaque reference to ensure it contains only safe identifiers and no PII.
 * @param {Object|null} reference
 * @returns {{ kind: "event"|"addon"|"request", value: string } | null}
 */
export function validateSupportReference(reference) {
  if (!reference) return null;
  if (typeof reference !== "object") {
    throw new TypeError("Support reference must be an object or null");
  }

  const { kind, value } = reference;
  if (!VALID_REFERENCE_KINDS.has(kind)) {
    throw new Error(`Invalid support reference kind: '${kind}'. Expected 'event', 'addon', or 'request'.`);
  }

  if (typeof value !== "string" && typeof value !== "number") {
    throw new TypeError("Support reference value must be a string or number");
  }

  const stringValue = String(value).trim();
  if (!OPAQUE_ID_REGEX.test(stringValue)) {
    throw new Error(
      `Support reference value must be an opaque identifier (1-64 alphanumeric/dash/underscore chars). Received invalid token.`
    );
  }

  return { kind, value: stringValue };
}

/**
 * Pure builder for support message text.
 * Strictly avoids arbitrary caller prose and sensitive user data.
 */
export function buildSupportMessage({ language = "ar", source = SUPPORT_SOURCE.GENERAL, reference = null } = {}) {
  const lang = language === "en" ? "en" : "ar";
  if (!VALID_SOURCES.has(source)) {
    throw new Error(`Invalid support request source: '${source}'.`);
  }
  const normalizedSource = source;

  let message = BASE_MESSAGES[normalizedSource][lang];

  const validatedRef = validateSupportReference(reference);
  if (validatedRef) {
    const prefix = REFERENCE_PREFIXES[validatedRef.kind][lang];
    message += `\n${prefix}: ${validatedRef.value}`;
  }

  return message;
}

/**
 * Builds the canonical support request with deep link, web link, and display number.
 *
 * @param {Object} options
 * @param {"ar"|"en"} [options.language="ar"]
 * @param {string} [options.source=SUPPORT_SOURCE.GENERAL]
 * @param {{ kind: "event"|"addon"|"request", value: string }|null} [options.reference=null]
 * @returns {{ deepLinkUrl: string, webUrl: string, displayNumber: string, text: string }}
 */
export function buildSupportRequest({
  language = "ar",
  source = SUPPORT_SOURCE.GENERAL,
  reference = null,
} = {}) {
  const lang = language === "en" ? "en" : "ar";
  const rawNumber = LEGAL_CONTACT?.whatsapp?.value;
  if (!rawNumber) {
    throw new Error("Canonical WhatsApp support contact is not configured");
  }
  const cleanNumber = String(rawNumber).replace(/\D/g, "");
  const displayNumber = LEGAL_CONTACT?.whatsapp?.display || rawNumber;

  const text = buildSupportMessage({ language: lang, source, reference });
  const encodedText = encodeURIComponent(text);

  const deepLinkUrl = `whatsapp://send?phone=${cleanNumber}${encodedText ? `&text=${encodedText}` : ""}`;
  const webUrl = `https://wa.me/${cleanNumber}${encodedText ? `?text=${encodedText}` : ""}`;

  return {
    deepLinkUrl,
    webUrl,
    displayNumber,
    text,
  };
}
