# Halaa Check-in UI/UX Recovery Plan

Status: implementation-ready plan  
Scope: `halaa-checkin/web`, Arabic RTL and English LTR, desktop/tablet/mobile  
Evidence: 41 audit PNGs in `halaa-checkin/ui-ux-audit-screenshots`, current source, existing browser/unit tests, and reusable patterns from `halaa-web`

## 1. Product direction

Halaa Check-in is an operational surface for event staff, not a general analytics dashboard and not a decorative luxury microsite. Its visual identity should feel unmistakably Halaa—warm, composed, hospitable, Arabic-first—but its interaction model must optimize for speed, certainty, and recovery under gate pressure.

The redesign must prioritize, in order:

1. Correctness and safety: prevent the wrong guest, event, or destructive action.
2. Speed: a staff member should find or scan a guest and complete admission with minimal movement.
3. State clarity: ready, admitted, duplicate, invalid, offline, pending-sync, and closed must never be confused.
4. Bilingual resilience: long Arabic, English, and mixed-direction content must remain readable.
5. Halaa consistency: reuse the original app's brand assets, semantic colors, icon conventions, table/search behavior, and field patterns where they are mature.
6. Restraint: no glassmorphism, decorative gradients, glowing dashboards, or motion that competes with the gate task.

Target quality is defined by measurable acceptance criteria, not a subjective 9/10 score.

## 2. What to reuse from the original Halaa app

### Reuse or port

| Source in `halaa-web` | What to carry into check-in | Adaptation required |
|---|---|---|
| `public/logo.png` and existing SVG brand assets | Official Halaa brand mark and proportions | Use the vector asset already copied into check-in; remove the extra placeholder letter tile |
| `app/[lang]/globals.css` token families | Primary warm bronze, natural neutrals, success/warning/error semantics | Consolidate into check-in semantic tokens; do not copy duplicate aliases or rem-based root assumptions |
| `react-icons` usage in admin stats and actions | Consistent SVG icon language | Prefer one family, ideally Lucide or React Icons Feather; enforce 1.75–2px stroke and `currentColor` |
| `ui/admin/table` toolbar | Search field with icon, clear focus treatment, grouped actions | Keep accessible native buttons, add clear control, counts, loading state, and responsive composition |
| `ui/commen/inputs/SearchableSelect` behavior | Searchable event selection and keyboard navigation | Preserve check-in's already-better listbox semantics; port only useful filtering/empty/loading behavior |
| `ui/layout/sidebar/ResponsiveSidebar` | Overlay, scroll lock, close-on-outside behavior | Do not bring the 280px sidebar into check-in; use its interaction lessons only |
| shared `StatusBadge` and `utils/statusColors.js` | Cross-product status vocabulary and colors | Add icons only when they improve recognition; never rely on color alone |
| event-detail guest/table actions | Existing Halaa wording and guest-management mental model | Reimplement against check-in APIs and permission rules; do not directly import tightly coupled components |
| common date/time and locale utilities | Familiar date formatting and bidi handling | Keep Riyadh timezone contract and wrap mixed content in `bdi`/`dir="auto"` |

### Do not copy

- The original admin's fixed 280px sidebar: check-in has only two primary workspaces and needs maximum table/scanner width.
- `PopupLayout`: check-in's `Dialog` already has a stronger focus trap, inert background, Escape handling, focus restoration, and reduced-motion support.
- Original admin button implementation without explicit accessible icon labels.
- Hover transforms on operational controls. They introduce visual movement without improving certainty.
- Page-specific hardcoded colors, radii, and font sizes from old admin CSS.
- Pie charts or general admin analytics on the live gate screen.

## 3. Design foundation

### 3.1 Visual concept: Halaa Operations

The memorable element is the admission state panel: calm neutral while waiting, decisive green when admitted, amber for duplicate/attention, and red only for an invalid or blocked action. Everything else stays quiet.

Palette:

| Token | Value | Role |
|---|---:|---|
| `--ops-canvas` | `#F8F5F1` | Warm app background |
| `--ops-surface` | `#FFFFFF` | Primary surfaces |
| `--ops-ink` | `#2C2926` | Main text and high-emphasis actions |
| `--ops-muted` | `#68615B` | Secondary copy; verify AA at each size |
| `--ops-brand` | `#A87545` | Halaa bronze accent, selected controls |
| `--ops-brand-strong` | `#75502F` | Primary action background with white text |
| `--ops-border` | `#E4DDD6` | Default dividers and input borders |
| semantic colors | existing Halaa success/warning/error families | Operational status only |

Do not replace the Halaa palette with black-and-gold. Improve contrast and hierarchy while preserving brand continuity.

Typography:

- Cairo for Arabic and bilingual operational screens.
- Inter for English-only text and numeric data if it is already locally available; otherwise use Cairo consistently rather than adding a network dependency.
- Use tabular numerals for counts, codes, timestamps, and steppers.
- Body minimum 14px desktop and mobile; critical gate copy minimum 16px.
- Page title 22–24px, section title 16–18px, dialog title 18–20px.

Geometry and elevation:

- Radii: 8px controls, 12px standard cards, 16px high-level panels/dialogs.
- One subtle surface shadow only for floating layers and admission-state emphasis.
- Use borders and spacing for ordinary grouping; avoid a shadow on every card.
- Spacing scale: 4, 8, 12, 16, 24, 32, 40, 48.
- Minimum pointer target: 44×44px; primary gate actions: 48px high.

### 3.2 Primitive component work

Create or extend these primitives in `web/components/ui` before page work:

- `Icon`: normalized size, stroke, direction mirroring, and decorative `aria-hidden` handling.
- `IconButton`: 44px target, tooltip/title, accessible name, danger variant.
- `Button`: `primary`, `secondary`, `outline`, `ghost`, `danger`; `sm/md/lg`; leading/trailing icon; loading state that preserves width.
- `TextField`: label, required state, leading/trailing slots, clear button, inline error, hint, disabled/read-only.
- `Select`/`Combobox`: custom trigger/listbox, typeahead, empty/loading states, bidi-safe option content.
- `SegmentedControl`: guests/gate navigation and compact status filters where appropriate.
- `Menu`: keyboard-accessible overflow actions for event and row actions.
- `Dialog`: size variants, sticky header/footer, destructive mode, mobile sheet mode only where content benefits.
- `Toast`/`LiveRegion`: success/error announcements without replacing persistent error context.
- `Skeleton`, `EmptyState`, `InlineError`, and `ConnectionStatus`.

Delete raw Unicode emoji from interface components after icon migration. User-entered emoji content remains valid.

## 4. Global shell and navigation

Affected screenshots: 01–10, 12.  
Primary files: `AppHeader`, `EventSelector`, `WorkspaceNav`, workspace layout, login page.

### Desktop

- Keep a 64px sticky header with three zones: brand/product, event selector, session utilities.
- Render the official Halaa lockup once. Remove the placeholder `L` tile and avoid duplicate Arabic/Latin brand treatments.
- Event selector gets a flexible width `clamp(280px, 34vw, 520px)` and shows full event name in its menu. Trigger can ellipsize only after status/date remain visible.
- Apply `dir="auto"` to event names and venues, and `bdi` to codes, dates, user names, and mixed-language fragments.
- Preserve the current accessible custom listbox. Add optional search only when the event list exceeds eight items.
- Keep workspace navigation immediately below/within the header. Use a compact selected surface, not a decorative underline alone.

### Mobile

- Header becomes two rows, not one compressed row:
  - Row 1: official compact logo, event selector trigger, session menu.
  - Row 2: guest/gate segmented navigation.
- Move language and logout into the session menu; do not show staff name when width is insufficient.
- Keep navigation sticky. Do not add a bottom bar unless device testing proves it improves scanner flow; camera/browser controls already compete for bottom-screen space.
- Event selector opens a full-width anchored popover or sheet with event name, venue, status, and search.

### Login

- Preserve the simple single-task layout.
- Use official branding, a single clear heading, inline credential errors, visible password toggle, loading state, and language switch.
- Confirm autofill, password-manager, Enter-to-submit, keyboard focus order, and error announcement.

Acceptance:

- No horizontal overflow at 320, 360, 390, 768, 1024, and 1440px.
- Long Arabic, long English, and mixed names do not overlap controls.
- Every header action is reachable by keyboard and has a 44px target.

## 5. Guests workspace

Affected screenshots: 06–09, 13, 16–18.

### 5.1 Event summary and actions

- Replace the tall event card with a compact summary bar: name/status first, venue/date second, actions at the opposite edge.
- Primary action is “Add guest”. Import and Export are secondary.
- Move Create event, Event settings, and Close event into an event overflow menu. Create event may remain visible for admins only when no event exists.
- Close event opens a non-dismissable-by-backdrop destructive dialog with final metrics and exact consequences.
- Do not show admin-only event lifecycle actions to receptionists.

### 5.2 Metrics

Desktop:

- Use one compact metrics surface with four cells separated by dividers: invitations, expected party, admitted people, waiting invitations.
- Include one attendance progress indicator using the existing calculated rate; do not add speculative trends without historical data.
- Loading uses skeleton values; refresh does not blank existing values.

Mobile:

- Use a 2×2 grid with 72–88px cells, or a two-row compact summary; never one card per row.
- Place the guest search/toolbar within the first viewport at 390×844.
- Remove nonessential timestamp copy from each metric and keep one shared “updated” line.

### 5.3 Toolbar, filters, and selection

- Search retains server-side behavior, icon, and clear button. Add a 250–350ms debounce indicator without clearing results during refetch.
- Status filters become a segmented control with counts only if counts are available from the same stats response.
- Desktop actions remain aligned on one toolbar; mobile actions use one primary button plus an overflow menu.
- Selection bar becomes a real command bar:
  - selected count;
  - export/print selected passes (existing supported behavior);
  - clear selection;
  - optional bulk delete or bulk admission only after product/API authorization. Do not invent these mutations as a UI-only feature.
- Selection must persist only for the active event and clear on event change.

### 5.4 Table and mobile representation

Desktop:

- Sticky table header within the table scroll container.
- Left/right direction must follow locale, while codes remain LTR via `bdi`.
- Make row name and status scannable; de-emphasize reference and allowance details.
- Replace long inline row actions with a 44px overflow menu. Keep “View QR” as the first menu item; destructive actions separated at bottom.
- Selected and keyboard-focused rows must be distinguishable without color alone.
- Keep pagination and server-side filtering; do not virtualize unless measured row counts require it.

Mobile:

- Do not squeeze the ten-column table. Render a responsive guest list/card view from the same data and actions.
- Each item shows name, short code, status, party allowance, arrival time when admitted, checkbox, and overflow action.
- Tapping the non-interactive body opens a details disclosure; do not trigger an edit accidentally.
- Keep pagination/load-more explicit and preserve scroll position after returning from a dialog.

Acceptance:

- Search, filters, selection, pagination, edit, delete, QR, correction, and reset retain current test behavior.
- A user can reach the search field and first result without scrolling past metrics on 390×844.
- No row action target is below 44px.

## 6. Gate workspace

Affected screenshots: 33–43.  
Primary files: `GateWorkspace`, `CameraScanner`, `ScannerInput`, `GuestLookup`, `AdmissionCard`, `useGate`.

### 6.1 Information architecture

Desktop layout:

```text
┌ Event / connection / last sync ─────────────────────────────┐
├ Scan controls (hardware | camera | manual search) ──────────┤
├ Admission result / waiting state ─────────────┬ Recent ─────┤
│                                               │ admissions  │
└───────────────────────────────────────────────┴─────────────┘
```

- Scanner modes belong in one command surface rather than three equally large stacked cards.
- Hardware scanner remains logically active, but must not steal focus while the user types in manual search or a dialog.
- Camera appears inline as the active mode or in a dedicated full-screen mobile scanner; it does not consume permanent empty space when off.
- Manual results appear directly beneath the search field in a bounded listbox and remain above the fold.
- Waiting state is compact and instructional, not a half-screen empty card.

Mobile order:

1. Event/connection compact strip.
2. Camera primary action and scanner-mode switch.
3. Active scanner/manual surface.
4. Admission result.
5. Recent admissions collapsed by default.

### 6.2 Camera and hardware scanner

- Camera view includes permission request, denied instructions, unavailable state, loading state, active viewfinder, switch-camera control when available, and Stop control.
- Provide a visible scan frame and a short static hint; no continuous decorative animation.
- Rate-limit repeated decodes and show that a code is being resolved.
- Hardware input shows focused/ready state, supports Enter, ignores surrounding whitespace, and returns focus after a completed or dismissed result.
- Keep QR tokens out of logs and visible UI.

### 6.3 Admission state machine

Ready:

- Guest name, short code, VIP if applicable, allowed companions, named companions, and current party size.
- Stepper buttons 48×48px, large tabular value, disabled limits, keyboard +/- support, and clear “total entering now” wording.
- One dominant “Admit X people” button. Button copy updates with party size.

Submitting/pending:

- Disable duplicate submission, retain guest context, show deterministic progress text, and handle lost-response reconciliation using current hook behavior.

Success:

- Strong but restrained success panel, guest name, admitted party size, exact time, and recent-list insertion.
- Optional sound toggle stored per device; default off until tested in the venue. Visual feedback remains sufficient.
- Auto-reset may remain, but show a visible countdown and provide “Keep open”/pause. Respect reduced motion.
- Undo is not added until API permissions and audit semantics explicitly support it.

Already admitted:

- Amber attention state, original admission time and party size, and a clear route to manual search/new scan.
- Re-entry/override is a separate authorized business requirement, never a casual button.

Invalid/wrong event:

- Red error state without leaking guest/event details.
- Actions: Scan again and Search manually.

Offline/lost response:

- Persistent connection banner with queued/pending state.
- Distinguish “not sent”, “may have succeeded”, and “confirmed after retry”.
- Never encourage a second admission until reconciliation completes.

Acceptance:

- Manual results are visible without page scrolling at 1440×900 and 390×844.
- Scan-to-ready and ready-to-admitted each require one deliberate action.
- All state transitions are covered in browser tests: ready, success, duplicate, invalid, wrong event, closed event, offline, timeout/lost response, camera denied.

## 7. Dialog-by-dialog recovery

Affected screenshots: 20–32.

### Shared dialog behavior

- Retain the current check-in `Dialog` accessibility implementation.
- Add `sm/md/lg` widths, sticky footer, optional destructive mode, and mobile sheet/full-screen variants.
- On mobile, short confirmations may remain centered; long forms/import/export should become a bottom sheet or full-height dialog. Do not force every dialog into one pattern.
- First invalid field receives focus after submit; errors are inline and summarized only when multiple fields fail.
- Buttons keep the same action wording before, during, and after completion.

### Add guest / Edit guest (20–23)

- Use a clear two-column desktop form and one-column mobile form.
- Keep labels above inputs; do not use floating labels.
- Inline validation for name, code/reference conflicts, and companion limits.
- Companion stepper uses 44px controls and explains total party size.
- VIP uses an accessible switch/checkbox with a Crown icon, not an emoji.
- Edit mode shows admission restrictions and, if available from current data, a compact admission summary. Do not promise an audit history unless the API exposes it.

### Delete guest (24)

- Warning icon, guest identity, consequence copy, Cancel as initial focus, and destructive button.
- Backdrop click disabled during mutation. Preserve server errors in the dialog.

### CSV import (25–26)

- Larger dropzone with file requirements, choose-file button, drag state, selected-file state, and remove/replace action.
- Preview in a bounded scroll region with sticky header, valid/error row counts, and per-row reason.
- Keep the current supported CSV schema; column mapping is a future feature unless parsing/API contracts are expanded.
- Import button states exactly how many valid rows will be created and how invalid rows are handled.

### Export (27)

- Remove duplicated title.
- Replace native-looking controls with accessible cards/radios for existing export types only: single pass, selected passes, all passes, attendance report.
- Show locale, scope count, file format, event state wording, progress, job failure, retry, and ready/download state.
- Do not advertise Excel or arbitrary field selectors unless backend exports support them.

### QR preview (28)

- Fix the empty region by verifying query response shape, loading/error states, image decode/load failure, and screenshot timing.
- Loading state uses a square skeleton; failure shows retry. Never leave a blank bordered square.
- Display the actual QR at a crisp fixed size with quiet zone; preserve the tested server-generated data URL.
- Actions are a stable vertical stack on narrow screens: Save image, Download A6 PDF, Print/download flow, Close.
- Verify the rendered code is machine-decodable in browser tests, not merely that an `<img>` exists.

### Admission correction/reset (29)

- Show original party size/time and proposed corrected value side by side.
- Explain audit consequences and require a reason only if the API supports storing it.
- Separate correction from full reset visually and semantically.

### Event settings / Create event (30–31)

- Keep a single-page form unless field count grows materially; avoid an unnecessary wizard.
- Group General details and Gate policy with section headings.
- Use the existing accessible date/time behavior or port mature Halaa inputs after dependency review.
- Add inline validation, timezone labeling, dirty-state protection, and clear save feedback.
- Logo/banner upload is out of scope unless the check-in event contract supports branding fields.

### Close event (32)

- Show invitations, admitted people, pending invitations, last admission, and what closing disables.
- Require explicit confirmation; disable backdrop close while submitting.
- Return focus to the event action menu and update all workspace state after success.

## 8. Known source defects and cleanup targets

Address these during foundation work:

- `StatsStrip.module.css` uses invalid `justifyContent`; replace with `justify-content`.
- Multiple CSS files reference undefined or inconsistent aliases such as `--radius-default`, `--color-success`, and `--font-cairo`; consolidate aliases.
- App metadata/comments refer to older Next/React versions while package files use Next 15 and React 19; update documentation.
- Raw emoji occur throughout gate, guest, export, stats, and notice components.
- QR preview renders no explicit empty/error fallback when data is absent without a surfaced query error.
- Mobile stats intentionally collapse to one column at 480px, causing the observed full-screen stack.
- Gate switches to one column at 960px but does not reorder/prioritize controls for the task.
- Event/header actions expose too many equal-weight buttons.
- The screenshot catalog count in the external review is incorrect: there are 41 PNGs.

## 9. Delivery phases

### Phase 0 — Baseline and contracts

- Preserve current screenshots and produce a route/state matrix for all 41 images.
- Record Lighthouse accessibility baseline and axe results for login, guests, and gate in both locales.
- Add visual-regression fixtures at 320×800, 390×844, 768×1024, 1024×768, and 1440×900.
- Add mixed-direction fixtures: Arabic name, English name, Arabic event with English venue, long staff/event names.
- Freeze business behavior: permissions, event lifecycle, export types, offline reconciliation, and check-in transitions.

Exit: tests document current behavior and no visual implementation has started.

### Phase 1 — Tokens and primitives

- Consolidate tokens and fix invalid CSS declarations.
- Add icon dependency and primitives listed in section 3.2.
- Migrate base focus, disabled, loading, error, and target-size behavior.
- Add Storybook only if already acceptable to the repo; otherwise extend `primitives-showcase.html` into a real app-only development route/test fixture.

Exit: primitive states pass AA contrast, keyboard, RTL/LTR, reduced-motion, and 44px target checks.

### Phase 2 — Shell and login

- Rebuild responsive header/event selector/navigation.
- Repair bidi truncation and session utility overflow.
- Polish login fields, errors, loading, and branding.

Exit: shell and login acceptance criteria pass at all breakpoints/locales.

### Phase 3 — Guests workspace

- Compact event summary and metrics.
- Rebuild toolbar/selection command bar.
- Add desktop sticky table and mobile guest-list representation.
- Migrate row actions and all related dialogs except export/QR.

Exit: first guest result is visible on mobile; all existing guest browser tests pass.

### Phase 4 — Gate workspace

- Implement unified scanner modes and responsive layout.
- Redesign the full admission state machine.
- Add camera permission/recovery UI and focus ownership rules.
- Add optional configurable sound only after venue/user validation.

Exit: gate operator can complete tested scenarios without scrolling/search-result obstruction or ambiguous state.

### Phase 5 — Import, export, QR, lifecycle

- Rework import and export flows.
- Diagnose and fix QR blank/loading/error behavior and add pixel/decode verification.
- Complete settings/create/close/correction dialog treatments.

Exit: every screenshot state has a corresponding verified replacement state.

### Phase 6 — Hardening and field validation

- Run automated accessibility plus manual keyboard, screen-reader smoke, 200% zoom, reduced-motion, and forced slow-network tests.
- Test real iPhone/Android devices, USB/Bluetooth scanner, camera permissions, and outdoor/high-glare contrast.
- Conduct five-task operator test: select event, find guest, scan/admit party, recover duplicate, resolve invalid code.
- Fix regressions, update screenshots, and compare before/after.

Exit: no P0/P1 usability or accessibility findings; product owner signs off operational and visual behavior.

## 10. Test and evidence matrix

Each phase must ship with:

- Unit tests for primitive states and state derivation.
- Browser tests in Arabic and English for keyboard and pointer paths.
- Accessibility scan with no serious/critical violations.
- Screenshot evidence at defined viewport sizes.
- A manual checklist for scanner hardware/camera cases that automation cannot reproduce faithfully.
- Build, lint, existing API/contract tests, and end-to-end check-in journey passing.

Critical visual assertions:

- QR image is loaded and decodes to the expected test payload.
- Search results stay within the viewport and are not clipped by stacking contexts.
- Dialog footer remains reachable with 200% zoom and mobile keyboard open.
- Focus is visible and restored after every dialog/menu.
- Status always has text/icon in addition to color.
- No action disappears solely because of locale or text length.

## 11. Definition of done

The recovery is complete only when:

- All 41 original screenshot scenarios have explicit replacement evidence.
- All current product behavior remains supported or has an approved contract change.
- Arabic RTL and English LTR pass identical task journeys.
- 320px mobile has no unintended horizontal page scrolling.
- All interactive targets meet 44px minimum, with 48px for primary gate controls.
- There are no raw system emoji used as UI icons.
- No blank loading/error regions exist, especially QR and camera.
- Destructive actions require deliberate confirmation and respect permissions.
- Gate search and scan workflows remain above the fold at target devices.
- Accessibility, build, unit, browser, API, contract, and end-to-end suites pass.
- A real staff member can complete the five operator tasks without assistance or ambiguous recovery.

## 12. Recommended first implementation slice

Start with Phase 0 and Phase 1, then deliver one vertical slice before broad restyling:

1. New icon/button/field/status primitives.
2. Mobile shell repair.
3. Compact mobile guest metrics.
4. QR preview loading/error/decode fix.
5. Visual regression evidence for those states.

This slice removes the most visible defects, validates the new design language, and avoids destabilizing the reliable business logic before the gate workspace is rebuilt.
