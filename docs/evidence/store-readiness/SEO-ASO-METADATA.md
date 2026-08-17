# Web SEO + mobile ASO metadata (Session 6)

**Verified:** 2026-07-02 · **Scope:** SEO-01/02/03, ASO-01, ASO-02 (brief) ·
**DB/provider/console touched:** none. No secrets in this file.

Bilingual discovery metadata for public web pages + versioned Apple/Google
listing TEMPLATES, with every private/token route structurally `noindex`. Store
listing/marketing copy is owner-gated.

## SIGNED route index/noindex inventory (SEO-01)

- **Executable source:** `shared/src/brand/routePolicy.js` (`robotsFor()` +
  `ROUTE_INVENTORY`) — imported by pages AND tests.
- **Human doc:** `docs/store-readiness-SEO-ROUTE-INVENTORY.md`.
- **Model:** DEFAULT-DENY. Root layout sets `robots:{index:false}`; only
  landing/marketplace/vendor + 6 legal routes opt into `index:true`. A forgotten
  private/token route is `noindex` by construction.

## Files created / modified

### Shared (`@halla/shared`)
- `shared/src/brand/brand.js` — canonical origin/brand/app-id/availability/default metadata + `canonicalUrl`/`hreflangAlternates` (new).
- `shared/src/brand/routePolicy.js` — signed index/noindex policy + inventory (new).
- `shared/src/brand/metadata.js` — `buildMetadata` (canonical+hreflang+OG+Twitter+robots) (new).
- `shared/src/brand/jsonld.js` — `safeJsonLd` (`</script>`/U+2028-9-safe) + `pruneEmpty` (new).
- `shared/src/brand/storeLimits.js` — Apple(byte-keywords)/Google char+byte validators (new).
- `shared/src/brand/index.js` — barrel (new).
- `shared/package.json` — `exports` `./brand` + `./brand/*`; `aso:verify` script (modified).
- `shared/scripts/validate-aso-metadata.mjs` — ASO limit validator (new).

### Web (`labbe`)
- `labbe/app/[lang]/layout.js` — `metadataBase`, localized title template/default, manifest, per-locale canonical + hreflang, OG/Twitter, viewport/theme, **DEFAULT-DENY robots** (modified).
- `labbe/app/robots.js`, `labbe/app/sitemap.js`, `labbe/app/manifest.js`, `labbe/app/opengraph-image.js` (new).
- `labbe/app/icon.png`, `labbe/app/apple-icon.png` — from `public/logo.png` (new).
- `labbe/app/[lang]/page.js` (landing), `labbe/app/[lang]/market-place/page.js`, `labbe/app/[lang]/market-place/vendors/[vendorId]/page.js` (vendor JSON-LD hardened) — metadata via `buildMetadata` (modified).
- `labbe/app/[lang]/{privacy,terms,refund}/page.js` — switched to `buildLegalMetadata` so they still `index` under default-deny (modified).
- `labbe/app/[lang]/delete-account/layout.js` — server layout supplying indexable legal metadata for the client deletion page (new).
- `labbe/middleware.js` — matcher skips `opengraph-image`/icon/manifest at app root (modified).
- `labbe/package.json` — `test` script (`node --test __tests__/**/*.test.mjs`) (modified).
- `labbe/__tests__/{seo-route-policy,seo-metadata,seo-sitemap-robots,aso-store-limits}.test.mjs` (new).

### Docs
- `docs/store-readiness-SEO-ROUTE-INVENTORY.md` (new).
- `docs/store-readiness/store-metadata/{apple-listing.template.json,google-listing.template.json,data-safety-worksheet.md,screenshot-brief.md,reviewer-notes.md,product-metadata.md,README.md}` (new).

## noindex proof (live render, `next start` + curl)

| Route | robots | canonical |
|---|---|---|
| `/en` (landing) | `index, follow` | `/en` |
| `/en/privacy`,`/terms`,`/refund`,`/community-rules`,`/support`,`/delete-account` | `index, follow` | self (`/en/<slug>`) |
| `/en/login`,`/signup`,`/signup-vendor`,`/verify-email`,`/forget-password`,`/change-password`,`/reset-password` | `noindex, nofollow` | root fallback |
| `/en/post-event`, `/en/staff` | `noindex, nofollow` | — |
| `/en/host`, `/en/vendor-dashboard`, `/en/admin-dash`, `/en/host/payments/return` | **307 → `/en/login`** (auth-gated) → then `noindex` | — |

**No PII in metadata:** none of the noindex routes define `generateMetadata`, so
their title/description/OG come from the static localized brand default only — no
code path reads a guest/host name, phone, token, event title, or payment id into
any metadata. The only data-derived metadata is the vendor profile, from the
backend PUBLIC projection (`PUBLIC_VENDOR_SELECT`; private identity/verification
excluded — asserted by `labbe-backend-/test/vendors.public.test.js`).

## Vendor JSON-LD (public-only + attack-safe)

`LocalBusiness` serialized via `safeJsonLd` (escapes `<`,`>`,`&`,U+2028/U+2029) →
a vendor cannot inject `</script>` through `brandName`/`about`. Fields limited to
the public projection (the same brand/about/contact rendered visibly on the
page). `areaServed`=SA; empty keys pruned.

## File-convention artifacts (from `next start` + curl)

- `/robots.txt` — allow `/`; disallow login/signup/host/admin-dash/vendor-dashboard/staff/business-checkout/post-event/ticket-rating/reset-password/change-password; absolute `Host` + `Sitemap`.
- `/sitemap.xml` — valid XML; landing + marketplace + 6 legal routes × ar/en, each with reciprocal ar/en/x-default `<xhtml:link>`. No private/token URLs. Vendor rows absent offline (best-effort; needs live backend).
- `/manifest.webmanifest` — brand name/colors, `/logo.png` icons.
- `/opengraph-image` — valid 1200×630 PNG (Latin "Halaa" brand card; no fabricated claims).
- `/icon.png` + `/apple-icon.png` — 200 image/png; `<link rel="icon"|"apple-touch-icon">` emitted.

## ASO validator

`node shared/scripts/validate-aso-metadata.mjs` → 8 concrete values checked,
4 approved fields, 16 blocked fields, **over-limit 0**. Apple `keywords` measured
in BYTES; all others chars.

## Gate results (final tree)

| Gate | Result |
|---|---|
| Web `npm run lint` | 0 errors / 34 pre-existing warnings |
| Web `npm run build` | **exit 0** (robots/sitemap/manifest/icon/apple-icon/opengraph-image emit) |
| Web `npm test` (`node --test`) | **29 / 29** |
| Web render (`next start` + curl) | index/noindex + canonical/hreflang + robots.txt/sitemap.xml/manifest/OG verified |
| Shared `aso:verify` | PASS (over-limit 0) |
| Shared `legal:verify` | PASS (6 docs) |
| Shared `npm run lint` | 0 (max-warnings 0) |
| Backend `npm test` | **231 / 231** (unchanged — backend source untouched) |
| Backend `catalog:verify` | **26**, drift-clean |
| Backend `legal:verify` | **16**, drift-clean |
| Backend payment static-checks (`MOYASAR_API_KEY=dummy`) | **18 / 18** |

## Honest verification boundaries

- **Vendor sitemap rows + a live vendor GET-crawl** need a reachable backend/DB —
  not run (shared staging cluster; no DB this session). The offline build ships
  the static public set; the vendor-profile pages themselves ARE server-rendered
  + indexable.
- **Marketplace listing is client-rendered** (`MarketplaceView`); metadata added,
  but full listing SSR is out of scope. Discoverability of individual vendors
  flows through the server-rendered vendor-profile pages.
- **OG image text is Latin** ("Halaa") — `ImageResponse`'s built-in font lacks
  Arabic glyphs and bundling a font risked the offline build. Route-specific
  Arabic OG cards are a follow-up.
- **Mobile:** ASO deliverables are docs/templates (no mobile source changed).
  App display name/bundle/scheme/tablet-support/permission-strings/associated-
  domains were verified in `halla-mobile/app.json` (already correct) but not
  modified.
- **Screenshots (ASO-02):** brief only; assets need the signed IPA/AAB.
- **Analytics/Search-Console tags:** intentionally NOT added (owner + privacy-
  inventory gated, §6).

## BLOCKED_NEEDS_OWNER (ASO / marketing copy)

See `docs/store-readiness/store-metadata/README.md` for the exhaustive list.
Persuasive copy (per platform × AR/EN): Apple subtitle/promo/keywords/description/
What's-New; Google short/full description/release-notes; categories; copyright/
EULA; screenshot captions; age-rating answers. Contact/identity (carried over
from Session 5, do NOT re-resolve): legal entity name (2-way conflict), support
email (`support@halaa.net` vs `support@halaa.com.sa`), phone/WhatsApp, postal
address, support SLA, retention durations/legal-basis (`RETENTION_MATRIX_FINALIZED=false`).
