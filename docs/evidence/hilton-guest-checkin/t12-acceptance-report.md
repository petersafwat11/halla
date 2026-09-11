# T12 — Acceptance audit and handoff: test report

Date: 2026-09-09 18:12 UTC. All data synthetic. No live VPS/DNS/Atlas action
taken or claimed. No real guest lists, tokens, cookies, passwords, or URIs in
this report. No production rollout performed. Uncommitted T00–T11 work plus the
documented hardening pass preserved; T12 changes are docs-only inside the
allowed paths.

Environment: Windows PowerShell 5.1, Node v24.13.1, npm 11.8.0, repo
`D:\\halla`, HEAD `46895fc2` (tree dirty with mini-app + evidence work, see
`git status --short`). Mini-app `halaa-checkin/` only. Local Docker images
reused, not rebuilt: `halaa-checkin-api:t11` (2.7 GB), `halaa-checkin-web:t11`
(443 MB), `:dev` variants present. Dev overlay was NOT started in T12 (no
teardown needed); container measurements below are cited from the T11
rehearsal instead of re-running heavy capacity tests, per task instructions.
Key pinned versions: Next 15.5.25, React 19, Express 4.21.2, Mongoose 8.9.7,
Zod 3.24.2, playwright-core 1.50.1, Chromium 152.0.7977.82 (T11 image probe),
csv-parse 5.6.0, @tanstack/react-query 5.90.21.

## 1. Suites (final build, from `D:\halla\halaa-checkin`)

| Suite | Command | Result |
| --- | --- | --- |
| build | `npm run build` | PASS — contracts ok + Next 15.5.25 compiled, 12 static pages (`/`, `/_not-found`, `/[lang]`, `/[lang]/gate`, `/[lang]/guests`, `/[lang]/login` × ar/en) |
| lint | `npm run lint` | PASS — 0 errors, 0 warnings (re-ran after T12 doc edits, still clean) |
| design:check | `npm run design:check` | PASS — 15/15 (tokens, hashes, 4 Cairo binaries + license, 3 logos, root-block parity) |
| contracts | `npm test` (contracts) | PASS — 41/41, 0 fail |
| api | `npm test` (api) | PASS — 61/61, 0 fail (auth 9, gate/admission/concurrency/correction/reset, config 4, QR/PDF/queue/snapshot/lease/escape/cleanup/readiness/evidence, events/guests/stats/transactions, imports 10, liveness 1) |
| web | `npm test` (web) | PASS — 30/30, 0 fail (T07 shell 11 + browser-shell 4, T08 units 7 + browser-guests 1, T09 units 8 + browser-gate 1) |
| e2e | `npm run test:e2e` | PASS — 1/1 (full journey: auth, lifecycle, CRUD, resolve-read-only, admit + same-key replay + duplicate, stats, CSV preview/commit + idempotent replay, QR + report export/download, bilingual shell without token leak, restart persistence, logout) |

Total `npm test`: 132/132 (41 + 61 + 30). No parent manifests, lockfiles, or
Halaa sources touched (`git status --short` shows only `halaa-checkin/`,
`docs/evidence/hilton-guest-checkin/`, `docs/implementation/hilton-guest-checkin/`,
plus pre-existing untracked mini-app files).

## 2. Screens and PDFs inspected (rendered output, not return codes)

Existing evidence under `docs/evidence/hilton-guest-checkin/` (hardening-pass
regenerations preserved as uncommitted changes) plus text-extraction checks:

- `t06-sample-single-pass.pdf` — extracted text shows event name/venue,
  Riyadh time, Arabic guest name, `المرافقون المسموح بهم: 2`, short code,
  `يرجى إبراز رمز الاستجابة السريعة عند الدخول`. A6 single-pass layout.
- `t06-sample-bulk-passes.pdf` — 4-up content for 4 synthetic guests
  (Arabic + English + long name), each with companion counts and cut-safe
  blocks. Titles/venues/times present on every pass.
- `t06-sample-attendance-report.pdf` — interim wording
  (`تقرير الحضور المرحلي`), `Asia/Riyadh` timestamp label, stats cards,
  attended (0) + pending (1) tables with reference/companion columns, and the
  companion-reference footnote. Totals match lists in the rendered file.
- `t06-single-pass-a6-ar.png` — A6 card: Halaa mark, event title, guest name,
  allowance line, centered QR with quiet zone, short code, instruction line.
  No overlap.
- `t06-overflow-20-companions.png` — 20-companion array wraps across lines
  without overlap; counts (`20`, `21`, `20 + 1`) and `Asia/Riyadh` label legible.
- `t08-guests-workspace-ar-1440x900.png` — RTL Guests workspace: Halaa header,
  event identity + live badge, stats strip (4 invitations / 8 expected / 2
  admitted / 3 pending in fixture-shaped data), search + filters, paginated
  table with short codes/references/status/badges, no page-level overflow.
- `t09-gate-workspace-ar-1440x900.png` — Gate workspace: event identity always
  visible, connection pill + asOf, camera panel, USB/Bluetooth scanner field,
  manual lookup, recent-admissions section. Reception-only nav (no Guests tab).
- Spot-checked `t07-*`, `t08-*-360x800/390x844`, `t09-*-360x800/390x844`,
  `t06-bulk-passes-a4.png` — branding, Cairo type, 44px targets, and
  mobile containment hold; no clipping observed.

No fresh renders were generated in T12 because no template/component behavior
changed in T12 (docs-only edits); the hardening-pass renders above are the
current visuals for the final build.

## 3. Security / scoping / concurrency spot-checks (contract §§2–5)

- §2 identity: `api/src/middleware/auth.js` resolves session by SHA-256 digest,
  rejects disabled/deleted users; `authorize.js` enforces `requireAuth` /
  `requireRole` / `requireEventAssignment` (reception unassigned → generic 404).
  `config.js` fail-fasts on Halaa DB names, HTTP origin in prod, weak secrets;
  prod cookie `__Host-halaa-checkin-session` vs dev name. Covered by
  `api/test/auth.test.js` (9) + `config.test.js` (4).
- §2 CSRF/logs: `middleware/csrf.js` exact-Origin match + JSON content-type +
  timing-safe `X-CSRF-Token`; login has no prior token so Origin+JSON is its
  protection. `middleware/errors.js` sets `no-store`/`noindex`, maps
  DomainError/Zod/JSON/413/E11000→`REFERENCE_CONFLICT` without stack leaks.
  `grep console.*` in `api/src` shows only dbName/port/lifecycle messages —
  no QR/password/cookie/CSV/PDF/companion/URI logging. Covered by auth
  Origin/CSRF tests + e2e unauthenticated-download check.
- §3 models: `guest.model.js` enforces `qrToken select:false`, unique
  `qrToken` / `(eventId, shortCode)` / partial `(eventId, referenceKey)`,
  listing + recent indexes, `toSafeDto()` excludes `qrToken` and derives
  `totalAllowed`/`actualPartySize`. `connection.js` enforces mini-app DB prefix
  and replica-set readiness. Covered by guests/events/stats/transaction tests.
- §4 conventions: `app.js` proxy trust is explicit (`trustProxyHops`),
  Helmet + bounded 2 MB bodies + rate limits, health `/health/live` (public)
  vs `/health/ready` (DB + indexes + replica set + optional worker health).
  Route table matches contract §4; export scope rules (selected 1–1000, empty
  QR 422, report event-wide) enforced by `exportCreateSchema` + service.
- §5 admission: `checkins.service.js` follows the contract order —
  session/assignment/Origin/CSRF (middleware) → payload + UUID key validation
  → canonical hash → transaction: idempotency replay/`IDEMPOTENCY_CONFLICT`,
  live-only event fence (`activitySeq` predicate), active-guest read, duplicate
  → `ALREADY_CHECKED_IN` with safe details, version check, allowance check,
  predicated update (`checkIn:null` + version), audit, idempotency record;
  E11000 race falls back to reading the committed record. Correction/reset are
  admin-only, live-only, versioned, reasoned (5–500), audit-preserving.
  Covered by `checkins.test.js` (13: resolve/search/recent, fractional/excess,
  non-live, same-key/lost-response, two-user concurrency, close-vs-admit,
  edit-vs-scan, reception 403, correction, reset) + browser-gate two-context
  test + e2e admit/replay/duplicate.
- §7 exports (supporting): `exports.service.js` snapshots inside the
  transaction, queue bounds re-checked in-transaction (10 total / 3 per admin),
  UUID basenames + atomic rename, path-traversal guard, state-gated download
  (`EXPORT_NOT_READY`/`EXPORT_FAILED`/`EXPORT_EXPIRED`), QR preview without raw
  token, 24h expiry strips `qrToken` from snapshots + unlinks artifacts + orphan
  sweep. Worker is one-slot with 90s lease/2-attempt cap. Covered by
  `exports.test.js` (12).

## 4. Acceptance matrix A01–A30

Env key: L = local Windows (Node 24.13.1, disposable replica-set harness,
production `next start` for e2e); C = T11 Docker Desktop rehearsal (cited, not
re-run); B = Playwright desktop-browser automation (no real phones).

| ID | Verdict | Evidence / env |
| --- | --- | --- |
| A01 | PASS | `npm run build` + `npm run lint` clean; `git status --short` shows no root/shared/halaa-*/workflow changes. Env L. |
| A02 | PASS | `npm run design:check` 15/15; `design/tokens.css` + `SOURCES.json`; screenshots show Halaa tokens/logo/Cairo. Env L. |
| A03 | PASS | ar/en at 1440/1024/390/360 via `browser-shell/guests/gate` tests (4+1+1) + PNGs at 1440/390/360; no page overflow. Env L+B. |
| A04 | PASS | `auth.test.js` (cookie flags, persistence, logout/revocation/expiry, rate limit) + e2e login/session/restart/logout. Env L. |
| A05 | PASS | Role/scope tests (auth, guests cross-event, checkins cross-event, exports 403/404) + web role guards + browser reception redirect. Env L+B. |
| A06 | PASS | Origin/CSRF rejection tests; `errors.js` no-store/noindex; log grep shows no secrets; e2e unauth download ≠200. Env L. |
| A07 | PASS | Events lifecycle tests + e2e draft→live; closed freezes mutations; reopen requires admin reason (schema + service). Env L. |
| A08 | PASS | Guests CRUD tests (ar/en, 0..20, duplicate names, 409 stale, immutable token). Env L. |
| A09 | PASS | Soft-delete exclusion + admitted-guest delete/edit 409; reset-before-delete path tested. Env L. |
| A10 | PASS | Normalized search, stable pagination, event-wide stats, page-selection counts (guests tests + GuestsWorkspace browser flow). Env L+B. |
| A11 | PASS | Imports tests: BOM/Arabic/quotes/newlines, header/size/row caps, zero-partial-commit rollbacks. Env L. |
| A12 | PASS | Same-key replay + concurrent same-key single batch + changed-body 409 + post-preview conflict (imports tests + e2e). Env L. |
| A13 | PASS | Resolve tests + e2e resolve-leaves-`checkIn:null` + stats 0; camera decode enters preview only (browser-gate). Env L+B. |
| A14 | PASS | Concurrency test: two receptions, different keys → 1×201 + 1×409 `ALREADY_CHECKED_IN`, 1 audit, correct stats. Env L (replica set). |
| A15 | PASS | Same-key retry returns original body without duplicate (checkins + e2e); UI `lost_response` reuses key (unit + browser-gate). Env L+B. |
| A16 | PASS | Close-vs-admit serializable, allowance-edit isolation, reset-vs-scan tests. Env L. |
| A17 | PASS | Schemas reject token/operator/time/status/unknown keys; service uses authenticated actor + server time (admission/correction/reset tests). Env L. |
| A18 | PASS | Camera permission fallback, <2s duplicate-frame suppression, 150 ms throttle, track stop on background/nav/event/logout (code + browser-gate fallback; desktop simulation only). Env L+B. |
| A19 | PASS | Name/reference/shortCode lookup + hardware-scanner field share resolve→confirm flow (GuestLookup/ScannerInput + browser-gate). Env L+B. |
| A20 | PASS | Admin-only correction/reset with reason+version, audit preserved, stats corrected, reset enables re-admission; reception 403 (tests + dialog). Env L. |
| A21 | PASS | Exact fixture 3/8/2/6/1/66.7%/75.0% in contracts + api stats tests (filter-independence). Env L. |
| A22 | PASS | Single/selected/all include all active guests beyond page 1; QR decode-back tests; stable reprint (exports tests + e2e download `%PDF-`). Env L. |
| A23 | PASS | Arabic shaping/bidi/wrapping, local fonts, 4-up boundaries, quiet zone + print size verified by decode + rendered PNGs/PDFs (§2). Env L. |
| A24 | PASS | Snapshot-shared lists/totals; interim/final wording; `Asia/Riyadh` labels in templates + rendered report (§2). Env L. |
| A25 | PASS | Admin-only private download, no static serving, HTML-escape + blocked renderer network, safe disposition (exports tests + e2e). Env L. |
| A26 | PASS | Queue bounds (10/3 → 429), one slot, lease recovery/2-attempt cap, expiry removes artifact + strips snapshot (worker/cleanup tests). Env L. |
| A27 | PASS | Restart preserves guests/sessions (e2e + C cited); DB-prefix guard + no Halaa collections/paths (config tests). Env L (+C cited). |
| A28 | BLOCKED | Requires selected HTTPS hostname + VPS Caddy/Atlas routing + Halaa regression check. Only prepared + `caddy validate` on merged file (T11 §7, cited). Never applied live. No VPS/DNS action taken. |
| A29 | PASS | Local rehearsal cited (T11 §§5–6): backup→restore-verify totals/QR/admission/audit/new-admission PASS; purge removes only target event; restart + rollback drill preserve data. Env C (disposable DB, local tags for SHAs). Production Atlas backup destination + VPS rollout remain external (see §5). |
| A30 | BLOCKED | Requires two real reception devices scanning printed + phone-screen PDFs, duplicate display, backup connectivity/power. Desktop Playwright only (A18/A19); never executed on phones/print. |

Capacity (cited from T11, not re-run): import 1k rows ~2.3 s atomic; admission
p95 ~48 ms (target ≤1000 ms); full 1k-pass render ~23 s (lease 90 s);
gate-during-render p95 ~173 ms (target ≤2000 ms); api peak 829.8 MiB/1 GiB
(19% headroom), web ~46 MiB/512 MiB. See
`docs/evidence/hilton-guest-checkin/t11-containers-deployment.md`.

## 5. Defects found + fixed in T12

No verified code-logic defects found (all suites green, spot-checks match
contract, PDFs/screens visually verified). Fixed three handoff-doc gaps
(mini-app paths only, reviewable):

1. `halaa-checkin/README.md` — was missing exact local/production commands,
   `.env.example` reference, provisioning/seed procedures, and
   deployment/backup/rollback summaries. Expanded with copy-paste commands,
   env table, `user:provision` (interactive + `USER_PASSWORD`), `seed:demo`
   (guarded, `--reset-demo --confirm`), dev-overlay + `IMAGE_TAG` rollout,
   backup/restore/purge/rollback one-liners, and pointers to
   `deploy/README.md` / `deploy/OPERATIONS.md` / T12 report.
2. `halaa-checkin/.env.example` — `SESSION_SECRET` was commented out and
   `PLAYWRIGHT_BROWSERS_PATH` / `DEMO_SEED_PASSWORD` were undocumented.
   Made `SESSION_SECRET` an explicit placeholder with generation command and
   prod fail-fast note; added commented `DEMO_SEED_PASSWORD` + Chromium hints.
   No real secrets added.
3. `halaa-checkin/deploy/compose.dev.yml` — header omitted `npm run build`
   before `npm run test:e2e` (e2e asserts `web/.next` exists). Added the build
   line. No compose semantics changed.

Verification re-runs after fixes: `npm run lint` PASS (0 errors),
`npm run design:check` PASS (15/15). Full `npm test` / `test:e2e` were already
green on the final build and docs edits touch no code paths.

## 6. Deliverables written / updated

- Updated: `halaa-checkin/README.md` (commands, config, provisioning, seed,
  deployment/backup/rollback pointers).
- Updated: `halaa-checkin/.env.example` (explicit session-secret placeholder,
  seed/Chromium hints).
- Updated: `halaa-checkin/deploy/compose.dev.yml` (header: build before e2e).
- Verified accurate, no changes needed: `halaa-checkin/deploy/README.md`,
  `halaa-checkin/deploy/OPERATIONS.md`, `halaa-checkin/deploy/ROOT-INTEGRATION.md`,
  `halaa-checkin/deploy/Caddyfile.snippet`, `halaa-checkin/deploy/compose.yml`.
- New: `docs/evidence/hilton-guest-checkin/t12-acceptance-report.md` (this file).
- Updated: `docs/implementation/hilton-guest-checkin/PROGRESS.md` (T12 entry,
  header status, Final milestone language — demo verified locally, deployed /
  gate-ready still pending).

## 7. Remaining external prerequisites (block deployed / gate-ready claims)

Per `04-VALIDATION-AND-DEPLOYMENT.md` §8, still required before live use:

- Final hostname/DNS + VPS CPU/RAM/disk headroom (candidate
  `checkin.halaa.com.sa` not provisioned; budgets from T11 must be re-checked
  on the real VPS).
- Dedicated Atlas credentials + backup destination (no live DB inspected).
- Real event details + hotel's agreed retention period.
- Hotel acceptance of the v1 admission policy (principal present, actual
  companions once, no late separate companion admission).
- Named reception accounts + event assignments, two tested devices, backup
  device/power/connectivity, on-site arrangements.

## 8. Could NOT verify and why

- A28 production proxy (HTTPS host, Caddy routing, cookie/auth through public
  origin, Halaa regression): not executed — no hostname/VPS/DNS access taken
  in T12; only the prepared snippet + `caddy validate` (T11) exists.
- A30 real devices (printed + phone-screen scans on two reception phones,
  duplicate display, backup connectivity): not executed — desktop browser
  automation only; no phones/printers available in this session.
- Heavy capacity re-run: deliberately not re-run (task permits citing T11);
  images reused (`:t11`/`:dev` present), no source changes demanded a rebuild,
  dev overlay never started so no teardown was needed.
- Live Atlas/VPS/DNS state: never inspected; no production deployment,
  commit, push, or PR performed.
