# Phase 2 — Subscriptions, Addons, Plans — Plan

**Branch**: `claude/implement-phase-2-4gM6G` (per harness assignment).
**Cut from**: `audit/pre-production` after Phase 1b merge (`03f9fea`).
**Phase 1 hand-off**: `PHASE_1b_REPORT.md` — five utilities live; payment scaffold wired only to subscribe; idempotency wired only to addons.purchase; audit log wired only to vendor status change.

This plan closes 14 findings across three tracks. Order:

1. **Track A first subtask** — trial guard (3.1) commits as the very first change. Removes the production landmine where trial plans charge `amount=0` against the live Moyasar provider.
2. **Tracks A and B run in parallel** afterwards — different module trees, zero file overlap.
3. **Track C runs after A** — addon pipeline reuses the trial-guard pattern from A and depends on the audit-log + idempotency wiring already lived through in A/B.

A single Claude Code session executes all tracks (per prompt §1.8). Sub-agents within this session are dispatched per §6 owned-files.

---

## Decided policies

| Decision | Choice | Rationale |
|---|---|---|
| Concurrent subscription bug (3.2 / FLOW-12-F01) | **Option 2 — auto-cancel old on new `subscribe()`** | Eliminates the "two active" state; matches `changePlan()`. No callers depend on multi-active. |
| Trial expiry (3.4 / FLOW-09-F02) | **14 days** from `createdAt` | Master plan called this out as the default; no product spec contradicts. PLAN_DEFAULTS sets `durationDays: 90` for trial but that is per-event lifecycle; trial as a billing period needs a real end date so the expiry cron can transition it to `expired`. We override to 14 days for the trial plan only. |
| Free-plan detection (3.1) | `planCode === 'trial' || (plan.pricing?.oneTime ?? 0) === 0` | The Plan schema uses `pricing.oneTime`; the prompt's `pricing.monthly` is from a different draft. Adapted to actual schema. |
| Addon scope mapping (5.2) | `pool` → `subscription.invitePool += quantity`; `event` → `event.maxInvitesPerEvent += quantity`; `org` → `subscription.invitePool` (treated as org-wide bucket today) | Subscription is the org-level container in this codebase; events have `maxInvitesPerEvent` set at creation. |
| Addon `business_customization` flow | Payment → `status: pending_provisioning`; admin endpoint `POST /admin/addons/:id/activate` flips to `active` | Manual provisioning per Peter's prior note (§5.1 in prompt). |

---

## Findings → tasks mapping

### Track A — Subscriptions (Sub-agent A)

| # | Finding | File(s) | Note |
|---|---------|---------|------|
| 3.1 | Phase-1 hand-off — trial guard | `subscriptions.service.js` | First commit, alone. |
| 3.2 | FLOW-12-F01 / FLOW-09-F02-A | `subscriptions.service.js`, `models/SubscriptionModel.js` | Auto-cancel old; sort newest-first too (defence in depth). |
| 3.3 | FLOW-09-F03 | `src/shared/utils/scheduledTasks.js` | Fix wrong field (`endDate` → `expiresAt`), drop nonexistent `BILLING_CYCLES.ONCE`, emit `subscription.expired` audit per row. |
| 3.4 | FLOW-09-F02 (trial duration) | `subscriptions.service.js` | Trial subscription gets `expiresAt = createdAt + 14d`. |
| 3.5 | FLOW-09-F04 | `subscriptions.routes.js`, `subscriptions.controller.js`, `subscriptions.service.js` | New route `POST /admin/subscriptions/assign`, RBAC SUPER_ADMIN, audit + idempotency. |
| 3.6 | Idempotency end-to-end | `subscriptions.routes.js` | Add `idempotency()` middleware to `/subscribe`, `/change-plan`, `/admin/subscriptions/assign`. Pass through to `paymentProvider.charge()`. |
| 3.7 | Expose `metadata.paymentTransactionId` | `models/SubscriptionModel.js` | One-line addition in `getSummary()`. |

### Track B — Plans CRUD (Sub-agent B)

| # | Finding | File(s) | Note |
|---|---------|---------|------|
| 4.1 | FLOW-08-F01 | `plans.routes.js`, `plans.controller.js`, `plans.service.js` | `POST /admin` and `DELETE /admin/:code` (soft-delete only), audit log. |
| 4.2 | FLOW-08-F02 | `plans.service.js` | Reject limit reductions if subscribers > new limit. 422 with affected count. |
| 4.3 | FLOW-08-F03 | `plans.routes.js`, `plans.service.js` | Wire `auditLog('plan.updated', …)` with before/after capture. |

### Track C — Addons (Sub-agent C, after A)

| # | Finding | File(s) | Note |
|---|---------|---------|------|
| 5.1 | FLOW-10-F01 | `addons.service.js`, `addons.controller.js`, `addons.routes.js` | Pipeline: validate → price → charge → activate → quota update → audit. Business customization branches to `pending_provisioning`. |
| 5.2 | FLOW-10-F02 | `addons.service.js` | Branch on `scope` field. Map to subscription / event / org counters. |
| 5.3 | FLOW-10-F03 | `addons.routes.js` | Already wired in 1b. Confirm and extend for admin activate route. |

---

## Sub-agent owned-files map

| Track | Owned files (write-allowed) | Read-only consumed |
|-------|----------------------------|--------------------|
| A | `src/modules/subscriptions/{service,routes,controller}.js`, `models/SubscriptionModel.js`, `src/shared/utils/scheduledTasks.js` (subscription crons only) | `src/shared/utils/idempotency.js`, `src/shared/middleware/{idempotency,auditLog}.js`, `src/shared/utils/{auditLog,timezone}.js`, `src/infrastructure/paymentProvider/*` |
| B | `src/modules/plans/{service,routes,controller}.js` | `models/PlanModel.js`, `models/SubscriptionModel.js`, `src/shared/middleware/auditLog.js`, RBAC middleware |
| C | `src/modules/addons/{service,routes,controller}.js`, `models/AddonModel.js` | Same shared utilities; `models/SubscriptionModel.js` and `models/EventModel.js` for quota updates. |

Zero overlap on writable files between A and B. C runs after A finishes, so even shared read-only consumers cannot be raced.

---

## Smoke tests

`docs/implementation/phase-2-smoke-tests/` will hold:

- `subscribe-trial-guard.spec.js`
- `subscribe-paid-plan.spec.js`
- `subscribe-idempotency.spec.js`
- `findActiveForUser.spec.js`
- `expiry-cron.spec.js`
- `admin-assign.spec.js`
- `plans-create.spec.js`
- `plans-delete-block.spec.js`
- `plans-delete-soft.spec.js`
- `plans-update-guard.spec.js`
- `plans-update-audit.spec.js`
- `addon-purchase-pool.spec.js`
- `addon-purchase-event.spec.js`
- `addon-purchase-business.spec.js`
- `addon-idempotency.spec.js`
- `addon-audit.spec.js`

Live Playwright is not available in this environment (per Phase 1 anomalies). We adopt the same approach: contract-static + behavioural curl runbooks under `phase-2-smoke-tests/`. Specs are written so they can run live the moment a backend + Playwright host appears.

A regression smoke against Phase 1 (auth T1-T7, timezone, S3, audit log, payment) closes the phase.

---

## Risk register

- **Cron field-mismatch (3.3)**: the existing expiry cron queried `endDate` and the model only has `expiresAt`. The cron has therefore *never* expired anything. Fixing the field name will, on first run after merge, expire every subscription whose `expiresAt` is in the past. This is the desired behaviour but worth flagging in the report.
- **Auto-cancel on new subscribe (3.2)**: callers that assumed `findActiveForUser` could return >1 subscription will now always see at most one. Verified callers (`getMySubscription`, `changePlan`, `cancelSubscription`, `validateLimits`, `canAccessFeature`, `getPackageLimits`, `incrementUsage`, `subscription` middleware) — all use `[0]`, so behaviour matches expectations.
- **Auditable surface widening**: AuditLogModel `targetType` enum already includes `subscription`; for plan updates we use `system` (no `plan` enum value). Add a metadata field with the plan code so the row is still queryable.
- **AuditLogModel.targetType**: enum has `["user","event","guest","ticket","subscription","whitelabel","service","notification","system"]` — no `plan` and no `addon`. Map plan events to `system` with `metadata.code`. Map addon events to `system` with `metadata.addonId` and `metadata.scope`. Document in REPORT.

---

## Stop gate (echoed from prompt §8)

To be filled in `PHASE_2_REPORT.md` at end:

```
STOP — Phase 2 complete

Branch: claude/implement-phase-2-4gM6G
…
```
