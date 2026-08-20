# Mobile RTL / iOS cross-app remediation — implementation ledger

**Plan:** `docs/implementation/MOBILE_RTL_IOS_CROSS_APP_REMEDIATION_PLAN.md`
**Status:** code phases implemented; automated gates green (`npm run lint` exit 0, `npm test` 90/90)
**Device evidence:** NOT yet captured — Phase 0 baseline matrix and Phase 7 manual device
matrix still require real iOS/Android/iPad builds (external; cannot be produced from this repo alone).

## Phase 1 — foundations

| Item | Status |
|---|---|
| `shared/src/utils/bidi.js` (`isolateLtr`/`isolateRtl`/`isolateAuto`, LRI/RLI/FSI/PDI) + shared-package export | Done |
| BiDi tests (entity name, email, phone, `15%`/`+15%`/`١٥٪`, `App Store / Google Play`) | Done (`__tests__/localization/bidi.test.js`) |
| `shared/src/utils/locale.js` extended: `formatDate/Time/DateTime/Number/Count/Percent/GuestCount/Location` | Done |
| Locale tests (AR/EN dates, digits, `12 AM`/`12 PM`, `6:30:AM` variants, percent, address de-dup with Arabic comma, null fallbacks) | Done (`locale.test.js`) |
| i18next v4 Arabic plural keys (`zero/one/two/few/many/other`) in `events.json` AR+EN | Done |
| Plural tests at 0,1,2,3,4,10,11,99,100,101,102 — incl. real i18next resolution + `Intl.PluralRules` agreement | Done (`plurals.test.js`) |
| Static no-new-`row-reverse` test with allowlist | Done (`noRowReverse.test.js`) — allowlist currently empty |
| Static physical-direction property guard (reviewed allowlist) | Done (`physicalDirection.test.js`) — allowlist: `PaymentMethodSelector.js` only (intentional LTR card-field anchors) |
| Stale `row-reverse` comment removed from `halaa-mobile/index.js` | Done |
| `RTL_ALIGNMENT_REPORT.md` marked superseded | Done |
| Translation-parity test (strict AR↔EN key parity, plural-suffix aware) | Done (`translationParity.test.js`) |
| Static no-LRM/RLM test + balanced-isolate test | Done (`noDirectionalMarks.test.js`) |
| Shared input direction contract (`hooks/useInputDirection.js`, `localized`/`ltr`/`rtl`/`phone`) + node tests | Done (`inputDirection.test.js`) |

## Phase 2 — legal family

- `LegalScreen.js`: `cardHeaderRtl`/`row-reverse` deleted; Arabic `alignEnd` branches deleted;
  badge suppressed when normalized `badge === title`; number badge kept LTR; card header is
  logical `row` + `gap`; mixed-script paragraphs wrapped with `isolateLtr` via
  `LTR_LEGAL_TOKEN_REGEX` (entity name, emails, +966/05 phones, URLs, store names) in RTL.
- `PurchaseLegalLinks` now reuses `LegalLinks` (one link-row primitive, configurable
  docs/margins); separators are real `·` elements with `gap`.
- `en/settings.json` was missing the whole `legal.*` namespace → added (`lastUpdated`,
  `ugcAcceptNotice`) plus 28 other missing keys surfaced by the strict parity test.
- Render-shape tests for all six documents in both locales: `__tests__/legal/legalRender.test.js`.

## Phase 3 — inputs, shell, onboarding

- `MobileInput`: field hoisted (no hooks in `Controller.render`); logical `borderEndWidth`
  between `+966` and the number; `gap`/`marginEnd` spacing; phone direction contract
  (RTL placeholder while empty → LTR digits once typing) via `useInputDirection("phone")`.
- `PasswordInput`: hoisted; 44×44 eye target with localized a11y label
  (`common.showPassword/hidePassword` added AR+EN); LTR direction contract.
- `TextInput`/`TextAreaInput`: localized direction contract; char-count physical
  `textAlign:"right"` removed; `TextInput` icon spacing → `marginEnd`.
- `EmailInput`: LTR contract via pure `resolveInputDirection`.
- `OTPInput`: LTR digits, hoisted field.
- Direct search inputs (events list, event details, marketplace, admin SearchBar): explicit
  localized direction styles.
- `TopBar`: no `StatusBar.currentHeight`; localized back a11y label (`common.back` AR+EN);
  44×44 targets; direction-agnostic logical slots; absolute-centered title.
- All `SafeAreaView` imports are `react-native-safe-area-context` (incl. `VendorSignupScreen`,
  host-mode `CreateEventForm`); `LanguageSelector`/`WelcomeWrapper` sit in explicit
  safe-area shells; `WelcomeWrapper` no longer fixes module-load `height`.
- `MediaUploader`: module-load `Dimensions.get("window")` → `useWindowDimensions()`; delete
  button corner anchor → logical `end`.
- `LanguageSelector`: per-language `writingDirection`, `minWidth:0`+`flexShrink:1`,
  logical flag spacing, 44×44 arrow, `DirectionalIonicon`.
- `RoleSelectionView`: semantic `borderStartWidth` accent, logical icon/chevron spacing,
  structural `gap` between “have account” text and login link (no whitespace-in-string).
- `LanguageProvider`: change-language alert localized; relaunch message only when a native
  reload is actually required.
- `Welcome.js`: first slide secondary = Login (never “Previous” triggering login), middle =
  Previous/Next, last = Login/Create account; `DirectionalIonicon` + text labels on both
  actions. Copy fixes: `مرحـبًا بك في هلا!`, Arabic comma in `المناسبة، بسهولة`,
  `Labba`→`Halaa`, last-slide primary label now `إنشاء حساب`/`Create account` per plan.

## Phase 4 — events + locale migration

- `EventDetailsScreen`: shared `formatDate/Time/DateTime/Location` with `currentLanguage`;
  stored `H:MM[:][A]M` times parsed and localized; RSVP/total/remaining-invite counts through
  `formatCount`; host email/phone isolated as LTR in Arabic; search input direction; no avatar.
- `EventListItem`: shared date/time/guest-count utilities; Arabic plural contract;
  stats row is one `row` of three `flex:1` items (no `flexWrap`, no `48%`).
- `EventList`: labels/statuses/placeholders via `events.json`; filter chips horizontally
  scrollable with `numberOfLines={1}`; stats values through `formatNumber/formatPercent`;
  `listContent` bottom padding sized for the FAB; search placeholder direction on iOS.
- `EventsScreen` FAB uses logical `start` positioning.
- All 5 remaining user-facing `toLocale*` calls migrated
  (`PlanPriceBlock`, `BusinessPlanCard`, `PlanListItem`, `VendorHomeScreen`,
  `VendorServicesScreen`) — 0 left in components/screens.
- Physical-direction sweep: 27 additional files migrated to `marginStart/End`,
  `paddingStart/End`, `borderStart/End`, `start/end` anchors (incl. `LastEvent` leading
  accent, `EventActionsSection`/`ResolveTicketModal` warning accents, notification unread
  accent anchor, staff-portal, admin list metadata, plans components).
- `EventTemplates`: modal header `row-reverse` already removed; physical title `textAlign`
  removed; RTL carousel offset normalization added for iOS RTL (`contentOffset.x` is
  negative there) so pagination/dots/index survive both directions.

## Phase 5 — checkout/IAP

- `services/billing/purchaseReadiness.js`: pure 10-state model
  (`loading`, `sdk_unconfigured`, `user_unidentified`, `catalog_error`, `offerings_error`,
  `entry_missing`, `not_store_eligible`, `package_missing`, `price_missing`, `ready`) +
  `readinessReasonKey()` i18n mapping; 11 node tests incl. reason-key coverage.
- `PlansSummaryScreen` + `AddonsPurchaseScreen`: spinner while queries load; retry action on
  retryable failures; terminal states disable the CTA (gray, not opacity-only) and show the
  precise localized reason (`checkout.iap.reasons.*` AR+EN); toasts name the blocker.
  Store price comes only from the RevenueCat package `priceString`; backend SAR totals stay
  web-only. Footer bottom safe-area via `SafeAreaView edges=["bottom"]`; lock icon row is
  top-aligned; purchase legal links reuse the Phase 2 primitive.
- Privacy-safe Sentry breadcrumb (`purchase.readiness`) records state/retryability/catalog
  count/offerings count/internal code — no keys, receipts, or personal data.
- `IAP_SETUP.md` rewritten around `billingUserId`, discrete readiness states, and the
  dedicated add-on flow.
- Math/percent copy stabilized: ad-hoc LRM removed from `ar/plans.json` (`compensationHint`
  now uses LRI/PDI isolates); `compensationRow` renders `formatPercent`/`formatNumber`
  tokens isolated per direction; `.vcf` tokens in `ar/createEvent.json` use LRI/PDI.

## Known follow-ups (require humans/devices — not code)

1. Phase 0 baseline capture matrix (iOS AR/EN, Android AR/EN, iPad split) with seed data.
2. Phase 7 manual device matrix incl. 200% font scale, Dynamic Island/call banner, keyboard,
   VoiceOver/TalkBack focus order.
3. Phase 5B signed-build diagnosis: EAS env key presence, tester track/storefront,
   `Purchases.getOfferings()` readback, catalog offering/package lookup keys. Provider
   consoles were NOT mutated (zero-drift evidence stands).
4. Remaining `t(key, "Arabic fallback")` sites: keys now have strict AR/EN parity; swapping
   fallback strings for English-neutral ones is cosmetic and can ride along later.
5. Language-selector first-run bilingual copy and `nameAr/nameEn` data arrays are
   intentionally allowed to remain bilingual (plan §4D allowlist class).
