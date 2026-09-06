# Halaa SEO — remaining work, simplified for prelaunch

Reviewed September 6, 2026 against the current working tree. Implementation status and evidence are now recorded in [SEO_COMPLETION_REPORT.md](SEO_COMPLETION_REPORT.md). Code implementation is complete locally; release-dependent and environment-blocked verification items are explicitly open there. This document supersedes the outstanding scope/ordering in `SEO_REMEDIATION_VALIDATION_AND_CHECKLIST.md`; that document remains the historical audit record.

## Assessment

The original plan mixes launch defects, already-completed work, optional marketing growth, and broader platform refactoring. Keep the launch defects and regression checks. Do not treat every unchecked historical box as work still required. Old HTML sizes, namespace counts, font descriptions, script counts and test totals are historical, not fresh measurements.

## Already implemented — verify, do not rebuild

- Disabled Coming soon app badges, real DB vendor preview using the marketplace card, hidden/empty testimonials and removal of unsupported counts.
- Targeted bilingual copy fixes, five-step process, adjustable 48-hour reminder wording, Arabic compensation plurals and upcoming-app messaging.
- Server-loaded pricing, existing Basic/Premium/Business card controls, common selected-card price/schema snapshot, bounded public-data cache, contact fallback and client refresh. Owner-requested follow-up removed the duplicate full-plan list; initial HTML now includes the default card selection only.
- Smaller responsive hero artwork, localized titles, absolute legal titles and safe Organization/Application/Offer/FAQ serialization.
- GA4 account/stream and build configuration, opt-in analytics, withdrawal, basic landing events and sanitized error counts.
- Existing canonical, hreflang, robots, sitemap and locale-direction helpers/tests.

These are local implementations, not a claim of verified production deployment. Recheck integrations while finishing the remaining work. In particular, verify Business setup fees, billing periods and visible/schema pricing semantics rather than assuming matching base numbers alone cover every commercial term.

## 1. Content integrity and small accessibility fixes — do now

- Remove five footer placeholder social links. Shared `SOCIAL_PROFILES` currently has no approved entries. Default to hiding the group; retain existing approved support contact links. No new social-profile system is needed.
- Inspect each of the 16 gallery thumbnails and give it concise Arabic/English alt text. Keep decorative icons/layers empty. Existing thumbnails are already WebP: do not redo conversion or rebuild the carousel. Remove the first below-the-fold thumbnail's eager/high-priority loading unless measurement justifies it.
- Replace visible Builder TEMP images with suitable existing owned assets, or remove the decorative image if none fits. Remove/gate unused landing TEMP references. Do not extend this into unrelated application/media cleanup.
- Add a localized skip link and focusable main target. Localize navigation/carousel labels, fix measured low-contrast small text with landing-scoped styles, and test keyboard focus and touch layouts. Do not recolor the entire application or rebuild the design system.
- Explicitly select only public fields needed by vendor preview cards; verify no invented/default ratings or unintended contact fields reach the landing payload. Continue using the approved-vendor endpoint and existing cards; do not create a second vendor model.

## 2. Reduce the real payload bottlenecks — do now, narrowly

- The global translation provider still loads dozens of namespaces; server initialization preloads both locales. Serialize only the requested locale and scope public/landing namespaces with the smallest layout/provider change that preserves navigation. Landing needs its actual dependencies (including plans/marketplace/common where used), not just one dictionary.
- Verify language switching and navigation into auth, host, vendor and admin pages. Do not replace i18next or redesign every route's providers as an SEO project.
- Inspect actual font requests first. Current code uses `next/font` in `app/[lang]/fonts.js`, not the historical global `@font-face` arrangement. Cairo is the main face; Amiri/Great Vibes are attached globally. Remove unused declarations and scope nonlanding fonts only after checking invitation/editor consumers.
- Remove unused global Swiper imports if usage review shows they are unnecessary; otherwise scope them to consumers. Do not code-split every component or add blanket lazy loading that removes indexable text.
- Record before/after bytes and requests. Use a bundle analyzer only if large unexplained chunks remain after translation/font cleanup.

## 3. Keep rendering/caching simple

- Keep server-rendered dynamic locale pages and the existing public pricing-data cache. Google does not require full-page ISR. No `generateStaticParams`, whole-site route rewrite, Redis, distributed cache or CDN HTML-cache project for this launch.
- Review unnecessary locale-cookie writes only if it can be changed without altering language choice/navigation behavior. This is an optimization, not an indexing blocker.
- Keep authenticated/personalized responses private. Test price freshness and honest fallback; document that a new container can start with a cold cache. Cross-deployment last-good continuity is optional, not a reason to build new infrastructure.
- Owner-requested follow-up: remove the duplicate expanded pricing list and its unused code; keep the existing cards and align offers with their current selection. Do not add another pricing catalog or price constants.

## 4. Metadata, discoverability and web security

- Preserve existing metadata/schema. Verify actual absolute OG/Twitter URLs; investigate the build warning rather than blindly adding another `metadataBase` (the locale layout already has one).
- Verify public marketplace/vendor URLs, sitemap freshness and private-route exclusion. Fix concrete defects in the existing mechanism only. No template/category page factory and no home-only breadcrumb.
- FAQ rich-result eligibility is NOT a launch gate. Google retired FAQ rich results in 2026. Existing accurate FAQ markup can remain, but do not add an FAQ rich-result project or promise enhanced search appearance.
- Configure baseline headers at Caddy, the existing edge: nosniff, a suitable referrer policy, permissions appropriate to actual features, and framing protection where compatible. Verify HTTPS before HSTS; do not enable preload or include every subdomain by default.
- Inventory origins used by maps, uploads, payments, API and GA4 before a report-only CSP. Inspect violations during deployment verification, then enforce only tested directives. Do not build a custom CSP reporting platform, buy another service, or claim report-only CSP is enforced protection.
- Security checks must include affected signup/payment/map/upload flows, not only the homepage. Do not disable camera/geolocation/payment functionality through a blanket policy.

## 5. Measurement — finish the integration, not a new platform

- Keep GA4 and the existing consent UI. No GTM, advertising pixels, replay, Sentry rollout or provider-neutral analytics framework for this task.
- Use the standard `page_view`; do not add a duplicate `landing_view`. Existing CTA/pricing/vendor events are enough for launch. `pricing_plan_select` is optional, not a blocker. Disabled app badges must not emit store-click conversions.
- Verify allow/decline/withdrawal, public-page-only collection, no duplicate events and no personal guest content. Confirm the real tag receives events after an approved deployment.
- Inspect retention settings and document the actual setup. Recommend the shortest standard retention sufficient for launch analytics; any requested expansion needs owner approval. No legal compliance guarantee is implied by a consent banner or a code review.
- Check the existing Search Console property, sitemap and representative public URLs. Do not create duplicate properties or change DNS unless a verified need and authorization exist. Submit/index public pages only according to the launch decision below.

## 6. Product facts — owner decision first

- Trial defaults are one event, five guests, 90 days. Current auth callers pass `trialPlan._id` to a method reading a full plan object's fields. This is a concrete provisioning concern, not just copy polish. With owner approval, fix and test the new-signup behavior before publishing exact terms. Do not change existing subscriptions, seed the database or migrate customer records as part of this fix without a separate decision.
- No-card wording stays absent. Native Saudi editorial review cannot be checked off by automated tests or an AI-only copy pass; owner sign-off remains a launch review item.

## Defer — not required for this project's prelaunch SEO

- Testimonials, ratings, customer logos and usage/satisfaction counts: remain hidden until genuine evidence and permission exist (already decided).
- App-store production URLs/configuration: revisit when public releases exist; Coming soon is sufficient now (already decided).
- New lead forms, CRM/follow-up systems, remarketing and additional analytics vendors: current WhatsApp/signup paths suffice.
- New demo video or screenshot funnel: existing five-step tour is sufficient for launch. A guest RSVP sequence is a useful later conversion improvement, not an SEO blocker.
- Keyword/content programs, editorial calendars, new occasion pages and programmatic category/template pages: postlaunch work with unique useful content. Keep existing public marketplace pages healthy now.
- Full-page ISR conversion, cross-replica stale caches, large framework abstractions, repo-wide asset cleanup and CI budget infrastructure: only revisit if measured traffic/performance warrants them.

## Verification and release — one compact workflow

1. Capture fresh `/ar` and `/en` baselines tied to working-tree/deployed revision. Do not reuse the August/September historical byte counts as current evidence.
2. Extend existing SEO/pricing tests instead of building another test framework: raw HTML, links, alt text, prices/schema, metadata, private URLs and honest outages.
3. Run production build, full relevant tests, one axe scan and manual keyboard/mobile/RTL checks. Inspect image/font requests and hydration/layout issues.
4. Run repeatable mobile lab performance checks (several runs; compare the median). Aim for LCP at most 2.5s and CLS at most 0.1 under documented conditions; examine interaction responsiveness. Do not demand a perfect Lighthouse score, invent a hard byte budget before measurement, or label lab TBT as field INP. A prelaunch site may have no CrUX field sample yet.
5. Present the scoped changes for release approval. After approved deployment, verify live HTML/headers, GA4, sitemap/indexing intent and performance. Do not mark deployment/security enforcement/provider verification complete from local tests alone.

## Owner decisions — confirmed

1. **Trial:** Owner confirmed one event, up to five guests, valid for 90 days, and approved fixing new-account provisioning to match. Test before publishing. No existing-account migration is authorized.
2. **Indexing timing:** Owner confirmed that public marketing/marketplace pages should be visible to Google now. Preserve private-route exclusion. This decision does not itself authorize deploying all working-tree changes.

Defaults needing no separate decision: hide unapproved socials; keep reviews/apps unavailable; reuse suitable owned assets or omit decoration; defer new demos/forms/content pages; keep current GA4 provider; keep edits local until deployment is explicitly approved. Owner/native Arabic sign-off is required before release, but need not block the technical implementation.

## Primary guidance checked

- [Google JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics): server-rendered content is useful; static generation is not the sole approach.
- [Google Search documentation changes](https://developers.google.com/search/updates): FAQ rich-result retirement, 2026.
- [INP measurement](https://web.dev/articles/inp): real-user field measurement is distinct from loading-only lab tests.
