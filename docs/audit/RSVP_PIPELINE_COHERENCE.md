# RSVP Pipeline Coherence Audit

Traces the end-to-end guest invitation lifecycle from event creation through bulk dispatch, WhatsApp RSVP, check-in, and post-event content delivery. Identifies cross-flow state inconsistencies, broken handoffs, and Gate-1 violations that span more than one flow.

Finding ID prefix: `PIPELINE-FNN`

---

## Pipeline Stages

```
[EVENT CREATION] ──────────────────────────────────────────────────────────
Flow 11: Host creates event (POST /events/create)
  ↓ consumeInvites() called BEFORE Event.save() — no rollback on save failure
  ↓ injectWhitelabel sets whitelabelId
  ↓ createGuestsFromList() — no phone dedup at creation time
  ↓ Event saved with status = 'draft'

[EVENT UPDATE] ─────────────────────────────────────────────────────────────
Flow 13: Host updates event details, guest list, invitation settings, launch config
  ↓ updateGuestList() has dedup (only on update, not creation)
  ↓ No 24-hour lock before scheduled launch time

[QUOTA ENFORCEMENT] ────────────────────────────────────────────────────────
Flow 12: validateLimits() called at event creation
  ↓ addon extraGuests always 0 (FLOW-12-F02) — addon purchases never count
  ↓ Pool debit happens before Event.save() (same as consumeInvites gap)

[SCHEDULED LAUNCH] ─────────────────────────────────────────────────────────
Flow 14: scheduleEventLaunch cron fires (server local time — timezone bug)
  ↓ Event.status set to 'live' BEFORE sendBulk() completes ← PIPELINE-F01
  ↓ sendBulk() dispatches Taqnyat calls (sequential 100ms loop — Gate-1 #8 violation)
  ↓ If sendBulk throws, status='live' is already committed — no rollback

[BULK DISPATCH] ────────────────────────────────────────────────────────────
Flow 17: sendBulkMessages() iterates guests
  ↓ Sequential per-guest 100ms delay — does not scale to 200+ guests
  ↓ No idempotency keys on Taqnyat calls — network retry = duplicate WhatsApp

[WEBHOOK RECEIPT] ──────────────────────────────────────────────────────────
Flow 18: POST /messaging/webhook receives WhatsApp status/reply
  ↓ HMAC verification fails open (env var unset = skip verification) ← PIPELINE-F02
  ↓ Duplicate webhook fires host notification twice (FLOW-18-F02)

[GUEST RSVP] ───────────────────────────────────────────────────────────────
Flow 19: Guest taps RSVP button in WhatsApp message
  ↓ submitRSVP() — no idempotency guard (FLOW-19-F02) — double-tap = double-update
  ↓ No plus-ones via WhatsApp (FLOW-19-F01) — can only add at event creation

[CHECK-IN] ─────────────────────────────────────────────────────────────────
Flow 20: Staff scans guest QR at gate
  ↓ StaffAccessToken authenticates scanner — no revocation endpoint (FLOW-20-F01)
  ↓ No check-in idempotency guard (FLOW-20-F03) — rapid double-scan marks twice

[POST-EVENT CONTENT] ───────────────────────────────────────────────────────
Flow 21: Host publishes post-event content (photos, thank-you message)
  ↓ sendBulkAccessEmails() — sequential 100ms loop again (FLOW-21-F01, Gate-1 #8)
  ↓ GuestAccessToken never expires (FLOW-21-F03 — requireApproval is dead code)

[STATS] ────────────────────────────────────────────────────────────────────
Flow 22: Host views event analytics dashboard
  ↓ 0.15 SAR hardcoded magic number for cost calc (FLOW-22-F02)
  ↓ No server-side caching of stats (Peter said 5-minute cache — not implemented)
```

---

## Critical Path Gaps

### PIPELINE-F01 — Event marked 'live' before invitation dispatch completes; no rollback on send failure
- **Severity**: Critical
- **Type**: BUG (Gate-1 #11 violation)
- **Location**: `labbe-backend-/src/shared/utils/scheduledTasks.js:141` (status flip before sendBulk)
- **Description**: `scheduleEventLaunch` sets `event.status = 'live'` and saves to MongoDB before calling `sendBulk()`. If `sendBulk()` fails (Taqnyat unreachable, quota exhausted), the event is stuck in 'live' state with no invitations sent. Guests receive no WhatsApp message but the system believes the event is live.
- **Gate-1 ref**: Decision #11 — send first, set status after confirmation.
- **Cross-flow impact**: Flow 11 (event creation), Flow 17 (bulk dispatch), Flow 15 (failure recovery — but no 'failed' status exists either).
- **Fix**: Await `sendBulk()` completion before updating status. On send failure, set `event.status = 'failed'` (requires FLOW-15-F01 to add the status).

### PIPELINE-F02 — HMAC webhook verification fails open; unauthenticated webhook payloads accepted
- **Severity**: Critical
- **Type**: Security (Gate-1 #7 violation)
- **Location**: `labbe-backend-/src/modules/messaging/messaging.controller.js:133-134`
- **Description**: `if (process.env.WHATSAPP_APP_SECRET && signature)` — both conditions must be truthy. If `WHATSAPP_APP_SECRET` is unset (staging/new deploy) OR the signature header is absent, the full HMAC check is bypassed. Any unauthenticated HTTP POST to `/messaging/webhook` with a crafted payload can inject fake RSVP responses or status updates.
- **Gate-1 ref**: Decision #7 — HMAC verification must fail closed.
- **Cross-flow impact**: Flow 18 (webhook), Flow 19 (RSVP processing), Flow 22 (stats — fake RSVPs inflate attendance counts).
- **Fix**: Change condition to `if (!process.env.WHATSAPP_APP_SECRET || !signature || !verifyHmac(signature, body)) { return res.status(401).json(...) }`. Fail closed by default.

### PIPELINE-F03 — consumeInvites() debits pool before Event.save(); no rollback on partial failure
- **Severity**: High
- **Type**: BUG
- **Location**: `labbe-backend-/src/modules/events/events.service.js:343` (consumeInvites before save)
- **Description**: `createEvent()` calls `consumeInvites()` to decrement `subscription.invitePool` at line 343, then calls `Event.save()` at a later line. If `Event.save()` fails (validation error, MongoDB write conflict), the pool has already been debited. The host loses quota without gaining an event.
- **Cross-flow impact**: Flow 11 (event creation), Flow 12 (quota enforcement — pool goes negative on retry without compensation), Flow 09 (subscription lifecycle — pool drift).
- **Fix**: Wrap in a MongoDB transaction or move `consumeInvites()` to after `Event.save()` succeeds. If transactions are unavailable, add a compensating `returnInvites()` call in the catch block.

### PIPELINE-F04 — No 'failed' event status; launch failures leave events in undefined state
- **Severity**: Critical
- **Type**: MISSING
- **Location**: `labbe-backend-/models/EventModel.js` (status enum missing 'failed'), `labbe-backend-/src/shared/utils/scheduledTasks.js`
- **Description**: When a scheduled launch fails (Taqnyat error, quota exceeded), there is no `'failed'` status to set. The event either remains `'draft'` (if status was never flipped) or gets stuck at `'live'` (if PIPELINE-F01 order is followed). The host has no indication the launch failed, and no retry mechanism is triggered automatically.
- **Cross-flow impact**: Flow 14 (launch), Flow 15 (failure recovery), Flow 22 (stats — failed events counted in analytics).
- **Fix**: Add `'failed'` to the EventModel status enum. In the catch block of `scheduleEventLaunch`, set `event.status = 'failed'` and notify the host. Add a `retryFailed()` cron that auto-retries up to 3 times (Gate-2 decision: 5m/15m/1h).

### PIPELINE-F05 — Timezone bug in launch cron; events scheduled in non-server timezone never fire correctly
- **Severity**: Critical
- **Type**: BUG
- **Location**: `labbe-backend-/src/shared/utils/scheduledTasks.js:99-104`
- **Description**: `scheduleEventLaunch` extracts hour/minute from the event's `scheduledTime` using `getHours()` / `getMinutes()` (server local time). If the server runs UTC and the event is scheduled for 9:00 AM Riyadh time (UTC+3), the cron fires at 6:00 AM UTC — 3 hours early. All events in Saudi Arabia are affected.
- **Cross-flow impact**: Flow 14 (launch timing), Flow 15 (if event fires at wrong time and fails), Flow 17 (bulk dispatch fires early).
- **Fix**: Extract hour/minute using a timezone-aware library (e.g., `date-fns-tz` with `'Asia/Riyadh'`). Alternatively, store `scheduledTime` as a UTC Unix timestamp and compare directly against `Date.now()` in the cron.

---

## Handoff Verification Table

| Pipeline Handoff | Producer | Consumer | Field Transferred | Status |
|-----------------|----------|----------|-------------------|--------|
| Event created → quota debited | createEvent() | consumeInvites() | subscription.invitePool | BUG: debited before Event.save (PIPELINE-F03) |
| Event draft → launch scheduled | createEvent() | scheduleEventLaunch cron | event.scheduledTime | BUG: timezone mismatch (PIPELINE-F05) |
| Launch fires → status set | scheduleEventLaunch | EventModel | event.status = 'live' | BUG: set before sendBulk (PIPELINE-F01) |
| Status 'live' → sendBulk | scheduleEventLaunch | sendBulkMessages() | event.guests[].phone | ISSUE: sequential 100ms loop |
| sendBulk → Taqnyat | sendBulkMessages() | taqnyat.sendMessage() | WhatsApp template + phone | No idempotency key |
| Taqnyat delivery → webhook | Taqnyat platform | POST /messaging/webhook | delivery status payload | BUG: HMAC fails open (PIPELINE-F02) |
| Webhook → RSVP update | messaging.controller.js | submitRSVP() / updateDeliveryStatus() | guestId + rsvpStatus | No idempotency (FLOW-19-F02) |
| RSVP updated → host notification | messaging.service.js | notifications.service.sendToUser() | rsvp event data | Duplicate on webhook re-fire (FLOW-18-F02) |
| Event live → check-in open | EventModel.status='live' | StaffAccessToken authentication | event gates open | No staff token revocation (FLOW-20-F01) |
| Check-in → post-event | EventModel.status='completed' | post-event content publish | host triggers manually | No auto-transition on event end |
| Post-event → access emails | postEvent.sendBulkAccessEmails() | Taqnyat/email | GuestAccessToken URL | BUG: sequential 100ms loop again (FLOW-21-F01) |

---

## Cross-Flow Dependency Map

```
Flow 09 (Subscription) ──→ Flow 12 (Quota) ──→ Flow 11 (Event Creation)
         ↓                                              ↓
Flow 10 (Addon) ──→ Flow 12 quota augmentation        Flow 13 (Event Update)
                    (currently broken: FLOW-12-F02)            ↓
                                                      Flow 14 (Launch Happy Path)
                                                               ↓
                                                      Flow 15 (Launch Failure)
                                                               ↓
                                                      Flow 17 (Bulk Dispatch)
                                                               ↓
                                                      Flow 18 (Webhook)
                                                               ↓
                                                      Flow 19 (Guest RSVP)
                                                               ↓
                                                      Flow 16 (Test Message) [optional]
                                                               ↓
                                                      Flow 20 (Gate Scanner)
                                                               ↓
                                                      Flow 21 (Post-Event Content)
                                                               ↓
                                                      Flow 22 (Stats/Visibility)
```

---

## Gate-1 Compliance Summary (pipeline scope)

| Decision | Requirement | Status |
|----------|-------------|--------|
| #3 — Moyasar stub | Payment stub before subscription/addon creation | Partially done (subscription); addon missing (FLOW-10-F01) |
| #6 — Idempotency | Idempotency keys on all external effects | MISSING on: Taqnyat send (FLOW-14-F04), RSVP (FLOW-19-F02), notifications (FLOW-27-F01) |
| #7 — HMAC | Webhook verification must fail closed | FAILING OPEN — see PIPELINE-F02 |
| #8 — Batched sends | No sequential per-item loops for >10 recipients | VIOLATING on: sendBulkMessages (FLOW-17), sendBulkAccessEmails (FLOW-21-F01) |
| #11 — Send-then-live | Set status='live' only after dispatch confirms | VIOLATING — see PIPELINE-F01 |
