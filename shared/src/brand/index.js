/**
 * @halla/shared/brand — canonical brand/URL facts + web SEO / mobile ASO
 * helpers. See individual modules for source-of-truth rules. Nothing here
 * declares owner-gated contact/marketing copy (that lives in `../legal/contact`
 * and the owner-gated ASO templates).
 */

export {
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
} from "./brand.js";

export {
  ROUTE_CLASS,
  robotsFor,
  isIndexable,
  ROUTE_INVENTORY,
} from "./routePolicy.js";

export { buildMetadata } from "./metadata.js";
export { safeJsonLd, pruneEmpty } from "./jsonld.js";
export {
  charLength,
  byteLength,
  checkField,
  validateListing,
  APPLE_LIMITS,
  GOOGLE_LIMITS,
  STORE_LIMITS,
} from "./storeLimits.js";

export { default as brand } from "./brand.js";
