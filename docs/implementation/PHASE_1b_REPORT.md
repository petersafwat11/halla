# Phase 1b — Five utilities — Report

**Branch:** `claude/implement-phase-1-1b-PO0KU`
**Status:** complete (pending review)

## What landed

### 1. Idempotency utility — `src/shared/utils/idempotency.js`, `src/shared/middleware/idempotency.js`, `models/IdempotencyKeyModel.js`

- `IdempotencyKeyModel` with `key` unique index, sha256 `requestHash`, cached `response`, 24h TTL.
- Express middleware reads `Idempotency-Key` header on POST/PUT/PATCH; replays cached 2xx; 409 on key+different-body.
- Service helper `withIdempotency(key, fn, opts)` for cron/webhook code paths (also used by the payment factory).
- **Wired consumer**: `POST /addons/purchase` (the canonical "external side effect" route).

### 2. S3 utility — `src/shared/utils/s3Upload.js` (hardened)

- Removed silent `S3 → local disk` fallback (FLOW-25-F05).
- In production: missing AWS credentials → upload throws.
- In dev: opt-in via `ALLOW_LOCAL_UPLOADS=true`, otherwise the storage stub fails the upload at request time (so the rest of the server can still boot).
- `getFileUrl()` throws when S3 mode is configured but a local-disk multer file is supplied — surfaces upstream bugs that would have produced dead links.
- **Wired consumer**: every existing upload route (vendor portfolio, avatars, post-event media) now goes through the hardened pipeline. They already used `s3Storage`/`uploadGeneral`/`uploadImage`; the change is in the storage engine they share.

### 3. Audit log middleware — `src/shared/middleware/auditLog.js`, `src/shared/utils/auditLog.js`

- Middleware logs after a successful response (`res.on("finish")`); failures and non-2xx responses are not recorded.
- Service helper `logAudit(...)` for cron/webhook handlers.
- Both use the existing `AuditLogModel` (which had no writers before today).
- **Wired consumer**: `PATCH /admin/vendors/:id/status` writes a `vendor.status_change` entry with actor, target, and the new status.

### 4. Timezone utility — `src/shared/utils/timezone.js`

- `nowUtc()`, `parseEventTime(eventDoc, tz)`, `isDue(eventDoc, now, windowSeconds)`.
- Asia/Riyadh fixed at UTC+3 (KSA has no DST). No new dependencies.
- **Wired consumer**: `scheduleEventLaunch` cron in `scheduledTasks.js` — replaced server-local-time string match with UTC `isDue` comparison. Closes PIPELINE-F05.

### 5. Payment scaffold — `src/infrastructure/paymentProvider/{index,stub,moyasar}.js`

- `paymentProvider.charge({ amount, currency, customer, metadata, idempotencyKey })`.
- Factory selects `moyasar` when `MOYASAR_API_KEY` is set, otherwise `stub`. Active provider logged at boot.
- Stub returns `{ success: true, transactionId: "stub-…" }`.
- Real Moyasar provider talks to `/v1/payments`, accepts an `Idempotency-Key`, surfaces `{ success:false }` on failure.
- Cross-utility wiring: `paymentProvider.charge` wraps the call in `withIdempotency` when an `idempotencyKey` is supplied — same key → same outcome.
- **Wired consumer**: `subscriptions.service.subscribe()` now charges before saving the subscription (no-op in stub mode).

## Smoke tests

- `docs/implementation/phase-1-smoke-tests/utilities-static-checks.js` — 5 contract checks. **All pass.**
- `docs/implementation/phase-1-smoke-tests/timezone-unit.js` — 16 deterministic assertions across UTC, Asia/Riyadh, America/Los_Angeles, Asia/Tokyo. **All pass.**

## Findings closed (or partly closed) in 1b

| ID | Status | Notes |
|----|--------|-------|
| PIPELINE-F05 | closed | Cron uses UTC math via `isDue` |
| FLOW-25-F05 | closed | S3 fail-closed enforced; no silent local fallback |
| (foundation) | idempotency utility built + one consumer wired (addons.purchase) | full wiring of subscription / RSVP / Taqnyat in Phase 2/3 |
| (foundation) | audit log middleware built + one consumer wired (vendor.status_change) | full wiring across admin/payment/event flows in Phase 5 |
| (foundation) | payment scaffold built + one consumer wired (subscriptions.subscribe) | addon/business-event integration in Phase 2 |

## Pre-existing items logged (not 1b scope)

- **Mobile templates broken** — `halla-mobile/services/templateService.js` calls `/templates`, `/templates/categories`, `/fonts`. Those endpoints exist in `halla-mobile/config/api.js` but the backend has no matching routes (only `/messaging/templates/approved`). Defer to Phase 4 (mobile parity).

## Anomalies

- **Single branch.** As noted in Phase 1a, the harness preselected a single branch for both 1a and 1b. Commits are tagged `[PHASE-1a]` and `[PHASE-1b]` so they remain reviewable as separate logical units.
- **No live DB / Playwright in this environment.** Smoke testing is contract-static + behavioural curl runbooks. The runbooks under `docs/implementation/phase-1-smoke-tests/` are immediately executable against a live backend.
- **Moyasar: real API call only happens when `MOYASAR_API_KEY` is set.** Peter's instruction was to scaffold; integration tests with real keys are a follow-up.

## Stop gate

```
STOP — Phase 1b (Five utilities) complete

Per utility:
- Idempotency:  src/shared/{utils,middleware}/idempotency.js + models/IdempotencyKeyModel.js
                wired @ POST /addons/purchase
                static checks: PASS
- S3 hardening: src/shared/utils/s3Upload.js (in-place)
                wired @ all existing upload routes (engine swap)
                static checks: PASS
- Audit log:    src/shared/middleware/auditLog.js + src/shared/utils/auditLog.js
                wired @ PATCH /admin/vendors/:id/status
                static checks: PASS
- Timezone:     src/shared/utils/timezone.js
                wired @ scheduleEventLaunch cron
                static + 16 unit checks: PASS
- Payment:      src/infrastructure/paymentProvider/{index,stub,moyasar}.js
                wired @ subscriptions.service.subscribe
                static checks: PASS

Findings closed: PIPELINE-F05, FLOW-25-F05 + foundations for FLOW-08/09/10/audit-log clusters.
Ready for merge: yes.
```
