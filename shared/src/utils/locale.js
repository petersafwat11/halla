/**
 * Locale helpers — platform-pure (no `react-native`, `next/*`, or
 * runtime DOM access). Safe to import from web, mobile, and tests.
 *
 * Halaa formatting policy (F-04, F-15):
 * - Gregorian calendar enforced across all locales (ca-gregory)
 * - Latin ASCII digits (0-9) enforced across all locales (nu-latn)
 * - No caller overrides permitted for calendar or numberingSystem
 * - Single canonical formatDate API (bare YYYY-MM-DD civil date vs instant)
 */

const _hasIntl = () =>
  typeof Intl !== "undefined" &&
  typeof Intl.NumberFormat === "function" &&
  typeof Intl.DateTimeFormat === "function";

const _normalizeLocale = (locale = "ar") => {
  const l = String(locale || "ar").toLowerCase();
  return l.startsWith("ar") ? "ar" : "en";
};

/**
 * Format a number per the locale's digit system.
 * Halaa policy (F-15): uses Latin digits (0-9) across all business metrics.
 * @param {number|string} n
 * @param {string} [locale="ar"] - "ar" or "en"
 * @param {Intl.NumberFormatOptions} [options]
 */
export const formatNumber = (n, locale = "ar", options = {}) => {
  if (n == null || n === "") return "";
  const value = Number(n);
  if (!Number.isFinite(value)) return normalizeDigits(String(n ?? ""));

  const lang = _normalizeLocale(locale);
  const { numberingSystem: _ignoredNu, ...callerOpts } = options || {};
  const opts = {
    ...callerOpts,
    numberingSystem: "latn",
  };
  const localeTag = lang === "ar" ? "ar-SA-u-nu-latn" : "en-US-u-nu-latn";

  if (_hasIntl()) {
    try {
      return new Intl.NumberFormat(localeTag, opts).format(value);
    } catch (_) {
      return value.toLocaleString("en-US", opts);
    }
  }
  return value.toLocaleString("en-US", opts);
};

/**
 * Format an integer count (e.g., guest count).
 */
export const formatCount = (n, locale = "ar", options = {}) =>
  formatNumber(n, locale, { maximumFractionDigits: 0, ...options });

/**
 * Format a percentage.
 * e.g. 15 -> "15%" in en, "15٪" in ar (Latin digits + Arabic percent glyph)
 */
export const formatPercent = (n, locale = "ar", options = {}) => {
  if (n == null || n === "") return "";
  const value = Number(n);
  if (!Number.isFinite(value)) return normalizeDigits(String(n));

  const lang = _normalizeLocale(locale);
  const formattedNum = formatNumber(value, lang, options);
  return lang === "ar" ? `${formattedNum}٪` : `${formattedNum}%`;
};

/**
 * Format a price as SAR (default) or another currency.
 */
export const formatCurrency = (n, locale = "ar", currency = "SAR", options = {}) => {
  if (n == null || n === "") return "";
  const value = Number(n);
  if (!Number.isFinite(value)) return normalizeDigits(String(n ?? ""));

  const lang = _normalizeLocale(locale);
  const localeTag = lang === "ar" ? "ar-SA-u-nu-latn" : "en-US-u-nu-latn";
  const { numberingSystem: _ignoredNu, ...callerOpts } = options || {};

  if (_hasIntl()) {
    try {
      return new Intl.NumberFormat(localeTag, {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
        ...callerOpts,
        numberingSystem: "latn",
      }).format(value);
    } catch (_) {
      // Fall through to manual formatting
    }
  }

  const formatted = formatNumber(value, lang, { maximumFractionDigits: 2, ...callerOpts });
  return lang === "ar" ? `${formatted} ${currency}` : `${currency} ${formatted}`;
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
 * Strict bare civil date parser (YYYY-MM-DD).
 * Validates year/month/day by round-trip, including leap years.
 * Returns null if the value is not a strictly valid bare civil date string.
 *
 * @param {string} value
 * @returns {{ year: number, month: number, day: number, utcDate: Date }|null}
 */
function _parseStrictCivilDate(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const utcDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  if (
    utcDate.getUTCFullYear() !== year ||
    utcDate.getUTCMonth() !== month - 1 ||
    utcDate.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day, utcDate };
}

/**
 * Format a Date, timestamp, ISO string, or bare civil date string (YYYY-MM-DD) as a localized date.
 * Enforces Gregorian calendar (F-04) and Latin digits (F-15). Caller calendar/numberingSystem options are rejected.
 *
 * Civil date contract:
 * - A bare string matching "YYYY-MM-DD" is strictly validated as a civil calendar date.
 * - Civil dates are calendar-day invariant: they never shift across timezones.
 * - Invalid bare date strings (e.g. "2026-02-29", "2026-04-31") return "".
 *
 * Instant contract:
 * - Date instances, epoch numbers, and ISO datetime strings are instants.
 * - Instants shift according to the requested timezone or local environment.
 *
 * @param {Date|string|number} input
 * @param {string} [locale="ar"]
 * @param {Intl.DateTimeFormatOptions} [options={}]
 * @returns {string}
 */
export const formatDate = (input, locale = "ar", options = {}) => {
  if (input == null || input === "") return "";

  const lang = _normalizeLocale(locale);
  const localeTag =
    lang === "ar"
      ? "ar-SA-u-ca-gregory-nu-latn"
      : "en-US-u-ca-gregory-nu-latn";

  // Enforce policy options: strip caller-supplied calendar/numberingSystem overrides
  const { calendar: _ignoredCal, numberingSystem: _ignoredNu, ...callerOpts } = options || {};

  const defaultOpts = {
    year: "numeric",
    month: "long",
    day: "numeric",
  };

  const isString = typeof input === "string";
  let targetDate;
  let finalOpts;

  if (isString) {
    const trimmed = input.trim();
    const isBarePattern = /^\d{4}-\d{2}-\d{2}$/.test(trimmed);
    if (isBarePattern) {
      const civil = _parseStrictCivilDate(trimmed);
      if (!civil) {
        return "";
      }
      targetDate = civil.utcDate;
      finalOpts = {
        ...defaultOpts,
        ...callerOpts,
        timeZone: "UTC",
        calendar: "gregory",
        numberingSystem: "latn",
      };
    } else {
      const d = new Date(trimmed);
      if (Number.isNaN(d.getTime())) return "";
      targetDate = d;
      finalOpts = {
        ...defaultOpts,
        ...callerOpts,
        calendar: "gregory",
        numberingSystem: "latn",
      };
    }
  } else if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) return "";
    targetDate = input;
    finalOpts = {
      ...defaultOpts,
      ...callerOpts,
      calendar: "gregory",
      numberingSystem: "latn",
    };
  } else if (typeof input === "number") {
    const d = new Date(input);
    if (Number.isNaN(d.getTime())) return "";
    targetDate = d;
    finalOpts = {
      ...defaultOpts,
      ...callerOpts,
      calendar: "gregory",
      numberingSystem: "latn",
    };
  } else {
    return "";
  }

  if (_hasIntl()) {
    try {
      return new Intl.DateTimeFormat(localeTag, finalOpts).format(targetDate);
    } catch (_) {
      // Fall through
    }
  }

  return targetDate.toLocaleDateString("en-US", finalOpts);
};

/**
 * Format a Date, ISO string, or stored time string (e.g. "6:30 AM", "6:30:AM", "18:30")
 * into a localized time string.
 * Output uses Latin digits (0-9) per Halaa policy (F-15).
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
    const raw = normalizeDigits(input).trim();
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
        return `${displayHours}:${displayMinutes} ${periodAr}`;
      } else {
        const periodEn = isPM ? "PM" : "AM";
        return `${displayHours}:${displayMinutes} ${periodEn}`;
      }
    }
  }

  // Otherwise, parse as Date
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) {
    return normalizeDigits(String(input));
  }

  const opts = {
    hour: "numeric",
    minute: "2-digit",
    numberingSystem: "latn",
    ...(options || {}),
  };

  const localeTag = lang === "ar" ? "ar-SA-u-nu-latn" : "en-US-u-nu-latn";

  if (_hasIntl()) {
    try {
      return new Intl.DateTimeFormat(localeTag, opts).format(date);
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
    return `${displayHours}:${displayMinutes} ${periodAr}`;
  }
  const periodEn = isPM ? "PM" : "AM";
  return `${displayHours}:${displayMinutes} ${periodEn}`;
};

/**
 * Format a Date or ISO string as a localized date+time.
 * Explicitly locks calendar to Gregorian (F-04) and digits to Latin (F-15).
 *
 * @param {Date|string|number} input
 * @param {string} [locale="ar"]
 * @param {Intl.DateTimeFormatOptions} [options]
 */
export const formatDateTime = (input, locale = "ar", options = {}) => {
  if (!input) return "";
  let date;
  if (input instanceof Date) {
    date = input;
  } else if (typeof input === "number") {
    date = new Date(input);
  } else if (typeof input === "string") {
    date = new Date(input);
  } else {
    return "";
  }

  if (Number.isNaN(date.getTime())) return "";

  const lang = _normalizeLocale(locale);
  const localeTag =
    lang === "ar"
      ? "ar-SA-u-ca-gregory-nu-latn"
      : "en-US-u-ca-gregory-nu-latn";

  const { calendar: _ignoredCal, numberingSystem: _ignoredNu, ...callerOpts } = options || {};

  const defaultOpts = {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };

  const opts = {
    ...defaultOpts,
    ...callerOpts,
    calendar: "gregory",
    numberingSystem: "latn",
  };

  if (_hasIntl()) {
    try {
      return new Intl.DateTimeFormat(localeTag, opts).format(date);
    } catch (_) {
      // Fall through
    }
  }
  return date.toLocaleString(lang === "ar" ? "ar-SA" : "en-US", opts);
};

/**
 * Returns an explicit policy locale tag for native date/time pickers.
 * Enforces Gregorian calendar and Latin digits at the platform picker boundary (F-04, F-15).
 *
 * @param {string} [locale="ar"]
 * @returns {string}
 */
export const getDatePickerLocale = (locale = "ar") => {
  const lang = _normalizeLocale(locale);
  return lang === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-US-u-ca-gregory-nu-latn";
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
 * Format guest count string per locale using Latin digits (F-15).
 *
 * @param {number|string} count
 * @param {string} [locale="ar"]
 * @returns {string}
 */
export const formatGuestCount = (count, locale = "ar") => {
  const n = Number(count) || 0;
  const lang = _normalizeLocale(locale);

  if (lang === "ar") {
    if (n === 0) return "لا يوجد ضيوف";
    if (n === 1) return "ضيف واحد";
    if (n === 2) return "ضيفان";
    if (n >= 3 && n <= 10) return `${n} ضيوف`;
    if (n >= 11 && n <= 99) return `${n} ضيفاً`;
    return `${n} ضيف`;
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
 * @returns {string}
 */
export const getLocalized = (obj, baseKey, locale = "ar", fallback = "") => {
  if (!obj || typeof obj !== "object") return fallback;
  const lang = _normalizeLocale(locale);
  const suffix = lang === "ar" ? "Ar" : "En";
  return obj[`${baseKey}${suffix}`] ?? fallback;
};

export default {
  formatDate,
  formatDateTime,
  formatTime,
  formatNumber,
  formatCurrency,
  formatPercent,
  formatCount,
  normalizeDigits,
  normalizeDigitsOnly,
  getDatePickerLocale,
  formatLocation,
  formatGuestCount,
  getLocalized,
};
