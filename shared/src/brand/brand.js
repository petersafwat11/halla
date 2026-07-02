/**
 * @halla/shared/brand — canonical brand + URL facts for web SEO and mobile ASO
 * (SEO-ASO-METADATA-PLAN §1).
 *
 * This is the ONE place that declares the brand name, canonical origin, store
 * identifiers, default localized titles/descriptions, and asset paths so web and
 * mobile stop scattering `Halla`/`Halaa`, `.net`/`.com.sa`, and placeholder
 * origins.
 *
 * SOURCE-OF-TRUTH RULES (do not violate):
 *   - Contact identity (support email, entity name, phone, address) is NOT
 *     declared here — it lives in `@halla/shared/legal` `LEGAL_CONTACT` and is
 *     `BLOCKED_NEEDS_OWNER`. Re-import it; never re-resolve the blocked values.
 *   - Only facts derivable from ALREADY-SIGNED decisions or observable in code
 *     are marked `approved: true` here (brand spelling, canonical origin/domain
 *     = infra-confirmed `halaa.com.sa`, Saudi-only availability, bundle/package
 *     IDs from app.json). Persuasive marketing copy is NOT here — it lives in the
 *     ASO templates and is owner-gated.
 *
 * `metadataBase` must be built from `CANONICAL_ORIGIN` (which is derived from
 * `LEGAL_CONTACT.domain`, the infra-confirmed public host).
 */

import { LEGAL_CONTACT } from "../legal/contact.js";

/** Infra-confirmed public domain (single source: the legal contact block). */
export const CANONICAL_DOMAIN = LEGAL_CONTACT.domain; // "halaa.com.sa"
export const CANONICAL_ORIGIN = `https://${CANONICAL_DOMAIN}`;

/** Brand spelling — owner-approved (visible everywhere; matches app.json name). */
export const BRAND_NAME = Object.freeze({
  ar: "هلا",
  en: "Halaa",
  // The single Latin site name used in OG/Twitter/manifest (never "Halla").
  siteName: "Halaa",
});

/** Store application identifiers (verified in `halla-mobile/app.json`). */
export const APP_IDS = Object.freeze({
  iosBundleId: "com.halla.app",
  androidPackage: "com.halla.app",
  // Deep-link scheme (app.json `scheme`).
  scheme: "halla",
});

/**
 * Territory — SIGNED decision D2 (Saudi Arabia storefront only for v1).
 * Drives structured-data `areaServed` and store availability worksheets.
 */
export const AVAILABILITY = Object.freeze({
  approved: true,
  countries: Object.freeze(["SA"]),
  primaryLocale: "ar_SA",
});

/**
 * Default localized site title/description. Derived from the ALREADY-SHIPPED
 * landing metadata + the observable feature set (event management, digital
 * WhatsApp invitations, real-time attendance, vendor marketplace). No
 * superlatives, ratings, or unverified claims.
 */
export const DEFAULT_METADATA = Object.freeze({
  ar: Object.freeze({
    title: "هلا — منصة إدارة المناسبات الذكية",
    titleTemplate: "%s | هلا",
    description:
      "أنشئ مناسباتك، صمّم دعوات رقمية، أرسلها عبر واتساب، وتتبّع الحضور لحظياً، واكتشف مزوّدي خدمات المناسبات.",
  }),
  en: Object.freeze({
    title: "Halaa — Smart Event Management",
    titleTemplate: "%s | Halaa",
    description:
      "Create events, design digital invitations, send them over WhatsApp, track attendance in real time, and discover event vendors.",
  }),
});

/**
 * Brand asset paths (served from the web `public/` folder or Next file
 * conventions). `logo` is the owner-provided brand mark (`public/logo.png`).
 * `ogImage` is the default social-share fallback resolved by the Next
 * `opengraph-image` file convention at build time.
 */
export const BRAND_ASSETS = Object.freeze({
  logo: "/logo.png",
  // Resolved by app/opengraph-image (Next file convention) — absolute at runtime
  // via metadataBase. Kept here as the documented fallback path.
  ogImagePath: "/opengraph-image",
  themeColor: "#c28e5c", // gold accent (matches mobile notification color)
  backgroundColor: "#ffffff",
});

/** Approved public social profiles. None are owner-confirmed yet. */
export const SOCIAL_PROFILES = Object.freeze({
  approved: false,
  status: "BLOCKED_NEEDS_OWNER",
  profiles: Object.freeze([]),
});

/**
 * Build an absolute canonical URL for a locale + path.
 * @param {string} locale "ar" | "en"
 * @param {string} [path] path WITHOUT the locale prefix, leading slash optional
 */
export function canonicalUrl(locale, path = "") {
  const clean = String(path || "").replace(/^\/+/, "");
  const suffix = clean ? `/${clean}` : "";
  return `${CANONICAL_ORIGIN}/${locale}${suffix}`;
}

/**
 * Build reciprocal hreflang alternates (ar, en, x-default) for a path.
 * x-default points to the default locale (ar) per i18nRouterConfig.
 * @param {string} [path] path WITHOUT the locale prefix
 */
export function hreflangAlternates(path = "") {
  return {
    ar: canonicalUrl("ar", path),
    en: canonicalUrl("en", path),
    "x-default": canonicalUrl("ar", path),
  };
}

export const OG_LOCALE = Object.freeze({ ar: "ar_SA", en: "en_US" });

export default {
  CANONICAL_DOMAIN,
  CANONICAL_ORIGIN,
  BRAND_NAME,
  APP_IDS,
  AVAILABILITY,
  DEFAULT_METADATA,
  BRAND_ASSETS,
  SOCIAL_PROFILES,
  OG_LOCALE,
  canonicalUrl,
  hreflangAlternates,
};
