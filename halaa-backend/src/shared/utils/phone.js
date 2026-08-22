/**
 * Phone Number Utilities
 * Pure helper functions for phone number normalization and E.164 formatting
 * @module shared/utils/phone
 */

/**
 * Normalize phone number to international digit string (without leading +)
 * Supports Saudi Arabia (+966) and Egypt (+20)
 *
 * @param {string} phoneNumber - Raw phone number input
 * @returns {string} Normalized phone number with country code
 */
const normalizePhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return '';

  let cleaned = String(phoneNumber).replace(/\s+/g, '').replace(/[-()]/g, '');

  // Remove leading 00 international prefix if present
  if (cleaned.startsWith('00')) {
    cleaned = cleaned.slice(2);
  }

  const hasPlus = cleaned.startsWith('+');
  let digits = cleaned.replace(/\D/g, '');

  if (!digits) return '';

  // Handle Saudi prefix with accidental redundant leading zero (e.g. 96605...)
  if (digits.startsWith('96605') && digits.length === 13) {
    digits = '966' + digits.slice(4);
  }
  // Handle Egypt prefix with accidental redundant leading zero (e.g. 2001...)
  if (digits.startsWith('2001') && digits.length === 13) {
    digits = '20' + digits.slice(3);
  }

  // If leading plus or explicit country code was given:
  if (hasPlus || digits.startsWith('966') || digits.startsWith('20')) {
    return digits;
  }

  // Saudi Arabia: 10 digits starting with 05 -> remove 0, add 966
  if (digits.startsWith('05') && digits.length === 10) {
    return '966' + digits.slice(1);
  }
  // Saudi Arabia: 9 digits starting with 5 -> add 966
  if (digits.startsWith('5') && digits.length === 9) {
    return '966' + digits;
  }
  // Egypt: 11 digits starting with 01 -> remove leading 0, add 20
  if (digits.startsWith('01') && digits.length === 11) {
    return '20' + digits.slice(1);
  }
  // Egypt: 10 digits starting with 1 -> add 20
  if (digits.startsWith('1') && digits.length === 10) {
    return '20' + digits;
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
const toE164 = (phoneNumber) => {
  if (!phoneNumber) return '';
  const normalized = normalizePhoneNumber(phoneNumber);
  if (!normalized) return '';
  return normalized.startsWith('+') ? normalized : `+${normalized}`;
};

/**
 * Validate and format phone number
 * @param {string} phoneNumber - Raw phone number input
 * @returns {Object} { isValid, formatted, e164, countryCode, country, error }
 */
const validateAndFormatPhone = (phoneNumber) => {
  if (!phoneNumber) {
    return { isValid: false, error: 'Phone number is required' };
  }

  const normalized = normalizePhoneNumber(phoneNumber);

  // Saudi check: 966 followed by 9 digits starting with 5 (total 12 digits)
  if (normalized.startsWith('966')) {
    const nat = normalized.slice(3);
    if (nat.length === 9 && nat.startsWith('5')) {
      return {
        isValid: true,
        formatted: normalized,
        e164: `+${normalized}`,
        countryCode: '+966',
        country: 'SA',
      };
    }
    return {
      isValid: false,
      error: 'Saudi numbers must be +966 followed by 9 digits starting with 5',
    };
  }

  // Egypt check: 20 followed by 10 digits starting with 1 (total 12 digits)
  if (normalized.startsWith('20')) {
    const nat = normalized.slice(2);
    if (nat.length === 10 && nat.startsWith('1')) {
      return {
        isValid: true,
        formatted: normalized,
        e164: `+${normalized}`,
        countryCode: '+20',
        country: 'EG',
      };
    }
    return {
      isValid: false,
      error: 'Egyptian numbers must be +20 followed by 10 digits starting with 1',
    };
  }

  return {
    isValid: false,
    error: 'Unsupported country code. Supported: +966 (Saudi), +20 (Egypt)',
  };
};

/**
 * Check if phone number is valid
 * @param {string} phoneNumber
 * @returns {boolean}
 */
const isValidPhone = (phoneNumber) => {
  return validateAndFormatPhone(phoneNumber).isValid;
};

/**
 * Mongoose validator for phone numbers
 * @param {string} value
 * @returns {boolean}
 */
const mongoosePhoneValidator = (value) => {
  if (!value) return true;
  return validateAndFormatPhone(value).isValid;
};

module.exports = {
  normalizePhoneNumber,
  toE164,
  validateAndFormatPhone,
  isValidPhone,
  mongoosePhoneValidator,
};

