/**
 * Locale helpers for mobile.
 *
 * Phase 4 W0-RTL: numeric/currency/date formatters that respect the
 * user's locale. Arabic uses the `ar-SA` locale so numerals render as
 * `٠١٢٣٤٥٦٧٨٩`, Latin numerals stay `0-9` for `en`.
 *
 * Centralizing this means screens don't have to remember which locale
 * to pass — they import `formatNumber(n, locale)` (or pull `locale` from
 * the language context) and the helper does the right thing.
 *
 * NOTE: `Intl.NumberFormat` is supported in modern React Native (Hermes
 * has full Intl since RN 0.74). On older runtimes the helpers fall back
 * to a manual digit-substitution table.
 */

const ARABIC_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

const _hasIntl = () =>
  typeof Intl !== "undefined" &&
  typeof Intl.NumberFormat === "function";

const _toArabicDigits = (s) =>
  String(s).replace(/[0-9]/g, (d) => ARABIC_DIGITS[Number(d)]);

/**
 * Format a number per the locale's digit system.
 * @param {number|string} n
 * @param {string} [locale="ar"] - "ar" or "en"
 * @param {Intl.NumberFormatOptions} [options]
 */
export const formatNumber = (n, locale = "ar", options = {}) => {
  const value = Number(n);
  if (!Number.isFinite(value)) return String(n ?? "");

  if (locale === "ar") {
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
 * Format an integer count (e.g., guest count). Arabic locale → Arabic
 * numerals; otherwise `n.toLocaleString('en-US')`.
 */
export const formatCount = (n, locale = "ar") =>
  formatNumber(n, locale, { maximumFractionDigits: 0 });

/**
 * Format a price as SAR (default) or another currency. Arabic locale
 * gets Arabic numerals + the SAR sign; English gets the standard sign.
 */
export const formatCurrency = (n, locale = "ar", currency = "SAR") => {
  const value = Number(n);
  if (!Number.isFinite(value)) return String(n ?? "");

  if (_hasIntl()) {
    try {
      return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US", {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }).format(value);
    } catch (_) {
      // Fall through to manual formatting
    }
  }

  const formatted = formatNumber(value, locale, { maximumFractionDigits: 2 });
  return locale === "ar" ? `${formatted} ${currency}` : `${currency} ${formatted}`;
};

/**
 * Convert any string with Latin digits to the locale's preferred digits.
 * Useful for already-formatted strings (e.g. backend-supplied dates).
 */
export const localizeDigits = (input, locale = "ar") => {
  if (input == null) return "";
  if (locale === "ar") return _toArabicDigits(input);
  return String(input);
};

/**
 * Format a Date or ISO string as a localized date+time. The host's
 * device timezone is used; this matches Phase 1's "convert at display
 * time" rule.
 *
 * @param {Date|string|number} input
 * @param {string} [locale="ar"]
 * @param {Intl.DateTimeFormatOptions} [options]
 */
export const formatDateTime = (input, locale = "ar", options) => {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return "";

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
      return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-US", opts).format(date);
    } catch (_) {
      // Fall through
    }
  }
  return date.toLocaleString(locale === "ar" ? "ar-SA" : "en-US", opts);
};

export default {
  formatNumber,
  formatCount,
  formatCurrency,
  localizeDigits,
  formatDateTime,
};
