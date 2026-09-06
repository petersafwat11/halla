# Simplified SEO implementation — September 6, 2026

Scope: the owner-approved simplified plan, on top of working-tree revision `c94e3ffc`. No commit, deployment, database migration, existing-subscription update, DNS change or new Google property was made. Unrelated signup/vendor/mobile changes were preserved.

## Implemented locally

Owner-requested palette follow-up: restored inherited brand caramel `#c28e5c` and hover/login brown `#8a6541`, removing landing primary-500/700 overrides. Landing supporting text uses taupe `#71665d`; separate bronze text accent `#805b3a` preserves readable labels without darkening fills/borders. Existing espresso headings, ivory surfaces and white cards remain. Shared PlanCard text has a landing-only variable with its original fallback, so other consumers retain their appearance. Global primitives and shared button definitions were not edited. Restoring original white-on-caramel navigation/buttons reintroduces contrast warnings; earlier zero-violation results do not apply to this palette. The owner-requested original appearance is preserved pending a foreground-color decision.

- [x] Fixed all three new-account trial provisioning callers to pass the full plan. A read-only query confirmed the stored trial has one event, five guests/invitations and 90 days. Published those terms in both FAQ languages, without a no-card promise or trial-specific reminder exception.
- [x] Removed five placeholder footer social links. No approved social URLs exist. Support contacts remain. Reviews remain disabled; no fabricated vendor rating enters the landing payload.
- [x] Inspected all 16 owned gallery thumbnails and added individual Arabic/English descriptions. Below-fold thumbnails are lazy-loaded; decorative icons stay empty-alt.
- [x] Removed the visible Builder TEMP vendor image and retired the two unused TEMP mockup components. No replacement stock imagery or unsupported product screenshots were introduced.
- [x] Added a localized first-focus skip link and main target; named mobile menu/tour/carousel controls; made scrollable galleries keyboard-focusable; corrected tour arrow-key focus movement. Removed nested header buttons inside links.
- [x] Fixed measured contrast failures using landing-scoped warm colors and narrowly scoped card variables. Other application surfaces retain their colors. Colors were left unchanged during the subsequent owner-requested pricing cleanup; palette review is deferred.
- [x] Restricted landing vendor serialization to the actual public card fields, excluding contacts, ratings/reviews and arbitrary extra fields. Still uses the existing marketplace card/public approved-vendor endpoint.
- [x] Server translations load one locale. Landing, marketplace and legal/support pages receive four needed namespaces, not every dashboard dictionary. Existing other-route initial dictionaries remain; the client loads missing namespaces on navigation. No i18n framework replacement or route-tree rewrite.
- [x] Removed unused global Amiri/Great Vibes declarations and Swiper CSS. Cairo remains global; the existing Tajawal carousel keeps its own scoped font. Invitation editor font configuration was not changed.
- [x] Kept dynamic locale rendering and the existing bounded public pricing cache. No whole-page ISR/Redis/distributed cache project. Kept locale-cookie behavior because changing it naively can redirect explicit language choices back to the previous cookie locale.
- [x] Kept server-loaded pricing and the existing interactive cards. Removed the duplicate full pricing list, its component, grouping helper, styles and translation labels at the owner's request. Structured-data offers now match the currently selected cards and update with tab/invitation changes from the same snapshot. Business setup fees remain visible inside the cards and disclosed separately in offer descriptions. No invented fallback prices.
- [x] Added missing absolute OG/Twitter images to legal metadata; verified absolute images for landing, legal and marketplace routes. Existing absolute legal titles prevent duplicate branding.
- [x] Fixed sitemap vendor requests: the old limit of 200 was rejected by the API's maximum of 100. Runtime pagination now uses 100, shares a four-second budget, and retains static public URLs on failure. Sitemap cannot be frozen without vendors by an offline build.
- [x] Added web-only Caddy nosniff, referrer policy, same-origin framing and restrained permissions policy. Camera, geolocation and payment are not disabled. Verified canonical HTTPS before adding one-day HSTS; no preload or includeSubDomains.
- [x] Added a report-only CSP, not enforced CSP. No reporting service was introduced.

## Google services — verified in the Halaa account

- [x] Used existing `halaa.events@gmail.com` / `halaa.com.sa` Search Console domain property.
- [x] Submitted `https://halaa.com.sa/sitemap.xml`. Google reported **Sitemap processed successfully**, last read September 6, 2026, **16 discovered public pages**. The initial transient “Couldn't fetch” status resolved; no duplicate resubmission was necessary.
- [x] URL inspection: English homepage and Arabic marketplace both show **URL is on Google / Page is indexed** and HTTPS. No redundant indexing request was sent.
- [x] Existing GA4 property/tag confirmed: Halaa Website, `G-W5K5N7TL0D`. It currently reports **no data received**; local code does not establish deployed collection.
- [x] Retention inspected, not changed: **event data 2 months; user data 14 months; reset on new user activity enabled**. Recommend considering 2 months for user-level data and disabling reset for a bounded prelaunch retention period; owner/privacy review should decide that setting. This is not a legal compliance certification.
- [x] Consent, decline, withdrawal, safe event properties and unmount behavior are regression-tested. No GTM/pixels/replay/error-reporting platform added.

## Verification evidence

- Production build: **passed**, isolated output `.next-seo-final`, Next 15.5.23. Landing first-load JS reported by Next: **197 kB**.
- Web suite: **206 tests passed**. Trial regression: **2 tests passed**, no database writes. Tests include public namespace routing, gallery descriptions, vendor projection, Business terms, legal social metadata, sitemap pagination, price failure/expiry/partial catalogs, consent and hook-safe hidden reviews.
- Caddy **2.11.4** configuration validation: **passed**. Official downloaded artifact SHA-512 verified. Docker daemon was unavailable; the standalone CLI validated configuration without starting the reverse proxy or deploying it.
- Before the owner-requested pricing cleanup, Arabic and English at **390px and 1440px** had **zero axe WCAG 2 A/AA and 2.1 AA violations**, no page errors and no horizontal overflow. Keyboard first focus reached the skip link and activation focused main. Those full-page accessibility/visual results predate removal of the duplicate list.
- After pricing cleanup: production build and **206 web tests passed** again. On the existing development server, all **32 plan selections in each language** match rendered card prices and changing structured-data offers, with no duplicate list or page errors. Initial HTML includes the default selected cards and their matching offers; inactive selections remain available through the existing controls, not a second list. Business setup-fee visibility is verified.
- Client landing-to-login navigation, language switching, tour keyboard focus, and absolute social-image checks pass in both languages. Host/vendor initial HTML retains dictionaries and noindex. This does **not** certify authenticated dashboard/payment workflows.
- New production-preview launch was rejected by the execution policy. The latest interaction/axe checks therefore used the existing development server at port 3000; the old production baseline at port 3100 was not overwritten or stopped. Do not relabel development measurements as production results.

### Payload evidence, with like-for-like limits

Using the final dictionaries to compare the old selection rule (35 namespaces × two languages) with the new landing selection rule:

| Serialized dictionary data | Bytes |
| --- | ---: |
| Old selection, both languages | 426,126 |
| New Arabic landing selection | 48,595 |
| New English landing selection | 35,239 |

This reduces dictionary serialization by about **89% / 92%**. These are JSON bytes, not compressed network-transfer sizes.

Fresh old-production baseline HTML was approximately 658 KB Arabic / 652 KB English. Final development HTML was approximately 264 KB / 243 KB, but these different server modes are **not** a valid production before/after benchmark. Both browser scans actually requested two fonts totaling 64,356 encoded bytes; no measured font-download saving is claimed despite removing unused global declarations.

Lighthouse 13.4.1 failed with `NO_LCP` in this environment (and an Edge temporary-profile cleanup error). Three-run throttled tests in both Edge and Chrome also produced no valid LCP entries. **LCP is unavailable, not zero; the 2.5s goal is not checked off.** No field INP or Core Web Vitals pass is claimed. Search Console currently has no field CWV sample.

### CSP origin inventory and rollout boundary

- Next assets/API and locally served editor fonts: same origin.
- GA tag: `www.googletagmanager.com`; collection uses Google Analytics HTTPS endpoints after consent only.
- Maps: `maps.googleapis.com`, `maps.gstatic.com`; Google web fonts: `fonts.googleapis.com`, `fonts.gstatic.com`.
- Upload/media: existing S3/media origins, plus `data:`/`blob:` previews.
- Payments: server-mediated checkout and external hosted/3DS destinations; HTTPS connect/frame sources remain broad during observation.

The policy allows inline Next scripts/styles for current compatibility and is report-only. Without a report endpoint, violations are available in browser diagnostics rather than centrally collected. Narrow origins/enforce only after real map/upload/signup/payment smoke checks. HSTS/framing/header behavior must be checked on deployed responses, not inferred from validation alone.

## Still open — do not mark the entire release verified

- [ ] Approve and deploy a scoped release after reviewing the dirty worktree; do not deploy unrelated unfinished changes automatically.
- [ ] Run the latest production build in a permitted preview environment and repeat the raw HTML/network/mobile performance comparison. Obtain valid LCP/CLS measurements; investigate regressions before launch.
- [ ] Smoke-test authenticated admin/host/vendor navigation and real sandbox payment/3DS, maps and uploads with test accounts. Synthetic routing hints are not login credentials; admin server guards prevented an authenticated check here.
- [ ] Verify deployed headers, public sitemap vendor URLs, honest pricing fallback/freshness and actual GA4 event receipt after opt-in. Confirm decline/withdrawal send no additional events. Production GA currently has no data.
- [ ] Owner/native Saudi Arabic editorial sign-off. Automated/AI review is not a substitute.

No further product decision is required to merge the implemented code. The retention recommendation is optional and unchanged. Release approval and the verification items above remain distinct from implementation completion.

## Reusable checks

- `npm test` in `halaa-web`; `node --test test/trial-provisioning.test.js` in `halaa-backend`.
- `scripts/audit-landing.cjs`: both locales/viewports, axe, errors, resources, screenshots and keyboard skip.
- `scripts/verify-landing-navigation.cjs`: public/auth navigation and dictionary/metadata checks, with documented authentication limits.
- `scripts/verify-landing-pricing.cjs`: database snapshot vs initial selected-card HTML/schema, all card selections in both languages, Business setup fees and absence of the duplicate list. `BASE_URL` selects the permitted test server; optional `COLD_BASE_URL` exercises an already configured outage server.
- `scripts/measure-landing.cjs`: three cold-cache mobile runs; absent LCP stays null. This diagnostic is not a Lighthouse replacement or a field INP test.

Scripts accept `PLAYWRIGHT_PACKAGE` for an existing Playwright installation. The accessibility audit also needs axe-core. Output screenshots/logs are written to the system temporary directory, not committed.
