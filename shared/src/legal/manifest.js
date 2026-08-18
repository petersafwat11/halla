/**
 * Legal document registry + canonical URL map (structure).
 *
 * This is the single place that declares which legal documents exist, their
 * canonical public web paths, and which surfaces must expose them. The backend
 * generates a hashed `policyManifest` from the SAME document JSON (read via `fs`)
 * — see `halaa-backend/scripts/generateLegalManifest.js`. The parity CI check
 * (`shared/scripts/verify-legal.mjs`) validates AR/EN section-id parity, schema,
 * URL shape, and registry↔document agreement.
 *
 * Paths intentionally match the URLs the mobile purchase UI already hard-links
 * (`WEB_BASE_URL/<lang>/{terms,privacy,refund}`), plus the new community-rules,
 * delete-account, and support routes.
 */

import { LEGAL_DOCUMENTS } from "./documents.js";

const DOMAIN = "halaa.com.sa";
const ORIGIN = `https://${DOMAIN}`;

/**
 * documentType -> public route slug under /[lang]/.
 * `deletion` maps to the existing public `delete-account` page.
 */
export const LEGAL_ROUTES = Object.freeze({
  privacy: "privacy",
  terms: "terms",
  "community-rules": "community-rules",
  refund: "refund",
  deletion: "delete-account",
  support: "support",
});

export const LOCALES = Object.freeze(["ar", "en"]);

/** Build the canonical absolute URL for a document in a locale. */
export function canonicalUrl(documentType, locale) {
  const slug = LEGAL_ROUTES[documentType];
  if (!slug) return null;
  return `${ORIGIN}/${locale}/${slug}`;
}

/**
 * The full registry: one entry per document with version, canonical URLs, and
 * the ordered section ids (used for AR/EN parity checks).
 */
export const LEGAL_MANIFEST = Object.freeze(
  Object.keys(LEGAL_ROUTES).reduce((acc, documentType) => {
    const doc = LEGAL_DOCUMENTS[documentType];
    const ar = doc?.ar || {};
    const en = doc?.en || {};
    acc[documentType] = Object.freeze({
      documentType,
      slug: LEGAL_ROUTES[documentType],
      // Version is per-locale in the document; they are kept in lockstep.
      version: ar.version || en.version || null,
      effectiveDate: Object.freeze({ ar: ar.effectiveDate || null, en: en.effectiveDate || null }),
      authoritativeLanguage: ar.authoritativeLanguage || "ar",
      ownerApproval: ar.ownerApproval || "BLOCKED_NEEDS_OWNER",
      urls: Object.freeze({
        ar: canonicalUrl(documentType, "ar"),
        en: canonicalUrl(documentType, "en"),
      }),
      sectionIds: Object.freeze((ar.sections || []).map((s) => s.id)),
      lastUpdated: Object.freeze({ ar: ar.lastUpdated || null, en: en.lastUpdated || null }),
    });
    return acc;
  }, {})
);

/** Documents that gate UGC creation (must be accepted at current version). */
export const UGC_REQUIRED_DOCUMENTS = Object.freeze(["terms", "community-rules"]);

/**
 * Which documents each mobile surface must expose. Every authenticated role sees
 * the full set; signup and native checkout see the acceptance-relevant subset.
 */
export const SURFACE_DOCUMENTS = Object.freeze({
  settings: Object.freeze(["privacy", "terms", "community-rules", "refund", "deletion", "support"]),
  signup: Object.freeze(["terms", "privacy", "community-rules"]),
  checkout: Object.freeze(["terms", "privacy", "refund"]),
  ugcAcceptance: Object.freeze(["terms", "community-rules"]),
});

export default LEGAL_MANIFEST;
