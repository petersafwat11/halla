# Halaa store-readiness — Decision Record (Phase 0)

**Drafted:** 2026-06-28 (analysis + recommendations)
**Owner decisions signed:** 2026-07-01
**Author:** Claude Code (coordinating engineer)
**Scope of this session:** decision + baseline only. No production store SKUs were
created; no catalog/feature code was changed. This record made a concrete
recommendation for every Phase-0 decision; the owner has now signed each one below.

**Source-of-truth order** (per `store-readiness-CLAUDE-MASTER-PLAN.md` §"Source-of-truth order"):
owner's latest dated decision → master plan + corrective review → specialized plans →
SHIP plan → older notes. **The signed owner decisions of 2026-07-01 (below) are now the
top of that order and govern all conflicts.**

---

## ★ SIGNED OWNER DECISIONS — 2026-07-01 (authoritative)

All Phase-0 decisions are **RESOLVED**. Where the owner's choice differs from the
draft recommendation, the owner's choice governs.

| ID | Decision | Signed outcome |
|---|---|---|
| **DEC-01** | Canonical catalog | **KEEP six-tier / 34 plans.** The current backend/DB/web catalog is the canonical source of truth. This is an **explicit dated owner decision that supersedes** the ten-tier `plans-rewrite-2026-05.md` signoff and the draft recommendation. Store products are created **from the current 34-plan catalog + current add-ons**, not the ten-tier document. Do **not** restore the 250/300/350/400 tiers. |
| **DEC-02 / MOB-04** | Business first self-serve purchase | **Allowed on BOTH web and mobile.** Admin assignment remains available but is **not** the only path. Current-plan comparison must be by **exact plan code/product**, not `planType`. (Overrides the draft "native-only, web managed" recommendation.) |
| **DEC-03 / DEC-03L** | Design-template add-ons | **Consumable / single-use managed service requests** (purchase → admin dashboard → assign designer → WhatsApp with the user → prepare → revisions → complete). **Not** reusable non-consumables; **no** Restore-Purchases obligation. **Refund: non-refundable from purchase/request creation.** |
| — | Extra invites add-on | **Unchanged** — consumable, repeatable top-ups per current backend logic. |
| — | Business customization add-on | **Unchanged** — managed/provisioned service via admin flow, current definition. |
| **DEC-04** | RevenueCat transfer | **"Keep with original App User ID."** No automatic cross-account transfer; no dual access; entitlements stay tied to the original Halaa user; real migrations handled manually by support/admin. (Matches the draft recommendation.) |
| **PRICE-OWNER** | Prices / tax | **Current backend/DB/web catalog and prices are final.** Store products (Google Play / App Store) are set up from the current 34 plans, six-tier structure, current add-ons, and current pricing source. **No** separate ten-tier price mapping. |

**Gate:** SKU/manifest work (CAT-01) is cleared to proceed **from the current
catalog** now that this record is updated — but immutable SKU creation itself remains a
later, separately-scoped step (not this session).

**Implementation follow-ups created by these decisions** (tracked in CORRECTIVE-STATUS,
not decisions): (a) delete the stale "54 entries/54-plan" comments at
`planDefaults.js:221` and `seedPlans.js:1` so the code matches the ratified 34; (b)
`MOB-04`/web — enable first self-serve business purchase on both surfaces + compare by
code; (c) design-template webhook/refund handling must treat store-initiated refunds as
exceptions (Halaa policy = non-refundable, but Apple/Google can still force a store
refund, which the reducer must reconcile).

The sections below preserve the original analysis and evidence that led to each
decision. Where a section still reads "recommendation/BLOCKED," the **signed outcome
above governs.**

## Evidence integrity caveat (read first)

All catalog counts below are **proven from the source/seed layer** (constants,
defaults factory, and the seed validator) — reproducibly, with no database
connection. They are **not** a claim about the live `/plans` API, which serves
whatever the DB was **last seeded** with and can diverge from source. The shared
`halaa-staging` Atlas cluster is used by local **and** production VPS (dropping it
wipes live data — see memory `project_shared_staging_db_and_ci`), so this session
deliberately did **not** connect to or mutate any database. Live DB/API parity must
be confirmed read-only (`countDocuments` / `GET /plans`) in a later session.

---

## A. Proven current catalog counts (primary source)

Reproducible static inventory (run from repo root, no DB):

```
$ node -e 'const {PLAN_DEFAULTS}=require("./labbe-backend-/src/shared/constants/planDefaults");
  const t={}; for (const [c,p] of Object.entries(PLAN_DEFAULTS)) t[p.planType]=(t[p.planType]||0)+1;
  console.log("PLAN_DEFAULTS total entries:", Object.keys(PLAN_DEFAULTS).length);
  console.log("by planType:", JSON.stringify(t));'
PLAN_DEFAULTS total entries: 34
by planType: {"trial":1,"basic_event":6,"basic_monthly":6,"premium_event":6,"premium_monthly":6,"business_event":6,"business_quarterly":1,"business_annual":1,"unlimited":1}

$ node -e 'const {PLAN_CODES}=require("./labbe-backend-/src/shared/constants/plans");
  const a=require("./labbe-backend-/src/shared/constants/addons");
  console.log("PLAN_CODES entries:", Object.keys(PLAN_CODES).length);
  console.log("extra_invites:", a.EXTRA_INVITES_TIERS.length, "design_template:", a.DESIGN_TEMPLATE_TIERS.length, "business_customization: 1");'
PLAN_CODES entries: 34
extra_invites: 16 design_template: 5 business_customization: 1
```

| Layer | File | Count | Tiers per family |
|---|---|---|---|
| Plan codes enum | `labbe-backend-/src/shared/constants/plans.js:26` | **34** | 6 (25,50,75,100,150,200) |
| Plan defaults | `labbe-backend-/src/shared/constants/planDefaults.js:223` | **34** | 6 |
| Seed validator | `labbe-backend-/scripts/seedPlans.js:52` (`EXPECTED_TOTAL = 34`) | **34** | 6 |
| Store SKU matrix doc | `docs/store-readiness-SKU-matrix.md:13-30` | mirrors **34** | 6 |
| Web catalog | API-driven; no hardcoded tiers (`labbe/ui/landing/PricingSection/PricingSection.jsx:43`, `labbe/ui/plans/PlanCard/PlanCard.jsx:84`) | renders whatever API returns | n/a |
| Mobile catalog | API-driven; no hardcoded tiers (`halla-mobile/screens/host/PlansScreen.js`, RC package lookup by `plan.code` in `PlansSummaryScreen.js:51`) | renders whatever API returns | n/a |
| Add-ons | `labbe-backend-/src/shared/constants/addons.js:11-33` | **22** (16 extra-invite + 5 design + 1 business customization) | n/a |

**Conclusion:** the entire stack is consistently **six-tier / 34 plans** today. Both
frontends are fully API-driven with no hardcoded tier cap, so they will render a
ten-tier catalog automatically once the DB is reseeded. The only place ten-tier
still exists is the signed plan `docs/plans-rewrite-2026-05.md` and two **stale code
comments** (`planDefaults.js:221` "54 entries total"; `seedPlans.js:1` "54-plan
structure") that were left behind when the data was reduced.

Catalog-size consequence for store-product creation:

| Catalog | Sellable plans (excl. trial/unlimited) | + add-ons | Store products / platform |
|---|---|---|---|
| Six-tier (current code) | 32 (18 event consumables + 14 recurring) | 22 | **54** |
| Ten-tier (signed plan) | 52 (30 event consumables + 22 recurring) | 22 | **74** |

---

## B. DEC-01 — Ten-tier approved catalog vs six-tier reduction

**Question:** Is the canonical store catalog the owner-signed **ten-tier** (25→400, 54
plans) or the current **six-tier** (25→200, 34 plans)?

**Evidence**
- The only **signed** catalog is ten-tier: `plans-rewrite-2026-05.md` §18 ("Sign-off
  status — ALL APPROVED", dated 2026-05-26) with the tier list 25,50,75,100,150,200,
  250,300,350,400 across all five families (§2) and approved prices for every tier (§3).
- Governing fallback: master plan §0.1 — "If no new decision exists, implement the
  explicit ten-tier catalog in `plans-rewrite-2026-05.md`."
- Git provenance of the reduction (proven):
  - The initial commit `e31b3b2b` contained the 250+ tiers (ten-tier).
  - The reduction landed in commit **`64b5b1dd`** (2026-05-29, *"updated some parts of
    the landing page, updated the market place page, made phase 5 and 6 of the
    unification plan"*). That commit flipped all five families `10 → 6` and
    `EXPECTED_TOTAL 54 → 34`, removing 20 default entries (250/300/350/400 × 5).
  - The commit message cites the **invite-pool unification refactor**, *not* an owner
    catalog or pricing decision — and it landed **3 days after** the ten-tier catalog
    was signed. The leftover "54" comments confirm the reduction was an incidental
    by-product, not a deliberate, ratified commercial decision.
- The six surviving tiers' prices already equal the doc's approved 25→200 prices;
  restoring ten-tier is purely additive (+250/300/350/400 per family, +20 codes → 54),
  and those four tiers' prices are already specified and approved in §3.

**Draft recommendation (2026-06-28):** restore the ten-tier catalog (54 DB plans),
since it was the only *previously* signed catalog and the master-plan fallback.

**★ OWNER DECISION (2026-07-01): KEEP six-tier / 34 plans — RESOLVED.** The owner
explicitly chose the current backend/DB/web catalog as the canonical source of truth
and stated this decision **supersedes** the ten-tier `plans-rewrite-2026-05.md` signoff
and the master-plan §0.1 fallback. The 250/300/350/400 tiers stay removed. Store
products are created from the current **34 plans + 22 add-ons** (→ **54 store products
per platform**: 32 sellable plans + 22 add-ons). This is the affirmative dated
ratification the draft asked for, so the catalog is now **frozen at six-tier** and
`CAT-01` may proceed from it. Follow-up: delete the stale "54" comments at
`planDefaults.js:221` / `seedPlans.js:1` so the code matches the ratified 34
(implementation task under `CAT-02`, not a decision).

---

## C. DEC-02 — Can an eligible business account buy its first self-serve plan?

**Question:** May an eligible, approved business-host account purchase its **first**
plan self-serve, or is the first plan admin-activated only?

**Evidence**
- **Already owner-decided for native:** D8 (DECIDED 2026-06-27, SHIP plan §2) =
  "MAXIMUM PARITY … simplified self-serve business tiers (quarterly/annual subs, event
  consumable; setup fee waived in-app, managed quote/tax flow stays web-only)."
  Billing plan §1.3 spells out the implementation: an eligible approved business
  account "may purchase its first simplified native business plan"; "remove the
  `hasActiveSubscription` lock for eligible native first purchase"; "compare current
  plan by plan code/product, not `planType`."
- **Current code contradicts the native decision** (proven, both surfaces):
  - Mobile `halla-mobile/screens/host/BusinessPlansScreen.js`: `hasActiveSubscription =
    !!subscription` (≈line 72); with no sub, a pending banner shows and
    `canSelfUpgrade={hasActiveSubscription}` (≈line 201) hides the purchase button →
    first self-serve purchase **blocked**. `isCurrent` compares **planType only**
    (≈line 197) → over-broad (every business-event tier can read as "current").
  - Web `labbe/app/[lang]/host/plans/_hooks/useBusinessPlansPageState.js`:
    `hasActiveSubscription = !!subscription && ["active","trial"].includes(status)`
    (≈line 49); both `handleSelectPlan` (≈line 94) and `handleProceedToPayment`
    (≈line 108) hard-block with toast *"An admin must activate your first plan."*

**Draft recommendation (2026-06-28):** native self-serve = YES (per D8); keep web
managed-admin-first.

**★ OWNER DECISION (2026-07-01): first self-serve business purchase allowed on BOTH web
and mobile — RESOLVED.** The owner overrode the "web stays managed" half: eligible
business users self-purchase their first plan on **both** surfaces, then upgrade /
downgrade / cancel / manage normally. Admin assignment remains available but is **not**
the only path. Both the mobile guard (`BusinessPlansScreen.js` `hasActiveSubscription`)
and the web guard (`useBusinessPlansPageState.js:94,108`) must be removed for eligible
first purchase, and **current-plan comparison must be by exact plan code/product, not
`planType`** (fixes the over-broad `isCurrent`). Implementation tracked as `MOB-04`
(mobile + web).

---

## D. DEC-03 — Per-add-on type / lifetime / repurchase / fulfillment / refund

Proven from `addons.js`, `addons.pricing.js`, `addons.quota.js`, `addons.service.js`,
`addons.validation.js`, `addons.refund.js`. **22 add-on products** total.

### D.1 Extra invites — 16 tiers (10,20,30,40,50,75,100,125,150,200,250,300,350,400,450,500); flat 4 SAR/invite (`addons.js:11`)
- **Type (recommend): consumable.** Each purchase is a one-time top-up.
- **Lifetime:** credit is added to a counter and lives with that container —
  `Subscription.invitePool` for `pool`/`org` scope, or `Event.guestLimit` for `event`
  scope (`addons.quota.js:15-52`). No standalone expiry.
- **Repurchase: repeatable, unlimited** — no "already owns" guard, by design; each
  purchase stacks more invites (`addons.service.js:110`).
- **Fulfillment:** automatic via `applyQuota`; IAP path is idempotent on
  `metadata.providerTransactionId` (`addons.service.js:401-419`). Guard rejects
  pool/org purchase with no active subscription and event purchase on an
  unlimited-capacity event before charging (`addons.service.js:91-100`, `:506-513`).
- **Refund (recommend):** clawback **unused** delta only, never below the consumed
  count (billing plan §4.3). **Current state:** NOT implemented end-to-end — failures
  write a `pending_refund` audit row + admin notification only; "Moyasar refund flow is
  not implemented yet" (`addons.refund.js:7-16`, `addons.service.js:104`). Closing this
  is tracked as `ADD-02`, not an owner decision.
- **Classification: RECOMMENDED (technical).**

### D.2 Ready-made / custom design templates — 5 types (`addons.js:18`): ready_made (200), custom_male (200), custom_themed (275), animated (350), 3d (500) SAR
- **Current code behavior:** charged, status set to `active` immediately, and
  `applyQuota` is a **no-op** for design templates (only `extra_invites` touches a
  counter — `addons.quota.js:18`). So a design purchase today is just a **paid order
  record**; it is **repeatable** with no per-event/per-org guard.
- **Type — OWNER/LEGAL must choose** (this is the one real add-on decision):
  - (a) **consumable, one deliverable per purchase/event** *(recommended)* — matches the
    plan copy "request custom design for an additional fee"; simplest store mapping; no
    Restore-Purchases obligation.
  - (b) **non-consumable, reusable per organization** — changes the RevenueCat product
    type and creates a **Restore Purchases** obligation across reinstalls/devices.
- **Fulfillment:** manual creative delivery (off-system); the Addon row is the work
  ticket.
- **Refund:** for **fulfilled** creative work this is a **legal/commercial policy**
  (before-work-starts vs after) — see DEC-03L.
- **★ OWNER DECISION (2026-07-01): consumable / single-use managed service request —
  RESOLVED (option a).** Confirmed real flow: user purchases/requests a design → the
  request appears in the **admin dashboard** → admin **assigns a designer** → designer
  coordinates with the user over **WhatsApp** → designer prepares the design → user may
  **request changes** → both agree → request **completed**. It is a one-time service
  request, **not** a reusable asset, and carries **no Restore-Purchases obligation**.
  **Refund policy: non-refundable from purchase/request creation** (once created it is a
  service request handled by the design/admin process). Store-initiated refunds
  (Apple/Google may force one) remain an exception the webhook reducer must reconcile,
  but Halaa does not proactively refund. DEC-03L is therefore **RESOLVED**.

### D.3 Business customization — 1 product, 2500 SAR (`addons.js:26`)
- **Current code behavior:** created as `pending_provisioning`, then an admin flips it
  to `active` via `activateAddonAsAdmin` (`addons.service.js:197`, `addons.validation.js:81`);
  `applyQuota` no-op. Description: "Custom webpage + 4 official WhatsApp templates +
  delivered in 1 week" (`addons.js:31`). No per-org duplicate guard today.
- **Type (recommend): non-consumable managed service, one active per organization.**
  Add a one-per-org guard so it cannot be double-bought.
- **Fulfillment:** admin provisioning, ~1-week SLA (managed service).
- **Refund:** before provisioning starts = full; after work starts = **legal policy**
  (DEC-03L).
- **Classification: RECOMMENDED (technical) for type/fulfillment; refund = legal.**

### D.4 Add-on summary table

| Add-on | Type (recommended) | Lifetime | Repurchase | Fulfillment | Refund |
|---|---|---|---|---|---|
| Extra invites (16) | consumable | with sub pool / event guestLimit | repeatable | auto (applyQuota), IAP idempotent | clawback unused only *(not yet built — ADD-02)* |
| Design templates (5) | **consumable / single-use managed service** (owner-signed) | one service request (no counter, no restore) | repeatable (new request each time) | admin-assigned designer → WhatsApp → revisions → complete | **non-refundable from creation** (owner-signed) |
| Business customization (1) | non-consumable, 1/org | persists per org | one active per org *(add guard)* | admin provisioning, ~1wk | before/after work = **legal** |

---

## E. Google Play upgrade/downgrade replacement modes

**Question:** Which Google Billing replacement mode for subscription changes?

**Evidence:** Mobile calls plain `purchasePackage()` with no `oldProductIdentifier` /
replacement mode (P0-07; `halla-mobile/services/purchases.js`, `PlansSummaryScreen.js`).
Billing plan §5.3 recommends classifying by **catalog order** (not price strings) and
passing the current Play product + an approved mode.

**Recommendation (technical default):**
- **Upgrade → immediate with proration** (`CHARGE_PRORATED_PRICE`).
- **Downgrade → deferred** (`DEFERRED`; effective next renewal).
- **Crossgrade** (same level, different tier) → reviewed explicitly; default immediate
  with proration.
- Always pass `oldProductIdentifier` and reconcile the **effective** (not requested)
  product. iOS uses subscription-group level behavior + effective-product reconcile.

**Classification: RECOMMENDED (technical)** — adopt the above default. Tracked as
`MOB-02`. Not an owner blocker.

---

## F. DEC-04 — RevenueCat restore / transfer behavior

**Question:** How are purchases restored, and what is the cross-account transfer policy?

**Evidence**
- Identity (proven, already correct): custom-ID design —
  `Purchases.logIn(billingUserId)` on auth/account-switch, deliberately **no
  `logOut()`** (avoids an anonymous RC id), purchasing disabled while signed out
  (`halla-mobile/services/purchases.js:49-81`). Restore gated on an identified user
  (`:100`).
- SHIP §9.1 / billing §2.4: transfer behavior must be **defined and tested before
  production**; the RevenueCat `TRANSFER` webhook must "reconcile every source/
  destination ID and prevent dual access" — it must not be left a permanent dead letter.

**Recommendation**
- **Restore semantics (technical, recommend):**
  - **Subscriptions** (monthly/quarterly/annual): restored via the store's Restore
    Purchases, then reconcile the expected recurring entitlement before granting.
  - **Consumables** (event packages, extra invites): **not** reliably restored by store
    receipt history — the authenticated Halaa backend ledger is authoritative
    (billing §3.3). On reinstall/login, reconcile the ledger; do **not** promise Restore
    recreates consumed consumables.
  - Keep the current custom-ID / no-`logOut()` model.
- **Transfer policy (commercial/anti-abuse — owner):** choose RevenueCat's project
  **transfer behavior** setting. The four options (verbatim, per RevenueCat docs
  `/docs/projects/restore-behavior`):
  1. **"Transfer to new App User ID"** (RevenueCat default) — the purchase **moves** to
     the new App User ID and the **original loses** access.
  2. **"Transfer if there are no active subscriptions"** — transfers unless the target
     already has an active subscription.
  3. **"Keep with original App User ID"** — the purchase **stays with the original**
     App User ID; the new user **cannot** access it (RevenueCat returns an error).
  4. **"Share between App User IDs (legacy)"** — merges the IDs as one subscriber.
  - **Recommended: "Keep with original App User ID."** If the same store account
    (Apple ID / Google account) is later used under a **different** Halaa account, the
    entitlement stays with the original Halaa account and the new one cannot claim it —
    this blocks one store account from unlocking multiple Halaa accounts, the main abuse
    vector for a single-subscription product. It fits the existing stable-UUID
    `billingUserId` model (a normal reinstall logs back into the *same* id, so restore
    is unaffected). **Trade-off:** a *legitimate* account migration then needs a
    support-assisted transfer rather than self-serve.

**★ OWNER DECISION (2026-07-01): "Keep with original App User ID" — RESOLVED.**
Purchases/subscriptions/entitlements stay tied to the **original** Halaa user account.
**No** automatic cross-account transfer when the same Apple/Google store account signs
in elsewhere; **no** dual access; entitlements are never mixed between Halaa accounts.
A genuine account migration is handled **manually by support/admin**, not automatically
by RevenueCat restore behavior. Restore semantics (subs via store, consumables via the
authenticated backend ledger) are adopted as recommended. Set the RevenueCat project
**transfer behavior = "Keep with original App User ID."**

---

## G. Saudi availability, price-approval owner, managed-B2B exclusions

- **Saudi availability — DECIDED.** D2 (SHIP §2) = **Saudi Arabia storefront only** for
  v1. Expanding territories triggers a new payment/privacy/tax/trader review. Restated,
  not re-opened.
- **Managed-B2B exclusions — DECIDED (D8) / recommend confirm.** Not sold natively
  (`docs/store-readiness-SKU-matrix.md:59`): `trial` (free, auto-granted), `unlimited`
  (admin), and the **negotiated/managed** `business_quarterly`/`business_annual`
  **contracts** (the quote/tax/setup-fee B2B flow stays web/admin-only). Only the
  **simplified self-serve** business tiers (setup fee waived in-app) are sold natively.
- **Price-approval — ★ OWNER DECISION (2026-07-01): current catalog and prices are
  final — RESOLVED.** Store products (Google Play / App Store) are set up from the
  **current backend/DB/web catalog**: the current 34 plans, six-tier structure, current
  add-ons, and current pricing source. **No** separate ten-tier price mapping is
  created. Remaining work is purely mechanical (map each current SAR price to the
  nearest store price tier; Saudi VAT is collected by the stores at the standard 15%) —
  no further price sign-off is required before SKU creation.

---

## H. Decision classification summary (all RESOLVED — signed 2026-07-01)

| ID | Decision | Signed outcome | Status |
|---|---|---|---|
| DEC-01 | Catalog: ten-tier vs six-tier | **Keep six-tier / 34** (supersedes ten-tier signoff) | RESOLVED (owner) |
| DEC-02 | Business first self-serve purchase | **Allowed on web + mobile**; compare by exact code | RESOLVED (owner) |
| DEC-03 (extra invites) | type/lifetime/repurchase/fulfillment | consumable, repeatable, auto (unchanged) | RESOLVED (owner) |
| DEC-03 / DEC-03L (design templates) | type + refund | single-use managed service request; **non-refundable from creation**; no restore | RESOLVED (owner) |
| DEC-03 (business customization) | type/fulfillment | managed/provisioned service via admin (unchanged) | RESOLVED (owner) |
| MOB-02 | Google replacement modes | immediate upgrade / deferred downgrade | RECOMMENDED (technical, no owner gate) |
| DEC-04 (restore) | restore semantics | subs via store; consumables via backend ledger | RESOLVED (owner) |
| DEC-04 (transfer) | transfer/account-switch policy | **Keep with original App User ID**; no dual access | RESOLVED (owner) |
| D2 | Territories | Saudi only | DECIDED (D2) |
| D8-excl | Managed-B2B exclusions | trial/unlimited not native; managed contracts web-only | DECIDED (D8) |
| PRICE-OWNER | prices / tax | **current catalog & prices final**; no ten-tier mapping; Saudi VAT 15% | RESOLVED (owner) |

**No Phase-0 decision remains owner-gated.** The canonical catalog is frozen at
**six-tier / 34 plans + 22 add-ons**. `CAT-01` (machine-readable manifest) may proceed
**from the current catalog**; immutable SKU creation remains a later, separately-scoped
step and must not run until the manifest is built and reviewed.

---

## I. Signed Phase-0 decision log

Owner decisions received and recorded **2026-07-01** (full text in the session
transcript). This section, together with the ★ block at the top, is the signed Phase-0
decision log. Summary of the eight owner instructions:

1. **DEC-01** — keep current six-tier / 34-plan catalog; explicitly supersedes ten-tier;
   store products from current backend/DB/web catalog + current add-ons; do not restore
   250/300/350/400.
2. **DEC-02 / MOB-04** — allow first self-serve business purchase on **both** web and
   mobile; admin assignment optional, not sole path; compare current plan by exact
   code/product.
3. **DEC-03 / DEC-03L** — design templates = single-use managed service requests
   (admin-assigned designer, WhatsApp coordination, revisions, completion); consumable;
   **non-refundable from purchase/request creation**; no reusable-asset / restore
   behavior.
4. **Extra invites** — unchanged (consumable, repeatable top-ups).
5. **Business customization** — unchanged (managed/provisioned service via admin flow).
6. **DEC-04** — keep purchases/subscriptions with the original Halaa account; no
   automatic RevenueCat cross-account transfer; no dual access; manual migration by
   support only → transfer behavior = "Keep with original App User ID."
7. **PRICE-OWNER** — current backend/DB/web catalog and prices are final; no separate
   ten-tier price mapping.
8. Update the decision record + corrective status (done); next implementation direction
   follows the above; do not create immutable SKUs until this record reflects the
   decisions (it now does).
