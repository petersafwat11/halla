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
  const opts = {
    ...options,
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
export const formatCount = (n, locale = "ar") =>
  formatNumber(n, locale, { maximumFractionDigits: 0 });

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
export const formatCurrency = (n, locale = "ar", currency = "SAR") => {
  if (n == null || n === "") return "";
  const value = Number(n);
  if (!Number.isFinite(value)) return normalizeDigits(String(n ?? ""));

  const lang = _normalizeLocale(locale);
  const localeTag = lang === "ar" ? "ar-SA-u-nu-latn" : "en-US-u-nu-latn";
  if (_hasIntl()) {
    try {
      return new Intl.NumberFormat(localeTag, {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
        numberingSystem: "latn",
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
 * Under Latin digit policy (F-15), Halaa normalizes all digits to standard Latin ASCII.
 */
export const localizeDigits = (input, _locale = "ar") => {
  if (input == null) return "";
  return normalizeDigits(input);
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
 * Parse an input value into a Date instance, preserving civil date values (YYYY-MM-DD
 * or UTC midnight Date) without UTC rollover shifts across timezones.
 *
 * @param {Date|string|number} value - Date, timestamp, or ISO / civil string
 * @param {string} [timeZone] - Optional explicit IANA timezone name
 * @returns {Date|null}
 */
export const parseCivilDate = (value, timeZone) => {
  if (value == null || value === "") return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    // Civil date string: "2026-08-31" or "2026-08-31T00:00:00..."
    const civilMatch = trimmed.match(
      /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](?:00:00(?::00(?:\.000)?)?(?:Z|[+-]00:?00)?)?)?$/
    );
    if (civilMatch) {
      const year = parseInt(civilMatch[1], 10);
      const month = parseInt(civilMatch[2], 10) - 1;
      const day = parseInt(civilMatch[3], 10);
      if (timeZone) {
        return new Date(Date.UTC(year, month, day, 12, 0, 0));
      }
      return new Date(year, month, day, 12, 0, 0);
    }
  } else if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    // Check if it's UTC midnight (a date-only value stored in UTC)
    if (
      value.getUTCHours() === 0 &&
      value.getUTCMinutes() === 0 &&
      value.getUTCSeconds() === 0 &&
      value.getUTCMilliseconds() === 0
    ) {
      if (timeZone) {
        return new Date(
          Date.UTC(
            value.getUTCFullYear(),
            value.getUTCMonth(),
            value.getUTCDate(),
            12,
            0,
            0
          )
        );
      }
      return new Date(
        value.getUTCFullYear(),
        value.getUTCMonth(),
        value.getUTCDate(),
        12,
        0,
        0
      );
    }
    return value;
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

/**
 * Formats an event date explicitly using the Gregorian calendar and Latin digits (0-9).
 * F-04: explicitly locks to Gregorian calendar to prevent runtime fallback to Islamic calendar.
 * F-15: explicitly locks to Latin numbering system (nu-latn).
 *
 * Contract:
 *   Arabic locale:  "ar-SA-u-ca-gregory-nu-latn"
 *   English locale: "en-US-u-ca-gregory-nu-latn"
 *   always passes calendar: "gregory"
 *
 * @param {Date|string|number} value - Date, timestamp, or civil date string
 * @param {string} [language="ar"] - "ar" or "en"
 * @param {Intl.DateTimeFormatOptions} [options]
 * @returns {string} Formatted date string, e.g. "31 أغسطس 2026" or "August 31, 2026"
 */
export const formatEventDate = (value, language = "ar", options = {}) => {
  if (value == null || value === "") return "";
  const date = parseCivilDate(value, options?.timeZone);
  if (!date || Number.isNaN(date.getTime())) return "";

  const lang = _normalizeLocale(language);
  const localeTag =
    lang === "ar"
      ? "ar-SA-u-ca-gregory-nu-latn"
      : "en-US-u-ca-gregory-nu-latn";

  const defaultOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
  };

  const opts = {
    ...defaultOptions,
    ...options,
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

  return date.toLocaleDateString("en-US", opts);
};

/**
 * Format a Date, timestamp, or ISO string as a localized date.
 * Explicitly locks calendar to Gregorian (F-04) and digits to Latin (F-15).
 *
 * @param {Date|string|number} input
 * @param {string} [locale="ar"]
 * @param {Intl.DateTimeFormatOptions} [options]
 */
export const formatDate = (input, locale = "ar", options) => {
  if (!input) return "";
  const date = parseCivilDate(input, options?.timeZone);
  if (!date || Number.isNaN(date.getTime())) return "";

  const lang = _normalizeLocale(locale);
  const opts = {
    year: "numeric",
    month: "short",
    day: "numeric",
    calendar: "gregory",
    numberingSystem: "latn",
    ...(options || {}),
  };

  const localeTag =
    lang === "ar"
      ? "ar-SA-u-ca-gregory-nu-latn"
      : "en-US-u-ca-gregory-nu-latn";

  if (_hasIntl()) {
    try {
      return new Intl.DateTimeFormat(localeTag, opts).format(date);
    } catch (_) {
      // Fall through
    }
  }

  return date.toLocaleDateString("en-US", opts);
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
export const formatDateTime = (input, locale = "ar", options) => {
  if (!input) return "";
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return "";

  const lang = _normalizeLocale(locale);
  const opts = {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    calendar: "gregory",
    numberingSystem: "latn",
    ...(options || {}),
  };

  const localeTag =
    lang === "ar"
      ? "ar-SA-u-ca-gregory-nu-latn"
      : "en-US-u-ca-gregory-nu-latn";

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
  parseCivilDate,
  formatEventDate,
  formatDate,
  formatTime,
  formatDateTime,
  formatLocation,
  formatGuestCount,
  getLocalized,
};
