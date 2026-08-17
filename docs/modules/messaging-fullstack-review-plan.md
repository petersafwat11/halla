# messaging — Full-Stack Review Plan

**Module:** messaging
**Generated:** 2026-05-07
**Prompt:** docs/implementation/MODULE_FULLSTACK_REVIEW_PROMPT.md
**Status:** Awaiting green light · NOT IMPLEMENTED YET

---

## 0. Executive Summary

- **12** total endpoints in `messaging.routes.js` (2 webhook + 10 protected).
- **2** dead-end paths declared in frontend API configs but **not** routed by the backend:
  - `POST /messaging/test` — removed per `messaging.routes.js:63` comment; the canonical endpoint is `PATCH /events/:id/test-message` (lives in `events` module). Web `useEventMutation('sendTestMessage')` and mobile `useSendTestMessage` still POST to `/messaging/test`. **404 in production.**
  - `POST /messaging/template/submit` — never existed in `messaging.routes.js`; only present in offline scripts (`scripts/submitWhatsAppTemplates.js`). Both web `useSubmitTemplate` and mobile `useSubmitTemplate` POST here. **404 in production.**
- **3** Swagger gaps in the routes file: `/templates/approved`, `/template/status/:eventId`, `/schedule` have **no** `@swagger` annotation; the existing annotations reference `SendMessageRequest` schema which is not declared in `config/swagger.js` (drift).
- **2** backend file-size violations:
  - `messaging.service.js` — **1098 lines** (cap **600**) — major split required.
  - `messaging.controller.js` — **461 lines** (cap **300**) — split required (mostly the inline webhook handler at 314+ lines).
- **0** backend validation files — `messaging.validation.js` does not exist; every POST body is validated only by inline `if (!x) throw ValidationError` checks in the controller.
- **9** controller-level violations of A2 (raw `res.status().json()` instead of `responseHelper`; controller imports `Guest` model and writes to it inside the webhook handler — should be in service).
- **All service methods return `{ success: false, error, message }` envelopes** instead of throwing typed errors (`AppError`, `NotFoundError`, `ForbiddenError`). Controllers re-encode that into HTTP. Direct A3.1 violation, repeated ~15 times.
- **No rate limiting** on any of the expensive externally-triggered endpoints (`/send`, `/send-bulk`, `/retry`, `/send-reminder`, `/schedule`). They cost real money via Taqnyat. Webhook is also unrate-limited (Meta retries can be aggressive).
- **No audit log** writes for `scheduleBulkSend`, `sendBulk`, `retryFailed`, `sendToGuest`, `sendReminder` — A3.6 violation for sensitive paid actions.
- **No idempotency middleware** on `POST /send`, `/send-bulk`, `/retry`, `/send-reminder`, `/schedule`. Internal `withIdempotency()` is used inside `sendBulk` for per-guest dedup, but a fast double-click on the bulk endpoint will fire two payment-incurring batches. Compare to `events.retryLaunch` which does pass `Idempotency-Key`.
- **No host-ownership check** on `sendReminder` and `scheduleBulkSend` (other handlers like `sendToGuest`, `sendBulk`, `retryFailed`, `getEventMessagingStatus` do check). A host with a known eventId could send reminders / schedule sends for any event.
- **3 redundant data layers on the web** for messaging:
  1. `services/messaging.js` (axios per-method wrapper, 127 lines)
  2. `stores/messagingStore.js` (Zustand store wrapping the service, 233 lines — server data in Zustand violates B10)
  3. `hooks/events/mutations/useEventMutation.js` (a React Query mutation factory, only `sendTestMessage` / `scheduleSend` / `submitTemplate` cases for messaging)

  No canonical `hooks/reactQueryHooks/useMessaging.js` exists — direct B0.2 violation.
- **Web hooks fire the dead `/messaging/test` and `/messaging/template/submit` paths** — the web service file already migrated `sendTestInvitation` to `PATCH /events/:id/test-message`, but the React Query mutation in `useEventMutation` still POSTs to the dead path.
- **5** web file-size violations (cap 250):
  - `LastEventStats.jsx` — 572 lines.
  - `useEventMutation.js` — 460 lines.
  - `GuestTable.jsx` — 396 lines.
  - `AdminGuestTable.jsx` — 343 lines.
  - `messagingStore.js` — 233 lines (under cap, but the file should be deleted entirely per §3.5).
- **3** mobile file-size violations (cap 350):
  - `useEventMutations.js` — 415 lines.
  - `ScheduleSendingModal.js` — 361 lines.
  - `SendInvitationModal.js` and `TestMessageModal.js` — 325 / 321 lines (under cap but very close).
- **1** mobile orphan: `getApprovedTemplates` exported from `messagingService.js:296` but never imported by any hook/screen — dead code.
- **1** mobile orphan: `getTemplateStatus`/`TEMPLATE_STATUS` constant in mobile `config/api.js`; no hook uses it.
- **2** web→mobile divergences in API consumption:
  - **Test message:** web service file uses canonical `PATCH /events/:id/test-message`; mobile uses dead `POST /messaging/test`.
  - **Submit template:** both call dead `POST /messaging/template/submit`.
- **40+** phase/flow comment markers in the module surface area to remove (`FLOW-15-F06`, `FLOW-16-F01..F03`, `FLOW-17-F01..F04`, `FLOW-18-F01..F02`, `FLOW-19-F03`, `FLOW-22-F01..F02`, `Phase 3a.5`, `Phase 3b.1`, `Phase 3b.2`, `Phase 3c.1`, `Phase 3d.3`, `Phase 4b W0-RBAC`, `Phase 4c W0-DYNAMIC`, `D3`, `D4b-3`, `H-19`, `L-10`, `M-5`, `M-13`, `M-19`, `PIPELINE-F02`).
- **2** hardcoded Arabic strings in mobile that should go through `t()`: `StepFive.js:25-29` (auto-reply defaults), `PartialFailureBanner.js:32-34`.
- **1** hardcoded Arabic in backend service (acceptable — these are SMS body templates, not UI; flag but keep): `_buildSmsBody`, `sendReminder` default message, `handleButtonResponse` `statusLabel` and `defaultReply`. Recommend extracting to a `messaging.copy.js` constant file for maintainability rather than i18n routing.
- **No transactions** on multi-collection writes: `sendBulk` updates `Event.messagingStatus` and per-`Guest` records sequentially without a session — partial failure leaves divergent state. Acceptable for paid-message paths (idempotency does the heavy lifting), but worth flagging.
- **In-memory stats cache** in `messaging.service.js:24-30` is per-process — incorrect for multi-instance deploys. Flag for the user.
- Estimated effort: **L** (large — backend service split + Joi schemas + Swagger + canonical web/mobile React Query hooks + Zustand removal + 5 web file splits + dead-path migrations on both clients + audit-log additions, all preserving CSS module / StyleSheet output).

---

## 0.1 Locked Decisions (2026-05-07)

These supersede every "VERIFY" / "Decision required" / "Decide:" marker elsewhere in the doc. Implementer follows this section first; the rest of the doc explains the why.

### D1. Kill `POST /messaging/template/submit` end-to-end
Feature is no longer used by the event wizard. Delete:
- Backend: any controller export / service method / offline script (`scripts/submitWhatsAppTemplates.js`) tied to template submission. (No live route exists today; remove the dead controller stub if present.)
- Web: `useEventMutation('submitTemplate')` case (`useEventMutation.js:342-353`), `API_PATHS.invitations.submitTemplate` constant (`api.config.js:284`), and the trigger in `EventActionsHeader.jsx`.
- Mobile: `useSubmitTemplate` (`useEventMutations.js:83-102`), `submitTemplateAPI` (or equivalent) in `messagingService.js`, `MESSAGING.TEMPLATE_SUBMIT` constant (`config/api.js:199`), and the trigger button in `EventActionsHeader.js`.

### D2. Kill `GET /messaging/templates/approved`
The admin-dash already manages Taqnyat templates via `app/[lang]/admin-dash/taqnyat-templates/` against a dedicated `TaqnyatTemplate` model + `useTaqnyatTemplates` hooks. Step 4 of the event wizard will read from DB (TaqnyatTemplate model), not from Taqnyat live. Therefore:
- Backend: delete the route + `getApprovedTemplates` controller export + `getApprovedTemplates` service method.
- Web: drop `API_PATHS.invitations.getApprovedTemplates` constant; do **not** add a `useApprovedTemplates` hook to the canonical `useMessaging.js` (§3.5 list shrinks).
- Mobile: delete the orphan `messagingService.getApprovedTemplates` and `MESSAGING.GET_APPROVED_TEMPLATES` config (if present).

### D3. Kill `GET /messaging/template/status/:eventId`
The wizard flow changed; nothing reads this. Delete the route, controller, service method, web `API_PATHS.invitations.templateStatus` (if present), mobile `MESSAGING.TEMPLATE_STATUS` constant, and any dead service wrappers.

### D4. Kill `GET /messaging/balance`
Not needed. Delete the route, controller export, `messagingService.checkBalance`, web `messagingStore.fetchBalance` + `services/messaging.js` wrapper, mobile `messagingService.checkBalance` + `MESSAGING.BALANCE` constant.

### D5. Kill `GET /messaging/stats/:eventId` AND `GET /messaging/status/:eventId`
Confirmed via codebase audit (2026-05-07): both are **unreferenced by any UI** on web (host single-event page, admin-dash whitelabel single-event page, host dashboard) and mobile.

The data they would have returned is already surfaced through different paths:
- RSVP/check-in counters on host single-event and admin-dash single-event pages come from `GET /events/stats/:id` (events module) → reads `Event.stats`, polled with React Query.
- Host home dashboard counters come from `GET /dashboard/host` → also reads `Event.stats`.
- `Event.messagingStatus` (sent/delivered/read aggregate) is updated in-place by the webhook and read off the Event document, not via a separate fetch.

Therefore delete the routes, controllers, service methods (`getDetailedStats`, `getEventMessagingStatus`), the in-memory stats cache + `invalidateStatsCache` export, web `messagingStore.fetchStats`/`fetchStatus`, web `services/messaging.js` `getInvitationStats` wrapper, mobile `messagingService.getInvitationStats`, and the `MESSAGING.STATS` / `MESSAGING.STATUS` constants in `halla-mobile/config/api.js`. Drop `useMessagingStats` / `useMessagingStatus` from the §3.5 hook list.

> Side effect: §6 item 10 (cache-invalidation on RSVP writes) becomes moot — the cache disappears.

### D6. Delete the Unsplash stock-photo fallback
`messaging.service.js:175` silently substitutes `https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600` when `imagePath` is local. **Delete this branch outright** — production S3 always returns `http(s)://` URLs, so the fallback can only fire in misconfigured environments where silently swapping in a stock photo is worse than failing loud. No config knob.

### D7. Sweep `_legacyToken` parameter in this cleanup
Mobile messaging service signatures still carry `_legacyToken` even though the service reads from `useAuthStore`. Strip it from messaging service signatures and call sites as part of C.1 (when messaging mutations move to their own file). Do NOT touch non-messaging modules in this sweep.

### D8. Bundling strategy — deferred
Implementer chooses commit granularity at execution time; §9 (rollback) still assumes small, revertable commits per ticket.

### Knock-on effect on §7

The plan now has a new **§7.0** that runs FIRST and replaces several A/B/C tickets:

- **A.7** (admin-gate `/balance`) → **superseded by D4** (delete instead).
- **B.1 hook list** (§3.5) — drop `useApprovedTemplates`, `useTemplateStatus`, `useMessagingStats`, `useMessagingStatus`, `useMessagingBalance` from the canonical `useMessaging.js`. Remaining hooks: `useSendInvitation`, `useSendBulkInvitations`, `useRetryFailedInvitations`, `useSendReminder`, `useScheduleSend`, `useSendTestMessage` (PATCH events route).
- **C.3** (submitTemplate decision) → **locked to delete-entirely** per D1.
- **C.4 / C.5** (wire approved-templates / template-status hooks) → **superseded by D2 / D3** (delete instead).
- **§6 item 5** (per-tenant filter on approved templates) → **moot** (endpoint is gone).
- **§6 item 10** (stats cache invalidation) → **moot** (cache is gone).
- **§7.D.1** stays valid; add `/messaging/balance`, `/messaging/stats`, `/messaging/status`, `/messaging/templates/approved`, `/messaging/template/status` to the "must return 0 hits" grep set.

After D1–D5 land, the messaging surface drops from **12 endpoints → 6**: webhook GET, webhook POST, send, send-bulk, retry, send-reminder, schedule. (Test-message lives in events module, not messaging.)

---

## 1. Endpoint Inventory

| # | Method | Path | Controller | Service | Middleware chain | Swagger | Web hook/consumer | Mobile hook/consumer | Status |
|---|--------|------|------------|---------|------------------|---------|-------------------|----------------------|--------|
| 1 | GET    | /messaging/webhook | `webhookVerify` | n/a (controller-only) | (public) | OK | n/a | n/a | KEEP |
| 2 | POST   | /messaging/webhook | `webhook` | `updateDeliveryStatus`, `handleButtonResponse` (via `withIdempotency`), direct `Guest.findOneAndUpdate` in controller | (public, HMAC verified inline) | OK (minimal) | n/a | n/a | KEEP — but **move `Guest.findOneAndUpdate` from controller to service** (A2.3) and **rate-limit the public endpoint** (defense against retry storms). |
| 3 | GET    | /messaging/templates/approved | `getApprovedTemplates` | `getApprovedTemplates` | `protect` | **MISSING** | none — `API_PATHS.invitations.getApprovedTemplates` defined but no hook consumes it | **ORPHAN**: `messagingService.getApprovedTemplates` defined (`messagingService.js:296`) but never imported | **VERIFY**: either wire a `useApprovedTemplates` hook on both clients, or delete the endpoint + the dead client wrappers. Step 4 of event creation (template picker) probably wants this. |
| 4 | GET    | /messaging/template/status/:eventId | `getTemplateStatus` | `getTemplateStatus` | `protect`, `validateObjectId('eventId')` | OK (via path stub) | none | mobile config defines `TEMPLATE_STATUS` constant; **no hook consumes it** | **VERIFY**: same as #3 — wire or delete. Mobile config defines it; nothing reads it. |
| 5 | POST   | /messaging/schedule | `scheduleSend` | `scheduleBulkSend` | `protect`, `requireSubscription` | **MISSING** | `useEventMutation('scheduleSend')` (`useEventMutation.js:173-184`) | `useScheduleSend()` (`useEventMutations.js:166-185`) → `messagingService.scheduleSend` | KEEP — needs Joi schema, Swagger, **idempotency middleware**, **rate limiter**, **host-ownership check in service** (currently only `eventId` lookup; no `event.host === req.user._id` enforcement). |
| 6 | POST   | /messaging/send | `sendToGuest` | `sendToGuest` | `protect`, `requireSubscription` | OK (refers to undefined `SendMessageRequest`) | none — `messagingStore.sendInvitation` exists but is **not** a React Query hook (B10 violation) | none — `messagingService.sendInvitation` defined but no hook consumes it | KEEP — needs Joi schema, **canonical React Query mutation on both clients**, idempotency, audit log. Fix the broken `$ref: '#/components/schemas/SendMessageRequest'` in Swagger or define the schema. |
| 7 | POST   | /messaging/send-bulk | `sendBulk` | `sendBulk` (uses `runBatched`, internal `withIdempotency` per-guest) | `protect`, `requireSubscription` | OK | `messagingStore.sendBulkInvitations` (Zustand action, B10 violation) | `useSendBulkInvitations` (`useEventMutations.js:191-204`) | KEEP — needs Joi schema (with array bounds), **`Idempotency-Key` middleware** on the route (the per-guest dedup inside the service is a different scope), **audit log**, **canonical React Query mutation on web**. |
| 8 | POST   | /messaging/retry | `retryFailed` | `retryFailed` | `protect`, `requireSubscription` | OK | `messagingStore.retryFailedInvitations` (Zustand action) | `useRetryFailed` (`useEventMutations.js:210-223`) | KEEP — needs Joi schema, idempotency, audit log, canonical web hook. |
| 9 | POST   | /messaging/send-reminder | `sendReminder` | `sendReminder` | `protect`, `requireSubscription` | OK | `messagingStore.sendReminder` (Zustand) | `useSendReminder` (`useEventMutations.js:402-415`) | KEEP — needs Joi schema, **host-ownership check** (service doesn't verify `event.host === req.user._id`), **switch sequential `for…of guests` + `setTimeout(200ms)` loop to `runBatched`** (mirrors `sendBulk`), idempotency, audit log, canonical web hook. |
| 10 | GET   | /messaging/balance | `checkBalance` | `checkBalance` | `protect` | OK | `messagingStore.fetchBalance` (Zustand) | `messagingService.checkBalance` (no hook) | **VERIFY** consumer: `messagingStore` exposes `fetchBalance` but it's not used by any rendered component (per audit). Either ship a UI surface or delete the wrapper + endpoint admin gate. Should require `restrictTo(ADMIN, SUPER_ADMIN)` if intended for ops only. |
| 11 | GET   | /messaging/stats/:eventId | `getDetailedStats` | `getDetailedStats` (30s in-memory cache) | `protect`, `validateObjectId('eventId')` | OK (refers to `EventIdParam`) | `messagingStore.fetchStats` (Zustand) | `messagingService.getInvitationStats` (no hook) | **VERIFY** consumer surface: same problem; if no UI uses it, delete the wrapper. If a UI exists, **wire a canonical React Query hook on both clients** so the existing 30s server-side cache pairs with React Query's `staleTime`. Add **host-ownership check** in service. |
| 12 | GET   | /messaging/status/:eventId | `getStatus` | `getEventMessagingStatus` | `protect`, `validateObjectId('eventId')` | OK | none | none | **VERIFY**: no consumer found on either client. Either wire it for the launch progress UI or delete. |

**Legend:** KEEP, DELETE-DUPLICATE-OF-#N, RENAME, MERGE-WITH-#N, VERIFY.

**Frontend-declared paths with NO backend route (404 in production):**

- `POST /messaging/test` — `api.config.js:274` (`API_PATHS.invitations.sendTest`), `messaging.config.api.js:193` (mobile `MESSAGING.SEND_TEST`). Removed in `messaging.routes.js:63` per FLOW-16-F01. Canonical = `PATCH /events/:id/test-message` (events module).
- `POST /messaging/template/submit` — `api.config.js:284` (`API_PATHS.invitations.submitTemplate`), `mobile/config/api.js:199` (`MESSAGING.TEMPLATE_SUBMIT`). Backend has no such route. Only `scripts/submitWhatsAppTemplates.js` references the name in offline tooling.

---

## 2. Backend Findings

### 2.1 File-size violations

- `messaging.service.js` — **1098 lines** (cap 600). Proposed split:
  - `messaging.service.js` (canonical façade, re-exports the rest) — keep `MessagingService` shell + the public method names as a thin façade.
  - `messaging.send.service.js` — `sendTestMessage`, `sendToGuest`, `sendBulk`, `retryFailed`.
  - `messaging.reminder.service.js` — `sendReminder`.
  - `messaging.schedule.service.js` — `scheduleBulkSend`.
  - `messaging.webhook.service.js` — `updateDeliveryStatus`, `handleButtonResponse`.
  - `messaging.stats.service.js` — `getEventMessagingStatus`, `getDetailedStats`, the in-memory cache.
  - `messaging.template.service.js` — `getApprovedTemplates`, `getTemplateStatus`, `_resolveTaqnyatTemplate`.
  - `messaging.formatting.js` — `_getEventBodyParams`, `_buildSmsBody`, `_getEventImageUrl`, `_formatDate` (pure helpers, no DB I/O).

  Each file lands well under 600 lines.

- `messaging.controller.js` — **461 lines** (cap 300). Proposed split:
  - `messaging.controller.js` (canonical façade) — re-exports.
  - `messaging.send.controller.js` — `sendToGuest`, `sendBulk`, `retryFailed`, `sendReminder`.
  - `messaging.schedule.controller.js` — `scheduleSend`.
  - `messaging.stats.controller.js` — `getStatus`, `getDetailedStats`, `checkBalance`, `getApprovedTemplates`, `getTemplateStatus`.
  - `messaging.webhook.controller.js` — `webhook`, `webhookVerify`, `verifyWebhookSignature` helper. **Also**: move the inline `Guest.findOneAndUpdate` call (lines 224-234) **into the service**, leaving the controller pure HTTP.

- `messaging.routes.js` — 209 lines, under cap. No split needed.

### 2.2 Swagger drift

- `POST /messaging/send` references `$ref: '#/components/schemas/SendMessageRequest'` (`messaging.routes.js:89`) — the schema is **not** declared in `config/swagger.js`. Define it: `{ guestId: ObjectId, eventId: ObjectId, channel: 'sms'|'whatsapp' }`.
- `POST /messaging/schedule` (route `messaging.routes.js:72`) — **no @swagger block at all**. Add one: body `{ eventId, scheduledDate (ISO), scheduledTime (HH:mm), channel }`.
- `GET /messaging/templates/approved` (`messaging.routes.js:66`) — **no @swagger block**. Add one (response: `{ success, templates: [{ id, name, category, language, bodyText, hasImageHeader }] }`).
- `GET /messaging/template/status/:eventId` (`messaging.routes.js:69`) — **no @swagger block**. Add one (response: `{ success, testMessageSent, hasTemplateImage }`).
- `POST /messaging/send-bulk`, `/retry`, `/send-reminder` — annotations exist but lack `requestBody` schemas; document the actual body shape.
- `GET /messaging/webhook` annotation lists 3 query params but does not list `403` response (returned when token mismatches) — add it.
- `POST /messaging/webhook` annotation lacks the `401` response and the HMAC header parameter (`x-hub-signature-256`). Add both.

### 2.3 Missing middleware / safeguards

- `POST /messaging/send` — needs **rate limiter** (e.g. an `authLimiter`-style limit) and **`Idempotency-Key`** middleware.
- `POST /messaging/send-bulk` — needs **rate limiter** and **`Idempotency-Key`** middleware (the per-guest dedup inside the service is a different namespace; route-level dedup prevents duplicate batches from a fast double-click).
- `POST /messaging/retry` — needs rate limiter + idempotency.
- `POST /messaging/send-reminder` — needs rate limiter + idempotency. Also needs **host-ownership check** in `messagingService.sendReminder` (currently passes any `eventId` straight through).
- `POST /messaging/schedule` — needs rate limiter + idempotency. Needs **host-ownership check** in `scheduleBulkSend`.
- `POST /messaging/webhook` — public, no `protect`. Recommend a permissive but non-zero rate limiter (Meta retries are bounded; this defends against forged signatures hammering HMAC compute).
- `GET /messaging/balance` — sensitive operational data; add `restrictTo(ROLES.ADMIN, ROLES.SUPER_ADMIN)` (or `requirePageAccess(ADMIN_PAGES.SETTINGS, 'view')` if that page hosts it). Currently any authenticated user can view the company-wide SMS balance.
- **Audit log** missing on:
  - `scheduleBulkSend` (action: `messaging.schedule`)
  - `sendBulk` (action: `messaging.bulk_send`)
  - `retryFailed` (action: `messaging.retry`)
  - `sendToGuest` (action: `messaging.send_one`)
  - `sendReminder` (action: `messaging.reminder`)
  - `handleButtonResponse` write to `Guest.status` (action: `guest.rsvp.button`)

### 2.4 Duplicate / dead endpoints

- `POST /messaging/test` (controller export `exports.sendTestMessage`, lines 73-94) — **the route is gone but the controller method, the service method (`sendTestMessage`, lines 186-240), and the JSDoc comment are still present**. The canonical entry point is `PATCH /events/:id/test-message` in the events module, which already calls `messagingService.sendTestMessage()` internally. Decision: **keep the service method** (it's still the impl that events module delegates to — verify in `events.service.js` then confirm) but **delete `exports.sendTestMessage` from the controller** since it has no route. Remove the dead JSDoc `POST /messaging/test` header. Update `api.config.js` and `mobile/config/api.js` to drop the dead path constant.
  - **Note for Phase 2:** verify `events.service.js:2050+` actually consumes `messagingService.sendTestMessage`. The grep earlier found this require but did not show the call site; confirm before deletion.

### 2.5 Service / controller violations

- **All service methods return `{ success: false, error, message }` envelopes** instead of throwing typed errors. Examples:
  - `sendTestMessage` (service:188-191, 198-202) — should throw `NotFoundError('Event not found')`, `AppError(...,429,'RATE_LIMITED')`.
  - `sendToGuest` (service:256-267) — should throw `NotFoundError`, `ForbiddenError`.
  - `sendBulk` (service:385-392) — same.
  - `retryFailed` (service:489-494) — same.
  - `getEventMessagingStatus`, `getDetailedStats`, `getTemplateStatus`, `scheduleBulkSend`, `sendReminder`, `updateDeliveryStatus`, `handleButtonResponse` — same. Migrate every one to the typed-error pattern.

- **Controller raw `res.status().json()`** — every controller export uses raw responses instead of `responseHelper`. Lines: 82-87, 89-93, 109-115, 117-120, 134-139, 153-158, 169-176, 178-181, 196-199, 312-313, 326-334, 355-368, 377-385, 386-392, 402-410, 411-415, 430-434, 444, 456-457, 458-460. Migrate every one to `sendSuccess`, `sendCreated`, `sendNoContent`. Once services throw typed errors, the failure branches collapse into `globalErrorHandler`.

- **Controller talks to the DB** — `messaging.controller.js:225-234` directly imports `Guest` and calls `Guest.findOneAndUpdate` inside the webhook loop. Move this to a new `messagingService.markGuestAsSmsFallback(messageId)` helper.

- **`console.warn` / `console.error` / `console.log` everywhere**:
  - `messaging.controller.js:45-49` (rawBody fallback warning) — replace with `logger.warn`.
  - `messaging.controller.js:243-248, 300-305` — replace with `logger.error`.
  - `messaging.service.js:138`, `:399`, `:845`, `:865`, `:871`, `:909`, `:936` — all replace with `logger.warn` / `logger.error`. Delete the `console.log` at line 845 entirely (request-tracing log; the global request logger covers it).
  - `messaging.controller.js:44` has an `eslint-disable-next-line no-console` — once migrated to `logger.warn`, the disable comes out.

- **`sendReminder` sequential loop with `setTimeout(200ms)`** (`messaging.service.js:772-809`) — this is the same anti-pattern that `sendBulk` already replaced via `runBatched`. Migrate `sendReminder` to use `runBatched({ concurrency: 5, ratePerSecond: 5 })`. This also fixes the wall-time problem on large reminder batches.

- **`scheduleBulkSend` does not check host ownership** (`messaging.service.js:615-680`) — add the same `event.host && userId && event.host.toString() !== userId.toString()` guard the other methods use, and pass `userId` from the controller.

- **`sendReminder` does not check host ownership** — same fix.

- **In-memory stats cache** (`messaging.service.js:24, 982-987, 1093`) — this is a Map on the singleton, so two app instances each keep their own cache and a write on instance A leaves stale data on instance B. Acceptable for a 30s TTL on a non-critical view, but flag in §6 so ops know.

### 2.6 Validation gaps

`messaging.validation.js` does not exist. Create it with:

- `sendMessageSchema`:
  ```js
  Joi.object({
    guestId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    eventId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    channel: Joi.string().valid('sms', 'whatsapp').default('sms'),
  }).unknown(false)
  ```
- `sendBulkSchema`:
  ```js
  Joi.object({
    guestIds: Joi.array().items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/)).min(1).max(5000).required(),
    eventId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    channel: Joi.string().valid('sms', 'whatsapp').default('sms'),
  }).unknown(false)
  ```
- `retrySchema` — `{ eventId, channel }` same shape minus guestIds.
- `scheduleSchema`:
  ```js
  Joi.object({
    eventId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    scheduledDate: Joi.date().iso().greater('now').required(),
    scheduledTime: Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/).required(),
    channel: Joi.string().valid('sms', 'whatsapp').default('whatsapp'),
  }).unknown(false)
  ```
- `reminderSchema`:
  ```js
  Joi.object({
    eventId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    guestIds: Joi.array().items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/)).optional(),
    channel: Joi.string().valid('sms', 'whatsapp').default('sms'),
    customMessage: Joi.string().max(1000).optional(),
    reminderTemplateName: Joi.string().pattern(/^[a-z0-9_]{1,80}$/).optional(),
  }).unknown(false)
  ```

Wire through `validate(schema)` in routes. Drop the inline `if (!eventId) throw ValidationError(...)` checks in the controllers — Joi covers them.

### 2.7 Comment hygiene

Markers to remove from `messaging.controller.js`:

- L17: `* PIPELINE-F02 / FLOW-18-F01: fail closed when WHATSAPP_APP_SECRET …` — keep the **why** ("fail closed on missing/invalid signature") but drop the FLOW marker.
- L21-26: `* H-19: HMAC is computed over the *raw* request bytes …` — keep the why explanation (it's load-bearing) but drop the `H-19:` prefix.
- L186-191: `* PIPELINE-F02 / FLOW-18-F01:` — drop the markers, keep the security rationale.
- L207-209: phase comment about webhook 200 OK contract — keep the why, drop FLOW reference.
- L214-220: `Phase 3d.3 (FLOW-18-F02): per decision D3 …` — keep the dedup-only-for-button-responses rule as a why, drop the FLOW/D3 references.
- L262-272: the `L-10:` block — keep the rationale (intentional cross-event collision tolerance) as a why, drop the `L-10:` marker.

Markers to remove from `messaging.service.js`:

- L23: `// FLOW-22-F01 / FLOW-19-F03: simple in-memory TTL cache for stats (30s)` → `// 30-second in-memory TTL cache; per-process — see §2.5 of fullstack review for multi-instance caveat.`
- L46-66: `Phase 4c W0-DYNAMIC: …` JSDoc — keep the JSDoc explaining the resolver, drop the phase marker.
- L52-54: `Legacy fallback (audit-corrected from prompt's "4-param" to **5 params** to match the historic shape — see messaging.service.js:37 pre-rename + PHASE_4C_PLAN §0 row 10):` — strip the cross-doc reference, keep the param order list.
- L193-203: `FLOW-16-F03: per-event throttle …` — drop FLOW prefix, keep "30s throttle on test message" rationale.
- L205: `FLOW-16-F02: use the event's actual RSVP preview path; suppress the dead /rsvp/test link` — delete entirely (the code is what it is; prior bug doesn't need to live in the comment).
- L209-211: `Phase 4c W0-DYNAMIC: prefer the cached TaqnyatTemplate …` — drop phase marker.
- L271-273: same.
- L306-307: `FLOW-15-F06: detect rate-limit (429) …` — drop prefix, keep the why (rate-limit is transient; do not mark guest as failed).
- L344-360: long phase comment block in `sendBulk` — keep the technical why (concurrency 5 / 10 per second; idempotency keying), drop the `Phase 3b.1`, `Phase 3b.2`, `FLOW-14-F04`, `FLOW-17-F01`, `FLOW-17-F02` prefixes.
- L394: `// FLOW-17-F04: validate all guestIds belong to this event before sending` — drop prefix, keep description (or drop entirely; the code's intent is obvious).
- L437: `// FLOW-17-F03: persist stats incrementally so a crash mid-loop doesn't lose progress` — drop prefix, keep the why.
- L463-466: `// The bulk operation itself is success: true if at least one send succeeded …` — keep entirely; this is a real semantic invariant.
- L520-523: `// retryFailed runs outside the runEventLaunch lifecycle, so the event's lastAttemptAt may still point at the original cron attempt …` — keep entirely (good why).
- L607-613: `// Phase 3a.5 removed the Taqnyat-native SMS scheduling branch entirely …` — drop, this is git-history territory.
- L626-633: `// Phase 4b W0-RBAC (D4b-3): backend lower bound on the schedule picker.` — drop the marker; keep the why ("client picker can be bypassed").
- L709-712: `// M-5: explicit Asia/Riyadh time zone …` — drop the M-5 prefix, keep the why.
- L982: `// FLOW-22-F01: 30-second in-memory cache` — drop, the line above already says it.

Markers to remove from `messaging.routes.js`:

- L63: `// FLOW-16-F01: POST /messaging/test removed — canonical endpoint is PATCH /events/:id/test-message` — once Phase 2 cleans the `api.config.js` references, **delete this comment entirely** (it's a tombstone).

Total markers to clean: roughly **40** lines across the three module files.

### 2.8 Other backend smells

- `messaging.service.js:730` default `reminderTemplateName = 'halaa_event_reminder_v2'` is hardcoded; move to `config/index.js` (`config.taqnyat.reminderTemplateName`).
- `messaging.service.js:206` default `frontendUrl = 'https://halaa.sa'` and `:269`, `:773` repeat the literal — extract to `config.frontend.url` only (already partly there; the `||` fallbacks should go now that `config` is required).
- `messaging.service.js:925` hardcodes `https://quickchart.io/qr?text=...&size=300` — fine for now, but flag for a config-knob in case ops want a self-hosted QR renderer.
- `messaging.service.js:175` hardcodes `https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600` as a header-image fallback when `imagePath` is local — this is a **production code path** silently substituting a stock photo. Flag in §6 (Suspected Bugs).
- `messaging.controller.js:69` JSDoc still says `POST /messaging/test` — already covered in §2.4.

---

## 3. Frontend Web Findings

### 3.1 Component tree per page

- `app/[lang]/host/HostDashboardContent.jsx` (no direct messaging import; mounts `LastEventStats`)
  - `ui/host/main-page/latsEventStats/LastEventStats.jsx` (572 lines) — **VIOLATION cap=250**
    - `ui/host/main-page/TestMessagePopup.js` (126 lines) — uses `useEventMutation('sendTestMessage')` (DEAD path)
- `app/[lang]/host/events/[id]/_components/EventHeader.jsx`
  - `ui/host/events/EventActionsHeader.jsx` (153 lines) — uses `useEventMutation('sendTestMessage')` and `useEventMutation('submitTemplate')` (BOTH DEAD)
    - `ui/host/main-page/TestMessagePopup.js` (126 lines)
- `app/[lang]/host/events/[id]/_components/GuestTable.jsx` (396 lines) — **VIOLATION cap=250** — imports `useMessagingStore` and calls `sendInvitation` / `sendBulkInvitations` directly (B0.2 violation)
- `app/[lang]/admin-dash/events/[id]/_components/AdminGuestTable.jsx` (343 lines) — **VIOLATION cap=250** — same Zustand-store pattern as host counterpart
- `ui/host/popups/sendInvitationPopup/SendInvitationPopup.js` (103 lines) — references `messaging` (likely wraps the store).

**Files involved that I have not opened in detail (Phase 1 scope) — Phase 2 must inventory their tree:**

- `ui/host/main-page/latsEventStats/LastEventStats.jsx` — 572 lines is too large to be one component; expect inline cards / repeated JSX that B9/B20 will split.
- `app/[lang]/host/events/[id]/_components/EventFailureBanner.jsx` (203 lines) — uses `useRetryLaunch` (events-module concern), no direct messaging dependency confirmed; flag for re-audit.

### 3.2 File-size violations

- `labbe/ui/host/main-page/latsEventStats/LastEventStats.jsx` — **572 lines**. Proposed split (preserve CSS module + class names): extract `<StatCard>`, `<StatsRow>`, `<MessagingStatusPanel>`, `<TestMessageSection>` (host the existing TestMessagePopup trigger). **Style preservation note:** every `styles.foo` reference must continue to resolve from the existing `LastEventStats.module.css`; child components import the same module file rather than getting renamed sibling modules.
- `labbe/hooks/events/mutations/useEventMutation.js` — **460 lines**. Proposed split: extract messaging cases (`sendTestMessage`, `scheduleSend`, `submitTemplate`) into a new `hooks/reactQueryHooks/useMessaging.js` (see §3.5), and split the remaining cases by area (`useEventGuestMutation.js`, `useEventStaffMutation.js`, etc.). Goal: **delete** the messaging branch from this file once the canonical `useMessaging.js` exists.
- `labbe/app/[lang]/host/events/[id]/_components/GuestTable.jsx` — **396 lines**. Migrate from `useMessagingStore` to `useMessaging.useSendInvitation / useSendBulkInvitations` (canonical hook from §3.5), then split the now-smaller component into `<GuestTableRow>`, `<GuestTableHeader>`, `<GuestTableActions>`. **Preserve all `styles.*` class references.**
- `labbe/app/[lang]/admin-dash/events/[id]/_components/AdminGuestTable.jsx` — **343 lines**. Same migration + split as GuestTable.
- `labbe/stores/messagingStore.js` — 233 lines but **slated for deletion** per §3.5; do not split.

### 3.3 Hardcoded text / data / paths

- `labbe/services/messaging.js:17,33,48,79,92,100,105,115,122` — **hardcoded `/messaging/*` literals**. Replace with `API_PATHS.invitations.*`. (Note this file may be deleted entirely after §3.5; if so, the hardcoded literals disappear with it.)
- `labbe/stores/messagingStore.js` — uses `messagingService.x()` so no path literals there, but also slated for deletion.
- `labbe/hooks/events/mutations/useEventMutation.js:163` — `path: API_PATHS.invitations.sendTest` POSTs to dead `/messaging/test`. **Fix:** rewrite the mutation to call `apiRequest({ method: 'PATCH', path: API_PATHS.events.testMessage(eventId), data: { phoneNumber, channel } })` (the canonical route already used by `services/messaging.js:62-68`). Verify `API_PATHS.events.testMessage` exists; if not, add it.
- `labbe/hooks/events/mutations/useEventMutation.js:346` — `path: API_PATHS.invitations.submitTemplate` POSTs to dead `/messaging/template/submit`. **Decision required:** confirm with the user whether the backend should add `POST /messaging/template/submit` (calling Taqnyat's Submit-Template API) or whether the frontend feature is dead and should be removed. Flag in §6.

### 3.4 Data mapping bugs / fallback chains

- `labbe/stores/messagingStore.js:95-98` — `result.data?.total || selectedGuests.length` — falls back to the local count when backend returns 0 or missing; this masks the bug case (`total = 0` is a valid backend value meaning "no guests met the filter"). Replace with the exact path `result.data.total` once Section A enforces the shape; failing that, `result.data?.total ?? 0`.
- `labbe/stores/messagingStore.js:60, 107, 128, 149, 170, 188, 207` — `error.response?.data?.message || error.message` — fine at the API boundary; keep.
- No multi-branch fallback chains found in `services/messaging.js`. Each method does `return response.data;` directly.

### 3.5 Duplicate hooks / direct apiRequest calls

**Three layers calling the same endpoints — consolidate.**

- `labbe/services/messaging.js` (raw axios per method, 127 lines) — calls `/messaging/*` paths directly with hardcoded literals.
- `labbe/stores/messagingStore.js` (Zustand store wrapping the service, 233 lines) — caches `stats`, `balance`, `sendProgress` in Zustand state instead of React Query. **B10 violation: server data in Zustand.**
- `labbe/hooks/events/mutations/useEventMutation.js` — only `sendTestMessage`, `scheduleSend`, `submitTemplate` cases for messaging; the other 7 endpoints (`send`, `send-bulk`, `retry`, `send-reminder`, `balance`, `stats`, `status`) have **no React Query mutation/query**.

**Plan:** create `labbe/hooks/reactQueryHooks/useMessaging.js` as the canonical hook file. Export:

- `useSendInvitation()` mutation — POST `/messaging/send`
- `useSendBulkInvitations()` mutation — POST `/messaging/send-bulk`
- `useRetryFailedInvitations()` mutation — POST `/messaging/retry`
- `useSendReminder()` mutation — POST `/messaging/send-reminder`
- `useScheduleSend()` mutation — POST `/messaging/schedule`
- `useMessagingStats(eventId)` query — GET `/messaging/stats/:eventId` with `staleTime: 30_000` (matches the server-side cache TTL).
- `useMessagingStatus(eventId)` query — GET `/messaging/status/:eventId`.
- `useApprovedTemplates()` query — GET `/messaging/templates/approved` with `staleTime: 5 * 60_000`.
- `useTemplateStatus(eventId)` query — GET `/messaging/template/status/:eventId`.
- `useMessagingBalance()` query — GET `/messaging/balance`, gated on admin role.
- `useSendTestMessage()` mutation — `PATCH /events/:id/test-message` (canonical, not the dead `/messaging/test` path).

Each mutation calls `queryClient.invalidateQueries({ queryKey: ['messaging', 'stats', eventId] })` and `['events', eventId]` on success.

**Then:** delete `stores/messagingStore.js` and `services/messaging.js` entirely. Migrate `GuestTable.jsx`, `AdminGuestTable.jsx`, `SendInvitationPopup.js` to import from `useMessaging.js`. Remove the messaging cases from `useEventMutation.js`.

This consolidation is the single largest cleanup in the web column.

### 3.6 State / loading / error gaps

- `LastEventStats.jsx` (572 lines) — must inventory in Phase 2 for missing `isLoading` / `error` branches; the size suggests inline conditional render. Add `<SimpleLoading />` and `<ErrorFallback />` per B13.
- `GuestTable.jsx` (396 lines) — currently calls Zustand actions which bypass React Query loading state; after the migration each action becomes a `mutateAsync` and the row should disable while in flight (already partially in store via `isSending`). Preserve current visual loading behavior exactly.
- `TestMessagePopup.js:24` — the `useEventMutation('sendTestMessage')` is the broken path. Once §3.3 fixes the mutation, the popup keeps its existing loading/error UX.

### 3.7 Comment hygiene

- `labbe/hooks/events/mutations/useEventMutation.js:316-322` — `M-19: send a per-click Idempotency-Key …` — drop the `M-19` marker; keep the why ("server-side eventLock + Idempotency-Key dedup fast double-clicks").
- `labbe/services/messaging.js:63` — `// FLOW-16-F01: migrated to canonical events endpoint` — delete the marker; the migration is complete.

(The web column has fewer phase markers than backend because the messaging surface is small.)

### 3.8 Locale-namespace check

- `TestMessagePopup.js` uses `useTranslation("home-events")` — verify the keys it uses (`testMessage.*`) are present in both `localization/locales/en/home-events.json` and `localization/locales/ar/home-events.json`. Phase 2 must list any missing keys in §8.

---

## 4. Frontend Mobile Findings

### 4.1 Screen → component tree

- `screens/host/HomeScreen.js` (or whichever screen renders the action header — Phase 2 to confirm by re-grepping `EventActionsHeader`)
  - `components/home/EventActionsHeader.js` — uses `useSubmitTemplate`, `useNotifyStaff` (DEAD `useSubmitTemplate`)
  - `components/home/SendInvitationModal.js` (325 lines) — `useSendBulkInvitations`
  - `components/home/TestMessageModal.js` (321 lines) — `useSendTestMessage` (DEAD)
  - `components/home/ScheduleSendingModal.js` (361 lines) — **VIOLATION cap=350** — `useScheduleSend`
  - `components/home/PartialFailureBanner.js` (72 lines) — reads `event.messagingStatus`; no hook
- `components/createEvent/StepFive.js` (192 lines) — auto-reply defaults hardcoded (Arabic)
- `services/messagingService.js` (314 lines) — uses `apiFetch` (✓), exports 8 functions including the orphan `getApprovedTemplates`

### 4.2 File-size violations

- `halla-mobile/components/home/ScheduleSendingModal.js` — **361 lines** (cap 350). Proposed split: extract `<DatePickerSection/>`, `<TimePickerSection/>`, `<ChannelSelector/>`. **Style preservation:** every `StyleSheet.create({...})` value moves verbatim to the extracted components.
- `halla-mobile/hooks/mutations/useEventMutations.js` — **415 lines** (cap 350). Proposed split: extract messaging cases (`useSendTestMessage`, `useScheduleSend`, `useSendBulkInvitations`, `useRetryFailed`, `useSendReminder`, `useSubmitTemplate`) into a new `halla-mobile/hooks/mutations/useMessagingMutations.js`; keep the events-only mutations in `useEventMutations.js`.
- `halla-mobile/components/home/SendInvitationModal.js` (325) and `TestMessageModal.js` (321) are under cap but close — Phase 2 to monitor.

### 4.3 Service / hook violations

- **`messagingService.js:180`** — `sendTestInvitation` POSTs `/messaging/test` (dead path). **Fix:** rewrite to `apiFetch(\`/events/${eventId}/test-message\`, { method: 'PATCH', body: { phoneNumber, channel } })` — match web canonical.
- **`useEventMutations.js:83-102`** — `useSubmitTemplate` POSTs `ENDPOINTS.MESSAGING.TEMPLATE_SUBMIT = '/messaging/template/submit'` (dead path). Same decision required as web (§3.3) — confirm whether the backend should add the route or the feature is dead.
- **`messagingService.js:294-302` `getApprovedTemplates`** — exported but never imported. **Decision:** either wire `useApprovedTemplates` via a query hook in `hooks/queries/useMessaging.js` and consume in the event-creation step-4 dropdown, or delete the function + the `MESSAGING.GET_APPROVED_TEMPLATES` config (if it exists) + the backend route.
- **`config/api.js` `MESSAGING.TEMPLATE_STATUS`** — defined, but no consumer. Same decision: wire or delete.
- **No mobile React Query hook** for `getMessagingStats(eventId)`, `checkBalance()`, `getStatus(eventId)` — same gap as web. Add to a new `hooks/queries/useMessaging.js` if the UI needs them; otherwise delete the service functions.

### 4.4 Hardcoded text / data / paths

- `halla-mobile/components/createEvent/StepFive.js:25-29` — Arabic auto-reply defaults inline:
  ```js
  onAttend: "شكراً لتأكيد حضورك! ..."
  onExpected: "شكراً لردّك! ..."
  onAbsent: "شكراً لإعلامنا ..."
  ```
  Move to `halla-mobile/localization/<ns>.json` (`createEvent.guestReplies.defaults.*`) and read via `t()`. Note: these defaults must match the backend dual-write fallback in `messaging.service.handleButtonResponse` (lines 916-920) so that a host who never edits the field gets the same auto-reply text the backend would send. **Phase 2 must verify the strings are byte-identical.**
- `halla-mobile/components/home/PartialFailureBanner.js:32-34` — `"إرسال جزئي للدعوات"` / `"لم يتم إرسال X من أصل Y دعوة"` hardcoded. Migrate to `t()` with the `home-events` namespace (or whichever the project uses for host home).
- `halla-mobile/services/messagingService.js` — endpoint constants come from `ENDPOINTS.MESSAGING.*` (✓ no hardcoded path literals).

### 4.5 Web/Mobile divergence

| Endpoint | Web reality | Mobile reality | Backend truth | Action |
|---|---|---|---|---|
| Test message | `services/messaging.js` calls `PATCH /events/:id/test-message` ✓; but `useEventMutation('sendTestMessage')` calls dead `POST /messaging/test` ✗ | `messagingService.sendTestInvitation` calls dead `POST /messaging/test` ✗ | `PATCH /events/:id/test-message` (in events module) | Fix both clients (web React Query mutation + mobile service) to use the canonical route. |
| Submit template | Web `useSubmitTemplate` calls dead `POST /messaging/template/submit` ✗ | Mobile `useSubmitTemplate` calls dead `POST /messaging/template/submit` ✗ | **NO ROUTE EXISTS** | Decide: add route or remove feature. Flag in §6. |
| Approved templates | No consumer | Service function exists, never called | `GET /messaging/templates/approved` (works) | Either wire on both clients (preferred — event creation step 4 needs the dropdown) or delete the orphan. |
| Stats | Zustand store action `fetchStats` (no consumer surface I confirmed) | Service function `getInvitationStats` (no hook consumer) | `GET /messaging/stats/:eventId` (works) | Wire React Query hook on both, or delete. |
| Balance | Zustand `fetchBalance` (no UI consumer) | Service `checkBalance` (no consumer) | `GET /messaging/balance` (works, but should be admin-gated per §2.3) | Decide: ship admin balance widget or delete. |
| Status | None | None | `GET /messaging/status/:eventId` (works) | Decide: wire or delete. |
| Send / Send-Bulk / Retry / Send-Reminder | Zustand-only on web ✗ | React Query mutations on mobile ✓ | as routed | Web must add canonical React Query mutations (§3.5) so both clients consume the same way. |

### 4.6 Loading / error / empty states

- `SendInvitationModal.js`, `TestMessageModal.js`, `ScheduleSendingModal.js` — Phase 2 must confirm each renders an explicit error state (not just toast on failure) and an idle/loading branch on the submit button. Modal-level error views are the project standard.
- `PartialFailureBanner.js` (72 lines) — straightforward; verify it handles the case `failedCount === 0 && partial === false`.

### 4.7 Comment hygiene

- `halla-mobile/services/messagingService.js` — the explore agent flagged `Phase 4 W0-AUTH:` headers at the top; verify and remove (Phase 2). The `_legacyToken` parameter (still present per `useEventMutations.js:1008` and the service signatures) is also a slated-for-removal concern but should be done in a sweep, not piecemeal.
- `halla-mobile/hooks/mutations/useEventMutations.js` — remove any FLOW/PHASE markers that surface during Phase 2 (the file currently runs to 415 lines and likely contains several).

---

## 5. Cross-Platform API Consumption Diff

| Endpoint | Web | Mobile | Backend truth | Action |
|----------|-----|--------|---------------|--------|
| Test message | `PATCH /events/:id/test-message` (service) ✓ / `POST /messaging/test` (RQ mutation) ✗ | `POST /messaging/test` ✗ | `PATCH /events/:id/test-message` | Fix web RQ mutation; fix mobile service. |
| `POST /messaging/template/submit` | Used (dead) | Used (dead) | **404** | Decide route-add vs. feature-delete. |
| `GET /messaging/templates/approved` | Not consumed | Service exists, unused | Works | Wire on both, or delete. |
| `GET /messaging/template/status/:eventId` | Not consumed | Constant defined, no hook | Works | Wire on both, or delete. |
| `POST /messaging/send` | Zustand only | Service exists, no hook | Works | Add canonical RQ hook on both. |
| `POST /messaging/send-bulk` | Zustand only | RQ mutation ✓ | Works | Add canonical RQ hook on web. |
| `POST /messaging/retry` | Zustand only | RQ mutation ✓ | Works | Add canonical RQ hook on web. |
| `POST /messaging/send-reminder` | Zustand only | RQ mutation ✓ | Works | Add canonical RQ hook on web. |
| `POST /messaging/schedule` | RQ mutation ✓ | RQ mutation ✓ | Works | Body shape: confirm both send `{ eventId, scheduledDate, scheduledTime, channel }` exactly (Phase 2 grep). |
| `GET /messaging/balance` | Zustand only | Service exists, no hook | Works (but should be admin-gated) | Wire admin-only RQ hook + backend RBAC. |
| `GET /messaging/stats/:eventId` | Zustand only | Service exists, no hook | Works | Wire RQ hook on both with `staleTime: 30s`. |
| `GET /messaging/status/:eventId` | None | None | Works | Decide: wire or delete. |

**Body-shape divergences (all paths):** none confirmed; both clients send `{ guestId, eventId, channel }`, `{ guestIds, eventId, channel }`, etc., per the service-file source. Phase 2 must re-grep after the §3.5 web migration to confirm the canonical hooks send the same fields.

**Response-shape mismatches:** none confirmed in Phase 1 — both clients consume `response.data` envelope. Once Section A enforces typed errors and `responseHelper`, the wire shape becomes `{ success, data, message }` and clients should read `result.data.*` directly (no fallback chains). Currently fine.

---

## 6. Suspected Bugs Worth Verifying

1. **`POST /messaging/test` is a 404 in production**, but the mobile app and the web React Query mutation still call it. Likely the test-message popup on mobile silently fails until the user notices. Verify by attempting to send a test message on mobile staging — the network tab should show 404.
2. **`POST /messaging/template/submit` is a 404 in production.** Both clients have a "Submit Template" button wired through `useSubmitTemplate`. Verify whether anyone has tested this end-to-end recently. If the feature is required, the backend needs the route (probably calling `taqnyat.submitTemplate(...)`).
3. **`messaging.service.js:175`** — when an event has a local-only `imagePath` (no `http` prefix), the service substitutes a hardcoded Unsplash photo (`photo-1492684223066-81342ee5ff30`). Hosts who upload a local-storage image (dev environment? misconfigured S3?) will silently get a stock photo on the WhatsApp invitation. Verify the S3 upload path always returns an `http` URL in production; if so this branch is unreachable and should be deleted.
4. **`scheduleBulkSend` and `sendReminder` accept any `eventId` from any authenticated user** — no `event.host === userId` check. A logged-in host could schedule sends or fire reminders for events they don't own (if they can guess the eventId). Verify; if confirmed, this is a privilege-escalation bug.
5. **`getApprovedTemplates` returns the **entire** Taqnyat-account template catalog** — there's no per-tenant filter. In a whitelabel deployment, this could leak template names across tenants. Check whether Taqnyat templates are tenant-scoped at the BSP level, and if not, scope the response by `req.user.whitelabelId`.
6. **`handleButtonResponse` matches Guest by phone variant set, sorted by `invitation.sentAt`** (`messaging.service.js:860-863`). If a phone number is shared across two events (e.g., a regular guest), the most-recent-invite wins. This is probably intended, but worth confirming with the user.
7. **`webhook` swallows per-status errors with `console.error`** (`messaging.controller.js:243-247, 300-305`). If Taqnyat sends a malformed status payload, the loop continues but the operator never sees an aggregated error. Migrate to `logger.error` with structured fields so it lands in the alerting pipeline.
8. **`runBatched` rate cap of 10/sec** in `sendBulk` (`messaging.service.js:444`) — flagged in the comment as the negotiated Taqnyat limit. Verify with ops whether the contract has been raised; events with 5000+ guests will take ~9 minutes wall-clock and may hit the 10-minute cron-tick window margin.
9. **Mobile `useEventMutations.js` still passes `_legacyToken` parameter** to messaging service calls (per audit). The service ignores it and reads from `useAuthStore`. This is dead-code; sweep when the messaging mutations move to the new file.
10. **`stats` cache invalidation** — `invalidateStatsCache(eventId)` (`messaging.service.js:28`) is exported but Phase 1 did not confirm it's called from RSVP/check-in writes in `events.service.js` / `guests.service.js`. If not, the 30s stats cache shows stale RSVP counts. Verify call sites.

---

## 7. Implementation Plan (Ordered)

Apply changes in this order.

### 7.0 Endpoint deletions (do FIRST per §0.1 D1–D5)

Run this phase before A/B/C — every later ticket assumes the deleted endpoints are already gone, so doing it first prevents wasted work writing Joi schemas / Swagger blocks / RQ hooks for routes that won't exist.

- [ ] **0.1** Delete backend route + controller export + service method for `POST /messaging/template/submit` (D1). Also delete `scripts/submitWhatsAppTemplates.js` if it has no other purpose.
- [ ] **0.2** Delete backend route + `getApprovedTemplates` controller + service method (D2). Confirm no other module requires it.
- [ ] **0.3** Delete backend route + `getTemplateStatus` controller + service method (D3).
- [ ] **0.4** Delete backend route + `checkBalance` controller + service method (D4).
- [ ] **0.5** Delete backend routes + controllers + service methods for `getDetailedStats` and `getEventMessagingStatus` (D5). Also delete the in-memory stats cache (`messaging.service.js:24-30`), the `invalidateStatsCache` export, and any call sites in other modules (re-grep across `labbe-backend-` to confirm 0 callers before deletion).
- [ ] **0.6** Delete the Unsplash fallback branch at `messaging.service.js:175` (D6) — let an unexpected non-`http` `imagePath` throw / fail loudly instead of silently swapping in a stock photo.
- [ ] **0.7** Web client cleanup of dead endpoint references:
  - Drop from `labbe/services/new-backend/api.config.js`: `submitTemplate`, `getApprovedTemplates`, `templateStatus` (if present), `balance`, `stats`, `status`, `sendTest` (the dead `/messaging/test` constant; `sendTest` should now point at `events.testMessage` if any caller still needs the alias, otherwise remove).
  - Delete from `labbe/stores/messagingStore.js`: `fetchBalance`, `fetchStats`, `fetchStatus` actions and any related state slices. (The whole file is slated for deletion in B.8 — these may go away with it; just don't migrate them into the new `useMessaging.js`.)
  - Delete the `submitTemplate` case from `labbe/hooks/events/mutations/useEventMutation.js:342-353` and remove the trigger button in `ui/host/events/EventActionsHeader.jsx`.
  - Delete from `labbe/services/messaging.js`: `getInvitationStats`, `checkBalance`, `submitTemplate`, `getApprovedTemplates`, `getTemplateStatus` wrappers (file may be deleted entirely in B.8 anyway).
- [ ] **0.8** Mobile client cleanup of dead endpoint references:
  - Drop from `halla-mobile/config/api.js`: `MESSAGING.SEND_TEST`, `MESSAGING.TEMPLATE_SUBMIT`, `MESSAGING.GET_APPROVED_TEMPLATES` (if present), `MESSAGING.TEMPLATE_STATUS`, `MESSAGING.BALANCE`, `MESSAGING.STATS`, `MESSAGING.STATUS`.
  - Delete from `halla-mobile/services/messagingService.js`: `getApprovedTemplates`, `getTemplateStatus`, `getInvitationStats`, `checkBalance`, and the submit-template wrapper.
  - Delete `useSubmitTemplate` from `halla-mobile/hooks/mutations/useEventMutations.js:83-102` and the trigger button in `components/home/EventActionsHeader.js`.
- [ ] **0.9** `_legacyToken` sweep (D7) — strip the parameter from messaging service signatures and call sites in `halla-mobile/services/messagingService.js` and `halla-mobile/hooks/mutations/useEventMutations.js` (do this AFTER C.1 has moved messaging mutations into their own file so the sweep is small).
- [ ] **0.10** Re-grep across both clients and the backend for the dead path literals: `/messaging/test`, `/messaging/template/submit`, `/messaging/templates/approved`, `/messaging/template/status`, `/messaging/balance`, `/messaging/stats`, `/messaging/status`. Expected hits: zero (excluding test fixtures, docs, git history).

### 7.A Backend

- [ ] **A.1** Create `messaging.validation.js` with Joi schemas (`sendMessageSchema`, `sendBulkSchema`, `retrySchema`, `scheduleSchema`, `reminderSchema`); wire `validate(...)` in `messaging.routes.js` for `/send`, `/send-bulk`, `/retry`, `/schedule`, `/send-reminder`. Drop the inline `if (!x) throw ValidationError` checks in the controller. *(routes:72,96,113,130,148; controller:73-94,100-121,127-140,146-159,341-369,422-436)*
- [ ] **A.2** Migrate every service method's failure path from `return { success: false, error, message }` to `throw new NotFoundError/ForbiddenError/AppError(...)`. *(service:188-191, 198-202, 256-267, 280-282, 385-392, 489-494, 540-545, 617-619, 622-624, 690-692, 733-735, 990-992)*
- [ ] **A.3** Migrate every controller success path to `sendSuccess` / `sendCreated` / `sendNoContent`; let typed errors land in `globalErrorHandler`. *(controller:73-94, 100-121, 127-140, 146-159, 165-182, 341-369, 375-393, 399-416, 422-436, 442-445, 451-461)*
- [ ] **A.4** Move `Guest.findOneAndUpdate` from `messaging.controller.js:225-234` into a new `messagingService.markGuestAsSmsFallback(messageId)`. Controller calls service.
- [ ] **A.5** Add **`Idempotency-Key` middleware** to `POST /send`, `/send-bulk`, `/retry`, `/send-reminder`, `/schedule`. *(routes)*
- [ ] **A.6** Add a rate limiter (existing `authLimiter` or a new `messagingLimiter`) to `/send`, `/send-bulk`, `/retry`, `/send-reminder`, `/schedule`, and a permissive limiter to `POST /webhook`. *(routes)*
- [ ] ~~**A.7** Add `restrictTo(ADMIN, SUPER_ADMIN)` (or `requirePageAccess`) to `GET /balance`.~~ **SUPERSEDED by §0.1 D4** — endpoint is being deleted in 7.0.4.
- [ ] **A.8** Add host-ownership check to `messagingService.sendReminder` and `messagingService.scheduleBulkSend` (mirror the pattern in `sendToGuest`/`sendBulk`). Pass `userId` through from controllers. *(service:615-680, 730-817; controller:341-369, 422-436)*
- [ ] **A.9** Replace the sequential `for...of pendingGuests` + `setTimeout(200)` loop in `sendReminder` with `runBatched(..., { concurrency: 5, ratePerSecond: 5 })`. *(service:772-809)*
- [ ] **A.10** Add `logAudit` calls to: `scheduleBulkSend`, `sendBulk`, `retryFailed`, `sendToGuest`, `sendReminder`, `handleButtonResponse` (last one for the RSVP write).
- [ ] **A.11** Replace every `console.log/warn/error` in `messaging.service.js` and `messaging.controller.js` with the shared `logger`. *(controller:44-49, 244-247, 301-304; service:138, 399, 845, 865, 871, 909, 936)*
- [ ] **A.12** Delete the dead `exports.sendTestMessage` from `messaging.controller.js:73-94` (route is gone). Keep `messagingService.sendTestMessage` (events module delegates to it — verify in `events.service.js` first; A.0 prerequisite).
- [ ] **A.13** Split `messaging.service.js` (1098 lines) into 8 sibling files per §2.1; the canonical file becomes a thin façade re-exporting the others. **Preserve every method signature and the `messagingService` singleton export.**
- [ ] **A.14** Split `messaging.controller.js` (461 lines) into 4 sibling files per §2.1; the canonical file becomes a thin façade re-exporting all controller exports.
- [ ] **A.15** Add `@swagger` annotations for `/templates/approved`, `/template/status/:eventId`, `/schedule`. Define the `SendMessageRequest` schema in `config/swagger.js`. Add the `x-hub-signature-256` header parameter and `401` response to the webhook annotations. *(routes:23-44, 47-56, 65-72)*
- [ ] **A.16** Comment-hygiene pass per §2.7 (≈40 markers across the three module files). Preserve "why" rationales, drop FLOW/PHASE/H/M/L/D markers.
- [ ] **A.17** Move hardcoded `reminderTemplateName = 'halaa_event_reminder_v2'` and stock-photo fallback URL to `config/index.js`. *(service:730, 175)*
- [ ] ~~**A.18** Verify `messagingService.invalidateStatsCache(eventId)` is called from RSVP/check-in writes…~~ **MOOT** — cache is deleted in 7.0.5 (D5).

### 7.B Web

- [ ] **B.1** Create `labbe/hooks/reactQueryHooks/useMessaging.js` with the 11 hooks listed in §3.5. Each mutation invalidates `['messaging', 'stats', eventId]` and `['events', eventId]` on success.
- [ ] **B.2** In `useMessaging.js`, the `useSendTestMessage` hook **must call `PATCH /events/:id/test-message`** (canonical), not `/messaging/test`.
- [ ] **B.3** Migrate `app/[lang]/host/events/[id]/_components/GuestTable.jsx` from `useMessagingStore` to `useMessaging.useSendInvitation` + `useSendBulkInvitations`. **Preserve every `styles.*` reference and the existing JSX tree.** *(file:line — Phase 2 to identify exact lines)*
- [ ] **B.4** Migrate `app/[lang]/admin-dash/events/[id]/_components/AdminGuestTable.jsx` from `useMessagingStore` to `useMessaging.*`. Same style preservation.
- [ ] **B.5** Migrate `ui/host/popups/sendInvitationPopup/SendInvitationPopup.js` from store to canonical hook.
- [ ] **B.6** Migrate `ui/host/main-page/TestMessagePopup.js:24` from `useEventMutation('sendTestMessage')` to `useMessaging.useSendTestMessage`.
- [ ] **B.7** Migrate `ui/host/events/EventActionsHeader.jsx` similarly; resolve the `useSubmitTemplate` decision (§6 item 2) before changing this file.
- [ ] **B.8** Delete `labbe/stores/messagingStore.js` and `labbe/services/messaging.js` once no consumer references them. *(grep `useMessagingStore` and `services/messaging` returns 0).*
- [ ] **B.9** Remove the messaging mutation cases from `labbe/hooks/events/mutations/useEventMutation.js` (`sendTestMessage`:159-170, `scheduleSend`:173-184, `submitTemplate`:342-353). Cleans the file from 460 → ~430 lines.
- [ ] **B.10** Update `labbe/services/new-backend/api.config.js` — drop the `sendTest: '/messaging/test'` and `submitTemplate: '/messaging/template/submit'` entries (or replace with the canonical paths once §6 decisions land). *(api.config.js:274,284)*
- [ ] **B.11** Split `LastEventStats.jsx` (572 → ≤250 lines) per §3.2 — extract `<StatCard>`, `<StatsRow>`, `<MessagingStatusPanel>`, `<TestMessageSection>`. **Preserve `LastEventStats.module.css` and every class reference.**
- [ ] **B.12** Split `GuestTable.jsx` (396 → ≤250) and `AdminGuestTable.jsx` (343 → ≤250). Same preservation rules.
- [ ] **B.13** Replace any phase markers found by Phase 2 grep across the web messaging surface (FLOW/M/H/PHASE).
- [ ] **B.14** Verify `i18next` keys for the test-message popup, send-invitation popup, and partial-failure banner exist in both `en/home-events.json` and `ar/home-events.json`. Add missing keys to §8.

### 7.C Mobile

- [ ] **C.1** Create `halla-mobile/hooks/queries/useMessaging.js` and `halla-mobile/hooks/mutations/useMessagingMutations.js` (the mobile canonical pair). Move messaging mutations out of `useEventMutations.js`.
- [ ] **C.2** Fix `messagingService.sendTestInvitation` (`services/messagingService.js:180`) to call `PATCH /events/:eventId/test-message` instead of `POST /messaging/test`. Update `ENDPOINTS.MESSAGING.SEND_TEST` constant in `config/api.js` (or remove it if no other consumer remains).
- [ ] ~~**C.3** Resolve the `submitTemplate` decision…~~ **LOCKED to delete-entirely** per §0.1 D1 — handled in 7.0.1 + 7.0.8.
- [ ] ~~**C.4** Wire `useApprovedTemplates`…~~ **SUPERSEDED by §0.1 D2** — handled in 7.0.2 + 7.0.8.
- [ ] ~~**C.5** Wire `useTemplateStatus`…~~ **SUPERSEDED by §0.1 D3** — handled in 7.0.3 + 7.0.8.
- [ ] **C.6** Migrate hardcoded Arabic in `components/createEvent/StepFive.js:25-29` to i18n keys. **Verify the translated default strings match what `messaging.service.handleButtonResponse` would auto-send when the host doesn't override** (per §4.4).
- [ ] **C.7** Migrate hardcoded Arabic in `components/home/PartialFailureBanner.js:32-34` to `t()`.
- [ ] **C.8** Split `ScheduleSendingModal.js` (361 → ≤350) per §4.2. **Preserve `StyleSheet.create` blocks verbatim.**
- [ ] **C.9** Split `useEventMutations.js` (415 → ≤350) by moving messaging cases out (covered by C.1) — should drop to roughly 280 lines.
- [ ] **C.10** Comment-hygiene pass — strip `Phase 4 W0-AUTH:` headers from `services/messagingService.js`, `useEventMutations.js`, etc.
- [ ] **C.11** Drop the `_legacyToken` parameter from messaging service signatures and call sites once C.1's new files land. (Sweep, not piecemeal.)

### 7.D Cross-platform alignment (do AFTER A/B/C)

- [ ] **D.1** Re-grep `/messaging/test` and `/messaging/template/submit` across both clients — must return **0 hits** (other than test fixtures).
- [ ] **D.2** Verify both clients' `useSendTestMessage` mutations target `PATCH /events/:id/test-message`.
- [ ] **D.3** Verify both clients' canonical hooks invalidate the same query keys (`['messaging', 'stats', eventId]`, `['events', eventId]`) so a mutation from either platform refreshes the other's data layer (relevant only if the user has both web and mobile open).
- [ ] **D.4** Run the type-check / lint / unit-test commands the project ships for each layer:
  - Backend: `npm run lint --prefix labbe-backend-`, plus the existing test suite (if any).
  - Web: `npm run lint --prefix labbe`.
  - Mobile: `npm run lint --prefix halla-mobile`.
- [ ] **D.5** Manual smoke check on staging: send test message (web + mobile), send bulk to a 3-guest event, retry one failure, schedule a send, view stats. Visual regression check on all touched pages.

---

## 8. Locale-key additions required

Phase 2 to enumerate exactly. Anticipated additions:

- `home-events.partialFailure.title` (en: "Partial invitation send", ar: "إرسال جزئي للدعوات")
- `home-events.partialFailure.body` (en: "{{failed}} of {{total}} invitations failed to send", ar: "لم يتم إرسال {{failed}} من أصل {{total}} دعوة")
- `createEvent.guestReplies.defaults.onAttend` (en: "Thank you for confirming!…", ar: existing default from `StepFive.js:25`)
- `createEvent.guestReplies.defaults.onExpected` (en: …, ar: existing default from `StepFive.js:26-27`)
- `createEvent.guestReplies.defaults.onAbsent` (en: …, ar: existing default from `StepFive.js:28-29`)
- Any keys missing in `TestMessagePopup.js` namespace `home-events` — Phase 2 grep `t("` in that file to enumerate.

Agent does NOT modify locale JSON without explicit approval.

---

## 9. Rollback plan

Each Phase-2 commit is small and reverts cleanly via `git revert`. Specifically:

- **A.1** (validation) — revert to remove the file + the route wiring; controller's inline checks remain intact (do not delete them in the same commit until A.1 is verified working in staging).
- **A.2/A.3** (typed errors / responseHelper) — revert reinstates the `{ success: false }` envelopes; clients keep working because they already handle both shapes during the transition.
- **A.13/A.14** (file splits) — keep the canonical façade file's exports unchanged, so consumers see no change. Revert restores the monoliths.
- **B.1-B.10** (web canonical hook + Zustand removal) — stage in two commits: one that adds `useMessaging.js` and migrates consumers, one that deletes the store/service. Revert order is reverse.
- **C.1-C.5** (mobile hook split + endpoint fixes) — same staging.

No DB migrations are introduced by this plan.

---

## 10. Acceptance checklist (run after Phase 2)

- [ ] No file in module exceeds the cap (backend 600/300/300; web 250/400; mobile 350/500).
- [ ] `messaging.validation.js` exists; every public POST has a Joi schema.
- [ ] No service method returns `{ success: false }` envelope.
- [ ] No controller calls `res.status().json()` directly (except the webhook 200 OK ack and the verify challenge response, which are protocol-defined).
- [ ] No `console.*` calls in `messaging.service.js` or `messaging.controller.js`.
- [ ] All endpoints have current Swagger; `SendMessageRequest` is defined in `config/swagger.js`.
- [ ] No `useMessagingStore` import remains in the web codebase.
- [ ] No `services/messaging.js` import remains in the web codebase.
- [ ] No `/messaging/test` literal anywhere in the codebase (except inside historical commit messages — not our problem).
- [ ] No `/messaging/template/submit` literal anywhere in the codebase, OR the backend has a working route + Joi schema + Swagger doc for it.
- [ ] Web + Mobile call the same paths with the same body shapes for every endpoint.
- [ ] No `// FLOW-…` / `// PHASE-…` / `// H-` / `// M-` / `// L-` / `// D-` markers in module surface area.
- [ ] `npm run lint` clean across all three packages.
- [ ] Visual smoke test: every page/screen looks identical before/after the refactor (Core Rule).
- [ ] Manual end-to-end: test message, single send, bulk send, retry, schedule, reminder all work on web + mobile staging.
- [ ] Audit-log entries appear in the audit collection for the 6 actions added in A.10.
