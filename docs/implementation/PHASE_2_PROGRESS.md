# Phase 2 — Progress

Updated continuously by the main session. Two-line entries per change: the commit subject and the touch-list. No batching.

## Branch

- Working on `claude/implement-phase-2-4gM6G` (per harness).
- Cut from `audit/pre-production` post-Phase-1b (`03f9fea`).

## Track A — Subscriptions

- [x] 3.1 trial guard — `bc377a1`
- [x] 3.2 concurrent subscription bug (auto-cancel old) — `f1ac22e`
- [x] 3.3 expiry cron status transition — `8308a45`
- [x] 3.4 trial expiry policy (14d) — `f21fcdc`
- [x] 3.5 admin-assign endpoint — `2ccaed4`
- [x] 3.6 idempotency end-to-end — `2ccaed4` (combined with 3.5)
- [x] 3.7 expose paymentTransactionId — `121cb76`

## Track B — Plans CRUD

- [x] 4.1 POST/DELETE plan endpoints — `dc9d4af`
- [x] 4.2 update validation guard — `dc9d4af`
- [x] 4.3 audit log on update — `dc9d4af`

## Track C — Addons

- [x] 5.1 activation pipeline — `fbde764`
- [x] 5.2 scope branching — `fbde764`
- [x] 5.3 idempotency end-to-end — `fbde764`

## Smoke tests

- [x] phase-2-smoke-tests/ written — `10d1c1a`
- [x] static-checks.js — 13 / 13 PASS
- [x] Phase-1 regression — utilities-static-checks 5/5, timezone-unit 16/16 PASS

## Notes / anomalies

- Plan pricing field is `pricing.oneTime` not `pricing.monthly` (prompt was generic). Trial guard adapted accordingly.
- `BILLING_CYCLES.ONCE` was referenced in `scheduledTasks.js` but does not exist in `src/shared/constants` — query had been broken since the constants reorg. Removed in 3.3.
- `endDate` was referenced in `scheduledTasks.js` but the `Subscription` schema only has `expiresAt`. Cron has been a no-op until 3.3.
- `AuditLogModel.targetType` enum does not include `plan` or `addon`; plan / addon events log `targetType: "system"` with the relevant id and code in metadata. Documented in PHASE_2_PLAN.md risk register.
- No live Playwright host in this environment (same constraint as Phase 1). Static contract checks + curl runbooks substitute.
