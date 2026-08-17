# 16 — test-message

## One-paragraph description
Host sends a test WhatsApp/SMS message before event launch to verify their invitation template looks correct and the messaging channel works. Available from event stats page and single event page. Host provides their own phone number, selects channel (SMS or WhatsApp), and receives a sample message populated with test data. Useful for catching template errors before sending to hundreds of guests.

## Scope tags
Messaging testing, template preview, channel validation, single test send, host-initiated.

## Roles involved
Host (initiates test), Backend (sends via Taqnyat), Taqnyat API (message delivery).

## Entry points

### Routes:
- `labbe-backend-/src/modules/events/events.routes.js:505-510` PATCH `/events/:id/test-message` (via events controller/service)
- `labbe-backend-/src/modules/messaging/messaging.routes.js:91` POST `/messaging/test` (alternative, direct messaging endpoint)

### Controller:
- `labbe-backend-/src/modules/events/events.controller.js:270-277` sendTestMessage() — routes to events.service
- `labbe-backend-/src/modules/messaging/messaging.controller.js` sendTestMessage() (if exists) — routes to messaging.service

### Service:
- `labbe-backend-/src/modules/events/events.service.js:1056-1066` sendTestMessage() delegates to messagingService
- `labbe-backend-/src/modules/messaging/messaging.service.js:85-123` sendTestMessage() — main logic

### Taqnyat:
- `labbe-backend-/src/infrastructure/taqnyat.js` sendSMS(), sendWhatsAppTemplate(), sendWhatsAppTemplateWithImage()

## Exit / terminal states

### Success outcomes:
- Test message sent to host's phone
- Event.testMessageSent = true (line 116-119 of messaging.service.js)
- messagingStatus.preferredChannel updated to 'sms' or 'whatsapp'
- Return { success: true, messageId, status }

### Failure outcomes:
- No template selected for WhatsApp: return { success: false, error: 'NO_TEMPLATE_SELECTED' }
- SMS/WhatsApp API error: return { success: false, error: taqnyat error, code }
- Event not found: return { success: false, error: 'EVENT_NOT_FOUND' }

### Side effects:
- Taqnyat API call made (real message sent, not simulated)
- Taqnyat webhook may fire for delivery/read status
- Host's phone charges against messaging quota if applicable

## Touched modules

### labbe-backend-
- `src/modules/events/events.routes.js:505-510` — PATCH endpoint
- `src/modules/events/events.controller.js:270-277` — HTTP handler
- `src/modules/events/events.service.js:1056-1066` — delegates to messaging service
- `src/modules/messaging/messaging.routes.js:91` — POST `/messaging/test` direct endpoint
- `src/modules/messaging/messaging.service.js:85-123` — core sendTestMessage() logic
  - Line 93-95: Fetch event and template name
  - Line 98-113: Determine channel (WhatsApp if template available, else SMS)
  - Line 106-110: Build WhatsApp params with test guest name 'ضيف تجريبي' (test guest in Arabic)
  - Line 112: Build SMS fallback
  - Line 116-119: Update event.testMessageSent flag and preferredChannel
- `src/infrastructure/taqnyat.js` — Taqnyat API transport
- `models/EventModel.js` — testMessageSent field, messagingStatus
- `src/shared/middleware/subscription.js` — requireSubscription middleware ensures host has active subscription

### halla-mobile
- Event detail screen: test message button/form (file TBD)
  - Input: phone number, channel selection
  - Send request to PATCH /events/{id}/test-message or POST /messaging/test
  - Display success/error toast

### labbe (web)
- Event stats page or single event detail page: test message form (file TBD)
  - Input: phone number, channel dropdown
  - Send PATCH request
  - Show result notification

## Dependencies

**Depends on:**
- Flow 10 (event-create) — event must exist
- Flow 13 (event-update) — invitation settings and template must be configured
- Subscription (host must have active subscription)

**Depended on by:**
- Flow 14 (event-launch-happy) — optional pre-launch validation step

## Known divergences

1. **Direct vs. event endpoint**: Two routes exist:
   - PATCH `/events/{id}/test-message` (events.routes.js line 505)
   - POST `/messaging/test` (messaging.routes.js line 91)
   - Which is canonical? Both callable?

2. **Request format differences**:
   - Events endpoint expects: { phoneNumber, channel }
   - Messaging endpoint expects: { phoneNumber, message, [channel] }
   - Web/mobile must know which to call
 peter note : see what exist in frontend web and mobile, i think they are both using the Events endpoint as for the test message their isn't a message  got from the user, if they are using  Messaging endpoint then we need to remove message i guess 
 either way check and fix and remove the one that isn't used
3. **Template parameter order**: Code builds bodyParams (line 104) with order: guest_name, event_name, event_date, event_time, event_location. Must match Taqnyat template's {{1}}, {{2}}, etc. No validation that template expects exactly 5 params.
peter note :we need to make this dynamic per template as we have many categories for event tempaltes each event template have some set of variables but later we will make everything for that ready just keep in mind that
4. **Test data**: Guest name hardcoded as 'ضيف تجريبي' (Arabic). What if user is English? Or wants different test data? english should be test guest

5. **Image header check**: Code checks hasImageHeader flag (line 66). If image not present but flag true, send fails. Web/mobile form must let host upload image before test, or test will fail.

6. **SMS fallback behavior**: For WhatsApp test, if WhatsApp send fails, no automatic SMS fallback in test context (unlike real sends). Test only tries WhatsApp.

7. **No message preview before send**: Code sends real message immediately. No "preview" mode. Host doesn't see the final rendered message before it's sent.

8. **Whitelabel context**: Does testMessageSent flag belong to whitelabel event? Not addressed in code.

## Open questions

**Q1: Canonical endpoint: should one route be removed? Which takes precedence?**

A:
**Current behavior:** Two routes exist — `PATCH /events/:id/test-message` at `labbe-backend-/src/modules/events/events.routes.js:505` routes through the events controller and delegates to the messaging service with `{ phoneNumber, channel }`. `POST /messaging/test` at `labbe-backend-/src/modules/messaging/messaging.routes.js:91` calls the messaging service directly with a different body shape `{ phoneNumber, message, channel }`.

**Assessment:** WEAK

**Why:** Two endpoints doing the same thing with different request shapes is confusing for frontend developers and creates two maintenance surfaces. The messaging endpoint accepts a raw `message` body which may bypass the template system entirely.

**Recommended change:** Designate `PATCH /events/:id/test-message` as canonical. Deprecate `POST /messaging/test` by returning a `410 Gone` response that points to the canonical endpoint. Frontend and mobile must use only the event-scoped endpoint.

Source: `labbe-backend-/src/modules/events/events.routes.js:505` and `labbe-backend-/src/modules/messaging/messaging.routes.js:91`

**Q2: Phone number validation: does sendTestMessage validate format before calling Taqnyat?**

A:
**Current behavior:** `sendTestMessage()` at `labbe-backend-/src/modules/messaging/messaging.service.js:85-123` passes the `phoneNumber` parameter directly to the Taqnyat send functions without normalization or format validation.

**Assessment:** WEAK

**Why:** An invalid phone number format fails at the Taqnyat API level, returning a cryptic provider error rather than a user-friendly message. The host cannot distinguish "wrong number format" from "number unreachable."

**Recommended change:** Normalize the phone number in `sendTestMessage()` using the existing `normalizePhoneNumber()` utility before passing it to Taqnyat. Return a validation error if the normalized result is empty.

Source: `labbe-backend-/src/modules/messaging/messaging.service.js:85-123`

**Q3: Rate limiting on test: any throttle?**

A:
**Current behavior:** No per-event test throttle exists. Only the general `apiLimiter` (100 req/15 min per IP) may apply at the route level. There is no per-event or per-host check on test message frequency in `sendTestMessage()` at `labbe-backend-/src/modules/messaging/messaging.service.js:85-123`.

**Assessment:** WEAK

**Why:** Without throttling, a frontend bug could fire hundreds of test messages in rapid succession, draining the Taqnyat account balance without any safeguard.

**Recommended change:** Add a per-event throttle: max 1 test message per 30 seconds per event. Store `lastTestAt` on the event document and reject with a 429 response if `now - lastTestAt < 30s`.

Source: `labbe-backend-/src/modules/messaging/messaging.service.js:85-123`

**Q4: Test SMS content: what RSVP link is used? Does it work or 404?**

A:
**Current behavior:** The RSVP link in test SMS is hardcoded as `${config.frontend?.url || 'https://halaa.sa'}/rsvp/test` at `labbe-backend-/src/modules/messaging/messaging.service.js:92`. This path does not correspond to any real RSVP page and will 404.

**Assessment:** BUG

**Why:** The test message is intended to show the host exactly what guests will see. A 404 RSVP link misleads the host into thinking their invitation is broken when it is not — the real invitation uses the guest's `_id` in the URL. Alternatively, a host may dismiss the broken link as expected test behavior and fail to notice a genuine template issue.

**Recommended change:** Use a clearly labeled placeholder link: `/rsvp/preview?event={eventId}` (if a preview page exists) or omit the RSVP button from test messages entirely and include a note in the test response: "RSVP button is hidden in test messages."

Source: `labbe-backend-/src/modules/messaging/messaging.service.js:92`

**Q5: Webhook handling: when test message delivery webhook fires, how is it handled?**

A: Gracefully ignored. `updateDeliveryStatus()` at `labbe-backend-/src/modules/messaging/messaging.service.js:374-378` looks up a `GuestModel` record by `messageId`. Test messages have no corresponding guest record, so the lookup returns nothing and the method returns `{ success: false, error: 'GUEST_NOT_FOUND' }` without modifying any document.

Source: `labbe-backend-/src/modules/messaging/messaging.service.js:374-378`

**Q6: Template validation before test: should web/mobile validate that all variables are filled?**

A: No pre-validation is performed on the client. The server returns `{ success: false, error: 'NO_TEMPLATE_SELECTED' }` at `labbe-backend-/src/modules/messaging/messaging.service.js:99-101` if no template is configured. Frontend should surface this error and prompt the host to select a template before retrying.

Source: `labbe-backend-/src/modules/messaging/messaging.service.js:99-101`

**Q7: Cost accounting: does test message count against messaging quota or billing?**

A: [PETER DECISION]

**The choice:** Count test messages against a host-level messaging quota (limited tests per billing period) vs. charge the Taqnyat account only with no internal quota tracking.

**Recommendation:** No internal quota for test messages. Instead, rely on the per-event throttle from Q3 to prevent abuse. Test messages are low in volume (1–2 per event setup session); quota tracking adds friction with minimal financial protection.

**Why:** The per-message Taqnyat cost is small. The throttle from Q3 prevents accidental or malicious flooding. A quota counter would require a new billing field and associated logic for an edge case that rarely materializes.

**Trade-offs:** A customer testing hundreds of events daily could accumulate meaningful Taqnyat costs without an internal quota cap.

**Q8: Multi-channel test: can host test both SMS and WhatsApp sequentially?**

A: Yes. The endpoint can be called multiple times with different `channel` values. Each call updates `event.messagingStatus.preferredChannel` to the last-tested channel. There is no conflict between successive calls.

Source: `labbe-backend-/src/modules/messaging/messaging.service.js:115-119`

**Q9: Error recovery: if WhatsApp test fails, does host see suggestion to try SMS?**

A:
**Current behavior:** A WhatsApp test failure at `labbe-backend-/src/modules/messaging/messaging.service.js:98-113` returns `{ success: false, error: ... }`. There is no auto-fallback to SMS and no suggestion in the response to retry via SMS.

**Assessment:** WEAK

**Why:** Many Saudi numbers may not have WhatsApp. A host testing on a non-WhatsApp number receives a generic failure with no guidance. The response should explain why it failed so the host can take the correct next step.

**Recommended change:** Include a `suggestSMS: true` flag in the WhatsApp failure response when the error indicates a capability issue (e.g., `no_capability` from the Taqnyat webhook or a relevant Taqnyat error code). Frontend can render: "WhatsApp not available for this number. Try sending via SMS."

Source: `labbe-backend-/src/modules/messaging/messaging.service.js:98-113`

**Q10: Admin test sends: can admin send test to arbitrary phone on behalf of host?**

A:
**Current behavior:** `sendToGuest()` at `labbe-backend-/src/modules/messaging/messaging.service.js:148-150` enforces `event.host === userId`. An admin user calling the test endpoint for an event they do not own receives a `FORBIDDEN` error; there is no bypass path.

**Assessment:** WEAK

**Why:** Admins assisting a host with event setup cannot verify the invitation template without owning the event. This creates a support workflow gap where admin intervention is blocked by the ownership check.

**Recommended change:** Add `PATCH /events/:id/admin/test-message` that bypasses the host ownership check. Accept `{ phoneNumber, channel }`. Log the admin action in the audit log (Gate 1 #10).

Source: `labbe-backend-/src/modules/messaging/messaging.service.js:148-150`

---

## State machine

```
HOST_INITIATES_TEST → validate_subscription → [no subscription] → REJECTED (403)
HOST_INITIATES_TEST → validate_subscription → [valid] → LOOKUP_EVENT
LOOKUP_EVENT → [not found] → TERMINAL: { success:false, error:'EVENT_NOT_FOUND' }
LOOKUP_EVENT → [found] → DETERMINE_CHANNEL
DETERMINE_CHANNEL → channel=whatsapp → CHECK_TEMPLATE
CHECK_TEMPLATE → [no template] → TERMINAL: { success:false, error:'NO_TEMPLATE_SELECTED' }
CHECK_TEMPLATE → [template present] → BUILD_WA_PARAMS → CALL_TAQNYAT_WA
DETERMINE_CHANNEL → channel=sms → BUILD_SMS_BODY → CALL_TAQNYAT_SMS
CALL_TAQNYAT_WA → [success] → UPDATE_EVENT_FLAGS → TERMINAL: { success:true, messageId }
CALL_TAQNYAT_WA → [failure] → TERMINAL: { success:false, error:<taqnyat_error> }
CALL_TAQNYAT_SMS → [success] → UPDATE_EVENT_FLAGS → TERMINAL: { success:true, messageId }
CALL_TAQNYAT_SMS → [failure] → TERMINAL: { success:false, error:<taqnyat_error> }
UPDATE_EVENT_FLAGS → sets testMessageSent=true, preferredChannel=<channel>
```

Terminal states: `REJECTED`, `EVENT_NOT_FOUND`, `NO_TEMPLATE_SELECTED`, success with messageId, failure with taqnyat error.

---

## Data handoffs

| Step | Producer | Consumer | Payload | Validation? |
|------|----------|----------|---------|-------------|
| 1 | Web/Mobile UI | `PATCH /events/:id/test-message` | `{ phoneNumber, channel }` | Zod on frontend (9-digit Saudi regex); no server-side phone format check |
| 2 | `events.controller.js:270` | `events.service.js:1056` | `(eventId, messageData, userId)` | Ownership check: `Event.findOne({ _id, host: userId })` |
| 3 | `events.service.js:1061` | `messaging.service.js:85` | `{ eventId, phoneNumber, channel }` | None additional |
| 4 | `messaging.service.js:86` | MongoDB `Event` | `Event.findById(eventId)` | None |
| 5 | `messaging.service.js:95` | Taqnyat API | `phoneNumber`, `templateName`, `bodyParams`, `imageUrl` | No server-side phone normalization |
| 6 | Taqnyat API | `messaging.service.js:115` | `{ success, messageId }` | None |
| 7 | `messaging.service.js:116` | MongoDB `Event` | `{ testMessageSent: true, preferredChannel }` | Atomic `findByIdAndUpdate` |

---

## Role variations

| ROLE | CAN | CANNOT | NOTES |
|------|-----|--------|-------|
| Host (event owner) | Send test to any phone number; select channel | Send test for events they don't own | Ownership enforced in `events.service.js:1057` |
| Admin / Super_admin | No bypass path exists | Send test for any event without owning it | `FORBIDDEN` returned; no admin test endpoint |
| Whitelabel admin | Same as host for their own events | Test events outside their tenant | Tenant boundary enforced upstream |
| Staff | No access | Cannot call this endpoint | Staff token not accepted by `requireSubscription` middleware |

---

## Web ↔ mobile parity

| Feature | Web | Mobile | Gap? |
|---------|-----|--------|------|
| Test message button | Yes — `TestMessagePopup.js` on host dashboard and event stats | Yes — `TestMessageModal.js` on home screen and event detail | No gap |
| Phone number input | 9-digit Saudi regex validation (Zod schema, `TestMessagePopup.js:18`) | Same 9-digit regex (`TestMessageModal.js:26`) | No gap |
| Channel selector (WA / SMS) | Yes — two toggle buttons | Yes — two toggle buttons | No gap |
| Prefilled phone from profile | No — empty input | No — empty input | No gap (minor UX, not a parity issue) |
| Error surface on WA fail | Generic toast only | Generic toast only | Neither surfaces `suggestSMS` hint (see F02) |

---

## Edge cases & failure modes

- **Hardcoded test RSVP link** (`messaging.service.js:92`): RSVP link in test SMS is `/rsvp/test` which 404s. Host sees a broken link that may be mistaken for a real invitation bug.
- **No server-side phone validation**: phone number is passed directly to Taqnyat without normalization. Cryptic provider error returned to frontend.
- **No per-event throttle**: endpoint can be called in rapid succession, draining Taqnyat credits. Only general IP rate limiter (100 req/15 min) applies.
- **Dual routes**: `PATCH /events/:id/test-message` and `POST /messaging/test` both exist with different body shapes. The direct messaging endpoint accepts a raw `message` field that bypasses the template system.
- **Test data language**: guest name is hardcoded as `'ضيف تجريبي'` (Arabic). English-language hosts will see Arabic test data.
- **WhatsApp test, no SMS fallback**: if WhatsApp send fails, no fallback or guidance is returned (unlike the bulk-send path which uses Taqnyat native SMS fallback).
- **testMessageSent flag only set on success**: if send fails, flag stays false, which is correct. But a subsequent successful call always overwrites `preferredChannel`, which could confuse the UI state.
- **Admin cannot test on behalf of host**: ownership check (`events.service.js:1057`) blocks admin intervention with no bypass.

---

## Findings

<!-- updated per peter note -->
### FLOW-16-F01 — Dual test-message routes with different request shapes
- **Severity**: Medium
- **Type**: DESIGN
- **Location**: `labbe-backend-/src/modules/messaging/messaging.routes.js:91`
- **Description**: Two endpoints accept test-message requests: `PATCH /events/:id/test-message` (takes `{ phoneNumber, channel }`) and `POST /messaging/test` (takes `{ phoneNumber, message, channel }`). The second bypasses the template system and accepts arbitrary message text.
- **Why it matters**: The raw-message path allows sending content that never passed template approval. Frontend teams have two surfaces to maintain. Inconsistent behavior confuses API consumers.
- **Recommended change**: Designate `PATCH /events/:id/test-message` as the sole canonical endpoint. **Before removing `POST /messaging/test`**, first migrate mobile: `halla-mobile/services/messagingService.js:183` currently calls `authenticatedFetch("/test", ...)` (the messaging endpoint). Update `sendTestInvitation()` in `messagingService.js` to call the events endpoint: `POST /events/${eventId}/test-message` with body `{ phoneNumber, channel }`. After mobile is migrated, remove `POST /messaging/test` from `messaging.routes.js` entirely (do not leave a `410 Gone` stub — delete the route).
- **Related**: none

### FLOW-16-F02 — Test SMS RSVP link is a dead `/rsvp/test` path
- **Severity**: Medium
- **Type**: BUG
- **Location**: `labbe-backend-/src/modules/messaging/messaging.service.js:92`
- **Description**: The RSVP link embedded in the test SMS is hardcoded as `${config.frontend?.url}/rsvp/test`. This path does not correspond to any real route and will return a 404 when clicked.
- **Why it matters**: The test message is the host's only opportunity to verify the invitation before launch. A 404 RSVP link misleads the host into believing their invitation is broken, potentially causing them to re-configure a working setup or to dismiss the broken link and miss a genuine template problem.
- **Recommended change**: Replace the link with a clearly labeled placeholder (e.g., `/rsvp/preview?event={eventId}`) if a preview page exists, or omit the RSVP button from test messages entirely and include a note in the API response explaining that the RSVP button is suppressed in test mode.

### FLOW-16-F03 — No per-event throttle on test-message endpoint
- **Severity**: Low
- **Type**: MISSING
- **Location**: `labbe-backend-/src/modules/messaging/messaging.service.js:85`
- **Description**: No per-event or per-host rate limit exists on `sendTestMessage()`. Only the global IP-based limiter (100 req/15 min) applies. A frontend bug or malicious actor can drain Taqnyat credits.
- **Why it matters**: Each test message incurs a Taqnyat API cost. Without a per-event throttle a frontend loop or retry storm could consume significant SMS budget before being stopped.
- **Recommended change**: Store `lastTestAt` on the event document and reject requests where `now − lastTestAt < 30 seconds` with a 429 response. Exempt admin-initiated test sends from this check.

<!-- updated per peter note -->
### FLOW-16-F04 — Mobile test message uses messaging endpoint; web uses events endpoint
- **Severity**: Medium
- **Type**: Bucket-3, Parity-gap
- **Location**: `halla-mobile/services/messagingService.js:183`
- **Description**: Peter stated: "i think they are both using the Events endpoint". Verified: web `TestMessagePopup.js` calls `useEventMutation("sendTestMessage")` → `labbe/services/events.js:160` → `PATCH /events/:id/test-message` (events endpoint, correct). Mobile `TestMessageModal.js` calls `useSendTestMessage()` → `sendTestInvitation` at `halla-mobile/services/messagingService.js:183` → `POST /messaging/test` (messaging endpoint, wrong). Mobile sends `{ phoneNumber, eventId, channel }` in the request body to the messaging endpoint, which also accepts a raw `message` field that can bypass the template system.
- **Why it matters**: Two platforms call different endpoints with different request shapes. If `POST /messaging/test` is removed without migrating mobile first, the mobile test message feature breaks silently with no error surfaced to the developer. The messaging endpoint's free-form `message` acceptance also bypasses template enforcement for mobile test sends.
- **Recommended change**: Update `sendTestInvitation()` in `halla-mobile/services/messagingService.js` to call the events endpoint: change `authenticatedFetch("/test", ...)` to the events base URL `PATCH /events/${eventId}/test-message` with body `{ phoneNumber, channel }`. After mobile is migrated, remove `POST /messaging/test` route.
- **Related findings**: FLOW-16-F01

---

## Cross-flow notes

- The test-message webhook delivery callback (flow 18) is silently discarded when no guest record matches the `messageId` — correct behavior, no action needed.
- If WhatsApp test fails and the host falls back to SMS test, `preferredChannel` is updated to `'sms'` on the second call, which will propagate to the bulk-send default in flow 17.
- The `testMessageSent` flag gates the "Schedule Send" button in both web (`EventActionsHeader.jsx:30`) and mobile. If the flag is incorrectly false (due to a send failure), the host cannot reach the scheduling UI — a dependency on flow 14 (event-launch-happy).

---

## Post-Phase-3 surgical updates

- **Updated FLOW-16-F01 recommendation** based on peter note in divergence #2: verified that web uses `PATCH /events/:id/test-message` (events endpoint) and mobile uses `POST /messaging/test` (messaging endpoint). Updated recommendation to specify migrate mobile first, then delete the messaging route. Source: `labbe/services/events.js:160` (web), `halla-mobile/services/messagingService.js:183` (mobile). State machine: not affected. Data handoffs: not affected.
- **Added FLOW-16-F04** (Bucket-3, Medium) based on peter note in divergence #2: Peter assumed both platforms use the events endpoint; mobile actually uses the messaging endpoint. New finding documents the discrepancy with file:line citations and migration path.
- **Peter note in divergence #3 acknowledged but no change.** Note adds future product context that template variables will be made dynamic per event category template. Phase 3 already documents hardcoded parameter order as a divergence. No downstream section changes needed until dynamic template work begins.
- **Cross-flow:** No propagation to other flows needed.
