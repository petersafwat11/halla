import { useTranslation } from "../localization";

/**
 * Shared direction-aware input contract (remediation plan §3A / blueprint §5).
 *
 * Content-direction policies for native text inputs:
 *  - "localized" (default): placeholder and value follow the current locale
 *    (RTL in Arabic, LTR in English). Used for app-authored localized copy.
 *  - "adaptive": arbitrary user/backend content — placeholder follows the
 *    locale while empty; a filled value follows its first strong Arabic or
 *    Latin character (fallback: app locale). Person/business names, event
 *    titles, addresses, search queries, free descriptions.
 *  - "ltr": intrinsically LTR content — email, URL, IDs, card data, OTP,
 *    raw time/amount, stored canonical strings.
 *  - "rtl": explicitly Arabic-only content.
 *  - "phone": localized placeholder while empty, LTR digits once non-empty.
 *
 * The resolver returns explicit `writingDirection` (iOS base direction for
 * both value and placeholder) while keeping `textAlign: "auto"` so alignment
 * follows the logical reading start. Merge it BEFORE caller styles so
 * caller-provided intentional styles always win.
 */

export const CONTENT_DIRECTIONS = {
  LOCALIZED: "localized",
  ADAPTIVE: "adaptive",
  LTR: "ltr",
  RTL: "rtl",
  PHONE: "phone",
};

/**
 * Unicode ranges that count as "strong" for first-strong detection.
 * Arabic script blocks plus Latin basic/extended; everything else — digits,
 * punctuation, symbols, emoji, whitespace — is neutral and skipped.
 */
const STRONG_RTL_PATTERN = new RegExp(
  "[\\u0600-\\u06FF\\u0750-\\u077F\\u08A0-\\u08FF\\uFB50-\\uFDFF\\uFE70-\\uFEFF]"
);
const STRONG_LTR_PATTERN = new RegExp("[A-Za-z\\u00C0-\\u024F\\u1E00-\\u1EFF]");

/**
 * Pure first-strong resolver (blueprint §5.1) — kept local and dependency-free
 * so it stays importable under plain Node (see the input-direction test
 * harness). Scans for the first strong Arabic or Latin character, ignoring
 * whitespace, digits, punctuation, emoji and symbols. Falls back to the
 * selected locale (`fallbackIsRTL`) when there is no strong character at all.
 *
 * @param {string} [value]
 * @param {boolean} [fallbackIsRTL]
 * @returns {"ltr" | "rtl"}
 */
export const resolveStrongDirection = (value, fallbackIsRTL = false) => {
  const source = String(value ?? "");
  for (const character of source) {
    if (STRONG_RTL_PATTERN.test(character)) return "rtl";
    if (STRONG_LTR_PATTERN.test(character)) return "ltr";
  }
  return fallbackIsRTL ? "rtl" : "ltr";
};

/**
 * Pure resolver — node-testable, no React/RN imports.
 *
 * @param {string} contentDirection - one of CONTENT_DIRECTIONS (default "localized")
 * @param {{ isRTL?: boolean, hasValue?: boolean, value?: string }} [state]
 * @returns {{ textAlign: "auto", writingDirection: "ltr" | "rtl" }}
 */
export const resolveInputDirection = (
  contentDirection = CONTENT_DIRECTIONS.LOCALIZED,
  { isRTL = false, hasValue = false, value = "" } = {}
) => {
  let writingDirection;

  switch (contentDirection) {
    case CONTENT_DIRECTIONS.LTR:
      writingDirection = "ltr";
      break;
    case CONTENT_DIRECTIONS.RTL:
      writingDirection = "rtl";
      break;
    case CONTENT_DIRECTIONS.ADAPTIVE:
      // Empty → placeholder follows the UI locale; filled → the value's first
      // strong character, falling back to the UI locale when neutral-only.
      writingDirection =
        hasValue || value
          ? resolveStrongDirection(value, isRTL)
          : isRTL
            ? "rtl"
            : "ltr";
      break;
    case CONTENT_DIRECTIONS.PHONE:
      // Localized placeholder while empty; stable LTR digits once typing.
      writingDirection = hasValue ? "ltr" : isRTL ? "rtl" : "ltr";
      break;
    case CONTENT_DIRECTIONS.LOCALIZED:
    default:
      writingDirection = isRTL ? "rtl" : "ltr";
      break;
  }

  return { textAlign: "auto", writingDirection };
};

/**
 * React hook flavour — resolves the direction style for the active locale.
 *
 * @param {string} contentDirection - one of CONTENT_DIRECTIONS
 * @param {{ hasValue?: boolean, value?: string }} [state]
 */
export const useInputDirection = (
  contentDirection = CONTENT_DIRECTIONS.LOCALIZED,
  { hasValue = false, value = "" } = {}
) => {
  const { isRTL } = useTranslation();
  return resolveInputDirection(contentDirection, { isRTL, hasValue, value });
};

/**
 * Pure label direction resolver — resolves alignment & writing direction for form labels.
 *
 * React Native mirrors the physical `left`/`right` text-align values when the
 * native layout is RTL: `left` behaves as logical start and `right` as logical
 * end. Therefore localized UI chrome must use `left` in both locales. Returning
 * `right` for Arabic double-mirrors it to the left on Android, which is the
 * regression that made Step 1 disagree with the untouched Step 2 fields.
 *
 * Labels/helpers/errors ALWAYS follow the UI locale — they never inherit the
 * direction of an adaptive/LTR/phone value (blueprint §5.1).
 *
 * @param {string} contentDirection - one of CONTENT_DIRECTIONS (default "localized")
 * @param {{ isRTL?: boolean }} [state]
 * @returns {{ textAlign: "left" | "right", writingDirection: "ltr" | "rtl" }}
 */
export const resolveLabelDirection = (
  contentDirection = CONTENT_DIRECTIONS.LOCALIZED,
  { isRTL = false } = {}
) => {
  let writingDirection;
  let textAlign;

  switch (contentDirection) {
    case CONTENT_DIRECTIONS.LTR:
      writingDirection = "ltr";
      textAlign = "left";
      break;
    case CONTENT_DIRECTIONS.RTL:
      writingDirection = "rtl";
      textAlign = isRTL ? "left" : "right";
      break;
    case CONTENT_DIRECTIONS.LOCALIZED:
    case CONTENT_DIRECTIONS.PHONE:
    default:
      // ADAPTIVE intentionally resolves here too: field chrome stays localized.
      writingDirection = isRTL ? "rtl" : "ltr";
      textAlign = "left";
      break;
  }

  return { textAlign, writingDirection };
};

/**
 * React hook flavour for label direction.
 *
 * @param {string} contentDirection - one of CONTENT_DIRECTIONS
 */
export const useLabelDirection = (
  contentDirection = CONTENT_DIRECTIONS.LOCALIZED
) => {
  const { isRTL } = useTranslation();
  return resolveLabelDirection(contentDirection, { isRTL });
};

/**
 * Complete field-direction contract used by every form primitive.
 *
 * `input` controls both the value and its placeholder. `text` is shared by
 * labels, helpers and errors. `counter` is deliberately LTR-isolated and is
 * aligned to the logical end of the field (right in English, left in Arabic).
 * Keeping these roles together prevents a field from becoming half RTL and
 * half LTR when only its input is migrated.
 */
export const resolveFieldDirection = (
  contentDirection = CONTENT_DIRECTIONS.LOCALIZED,
  { isRTL = false, hasValue = false, value = "" } = {}
) => ({
  input: resolveInputDirection(contentDirection, { isRTL, hasValue, value }),
  // UI chrome always follows the selected locale even when the value itself
  // is an LTR token such as an email, phone number or password.
  text: resolveLabelDirection(CONTENT_DIRECTIONS.LOCALIZED, { isRTL }),
  counter: {
    // `right` is logical end in React Native (right in LTR, left in RTL).
    textAlign: "right",
    writingDirection: "ltr",
  },
});

export const useFieldDirection = (
  contentDirection = CONTENT_DIRECTIONS.LOCALIZED,
  { hasValue = false, value = "" } = {}
) => {
  const { isRTL } = useTranslation();
  return resolveFieldDirection(contentDirection, { isRTL, hasValue, value });
};
