/**
 * Phone Number Utilities
 * Pure helper functions for E.164 and international phone normalization.
 * @module @halaa/shared/utils/phone
 */

/**
 * Normalize phone number to international digit string (without leading +).
 * Supports Saudi Arabia (+966) and Egypt (+20).
 * Handles raw inputs like:
 * - 0501234567, 501234567, 966501234567, +966501234567, +9660501234567
 * - 01012345678, 201012345678, +201012345678, +2001012345678
 *
 * @param {string} phoneNumber - Raw phone number input
 * @returns {string} Normalized phone digits with country code
 */
export const normalizePhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return "";

  let cleaned = String(phoneNumber).replace(/\s+/g, "").replace(/[-()]/g, "");

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
 * e.g. "+966501234567", "+201012345678"
 *
 * @param {string} phoneNumber - Raw or normalized phone number
 * @returns {string} E.164 formatted string or empty string
 */
export const toE164 = (phoneNumber) => {
  if (!phoneNumber) return "";
  const normalized = normalizePhoneNumber(phoneNumber);
  if (!normalized) return "";
  return normalized.startsWith("+") ? normalized : `+${normalized}`;
};

/**
 * Validate and format phone number
 * @param {string} phoneNumber - Raw phone number input
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
      error: "Saudi numbers must be +966 followed by 9 digits starting with 5",
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
    error: "Unsupported country code. Supported: +966 (Saudi), +20 (Egypt)",
  };
};

/**
 * Check if phone number is valid Saudi or Egypt format
 * @param {string} phoneNumber
 * @returns {boolean}
 */
export const isValidPhone = (phoneNumber) => {
  return validateAndFormatPhone(phoneNumber).isValid;
};

/**
 * Format phone for user display (e.g. "+966 50 123 4567")
 * @param {string} phoneNumber
 * @returns {string} Formatted display string
 */
export const formatPhoneDisplay = (phoneNumber) => {
  const result = validateAndFormatPhone(phoneNumber);
  if (!result.isValid) return phoneNumber || "";

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

  return result.e164 || phoneNumber || "";
};
