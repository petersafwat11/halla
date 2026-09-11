# Check-in app: review and finalization plan

Reviewed 9 September 2026 against HEAD `46895fc2e9acfaba58753b8fa740f3804f934985` **plus the current uncommitted and ignored implementation**. This is a corrective handoff, not a proposal to rebuild the app. No application code was changed during this review.

**Verdict: substantial functionality exists, but the current “complete / demo verified locally / external work only” status is incorrect.** Release packaging, session integration, first-event creation, camera startup, CSV feedback, and export correctness need software fixes before local acceptance can pass.

Read the original seven planning/handoff files in this directory, this plan, and [review evidence](../../evidence/hilton-guest-checkin/review-2026-09-09.md). The technical contract remains authoritative over implementation comments and previous completion claims. Preserve the original architecture, admission policy, bilingual design, and explicit v1 exclusions.

## Review coverage and evidence standard

Reviewed the planning package, progress/acceptance claims, contracts, authentication and permissions, event/guest/import/check-in services and routes, frontend providers/hooks/workspaces/dialogs/scanner, all 12 locally present export-module files, tests, design checks, Docker/CI and operational scripts/runbooks. The export module is ignored by Git and ordinary `rg` discovery: explicitly include ignored source when reviewing this checkout.

Fresh checks passed: production build, scoped lint, design check, 41 contract tests, 49 API tests excluding the PDF/export suite, 24 web unit tests, and the existing one-test HTTP journey (see evidence for process completion). Focused disposable-DB and headless-browser probes found defects despite those passes. Existing screenshot/PDF suites were not rerun because they overwrite already modified evidence files. Physical devices, current PDF visual quality, clean checkout installation, production deployment and capacity were not freshly certified.

Labels below: **Reproduced** = observed in a targeted probe; **Code-confirmed** = directly supported by the implementation, with a regression scenario supplied; **Verification gap** = a claim needs evidence, not a claim that the underlying feature necessarily fails.

P0 blocks a reproducible release. P1 blocks reliable use of an included workflow. P2 is required contract/recovery/operational completion. P3 is verification/maintenance cleanup. Complete all included work; priorities specify order, not permission to skip lower-priority requirements.

## Phase 1 — Make the release reproducible and connect the real session

### F01 — P0: Git silently omits the whole PDF/export implementation

**Reproduced.** `halaa-checkin/.gitignore:26` uses the unanchored rule `exports/`. It matches `api/src/modules/exports/`, including its renderer, worker, routes, model and templates. Twelve source files exist locally; `git ls-files halaa-checkin/api/src/modules/exports` returns nothing. API startup, index initialization and browser tests import those missing files. A local Docker build includes them, disguising the clean-checkout failure.

Fix: anchor runtime ignores to the intended data/output directories; ensure every implementation file and required asset is eligible for version control. Review ignored/untracked files before staging, without adding secrets/runtime data or unrelated work. Do not rely on `git add -f` to compensate for a permanently incorrect rule.

Acceptance: `git check-ignore` no longer matches source; a reviewed release tree includes all 12 export files, deployment files and CI workflow. Install, test, build and build both images from a clean copy of that exact release tree. Preserve existing edits; do not reset/stash the shared checkout.

### F02 — P1: Real session DTO and frontend role lookup disagree

**Reproduced with the real response shape.** `api/src/modules/auth/auth.routes.js` returns `{data:{user,csrfToken,expiresAt}}`. `web/hooks/useSession.jsx:77` reads `session.role` and `session.assignedEventIds`, although those fields are inside `session.user`. The role becomes null, the admin Guests tab disappears, the badge displays `roles.null`, and the receptionist redirect in the Guests route does not run. Server-side permissions still deny forbidden requests; this finding is not an API authorization bypass.

Fix: define one shared session DTO and normalize it at the provider boundary; derive role/assignments from its actual fields. Fail closed while role/session is unavailable. Align login redirects, header, event selector and Guests route. Browser mocks must use that exact DTO rather than supplying extra top-level fields.

Acceptance: real API login/bootstrap/refresh for admin and each receptionist; admin sees both workspaces, reception sees Gate and direct Guests navigation redirects while preserving event; badge/assignments are correct. Verify API 403/404 protections remain unchanged.

### F03 — P1: First-event creation is unreachable; additional-event creation is missing

**Reproduced / code-confirmed.** `web/app/[lang]/(workspace)/layout.jsx:43` replaces its children when there are no events. That hides the working empty-state creation dialog in `GuestsWorkspace`. The layout's own create button has no handler. Even after F02 is fixed, clicking it opens no dialog. With existing events, the current header/selector/workspace provides selection/settings but no reachable new-event action.

Fix: let the admin Guests workspace own the empty state or wire a shared create dialog properly. Add a compact admin new-event action accessible when events already exist. Keep receptionist unassigned messaging. Distinguish events-fetch errors from a genuinely empty event list and offer retry.

Acceptance: from a fresh disposable DB, provision only an admin, log in, create the first event through the UI, then create a second event and switch between them. No seed or API-side event creation to bypass this test. Simulated `/events` failure must show an error rather than “no events.”

### F04 — P1: CI runs production-browser tests before building the frontend

**Code-confirmed.** `.github/workflows/halaa-checkin.yml` runs `npm test` before `npm run build`. `web/package.json` includes `test/browser-*.test.js`; those suites launch `next start` and require `.next`. Local success relies on an existing build.

Fix: order CI as clean install → lint/design/contracts/API checks → production build → browser tests and real E2E. Alternatively separate unit/browser scripts explicitly. Use the same order in README. Declare direct runtime imports such as `content-disposition` in the owning package rather than relying on Express's transitive dependency layout.

Acceptance: empty `.next` and no node_modules in an isolated release copy; CI sequence passes without borrowing the developer checkout's ignored source, browser installation or build output. Use a known browser installation and record its version.

## Phase 2 — Repair gate operation and recovery

### F05 — P1: Camera starts a stream but never attaches it to the video

**Reproduced.** `web/components/gate/CameraScanner.jsx:166` sets `videoRef.current.srcObject` before `setIsStreaming(true)`, but the `<video>` only exists when `isStreaming` is true (`:218`). A successful fake media stream produced a mounted video with `srcObject === null` and live camera tracks. The decoder waits forever for frames.

Fix: mount the video before acquisition or attach/play the stream in a lifecycle effect/ref callback after mount. Start decoding only after usable dimensions/frame readiness. Stop acquired tracks on every failed setup path.

Acceptance: browser fake-camera test feeds an actual QR image/video frame through `getUserMedia` → video → canvas → jsQR → resolve, with zero check-ins until explicit confirmation. Test start/stop/start, denial and playback failure. Keep real phone checks separately blocked until performed.

### F06 — P1: Pending camera acquisition and active decoding can outlive their context

**Code-confirmed.** `CameraScanner` has no cancellation generation for pending `getUserMedia`; stopping/unmounting/event-switching before permission resolves does not dispose of a subsequently returned stream. `disabled` only disables its button; an already running decode loop does not consult it. Starting manual resolution while camera is active can therefore launch another resolve, and a disabled scanner can retain running tracks.

Fix: invalidate pending acquisition/decode callbacks on stop, hidden page, event/user change and unmount. Stop late streams immediately. Guard decode dispatch against current context and pending resolve/submit. Keep Stop usable while streaming. Do not automatically resume after backgrounding.

Acceptance: deferred permission resolves after navigation/event switch/background; every acquired track is stopped. Camera plus manual/hardware input cannot create overlapping resolves or replace a guest during submission. Verify session expiry stops acquisition and tracks too.

### F07 — P1: Event switching and out-of-order requests can restore old guest data

**Code-confirmed.** `web/hooks/useGate.js` clears state on event change but does not abort or ignore outstanding resolve/admit/verify callbacks. `GuestLookup.jsx` has the same issue for search. React Query removal in `useEvent.jsx` does not cancel those imperative calls; query functions also do not pass query AbortSignals. An old event's response can populate the new event's preview/search. The backend still rejects a cross-event guest admission, but the operator sees misleading identity/state.

Fix: introduce request/event generation guards and cancellation for reads; only current event/user callbacks may update UI. For an in-flight write, preserve its original operation context for reconciliation and never associate its result with a new event. Lock or explicitly handle event changes during uncertain writes.

Acceptance: delay A's resolve/search/confirm, switch to B, then deliver A's response; B remains clean. Deliver two searches in reverse order; only the latest query appears. Verify old requests cannot refill data after logout or reset.

### F08 — P1: Concurrent-admission warning reads the wrong response shape

**Code-confirmed.** `checkins.service.js` returns `error.details.guest`; both duplicate branches in `useGate.js` read `err.details.checkIn`. If another receptionist admits after this device previews, the warning retains `checkIn:null` and invents fallback count 1 with missing time/operator. `browser-gate.test.js:281` supplies the wrong mock shape and hides this defect.

Fix: consume the safe guest DTO in `details.guest` and update all authoritative fields. If details are absent, resolve before displaying a count/time/operator; never fabricate admission details.

Acceptance: two real API-backed browser sessions preview the same guest; one admits with companions, the other confirms. The loser shows the actual party size, original time and operator. Exactly one admission/audit remains.

### F09 — P1: Stale preview and lost-response handling do not preserve one operation

**Code-confirmed.** In `useGate.js`, stale verification calls `setCurrentGuest(freshGuest)` but the subsequent POST still uses the callback's old `currentGuest.version`. The hook remains ready during that extra await, allowing overlapping confirmations. Retry payloads are rebuilt from mutable state. `verifyStatus()` can replace the guest/version and set ready without applying the returned event lifecycle; success/replay never re-resolves the guest after a later correction/reset. Bare proxy 502/504 responses become `UNKNOWN` and return to ready instead of uncertain outcome. Scanner/manual inputs remain enabled in `lost_response`, allowing replacement of retry intent. `api.js` provides no application request deadline.

Fix: keep an immutable in-memory operation `{eventId,guestId,version,actualCompanions,method,key}` from submission through reconciliation. Lock all competing inputs during resolution/submission/uncertainty. Use fresh data directly after stale checks; when allowance/details change, show the updated preview and require deliberate reconfirmation. Distinguish definite rejection from unknown write outcome, including proxy errors/timeouts. Retry only the original payload/key; after replay resolve current server state before displaying it. Apply event status and clamp/revalidate counts on every resolve.

Acceptance: preview >30 seconds plus concurrent guest edit; double-click while verification is delayed; dropped committed response; 502/504; hung request; verify-before-original-commit; admin correction/reset between commit and retry; changed companion count after uncertainty. No false success, stale count, silent new operation or permanently frozen UI.

### F10 — P1: Session expiry is not propagated to the application

**Code-confirmed.** `api.js` throws 401 but does not notify `SessionProvider`; that provider only checks at bootstrap and never sets `isExpired=true`. Several gate catch paths retain guest data, retry maps nearly every failure to lost response, and `GateWorkspace` neither clears recent arrivals nor stops camera on session expiry. A failed logout is swallowed and presented as successful even though the server session/cookie can survive.

Fix: centralize authenticated 401 handling, clear private query/UI data, stop camera, and enter reauthentication. Keep only minimal uncertain-operation intent in memory; resolve after signing back in before further admission. Distinguish inability to contact the server from an expired session. Make failed server logout explicit and retryable while hiding local private data; do not promise session revocation without confirmation.

Acceptance: expire/disable/revoke a session while Guests or Gate is open and camera is active; no private data stays visible and writes stop. Reauthentication reconciles uncertain admission. Network loss during logout must not silently restore a supposedly logged-out session on refresh.

### F11 — P2: “Online” and event/list freshness are misleading

**Code-confirmed.** `useGate.js` bases `isOnline` solely on `navigator.onLine`, initializes `asOf` to now without a successful request, hides recent-query errors and polls recent every 10 seconds. `useEvent.jsx` has no active-event polling; `GateWorkspace` ignores the fresher `gateEvent`. `useGuests.js` has no periodic refresh even though T08 requires visible 5-second refresh. Stats may update while table attendance/lifecycle remains stale.

Fix: separate browser connectivity, recent API success and unknown write outcome; show stale timestamps/errors and retry. Refresh authoritative event/list/stats while visible and on focus without overwriting forms. Use returned event status to disable admission and update identity. Correct the recent-query invalidation key in `useAdmissionCorrection` (`recentAdmissions` currently differs from `['gate', eventId, 'recent']`).

Acceptance: browser reports online while API is unreachable; indicator must not claim a healthy connection. Close/open the event or admit from a second device: first device updates within the contract refresh window. Failed fetches must not become empty arrivals/zero totals.

## Phase 3 — Finish guest/import/error workflows

### F12 — P1: Error/warning notices often render no message

**Code-confirmed.** `web/components/ui/Notice.jsx` renders `children`, but guest/event/lifecycle/delete/correction/import/QR dialogs pass `message`. Gate callers pass `type` instead of `variant`; the component also drops forwarded test/accessibility attributes. Users receive blank error boxes or incorrectly styled status messages. Separately, `t(dict,key) || fallback` cannot fall back when `t` returns the nonempty missing key.

Fix: standardize the Notice interface and all callers; render text, correct alert semantics and relevant DOM props. Make translation fallback explicit and localized. Assert visible error text, not just existence of a notice or disabled submit button.

Acceptance: backend validation, reference collision, version conflict, CSV failure, QR failure, closed-event warning and camera denial all show actionable text in Arabic and English. No `errors.undefined`/raw missing dictionary keys.

### F13 — P1: CSV validation responses do not match the preview UI

**Code-confirmed.** `imports.service.js` returns `errors` and `warnings` as strings, plus rows with `lineNumber`. `ImportDialog.jsx` renders `err.row`, `err.field`, `err.message` and equivalent warning fields. Invalid rows thus have no useful explanation. It does not display `previewData.rows`, so valid guest records cannot actually be reviewed before commit. Source line numbering is synthesized as `i + 2`, inaccurate after quoted multiline records or skipped blank lines.

Fix: define a shared typed/validated preview DTO with structured issue codes, source row/line, field and parameters; update server/UI/tests together. Render the valid/invalid preview rows with bounded scrolling/pagination, totals and localized issues. Use parser metadata for physical line references, or clearly document logical row numbering consistently.

Acceptance: real backend preview for malformed header, multiline name, blank allowance, duplicate reference, warning-only duplicate name and post-preview conflict. Assert actual names, row identifiers and concrete issue text in both languages; invalid batch commits zero guests.

### F14 — P1: Duplicate CSV headers are silently accepted

**Reproduced.** `imports.service.js:69` parses into objects before validating `Object.keys(records[0])` at `:90`; duplicate headers collapse. `name,name,allowedCompanions,companionNames,reference` is accepted and the second name silently replaces the first. This violates “four headers exactly once.”

Fix: validate the raw header array before object mapping. Preserve the existing valid quoting/BOM support and atomic import. Reject duplicated headers regardless of position.

Acceptance: duplicate each required header in turn; preview rejects with a precise error and commit writes nothing. Reordered unique headers continue to pass.

### F15 — P2: CSV input limits and dialog lifetime need correction

**Code-confirmed.** JSON body size is capped at the same 2 MB as the raw CSV, so an otherwise allowed CSV can exceed the transport cap after JSON quoting/escaping. `GuestsWorkspace` does not close/reset the import dialog on event switch, and `ImportDialog` only resets on `isOpen`, allowing A's preview to be submitted to B. FileReader/preview callbacks also have no stale-result guard. Back/re-preview after an uncertain commit can generate a fresh key and duplicate reference-free imports.

Fix: enforce a 2 MB decoded CSV limit with a bounded transport allowance for JSON overhead; guard file reads and requests; bind preview/body/key to its event and preserve uncertain commit intent. Reset all import state when event changes and require a fresh preview; do not create a new key merely to retry a possibly committed batch.

Acceptance: near-limit UTF-8/quoted CSV, >2 MB input, file replace/remove during reading, event switch after preview, close/reopen during pending requests, and lost import response without references. No wrong-event or duplicate import.

### F16 — P2: Clearing reference and numeric validation are incorrect

**Code-confirmed.** `GuestForm.jsx:109` converts a cleared reference to `undefined`; JSON omits it and PATCH preserves the old value. `:84/:104` uses `parseInt` and silently turns fractional counts into integers; the form uses `noValidate`. `AdmissionCorrectionDialog` similarly truncates numeric input before its integer check.

Fix: send an explicit supported clearing value on edit and normalize/remove reference/referenceKey server-side. Validate the original numeric value using finite/integer checks; do not silently truncate. Reuse contract limits while preserving entered invalid text and field feedback.

Acceptance: clear an existing reference and reuse it on another guest; reload confirms it is removed. Enter `1.5`, blank, negative and >20 in guest/correction forms; no silently altered request is sent.

### F17 — P2: Conflict reload does not reload the dialog's guest/version

**Code-confirmed.** `GuestsWorkspace.jsx:330/:388` refetches table/stats, but dialogs keep the guest object captured in `guestFormDialog`/`correctionDialog`. Retrying still sends the old version. Event/lifecycle dialogs lack an explicit conflict reload path. Mutations keep errors across dialog reuse unless reset.

Fix: explicitly fetch the current target record, replace the dialog's record/version after user chooses reload, reset mutation errors, and explain the effect on unsaved input. If a guest became admitted/deleted, transition to the correct guarded state. Keep event/lifecycle/import dialogs bound to their originating event.

Acceptance: edit/correct/reset/close from two admin sessions; conflict → reload → intentional retry succeeds with fresh data. Opening another guest does not inherit the previous guest's error. No silent overwrite of input on background polling.

### F18 — P2: Query placeholders and invalid event URLs can show the wrong context

**Code-confirmed.** `useGuests.js` and `useStats.js` retain previous query data across event-key changes. While B loads, A's list/stats can remain visible under B's identity. `useEvent.jsx` does not reconcile a nonempty invalid/inaccessible `eventId` to an explicit error or valid selection, and only loads the first 100 events.

Fix: retain previous data only within the same event when appropriate; use loading states on event changes. Resolve URL selection deterministically, distinguish invalid/unassigned from loading/failure, and either paginate the event selector or fetch a valid selected event outside the first page.

Acceptance: slow B response shows no A guests/stats; invalid/revoked/deleted event URL cannot leave header/query context inconsistent; a permitted event beyond page one is accessible.

## Phase 4 — Make exports correct, bounded and private

### F19 — P1: Concurrent export requests bypass queue limits

**Reproduced.** `exports.service.js:67` counts queued/running jobs in a snapshot transaction then inserts an unrelated job. Those reads do not serialize concurrent inserts. Six same-admin concurrent report requests all succeeded and left six queued jobs, exceeding the limit of three. The global limit has the same pattern.

Fix: use an atomic bounded reservation/shared serialization record for global and per-admin capacity, compatible with the existing two-service MongoDB architecture. Release/reconcile reservations through ready/failed/expired/recovery paths. A per-event fence alone cannot enforce a global limit across events/admins.

Acceptance: simultaneous requests at and beyond both limits across multiple events/admins; never >3 active per admin or >10 overall; excess returns structured 429. Test completion, crash and cleanup without leaked capacity.

### F20 — P1: Event metadata and guest export data use different snapshots

**Code-confirmed.** `exports.service.js:52` loads Event outside the transaction; guest reads and job creation occur inside. A close/reopen/metadata change between these reads can label a report/pass with an event state/detail version inconsistent with its guest snapshot.

Fix: read event and selected guests in the same transaction/read snapshot that creates the job. Capture the timestamp there; retain immutable completed exports. Do not fetch QR tokens for report snapshots or copy unnecessary companion-name data.

Acceptance: controlled concurrent close/metadata update and export creation; event identity/state, guest lists and totals belong to one coherent snapshot. Later changes do not rewrite an existing PDF.

### F21 — P1: Expired exports retain private snapshots and tokens indefinitely

**Reproduced.** Cleanup queries omit `+snapshot`, so `job.snapshot` is absent and the token-stripping branch never executes. Even if it executed, it strips tokens only rather than removing the snapshot. `exportJob.model.js:120` has an ordinary expiresAt index, not TTL or later retention deletion. A probe expired a job and ran cleanup: state became expired, but the full snapshot and token remained; zero TTL indexes existed. Cleanup also returns before DB cleanup if the export directory is absent.

Fix: explicitly unset the whole private snapshot when expiring, remove artifacts, and implement separate post-cleanup job retention/deletion while preserving useful 410 behavior. Cleanup must work even with no directory. Constrain file paths by validated basename/parent, not string-prefix checks. Retry/record cleanup failures rather than silently claiming success.

Acceptance: inspect raw DB documents after expiry; no guest/token snapshot remains, referenced and orphan files are removed, temporary files are cleaned, and status/download behave correctly. Test missing directory, unlink failure, startup cleanup and subsequent retention deletion.

### F22 — P1: Worker deadlines, leases and failure updates are unsafe

**Code-confirmed.** `exports.worker.js` starts a 90-second lease before QR generation but starts its 90-second timeout only after QR/template generation. No heartbeat extends the lease. `Promise.race` does not cancel Chromium when the timeout wins; the worker slot can be released while the old render still runs. Timeout timers are never cleared (also keeping test processes alive). The failure path reads/saves a job without checking lease ownership/state; it can overwrite a reclaimed job. Claiming does not exclude expired jobs; publishing lacks running/unexpired predicates.

Fix: bound total work including QR generation; keep lease safely longer than the render deadline or heartbeat it. Actively close the timed-out job's context and await disposal before freeing its slot; clear timers. Use lease-owner/attempt/state predicates for success and failure updates, and prohibit claiming/publishing expired jobs. Ensure shutdown/restart recovery respects those predicates.

Acceptance: fake clock/controlled renderer tests for slow QR preparation, stuck rendering, deadline, stale owner error after reclaim, expiry during rendering, process interruption and two-attempt exhaustion. At most one active render in the supported API instance; no abandoned contexts or long-lived timers; gate traffic remains usable.

### F23 — P1: Production readiness never checks the actual worker

**Code-confirmed.** `app.js` only checks `deps.workerHealth` if supplied. `server.js` calls `createApp()` without it. `createExportJob` accepts jobs without verifying worker/renderer availability. The operations guide promises 503/service errors that are not wired in production.

Fix: inject real worker health into production, checking browser readiness and private storage safely without repeatedly launching expensive work. Return bounded service-unavailable responses when exports cannot run while keeping gate endpoints available. Never expose raw readiness exception messages or renderer filesystem errors to public/API consumers (`app.js` and failed-download fallback currently interpolate them).

Acceptance: production bootstrap with unavailable Chromium, unwritable storage and stopped worker; readiness is 503 and export creation gives a safe actionable error. Healthy DB-backed gate requests still work. Public responses contain no internal exception/path details.

### F24 — P2: Closing the panel loses export jobs; creation/poll errors disappear

**Code-confirmed.** `ExportPanel` calls `cleanup()` on close, clearing the only active job ID; `useExports` history is a stub returning `[]`. Jobs cannot be resumed after navigating away and users create redundant exports. A first creation error is displayed only inside `activeJobId && !showConfirm`, which is false when creation failed. Poll-query errors are not exposed, so a failed/401/404 poll can spin indefinitely.

Fix: retain non-secret job IDs per authenticated session/event across panel closure/navigation, pause polling when closed/hidden and resume on reopen. Clear them on logout/user change. Surface creation, polling, expiry and download errors independently with retry/reconcile actions. Remove duplicate unused export-hook instance in `GuestsWorkspace`. Report panel must show the defined summary metrics, not only a report option card.

Acceptance: create → close while queued → reopen → download same job; navigate Gate and back; 429 on creation, network/401/404 during polling, expiry and failed download all show explicit localized states. No automatic duplicate creation.

### F25 — P2: QR dialog Print prints the application page instead of the A6 pass

**Code-confirmed.** `QrPreviewDialog.jsx` calls `window.print()` on the workspace; its preview contains no event identity/date/allowance and has no dedicated print layout. The export-panel path prints the authenticated PDF, but the prominently offered QR-dialog Print takes a different path.

Fix: route single-pass Print through the same authenticated A6 PDF generation/download pipeline. Preserve a user-triggered new-window/PDF fallback; localize popup/download failures and wait for the viewer to be ready rather than assuming 800 ms is sufficient.

Acceptance: QR-dialog and export-panel print both use the correct event/guest PDF, proper size/quiet zone and no dashboard chrome. Test popup blocking and delayed download; no silent bulk print.

## Phase 5 — Complete operational and contract safeguards

### F26 — P2: BSON backup path cannot finish its manifest

**Code-confirmed.** `api/scripts/backup-db.mjs` hashes every top-level `readdirSync(targetDir)` entry as a file. `mongodump --out` creates a database subdirectory, so `sha256File` attempts `readFileSync` on a directory and fails. Only the JSON fallback was evidenced previously. The JSON fallback is described as Extended JSON but uses ordinary `JSON.stringify`; mixed snapshot/audit values do not get canonical BSON type preservation. Restore ignores recorded hashes and selects the first event despite claiming to choose a suitable event; legitimate empty/closed/all-admitted backups can fail its mandatory new-admission fixture.

Fix: recursively manifest BSON files, verify hashes before restoring, use true EJSON or explicitly defined lossless conversions, and separate restore integrity from optional business-fixture checks. Choose/create synthetic verification data only in the disposable target. Document/run these CLIs via containers for the actual deployment layout: `/opt/halaa-checkin` contains Compose/config, not the source npm workspace. Forward configured TLS certificate options to database tools. Do not print the DB URI (`safeDbUriForLog()` still prints its host/path/query).

Acceptance: both BSON and JSON backup/restore on isolated databases, corruption/missing-file rejection, mixed types preserved, empty/closed/live fixtures handled accurately. Rehearse the exact documented container commands with backup files persisting outside the container. Keep production consistent backup/quiescence and encrypted destination as explicit operator setup.

### F27 — P2: Purge is not coordinated with live mutations and workers

**Code-confirmed.** `purge-event.mjs` captures artifacts then independently deletes collections in parallel, without a transaction/event tombstone or enforced maintenance precondition. Imports/admissions/export creation/rendering can race and leave orphan audits/jobs/artifacts or partial removal on failure. Checking that unrelated guest counts stayed numerically identical also falsely fails if another event legitimately changes.

Fix: define and enforce a safe purge protocol: quiesce/fence the selected event, prevent new work, cancel/drain its jobs, remove DB records atomically where practical, clean artifacts retryably, then verify. Alternatively enforce documented offline maintenance with both writers and renderer stopped before execution; do not merely assume it. Verify unaffected records by scope rather than expecting concurrent unrelated totals to remain fixed.

Acceptance: dry run writes nothing; selected-event purge with concurrent import/export/worker and injected mid-step failure is safely blocked or recoverable. No selected-event residuals, no other-event modifications. Keep event ID/prefix/path/confirmation guards.

### F28 — P2: Index verification and idempotency validation overclaim their guarantees

**Code-confirmed.** `db/indexes.js` verifies index names only; an index with the expected name but missing `unique`, partial filter or TTL options passes. `connection.js` enables `autoIndex:true` and `server.js` creates indexes on startup despite the explicit deployment-index procedure. `contracts/src/schemas.js` accepts any 1–128-character idempotency key although the contract and report claim UUID validation. Existing-record lookup ignores expiry until asynchronous TTL deletion.

Fix: validate index keys/options, move production index creation to the explicit deployment command and fail readiness safely on drift. Enforce/document UUID syntax consistently for import/admission; handle expired key records deterministically rather than depending on TTL timing. Validate assigned event existence when provisioning; current provisioning accepts arbitrary ObjectIds without checking Event records.

Acceptance: wrong unique/partial/TTL index options fail verification; production starts without silently modifying indexes; malformed/expired keys and nonexistent event assignments behave as documented. Retain same-key transaction replay and current-user authorization tests.

### F29 — P2: Runtime/browser builds are not reproducibly pinned

**Code-confirmed.** Dockerfiles use floating `node:24-bookworm-slim`; Chromium is an unversioned apt install. The plan requires a tested Node patch/digest and explicit supported Playwright/browser pairing. The existing ledger's measured versions do not pin a future build. This is a reproducibility gap, not a claim that any particular dependency is currently vulnerable.

Fix: choose and record a tested Node/image digest and explicit browser provisioning/version policy, using official release/advisory sources when the implementing agent checks current versions. Keep the mini-app lockfile and isolated packages. Test production render/scan/browser behavior with the actual pair, and update image comments to match it.

Acceptance: release manifests record application SHA, base digest, Node, browser and Playwright versions. Clean image build/smoke and rollback use that tested closure; no parent-app upgrade is required.

## Phase 6 — Bilingual UX, accessibility and visual verification

### F30 — P2: Dialog focus lifecycle is unstable during ordinary rerenders

**Code-confirmed.** `Dialog.jsx` installs its focus/scroll/inert effect with `[isOpen,onClose]`. Most parents pass inline callbacks, so parent rerenders, including stats polling, tear down and recreate focus handling and refocus the first control. Focusable queries include disabled/hidden controls and all dialogs share `id="dialog-title"`.

Fix: make open/close lifecycle stable, keep latest callbacks in refs or stable handlers, focus only usable controls, use unique title IDs and restore focus once. Preserve the portal fix. Keep async mutation dismissal behavior explicit so late callbacks cannot affect a newly opened dialog.

Acceptance: type continuously through two polling intervals without focus jumping; Tab/Shift+Tab stay inside the dialog with disabled controls, Escape works, close restores the opener, and Arabic screen-reader labels are correct.

### F31 — P2: Localization/design checks do not cover the real UI contract

**Code-confirmed / verification gap.** Numerous visible/accessibility strings remain inline (forms, QR actions/alt, nav/filter labels, Notice dismissal), and backend CSV/field errors are English. `GuestLookup` input has a placeholder but no associated label. PDF templates use new literals such as `#2d261e`, `#7a6e60`, `#e8ded4`; UI import statuses use other literal colors. `design:check` checks a few token values and file existence, not manifest SHA-256 values, frontend-copy parity or other parent-source drift.

Fix: move visible strings/accessible names into locale dictionaries and structured error mappings; use the existing palette/tokens consistently in UI and PDF templates. Extend provenance checks to actual hashes and copies and report parent drift without auto-rewriting. Audit all interactive controls for labels, keyboard operation, 44px targets, focus and reduced motion. Add the missing distributed-pass warning when event metadata or guest allowance changes.

Acceptance: actual Arabic/English workflows at 1440×900, 1024×768, 390×844, 360×800, including errors/open dialogs. No raw translation keys, hidden feedback, page overflow or off-palette workaround. Record measured contrast, not blanket AA/AAA assertions. Change a copied/source asset in a disposable copy and prove drift is detected.

### F32 — P2: Current PDF/capacity acceptance needs new evidence after fixes

**Verification gap.** Existing renders and T11 figures are useful historical evidence; they do not validate the corrected release. Do not interpret a passing PDF byte/header check, mocked browser screenshot, or earlier 1,000-guest run as proof of today's release.

Acceptance: render new single A6, multi-page selected/all A4 and interim/final reports in both locales; inspect first/middle/last pages and maximum-length mixed-script names/event/venue/reference. Verify four-up pagination, joined Arabic, bidi, embedded fonts, QR dimensions/quiet zone and decode rendered PDF QR images back to the expected synthetic invitations. Rehearse two simultaneous gate sessions under 1,000-pass and full-report export with CPU/memory budgets, p95 targets, throughput, transaction retries and forced worker recovery recorded. Use a new evidence directory, never overwrite historical evidence.

## Phase 7 — Replace misleading acceptance evidence

### F33 — P1: Existing tests prove less than the acceptance report claims

**Code-confirmed.** Browser suites mock session fields and duplicate/CSV error shapes incorrectly. The “unit” gate/navigation checks often test local expressions rather than mounted production hooks. `tests/e2e/checkin-journey.test.js` exercises real HTTP flows but fetches page HTML rather than driving React in a browser; it cannot discover F02–F05. T12 calls the app complete despite these gaps, and planning README still says “plan only; not implemented.”

Fix: keep valuable real-DB concurrency tests, correct DTO mocks against shared schemas, and add a genuine Playwright → production frontend → Express → disposable replica-set journey. Add regression tests with actual boundaries for F01–F31, prioritizing failure/race paths rather than assertions mirroring implementation. Record clean-release provenance. Update README, PROGRESS and acceptance report so historical results remain historical and current defects are explicit.

Required integrated journey: fresh DB/admin → first and second events → Arabic/English guests → invalid and valid CSV with visible rows/errors → edit/clear reference/conflict reload → selection across >25 guests → single/selected/all PDF and resumable panel → both reception users via actual session DTO → camera/manual/hardware preview → concurrent admission/lost response → correction/reset → close/reopen → final report → restart persistence → logout/expiry.

Acceptance reclassification now: do not carry A01–A27/A29 forward as unconditional passes. A01 is blocked by F01/F04; A03/A04 by frontend/session gaps; A08/A10/A11/A12 by guest/import gaps; A14/A15/A18/A19/A20 by gate/UI integration gaps; A24/A26 by export snapshot/recovery defects; A29 needs both backup paths. Preserve the proven API subchecks. A28 and A30 remain externally blocked. Reassess every A01–A30 row on the repaired release.

## Phase 8 — External completion, separate from software fixes

These are already acknowledged prerequisites, not invented missing features. Prepare reviewable configuration/runbooks during implementation; actual rollout requires the user's deployment instruction.

1. Confirm hostname/DNS, HTTPS, dedicated DB-scoped Atlas credentials, transaction support and backup destination. Check actual VPS CPU/RAM/disk headroom against new measurements.
2. Apply reviewed tracked root Caddy/Compose network integration in the documented order so future Halaa deploys preserve it. Keep independent images/project/data and verify existing Halaa routes before/after. Do not merely edit a VPS Caddyfile that the main workflow overwrites.
3. Deploy exact tested SHA, provision named accounts/assignments, verify public-origin cookie/CSRF/proxy/download/camera policy and readiness. Rehearse isolated restore/rollback and enable backups/monitoring.
4. Obtain real event details, retention policy and acceptance of principal-guest-present/one-time companion-count policy.
5. Execute A30 on both actual reception devices, printed and phone-screen passes, duplicates and backup connectivity/device/power. Record operator sign-off.

Do not add XLSX, messaging, RSVP, a public guest website, offline admission, late-companion admissions, a third dashboard, Halaa account reuse or new infrastructure while finalizing v1.

## Copyable instruction for the implementation agent

> Finalize the existing Halaa Guest Check-in app using `docs/implementation/hilton-guest-checkin/05-FINALIZATION-REVIEW-PLAN.md` and the original technical/product contracts. Review the current working tree, including ignored export source, before changing anything. Preserve all existing and unrelated edits. Implement F01–F33 in the ordered phases; do not restart T00 or stop because the old ledger says complete. Work sequentially, completing each coherent phase and its meaningful regression checks before moving on. Keep API/browser DTOs aligned and test real integrated workflows and race/failure recovery. Maintain a per-finding status/evidence checklist in PROGRESS; append an entry that supersedes the previous “external work only” claim without deleting history. Produce a new final A01–A30 report tied to the exact release tree. Keep runtime data and secrets out of Git; do not modify parent business code/packages. Prepare deployment changes but do not deploy, change DNS, contact anyone or touch production data. Report precisely what was verified, what still fails, and which external prerequisites remain blocked. “Demo verified locally” requires all software findings closed and the real-browser journey passing; “deployed” and “gate ready” require separate live evidence.
