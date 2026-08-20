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
