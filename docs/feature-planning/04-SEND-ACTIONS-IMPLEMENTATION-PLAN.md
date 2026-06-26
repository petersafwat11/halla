# Implementation Plan — Consolidated "Send messages" Actions (Web + Mobile)

> **Status: IMPLEMENTED 2026-06-25** — all 3 phases (backend endpoint, web UI, mobile UI). Statically verified: parse, scoped ESLint (0 errors, web + mobile), JSON valid, backend module-load + schema accept/reject, no dangling references. **NOT yet exercised at runtime** (no server/app run, no real send). The locked channel decision required a follow-up fix: the resend mutation was forcing `channel:'sms'`, defeating the server-side template resolver — corrected on both platforms so resend now follows the event template.
> Companions: [`01-WEB-FRONTEND-event-pages.md`](01-WEB-FRONTEND-event-pages.md), [`02-BACKEND-AND-DB.md`](02-BACKEND-AND-DB.md), [`03-QUOTA-EDGE-CASES-REVIEW.md`](03-QUOTA-EDGE-CASES-REVIEW.md).

## Goal

Move the three pool-charged send actions off the guest-table selection and into **one grouped control in the single-event header** — `Send messages ▾` (web dropdown) / action-sheet (mobile) — each opening **one shared confirm popup**: a guest table with select-all checkboxes (default all), a live `N selected · M invites left` counter, a cost line, and confirm/cancel. The three actions:

| Action | Audience | Backend |
|---|---|---|
| **Resend invite** | already-sent, no/maybe response | exists (`POST /events/:id/resend-invite`) |
| **Extra reminder** | confirmed / checked-in | exists (`POST /events/:id/extra-reminder`) |
| **Send to new guests** 🆕 | added after launch, never sent (`invitation.sent != true`) | **new endpoint (Part A)** |

Baked-in refinements (agreed): grouped menu (not 3 raw buttons); **disable-with-reason** not hide; remaining + cost + insufficient + expired handled in the popup; **Send locks on submit**.

---

## Part A — Backend: the one new endpoint

Everything for resend/extra-reminder already exists and accepts a `guestIds` subset, so the only backend work is the "send to new guests" path. **Do not reuse `POST /messaging/send-bulk`** — it *overwrites* `messagingStatus` counters at start/end (`messaging.send.service.js:462-470, 527-533`), which would wipe the event's "200 sent" stats. Instead add a sibling to `resendInvite`, reusing the atomic per-guest primitive.

| File | Change |
|---|---|
| `labbe-backend-/src/modules/events/events.resend.service.js` | **Add `sendToNewGuests(eventId, body, user)`** — mirrors `resendInvite` (`:147`): scoped find + populate `taqnyatTemplate.templateRef`/`host`; `_assertDispatchAllowed(event,'send-new-guests')` (`:38`); audience = guests `{ event, deleted:{$ne:true}, 'invitation.sent':{$ne:true} }`, optional `body.guestIds` **intersects** that set; `_assertInviteBudget(event.subscriptionId, targets.length)` (`:57`); resolve channel like launch (whatsapp iff `taqnyatTemplate.templateRef` and `body.channel!=='sms'`, else sms); `runBatched` calling **`messagingSendService.sendToGuest({guestId, eventId, channel})`** per guest — this **flips `invitation.sent`, charges the pool once (clamped), stamps `firstSendAt`** atomically, so **do NOT also call `_chargeInvites`** (double-charge); then additively `$inc messagingStatus.sentCount` by successes. Return `{ reminded, successful, failed }`. |
| same file (imports) | `const messagingSendService = require('../messaging/messaging.send.service');` — **check for circular require** (messaging.send does not require events.service today, so this is safe; verify at build). |
| `labbe-backend-/src/modules/events/events.validation.js` | Add `sendNewGuestsSchema = z.object({ channel: z.enum(['sms','whatsapp']).optional(), guestIds: z.array(objectId).optional() }).passthrough();` and export it (mirror `resendInviteSchema` `:141`). |
| `labbe-backend-/src/modules/events/events.controller.js` | Add `sendNewGuests` handler mirroring the `resendInvite` controller (thin: call `eventsService.sendToNewGuests(id, body, req.user)` → `sendSuccess`). |
| `labbe-backend-/src/modules/events/events.routes.js` | Add after extra-reminder (`:999`): `router.post('/:id/send-new-guests', validateObjectId('id'), requireSubscription, idempotency({ scope:'events.send_new_guests' }), validateZod(sendNewGuestsSchema), eventsController.sendNewGuests);` |
| `events.service.js` | **No change** — `Object.assign(... require('./events.resend.service') ...)` (`:24`) auto-composes the new method onto the facade. |

**Why this is correct:** `sendToGuest` is the same primitive the initial cron launch uses (`messaging.send.service.js:661` export), so consumption, double-charge protection, `firstSendAt`, and the `invitation.sent` flip are identical to a normal first send — these guests simply get their *first* invite late. The dispatch gate (`canDispatch`) already blocks terminal events, owner-mismatch, under-refund, and **expired subs** — so the expiry-stranding case surfaces here as a clean 403, which the popup translates (Part E).

---

## Part B — Shared contract (audiences + gating), identical web & mobile

Compute from the guest list (`GET /guests/events/:eventId`, which already returns `status`, `invitation.sent`, `rsvp.response`).

```
sendStarted   = event.messagingStatus?.bulkSendStarted === true
              || ['live','published','completed'].includes(event.status)

NEW       = guests.filter(g => g.invitation?.sent !== true && !g.deleted)
RESEND    = guests.filter(g => g.invitation?.sent === true
                               && ['invited','pending','maybe'].includes(g.status))
REMINDER  = guests.filter(g => ['confirmed','checked_in'].includes(g.status)
                               || g.rsvp?.response === 'confirmed')
```

> Extract `['invited','pending','maybe']` / `['confirmed','checked_in']` into a shared constants module (web already has them in `useGuestTableActions.js:13-17` — move to one place so audiences can't drift; mobile mirrors them). The backend re-enforces each audience, so client filters are UX only.

**Menu-item gating (disable-with-reason):** show the menu whenever the event is non-terminal.

| Item | Enabled when | Disabled reason copy |
|---|---|---|
| Send to new guests | `sendStarted && NEW>0` | `!sendStarted`: "Send the initial invitations first" · `NEW===0`: "No new guests to send to" |
| Resend invite | `sendStarted && RESEND>0` | `!sendStarted`: "Send invitations first" · `RESEND===0`: "Everyone has responded" |
| Extra reminder | `REMINDER>0` | `REMINDER===0`: "No confirmed guests yet" |

Terminal event (`completed/cancelled`) → hide the whole menu. Known-expired sub (if `event.subscription.status`/`expiresAt` says so) → keep menu, let the popup show the expired state.

**Shared popup behavior:**
- Guest table of the chosen audience: name · phone · status badge · checkbox; header **select-all checked by default**.
- Footer: `{selected} selected · {invitesRemaining} invites left` (omit "invites left" when `invitesRemaining === null` = unlimited).
- Cost line: "This sends {selected} message(s) and uses {selected} invite(s)." (omit invite-cost when unlimited).
- **Send disabled** when `selected===0`, or `invitesRemaining!==null && selected>invitesRemaining` (+ warning "Not enough invites — {remaining} left").
- **Send locks** (spinner, disabled) while pending.
- Reads remaining from `event.subscription.invitesRemaining` (already in the single-event payload).

---

## Part C — Web (`labbe/`)

| File | Change |
|---|---|
| `ui/host/events/SendMessagesMenu.jsx` 🆕 | The `Send messages ▾` dropdown. Computes audiences (Part B) from `useEventGuests`; renders 3 items with `disabled`+`title` reasons; on click sets `activeAction` and opens the shared popup. Modeled on the existing Edit-Event dropdown in `EventActionsHeader.jsx`. |
| `ui/host/events/SendActionPopup.jsx` 🆕 | The shared popup. Reuses `ui/host/popups/popupWrapper/PopupWrapper.js`. Props `{ action, event, guests, isOpen, onClose }`. Renders audience table + checkboxes + select-all + counter + cost + Send/Cancel; maps error codes (Part E). Supersedes the count-only `GuestTable/BulkActionConfirmModal.jsx`. |
| `ui/host/events/EventActionsHeader.jsx` | Mount `<SendMessagesMenu event={event} />` in `.actionsContainer` (`:86-149`). |
| `hooks/events/mutations/useEventSettingsMutation.js` | Add `"sendNewGuests"` to `SETTINGS_ACTIONS` (`:9-18`); add the branch → `POST API_PATHS.events.sendNewGuests(eventId)` body `{channel, guestIds}`, invalidating `["events",id]`,`["events"]`,`["guests","events",id]` (mirror resend `:135-157`). Resend/extra-reminder already exist — popup calls them with the **checked** `guestIds`. |
| `hooks/events/mutations/useEventMutation.js` | Add `useSendNewGuests` convenience (mirror `:103-105`). |
| `config` API paths (where `events.resendInvite` lives) | Add `events.sendNewGuests = (id) => \`/events/${id}/send-new-guests\``. |
| `services/http.js` (or the mutation) | **Send `Idempotency-Key` via `config.headers`** so it actually transmits (known drop, FE doc §8.5) — the backend route now has idempotency middleware ready. One fresh key per popup-send. |
| `components/event-detail/GuestTable/GuestRows.jsx` + `useGuestTableActions.js` | **Remove** the resend/extra-reminder `bulkActions` (relocated). Keep other table behavior. (Avoids two entry points.) |
| `localization/locales/{en,ar}/home-events.json` | Add `sendMenu.*` (title, 3 item labels, 3 disabled reasons) and `sendPopup.*` (titles, counter, cost, errors). Reuse existing `bulkActions.*` / `remainingInvites.*` strings where possible. |

---

## Part D — Mobile (`halla-mobile/`)

Parallel to web; RN `<Modal>` (no bottom-sheet lib in repo). **Cairo-only — no font work.**

| File | Change |
|---|---|
| `components/events/SendActionsSheet.js` 🆕 | Action-sheet `<Modal>` listing the 3 actions with disabled+reason (Part B). Opened from the header. |
| `components/events/SendActionModal.js` 🆕 | Shared confirm modal: `FlatList` of the audience with checkboxes + **select-all** (model on `components/guests/ReuseGuestsModal.js`) + cost summary (model on `components/events/BulkActionConfirmModal.js`) + counter + Send/Cancel + pending lock + error mapping. |
| `components/home/EventActionsHeader.js` | Add a `Send messages` action that opens `SendActionsSheet`. |
| `screens/common/EventDetailsScreen.js` | Feed the modals from **`useEventGuests`** (full payload — has `invitation.sent`, `rsvp.response`), **not** the `useSingleEventStats` projection (which omits `invitation.sent`, `:142-149`). Remove the select-mode bulk resend/extra-reminder bar (`:1120-1160`), relocated to the sheet. |
| `hooks/events/mutations/useEventMutation.js` | Add `useSendNewGuests` (mirror `useResendInvite` `:428-450`) → `ENDPOINTS.EVENTS.SEND_NEW_GUESTS(eventId)`, body `{channel, guestIds}`, invalidate `["events","single-stats",eventId]` + `["events"]`. |
| `config/api.js` | Add `ENDPOINTS.EVENTS.SEND_NEW_GUESTS = (id) => \`/events/${id}/send-new-guests\``. |
| `localization/.../{ar,en}/events.json` | Add `sendMenu.*` + `sendPopup.*` under the existing `events:` namespace (already holds `bulkActions.*`, `remainingInvites.*`). |

---

## Part E — Idempotency & error handling (both platforms)

- **Double-send:** Send button disabled while the mutation is pending; one fresh `Idempotency-Key` per popup-open so a retry replays instead of re-charging (backend honors it on all three routes).
- **Error-code → copy** in the popup:
  - `402 INSUFFICIENT_INVITES` → "Not enough invites — {remaining} left. Reduce selection or buy more."
  - `403` (dispatch denied; reason often `subscription_expired`) → "This event's plan has expired or sending is no longer allowed." *(the expiry-stranding case from `03-QUOTA-EDGE-CASES-REVIEW.md` Finding C, surfaced gracefully)*
  - `NO_REMINDER_TEMPLATE` (extra reminder) → "No reminder template configured for this event category."
  - `SEND_INVITES_FIRST` / `noSendYet` → "Send the initial invitations first."
- **Success:** toast `{successful}/{total} sent`; invalidate event + guests so counts/badges refresh.

---

## Part F — Build order

1. **Backend endpoint** (Part A) — independently testable via API; unblocks both clients.
2. **Shared audience/gating constants** — extract once per platform.
3. **Web** — popup + menu + mutation + API path + idempotency-header fix + i18n; then remove old table bulk actions.
4. **Mobile** — sheet + modal + mutation + endpoint + i18n; then remove old select-mode bar.
5. **QA** both platforms (Part G).

Each phase is shippable on its own; the new-guests endpoint adds value even before the UI lands.

---

## Part G — Test checklist

- **Endpoint:** sends only to `invitation.sent!=true`; flips `sent`; charges pool exactly once/success (clamped); `messagingStatus.sentCount` increments **without** resetting prior counts; `guestIds` narrows correctly; `402` over budget; `403` when sub expired/terminal; idempotency replay on same key.
- **Gating:** each item disabled-with-correct-reason before send, after send, with empty audience, on terminal event, on expired sub.
- **Popup:** select-all default; counter live; cost hidden for unlimited; Send disabled at 0 and when selected>remaining; pending lock prevents double-submit; every error code mapped.
- **Cross-cutting:** business old-event on a replaced sub still sends (M3); both roles; both platforms; RTL/Cairo on mobile.

---

## Part H — Decisions (LOCKED 2026-06-25)

1. **Channel:** *Follow the event template* — WhatsApp when `taqnyatTemplate.templateRef` is set, else SMS — for **both** send-new-guests **and** resend. ⚠️ This **changes resend's current default**, which is hard-coded `sms` (`events.resend.service.js:148`). Implement a shared `_resolveChannel(event, body.channel)` helper used by resend + send-new-guests so `body.channel` can still force a specific channel but the default mirrors the launch.
2. **Old entry point:** *Remove* the guest-table multi-select resend/extra-reminder — the header `Send messages` menu is the single entry point.
3. **Terminal events:** *Hide* the whole menu on `completed/cancelled`.

> Independent of the quota fixes in `03-QUOTA-EDGE-CASES-REVIEW.md` — this only *reads* `invitesRemaining` and leans on existing 402/403. Building it first makes the pool/cost model visible to users, which de-risks the later carryover/expiry decisions.
