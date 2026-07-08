/**
 * app/robots.js — Next.js robots file convention (SEO-ASO-METADATA-PLAN §3.3).
 *
 * Emits /robots.txt. Public content is crawlable; private/token/dashboard route
 * families are disallowed at the crawler level as defense-in-depth ON TOP OF the
 * per-page `noindex` metadata (a `Disallow` alone is not enough — the pages also
 * carry `robots: noindex` from the signed route policy). The disallowed prefixes
 * mirror the NOINDEX classes in `@halla/shared/brand` `ROUTE_INVENTORY`.
 *
 * `host`/`sitemap` are absolute against the canonical origin.
 */

import { CANONICAL_ORIGIN } from "@halla/shared/brand";

// Locale-agnostic path fragments (robots matches on path; both /ar/... and
// /en/... plus the unprefixed variants are covered by listing the bare segment).
const DISALLOW = [
  "/*/login",
  "/*/signup",
  "/*/signup-vendor",
  "/*/verify-email",
  "/*/forget-password",
  "/*/change-password",
  "/*/reset-password",
  "/*/host/",
  "/*/vendor-dashboard/",
  "/*/admin-dash/",
  "/*/staff",
  "/*/business/checkout/",
  "/*/post-event",
  "/*/ticket-rating/",
  // Unprefixed safety (middleware may serve some of these before locale rewrite)
  "/host/",
  "/admin-dash/",
  "/vendor-dashboard/",
  "/post-event",
];

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: DISALLOW,
      },
    ],
    sitemap: `${CANONICAL_ORIGIN}/sitemap.xml`,
    host: CANONICAL_ORIGIN,
  };
}
