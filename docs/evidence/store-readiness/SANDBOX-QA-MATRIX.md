# Sandbox + release-candidate QA matrix (Session 9 · QA-BILL / QA-RC)

**Status:** `BLOCKED_NEEDS_OWNER` — this is the COMPLETE, executable QA matrix the owner's
QA runs **once** signed builds (`ART-IOS`/`ART-AND`) and provider console config
(`MCP-02/03/04/05`) exist on real devices with Apple/Google sandbox accounts. **No row was
executed. No transaction id, RevenueCat event, device result, screenshot, quota, or QA
outcome was invented.** · **Prepared:** 2026-07-02 · **Scope:** master plan Phase 6 +
billing plan Phase 8 + external runbook §11.

> **Why nothing here is executed (honest boundary).** Session 9 has **no** signed IPA/AAB
> (`ART-IOS`/`ART-AND` = `BLOCKED_NEEDS_OWNER`, see `SIGNED-BUILD-RUNBOOK.md`), **no**
> Apple/Google/RevenueCat/EAS console configuration (`MCP-02/03/04/05` = `BLOCKED_NEEDS_OWNER`,
> see `PROVIDER-CONFIG-RUNBOOK.md`), **no** physical iPhone/iPad/Android phone+tablet, and
> **no** Apple Sandbox / Google license-test accounts. A single real store purchase is
> therefore impossible here. Per the billing plan and external runbook §8/§11, **dashboard
> "test events" do NOT count** — every billing row below requires a REAL sandbox purchase on a
> device. This document is the plan; the `ACTUAL` / capture columns stay **empty by design**
> until QA runs it — that empty-column discipline is the anti-fabrication guarantee.

---

## 0. How to read this matrix

### 0.1 The `Confirms` tag — what "on-device is a confirmation, not a first test" means

For a real sandbox purchase, **the purchase event itself is always DEVICE-ONLY**: the store
sheet, the real receipt, the actual webhook emission, its field values and its **timing** can
only be produced on a device against a configured store. What the committed test suite already
proves is the **backend interpretation of a synthetic/stubbed event**. So most rows carry
**two** obligations:

- **CONFIRMS** — a committed, code-verified test already locks the backend logic for the event
  this row emits. On-device work *confirms* the real store emits that event with the right
  shape/timing; it is not the first proof the logic is correct.
- **DEVICE-ONLY** — provable *only* on a device / configured console (proration timing,
  restore/transfer UX, deep-link/push/offline/RTL/iPad/accessibility, the store subscription-group
  single-active enforcement, the RevenueCat transfer-behavior project setting). No prior backend
  test can stand in.

Each row's **`Confirms / Device-only`** column states the split explicitly. Where a test leaned
on a **stub** (the canonical RevenueCat subscriber snapshot is stubbed in
`billing-webhook.integration.test.js` via `rcApi.getRecurringSnapshot`), the row confirms the
**reducer/controller branch** but the **real provider snapshot round-trip is DEVICE-ONLY** —
called out per row so nothing is over-claimed.

### 0.2 Capture set (record for EVERY executed row — all blank until run)

| Field | Note |
|---|---|
| Store transaction / order id | Apple `transaction_id` / Google `orderId` (may be **null** on Android — see `SBX-AND-*`) |
| RevenueCat customer + event + product | RC dashboard: app-user-id, event id/type, store product id |
| Backend record ids | `RevenueCatEvent._id`/`eventId`, `Subscription._id`, `Payment._id`, `EventEntitlement._id`, `Addon._id` |
| Before / after quota | `Subscription.invitePool` / `invitesConsumed`, entitlement `status` |
| Device / build | model, OS version, IPA `CFBundleVersion` / AAB `versionCode` |
| Screenshot / video | store sheet + resulting app state + (where relevant) RC + backend rows |
| Expected vs Actual | EXPECTED is authored below from the contract; **ACTUAL is filled on execution** |
| Tester / date | who ran it, when |

### 0.3 Global preconditions (block the whole matrix)

1. `ART-IOS` + `ART-AND` produce a signed IPA/AAB processed to **TestFlight** + **Play internal
   track** (`SIGNED-BUILD-RUNBOOK.md` §5/§6).
2. `MCP-02/03/04/05` create the **54 products/platform** + the **4 RevenueCat offerings** + the
   single `recurring_access` entitlement + the webhook, and the **§8 zero-drift readback** passes
   (`PROVIDER-CONFIG-RUNBOOK.md`).
3. Backend `NATIVE_BILLING_ENABLED=true` with all RevenueCat secrets set so `/health/ready` is
   green (`revenuecat.config.js`, BILL-10); catalog version/hash = `1.0.0` /
   `32eeeac40ea355e2a77c7a35d0b8b28cd7fd623e802947e2c5e893782220737d`.
4. Real **Apple Sandbox tester** + **Google license tester** accounts exist; devices: current
   iPhone, minimum-supported-iOS iPhone, iPad (portrait+landscape), Android phone, Android tablet.
5. Reviewer accounts seeded (`scripts/seedReviewerAccounts.js`, REV-01): personal host
   (`premium_monthly_100`), business host (`business_quarterly`), vendor.

### 0.4 Row ID scheme (makes the tally mechanical)

`SBX-SUB-*` subscription lifecycle · `SBX-EVT-*` event consumables · `SBX-ADD-*` add-ons ·
`SBX-CHG-*` upgrade/downgrade/crossgrade · `SBX-RST-*` restore/reinstall/multi-device/transfer ·
`SBX-WHK-*` webhook duplicate/concurrent/out-of-order/outage · `SBX-AND-*` Android null-orderId ·
`SBX-OFR-*` offers/promo · `FUNC-*` release-candidate functional sweep.

---

## 1. Personal-host subscription lifecycle — `SBX-SUB-*`

**Precondition:** Apple sandbox / Google license tester signed into a seeded **personal host**
account (`role:host`, `accountType:personal`); `host_plans` offering live; target plan has **no**
pre-existing active subscription. Capture the full §0.2 set each row.

| ID | Case | Store steps (real sandbox) | Expected result | Confirms / Device-only |
|---|---|---|---|---|
| SBX-SUB-01 | New personal subscription purchase (each duration: monthly) | Open Plans → pick a `*_monthly_*` plan → complete the **real** store sheet → app polls `reconcile-exact` | `RevenueCatEvent(INITIAL_PURCHASE)`=`processed`; one `Subscription` (`provider` appstore/playstore); `Payment.amount`=SAR `price_in_purchased_currency`, `currency:"SAR"`, `metadata.priceUsd` separate; reconcile-exact → `active`; invitePool = plan tier | **CONFIRMS** reducer `INITIAL_PURCHASE subscription → GRANT_NEW` (`revenuecat-reducer.test.js:53`) + webhook grant/ledger/redaction (`billing-webhook.integration.test.js:80`, asserts SAR 100 not USD 26.66) + `deriveExactState` active (`revenuecat-reconcile-exact.test.js:20`). **DEVICE-ONLY:** real store sheet, real receipt, real webhook emission + timing |
| SBX-SUB-02 | Renewal refills the pool **exactly once** for the new period | Let a sandbox subscription auto-renew (Apple sandbox renews on an accelerated clock; Google license-test renews accelerated) | `RevenueCatEvent(RENEWAL)`=`processed`; pool refilled to tier **once** (not doubled) for the new period; expiry from store | **CONFIRMS** reducer `RENEWAL → RENEW_AND_REFILL` (`revenuecat-reducer.test.js:80`, refill once). **DEVICE-ONLY:** accelerated-renewal timing, real store expiry value |
| SBX-SUB-03 | Voluntary cancellation **retains access** to period end | Cancel via store Manage-Subscription; do NOT wait for expiry | `RevenueCatEvent(CANCELLATION, cancel_reason≠CUSTOMER_SUPPORT)`; subscription flagged cancel-at-period-end; **access retained**; app shows renews-off | **CONFIRMS** reducer `CANCELLATION voluntary → SET_CANCEL_AT_PERIOD_END, keeps access` (`revenuecat-reducer.test.js:132-142`, P0-04). **DEVICE-ONLY:** real cancel path + store cancel_reason value |
| SBX-SUB-04 | Expiration revokes **exactly** the lineage subscription | After SBX-SUB-03, let the period lapse | `RevenueCatEvent(EXPIRATION)`=`processed`; `Subscription.status:"expired"`; access removed for that lineage only | **CONFIRMS** reducer EXPIRATION-inactive → REVOKE_EXACT (`revenuecat-reducer.test.js:173`) + webhook end-to-end revoke (`billing-webhook.integration.test.js:173`). **DEVICE-ONLY:** real expiry timing; **the canonical snapshot round-trip is stubbed in tests → real provider snapshot is DEVICE-ONLY** |
| SBX-SUB-05 | Billing issue / grace **preserves access** to canonical expiry | Force a sandbox renewal failure (Apple sandbox: decline; Google: test card decline / account-hold) | `RevenueCatEvent(BILLING_ISSUE)`; access preserved to expiry; grace deadline recorded | **CONFIRMS** reducer `BILLING_ISSUE → SET_BILLING_ISSUE, keeps access` (`revenuecat-reducer.test.js:197`). **DEVICE-ONLY:** real billing-failure emission + grace window from store |
| SBX-SUB-06 | Recovery from billing issue (successful re-bill) | After SBX-SUB-05, let the retried charge succeed | Recovery event; subscription back to active/renewing; no double refill | **CONFIRMS** reducer RENEWAL refill-once path (`revenuecat-reducer.test.js:80`); recovery reconciles active (`deriveExactState` active). **DEVICE-ONLY:** real recovery timing + snapshot |
| SBX-SUB-07 | Un-cancellation clears the flag, **no refill** | Cancel (SBX-SUB-03) then re-enable auto-renew before expiry | `RevenueCatEvent(UNCANCELLATION)`; cancel flag cleared; **pool NOT refilled** | **CONFIRMS** reducer `UNCANCELLATION → CLEAR_CANCEL_FLAG, never refills (P0-06)` (`revenuecat-reducer.test.js:125`). **DEVICE-ONLY:** real uncancel path |
| SBX-SUB-08 | Pause / resume (**Google** only) | Google: pause the subscription, then resume | `SUBSCRIPTION_PAUSED` → no immediate revoke; on resume, access continues; a matching EXPIRATION (if paused through period) revokes only then | **CONFIRMS** reducer `SUBSCRIPTION_PAUSED → SET_PAUSED, no immediate revoke` (`revenuecat-reducer.test.js:203`). **DEVICE-ONLY:** Google pause/resume is a Play-only store behavior + timing |
| SBX-SUB-09 | Subscription extension | Grant a store-side extension (Google dev-extend / Apple sandbox extend) | `SUBSCRIPTION_EXTENDED`; expiry extended for the **exact** subscription; no new grant | **CONFIRMS** reducer `SUBSCRIPTION_EXTENDED → EXTEND_EXPIRY` (`revenuecat-reducer.test.js:208`). **DEVICE-ONLY:** real extension emission |
| SBX-SUB-10 | Subscription **refund** (support/store-forced) revokes exact txn | Issue a store refund on an active subscription (Apple/Google support tooling) | `CANCELLATION cancel_reason=CUSTOMER_SUPPORT` (or `REFUND`); with canonical snapshot inactive → `REVOKE_EXACT_TRANSACTION`; reconcile-exact → `refunded` | **CONFIRMS** reducer refund-with-snapshot → REVOKE_EXACT (`revenuecat-reducer.test.js:144`) + fail-closed no-snapshot → RETRY (`:150`, P0-08) + `deriveExactState` refunded (`revenuecat-reconcile-exact.test.js:23`). **DEVICE-ONLY:** real refund emission; **snapshot stubbed in tests → provider round-trip DEVICE-ONLY** |
| SBX-SUB-11 | Business-plan **first self-serve** purchase (approved business host) | On a seeded **business** account, buy `business_quarterly` (or `business_annual`) — first purchase, no prior sub | Purchase allowed (no "admin must activate" block); `Subscription` created; reconcile-exact → `active`; a **personal host cannot** buy this (audience gate) | **CONFIRMS** DEC-02 backend unblock (`checkout.service.js` drops the no-sub business block, audience gate kept, MOB-04) + eligibility business-yes / personal-no / vendor-no (`revenuecat-reconcile-exact.test.js:61-75`) + mobile exact-code current-plan (`currentPlan.test.js`, P0-12). **DEVICE-ONLY:** real business store purchase + first-purchase integration (no DB test this session) |

---

## 2. Event consumables — `SBX-EVT-*`

**Precondition:** personal host; `host_plans` offering exposes the 18 event-consumable products;
no unused entitlement held for the target code (enforced by preflight).

| ID | Case | Store steps (real sandbox) | Expected result | Confirms / Device-only |
|---|---|---|---|---|
| SBX-EVT-01 | New event-package purchase → one durable **unused** grant | Buy a `*_event_*` consumable via the real store sheet | `NON_RENEWING_PURCHASE`=`processed`; one `EventEntitlement` `status:"unused"`, `resolution:"fulfilled"`, `subscriptionId` set (per-event sub); reconcile-exact → `fulfilled` | **CONFIRMS** reducer NON_RENEWING event → GRANT_NEW (`revenuecat-reducer.test.js:216`) + webhook grant creates unused entitlement + per-event sub (`billing-fulfillment.integration.test.js:137`) + `deriveExactState` unused/fulfilled → FULFILLED (`revenuecat-reconcile-exact.test.js:33`). **DEVICE-ONLY:** real consumable store sheet + receipt |
| SBX-EVT-02 | Second-purchase **guard** (unused held) blocks re-buy at preflight | With an unused entitlement for code X held, attempt to buy X again | `event-preflight` returns ineligible (`unused_event_held`) → mobile blocks **before** the store sheet, shows the held item + replacement action | **CONFIRMS** `hasUnused` guard (`billing-fulfillment.integration.test.js:137,144-146`) + mobile `usePurchaseFlow` blocks on preflight ineligible (`usePurchaseFlow.js:81-94`; EVT-01). **DEVICE-ONLY:** the store sheet is *not* reached — verify the sheet truly never opens on device |
| SBX-EVT-03 | First-send consumption flips `unused → consumed` | Buy an event package, create the event, **send the first invitation** | On the first real dispatch, `Subscription.firstSendAt` stamped once; the linked `EventEntitlement` flips `status:"consumed"` with `consumedEventId`/`consumedAt`; reconcile-exact → `consumed` | **CONFIRMS** the *state mapping only*: `deriveExactState` consumed → CONSUMED (`revenuecat-reconcile-exact.test.js:34`) and the reconcile fallback **excludes** consumed (`revenuecat-event-fallback.test.js:102-104`). **DEVICE-ONLY + integration-gap (honest):** the actual `unused→consumed` **trigger** lives in `messaging.send.service.js:306-314` (best-effort, gated by the `firstSendAt` stamp at `:293-314`) and is **not exercised by any committed test** — the send→consume flip is first proven here on device |
| SBX-EVT-04 | Event **refund before use** revokes access, keeps ledger | Refund an **unused** event package via store tooling | `REFUND`/`CANCELLATION(CUSTOMER_SUPPORT)`; `EventEntitlement.status:"refunded"` (row preserved for audit); per-event `Subscription.status:"expired"`; reconcile-exact → `refunded` | **CONFIRMS** reducer refund-event → REFUND_EVENT_IF_UNUSED (`revenuecat-reducer.test.js:156`) + webhook refund revokes + keeps row (`billing-fulfillment.integration.test.js:159`). **DEVICE-ONLY:** real refund emission |
| SBX-EVT-05 | Event **refund reversal** restores exact package once | Reverse the SBX-EVT-04 refund (store tooling) | `REFUND_REVERSED`; entitlement back to `unused`; per-event sub re-activated; idempotent on replay | **CONFIRMS** event REFUND_REVERSED restores unused + re-activates (`billing-fulfillment.integration.test.js:86-97`) + reducer event reversal is txn-scoped, no snapshot (`revenuecat-reducer.test.js:240`). **DEVICE-ONLY:** real reversal emission |
| SBX-EVT-06 | Event package delivered **while a recurring plan is active** (race) | Deliver an event purchase to an account that already has an active pool subscription | `EventEntitlement.resolution:"manual_review"`, `subscriptionId:null`; **does NOT block** a future legit purchase; routed to ops | **CONFIRMS** race → manual_review, non-blocking (`billing-fulfillment.integration.test.js:148-157`, P0-03) + `deriveExactState` manual_review (`revenuecat-reconcile-exact.test.js:36`). **DEVICE-ONLY:** producing the real race on device |

---

## 3. Add-ons — `SBX-ADD-*`

**Precondition:** personal host with an active subscription (for pool/extra-invite scope);
`host_addons` / `business_addons` offerings live; `AddonsPurchaseScreen` reachable (ADD-03).
**One store sheet per item — never a combined total** (billing §4.2).

| ID | Case | Store steps (real sandbox) | Expected result | Confirms / Device-only |
|---|---|---|---|---|
| SBX-ADD-01 | Extra-invites grant applies quota atomically + is unique-txn idempotent | Buy an `extra_invites_*` add-on; capture pool before/after; force a duplicate webhook delivery | `Addon.status:"active"`, `grantedDelta` = tier; `invitePool += delta` **once**; duplicate delivery → same `Addon._id`, no double increment | **CONFIRMS** atomic quota + unique-txn idempotent (`billing-fulfillment.integration.test.js:49-60`, P0-10) + reducer add-on → GRANT_NEW (`revenuecat-reducer.test.js:67`). **DEVICE-ONLY:** real add-on store sheet |
| SBX-ADD-02 | Add-on **missing target** → `failed_quota` + `refund_required` (never silent success) | Buy an extra-invites add-on with **no** active target subscription | `Addon.status:"failed_quota"`, `refundState:"refund_required"`; reconcile-exact → `refund_required`; customer sees a non-success status; ops alerted | **CONFIRMS** missing-target → failed_quota+refund_required (`billing-fulfillment.integration.test.js:62-66`) + `deriveExactState` failed_quota → REFUND_REQUIRED (`revenuecat-reconcile-exact.test.js:43`). **DEVICE-ONLY:** real purchase into the failure state |
| SBX-ADD-03 | Extra-invites **refund** claws back **unused only**, never below consumed | Buy +50 invites on a pool with 140 consumed / pool 150, then store-refund it | `invitePool` → 140 (claws back 10 only); `clawedBackDelta:10`; allowance never < consumed | **CONFIRMS** clawback-unused-only math (`billing-fulfillment.integration.test.js:99-108`, P0-11). **DEVICE-ONLY:** real refund emission |
| SBX-ADD-04 | Add-on **refund reversal** restores the exact clawed-back delta **once** | Reverse SBX-ADD-03 | `invitePool` restored by exactly the clawed-back delta; idempotent on replay (no double restore) | **CONFIRMS** reversal-restores-once + idempotent (`billing-fulfillment.integration.test.js:110-120`). **DEVICE-ONLY:** real reversal emission |
| SBX-ADD-05 | **Design template** store-forced refund recorded, **work NOT undone** (DEC-03L) | Buy a `design_template_*` add-on; then force a store refund (Halaa policy = non-refundable, but Apple/Google can force one) | `Addon.status:"paid"` at purchase (managed-service workflow); after store refund `refundState:"refunded"`, `refundReason:"store_forced_refund_non_refundable_policy"`, **`status` stays `paid`** (work state preserved) | **CONFIRMS** design store-forced refund, work not undone (`billing-fulfillment.integration.test.js:122-129`, DEC-03L). **DEVICE-ONLY:** real store-forced refund on a consumable-service product; design template is **never** presented as restorable (consumable) |
| SBX-ADD-06 | Business-customization purchase → managed-service (`pending_provisioning`) | On a business account, buy `business_customization` from `business_addons` | Add-on created as a managed service (admin provisioning path); **distinct** refund policy (`managed_service_legal_review`, not `non_refundable_from_creation`); never presented as a restorable durable entitlement | **CONFIRMS** business_customization is consumable/repeatable w/ distinct refund (CORRECTIVE-STATUS Session 2 §8; `deriveExactState` add-on paths `revenuecat-reconcile-exact.test.js:41-48`). **DEVICE-ONLY:** real business add-on purchase + admin provisioning flow |
| SBX-ADD-07 | Standalone add-on **retry only for items not purchased** | In `AddonsPurchaseScreen`, buy one of several eligible add-ons; verify only un-purchased items remain retryable; each is its own charge | Each add-on = one store sheet + its own preflight + exact reconcile; fulfillment status/history via `GET /revenuecat/fulfillment`; no combined total shown | **CONFIRMS** per-item preflight + exact reconcile + `useFulfillment` (ADD-03; `usePurchaseFlow` one-run-per-item, `usePurchaseFlow.js:71-138`). **DEVICE-ONLY:** the multi-item screen UX on device |

---

## 4. Subscription changes: upgrade / downgrade / crossgrade — `SBX-CHG-*`

**Precondition:** an active personal subscription; target plan in the same audience; classification
is by **catalog order**, not price strings.

> **Proration timing is the big DEVICE-ONLY item.** The *selection* logic (which replacement mode,
> upgrade vs downgrade vs crossgrade) is unit-tested; the **actual StoreKit / Play proration
> amounts and effective-date timing are provable only on device.**

| ID | Case | Store steps (real sandbox) | Expected result | Confirms / Device-only |
|---|---|---|---|---|
| SBX-CHG-01 | **Upgrade** → immediate with proration (Google + iOS) | From a lower tier, buy a higher tier in the same family | Android: `purchasePackage` passes `{oldProductIdentifier, replacementMode: CHARGE_PRORATED_PRICE}`; `PRODUCT_CHANGE` becomes `CHANGE_EFFECTIVE_NOW` once the canonical snapshot reports the new product effective; reconcile-exact → `active` on the new product | **CONFIRMS** `changeMode` upgrade→CHARGE_PRORATED_PRICE (`changeMode.test.js`, MOB-02) + reducer PRODUCT_CHANGE effective-now (`revenuecat-reducer.test.js:109`). **DEVICE-ONLY:** real StoreKit/Play **proration amount + immediate-effective timing**; snapshot round-trip |
| SBX-CHG-02 | **Downgrade** → deferred, effective next renewal | From a higher tier, buy a lower tier in the same family | Android: `{replacementMode: DEFERRED}`; mobile reports **scheduled** (does NOT poll reconcile-exact, which would pend until renewal); `PRODUCT_CHANGE` stays `CHANGE_DEFERRED_NOOP` until the snapshot flips at renewal | **CONFIRMS** `changeMode` downgrade→DEFERRED (`changeMode.test.js`) + reducer deferred-noop, never grants early (`revenuecat-reducer.test.js:99,119`) + `usePurchaseFlow` deferred→scheduled, no poll (`usePurchaseFlow.js:110-118`). **DEVICE-ONLY:** real deferred **effective-at-renewal timing**; the "becomes effective" indicator on device |
| SBX-CHG-03 | **Crossgrade** (same level, different tier) → with-time-proration | Change to a same-level different tier | Android: `{replacementMode: WITH_TIME_PRORATION}`; effective product reconciled (not the requested one) | **CONFIRMS** `changeMode` crossgrade→WITH_TIME_PRORATION (`changeMode.test.js`). **DEVICE-ONLY:** real crossgrade proration timing |
| SBX-CHG-04 | iOS subscription-group change reconciles the **effective** product | On iOS, change within the subscription group | Change follows subscription-group level behavior; backend reconciles the **effective** (not requested) product via the canonical snapshot | **CONFIRMS** reducer effective-vs-deferred by snapshot (`revenuecat-reducer.test.js:99-122`). **DEVICE-ONLY:** iOS subscription-group behavior + level order must match `changeMode.js`; **snapshot round-trip DEVICE-ONLY** |

---

## 5. Restore / reinstall / multi-device / account transfer — `SBX-RST-*`

**Precondition:** identity model is custom `Purchases.logIn(billingUserId)`, no `logOut()`
(DEC-04). Transfer behavior = **"Keep with original App User ID"** (set in RevenueCat console,
`PROVIDER-CONFIG-RUNBOOK.md` §5.5).

| ID | Case | Store steps (real sandbox) | Expected result | Confirms / Device-only |
|---|---|---|---|---|
| SBX-RST-01 | **Restore** an active subscription after reinstall | Buy a sub → delete + reinstall app → log into the **same** Halaa account → Restore Purchases | Subscription restored; recurring entitlement reconciled before granting; access returns | **CONFIRMS** subscriptions restore via store then reconcile (DEC-04 restore semantics; `deriveExactState` active). **DEVICE-ONLY:** real Restore-Purchases flow + store receipt history |
| SBX-RST-02 | **Consumables are NOT restored** by store receipt history | After reinstall, verify unused/consumed event packages + extra invites come from the **backend ledger**, not Restore | Consumed consumables are **not** recreated by Restore; the authenticated backend ledger is authoritative; app does not promise Restore recreates them | **CONFIRMS** consumables via backend ledger (DEC-04; billing §3.3); consumables never presented as restorable (ADD-03, MOB-03). **DEVICE-ONLY:** Restore actually skips consumables on device |
| SBX-RST-03 | **Multi-device** same account — no double access, single active sub | Sign the **same** Halaa account into a second device | One active subscription across both devices (single-active); both derive access from the same `billingUserId` | **CONFIRMS** single-active design (`repurchasePolicy: single_active_subscription` on all 14 subs in `storeCatalog.generated.json`; reducer EXPIRATION "still_active_newer_replacement → ignore" `revenuecat-reducer.test.js:178`). **DEVICE-ONLY + console:** single-active is enforced by the **store subscription group** (MCP-02/04), verified only on device |
| SBX-RST-04 | Account **A → B** transfer: keep-with-original, **no dual access** | Use the **same store account** (Apple ID / Google account) under a **different** Halaa account B | Entitlement **stays with A**; B **cannot** claim it (RevenueCat returns an error per project setting); backend routes any `TRANSFER` webhook to `manual_review` (never a permanent dead letter) | **CONFIRMS backend half only:** reducer TRANSFER → MANUAL_REVIEW (`revenuecat-reducer.test.js:246`) + webhook TRANSFER parked manual_review (`billing-webhook.integration.test.js:151`, DEC-04). **DEVICE-ONLY + console:** the actual "no dual access" is enforced by the **RevenueCat transfer-behavior project setting** (MCP-04) — provable only on device with two accounts |

---

## 6. Webhook duplicate / concurrent / out-of-order / provider outage — `SBX-WHK-*`

**Precondition:** real sandbox purchases that produce real RevenueCat → backend deliveries; use RC
redelivery / network conditions to induce duplicates/outages.

| ID | Case | How to induce on real infra | Expected result | Confirms / Device-only |
|---|---|---|---|---|
| SBX-WHK-01 | **Duplicate** delivery does not double-grant | RC redelivers the same `event.id` (or retry) | Second delivery → `status:"duplicate"`; exactly one `Subscription`/grant | **CONFIRMS** duplicate → no double-grant (`billing-webhook.integration.test.js:107-114`). **DEVICE-ONLY:** real RC redelivery |
| SBX-WHK-02 | **Concurrent** duplicate grants exactly once (atomic lease) | Two near-simultaneous deliveries of the same event | Exactly one grant; the other is a duplicate ack or a **500 retry** (never a 2nd grant); `RevenueCatEvent` ends `processed` | **CONFIRMS** atomic-lease exactly-once (`billing-webhook.integration.test.js:116-125`, BILL-02). **DEVICE-ONLY:** real concurrency |
| SBX-WHK-03 | **Out-of-order** RENEWAL before INITIAL_PURCHASE | Force a renewal to arrive before the initial (RC ordering / retry) | RENEWAL with no local sub → `GRANT_NEW` (creates it); executor idempotent on the transaction lineage; no duplicate on the later initial | **CONFIRMS** out-of-order RENEWAL → GRANT_NEW (`revenuecat-reducer.test.js:86`, `reason:"renewal_without_local_grant"`). **DEVICE-ONLY:** real out-of-order delivery |
| SBX-WHK-04 | **Provider snapshot outage** on a destructive event → retry, never revoke | Cause the canonical snapshot fetch to fail during an EXPIRATION/refund | Destructive event returns **500** so RC retries after lease expiry; access **retained** (fail closed, never fallback revoke) | **CONFIRMS** EXPIRATION no-snapshot → 500 retry, access retained (`billing-webhook.integration.test.js:159-171`, P0-08) + reducer RETRY (`revenuecat-reducer.test.js:184`). **DEVICE-ONLY:** real snapshot outage; **RC-retry-after-lease-expiry is the live reclaim path** — verify RC actually retries |
| SBX-WHK-05 | Stuck lease (crashed worker) is reclaimed + reprocessed | Simulate/observe a `processing` event with an expired lease | `reclaimStuckLeases()` reprocesses it exactly once → `processed`; one grant | **CONFIRMS** stuck-lease reclaim (`billing-webhook.integration.test.js:202-219`). **DEVICE-ONLY / ops:** the reclaim sweep is implemented + tested but **not yet wired to the reconcile cron tick** (CORRECTIVE-STATUS Session 2 §3) — verify the operational trigger on the live deployment |
| SBX-WHK-06 | Dead-letter for unmapped product / unknown user / env mismatch | Deliver (or observe) an event with an unmapped product, ghost user, or wrong environment | Durably persisted: unmapped → `dead_letter`(`unmapped_product`); unknown user → `dead_letter`(`unknown_user`); env mismatch → `ignored`(`environment_mismatch`); **never a grant**; staff can list/inspect/replay | **CONFIRMS** dead-letter/ignore persistence + no grant (`billing-webhook.integration.test.js:128-149`) + dead-letter workflow (BILL-09). **DEVICE-ONLY:** occurs only with a misconfigured console; confirm zero-drift readback (MCP-05) makes this not happen in prod |
| SBX-WHK-07 | Webhook **auth** rejection (forgery) | POST a webhook with a bad/missing authorization header | `401`; **no** `RevenueCatEvent` persisted; no grant | **CONFIRMS** bad-auth → 401, nothing persisted (`billing-webhook.integration.test.js:73-77`). **DEVICE-ONLY:** verify the production `REVENUECAT_WEBHOOK_AUTH` header is set + secret |

---

## 7. Android null-orderId reconciliation edge — `SBX-AND-*`

**Precondition:** **Android** license-test purchases where Google returns a **null `orderId`**, so
the SDK synthesizes a transaction id that does **not** equal the webhook's `transaction_id`. This
is the linchpin Session-3 edge; the **trigger (null orderId) is DEVICE-ONLY**, the fallback logic
is code-verified.

| ID | Case | Store steps (real sandbox) | Expected result | Confirms / Device-only |
|---|---|---|---|---|
| SBX-AND-01 | Android **event** purchase with null orderId reconciles via newest-unused fallback | On Android, buy an event consumable that yields a null `orderId`; app polls reconcile-exact with the synthetic SDK txn id | Exact-txn lookup misses; backend falls back to `findNewestUnusedEventForCode` (caller-scoped, exact code, **unused** only, `resolution∈{fulfilled,none}`) → reconcile-exact → `fulfilled`; **never** another user's row | **CONFIRMS** the fallback fully — newest-unused, caller-scoping, exact-code, status/resolution filters, **cross-account negative** (`revenuecat-event-fallback.test.js`, 9 cases incl. `:162` fulfilled-via-fallback and `:185` no-cross-account). **DEVICE-ONLY:** producing a real null-orderId on an Android device |
| SBX-AND-02 | Android **add-on** with null orderId → **refreshable pending** (documented limit) | On Android, buy an add-on that yields a null `orderId` | Add-ons stay **txn-only** (no event-style fallback); reconcile-exact → `pending`; the UI shows a **refreshable pending** state; a later `refresh` (or the webhook catching up) resolves it | **CONFIRMS** add-on has no fallback by design (CORRECTIVE-STATUS Session 3; `usePurchaseFlow.refresh` re-polls, `usePurchaseFlow.js:141-153`). **DEVICE-ONLY:** real null-orderId add-on purchase + the refreshable-pending UX resolving |
| SBX-AND-03 | Android subscription with null orderId reconciles via product-id fallback | On Android, buy/renew a subscription that yields a null `orderId` | Subscriptions already have a product-id fallback → reconcile-exact → `active` for the effective product | **CONFIRMS** subscriptions had a product-id fallback pre-Session-3 (CORRECTIVE-STATUS Session 3; `deriveExactState` active). **DEVICE-ONLY:** real null-orderId subscription |

---

## 8. Offers / promo codes — `SBX-OFR-*`

**Precondition:** offers/promo codes configured in the console (Apple offer codes / Google
promo-codes+offers) — **owner/console, MCP-02/03**. **No backend contract governs offer
selection**; the only backend touchpoint is the ledger amount.

| ID | Case | Store steps (real sandbox) | Expected result | Confirms / Device-only |
|---|---|---|---|---|
| SBX-OFR-01 | Intro / promotional offer eligibility + post-offer price shown | Redeem an intro/promo offer on a subscription | Native UI shows offer eligibility + post-offer price from the **store package only**; purchase completes | **No backend "confirms"** (offers have no backend contract). Ledger records whatever the store charged (`price_in_purchased_currency`, BILL-05 — `billing-webhook.integration.test.js:90-93`). **DEVICE-ONLY + console:** offer config (MCP-02/03) + real redemption + the native offer presentation |
| SBX-OFR-02 | Promo/offer code redemption records the actual charged amount | Redeem a promo code that discounts the price | `Payment.amount` = the **actually charged** `price_in_purchased_currency` (discounted), `currency:"SAR"`, USD kept separate | **CONFIRMS ledger only:** purchased-currency amount is what's stored, not a catalog price (BILL-05; store catalog **omits price** by construction, CAT-04). **DEVICE-ONLY + console:** promo-code config + real redemption |

---

## 9. Release-candidate functional sweep — `FUNC-*`

Master plan Phase 6 non-billing rows. Everything visual/runtime is **DEVICE-ONLY**; config is
pre-verified by CFG-07 (`SIGNED-BUILD-RUNBOOK.md` §1) and the backend behaviors are code-cited.

| ID | Case | Steps | Expected | Confirms / Device-only |
|---|---|---|---|---|
| FUNC-01 | Fresh install, AR + EN first run, RTL | Install the RC build; launch in AR then EN | Correct locale + **RTL** layout (global `I18nManager` at the layout); purchase surfaces direction-agnostic; TopBar title absolutely-centered (no RTL↔LTR shift) | **CONFIRMS structure** (MOB-03/LEG-02: direction-agnostic components, TopBar symmetric). **DEVICE-ONLY:** actual RTL rendering + first-run |
| FUNC-02 | Signup / login / logout / **account switch** | Exercise all four; switch between accounts | Auth works; account switch re-logs RevenueCat to the new `billingUserId` (no `logOut`); no cross-account entitlement leak | **CONFIRMS** eligibility + identity model (`revenuecat-reconcile-exact.test.js:61-85`; DEC-04). **DEVICE-ONLY:** real auth + RC identity on device |
| FUNC-03 | Reviewer flows: personal host / business host / vendor | Log in as each seeded reviewer; run the role's core flow | Each reaches its area; personal host has `premium_monthly_100`, business host `business_quarterly`; **no OTP/MFA** dependency; smoke login passes | **CONFIRMS** reviewer seeding + fail-closed valid codes + smoke login (REV-01, `scripts/seedReviewerAccounts.js`). **DEVICE-ONLY:** a live seed+login run (no DB this session) |
| FUNC-04 | Event create / edit / send / check-in / post-event | Full host event lifecycle | Create→edit→send invitations→check-in→post-event all work; first send stamps `firstSendAt` + consumes a linked event entitlement (see SBX-EVT-03) | **CONFIRMS** first-send/consume code path (`messaging.send.service.js:293-314`). **DEVICE-ONLY:** the full event UX; **the send→consume flip is not test-covered (SBX-EVT-03)** |
| FUNC-05 | Role eligibility: vendor/guest/moderator/admin cannot buy host products | Attempt (or confirm the UI hides) host/business purchases as each non-host role | No host/business store product is offered or grantable to vendor/guest/moderator/admin/super_admin; admin entitlement stays internal | **CONFIRMS** `checkEligible` negatives for all non-host roles (`revenuecat-reconcile-exact.test.js:71-75`). **DEVICE-ONLY:** the UI actually hides it per role |
| FUNC-06 | Contacts / location / photos **denied AND allowed** paths | Grant then deny each permission | App works on allow; degrades gracefully on deny; **only** the 3 used iOS permissions prompt (photos/contacts/when-in-use-location) — no camera/mic/always-location | **CONFIRMS** exactly-3-permission Info.plist (CFG-07 §1a, introspect-verified). **DEVICE-ONLY:** real allow/deny runtime behavior |
| FUNC-07 | Push foreground / background / terminated + logout token removal | Send pushes in all 3 app states; then log out | Push delivered/handled in each state; on logout the push token is removed | **No billing contract.** **DEVICE-ONLY:** push delivery + token lifecycle on device |
| FUNC-08 | Deep links: reset-password / universal / app links + 3DS return | Open `halla://` + `applinks:halaa.com.sa` links; run a web 3DS purchase that returns to the app | Links resolve into the app; 3DS returns via `halla://` (not web login); AASA/assetlinks validate with the final Team ID / Play SHA | **CONFIRMS config** (CFG-07 items 9-10: scheme + associated domains). **DEVICE-ONLY:** real Universal Link / App Link + 3DS bounce (memory: mobile 3DS deep-link bounce) |
| FUNC-09 | Account deletion warning / request / status / completion | Request deletion; observe status through completion | Deletion runs the retryable pipeline; truthful `pending_retry` if a residual S3 object/step remains (never a false `completed`); RevenueCat = `retained_by_policy`; tokens invalidated; a trailing RC webhook for the deleted account → terminal `account_deleted` | **CONFIRMS** deletion pipeline + truthful completion + post-deletion RC (`account-deletion.integration.test.js` 7 cases + `revenuecat-post-deletion.test.js` 2, DEL-01/02/03). **DEVICE-ONLY:** the deletion UX + **S3 DeleteObject capability = live-cred gap** (fail-closed safe) |
| FUNC-10 | Every public legal / support / deletion URL returns 200 | Open Privacy/Terms/Community/Refund/Support/Delete AR+EN from the app | All 6 doc types load AR+EN (server-rendered); Terms/Privacy/Refund open from the purchase surfaces | **CONFIRMS** live routes render (LEG-01/03, SEO-01; web build+render). **DEVICE-ONLY:** the in-app links open them on device; **all legal COPY is owner-gated** |
| FUNC-11 | UGC accept / report / block / moderate | Accept UGC terms on a write; report + block; confirm hidden/suspended content is filtered on reads | UGC writes require current-policy acceptance + pass the text filter; blocked/hidden/suspended state enforced on public reads | **CONFIRMS** UGC gate + read filtering (`ugc-enforcement.integration.test.js` 6, UGC-02/03). **DEVICE-ONLY:** the report/block/moderate UX; **`UGC_TERMS_ENFORCED` flips ON post client-rollout** (by design) |
| FUNC-12 | Upload scanning rejects spoofed/executable content | Attempt to upload a spoofed-MIME / executable / script file | Rejected by magic-byte allowlist + fail-closed policy (indeterminate/no-scanner ⇒ reject) | **CONFIRMS** upload scan (`upload-scan.test.js` 11, UGC-04). **DEVICE-ONLY / infra:** real ClamAV + quarantine bucket = EXTERNAL §6 (pluggable interface done) |
| FUNC-13 | Offline / slow network / retry / error states | Toggle airplane mode / throttle during purchase + core flows | Graceful offline/slow handling; purchase `pending` polls to a **refreshable pending** (never false success, never hard fail); cancellation ≠ error | **CONFIRMS** `usePurchaseFlow` pending/refresh/cancel handling (`usePurchaseFlow.js:110-153`; `reconcileState` success only on active/fulfilled/consumed). **DEVICE-ONLY:** real offline/slow-network behavior |
| FUNC-14 | Accessibility / RTL / iPad / Android tablet matrix | Run core + purchase + legal screens on iPad (portrait+landscape) + Android tablet with a11y (Dynamic Type / TalkBack) | Layouts correct at tablet sizes; legal screens support Dynamic Type without clipping; a11y roles present | **CONFIRMS structure** (LEG-02 header a11y + Dynamic Type; CFG-07 item 8 iPad orientations). **DEVICE-ONLY:** actual iPad/tablet layout + screen-reader behavior |
| FUNC-15 | No Moyasar / card / SAR-subtotal on native; store-only price | Inspect every native purchase surface | Native shows **store package price only**; **no** Moyasar method, SAR subtotal, discount line, or combined total; Manage-Subscription/Restore only for subscriptions | **CONFIRMS** store-only price (MOB-03; store catalog **omits price**, CAT-04; `resolvePurchasable` from RC package). **DEVICE-ONLY:** visual confirmation no web-checkout artifact leaks into native |
| FUNC-16 | Symbolicated Sentry crash with PII scrubbed | Trigger a test crash on the RC build | Crash appears symbolicated (release `halla@1.0.0`, correct `dist`), `sendDefaultPii:false`, email/ip/username scrubbed | **CONFIRMS config** (CFG-07 item 17; requires Sentry EAS secrets §3). **DEVICE-ONLY:** real symbolicated crash needs the signed build + uploaded symbols |

---

## 10. DECISION-RECORD invariant mapping (what MUST hold on-device)

Each signed invariant, the backend evidence that proves its **code half**, and the QA rows +
DEVICE-ONLY enforcer that confirm it in sandbox.

| Invariant (signed) | Backend evidence (code half — already verified) | On-device confirmation | Enforced-on-device by |
|---|---|---|---|
| **Single active subscription** (`repurchasePolicy: single_active_subscription` on all 14 subs) | Manifest flag in `storeCatalog.generated.json`; reducer EXPIRATION `still_active_newer_replacement → ignore` (`revenuecat-reducer.test.js:178`) — never revokes a newer replacement | `SBX-RST-03`, `SBX-CHG-*` | The **store subscription group** (one active per group) — created by **MCP-02/04**; verified only on device |
| **Keep-with-original transfer / no dual access** (DEC-04) | reducer TRANSFER → MANUAL_REVIEW (`revenuecat-reducer.test.js:246`); webhook TRANSFER parked (`billing-webhook.integration.test.js:151`); post-deletion tombstone → `account_deleted` (`revenuecat-post-deletion.test.js`) | `SBX-RST-04` (A→B) | The **RevenueCat project transfer-behavior = "Keep with original App User ID"** setting (**MCP-04**); the "no dual access" is provable only with two real accounts on device |
| **Design add-on non-refundable from creation** (DEC-03L) | design store-forced refund recorded, **work not undone**, `refundReason:"store_forced_refund_non_refundable_policy"`, status stays `paid` (`billing-fulfillment.integration.test.js:122-129`) | `SBX-ADD-05` | Backend reconciles a store-forced refund; **DEVICE-ONLY:** actually forcing the store refund on a consumable-service product; design template never presented as restorable |
| **Business first self-serve by exact code** (DEC-02 / MOB-04) | `checkout.service.js` drops the no-sub business block (audience gate kept); exact-code `isCurrent` (`currentPlan.test.js`, P0-12); eligibility business-yes/personal-no (`revenuecat-reconcile-exact.test.js:66-69`) | `SBX-SUB-11`, `FUNC-03` | **DEVICE-ONLY:** a real business account completes its first purchase; a personal account is blocked by the audience gate |
| **Event exact-reconcile (+ Android null-orderId fallback)** | `deriveExactState` never succeeds from unrelated access (`revenuecat-reconcile-exact.test.js:50-54`, P0-02); event fallback newest-unused + caller-scoped + cross-account negative (`revenuecat-event-fallback.test.js` 9) | `SBX-EVT-01`, `SBX-EVT-02`, `SBX-AND-01` | **DEVICE-ONLY:** producing a real Android null-orderId; confirming the fallback resolves it and never crosses accounts |
| **Add-on Android null-orderId → refreshable pending** | add-ons stay txn-only (no event-style fallback, by design); `usePurchaseFlow.refresh` re-polls (`usePurchaseFlow.js:141-153`) | `SBX-AND-02` | **DEVICE-ONLY:** a real null-orderId add-on purchase resolving via refresh (or the webhook catching up) |

---

## 11. Prerequisite chain (exact order the owner must satisfy to run this matrix)

1. **SEC-01** — rotate/untrack/purge exposed secrets (owner; `SEC-01-OWNER-RUNBOOK.md`).
2. **ART-IOS / ART-AND** — Apple Developer + ASC API key + EAS + macOS/Xcode → signed **IPA** to
   TestFlight; Play Console + service-account + EAS → signed **AAB** to internal track; inspect
   artifacts (`SIGNED-BUILD-RUNBOOK.md` §5/§6).
3. **MCP-02/03/04** — create the **54 products/platform**, the **4 RevenueCat offerings**, the
   single `recurring_access` entitlement (14 subs only), the webhook; set transfer behavior =
   "Keep with original App User ID" (`PROVIDER-CONFIG-RUNBOOK.md`).
4. **MCP-05** — **zero-drift readback** (§8): counts/ids/types/prices/offerings, and the
   load-bearing per-product `console_entitlement == manifest.revenueCatEntitlementId` (exactly 14
   subs carry `recurring_access`, 0 consumables/add-ons do).
5. **Backend config** — `NATIVE_BILLING_ENABLED=true` + all RevenueCat secrets so `/health/ready`
   is green (BILL-10); catalog `1.0.0` / the frozen SHA-256.
6. **Sandbox accounts + devices** — Apple Sandbox testers, Google license testers; current iPhone,
   minimum-iOS iPhone, iPad (portrait+landscape), Android phone, Android tablet.
7. **Reviewer accounts** — seed personal/business/vendor (REV-01) with env-only passwords.
8. **Run this matrix** — execute every `SBX-*` and `FUNC-*` row, filling the §0.2 capture set; each
   failed row → a tracked bug with retest evidence → then `GO-01` (second-person review) / `GO-02`
   (owner submission approval).

---

## 12. Row inventory (mechanical tally)

| Category | Prefix | Rows |
|---|---|---|
| Subscription lifecycle | `SBX-SUB-*` | 11 |
| Event consumables | `SBX-EVT-*` | 6 |
| Add-ons | `SBX-ADD-*` | 7 |
| Subscription changes | `SBX-CHG-*` | 4 |
| Restore / reinstall / multi-device / transfer | `SBX-RST-*` | 4 |
| Webhook duplicate/concurrent/out-of-order/outage | `SBX-WHK-*` | 7 |
| Android null-orderId edge | `SBX-AND-*` | 3 |
| Offers / promo | `SBX-OFR-*` | 2 |
| Functional sweep | `FUNC-*` | 16 |
| **Total** | — | **60** |

**Confirms vs DEVICE-ONLY split — a DISJOINT partition of all 60 rows (57 + 3 = 60).** Every row's
purchase/runtime act is DEVICE-ONLY regardless; a row is placed by whether a **committed test locks
its LOAD-BEARING claim** (not merely whether some adjacent test exists):

- **Confirms — committed code-verified test locks the row's core logic: 57.** All `SBX-SUB-*` (11),
  `SBX-EVT-01/02/04/05/06` (5), `SBX-ADD-*` (7), `SBX-CHG-*` (4), `SBX-RST-*` (4), `SBX-WHK-*` (7),
  `SBX-AND-*` (3), `SBX-OFR-02` (ledger-only), and `FUNC-01..06, 08..16` (15). Each cites the exact
  test/file that proves its backend half.
  - **Six of these keep a per-row DEVICE-ONLY *caveat* in the row text** (the caveat does **not** move
    the row, because the row's primary logic *is* tested): `SBX-CHG-01..04` — mode **selection** is
    tested (`changeMode.test.js`) but StoreKit/Play **proration amount + timing** is DEVICE-ONLY;
    `SBX-RST-03` — single-active manifest flag + reducer ignore-newer is tested but the **store
    subscription-group** enforcement is DEVICE-ONLY/console; `SBX-RST-04` — TRANSFER→manual_review is
    tested but the **"no dual access" project setting** is DEVICE-ONLY/console.
  - Rows whose logic leans on the **stubbed** canonical snapshot (`SBX-SUB-04/06/10`, `SBX-CHG-*`,
    `SBX-WHK-04`) confirm the reducer/controller branch; the **real provider snapshot round-trip is
    DEVICE-ONLY** (caveat in the row text). They stay in "confirms" because the branch logic is tested.
- **DEVICE-ONLY first-verification — NO committed test locks the load-bearing claim: 3.** `SBX-OFR-01`
  (offers have no backend contract), `FUNC-07` (push — no billing contract), and **`SBX-EVT-03`** (the
  `unused→consumed` **first-send trigger** at `messaging.send.service.js:306-314` is **untested** — the
  committed tests cover only the state *mapping* and the fallback's consumed-exclusion, per trap #2).
  `FUNC-04` shares the same untested trigger and cross-references `SBX-EVT-03` (it is not double-counted;
  its own row is a functional-sweep confirm for the surrounding event lifecycle).

> Framing note (per §0.1): **no row is "fully proven by tests"** — every row's purchase/runtime act is
> DEVICE-ONLY. The 57 "confirms" rows mean *the backend interpretation is already code-verified, so
> on-device is a confirmation of the store's real emission, not the first test of the logic* (several
> carry an explicit per-row DEVICE-ONLY caveat for timing/enforcement/snapshot). The 3 DEVICE-ONLY rows
> have **no** prior backend proof for their load-bearing claim and are genuinely first-verified in sandbox.

---

**End state:** `BLOCKED_NEEDS_OWNER` — the matrix is authored and every row is grounded in the
implemented backend/mobile contract, but **execution requires signed builds (ART-\* BLOCKED),
provider console configuration (MCP-\* BLOCKED), real devices, and Apple/Google sandbox accounts**,
none of which exist in this environment. **No QA evidence was invented; no source was touched.**
Nothing here reaches `SANDBOX_VERIFIED`.
