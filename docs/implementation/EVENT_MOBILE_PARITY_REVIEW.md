# Web-to-mobile event parity review — 2026-09-08

## Scope and evidence

Reviewed the event-related web fixes recorded in EVENT_E2E_CHANGELOG.md and EVENT_E2E_RESULTS.md against the corresponding mobile create/update, host dashboard, shared host/admin details, messaging, media, import and scheduling paths. Further real E2E sends were paused for this review. This is code and build verification, not a native-device or production-readiness sign-off.

## Comparison matrix

Paths below are relative to `halaa-mobile/` unless marked shared/backend. “Existing parity” means code inspected; it does not mean visually verified on a device.

| Web fix / expected behavior | Mobile finding and action | Main affected paths |
|---|---|---|
| Admin-on-behalf previews use the host | Existing owner prop plumbing retained through create/update/summary. Fixed update loading to retain template variable mappings and buttons. | components/admin-dashboard/events/CreateEventForm.js; screens/common/update-event/useEventLoadAndGate.js; UpdateEventStepRenderer.js |
| Admin self-event versus host ownership | Added explicit localized owner-card labels for admin self-owned and host-owned events. Balances already come from the event owner payload, not the signed-in admin subscription. | screens/common/EventDetailsScreen.js; locales/*/events.json |
| Arabic message content regardless of English UI | Existing shared Arabic RSVP defaults retained. Fixed message-preview dates in StepFour, PreviewInvitation and EventSummary to use template language; added missing date dependency. Custom reply text remains intact. | components/createEvent/{StepFour,PreviewInvitation,EventSummary}.js; shared/src/constants/guestReplies.cjs |
| Step 4 crowded invitation choices | Existing vertical cards already differ appropriately from web. Added radio role and checked state. Arabic reply editors already use content-aware direction. | components/createEvent/StepFour.js |
| Summary accurately reflects the form | Added invitation mode, attendance/apology reply text, no-reply explanation, collapsible guest/staff details, and normalized artwork URL. Lists start collapsed to keep the review manageable. | components/createEvent/EventSummary.js |
| Test button disappears immediately | Added immediate optimistic state to host HomeScreen. Details header already had optimistic state; added reset when event/fingerprint changes to prevent carrying success to another invitation. | screens/host/HomeScreen.js; components/home/EventActionsHeader.js |
| Schedule becomes next action, with useful guidance | Added translated workflow guidance. Schedule pulses only while pending scheduling; test action no longer pulses. Cleaned up animation loops. | components/home/EventActionsHeader.js; _components/LastEventActions.js |
| Saved schedule reopens correctly | Existing saved-value hydration retained. Added missing flattened event-time fallback and event-specific trial capability to dashboard modal. Recompute scheduling window when reopening. | screens/host/HomeScreen.js; components/home/ScheduleSendingModal.js |
| Dashboard action state matches single event | Existing shared gate retained. Fixed conditional hook ordering in LastEvent, so switching between absent/present event cannot change hook count. | components/home/LastEvent.js; shared/src/hooks/useEventActionGate.js |
| More-actions arrow and header sizing | More-actions icon now reflects open/closed state. Header actions use minimum 44px height and readable 14px text, permitting wrapped content. | components/home/EventActionsHeader.js |
| Manage staff plus conditional Notify Staff | Existing shared gate only exposes Notify Staff with staff assigned. Kept management action. Corrected zero/partial-send feedback and Arabic notification label. | components/home/EventActionsHeader.js; shared action gate; events/home locales |
| English statistics must not force right alignment | Existing localized text and logical layout reviewed in details statistics. No equivalent fixed-right override found in the corresponding cards. | components/events/StatsCards.js; screens/common/EventDetailsScreen.js |
| One owner balance; readable remaining/add-more | Existing parity: duplicate quota removed, single InvitationBalanceCard uses event balance; latest-event quota uses same card styling. Native narrow-screen/font-scaling review remains. | components/events/InvitationBalanceCard.js; components/home/_components/LastEventQuota.js; EventDetailsScreen.js |
| Latest-event artwork visible and uncropped | Existing canonical image helper and contain rendering retained. Extended helper to preserve file/content/data/blob URIs so local mobile artwork is not treated as a server path. | utils/imageUtils.js; components/home/_components/LastEventHeader.js; EventSummary.js |
| Invitation text fits exported artwork | Existing mobile authored-line limit and font-fitting parity retained. Actual native capture/export remains unverified. | components/shared/TemplatePreviewCanvas.js |
| Time-picker Save readable | Existing mobile picker sheet already has 48px target and 16px text. Native platform presentation remains to check. | components/commen/IosDateTimePickerSheet.js |
| Add Guests belongs with guest management | Existing mobile guest toolbar is inside guest section, alongside guest/staff controls. | screens/common/EventDetailsScreen.js |
| Required-only CSV import and local phone zeros | Shared required-header parser already used. Added raw spreadsheet parsing to preserve CSV leading zeros; added CSV MIME types. Localized hardcoded import/export messages. | utils/xlsxUtils.js; locales/*/common.json; shared/src/utils/xlsx.js |
| Send selection stays valid after refetch | Intersect selected IDs with current audience for count/payload; lock recipient selection during sending. Zero successful sends now show error feedback rather than success. | components/events/SendActionModal.js |
| Unavailable reminder must not be offered | Found missing gate in mobile send sheet. Added availability check and translated explanation, allowing explanation to wrap. Added behavioral tests for configured/unconfigured and empty audiences. | components/events/sendAudiences.js; SendActionsSheet.js; __tests__/events/reminderAvailability.test.js |
| Final save/back navigation during submission | Existing parity: CreateEventForm carries loading/current step; PrevAndNextBtns disables backward action during save. Web missing-translation-import failure has no corresponding mobile missing import. | components/admin-dashboard/events/CreateEventForm.js; create-event navigation components |
| Date/lead-time validation and template resolution | Both clients consume repaired shared validation, scheduling and placeholder utilities. Platform-specific date selection still requires device checks. | shared/src/schemas/events.js; shared/src/utils/{schedulingWindow,resolveTaqnyatPlaceholders}.js |
| Launch counters, retries, owner population, reminder completion | Server repairs apply to both clients. No duplicate mobile implementation needed. Real sends were not repeated during this parity pass. | halaa-backend event/messaging services and shared action gate |
| Azure/manual location handling | Existing mobile Azure component/proxy and shared coordinate validation reviewed; native WebView/location permissions remain unverified. | components/commen/{MapPicker,AzureMapView}.js; services/mapsApi.js |

## Verification after the final code changes

- Mobile test suite: **542 passed, 0 failed** (including two new reminder-availability cases).
- ESLint across changed mobile JavaScript and new helper tests: **passed, zero warnings**.
- Expo web export: **passed**. This proves bundling, not native rendering or native build success.
- Evidence logs: `.cache/event-e2e/mobile-parity-final-tests.log`, `mobile-parity-final-lint.log`, `mobile-parity-final-export.log`.
- No new real invitations, reminders, DB overrides or deployments in this parity pass.

## Runtime follow-up before claiming mobile completion

Run the mobile UI separately from web. Check host/admin create and update, Arabic/English and narrow screens, summary disclosures, owner labels and balances, immediate test-state transitions, saved schedule reopening, staff actions, unavailable reminder explanations, scrolling and large fonts. Check native document/contacts permissions, file import, image capture/export, map WebView, date/time picker and push on a real device or supported simulator.

Mobile startup was previously rejected twice by automatic approval review (`blocked by policy`, no detailed reason supplied). No retry or alternate runtime workaround was attempted in this review. Expo export does not clear that runtime limitation. The UI after these changes is therefore **not yet visually validated**.

The broader E2E matrix remains unfinished. Existing open issues include manual reminder template/payload compatibility and approval, post-event messaging, status-reactivation schedule/quota rules, full reload draft recovery and incoming-response refresh. These are not made complete by this parity pass. The Create Event button size remains unchanged as requested.

## Mobile presentation follow-up

Reviewed the corresponding mobile layouts rather than copying desktop CSS. Retained the vertical invitation-type cards (wrapping title/badge/chips), stacked full-width event actions, compact dashboard quota, image URL normalization and contain fit, two-column summary stats, guest-section toolbar and larger native time-picker action. These code structures already suit mobile; no cosmetic redesign was applied to them.

Found and repaired two remaining presentation weaknesses:
- Full invitation balance card: constrained helper text to its available width, allowed header and statistics to wrap, raised helper text to 12px, and gave Add More a 44px minimum target with 14px text. This affects the full details card; compact dashboard variant is retained.
- Summary guest/staff disclosure rows: added open/closed chevrons and subtle separators, keeping the existing 44px minimum target and collapsed initial state.

Targeted ESLint passed after running from the mobile package directory (initial workspace-root invocation could not find the ESLint configuration). Native screenshots remain pending under the runtime limitation described above; source review is not visual confirmation.

## Admin action parity and mobile presentation — 2026-09-09

Compared web AdminEventHeader + EventActionsHeader against mobile EventDetailsScreen + EventActionsHeader + EventActionsSection.

| Action | Mobile placement / availability | Verification |
|---|---|---|
| Test invitation; schedule/review sending | Header, shared readiness gate | MH01 real test delivered; schedule saved/reopened |
| Notify staff | Header; staff and scheduled/live gate | MH01 actual Arabic staff notification accepted |
| Edit details, guests, artwork, message settings | Manage Event; capability-gated steps | Host full update replay; admin execution still pending |
| Manage staff | More actions → staff tab | Added direct shortcut; actual admin navigation verified |
| Publish / end / cancel / reschedule | More actions; same status branches as web | Rendering regression covers pending, scheduled, live, cancelled, completed; live sheet checked visually; remaining mutations pending |
| Delete | More actions, permission-gated, destructive confirmation | Component rendering + handler reviewed; destructive replay pending |
| Post-event sharing | Header for completed events | Shared component gate reviewed; runtime pending |
| Send new invitations / resend / extra reminder | Guest toolbar | Host one-recipient resend delivered, balance204→203 immediately; new audience empty; reminder provider unavailable |
| Guest/staff management, search, export | Guest/staff tabs and toolbar | Staff shortcut and owner balance runtime verified; full CRUD/export matrix still pending |

Presentation change: replaced the separate admin-action card far below the header with a More actions bottom sheet adjacent to Manage Event. It uses48px controls,16px action labels,13px wrapping descriptions, safe-area padding, scrolling on short screens and explicit destructive styling. Existing primary actions stay visible. Both status mutation types lock all sheet actions while pending. English390px screenshot inspected; staff shortcut closes sheet and scrolls to staff list. RTL/native device visual replay remains open.

Also repaired two actual admin crashes (missing hook export and default/named component import mismatch). Full mobile544tests pass; targeted lint passes. Corrected Event owner heading and cancellation copy: the backend does not automatically notify guests when admin cancels, so the sheet no longer promises that. Web counterpart copy search did not show the same false notification claim. No mobile/full-production sign-off yet.
