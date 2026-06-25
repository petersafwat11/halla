# Web Frontend Reference — Create / Update / Single Event Pages

> **Audience:** planning a new feature on the host (and business) event experience.
> **App:** `labbe/` — Next.js App Router, React Query, React Hook Form, CSS Modules.
> **Verified against live code, 2026-06-24.** Companion doc: [`02-BACKEND-AND-DB.md`](02-BACKEND-AND-DB.md).

## 0. Orientation

- **Host == Business on these pages.** "Business account" is **not a separate role or a separate set of pages**. It is `role:'host'` + `user.accountType === 'business'`. The create/update/single-event pages under `host/` are the *same files* for both; behavior forks in exactly **one** place in this whole frontend scope (see §2.6). The `business/` route folder only holds checkout (`labbe/app/[lang]/business/checkout/...`).
- **The event envelope trap.** `GET /events/:id` returns `{ data: { event } }` — the event is at `data.event`, **two levels deep**. Every consumer unwraps `res?.data?.event` (with a `?? res?.event` fallback for already-unwrapped prefetched cache). Using `data` directly leaves `event.host/eventDetails/templates` undefined — the classic "not allowed / blank wizard" bug.
- **Three layers:** route pages (`app/[lang]/...`) → data hooks (`hooks/...`) → HTTP client (`services/http.js`). Server components prefetch into a server QueryClient and hydrate; client components use the hooks.

---

## 1. File Inventory

### 1.1 Route pages

| File | Responsibility |
|---|---|
| [`host/create-event/page.js`](labbe/app/[lang]/host/create-event/page.js) | Create-event orchestrator. Subscription gate → 5-step wizard → `POST /events`. |
| [`host/update-event/page.js`](labbe/app/[lang]/host/update-event/page.js) | Thin host route → `<UpdateEventWizard returnPath="host" />`. |
| [`host/update-event/_components/UpdateEventWizard.jsx`](labbe/app/[lang]/host/update-event/_components/UpdateEventWizard.jsx) | **Update orchestrator** (shared by host + admin-dash). 4 steps via URL `?id=&step=`. Prefill + live-lockout + per-step PATCH. |
| [`host/events/[id]/page.jsx`](labbe/app/[lang]/host/events/[id]/page.jsx) | **Single-event detail** (server component). Prefetches event + stats, renders 5 client sections. |
| [`host/events/page.js`](labbe/app/[lang]/host/events/page.js) | Events **list** (server component). Prefetches stats + my-events. |

### 1.2 Create-event step components (`host/create-event/_components/`)

| Component | Step | Collects / does |
|---|---|---|
| `stepOne/StepOne.js` | 1 | event type, name, date, time, address (map). |
| `stepTwo/StepTwo.js` (+ `GuestImporter.js`, `GuestTable.js`, `actionButtons/`) | 2 | guest list (manual + XLSX import) + gate-supervisor (staff) list via `staffPopup/`. Quota counter. |
| `stepThree/StepThree.js` (+ `templatesCards/`, `templateForm/DynamicTemplateForm.jsx`) | 3 | visual invitation card — pick template **or** upload custom image; fill dynamic fields; bake preview PNG. |
| `stepFour/StepFour.js` (+ `whatsappPreview/`, `mobilePreviewButton/`) | 4 | Taqnyat (WhatsApp) template pick + auto-reply text (`guestReplies`). |
| `summary/Summary.js` (+ `SummaryCards.js`, `EventDataDisplay.js`, `ScheduleSection.js`) | 5 | review + `confirmReviewed` checkbox → launch. **This is the real step 5.** |
| `stepper/Stepper.js` | — | step indicator (desktop + mobile). |
| `buttons/Buttons.js` | — | Next / Previous / Save. |
| `header/Header.js`, `stepTitleAndDesc/` | — | chrome (titles intentionally hidden — see §8). |
| ⚠️ `stepFive/StepFive.js`, `confirmationModal/ConfirmationModal.jsx` | — | **DEAD CODE** — not imported anywhere. Don't mistake `StepFive` for the create step-5. |

### 1.3 Update-event components & hooks (`host/update-event/`)

| File | Responsibility |
|---|---|
| `_components/UpdateButtons.js` | Save / Cancel. |
| `_components/LiveEventBanner.jsx` | Status banner (ended-locked / live-step2-add-only / live-locked). |
| `_components/MobilePreviewModal.jsx` | Full-screen WhatsApp preview (step 4). |
| `_hooks/useStepConfig.js` | Builds per-step `{title, description, Component, props}`; computes step-2 quota props + `allowAddOnly`. |
| `_hooks/useUpdateEventActions.js` | Save/cancel; dispatches per-step PATCH; live-lockout guard. |

### 1.4 Shared form + mutation hooks (`hooks/events/`)

| File | Responsibility |
|---|---|
| [`useEventForm.js`](labbe/hooks/events/useEventForm.js) | **Shared form engine** for BOTH wizards: RHF setup, defaults, `mapEventToFormValues` (prefill), `buildEventPayload` (create), `buildStepPayload` (update), `validateStep`, staff CRUD. |
| `mutations/useEventCrudMutation.js` | Create (multipart) / delete / bulk-delete. |
| `mutations/useEventMutation.js` | Façade routing an `action` string → the owning sub-hook; ~20 convenience hooks. |
| `mutations/useEventSettingsMutation.js` | Partial updates: event-details, step2, invitation-settings, launch, reminder, retry/resend/extra-reminder. |
| `mutations/useEventGuestMutation.js` | `updateGuestList` (replace whole list). |
| `mutations/useEventStaffMutation.js` | add/update/delete/notify staff. |
| `mutations/_shared.js` | Shared retry contract (`retry:3`, exp backoff, 5xx/network/timeout only). |

### 1.5 Query hooks (`hooks/events/queries/`) + domain hooks

| File | Endpoint | Returns |
|---|---|---|
| `queries/useEvent.js` (`useEvent`, `useEventById`) | `GET /events/:id` | `{ data: { event } }` (does **not** unwrap) |
| `queries/useEventGuests.js` | `GET /guests/events/:eventId` | guest array at `data.data` |
| `queries/useEventStats.js` | `GET /events/stats` | aggregate host stats |
| `queries/useMyEvents.js` | `GET /events/my-events` | events list + pagination |
| `queries/useSingleEventStats.js` | `GET /events/stats/:id` | per-event stats; polls (live 30s / completed 5m) |
| `queries/useSubscriptionInfo.js` | `GET /events/subscription-info` | quota summary (used by **create gate**, not the single page) |
| `hooks/guests/` | `GET /guests/invitation/:code`, RSVP, CRUD | guest portal + host guest CRUD |
| `hooks/plans/` | `GET /plans`, `/plans/host`, `/plans/business`, `/plans/landing` | plan lists |
| `hooks/subscriptions/` | `GET /subscriptions/my-subscription`, `/subscriptions/payments` | caller's own sub + payments |
| `keys.js` | — | `eventsKeys` factory (**but most hooks use hardcoded literals** — see §8) |

### 1.6 Services (`labbe/services/`)

| File | Responsibility |
|---|---|
| [`http.js`](labbe/services/http.js) | Axios client, `apiRequest`, React Query helpers, SSR prefetch/hydration. |
| `serverAuth.js` | Server-component RBAC: cookie role read, `getToken()`, page-access matrix. |
| `errorHandlingService.js` | `parseError` (reads axios `error.response`), `handleError` (toast), retry helpers. |
| `apiResponseHandler.js` | Envelope helpers — **documentation-grade; not imported by in-scope code** (call sites unwrap inline). |
| `guestTokenUtils.js` | Public guest-session cookie (`guestToken`) — post-event flow only. |

---

## 2. The Create-Event Wizard

**Entry gate** (`page.js`): `loading` → **business-with-no-subscription** → `NoSubscriptionBanner` (business plans are admin-activated) → `!canCreateEvent` → `EventLimitReached` → otherwise the wizard. State is **one flat React Hook Form** (`mode:"onChange"`), wrapped in `<FormProvider>`; steps read/write via `useFormContext()`.

### 2.1 Form-state shape (`DEFAULT_FORM_VALUES`, `useEventForm.js`)

```js
eventType: ""                 // step 1 — enum: wedding|birthday|graduation|engagement|conference|other
eventName: ""
eventDate: ""                 // string/Date; minDate = now + 3d (trial) / +4d, mirrors backend floor
eventTime: "12:00:AM"         // "H:MM:AM/PM"
address: { address, latitude:24.7136, longitude:46.6753, city, country }
guestList: []                 // step 2 — {id, name, mobile, email}
staffList: []                 // step 2 — {id, name, mobile}
templateImage: ""             // step 3 — File (upload/bake) OR url string
visualTemplate: { isCustomUpload:true, fieldValues:{} }   // OR {templateRef, fieldValues, isCustomUpload:false, ...meta}
selectedTemplate: null        // step 4 — Taqnyat template meta {_id,name,bodyText,language,...}
taqnyatTemplate: null         // step 4 — {templateRef}  (canonical)
guestReplies: { onAttend:"", onAbsent:"", onExpected:"" }
sendSchedule: "now"           // step 5 — DEAD in UI (always "now"); scheduleDate/scheduleTime unused
confirmReviewed: false        // step 5
```

### 2.2 Steps (what each collects + validation gate)

`useEventForm.validateStep(n)` uses **truthiness checks, NOT Zod** (the shared Zod schemas are only wired into the inner template form):

| Step | Component | Key fields | Gate |
|---|---|---|---|
| 1 | `StepOne` | eventType, eventName, eventDate, eventTime, address | `eventType && eventName && eventDate && eventTime` |
| 2 | `StepTwo` | guestList[], staffList[] | `guestList.length > 0` |
| 3 | `StepThree` | visualTemplate, templateImage | `templateImage` OR `visualTemplate.templateRef/id/_id` |
| 4 | `StepFour` | selectedTemplate, taqnyatTemplate, guestReplies | `selectedTemplate.name` OR `taqnyatTemplate.templateRef` |
| 5 | `Summary` | confirmReviewed | `confirmReviewed === true` |

- **Step 2 quota:** phone regex `^5[0-9]{8}$` (Saudi), email optional, duplicate-mobile rejected. Pool plans surface `invitesRemaining` as the effective cap even when `isGuestUnlimited`. XLSX import truncates to remaining quota.
- **Step 3 two modes:** *template mode* (category tabs → carousel → `DynamicTemplateForm` with its **own nested RHF + zodResolver(buildDynamicTemplateSchema)** → bake preview via `useTemplateBake`) or *upload mode* (`image/jpeg|jpg|png|webp`, ≤10 MB). Canonical record is `visualTemplate.templateRef` + `fieldValues`; `templateImage` is a *best-effort baked PNG* — **bake failure is non-fatal** (backend re-renders from ref + fieldValues).

### 2.3 Submission (`page.js onSubmit` → `buildEventPayload(formData)` → `useCreateEvent().mutateAsync`)

`buildEventPayload` produces:
```js
{ eventDetails:{title,type,date,time,location}, guestList:[{name,phone,email}],
  staffList:[{name,phone}], visualTemplate:{...}, taqnyatTemplate:{templateRef},
  guestReplies:{...}, templateImage:<File|string>,
  launchSettings:{ sendSchedule:"now", scheduledDate, scheduledTime } }
```
Transport: wrapped into **`multipart/form-data`** — each JSON sub-object `JSON.stringify`'d into its own field; `templateImage` appended only `if (instanceof File)`. **Endpoint: `POST /events`.**

**Success:** toast, `router.replace('/{locale}/host')`, invalidates `myEvents`/`stats`/`subscriptionInfo`/`dashboard.host`. **Error:** `handleError(...)`.

### 2.6 The ONLY host-vs-business branch in this scope

`create-event/page.js` ~L67: `const isBusiness = user?.accountType === "business"`. Used ~L71/L193 to show `NoSubscriptionBanner` (instead of the wizard) when a business user has `subscriptionInfo.hasSubscription === false`. **No step, field, copy, or submit differs for business.** Update-event has **no** business branch at all.

---

## 3. The Update-Event Wizard

Shared engine, but: **4 steps** (no Summary), `currentStep` from URL `?step=`, prefill from `GET /events/:id`, **per-step PATCH** (not one POST).

### 3.1 Prefill

`UpdateEventWizard.jsx` unwraps `eventData?.data?.event || eventData?.event` then `mapEventToFormValues(event)`. `mapEventToFormValues` normalizes populated-vs-raw refs (`visualTemplate.templateRef` / `taqnyatTemplate.templateRef` may be a populated doc or a bare ObjectId), and always resets `sendSchedule:"now"`, blanks schedule, `confirmReviewed:false` (prefill never carries launch state).

### 3.2 Per-step save (`useUpdateEventActions` + `buildStepPayload`)

| Step | `type` | Endpoint | Body |
|---|---|---|---|
| 1 | eventDetails | `PATCH /events/:id/event-details` | `{title,type,date,time,location,description:""}` |
| 2 | step2 | `PATCH /events/:id/step2` | `{guestList:[{name,phone,email}], supervisorsList:[{name,phone}]}` (atomic guest+staff replace) |
| 3 | invitationSettings | `PATCH /events/:id/invitation-settings` (multipart) | `{visualTemplate, templateImage?}` |
| 4 | invitationSettings | `PATCH /events/:id/invitation-settings` (multipart) | `{taqnyatTemplate:{templateRef}, guestReplies}` |

Each save is **independent and returns to the list** — no "save all".

### 3.3 Live / completed lockout

- `isEventLive = status === "live"`, `isEventCompleted = status === "completed"`.
- `lockoutActive = (isEventLive && step !== 2) || isEventCompleted` → wraps step in `<fieldset disabled>` + disables Save (`useUpdateEventActions.handleSave` re-guards with toast `update_locked_live_event`).
- **Step 2 stays editable while live** but `allowAddOnly` — existing guest rows read-only, no bulk actions; new guests addable. Completed events lock step 2 too.

### 3.4 Create vs Update at a glance

| Aspect | Create | Update |
|---|---|---|
| Steps | 5 (incl. Summary/launch) | 4 |
| Step source | local `useState(1)` | URL `?step=` |
| Submit | one `POST /events` (multipart, full) | per-step **PATCH** (partial) |
| Prefill | none | `GET /events/:id` → `mapEventToFormValues` |
| Gate | full subscription gate | none (only sizes step-2 quota) |
| Lockout | n/a | `LiveEventBanner` + `<fieldset disabled>` |

---

## 4. The Single-Event Page (`host/events/[id]/page.jsx`)

Server component reads the `access_token` cookie, prefetches `["events", id]` + `["events", id, "stats"]` into a server QueryClient, hydrates, then renders (top→bottom):

| # | Section (component) | Data source | Actions |
|---|---|---|---|
| 1 | `HostEventHeader` → `EventActionsHeader` | `useEvent` | Test message (`PATCH …/test-message`), Schedule (`launchSettings`), Notify staff (`POST …/notify-staff`), Share post-event (if completed), **Edit event** dropdown → `update-event?id&step=1..4`, **Edit guests** → step 2, **Staff details** popup (add/update/delete staff). |
| 2 | `EventFailureBannerClient` → `EventFailureBanner` | `useEvent` + `useAuthStore` | Only if `status==="failed"` (retry → `POST …/retry-launch`) or `scheduled && attemptCount>0` (retrying + backoff countdown). |
| 3 | `RemainingInvitesBanner` | `event.subscription.invitesRemaining` | "Invites left" pill (`null` = unlimited; hidden if no `subscription`). |
| 4 | `AutoReminderInfoText` | `event.reminderSettings` | Auto-reminder notice + Customize popup (`PATCH …/reminder-settings`). |
| 5 | `EventStatsAndTableWrapper` (holds shared `statusFilter`) → `EventStats` + `GuestTable` | `useEvent` + `useSingleEventStats` + `useEventGuests` | Click a stat card → filters the guest table. Guest rows: edit/delete (`useGuestMutation`), reminder (`POST /messaging/send-reminder`), bulk resend (`POST …/resend-invite`), bulk extra-reminder (`POST …/extra-reminder`), export (`GET …/export`). `PartialFailureBanner` when `messagingStatus.failedCount>0`. |

**Quota on this page comes from `event.subscription` (embedded in the `useEvent` payload), NOT `useSubscriptionInfo`.** There is **no separate "reminders remaining"** — invites and reminders draw the same pool. `SubscriptionInfo.jsx` exists but is **admin-only** and not mounted here.

---

## 5. The Data Layer

`apiRequest` returns the **whole backend envelope** (`{success,status,data,...}`). Hooks return that envelope; **consumers unwrap** (`data.event` for single event, `data.data` for arrays).

### 5.1 Query keys (factory exists, but hooks use literals — keep both in sync)

```
useEvent            → ["events", eventId]            staleTime 5m
useEventGuests      → ["guests", "events", eventId]
useEventStats       → ["events", "stats"]
useMyEvents         → ["events", "my-events"]
useSingleEventStats → ["events", eventId, "stats"]   polls live 30s / completed 5m
```

### 5.2 Mutation → endpoint → invalidation (single-event page)

| Hook (action) | Endpoint | Invalidates |
|---|---|---|
| `useEventGuestMutation("updateGuestList")` | `PATCH /events/:id/guest-list` | `["events",id]`, `["guests","events",id]` |
| settings `updateEventDetails` / `updateEventStep2` / `updateInvitationSettings` | `PATCH /events/:id/{event-details,step2,invitation-settings}` | `["events",id]` (+ guests for step2) |
| settings `updateLaunchSettings` / `updateReminderSettings` | `PATCH /events/:id/{launch,reminder}-settings` | `["events",id]` |
| settings `retryLaunch` / `resendInvite` / `extraReminder` | `POST /events/:id/{retry-launch,resend-invite,extra-reminder}` | `["events",id]`, `["events"]` (+ guests) |
| staff `addStaff`/`updateStaff`/`deleteStaff`/`notifyStaff` | `POST/PUT/DELETE /events/:id/staff…`, `POST …/notify-staff` | `["events",id]` |
| `useGuestMutation("update"/"delete"/"rotateQr"/"revokeAccess"/"export")` | `…/guests/:guestId…` | `["guests","events",id]`, `["events",id]` |

### 5.3 HTTP client (`http.js`)

- **Base URL:** server → `INTERNAL_API_URL || http://localhost:8000/api/v2`; browser → `NEXT_PUBLIC_API_URL || /api/v2` (relative → hits the Next rewrite proxy).
- **Auth:** **no JS-set Authorization header for host requests** — auth is the **HttpOnly `access_token` cookie** via `withCredentials:true`. (A Bearer header is only attached for the guest **post-event** routes, from the JS-readable `guestToken` cookie; server components pass a token explicitly via `apiRequest({isServer, serverToken})`.)
- **401 handling:** one coalesced silent refresh `POST /auth/refresh` (single-flight), then replay; on failure with an existing session, clears routing cookies → `/login`.
- **`apiRequest` returns `response.data`** (the envelope) and **only honors `config.headers`** (a top-level `headers` arg is silently dropped — see §8).
- **`downloadExportFile`** uses raw `fetch` + `credentials:"include"` for Excel exports.

---

## 6. Consolidated FE → BE endpoint catalog

All under `/api/v2`. (Full request/response contracts in [`02-BACKEND-AND-DB.md` §3](02-BACKEND-AND-DB.md).)

| Endpoint | Used by | When |
|---|---|---|
| `GET /events/subscription-info` | `useSubscriptionInfo` | create gate, step-2 quota |
| `GET /events/:id` | `useEvent` | single page + update prefill (`data.event`) |
| `GET /events/my-events` · `GET /events/stats` | `useMyEvents` · `useEventStats` | list page |
| `GET /events/stats/:id` | `useSingleEventStats` | single page (polls) |
| `POST /events` | `useCreateEvent` | create submit (multipart) |
| `PATCH /events/:id/{event-details,step2,invitation-settings,guest-list,launch-settings,reminder-settings}` | settings/guest mutations | update wizard + single-page edits |
| `POST /events/:id/{retry-launch,resend-invite,extra-reminder,notify-staff}` | settings/staff mutations | single page actions |
| `POST/PUT/DELETE /events/:id/staff…` | staff mutations | staff popup |
| `PATCH /events/:id/test-message` | `useSendTestMessage` | test-message popup |
| `GET /guests/events/:eventId` · CRUD · `…/export` | `useEventGuests`, `useGuestMutation` | guest table |
| `POST /messaging/send-reminder` | `useSendReminder` | reminder popup |
| `GET /templates` · `/template-categories` · `/fonts` · `/taqnyat-templates` | template hooks | step 3 / step 4 pickers |
| `DELETE /events/:id` · `POST /events/bulk-delete` | CRUD mutations | list page |

---

## 8. Gotchas & traps for feature planning

1. **`data.event` is two levels deep** — the single most common bug. `useEvent` does not unwrap; everything else does.
2. **Scheduling is dead UI.** `sendSchedule`/`scheduleDate`/`scheduleTime` exist in state and `buildEventPayload` always emits `sendSchedule:"now"`, but **nothing in the UI ever changes them** (`Summary.isScheduled` only ever goes false; `ScheduleSection` never shows). A real "schedule send" feature needs new UI + wiring. (Note: the *actual* schedule→launch transition is owned by the **messaging** module on the backend, not events — see [`02` §4c](02-BACKEND-AND-DB.md).)
3. **`StepFive.js` and `ConfirmationModal.jsx` are dead code** — not imported. The live create step 5 is `Summary`. If you build an "invitation message / host note" feature, `StepFive` is an unused sketch, not a wired component.
4. **Wizard gating is truthiness, not Zod.** `validateStep` does simple truthy checks; the shared `createEventSchema`/`stepValidationSchemas` are **not** run at submit (only `DynamicTemplateForm` uses Zod). Adding real validation is a new integration.
5. **Top-level `headers` on `apiRequest` is silently dropped** — only `config.headers` is honored. As a result, `retryLaunch`/`resendInvite`/`extraReminder` pass an `Idempotency-Key` that **never gets sent** (messaging mutations do it correctly via `config.headers`). The server still de-dupes via event locks, but client double-click protection on those three is absent.
6. **"Send Invitation" popup on the guest table is a no-op** (verified) — `handleConfirmSendInvitation` only toasts success; no mutation. Real sending is the launch/schedule flow and the bulk-resend path.
7. **Query-key factory vs literals** — `eventsKeys`/`guestsKeys` exist but hooks/invalidations use hardcoded literal arrays. Add a key in both places or you silently miss invalidations.
8. **Two RHF instances live in step 3** (wizard form + `DynamicTemplateForm`); `StaffPopup` spins up a throwaway third just to satisfy `useFormContext`.
9. **Three different stat field-name schemes**: list cards (`totalGuests/confirmedGuests/checkedInGuests`), single-event stats (`confirmed/declined/maybe/pending/checkedIn/totalGuests`), per-row events (`guestCount/confirmedCount/declinedCount`). A trap when wiring new stat UI.
10. **Status-driven visibility is centralized** in `@halla/shared` (`EVENT_STATUS_GROUPS`, `useEventActionGate`) and re-enforced server-side. Action buttons gate on **event status**, never on account type.
11. **Headings/CTA intentionally hidden** — `StepTitleAndDesc` doesn't render its `title`/`description` (commented), `Header` CTA is commented out; visible step label comes only from `Stepper`. Per-step copy means rebuilding `StepTitleAndDesc`.
12. **Update step 2 sends `supervisorsList`** (web) but the server also accepts `staffList` (mobile); both map to the same field, `staffList` wins if both present. The atomic `/step2` PATCH exists so a capacity rejection leaves guest+staff at pre-call values.
