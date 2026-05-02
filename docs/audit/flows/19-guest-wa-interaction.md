# 19 — guest-wa-interaction

## One-paragraph description
Host sends a WhatsApp event invitation to a guest (via messaging.service.js sendToGuest/sendBulk). Guest clicks an RSVP button (سأحضر/سأعتذر/ربما) in WhatsApp. Taqnyat receives the button click and sends a webhook to the backend (Flow 18). Backend updates guest.status and guest.rsvp in GuestModel, then the host's event stats page should reflect the updated confirmed/declined/maybe counts in real-time (or via polling if WebSocket is not used). The flow requires determining if stats are updated via WebSocket push, Server-Sent Events (SSE), or periodic polling from the frontend.

## Scope tags
- WhatsApp invitation delivery
- Button-click RSVP submission (guest side)
- Guest status persistence (DB update)
- Host stats UI refresh mechanism (real-time vs. polling)
- Multi-state tracking (pending → confirmed/declined/maybe)

## Roles involved
- Guest (WhatsApp user, clicks button)
- Host (views event stats page)
- Backend (processes button click, updates DB)
- Taqnyat/Meta (delivers invitation, forwards button click)
- Frontend (shows real-time or polled stats)

## Entry points (cite file:line)
- `labbe-backend-/src/modules/messaging/messaging.service.js:625-721` — `handleButtonResponse()` (triggered by webhook)
- `labbe-backend-/models/GuestModel.js` — guest.status, guest.rsvp fields
- `labbe-backend-/src/modules/guests/guests.service.js:50-94` — `submitRSVP()` (alternative RSVP entry via web form)
- Frontend: TBD (need to find event stats page component in labbe/ or halla-mobile/)

## Exit / terminal states
- Guest status changed to confirmed/declined/maybe
- RSVP timestamp recorded (rsvp.respondedAt)
- Host receives notification of RSVP change
- Host's stats UI updates to reflect new confirmed/declined counts
- Event-level stats aggregation recalculated

## Touched modules (file paths by repo)
**labbe-backend-:**
- `src/modules/messaging/messaging.service.js:625-721` — handleButtonResponse()
- `src/modules/guests/guests.service.js:50-94` — submitRSVP() (web form alternative)
- `src/modules/guests/guests.controller.js` — submitRSVP endpoint
- `src/modules/guests/guests.routes.js:97` — POST /:id/rsvp endpoint
- `models/GuestModel.js` — status enum, rsvp object
- `src/shared/utils/notificationService.js` — host notification
- `src/modules/events/events.service.js` — getEventStats() (for host dashboard)

**halla-mobile/ (if applicable):**
- `screens/HomeScreen.js` — display real-time stats
- `components/home/StatsCards.js` — confirmed/declined/maybe/checkedIn counts for latest event

**labbe/ (if applicable):**
- `app/[lang]/host/events/[id]/_components/GuestTable.jsx` — per-guest status column with filter

## Dependencies on other flows
- Flow 18 (messaging-webhook): webhook triggers button response handler
- Flow 22 (event-stats-visibility): stats aggregation and role-based access

## Known divergences (web ↔ mobile, frontend ↔ backend)
- Backend: processes button click via webhook and updates guest.status synchronously
- Frontend: must decide if stats refresh is real-time (WebSocket/SSE) or polling (e.g., every 5-30s)
- Guest RSVP entry: web users can submit via POST /guests/:id/rsvp; WhatsApp users submit via button click (both update the same GuestModel)

## Open questions

**Q1: Stats refresh mechanism: is it real-time (WebSocket/SSE) or polling-based?**

<!-- updated per peter note -->
A: **Decided (updated).** Polling every **1–2 minutes**. Peter's note overrides the earlier 10–15 second Gate-2 interval: stats change infrequently on the single event page and the last-event stats component; a slower poll interval reduces DB load without degrading UX. Backend `getEventStats()` already provides fresh aggregation per request with no caching; no backend change needed. WebSocket/SSE are not in scope. Note: mobile `useSingleEventStats` already sets `staleTime: 2 * 60 * 1000` (`halla-mobile/hooks/queries/useEvents.js:57`), consistent with this interval.
peter note :make the pooling every 1:2m because it will not change this frequantly in the single event page and the last event stats component
Source: `labbe-backend-/src/modules/staff/staff.service.js:278-296`

**Q2: Guest portal RSVP form: same backend? Supports "maybe"?**

A: Same backend. `submitRSVP()` accepts `'confirmed'`, `'declined'`, and `'maybe'` as valid status values. It also accepts `plusOnes`, `dietaryRestrictions`, and `message` fields. Submission requires `invitationCode` matching the guest's `qrcode` value. No separate portal backend exists.
peter note :  we need the message as we have 2 types of sending for whitebale we will send a message to guests with a link that redirect to our site that page will be customized per whitebale as it will have the whitelabel logo,name and some other keys also it will have 3 buttons which are confirm, decline, maybe with input message that we save in the message field and maybe we will have inputs for dietaryRestrictions and plusOnes and maybe not so keep that in mind we will need a new page for this purpose 
Source: `labbe-backend-/src/modules/guests/guests.service.js:50-94`

**Q3: Notification delivery: in-app, email, SMS? Real-time or batched?**

A: In-app push notification only, sent asynchronously via `notificationService.sendToUser`. The call is fire-and-forget (`.catch(console.error)`). No email or SMS is sent when a guest RSVPs. No batching is used.
peter note : u should treat all in-app notification as also notification that shows in the notification component list
Source: `labbe-backend-/src/modules/messaging/messaging.service.js:678-691`

**Q4: Stats aggregation: fresh or cached?**

A: Fresh per request. `getEventStats()` queries all guests for the event (`Guest.find({ event: eventId }).select('status')`) and counts by status in-memory. No cache layer exists.

Source: `labbe-backend-/src/modules/staff/staff.service.js:278-296`

**Q5: Plus-ones handling: does WhatsApp button flow support plus-ones?**

A: No. `handleButtonResponse()` sets RSVP status only — it does not process a plus-ones field. Plus-ones are supported exclusively via the web RSVP form where `submitRSVP()` stores `rsvp.plusOnes`.

Source: `labbe-backend-/src/modules/guests/guests.service.js:85`, `labbe-backend-/src/modules/messaging/messaging.service.js:671-676`

---

## State machine

```
Guest RSVP state (in GuestModel.status and GuestModel.rsvp):
  'invited' → handleButtonResponse('سأحضر') → 'confirmed', rsvp.respondedAt set
  'invited' → handleButtonResponse('سأعتذر') → 'declined', rsvp.respondedAt set
  'invited' → handleButtonResponse('ربما') → 'maybe', rsvp.respondedAt set
  'confirmed'/'declined'/'maybe' → handleButtonResponse (any) → status overridden (no re-RSVP protection)
  any → submitRSVP(web form) → any valid status, plusOnes, dietaryRestrictions, message stored
  'confirmed'/'checked_in' → check-in scan (Flow 20) → 'checked_in', checkIn.checkedInAt set

Stats polling:
  GET /events/:id/stats (every 1-2 min, per Peter's updated decision) → confirmed/declined/maybe/total counts
  → fresh DB query every call, no server-side cache
```

---

## Data handoffs

| Step | Producer | Consumer | Payload | Validation? |
|------|----------|----------|---------|-------------|
| Taqnyat button click → POST /messaging/webhook | Taqnyat | messaging.controller.js | `{from, buttonText, timestamp}` | Phone normalization (5 variants tried) |
| handleButtonResponse → GuestModel.findOne | messaging.service.js:625 | MongoDB GuestModel | phone variants query `{ event, phone: { $in: variants } }` | No dedup guard before update |
| handleButtonResponse → notificationService.sendToUser | messaging.service.js:678 | notificationService.js | `(hostId, notification)` | Fire-and-forget, no dedup |
| Web RSVP form → POST /guests/:id/rsvp | labbe/ guest portal | guests.service.js:50 | `{ status, invitationCode, plusOnes, dietaryRestrictions, message }` | invitationCode must match guest.qrcode |
| GET /events/:id/stats | Mobile HomeScreen / Web host page | staff.service.js:278 | Returns `{confirmed, declined, maybe, pending, checkedIn}` counts | Fresh DB query every call |
| Mobile polling (1-2 min) | halla-mobile/screens/HomeScreen.js (StatsCards) | same stats endpoint | Platform-level event counts + per-event RSVP counts | No server-side cache; `useSingleEventStats` staleTime already set to 2 min (`useEvents.js:57`) |

---

## Role variations

N/A for guests (no user account — they interact only via WhatsApp or the web RSVP form with an invitation code). Host receives notifications. Staff can see per-guest check-in status (Flow 20).

| Role | Stats visible | Notes |
|------|--------------|-------|
| Host | Own event RSVP counts (confirmed/declined/maybe/total) | Polls GET /events/:id/stats |
| Staff | Check-in counts (via GET /staff/events/:id/stats) | Separate endpoint, no messaging breakdown |
| Guest | None | Interacts via WhatsApp or web form only |

---

## Web ↔ mobile parity

| Feature | Web | Mobile | Gap? |
|---------|-----|--------|------|
| RSVP result counts (confirmed/declined/maybe) | Confirmed at `labbe/app/[lang]/host/events/[id]/` — host event detail page with stats | Confirmed at `halla-mobile/screens/HomeScreen.js` + `components/home/StatsCards.js` — shows confirmed/declined/checkedIn counts | No gap |
| Per-guest RSVP status in guest table | Confirmed at `labbe/app/[lang]/host/events/[id]/_components/GuestTable.jsx` — status column with confirmed/declined/maybe/invited/checkedIn badges | Confirmed at `halla-mobile/screens/StaffPortalScreen.js` — shows per-guest status color badges (confirmed/declined/maybe/invited) | No functional gap |
| RSVP status filter in guest table | Web GuestTable.jsx has per-column status rendering; global filter capability | Mobile StaffPortalScreen has search by name/phone; Confirmed missing — no status-based filter tab in StaffPortalScreen | Minor gap: mobile search is name/phone only, no RSVP status filter |
| Plus-ones via web RSVP form | Confirmed — submitRSVP accepts plusOnes | N/A — guests access from WhatsApp or direct link | No mobile app path for guest RSVP form (guest-side form is web-only) |
| Plus-ones via WhatsApp | Not applicable | Not applicable — handleButtonResponse does not support plusOnes in either path | WhatsApp path does not support plus-ones on any platform (see FLOW-19-F01) |

---

## Edge cases & failure modes

1. **Guest has no WhatsApp:** Taqnyat sends SMS fallback; SMS has no RSVP buttons; guest cannot RSVP via WhatsApp path and must use the web RSVP form directly.
2. **Guest changes RSVP (second button click):** Status overridden without protection; host gets a second notification for the same guest (if using different status).
3. **submitRSVP called twice (double-tap web form):** No idempotency guard — two DB updates fire, two host notifications sent (see FLOW-19-F02).
4. **Stats drift at polling boundary:** Guest confirms via WhatsApp at second 14 of 15s polling window — host sees stale count for up to 15 seconds. Acceptable per Gate-2 decision.
5. **No plus-ones via WhatsApp:** Guests who confirm via WhatsApp show `plusOnes=0` even if they intend to bring guests. Planning data is incomplete for the dominant RSVP channel.

---

## Findings

### FLOW-19-F01 — WhatsApp RSVP button does not capture plus-ones
- **Severity**: Medium
- **Type**: Parity-gap
- **Location**: `labbe-backend-/src/modules/messaging/messaging.service.js:671-676`
- **Description**: `handleButtonResponse()` sets RSVP status (confirmed/declined/maybe) only. It does not process plus-ones, dietary restrictions, or a guest message. These fields are supported by `submitRSVP()` at `guests.service.js:85` (the web RSVP form path). Guests who RSVP via the WhatsApp button cannot indicate they are bringing additional guests.
- **Why it matters**: Plus-ones data is a key planning input for hosts (catering, seating, capacity). WhatsApp is the primary RSVP channel for Saudi events; incomplete data from the dominant channel creates systematic planning gaps.
- **Recommended change**: After the WhatsApp RSVP button sets the initial status, send a follow-up Taqnyat message asking how many attendees will join. Process the numeric response and update `rsvp.plusOnes`. This requires a product-design decision before any implementation.
- **Related**: none

### FLOW-19-F02 — submitRSVP has no idempotency guard on double-submit
- **Severity**: Medium
- **Type**: BUG
- **Location**: `labbe-backend-/src/modules/guests/guests.service.js:50`
- **Description**: `submitRSVP()` has no idempotency guard. If a guest double-taps the confirm button on the web RSVP form or the client auto-retries a timed-out request, two identical DB updates are written and two host notifications are fired.
- **Why it matters**: Gate-1 #6 requires idempotency on external side effects. Duplicate notifications degrade the host's notification center and violate the gate-1 commitment.
- **Recommended change**: Before processing `submitRSVP()`, check if `guest.rsvp.respondedAt` is already set to the same status within the last 5 seconds. If so, return the existing RSVP state without re-processing or re-notifying.
- **Related**: FLOW-18-F02

<!-- updated per peter note -->
### FLOW-19-F03 — Stats endpoint runs uncached DB aggregation on every poll
- **Severity**: Low
- **Type**: Inconsistency
- **Location**: `labbe-backend-/src/modules/staff/staff.service.js:278-296`
- **Description**: `getEventStats()` runs a fresh `Guest.find()` aggregate on every call with no server-side cache. Per Peter's updated decision (Q1 note), polling is now every **1–2 minutes** (changed from 10–15 seconds). At this interval the load concern is materially reduced: roughly 1 fresh DB query per 60–120 seconds per open dashboard. Note: `useSingleEventStats` in mobile already sets `staleTime: 2 * 60 * 1000` (`halla-mobile/hooks/queries/useEvents.js:57`), which aligns with the updated polling interval.
- **Why it matters**: At 1–2 min polling cadence, uncached aggregation creates low-level DB load for events with 1000+ guests — not a reliability concern at this cadence. A server-side cache is still a useful improvement but no longer urgent.
- **Recommended change**: Add a server-side cache (Redis TTL 30s, keyed by `eventId`) on `getEventStats()`. Invalidate the cache entry when `handleButtonResponse()` or `checkInGuest()` writes to a guest document for that event.
- **Related**: FLOW-22-F01

<!-- updated per peter note -->
### FLOW-19-F04 — No whitelabel-branded RSVP portal page for whitelabel events
- **Severity**: High
- **Type**: Bucket-3, Missing
- **Location**: `labbe-backend-/src/modules/guests/guests.service.js:50-94` and `labbe-` RSVP frontend (no whitelabel-branded page exists)
- **Description**: Peter stated: "we have 2 types of sending for whitelabale we will send a message to guests with a link that redirect to our site that page will be customized per whitebale as it will have the whitelabel logo,name and some other keys also it will have 3 buttons which are confirm, decline, maybe with input message that we save in the message field and maybe we will have inputs for dietaryRestrictions and plusOnes and maybe not so keep that in mind we will need a new page for this purpose". The code has a single generic `submitRSVP()` endpoint (`guests.service.js:50`) with no whitelabel branding, no customizable logo/name display, and no dedicated branded page per whitelabel tenant. All guests reach the same unbranded RSVP form regardless of whitelabel context. The `message` field IS already supported in `submitRSVP()` at `guests.service.js:85`; the gap is the frontend page and whitelabel context delivery.
- **Why it matters**: Whitelabel operators brand the platform for their clients. Guests RSVPing to a whitelabel event reaching an unbranded portal breaks the whitelabel promise and may confuse guests who associate the event with the operator's brand, not Labbe's. This is a core gap for the whitelabel product tier.
- **Recommended change**: Build a whitelabel-aware RSVP portal page (new frontend page). Route: `GET /rsvp/:guestId?wl=<whitelabelId>` or via subdomain. The page reads `event.whitelabelId` and renders the whitelabel logo, name, and customized styling. The RSVP form posts to the existing `submitRSVP()` with `{ status, message, plusOnes, dietaryRestrictions }`. Gate behind whitelabel enablement; non-whitelabel events use the existing generic RSVP form unchanged.
- **Related findings**: none

---

## Cross-flow notes

- **Flow 18**: The RSVP state transitions in this flow are written by `handleButtonResponse()` (Flow 18's webhook handler). The two findings share the same dedup root — FLOW-18-F02 and FLOW-19-F02 can be fixed with one `respondedAt` check pattern applied in both code paths.
- **Flow 22**: `getDetailedStats()` (Flow 22) and `getEventStats()` (this flow) are two separate aggregation queries that both run uncached. FLOW-19-F03 and FLOW-22-F01 are the same root cause — fix both with a single shared cache layer keyed by eventId. Note: with polling updated to 1–2 min, the urgency of Flow 22's cache finding may also reduce proportionally.
- **Flow 20**: Once a guest is `confirmed` via this flow, staff (Flow 20) can scan them in. If the WhatsApp RSVP button is the only confirmation mechanism and plus-ones are not captured (FLOW-19-F01), check-in counts will exceed confirmed counts when guests bring unregistered attendees.

---

## Post-Phase-3 surgical updates

- **Updated Q1 answer (Decided → Decided updated)** based on peter note in Q1: polling interval changed from 10–15 seconds to 1–2 minutes. Source: peter note confirmed; mobile `useEvents.js:57` `staleTime: 2 * 60 * 1000` already aligned. State machine updated (polling line). Data handoffs table updated (Mobile polling row).
- **Updated FLOW-19-F03 severity** from Medium → Low based on peter note in Q1: 1–2 min polling reduces DB load concern materially. Description updated to remove incorrect "Peter stated 5 minutes cached" claim and reflect updated interval. Type changed from Bucket-3/Inconsistency to Inconsistency (the Bucket-3 label was based on a disputed "5 minute" cache claim; the real issue is just missing server-side cache, which remains valid at Low severity). Cache recommendation unchanged.
- **Added FLOW-19-F04** (Bucket-3, High) based on peter note in Q2: no whitelabel-branded RSVP portal page exists. Peter's note reveals a core product requirement (two types of RSVP flow — generic and whitelabel-branded) that has no frontend implementation. Backend `submitRSVP()` already supports the required fields. Source: `guests.service.js:50-94`.
- **Peter note in Q3 acknowledged but no change.** Note adds product requirement that in-app notifications also appear in the notification list component. `notificationService.sendToUser()` already calls `Notification.createForUser()` which creates a DB record visible to the notification list — current behavior already matches this intent. No downstream section change needed.
- **Cross-flow:** FLOW-19-F03 severity reduction (Medium → Low) may apply to FLOW-22-F01 as well if Flow 22's polling assumptions are also updated to 1–2 min.
