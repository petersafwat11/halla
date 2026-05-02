# Phase 2 — Progress

Updated continuously by the main session. Two-line entries per change: the commit subject and the touch-list. No batching.

## Branch

- Working on `claude/implement-phase-2-4gM6G` (per harness).
- Cut from `audit/pre-production` post-Phase-1b (`03f9fea`).

## Track A — Subscriptions

- [ ] 3.1 trial guard
- [ ] 3.2 concurrent subscription bug (auto-cancel old)
- [ ] 3.3 expiry cron status transition
- [ ] 3.4 trial expiry policy (14d)
- [ ] 3.5 admin-assign endpoint
- [ ] 3.6 idempotency end-to-end
- [ ] 3.7 expose paymentTransactionId

## Track B — Plans CRUD

- [ ] 4.1 POST/DELETE plan endpoints
- [ ] 4.2 update validation guard
- [ ] 4.3 audit log on update

## Track C — Addons (after A)

- [ ] 5.1 activation pipeline
- [ ] 5.2 scope branching
- [ ] 5.3 idempotency end-to-end

## Smoke tests

- [ ] phase-2-smoke-tests/ written
- [ ] Phase-1 regression smoke run

## Notes / anomalies

- Plan pricing field is `pricing.oneTime` not `pricing.monthly` (prompt was generic). Trial guard adapted accordingly.
- `BILLING_CYCLES.ONCE` is referenced in `scheduledTasks.js` but does not exist in `src/shared/constants` — query has been broken since the constants reorg. 3.3 removes it.
- `endDate` is referenced in `scheduledTasks.js` but the `Subscription` schema only has `expiresAt`. Cron has been a no-op until 3.3.
- `AuditLogModel.targetType` enum does not include `plan` or `addon`; plan/addon events log `targetType: "system"` with the relevant id in metadata.
