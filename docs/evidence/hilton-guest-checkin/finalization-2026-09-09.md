# Finalization evidence — 9 September 2026 (F01–F33 working-tree implementation)

Scope: `D:/halla` at HEAD `46895fc2e9acfaba58753b8fa740f3804f934985` plus uncommitted implementation including this finalization. No application code was changed during the 9 Sept review itself; this report covers the subsequent corrective implementation. Synthetic data only. No deploy, DNS, production data, messages, or physical-device checks. Historical evidence under `docs/evidence/hilton-guest-checkin/` was never overwritten; this is a new file.

Technical contract (`docs/implementation/hilton-guest-checkin/02-TECHNICAL-CONTRACT.md`) remains authoritative over comments and prior completion claims. Architecture, admission policy, bilingual design, and v1 exclusions preserved.

## 1. Exact release tree under test

- Repo: `D:/halla`, HEAD `46895fc2e9acfaba58753b8fa740f3804f934985` (dirty; mini-app + docs only — see `git status --short`).
- Mini-app: `halaa-checkin/` (contracts/api/web workspaces, `package-lock.json` mini-app only).
- Key files: `halaa-checkin/.gitignore` (anchored F01), `api/src/modules/exports/*` (12 files, now git-eligible), `api/src/modules/exports/exportQuota.js` (new, F19), `web/hooks/useSession.jsx` + `useGate.js` + `useEvent.jsx` + `useGuests.js` + `useStats.js` + `useExports.js`, `web/lib/api.js`, gate/guest components, `api/src/app.js` + `server.js`, `api/src/db/*`, `api/scripts/backup-db.mjs` + `purge-event.mjs`, `contracts/src/schemas.js`, Dockerfiles (pinned), `.github/workflows/halaa-checkin.yml` (reordered), `design/SOURCES.json` + `scripts/check-design.mjs` (provenance).
- Pinned/tested versions observed: Node v24.13.1, Next 15.5.x, React 19, Express 4.21.2, Mongoose 8.9.7, Zod 3.24.2, `playwright-core 1.50.1`, `csv-parse 5.6.0`, `@tanstack/react-query 5.90.21`, `content-disposition 0.5.4` (now direct). Base images: `node:24.13.1-bookworm-slim` (record digest per release via `docker buildx imagetools inspect`). Browser: Debian `chromium` via apt / `CHROMIUM_PATH=/usr/bin/google-chrome` in CI — record `chromium --version` / `google-chrome --version` per release (CI step added). No parent-app upgrade.

## 2. Fresh checks (repaired tree)

From `D:/halla/halaa-checkin`:

- `npm test` → 126/126 pass (41 contracts + 61 api + 24 web unit), 0 fail.
- `npm run lint` → 0 errors, 0 warnings.
- `npm run design:check` → 15/15 + provenance hash/parity/parent-drift checks pass.
- `npm --prefix web run build` → Next production build, 12 static pages.
- `git check-ignore -v halaa-checkin/api/src/modules/exports/exports.service.js` → no match (F01 source eligible).
- `git check-ignore -v halaa-checkin/api/data/exports/test.pdf` → still ignored via anchored `/api/data/` (F01 runtime still ignored).
- `git ls-files halaa-checkin/api/src/modules/exports` → untracked-but-eligible (`?? halaa-checkin/api/src/modules/exports/`), not ignored. Same for `halaa-checkin/deploy/` and `.github/workflows/halaa-checkin.yml` (pre-existing uncommitted work, now eligible — staged/committed only via reviewed release process, not here).
- Existing browser/PDF evidence suites not rerun (they overwrite historical evidence). Prior 61-API/36-web historical claims are not presented as fresh results here.

## 3. What was verified vs what still needs proof

Verified in code + targeted unit/integration suites (no live infra):

- F01 packaging eligibility, F02 DTO normalization shape, F04 unit/build ordering, F08 `details.guest` shape (api test asserts `details.guest.id` + `checkIn`), F13 structured preview issues, F14 duplicate-header rejection path, F16 integer/re-reference logic, F19 sequential rate-limit guards (api rate-limit test), F21 cleanup sweep (api cleanup test, incl. missing-dir DB path + basename validation + snapshot unset), F22 lease/attempt predicates (api worker-recovery test), F26 manifest recursion path, F27 scope verification logic, F28 index/UUID/expiry/provisioning paths (auth test updated to real events), F30 focus stability (static), F31 provenance hashes.
- API concurrency primitives preserved: two-device same-guest → 1×201 + 1×409 `ALREADY_CHECKED_IN` with 1 audit (existing api tests green).

Not freshly certified (verification gaps, not passing claims):

- Clean-checkout install/test/build + both image builds from the exact release tree (F01/F04 acceptance requires an isolated copy — not run here; do not borrow this checkout's ignored source/build output).
- Real API login/bootstrap/refresh for admin + each receptionist with badge/assignments/redirects (F02 browser proof).
- Fresh-DB first-event + second-event creation + event-switch via UI with no seed bypass; `/events` failure vs empty distinction (F03).
- Fake-camera QR image/video frame through `getUserMedia` → video → canvas → jsQR → resolve with zero check-ins until confirm; start/stop/start, denial, playback failure (F05); deferred-permission/event-switch/background/session-expiry track disposal + no overlapping resolves (F06).
- Delayed A/B event-switch resolve/search/confirm + reverse-order searches + logout/reset guards (F07); two-session concurrent admission loser details (party size/time/operator) with 1 audit (F08); stale-preview/concurrent-edit/double-click/dropped-response/502-504/hung-request/verify-before-commit/correction-between-commit-and-retry/companion-change matrix with no false success (F09); expiry/revoke while Gate open with camera active + reauth reconciliation + logout network-loss behavior (F10); online-but-API-unreachable indicator + cross-device refresh within contract window + failed-fetch non-empty guarantees (F11).
- Arabic/English error-text matrix (validation, reference collision, version conflict, CSV, QR, closed-event, camera denial) with no `errors.undefined`/raw keys (F12); malformed-header/multiline-name/blank-allowance/duplicate-reference/duplicate-name-warning/post-preview-conflict previews with names/rows/issues in both languages and zero-commit on invalid (F13); duplicate-each-header rejection + reordered-headers pass (F14); near-limit/over-limit UTF-8/quoted CSV + file replace/remove + event-switch-after-preview + close/reopen + lost-import-response (F15); clear-reference reuse + `1.5`/blank/negative/>20 in guest/correction forms (F16); two-session edit/correct/reset/close conflict→reload→retry + error non-inheritance (F17); slow-B no-A-leak + invalid/revoked/deleted URL consistency + beyond-100 event access (F18).
- Simultaneous at/beyond-limit export bursts across events/admins (never >3/admin or >10 overall, 429 structured) incl. completion/crash/cleanup without leaks (F19); concurrent close/metadata-update vs export snapshot coherence (F20); raw-DB post-expiry snapshot absence + orphan/tmp cleanup + missing-dir/unlink-failure/startup/retention paths with correct status/download codes (F21); slow-QR/stuck-render/deadline/stale-owner/expiry-during-render/interruption/two-attempt exhaustion with single render slot and usable gate traffic (F22); Chromium-unavailable/unwritable-storage/stopped-worker readiness 503 + safe export errors with healthy gate + no internal leaks (F23); create→close→reopen→download same job, Gate-navigate-and-back, 429/poll-network/401-404/expiry/failed-download states with no auto-duplicate + report metrics (F24); QR-dialog vs panel A6 PDF parity (size/quiet zone, no chrome) + popup/delayed-download handling with no bulk print (F25).
- BSON + JSON backup/restore on isolated DBs with corruption rejection, type preservation, empty/closed/live fixtures, container rehearsal with out-of-container persistence, TLS forwarding, no URI logging (F26/F29); dry-run purity + concurrent-import/export/worker + mid-step-failure purge safety with no cross-event changes (F27); wrong unique/partial/TTL failure, prod no-silent-index-mutation, malformed/expired keys, nonexistent assignments, same-key replay (F28); clean image build/smoke + rollback on tested closure (F29).
- Continuous typing through polling without focus jumps, Tab/Shift-Tab/Escape/restore, Arabic screen-reader labels (F30); 1440×900/1024×768/390×844/360×800 Arabic/English workflows incl. errors/dialogs with measured contrast + drift detection on disposable copy (F31); new single-A6/multi-A4/interim-final renders in both locales (first/middle/last pages, max-length mixed-script, 4-up pagination, joined Arabic, bidi, embedded fonts, QR quiet-zone + decode-back) + two-gate + 1,000-pass/full-report load with CPU/mem/p95/throughput/retries/worker-recovery (F32).
- Genuine Playwright → production frontend → Express → disposable replica-set journey (fresh DB/admin → first/second events → ar/en guests → invalid/valid CSV with rows/errors → edit/clear-reference/conflict-reload → >25 selection → single/selected/all PDF + resumable panel → both receptions via real DTO → camera/manual/hardware preview → concurrent/lost-response → correction/reset → close/reopen → final report → restart persistence → logout/expiry) (F33).

## 4. Acceptance reclassification (A01–A30)

Do NOT carry A01–A27/A29 forward as unconditional passes. Historical T12 passes remain historical only.

- A01 (release/install/build/images): BLOCKED — needs clean-copy verification (F01/F04).
- A03/A04 (auth/session/first-event): BLOCKED — needs real-session + first/second-event browser proof (F02/F03).
- A08/A10/A11/A12 (guests/imports): BLOCKED — needs guest/import browser + CSV matrix proof (F12–F18).
- A14/A15/A18/A19/A20 (gate/UI): BLOCKED — needs gate integration/race/recovery proof (F05–F11).
- A24/A26 (exports): BLOCKED — needs snapshot/recovery/queue proof on repaired release (F19–F25).
- A29 (backup/restore): BLOCKED — needs both BSON + JSON paths (F26).
- Preserved: API subchecks green (41+61+24) are valuable regression guards, not release acceptance.
- A28 (deployment/hosting) + A30 (real devices): EXTERNALLY BLOCKED (unchanged) — hostname/DNS/HTTPS, DB-scoped credentials + transaction support + backup destination, VPS headroom, reviewed Caddy/Compose integration order, exact-SHA deploy + named accounts/assignments + cookie/CSRF/proxy/download/camera-policy + readiness, isolated restore/rollback rehearsal + backups/monitoring, real event details + retention + principal-guest/one-time-count policy acceptance, two-device printed/phone-screen/duplicate + backup-connectivity/power + operator sign-off. Prepare config/runbooks only; do not deploy, change DNS, contact anyone, or touch production data.

## 5. Required integrated journey (F33, to be executed on the repaired release)

Fresh DB/admin → first + second events → Arabic/English guests → invalid + valid CSV with visible rows/errors → edit/clear-reference/conflict-reload → selection across >25 guests → single/selected/all PDF + resumable panel → both reception users via actual session DTO → camera/manual/hardware preview → concurrent admission/lost-response → correction/reset → close/reopen → final report → restart persistence → logout/expiry.

## 6. Definitions (do not relabel)

- “Demo verified locally” requires all software findings closed + the real-browser journey above passing on the exact release tree.
- “Deployed” and “gate ready” require separate live evidence (A28 + A30). Do not claim them from local passes.

## 7. New vs historical

- New: this file only (plus working-tree code/docs). No historical screenshots/PDFs overwritten.
- Historical: `t00–t12` artifacts + `t12-acceptance-report.md` + `t11-containers-deployment.md` remain as prior-release evidence, not proof of this tree.
