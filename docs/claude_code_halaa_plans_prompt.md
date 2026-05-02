# Claude Code — Plan Mode Prompt
## Halaa Subscription Plans — Full Migration

---

## CONTEXT & STARTING POINT

This project has **three codebases** that all need to change:
- `labbe-backend-/` — NestJS/Node.js API
- `labbe/` — Next.js web app (host dashboard + admin dashboard + whitelabel signup)
- `halla-mobile/` — React Native / Expo mobile app

There was a **previous migration plan** in the codebase that partially renamed fields
(e.g. `maxGuestsPerEvent → maxInvitesPerEvent`, `direct/managed` plan types). You may
encounter those partial changes. **Treat that previous plan as a reference for which
files touch plans/subscriptions logic — but the plan types, names, and billing model
described below are the final authoritative spec. Anywhere the previous plan conflicts
with this spec, this spec wins.**

> **Fresh DB assumption:** No backward-compat for old subscription records. Seed script
> will drop-and-reseed. Legacy aliases are not needed.

---

## THE NEW PRICING MODEL (source of truth)

### Compensation percentage: **15%** across all plans (floor, so 25 invites → 3 free).

---

### TIER 1 — HOST PLANS (availableFor: host)

Two plan families, each available as **per-event** or **monthly**:

#### 🟢 Halaa Basic (`basic`) — DIY, user self-manages
| Billing | Invite Options | Prices (SAR) | Notes |
|---------|---------------|-------------|-------|
| Per Event (`basic_event`) | 25 / 50 / 75 / 100 / 150 / 200 / 250 / 300 | 95 / 185 / 270 / 350 / 525 / 700 / 875 / 1050 | Valid 3 months from purchase |
| Monthly (`basic_monthly`) | 100 / 150 / 200 / 250 / 300 | 450 / 675 / 900 / 1125 / 1350 | Invite pool, unlimited events per month |

#### 🔵 Halaa Premium (`premium`) — Done-for-you, Halaa team manages
| Billing | Invite Options | Prices (SAR) |
|---------|---------------|-------------|
| Per Event (`premium_event`) | 25 / 50 / 75 / 100 / 150 / 200 / 250 / 300 | 120 / 235 / 345 / 450 / 675 / 900 / 1125 / 1350 |
| Monthly (`premium_monthly`) | 100 / 150 / 200 / 250 / 300 | 540 / 810 / 1080 / 1350 / 1620 |

---

### TIER 2 — BUSINESS PLANS (availableFor: whitelabel)

Single family `business` — Halaa team always manages. Three billing modes:

#### Per Event (`business_event`) — requires 1200 SAR one-time setup fee (separate purchase, not bundled)
| Invite Options | Prices (SAR) |
|---------------|-------------|
| 100 / 150 / 200 / 300 / 400 / 500 | 370 / 540 / 700 / 1050 / 1400 / 1750 |
- Includes 1 WhatsApp template
- 15% compensation on chosen invite count

#### Quarterly (`business_quarterly`) — 3500 SAR flat (setup included)
- 500 invite pool (shared across all events during 3 months)
- 15% compensation pool = 75 extra invites
- 3 WhatsApp templates
- Duration: 3 months from activation

#### Annual (`business_annual`) — 10,000 SAR flat (setup included)
- 2000 invite pool (shared across all events during 12 months)
- 15% compensation pool = 300 extra invites
- 5 WhatsApp templates
- Duration: 12 months from activation

---

### PLAN CODES (snake_case, used as DB `code` field)

```
trial
basic_event_25 / basic_event_50 / basic_event_75 / basic_event_100 / basic_event_150 / basic_event_200 / basic_event_250 / basic_event_300
basic_monthly_100 / basic_monthly_150 / basic_monthly_200 / basic_monthly_250 / basic_monthly_300
premium_event_25 / premium_event_50 / premium_event_75 / premium_event_100 / premium_event_150 / premium_event_200 / premium_event_250 / premium_event_300
premium_monthly_100 / premium_monthly_150 / premium_monthly_200 / premium_monthly_250 / premium_monthly_300
business_event_100 / business_event_150 / business_event_200 / business_event_300 / business_event_400 / business_event_500
business_quarterly
business_annual
business_setup_fee (special one-time product, not a real subscription plan)
unlimited
```

---

### ADD-ONS

Add-ons attach to a **subscription** (not just an event). For per-event plans,
the add-on is scoped to that one event. For pool plans (monthly/quarterly/annual),
add-on invites are added to the pool and consumed across events during the plan period.

| Type | Tiers | Notes |
|------|-------|-------|
| `extra_invites` | +10→40 SAR / +20→75 / +30→105 / +40→130 / +50→150 | Stacks; for per-event scoped to that event |
| `extra_reminders` | +1→25 / +2→45 / +3→60 / +4→70 / +5→75 SAR | Extra reminder sends |
| `design_template` | ready_made 200 / custom_male 200 / custom_themed 275 / animated 350 / 3d 500 | Per-event only |
| `business_customization` | 2500 SAR flat | Custom webpage + 4 WhatsApp templates + 1-week delivery |

---

## BEHAVIORAL RULES (critical — encode these in the data model)

### Per-Event plans (`basic_event_*`, `premium_event_*`, `business_event_*`)
- One subscription = one event. `maxEvents: 1`.
- `invitesConsumed` tracks how many invites have been sent for this event.
- Plan expires 3 months after purchase if unused, or when the event concludes.
- Add-on invites are scoped to this subscription (this event only).
- Compensation invites = `floor(planInvites * 0.15)`, credited at subscription activation.

### Monthly pool plans (`basic_monthly_*`, `premium_monthly_*`)
- Subscription has `invitePool` = purchased invite count + 15% compensation.
- Unlimited events; each event deducts from `invitePool`.
- Minimum guests per event = 1.
- Add-on invites add to the pool for the duration of the plan month.
- Subscription expires 30 days after activation (auto-renewal not in scope yet).
- `eventsRemaining = -1` (unlimited).

### Business quarterly / annual (`business_quarterly`, `business_annual`)
- Same pool logic as monthly but duration is 90 or 365 days.
- `invitePool` = 500 (quarterly) or 2000 (annual) + 15% compensation already included.
- Add-on invites add to pool.
- Business setup fee (1200 SAR) applies to `business_event_*` only and is tracked as a separate `BusinessSetupFee` record (or a flag on the whitelabel organization). Once paid it's valid forever (they don't pay it again per event).
- Unlimited events from pool; each event deducts from pool.

### Upgrade / Downgrade / Additional packages
- A host or business can own multiple **concurrent** subscriptions (e.g., buy another per-event while a monthly is active).
- For per-event plans: can buy a new plan at any time to prepare for a future event.
- For pool plans: buying a new same-tier monthly before expiry **adds** to the pool and extends the expiry date by one billing period.
- An entity should never be blocked from purchasing a new plan just because they have an existing one.
- `canCreateEvent()` must check: is there any active subscription with remaining capacity? (any per-event unused OR any pool with remaining invites.)
- When creating an event, the system should pick the subscription to deduct from — use the **most constrained** active subscription first (per-event before pool, oldest expiry first).

---

## WHAT YOU NEED TO PLAN AND IMPLEMENT

Go into plan mode. Read the relevant files in each codebase first, then produce a
complete, ordered plan covering every change needed. Then execute it.

### BACKEND — `labbe-backend-/`

**Constants layer** (`src/shared/constants/`)

- `plans.js` — Full replacement. New `PLAN_TYPES`:
  ```
  TRIAL, BASIC_EVENT, BASIC_MONTHLY, PREMIUM_EVENT, PREMIUM_MONTHLY,
  BUSINESS_EVENT, BUSINESS_QUARTERLY, BUSINESS_ANNUAL, UNLIMITED
  ```
  New `PLAN_CODES` covering all codes listed above.
  New `BILLING_TYPES`: `event`, `monthly`, `quarterly`, `annual`.
  New `PLAN_FAMILIES`: `basic`, `premium`, `business`.
  Helper `isPoolPlan(planType)` → true for monthly/quarterly/annual types.
  Helper `isPerEventPlan(planType)` → true for event types.
  Helper `isManagedPlan(planType)` → true for premium_* and business_*.
  Keep `FEATURE_LABELS`, `buildFeaturesArray`, `isUnlimited`.

- `addons.js` — New file. Tiers exactly as listed in Add-Ons table above.

- `planDefaults.js` — Full replacement. Build every plan entry using factory
  helpers. Compensation = 15% (`compensationPercentage: 15`). Include:
  - `trial` (0 SAR, 5 invites, per-event)
  - All 8 basic_event entries
  - All 5 basic_monthly entries
  - All 8 premium_event entries
  - All 5 premium_monthly entries
  - All 6 business_event entries
  - `business_quarterly` (flat, no invites in limits — pool is tracked at subscription level)
  - `business_annual` (flat, no invites in limits — pool is tracked at subscription level)
  - `unlimited` (admin)

  Monthly/quarterly/annual plans use `billingType: 'monthly'/'quarterly'/'annual'`
  and `limits.invitePool` instead of `maxInvitesPerEvent`.

- `index.js` — Export addons constants.

**Models**

- `PlanModel.js`:
  - Add `billingType` field: enum `['event', 'monthly', 'quarterly', 'annual']`.
  - Add `planFamily` field: enum `['basic', 'premium', 'business', 'trial', 'unlimited']`.
  - Update `planType` enum to new values.
  - Replace `limits.maxGuestsPerEvent / maxInvitesPerEvent` with flexible limits:
    - `limits.maxInvitesPerEvent` (for per-event plans, null for pool plans)
    - `limits.invitePool` (for pool plans, null for per-event)
    - `limits.maxEvents` (1 for per-event, -1 for pool plans)
    - `limits.durationDays` (90 for basic event = 3 months validity, 30 for monthly, 90 for quarterly, 365 for annual)
  - Virtual `isPerEventPlan` using `isPerEventPlan()` helper.
  - Virtual `isPoolPlan` using `isPoolPlan()` helper.
  - Virtual `isManagedPlan` using `isManagedPlan()` helper.
  - Update `isSingleEvent` to call `isPerEventPlan()` for backward-compat.

- `SubscriptionModel.js` — Major rework:
  - Add `invitePool` field (Number, default null — only populated for pool plans at activation).
  - Add `invitesConsumed` field (Number, default 0 — total invites consumed from pool/event).
  - Add `compensationPool` field (Number, default 0 — pre-calculated at activation).
  - Add `expiresAt` field (Date — calculated at activation based on plan durationDays).
  - Add `planFamily` field (String — denormalized for fast queries).
  - Add `billingType` field (String — denormalized).
  - Keep `eventId` for per-event subscriptions.
  - Remove `serviceMode` field (managed-ness is now purely from planType).
  - Update `isActive` virtual to also check `expiresAt > now`.
  - Virtual `isManaged` → `isManagedPlan(this.planId?.planType)`.
  - Virtual `isPerEvent` → `isPerEventPlan(this.planId?.planType)`.
  - Virtual `isPool` → `isPoolPlan(this.planId?.planType)`.
  - Virtual `maxInvites` → for per-event: `planId.limits.maxInvitesPerEvent`; for pool: `invitePool`.
  - Virtual `invitesRemaining` → `maxInvites - invitesConsumed` (or -1 if unlimited).
  - Method `canCreateEvent()` — check per-event: not already linked to an event + not expired; pool: invitesRemaining > 0 + not expired.
  - Method `canSendInvites(count)` — check `invitesRemaining >= count`.
  - Method `consumeInvites(count, eventId)` — atomic `$inc` on `invitesConsumed`; for per-event also sets `eventId`.
  - Method `releaseInvites(count)` — for RSVP declines / cancelled invites; decrements `invitesConsumed`.
  - Method `onActivate()` — calculate and set `invitePool`, `compensationPool`, `expiresAt` based on plan.

- `AddonModel.js` — New file (as per previous plan) with proper scoping:
  - `scope: 'event' | 'pool'` — event-scoped add-ons only usable for that eventId, pool add-ons add to subscription pool.
  - Extra invites for per-event plans → `scope: 'event'`.
  - Extra invites for pool plans → `scope: 'pool'`, add to subscription's `invitePool`.

- `BusinessSetupFeeModel.js` — New file. Tracks whether a whitelabel org has paid the 1200 SAR setup fee.
  - Fields: `organizationId`, `paidAt`, `amount: 1200`, `currency: 'SAR'`, `status: 'pending'|'paid'`.
  - Once `status: 'paid'`, org can subscribe to `business_event_*` plans without paying again.

**Services**

- `plans.service.js`:
  - `getHostPlans()` → returns `{ basic: { event: [...], monthly: [...] }, premium: { event: [...], monthly: [...] } }`.
  - `getBusinessPlans()` → returns `{ event: [...], quarterly: [one item], annual: [one item], setupFeeRequired: true, setupFeeAmount: 1200 }`.
  - `_formatPlan(plan)` — include `billingType`, `planFamily`, `invitePool` (for pool plans), `maxInvitesPerEvent` (for event plans), `compensationPercentage: 15`.

- `subscriptions.service.js`:
  - `subscribe(userId, planId, data)` — on creation, call `subscription.onActivate()` to set pool/expiry.
  - `getActiveSubscriptions(userId)` — return all non-expired active subscriptions.
  - `getCapacityForEvent(userId)` — find the best subscription to use for a new event (per-event unused → pool with invites → error).
  - `purchaseAddon(userId, addonData)` — for extra_invites on pool plan, increment subscription's `invitePool` directly. For per-event, create a scoped addon record. Validate plan supports the addon type.
  - `upgradeOrRenew(userId, subscriptionId, newPlanCode)` — handle pool extensions (extend expiry + add pool).
  - Remove all `serviceMode` logic. Remove `maxGuestsPerEvent`.

- `events.service.js`:
  - Replace `subscription.limits.maxGuestsPerEvent` / `maxInvitesPerEvent` with `subscription.invitesRemaining` virtual.
  - On event creation: call `subscriptions.service.getCapacityForEvent(userId)` to auto-select subscription. Bind the subscription to the event.
  - On invite send: call `subscription.consumeInvites(count, eventId)`.
  - On RSVP decline (if re-invite is needed): call `subscription.releaseInvites(count)` — this is optional/configurable.

- `businessSetupFee.service.js` — New service to manage setup fee payment status.

**Routes/Controllers**

- `addons.controller.js` + `addons.routes.js` + registration in `server.js` (as per previous plan, but updated for pool logic).
- `businessSetupFee.controller.js` + `businessSetupFee.routes.js` — endpoints: `GET /api/v2/business/setup-fee-status`, `POST /api/v2/business/setup-fee/initiate`.
- Update `plans.routes.js`: `GET /api/v2/plans/host`, `GET /api/v2/plans/business`.

**Seed Script** (`scripts/seedPlans.js`)
- Full replacement. Drop all plans. Seed all plans from `PLAN_DEFAULTS`.
- Print a clear table: total count by planFamily + billingType.
- Expected: 1 trial + 8 basic_event + 5 basic_monthly + 8 premium_event + 5 premium_monthly + 6 business_event + 1 business_quarterly + 1 business_annual + 1 unlimited = **36 plans**.

---

### FRONTEND WEB — `labbe/`

**Localization** (`localization/locales/en/plans.json` + `ar/plans.json`)
- Full replacement aligned to new plan families and billing types.
- Keys: `planFamilies.basic`, `planFamilies.premium`, `planFamilies.business`.
- Keys: `billingTypes.event`, `billingTypes.monthly`, `billingTypes.quarterly`, `billingTypes.annual`.
- Plan descriptions for all 3 families.
- Pool-specific labels: `invitePool`, `poolRemaining`, `unlimitedEvents`.
- Business-specific: `setupFeeRequired`, `setupFeeAmount`, `setupFeePaid`.
- Addon labels updated.

**Host Plans Page** (`app/[lang]/host/plans/`)

Full redesign of `PlansPage.js` and its `_components/`:

- **Family selector** — two tabs: Halaa Basic / Halaa Premium (replaces the old Direct/Managed tabs).
- **Billing type toggle** — "Per Event" vs "Monthly" pill toggle (shown below family selector).
- **Invite selector** — for per-event: show 25–300 options; for monthly: show 100–300 options.
- **Price display** — show the price for selected billing type + invite count.
- **Pool indicator** — for monthly plans, show "Invite Pool: X invites / month, unlimited events".
- **Per-event indicator** — "1 event, valid 3 months".
- **Features list** — shared for both families but Premium shows "Managed by Halaa team" badge.
- **Compensation display** — `floor(invites * 0.15)` free invites (15%).
- **AddonsSection** — same as previous plan (extra invites, extra reminders, design template). Note in UI: for pool plans, extra invites extend your monthly pool.
- **CheckoutButton** → goes to Summary.

`Summary.js` (targeted edits):
- Remove managed fee row (managed is a plan family, not a fee on top).
- Add billing type label: "Per Event" or "Monthly Subscription".
- Show pool size for monthly plans.
- Show compensation invites (15%).
- Show add-on line items.
- Total = plan price + addons - discount.

**Admin Dashboard** (`app/[lang]/admin-dash/`)

- `manage-plans/_components/ManagePlansContent.jsx`:
  - Filter tabs: `all | basic_event | basic_monthly | premium_event | premium_monthly | business_event | business_quarterly | business_annual | trial | unlimited`.
  - Plan card shows: `billingType` badge, `planFamily` badge, invite pool or max invites, price.

- `manage-plans/_components/EditPlanPopup.jsx`:
  - Add `billingType` field (read-only for seeded plans, editable for custom).
  - Show `invitePool` field for pool plans, `maxInvitesPerEvent` for event plans.
  - All plans show `durationDays`.

- `admin-dash/hosts/_components/HostSubscriptionPopup.jsx`:
  - Load from new `getHostPlans()` shape: `{ basic: {event, monthly}, premium: {event, monthly} }`.
  - Show family + billing type grouped selector.
  - No billing cycle toggle (the billing type is part of the plan itself now).

- `admin-dash/whitelabels/_components/WhitelabelSubscriptionPopup.jsx`:
  - Load from new `getBusinessPlans()` shape.
  - Show: Per Event (with setup fee note), 3-Month, Annual.
  - Show setup fee status badge.

**Whitelabel Signup** (`ui/auth/signup/whiteLabel/stepFive/StepFive.js`)
- Replace Pro/Elite with Business per-event / quarterly / annual options.
- Show setup fee (1200 SAR) as a required first step for per-event.
- Invite pool shown for quarterly/annual.
- Business customization add-on card (2500 SAR).

**React Query Hooks** (`hooks/reactQueryHooks/`)
- `usePlans.js`: `useHostPlans()` and `useBusinessPlans()` hooks. Update to handle new response shapes.
- `useSubscriptions.js`: Add `useActiveSubscriptions()` hook. Update `useSubscriptionMutation`.

**Utils / Schemas** (`utils/schemas/planSchema.js`)
- Update `PLAN_TYPES`, `PLAN_FAMILIES`, `BILLING_TYPES` constants to new values.

---

### MOBILE APP — `halla-mobile/`

**Localization** — Same keys as web, apply same replacements.

**`screens/PlansScreen.js`**
- State: `planFamily` (`'basic'|'premium'`), `billingType` (`'event'|'monthly'`), `selectedInvites`.
- Remove `planType: 'single_event'|'monthly'`, remove `BillingToggle` based on subscription type.
- Add `FamilySelector` component (Basic / Premium tabs).
- Add `BillingTypeToggle` component (Per Event / Monthly pills).
- Add `InviteSelector` for the chosen family + billing type combo.
- Pool plans show invite pool info instead of per-event info.
- Compensation: `Math.floor(selectedInvites * 0.15)`.

**`screens/PlansSummaryScreen.js`**
- Replace `guests` with `invites` everywhere.
- Remove managed fee calculation.
- Show plan family + billing type.
- Show pool size for monthly plans.
- `planCode` = e.g. `basic_event_50` or `basic_monthly_100`.

**`components/plans/PerEventPlans.js`** (rename from `SingleEventPlans.js`)
- Update `plan.guests → plan.invites || plan.guests` (fallback for safety).
- Compensation: 15%.
- Label: "دعوة" / "invite" not "ضيف" / "guest".

**`components/plans/MonthlyPlans.js`** (new or renamed)
- Show pool invite count, duration, unlimited events.

**`screens/BusinessPlansScreen.js`** (new or rename existing enterprise screen)
- Three cards: Per Event (1200 SAR setup note) / 3-Month (3500) / Annual (10,000).
- Per-event card opens an invite selector (100–500).
- Setup fee status shown.

---

## PLAN

Before writing any code, produce a numbered plan with every file to create/edit,
what changes you'll make, and in what order. Validate the plan against:

1. Does the seed script produce exactly 36 plans (+ trial + unlimited)?
2. Can a host buy a monthly plan and run 3 events this month each using pool invites?
3. Can a host have a monthly + a per-event subscription active at the same time?
4. Does `canCreateEvent()` correctly pick the right subscription?
5. Does `consumeInvites` atomically prevent over-allocation?
6. Does business setup fee get checked before allowing `business_event_*` subscription?
7. Do add-ons correctly add to pool vs. event scope?
8. Are all plan codes consistent between backend constants and frontend?

Then execute the plan file by file in the order: constants → models → services →
seed script → frontend localization → frontend components → mobile.

After each phase, state what you just completed and what's next.
