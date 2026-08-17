# Halaa Mobile - implementation and store submission plan

**Status:** canonical release plan  
**Policy/code review date:** 2026-06-27  
**Code snapshot reviewed:** local `master` at `1054e471`  
**Companion evidence:** `docs/store-readiness-VERIFIED-audit.md`

This document supersedes `docs/mobile-store-readiness-plan.md` and
`docs/store-launch-checklist.md` wherever they conflict. A checked box means
the acceptance evidence exists; merging code alone is not completion.

## 1. Current verdict and release assumptions

**Do not submit the current build.** It still has security, account-deletion,
user-generated-content (UGC), release-artifact, and monetization gaps.

This plan assumes the first release is:

- distributed in the **Saudi Arabia storefront only**;
- a production release of bundle/package ID `com.halla.app`;
- built from a clean, tagged commit after all P0 and selected-path gates pass;
- phone-first. For the fastest release, set iOS `supportsTablet` to `false`.
  If it remains `true`, iPad layout QA and 13-inch iPad screenshots are
  mandatory.

Expanding countries changes payment/link, privacy, tax, and trader obligations.
Record a new policy review before enabling another storefront.

## 2. Decisions to record before implementation

Copy this table into the release ticket and fill every `Decision` cell.

| ID | Decision | Default for v1 | Owner |
|---|---|---|---|
| D1 | Native monetization | **DECIDED 2026-06-27 → Path B: native subscriptions** (full Section 9; NOT Path A) | Product |
| D2 | Store territories | Saudi Arabia only | Product/legal |
| D3 | iPad support | **DECIDED 2026-06-27 → iPad SUPPORTED** (keep `supportsTablet:true`; iPad QA + 13″ screenshots mandatory) | Product/mobile |
| D4 | UGC | Keep it and implement section 6; do not ship unmoderated UGC | Product/backend |
| D5 | Account-data retention | Legal supplies retained fields, reason, and duration; everything else is deleted/anonymized | Legal/backend |
| D6 | Recurring pool renewal (Path B) | Reset to the plan allowance on each paid period; no rollover, matching existing `Subscription.renew()` behavior | Product/finance |
| D7 | Reviewer access | Dedicated non-privileged email/password host and vendor accounts; no fixed-OTP production bypass | Product/security |
| D8 | Native product catalog (Path B) | **DECIDED 2026-06-27 → MAXIMUM PARITY (overrides the original exclusions below).** Sell in-app via IAP: ALL personal host plans (event consumables + monthly subs, every tier) + ALL add-ons + **simplified self-serve business tiers** (quarterly/annual subs, event consumable; setup fee waived in-app, managed quote/tax flow stays web-only). Discounts on mobile via Apple Offer Codes / Google promo codes (no backend code box). Event packages remain guarded consumables (no force-cancel, no 90-day auto-expiry, block 2nd purchase until consumed). In-app rail = RevenueCat→StoreKit/Play Billing only; Moyasar stays web-only. | Product/finance/legal |

### Path A - consumption-only companion (recommended for first release)

The native app permits existing customers to sign in and use Halaa, but does
not sell or lead users to buy a plan. This is supported by Apple's free
stand-alone companion rule (App Review Guideline 3.1.3(f)) and Google's
consumption-only guidance, subject to review of the actual binary and UI.

Path A requirements:

- Compile a store build with a build-time value such as
  `EXPO_PUBLIC_NATIVE_BILLING_MODE=consumption_only`; do not use a remotely
  switchable flag to add purchasing after review.
- Remove native Plans/Upgrade/Subscribe navigation, plan cards, prices,
  checkout, add-ons, restore, quota upsells, and purchase-related push/deep
  links.
- Do not show a web-purchase link, QR code, web address, price comparison, or
  call to action. On iOS, do not say "buy/upgrade on our website." A neutral
  entitlement-status view may show the user's current access and expiry but no
  purchase destination.
- Keep web Moyasar checkout outside the app unchanged.
- In Apple Review Notes, explain that the binary is a free stand-alone
  companion to the Halaa web service, contains no purchasing or purchase CTA,
  and lets existing customers manage events. In Google App Content, describe
  it as consumption-only.
- Run the repository and manual scans in section 10 against the release bundle,
  not only source code.

Path A avoids the Path B work in section 9. It does **not** avoid the security,
deletion, UGC, privacy, build, QA, or console gates.

### Path B - native subscriptions

Use RevenueCat with StoreKit and Google Play Billing. Section 9 is mandatory
before any native purchase is exposed. Do not combine Path B with Moyasar or a
web checkout in the Saudi native app.

## 3. P0 incident response and production safety

### 3.1 Rotate and remove committed credentials

Current tracked/history evidence includes production AWS, Gmail, Taqnyat,
MongoDB, JWT and certificate material. Treat them as compromised.

- [ ] Rotate AWS keys, Gmail app password, Taqnyat key, Mongo credentials,
  `JWT_SECRET`, Moyasar keys, certificates, and any credentials derived from
  them.
- [ ] Revoke old values and inspect provider logs for unexpected use.
- [ ] Remove `labbe-backend-/config.env`, Mongo `.pem` files,
  `halla-mobile/.env`, and service-account JSON files from Git tracking.
- [ ] Purge them from Git history using a coordinated `git filter-repo`
  operation; force-push only after notifying every collaborator and CI owner.
- [ ] Store production values in the deployment/EAS secret stores. Commit only
  examples with fake values.
- [ ] Add secret scanning in CI and a pre-commit scanner.

**Acceptance evidence:** old credentials are revoked; provider access logs are
reviewed; `git ls-files` returns no secret files; a full-history secret scan is
clean; production deploys successfully from secret stores.

### 3.2 Make the deployed backend fail closed

- [ ] Production has `NODE_ENV=production` and `RATE_LIMIT_ENABLED=true`.
- [ ] Mount the global `apiLimiter` and route-specific limits for auth, OTP,
  events, uploads, messaging, payments, deletion, and UGC reports.
- [ ] Reject WhatsApp webhooks if `WHATSAPP_APP_SECRET` is missing or invalid.
- [ ] Keep Swagger and stack traces unavailable in production; use secure
  cookies where cookies are used.
- [ ] Add health checks that fail deployment when required secrets or allowed
  origins are missing.
- [ ] Upgrade the known high-severity `nodemailer` advisory and run
  `npm audit --omit=dev` for every package before release.

**Acceptance evidence:** forged webhook is rejected; rate-limit tests return
429; production errors are sanitized; required-secret health check fails in a
deliberately incomplete staging deploy; dependency scan has no unresolved high
or critical production finding.

## 4. Account deletion and session invalidation

### 4.1 One deletion service, used by app and web

Refactor `users.service.js` into an idempotent deletion workflow. Prefer a
transaction for database changes plus an outbox/job for S3 and third-party
cleanup. A retried request must continue/finish the same deletion, not create a
second partial process.

- [ ] Reauthenticate with the user's password or an OTP sent to the verified
  phone/email. Reauthentication is a security gate and is explicitly permitted
  by Apple, but it must not make deletion unnecessarily difficult.
- [ ] Immediately invalidate all sessions. Add/check a user token version or
  status in auth middleware so already-issued access JWTs stop working; revoke
  refresh tokens too.
- [ ] Delete or anonymize User top-level and nested profile PII, Guest
  names/phones, Tickets, Notifications, PostEventContent, comments, media,
  vendor profile content, event assets, and all related S3 objects.
- [ ] Request deletion from processors where required. Record each processor's
  outcome.
- [ ] Retain only fields required by the approved legal-retention matrix.
  Pseudonymize retained financial/audit rows and disclose the reason/duration
  in the privacy policy and deletion UI.
- [ ] Do not return final success while mandatory work failed. Return a pending
  state with request ID while asynchronous deletion is running, then send a
  completion notice.
- [ ] Write an append-only audit event that contains IDs/statuses, not deleted
  PII.

### 4.2 Store-subscription behavior (Path B only)

- [ ] Before deletion, detect an active store subscription and warn that store
  billing continues until it is cancelled.
- [ ] Link directly to Apple's subscription manager or Google Play's
  subscription center. Offer immediate deletion; an optional end-of-period
  schedule may also be offered.
- [ ] Deleting the Halaa account must not claim to cancel the store
  subscription automatically unless the relevant store API actually did so.

### 4.3 Public deletion resource required by Google

Create `https://halaa.com.sa/delete-account` in Arabic and English. It must load
without the app and let the user **submit** a deletion request without being
sent back to reinstall the app.

- [ ] The page names Halaa, explains deletion and approved retention, and
  offers an actual request path: sign in and reauthenticate, or submit a form
  followed by verified email/phone confirmation. A dedicated support-email
  request is acceptable but a form/status flow is preferred.
- [ ] The same backend deletion service handles web and native requests.
- [ ] The page gives a request ID/status and expected completion time.
- [ ] Google Data Safety uses the exact canonical URL.

**Acceptance evidence:** automated fixtures covering every related model and S3
prefix contain no non-retained PII after deletion; old access and refresh tokens
return 401; duplicate requests are safe; the public page submits and completes
a request on staging; Path B warns and deep-links to the correct store manager.

## 5. Authentication, links, and reviewer access

### 5.1 Repair password reset and associated links

Choose one canonical HTTPS reset URL and make email, web fallback, Android app
links, iOS universal links, and React Navigation agree. Do not maintain two
shapes. Recommended shape:

`https://halaa.com.sa/<ar|en>/change-password?token=<opaque-token>`

- [ ] Update backend email generation and mobile token parsing.
- [ ] Add `/ar/change-password` and `/en/change-password` to Android intent
  filters and the AASA path/component rules, or use a root canonical route that
  deterministically redirects while preserving the token.
- [ ] Set real `APPLE_APP_ID=<TeamID>.com.halla.app` and the Play App Signing
  SHA-256 in the deployed `.well-known` responses.
- [ ] Return JSON content types with no redirect for both association files.
- [ ] Keep reset tokens single-use, short-lived, and absent from analytics and
  application logs.

**Acceptance evidence:** on clean iOS and Android installs the email opens the
app reset screen; without the app it opens the working web form; reused/expired
tokens fail; Apple's AASA and Google's Digital Asset Links validators pass.

### 5.2 Reviewer account

- [ ] Keep v1 authentication to the existing phone OTP and email/password
  methods. If Google, Facebook, or another third-party/social login is added,
  recheck Apple Guideline 4.8 and add Sign in with Apple where required before
  submission.
- [ ] Remove/disable the fixed-OTP bypass in production.
- [ ] Create dedicated, non-admin host and vendor accounts with stable
  email/password and no real customer PII. Seed Arabic/English sample data and
  give the host a current entitlement for Path A. Explain that admin/moderator
  roles are Halaa staff-only; provide staff review access only if requested.
- [ ] Ensure reviewer accounts do not require SMS, email delivery, MFA,
  CAPTCHA, or a one-time onboarding step during review.
- [ ] Put role-by-role steps and credentials in Apple Review Information and
  Google App access. Rotate passwords after review while retaining a reusable
  reviewer process for updates.

## 6. User-generated content moderation - newly identified store gate

Halaa contains content contributed by users and visible to other users:
post-event photos/videos/comments, guest comments/images, vendor profiles,
portfolios, links, and reviews/content associated with services. Apple's
Guideline 1.2 and Google's UGC policy apply even when content is visible only
to invited guests.

- [ ] Require acceptance of versioned Terms/Community Rules before any host,
  vendor, or guest can upload/post UGC. Store user/guest ID, version, time, and
  locale.
- [ ] Define prohibited content and behavior in Arabic and English.
- [ ] Filter text and validate/scan uploads server-side. Use pending approval
  for guest comments/media until reasonable automated/manual moderation is in
  place; the existing `requireApproval` flag is insufficient without approval
  and rejection operations.
- [ ] Add clearly labelled **Report content** and **Block user** actions wherever
  UGC is viewed, including guest web pages and native vendor/post-event views.
- [ ] Blocking must immediately hide the blocked actor's content from the
  blocker. Reporting must create a durable moderation case with content
  snapshot/hash, reporter, reason, status, SLA, and audit trail.
- [ ] Add host/moderator/admin approve, hide, remove, warn, suspend, and appeal
  operations with least-privilege authorization.
- [ ] Add rate limits, MIME/signature checks, file-size limits, malware scanning,
  safe URL validation, and S3 quarantine for uploads.
- [ ] Publish reachable support/contact information and assign an operational
  moderation owner with a documented response SLA.
- [ ] Add abuse tests: prohibited text, unsafe file, report, block, moderator
  removal, suspended user, repeated report, and unauthorized moderation.

**Acceptance evidence:** a reviewer can report content and block its author from
each UGC surface; reports appear in a staffed moderation queue; blocked/removed
content disappears promptly; Terms acceptance is enforced server-side; the
Arabic and English policies are live.

## 7. Privacy, permissions, and production telemetry

### 7.1 Privacy inventory and public policies

Do not copy declarations from the old worksheet. Generate them from the final
binary, backend fields, and processor contracts for the selected path.

The minimum inventory to verify includes:

| Data family | Halaa examples | Processors/destination to verify |
|---|---|---|
| Identifiers/contact | user ID, name, email, phone, push token | Halaa, Expo push, Taqnyat |
| Sensitive/profile | national ID/commercial documents, owner/vendor profile | Halaa, S3 |
| Contacts | only names/numbers explicitly selected as guests | Halaa |
| Location | approximate event/map location | Halaa, Google Maps |
| User content | events, invitations, support tickets, UGC, photos/videos/files | Halaa, S3, messaging providers |
| Purchases | plan and transaction history (Path B adds store/RevenueCat data) | Halaa, RevenueCat, Apple/Google |
| Diagnostics/activity | crashes, device/app data, breadcrumbs, server logs | Sentry/Halaa |

- [ ] Publish matching Arabic/English Privacy Policy, Terms, Community Rules,
  Support, and Delete Account pages. Privacy and support URLs must be stable,
  public HTTPS pages; the privacy policy must also be reachable inside the app.
- [ ] Document purpose, collection, sharing/service-provider status, retention,
  deletion, security, and contact for each row.
- [ ] Complete Apple App Privacy and Google Data Safety from the same signed
  inventory. Include Sentry and, for Path B, RevenueCat/purchase history.
- [ ] Mark data as not used for tracking only after confirming no SDK/domain
  combines it with third-party data for advertising or broker purposes.

### 7.2 Minimize release permissions

- [ ] Remove `ACCESS_FINE_LOCATION`; keep coarse location only if the map
  feature still needs it and works when denied.
- [ ] Inspect the merged Android manifest. Remove broad
  `READ_MEDIA_IMAGES`/`READ_MEDIA_VIDEO`; Halaa's occasional uploads should use
  the Android system photo picker. Block unused camera, microphone, write
  contacts, background location, and storage permissions.
- [ ] Confirm contacts access is read-only, requested just in time, and the app
  works with manual guest entry when denied.
- [ ] Inspect final iOS purpose strings and entitlements against actual use.

### 7.3 Push and telemetry correctness

- [ ] On logout, unregister the current Expo push token for that account before
  clearing auth; make account switching safe.
- [ ] Queue cold-start notification taps until navigation/language state is
  ready; surface registration failures.
- [ ] Configure APNs and FCM v1 for production and verify delivery on store-like
  builds. Fetch Expo receipts and prune invalid tokens.
- [ ] Configure Sentry release, environment, source-map/dSYM upload, PII
  scrubbing, and a production sampling policy. A forced crash must be
  symbolicated and contain no token/password/national-ID.
- [ ] Make development/preview EAS profiles use staging, never production.

## 8. Release build and artifact gates

### 8.1 Deterministic EAS configuration

- [ ] Pin the iOS production build to an EAS image with **Xcode 26+ / iOS 26
  SDK+**. Since 2026-04-28 Apple rejects older SDK builds. Record the actual
  Xcode/SDK versions from the build log.
- [ ] Target Android API 35 or later. Record `targetSdkVersion` from the AAB.
- [ ] Use unique production version/build numbers and a tagged commit; archive
  EAS logs and checksums of the IPA/AAB.
- [ ] Replace `REPLACE_WITH_*` values in `eas.json` or move them to an EAS
  submit profile that contains no committed secrets.
- [ ] Confirm release API URL, Maps key restrictions, association IDs, Sentry
  environment, and selected billing mode in the generated Expo config.
- [ ] Run Expo Doctor, lint, unit/integration tests, and production dependency
  audits from a clean install.

### 8.2 Android artifact checks

- [ ] Upload the first AAB manually if Play requires it before API/EAS Submit.
- [ ] Use Play App Signing and record upload plus app-signing certificate
  fingerprints. Register `com.halla.app` in the 2026 Android developer
  verification page; prove prior key ownership if Play requests it.
- [ ] Validate all 64-bit native libraries and ZIP alignment for 16 KB page
  sizes; install and exercise the app on a 16 KB Android 15+ environment.
- [ ] Review Play's bundle explorer warnings, device catalog exclusions,
  permissions, native-code, and pre-launch report.
- [ ] Path B: verify the merged manifest reports Play Billing Library **8 or
  later** so the release remains updateable after 2026-08-31.

### 8.3 iOS artifact checks

- [ ] App Store Connect accepts the IPA with no privacy-manifest, required-reason
  API, entitlement, icon, or export-compliance error.
- [ ] Generate/review the privacy report for the app and included SDKs.
- [ ] If `supportsTablet=false`, confirm the build's device family is iPhone
  only. If true, test iPad and supply required iPad screenshots.
- [ ] Test the processed TestFlight build, not only a local/dev build.

## 9. Path B only - correct native subscription implementation

### 9.1 Identity model

- [ ] Add a stable, unique, random `billingUserId` (UUID) to users; do not expose
  Mongo IDs, phone numbers, or emails as RevenueCat App User IDs.
- [ ] Configure RevenueCat only after authentication with that ID. On account
  switch call `Purchases.logIn(newBillingUserId)` even if already configured.
  For a custom-ID-only design, do not call `logOut()` (it creates an anonymous
  ID); disable all purchase operations while signed out and `logIn()` the next
  authenticated user.
- [ ] Backend lookup accepts the current ID and RevenueCat aliases. Define and
  test transfer behavior before production.

### 9.2 Durable webhook ingestion and canonical reconciliation

Do not put the full lifecycle inside the HTTP request. The endpoint should:
authenticate, validate the envelope, durably insert a unique event, enqueue it,
and return 2xx. Processing is idempotent and retryable.

- [ ] Unique-index RevenueCat `event.id`; retries return 2xx without reapplying.
- [ ] Validate `api_version`, `app_id`, `environment`, store, entitlement ID,
  product mapping, and user/aliases. Separate sandbox and production.
- [ ] Unknown user/product or invalid business mapping goes to a dead-letter
  queue and alerts; it is never silently discarded.
- [ ] Add a server-only RevenueCat secret and fetch the current subscriber
  snapshot after lifecycle webhooks. Derive local access from the canonical
  active entitlement/expiry rather than guessing from event type alone.
- [ ] Add provider-neutral payment fields and unique provider transaction IDs.
  Write one ledger row per initial purchase/renewal and an auditable refund
  update. Store amount, actual currency, store, product, transaction/original
  transaction, purchased/expiry timestamps, environment, and event ID.
- [ ] Renewal updates the existing store subscription and invokes the approved
  pool-reset rule. A plan change creates/replaces a subscription only when the
  store change is actually effective.

Required event behavior:

| Event | Required local behavior |
|---|---|
| `INITIAL_PURCHASE`, `RENEWAL` | Sync snapshot; grant/extend to `expiration_at_ms`; ledger paid transaction |
| `CANCELLATION` | Set auto-renew/cancel-at-period-end or record refund; **do not revoke solely because this event arrived** |
| `BILLING_ISSUE` | Flag issue/grace period; **do not revoke** while entitlement remains active |
| `SUBSCRIPTION_PAUSED` | Record scheduled pause; **do not revoke** until `EXPIRATION` |
| `EXPIRATION` | Revoke when canonical entitlement is inactive |
| `UNCANCELLATION` | Clear cancel-at-period-end; do not create a free new period/pool |
| `PRODUCT_CHANGE` | Record scheduled/effective product and sync; use `new_product_id` where present |
| `SUBSCRIPTION_EXTENDED` | Update expiry without minting an unrelated subscription |
| `REFUND_REVERSED` | Reverse refund state and sync entitlement |
| `TRANSFER` | Reconcile every source/destination ID in the payload and prevent dual access |
| `TEMPORARY_ENTITLEMENT_GRANT` | If honored, mark temporary and expire from canonical timestamp |

### 9.3 Client paywall and post-purchase reconciliation

- [ ] Store product IDs map explicitly to backend plan codes; do not rely on
  display names.
- [ ] Render RevenueCat/store `priceString`, period, trial/offer terms, renewal,
  and cancellation disclosure. Never display backend SAR as the charged price.
- [ ] Hide web-only add-ons and discounts unless equivalent store products and
  lifecycle accounting exist. Displayed total must equal the store sheet.
- [ ] Disable purchase if offering/package/identity is unavailable and provide
  a retry state, not a dead-end paywall.
- [ ] After a subscription purchase/restore, require the expected active
  entitlement in `CustomerInfo`, call an authenticated backend reconcile
  endpoint, and wait for the backend subscription before showing success. For
  an event consumable, require the returned transaction plus a durable backend
  event-entitlement grant; do not expect a permanent RevenueCat entitlement.
- [ ] Include Restore Purchases and a store-specific Manage/Cancel Subscription
  action. Handle pending, cancelled-by-user, offline, already-owned, refund,
  and account-transfer cases.

### 9.4 Product-type mapping

The backend catalog contains `billingType: event`, monthly plans, and
quarterly/annual business plans. Do not configure every plan as an
auto-renewable subscription.

| Halaa offering | Native v1 store type | Required behavior |
|---|---|---|
| Personal-host monthly/other genuinely recurring pool | Apple/Google auto-renewing subscription | Ongoing value, clear period, pool reset/no rollover, manage/cancel |
| Personal-host single-event package | Consumable one-time product | Buy only when no unused event entitlement exists; do not expire before use; acknowledge/finish the store transaction after durable backend grant, then mark the Halaa entitlement used on the first successful event send |
| Organization/business managed contract | Not sold in native v1 | Existing organization users may sign in; no purchase CTA; document enterprise-service treatment in review notes |
| Setup fee or web-only add-on/discount | Not sold in native v1 | Hide from native totals and UI unless a separate compliant store product/lifecycle is later designed |

- [ ] Add a provider-neutral entitlement/ledger representation for a store
  event purchase. The current single-active Subscription model must not cancel
  an unused paid event entitlement or silently expire it after 90 days.
- [ ] Keep store transaction completion separate from Halaa entitlement use.
  RevenueCat/store acknowledgement must complete promptly after the durable
  grant (and within Google's acknowledgement window); the backend event
  entitlement remains unused until its first successful send.
- [ ] Prevent a second event purchase until the prior event entitlement is
  consumed, or deliberately redesign for multiple stackable entitlements with
  deterministic event allocation. Do not rely on `changePlan()` for
  consumables.
- [ ] Restore/reinstall relies on the authenticated Halaa backend ledger for
  event consumables; store Restore remains required for restorable subscription
  products.
- [ ] Product descriptions, backend behavior, and store product type must agree.
  If product chooses a different mapping, obtain a new policy and accounting
  review before implementation.

### 9.5 Store/RevenueCat configuration and sandbox matrix

- [ ] Complete Apple Paid Apps agreement/tax/banking and Google payments
  profile before product configuration.
- [ ] Create one Apple subscription group with ordered levels and matching
  Google subscriptions/base plans for recurring personal-host plans. Create
  separate consumable products for approved single-event packages. Product
  copy matches the period, no-rollover rule, event-consumption rule, and
  benefits.
- [ ] Configure RevenueCat apps, entitlement, offering, products, webhook auth,
  production/sandbox filtering, restore/transfer behavior, and server secret.
- [ ] Apple first IAP is submitted with the app version, localization, review
  screenshot, and notes. Google products/base plans are activated on the test
  track.
- [ ] Test initial purchase, renewal, voluntary cancellation (access remains),
  expiration, billing grace/recovery/failure, refund, refund reversal where
  available, upgrade, deferred downgrade, restore, reinstall, duplicate event,
  out-of-order event, transfer, unknown product, webhook outage/retry, and A-to-B
  account switch on both stores. Separately test event purchase, duplicate
  delivery, attempted second purchase, durable grant, first-send consumption,
  reinstall, refund before use, and refund after use.

**Acceptance evidence:** store and RevenueCat histories reconcile exactly with
Halaa Subscription and Payment rows for the full matrix; no user gains or loses
access early; the amount/currency shown, charged, and recorded match.

## 10. Release QA and no-monetization scan

Run against the exact signed production candidates.

- [ ] Fresh install, signup, email/password login, phone OTP login, logout,
  account switch, password reset, deletion, and reinstall.
- [ ] Host creates/edits/sends an event; manual guest entry; contacts denied and
  allowed; coarse location denied and allowed; photo picker; Arabic RTL and
  English; offline/slow network; background/foreground.
- [ ] Vendor and post-event UGC Terms, upload, report, block, moderation, and
  removal flows.
- [ ] Push foreground/background/terminated tap, token removal on logout, and
  delivery to the correct account only.
- [ ] Every public URL and associated-link route on production.
- [ ] Crash-free smoke session and symbolicated forced crash with PII review.
- [ ] Android: API 35/36 phone plus 16 KB environment and Play pre-launch report.
- [ ] iOS: current iPhone plus the minimum supported iOS; iPad too if enabled.
- [ ] Path A source scan and device crawl for: `plan`, `price`, `SAR`, `subscribe`,
  `upgrade`, `checkout`, `purchase`, `restore`, web payment URLs, and quota
  upsells. Review Arabic strings too. No reachable purchase/steering UI may
  remain.
- [ ] Path B executes the section 9 sandbox matrix.

## 11. Store console and listing work

### 11.1 Apple App Store Connect

- [ ] Active organization membership; agreements, tax, banking, roles, bundle
  ID, signing, and app record complete.
- [ ] Saudi Arabia availability only for v1; free app price for Path A.
- [ ] Name, subtitle, description, keywords, category, copyright, support URL,
  privacy URL, version, release option, and review contact are complete in
  Arabic/English as supported. Support URL contains real contact information.
- [ ] Updated 2026 age-rating questionnaire is complete and consistent with
  UGC, messaging, and unrestricted web links. App is not left Unrated.
- [ ] App Privacy, export compliance, content rights, and advertising/tracking
  answers match the final artifact/inventory.
- [ ] Upload 1-10 accurate iPhone screenshots per localization. If the build
  supports iPad, upload the required 13-inch iPad screenshots too.
- [ ] Select the processed TestFlight build, add the reviewer account and exact
  navigation steps, describe Path A or Path B, deletion, UGC reporting, and any
  non-obvious permission use.
- [ ] Path B: attach the first IAPs to this version and make them reviewable.

### 11.2 Google Play Console

- [ ] Developer identity is verified. Organization accounts complete D-U-N-S
  verification if requested. Register the package/signing key in Android
  developer verification.
- [ ] Personal accounts created after 2023-11-13 complete a closed test with at
  least 12 continuously opted-in testers for 14 days and then apply for
  production access. Do not assume this gate applies to older personal or
  organization accounts; verify the console status.
- [ ] Complete App access, Ads, Data Safety/deletion, Target audience and
  content, IARC content rating, privacy policy, UGC, and every permission/form
  Play exposes after AAB upload.
- [ ] Store listing has name, short/full descriptions, support contact, category,
  app icon, 1024x500 feature graphic, and at least two accurate phone
  screenshots. Four 1080p phone screenshots are recommended. Tablet shots are
  not a universal publication requirement, but add/test them if targeting a
  tablet-quality listing.
- [ ] Upload release notes, select Saudi Arabia, review device catalog and
  pre-launch report, then stage rollout with Managed Publishing enabled.
- [ ] Path A listing contains no CTA to external digital purchase. Path B
  declares in-app purchases and provides subscription terms/manage access.

## 12. Final go/no-go evidence packet

Release owner signs only when every required row is present.

| Evidence | Required |
|---|---|
| Security incident closed and history scan clean | Both paths |
| Production backend hardening test report | Both paths |
| Account deletion fixture/S3/session test report + live web request URL | Both paths |
| UGC Terms/report/block/moderation test report | Both paths |
| Signed privacy inventory matching both console forms | Both paths |
| Live AASA/assetlinks/reset/deletion/privacy/support URL report | Both paths |
| Exact IPA/AAB checksums, commit tag, EAS logs, clean test results | Both paths |
| Xcode 26+/iOS 26 SDK proof and TestFlight smoke | iOS |
| Merged manifest, API target, 16 KB, permission and pre-launch reports | Android |
| Path A monetization/steering scan | Path A |
| RevenueCat/store/backend lifecycle reconciliation matrix | Path B |
| Screenshots/listing/reviewer credentials reviewed by a second person | Both paths |
| Apple/Google account, agreement, verification and testing gates green | Both paths |

**Submission order:** internal Android + TestFlight -> complete console forms ->
closed test if required -> release-candidate regression -> submit Apple and
Google -> respond to review questions with the evidence packet -> staged
production rollout -> monitor auth, deletion, moderation, crash, messaging and
billing alerts.

## 13. Primary policy and platform references

- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Apple account deletion guidance](https://developer.apple.com/support/offering-account-deletion-in-your-app)
- [Apple 2026 SDK requirements](https://developer.apple.com/news/upcoming-requirements/)
- [Apple screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/)
- [Google Payments policy FAQ](https://support.google.com/googleplay/android-developer/answer/10281818)
- [Google account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111)
- [Google UGC policy](https://support.google.com/googleplay/android-developer/answer/9876937)
- [Google Play app testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465)
- [Android 16 KB page-size support](https://developer.android.com/guide/practices/page-sizes)
- [Google Play Billing deprecation schedule](https://developer.android.com/google/play/billing/deprecation-faq)
- [RevenueCat webhook events](https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields)
- [RevenueCat customer identity](https://www.revenuecat.com/docs/customers/identifying-customers)
