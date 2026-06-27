# Halaa Mobile — App Store & Google Play Readiness Plan (v2)

**Date:** 2026-06-27 · **Revision:** v2 (verified against live code + current 2026 store regulations)
**App:** Halaa (`halla-mobile`) — Expo SDK 54 · React Native 0.81 · React 19
**Bundle / Package ID:** `com.halla.app` (iOS & Android) · **Target market:** Saudi Arabia (Arabic-first, RTL)
**Backend:** `labbe-backend-` (Node/Express + MongoDB) at `https://halaa.com.sa/api/v2`

> **What changed in v2.** Every claim below was re-verified against the actual code, and all store-policy claims were grounded in the **current (2026) Apple App Store Review Guidelines and Google Play policies** (sources cited inline). The most important revision is the **payments strategy (§1)**: for the Saudi storefront, **both** stores now require **native in-app billing** — the US "external link" relief from *Epic v. Apple/Google* does **not** apply to KSA, and Google's alternative-billing programs don't reach KSA until ~2027. Other v2 additions: missing Expo config plugins (iOS crash risk), privacy manifests, Xcode 26 build requirement, reviewer demo-account/OTP problem, Google's closed-testing timeline gate, the full account-deletion data-model cascade, and several new backend items. A few v1 claims were softened (see §11).

---

## 0. Executive summary & verdict

The app is **functionally rich and well-engineered** — clean role-gated navigation, secure token storage (refresh-token rotation with replay detection), genuinely server-side-priced Moyasar payments, full AR/EN + RTL, and substantive in-app legal docs. It is **not yet submittable**: there are hard blockers that guarantee rejection, and the **payment model must be re-architected for native billing** before either store will accept it in Saudi Arabia.

**Readiness scorecard**

| Area | State | Notes |
|---|---|---|
| Payments / billing model | 🔴 Re-architecture | KSA requires StoreKit IAP + Google Play Billing for digital goods (§1) |
| App icon / splash / adaptive icon | 🔴 Blocker | 50×50 placeholder; invalid for both stores |
| Expo config plugins (image-picker, notifications, doc-picker) | 🔴 Blocker | Not registered → missing iOS usage strings → photo access can crash on iOS |
| In-app account deletion | 🔴 Blocker | Missing in app **and** backend; the only existing (admin) delete path is runtime-broken |
| Universal/app links | 🔴 Blocker | Password-reset & invitation https links won't open the app |
| Push notifications | 🔴 Broken end-to-end | App posts a token to a backend route that doesn't exist; no delivery infra |
| Backend production posture | 🔴 Blocker | Committed secrets (test/staging), rate-limiting off, NODE_ENV=development, webhook auth disabled |
| iOS permission strings / encryption decl. | 🟠 High | No `infoPlist`; `ITSAppUsesNonExemptEncryption` missing |
| iOS build toolchain (Xcode 26 / iOS 26 SDK) | 🟠 High | Mandatory since Apr 28 2026 — verify EAS image (§2.10) |
| Crash reporting | 🟠 High | None wired; production crashes invisible |
| Maps on Android | 🟠 High | `react-native-maps` has no Google Maps API key → blank map |
| Privacy policy / terms | 🟢 Present (in-app) | Need a public hosted URL + a public account-deletion URL (Google) |
| Android target API level | 🟢 Compliant | SDK 54/RN 0.81 targets **API 36** — already meets the Aug-2026 bump |
| Privacy manifests (Apple 2024 rule) | 🟢 Handled by Expo | No named third-party SDKs; verify only |
| ATT / Sign in with Apple | 🟢 N/A | No tracking SDKs; first-party auth only |
| i18n / RTL | 🟢 Strong | Verify first-run shows Arabic; verify SDK 54 edge-to-edge insets |
| Accessibility | 🟡 Sparse (~10 labels) | Recommended pass; not a hard blocker |

**Bottom line.** Realistically **~4–7 weeks** to a submittable build with one mobile dev + one backend dev + a few hours of design — the spread depends on the **payment path** (§1) and the **Google closed-testing / account-verification gates** (§6), which add calendar time independent of code.

---

## 0a. Implementation status (this branch: `claude/mobile-app-store-readiness-3b9b0i`)

Phase 1 blockers implemented and committed on this branch (decisions taken: **native IAP via RevenueCat** for payments, **build push**, start Phase 1):

| Item | Status | Notes |
|---|---|---|
| App icon / splash / adaptive / notification icon (1.1) | ✅ Done | Generated from the 1024² brand logo; `app.json` repointed |
| Expo plugins + iOS usage strings + encryption decl (1.2/2.1) | ✅ Done | `expo-image-picker`/`-notifications`/`-document-picker` registered; `ITSAppUsesNonExemptEncryption:false` |
| Universal links — app.json config (1.4) | ✅ Done | `associatedDomains` + autoVerify `intentFilters` |
| Universal links — `.well-known` files (1.4) | ✅ Scaffolded | Web route handlers serve AASA + assetlinks; **need real Team ID + Play SHA-256** via env |
| Android permissions dedupe (2.2) | ✅ Done | Deduped; `versionCode`/`buildNumber` added |
| In-app account deletion — mobile UI (1.3) | ✅ Done | `DeleteAccountSection` on host/vendor/admin settings; bilingual |
| Account deletion — backend `DELETE /users/profile` (1.3) | ✅ Done | Anonymize + cascade + token revoke + S3 cleanup |
| `USER_STATUS.DELETED` fix (1.3) | ✅ Done | Unblocks the 4 runtime-broken admin delete paths |
| Force-password-change gate (2.6) | ✅ Done | Gated in `AppNavigator` before the role switch |
| Backend: trust proxy, webhook HMAC, secrets hygiene (1.6) | ✅ Done (code) | `.gitignore`+`config.env.example`+`SECURITY_NOTES.md`; **manual: untrack/rotate/purge + set prod env** |

Phase 2/3 + follow-on work implemented since (also committed on this branch):

| Item | Status | Notes |
|---|---|---|
| Push notifications (1.5) | ✅ Done | Backend token storage + Expo Server SDK delivery + invalid-token prune; client handler/channel/tap-routing |
| Crash reporting (2.3) | ✅ Done | `@sentry/react-native` + Expo plugin; init + ErrorBoundary reporting (DSN via env) |
| Native IAP — RevenueCat (§1) | 🟡 Code complete | Client service/hook/init + **plans-summary screen wired** (IAP on native / Moyasar on web, gated) + backend webhook (grants via `changePlan`); needs RC/store product config + device/sandbox test — see `IAP_SETUP.md`. Add-ons/discounts remain web-only |
| Maps API key (2.4) | ✅ Done (env) | `app.config.js` injects `GOOGLE_MAPS_API_KEY`; set the key to fix the Android map |
| `MediaTypeOptions` migration (2.5) | ✅ Done | 5 call sites → string-array form |
| `xlsx` CVE (2.7) | ✅ Done | Aliased to patched `@e965/xlsx@0.20.3` across mobile/web/backend |
| EAS submit config (2.8) | ✅ Scaffolded | `eas.json` submit + env; fill Apple/Play credentials |
| Reviewer demo login (§6) | ✅ Done | Env-gated reviewer test number + fixed OTP; crypto-secure OTP generation |
| Backend OTP/auth hardening (2.11) | ✅ Done (partial) | `crypto.randomInt` OTP; trust proxy + webhook HMAC shipped earlier |

**Still external (no code — needs accounts/content):** store listings + screenshots + privacy/data-safety forms (§6/§8, consolidated in `docs/store-launch-checklist.md`), the fill-in values for the scaffolded items (Team ID, Play SHA-256, RC keys, Maps key), the manual security steps in `labbe-backend-/SECURITY_NOTES.md`, and the Google account-type / closed-testing decision.

---

## 1. ⚠️ Payments — must re-architect to native billing (the dominant work item)

**The finding (verified against live code + 2026 policy).** The app sells **digital goods consumed in-app** — subscription plans (`per-event`, `quarterly`, `annual`) and add-ons (extra invites, design templates) — charging cards directly via **Moyasar** 3-D Secure. Evidence: `hooks/checkout/mutations.js`, `screens/host/PlansScreen.js`/`PlansSummaryScreen.js`, `components/plans/PaymentMethodSelector.js`, `utils/paymentBrowser.js`; backend `src/modules/payments/checkout.service.js`. No StoreKit / Play Billing exists.

**Why both stores reject this for Saudi Arabia:**
- **Apple 3.1.1** requires IAP to unlock digital content/subscriptions. The **External Purchase Link** relief from *Epic v. Apple* (US court order, 2025) is **United States storefront only**; **3.1.1(a)** explicitly says non-US storefronts "may not include buttons, external links, or other calls to action that direct customers to purchasing mechanisms other than in-app purchase." KSA has **no** external-purchase entitlement. *Sources: [App Store Review Guidelines §3.1.1/3.1.1(a)](https://developer.apple.com/app-store/review/guidelines/); [StoreKit External Purchase](https://developer.apple.com/documentation/storekit/external-purchase).*
- **Apple 3.1.3(e) "real-world service" does not apply** — digital invitations/templates/credits are consumed in/through the app, the textbook 3.1.1 case (only genuinely physical goods/services, e.g. *printed/mailed* cards, could use non-IAP).
- **Google Play Billing** is mandatory for digital subscriptions/goods. Saudi Arabia is **not** in any user-choice/alternative-billing program (those cover the US, EEA/UK, and a ~35-country list; "rest of world" incl. KSA not until **~Sept 30, 2027**). The "Google dropped Play Billing" headline is **US-only** (*Epic v. Google* injunction). Selling subscriptions via Moyasar in-app violates the Payments policy. *Sources: [Play Payments policy](https://support.google.com/googleplay/android-developer/answer/9858738); [user-choice billing](https://support.google.com/googleplay/android-developer/answer/13821247); [US-only update](https://support.google.com/googleplay/android-developer/answer/15582165).*

**Options (decide before building):**

| Option | What | Approval | Revenue | Effort |
|---|---|---|---|---|
| **B. Native IAP (recommended)** | Implement **StoreKit 2** (iOS) + **Google Play Billing** (Android) for plans/add-ons, with **server-side receipt validation** wired into the existing subscription/plan model. Keep Moyasar for the **web** channel only. Use **RevenueCat** to abstract both stores + entitlement sync. | ✅ Compliant | Store cut **15–30%** (15% small-business / post-yr-1 subs) | **L (3–5 wks)** |
| **N. No in-app purchasing** | Ship store builds with **zero** purchase UI and **no** links/steering to web payment (KSA anti-steering forbids even a "buy on our site" button). Existing subscribers (who paid on web) just use the app. | ✅ Compliant | 0% store cut, but heavy conversion friction; awkward UX | **M** |

**Recommendation: Option B via RevenueCat.** It's the only path that keeps in-app monetization in KSA on both stores. The web app already has a full Moyasar checkout (`labbe/app/[lang]/host/plans`, `/host/payments`, `/business/checkout`), so **web keeps Moyasar**; mobile store builds use IAP. Backend work: add receipt/purchase-token validation endpoints, map store products → existing plans/add-ons, grant entitlements on validated purchase, and handle store webhooks (renewals, refunds, cancellations) alongside the existing Moyasar webhook. Pricing in App Store Connect / Play Console must use store price tiers in SAR.

> **Action needed from you:** confirm **Option B** (build IAP) vs **Option N** (remove purchasing). Everything else in this plan is required regardless.

---

## 2. Phase 1 — P0 Blockers (guaranteed rejection until fixed)

### 1.1 — App icon, splash & adaptive icon are an invalid 50×50 placeholder 🔴
- **Verified:** `app.json:8,11,23` point `icon`, `splash.image`, `android.adaptiveIcon.foregroundImage` all at `./assets/logo.png` = **50×50 RGBA, 669 bytes**. No `icon.png`/`adaptive-icon.png`/`splash.png` exist.
- **Why:** Apple requires **1024×1024, no alpha**; Google Play requires **512×512**; adaptive foreground should be 1024×1024 within a 432×432 safe zone.
- **How:** regenerate from the existing brand source already in the repo — **`labbe/public/logo.png` (1024×1024)** and vector **`labbe/public/svg/logo.svg`**. Produce `assets/icon.png` (1024², flattened, **no alpha**), `assets/adaptive-icon.png`, `assets/splash.png`, `assets/notification-icon.png` (white-on-transparent, Android). Update `app.json` accordingly.
- **Owner:** Design + mobile · **Effort:** S

### 1.2 — Missing Expo config plugins → missing iOS permission strings → crash risk 🔴
- **Verified:** `app.json:37-53` plugins = `[expo-localization, expo-font, expo-location, expo-contacts, expo-splash-screen]` only. **`expo-image-picker`, `expo-notifications`, and `expo-document-picker` are absent**, yet the app calls `launchImageLibraryAsync` in 8+ places (`components/commen/ImageInput.js:11`, `MultiImageInput.js:24`, `host/post-event/MediaUploader.js:46`, `createEvent/StepThree.js:137`, `settings/BusinessSettings.js:42`, vendor `PersonalInfoForm.js:87`, `ServiceDetailsForm.js:154`, `ImagesAndPricingForm.js:87`), uses notifications (`App.js`), and document-picker (`components/guests/VCardImportModal.js:73`, `utils/xlsxUtils.js:45`).
- **Why:** without the plugin (or a manual `infoPlist` string), iOS has **no `NSPhotoLibraryUsageDescription`** → the first photo-library access **crashes / is auto-rejected** (Apple 5.1.1). `expo-notifications` absent → no APNs entitlement + no Android notification icon/color.
- **How:** add the three plugins with config. For `expo-image-picker`, set `photosPermission` (AR+EN). For `expo-notifications`, set `icon` + `color`. (This also covers most of 2.1.)
- **Owner:** Mobile · **Effort:** S

### 1.3 — In-app account deletion missing; the only existing delete path is broken 🔴
- **Verified (app):** `deleteAccount` exists (`hooks/users/_api.js:57`, issues `DELETE` against `ENDPOINTS.USERS.PROFILE`) but is **not exported** (`hooks/users/index.js`), has no `useDeleteAccount`, and no UI (`components/settings/SettingsTabs.js`, `AccountSettings.js`).
- **Verified (backend):** **no `DELETE /users/me|profile`** route. The only deletion is **admin-only and runtime-broken**: `admin.hosts.service.js:367,393`, `admin.vendors.service.js:239,258`, `admin.moderators.service.js:189,208` set `status = USER_STATUS.DELETED`, but **`USER_STATUS` has no `DELETED` key** (`src/shared/constants/status.js:10-16`) → `undefined` → `host.save()` **throws a ValidationError** against the status enum. Soft-delete plumbing exists but is unreachable and doesn't anonymize: `UserModel.js:355` (`deletedAt`), `:669` `softDelete()` (sets status `INACTIVE`).
- **Why:** Apple **5.1.1(v)** requires **in-app, self-service** deletion of the account + personal data (web-only is insufficient). Google requires deletion **in-app AND a public web URL** declared in the Data safety form. *Sources: [Apple account-deletion guidance](https://developer.apple.com/support/offering-account-deletion-in-your-app/); [Google account-deletion policy](https://support.google.com/googleplay/android-developer/answer/13327111).*
- **How:**
  1. **Backend:** add `USER_STATUS.DELETED` first (fixes the 4 admin call sites). Implement `DELETE /api/v2/users/me` → re-auth (password/OTP) → `authService.revokeAllForUser` → soft-delete + **anonymize** PII → cascade owned data + delete S3 assets → retain financial/audit records. Use the **data-model map in §4**.
  2. **App:** export `useDeleteAccount`, add a destructive "Delete account / حذف الحساب" row to `SettingsTabs.js` → confirmation (re-enter password / type-to-confirm) → on success wipe session + route to Welcome.
  3. **Web + listing:** publish a public account-deletion page (e.g. `https://halaa.com.sa/delete-account`, no login, names "Halaa") and enter the URL in Google Data safety.
- **Owner:** Backend + mobile · **Effort:** M

### 1.4 — Universal / App Links not configured natively 🔴
- **Verified:** `App.js:138` `prefixes: ["halla://", "https://halaa.com.sa"]` for `reset-password/:token`, `invitation/:code`, `host/payments/return`, but `app.json` has **no `ios.associatedDomains`** and **no Android `intentFilters` with autoVerify**. (The 3DS payment return uses the `halla://` custom scheme and is unaffected.)
- **Why:** without native association, password-reset email links and SMS/WhatsApp invitation https links open the browser, not the app — a broken core feature (Apple 2.1 risk). *Source: [Apple associated domains](https://developer.apple.com/documentation/xcode/supporting-associated-domains).*
- **How:** `ios.associatedDomains: ["applinks:halaa.com.sa"]`; Android `intentFilters` for `https` host `halaa.com.sa` (`/reset-password/*`, `/invitation/*`) with `autoVerify: true`. Host **`/.well-known/apple-app-site-association`** (no extension, `application/json`, ≤128 KB, no redirects, app ID `TEAMID.com.halla.app`) and **`/.well-known/assetlinks.json`** (Play App Signing SHA-256 fingerprint) on `halaa.com.sa`.
- **Owner:** Mobile + devops · **Effort:** M

### 1.5 — Push notifications non-functional end-to-end 🔴
- **Verified:** `App.js:67` PATCHes `ENDPOINTS.AUTH.UPDATE_PUSH_TOKEN` (= `/auth/update-push-token`, `shared/src/api/paths.js:61`) with `.catch(() => {})` swallowing failures. **The backend has no such route, no push-token field on `UserModel`, and no push SDK** (grep across `src/`+`models/` for push/expo/firebase/fcm → zero). `notifications.service.js` only writes in-app DB rows + optional email; `NotificationModel.channels.push` is a dead boolean. Also: `App.js:36` uses deprecated `shouldShowAlert`; **no** tap listeners (`addNotificationResponseReceivedListener`/`getLastNotificationResponseAsync`); Android channel created only inside the auth-gated path.
- **How:**
  1. **Backend:** add `pushTokens: [String]` to `UserModel`; implement `PATCH /auth/update-push-token`; add **Expo Server SDK** delivery in `notifications.service.js` for events that already create in-app notifications; prune `DeviceNotRegistered` tokens.
  2. **App:** fix handler → `{ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }`; add tap + cold-start routing; create the Android channel at startup. (Plugin/icon handled in 1.2.)
  3. **Or descope:** if push can't make v1, **remove the permission prompt + registration** so the app doesn't request a permission it never uses (notifications then arrive via in-app polling / SMS / email). Decide explicitly.
- **Owner:** Backend + mobile · **Effort:** M–L

### 1.6 — Backend production hardening 🔴
All in `labbe-backend-`; the production API the mobile clients depend on:
- **Committed secrets** — `config.env` + `certs/mongodb-x509.pem` are git-tracked (`.gitignore` *intentionally* keeps them). Real `JWT_SECRET`, `MOYASAR_API_KEY`, `MOYASAR_WEBHOOK_SECRET`, `AWS_*`, Mongo URI, `TAQNYAT_API_KEY`, `EMAIL_PASSWORD`. *(Nuance: keys are `sk_test_`/`pk_test_` and the Mongo URI is `halaa-staging` — staging/test, not prod-live — but they must still be **rotated and purged from git history** and moved to a secret manager before launch.)*
- **Rate limiting disabled** — `RATE_LIMIT_ENABLED=false` makes every limiter a no-op (`rateLimiter.js:42`). Enable it **and** add a baseline **global** limiter (limiters are opt-in per route today, so `/events`, `/payments/checkout`, `/messaging`, uploads are unthrottled).
- **`NODE_ENV=development`** committed → dev error handler returns **full stack traces + raw error** to clients (`globalErrorHandler.js:176-180,97-98`), serves Swagger publicly, and disables `Secure` on both auth cookies (`auth.controller.js:44,56`). Deploy `NODE_ENV=production`.
- **No `trust proxy`** — behind nginx, all IP-keyed limiters/lockouts bucket to one key. `app.set('trust proxy', 1)`.
- **WhatsApp/Taqnyat webhook auth disabled** — `verifyWebhookSignature()` returns `{ok:true}` unconditionally (`messaging.webhook.controller.js:28`); forged RSVP/guest events corrupt host-facing state. Re-enable HMAC over `req.rawBody` (raw-body capture already wired, `app.js:141-151`).
- **Owner:** Backend + devops · **Effort:** M

---

## 3. Phase 2 — P1 High (likely rejection or serious production risk)

### 2.1 — iOS permission strings & encryption declaration 🟠
- Add `ios.infoPlist` with **specific, feature-focused AR+EN** strings (Apple rejects generic strings under 5.1.1): `NSPhotoLibraryUsageDescription` (also covered via the image-picker plugin in 1.2), `NSLocationWhenInUseUsageDescription` (the current `expo-location` plugin string is worded for "Always"; the app is foreground-only — `MapPicker.js:101,106`), and `ITSAppUsesNonExemptEncryption: false`. `NSContactsUsageDescription` already comes from the `expo-contacts` plugin. **No camera string** — `launchCameraAsync` is never used. · **Effort:** S

### 2.2 — Android permissions: dedupe, justify, audit merged manifest 🟠
- `app.json:26-31` lists location permissions **twice** (bare + fully-qualified). `ACCESS_FINE_LOCATION` isn't justified (only coarse map-centering) — Play requires prominent disclosure for FINE. **Drop FINE**, dedupe to coarse. Add `POST_NOTIFICATIONS` via the notifications plugin. **Audit the merged AAB manifest** and remove anything libraries inject that isn't used — Google flags **`SEND_SMS`/`READ_SMS`**, **`ACCESS_BACKGROUND_LOCATION`**, **`FOREGROUND_SERVICE*`**, **`READ_MEDIA_IMAGES/VIDEO`** (use the **system photo picker**, which `expo-image-picker` already does — don't declare media perms). *Sources: [Play photo/video policy](https://support.google.com/googleplay/android-developer/answer/14115180); [location permissions](https://support.google.com/googleplay/android-developer/answer/9799150).* · **Effort:** S–M

### 2.3 — Crash reporting 🟠
- No Sentry/Bugsnag/Crashlytics (`package.json`); `ErrorBoundary.js:35` only `console.error`s. Add **`@sentry/react-native`** (Expo plugin), wire `ErrorBoundary` + global handler, set release/dist to EAS build numbers. *(Softened from v1: there is **no** existing PII-in-logs leak on mobile — logging is clean — so this is hygiene, not remediation. Note the **backend** does log phone numbers, see §5.)* · **Effort:** S–M

### 2.4 — `react-native-maps` has no Google Maps API key → blank map on Android 🟠
- `components/commen/MapPicker.js:16,273` uses `PROVIDER_DEFAULT`; no `googleMapsApiKey` anywhere. iOS falls back to Apple Maps (fine); **Android renders a blank/gray map** — and event-location selection is a core flow. Add an Android Google Maps API key via `app.json` (`android.config.googleMaps.apiKey`) or the maps config plugin. · **Effort:** S

### 2.5 — Deprecated `ImagePicker.MediaTypeOptions` (removed in v17/SDK 54) 🟠
- 5 call sites still pass `ImagePicker.MediaTypeOptions.Images/.Videos` (`MediaUploader.js:105,115`, `ImagesAndPricingForm.js:88`, `ServiceDetailsForm.js:155`, `PersonalInfoForm.js:88`); in v17 this enum is `undefined`. Migrate to the string-array shape (`mediaTypes: ["images"]`) already used correctly in `ImageInput.js:12`. · **Effort:** S

### 2.6 — Orphaned forced-password-change flow can lock out business accounts 🟠
- `ForcePasswordChangeScreen.js` is fully built but imported nowhere; `AppNavigator.js:388-428` never checks `mustChangePassword()` (`authStore.js:417`). Admin-created business accounts with the flag get 403 on every gated endpoint with no route to fix it. Gate the root navigator on `mustChangePassword()` before the role switch. · **Effort:** S

### 2.7 — `xlsx@0.18.5` (SheetJS) known high-severity CVEs 🟠
- Prototype pollution (CVE-2023-30533) + ReDoS (CVE-2024-22363); 0.18.5 is the last npm build and is flagged by `npm audit`. Used to parse **user-supplied** guest spreadsheets (`utils/xlsxUtils.js`). Upgrade to the SheetJS CDN build, or replace with a maintained parser, or sandbox/validate input. · **Effort:** S–M

### 2.8 — EAS submit config empty + versioning 🟠
- `eas.json:20-22` `submit.production: {}` — no Apple ID/ASC app ID/Team ID, no Android service account/track. Fill both; set up **Play App Signing** + an ASC API key. Add explicit initial `ios.buildNumber`/`android.versionCode` alongside `autoIncrement`. · **Effort:** S

### 2.9 — `.env` committed (mobile) 🟠
- `halla-mobile/.env` is git-tracked (low-sensitivity today — only `EXPO_PUBLIC_*`, which is bundled anyway — but a footgun). Add to `.gitignore`, commit `.env.example`. · **Effort:** XS

### 2.10 — iOS build toolchain: Xcode 26 / iOS 26 SDK (in effect since Apr 28 2026) 🟠
- Apple requires uploads to be built with **Xcode 26 + the iOS 26 SDK**. Verify the EAS build image (`eas.json`) uses an image on Xcode 26 and that Expo SDK 54 builds cleanly against it; if not, bump the EAS image or Expo SDK. *Source: [Apple upcoming requirements](https://developer.apple.com/news/upcoming-requirements/).* · **Effort:** S (verify) / M (if SDK bump needed)

### 2.11 — Backend auth/payment hardening 🟠
- Global limiter + `trust proxy` (from 1.6); `crypto.randomInt` for OTP and email codes (`otp.service.js:21`, `UserModel.js:548` use `Math.random()`); validate `capturePayment` amount ≤ authorized (`payments.service.js:352-364`; `issueRefund` already clamps); escape/​anchor the `$regex` built from caller input in `User.search` (`UserModel.js:879-886`) to prevent ReDoS/regex injection on admin search. · **Effort:** S–M

---

## 4. Account-deletion data-model map (spec for §1.3)

User ownership spans several models (owner field → `models/`). A correct `DELETE /users/me` must:

**Cascade / anonymize:**
- **User** (`UserModel.js`) — soft-delete (`softDelete():669`) + **anonymize PII**: `email:197`, `mobile:210`, `phoneNumber:223`, `name:236`, `username:229`; delete S3: `avatar:242`, vendor `portfolioImages:109`, `businessLogo:110`, `profileFile:111`, `commercialRecordImage:119`, `nationalIdImage:120`.
- **Events** (`EventModel.js`, owner `host:287`) — soft-delete (`status` enum has `deleted`, `deletedAt:425`); delete S3 `branding.logoKey:311`, `visualTemplate.bakedImagePath:132`, `templateImage:275`.
- **Guests** (`GuestModel.js`, `addedBy:7`) — soft-delete (`deleted:204`); **third-party PII** `name:12`, `phone:20` must be deleted/anonymized with the host's events.
- **PostEventContent** (`host:127`) — delete S3 `coverImage:156`, `media[].url:69`, `thumbnailUrl:73`.
- **Notifications** (`userId:89`) + **NotificationPreferences** (`userId:12`) — delete.
- **Tickets** (`user:53`) — anonymize link.

**Revoke (run on delete):** `RefreshTokenModel` via `authService.revokeAllForUser` (`auth.service.js:192`); staff/guest access tokens are event-scoped (revoked when events are deleted).

**Retain (legal/compliance):** `PaymentModel` (`userId:105`), `SubscriptionModel`, `AddonModel`, `AuditLogModel` (immutable) — optionally null the `userId` link.

**S3 caveat:** no model auto-deletes S3 on removal — the endpoint must enumerate and delete keys explicitly or they orphan in the bucket.

---

## 5. Phase 3 — P2 Medium (polish, UX, privacy, submission process)

| ID | Item | Where | Fix |
|---|---|---|---|
| 3.1 | Privacy/Terms not linked at signup; no public URL | `screens/auth/SignupScreen.js`, vendor signup | Add "agree to Terms & Privacy" links; publish hosted **public** privacy + terms URLs (both stores require; Google requires non-geofenced, no-PDF) |
| 3.2 | No data-export / DSAR path (Saudi PDPL / store privacy) | backend | Document a manual DSAR process; ideally add `GET /users/me/export` |
| 3.3 | Pull-to-refresh spinner never animates | `TicketsScreen.js:212`, `NotificationsScreen.js:239` (`refreshing={false}`) | Bind to `isFetching`/`isRefetching` |
| 3.4 | `AdminTemplatesScreen` reachable blank stub | `screens/admin/admin-dashboard/AdminTemplatesScreen.js`; route `AdminNavigator.js:300` | Implement or hide the entry |
| 3.5 | Debug `console.log` in production | `LanguageProvider.js` (9×), `index.js:8` | Gate behind `__DEV__` / `utils/log.js dlog` |
| 3.6 | No offline / no-network detection | app-wide | Add `@react-native-community/netinfo`, wire React Query `onlineManager` |
| 3.7 | API base URL hardcoded to production | `config/api.js:15` | Drive from `EXPO_PUBLIC_API_URL` per build profile (QA shouldn't hit prod) |
| 3.8 | Scattered non-localized strings | `VendorDetailsScreen.js`, `BusinessDetailsScreen.js`, `PaymentsScreen.js`, `AppNavigator.js:520` | Route through `t()` |
| 3.9 | Backend graceful shutdown incomplete | `server.js:60-67` | Close Mongo + drain cron on SIGTERM; add SIGINT |
| 3.10 | Backend `/health` shallow; `prom-client` unmounted | `app.js:183`, `package.json:40` | Deepen health (DB/Redis), mount `/metrics` |
| 3.11 | Backend PII in logs | `otp.service.js:75-96` (phone), `rateLimiter.js:52` | Scrub/redact for PDPL/data-safety alignment |
| 3.12 | Data-safety / privacy-label inventory | submission forms | Fill from §8 |
| 3.13 | Demo/review account | review notes | See §6 (reviewer can't get SMS OTP) |
| 3.14 | Dead code | `LanguageReset.js`, `LanguageSelector.js:75-82`, zero-byte `components/settings/PrefLang.js` + `components/createEvent/StepTwoBtns.js` | Remove |

---

## 6. Phase 4 — Store accounts, gates, assets & submission process

**Apple — accounts & gates**
- [ ] Apple Developer Program ($99/yr) + App Store Connect record (`com.halla.app`).
- [ ] **Reviewer demo account (critical):** reviewers **cannot receive your SMS/email OTP**. Provide a **test phone/email with a static OTP** (e.g. `000000`) or a **demo mode**, documented in App Review Notes (Apple 2.1). If Option B (IAP), ensure sandbox products are reviewable.
- [ ] **Build toolchain:** Xcode 26 / iOS 26 SDK (2.10).
- [ ] Confirmed **N/A**: Sign in with Apple (first-party auth only, 4.8), ATT/`NSUserTrackingUsageDescription` (no tracking SDKs, 5.1.2). Don't add either gratuitously.
- [ ] **Privacy manifests:** handled by Expo SDK 54 (no named third-party SDKs on Apple's list; `expo prebuild`/EAS aggregates `PrivacyInfo.xcprivacy`). Verify the build includes it; no action expected. *Source: [Apple third-party SDK requirements](https://developer.apple.com/support/third-party-SDK-requirements/).*

**Google — accounts & gates**
- [ ] Play Console account ($25). **Decide account type — a real timeline driver:**
  - **Personal** account (created after Nov 13 2023) → must run **closed testing with ≥12 testers for ≥14 consecutive days** before production (budget ~2+ weeks); KSA needs Saudi gov photo ID + proof of address. *Source: [Play closed-testing requirement](https://support.google.com/googleplay/android-developer/answer/14151465).*
  - **Organization** account → **exempt** from the testing gate but needs a **D-U-N-S number** (~up to 30 days to obtain). *Source: [Play account types](https://support.google.com/googleplay/android-developer/answer/13634885).*
- [ ] Enroll in **Play App Signing**; ship a signed **`.aab`** (EAS produces it).
- [ ] **App content → Sign-in details:** permanent demo login, flag the OTP flow.
- [ ] **IARC content rating** questionnaire; set **target audience = adults** (avoid Families policy).
- [ ] **Android target API:** already **API 36** (SDK 54) — compliant; don't downgrade. Verify SDK 54's forced **edge-to-edge** doesn't break RTL/Arabic insets.

**Listing content (both stores, AR + EN)**
- [ ] Name, subtitle/short description, full description (must **disclose in-app purchases** — Apple 2.3.2), keywords, support/marketing URLs.
- [ ] **Public privacy-policy URL** (required by both) + **public account-deletion URL** (Google).
- [ ] Screenshots: iOS 6.7"/6.9" iPhone + 13" iPad (`supportsTablet: true`); Android phone + tablet + **feature graphic 1024×500**; AR + EN.

**Compliance forms (from §8 inventory)**
- [ ] Apple **App Privacy labels** + Google **Data safety** — must match the privacy policy and actual behavior.
- [ ] Apple export compliance (`ITSAppUsesNonExemptEncryption: false`).

---

## 7. Suggested sequencing (with calendar gates)

1. **Week 0 — Decisions:** payment Option B vs N (§1); push v1 vs descope (1.5); **Play account type** (§6, gates the timeline); confirm brand assets.
2. **Week 0 — Start Google calendar gates immediately:** if Org → file for **D-U-N-S** (~30 days); if Personal → recruit 12 testers and start the **14-day** closed test as soon as a build exists.
3. **Week 1 — Backend blockers (parallel):** secrets rotation + prod env + rate limiting + trust proxy + webhook HMAC (1.6); `USER_STATUS.DELETED` + `DELETE /users/me` cascade (1.3, §4); push backend (1.5) if in scope.
4. **Week 1–2 — Mobile blockers:** icon/splash/adaptive (1.1); Expo plugins + usage strings (1.2/2.1); account-deletion UI (1.3); universal links + `.well-known` (1.4); Android perms/manifest audit (2.2); maps API key (2.4); MediaTypeOptions (2.5); force-password gate (2.6); push client (1.5).
5. **Week 2–4 — Payments (Option B):** RevenueCat + StoreKit + Play Billing + backend receipt validation + store products; **or** Option N removal.
6. **Week 2 — High:** Sentry (2.3); xlsx CVE (2.7); EAS submit + Play App Signing (2.8); `.env` (2.9); Xcode 26 verify (2.10); backend auth/payment hardening (2.11).
7. **Week 3–4 — Medium + collateral:** §5 items; screenshots, listings, privacy/data-safety forms, demo accounts (§6).
8. **Week 4+ — Test & submit:** EAS `production` builds → TestFlight + Play closed/internal testing → full QA (§9) → submit. iOS review ~1–3 days; Google review + (if Personal) the 14-day test gate dominate.

---

## 8. Data-collection inventory (for Apple Privacy Labels / Google Data Safety)

Verified from code + `privacy.json:114`:
- **Contact info:** name/username, email, phone (`AccountSettings.js`, auth flows).
- **Contacts:** guest **name + phone only**, user-selected (`utils/contacts/phoneContacts.js:49`).
- **Location:** approximate, **foreground/transient**, for event-location selection (`MapPicker.js:106`) — not continuously stored.
- **Photos/videos:** uploads across vendor/event/post-event forms.
- **Payment:** handled by Moyasar (web) / Apple/Google (IAP); app never stores card data (`privacy.json:114`).
- **Identifiers/diagnostics:** device type, OS, IP, interaction patterns (`privacy.json:114`); **push token** only after push is implemented.
- **No tracking / no ads SDKs** → ATT N/A; declare "Data Not Used to Track You."

---

## 9. Pre-submission QA checklist

- [ ] Fresh install → language gate (confirm **Arabic** first-run) → onboarding → signup (host & vendor) → OTP → core flows.
- [ ] Create-event wizard end-to-end; **map renders on Android** (2.4); guest import (contacts + xlsx/vCard); invitation send; guest-portal RSVP link; QR staff check-in.
- [ ] Payments: full native IAP purchase + restore (Option B), or confirm no purchase UI/steering (Option N).
- [ ] Deep links on a real device: `https://halaa.com.sa/reset-password/<token>` and `/invitation/<code>` open the app (after 1.4).
- [ ] Push: receive + tap routes correctly (after 1.5), or confirm no dangling permission prompt if descoped.
- [ ] **Account deletion** works, anonymizes, and clears session (after 1.3); admin delete no longer throws.
- [ ] Permission prompts show correct AR/EN purpose strings; deny paths don't crash; **no photo-library crash on iOS** (1.2).
- [ ] No console noise / no reachable placeholder screens; RTL correct in both languages incl. edge-to-edge insets.
- [ ] Crash-free smoke on a low-end Android + older iPhone; Sentry receives a forced test crash.
- [ ] Backend against production config: rate limits active, no stack traces leaked, webhook signature enforced, `/health` deep.

---

## 10. Regulatory sources (current, 2026)

- Apple App Store Review Guidelines — https://developer.apple.com/app-store/review/guidelines/ (§3.1.1, 3.1.1(a), 3.1.3(e), 5.1.1(v), 5.1.1, 2.1, 2.3.2, 4.8)
- Apple account deletion — https://developer.apple.com/support/offering-account-deletion-in-your-app/
- Apple privacy manifests / SDK list — https://developer.apple.com/support/third-party-SDK-requirements/ · upcoming build reqs — https://developer.apple.com/news/upcoming-requirements/
- Apple App Privacy / ATT — https://developer.apple.com/app-store/app-privacy-details/ · https://developer.apple.com/app-store/user-privacy-and-data-use/
- Google Play Payments — https://support.google.com/googleplay/android-developer/answer/9858738 · user-choice billing — https://support.google.com/googleplay/android-developer/answer/13821247
- Google account deletion — https://support.google.com/googleplay/android-developer/answer/13327111 · Data safety — https://support.google.com/googleplay/android-developer/answer/10787469
- Google target API — https://developer.android.com/google/play/requirements/target-sdk · closed testing — https://support.google.com/googleplay/android-developer/answer/14151465 · photo/video — https://support.google.com/googleplay/android-developer/answer/14115180

---

## 11. Corrections from v1 (accuracy log)

- **Payments reframed** from "decision (try real-world-service, web fallback)" → "**must use native IAP/Play Billing for KSA**" (US/EU external-link relief does not apply to Saudi Arabia).
- **Android target API:** v1 implied an upgrade might be needed; SDK 54 already targets **API 36** — fully compliant. No action.
- **Privacy manifests:** added as a verify-only item (handled by Expo), not an action item.
- **Accessibility:** count corrected to **~10** labels (v1 said ~17).
- **PII in logs (mobile):** softened — mobile logging is clean (no tokens/PII); the real PII-in-logs issue is **backend** (phone numbers), now §3.11.
- **Committed secrets:** clarified they are **test/staging** keys (still must rotate + purge history).
- **Account-deletion endpoint path:** the orphaned helper targets `/users/profile` (DELETE), not `/users/me`; the admin delete bug spans **four** services and **throws at runtime** (worse than v1 implied).
- **New blockers added:** missing Expo config plugins (iOS crash risk, 1.2), maps API key (2.4), deprecated MediaTypeOptions (2.5), xlsx CVEs (2.7), Xcode 26 toolchain (2.10), reviewer-OTP demo problem (§6), Google closed-testing gate (§6).
- **Verified accurate (not overstated):** the secure token model and server-side-priced Moyasar core are genuinely solid; deletion/push/secrets/rate-limit findings all confirmed.

---

*Appendix — primary evidence files:* `app.json`, `eas.json`, `App.js`, `config/api.js`, `hooks/users/_api.js`, `hooks/users/index.js`, `components/settings/SettingsTabs.js`, `components/commen/MapPicker.js`, `screens/host/ForcePasswordChangeScreen.js`, `navigation/AppNavigator.js`, `assets/logo.png`, `services/http.js`, `components/shared/ErrorBoundary.js`; backend `src/app.js`, `config.env`, `src/shared/middleware/rateLimiter.js`, `src/shared/constants/status.js`, `src/modules/users/users.routes.js`, `src/modules/auth/otp.service.js`, `src/modules/payments/{checkout.service.js,payments.service.js}`, `src/modules/messaging/messaging.webhook.controller.js`, `src/modules/notifications/notifications.service.js`, `src/modules/admin/admin.hosts.service.js`, `models/{UserModel,EventModel,GuestModel,PaymentModel}.js`; shared `shared/src/api/paths.js`.
