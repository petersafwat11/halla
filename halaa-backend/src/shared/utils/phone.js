/**
 * Phone Number Utilities
 * Pure helper functions for phone number normalization
 * @module shared/utils/phone
 */

/**
 * Normalize phone number to international format
 * Supports Saudi Arabia (+966) and Egypt (+20)
 *
 * @param {string} phoneNumber - Raw phone number input
 * @returns {string} Normalized phone number with country code
 */
const normalizePhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return '';
  
  let normalized = phoneNumber.replace(/\s+/g, '').replace(/-/g, '');

  // Remove all non-digit characters except leading +
  const hasPlus = normalized.startsWith('+');
  normalized = normalized.replace(/\D/g, '');

  // Add country code if not present
  if (!hasPlus) {
    // Saudi Arabia: 10 digits starting with 05 -> remove 0, add 966
    if (normalized.startsWith('05') && normalized.length === 10) {
      normalized = '966' + normalized.slice(1);
    }
    // Saudi Arabia: 9 digits starting with 5 -> add 966
    else if (normalized.startsWith('5') && normalized.length === 9) {
      normalized = '966' + normalized;
    }
    // Egypt: 11 digits starting with 01 -> remove leading 0, add 20
    else if (normalized.startsWith('01') && normalized.length === 11) {
      normalized = '20' + normalized.slice(1);
    }
    // Already has country code (starts with 966)
    else if (normalized.startsWith('966')) {
      // Keep as is
    }
    // Already has country code (starts with 20 for Egypt)
    else if (normalized.startsWith('20') && normalized.length === 12) {
      // Keep as is
    }
  }

  return normalized;
};

/**
 * Validate and format phone number
 * @param {string} phoneNumber - Raw phone number input
 * @returns {Object} { isValid, formatted, countryCode, error }
 */
const validateAndFormatPhone = (phoneNumber) => {
  if (!phoneNumber) {
    return { isValid: false, error: 'Phone number is required' };
  }

  const cleaned = phoneNumber.replace(/\s+/g, '').replace(/-/g, '');
  const digits = cleaned.replace(/\D/g, '');
  const hasPlus = cleaned.startsWith('+');

  // Already international format or starts with country code
  if (hasPlus || digits.startsWith('966') || (digits.startsWith('20') && digits.length >= 12)) {
    const raw = digits.startsWith('966') ? digits : (digits.startsWith('20') ? digits : digits);
    // Saudi
    if (digits.startsWith('966')) {
      const nat = digits.substring(3);
      if (nat.length === 9 && nat.startsWith('5')) {
        return { isValid: true, formatted: `966${nat}`, countryCode: '+966', country: 'SA' };
      }
      return { isValid: false, error: 'Saudi numbers must be +966 followed by 9 digits starting with 5' };
    }
    // Egypt
    if (digits.startsWith('20')) {
      const nat = digits.substring(2);
      if (nat.length === 10 && nat.startsWith('1')) {
        return { isValid: true, formatted: `20${nat}`, countryCode: '+20', country: 'EG' };
      }
      return { isValid: false, error: 'Egyptian numbers must be +20 followed by 10 digits starting with 1' };
    }
    return { isValid: false, error: 'Unsupported country code. Supported: +966 (Saudi), +20 (Egypt)' };
  }

  // 9 digits starting with 5 -> Saudi
  if (digits.length === 9 && digits.startsWith('5')) {
    return { isValid: true, formatted: `966${digits}`, countryCode: '+966', country: 'SA' };
  }
  // 10 digits starting with 05 -> Saudi
  if (digits.length === 10 && digits.startsWith('05')) {
    return { isValid: true, formatted: `966${digits.substring(1)}`, countryCode: '+966', country: 'SA' };
  }
  // 11 digits starting with 01 -> Egypt
  if (digits.length === 11 && digits.startsWith('01')) {
    return { isValid: true, formatted: `20${digits.substring(1)}`, countryCode: '+20', country: 'EG' };
  }

  return { isValid: false, error: 'Invalid phone number format' };
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
  validateAndFormatPhone,
  mongoosePhoneValidator,
};
