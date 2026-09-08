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
