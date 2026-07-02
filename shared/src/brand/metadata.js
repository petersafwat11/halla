/**
 * @halla/shared/brand/metadata — localized Next.js Metadata builder
 * (SEO-ASO-METADATA-PLAN §3.2, §4).
 *
 * Produces a Metadata object with self-canonical, reciprocal AR/EN + x-default
 * hreflang, Open Graph, Twitter card, and a robots directive resolved from the
 * SIGNED route policy (`routePolicy.js`). Pure + framework-agnostic (returns a
 * plain object) so it is unit-testable with `node --test` and reusable by every
 * public page.
 *
 * `metadataBase` is intentionally NOT set here — it belongs on the root layout
 * so relative OG/icon URLs resolve absolutely (Next merges parent metadataBase
 * with per-page relative alternates). Canonical/hreflang here are already
 * absolute for correctness even if a parent metadataBase is missing.
 */

import { BRAND_NAME, OG_LOCALE, BRAND_ASSETS, canonicalUrl, hreflangAlternates } from "./brand.js";
import { robotsFor } from "./routePolicy.js";

/**
 * @param {object} args
 * @param {string} args.lang            "ar" | "en"
 * @param {string} [args.path]          path WITHOUT locale prefix (default "")
 * @param {string} args.title           localized <title> (already localized by caller)
 * @param {string} args.description      localized meta description
 * @param {string} args.routeClass      one of ROUTE_CLASS (drives robots)
 * @param {string[]} [args.images]      absolute OG image URLs (falls back to brand OG)
 * @param {("website"|"article"|"profile")} [args.ogType]
 * @param {boolean} [args.noAlternates] omit hreflang (for token routes that must not advertise variants)
 */
export function buildMetadata({
  lang,
  path = "",
  title,
  description,
  routeClass,
  images,
  ogType = "website",
  noAlternates = false,
}) {
  const canonical = canonicalUrl(lang, path);
  const ogImages = images && images.length ? images : [BRAND_ASSETS.ogImagePath];

  const meta = {
    title,
    description,
    robots: robotsFor(routeClass),
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: BRAND_NAME.siteName,
      locale: OG_LOCALE[lang] || OG_LOCALE.ar,
      type: ogType,
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImages,
    },
  };

  if (!noAlternates) {
    meta.alternates = {
      canonical,
      languages: hreflangAlternates(path),
    };
  } else {
    // Still self-canonical, but do not advertise the alternate locale for
    // token/guest routes.
    meta.alternates = { canonical };
  }

  return meta;
}

export default buildMetadata;
