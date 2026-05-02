# 11 — Event Creation

## Overview
5-step event creation wizard. Web has 5 steps; mobile currently has 4 (missing Step 5: template confirm + final launch settings). Step 1: event basics (title, type, date, time, location). Step 2: guests (manual add + CSV upload). Step 3: category & template/image selection. Step 4: invitation settings (WhatsApp template selection). Step 5 (web only): summary & confirm + schedule invitations. Backend validation includes subscription limit check (event count, guest count), capacity check (pool vs per-event plans), and guest list creation. Frozen guest limit at event creation: plan's maxInvitesPerEvent is baked into event.guestLimit; addons purchased later do NOT retroactively update event limits.

## Scope tags
- 5-step wizard (web) vs 4-step (mobile)
- event basics: title, description, type, date, time, location
- guest list: manual add, CSV upload, bulk paste
- template selection: category, image, WhatsApp template
- invitation settings: send WhatsApp, schedule delays, reminders
- subscription validation: event count limit, guest count limit
- capacity check: pool plan vs per-event plan
- guest limit freezing: locked at event creation
- file upload: template image or custom image

## Roles involved
- HOST: create event for self
- WHITELABEL_ADMIN: create event on behalf of host
- SUPER_ADMIN: create event on behalf of any user
- MODERATOR: cannot create (read-only)

## Entry points
- Mobile event creation: `halla-mobile/screens/CreateEventScreen.js:31–200` (5 steps, form context, validation)
- Mobile Step 1: `halla-mobile/components/createEvent/StepOne.js:80+` (event basics)
- Mobile Step 2: `halla-mobile/components/createEvent/StepTwo.js` (guests + GuestQuotaCounter)
- Mobile Step 3: `halla-mobile/components/createEvent/StepThree.js` (category + template)
- Mobile Step 4: `halla-mobile/components/createEvent/StepFour.js` (invitation settings)
- Mobile Step 5 (missing): EventSummary component exists but Step 5 scaffold may be incomplete
- Mobile quota counter: `halla-mobile/components/createEvent/GuestQuotaCounter.js:9–227` (displays current vs limit with progress bar)
- Backend create event: `labbe-backend-/src/modules/events/events.routes.js:101+` (POST /create with file upload)
- Backend event service: `labbe-backend-/src/modules/events/events.service.js:307–427` (createEvent with validation, capacity check, guest list creation, event freezing)
- Backend event controller: `labbe-backend-/src/modules/events/events.controller.js` (handles route → service)
- Web event creation: `labbe/app/[lang]/host/create-event/page.js` (5-step wizard, totalSteps=5)

## Exit / terminal states
- Event created with status **draft** (not yet scheduled/sent)
- Event status **active** (invitations sent, guests can RSVP)
- Event status **completed** (event date passed, check-in closed)
- Event status **cancelled** (host or admin cancelled)
- Event status **deleted** (soft-delete, not shown in lists)
- Frozen guest limit baked into event.guestLimit (cannot be retroactively increased by addon purchase)

## Touched modules (by repo)
### labbe-backend-
- `src/modules/events/events.routes.js:101+` (POST /create with file upload middleware)
- `src/modules/events/events.controller.js` (create event handler: context extraction, service call, response)
- `src/modules/events/events.service.js:307–427` (createEvent: subscription validation, capacity check, file handling, guest creation, usage increment, event freezing, notification)
- `models/EventModel.js` (schema: host, subscriptionId, planId, guestLimit, eventDetails, invitationSettings, status, staffList, guestList)
- `models/GuestModel.js` (guest schema + bulk create)
- `models/SubscriptionModel.js` (getCapacityForEvent, consumeInvites static methods)
- `src/shared/middleware/subscription.js` (checkEventLimit, checkGuestLimit middlewares—verify still used)
- `src/modules/subscriptions/subscriptions.service.js:41–88` (validateEventCreation: check event count, guest count, return allowed + limits)
- `src/modules/subscriptions/subscriptions.service.js:91–106` (countEventsInBillingPeriod: dynamic event count for billing period)
- `src/shared/constants/plans.js:89–91` (isPoolPlan, isPerEventPlan helpers)

### labbe-
- `app/[lang]/host/create-event/page.js` (5-step wizard, case 1–5, totalSteps=5)
- `app/[lang]/host/create-event/_components/stepOne/StepOne.js` (event basics with DatePicker, TimePicker)
- `app/[lang]/host/create-event/_components/stepTwo/StepTwo.js` (guest list + CSV upload)
- `app/[lang]/host/create-event/_components/stepThree/StepThree.js` (template selection)
- `app/[lang]/host/create-event/_components/stepFour/StepFour.js` (invitation settings)
- `app/[lang]/host/create-event/_components/summary/Summary.js` (summary display; reads scheduleDate/scheduleTime from form state but has no picker inputs)
- `hooks/events/useEventForm.js:38-39,76-77` (scheduleDate/scheduleTime default to empty strings)

### halla-mobile-
- `screens/CreateEventScreen.js:31–200` (main controller, form state, step validation, submission)
- `components/createEvent/StepOne.js:80+` (basics)
- `components/createEvent/StepTwo.js` (guests + GuestQuotaCounter; XLSX import present)
- `components/createEvent/StepThree.js` (category + template)
- `components/createEvent/StepFour.js` (invitation settings)
- `components/createEvent/EventSummary.js` (summary—display-only; no schedule inputs)
- `components/createEvent/GuestQuotaCounter.js:9–227` (quota display)
- `services/EventsService.js` (transformFormDataToPayload, validateStepData, getDefaultFormValues)

## Dependencies on other flows
- **09 (Subscription Lifecycle)**: host must have active subscription to create event
- **10 (Addon Purchase)**: addons increase quota for NEW events only; existing event limits frozen
- **12 (Quota Enforcement)**: backend validates guest count against subscription + addon quota before event creation

## Known divergences (web ↔ mobile, frontend ↔ backend)
- **Step 5 on mobile**: missing—web has summary + schedule, mobile may need to be added
- **File upload**: web and mobile may handle multipart/form-data differently (S3 vs local)
- **CSV parsing**: guest list import present on both web and mobile (xlsxUtils.js used by both)
- **Form validation**: web and mobile may validate differently per step
- **Subscription check**: web may pre-check before form; mobile checks via useSubscriptionInfo hook

## Open questions

**Q1: Frozen guest limit design: should addons purchased AFTER event creation increase its limit?**

A: [PETER DECISION]

**The choice:** Keep the current frozen-at-creation behavior (pool plans get `guestLimit = -1`; per-event plans bake in `plan.limits.maxInvitesPerEvent` at creation time) vs. allow addon purchase to retroactively raise `guestLimit` on already-created events.

**Recommendation:** Keep frozen. Per-event plan limits should be locked at creation as the billing anchor. Pool plans already have unlimited per-event capacity (`guestLimit = -1`), so addons increase the subscription-wide pool and apply to future events naturally.

**Why:** Allowing retroactive raises creates a loophole: a host creates a 10-guest event to hold a calendar slot, then purchases addons to expand that event's limit post-creation. Freezing the limit at creation preserves quota integrity and makes billing audits straightforward. Gate 1 decisions confirm addons increase quota for new events only.

**Trade-offs:** Hosts who buy addons after event creation cannot apply them to that event; they must create a new event to benefit from the expanded quota.

**Q2: Event status workflow: is draft → active automatic or manual?**

A: Manual trigger. Events are created with status `'draft'` (EventModel default). The host transitions the event to `'scheduled'` by calling `PATCH /events/:id/launch-settings` with `scheduledDate` and `scheduledTime`. A cron job (`scheduleEventLaunch`, running every minute) matches scheduled events by date+time and calls `sendBulk` to dispatch invitations, after which the event transitions to `'live'`. There is no automatic promotion from draft.

Source: `labbe-backend-/src/shared/utils/scheduledTasks.js:96-170`

**Q3: Template image: stored in event or just URL reference?**

A: Stored as a URL string in `event.invitationSettings.templateImage`. The file itself is uploaded to S3 (resolved via `file.location`) or local storage (resolved via `file.path`/`file.filename`); only the resolved URL string is persisted on the event document.

Source: `labbe-backend-/src/modules/events/events.service.js:356-366`

**Q4: Guest duplicate check: should CSV upload deduplicate or reject duplicates?**

A:
**Current behavior:** `updateGuestList()` deduplicates by normalized phone number using an O(1) Map (`existingByPhone`) — duplicate phones in the incoming list are silently kept as the existing guest record. `createGuestsFromList()` at initial event creation performs no within-batch deduplication; it calls `Guest.create(docs)` directly without normalizing or de-duping the input array, so a CSV with duplicate phone numbers at creation time will either create duplicate guest documents or fail with a MongoDB unique-index constraint error.

**Assessment:** WEAK

**Why:** Silent deduplication exists on update but not on creation. A host who uploads a CSV with accidental duplicate phone numbers at creation time receives a raw DB error rather than a clean user-facing message explaining how many duplicates were removed.

**Recommended change:** Normalize and deduplicate phone numbers inside `createGuestsFromList()` before calling `Guest.create()`. Return a structured warning count of duplicates removed rather than propagating a raw database constraint error to the client.

Source: `labbe-backend-/src/modules/events/events.service.js:79-95` (createGuestsFromList), `labbe-backend-/src/modules/events/events.service.js:898-912` (updateGuestList deduplication)

**Q5: WhatsApp template sync: pre-synced or fetched on demand?**

A: Fetched on demand from the Taqnyat API. `getApprovedTemplates()` calls Taqnyat's `getTemplates()` endpoint at request time and filters results to `status === 'APPROVED'`. There is no local cache, scheduled sync, or pre-populated template store. Hosts see the live list from Taqnyat at event creation time.

Source: `labbe-backend-/src/modules/messaging/messaging.service.js:727-749`

**Q6: Moderator assignment: when are moderators added?**

A: Post-creation, via a separate PATCH endpoint. Staff assignment is not part of any event creation step. The host calls `PATCH /events/:id/staff-list` at any time after the event is created to assign or update staff.
(peter note: it maybe in step2 in create event plaese check that we have a tap for moderator i guess but not sure)
Source: `labbe-backend-/src/modules/events/events.routes.js:413-417`

**Q7: Invitation scheduling: can invitations be scheduled or sent immediately?**

A: Scheduled for a future date/time only. `launchSettings.scheduledDate` and `scheduledTime` are required inputs. The cron job `scheduleEventLaunch` (runs every minute) matches events whose scheduled date+time has arrived and calls `sendBulk`. There is no "send now" immediate-dispatch path — the host must always set a schedule time.

Source: `labbe-backend-/src/shared/utils/scheduledTasks.js:96-170`

**Q8: Step 5 on mobile: is the scaffold complete?**

A:
**Current behavior:** Mobile has 5 steps; the navigation gate uses `currentStep < 5` (`CreateEventScreen.js:82`) and Step 5 renders `<EventSummary />` (`CreateEventScreen.js:199-200`). However, `EventSummary.js` is display-only — it contains no `scheduledDate`/`scheduledTime` inputs, no `launchSettings` form fields, and no schedule CTA. Mobile submits without scheduling; web's Step 5 includes the schedule + confirm step.

**Assessment:** CONFLICTS-WITH-GATE-1-DECISION

**Why:** Gate 1 #4 requires mobile to reach full parity with the 5-step wizard including the summary and schedule step. Gate 1 #11 (send-then-mark-live) depends on `launchSettings.scheduledDate`/`scheduledTime` being present at submission; without them, the event cannot be scheduled and invitations will never be dispatched by the cron job.

**Recommended change:** Add `scheduledDate`, `scheduledTime`, and any reminder fields to `EventSummary.js` as form inputs wired to the `launchSettings` form context. Include a final submit CTA that displays all selections from Steps 1–4 before confirming creation. Ensure the payload passed to `EventsService.transformFormDataToPayload` includes the populated `launchSettings` object.

Source: `halla-mobile/screens/CreateEventScreen.js:82` (step gate), `halla-mobile/screens/CreateEventScreen.js:199-200` (Step 5 render), `halla-mobile/components/createEvent/EventSummary.js` (no schedule inputs present)

**Q9: Event creation on behalf: how does web/mobile distinguish self-create vs admin-on-behalf?**

A:
**Current behavior:** `createdBy.onBehalfOf` is hardcoded `false` in `createEvent()` for all callers. The `createdFor.isSelf` field is also always set to `true`. Admin on-behalf creation is not implemented — the service never sets `onBehalfOf = true` regardless of the caller's role.

**Assessment:** WEAK

**Why:** The `onBehalfOf` field exists in the schema indicating the intent was there, but the service never activates it. This means admin actions are indistinguishable from host actions in the `createdBy` audit record, violating Gate 1 #10 (audit log must distinguish on-behalf-of actions).

**Recommended change:** Accept `onBehalfOf` and `targetUserId` fields in the create event request body. When an admin (WHITELABEL_ADMIN or SUPER_ADMIN) calls with `onBehalfOf: true`, set `createdBy.onBehalfOf = true`, `createdBy.adminId = req.user._id`, and `createdFor.user = targetUserId`. Gate the logic behind role check so hosts cannot spoof it.

Source: `labbe-backend-/src/modules/events/events.service.js:370-381`

**Q10: Subscription attachment: should event link to subscription for billing purposes?**

A: Yes, always attached when a subscription exists. `createEvent()` sets `eventData.subscriptionId = subscription._id` and `eventData.planId = subscription.planId._id` unconditionally before persisting the event document.

Source: `labbe-backend-/src/modules/events/events.service.js:383-386`

## Unreachable or incomplete flows
- Event status **draft**: unclear if events start as draft or active immediately
- Step 5 on mobile: missing or incomplete—verify if scaffold exists in EventSummary.js
- Staff assignment: unclear if UI scaffold exists for assigning staff in Step 4

---

## State machine

Event entity statuses defined in `labbe-backend-/src/shared/constants/status.js:31-40`:

| Status | Constant | Defined? | Transitions to |
|---|---|---|---|
| `draft` | `EVENT_STATUS.DRAFT` | Yes | `scheduled` (via PATCH /launch-settings) |
| `pending_review` | `EVENT_STATUS.PENDING_REVIEW` | Yes | Not used in any current transition |
| `scheduled` | `EVENT_STATUS.SCHEDULED` | Yes | `live` (cron fires) |
| `live` | `EVENT_STATUS.LIVE` | Yes | `completed` (24h after event date) |
| `published` | `EVENT_STATUS.PUBLISHED` | Yes | Not used in any current transition |
| `cancelled` | `EVENT_STATUS.CANCELLED` | Yes | Terminal |
| `completed` | `EVENT_STATUS.COMPLETED` | Yes | Terminal |
| `archived` | `EVENT_STATUS.ARCHIVED` | Yes | Terminal (soft) |
| `launching` | — | **Missing** | Required by Gate-1 #11 as atomic cron anchor |
| `invitations_sent` | — | **Missing** | Required by Gate-1 #11 after sendBulk success |
| `failed` | — | **Missing** | Required by Gate-1 #5 after retry exhaustion |

```
(none) → createEvent() → draft
draft → updateLaunchSettings(scheduledDate/time) → scheduled
scheduled → cron(scheduleEventLaunch) → live  [GATE-1 VIOLATION: should be → launching → invitations_sent → live on event.date]
live → scheduleEventCompletion cron (24h after event.eventDetails.date) → completed
live|scheduled → cancel() → cancelled
any → soft-delete → deleted
```

---

## Data handoffs

| Form Step | Form Field | POST /events/create Payload Key | Backend `createEvent()` Field | DB Persisted? | Notes |
|---|---|---|---|---|---|
| Step 1 | eventName | `eventDetails.title` | `eventData.eventDetails.title` | Yes | Required |
| Step 1 | eventType | `eventDetails.type` | `eventData.eventDetails.type` | Yes | |
| Step 1 | eventDate | `eventDetails.date` | `eventData.eventDetails.date` | Yes | |
| Step 1 | eventTime | `eventDetails.time` | `eventData.eventDetails.time` | Yes | |
| Step 1 | address | `eventDetails.location` | `eventData.eventDetails.location` | Yes | Object with lat/lng |
| Step 2 | guestList | `guestList` (array `{name, phone}`) | `guestList` arg to `createGuestsFromList()` | Yes via GuestModel | phone required, no dedup on creation |
| Step 3 | templateImage (file) | multipart `file` field | resolved to URL via `getFileUrl(file)` | Yes as URL string | S3 or local path |
| Step 4 | selectedTemplate | `invitationSettings.selectedTemplate` | `eventData.invitationSettings.selectedTemplate` | Yes | Taqnyat template object |
| Step 5 (web) | scheduleDate | `launchSettings.scheduledDate` | not set at creation — requires separate PATCH | No at creation | Set via PATCH /launch-settings |
| Step 5 (mobile) | — | — | — | No | **Missing**: mobile EventSummary.js has no schedule inputs; launchSettings never populated on mobile create |

**Guest list shape required:** `{ name: string, phone: string }` — phone is the dedup key in `updateGuestList()` but not in `createGuestsFromList()`.

**launchSettings shape required:** `{ scheduledDate: ISODateString, scheduledTime: "HH:mm" }` — mobile never sends this at creation.

---

## Role variations

| Role | Can Create | Notes |
|---|---|---|
| HOST | Yes | Creates for self; `createdBy.onBehalfOf = false` always |
| WHITELABEL_ADMIN | Yes | Can create events in their organization; `onBehalfOf` intended but hardcoded false (`events.service.js:373`) |
| SUPER_ADMIN | Yes | Can create on behalf of any user; `onBehalfOf` intended but hardcoded false |
| MODERATOR | No | Read-only role; blocked at route level |

Note: SUPER_ADMIN and WHITELABEL_ADMIN on-behalf-of creation is not tracked. `createEvent()` line 373 hardcodes `onBehalfOf: false` for all callers regardless of the caller's role. This is the subject of FLOW-11-F02.

---

## Web ↔ mobile parity

| Feature | Web | Mobile | Gap |
|---|---|---|---|
| 5-step wizard | Yes — `page.js` routes case 1–5 to StepOne–StepFour + Summary | Yes — `CreateEventScreen.js` gate `currentStep < 5`; Step 5 renders `<EventSummary />` | Structure matches; content of Step 5 diverges (see below) |
| Step 5 scheduledDate/scheduledTime input | Display-only in `Summary.js` — reads from form state; `useEventForm.js:38-39` defaults to empty strings; no `<DatePicker>`/`<TimePicker>` wired in Summary | Display-only in `EventSummary.js` — no schedule fields at all | Both platforms missing working schedule input in Step 5. Mobile is the higher-severity gap (FLOW-11-F01) because the payload is never built. |
| CSV/XLSX guest upload | Yes — `StepTwo.js` has ActionButtons with file import | Yes — `StepTwo.js:17` imports `importFromXLSX` from `utils/xlsxUtils.js` | Parity confirmed |
| Staff assignment in wizard | Web: Step 2 opens `StaffPopup` via a button (separate popup, not inline in step) | Mobile: Step 2 has a "moderators" tab inside `StepTwo.js` (inline, `activeTab === 'moderators'`) | Both have staff entry in Step 2; persistence is via post-creation PATCH, not inline in the create payload |
| Template image upload | Yes — multipart file field in Step 3 | Yes — `StepThree.js` handles template/image selection | Parity confirmed |
| Upgrade prompt when quota exceeded | Yes — `EventLimitReached` component shown in `page.js` when `canCreateEvent === false` | Yes — `CreateEventScreen.js:46-50` checks `canCreateEvent` from `useSubscriptionInfo` hook | Parity confirmed |

---

## Edge cases & failure modes

- **Quota exhausted mid-wizard**: Backend blocks at submission time (`validateEventCreation()`), but the frontend quota counter may show stale data if the subscription changed while the wizard was open. The backend rejection is the authoritative gate; the frontend counter is advisory only.
- **Duplicate phone numbers in CSV at creation**: `createGuestsFromList()` calls `Guest.create(docs)` with no normalization or deduplication. A CSV with duplicate phones either creates duplicate guest records or surfaces a raw MongoDB unique-index constraint error to the client. (FLOW-11-F03)
- **No idempotency key on POST /events/create**: A double-tap or auto-retried network request creates two identical event documents. Both consume quota and spawn guest records. (FLOW-11-F05)
- **Pool plan consumeInvites called before event saved**: `Subscription.consumeInvites()` is called at line 343 before `Event.create()` at line 398. If the subsequent save fails, the invite pool has already been decremented with no compensating rollback. (FLOW-11-F04)
- **Server timezone in cron**: `scheduledTime` is stored as a bare `HH:mm` string. The cron at `scheduledTasks.js:99-104` compares against `now.getHours()/getMinutes()` on server local time. If the server timezone is not Arabia Standard Time (UTC+3), all Saudi events fire at the wrong wall-clock time. (See FLOW-14-F03)
- **Network failure mid-upload (mobile)**: Template image upload may partially succeed if the connection drops after the file reaches the server but before the event document is persisted. The URL reference is then orphaned in S3/local storage.

---

## Findings

### FLOW-11-F01
- **Severity**: Critical
- **Type**: CONFLICT
- **Location**: `halla-mobile/components/createEvent/EventSummary.js` (no schedule inputs)
- **Description**: Gate-1 #4 requires mobile to reach full parity with the 5-step wizard. Gate-1 #11 requires launch settings (`scheduledDate`, `scheduledTime`) to be set before dispatch. Mobile Step 5 renders `<EventSummary />` which is display-only — contains no `scheduledDate`/`scheduledTime` inputs, no `launchSettings` form fields, and no schedule CTA.
- **Why it matters**: Events created on mobile cannot be launched. The cron's `scheduleEventLaunch` at `scheduledTasks.js:113-119` matches only events with `status: 'scheduled'` that have a valid `launchSettings.scheduledDate`/`scheduledTime`. Without these fields, the event stays in `draft` indefinitely — guests never receive invitations.
- **Recommended change**: Add `scheduledDate`, `scheduledTime`, and reminder fields to `EventSummary.js` as form inputs wired to the `launchSettings` form context. Ensure the payload passed to `EventsService.transformFormDataToPayload` includes the populated `launchSettings` object.
- **Related**: FLOW-14-F01, FLOW-11-F02

### FLOW-11-F02
- **Severity**: Medium
- **Type**: CONFLICT
- **Location**: `labbe-backend-/src/modules/events/events.service.js:373`
- **Description**: `createEvent()` hardcodes `onBehalfOf: false` for all callers. Admin or whitelabel admin on-behalf-of event creation is not tracked. Gate-1 #10 requires the audit log to distinguish on-behalf-of actions.
- **Why it matters**: Admin-created events are indistinguishable from host-created events in the audit record. Regulatory accountability for admin interventions is absent — if an admin creates an event on a host's behalf and something goes wrong, there is no audit trail linking the action to the admin's identity.
- **Recommended change**: Accept `onBehalfOf` and `targetUserId` fields in the create event request body. When an admin calls with `onBehalfOf: true`, set `createdBy.onBehalfOf = true` and `createdBy.adminId` to the admin's user ID. Gate the field behind a role check so hosts cannot spoof it.
- **Related**: none

### FLOW-11-F03
- **Severity**: Medium
- **Type**: BUG
- **Location**: `labbe-backend-/src/modules/events/events.service.js:79-95`
- **Description**: `createGuestsFromList()` calls `Guest.create(docs)` without normalizing or deduplicating phone numbers. A CSV upload with duplicate phones at creation time either creates duplicate guest documents or fails with a raw MongoDB unique-index constraint error. `updateGuestList()` at line 898 deduplicates on update, but not on initial creation.
- **Why it matters**: A host who uploads a CSV with accidental duplicate entries sees a raw database error rather than a clean message explaining how many duplicates were removed. This blocks event creation with no actionable guidance.
- **Recommended change**: Normalize and deduplicate phone numbers inside `createGuestsFromList()` before calling `Guest.create()`. Return a structured warning count of duplicates removed rather than propagating a raw constraint error to the client.
- **Related**: FLOW-17-F04 (phone normalization in sendBulk)

### FLOW-11-F04
- **Severity**: High
- **Type**: MISSING
- **Location**: `labbe-backend-/src/modules/events/events.service.js:343`
- **Description**: `consumeInvites()` is called at line 343 before the event document is persisted to the database at line 398. If the subsequent `Event.create()` call fails (validation error, DB failure), the subscription's invite pool has already been decremented with no rollback.
- **Why it matters**: A failed event creation silently drains the host's invite pool. The host's next event creation attempt sees a lower available quota than expected, which can block legitimate event creation until an admin manually corrects the pool balance.
- **Recommended change**: Move `consumeInvites()` to after the event document is successfully persisted. Add a compensating `addInvites()` call in the catch block as a fallback if the ordering cannot be changed.
- **Related**: FLOW-12-F01

### FLOW-11-F05
- **Severity**: High
- **Type**: MISSING
- **Location**: `labbe-backend-/src/modules/events/events.routes.js` (POST /create, no idempotency support)
- **Description**: The event creation endpoint has no idempotency key support. A network retry or double-submit from the client creates two identical event documents. Gate-1 #6 requires idempotency keys on all operations with external side effects (quota consumption, guest creation, notification sends).
- **Why it matters**: A host who double-taps the submit button or whose client auto-retries a timed-out request ends up with two events, two sets of guests, and a double quota deduction.
- **Recommended change**: Accept an `X-Idempotency-Key` header (or a client-generated UUID in the request body). Before creating the event, check whether a recent event with this key already exists for this user. Return the existing event on duplicate rather than creating a second one.
- **Related**: FLOW-11-F04

---

## Cross-flow notes
- **Flow 12**: Quota is consumed at event creation (`consumeInvites`, line 343) — failure here cascades to incorrect quota display in `GuestQuotaCounter` (FLOW-12-F01).
- **Flow 13**: The 5 PATCH endpoints for event update depend on the event existing with correct initial values set here. `launchSettings` not set at creation means the update endpoint is the only path to scheduling — which mobile never calls after creation.
- **Flow 14**: `launchSettings.scheduledDate/scheduledTime` set here is the key input to the cron's `scheduleEventLaunch`. Missing on mobile (FLOW-11-F01) means the cron never matches mobile-created events.
- **Flow 15**: If the event is created without `launchSettings`, the launch failure flow never triggers either — the event stays `draft` and no retry logic applies.
- **Flow 09**: Subscription quota validation in `createEvent()` calls `validateEventCreation()` which uses the oldest-subscription bug (FLOW-09-F02) — same root cause as FLOW-12-F01.
