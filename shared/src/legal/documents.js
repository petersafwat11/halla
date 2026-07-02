/**
 * Canonical legal documents (structure — content pending owner/counsel sign-off).
 *
 * The authoritative content lives as inert JSON under `./documents/*.json` in the
 * `{ ar, en }` render shape that BOTH the web `LegalPage` and the mobile
 * `LegalScreen` already consume. These thin ESM re-exports let web (Next) and
 * mobile (Metro) bundle the same source via `@halla/shared/legal`. The backend
 * (CJS) does NOT import this module; it reads the same JSON via `fs` at
 * legal-manifest generation time (JSON is language-agnostic), mirroring the
 * commerce catalog manifest.
 *
 * IMPORTANT: no document here is legally approved. Every doc carries
 * `ownerApproval: "BLOCKED_NEEDS_OWNER"` until Saudi counsel/owner signs the exact
 * copy, entity/contact data, retention periods, and refund/subscription wording.
 */

import privacy from "./documents/privacy.json";
import terms from "./documents/terms.json";
import communityRules from "./documents/communityRules.json";
import refund from "./documents/refund.json";
import deletion from "./documents/deletion.json";
import support from "./documents/support.json";

/**
 * All canonical documents keyed by `documentType`. Each value is
 * `{ ar: <localizedDoc>, en: <localizedDoc> }`.
 */
export const LEGAL_DOCUMENTS = Object.freeze({
  privacy,
  terms,
  "community-rules": communityRules,
  refund,
  deletion,
  support,
});

export {
  privacy,
  terms,
  communityRules,
  refund,
  deletion,
  support,
};

/**
 * Resolve a document's localized payload with a safe fallback to the
 * authoritative Arabic version.
 * @param {string} documentType e.g. "privacy" | "terms" | "community-rules" | "refund" | "deletion" | "support"
 * @param {string} locale "ar" | "en"
 */
export function getLegalDocument(documentType, locale = "ar") {
  const doc = LEGAL_DOCUMENTS[documentType];
  if (!doc) return null;
  return doc[locale] || doc.ar || null;
}

export default LEGAL_DOCUMENTS;
