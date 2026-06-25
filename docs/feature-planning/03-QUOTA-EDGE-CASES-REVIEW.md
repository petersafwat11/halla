# Quota / Plan-Change Edge-Case Review — Per-Event & Pool Plans

> **Read-only analysis.** No code changed. Verified against live code 2026-06-24.
> Companion to [`02-BACKEND-AND-DB.md`](02-BACKEND-AND-DB.md).
> Covers `role:'host'` (personal) **and** `accountType:'business'` — the quota engine is the same for both; the **only** divergence is invite **carryover on plan change** (business carries, host does not).

---

## 0. Files verified for this review

`subscriptionLifecycle.service.js` · `subscriptionEventAccess.service.js` · `SubscriptionModel.js` · `events.crud.service.js` · `events.step2.service.js` · `events.resend.service.js` · `messaging.dispatchPolicy.service.js` · `messaging.send.service.js` · `messaging.routes.js` · `subscriptions.service.js` · `shared/middleware/subscription.js` · `business.assignment.service.js` · `shared/constants/plans.js` · `shared/constants/planDefaults.js` · `models/PlanModel.js` · `webhook.controller.js`.

---

## 1. The mechanics that decide every case (verified)

| # | Fact | Where |
|---|---|---|
| M1 | **One acquisition path.** Host self-checkout, admin-assign, and business-assign **all** funnel into `subscriptionLifecycle.changePlan`. It **creates a brand-new subscription** and **cancels every existing active/trial sub**, stamping each old one `metadata.replacedBySubscription = newId`. Net: a user has **exactly one active sub** at any moment. | `subscriptionLifecycle.js:36-150`; `subscriptions.service.js:318`; `business.assignment.service.js:700-728` |
| M2 | **Events freeze their subscription at create.** `event.subscriptionId` / `planId` are stamped from the active sub and **never re-read live**. | `events.crud.service.js:473-479` |
| M3 | **An old event keeps spending its old pool.** Every post-create op resolves the sub from `event.subscriptionId` via `subscriptionEventAccess.findForEvent`. A **cancelled-because-replaced** sub is still usable **but only by events already stamped to it** (`isReplacedSubscriptionForEvent`). New events never see it. | `subscriptionEventAccess.js:18-45` |
| M4 | **…unless it has expired.** Both the add-guests gate (`isUsableForEvent`) and the send gate (`canDispatch`) **hard-deny if `sub.expiresAt < now`** — even for a replaced sub. | `subscriptionEventAccess.js:15,27-30`; `dispatchPolicy.js:70-72` |
| M5 | **Listing guests is free; only sending consumes.** Add/replace guest list checks a **capacity cap = `invitePool + compensationPool`** (total, not remaining). Each **successful send** does a clamped `$inc invitesConsumed` on `event.subscriptionId` (initial send, resend, extra-reminder alike). | `step2.js:71-90`; `crud.js:389-398`; `messaging.send.js:289-323`; `resend.js:57-131` |
| M6 | **Carryover on plan change: business only.** `carried = isBusinessUser ? Σ remaining(old actives) : 0`, added to the **new** sub's `compensationPool`. **Hosts carry nothing.** The old sub's pool is **never drained**. | `subscriptionLifecycle.js:79-88` |
| M7 | **Per-event re-creation gate.** A per-event sub is permanently "used" once `firstSendAt` is set, and blocked while it has any non-terminal event. So after sending on event A, the user **must buy a new plan** to make event B. | `SubscriptionModel.js:257-284`; `subscriptions.service.js:65-93` |

### 1.1 Critical correction — **every purchasable plan expires**

`durationDays` from `planDefaults.js`, applied by `Subscription.createForUser` → `expiresAt`:

| Plan type | `isPerEventPlan` | `maxEvents` | `durationDays` → expiry |
|---|---|---|---|
| `basic_event`, `premium_event`, `business_event` | **yes** | 1 | **90 days** |
| `trial` | yes | 1 | 90 in config, **overridden to +14 days** in `changePlan` |
| `basic_monthly`, `premium_monthly` | no (pool) | -1 | **30 days** |
| `business_quarterly` | no (pool) | -1 | **90 days** |
| `business_annual` | no (pool) | -1 | **365 days** |
| `unlimited` (admin only) | no | -1 | `null` → **never expires** |

> **Per-event plans are NOT "no-expiry."** They live 90 days. Combined with **M4**, *every* "the old event keeps working" conclusion below is **time-boxed to the old sub's expiry window**. Only the admin `unlimited` plan is exempt. (The instant survival is possible at all because `changePlan` cancels the old sub **without touching `expiresAt`** — `subscriptionLifecycle.js:119-132` — so it lives to its natural expiry instead of dying on replacement.)

---

## 2. The three edge cases

### Case 1 — Per-event → buy another per-event. Does old event A still work?

Scenario: per-event plan **P1**, create event A, send **some** invites (so `firstSendAt` set on P1, quota not exhausted). Buy a new per-event plan **P2**, create event B.

**What the code does (host AND business):**
- `changePlan` makes P2 active, cancels P1 (`replacedBySubscription=P2`). Event A stays stamped P1; event B stamped P2. (M1, M2)
- **Add guests to event A** (update-event step 2 / guest-list): resolves P1 via `findForEvent` → usable (replaced + not expired) → allowed **up to P1's full capacity** `invitePool+compensationPool` (listing is free). (M3, M5, `subscription.js:198-227`)
- **Send extra messages for event A** (resend-invite / extra-reminder on the single-event page): `dispatchPolicy` passes (replaced sub OK), then `_assertInviteBudget` allows up to **P1's remaining** invites; each send charges **P1**. (M3, M5)
- The single-event page shows the right numbers: `getEventById` enriches `event.subscription` from the **stamped** sub regardless of status, and action buttons gate on **event status, not sub status** — so the "invites left" pill and resend/extra-reminder render for the live old event. (`crud.js:213-247`; FE doc §4, §8.10)

**Verdict: ✅ Yes — event A keeps adding guests and sending on P1, fully independent of P2 — but only within P1's 90-day window** (M1.1 + M4). Event B uses P2's quota/guest-cap. They never share or interfere.

**Two caveats:**
1. **Business double-grant** (see [§3 Finding A](#finding-a)) — applies here too: P1's remaining is carried into P2 *and* still spendable by event A.
2. **Newly-added guests to a *live* event A may never be invited.** Adding them succeeds (list-cap only), but the single-event-page **resend** targets only `invitation.sent:true` guests, and the guest-table "Send Invitation" popup is a verified **no-op** (FE doc §8.6). The backend `POST /messaging/send-bulk` *can* reach unsent guests (`messaging.routes.js:61`), but no UI on that page is wired to it. So from the host's view, freshly-added guests sit unsent. **(UI-wiring gap, not a backend limit.)**

---

### Case 2 — Pool → pool. What happens to the remaining 350? Which pool is the old event on?

Scenario: pool plan **PP1**, total capacity **550** (base + extras + compensation). Event A: add 200, send 200 → `invitesConsumed=200`, **remaining 350**. Subscribe to a new pool plan **PP2**, total **300**.

**Old event linkage (both roles): event A stays on PP1, always.** New events use PP2. (M2, M3)

**The remaining 350 — by role:**

- **HOST:** `carried = 0`. **The 350 is NOT added to PP2.** PP2 has exactly 300. PP1 keeps its 350, but it is spendable **only by event A** (and only until **PP1's 30-day expiry**, M4). New events draw PP2's 300.
  → *Answer to your question:* **not** "300 + 250"; it is **"300 on the new plan, and a separate 350 reserved to the old event until the old plan expires, then forfeited."** Hosts get **no carryover and no proration.**

- **BUSINESS:** `carried = 350` → `PP2.compensationPool += 350` ⇒ **PP2 total = 650** (300 + 350). **But PP1 is not drained and event A can still spend its 350.** So the 350 exists in **two** places at once → **double-grant** ([§3 Finding A](#finding-a)). (Your "250" figure is off — the code carries the **full** remaining 350.)

---

### Case 3 — Pool → per-event. Is the new 150 fully consumed, or 150 + leftover 100?

Scenario: pool plan **PP1**, total **300**. Event A: 200 guests, send 200 → **remaining 100**. Subscribe to a new per-event plan **PE2**, total **150**. Create event B (150 guests, send 150).

**Event B is stamped PE2; its 150 sends charge PE2 only** (M2, M5).

- **HOST:** `carried = 0`. **PE2 = exactly 150, fully and only consumed by event B's 150 sends.** The old **100 is NOT added** to PE2 — it stays on PP1, spendable only by event A, until PP1 expires.
  → *Answer:* **the per-event 150 is completely consumed; it is *not* "150 + 100."** The 100 never reaches the new event.

- **BUSINESS:** `carried = 100` → `PE2.compensationPool += 100` ⇒ PE2 capacity = `150 + floor(150·15%) + 100 = 272`. Event B's 150 sends leave **122 remaining on PE2**, *and* event A can still spend PP1's 100 → **double-grant** again. Plus, the carried 100 now rides PE2's **90-day** window instead of PP1's, i.e. the carried invites' expiry changes.

---

## 3. Additional edge cases & findings (beyond what you listed)

<a name="finding-a"></a>
### Finding A — 🔴 Business invite **double-grant** on plan change (correctness bug)

**General trigger (not specific to case 2/3):** *any* business plan change — admin-assign **or** business checkout — performed while **≥1 non-terminal event is still stamped to the old, not-yet-expired sub** double-grants that sub's remaining invites.

`changePlan` (and the equivalent block in `business.assignment.service.js:649-672`) copies `Σ remaining(old)` into the new sub's `compensationPool` **but never drains the old sub's pool** (`subscriptionLifecycle.js:119-141` only flips status + metadata). Because the old sub stays usable by its stamped events (M3) until expiry (M4), the same invites are spendable twice: once by the old event on the old sub, once by new events on the carried pool.

- **Worst case:** a business with a live event on PP1 (350 remaining) reassigned to PP2 can send **350 on event A + 350 via PP2's carried portion = 700** off 350 paid-for invites.
- **Not triggered** when the old sub has **no** non-terminal events (then the remainder is reachable only via carryover — correct).
- Hosts are immune (carried = 0), but hosts instead **forfeit** the remainder (Finding B).

**Suggested fix (pick one):**
1. **Carry-and-drain + re-point** *(most correct, single source of truth):* after carrying, set the old sub's `invitesConsumed = capacity` (zero remaining) **and** re-stamp every non-terminal event on the old sub to the new `subscriptionId`. Keeps one pool of truth; costs the frozen-stamp invariant for in-flight events.
2. **Carry only the unreserved remainder:** `carried = remaining − Σ(remaining "claimed" by non-terminal events on that sub)`. Leaves in-flight events on the old pool, carries only what isn't spoken for. Least invasive.
3. **Block/queue the change** while a non-terminal event holds the old sub, or require the admin to confirm the overlap. Simplest, most conservative.

(`_activateSubscriptionLegacy`, which carried independently, is **dead code** — never called — so there is no *triple*-count today. Verified.)

---

<a name="finding-b"></a>
### Finding B — 🟠 Hosts **forfeit** unused invites on any plan change *or re-buy* (product decision)

Because `changePlan` always mints a fresh sub and hosts carry nothing, a host who changes plans — **or simply re-buys the same monthly plan** mid-cycle to "top up" — loses the old pool's remainder for all **future** events (only an already-created event can still drain it, and only until expiry). There is no proration, refund, or carryover.

- The legitimate "top-up" path is `grantExtraInvites` / an `extra_invites` addon, which `$inc`s into the **same** sub's `invitePool` — but that is admin-grant / addon-checkout, **not** a plan re-buy. A host re-buying a plan through normal checkout will silently lose the remainder.

**Suggested behavior:** decide explicitly between (a) **fresh pool per purchase** (current — then **warn loudly** at checkout: "you still have N invites on your current plan that will not carry over") or (b) **host carryover** symmetric with business (then apply the same drain/re-point discipline as Finding A to avoid the double-grant).

---

<a name="finding-c"></a>
### Finding C — 🟠 Plan expiry silently **strands in-flight events** with remaining quota

Per M1.1 + M4, the moment a stamped sub expires, its events **lose both abilities** — add guests (`isUsableForEvent`) and send anything, including the **initial** cron launch (`canDispatch` → `subscription_expired`). `assertEventDateFloor` at create only enforces a *minimum* lead time; it does **not** check that the event date is **before** the sub's `expiresAt`.

**Concrete failures:**
- A host on a 30-day monthly pool creates an event dated 40 days out, sends initial invites, then at day 30 the plan expires → can no longer resend / extra-remind / add guests, despite (say) 350 invites remaining.
- An event dated **after** expiry never even launches (cron's dispatch gate denies) — yet creation was allowed.
- Same applies to per-event plans at **90 days**.

**Suggested behavior:** (a) at create, enforce `eventInstant ≤ sub.expiresAt` (fail-closed with a clear message), **and/or** (b) **decouple send-eligibility from sub expiry for already-created, non-terminal events** — let a stamped event keep sending against its frozen pool until the *event* completes, even past the sub's period end. (b) matches user intuition ("I paid for these invites for this event") and removes the stranding.

---

<a name="finding-d"></a>
### Finding D — 🟡 Subscription **renewal** behaves opposite to plan change (worth knowing for "timeframe" plans)

Only pool plans renew. The `invoice_paid` webhook calls `sub.renew()` (`webhook.controller.js:218`), which mutates the **same** subscription: rebuilds `invitePool` from the plan **base** (purchased extras dropped), sets `compensationPool` to 15% of base, and **zeroes `invitesConsumed` + `firstSendAt`**, extending `expiresAt` (`SubscriptionModel.js:336-356`).

So a renewing pool plan keeps the **same `subscriptionId`** → a still-in-flight event A on it gets a **fresh full quota and a new expiry window** on the same stamp (consumed reset to 0). This is the *opposite* of the "new sub" plan-change model and is the only way an old event's window/quota gets extended. Side effects to be aware of: (1) renewal **resets `invitesConsumed` to 0** even mid-event, effectively re-granting already-spent invites for that event; (2) **purchased extra invites do not survive renewal**. Confirm both are intended.

---

## 4. Summary

| Question | Host | Business |
|---|---|---|
| **C1:** old per-event event A still add guests + send extra? | ✅ Yes, on P1, **until P1's 90-day expiry** | ✅ Yes — **plus** double-grant (Finding A) |
| **C2:** old event linked to old or new pool? | **Old (PP1), always** | **Old (PP1), always** |
| **C2:** remaining 350 → new plan or old event? | **Neither carried; new plan = 300.** 350 reserved to event A until PP1 expiry, then forfeited (Finding B) | **Carried to PP2 (→650) *and* still on PP1** → double-grant (Finding A) |
| **C3:** new per-event 150 — full or 150+100? | **Exactly 150 consumed; the 100 never reaches event B** | 150 consumed; **+100 carried to PE2 (→272 cap) and still on PP1** → double-grant |

**Priority of fixes**
1. 🔴 **Finding A** — business double-grant on plan change (real over-grant of paid invites). Fix before business plan-switching is common.
2. 🟠 **Finding C** — expiry stranding in-flight events (hits hosts and business; the most likely *support ticket* — "I have invites left but can't send"). Decoupling send-eligibility from sub expiry (option b) is the highest-value, lowest-risk change.
3. 🟠 **Finding B** — decide host carryover-vs-forfeit and message it at checkout.
4. 🟡 **C1 caveat** — wire a real "send to newly-added guests" action on the single-event page (or block adding guests post-launch with a clear message).
5. 🟡 **Finding D** — confirm renewal's consumed-reset and extras-drop are intended.

**The frozen-stamp design itself is sound** — "old event spends old pool, new events use new pool" is implemented consistently across create / step2 / resend / extra-reminder / initial-send / dispatch. The issues above are at the **seams**: business carryover (no drain), universal expiry (no in-flight grace), host forfeiture (no messaging), and one UI-wiring gap.
