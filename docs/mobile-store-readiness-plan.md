# Halaa Mobile — App Store & Google Play Readiness Plan

**Date:** 2026-06-27
**App:** Halaa (`halla-mobile`) — Expo SDK 54 · React Native 0.81 · React 19
**Bundle / Package ID:** `com.halla.app` (iOS & Android)
**Backend:** `labbe-backend-` (Node/Express + MongoDB) at `https://halaa.com.sa/api/v2`
**Scope of this plan:** everything required to ship the mobile app to the Apple App Store and Google Play, derived from a full review of the mobile app, the backend it depends on, and store policy requirements.

---

## 0. Executive summary & verdict

The app is **functionally rich and well-engineered** (clean navigation, role-gating, secure token storage, refresh-on-401, robust Moyasar payment core, full AR/EN + RTL, in-app legal docs). It is **not yet submittable** — there are hard blockers that guarantee rejection and one business-policy decision that must be made before any submission.

**Readiness scorecard**

| Area | State | Notes |
|---|---|---|
| App builds via EAS | 🟡 Likely | Config gaps below must be fixed first |
| App icon / splash / adaptive icon | 🔴 Blocker | 50×50 placeholder; invalid for both stores |
| In-app account deletion | 🔴 Blocker | Missing in app **and** backend; required by both stores |
| Payments / IAP policy | 🔴 Decision | Digital goods sold via card (Moyasar) — see §1 |
| Universal/app links | 🔴 Blocker | Password-reset & invitation https links won't open the app |
| Push notifications | 🔴 Broken end-to-end | App registers a token to a backend endpoint that doesn't exist |
| iOS permission strings / encryption decl. | 🟠 High | No `infoPlist` block; `ITSAppUsesNonExemptEncryption` missing |
| Crash reporting / analytics | 🟠 High | None wired; production crashes invisible |
| Backend production hardening | 🔴 Blocker | Committed secrets, rate-limiting off, NODE_ENV=development, webhook auth disabled |
| Privacy policy / terms | 🟢 Present | In-app; need public URL + signup-time link |
| i18n / RTL | 🟢 Strong | Minor default-locale nit |
| Accessibility | 🟡 Sparse | Not a hard blocker; recommended pass |
| EAS submit config | 🟠 High | `submit.production` empty; no store credentials |

**Bottom line:** roughly **2–4 weeks** of focused work (one mobile dev + one backend dev + a few hours of design) to reach a submittable build, **plus** the payment-policy decision in §1 which can add 0–4 weeks depending on the path chosen.

---

## 1. ⚠️ Decision required first — the payments / In-App Purchase question

This is the single biggest risk and **must be decided before submission** because it changes scope.

**The situation.** The app sells **digital goods consumed in-app** — subscription plans (`per-event`, `quarterly`, `annual`) and add-ons (extra invites, design templates) — and charges credit cards directly through **Moyasar** (3-D Secure). Evidence: `hooks/checkout/mutations.js`, `screens/host/PlansScreen.js` / `PlansSummaryScreen.js`, `components/plans/PaymentMethodSelector.js`, `utils/paymentBrowser.js`; backend `src/modules/payments/checkout.service.js`. There is **no StoreKit / Google Play Billing** integration anywhere.

**Why it matters.** Apple Guideline **3.1.1** and Google Play's Payments policy require digital content/subscriptions consumed inside the app to use the platform's own billing (Apple/Google take 15–30%). Selling them via an external card processor inside the binary is one of the most common rejection reasons.

**The nuance / opportunity.** Halaa's core deliverable is sending **real invitations to real guests via SMS/WhatsApp** and managing real-world events — a plausible "real-world service consumed outside the app" under Apple **3.1.3(e)**. This is defensible but not guaranteed; reviewers often treat invite-pool subscriptions as SaaS.

**Options (pick one):**

| Option | What | Approval risk | Revenue impact | Effort |
|---|---|---|---|---|
| **A. Web-only purchasing** (fast fallback) | Remove **all** purchase UI and any links-to-purchase from the iOS app; users buy on the website; the app only consumes what's already active. (Android can keep cards if framed as real-world service, but safest to mirror.) | Low | Keeps 100% (no store cut) but adds purchase friction | S–M |
| **C. Argue real-world service** (try first) | Keep Moyasar; submit with a clear review note explaining invitations are delivered to third parties via SMS/WhatsApp (service consumed outside the app). | Medium | Keeps 100% | XS (just a review note) + fallback ready |
| **B. Native IAP** | Integrate StoreKit 2 (iOS) + Play Billing (Android) for plans/add-ons with **server-side receipt validation**; keep Moyasar for web only. | Low (compliant) | Apple/Google take 15–30% | L (2–4 wks) |

**Recommendation:** Attempt **C** on the first submission (it's free and the real-world-service framing is genuine), with **A** fully built and ready as the immediate fallback if Apple rejects. Reserve **B** for if Apple insists on IAP and the web-redirect friction is unacceptable to the business. **This needs the founder's sign-off.**

> Everything in Phases 1–5 below is required regardless of which payment option is chosen.

---

## 2. Phase 1 — P0 Blockers (guaranteed rejection until fixed)

### 1.1 — App icon, splash & adaptive icon are an invalid 50×50 placeholder 🔴
- **Why:** `app.json` points `icon`, `splash.image`, and `android.adaptiveIcon.foregroundImage` all at `./assets/logo.png`, which is **50×50 px, RGBA (~669 bytes)**. Apple requires a **1024×1024 icon with no alpha**; Google Play requires a **512×512** hi-res icon; Android adaptive foreground should be 1024×1024 within a 432×432 safe zone. App Store Connect rejects the upload outright.
- **Where:** `app.json:8,11,23`; `assets/logo.png`.
- **How:**
  1. A usable source already exists in the repo: **`labbe/public/logo.png` (1024×1024)** and vector **`labbe/public/svg/logo.svg`**. Regenerate proper assets from these.
  2. Produce: `assets/icon.png` (1024×1024, **flattened on opaque background, no alpha** for iOS), `assets/adaptive-icon.png` (1024×1024 foreground with transparent padding), `assets/splash.png` (≥1242×2436 or a centered logo on brand bg), `assets/notification-icon.png` (96×96, white-on-transparent, for Android).
  3. Update `app.json`: `icon: "./assets/icon.png"`, `android.adaptiveIcon.foregroundImage: "./assets/adaptive-icon.png"`, splash via `expo-splash-screen` plugin (see 1.4 & 4.x).
- **Owner:** Design + mobile · **Effort:** S

### 1.2 — In-app account deletion is missing (app + backend) 🔴
- **Why:** Apple **5.1.1(v)** and Google Play both require any app that creates accounts to offer **in-app account deletion**. Google additionally requires a **web URL** to request deletion (for the listing).
- **Where (app):** `deleteAccount` helper exists but is **orphaned** — `hooks/users/_api.js:57` defines it, but it is **not exported** (`hooks/users/index.js:8-12`), has no `useDeleteAccount` mutation, and no UI calls it. Settings menu (`components/settings/SettingsTabs.js`) has account/notifications/privacy/terms/logout only.
- **Where (backend):** **No `DELETE /users/me|profile` route.** `src/modules/users/users.routes.js` exposes only profile/password/phone/notif + `DELETE /profile/vendorData/image`. Soft-delete plumbing exists but is unreachable: `models/UserModel.js` has `deletedAt` + `softDelete()`.
- **How:**
  1. **Backend:** add `DELETE /api/v2/users/me` → password/OTP re-auth → soft-delete (anonymize PII: name, email, phone) + cascade/detach owned events, revoke all refresh tokens, mark `deletedAt`. (Reuse existing `softDelete()`.) Note the latent bug: admin `deleteHost()` sets `status = USER_STATUS.DELETED`, a value missing from `src/shared/constants/status.js` — add it.
  2. **App:** export `useDeleteAccount` from `hooks/users`, add a destructive "Delete account / حذف الحساب" row to `SettingsTabs.js` → confirmation modal (type-to-confirm or re-enter password) → call mutation → on success wipe session (`authStore.logout`-style local clear) and route to Welcome.
  3. **Web + listing:** publish a public "request account deletion" page/URL for the Google Play form.
- **Owner:** Backend + mobile · **Effort:** M

### 1.3 — Universal / App Links not configured natively 🔴
- **Why:** `App.js:136-161` declares `prefixes: ["halla://", "https://halaa.com.sa"]` for `reset-password/:token`, `invitation/:code`, `host/payments/return`, but `app.json` has **no iOS `associatedDomains`** and **no Android `intentFilters` with `autoVerify`**. Result: password-reset email links and SMS/WhatsApp invitation links (https) open the browser, not the app. (The 3DS payment return uses the `halla://` custom scheme and is unaffected.)
- **Where:** `app.json` (missing config); `App.js` linking config.
- **How:**
  1. `app.json` → `ios.associatedDomains: ["applinks:halaa.com.sa"]`.
  2. `app.json` → `android.intentFilters` for `https` host `halaa.com.sa` paths (`/reset-password/*`, `/invitation/*`) with `"autoVerify": true`.
  3. Host **`/.well-known/apple-app-site-association`** (no extension, `application/json`, app ID `TEAMID.com.halla.app`) and **`/.well-known/assetlinks.json`** (SHA-256 cert fingerprint from Play App Signing) on `halaa.com.sa`. Coordinate fingerprint with EAS credentials.
- **Owner:** Mobile + devops · **Effort:** M

### 1.4 — Push notifications are non-functional end-to-end 🔴 (Blocker if advertised; otherwise High)
- **Why:** The app requests notification permission, fetches an Expo push token, and `PATCH`es it to `/auth/update-push-token` (`App.js:47-83`). That path is defined in `shared/src/api/paths.js:61` but **the backend has no such route, no push-token field on `UserModel`, and no push SDK** (`expo-server-sdk`/`firebase-admin`/`apn` absent). The token POST silently 404s (`.catch(() => {})`). `NotificationModel` has dead `channels.push` fields; `notifications.service.js` only writes in-app DB rows + optional email. **Push never works.** Shipping a notification-permission prompt that does nothing risks an Apple **2.1 / 5.1.1** flag, and is a missing core feature for an event app.
- **How:**
  1. **Backend:** add `pushTokens: [String]` to `UserModel`; implement `PATCH /auth/update-push-token` (dedupe, associate to user/device); add **Expo Server SDK** delivery in `notifications.service.js` for the events that already create in-app notifications; handle `DeviceNotRegistered` → prune invalid tokens.
  2. **App (after backend exists):** fix the deprecated handler — `App.js:34` uses `shouldShowAlert` (deprecated in expo-notifications ~0.32 / SDK 54) → replace with `{ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }`. Add `addNotificationResponseReceivedListener` + `getLastNotificationResponseAsync` to route taps (and cold-start taps) to the relevant event/ticket. Create the Android channel at startup (not inside the auth-gated path). Add `expo-notifications` to `app.json` plugins with the notification icon/color.
- **Owner:** Backend + mobile · **Effort:** M–L
- **Alternative (descoped v1):** if push can't make v1, **remove the permission prompt and registration** so the app doesn't ask for a permission it never uses (notifications then arrive via in-app polling / SMS / email). Decide explicitly.

### 1.5 — Backend production hardening (mobile depends on this) 🔴
These make the production API the mobile app talks to safe and stable. All are in `labbe-backend-`.
- **Committed live secrets** — `config.env` and `certs/mongodb-x509.pem` are git-tracked with **real** `JWT_SECRET`, `MOYASAR_API_KEY` (`sk_test_…`), `MOYASAR_WEBHOOK_SECRET`, `AWS_SECRET_ACCESS_KEY`, Mongo URI, `TAQNYAT_API_KEY`, `EMAIL_PASSWORD`. **Rotate all, purge from git history, move to deployment env/secret manager.**
- **Rate limiting disabled** — `RATE_LIMIT_ENABLED=false` makes every limiter a no-op (`src/shared/middleware/rateLimiter.js:42`). Enable it; add a baseline **global** limiter (currently opt-in per route, so `/events`, `/payments`, `/messaging/send`, uploads are unthrottled — H4).
- **`NODE_ENV=development`** committed — leaks stack traces to clients, serves Swagger publicly, weakens cookie flags (`globalErrorHandler.js`, `app.js:198`). Deploy with `NODE_ENV=production`.
- **No `trust proxy`** — behind nginx, all IP-keyed limiters/lockouts bucket to one key (`src/app.js`). Set `app.set('trust proxy', 1)`.
- **Inbound WhatsApp/Taqnyat webhook auth disabled** — `verifyWebhookSignature()` returns `{ ok: true }` unconditionally (`src/modules/messaging/messaging.webhook.controller.js:28`); forged RSVP/guest events corrupt state the mobile host UI reads. Re-enable HMAC over `req.rawBody`.
- **Owner:** Backend + devops · **Effort:** M

---

## 3. Phase 2 — P1 High (likely rejection or serious production risk)

### 2.1 — iOS permission usage strings & encryption declaration 🟠
- **Why:** `app.json` has **no `ios.infoPlist`** block. The app uses the **photo library** (`expo-image-picker` `launchImageLibraryAsync` in `components/commen/ImageInput.js`, `MultiImageInput.js`, `host/post-event/MediaUploader.js`, vendor forms) and **foreground location** (`components/commen/MapPicker.js`). Apple rejects missing or boilerplate purpose strings. Also every TestFlight build blocks on the export-compliance question until `ITSAppUsesNonExemptEncryption` is set.
- **How:** add `ios.infoPlist` with explicit, purpose-specific **AR+EN** strings:
  - `NSPhotoLibraryUsageDescription` — choosing event/profile/service images.
  - `NSLocationWhenInUseUsageDescription` — selecting the event location on the map (the current `expo-location` plugin string is worded for "Always" but the app is foreground-only; correct it).
  - `ITSAppUsesNonExemptEncryption: false` (standard HTTPS only).
  - `NSContactsUsageDescription` is already provided via the `expo-contacts` plugin — keep. Camera is **not** used (`launchCameraAsync` absent) → don't add `NSCameraUsageDescription` unless a "take photo" option is added.
- **Owner:** Mobile · **Effort:** S

### 2.2 — Android permissions: dedupe, justify, notifications 🟠
- **Why:** `app.json:26-31` lists location permissions **twice** (bare + fully-qualified). `ACCESS_FINE_LOCATION` is declared but the app only does coarse map-centering — Play requires prominent disclosure + justification for FINE. No explicit `POST_NOTIFICATIONS` (Android 13+) and no `expo-notifications` plugin/icon (white-square status-bar icon = Play QA flag).
- **How:** dedupe to the two `android.permission.ACCESS_*_LOCATION` entries; drop `FINE` if coarse suffices; add `expo-notifications` plugin with a proper monochrome notification icon; confirm the prebuilt manifest includes `READ_CONTACTS` (from `expo-contacts`) so Android contact import works.
- **Owner:** Mobile · **Effort:** S

### 2.3 — Crash reporting & error visibility 🟠
- **Why:** No Sentry/Bugsnag/Crashlytics/analytics (`package.json`); `components/shared/ErrorBoundary.js` only `console.error`s (its own docstring says "log to Sentry/Crashlytics here"). For a payment + auth app, production crashes are invisible.
- **How:** add **`@sentry/react-native`** (Expo plugin), wire `ErrorBoundary` + a global handler + the JS error boundary; set release/dist to match EAS build numbers; scrub PII. Add lightweight analytics if product wants funnel data (optional).
- **Owner:** Mobile · **Effort:** S–M

### 2.4 — Orphaned forced-password-change flow can lock out business accounts 🟠
- **Why:** `screens/host/ForcePasswordChangeScreen.js` is fully built and documents that it's rendered as a `ForcePasswordChangeStack`, **but that stack doesn't exist** and `AppNavigator.js` never checks `mustChangePassword()` (exposed at `stores/authStore.js:417`). Admin-created business accounts with `mustChangePassword:true` get 403 `PASSWORD_CHANGE_REQUIRED` on every gated endpoint with **no route to change the password** → unusable account.
- **How:** gate the root navigator on `mustChangePassword()` **before** the role switch (render `ForcePasswordChangeScreen` until cleared), or confirm no such accounts can reach production.
- **Owner:** Mobile · **Effort:** S

### 2.5 — EAS submit config is empty 🟠
- **Why:** `eas.json` `submit.production: {}` — no Apple ID / ASC app ID / Apple Team ID, no Android service-account key/track. `eas submit` will fail/prompt in CI.
- **How:** fill `submit.production.ios` (`appleId`, `ascAppId`, `appleTeamId`) and `submit.production.android` (`serviceAccountKeyPath`, `track: "internal"` → promote later). Set up **Play App Signing** + an ASC API key. Add explicit initial `ios.buildNumber` / `android.versionCode` alongside the existing `autoIncrement`.
- **Owner:** Devops/mobile · **Effort:** S

### 2.6 — `.env` committed in mobile repo 🟠
- **Why:** `halla-mobile/.env` is git-tracked (`.gitignore` only ignores `.env*.local`). Current value is low-sensitivity (`EXPO_PUBLIC_*` is bundled anyway), but it's a footgun for the first real secret.
- **How:** add `.env` to `.gitignore`, commit `.env.example`, document required vars.
- **Owner:** Mobile · **Effort:** XS

### 2.7 — Backend auth/payment hardening (high) 🟠
- `trust proxy`, global limiter (covered in 1.5 / H4); `crypto.randomInt` for OTP instead of `Math.random()` (`src/modules/auth/otp.service.js:21`); validate `capturePayment` amount ≤ authorized (`payments.service.js`); verify `express-mongo-sanitize` doesn't throw on `req.query` under the deployed Express version.
- **Owner:** Backend · **Effort:** S–M

---

## 4. Phase 3 — P2 Medium (polish, UX, submission process)

| ID | Item | Where | Fix |
|---|---|---|---|
| 3.1 | Privacy/Terms not linked at signup; need public URL | `screens/auth/SignupScreen.js`, vendor signup | Add "By signing up you agree to Terms & Privacy" with in-app links; publish hosted privacy-policy URL for both listings |
| 3.2 | Pull-to-refresh spinner never animates | `screens/common/TicketsScreen.js:212`, `NotificationsScreen.js:239` (`refreshing={false}` hardcoded) | Bind to `isFetching`/`isRefetching` |
| 3.3 | `AdminTemplatesScreen` is a blank stub but reachable | `screens/admin/admin-dashboard/AdminTemplatesScreen.js` | Implement, or hide the nav entry until built |
| 3.4 | Debug `console.log` shipping to production | `localization/providers/LanguageProvider.js` (9×), `index.js:8` | Gate behind `__DEV__` / use `utils/log.js dlog` |
| 3.5 | No offline / no-network detection | app-wide | Add `@react-native-community/netinfo`, wire React Query `onlineManager`, show a friendly offline state instead of raw timeouts |
| 3.6 | API base URL hardcoded to production | `config/api.js:15` | Drive from `EXPO_PUBLIC_API_URL` per build profile so QA doesn't hit prod data |
| 3.7 | Scattered non-localized strings | `VendorDetailsScreen.js`, `BusinessDetailsScreen.js`, `PaymentsScreen.js`, `AppNavigator.js:520` | Route through `t()` |
| 3.8 | Data-safety / privacy-label inventory | submission forms | Fill Apple Privacy Labels + Google Data Safety (see §6) |
| 3.9 | Dead dev component & commented JSX | `components/languagePrefrence/LanguageReset.js`, `LanguageSelector.js:75-82` | Remove (harmless — self-guards with `!__DEV__`) |
| 3.10 | Demo/review account | App Store / Play review notes | Provision a working **host** demo login (+ note OTP behavior) for reviewers |

---

## 5. Phase 4 — P3 Low (recommended, not blocking)

- **Accessibility pass** — only ~17 `accessibilityLabel`s app-wide; add labels to primary CTAs and icon-only buttons (`NotificationBell`, etc.). Apple may cite; improves review impression.
- **i18n default-locale nit** — `i18nConfig.js:17` sets `defaultLocale/lng: "en"` while the product is Arabic-first; confirm first-run shows the intended default (governed by the language gate).
- **Cold-start UX** — wire the existing `loadUserShadow`/`_peekUserShadow` "welcome back" fast-path (`authStore.js`) so cold start doesn't block on a full network round-trip.
- **Backend ops** — mount the already-declared `prom-client` at `/metrics`; deepen `/health` to check DB/Redis; populate `MOYASAR_WEBHOOK_IP_WHITELIST`; replace boot/error `console.*` with Winston.
- **FormData 401 retry helper** — `services/http.js:175` returns the stale 401 after refresh for uploads; add a shared retry so callers don't each handle it.

---

## 6. Store submission assets, accounts & metadata (process checklist)

**Accounts & setup**
- [ ] Apple Developer Program enrollment ($99/yr) + App Store Connect app record (`com.halla.app`).
- [ ] Google Play Console account ($25 one-time) + app record; enable **Play App Signing**.
- [ ] EAS project linked (already: `projectId d5570c5a-…`, owner `petersafwat`); fill `eas.json` submit creds (2.5).
- [ ] ASC API key + Android service-account JSON for `eas submit`.

**Listing content (both stores, AR + EN)**
- [ ] App name, subtitle, description, keywords, promotional text, support URL, marketing URL.
- [ ] **Privacy policy URL** (public) — required by both.
- [ ] Category (e.g., Events / Lifestyle), age rating (Apple) + IARC content-rating questionnaire (Google).

**Visual assets**
- [ ] iOS screenshots: 6.7"/6.9" iPhone + 12.9"/13" iPad (app `supportsTablet: true`), AR + EN.
- [ ] Android screenshots (phone + tablet), feature graphic **1024×500**, 512×512 icon.
- [ ] App preview videos (optional).

**Compliance forms**
- [ ] Apple **Privacy "Nutrition Labels"** and Google **Data Safety** — disclose data the app collects/transmits:
  - **Contacts** (selected name+phone only — `utils/contacts/phoneContacts.js`)
  - **Location** (approximate, transient — event location selection)
  - **Email, phone, name/username** (account)
  - **Photos** (profile/service/post-event uploads)
  - **Push token / device id** (after push is implemented)
- [ ] Export compliance (`ITSAppUsesNonExemptEncryption: false`).
- [ ] Account-deletion URL (Google) + in-app deletion (both) — from 1.2.
- [ ] **Sign in with Apple** — **not required** (app uses first-party phone-OTP + email/password, no third-party social login).
- [ ] Review notes: demo host credentials (3.10); if pursuing payment Option C, the real-world-service explanation.

**Build & target levels (already satisfied by Expo SDK 54)**
- Android targets API 35 (Android 15), 64-bit, AAB output via EAS. iOS built with current Xcode/SDK. New Architecture enabled.

---

## 7. Suggested sequencing

1. **Week 0 — Decide:** payment Option (§1); push for v1 or descope (1.4); confirm brand assets.
2. **Week 1 — Backend blockers in parallel:** secrets rotation + prod env + rate limiting + trust proxy + webhook HMAC (1.5); account-deletion endpoint (1.2); push backend (1.4) if in scope.
3. **Week 1–2 — Mobile blockers:** real icon/splash/adaptive (1.1); account-deletion UI (1.2); universal-link config + `.well-known` files (1.3); `infoPlist` + encryption decl (2.1); Android permissions (2.2); force-password-change gate (2.4); push client fixes (1.4).
4. **Week 2 — High:** Sentry (2.3); EAS submit config + Play App Signing (2.5); `.env` hygiene (2.6); backend high items (2.7).
5. **Week 2–3 — Medium polish & store collateral:** Phase 3 items; screenshots, listings, privacy/data-safety forms, demo account.
6. **Week 3 — Internal testing:** EAS `preview`/`production` builds → TestFlight + Play Internal Testing; full QA pass (§8).
7. **Week 3–4 — Submit:** iOS (with payment review note) + Android; iterate on review feedback.

---

## 8. Pre-submission QA checklist

- [ ] Fresh install: language gate → onboarding → signup (host & vendor) → OTP → core flows.
- [ ] Create event wizard end-to-end; guest list import (contacts permission); invitation send; RSVP via guest portal link; QR staff check-in.
- [ ] Payment: full Moyasar 3DS round-trip incl. `halla://host/payments/return` deep link.
- [ ] Deep links from a real device: `https://halaa.com.sa/reset-password/<token>` and `/invitation/<code>` open the app (after 1.3).
- [ ] Push: receive + tap routes correctly (after 1.4), or confirm no dangling permission prompt if descoped.
- [ ] **Account deletion** works and clears session (after 1.2).
- [ ] Permission prompts show correct AR/EN purpose strings; deny paths don't crash.
- [ ] No console noise / no placeholder screens reachable; AdminTemplates hidden or built.
- [ ] RTL correctness on key screens; both languages.
- [ ] Crash-free smoke on a low-end Android device + an older iPhone; verify Sentry receives a forced test crash.
- [ ] Backend smoke against production config: rate limits active, stack traces not leaked, webhook signature enforced.

---

*Appendix — primary evidence files:* `app.json`, `eas.json`, `App.js`, `config/api.js`, `hooks/users/_api.js`, `hooks/users/index.js`, `components/settings/SettingsTabs.js`, `screens/host/ForcePasswordChangeScreen.js`, `navigation/AppNavigator.js`, `assets/logo.png`, `services/http.js`, `components/shared/ErrorBoundary.js`; backend `src/app.js`, `config.env`, `src/shared/middleware/rateLimiter.js`, `src/modules/users/users.routes.js`, `src/modules/payments/checkout.service.js`, `src/modules/messaging/messaging.webhook.controller.js`, `src/modules/notifications/notifications.service.js`, `models/UserModel.js`; shared `shared/src/api/paths.js`.
