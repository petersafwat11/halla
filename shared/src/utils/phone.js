/**
 * Phone Number Utilities
 * Centralized Single Source of Truth for Saudi phone normalization, validation,
 * clamping, and lookup variants across the entire platform.
 * @module @halaa/shared/utils/phone
 */

import { normalizeDigits } from "./locale.js";

/**
 * Standard Saudi phone number placeholder.
 */
export const DEFAULT_PHONE_PLACEHOLDER = "05xxxxxxxx";

/**
 * Unified Saudi phone regex.
 * Matches: 05XXXXXXXX (10 digits), 5XXXXXXXX (9 digits), 9665XXXXXXXX (12 digits), +9665XXXXXXXX (13 digits).
 */
export const SAUDI_PHONE_REGEX = /^(\+966|966|0)?5\d{8}$/;

/**
 * Dynamic input clamp for real-time typing / pasting in UI components.
 * 1. Normalizes Eastern Arabic / Persian digits to standard ASCII 0-9.
 * 2. Strips all non-digit characters.
 * 3. Restricts length to max 10 digits if starting with '05' or '0', and max 9 digits if starting with '5'.
 *
 * @param {string|number} value - Raw input value
 * @returns {string} Cleaned and clamped digit string
 */
export const clampPhoneInput = (value) => {
  if (value === null || value === undefined) return "";
  const normalized = normalizeDigits(String(value));
  const digits = normalized.replace(/\D/g, "");

  if (digits.startsWith("05") || digits.startsWith("0")) {
    return digits.slice(0, 10);
  }
  if (digits.startsWith("5")) {
    return digits.slice(0, 9);
  }
  return digits.slice(0, 10);
};

/**
 * Dynamic maximum length for phone input elements.
 * @param {string|number} value - Current input value
 * @returns {number} 9 or 10
 */
export const getPhoneMaxLength = (value) => {
  if (!value) return 10;
  const digits = normalizeDigits(String(value)).replace(/\D/g, "");
  if (digits.startsWith("5") && !digits.startsWith("05")) {
    return 9;
  }
  return 10;
};

/**
 * Normalize phone number to canonical international digit string (without leading +).
 * Example: '0501234567' -> '966501234567', '501234567' -> '966501234567'.
 *
 * @param {string|number} phoneNumber - Raw phone number input
 * @returns {string} Normalized canonical phone digits with country code
 */
export const normalizePhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return "";

  const withDigits = normalizeDigits(String(phoneNumber));
  let cleaned = withDigits.replace(/\s+/g, "").replace(/[-()]/g, "");

  // Remove leading 00 international prefix if present
  if (cleaned.startsWith("00")) {
    cleaned = cleaned.slice(2);
  }

  const hasPlus = cleaned.startsWith("+");
  let digits = cleaned.replace(/\D/g, "");

  if (!digits) return "";

  // Handle Saudi prefix with accidental redundant leading zero (e.g. 96605...)
  if (digits.startsWith("96605") && digits.length === 13) {
    digits = "966" + digits.slice(4);
  }
  // Handle Egypt prefix with accidental redundant leading zero (e.g. 2001...)
  if (digits.startsWith("2001") && digits.length === 13) {
    digits = "20" + digits.slice(3);
  }

  // If leading plus or explicit country code was given:
  if (hasPlus || digits.startsWith("966") || digits.startsWith("20")) {
    return digits;
  }

  // Saudi local formats:
  // 10 digits starting with 05 -> strip 0, prepend 966
  if (digits.startsWith("05") && digits.length === 10) {
    return "966" + digits.slice(1);
  }
  // 9 digits starting with 5 -> prepend 966
  if (digits.startsWith("5") && digits.length === 9) {
    return "966" + digits;
  }

  // Egypt local formats:
  // 11 digits starting with 01 -> strip 0, prepend 20
  if (digits.startsWith("01") && digits.length === 11) {
    return "20" + digits.slice(1);
  }
  // 10 digits starting with 1 -> prepend 20
  if (digits.startsWith("1") && digits.length === 10) {
    return "20" + digits;
  }

  return digits;
};

/**
 * Format phone number into canonical E.164 string with leading '+'.
 * e.g. "+966501234567"
 *
 * @param {string|number} phoneNumber - Raw or normalized phone number
 * @returns {string} E.164 formatted string or empty string
 */
export const toE164 = (phoneNumber) => {
  if (!phoneNumber) return "";
  const normalized = normalizePhoneNumber(phoneNumber);
  if (!normalized) return "";
  return normalized.startsWith("+") ? normalized : `+${normalized}`;
};

/**
 * Validate and format phone number.
 * @param {string|number} phoneNumber - Raw phone number input
 * @returns {Object} { isValid, formatted, e164, countryCode, country, error }
 */
export const validateAndFormatPhone = (phoneNumber) => {
  if (!phoneNumber) {
    return { isValid: false, error: "Phone number is required" };
  }

  const normalized = normalizePhoneNumber(phoneNumber);

  // Saudi check: 966 followed by 9 digits starting with 5 (total 12 digits)
  if (normalized.startsWith("966")) {
    const nat = normalized.slice(3);
    if (nat.length === 9 && nat.startsWith("5")) {
      return {
        isValid: true,
        formatted: normalized,
        e164: `+${normalized}`,
        countryCode: "+966",
        country: "SA",
      };
    }
    return {
      isValid: false,
      error: "Saudi numbers must be 10 digits starting with 05 or 9 digits starting with 5",
    };
  }

  // Egypt check: 20 followed by 10 digits starting with 1 (total 12 digits)
  if (normalized.startsWith("20")) {
    const nat = normalized.slice(2);
    if (nat.length === 10 && nat.startsWith("1")) {
      return {
        isValid: true,
        formatted: normalized,
        e164: `+${normalized}`,
        countryCode: "+20",
        country: "EG",
      };
    }
    return {
      isValid: false,
      error: "Egyptian numbers must be +20 followed by 10 digits starting with 1",
    };
  }

  return {
    isValid: false,
    error: "Unsupported phone number format",
  };
};

/**
 * Check if phone number is valid according to the centralized rule.
 * @param {string|number} phoneNumber
 * @returns {boolean}
 */
export const isValidPhone = (phoneNumber) => {
  return validateAndFormatPhone(phoneNumber).isValid;
};

/**
 * Format phone for human display (e.g. "+966 50 123 4567")
 * @param {string|number} phoneNumber
 * @returns {string} Formatted display string
 */
export const formatPhoneDisplay = (phoneNumber) => {
  const result = validateAndFormatPhone(phoneNumber);
  if (!result.isValid) return String(phoneNumber || "");

  if (result.country === "SA") {
    // 966 5X XXX XXXX
    const nat = result.formatted.slice(3);
    return `+966 ${nat.slice(0, 2)} ${nat.slice(2, 5)} ${nat.slice(5)}`;
  }

  if (result.country === "EG") {
    // 20 1X XXXX XXXX
    const nat = result.formatted.slice(2);
    return `+20 ${nat.slice(0, 2)} ${nat.slice(2, 6)} ${nat.slice(6)}`;
  }

  return result.e164 || String(phoneNumber || "");
};

/**
 * Generates all valid query lookup variants for database queries.
 * Given '0501234567' or '501234567', returns:
 * ['966501234567', '501234567', '0501234567', '+966501234567', rawValue]
 *
 * @param {string|number} phoneNumber
 * @returns {string[]} Array of unique lookup variants
 */
export const getPhoneLookupVariants = (phoneNumber) => {
  if (!phoneNumber) return [];
  const raw = String(phoneNumber).trim();
  const normalized = normalizePhoneNumber(phoneNumber);
  const variants = new Set();

  if (raw) variants.add(raw);
  if (normalized) {
    variants.add(normalized);
    variants.add(`+${normalized}`);
    if (normalized.startsWith("966") && normalized.length === 12) {
      const nat9 = normalized.slice(3);
      variants.add(nat9);
      variants.add(`0${nat9}`);
    }
  }

  return Array.from(variants);
};
