# 15 — event-launch-failure

## One-paragraph description
Failure path for event launch: When bulk send in Flow 14 (sendBulk) returns errors, invitations failed to reach guests. System retries up to N times with backoff (retryFailed in messaging.service). If retries exhaust, event status should be marked 'failed' (new status needed), and host + all admins/super-admins notified via in-app + email. Host sees dedicated "sorry, we had an issue" UI on event page with retry countdown/button. This flow is largely unimplemented; many pieces are missing from current codebase.

## Scope tags
Error handling, retry logic, escalation notifications, admin alerts, user-facing error UI.

## Roles involved
System (retries), Host (sees error state), Admins/Super-admins (receive notifications), Backend (attempts resend).

## Entry points
- `labbe-backend-/src/modules/messaging/messaging.service.js:278-314` retryFailed() method (called manually or by admin, not automatic retry yet)
- `labbe-backend-/src/shared/utils/scheduledTasks.js:96-170` scheduleEventLaunch() catch block (line 160-163: logs error but does NOT retry)
- New endpoint TBD: POST `/events/{eventId}/retry-send` (does not exist yet)

## Exit / terminal states

### Event status transitions (PARTIALLY IMPLEMENTED):
- **current code**: scheduled → live (even if sends fail); stays live
- **desired per design**: scheduled → live → failed (if retries exhaust)
- **missing**: STATUS constant 'failed' not in EVENT_STATUS (confirmed at status.js:31-40)

### Retry state machine (NOT IMPLEMENTED):
- Initial send fails: Guest.invitation.failedAttempts = 0
- First retry: failedAttempts = 1, Guest.invitation.status = 'failed'
- Subsequent retries: failedAttempts increments (max 3 at line 295)
- Exhausted: failedAttempts >= 3 → event.status should become 'failed'

### Notification requirements (NOT IMPLEMENTED):
- To Host: in-app + email "Event launch failed. Retrying..."
- To All Admins: in-app + email "Event {title} by {host} failed to launch invitations"
- To All Super-admins: same as admins
- Retry countdown: "Retrying in X minutes"

## Touched modules

### labbe-backend- (partial/missing implementation)
- `src/modules/messaging/messaging.service.js:278-314` retryFailed()
  - Line 290-297: Find guests with invitation.status='failed' and failedAttempts < 3
  - Line 309-313: Recursively call sendBulk() with failed guest IDs
  - MISSING: Automatic retry scheduling (no cron job for retry backoff)
  - MISSING: Backoff timing (immediate retry, no delay between attempts)

- `src/shared/constants/status.js:31-40` EVENT_STATUS
  - MISSING: 'failed' status value

- `src/shared/utils/notificationService.js:1-100+`
  - Used: sendToUser(), sendToAdmins() methods (exist but unclear if they support event failure context)
  - MISSING: Event failure notification type and template

- `src/infrastructure/email.js` and `src/shared/utils/emailService.js`
  - Used: for email notifications
  - MISSING: Event failure email template

- `src/modules/events/events.service.js`
  - Used: Event model updates
  - MISSING: Logic to mark event status='failed' and trigger notifications

- `models/EventModel.js`
  - Schema: needs retryAttempts, lastRetryAt, failureReason fields (status exists, value='failed' needs adding)

- `models/GuestModel.js`
  - Schema: invitation.failedAttempts (exists), invitation.lastRetryAt (missing), invitation.status (exists)

### halla-mobile
- Event detail screen (failure state UI): MISSING
  - Show red error banner "Invitations failed to send"
  - Display retry button or countdown timer
  - Track retry attempts

### labbe (web)
- Event detail/stats page (failure state): MISSING
  - Show error state with retry controls
  - Display admin action buttons (if admin user)

## Dependencies

**Depends on:**
- Flow 14 (event-launch-happy) — failure occurs after initial send attempt in scheduleEventLaunch

**Depended on by:**
- Admin manual intervention (out of scope)
- Email delivery confirmation webhooks (out of scope)

## Known divergences

1. **No automatic retry scheduling**: Current retryFailed() is callable but not called automatically. No cron job exists to retry failed sends at intervals (e.g., 5 min, 15 min, 1 hour backoff).

2. **Immediate vs. backoff retry**: Code calls sendBulk immediately (line 309) with no delay. Should implement exponential backoff: 5m, 15m, 1h.

3. **Event status stays 'live' on failure**: Code in scheduleEventLaunch (line 141-163) sets status='live' BEFORE sending. If send fails, event is live with failed invitations, not marked 'failed'.

4. **No dedicated admin endpoint for manual retry**: Admin UI has no way to manually trigger retryFailed(). Would need POST `/events/{id}/admin/retry-send` endpoint.

5. **Missing event failure webhook**: No way for external systems (e.g., logging, analytics) to be notified of event launch failures.

6. **Notification scope**: Are ONLY host + admins notified, or also the host's whitelabel admin if applicable? Code doesn't check whitelabel context. 
peter note :hosts if they under whitelabel umbera will not have direct access to the plateform so if the event have whitelabel id should the notification goes to whitelabel admin and admins and super admin

7. **Guest notification on failure**: Current design notifies host/admins. Should guests also be notified that their invitation failed? Or retry silently? 
peter note: retry silently

## Open questions

**Q1: New status 'failed': should it be added to EVENT_STATUS constants? Terminal or recoverable?**

A:
**Current behavior:** `EVENT_STATUS` in `labbe-backend-/src/shared/constants/status.js:31-40` defines eight statuses (`draft`, `pending_review`, `scheduled`, `live`, `published`, `cancelled`, `completed`, `archived`). There is no `'failed'` value. A failed-launch event stays `'live'` indefinitely with no automatic retry or escalation.

**Assessment:** CONFLICTS-WITH-GATE-1-DECISION

**Why:** Gate 1 #5 explicitly requires a `'failed'` status transition after retries exhaust. Gate 1 #4 requires a "we are sorry" UI that only makes sense if the status is `'failed'`.

**Recommended change:** Add `'failed'` to `EVENT_STATUS` in `status.js`. Design as recoverable: host or admin can trigger a manual resend from the `'failed'` state. Mark as terminal only after the host explicitly archives the event or the event date has long passed.

Source: `labbe-backend-/src/shared/constants/status.js:31-40`

**Q2: Max retry attempts: code has hardcoded 3. Should it be configurable?**

A: **Decided.** Keep the hardcoded value of **3 retries**. Three automatic attempts is the industry standard for messaging delivery (Twilio, AWS SNS, and WhatsApp Business providers all default to 3). The backoff schedule: first retry at 5 minutes, second at 15 minutes, third at 1 hour. No `SystemConfig` document needed — 3 is correct and unlikely to need adjustment.

Source: `labbe-backend-/src/modules/messaging/messaging.service.js:295`

**Q3: Retry backoff timing: what intervals? Exponential or fixed?**

A:
**Current behavior:** `retryFailed()` at `labbe-backend-/src/modules/messaging/messaging.service.js:309-313` calls `sendBulk()` immediately with no delay. No cron job triggers automatic retries; `retryFailed()` must be invoked manually.

**Assessment:** CONFLICTS-WITH-GATE-1-DECISION

**Why:** Gate 1 #5 specifies a "24h pre-send retry," implying a retry window that must exist before the event goes live. There is no automatic retry scheduling at all — the method is callable but never called by the system.

**Recommended change:** Add a cron job (`scheduleFailedSendRetry`) that runs every 5 minutes, finds events with `status: 'launching'` (or a new `'send_failed'` intermediate), counts retry attempts, and re-calls `sendBulk()` for failed guests with exponential backoff (5m → 15m → 1h). After 3 exhausted attempts, transition to `'failed'` and notify.

Source: `labbe-backend-/src/modules/messaging/messaging.service.js:309-313`

**Q4: Email template: what should failure email say?**

A: [PETER DECISION]

**The choice:** Build a dedicated failure email template now vs. defer until email infrastructure is finalized vs. in-app notifications only (no email).

<!-- updated per peter note -->
**Recommendation:** Use WhatsApp notifications (via Taqnyat, same infrastructure as event invitations) for failure alerts — not email. Send a WhatsApp message to the relevant parties with event name, failure date/time, retry count, and next-step instructions (contact support or trigger a manual retry). In-app notification should also fire regardless as a secondary channel.

**Why:** Peter's note overrides Gate-1 #5's "in-app + email" specification: the whole app uses WhatsApp as the primary notification channel. WhatsApp is the channel hosts and admins already monitor. Email adds a separate system to maintain with no benefit given WhatsApp is already established.

**Trade-offs:** Failure notifications depend on Taqnyat uptime — if Taqnyat caused the send failure, WhatsApp notifications to affected parties may also be impacted. The in-app notification fires independently and provides a fallback signal.

peter note: (don't relay on email notification instead use whatsapp notification with what u need to send to users and admins as well, as the whole app is using whatsapp)

**Q5: Host retry button: should host be able to manually trigger retry, or only admins?**

A: **Decided.** Three tiers can trigger manual retry, all from the **single event page** (shared by host, whitelabel admin, and admin):
- **Host**: retry their own event via `POST /events/:id/retry-send`
- **Whitelabel admin**: retry any event in their organization via the same endpoint (org-scoped ownership check)
- **Admin / Super admin**: retry any event via `POST /events/:id/admin/retry-send` (bypasses ownership check)

All three share the same `retryFailed()` service. Idempotency (gate 1 #6) must be implemented before the host and whitelabel endpoints are exposed publicly.

Source: `labbe-backend-/src/modules/messaging/messaging.service.js:278-314`

**Q6: Retry rate limit: if retrying 1000 guests, will Taqnyat rate-limit?**

A:
**Current behavior:** No 429 handling exists in `retryFailed()` or `sendBulk()` at `labbe-backend-/src/modules/messaging/messaging.service.js:278-314`. When Taqnyat returns a rate-limit response, the guest is marked failed and `failedCount` increments.

**Assessment:** WEAK

**Why:** A large retry batch (1000+ guests) will likely hit Taqnyat rate limits. Without handling, all rate-limited guests are treated as permanently failed, exhausting retry attempts unfairly.

**Recommended change:** When Taqnyat returns 429, treat it as a transient error: do NOT increment `failedAttempts`, back off for 60 seconds, then retry the batch. This is separate from the broader batching fix in flow 17 Q1.

Source: `labbe-backend-/src/modules/messaging/messaging.service.js:278-314`

**Q7: Guest message content: should retry use same template or a different "second attempt" template?**

A: Same template as the initial send. `retryFailed()` calls `sendBulk()`, which calls `sendToGuest()`, which uses `event.invitationSettings.selectedTemplate` unchanged for every attempt.

Source: `labbe-backend-/src/modules/messaging/messaging.service.js:309-313`

**Q8: Admin dashboard: is there an event detail view to see failure reason and manual retry?**

A: [PETER DECISION]

**The choice:** Build a dedicated admin failure dashboard vs. add failure state information to the existing event detail view.

**Recommendation:** Add failure state to the existing event detail view in the admin dashboard. Show: `failureReason`, `failedCount`, `retryAttempts`, last retry timestamp, and a "Retry Now" button calling the admin retry endpoint.

**Why:** Building a dedicated dashboard for rare failure events adds unnecessary maintenance surface. The existing event detail view is the natural home for this information. Gate 1 #10 requires audit logging, so admin actions on the failure state should be logged there.

**Trade-offs:** The existing event detail view may require significant changes to accommodate the failure state UI cleanly.

**Q9: Idempotency on retry: if host clicks retry twice, sends twice?**

A:
**Current behavior:** No idempotency guard exists. Calling `retryFailed()` twice sends to the same failed guests twice. There is no lock field, no in-progress flag, and no per-call idempotency key on the Taqnyat requests, as confirmed at `labbe-backend-/src/modules/messaging/messaging.service.js:278-314`.

**Assessment:** BUG

**Why:** Gate 1 #6 requires idempotency keys on every external side effect. Double-sends damage the guest experience and waste Taqnyat credits. This is especially critical once a host-facing retry button is added (Q5).

**Recommended change:** Add a lock per event: when `retryFailed()` starts, set `event.retryInProgress = true` and reject concurrent calls with a 409 response. Clear the flag when done. Additionally, add an idempotency key to each Taqnyat call: `hash(eventId + guestId + retryAttemptNumber)`.

Source: `labbe-backend-/src/modules/messaging/messaging.service.js:278-314`

**Q10: Failed event cleanup: if event stays 'failed' indefinitely, should there be archival?**

A: [PETER DECISION]

**The choice:** Let failed events be cleaned up by the existing completion cron (24h after event date → completed) vs. add a dedicated archival policy for permanently failed events.

**Recommendation:** The existing completion cron handles failed events naturally — after the event date passes, the event moves to `'completed'` regardless of send status. No separate archival policy is needed.

**Why:** A failed event is still a valid historical record. `'completed'` status after the event date is semantically correct — the event happened even if invitations failed. Separate archival logic adds complexity without clear operational benefit.

**Trade-offs:** `'completed'` events with failed invitations look identical to successful ones in basic queries. Analytics must distinguish by inspecting `messagingStatus.failedCount` rather than relying on status alone.

---

## State machine

| State | Trigger | Code location | Next state | Notes |
|---|---|---|---|---|
| `live` (stuck) | `sendBulk()` throws in cron | `scheduledTasks.js:160–163` catch block | `live` (unchanged) | Status was already set `live` before send; no revert on failure |
| `live` (stuck) | `retryFailed()` called manually | `messaging.service.js:278` | `live` (unchanged) | No status transition in `retryFailed()` |
| `live` (stuck) | All 3 retry attempts exhausted (`failedAttempts >= 3`) | `messaging.service.js:294–296` | `live` (unchanged — MISSING: should be `failed`) | EVENT_STATUS `'failed'` does not exist; no transition code |
| `failed` (desired) | `failedAttempts >= 3` on all guests | MISSING — not implemented | `failed` → host + admin notified | Requires new status constant + transition logic |
| `failed` (desired) | Host or admin triggers manual retry | POST `/events/:id/retry-send` (MISSING endpoint) | `launching` (re-enters launch flow) | Idempotency guard needed before this is safe |
| `failed` | 24h after `event.eventDetails.date` | `scheduleEventCompletion()` at `scheduledTasks.js:382–400` | `completed` | Completion cron runs regardless of send status — failed events complete naturally |

**Retry state per guest:**

| Guest `invitation.failedAttempts` | `invitation.status` | Action |
|---|---|---|
| 0 / not set | `failed` | First retry: increment to 1, re-call `sendBulk` |
| 1 | `failed` | Second retry: increment to 2, backoff 15 min (MISSING — fires immediately) |
| 2 | `failed` | Third retry: increment to 3, backoff 1h (MISSING — fires immediately) |
| 3 | `failed` | Exhausted: exclude from next `retryFailed()` query; event should mark `failed` (MISSING) |

---

## Data handoffs

| Step | Source | Payload | Destination | Notes |
|---|---|---|---|---|
| Detect failed guests | `retryFailed(eventId)` | `invitation.status: 'failed'`, `failedAttempts < 3` | `Guest.find()` at `messaging.service.js:290–297` | Query excludes guests with `failedAttempts >= 3` — those are silently dropped |
| Increment retry count | `retryFailed()` | `{ $inc: { 'invitation.failedAttempts': 1 } }` | `Guest.updateMany()` at `messaging.service.js:304–307` | Incremented BEFORE resend — if resend crashes, counter is stale |
| Resend dispatch | `retryFailed()` | Guest IDs array | `this.sendBulk({ guestIds, eventId, channel })` at `messaging.service.js:309–313` | No delay; fires immediately regardless of retry number |
| Failure notification (MISSING) | Should trigger on retry exhaustion | `{ eventId, hostId, failedCount, retryAttempts }` | `notificationService.sendToUser()` or `sendToRole('whitelabel_admin')` (if `event.whitelabelId`) + `notificationService.sendToAdmins()` + Taqnyat WhatsApp to all recipients | Not implemented; host and admins never notified; channel is WhatsApp + in-app (not email) per Peter's note |
| Event status transition (MISSING) | Should trigger on retry exhaustion | `event.status = 'failed'` | EventModel + `EVENT_STATUS` constant | Not implemented; constant `'failed'` missing from `status.js:31–40` |
| Manual retry endpoint (MISSING) | POST `/events/:id/retry-send` | `{ channel }` | `retryFailed(eventId, channel, userId)` | Endpoint does not exist; host has no UI mechanism to trigger retry |

---

## Role variations

| Role | Interaction with failure flow | Notes |
|---|---|---|
| HOST | Should see "failed" UI banner on event page; should be able to trigger manual retry; receives WhatsApp + in-app failure notification for non-whitelabel events only (whitelabel hosts are not notified directly — notification routes to whitelabel admin per Peter's note) | Currently: no notification, no failure UI, no retry button |
| WHITELABEL_ADMIN | Should be able to retry events in their org; should receive WhatsApp + in-app failure notification when event's `whitelabelId` matches (hosts under a whitelabel may have no direct platform access, so whitelabel admin is the primary failure recipient) | Same retry endpoint (org ownership check); not implemented; `notificationService.sendToAdmins()` does not include `whitelabel_admin` role — no failure notification sent to whitelabel admin (verified at `notificationService.js:321–333`) |
| ADMIN / SUPER_ADMIN | Should receive in-app + email alert on event failure; can trigger manual retry bypassing ownership | No alert implemented; no admin retry endpoint |
| SYSTEM / CRON | Responsible for automatic retry scheduling | No automatic retry cron exists; `retryFailed()` is never called automatically |

---

## Web ↔ mobile parity

| Feature | Web (`labbe-`) | Mobile (`halla-mobile`) | Gap? |
|---|---|---|---|
| Failure state UI on event page | Not implemented — no `failed` status renders | Not implemented — no `failed` status renders | No gap — both missing; root cause is missing `failed` status constant |
| Retry button for host | Not implemented — no POST `/events/:id/retry-send` endpoint | Not implemented | No gap — both missing the endpoint |
| Retry countdown / "retrying in X min" | Not implemented | Not implemented | No gap — both missing; backoff not implemented in backend |
| Admin failure alert (in-app) | Not implemented | Not implemented | No gap — notification type and template missing from backend |
| Admin failure alert (WhatsApp + in-app) | Not implemented | Not implemented | No gap — WhatsApp failure notification not implemented in backend; email alert no longer target channel per Peter's note |

---

## Edge cases & failure modes

- **429 rate limit from Taqnyat during retry**: `retryFailed()` calls `sendBulk()` which does not handle HTTP 429 responses specially. A rate-limited guest is treated as a permanent delivery failure and `failedAttempts` is incremented. After 3 rate-limit responses (not genuine delivery failures), the guest is permanently excluded from retries. Host loses quota for a guest that was never actually unreachable — just temporarily throttled.

- **Counter incremented before resend**: `retryFailed()` increments `failedAttempts` at line 304 before calling `sendBulk()` at line 309. If `sendBulk()` throws before it attempts the send, the guest's attempt count is inflated. After 3 `sendBulk` crashes (not delivery failures), the guest is silently dropped from retry scope.

- **Concurrent `retryFailed()` calls**: No lock or in-progress flag exists. Two simultaneous calls (e.g., host clicks retry twice, or admin and host trigger at same time) will both query the same set of failed guests, both increment their `failedAttempts`, and both call `sendBulk`. Guest receives duplicate messages. `failedAttempts` increments by 2 per double-call.

- **Retry after event date**: `retryFailed()` has no guard on event date. If `scheduleEventCompletion` transitions the event to `completed` while a retry is in progress, the retry continues to send invitations for an already-completed event. Guests receive a "you're invited" message to an event that already happened.

- **Host never notified of initial failure**: The cron's catch block at `scheduledTasks.js:160–163` only calls `console.error`. The host checks their event page and sees it is `live` — no indication that zero guests were messaged. The problem is invisible until guests report not receiving invitations.

---

## Findings

### FLOW-15-F01
- **ID**: FLOW-15-F01
- **Severity**: Critical
- **Type**: MISSING
- **Location**: `labbe-backend-/src/shared/constants/status.js:31–40` and `labbe-backend-/src/shared/utils/scheduledTasks.js:160–163`
- **Description**: `EVENT_STATUS` has no `'failed'` value. When all guests exhaust 3 retry attempts, no code transitions the event to a failure state. The event stays `live` indefinitely with zero delivered invitations. The host sees a live event; the backend has no record that the launch failed. Peter's intent (Gate-1 #5): exhausted retries → `'failed'` status → notify host + admins; code reality: no transition, no notification, no status change.
- **Recommendation**: Add `failed: 'failed'` to `EVENT_STATUS` in `status.js`. In `retryFailed()`, after the `sendBulk` call, query for guests where `failedAttempts >= 3` — if all guests are exhausted, set `event.status = 'failed'` and trigger host + admin notifications. Design as recoverable: `'failed'` → `'launching'` on manual retry, back to `'failed'` if retry also exhausts.

### FLOW-15-F02
- **ID**: FLOW-15-F02
- **Severity**: Critical
- **Type**: MISSING
- **Location**: `labbe-backend-/src/modules/messaging/messaging.service.js:278–314`
- **Description**: `retryFailed()` is never called automatically. No cron job exists to detect events with failed sends and schedule retries. The method is callable only by external trigger (none exists for hosts) or manual invocation. Gate-1 #5 specifies a 24-hour retry window with backoff intervals (5m → 15m → 1h); current code implements none of this. Peter's intent: system automatically retries at defined intervals; code reality: retries never happen unless manually invoked by a developer.
- **Recommendation**: Add a cron job `scheduleFailedSendRetry` that runs every 5 minutes, queries events with `status: 'launching'` and `messagingStatus.failedCount > 0`, checks `lastRetryAt` to determine which backoff interval applies, and calls `retryFailed()` for eligible events. Backoff schedule: attempt 1 at +5m, attempt 2 at +15m, attempt 3 at +1h.

### FLOW-15-F03
- **ID**: FLOW-15-F03
- **Severity**: High
- **Type**: BUG
- **Location**: `labbe-backend-/src/modules/messaging/messaging.service.js:309–313`
- **Description**: `retryFailed()` calls `sendBulk()` immediately with no delay regardless of which retry attempt number it is. Even if a cron were added to schedule retries, the actual send would fire instantly upon invocation. The backoff window (5m/15m/1h) is only achievable if the caller waits the appropriate interval before calling `retryFailed()` — but the method itself provides no delay mechanism. Additionally, `failedAttempts` is incremented at line 304 before `sendBulk` at line 309: a crash in `sendBulk` inflates the counter and can prematurely exhaust retries.
- **Recommendation**: Move `failedAttempts` increment to after a successful or definitively failed send (not a crash). The retry cron (FLOW-15-F02 recommendation) is responsible for enforcing timing; `retryFailed()` should accept a `dryRun` flag to distinguish "scheduled attempt" from "immediate manual override."

### FLOW-15-F04
- **ID**: FLOW-15-F04
- **Severity**: High
- **Type**: BUG
- **Location**: `labbe-backend-/src/modules/messaging/messaging.service.js:278–314`
- **Description**: No idempotency guard exists on `retryFailed()`. Two concurrent calls (host double-click, race between cron and manual retry) query the same failed guests, both increment `failedAttempts`, and both dispatch `sendBulk`. Guests receive duplicate messages and `failedAttempts` advances by 2 per double-call, exhausting retries in 1–2 double-calls instead of 3. Gate-1 #6 requires idempotency on all external side effects; this method has none.
- **Recommendation**: Add a per-event in-progress flag: when `retryFailed()` starts, atomically `$set: { retryInProgress: true }` on the event (or a dedicated `RetryLock` document). If the flag is already set, return 409 immediately. Clear the flag when done. This prevents concurrent execution. Separately, add idempotency keys per guest per attempt (same recommendation as FLOW-14-F04).

<!-- updated per peter note -->
### FLOW-15-F05
- **ID**: FLOW-15-F05
- **Severity**: High
- **Type**: MISSING
- **Location**: `labbe-backend-/src/shared/utils/notificationService.js` and `labbe-backend-/src/infrastructure/taqnyat.js`
- **Description**: No notification is sent to the host, whitelabel admins, platform admins, or super-admins when an event's invitation send fails. The cron catch block (`scheduledTasks.js:161`) calls `console.error` only. Peter's notes update two aspects of the notification requirement: (1) channel must be WhatsApp (not email) — the whole app uses WhatsApp as the primary channel (Q4 note); (2) routing must be whitelabel-aware — if `event.whitelabelId` is set, the host may have no direct platform access so notification should go to the whitelabel admin rather than the host directly (divergence #6 note). Verified: `notificationService.sendToAdmins()` at `notificationService.js:321–333` only sends to `super_admin` and `admin` roles — `whitelabel_admin` is excluded.
- **Recommendation**: Implement an `event_launch_failed` notification type in `notificationService.js`. On send exhaustion: (1) If `event.whitelabelId` is set — skip direct host notification; call `sendToRole('whitelabel_admin', notificationData, event.whitelabelId)` for in-app, and send a WhatsApp message to the whitelabel admin via Taqnyat. (2) If no `whitelabelId` — call `sendToUser(hostId, 'event_launch_failed', ...)` for in-app, and send a WhatsApp message to the host via Taqnyat. (3) Always call `sendToAdmins('event_launch_failed', ...)` for platform admins and super-admins, plus send WhatsApp to them. Do NOT send email — use WhatsApp as the primary notification channel per Peter's note.

### FLOW-15-F06
- **ID**: FLOW-15-F06
- **Severity**: Medium
- **Type**: BUG
- **Location**: `labbe-backend-/src/modules/messaging/messaging.service.js:290–297`
- **Description**: When Taqnyat returns an HTTP 429 (rate limit exceeded) response, `sendBulk()` treats it as a permanent delivery failure — `guest.invitation.status` is set to `'failed'` and `failedAttempts` increments. After 3 rate-limit responses (which are transient, not permanent), the guest is excluded from all future retries. A large retry batch (1000+ guests) will likely hit Taqnyat rate limits, causing large-scale permanent exclusion of guests who were never actually unreachable. Hosts lose invitation coverage for guests who simply hit a throttle window.
- **Recommendation**: In `sendBulk()`, detect HTTP 429 responses and treat them differently from permanent failures: do NOT increment `failedAttempts`, do NOT set `invitation.status = 'failed'`. Instead, mark those guests with a `invitation.rateLimited = true` flag and back off for 60 seconds before retrying the throttled subset. This is separate from the main retry backoff (FLOW-15-F02).

---

## Cross-flow notes

- **Flow 14 (Event Launch Happy)**: FLOW-15-F01 and FLOW-15-F02 are the direct failure successors to FLOW-14-F01. The `'launching'` status recommended in FLOW-14-F01 is the anchor state that allows Flow 15's retry cron to identify events needing retry without confusing them with successfully-live events.
- **Flow 13 (Event Update)**: Guest tombstones (FLOW-13-F02 recommendation) improve Flow 15 — `retryFailed()` queries `invitation.status='failed'` guests, but hard-deleted guests are invisible. If a guest was removed between send and retry, their failed record is gone and the retry scope is silently incomplete.
- **Flow 12 (Quota Enforcement)**: Retried sends do not re-debit quota. `consumeInvites` was called at event creation (flow 12); retry is a re-attempt of already-allocated quota. This is correct behavior — no quota change needed for FLOW-15 retries.
- **Flow 17 (Bulk Dispatch)**: FLOW-15-F06 (429 handling) is the same gap as the rate-limit issue in flow 17's bulk dispatch Q&A. Both `sendBulk` (initial send) and `retryFailed` (retry send) share the same service method and the same missing 429 handler. Fixing `sendBulk` once fixes both flows.

---

## Post-Phase-3 surgical updates

- **Updated Q4 answer** based on peter note in Q4 (use WhatsApp not email for failure notifications): updated recommendation from "build email template" to "use WhatsApp via Taqnyat as the notification channel." Source: peter note in Q4 + confirmed no email path exists in `notificationService.js`. State machine: not affected. Data handoffs: updated failure notification row channel. Parity table: updated "Admin failure alert" row.
- **Updated FLOW-15-F05** based on peter notes in divergence #6 (whitelabel routing) and Q4 (WhatsApp channel): added whitelabel-aware notification routing (if `event.whitelabelId` → notify whitelabel admin instead of host directly), changed channel from email to WhatsApp, updated Location from `email.js` to `taqnyat.js`. Source: `notificationService.js:321–333` confirms `sendToAdmins()` excludes `whitelabel_admin`.
- **Updated Role Variations** (HOST and WHITELABEL_ADMIN rows) based on peter note in divergence #6: added whitelabel routing context for who receives failure notifications. not affected: state machine, findings F01–F04, F06.
- **Peter note in divergence #7 acknowledged but no change.** Note states guests should not be notified of retries (retry silently). Phase 3 already documents guests are not notified — downstream sections are accurate.
- **Cross-flow:** No propagation needed to flows 16–21 from these changes.
