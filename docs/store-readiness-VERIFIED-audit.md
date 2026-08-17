# Halaa Mobile - verified store-readiness audit

**Audit date:** 2026-06-27  
**Code snapshot:** local `master` at `1054e471`  
**Implementation source of truth:** `docs/store-readiness-SHIP-plan.md`

## 1. Verdict

**RED - the current build is not ready for Apple App Review or Google Play
production.**

The previous documents were useful but not sufficient to implement and submit
safely. They missed a UGC moderation gate and current 2026 build/account
requirements, described Google's public deletion resource too weakly, and had
dangerous RevenueCat cancellation/grace-period semantics. The canonical ship
plan corrects those issues and supplies acceptance evidence for every gate.

There is also an urgent non-store incident: production credentials are present
in tracked files/history and must be rotated and removed before other release
work.

## 2. Audit method and limits

The audit inspected the mobile, backend, and web source at the commit above,
including Expo/EAS configuration, auth, deletion, post-event UGC, payments,
RevenueCat integration, push, and public association routes. Policy statements
were rechecked against current first-party Apple, Google, Android, Expo, and
RevenueCat documentation on the audit date.

Source review cannot prove release-artifact or console state. The following
remain unknown until a signed IPA/AAB is built and the developer accounts are
opened:

- merged Android permissions, Billing Library metadata, 16 KB alignment, and
  Play pre-launch findings;
- Xcode/iOS SDK versions, privacy manifests, entitlements, and App Store upload
  findings;
- live signing fingerprints, agreements, tax/banking, developer verification,
  testing eligibility, products, and console declarations;
- final production behavior of URLs and deployed environment variables.

Claims about these items are gates to verify, not claims that they are done.

## 3. Verified foundations already present

These items are real foundations and should be retained while the blockers are
fixed:

| Foundation | Evidence |
|---|---|
| Bundle/package ID is `com.halla.app` | `halla-mobile/app.json` |
| App icons/splash/notification assets and Expo plugins are configured | `halla-mobile/app.json`; prior Expo Doctor result |
| Native checkout separates RevenueCat from web Moyasar at the final action | `PlansSummaryScreen.js` |
| RevenueCat wrapper, offerings, purchase/restore calls, and authenticated webhook skeleton exist | `halla-mobile/services/purchases.js`; `revenuecat.controller.js` |
| Account deletion UI and authenticated route exist | `DeleteAccountSection.js`; `users.routes.js` |
| Sentry initialization and Expo push plumbing exist | `App.js`; notification service/hooks |
| Root `.well-known` route handlers exist and return JSON | `labbe/app/.well-known/*/route.js` |
| Backend has Helmet, sanitization, CORS allow-listing, body limits, and `trust proxy` | `labbe-backend-/src/app.js` |
| Auth supports email/password, allowing a reviewer account without an OTP bypass | `halla-mobile/screens/auth/LoginScreen.js` |
| Post-event access is scoped to events/guests and supports an approval flag | post-event routes/service/model; approval operations are still missing |

These are not enough to submit because several implementations are partial or
incorrect, as detailed below.

No Google/Facebook/social sign-in was found in the inspected mobile auth flow,
so Sign in with Apple is not currently triggered by a third-party-login option.
That conclusion must be revisited if a social login is added before submission.

## 4. Confirmed release blockers

### 4.1 Compromised secrets and deploy posture

`labbe-backend-/config.env`, Mongo certificate material, and
`halla-mobile/.env` are tracked despite ignore rules. The backend config exposes
production-class AWS, Gmail, Taqnyat, Mongo and JWT material. Development mode,
disabled rate limiting, and an empty WhatsApp app secret also disable important
production protections.

**Impact:** credential compromise and forged/abusive production traffic. This
is a release blocker independent of store review.

### 4.2 Password reset is broken and deep-link associations are incomplete

`auth.service.js` emits a locale-prefixed `/reset-password?token=` URL, while
the working web route is `change-password` and the native route expects another
shape. Android intent filters do not cover the emitted locale-prefixed path.
The AASA/assetlinks handlers fall back to placeholder IDs unless production env
values are supplied.

Live check on 2026-06-27: `/ar/reset-password?...` returned 404,
`/ar/change-password?...` returned 200, and both root `.well-known` association
URLs returned 404. This confirms the reset failure and that the association
handlers/configuration are not live yet.

**Impact:** reset emails fail on the web and do not reliably open the app;
universal/app-link verification cannot pass with placeholders.

### 4.3 Neither monetization path is ready

The current native app exposes a paid plans flow. Therefore it is not a valid
Path A consumption-only binary. The current RevenueCat code is not a safe Path
B implementation either.

Path A is policy-feasible only after all purchase UI, prices, restore actions,
upgrade/quota CTAs, and purchase steering are removed from the signed native
artifact. Apple Guideline 3.1.3(f) permits a free stand-alone companion to a
paid web tool when the app has no in-app or external-purchase CTA. Google
explicitly permits consumption-only apps.

### 4.4 RevenueCat identity and lifecycle are incorrect (Path B)

`services/purchases.js` configures once behind a permanent `configured` latch.
It never switches RevenueCat identity when a different Halaa user signs in.
The webhook uses the Mongo user ID directly and does not robustly process
aliases/transfers.

`revenuecat.controller.js` is grant-only. It routes purchase, renewal, product
change, and uncancellation through `changePlan()`, which creates a new
subscription. It has no durable event-id idempotency, transaction ledger,
canonical reconciliation, environment/app/entitlement validation, or dead
letter path. It ignores expiration/refund/transfer state and uses server time
instead of store expiry. Native UI displays backend SAR/add-on totals while the
store purchase buys only a plan, then reports success without backend
reconciliation.

The plan catalog also mixes `billingType: event` packages with monthly and
quarterly/annual offerings. A single-event package is not the same store product
as an auto-renewable subscription. The prior plan did not define consumable
grant/consume/refund behavior and the current single-active model can cancel or
expire an unused paid event package.

**Impact:** wrong-account purchases, duplicate periods/pools, permanent or
premature access, lost paid entitlements, wrong currency/amount records, and a
paywall whose display can differ from the store charge.

### 4.5 Account deletion is materially incomplete

`users.service.js` leaves nested profile PII, guest names/phones, tickets,
PostEventContent, comments/media, and event S3 assets. Several cleanup failures
are swallowed before returning success. Refresh tokens are revoked, but issued
access JWTs remain usable. There is no completed reauthentication, durable
deletion job/status, processor cleanup record, or safe retention matrix.

The public `/delete-account` resource is absent. A page that only tells users
to use the app would still be insufficient: Google's policy requires a web
resource through which the user can actually request deletion without
reinstalling the app. Live check on 2026-06-27: `/delete-account` redirected to
`/ar/delete-account`, which returned 404.

Path B also needs the Apple-required warning that store billing continues and
a direct subscription-management route before deletion.

### 4.6 UGC moderation was missing from the prior audit and plan

Halaa stores and displays host/vendor/guest content to other users:
post-event photos, videos and comments; comment images; vendor profiles and
portfolio content; and related public/service content. The post-event model has
`isHidden`/`requireApproval`, but the inspected host routes have no complete
approval/rejection workflow, and the product lacks comprehensive report/block
and operational moderation flows.

Apple Guideline 1.2 requires filtering, reporting, blocking, and published
contact information. Google requires Terms acceptance before UGC creation plus
ongoing moderation and in-app report/block capabilities.

**Impact:** high-probability policy rejection/removal and an unstaffed abuse
surface. This is a store blocker for both Path A and Path B.

### 4.7 Privacy declarations and permission proof are incomplete

`app.json` still declares fine location even though coarse location is enough.
Source configuration does not prove what Expo/native libraries add to the
merged Android manifest. Occasional media uploads must not leave broad
`READ_MEDIA_IMAGES`/`READ_MEDIA_VIDEO` permissions in the release artifact;
Google expects the system photo picker for this use.

The previous privacy worksheet omits or under-specifies several likely
categories: national/commercial documents, event and support content, UGC,
vendor content, service-provider destinations, detailed diagnostics, and Path
B purchase data. Final declarations must be generated from the selected path
and signed artifacts.

### 4.8 Push account switching can disclose data

Push tokens are added to users but not removed from the prior account on
logout. A shared device can therefore receive notifications for the wrong
account. Receipt processing and cold-start routing are also incomplete.

**Impact:** cross-account privacy disclosure. Token removal/account-switch
correctness is a pre-release gate; receipt cleanup is release-quality work.

### 4.9 Signed build requirements are not yet proven

The repository has no reviewed production IPA/AAB. Notably:

- Since 2026-04-28, Apple requires uploads built with Xcode 26+ and the iOS 26
  SDK+. `eas.json` does not pin/record the production image.
- Google requires API 35+ and, since 2025-11-01, 16 KB support for new/updated
  64-bit apps targeting Android 15+. The app includes native SDKs, so the AAB
  and a 16 KB runtime must be tested.
- Path B must use a supported Play Billing Library. Version 7 stops accepting
  new apps/updates on 2026-08-31; the release should verify version 8+ in the
  merged artifact.
- Apple's privacy manifest and required-reason API validation can only be
  confirmed from the processed build.

### 4.10 iPad and screenshot guidance was inconsistent

`app.json` currently sets `supportsTablet: true`. Apple therefore requires iPad
screenshots and the app must work properly on iPad. The old statement that
tablet screenshots are not required was true only as a general Google minimum,
not for this iOS configuration.

For a phone-only v1, set `supportsTablet=false` and verify the IPA device
family. If iPad remains supported, add iPad regression coverage and required
13-inch screenshots.

### 4.11 Developer-account and console gates remain external unknowns

The source cannot verify Apple agreements/roles/tax/banking, Play identity,
D-U-N-S, package registration, products, store listing, privacy forms, app
access, content/age ratings, permission declarations, or testing eligibility.

The Google 12-testers/14-days rule applies specifically to personal accounts
created after 2023-11-13. It is not a universal personal-account rule. Since
March 2026, Play also exposes Android developer/package verification; the
package/signing status must be checked. These gates must start early but should
not be represented as completed code work.

## 5. Corrections to the previous documents

The following corrections are mandatory for implementation:

1. **Do not revoke on every RevenueCat cancellation.** Voluntary cancellation
   normally leaves access active through `expiration_at_ms`. A billing issue
   also does not mean expiration, and `SUBSCRIPTION_PAUSED` schedules a future
   pause. Revoke on inactive canonical entitlement/`EXPIRATION`, not on those
   events alone.
2. **Do not create a new subscription on `UNCANCELLATION`.** Clear the
   cancel-at-period-end state without granting another pool/period.
3. **Custom-only RevenueCat identity should switch with `logIn(newId)`.** Calling
   `logOut()` creates an anonymous RevenueCat ID. Configure after auth, disable
   purchasing while signed out, and call `logIn()` on every account switch.
4. **The deletion web page must accept a request.** Instructions that send the
   user back to the app do not meet Google's requirement.
5. **Reauthentication is permitted, not an explicit Apple store mandate.** It
   remains a Halaa security requirement and must be simple (password or verified
   OTP).
6. **Fine location is not a guaranteed automatic rejection.** It is unnecessary
   privilege and creates disclosure/review risk, so remove it and verify the
   merged manifest.
7. **Screenshot rules differ by store/device.** Apple needs 1-10 iPhone
   screenshots and iPad screenshots if the app runs on iPad. Google needs at
   least two screenshots across device types; four high-resolution phone shots
   are recommended.
8. **The Google closed-test rule is conditional.** It applies to newly created
   personal accounts after the stated date; check the actual account.
9. **A fixed OTP bypass is unnecessary and risky.** The app already supports
   email/password; use a dedicated reviewer account without privileged roles or
   real customer data.
10. **Path A needs an affirmative policy classification.** It is not merely
    "hide the paywall." Review notes and the final binary must support Apple's
    free stand-alone companion rule and Google's consumption-only model.
11. **Store product types must follow the Halaa catalog.** Recurring personal
    plans, one-event packages, organization contracts, setup fees, and add-ons
    need different treatment. The canonical plan excludes business/setup/add-on
    sales from native v1 and defines event packages as guarded consumables,
    rather than forcing every plan through one subscription lifecycle.

## 6. What “ready to submit” means

The app becomes ready to submit only when the final evidence table in
`store-readiness-SHIP-plan.md` is complete. In particular:

- the security incident is closed;
- one monetization path, and only that path, is present in the signed build;
- deletion works end-to-end in app and on the web;
- UGC Terms/filter/report/block/moderation works on every applicable surface;
- privacy forms match the final binary and backend behavior;
- signed IPA/AAB artifact checks and production smoke tests pass;
- all developer-account, listing, reviewer-access, testing, and console gates
  are green.

Passing source tests alone is not enough, and neither store offers a guarantee
of approval. The plan is designed to make the submission complete,
policy-grounded, testable, and defensible in review.

## 7. Primary sources checked

- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Apple account deletion guidance](https://developer.apple.com/support/offering-account-deletion-in-your-app)
- [Apple 2026 SDK requirements](https://developer.apple.com/news/upcoming-requirements/)
- [Apple screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/)
- [Apple privacy manifests](https://developer.apple.com/documentation/bundleresources/privacy_manifest_files)
- [Google Payments policy FAQ](https://support.google.com/googleplay/android-developer/answer/10281818)
- [Google account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111)
- [Google UGC policy](https://support.google.com/googleplay/android-developer/answer/9876937)
- [Google app testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465)
- [Google Data Safety](https://support.google.com/googleplay/android-developer/answer/10787469)
- [Google Play review preparation](https://support.google.com/googleplay/android-developer/answer/9859455)
- [Android 16 KB page-size support](https://developer.android.com/guide/practices/page-sizes)
- [Play Billing Library deadlines](https://developer.android.com/google/play/billing/deprecation-faq)
- [Android developer verification guide](https://developer.android.com/developer-verification/guides/pdf-guides/pdc-guide.pdf)
- [Expo EAS build infrastructure](https://docs.expo.dev/build-reference/infrastructure/)
- [RevenueCat event semantics](https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields)
- [RevenueCat webhook idempotency/reconciliation](https://www.revenuecat.com/docs/integrations/webhooks)
- [RevenueCat identity guidance](https://www.revenuecat.com/docs/customers/identifying-customers)
