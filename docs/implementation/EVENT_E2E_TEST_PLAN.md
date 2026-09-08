# Event lifecycle verification plan

Started: 2026-09-08. Status: **in progress — inventory and environment preparation**.

## Objective and evidence rules

### Additional UX requirements from the user (during execution)

- Verify summary accuracy/completeness against form values and persisted payloads.
- Redesign Step 4 invitation modes to remove crowding; review screenshots in both languages and mobile widths.
- Place Add Guest in the event guest-table toolbar with consistent styling.
- After a matching successful test, hide Test Message immediately and emphasize Schedule until scheduled; verify without manual refresh on web/mobile.
- Reopening a schedule must restore the saved date and time. Use event-owner entitlement when an admin manages a host's event.
- Provide accurate first-use guidance explaining the next step, send/reminder timing and expected results; no promise that differs from behavior.
- Maintain a final UX findings/change list, including additional observations. Every change requires UI inspection plus relevant logs/DB checks; these requirements supplement the original full matrix.

Verify create, update and single-event management across web host, web admin, mobile host and mobile admin. Exercise real UI, persisted data, actual WhatsApp sends, scheduling/reminders and receipt evidence; fix defects and repeat affected cases. A passing API call is not proof of delivery. Browser execution of Expo is not proof of native-device behavior.

Results use: NOT RUN, PASS (UI), PASS (API), PASS (automated), PASS (code review), BLOCKED, FAIL/FIXED. Record platform, actor, owner, event ID, case ID, expected/actual result, message ID/status and supporting evidence. Never label an unavailable device feature as UI-tested.

## Authorized fixtures and boundaries

- Use existing seeded accounts, initially `test.host@labbe.sa` and `test.admin@labbe.sa`; inspect current state and record a private backup before changes. Do not run the global seed/reset script.
- Select an existing monthly/high-capacity plan, provision a test subscription through supported service/database fields without a real payment or fabricated payment receipt. Record before/after and consumption. Business delivery cases require a separate seeded business fixture or an explicitly recorded, reversible test-account conversion.
- Only these recipients may receive test traffic: `966533447741`, `966506630353`, `966553888429`, `966505826383`, `966500115122`. Use names QA Guest 1–5. Every created event includes all five; test messages may target these numbers. Staff-notification cases also use only this allowlist.
- Prefix fixtures `E2E-260908-<lane>-<case>`. Maintain a manifest of all IDs. Database date/status/quota overrides must match a manifest event and test owner. Record normal UI rejection before bypassing a time restriction.
- Do not start an unscoped scheduler against the existing database. Inspect the worker, then run only manifest event/recipient work. Prevent other pending events, real users, admin notification lists or stale retries from receiving messages.
- Separate provider acceptance, delivered/read receipt, actual payload/media inspection and human recipient confirmation. Missing receipts remain unverified; never invent an inbound WhatsApp reply. Simulated reply tests are explicitly labelled and do not substitute for real inbound verification.
- Run web and mobile UI phases sequentially as requested. Shared API can remain active. Preserve unrelated working-tree changes. Keep credentials and full private payloads out of committed evidence.

## Event matrix

There are **nine** categories: wedding, engagement, birthday, graduation, meeting, conference, ladies_event, baby_shower, other. Twelve events are the initial end-to-end core (three per lane); extend to nine category-specific create cases per lane when necessary for complete UI category coverage (up to **36 events**, each with the five recipients).

| Lane | Actor | Ownership | Core invitation modes |
|---|---|---|---|
| WH | Web host | Own events | reply_and_qr; reply_only; none |
| WA | Web admin | Selected seeded host; self if supported | reply_and_qr; reply_only; none |
| MH | Mobile host | Own events | reply_and_qr; reply_only; none |
| MA | Mobile admin | Selected seeded host; self if supported | reply_and_qr; reply_only; none |

For each lane, category rows follow canonical order above; rotate mode by row index. Cover personal quick-reply delivery and business portal-link delivery. Inventory approved WhatsApp templates and execute every distinct available event template/mode/category mapping, plus shared follow-ups/reminders/staff templates. Missing/unapproved combinations are blocked, not silently substituted. Verify graduation/meeting general-template fallback explicitly. Admin self-service absent by design is an expected permission/UX case, not permission to invent a feature.

## Phase 0 — inventory and readiness

1. Inventory routes, screens, menus, entitlements, state transitions, template mappings and worker jobs; add uncovered functions to this plan.
2. Inspect seeded users, plans, subscriptions, approved visual/message templates, sender configuration, storage, media URLs, webhook callback location, delivery-log models and existing scheduler ownership.
3. Inspect mobile runtime: native Android emulator/device if already available; otherwise Expo web. Record native-only limitations (WebView/maps, permissions, contacts/document/photo picker, QR camera, share/download, push, background/resume).
4. Prepare scoped fixture manifest, recipient guard, test assets/import files and private before-state backup. Confirm public media and guest links resolve from outside the local process before real WhatsApp sends.
5. Start API without global jobs, then web; smoke login/access in each role. Capture current automated-test baseline and UI console/network failures.

## Phase 1 — create wizard (each lane)

- C01: role/owner selection, own versus host-on-behalf, eligible/ineligible host, owner plan and balance, business/personal rules, correct audit attribution.
- C02: all category choices; required title/type/date/time; blank/whitespace/length limits, past date and minimum lead time, locale/timezone/12-hour conversion, back/next preservation, cancel/re-entry and duplicate submit prevention.
- C03: Azure Arabic/English venue search, keyboard selection, pin click/drag, exact coordinates, manual address without coordinates, clear/retype, reverse failure, offline/retry, geolocation grant/deny where available, edit persistence and external map links.
- C04: five guests via manual entry; E.164/local Saudi normalization, invalid/duplicate phone, name limits, category/group, edit/delete/bulk selection/search/pagination, CSV/XLSX import, malformed/duplicate import, prepared lists, quota and unlimited display. Never deliver negative cases to non-allowlisted numbers.
- C05: staff add/edit/remove/duplicates/phone validation, persistence across steps, role/status. Keep send actions separate from creation.
- C06: visual template filtering, all applicable category families, dynamic required fields, colors/fonts, preview, save/reopen, failed image handling, custom image upload/replace/remove, file size/type rejection and mobile photo/document flow. Business logo/name/cover snapshots and required-cover gates.
- C07: three invitation modes, correct approved WhatsApp template filtering/body/variables, reply/absence customization, QR/no-QR/plain differences, personal versus business links, Arabic/English preview, no leftover variables or wrong owner details.
- C08: final summary matches form/database, guest/staff counts, image, date/time/location, consent checkbox, create idempotency, errors preserve form, pending/unscheduled state, no unintended send or quota debit at creation.

## Phase 2 — update wizard (each lane)

- U01: load every step directly and from the single-event menu; correct owner/capabilities, old Google/manual/Azure data compatibility and unchanged values preserved.
- U02: change title/category/date/time/location individually and together; save/reopen; invalid values and stale requests; matching WhatsApp/visual category selection when category changes.
- U03: add/edit/delete/import guests and staff; duplicates, preserved IDs, RSVP/check-in/message history; pending versus live add-only restrictions; quota charged only on appropriate sends.
- U04: replace visual/custom/business cover, retained branding, invitation type, WhatsApp template and follow-ups; cancel/discard versus save, upload failures and cleanup.
- U05: live/scheduled/completed/cancelled/deleted/failed restrictions, admin-on-behalf overrides allowed by product policy, unauthorized other-host access, stale refresh, double save and retry idempotency.

## Phase 3 — single event management (each lane)

- M01: heading/details, correct image/location/map links, status, balance/statistics/capabilities and audit owner.
- M02: guest search/filter/sort/pagination/page and cross-page selection, individual/bulk operations, exports and empty states; counts agree with persisted data.
- M03: test-message dialog, validation, selected allowlisted target, rendered payload/media/buttons/variables, provider message ID, delivery evidence, repeated clicks/errors and applicable charge rules.
- M04: initial bulk schedule, normal lead-time rejection, valid schedule, update/reschedule/cancel, timezone display, scoped due-job run after recorded DB clock changes; launch status, exact recipients, duplicate-worker/idempotent retry and balance.
- M05: resend invitation to nonresponders/selected guests, failed-send retry, add after live and send-new-guests, excludes already-sent/ineligible guests, explicit idempotency and consumption/refund reconciliation.
- M06: RSVP confirmed/declined/no-response and reply-follow-up behavior; QR issued only when appropriate; guest portal links, change reply/repeated reply, own guest code isolation. Real inbound replies/receipts and simulated cases recorded separately.
- M07: free automatic reminder settings/enable-disable/timing, correct confirmed/pending buckets, once-only execution, earlier event-time override, extra paid reminder, skip declined/deleted guests, correct message body and owner time/date/location.
- M08: staff details/add/edit/status/remove, notify/resend, portal token listing/revocation/expiry, check-in/search/export/camera alternatives, duplicate QR scan, already checked-in and invalid QR cases where available.
- M09: cancel/delete/bulk delete/retry failed launch, terminal-state enforcement, scheduled-work cancellation and cleanup, no later accidental send, event-slot and invitation accounting.
- M10: loading/error/empty states, offline/slow response, double taps, keyboard/focus, mobile scroll/safe areas, RTL/LTR/long text, accessible labels, responsive widths, browser refresh/back and role navigation.

## Phase 4 — execution order and delivery evidence

1. WH core three events: full create/update/manage cycle and representative real sends/reminders.
2. WA core cases, on-behalf and self/permission variants, to catch owner/actor issues before multiplying fixtures.
3. WH/WA remaining category/template branches and lifecycle actions.
4. Stop web UI server. Start native mobile runtime if available, otherwise Expo web; execute MH then MA matrix and inventory native limitations.
5. For each send: record lane/event/guest/template/type/request time, sanitized final variables and media URL, provider ID, accepted/failed/delivered/read timestamps, receipt source, balance before/after. Inspect public media and guest landing page independently.
6. Accelerate only test-event scheduling clocks; execute workers on those IDs. For genuine overnight behavior, leave only explicitly documented test jobs and arrange a scoped follow-up if required. Do not mark future tests completed early.
7. Fix defects as discovered, add meaningful regressions and replay the failing UI path. Expand matrix for newly discovered actions/branches.

## Phase 5 — exit criteria and cleanup

- Every inventoried action has an execution record or a specific limitation with code/test evidence; no vague “all passed.”
- All nine category mappings and three modes are accounted for in each lane; every applicable approved message variant has a send/evidence row or explicit provider limitation.
- Successful event saves/updates, balances, status transitions and messages reconciled against the database. Provider acceptance is distinguished from actual delivery and human confirmation.
- Relevant/full automated suites, web production build and Android/iOS exports pass after fixes. Native binary checks remain separate if no emulator/device is available.
- Cancel remaining test schedules/retries, clean up disposable fixtures and release test slots. Preserve consumed-message audit records; do not manufacture refunds or erase actual usage. Restore temporary account/subscription changes as appropriate and document any retained fixture.
- Produce `EVENT_E2E_RESULTS.md` with matrix, defects/fixes, actual delivery evidence, limitations, remaining actions and production-readiness assessment.

## Progress ledger

| Phase | Status | Evidence / next action |
|---|---|---|
| Inventory and plan | IN PROGRESS | Initial code-derived plan written; inspect provider/account/runtime readiness next |
| Web host | IN PROGRESS | WH-01 wedding and WH-02 engagement created, updated/scheduled/launched; see results for coverage and defects |
| Web admin | NOT RUN | |
| Mobile host | NOT RUN | |
| Mobile admin | NOT RUN | |
| Delivery/reminders | IN PROGRESS | 10 initial invitations accepted; real RSVP and acknowledgement verified; reminder template configuration blocker identified |
| Regression/build/cleanup | NOT RUN | |

## Cross-platform defect rule (user clarification)

For every web defect, inspect the equivalent mobile code and behavior; fix the counterpart when applicable. Track code-reviewed, automated-tested and runtime-verified states separately. Latest additions: admin header layout, single balance display, time-picker confirmation typography, owner-aware previews and admin schedule upper bounds.

## Reduced mobile execution matrix — user-approved reuse

Reuse WH-01/02/03 for reply+QR, reply-only and no-reply management; reuse WA-01 for admin-on-behalf and WA-02 for admin-self ownership. Run one new host create and one admin create only if required to prove the full mobile save pipeline; reuse those drafts for category/template branches before launch. Cover all category selections and validation branches without sending each category again. Preserve separate evidence for role permissions, owner balances, create/update, guest/staff management, preview/media, test state, scheduling/reopening, send audiences, reminders and post-event. Shared backend results from web are reusable evidence, not a substitute for mobile interactions. Device-only cases remain explicitly separate. Do not repeat a real send unless it proves a previously unverified path or a repair.
