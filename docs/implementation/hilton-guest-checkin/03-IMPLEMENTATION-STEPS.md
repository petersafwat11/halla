# Ordered implementation tasks

Run one task per Gemini session. Each task depends on the preceding tasks unless stated otherwise. A task is complete only when its acceptance gate passes and the ledger is updated. If a check fails, fix it within that task; do not stack more feature work on a broken foundation.

## Session procedure

1. Read `PROGRESS.md`, this task, and the referenced contract sections.
2. Inspect `git status --short`; establish which changes belong to this mini app. Preserve other work.
3. List the small set of files to change and the acceptance checks to run.
4. Implement the task end to end. Do not fabricate future features to make the present UI look complete.
5. Run targeted checks; include the existing mini-app suite when shared contracts or behavior changes.
6. Inspect the diff for accidental scope, secret files, hardcoded data and incomplete code.
7. Update `PROGRESS.md` with actual results and the precise next handoff.

All npm commands below run from `halaa-checkin/`, unless explicitly stated otherwise. Test commands are required scripts to create, not pre-existing repository commands. Before T00 they will not exist.

## T00 — Workspace, runtime and design snapshot

**Read:** README; product §3; technical §§1, 8. Inspect all listed source design files and parent package/deployment manifests.

**Create:** mini-app root/workspace manifests, `.gitignore`, `.dockerignore`, basic web/API/contracts manifests, scoped lint config, design sync/check scripts, `design/tokens.css`, selected Halaa assets, font licenses, `design/SOURCES.json`, `.env.example`, README.

**Steps:**

1. Create `halaa-checkin/` as its own npm workspace root with `web`, `api`, `contracts`; install from this directory and confirm the root Halaa lockfile is unchanged.
2. Choose compatible supported patches, pin Node/dependencies, capture versions. Use JavaScript/JSX and ESM consistently.
3. Copy the full first root CSS token block, preserving names/values; record the CSS-vs-JS background and font decisions. Do not copy feature-specific global rules.
4. Inspect/reuse Halaa logo artwork. Obtain Cairo locally with license/provenance if no committed font binaries are available; no runtime font network dependency.
5. Create a minimal bilingual web shell and Express app factory/liveness endpoint. Next dev proxy must use `/api/checkin/v1`, API port 8100, web port 3100.
6. Establish scoped `dev`, `build`, `lint`, `test`, `design:sync`, `design:check` scripts. Initial tests cover token extraction/preservation, not screenshots of an unfinished app.

**Gate:** clean mini-app install works; web reaches Express liveness through the same origin; production Next build and scoped lint pass; token snapshot equals source custom properties; parent workspace/package files unchanged. Record font decisions/assets and screenshot of the initial shell in both directions.

**Do not implement:** guest data, login credentials, gate UI, PDFs, production deployment.

## T01 — Shared schemas, DTOs and statistics

**Read:** technical §§3–6; product §§1, 5, 6.

**Create:** `contracts/src/{constants,errors,schemas,stats,index}.js`, focused contract tests and README examples.

**Steps:**

1. Define strict Zod schemas for IDs, events, guest create/edit, CSV payload, resolve, admission/correction/reset, export, pagination and status transitions.
2. Separate writable payloads from response DTOs; reject `qrToken`, operator/time/status injections and unknown fields. PATCH must contain an allowed change in addition to version.
3. Define normalization helpers for name/reference lookup without mutating displayed names. Validate finite integers, bounds, non-empty names, companion array constraints, locale and explicit-offset timestamps.
4. Implement pure stats calculation with one source of definitions.
5. Define consistent domain errors and response envelopes. Document exact DTOs and routes in code-level comments/types (JSDoc is enough).

**Gate:** `npm test` covers valid Arabic/English/mixed names, whitespace, 0 and 20 companions, negative/fractional/>20 counts, excess names, malformed IDs, unknown writable fields, zero totals and the exact 3-invitation statistics fixture. No framework/UI dependency in contracts.

## T02 — Database, authentication and access control

**Read:** technical §§2–4, 8.

**Create:** API configuration/connection/index setup, user/session/event model foundation, auth/authorization/CSRF/error middleware, auth routes/services, provisioning CLI, test app/server separation.

**Steps:**

1. Connect only to a mini-app database prefix; fail fast for missing production secrets, unsafe origin or unsupported transaction setup. Do not read parent `config.env`.
2. Implement user provisioning with scrypt, named roles, assignment validation, hidden password input, and session revocation after changes.
3. Implement login/session/logout, persisted digest-only session tokens, production host-only cookie, expiration, disabled-account handling and CSRF/Origin checks.
4. Centralize safe serialization, error responses, rate limits and redacted request IDs/logs. Configure proxy trust explicitly.
5. Add replica-set integration harness with disposable database names. `createApp` must allow tests to inject isolated dependencies without starting production listeners/workers.

**Gate:** integration tests prove valid/invalid login; no password/hash in response; session persists across app recreation; expired/disabled/revoked sessions fail; cookie flags correct; foreign/missing Origin and wrong/missing CSRF rejected; receptionist/admin restrictions enforced; rate limit returns structured errors. Production config rejects Halaa database names/default secrets.

**Do not implement:** public registration, messaging, Halaa SSO, production users.

## T03 — Event and guest CRUD, audit and statistics API

**Read:** technical §§3–6; product §§2, 4.

**Create:** event/guest/audit modules, event/guest routes, serializers, scoped queries, indexes, stats endpoints, synthetic fixture builder.

**Steps:**

1. Implement event list/detail/create/edit/status transitions and role/assignment scope.
2. Implement active guest create/list/detail/edit/soft-delete with secure token + shortCode generation. Ordinary reads never expose tokens.
3. Implement event fence transactions, optimistic versions, lifecycle rules, 1,000-invitation cap and optional-reference uniqueness.
4. Implement safe search/filter/pagination with stable ordering and bounded query sizes.
5. Implement event-wide stats and append-only audit writes in the same mutation transactions.
6. Add readiness/index verification. Do not auto-create a demo event when the DB is empty.

**Gate:** tests cover CRUD persistence, duplicate names allowed, references unique within event, cross-event IDs rejected, token omitted from DTOs, immutable token after edit, stale edit returns 409, soft-delete lookup exclusion, capacity, closed-event rejection, stats unchanged by filters, and rollback when audit/write fails. All indexes verified on a real test replica set.

## T04 — Atomic CSV preview and import

**Read:** product §5; technical §§4–5.

**Create:** import service/routes, idempotency model/service, CSV fixtures/template, integration tests.

**Steps:**

1. Parse UTF-8/BOM, quotes, commas/newlines and exact headers with a maintained CSV parser. Enforce size/row caps before expensive work. Do not parse with `split(',')`.
2. Build preview rows with source line numbers, validation errors, duplicate-reference errors and non-blocking duplicate-name warnings. Preview writes nothing.
3. On commit, parse/revalidate original CSV; lock event and recheck capacity/references; insert all guests with new QR values; commit audit and idempotency result atomically.
4. Store canonical payload hash; identical retry returns the original result, different body with the same key returns 409. Concurrent identical import requests cannot duplicate rows.

**Gate:** BOM Arabic/quoted names work; invalid row commits zero guests; header/size/row errors explicit; import retry and concurrent retry create exactly one batch; reference added after preview causes atomic failure; closed-event/capacity failures leave no partial records.

## T05 — Gate resolution, atomic admission and admin correction

**Read:** product §6; technical §§4–6. Follow the admission algorithm exactly.

**Create:** check-in service/routes, gate search/resolve/recent endpoints and focused concurrency tests.

**Steps:**

1. Resolve a QR or manual guest ID only inside an authorized event and return safe current data. Resolve must not write admission.
2. Implement transactional admission with current allowance, expected guest version, authenticated operator/server time, event fence, audit and idempotency.
3. Implement already-admitted details, stale-version response and no matching invitation result without token leakage.
4. Implement admin live-event correction/reset with mandatory reason and preserved audit history. Reset alone enables another deliberate admission.
5. Add recent admission list (10) and verify stats reflect check-in/correction/reset without counters.

**Gate:** two distinct reception users submit simultaneously for one guest with different keys: one commit, one duplicate, one audit admission and correct stats. Same-key retries return original result. Simulated lost HTTP response does not duplicate. Fractional/excess count fails. Closing event concurrently with admission has a serializable result. Concurrent allowance edit or reset cannot silently overwrite a scan. Reception reset/correction and cross-event token use fail.

**Critical:** do not substitute mocked repository tests for the real database concurrency gate.

## T06 — PDF templates, export worker and protected download

**Read:** product §7; technical §7; validation document PDF checks.

**Create:** PDF escape/templates/renderer, QR preview endpoint, export job/service/routes/worker, artifact cleanup, export tests and synthetic PDF evidence.

**Steps:**

1. Bundle Chromium and local Cairo/logo resources; prove standalone Arabic and English sample renders before building the full export pipeline.
2. Create single A6 and four-up A4 pass templates using Halaa tokens; generate QR images internally with quiet zone and adequate print dimensions.
3. Create interim/final report templates, stable heading/table pagination, page numbers and complete attended/pending lists from one shared snapshot.
4. Implement immutable snapshot jobs, queue bounds, one rendering slot, lease recovery, timeout, safe failure states, private atomic files and authenticated download.
5. Implement 24-hour expiry cleanup, orphan/temp cleanup, process shutdown and prevention of publishing after lease loss.

**Gate:** single/selected/all PDFs contain exactly the requested active invitations (including those beyond page 1); parse/decode generated QR images back to expected payloads; Arabic renders joined and in correct direction; long names/20 companion names do not overlap; report totals equal its lists. Unauthorized/cross-event/expired downloads fail. Injected HTML remains literal text and cannot trigger network access. Restart during export recovers or reaches explicit failure, never permanent running. Exports cannot stall gate processing.

**Evidence:** render PDF pages to images for visual review, not only `%PDF` checks; save sample first/middle/last pages and overflow cases. Rendering tools may include local Poppler or a PDF renderer; do not add these QA tools to production unless needed there.

## T07 — Authenticated bilingual Halaa shell and UI primitives

**Read:** product §§2–3, 8; technical §§2, 4. Reuse T00 assets/tokens.

**Create:** localized layouts/login, API wrapper, React Query/session provider, header/event selector/navigation, local Button/Dialog/Field/Badge/Pagination/Notice primitives and theme aliases.

**Steps:**

1. Implement session bootstrap/login/logout and role-aware routing. Clear query cache on logout/user change; clear event-scoped state on event change. Never render old user's data during session loading.
2. API wrapper sends credentials, CSRF on writes, stable error objects, cancellation and 204 handling. Query keys always include event and relevant search/filter/page; user isolation is guaranteed by cache clearing.
3. Build Halaa shell using Cairo and copied tokens; implement Arabic/English dictionaries and locale/dir handling. Document any contrast-safe aliases using existing shades.
4. Dialogs implement focus trap, Escape, correct labels, background focus exclusion, scroll lock and focus restoration. Buttons include pending/disabled/error behavior.
5. Empty/unassigned event and session-expired views are real states, not mock content.

**Gate:** login-to-workspace browser test passes; reception cannot see Guests navigation and cannot use its API; language toggle works and preserves event; keyboard dialog behavior passes; dictionary keys match; mobile layouts fit; screenshots visibly match Halaa colors/typography rather than a new theme. Build/lint pass.

## T08 — Guests workspace, event setup and import UI

**Read:** product §§4–5; technical API contracts; T03/T04 results.

**Create:** GuestsWorkspace, GuestTable, GuestForm, ImportDialog, EventDialog, stats strip, event/guest hooks and UI tests.

**Steps:**

1. Wire event creation/selection/settings and lifecycle controls. Closing/reopening explains the consequences; reopening requires reason.
2. Wire real stats, paginated/searchable/filterable table and complete add/edit/delete dialogs. Support conflict reload, error recovery and input preservation.
3. Implement current-page selection and explicit selected/all behavior; do not confuse page count with event total.
4. Import dialog downloads template, shows preview errors/warnings/counts and confirms with one stable key; network retry cannot generate a new import operation.
5. Add real zero/list/no-results/loading/failure states and periodic visible-only 5-second refresh with asOf labels.

**Gate:** browser flow creates event, adds Arabic/English guests, edits, rejects invalid allowance, imports valid CSV, shows invalid-row details, searches, changes pages/filters, selects/clears, soft-deletes, closes/reopens and survives reload with DB data. Stats remain event-wide under filters. No hardcoded guest records or totals. Mobile table alone may scroll horizontally; page itself does not.

## T09 — Gate UI and scanner lifecycle

**Read:** product §6, all states; technical §5. T05 must be complete before this task.

**Create:** GateWorkspace, CameraScanner, ScannerInput, GuestLookup, AdmissionCard, useGate state machine and gate browser tests.

**Steps:**

1. Model explicit states; a result cannot jump directly from decoded QR to admitted. Preview and confirmation are separate user actions.
2. Implement user-triggered rear camera with `jsqr`, bounded decode loop, ignored duplicate frames, track cleanup and permission-denied fallback.
3. Add keyboard-scanner field and manual lookup; all paths share resolve + confirm behavior and event scoping.
4. Count defaults to zero companions; show derived party count. Lock inputs on submit and persist the key in memory for retries.
5. Handle duplicate, stale preview, closed event, offline/stale data, lost response and expired session exactly as contracted. Server truth controls success.
6. Keep event identity always visible; block accidental event switch during submit or explicitly resolve pending result first. Stop scanner on logout/background/event switch/unmount.

**Gate:** two browser contexts demonstrate one success/one duplicate; invalid and wrong-event QR show no guest details; camera decoding of a test QR enters preview without admitting; permission denied leaves manual/scanner workflows usable; mocked lost-response path reuses key; route/event switches cannot display stale guest. Verify manual count and actual totals. Physical-device camera checks remain separately marked pending until performed.

## T10 — Export/report UI and polished demonstration

**Read:** product §§7–8; T06 job API and T08 selection semantics.

**Create:** QR preview, ExportPanel, report panel, correction/reset dialogs, guarded demo seed, client-side PDF download/print helpers, end-to-end demonstration fixtures.

**Steps:**

1. Wire single/selected/all PDF creation, polling, ready/download/print and failure/expiry/retry states; scope text explicitly states number of invitations.
2. Report panel shows defined metrics, interim/final wording and language choice; downloaded report uses API snapshot.
3. Wire admin count correction/reset with reason and updated stats; receptionist has no access.
4. Implement explicit idempotent synthetic seed: one clearly marked demo event, one admin/two named receptionist accounts provisioned separately, Arabic/English/long names and varied allowances. No password in repo. No production seed.
5. Polish alignment, loading/error/empty states, keyboard accessibility, text and RTL; compare against existing Halaa screenshots/style references.

**Gate:** complete demo journey passes in English and Arabic: seed/import → single/all pass PDFs → staff preview/admit → duplicate → updated totals → close → final report. No dead buttons, fake downloads, placeholder screens or misleading success messages. First/middle/last PDF pages and four responsive viewport sizes reviewed. Build, lint, contract/integration and E2E suites pass.

## T11 — Containers, isolation and deployment rehearsal

**Read:** validation/deployment document in full; root Compose/Caddy/deploy workflow again (they may have changed).

**Create:** mini-app Dockerfiles, standalone Compose, dev replica-set Compose, Caddy snippet, backup/restore/deployment docs; dedicated mini-app CI build/test workflow. Prepare tightly scoped existing-proxy integration changes only as specified in deployment document.

**Steps:**

1. Build mini-app images using only mini-app context. Next standalone runtime includes public/.next/static; API includes compatible Chromium/font/system dependencies. Run non-root; private export volume has correct ownership.
2. Use distinct Compose project/images/network/secrets/paths and no host port 80/443 binding. API/web health checks prove their respective readiness.
3. Run production containers in a local/staging environment with a disposable database; verify same-origin login/cookies/proxy/PDF rendering/persistence.
4. Prepare external shared proxy network and root Caddy host block with explicit API/UI routing. Prevent next main-app deploy from reverting the integration. Document the one-time network/Compose integration, not just the snippet.
5. Implement independent build/tag/release instructions and CI tests. Production rollout remains manual/reviewable; never modify the existing Halaa image tags or data.
6. Rehearse backup/restore to a new mini-app test database and image rollback. Record measured API latency during full bulk export and memory headroom.

**Gate:** production Docker build and smoke checks pass; container restart retains records/sessions; job recovery works; private PDFs aren't publicly addressable; exports and gate coexist within measured limits; backup restore reproduces counts/token resolution; rollback works; parent deployment integration is explicit and scoped. No live VPS/DNS action is claimed without separate execution.

## T12 — Acceptance audit and handoff

**Read:** all documents and current ledger; every acceptance row in the validation document.

**Do:** run the full suite against the final build, inspect screens and PDFs, review security/scoping/concurrency implementation, record the demo walkthrough, classify each acceptance row pass/fail/blocked, and fix verified in-scope defects. Re-run affected checks after fixes.

**Deliver:** mini-app README with exact local/production commands; config template; named-user provisioning procedure; seed procedure; deployment/backup/rollback instructions; test report with evidence links; remaining external prerequisites. Update milestone language accurately.

**Gate:** zero unresolved software blockers for “demo verified locally”. Actual hostname/VPS rehearsal and actual phones must be verified before labeling deployed/gate ready. Do not convert blocked device tests into passing software tests.

## If a task is too large for one context

Stop only at a coherent verified boundary, mark it **partial**, and list the exact unfinished subtasks/files/tests. The next session resumes that same task. Do not mark it complete to advance the ledger. Avoid parallel agents changing shared contracts or files; sequential implementation is intentional for this handoff.
