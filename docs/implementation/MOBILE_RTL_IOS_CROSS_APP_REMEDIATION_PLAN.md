# Halaa mobile cross-app RTL, iOS, localization, and checkout remediation plan

**Audience:** Gemini or another implementation agent working in `halaa-mobile/`  
**Plan date:** 2026-08-20  
**Scope:** React Native mobile application only, plus shared locale/legal utilities where mobile consumes them  
**Source of truth:** the current repository, not the wording of the screenshot diagnosis

## 1. Execution directive

Implement this plan in order. Treat the supplied screenshots and Gemini notes as defect reports and reproduction clues, not as authoritative root-cause instructions. Before changing a component, reproduce or prove the code path in the current branch. Several screenshots came from an older UI revision, while several underlying patterns still exist in current code.

Do not patch each screenshot independently. Fix the shared primitive or shared renderer first, then migrate its consumers. In particular:

- All six in-app legal documents use `screens/legal/LegalScreen.js`; repair that renderer once.
- Inputs must converge on shared direction-aware behavior rather than receiving one-off iOS styles.
- Dates, numbers, counts, plurals, and addresses must converge on shared locale utilities.
- The purchase UI must remain fail-closed when the store price/package is unavailable. Never substitute a backend SAR price for an App Store or Google Play price.
- Do not mutate App Store, Google Play, or RevenueCat configuration merely because the checkout says “Unavailable.” Repository evidence records provider-level zero drift. Diagnose build keys, tester/store availability, query state, and runtime package resolution first.

After every phase, run:

```powershell
cd D:\halla\halaa-mobile
npm run lint
npm test
```

Keep a short implementation ledger in the PR description or a sibling progress document. Record the files changed, device/build tested, Arabic and English results, and any external blocker.

## 2. Confirmed architecture and current findings

### 2.1 Global direction model

The application currently has two aligned direction mechanisms:

- `App.js` sets the root view’s `direction` from `LanguageProvider`.
- `localization/providers/LanguageProvider.js` applies `I18nManager.forceRTL()` in native builds and requires a relaunch when direction changes.

Therefore, a normal `flexDirection: "row"` already lays out from logical start to logical end. Adding `row-reverse` for Arabic reverses it a second time. Keep the root direction model; remove component-level fake RTL unless a component has a documented, tested exception such as a horizontal virtualization quirk.

The comment in `halaa-mobile/index.js` claiming that the app uses `row-reverse` as the Expo Go fallback is stale and contradicts the current root `direction` implementation. Update or remove that comment during Phase 1.

`halaa-mobile/RTL_ALIGNMENT_REPORT.md` is also a historical report, not proof of the current state. It claims a completed sweep while current `LegalScreen`, shared inputs, and event files still contain the reported patterns. Do not use it as an allowlist; replace it with current generated evidence or clearly mark it superseded when this plan finishes.

### 2.2 Legal pages share one renderer

These screens are thin data wrappers around `LegalScreen`:

- `screens/legal/PrivacyScreen.js`
- `screens/legal/TermsScreen.js`
- `screens/legal/CommunityRulesScreen.js`
- `screens/legal/RefundScreen.js`
- `screens/legal/DeletionScreen.js`
- `screens/legal/SupportScreen.js`

The current `LegalScreen` contradicts its own comments:

- It applies `styles.cardHeaderRtl` with `flexDirection: "row-reverse"` in Arabic, causing the badge/title double-flip.
- It selects `alignEnd`/`alignSelfEnd` for Arabic even though logical `flex-start` is already the right side in RTL.
- It duplicates badge and title when the canonical data uses the same value (for example Privacy and Terms).
- It renders mixed Arabic and Latin legal copy as one plain text run, leaving neutral characters such as parentheses and punctuation vulnerable to BiDi reordering.

One renderer fix must be validated against all six documents in both languages.

### 2.3 Shared input defects are real

`components/commen/MobileInput.js` confirms the iPhone phone-placeholder issue class:

- no explicit localized placeholder direction;
- physical `marginLeft`, `paddingLeft`, and `borderLeftWidth` on the country-code section;
- physical `marginRight` on the icon;
- labels/errors pinned to physical left;
- LTR country code is not direction-isolated;
- `useState` is called inside the `Controller.render` callback, a Rules-of-Hooks violation.

`components/commen/PasswordInput.js` repeats the physical spacing/text alignment and the same hook violation. `TextInput.js` and `TextAreaInput.js` already use the safer pattern of hoisting the controlled field into a real component; use those as the refactor model.

The audit found 125 native `TextInput`/`RNTextInput` render sites across 63 files. Not all need the same direction:

- localized prose/search/name fields follow the app language;
- email, URL, phone, OTP, IDs, card fields, amounts, and stored `H:MM:AM/PM` values remain LTR;
- a phone field needs an Arabic RTL placeholder while empty and stable LTR digits after input begins.

### 2.4 Safe area diagnosis is only partly confirmed

Most current top-level screens already use `react-native-safe-area-context`. The role-selection screen is inside `SignupScreen`, which currently wraps `TopBar` in a top safe area. Do not assume the old screenshot proves that every header lacks safe-area handling.

There are still systemic risks:

- `TopBar.js` adds `StatusBar.currentHeight` even though callers already own the top safe area. On Android this can double-count the inset.
- `screens/auth/VendorSignupScreen.js` and `components/admin-dashboard/events/CreateEventForm.js` import the deprecated React Native `SafeAreaView` rather than the context implementation.
- `LanguageSelector` and `WelcomeWrapper` are not built on the same screen shell.
- `WelcomeWrapper` fixes `height` using module-load `Dimensions.get("window")`, which is brittle on iPad split views and changing status-bar/call-banner insets.

### 2.5 Event issues remain shared and reproducible in current code

- `EventDetailsScreen.js` hardcodes `toLocaleDateString("en-US")` and appends the stored raw time.
- `buildLocationString()` blindly joins `name`, `address`, and `city`, allowing repeated cities.
- `EventListItem.js` hardcodes Arabic labels and `guestCount + " ضيف"`.
- `EventListItem.statsRow` wraps three items at `width: "48%"`, producing the broken two-plus-one grid.
- `EventList.listContent` has only 24 px bottom padding while `EventsScreen` overlays an absolute FAB.
- The long filter chip is given the same `flex: 1` width as short chips and has no one-line strategy.
- The search input has no explicit placeholder direction on iOS.

The blank event avatar shown in an older screenshot is no longer present in the current shared `EventDetailsScreen`; do not reintroduce an avatar merely to patch that screenshot. Event cards already have a real placeholder icon.

### 2.6 Checkout behavior is intentionally fail-closed, but diagnostics are too coarse

`PlansSummaryScreen` and `services/billing/catalog.js` intentionally show “Unavailable” and disable purchase when a store package cannot resolve. That behavior protects store-policy compliance and must remain. The UI currently collapses multiple causes into the same state:

- RevenueCat SDK key missing in the built config;
- user not yet identified to RevenueCat;
- store catalog query loading or failed;
- offerings query loading or failed;
- selected internal plan code absent from the backend store-safe catalog;
- catalog entry not store-eligible;
- RevenueCat offering/package missing;
- product unavailable to the tester/storefront/track;
- valid package with missing display price.

Repository evidence in `docs/evidence/store-readiness/PROVIDER-ZERO-DRIFT.md` records 53 packages and four offerings at zero drift. `eas.json` does not contain RevenueCat keys because they are expected as EAS environment secrets. Diagnose the actual signed build and store/test account before changing catalog mappings.

### 2.7 Audit inventory to drive the sweep

Current static scan totals:

| Pattern | Hits | Files | How to use the count |
|---|---:|---:|---|
| real/comment `row-reverse` text | 7 | 3 | Actual live uses are in `LegalScreen` and `EventTemplates`; comments in `TopBar` are not defects. |
| physical directional spacing/borders | 60 | 37 | Classify; migrate semantic direction, keep symmetric hit slop and intentional physical overlays. |
| hardcoded left/right text alignment | 24 | 18 | Localized fields should be logical; intrinsically LTR data may remain explicitly LTR. |
| direct native text inputs | 125 | 63 | Migrate shared/common surfaces first, then direct inputs by content type. |
| ad-hoc locale date/time calls | 35 | 32 | Replace user-facing calls with shared locale utilities. |
| Arabic literals in component/screen JS | 419 | 52 | Separate `t()` fallback strings from genuinely hardcoded UI; remove the latter. |

High-impact physical-direction files include:

- `components/commen/MobileInput.js`
- `components/commen/PasswordInput.js`
- `components/commen/DatePicker.js`
- `components/commen/DropdownInput.js`
- `components/commen/TimePicker.js`
- `components/auth/RoleSelectionView.js`
- `components/languagePrefrence/LanguageSelector.js`
- `contexts/ToastContext.js`
- `components/admin-dashboard/common/SearchBar.js`
- `components/notifications/NotificationItem.js`
- `components/marketplace/SearchAndFilter.js`
- `components/plans/PaymentMethodSelector.js`

Do not blindly replace every `left` or `right`: absolute overlay anchors, shadow offsets, chart geometry, and symmetric hit slop can be intentionally physical.

## 3. Target technical policy

Apply these rules consistently.

### 3.1 Layout direction

1. JSX child order is logical reading order.
2. Use `flexDirection: "row"`; rely on inherited `direction` for RTL.
3. Use `marginStart`/`marginEnd`, `paddingStart`/`paddingEnd`, `borderStartWidth`/`borderEndWidth`, and `start`/`end` for semantic direction.
4. Keep `left`/`right` only for genuinely physical placement and add a short comment where the intent is not obvious.
5. Directional glyphs use `components/common/DirectionalIonicon.js`; do not hand-code `<`, `>`, `←`, or `→`.
6. Horizontal carousels are audited individually. Do not assume a `ScrollView`’s offset/index behavior mirrors identically on both platforms. Prefer a tested `FlatList` with a documented RTL indexing strategy if necessary.

### 3.2 Text and BiDi

1. Localized prose receives `writingDirection: isRTL ? "rtl" : "ltr"` where the native control does not reliably infer it, especially iOS inputs and centered text ending in punctuation.
2. Do not force physical right alignment for every Arabic `Text`. Use logical layout; set alignment only when the design calls for it.
3. Intrinsically LTR tokens—email, URL, phone, OTP, IDs, prices from the store, and canonical time strings—use LTR direction.
4. Wrap inline LTR runs inside Arabic copy with Unicode isolate marks (`LRI` U+2066 + `PDI` U+2069), not ad-hoc LRM characters scattered through translations. Provide named pure helpers such as `isolateLtr()` and `isolateRtl()` in the shared locale utility.
5. Never reorder source punctuation to compensate for one screenshot. The source remains grammatically correct; direction/isolation controls rendering.

### 3.3 Locale formatting

1. Extend `shared/src/utils/locale.js` rather than adding new screen-local formatters.
2. Add or standardize:
   - `formatDate()`
   - `formatTime()` for both `Date` and stored `H:MM:AM/PM`
   - `formatDateTime()`
   - `formatNumber()` / `formatCount()`
   - `formatPercent()`
   - `formatGuestCount()` or i18next pluralized count keys
   - `formatLocation()` with de-duplication and locale punctuation
3. Use one explicit Arabic digit policy. The current shared utility intentionally emits Arabic-Indic digits for `ar`; use it everywhere rather than mixing raw numbers and localized numbers.
4. Do not use the device’s implicit locale (`toLocaleString()` without a locale) for user-facing content.

### 3.4 Safe areas and keyboards

1. The screen owns safe-area insets; `TopBar` owns only its visual height/content.
2. Standardize on `react-native-safe-area-context`.
3. Remove `StatusBar.currentHeight` padding from `TopBar` after confirming all call sites are inside the screen shell.
4. Build first-run language and onboarding views on the same shell or explicit inset hook.
5. Use `useWindowDimensions()` inside render rather than module-load dimensions for responsive widths/heights.
6. For keyboard forms, use iOS `behavior="padding"`, derive `keyboardVerticalOffset` from actual header height/insets when the keyboard view includes a header, and verify the last field and submit action remain reachable.

## 4. Phased implementation

## Phase 0 — Reproduce and capture a baseline

Do not edit production code in this phase.

1. Build/test real native clients; do not use Expo Go for final RTL or RevenueCat conclusions.
2. Capture the following matrix using the same seed data:

| Platform | Language | Required device class |
|---|---|---|
| iOS | Arabic | Dynamic Island iPhone with an active-call/hotspot style enlarged status area if possible |
| iOS | English | Same device |
| Android | Arabic | API/device matching the screenshots |
| Android | English | Same device |
| iPad | Arabic + English | portrait and split-width if supported |

3. Capture Privacy, Terms, Refund, login phone, signup role, language picker, onboarding slides 1/middle/last, event list, event details, and checkout.
4. For checkout, record non-secret readiness facts only: platform, app version/build number, API key present boolean, billing user ID present boolean, catalog query status/count, offerings query status/IDs, selected internal code, expected offering ID/package lookup key/product ID, resolution reason, and store price presence. Never log keys, receipts, phone/email, or full RevenueCat customer data.
5. Confirm which old screenshot elements no longer exist and mark them “obsolete screenshot, no code change.”

**Exit gate:** a baseline folder or PR attachment exists for all critical screens, and each checkout failure has a specific resolution reason rather than the generic label alone.

## Phase 1 — Add shared direction and formatting foundations

### 1A. Direction utilities and static guardrails

1. Add a small pure direction/BiDi module under `shared/src/utils/` and export it through the shared package.
2. Add tests for LTR/RTL isolation and preservation of punctuation around:
   - `Afaq hala Company For Communications and Information`
   - `support@halaa.com.sa`
   - `+966 55 261 9282`
   - `15%`, `+15%`, and their Arabic-digit forms
   - `App Store / Google Play`
3. Add a repository static test/script that fails on new live `row-reverse` uses outside an explicit allowlist.
4. Add a static rule/report for physical directional style properties. Start as a reviewed allowlist rather than immediately failing all legacy files.
5. Correct the stale comment in `halaa-mobile/index.js`.
6. Mark `halaa-mobile/RTL_ALIGNMENT_REPORT.md` superseded or regenerate it from the final branch.

### 1B. Locale utilities

Extend `shared/src/utils/locale.js` and add pure Node tests for:

- Arabic/English date and time output;
- Arabic/English digits;
- 12 AM, 12 PM, and stored `6:30:AM`/`6:30 AM` variants;
- percent placement;
- address de-duplication with Arabic comma output;
- invalid/null input returning a safe empty/fallback value.

`formatLocation()` should:

1. accept the location shapes used by `MapPicker` and event APIs;
2. split preformatted address strings on Arabic and Latin commas;
3. trim and normalize whitespace/case for comparison;
4. remove duplicate tokens while preserving first-seen order;
5. avoid adding `name` or `city` when already contained as a complete normalized address token;
6. join with `، ` in Arabic and `, ` in English.

### 1C. Pluralization contract

Use i18next JSON v4 Arabic plural categories: `zero`, `one`, `two`, `few`, `many`, `other`. Add guest-count keys to Arabic and English resources and test at least 0, 1, 2, 3, 4, 10, 11, 99, and 102. Remove string concatenation such as `${count} ضيف` from user-facing UI.

**Exit gate:** pure tests define direction, formatting, and plural behavior before screens migrate.

## Phase 2 — Repair the entire legal family through `LegalScreen`

Files:

- `halaa-mobile/screens/legal/LegalScreen.js`
- `shared/src/legal/documents/*.json` only where isolation metadata/marks are required
- `halaa-mobile/components/legal/LegalLinks.js`
- `halaa-mobile/components/plans/PurchaseLegalLinks.js`
- legal tests under `halaa-mobile/__tests__/legal/`

Tasks:

1. Delete `cardHeaderRtl` and the conditional that applies it.
2. Delete the Arabic `alignEnd`/`alignSelfEnd` layout branches. Use logical start for the document header and badge.
3. Keep the number badge as an LTR token, but let the row itself follow the inherited direction. Confirm badge is at the right in Arabic and left in English.
4. Render the top badge only when it adds information. At minimum, suppress it when normalized `badge === title`; this removes redundant Privacy, Terms, and Support pills without hardcoding document names.
5. Stabilize mixed-script legal content using the Phase 1 isolation helper or explicit structured spans. Do not change owner-approved legal wording except for invisible direction controls or separately approved typography punctuation.
6. Validate the English entity name, emails, phone numbers, `Apple/Google`, parentheses, commas, `%`, and sentence-ending punctuation on both platforms.
7. Keep link separators as actual `·` elements with `gap`; ensure wrapping never separates a separator awkwardly from both neighboring links. If needed, render each `separator + link` as a small nonbreaking row.
8. Consolidate duplicated behavior between `LegalLinks` and `PurchaseLegalLinks` into one reusable link-row primitive with configurable documents/margins.

Acceptance criteria for every Privacy, Terms, Community Rules, Refund, Deletion, and Support page:

- Arabic badge and section number appear on the logical right, English on the logical left.
- No `row-reverse` exists in `LegalScreen`.
- No duplicate badge when badge and title are identical.
- Long titles wrap without badge overlap at 200% font scaling.
- Mixed English phrases retain parentheses and punctuation.
- All document links open the canonical locale URL.

## Phase 3 — Standardize inputs, auth/onboarding, and safe areas

### 3A. Direction-aware input primitive

Create a shared controlled/native input primitive or hook with an explicit `contentDirection` contract:

- `localized` (default): placeholder and value follow current locale;
- `ltr`: email, URL, IDs, card data, OTP, raw time/amount;
- `rtl`: only for explicitly Arabic-only content;
- `phone`: localized placeholder while empty, LTR digits/value once nonempty.

The primitive must set `textAlign` and `writingDirection` explicitly where iOS requires it, without overriding caller-provided intentional styles. It should also centralize label/error alignment, focus/error/disabled state, font, and accessibility.

Refactor in this order:

1. `components/commen/MobileInput.js`
2. `components/commen/PasswordInput.js`
3. `components/commen/TextInput.js`
4. `components/commen/TextAreaInput.js`
5. `components/commen/EmailInput.js`
6. `components/commen/OTPInput.js`
7. `DatePicker`, `TimePicker`, `DropdownInput`, `MapPicker`, `CategoryPickerSheet`
8. direct search/filter/form inputs in events, marketplace, guest imports, tickets, staff portal, vendor, and admin surfaces

For `MobileInput` specifically:

- hoist focus state out of `Controller.render`;
- keep JSX in logical order;
- replace country-code `borderLeftWidth` with a logical border so it sits between prefix and input in both languages;
- replace icon/prefix physical margins with `gap` or start/end spacing;
- force `+966` to LTR and keep it separate from the editable local number;
- show the Arabic placeholder aligned right on iOS and preserve correct cursor/digit order after typing;
- test validation/error text in both languages.

For `PasswordInput`, hoist focus state, remove physical eye/icon margins, and make the eye control a 44x44 accessible target.

### 3B. Safe screen shell and TopBar

1. Establish a simple shared screen shell using `react-native-safe-area-context`.
2. Confirm every `TopBar` call is inside it, including loading/error branches.
3. Remove `StatusBar.currentHeight` from `TopBar` so insets have one owner.
4. Replace React Native `SafeAreaView` imports in `VendorSignupScreen` and host-mode `CreateEventForm`.
5. Wrap `LanguageSelector` and `WelcomeWrapper` with explicit safe-area handling.
6. Replace module-load window dimensions with `useWindowDimensions()`; remove fixed `height: height` from `WelcomeWrapper`.
7. Localize the TopBar back accessibility label instead of hardcoding English `Back`.
8. Verify enlarged iOS status areas, Dynamic Island, Android cutouts, and bottom home indicator.

### 3C. Language selector

The current source includes visible name/subtitle text and fonts load before `AppContent`; the diagnosis that an unconstrained flex view necessarily collapses to zero height is unproven. Reproduce first.

Then make the layout deterministic:

- Arabic name/subtitle explicitly RTL; English explicitly LTR because this screen appears before a language is chosen.
- Add `minWidth: 0`, `flexShrink: 1`, and bounded text wrapping to the text cell.
- Use logical spacing rather than `marginRight` on the flag.
- Keep a minimum 44x44 action target and card accessibility labels.
- Verify slow font load by temporarily delaying readiness in a dev-only test; the production app must continue to gate the picker until fonts are loaded.

### 3D. Role selection and auth copy

- Decide whether the role-card accent is a semantic leading accent or an intentionally physical-left decoration. If semantic, change `borderLeftWidth` to `borderStartWidth`; if physical by approved design, keep it and document the exception.
- Replace physical icon/chevron margins with logical spacing or `gap`.
- Preserve a real space between `؟` and `تسجيل الدخول` structurally; do not depend on a trailing whitespace inside a `Text` node that a formatter can remove. Use `gap` between two text/link elements.
- Run the same treatment on login/signup “have an account” rows.
- Verify legal links at large font sizes and with the keyboard open.
- Localize the hardcoded English language-change alert in `LanguageProvider` and verify its relaunch instruction accurately matches actual native behavior.

### 3E. Onboarding state machine

Refactor `components/welcom/Welcome.js` so labels match actions:

| Slide | Secondary action | Primary action |
|---|---|---|
| First | `تسجيل الدخول` / `Login` (optional explicit action) | `التالي` / `Next` |
| Middle | `السابق` / `Previous` | `التالي` / `Next` |
| Last | `تسجيل الدخول` / `Login` | `إنشاء حساب` / `Create account` |

Do not call login from a control labeled “Previous” on slide 1. Show a text label with the primary arrow so direction is not the only cue. Keep `DirectionalIonicon`. Test dot order and swipe/button state in Arabic and English.

Correct source copy:

- `مرحـبًا بك في هلا!` must render the exclamation at the visual sentence end.
- Replace the Latin comma and preceding space in `المناسبة , بسهولة` with correct Arabic punctuation: `المناسبة، بسهولة`.
- Correct the English brand typo `Labba` to `Halaa` after confirming product naming.

**Exit gate:** all auth primitives render correctly on iOS and Android, no first-slide navigation lie remains, and headers survive all safe-area variants.

## Phase 4 — Events family and cross-app locale migration

### 4A. Event details

In `screens/common/EventDetailsScreen.js`:

- replace local `formatDate`/`formatDateTime` with shared locale helpers and pass `currentLanguage` from `useTranslation`;
- parse and localize stored event time rather than appending raw `6:30 AM`;
- format RSVP counts, total guests, and remaining invites through `formatCount`;
- replace `buildLocationString` with shared `formatLocation`;
- isolate email, phone, QR/ID, and mixed-script values as LTR;
- preserve the current no-avatar design unless the product requirement explicitly restores an image.

Expected Arabic example: `٣٠ يونيو ٢٠٢٦ • ٦:٣٠ ص` (or the approved Western-digit Arabic variant if the product owner changes the global digit policy). English example: `Jun 30, 2026 • 6:30 AM`.

### 4B. Event list and cards

In `EventList.js`, `EventListItem.js`, and `EventsScreen.js`:

- move all direct Arabic labels/statuses/placeholders/alerts into `localization/locales/ar|en/events.json`;
- use shared status-label mapping and shared date/count utilities;
- render three RSVP metrics as a single row with three `flex: 1` items; remove `flexWrap` and `width: "48%"`;
- use the Arabic plural contract for guest counts;
- explicitly localize search placeholder direction;
- make filter chips horizontally scrollable with `numberOfLines={1}`, or allocate intrinsic widths with horizontal padding; do not shrink Arabic copy until unreadable;
- make the FAB use logical `start`/`end` positioning as intended;
- pass bottom content inset/padding to the list equal to FAB height + FAB bottom offset + safe-area/bottom-tab inset + breathing space;
- verify the final event card can scroll fully above the FAB.

### 4C. Broader date/number migration

Replace the 35 ad-hoc user-facing `toLocaleDateString`/`toLocaleString` calls across 32 files. Prioritize:

- create-event preview/summary/steps;
- home last-event header;
- vendor orders/home/services;
- payments;
- admin event, host, business, vendor, ticket, discount, and payment lists/details.

Do not change non-user-facing serialization, API payloads, sorting values, or canonical stored times. Formatting happens only at render/export boundaries.

### 4D. Hardcoded copy sweep

Classify the 419 Arabic JS hits:

1. `t(key, "Arabic fallback")`: keep only if the key exists in both locales; prefer an English-neutral development fallback or remove once resource parity is proven.
2. Direct visible Arabic literals: migrate to translations.
3. Validation schemas/alerts composed before render: inject `t` or build the schema from a translation factory.
4. Developer logs/comments/fixtures: no user-facing change required.

Add a static translation-parity test for AR/EN keys and a report that prevents new direct Arabic UI literals outside an explicit allowlist (language picker bilingual first-run copy may be allowed).

**Exit gate:** event pages are bilingual, numerals are consistent, plural grammar is correct, and no card/FAB/chip layout defect remains at large font scale.

## Phase 5 — Checkout/IAP readiness and purchase-surface RTL

### 5A. Model readiness explicitly

Add a pure purchase-readiness function that consumes query/SDK/identity/resolution state and returns one of:

- `loading`
- `sdk_unconfigured`
- `user_unidentified`
- `catalog_error`
- `offerings_error`
- `entry_missing`
- `not_store_eligible`
- `package_missing`
- `price_missing`
- `ready`

Use it in `PlansSummaryScreen` and `AddonsPurchaseScreen`. While catalog/offerings are loading, show a spinner/skeleton rather than prematurely showing “Unavailable.” On retryable query errors, show a retry action. For terminal unavailable states, keep CTA disabled and show a localized reason/support path. Never show the backend total as the native amount.

### 5B. Diagnose the signed build, not local source alone

Without printing secrets:

1. Confirm `REVENUECAT_IOS_KEY` and `REVENUECAT_ANDROID_KEY` exist in the relevant EAS environment/profile.
2. Inspect the built public Expo config and confirm only key presence/prefix validity.
3. Confirm the authenticated user has `billingUserId` before navigating to plans.
4. Confirm backend `/payments/revenuecat/catalog` returns the selected internal code and expected offering/package lookup key.
5. Confirm `Purchases.getOfferings()` returns `host_plans`, `business_plans`, `host_addons`, and `business_addons` as appropriate.
6. Confirm the tester is using the correct App Store sandbox/TestFlight or Google internal track, accepted agreements, Saudi storefront/availability, and an installed build whose bundle/package ID is `com.halaa.app`.
7. Compare runtime product/package IDs against the generated provider map without editing the provider catalog unless there is demonstrated drift.
8. Add privacy-safe telemetry/Sentry breadcrumbs for readiness reason and counts; no keys, receipts, or personal data.
9. Update or supersede `halaa-mobile/IAP_SETUP.md`; it still describes older user-ID and add-on limitations that contradict the current `billingUserId` and dedicated add-on flow.

### 5C. Purchase-surface layout and copy

- Keep the lock and legal notice in one logical row or top-aligned row; at multi-line sizes the lock aligns with the first line, not the outer edge of a text box.
- Reuse the legal-link row from Phase 2 with bullet separators and wrapping.
- Stabilize math/percent copy using isolation helpers rather than visual reordering. Cover both current strings in `plans.json`.
- Localize store price as the SDK returns it; treat it as an isolated LTR/auto token inside Arabic layout.
- Make CTA disabled contrast meet accessibility requirements while remaining unmistakably disabled; do not rely only on opacity.
- Ensure footer bottom safe area works on gesture-navigation iPhones and Android devices.

### 5D. Test scenarios

Automate pure readiness tests and manually test:

1. queries loading;
2. catalog network failure + retry;
3. offerings network/store failure + retry;
4. unknown plan code;
5. missing package;
6. package resolved with localized store price;
7. cancellation (not shown as an error);
8. purchase pending/reconcile pending;
9. success;
10. restore subscriptions;
11. consumable/add-on no-restore disclosure;
12. Arabic and English on both stores.

**Exit gate:** a selected store-eligible plan resolves to a store price in a valid sandbox/internal-track build, or the UI names the precise non-secret blocker and offers the correct retry/support path.

## Phase 6 — Remaining cross-app directional sweep

Review all remaining physical style hits, grouped by behavior rather than doing a regex replacement.

### Convert to logical direction

- Toast accent border and content margins in `contexts/ToastContext.js`.
- Role cards, common inputs, pickers, notifications, marketplace search/filter, plan/payment selectors, and list metadata.
- Semantic FAB/action/status placement.
- Remaining `EventTemplates` modal header `row-reverse` and text alignment.

### Audit separately

- `EventTemplates` horizontal carousel: preserve selected index, initial position, pagination, and scroll direction in AR/EN on iOS/Android.
- Absolute overlays in template preview/canvas/media: coordinates may intentionally be physical.
- Shadows: `shadowOffset.width` is visual, not semantic direction.
- Symmetric `hitSlop.left/right`: keep when both values are equal.
- Charts and drawing primitives: keep physical geometry unless labels/interaction prove mirrored.

When a physical property remains intentionally, annotate it briefly or add it to the static-test allowlist with a reason.

## Phase 7 — Verification and release gate

### Automated checks

Required:

- `npm run lint`
- `npm test`
- locale key parity
- Arabic plural category tests
- direction/BiDi utility tests
- legal render-shape tests for all six documents
- purchase-readiness state tests
- static no-new-`row-reverse` test
- static directional-icon test already present
- static report/no-new-hardcoded-Arabic-UI test

If component rendering tests are added, prefer `@testing-library/react-native` with Expo-compatible Jest. Do not fake confidence with snapshots alone; assert order, labels, disabled state, and accessibility roles.

### Manual device matrix

For every critical screen, verify:

- iOS Arabic and English;
- Android Arabic and English;
- default and 200% font scaling;
- smallest supported phone width;
- Dynamic Island/call banner and Android cutout;
- keyboard open/closed;
- light theme (the app is currently light-only);
- VoiceOver/TalkBack focus order for header controls, inputs, onboarding, links, and checkout CTA.

### Definition of done

The work is complete only when:

1. Privacy, Terms, Community Rules, Refund, Deletion, and Support all share correct logical layout.
2. Arabic inputs/placeholders no longer collide with prefixes/icons on iOS.
3. No screen double-counts top safe-area/status-bar padding.
4. Onboarding labels always describe their action.
5. Event dates, times, counts, plurals, and addresses are locale-consistent.
6. Event RSVP stats stay one row, long chips stay one line/scroll, and the FAB obscures no content.
7. Native checkout shows a real store price when ready and a precise, safe failure state when not ready.
8. No backend price is used as a native store-price fallback.
9. New static tests prevent reintroduction of the same classes of bug.
10. Before/after evidence exists for the complete platform/language matrix.

## 5. Recommended commit sequence

Keep commits reviewable and reversible:

1. `test(mobile): define rtl bidi locale and plural contracts`
2. `fix(mobile-legal): use logical rtl layout across all legal documents`
3. `refactor(mobile-inputs): centralize localized and ltr field direction`
4. `fix(mobile-shell): standardize safe areas top bars and responsive sizing`
5. `fix(mobile-onboarding): align labels actions punctuation and direction`
6. `fix(mobile-events): localize dates counts plurals cards and fab insets`
7. `fix(mobile-billing): expose deterministic store readiness states`
8. `refactor(mobile-i18n): migrate remaining physical direction and hardcoded copy`
9. `test(mobile): add cross-platform rtl regression coverage and evidence`

Do not combine provider-console mutations with UI/refactor commits. Any required provider action must have separate readback evidence and authorization.

## 6. Useful audit commands

Run from `D:\halla\halaa-mobile`:

```powershell
# Remaining manual RTL reversals
rg -n --glob "*.{js,jsx,ts,tsx}" "row-reverse" components screens navigation contexts

# Physical directional style declarations (classify; do not blindly replace)
rg -n --glob "*.{js,jsx,ts,tsx}" "\b(marginLeft|marginRight|paddingLeft|paddingRight|borderLeftWidth|borderRightWidth|borderLeftColor|borderRightColor|left|right)\s*:" components screens navigation contexts

# Native inputs that must declare a content-direction policy
rg -n --glob "*.{js,jsx,ts,tsx}" "<(RNTextInput|TextInput)" components screens

# User-facing ad-hoc locale formatting
rg -n --glob "*.{js,jsx,ts,tsx}" "toLocale(DateString|TimeString|String)\(" components screens utils

# Arabic literals in code (classify fallback vs direct UI)
rg -n --glob "*.{js,jsx,ts,tsx}" "[\p{Arabic}]" components screens

# Safe-area implementations
rg -n "SafeAreaView|useSafeAreaInsets|StatusBar\.currentHeight" screens components navigation App.js
```

The counts should decrease only when behavior has migrated to shared utilities. A lower count is not itself proof of correctness; device evidence and the acceptance criteria are the proof.
