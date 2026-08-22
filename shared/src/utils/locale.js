/**
 * Locale helpers — platform-pure (no `react-native`, `next/*`, or
 * runtime DOM access). Safe to import from web, mobile, and tests.
 *
 * Numeric/currency/date formatters that respect the
 * user's locale. Arabic uses the `ar-SA` locale so numerals render as
 * `٠١٢٣٤٥٦٧٨٩`, Latin numerals stay `0-9` for `en`.
 *
 * Centralizing this means screens don't have to remember which locale
 * to pass — they import formatters (or pull `locale` from
 * the language context) and the helper does the right thing.
 */

const ARABIC_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

const _hasIntl = () =>
  typeof Intl !== "undefined" &&
  typeof Intl.NumberFormat === "function" &&
  typeof Intl.DateTimeFormat === "function";

const _toArabicDigits = (s) =>
  String(s).replace(/[0-9]/g, (d) => ARABIC_DIGITS[Number(d)]);

const _normalizeLocale = (locale = "ar") => {
  const l = String(locale || "ar").toLowerCase();
  return l.startsWith("ar") ? "ar" : "en";
};

/**
 * Format a number per the locale's digit system.
 * @param {number|string} n
 * @param {string} [locale="ar"] - "ar" or "en"
 * @param {Intl.NumberFormatOptions} [options]
 */
export const formatNumber = (n, locale = "ar", options = {}) => {
  if (n == null || n === "") return "";
  const value = Number(n);
  if (!Number.isFinite(value)) return String(n ?? "");

  const lang = _normalizeLocale(locale);
  if (lang === "ar") {
    if (_hasIntl()) {
      try {
        return new Intl.NumberFormat("ar-SA", options).format(value);
      } catch (_) {
        return _toArabicDigits(value.toLocaleString("en-US", options));
      }
    }
    return _toArabicDigits(value.toLocaleString("en-US", options));
  }

  if (_hasIntl()) {
    try {
      return new Intl.NumberFormat("en-US", options).format(value);
    } catch (_) {
      return value.toLocaleString("en-US", options);
    }
  }
  return value.toLocaleString("en-US", options);
};

/**
 * Format an integer count (e.g., guest count).
 */
export const formatCount = (n, locale = "ar") =>
  formatNumber(n, locale, { maximumFractionDigits: 0 });

/**
 * Format a percentage.
 * e.g. 15 -> "15%" in en, "١٥٪" in ar
 */
export const formatPercent = (n, locale = "ar", options = {}) => {
  if (n == null || n === "") return "";
  const value = Number(n);
  if (!Number.isFinite(value)) return String(n);

  const lang = _normalizeLocale(locale);
  const formattedNum = formatNumber(value, lang, options);
  return lang === "ar" ? `${formattedNum}٪` : `${formattedNum}%`;
};

/**
 * Format a price as SAR (default) or another currency.
 */
export const formatCurrency = (n, locale = "ar", currency = "SAR") => {
  if (n == null || n === "") return "";
  const value = Number(n);
  if (!Number.isFinite(value)) return String(n ?? "");

  const lang = _normalizeLocale(locale);
  if (_hasIntl()) {
    try {
      return new Intl.NumberFormat(lang === "ar" ? "ar-SA" : "en-US", {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }).format(value);
    } catch (_) {
      // Fall through to manual formatting
    }
  }

  const formatted = formatNumber(value, lang, { maximumFractionDigits: 2 });
  return lang === "ar" ? `${formatted} ${currency}` : `${currency} ${formatted}`;
};

/**
 * Convert any string with Latin digits to the locale's preferred digits.
 */
export const localizeDigits = (input, locale = "ar") => {
  if (input == null) return "";
  const lang = _normalizeLocale(locale);
  if (lang === "ar") return _toArabicDigits(input);
  return String(input);
};

/**
 * Normalizes input digits by converting Eastern Arabic / Arabic-Indic digits (٠-٩, ۰-۹)
 * to standard Latin ASCII digits (0-9), with optional stripping of non-digit characters.
 *
 * @param {string|number} input - Raw input string or number
 * @param {Object} [options]
 * @param {boolean} [options.stripNonDigits=false]
 * @returns {string}
 */
export const normalizeDigits = (input, { stripNonDigits = false } = {}) => {
  if (input === null || input === undefined) return "";
  let str = String(input);
  str = str.replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660));
  str = str.replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06F0));
  if (stripNonDigits) {
    return str.replace(/\D/g, "");
  }
  return str;
};

/**
 * Normalizes input digits to ASCII digits and strips all non-digit characters (e.g. separators, spaces).
 * Useful for card numbers, national IDs, IBAN numeric parts, OTPs, and phone inputs.
 *
 * @param {string|number} input
 * @returns {string} Pure ASCII digits
 */
export const normalizeDigitsOnly = (input) => normalizeDigits(input, { stripNonDigits: true });


/**
 * Format a Date, timestamp, or ISO string as a localized date.
 *
 * @param {Date|string|number} input
 * @param {string} [locale="ar"]
 * @param {Intl.DateTimeFormatOptions} [options]
 */
export const formatDate = (input, locale = "ar", options) => {
  if (!input) return "";
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return "";

  const lang = _normalizeLocale(locale);
  const opts = options ?? {
    year: "numeric",
    month: "short",
    day: "numeric",
  };

  if (_hasIntl()) {
    try {
      return new Intl.DateTimeFormat(lang === "ar" ? "ar-SA" : "en-US", opts).format(date);
    } catch (_) {
      // Fall through
    }
  }

  const enStr = date.toLocaleDateString("en-US", opts);
  return lang === "ar" ? _toArabicDigits(enStr) : enStr;
};

/**
 * Format a Date, ISO string, or stored time string (e.g. "6:30 AM", "6:30:AM", "18:30")
 * into a localized time string.
 *
 * @param {Date|string|number} input
 * @param {string} [locale="ar"]
 * @param {Intl.DateTimeFormatOptions} [options]
 */
export const formatTime = (input, locale = "ar", options) => {
  if (!input) return "";
  const lang = _normalizeLocale(locale);

  // If input is a string that represents a time string like "6:30 AM", "6:30:AM", "18:30"
  if (typeof input === "string") {
    const raw = input.trim();
    // Match "H:MM", "H:MM:SS", "H:MM AM/PM", "H:MM:AM/PM"
    const match = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?(?::)?\s*(AM|PM|am|pm|صباحاً|مساءً|ص|م)?$/i);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const period = match[3] ? match[3].toUpperCase() : null;

      let isPM = false;
      if (period) {
        if (period === "PM" || period === "مساءً" || period === "م") {
          isPM = true;
          if (hours < 12) hours += 12;
        } else if (period === "AM" || period === "صباحاً" || period === "ص") {
          isPM = false;
          if (hours === 12) hours = 0;
        }
      } else {
        isPM = hours >= 12;
      }

      const displayHours = hours % 12 || 12;
      const displayMinutes = minutes < 10 ? `0${minutes}` : String(minutes);

      if (lang === "ar") {
        const periodAr = isPM ? "م" : "ص";
        return `${_toArabicDigits(displayHours)}:${_toArabicDigits(displayMinutes)} ${periodAr}`;
      } else {
        const periodEn = isPM ? "PM" : "AM";
        return `${displayHours}:${displayMinutes} ${periodEn}`;
      }
    }
  }

  // Otherwise, parse as Date
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) {
    // If not a valid date, return raw string with localized digits if Arabic
    return lang === "ar" ? _toArabicDigits(input) : String(input);
  }

  const opts = options ?? {
    hour: "numeric",
    minute: "2-digit",
  };

  if (_hasIntl()) {
    try {
      return new Intl.DateTimeFormat(lang === "ar" ? "ar-SA" : "en-US", opts).format(date);
    } catch (_) {
      // Fall through
    }
  }

  const hours = date.getHours();
  const minutes = date.getMinutes();
  const isPM = hours >= 12;
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes < 10 ? `0${minutes}` : String(minutes);

  if (lang === "ar") {
    const periodAr = isPM ? "م" : "ص";
    return `${_toArabicDigits(displayHours)}:${_toArabicDigits(displayMinutes)} ${periodAr}`;
  }
  const periodEn = isPM ? "PM" : "AM";
  return `${displayHours}:${displayMinutes} ${periodEn}`;
};

/**
 * Format a Date or ISO string as a localized date+time.
 *
 * @param {Date|string|number} input
 * @param {string} [locale="ar"]
 * @param {Intl.DateTimeFormatOptions} [options]
 */
export const formatDateTime = (input, locale = "ar", options) => {
  if (!input) return "";
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return "";

  const lang = _normalizeLocale(locale);
  const opts = options ?? {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };

  if (_hasIntl()) {
    try {
      return new Intl.DateTimeFormat(lang === "ar" ? "ar-SA" : "en-US", opts).format(date);
    } catch (_) {
      // Fall through
    }
  }
  return date.toLocaleString(lang === "ar" ? "ar-SA" : "en-US", opts);
};

/**
 * Format and de-duplicate address / location tokens.
 *
 * @param {object|string|Array<string>} input - { name, address, city } or string or array
 * @param {string} [locale="ar"]
 * @returns {string}
 */
export const formatLocation = (input, locale = "ar") => {
  if (!input) return "";
  const lang = _normalizeLocale(locale);
  const separator = lang === "ar" ? "، " : ", ";

  let rawTokens = [];

  if (typeof input === "string") {
    rawTokens = input.split(/[,،]/);
  } else if (Array.isArray(input)) {
    rawTokens = input.flatMap((item) =>
      typeof item === "string" ? item.split(/[,،]/) : []
    );
  } else if (typeof input === "object") {
    const { name, address, city } = input;
    if (name) rawTokens.push(...String(name).split(/[,،]/));
    if (address) rawTokens.push(...String(address).split(/[,،]/));
    if (city) rawTokens.push(...String(city).split(/[,،]/));
  }

  // Clean, trim, and de-duplicate tokens while preserving first-seen order
  const seen = new Set();
  const normalizedTokens = [];

  for (const token of rawTokens) {
    if (!token) continue;
    const trimmed = String(token).trim();
    if (!trimmed) continue;
    const normalizedKey = trimmed.toLowerCase();
    if (!seen.has(normalizedKey)) {
      seen.add(normalizedKey);
      normalizedTokens.push(trimmed);
    }
  }

  return normalizedTokens.join(separator);
};

/**
 * Format guest count string per locale.
 *
 * @param {number|string} count
 * @param {string} [locale="ar"]
 */
export const formatGuestCount = (count, locale = "ar") => {
  const n = Number(count) || 0;
  const lang = _normalizeLocale(locale);

  if (lang === "ar") {
    if (n === 0) return "لا يوجد ضيوف";
    if (n === 1) return "ضيف واحد";
    if (n === 2) return "ضيفان";
    const formattedN = _toArabicDigits(n);
    if (n >= 3 && n <= 10) return `${formattedN} ضيوف`;
    if (n >= 11 && n <= 99) return `${formattedN} ضيفاً`;
    return `${formattedN} ضيف`;
  }

  if (n === 1) return "1 guest";
  return `${n} guests`;
};

/**
 * Picks the localized variant of a bilingual field on a backend object.
 *
 * @param {object} obj — source object (plan, feature, badge, etc.)
 * @param {string} baseKey — field root, e.g. "name", "description", "label"
 * @param {string} [locale="ar"] — i18n language code
 * @param {string} [fallback=""] — returned when both variants are missing
 */
export const getLocalized = (obj, baseKey, locale = "ar", fallback = "") => {
  if (!obj || typeof obj !== "object") return fallback;
  const lang = _normalizeLocale(locale);
  const suffix = lang === "ar" ? "Ar" : "En";
  return obj[`${baseKey}${suffix}`] ?? fallback;
};

export default {
  formatNumber,
  formatCount,
  formatPercent,
  formatCurrency,
  localizeDigits,
  formatDate,
  formatTime,
  formatDateTime,
  formatLocation,
  formatGuestCount,
  getLocalized,
};
