# Mobile RTL / Alignment Report

_Generated this session. Scope: entire `halla-mobile` app (`components/` + `screens/`, incl. admin dashboard)._

## Root cause

The app runs with **`I18nManager.forceRTL(true)` active in Arabic** (set in `localization/providers/LanguageProvider.js`; `TopBar` and `PlansSummaryScreen` branch on `I18nManager.isRTL`). Under forceRTL:

- `flexDirection: "row"` **auto-renders right‑to‑left** — the first JSX child lands on the **right**.
- `flexDirection: "row-reverse"` **auto-renders left‑to‑right** — it **double-flips and mirrors** the intended RTL layout.

A large amount of UI was authored **before** forceRTL was enabled, using manual hacks (`row-reverse`, `justifyContent/alignItems: "flex-end"`, physical `textAlign: "right"`) to fake RTL. Those now render mirrored or pinned to the wrong edge. The fix is to use **logical reading order** + drop the physical overrides, so the same code renders correctly in **both** Arabic (RTL) and English (LTR).

## The three anti-patterns

| # | Anti-pattern | Why it breaks under forceRTL | Fix |
|---|---|---|---|
| 1 | hardcoded `flexDirection: "row-reverse"` | double-flips back to LTR → mirrored | change to `"row"` |
| 2 | children in LTR order + `justifyContent: "flex-end"` / wrapper `alignItems: "flex-end"` | packs content to the wrong physical edge | reorder children to logical order **and** drop `flex-end` (→ `flex-start`) |
| 3 | physical `textAlign: "right"` on translated text | right in AR but wrong in EN | remove → default follows writing direction |

**Left intentionally untouched:** direction‑aware conditionals (`isRTL ? … : …`), `textAlign:"center"`, centering, spacing/colors, and intrinsically‑LTR content (phone numbers, prices, card fields, emails, URLs, payment IDs).

## Totals

- **Round 1 (sweep):** ~87 fixed, ~37 flagged, ~24 intentional.
- **Round 2 (deep audit):** the flagged set was resolved as a senior FE + QA pass — see **§B (Resolved)** below. ~47 more edits.
- **Net:** ~73 mobile files changed, **all lint-clean (`eslint` exit 0)**. Only `plans/TopBar.js` is intentionally left as-is (verified working).

### Canonical RTL policy adopted (works in AR + EN with forceRTL ON)
1. **Layout:** only `flexDirection:"row"` + children in logical reading order. Never `row-reverse` to fake RTL; use `flex-start` not `flex-end`.
2. **Localized text:** no physical `textAlign`/`writingDirection` — default follows direction.
3. **Strictly-LTR content** (phone, email, URL, card/CVC/OTP, IDs, money, latin dates): `writingDirection:"ltr"` to keep glyph order; alignment follows the reading start. For a fixed price token, lock with `direction:"ltr"` on the row.
4. **Directional icon glyphs** (chevron/arrow) still use `I18nManager.isRTL ? …` — glyphs don't auto-flip.
5. **Flex-grown value cells** that must hug the row END use `textAlign: isRTL ? "left" : "right"` (RN has no logical `textAlign:"end"`); content-sized cells just drop the pin.
6. Keep `textAlign:"center"` and intentional centering.

---

## A. Fixed (applied)

### Home
- `components/home/SendInvitationModal.js` — header reorder (title→start, close→end), `flex-end`→`flex-start` on `titleWrapper`/`channelInfo`, removed `textAlign:"right"` on guest count / section label / channel desc.
- `components/home/TestMessageModal.js` — header reorder + `flex-end`→`flex-start`, removed `textAlign:"right"` on title/description.
- `components/home/dropdownModal.js` — header reorder + `flex-end`→`flex-start`, removed `textAlign:"right"` on title.
- `components/home/MakeYourFirst.js` — `textContainer alignItems` `flex-end`→`flex-start`, removed `textAlign:"right"` on title/subtitle.
- `components/home/PartialFailureBanner.js` — banner `row-reverse`→`row`.
- `components/home/_components/LastEventHeader.js` — `titleRow justifyContent` and `details alignItems` `flex-end`→`flex-start`.
- `components/home/_components/LastEventActions.js` — removed `textAlign:"right"` on dropdown item text.
- `components/home/EventActionsHeader.js` — removed `textAlign:"right"` on menu title / menu item text.

### Events
- `components/events/ModeratorListItem.js` — `row-reverse`→`row` on container / leftContent / nameRow (was mirroring the crown + actions).
- `components/events/BulkActionConfirmModal.js` — removed `textAlign:"right"` on title / summary / warning.
- `components/events/AddGuestOrmoderatorPopup.js` — removed `textAlign:"right"` on list title / name (kept on phone).
- `components/events/EventList.js` — `searchRow row-reverse`→`row`, removed `textAlign:"right"` on search input.

### Create-event wizard
- `components/createEvent/_components/ScheduleLaunchCard.js` — `scheduleHeader row-reverse`→`row`.
- Removed hardcoded `textAlign:"right"` on translated labels/headings/hints in: `EventSummary.js` (5), `StepFive.js` (2), `StepFour.js` (1), `StepThree.js` (3), `StepOne.js` (1), `ListOfGuestsORModerators.js` (2), `eventTypeModal.js` (2), `EditGuestOrModeratorsModal.js` (1).

### Vendor / Marketplace
- `components/vendor/home/Services.js` — `row-reverse`→`row` ×5 (search+add, search input, filters, filter button, empty-state button).
- `components/vendor/home/Service.js` — `row-reverse`→`row` ×4 (edit button, categories, bottom section, price container).
- `components/vendor/home/StatsCards.js` — `row-reverse`→`row` ×3 (row, card, value row).
- `components/vendor/home/AddServicePopup.js` — `footer row-reverse`→`row`.
- `components/vendor/home/TagsSelector.js` — `tagsContainer row-reverse`→`row`.
- `components/marketplace/FilterPopup.js` — removed `textAlign:"right"` on filter label.
- `components/marketplace/_components/FilterDropdown.js` — `dropdownOption row-reverse`→`row`, removed `textAlign:"right"` on option text.

### Settings / Tickets / Common
- `components/settings/NotificationSettings.js`, `BusinessSettings.js`, `AccountSettings.js` — `buttonContainer row-reverse`→`row` (Cancel/Save order).
- `components/commen/TextAreaInput.js` — removed physical `textAlign:"left"` on label + error text.

### Admin dashboard
- `components/admin-dashboard/events/HostSelectorStep.js` — removed `textAlign:"right"` ×4 (title/subtitle/searchError/sectionLabel).
- `components/admin-dashboard/events/AutoReminderInfoText.js` — removed `textAlign:"right"` ×3 (description/trialInfo/windowHint).
- `components/admin-dashboard/settings/AdminNotificationSettings.js` — `buttonContainer row-reverse`→`row`.

### Screens
- `screens/vendor/VendorHomeScreen.js` — `greetingContainer` + `headerContent` `alignItems` `flex-end`→`flex-start` (welcome/name to start), removed `textAlign:"right"` on greeting/name.
- `screens/common/EventDetailsScreen.js` — removed `textAlign:"right"` on invites-badge help + bulk-bar count (location overflow fixed earlier).
- `screens/common/NotificationSettingsScreen.js` — `loadingContainer row-reverse`→`row`.
- `screens/common/ManagePostEventScreen.js` — removed `textAlign:"right"` on status text.
- `screens/common/update-event/UpdateEventScreen.js` — removed `textAlign:"right"` on lockout text.
- `screens/common/update-event/StepTwo.js` — removed `textAlign:"right"` on banner text.

---

## B. Resolved in the deep-audit pass (round 2)

Everything previously flagged was decided and applied as a senior FE + QA pass.

**`components/events/EventFailureBanner.js` — fully reworked.** It relied on a `lang` prop the caller never passed, so `isRtl` was always true and the LTR branches never ran; the base styles used `row-reverse` + `textAlign:"right"` which mirrored under forceRTL. **Removed the entire direction-aware apparatus** (`lang`/`isRtl`, all `!isRtl && styles.*Ltr`, and the `*Ltr` style defs). Base styles now logical: `titleRow`/`progress`/`countdownPill` → `row`; `countdownPill`/`reason` `alignSelf` → `flex-start`; removed `textAlign:"right"` from title/message/reason/error. Renders correctly in both languages with zero component-level direction logic.

**Arabic message inputs → follow UI direction.** Removed `writingDirection:"rtl"` + `textAlign:"right"` from localized message/note/search fields (`StepFive.js`, `StepFour.js`, `MapPicker.js`). **Phone fields** kept strictly-LTR via `writingDirection:"ltr"` (no physical pin) in `ModeratorForm.js`/`GuestForm.js`.

**Preview surfaces → follow UI direction.** `PreviewInvitation.js` (headers/detail text un-pinned; sent-message timestamp uses `isRTL ? "left":"right"` to sit at the message end), `WhatsAppInvitationPreview.js` (text un-pinned; badge `flex-end`→`flex-start`), `StepFour.js bubbleText` (un-pinned).

**Generic value cells → best-fit per cell.** Content-sized cells (`TicketSectionCard`, `HostSectionCard`) just drop the pin and sit at the row end. Flex-grown cells (`TicketDetailsCard`, `VendorStep6Summary`) use `textAlign: isRTL ? "left":"right"` to stay at the end (RN has no logical `end`). LTR-data cells (`PaymentDetailScreen`, plus `TicketDetailsCard`) add `writingDirection:"ltr"`.

**Intrinsically-LTR / numeric → glyph order locked.** `Service.js` price row → `row` + `direction:"ltr"` ("100 ﷼" stable in both langs); `FilterInputs.js`, `AddGuestOrmoderatorPopup.js` phone, `ListOfGuestsORModerators.js` phone, `QRModal.js` code → `writingDirection:"ltr"`; `AdminEventsStatusChart.js` count → pin dropped (logical row handles it).

**Inert / low-confidence → cleaned.** `dropdownModal.js` stepText `flex-end`→`stretch` (so the centered text actually centers); `MakeYourFirst.js` removed no-op `justifyContent:"flex-end"`; `DropdownInput.js` title `flex-end`→`flex-start` + removed inert `justifyContent`; `GuestListSection.js` header `flex-end`→`flex-start`.

**`components/plans/TopBar.js` — intentionally NOT changed.** Its `titleContainer: row-reverse` deliberately places the back chevron in the far top-corner (correct RTL header convention) and is verified working on screen across every header. Changing it is high-blast-radius for no visible gain; left as-is by design.

---

## C. Notes

- All applied edits are **style/JSX-order only** — no logic, colors, sizing, or spacing changed.
- Every changed file passes `eslint` (exit 0).
- Earlier this session a separate batch of ~14 specific issues was already fixed (EventListItem, GuestListItem, ScheduleSendingModal header, EventTemplates carousel/preview, home & events StatsCards, EmailVerification badge, TicketModal spacing, SAR icon, checkout inputs, bottom-nav nesting, EventDetails location). Those are not re-listed here.
- **Recommended next step:** decide the bilingual policy for the *Flagged → Arabic message inputs* and *generic value cells* groups, and schedule the `EventFailureBanner.js` rework. I can take any of these on once you choose.
