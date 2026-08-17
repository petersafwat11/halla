# 09 — Subscription Lifecycle

## Overview
Host or whitelabel admin or platform admin (on behalf of someone) subscribes to a plan. Three entry points converge on the SAME backend path: host plans page → POST /subscriptions/subscribe; whitelabel plans page → same endpoint; admin assigns via admin endpoint (currently missing, requires POST /subscriptions/admin/:userId/subscribe). Flow: pick plan → validate limits → (payment placeholder hook) → create subscription → subscription active → host can create events. Also: change-plan (cancels current, creates new), cancel, and expiry cron (currently missing).

## Scope tags
- subscription create (first-time, plan change, admin-assign)
- subscription state transitions: trial → active → cancelled / expired
- billing cycle tracking (event, monthly, quarterly, annual)
- payment gateway integration (placeholder)
- usage counters (eventsCreated, guestsUsed, totalGuests)
- trial vs paid subscriptions
- concurrent subscriptions (allowed, no auto-cancel of old)

## Roles involved
- HOST: self-subscribe via web/mobile plans page
- WHITELABEL_ADMIN: subscribe organization on behalf of staff
- SUPER_ADMIN: assign plans to any user (on-behalf-of flow)
- MODERATOR: view own subscription only

## Entry points
- Host subscribe: `labbe/app/host/` plan selection → POST /subscriptions/subscribe
- Mobile host subscribe: `halla-mobile/screens/PlansScreen.js:54–72` (handleProceedToSummary → navigate PlansSummary)
- Mobile subscription summary: `halla-mobile/screens/PlansSummaryScreen.js` (payment UI + subscribe button)
- Backend routes: `labbe-backend-/src/modules/subscriptions/subscriptions.routes.js:57–126` (GET my-subscription, POST subscribe, POST change-plan, POST cancel)
- Backend controller: `labbe-backend-/src/modules/subscriptions/subscriptions.controller.js:19–60` (subscribe, changePlan, cancelSubscription)
- Backend service: `labbe-backend-/src/modules/subscriptions/subscriptions.service.js:256–450` (getMySubscription, subscribe, changePlan, cancelSubscription)
- Mobile subscription service: `halla-mobile/services/subscriptionService.js:51–95` (getMySubscription, subscribe, changePlan)
- Plan Model: `labbe-backend-/models/SubscriptionModel.js` (schema + static methods)

## Exit / terminal states
- **active**: subscription valid, host can create events
- **trial**: trial plan active, limited features/quota
- **cancelled**: explicitly cancelled by user or admin
- **changed**: previous subscription when user upgrades/downgrades (status=CANCELLED, cancelReason="Changed to X")
- **expired** (unreachable): implementation missing—cron needed
- **past_due**, **pending**, **suspended**, **completed**: unreachable (dead code—flag in audit)

## Touched modules (by repo)
### labbe-backend-
- `src/modules/subscriptions/subscriptions.routes.js:82` (POST /subscribe)
- `src/modules/subscriptions/subscriptions.controller.js:33–38` (subscribe handler)
- `src/modules/subscriptions/subscriptions.service.js:288–363` (subscribe method: plan validation, trial check, setup fee, concurrent allowed, create subscription, apply discount, notify)
- `src/modules/subscriptions/subscriptions.service.js:371–422` (changePlan: find current, create new, carry forward usage)
- `src/modules/subscriptions/subscriptions.service.js:430–450` (cancelSubscription: mark cancelled, notify)
- `models/SubscriptionModel.js` (createForUser, findActiveForUser, getSummary)
- `models/PlanModel.js` (getOrCreateByCode, populate limits)
- `models/BusinessSetupFeeModel.js` (check if business event plan setup fee paid)
- `models/UserModel.js` (update subscription ref)
- `src/shared/constants/index.js` (SUBSCRIPTION_STATUS)

### labbe-
- `app/host/` (find plans page component + proceed to checkout flow)
- Checkout/payment UI (placeholder for payment provider)
- Subscription confirmation page

### halla-mobile-
- `screens/PlansScreen.js:21–72` (plan selection, handleProceedToSummary)
- `screens/PlansSummaryScreen.js` (plan details, pricing, payment form, subscribe button)
- `services/subscriptionService.js:75–95` (subscribe method)
- `hooks/` (useSubscription, useCreateSubscription hooks)

## Dependencies on other flows
- **08 (Plans Admin CRUD)**: plans must exist and be active before subscription
- **12 (Quota Enforcement)**: after subscription, host's event creation is gated by plan limits

## Known divergences (web ↔ mobile, frontend ↔ backend)
- **Mobile entry point**: mobile has PlansSummaryScreen before subscribe; web likely has inline subscribe in plans page
- **Payment handling**: web and mobile may use different payment providers or both use placeholder
- **Trial auto-assign**: unclear if new hosts auto-get trial or must explicitly subscribe (not by peter : auto assign in signup) 
- **Admin assign endpoint**: missing—POST /subscriptions/admin/:userId/subscribe not implemented
- **Change plan behavior**: does old subscription end immediately or at billing period end?

## Open questions

**Q1: Payment provider: which payment gateway? When is payment actually charged?**

A: **Decided.** Payment provider is **Moyasar**. Implement a `paymentProvider.charge()` stub that: (1) checks for `MOYASAR_API_KEY` / `MOYASAR_SECRET_KEY` in the environment, (2) returns `{ success: true, transactionId: 'stub' }` when keys are absent (staging / pre-key environments), and (3) calls the Moyasar Charges API when keys are present. This isolates the payment concern from subscription creation and lets the system run without live keys. Full Moyasar integration is its own implementation ticket.

**Q2: Concurrent subscriptions: if allowed, which one is "active" for quota enforcement?**

A:
**Current behavior:** Multiple active subscriptions are explicitly allowed — `subscribe()` contains the comment "Concurrent subscriptions are allowed — do NOT cancel existing" at line 323. Quota enforcement in `validateLimits()` uses `subscriptions[0]` (the first element returned by `findActiveForUser`), which is the oldest active subscription by default insertion order.

**Assessment:** BUG

**Why:** A host who upgrades to a higher-tier plan retains the lower-tier quota because the oldest subscription wins. Quota enforcement silently uses the worst plan instead of the best active plan.

**Recommended change:** Sort `findActiveForUser` by highest `invitePool` or by `createdAt DESC` so the most recently created subscription (likely the upgrade) takes precedence. Alternatively, disallow concurrent subscriptions by auto-cancelling the prior one on `subscribe()` — `changePlan()` already does this; parallel `subscribe()` calls are the only remaining path to concurrency and should be blocked.

Source: `labbe-backend-/src/modules/subscriptions/subscriptions.service.js:323` (concurrent comment), `labbe-backend-/src/modules/subscriptions/subscriptions.service.js:467-469` (subscriptions[0] in validateLimits)

**Q3: Trial to paid: when trial expires, can host continue with no plan?**

A: **Decided.** The trial plan is **not time-limited**. It is a permanent per-event plan assigned to hosts on signup with a max of 15 invites per event and no `endDate`. Hosts can use it indefinitely — there is no expiry to enforce. The expiry cron (`scheduleSubscriptionExpiryCheck`) does not apply to trial plans. No block-on-expiry logic is needed for this plan type.
**Q4: Billing period start: when does the period start?**

A: Rolling from the subscription activation date. `getBillingPeriodStart()` returns `this.activatedAt || this.createdAt`. There is no calendar-month alignment.

Source: `labbe-backend-/models/SubscriptionModel.js:306-308`

**Q5: Expiry cron: how often? What action on expire?**

A:
**Current behavior:** Runs daily at 6:00 AM (`scheduleSubscriptionExpiryCheck`). Sends push notifications (and email at 3 and 1 days) at 7, 3, and 1 days before `endDate`. Does NOT transition subscription status to `expired` and does NOT block event creation after `endDate` passes.

**Assessment:** WEAK

**Why:** The cron's only job is notifications. Without a status transition, the `expired` state defined in `SubscriptionModel` is unreachable in practice. Hosts can create events on plans that have technically ended indefinitely.

**Recommended change:** Add a second pass in the same cron (or a separate daily job) that sets `status = 'expired'` for any subscription where `endDate < now && status != 'expired'`. This is the minimum fix; the broader grace-period and auto-renew decisions belong to Q3.

(peter note : agreed)
Source: `labbe-backend-/src/shared/utils/scheduledTasks.js:314-376`

**Q6: Admin assign endpoint: is it the same as subscribe or different?**

A: [PETER DECISION]

**The choice:** Build a dedicated `POST /subscriptions/admin/:userId/subscribe` endpoint vs. reuse the existing `subscribe()` service method with an admin context flag passed by the caller.

**Recommendation:** Reuse the service with a context parameter. Add `POST /subscriptions/admin/:userId/subscribe` that calls `subscribe(userId, planCode, { assignedByAdmin: true })`. No payment check is required for admin-assigned plans; the assignment must emit an audit event.

**Why:** Gate 1 #10 — the audit log will be turned on. Admin assignments must be distinguishable from self-subscribes in the audit trail. A context flag is the minimal change that achieves this without duplicating subscription creation logic.

**Trade-offs:** The service must branch on `assignedByAdmin`, adding minor complexity; the endpoint does not exist yet and must be implemented from scratch.
(peter note : agreed)

**Q7: Setup fee: one-time per org or per subscription?**

A: One-time per organization. The gate checks `BusinessSetupFee.findOne({ organizationId: userId, status: 'paid' })` — any single paid record for that user clears the requirement for all future business event plan subscriptions by the same user.

Source: `labbe-backend-/src/modules/subscriptions/subscriptions.service.js:318-321`

**Q8: Usage carry-forward: should eventsCreated counter reset or carry forward on plan change?**

A:
**Current behavior:** `changePlan()` explicitly copies `eventsCreated`, `guestsUsed`, and `totalGuests` from the old subscription to the new one at lines 403–406.

**Assessment:** CORRECT

**Why:** Carrying usage forward prevents gaming the quota limits via rapid downgrade/upgrade cycles within a billing period.

**Recommended change:** None, current behavior is correct.

Source: `labbe-backend-/src/modules/subscriptions/subscriptions.service.js:401-407`

## Unreachable states (flag as dead code)
- `past_due`: never set—investigate if Stripe integration planned
- `pending`: never set—unclear what this means
- `suspended`: never set—unclear trigger
- `completed`: never set—unclear if for single-event plans only

---

## State machine

```
Subscription entity:
  (none)   → subscribe()           → active
  (none)   → subscribe(trial)      → trial
  active   → changePlan()          → cancelled (old) + active (new)
  trial    → changePlan()          → cancelled (old) + active (new)
  active   → cancelSubscription()  → cancelled
  trial    → cancelSubscription()  → cancelled
  active   → endDate < now + cron  → expired  ← MISSING: cron does not set this status
  cancelled / expired              → (terminal)
```

Unreachable: `past_due`, `pending`, `suspended`, `completed` — defined in enum, never set.

---

## Data handoffs

| Step | Producer | Consumer | Payload | Validation? |
|------|----------|----------|---------|-------------|
| Host selects plan | Mobile PlansScreen / Web plans page | `POST /subscriptions/subscribe` | `{ planCode, discountCode? }` | planCode validated against Plan collection |
| subscribe() | subscriptions.service.js | MongoDB Subscription | planId, userId, status, quota fields | Mongoose schema validation |
| subscribe() | subscriptions.service.js | MongoDB User | `subscription: subscriptionId` ref update | None |
| subscribe() payment | subscriptions.service.js | **NOTHING** | No Moyasar call exists | Gate-1 #3 violation |
| Subscription created | Backend | Mobile / Web | Subscription doc with populated planId | No |
| changePlan() | subscriptions.service.js | MongoDB | Old sub → CANCELLED, new sub created | Usage carry-forward at lines 401-407 |
| expiry cron | scheduledTasks.js | **Notifications only** | Push/email at 7/3/1 days before endDate | Does NOT set status=expired |

---

## Role variations

| Role | CAN | CANNOT | Notes |
|------|-----|--------|-------|
| HOST | Subscribe, change plan, cancel own subscription | Subscribe on behalf of another user | Trial can only be used once |
| WHITELABEL_ADMIN | Subscribe organization to whitelabel plans | Subscribe to host-only plans | `availableFor` enforced at line 299-303 |
| SUPER_ADMIN | View any subscription | Subscribe on behalf of user via API | Admin-assign endpoint missing (POST /subscriptions/admin/:userId/subscribe) |
| MODERATOR | View own subscription | Subscribe or modify | Read-only |

---

## Web ↔ mobile parity

| Feature | Web | Mobile | Gap? |
|---------|-----|--------|------|
| Plan selection UI | Unknown (labbe/app/host/) | Yes — PlansScreen.js | Partial — web not confirmed |
| Subscription summary before pay | Unknown | Yes — PlansSummaryScreen.js | Partial |
| Subscribe call (POST /subscribe) | Unknown | Yes — subscriptionService.js:75 | Partial |
| Change plan | Unknown | Yes — subscriptionService.js:changePlan | Partial |
| Cancel subscription | Unknown | Unknown | Unknown |
| Admin-assign plan | No | No | No gap — both missing |

---

## Edge cases & failure modes

- **Concurrent subscription quota bug:** If a host subscribes twice without using changePlan (e.g., two concurrent tabs), `findActiveForUser` returns both sorted `createdAt: 1`. `validateLimits` at line 469 always picks the oldest (lower-tier) subscription, silently enforcing the wrong quota even if a higher plan was purchased afterward.
- **Payment silently skipped:** `subscribe()` creates the subscription and returns without charging the host. There is no Moyasar stub or payment check. A host can subscribe to any paid plan for free until payment is wired.
- **Admin-assign endpoint missing:** SUPER_ADMIN has no way to assign a plan to a specific user via API. No `POST /subscriptions/admin/:userId/subscribe` route exists.
- **Expiry cron does not expire:** `scheduleSubscriptionExpiryCheck` only sends notifications; it never sets `status = 'expired'`. Hosts on monthly/annual plans continue creating events indefinitely after their end date.
- **Trial re-subscribe check uses $ne CANCELLED:** If a host cancels their trial and tries to re-subscribe to trial, the check at line 308-314 looks for a subscription with status != CANCELLED. A cancelled trial still has a record, so this correctly blocks re-trial. But the check also fires for `expired` subscriptions — correctly blocks there too.

---

## Findings

### FLOW-09-F01 — subscribe() creates subscription without any payment check
- **Severity**: Critical
- **Type**: CONFLICT
- **Location**: `labbe-backend-/src/modules/subscriptions/subscriptions.service.js:325`
- **Description**: `subscribe()` creates a Subscription document and returns immediately. No payment provider call, no Moyasar stub, no charge attempt. A host receives an active subscription without paying.
- **Why it matters**: Gate-1 Decision #3 requires a Moyasar stub that returns `{ success: true, transactionId: 'stub' }` when keys are absent. The current code skips payment entirely, meaning every subscription in staging and production is fraudulent until this is wired.
- **Recommended change**: Before creating the subscription, invoke the payment provider with the plan's `pricing.oneTime` amount. Gate the subscription creation on a successful payment response. When Moyasar keys are absent, the stub must return a synthetic success rather than being skipped.
- **Related**: FLOW-10-F01

### FLOW-09-F02 — findActiveForUser sorts oldest-first; validateLimits always uses the worst plan
- **Severity**: High
- **Type**: BUG
- **Location**: `labbe-backend-/models/SubscriptionModel.js:534`
- **Description**: `findActiveForUser` sorts by `{ createdAt: 1 }` (ascending). `validateLimits` at `subscriptions.service.js:469` uses `subscriptions[0]`, which is the oldest active subscription. A host who upgrades keeps the lower-tier quota because the older subscription sorts first.
- **Why it matters**: A paying host who upgrades to a higher-tier plan receives no benefit — their quota enforcement silently uses the old plan's limits. This is a direct billing/product betrayal.
- **Recommended change**: Sort active subscriptions by highest quota (or by `createdAt DESC` so the newest subscription is always applied). Alternatively, when a host subscribes to a new plan, auto-cancel the previous one — `changePlan()` already does this; direct `subscribe()` should follow the same behavior.
- **Related**: FLOW-12-F01

### ~~FLOW-09-F03~~ — ✅ RESOLVED — Expiry cron now transitions subscription to expired status
- **Severity**: ~~High~~ → Resolved
- **Type**: ~~MISSING~~ → Fixed
- **Location**: `labbe-backend-/src/shared/utils/scheduledTasks.js:534`
- **Resolution**: `scheduleSubscriptionStatusUpdate` runs daily at 1:00 AM and calls `Subscription.updateMany({ status: { $in: ["active", "trial"] }, endDate: { $lt: new Date() }, billingCycle: { $ne: BILLING_CYCLES.ONCE } }, { $set: { status: "expired" } })`. It is registered in `initScheduledTasks` at line 565 alongside `scheduleSubscriptionExpiryCheck` (the notification cron at line 564). The `expired` state is now reachable. No further action required for this finding.

### FLOW-09-F04 — Admin-assign plan endpoint is missing
- **Severity**: Medium
- **Type**: MISSING
- **Location**: `labbe-backend-/src/modules/subscriptions/subscriptions.routes.js:57`
- **Description**: No `POST /subscriptions/admin/:userId/subscribe` route exists. SUPER_ADMIN cannot assign a plan to a user on their behalf via API.
- **Why it matters**: Onboarding high-value customers or fixing subscription issues requires direct DB intervention. Gate-1 Decision #10 requires admin actions to emit audit events — a missing endpoint means this action is never audited.
- **Recommended change**: Add a SUPER_ADMIN-only endpoint that subscribes a target user to a specified plan, skips the payment check (admin-assigned plans are free or billed externally), and emits an audit event recording the admin's identity and the assigned plan.
- **Related**: FLOW-08-F03

---

## Cross-flow notes

- **Flow 08**: Plan limits are read live from the Plan document via populated `planId`. A live plan update (FLOW-08-F02) immediately changes the quota returned in this flow.
- **Flow 10**: Addon purchase creates a pending Addon doc but never activates it — host's effective quota never increases from addon purchase until FLOW-10-F01 is fixed.
- **Flow 12**: `validateLimits` is the enforcement point for subscription quota. All bugs here cascade to every event creation and guest addition.
- **Flow 14/15**: Event creation is gated on `validateLimits` passing. If subscription is expired but status was never set (FLOW-09-F03), the gate is absent.
