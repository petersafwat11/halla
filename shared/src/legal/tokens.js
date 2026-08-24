/**
 * Canonical LTR-token isolation for legal long content (remediation
 * blueprint §4.5 / §6).
 *
 * The six owner-approved documents (privacy, terms, community rules,
 * refund, deletion, support) embed intrinsically LTR tokens inside Arabic
 * paragraphs. Every matcher alternative below is a PROVEN content case that
 * actually occurs in those documents — do not add speculative patterns:
 *
 *  - email addresses                support@halaa.com.sa
 *  - URLs                           https://…
 *  - Saudi phone numbers            +966 55 261 9282 / 05X XXX XXXX
 *  - official Latin company name    Afaq hala Company For Communications and Information
 *  - store names                    App Store / Google Play
 *  - vendor/technical brand runs    Apple, Google, Apple/Google, MongoDB Atlas,
 *                                   AWS/S3, Google Maps, Meta/WhatsApp,
 *                                   RevenueCat, APNs, FCM, Expo, Sentry,
 *                                   Moyasar, Taqnyat, IP …
 *  - percentages                    15% (refund commission note)
 *
 * Isolation only ever applies to RTL copy; Latin (EN) documents pass through
 * untouched. The heavy lifting reuses the tested `isolateLtrTokens` helper
 * from `@halaa/shared/utils/bidi`.
 */

import { isolateLtrTokens } from "../utils/bidi.js";

export const LEGAL_LTR_TOKEN_REGEX = new RegExp(
  [
    // Email addresses (must precede the generic Latin run so the whole
    // address matches as one token instead of its letter fragments).
    "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}",
    // URLs up to the first whitespace/closing paren, never consuming a
    // trailing sentence period or closing bracket into the isolate.
    "https?://[^\\s)]*[^\\s).)]",
    // Saudi phone numbers with flexible spacing.
    "(?:\\+966|05)\\s*\\d{1,2}\\s*\\d{3}\\s*\\d{4}",
    // Official registered company name in its exact Latin spelling.
    "Afaq hala Company For Communications and Information",
    // Store names.
    "App Store|Google Play",
    // Percentages.
    "\\d+(?:\\.\\d+)?%",
    // Generic brand/technical run: one or more Latin-letter words joined by
    // internal separators (space, /, &, ., -, +). Must start and end on a
    // letter/digit so sentence punctuation (e.g. the Arabic full stop after
    // "Taqnyat.") stays outside the isolate and keeps its paragraph-side
    // placement.
    "[A-Za-z0-9._+&/-]*[A-Za-z][A-Za-z0-9._+&/-]*(?:[\\s]+[A-Za-z0-9._+&/-]+)*[A-Za-z0-9]",
  ].join("|"),
  "g"
);

/**
 * Wrap every intrinsically-LTR legal token of `text` in Unicode LTR isolates
 * when rendering inside RTL copy. Returns `text` unchanged for LTR locales.
 *
 * @param {string} text - one legal paragraph (already split on "\n\n")
 * @param {boolean} [isRtl=true] - whether the ambient UI/document locale is RTL
 * @returns {string}
 */
export const isolateLegalLtrTokens = (text, isRtl = true) =>
  isolateLtrTokens(text, LEGAL_LTR_TOKEN_REGEX, isRtl);

export default {
  LEGAL_LTR_TOKEN_REGEX,
  isolateLegalLtrTokens,
};
