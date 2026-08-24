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

## Blueprint §9 P0+P1 — create/update event Step 2 (screenshot 6, 2026-08-24)

Implements `HOST_IOS_DIRECTION_BLUEPRINT.md` for the Step 2 guest/moderator/category
forms so screenshot 6's failures are impossible by construction:

- `hooks/useInputDirection.js`: fifth content mode `adaptive` added to the shared
  contract plus pure `resolveStrongDirection(value, fallbackIsRTL)` (first strong
  Arabic/Latin character; neutrals skipped; locale fallback). Field chrome
  (`resolveLabelDirection`) explicitly never follows adaptive/phone values.
- `components/commen/DirectionalTextInput.js`: passes the raw value through so
  adaptive fields recompute direction on every keystroke.
- New primitives: `components/commen/FormField.js` (shared non-RHF field shell —
  localized label, leading icon, mode-declared value/placeholder, logical trailing
  affordance slot, localized error/helper, LTR-isolated counter; focus/error/disabled
  change colour only), `LocalizedText.js`, `AdaptiveText.js`.
- `GuestForm.js` / `ModeratorForm.js`: migrated off local label/error chrome onto the
  shared shell; name is `adaptive` ("Ali" renders LTR in Arabic UI, Arabic names RTL in
  English UI), phone stays `phone` (localized empty placeholder, LTR digits).
- `CategorySelect.js`: hardcoded Arabic defaults removed (i18n keys); selected
  user-created category renders adaptively with first-strong isolation; chevron stays
  in its logical trailing slot via JSX order.
- `CategoryPickerSheet.js`: title/none-row via `LocalizedText`; search input and option/
  create rows adaptive (`AdaptiveText`); close action at logical end; defaults resolved
  from new keys `category_search_placeholder` / `category_none_label` /
  `category_create_label` (+ `moderator_name_placeholder`) in AR/EN `createEvent.json`.
- `EditGuestOrModeratorsModal.js`: duplicated local field shell deleted; renders through
  the shared shell + `LocalizedText` chrome.
- Tests: `resolveStrongDirection`/adaptive cases added to `inputDirection.test.js`
  (Ali, علي, Halaa 2026, حفل Halaa 2026, mixed addresses, emoji prefix, digits-only);
  new guardrails in `__tests__/regressions/stepTwoDirection.test.js`
  (STEP2-DIR-01..05). EVT-UI-01 updated to assert the FormField→DirectionalTextInput
  chain. All 31 direction-related tests green.



## Blueprint §8 — Marketplace + Vendor Public Profile (2026-08-24)

Implements HOST_IOS_DIRECTION_BLUEPRINT.md for the marketplace page group
(Marketplace, VendorPublicProfileScreen and their shared tree):

- components/marketplace/VendorCard.js: the +N extra-tags badge is now ONE atomic
  LTR-isolated token (isolateLtr wrapping the locale count) so the plus cannot
  BiDi-detach from its digits in Arabic copy — same contract as the plans add-ons
  quantity badge.
- screens/common/VendorPublicProfileScreen.js: hero round buttons raised to 44×44
  (blueprint Â§7 icon-only touch target). Symmetric hero strip / sticky footer physical
  anchors remain documented exceptions (equal hit slop, full-width overlay).
- Page-group audit confirmed: TopBar count token, adaptive search, adaptive brand/
  description/location/service copy, atomic price tokens, LTR-isolated contact tokens,
  localized field metadata in the filter sheet/dropdowns, digit-entry price inputs,
  logical close/chevron slots, zero Arabic literals, zero row-reverse, zero direct
  native inputs in the whole tree.
- Tests: marketplaceDirection.test.mjs extended (+N isolation, 44×44 target);
  58/58 green across marketplace ×4, shared displayTokens, inputDirection,
  adaptiveDirection, bidi, noRowReverse, physicalDirection suites.
## Host events family — iOS direction blueprint (2026-08-24)

Implements `HOST_IOS_DIRECTION_BLUEPRINT.md` §8 rows "Event list", "Event
details", "Create event shell/steps", "Update event" and "Post-event":

- Shared: `TopBar` title base direction is now first-strong
  (`resolveStrongDirection`) while chrome alignment stays locale-driven, so a
  Latin event/business title renders LTR inside the Arabic app bar.
- Events list: orphaned `TabsSearchAndFilters` (raw Arabic, dead code)
  deleted; `EventsScreen` error body → `AdaptiveText`;
  `EventFailureBanner` retry-error + WhatsApp support message moved to keyed
  copy with `isolateAuto`/`isolateLtr` embedded tokens; legacy physical stripe
  anchors → logical `start/end`.
- Create/update wizard: `yourEventManagedByUsPopup` fully i18n'd (4 raw Arabic
  literals removed); `LimitReachedView` `||`-English overrides replaced with
  `defaultValue` slots + new `limitReachedView.*` keys; `EventSummary` renders
  name/invitation/address adaptively, invitee count via `invitees_count`
  interpolation, date/time through shared locale helpers + `summary_date_time`
  key; `ListOfGuestsORModerators` names/categories adaptive + per-type total
  keys with `formatCount`; `StepThree` backend template names adaptive;
  `StepFive` free-text fields declare `contentDirection="adaptive"`;
  contacts import names/inputs adaptive; `import_error_row` /
  `guest_list_title_count` interpolation keys replace JSX concatenation.
  Dead bilingual components deleted (`EventMetricsGrid` manual Arabic months,
  `WhatsAppInvitationPreview`, `eventTypeModal`, empty `StepTwoBtns`);
  update-event Step 2 lockout banner uses `LocalizedText`.
- Post-event: local `MOD_COPY` dictionary + inline legal-prefix ternary moved
  into `postEvent.json` (`moderation.*`, `comment.legalPrefix`); guest names,
  comment bodies, captions, thank-you text and backend titles render via
  `AdaptiveText`; like/comment counts `formatCount`+`isolateLtr`; comment input
  declares adaptive (maxLength aligned to the 1000-char validation copy);
  `GuestEventHeader` renders exactly one locale-appropriate thank-you variant.
- Tests: `eventsDirectionContract.test.js` extended (+9 cases), new
  `postEvent/postEventDirectionContract.test.js` (+6); guardrails green.

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

## Blueprint §8 — Admin events family (2026-08-24)

Implements HOST_IOS_DIRECTION_BLUEPRINT.md for the admin-dashboard events page
group (Events List, Event Details, Create Event, Update Event, Manage Post-Event):

- components/admin-dashboard/common/AdminPageHeader.js + FilterBar.js: filter
  chip count badges are now locale-formatted (`formatCount`) LTR-isolated
  tokens; chip labels render through `LocalizedText`.
- components/admin-dashboard/common/BulkActionsBar.js: "N selected" JSX
  concatenation removed in favour of `common.selectedCount` interpolation with
  locale digits (AR+EN key added to common.json).
- components/createEvent/PrevAndNextBtns.js: hardcoded Arabic default labels
  ("التالى"/"السابق") replaced by `createEvent.next_button`/`previous_button`
  keys; labels are `LocalizedText`. Geometry untouched (plain logical row).
- components/admin-dashboard/events/CreateEventForm.js and
  screens/common/update-event/UpdateEventScreen.js: floating preview button
  physical `right: 20` → semantic `end: 20` (blueprint Priority 1). Update
  lockout banner + load-error copy render through `LocalizedText`.
- components/createEvent/StepOne.js + commen/MapPicker(.web).js: event name and
  address declare `contentDirection="adaptive"`; MapPicker accepts a
  `contentDirection` prop (default `localized`) so filled addresses follow their
  first strong character.
- components/admin-dashboard/events/HostSelectorStep.js: host/self names and
  plan badges render adaptively; phones are always-LTR isolated tokens;
  `'Admin'` literal replaced by `events.hostSelector.selfAccount` (AR+EN);
  remaining-events count locale-formatted; chrome via LocalizedText.
- screens/common/EventDetailsScreen.js: tab counts interpolate locale-formatted
  digits inside the existing guestsTabCount/moderatorsTabCount keys; host
  email/phone are unconditional isolateLtr tokens (no longer AR-only).
- components/events/SendActionModal.js: counter/cost interpolations receive
  locale digits; "{{successful}}/{{total}}" ratio is one atomic isolateLtr token.
- components/events/AddGuestOrmoderatorPopup.js: roster counts locale-formatted;
  roster title is a LocalizedText role.
- components/admin-dashboard/events/AutoReminderInfoText.js: stored "HH:mm"
  strings localized via shared formatTime (hand-rolled AM/PM assembly deleted).
- Manage Post-Event tree: ThankYouMessageSection input is adaptive; ContentSummary
  stats are isolated locale tokens; MessagingTemplatePicker/AccessLinksSheet
  template names/bodies adaptive + var/sent/breakdown counts locale-formatted;
  screen chrome (status banner, header, back glyph) uses LocalizedText roles and
  DirectionalIonicon.
- Tests: new __tests__/events/adminEventsFamilyDirection.test.js (16 assertions
  across EVLIST/CREATE/DETAILS/POST groups + guardrails); settings schema tests
  repaired for the shared mobileAccountSettingsSchema shape change.

## Blueprint §8 follow-up round — notifications surface, toast BiDi, P3 literal sweep (2026-08-24)

- components/notifications/NotificationItem.js + screens/common/NotificationsScreen.js:
  audit confirmed the notifications list already renders backend title/message through
  AdaptiveText (first-strong + isolation), relative time through LocalizedText with
  locale digits (`localizeDigits`), logical `start` unread accent, semantic unmirrored
  glyphs and 44×44 labelled header actions. Guardrails pinned in
  __tests__/notifications/notificationsDirectionContract.test.js.
- contexts/ToastContext.js: toast message now renders through the shared AdaptiveText so
  raw backend/error strings keep their first-strong direction with BiDi isolation in both
  locales; chrome stays start/end-logical (borderStartWidth accent, marginStart close).
- Blueprint §9 Priority 3 final bullet closed: hardcoded Arabic fallback literals removed
  from StatsCards.js, GuestListItem.js, ModeratorListItem.js (keys verified present in
  AR+EN; English-neutral fallbacks intentionally remain per Known follow-up #4).
- Dead components/settings/PrefLang.js deleted (zero importers).

## Blueprint §8 — Admin account/notification settings + legal trio (2026-08-24)

Implements HOST_IOS_DIRECTION_BLUEPRINT.md for the admin-dashboard settings page
group reached via AdminMoreScreen → AdminSettingsScreen → tabs: Account
Settings, Notification Settings, Privacy Policy, Terms & Conditions,
Community Rules.

- Page-group audit result: the shared remediation already covers every visible
  component in this tree — `AdminAccountSettingsScreen` and
  `AdminNotificationSettingsScreen` are thin shells (SafeAreaView + shared
  TopBar with keyed titles + the migrated shared components); no page-specific
  direction patches were needed, so none were added.
- Verified classifications per blueprint §5: full name `adaptive`
  (placeholder follows UI locale; "Ali" stays LTR / Arabic names RTL in EN),
  username/email/OTP/passwords `ltr`, all labels/helpers/errors/section
  headings/badges/buttons `localized` through LocalizedText roles, toggle rows
  through ToggleInput with locale-driven chrome. Legal trio renders through the
  green-reference `LegalScreen` (`isolateLegalLtrTokens`, LTR-pinned section
  numbers, logical number→title row).
- Gap closed: this admin tree was absent from every direction-contract suite.
  New __tests__/admin/adminAccountNotificationDirection.test.js pins: logical
  rows/no physical anchors/no ad-hoc BiDi marks; no raw RN TextInput/Switch;
  screen-level delegation to the shared field shells (no forked forms or text
  chrome); value classification; controlled OTP usage; keyed error toasts
  without English fallback literals; 11 toggle rows; admin navigator reusing
  the same shared legal screens; AR/EN parity for all 60 keys used by the
  group.

## Blueprint Â§8 â Admin vendors/plans/discounts/settings direction round (2026-08-24)

Implements HOST_IOS_DIRECTION_BLUEPRINT.md for the admin-dashboard Vendors
List, Vendor Details, Plans Management, Discounts Management and Settings:

- components/admin-dashboard/vendors/VendorHeroCard.js: hero rating pill now
  uses shared formatNumber (locale digits) instead of raw toFixed(1); token
  keeps its LTR writingDirection.
- screens/admin/admin-dashboard/VendorDetailsScreen.js: every InfoRow value
  declares its blueprint Â§5 content mode â email/commercial-record/national-ID/
  social URLs mode="ltr", phone mode="phone", registration date and coverage
  label mode="localized"; coverageType enum renders through new
  vendorDetails.coverage.* keys (raw backend enum never leaks); gallery
  captions compose via vendorDetails.galleryIndexed interpolation +
  locale-formatted index (JS join removed).
- components/admin-dashboard/common/FilterBar.js: count badge migrated off
  plain Text onto LocalizedText.
- localization/locales/{ar,en}/admin.json: added vendorDetails.coverage.* and
  vendorDetails.galleryIndexed; repaired corrupted Arabic service label
  outdoorEventSetup ("Øª_setupâ¦" â "Ø¥Ø¹Ø¯Ø§Ø¯ Ø§ÙÙ…Ù†Ø§Ø³Ø¨Ø§Øª Ø§Ù„Ø®Ø§Ø±Ø¬ÙŠØ©").
- Tests: adminDashboardDirection.test.js extended (+4): locale-formatted hero
  rating, per-row value modes + coverage/gallery key usage, FilterBar role
  primitive, AR/EN key parity + pure-Arabic service-label guard.

Audit confirmed the rest of the five-page tree already conforms (TopBar,
AdminPageHeader/SearchBar adaptive search, AdminListItem AdaptiveText title/
subtitle + localized chips/details/actions, BulkActionsBar selectedCount,
PlanTabs/PlanList/PlanListItem/EditPlanModal contracts, DiscountFormFields
per-field modes, RatingModal full contract, SettingsTabs directional chevrons,
DeleteAccountSection keyword/password/OTP modes). No row-reverse, physical
semantic styles or native-input bypasses introduced.
