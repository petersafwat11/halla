# Phase 2 — Subscriptions, Addons, Plans — Report

**Branch:** `claude/implement-phase-2-4gM6G`
**Cut from:** `audit/pre-production` post-Phase-1b merge (`03f9fea`)
**Status:** complete (pending review)

## Commits (10, oldest first)

```
f8c112a [PHASE-2]   add plan + progress files
bc377a1 [PHASE-2-A] subscriptions: skip payment for free/trial plans
f1ac22e [PHASE-2-A] subscriptions: auto-cancel old sub on subscribe; newest-first sort
8308a45 [PHASE-2-A] cron: re-activate expiry pipeline; emit subscription.expired audit
f21fcdc [PHASE-2-A] subscriptions: 14-day trial expiry; status='trial' for trial plan
2ccaed4 [PHASE-2-A] subscriptions: admin-assign endpoint + idempotency on /subscribe and /change-plan
121cb76 [PHASE-2-A] subscriptions: expose paymentTransactionId in getSummary
dc9d4af [PHASE-2-B] plans: POST/DELETE endpoints, update validation guard, audit log
fbde764 [PHASE-2-C] addons: full activation pipeline with scope branching + admin activate
10d1c1a [PHASE-2]   smoke tests: 13 static checks + curl runbooks
```

## Per track

### Track A — Subscriptions

| # | Finding | Status | Commit |
|---|---------|--------|--------|
| 3.1 | Trial guard (Phase-1 hand-off) | closed | `bc377a1` |
| 3.2 | FLOW-12-F01 concurrent subscription | closed (auto-cancel + sort) | `f1ac22e` |
| 3.3 | FLOW-09-F03 expiry cron transition | closed | `8308a45` |
| 3.4 | FLOW-09-F02 trial duration (14d) | closed | `f21fcdc` |
| 3.5 | FLOW-09-F04 admin-assign endpoint | closed | `2ccaed4` |
| 3.6 | Idempotency end-to-end on subscribe routes | closed | `2ccaed4` |
| 3.7 | Expose `metadata.paymentTransactionId` | closed | `121cb76` |
| 3.8 | Smoke tests | closed | `10d1c1a` |

Decisions:
- 3.2: **Option 2 — auto-cancel old subscription on new `subscribe()`**. Matches `changePlan()` and removes the "two active" state at the root. Sort change to `createdAt: -1` kept as defence in depth.
- 3.4: **14-day trial**. Decision recorded in `PHASE_2_PLAN.md` and visible in code as `TRIAL_DURATION_DAYS = 14`.

### Track B — Plans CRUD

| # | Finding | Status | Commit |
|---|---------|--------|--------|
| 4.1 | FLOW-08-F01 POST/DELETE | closed | `dc9d4af` |
| 4.2 | FLOW-08-F02 limit-reduction guard | closed | `dc9d4af` |
| 4.3 | FLOW-08-F03 audit log on update | closed | `dc9d4af` |

Notes: DELETE is **soft-delete only** (`isActive: false`) and returns 409 when active subscribers exist. PATCH accepts a wider field whitelist than before (`isPublic`, `sortOrder`, `isPopular` added) but still drops unknown keys. Audit row uses `targetType: "system"` because `AuditLogModel.targetType` enum lacks `plan`; the plan code lives in metadata.

### Track C — Addons

| # | Finding | Status | Commit |
|---|---------|--------|--------|
| 5.1 | FLOW-10-F01 activation pipeline | closed | `fbde764` |
| 5.2 | FLOW-10-F02 scope branching | closed | `fbde764` |
| 5.3 | FLOW-10-F03 idempotency | closed | `fbde764` |

Scope mapping (decided + implemented):
- `pool` → `subscription.invitePool += quantity`
- `event` → target event's `guestLimit += quantity` (no-op for unlimited events)
- `org` → `subscription.invitePool += quantity` (org-level container = subscription today)

`business_customization` payments lands as `pending_provisioning`; the new `POST /addons/admin/:id/activate` endpoint flips it to `active` with an audit row.

## Smoke tests

- `docs/implementation/phase-2-smoke-tests/static-checks.js` — **13 / 13 PASS** (one per finding, plus combined coverage for FLOW-09-F01).
- `docs/implementation/phase-2-smoke-tests/runbooks.md` — curl runbooks for every spec listed in the prompt §3.8 / §4.4 / §5.4.

Phase-1 regression smoke (re-run after every Track A/B/C commit):
- `phase-1-smoke-tests/utilities-static-checks.js` — 5 / 5 PASS.
- `phase-1-smoke-tests/timezone-unit.js` — 16 / 16 PASS.

No live Playwright host was available in this environment (same Phase 1 anomaly). Live Playwright runs once a backend host is provisioned — runbook covers each spec by name.

## Findings closed (full)

| ID | Status | Track |
|----|--------|-------|
| FLOW-09-F01 | closed | A (3.1 + 3.6 — payment scaffold gated by free-plan guard, idempotent end-to-end) |
| FLOW-09-F02 | closed | A (3.2 sort + 3.4 14-day expiry) |
| FLOW-09-F03 | closed | A (3.3 cron) |
| FLOW-09-F04 | closed | A (3.5) |
| FLOW-12-F01 | closed | A (3.2 auto-cancel) |
| FLOW-08-F01 | closed | B (4.1) |
| FLOW-08-F02 | closed | B (4.2) |
| FLOW-08-F03 | closed | B (4.3) |
| FLOW-10-F01 | closed | C (5.1) |
| FLOW-10-F02 | closed | C (5.2) |
| FLOW-10-F03 | closed | C (5.3) |

## Findings partially closed

None.

## Hand-offs to Phase 3

- **Per-event ceiling vs. live event:** the addon `event` scope updates `Event.guestLimit`. Phase 3 should confirm that the launch-time bulk dispatch (FLOW-17) reads `event.guestLimit` and not the populated subscription, otherwise additional invites bought after creation will ship over the wire but be rejected during enforcement.
- **Subscription expiry + RSVP:** the now-functional expiry cron will, on first run after deploy, transition any subscription whose `expiresAt` has already passed. Phase 3 RSVP/event-creation gates already check `subscription.isActive`; verify the cascade does not surprise live events whose host's subscription should be considered grandfathered.

## Hand-offs to Phase 5 (audit-log-everywhere pass)

- `AuditLogModel.targetType` enum needs `plan` and `addon` values. Phase 5 should extend the enum and migrate existing `targetType: "system"` plan/addon rows to the more specific value (or leave them as historical, since logs are immutable).
- Cron-emitted `subscription.expired` rows use `actor: { _id: null, role: "system" }`. Confirm Phase 5's audit-log activation policy treats system-actor rows correctly in the admin viewer.
- Track C addon audit rows record `metadata.paymentTransactionId` so Phase 5 reporting can join Subscription/Addon/AuditLog by transactionId.

## Anomalies

- **Single working-tree branch.** Per the harness, both Phase 1 and Phase 2 share the user-supplied branch convention. Commits are tagged `[PHASE-2-A|B|C]` so they remain reviewable as separate logical units.
- **Pre-existing dead config:** `scheduledTasks.js` had silently-dead references to `BILLING_CYCLES.ONCE` and `endDate` since the constants reorg. Both removed in 3.3. The first run of the now-functional `scheduleSubscriptionStatusUpdate` cron will retroactively expire any subscription with `expiresAt < now`. This is the intended behaviour but worth flagging to ops.
- **No live DB available.** Same as Phase 1; smoke testing is contract-static + curl runbooks. Runbook is immediately executable against a live backend.

## Stop gate

```
STOP — Phase 2 complete

Branch: claude/implement-phase-2-4gM6G

Track A (Subscriptions):
- Trial guard (first subtask):                  bc377a1
- FLOW-12-F01 concurrent sub bug:               f1ac22e   (Option 2: auto-cancel old sub)
- FLOW-09-F03 expiry cron status transition:    8308a45
- FLOW-09-F02 trial expiry policy:              f21fcdc   (14 days)
- FLOW-09-F04 admin-assign endpoint:            2ccaed4
- Idempotency wired end-to-end:                 2ccaed4   (combined with admin-assign)
- getSummary transactionId:                     121cb76
- Smoke tests:                                  PASS (static-checks)

Track B (Plans CRUD):
- FLOW-08-F01 POST/DELETE endpoints:            dc9d4af
- FLOW-08-F02 validation guard:                 dc9d4af
- FLOW-08-F03 audit log on update:              dc9d4af
- Smoke tests:                                  PASS (static-checks)

Track C (Addons):
- FLOW-10-F01 activation pipeline:              fbde764
- FLOW-10-F02 scope branching:                  fbde764
- FLOW-10-F03 idempotency:                      fbde764
- Smoke tests:                                  PASS (static-checks)

Phase-1 regression smoke: PASS (utilities-static-checks 5/5, timezone-unit 16/16)

Findings closed (full): FLOW-08-F01, FLOW-08-F02, FLOW-08-F03,
                         FLOW-09-F01, FLOW-09-F02, FLOW-09-F03, FLOW-09-F04,
                         FLOW-10-F01, FLOW-10-F02, FLOW-10-F03,
                         FLOW-12-F01.
Findings partially closed: none.

Ready for merge: yes.

Hand-offs to Phase 3:
- confirm bulk dispatch reads event.guestLimit (not populated sub)
  so Track-C event-scope addons take effect at send time.
- expiry cron will retroactively expire subs whose expiresAt is in
  the past on first run.

Hand-offs to Phase 5:
- AuditLogModel.targetType enum lacks `plan` and `addon` — extend
  + decide on row migration.
- system-actor audit rows used for cron expiry — confirm admin
  viewer renders them correctly.

Anomalies:
- shared working-tree branch with Phase 1 (harness convention).
- pre-existing dead config (BILLING_CYCLES, endDate) cleaned up in 3.3.
- no live Playwright host; static checks + runbooks substitute.
```
