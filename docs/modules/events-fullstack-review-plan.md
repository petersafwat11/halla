# Events — Full-Stack Review Plan

**Module:** events
**Generated:** 2026-05-07
**Prompt:** docs/implementation/MODULE_FULLSTACK_REVIEW_PROMPT.md
**Status:** Awaiting green light · NOT IMPLEMENTED YET

---

## 0. Executive Summary

- **29 total endpoints** in module (27 in `events` routes + 2 cross-mounted from `staff` module)
- **0 candidates for outright deletion** — no exact duplicate routes detected; the `updateGuestList` / `updateStaffList` legacy pair is superseded by `step2` but still in active use, so they stay until consumers are migrated (tracked as "deprecate-after-migration" rather than "delete now")
- **8+ Swagger drift findings** (1 missing block, multiple inline schemas that should be `$ref`, missing error codes, missing component definitions for `CreateEventRequest`, etc.)
- **3 backend file-size violations** (service 2498 > 600, routes 1031 > 400, controller 532 > 300)
- **4 web file-size violations** (Summary.js 715, StepTwo.js 472, AdminGuestTable.jsx 343, EventsTable.jsx 314 — all > 250)
- **1 mobile file-size violation** (UpdateEventScreen.js 597 > 350)
- **6 web/mobile API consumption mismatches** (mostly mobile-side: hardcoded path strings instead of `ENDPOINTS.EVENTS.*`, response-shape fallback chains)
- **~10 data-mapping bugs / fallback chains** (4 in mobile `eventsService2.js`, 4 in web `EventsTable.jsx` + `CardsWrapper.js`, ≥2 stemming from backend response inconsistency)
- **Major missing safeguards:**
  - **0 Joi schemas** — entire module lacks `events.validation.js`
  - **11 mutations missing `logAudit`** (guests, staff, bulk-delete, settings, test-message, notify-staff)
  - **2 SMS routes lack idempotency** (`PATCH /:id/test-message`, `POST /:eventId/notify-staff`)
  - **1 cross-collection write lacks transaction** (`POST /bulk-delete` — Guest + Event)
  - **1 broken D-R3 invariant** (`DELETE /:eventId/staff/:staffId` does NOT call `_revokeRemovedStaffTokens` — removed staff retain valid tokens for 48h)
  - **1 whitelabel isolation gap** (`GET /export/events` lacks scope)
- **~70 comment-hygiene markers to remove** (37 in backend `events.service.js` — PHASE/W0/W1/W2/M/FLOW/BUG; 31 in mobile services + hooks; 1 in web `EventFailureBanner.jsx`)
- **Estimated effort: L (Large)** — events is the largest module in the codebase. The backend split alone is ~3 days of careful refactor with style preservation; web has 4 components to split; mobile has 13 hardcoded paths plus a 597-line screen split.

**Risk profile:** the backend service split is high-risk because callers across web + mobile + cross-module imports may break. The plan keeps `events.service.js` as a thin façade re-exporting from `events.<area>.service.js` files so external imports stay valid.

---

## 1. Endpoint Inventory

| # | Method | Path | Controller | Service | Middleware chain | Joi | Swagger | RBAC | Audit | Notif | Web hook | Mobile hook | Status |
|---|--------|------|------------|---------|------------------|-----|---------|------|-------|-------|----------|-------------|--------|
| 1 | GET | `/events/my-events` | `getMyEvents` | `getMyEvents` | protect, restrictTo, filterByWhitelabel | ✗ | ✓ | restrictTo | ✗ | ✗ | `useMyEvents` | `useEventStats` (dual-fetch) | KEEP |
| 2 | GET | `/events/stats` | `getEventStats` | `getEventStats` | protect, restrictTo, filterByWhitelabel | ✗ | ✓ | restrictTo | ✗ | ✗ | `useEventStats` | `useEventStats` | KEEP |
| 3 | GET | `/events/subscription-info` | `getSubscriptionInfo` | `getSubscriptionInfo` | protect, restrictTo | ✗ | ✓ | restrictTo | ✗ | ✗ | `useEventSubscriptionInfo` | (via service) | KEEP |
| 4 | GET | `/events/stats/:id` | `getSingleEventStats` | `getSingleEventStats` | protect, restrictTo, validateObjectId | ✗ | ✓ | service-scoped | ✗ | ✗ | `useSingleEventStats` | `useSingleEventStats` | KEEP |
| 5 | GET | `/events/export/events` | `exportEventsAsExcel` | `exportEventsAsExcel` | protect, restrictTo | ✗ | ✓ | implicit host | ✗ | ✗ | `useEventMutation('exportEvents')`* | `exportEvents` | KEEP — needs whitelabel scope |
| 6 | GET | `/events/export/:id/guests` | `exportEventGuestsAsExcel` | `exportEventGuestsAsExcel` | protect, restrictTo, validateObjectId | ✗ | ✓ | implicit host | ✗ | ✗ | (linked) | `exportEventGuests` | KEEP |
| 7 | POST | `/events` | `createEvent` | `createEvent` | protect, restrictTo, requireSubscription, checkEventLimit, checkGuestLimit, injectWhitelabel, uploadTemplateImage | ✗ | ✓ | subscription gate | ✓ | ✓ | `useCreateEvent` | `useCreateEvent` | KEEP — needs Joi |
| 8 | GET | `/events/:id` | `getEventById` | `getEventById` | protect, restrictTo, validateObjectId | ✗ | ✓ | scoped | ✗ | ✗ | `useEvent` | `getEventById` (service) | KEEP |
| 9 | PATCH | `/events/:id/event-details` | `updateEventDetails` | `updateEventDetails` | protect, restrictTo, validateObjectId | ✗ | ✓ | scoped | ✓ | ✗ | `useUpdateEventDetails` | `updateEventDetails` | KEEP |
| 10 | PATCH | `/events/:id/guest-list` | `updateGuestList` | `updateGuestList` | protect, restrictTo, validateObjectId | ✗ | ✓ | scoped | ✗ | ✗ | `useUpdateGuestList` | `updateGuestList` | KEEP — superseded by `/step2` for new code, kept for editing existing events |
| 11 | PATCH | `/events/:id/staff-list` | `updateStaffList` | `updateStaffList` | protect, restrictTo, validateObjectId | ✗ | ✓ | scoped | ✗ | ✗ | `useUpdateStaffList` | `updateStaffList` | KEEP — same as #10 |
| 12 | PATCH | `/events/:id/step2` | `updateEventStep2` | `updateEventStep2` | protect, restrictTo, validateObjectId, requireSubscription, checkGuestLimit | ✗ | ✓ | scoped + tx | ✗ | ✗ | `useUpdateEventStep2` | `useUpdateEventStep2` | KEEP — canonical atomic update |
| 13 | PATCH | `/events/:id/invitation-settings` | `updateInvitationSettings` | `updateInvitationSettings` | protect, restrictTo, validateObjectId, uploadTemplateImage | ✗ | ✓ | scoped | ✗ | ✗ | `useUpdateInvitationSettings` | `useUpdateInvitationSettings` | KEEP |
| 14 | PATCH | `/events/:id/launch-settings` | `updateLaunchSettings` | `updateLaunchSettings` | protect, restrictTo, validateObjectId | ✗ | ✓ | scoped + edit-lock | ✗ | ✗ | `useUpdateLaunchSettings` | `useUpdateLaunchSettings` | KEEP |
| 15 | PATCH | `/events/:id/test-message` | `sendTestMessage` | `sendTestMessage` | protect, restrictTo, validateObjectId, requireSubscription | ✗ | ✓ | implicit host | ✗ | ✗ | `useSendTestMessage` | `useSendTestMessage` | KEEP — needs idempotency |
| 16 | POST | `/events/:eventId/notify-staff` | `notifyStaff` | `notifyStaff` | protect, restrictTo, validateObjectId | ✗ | ✓ | implicit host | ✗ | ✗ | `useNotifyStaff` | `useNotifyStaff` | KEEP — needs idempotency |
| 17 | DELETE | `/events/:id` | `deleteEvent` | `deleteEvent` | protect, restrictTo, validateObjectId | ✗ | ✓ | implicit host | ✓ | ✓ | `useDeleteEvent` | `useDeleteEvent` (web) / `deleteEvent` (mobile) | KEEP |
| 18 | POST | `/events/bulk-delete` | `bulkDeleteEvents` | `bulkDeleteEvents` | protect, restrictTo, validateArray, validateObjectIdArray | ✗ | ✓ | implicit host | ✗ | ✗ | `useBulkDeleteEvents` | `bulkDeleteEvents` | KEEP — needs tx + audit |
| 19 | POST | `/events/:eventId/guests` | `addGuestToEvent` | `addGuestToEvent` | protect, restrictTo, validateObjectId, requireSubscription, checkGuestLimit | ✗ | ✓ | implicit | ✗ | ✗ | `useAddGuest` | `addGuest` | KEEP |
| 20 | PUT | `/events/:eventId/guests/:guestId` | `updateEventGuest` | `updateEventGuest` | protect, restrictTo, validateObjectId×2 | ✗ | ✓ | scoped | ✗ | ✗ | `useUpdateGuest` | `updateGuest` | KEEP |
| 21 | DELETE | `/events/:eventId/guests/:guestId` | `deleteEventGuest` | `deleteEventGuest` | protect, restrictTo, validateObjectId×2 | ✗ | ✓ | scoped | ✗ | ✗ | `useDeleteGuest` | `deleteGuest` | KEEP |
| 22 | POST | `/events/:eventId/staff` | `addStaffToEvent` | `addStaffToEvent` | protect, restrictTo, validateObjectId, requireSubscription | ✗ | ✓ | scoped | ✗ | ✗ | `useAddStaff` | `addStaff` | KEEP |
| 23 | PUT | `/events/:eventId/staff/:staffId` | `updateStaff` | `updateStaff` | protect, restrictTo, validateObjectId×2 | ✗ | ✓ | scoped | ✗ | ✗ | `useUpdateStaff` | `updateStaff` | KEEP |
| 24 | PUT | `/events/:eventId/staff/:staffId/status` | `updateStaffStatus` | `updateStaff` | protect, restrictTo, validateObjectId×2 | ✗ | ✓ | scoped | ✗ | ✗ | `useUpdateStaffStatus` | (calls updateStaff) | MERGE-WITH-#23 (path stays; controller is a thin wrapper) |
| 25 | DELETE | `/events/:eventId/staff/:staffId` | `deleteStaff` | `deleteStaff` | protect, restrictTo, validateObjectId×2 | ✗ | ✓ | scoped | ✗ | ✗ | `useDeleteStaff` | `deleteStaff` | KEEP — **must call `_revokeRemovedStaffTokens`** |
| 26 | POST | `/events/:eventId/staff/:staffId/revoke` | (staff module) `revokeStaffToken` | (staff service) | protect, restrictTo, validateObjectId×2, idempotency | ✗ | ✗ | explicit | ✗ | ✗ | (none — admin) | `revokeStaffAccess` | KEEP — needs Swagger block |
| 27 | GET | `/events/:eventId/staff-tokens` | (staff module) `listStaffTokens` | (staff service) | protect, restrictTo, validateObjectId | ✗ | ✓ | implicit | ✗ | ✗ | (admin/host) | `listStaffTokens` | KEEP |
| 28 | POST | `/events/:id/retry-launch` | `retryLaunch` | `retryEventLaunch` | protect, restrictTo, validateObjectId, idempotency | ✗ | ✓ | explicit + scoped | ✓ | ✗ | `useRetryLaunch` | `retryLaunch` | KEEP |
| 29 | GET | `/events/admin/all` | `getAllEvents` | `getAllEvents` | protect, restrictTo, requirePageAccess(EVENTS, "view"), filterByWhitelabel | ✗ | ✓ | page-scoped | ✗ | ✗ | `useAdminEvents`* | `useAdminEventsInfinite` | KEEP |
| 30 | PATCH | `/events/admin/:id/status` | `adminUpdateEventStatus` | `updateEventStatus` (isAdmin=true) | protect, restrictTo, validateObjectId, requirePageAccess(EVENTS, "update") | ✗ | ✓ | page-scoped | ✗ | ✓ | `useAdminEventMutation('updateStatus')` | (admin) | KEEP — needs explicit `logAudit` |
| 31 | DELETE | `/events/admin/:id` | `adminDeleteEvent` | `deleteEvent` (isAdmin=true) | protect, restrictTo, validateObjectId, requirePageAccess(EVENTS, "delete") | ✗ | ✓ | page-scoped | ✓ | ✓ | `useAdminEventMutation('delete')` | (admin) | KEEP |

**Legend:** KEEP, DELETE-DUPLICATE-OF-#N, RENAME, MERGE-WITH-#N

\* `useAdminEvents` lives in `useAdmin.js`, not `useEvents.js` (admin hooks are co-located in the admin barrel).

**Cross-cutting note on the `step2` vs `guest-list`/`staff-list` pair:** the canonical atomic write is `PATCH /events/:id/step2` (route #12). Routes #10 and #11 still exist and are still imported by web `useUpdateGuestList` / `useUpdateStaffList` and mobile `updateGuestList` / `updateStaffList`. The plan does **not** delete them — they cover the "edit only guests" / "edit only staff" sub-flows. They DO need a `// kept for partial-update flows; full guest+staff replace uses /step2` clarification (one line) and the plan flags any consumer that uses them where `/step2` would be cleaner.

---

## 2. Backend Findings

### 2.1 File-size violations

- **`events.service.js` — 2498 lines (cap 600, 4.17×).** Proposed split into 7 sub-services, with the canonical `events.service.js` becoming a thin façade that re-exports the public API so external importers (`createEvent`, `getEventById`, etc.) keep working unchanged:

  | Sub-service | ~Lines | Owns |
  |-------------|--------|------|
  | `events.crud.service.js` | ~450 | `getMyEvents`, `getAllEvents`, `getEventById`, `createEvent`, `deleteEvent`, `bulkDeleteEvents`, `updateEvent`, `updateEventStatus`; helpers `_buildScopedEventQuery`, `_formatEvent`, `_formatEventAdmin`, `_getWhitelabelHostIds` |
  | `events.guests.service.js` | ~400 | `createGuestsFromList`, `updateGuestList`, `addGuestToEvent`, `updateEventGuest`, `deleteEventGuest`, `updateGuestStatus`, `addGuests` |
  | `events.staff.service.js` | ~350 | `updateStaffList`, `addStaffToEvent`, `updateStaff`, `updateStaffStatus`, `deleteStaff`, `notifyStaff`, `_revokeRemovedStaffTokens` |
  | `events.step2.service.js` | ~400 | `updateEventStep2` (transaction + compensation block) |
  | `events.settings.service.js` | ~300 | `updateEventDetails`, `updateInvitationSettings`, `updateLaunchSettings`, `sendTestMessage`, `_checkEditLock`, `_validateVisualTemplateFieldValues` |
  | `events.stats-export.service.js` | ~250 | `getEventStats`, `getSingleEventStats`, `getSubscriptionInfo`, `exportEventsAsExcel`, `exportEventGuestsAsExcel` |
  | `events.launch.service.js` | ~200 | `retryEventLaunch`, `_notifyEventStatusChange`, `_notifyEventCreated` |
  | `events.service.js` (façade) | ~80 | `module.exports = { ...require('./events.crud.service'), ...require('./events.guests.service'), ... }` |

- **`events.routes.js` — 1031 lines (cap 400, 2.58×).** Proposed split:
  - `events.routes.js` (~500 lines) — host-facing CRUD + guests + staff + settings
  - `events.admin.routes.js` (~150 lines) — `/admin/all`, `/admin/:id/status`, `/admin/:id`
  - The original `events.routes.js` becomes the parent that mounts the admin router with `router.use('/admin', adminRouter)` (existing path is preserved exactly)

- **`events.controller.js` — 532 lines (cap 300, 1.77×).** Proposed split:
  - `events.controller.js` (~370 lines) — host CRUD, guests, staff, settings, stats, exports
  - `events.admin.controller.js` (~80 lines) — `getAllEvents`, `adminUpdateEventStatus`, `adminDeleteEvent`
  - Keep the canonical `events.controller.js` re-exporting both for any external imports.

- `templateDataValidator.js` (85) and `templateRefResolver.js` (85) are within limits.

**Style/behaviour preservation:** the façade pattern means **no caller of `require('../events/events.service')` changes** — the external API surface is byte-identical post-split.

### 2.2 Swagger drift

- **Missing block** — `POST /events/:eventId/staff/:staffId/revoke` (route #26) has no `@swagger` JSDoc. Add one referencing the standard idempotency response.
- **Inline schemas that should be `$ref`s** — every PATCH endpoint inlines `requestBody.schema.type: object` with no shape. Define and reuse:
  - `CreateEventRequest` (referenced in JSDoc but not defined in `config/swagger.js`)
  - `EventUpdateRequest`, `GuestUpdateRequest`, `StaffUpdateRequest`
  - `Step2Request` (`{ guestList[], staffList[] }`)
  - `LaunchSettingsRequest`, `InvitationSettingsRequest` (multipart hint)
- **Missing error component schemas** — codes thrown by the service that have no documented response: `EVENT_EDIT_LOCKED`, `GUEST_LIST_BELOW_CONFIRMED`, `EVENT_NOT_RETRYABLE`, `GUEST_LIMIT_EXCEEDED`. Add them under `components.responses`.
- **Status-code mismatch** — Swagger blocks for guest-limit endpoints document `403` for "Guest limit exceeded"; `checkGuestLimit` middleware actually returns `400 PackageLimitError`. Either fix the doc or fix the middleware (the doc is wrong; middleware is correct).
- **PageParam/LimitParam/IdParam reuse** — multiple GET endpoints redefine `page`/`limit`/`id` parameters inline. Reference `#/components/parameters/PageParam`, `LimitParam`, `IdParam`.
- **No path-mismatch found** — every documented path matches its mounted route after manual trace.

### 2.3 Missing middleware / safeguards

- **0 routes have Joi validation.** Module has no `events.validation.js`. See §2.6 for the proposed schemas.
- **`DELETE /events/:eventId/staff/:staffId` does NOT call `_revokeRemovedStaffTokens`** — `events.service.js:2219–2232`. Removed staff retain valid `StaffAccessToken` for up to 48h. **Critical D-R3 invariant violation.**
- **`GET /events/export/events` lacks whitelabel scope** — `events.service.js:1186–1213`. A `WHITELABEL_ADMIN` calling this can theoretically receive events outside their whitelabel because the export query filters only by `host: req.user._id` without `req.user.whitelabelId` injection.
- **`POST /events/:eventId/notify-staff` lacks idempotency middleware** — token + SMS loop at `events.service.js:2274–2307`. A retried request after a partial failure double-sends SMS to staff already contacted. Add `idempotency({ scope: 'events.notify_staff' })`.
- **`PATCH /events/:id/test-message` lacks idempotency middleware** — external SMS write. Add `idempotency({ scope: 'events.test_message' })`.
- **`POST /events/bulk-delete` is NOT wrapped in a transaction** — `events.service.js:1264–1272` does sequential `Guest.deleteMany` then `Event.deleteMany` with no session. If the second fails, guest docs are orphaned. Wrap in `mongoose.startSession()` like `deleteEvent` already does.
- **`POST /events/:eventId/notify-staff` has no transaction across StaffAccessToken create + SMS** — if the token is created and SMS fails the token is orphaned. Either wrap in tx, or accept the trade-off and document it (SMS is non-revertible anyway).
- **No `logAudit` on**: routes #10–11, #13–16, #18–25, #30 (11 mutations total). The pattern is the same as in `createEvent` / `deleteEvent` — list at §2.5.
- **No notifications on**: guest add/remove (#19, #21), staff add/remove (#22, #25), invitation/launch settings change (#13, #14), bulk delete (#18). Decide which of these warrant notifications (small spec call-out in §6).
- **`GET /events/subscription-info` (#3) has no whitelabel guard** — returns the subscription of the calling user without checking that, for `WHITELABEL_MODERATOR`, the subscription belongs to a host inside their whitelabel. Low risk because most moderators don't have a personal subscription, but the assertion isn't enforced.
- **No staff limit gate on `POST /events/:eventId/staff` (#22)** — if plans gate staff-count this is missing. Confirm whether plans gate staff count; if yes, add `checkStaffLimit`.

### 2.4 Duplicate / dead endpoints

- **No exact duplicates identified.** The closest pair is `(updateGuestList, updateStaffList)` vs `updateEventStep2`. The first two are partial-update flows still used by the web `update-event` wizard's per-step save; do NOT delete. The plan flags this as "evaluate after the wizard is migrated to a single `step2` save" rather than "delete now."
- `updateStaffStatus` (route #24) is a thin wrapper around `updateStaff` (route #23) — keep as a separate route for path clarity but flag the controller wrapper as redundant (one line of forwarding) and let it stand.

### 2.5 Service / controller violations

- **`events.controller.js:164–181`** — JSON.parse of multipart string fields (`guestList`, `eventData`, `staffList`) inside the controller, wrapped in a try/catch that builds a manual `ValidationError`. Move the parsing to a small `parseFormDataJsonFields` middleware in `shared/middleware/validation` (re-usable by `updateInvitationSettings` too).
- **`events.controller.js:278–290`** — manual array-required validation. Replace with Joi schemas (see §2.6).
- **`events.controller.js:304–322`** — JSON parsing for `updateInvitationSettings` FormData fields. Same fix as above.
- **`events.controller.js:487`** — direct `res.status(200).json({...})` for `notifyStaff`. Replace with `sendSuccess(res, result)`.
- **`events.service.js`**:
  - Lines 445, 463, 934, 941 — plain `throw new Error(...)`. Replace with `NotFoundError` / `PackageLimitError` / `AppError`.
  - Lines 691, 1005-style — string-literal role arrays `["admin","super_admin"]`. Replace with `[ROLES.ADMIN, ROLES.SUPER_ADMIN]`.
  - Lines 1123-1124, 1193, 1224-1229, 1431-1434 — `findOne`/`find` with `.populate(...)` but no `.lean()` on read-only queries. Add `.lean()`.
  - Lines 1039-1046 — `require('...').isPerEventPlan(...)` lazy require. Move to top-level imports.
  - Lines 597, 627–629, 832, 837, 869, 881, 1428, 1518, 1773, 1840, 1857, 2457 — `console.error` usage. Replace with `logger.error(...)` from `shared/utils/logger`. Some are inside best-effort catch blocks for notifications/compensation — those should be `logger.warn(..., { event, err })` rather than `console.error`.
  - **`templateRefResolver.js:65`** — `console.warn`. Replace with `logger.warn`.

### 2.6 Validation gaps — proposed `events.validation.js`

Create `labbe-backend-/src/modules/events/events.validation.js` with these Joi schemas (full bodies in §7.A.3 below):

- `createEventSchema` — for `POST /events`. Multipart-aware (allows JSON-stringified nested objects via `Joi.alternatives().try(Joi.string(), Joi.object())`).
- `updateEventDetailsSchema` — partial; `.min(1)`.
- `updateGuestListSchema`, `updateStaffListSchema` — array of `{name, phone, email?}`.
- `updateStep2Schema` — `{ guestList: [...].required(), staffList: [...].required() }`.
- `updateInvitationSettingsSchema` — multipart-aware with template fields.
- `updateLaunchSettingsSchema` — `{ scheduledDate, scheduledTime, launchChannel, ... }`.
- `sendTestMessageSchema` — `{ phoneNumber, channel? }`.
- `addGuestSchema`, `updateGuestSchema`.
- `addStaffSchema`, `updateStaffSchema`, `updateStaffStatusSchema` (`{status: enum}`).
- `bulkDeleteSchema` — `{ eventIds: array().items(objectId).min(1).max(100).required() }`.
- `adminUpdateStatusSchema` — `{ status: valid(...EVENT_STATUS).required() }`.
- `notifyStaffSchema` — empty body or `{ message? }` if a custom message is allowed (verify with code).

**Shared validators** — Saudi phone (`pattern /^5\d{8}$/`), ObjectId, ISO date already exist in `shared/utils/validators` (verify; if not, propose creating the file).

### 2.7 Comment hygiene

**Total markers in module: 37** (PHASE-/W0-/W1-/W2-/M-/FLOW-/BUG-). Remove every one of them — keep only the *why* if a reader couldn't infer it from the code. Worst offenders (sample):

- `events.service.js:17–18` — `// M-5: every export/notification helper uses formatRiyadh...`
- `events.service.js:30–32` — `// Phase 4c W0-VISUAL-BACKEND...`
- `events.service.js:81–105` — full docstring with phase marker
- `events.service.js:110` — `// FLOW-11-F03: deduplicate by normalized phone`
- `events.service.js:217–230` — `* Phase 4b W0-RBAC: previously...`
- `events.service.js:282–287` — `* Phase 4b W0-RBAC: accepts...`
- `events.service.js:475–492` — `// Phase 4c W0-RENAME: dual-write...` (×6)
- `events.service.js:600` — `// FLOW-13-F05 / Track-B: audit event creation`
- `events.service.js:618–625` — `// M-22: when the compensating release ALSO fails...`
- `events.service.js:1347, 1403, 1523, 1534, 1651, 1832` — assorted
- `events.routes.js:349, 830, 850` — Swagger summaries containing `(Phase 4d W0-ATOMIC)` / `(Phase 3c.1)` etc. — strip the parenthetical.
- Strip `// Phase 4 W0-AUTH:` headers from `templateDataValidator.js`, `templateRefResolver.js` if present.

Breakdown (BE only): Phase/W0 markers ×18, FLOW markers ×12, M (tracking) markers ×4, BUG markers ×1, ticket-number markers ×0, "added in commit"/"remove after migration" ×0.

---

## 3. Frontend Web Findings

### 3.1 Component tree per page

(Lines from `wc -l`. Page paths are absolute under `labbe/`.)

- **`app/[lang]/host/create-event/page.js`** (304 lines) — client wrapper
  - `_components/header/Header.js`
  - `_components/stepper/Stepper.js`
  - `_components/stepTitleAndDesc/StepTitleAndDesc.js`
  - `_components/stepOne/StepOne.js` (71)
  - **`_components/stepTwo/StepTwo.js` (472) — VIOLATION cap 250**
  - `_components/stepThree/StepThree.js` (182)
  - `_components/stepThree/templatesCards/TemplatesCards.js`
  - `_components/stepFour/StepFour.js` (234)
  - **`_components/summary/Summary.js` (715) — VIOLATION cap 250 (≈3×)**
  - `_components/buttons/Buttons.js`
  - `_components/whatsappPreview/WhatsappPreview.js`
  - `_components/mobilePreviewButton/MobilePreviewButton.js`
  - `_components/staffPopup/StaffPopup.js`
  - `_components/stepTwo/actionButtons/ActionButtons.js`
- **`app/[lang]/host/events/page.js`** (60) — server component
  - `_components/header/Header.jsx` (42)
  - `_components/cardsWrapper/CardsWrapper.jsx` (54)
  - **`_components/EventsTable.jsx` (314) — VIOLATION cap 250**
- **`app/[lang]/host/events/[id]/page.jsx`** (54) — server component
  - `_components/EventHeader.jsx`
  - `_components/EventStats.jsx`
  - `_components/GuestTable.jsx`
  - `_components/EventFailureBannerClient.jsx` (uses `useRetryLaunch`)
- **`app/[lang]/host/update-event/page.js`** (13) — client wrapper
  - `_components/UpdateEventWizard.jsx` (212)
  - `_components/UpdateButtons.js` (71)
  - `_components/LiveEventBanner.jsx` (23)
  - `_components/MobilePreviewModal.jsx` (37)
- **`app/[lang]/admin-dash/events/page.js`** (47) — server component, `requirePageAccess("events", lang)`
  - `_components/EventsPageHeader.jsx` (22)
  - `_components/EventStats.jsx` (80)
  - `_components/EventsTable.jsx` (238)
- **`app/[lang]/admin-dash/events/[id]/page.jsx`** (32) — server component
  - `_components/EventDetailsContent.jsx` (50)
  - `_components/AdminEventHeader.jsx` (219)
  - **`_components/AdminGuestTable.jsx` (343) — VIOLATION cap 250**
  - `_components/SubscriptionInfo.jsx`
- **`app/[lang]/admin-dash/create-event/page.js`** (14) — server component
  - `_components/AdminCreateEvent.jsx`
- **`app/[lang]/admin-dash/update-event/page.js`** (61) — server component

**Hook tree (canonical, all under `labbe/hooks/events/`):**
- `queries/useMyEvents.js` (24), `queries/useEvent.js` (29), `queries/useEventStats.js` (24), `queries/useSingleEventStats.js` (69), `queries/useEventGuests.js` (28), `queries/useSubscriptionInfo.js` (27)
- `mutations/useEventMutation.js` (460) — factory with 21 actions; convenience exports `useCreateEvent` … `useRetryLaunch`
- `useEventForm.js`, `useEventActionGate.js`
- Admin events mutations co-located in `hooks/reactQueryHooks/useAdmin.js` lines 540–593 (`useAdminEventMutation('createForHost'|'updateStatus'|'delete'|'bulkDelete')`)

### 3.2 File-size violations

- **`_components/summary/Summary.js` — 715 lines** (≈3× cap). Proposed split into ~3 files, all importing the existing `summary.module.css` so styles stay byte-identical:
  - `SummaryCards.js` (≈180) — stats cards section (current lines ~85–200)
  - `EventDataDisplay.js` (≈220) — event details + guest/staff summaries (lines ~200–400)
  - `ScheduleSection.js` (≈170) — schedule UI block (lines ~400–550)
  - `Summary.js` (≈150) — coordinator that composes the three above
  - **Style preservation:** every JSX node keeps its exact `className={styles.foo}` references. The three new files `import styles from "../summary/summary.module.css"`. CSS file is unchanged.
- **`_components/stepTwo/StepTwo.js` — 472 lines.** Proposed split:
  - `GuestImporter.js` (≈100) — CSV/manual entry block (lines ~100–180)
  - `GuestTable.js` (≈170) — table rendering + actions (lines ~180–350)
  - `StepTwo.js` (≈220) — coordinator
  - **Style preservation:** `stepTwo.module.css` keeps its keys (`form_row`, `input_wrapper`, `table_wrapper`, etc.) verbatim; both new files import it.
- **`_components/EventsTable.jsx` (host) — 314 lines.** Proposed split:
  - `EventsTableToolbar.jsx` (≈70) — search/filter/export bar (lines ~1–60 of body)
  - `EventsTableActions.jsx` (≈100) — delete/bulk-delete modal + handlers (lines ~58–150)
  - `EventsTable.jsx` (≈170) — table body
  - **Style preservation:** `EventsTable.module.css` keys (`.table`, `.tableSection`, `.toolbar`, `.row`) unchanged; all three files import it.
- **`_components/AdminGuestTable.jsx` (admin) — 343 lines.** Proposed split:
  - `AdminGuestTableHeader.jsx` (≈80) — header row + filters
  - `AdminGuestTablePagination.jsx` (≈50) — pagination controls (lines ~300–343)
  - `AdminGuestTable.jsx` (≈220) — table body
  - **Style preservation:** `AdminGuestTable.module.css` keys unchanged.

`useEventMutation.js` (460) is **borderline acceptable** for a service-style file (cap is 250 for components/hooks; per §B0 hooks are 250). It's a factory with 21 mutation handlers that each contribute ~20 lines. Two clean options:

1. **Keep as one file** and move the 460-line cap exception in line with services (the file IS a service-shaped factory). Recommend this, with a one-line justification in the file header.
2. Split by domain: `useEventCrudMutation.js`, `useEventGuestMutation.js`, `useEventStaffMutation.js`, `useEventSettingsMutation.js`. Each ~120 lines. Then re-export the 21 convenience hooks from `mutations/useEventMutation.js` so existing imports keep working.

Plan picks **option 2** to stay strict to §B0; the convenience hooks file becomes a tiny façade.

### 3.3 Hardcoded text / data / paths

- `_components/header/Header.js:16` — hardcoded route `/host/create-event`. Acceptable for an internal Next.js route push; flag it for completeness but not for action.
- `_components/header/Header.js:24–28` — inline `style={{ transform, cursor, fontSize }}`. **Move to CSS module.**
- `_components/cardsWrapper/CardsWrapper.js:30` — Arabic fallback `"إجمالي الضيوف"` after `t(...)` call. The `t()` already has a fallback string param — drop the literal-OR fallback and let the namespace JSON be the source of truth.
- `EventFailureBanner.jsx:1` — comment header `* EventFailureBanner — Phase 3c.4 (FLOW-15-F03 / F04 / F05).` — see §3.7.
- All `API_PATHS.events.*` references in hooks are correct; no hardcoded backend URLs found in hooks.

(Total Arabic/English fallbacks across create-event tree ≈ 20 — most acceptable as `t(key, fallback)` calls. The literal-OR forms after a `t()` call need to be removed.)

### 3.4 Data mapping bugs / fallback chains

- **`EventsTable.jsx:29`** — `const events = eventsData?.data?.data || eventsData?.data || eventsData || []`. Backend (after `sendPaginated`) returns `{ status, data: [...], pagination: {...} }`. The correct path is `eventsData?.data || []`. Replace.
- **`EventsTable.jsx:87`** — optimistic-update path: `const oldData = old.data?.data || old.data || old`. Same simplification: backend response shape is single. Replace with `old.data`.
- **`EventsTable.jsx:93`** — `data: { ...(old.data || {}), data: filtered }` — same pattern.
- **`EventsTable.jsx:115–121`** — single-delete optimistic update with the same triple-fallback. Same fix.
- **`CardsWrapper.js:13`** — `const data = statsData?.data || statsData`. Backend `getEventStats` returns `{ status, data: {...} }` — fix to `statsData?.data || {}`.

(The mobile side has the same pattern in 4 places — see §4.4. The plan picks a single canonical shape per endpoint and fixes both platforms in §7.D.)

### 3.5 Duplicate hooks / direct apiRequest calls

- **No duplicates found.** All consumers go through `hooks/events/queries/*` or `hooks/events/mutations/useEventMutation`. No inline `useQuery({ queryFn: () => apiRequest(...) })` in components. The events module is well-disciplined here.

### 3.6 State / loading / error gaps

- **`EventsTable.jsx` (host):** `error` is destructured from `useMyEvents()` (line 24) but never rendered. Add an `if (error) return <ErrorFallback ... />;` branch using the project's existing error component.
- **`EventsTable.jsx` (host):** `isLoading` similarly is not rendering a `<SimpleLoading />` block — the table body just renders empty. Add the loading branch.
- **`Header.js` (host events):** inline `style={{...}}` on the arrow icon (mentioned in §3.3) — move to `Header.module.css`.
- **`useEventMutation`:** the factory does not wrap `mutateAsync` calls in try/catch internally — that's correct because callers handle it. Verified: callers (e.g. EventsTable bulk delete, retry-launch banner, create-event handlers) all wrap in try/catch and route to `toastUtils` + `handleError`. ✓
- **Filter/search state:** the host `EventsTable` keeps search/filter/sort in `useState` rather than URL params — flag as **B14 violation** but mark as Medium priority (not regression).

### 3.7 Comment hygiene

- **`EventFailureBanner.jsx:1`** — `"* EventFailureBanner — Phase 3c.4 (FLOW-15-F03 / F04 / F05)."` → remove
- **`hooks/events/mutations/useEventMutation.js`:**
  - Lines 72–75 — Phase 4d W1-WEB-ATOMIC docstring → remove the marker, keep the *why* sentence
  - Lines 99–105 — Phase 4d W1-WEB-ATOMIC capacity-guard docstring → same
  - Lines 315–322 — Phase 3c.1 / M-19 idempotency docstring → strip markers, keep "uses Idempotency-Key per click" line if it explains a non-obvious why
- **`hooks/events/index.js:20–21`** — `Phase 4d W1-WEB-ATOMIC` barrel comment → remove
- **`StepTwo.js:17–22`** — Phase 4b W1-UPD comment → remove
- **EventsTable.jsx, GuestTable.jsx, AdminGuestTable.jsx** — sweep for any leftover Phase/FLOW/W0/M markers (none flagged in audit but a final grep is cheap).

Total web markers: **6 confirmed**, plus an estimated 5–10 minor ones to surface during implementation. The acceptance check (§10) requires zero markers in the module's surface area.

---

## 4. Frontend Mobile Findings

### 4.1 Screen → component tree

- **`screens/host/CreateEventScreen.js`** (281)
  - Hooks: `useSubscriptionInfo`, `useCreateEvent`, `useCreateEventForm`, `useStepValidation`, `useCreateEventHandlers`
  - Components: `StepOne`, `StepTwo`, `StepThree`, `StepFour`, `EventSummary`, `StepHeader`, `PrevAndNextBtns`, `PreviewInvitation`
- **`screens/host/EventsScreen.js`** (218)
  - Hooks: `useEventStats`, `useSingleEventStats`
  - Components: `EventList`, `EventDetails`, `SingleEventStats`
- **`screens/host/HomeScreen.js`** (211)
  - Hooks: `useHostDashboard`, `useNotifyStaff`
  - Components: `LastEvent`, `StatsCards`, `EventTemplates`, `MakeYourFirst`, `TestMessageModal`, `ScheduleSendingModal`
- **`screens/admin/AdminEventsScreen.js`** (75)
  - Hooks: `useAdminEventsInfinite`, `useDebouncedValue`
  - Components: `AdminEventList`
- **`screens/admin/CreateEventScreen.js`** (61)
- **`screens/admin/EventDetailsScreen.js`** (199)
- **`screens/common/UpdateEventScreen.js`** (597) — **VIOLATION cap 350**
  - Hooks: `useUpdateEventDetails`, `useUpdateGuestList`, `useUpdateStaffList`, `useUpdateEventStep2`
  - Components: `StepOne` (26), `StepTwo` (58), `StepThree` (30), `StepFour` (28), `StepFive` (29)

**Service files:**
- `services/EventsService.js` (550) — primarily validation/transform helpers + 2 deprecated API calls (`createEvent`, `updateEvent`); flagged for cleanup
- `services/eventsService2.js` (964) — primary API service; **VIOLATION cap 500 (964 > 500)**

**Hook files:**
- `hooks/queries/useEvents.js` (114)
- `hooks/mutations/useEventMutations.js` (415) — **VIOLATION cap 350**

### 4.2 File-size violations

- **`screens/common/UpdateEventScreen.js` — 597 lines.** Proposed split:
  - Extract `useEventLoadAndGate(eventId)` custom hook → ~80 lines, covers event fetch + role-gate + live-event lockout
  - Extract `UpdateEventStepRenderer.js` → ~150 lines, the switch over `currentStep` that renders `StepOne…StepFive`
  - `UpdateEventScreen.js` reduces to ~300 lines (coordinator + navigation + mutation wiring)
  - **Style preservation:** if the screen has any `StyleSheet.create({...})` block, copy it verbatim into the file that owns the JSX it styles. Don't merge keys, don't rename, don't round numeric values.
- **`services/eventsService2.js` — 964 lines.** Proposed split into 3 service files (cap 500 each), with the canonical `eventsService2.js` becoming a thin façade:
  - `eventsService.crud.js` — list/get/delete/bulk-delete + `formatEventForDisplay`/`groupGuestsByStatus`
  - `eventsService.guests.js` — guest CRUD + helpers
  - `eventsService.staff.js` — staff CRUD + token list/revoke
  - `eventsService.settings.js` — invitation/launch/test-message + retry-launch
  - `eventsService.exports.js` — export endpoints (blob handling)
  - `eventsService2.js` (thin façade) re-exports everything for existing callers
- **`hooks/mutations/useEventMutations.js` — 415 lines.** Same façade pattern as web §3.2 option 2: split by domain (`useEventCrudMutations`, `useEventGuestMutations`, `useEventStaffMutations`, `useEventSettingsMutations`) and re-export through `useEventMutations.js`.

### 4.3 Hardcoded text / data / paths

**Hardcoded API path strings (not via ENDPOINTS.EVENTS.*) — 13 violations in `eventsService2.js`:**

| Line | Bad | Good |
|------|-----|------|
| 109 | `\`/${eventId}\`` (relative to /events) | `ENDPOINTS.EVENTS.BY_ID(eventId)` |
| 128 | `\`/stats/${eventId}\`` | `ENDPOINTS.EVENTS.SINGLE_STATS(eventId)` |
| 189 | `\`/${eventId}/guest-list\`` | `ENDPOINTS.EVENTS.UPDATE_GUEST_LIST(eventId)` |
| 237 | `\`/${eventId}/staff-list\`` | `ENDPOINTS.EVENTS.UPDATE_STAFF_LIST(eventId)` |
| 321 | retryLaunch hardcoded `/events/${eventId}/retry-launch` | add `ENDPOINTS.EVENTS.RETRY_LAUNCH(id)` and use it |
| 342 | `\`/${eventId}\`` (DELETE) | `ENDPOINTS.EVENTS.DELETE(eventId)` |
| 366 | `\`/${eventId}/guests\`` | `ENDPOINTS.EVENTS.ADD_GUEST(eventId)` |
| 396 | `\`/${eventId}/guests/${guestId}\`` (PUT) | new `ENDPOINTS.EVENTS.UPDATE_GUEST(eventId, guestId)` (add to api.js) |
| 428 | `\`/${eventId}/guests/${guestId}\`` (DELETE) | `ENDPOINTS.EVENTS.DELETE_GUEST(...)` |
| 452 | `\`/${eventId}/staff\`` | `ENDPOINTS.EVENTS.ADD_STAFF(eventId)` |
| 485 | `\`/${eventId}/staff/${staffId}\`` (PUT) | `ENDPOINTS.EVENTS.UPDATE_STAFF(...)` |
| 517 | `\`/${eventId}/staff/${staffId}\`` (DELETE) | `ENDPOINTS.EVENTS.DELETE_STAFF(...)` |
| 887 | `\`/events/${eventId}/staff-tokens\`` | new `ENDPOINTS.EVENTS.LIST_STAFF_TOKENS(id)` |
| 933, 955 | `/guests/events/${eventId}/guests/${guestId}/(rotate-qr|revoke-access)` | belong under `ENDPOINTS.GUESTS.*` — coordinate with `guests` module |

**Hardcoded user-facing strings (Arabic/English) — ≈13 in service files:**

- `EventsService.js:26, 31, 33, 43, 64, 67, 69, 142, 186–187, 224, 442, 469`
- `eventsService2.js:540`
- `UpdateEventScreen.js:142`

These are validation messages and default labels (`"اسم الضيف مطلوب"`, `"رقم الجوال يجب أن يكون 9 أرقام ويبدأ بـ 5"`, `"ضيف"` default name). Move to mobile i18n namespace `validation` / `events`. List for §8.

### 4.4 Data mapping bugs / fallback chains

| File:Line | Pattern | Canonical | Fix |
|-----------|---------|-----------|-----|
| `eventsService2.js:45` | `data.data \|\| {}` | `{ status, data: {...} }` envelope | `data.data || {}` is **fine** as boundary guard; not a multi-branch fallback |
| `eventsService2.js:76` | `eventsData.data?.events \|\| []` | `sendPaginated` returns `{ data: [...] }` — but service formats myEvents as `{ data: { events, pagination } }` per backend service `_formatEvent` aggregator | **Verify backend** then fix to a single path. Likely `eventsData?.data?.events || []`. |
| `eventsService2.js:133` | `eventRes.data?.event \|\| eventRes.data \|\| {}` | Backend `getEventById` returns `{ status, data: {...} }` (event is `data` itself, not `data.event`) | Fix to `eventRes?.data || {}`. |
| `eventsService2.js:226` | `data?.data?.event \|\| data?.data \|\| data` (step2 result) | Backend service returns `{ event, guests, staff, ... }` wrapped by `sendSuccess` → `{ status, data: { event, guests, staff } }` | Fix to `data?.data?.event` only (and `data?.data?.guests`, `data?.data?.staff` separately). |
| `eventsService2.js:887` | `data?.data \|\| data` (staff-tokens) | sendSuccess wraps; canonical is `data?.data` | Fix to `data?.data || []`. |
| `UpdateEventScreen.js:220` | `res?.event \|\| res?.data \|\| res` | Same as above | Fix to `res?.data` after the service is normalised. |
| `eventsService2.js:368` | guest field fallback `phone \|\| mobile` | Backend uses `phone` only | Drop `mobile` fallback. |
| `eventsService2.js:146` | `respondAt \|\| respondedAt` | Backend uses `respondedAt` (verify Guest schema) | Drop `respondAt` fallback. |

**Plan: §7.D verifies the canonical backend shape after Phase 1 of §7.A and updates both web (§3.4) and mobile (§4.4) to that one path.**

### 4.5 Web/Mobile divergence (preview — full diff in §5)

| Endpoint | Aspect | Web | Mobile | Backend truth | Action |
|----------|--------|-----|--------|---------------|--------|
| GET /events/my-events | response | reads `data.data` (correct via canonical hook) | reads `data?.events` after fallback chain | `{ data: [...events], pagination }` | Confirm + fix mobile path |
| GET /events/:id | response | reads `data?.data` (canonical hook) | triple fallback `data?.event \|\| data \|\| {}` | `{ data: {...event} }` | Fix mobile to `data?.data` |
| PATCH /events/:id/step2 | response | reads `data?.data?.event` | triple fallback | `{ data: { event, guests, staff } }` | Fix mobile to `data?.data?.event` (and use `.guests`, `.staff`) |
| Guest field name | `guest.phone` | `guest.phone` | `phone \|\| mobile` | `phone` | Drop `mobile` on mobile |
| Path discipline | uses `API_PATHS.events.*` | yes | 13 hardcoded `/${eventId}/...` | — | Migrate to `ENDPOINTS.EVENTS.*` |

### 4.6 Loading / error / empty states

- **`EventsScreen.js:92–100`** — renders `<EventList events={eventsData?.events || []}>` with no empty-state branch when array is empty. Add `if (!events.length) return <EmptyEventsView />;` (or whatever sibling pattern is used elsewhere).
- All other screens have loading + error blocks (verified).

### 4.7 Comment hygiene

**Total markers: 31** across `EventsService.js` (6), `eventsService2.js` (20), `useEvents.js` (1), `useEventMutations.js` (4). All are `Phase 4 W0-AUTH:`, `Phase 4d W0-ATOMIC`, `Phase 3c.1`, `Phase 4d W1-MOBILE-UPDATE`, `D4` (decision marker), etc. Strip every one.

Worst offenders: `eventsService2.js:204, 280, 308, 650, 693, 868–869, 891, 893, 918, 920, 944, 947`; `EventsService.js:78, 297, 307, 317, 375, 377, 395`.

**Console statements:** ≈56 `console.log` / `console.error` in `eventsService2.js` (lines 55, 93, 112, 160, 182, 194, 258, 295, 299, 340, 364, 390, 405, 426, 450, 480, 512, 614, 648, 665, 687, 707, 714, 730, 759, 774, 791, 807, 837, 856, 887). These violate D6. Allowed pattern: `console.error` inside a catch that also surfaces a user-visible toast — for any `console.log` not under that pattern, remove. The plan reduces them to: 0 console.log; ≤10 console.error inside catch blocks that also dispatch a toast.

---

## 5. Cross-Platform API Consumption Diff

| Endpoint | Aspect | Web | Mobile | Backend truth | Action |
|----------|--------|-----|--------|---------------|--------|
| GET /events/my-events | path | `API_PATHS.events.getMyEvents` ✓ | `ENDPOINTS.EVENTS.MY_EVENTS` ✓ | `/events/my-events` | Aligned |
| GET /events/my-events | response read | `data?.data` (single path in canonical hook) but `EventsTable.jsx:29` does triple-fallback | `eventsData?.events` after fallback | `{ data: [...] }` (from `sendPaginated`) | Fix both to `data?.data` |
| GET /events/:id | path | `API_PATHS.events.getEventById(id)` ✓ | hardcoded `/${eventId}` ✗ | `/events/:id` | Migrate mobile to `ENDPOINTS.EVENTS.BY_ID(id)` |
| GET /events/:id | response read | `data?.data` ✓ | triple fallback `data?.event \|\| data \|\| {}` | `{ data: {...event} }` | Fix mobile |
| PATCH /events/:id/event-details | path | `API_PATHS` ✓ | hardcoded ✗ | `/events/:id/event-details` | Migrate mobile |
| PATCH /events/:id/step2 | request body | `{ guestList, staffList }` ✓ | `{ guestList, staffList }` ✓ | same | Aligned |
| PATCH /events/:id/step2 | response read | `data?.data?.event` ✓ | triple fallback | `{ data: { event, guests, staff } }` | Fix mobile |
| PATCH /events/:id/invitation-settings | content-type | multipart FormData ✓ | multipart FormData ✓ | multipart | Aligned |
| POST /events/:eventId/guests | body | `{ name, phone, email?, invitedBy? }` ✓ | `{ name, phone, mobile?, email?, ... }` (mobile reads back `mobile` fallback) | `phone` only | Drop `mobile` on mobile |
| POST /events/:eventId/staff | body | `{ name, phone }` ✓ | `{ name, phone }` ✓ | same | Aligned |
| GET /events/export/events | path | `API_PATHS.events.exportEventsAsExcel` ✓ | `ENDPOINTS.EVENTS.EXPORT_EVENTS` ✓ | `/events/export/events` | Aligned (BUT backend whitelabel scope missing — see §2.3) |
| POST /events/:eventId/notify-staff | idempotency | none | none | none currently | Add backend idempotency middleware + Idempotency-Key header on both clients |
| POST /events/:id/retry-launch | idempotency | sends `Idempotency-Key` header per click ✓ | sends header ✓ | accepts via `idempotency` middleware ✓ | Aligned |
| GET /events/:eventId/staff-tokens | path | (admin only on web; verify hook) | hardcoded ✗ | `/events/:eventId/staff-tokens` | Migrate mobile |
| GET /events/admin/all | hook | `useAdminEvents`* (in useAdmin.js barrel) | `useAdminEventsInfinite` | `/events/admin/all` | Functionally aligned (web is paginated, mobile is infinite — different UX, same endpoint) |

**Pagination shape:** `{page, limit, total, pages}` from `sendPaginated`. Web reads via React Query `data?.pagination`; mobile reads inside `data?.pagination` for infinite query. Aligned.

---

## 6. Suspected Bugs Worth Verifying

(Things that look broken but cannot be confirmed without running the app.)

1. **CRITICAL — Removed staff retain access tokens.** `events.service.js:2219–2232` (`deleteStaff`) does NOT call `_revokeRemovedStaffTokens(eventId, [staffPhone])`. The function exists (it's invoked from `updateStaffList` when staff are removed by replacement), but the explicit single-staff DELETE path skips revocation. Removed staff can still hit `/staff-portal` until natural token expiry (48h). **Add the revoke call inside the existing transaction or fire-and-forget after success.**
2. **HIGH — Whitelabel-scoped export bypass.** `exportEventsAsExcel` (`events.service.js:1186–1213`) reads events by `host: req.user._id` only. A whitelabel admin with multiple host accounts (or a host with cross-whitelabel events from prior whitelabel switches) can export rows outside their current whitelabel. Add `req.user.whitelabelId` filter for `WHITELABEL_ADMIN` / `WHITELABEL_MODERATOR`.
3. **MEDIUM — `notify-staff` SMS double-send on retry.** `notifyStaff` loops over staff and calls Taqnyat per-row inside `events.service.js:2274–2307`. If the request times out after the 3rd staff member, retrying re-sends to all 3. Add `idempotency({ scope: 'events.notify_staff' })` middleware.
4. **MEDIUM — Bulk-delete consistency.** `bulkDeleteEvents` (`events.service.js:1264–1272`) does `Guest.deleteMany` then `Event.deleteMany` outside a transaction. If the second fails (rare but possible on connection loss), guest docs are orphaned.
5. **LOW — `updateEventStep2` rollback ambiguity.** The compensation block at `events.service.js:1736–1769` is best-effort; if step 1 fails before we capture the pre-image of about-to-delete guests, those records aren't rolled back to their pre-state. Inspection suggests the order is correct (capture → update → delete) but worth a unit test.
6. **LOW — `getSubscriptionInfo` no whitelabel guard.** A `WHITELABEL_MODERATOR` calling `/events/subscription-info` returns their own subscription; if moderators don't carry subscriptions this is a no-op, but if they do this leaks across tenants.
7. **LOW — Mobile `EventsScreen` empty state silently invisible.** When the user's event list is empty, `EventList` renders nothing — looks like a loading state that never resolves.
8. **LOW — Mobile field fallback `phone || mobile`.** Suggests at some point the backend emitted `mobile`. Verify Guest schema; if backend never emits `mobile`, the fallback is dead code.
9. **LOW — Web `EventsTable` (host) doesn't render error or loading state.** If `useMyEvents` errors, the page renders an empty table with no signal to the user. Add proper branches.
10. **LOW — `updateStaffStatus` does not validate the status enum.** `events.service.js` updateStaff path accepts any string; should constrain to `SUPERVISOR_STATUS` values via Joi.

---

## 7. Implementation Plan (Ordered)

Apply in this order. Each item ends with a checkbox.

### 7.A Backend

1. [ ] **A.1** Create `labbe-backend-/src/modules/events/events.validation.js` with the Joi schemas listed in §2.6 (createEventSchema, updateEventDetailsSchema, updateGuestListSchema, updateStaffListSchema, updateStep2Schema, updateInvitationSettingsSchema, updateLaunchSettingsSchema, sendTestMessageSchema, addGuestSchema, updateGuestSchema, addStaffSchema, updateStaffSchema, updateStaffStatusSchema, bulkDeleteSchema, adminUpdateStatusSchema, notifyStaffSchema). Wire each into the matching route via `validate(schema)` middleware in `events.routes.js`.
2. [ ] **A.2** Move multipart JSON-field parsing out of `events.controller.js` (`createEvent` lines 164–181, `updateInvitationSettings` lines 304–322) into a shared middleware `parseFormDataJsonFields(['eventData','guestList','staffList',...])` under `shared/middleware/validation.js`. Apply it after Multer in the route definition.
3. [ ] **A.3** Replace `res.status(200).json({...})` at `events.controller.js:487` with `sendSuccess(res, result, 'Notification sent')`.
4. [ ] **A.4** **(CRITICAL)** In `deleteStaff` (`events.service.js:2219–2232`), call `await _revokeRemovedStaffTokens(eventId, [removedStaffPhone])` after successful delete (within the same flow; non-fatal-best-effort if it fails). Closes the D-R3 invariant gap.
5. [ ] **A.5** **(HIGH)** In `exportEventsAsExcel` (`events.service.js:1186–1213`), apply whitelabel scope: if `requestingUser.role` is `WHITELABEL_ADMIN` or `WHITELABEL_MODERATOR`, add `query.whitelabelId = requestingUser.whitelabelId`. Same pattern as `getMyEvents`.
6. [ ] **A.6** Add `idempotency({ scope: 'events.notify_staff' })` to `POST /events/:eventId/notify-staff` route in `events.routes.js`.
7. [ ] **A.7** Add `idempotency({ scope: 'events.test_message' })` to `PATCH /events/:id/test-message` route.
8. [ ] **A.8** Wrap `bulkDeleteEvents` (`events.service.js:1264–1272`) in a Mongo transaction (`session.startTransaction()` … `commitTransaction()` / `abortTransaction()`), mirroring the `deleteEvent` implementation.
9. [ ] **A.9** Replace plain `throw new Error(...)` with typed errors at `events.service.js:445, 463, 934, 941`. Use `NotFoundError` / `PackageLimitError` / `AppError(message, status, code)` as appropriate.
10. [ ] **A.10** Replace string-literal role arrays with `ROLES.*` constants at `events.service.js:691` and `events.controller.js:468`.
11. [ ] **A.11** Add `.lean()` to read-only queries at `events.service.js:1123–1124, 1193, 1224–1229, 1431–1434`.
12. [ ] **A.12** Move lazy `require('...').isPerEventPlan(...)` at `events.service.js:1039–1046` to a top-level import.
13. [ ] **A.13** Replace every `console.error` / `console.warn` call (12 sites listed in §2.5) with the shared logger (`logger.error` / `logger.warn`).
14. [ ] **A.14** Add `logAudit` calls to mutations missing them: routes #10–11 (guest/staff list), #13–16 (settings + test-message + notify-staff), #18 (bulk-delete), #19–25 (guest + staff CRUD), #30 (admin status update). Use the existing `logAudit` import in `events.service.js`. Action names: `event.guest_list_updated`, `event.staff_list_updated`, `event.invitation_settings_updated`, `event.launch_settings_updated`, `event.test_message_sent`, `event.notify_staff`, `event.bulk_deleted`, `event.guest_added`, `event.guest_updated`, `event.guest_deleted`, `event.staff_added`, `event.staff_updated`, `event.staff_deleted`, `event.status_updated_by_admin`.
15. [ ] **A.15** Update Swagger:
    - Add `@swagger` block to route #26 (`POST /:eventId/staff/:staffId/revoke`).
    - Define `CreateEventRequest`, `EventUpdateRequest`, `GuestUpdateRequest`, `StaffUpdateRequest`, `Step2Request`, `LaunchSettingsRequest`, `InvitationSettingsRequest` in `config/swagger.js` `components.schemas`.
    - Define `EventEditLockedError`, `GuestListBelowConfirmedError`, `EventNotRetryableError`, `GuestLimitExceededError` in `components.responses`.
    - Replace inline schemas in events.routes.js JSDoc with `$ref` references.
    - Replace inline `page`/`limit`/`id` parameters with `$ref: '#/components/parameters/PageParam'` etc.
    - Fix the `403` → `400` mismatch on guest-limit-exceeded responses.
    - Strip Swagger summaries that contain `(Phase 4d W0-ATOMIC)` etc.
16. [ ] **A.16** **Split `events.service.js`** (2498 → 7 files per §2.1). The original `events.service.js` becomes a thin façade that re-exports from `events.crud.service.js`, `events.guests.service.js`, `events.staff.service.js`, `events.step2.service.js`, `events.settings.service.js`, `events.stats-export.service.js`, `events.launch.service.js`. **External imports unchanged.** Update `index.js` if needed (it currently re-exports the whole `events.service` — verify still works).
17. [ ] **A.17** **Split `events.routes.js`** (1031 → 2 files): extract `/admin/*` routes to `events.admin.routes.js`, mount under `router.use('/admin', adminRouter)`. Swagger blocks travel with their routes.
18. [ ] **A.18** **Split `events.controller.js`** (532 → 2 files): extract admin handlers to `events.admin.controller.js`, re-export from canonical `events.controller.js` so any external import paths still work.
19. [ ] **A.19** Comment-hygiene pass: remove all 37 PHASE/W0/W1/W2/M/FLOW/BUG markers in events.service.js, events.routes.js, events.controller.js, templateDataValidator.js, templateRefResolver.js (specific line list in §2.7).
20. [ ] **A.20** Add a short JSDoc above route #10 and #11 that documents "kept for partial guest-only / staff-only edits; full guest+staff replace uses /step2."
21. [ ] **A.21** Add `checkStaffLimit` middleware (if applicable per plan rules) to `POST /:eventId/staff` — confirm with plans module first; if no per-plan staff cap exists, document that decision in §6 and skip.

### 7.B Web

1. [ ] **B.1** Replace fallback chains in `app/[lang]/host/events/_components/EventsTable.jsx` lines 29, 87, 93, 115–121 with the single canonical path `eventsData?.data || []` (matches backend `sendPaginated`). After the backend split (A.16) re-verify the shape and adjust if needed.
2. [ ] **B.2** Replace fallback in `app/[lang]/host/events/_components/cardsWrapper/CardsWrapper.js:13` with `statsData?.data || {}`.
3. [ ] **B.3** Add loading and error branches to `EventsTable.jsx` (host): render `<SimpleLoading />` when `isLoading`, render `<ErrorFallback message={t('errors.loadFailed', 'Failed to load events')} />` when `error`.
4. [ ] **B.4** Move inline `style={{ transform, cursor, fontSize }}` in `app/[lang]/host/events/_components/header/Header.js:24–28` to a class in `Header.module.css` (new key e.g. `.arrowIcon` / `.arrowIconRtl`).
5. [ ] **B.5** **Split `_components/summary/Summary.js`** (715 → ~150 + 3 sub-files per §3.2). All sub-files import the existing `summary.module.css`. **Style preservation:** every JSX node and `className` reference identical pre/post split.
6. [ ] **B.6** **Split `_components/stepTwo/StepTwo.js`** (472 → ~220 + `GuestImporter.js` + `GuestTable.js` per §3.2). Same style preservation rules.
7. [ ] **B.7** **Split `_components/EventsTable.jsx`** (host, 314 → ~170 + `EventsTableToolbar.jsx` + `EventsTableActions.jsx`).
8. [ ] **B.8** **Split `_components/AdminGuestTable.jsx`** (343 → ~220 + `AdminGuestTableHeader.jsx` + `AdminGuestTablePagination.jsx`).
9. [ ] **B.9** Optional but recommended: split `hooks/events/mutations/useEventMutation.js` (460 → 4 sub-files per §3.2 option 2). All convenience exports continue to live in `useEventMutation.js` (façade). If we keep the file as-is, document the cap exception with a one-line file-header note.
10. [ ] **B.10** Move `EventsTable.jsx` (host) filter/search/sort state from `useState` to URL params (`useSearchParams` / `router.push`) per B14. **Medium priority** — flag and defer if regressions risk is high.
11. [ ] **B.11** Comment-hygiene pass: remove markers at `EventFailureBanner.jsx:1`; `useEventMutation.js:72–75, 99–105, 315–322`; `hooks/events/index.js:20–21`; `StepTwo.js:17–22`; final grep across the events surface for any leftover Phase/FLOW/W0/M/BUG markers.
12. [ ] **B.12** (After A.16/A.17/A.18 land) — verify all React Query hooks read the canonical response shape. Re-grep web for `?.data?.data` patterns and reduce.

### 7.C Mobile

1. [ ] **C.1** Add missing `ENDPOINTS.EVENTS.*` keys to `halla-mobile/config/api.js`: `RETRY_LAUNCH(id)`, `UPDATE_GUEST(eventId, guestId)`, `LIST_STAFF_TOKENS(eventId)`. Coordinate with `ENDPOINTS.GUESTS` for `ROTATE_QR(eventId, guestId)` and `REVOKE_ACCESS(eventId, guestId)`.
2. [ ] **C.2** Replace 13 hardcoded path strings in `services/eventsService2.js` with `ENDPOINTS.EVENTS.*` calls (full list in §4.3 table).
3. [ ] **C.3** Fix mobile data-mapping fallback chains:
    - `eventsService2.js:76` — `eventsData.data?.events || []` → confirm canonical and reduce
    - `eventsService2.js:133` — `eventRes.data?.event || eventRes.data || {}` → `eventRes?.data || {}`
    - `eventsService2.js:226` — `data?.data?.event || data?.data || data` → `data?.data?.event` (and use `.guests`, `.staff`)
    - `eventsService2.js:887` — `data?.data || data` → `data?.data || []`
    - `eventsService2.js:368` — drop `mobile` fallback (use `phone` only) after confirming backend never emits `mobile`
    - `eventsService2.js:146` — drop `respondAt` fallback after confirming backend uses `respondedAt` only
    - `UpdateEventScreen.js:220` — `res?.event || res?.data || res` → `res?.data`
4. [ ] **C.4** Add empty-state branch to `screens/host/EventsScreen.js:92–100`: if `!eventsData?.events?.length`, render the project's existing `<EmptyState />` (or an `<EventsEmpty />` sibling component matching the design).
5. [ ] **C.5** **Split `screens/common/UpdateEventScreen.js`** (597 → ~300 + `useEventLoadAndGate.js` hook + `UpdateEventStepRenderer.js`) per §4.2. **Style preservation:** every `StyleSheet.create({...})` value verbatim.
6. [ ] **C.6** **Split `services/eventsService2.js`** (964 → 5 sub-services + thin façade) per §4.2. Re-export everything from `eventsService2.js` so existing screen imports keep working.
7. [ ] **C.7** **Split `hooks/mutations/useEventMutations.js`** (415 → 4 sub-files + thin façade per §4.2).
8. [ ] **C.8** Remove the deprecated `createEvent` and `updateEvent` exports from `services/EventsService.js:425–472` plus the lines in the default-export object. Verify no consumers still call them (grep). The canonical replacements are `useCreateEvent` (mobile mutation) and `useUpdateEventStep2` / `useUpdateEventDetails`.
9. [ ] **C.9** Remove all 31 PHASE/W0/W1/W2/M/D markers from `EventsService.js` (6), `eventsService2.js` (20), `useEvents.js` (1), `useEventMutations.js` (4) per §4.7.
10. [ ] **C.10** Remove `console.log` calls in `eventsService2.js` (≈45 sites). Keep `console.error` only inside catch blocks that also surface a user-visible error/toast (per D6); for the others, reduce to logger or remove. Aim for 0 `console.log`, ≤10 `console.error` (all in catch+toast paths).
11. [ ] **C.11** Move the ≈13 hardcoded Arabic strings in `EventsService.js` and `eventsService2.js:540` and `UpdateEventScreen.js:142` to the mobile i18n `validation` / `events` namespaces. List of keys in §8.

### 7.D Cross-platform alignment (do AFTER A/B/C land)

1. [ ] **D.1** Re-grep web + mobile for `data?.data?.events`, `data?.data?.event`, `data?.data` after the backend split (A.16) is done. Confirm a single canonical path per endpoint reads through.
2. [ ] **D.2** Verify both web and mobile send `phone` (not `mobile`) on guest/staff bodies.
3. [ ] **D.3** Verify both clients send `Idempotency-Key` headers on the routes we just gated (`POST /:eventId/notify-staff`, `PATCH /:id/test-message`).
4. [ ] **D.4** Manual smoke test (no automated harness yet):
    - Host: create event → list → detail → edit (step2 atomic) → invitation-settings → launch-settings → notify-staff → retry-launch (after a failed launch) → delete
    - Admin: list (whitelabel-scoped) → status update → delete
    - Mobile: same screens, end-to-end
    - Confirm export-events / export-guests downloads
    - Confirm staff-portal access is revoked when staff is deleted (D-R3)
5. [ ] **D.5** Document the canonical response shape for each endpoint in a 1-page reference at `docs/modules/events-api-reference.md` (optional; skip if time-boxed).

---

## 8. Locale-key additions required

(For the user — agent does NOT modify locale JSON without explicit approval.)

**Web (`labbe/localization/locales/{en,ar}/...`):** the events module's `t()` calls already use existing namespaces (`createEvent`, `host-events`, `adminEvents`, etc.). The few literal-OR fallbacks identified in §3.3 don't introduce new keys; they consolidate existing keys. **No new keys required for the web side beyond what `t(key, fallback)` already covers.**

**Mobile (`halla-mobile/localization/...`):** the ≈13 hardcoded Arabic strings need keys. Suggested:

- `validation.guestNameRequired` (en: "Guest name is required", ar: "اسم الضيف مطلوب")
- `validation.staffNameRequired` (en: "Staff name is required", ar: "اسم المشرف مطلوب")
- `validation.phoneRequired` (en: "Phone number is required", ar: "رقم الجوال مطلوب")
- `validation.phoneInvalid` (en: "Phone must be 9 digits and start with 5", ar: "رقم الجوال يجب أن يكون 9 أرقام ويبدأ بـ 5")
- `validation.phoneDuplicate` (en: "This phone is already in the list", ar: "هذا الرقم موجود بالفعل في القائمة")
- `validation.csv.row.invalid` (en: "Row {row}: invalid data", ar: "صف {row}: بيانات غير صالحة")
- `events.guest.defaultName` (en: "Guest", ar: "ضيف")
- `events.csv.headers.guestName` (en: "Guest name", ar: "اسم الضيف")
- `events.csv.headers.staffName` (en: "Staff name", ar: "اسم المشرف")
- `events.csv.headers.phone` (en: "Phone", ar: "رقم الجوال")
- `events.create.failed` (en: "Failed to create event. Please try again.", ar: "فشل في إنشاء المناسبة. يرجى المحاولة مرة أخرى.")
- `events.update.failed` (en: "Failed to update event. Please try again.", ar: "فشل في تحديث المناسبة. يرجى المحاولة مرة أخرى.")

(11 keys.)

---

## 9. Rollback plan

Each item in §7 is a self-contained commit. The rollback for any item is `git revert <commit>`.

DB-shape changes in this plan: **none** (no schema migrations; no model field additions; no index drops). All proposed indexes (§2.8 from backend report — Event compound, Guest soft-delete compound, StaffAccessToken compound, User whitelabel+role) can be added safely with `background: true` and reverted with `dropIndex`.

Risk concentration: A.16 (events.service.js split) is the largest single change. Strategy: land the façade first (export-only refactor, byte-identical public API), then progressively move code into sub-services in subsequent commits, each of which can be reverted independently.

---

## 10. Acceptance checklist (run after Phase 2)

- [ ] No file in module exceeds the cap.
- [ ] All endpoints have current Swagger.
- [ ] No duplicate endpoints remain (or duplicates explicitly documented as deferred).
- [ ] Web + Mobile call the same paths with the same shapes for every endpoint.
- [ ] No fallback chains in data mapping in this module's surface area.
- [ ] No `// FLOW-…` / `// PHASE-…` / `// BUG-…` / `// W0-…` / `// W1-…` / `// W2-…` / `// M-…` comments in module's surface area (BE + Web + Mobile).
- [ ] Every events mutation calls `logAudit`.
- [ ] `DELETE /events/:eventId/staff/:staffId` revokes the staff token.
- [ ] `GET /events/export/events` honours whitelabel scope for whitelabel admins/moderators.
- [ ] Idempotency middleware on `POST /events/:eventId/notify-staff` and `PATCH /events/:id/test-message`.
- [ ] `POST /events/bulk-delete` runs inside a transaction.
- [ ] `events.validation.js` exists and is wired into every non-trivial body route.
- [ ] No `console.log` in committed code; `console.error` only in catch blocks paired with user-visible toast.
- [ ] `npm run lint` clean (no new warnings).
- [ ] Visual smoke test: every page/screen looks identical before/after the refactor (the Core Rule).

---

**Plan path:** `docs/modules/events-fullstack-review-plan.md`
**Implementation items:** 21 backend + 12 web + 11 mobile + 5 cross-platform = **49 ordered items in §7**.
