# 12 — Quota Enforcement

## Overview
When a host tries to create an event or add guests beyond their plan's limit, the system blocks them and shows an upgrade popup. Single-event plans: quota is per-event (maxGuests per event, maxEvents per month). Pool plans: quota is cumulative across events (invitesConsumed vs invitePool, compensationPool). Three checkpoints: (1) pre-form subscription validation (canCreateEvent check before showing form), (2) per-step quota display (GuestQuotaCounter shows current vs limit), (3) backend validation on event creation. Enforcement differs by plan type: pool plans consume from invitePool via consumeInvites; per-event plans check guestCount against maxInvitesPerEvent.

## Scope tags
- quota types: maxEventsPerMonth, maxInvitesPerEvent, invitePool, compensationPool
- plan type detection: per-event vs pool plan
- dynamic event counting: events in current billing period
- guest count validation: at form level and backend level
- addon quota: extra_invites increases host's quota for new events
- frozen event limits: event.guestLimit locked at creation, not updated by addons
- upgrade prompts: show when quota reached
- compensation invites: calculated as 15% of base quota, available in premium + business plans

## Roles involved
- HOST: subject to quota enforcement
- WHITELABEL_ADMIN: may have higher quota or different limits
- MODERATOR: cannot create events (not applicable)
- SUPER_ADMIN: may have unlimited or custom quota

## Entry points
- Mobile pre-form check: `halla-mobile/screens/CreateEventScreen.js:46–50` (canCreateEvent from useSubscriptionInfo hook)
- Mobile quota counter: `halla-mobile/components/createEvent/GuestQuotaCounter.js:9–227` (displays limit + progress + warning)
- Mobile StepTwo: `halla-mobile/components/createEvent/StepTwo.js` (uses GuestQuotaCounter)
- Backend subscription validation: `labbe-backend-/src/modules/subscriptions/subscriptions.service.js:41–88` (validateEventCreation method)
- Backend event creation: `labbe-backend-/src/modules/events/events.service.js:319–350` (capacity check + consumeInvites call)
- Backend middleware (legacy): `labbe-backend-/src/shared/middleware/subscription.js` (checkEventLimit, checkGuestLimit middlewares—verify if still active)
- Backend limits endpoint: `labbe-backend-/src/modules/subscriptions/subscriptions.routes.js:159, 176` (GET /limits, POST /validate-limits)
- Plan constants: `labbe-backend-/src/shared/constants/plans.js:89–91` (isPoolPlan, isPerEventPlan helpers)

## Exit / terminal states
- **allowed: true** — host can proceed to create event
- **allowed: false** with reason — event creation blocked; show upgrade popup
- **Event created** — quota consumed (either guest count logged or invitePool decremented)
- **Quota exhausted** — next event creation attempt blocked until addon purchase or billing period reset

## Touched modules (by repo)
### labbe-backend-
- `src/modules/subscriptions/subscriptions.service.js:41–88` (validateEventCreation: check event count + guest count, return allowed + reason + limits)
- `src/modules/subscriptions/subscriptions.service.js:91–106` (countEventsInBillingPeriod: query events in billing period for dynamic count)
- `src/modules/subscriptions/subscriptions.service.js:114–183` (_getPackageLimits: return limits object per plan type)
- `src/modules/subscriptions/subscriptions.service.js:450+` (validateLimits: validate action (create_event, add_guest, etc.) against limits—verify implementation)
- `models/SubscriptionModel.js` (static methods: getCapacityForEvent, consumeInvites, canAddGuests)
- `src/modules/events/events.service.js:319–350` (createEvent capacity check + consumeInvites call for pool plans)
- `src/shared/constants/plans.js:89–91` (isPoolPlan, isPerEventPlan)
- `src/shared/errors.js` (PackageLimitError exception)

### labbe-
- `app/host/` event creation form (pre-flight subscription check + quota display)
- Upgrade popup component (show when quota exceeded)

### halla-mobile-
- `screens/CreateEventScreen.js:46–50` (canCreateEvent pre-check)
- `components/createEvent/GuestQuotaCounter.js:9–227` (quota display + warning)
- `components/createEvent/StepTwo.js` (integrate GuestQuotaCounter, show upgrade prompt if limit reached)
- `hooks/useSubscriptionInfo.js` (fetch subscription with limits + canCreateEvent flag)
- `screens/PlansScreen.js` or upgrade modal (show when quota reached, offer addon/plan change)

## Dependencies on other flows
- **09 (Subscription Lifecycle)**: quota defined by subscription's plan
- **10 (Addon Purchase)**: addon increases quota for NEW events only
- **11 (Event Creation)**: quota enforcement gate before event creation

## Known divergences (web ↔ mobile, frontend ↔ backend)
- **Pre-form check**: mobile uses useSubscriptionInfo hook (server-side dynamic count); web may use different approach
- **Quota display**: mobile has GuestQuotaCounter; web may have different UI component
- **Upgrade popup**: unclear if web and mobile use same component or different
- **Compensation invites**: unclear if compensation pool is visible in frontend or hidden from user
- **Pool plan display**: mobile shows total quota; web may show pool-specific breakdown (invitePool + compensation)

## Open questions

**Q1: Compensation invites: visible to host or hidden?**

A: `_getPackageLimits()` returns `compensationInvites` as a named field in the limits object alongside `maxInvitesPerEvent` and `totalGuestLimit`. The backend exposes it separately; whether the frontend renders it as a distinct line (e.g., "50 base + 7 compensation") or folds it into a single displayed total is a frontend implementation choice.

Source: `labbe-backend-/src/modules/subscriptions/subscriptions.service.js:160-182`

**Q2: Does GuestQuotaCounter include addon invites?**

A:
**Current behavior:** `_getPackageLimits()` reads `addOnGuests` from `subscription.addOns?.extraGuests` (`subscriptions.service.js:153-155`) and adds it to the displayed `totalGuestLimit`. However, addon documents are never transitioned from `'pending'` to `'active'` because the payment webhook activation path does not exist (see flow 10 Q1). In production `addOns.extraGuests` is always `0`, so `GuestQuotaCounter` displays the base plan limit only and silently ignores any addon the host believes they purchased.

**Assessment:** BUG

**Why:** A host who purchases an addon expects to see their expanded quota in the counter. Because the addon activation pipeline is broken (flow 10 Q1), `addOnGuests` is always `0`. The counter is silently wrong, not a display bug — the root cause is the missing payment hook.

**Recommended change:** Fix the root cause first: implement the addon activation path (flow 10 Q1) so that `addOns.extraGuests` is populated when a payment succeeds. Until that fix lands, add a code comment in `_getPackageLimits()` near line 154 noting that `addOnGuests` will be `0` until the activation pipeline is implemented, to prevent future confusion with a display-layer bug.

Source: `labbe-backend-/src/modules/subscriptions/subscriptions.service.js:153-155`

**Q3: Billing period alignment: calendar month or rolling 30 days?**

A: Rolling from subscription activation date. `getBillingPeriodStart()` returns `activatedAt || createdAt` as the period start, with no calendar-month boundary or reset logic.

Source: `labbe-backend-/models/SubscriptionModel.js:306-308`

**Q4: Event count grace period on plan change?**

A: No reset. `changePlan()` carries forward `usage.eventsCreated` from the old subscription to the new one. There is no grace period or count reset on plan upgrade or downgrade.

Source: `labbe-backend-/src/modules/subscriptions/subscriptions.service.js:401-407`

**Q5: Pool consumption timing: on event creation or invitation send?**

A: On event creation. `Subscription.consumeInvites(capacitySub._id, guestCount)` is called inside `createEvent()` before the event document is persisted to the database.

Source: `labbe-backend-/src/modules/events/events.service.js:343`

**Q6: Compensation pool separate or merged?**

A: Tracked separately. `SubscriptionModel` has distinct fields `invitePool` and `compensationPool`. The virtual `invitesRemaining` combines both: `invitePool + compensationPool - invitesConsumed`. Pool plan consumption draws from the combined total.

Source: `labbe-backend-/models/SubscriptionModel.js:92-94,192-195`

**Q7: Upgrade during event creation: should form refresh limits?**

A: [PETER DECISION]

**The choice:** Refresh limits mid-session (poll or subscribe to subscription change events while the wizard is open) vs. re-validate limits only at final submission.

**Recommendation:** Re-validate at submission only. The backend re-validates quota regardless of what the frontend shows; a mid-session refresh adds polling complexity with minimal user benefit.

**Why:** A host upgrading in a separate tab while filling the event creation wizard is an edge case. The backend rejection at submission is a clear, actionable prompt for the host to retry with the new limits now reflected. Polling for subscription changes during wizard navigation introduces race conditions and unnecessary API calls. This is consistent with the existing backend-authoritative validation model.

**Trade-offs:** Hosts who upgrade their plan mid-session will see stale (lower) quota limits in `GuestQuotaCounter` until they submit or reload the form.

**Q8: Concurrent subscriptions quota: which subscription applies?**

A:
**Current behavior:** `validateLimits()` calls `Subscription.findActiveForUser(userId)` and takes `subscriptions[0]` — the first element of the returned array. MongoDB's default sort order is by `_id` (insertion order), so the oldest active subscription's quota is applied. If a host has both an old lower-tier and a new higher-tier subscription active simultaneously, the lower-tier limits apply and the upgrade is silently ignored.

**Assessment:** BUG

**Why:** A host who upgrades retains their lower-tier quota limits. This is the same root cause as flow 09 Q2. The system should apply the subscription that reflects the host's current entitlement — either the most recently created or the highest-tier one.

**Recommended change:** Sort `findActiveForUser` by `createdAt DESC` (newest first) or by `invitePool DESC` (highest tier first). Prevent subscription concurrency entirely by auto-cancelling the previous subscription on `changePlan` (already done for plan changes); add a uniqueness guard on direct `subscribe` calls so two active subscriptions cannot coexist for the same user.

Source: `labbe-backend-/src/modules/subscriptions/subscriptions.service.js:467-469`

**Q9: Frozen event limit rationale?**

A: Historical accuracy. The code comment at the freeze point reads: "Freeze guest limit from current subscription for this event." The intent is to preserve the quota context at event creation time so that retroactive plan changes, cancellations, or addon purchases do not alter the contractual guest capacity of an event already in progress.

Source: `labbe-backend-/src/modules/events/events.service.js:382`

**Q10: Addon invites per-event or subscription-wide for pool plans?**

A: [PETER DECISION]

**The choice:** Subscription-wide (addon increments `addOns.extraGuests` on the subscription and raises the effective quota for any future event) vs. per-event targeting (addon is associated with a specific event's `guestLimit`).

**Recommendation:** Subscription-wide. Pool plans are designed for cumulative cross-event tracking; per-event targeting would require a new data structure and a targeting mechanism that does not currently exist.

**Why:** `_getPackageLimits()` already reads `addOns.extraGuests` and adds it to the subscription-level guest limit returned to callers. This field is subscription-wide by design. Introducing per-event addon targeting to pool plans would require a new schema (e.g., `addOns.eventOverrides[]`), a targeting UI, and reconciliation with the `invitePool` consumption model — significant added complexity. Subscription-wide is already partially implemented and consistent with the existing design.

**Trade-offs:** A subscription-wide addon cannot be reserved for a single high-priority event; it raises the effective quota for the next event that needs it, regardless of which event the host intended it for.

## Unreachable or incomplete implementations
- `validateLimits` POST endpoint: verify if fully implemented for action-based validation (create_event, add_guest, etc.)
- `checkEventLimit`, `checkGuestLimit` middlewares: verify if still active in routes or superseded by service methods
- Compensation invite display: unclear if frontend shows compensation separately or rolls into "total guests"

---

## State machine

Quota enforcement is not a status machine for the event — it is a synchronous gate that runs at two trigger points. The state table below tracks the **subscription quota state** as it evolves through a quota-consuming action.

| State | Trigger | Guard | Next state |
|---|---|---|---|
| `quota_available` | Host opens create-event form | `canCreateEvent` pre-check passes (mobile: `CreateEventScreen.js:46`) | `form_open` |
| `quota_available` | Host opens create-event form | `canCreateEvent` fails — quota exhausted | `upgrade_prompt_shown` (terminal for this attempt) |
| `form_open` | Host enters guest count in Step 2 | `GuestQuotaCounter` renders warning at ≥ 80% consumed | `form_open` (counter in warning state) |
| `form_open` | Host submits Step 5 | Backend `validateLimits()` / `validateEventCreation()` called | `validation_running` |
| `validation_running` | `validateEventCreation` returns `allowed: true` | Event count + guest count within limits | `event_creating` |
| `validation_running` | `validateEventCreation` returns `allowed: false` | Quota exceeded | `upgrade_prompt_shown` |
| `event_creating` | Pool plan: `consumeInvites()` called at `events.service.js:343` | Before `Event.create()` — no rollback guard | `quota_debited` |
| `event_creating` | Per-event plan: guest count checked against `maxInvitesPerEvent` | Static check, no debit | `quota_checked` |
| `quota_debited` | `Event.create()` at `events.service.js:398` succeeds | Happy path | `event_created_quota_consumed` |
| `quota_debited` | `Event.create()` at `events.service.js:398` throws | BUG: debit already applied, no rollback | `quota_leaked` (event not created, quota still consumed) |
| `quota_checked` | `Event.create()` succeeds | Per-event plan completes | `event_created_quota_noted` |
| `upgrade_prompt_shown` | Host purchases addon or upgrades plan | Subscription updated | `quota_available` |

**Key divergence:** Pool-plan quota is debited before the event document is persisted (same violation as FLOW-11-F04). A failed `Event.create()` call leaves the subscription's `invitesConsumed` incremented with no event to show for it.

---

## Data handoffs

| Step | Source | Payload | Destination | Notes |
|---|---|---|---|---|
| Pre-form gate | Mobile `CreateEventScreen.js:46` | `canCreateEvent` flag from `useSubscriptionInfo` hook | Show form or upgrade prompt | Hook fetches `GET /subscriptions/limits`; flag computed server-side |
| Quota display | `GuestQuotaCounter.js:9–227` | `limits.totalGuestLimit`, `limits.invitesConsumed`, `limits.invitesRemaining` | Counter bar + warning text | `addOns.extraGuests` always 0 until addon activation pipeline fixed (Q2) |
| Backend gate (action=event) | `validateLimits(userId, 'event')` | `subscriptions[0]` from `findActiveForUser` | `validateEventCreation(subscription, ...)` | BUG: oldest subscription used, not newest (`subscriptions.service.js:469`) |
| Backend gate (action=guest) | `validateLimits(userId, 'guest', count)` | Guest count from request | `validateGuestLimit(subscription._id, count)` | Same oldest-subscription bug applies |
| Pool debit | `createEvent()` at `events.service.js:343` | `guestCount` | `Subscription.consumeInvites(capacitySub._id, guestCount)` | Called BEFORE `Event.create()` — no rollback if create fails |
| Limit freeze | `createEvent()` at `events.service.js:382` | `subscription.limits` snapshot | `event.guestLimit` field on new Event document | Intentional: preserves quota context at creation time |
| Middleware path | `checkEventLimit` at `events.routes.js:250` | `req.subscription` (set by `requireSubscription`) | Parallel check alongside service-layer validation | Double-validation path — both middleware and service layer check limits on POST /events |

---

## Role variations

| Role | Quota enforced? | Which limits apply | Notes |
|---|---|---|---|
| HOST | Yes | `subscription.limits` for their active subscription; pool or per-event depending on plan type | Default enforcement path |
| WHITELABEL_ADMIN | Yes | Same subscription limits as HOST; whitelabel context does not grant elevated quota | `requireSubscription` middleware checks same `findActiveForUser` |
| MODERATOR | N/A | Cannot create events | Role blocked upstream before quota check |
| ADMIN (platform) | Bypassed | None | `isPlatformAdmin = isAdminRole(role) && !whitelabelId` — skips `checkEventLimit` and `checkGuestLimit` (`subscription.js:100–103, 155–158`) |
| SUPER_ADMIN | Bypassed | None | Explicit bypass in `requireSubscription` at `subscription.js:33–35` |

**Note:** Whitelabel admins creating events on behalf of hosts do not bypass quota. The `onBehalfOf` field is hardcoded `false` in `createEvent()` (FLOW-11-F03), so quota is always deducted from the acting user's subscription even when an admin creates on behalf of a host.

---

## Web ↔ mobile parity

| Feature | Web (`labbe-`) | Mobile (`halla-mobile`) | Gap? |
|---|---|---|---|
| Pre-form quota gate | `canCreateEvent` check before rendering wizard — confirmed via `useEventForm` hook calling `/subscriptions/limits` | `CreateEventScreen.js:46–50` — `canCreateEvent` from `useSubscriptionInfo` hook | No gap — both check before showing form |
| Quota counter display | Web event creation form renders quota info (Step 2 equivalent); specific component TBD | `GuestQuotaCounter.js:9–227` — progress bar, warning at threshold, remaining count | Functionally equivalent; web component not yet confirmed as matching mobile's threshold warning behavior |
| Upgrade prompt on quota exhausted | Upgrade modal shown on `allowed: false` | `PlansScreen.js` or upgrade modal shown | Confirmed on both; specific modal component may differ |
| Addon invites in counter | `addOns.extraGuests` read by `_getPackageLimits` — always 0 due to broken activation | Same — `GuestQuotaCounter` reads same field via limits endpoint | No gap — both silently show base quota only; root cause is backend activation pipeline |
| Compensation invite display | Backend returns `compensationInvites` field; whether web renders it separately is unconfirmed | `GuestQuotaCounter` appears to fold compensation into `totalGuestLimit` display | Possible gap: backend distinguishes compensation, frontend may not surface it |

---

## Edge cases & failure modes

- **Concurrent event creation**: Two simultaneous POST /events calls from the same host can both pass the quota gate before either debits the pool. No database-level lock exists on `consumeInvites`. Result: host creates one more event than their plan allows, and `invitesConsumed` is incremented twice correctly but the event count exceeded the monthly limit.

- **Plan upgrade mid-wizard**: Host upgrades their plan in a second tab after passing the pre-form `canCreateEvent` check. `GuestQuotaCounter` continues showing old (lower) limits because the frontend cached the initial limits response. The backend re-validates at submission, so the host's expanded quota is applied at submission. Counter display is stale but submission succeeds with new limits.

- **Plan downgrade mid-wizard**: Host downgrades their plan after entering a guest count that now exceeds the lower plan's limit. The counter shows the old higher quota. Backend rejects at submission with `PackageLimitError`. User experience is poor — no mid-wizard warning.

- **`Event.create()` failure after pool debit**: For pool plans, `consumeInvites` is called at line 343, then `Event.create()` is called at line 398. If `Event.create()` throws (validation error, DB outage), the `invitesConsumed` increment is not rolled back. Host loses quota permanently for a non-existent event. Requires a manual admin correction or subscription reset.

- **Zero-guest event**: Host creates an event with an empty guest list. `consumeInvites(id, 0)` is called. Debit of 0 is a no-op for pool plans. Per-event plan event count still increments, consuming one of the host's monthly event slots.

---

## Findings

### FLOW-12-F01
- **ID**: FLOW-12-F01
- **Severity**: High
- **Type**: BUG
- **Location**: `labbe-backend-/src/modules/subscriptions/subscriptions.service.js:467–469`
- **Description**: `validateLimits()` selects `subscriptions[0]` from `Subscription.findActiveForUser()`. MongoDB returns documents in insertion order (`_id` ascending) by default, so the **oldest** active subscription is used. When a host upgrades their plan, the old lower-tier subscription is still returned first, and the higher quota from the new subscription is silently ignored. The host paid for an upgrade but is quota-enforced at their old plan's limits.
- **Recommendation**: Sort `findActiveForUser` by `createdAt: -1` (newest first). Independently, enforce subscription uniqueness on `changePlan` so two active subscriptions cannot coexist; this is the same root fix required by FLOW-09.

### FLOW-12-F02
- **ID**: FLOW-12-F02
- **Severity**: High
- **Type**: BUG
- **Location**: `labbe-backend-/src/modules/subscriptions/subscriptions.service.js:153–155`
- **Description**: `_getPackageLimits()` reads `subscription.addOns?.extraGuests || 0` and adds it to the displayed `totalGuestLimit`. However, `addOns.extraGuests` is always `0` in production because the addon payment webhook activation path does not exist (see flow 10 Q1). A host who purchases an extra-invites addon sees no change in their quota counter — the addon purchase has no effect on displayed or enforced limits until the activation pipeline is implemented. Peter's intent: addon purchase expands quota immediately after payment confirmation; code reality: field is populated only by the missing webhook handler.
- **Recommendation**: Implement the addon activation webhook path (flow 10 Q1) as the root fix. Add a code comment at line 154 noting that `addOnGuests` will always be `0` until the activation pipeline is live.

### FLOW-12-F03
- **ID**: FLOW-12-F03
- **Severity**: High
- **Type**: BUG
- **Location**: `labbe-backend-/src/modules/events/events.service.js:343` (same root as FLOW-11-F04)
- **Description**: For pool plans, `Subscription.consumeInvites(capacitySub._id, guestCount)` is called at line 343 before `Event.create()` at line 398. If event creation fails for any reason (Mongoose validation, duplicate key, DB write error), the subscription's `invitesConsumed` counter has already been incremented with no event document to account for the debit. The host permanently loses quota they were entitled to. Peter's intent: quota is consumed when the event is confirmed; code reality: quota is consumed speculatively before confirmation.
- **Recommendation**: Move `consumeInvites` to after `Event.create()` succeeds, or wrap both in a MongoDB transaction so a failed create rolls back the debit atomically.

### FLOW-12-F04
- **ID**: FLOW-12-F04
- **Severity**: Low
- **Type**: MISSING
- **Location**: `labbe-backend-/src/shared/middleware/subscription.js:99–174` and `labbe-backend-/src/modules/events/events.routes.js:250–251, 374, 636`
- **Description**: The legacy `checkEventLimit` and `checkGuestLimit` middleware functions are still active in `events.routes.js` (lines 250–251, 374, 636). These middleware run the same event-count and guest-count checks that `validateLimits()` / `validateEventCreation()` in the subscriptions service also perform. The middleware uses `req.subscription = subscriptions[0]` (same oldest-subscription bug), and the service layer also runs its own `findActiveForUser`. The double-validation path means every relevant route performs two quota checks, doubling DB reads and creating a latent inconsistency risk if one path is updated and the other is not.
- **Recommendation**: Audit which routes use the middleware path versus the service-layer path. Consolidate to the service-layer validation and remove the legacy middleware, or document clearly that middleware is the authoritative gate and remove the service-layer duplication.

---

## Cross-flow notes

- **Flow 09 (Subscription Lifecycle)**: FLOW-12-F01 (oldest-subscription bug) is the same root defect as the concurrent-subscription issue identified in flow 09. Fixing `findActiveForUser` sort order resolves both flows simultaneously.
- **Flow 10 (Addon Purchase)**: FLOW-12-F02 (addon quota always 0) is directly caused by the missing payment webhook in flow 10. Flow 12 cannot display correct addon-expanded quota until flow 10's activation pipeline is implemented.
- **Flow 11 (Event Creation)**: FLOW-12-F03 is the same pre-save debit bug as FLOW-11-F04. Both findings point to `events.service.js:343` vs `events.service.js:398`. A single transaction fix resolves both.
- **Flow 13 (Event Update)**: Guest additions via the update flow also call `checkGuestLimit` middleware (line 374 in routes). If the legacy middleware is removed (FLOW-12-F04), the update flow must ensure service-layer validation covers the add-guest action.
- **Flow 17 (Bulk Dispatch)**: Pool plan `invitesConsumed` tracks quota at event creation, not at dispatch. Retried sends (flow 15) do not re-debit quota, which is correct — the quota was consumed at creation time regardless of delivery success.
