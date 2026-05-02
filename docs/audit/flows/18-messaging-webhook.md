# 18 — messaging-webhook

## One-paragraph description
Taqnyat (external SMS/WhatsApp provider) sends delivery status callbacks and guest button-click events to `POST /messaging/webhook`. The backend receives these webhooks, verifies them with HMAC-SHA256 (currently implemented at line 133-142 in messaging.controller.js), and updates guest invitation statuses (delivered, read, failed) or processes RSVP button responses (سأحضر/سأعتذر/ربما). Button clicks update the guest's RSVP status in the DB and trigger notifications to the host. Critical: same webhook may arrive twice, so DB updates must be idempotent.

## Scope tags
- RSVP response handling
- Delivery/read status updates
- Webhook signature verification (HMAC-SHA256)
- Idempotency requirement
- SMS fallback when no WhatsApp capability
- QR code auto-reply generation

## Roles involved
- Backend server (receives webhook)
- Taqnyat (sends webhook events)
- Guest (clicks RSVP button on WhatsApp)
- Host (receives notifications of guest responses)

## Entry points (cite file:line)
- `labbe-backend-/src/modules/messaging/messaging.routes.js:58` — `router.post('/webhook', messagingController.webhook)`
- `labbe-backend-/src/modules/messaging/messaging.controller.js:131-194` — `exports.webhook` handler
- `labbe-backend-/src/modules/messaging/messaging.service.js:625-721` — `handleButtonResponse()` method

## Exit / terminal states
- Guest RSVP status updated (confirmed/declined/maybe) → notification sent to host
- Delivery status updated (delivered/read/failed) → no further action
- SMS fallback recorded (smsFallback: true) on GuestModel
- QR code delivered to guest (WhatsApp image or SMS fallback)

## Touched modules (file paths by repo)
**labbe-backend-:**
- `src/modules/messaging/messaging.routes.js` — webhook route
- `src/modules/messaging/messaging.controller.js` — HMAC verification, webhook handler
- `src/modules/messaging/messaging.service.js` — updateDeliveryStatus(), handleButtonResponse()
- `src/infrastructure/taqnyat.js` — sendWhatsAppImage(), sendSMS()
- `models/GuestModel.js` — status, rsvp, invitation fields
- `src/shared/utils/phone.js` — normalizePhoneNumber()
- `src/shared/utils/notificationService.js` — sendToUser()

## Dependencies on other flows
- Flow 19 (guest-wa-interaction): RSVP button click is the triggering event
- Flow 22 (event-stats-visibility): confirmed/declined counts update

## Known divergences (web ↔ mobile, frontend ↔ backend)
- Backend: pure webhook handler (no UI)
- Mobile/web: guests click RSVP button in WhatsApp (UI on Taqnyat/Meta side, not ours)
- Auto-reply with QR code: uses WhatsApp image fallback to SMS if 24-hour window expired (line 708-718 in messaging.service.js)

## Open questions

**Q1: Webhook signature verification scope: does Taqnyat also send its own signature for non-WhatsApp callbacks?**

A:
**Current behavior:** HMAC-SHA256 verification runs only when `process.env.WHATSAPP_APP_SECRET` is set AND the `x-hub-signature-256` header is present (`labbe-backend-/src/modules/messaging/messaging.controller.js:133-142`). If the env var is unset, the condition short-circuits and the request is accepted without any signature check. Non-WhatsApp (SMS status) callbacks have no signature verification path at all.

**Assessment:** BUG

**Why:** The verification is conditional on the env var being configured. An attacker who sends any POST request to `/messaging/webhook` without the `x-hub-signature-256` header passes through when `WHATSAPP_APP_SECRET` is unset — the endpoint fails open. Gate 1 #7 requires HMAC verification; the current implementation is bypassable by environment misconfiguration.

**Recommended change:** Require `WHATSAPP_APP_SECRET` to be set at startup (fail fast if missing). Change the condition to always verify: if `signature` header is absent or does not match, return 403. This ensures the endpoint fails closed regardless of deployment configuration.

Source: `labbe-backend-/src/modules/messaging/messaging.controller.js:133-142`

**Q2: Idempotency mechanism: if webhook arrives twice, will both updates fire?**

A:
**Current behavior:** `updateDeliveryStatus()` does a `findOne` + update on the guest record with no deduplication guard (`labbe-backend-/src/modules/messaging/messaging.service.js:374-400`). If the same webhook arrives twice within milliseconds, both updates fire — status is overwritten with equal values but `deliveredAt` timestamp may differ by milliseconds. For `handleButtonResponse()`, a duplicate webhook fires the host notification twice. No bloom filter or messageId log exists.

**Assessment:** WEAK

**Why:** For status-only updates (delivered/read), functionally idempotent (status value is the same). For RSVP button responses, a duplicate webhook fires the host notification twice, which is a nuisance.

**Recommended change:** Before updating on `handleButtonResponse()`, check `guest.rsvp.respondedAt` — if already set to the same status within the last 5 seconds, skip the notification. For delivery status updates, no action needed (already functionally idempotent).

Source: `labbe-backend-/src/modules/messaging/messaging.service.js:374-400`

**Q3: Phone number matching: is it sufficient for all Saudi/regional formats?**

A: Five variants are tried: raw incoming phone, normalized form, digits-only, 9-digit local (strips '966' prefix), and 0-prefixed local. This covers the main Saudi mobile formats. Edge cases (landlines, international non-Saudi) may not match.

Source: `labbe-backend-/src/modules/messaging/messaging.service.js:630-637`

**Q4: QR code expiry: does RSVP button click regenerate or invalidate old QR?**

A: QR code URL is built dynamically per-response using `guest.qrcode || guest._id.toString()`. The `qrcode` field is set once at guest creation (pre-save hook) and never rotated. The URL uses a stable value, so clicking again generates an identical URL — old QR codes remain valid indefinitely.

Source: `labbe-backend-/src/modules/messaging/messaging.service.js:703`

**Q5: Notification service: where does sendToUser() send — in-app, email, SMS? Async?**

A: In-app push notification only (via `notificationService.sendToUser`). The call is fire-and-forget (`.catch(console.error)` pattern) — asynchronous and non-blocking. No email or SMS is sent for RSVP events.

Source: `labbe-backend-/src/modules/messaging/messaging.service.js:678-691`

---

## State machine

```
Webhook flow per event type:
  POST /messaging/webhook →
    [WHATSAPP_APP_SECRET unset] → PASSES (no signature check — SECURITY BUG)
    [WHATSAPP_APP_SECRET set AND x-hub-signature-256 absent] → PASSES (SECURITY BUG — should reject)
    [WHATSAPP_APP_SECRET set AND signature present] → HMAC verified → process

  Event type routing:
    statuses[].status == 'no_capability' OR 'failed' → updateDeliveryStatus() → guest.invitation.status updated
    messages[].type == 'button' → handleButtonResponse() → guest.rsvp updated + host notification
    delivery/read status updates → updateDeliveryStatus() → functionally idempotent (same value overwrite)
    duplicate button webhook → handleButtonResponse() fires twice → duplicate host notification (BUG)

  RSVP state transitions (in GuestModel):
    'invited' → button click ('سأحضر') → 'confirmed'
    'invited' → button click ('سأعتذر') → 'declined'
    'invited' → button click ('ربما') → 'maybe'
    'confirmed'/'declined'/'maybe' → can be overridden by another button click (no re-RSVP protection)
```

---

## Data handoffs

| Step | Producer | Consumer | Payload | Validation? |
|------|----------|----------|---------|-------------|
| Taqnyat → POST /messaging/webhook | Taqnyat | messaging.controller.js:131 | x-hub-signature-256 header + JSON body `{object, entry[]}` | No body schema validation — raw JSON parsed |
| webhook handler → updateDeliveryStatus | messaging.controller.js | messaging.service.js:374 | `(messageId, status, timestamp)` — looks up guest by messageId | No dedup check |
| webhook handler → handleButtonResponse | messaging.controller.js | messaging.service.js:625 | `{from, buttonId, buttonText, timestamp}` — routes by button text to RSVP status | Phone normalization (5 variants tried) |
| handleButtonResponse → notificationService.sendToUser | messaging.service.js:678 | notificationService.js | `(hostId, notification payload)` | Fire-and-forget; no dedup guard on duplicate webhook |

---

## Role variations

N/A — Backend only. Taqnyat calls the webhook; no user role applies. Staff and hosts are indirect beneficiaries (host notification, guest RSVP update).

---

## Web ↔ mobile parity

Backend-only webhook handler — no frontend code is involved in processing.

| Feature | Web | Mobile | Gap? |
|---------|-----|--------|------|
| Webhook URL configuration | Ops concern (Taqnyat dashboard) | Ops concern | No code gap |
| Guest RSVP result display | Web host event page shows RSVP status from GET /events/:id/stats | Mobile HomeScreen/StatsCards shows RSVP counts from same stats endpoint | No gap in webhook processing; see Flow 19 for stats polling parity |
| Host RSVP notification | Web in-app notification via notificationService | Mobile in-app notification via notificationService | No gap — both use same notification service |

---

## Edge cases & failure modes

1. **WHATSAPP_APP_SECRET missing from env:** All webhook calls pass HMAC check silently — endpoint fails open to any attacker with network access to the server (Critical security gap, see FLOW-18-F01).
2. **x-hub-signature-256 header absent from Taqnyat call:** Request passes when env var is also absent — both conditions compound the security gap.
3. **Duplicate delivery webhook within milliseconds:** Both updates fire; `deliveredAt` may differ by ms but final status is the same — functionally idempotent.
4. **Duplicate button webhook:** `handleButtonResponse()` fires twice — host notification fires twice (nuisance, not data corruption).
5. **Unknown button text:** `handleButtonResponse` routes by Arabic button text, not by buttonId. If Taqnyat changes Arabic button text in a template update, routing silently fails with no RSVP recorded.
6. **messageId not found in GuestModel:** `updateDeliveryStatus()` returns `{success: false, error: 'GUEST_NOT_FOUND'}` gracefully — no crash.
7. **Test message webhook delivery:** messageId is not in GuestModel (no real guest record); silently ignored — correct behavior.

---

## Findings

### FLOW-18-F01 — Webhook fails open when WHATSAPP_APP_SECRET unset
- **Severity**: Critical
- **Type**: CONFLICT
- **Location**: `labbe-backend-/src/modules/messaging/messaging.controller.js:133-134`
- **Description**: The HMAC signature check condition is `if (process.env.WHATSAPP_APP_SECRET && signature)`. When `WHATSAPP_APP_SECRET` is unset OR the `x-hub-signature-256` header is absent, the condition is false and the request is accepted without any verification.
- **Why it matters**: Gate-1 #7 requires HMAC verification to be mandatory. Any actor who can POST to `/messaging/webhook` can inject arbitrary RSVP responses, delivery statuses, or button clicks without authentication — confirming or declining RSVPs for all guests of any event, triggering host notifications, and manipulating event stats.
- **Recommended change**: Require `WHATSAPP_APP_SECRET` at startup (fail-fast if missing). Change the verification condition to always require the signature header and always verify it — reject with 403 if the header is absent or does not match.
- **Related**: FLOW-17-F02

### FLOW-18-F02 — Duplicate button webhook fires host notification twice
- **Severity**: Medium
- **Type**: BUG
- **Location**: `labbe-backend-/src/modules/messaging/messaging.service.js:678-691`
- **Description**: `handleButtonResponse()` calls `notificationService.sendToUser()` with no deduplication guard. If the same button-click webhook arrives twice (Taqnyat at-least-once delivery), the host receives two identical "guest X confirmed" notifications. No `respondedAt` check or messageId dedup exists.
- **Why it matters**: Duplicate in-app notifications for the same RSVP event pollute the host's notification center and degrade trust in the notification system.
- **Recommended change**: Before firing the host notification in `handleButtonResponse()`, check if `guest.rsvp.respondedAt` is already set to the same status within the last 5 seconds. If so, skip the notification to absorb Taqnyat at-least-once duplicates.
- **Related**: FLOW-27-F01

### FLOW-18-F03 — Guest QR code generated once at creation, never rotatable
- **Severity**: Medium
- **Type**: Missing
- **Location**: `labbe-backend-/models/GuestModel.js` (pre-save hook for qrcode field)
- **Description**: The guest QR code is generated once at creation via a Mongoose pre-save hook and never rotated. A guest who shares their QR code URL with a third party allows that party to check in at the event indefinitely. There is no mechanism for hosts to invalidate a QR code for a specific guest without deleting the guest entirely.
- **Why it matters**: For high-security or private events, a compromised QR code grants venue access to unauthorized parties. The risk grows for business or invitation-only events.
- **Recommended change**: Add a `POST /events/:id/guests/:guestId/regenerate-qr` endpoint that generates a new QR code for the guest, invalidating the old one. Restrict this to host and admin roles.
- **Related**: FLOW-20-F01

---

## Cross-flow notes

- **Flow 19**: RSVP state transitions recorded here (handleButtonResponse) are the primary input for the guest stats polling that Flow 19 describes. Any cache strategy on the stats endpoint must account for webhook-driven state changes.
- **Flow 22**: `getDetailedStats()` groups guest records by status after they are updated here. The absence of a server-side cache (FLOW-22-F01) means webhook-written status changes are immediately visible — no explicit invalidation is required unless a cache is added later.
- **Flow 20**: Guest QR codes used for check-in (Flow 20) are the same codes that handleButtonResponse auto-replies with. The QR non-rotation gap (FLOW-18-F03) and the missing host revocation endpoint (FLOW-20-F01) share the same root — guest credentials are immutable once issued.
