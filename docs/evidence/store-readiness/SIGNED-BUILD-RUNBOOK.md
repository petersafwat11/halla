# Signed-build preparation & artifact-verification runbook (Session 7)

**Status:** `BLOCKED_NEEDS_OWNER` — signed IPA/AAB artifacts cannot be produced or inspected in
this environment. · **Prepared:** 2026-07-02 · **Scope:** Session 7 (master plan Phase 4;
tasks `ART-IOS`, `ART-AND`, plus the EAS-secret half of runbook §9).

> **This runbook contains NO secret values.** It lists credential/secret **names** only. It is
> the exact, ordered sequence the owner runs on a machine with Apple/Google/EAS credentials so a
> real signed build succeeds first try and passes review. Session 7 did the full read-only config
> audit and applied two verifiable, review-safe iOS-permission hardenings (see §1); it did **not**
> run `eas build`/`eas submit` (no Expo/Apple/Google auth), did **not** invent any build id,
> checksum, SDK-inspection output, or device-test result, and did **not** touch the tracked
> secret files (`labbe-backend-/config.env`, `halla-mobile/.env` — see SEC-01).

---

## 0. Why this is BLOCKED here (honest boundary)

This session has **none** of: Apple Developer Program / App Store Connect credentials, a Google
Play service-account JSON, an EAS/Expo build account, macOS/Xcode, or physical iPhone/iPad/Android
devices. Therefore it **cannot** produce a signed IPA/AAB, cannot `codesign -d`/`unzip` a real
binary, and cannot run on-device. Everything below labelled **[OWNER]** requires that infra.
Everything labelled **[DONE]** was completed and verified this session with read-only local tools.

---

## 1. Config-readiness audit result (read-only, DONE this session)

Verified against the **actual** resolved Expo config, not the status doc. Commands run:
`npx expo config --type public` (exit 0), `npx expo config --type introspect` (exit 0 — runs the
config-plugin mods in-memory so the generated `Info.plist` / merged `AndroidManifest` are visible),
`npx expo-doctor` (**18/18**), mobile `npm test` (**33/33**), mobile `npm run lint` (**0**).

| # | Audit item | Result | Evidence |
|---|---|---|---|
| 1 | Expo SDK | **PASS** — `sdkVersion 54.0.0`, `expo ~54.0.33`, `newArchEnabled: true` | `app.json`, `package.json` |
| 2 | RN / React | **PASS** — `react-native 0.81.5`, `react 19.1.0` | `package.json` |
| 3 | App version | **PASS** — `1.0.0` (iOS `CFBundleShortVersionString` + Android derive from this) | `app.json` |
| 4 | iOS buildNumber | **PASS (with note)** — `"1"`; `eas.json production.autoIncrement:true` bumps it per build so it is unique/incrementing. First manual submit must ensure ASC has no prior build 1. | `app.json`, `eas.json` |
| 5 | Android versionCode | **PASS (with note)** — `1`; `autoIncrement:true` increments per build. Play rejects a re-used versionCode, so never hand-upload two builds with the same code. | `app.json`, `eas.json` |
| 6 | iOS bundleIdentifier | **PASS** — `com.halla.app` (matches the `com.halla` namespace; matches `@halla/shared/brand` `com.halla.app`; matches the CAT-01 `com.halla.<code>` product namespace) | `app.json` |
| 7 | Android package | **PASS** — `com.halla.app` (identical to iOS bundle id) | `app.json` |
| 8 | iPad support | **PASS** — `ios.supportsTablet:true`; introspect confirms `UISupportedInterfaceOrientations~ipad` = all 4 orientations (iPhone stays portrait-only). Apple requires 13" iPad screenshots because of this (ASO-02). | introspect |
| 9 | Deep-link scheme | **PASS** — `scheme: "halla"`; introspect `CFBundleURLSchemes` = `["halla","com.halla.app"]`. Backs the 3DS return `halla://` (memory: mobile 3DS deep-link bounce). | introspect |
| 10 | Associated / app-link domains | **PASS (verify at build)** — iOS `associatedDomains:["applinks:halaa.com.sa"]`; Android `intentFilters` `autoVerify:true` for `halaa.com.sa` (`/change-password`, `/invitation`, ar/en). **AASA/assetlinks must serve the FINAL Apple Team ID + Play app-signing SHA-256** — see §5/§6. | `app.json` |
| 11 | iOS permission usage strings | **HARDENED → PASS** — see §1a. After hardening the built `Info.plist` has **exactly 3** usage strings, all AR/EN, all for permissions the app uses. | introspect (post-edit) |
| 12 | iOS privacy manifest (`PrivacyInfo.xcprivacy`) + required-reason APIs | **GAP → owner-verify (NOT a config edit)** — see §4. Aggregated per-pod at native build; do not hand-author. | §4 |
| 13 | Android permissions (merged) | **PASS** — introspect merged set: `ACCESS_COARSE_LOCATION, READ_CONTACTS, READ_EXTERNAL_STORAGE, WRITE_EXTERNAL_STORAGE, INTERNET`; `blockedPermissions` strips `CAMERA, RECORD_AUDIO, ACCESS_FINE_LOCATION, READ_MEDIA_IMAGES, READ_MEDIA_VIDEO, WRITE_CONTACTS`. Consistent with a photo-picker-only, coarse-location, contacts app that never uses camera/mic/precise-location. | introspect |
| 14 | targetSdkVersion | **PASS (SDK-54 default) → owner-verify in AAB** — Expo SDK 54 targets Android 15 (API 35), which satisfies Play's Aug-2025 API-35 requirement. Only provable by unzipping the AAB (§6). | SDK 54 default |
| 15 | Play Billing presence & version | **PASS (presence) → owner-verify version in AAB** — `react-native-purchases 10.4.0` pins `com.revenuecat.purchases:purchases-hybrid-common:18.15.1` (confirmed in `node_modules/react-native-purchases/android/build.gradle:124`), which brings in `purchases-android` + Play Billing transitively. **The bundled `com.android.billingclient:billing` version is NOT pinned in the JS package and is resolved only at Gradle build time** — it could not be determined here. Confirm it in the AAB (§6). Only if it resolves to **7.x** does the **2026-08-31** deprecation apply (https://developer.android.com/google/play/billing/deprecation-faq); if 8.x, no action. | `package.json`, `.../build.gradle:124` |
| 16 | 16 KB page size / 64-bit | **PASS (SDK-54 default) → owner-verify in AAB** — RN 0.81 / SDK-54 native libs ship 16 KB-aligned + arm64/x86_64. Only provable by unzipping the AAB (§6). | SDK 54 default |
| 17 | Sentry release / symbol config | **PASS (runtime) → add build secrets** — `App.js Sentry.init` sets `release: halla@<version>`, `dist` from buildNumber/versionCode, `sendDefaultPii:false`, `beforeSend` scrubs email/ip/username. `@sentry/react-native/expo` plugin present. **`npx expo config` emits `[@sentry/react-native/expo] Missing config for organization, project`** → symbol upload at build needs the Sentry EAS secrets in §3. | `App.js`, `app.json` |
| 18 | EAS build profiles | **PASS** — `eas.json` has development / preview / production; production `autoIncrement:true`, iOS `image:"latest"`. | `eas.json` |
| 19 | EAS submit config | **GAP (owner values)** — `eas.json submit.production.ios` still has `REPLACE_WITH_APPLE_ID_EMAIL` / `REPLACE_WITH_APP_STORE_CONNECT_APP_ID` / `REPLACE_WITH_APPLE_TEAM_ID`; Android points at `./play-service-account.json` (not in repo, correct). Owner fills these (§3). Left as explicit placeholders on purpose — not invented. | `eas.json` |
| 20 | ATS (informational) | **NOTE (no change)** — introspect shows `NSAppTransportSecurity.NSAllowsArbitraryLoads:true` (Expo default). App traffic is HTTPS (`https://halaa.com.sa`). Not a blocker, but the owner may tighten ATS before submit; left unchanged this session (needs on-device verification that no plaintext endpoint is hit). | introspect |

### 1a. iOS-permission hardening applied this session (safe, verified) — **[DONE]**

`expo config --type introspect` (the layer Apple review sees) showed **four default-English
placeholder usage strings** injected by plugins for permissions the app **never uses** (verified in
source: no `launchCameraAsync`, no `expo-camera`, no audio recording, only when-in-use map
location). Apple **rejects** apps that declare a permission they don't exercise, and flags
non-localized default strings. Fix applied in `app.json` plugin config (the documented,
introspect-verifiable mechanism — `@expo/config-plugins` `applyPermissions` deletes an
Info.plist key when the option is `false`):

- `expo-image-picker` → added `"cameraPermission": false`, `"microphonePermission": false`
  → removed `NSCameraUsageDescription` + `NSMicrophoneUsageDescription` (and reinforces the
  Android `CAMERA`/`RECORD_AUDIO` blocks).
- `expo-location` → added `"locationAlwaysAndWhenInUsePermission": false`,
  `"locationAlwaysPermission": false` → removed `NSLocationAlwaysAndWhenInUseUsageDescription` +
  `NSLocationAlwaysUsageDescription` (app uses when-in-use only; no `UIBackgroundModes:location`).

**Post-hardening introspect (verified):** iOS `Info.plist` usage strings =
`NSPhotoLibraryUsageDescription`, `NSContactsUsageDescription`, `NSLocationWhenInUseUsageDescription`
(all AR/EN) — nothing else. `expo-doctor` 18/18, `npm test` 33/33, lint 0 all still green.

**Not changed (correctly):** the privacy manifest, ATS, signing/entitlements, and the submit
placeholders — none are verifiable with the tools available here, so per the hardening rule they
are owner/artifact steps below, not edits.

---

## 2. [OWNER] Accounts & credentials required (the exhaustive blocker list)

Nothing below exists in this environment. All are prerequisites for a signed build.

### Apple
- Active **organization** Apple Developer Program membership (D-U-N-S, Account Holder identity).
- **Agreements, Tax, Banking** — Paid Apps agreement **active** (required for IAP).
- Bundle ID **`com.halla.app`** registered with **In-App Purchase** capability (Associated Domains
  capability is driven by `associatedDomains` in the build; confirm it's enabled on the identifier).
- **iOS app record** created **manually** in App Store Connect (name "Halaa", SKU, primary locale,
  bundle id) — Apple does not create app records via API.
- **App Store Connect API key** (`.p8`) with least privilege (App Manager) — record **Key ID** +
  **Issuer ID** only; the `.p8` goes to the secret store / EAS, never the repo.
- **Sandbox tester** account(s) for the billing matrix (§8).

### Google
- Verified **organization** Play developer account + payments profile.
- **App record** created manually for `com.halla.app`, default language approved.
- **Play App Signing** enrolled; record the **app-signing SHA-256** + **upload SHA-256** (needed
  for the Android App Link `assetlinks.json` that backs `autoVerify:true`).
- **Service account JSON** linked in Play Console (least privilege: manage releases/store listing)
  — stored only in the secret store / EAS as a file secret; referenced by `eas.json` as
  `./play-service-account.json`.
- **License testers** + an **internal test track**.

### EAS / Expo
- Expo account that owns project **`petersafwat`** / EAS project id **`d5570c5a-d11b-4716-81d6-108939d72b22`** (already in `app.json extra.eas.projectId`), able to build for iOS + Android.
- `eas-cli >= 18` (matches `eas.json cli.version`).

### RevenueCat (billing prerequisite, not the build itself)
- Production project with the iOS + Android apps, secret API key (server-side),
  **public SDK keys** for EAS (`REVENUECAT_IOS_KEY` / `REVENUECAT_ANDROID_KEY`), and the one
  recurring-access entitlement id. (Full RC setup = MCP-04 / runbook §8.)

### Devices (for §7 QA — cannot be emulated for store-readiness sign-off)
- A current **iPhone**, an **iPad** (portrait + landscape), an **Android phone**, and an
  **Android tablet**. Plus one **minimum-supported-iOS** device if possible.

---

## 3. [OWNER] Register EAS secrets — by NAME only (never paste values)

Set these **before** `eas build`. Use `eas env:create` (or the Expo dashboard). Values live in
EAS, not the repo. `app.config.js` already reads the client-facing ones and omits any that are
unset (so dev builds still work — maps blank, Sentry/RC no-op).

**Build-time / client (consumed by `app.config.js` + Sentry plugin):**
- `GOOGLE_MAPS_API_KEY` — Android Google Maps (restrict to package `com.halla.app` + Maps SDK).
- `SENTRY_DSN`, `SENTRY_ENVIRONMENT` (e.g. `production`).
- `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` — **required for symbol/source-map upload at
  build** (resolves the "Missing config for organization, project" warning). Without these, crashes
  won't symbolicate.
- `REVENUECAT_IOS_KEY`, `REVENUECAT_ANDROID_KEY` — public SDK keys (do **not** reuse production RC
  keys in a Test-Store dev build).
- `EXPO_PUBLIC_API_URL` — already pinned per-profile in `eas.json` (`https://halaa.com.sa/api/v2`).

**Submit-time (fill the `eas.json` placeholders — owner-specific IDs, not secrets but must be real):**
- iOS: `appleId` (Apple ID email), `ascAppId` (App Store Connect app id), `appleTeamId`.
- Android: the `play-service-account.json` file secret (path already referenced).

> Backend-side billing secrets (`REVENUECAT_WEBHOOK_AUTH`, `REVENUECAT_API_KEY`,
> `REVENUECAT_APP_ID`, `REVENUECAT_RECURRING_ENTITLEMENT_ID`, `NATIVE_BILLING_ENABLED=true`,
> `REVENUECAT_ENVIRONMENT=PRODUCTION`, catalog version/hash) live in the **backend** secret manager,
> not EAS — see external runbook §9 / MCP-04. Out of scope for the build itself.

---

## 4. [OWNER] iOS privacy manifest & required-reason APIs — verify, don't author

iOS 17+ requires a `PrivacyInfo.xcprivacy` declaring **required-reason API** usage and tracking/
data-collection. **Do not hand-write `ios.privacyManifests` in `app.json`** — the manifest is
**aggregated at native build** from each pod's own manifest, and guessing reason codes risks a
wrong declaration. Confirmed this session: `@react-native-async-storage/async-storage` ships its
own `ios/PrivacyInfo.xcprivacy`; Expo modules, Sentry, and RevenueCat ship theirs via their
podspecs. The build merges them.

**Deps that use required-reason APIs (declare the reason if the aggregated manifest misses it):**
- **UserDefaults** (`NSPrivacyAccessedAPICategoryUserDefaults`, reason **CA92.1**) — AsyncStorage,
  `expo-secure-store`, `expo-constants`.
- **File timestamp** (`...FileTimestamp`, reason **C617.1** / **3B52.1**) — `expo-file-system`,
  `react-native-view-shot`.
- **Disk space** (`...DiskSpace`, **E174.1**) and **system boot time** (`...SystemBootTime`,
  **35F9.1**) — commonly pulled in by RN core / Sentry.

**[OWNER] step:** after the first iOS build, unzip the IPA and open the aggregated
`PrivacyInfo.xcprivacy` (see §5). If Apple's validation flags a missing required-reason entry, add a
minimal top-level `ios.privacyManifests.NSPrivacyAccessedAPITypes` in `app.json` with **only** the
missing category + its correct reason string, then rebuild and re-verify. Also confirm
**`NSPrivacyTracking` = false** and **`NSPrivacyTrackingDomains` = []** (the app ships **no ad/tracking
SDK** — this is a FACT, see the ASO data-safety worksheet), and that `NSPrivacyCollectedDataTypes`
matches the signed Apple App Privacy worksheet.

---

## 5. [OWNER] iOS signed build + IPA inspection

**Build:**
```
cd halla-mobile
eas build --platform ios --profile production
```
Requires the Apple credentials in §2 (EAS will manage or prompt for the distribution cert +
provisioning profile). Toolchain must be current per
https://developer.apple.com/news/upcoming-requirements/ (Xcode 26+/iOS 26 SDK image — `eas.json`
already pins `ios.image:"latest"`).

**Inspect the resulting IPA (the §3/§4 checklist):**
1. **SDK / toolchain** — build log shows Xcode/iOS SDK version; confirm it meets Apple's current
   minimum.
2. **Version** — `CFBundleShortVersionString` = the release version; `CFBundleVersion` unique/higher
   than any prior ASC build.
3. **Entitlements** — `codesign -d --entitlements :- <App>.app` → confirm
   `com.apple.developer.associated-domains` includes `applinks:halaa.com.sa`, `aps-environment`
   present (push), In-App Purchase enabled. No stray/dev entitlements in a production build.
4. **Associated domains** — the AASA at `https://halaa.com.sa/.well-known/apple-app-site-association`
   must list the **final Team ID + `com.halla.app`** and validate (Apple's associated-domains
   validator / device Universal Link test).
5. **Permission strings** — `plutil -p <App>.app/Info.plist` → confirm **only** the 3 AR/EN strings
   from §1a (no `NSCamera*`, no `NSMicrophone*`, no `NSLocationAlways*`).
6. **Privacy manifest** — open the aggregated `<App>.app/PrivacyInfo.xcprivacy` (see §4); confirm
   required-reason entries, `NSPrivacyTracking=false`, empty tracking domains, and data types match
   the worksheet.
7. **Device family** — confirm iPhone + iPad (`UIDeviceFamily` = [1,2]) given `supportsTablet:true`.
8. **Signing** — `codesign -dv --verbose=4` → Apple Distribution identity, valid team, hardened.

**Process:** upload to App Store Connect / TestFlight (`eas submit --platform ios --profile
production` once §3 IDs are filled). **Do not submit for review** without separate owner approval
(master plan Phase 4 exit is artifact + device evidence, not submission).

---

## 6. [OWNER] Android signed build + AAB inspection

**Build:**
```
cd halla-mobile
eas build --platform android --profile production
```
Produces an **AAB** (production profile has no `buildType:apk` override; `preview` builds an APK for
internal sideloading). Play App Signing must be enrolled (§2).

**Inspect the AAB (the §3/§4 checklist):**
1. **Merged permissions** — `bundletool dump manifest --bundle app.aab` (or unzip → `AndroidManifest`)
   → confirm the merged set matches audit item 13 (no `CAMERA`/`RECORD_AUDIO`/`ACCESS_FINE_LOCATION`).
2. **targetSdkVersion** — confirm **35** (Android 15) in the merged manifest (Play's current
   requirement).
3. **Play Billing Library version** — confirm the **actual** bundled `com.android.billingclient:billing`
   version (a transitive dep via `purchases-hybrid-common:18.15.1` → `purchases-android`; **not
   determinable pre-build**). If it resolves to **7.x**, the **2026-08-31** deprecation applies
   (https://developer.android.com/google/play/billing/deprecation-faq) — plan a bump; if **8.x**, no
   action needed.
4. **16 KB page size / 64-bit** — unzip `base/lib/`; confirm `arm64-v8a` + `x86_64` present (64-bit)
   and native `.so` libraries are 16 KB-aligned
   (https://developer.android.com/guide/practices/page-sizes). Newer `bundletool`/AGP surface a
   16 KB-compat check.
5. **Signing** — verify upload + Play app-signing SHA-256 fingerprints; ensure the app-signing
   SHA-256 is the one in `https://halaa.com.sa/.well-known/assetlinks.json` (backs Android App Link
   `autoVerify:true`).
6. **Version code** — unique/incrementing (`autoIncrement:true` handles this).

**Process:** create an **internal test release** from the signed AAB
(`eas submit --platform android --profile production` targets `track:internal`). Run Play's
**pre-launch report** + device-catalog check. **Do not promote to production** without owner approval.

---

## 7. [OWNER] Device test matrix (physical devices — not emulable for sign-off)

Per master plan Phase 4 exit + Phase 6. Each row → screenshot/video + result.

| Device | Must cover |
|---|---|
| Current **iPhone** | Fresh install; AR + EN first run (RTL via `I18nManager`); signup/login/logout; the RevenueCat purchase sheet (sub + add-on) end-to-end vs sandbox; deep link `halla://` 3DS return + Universal Link `applinks:halaa.com.sa`; photos/contacts/location **allow AND deny** paths; push foreground/background/terminated + logout token removal. |
| **Minimum-supported iOS** iPhone | Launch + core purchase flow (catch API-availability regressions). |
| **iPad** (portrait **and** landscape) | Full layout at `supportsTablet:true` (Apple checks iPad because tablet support is declared); legal screens; purchase sheet. |
| **Android phone** | All of the iPhone row; plus Google subscription **replacement/proration** (upgrade/downgrade/crossgrade) since that is Android-specific (MOB-02); Play pre-launch report clean. |
| **Android tablet** | Layout + core flows. |

Also verify: symbolicated Sentry crash appears with PII scrubbed (release `halla@1.0.0`, correct
`dist`); account-deletion request→status→completion; every public legal/support/deletion URL 200.

---

## 8. [OWNER] Sandbox billing (after store + RevenueCat config)

Dashboard "test events" do **not** prove store lifecycle — run **real sandbox purchases** on device
(Apple sandbox tester / Play license tester). Execute the full matrix in
`store-readiness-BILLING-COMPLETION-PLAN.md` Phase 8 and external runbook §11. Link every test to the
store transaction/order id, the RevenueCat customer/event/product, and the backend
event/payment/subscription/entitlement/add-on ids + before/after quota. This is `SANDBOX_VERIFIED`
territory — **not reached** by any code-only session.

---

## 9. Exact owner command sequence (copy/paste order)

```
# 0. Prereqs: §2 accounts exist; bundle id com.halla.app + Play app record created manually.
# 1. Register EAS secrets by NAME (§3) — values entered interactively, never in a file:
eas env:create --name GOOGLE_MAPS_API_KEY --scope project --environment production
eas env:create --name SENTRY_DSN         --scope project --environment production
eas env:create --name SENTRY_ORG         --scope project --environment production
eas env:create --name SENTRY_PROJECT     --scope project --environment production
eas env:create --name SENTRY_AUTH_TOKEN  --scope project --environment production --type secret
eas env:create --name REVENUECAT_IOS_KEY     --scope project --environment production
eas env:create --name REVENUECAT_ANDROID_KEY --scope project --environment production
# (SENTRY_ENVIRONMENT + EXPO_PUBLIC_API_URL are already set per-profile in eas.json)

# 2. Fill eas.json submit.production.ios REPLACE_WITH_* with the real Apple ID / ascAppId / teamId,
#    and add the Play service-account file secret referenced by ./play-service-account.json.

# 3. Signed builds:
cd halla-mobile
eas build --platform ios     --profile production
eas build --platform android --profile production

# 4. Inspect artifacts per §5 (IPA) and §6 (AAB). Record real SDK versions / entitlements /
#    permission strings / privacy manifest / Billing version / 16KB+64-bit / checksums.

# 5. Process (NOT release):
eas submit --platform ios     --profile production   # → TestFlight
eas submit --platform android --profile production   # → internal track

# 6. Device matrix (§7) + sandbox billing (§8). Then GO-01/GO-02 owner review.
# DO NOT submit for App Store review / promote to Play production without explicit owner approval.
```

---

## 10. What Session 7 did NOT do (and why)

- **No `eas build` / `eas submit`** — no Expo/Apple/Google auth here; would prompt/fail. Documented,
  not forced.
- **No invented artifact evidence** — no build ids, checksums, SDK-inspection output, or
  device-test results were fabricated. Those rows stay `NOT_STARTED` / `BLOCKED_NEEDS_OWNER`.
- **No secret values** written anywhere; only names/placeholders. Tracked secret files untouched
  (SEC-01, owner-gated).
- **No privacy-manifest / signing / ATS edits** — not verifiable with the available tools; moved to
  owner artifact-verify steps (§4–§6).

**End state:** config is build-ready and review-safe as far as static/local tooling can prove
(expo-doctor 18/18, introspect Info.plist clean, gates green). Signed artifacts + device + sandbox
evidence remain **`BLOCKED_NEEDS_OWNER`**.
