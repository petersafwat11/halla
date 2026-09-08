# Acceptance, deployment and demonstration

## 1. Required evidence

Implementation should add evidence under `docs/evidence/hilton-guest-checkin/` using synthetic data only. Store a concise validation report with command output summaries, timestamp, commit/build identifier, dependency versions, screenshots and sample PDF filenames. Never include real guest lists, tokens from a real event, cookies, production database URIs, staff passwords or SSH keys.

CI should run lint, contracts/unit/integration tests, production build and browser E2E on a disposable replica-set database. Camera permission and decoding can be simulated for automation, but actual phone cameras/printed passes require separate testing. PDF tests must inspect actual rendered output, not only return codes.

## 2. Acceptance matrix

| ID | Test | Pass condition |
| --- | --- | --- |
| A01 | Installation/build | Clean mini-app npm ci, lint and production build pass without editing parent packages |
| A02 | Halaa visual fidelity | All root tokens copied; verified background/font precedence; Halaa logo/colors/radii/type used; no foreign theme |
| A03 | Bilingual responsive UI | Both locales at 1440/1024/390/360 widths; no clipping/page overflow; controls keyboard-accessible |
| A04 | Login/session | Named users, correct cookie flags, restart persistence, logout/revocation/expiry work |
| A05 | Unauthorized API | Missing session, role mismatch, unassigned event and cross-event resource IDs denied on every relevant route |
| A06 | CSRF/log privacy | Foreign/missing Origin and invalid CSRF rejected; request logs contain no QR/password/cookie/guest-list content |
| A07 | Event lifecycle | Draft cannot admit; live admits; closed freezes mutations; reopen requires admin reason |
| A08 | Guest CRUD | Arabic/English valid; companions 0..20; duplicate names allowed; stale edits rejected; token remains stable |
| A09 | Safe deletion | Deleted invitations cannot resolve/export; admitted guest requires audited reset before deletion |
| A10 | Search/page/filter | Literal normalized search, stable pagination, all stats event-wide; page-selection count accurate |
| A11 | CSV correctness | UTF-8 BOM/quotes/newlines work; malformed/invalid/oversize rejected; no partial commit |
| A12 | CSV retry/race | Repeated/concurrent same-key import creates one batch; changed body same-key rejected; post-preview conflict caught |
| A13 | Preview is read-only | Resolve or camera decode never creates admission |
| A14 | Two receptionists | Concurrent different-key confirm on same guest results in one admission and correct totals |
| A15 | Lost response | Retry same key/body produces one admission; UI distinguishes uncertain outcome |
| A16 | Races with admin | Close/edit/reset versus check-in serialize; no admission after closure commits and no exceeded allowance |
| A17 | Input/operator integrity | Server rejects client-injected timestamp/operator/token/status; uses authenticated actor and server UTC |
| A18 | Camera lifecycle | Permission-denied fallback, repeated-frame suppression, track stop on background/navigation/event/logout |
| A19 | Manual/hardware input | Name/reference/shortCode lookup and keyboard QR scanner enter same guarded preview/confirm flow |
| A20 | Correction/reset | Admin only, reason/version required, audit preserved, stats corrected; reset enables explicit re-admission |
| A21 | Stats | Exact 3-guest fixture: 3 invitations, 8 expected, 2 admitted invitations, 6 attendees, 1 pending, 66.7% / 75.0% |
| A22 | QR PDF coverage | Single/selected/all include correct active guests beyond page 1; decoded QR matches invitation; repeated print stable |
| A23 | PDF visual quality | Arabic shaping, bidi, wrapping, local fonts, four-up page boundaries, quiet zone and readable print size verified |
| A24 | Report consistency | Lists and totals share snapshot; interim/final language correct; times explicitly Asia/Riyadh |
| A25 | Export security | Only authorized admin downloads; private path; HTML injection escaped; renderer blocked from external network |
| A26 | Export recovery | Queue bounded, one renderer, restart/timeout yields ready or failed; expiry removes artifact/snapshot, not only DB row |
| A27 | Persistence/isolation | Restarts preserve guests/sessions; no mini-app request/seed touches Halaa collections or upload paths |
| A28 | Production proxy | Selected HTTPS host routes API/UI correctly; cookie/auth work; existing Halaa routes continue to work |
| A29 | Backup/rollback | Restore into isolated DB reproduces counts/tokens; previous mini-app image starts against compatible schema |
| A30 | Real devices | Both reception devices scan printed and phone-screen PDFs, duplicates shown correctly, backup connectivity tested |

Each row requires pass/fail/blocked plus evidence and environment. A30 cannot be passed with desktop browser automation alone.

## 3. Capacity and failure rehearsal

Initial test envelope is 1,000 active invitations and two simultaneous receptionists. Use test fixtures, not a production event. Measure on the proposed VPS/container limits or a documented comparable environment:

- Admission p95 target ≤1 second from API request to response under two active reception sessions, excluding image decode/user time. Record throughput and transaction retry rate; never claim this target was met without measurements.
- During a full 1,000-pass export, gate request p95 target ≤2 seconds with no dropped/duplicated admission. Export finishes within the configured 90-second render deadline; if it doesn't, profile and tune/batch internal rendering while preserving the all-guests PDF contract before accepting this capacity.
- Report and all-pass export memory remain within container limits and leave capacity for existing Halaa services. Render one job at a time. Test large companion-name arrays/long mixed-script names, not only short Latin fixtures.
- Check-in commits followed by API process restart remain present. Database disconnection returns actionable errors without falsely showing success. Losing a response and retrying returns one result.
- Stop the worker/API during rendering and verify bounded recovery. Expired jobs/files are cleaned. A failed PDF job does not take down admission endpoints.

If the target cannot be met, fix the implementation or explicitly revise and re-approve the supported capacity. Do not quietly cap all-QR export at the first 25/100 rows. Offline admission is outside scope: staff pause admission and switch to backup connectivity when server confirmation is unavailable.

## 4. Same-VPS deployment topology

### Facts observed in the current repository

- Root `docker-compose.yml` has project name `halaa`, services `api`, `web`, `caddy`, and an internal Halaa network.
- Caddy owns public ports 80 and 443. Halaa API/web currently use 8000/3000 inside containers.
- `.github/workflows/deploy.yml` syncs root `docker-compose.yml` and `Caddyfile` into `/opt/halaa`, then runs main-stack rollout with `--remove-orphans` and reloads Caddy.
- MongoDB Atlas is external; Halaa's media path and credentials already have their own deployment lifecycle.

These are repository observations, not a live VPS inspection. Re-inspect before implementing T11.

### Required independent mini-app stack

| Resource | Planned value |
| --- | --- |
| Source folder | `halaa-checkin/` |
| Compose project | `halaa-checkin` |
| Services / network aliases | `checkin-web`, `checkin-api` |
| Internal ports | web 3100; API 8100 |
| Public hostname | Candidate `checkin.halaa.com.sa`; operator confirms DNS before deployment |
| API prefix | `/api/checkin/v1` on the check-in hostname only |
| Images | Separate GHCR repositories such as `halaa-checkin-web`, `halaa-checkin-api`, tagged by SHA |
| VPS app/config root | `/opt/halaa-checkin/` |
| Secrets | `/opt/halaa-checkin/config.env`, mode 600; never Halaa config.env |
| Export data | `/opt/halaa-checkin/data/exports`, private API-only mount |
| Database | Separate name such as `halaa_checkin_prod`; dedicated DB-scoped user |
| Browser cookie | Host-only mini-app session; no `.halaa.com.sa` Domain |
| Proxy network | Explicit external Docker bridge `halaa_checkin_proxy` |

No mini-app container publishes public ports. Attach existing Caddy and the two mini-app services to the external proxy network. Also keep Caddy attached to the existing Halaa network. Use unique network aliases to avoid collisions with `api`/`web`. The mini-app Compose references the external network, so `docker compose -p halaa-checkin down` does not remove it. Do not run `down -v` as a rollout/rollback procedure.

### One-time integration that must survive future Halaa deployments

T11 prepares a narrowly scoped patch to the **tracked** root `docker-compose.yml` declaring the external proxy network and attaching only Caddy to it. It also prepares a tracked Caddy host block for the selected hostname. Because the existing workflow copies those tracked files, the integration survives subsequent Halaa deploys. The external network must be created before applying the Compose patch; document this order clearly so a routine main-app deployment doesn't fail because the network is missing.

Do not leave the mini-app configuration only in a hand-edited VPS Caddyfile: the existing workflow would overwrite it. Do not add mini-app services to the root Halaa Compose project: `--remove-orphans`, image updates and rollback must remain independent. Do not replace Halaa's existing host routes, network, volume or image tags.

Illustrative host block (replace placeholder with the chosen real hostname during the final integration task; do not deploy this literal placeholder):

```caddyfile
CHECKIN_HOSTNAME {
    encode zstd gzip
    header {
        X-Robots-Tag "noindex, nofollow, noarchive"
        Referrer-Policy "no-referrer"
        X-Content-Type-Options "nosniff"
        Permissions-Policy "camera=(self), microphone=()"
    }
    @checkinApi path /api/checkin/v1 /api/checkin/v1/*
    handle @checkinApi {
        reverse_proxy checkin-api:8100
    }
    handle {
        reverse_proxy checkin-web:3100
    }
}
```

Keep browser cache behavior appropriate: Express/auth/private data/PDF responses are no-store; don't globally disable caching for hashed static assets. Verify both the mini app's security headers and PDF/browser behavior with the selected Next/Express versions. Health checks go directly to each internal service; public health endpoints reveal no infrastructure details.

### Container requirements

- Web: multi-stage build, standalone Next output with correct tracing root, static/public assets copied, non-root runtime. Runtime changes to server env must not rely on a stale build-time rewrite. Production Caddy handles API routing; rewrite is a development concern.
- API: Node 24 compatible base plus installed pinned Playwright Chromium/system dependencies and local fonts. Match Playwright package/browser versions; do not assume a Playwright image ships the desired Node version. No Alpine base without proving Chromium compatibility. Non-root runtime; verify sandbox/support flags in the tested container, and never give renderer templates untrusted scripts/URLs.
- Health checks, graceful SIGTERM, bounded body/queue/render sizes, log rotation and explicit resource budgets chosen from measured VPS headroom.
- Private export volume writable by API UID, not served by web/Caddy. No database port exposed by the app; production DB is Atlas.
- Dev-only Compose may run a local replica set with deterministic initialization and health check; production Compose must not inadvertently start a new local MongoDB with demo data.

## 5. Deployment runbook to implement and rehearse

Use placeholders/secret inputs in the committed runbook. Actual rollout occurs only when requested; preparing this plan or implementation does not authorize production changes.

1. Confirm selected hostname and DNS access, actual VPS CPU/RAM/disk headroom, Docker/Caddy status, and Atlas access for a dedicated database user. Camera requires HTTPS except localhost.
2. Create scoped database credentials and an empty production mini-app database. Verify transaction support and required indexes. Do not use Halaa's DB user/certificate by default.
3. Build/test immutable mini-app images in CI and push separate GHCR tags. Production never uses a floating `latest` as the only rollback reference.
4. Prepare `/opt/halaa-checkin`, secrets and export directory ownership; configure independent `IMAGE_TAG` without touching `/opt/halaa/.env`.
5. Create the external proxy network; start mini-app services on it; confirm internal readiness. Database indexes are created by the explicit mini-app command, not by destructive startup migration.
6. Validate merged Caddy config before reload; apply the tracked Caddy network/host integration through the normal main-stack configuration process. A one-time Caddy recreation may be needed to attach its network; plan a short maintenance window and verify Halaa immediately.
7. Verify HTTPS certificate, API/UI routes, production cookie flags, login, named staff assignments, QR download and camera permission policy through the public origin.
8. Provision real named users through the safe CLI. Seed only an isolated demo deployment/database with explicit non-production flags; production demonstration records, if desired, are entered/imported deliberately.
9. Check existing Halaa homepage/API/business guest routes still work; record before/after health evidence. Never test with real guests unless the operator supplies a designated test event.
10. Save deployed SHA/config version and execute the demonstration test on synthetic guests. Enable operational log/disk monitoring and backup schedule before relying on the app for an event.

Do not bake passwords or MONGODB_URI into Next public environment variables or Docker build args. Do not copy parent config.env, cert directories or data into the mini-app image context.

## 6. Backup, restore, rollback and retention

**Backup:** use Atlas backup or a database-scoped consistent logical backup for the dedicated mini-app DB. Keep an encrypted off-VPS copy. Export PDFs are regenerable temporary artifacts, not the guest database. Back up operational config separately with appropriate secret handling. Never run a drop/restore against Halaa's database.

**Restore rehearsal:** restore into a new mini-app-prefixed test database with separate credentials; point a disposable mini-app instance at it. Verify event/guest totals, at least one QR lookup, an existing admission, audit trail, and new admission. Do not re-use a production cookie origin. Record the backup timestamp and observed data loss window.

**Rollback:** set the mini-app's independent image tag to the prior tested SHA, pull and run only the mini-app Compose project with health wait. Preserve database and export volume. Database changes must be additive/backward-compatible for v1; if a future migration is not, document backup/forward recovery before deploying it. Do not roll back the whole Halaa stack to fix this app.

**Emergency isolation:** disable only the check-in host route if needed; keep Halaa host routes intact. Restore the prior validated Caddy config, then reload. Avoid deleting the shared external proxy network while Caddy uses it.

**Retention:** hotel/operator specifies guest data retention; until configured, do not automatically delete event records. Provide a dry-run event purge CLI that prints selected event and counts. Execution requires an explicit event ID and confirmation flag, validates database prefix, removes only that event's guests/audits/jobs/idempotency records/artifacts and assignments, and verifies the result. It is never a seed/reset shortcut and never touches other Halaa data. Export artifacts themselves expire after 24 hours as specified in the contract.

## 7. Demonstration script (about 8 minutes)

Use a clearly labeled synthetic event, never a real guest list. Do not show credentials or internal infrastructure in the hotel-facing demonstration.

1. **Introduce the workflow:** “Halaa manages your guest list, QR passes and entry report. Your team distributes the passes.” Open the Arabic Guests screen with matching Halaa branding.
2. **Prepare invitations:** add a named guest with two companions and optional companion names. Import a small CSV containing Arabic and English names. Show row validation once, then a successful import.
3. **Deliver passes:** open one QR, download/print its PDF, then export all passes. Show that the QR remains the same when reprinted and that every invitation is included.
4. **Reception device one:** sign in as receptionist one, scan the pass and show preview. Set one actual companion; confirm “Admit 2 people”.
5. **Reception device two:** scan the same pass. Show “Already admitted” with original time and count; demonstrate that totals did not increase again.
6. **Fallback:** find another guest by name/reference and admit using manual lookup. Explain that actual camera/scanner/backup devices will be tested before the event.
7. **Monitor attendance:** return to Guests and show admitted/pending counts refreshed from the server. Switch between Arabic and English if useful.
8. **Close and report:** close the event, generate the final PDF, show actual attendees and both invitation lists. Explain that companion names are reference data and the report counts actual companions, without claiming individual companion tracking.

Hotel-facing delivery summary: guest list setup + printable QR package + staffed device workflow + attendance report. Staff recruitment and device/connectivity provision are separate operational commitments, not features marked complete by this software demo.

## 8. External decisions still required before live use

- Final hostname/DNS and VPS headroom; candidate hostname in this plan is not provisioned.
- Dedicated Atlas credentials and backup destination; no live database was inspected during planning.
- Real event details and the hotel's agreed retention period.
- Hotel acceptance of v1 admission policy: principal guest present, actual companions recorded once, late separate companion admission outside scope.
- Named reception accounts, event assignments, two tested devices, backup device/power/connectivity and on-site operating arrangements.

These do not block implementation of the documented defaults. They do block an honest claim that the system is deployed and gate ready.
