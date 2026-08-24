/**
 * Display-token builders — isolated, formatted display strings for mixed
 * values rendered inside localized UI (remediation blueprint Priority 0 #4
 * and §6: counts, ratios and prices are atomic tokens).
 *
 * Platform-pure (no react-native/next imports). Safe for Node tests.
 */

import { formatNumber } from "./locale.js";
import { formatSar } from "./money.js";
import { isolateLtr, isolateRtl } from "./bidi.js";

/**
 * Locale-formatted single count as an isolated token.
 * "٥" in ar, "5" in en — never reorders against surrounding copy.
 *
 * @param {number|string} count
 * @param {string} [locale="ar"]
 * @returns {string}
 */
export const countToken = (count, locale = "ar") =>
  isolateLtr(formatNumber(count ?? 0, locale, { maximumFractionDigits: 0 }));

/**
 * Used/limit ratio ("١ / ٥") as ONE stable LTR-isolated token so the slash
 * cannot BiDi-reorder or mix digit policies between the two numbers.
 * Pass `limit = null` for an unlimited marker string (e.g. "∞").
 *
 * @param {number|string} used
 * @param {number|string|null} limit
 * @param {string} [locale="ar"]
 * @returns {string}
 */
export const countRatioToken = (used, limit, locale = "ar") => {
  const usedPart = formatNumber(used ?? 0, locale, { maximumFractionDigits: 0 });
  const limitPart =
    limit == null
      ? "∞"
      : formatNumber(limit, locale, { maximumFractionDigits: 0 });
  return isolateLtr(`${usedPart} / ${limitPart}`);
};

/**
 * Price as ONE atomic LTR-isolated token: formatted SAR number + currency
 * label. Prices keep stable Latin digits regardless of UI locale — matching
 * the store SDK's own price strings. A store-provided string can be passed
 * verbatim via `priceString` (native IAP); it is only isolated, never rebuilt.
 *
 * @param {number|string} [amount]
 * @param {string} [currencyLabel="ر.س"] - localized currency label/glyph text
 * @param {{ trimTrailingZeros?: boolean, priceString?: string|null }} [options]
 * @returns {string}
 */
export const priceToken = (
  amount,
  currencyLabel = "ر.س",
  { trimTrailingZeros = true, priceString = null } = {}
) => {
  if (priceString != null && priceString !== "") {
    return isolateLtr(String(priceString));
  }
  const numeric = formatSar(amount ?? 0, {
    trimTrailingZeros,
    decimals: 2,
  });
  return isolateLtr(currencyLabel ? `${numeric} ${currencyLabel}` : numeric);
};

/**
 * Percent token that follows the locale script direction:
 * Arabic percent is an RTL token; Latin percent stays LTR (blueprint §5C).
 *
 * @param {number|string} value
 * @param {string} [locale="ar"]
 * @returns {string}
 */
export const percentToken = (value, locale = "ar") => {
  const lang = String(locale || "ar").toLowerCase().startsWith("ar") ? "ar" : "en";
  const formatted = formatNumber(value ?? 0, lang, { maximumFractionDigits: 0 });
  const withSign = lang === "ar" ? `${formatted}٪` : `${formatted}%`;
  return lang === "ar" ? isolateRtl(withSign) : isolateLtr(withSign);
};

export default {
  countToken,
  countRatioToken,
  priceToken,
  percentToken,
};
