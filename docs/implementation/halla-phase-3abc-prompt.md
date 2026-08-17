# Halla Implementation — Phase 3abc: Pipeline Ordering, Bulk Dispatch, Launch Failure

> Paste this into a **fresh** Claude Code session. Phase 3abc covers the most code-touching slice of the project: the RSVP pipeline's ordering, atomicity, dispatch correctness, and failure recovery. Three sub-phases run sequentially in one session because they have hard dependencies on each other.

## 0. Why this exists

Phase 3 is the largest phase. It closes ~30 findings across the event-lifecycle pipeline. Phase 1 built the foundations (timezone utility, idempotency utility, payment scaffold, audit log, S3). Phase 2 wired them into subscriptions/addons/plans. Phase 3 wires them into the event/launch/dispatch/failure pipeline and adds the new mechanisms (failed status, 24h retry, batched parallel send) that the audit specified.

This prompt covers 3a, 3b, and 3c. They run sequentially because:
- 3a establishes the `failed` status and the send-then-mark-live ordering that 3b and 3c depend on.
- 3b depends on 3a's event-level send lock for safe parallel dispatch.
- 3c depends on 3a's status enum and 3b's idempotent retries to build the failure-recovery flow.

Phase 3d (webhook + RSVP correctness) and 3e (scanner + post-event) are independent of 3abc and run in a separate parallel session per a second prompt.

## 0.5. Naming context

Per the prior naming audit:
- `STAFF` (audit) ≡ `ENTRANCE_GATE` (code)
- `staffPortal` (audit) ≡ `entranceGate` (code)
- `StaffAccessToken` model unchanged
- `/staff-portal` URL preserved

Phase 3abc doesn't directly modify staff/gate code (that's 3e).

## 1. Standing rules

### 1.1 Check before you create
Before adding any new module, grep for existing patterns. Phase 1 + Phase 2 utilities you'll consume:
- Idempotency: `src/shared/utils/idempotency.js`, `src/shared/middleware/idempotency.js` (read the BSON contract docstring before using)
- Audit log: `src/shared/middleware/auditLog.js`
- Timezone: `src/shared/utils/timezone.js`
- Payment scaffold: `src/infrastructure/paymentProvider/` (not heavily used here; subscriptions already wires it)

Read each before consuming. Confirm signatures.

### 1.2 Build + wire actually wired
Idempotency utility is now wired to Taqnyat sends, RSVP submit (3d), check-in (3e). Audit log is wired to launch events, status transitions, retry attempts. Don't defer these — they are part of the closing definition for the relevant findings.

### 1.3 Clean break
- The Taqnyat-native scheduling path is removed entirely. Anywhere code branches on `taqnyatDeleteId` to skip our cron, delete that branch and the field from the model. Confirm with Peter mid-session if any unexpected consumer of the field is found. Decided: remove.
- No backward-compatible shim for the old "mark live first, then send" ordering. The new ordering replaces it.

### 1.4 Smoke tests via Playwright MCP
Each sub-phase produces Playwright specs under `docs/implementation/phase-3-smoke-tests/`. Specs run live against a running server. Server must be confirmed running before any spec executes. Idempotency utility's BSON contract — assert on core fields, not deep-equal — applies to every test that round-trips through the cache.

### 1.5 Progress files
In `docs/implementation/`:
- `PHASE_3abc_PLAN.md` — written first, with file paths, sub-phase ordering, sub-agent assignments where applicable.
- `PHASE_3abc_PROGRESS.md` — updated continuously by main session.
- `PHASE_3abc_REPORT.md` — written at the end with commits, smoke results, deviations, hand-offs.

`IMPLEMENTATION_LEDGER.md` is updated only at merge time, not during the work.

### 1.6 Sub-agent parallelism rule
3a and 3b have sequential dependencies — run as main session, no sub-agents within them.
3c has independent sub-tasks (backend retry cron, web "we are sorry" UI, mobile "we are sorry" UI, WhatsApp contact component) that can split into parallel sub-agents. See section 4.

### 1.7 Branch strategy
Branch: `implementation/phase-3abc-pipeline-dispatch-failure` cut from `audit/pre-production` (post-Phase-2 merged state).

### 1.8 Single session, no parallel sessions on this working tree
Phase 1 had two parallel-session collisions. Phase 2 was single-session and clean. Phase 3abc is single session. If a parallel session is needed for 3d/3e later, use a second clone of the repo.

### 1.9 Server timezone irrelevant
Phase 1's timezone utility means server can run anywhere. Don't assume Asia/Riyadh server. All datetime comparisons must use `nowUtc()` and the timezone utility.

## 2. The findings to close in 3abc

### 3a — Pipeline ordering and atomicity
- PIPELINE-F01 / FLOW-14-F01: event marked `live` before send completes
- PIPELINE-F03: consumeInvites debits pool before Event.save (race)
- PIPELINE-F04 / FLOW-15-F01: no `failed` status in event enum
- Event-level send lock to prevent dual cron tick races
- Remove Taqnyat-native scheduling path entirely (kill the dual-path complexity)
- Verify Phase 1's timezone fix is correct in the cron (regression check, not a new finding)

### 3b — Bulk dispatch correctness
- FLOW-17-F01: 100ms-per-guest sequential loop blocks event loop
- FLOW-21-F01: same fix for post-event bulk access emails
- FLOW-14-F04 / FLOW-17-F02: idempotency keys on Taqnyat sends (Phase 1 hand-off)

### 3c — Launch failure flow
- FLOW-15-F02: retryFailed never auto-invoked
- FLOW-15-F05: host not notified when event fails to launch
- 24h pre-send retry mechanism with retry cron
- On exhaustion: mark event `failed`, notify host + admin + super admin
- "We are sorry" UI on web event page (host + whitelabel admin who created the event)
- "We are sorry" UI on mobile event page (same audience)
- Manual retry button — visible to admin AND to whoever created the event (host or whitelabel admin)
- WhatsApp contact button component (reusable, not a one-off)

## 3. Sub-phase 3a — Pipeline ordering and atomicity

Sequential. Main session work. No sub-agents.

### 3a.1 Add `failed` status to event enum

**File**: `labbe-backend-/models/EventModel.js`

Add `failed` to the `status` enum. Also add `pending_retry` if you decide to track in-progress retry attempts as a separate state — see 3c.1 for the decision. Default to just `failed` for now; add `pending_retry` only if 3c needs it.

Verify all existing status-checking code paths handle the new status correctly (default branches in switches, etc.). Grep for `event.status === 'live'` and similar patterns.

### 3a.2 Send-then-mark-live ordering

**File**: `labbe-backend-/src/shared/utils/scheduledTasks.js` — `scheduleEventLaunch` cron.

Today: status set to `live` first, then `sendBulk` called.
New order:
1. Acquire event-level send lock (see 3a.3).
2. Call `sendBulk()`.
3. Await completion. If `sendBulk` throws or returns failure: release lock, do NOT set status to `live`. Status stays `scheduled` (3c handles the failure-recovery transition to `failed` after retries exhaust).
4. On `sendBulk` success: set `event.status = 'live'`, set `event.launchedAt = nowUtc()`, save, release lock.
5. Audit log: `auditLog('event_launched', { eventId, host, sentTo: count })`.

If lock acquisition fails (another tick is already running), skip silently — that tick will handle this event.

### 3a.3 Event-level send lock

A simple MongoDB-level lock. Two options:
- **Option A**: a `lockedAt` field on the Event document. Atomic update with `findOneAndUpdate` checking the field is null or stale (e.g. older than 10 minutes).
- **Option B**: a separate `EventLock` collection with TTL.

Option A is simpler (no new collection). Document the choice in the plan. If Option A, the field stays on the event until the launch finishes — `lockedAt: null, lockedBy: cronWorkerId`. Lock is acquired by `findOneAndUpdate({ _id, $or: [{ lockedAt: null }, { lockedAt: { $lt: tenMinutesAgo } }] }, { $set: { lockedAt: now, lockedBy: workerId } })`. Released by setting both back to null.

### 3a.4 Transactional pool debit

**File**: `labbe-backend-/src/modules/events/events.service.js` — `createEvent`.

Today: `consumeInvites()` debits subscription.invitePool before `Event.save()`. If save fails, pool is debited with no event to show for it.

Fix:
- **Option A**: MongoDB transaction wrapping consumeInvites + Event.save. Cleanest if the deployment supports replica sets (MongoDB Atlas does; verify the local dev MongoDB).
- **Option B**: Compensating return. Wrap in try/catch; on save failure, call `returnInvites()` to credit the pool back. Document the inconsistency window in the audit log.

Use Option A if MongoDB transactions are available in the deployment. Use Option B otherwise. Document the choice in the plan.

### 3a.5 Remove Taqnyat-native scheduling path

Grep for `taqnyatDeleteId`, `taqnyatScheduleId`, any code branches that skip the cron when the event was scheduled directly with Taqnyat. Remove the branches, remove the field from the model schema if no other consumer uses it, remove any UI affordance to "schedule via Taqnyat directly."

If a consumer is found that's not in the audit list, document and ask Peter mid-session before removing.

### 3a.6 Verify timezone fix

Phase 1 fixed `parseEventTime` to convert event scheduled time to UTC. Verify the cron now uses it correctly. Run the timezone smoke test against the post-3a state.

### 3a.7 3a smoke tests

Playwright + Node specs at `docs/implementation/phase-3-smoke-tests/`:
- `event-launch-ordering.spec.js` — schedule event, run cron, verify sendBulk completes before status flips to `live`. Inject a sendBulk failure (mock/stub) — verify status stays `scheduled`, lock released, audit entry shows the failure.
- `event-launch-lock.spec.js` — fire two cron ticks within milliseconds — verify only one acquires the lock, second skips silently.
- `pool-debit-atomic.spec.js` — create event with the pool right at the limit; force Event.save to fail (simulate validation error); verify pool is unchanged afterward.
- `taqnyat-native-removed.spec.js` — confirm no code paths reference `taqnyatDeleteId` or schedule directly via Taqnyat.

3a is done when all four pass live.

## 4. Sub-phase 3b — Bulk dispatch correctness

Sequential after 3a lands. Main session work.

### 4.1 Batched parallel send

**File**: `labbe-backend-/src/modules/messaging/messaging.service.js` — `sendBulk` and the `scheduleGuestReminders` 100ms loop.

Today: `for guest of guests { await taqnyat.send(guest); await sleep(100); }`. 1000 guests = 100 seconds. Cron tick is shorter than that for large events.

New: batched parallel send with a per-second rate cap.
- Determine Taqnyat's actual rate limit per second (check the Taqnyat docs or any existing rate-limit config). Use a conservative default of ~10 messages/second if undocumented.
- Build a small utility (or extend an existing one — grep first) that takes an array, a worker function, a concurrency, and a per-second cap. Returns when all complete with results array. Failures are captured per-item; partial success is the default outcome.
- Replace the sequential loop with this utility. Concurrency starts at 5; per-second cap matches Taqnyat's limit.

Same utility used by `scheduleGuestReminders` and post-event bulk access (see 4.3).

Document the choice of concurrency/rate values in the plan with the reasoning.

### 4.2 Idempotency keys on Taqnyat sends

Each send within a batch uses an idempotency key. Key derivation:
- For event launch: `event_launch:${eventId}:${guestId}:${attemptNumber}`
- For guest reminder: `reminder:${eventId}:${guestId}:${reminderType}:${attemptNumber}`
- For test message: `test:${eventId}:${requesterId}:${timestamp}`

The key is sent to Taqnyat as a request header. The Taqnyat client (or its wrapper) must accept and forward the header. If Taqnyat doesn't support idempotency natively, we still maintain a local idempotency cache via the Phase 1 utility — same outcome, different mechanism.

Read the idempotency utility's BSON contract docstring before testing. Tests assert on success/failure status and ID, not deep-equal.

### 4.3 Same fix for post-event bulk access emails

**File**: post-event content service — `sendBulkAccessEmails` or similar.

Apply the same batched-parallel utility. Same per-second cap (or a different one if email provider has different limits — document).

### 4.4 3b smoke tests

- `bulk-dispatch-batched.spec.js` — schedule event with 100 guests, run launch cron, verify completion in ~10-20 seconds (not 10+ minutes), verify all 100 sends fired.
- `bulk-dispatch-rate-cap.spec.js` — schedule event with 50 guests, observe send rate stays under the configured cap.
- `bulk-dispatch-idempotency.spec.js` — fire the same launch twice (simulate cron double-tick or replay), verify Taqnyat is only called once per guest, idempotency cache hit on second call.
- `bulk-dispatch-partial-failure.spec.js` — inject failure for 5 of 100 guests, verify 95 succeed, 5 are recorded as failed (these are inputs to 3c retry), event status stays `scheduled` per 3a.
- `post-event-bulk.spec.js` — same batched fix on post-event bulk access emails works.

3b done when all five pass live.

## 5. Sub-phase 3c — Launch failure flow

Sub-agent parallelism is appropriate here. Five tasks split into independent owned-file lists.

### 5.1 24h pre-send retry cron

**Sub-agent C1**. Owned files: `labbe-backend-/src/shared/utils/scheduledTasks.js` (new cron section), `labbe-backend-/src/modules/events/events.service.js` (retry logic).

New cron job: `scheduleEventRetry`. Runs every 5 minutes (or whatever the existing cron cadence is — match it).

Logic:
- Find events where `status === 'scheduled'` AND `scheduledTime + retryWindow > now()` AND last failed attempt was at least N minutes ago AND attemptCount < maxAttempts.
- `retryWindow` is 24h before scheduled launch time (so retries happen *before* the event is supposed to go live, not after).
- `N` is a backoff: first retry after 5 min, second after 30 min, third after 2 hours.
- `maxAttempts` is 5.
- For each match, call the same `sendBulk` flow as 3a/3b. Increment `attemptCount`. If success: set status to `live` (per 3a's send-then-mark-live). If failure: continue, will retry next tick.
- After `maxAttempts` exhausted OR `retryWindow` expires (now > scheduledTime - 24h cutoff): mark `event.status = 'failed'`, fire notifications (5.2), audit log.

Add fields to EventModel: `attemptCount` (default 0), `lastAttemptAt`, `failureReason` (string, captures the last error for the UI).

### 5.2 Failure notifications

**Sub-agent C2**. Owned files: notification service, email templates, audit log integration.

When event transitions to `failed`:
- In-app notification to host (or whoever created the event — could be whitelabel_admin).
- In-app notification to all admins of the event's whitelabel + all super admins.
- Email to host (or creator).
- Email to admins + super admins.
- Audit log entry: `auditLog('event_launch_failed', { eventId, attemptCount, failureReason })`.

Idempotency on each notification (Phase 1 utility) — failure status only fires once.

Notification copy: simple, apologetic, factual. Include event ID/name and the failure reason in plain language. Direct host to the event detail page (which has the retry button per 5.4).

### 5.3 WhatsApp contact button component

**Sub-agent C3**. Owned files: `labbe/components/shared/` (new), `halla-mobile/components/shared/` (new), `labbe-backend-/src/config/` (or wherever public site config lives — the WhatsApp customer service number).

Build a reusable `<WhatsAppContactButton />` (web) and a matching mobile component.

Find the existing WhatsApp customer service number used elsewhere on the website. Grep the labbe repo for `wa.me`, `whatsapp.com/send`, `+966` (Saudi country code), `+20` (Egypt) — find the canonical number. If not found, ask Peter mid-session.

Component API:
```jsx
<WhatsAppContactButton 
  contextMessage="I need help with my event launch failure (Event ID: 12345)" 
/>
```

Generates a `wa.me/<number>?text=<encoded message>` link. Styled as a green WhatsApp button. Mobile version uses `Linking.openURL` for the same URL.

This component is used in 5.4's failure UI and is reusable for Phase 4 (mobile parity work) and Phase 5 (polish). Document the component API in a docstring so future phases can find it.

### 5.4 "We are sorry" UI — web

**Sub-agent C4**. Owned files: `labbe/app/[lang]/host/events/[id]/` page or component (whatever the existing event detail page is — grep first), plus any whitelabel-admin event detail page if separate.

When event status is `failed`:
- Banner at the top of the event detail page: "We're sorry — your event launch failed."
- Show `failureReason` in plain Arabic and English.
- Show the retry button (only if `attemptCount < hardCap`, e.g. 10). On click, calls `POST /api/v2/events/:id/retry-launch` (new endpoint, see 5.6).
- Show the WhatsApp contact button (5.3) with context message including the event ID and failure reason.
- The retry button is visible to: host (event creator), whitelabel_admin (if the event belongs to their whitelabel), admin, super_admin. Not visible to other roles.

If event status is `pending_retry` (between attempts): show a softer banner — "We're retrying the launch. Attempt N of 5." No retry button (we're already retrying).

### 5.5 "We are sorry" UI — mobile

**Sub-agent C5**. Owned files: `halla-mobile/screens/EventDetailScreen.js` (or wherever the event detail screen is — grep first; check both host and admin variants).

Same UI as 5.4 but mobile-native. Use the WhatsApp contact button mobile variant.

**Mobile event-detail screen verification first**: per Peter, check that step 3, step 4, step 5 of the mobile wizard, the WhatsApp preview, and the template selection all work the same as web and produce the same data. Don't fix mismatches in 3c — just document them. Mobile wizard parity goes to Phase 4. The minimum needed for 3c is: the event detail screen exists on mobile and can render the failure UI.

If the event detail screen doesn't exist or is broken, that's a 3c blocker — fix the rendering bare minimum to show the failure banner. Don't fix the whole screen. Document the gap clearly for Phase 4.

### 5.6 Manual retry endpoint

**Part of C1's scope**. New endpoint: `POST /api/v2/events/:id/retry-launch`.

- Auth: event creator (host or whitelabel_admin), admin (own whitelabel), super_admin. RBAC enforced.
- Idempotency-Key supported.
- Audit log: `auditLog('event_launch_manual_retry', { eventId, triggeredBy })`.
- Resets `attemptCount` to 0 (manual retry gets a fresh window) and immediately calls the launch flow.
- Returns 200 if retry kicked off, 409 if event is not in `failed` state, 403 if caller doesn't have permission.

### 5.7 3c smoke tests

- `event-failure-cron.spec.js` — event fails 5 times, retry cron exhausts, status flips to `failed`, notifications fire, audit log entry exists.
- `event-failure-notifications.spec.js` — verify notifications reach host + admins (mock the channels).
- `event-failure-ui-web.spec.js` — Playwright test: failed event → banner visible, retry button works, WhatsApp link points to the right number with the context message.
- `event-failure-ui-mobile.spec.js` — manual runbook (Expo dev build needed) — same as web.
- `event-manual-retry.spec.js` — host clicks retry on failed event → endpoint accepts, event goes back to `scheduled`, cron picks it up, sends.

3c done when all pass live (mobile UI test is manual runbook, document and accept).

## 6. Sub-agent parallelism plan

| Phase | Task | Sub-agent | Owned files |
|-------|------|-----------|-------------|
| 3a | All | Main session | scheduledTasks.js, EventModel.js, events.service.js, messaging.service.js |
| 3b | All | Main session | messaging.service.js, post-event service, batched-send utility (new) |
| 3c.1 | Retry cron + retry endpoint | Sub-agent C1 | scheduledTasks.js, events.service.js, events.routes.js |
| 3c.2 | Notifications | Sub-agent C2 | notification service, email templates, audit wiring |
| 3c.3 | WhatsApp contact component | Sub-agent C3 | labbe/components/shared/, halla-mobile/components/shared/, public config |
| 3c.4 | Web failure UI | Sub-agent C4 | labbe/app/[lang]/host/events/[id]/ |
| 3c.5 | Mobile failure UI | Sub-agent C5 | halla-mobile/screens/EventDetailScreen.js |

C1 and C2 share `scheduledTasks.js` if C2's audit log on failure is wired in the cron — confirm at dispatch, consolidate if needed.

C4 and C5 share the WhatsApp contact button (built by C3). C3 must finish before C4 and C5 dispatch.

So the dispatch order for 3c:
1. Dispatch C1 and C2 in parallel (different concerns).
2. Dispatch C3 in parallel.
3. After C3 lands: dispatch C4 and C5 in parallel.

## 7. Process

1. Read this prompt fully.
2. Read `PHASE_2_FINAL_REPORT.md` for context. Confirm Phase 2 hand-offs are in scope here.
3. Read `docs/audit/FINDINGS_SUMMARY.md` and confirm the listed finding IDs.
4. Read the idempotency utility's BSON contract docstring (`src/shared/utils/idempotency.js`).
5. Confirm current branch state. Create `implementation/phase-3abc-pipeline-dispatch-failure` from `audit/pre-production`.
6. Write `PHASE_3abc_PLAN.md` with file paths, owned files per sub-agent, decisions on the policy questions raised in section 3 (lock option A vs B, transaction option A vs B, retry concurrency/rate).
7. Write `PHASE_3abc_PROGRESS.md` (initial state).
8. Run sub-phase 3a as main session work. After each step, update progress. After all 3a work lands and smoke tests pass, take stock and continue to 3b.
9. Run sub-phase 3b as main session work. After smoke tests pass, continue to 3c.
10. Run sub-phase 3c with sub-agent parallelism per section 6. Main session reviews each sub-agent's diff before merging.
11. After all three sub-phases finish:
    - Run a Phase-1 + Phase-2 regression smoke (auth, timezone, S3, audit log, payment, subscriptions, addons, plans).
    - Update `PHASE_3abc_REPORT.md` with all commits, smoke results, deviations, hand-offs.
12. Output the STOP gate.

## 8. STOP gate

```
STOP — Phase 3abc complete

Branch: implementation/phase-3abc-pipeline-dispatch-failure

Sub-phase 3a (Pipeline ordering and atomicity):
- Failed status added: <commit>
- Send-then-mark-live ordering: <commit>
- Event-level send lock: <commit>, decided <Option A or B>
- Transactional pool debit: <commit>, decided <Option A or B>
- Taqnyat-native scheduling removed: <commit>
- Smoke tests: <pass/fail per spec>

Sub-phase 3b (Bulk dispatch correctness):
- Batched parallel send utility: <commit>, concurrency <N>, rate cap <X>/sec
- Taqnyat send idempotency: <commit>
- Post-event bulk fix: <commit>
- Smoke tests: <pass/fail per spec>

Sub-phase 3c (Launch failure flow):
- 24h retry cron: <commit>
- Failure notifications: <commit>
- WhatsApp contact button (web + mobile): <commit>
- Web failure UI: <commit>
- Mobile failure UI: <commit>
- Manual retry endpoint: <commit>
- Smoke tests: <pass/fail per spec>

Phase-1 + Phase-2 regression smoke: <pass/fail>

Findings closed (full): <list>
Findings partially closed: <list, if any>

Mobile wizard parity check (per Peter):
- Step 3 (category + image): <web vs mobile comparison summary>
- Step 4 (template selection): <comparison summary>
- Step 5 (summary + confirm): <comparison summary>
- WhatsApp preview: <comparison summary>
- Template selection flow: <comparison summary>
- Gaps documented for Phase 4: <list>

Ready for merge: yes/no
Reason if no: <which sub-phase blocked>

Hand-offs to Phase 3de:
- (anything 3abc surfaced that affects webhook/RSVP/scanner/post-event)

Hand-offs to Phase 4:
- Mobile wizard parity gaps (per the comparison above)
- Mobile event detail screen polish (3c only fixed bare minimum)

Hand-offs to Phase 5:
- (anything for the audit-log-everywhere pass)

Anomalies:
- <anything noticed but not fixed>
```

Then stop. Phase 3de is a separate prompt.

Begin.
