# 10 — Addon Purchase

## Overview
Host purchases add-ons to extend their plan's capabilities: extra invites (10–50), extra reminders (1–5), design templates (ready-made, custom, animated, 3D), business customization (custom webpage + official WhatsApp templates). Addon purchase increases host's quota (invitePool, compensationPool for pool plans; maxInvitesPerEvent + addOnGuests for per-event plans). Key question: does addon purchase currently update maxGuests on existing events? Answer: **NO**—existing event guest limits are frozen at event creation time; addons only increase quota for future events.
 

## Scope tags
- addon types: extra_invites, extra_reminders, design_template, business_customization
- addon pricing tiers (quantity/type vs price)
- addon purchase and inventory tracking
- quota updates: invitePool, addOnGuests, compensationPool
- pending/completed addon states
- event-level vs subscription-level addons

## Roles involved
- HOST: purchase addons for self
- WHITELABEL_ADMIN: purchase addons on behalf of organization
- SUPER_ADMIN: purchase addons on behalf of any user

## Entry points
- Backend routes: `labbe-backend-/src/modules/addons/addons.routes.js:6–8` (GET /, POST /purchase, GET /my)
- Backend controller: `labbe-backend-/src/modules/addons/addons.controller.js:3–24` (getAvailableAddons, purchaseAddon, getMyAddons)
- Backend service: `labbe-backend-/src/modules/addons/addons.service.js:5–50` (getAvailableAddons, purchaseAddon, getMyAddons)
- Addon constants: `labbe-backend-/src/shared/constants/addons.js:1–41` (ADDON_TYPES, pricing tiers, descriptions)
- Mobile UI: `halla-mobile/screens/` or `halla-mobile/components/` (addon purchase screen—location TBD, likely under plans or settings)
- Web UI: `labbe/app/host/` (addon marketplace—location TBD)

## Exit / terminal states
- addon created with status **pending** (awaiting payment processing)
- addon status **active** (payment confirmed, quota applied)
- addon status **used** or **expired** (for limited-use addons like templates)
- addon linked to subscription or event (optional—for tracking usage)

## Touched modules (by repo)
### labbe-backend-
- `src/modules/addons/addons.routes.js:1–10` (GET /, POST /purchase, GET /my; add auth + payment middleware)
- `src/modules/addons/addons.controller.js:1–24` (purchaseAddon handler—call service, charge payment, return addon data)
- `src/modules/addons/addons.service.js:5–50` (purchaseAddon: validate addon type, calculate price, create Addon doc, update subscription quota)
- `models/AddonModel.js` (schema: userId, addonType, quantity, price, status, subscriptionId, eventId, createdAt, expiresAt)
- `models/SubscriptionModel.js` (update methods to apply addon quota: addInvites, addReminders, applyAddon)
- `src/shared/constants/addons.js:1–41` (ADDON_TYPES, tiers—ensure complete, exportable)

### labbe-
- `app/host/` addons marketplace (browse, filter by type, purchase, confirmation)
- Purchase modal/page (select quantity/type, apply to subscription or event)
- My addons page (list purchased, view status/expiry)

### halla-mobile-
- `screens/` addon purchase screen (list available addons, select, checkout)
- `components/addons/` (AddonCard, AddonSelector, AddonCheckout—location TBD)
- Integration with subscription detail screen (show active addons)

## Dependencies on other flows
- **09 (Subscription Lifecycle)**: addon is purchased by a subscribed host; increases their subscription's quota
- **11 (Event Creation)**: when creating an event, host's effective quota includes addon invites
- **12 (Quota Enforcement)**: addon increases remaining quota; system must sum base plan + addon when validating guest count

## Known divergences (web ↔ mobile, frontend ↔ backend)
- **Mobile addon UI**: unclear if addon purchase screen exists in halla-mobile; may need to be created
- **Web addon UI**: unclear if addon marketplace exists in labbe; may need to be created
- **Payment integration**: addon purchase currently creates addon with status **pending**; payment processing is a placeholder
- **Quota application**: unclear whether addon quota is applied immediately on purchase or only on payment confirmation

## Open questions

**Q1: Payment hook: where is payment processed?**

A:
**Current behavior:** `purchaseAddon()` creates an Addon document with `status: 'pending'` and returns immediately. No payment gateway call is made. No code path exists to flip the addon to `active`. Quota is never updated. 

**Assessment:** BUG

**Why:** The entire addon purchase feature is non-functional in production. A host can "buy" an addon and the quota remains unchanged. The activation pipeline (payment webhook → status flip → quota update) is completely missing.

**Recommended change:** Implement the activation path. Even before a real payment provider exists, define the activation hook (e.g., `POST /addons/:id/activate` for admin use, or a payment webhook handler) so the pipeline exists as a testable stub. Gate 1 #3 requires designing for payment slot-in.

Source: `labbe-backend-/src/modules/addons/addons.service.js:39-43`

**Q2: Quota application timing: immediately on purchase or only after payment?**

A: **Decided.** Apply quota only after **Moyasar payment confirmation** (addon status → `'active'`). Consistent with the subscription flow. A Moyasar webhook (or polling the charge status) triggers the `POST /addons/:id/activate` handler which increments the subscription quota. While `MOYASAR_API_KEY` is absent (staging), the stub returns success immediately and the activation can be called directly for testing.

**Trade-offs:** Hosts must wait for Moyasar payment processing to complete before extra quota is available; any Moyasar delay directly delays host operations.

**Q3: Addon expiry: do addons expire?**

A: No expiry is implemented. `AddonModel` has no `expiresAt` field and no TTL index. For `extra_reminders`, quantity represents credit count consumed per use with no time-based limit. For `design_template`, the `templateType` field records the tier but no consumed/remaining counter or expiry date is set.
Source: `labbe-backend-/models/AddonModel.js:1-35`

**Q4: Addon scope: event-level or subscription-wide?**

A:
**Current behavior:** `AddonModel` has a `scope` enum field (`'event'`, `'pool'`, `'org'`) at line 23, and `purchaseAddon()` accepts `subscriptionId` and `eventId` from the request body at line 16. The `scope` field is stored but never read during quota enforcement — `purchaseAddon()` performs no quota update at all.

**Assessment:** WEAK

**Why:** When quota application is implemented, the wrong counter will be incremented unless `scope` is read. A `'pool'` addon should increment `invitePool`; an `'event'` addon should target a specific event's `guestLimit`.

**Recommended change:** When implementing addon activation, read `addon.scope` to determine which counter to increment. Define a mapping: `'pool'` → `subscription.invitePool`, `'event'` → target event's `guestLimit`, `'org'` → subscription-wide counter.

Source: `labbe-backend-/models/AddonModel.js:23`, `labbe-backend-/src/modules/addons/addons.service.js:15-46`

**Q5: Addon stacking: can multiple addons of same type be purchased?**

A: [PETER DECISION]

**The choice:** Allow unlimited stacking (current behavior — no uniqueness check by type) vs. cap at one addon per type per subscription.

**Recommendation:** Allow stacking with no cap. Hosts with large events may legitimately need multiple `extra_invites` packs. When quota application is implemented, sum all active addons of the same type.

**Why:** Restricting stacking forces hosts with large events to contact support. Stacking is simpler to implement and more flexible for variable event sizes.

**Trade-offs:** Without a clear UI displaying total purchased addons, hosts may accidentally buy more than needed. (make this clear at the frontend)

**Q6: Existing events: when addon purchased, should it update already-created event limits?**

A: No. Guest limits are frozen at event creation time. Pool plans set `guestLimit = -1` (unlimited per event); per-event plans freeze `plan.limits.maxInvitesPerEvent` at the moment the event is created. Addons purchased after event creation do not update this frozen field.

Source: `labbe-backend-/src/modules/events/events.service.js:382-395`

**Q7: Template usage tracking: how is design_template addon usage tracked?**

A: [PETER DECISION]

**The choice:** One-time-use per event (addon is consumed once applied to an event) vs. subscription-wide reusable (unlimited reuse across events) vs. count-based (N uses across events).

**Recommendation:** One-time-use per event. Host pays once per event they want a special template.

**Why:** Unlimited reuse would undervalue the premium template addon. Per-event enforcement is the simplest model: flip addon status to `used` when it is applied to an event, and block re-application.

**Trade-offs:** A host who wants the same template on multiple events must purchase it multiple times, which may feel expensive for bulk users.
(peter's note: they request a design we deliver it to them via whatsapp it will be image they will use in step 3 (currently users have to choose one of the existing templates but we will have option for them to upload any image they want) it should be simple when they request template design the request should be treadted after purchase like the tickets it will have a status pending > assigned  when adim get the request and assign it to someone and then admin makes it as completed then it will be used in this case and they can use in the event by uploading it)
**Q8: Business customization: how is custom webpage + WhatsApp templates provisioned?**

A: [PETER DECISION]

**The choice:** Automate provisioning (API calls to WA Business Platform + hosting setup) vs. semi-automate (webhook triggers a task queue for an operator) vs. manual (operator provisions and flips addon to `active`).

**Recommendation:** Manual for now, with a defined SLA and notification to the operator. Add an operator-facing admin action (`PATCH /addons/:id/activate` with a notes field) so the manual step is tracked in the audit log.

**Why:** Full automation requires WA Business Platform API access and custom-domain hosting setup, neither of which is scoped. Gate 1 #10 — the manual activation must emit an audit event so operator actions are traceable.

**Trade-offs:** Manual provisioning does not scale; this decision must be revisited when volume increases.

## Unreachable states or edge cases
- Addon without subscriptionId (orphaned addon—unclear if valid)
- Addon with both subscriptionId and eventId (unclear precedence)
- Addon quantity 0 or negative (no validation in service)

## Notes from answer pass

- Q1 and Q4 above cover the two structural gaps: (1) no activation pipeline exists to flip addon from `pending` to `active`; (2) the `scope` field is stored but never read. Both must be addressed together when payment + quota application is implemented.

---

## State machine

```
Addon entity:
  (none)  → POST /purchase         → pending
  pending → payment webhook / admin activate → active   ← MISSING: no activation path exists
  active  → template used for event → used   ← MISSING: no status flip on use
  active  → (no expiry logic)      → (stays active indefinitely)
```

---

## Data handoffs

| Step | Producer | Consumer | Payload | Validation? |
|------|----------|----------|---------|-------------|
| Host selects addon | Client | `POST /addons/purchase` | `{ addonType, quantity, templateType?, subscriptionId?, eventId? }` | addonType validated against ADDON_TYPES enum |
| purchaseAddon() price calc | addons.service.js | Local var | Tier lookup from ADDON_TYPES constants | No payment call |
| Addon.create() | addons.service.js | MongoDB AddonModel | userId, addonType, quantity, price, subscriptionId, eventId, status:'pending' | Mongoose schema validation |
| (missing) payment | **Nothing** | **Nothing** | No Moyasar call exists | Gate-1 #3 violation |
| (missing) activation | **Nothing** | **Nothing** | No quota update exists | Bug |
| GET /addons/my | Backend | Client | All addons for userId sorted desc | No auth scope enforcement beyond userId match |

---

## Role variations

| Role | CAN | CANNOT | Notes |
|------|-----|--------|-------|
| HOST | Purchase addons, view own addons | Activate addons, purchase on behalf of another | No SUPER_ADMIN or WHITELABEL override path |
| WHITELABEL_ADMIN | Purchase addons | Activate addons | Same endpoint, no role differentiation |
| SUPER_ADMIN | Purchase addons | Activate addons via API | No admin-activate endpoint |

---

## Web ↔ mobile parity

| Feature | Web | Mobile | Gap? |
|---------|-----|--------|------|
| Addon browse / purchase UI | Unknown — location TBD in `labbe/app/host/` | Unknown — location TBD in `halla-mobile/screens/` | Yes — both unconfirmed |
| View purchased addons | Unknown | Unknown | Yes — both unconfirmed |
| Addon activation (admin) | No | No | No gap — missing on both |

---

## Edge cases & failure modes

- **Addon quantity 0 or negative:** `purchaseAddon` has no guard. `Addon.create({ quantity: -1 })` will pass if the tier lookup happens to return a price, or fail silently on schema validation depending on model min constraint.
- **Orphaned addon (no subscriptionId):** `subscriptionId` is optional in the payload and stored as null. When activation is implemented, a null-scoped addon has no subscription to credit quota against.
- **Double purchase of same type:** No uniqueness check — a host can purchase the same addon type multiple times. Stacking is intentional (per Peter), but without a UI counter, hosts may accidentally over-purchase.
- **scope field stored, never read:** `AddonModel` has `scope: { enum: ['event','pool','org'] }` stored on every addon, but no code path reads it to determine which counter to increment during activation.
- **Template addon request flow:** Peter clarified design template addons follow a manual workflow (request → pending → admin assigns → completed → host applies to event). This workflow has no ticket/task model backing it in the current schema.

---

## Findings

### FLOW-10-F01 — Addon purchase creates pending record only — no payment, no activation, no quota update
- **Severity**: Critical
- **Type**: MISSING
- **Location**: `labbe-backend-/src/modules/addons/addons.service.js:39`
- **Description**: `purchaseAddon()` calls `Addon.create({ status: 'pending' })` and returns. No payment is charged, no activation endpoint exists, and no quota counter is ever incremented. A host who "purchases" an extra-invites addon receives no additional quota.
- **Why it matters**: The entire addon feature is non-functional. Hosts pay (or think they pay) for addon capacity that never materializes. Gate-1 Decision #3 requires a Moyasar payment stub before subscription/addon creation.
- **Recommended change**: Before creating the Addon record, call the payment provider with the addon's price. On payment confirmation, set status to active and increment the appropriate subscription quota based on the addon type and scope. Provide an admin-accessible endpoint to manually activate addons for testing and business-customization use cases.
- **Related**: FLOW-09-F01, FLOW-12-F01

### FLOW-10-F02 — Addon scope field stored but never read; wrong quota counter will be incremented
- **Severity**: High
- **Type**: BUG
- **Location**: `labbe-backend-/models/AddonModel.js:23`
- **Description**: `AddonModel` stores a `scope` enum (`'event'`, `'pool'`, `'org'`). When activation is implemented, nothing reads this field to decide which counter to increment. Without branching on scope, a pool-scoped addon could increment an event-level field, or vice versa.
- **Why it matters**: Incorrect quota increments mean hosts either get too little (addon wasted) or too much (unintended capacity). The bug is latent now because activation doesn't exist, but it will manifest the moment any activation logic is added.
- **Recommended change**: When implementing addon activation, branch on scope: pool addons add to the subscription's invite pool, event addons increase a specific event's guest limit, org addons apply to the organization-wide counter. Document the mapping explicitly.
- **Related**: FLOW-10-F01

### FLOW-10-F03 — No idempotency key on addon purchase; double-tap creates duplicate charges
- **Severity**: High
- **Type**: MISSING
- **Location**: `labbe-backend-/src/modules/addons/addons.service.js:15`
- **Description**: `purchaseAddon()` has no idempotency guard. If a client submits the purchase request twice (network retry, double-tap), two Addon records are created with two separate payment charges.
- **Why it matters**: Gate-1 Decision #6 requires idempotency keys on all external side effects. Duplicate addon charges are a direct financial harm to the host and a support burden.
- **Recommended change**: Accept an idempotency key from the client (or generate one server-side from userId + addonType + timestamp window). Before creating the Addon record, check for a recent identical pending/active addon and return the existing one instead of creating a duplicate.
- **Related**: FLOW-09-F01

---

## Cross-flow notes

- **Flow 09**: Addon quota is meant to augment subscription quota. Until FLOW-10-F01 is fixed, `validateLimits` in flow 09 never sees addon contributions.
- **Flow 12**: `GuestQuotaCounter` in mobile silently shows wrong limit because the addon's `extraGuests` field is always 0.
- **Flow 11**: Addon-augmented quota should be reflected at event creation time. Currently it is not, regardless of any addon purchase.
- **Flow 23**: Design template addon request → assigned → completed workflow resembles the tickets lifecycle. Consider reusing the ticket model for template requests.
