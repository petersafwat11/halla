# Backend & DB Reference — Events, Users, Guests, Subscriptions, Plans

> **Audience:** planning a new feature across the backend + database.
> **App:** `labbe-backend-/` — Node/Express modular monolith + Mongoose (MongoDB). Companion: [`01-WEB-FRONTEND-event-pages.md`](01-WEB-FRONTEND-event-pages.md).
> **Verified against live code, 2026-06-24** (post invites-plans-rework 2026-06-20 + admin-plan-management 2026-06-23). Where early-May `docs/modules/*-review-plan.md` disagree with code, **code wins** — stale-doc traps are flagged in §8.

## 0. Architecture in one screen

- **Layout per module** (`src/modules/<name>/`): `*.routes.js` → `*.controller.js` (thin HTTP) → `*.service.js` (logic, singleton) → Mongoose models in `labbe-backend-/models/`. `index.js` is a barrel. Validation is **Zod** via `validateZod` middleware (Joi is forbidden for new code).
- **Response envelope** (`src/shared/utils/responseHelper.js`): `sendSuccess`/`sendCreated` → `{ success:true, status:'success', message?, data }`; `sendPaginated` → `{...,data:[...],pagination:{page,limit,total,pages}}`; `sendDeleted` → 200 + `data:null`. **`GET /events/:id` data is `{ event }`** ⇒ full body `{success,status,data:{event}}`.
- **Auth:** `protect` (JWT access token via `Authorization: Bearer` or `access_token` cookie) → `restrictTo(...roles)` / `requirePageAccess(PAGE, action)` (admin RBAC matrix).
- **Roles** (`shared/constants/roles.js`): `super_admin, admin, moderator, host, vendor, guest`. **There is NO `business` role** — a "business account" is `role:'host'` + `accountType:'business'` (`shared/constants/accounts.js`).
- **The events service is a façade:** `events.service.js` `Object.assign`s 8 sub-service modules onto one prototype, so they share `this` (e.g. every sub-service calls `this._buildScopedEventQuery`, defined only in `events.crud.service`).

---

## 1. File Inventory

### 1.1 Events module (`src/modules/events/`)

| File | Responsibility |
|---|---|
| `events.controller.js` | Host/shared HTTP handlers; re-exports admin handlers at bottom. |
| `events.admin.controller.js` | `getAllEvents`, `adminUpdateEventStatus`, `adminDeleteEvent` (split for file-size cap). |
| `events.routes.js` | Host/shared routes; global `protect`+`restrictTo`; mounts `/admin` router. |
| `events.admin.routes.js` | Admin routes (`requirePageAccess(EVENTS,...)`). |
| `events.service.js` | Façade composing the 8 sub-services below. |
| `events.crud.service.js` | list/get/**create**/delete/status; `_buildScopedEventQuery`; `_freeEventSlot`; **stamps subscription onto event**. |
| `events.step2.service.js` | atomic guest+staff replace (transaction + standalone fallback). |
| `events.guests.service.js` | guest-list create/add/update/status; `createGuestsFromList` (bulk, fires QR hook). |
| `events.staff.service.js` | staff CRUD + staff WhatsApp/SMS notify + token revoke. |
| `events.settings.service.js` | invitation/launch/reminder settings; template field validation; 24h edit-lock. |
| `events.launch.service.js` | manual `retryEventLaunch`; status/created notifications. |
| `events.resend.service.js` | **pool-charged** resend-invite + extra-reminder (`_assertInviteBudget`, `_chargeInvites`). |
| `events.stats-export.service.js` | aggregate stats, single-event stats, **`getSubscriptionInfo`**, Excel export. |
| `events.validation.js` | Zod schemas for every route. |
| `templateDataValidator.js` | validates host field-values vs `Template.fields[]` → `AppError(400, TEMPLATE_DATA_INVALID)`. |
| `templateRefResolver.js` | resolves Taqnyat template selection; **dead within events** (post-event uses it). |

### 1.2 Users module (`src/modules/users/`) + Guests module (`src/modules/guests/`)

| File | Responsibility |
|---|---|
| `users.{routes,controller,service,validation}.js` | Self-service profile: get/update profile, password, OTP-gated phone change, per-section profile, notification prefs. **All routes `protect`.** |
| `guests.{routes,controller,service,validation}.js` | 2 **public** RSVP-portal routes + host guest management (CRUD, QR rotate/revoke, Excel export). |

### 1.3 Subscriptions module (`src/modules/subscriptions/`) + Plans module (`src/modules/plans/`)

| File | Responsibility |
|---|---|
| `subscriptions.service.js` | event-creation gating, live-limit computation, payment history, admin-assign wrapper, cron renewal. |
| `subscriptionLifecycle.service.js` | **THE single path for plan changes** — `changePlan`, `grantExtraInvites`. |
| `subscriptionEventAccess.service.js` | resolves the (possibly cancelled-because-replaced) subscription **for a stamped event** — `findForEvent`. |
| `subscriptions.{controller,routes,validation}.js` | 4 endpoints (my-subscription, admin/assign, payments, payments/export). |
| `plans.service.js` | plan read/format, admin CRUD, `getAssignablePlans`, limit-reduction guard. |
| `plans.{controller,routes,schemas}.js` | admin (RBAC) + public plan routes. |

### 1.4 Models (`labbe-backend-/models/`)

`EventModel.js` (703L) · `UserModel.js` (909L) · `GuestModel.js` (307L) · `GuestAccessTokenModel.js` · `SubscriptionModel.js` (599L) · `PlanModel.js` (247L) · `BusinessPlanAssignmentModel.js` · `BusinessSetupFeeModel.js`.

---

## 2. Data Models

### 2.1 EventModel (`collection: events`)

**Core fields:** `eventDetails{title, type(enum wedding|birthday|graduation|engagement|meeting|conference|other), date, time, location{address,latitude,longitude,city,country}}` · `guestList:[ObjectId→Guest]` (refs only) · `staffList:[{name,phone,status}]` (**embedded**) · `visualTemplate{templateRef→Template, fieldValues:Mixed, bakedImagePath, isCustomUpload}` · `taqnyatTemplate{templateRef→TaqnyatTemplate}` · `guestReplies{onAttend,onAbsent,onExpected}` · `templateImage` · `launchSettings{scheduledDate,scheduledTime}` · `reminderSettings{customReminderTime,scheduledDate,scheduledTime}` · `host:ObjectId→User` (req).

**Subscription stamp (frozen at create, never re-read live):** `subscriptionId→Subscription` · `planId→Plan` · `packageType(event|subscription)` · `guestLimit` (frozen to **`-1`** = pool governs at sub level) · `perEventGuardKey:ObjectId` (set = `subscriptionId` while a per-event plan's event holds the single-active slot — backs a **partial UNIQUE index**).

**Business snapshot:** `branding{logoKey, businessName}` (event-owned immutable S3 key) · `invitationDeliveryMode(quick_reply|portal_link|null)` (personal→quick_reply, business→portal_link) · `invitationTemplate{id,version,provider}`.

**Lifecycle:** `status` enum `EVENT_STATUS` = `pending_scheduling`(default) · `pending_review` · `scheduled` · `live` · `published` · `cancelled` · `completed` · `archived` · `failed` · `deleted`. Plus `previousStatus`, `deletedAt` (soft-delete), `attemptCount`/`lastAttemptAt`/`failureReason`/`launchedAt`/`failedAt`, `launchLock{lockedAt,lockedBy}`, `messagingStatus{preferredChannel,sentCount,failedCount,staffFailedCount,reminderSent,...}`, `createdBy{user,role,onBehalfOf}`, `createdFor{user,role,isSelf}`.

**Indexes:** `host`, `eventDetails.date`, `status`, `subscriptionId`, `planId`, `packageType`, … + **partial-unique** `perEventGuardKey` where `$type:objectId` (atomic "one active event per per-event subscription").
**Pre-save hooks:** (1) new-only — load Subscription+plan, verify `isActive`+`canCreateEvent()`, backfill `planId`/`packageType`, claim `perEventGuardKey` for per-event plans; (2) on status→`cancelled|deleted|completed` clear `perEventGuardKey`; (3) default reminder = event − 48h (Riyadh). **Method** `validatePackageLimits()`. **Statics** `findByHost`, `findUpcoming`.

### 2.2 UserModel (`collection: users`)

**Core:** `email`(unique sparse, case-insensitive collation) · `mobile`(**canonical phone**, unique sparse) · `phoneNumber`(**legacy mirror**, kept in sync) · `username` · `name`(business: the org name) · `avatar`(**S3 key**; business: the logo) · `password`(bcrypt, `select:false`) · email-verify + password-reset token fields · `role`(enum, default `guest`) · **`accountType`(enum `personal|business|null`, default null)** · `mustChangePassword` · `permissions:[String]` · `status`(pending|active|suspended|rejected|inactive) · `notificationPreferences:Mixed` · `subscription→Subscription` · `preferredLanguage(ar|en)` · `deletedAt`/`deletedBy`(soft-delete via `pre(/^find/)`).

**`profile` sub-docs:** `hostData{profileCompleted,bio,company,position,subscribedBefore}` · **`businessData{description}`** (only field — public name=`name`, logo=`avatar`) · `vendorData{...large...}` · `adminData{...}` · `guestData{...}`.

**`accountType` validator (fail-closed):** when `role==='host'`, value MUST be `personal` or `business` on save/create. (Query-level `$set` updates skip it; many service saves use `{validateBeforeSave:false}` — see §8.)

**`toPublicJSON()` (async) — exposes vs hides:**
- **Hides:** `password`, reset/verification tokens, `__v`, **and the entire `profile` object**.
- **Exposes:** signs top-level `avatar` (→ `signStoredImage`); flattens the role's subdoc into top-level **`roleData`** via `roleDataMap` (**keyed on `role` only — business gets `hostData`**); business special-case copies `businessData` to a top-level `businessData` key when `accountType==='business'`; signs vendor image fields **only for vendors**; everything else from `toObject()` survives (incl. `email`, `mobile`, `role`, `accountType`, `subscription`, `notificationPreferences`).

**Indexes** incl. `{role,accountType,status}`. **Methods:** `comparePassword`, `changedPasswordAfter`, `createPasswordResetToken`, `verifyEmailCode`, `incLoginAttempts`, `softDelete`, `toPublicJSON`. **Statics:** `findByIdentifier(+password)`, `emailExists`, `mobileExists`, `search`, `getStats`.

### 2.3 GuestModel (`collection: guests`) + GuestAccessTokenModel

**GuestModel:** `name`(req) · `phone`(req — **only contact channel**) · `event→Event`(req) · **`qrcode`**(unique sparse, auto-generated `guest_<id>_<ts>` in pre-save — **this is the RSVP invitation code**) · `status` enum `GUEST_STATUS` = `invited`(default)·`confirmed`·`declined`·`checked_in`·`no_show`·`maybe` · `rsvp{responded,respondedAt,response(pending|confirmed|declined|maybe),message,dietaryRestrictions,plusOnes}` · `checkIn{checkedIn,checkedInAt,checkedInBy,checkedInByStaff{token,name,phone}}` · `invitation{sent,sentAt,method,effectiveChannel,status,messageId,...,autoReminderSent...}` · `deleted`/`deletedAt`(soft-delete tombstone). **Hooks:** generate qrcode; auto-set `rsvp.responded` on status→confirmed/declined. **Statics:** `findByEvent`, `getEventStats`.

**GuestAccessTokenModel** — ⚠️ **POST-EVENT content access, NOT RSVP.** `guest→Guest` · `event→Event` · `type(post_event[default]|invitation|check_in)` · `token`(unique, 32-byte hex) · `expiresAt`(**TTL index** auto-deletes) · `isRevoked`/`revokedReason(rotation|manual|admin)` · `devices[]`. **Statics:** `createForGuest`, `validateToken`, `getTokenLink` → `${FRONTEND_URL}/${lang}/(post-event|staff)?token=...`, `revokeAllForEvent`.

> **Two distinct access mechanisms — do not conflate:** (1) **RSVP** is authorized by the plain `guest.qrcode` string; `POST /guests/:id/rsvp` asserts `guest.qrcode === invitationCode`. (2) **GuestAccessToken** is the post-event media link (created by the post-event module). The `/rotate-qr` and `/revoke-access` endpoints touch GuestAccessToken **only** — they do **not** affect a guest's ability to RSVP.

### 2.4 SubscriptionModel (`collection: subscriptions`)

`userId→User`(**owner**, req) · `planId→Plan`(req — **all limits/features come from populating this; nothing duplicated on the sub**) · `packageType(event|subscription|hybrid)` · `status` enum = `trial`(default)·`active`·`past_due`·`expired`·`cancelled`·`completed`·`pending`·`suspended`.

**POOL / quota fields (the rework heart):**
- `invitePool:Number` (default **null = unlimited**) — base invite entitlement (per-event AND pool plans). Purchased extra invites `$inc` directly into it.
- `compensationPool:Number` (default null) — **15%** of base (`COMPENSATION_PERCENTAGE`), set at creation/renewal.
- `invitesConsumed:Number` (default 0) — incremented per successful send; also bumped by partial-refund clawback.
- `firstSendAt:Date` (default null) — authoritative "sending started" flag for the per-event re-creation gate (**distinct from `invitesConsumed`**).
- **No `maxEvents`/`maxGuests`/`maxInvitesPerEvent` stored on the sub** — they come from `planId.limits` via virtuals. **Reminders-pool fields were REMOVED** in the rework.

Plus `activatedAt`/`expiresAt`, `cancelledAt`/`cancelReason`/`cancelAtPeriodEnd`, `pricePaid{amount,currency,discountCode,discountAmount}`, `usage{eventsCreated,totalGuests,guestsUsed,lastEventDate}`, `metadata:Mixed`(holds `paymentId`, `replacedBySubscription`, `replacedSubscriptionIds`, `carriedInvites`, ...). **Subscriptions have NO `deleted` flag** — terminated via `status='cancelled'`.

**Virtuals:** `planCode`, `planType`, `isActive`(active/trial && !expired), `invitesRemaining`(=`invitePool+compensationPool−invitesConsumed`, null if unlimited), `limits`(from plan), `eventsRemaining`, `maxInvites`/`maxGuests`(= total capacity, −1 unlimited — **NOT** maxInvitesPerEvent). **Methods:** `canCreateEvent()`(per-event blocked if `firstSendAt` set), `canAddGuests(count)`, `renew()`, `cancel()`, `getSummary()`, ~~`upgradeTo()`~~ (**dead — live changes use `changePlan`**). **Statics:** `findActiveForUser`, `createForUser`(canonical constructor), `getCapacityForEvent`, `findExpiring`(active only).

### 2.5 PlanModel + business models

**PlanModel:** `code`(unique) · `planType`(enum trial|basic_event|basic_monthly|premium_event|premium_monthly|business_event|business_quarterly|business_annual|unlimited) · `planFamily(basic|premium|business|null)` · `billingType(event|monthly|quarterly|annual|null)` · **`availableFor`(enum `host|business|platform_admin`, default host)** · `nameAr/En`, `descriptionAr/En` · `pricing{oneTime}` (**only `oneTime` — no `recurring`**) · `currency` · **`limits{maxEvents(−1=pool), maxInvitesPerEvent(obsolete), invitePool(base), durationDays, maxHosts}`** · `features{whatsAppTemplates}` · **`setupFeeAmount`**(business_event=1200 SAR, bundled=0) · `featureBullets{ar,en}` · `isActive`/`isPublic`/`sortOrder`. **Static** `getOrCreateByCode` (throws in prod/staging if missing; auto-creates in dev/test).

> ⚠️ **`availableFor:'whitelabel'` is NOT in the enum** (only `host|business|platform_admin`). The "keep whitelabel business plans" rule from the whitelabel-removal effort manifests here simply as **business** plans being retained.

**BusinessPlanAssignmentModel** — durable state machine for admin-assigning a business plan: `businessUserId`, `planId`, `mode(grant|checkout)`, `status`(11-state: pending_payment…active…refunded…superseded), `version`(optimistic lock), immutable price snapshots, checkout-link `tokenHash`, linkage (`paymentId`,`subscriptionId`). **Partial-unique** `{businessUserId}` where status ∈ actionable. Static `transition(id, from, expectedVersion, to, set)` (compare-and-set).

**BusinessSetupFeeModel** — one record per business (`businessUserId` unique). `status`(not_applicable|waived|pending|processing|paid|refund_pending|refunded|failed), `settled`(bool — terminal "never charge again"), `amount`(default **1200**). **Settles permanently on the FIRST activation of ANY business plan.**

---

## 3. API Contract (key endpoints)

Base `/api/v2`. Events router applies **global `protect` + `restrictTo(HOST, ADMIN, SUPER_ADMIN, MODERATOR)`**.

### 3.1 Events

| Method path | Extra middleware | Payload → Response |
|---|---|---|
| `GET /events/my-events` | — | query `page,limit,search,status,from,to` → `[event+counts]`+pagination |
| `GET /events/stats` | — | → `{totalEvents,activeEvents,completedEvents,totalGuests,confirmedGuests,checkedInGuests}` |
| `GET /events/subscription-info` | — | → `{hasSubscription,canCreateEvent,guestLimit,isGuestUnlimited,invitePool,invitesRemaining,eventsRemaining,...}` (admins → unlimited stub) |
| `GET /events/stats/:id` | `validateObjectId` | → single-event stats |
| `POST /events` | `requireSubscription, checkEventLimit, checkGuestLimit, uploadTemplateImage, parseFormDataJsonFields, validateZod(createEventSchema)` | `eventDetails,guestList[],staffList[],visualTemplate,taqnyatTemplate,guestReplies,launchSettings` + file → **201 `{event}`** |
| `GET /events/:id` | `validateObjectId` | → **`{event}`** (populates guestList, host, visual/taqnyat templateRef; enriches `event.subscription`) |
| `PATCH /events/:id/event-details` | `validateZod(updateEventDetailsSchema)` | partial details → `{event}` |
| `PATCH /events/:id/guest-list` | `requireSubscription, checkGuestLimit` | `{guestList[]}` → `{event,addedCount}` |
| `PATCH /events/:id/staff-list` | — | `{staffList[]}` → `{event}` |
| `PATCH /events/:id/step2` | `requireSubscription, checkGuestLimit` | `{guestList[], staffList[]\|supervisorsList[]}` (atomic) → `{event,addedCount}` |
| `PATCH /events/:id/invitation-settings` | `uploadTemplateImage, parseFormDataJsonFields` | `visualTemplate,taqnyatTemplate,guestReplies`+file → `{event}` |
| `PATCH /events/:id/launch-settings` | — | `{scheduledDate?,scheduledTime?}` — **does NOT flip status** → `{event}` |
| `PATCH /events/:id/reminder-settings` | — | `{customReminderTime?,scheduledDate?,scheduledTime?}` → `{event}` |
| `PATCH /events/:id/test-message` | `requireSubscription, idempotency` | `{phoneNumber,channel?}` → provider result |
| `POST /events/:id/retry-launch` | `idempotency` | → `{launched,reason?}` (409 if not failed/scheduled) |
| `POST /events/:id/resend-invite` | `requireSubscription, idempotency` | `{channel?,guestIds?}` → `{reminded,successful,failed}` (**pool-charged**) |
| `POST /events/:id/extra-reminder` | `requireSubscription, idempotency` | `{guestIds?}` → `{reminded,successful,failed}` (**pool-charged**) |
| `POST /events/:eventId/notify-staff` | `idempotency` | `{message?}` → `{sent,failed,total}` (NOT pool-charged) |
| `POST /events/:id/staff` · `PUT …/staff/:staffId` · `DELETE …/staff/:staffId` | per-route zod | staff CRUD |
| `DELETE /events/:id` · `POST /events/bulk-delete` | — | soft-delete |
| `GET /events/admin/all` · `PATCH /events/admin/:id/status` · `DELETE /events/admin/:id` | `requirePageAccess(EVENTS,...)` | admin ops |

### 3.2 Users (all `protect`)

`GET /users/profile` → `{user:toPublicJSON}` · `PATCH /users/profile` (multipart; `username,name,email,preferredLanguage,description?`(business only); files `avatar`,`businessLogo`; **phone NOT here**) · `PATCH /users/password` · `POST /users/profile/phone/send-otp` (rate-limited) · `PATCH /users/profile/phone` (`{phoneNumber,otp}`) · `DELETE /users/profile/vendorData/image` · `PATCH /users/profile/:section`(hostData|vendorData|businessInfo|contactInfo|documents) · `GET|PATCH /users/notification-preferences`.

### 3.3 Guests

**Public** (above `protect`): `GET /guests/invitation/:code` (= `guest.qrcode`) → `{guest, event:_formatEventForGuest}` · `POST /guests/:id/rsvp` (`{response,invitationCode(req),message?,plusOnes?}`, idempotent) → `{guest, response, pass?(if confirmed)}`.
**Protected (host management):** `GET /guests/events/:eventId` (paginated) · `POST /guests/events/:eventId` (`requireSubscription,checkGuestLimit` — `{name,phone}`) · `GET …/export` (xlsx) · `PATCH …/guests/:guestId` · `DELETE …/guests/:guestId` (**HARD delete** — see §8) · `POST …/guests/:guestId/rotate-qr` · `POST …/guests/:guestId/revoke-access`. **Authz is in the service** (`_eventScope`: admins unscoped, else `host===actorId`); no account-type distinction.

### 3.4 Subscriptions & Plans

**Subscriptions** (all `protect`): `GET /subscriptions/my-subscription` → `{subscriptions:[Summary], hasSubscription, subscription}` · `POST /subscriptions/admin/assign` (**SUPER_ADMIN**, idempotent — `{userId,planCode,notes?}`) → routes to `changePlan` · `GET /subscriptions/payments` (paginated) · `GET /subscriptions/payments/export` (xlsx). **No self-subscribe/cancel/upgrade endpoint — those go through `POST /payments/checkout`.**

**Plans** — admin: `GET /plans/admin/all`, `POST /plans/admin`, `PATCH /plans/admin/:code`, `DELETE /plans/admin/:code` (all `requirePageAccess(MANAGE_PLANS,...)`); `GET /plans/assignable?availableFor=host|business` (**gated by `isAdminRole` only, NOT MANAGE_PLANS** — because role `admin` has `MANAGE_PLANS:NONE`). **Public:** `GET /plans`, `/plans/business`, `/plans/host`, `/plans/landing`, `/plans/code/:code`, `/plans/:id`.

---

## 4. End-to-End Flows (how everything is processed)

> This is the part that crosses module silos — the most important section for feature planning.

### (a) Create event
`POST /events` → middleware `requireSubscription → checkEventLimit → checkGuestLimit → uploadTemplateImage → parseFormDataJsonFields → validateZod` → `controller.createEvent` builds `context={userId,userRole,subscription,file}` → **`events.crud.service.createEvent`**:
1. validate details + ≥1 guest; if not admin-skip, cross-module `SubscriptionsService.validateEventCreation` + resolve capacity via `Subscription.getCapacityForEvent`; enforce list cap = `invitePool+compensationPool` (**NO consumption**).
2. `assertEventDateFloor` (scheduling window).
3. set `host`/`createdBy`/`createdFor`; **freeze the stamp:** `subscriptionId`, `planId`, `guestLimit=-1`.
4. validate template field-values (`_validateVisualTemplateFieldValues` → `templateDataValidator`).
5. **business branding snapshot:** if owner is business → copy `owner.avatar` to event-owned S3 key, set `branding{logoKey,businessName}`, `invitationDeliveryMode='portal_link'`. Else `quick_reply`.
6. `Event.create` → **`createGuestsFromList`** (dedupe by normalized phone, `Guest.create` so the QR pre-save hook fires) → `event.save()` → `$inc usage.eventsCreated`. Pre-save hook claims `perEventGuardKey` for per-event plans. → best-effort `_notifyEventCreated` + audit. **Status defaults to `pending_scheduling`.**

### (b) Step 2 (guests + staff)
`PATCH /events/:id/step2` → controller normalizes `staffList ?? supervisorsList` → `events.step2.service.updateEventStep2`: scoped find, block completed/cancelled, list-cap via **`subscriptionEventAccess.findForEvent`** (the stamp reader), confirmed-floor guard (no shrink below confirmed/checked-in), diff by normalized phone → kept/create/update/delete, **atomic** (transaction, or standalone fallback with hand-rolled compensation that preserves QR/RSVP on removed guests), `$inc usage.guestsUsed/totalGuests`, revoke removed staff tokens. **Still no invite-pool consumption** (listing is free).

### (c) Schedule → launch → SEND (where the pool is consumed) ⭐
**This is the non-obvious spine.** The events module does NOT move an event to `scheduled`:
1. `PATCH /events/:id/launch-settings` only writes the `launchSettings` subdoc (with 24h edit-lock).
2. The **messaging** module's schedule-send route (`messaging.schedule.service.scheduleBulkSend`) sets `status='scheduled'` + `launchSettings`. That's what the cron polls.
3. **Cron** `scheduleEventLaunch` (`scheduledTasks.js`, every minute) finds due `scheduled` events → `runEventLaunch(event, 'cron-launch')`.
4. **`runEventLaunch`:** skip if no guests → `dispatchPolicy.assertCanDispatch(event,{requireInvites:true})` → filter to guests with `invitation.sent ≠ true` (idempotent across retries) → acquire `eventLock` + heartbeat → re-read, bail on terminal status → re-check subscription active → `attemptCount++` → channel resolution (whatsapp only if `taqnyatTemplate.templateRef`) → **`messagingService.sendBulk({guestIds,eventId,channel})`** → success ⇒ `status='live'`, `launchedAt`; throw ⇒ store `failureReason`, retries → `failed`.
5. **Pool check + decrement live inside `sendBulk`** (`messaging.send.service.js`):
   - **batch budget pre-check:** `remaining = invitePool+compensationPool−invitesConsumed`; if `notYetSent > remaining` → `AppError 402 INSUFFICIENT_INVITES` (unlimited plans skip).
   - **per-guest consume at send time** (`sendToGuest`): the atomic `Guest.updateOne({_id,'invitation.sent':{$ne:true}}, …)` that actually flips `sent` → (a) stamp `Subscription.firstSendAt` once, (b) **clamped** `$inc invitesConsumed` guarded by `$expr` so it can't exceed capacity. Double-charge-proof; oversends log at error level and go out **uncharged** rather than blocking.

> **Guests are NOT created at launch** — they already exist (create/step2). Launch only messages existing undelivered guests.

### (d) Update event post-launch
- `updateEventDetails`: blocks `live|published|completed|cancelled|archived`; 24h edit-lock blocks date/time/location when `scheduled` and <24h out; if date/time changes, re-asserts floor + re-validates stored schedule.
- `invitation-settings`/`launch-settings`/`reminder-settings`/`staff-list`: block only `completed|cancelled` (so `scheduled`/`live` edits allowed, subject to edit-lock).
- Post-launch re-sends use the dedicated **resend-invite / extra-reminder** endpoints (pool-charged), never the update endpoints.

### (e) Guest RSVP
Public `GET /guests/invitation/:code` (code = `guest.qrcode`) → portal view (`_formatEventForGuest` signs `branding.logoKey`). `POST /guests/:id/rsvp` asserts `guest.qrcode === invitationCode`, event must be `scheduled|live|published`, sets `guest.status`+`rsvp{...}`, fire-and-forget host notification, returns a boarding-pass `pass` when confirmed. (Idempotent: 409 on body-mismatch, 410 when no longer cached / event closed.)

### (f) Subscription acquisition (how a plan becomes a subscription)
- **Host self-service:** `POST /payments/checkout` → `checkout.service.checkout()` → on free/after-charge → `_fulfillBundle` → `_createSubscriptionFromCheckout` → **`subscriptionLifecycle.changePlan(userId, plan, {reason:'self_service_checkout', pricePaid, paymentRecord})`** → back-references `payment.subscriptionId`, sets `user.subscription`, stamps `metadata.checkoutFinalizedAt` (idempotent across 3DS-resume/webhook). (Deeper Moyasar charge/webhook plumbing is the payments module — explicit boundary.)
- **Business:** `business.assignment.service._activateSubscription` → `changePlan(...)`, driven by the `BusinessPlanAssignment` state machine (grant mode → active directly; checkout mode → pending_payment → … → paid → active via `transition`). **Setup fee settles here**, never at host checkout.

### (g) Plan change & "old event spends old pool" ⭐
`subscriptionLifecycle.changePlan` is the ONE path. It **never mutates** an existing sub — it:
1. resolves+validates the plan (`_assertPlanAssignableToUser`: business→`availableFor:'business'`, host→`'host'`, never `platform_admin`).
2. `Subscription.createForUser` (computes pool from plan; trial → +14d).
3. **business-only invite carryover** into the new `compensationPool`; hosts carry nothing.
4. `User.subscription = newId`.
5. **cancels each old active** with `status='cancelled'` + **`metadata.replacedBySubscription = newId`**.

An event stamped with the OLD `subscriptionId` keeps drawing from the OLD (now-cancelled) pool, because `subscriptionEventAccess.findForEvent` → `isReplacedSubscriptionForEvent` (sub is cancelled, has `replacedBySubscription`, and its `_id === event.subscriptionId`) treats it as still usable **for that event only**. New events use the new sub.

### (h) Refund / clawback (`deductInvites`)
`payments.service.issueRefund({paymentId, amount, deductInvites})`: persists a durable pending-refund intent → after provider success, in a transaction:
- **full refund** → linked active/trial sub set `cancelled` (whole pool blocked; does **not** also deduct invites).
- **partial refund + `deductInvites>0` + pool-bearing sub** → `invitesConsumed = min(invitesConsumed + deduct, capacity)`.
**No release on cancel/delete:** `invitesConsumed` already reflects only successful sends, so cancellation never refunds invites; `_freeEventSlot` only frees the per-event slot, never invites.

---

## 5. Quota / Pool model (the rework heart)

Unified: per-event AND pool plans carry `invitePool + compensationPool` + sub-level `invitesConsumed`. They differ **only** by `maxEvents` (per-event=1, pool=−1). `maxInvitesPerEvent` is **obsolete** (don't read it). `invitesRemaining = invitePool + compensationPool − invitesConsumed`; `invitePool === null` ⇒ truly unlimited. Purchased extra invites fold into `invitePool`.

**Two gates:** (1) **guest-list cap** (adding names) checks `totalGuests ≤ invitePool+compensationPool` — a name costs nothing; (2) **send budget** (any send) checks `selectedToSend ≤ invitesRemaining` before dispatch.

**Consume at SEND time only**, per-guest, idempotent, only on a returned messageId, clamped at capacity:
- **initial send** — `messaging.send.service.sendToGuest`.
- **resend / extra-reminder** — `events.resend.service._assertInviteBudget` (pre-check, 402) + `_chargeInvites` (clamped `$inc`, stamps `firstSendAt` once).

**`firstSendAt` ≠ `invitesConsumed`:** the per-event "permanently used" gate keys on `firstSendAt` (set on first real dispatch, even uncharged), NOT `invitesConsumed` — because a refund clawback bumps `invitesConsumed` without any send and must not lock an unused per-event plan.

---

## 6. Business account (`role:'host'` + `accountType:'business'`)

Concrete forks (everything else treats business as an ordinary host):
1. **Schema validator** — a `role:'host'` doc must carry `accountType ∈ {personal,business}` (fail-closed on save).
2. **`profile.businessData.description`** — the only business-only profile field (name=`name`, logo=`avatar`).
3. **`toPublicJSON`** surfaces top-level `businessData` only when business (but `roleData` stays `hostData`).
4. **`users.service.updateMyProfile`** — only business may write `description`.
5. **Event branding/delivery snapshot** (`events.crud.service`) — business → `invitationDeliveryMode='portal_link'` + copy logo to event-owned S3 key + `branding{logoKey,businessName}`; consumed by `guests.service._formatEventForGuest` on the public invite page. **This is the most consequential fork for the guest flow.**
6. **Subscriptions/plans** — `availableFor` gating (`_assertPlanAssignableToUser`), invite **carryover** on plan change, the `BusinessPlanAssignment` state machine, and the once-per-account `BusinessSetupFee` (1200 SAR, settle-on-first-activation, **never charged at host checkout**).
7. Out-of-scope business-only modules that branch on `accountType`: `business.assignment.service`, `admin.businesses.service`, `messaging.dispatchPolicy.service`, `checkout.service`. **Within users/guests, only #1–#5 fork; guest endpoints don't branch at all.**

---

## 7. Cross-cutting connection map

| Seam | Where | What |
|---|---|---|
| Events → Subscriptions (create gate) | `events.crud` → `SubscriptionsService.validateEventCreation`, `Subscription.getCapacityForEvent` | list cap, no consume |
| Events → Subscriptions (stamp read) | step2/guests/resend → `subscriptionEventAccess.findForEvent` | resolve the event's bound sub |
| Events → Subscriptions (consume) | `messaging.send.sendToGuest`, `events.resend._chargeInvites` | `firstSendAt` + clamped `invitesConsumed` |
| Events → Guests | `events.guests.createGuestsFromList` (bulk, `Guest.create`), step2 diff | single-add lives in guests module; **bulk lives in events module** |
| Events → Templates | `events.settings`/`crud` → `Template.findById` + `templateDataValidator` | field-value validation |
| Events → Messaging | `sendBulk`, `assertCanDispatch`, schedule-send, auto-reminder | **the schedule→launch→send spine** |
| Subscriptions → Payments | `checkout.service` → `changePlan`; `payments.issueRefund` | acquisition + clawback |
| Subscriptions → Users | `changePlan` sets `User.subscription`, `subscribedBefore`; business keys off `accountType` | ownership + business gating |
| Plans → Admin | `requirePageAccess(MANAGE_PLANS)`; `/assignable` gated by `isAdminRole` | plan CRUD + assign |
| Guests → Business branding | `guests.service._formatEventForGuest` signs `event.branding.logoKey` | public invite page |

---

## 8. Gotchas & traps for feature planning

1. **Pool consumed at SEND time, per-guest, never at create.** Create/step2/guest-list only check a list cap. A quota-touching feature must hook the **send** path (`messaging.send` + `events.resend`), not create.
2. **`/launch-settings` does NOT launch.** It writes a subdoc. The `status→scheduled` transition (which arms the cron) is owned by **messaging** (`scheduleBulkSend`). Easy to miss.
3. **The "stamp" is `event.subscriptionId`+`planId`, frozen at create.** `subscriptionEventAccess.service` is a *reader* (no writes); it's what makes an old event keep spending the old/replaced pool. Resolve an event's sub via `findForEvent`, not "the user's current active sub".
4. **`firstSendAt` ≠ `invitesConsumed`** for the per-event re-creation gate (refund clawback bumps consumed without a send).
5. **`perEventGuardKey` partial-unique index** enforces "one active event per per-event subscription" atomically; create races → E11000 → `PackageLimitError`. Bulk/soft-delete writes must clear it inline (they bypass save hooks).
6. **Everything event-side is soft-delete** (`status='deleted'`, guest tombstones) to preserve QR/RSVP/check-in. **Subscriptions are NOT soft-deleted** (cancelled instead). **But `guests.service.deleteGuest` HARD-deletes** (`findByIdAndDelete`) despite the tombstone fields existing — a real inconsistency.
7. **`mustChangePassword` is NOT enforced in `protect`** (stale-doc claim). Live behavior: a one-time advisory on login, consumed immediately. To use it as a hard gate you must add the enforcement.
8. **No `business` role** — `role:'host'` + `accountType:'business'`. The `research-account-and-dashboard.md` proposal to add a `business` role was **not** implemented.
9. **`availableFor:'whitelabel'` doesn't exist** in the Plan enum (`host|business|platform_admin`). "Keep whitelabel business plans" = keep **business** plans.
10. **`maxInvitesPerEvent` is obsolete but still in the schema** (some legacy fallbacks reference `?? 50`). Build on `invitePool`/`invitesRemaining`/`maxGuests`.
11. **Setup fee is never charged at host checkout** (zero `setupFee` refs in `checkout.service`); only the business-assignment flow settles it, permanently on first activation.
12. **`Subscription.upgradeTo()` is dead code**; all plan changes go through `changePlan`. `assignSubscriptionLegacy` / `_createSubscriptionFromCheckoutLegacy` / `_activateSubscriptionLegacy` are superseded legacy variants.
13. **User images are S3 keys served as PUBLIC bucket URLs, not presigned** (`signStoredImage`) — the backend IAM user has an explicit `GetObject` Deny that 403s presigned URLs. Don't "fix" this to presign. `toPublicJSON` signs `avatar` for everyone but role images only for vendors.
14. **`user.set(path,value)` is mandatory for nested profile writes** (direct subdoc assignment is silently dropped). Most user saves use `{validateBeforeSave:false}` — schema validators (incl. the `accountType` rule) don't run on those paths.
15. **Consume can race / under-charge — logged at error level, not blocked, no auto-reconciliation.** Resend/extra-reminder have **no server idempotency** (intentional/repeatable; frontend debounces), so a double-click could double-charge.
16. **`templateRefResolver.js` is dead within events** (post-event uses it). Don't assume it's on the create/update spine.
17. **`getEventById`/`getSingleEventStats` enrich `event.subscription` from the event OWNER's sub**, not the viewing admin's — so admin-on-behalf UIs gate on the host's remaining invites.
18. **`requireSubscription` middleware only proves the caller has *a* sub** — it does NOT block sends on terminal events / owner mismatch / under-refund. The real gate is `dispatchPolicy.assertCanDispatch` (wired into resend/extra-reminder + the cron). Any new send path must call it.
19. **`updateEventStep2` requires BOTH `guestList` and a staff key** (defaulting a missing one to `[]` would silently empty a list). Use `/guest-list` or `/staff-list` for one-sided edits.
20. **Error-envelope inconsistency:** `sendSuccess` emits both `success` and `status`, but subscription middleware 403s bypass the helper and return raw `{success:false, message}` (no `status`).
