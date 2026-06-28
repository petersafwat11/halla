# Halaa web SEO, mobile ASO, and metadata implementation plan

**Executor:** Claude Code  
**Goal:** complete bilingual discovery metadata for public web pages and both store listings without exposing private/token routes to search engines.

Mobile apps do not have conventional web SEO. Mobile scope here means App Store Optimization (ASO), store metadata, app configuration/localization, universal/app links, and share/deep-link previews.

## 1. Establish the canonical brand and URL facts

Create `shared/brand/metadata.js` with owner-approved values:

- brand spelling: `Halaa` / `هلا`
- legal entity name AR/EN
- canonical origin: `https://halaa.com.sa`
- support, privacy, terms, community, refund, deletion URLs per locale
- support/legal email, phone, postal address
- social profiles
- default AR/EN titles/descriptions
- logo/icon/OG image paths
- Apple bundle ID and Google package ID

Remove inconsistent `Halla`/`Halaa`, `.net`/`.com.sa`, placeholder URLs, and scattered base-origin constants.

## 2. Inventory every web route by indexing policy

Generate a route inventory and classify:

### Index/follow

- localized landing pages
- marketplace landing/category pages with substantive content
- public vendor profiles that are approved and have enough unique content
- Privacy, Terms, Community Rules, Refund, Support, Delete Account information pages

### Noindex/follow or noindex/nofollow

- login/signup/reset/change-password/verification
- dashboards, settings, checkout, payment return
- admin/moderator/staff routes
- invitation codes, post-event private/share-token pages
- deletion request/status forms containing workflow state
- error/empty/search-result variants with no unique value

Do not rely only on authentication to prevent indexing. Apply explicit metadata/headers and ensure private content never renders to unauthenticated crawlers.

## 3. Next.js metadata foundation

### 3.1 Root localized metadata

In `app/[lang]/layout.js` or a shared helper:

- `metadataBase`
- localized title template/default
- localized description
- application name
- icons/apple icons
- manifest
- theme color/color scheme
- default Open Graph and Twitter card
- default robots behavior
- authors/publisher/creator only if accurate
- format detection as desired

The root default must not be Arabic-only for English routes.

### 3.2 Canonical and language alternates

For every indexable page:

- self-referencing canonical in the same language
- reciprocal `ar` and `en` alternates
- optional `x-default` to the chosen default locale
- matching absolute URLs in sitemap

Google requires each localized version to list itself and the other versions. Do not canonicalize English to Arabic or vice versa.

Official references:

- https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
- https://developers.google.com/search/docs/advanced/crawling/localized-versions

### 3.3 Metadata files/routes

Add:

- `app/robots.js`
- `app/sitemap.js`
- `app/manifest.js` or `.webmanifest`
- favicon/icon/apple-icon assets through Next file conventions
- default Open Graph image and route-specific images where valuable

Sitemap includes only canonical public URLs. Dynamic vendor URLs must include only approved/public vendors and should support pagination/caching for scale.

Next metadata reference: https://nextjs.org/docs/app/api-reference/functions/generate-metadata

## 4. Route-specific web metadata

### Landing

- unique AR/EN titles/descriptions based on actual product value
- canonical/alternates
- OG/Twitter images with bilingual variants if text is embedded
- Organization + WebSite structured data
- FAQ structured data only if content is visible and eligible under current Google rules

### Marketplace/category

- unique metadata per category/locale
- canonical query policy: filters/sorts either canonicalize to category root or noindex
- pagination policy
- ItemList/Breadcrumb structured data where content supports it

### Vendor profiles

- localized brand/title/about excerpt
- canonical/alternates
- valid absolute OG image fallback
- LocalBusiness/ProfessionalService schema only when fields are accurate
- Breadcrumbs
- `noindex` for unapproved, empty, deleted, suspended, or thin profiles
- safely serialize JSON-LD by escaping `<`/script-breaking sequences
- never expose verification documents/private contact fields

### Legal/support/deletion

- unique localized metadata
- canonicals/alternates
- current effective date visible in content
- no misleading structured data

### Invitation/post-event sharing

Decide whether these are private deep links. Recommended: `noindex,nofollow,noarchive`; optional safe Open Graph preview must not reveal guest PII, exact private location, phone, or access token.

## 5. Technical SEO and quality

- One visible H1 per public page, logical heading hierarchy.
- Descriptive link text and image alt text in AR/EN.
- `next/image` or deliberate optimized image delivery for public SEO-critical images.
- Correct 404/410 for removed public profiles; no soft 404.
- Server-rendered meaningful public content; loading shells are not the indexed result.
- Stable clean URLs and server redirects for legacy paths.
- HTTPS, one host variant, and no redirect chains.
- Core Web Vitals budget for landing/marketplace/vendor pages.
- Avoid indexing duplicated filter/search pages.
- Validate structured data and rendered HTML.

## 6. Web measurement and privacy

Before adding analytics/search-console scripts:

- owner approves provider and consent requirements;
- update data inventory/privacy policy;
- prevent tokens, emails, phones, names, invitation codes, or payment IDs in URLs/events;
- define retention and access;
- avoid ad/tracking claims in store privacy forms unless verified.

Configure Google Search Console/Bing only after canonical domain/DNS ownership is ready. Submit sitemap and save coverage evidence.

## 7. Mobile app configuration metadata

### 7.1 Expo/native configuration

- localized app display name if approved
- app description in config source
- version/build strategy (`version`, `ios.buildNumber`, `android.versionCode`)
- production scheme, bundle/package IDs
- universal/app links and verified association files
- localized iOS permission strings and Android purpose disclosures
- icon, adaptive icon, splash, notification icon at correct production dimensions
- iPad support reflected in layouts/screenshots

Generate a resolved Expo config artifact per release and inspect the signed IPA/AAB; static `app.json` alone is not proof.

### 7.2 Apple App Store metadata artifacts

Commit versioned AR/EN files containing:

- app name (max 30)
- subtitle (max 30)
- promotional text (max 170)
- description (max 4000)
- keyword field (max 100 bytes; no competitor names/duplication)
- support URL, marketing URL, privacy URL
- What’s New
- category/secondary category proposal
- copyright
- reviewer contact/notes and role-based steps
- age-rating answer worksheet
- app privacy answer worksheet
- screenshot captions and device/localization matrix

Official field reference: https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information/

### 7.3 Google Play metadata artifacts

Commit versioned AR/EN files containing:

- app name (max 30)
- short description (max 80)
- full description (max 4000)
- category/tags proposal
- support email/phone/website
- privacy/deletion URLs
- release notes
- app access instructions
- ads/target audience/content rating worksheets
- Data Safety worksheet
- screenshot/feature graphic/icon plan

No keyword stuffing, unverifiable “best/#1” claims, price promotions, fake testimonials, or misleading store badges. Official limits: https://support.google.com/googleplay/android-developer/answer/9859152

## 8. Store product metadata/ASO

For every store product and locale, the catalog manifest must supply concise, behavior-accurate names/descriptions:

- recurring products say period and invite tier;
- event packages say one event and invite allowance;
- add-ons say exact quantity/deliverable and whether repeatable;
- no backend price in text;
- no promise of immediate fulfillment when manual provisioning is required;
- product review notes explain where/how reviewers find and use it;
- Apple IAP review screenshot shows the actual paywall/product.

Product metadata must be generated from the same catalog used by backend/mobile; no separate spreadsheet drift.

## 9. Screenshot and creative plan

AR and EN sets should truthfully show:

1. create/manage an event
2. digital invitation customization
3. guest/RSVP management
4. WhatsApp invitation workflow without implying affiliation
5. real-time attendance/check-in
6. marketplace/vendor discovery
7. business organization features
8. privacy/report/block controls where useful

Requirements:

- real app UI from the submitted build
- no real PII
- no unsupported features/prices
- device frames/text obey store policy
- iPhone + 13-inch iPad because tablet support is enabled
- Android phone set and feature graphic
- localized embedded text

## 10. Verification

Automated:

- metadata snapshot tests per public route/locale
- unique title/description and canonical checks
- reciprocal hreflang checks
- sitemap/robots validation
- noindex checks for all private/token route families
- structured-data schema + safe serialization tests
- broken-link crawl for public policy/support/store URLs
- store text character/byte limit validator
- catalog-product localization completeness

Manual/evidence:

- rendered-source inspection (not only client DOM)
- Rich Results/Schema validation where applicable
- Lighthouse/Core Web Vitals run on production-like build
- Search Console sitemap/coverage
- App Store/Play preview of every localization/device
- second-person metadata/claim/legal consistency review

## 11. Completion gate

- Brand/contact/URL source is owner-approved and used everywhere.
- Every route has an explicit index policy.
- Public localized pages have correct canonical/hreflang/OG metadata.
- Private/token routes cannot leak or index.
- Sitemap/robots/manifest/icons work in production.
- AR/EN Apple and Google metadata/graphics are committed, validated, and match the submitted build.
- Store product metadata matches actual billing behavior and catalog.
- Privacy/legal inventory includes every measurement and store SDK.
