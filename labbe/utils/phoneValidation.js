/**
 * Phone Number Validation Utilities (Frontend)
 *
 * Supports:
 * - Saudi Arabia: 9 digits starting with 5 (prefix +966)
 * - Egypt: 11 digits starting with 01 (prefix +20)
 */

/**
 * Validate and format phone number
 * @param {string} phoneNumber - Raw phone number input
 * @returns {Object} { isValid, formatted, countryCode, error }
 */
export function validateAndFormatPhone(phoneNumber) {
  if (!phoneNumber) {
    return { isValid: false, error: "Phone number is required" };
  }

  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, "");

  // Check length
  if (cleaned.length < 9 || cleaned.length > 11) {
    return {
      isValid: false,
      error: "Phone number must be 9-11 digits",
    };
  }

  // 9 digits - Must start with 5 (Saudi Arabia)
  if (cleaned.length === 9) {
    if (!cleaned.startsWith("5")) {
      return {
        isValid: false,
        error: "9-digit numbers must start with 5 (Saudi Arabia)",
      };
    }
    return {
      isValid: true,
      formatted: cleaned,
      countryCode: "+966",
      fullNumber: `+966${cleaned}`,
      country: "SA",
    };
  }

  // 10 digits - Must start with 05 (Saudi Arabia with leading 0)
  if (cleaned.length === 10) {
    if (!cleaned.startsWith("05")) {
      return {
        isValid: false,
        error: "10-digit numbers must start with 05 (Saudi Arabia)",
      };
    }
    // Remove leading 0 and store as 9 digits
    const formatted = cleaned.substring(1);
    return {
      isValid: true,
      formatted: formatted,
      countryCode: "+966",
      fullNumber: `+966${formatted}`,
      country: "SA",
    };
  }

  // 11 digits - Must start with 01 (Egypt)
  if (cleaned.length === 11) {
    if (!cleaned.startsWith("01")) {
      return {
        isValid: false,
        error: "11-digit numbers must start with 01 (Egypt)",
      };
    }
    return {
      isValid: true,
      formatted: cleaned,
      countryCode: "+20",
      fullNumber: `+20${cleaned}`,
      country: "EG",
    };
  }

  return {
    isValid: false,
    error: "Invalid phone number format",
  };
}

/**
 * Format phone number for display
 * @param {string} phoneNumber - Stored phone number
 * @returns {string} Formatted display string
 */
export function formatPhoneDisplay(phoneNumber) {
  const cleaned = phoneNumber.replace(/\D/g, "");

  if (cleaned.length === 9) {
    // Saudi: 5XX XXX XXX
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  } else if (cleaned.length === 11) {
    // Egypt: 01X XXXX XXXX
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 7)} ${cleaned.slice(7)}`;
  }

  return phoneNumber;
}

/**
 * Get country code from phone number
 * @param {string} phoneNumber - Phone number
 * @returns {string} Country code with +
 */
export function getCountryCode(phoneNumber) {
  const cleaned = phoneNumber.replace(/\D/g, "");

  if (
    cleaned.length === 9 ||
    (cleaned.length === 10 && cleaned.startsWith("05"))
  ) {
    return "+966";
  } else if (cleaned.length === 11 && cleaned.startsWith("01")) {
    return "+20";
  }

  return "+966"; // Default to Saudi Arabia
}
