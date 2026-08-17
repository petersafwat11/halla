# 14 — event-launch-happy

## One-paragraph description
Happy path: Host schedules launch time via launchSettings → cron fires every minute → matches events by date/time → sends WhatsApp/SMS to all guests → event marks status live. Per design: remove Taqnyat native path, send invites first, mark status "invitations sent" (not live yet), event goes live on event date.

## Scope tags
Cron scheduling, bulk messaging, status transitions, delivery tracking.

## Roles involved
Host, System/Cron, Backend.

## Entry points
- `labbe-backend-/src/modules/events/events.routes.js:476-480` PATCH `/events/:id/launch-settings`
- `labbe-backend-/src/modules/events/events.service.js:1034-1047` updateLaunchSettings()
- `labbe-backend-/src/shared/utils/scheduledTasks.js:96-170` scheduleEventLaunch() cron
- `labbe-backend-/src/modules/messaging/messaging.service.js:215-270` sendBulk()
- `labbe-backend-/src/shared/utils/scheduledTasks.js:382-400` scheduleEventCompletion() cron

## Exit / terminal states
- draft → scheduled (host sets launch time)
- scheduled → live (cron fires, invitations sent)
- live → completed (24h after event date)
- messagingStatus counters: bulkSendStarted, sentCount, failedCount

## Touched modules
- `labbe-backend-/src/shared/utils/scheduledTasks.js` scheduleEventLaunch/scheduleEventCompletion
- `labbe-backend-/src/modules/messaging/messaging.service.js` sendBulk
- `labbe-backend-/src/modules/events/events.service.js` updateLaunchSettings
- `labbe-backend-/src/infrastructure/taqnyat.js` API transport
- `models/EventModel.js` launchSettings, messagingStatus
- Mobile: launch UI screen (TBD)
- Web: launch scheduler and stats view

## Dependencies
- Depends on: Flow 10 (event-create), Flow 13 (event-update)
- Depended on by: Flow 15 (failure/retry), Flow 17 (bulk-dispatch)

## Known divergences
1. Code marks event 'live' BEFORE sending invitations (line 141). If send fails, event stuck live. Design: send first, mark "invitations sent," then go live on event date.
2. Taqnyat native scheduledDatetime path still exists (lines 151-155) but should be removed per design.
3. Event goes live on schedule time, not event date. Spec: should go live on event date.
4. No dedicated stats endpoint visible; how does host fetch real-time sent/failed counts?

## Open questions

**Q1: No INVITATIONS_SENT status in EVENT_STATUS constants. Add new status or repurpose SCHEDULED?**

A:
**Current behavior:** `EVENT_STATUS` contains: `draft`, `pending_review`, `scheduled`, `live`, `published`, `cancelled`, `completed`, `archived` (`labbe-backend-/src/shared/constants/status.js:31-40`). Status transitions directly `scheduled → live` at cron fire time (`labbe-backend-/src/shared/utils/scheduledTasks.js:141`), before sends complete. No intermediate status exists.

**Assessment:** CONFLICTS-WITH-GATE-1-DECISION

**Why:** Gate 1 #11 says events must become `live` only after bulk send confirms success. The current design makes it impossible to distinguish "invitations are being sent" from "invitations successfully delivered." An intermediate status is required by the decided design.

**Recommended change:** Add `'launching'` to `EVENT_STATUS`. Cron transitions: `scheduled → launching` (atomic, used as idempotency lock) → after `sendBulk` confirms → `'invitations_sent'` (or proceed directly to `live` if going to the live-on-event-date design). Add `'failed'` for exhausted retry (see flow 15).

Source: `labbe-backend-/src/shared/constants/status.js:31-40` and `labbe-backend-/src/shared/utils/scheduledTasks.js:141`

**Q2: Failed sends: does event revert to scheduled or stay live?**

A:
**Current behavior:** Status is set to `'live'` at line 141 before `sendBulk` is called (`labbe-backend-/src/shared/utils/scheduledTasks.js:141-142`). On send failure the error is logged at line 161 but the event remains `live` with partial or zero deliveries. No revert logic exists.

**Assessment:** CONFLICTS-WITH-GATE-1-DECISION

**Why:** Gate 1 #5 defines a specific failure flow: 24-hour retry, then mark `'failed'`, notify host+admin+super admin. Gate 1 #11 says mark live only after send confirms success. Current code violates both.

**Recommended change:** Move the `status = 'live'` assignment to after `sendBulk` completes successfully. On failure: leave status as `'launching'` (or set to a new `'failed_send'` state), trigger the retry flow (flow 15), and notify the host. Only transition to `live` when send succeeds or a later retry succeeds.

Source: `labbe-backend-/src/shared/utils/scheduledTasks.js:141-163`

**Q3: Idempotency: if cron fires twice, does it send twice?**

A:
**Current behavior:** Under normal operation (no crash), the status flip to `'live'` before send prevents a second cron tick from re-matching because the query filters on `status: "scheduled"` (`labbe-backend-/src/shared/utils/scheduledTasks.js:113-119`). However, a crash between the status flip at line 141 and send completion leaves the event stuck `live` with no messages sent and no retry path. Gate 1 #6 requires idempotency keys on all external side effects; none are passed to Taqnyat.

**Assessment:** BUG

**Why:** A crash mid-send leaves the event marked `'live'` with no messages sent and no recovery path — the `scheduled` filter will never match again. Additionally, gate 1 #6 requires idempotency keys on WhatsApp/SMS sends and current code passes none to Taqnyat.

**Recommended change:** (1) Use an atomic `launching` intermediate status as a crash recovery anchor so a restarted process can detect and retry. (2) Add `idempotency_key = hash(eventId + guestId + sendWindow)` to every Taqnyat call so a retry after crash does not double-send.

Source: `labbe-backend-/src/shared/utils/scheduledTasks.js:113-119,141-143`

**Q4: Timezone handling in scheduleEventCompletion (line 385): UTC or local?**

A:
**Current behavior:** `scheduleEventLaunch` compares `now.getHours()` and `now.getMinutes()` (server local timezone) against `launchSettings.scheduledTime` (`labbe-backend-/src/shared/utils/scheduledTasks.js:99-104`). `scheduleEventCompletion` uses UTC-safe millisecond arithmetic (`Date.now() - 24 * 60 * 60 * 1000`) (`labbe-backend-/src/shared/utils/scheduledTasks.js:385`).

**Assessment:** BUG

**Why:** If the backend server is not set to Arabia Standard Time (UTC+3), launch events fire at the wrong wall-clock time for Saudi events. A server in UTC would fire 3 hours early. This is a correctness issue for all Saudi-hosted events.

**Recommended change:** Store `scheduledTime` in UTC or as a full ISO timestamp (not a bare HH:mm string). In the cron, compare against UTC time derived from the event's timezone. Alternatively, store the computed UTC launch timestamp (`launchDateTime`) at the time the host saves launchSettings and match against that.

Source: `labbe-backend-/src/shared/utils/scheduledTasks.js:99-104,382-396`

**Q5: Race: can host update guestList mid-send?**

A:
**Current behavior:** No lock prevents a `PATCH /events/:id/guest-list` call while `sendBulk` iterates (`labbe-backend-/src/shared/utils/scheduledTasks.js:141-164`). Guests added after the status flip to `'live'` but before the send loop reaches them may be missed.

**Assessment:** WEAK

**Why:** The race window is typically small (seconds between status flip and send start). Most hosts will not edit during this window. The fix is the same `'launching'` status guard recommended in Q1 and Q2.

**Recommended change:** Reject `PATCH /events/:id/guest-list` when `event.status === 'launching'`. Return a clear error: "Event is currently sending invitations; guest list is locked until send completes."

Source: `labbe-backend-/src/shared/utils/scheduledTasks.js:141-164`

**Q6: Mobile: date/time picker UI for launch settings?**

A: [PETER DECISION]

**The choice:** Implement a date/time picker in the mobile `CreateEventScreen` Step 5 (and `UpdateEventScreen`) vs. allow only web for scheduling.

**Recommendation:** Implement on mobile. Gate 1 #4 requires mobile parity including the launch settings step.

**Why:** Scheduling is the final action before an event goes live; requiring a web context switch defeats the purpose of mobile event management. Gate 1 #4 explicitly mandates mobile parity for the full 5-step wizard and launch settings.

**Trade-offs:** React Native date/time pickers have platform differences (iOS vs Android UX); need to standardize on a single picker component (e.g., `@react-native-community/datetimepicker`).

---

## State machine

| State | Trigger | Code location | Next state | Notes |
|---|---|---|---|---|
| `draft` | Host completes Step 5 and saves launch settings | `updateLaunchSettings()` at `events.service.js:1034` | `scheduled` | Status transition happens here (implicit — `launchSettings` saved, cron will now match) |
| `scheduled` | Cron fires every minute; `getHours()/getMinutes()` matches `launchSettings.scheduledTime` | `scheduleEventLaunch()` at `scheduledTasks.js:96–120` | `live` (immediate, before send) | BUG: status set to `live` at line 141 BEFORE `sendBulk` is called |
| `scheduled` | Cron fires; event has zero guests | `scheduledTasks.js:133–137` | `scheduled` (stays, skipped) | Zero-guest events are skipped silently with no notification to host |
| `live` | `event.status = "live"` set at line 141 | `scheduledTasks.js:141–142` | `live` | Event is publicly live before any guest has received an invitation |
| `live` | `sendBulk()` completes successfully | `scheduledTasks.js:157–158` | `live` (unchanged) | Desired: should transition to `invitations_sent` then `live` on event date |
| `live` | `sendBulk()` throws | `scheduledTasks.js:160–163` catch block | `live` (stays — no revert) | BUG: status stays `live` with failed sends and no retry triggered |
| `live` | 24 hours after `event.eventDetails.date` | `scheduleEventCompletion()` at `scheduledTasks.js:382–400` | `completed` | Completion cron uses UTC-safe millisecond arithmetic (correct) |

**Gate-1 #11 violation summary:** Desired flow is `scheduled → launching` (atomic) → `invitations_sent` → `live` (on event date). Current code: `scheduled → live` (before send) → silent failure if send fails.

```
[desired]
  scheduled
     │ cron fires (atomic $set launching)
     ▼
  launching ──── sendBulk fails ──────► (retry / failed — Flow 15)
     │
     │ sendBulk succeeds
     ▼
  invitations_sent
     │ event date arrives
     ▼
  live
     │ 24h after event date
     ▼
  completed

[current code]
  scheduled
     │ cron fires: status = 'live' IMMEDIATELY (line 141)
     ▼
  live ──── sendBulk fails ──► live (stuck, no retry, no notification)
     │
     │ sendBulk succeeds
     ▼
  live (same state — no distinction between "sent" and "not sent")
     │ 24h after event date
     ▼
  completed
```

---

## Data handoffs

| Step | Source | Payload | Destination | Notes |
|---|---|---|---|---|
| Set launch settings | Host (Step 5 web, UpdateEventScreen mobile) | `{ scheduledDate: "YYYY-MM-DD", scheduledTime: "HH:mm", timezone }` | `updateLaunchSettings()` → `event.launchSettings` on EventModel | Stored as bare HH:mm string — timezone applied only as label, not offset |
| Cron time comparison | `scheduleEventLaunch` cron | `now.getHours()`, `now.getMinutes()` vs `launchSettings.scheduledTime` | Event query filter at `scheduledTasks.js:113–119` | BUG: uses server local time, not timezone-aware UTC conversion |
| Taqnyat native path check | `event.launchSettings.taqnyatDeleteId` | If set and channel=sms: skip `sendBulk` | Logs "SMS managed by Taqnyat" and continues | Old path: Taqnyat handles delivery natively; new path: `sendBulk` handles. Both may coexist |
| Bulk send dispatch | `messagingService.sendBulk({ guestIds, eventId, channel })` | Guest IDs array from `event.guestList` | `messaging.service.js:215–270` | No idempotency key passed per Gate-1 #6 |
| Status update | `event.status = "live"` | Write to EventModel | `await event.save()` at `scheduledTasks.js:142` | Happens before send — race condition anchor |
| Completion check | `scheduleEventCompletion` cron | `Date.now() - 24h` compared to `event.eventDetails.date` | Event status updated to `completed` | Uses UTC milliseconds (correct, no timezone bug) |

---

## Role variations

| Role | Interacts with launch flow? | How | Notes |
|---|---|---|---|
| HOST | Yes — sets launch settings | PATCH `/events/:id/launch-settings` | Primary actor; receives no notification on launch failure (MISSING) |
| SYSTEM / CRON | Yes — fires the launch | `scheduleEventLaunch()` every minute | No human actor; failures logged to console only |
| WHITELABEL_ADMIN | Indirectly — may set launch settings on behalf of host | Same PATCH endpoint | No ownership bypass; must be event host |
| ADMIN / SUPER_ADMIN | No direct launch interaction | Admin can view event status | No admin-triggered launch mechanism; manual retry endpoint TBD (Flow 15) |
| GUEST | No | Receives invitation message as output of `sendBulk` | Passive recipient |

---

## Web ↔ mobile parity

| Feature | Web (`labbe-`) | Mobile (`halla-mobile`) | Gap? |
|---|---|---|---|
| Launch settings input (date picker) | `Summary.js` reads `scheduleDate`/`scheduleTime` from form state (lines 24–25) but no `<DatePicker>` component found in `Summary.js` — `handleReschedule()` is an empty stub | `EventSummary.js` — no `scheduledDate`/`scheduledTime` inputs confirmed (grep: zero matches); Step 5 missing on mobile | Both platforms missing working schedule input pickers; mobile additionally missing the step entirely |
| Schedule toggle (is scheduled) | `Summary.js` — `isScheduled` toggle button present (renders schedule section when true) | Not confirmed on mobile | Mobile gap: no schedule toggle confirmed |
| Confirmation of launch settings save | Web calls `updateLaunchSettings()` via form submit | `UpdateEventScreen.js:201–204` — confirmed calls `updateLaunchSettings()` when payload present | Update confirmed on mobile; initial create scheduling (Step 5 in create wizard) not confirmed |
| Launch failure notification to host | Not implemented on either platform | Not implemented | No gap — both missing; backend does not send failure notification (Flow 15) |
| "Event is launching" status indicator | Not implemented | Not implemented | No gap — `launching` status does not exist yet |

---

## Edge cases & failure modes

- **Cron fires on server restart**: If the server was down and restarts at 10:05 while a `scheduled` event was due at 10:00, the cron will not retroactively fire for that minute. The event stays `scheduled` indefinitely. No catch-up logic exists.

- **Crash between status flip and sendBulk**: If the Node.js process crashes after `event.status = "live"` is saved (line 141) but before `sendBulk` completes, the event is permanently `live` with no invitations sent and no recovery path (the `scheduled` query filter will never match again).

- **Taqnyat native path coexistence**: Lines 151–155 check for `event.launchSettings.taqnyatDeleteId` and skip `sendBulk` if it is set. If a host creates an event via the old Taqnyat-native path, then updates launch settings (which does not cancel the Taqnyat job), the event will receive two sends: one from Taqnyat's native scheduler and one from `sendBulk` if the `taqnyatDeleteId` field is cleared during update.

- **Zero-guest event on launch day**: Event is silently skipped at lines 133–137. Host receives no notification that their event was not launched. Event stays `scheduled` until manually updated or date passes.

- **Server timezone mismatch**: If server runs UTC, a `scheduledTime: "10:00"` for a Saudi host (UTC+3) fires at 10:00 UTC = 13:00 KSA. Invitations reach guests 3 hours late (or early, depending on direction). No error is thrown.

---

## Findings

### FLOW-14-F01
- **ID**: FLOW-14-F01
- **Severity**: Critical
- **Type**: BUG
- **Location**: `labbe-backend-/src/shared/utils/scheduledTasks.js:141–163`
- **Description**: `scheduleEventLaunch()` sets `event.status = "live"` at line 141 and saves before calling `sendBulk()`. If `sendBulk` fails, the event remains permanently `live` with no invitations sent, no retry triggered, and no host notification. The `scheduled` cron query (line 113–119) filters on `status: "scheduled"`, so the failed event is invisible to all future cron ticks. Peter's intent (Gate-1 #11): events go live only after invitation send is confirmed; code reality: events go live before any send attempt.
- **Recommendation**: Replace the pre-send status flip with an atomic `findOneAndUpdate({ status: 'scheduled' }, { $set: { status: 'launching' } })` to claim the event and serve as an idempotency anchor. On `sendBulk` success, transition to `invitations_sent`. On failure, leave status as `launching` and trigger the retry flow (Flow 15). Transition to `live` only on event date.

### FLOW-14-F02
- **ID**: FLOW-14-F02
- **Severity**: High
- **Type**: BUG
- **Location**: `labbe-backend-/src/shared/utils/scheduledTasks.js:99–104`
- **Description**: The cron compares `now.getHours()` and `now.getMinutes()` (server local time) against the bare `HH:mm` string stored in `launchSettings.scheduledTime`. If the backend server runs in UTC (or any timezone other than Arabia Standard Time UTC+3), events fire at the wrong wall-clock time. For a Saudi host who schedules 10:00 KSA, the cron fires at 10:00 UTC = 13:00 KSA — 3 hours late.
- **Recommendation**: Store `launchSettings.scheduledDateTime` as a full UTC ISO timestamp computed when the host saves launch settings. In the cron, compare `launchSettings.scheduledDateTime <= now` rather than matching hour/minute strings. This is timezone-safe regardless of server location.

### FLOW-14-F03
- **ID**: FLOW-14-F03
- **Severity**: High
- **Type**: BUG
- **Location**: `labbe-backend-/src/shared/utils/scheduledTasks.js:151–155`
- **Description**: Lines 151–155 contain the legacy Taqnyat native `scheduledDatetime` path: if `event.launchSettings.taqnyatDeleteId` is set and the channel is `sms`, the cron skips `sendBulk` under the assumption that Taqnyat will handle delivery natively. This path is supposed to be removed per design. It coexists with the application-level `sendBulk` path. If `updateLaunchSettings()` clears `taqnyatDeleteId` without cancelling the Taqnyat job (see FLOW-13-F03), both paths fire and guests receive duplicate messages.
- **Recommendation**: Remove the `taqnyatDeleteId` branch from `scheduleEventLaunch` entirely (per design decision to own the send lifecycle in application code). Ensure `updateLaunchSettings()` cancels existing Taqnyat jobs via the delete API before removing `taqnyatDeleteId` from the event document.

### FLOW-14-F04
- **ID**: FLOW-14-F04
- **Severity**: High
- **Type**: BUG
- **Location**: `labbe-backend-/src/modules/messaging/messaging.service.js:215–270` (sendBulk) and `labbe-backend-/src/shared/utils/scheduledTasks.js:157`
- **Description**: No idempotency key is passed to Taqnyat for any message in `sendBulk`. Gate-1 #6 requires idempotency keys on all external side effects. If the cron crashes after some (but not all) guests are messaged and then restarts, a second pass will re-send to all guests (or no guests, depending on recovery state). There is no per-guest send receipt tied to a specific launch attempt.
- **Recommendation**: Generate an idempotency key per guest per send attempt: `hash(eventId + guestId + launchAttemptNumber)`. Pass it as the `idempotencyKey` field in the Taqnyat request. If Taqnyat returns a duplicate-key response, treat as success (message was already delivered). Store the key on the Guest document so retries use the same key for the same attempt number.

### FLOW-14-F05
- **ID**: FLOW-14-F05
- **Severity**: Medium
- **Type**: MISSING
- **Location**: `halla-mobile/components/createEvent/EventSummary.js` and `labbe/app/[lang]/host/create-event/_components/summary/Summary.js`
- **Description**: Neither web nor mobile has a functioning schedule date/time input on the event creation summary step. Web `Summary.js` reads `scheduleDate`/`scheduleTime` from form state but `handleReschedule()` is an empty stub function. Mobile `EventSummary.js` has no `scheduledDate`/`scheduledTime` fields at all. Gate-1 #4 requires mobile parity for the full 5-step wizard including launch settings. A host cannot schedule a launch time without either a working web picker or a mobile implementation.
- **Recommendation**: Implement the schedule date/time picker on both platforms. Web: wire `handleReschedule()` in `Summary.js` to call `updateLaunchSettings()`. Mobile: add a date/time picker component to `EventSummary.js` (or a new Step 5 component) using `@react-native-community/datetimepicker` or equivalent.

---

## Cross-flow notes

- **Flow 13 (Event Update)**: FLOW-14-F03 (Taqnyat double-send) is the same root as FLOW-13-F03. `updateLaunchSettings()` not cancelling the Taqnyat job is a prerequisite bug that amplifies the duplicate-send risk in the launch flow.
- **Flow 15 (Event Launch Failure)**: FLOW-14-F01 (no recovery path on send failure) is the direct entry point for Flow 15. The `'launching'` status recommended in FLOW-14-F01 is also the mechanism Flow 15 uses to detect events needing retry.
- **Flow 12 (Quota Enforcement)**: No quota is re-checked at launch time. Quota is consumed at event creation (Flow 11/12). A host who cancels their subscription between event creation and launch time will still have their event launched — no active-subscription check in the cron.
- **Flow 17 (Bulk Dispatch)**: `sendBulk` invoked at line 157 is the same service method flow 17 covers in detail. Batching, rate limiting, and delivery tracking are shared concerns. FLOW-14-F04 (no idempotency key) is also a flow 17 finding.
