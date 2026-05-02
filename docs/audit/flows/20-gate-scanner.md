# 20 — gate-scanner

## One-paragraph description
Host generates a scanner link (with StaffAccessToken) and sends it to a staff member via WhatsApp or other channel. Staff opens the link on a mobile device, authenticates using a StaffAccessToken (not user JWT), and sees the guest list for the event with guest details and QR codes. Staff scans a guest QR code (or manually enters guest phone/ID), and the backend records a check-in. Check-in updates guest.status to "checked_in" and guest.checkIn.checkedInAt timestamp. The staff role is separate from user roles, authenticated via StaffAccessTokenModel (not UserModel). Error cases: already scanned, invalid QR code, wrong event, expired access, offline mode (TBD).

## Scope tags
- Staff authentication via access token (not user JWT)
- QR code scanning and validation
- Guest check-in recording
- Real-time check-in stats
- Offline/retry capability (TBD)
- Token expiration and revocation
- Event-scoped staff permissions

## Roles involved
- Host (generates scanner link and staff tokens)
- Staff member (scans QR codes and checks in guests)
- Backend (validates token, records check-in, updates guest status)
- Mobile app (staff portal with scanner UI)

## Entry points (cite file:line)
- `labbe-backend-/src/modules/staff/staff.routes.js:61` — GET /verify (token verification)
- `labbe-backend-/src/modules/staff/staff.routes.js:101-105` — GET /events/:eventId/guests (guest list for staff)
- `labbe-backend-/src/modules/staff/staff.routes.js:143-147` — POST /events/:eventId/check-in (QR scan check-in)
- `labbe-backend-/src/modules/staff/staff.routes.js:187-191` — POST /events/:eventId/manual-check-in (manual check-in fallback)
- `labbe-backend-/src/modules/staff/staff.routes.js:214-218` — GET /events/:eventId/stats (real-time stats)
- `labbe-backend-/src/modules/staff/staff.service.js` — StaffService methods (verifyStaffAccess, checkInGuest, etc.)
- `labbe-backend-/models/StaffAccessTokenModel.js` — token model and validation

## Exit / terminal states
- Guest checked in: guest.status = "checked_in", guest.checkIn.checkedInAt recorded
- Host notified: notification sent (see guests.service._notifyHostStatusChange line 363-379)
- Stats updated: event check-in count incremented
- On already-scanned: 409 Conflict or warning returned (TBD)
- On invalid QR: 404 Guest not found

## Touched modules (file paths by repo)
**labbe-backend-:**
- `src/modules/staff/staff.routes.js` — staff portal routes
- `src/modules/staff/staff.controller.js` — HTTP handlers for staff endpoints
- `src/modules/staff/staff.service.js` — business logic (verifyStaffAccess, checkInGuest, getEventStats)
- `src/shared/middleware/staffAuth.js` — staff token validation middleware
- `models/StaffAccessTokenModel.js` — token schema, validateToken(), createForStaff(), revoke()
- `models/GuestModel.js` — checkIn sub-object, status field
- `src/modules/guests/guests.service.js:363-379` — _notifyHostStatusChange()
- `src/modules/events/events.service.js` — event stats/guest list queries
- `src/shared/utils/qrcode.js` (TBD) — QR code parsing/validation

**halla-mobile/:**
- `screens/StaffPortalScreen.js` — confirmed present; staff portal with guest list, QR text-entry modal, manual check-in by tap, name/phone search, real-time stats
- `navigation/AppNavigator.js` — confirmed: StaffPortalScreen is registered in the navigator

**labbe/:**
- `app/[lang]/staff/page.js` — confirmed present; web staff portal page
- `app/[lang]/staff/_components/cards/Cards.js` — confirmed present; stats cards for web staff portal

## Dependencies on other flows
- Flow 22 (event-stats-visibility): check-in count aggregation

## Known divergences (web ↔ mobile, frontend ↔ backend)
- Backend: API-only, no UI
- Mobile: primary interface (scanner, guest list, stats) — confirmed at StaffPortalScreen.js
- Web: secondary interface confirmed at labbe/app/[lang]/staff/page.js
- Token generation: host initiates via API, then link is sent to staff manually (not automated SMS/WhatsApp send from backend)

## Open questions

**Q1: Token generation: where does the host generate StaffAccessTokens?**

A: `POST /events/:eventId/notify-staff` generates a `StaffAccessToken` for each staff member in `event.staffList` via `StaffAccessToken.createForStaff()` and sends them an SMS with the portal URL (`/ar/staff?token=...`). Token generation and distribution happen in one step — there is no separate "generate token" endpoint.

Source: `labbe-backend-/src/modules/events/events.routes.js:518-538`, `labbe-backend-/src/modules/events/events.service.js:1290`

**Q2: Already-scanned scenario: error, ignored, or check-in time updated?**

A: Graceful handling — not an error. `checkInByQR()` returns `{ alreadyCheckedIn: true, message: 'Guest was already checked in' }` with HTTP 200. The original `checkedInAt` timestamp is preserved and is not updated on re-scan.

Source: `labbe-backend-/src/modules/staff/staff.service.js:165-169`

**Q3: Offline capability: can staff scan and sync later?**

A: **Decided.** Offline mode is **not in scope** for the initial launch. All check-in operations require an active network connection. If connectivity fails at the venue, staff should use the manual check-in fallback (Q5 — name/phone lookup) on a guest list that was loaded before entering the venue.

**Q4: QR code format: what is the guest QR code?**

A: A string stored in `guest.qrcode`, generated once at guest creation via a Mongoose pre-save hook. The staff service queries `Guest.findOne({ event: eventId, qrcode: qrCode })` to resolve the scan. The exact format (UUID, hash, etc.) is determined by the GuestModel pre-save hook.

Source: `labbe-backend-/src/modules/staff/staff.service.js:159`

**Q5: Manual check-in fallback: how does staff enter guest ID or phone?**

A: `checkInByIdentifier()` accepts `{ guestId, phone }`. If `guestId` is provided it looks up the guest directly; if `phone` is provided it queries with phone normalization. `manualCheckIn()` accepts `guestId` directly. A search UI (by name or phone) is required in the frontend but the backend endpoints are already in place.

Source: `labbe-backend-/src/modules/staff/staff.service.js:233-271`

**Q6: Token revocation: can host revoke before expiry?**

A:
**Current behavior:** `StaffAccessToken.revokeAllForEvent(eventId)` and `tokenDoc.revoke()` methods are implemented. `createForStaff()` auto-revokes previous tokens for the same staff+event combination. However, no host-facing HTTP endpoint exposes revocation to a host.

**Assessment:** WEAK

**Why:** A host who suspects a staff member no longer needs access has no way to revoke the token without a direct database operation. This is a security gap in the staff access model — the model layer is complete but the API surface is missing.

**Recommended change:** Add `DELETE /events/:eventId/notify-staff/:staffUserId` (or `POST /events/:eventId/revoke-staff/:staffUserId`) that calls `StaffAccessToken.revokeAllForEvent()` for that staff member. Log the revocation per gate 1 #10 (audit log).

Source: `labbe-backend-/models/StaffAccessTokenModel.js:97-110,136-157`

**Q7: Real-time stats: computed fresh or cached?**

A: Computed fresh per request. `getEventStats()` queries all guests for the event and counts by status in-memory. No caching layer exists.

Source: `labbe-backend-/src/modules/staff/staff.service.js:278-296`

**Q8: Device info tracking: security checks or audit only?**

A: Audit only. `lastDeviceInfo` (userAgent, ip) is updated on each token validation in `validateToken()`. The data is stored but is not used for any security enforcement such as IP allowlisting or device fingerprinting.

Source: `labbe-backend-/models/StaffAccessTokenModel.js:66-71`

---

## State machine

```
Staff access token lifecycle:
  (none) → POST /events/:id/notify-staff → StaffAccessToken created, SMS sent to each staff member
  token.valid → GET /staff/verify?token=X → staff authenticated, req.staffAccess populated
  token.valid → POST /staff/events/:id/check-in → guest checked in
  token.valid → time passes → token expires (expiresAt TTL)
  token.valid → createForStaff() for same staff+event → previous token revoked, new token created
  token.valid → revokeAllForEvent() (admin/programmatic only) → token revoked
  MISSING: no host-facing HTTP endpoint to trigger revocation

Guest check-in state:
  guest.status != 'checked_in' → checkInByQR() → guest.status = 'checked_in', checkIn.checkedInAt = now
  guest.status == 'checked_in' → checkInByQR() → { alreadyCheckedIn: true, HTTP 200 } (graceful, original timestamp preserved)
  any guest → manualCheckIn(guestId) OR checkInByIdentifier(phone) → same result as QR check-in
```

---

## Data handoffs

| Step | Producer | Consumer | Payload | Validation? |
|------|----------|----------|---------|-------------|
| POST /events/:id/notify-staff | events.service.js:1290 | StaffAccessToken.createForStaff() | `(eventId, staffId)` → token document + SMS with portal URL | Auth required (event host); auto-revokes prior token for same staff+event |
| GET /staff/verify?token=X | staffAuth middleware | req.staffAccess | Token string → resolved StaffAccessToken doc | Checks isRevoked, expiresAt |
| POST /staff/events/:id/check-in `{ qrCode }` | Mobile StaffPortalScreen / Web staff page | staff.service.checkInByQR() | qrCode string → Guest matched by `guest.qrcode` field | Token validation + event scope check |
| POST /staff/events/:id/manual-check-in `{ guestId }` | Staff UI | staff.service.manualCheckIn() | guestId → Guest looked up directly | Token validation |
| GET /staff/events/:id/stats | Staff UI | staff.service.getEventStats():278 | Returns `{confirmed, checkedIn, declined, total}` | Fresh DB query every call; no cache |

---

## Role variations

| Role | Can | Cannot | Notes |
|------|-----|--------|-------|
| Staff (StaffAccessToken) | Scan QR, manual check-in, view guest list, view real-time check-in stats | Modify event details, access other events, generate tokens | Token is event-scoped |
| Host | Generate staff tokens via notify-staff, view check-in stats | Revoke tokens (no HTTP endpoint) | SMS send is fire-and-forget; no delivery confirmation returned |
| Admin / SUPER_ADMIN | View events at platform level | No dedicated staff management endpoint | Can use event-level admin routes |
| Guest | Subject of check-in | No API access in this flow | Guest QR code matches by guest.qrcode field |

---

## Web ↔ mobile parity

| Feature | Web | Mobile | Gap? |
|---------|-----|--------|------|
| Staff portal UI | Confirmed at `labbe/app/[lang]/staff/page.js` | Confirmed at `halla-mobile/screens/StaffPortalScreen.js` | No gap — both have a staff portal |
| QR scanner input | Web: manual text entry field (browser camera API not confirmed in code) | Mobile: text-entry QR modal (TextInput, no barcode scanner library confirmed — staffService.checkInByQR sends QR string) | Mobile uses text-entry QR field matching web; no native camera scan confirmed |
| Guest list display for staff | Web: `labbe/app/[lang]/staff/_components/cards/Cards.js` (stats cards confirmed) | Mobile: guest list in StaffPortalScreen.js with name/phone search | No functional gap |
| Real-time check-in stats | Web: stats cards confirmed at `labbe/app/[lang]/staff/_components/cards/Cards.js` | Mobile: confirmed at StaffPortalScreen.js — displays `{confirmed, checkedIn, declined, pending}` | No gap |
| Manual check-in by name/phone | Web: Confirmed missing — no staff manual-search component found in `labbe/app/[lang]/staff/` | Mobile: Confirmed at StaffPortalScreen.js — search by name/phone with 400ms debounce | Gap: web staff portal lacks the name/phone guest search for manual check-in |
| Token revocation by host | Web: no revocation UI found | Mobile: no revocation UI found | Both platforms missing — no HTTP endpoint exists (FLOW-20-F01) |

---

## Edge cases & failure modes

1. **Token reuse after revocation:** `validateToken()` checks `isRevoked` flag — correctly rejected with 401.
2. **Concurrent scans of same QR by two staff members:** First scan sets status to `checked_in`; second scan returns `{ alreadyCheckedIn: true, HTTP 200 }` (handled gracefully — no double check-in).
3. **Guest QR lost or shared:** No host-facing QR regeneration endpoint exists — security gap (see FLOW-18-F03).
4. **Token expiry during active scanning session:** Next API call after `expiresAt` returns 401; staff loses access mid-event with no warning before expiry.
5. **SMS delivery failure for staff notification:** Host receives no confirmation that the portal URL was delivered. Staff who do not receive the SMS cannot check in guests, and the host has no way to detect this before the event.
6. **Rapid double-scan (faulty scanner):** Second `checkInByQR()` call returns `alreadyCheckedIn: true` — no data corruption. However both calls hit the DB (see FLOW-20-F03).

---

## Findings

### FLOW-20-F01 — No HTTP endpoint for host to revoke staff access token
- **Severity**: Medium
- **Type**: Missing
- **Location**: `labbe-backend-/models/StaffAccessTokenModel.js:97-110` (revoke methods exist, no HTTP endpoint)
- **Description**: `StaffAccessToken` implements `revokeAllForEvent()` and `tokenDoc.revoke()` methods. No HTTP endpoint allows a host to revoke a staff token before it expires. A host who needs to remove a staff member's access mid-event has no API path to do so.
- **Why it matters**: A removed or unauthorized staff member retains valid scanner access until the token's natural expiry. For events with strict access control this is a security gap — the model layer is complete but the API surface is missing.
- **Recommended change**: Add `DELETE /events/:eventId/staff/:staffUserId/access` that calls `StaffAccessToken.revokeAllForEvent()` filtered to that staff member. Require event ownership. Log the revocation per Gate-1 #10.
- **Related**: FLOW-18-F03

### FLOW-20-F02 — Staff SMS delivery failure is invisible to host
- **Severity**: Medium
- **Type**: Missing
- **Location**: `labbe-backend-/src/modules/events/events.service.js:1290` (notify-staff SMS send)
- **Description**: When `notify-staff` sends the portal URL to a staff member via SMS, the host receives no confirmation of delivery success or failure. The SMS send is fire-and-forget. If the staff member's phone number is invalid or the SMS is undeliverable, the host is unaware until the staff member fails to appear at the venue.
- **Why it matters**: For events with paid or contracted staff, failed delivery of the access link means staff cannot perform their duties. The host has no way to detect this failure before the event begins.
- **Recommended change**: After the `notify-staff` endpoint fires SMS sends, return the per-staff delivery status in the response: `{ staffId, phone, smsSent: boolean, error? }`. Surface this in the host's event setup UI as a delivery confirmation list.
- **Related**: none

### FLOW-20-F03 — Check-in endpoint has no idempotency key
- **Severity**: Low
- **Type**: Missing
- **Location**: `labbe-backend-/src/modules/staff/staff.service.js:159` (checkInByQR)
- **Description**: The check-in endpoint accepts no client-generated idempotency key. A faulty barcode scanner (or rapid double-submit) makes two API calls for the same scan. While the second call returns `alreadyCheckedIn: true` gracefully, both calls write to the database and could fire host notifications if notification is added for check-ins. Gate-1 #6 requires idempotency on external side effects.
- **Why it matters**: In practice the status check prevents data corruption. The concern is that any notification added in the future for check-in events will fire twice on rapid duplicate scans.
- **Recommended change**: Accept a client-generated `X-Idempotency-Key` per scan. Server returns the cached result for duplicate keys within a 30-second window.
- **Related**: FLOW-15-F03

---

## Cross-flow notes

- **Flow 22**: `getEventStats()` at `staff.service.js:278` is the same query used for the host's dashboard stats. Any cache invalidation strategy (FLOW-19-F03) must cover check-in write events too — a check-in must bust the per-event stats cache entry.
- **Flow 21**: `GuestAccessTokenModel` (Flow 21, post-event) and `StaffAccessTokenModel` (this flow) are separate models with similar TTL and revocation patterns. Consider unifying token management into a shared `AccessTokenService` to avoid divergence.
- **Flow 18**: Guest QR codes used for check-in here are the same QR codes generated at guest creation and auto-replied via webhook (Flow 18). The QR non-rotation gap (FLOW-18-F03) affects check-in security equally: a compromised QR code grants both a WhatsApp auto-reply and a venue check-in.
