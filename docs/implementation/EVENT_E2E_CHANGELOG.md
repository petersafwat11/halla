# Event audit: changes, impact and open work

This checkpoint consolidates the chronological evidence in EVENT_E2E_RESULTS.md. It is not a production-readiness sign-off. Five real five-guest events have completed initial sending: WH-01, WH-02, WH-03, WA-01 and WA-02 (admin self-owned). Other scenarios remain open.

| Area / problem encountered | Change and reason | Affected behavior / verification |
|---|---|---|
| Shared schema compatibility and stale workspace imports | Zod 3 compatibility alias and mutable shared-package webpack snapshot | Create/update/import validation; fresh web replay imported required-only CSV correctly |
| Date/time and sending boundaries | Shared Riyadh calendar parsing and 12/24-hour formatting | Scheduling, summary and WhatsApp parameters; cutoff rejection, acceptance and saved-value reopening verified |
| Incorrect event owner during send / preview | Populate owner for sends; pass selected owner through web/mobile create/update previews; retain template variable mappings | Admin-on-behalf messages now use host identity; WA-01 UI and sent evidence verified |
| Launch accounting / retries | Atomic authoritative counters, scoped launch and retry reconciliation | Four initial launches, one resend: 21 consumed / 209 remaining at last checkpoint; no extra charge for tests or QR follow-ups |
| Test/schedule stale controls | Immediate optimistic test gate plus shared dashboard event gate; canonical schedule data | Test button hides without refresh; schedule guidance appears; live dashboard no longer offers scheduling; web verified, mobile native pending |
| Crowded headers and duplicate quota | Shared host/admin header, secondary action menu, one canonical balance block | English/Arabic web screenshots reviewed; duplicate mobile quota removed in code |
| Fixed-right statistics | Removed fixed alignment so document direction governs | English left / Arabic right web verified; mobile parity code reviewed |
| Step 4 / summary / guest management | Clearer mode choices, fuller summary, guest table action, CSV normalization, import/selection translations, modal spacing and inline errors | Host/admin web create/import/update exercised; mobile full visual coverage pending |
| Tiny time-picker save action | Larger readable text/tap area, flexible mobile width; web dropdown in flow with Escape/Done | Web screenshot and boundary interactions verified; native pending |
| Remaining invites / Add More | Clear count/usage hierarchy, responsive action, mobile touch target parity | Desktop/tablet/phone web screenshots verified; native pending |
| Missing latest-event artwork | Canonical URL helper and configured uploads proxy; contain image fit on web/mobile | Web HTTP 200, image loaded at natural width 600, screenshot verified; mobile runtime pending |
| Cropped invitation text | Fit text to authored line budgets; mobile maxLines/font-fitting parity | Final actual birthday JPEG inspected and public image verified; native output pending |
| Admin dashboard crash / final save label | Restore translation import; supply currentStep and disable backward action during submission | Admin dashboard and WA-01 save flow verified |
| Inaccessible admin self-owner card | Use semantic button | Follow-up UI verification pending after local runtime interruption |
| Reminder completion after failure | Track successful guests, retain incomplete state on missing template/partial failure; category-safe mapped fallback | Retry/idempotency tests pass; real reminder withheld because approved generic mapping unavailable |
| Reminder availability mismatch | Expose availability and disable unavailable actions with explanation on web/mobile | Web verified; generic Arabic template submitted inactive and pending at last provider check |
| English default RSVP text | Shared Arabic default source and content-aware editors | Web 216 tests, mobile 540 tests and two targeted backend tests pass; saved legacy defaults and public webhook runtime require follow-up |

## Real external effects and test isolation

Only the five user-authorized recipient numbers are permitted by the QA sender. Seeded host/admin are the only owners used. One QA monthly subscription/allocation and scoped event scheduling overrides are backed up privately. Public QA artwork was copied to the existing upload host. One category-neutral Arabic reminder template was submitted, but not activated. Application code has not been deployed. No global scheduler or database reseed has been started. Provider acceptance is distinguished from delivered/read receipts; real RSVP/QR follow-ups are recorded in the detailed results and private outbound evidence.

## Latest validation checkpoint

Backend full suite: 583/583. Web: 216/216 and optimized production build passed at the preceding checkpoint. Mobile after the parity review: 542/542, changed-file ESLint passed, Expo web export passed. See EVENT_MOBILE_PARITY_REVIEW.md for the complete web-to-mobile comparison and final verification logs. Native mobile runtime, camera, native documents/contacts, native maps and push have not been verified. The Create Event button size is unchanged at the user's request.

## Known open issues and release limitations

- Complete remaining web admin cases, all remaining categories, then mobile host/admin scenarios, one UI runtime at a time.
- Arabic reply correction is verified for the scoped QA events: backed-up exact historical defaults were migrated, a real declined guest received/read the Arabic reply, and WA-02 real responses produced Arabic content hashes. Custom text is preserved; application code remains undeployed. Continue broader response scenarios.
- Manual reminder payload currently conflicts with approved template metadata. Generic reminder approval/mapping and scoped sends remain blocked; post-event messages still need full testing.
- Review admin status transitions for actual schedule validation and quota reservation when reactivating a cancelled event.
- Investigate apparently inert admin Create Event navigation and draft recovery after runtime interruption.
- Verify automatic refresh after incoming RSVP/worker changes, final mobile Step 4/summary visuals, native image export and complete final regressions/builds.
- Record every additional failure and fix in EVENT_E2E_RESULTS.md; retain the original plan and fixture manifest. Do not claim complete scenario coverage from passing unit suites.

## Latest mobile parity review

EVENT_MOBILE_PARITY_REVIEW.md records each event-related web repair, its corresponding mobile path, new fixes, checks and runtime limitations. Earlier table verification counts are historical. Native rendering and device-only operations are not signed off. No real E2E sends were repeated during this code review.

### 2026-09-09 mobile runtime and admin action parity

- Fixed canonical Saudi phone truncation on event/guest updates; backend585tests passed.
- Fixed populated WhatsApp template ID serialization; full mobile host update passed.
- Corrected staff list/management labels and Event owner localization.
- Real mobile test, schedule reopening, notify staff, scoped5-guest launch and1-guest resend verified against UI/logs/DB/provider receipts. Balance203remaining/27used/230total.
- Repaired admin event-list and event-action component crashes; executable regressions added.
- Moved admin status/delete controls into header More actions sheet; added direct staff shortcut, larger readable wrapping labels, safe-area/scroll behavior and accessible buttons. Corrected cancellation text to describe actual behavior. English phone screenshot checked.
- Fixed admin host selector response handling and empty/retry states; created MA01 for the host through actual UI. No messages sent for MA01.
- Affected: native and Expo-web mobile admin event UI; backend phone validation shared by web/mobile. Web control inventory reviewed; no deployment. Full QA remains open; detailed matrix and limitations in EVENT_MOBILE_PARITY_REVIEW.md and EVENT_E2E_RESULTS.md.

## September 9 release checkpoint — reported mobile fixes

- Fixed sibling category-picker presentation and guest-list re-entry; moved removal confirmation into a separate visible sheet. Local browser replay passed; native device confirmation remains user-led.
- Normalize canonical Saudi guest numbers to local 05 format for display/editing without changing database storage. Test-message validation accepts 05 (10 digits) and 5 (9 digits).
- Added Expo browser download implementation; export endpoint returned HTTP 200. User must confirm the saved spreadsheet in their browser/device.
- Web/mobile auto-reply descriptions now match backend behavior: QR confirmation includes editable reply, event title/date/time/address, guest count and entry instructions; text-only confirmation and decline contain only the configured reply. No separate location pin is sent.
- Scheduling hint explicitly distinguishes trial 15-minute and paid 24-hour lead times; both require sending at least three days before the event, in Riyadh time.
- MA01 audit: test message accepted with provider message ID; status scheduled with September 10, 2026 at 02:35 Riyadh. User-edited guest ending 6384 is outside the original QA recipient allowlist; restore an approved recipient before a scoped send.
- User now owns UI testing. Remaining lifecycle/reminder/device verification is open; this release does not certify those checks as complete.
- Release checks: backend 585/585, mobile 547/547, web 216/216, check-in contracts/API/web 132/132. Check-in production build passed. Production deployment evidence will be recorded separately.

## September 11 — scheduled launch fingerprint investigation and fix

MA01: durable audit records test at Sep 8 23:27:25 UTC, schedule at 23:29:38 UTC for Sep 10 02:35 Riyadh, and cron-launch abort at Sep 9 23:35:00 UTC. VPS logs independently confirm the fingerprint abort. No event-content edit is audited between scheduling and abort. Current template updatedAt and lastSyncedAt are Sep 9 21:39:03 UTC, before launch. Original test artwork URL matches the current stored artwork path. One provider-accepted test record exists; no bulk records. No historical template-content snapshot is retained, so timestamp-only change is strongly supported but cannot be proved retrospectively.

Fix: versioned v2 fingerprint excludes provider synchronization timestamps while retaining actual template text, mappings, buttons, language, rendered content, event details, replies and artwork. Exact legacy fingerprints remain accepted where still matching; mismatched legacy hashes are never automatically approved. Scheduling upgrades a successfully matched legacy approval to v2. Previously aborted events still require a fresh test and schedule; no DB status/schedule restoration performed.

Related review: scheduling/launch now populate host accountType consistently with test sending, preventing a business-delivery fallback mismatch. MA01 is personal/explicit quick_reply, so this was not its observed cause. Public image origin and formatting changes can also legitimately change a fingerprint; the original local QA harness used the production media origin. No balance/provider failure occurred in this launch path: the fingerprint gate ran before dispatch. No new outbound messages sent during diagnosis.

Focused fingerprint and lifecycle regressions: 17/17 passed. Full current-worktree backend results recorded after completion. Changes remain local pending deployment; the VPS still needs the fix before a future automatic launch.

Full current-worktree backend suite passed: 635/635 tests. No production deployment or event-state mutation was performed.

September 11 reschedule fix: confirmed MA01 returned to scheduled with September 12 02:25 retained after cancellation. Cancellation now clears the launch date/time; reopening cancelled/completed/failed events through the legacy scheduled status action returns pending_scheduling and clears old launch settings. Web/mobile confirmations explain that a new schedule is required. 21 lifecycle regressions passed, including legacy cancelled records retaining old dates. Scoped MA01 repair saved its previous state privately and cleared the obsolete schedule with an updatedAt concurrency check. Local backend restarted; VPS deployment remains pending.

September 11: Added shared event_unscheduled notification for host detail/settings edits and admin message-affecting edits, plus consistent worker notification text. Arabic/English text tells the owner to send a new test and confirm a new time. Existing event-notification preferences are respected. Atomic scheduled-state transitions limit edit notifications to actual unscheduling. Lifecycle regression asserts a persisted owner notification; 21 related tests passed. Local backend restarted; production deployment pending. MA01 currently scheduled September 12 02:37 Riyadh, four guests including unapproved edited number 966505826384; no scoped launch performed.

Post-event access preview: backend host response now renders each eligible template through the same getPostEventBodyParams formatter as dispatch using the first active guest in event order. Web/mobile display full body without line limits; mobile access-link sheet shares previews. Explicit example-link/expiry notice; no token generation or sending. Corrected mobile nested content response parsing (saved media/settings now visible). Live endpoint returned the first guest and rendered Arabic event message, one saved photo. Native browser AX confirmed the full message. Local checks: 14 backend lifecycle and9 mobile post-event checks passed. Web code updated, runtime web validation pending.

### 2026-09-11 — Post-event access-link dispatch failure
- Both saved MA01 send attempts failed for all four recipients with 'language is not defined', before provider dispatch (no outbound message records).
- Resolve the selected template language before bulk dispatch; add optional POST_EVENT_PUBLIC_ORIGIN for public guest links when the local frontend uses localhost. Local launcher uses https://halaa.com.sa.
- Regression verifies Arabic dispatch, public link parameters, and duplicate prevention for the same attempt. Lifecycle integration suite: 15/15 passed with mocked provider.
- Local backend restarted. Real delivery requires user retry; changes not deployed to VPS.


### 2026-09-11 — Reuse existing mobile guest post page
- Removed the custom host preview layout after review found existing web PublishedView and mobile PostEventScreen.
- Host preview now renders PostEventScreen with GuestEventHeader, PostCard, and PostInteractions using authenticated host content. Guest token requests remain disabled and preview interaction buttons are disabled.
- Added immediate localized fallback for View shared page to handle stale translation resources after hot reload; removed the custom preview notice from the UI.
- Mobile lint and 9 post-event tests pass. Visual verification remains pending: browser is currently on Login.


### 2026-09-11 — Mobile post page aligned with web
- Replaced per-media post rows with the website's single-post model: host/date, localized caption, gallery, shared likes/comments. Uses the same event-level endpoints as web; existing per-media hooks remain compatible.
- Added full-screen gallery navigation, expo-video playback (SDK-compatible plugin), comment photo attachment/removal, emoji shortcuts, paginated comments, attachment rendering, and existing report/block controls. Preview shows persisted comments without guest mutations.
- Fixed existing renderScrollComponent callback crash caught during browser verification.
- Verified actual MA01 preview at 390x844 and full-screen image opening in automated browser. No new outbound messages or guest interactions were sent. Native video/photo picker checks remain open.
- Validation: ESLint, 12 post-event tests including shared endpoint/auth/pagination and multipart payload regressions; Expo web export succeeded. Local only, not deployed.


### 2026-09-11 — Web post-event parity
See POST_EVENT_WEB_MOBILE_PARITY.md for the issue matrix, fixes, affected routes and verification. Fixed duplicate route implementation, published edit/view/send actions, full rendered template preview, resend confirmation, failed-send feedback and media URL resolution. Local only.


### 2026-09-11 — Event management parity audit
See EVENT_WEB_MOBILE_PARITY_AUDIT.md. Fixed local phone prefill for web guest/staff editors, duplicate phone prevention on Step 2 edit, and removed unsafe direct Publish status action from both apps with a backend guard. Local backend restarted. 52 relevant tests pass; no live sends or lifecycle changes performed.

