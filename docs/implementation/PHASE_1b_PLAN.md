# Phase 1b — Five utilities — Plan

**Branch:** `claude/implement-phase-1-1b-PO0KU` (sequential after Phase 1a; harness uses one branch — see Phase 1a report).
**Status:** in progress

## 0. Pre-existing items (not Phase 1b scope)

- **Mobile templates broken** — `halla-mobile/services/templateService.js` references `ENDPOINTS.TEMPLATES.LIST`, `ENDPOINTS.TEMPLATES.CATEGORIES`, `ENDPOINTS.FONTS.LIST` that do not exist in `halla-mobile/config/api.js`. Pre-existing; defer to Phase 4 (mobile parity). Not fixed here.

## 1. Grep results — what already exists

| Concept | Existing path | Status |
|---------|--------------|--------|
| Idempotency middleware/model | (none — confirmed via grep) | will create |
| S3 utility | `labbe-backend-/src/shared/utils/s3Upload.js` | exists; needs hardening (fail-closed) |
| AuditLog model | `labbe-backend-/models/AuditLogModel.js` | exists, never written; will add middleware |
| Timezone utility | (none — only ad-hoc `new Date()` arithmetic) | will create |
| Payment provider | (none — `subscriptions.service.js` skips charges) | will create |

## 2. Sub-agent ownership map (no file overlap)

| Sub-agent | Utility | Owned files |
|-----------|---------|-------------|
| A | Idempotency | `labbe-backend-/models/IdempotencyKeyModel.js`, `labbe-backend-/src/shared/middleware/idempotency.js`, `labbe-backend-/src/shared/utils/idempotency.js`, addons subscribe wiring (one route) |
| B | S3 hardening | `labbe-backend-/src/shared/utils/s3Upload.js` (harden), one upload-route caller (vendor portfolio) |
| C | Audit log | `labbe-backend-/src/shared/middleware/auditLog.js` (new), `labbe-backend-/src/shared/utils/auditLog.js` (helper), wired into `PATCH /admin/vendors/:id/status` controller |
| D | Timezone | `labbe-backend-/src/shared/utils/timezone.js`, `labbe-backend-/src/shared/utils/scheduledTasks.js` (the launch cron only) |
| E | Payment scaffold | `labbe-backend-/src/infrastructure/paymentProvider/index.js`, `.../moyasar.js`, `.../stub.js`, wired into `subscriptions.service.subscribe` |

This session runs them sequentially in the main agent (clean-context, no parallel sub-agents in the harness). File-ownership map kept as the audit trail.

## 3. Findings closed in 1b

| ID | Title | Severity |
|----|-------|----------|
| PIPELINE-F05 | timezone-aware launch cron | High |
| FLOW-25-F05 | Service image silently falls back to local FS on S3 error | High |
| (foundational) | Idempotency utility introduced (used in later phases) | — |
| (foundational) | Audit log middleware (model wired for the first time) | — |
| (foundational) | Payment provider scaffold (Moyasar stub + real, factory by env) | — |

Formal closure of FLOW-08/09/10 idempotency + payment + audit-log findings happens when those findings' end-to-end flows are wired in Phases 2–5. Phase 1b lays the foundation and wires one consumer per utility per the master plan.

## 4. Wiring map (one consumer each)

- **Idempotency** → `POST /addons/purchase` (addons controller). Adding `Idempotency-Key` header makes a duplicate POST safe.
- **S3** → vendor portfolio uploads in the existing `uploadVendorFiles` middleware (replace silent local fallback with hard-fail).
- **Audit log** → `PATCH /admin/vendors/:id/status` (admin controller).
- **Timezone** → `scheduleEventLaunch` cron in `scheduledTasks.js` (replace `now.getHours()` string match with UTC compare).
- **Payment** → `subscriptions.service.subscribe()` (charge before save; in stub mode returns success).

## 5. Smoke tests

Static contract checks live in `docs/implementation/phase-1-smoke-tests/utilities-static-checks.js`. Like 1a, this harness has no live MongoDB, so dynamic tests are documented as curl runbooks.

## 6. Stop gate

- All five utilities exist; each has at least one consumer wired.
- The idempotency model has a TTL index.
- S3 fail-open path is gone — code path that wrote to local on S3 error returns an error instead.
- AuditLog gets at least one new write per request flow.
- The launch cron uses UTC math via the timezone utility.
- Payment scaffold logs which provider is active at boot.
- Static contract checks pass.
