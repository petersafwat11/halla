# 17 — bulk-dispatch

## One-paragraph description
Backend bulk send pipeline: Receive list of guestIds + eventId + channel → look up each guest's phone → call Taqnyat API for each → record per-guest delivery status → aggregate stats. Core dispatch engine used by Flow 14 (event-launch-happy) and Flow 15 (retries). CRITICAL ISSUES: (1) No idempotency key—retry sends duplicate. (2) 100ms per-guest sleep is blocking—scales poorly for 1000+ guest events. (3) Cron race condition: minute-level scheduling but send may take minutes. (4) No rate limiting enforcement per Taqnyat API constraints.

## Scope tags
Message transport, Taqnyat API, per-guest delivery tracking, rate limiting, idempotency.

## Roles involved
System (cron or manual retry), Taqnyat (message delivery), Backend (coordination).

## Entry points
- `labbe-backend-/src/shared/utils/scheduledTasks.js:157` scheduleEventLaunch calls sendBulk
- `labbe-backend-/src/modules/messaging/messaging.service.js:215-270` sendBulk() method
- `labbe-backend-/src/modules/messaging/messaging.service.js:133-205` sendToGuest per-guest loop
- `labbe-backend-/src/infrastructure/taqnyat.js` SMS/WhatsApp API

## Exit / terminal states
- Event.messagingStatus updated: sentCount, failedCount, bulkSendCompletedAt
- Guest.invitation updated per send attempt: sent, method, effectiveChannel, sentAt, messageId, lastError
- Return { success, total, successful, failed, details }

## Touched modules
- `labbe-backend-/src/modules/messaging/messaging.service.js:215-270` sendBulk (core loop at line 246-259)
- `labbe-backend-/src/modules/messaging/messaging.service.js:133-205` sendToGuest (per-guest)
- `labbe-backend-/src/infrastructure/taqnyat.js` API transport
- `models/GuestModel.js` invitation fields
- `models/EventModel.js` messagingStatus
- `labbe-backend-/src/shared/utils/scheduledTasks.js:96-170` cron caller

## Dependencies
- Depends on: Taqnyat API, Guest records with phone
- Depended on by: Flow 14, Flow 15

## CRITICAL FINDINGS

### 1. 100ms per-guest sleep (Line 258)
For 500 guests = 50 seconds. For 1000+ guests = 2+ minutes. Blocks event loop.
**Fix required**: Replace with batched parallel sends + rate cap.

### 2. No idempotency key
If cron fires twice or retry called twice, each guest sent twice.
**Fix required**: Add idempotency_key to Taqnyat request (sha256 of eventId+guestId+timewindow).

### 3. Cron race condition
Cron every 1 minute, send takes minutes. Status set to 'live' before send completes.
**Fix required**: Atomic locking per (eventId, scheduledDate, scheduledTime).

### 4. Rate limiting not enforced
No backoff on Taqnyat 429. Unclear if we respect API rate limits.
**Fix required**: Track msgs/sec, implement per-subscription rate cap (50-200/sec).

### 5. Taqnyat native SMS path still exists (lines 151-155)
Old scheduledDatetime path NOT removed per design spec.
**Fix required**: Remove entirely, migrate existing events to cron.

## Known divergences
- 100ms sleep is fixed, not configurable per plan
- No retry on 429 rate limit errors
- Channel fallback logic unclear (line 182)
- No pre-validation of message content before loop

## Open questions

**Q1: Replace sleep with batching? What concurrency level?**

A:
**Current behavior:** Sequential loop with a fixed 100ms sleep per guest (`labbe-backend-/src/modules/messaging/messaging.service.js:246-259`). For 1000 guests ≈ 100 seconds of blocking the Node.js event loop.

**Assessment:** CONFLICTS-WITH-GATE-1-DECISION

**Why:** Gate 1 #8 explicitly names this as a critical fix and specifies the implementation: batched parallel sends with a per-second rate cap. This is not a product decision — it has already been decided.

**Recommended change:** Replace the sequential loop with a batched-parallel approach: `Promise.allSettled` on batches of N guests (N = Taqnyat's per-second limit, ~50), with a 1-second delay between batches. This is gate 1 #8 committed implementation work, not a product decision.

Source: `labbe-backend-/src/modules/messaging/messaging.service.js:246-259`

**Q2: Idempotency key format and window?**

A:
**Current behavior:** No idempotency key is passed to Taqnyat. A retry sends the same message again to the same guests without any deduplication guard (`labbe-backend-/src/modules/messaging/messaging.service.js:246-259`).

**Assessment:** CONFLICTS-WITH-GATE-1-DECISION

**Why:** Gate 1 #6 requires idempotency keys on every external side effect. For WhatsApp/SMS, every Taqnyat call must include an idempotency key so retries do not double-send.

**Recommended change:** Add `idempotency_key = sha256(eventId + guestId + retryAttemptNumber)` to every Taqnyat call. Use `retryAttemptNumber = 0` for the initial send, `1` for the first retry, etc. This scopes dedup within a single send cycle while allowing re-sends after exhaustion and new event creation.

Source: `labbe-backend-/src/modules/messaging/messaging.service.js:246-259`

**Q3: Rate limit backoff strategy?**

A: [PETER DECISION]

**The choice:** Exponential backoff vs. fixed-interval backoff vs. queue-based (worker processes messages at rate cap).

**Recommendation:** Queue-based with a per-second rate cap enforced by the batching fix (Q1). When Taqnyat returns 429, pause that batch for 1 second and retry — do not mark the guest failed.

**Why:** Exponential backoff is overkill for a rate-limited API with a documented per-second cap. A simple pause-and-retry on 429 is sufficient. The real fix is the batching that prevents hitting the limit in the first place. This also avoids permanently failing guests for a transient rate-limit condition.

**Trade-offs:** Requires Taqnyat's rate limit documentation; if undocumented, start conservative at 50/sec.

**Q4: Rate limits per subscription plan?**

A: [PETER DECISION]

**The choice:** Same rate cap for all plans vs. higher batch concurrency for premium/business plans.

**Recommendation:** Same cap for all plans initially (Taqnyat account-level limit applies regardless of plan). Revisit if premium hosts need priority queue positioning.

**Why:** Taqnyat caps by account, not by request content. Per-plan rate limits do not meaningfully help until there is a multi-queue architecture. Adding per-plan logic now creates complexity without a corresponding benefit.

**Trade-offs:** A basic plan host with 50 guests blocks a business plan host with 5000 guests in the same queue.

**Q5: Timeout/retry on Taqnyat API fail?**

A:
**Current behavior:** Uses SDK/axios default timeout. No custom timeout is set in the messaging service. A failed call returns `success: false` and marks the guest failed with no further retry (`labbe-backend-/src/modules/messaging/messaging.service.js:133-205`).

**Assessment:** WEAK

**Why:** Axios default timeout is 0 (infinite on some versions). A hanging Taqnyat call blocks the entire send loop for one guest and delays all subsequent guests.

**Recommended change:** Set an explicit 10-second timeout on all Taqnyat HTTP calls. On timeout, mark the guest as `failedAttempts++` (not permanently failed) so the retry cron picks it up.

Source: `labbe-backend-/src/modules/messaging/messaging.service.js:133-205`

**Q6: Webhook update race during send loop?**

A: Low-risk. Taqnyat may fire a delivery webhook before the loop finishes, but webhook updates target individual guest records atomically. Bulk stats (`sentCount`, `failedCount`) are written in a single atomic update after the loop completes, so webhook writes and stats writes do not conflict.

Source: `labbe-backend-/src/modules/messaging/messaging.service.js:262-267`

**Q7: Billing for retries?**

A: [PETER DECISION]

**The choice:** Track retry sends as a separate quota counter (retry credits) vs. charge the Taqnyat account with no internal tracking vs. count retries toward a per-event messaging budget.

**Recommendation:** No internal tracking for now. Taqnyat account billing covers all sends. Add a `messagingStatus.retrySentCount` counter per event for audit purposes (gate 1 #10) without blocking retries.

**Why:** Creating a retry quota system requires pricing decisions that are not scoped. The audit log counter satisfies accountability needs without gating functionality. Over-engineering this risks blocking the launch-failure recovery flow (gate 1 #5).

**Trade-offs:** A bad actor who repeatedly triggers retries could run up Taqnyat costs; throttle via the retry endpoint (flow 15 Q5) mitigates this.

**Q8: Phone validation before send?**

A:
**Current behavior:** Phone is used as stored in `Guest.phone` with no normalization in `sendToGuest()`. Normalization only runs in `handleButtonResponse()` (webhook path). Invalid phone formats fail at Taqnyat with a provider error (`labbe-backend-/src/modules/messaging/messaging.service.js:133-205`).

**Assessment:** WEAK

**Why:** Invalid phone formats fail at Taqnyat with a provider error. No guest-level error message distinguishes "invalid phone" from "delivery failed" in the guest record.

**Recommended change:** Normalize phone numbers in `createGuestsFromList()` (at import time) using the existing `normalizePhoneNumber()` utility. Reject guests with unparseable phones at creation, not at send time.

Source: `labbe-backend-/src/modules/messaging/messaging.service.js:133-205`

**Q9: SMS fallback logic?**

A: Handled natively by Taqnyat. For WhatsApp sends, `sendWhatsAppTemplate()` is called with a `smsFallback` parameter (sender + body). If the recipient has no WhatsApp account, Taqnyat sends the SMS fallback and fires a `no_capability` webhook. The webhook controller marks `effectiveChannel = 'sms'` and `smsFallback = true` on the guest record. No code change needed.

Source: `labbe-backend-/src/modules/messaging/messaging.service.js:167-180`, `labbe-backend-/src/modules/messaging/messaging.controller.js:154-167`

**Q10: Admin manual dispatch endpoint?**

A: [PETER DECISION]

**The choice:** Expose `POST /events/:id/admin/retry-send` for admin-triggered dispatch vs. keep retries system-only (cron only).

**Recommendation:** Build the endpoint. Gate 1 #5 failure flow requires admin to be able to manually intervene.

**Why:** The retry cron covers automated recovery, but an admin should be able to force a retry when the cron's retry window has passed and the event is stuck in 'failed'. Without this endpoint, a stuck event requires a direct database intervention.

**Trade-offs:** Exposes a powerful endpoint that, without idempotency (gate 1 #6), double-sends. Must implement idempotency (Q2) first.

Source: `labbe-backend-/src/modules/messaging/messaging.service.js:278-314`

## Notes from answer pass

- SMS fallback (Q9) is correctly implemented via Taqnyat native param — no code change needed on the send side. The webhook handler correctly marks `effectiveChannel = 'sms'` on delivery.
- Bulk stats (sentCount/failedCount) are only updated after the full loop completes. A server crash mid-loop leaves event stats at 0 even if many messages were sent.

---

## State machine

```
CRON_FIRES | MANUAL_RETRY → FETCH_EVENT → [not found] → TERMINAL: { success:false, error:'EVENT_NOT_FOUND' }
FETCH_EVENT → [found] → CHECK_OWNERSHIP → [forbidden] → TERMINAL: { success:false, error:'FORBIDDEN' }
CHECK_OWNERSHIP → [ok] → INIT_MESSAGING_STATUS (sentCount=0, pendingCount=N) → FOR_EACH_GUEST_LOOP
FOR_EACH_GUEST_LOOP → sendToGuest(guestId) → [success] → INCREMENT_successful → SLEEP_100MS → NEXT_GUEST
FOR_EACH_GUEST_LOOP → sendToGuest(guestId) → [failure] → INCREMENT_failed → SLEEP_100MS → NEXT_GUEST
FOR_EACH_GUEST_LOOP → [all guests done] → ATOMIC_STATS_UPDATE → TERMINAL: { success:true, total, successful, failed }
```

Retry path: `retryFailed()` at `messaging.service.js:278` queries guests where `invitation.status=failed` and `failedAttempts < 3`, increments `failedAttempts`, then calls `sendBulk()` — re-enters the same loop.

Terminal states: `EVENT_NOT_FOUND`, `FORBIDDEN`, success summary object.

---

## Data handoffs

| Step | Producer | Consumer | Payload | Validation? |
|------|----------|----------|---------|-------------|
| 1 | Cron (`scheduledTasks.js:157`) / manual retry | `messaging.service.js:215` `sendBulk()` | `{ guestIds, eventId, channel, userId }` | None — guestIds array not validated for format or belonging |
| 2 | `sendBulk()` | `sendToGuest()` per iteration | `{ guestId, eventId, channel }` | Ownership check in `sendToGuest:148` |
| 3 | `sendToGuest()` | Taqnyat API | `(phone, templateName, bodyParams, smsFallback)` | No idempotency key; no phone normalization |
| 4 | Taqnyat API | `sendToGuest()` | `{ success, messageId, error }` | None |
| 5 | `sendToGuest()` | MongoDB `Guest` | `{ invitation.sent, invitation.status, invitation.messageId, ... }` | Atomic `findByIdAndUpdate` |
| 6 | `sendBulk()` after loop | MongoDB `Event` | `{ messagingStatus.sentCount, failedCount, bulkSendCompletedAt }` | Single atomic update — lost if crash mid-loop |

---

## Role variations

| ROLE | CAN | CANNOT | NOTES |
|------|-----|--------|-------|
| System (cron) | Trigger `sendBulk` for any event past launch time | None (no ownership check in cron path) | `userId` is null in cron call; ownership check at line 223 skips when `userId` is null |
| Host | Trigger manual retry via API | Trigger bulk for events they don't own | Ownership enforced when `userId` is provided |
| Admin | No dedicated admin-dispatch endpoint exists | Cannot force-dispatch without direct DB operation | Gate-1 #5 manual retry endpoint not yet built |
| Staff | No access | Cannot trigger bulk send | Not part of staff portal |

---

## Web ↔ mobile parity

| Feature | Web | Mobile | Gap? |
|---------|-----|--------|------|
| Manual retry trigger | Yes — retry button exists in event stats page (AdminGuestTable.jsx) | Not found in mobile screens | Gap — mobile has no retry trigger |
| Bulk send progress indicator | No live progress — single page reload shows final state | No live progress | No gap (both absent) |
| Per-guest send status display | Yes — invitation status column in guest table | Not found as a dedicated column in mobile guest list | Gap — mobile does not show per-guest invitation status |

---

## Edge cases & failure modes

- **Sequential 100ms sleep loop** (`messaging.service.js:258`): 1000 guests = ~100 seconds of blocking the Node.js event loop. Gate-1 #8 violation. Current behavior blocks all other HTTP requests during the send window.
- **No idempotency key on Taqnyat calls** (`messaging.service.js:173-180`): if cron fires twice for the same event (race condition) every guest is messaged twice. Gate-1 #6 violation.
- **Stats at 0 on mid-loop crash** (`messaging.service.js:261-267`): `sentCount` and `failedCount` only written after the full loop. A process crash or OOM mid-loop leaves the event with stats frozen at zero even though many messages were sent.
- **Cron race condition** (`scheduledTasks.js:157`): cron runs every minute. If a 1000-guest send takes 100+ seconds, the next cron fires while the first is still running, spawning a second loop for the same event.
- **No Taqnyat 429 backoff**: on a rate-limit error the guest is immediately marked `failed` with no pause and no retry at the batch level.
- **userId=null in cron bypasses ownership check** (`messaging.service.js:222-225`): the ownership guard is inside `if (event.host && userId && ...)`, so a null userId from the cron skips it entirely. This is correct for the cron but means there is no safety net if `userId` is accidentally omitted in other callers.
- **guestIds not validated**: `sendBulk` iterates `guestIds` without checking that each ID belongs to the event. A crafted request with foreign event guest IDs will successfully send messages for those guests.

---

## Findings

### FLOW-17-F01 — Sequential 100ms-sleep loop blocks event loop for large guest lists
- **Severity**: High
- **Type**: CONFLICT
- **Location**: `labbe-backend-/src/modules/messaging/messaging.service.js:258`
- **Description**: `sendBulk()` iterates each guest ID in a sequential `for` loop with `await new Promise(r => setTimeout(r, 100))` between sends. For 1000 guests this holds the Node.js event loop for ~100 seconds.
- **Why it matters**: Gate-1 decision #8 explicitly names this pattern as a violation. During the send window all other HTTP requests are delayed. For events with 500+ guests the HTTP server appears unresponsive to external callers.
- **Recommended change**: Replace the loop with batched-parallel sends using `Promise.allSettled` on groups sized to Taqnyat's documented per-second rate cap, with a 1-second inter-batch delay. Do not sleep inside per-guest sends.
- **Related**: FLOW-21-F01 (same pattern in post-event)

### FLOW-17-F02 — No idempotency key on Taqnyat calls
- **Severity**: High
- **Type**: CONFLICT
- **Location**: `labbe-backend-/src/modules/messaging/messaging.service.js:173`
- **Description**: `sendToGuest()` calls `taqnyat.sendWhatsAppTemplate()` and `taqnyat.sendSMS()` with no idempotency key. If the cron fires twice or a retry is called twice without deduplication, every guest receives duplicate messages.
- **Why it matters**: Gate-1 decision #6 requires idempotency keys on all external side effects. Guests receiving duplicate invitations is a quality defect that damages brand trust and may consume double the Taqnyat messaging budget.
- **Recommended change**: Compute `idempotency_key = hash(eventId + guestId + retryAttemptNumber)` and pass it to every Taqnyat call. Use `retryAttemptNumber = 0` for the initial send and increment for each retry. Gate this with a cron-level distributed lock on `(eventId, launchDate)` to prevent concurrent cron runs.

### FLOW-17-F03 — Bulk messaging stats lost on mid-loop crash
- **Severity**: Medium
- **Type**: BUG
- **Location**: `labbe-backend-/src/modules/messaging/messaging.service.js:261`
- **Description**: `sentCount` and `failedCount` on `EventModel.messagingStatus` are written in a single `findByIdAndUpdate` call only after all guest sends complete. A process crash or OOM error mid-loop leaves the event with `sentCount=0` even if hundreds of messages were already sent.
- **Why it matters**: Hosts and admins see zero messages sent and may trigger a retry that double-sends to guests whose per-guest `invitation.status` already shows `'sent'`. The retry filter (`failedAttempts < 3`) partially mitigates this, but the stats display remains misleading.
- **Recommended change**: Write `$inc` updates to `sentCount` or `failedCount` inside the per-guest loop (after each guest result), rather than accumulating in memory and writing once at the end. This makes stats eventually consistent even after a mid-loop crash.

### FLOW-17-F04 — guestIds array not validated as belonging to the event
- **Severity**: Medium
- **Type**: MISSING
- **Location**: `labbe-backend-/src/modules/messaging/messaging.service.js:246`
- **Description**: `sendBulk()` iterates the `guestIds` array and calls `sendToGuest` for each ID without verifying that the guest belongs to the specified event. The ownership check inside `sendToGuest` (line 148) only checks `event.host === userId`, not `guest.event === eventId`.
- **Why it matters**: A caller who constructs a `guestIds` list containing IDs from a different event will successfully send invitations to those guests under the wrong event's template and host identity.
- **Recommended change**: Before the send loop, query `Guest.find({ _id: { $in: guestIds }, event: eventId })` and use only the confirmed set of matching guest IDs. Reject or skip IDs that do not belong to the event.

---

## Cross-flow notes

- Flow 15 (event-launch-failure) depends on the `retryFailed()` path here. The 3-retry cap (`failedAttempts < 3`) is correct per Gate-2 decisions.
- Flow 18 (messaging-webhook) will fire delivery callbacks for each sent message; these updates are atomic per-guest and do not conflict with the bulk stats write, but if stats are written before all webhooks arrive the counts will be slightly under-reported temporarily.
- The `sendBulkAccessEmails()` function in flow 21 (post-event-content) contains an identical sequential loop with 100ms sleep (`post-event.service.js:409`) — same Gate-1 #8 violation, same fix applies.
