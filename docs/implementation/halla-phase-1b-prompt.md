# Halla Implementation — Phase 1b: Five Utilities

> Paste this into a **new** Claude Code session. Phase 1b runs the five utility builds in parallel via sub-agents, on its own branch independent of Phase 1a.

## 0. Why this exists

Phase 1a (auth redesign + mobile completion) is done on `implementation/phase-1-foundations`. Phase 1b builds the remaining five foundations: idempotency utility, S3 utility (existing — to be hardened), audit log middleware, timezone utility, payment scaffold. None of them depend on auth, so 1b runs on its own branch.

Each utility is built and wired to one real consumer to validate the contract. Wiring everywhere is left to later phases.

## 0.5. Naming context

Per the prior naming audit:
- `STAFF` role (audit) ≡ `ENTRANCE_GATE` (code)
- `staffPortal` (audit) ≡ `entranceGate` (code)
- `StaffAccessToken` model name unchanged
- `/staff-portal` URL preserved for backward compatibility

Treat them as equivalent when reading audit references. Phase 1b doesn't directly modify staff/gate code.

## 1. Standing rules

### 1.1 Check before you create

Before building any utility, grep the codebase to see what's already there. Same domain lives in the same folder. New files duplicating an existing concept are forbidden.

For each utility:
1. Grep `labbe-backend-/src/` for modules in the same domain.
2. Check `labbe-backend-/src/infrastructure/` and `labbe-backend-/src/shared/utils/` first.
3. If something exists: extend, harden, or document why it doesn't fit and where the new module will live.
4. If nothing exists: place new module in the conventional folder for its domain.
5. Document the location decision in `PHASE_1b_PLAN.md`.

### 1.2 Build + wire one consumer

Every utility must be wired to **one real consumer route or function** before its task is done. This catches contract bugs at build time. Wiring everywhere is later phases' work.

### 1.3 Clean break, no backward compatibility

No migration windows, no compat shims. Existing local-disk uploads stay where they are — new uploads go to S3 going forward. Document the dead-link risk and move on.

### 1.4 Smoke tests via Playwright MCP

Each utility's smoke test runs against the local server using seed admin credentials. Specs live under `docs/implementation/phase-1-smoke-tests/` (apply rule 1.1 — there are existing 1a smoke specs there; mirror their structure).

If a smoke test fails, the utility task is not done.

### 1.5 Progress files

In `docs/implementation/`:
- `PHASE_1b_PLAN.md` — written first, with file paths and sub-agent assignments.
- `PHASE_1b_PROGRESS.md` — updated continuously.
- `PHASE_1b_REPORT.md` — written at end with commits, smoke results, deviations, hand-offs.

**Do not update `IMPLEMENTATION_LEDGER.md` during 1b.** It may be modified concurrently by the 1a session if anything else lands there. Peter will reconcile both branches' findings in the ledger at merge time. Just record finding IDs closed in `PHASE_1b_REPORT.md` clearly.

### 1.6 Sub-agent parallelism rule

Two sub-agents must never edit the same file. Main session lists each sub-agent's owned files in `PHASE_1b_PLAN.md` before dispatch. Overlap → consolidate into one sub-agent.

### 1.7 Branch strategy

Branch: `implementation/phase-1b-utilities` cut from `audit/pre-production` (post-Phase-0 merge).

**Important:** do NOT branch from `implementation/phase-1-foundations`. That branch has Phase 1a auth work that is not yet merged. 1b is independent of auth and must not depend on 1a's commits — that's the whole point of running them parallel.

## 2. Pre-existing item to track

Before starting work, log this in `PHASE_1b_PLAN.md` under a "Pre-existing items, not Phase 1b scope" section:

- **Mobile templates broken** (pre-existing, surfaced during 1a): `templateService.js` references `ENDPOINTS.TEMPLATES.LIST`, `ENDPOINTS.TEMPLATES.CATEGORIES`, `ENDPOINTS.FONTS.LIST` which don't exist in `halla-mobile/config/api.js`. Template screen has been broken since before 1a. Defer to Phase 4 (mobile parity). Just log it; do not fix.

This is not Phase 1b work. Logging it ensures it doesn't get forgotten.

## 3. The five utilities

Five sub-agents, five owned-file lists, zero overlap. Each starts with a grep pass per rule 1.1.

### 3.1 Idempotency utility

**Grep first**: `labbe-backend-/src/` for `idempot*`, existing middleware in `src/shared/middleware/`, models with `key` + `requestHash` shape. Likely nothing exists. Confirm.

**Build**:
- `IdempotencyKey` MongoDB model: `key` (unique index), `requestHash`, `response`, `createdAt` (TTL index — 24h).
- Express middleware accepting an `Idempotency-Key` header on POST/PUT/PATCH routes. If key exists in collection: return cached response. If not: run handler, cache response, return.
- Service helper `withIdempotency(key, fn)` for cron jobs and webhook handlers that fire external side effects.

**Location**: most likely `src/shared/utils/idempotency.js` for the helper, `src/shared/middleware/idempotency.js` for the middleware, `models/IdempotencyKeyModel.js` for the model. Confirm via grep of existing patterns.

**Wire one consumer**: pick one POST route that produces an external side effect. A subscription-adjacent route is ideal but any will do. Document which route in the plan.

**Smoke test**: Playwright spec — POST same idempotency key twice, expect identical response, verify only one underlying side effect (one DB record, one external call).

### 3.2 S3 utility — verify existing first

**Grep first**: an S3 utility likely exists. Audit finding FLOW-25-F05 says service images "fall back to local filesystem when S3 upload fails" — meaning S3 code exists. Find it.

Search: `labbe-backend-/src/infrastructure/`, `labbe-backend-/src/shared/utils/`, grep for `aws-sdk`, `S3Client`, `multer-s3`, `s3.upload`.

**Audit existing**:
- Does it fail open (write to local on S3 error)? That's the bug.
- Are credentials read from env? Check sanity.
- Does upload return a public URL or a key? Standardize.
- Are file types and sizes validated?

**Harden**:
- **Fail closed** on S3 error. Return real error to caller. Do NOT fallback to local. Caller decides retry strategy.
- Standard interface: `uploadFile({ buffer, mimeType, folder, allowedTypes, maxSize }) → { url, key, size }`.
- Allowed types/sizes per upload domain (vendor portfolio, profile avatar, service image, post-event content).

**Do not migrate existing local files.** Clean break. New uploads go to S3, old paths stay. Document dead-link risk in report.

**Wire one consumer**: pick one upload path. Vendor portfolio (per flow 03) is a clean candidate. Replace direct multer-disk write with hardened utility.

**Smoke test**: upload via the wired route. Confirm S3 URL returned, file accessible at URL. Test failure path: simulate S3 error (invalid bucket or bad creds in test config), confirm real error reaches caller, no local fallback.

### 3.3 Audit log middleware

**Grep first**: `AuditLogModel` exists per audit notes. Read `labbe-backend-/models/AuditLogModel.js`. Note schema. Don't redesign unless something's clearly broken.

**Build**:
- Express middleware `auditLog(action, getResourceFn)` writing entry after successful response. Fields: `actorUserId`, `actorRole`, `action`, `resourceType`, `resourceId`, `whitelabelId`, `previousValue`, `newValue`, `requestId`, `ip`, `userAgent`, `timestamp`. Adapt to existing model schema.
- Service helper `logAudit(...)` for non-HTTP paths (cron, webhooks).

**Location**: middleware in `src/shared/middleware/auditLog.js` (or wherever existing middleware patterns live). Service helper near the model.

**Wire one consumer**: `PATCH /admin/vendors/:id/status` (vendor approve/reject) — clean choice with clear before/after state. Add `auditLog('vendor_status_change')` middleware. Confirm entry appears in `AuditLogModel`.

**Smoke test**: Playwright spec — login as seed admin, change a vendor's status via wired route, query `AuditLogModel`, confirm entry with correct fields (actor, action, resourceId, before/after).

### 3.4 Timezone utility

**Grep first**: `date-fns-tz`, `moment-timezone`, custom date utils. Bug PIPELINE-F05 suggests no utility exists. Confirm.

**Convention** (already decided in master plan):
- All timestamps stored as UTC ISO strings in MongoDB.
- Backend never depends on server local time. Date math (cron firing, "is event in the past") happens in UTC.
- Frontend converts UTC to user's local timezone at display time only.

**Build**:
- Backend module: `nowUtc()`, `parseEventTime(eventDoc) → Date` (given event with `scheduledDate`, `scheduledTime`, optional `timezone` defaulting to Asia/Riyadh, return UTC Date).
- Frontend (web + mobile): `formatInUserTimezone(utcIsoString, userTz, formatString)`.
- Pick one tz library used consistently. `date-fns-tz` recommended — small, modern, tree-shakable.

**Location**: `src/shared/utils/timezone.js` (backend). Frontend version under `labbe/utils/` or `halla-mobile/utils/` per existing convention.

**Wire one consumer**: launch cron in `scheduledTasks.js`. Bug (PIPELINE-F05): uses `now.getHours()` to compare against `event.scheduledTime`. Fix: convert event scheduled time to UTC, compare against `Date.now()` directly using new utility. The cron is the consumer.

**Smoke test**: fake event with `scheduledDate` for today and `scheduledTime` 1 hour in the past in Asia/Riyadh time. Run cron tick. Confirm event fires regardless of server timezone. Repeat with `scheduledTime` 1 hour in future — confirm does NOT fire. Bonus: temporarily change container TZ to UTC, repeat, confirm same behavior.

### 3.5 Payment scaffold (Moyasar)

**Grep first**: `src/infrastructure/`, `src/modules/payments`, `src/modules/subscriptions/`. Likely none, but if `subscriptions/` already has payment-call code, harden in place.

**Build**:
- `paymentProvider` interface: `charge(amount, currency, customer, metadata) → { success, transactionId, error }`.
- Two implementations:
  - `moyasarProvider`: real Moyasar API when `MOYASAR_API_KEY` set.
  - `stubProvider`: returns `{ success: true, transactionId: 'stub-' + nanoid() }` when key absent.
- Factory at boot chooses based on env. Logs which provider is active at startup.
- Idempotency: every charge uses an idempotency key from caller context (subscription ID + plan code + attempt). **Uses the idempotency utility from 3.1** — cross-utility wiring. Sub-agent E waits for sub-agent A's utility to land before wiring its consumer.

**Location**: `src/infrastructure/paymentProvider/` — most likely. Confirm via grep.

**Wire one consumer**: `POST /subscriptions/subscribe`. Currently creates subscription with no payment call. Add `paymentProvider.charge(...)` before subscription save. In stub mode (no key), returns success and subscription saves as today. When real keys arrive, this becomes real charge.

**Smoke test**: subscribe to plan via seed admin. Confirm log shows `stubProvider used, MOYASAR_API_KEY absent`. Confirm subscription saved. Then set fake `MOYASAR_API_KEY` env, restart, confirm factory picks `moyasarProvider`. Real API call will fail in dev — that's expected; just verifies factory logic.

## 4. Sub-agent parallelism plan

| Sub-agent | Utility | Owned files |
|-----------|---------|-------------|
| A | Idempotency | `src/shared/utils/idempotency.js` (or post-grep), `src/shared/middleware/idempotency.js`, `models/IdempotencyKeyModel.js`, the wired POST route's controller |
| B | S3 hardening | Existing S3 utility location (post-grep), one wired upload route |
| C | Audit log | `models/AuditLogModel.js` (read only — schema), `src/shared/middleware/auditLog.js` (or post-grep), the wired admin route |
| D | Timezone | `src/shared/utils/timezone.js` (or post-grep), `src/shared/utils/scheduledTasks.js` |
| E | Payment scaffold | `src/infrastructure/paymentProvider/` (post-grep), subscription creation service |

**Dispatch order**:
1. Main session dispatches A, B, C, D in parallel.
2. After A's utility lands (idempotency callable), dispatch E.
3. E builds provider modules, wires consumer using A's utility for charge idempotency.

**No file overlap**: confirm post-grep locations don't collide. If two sub-agents would touch the same file, main session reorganizes before dispatch.

## 5. Process

1. Read this prompt fully.
2. Read `docs/implementation/MASTER_PLAN.md` and `docs/audit/FINDINGS_SUMMARY.md`.
3. Confirm current branch state. Create `implementation/phase-1b-utilities` from `audit/pre-production` (NOT from `implementation/phase-1-foundations`).
4. Run grep passes for all five utilities. Update `PHASE_1b_PLAN.md` with discovered locations and sub-agent owned-file lists.
5. Log the pre-existing template-service item per section 2.
6. Dispatch sub-agents A, B, C, D in parallel.
7. After A lands: dispatch E.
8. As each sub-agent completes: main session reviews diff, runs the smoke test, confirms pass.
9. After all five complete: write `PHASE_1b_REPORT.md` with commits, smoke results, file locations, deviations, hand-offs.
10. Output the STOP gate.

## 6. STOP gate

```
STOP — Phase 1b (Five utilities) complete

Branch: implementation/phase-1b-utilities

Per utility:
- Idempotency: location <path>, wired at <route>, smoke <pass/fail>, commit <SHA>
- S3 hardening: existing utility at <path>, wired at <route>, smoke <pass/fail>, commit <SHA>
- Audit log: model at <path>, middleware at <path>, wired at <route>, smoke <pass/fail>, commit <SHA>
- Timezone: utility at <path>, wired in cron, smoke <pass/fail>, commit <SHA>
- Payment scaffold: at <path>, wired in subscription, smoke <pass/fail>, commit <SHA>

Findings closed: <list with IDs>
Findings partially closed (utility built but only one consumer wired): <list>

Pre-existing items logged (not in 1b scope):
- Mobile templates broken (templateService.js missing ENDPOINTS) — defer to Phase 4

Ready for merge: yes / no (which utility blocked, why)

Anomalies:
- <anything noticed but not fixed>
```

Then stop. Do not begin Phase 1c (drop /api mount) — that's a separate prompt after both 1a and 1b merge.

Begin.
