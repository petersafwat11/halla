# SEO Remediation Plan — Validation and Implementation Checklist

**Prepared:** 2026-09-03  
**Audit source:** `SEO Report.pdf`, dated 2026-08-28  
**Code reviewed:** `master` at `b2ab14b5dab0275fb240f7086bcc0433ac282f66`  
**Validation environment:** Local Next.js production build and raw server-rendered HTML

## Outcome

The remediation plan is directionally sound, but it should not be implemented unchanged. Most of the audit's commercial, content-integrity, structured-data, performance, caching, and security findings still apply. Several implementation assumptions are now inaccurate, and a few audit findings have already been fixed or no longer reproduce on the current branch.

The highest-priority work is:

1. Remove or replace misleading content and dead links.
2. Put pricing and real vendor data into the initial HTML.
3. Reduce the hero and translation payloads.
4. Add trustworthy structured data and measurement.
5. Restore the skip link, fix contrast, and add web security headers.

## Evidence baseline

- The audit tested the live site externally with a 3.5-second observation window on 2026-08-28.
- The current repository builds successfully with Next.js 15.5.23.
- The current `/[lang]` route is dynamic, not ISR/static.
- Local production responses are approximately 489–490 KB of uncompressed HTML.
- The current route emits 20 script and 7 stylesheet assets, approximately 312 KB gzipped in total.
- The eight hero PNG files total exactly 1,990,642 bytes and are all preloaded by the current rendered output.
- The current raw HTML contains nine `href="#"` links: four store badges and five footer social links.
- The current raw HTML contains no JSON-LD.
- The current raw HTML contains the 16 invitation-gallery images; the gallery is not missing from server output on the reviewed branch.
- All existing `halaa-web` tests passed: 145 passed, 0 failed. The production build passed with non-blocking warnings.

## Validation matrix

| Report item | Current status | Validation and required adjustment |
|---|---|---|
| F-01 — Pricing absent from server response | **Confirmed** | `PricingSection` fetches with `useLandingPlans()` after hydration and initially renders a loading state. Server-load the plans and pass them as query `initialData`. |
| F-02 — App-store links do not work | **Confirmed** | `AppStoreButtons` defaults both destinations to `#`; the component appears in the hero and footer. No public production-store URLs are evidenced in the repo. Use configured production URLs only; otherwise show a non-link status or the web signup CTA. Never publish internal-test URLs. |
| F-03 — Fabricated marketplace listings | **Confirmed** | The landing page still contains hardcoded vendor names, repeated temporary imagery, ratings, and review counts. Remove the cards immediately or replace them with approved vendors from the public API. Do not display review counts or ratings without a genuine source. |
| F-04 — No marketing measurement | **Confirmed** | There is no GA4/GTM, advertising pixel, session-replay, or web error-monitoring integration. Backend marketplace analytics are not a substitute for landing-page analytics. |
| F-05 — Oversized hero media | **Confirmed** | The eight PNGs total 1,990,642 bytes and all receive preload hints. Convert/composite the artwork and prioritize only the measured LCP asset. Decorative images should retain empty alt text. |
| F-06 — Contradictory facts between locales | **Confirmed, with nuance** | English says 48 hours while Arabic says 24. Paid-event reminder defaults to 48 hours and can be configured no later than 24 hours before the event; trial reminder behavior is different. Copy must distinguish these cases instead of making a universal claim. The page also says four steps while rendering five. |
| Structured data absent | **Confirmed** | No JSON-LD is present on the landing page. Reuse the repository's `safeJsonLd` and `pruneEmpty` helpers. Offers must use the same plan snapshot shown to users. Do not add aggregate ratings or reviews. |
| Weak/duplicated titles | **Confirmed** | The landing title is broad. Legal pages can render duplicate brand suffixes such as `Privacy Policy – Halaa | Halaa`. Pass unbranded page titles into the layout template or use an absolute title. |
| Invitation gallery absent from SSR | **Does not reproduce** | All 16 gallery images are in the current initial HTML despite the component being marked `use client`. Do not rewrite the gallery solely to make it server-rendered. Fix its empty localized alt text and remove eager/high priority from the first below-the-fold image. |
| Image alt deficiencies | **Partially confirmed** | There are 24 empty alts: eight decorative hero layers and 16 meaningful gallery thumbnails. Keep decorative alts empty; add concise localized descriptions to gallery images. |
| Fourteen font files preloaded | **Does not reproduce exactly** | The current response has no font preload links, but global CSS still declares an excessive set of Tajawal, Cairo, Amiri, and Great Vibes faces. Remove unused global families and route-scope editor/template fonts. Re-measure actual downloads. |
| Large HTML and JS/CSS payload | **Confirmed** | The provider loads 37 translation namespaces and preloads both locales, serializing a large resource object into the route. Route-scoped namespaces and current-locale-only initialization are higher-value changes than a general client-component rewrite. |
| Private/no-store caching | **Confirmed; plan assumption incorrect** | The page does not currently export `revalidate`; the build marks `/[lang]` dynamic. Responses set `Cache-Control: no-store...private`, and middleware always sets `NEXT_LOCALE`. Public-page static/ISR behavior must be deliberately implemented and tested. |
| Missing security headers | **Confirmed** | The web response lacks the six audited headers. API Helmet configuration does not protect pages served through Next/Caddy. Use one authoritative web layer, preferably Caddy, for the public response headers. |
| Nineteen unnamed controls | **Does not reproduce** | Current raw DOM analysis found 77 interactive controls and no unnamed controls. Carousel and navigation controls have names. Retain this as a regression test and localize generic English-only labels. |
| Skip link | **Regression in current code** | The audit observed a skip link, but the current code/raw HTML has no skip-to-content link or matching main target. Restore both. |
| Low color contrast | **Confirmed** | Several landing tokens fail normal-text contrast on the cream background. For example, secondary-300 is about 3.45:1. Fix semantic small-text usage rather than globally darkening every shared product token. |
| Temporary external assets | **Confirmed, broader than the plan** | Two temporary Builder assets are visible on the landing page; additional dormant components also reference temporary assets. Remove all temporary Builder URLs from the repository, not only the currently visible two. |
| F-11 — No social proof | **Confirmed, but do not fabricate a fix** | No trustworthy proof is displayed. Dormant locale/component content contains unverified testimonials and metrics. Remove or gate that content until evidence and permission exist. |
| F-12 — Product is never demonstrated | **Partially confirmed** | A five-step host-side screenshot tour exists, but the guest invitation/RSVP and resulting host dashboard flow are not demonstrated. Add a lightweight, real product sequence before considering autoplay video. |
| F-13 — Trial is unquantified | **Confirmed; amount is known in code** | Canonical backend defaults define one trial event, five guests, and 90 days. Verify that signup provisions those terms, then publish them from a canonical product fact/API. Confirm the no-card condition before claiming it. |
| F-14 — No visitor capture | **Partially confirmed** | WhatsApp CTAs already provide contact paths, but there is no structured lead capture or remarketing instrumentation. Track the existing CTA first; add a form only if there is an owner and follow-up workflow. |
| F-15 — Premium differentiation unclear | **Already improved in current code** | The current component renders the base inclusions followed by premium-only management benefits. Preserve this distinction and verify it in the server-rendered pricing output. |
| F-16 — No business pathway | **Partially confirmed** | A Business tab and WhatsApp CTA exist, but they depend on the client-side plans request. Server-render the pathway and track the CTA; a second contact route is optional, not required for the SEO fix. |
| Thin topical coverage | **Confirmed, later-phase** | The sitemap primarily contains the landing page, marketplace, and legal routes. Build occasion/editorial pages only when unique, useful content and ownership exist. Avoid programmatic thin pages. |
| Canonical, hreflang, robots, sitemap, lang/dir | **Conforming** | Current metadata tests pass and locale direction/canonical behavior is correct. Add regression coverage before changing route rendering or caching. |

## Implementation checklist

The checkboxes are ordered by dependency and risk. Complete the release gates at the end of each workstream before moving it to production.

### 0. Establish repeatable measurements

- [ ] Save production and local baselines for both `/ar` and `/en`: status, headers, raw HTML size, compressed transfer, JS/CSS requests, LCP, INP, CLS, and total image/font bytes.
- [ ] Add a raw-HTML SEO smoke test that asserts:
  - [ ] Correct `lang`, `dir`, canonical, and reciprocal hreflang.
  - [ ] No `href="#"`.
  - [ ] Pricing and the Business contact pathway are present without JavaScript.
  - [ ] No fake vendor names, fake review counts, or temporary Builder URLs.
  - [ ] Required JSON-LD parses and contains no empty fields.
  - [ ] Gallery images have localized alt text; decorative hero layers have empty alt text.
- [ ] Record results against the audit date and deployed commit so production drift can be distinguished from code drift.

**Release gate:** A repeatable command or test produces the same baseline for both locales.

### 1. Integrity hotfix: dead links, fabricated content, and contradictory copy

#### Store badges and footer links

- [ ] Add validated public configuration for Apple and Google production-store URLs in `halaa-web/shared/src/brand/brand.js` or a single equivalent brand/config module.
- [ ] Update `halaa-web/ui/landing/AppStoreButtons/AppStoreButtons.jsx`:
  - [ ] Render a real anchor only when the corresponding production URL is valid.
  - [ ] Otherwise render a localized non-link “Coming soon” state or the existing web signup CTA.
  - [ ] Never fall back to `#` and never expose internal-test URLs.
- [ ] Update `halaa-web/ui/landing/Footer/Footer.jsx` to render only approved social profiles from shared brand configuration.
- [ ] Hide the social group when no profile is approved; do not render placeholder anchors.

#### Vendor preview

- [ ] Immediately remove or hide the hardcoded vendor cards in `halaa-web/ui/landing/VendorSearchSection/VendorSearchSection.jsx` until real data is wired.
- [ ] Remove all invented ratings, review counts, vendor claims, and repeated temporary imagery.
- [ ] Server-load a small landing preview from `GET /api/v2/vendors/public`.
- [ ] Ensure preview eligibility requires an active, approved public vendor with at least one active public service.
- [ ] Pass server-loaded vendors into the interactive carousel/search UI as initial data.
- [ ] If no eligible vendors exist, render an honest marketplace CTA or omit the cards.
- [ ] Do not expose private contact data or show ratings until a verified review source exists.

#### Arabic, English, and product facts

- [ ] Correct the Arabic source copy in `halaa-web/public/locales/ar/landing.json`, including:
  - [ ] `أبدا` → `ابدأ`.
  - [ ] `بأرسال` → `بإرسال`.
  - [ ] `جاهز لارسال` → `جاهز لإرسال`.
  - [ ] `فى` → `في` and the affected definite-article grammar.
  - [ ] `إدارة الإستقبال` → `إدارة الاستقبال`.
  - [ ] `اضافة` → `إضافة` and `وادارة` → `وإدارة`.
  - [ ] Correct the plural form for three complimentary invitations.
  - [ ] Localize the QR label and normalize numeral/punctuation style.
- [ ] Have a native Saudi Arabic reviewer check the full landing namespace; avoid blind global replacements.
- [ ] Change the FAQ/process claim from four steps to the canonical five steps in both locales.
- [ ] Make reminder copy accurate for paid events and explicitly separate trial behavior.
- [ ] Reconcile the Arabic Coffee Service/vendor-category omission and normalize staff/reception wording to the actual feature.
- [ ] Verify the trial provisioning behavior, then publish the canonical trial quantity: one event, five guests, 90 days.
- [ ] Do not claim “no card required” until the signup flow confirms it.
- [ ] Delete or clearly gate dormant fabricated testimonials and unverified “200+”, “98%”, “thousands”, or equivalent claims.

**Release gate:** Both locales pass editorial/product-owner review; raw HTML contains no placeholder links, fake listings, or unsupported claims.

### 2. Make commercial content indexable and trustworthy

#### Pricing server data

- [ ] Add a server-side plans loader for `app/[lang]/page.js` using the internal API and an explicit timeout/error policy.
- [ ] Pass the returned snapshot into `PricingSection`/TanStack Query as `initialData`; preserve client refresh and tab interaction.
- [ ] Render the Basic, Premium, and Business pathways in the initial HTML.
- [ ] Use one plan snapshot for visible prices and structured-data offers.
- [ ] Define the first-render failure behavior:
  - [ ] Prefer a last-known ISR page when one exists.
  - [ ] On a cold failure, fail honestly or render a contact CTA instead of stale invented prices.
- [ ] Do not duplicate plan prices into multiple frontend constants. If a static fallback catalog is required, assign an owner and update process because database plans are editable.

#### Rendering and caching

- [ ] Explicitly choose and implement static/ISR behavior for public locale pages; do not assume an existing `revalidate` export.
- [ ] Add `generateStaticParams` for supported locales if using static generation.
- [ ] Review `middleware.js` and `i18nRouterConfig.serverSetCookie="always"`; avoid forcing a locale cookie on explicitly prefixed public URLs when it is not needed.
- [ ] Set public caching at one authoritative layer and document it.
- [ ] Never apply public caching rules to account, checkout, dashboard, authenticated API, or personalized responses.
- [ ] Verify cache-hit behavior, locale isolation, revalidation, and plan-update freshness in staging.

#### Structured data and metadata

- [ ] Reuse `halaa-web/shared/src/brand/jsonld.js` (`safeJsonLd` and `pruneEmpty`) rather than creating another serializer.
- [ ] Add valid landing-page JSON-LD for:
  - [ ] `Organization` using approved legal/brand contact data.
  - [ ] `SoftwareApplication` with accurate platform/category details.
  - [ ] `Offer` entries generated from the same server-loaded plans displayed on the page.
  - [ ] `FAQPage` generated from visible FAQ content.
- [ ] Add `BreadcrumbList` only on routes with a meaningful hierarchy; do not add a cosmetic home-only breadcrumb solely to satisfy the audit wording.
- [ ] Do not emit `AggregateRating`, `Review`, or unsupported availability claims.
- [ ] Strengthen the Arabic and English landing titles around invitation/event-management intent while keeping them natural.
- [ ] Fix legal-page title inputs so the root layout does not append `Halaa`/`هلا` twice.
- [ ] Set `metadataBase` to the validated production origin so Open Graph and Twitter image URLs do not fall back to localhost during builds.
- [ ] Keep existing canonical, hreflang, robots, sitemap, `lang`, and `dir` behavior intact.
- [ ] Validate schema with Google Rich Results Test and Schema.org Validator. Treat rich-result display as non-guaranteed.

#### Gallery accessibility, not an SSR rewrite

- [ ] Add localized name/occasion metadata to the 16 entries in `InvitationsCarousel.jsx`.
- [ ] Use that metadata for concise, meaningful image alt text.
- [ ] Remove `loading="eager"` and `fetchPriority="high"` from the below-the-fold first gallery image unless measurement proves it is the LCP element.
- [ ] Keep the current interactive carousel architecture unless another measured issue justifies a rewrite.

**Release gate:** With JavaScript disabled, both locale pages show current pricing, a business contact route, valid metadata, and parseable JSON-LD with no price mismatch.

### 3. Reduce page weight and improve Core Web Vitals

#### Hero media

- [ ] Replace the eight PNG layers with optimized WebP/AVIF assets or a smaller composite where animation/layout permits.
- [ ] Use `next/image` sizing or equivalent responsive `srcset` behavior.
- [ ] Prevent React/Next from preloading every hero layer; prioritize only the measured LCP asset.
- [ ] Keep decorative hero imagery at `alt=""` and out of the accessibility tree.
- [ ] Verify the visual result at mobile, tablet, desktop, LTR, and RTL widths.

#### Translation/HTML payload

- [ ] Replace the global 37-namespace list in `halaa-web/providers/index.js` with route-scoped namespaces.
- [ ] Initialize and serialize only the current locale for the request; do not preload both Arabic and English resource trees into every landing response.
- [ ] Confirm navigation still loads namespaces needed by the destination route.
- [ ] Re-measure raw HTML/RSC size after this change before pursuing broad component rewrites.

#### Fonts, scripts, and temporary assets

- [ ] Remove unused Tajawal and Great Vibes declarations from the global landing bundle.
- [ ] Keep only required Cairo faces globally and route-scope Amiri/other invitation-editor fonts to the routes that use them.
- [ ] Run a bundle analyzer and document the largest client chunks before splitting code.
- [ ] Remove all Builder `TEMP` image URLs, including references in dormant landing components.
- [ ] Replace visible vendor/CTA imagery with owned optimized assets or verified vendor media.
- [ ] Lazy-load genuinely below-the-fold UI and media without hiding indexable text.

#### Performance budgets

- [ ] Agree and enforce budgets for route HTML, compressed JS/CSS, hero bytes, font requests, and image requests.
- [ ] Run Lighthouse/WebPageTest on a production-like connection for `/ar` and `/en`.
- [ ] Confirm no hydration mismatch, layout shift, or RTL regression.

**Release gate:** The eight-image 1.99 MB hero preload pattern is gone, translation resources are route/locale scoped, and both locales meet the agreed performance budgets.

### 4. Accessibility and web security

#### Accessibility

- [ ] Add a localized skip-to-content link as the first focusable control.
- [ ] Add a stable target such as `<main id="main-content">` and verify focus moves correctly.
- [ ] Localize generic labels such as “Toggle menu”, “Switch language”, and carousel-dot labels.
- [ ] Add an automated axe scan and an accessible-name regression test; do not treat the old “19 unnamed controls” count as a current defect.
- [ ] Introduce an accessible landing-page muted-text token or update semantic usages that fail contrast.
- [ ] Test small text and interactive states against WCAG AA in both themes/backgrounds actually used.
- [ ] Keyboard-test header, language switcher, pricing tabs, carousels, FAQ, vendor CTA, and footer.

#### Security headers

- [ ] Configure public web headers at the Caddy layer, with environment-specific values where required:
  - [ ] `Content-Security-Policy-Report-Only` initially, then enforced `Content-Security-Policy`.
  - [ ] `Strict-Transport-Security` after HTTPS and all relevant subdomains are verified; do not add `preload` prematurely.
  - [ ] `X-Content-Type-Options: nosniff`.
  - [ ] `Referrer-Policy`.
  - [ ] `Permissions-Policy`.
  - [ ] Framing protection through CSP `frame-ancestors` and, if compatibility requires it, `X-Frame-Options`.
- [ ] Inventory current and planned origins for APIs, fonts, images, analytics, maps, error monitoring, and payment providers before writing CSP.
- [ ] Collect/report CSP violations in staging, tighten directives, then enforce.
- [ ] Add automated header assertions for the public HTML response.

**Release gate:** Keyboard/axe checks pass, normal text meets WCAG AA, the skip link works, and staging has an enforceable CSP with no required application flow blocked.

### 5. Add measurement with privacy controls

- [ ] Approve a measurement owner, analytics provider, consent policy, data-retention policy, and environment IDs.
- [ ] Implement a provider-neutral event layer before adding vendor-specific calls.
- [ ] Define a small event dictionary with names, triggers, permitted properties, and business owner:
  - [ ] `landing_view` with locale.
  - [ ] `signup_cta_click` with placement and locale.
  - [ ] `pricing_view` and `pricing_plan_select` with plan ID/type, not copied display text.
  - [ ] `business_whatsapp_click` with placement and locale.
  - [ ] `marketplace_view` and `vendor_open`.
  - [ ] `store_badge_click` only when a real public link exists.
- [ ] Load analytics only in production with valid configuration; keep development/test deterministic.
- [ ] Obtain consent before advertising pixels or session replay where required.
- [ ] Redact message contents, phone numbers, emails, invitation details, and other personal data from analytics/replay/error payloads.
- [ ] Update the privacy notice/provider list to reflect what is actually deployed.
- [ ] Verify events in provider debug tooling and add automated event-contract tests.

**Release gate:** The approved funnel is observable end to end, duplicate events are absent, and no personal event/guest data is transmitted.

### 6. Improve conversion with verified content

- [ ] Build a lightweight real-product sequence showing:
  - [ ] Invitation received through the supported guest channel.
  - [ ] Guest RSVP interaction.
  - [ ] Host dashboard/status update.
- [ ] Use optimized stills or a short user-controlled demo before adding autoplay video.
- [ ] Publish quantified trial terms only from the verified canonical source.
- [ ] Preserve the existing Basic/Premium distinction and server-render the Premium managed-service benefits.
- [ ] Track the existing Business WhatsApp CTA.
- [ ] Add a lead form only when routing, ownership, response SLA, privacy handling, and spam protection are defined.
- [ ] Add testimonials, customer logos, event counts, satisfaction metrics, or ratings only with evidence, permission, date/source ownership, and a refresh process.

**Release gate:** Every displayed proof point is traceable to approved evidence, and the primary signup/business journeys are measurable.

### 7. Build sustainable organic coverage

- [ ] Create a keyword/content map for Saudi event invitations and management by occasion and user intent.
- [ ] Prioritize a small number of genuinely useful pages, such as occasion guidance, invitation wording, RSVP operations, and verified marketplace categories.
- [ ] Give each page unique copy, metadata, internal links, and an accountable content owner.
- [ ] Server-render meaningful marketplace/category content where it benefits search users.
- [ ] Add individual public vendor/template pages only when each page has sufficient unique, authorized content.
- [ ] Update sitemap generation and internal linking as pages become publishable.
- [ ] Monitor indexation, queries, impressions, conversions, and content decay; consolidate pages that remain thin.

**Release gate:** New pages satisfy a documented usefulness/uniqueness threshold and are not generated merely to increase URL count.

## Suggested pull-request sequence

1. **Integrity hotfix:** placeholder links, fake vendors/reviews, unsupported dormant claims, and locale copy corrections.
2. **Server-rendered commercial data:** plans, real vendor preview, caching/ISR, titles, and safe JSON-LD.
3. **Payload performance:** hero conversion, route-scoped translations, font cleanup, temporary assets, and bundle budgets.
4. **Accessibility:** skip link, localized control labels, contrast, and automated regression tests.
5. **Security headers:** report-only CSP, remaining headers, staging validation, then enforcement.
6. **Measurement:** approved event layer, consent, analytics, and privacy updates.
7. **Conversion/content:** real product demonstration, verified proof, lead workflow, and later organic landing pages.

## Owner decisions and external dependencies

- [ ] Provide production Apple App Store and Google Play URLs when public releases exist. Until then, approve the non-link/website-signup treatment.
- [ ] Approve the exact paid-reminder and trial-reminder wording in both locales.
- [ ] Confirm that the database/default trial entitlement matches actual signup provisioning.
- [ ] Approve which real vendors may appear on the landing page and whether the public endpoint should require active services.
- [ ] Choose the analytics/error-monitoring stack and approve consent/privacy requirements.
- [ ] Confirm every domain required by CSP and verify all subdomains before considering HSTS preload.
- [ ] Supply evidence and permission for any future testimonial, logo, usage count, rating, or satisfaction metric.

## Final definition of done

- [ ] All critical and high-severity items are closed or explicitly accepted by the product owner with rationale.
- [ ] Arabic and English raw HTML contain the same verified commercial facts.
- [ ] Prices, business contact, and core content work without client JavaScript.
- [ ] No dead links, fabricated listings/reviews, unsupported claims, or temporary external assets remain.
- [ ] JSON-LD, titles, canonical/hreflang, robots, and sitemap pass automated and external validation.
- [ ] Performance, accessibility, caching, and security-header budgets pass on a production-like deployment.
- [ ] Analytics records the approved funnel without personal guest/event data.
- [ ] A post-deployment crawl and Lighthouse/WebPageTest run confirms the live site, not just the repository, has improved.
