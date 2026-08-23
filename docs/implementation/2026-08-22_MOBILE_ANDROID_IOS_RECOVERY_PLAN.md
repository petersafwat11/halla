# Halaa mobile Android/iOS recovery plan

**Audience:** Gemini (implementation owner) and release QA  
**Date:** 2026-08-22  
**Repository scope:** `halaa-mobile/`, mobile-facing API behavior in `halaa-backend/`, and shared localization utilities  
**Status:** targeted diagnosis and reference fixes completed; broad iteration remains blocked on native visual confirmation

## Confirmed findings and completed first fixes (2026-08-22)

These findings replace hypotheses elsewhere in this document when they conflict:

1. **Google Play / RevenueCat:** RevenueCat has the expected 53 Android and 53 iOS product connections and all four offerings. Google Play had 40/40 one-time purchase options in `DRAFT`, while all 13 subscription base plans were already `ACTIVE`. The repository activation script used the wrong Android Publisher endpoint. It now uses `purchaseOptions:batchUpdateStates`, and all 40 one-time options were activated in production. Re-test offerings only after Play propagation, from the Play-installed internal-track build with an eligible tester account.
2. **Purchase error localization:** duplicate top-level `checkout` objects in both plan locale files caused `checkout.iap.reasons.offerings_error` to be overwritten and displayed literally. The duplicate blocks were removed. This source fix needs a new mobile build.
3. **Create-event final error:** production request `19d174f1-bdc4-45cc-9888-c6f1141da135` failed in the API with AWS `InvalidAccessKeyId`. The VPS has an obsolete/nonexistent `AWS_ACCESS_KEY_ID`. This prevents local invitation uploads from being stored.
4. **Predefined-template background:** the protected template asset endpoint reads from the same S3 client and production logs repeatedly show `InvalidAccessKeyId`. This keeps `backgroundReady` false and disables template Save. Relative asset URLs are valid: `resolveMediaUri` expands them against the mobile API base. Restoring this path requires a newly issued AWS IAM key with the bucket permissions already expected by the application; no replacement AWS credential is present in the local provider-secret directory.
5. **Step 3 transition:** validation previously treated template metadata as completion even when the background/bake failed. It now requires a real `templateImage` for both predefined templates and local uploads.
6. **Why Step 1 differs from Step 2:** inherited RTL reverses a `row`. Step 1 placed calendar/clock icons as the first JSX child, which made them leading/right in Arabic and leading/left in English even though they are trailing affordances. Step 2 uses logical child order. Step 1 now places text first and the trailing icon second, preserving Step 2 as the reference behavior.
7. **Reference-screen scope:** Step 1 is the first cross-platform reference correction. It must be visually accepted on one Android device and one iPhone before Gemini applies the same logical-order audit to other screen families. Do not infer visual acceptance from lint or static tests.
8. **Step 1 label regression:** React Native mirrors physical text-alignment values in native RTL. `textAlign: "left"` behaves as logical start (left in English, right in Arabic), while `"right"` behaves as logical end. The remediation returned `"right"` for Arabic labels, so Android placed them on the left. Step 2 mostly retained native/logical-start behavior and therefore remained correct. The shared field resolver now uses logical-start `"left"` for localized labels and logical-end `"right"` for counters.

## Authoritative mobile direction contract

Apply this contract to every screen family; do not invent per-screen mirroring rules:

1. The selected application locale is the source of truth. `LanguageProvider` synchronizes it with native `I18nManager`; when the native direction changes, reload the current bundle before rendering the app in the new language. Never render a new root `direction` over a stale native direction.
2. Keep `supportsRTL: true` and Arabic/English native locales in the Expo localization plugin.
3. Localized UI text aligns to **logical start** using `textAlign: "left"`. React Native maps that to physical left in LTR and physical right in RTL. Do not calculate `isRTL ? "right" : "left"` for localized labels.
4. Logical-end text uses `textAlign: "right"` in both locales. Centered text stays centered. Use `writingDirection` only for the Unicode/base direction of the content, not to place a view.
5. Use `marginStart`, `marginEnd`, `paddingStart`, `paddingEnd`, `start`, and `end`. Physical left/right values are allowed only for genuinely physical geometry and must be documented.
6. Keep row JSX in semantic order: leading content first, flexible content next, trailing action last. A normal `row` follows native layout direction; do not combine it with a locale-conditioned `row-reverse` unless the business order itself must reverse.
7. Flip only directional glyphs such as back/forward arrows. Do not flip neutral icons such as calendars, clocks, maps, locks, search, or close.
8. Treat phone numbers, emails, URLs, codes, currency tokens, and mixed Arabic/Latin strings as bidi islands. Their `writingDirection` can be LTR while their field label remains localized logical-start.
9. Shared primitives own label, helper, error, input, counter, icon-slot, and modal direction. Screens supply semantic content and order; they must not reimplement the direction algorithm.
10. A screen is accepted only after Arabic and English are viewed on both Android and iOS, including keyboard-open and large-font states. Static source checks are guardrails, not visual proof.

This plan supersedes `MOBILE_RTL_IOS_CROSS_APP_REMEDIATION_PLAN.md` and the historical `halaa-mobile/RTL_ALIGNMENT_REPORT.md` for release decisions. Those documents and their static tests are useful evidence, but they are not proof that the native UI works. The current suite passes 187 tests while the August 22 production Android screenshots still show severe visual and functional failures.

## 1. Recovery objective

Ship one native build in which:

1. RevenueCat offerings resolve and the purchase action becomes enabled for an eligible signed-in tester on Google Play and TestFlight.
2. A protected visual-template background loads, is visibly present in the editor, is baked into a non-blank PNG, and is uploaded.
3. A host can create an event from Step 1 through the success screen without a generic server error.
4. Every reachable page, modal, sheet, carousel, input, header, footer, and navigation surface renders correctly in Arabic RTL and English LTR on both Android and iOS.
5. Existing visually successful surfaces remain visually stable. This is a recovery and consistency project, not an unsolicited redesign.

Do not run another production `eas build --auto-submit` until all P0 exit gates in this plan pass on signed internal builds. Updating the VPS cannot repair direction or RevenueCat configuration embedded in a native binary.

## 2. Evidence from the supplied screenshots

Treat the screenshots as observed outcomes, not as implementation instructions.

| Screenshot(s) | Observed result | Recovery classification |
|---|---|---|
| 1 | Purchase CTA disabled; `checkout.iap.reasons.offerings_error` leaks into UI and wraps badly in the sticky footer | P0 billing + P1 layout/localization |
| 3, 5, 6, 7 | Create-event steps have inconsistent header/action placement, clipping, overlapping preview action, and card/flow problems | P0 flow + P1 direction/layout |
| 8, 9 | Guest/staff Step 2 is the strongest create-event Android baseline | Preserve and cross-check on iOS |
| 10 | Local-image upload mode reaches final submission, then event creation returns a generic error with request ID `19d174f1-bdc4-45cc-9888-c6f1141da135` | Independent P0 multipart/API diagnosis |
| 11 | Host home/dashboard is a strong Android baseline | Preserve and cross-check on iOS |
| 12, 13 | In predefined-template form mode, the protected backend background is blank, Save is disabled, and `تعذر إنشاء صورة القالب` is shown | Independent P0 authenticated media/render/bake diagnosis |
| 2, 4, 14–20 | Complaint form/list, account settings, events, event details, marketplace, vendor profile, add-ons, and bottom navigation are useful Android visual baselines | Preserve; they are not yet iOS-certified |

There are **two separate Step 3 defects** and they must not be collapsed into one root cause:

1. **Local upload mode:** a local image can be selected and the wizard reaches final submission, but event creation fails. Diagnose its multipart upload/API path using the request ID.
2. **Predefined-template form mode:** the mobile client does not successfully load/decode the protected original image from the backend, so `backgroundReady` remains false and Save is disabled. Diagnose its authenticated asset path and native canvas path.

There is also a shared state-machine defect: Step 3 currently accepts a template ID as valid even when its background did not load and no baked `templateImage` exists. This can allow an invalid predefined-template state to advance. Fix that transition, but do not assume it explains the independent local-upload final-submit failure.

## 3. Non-negotiable execution rules

1. **Freeze unrelated UI work.** No new features, styling refreshes, or broad refactors until P0 is green.
2. **One issue, one evidence trail.** Every fix records reproduction, root cause, files changed, automated tests, Android result, and iOS result.
3. **Do not mass replace `row`, `row-reverse`, `left`, or `right`.** JSX order and component intent must be reviewed together.
4. **Do not use static source tests as visual proof.** They remain guardrails only.
5. **Do not weaken store compliance.** Native prices must come from App Store/Google Play packages; never enable purchase with a backend SAR fallback.
6. **Do not let the event wizard advance with an invalid image/template state.** A selected card is not the same as a successfully loaded and baked design.
7. **Do not mask backend errors.** User copy may be friendly, but status, code, validation errors, and request ID must be retained in privacy-safe diagnostics.
8. **Do not auto-submit a build.** First produce internal Android and iOS candidates, execute the matrix, then submit the exact tested artifacts.

## 4. Workstreams and order

Execute in this order. P0 workstreams A–C may be investigated in parallel, but none may skip its exit gate.

1. Phase 0 — freeze, reproduce, and capture runtime evidence.
2. Workstream A — restore native purchase readiness.
3. Workstream B — make template backgrounds and baked output deterministic.
4. Workstream C — repair the create-event API contract and state machine.
5. Phase 1 — prove one cross-platform direction authority in a native lab.
6. Phase 2 — repair shared screen primitives.
7. Phase 3 — audit every reachable screen family and transient state.
8. Phase 4 — automate visual and end-to-end regression coverage.
9. Phase 5 — signed release-candidate matrix, staged rollout, and monitoring.

## 5. Phase 0 — freeze and runtime evidence

### 5.1 Identify the exact artifacts

Record:

- Git SHA embedded in the installed Android application.
- Android `versionCode`, package name, Play track, and install source.
- iOS build number and TestFlight group when iOS testing begins.
- Backend `IMAGE_TAG` currently deployed on the VPS.
- Whether the tester is signed into the store and is enrolled in the relevant internal test.

Add a development/support diagnostics screen that shows only non-secret state:

- app version/build/Git SHA;
- API base URL;
- platform and locale;
- `I18nManager.isRTL` and chosen language;
- RevenueCat SDK present, platform key present/matches prefix, configured, and identified booleans;
- catalog query status/count;
- offerings query status, offering IDs, package count, and sanitized error code/message;
- selected plan code and purchase-readiness state;
- last template asset HTTP status/content type/cache URI;
- last event-create HTTP status, backend code, validation paths, and request ID.

Never show or log keys, bearer tokens, receipts, phone numbers, emails, guest data, or full RevenueCat customer objects.

### 5.2 Retrieve the existing event failure

On the VPS, search the API logs using the screenshot request ID:

```bash
cd /opt/halaa
docker compose logs api --since 48h 2>&1 | grep -F "19d174f1-bdc4-45cc-9888-c6f1141da135"
```

If log rotation removed it, reproduce once with a new unique event name and immediately capture the new request ID. Record the full server exception class, status, backend code, and validation paths. Do not guess from the generic alert.

### 5.3 Baseline captures

Capture the same seeded data on:

- Android Arabic and English;
- iOS Arabic and English;
- compact phone and standard phone widths;
- keyboard closed/open for form screens;
- font scale 100% and at least 130%;
- light mode (the current product theme) and any supported system appearance behavior.

Use a signed development/internal build, not Expo Go.

### 5.4 Recover the last known-good Android baseline

Do not begin by restyling 330 modules. First locate the exact Android build/Git SHA that the owner confirms was visually correct before the direction remediation. Then:

1. install/capture that build and the current build on the same Android device with the same data;
2. inventory the commits that changed direction behavior, especially the native `I18nManager` introduction and the later cross-app remediation commit;
3. generate a file/line change map for those commits;
4. create a diagnostic build from current code with only the global direction-authority experiment changed;
5. use the three-way evidence (known-good, current, diagnostic) to distinguish global-authority failures from bad component migrations;
6. use the known-good build as the Android visual reference, not as a blind code rollback—later billing, security, API, and functional fixes must be preserved.

This comparison decides whether the fastest safe path is a selective revert of direction-only edits followed by controlled re-migration, or retaining the edits and correcting the global authority. Do not guess.

**Phase 0 exit:** artifact identity and privacy-safe runtime diagnostics are available, and each P0 failure has a reproducible state/code rather than only a screenshot.

## 6. Workstream A — native purchase readiness

The screenshot proves the current terminal state is `offerings_error`; the disabled button is a safety response, not the root defect.

### A1. Verify build-time configuration

1. Set `"environment": "production"` explicitly on the EAS production profile, then confirm `REVENUECAT_ANDROID_KEY` and `REVENUECAT_IOS_KEY` exist in the EAS **production environment**, not only in a local shell or the VPS. Expo can infer the environment for store builds, but making it explicit removes build-profile ambiguity.
2. Confirm the evaluated `app.config.js` for each EAS job contains a non-empty platform key with the correct `goog_` or `appl_` prefix. Do not print the value.
3. Confirm `com.halaa.app` is the package/bundle ID in EAS, RevenueCat, Play Console, and App Store Connect.
4. Confirm `billingUserId` is present before `initPurchases()` and remains stable across logins.
5. Enable RevenueCat debug logging only in an internal build and capture the actual `getOfferings()` failure code.

### A2. Verify Google Play delivery conditions

For the Android artifact shown in the screenshots:

1. It must be installed from the Google Play internal-test opt-in flow, not sideloaded.
2. The tester Google account must be licensed/enrolled and the internal release available in the tester's storefront.
3. Every referenced subscription/product must be active, available in Saudi Arabia, and attached to valid base plans/offers.
4. The Play package name and signing lineage must match the application connected to RevenueCat.
5. RevenueCat must have valid Play service credentials and import the products without errors.
6. Offerings `host_plans`, `business_plans`, `host_addons`, and `business_addons` must contain the exact package lookup keys returned by `/payments/revenuecat/catalog`.

The fix is whichever failed condition the SDK debug log identifies. `getOfferings()` only succeeds when the RevenueCat app/key, package name, store product IDs, Play product/base-plan activation, country availability, RevenueCat Play credentials, offering/package mapping, and tester/store installation all agree. Changing the VPS is not part of this store-to-device product lookup.

Repeat the equivalent App Store agreement, product availability, StoreKit credential, TestFlight, and sandbox-account checks for iOS.

### A3. Improve readiness behavior without hiding failures

1. Keep the fail-closed CTA.
2. Never render an i18n key. Add a guaranteed localized fallback for every readiness state and test missing-key behavior.
3. Show a short reason and a real Retry action for transient catalog/offerings failures.
4. Log sanitized RevenueCat error code/message and whether the installed app came from a store-capable environment.
5. Refresh offerings on app foreground and after Retry; prevent concurrent retries.
6. Distinguish configuration, tester/store availability, empty offerings, package mismatch, and network failures in diagnostics.

### A4. Billing acceptance tests

For both stores, prove with an eligible test user:

- offerings load;
- selected plan maps to exactly one package;
- localized store price renders;
- CTA enables;
- purchase sheet opens;
- cancel is non-error;
- success reconciles the exact transaction;
- subscription/event/add-on entitlement appears after refresh;
- restore works for restorable products and does not claim consumables are restorable;
- airplane/offline mode gives a retryable error without enabling the CTA.

**Workstream A exit:** a signed Play internal build and TestFlight build each reach `READINESS_STATES.READY` and complete one sandbox purchase/reconcile flow.

## 7. Workstream B — deterministic template background and bake

Relevant current files include:

- `components/createEvent/StepThree.js`
- `components/shared/TemplatePreviewCanvas.js`
- `components/home/EventTemplates.js`
- `components/home/_components/TemplateCard.js`
- `utils/resolveMediaUri.js`
- `utils/canvasBake.js`
- backend template list/asset route and S3 proxy

### B1. Prove the asset boundary

For the exact selected template, capture:

- returned `imageUrl` and `thumbnailUrl` shape without credentials;
- resolved URL;
- request HTTP status;
- response `Content-Type` and byte length;
- whether Authorization and `X-Client: mobile` are present;
- whether original fails while thumbnail succeeds;
- Android and iOS native image error messages.

Test the original asset endpoint with the same authenticated user used by the app. A working thumbnail card does not prove the original bake background works.

### B2. Use one authenticated media loader

Create one shared template-asset loader used by the card, modal canvas, preview, and bake path. It must:

1. normalize absolute, `/api/v2/...`, relative S3/application, bundled numeric, and local `file://` sources;
2. attach auth headers only to trusted Halaa HTTPS URLs;
3. validate 2xx status and image MIME type;
4. materialize protected remote originals to a local cache file before baking when native remote-image capture is unreliable;
5. expose `idle/loading/ready/error`, source variant, HTTP status, and retry;
6. use the thumbnail only as a visible fallback, never silently bake a blank surface;
7. invalidate stale state when the selected template changes;
8. clean bounded cache entries safely.

### B3. Make canvas readiness deterministic

1. Track readiness per source generation so an old image's `onLoad` cannot mark a new template ready.
2. Require non-zero layout dimensions and successful background decode.
3. Wait for the image and fonts to settle before capture (at least the next native render frames).
4. Keep the capture view mounted, non-collapsable, and fully inside a native view hierarchy supported by `react-native-view-shot`.
5. Capture at the template aspect ratio with bounded output dimensions; do not request unsafe enormous natural dimensions.
6. Validate the captured file exists, has a non-trivial byte size, decodes, and is not a near-uniform blank image.
7. Surface a Retry action and the sanitized asset failure reason. Do not leave Save permanently disabled with no recovery path.

### B4. Template acceptance tests

Test at least:

- one JPEG original;
- one PNG original with transparency;
- one WEBP original;
- a protected remote template;
- a bundled fallback template;
- user-uploaded image mode;
- slow network, expired token/refresh, 401, 404, and offline retry;
- Arabic and English field data, Cairo font variants, date/time, color, and mixed-script text.

The automated bake test must inspect the PNG, not only assert that `captureRef()` returned a URI. Compare dimensions and sample/checksum pixels so a gray/white blank bake fails.

**Workstream B exit:** on real Android and iOS, the exact background is visible in the editor, Save enables only after readiness, the baked PNG visibly contains the background and overlays, and the uploaded event preview uses that PNG.

## 8. Workstream C — create-event state machine and API contract

### C1. Stop invalid Step 3 transitions

Current `validateStepData(3)` is too weak. Replace it with mode-aware validity:

- predefined template mode requires a valid object ID, all required dynamic fields valid, a ready background, and a successfully baked local `templateImage`;
- custom upload mode requires a decodable local image and no stale predefined template reference;
- any load/bake error makes Step 3 invalid and keeps the user on Step 3;
- switching template/mode clears stale field values, bake, and error state atomically.

Do not initialize the wizard to `{ isCustomUpload: true }` unless the UI is actually in upload mode with an uploaded image. The form state and visible mode must never disagree.

### C2. Define one multipart payload contract

Build and test one serializer shared by host and admin creation. It must produce:

- `eventDetails` JSON;
- normalized `guestList` and `staffList` JSON;
- canonical `visualTemplate` JSON;
- canonical `taqnyatTemplate` JSON;
- `guestReplies` JSON;
- scalar `invitationType`;
- `launchSettings` JSON;
- exactly one valid `templateImage` part when the selected mode requires it;
- admin target fields only in admin mode.

Validate client-side against the shared schema before creating `FormData`. Map schema paths to the owning wizard step and focus that step instead of sending a bad request.

### C3. Diagnose and fix the actual server exception

Use the request ID evidence from Phase 0. Likely checkpoints, each requiring explicit tests, are:

- event date floor and timezone parsing;
- subscription and guest capacity;
- template ObjectId validity;
- required template field values;
- invitation type vs approved Taqnyat template compatibility;
- image upload/S3 result;
- business-logo snapshot;
- Mongoose validation.

Return stable 4xx codes and `errors[]` for user-correctable failures. A validation failure must not become “Something went wrong.” Unexpected 5xx errors retain the request ID and go to Sentry/server logs.

### C4. End-to-end event scenarios

Run on both platforms and languages:

1. predefined visual template + reply/QR invitation;
2. predefined visual template + text-only invitation if supported;
3. custom uploaded design;
4. minimum one guest;
5. guest list near plan capacity;
6. immediate and scheduled launch;
7. trial vs paid date-floor boundaries;
8. host creation and admin-on-behalf creation;
9. retry after a server/network failure without duplicate events;
10. reopen created event and verify template, message, guests, date/time, and location.

**Workstream C exit:** a real signed Android and iOS build creates and reopens an event for each supported visual-template mode, with the exact uploaded image and no generic error.

## 9. Phase 1 — choose and prove one direction authority

The current app mixes native `I18nManager.forceRTL()` with a root `direction` style and a large history of manual mirroring. Before editing all pages, build a native direction lab and empirically choose one model.

### 9.1 Direction-lab cases

The lab must capture, on Android and iOS in Arabic and English:

- plain row with ordered children A/B/C;
- `start/end`, `marginStart/marginEnd`, and intentionally physical left/right anchors;
- stack header, bottom tabs, modal, React Native `Modal`, action sheet, toast, and alert;
- TextInput placeholder/value for localized, phone, email, OTP, price, and mixed text;
- horizontal ScrollView/FlatList initial index and arrows;
- absolute FAB and sticky footer;
- date/time picker and keyboard avoidance.

### 9.2 Preferred production policy (confirm in the lab)

Use native `I18nManager` as the single global layout authority because it reaches native navigation and modal roots. Then:

1. remove the redundant root `direction` override from `App.js`;
2. apply the stored language before rendering app navigation;
3. if native direction differs, force the new direction and perform a real app reload before showing screens;
4. consider `swapLeftAndRightInRTL(false)` and logical style properties so physical anchors do not silently swap; adopt only after the lab proves it on both platforms;
5. use `isRTL` conditionals only for direction-bearing glyphs and proven platform-specific carousel/index behavior;
6. use JSX in semantic reading order with `flexDirection: "row"` after reviewing that component's meaning;
7. never use `row-reverse` as a general Arabic fix.

If the lab disproves this policy, document the alternative and its behavior for native modal/navigation roots before migrating screens. Never leave two authorities active as a fallback.

### 9.3 UI direction contract

- Arabic logical start is right; English logical start is left.
- A standard header has `startAction`, title, and `endAction`; back belongs at start and points toward the previous physical edge, while close/secondary actions use their documented role.
- Form labels and localized prose align to logical start.
- Email, URL, phone values, OTP, card data, IDs, store prices, and raw time tokens retain LTR glyph order and use Unicode isolation when embedded in Arabic sentences.
- Footer actions use semantic order: secondary/cancel at start, primary/save at end.
- Bottom-tab route order is semantic and mirrors through the navigation system, not by manually reversing arrays.
- FABs declare whether they are logical-end or intentionally physical; no ambiguous `right: 20` remains.
- Decorative template coordinates are physical canvas coordinates and must not mirror with UI language.

**Phase 1 exit:** four direction-lab screenshot sets are approved and the selected authority is documented in code/tests.

## 10. Phase 2 — repair shared primitives first

Build or consolidate these primitives before screen-by-screen work:

1. `AppScreen` — safe area, background, status bar, keyboard behavior, scroll ownership, and bottom-tab inset.
2. `AppHeader` — semantic start/end actions and direction-aware back icon.
3. `StickyActionBar` — safe bottom inset, keyboard behavior, no content overlap, primary/secondary ordering.
4. `AppModal` / `BottomSheet` — safe areas, header, close action, scroll, keyboard, max height.
5. `AppText` — localized/mixed/LTR token roles with correct Cairo variants and line heights.
6. `AppInput` family — localized, phone, LTR, RTL, password, text area, dropdown, date/time, map, OTP, and validation states.
7. `DirectionalIcon` — one resolver for back/forward/chevrons/arrows.
8. `HorizontalList` — one tested RTL index/offset strategy per platform.
9. `AsyncState` — loading, retryable error, terminal error, empty state, and accessibility announcement.
10. `FloatingAction` — safe-area/bottom-tab aware logical placement.

Each primitive needs Storybook-like/dev fixtures or deterministic screens covering Arabic/English, Android/iOS, long strings, font scaling, errors, disabled state, loading, and keyboard.

Do not change the visual identity unnecessarily. Preserve the current Halaa palette, Cairo typography, rounded cards, and the successful Android references. The design risk worth taking is disciplined semantic layout: every component declares intent (`start`, `end`, `localized`, `ltrToken`) instead of accumulating physical patches.

**Phase 2 exit:** shared primitive fixture screenshots pass on four platform/language combinations before consumers migrate.

## 11. Phase 3 — complete screen-family audit

The repository currently contains 77 JavaScript modules under `screens/` (including helper/chart modules) and 253 component modules. Build a reachable-route manifest from `AppNavigator.js`, `AdminNavigator.js`, nested stacks, deep links, and modal entry points. Dead screens are removed or explicitly excluded; they are not silently counted as tested.

This does **not** mean manually rewriting every file. Execute the audit as follows:

1. certify the shared direction/screen primitives first;
2. traverse only the reachable route graph for each role;
3. exercise each screen's component tree through seeded states, so ordinary child components are covered through the page that uses them;
4. directly audit only shared primitives and direction-sensitive children such as headers, lists, carousels, modals, inputs, sticky bars, charts, and absolute controls;
5. compare Android against the confirmed last-known-good build and reject any unnecessary regression;
6. establish iOS behavior from real captures rather than assuming the Android fix mirrors correctly;
7. migrate and approve one screen family at a time—never another repository-wide search-and-replace batch.

The practical result is a page-by-page recovery queue with shared fixes applied once, not 330 isolated styling tasks.

For every row below, test default, loading, empty, populated, error, long content, keyboard where relevant, Arabic, English, Android, and iOS.

| Family | Surfaces to certify | Family-specific checks |
|---|---|---|
| First run | language selector, welcome/onboarding pages | native direction applied before navigation; safe areas; page dots/arrows; no restart into mixed direction |
| Host auth | login variants, OTP, signup/role selection, forgot/reset, complete profile, force-password change | localized placeholders; phone/email/password LTR rules; keyboard; validation and footer reachability |
| Vendor auth | vendor signup steps 1–6 and summary | stepper order, uploads, commercial fields, social URLs, keyboard and long validation copy |
| Host home | dashboard, event hero/actions, notifications entry and menus | preserve screenshot 11; notification badges; carousel/dropdown directions |
| Plans | host plans, business plans, current plan, features, add-ons selector | card order, price isolation, chips, horizontal content, unavailable/loading/error states |
| Checkout | plan summary, add-on purchase, legal links, restore/manage, status modal | Workstream A; sticky footer; reason wrapping; store sheet; safe bottom inset |
| Payments | payment history, details/return/poll states | LTR IDs/amounts/dates; success/pending/failure; back behavior |
| Events list | stats, search, filters, cards, export, FAB | preserve screenshot 14; chip scrolling; empty/error; FAB does not cover last card |
| Create event Step 1 | name/type/date/time/map | pickers, dropdown arrows, mixed address, safe header/footer, compact-height keyboard |
| Create event Step 2 | guests/moderators, tabs, quota, import/export, contacts sheets | preserve screenshots 8–9; phone LTR; list actions; safe-area sheets; capacity errors |
| Create event Step 3 | template catalogue, editor, upload, preview, bake | Workstream B; carousel index/arrows; mode state; no advance on failure |
| Create event Step 4 | invitation type cards, approved message, auto replies, preview | no clipping as in screenshot 6; selected state; long Arabic text; preview action never overlaps fields |
| Create event Step 5 | summary, review checkbox, final submit/error/success | no clipped content/overlays as in screenshot 5; Workstream C; return to failing step on validation |
| Update event | wrapper plus Steps 1–5 and live-event gates | same primitives/contracts as create; saved template restoration; locked/add-only states |
| Event details | action panels, RSVP stats, quotas, reminders, schedule/manage menus | preserve screenshot 15; mixed date/time/location; sticky/bottom content |
| Post-event | host post-event, manage content, media upload, messaging template, interactions | media grids, sheets, publish states, keyboard, long comments |
| Tickets | list, create complaint modal, detail, attachment viewer, rating, delete | preserve screenshots 2/19/20; chip wrapping, sticky actions, file previews, status strings |
| Marketplace | catalogue, search/filter sheet, vendor profile, service cards/contact actions | preserve screenshots 16–17; carousel/gallery; price/location LTR tokens; sticky contact bar |
| Host settings | settings, account, password, email verification, notification preferences | preserve screenshot 4; field direction, success badges, destructive actions, partial mutation errors |
| Vendor workspace | vendor home, services list/create/edit, settings, account setup | dashboards, tag/filter chips, image/pricing inputs, URLs/phones, modal footers |
| Notifications | list, item actions, notification settings | timestamp isolation, swipe/action placement, empty/error states |
| Legal | Privacy, Terms, Community Rules, Refund, Deletion, Support | section order, mixed English/Arabic punctuation, links, font scaling, no duplicate badge |
| Guest invitation | invitation landing, RSVP, QR/status/error/expired states | unauthenticated direction bootstrap, mixed event data, physical QR unaffected by RTL |
| Staff portal | login, guest list/search, check-in, QR modal | phone/code LTR, scan/QR geometry, list actions, offline/retry states |
| Admin dashboard | dashboard stats/charts/recent data/top vendors | chart axes/legends are intentional, not auto-mirrored accidentally; tablet and compact widths |
| Admin hosts/businesses | lists, filters, detail, add/edit/plan modals | server pagination, form direction, action menus, money/IDs |
| Admin moderators/vendors | lists, details, add/rating/status modals | same list/modal contract; long category/location text |
| Admin events | list, filters, details, create-on-behalf, update | target selection, host identity, full Workstream C scenarios |
| Admin tickets | list, bulk actions, detail, assign/resolve modals | selection/checkmark order, bulk bar, attachments, status transitions |
| Admin payments/plans/discounts | lists, detail, edit/create forms, tabs | amounts/codes/IDs LTR; table/card order; destructive/disabled states |
| Admin more/settings | more menu, account, notifications, legal links | route arrows, permission-dependent items, nested back behavior |
| Transient UI | toasts, alerts, menus, popovers, modals, sheets, loading/error boundaries | separate native roots inherit correct direction; no raw translation keys; no off-screen actions |

For every migrated surface, record a four-cell result: Android AR, Android EN, iOS AR, iOS EN. “Looks good on Android” is not a pass for iOS.

**Phase 3 exit:** the reachable-route manifest has no untested route or transient state, and approved baseline screenshots have no unintended visual changes.

## 12. Phase 4 — regression automation that can catch these failures

The current direction test proves that files/flows exist; it does not prove screenshots are correct. Replace presence-only confidence with executable evidence.

### 12.1 Component and contract tests

Add tests for:

- chosen direction bootstrap and mandatory reload behavior;
- semantic header/footer action order;
- input direction roles and mixed-script isolation;
- template asset URL/auth/cache/error state machine;
- canvas readiness generation and non-blank PNG validation;
- Step 3 mode-aware validity;
- multipart serializer contract against backend parser/schema;
- backend 4xx codes for every user-correctable create-event failure;
- purchase readiness mapping and guaranteed localized fallback.

### 12.2 Native visual tests

Expand `.maestro` beyond `DirectionVisualTestScreen`:

1. Build deterministic fixture routes for each screen family with seeded local data and controlled async states.
2. Capture Android/iOS × Arabic/English goldens at standard and compact widths.
3. Compare pixels with bounded platform-specific thresholds and explicit masks only for timestamps/system bars.
4. Fail on clipping, off-screen controls, raw i18n keys, overlap, or direction inversion.
5. Store diff images as CI artifacts for review.

At minimum, the release-blocking visual suite must cover host home, events list, create Steps 1–5, template editor, checkout, account settings, ticket modal/list, marketplace, vendor profile, and one admin list/detail/modal.

### 12.3 Native end-to-end tests

Use a test backend/account with resettable seed data. Automate:

- sign in;
- select a plan and reach purchase-ready state (actual purchase remains controlled sandbox);
- create an event with a real protected template and baked image;
- reopen it;
- submit a complaint;
- navigate every bottom tab and verify no crash.

**Phase 4 exit:** CI executes real native screenshot flows and contract tests; a source-only change that reproduces the August 22 failures would fail CI.

## 13. Phase 5 — release candidate and rollout

### 13.1 Device matrix

Required minimum:

- Samsung/Android device matching the supplied screenshots;
- stock Android emulator/device at compact and standard widths;
- small iPhone/SE-class width;
- current standard/Dynamic-Island iPhone;
- iPad portrait and split width if tablet is supported.

Run Arabic and English, font scale 100% and 130%, keyboard open/closed, clean install, upgrade install, logout/login, and language switch/restart.

### 13.2 Release gates

All must be true:

- Workstreams A, B, and C exit gates pass on signed Android and iOS builds.
- Reachable-route matrix is complete.
- No P0/P1 visual defect remains.
- Lint/unit/contract/visual/E2E suites pass.
- Crash-free smoke session is complete.
- Store price/package mapping is captured for tested plans/add-ons.
- Backend/API image tag and mobile Git SHA are recorded.
- The exact tested artifacts, not a rebuilt approximation, are promoted/submitted.

### 13.3 Staged rollout

1. Internal testers only.
2. Closed testing/TestFlight with monitoring.
3. Small production staged rollout.
4. Expand only if purchase readiness, event creation, template load/bake, crash rate, and API 5xx metrics remain healthy.

Prepare rollback instructions for backend image tag and stop/pause controls for the mobile rollout. A mobile binary itself cannot be instantly rolled back for every installed user, so feature flags/fail-safe server behavior must remain compatible with the prior app version.

## 14. Gemini implementation ledger template

For each task, append:

```text
Task ID:
Observed reproduction:
Root cause proved by:
Files changed:
API/store configuration changed:
Automated tests:
Android AR:
Android EN:
iOS AR:
iOS EN:
Screenshots/artifacts:
Known limitations:
Reviewer:
```

Gemini must not mark a task complete with “tests pass” alone. Completion requires the platform/language evidence appropriate to the task.

## 15. Definition of done

This recovery is done only when a user can, on both Android and iOS in Arabic and English:

1. navigate every role-reachable screen without mirrored, clipped, overlapping, or off-screen UI;
2. view correct mixed Arabic/Latin text and direction-bearing icons;
3. purchase an eligible sandbox plan/add-on through the native store;
4. load and customize a protected design with its real background;
5. save a non-blank baked image;
6. create and reopen the event successfully;
7. receive actionable localized errors with a reference ID when a true failure occurs.

Anything less is an incomplete recovery and must not be auto-submitted as production.
