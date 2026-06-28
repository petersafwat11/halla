# Halaa store readiness — independent review findings

**Review date:** 2026-06-28  
**Reviewed:** `store-readiness-IMPLEMENTATION-STATUS.md`, `store-readiness-EXTERNAL-STEPS.md`, the original SHIP plan, the older plan-catalog rewrite, and the current backend/web/mobile working tree.  
**Verdict:** **not store-ready and not ready to configure the production SKU catalog yet.** Claude delivered substantial foundations, but the implementation-status document overstates completion. The largest risks are native-billing correctness, an unresolved plan-catalog contradiction, incomplete deletion/UGC coverage, and missing proof tests.

This file is the corrective audit. A checkmark in the prior status file is not accepted unless the acceptance evidence listed here exists.

## 1. What was genuinely completed

The following work is real and useful, subject to the remaining verification gates:

- Stable `billingUserId` exists and the mobile SDK avoids anonymous purchases.
- RevenueCat webhook authentication, event persistence, a payment ledger, store fields, and a reconciliation endpoint exist.
- Mobile purchase, restore, and store-management entry points exist.
- Account-deletion UI, API, request records, reauthentication, and session revocation exist.
- Moderation models/routes and report/block UI were added for post-event and vendor surfaces.
- Rate limiting, production webhook fail-closed behavior, readiness plumbing, Sentry configuration, deep-link routes, and permission reductions were added.
- Web and mobile privacy/terms JSON files are byte-for-byte identical today.
- Backend tests pass (17/17), mobile lint passes, Expo Doctor passes (18/18), backend production audit is clean, and web lint has warnings but no errors.

These are foundations—not final acceptance. There are no automated tests for RevenueCat lifecycle processing, native purchase reconciliation, deletion completeness, moderation behavior, legal parity, or SEO metadata.

## 2. Release-blocking findings

### P0-01 — the canonical plan catalog is unresolved

`docs/plans-rewrite-2026-05.md` specifies ten invite tiers for each basic/premium event/monthly family and business event: `25, 50, 75, 100, 150, 200, 250, 300, 350, 400`, for 54 database plans including trial/unlimited.

The current code contains only six tiers (`25, 50, 75, 100, 150, 200`) and `seedPlans.js` expects 34 total plans:

- `labbe-backend-/src/shared/constants/plans.js:26`
- `labbe-backend-/src/shared/constants/planDefaults.js:243`
- `labbe-backend-/scripts/seedPlans.js:54`

The current SKU matrix mirrors the reduced six-tier code, so it does **not** satisfy the earlier plan. Store product IDs are effectively permanent; do not create production products until the owner approves one catalog. The recommended path is to restore the explicitly approved ten-tier catalog, then generate the store manifest from code.

**Acceptance:** one signed catalog manifest; plan constants/defaults/seed/API/web/mobile/store products/RevenueCat maps all match it exactly; zero orphan or missing codes.

### P0-02 — mobile reconciliation does not verify the purchase just made

`PlansSummaryScreen.reconcileBackend()` returns success for any `hasBackendAccess`. A user who already has a trial/old plan can therefore receive immediate “success” before the new webhook is processed, and selected add-ons can attach to the old subscription.

- `halla-mobile/screens/host/PlansSummaryScreen.js:353`
- `labbe-backend-/src/modules/payments/revenuecat.controller.js:204`

The original SHIP plan required the expected active product/plan/transaction, not generic access.

**Acceptance:** reconciliation accepts an expected purchase correlation (`transactionIdentifier` and expected store product/plan/add-on code), returns pending until that exact grant exists, and cannot pass because of a trial or unrelated active subscription.

### P0-03 — the event-package second-purchase guard is dead code on mobile

The backend returns `canBuyEvent`, but no mobile code reads it. Event products remain purchasable while an unused event entitlement or recurring plan is active.

- `labbe-backend-/src/modules/payments/revenuecat.controller.js:184`
- repository search shows no mobile consumer outside the server response

If a store event package arrives while a recurring plan is active, the backend records an `unused` entitlement with no `subscriptionId`. It cannot be consumed and can permanently block future event purchases.

- `labbe-backend-/src/modules/payments/revenuecat.service.js:200`
- `labbe-backend-/src/modules/payments/revenuecat.service.js:249`

**Acceptance:** preflight is enforced in the client and backend; delivery during a race is deterministically credited or refunded, never left as an unconsumable ledger-only grant.

### P0-04 — RevenueCat refund lifecycle is modeled incorrectly

Current RevenueCat webhook documentation uses `CANCELLATION` with `cancel_reason` for cancellations/refunds and has `REFUND_REVERSED`; there is no general `REFUND` webhook type in the documented lifecycle table. The code ignores `cancel_reason`, treats every cancellation as end-of-period, and places revocation logic in an event branch that will not normally execute.

- `labbe-backend-/src/modules/payments/revenuecat.service.js:365`
- `labbe-backend-/src/modules/payments/revenuecat.service.js:397`
- Official event table: https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields

Additionally, the current `REFUND` branch revokes every active store subscription even when the refunded transaction is an add-on or event package. `REFUND_REVERSED` only repairs the payment row; it does not restore the revoked subscription/event/add-on.

**Acceptance:** event reducer branches by product kind, `cancel_reason`, canonical store state, and transaction lineage; unrelated entitlements are untouched; reversal restoration is explicit and tested.

### P0-05 — RevenueCat money is recorded with the wrong amount/currency pairing

RevenueCat documents `price` as USD and `price_in_purchased_currency` as the amount in `currency`. The ledger writes `ev.price` together with `ev.currency`, which can record a USD number as SAR.

- `labbe-backend-/src/modules/payments/revenuecat.service.js:99`
- Official field definitions: https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields

**Acceptance:** use `price_in_purchased_currency` with `currency`; optionally retain normalized USD separately; fixture tests cover SAR, free trials, null price, refunds, and renewals.

### P0-06 — un-cancellation refills usage incorrectly

`UNCANCELLATION` shares the purchase/renewal branch. For an existing same-plan subscription, `grantSubscription()` calls `renew()`, resetting the invite pool even though no renewal occurred.

- `labbe-backend-/src/modules/payments/revenuecat.service.js:315`
- `labbe-backend-/src/modules/payments/revenuecat.service.js:154`

This contradicts the status file’s “UNCANCELLATION no new pool” claim.

**Acceptance:** un-cancellation only clears cancellation flags and reconciles expiry; it never refills grants.

### P0-07 — Google Play plan changes are not implemented

RevenueCat requires the old Google product and a replacement mode for subscription upgrades/downgrades. Mobile calls plain `purchasePackage(pkg)` and does not supply `oldProductIdentifier` or a replacement mode.

- `halla-mobile/services/purchases.js:91`
- `halla-mobile/screens/host/PlansSummaryScreen.js:387`
- Official guidance: https://www.revenuecat.com/docs/subscription-guidance/managing-subscriptions

**Acceptance:** classify upgrade/downgrade/crossgrade, pass the current Play product and approved replacement mode, test immediate upgrade and deferred downgrade, and reconcile the effective—not merely requested—product.

### P0-08 — destructive lifecycle changes fail open when RevenueCat is unavailable

`getSubscriber()` converts network/auth errors to `null`; expiration/refund paths then fall back to event timestamps. An old/out-of-order expiration can revoke a newer plan if the canonical snapshot call is unavailable.

- `labbe-backend-/src/modules/payments/revenuecat.api.js:21`
- `labbe-backend-/src/modules/payments/revenuecat.service.js:129`
- `labbe-backend-/src/modules/payments/revenuecat.service.js:387`

**Acceptance:** production destructive actions require a trustworthy canonical snapshot or transaction-specific proof; transient lookup failure returns 5xx for retry rather than revoking access.

### P0-09 — entitlement selection is unscoped

`deriveActiveEntitlement()` iterates every RevenueCat entitlement and keeps whichever active entry is encountered last. RevenueCat warns that consumables attached to entitlements unlock them forever. If an add-on/consumable is attached to an entitlement, it can masquerade as the active subscription.

- `labbe-backend-/src/modules/payments/revenuecat.api.js:46`
- RevenueCat entitlement behavior: https://www.revenuecat.com/docs/getting-started/entitlements

**Acceptance:** configure and validate one explicit recurring-access entitlement ID; never attach consumables to it; derive status only from the configured entitlement and verify its product is in the recurring catalog.

### P0-10 — add-on fulfillment can silently fail

Store add-on grants create an active record and swallow `applyQuota()` failures. `applyQuota()` also returns without error if no subscription is attached. The UI/backend may report success after the customer was charged but received nothing.

- `labbe-backend-/src/modules/addons/addons.service.js:426`
- `labbe-backend-/src/modules/addons/addons.service.js:460`
- `labbe-backend-/src/modules/addons/addons.quota.js:20`

The metadata transaction lookup is not protected by a unique database index, so concurrent deliveries can double-grant.

**Acceptance:** unique provider transaction field; transactional grant; missing target is an error; failed fulfillment becomes `failed_quota` plus automatic/manual refund queue; exact add-on reconciliation and replay tests.

### P0-11 — add-on refunds/reversals are not implemented

There is no transaction-scoped removal/reversal for extra invites, templates, or business customization. The generic refund branch only updates Payment/EventEntitlement and revokes subscriptions.

**Acceptance:** define reversible state per add-on; unused invite credits are removed without making usage negative, fulfilled services follow the approved refund policy, and reversal is idempotent.

### P0-12 — business IAP claims do not match code

The status file says every self-serve business plan is purchased via IAP. In fact:

- A business without an active subscription is locked out of initial self-purchase (`BusinessPlansScreen.js:35`, `checkout.service.js:47`).
- `isCurrent` compares only `planType`, so every business-event invite tier can appear current (`BusinessPlansScreen.js:197`).
- The webhook path has no explicit business-first-purchase policy separate from the web checkout policy.

**Acceptance:** decide and document D8 behavior. If business is truly self-serve, permit an eligible business account to buy its first simplified store plan and test all tier changes. If it remains admin-first, remove those SKUs and claims from native/store metadata.

### P0-13 — native checkout presents inaccurate totals and terms

Only the footer swaps the plan price to store `priceString`; `PlanSummaryCard`, `PaymentSummaryCard`, and add-on summaries still show backend SAR totals. The footer excludes separately purchased add-ons. Period, renewal, trial/offer terms, and clickable legal links are not presented. Manage Subscription is shown even for consumable event packages.

- `halla-mobile/screens/host/PlansSummaryScreen.js:460`
- `halla-mobile/screens/host/PlansSummaryScreen.js:569`
- `halla-mobile/screens/host/PlansSummaryScreen.js:594`

**Acceptance:** every native monetary value is store-sourced; each separate charge is disclosed; recurring vs one-time wording/actions differ; legal links are actionable; accessibility/RTL and Dynamic Type are tested.

### P0-14 — billing configuration can be missing while production reports ready

`readiness.js` does not require RevenueCat auth/API/app/environment/catalog variables. `config.env.example` omits `REVENUECAT_API_KEY`, `REVENUECAT_APP_ID`, `REVENUECAT_ENVIRONMENT`, and `REVENUECAT_ADDON_PRODUCT_MAP`. JSON mapping parse errors silently become empty maps.

- `labbe-backend-/src/shared/utils/readiness.js:13`
- `labbe-backend-/config.env.example:108`
- `labbe-backend-/src/modules/payments/revenuecat.service.js:37`

**Acceptance:** native billing enabled flag; strict schema and startup validation; exact manifest/map coverage; readiness fails when any required integration element is missing.

## 3. High-priority non-billing findings

### P1-01 — reviewer host silently receives trial, not a paid review plan

The default `REVIEWER_HOST_PLAN=premium_monthly` does not exist; valid codes include an invite tier suffix. The script silently falls back to `trial`, contradicting its paid-feature promise.

- `labbe-backend-/scripts/seedReviewerAccounts.js:24`
- `labbe-backend-/scripts/seedReviewerAccounts.js:56`
- `labbe-backend-/scripts/seedReviewerAccounts.js:153`

**Acceptance:** valid default (for the approved catalog), fail closed instead of trial fallback, seed both personal-host and business-host reviewer scenarios if both are reviewable, and run a smoke login.

### P1-02 — account deletion is not complete and can falsely report success

Examples found in the current deletion service:

- S3 failure is marked non-mandatory, so `mandatoryFailed` remains false and status can be `completed` despite undeleted personal files (`users.service.js:759`, `users.service.js:810`).
- Event `visualTemplate.bakedImagePath` and `staffList` names/phones are not collected/scrubbed.
- Post-event `coverImage`, `thumbnailUrl`, and comment image `thumbnail` are not collected.
- Full HTTPS S3 URLs are excluded from deletion by `isS3Key()`.
- Newly added `TermsAcceptance` (IP), `Report`, `Block`, `RevenueCatEvent.rawPayload`, `EventEntitlement`, `Addon`, and other user-linked rows have no approved delete/retain action.
- There is no durable worker/retry path for partial work after the user is closed.
- No downstream processor erasure/tombstone workflow exists for RevenueCat, Sentry, messaging providers, or other processors.

**Acceptance:** model-by-model deletion matrix, retryable worker, truthful status, zero remaining non-retained PII in a throwaway database/S3 fixture, and processor-request evidence.

### P1-03 — Community Rules URLs are published in code but the pages do not exist

`policies.js` points to `/ar/community-rules` and `/en/community-rules`; there is no corresponding web or mobile legal document. The SHIP plan required public AR/EN Community Rules and support pages.

- `labbe-backend-/src/shared/constants/policies.js:27`

**Acceptance:** live 200 pages, version synced to acceptance records, linked from reporting/acceptance/settings/store listings.

### P1-04 — UGC enforcement and blocking cover only part of the product

Terms enforcement is mounted on post-event comment/media flows, not every host/vendor/guest UGC creation surface. Block read filtering is implemented for guest comments but not consistently for vendor profiles, media, likes, search/results, or all actor/content combinations.

**Acceptance:** inventory every UGC write/read route; middleware test proves acceptance on all writes; blocked actors/content disappear from every viewer-facing read path; moderation decisions affect the same paths.

### P1-05 — upload scanning is not store-ready

Magic-byte verification, malware scanning, quarantine, and operational failure policy remain external/unimplemented. File-extension checks are not sufficient for arbitrary uploads.

**Acceptance:** quarantine-first pipeline, magic-byte allowlist, scanner verdict, timeout/failure behavior, signed access, and malicious fixture tests.

### P1-06 — legal contact details conflict

The web legal component uses `support@halaa.net`, while delete-account uses `support@halaa.com.sa`; other support placeholders also exist. This is both a trust and store-review risk.

**Acceptance:** one owner-approved legal entity name, postal address, support email, phone/WhatsApp, response SLA, and domain applied to every surface and store listing.

### P1-07 — legal parity is accidental duplication, not a controlled source

Privacy and terms happen to hash identically, but are copied into two directories. Refund policy exists only on web; Community Rules/Support do not exist; deletion disclosures and policy versions are separate hardcoded sources.

**Acceptance:** one canonical legal-content package consumed by web/mobile/backend version constants; CI hash/schema/link checks prevent drift.

### P1-08 — mobile legal alignment is structurally fragile

`TopBar` always uses `row-reverse`, nests the back control beside the title, and uses a separate one-sided placeholder, so the title is not mathematically centered and changes position across RTL/LTR. `LegalScreen` also manually reverses the section row while global RTL direction is active, risking double reversal.

- `halla-mobile/components/plans/TopBar.js:61`
- `halla-mobile/components/plans/TopBar.js:109`
- `halla-mobile/screens/legal/LegalScreen.js:61`

**Acceptance:** logical start/end layout, symmetric 44×44 controls, independently centered title, Arabic/English screenshot tests on small phone/large phone/iPad/font scaling.

## 4. SEO/ASO and store metadata findings

- No `sitemap`, `robots`, or web manifest route exists.
- Root metadata is Arabic-only and lacks `metadataBase`, canonicals, language alternates, Open Graph, Twitter, icons, and default robots policy.
- Most public pages have no route-specific metadata; authenticated/private routes have no explicit `noindex` policy.
- Legal pages lack canonicals/hreflang/OG; delete-account lacks metadata.
- Vendor JSON-LD needs safe serialization and a validated public-data projection.
- No signed URL inventory distinguishes indexable public pages from private/token pages.
- Expo config has no description/localized app metadata source; App Store/Play AR/EN copy, product localization, screenshot plan, and review notes are not committed as versioned artifacts.
- Mobile “SEO” should be treated as ASO + deep-link/share metadata, not web crawler metadata.

See `store-readiness-SEO-ASO-METADATA-PLAN.md`.

## 5. Verification results and limitations

| Check | Result | Meaning |
|---|---|---|
| Backend tests | 17 pass | None cover the new readiness/billing/deletion/moderation work |
| Mobile ESLint | pass, zero warnings | Static style only |
| Web ESLint | pass with 34 warnings | Existing warnings remain; no build proof |
| Expo Doctor | 18/18 pass | Dependency/config compatibility only |
| Backend production audit | 0 vulnerabilities | Good |
| Mobile production audit | 20 moderate findings | Transitive Expo/RN tooling; do not force-upgrade blindly |
| Web production audit | 2 moderate findings | Transitive Next/PostCSS; evaluate supported patch path |
| Signed IPA/AAB | not available | Permissions, Billing Library, privacy manifest, 16 KB, SDK/toolchain unproven |
| Store sandbox | not configured | No real StoreKit/Play/RevenueCat lifecycle proof |
| Throwaway deletion test | not run | Deletion claims unproven |

## 6. Corrected readiness label

Use these labels from now on:

- **Implemented:** code exists.
- **Unit verified:** targeted automated tests pass.
- **Integration verified:** backend/database/provider fixture passes.
- **Artifact verified:** signed IPA/AAB inspection passes.
- **Sandbox verified:** Apple/Google/RevenueCat lifecycle matrix passes.
- **Console verified:** exact production console values exported and diffed against the manifest.
- **Release accepted:** evidence packet reviewed by a second person.

Nothing in native billing should be called complete before **sandbox verified**.
