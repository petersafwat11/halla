# T11 — Containers, isolation and deployment rehearsal: evidence report

Date: 2026-09-09 (UTC). All data synthetic. No live VPS/DNS action taken or
claimed. Rehearsal ran on Docker Desktop (16 CPU / 15.3 GiB) with published
localhost ports only; production rollout remains manual per
`halaa-checkin/deploy/README.md`.

## 1. Images built (mini-app context only)

| Image | Base | Size | Key contents verified inside image |
| --- | --- | --- | --- |
| `halaa-checkin-api:t11` | `node:24-bookworm-slim` (node v24.20.0) | 2.7 GB | `helmet@8.0.0`/`cors@2.8.5` load from nested `api/node_modules`; `npm ls --omit=dev` clean; `Chromium 152.0.7977.82 (bookworm)`; `playwright-core 1.50.1`; Cairo TTFs registered; `/app/data/exports` owned by UID 1001; runs as non-root `appuser`; `api/src/app.js` imports |
| `halaa-checkin-web:t11` | `node:24-bookworm-slim` | 443 MB | standalone server + static + public; rewrite baked to `http://127.0.0.1:8100` (fails closed; unreachable behind Caddy); portal fix present in build output |
| `halaa-checkin-web:dev` | same | 443 MB | identical except rewrite baked to `http://checkin-api:8100` (build-arg) |

Follow-ups (not blockers): api image is 2.7 GB because the workspace install
hoists the web toolchain into the top-level `node_modules`; a workspace-scoped
install would slim it. Base pins float on `node:24-bookworm-slim` minor —
record image digests (`docker inspect`) in the release notes when tagging SHA
releases in CI.

## 2. Container smoke (dev overlay: local builds, replica-set mongo)

- `checkin-mongo` (mongo:7.0, single-node rs0 via `mongo-init` gate): healthy.
- `checkin-api`: healthy; logs show MongoDB connect, index init, worker start,
  listen on 8100. `/health/live` 200, `/health/ready` 200 (DB + indexes).
- `checkin-web`: healthy; `/ar/login` + `/en/login` 200.
- Named admin provisioned via container exec (hidden-prompt equivalent:
  `USER_PASSWORD` secret env, never argv/files).
- Same-origin login **through the web container proxy** (`:3100/api/...` →
  rewrite → `checkin-api:8100`): 200. Direct `:8100` login: 200.

## 3. Capacity rehearsal (synthetic 1,000-invitation events, driver: `deploy/rehearse-capacity.mjs`)

| Measurement | Run B (pre-fix) | Run C | Run D (final) | Target |
| --- | --- | --- | --- | --- |
| CSV import commit, 1,000 rows atomic | 2291 ms | 2260 ms | 2346 ms | — (atomic, no partial commit ✓) |
| Admission burst (80, 2 sessions alternating) p50 / p95 / max | p95 31 ms | p50 29 / p95 40 / max 51 ms | p50 30 / p95 48 / max 62 ms | p95 ≤ 1000 ms ✓ |
| Full all-pass QR export render (1,000 passes) | 42.2 s | 23.3 s | 23.2 s | ≤ 90 s lease ✓ |
| Gate admissions **during** render p50 / p95 / max | p95 27709 ms (n=7) ✗ | p50 91 / p95 142 / max 142 ms (n=11) | p50 105 / p95 173 / max 173 ms (n=11) | p95 ≤ 2000 ms ✓ (after fix) |
| Totals after run | 1000 / 87 | 1000 / 91 exact | 1000 / 91 exact | exact, no drops/dupes ✓ |
| Unauthenticated export download | — | — | 401 (not 200) ✓ | must not be 200 ✓ |

Memory during render (`docker stats`, api limit 2 CPU / 1 GiB):
api peaked at **207% CPU (throttled at the 2-CPU ceiling) and 829.8 MiB
(81% of budget)**, settling to ~400 MiB idle. Web ~46 MiB / 512 MiB (9%).
Budgets HELD with margin; mem headroom is 19% — keep the 1 GiB api budget and
re-check on the real VPS; raising api CPUs would cut render time but is not
required to meet the targets. (Mongo ~237 MiB is dev-only; production is Atlas.)

## 4. Bugs found by the rehearsal and fixed in this task

1. **API image missing deps**: runner copied top-level `node_modules` but npm
   nests this workspace's api deps at `api/node_modules` → `helmet`/`cors`
   UNMET, container crash-loop. Fixed: copy the nested closure (+ `web/
package.json` so the workspace symlink resolves); `npm ls` clean in image.
2. **Entry guard never true on Linux**: `file:///${process.argv[1]}` yields
   four slashes for absolute POSIX paths, so `server.js` and all CLIs exited 0
   without doing anything in containers. Fixed with `fileURLToPath ===
path.resolve(argv[1])` in `server.js` + 5 scripts.
3. **Rewrites are build-time**: Next serializes `rewrites()` into
   `routes-manifest.json`; runtime env cannot change them. Fixed with an
   `ARG BACKEND_PROXY_URL` (default loopback, fails closed) + dev build-arg
   for the container network; corrected the misleading comment. Verified per
   tag from inside both images.
4. **27 s gate stall during full export**: 1,000 back-to-back QR renders
   starved the single-process event loop. Fixed with sequential generation +
   `setImmediate` yield every 10 (contract-preserving): gate p95 27.7 s →
   ~0.15 s, render 42 s → 23 s. API suite still 61/61.
5. **Backup missed `select:false` secrets** (`qrToken`, `passwordHash`,
   `snapshot`) and **`insertMany(ordered:false)` silently skips invalid docs**:
   first restore "succeeded" with 0/4000 guests. Fixed backup includes +
   `throwOnValidationError:true` + documented backup-file sensitivity
   (hashes/tokens → encrypt, never paste). Re-ran green (see §5).
6. **Web `Dialog` inert regression** (pre-existing uncommitted change, not
   authored here): `inert` on `#app-lang-root` also inerted the in-tree modal,
   so hit-testing skipped every modal button (`<body>` intercepts) and the
   Guests browser E2E failed deterministically. Fixed by portaling the dialog
   to `document.body` (fixed backdrop unaffected; SSR/hydration safe).

## 5. Backup / restore / purge (container exec, disposable DB)

- Backup (JSON fallback, no `mongodump` in image): 4 events, 4000 guests,
  385 audits, 373 idempotency, 4 jobs, 3 users, 12 sessions; window <1 s on a
  quiet DB (production: prefer Atlas backup or stop writers — manifest records
  the window).
- Restore-verify into fresh `halaa_checkin_restore_20260909`: all 7 totals
  match, QR lookup resolves (shortCode match), pre-existing admission present,
  104-record audit trail present, NEW admission commits (201). All PASS.
- Purge dry-run then `--confirm` on a 1,000-guest event: 1000 guests, 104
  audits, 101 idempotency records, 1 job + 1 artifact file removed; verified
  zero residuals and 3000 other-event guests untouched.

## 6. Restart / rollback

- API container restart: pre-restart session cookie still valid (200) and
  stats intact (1000 invitations / 91 admitted) — guests/sessions preserved.
- Rollback drill with local tags standing in for SHAs: deployed a behaviorally
  different web tag (login-via-web 500 detected by smoke check), repointed the
  pin to the prior tag, redeployed, login 200, data intact (1000/91). DB and
  export volume preserved throughout; procedure is identical to the runbook's
  `IMAGE_TAG` rollback. Never `down -v`, never touched the Halaa stack.

## 7. Proxy integration (prepared, NOT applied)

- `deploy/Caddyfile.snippet` + `deploy/ROOT-INTEGRATION.md` (exact root
  diffs, order of operations, emergency isolation, checklist).
- Merged root `Caddyfile` + snippet (hostname `checkin.halaa.com.sa`)
  validated with `caddy validate`: **Valid configuration**. Adapted JSON
  confirms `checkin.halaa.com.sa` → `checkin-api:8100` for
  `/api/checkin/v1*` and → `checkin-web:3100` otherwise, with the snippet's
  security headers; existing `halaa.com.sa` routes (`api:8000`, `web:3000`)
  byte-identical in behavior.

## 8. Suites and builds (final state)

`npm run build` ✓, `npm run lint` ✓ (0 errors), `npm run design:check` ✓,
`npm test`: contracts 41/41, api 61/61, web 30/30, `npm run test:e2e` 1/1.
No parent Halaa sources, manifests, workflows, databases, DNS or VPS state
changed. Other local Docker projects were not touched (verified still
running after the required Docker Desktop restart).

## 9. Still external (blocks honest deployed/gate-ready claims)

Hostname/DNS, VPS headroom vs the budgets above, dedicated Atlas credentials +
backup destination, real event details + retention period, hotel acceptance of
the v1 admission policy, named accounts, two tested devices + backup
connectivity/power, on-site arrangements. Physical-device camera checks remain
pending per plan.
