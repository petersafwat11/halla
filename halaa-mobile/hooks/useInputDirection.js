import { useTranslation } from "../localization";

/**
 * Shared direction-aware input contract (remediation plan §3A).
 *
 * Content-direction policies for native text inputs:
 *  - "localized" (default): placeholder and value follow the current locale
 *    (RTL in Arabic, LTR in English). Used for prose/search/name fields.
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
  LTR: "ltr",
  RTL: "rtl",
  PHONE: "phone",
};

/**
 * Pure resolver — node-testable, no React/RN imports.
 *
 * @param {string} contentDirection - one of CONTENT_DIRECTIONS (default "localized")
 * @param {{ isRTL?: boolean, hasValue?: boolean }} [state]
 * @returns {{ textAlign: "auto", writingDirection: "ltr" | "rtl" }}
 */
export const resolveInputDirection = (
  contentDirection = CONTENT_DIRECTIONS.LOCALIZED,
  { isRTL = false, hasValue = false } = {}
) => {
  let writingDirection;

  switch (contentDirection) {
    case CONTENT_DIRECTIONS.LTR:
      writingDirection = "ltr";
      break;
    case CONTENT_DIRECTIONS.RTL:
      writingDirection = "rtl";
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
 * @param {{ hasValue?: boolean }} [state]
 */
export const useInputDirection = (
  contentDirection = CONTENT_DIRECTIONS.LOCALIZED,
  { hasValue = false } = {}
) => {
  const { isRTL } = useTranslation();
  return resolveInputDirection(contentDirection, { isRTL, hasValue });
};

/**
 * Pure label direction resolver — resolves alignment & writing direction for form labels.
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
      textAlign = "right";
      break;
    case CONTENT_DIRECTIONS.LOCALIZED:
    case CONTENT_DIRECTIONS.PHONE:
    default:
      writingDirection = isRTL ? "rtl" : "ltr";
      textAlign = isRTL ? "right" : "left";
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
  { isRTL = false, hasValue = false } = {}
) => ({
  input: resolveInputDirection(contentDirection, { isRTL, hasValue }),
  // UI chrome always follows the selected locale even when the value itself
  // is an LTR token such as an email, phone number or password.
  text: resolveLabelDirection(CONTENT_DIRECTIONS.LOCALIZED, { isRTL }),
  counter: {
    textAlign: isRTL ? "left" : "right",
    writingDirection: "ltr",
  },
});

export const useFieldDirection = (
  contentDirection = CONTENT_DIRECTIONS.LOCALIZED,
  { hasValue = false } = {}
) => {
  const { isRTL } = useTranslation();
  return resolveFieldDirection(contentDirection, { isRTL, hasValue });
};

