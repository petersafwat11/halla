# Path B (native subscriptions) — implementation design for §9.2/§9.3/§9.4

**Status:** ready to implement (Tasks 11–13). Foundation (Task 10: `billingUserId`
+ RC identity) is DONE. This spec is executable; it also depends on the EXTERNAL
RevenueCat/App Store/Play product + sandbox config (EXTERNAL-STEPS §3) to test.

Decision context: **D8 = max parity** — sell ALL host plans (event consumables +
monthly subs, every tier) + simplified self-serve business tiers (quarterly/
annual subs, business_event consumable; setup fee waived in-app) + ALL add-ons.
Discounts via store offer codes only. In-app rail = RevenueCat→StoreKit/Play
Billing; Moyasar stays web-only. Event packages are GUARDED CONSUMABLES (no
force-cancel, no 90-day auto-expiry, block 2nd purchase until consumed).

---

## Task 11 — durable webhook ingestion + canonical reconciliation (§9.2)

**New model `models/RevenueCatEventModel.js`** (idempotency + dead-letter + audit):
- `eventId` (unique, required) ← RC `event.id`; the dedupe key.
- `type`, `appUserId`, `aliases[]`, `productId`, `store`, `environment`
  (`SANDBOX`/`PRODUCTION`), `apiVersion`, `rawPayload` (Mixed),
  `status` (`received|processed|dead_letter`), `error`, `processedAt`.
- Unique index on `eventId`. Insert-first; a duplicate insert (E11000) → return
  2xx without reprocessing.

**Rewrite `revenuecat.controller.js`** to: authenticate → validate envelope
(`api_version`, `app_id`, `environment`, store, entitlement id, product mapping,
user/aliases) → **insert the unique event** (dup → 2xx) → enqueue → return 2xx.
Processing is a separate idempotent function (`revenuecat.service.processEvent`).
Separate sandbox vs production (config: `REVENUECAT_ENVIRONMENT`); never let a
sandbox event grant production access.

**RevenueCat API client `revenuecat.api.js`** (server secret `REVENUECAT_API_KEY`):
`getSubscriber(appUserId)` → GET `/subscribers/{id}`. After any lifecycle event,
fetch the subscriber snapshot and derive local access from the **canonical active
entitlement + expiry**, NOT from the event type alone.

**Provider-neutral ledger** — extend `PaymentModel`:
- add `provider` (already defaults moyasar; allow `revenuecat`/`appstore`/
  `playstore`), `providerTransactionId` (unique sparse), `originalTransactionId`,
  `store`, `productId`, `environment`, `purchasedAt`, `expiresAt`, `rcEventId`.
- Write ONE ledger row per INITIAL_PURCHASE/RENEWAL; an auditable refund update
  on REFUND. Unique index on `providerTransactionId`.

**Subscription provider fields** — extend `SubscriptionModel`: `provider`,
`storeProductId`, `storeOriginalTransactionId`, `storeExpiresAt`,
`storeAutoRenewStatus`, `cancelAtPeriodEnd`. Add unique sparse index on
`metadata.rcEventId` (defense-in-depth dedupe).

**Event behavior table (process by canonical snapshot, not event type alone):**
| Event | Behavior |
|---|---|
| INITIAL_PURCHASE / RENEWAL | sync snapshot; grant/extend to `expiration_at_ms`; ledger paid row; renewal runs the pool-reset (`Subscription.renew()`) |
| CANCELLATION | set `cancelAtPeriodEnd`/auto-renew off OR record refund — **do NOT revoke** (access lasts to expiry) |
| BILLING_ISSUE | flag grace/issue — **do NOT revoke** while entitlement active |
| SUBSCRIPTION_PAUSED | record scheduled pause — **do NOT revoke** until EXPIRATION |
| EXPIRATION | revoke only when canonical entitlement is inactive |
| UNCANCELLATION | clear `cancelAtPeriodEnd` — **do NOT** mint a new period/pool |
| PRODUCT_CHANGE | record scheduled/effective product using `new_product_id`; sync |
| SUBSCRIPTION_EXTENDED | update expiry only |
| REFUND_REVERSED | reverse refund state + sync |
| TRANSFER | reconcile every source/destination id; prevent dual access |
| TEMPORARY_ENTITLEMENT_GRANT | mark temporary; expire from canonical ts |
Unknown user/product/invalid mapping → `dead_letter` + alert; never silently drop.

---

## Task 12 — consumable event entitlements + full catalog SKUs (§9.4)

**New model `models/EventEntitlementModel.js`** (provider-neutral consumable):
- `userId`, `planCode`, `source` (`revenuecat`/`moyasar`), `providerTransactionId`
  (unique sparse), `invitePool`, `status` (`unused|consumed|refunded`),
  `consumedEventId`, `consumedAt`, `purchasedAt`. NO `expiresAt`-driven auto-expiry.
- A store **event purchase** (NON_RENEWING_PURCHASE / consumable product) creates
  an `EventEntitlement{status:unused}` — NOT via `changePlan()` (which cancels
  priors). Recurring plans keep using `subscriptionLifecycle.changePlan`.

**Guards:**
- Block a second event purchase while an `unused` entitlement exists (client
  hides the product; backend reconcile rejects with `EVENT_ENTITLEMENT_PENDING`).
- Mark `consumed` on the first successful event send (hook into the existing
  `firstSendAt` consumption path in `messaging.send.service.js` /
  `events.resend.service.js`): when a per-event send happens and the active
  access is a store EventEntitlement, set `status:consumed` + `consumedEventId`.
- Refund before use → `status:refunded` (revoke); refund after use → ledger
  refund row, entitlement already consumed (no clawback of a sent event).
- Reinstall/restore for consumables relies on the **backend ledger**, not a
  permanent RevenueCat entitlement.

**Catalog → store SKU matrix** (generate `docs/store-readiness-SKU-matrix.md`):
for every Plan in `planDefaults.js` + every Addon tier, list `{ planCode/addonCode,
storeProductId (ios+android), type: subscription|consumable, priceTier }`. Wire
`REVENUECAT_PRODUCT_PLAN_MAP` to cover ALL of them. Types:
- personal monthly + business quarterly/annual → auto-renewable subscriptions.
- *_event (basic/premium/business) → consumables.
- add-ons (extra invites, extra reminders, design templates, business custom) →
  consumables/non-consumables as fits.

---

## Task 13 — client paywall + post-purchase reconcile (§9.3)

`PlansSummaryScreen.js` + plan screens:
- Map store product → backend code explicitly (`iapProductId`); never rely on
  display names. Render RC `priceString`/period/trial/renewal/cancellation
  disclosure — **never** the backend SAR as the charged price. Hide the discount
  box (store offer codes only). Disable purchase when offering/package/identity
  unavailable (retry state, not a dead-end) — use `canPurchase()`.
- After purchase/restore: require the expected active entitlement (subs) or the
  returned transaction (consumables) in `CustomerInfo`, then call an
  authenticated backend **reconcile** endpoint (`POST /payments/revenuecat/reconcile`
  → fetch subscriber snapshot, apply same logic as the webhook, return the
  canonical subscription/entitlement) and WAIT for it before showing success.
  Do not optimistically navigate home.
- Include **Restore Purchases** + a store-specific **Manage/Cancel** action
  (deep link to store subscription manager). Handle pending, cancelled-by-user,
  offline, already-owned, refund, account-transfer.

**Acceptance:** store + RevenueCat histories reconcile exactly with Subscription
+ Payment rows across the §9.5 sandbox matrix; no user gains/loses access early;
amount/currency shown = charged = recorded.
