# Halaa host iOS direction map and implementation blueprint

**Audit date:** 2026-08-24  
**Scope:** every mobile page reachable by the host role, with emphasis on create/update event, host settings, ticket create/update, plans, marketplace, and normal page content.  
**Source of truth:** the current `halaa-mobile` working tree. Screenshots are visual evidence and reproduction clues; Google Meet overlays and the surrounding call UI are not part of Halaa.

## 1. Executive conclusion

The app does not have one universal “RTL is broken” defect. It has three different states:

1. **Good shared implementations already exist.** `TopBar`, `StepHeader`, the main controlled `TextInput`/`TextAreaInput`, `PasswordInput`, `MobileInput`, `DropdownInput`, the Step 1 date/time/location controls, `TicketModal`, and `LegalScreen` contain the right ideas and should be treated as references.
2. **Some host surfaces bypass those implementations.** Guest/staff labels, category controls, ticket rating, common date/time pickers, some settings/business copy, and several sheet/list rows use plain `Text` or local field implementations without the field-direction contract.
3. **The current input contract is missing an adaptive user-content mode.** It can make an empty Arabic placeholder correct, but a Latin value such as `Ali` remains RTL/right-aligned. Screenshot 6 demonstrates this clearly. Names, search queries, addresses, categories, event titles, and ticket subjects need “placeholder follows locale; filled value follows its first strong character.”

The implementation strategy must therefore be: improve the shared contract first, migrate exceptions second, and then perform page-level visual verification. Do not solve these screenshots with isolated `textAlign: "right"` patches.

## 2. Direction model that must not be replaced

The application already owns direction globally:

- `App.js` applies the selected locale’s `direction` to the root view.
- `LanguageProvider.js` persists the corresponding native `I18nManager.forceRTL()` state.
- A normal `flexDirection: "row"` is therefore logical start-to-end: right-to-left in Arabic and left-to-right in English.

Consequences:

- JSX child order is logical reading order.
- Never add `row-reverse` to “fix Arabic.” That double-flips native RTL.
- Use `start`/`end`, `marginStart`/`marginEnd`, `paddingStart`/`paddingEnd`, and `borderStartWidth`/`borderEndWidth` for semantic direction.
- Keep `left`/`right` only for genuinely physical artwork, full-width overlays, brand geometry, equal hit slop, and shadows. Document each exception.
- Do not invent `isRTL ? "right" : "left"` for labels. In this app’s native direction model, the tested helper in `hooks/useInputDirection.js` is authoritative. Its apparently surprising `textAlign: "left"` result is intentionally interpreted as logical start by React Native under the current RTL setup.

## 3. Screenshot evidence map

| Shot | Surface | What is good | What is bad / what it proves | Current-code status |
|---|---|---|---|---|
| 1 | Role selection | Arabic title, subtitle, card hierarchy, and card copy read naturally; chevrons sit at the action end. | This is an auth screen, not a host page. It should only be used as a card/content reference. | Outside the host remediation scope. |
| 2 | Marketplace | Arabic search placeholder and category labels read from the right; the card’s basic hierarchy is understandable. | Mixed numbers, Latin brand/location/price tokens, rating, and the count in the page title require explicit formatting/isolation. | Search now uses `DirectionalTextInput`; title count and vendor mixed values remain incomplete. |
| 3 | Host home | Arabic summary/content blocks and bottom navigation have a coherent logical order. | This screenshot is from an older revision. Current home fallback content still contains direct Arabic strings, so English can remain wrong even if geometry is correct. | Direction mostly improved; translation/content sweep still required. |
| 4 | Create event, Step 1 empty | This is the strongest good form reference: labels and placeholders are on the Arabic start edge; dropdown/date/time trailing affordances are on the opposite edge; hint copy wraps correctly. | None of the visible Halaa field geometry should be “fixed” by reversing it. | Current `StepOne` and shared field helpers implement this pattern. |
| 5 | Create event, Step 1 filled | Arabic values, localized date/time, and semantic field icons are largely in the expected places. | The mixed Arabic/Latin address is vulnerable to BiDi ordering and awkward wrapping unless treated as user/mixed content and normalized. | Current `MapPicker` uses `isolateAuto`; keep and strengthen through adaptive direction. |
| 6 | Create event, Step 2 filled | Phone digits remain LTR and the previous/next button order is correct for Arabic. | All labels are physically left; `Ali` is forced to the Arabic/right edge; category label is left while its Arabic value is right. This proves labels and values cannot share one direction rule, and that a locale-only value rule is insufficient. | `GuestForm`/`ModeratorForm` use direction-aware inputs but plain labels/errors; `CategorySelect` bypasses the contract; adaptive values are not implemented. |
| 7 | Contacts import sheet | Arabic sheet title is on the reading start and close is on the end; empty Arabic placeholders are on the right; iOS keyboard avoidance keeps the sheet usable. | The same underlying Step 2 labels remain wrong behind the sheet. Sheet titles, result rows, and category metadata still need a shared localized-text rule so they do not rely on inference. | Input primitive is good; sheet metadata is partial. |
| 8 | Plans | Current-plan labels/icons and their values form a sensible RTL row; the two billing tabs are in logical order. | The large plan heading visibly scrambles Arabic copy, `25`, `90`, and the SAR glyph. Raw counts such as `1 / 1` also mix digit policies. | `PlanDescription` now isolates compensation values and `PlanPriceBlock` isolates the number, but the complete price token and several plan rows still need one stable content contract. |
| 9 | Plan summary / checkout | Cards, disclosure rows, footer total, and icon placement are structurally sound. | `App Store / Google Play`, percentages, equations, dollar/SAR prices, parentheses, and terminal punctuation are mixed-script tokens. Plain translated `Text` is not sufficient. | Legal renderer has token isolation; checkout disclosures and several summary rows do not consistently reuse it. |
| 10 | Host account settings | Arabic section titles/labels are on the correct side; username and email are correctly LTR. | The Arabic full-name value is physically left in the screenshot. Password fields demonstrate that field chrome, placeholder, and secret value have different direction needs. | The current shared account fields have since adopted `contentDirection`; the screenshot is older. Add adaptive name handling and keep username/email/password explicitly LTR. |
| 11 | Deletion policy | This is the strongest good long-content reference: logical section number/title order, readable Arabic paragraphs, wrapping, and an isolated email token. | The top app-bar screenshot is partially obscured by Meet, so it is not valid evidence about safe-area spacing. | Current `LegalScreen` is a good reference and already isolates common legal LTR tokens. |

## 4. Good reference implementations: preserve these patterns

### 4.1 Shell, headers, and wizard chrome

- `components/plans/TopBar.js`: logical row, directional back glyph, logical start/end clusters, localized title direction, 44 px control target, and safe-area ownership documented outside the bar.
- `components/createEvent/StepHeader.js`: logical row, LTR-isolated `current/total` token, localized title and description.
- `components/createEvent/PrevAndNextBtns.js`: source order plus a normal row produces Previous → Next in LTR and the mirrored visual order in RTL. Keep the geometry, but localize its default labels.

The existing `TopBar` prop names are misleading: `leftContent` is currently treated as **logical start** and `rightContent` as **logical end**. Either rename them to `startContent`/`endContent` in a controlled migration or document this loudly at every call site. Do not interpret the names as physical coordinates.

### 4.2 Shared form fields

- `hooks/useInputDirection.js` centralizes input, label/helper/error, and counter direction.
- `components/commen/TextInput.js` applies the field contract to the input and all metadata.
- `components/commen/TextAreaInput.js` does the same for multiline values and counters.
- `components/commen/PasswordInput.js` keeps the secret value LTR while the label/helper/error follow the locale; the eye action has a 44 px target.
- `components/commen/MobileInput.js` uses a localized empty placeholder and LTR digits once filled, isolates `+966`, and uses logical border/spacing.
- `components/commen/DropdownInput.js` applies the localized field contract to label, selected value, placeholder, errors, modal title, and options.
- `components/commen/DirectionalTextInput.js` is the only permitted low-level native input for non-react-hook-form controls.

### 4.3 Create/update event Step 1

`components/createEvent/StepOne.js` is the visual form reference:

- event name uses the shared controlled input;
- event type uses the shared dropdown;
- date/time labels and display values use the field contract;
- formatted date/time come from shared locale utilities;
- iOS date/time uses a dedicated sheet;
- address uses `MapPicker` and mixed-content isolation;
- text appears first and the trailing icon second in logical JSX order.

Update event reuses create-event steps through `screens/common/update-event/StepOne..StepFive.js`. Fix shared create-event components first; do not fork a second RTL implementation for update.

### 4.4 Ticket create/update

`components/tickets/TicketModal.js` correctly uses `DirectionalTextInput` and the full field contract for title, labels, errors, subject, message, and type options. Create and update share the same modal, so preserve this convergence.

### 4.5 Legal long content

`screens/legal/LegalScreen.js` is the good reference for normal page content:

- explicit localized `writingDirection` for titles and paragraphs;
- a normal logical row for section number + title;
- LTR section-number glyphs;
- common emails, phones, URLs, company names, and store names isolated inside Arabic copy;
- no duplicate top badge when badge and title match.

## 5. Field content-direction contract

The existing four modes are not enough. Extend the shared contract to five explicit modes and require every field to choose one.

| Mode | Empty placeholder | Filled value | Use for |
|---|---|---|---|
| `localized` | App locale | App locale | App-authored localized message templates or copy that is intentionally tied to the chosen language. |
| `adaptive` (new default for arbitrary user text) | App locale | Direction of first strong character; fallback to app locale | Person/business names, event title, category, address, search, ticket subject, free description, notes, mixed guest names. |
| `ltr` | LTR | LTR | Email, URL, username/ID, password, OTP, card/CVC/IBAN, canonical code, raw store price token. |
| `phone` | App locale | LTR after first digit/value | Phone inputs. Keep prefix separate and isolated. |
| `rtl` | RTL | RTL | Fields contractually restricted to Arabic, such as an explicitly Arabic-only localized backend field. |

### 5.1 Adaptive resolver

Add a pure `resolveStrongDirection(value, fallbackIsRTL)` helper. It should:

1. scan for the first strong Arabic or Latin character;
2. return `rtl` for Arabic-script ranges and `ltr` for Latin-script ranges;
3. ignore whitespace, digits, punctuation, emoji, and symbols while scanning;
4. fall back to the selected locale when the value has no strong character;
5. be unit-tested with `Ali`, `علي`, `Halaa 2026`, `حفل Halaa 2026`, an address, emoji-prefix text, and digits-only input.

The field recomputes value direction as the controlled value changes. Label, helper, and error direction never change with the value; they always follow the app locale. This prevents the label/value coupling visible in screenshot 6.

### 5.2 Required field anatomy

Every reusable field must expose the same slots and states:

1. localized label;
2. logical leading semantic icon, if any;
3. value/placeholder using the declared content mode;
4. logical trailing affordance (dropdown, eye, clear, calendar action), if any;
5. localized helper or error;
6. LTR-isolated counter at logical end;
7. focus, error, disabled, and read-only visuals that do not change geometry.

Use one `FormField`/field-shell implementation rather than recreating labels, padding, borders, and errors inside pages.

### 5.3 Field-specific rules

- **Name/event title/search/address/category/ticket subject:** `adaptive`.
- **Long user description/message:** `adaptive` unless product explicitly says the field is Arabic- or English-only.
- **Username:** `ltr` if it is a canonical identifier; otherwise explicitly document allowed scripts.
- **Email/URL/password/OTP/card/IDs:** `ltr`.
- **Phone:** `phone`; prefix and digits are separate LTR tokens.
- **Date/time controls:** display a localized formatted value, never the raw stored `6:30 PM`; the picker/control label follows locale.
- **Dropdown:** localized app-owned options use `localized`; user-created category options use `adaptive`.
- **Read-only mixed text:** use `isolateAuto` or structured nested text runs; do not force it to the page locale.
- **Validation:** labels, helpers, and errors use localized direction even when the underlying token is LTR.

## 6. Text, title, paragraph, and BiDi rules

Create or standardize two text primitives:

- `LocalizedText`: app-authored translated UI copy. Applies locale writing direction and logical alignment; accepts typography roles such as page title, section title, body, description, label, hint, error, and caption.
- `AdaptiveText`: user/backend content whose script can differ from the UI. Uses first-strong direction and optionally `isolateAuto` for mixed runs.

Rules:

- Do not apply physical `textAlign: "right"` to Arabic copy.
- Centering is allowed when the design calls for it, but still set writing direction so terminal punctuation stays at the sentence end.
- Put punctuation inside translation strings, not in JSX concatenation.
- Use i18next interpolation/plural keys; do not build `label + " (" + count + ")"` or `${count} ضيف` in JSX.
- Format counts/dates/times/percent/currency with `@halaa/shared/utils/locale`.
- Inline email, URL, phone, code, Latin company name, store name, and price tokens inside Arabic copy must use `isolateLtr`.
- Mixed backend/user strings use `isolateAuto`; Arabic-specific embedded math can use `isolateRtl` where required.
- A price is one atomic token. Prefer the store SDK’s localized price string. If the UI must render a number plus SAR icon, wrap their row with stable LTR direction so the number/symbol cannot split or reverse.
- Do not use raw `toLocaleString()` at render sites or rely on the device’s implicit locale.

## 7. Icon and control rules

- Directional glyphs—back/forward, left/right arrows, chevrons that mean navigation—must use `DirectionalIonicon` or an equivalent tested directional wrapper.
- Calendar, clock, location, search, plus, close, check, ticket, eye, lock, and brand icons are not direction-flipped.
- A leading semantic icon is at logical start; a trailing action/chevron is at logical end. Model these as named slots, not physical JSX hacks.
- Close buttons in sheets/dialogs normally sit at logical end; back buttons sit at logical start.
- Absolute semantic actions use `start`/`end`. Current physical anchors in create/update floating preview and home actions must be migrated.
- Custom SVG arrows must be wrapped/flipped based on locale or replaced with directional icon primitives. Decorative SVG geometry remains physical.
- Every icon-only action has a localized accessibility label and at least a 44 × 44 target.

## 8. Host component-tree map

Legend: **Green** = preserve/reference; **Yellow** = partial/shared migration needed; **Red** = known bypass or direct-content defect.

| Host route/surface | Component tree / shared owners | Status | Required work |
|---|---|---|---|
| Global shell and app bars | `App.js` → `LanguageProvider` → `TopBar` → bottom tabs | Green/Yellow | Preserve root direction and TopBar. Rename/document logical slots. Verify tab order and label truncation in both languages. |
| Home | `HomeScreen` → `HomeHeaderContent`, `LastEvent`, `MakeYourFirst`, `EventTemplates`, action/send/schedule modals | Yellow/Red | Replace hardcoded Arabic in `MakeYourFirst` and legacy `dropdownModal`; use localized/adaptive text for event/backend values; make semantic floating actions use `end`; audit carousel RTL indexing separately. |
| Event list | `EventsScreen` → `EventList` → `EventListItem`, `StatsCards`, filters | Yellow/Red | Search direction and locale formatting are mostly good. Remove direct Arabic from `TabsSearchAndFilters` and `StatsCards`; isolate title/count/date/status tokens; ensure chips and cards work at 200% text. |
| Event details | `EventDetailsScreen` → actions, stats, guest/moderator rows, send sheets/modals | Yellow/Red | Shared date/location/count utilities are present. Replace direct Arabic alerts/labels in guest/moderator rows; use adaptive guest names and isolated phones/IDs; avoid inline parentheses around tab counts. |
| Create event shell | `CreateEventScreen` → `CreateEventForm` → `TopBar`, `StepHeader`, `PrevAndNextBtns` | Green/Yellow | Preserve logical wizard geometry. Localize previous-button defaults. Change floating preview `right` to semantic `end`. |
| Create/update Step 1 | `StepOne` → shared `TextInput`, `DropdownInput`, iOS picker sheet, `MapPicker` | Green/Yellow | Use as form reference. Add adaptive event name/address behavior. Migrate unused/common `DatePicker` and `TimePicker` to the same contract so other pages cannot regress. |
| Create/update Step 2 | `StepTwo` → `GuestFormSection` → `GuestForm`, `ModeratorForm`, `CategorySelect`, imports, guest lists/edit modal | Red | Apply field-direction metadata to labels/errors; add adaptive name/category values; migrate `CategorySelect` and `CategoryPickerSheet`; localize defaults; format/isolate counts; keep phone LTR. This is the highest-priority screenshot defect. |
| Create/update Step 3 | `StepThree` → template picker/renderer/canvas | Yellow | Shared dynamic fields use the field contract. Audit centered empty/error copy, template/backend names, and carousel/absolute canvas geometry separately. Do not mirror canvas coordinates. |
| Create/update Step 4 | `StepFour` → `DirectionalTextInput`, preview, response options | Yellow | Some text already uses field direction and isolation. Migrate remaining plain hints and hardcoded fallback dictionaries; adaptive message content; verify option-card icon/text order. |
| Create/update Step 5 / summary | `EventSummary`, `EventMetricsGrid`, `PrevAndNextBtns` | Yellow/Red | Use shared date/count formatting only; remove manual Arabic month list; isolate mixed address/template text; localize default button labels. |
| Update event | `UpdateEventScreen` → update wrappers → shared create steps | Green/Yellow | Fix shared steps once. Change floating preview `right` to `end`; localize/align lockout banner with `LocalizedText`. Do not duplicate forms. |
| Marketplace | `Marketplace` → `SearchAndFilter`, category chips, `VendorCards`/`VendorCard`, filter popup, public profile | Yellow | Search primitive is good. Isolate/format TopBar count, rating, price, Latin brand, and mixed location; adaptive search; format price as atomic currency; verify horizontal chip start/scroll behavior. |
| Plans catalog | `PlansScreen`/`BusinessPlansScreen` → `CurrentPlanCard`, plan cards, `PlanPriceBlock`, `InviteSelector`, `PlanDescription`, `AddonsSection` | Yellow/Red | Preserve locale formatting already in `PlanDescription`. Make every price/count ratio atomic and isolated; stabilize SAR row; format current-plan counts; use localized text roles for bullets/headings; test progress-bar origin in RTL. |
| Checkout/summary | `PlansSummaryScreen`/`AddonsPurchaseScreen` → summary cards, disclosures, payment method, legal links | Yellow/Red | Isolate store names, percent/equation/count/price tokens; reuse legal mixed-token rendering; logical icon+paragraph rows; keep store price fail-closed. `PaymentMethodSelector` retains documented physical LTR card geometry only. |
| Payments/return | `PaymentsScreen`, `PaymentReturnScreen` | Yellow | Dates/pages already use locale helpers/isolation. Apply localized text roles to headings/status/body and keep payment IDs/prices LTR. |
| Tickets list | `TicketsScreen` → `TicketCard` | Yellow | FAB already uses `end`. Apply adaptive subject/message/name; isolate/format date, IDs, attachment names, and status values; use localized text roles. |
| Ticket create/update | `TicketModal` | Green/Yellow | Preserve shared modal. Change subject/message to adaptive mode; keep label/error localized and attachment filename adaptive/isolated. |
| Ticket rating | `TicketRatingModal` | Red | It uses a direction-aware textarea but plain title/question/label/error/button text. Apply the full text/field contract and verify star order is intentionally physical (1→5), not locale-mirrored by accident. |
| Settings menu | `SettingsScreen` → `SettingsTabs`, delete section | Green/Yellow | Directional chevrons are good. Apply localized text roles to every row and isolate mixed store/legal text in delete-account disclosures. |
| Account settings | `AccountSettingsScreen` → `AccountSettings`, email verification, `BusinessSettings` | Green/Yellow | Current shared inputs fix the old screenshot. Add adaptive full name/business description; keep username/email/password LTR; migrate section headings, descriptions, logo labels, badges, errors. |
| Notification settings/notifications | common notification screen/components | Yellow | Toggle/action row child order must stay logical; localized titles/descriptions; mixed backend notification values adaptive; dates formatted and isolated. |
| Legal family | privacy, terms, community rules, refund, deletion, support → one `LegalScreen` | Green | Preserve as the long-content reference. Expand token matcher only from proven content cases; verify all six documents and large text. |
| Post-event | post-event screens/components/posts/comments | Yellow/Red | Inputs use direction-aware primitives. Move local bilingual dictionaries/direct Arabic into i18n; adaptive user names/comments; isolate timestamps/links; directional navigation icons. |
| Forced password/profile gates | `ForcePasswordChangeScreen`, `CompleteProfileScreen` | Yellow | Secrets/IDs LTR; labels/errors localized; full name adaptive; same safe-area and keyboard matrix as account settings. |

## 9. Exact current migration targets

### Priority 0: shared contract

1. Add `adaptive` direction to `hooks/useInputDirection.js` and `DirectionalTextInput`.
2. Add `LocalizedText` and `AdaptiveText` primitives or an equivalent shared text-role hook.
3. Add a shared field shell so local forms cannot omit label/error direction.
4. Add price/count/token helpers that return isolated, formatted display strings.

### Priority 1: screenshot-critical forms

- `components/createEvent/_components/GuestForm.js`: plain `inputLabel` and `errorText`; name should be adaptive.
- `components/createEvent/_components/ModeratorForm.js`: same.
- `components/commen/CategorySelect.js`: plain label/value, hardcoded Arabic defaults, user-created values need adaptive direction.
- `components/commen/CategoryPickerSheet.js`: hardcoded Arabic defaults and plain option/title metadata.
- `components/createEvent/EditGuestOrModeratorsModal.js`: local field shell duplicates shared behavior; migrate to the shared shell.
- `components/commen/DatePicker.js` and `TimePicker.js`: labels/values/errors do not use the field contract.
- `components/createEvent/PrevAndNextBtns.js`: hardcoded Arabic defaults.
- `components/admin-dashboard/events/CreateEventForm.js` and `screens/common/update-event/UpdateEventScreen.js`: physical `right` floating preview anchor.

### Priority 2: settings and tickets

- `components/settings/AccountSettings.js` and `BusinessSettings.js`: section metadata + adaptive values.
- `components/settings/_components/EmailVerificationSection.js`: localized badge/action text; keep email/OTP LTR.
- `components/tickets/TicketRatingModal.js`: full text contract.
- `components/tickets/TicketCard.js`: adaptive backend text and isolated dates/IDs.

### Priority 3: plans, marketplace, and normal content

- `components/plans/_components/PlanPriceBlock.js`: make number + SAR glyph one stable LTR price token.
- `components/plans/CurrentPlanCard.js`: locale-format values and ratios; verify progress origin.
- `components/plans/PlanSummaryCard.js`, `PaymentSummaryCard.js`, `DisclosureList.js`: isolate mixed values and store names.
- `screens/common/Marketplace.js` and `components/marketplace/VendorCard.js`: isolate/format counts, rating, price, brand, location.
- Replace direct Arabic visible copy in `MakeYourFirst`, `dropdownModal`, `TabsSearchAndFilters`, `StatsCards`, `GuestListItem`, and `ModeratorListItem` with translation keys.

## 10. Implementation sequence for page-by-page agents

Every agent given a page should follow this order:

1. Trace the page to its shared primitive and determine whether the defect belongs there.
2. Classify every visible text/value as localized, adaptive, LTR, phone, or RTL.
3. Classify every icon as directional, semantic leading, semantic trailing, or decorative/physical.
4. Replace physical semantic styles with logical styles.
5. Replace direct native/local field implementations with the shared field shell.
6. Replace concatenation/raw values with shared locale/BiDi helpers.
7. Test empty and filled states with Arabic and Latin content under both UI languages.
8. Test iOS first, then Android to prevent a cross-platform regression.
9. Record before/after screenshots and the exact shared component changed.

An agent must not add a page-local `isRTL ? textAlign...` branch without proving why the shared resolver cannot express the case.

## 11. Verification matrix

### Automated

Keep the existing tests and extend them:

- input resolver: all five modes, including first-strong adaptive behavior;
- no live `row-reverse`;
- no new physical directional spacing/border properties;
- no direct native input outside low-level primitives;
- no direct visible Arabic UI literals outside reviewed bilingual data/fixtures;
- locale key parity;
- number/date/time/percent/location/plural tests;
- BiDi isolation around parentheses, colon, slash, percent, currency, and sentence-ending punctuation;
- component assertions for field label/value/error direction;
- screenshot fixture coverage for phone, adaptive name, dropdown/category, date/time, ticket modal, account field, plan price, and long paragraph—not only the current generic fields/preview fixture.

### Manual device states

For every migrated host page capture:

| Platform | UI language | Required values/states |
|---|---|---|
| iOS | Arabic | empty Arabic placeholder; Arabic value; Latin value; mixed value; error; disabled; keyboard open |
| iOS | English | same matrix |
| Android | Arabic | same matrix as regression coverage |
| Android | English | same matrix |

Also test smallest supported iPhone, Dynamic Island/call banner, 200% text, long translations, bottom home indicator, VoiceOver order, and sheets with the keyboard open.

### Visual acceptance rules

- Labels/helpers/errors stay at locale start and never jump when the value script changes.
- Empty placeholders follow the UI language.
- Arbitrary filled text follows its own first strong character.
- Phone/email/password/IDs keep stable LTR glyph/cursor order.
- Icons never overlap text and keep their semantic leading/trailing slot.
- Back/forward glyphs point correctly in both languages.
- Mixed prices/counts/store names do not reorder punctuation or split into reversed tokens.
- Long titles/paragraphs wrap from the correct start edge and remain readable at 200%.
- No action is hidden by keyboard, bottom tabs, home indicator, or safe-area changes.

## 12. Definition of done

This host-direction project is complete only when:

1. create and update share the same corrected field components;
2. screenshot 6’s three failures are impossible by construction: labels are localized, `Ali` can be LTR, phone stays LTR;
3. settings and ticket create/update use the same field contract;
4. every host page uses explicit text/content roles rather than inference or physical alignment;
5. mixed plan/checkout/marketplace/legal tokens are formatted and isolated;
6. direct Arabic UI copy has been removed from bilingual host surfaces;
7. semantic icons and absolute actions use logical direction;
8. automated guardrails prevent new bypasses;
9. the complete iOS Arabic/English matrix passes, followed by Android regression verification;
10. before/after evidence exists for every host route group in Section 8.

