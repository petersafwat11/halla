# Halla Implementation — Phase 2: Subscriptions, Addons, Plans

> Paste this into a **fresh** Claude Code session. Phase 2 closes the subscription/addon/plan layer using the foundations built in Phase 1.

## 0. Why this exists

Phase 1 built the foundations: payment scaffold, idempotency utility, S3 hardening, audit log middleware, timezone utility. Phase 2 wires those into the subscription/addon/plan layer and closes 14 findings related to billing, quotas, and admin plan management.

Three sub-tracks. A (subscriptions) and B (plans CRUD) run in parallel — different code modules. C (addons) runs after A — addon activation depends on subscription quota patterns settled in A.

## 0.5. Naming context

Per the prior naming audit:
- `STAFF` (audit) ≡ `ENTRANCE_GATE` (code)
- `staffPortal` (audit) ≡ `entranceGate` (code)
- `StaffAccessToken` model unchanged
- `/staff-portal` URL preserved

Treat as equivalent when reading audit references. Phase 2 doesn't directly modify staff/gate code.

## 1. Standing rules

### 1.1 Check before you create
Before adding any new module, grep for existing patterns. The Phase 1 utilities you'll consume:
- Payment: `src/infrastructure/paymentProvider/` (factory + moyasarProvider + stubProvider)
- Idempotency: `src/shared/utils/idempotency.js`, `src/shared/middleware/idempotency.js`, `models/IdempotencyKeyModel.js`
- Audit log: `src/shared/middleware/auditLog.js`, `models/AuditLogModel.js`
- Timezone: `src/shared/utils/timezone.js`

Read each before consuming. Confirm signatures and import paths.

### 1.2 Build + wire actually wired
Phase 1 wired each utility to one consumer. Phase 2 wires them everywhere they belong in this layer:
- Payment scaffold → addon purchase, plan-change, admin-assign
- Idempotency → subscribe, addon purchase, plan change
- Audit log → every plan update, every admin-assign, every status transition

If a finding's recommended change says "use idempotency" or "emit audit event," implement it. Don't defer.

### 1.3 Clean break, no backward compatibility
No migration windows, no compat shims. Schema additions must update consumers in the same commit.

### 1.4 Smoke tests via Playwright MCP
Each sub-track produces Playwright specs under `docs/implementation/phase-2-smoke-tests/`. Specs run live against a running server. Spec stubs that aren't executed don't count. Server must be confirmed running (port 8000) before any spec runs.

### 1.5 Progress files
In `docs/implementation/`:
- `PHASE_2_PLAN.md` — written first, with file paths and sub-agent assignments.
- `PHASE_2_PROGRESS.md` — updated continuously by main session only.
- `PHASE_2_REPORT.md` — written at end with commits, smoke results, deviations, hand-offs.

Do not update `IMPLEMENTATION_LEDGER.md` during Phase 2.

### 1.6 Sub-agent parallelism rule
Two sub-agents must never edit the same file. Owned-file lists in section 6.

### 1.7 Branch strategy
Branch: `implementation/phase-2-subscriptions-addons-plans` cut from `audit/pre-production` (post-Phase-1 merge state).

### 1.8 No parallel sessions on the same working tree
Phase 1 had two costly parallel-session collisions. For Phase 2: **one Claude Code session at a time** on this working directory. Sub-agents within that session are fine — separate sessions are not.

## 2. The 14 findings

### Subscription track (Sub-agent A) — 8 items
- Trial guard for zero-amount charges (Phase 1 hand-off — fix-first item, see 3.1)
- FLOW-09-F01 — payment scaffold full integration (Phase 1 wired stub; Phase 2 adds non-stub paths)
- FLOW-09-F02 — trial plan never expires
- FLOW-09-F03 — expiry cron doesn't transition status to `expired`
- FLOW-09-F04 — admin-assign plan endpoint missing
- FLOW-12-F01 — concurrent subscription bug (`findActiveForUser` sort order)
- Idempotency wired to subscribe end-to-end (Phase 1 hand-off)
- Expose `metadata.paymentTransactionId` in `Subscription.getSummary()`

### Plans CRUD track (Sub-agent B) — 3 items
- FLOW-08-F01 — POST and DELETE plan endpoints
- FLOW-08-F02 — live update validation guard
- FLOW-08-F03 — audit log on plan update

### Addons track (Sub-agent C) — 3 items
- FLOW-10-F01 — addon activation pipeline (no payment, no activation, no quota update today)
- FLOW-10-F02 — addon scope field stored but never read
- FLOW-10-F03 — addon idempotency

## 3. Track A — Subscriptions (Sub-agent A)

**Owned files**:
- `labbe-backend-/src/modules/subscriptions/subscriptions.service.js`
- `labbe-backend-/src/modules/subscriptions/subscriptions.routes.js`
- `labbe-backend-/src/modules/subscriptions/subscriptions.controller.js`
- `labbe-backend-/models/SubscriptionModel.js`
- `labbe-backend-/src/shared/utils/scheduledTasks.js` (expiry cron section only)
- New admin-assign endpoint files

### 3.1 First subtask — trial guard

The Phase 1 payment scaffold calls `paymentProvider.charge()` for every subscribe. Trial plans (`planCode === 'trial'`, `pricing.monthly === 0`) hit it with `amount = 0`. Stub returns success today. Real Moyasar will reject zero-amount charges. This is the production landmine.

**Fix**: in `subscriptions.service.js subscribe()`, before `paymentProvider.charge()`:
```javascript
const isFreePlan = planCode === 'trial' || !plan.pricing?.monthly || plan.pricing.monthly === 0;
if (!isFreePlan) {
  const charge = await paymentProvider.charge({ ... });
  // existing charge handling
}
// else: skip payment, log decision
```

**Commit first** as `[PHASE-2-A] subscriptions: skip payment for free/trial plans`. This lands the trial guard before any other Track A work, removing the production landmine before everything else.

### 3.2 FLOW-12-F01 — concurrent subscription bug

`findActiveForUser` in `SubscriptionModel.js` sorts oldest-first. When a host has two active subscriptions (upgrade scenario), `validateLimits` uses the older one. The host pays for the new plan but enforces the old plan's limits.

**Decide between**:
- Option 1: change sort to `{ createdAt: -1 }` (newest first).
- Option 2: auto-cancel the old subscription when a new `subscribe()` succeeds (matches `changePlan()` behavior).

Option 2 is cleaner — eliminates "two active subscriptions" as a state. Pick it unless there's a clear reason from the codebase to keep concurrent subscriptions. Document the decision in the plan file.

Verify the fix doesn't break callers of `findActiveForUser`. Grep all call sites.

### 3.3 FLOW-09-F03 — expiry cron status transition

`scheduleSubscriptionExpiryCheck` in `scheduledTasks.js` sends notifications at 7/3/1 days before `endDate` but never sets `status = 'expired'` when `endDate` passes.

Add a second pass: after notification logic, find subscriptions where `endDate < now() && status === 'active'` and set `status = 'expired'`. Use the timezone utility — `nowUtc()` for the comparison.

Wire audit log: `auditLog('subscription_expired', ...)`.

### 3.4 FLOW-09-F02 — trial plan expiry

Trial plans have no `endDate` today. The trial guard from 3.1 handles payment; the trial itself runs forever.

**Policy decision**: trial duration **14 days** unless the codebase or product spec says otherwise. After expiry, subscription transitions to `expired`, host can't create new events but existing events continue, must subscribe to a paid plan to continue.

**Implement**:
- On trial subscription creation: set `endDate = createdAt + 14 days`.
- Expiry cron from 3.3 catches it like any other expired subscription.
- Document the 14-day decision in the plan file.

### 3.5 FLOW-09-F04 — admin-assign endpoint

New endpoint: `POST /api/v2/admin/subscriptions/assign`.
- Auth: SUPER_ADMIN only (or `requirePageAccess('SUBSCRIPTIONS', 'create')` per existing pattern).
- Body: `{ userId, planCode }`.
- Skips payment (admin-assigned is free or billed externally).
- Wires audit log: `auditLog('subscription_assigned', ...)` with admin's `userId` as actor.
- Wires idempotency: standard `Idempotency-Key` header support.

### 3.6 Idempotency end-to-end on subscribe

Phase 1 wired idempotency middleware to `POST /events`. Phase 2 wires it to:
- `POST /api/v2/subscriptions/subscribe`
- `POST /api/v2/admin/subscriptions/assign`
- `POST /api/v2/subscriptions/change-plan`

Each accepts `Idempotency-Key`, replays cached response on duplicate.

Replace any `Date.now()`-based keys inside the service with caller-provided keys from the middleware.

### 3.7 Expose `metadata.paymentTransactionId`

`Subscription.getSummary()` doesn't expose `metadata.paymentTransactionId`. Add it. Single line. Grep `getSummary` callers, confirm no breakage.

### 3.8 Track A smoke tests

Playwright specs at `docs/implementation/phase-2-smoke-tests/`:
- `subscribe-trial-guard.spec.js` — trial plan, no payment call (stub mode), subscription saved.
- `subscribe-paid-plan.spec.js` — paid plan, payment fires, transactionId in metadata, exposed in summary.
- `subscribe-idempotency.spec.js` — same key twice, identical response, only one subscription.
- `findActiveForUser.spec.js` — host with two active subs, `validateLimits` uses the right one (or auto-cancel test depending on Option 1 vs 2).
- `expiry-cron.spec.js` — fast-forward time, run cron, expired status set, audit log entry.
- `admin-assign.spec.js` — SUPER_ADMIN assigns plan, no payment, audit log entry.

All run live, all pass before Track A is done.

## 4. Track B — Plans CRUD (Sub-agent B)

**Owned files**:
- `labbe-backend-/src/modules/plans/plans.service.js`
- `labbe-backend-/src/modules/plans/plans.routes.js`
- `labbe-backend-/src/modules/plans/plans.controller.js`
- `labbe-backend-/models/PlanModel.js` (read only)

### 4.1 FLOW-08-F01 — POST and DELETE endpoints

Add:
- `POST /api/v2/admin/plans` — create new plan. Body: full plan payload. Validation: required fields, no duplicate `code`. Auth: SUPER_ADMIN only.
- `DELETE /api/v2/admin/plans/:code` — soft delete (set `isActive: false`). Block hard delete entirely. If active subscriptions exist on the plan, return 409 with the count.

Wire audit log: `auditLog('plan_created', ...)` and `auditLog('plan_deactivated', ...)`.

### 4.2 FLOW-08-F02 — validation guard

`PATCH /api/v2/admin/plans/:code` allows any field update including destructive limit reductions. Add validation: if any `limits.*` field is being reduced, query active subscriptions on the plan. If any subscriber has `usage > new limit`, reject with 422 and a clear error message naming the count of affected subscribers.

### 4.3 FLOW-08-F03 — audit log on update

Wire `auditLog('plan_updated', ...)` to `PATCH /api/v2/admin/plans/:code`. Capture before/after snapshots so the audit log shows what changed.

### 4.4 Track B smoke tests

Playwright specs:
- `plans-create.spec.js` — SUPER_ADMIN creates plan, audit log entry.
- `plans-delete-block.spec.js` — DELETE on plan with active subscribers returns 409.
- `plans-delete-soft.spec.js` — DELETE on plan with no subscribers sets isActive: false, audit log entry.
- `plans-update-guard.spec.js` — destructive limit reduction blocked.
- `plans-update-audit.spec.js` — plan update emits audit event with before/after.

All run live, all pass before Track B is done.

## 5. Track C — Addons (Sub-agent C, runs AFTER A finishes)

**Owned files**:
- `labbe-backend-/src/modules/addons/addons.service.js`
- `labbe-backend-/src/modules/addons/addons.routes.js`
- `labbe-backend-/src/modules/addons/addons.controller.js`
- `labbe-backend-/models/AddonModel.js`

### 5.1 FLOW-10-F01 — activation pipeline

Today: `purchaseAddon()` creates a `pending` Addon record and returns. No payment, no activation, no quota update. The feature is non-functional.

**Implement the full pipeline**:
1. Validate addon type and quantity.
2. Calculate price from `ADDON_TYPES` constants.
3. Call `paymentProvider.charge()`. Free addon (e.g. promotional, price 0) skips payment via the trial-guard pattern from Track A.
4. On payment success: set `addon.status = 'active'`, set `addon.activatedAt`, store `transactionId` in `metadata`.
5. **Apply quota update** based on `addon.scope` (see 5.2).
6. Wire idempotency: standard `Idempotency-Key` support.
7. Wire audit log: `auditLog('addon_purchased', ...)`.

For business-customization addons (manual provisioning per Peter's prior note): payment flows through, but `status` becomes `pending_provisioning` not `active`. Operator activates via `POST /api/v2/admin/addons/:id/activate` (new endpoint), audit-logged with `auditLog('addon_activated_by_admin', ...)`.

### 5.2 FLOW-10-F02 — read scope field

`AddonModel` has `scope: ['event', 'pool', 'org']` stored but never read during quota application. The pipeline must branch:
- `scope === 'pool'` → increment `subscription.invitePool` by `addon.quantity`.
- `scope === 'event'` → increment linked event's `guestLimit` by `addon.quantity` (must accept `eventId` in purchase request, validate ownership).
- `scope === 'org'` → org-wide counter (subscription-level for now).

Document the mapping in code and in the plan file.

### 5.3 FLOW-10-F03 — addon idempotency

Wire idempotency middleware to `POST /api/v2/addons/purchase`. Standard `Idempotency-Key` header.

### 5.4 Track C smoke tests

Playwright specs:
- `addon-purchase-pool.spec.js` — pool-scope addon, payment fires, addon active, invitePool incremented.
- `addon-purchase-event.spec.js` — event-scope addon with eventId, payment fires, addon active, event guestLimit incremented.
- `addon-purchase-business.spec.js` — business-customization, payment fires, status pending_provisioning. Admin endpoint flips to active.
- `addon-idempotency.spec.js` — same key twice, single charge, single quota update.
- `addon-audit.spec.js` — purchase emits audit event.

All run live, all pass before Track C is done.

## 6. Sub-agent parallelism plan

| Sub-agent | Track | Owned files | Dispatch |
|-----------|-------|-------------|----------|
| A | Subscriptions | subscription module + scheduledTasks.js | Immediately |
| B | Plans CRUD | plans module | Immediately, parallel with A |
| C | Addons | addons module | After A finishes |

**Verify zero file overlap before dispatch**:
- A and B touch different module trees (subscriptions vs plans). No collision.
- A, B, C all consume `paymentProvider`, `idempotency`, `auditLog` middlewares — read-only consumers, not modifications.
- `IdempotencyKeyModel.js` and `AuditLogModel.js` are read-only.

If unexpected collision found, main session re-plans before dispatch.

## 7. Process

1. Read this prompt fully.
2. Read `PHASE_1_FINAL_REPORT.md` for hand-off context. Confirm trial guard, transactionId exposure, idempotency-end-to-end items match the Phase 1 hand-offs.
3. Read `docs/audit/FINDINGS_SUMMARY.md` and confirm the 14 finding IDs.
4. Confirm current branch state. Create `implementation/phase-2-subscriptions-addons-plans` from `audit/pre-production`.
5. Run grep passes on Phase 1 utility paths. Confirm imports and signatures.
6. Write `PHASE_2_PLAN.md` with sub-agent owned-files, decided policies (trial duration, sort/auto-cancel choice, scope mapping), dispatch plan.
7. Write `PHASE_2_PROGRESS.md`.
8. Track A first subtask: trial guard commit (fix-first per 3.1).
9. After trial guard lands: dispatch sub-agents A (continuing) and B (starting) in parallel.
10. As A and B complete: main session reviews diffs, confirms server is running, runs smoke tests live, confirms pass.
11. After A finishes: dispatch sub-agent C.
12. After C finishes: review diffs, run smoke tests live.
13. After all three tracks finish:
    - Run a Phase-1 regression smoke (auth T1-T7, timezone, S3, audit log, payment) to confirm Phase 2 didn't regress Phase 1.
    - Update `PHASE_2_REPORT.md` with all commits, smoke results, deviations, hand-offs.
14. Output the STOP gate.

## 8. STOP gate

```
STOP — Phase 2 complete

Branch: implementation/phase-2-subscriptions-addons-plans

Per track:

Track A (Subscriptions):
- Trial guard (first subtask): <commit>
- FLOW-12-F01 concurrent sub bug: <commit>, decided <option 1 or 2>
- FLOW-09-F03 expiry cron status transition: <commit>
- FLOW-09-F02 trial expiry policy: <commit>, decided <14d/other>
- FLOW-09-F04 admin-assign endpoint: <commit>
- Idempotency wired end-to-end: <commit>
- getSummary transactionId: <commit>
- Smoke tests: <pass/fail per spec>

Track B (Plans CRUD):
- FLOW-08-F01 POST/DELETE endpoints: <commit>
- FLOW-08-F02 validation guard: <commit>
- FLOW-08-F03 audit log on update: <commit>
- Smoke tests: <pass/fail per spec>

Track C (Addons):
- FLOW-10-F01 activation pipeline: <commit>
- FLOW-10-F02 scope branching: <commit>
- FLOW-10-F03 idempotency: <commit>
- Smoke tests: <pass/fail per spec>

Phase-1 regression smoke: <pass/fail>

Findings closed (full): <list>
Findings partially closed: <list, if any>

Ready for merge: yes/no
Reason if no: <which track/test blocked>

Hand-offs to Phase 3:
- (anything Phase 2 surfaced affecting RSVP pipeline)

Hand-offs to Phase 5:
- (anything for the audit-log-everywhere pass)

Anomalies:
- <anything noticed but not fixed>
```

Then stop. Do not begin merge — Peter will run the close-out session like Phase 1.

Begin.
