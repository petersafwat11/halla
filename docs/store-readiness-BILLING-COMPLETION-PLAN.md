# Halaa native billing completion plan — backend, mobile, plans, and add-ons

**Executor:** Claude Code  
**Scope:** StoreKit/Apple IAP + Google Play Billing through RevenueCat, with Moyasar remaining web-only.  
**Release rule:** do not create irreversible production product IDs until Phase 0 is signed off. Do not mark billing complete until the full sandbox matrix passes on both stores.

## 0. Required outcome

At completion:

1. Personal hosts can buy every approved basic/premium per-event and monthly plan.
2. Business hosts can buy exactly the approved self-serve business plans, including a first plan if D8 remains “maximum native parity.”
3. Vendors, guests, moderators, admins, and super-admins cannot buy or receive host/business store products.
4. Every approved add-on has a defined store type, eligibility rule, fulfillment rule, repurchase rule, refund rule, and reconciliation proof.
5. Web uses Moyasar; iOS/Android expose no Moyasar/card/STC/Apple-Pay-web checkout for digital goods.
6. Local access is derived from transaction-scoped, canonical provider state; webhook retries/out-of-order events never double-grant or revoke unrelated access.
7. Prices, periods, renewal language, and offers shown in native UI come only from the store/RevenueCat product object.

## Phase 0 — freeze the commercial catalog

### 0.1 Resolve the six-tier vs ten-tier contradiction

Use `docs/plans-rewrite-2026-05.md` as the prior approved intent unless the owner explicitly supersedes it.

Recommended catalog:

- Invite tiers for `basic_event`, `basic_monthly`, `premium_event`, `premium_monthly`, `business_event`: `25, 50, 75, 100, 150, 200, 250, 300, 350, 400`.
- Recurring business: `business_quarterly`, `business_annual`.
- Not sold: `trial`, `unlimited`.
- Total sellable plans: 52 (30 event consumables + 22 recurring subscriptions).
- Current add-ons: 16 extra-invite tiers + 5 design tiers + 1 business customization = 22.
- Maximum-parity total: 74 store products per platform.

If the owner chooses the current six-tier catalog instead, document that it intentionally supersedes the older rewrite. Never infer this from current code.

### 0.2 Create one canonical machine-readable catalog

Add `shared/commerce/storeCatalog.js` (or JSON if runtime-neutral) containing, per item:

- `internalCode`
- `kind`: `subscription | event_consumable | addon_consumable | addon_nonconsumable`
- `audience`: `personal_host | business_host`
- `family`, `billingPeriod`, `inviteTier`
- `iosProductId`
- `androidProductId`
- `androidBasePlanId` for subscriptions
- RevenueCat `packageLookupKey`
- RevenueCat recurring `entitlementId` or `null`
- AR/EN display name and short description
- backend fulfillment handler
- eligibility and repurchase policy
- refund/reversal policy
- active/deprecated state

Generate from this source:

- backend product maps
- a console import/export manifest
- a human Markdown SKU matrix
- mobile lookup keys/types
- test cases asserting full coverage

Do not hand-maintain JSON environment maps for 74 products. If environment variables remain, generate and validate them from the manifest at deploy time.

### 0.3 Define add-on semantics before product creation

Owner/legal/product must sign this table:

| Add-on | Recommended type | Required decision |
|---|---|---|
| Extra invites | consumable | applies to which subscription/event; repeatable; unused refund clawback |
| Ready-made design | consumable if one deliverable per event; otherwise non-consumable | lifetime, event scope, reuse, restore behavior |
| Custom male/themed/animated/3D | consumable service deliverable | fulfillment SLA, status, cancellation/refund before/after work starts |
| Business customization | non-consumable per organization or web-only managed service | permanent entitlement vs repeat purchase; provisioning SLA; refund behavior |

RevenueCat notes that consumables attached to an entitlement unlock it forever. Therefore no consumable/add-on may be attached to the recurring-access entitlement.

## Phase 1 — catalog parity in application code

### 1.1 Restore/confirm all plan codes

Update together:

- `labbe-backend-/src/shared/constants/plans.js`
- `labbe-backend-/src/shared/constants/planDefaults.js`
- `labbe-backend-/scripts/seedPlans.js`
- backend validation/Swagger/admin plan management
- web pricing/checkout
- mobile personal and business selectors
- tests and documentation

Acceptance queries:

- Exact expected total and per-family counts.
- No stale `business_event_500`.
- API returns numeric sort order and every tier.
- Web/mobile render every tier without hardcoded omissions.
- Store manifest has exactly one active entry for every sellable code and none for trial/unlimited.

### 1.2 Enforce audience on every server grant

Create a shared `assertProductEligible(user, catalogItem, currentState)` and call it from:

- RevenueCat subscription/event grant
- RevenueCat add-on grant
- web checkout
- restore/replay/admin reconciliation

Matrix:

| User | Personal plans | Business plans | Host add-ons | Business add-ons | Store billing |
|---|---:|---:|---:|---:|---:|
| personal host | yes | no | approved subset | no | yes |
| business host | no | yes | only explicitly shared extras | yes | yes |
| vendor | no | no | no | no | no |
| guest | no | no | no | no | no |
| moderator/admin/super-admin | no | no | no | no | no; admin entitlement remains internal |

Unknown/ineligible products must dead-letter with an alert and a refund-support task; never silently grant.

### 1.3 Resolve business first purchase

Because D8 says self-serve business parity, implement the recommended behavior:

- Eligible, completed, approved business-host account may purchase its first simplified native business plan.
- Store price excludes web-only setup fees/quotes/tax lines exactly as disclosed.
- Managed/negotiated contracts remain web/admin only and are not represented by the self-serve SKU.
- Remove the `hasActiveSubscription` lock for eligible native first purchase.
- Compare current plan by plan code/product, not `planType`.
- Show invite-tier selection for business event plans.

If product decides admin-first instead, remove all initial native business purchase claims and ensure only currently eligible upgrade products are offered.

## Phase 2 — RevenueCat webhook as an idempotent state machine

### 2.1 Validate the envelope strictly

In production require and validate:

- `api_version` allowlist
- `event.id`
- `event.type` allowlist
- `app_id === REVENUECAT_APP_ID`
- `environment === REVENUECAT_ENVIRONMENT`
- allowed `store`
- `app_user_id`/`original_app_user_id`/aliases
- expected recurring `entitlement_ids`
- product exists in canonical catalog and is valid for the event type
- transaction/original-transaction IDs when required

Persist authenticated invalid/mismatched events as `ignored`/`dead_letter` with reason; do not discard before the durable record.

### 2.2 Add processing ownership and replay safety

Extend `RevenueCatEvent` with:

- `processing`, `attemptCount`, `leaseUntil`, `lastAttemptAt`
- payload schema version/hash
- provider event timestamp and transaction timestamp
- resolution history

Atomically claim an event before processing. Use a Mongo transaction where supported for event state + entitlement/payment/add-on changes. A simultaneous retry must not run the grant twice.

Provide staff-only endpoints/CLI for:

- list dead letters
- inspect redacted payload and resolved catalog item
- replay after mapping/config correction
- mark resolved with actor/reason

Add alerting for dead letters, repeated 5xx, mapping misses, and snapshot failures.

### 2.3 Implement a pure lifecycle reducer

Separate provider interpretation from database writes. Inputs:

- webhook event
- exact catalog item
- current local entitlement state
- canonical RevenueCat subscriber snapshot
- transaction lineage

Output explicit actions such as:

- `GRANT_NEW`
- `RENEW_AND_REFILL`
- `CHANGE_EFFECTIVE_NOW`
- `CHANGE_DEFERRED_NOOP`
- `SET_CANCEL_AT_PERIOD_END`
- `CLEAR_CANCEL_FLAG`
- `SET_BILLING_ISSUE`
- `EXTEND_EXPIRY`
- `REVOKE_EXACT_TRANSACTION`
- `REFUND_EVENT_IF_UNUSED`
- `REFUND_ADDON`
- `RESTORE_REVERSED_REFUND`
- `MANUAL_REVIEW`

Unit-test the reducer without Mongo.

### 2.4 Correct event behavior

- `INITIAL_PURCHASE`: grant exact item once.
- `RENEWAL`: recurring only; refill once for the new period; use store expiry.
- `PRODUCT_CHANGE`: informational until canonical effective product changes.
- `UNCANCELLATION`: clear flags only; no refill.
- `CANCELLATION`: branch on `cancel_reason`; voluntary cancel retains access, refund/customer-support cancellation reconciles canonical active state and revokes only the affected item.
- `EXPIRATION`: revoke only the transaction/product that is inactive; never revoke a newer replacement.
- `BILLING_ISSUE`/grace: preserve access until canonical expiry; record grace deadline.
- `SUBSCRIPTION_PAUSED`: no immediate revoke; revoke on the matching expiration.
- `SUBSCRIPTION_EXTENDED`: exact subscription only.
- `NON_RENEWING_PURCHASE`: event/add-on/non-consumable grant only.
- `REFUND_REVERSED`: restore exact item only when canonical proof permits.
- `TRANSFER`: implement the approved identity-transfer policy; do not leave as a permanent manual dead letter.
- `TEMPORARY_ENTITLEMENT_GRANT`: define whether Halaa honors the temporary recurring grant; if yes, time-limit it and reconcile the later initial-purchase/expiration.
- `TEST`: persist/ignore without product grants unless using a dedicated test route/environment.
- unknown types: ignored + observable metric, never accidental grant.

### 2.5 Make canonical snapshot mandatory for destructive changes

- Configure one explicit `REVENUECAT_RECURRING_ENTITLEMENT_ID`.
- Derive recurring state only from that entitlement.
- Validate its product against the recurring catalog.
- For destructive events, snapshot failure is retryable 5xx, not a fallback revoke.
- If using RevenueCat API v1 `GET /subscribers`, document the exact server key and rotation; never expose it to mobile.
- Preserve `price_in_purchased_currency` + `currency`; optionally preserve USD estimate separately.

### 2.6 Transaction-scoped persistence

Use explicit fields and indexes:

- `providerTransactionId` unique per provider/store
- `originalTransactionId`
- `storeProductId`
- `catalogCode`
- `periodStart/periodEnd`
- `purchaseState/refundState`
- `revenueCatEventId`
- `environment`

Do not locate the affected subscription with “first active store subscription.” Locate it through original transaction/product lineage.

## Phase 3 — event entitlements

### 3.1 One purchase, one durable grant

- Unique transaction index before checking existence.
- No expiry unless product/legal explicitly defines one.
- `unused -> consumed` only after the first successful invitation send.
- Consumption update is in the same durable workflow as the authoritative first-send stamp, with reconciliation if either side fails.
- A refund before use revokes the event access subscription and marks the ledger refunded.
- A refund after use follows the approved policy but must not erase audit history.

### 3.2 Enforce purchase preflight

Add an authenticated endpoint returning per requested catalog code:

- eligible/ineligible
- reason code
- current active/unused product
- allowed replacement action

Mobile must call immediately before the store sheet. Backend still honors a legitimate delivered transaction; a race becomes a deterministic credit/refund workflow.

### 3.3 Restore semantics

Consumables are not reliably restored by store receipt history. The authenticated Halaa backend ledger is authoritative for unused/consumed event packages. On reinstall/login, reconcile the backend ledger; do not promise Restore Purchases will recreate consumed consumables.

## Phase 4 — add-on fulfillment

### 4.1 Make grant atomic and observable

- Add first-class unique `providerTransactionId` to `AddonModel`.
- Resolve and require the exact target subscription/event/organization before creating `active`.
- Apply quota and create ledger/add-on within a transaction.
- If fulfillment fails after charge, set `failed_quota`/`refund_required`, alert operations, and expose status to the customer.
- Do not swallow quota errors or treat missing `subscriptionId` as success.

### 4.2 Add standalone add-on management

The current copy says failed add-ons can be bought later, but there is no proven standalone native flow. Add:

- “Add-ons” screen for eligible active plans
- store-sourced price per item
- preflight per item
- one store sheet per charge with explicit confirmation
- exact-item post-purchase reconciliation
- fulfillment status/history
- retry only for items not purchased

Never present a single combined store total when charges are separate.

### 4.3 Refund/reversal rules

- Extra invites: track grant delta and usage attribution. Remove only unused delta; never make allowance lower than consumed count.
- Design/customization services: state machine `paid -> queued -> in_progress -> fulfilled`; refund eligibility depends on approved policy/state.
- Non-consumable: restore access, prevent repeat offer, support reversal.
- Reversed refund: restore the exact delta/service state once.

## Phase 5 — mobile purchase UX and Google replacement flow

### 5.1 Preserve the full RevenueCat purchase result

`purchasePackage()` must return `customerInfo` plus store transaction/product identifiers when available. Do not discard correlation fields.

### 5.2 Exact reconciliation contract

Replace generic `hasBackendAccess` polling with:

`POST /payments/revenuecat/reconcile`

Request:

- expected catalog code
- expected platform product identifier
- transaction identifier when available
- operation: purchase/restore/change/add-on

Response:

- `state: pending | active | consumed | refunded | failed | manual_review`
- exact local entitlement/add-on/payment IDs
- exact effective product and expiry
- pending change if any
- user-safe reason and retry guidance

Only `active` for the exact expected purchase produces success.

### 5.3 Subscription changes

- Determine current RevenueCat/Play product from CustomerInfo/backend.
- Classify plan ordering from catalog, not price strings.
- iOS: rely on subscription-group level behavior and reconcile effective product.
- Google: pass `oldProductIdentifier` and an owner-approved replacement mode.
- Recommended default: immediate upgrade with proration; deferred downgrade; period crossgrade reviewed explicitly.
- Show when a deferred plan becomes effective.

### 5.4 Accurate native presentation

For recurring products show:

- localized store price
- billing period
- whether it renews automatically
- trial/intro/offer eligibility and post-offer price
- cancellation timing
- clickable Terms, Privacy, Refund/Subscription policy
- Restore and platform-specific Manage Subscription

For event/add-on one-time products show:

- one-time wording
- exact store price for each charge
- what is consumed/fulfilled and when
- no Manage Subscription action

Remove/hide every backend SAR subtotal, discount, Moyasar method, and combined total from native checkout.

### 5.5 Offerings/catalog retrieval

Do not depend on a giant, manually curated `current` offering without validation. Recommended:

- RevenueCat offerings: `host_plans`, `business_plans`, `host_addons`, `business_addons`.
- Mobile indexes all approved offerings by canonical package lookup key.
- CI/export verifier confirms one iOS and one Android product per package.
- A missing/multiple package is a hard unavailable state with telemetry.

## Phase 6 — production configuration and readiness

Add validated configuration:

- `NATIVE_BILLING_ENABLED`
- `REVENUECAT_WEBHOOK_AUTH`
- `REVENUECAT_API_KEY`
- `REVENUECAT_APP_ID`
- `REVENUECAT_ENVIRONMENT`
- `REVENUECAT_RECURRING_ENTITLEMENT_ID`
- catalog manifest version/hash
- RevenueCat iOS/Android public keys in EAS only

When native billing is enabled, `/health/ready` must fail if any value, catalog coverage, or DB index is missing. Log only variable names/reasons, never secret values.

## Phase 7 — automated tests

Minimum required tests:

### Catalog contracts

- exact code/count/type/audience coverage
- unique product IDs and package lookup keys
- Android subscription IDs include `productId:basePlanId` mapping in RevenueCat
- no trial/unlimited store entries
- no consumable attached to recurring entitlement

### Webhook reducer

- initial, renewal, voluntary cancel, refund cancel reason, expiration
- billing issue/grace/recovery
- pause/resume/extension
- un-cancellation without refill
- immediate upgrade/deferred downgrade
- refund reversal
- transfer and temporary grant policy
- duplicate, concurrent duplicate, out-of-order, unknown product/user/store/app/environment
- snapshot outage on destructive event
- SAR money field correctness

### Entitlement/add-on integration

- event purchase/consume/refund before/refund after use
- recurring active + event race
- add-on missing target, quota failure, replay, refund, reversal
- role/account-type eligibility

### Mobile

- exact reconciliation cannot pass on trial/old plan
- event preflight blocks second purchase
- store prices only
- Google replacement params
- restore/reinstall/account switch
- add-on partial/cancel/retry states

## Phase 8 — sandbox matrix and evidence

Execute on both Apple Sandbox/TestFlight and Google license-test/internal track:

- new personal host purchase for every product kind
- new business first purchase and each change path (if approved)
- renewal/refill exactly once
- voluntary cancellation with access retained
- expiration
- billing failure, grace, recovery
- pause/resume (Google)
- upgrade, downgrade, crossgrade
- restore/reinstall/multi-device
- account A -> B switch under approved transfer policy
- refund and reversal for subscription, event package, and every add-on class
- duplicate/concurrent/out-of-order webhooks
- webhook/API outage and retry
- unused event second-purchase guard
- first-send consumption
- add-on failure/refund queue
- store offer/promo redemption

For every row save: device/platform/build, store transaction, RevenueCat customer/event, backend event/payment/entitlement IDs, before/after allowances, screenshot/video, expected vs actual, tester/date.

## Completion gate

Billing is accepted only when:

- catalog manifest is signed and console exports diff cleanly;
- all P0 findings in `store-readiness-REVIEW-FINDINGS.md` are closed;
- targeted tests pass in CI;
- both sandbox matrices pass;
- signed IPA/AAB artifact checks pass;
- finance/legal approve product descriptions, pricing, tax categories, refund behavior, and subscription disclosures;
- a second reviewer validates the evidence packet.
