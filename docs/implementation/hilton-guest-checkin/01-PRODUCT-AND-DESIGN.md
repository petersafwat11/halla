# Product and visual contract

## 1. User outcome and scope

Before the event, the administrator enters/imports guests and gives the hotel their QR PDFs for distribution. During the event, two receptionists scan and confirm actual arrival counts. Afterwards, the administrator closes the event and exports an attendance report.

| Included in v1 | Explicitly deferred |
| --- | --- |
| Event selector and create/edit dialog | Event marketing website or public invitation page |
| Guest CRUD, search, attendance filters, pagination | RSVP or guest confirmation |
| Allowed companion count and optional names | Seating, payments, vendors, Halaa subscriptions |
| UTF-8 CSV preview and atomic import | Native XLSX, contacts, phonebook import |
| Single/selected/all QR PDFs and browser print | WhatsApp, SMS, email sending, delivery tracking |
| Camera, keyboard scanner, manual search | Offline admission or background admission sync |
| Preview then confirm actual arrival count | Separate admission of late companions |
| Duplicate protection and audited admin corrections | Companion-level presence tracking |
| Attendance report and event closure | Complex analytics or a third dashboard screen |

Optional names do not change the attendance calculation. The UI must say that they are reference names, not individually checked-in people. The lead guest must be present; reception enters the companions present with that guest. This is a deliberate v1 policy. Do not invent partial or later companion admission.

## 2. Routes and navigation

- `/` redirects to `/ar/guests` after authentication; unauthenticated users go to `/ar/login`.
- `/{lang}/login`: supporting login screen, with `lang` limited to `ar|en`.
- `/{lang}/guests?eventId=<id>`: administrator workspace.
- `/{lang}/gate?eventId=<id>`: reception workspace; accessible to admin and assigned receptionists.
- A receptionist opening Guests is redirected to Gate; direct forbidden API requests still return 403.
- Language switch preserves route/event. Event switch clears selections, search results, guest dialogs, scan results, and pending confirmation; abort stale requests and camera scans.
- Empty event list: admin sees “Create your first event”; receptionist sees “No event assigned. Contact your administrator.” No sample data appears automatically.

Desktop header: existing Halaa logo, product name, event selector, language toggle, logged-in staff name/role, logout. Under it, two clear navigation items: Guests and Gate. Receptionists see Gate only. Use compact navigation suited to two destinations; do not copy the entire Halaa sidebar menu.

## 3. Existing design system is mandatory

### Authoritative files and reuse strategy

| Source (repository-relative) | What to use |
| --- | --- |
| `halaa-web/app/[lang]/globals.css` | Complete first `:root` custom-property block: live palette, semantic tokens, spacing, radii, typography, line heights, icon sizes |
| `halaa-web/styles/tokens.web.js` | Reference inventory and semantic group names; subordinate to live CSS where they differ |
| `halaa-web/app/[lang]/fonts.js` and `layout.js` | Current Cairo font loading and applied body font |
| `halaa-web/ui/commen/button/Button.jsx` and `button.module.css` | Button proportions, weight, radius, active/hover/disabled patterns |
| `halaa-web/ui/commen/new-table/Table.js` and `table.module.css` | Guest-table surface, header, search, selection, pagination styling |
| `halaa-web/ui/commen/popup/PopupLayout.jsx` and `popup.module.css` | Modal visual reference; implement missing keyboard/focus behavior locally |
| `halaa-web/ui/layout/header/header.module.css` | Header height, spacing, white surface |
| `halaa-web/app/[lang]/host/layout.module.css` | Artboard and page-spacing reference |
| `halaa-web/public/svg/events/sidebar-logo.svg`, `sidebar-mobile-logo.svg`, `halaa-web/public/svg/logo.svg` | Existing brand assets; inspect actual artwork before choosing desktop/mobile variants |

Create a **versioned local presentation snapshot** under `halaa-checkin/design/`, copied by a small script from the sources above. Store the entire root token block, not just the palette excerpt below. Record source paths and SHA-256 hashes in `design/SOURCES.json`. Check in the generated snapshot so the mini app can build from its own directory without the Halaa source tree. Provide `design:sync` (explicit refresh) and `design:check` (compare when parent sources exist). A parent-source update should report drift for deliberate review; never rewrite design assets automatically during production startup.

Do not import the original global stylesheet wholesale: it includes global utility rules and feature-specific styles. Do not import the original providers, auth, table business logic, toast configuration, or API client. Build small local presentation primitives with the same styling and accessible behavior.

### Verified token excerpt

| Role | Existing CSS variable | Verified value |
| --- | --- | --- |
| App background | `--bg-artboard` | `#f9f4ef` |
| Surface | `--color-natural-50` | `#ffffff` |
| Primary | `--color-primary-500` | `#c28e5c` |
| Primary hover | `--color-primary-600` | `#b18154` |
| Primary pressed / strong brand ink | `--color-primary-800` | `#6b4e33` |
| Soft brand surface | `--color-primary-100` | `#f5ece4` |
| Secondary | `--color-secondary-500` | `#524438` |
| Main text | `--text-body` | natural 900, `#2c2c2c` |
| Supporting text | `--text-description` | natural 450, `#656565` |
| Form border | `--form-border` | natural 250, `#dfdfdf` |
| Success | `--color-success-500` / `--color-success-50` | `#2a8c5b` / `#eaf4ef` |
| Warning | `--color-warning-500` / `--color-warning-50` | `#d38200` / `#fbf3e6` |
| Error | `--color-error-500` / `--color-error-50` | `#c0392b` / `#f9ebea` |

**Known discrepancy:** JS `backgrounds.artboard` is `#fcfaf8`; live CSS `--bg-artboard` and the host layout use `#f9f4ef`. Use the latter. JS declares Inter for English and Cairo for Arabic, but the live root layout applies Cairo. Use Cairo for both locales to match the actual client UI; preserve all declared font tokens in the snapshot. Load Cairo locally in web and PDF contexts, include font licenses, and require no runtime Google Fonts request.

Use the full existing scales: spacing 4–100 px in steps of 4; radii 4/8/12/16/20 px; 32/28/24 px heading options; 16/14/12 px body; 400/500/600 weights; 20/24 px body line heights. Default surface/button radius is 12 px. Use existing semantic `--btn-*`, `--form-*`, `--text-*`, `--border-*` variables, not fresh literal colors in component CSS.

The current app uses a 62.5% root font-size and rem-based legacy component dimensions. For the mini app use a 100% root font-size with the existing **px-valued tokens**, so user font preferences work and copied `1.6rem` values do not accidentally become 25.6 px. Convert copied rem dimensions to their intended pixel/token equivalent; compare rendered dimensions to Halaa. Inputs remain at least 16 px on phones.

Known accessibility issue: white 16 px text on primary 500 may not meet normal-text contrast. Preserve the palette, but use existing primary 700/800 for solid text-button backgrounds when necessary, and primary 500 for brand accents. Record this local semantic alias and measured contrast; do not change the parent theme. Status text similarly uses darker existing status shades on the light status background. No new hex colors to solve contrast.

### Visual direction and review

Plan: warm Halaa artboard, white work surfaces, brown primary actions, Cairo, clear left/right-aligned text according to locale. Guest operations own the page; event identity is a compact header, not a marketing hero. Gate concentrates attention on the guest name and confirmation.

```text
Desktop Guests
[Halaa + product] [Event selector]            [العربية] [Staff / logout]
[Guests] [Gate]
[Event name, venue, date, state]              [Event settings]
[Invitations] [Expected people] [Admitted people] [Pending invitations]
[Guest list]             [Import CSV] [QR PDFs] [Attendance report] [+ Add]
[Search................................] [All / Admitted / Pending]
[Select | Guest | Companions | Total allowed | Status | Arrival | Actions]
[Pagination]                            [Selected count / clear]

Desktop Gate
[Same Halaa header; event identity always visible]
[Camera / code input........] [Guest name, allowance, optional names...]
[Start/stop camera..........] [Actual companions: minus / number / plus]
[Manual guest search........] [Confirm admission......................]
[Connection + last refresh..] [Result / scan next......................]

Mobile Gate
[Halaa] [Event] [Language]
[Camera / scanner input]
[Guest preview]
[Count control]
[Large confirm action]
[Connection and manual search]
```

Review outcome: retain Halaa's palette and recognizable work-surface/button geometry; reduce full-dashboard chrome to two destinations. Do not add hotel photography, oversized statistics, decorative gradients, serif headlines, or invented Hilton logos. This is a same-client operations product.

## 4. Guests workspace

Event settings dialog: event name, venue, local event date/time (Asia/Riyadh), status. Interpret date/time input in Riyadh even when the administrator's device is in Cairo or UTC; serialize with explicit `+03:00` offset and store UTC. Status transitions are Draft → Live → Closed, with audited admin-only reopening. Initial seed is explicitly labeled “Hilton Riyadh — demonstration”; actual event details are editable.

Summary definitions come from the API, independent of table filters. During an event use “Pending invitations”; reserve “Did not attend” for the closed-event report. Display last refresh; refresh every 5 seconds while visible and on focus, plus after mutations. Never render failed requests as zeros.

Table columns: selection, guest name, optional reference, allowed companions, total allowed, attendance status, actual party count if admitted, check-in time, actions. Companion names belong in the detail/edit dialog rather than a wide default column. Primary row actions: View QR, Edit, Delete. Admitted invitations show an admin correction action; do not make ordinary edit overwrite attendance.

- Search is server-side, 300 ms debounce; escaped literal substring, Arabic/English friendly, no regex injection. Filter: all/admitted/pending. Stable name + ID ordering; 25 rows default, 100 maximum.
- Header checkbox selects the current page only. Selection persists across page changes within the same search/filter; clear on search/filter/event changes. Say “N selected”. Export all means all active invitations in the event, regardless of current table filter; selected means exactly the selected IDs.
- Add/edit: required name, optional reference, integer allowed companions 0–20, optional companion names (one per line). Helper: “Total allowed includes the invited guest.” Reject more names than allowance. Never require a phone number.
- Allow duplicate guest names. Show the reference and invitation short code to distinguish them. A matching name alone is not an error.
- Delete requires confirmation and is soft deletion. Admitted guests cannot be deleted until an explicit audited admission reset. Closed events cannot have list changes.
- Validation appears beside fields; failed saves preserve input; submit disables while pending; successful mutations invalidate list/stats. Version conflict offers reload, never silent overwrite.
- Empty list shows Add guest / Import CSV. No search matches offers Clear filters. Failed loading offers Retry. Bulk QR for empty selection/list is disabled with a useful reason.

## 5. CSV import

Provide a downloadable UTF-8 BOM template and an example in both UI languages. Fixed machine headers:

```csv
name,allowedCompanions,companionNames,reference
Ahmed Hassan,2,Sara Hassan|Omar Hassan,INV-001
نورة عبدالله,0,,INV-002
```

Names with commas must be quoted using CSV rules. Require these four headers exactly once (order may vary); optional columns have blank values, not missing headers. Companions are pipe-separated; a blank companionNames cell becomes an empty array. A blank allowedCompanions cell is an error, not an implicit zero. Reference is optional but, if supplied, unique among active invitations in an event. It allows duplicate-import detection without treating a person's name as unique.

Flow: choose file → preview valid/error rows and totals → confirm import → atomic commit. Limit 2 MB and 1,000 data rows, also respecting remaining event capacity. Preview never writes. Show row numbers and concrete errors. One invalid row prevents commit; no silent truncation, coercion, partial success, or silently skipped duplicates. Warn about matching name/companion combinations; these are informational and may be legitimate. Server revalidates on commit, including uniqueness against data added after preview. Preserve original CSV during the dialog and send it again on confirmation; use a stable idempotency key across retry.

## 6. Gate workflow and states

1. Receptionist signs in and selects an assigned live event.
2. User explicitly starts the camera; request rear-facing camera with `playsInline`. Also support a USB/Bluetooth scanner that types the QR payload plus Enter into a dedicated field.
3. QR decode stops the scan loop and calls resolve. A successful lookup **does not admit anyone**.
4. Preview shows name, reference/short code, allowed companions, optional names, total allowed and current admission status.
5. Actual companions defaults to 0 each time. Reception selects 0…allowedCompanions. Prominent helper: “Including the invited guest: N people.” The confirm button says “Admit N people”.
6. Server-confirmed result shows success, actual count, time, and receptionist. The next explicit action is “Scan next guest”. Reset counts and resume only then.

| State | Required behavior |
| --- | --- |
| Idle | Start camera, scanner field and manual search available |
| Camera permission denied / unavailable | Clear instructions; scanner/manual methods remain usable |
| Resolving | Show busy state; ignore additional frames; disable confirmation |
| Ready | Show guest + count; require deliberate confirmation |
| Submitting | Lock count/guest; maintain idempotency key; no optimistic success |
| Admitted | Green message with text/icon, party count and recorded time |
| Already admitted | Warning with original admission details; no second confirm |
| Unknown/wrong-event QR | No guest details; show “Invitation not valid for this event” |
| Closed/draft event | No admission; explain status |
| Network failure before confirm | Keep preview but block admission until revalidated |
| Confirm response lost | Show “Admission status not confirmed”; retry the SAME request/key, or reload status. Never say rejected/success without evidence |
| Session expired | Stop camera, hide guest data, preserve only necessary retry intent in memory; sign in and resolve server state before further action |

Manual search calls the authenticated event-scoped lookup; results show distinguishable name/reference/allowance/status. Selecting a result enters the same preview/confirmation flow. Staff can never search unassigned events. Do not provide a broad downloadable guest list to reception users.

Use `jsqr` with `getUserMedia` for cross-browser decoding, not `BarcodeDetector` as the only implementation. Decode at a bounded frame rate; maintain one active resolve/submit request. Stop tracks on navigation, event switch, logout, unmount, and backgrounding; user resumes after returning. No camera prompt on page load. No QR token in location URLs, analytics, logs, or localStorage.

Connection indicator comes from recent successful API checks plus browser connectivity. “Online” is not proof the last write succeeded. When data becomes stale, show timestamp/warning; do not silently trust a cached allowance. Re-resolve a preview older than 30 seconds before confirmation, and always validate at the server.

## 7. PDFs and report panel

QR dialog offers preview, download single PDF, and print. Bulk panel offers selected/all, language and progress. PDFs use Halaa assets/tokens/Cairo, event name, venue, local date/time, guest name, companions allowed, total allowed, short code and “Present this QR at the entrance”. No RSVP wording or contact details.

Single pass: A6 portrait. Bulk: A4 portrait with four A6-style passes per page and safe cut margins. QR is black on white with four-module quiet zone, at least 35 mm square at print size, error correction M or better, no logo overlay. This functional black/white uses existing token colors. Long names wrap; do not shrink QR or clip Arabic names. Companion names stay in the management/gate detail view; passes and report rows show companion counts, keeping print layouts clear even for 20 companions.

Report panel displays totals and offers PDF language selection. On live/draft events the PDF says “Interim report” and “Not yet admitted”. On closed events it says “Final attendance report” and “Did not attend”. Include event identity/state, snapshot time and Asia/Riyadh timezone, totals, attended guest list with actual count/time/operator, and non-attended guest list. Label companion names as invited/reference names; do not mark them individually present.

## 8. Accessibility and localization checks

- All visible strings in locale dictionaries; Arabic and English key parity checked. Arabic default, English fully usable.
- Logical CSS properties (`margin-inline`, `inset-inline-start`, `text-align: start`); numbers/short codes in `bdi` as needed. Never reverse QR/camera media through RTL styles.
- Actual HTML `lang` and `dir` set by route. Names rendered with `dir="auto"`. Arabic and mixed-script names wrap safely.
- Focus trap, Escape, labeled title and focus restoration for dialogs; proper table headers and labeled checkboxes; keyboard-operable menus and count controls.
- Visible keyboard focus, at least 44 px touch controls, 16 px phone inputs, `aria-live` status messages; color is never the sole status signal.
- Respect reduced motion. Scanner success must not depend on sound/vibration.
- Verify 1440×900, 1024×768, 390×844 and 360×800 in both languages. Confine wide table scrolling to its container; gate must not require horizontal scrolling.
