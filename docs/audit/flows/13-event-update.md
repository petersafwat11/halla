# 13 — event-update

## One-paragraph description
After an event is created (in draft status), the host can edit it through update endpoints and mobile UI screens. Certain fields lock after the event reaches specific statuses (e.g., cannot change date within 24 hours of launch, cannot edit after completion) or by business rule. Update operations check ownership, validate the new state, and persist changes without invalidating already-sent invitations unless guest list changes dramatically.

## Scope tags
Event lifecycle, field-level access control, status-dependent locking, subscription limit checks on guest list expansion, mobile support.

## Roles involved
Host (primary editor), Admin/Super-admin (via admin update endpoints), Moderator.

## Entry points (cite file:line)

### Web/Backend routes:
- `labbe-backend-/src/modules/events/events.routes.js:332-336` — PATCH `/events/:id/event-details`
- `labbe-backend-/src/modules/events/events.routes.js:370-376` — PATCH `/events/:id/guest-list`
- `labbe-backend-/src/modules/events/events.routes.js:413-417` — PATCH `/events/:id/staff-list`
- `labbe-backend-/src/modules/events/events.routes.js:444-449` — PATCH `/events/:id/invitation-settings`
- `labbe-backend-/src/modules/events/events.routes.js:476-480` — PATCH `/events/:id/launch-settings`

### Controller handlers:
- `labbe-backend-/src/modules/events/events.controller.js:192-199` — `updateEventDetails`
- `labbe-backend-/src/modules/events/events.controller.js:205-212` — `updateGuestList`
- `labbe-backend-/src/modules/events/events.controller.js:218-225` — `updateStaffList`
- `labbe-backend-/src/modules/events/events.controller.js:231-251` — `updateInvitationSettings`
- `labbe-backend-/src/modules/events/events.controller.js:257-264` — `updateLaunchSettings`

### Service layer:
- `labbe-backend-/src/modules/events/events.service.js:863-876` — `updateEventDetails()`
- `labbe-backend-/src/modules/events/events.service.js:885-964` — `updateGuestList()`
- `labbe-backend-/src/modules/events/events.service.js:973-988` — `updateStaffList()`
- `labbe-backend-/src/modules/events/events.service.js:998-1025` — `updateInvitationSettings()`
- `labbe-backend-/src/modules/events/events.service.js:1034-1047` — `updateLaunchSettings()`

### Mobile screens:
- `halla-mobile/screens/host/UpdateEventScreen.js` — React Native UI for editing event

## Exit / terminal states

### Per-status field editability:
- **draft**: All fields editable (eventDetails, guestList, invitationSettings, launchSettings, staffList)
- **scheduled**: eventDetails.date/time locked; guest list allows add/remove but tracks changes; invitation settings still editable; launch settings locked
- **live**: All fields locked except status transitions (e.g., cancel)
- **completed**: All fields locked; no edits allowed
- **cancelled**: All fields locked; no edits allowed

### Validation checks:
- Ownership: Event must belong to authenticated user (or admin override)
- Status gating: Reject updates if event in terminal state (completed, cancelled)
- Guest limit: New guest count must not exceed subscription plan limits; subscription capacity check on guest list expansion
- Template validation: If updating visualTemplate, validate template data against template schema

### Outcomes:
- Success: Event document updated atomically; returns updated event snapshot
- Failure (validation): Return 400 with field-specific error message
- Failure (ownership): Return 403 Forbidden
- Failure (not found): Return 404
- Failure (subscription limit): Return 403 with package limit details

## Touched modules (file paths by repo)

### labbe-backend-
- `src/modules/events/events.routes.js` — route definitions
- `src/modules/events/events.controller.js` — HTTP handlers
- `src/modules/events/events.service.js` — business logic
- `src/modules/events/templateDataValidator.js` — template data schema validation
- `src/shared/middleware/subscription.js` — `checkGuestLimit` middleware on guest-list PATCH
- `src/shared/middleware/validation.js` — `validateObjectId` middleware
- `src/shared/utils/fileUpload.js` — handles template image upload on invitation-settings update
- `src/shared/errors.js` — `NotFoundError`, `ValidationError`, `PackageLimitError`
- `models/EventModel.js` — Event schema, markModified() calls
- `models/GuestModel.js` — Guest updates when guest list changed
- `models/SubscriptionModel.js` — subscription capacity checks

### halla-mobile
- `screens/host/UpdateEventScreen.js` — Mobile UI for host edits

### labbe (web)
- Event detail page component (specific file TBD) — form for editing event details, guest list, launch settings

## Dependencies on other flows

**Depends on:**
- Flow 10 (event-create) — event must exist first
- Flow 14 (event-launch-happy) — cannot edit launchSettings after scheduled time passes (enforced by cron)
- Subscription system — guest list updates trigger capacity checks

**Depended on by:**
- Flow 14 (event-launch-happy) — updated event data used at launch time
- Flow 16 (test-message) — invitation settings update affects test message template

## Known divergences (web ↔ mobile, frontend ↔ backend)

1. **Mobile update screen** (`halla-mobile/screens/host/UpdateEventScreen.js`): Unknown if it calls all 5 PATCH endpoints or groups them. Needs audit to confirm mobile supports invitation settings and launch settings edits.

2. **Web form handling** (`labbe/` component): invitationSettings includes FormData file upload (template image); unclear if React form properly handles multipart/form-data on PATCH with JSON fields. See `events.controller.js:231-251` for Multer parsing logic.

3. **Guest list replacement semantics**: `updateGuestList()` uses O(1) phone-based lookup to preserve existing Guest records (preserves RSVP status, QR code, check-in history). Web and mobile must both understand that guest phone is the key, not position in array.

4. **Template validation on mobile**: `updateInvitationSettings()` validates visualTemplate data against schema. Mobile's implementation unclear—does it validate before upload or rely on server-side errors?

## Open questions

**Q1: 24-hour date lock rule: is it enforced in code?**

A:
**Current behavior:** `updateEventDetails()` blocks modifications only for events with status `completed` or `cancelled` (`labbe-backend-/src/modules/events/events.service.js:868-870`). No check exists for proximity to the scheduled launch time.

**Assessment:** WEAK

**Why:** Hosts can change event date, time, or location hours before launch. Guests who already received invitations will have incorrect details and there is no re-notification mechanism.

**Recommended change:** Add a check in `updateEventDetails()`: if the event is `scheduled` and `scheduledDate` is within 24 hours of now, reject changes to `eventDetails.date`, `time`, and `location` with a clear error. Changing the launch date itself (launchSettings) is already blocked once status transitions.

Source: `labbe-backend-/src/modules/events/events.service.js:863-876`

**Q2: Invitation invalidation on guest list change: does code reset messagingStatus?**

A:
**Current behavior:** `updateGuestList()` preserves RSVP status and QR codes for existing guests; new guests get status `'invited'` (`labbe-backend-/src/modules/events/events.service.js:913,923-931`). Removed guests are hard-deleted (`labbe-backend-/src/modules/events/events.service.js:935-940`). No `messagingStatus` flags are reset on any guest record.

**Assessment:** WEAK

**Why:** A removed guest's `invitation.sent = true` stays on their record until deletion, but they are no longer in the event. Guests added after the original bulk send were never messaged, and there is no clear signal to re-send to only those new guests.

**Recommended change:** When guests are removed, mark them `status = 'removed'` (add to GuestModel status enum) rather than hard-deleting. When guests are added after the event is `scheduled` or `live`, mark them `invitation.pendingResend = true` so a re-send pass can target them without re-sending to all guests.

Source: `labbe-backend-/src/modules/events/events.service.js:885-963`

**Q3: Taqnyat scheduled SMS cancellation: handled on update?**

A:
**Current behavior:** `updateLaunchSettings()` merges new schedule data into the event and saves (`labbe-backend-/src/modules/events/events.service.js:1043-1044`). No Taqnyat API call is made to cancel the previously scheduled SMS stored in `taqnyatDeleteId`.

**Assessment:** BUG

**Why:** If a host changes the launch time, the stale Taqnyat-scheduled SMS still fires at the old time. Guests receive an invitation with the wrong launch context and this is a double-send risk.

**Recommended change:** In `updateLaunchSettings()`, after updating the DB, if `event.taqnyatDeleteId` exists call Taqnyat's cancel/delete endpoint before creating the new scheduled job. Wrap in try/catch so a Taqnyat failure does not block the local update.

Source: `labbe-backend-/src/modules/events/events.service.js:1034-1047`

**Q4: Admin override status lock: can admin update event details independently?**

A: [PETER DECISION]

**The choice:** Allow admin to edit any event field bypassing host ownership and status locks vs. admin only controls status transitions (current behavior).

**Recommendation:** Admin can update any field on any event, bypassing status locks, but the action is tagged `adminOverride: true` in the audit log.

**Why:** Gate 1 #10 — audit log is coming. Admin override is a legitimate operational use case (fix a corrupted field, correct a date). Without it, the only recourse is a direct database operation. Tagging the override in the audit log preserves accountability.

**Trade-offs:** Admin bypasses safety checks such as the 24-hour date lock. This capability requires the audit log to be in place before it is safely usable in production.

**Q5: File upload on mobile: does UpdateEventScreen support image upload?**

A: [PETER DECISION]

**The choice:** Implement multipart image upload in `UpdateEventScreen` (full parity with web) vs. disallow template image changes on mobile and redirect users to web for image changes.

**Recommendation:** Implement mobile file upload. Gate 1 #4 requires mobile parity.

**Why:** Invitation template image is a core part of event identity. Restricting image changes to web forces a context switch mid-event editing workflow, which undermines the purpose of mobile event management. Gate 1 #4 specifically mandates mobile parity.

**Trade-offs:** React Native multipart file upload (`FormData` + `expo-image-picker`) adds complexity to `UpdateEventScreen`; need to handle file size limits and image compression on device.

**Q6: Race condition if cron fires mid-guest-list update?**

A:
**Current behavior:** Cron sets `event.status = 'live'` at line 141 before `sendBulk` completes (`labbe-backend-/src/shared/utils/scheduledTasks.js:141-143`). A concurrent `PATCH /events/:id/guest-list` call can modify the guest list between the status flip and the send loop reaching those guests. No lock is held.

**Assessment:** BUG

**Why:** New guests added after the status flip but before the send loop reaches them are missed. Removed guests may still receive invitations. This is a data integrity issue during event launch.

**Recommended change:** Use an atomic MongoDB `findOneAndUpdate` with `{ status: 'scheduled' }` as the filter and `{ $set: { status: 'launching' } }` (new intermediate status) to claim the event before sending. Reject guest-list updates when event status is `'launching'` or `'live'`. This also serves as the idempotency guard.

Source: `labbe-backend-/src/shared/utils/scheduledTasks.js:141-164`

## Notes from answer pass

- `updateGuestList()` increments `usage.guestsUsed` and `usage.totalGuests` only for **net-new** guests (not for updates to existing). This correctly avoids over-counting.
- The race condition in Q6 is noted in flow 14 and 17 as well — same root cause.

---

## State machine

The event update flow does not introduce new event statuses — it enforces write locks based on the existing `EVENT_STATUS` values. The table below maps each status to its update permissions.

| Event status | `eventDetails` editable? | `guestList` editable? | `invitationSettings` editable? | `launchSettings` editable? | `staffList` editable? |
|---|---|---|---|---|---|
| `draft` | Yes | Yes | Yes | Yes | Yes |
| `pending_review` | Yes | Yes | Yes | Yes | Yes |
| `scheduled` | Yes (no 24h proximity check — MISSING) | Yes (no lock during launch — BUG) | Yes | No (locked at scheduling) | Yes |
| `live` | No (`completed`/`cancelled` check is lax — see below) | No (should be locked) | No | No | No |
| `published` | No | No | No | No | No |
| `completed` | No (explicitly blocked at `events.service.js:868`) | No | No | No | No |
| `cancelled` | No (explicitly blocked at `events.service.js:868`) | No | No | No | No |
| `archived` | No (status not in block list — edit not explicitly blocked, only `completed`/`cancelled` are) | No | No | No | No |

**Key gap:** `live`, `published`, `archived` events are not explicitly listed in the `status` block list at `events.service.js:868`. Only `completed` and `cancelled` are blocked. An event that reaches `live` status can have its `eventDetails` updated via `PATCH /events/:id/event-details` without any server rejection.

---

## Data handoffs

| Operation | Source | Payload | Service call | Notes |
|---|---|---|---|---|
| Update event details | Host submits form (web or mobile) | `{ title, date, time, location, ... }` | `updateEventDetails(eventId, details, userId)` at `events.service.js:863` | Spread-merged: `{ ...event.eventDetails, ...details }` — partial update supported |
| Update guest list | Host edits guest list and saves | `guestList[]` with `{ name, phone, email }` objects | `updateGuestList(eventId, guestList, userId)` at `events.service.js:885` | Phone is dedup key; new guests created; removed guests hard-deleted via `Guest.deleteMany()` |
| Update staff | Host adds/removes staff | `staffList[]` of user IDs | `updateStaffList(eventId, list, userId)` at `events.service.js:973` | Simple array replacement |
| Update invitation settings | Host changes template/language | FormData (may include image file) | `updateInvitationSettings(eventId, settings, userId)` at `events.service.js:998` | Multer handles multipart; template data validated via `templateDataValidator.js` |
| Update launch settings | Host changes scheduled time | `{ scheduledDate, scheduledTime, timezone }` | `updateLaunchSettings(eventId, settings, userId)` at `events.service.js:1034` | BUG: does not cancel stale `taqnyatDeleteId` scheduled SMS |
| Guest limit check | `checkGuestLimit` middleware | `req.body.guestList?.length` | `Subscription.getCapacityForEvent(userId, count)` | Runs before service call; uses `req.subscription` (oldest-subscription bug from flow 12) |

---

## Role variations

| Role | Can update own events? | Can update others' events? | Status lock bypassed? | Notes |
|---|---|---|---|---|
| HOST | Yes | No — `Event.findOne({ host: userId })` enforces ownership | No | Default path; all update methods check `host: userId` |
| WHITELABEL_ADMIN | Via admin routes only | Admin routes allow update by event ID | Partially — admin routes skip host ownership check | No dedicated admin-update service method; status locks in service still apply |
| MODERATOR | No — cannot create or own events | No | No | Not referenced in update service methods |
| ADMIN / SUPER_ADMIN | Via admin routes | Yes, any event | No (status locks in service layer still fire unless admin override implemented) | Gate-1 #10 specifies audit log for on-behalf-of actions — not implemented |

---

## Web ↔ mobile parity

| Feature | Web (`labbe-`) | Mobile (`halla-mobile`) | Gap? |
|---|---|---|---|
| Update event details (title, date, location) | Web event edit form; specific component TBD | `UpdateEventScreen.js` Step 1 — confirmed calls `updateEventDetails()` | Functionally equivalent; both use PATCH `/events/:id/event-details` |
| Update guest list (add/remove) | Web guest list editor; specific component TBD | `UpdateEventScreen.js` Step 2 — confirmed calls `updateGuestList()` | Functionally equivalent |
| Update invitation settings | Web template editor with image upload | `UpdateEventScreen.js` — calls `updateInvitationSettings()`; image upload via `expo-image-picker` not confirmed | Possible gap: mobile image upload implementation unconfirmed; Gate-1 #4 requires parity |
| Update launch settings | Web schedule picker | `UpdateEventScreen.js` — confirmed calls `updateLaunchSettings()` when `payload.launchSettings` present (line 201–204) | Update confirmed on mobile; no date/time picker component confirmed |
| 24-hour proximity lock UI | Not implemented in backend; no frontend warning either | Not implemented | No gap — both missing; backend missing lock is the root issue (FLOW-13-F01) |

---

## Edge cases & failure modes

- **Edit `live` event**: Backend `updateEventDetails()` only blocks `completed` and `cancelled`. A host can submit a PATCH to change date/time/location of a `live` event and it succeeds — guests have already received invitations with the old details and there is no re-notification.

- **Concurrent cron + guest list update**: While the cron is iterating guests during `sendBulk`, a concurrent `PATCH /events/:id/guest-list` can insert new guests (not yet sent to) or remove guests (who may still receive a message). No lock exists. The race window is small but non-zero.

- **Remove guest then re-add same phone**: Guest is hard-deleted at `events.service.js:939`. On re-add, a new Guest document is created with a new QR code and `invitation.sent = false`. Any prior check-in history from the original record is permanently lost.

- **Template image upload failure on PATCH**: `updateInvitationSettings()` handles Multer multipart. If the image upload to storage fails mid-request, the invitation settings (text fields) may still be saved but without the new image, leaving the event in a partially updated state.

- **stale Taqnyat scheduled SMS**: If a host reschedules the launch time, the old `taqnyatDeleteId` job fires at the original time. Guests receive an early invitation before the event is actually launched. No cancel call exists in `updateLaunchSettings()`.

---

## Findings

### FLOW-13-F01
- **ID**: FLOW-13-F01
- **Severity**: Medium
- **Type**: MISSING
- **Location**: `labbe-backend-/src/modules/events/events.service.js:863–876`
- **Description**: `updateEventDetails()` blocks edits only for `completed` and `cancelled` events. No proximity check exists for the 24-hour window before a scheduled launch. A host can change the event date, time, or location minutes before `sendBulk` fires, and guests who received prior communications will have incorrect details. There is no re-notification mechanism.
- **Recommendation**: Add a proximity guard in `updateEventDetails()`: if `event.status === 'scheduled'` and `event.launchSettings.scheduledDate` is within 24 hours of `Date.now()`, reject changes to `eventDetails.date`, `eventDetails.time`, and `eventDetails.location` with a 409 error and a clear message. Admin override can bypass via a separate admin-only endpoint.

### FLOW-13-F02
- **ID**: FLOW-13-F02
- **Severity**: High
- **Type**: BUG
- **Location**: `labbe-backend-/src/modules/events/events.service.js:934–939`
- **Description**: `updateGuestList()` hard-deletes removed guests via `Guest.deleteMany({ _id: { $in: toDeleteIds } })` at line 939. This permanently destroys check-in history, RSVP status, QR code record, and audit trail for those guests. If the same guest is re-added, a new document is created with no connection to prior attendance. Peter's intent (implied by audit requirements in Gate-1 #10): guest removal should be traceable; code reality: the record is gone.
- **Recommendation**: Add a `removed` status to the `GuestModel` status enum. Replace `Guest.deleteMany()` with `Guest.updateMany({ _id: { $in: toDeleteIds } }, { $set: { status: 'removed', removedAt: new Date() } })`. Filter out `removed` guests in downstream queries (guest list display, sendBulk, check-in). This preserves the audit trail and enables later analysis of removal patterns.

### FLOW-13-F03
- **ID**: FLOW-13-F03
- **Severity**: High
- **Type**: BUG
- **Location**: `labbe-backend-/src/modules/events/events.service.js:1034–1047`
- **Description**: `updateLaunchSettings()` updates the event's scheduled date/time in the database but does not cancel the previously registered Taqnyat scheduled SMS (`event.taqnyatDeleteId`). The stale Taqnyat job fires at the original scheduled time regardless of the update. Guests receive an invitation at the wrong time, constituting a double-send risk and delivering incorrect launch context.
- **Recommendation**: In `updateLaunchSettings()`, before saving the updated schedule, check if `event.taqnyatDeleteId` is set and call Taqnyat's cancel/delete API. Wrap in a try/catch so Taqnyat API failure does not block the local DB update, but log the failure for operator visibility.

### FLOW-13-F04
- **ID**: FLOW-13-F04
- **Severity**: Medium
- **Type**: BUG
- **Location**: `labbe-backend-/src/modules/events/events.service.js:863–876` (status block list)
- **Description**: The status block list in `updateEventDetails()` — `['completed', 'cancelled']` — omits `live`, `published`, and `archived`. An event that reaches `live` status can have its `eventDetails` modified via `PATCH /events/:id/event-details`. This means a host can silently change the event name, date, or location after invitations have been sent and guests have responded to the original invitation details.
- **Recommendation**: Extend the block list to `['live', 'published', 'completed', 'cancelled', 'archived']`. Add the `launching` and `invitations_sent` statuses once they are introduced (see FLOW-14-F01). Admin override for live events should be available only via an explicit admin endpoint with audit logging.

### FLOW-13-F05
- **ID**: FLOW-13-F05
- **Severity**: Medium
- **Type**: MISSING
- **Location**: `labbe-backend-/src/shared/utils/scheduledTasks.js:141–164` and `labbe-backend-/src/modules/events/events.routes.js:370–376`
- **Description**: No lock prevents `PATCH /events/:id/guest-list` from executing while the cron's `sendBulk` loop is iterating over guests. During the window between `event.status = 'live'` (line 141) and the completion of `sendBulk`, new guests can be inserted or existing guests deleted. New guests added in this window miss the bulk send with no mechanism to detect or re-send to them. Removed guests may still receive a message because the send loop already loaded them. This is the same root race as FLOW-14-Q5.
- **Recommendation**: Use the `'launching'` intermediate status (recommended in FLOW-14-F01) as a lock. Reject `PATCH /events/:id/guest-list` when `event.status === 'launching'` with a 409 and message: "Event is currently sending invitations; guest list is locked."

---

## Cross-flow notes

- **Flow 11 (Event Creation)**: The hard-delete in FLOW-13-F02 is the update-path version of the no-tombstone issue flagged during creation. Both `createGuestsFromList` and `updateGuestList` lack audit tombstones for removed guests.
- **Flow 12 (Quota Enforcement)**: Guest list updates call `checkGuestLimit` middleware (routes line 374), which uses `req.subscription = subscriptions[0]` — the same oldest-subscription bug as FLOW-12-F01. A host who upgraded their plan may still be quota-blocked on guest list expansion.
- **Flow 14 (Event Launch Happy)**: FLOW-13-F05 (race during send) and FLOW-13-F03 (stale Taqnyat SMS) are directly related to the launch flow. The `'launching'` status guard introduced in flow 14 resolves FLOW-13-F05.
- **Flow 15 (Event Launch Failure)**: Guest tombstone records (FLOW-13-F02 recommendation) would improve retry visibility — the `retryFailed()` method queries `invitation.status='failed'`, but hard-deleted guests are invisible to this query.
- **Flow 10 (Audit Log)**: FLOW-13-F02 and FLOW-13-F04 both generate silent data mutations (permanent guest deletion, live-event field edits) with no audit record. Gate-1 #10 requires all sensitive writes to be logged.
