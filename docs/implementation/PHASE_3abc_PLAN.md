# Phase 3abc — Pipeline Ordering, Bulk Dispatch, Launch Failure — PLAN

**Branch:** `claude/implement-phase-3-plans-ZWa40` (per harness convention; effectively
the same logical branch as `implementation/phase-3abc-pipeline-dispatch-failure`).
**Cut from:** `master` post-Phase-2 merged state (commit `1566632`).
**Mode:** Single session, one writer, no parallel sessions on this working tree.

## Locked decisions

### D1 — Event-level send lock (3a.3)
**Option A — `lockedAt` field on Event document.** Simpler; no new collection.
Field cleared on success/failure; stale lock (>10 min) is forcibly retaken.

### D2 — Transactional pool debit (3a.4)
**Option B — Compensating return.** MongoDB transaction support requires
a replica set; the codebase already pairs `consumeInvites` with an explicit
`releaseInvites` for the cancellation path. We extend the same pattern to
event creation: on `Event.save()` failure inside `createEvent`, the catch
block releases the invites and rethrows. Atomic-ish via best-effort
compensation; the audit log records any inconsistency window.

### D3 — Retry concurrency / rate cap (3b.1)
- **Concurrency:** 5 in-flight sends per event.
- **Per-second cap:** 10 messages/second (Taqnyat undocumented;
  conservative default per the prompt).
- One shared `runBatched` utility under
  `src/shared/utils/runBatched.js`. Same utility reused by:
  - launch bulk send (`messaging.service.sendBulk`)
  - 24h reminder cron (`scheduledTasks.scheduleGuestReminders`)
  - post-event bulk access (`post-event.service.sendBulkAccessEmails`
    and `_generateTokensAndNotify`).

### D4 — Failed status enum (3a.1)
Single new value: `failed`. `pending_retry` is **not** introduced as a
separate state; the retry cron uses `attemptCount` + `lastAttemptAt` on
the Event doc to track in-flight retries. UI distinguishes
"retrying" by reading those fields rather than a status flip.

### D5 — Retry cron schedule (3c.1)
- Cron cadence: every 5 minutes.
- Per-event backoff: 5 min, 30 min, 2 h, 6 h, 12 h.
- `maxAttempts`: 5.
- Cutoff: when `now > scheduledLaunchUtc + 24 h` OR `attemptCount >= 5`,
  flip status to `failed` and notify.
- Manual retry resets `attemptCount` to 0 and runs immediately.

### D6 — WhatsApp customer service number
Reused from `labbe/ui/landing/PricingSection/PricingSection.jsx` and
`CtaBanner.jsx`: **`+966500000000`** (placeholder constant in landing UI).
Centralized in the new `WhatsAppContactButton` component; replace value
when production number is known (TODO in the component).

## File ownership map

| Sub-phase | Owned files |
|-----------|-------------|
| 3a.1 failed status | `labbe-backend-/src/shared/constants/status.js`, `labbe-backend-/models/EventModel.js` (status enum) |
| 3a.2 send-then-mark-live + 3a.3 send lock | `labbe-backend-/src/shared/utils/scheduledTasks.js`, `labbe-backend-/src/shared/utils/eventLock.js` (NEW) |
| 3a.4 transactional pool debit | `labbe-backend-/src/modules/events/events.service.js` (`createEvent`) |
| 3a.5 remove taqnyat-native | `labbe-backend-/src/modules/messaging/messaging.service.js` (`scheduleBulkSend`), `labbe-backend-/src/shared/utils/scheduledTasks.js` (cron path), `labbe-backend-/models/EventModel.js` (drop field) |
| 3b.1 batched parallel send | `labbe-backend-/src/shared/utils/runBatched.js` (NEW), `labbe-backend-/src/modules/messaging/messaging.service.js` (`sendBulk`), `labbe-backend-/src/shared/utils/scheduledTasks.js` (`scheduleGuestReminders`) |
| 3b.2 idempotency keys | `labbe-backend-/src/modules/messaging/messaging.service.js` (`sendToGuest` wrapper), `labbe-backend-/src/shared/utils/idempotency.js` (existing) |
| 3b.3 post-event bulk fix | `labbe-backend-/src/modules/post-event/post-event.service.js` (`sendBulkAccessEmails`, `_generateTokensAndNotify`) |
| 3c.1 retry cron + manual retry endpoint | `labbe-backend-/src/shared/utils/scheduledTasks.js` (new cron), `labbe-backend-/src/modules/events/events.service.js` (retry methods), `labbe-backend-/src/modules/events/events.controller.js`, `labbe-backend-/src/modules/events/events.routes.js`, `labbe-backend-/models/EventModel.js` (attempt tracking fields) |
| 3c.2 failure notifications | wired inline in 3c.1 via `notificationService.sendToUser` + `notificationService.sendToAdmins` + `taqnyat.sendSMS` host SMS, plus `logAudit` |
| 3c.3 WhatsApp contact button | `labbe/ui/commen/whatsappButton/WhatsAppContactButton.jsx` (NEW), `halla-mobile/components/shared/WhatsAppContactButton.js` (NEW) |
| 3c.4 web failure UI | `labbe/app/[lang]/host/events/[id]/_components/EventFailureBanner.jsx` (NEW), `labbe/app/[lang]/host/events/[id]/page.jsx` (wire) |
| 3c.5 mobile failure UI | `halla-mobile/screens/EventsScreen.js` or new `screens/EventFailureBanner.js` (NEW component) |

## Sub-phase ordering (sequential, single session)

1. 3a.1 → 3a.2/3 → 3a.4 → 3a.5 (all within one cohesive commit per step)
2. 3b.1 → 3b.2 → 3b.3
3. 3c.1 (retry cron + manual retry endpoint + attempt tracking model fields)
4. 3c.2 (notifications wired inside the cron's failure branch — same commit)
5. 3c.3 (WhatsApp contact component, web + mobile)
6. 3c.4 (web failure UI consuming 3c.3)
7. 3c.5 (mobile failure UI consuming 3c.3)

## Smoke tests

Live Playwright runs are not available in this environment (no live backend
host) — same anomaly as Phase 1 / Phase 2. We produce **static-check Node
scripts** under `docs/implementation/phase-3-smoke-tests/` that source-grep
the post-3abc tree to assert the contract, plus runbook `runbooks.md` with
curl commands to exercise each spec live once a host is available.

Spec inventory:
- `static-checks.js` — covers 3a (failed status added, send-then-mark-live
  ordering, lock acquired before send, transactional return on save
  failure, taqnyat-native path removed), 3b (runBatched utility exists,
  sendBulk uses it, idempotency wired, post-event uses it), 3c (retry cron
  registered, manual retry endpoint registered, WhatsApp button component
  exists, failure UI banner exists).
- `runbooks.md` — curl commands for each finding, mirroring Phase 2 style.

## Findings closed in 3abc

| ID | Sub-phase | Notes |
|----|-----------|-------|
| PIPELINE-F01 / FLOW-14-F01 | 3a.2 | send-then-mark-live |
| PIPELINE-F03 | 3a.4 | compensating return |
| PIPELINE-F04 / FLOW-15-F01 | 3a.1 | `failed` status added |
| PIPELINE-F05 | 3a.6 | regression check (already closed Phase 1b) |
| FLOW-17-F01 | 3b.1 | batched parallel send |
| FLOW-21-F01 | 3b.3 | post-event bulk uses same utility |
| FLOW-14-F04 / FLOW-17-F02 | 3b.2 | idempotency keys |
| FLOW-15-F02 | 3c.1 | retry cron auto-invokes |
| FLOW-15-F05 | 3c.2 | failure notifications fire |
| FLOW-15-F03 | 3c.4 / 3c.5 | "we are sorry" UI |
| FLOW-15-F04 | 3c.1 (manual retry endpoint) | host/admin can retry |

## Anomalies / handoffs (filled in REPORT)

(empty until phase complete)
