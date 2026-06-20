# Invites / Plans / Reminders Rework — Implementation Plan

Status: **IMPLEMENTED — Phases 0-8 complete (2026-06-20)**. Dev environment, **no
production users** → clean-slate changes, no backward-compat shims. Plans reseeded +
subscriptions backfilled. Static verification green (backend boots, web/mobile lint clean,
adversarial review done + bugs fixed). Runtime/UI QA pending a running stack — see the
Completion log at the bottom.

Codebases:
- `labbe-backend-/` — Node/Express, Mongoose
- `labbe/` — Next.js web
- `halla-mobile/` — React Native mobile
- `shared/` — shared workspace consumed by both frontends (`@halla/shared`)

---

## 1. The unified model (the target state)

### Plans
- **Per-event plans become identical to pool plans except `maxEvents`** (per-event = `1`,
  pool = `-1`). Both carry `invitePool`, `compensationPool` (15% of **base** invites only),
  and a subscription-level `invitesConsumed` counter.
- `invitesRemaining = invitePool + compensationPool − invitesConsumed`, where purchased
  **extra invites are folded into `invitePool`** (so the formula already includes them).
  Compensation is computed once at base, never recomputed for extras (verified ordering:
  `createForUser` runs before the addon loop; `renew()` never touches `compensationPool`).
- `maxInvitesPerEvent` is obsolete; stop reading it.

### Consumption — two gates, send-time charging
- **Guest-list cap** (adding names): `totalGuests ≤ invitePool + compensationPool` (total
  capacity, ignores consumption — a name costs nothing).
- **Send budget** (any send action): `selectedToSend ≤ invitesRemaining`.
- **What consumes:** initial send, resend, extra reminder — **per-guest, idempotent, only on
  a successful send (a returned `messageId`)**.
- **What's free:** the normal/auto reminder (confirmed-only).
- Adding guests no longer consumes anything.

### Three messaging actions
| | Normal reminder | Resend | Extra reminder |
|---|---|---|---|
| Audience | confirmed only | non-responders / maybe (table-selected) | confirmed only (table-selected) |
| Template | `reminder_confirmed` | `invite` (same as initial) | `reminder_confirmed` |
| Cost | FREE | consumes pool | consumes pool |
| Timing | 48h before / customizable | immediate | immediate |
| Where | auto cron + "customize time" button | guest-table bulk action | guest-table bulk action |

### Scheduling windows (strict, frontend + backend, with helper text)
| | Trial | Paid |
|---|---|---|
| Initial scheduled send | `[now + 15min, event − 3d]` | `[now + 24h, event − 3d]` |
| Normal reminder | `scheduledSend + 10min` (button still available) | default 48h before; customizable to `[sendTime, event − 24h]` |
| Min event date | `≥ now + 3d + 15min` | `≥ now + 4d` |

### Cancellation / deletion
- **Soft delete everywhere** (host currently hard-deletes; standardize on `status='deleted'`).
- **No invite release on cancel/delete** — `invitesConsumed` already reflects only successful
  sends.
- Cancelled + deleted events are excluded from the event count via **one shared filter**.
- **Per-event re-creation rule:** a per-event host may create a new event **only if sending
  never started**. Block per-event creation if `invitesConsumed > 0` (any send ever happened)
  **OR** an active (non-cancelled, non-deleted) event already exists. Once ≥1 message was sent,
  the per-event plan is permanently used.
- **Pool plans:** sends decrement remaining; events never lock; delete/keep is irrelevant.

### Refund (admin/super-admin only — moderators excluded for now)
- The money-refund flow already exists end-to-end (Moyasar full + partial, web + mobile admin
  UI, idempotency, history).
- **Full refund:** cancels the subscription (blocks the whole pool). Unchanged.
- **Partial refund:** add an **optional "invites to deduct" parameter** so the admin can claw
  back some/all pool invites, or leave the pool intact.
- Fix the web bug where `whitelabel_admin` sees a refund button the backend 403s.

### WhatsApp delivery reliability
- The `messageId ⇒ success` invariant already exists at the Taqnyat boundary
  (`finalizeWaResult`). The bug survives only where callers ignore `result.success`.
- Fix the test-message path (returns HTTP 200 success even on soft failure), the post-event
  `success !== false` check (→ `=== true`), and `markGuestAsSmsFallback` setting `sent` with
  no messageId.
- Consume on **submission** (messageId present). Delivery-webhook refunds = later phase.
- Webhook keeps trusting requests without a signature for now (env key added later).

---

## 2. Phased work

Dependency order: Phase 0 → 1 → (2, 3, 4 parallel) → 5 → 6 → 7 → 8.

### Phase 0 — Foundation: data model + seeds + dead-code removal (backend)
- `planDefaults.js`: add `limits.invitePool` to per-event plans (basic/premium/business event
  = tier invites; trial = 5). Reseed.
- `plans.service._formatPlan`: extend compensation computation to per-event (drop the
  `isPoolPlan` guard so per-event shows `invitePool` + 15%).
- `manage-plans` save guard `_guardLimitReductions`: drop the dead `maxInvitesPerEvent` branch;
  rework the `invitePool` breach check for send-time `invitesConsumed`.
- `SubscriptionModel`: keep `invitePool/compensationPool/invitesConsumed`; **remove**
  `remindersPool/remindersReserved/remindersConsumed` + `reserveReminders` /
  `consumeReservedReminders` / `releaseReservedReminders` + `remindersRemaining` virtual; remove
  dead `trackEventCreation`, model `incrementEventUsage`, `resetUsage`, never-set `eventId`
  branches; `maxGuests` virtual → total capacity (not `maxInvitesPerEvent || 50`).
- Reset/reseed dev subscriptions so existing rows match the new shape.

### Phase 1 — Consumption shift + messageId reliability (backend)
- Remove consume-at-add: `events.crud.service.js` (create), `events.guests.service.js`,
  `events.step2.service.js` (`adjustPoolInvites`).
- Add per-guest consume at send: `messaging.send.service.sendToGuest` on `result.success`
  (mirror the extra-reminder dispatcher's consume-on-success accounting); same in resend and
  the new extra-reminder path. Refund nothing on failure (it was never consumed).
- Two gates: `checkGuestLimit`/`canAddGuests`/`maxGuests` → total capacity for the **list**;
  add a **send-budget** check (`selectedToSend ≤ invitesRemaining`) at each send endpoint.
- `subscription-info` (`events.stats-export.service.js`): per-event branch returns real
  `invitePool` / `invitesRemaining` instead of `null`.
- Verify the retry cron re-passes guestIds so per-guest idempotency prevents double-charge.
- messageId reliability: make the test-message path surface failure (throw / non-2xx so the
  HTTP idempotency middleware retries instead of caching a fake success); fix
  `post-event.dispatch.service.js` (`=== true`); fix `markGuestAsSmsFallback`.
- Relocate the `plan_limit_warning` notification trigger to the send path.

### Phase 2 — Remove extra-reminder system + reminder rework (backend)
- Delete: `extra_reminders` addon type + `EXTRA_REMINDERS_TIERS` + pricing/quota/validation
  branches; `ScheduledExtraReminderModel`; `src/modules/scheduled-extra-reminders/*`; the
  `scheduleExtraReminderDispatcher` cron + `_runScheduledExtraReminder`; guest `extraReminder*`
  fields; the `reminder_pending` template type + the auto-reminder `pendingGuests` batch.
- Normal/auto reminder → confirmed-only (`scheduleGuestReminders` / `_runAutoReminderForEvent`
  drop the pending segment); free; customizable time.
- Resend (`events.resend.service.js`): accept `guestIds`, charge the pool, remove all three
  gates (`resendInviteSentAt`, 48h cooldown, live-status), make idempotency repeatable.
- New extra-reminder endpoint: confirmed-only, `reminder_confirmed` template, pool-charged,
  immediate, `guestIds`.

### Phase 3 — Scheduling windows + event-date gates (backend)
- `messaging.schedule.service.scheduleBulkSend`: paid min-lead 48h → 24h; add max
  (`≤ event − 3d`, new `SCHEDULE_TOO_LATE` code); keep trial 15min.
- Event-date floor enforced in **all three write paths**: `createEvent`,
  `updateEventDetails`, and admin `updateEventFull` (route the admin bypass through the same
  validation). Trial `≥ now+3d+15min`, paid `≥ now+4d` (precise combined date+time instant
  check, not date-only).
- Trial normal reminder = `scheduledSend + 10min`, computed inside `scheduleBulkSend` (only
  place the send time exists); make the `EventModel` pre-save plan-aware so it doesn't clobber
  it. (~15min cron jitter is acceptable.)
- Re-validate a stored `launchSettings.scheduledDate` when the event date changes (all update
  paths); clear/revert if it now violates the window.
- Unify trial detection behind one resolver.

### Phase 4 — Cancellation / deletion + refund (backend)
- Soft delete everywhere (convert host hard-delete to soft delete).
- One shared event-count filter excluding `cancelled` + `deleted`.
- Per-event gate: block creation if `invitesConsumed > 0` OR an active event exists; retire the
  static `usage.eventsCreated` gate and dead counter code.
- Remove `releaseInvites`-on-cancel and any consume/release tied to the old model.
- Refund: add optional `deductInvites` param to `payments.service.issueRefund` (partial path);
  keep full refund = cancel subscription; keep moderators excluded; fix the web
  `whitelabel_admin` refund-button RBAC mismatch.

### Phase 5 — Plans / checkout / addons (backend + web + mobile)
- Backend: delete the per-event `extra_invites` rejection in `_resolveAndPriceAddons`; confirm
  multiple `extra_invites` line items price + apply (each ≤ tier max; folds into `invitePool`).
- Web `AddonsSection.jsx` + mobile `AddonsSection.js`: extra-invites state single-object → list;
  `toggleInv` adds/removes; remove the `extra_reminders` card; sum into totals.
- Summary cards (web + mobile `PlanSummaryCard` / `AddonsSummaryCard`): show **total invites =
  base + extras + compensation**; tooltips (compensation is base-only, per-event vs pool).
- `manage-plans` edit form (web `PlanLimitsSection` + mobile `EditPlanModal`): remove the
  `maxInvitesPerEvent` input, require `invitePool`; admin tooltips.
- Consolidate web `ManagePlansContent` / `CurrentPlanCard` onto shared `isPoolPlan`.

### Phase 6 — Single-event page + table actions (web + mobile)
- Web guest table: add combined `noResponseOrMaybe` filter; supply `bulkActions` to the
  existing `Table` (which already has selection infra) → "Resend invitation" (non-responders/
  maybe) + "Extra reminder" (confirmed); each re-filters selected ids by status before sending;
  lift selection state (`onSelectionChange`) for a live "N selected · costs N · M remaining".
- Mobile: add a "select mode" toggle to the guest list + a bottom action bar (no checkbox table
  exists).
- Remove resend from the header; remove `canResendInvite`/`resendInviteTooltip` from
  `shared/src/hooks/useEventActionGate.js` and both consumers.
- Delete `ScheduleReminderSection` (web + mobile) + the `extraReminder` guest-table column +
  the dead `SubscriptionInfo.jsx` (web admin) + the dead mobile reminder block; fix the mobile
  inline-reminder gate (`remindersRemaining` → confirmed-count).
- Show **remaining invites** on the single-event page (web: reuse `useEvent`'s
  `event.subscription.invitesRemaining`; mobile: replicate enrichment into `getSingleEventStats`
  or read from the `getEventById` half).
- Normal-reminder customize UI (`AutoReminderInfoText` + `CustomizeReminderPopup` /
  mobile equivalent): confirmed-only copy, enforce trial/paid window, pass `launchSettings` in,
  bound the pickers.
- Dashboard `LastEventQuota` (web + mobile) + `dashboard.service.js`: fix the `null = unlimited`
  trap; per-event branch uses the pool formula (truly-unlimited admin stays `null`).
- Replace the stub "Send invitations" guest-row action (currently only toasts).

### Phase 7 — i18n + UX copy (web + mobile)
- Remove dead keys: resend gate strings (`notLive/alreadyUsed/notSent/cooldown`),
  `scheduleReminder.*`, `reminder_pending`, `extra_reminders` addon, `remindersRemaining`,
  `extraReminder` column.
- Add keys: total-invites row, compensation tooltip, window helper text, per-action cost,
  disabled-state reasons, event-date floor explanation.
- Apply tooltips/help text per the UX notes (pool explanation, free vs paid, why disabled).

### Phase 8 — Reseed + verification
- Reseed plans (`node scripts/seedPlans.js`); reset dev subscriptions.
- Manually verify each flow end-to-end on web + mobile: checkout (per-event + stacked extras),
  create/update event date gates (trial + paid), step-2 cap, scheduled send windows, initial
  send consumption, resend, extra reminder, normal reminder (confirmed-only, trial +10min),
  remaining-invites display, cancel/delete + per-event re-creation rule, admin refund
  (full + partial-with-deduct), test-message failure surfacing.

---

## 3. Notes / invariants to preserve
- Web ↔ mobile parity in gates and behavior (visual restyle is a **separate, later** effort).
- Keep `shared/` (`useEventActionGate`, `paths.js`, constants) and the backend mirror of
  `plans.js` in sync.
- No automated test suite exists; rely on the smoke scripts + manual verification.

---

## Completion log (2026-06-20)

All phases landed. Working tree only (NOT committed).

- **Phase 0-4 (backend):** per-event plans unified onto invitePool; consumption at send-time
  (per-guest, idempotent, capacity-clamped); extra-reminder system deleted; resend reworked
  (pool-charged, repeatable, no gates) + new `POST /events/:id/extra-reminder`; auto-reminder
  confirmed-only; scheduling windows + event-date floors (`schedulingWindow.js`); soft-delete
  everywhere; per-event re-creation gate (invitesConsumed>0 ⇒ blocked); refund `deductInvites`.
- **Phase 5-7 (frontend):** stacked extra-invite packages + total-invites + tooltips; resend
  moved into the guest table as a bulk action; new extra-reminder bulk action; "no-response or
  maybe" filter; remaining-invites banner + cost-aware confirm; deleted ScheduleReminderSection;
  reminder-customize confirmed-only + window-bounded; date pickers enforce floors/windows;
  refund deductInvites UI + RBAC fix; i18n en/ar on both apps.
- **Phase 8:** `node scripts/seedPlans.js` (34 plans, per-event now carry invitePool) +
  `node scripts/backfill-unified-pool.js` (29 subs backfilled, 5 invitesConsumed recomputed).

### Adversarial review fixes applied
- resend default audience now excludes soft-deleted guests (`deleted: { $ne: true }`).
- per-guest consume + `_chargeInvites` are capacity-clamped (concurrent batches can't push the
  pool negative).

### Known limitations / runtime-QA checklist (needs a running stack)
- Resend / extra-reminder have NO server idempotency (intentional, repeatable) — the frontend
  debounces; verify a double-click doesn't double-send/charge.
- Test-message now returns 502 on a no-messageId soft-failure — verify the UI shows the failure.
- Manually verify end to end on web + mobile: checkout (per-event + stacked extras), create/
  update date gates (trial+paid), step-2 cap, scheduled-send windows, initial-send consumption,
  resend, extra reminder, confirmed-only normal reminder (trial send+10min), remaining-invites,
  cancel/delete + per-event re-creation rule, admin refund (full + partial-with-deduct).
