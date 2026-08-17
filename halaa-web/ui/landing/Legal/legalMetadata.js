/**
 * Shared metadata builder for public legal routes (LEGAL-PARITY-PLAN §6).
 *
 * Produces a Next.js Metadata object with: localized title/description,
 * self-canonical, reciprocal AR/EN language alternates, Open Graph, and an
 * index/follow robots policy — so legal pages are crawlable and reviewer-linkable
 * with correct locale/canonical. URLs come from the shared legal manifest so they
 * stay in lockstep with the mobile-hardlinked paths and the backend policy
 * manifest.
 */

import { LEGAL_ROUTES } from "@halaa/shared/legal";

const ORIGIN = "https://halaa.com.sa";

/**
 * @param {object} args
 * @param {string} args.documentType e.g. "privacy" | "terms" | "refund" | "community-rules" | "support"
 * @param {string} args.lang "ar" | "en"
 * @param {string} args.titleAr
 * @param {string} args.titleEn
 * @param {string} args.descAr
 * @param {string} args.descEn
 */
export function buildLegalMetadata({ documentType, lang, titleAr, titleEn, descAr, descEn }) {
  const slug = LEGAL_ROUTES[documentType] || documentType;
  const isAr = lang === "ar";
  const title = isAr ? titleAr : titleEn;
  const description = isAr ? descAr : descEn;
  const canonical = `${ORIGIN}/${lang}/${slug}`;

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        ar: `${ORIGIN}/ar/${slug}`,
        en: `${ORIGIN}/en/${slug}`,
        "x-default": `${ORIGIN}/ar/${slug}`,
      },
    },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "Halaa",
      locale: isAr ? "ar_SA" : "en_US",
      type: "website",
    },
  };
}
