# Technical contract

This is the implementation source of truth. Examples are contracts to implement and test, not claims that endpoints already exist.

## 1. Architecture and directory boundaries

```text
Browser → HTTPS / check-in hostname → existing Caddy
                                      ├─ /api/checkin/v1/* → checkin-api:8100
                                      └─ everything else → checkin-web:3100

checkin-api → dedicated MongoDB Atlas database
            → private /app/data/exports volume
            → one bounded PDF worker using Chromium
```

The mini app contains two runtime services. The PDF worker runs inside the API process with one rendering slot; do not add Redis, BullMQ, a third application service, WebSockets, a microservice framework, or a second REST API in Next.js. MongoDB stores durable records and job state. Private disk stores temporary generated PDFs. Browser requests use relative `/api/checkin/v1` URLs and HttpOnly-cookie sessions. Next development rewrites that prefix to Express.

Use Node 24 LTS (pin tested patch/image digest during implementation), JavaScript ESM, JSX, CSS Modules, Next.js App Router, React, Express, Mongoose, Zod, React Query, `qrcode`, `jsqr`, a maintained CSV parser, and Playwright Chromium for PDFs/browser tests. Local Cairo assets are shared with the PDF renderer. Use Node's built-in crypto/scrypt for password hashing and node:test for backend tests; Supertest is appropriate for HTTP tests. Use a MongoDB replica set in integration tests (`MongoMemoryReplSet`) because production transactions cannot be meaningfully tested on a standalone MongoDB.

Start from the versions already declared by Halaa where applicable (Next 15 family, React 19, Express 4, Mongoose 8, Zod 3), verify supported/security-patched compatible releases at implementation time, and pin the resulting mini-app lockfile. Do not blindly copy an old patch or require an upgrade of the existing apps. Capture `node --version`, installed versions and compatibility evidence in the ledger.

```text
halaa-checkin/
  package.json                   # private workspaces: web, api, contracts
  package-lock.json              # mini app only
  .gitignore                     # data, secrets, builds, generated evidence
  .dockerignore
  .env.example                   # non-secret local/deployment variable reference
  README.md
  design/
    tokens.css                   # full live :root snapshot
    SOURCES.json                  # source paths, hashes, copied asset provenance
    assets/                      # selected Halaa logo + licensed Cairo fonts
  scripts/
    sync-design.mjs
    check-design.mjs
  contracts/
    package.json                 # @halaa-checkin/contracts
    src/{schemas.js,errors.js,constants.js,stats.js,index.js}
    test/
  api/
    package.json
    Dockerfile
    src/
      app.js                     # createApp(deps), no listen/worker side effects
      server.js                  # config, DB, worker, listener, shutdown
      config.js
      db/{connection.js,indexes.js}
      middleware/{auth.js,authorize.js,csrf.js,errors.js,rateLimits.js}
      modules/
        auth/{auth.routes.js,auth.service.js,session.model.js,user.model.js}
        events/{events.routes.js,events.service.js,event.model.js}
        guests/{guests.routes.js,guests.service.js,guests.repository.js,guest.model.js}
        imports/{imports.routes.js,imports.service.js}
        checkins/{checkins.routes.js,checkins.service.js}
        exports/{exports.routes.js,exports.service.js,export.model.js,worker.js}
        audit/{audit.model.js,audit.service.js}
        idempotency/{idempotency.model.js,idempotency.service.js}
      pdf/{render.js,qrPass.js,attendanceReport.js,escape.js}
    scripts/{provision-user.mjs,seed-demo.mjs,ensure-indexes.mjs,purge-event.mjs}
    test/{auth,guests,imports,checkins,exports,stats}.test.js
  web/
    package.json
    next.config.mjs
    Dockerfile
    public/                      # explicitly copied presentation assets
    app/
      page.jsx
      [lang]/
        layout.jsx
        login/page.jsx
        (workspace)/layout.jsx
        (workspace)/guests/page.jsx
        (workspace)/gate/page.jsx
    components/
      shell/{AppHeader,EventSelector,WorkspaceNav}.jsx
      ui/{Button,Dialog,Field,StatusBadge,Pagination,Notice}.jsx
      guests/{GuestsWorkspace,GuestTable,GuestForm,ImportDialog,EventDialog,ExportPanel}.jsx
      gate/{GateWorkspace,CameraScanner,ScannerInput,GuestLookup,AdmissionCard}.jsx
    hooks/{useSession,useEvent,useGuests,useGate,useExports}.js
    lib/{api.js,queryClient.js,locale.js,format.js}
    locales/{ar,en}.json
    styles/{globals.css,theme.css}
    tests/                       # component/browser tests as appropriate
  tests/e2e/
  fixtures/                      # synthetic CSV/demo data, never real guest records
  deploy/{compose.yml,compose.dev.yml,Caddyfile.snippet,README.md}
```

Brace groups illustrate separate files. CSS Modules sit beside relevant components. Paths can be split further for clarity but core names/contracts stay stable. Install from `halaa-checkin/`; do not edit root `package.json`, root lockfile, `shared/`, `halaa-web/` or `halaa-backend/`. Only the final deployment task prepares narrowly scoped integration changes to root Caddy/Compose/workflow, as documented separately.

## 2. Security, identity and permissions

No public signup, password-reset email, SSO, or reuse of Halaa authentication in v1. A CLI provisions named users and event assignments. Passwords are entered through a hidden prompt or secret stdin, never command-line arguments, logs or committed seed files. Use salted scrypt hashes with explicitly recorded parameters and timing-safe comparisons. Disabled users lose access immediately, including existing sessions.

| Capability | Admin | Reception |
| --- | --- | --- |
| List visible events | All mini-app events | Assigned events only |
| Create/edit/open/close/reopen event | Yes | No |
| List/manage/import guests | Yes | No |
| Search/resolve a gate invitation | Yes | Assigned event only |
| Admit guests | Live events | Assigned live events |
| Correct/reset admission with reason | Yes, live only | No |
| Generate/download QR/report PDFs | Yes | No |
| View attendance summary/recent arrivals | Yes | Assigned event only |

Resolve current user and assignments on every request; don't rely on role claims frozen into a long-lived token. Deny by default and scope every event/guest/export query. Invalid/unassigned event IDs return generic 404 to staff; known role-forbidden routes return 403. Lookup for a token from another event returns the same invalid-invitation result as an unknown token.

Session token: cryptographically random 32 bytes; database stores SHA-256 digest only. Cookie `__Host-halaa-checkin-session`, HttpOnly, Secure, SameSite=Lax, Path=/, **no Domain** in HTTPS production. Use a separately named non-Secure localhost cookie in development only. Absolute session expiry 12 hours; enforce expiry in queries even if MongoDB TTL cleanup has not run. Login rotates session; logout deletes it and clears cookie. Password/role changes revoke sessions.

Unsafe requests require an exact configured Origin match and JSON content-type (except no-body logout, which still uses JSON client conventions). Reject absent/foreign Origin on unsafe browser API routes. Authenticated unsafe requests also require a per-session `X-CSRF-Token`, obtained from `GET /auth/session`; compare safely. Login has no existing CSRF token, so strict Origin + JSON is its protection. No wildcard CORS. Document and test Caddy proxy trust rather than blindly enabling `trust proxy: true`.

Use Helmet, body-size limits, bounded rate limits with machine error codes, no-store responses, noindex metadata/headers, redacted logs and a server-generated request ID. Login throttling must work behind Caddy; general gate limits must allow two active receptionists. Never log passwords, cookies, complete QR tokens, CSV bodies, PDF contents, companion lists, or database URIs. Audit stores minimal authorized operational details separately from request logs. No analytics trackers on private pages.

## 3. Data model

All dates in MongoDB are UTC dates; JSON serializes ISO-8601 UTC strings. Event timezone is `Asia/Riyadh` in v1. API identifiers are Mongo ObjectId strings except public codes, idempotency keys, and QR tokens. Every schema rejects unknown writable keys.

### Event

```text
_id
name: trimmed Unicode string, 1..120 characters
venue: trimmed Unicode string, 1..160 characters
startsAt: valid UTC Date, supplied as ISO with explicit offset/Z
timezone: literal "Asia/Riyadh"
status: draft | live | closed
version: integer >= 1                    # optimistic event/settings revision
activitySeq: integer >= 0                # transaction serialization fence
closedAt: Date | null
createdAt, updatedAt
```

Admin may create future or past demonstration events. Opening is explicit, not automatic by clock. Once any active guest exists, event name/date changes remain permitted in draft/live but warn that previously distributed PDF details are stale. Tokens do not change. Closed events cannot be edited without reopening. No event deletion through UI; a separate retention CLI handles eventual purge after backup/export and explicit operator instruction.

### Guest (one document = one invitation)

```text
_id, eventId
name: trimmed Unicode string, 1..120 characters
nameSearch: NFKC-normalized, whitespace-collapsed, case-folded search field
reference?: trimmed string, 1..60 characters when present
referenceKey?: normalized reference used for uniqueness
allowedCompanions: integer, 0..20
companionNames: string[], length <= allowedCompanions, each trimmed 1..120
qrToken: "HGC1." + base64url(randomBytes(32)), unique, select:false
shortCode: 10 uppercase random Crockford-base32 characters, unique per event
version: integer >= 1
checkIn: null | {
  actualCompanions: integer, 0..allowedCompanions
  checkedInAt: Date
  checkedInBy: UserId
  operatorName: string                   # immutable display snapshot
  method: camera | scanner | manual
}
deletedAt: Date | null
createdAt, updatedAt
```

Total allowed and actual party size are derived (`1 + companions`), never independently writable counters. `checkIn !== null` is the sole current admission truth. Do not add independent `attended`, `status`, `arrivedCount`, or mutable dashboard counters that can drift. Human short code is only an authenticated lookup aid, not a public bearer secret.

Generate tokens once, preserve them during edit/reprint. Returning tokens is permitted only through admin QR-generation/preview code paths. List/lookup/mutation serializers explicitly exclude `qrToken`; never rely solely on Mongoose default selection. There is no public token-to-guest endpoint. Soft-deleted guests no longer resolve. QR tokens must not contain name, phone, event name, or a publicly navigable URL.

Indexes: unique `qrToken`; unique `(eventId, shortCode)`; partial unique `(eventId, referenceKey)` for non-deleted records with a supplied key; `(eventId, deletedAt, nameSearch, _id)` for listing; `(eventId, deletedAt, checkIn.checkedInAt)` for recent admission. Omit blank reference keys rather than storing empty strings. Duplicate references map to a 409 domain error, not a raw database stack trace.

### User / Session / Audit / Idempotency / ExportJob

| Model | Required fields and constraints |
| --- | --- |
| User | Unique normalized username, displayName, passwordHash with parameters, role admin/reception, assignedEventIds, disabledAt, timestamps |
| Session | Unique tokenHash, userId, csrfToken, expiresAt; TTL index on expiresAt; explicit runtime expiry validation |
| Audit | eventId where relevant, guestId where relevant, actorId, actorName, action, timestamp, reason when required, changed field names and minimal before/after operational values, requestId; append-only from application |
| Idempotency | Unique `(actorId, operation, eventId, key)`, canonical request hash, completed status/response, expiresAt (24 hours); insert/read in same business transaction |
| ExportJob | eventId, createdBy, kind qr/report, locale, state queued/running/ready/failed/expired, immutable snapshot (private), createdAt, snapshotAt, expiresAt, leaseOwner/leaseUntil, attempts, artifact basename, safe errorCode; TTL after retention cleanup |

Do not put raw QR values/passwords/session secrets in audits. For deletes keep name/shortCode and previous admission essentials only when needed to explain the action. Retention/purge must cover guests, audits, export snapshots/artifacts, and idempotency responses for the event; retention duration is an operator-configured policy, not a hardcoded legal claim.

Create/verify indexes as a deployment command before accepting traffic. Production readiness fails if required indexes, transaction support or database connection are missing. Startup must reject a URI/database configuration that points to the existing Halaa database; use explicit `MONGODB_DB_NAME` and allow only the documented mini-app database naming prefix. Independent credentials must have permissions only for the mini-app database.

## 4. API conventions

Base path: `/api/checkin/v1`. JSON responses:

```json
{"data": {"id": "..."}}
```

```json
{"data": [], "meta": {"page": 1, "pageSize": 25, "total": 0}}
```

```json
{"error": {"code": "ALREADY_CHECKED_IN", "message": "Invitation already admitted", "fieldErrors": {}, "requestId": "...", "details": {}}}
```

Clients translate `code` and field keys. `message` is a safe fallback. `details` is optional and must use safe guest projections. Dates, IDs and all success DTOs are normalized by one serializer per model. Never expose Mongoose internals, hashes, raw snapshots or filesystem paths.

Status codes: 200 reads/updates; 201 creates/first admission; 202 export queued; 204 successful logout/guest deletion; 400 malformed payload; 401 unauthenticated; 403 role/CSRF rejection; 404 unavailable resource; 409 lifecycle/version/duplicate conflicts; 410 expired export; 413 oversize; 422 semantic/row validation; 429 rate/capacity queue limit; 503 unavailable dependency. Admission reset returns 200 with the updated guest. Frontend handles 204 without trying to parse JSON.

Core error codes: `VALIDATION_FAILED`, `UNAUTHENTICATED`, `FORBIDDEN`, `CSRF_INVALID`, `NOT_FOUND`, `EVENT_NOT_LIVE`, `EVENT_CLOSED`, `VERSION_CONFLICT`, `ALREADY_CHECKED_IN`, `INVALID_INVITATION`, `REFERENCE_CONFLICT`, `CAPACITY_EXCEEDED`, `IMPORT_INVALID`, `IDEMPOTENCY_CONFLICT`, `EXPORT_NOT_READY`, `EXPORT_EXPIRED`, `EXPORT_FAILED`, `RATE_LIMITED`, `SERVICE_UNAVAILABLE`.

### Routes

All routes below are relative to the base path. All except login/liveness/readiness require a session; mutation routes require the security checks above.

| Method/path | Role | Request / result |
| --- | --- | --- |
| `GET /health/live` | Public | Process responds, no internal details |
| `GET /health/ready` | Public | 200 only when DB/indexes/worker setup healthy; 503 otherwise |
| `POST /auth/login` | Public | `{username,password}` → safe user + CSRF token, sets cookie |
| `GET /auth/session` | Any | user, role, assignedEventIds, csrfToken, expiresAt |
| `POST /auth/logout` | Any | 204, revoke session |
| `GET /events` | Any | Visible events only, most recent first; cap/list pagination 100 |
| `POST /events` | Admin | `{name,venue,startsAt,timezone}` → draft event |
| `GET /events/:eventId` | Scoped | Event DTO |
| `PATCH /events/:eventId` | Admin | `{version,name?,venue?,startsAt?}` → event |
| `POST /events/:eventId/status` | Admin | `{version,status,reason?}`; reopen requires 5..500-character reason |
| `GET /events/:eventId/stats` | Scoped | Event-wide summary and `asOf` |
| `GET /events/:eventId/guests` | Admin | `q`, `status=all|admitted|pending`, `page`, `pageSize` → paginated safe guests |
| `POST /events/:eventId/guests` | Admin | `{name,reference?,allowedCompanions,companionNames}` → guest |
| `GET /events/:eventId/guests/:guestId` | Admin | Safe guest DTO |
| `PATCH /events/:eventId/guests/:guestId` | Admin | `{version,...guest editable fields}` → guest |
| `DELETE /events/:eventId/guests/:guestId` | Admin | JSON `{version}` → 204 soft-delete; disallow admitted guest |
| `POST /events/:eventId/imports/preview` | Admin | `{csv}` → `{rows,errors,warnings,validCount,remainingCapacity,canCommit}` |
| `POST /events/:eventId/imports/commit` | Admin | `{csv}` + `Idempotency-Key` → 201 `{createdCount,guestIds}` |
| `POST /events/:eventId/gate/resolve` | Scoped | Exactly one of `{token}` or `{guestId}` → safe guest and event state |
| `GET /events/:eventId/gate/search` | Scoped | `q` length 2..120 → at most 20 safe matches, reference/shortCode supported |
| `GET /events/:eventId/gate/recent` | Scoped | Latest 10 safe admitted guests (time/operator/count) |
| `POST /events/:eventId/checkins` | Scoped | `{guestId,version,actualCompanions,method}` + `Idempotency-Key` → safe guest with authoritative checkIn |
| `PATCH /events/:eventId/guests/:guestId/checkin` | Admin | `{version,actualCompanions,reason}` → corrected guest; live event only |
| `DELETE /events/:eventId/guests/:guestId/checkin` | Admin | `{version,reason}` → guest with null checkIn; live only |
| `GET /events/:eventId/guests/:guestId/qr` | Admin | `{data:{imageDataUrl,shortCode}}`; no-store; QR PNG generated internally |
| `POST /events/:eventId/exports` | Admin | `{kind,locale,scope?,guestIds?}` → 202 `{id,state,snapshotAt}` |
| `GET /events/:eventId/exports/:exportId` | Admin | Safe job status, progress phase, expiry and safe failure code |
| `GET /events/:eventId/exports/:exportId/download` | Admin | PDF only when ready and unexpired, no-store, safe download filename |

`q` is literal and bounded; trim, normalize and escape before regex queries. Reject unexpected query objects/operators. `guestId` resolve supports manual search and does not bypass admission validation. A gate lookup may reveal draft/closed state to an assigned user but can never allow admission.

Export `kind=qr` requires `scope=all|selected`; selected requires 1..1000 unique guest IDs, all must belong to this event and be active or the request fails. An empty QR export returns 422 `VALIDATION_FAILED`; an empty report is valid and shows zero counts/empty-list wording. `kind=report` is event-wide, no selection fields accepted. Locale is `ar|en`. Single QR PDF is a selected export with one guest, using A6 format. All/selected multiple guests use A4. Export scope never silently means the current UI page.

Guest DTO fields: `id,eventId,name,reference,shortCode,allowedCompanions,companionNames,totalAllowed,version,checkIn,createdAt,updatedAt`. `checkIn` additionally includes derived `actualPartySize`. Gate search may omit companionNames until resolve. No `qrToken` in these DTOs.

## 5. Business rules, transactions and concurrent admission

Use MongoDB `withTransaction` with snapshot read concern, majority write concern and bounded transient-error retry; all business reads/writes and audit/idempotency writes for a mutation share the same session. A transaction must write the event's `activitySeq` with a lifecycle predicate. This serializes check-in, guest mutation, import and event closure on that event, preventing close-vs-admit and allowance-vs-admit races. Do not merely read event status outside the transaction. Return domain responses after the transaction commits; do not send Express responses or launch PDF/file work inside a retriable transaction callback.

For versioned event edits, compare/increment `version`; `activitySeq` is separate so every guest scan does not invalidate an open event-settings form. Every guest edit/admission/correction/reset increments guest `version`.

### Admission algorithm (implement in this order)

```text
validate session, assignment, Origin/CSRF, payload, idempotency key
begin transaction
  read idempotency record scoped to actor + event + operation + key
  if present:
    reject if canonical request hash differs (409 IDEMPOTENCY_CONFLICT)
    otherwise return recorded HTTP status/body without another write
  update event where id matches AND status=live: increment activitySeq
  if not matched: distinguish unavailable event / not-live safely
  read active guest in event
  if absent: 404
  if checkIn already exists: 409 ALREADY_CHECKED_IN + safe original details
  if version differs: 409 VERSION_CONFLICT + safe current guest
  validate actualCompanions integer within current allowance
  update guest with eventId, deletedAt=null, checkIn=null, expected version
    set checkIn with server time and authenticated actor; increment version
  if zero updated: abort conflict (never continue to increment anything)
  insert immutable audit record
  insert completed idempotency record with request hash and response
commit
return authoritative response only after commit
```

Canonical idempotency hash covers normalized payload fields and operation/event, not raw JSON key order. UUID idempotency keys are required and bounded in length. If simultaneous identical requests race on the unique index, retry/read the committed idempotency record; never return a raw duplicate-key error. An idempotent replay returns the original status/body (even if event has since closed) after current authentication/authorization; it performs no new admission. The UI refetches current status after replay, so later corrections are visible.

Two staff devices with different keys scanning one invitation: exactly one admission commits; the other gets `ALREADY_CHECKED_IN`, not a generic failure or a second count. Different guests may require bounded transaction retries because of the event fence; validate performance for the two-device target. No unconditional check-in update, read-then-save without predicates, or check-then-increment counters.

When a confirm times out, retry the same payload and key. Changing companion count means a new intentional operation only after current server state is resolved. Never automatically retry under a new key.

### Other mutations

- All guest mutations: only draft/live, event fence, capacity/uniqueness checks within transaction, audit, and version predicates for existing rows.
- Once admitted, ordinary guest edits are rejected; use correction/reset paths. This keeps event allowance/report data stable. To fix name/allowance: admin resets admission with reason, edits, then deliberately re-admits if needed; UI must explain this consequence.
- Import: parse and validate before transaction; inside it check lifecycle/capacity/references again, insert every guest + audit + idempotency record or none. Any failure rolls back entire import. Keep deterministic error row mapping. Event limit counts only active invitations.
- Correction: live event, admitted guest, expected version, valid actualCompanions and reason 5..500 chars. Preserve original admission time/operator; audit editor/time and old/new counts. Return current guest version.
- Reset: live event, admitted guest, version and reason. Set checkIn null, increment version, retain the old admission in audit. Explicit UI warning that the same QR can be admitted again. Reception cannot do this.
- Closure: allowed from live or draft; versioned event transaction, sets closedAt server time. Closed → live requires reason, clears closedAt and audits reopening. No un-audited reset-all endpoint.

## 6. Statistics contract

For active (non-deleted) guests in the selected event:

```text
totalInvitations = count(active guests)
totalAllowedCompanions = sum(allowedCompanions)
expectedPeople = totalInvitations + totalAllowedCompanions
admittedInvitations = count(checkIn != null)
actualCompanions = sum(checkIn.actualCompanions where admitted)
actualAttendees = admittedInvitations + actualCompanions
pendingInvitations = totalInvitations - admittedInvitations
invitationAttendanceRate = admittedInvitations / totalInvitations * 100
capacityAttendanceRate = actualAttendees / expectedPeople * 100
```

Zero denominator yields 0. Round display rates to one decimal; preserve integer counts. Never call capacity rate “guest confirmation rate”. Report explicitly distinguishes invitation attendance from people/capacity attendance. Pending companions of an admitted guest are not “no-show invitations”. Derive list/status/totals from the same guest documents and one snapshot per response/export; use a pure shared `calculateStats(guests)` function as the testable definition. The 1,000-invitation cap makes a bounded projection practical; never fetch QR tokens for stats.

Fixture: A allows 2 and arrives with 1; B allows 0 and has not arrived; C allows 3 and arrives with 3. Expected: invitations 3, allowed companions 5, expected people 8, admitted invitations 2, actual companions 4, actual attendees 6, pending invitations 1, invitation rate 66.7%, capacity rate 75.0%.

## 7. PDF generation and durable export jobs

Use Playwright/Chromium server-side HTML-to-PDF so Arabic shaping, mixed-script text and pagination follow browser layout. Do not implement Arabic rendering with a Latin-only PDF font. Render only server-owned escaped templates, local font/logo bytes and internally generated QR images. Block all network requests in the render context and never navigate to a caller-supplied URL. Embed assets as data URLs or another tested local-only mechanism. Wait for fonts/images before PDF creation.

At export request time, use a read snapshot transaction to fetch event + chosen active guests and create an immutable private snapshot/job. Reports calculate summary and both lists from that same snapshot; all QR exports include all active guests at snapshot time. Include `snapshotAt` in response/UI/PDF. A later edit/delete/reset does not rewrite a completed export. UI warns to regenerate distributed passes after event metadata/allowance changes.

Job state machine: queued → running → ready OR failed; ready/failed → expired after 24 hours. Claim one queued job atomically with leaseOwner/leaseUntil, render with a 90-second deadline, and publish only if that lease is still owned. One rendering slot, bounded queue (10 queued/running jobs total, 3 per admin); excess returns 429. Cap attempts at 2 after worker interruption; recovery must never leave jobs stuck forever. Keep a heartbeat/lease longer than the active render deadline, and detect expired leases on startup/worker tick.

Write artifacts to generated UUID basenames under the private export directory, using temporary files then atomic rename. No path component comes from guest/event names. Status endpoints never expose raw snapshot/tokens/paths. Download rechecks session/admin/event association, expiry and file existence: queued/running returns 409 `EXPORT_NOT_READY`, failed or unexpectedly missing artifact returns 409 `EXPORT_FAILED`, expired returns 410 `EXPORT_EXPIRED`. Never expose downloads through static file serving. Set content-type application/pdf and sanitized Content-Disposition with safe UTF-8 filename handling.

Disk cleanup is separate from MongoDB TTL: periodically remove expired artifacts/snapshots, safely confined to the configured directory; remove abandoned temporary files; then mark/delete expired jobs. If TTL removes a job first, a periodic orphan sweep still removes its expired files. Browser contexts close in finally blocks and renderer/browser shutdown releases memory. If the worker is unavailable, readiness is degraded and export requests return a useful service error; gate admission must not run inside the PDF queue.

The HTTP export creation returns immediately with 202. Frontend polls status every 2 seconds while the panel is open/visible, remembers non-secret job IDs for the active session, and shows preparing/ready/failed/expired states. Downloads and Print use the ready authenticated PDF response; create/revoke a blob URL in the browser. Print is a user action with a new-tab/open-PDF fallback if the browser blocks direct printing. Never silently invoke bulk printing.

No exports are public, emailed, or exposed through the existing Halaa `/uploads` route. PDF archive/audit retention is not the 24-hour artifact TTL; hotel handoff is an explicit download.

## 8. Configuration and scripts to implement

Non-secret defaults may be committed; actual secrets never are.

| Variable | Meaning |
| --- | --- |
| `NODE_ENV` | development/test/production |
| `PORT` | API 8100; web service uses its own 3100 |
| `APP_ORIGIN` | Exact browser origin, localhost in dev, selected HTTPS host in production |
| `MONGODB_URI`, `MONGODB_DB_NAME` | Dedicated connection and database; mini-app prefix required |
| `MONGODB_TLS_CERT_PATH` | Optional mounted credential path only if dedicated Atlas user uses X.509 |
| `BACKEND_PROXY_URL` | Development Next rewrite target, default http://127.0.0.1:8100 |
| `EXPORT_DIR` | Private persistent directory, /app/data/exports in container |
| `TRUST_PROXY_HOPS` | Explicitly verified proxy configuration; production Caddy direct hop |
| `PLAYWRIGHT_BROWSERS_PATH` | Bundled Chromium install location in API image |
| `DEMO_SEED_ENABLED` | Explicit opt-in; rejected in production |
| `IMAGE_TAG` | Independent mini-app immutable release SHA for deployment |

Root mini-app scripts must exist by the appropriate task:

```text
npm run dev                 # both services, coordinated shutdown
npm run build               # contracts checks + Next production build
npm run lint                # scoped to this mini app
npm test                    # schema/unit + DB/HTTP integration suite
npm run test:e2e             # disposable replica-set DB and local web/API
npm run design:sync          # explicit copy from parent sources
npm run design:check         # source drift, when parent sources available
npm run db:indexes           # create/verify only mini-app indexes
npm run user:provision       # named account/assignment CLI
npm run seed:demo            # guarded synthetic fixtures only
```

`seed:demo` is idempotent for a dedicated demo event, never clears collections, and never runs automatically on server startup. A separate explicit `--reset-demo` can reset only that seed event after printing its resolved ID/name and requiring non-production configuration. No automatic data loss on reinstall/restart.

Operational docs must include database backup/restore and event purge procedures, failed-export diagnosis, lost-password reprovisioning, and scan-network recovery. Do not hardcode production SSH credentials or a specific active hostname into application code.

## 9. Technical references

Use primary documentation for implementation details and recheck it for the pinned versions: [Next.js rewrites](https://nextjs.org/docs/app/api-reference/config/next-config-js/rewrites), [Playwright PDF API](https://playwright.dev/docs/api/class-page#page-pdf). The repository's existing packages/deployment are the primary references for integration with this client.
