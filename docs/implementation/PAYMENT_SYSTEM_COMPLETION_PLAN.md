# Payment System Completion Plan

**Original date:** 2026-05-06
**Last reviewed:** 2026-05-07 (implementation-readiness pass — see §15)

> **Implementer:** Phases 1-4 are ready to copy-edit-paste, but **§15
> ("Implementation-readiness corrections") supersedes specific snippets
> in §4-§7**. Read §15 first; it lists the runtime bugs that would crash
> the build if you applied the older sections verbatim, with the corrected
> code inline. Anywhere §15 contradicts an earlier section, §15 wins.

---

## 0. How to use this document

This plan supersedes earlier drafts. It has been reconciled against the
actual codebase (not the assumed shape from earlier notes). Where
the earlier draft was wrong, the differences are called out in **§1.2**
so the reader can see what changed and why.

The plan is organised so that an implementer can work top-to-bottom and
ship one phase at a time without breaking what is already in production.
Every new file is given in full. Every modification is anchored to the
existing line range so the diff is unambiguous.

Key contracts that **must not** be re-litigated by the implementer:

- **Amounts** are passed to the payment provider as **SAR major units**
  (e.g. `29.99`). The provider converts to halalas internally. See
  `paymentProvider/moyasar.js` `sarToHalalas`.
- **Idempotency** is a two-layer system: route-level middleware
  (`shared/middleware/idempotency.js`) + utility wrap on outbound calls
  (`shared/utils/idempotency.js withIdempotency`). Both are keyed by
  `{ userId, scope, key }`. New webhook dedup must reuse this — do not
  invent a parallel mechanism.
- **API prefix is `/api/v2`**. The legacy `/api` prefix was removed in
  Phase 5 (FLOW-01-F05). New routes mount under `/api/v2/...`.
- **RBAC** uses `requirePageAccess(ADMIN_PAGES.PAYMENTS, 'view'|'edit'|'full')`
  + `filterByWhitelabel`. Do not use raw `restrictTo(...roles)` for
  admin payment endpoints — the page-permission system is what the UI
  reads to render menu items.
- **Cron jobs** are registered inside
  `src/shared/utils/scheduledTasks.js initScheduledTasks()`, not in a
  free-standing `src/jobs/` directory. Multi-instance deploys are
  protected by `cronLease` (claim a short-lived lease keyed on a cron
  name; only the winning node runs).
- **Web frontend lives at `labbe/`**. The mobile app is `halla-mobile/`
  (separate Expo/React-Native project, not in scope here). Earlier
  drafts mistakenly mixed paths — every frontend path in this plan is
  rooted at `labbe/`.
- **Pending-refund audit trail already exists** (subscription:
  `subscriptions.service._recordPendingRefund`; addons:
  `addons.service._recordPendingRefund`). The new Payment-model writes
  hook **into** this flow, not around it.

---

## 1. Current state

### 1.1 What is in place (verified)

- **Provider abstraction** at `labbe-backend-/src/infrastructure/paymentProvider/`:
  - `moyasar.js` — real provider, `charge()` only; `refund()` returns
    `{ success: false, error: "Refund flow not yet implemented" }`.
  - `stub.js` — synthetic-success provider for dev/CI; shares SAR
    validation with the real provider.
  - `index.js` — factory; chooses provider on `MOYASAR_API_KEY`
    presence; wraps `charge()` with `withIdempotency()`; computes a
    SHA256 `requestHash` over `{ amount, currency, paymentMethod, metadata }`.
- **Idempotency layer**:
  - `shared/utils/idempotency.js` — `withIdempotency(key, fn, opts)` for
    outbound work (charges, webhook handlers, cron); race-safe via Mongo
    upsert; per-user partition.
  - `shared/middleware/idempotency.js` — HTTP middleware reading
    `Idempotency-Key` header; same model + state machine.
  - `models/IdempotencyKeyModel.js` — `{ userId, scope, key }` unique;
    24h TTL; `{ status, requestHash, response: { status, body } }`.
- **Subscription purchase flow**
  (`src/modules/subscriptions/subscriptions.service.js subscribe()`,
  `changePlan()`):
  - Calls `paymentProvider.charge` with `userId`, derived
    idempotency key (`subscribe:${userId}:${plan.code}:${planPrice}`),
    metadata.
  - **Cancel-after-charge (B-3)**: snapshots existing active
    subscriptions, charges, then cancels old subs only on success.
  - **Pending-refund audit (HIGH-6)**:
    `subscriptions.service._recordPendingRefund()` writes an audit row
    + admin notification when a charge succeeds but the subscription
    record fails to land.
  - Stores `paymentTransactionId` in `subscription.metadata`.
- **Addon purchase flow**
  (`src/modules/addons/addons.service.js purchaseAddon()`):
  - Same charge pattern with `userId`, derived key
    (`addon:${userId}:${addonType}:${scope}:${eventId}:${price}`).
  - **Pending-refund audit (B-4)**:
    `addons.service._recordPendingRefund()` for create-failed and
    quota-failed cases. The latter also flips the addon to
    `failed_quota` so reconciliation has a paper trail.
  - Stores `paymentTransactionId` and `idempotencyKey` in
    `addon.metadata`.
- **Admin payments page** (already shipped):
  - `GET  /api/v2/admin/payments` — list, filter, paginate.
    Backed by `Subscription` records (no separate Payment collection).
    See `admin.service.getPayments()`.
  - `GET  /api/v2/admin/payments/export` — Excel export.
    See `admin.service.exportPayments()`.
  - Both routes use `requirePageAccess(ADMIN_PAGES.PAYMENTS, 'view')` +
    `filterByWhitelabel`.
  - Frontend: `labbe/app/[lang]/admin-dash/payments/_components/AdminPaymentsClient.js`
    + `paymentsAPI` (path `/admin/payments`, `/admin/payments/export`,
    `/admin/payments/summary`, `/admin/payments/:id`).
- **Host payments page** (already shipped):
  - `GET /api/v2/subscriptions/payments` — current user's payment
    history, also derived from `Subscription` records.
  - Frontend: `labbe/app/[lang]/host/payments/_components/PaymentsClient.jsx`
    + hook `useMyPayments()`.
- **Cron infrastructure**:
  - `src/shared/utils/scheduledTasks.js initScheduledTasks()` — already
    bootstraps event-launch, expiry, retries, etc. Multi-instance safe
    via `cronLease`. **This is where new cron jobs go.**
- **`SubscriptionModel.paymentMethod`** (sub-document): `{ type, last4,
  brand, expiryMonth, expiryYear }` — schema present, never populated.
- **`subscription.getSummary()`** already surfaces
  `paymentTransactionId: this.metadata?.paymentTransactionId || null`.

### 1.2 Differences from the prior draft

| Earlier draft said | Actual codebase |
|---|---|
| "No card info stored" | `SubscriptionModel.paymentMethod` exists; just unpopulated. |
| New file: `src/jobs/paymentReconciliation.js` | Cron jobs are registered inside `scheduledTasks.js initScheduledTasks()`. |
| Mount `/api/v1/payments/...` | API prefix is `/api/v2/...`; mobile + web were migrated in Phase 1a (FLOW-01-F05). |
| "Webhook signature verification" (HMAC) | Moyasar uses a `secret_token` constant (sent in the webhook body or as a header configured per-webhook in the dashboard). There is no HMAC of the body. |
| Frontend at `labbe-mobile/` | Web frontend is at `labbe/`. `halla-mobile/` is the separate Expo app. |
| Create new admin payment endpoints | They already exist; this is a **migration** (move the underlying source-of-truth from `Subscription` to a new `Payment` collection while keeping both writable for one release cycle). |
| Use `Idempotency-Key` header on Moyasar charge | Moyasar's documented idempotency field is `given_id` in the request body (UUID v4). Current code passes an `Idempotency-Key` HTTP header which Moyasar **silently ignores** — the provider call is *not actually* idempotent on retries today. **This must be fixed.** |
| `_recordPendingRefund` not yet implemented | Already exists for both subscription and addon flows. New work integrates with it. |

### 1.3 Real gaps (P0/P1/P2)

| Gap | Priority | Where it bites |
|---|---|---|
| Moyasar webhooks not received → 3DS callbacks lost; status drift between Moyasar and Halla DB | **P0** | Real cards almost always require 3DS; today the user redirects, returns, and there is no async update. |
| `moyasar.charge()` uses `Idempotency-Key` header (Moyasar ignores) instead of `given_id` body field | **P0** | A network retry of the same charge can produce two real charges. |
| 3DS redirect not handled at all — `transaction_url` in the response is dropped, `callback_url` is never set | **P0** | All real card payments will fail or hang once the stub is replaced with a real key. |
| `moyasar.refund()` is a stub | **P0** | Operations cannot refund the existing `pending_refund` audit rows. |
| No webhook signature/secret-token check | **P0** | Endpoint, once exposed, is forgeable. |
| Single-row payment lifecycle — `Subscription.metadata.paymentTransactionId` is the only handle | **P1** | No way to record refund amount, capture/void state, or method for a payment that has detached from a subscription (e.g. a refunded purchase + re-subscribe). |
| No payment-method selection in checkout (creditcard / Apple Pay / STC Pay) | **P1** | Saudi market expects STC Pay; Apple Pay is table stakes for iOS. |
| No reconciliation cron — `pending_refund` audit rows pile up indefinitely | **P1** | Ops has no automated remediation; manual SQL/Mongo queries today. |
| `paymentMethod` sub-doc on subscriptions never populated | **P2** | History page cannot show the user "you paid with •••• 4242". |
| No saved-card tokenization | **P2** | Re-subscribe always asks for the card again. |
| No Moyasar coupons | **P2** | App-level discounts work, but BIN-restricted issuer promos cannot be honoured. |
| Recurring billing (monthly/quarterly/annual) not automated | **P1 (later)** | Pool plans expire and require manual re-subscribe. |

---

## 2. Architecture decisions

These choices are the load-bearing parts of the plan. Skim them before
reading the phases.

### 2.1 Dual-write Payment collection (not migration-and-cutover)

We introduce a new `Payment` collection but **do not** remove the
`Subscription.metadata.paymentTransactionId` field, and the existing
`admin.service.getPayments()` continues to read from `Subscription` for
one release. The new collection is the system of record for the
**individual charge**; the subscription remains the system of record
for **what the user bought**. Reasons:

- The prior `getPayments()` already aggregates over `Subscription`;
  swapping its data source is a separate, riskier change. Backfilling
  the new collection from existing subs lets us validate the new view
  side-by-side before flipping.
- Admin payment refund/capture/void need a payment-id-keyed row that
  outlives the subscription lifecycle.
- A subscription can over time map to many payments (renewals, upgrades).

Cutover ordering:

1. Phase 1: introduce `Payment` model + write to it from `subscribe()`,
   `changePlan()`, `purchaseAddon()`. The subscription `metadata.paymentTransactionId`
   continues to be set.
2. Phase 4: re-implement `admin.service.getPayments()` to read from
   `Payment`. Keep `getPayments_legacy()` exported as a fallback flag.
3. After two weeks of clean stats, remove the legacy function.

### 2.2 3D-Secure handling

Moyasar's documented flow:

1. `POST /payments` returns `status: "initiated"` and
   `source.transaction_url` (the 3DS challenge URL).
2. We send the user to that URL.
3. Moyasar redirects back to `callback_url` on completion (success or
   failure) with `id`, `status`, `message` query params.
4. The webhook fires `payment_paid` / `payment_failed` asynchronously.

Implementation:

- `paymentProvider.charge()` returns a new `requiresAction` flag and
  the `redirectUrl` when status is `"initiated"`.
- Subscription / addon services no longer treat "initiated" as success;
  they create the Payment row in status `pending_3ds`, save the
  subscription/addon in a corresponding "pending" state, and return the
  redirect URL to the client.
- Frontend redirects to that URL; on return, the
  `/payments/return` page polls `GET /payments/:id` until status flips
  out of `pending_3ds` (or webhook does it first).
- Webhook is the authoritative source — the polling page is just a
  fast UX path so the user does not wait for the webhook RTT.

**STC Pay note:** STC Pay charges follow the same redirect-and-resolve
shape — Moyasar returns `status: "initiated"` and a `transaction_url`
that points at the STC OTP-collection screen. The user enters the OTP
there; Moyasar then resolves the payment. We reuse the `pending_3ds`
internal status for STC's OTP wait (treating it as "pending external
user action"). The `paymentMethod.type` field on the Payment row is
the source of truth for distinguishing creditcard 3DS from STC OTP in
analytics and UI strings.

### 2.3 Moyasar idempotency via `given_id`

The current code passes an `Idempotency-Key` HTTP header to Moyasar,
which is **not** a documented Moyasar mechanism. Moyasar's documented
idempotency field is `given_id` (UUID v4) in the JSON body. We migrate
to that. The internal `withIdempotency()` cache stays — that protects
us against duplicate invocations of `paymentProvider.charge()`. The
`given_id` protects against duplicate Moyasar charges if the request
times out and retries.

Both sides are needed: `withIdempotency` short-circuits before the HTTP
call, `given_id` short-circuits if the call leaks through.

### 2.4 Webhook authentication

Moyasar webhooks include a `secret_token` field (configured in the
dashboard per-webhook). Verification is a constant-time string compare
against `MOYASAR_WEBHOOK_SECRET` env var. There is no HMAC of the body.
We add a defense-in-depth IP allowlist via `MOYASAR_WEBHOOK_IP_WHITELIST`,
**warned** but enforced only when set (Moyasar publishes IP ranges
inconsistently — making it required would risk dropping live traffic
during an IP rotation).

### 2.5 Cron registration

The reconciliation job lives in `scheduledTasks.js`, registered in
`initScheduledTasks()`, leased via `cronLease.acquire("payment_reconcile")`.
This matches every other cron in the codebase. We do **not** create a
new `src/jobs/` directory.

---

## 3. File-creation / modification summary

| Action | Path | Phase |
|---|---|---|
| **CREATE** | `labbe-backend-/models/PaymentModel.js` | 1.1 |
| **CREATE** | `labbe-backend-/src/modules/payments/payments.service.js` | 1.2, 4.1 |
| **CREATE** | `labbe-backend-/src/modules/payments/payments.controller.js` | 1.2, 4.1 |
| **CREATE** | `labbe-backend-/src/modules/payments/payments.routes.js` | 1.2, 4.1 |
| **CREATE** | `labbe-backend-/src/modules/payments/index.js` | 1.2 |
| **CREATE** | `labbe-backend-/src/modules/payments/webhook.controller.js` | 1.3 |
| **CREATE** | `labbe-backend-/src/modules/payments/payments.reconcile.js` | 2.4 |
| **CREATE** | `labbe/app/[lang]/host/plans/_components/PaymentMethodSelector.jsx` | 2.2 |
| **CREATE** | `labbe/app/[lang]/host/payments/return/page.js` | 1.4 |
| **CREATE** | `labbe/app/[lang]/host/payments/return/_components/PaymentReturnClient.jsx` | 1.4 |
| **MODIFY** | `labbe-backend-/src/infrastructure/paymentProvider/moyasar.js` | 1.2, 1.4, 2.1, 2.3, 5.1 |
| **MODIFY** | `labbe-backend-/src/infrastructure/paymentProvider/stub.js` | 2.1 |
| **MODIFY** | `labbe-backend-/src/infrastructure/paymentProvider/index.js` | 1.2, 2.3 |
| **MODIFY** | `labbe-backend-/src/modules/subscriptions/subscriptions.service.js` | 1.2, 1.4, 3.3 |
| **MODIFY** | `labbe-backend-/src/modules/addons/addons.service.js` | 1.2 |
| **MODIFY** | `labbe-backend-/models/SubscriptionModel.js` | 1.2 (status enum + paymentId ref) |
| **MODIFY** | `labbe-backend-/models/AddonModel.js` | 1.2 (paymentId ref) |
| **MODIFY** | `labbe-backend-/src/modules/admin/admin.service.js` | 4.1 (re-target getPayments) |
| **MODIFY** | `labbe-backend-/src/modules/admin/admin.controller.js` | 4.1 (refund/capture/void admin actions) |
| **MODIFY** | `labbe-backend-/src/modules/admin/admin.routes.js` | 4.1 (admin payment action routes) |
| **MODIFY** | `labbe-backend-/src/app.js` | 1.2 (mount payments routes) |
| **MODIFY** | `labbe-backend-/src/shared/utils/scheduledTasks.js` | 2.4 (register reconcile cron) |
| **MODIFY** | `labbe-backend-/config.env` | 7.1 (Moyasar env vars) |
| **MODIFY** | `labbe/services/new-backend/api.config.js` | 1.4, 4.1 (new payment paths) |
| **MODIFY** | `labbe/hooks/reactQueryHooks/useSubscriptions.js` | 1.4 (return-redirect handling on `subscribe`) |
| **MODIFY** | `labbe/hooks/reactQueryHooks/useAdmin.js` | 4.1 (admin refund/capture/void mutations) |
| **MODIFY** | `labbe/app/[lang]/host/plans/PlansPage.js` | 1.4, 2.2 (selector + redirect on initiated) |
| **MODIFY** | `labbe/app/[lang]/host/plans/_components/index.js` | 2.2 (export new selector) |
| **MODIFY** | `labbe/app/[lang]/host/payments/_components/PaymentsClient.jsx` | 1.4 (transactionId column, refund badge) |
| **MODIFY** | `labbe/app/[lang]/admin-dash/payments/_components/AdminPaymentsClient.js` | 4.1 (admin actions) |
| **MODIFY** | `labbe/services/adminDashboard.js` (or wherever `paymentsAPI` lives) | 4.1 (refund/capture/void) |
| **MODIFY** | `labbe/localization/locales/en/hostPayments.json` | 1.4, 4.1 |
| **MODIFY** | `labbe/localization/locales/ar/hostPayments.json` | 1.4, 4.1 |
| **MODIFY** | `labbe/localization/locales/en/adminPayments.json` | 4.1 |
| **MODIFY** | `labbe/localization/locales/ar/adminPayments.json` | 4.1 |

---

## 4. Phase 1 — Foundation (P0)

### 4.1 PaymentModel

**CREATE** `labbe-backend-/models/PaymentModel.js`:

```js
/**
 * Payment Model
 *
 * Tracks an individual payment transaction independently of the
 * subscription/addon it activated. A subscription owns 0..N payments
 * over its lifetime (initial + renewals + upgrades + addons). A
 * payment row is the single source of truth for refund amount,
 * capture state, 3DS status, and the Moyasar IDs.
 *
 * STATUS LIFECYCLE
 *   pending      → before/while Moyasar is processing (rarely seen
 *                   externally; we usually have an immediate
 *                   `pending_3ds`, `paid`, or `failed`)
 *   pending_3ds  → Moyasar returned `initiated`; user must complete
 *                   the redirect challenge at `redirectUrl`. NOTE:
 *                   despite the name, this status also covers STC
 *                   Pay's OTP-collection redirect (Moyasar uses the
 *                   same `transaction_url` field for both 3DS and
 *                   STC OTP). The label is kept for code-search
 *                   continuity; treat it as "pending external user
 *                   action". Frontend strings localise it
 *                   per-source-type.
 *   authorized   → manual:true charges before capture
 *   paid         → terminal success
 *   captured     → captured an authorized payment (subset of paid)
 *   failed       → terminal failure
 *   refunded     → terminal; full refund issued
 *   partially_refunded → at least one refund < amount issued
 *   voided       → authorized payment voided (no funds moved)
 *
 * REFUND ACCOUNTING
 *   refundedAmount accumulates partials. `refunded` status is set
 *   when refundedAmount >= amount; `partially_refunded` otherwise.
 *
 * UNIQUENESS
 *   moyasarPaymentId is unique (sparse, because dev/stub IDs are
 *   `stub-...` strings and we want to catch duplicate inserts). It
 *   is the join key with Moyasar webhooks.
 */

const mongoose = require("mongoose");

const PAYMENT_STATUS = Object.freeze({
  PENDING:             "pending",
  PENDING_3DS:         "pending_3ds",
  AUTHORIZED:          "authorized",
  PAID:                "paid",
  CAPTURED:            "captured",
  FAILED:              "failed",
  REFUNDED:            "refunded",
  PARTIALLY_REFUNDED:  "partially_refunded",
  VOIDED:              "voided",
});

const paymentMethodSchema = new mongoose.Schema(
  {
    type:        { type: String }, // creditcard | applepay | samsungpay | stcpay | token
    company:     { type: String }, // visa | mada | master | amex
    last4:       { type: String },
    bin:         { type: String }, // first 6 digits, masked
    expiryMonth: { type: Number },
    expiryYear:  { type: Number },
    issuerName:  { type: String },
    issuerCountry: { type: String },
  },
  { _id: false }
);

const paymentSchema = new mongoose.Schema(
  {
    // ─── OWNER & SCOPE ───
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    whitelabelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    // ─── ACTIVATION TARGETS (sparse) ───
    // A payment may activate either a subscription, an addon, or both
    // (e.g. a checkout that bundles plan + extra invites). We keep
    // both refs sparse and indexed so reverse-lookups are O(1).
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      default: null,
      index: true,
      sparse: true,
    },
    addonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Addon",
      default: null,
      index: true,
      sparse: true,
    },

    // ─── MONEY ───
    amount:   { type: Number, required: true }, // SAR major units
    currency: { type: String, default: "SAR" },
    refundedAmount: { type: Number, default: 0 }, // SAR major units
    capturedAmount: { type: Number, default: 0 }, // SAR major units
    fee:      { type: Number, default: 0 }, // estimated by Moyasar, halalas

    // ─── STATUS ───
    status: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
      index: true,
    },
    providerStatus: { type: String }, // raw Moyasar status

    // ─── PROVIDER IDS ───
    provider: { type: String, default: "moyasar" }, // moyasar | stub
    moyasarPaymentId: { type: String, default: null }, // POST /v1/payments → id
    moyasarInvoiceId: { type: String, default: null }, // if paid via invoice
    givenId: { type: String, default: null }, // UUID v4 we sent for idempotency

    // ─── PAYMENT METHOD ───
    paymentMethod: {
      type: paymentMethodSchema,
      default: () => ({}),
    },

    // ─── 3DS / REDIRECT ───
    redirectUrl:  { type: String, default: null }, // source.transaction_url
    callbackUrl:  { type: String, default: null },

    // ─── CONTEXT ───
    description: { type: String },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },

    // ─── TIMESTAMPS ───
    initiatedAt:  { type: Date, default: Date.now },
    authorizedAt: { type: Date, default: null },
    paidAt:       { type: Date, default: null },
    capturedAt:   { type: Date, default: null },
    failedAt:     { type: Date, default: null },
    refundedAt:   { type: Date, default: null },
    voidedAt:     { type: Date, default: null },

    // ─── REFUND TRAIL ───
    refunds: [
      new mongoose.Schema(
        {
          amount:    { type: Number, required: true },
          reason:    { type: String },
          createdAt: { type: Date, default: Date.now },
          createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          moyasarRefundResponseStatus: { type: String },
        },
        { _id: true }
      ),
    ],
  },
  { timestamps: true }
);

paymentSchema.index({ moyasarPaymentId: 1 }, { unique: true, sparse: true });
paymentSchema.index({ userId: 1, status: 1, createdAt: -1 });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ whitelabelId: 1, status: 1, createdAt: -1 });
paymentSchema.index({ status: 1, initiatedAt: 1 }, { partialFilterExpression: { status: { $in: ["pending", "pending_3ds"] } } });

paymentSchema.statics.STATUS = PAYMENT_STATUS;

paymentSchema.statics.findByMoyasarId = function (moyasarPaymentId) {
  if (!moyasarPaymentId) return null;
  return this.findOne({ moyasarPaymentId });
};

paymentSchema.methods.applyMoyasarSnapshot = function (snapshot = {}) {
  // snapshot is the body of GET /v1/payments/:id or a webhook `data` field.
  const status = snapshot.status;
  this.providerStatus = status;
  if (typeof snapshot.fee === "number") this.fee = snapshot.fee;
  if (typeof snapshot.refunded === "number") this.refundedAmount = snapshot.refunded / 100;
  if (typeof snapshot.captured === "number") this.capturedAmount = snapshot.captured / 100;

  const src = snapshot.source || {};
  if (src.type) this.paymentMethod.type = src.type;
  if (src.company) this.paymentMethod.company = src.company;
  if (typeof src.number === "string" && src.number.length >= 4) {
    this.paymentMethod.last4 = src.number.slice(-4);
    this.paymentMethod.bin = src.number.slice(0, 6);
  }
  if (src.issuer_name) this.paymentMethod.issuerName = src.issuer_name;
  if (src.issuer_country) this.paymentMethod.issuerCountry = src.issuer_country;
  if (typeof src.month === "number") this.paymentMethod.expiryMonth = src.month;
  if (typeof src.year === "number") this.paymentMethod.expiryYear = src.year;
  if (src.transaction_url) this.redirectUrl = src.transaction_url;

  const map = {
    initiated:  PAYMENT_STATUS.PENDING_3DS,
    paid:       PAYMENT_STATUS.PAID,
    authorized: PAYMENT_STATUS.AUTHORIZED,
    captured:   PAYMENT_STATUS.CAPTURED,
    failed:     PAYMENT_STATUS.FAILED,
    refunded:   PAYMENT_STATUS.REFUNDED,
    voided:     PAYMENT_STATUS.VOIDED,
    verified:   PAYMENT_STATUS.PAID,
  };
  const internal = map[status];
  if (internal) {
    if (internal === PAYMENT_STATUS.REFUNDED && this.refundedAmount < this.amount) {
      this.status = PAYMENT_STATUS.PARTIALLY_REFUNDED;
    } else {
      this.status = internal;
    }
    const now = new Date();
    if (internal === PAYMENT_STATUS.PAID && !this.paidAt)             this.paidAt = now;
    if (internal === PAYMENT_STATUS.AUTHORIZED && !this.authorizedAt) this.authorizedAt = now;
    if (internal === PAYMENT_STATUS.CAPTURED && !this.capturedAt)     this.capturedAt = now;
    if (internal === PAYMENT_STATUS.FAILED && !this.failedAt)         this.failedAt = now;
    if (internal === PAYMENT_STATUS.REFUNDED && !this.refundedAt)     this.refundedAt = now;
    if (internal === PAYMENT_STATUS.VOIDED && !this.voidedAt)         this.voidedAt = now;
  }
  return this;
};

const Payment = mongoose.models.Payment || mongoose.model("Payment", paymentSchema);
module.exports = Payment;
module.exports.PAYMENT_STATUS = PAYMENT_STATUS;
```

### 4.2 Provider rewrite — given_id, 3DS, source, capture/void/refund/fetch

**REPLACE** the entirety of
`labbe-backend-/src/infrastructure/paymentProvider/moyasar.js` with:

```js
/**
 * Moyasar payment provider — full integration.
 *
 * Surface area:
 *   charge({ amount, currency, source, customer, metadata,
 *           callbackUrl, manual, givenId, idempotencyKey })
 *     POST /v1/payments
 *
 *   fetchPayment(moyasarPaymentId)
 *     GET /v1/payments/:id
 *
 *   refund({ moyasarPaymentId, amount })
 *     POST /v1/payments/:id/refund
 *
 *   capture({ moyasarPaymentId, amount })
 *     POST /v1/payments/:id/capture
 *
 *   voidPayment({ moyasarPaymentId })
 *     POST /v1/payments/:id/void
 *
 * AMOUNT CONTRACT
 *   `amount` is SAR major units (29.99 = 29.99 SAR). The provider
 *   converts to halalas internally. This module is the only place
 *   that knows about halalas.
 *
 * IDEMPOTENCY
 *   Moyasar's documented mechanism is `given_id` (UUID v4 in the
 *   request body). We accept either a caller-supplied `givenId` or
 *   derive a stable UUIDv5-style hash from `idempotencyKey` so the
 *   same logical request always gets the same `given_id`.
 *
 * RESPONSE SHAPE (success / pending)
 *   {
 *     success: true,                 // false if status is failed
 *     transactionId: <moyasar id>,
 *     status: 'paid' | 'authorized' | 'requires_action' | 'failed',
 *     providerStatus: <raw moyasar status>,
 *     requiresAction: bool,          // true on `initiated`
 *     redirectUrl: <transaction_url> // present iff requiresAction
 *     amount: <sar>,
 *     fee: <halalas>,
 *     paymentMethod: { ... extracted from response.source ... },
 *     raw: <full moyasar body, only when caller passes returnRaw:true>,
 *     provider: 'moyasar',
 *   }
 *
 *   On HTTP error: { success: false, error, statusCode, provider }.
 */

const axios = require("axios");
const crypto = require("crypto");
const { ValidationError } = require("../../shared/errors/errorTypes");

const MOYASAR_BASE = process.env.MOYASAR_BASE_URL || "https://api.moyasar.com/v1";

const sarToHalalas = (sarAmount) => {
  if (typeof sarAmount !== "number" || !Number.isFinite(sarAmount)) {
    throw new ValidationError("paymentProvider.charge: amount must be a finite SAR number");
  }
  if (sarAmount <= 0) {
    throw new ValidationError(
      "paymentProvider.charge: amount must be > 0 SAR (free plans must skip the charge step)"
    );
  }
  const rounded = Math.round(sarAmount * 100);
  if (Math.abs(rounded / 100 - sarAmount) > 1e-9) {
    throw new ValidationError(
      "paymentProvider.charge: amount has more than 2 decimal places"
    );
  }
  return rounded;
};

const halalasToSar = (h) => (typeof h === "number" ? h / 100 : 0);

/**
 * Derive a deterministic UUID v4-shaped string from an arbitrary
 * idempotency key so the same logical request always presents the
 * same `given_id` to Moyasar. Pure function; no side effects.
 */
const deriveGivenId = (key) => {
  const hex = crypto.createHash("sha256").update(String(key)).digest("hex").slice(0, 32);
  // Layout the bytes as UUID v4 (version=4, variant=10xx).
  const part1 = hex.slice(0, 8);
  const part2 = hex.slice(8, 12);
  const part3 = "4" + hex.slice(13, 16);
  const yChar = (parseInt(hex.slice(16, 17), 16) & 0x3) | 0x8;
  const part4 = yChar.toString(16) + hex.slice(17, 20);
  const part5 = hex.slice(20, 32);
  return `${part1}-${part2}-${part3}-${part4}-${part5}`;
};

const extractPaymentMethod = (data = {}) => {
  const src = data.source || {};
  const out = { type: src.type || null };
  if (src.company) out.company = src.company;
  if (typeof src.number === "string" && src.number.length >= 4) {
    out.last4 = src.number.slice(-4);
    out.bin = src.number.slice(0, 6);
  }
  if (typeof src.month === "number") out.expiryMonth = src.month;
  if (typeof src.year === "number") out.expiryYear = src.year;
  if (src.issuer_name) out.issuerName = src.issuer_name;
  if (src.issuer_country) out.issuerCountry = src.issuer_country;
  return out;
};

const auth = () => ({
  username: process.env.MOYASAR_API_KEY,
  password: "",
});

const moyasarProvider = {
  name: "moyasar",

  /**
   * Charge a customer.
   */
  async charge({
    amount,
    currency = "SAR",
    source,
    customer,
    metadata,
    callbackUrl,
    manual = false,
    givenId,
    idempotencyKey,
    description,
    returnRaw = false,
  } = {}) {
    const halalas = sarToHalalas(amount);

    if (!process.env.MOYASAR_API_KEY) {
      return { success: false, error: "MOYASAR_API_KEY missing", provider: "moyasar" };
    }

    if (!source || typeof source !== "object" || !source.type) {
      return {
        success: false,
        error: "paymentProvider.charge: `source` is required (e.g. { type: 'creditcard', ... })",
        provider: "moyasar",
      };
    }

    if ((source.type === "creditcard" || source.type === "token") && !callbackUrl) {
      return {
        success: false,
        error: "paymentProvider.charge: `callbackUrl` required for creditcard/token sources",
        provider: "moyasar",
      };
    }

    const finalGivenId = givenId || (idempotencyKey ? deriveGivenId(idempotencyKey) : undefined);

    const body = {
      amount: halalas,
      currency,
      source,
      description: description || metadata?.description || "Halla payment",
      metadata: metadata || {},
    };
    if (callbackUrl)  body.callback_url = callbackUrl;
    if (manual)       body.manual = true;
    if (finalGivenId) body.given_id = finalGivenId;

    try {
      const response = await axios.post(`${MOYASAR_BASE}/payments`, body, {
        auth: auth(),
        timeout: 15000,
      });
      const data = response.data || {};
      const status = data.status;
      const requiresAction = status === "initiated";
      const success = status === "paid" || status === "authorized" || requiresAction;

      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.log("[moyasar] charge response:", { id: data.id, status, halalas, sar: amount });
      }

      return {
        success,
        transactionId: data.id,
        status: requiresAction ? "requires_action" : status === "authorized" ? "authorized" : success ? "succeeded" : "failed",
        providerStatus: status,
        requiresAction,
        redirectUrl: requiresAction ? (data.source?.transaction_url || null) : null,
        amount,
        fee: typeof data.fee === "number" ? data.fee : 0,
        givenId: finalGivenId || null,
        paymentMethod: extractPaymentMethod(data),
        raw: returnRaw ? data : undefined,
        provider: "moyasar",
      };
    } catch (err) {
      return {
        success: false,
        provider: "moyasar",
        error: err.response?.data?.message || err.message,
        statusCode: err.response?.status,
      };
    }
  },

  async fetchPayment(moyasarPaymentId) {
    if (!process.env.MOYASAR_API_KEY) {
      return { success: false, error: "MOYASAR_API_KEY missing", provider: "moyasar" };
    }
    if (!moyasarPaymentId) {
      return { success: false, error: "moyasarPaymentId required", provider: "moyasar" };
    }
    try {
      const response = await axios.get(`${MOYASAR_BASE}/payments/${moyasarPaymentId}`, {
        auth: auth(),
        timeout: 15000,
      });
      return { success: true, data: response.data, provider: "moyasar" };
    } catch (err) {
      return {
        success: false,
        provider: "moyasar",
        error: err.response?.data?.message || err.message,
        statusCode: err.response?.status,
      };
    }
  },

  async refund({ moyasarPaymentId, amount }) {
    if (!process.env.MOYASAR_API_KEY) {
      return { success: false, error: "MOYASAR_API_KEY missing", provider: "moyasar" };
    }
    if (!moyasarPaymentId) {
      return { success: false, error: "moyasarPaymentId required", provider: "moyasar" };
    }
    const body = {};
    if (typeof amount === "number") body.amount = sarToHalalas(amount);

    try {
      const response = await axios.post(
        `${MOYASAR_BASE}/payments/${moyasarPaymentId}/refund`,
        body,
        { auth: auth(), timeout: 15000 }
      );
      const data = response.data || {};
      return {
        success: data.status === "refunded" || (data.refunded || 0) > 0,
        provider: "moyasar",
        transactionId: data.id,
        providerStatus: data.status,
        refundedAmount: halalasToSar(data.refunded || 0),
        raw: data,
      };
    } catch (err) {
      return {
        success: false,
        provider: "moyasar",
        error: err.response?.data?.message || err.message,
        statusCode: err.response?.status,
      };
    }
  },

  async capture({ moyasarPaymentId, amount }) {
    if (!process.env.MOYASAR_API_KEY) {
      return { success: false, error: "MOYASAR_API_KEY missing", provider: "moyasar" };
    }
    const body = {};
    if (typeof amount === "number") body.amount = sarToHalalas(amount);
    try {
      const response = await axios.post(
        `${MOYASAR_BASE}/payments/${moyasarPaymentId}/capture`,
        body,
        { auth: auth(), timeout: 15000 }
      );
      const data = response.data || {};
      return {
        success: data.status === "captured" || data.status === "paid",
        provider: "moyasar",
        transactionId: data.id,
        providerStatus: data.status,
        capturedAmount: halalasToSar(data.captured || 0),
        raw: data,
      };
    } catch (err) {
      return {
        success: false,
        provider: "moyasar",
        error: err.response?.data?.message || err.message,
        statusCode: err.response?.status,
      };
    }
  },

  async voidPayment({ moyasarPaymentId }) {
    if (!process.env.MOYASAR_API_KEY) {
      return { success: false, error: "MOYASAR_API_KEY missing", provider: "moyasar" };
    }
    try {
      const response = await axios.post(
        `${MOYASAR_BASE}/payments/${moyasarPaymentId}/void`,
        {},
        { auth: auth(), timeout: 15000 }
      );
      const data = response.data || {};
      return {
        success: data.status === "voided",
        provider: "moyasar",
        transactionId: data.id,
        providerStatus: data.status,
        raw: data,
      };
    } catch (err) {
      return {
        success: false,
        provider: "moyasar",
        error: err.response?.data?.message || err.message,
        statusCode: err.response?.status,
      };
    }
  },

  // Exposed for the stub + tests
  _sarToHalalas: sarToHalalas,
  _halalasToSar: halalasToSar,
  _deriveGivenId: deriveGivenId,
  _extractPaymentMethod: extractPaymentMethod,
};

module.exports = moyasarProvider;
```

### 4.3 Stub provider — supports the new shape

**REPLACE** `labbe-backend-/src/infrastructure/paymentProvider/stub.js`:

```js
/**
 * Stub payment provider.
 *
 * Returned by the factory whenever MOYASAR_API_KEY is unset. Returns
 * synthetic-success results so dev and CI flows can exercise the
 * subscription/addon code paths without hitting a real PSP.
 *
 * Shares SAR-validation contract with the Moyasar provider via
 * `moyasar._sarToHalalas`. Mirrors the new method surface added in
 * Phase 1 (charge, fetchPayment, refund, capture, voidPayment) so
 * service code is provider-agnostic.
 *
 * The stub honours `source.type === 'creditcard_3ds_test'` as a
 * deterministic 3DS path: charge returns `requires_action: true`
 * with a redirect URL pointing at our own
 * `/api/v2/payments/_stub/3ds-complete?id=<id>` endpoint. That
 * endpoint flips the in-memory record to `paid`. Useful in CI for
 * exercising the redirect-and-poll flow without a live Moyasar.
 */

const crypto = require("crypto");
const moyasarProvider = require("./moyasar");

const memoryStore = new Map();

const stubProvider = {
  name: "stub",

  async charge({ amount, currency = "SAR", source, metadata, callbackUrl }) {
    moyasarProvider._sarToHalalas(amount);

    const transactionId = `stub-${crypto.randomBytes(8).toString("hex")}`;
    const requires3ds = source?.type === "creditcard_3ds_test";
    const status = requires3ds ? "initiated" : "paid";

    memoryStore.set(transactionId, {
      id: transactionId,
      status,
      amount: amount * 100,
      fee: 0,
      currency,
      refunded: 0,
      captured: 0,
      source: {
        type: source?.type || "creditcard",
        company: "visa",
        number: "**** **** **** 4242",
        month: 12,
        year: 2030,
      },
      metadata: metadata || {},
    });

    return {
      success: true,
      transactionId,
      status: requires3ds ? "requires_action" : "succeeded",
      providerStatus: status,
      requiresAction: requires3ds,
      redirectUrl: requires3ds
        ? `${process.env.FRONTEND_URL || "http://localhost:3000"}/host/payments/return?id=${transactionId}&stub=1`
        : null,
      amount,
      fee: 0,
      paymentMethod: { type: source?.type || "creditcard", company: "visa", last4: "4242" },
      provider: "stub",
    };
  },

  async fetchPayment(id) {
    const data = memoryStore.get(id);
    if (!data) return { success: false, error: "not found", provider: "stub" };
    return { success: true, data, provider: "stub" };
  },

  async refund({ moyasarPaymentId, amount }) {
    const data = memoryStore.get(moyasarPaymentId);
    if (!data) return { success: false, error: "not found", provider: "stub" };
    const refundHalalas = typeof amount === "number" ? amount * 100 : data.amount - data.refunded;
    data.refunded += refundHalalas;
    data.status = data.refunded >= data.amount ? "refunded" : "paid";
    return {
      success: true,
      provider: "stub",
      transactionId: moyasarPaymentId,
      providerStatus: data.status,
      refundedAmount: data.refunded / 100,
    };
  },

  async capture({ moyasarPaymentId, amount }) {
    const data = memoryStore.get(moyasarPaymentId);
    if (!data) return { success: false, error: "not found", provider: "stub" };
    data.captured = typeof amount === "number" ? amount * 100 : data.amount;
    data.status = "captured";
    return { success: true, provider: "stub", providerStatus: "captured", capturedAmount: data.captured / 100 };
  },

  async voidPayment({ moyasarPaymentId }) {
    const data = memoryStore.get(moyasarPaymentId);
    if (!data) return { success: false, error: "not found", provider: "stub" };
    data.status = "voided";
    return { success: true, provider: "stub", providerStatus: "voided" };
  },

  // For 3DS-complete test endpoint
  _setStubStatus(id, status) {
    const data = memoryStore.get(id);
    if (data) data.status = status;
    return data;
  },
};

module.exports = stubProvider;
```

### 4.4 Provider factory — proxy all new methods

**REPLACE** `labbe-backend-/src/infrastructure/paymentProvider/index.js`:

```js
/**
 * Payment provider factory.
 *
 * Chooses Moyasar or stub based on `MOYASAR_API_KEY`. Wraps `charge()`
 * with `withIdempotency()` so the outbound call is exactly-once when
 * the caller supplies an `idempotencyKey`. The same key is also passed
 * down to the provider, which converts it to a Moyasar `given_id` —
 * defense in depth: if the network retries past our cache, Moyasar
 * still dedupes.
 *
 * `fetchPayment`, `refund`, `capture`, `voidPayment` are passed through
 * directly. Refunds are NOT idempotency-wrapped at this layer because
 * partial refunds must be permitted in sequence (one /refund call per
 * partial event). The admin endpoints have their own idempotency
 * middleware to guard double-clicks.
 */

const stub = require("./stub");
const moyasar = require("./moyasar");
const { withIdempotency, sha256 } = require("../../shared/utils/idempotency");

const isMoyasarConfigured = () => !!process.env.MOYASAR_API_KEY;

const active = isMoyasarConfigured() ? moyasar : stub;

console.log(
  `[paymentProvider] active provider: ${active.name}` +
    (active.name === "stub" ? " (MOYASAR_API_KEY absent — synthetic success)" : "")
);

const computeChargeRequestHash = (params) => {
  const { amount, currency, source, metadata } = params || {};
  return sha256({
    amount: amount ?? null,
    currency: currency ?? null,
    sourceType: source?.type ?? null,
    metadata: metadata ?? null,
  });
};

const charge = async (params) => {
  const { idempotencyKey, userId = null } = params || {};
  if (!idempotencyKey) {
    return active.charge(params);
  }
  return withIdempotency(
    `payment:${idempotencyKey}`,
    () => active.charge(params),
    {
      scope: "payment.charge",
      requestHash: computeChargeRequestHash(params),
      userId,
    }
  );
};

module.exports = {
  active,
  charge,
  fetchPayment: (id) => active.fetchPayment(id),
  refund: (params) => active.refund(params),
  capture: (params) => active.capture(params),
  voidPayment: (params) => active.voidPayment(params),
  isMoyasarConfigured,
};
```

### 4.5 Subscription service — write Payment + 3DS plumbing

In `labbe-backend-/src/modules/subscriptions/subscriptions.service.js`:

**MODIFY** the imports block (around lines 1-32). Add `Payment`:

```js
const Subscription = require('../../../models/SubscriptionModel');
const Plan = require('../../../models/PlanModel');
const User = require('../../../models/UserModel');
const Payment = require('../../../models/PaymentModel');                  // NEW
const BusinessSetupFee = require('../../../models/BusinessSetupFeeModel');
```

**REPLACE** the body of `subscribe()` between lines 375 and 507 with the
following block (the `if (!isFreePlan) { ... }` charge gate through the
end of the create-try). The diff is large enough that we list the full
replacement. The signature, prologue (lines 310-374), and post-create
work (lines 509+) are unchanged.

```js
    // ─── Charge ───────────────────────────────────────────────────
    let paymentTransactionId = null;
    let paymentRecord = null;
    let pendingRedirect = null;

    if (!isFreePlan) {
      const derivedKey =
        subscriptionData?.idempotencyKey
          || `subscribe:${userId}:${plan.code}:${planPrice}`;

      const callbackUrl =
        (subscriptionData?.callbackUrl)
          || `${process.env.FRONTEND_URL || ''}/host/payments/return`;

      const chargeParams = {
        amount: planPrice,
        currency: plan?.currency || 'SAR',
        // Default `creditcard` is the stub's immediate-paid path. Tests
        // that need to exercise the 3DS redirect/poll flow opt in by
        // passing `source: { type: 'creditcard_3ds_test' }`. The real
        // frontend always sends a populated `source` in production.
        source: subscriptionData?.source || { type: 'creditcard' },
        customer: { id: userId },
        callbackUrl,
        userId,
        idempotencyKey: derivedKey,
        description: `Subscription to ${plan.code}`,
        metadata: {
          planCode: plan.code,
          discountCode,
          purpose: 'subscription',
          userId: String(userId),
        },
      };

      // Pre-create a Payment row in `pending` so we have a stable id
      // before we hit Moyasar. If the charge call itself throws, we
      // mark the row failed; if it succeeds (paid / authorized /
      // initiated) we update accordingly.
      paymentRecord = await Payment.create({
        userId,
        whitelabelId: user.whitelabelId || null,
        amount: planPrice,
        currency: plan?.currency || 'SAR',
        provider: 'moyasar',
        status: Payment.PAYMENT_STATUS.PENDING,
        callbackUrl,
        description: `Subscription to ${plan.code}`,
        // `purpose` is the dispatch key used by webhook/reconcile/poll
        // to decide which finalizePending3ds path to call.
        metadata: { planCode: plan.code, discountCode, purpose: 'subscription' },
      });

      const charge = await paymentProvider.charge(chargeParams);

      if (!charge.success) {
        paymentRecord.status = Payment.PAYMENT_STATUS.FAILED;
        paymentRecord.failedAt = new Date();
        paymentRecord.providerStatus = charge.providerStatus || charge.error || 'unknown';
        await paymentRecord.save().catch(() => {});

        // eslint-disable-next-line no-console
        console.error(
          '[subscribe] payment provider error:',
          charge.error || charge.providerStatus || 'unknown'
        );
        throw new ValidationError('Payment failed; subscription not activated');
      }

      paymentTransactionId = charge.transactionId || null;
      paymentRecord.moyasarPaymentId = charge.transactionId;
      paymentRecord.givenId = charge.givenId || null;
      paymentRecord.providerStatus = charge.providerStatus;
      paymentRecord.fee = charge.fee || 0;
      if (charge.paymentMethod) paymentRecord.paymentMethod = charge.paymentMethod;

      if (charge.requiresAction) {
        // 3DS: don't activate the subscription yet. Save the redirect
        // URL on the payment, return it to the controller, and let the
        // webhook (or the frontend's polling page) finish the job.
        paymentRecord.status = Payment.PAYMENT_STATUS.PENDING_3DS;
        paymentRecord.redirectUrl = charge.redirectUrl;
        await paymentRecord.save();
        pendingRedirect = charge.redirectUrl;
      } else {
        paymentRecord.status = charge.providerStatus === 'authorized'
          ? Payment.PAYMENT_STATUS.AUTHORIZED
          : Payment.PAYMENT_STATUS.PAID;
        if (paymentRecord.status === Payment.PAYMENT_STATUS.PAID) paymentRecord.paidAt = new Date();
        if (paymentRecord.status === Payment.PAYMENT_STATUS.AUTHORIZED) paymentRecord.authorizedAt = new Date();
        await paymentRecord.save();
      }
    }

    // If 3DS is required, defer subscription creation. We record
    // the intent on the Payment so the webhook can finish it.
    if (pendingRedirect) {
      paymentRecord.metadata = {
        ...(paymentRecord.metadata || {}),
        pendingSubscribeIntent: {
          planId: plan._id,
          planCode: plan.code,
          discountCode,
          existingActiveIds: existingActive.map((s) => s._id),
        },
      };
      await paymentRecord.save();
      return {
        requiresAction: true,
        redirectUrl: pendingRedirect,
        paymentId: paymentRecord._id,
      };
    }

    // ─── Cancel old subs (B-3) ────────────────────────────────────
    for (const existing of existingActive) {
      try {
        existing.status = SUBSCRIPTION_STATUS.CANCELLED;
        existing.cancelledAt = new Date();
        existing.cancelReason = `Auto-cancelled on new subscribe to ${planCode}`;
        await existing.save();
      } catch (cancelErr) {
        // eslint-disable-next-line no-console
        console.error(
          '[subscribe] failed to cancel existing subscription %s after charge: %s',
          existing._id, cancelErr?.message
        );
      }
    }

    // ─── Create subscription ──────────────────────────────────────
    let subscription;
    try {
      subscription = await Subscription.createForUser(userId, plan, {
        pricePaid: isFreePlan ? 0 : planPrice,
        currency: plan?.currency || 'SAR',
        status: planCode === 'trial' ? SUBSCRIPTION_STATUS.TRIAL : SUBSCRIPTION_STATUS.ACTIVE,
        createdBy: { user: userId, onBehalfOf: false },
      });

      if (planCode === 'trial') {
        const TRIAL_DURATION_DAYS = 14;
        subscription.expiresAt = new Date(
          (subscription.activatedAt || subscription.createdAt).getTime()
            + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000
        );
      }

      if (paymentTransactionId) {
        subscription.metadata = {
          ...(subscription.metadata || {}),
          paymentTransactionId,
          paymentId: paymentRecord?._id,
        };
        if (paymentRecord?.paymentMethod?.type) {
          subscription.paymentMethod = {
            type:        paymentRecord.paymentMethod.type,
            last4:       paymentRecord.paymentMethod.last4,
            brand:       paymentRecord.paymentMethod.company,
            expiryMonth: paymentRecord.paymentMethod.expiryMonth,
            expiryYear:  paymentRecord.paymentMethod.expiryYear,
          };
        }
      }

      if (planCode === 'trial' || paymentTransactionId) {
        await subscription.save();
      }

      // Backlink the payment to the new subscription
      if (paymentRecord) {
        paymentRecord.subscriptionId = subscription._id;
        await paymentRecord.save();
      }
    } catch (createErr) {
      if (paymentTransactionId) {
        try {
          await this._recordPendingRefund({
            userId,
            amount: planPrice,
            currency: plan?.currency || 'SAR',
            paymentTransactionId,
            paymentId: paymentRecord?._id,
            reason: 'subscribe_create_failed',
            detail: createErr?.message,
            planCode: plan?.code,
          });
        } catch (refundLogErr) {
          // eslint-disable-next-line no-console
          console.error('[subscribe] _recordPendingRefund logAudit failed:', refundLogErr?.message);
        }
        throw new ValidationError(
          'Payment was processed but the subscription could not be activated. '
          + 'Our team has been notified — please contact support with your transaction reference.'
        );
      }
      throw createErr;
    }
```

**Subscription service — `_recordPendingRefund` signature update**
(around lines 985-1040): add `paymentId` to the destructured params and
include it in the audit metadata. Replace the destructure header and
the `metadata` field:

```js
  async _recordPendingRefund({
    userId,
    amount,
    currency,
    paymentTransactionId,
    paymentId,        // NEW
    reason,
    detail,
    planCode,
  }) {
    // …unchanged log line…
    await logAudit({
      action: 'subscription.pending_refund',
      actor: { _id: userId, role: 'host' },
      targetType: 'system',
      targetId: paymentTransactionId || userId,
      metadata: {
        reason, amount, currency,
        paymentTransactionId,
        paymentId,        // NEW
        planCode, detail,
      },
      status: 'failure',
    });
    // …unchanged admin notification…
  }
```

**Subscription service — `finalizePending3ds()` (NEW METHOD)**

Add at the bottom of the class, before `module.exports`:

```js
  /**
   * Finalize a pending-3ds subscription purchase. Called by:
   *   - the webhook handler when `payment_paid` arrives
   *   - the frontend's poll endpoint when the user is back from the
   *     3DS challenge and we want to finish synchronously
   *
   * Idempotent: if the subscription is already created (paymentRecord
   * has a subscriptionId), it returns the existing one.
   *
   * Reads the `pendingSubscribeIntent` snapshot stored on the Payment
   * row by `subscribe()` and replays the cancel-old-subs +
   * createForUser steps under that snapshot.
   */
  async finalizePending3ds(paymentId) {
    const payment = await Payment.findById(paymentId);
    if (!payment) throw new NotFoundError('Payment');

    if (payment.subscriptionId) {
      const existing = await Subscription.findById(payment.subscriptionId).populate('planId');
      if (existing) return existing;
    }

    if (payment.status !== Payment.PAYMENT_STATUS.PAID
        && payment.status !== Payment.PAYMENT_STATUS.AUTHORIZED) {
      throw new ValidationError(
        `Payment ${paymentId} is in status "${payment.status}", cannot finalize`
      );
    }

    const intent = payment.metadata?.pendingSubscribeIntent;
    if (!intent) {
      throw new ValidationError(`Payment ${paymentId} has no subscribe intent`);
    }

    const plan = await Plan.findById(intent.planId);
    if (!plan) throw new ValidationError(`Plan ${intent.planId} no longer exists`);

    // Cancel existing active subs (matching the pre-charge snapshot)
    if (Array.isArray(intent.existingActiveIds)) {
      for (const sid of intent.existingActiveIds) {
        try {
          const old = await Subscription.findById(sid);
          if (old && (old.status === SUBSCRIPTION_STATUS.ACTIVE || old.status === SUBSCRIPTION_STATUS.TRIAL)) {
            old.status = SUBSCRIPTION_STATUS.CANCELLED;
            old.cancelledAt = new Date();
            old.cancelReason = `Auto-cancelled on 3DS-confirmed new subscribe to ${plan.code}`;
            await old.save();
          }
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error('[finalize3ds] cancel-old failed:', e?.message);
        }
      }
    }

    let subscription;
    try {
      subscription = await Subscription.createForUser(payment.userId, plan, {
        pricePaid: payment.amount,
        currency: payment.currency,
        status: plan.code === 'trial' ? SUBSCRIPTION_STATUS.TRIAL : SUBSCRIPTION_STATUS.ACTIVE,
        createdBy: { user: payment.userId, onBehalfOf: false },
      });

      if (plan.code === 'trial') {
        const TRIAL_DURATION_DAYS = 14;
        subscription.expiresAt = new Date(
          (subscription.activatedAt || subscription.createdAt).getTime()
            + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000
        );
      }

      subscription.metadata = {
        ...(subscription.metadata || {}),
        paymentTransactionId: payment.moyasarPaymentId,
        paymentId: payment._id,
      };
      if (payment.paymentMethod?.type) {
        subscription.paymentMethod = {
          type:        payment.paymentMethod.type,
          last4:       payment.paymentMethod.last4,
          brand:       payment.paymentMethod.company,
          expiryMonth: payment.paymentMethod.expiryMonth,
          expiryYear:  payment.paymentMethod.expiryYear,
        };
      }
      await subscription.save();

      payment.subscriptionId = subscription._id;
      await payment.save();
    } catch (createErr) {
      await this._recordPendingRefund({
        userId: payment.userId,
        amount: payment.amount,
        currency: payment.currency,
        paymentTransactionId: payment.moyasarPaymentId,
        paymentId: payment._id,
        reason: 'subscribe_finalize3ds_failed',
        detail: createErr?.message,
        planCode: plan.code,
      });
      throw createErr;
    }

    if (intent.discountCode) {
      try {
        const discountsService = require('../discounts/discounts.service');
        await discountsService.applyDiscount(intent.discountCode);
      } catch (e) { /* non-fatal */ }
    }
    await User.findByIdAndUpdate(payment.userId, {
      subscription: subscription._id,
      'profile.hostData.subscribedBefore': true,
    });
    notificationService.sendToUser(payment.userId, {
      type: 'subscription_activated',
      title: 'Subscription Activated',
      titleAr: 'تم تفعيل الاشتراك',
      message: `Your ${plan.code} subscription has been activated successfully.`,
      messageAr: `تم تفعيل اشتراكك في باقة ${plan.code} بنجاح.`,
      data: { entityType: 'subscription', entityId: subscription._id, metadata: { planCode: plan.code } },
    }).catch(console.error);

    return subscription.getSummary ? subscription.getSummary() : subscription;
  }
```

### 4.6 Addons service — write Payment

In `labbe-backend-/src/modules/addons/addons.service.js`:

**Add import** at the top (around line 13):

```js
const Payment = require('../../../models/PaymentModel');
```

**REPLACE** the charge block (current lines 98-131) with:

```js
    let paymentTransactionId = null;
    let paymentRecord = null;
    if (price > 0) {
      const callbackUrl = `${process.env.FRONTEND_URL || ''}/host/payments/return`;
      const derivedKey = idempotencyKey
        || `addon:${userId}:${addonType}:${scope}:${eventId || 'pool'}:${price}`;

      paymentRecord = await Payment.create({
        userId,
        amount: price,
        currency: 'SAR',
        provider: 'moyasar',
        status: Payment.PAYMENT_STATUS.PENDING,
        callbackUrl,
        description: `Addon purchase ${addonType}`,
        // `purpose: 'addon'` is the dispatch key used by webhook/reconcile/poll.
        metadata: {
          addonType, quantity: quantity || 1, templateType: templateType || null,
          scope, eventId: eventId || null, purpose: 'addon',
        },
      });

      const chargeParams = {
        amount: price,
        currency: 'SAR',
        // Default `creditcard` → stub immediate-paid; tests opt into the
        // 3DS redirect path explicitly via `creditcard_3ds_test`.
        source: data?.source || { type: 'creditcard' },
        customer: { id: userId },
        callbackUrl,
        userId,
        idempotencyKey: derivedKey,
        description: `Addon purchase ${addonType}`,
        metadata: {
          addonType, quantity: quantity || 1, templateType: templateType || null,
          scope, subscriptionId: subscriptionId || null, eventId: eventId || null,
          purpose: 'addon', userId: String(userId),
        },
      };
      const charge = await paymentProvider.charge(chargeParams);
      if (!charge.success) {
        paymentRecord.status = Payment.PAYMENT_STATUS.FAILED;
        paymentRecord.failedAt = new Date();
        paymentRecord.providerStatus = charge.providerStatus || charge.error || 'unknown';
        await paymentRecord.save().catch(() => {});
        // eslint-disable-next-line no-console
        console.error(
          '[addons.purchase] payment provider error:',
          charge.error || charge.providerStatus || 'unknown'
        );
        throw new ValidationError('Payment failed; addon not activated');
      }

      paymentTransactionId = charge.transactionId || null;
      paymentRecord.moyasarPaymentId = charge.transactionId;
      paymentRecord.givenId = charge.givenId || null;
      paymentRecord.providerStatus = charge.providerStatus;
      paymentRecord.fee = charge.fee || 0;
      if (charge.paymentMethod) paymentRecord.paymentMethod = charge.paymentMethod;

      if (charge.requiresAction) {
        paymentRecord.status = Payment.PAYMENT_STATUS.PENDING_3DS;
        paymentRecord.redirectUrl = charge.redirectUrl;
        paymentRecord.metadata = {
          ...(paymentRecord.metadata || {}),
          pendingAddonIntent: {
            addonType, quantity: quantity || 1, templateType: templateType || null,
            subscriptionId, eventId, scope,
          },
        };
        await paymentRecord.save();
        return {
          requiresAction: true,
          redirectUrl: charge.redirectUrl,
          paymentId: paymentRecord._id,
        };
      }

      paymentRecord.status = charge.providerStatus === 'authorized'
        ? Payment.PAYMENT_STATUS.AUTHORIZED
        : Payment.PAYMENT_STATUS.PAID;
      if (paymentRecord.status === Payment.PAYMENT_STATUS.PAID) paymentRecord.paidAt = new Date();
      if (paymentRecord.status === Payment.PAYMENT_STATUS.AUTHORIZED) paymentRecord.authorizedAt = new Date();
      await paymentRecord.save();
    }
```

**REPLACE** the `Addon.create` call (current line 174) — add
`paymentId: paymentRecord?._id` to the doc, and inside the post-create
block backlink the addon onto the payment:

```js
      addon = await Addon.create({
        userId,
        addonType,
        quantity: quantity || 1,
        templateType: templateType || null,
        price,
        currency: 'SAR',
        subscriptionId: resolvedSubscriptionId,
        eventId: eventId || null,
        status: initialStatus,
        scope,
        metadata: {
          paymentTransactionId,
          paymentId: paymentRecord?._id,                            // NEW
          idempotencyKey: idempotencyKey || null,
          activatedAt: initialStatus === 'active' ? new Date().toISOString() : null,
        },
      });

      if (paymentRecord) {                                          // NEW
        paymentRecord.addonId = addon._id;
        await paymentRecord.save().catch(() => {});
      }
```

Add `paymentId` to the destructure of `_recordPendingRefund` and include
it in the audit metadata, identical to the subscription edit above.

**Addons service — `finalizePending3ds()` (NEW METHOD)**

Add at the bottom of the `AddonsService` class, before `module.exports`.
This is the addon-side mirror of
`subscriptionsService.finalizePending3ds`; webhook + reconcile + the
3DS poll endpoint all need a path that creates the Addon row and
applies quota *after* the user has cleared the 3DS challenge:

```js
  /**
   * Finalize a pending-3ds addon purchase. Idempotent — if the addon
   * row already exists (Payment.addonId is set), returns it as-is.
   *
   * Reads the `pendingAddonIntent` snapshot the addon service stored
   * on the Payment row and replays the create-and-quota path with the
   * same compensating-action logic the synchronous flow uses.
   */
  async finalizePending3ds(paymentId) {
    const Payment = require('../../../models/PaymentModel');
    const payment = await Payment.findById(paymentId);
    if (!payment) throw new NotFoundError('Payment');

    if (payment.addonId) {
      const existing = await Addon.findById(payment.addonId);
      if (existing) return existing;
    }

    if (![Payment.PAYMENT_STATUS.PAID, Payment.PAYMENT_STATUS.AUTHORIZED]
        .includes(payment.status)) {
      throw new ValidationError(
        `Payment ${paymentId} is in status "${payment.status}", cannot finalize`
      );
    }

    const intent = payment.metadata?.pendingAddonIntent;
    if (!intent) {
      throw new ValidationError(`Payment ${paymentId} has no addon intent`);
    }

    const { addonType, quantity, templateType, subscriptionId, eventId, scope } = intent;
    const userId = payment.userId;
    const price = payment.amount;
    const paymentTransactionId = payment.moyasarPaymentId;

    let resolvedSubscriptionId = subscriptionId || null;
    if (!resolvedSubscriptionId && (scope === 'pool' || scope === 'org')) {
      const activeSubs = await Subscription.findActiveForUser(userId);
      const activeSub = activeSubs[0] || null;
      if (activeSub) resolvedSubscriptionId = activeSub._id;
    }

    let targetEvent = null;
    if (scope === 'event' && eventId) {
      targetEvent = await Event.findById(eventId);
      if (!targetEvent) throw new NotFoundError('Event');
    }

    const isBusinessCustomization = addonType === ADDON_TYPES.BUSINESS_CUSTOMIZATION;
    const initialStatus = isBusinessCustomization ? 'pending_provisioning' : 'active';

    let addon;
    try {
      addon = await Addon.create({
        userId,
        addonType,
        quantity: quantity || 1,
        templateType: templateType || null,
        price,
        currency: 'SAR',
        subscriptionId: resolvedSubscriptionId,
        eventId: eventId || null,
        status: initialStatus,
        scope,
        metadata: {
          paymentTransactionId,
          paymentId: payment._id,
          activatedAt: initialStatus === 'active' ? new Date().toISOString() : null,
        },
      });
      payment.addonId = addon._id;
      await payment.save();
    } catch (createErr) {
      await this._recordPendingRefund({
        userId,
        amount: price,
        currency: 'SAR',
        paymentTransactionId,
        paymentId: payment._id,
        reason: 'addon_finalize3ds_create_failed',
        detail: createErr?.message,
        addonType, scope, eventId,
      });
      throw createErr;
    }

    if (initialStatus === 'active') {
      try {
        await this._applyQuota(addon, { targetEvent });
      } catch (quotaErr) {
        try {
          addon.status = 'failed_quota';
          addon.metadata = { ...(addon.metadata || {}), quotaError: quotaErr?.message || 'unknown' };
          await addon.save();
        } catch (_) { /* swallow */ }
        await this._recordPendingRefund({
          userId,
          amount: price,
          currency: 'SAR',
          paymentTransactionId,
          paymentId: payment._id,
          reason: 'addon_finalize3ds_quota_failed',
          detail: quotaErr?.message,
          addonType, scope, eventId,
          addonId: addon._id,
        });
        throw quotaErr;
      }
    }

    await logAudit({
      action: 'addon.purchased_3ds',
      actor: { _id: userId, role: 'host' },
      targetType: 'system',
      targetId: addon._id,
      metadata: {
        addonId: addon._id, addonType, quantity: quantity || 1,
        scope, price, status: initialStatus,
        paymentTransactionId, paymentId: payment._id,
        eventId: eventId || null, subscriptionId: resolvedSubscriptionId || null,
      },
    });

    return addon;
  }
```

> **Why both intents on the Payment row?** A given Payment activates
> exactly one of `subscription` or `addon`. We use a single
> `payment.metadata.purpose` field (`"subscription" | "addon"`) — set
> by the originating service — as the dispatch key. Webhook, reconcile,
> and poll all read `purpose` and call the matching `finalizePending3ds`.

### 4.7 Subscription/Addon model touches

In `labbe-backend-/models/SubscriptionModel.js`, add `expired` and
`pending` to the status enum if not already present (check
`shared/constants/SUBSCRIPTION_STATUS`). No schema field for `paymentId`
is needed — we keep it in `metadata`.

In `labbe-backend-/models/AddonModel.js`, add `pending_3ds` to the
status enum (open the file and locate the `status` field; add
`'pending_3ds'`). The Payment row carries the redirect URL; the addon
row simply records the wait state so the host's "my addons" view does
not show a paid addon mid-3DS.

### 4.8 Payments module — routes, controller, service, webhook

**CREATE** `labbe-backend-/src/modules/payments/index.js`:

```js
module.exports = {
  routes: require('./payments.routes'),
};
```

**CREATE** `labbe-backend-/src/modules/payments/payments.service.js`:

```js
/**
 * Payments service.
 *
 * Read paths against the Payment collection, plus admin actions
 * (refund, capture, void) that wrap the provider and reconcile the
 * Payment row.
 */

const Payment = require('../../../models/PaymentModel');
const Subscription = require('../../../models/SubscriptionModel');
const Addon = require('../../../models/AddonModel');
const paymentProvider = require('../../infrastructure/paymentProvider');
const { NotFoundError, ValidationError } = require('../../shared/errors');
const { logAudit } = require('../../shared/utils/auditLog');

class PaymentsService {
  async getById(paymentId) {
    const p = await Payment.findById(paymentId)
      .populate('userId', 'name email phoneNumber')
      .populate('subscriptionId')
      .populate('addonId');
    if (!p) throw new NotFoundError('Payment');
    return p;
  }

  async getByMoyasarId(moyasarPaymentId) {
    return Payment.findOne({ moyasarPaymentId });
  }

  /**
   * Reconcile a Payment row with Moyasar's view of the payment.
   * Used by the webhook handler and the reconciliation cron. Idempotent
   * — repeated calls converge to the same state.
   */
  async reconcileWithProvider(paymentId) {
    const payment = await Payment.findById(paymentId);
    if (!payment) throw new NotFoundError('Payment');
    if (!payment.moyasarPaymentId) return payment;

    const result = await paymentProvider.fetchPayment(payment.moyasarPaymentId);
    if (!result.success) {
      // eslint-disable-next-line no-console
      console.error('[payments.reconcile] fetch failed:', result.error);
      return payment;
    }
    payment.applyMoyasarSnapshot(result.data);
    await payment.save();
    return payment;
  }

  async issueRefund({ paymentId, amount, reason, actorUserId }) {
    const payment = await Payment.findById(paymentId);
    if (!payment) throw new NotFoundError('Payment');
    if (![Payment.PAYMENT_STATUS.PAID, Payment.PAYMENT_STATUS.CAPTURED, Payment.PAYMENT_STATUS.PARTIALLY_REFUNDED]
        .includes(payment.status)) {
      throw new ValidationError(`Cannot refund payment in status "${payment.status}"`);
    }
    const remaining = payment.amount - (payment.refundedAmount || 0);
    if (typeof amount === 'number' && amount > remaining) {
      throw new ValidationError(`Refund amount ${amount} exceeds remaining ${remaining}`);
    }

    const result = await paymentProvider.refund({
      moyasarPaymentId: payment.moyasarPaymentId,
      amount,
    });
    if (!result.success) {
      throw new ValidationError(result.error || 'Refund failed at provider');
    }

    const refundEntry = {
      amount: typeof amount === 'number' ? amount : remaining,
      reason: reason || null,
      createdAt: new Date(),
      createdBy: actorUserId || null,
      moyasarRefundResponseStatus: result.providerStatus,
    };
    payment.refunds.push(refundEntry);
    payment.refundedAmount = (payment.refundedAmount || 0) + refundEntry.amount;
    payment.refundedAt = new Date();
    payment.providerStatus = result.providerStatus;
    payment.status = payment.refundedAmount >= payment.amount
      ? Payment.PAYMENT_STATUS.REFUNDED
      : Payment.PAYMENT_STATUS.PARTIALLY_REFUNDED;
    await payment.save();

    await logAudit({
      action: 'payment.refunded',
      actor: { _id: actorUserId, role: 'admin' },
      targetType: 'payment',
      targetId: payment._id,
      metadata: { amount: refundEntry.amount, reason, moyasarPaymentId: payment.moyasarPaymentId },
    });

    // Cancel the linked subscription if the refund is full and the sub
    // is still active. Addon-side cleanup is intentionally manual: refunding
    // an addon with consumed quota is a real ops decision.
    if (payment.status === Payment.PAYMENT_STATUS.REFUNDED && payment.subscriptionId) {
      const sub = await Subscription.findById(payment.subscriptionId);
      if (sub && (sub.status === 'active' || sub.status === 'trial')) {
        sub.status = 'cancelled';
        sub.cancelledAt = new Date();
        sub.cancelReason = 'refund_issued';
        await sub.save();
      }
    }

    return payment;
  }

  async capturePayment({ paymentId, amount, actorUserId }) {
    const payment = await Payment.findById(paymentId);
    if (!payment) throw new NotFoundError('Payment');
    if (payment.status !== Payment.PAYMENT_STATUS.AUTHORIZED) {
      throw new ValidationError(`Cannot capture payment in status "${payment.status}"`);
    }
    const result = await paymentProvider.capture({ moyasarPaymentId: payment.moyasarPaymentId, amount });
    if (!result.success) throw new ValidationError(result.error || 'Capture failed at provider');

    payment.capturedAmount = result.capturedAmount || payment.amount;
    payment.capturedAt = new Date();
    payment.providerStatus = result.providerStatus;
    payment.status = Payment.PAYMENT_STATUS.CAPTURED;
    await payment.save();

    await logAudit({
      action: 'payment.captured',
      actor: { _id: actorUserId, role: 'admin' },
      targetType: 'payment',
      targetId: payment._id,
      metadata: { amount: payment.capturedAmount, moyasarPaymentId: payment.moyasarPaymentId },
    });
    return payment;
  }

  async voidPayment({ paymentId, actorUserId }) {
    const payment = await Payment.findById(paymentId);
    if (!payment) throw new NotFoundError('Payment');
    if (payment.status !== Payment.PAYMENT_STATUS.AUTHORIZED) {
      throw new ValidationError(`Cannot void payment in status "${payment.status}"`);
    }
    const result = await paymentProvider.voidPayment({ moyasarPaymentId: payment.moyasarPaymentId });
    if (!result.success) throw new ValidationError(result.error || 'Void failed at provider');

    payment.voidedAt = new Date();
    payment.providerStatus = result.providerStatus;
    payment.status = Payment.PAYMENT_STATUS.VOIDED;
    await payment.save();

    await logAudit({
      action: 'payment.voided',
      actor: { _id: actorUserId, role: 'admin' },
      targetType: 'payment',
      targetId: payment._id,
      metadata: { moyasarPaymentId: payment.moyasarPaymentId },
    });
    return payment;
  }
}

module.exports = new PaymentsService();
```

**CREATE** `labbe-backend-/src/modules/payments/webhook.controller.js`:

```js
/**
 * Moyasar webhook handler.
 *
 * Endpoint: POST /api/v2/payments/webhook
 *
 * AUTHENTICATION
 *   Moyasar sends a constant `secret_token` (configured per-webhook in
 *   the Moyasar dashboard). We compare against
 *   `MOYASAR_WEBHOOK_SECRET` using a constant-time string compare.
 *   The token is sent either inside the body (`secret_token` field) or
 *   in the `X-Moyasar-Auth` header — we accept both.
 *
 *   Optional defense-in-depth: if MOYASAR_WEBHOOK_IP_WHITELIST is set,
 *   we 403 anything not in the list. We do not enforce by default
 *   because Moyasar's published IP ranges rotate and the runtime cost
 *   of a stale list is dropped legitimate webhooks.
 *
 * IDEMPOTENCY
 *   Multiple webhooks for the same `id` + `type` may arrive (Moyasar
 *   retries on non-2xx). We dedupe via `withIdempotency` keyed on
 *   `<moyasarPaymentId>:<eventType>`, scope `payment.webhook`. Duplicate
 *   deliveries replay the cached 200 without re-executing the handler.
 *
 * BODY SHAPE (Moyasar)
 *   {
 *     id: <event uuid>,
 *     type: 'payment_paid' | 'payment_failed' | 'payment_refunded' | 'payment_captured' | 'payment_authorized' | 'payment_voided' | 'payment_updated',
 *     account_name: <merchant name>,
 *     live: true | false,
 *     created_at: <iso>,
 *     secret_token: <our secret>,
 *     data: <Payment object — same shape as GET /payments/:id>,
 *   }
 */

const crypto = require('crypto');
const Payment = require('../../../models/PaymentModel');
const paymentsService = require('./payments.service');
const subscriptionsService = require('../subscriptions/subscriptions.service');
const { withIdempotency, sha256 } = require('../../shared/utils/idempotency');
const { logAudit } = require('../../shared/utils/auditLog');

const constantTimeEqual = (a, b) => {
  const ab = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
};

const verifySecret = (req) => {
  const expected = process.env.MOYASAR_WEBHOOK_SECRET;
  if (!expected) {
    // eslint-disable-next-line no-console
    console.error('[moyasar.webhook] MOYASAR_WEBHOOK_SECRET not configured — rejecting all traffic');
    return false;
  }
  const headerToken = req.get('x-moyasar-auth') || req.get('moyasar-auth');
  const bodyToken = req.body?.secret_token;
  return constantTimeEqual(headerToken, expected) || constantTimeEqual(bodyToken, expected);
};

const verifyIp = (req) => {
  const list = (process.env.MOYASAR_WEBHOOK_IP_WHITELIST || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (list.length === 0) return true; // not enforced
  const ip = (req.ip || req.connection?.remoteAddress || '').replace(/^::ffff:/, '');
  return list.includes(ip);
};

exports.handle = async (req, res) => {
  if (!verifyIp(req)) {
    // eslint-disable-next-line no-console
    console.warn('[moyasar.webhook] rejected by IP allowlist:', req.ip);
    return res.status(403).json({ status: 'error', message: 'forbidden' });
  }
  if (!verifySecret(req)) {
    return res.status(401).json({ status: 'error', message: 'unauthorized' });
  }

  const { id: eventId, type: eventType, data } = req.body || {};
  if (!eventType || !data?.id) {
    return res.status(400).json({ status: 'error', message: 'malformed payload' });
  }

  const dedupKey = `${data.id}:${eventType}`;

  try {
    const result = await withIdempotency(
      dedupKey,
      async () => {
        const payment = await Payment.findOne({ moyasarPaymentId: data.id });
        if (!payment) {
          // We never created this Payment — most likely a manual charge
          // from the Moyasar dashboard, or a stale event for a deleted
          // record. Audit-log and 200 so Moyasar stops retrying.
          await logAudit({
            action: 'payment.webhook_unknown',
            actor: { _id: null, role: 'system' },
            targetType: 'payment',
            metadata: { eventId, eventType, moyasarPaymentId: data.id },
          });
          return { handled: false, reason: 'unknown_payment' };
        }

        payment.applyMoyasarSnapshot(data);
        await payment.save();

        // Dispatch on `purpose` (set by the originating service): a
        // single Payment row finalises EITHER a subscription OR an addon.
        if (eventType === 'payment_paid') {
          const purpose = payment.metadata?.purpose;
          try {
            if (purpose === 'subscription' && payment.metadata?.pendingSubscribeIntent && !payment.subscriptionId) {
              await subscriptionsService.finalizePending3ds(payment._id);
            } else if (purpose === 'addon' && payment.metadata?.pendingAddonIntent && !payment.addonId) {
              const addonsService = require('../addons/addons.service');
              await addonsService.finalizePending3ds(payment._id);
            }
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error('[moyasar.webhook] finalize3ds failed:', err?.message);
            // Do NOT re-throw — the webhook still succeeded as far as
            // payment-state reconciliation goes; finalize failure has
            // already written a `pending_refund` audit row that ops
            // can pick up.
          }
        }

        await logAudit({
          action: 'payment.webhook_processed',
          actor: { _id: null, role: 'system' },
          targetType: 'payment',
          targetId: payment._id,
          metadata: { eventId, eventType, moyasarPaymentId: data.id, status: payment.status },
        });

        return { handled: true, paymentId: payment._id };
      },
      {
        scope: 'payment.webhook',
        requestHash: sha256({ eventType, dataId: data.id, status: data.status, refunded: data.refunded || 0, captured: data.captured || 0 }),
        userId: null,
      }
    );
    return res.status(200).json({ status: 'success', ...result });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[moyasar.webhook] handler error:', err?.message);
    // Return 500 so Moyasar retries.
    return res.status(500).json({ status: 'error', message: 'internal' });
  }
};
```

**CREATE** `labbe-backend-/src/modules/payments/payments.controller.js`:

```js
const paymentsService = require('./payments.service');
const webhookController = require('./webhook.controller');
// NOTE: catchAsync lives in shared/utils, not shared/errors. The codebase
// convention everywhere (auth, admin, plans, users…) is the direct path.
const catchAsync = require('../../shared/utils/catchAsync');
const { ROLES } = require('../../shared/constants');

exports.webhook = webhookController.handle;

exports.getById = catchAsync(async (req, res) => {
  const payment = await paymentsService.getById(req.params.id);
  // Authorization: hosts may only see their own payments; admins see all.
  const userId = String(req.user._id);
  const isAdmin = [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.MODERATOR,
                   ROLES.WHITELABEL_ADMIN, ROLES.WHITELABEL_MODERATOR].includes(req.user.role);
  if (!isAdmin && String(payment.userId?._id || payment.userId) !== userId) {
    return res.status(403).json({ status: 'error', message: 'forbidden' });
  }
  return res.status(200).json({ status: 'success', data: payment });
});

exports.poll3ds = catchAsync(async (req, res) => {
  let payment = await paymentsService.getById(req.params.id);
  if (payment.status === 'pending_3ds' || payment.status === 'pending') {
    payment = await paymentsService.reconcileWithProvider(payment._id);
    if (payment.status === 'paid') {
      const purpose = payment.metadata?.purpose;
      try {
        if (purpose === 'subscription' && payment.metadata?.pendingSubscribeIntent && !payment.subscriptionId) {
          const subscriptionsService = require('../subscriptions/subscriptions.service');
          await subscriptionsService.finalizePending3ds(payment._id);
        } else if (purpose === 'addon' && payment.metadata?.pendingAddonIntent && !payment.addonId) {
          const addonsService = require('../addons/addons.service');
          await addonsService.finalizePending3ds(payment._id);
        }
      } catch (_) { /* finalize errors emit their own pending_refund audit */ }
      payment = await paymentsService.getById(payment._id);
    }
  }
  return res.status(200).json({ status: 'success', data: payment });
});

// Admin actions ────────────────────────────────────────────────
exports.refund = catchAsync(async (req, res) => {
  const { amount, reason } = req.body || {};
  const payment = await paymentsService.issueRefund({
    paymentId: req.params.id,
    amount: typeof amount === 'number' ? amount : undefined,
    reason,
    actorUserId: req.user._id,
  });
  return res.status(200).json({ status: 'success', data: payment });
});

exports.capture = catchAsync(async (req, res) => {
  const { amount } = req.body || {};
  const payment = await paymentsService.capturePayment({
    paymentId: req.params.id,
    amount: typeof amount === 'number' ? amount : undefined,
    actorUserId: req.user._id,
  });
  return res.status(200).json({ status: 'success', data: payment });
});

exports.void = catchAsync(async (req, res) => {
  const payment = await paymentsService.voidPayment({
    paymentId: req.params.id,
    actorUserId: req.user._id,
  });
  return res.status(200).json({ status: 'success', data: payment });
});

// Stub-only: allow tests to flip a stub payment to `paid` without
// going through 3DS. Disabled in production.
exports.stubComplete3ds = catchAsync(async (req, res) => {
  if (process.env.MOYASAR_API_KEY) return res.status(404).end();
  const stub = require('../../infrastructure/paymentProvider/stub');
  stub._setStubStatus(req.query.id, 'paid');
  res.send('Stub 3DS complete. You may close this window.');
});
```

**CREATE** `labbe-backend-/src/modules/payments/payments.routes.js`:

```js
const express = require('express');
const router = express.Router();

const paymentsController = require('./payments.controller');
const { protect } = require('../../shared/middleware/auth');
const { restrictTo } = require('../../shared/middleware/rbac');
const { idempotency } = require('../../shared/middleware/idempotency');
const { ROLES } = require('../../shared/constants');

// ─── Public webhook (NO `protect`) ────────────────────────────
router.post('/webhook', paymentsController.webhook);

// ─── Stub-only 3DS completion helper (dev/CI) ─────────────────
router.get('/_stub/3ds-complete', paymentsController.stubComplete3ds);

// ─── Authenticated routes ─────────────────────────────────────
router.use(protect);

router.get('/:id', paymentsController.getById);
router.get('/:id/poll', paymentsController.poll3ds);

// ─── Admin actions ────────────────────────────────────────────
//
// We use restrictTo(SUPER_ADMIN, ADMIN) NOT
// requirePageAccess(ADMIN_PAGES.PAYMENTS, 'full') for two reasons:
//   1. `canAccessPage()` doesn't treat `'full'` as a valid action — it
//      maps actions to required levels, and unknown actions return
//      false. Using `'full'` here would 403 every role.
//   2. Even if we picked `'export'` (which DOES require the FULL level),
//      WHITELABEL_ADMIN has `PAYMENTS: FULL` on their org and would
//      gain refund authority. The matrix in §11 says they should not.
//
// `restrictTo(SUPER_ADMIN, ADMIN)` is the explicit, auditable gate.
router.post('/:id/refund',
  restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  idempotency({ scope: 'payments.refund' }),
  paymentsController.refund
);
router.post('/:id/capture',
  restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  idempotency({ scope: 'payments.capture' }),
  paymentsController.capture
);
router.post('/:id/void',
  restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  idempotency({ scope: 'payments.void' }),
  paymentsController.void
);

module.exports = router;
```

**MODIFY** `labbe-backend-/src/app.js` — register the new module.

Around line 38 (next to `addonsRoutes`), add:
```js
const { routes: paymentsRoutes } = require('./modules/payments');
```

Inside `mountRoutes`, after `app.use(`${prefix}/addons`, addonsRoutes);` add:
```js
    app.use(`${prefix}/payments`, paymentsRoutes);
```

### 4.9 Frontend — 3DS return page + checkout wiring

**MODIFY** `labbe/services/new-backend/api.config.js` — add to the
existing top-level object:

```js
  // ============================================
  // PAYMENTS MODULE (host-facing single payment + 3DS)
  // ============================================
  hostPayments: {
    getById: (id) => `/payments/${id}`,
    poll3ds: (id) => `/payments/${id}/poll`,
  },
```

And extend `payments` (admin) with the action paths:

```js
  payments: {
    getAll: '/admin/payments',
    getById: (id) => `/admin/payments/${id}`,
    getSummary: '/admin/payments/summary',
    export: '/admin/payments/export',
    refund:  (id) => `/payments/${id}/refund`,    // admin action
    capture: (id) => `/payments/${id}/capture`,
    void:    (id) => `/payments/${id}/void`,
  },
```

**MODIFY** `labbe/hooks/reactQueryHooks/useSubscriptions.js` — change the
`subscribe` mutation so a `requiresAction` response triggers a redirect:

```js
    subscribe: {
      mutationFn: async ({ planCode, discountCode, source }) => {
        const data = await apiRequest({
          method: "POST",
          path: API_PATHS.subscriptions.subscribe,
          data: {
            planCode,
            ...(discountCode ? { discountCode } : {}),
            ...(source ? { source } : {}),
          },
        });
        // Backend response shape on 3DS: { data: { requiresAction, redirectUrl, paymentId } }
        const inner = data?.data || data;
        if (inner?.requiresAction && inner?.redirectUrl && typeof window !== "undefined") {
          window.location.href = inner.redirectUrl;
          // Surface a recognisable promise state so callers don't toast a "success"
          return { requiresAction: true, paymentId: inner.paymentId };
        }
        return data;
      },
      onSuccess: (result) => {
        if (result?.requiresAction) return;
        queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
        queryClient.invalidateQueries({ queryKey: ["events", "subscription-info"] });
      },
    },
```

**CREATE** `labbe/app/[lang]/host/payments/return/page.js`:

```js
import PaymentReturnClient from "./_components/PaymentReturnClient";

export default function PaymentReturnPage() {
  return <PaymentReturnClient />;
}
```

**CREATE** `labbe/app/[lang]/host/payments/return/_components/PaymentReturnClient.jsx`:

```jsx
"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { apiRequest } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";

const TERMINAL = new Set(["paid", "captured", "failed", "refunded", "voided", "partially_refunded"]);

export default function PaymentReturnClient() {
  const { t } = useTranslation("hostPayments");
  const router = useRouter();
  const { lang } = useParams();
  const searchParams = useSearchParams();
  const pollRef = useRef(null);

  // Moyasar appends `id` and `status` to the callback URL; we accept either.
  const moyasarId = searchParams.get("id");
  const [status, setStatus] = useState("pending_3ds");
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!moyasarId) {
      setError(t("return.missingId", "Payment reference missing"));
      return;
    }
    let cancelled = false;
    let attempts = 0;

    const poll = async () => {
      try {
        const res = await apiRequest({
          method: "GET",
          path: API_PATHS.hostPayments.poll3ds(moyasarId),
        });
        const payment = res?.data?.data || res?.data || res;
        if (cancelled) return;
        setStatus(payment.status);
        if (TERMINAL.has(payment.status)) {
          if (payment.status === "paid" || payment.status === "captured") {
            router.replace(`/${lang}/host/create-event`);
          }
          return;
        }
        if (++attempts < 30) {
          pollRef.current = setTimeout(poll, 2000);
        } else {
          setError(t("return.timeout", "Still confirming your payment. We'll email you once it lands."));
        }
      } catch (err) {
        setError(err?.message || t("return.error", "Failed to confirm payment"));
      }
    };
    poll();

    return () => {
      cancelled = true;
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, [moyasarId, lang, router, t]);

  if (error) {
    return (
      <div style={{ padding: 32, textAlign: "center" }}>
        <h1>{t("return.title", "Payment status")}</h1>
        <p style={{ color: "#c62828" }}>{error}</p>
        <button onClick={() => router.push(`/${lang}/host`)}>{t("return.backHome", "Back to dashboard")}</button>
      </div>
    );
  }

  return (
    <div style={{ padding: 32, textAlign: "center" }}>
      <h1>{t("return.title", "Payment status")}</h1>
      <p>{t(`return.status.${status}`, status)}</p>
      <SimpleLoading message={t("return.confirming", "Confirming with the bank…")} />
    </div>
  );
}
```

---

## 5. Phase 2 — Payment methods & reconciliation (P1)

### 5.1 Frontend payment-method selector

**CREATE** `labbe/app/[lang]/host/plans/_components/PaymentMethodSelector.jsx`:

```jsx
"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import styles from "./PaymentMethodSelector.module.css";

const METHODS = [
  { key: "creditcard", labelKey: "checkout.method.card",     icon: "💳" },
  { key: "applepay",   labelKey: "checkout.method.applepay", icon: "🍎" },
  { key: "stcpay",     labelKey: "checkout.method.stcpay",   icon: "📱" },
];

export default function PaymentMethodSelector({ value, onChange, onCardChange, onMobileChange }) {
  const { t } = useTranslation("plans");
  const [card, setCard] = useState({ name: "", number: "", month: "", year: "", cvc: "" });
  const [mobile, setMobile] = useState("");

  const updateCard = (field, val) => {
    const next = { ...card, [field]: val };
    setCard(next);
    onCardChange?.(next);
  };
  const updateMobile = (val) => {
    setMobile(val);
    onMobileChange?.(val);
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.tabs}>
        {METHODS.map((m) => (
          <button
            key={m.key}
            type="button"
            className={`${styles.tab} ${value === m.key ? styles.tabActive : ""}`}
            onClick={() => onChange(m.key)}
          >
            <span className={styles.icon}>{m.icon}</span>
            <span>{t(m.labelKey)}</span>
          </button>
        ))}
      </div>

      {value === "creditcard" && (
        <div className={styles.fields}>
          <input className={styles.input} placeholder={t("checkout.card.name")}
                 value={card.name} onChange={(e) => updateCard("name", e.target.value)} />
          <input className={styles.input} placeholder={t("checkout.card.number")}
                 inputMode="numeric" maxLength={19}
                 value={card.number} onChange={(e) => updateCard("number", e.target.value.replace(/\D/g, ""))} />
          <div className={styles.row}>
            <input className={styles.input} placeholder="MM" maxLength={2} inputMode="numeric"
                   value={card.month} onChange={(e) => updateCard("month", e.target.value.replace(/\D/g, ""))} />
            <input className={styles.input} placeholder="YYYY" maxLength={4} inputMode="numeric"
                   value={card.year} onChange={(e) => updateCard("year", e.target.value.replace(/\D/g, ""))} />
            <input className={styles.input} placeholder="CVC" maxLength={4} inputMode="numeric"
                   value={card.cvc} onChange={(e) => updateCard("cvc", e.target.value.replace(/\D/g, ""))} />
          </div>
        </div>
      )}

      {value === "stcpay" && (
        <div className={styles.fields}>
          <input className={styles.input} placeholder="05XXXXXXXX" inputMode="tel"
                 value={mobile} onChange={(e) => updateMobile(e.target.value.replace(/\D/g, ""))} />
        </div>
      )}

      {value === "applepay" && (
        <p className={styles.note}>{t("checkout.applepay.note", "You'll be prompted by Apple Pay on the next step.")}</p>
      )}
    </div>
  );
}
```

Add a matching `PaymentMethodSelector.module.css` with simple flex/tab
styles (mirror sibling `*.module.css` files for consistency — no new
design tokens).

**MODIFY** `labbe/app/[lang]/host/plans/_components/index.js` — add the
selector to the named exports.

**MODIFY** `labbe/app/[lang]/host/plans/PlansPage.js`:

- Add state: `const [paymentMethod, setPaymentMethod] = useState("creditcard"); const [cardData, setCardData] = useState(null); const [stcMobile, setStcMobile] = useState("");`
- Render `<PaymentMethodSelector value={paymentMethod} onChange={setPaymentMethod} onCardChange={setCardData} onMobileChange={setStcMobile} />` inside the Summary panel (which already exists in `summary/Summary.jsx` — wire it in there or in `PlansPage`'s summary branch).
- In `handleProceedToPayment`, build the source object before calling `subscribeMutation.mutateAsync`:

```js
  const buildSource = () => {
    if (paymentMethod === "creditcard") {
      return {
        type: "creditcard",
        name: cardData?.name,
        number: cardData?.number,
        month: Number(cardData?.month),
        year: Number(cardData?.year),
        cvc: cardData?.cvc,
      };
    }
    if (paymentMethod === "stcpay") {
      return { type: "stcpay", mobile: stcMobile };
    }
    if (paymentMethod === "applepay") {
      return { type: "applepay", token: "<inject-token-from-applepay-sdk>" };
    }
    return null;
  };
  // …
  await subscribeMutation.mutateAsync({
    planCode: selectedPlan.code,
    ...(appliedDiscountCode ? { discountCode: appliedDiscountCode } : {}),
    source: buildSource(),
  });
```

> **Apple Pay note:** the `applepay` token must come from Apple's PassKit JS API
> (`ApplePaySession`). Implementing the PassKit handshake is a separate
> mini-feature; this plan intentionally leaves a placeholder so the
> selector renders, the backend understands the source type, and the
> dashboard registration in §7.2 surfaces the missing token as a
> validation error rather than as a silent stub.

### 5.2 Reconciliation cron

**CREATE** `labbe-backend-/src/modules/payments/payments.reconcile.js`:

```js
/**
 * Payment reconciliation cron entry.
 *
 * Runs every 5 minutes (registered in scheduledTasks.js). For every
 * Payment row in `pending` or `pending_3ds` for more than 2 minutes,
 * call Moyasar to fetch the current state. If the state has flipped
 * to `paid`/`failed`/etc., update the row and (if relevant) finalize
 * any pending subscription intent the way the webhook would.
 *
 * Multi-instance safe via cronLease.
 *
 * Bounded: at most BATCH_LIMIT rows per tick to keep Moyasar request
 * rates predictable. We sort by initiatedAt ASC so the oldest pending
 * row is reconciled first.
 */

const Payment = require('../../../models/PaymentModel');
const paymentsService = require('./payments.service');
const subscriptionsService = require('../subscriptions/subscriptions.service');

const BATCH_LIMIT = 50;
const STALE_AFTER_MS = 2 * 60 * 1000;

exports.runReconcileTick = async () => {
  const cutoff = new Date(Date.now() - STALE_AFTER_MS);
  const pendings = await Payment.find({
    status: { $in: [Payment.PAYMENT_STATUS.PENDING, Payment.PAYMENT_STATUS.PENDING_3DS] },
    initiatedAt: { $lte: cutoff },
    moyasarPaymentId: { $ne: null },
  })
    .sort({ initiatedAt: 1 })
    .limit(BATCH_LIMIT);

  let reconciled = 0;
  for (const p of pendings) {
    try {
      const before = p.status;
      const updated = await paymentsService.reconcileWithProvider(p._id);
      if (updated.status !== before) {
        reconciled += 1;
        if (updated.status === Payment.PAYMENT_STATUS.PAID) {
          const purpose = updated.metadata?.purpose;
          try {
            if (purpose === 'subscription' && updated.metadata?.pendingSubscribeIntent && !updated.subscriptionId) {
              await subscriptionsService.finalizePending3ds(updated._id);
            } else if (purpose === 'addon' && updated.metadata?.pendingAddonIntent && !updated.addonId) {
              const addonsService = require('../addons/addons.service');
              await addonsService.finalizePending3ds(updated._id);
            }
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error('[reconcile] finalize3ds failed:', err?.message);
          }
        }
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[reconcile] payment %s error: %s', p._id, err?.message);
    }
  }
  return { scanned: pendings.length, reconciled };
};
```

**MODIFY** `labbe-backend-/src/shared/utils/scheduledTasks.js`:

Add an import near the top (around line 24). `cronLease` is already
required further down at line 770 — reuse that import or move it up; do
**not** import a non-existent `acquireCronLease` named export:

```js
const { runReconcileTick } = require("../../modules/payments/payments.reconcile");
// cronLease is already required at line ~770; no re-import needed if you
// keep schedulePaymentReconcile defined below that point.
```

Above `initScheduledTasks`, add (modeled after
`scheduleSubscriptionStatusUpdate` at line 771, which is the canonical
multi-instance cron pattern in this file):

```js
const schedulePaymentReconcile = () => {
  cron.schedule("*/5 * * * *", async () => {
    const result = await cronLease.withLease(
      "payment_reconcile",
      async () => {
        try {
          const { scanned, reconciled } = await runReconcileTick();
          if (scanned > 0) {
            // eslint-disable-next-line no-console
            console.log(
              `[Cron] payment_reconcile: scanned=${scanned} reconciled=${reconciled}`
            );
          }
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error("[Cron] payment_reconcile error:", err.message);
        }
      },
      { ttlMs: 4 * 60 * 1000 }
    );
    if (!result.ran) {
      // eslint-disable-next-line no-console
      console.log("[Cron] payment_reconcile — skipped (lease held by another node)");
    }
  });
};
```

Inside `initScheduledTasks()` add `schedulePaymentReconcile();` and an
extra console line for the boot banner. Export `schedulePaymentReconcile`
in the bottom `module.exports` for testability.

> **`cronLease` API contract:** the actual exports of
> `src/shared/utils/cronLease.js` are `acquire(name, opts)`,
> `release(name)`, and `withLease(name, fn, opts)`. There is no
> `acquireCronLease` named export. The `withLease` wrapper is the right
> abstraction here: it acquires, runs, and releases atomically, matching
> the existing `scheduleSubscriptionStatusUpdate` pattern.

---

## 6. Phase 3 — Recurring billing & invoices (P1, optional first cut)

This phase is intentionally lighter on code because the prerequisites
(real Moyasar keys, observed webhook traffic, frontend Apple Pay token)
must land first. The blueprint below establishes the contracts; the
implementation is straightforward axios + a renewal cron once the prior
phases ship.

### 6.1 Moyasar Invoice methods on the provider

**MODIFY** `labbe-backend-/src/infrastructure/paymentProvider/moyasar.js`
— append:

```js
moyasarProvider.createInvoice = async ({ amount, currency = "SAR", description, callbackUrl, metadata }) => {
  if (!process.env.MOYASAR_API_KEY) return { success: false, error: "MOYASAR_API_KEY missing", provider: "moyasar" };
  const halalas = sarToHalalas(amount);
  try {
    const response = await axios.post(
      `${MOYASAR_BASE}/invoices`,
      { amount: halalas, currency, description, callback_url: callbackUrl, metadata: metadata || {} },
      { auth: auth(), timeout: 15000 }
    );
    const data = response.data || {};
    return {
      success: true,
      invoiceId: data.id,
      url: data.url,
      providerStatus: data.status,
      raw: data,
      provider: "moyasar",
    };
  } catch (err) {
    return { success: false, provider: "moyasar", error: err.response?.data?.message || err.message };
  }
};

moyasarProvider.fetchInvoice = async (invoiceId) => {
  if (!process.env.MOYASAR_API_KEY) return { success: false, error: "MOYASAR_API_KEY missing", provider: "moyasar" };
  try {
    const response = await axios.get(`${MOYASAR_BASE}/invoices/${invoiceId}`, { auth: auth(), timeout: 15000 });
    return { success: true, data: response.data, provider: "moyasar" };
  } catch (err) {
    return { success: false, provider: "moyasar", error: err.response?.data?.message || err.message };
  }
};
```

(Mirror in `stub.js` if recurring tests are needed in CI.)

### 6.2 Renewal cron

In `subscriptions.service.js`, add `renewSubscription(subscriptionId)`
that:

1. Loads the subscription + plan.
2. If plan is per-event or trial — return (no renewal).
3. Calls `paymentProvider.createInvoice(...)` for the next-period
   amount with `callback_url` pointing at `/host/payments/return`.
4. Stores the invoice id on the Subscription's `metadata.pendingInvoiceId`.
5. Notifies the host (email + in-app) with the invoice URL.

Webhook events `invoice_paid` / `invoice_failed` are handled inside the
webhook controller (extend `webhook.controller.js handle()` switch on
`eventType`):
- `invoice_paid` → find Subscription by `metadata.pendingInvoiceId`,
  call `subscription.renew()`, clear `pendingInvoiceId`.
- `invoice_failed` → mark `subscription.status = 'past_due'`, notify.

A new `scheduleSubscriptionRenewal` cron (daily at 02:00) iterates
subscriptions where `expiresAt <= now + 3 days` and `pendingInvoiceId`
is unset; calls `renewSubscription` for each.

This phase ships **after** Phase 1 + Phase 2 are stable in production.

---

## 7. Phase 4 — Admin enhancements (P1)

### 7.1 Re-target `admin.service.getPayments`

**MODIFY** `labbe-backend-/src/modules/admin/admin.service.js`:

Rename the existing function to `getPayments_legacy` (keep it for the
dual-write release window) and add a new `getPayments` that reads from
the `Payment` collection. Skeleton:

```js
const Payment = require('../../../models/PaymentModel');

// existing:
//   async getPayments(...) { ... } → rename to getPayments_legacy

async getPayments({ page = 1, limit = 10, status, from, to, whitelabelId } = {}) {
  const skip = (page - 1) * limit;
  const match = {};
  if (whitelabelId !== undefined) match.whitelabelId = whitelabelId;

  if (status && status !== 'all') {
    const map = {
      completed: { $in: ['paid', 'captured', 'partially_refunded'] },
      pending:   { $in: ['pending', 'pending_3ds', 'authorized'] },
      failed:    { $in: ['failed', 'voided', 'refunded'] },
    };
    if (map[status]) match.status = map[status];
  }
  const dateRange = this._buildDateRangeQuery(from, to);
  if (Object.keys(dateRange).length > 0) match.createdAt = dateRange;

  const baseMatch = whitelabelId !== undefined ? { whitelabelId } : {};
  const [rows, total, statsAgg] = await Promise.all([
    Payment.find(match)
      .populate('userId', 'name email phoneNumber')
      .sort({ createdAt: -1 })
      .skip(skip).limit(limit).lean(),
    Payment.countDocuments(match),
    Payment.aggregate([
      { $match: baseMatch },
      { $group: { _id: '$status', count: { $sum: 1 }, revenue: { $sum: '$amount' } } },
    ]),
  ]);

  const byStatus = {};
  let totalRevenue = 0;
  let pending = 0, completed = 0, failed = 0;
  for (const s of statsAgg) {
    byStatus[s._id] = { count: s.count, revenue: s.revenue || 0 };
    if (['paid', 'captured', 'partially_refunded'].includes(s._id)) {
      completed += s.count;
      totalRevenue += s.revenue || 0;
    } else if (['pending', 'pending_3ds', 'authorized'].includes(s._id)) {
      pending += s.count;
    } else if (['failed', 'voided', 'refunded'].includes(s._id)) {
      failed += s.count;
    }
  }

  return {
    payments: rows.map((p) => ({
      _id: p._id,
      amount: p.amount,
      currency: p.currency,
      status: ['paid', 'captured'].includes(p.status) ? 'completed'
            : ['pending', 'pending_3ds', 'authorized'].includes(p.status) ? 'pending'
            : ['failed', 'voided'].includes(p.status) ? 'failed'
            : ['refunded', 'partially_refunded'].includes(p.status) ? 'refunded'
            : p.status,
      hostName: p.userId?.name || p.userId?.email || null,
      description: p.description,
      paymentMethod: p.paymentMethod?.type || null,
      paymentMethodLast4: p.paymentMethod?.last4 || null,
      moyasarPaymentId: p.moyasarPaymentId,
      refundedAmount: p.refundedAmount,
      createdAt: p.createdAt,
    })),
    stats: { totalRevenue, pending, completed, failed },
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}
```

`exportPayments` is updated symmetrically.

`getPaymentSummary` (new) returns the `stats` block alone for the
dashboard widget.

`getPaymentDetail(paymentId)` (new) calls into `paymentsService.getById`
and adds the populated subscription/addon for rendering the detail
modal.

### 7.2 Admin routes

**MODIFY** `labbe-backend-/src/modules/admin/admin.routes.js` — add
beneath the existing `/payments` and `/payments/export` routes:

```js
router.get('/payments/summary',
  requirePageAccess(ADMIN_PAGES.PAYMENTS, 'view'),
  filterByWhitelabel,
  adminController.getPaymentSummary
);

router.get('/payments/:id',
  requirePageAccess(ADMIN_PAGES.PAYMENTS, 'view'),
  filterByWhitelabel,
  adminController.getPaymentDetail
);
```

(Refund / capture / void are mounted under `/api/v2/payments/:id/...`
in §4.8 — those use `requirePageAccess(ADMIN_PAGES.PAYMENTS, 'full')`
so MODERATOR / WHITELABEL_* roles are excluded.)

**MODIFY** `labbe-backend-/src/modules/admin/admin.controller.js`:

```js
exports.getPaymentSummary = catchAsync(async (req, res) => {
  const whitelabelId = req.whitelabelFilter;
  const summary = await adminService.getPaymentSummary({ whitelabelId });
  return res.status(200).json({ status: 'success', data: summary });
});

exports.getPaymentDetail = catchAsync(async (req, res) => {
  const detail = await adminService.getPaymentDetail(req.params.id);
  return res.status(200).json({ status: 'success', data: detail });
});
```

### 7.3 Admin frontend

**MODIFY** `labbe/app/[lang]/admin-dash/payments/_components/AdminPaymentsClient.js`:

- Add a "Payment method" column and a "Transaction ID" column
  (`p.paymentMethod`, `p.moyasarPaymentId`).
- Add row actions: "Refund", "Capture", "Void" — visible only when the
  user role is SUPER_ADMIN or ADMIN. Each opens a confirmation modal
  that calls the corresponding mutation.
- Add a payment-detail modal that fetches `/admin/payments/:id` and
  shows the full Moyasar response, refund history, linked subscription/addon.

**MODIFY** `labbe/services/adminDashboard.js` (where `paymentsAPI` is
defined). The existing `paymentsAPI` uses `apiClient.get/post`, so we
keep that style for consistency:

```js
import { apiRequest } from "@/services/new-backend/apiClient";

export const paymentsAPI = {
  // …existing getSummary / getAll / getById / export…

  // Admin write actions. The Idempotency-Key MUST be supplied by the
  // caller — generate it ONCE per logical operation (e.g. when the
  // refund-confirm modal opens) and pass the same value to any retry.
  // Generating a fresh UUID inside the helper would defeat idempotency:
  // a double-clicked "Refund" button would fire two distinct keys and
  // result in two real refunds.
  refund: (paymentId, { amount, reason }, idempotencyKey) =>
    apiRequest({
      method: "POST",
      path: API_PATHS.payments.refund(paymentId),
      data: { amount, reason },
      config: { headers: { "Idempotency-Key": idempotencyKey } },
    }),
  capture: (paymentId, { amount } = {}, idempotencyKey) =>
    apiRequest({
      method: "POST",
      path: API_PATHS.payments.capture(paymentId),
      data: { amount },
      config: { headers: { "Idempotency-Key": idempotencyKey } },
    }),
  void: (paymentId, idempotencyKey) =>
    apiRequest({
      method: "POST",
      path: API_PATHS.payments.void(paymentId),
      config: { headers: { "Idempotency-Key": idempotencyKey } },
    }),
};
```

> **`apiRequest` shape:** the helper at `labbe/services/new-backend/apiClient.js`
> accepts `{ method, path, data, params, config, isExport, isServer, serverToken }`.
> Custom headers go inside `config.headers`, **not** as a top-level
> `headers` field. (The earlier draft had this wrong.)

**MODIFY** `labbe/hooks/reactQueryHooks/useAdmin.js` — add mutations:

```js
export const useAdminPaymentRefund = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, amount, reason }) => paymentsAPI.refund(id, { amount, reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "payments"] }),
  });
};
// …mirror for capture / void…
```

**MODIFY** `labbe/app/[lang]/host/payments/_components/PaymentsClient.jsx`:

- Add `transactionId` and `paymentMethod.last4` columns.
- Render a `<RefundBadge />` when `payment.refundedAmount > 0`.
- Status keys in localization extended with `refunded`, `partially_refunded`.

### 7.4 Localization additions

**MODIFY** `labbe/localization/locales/en/hostPayments.json` — add:

```json
{
  "table": {
    "columns": {
      "service": "Service Type",
      "amount": "Amount",
      "date": "Transaction Date",
      "status": "Transaction Status",
      "method": "Payment Method",
      "transactionId": "Transaction ID"
    },
    "status": {
      "success": "Successful",
      "completed": "Completed",
      "pending": "Pending",
      "pending_3ds": "Awaiting 3-D Secure",
      "cancelled": "Cancelled",
      "failed": "Failed",
      "refunded": "Refunded",
      "partially_refunded": "Partially refunded"
    },
    "method": {
      "creditcard": "Card",
      "applepay": "Apple Pay",
      "samsungpay": "Samsung Pay",
      "stcpay": "STC Pay",
      "token": "Saved card"
    }
  },
  "return": {
    "title": "Payment status",
    "confirming": "Confirming with the bank…",
    "missingId": "Payment reference missing",
    "timeout": "Still confirming your payment. We'll email you once it lands.",
    "error": "Failed to confirm payment",
    "backHome": "Back to dashboard",
    "status": {
      "pending": "Pending",
      "pending_3ds": "Awaiting 3-D Secure",
      "authorized": "Authorized",
      "paid": "Paid",
      "captured": "Captured",
      "failed": "Failed",
      "refunded": "Refunded",
      "voided": "Voided"
    }
  }
}
```

Add the parallel Arabic strings to `ar/hostPayments.json`.

**MODIFY** `labbe/localization/locales/en/adminPayments.json` —
extend `table.columns` with `method`, `transactionId`, `actions`; extend
`table.status` with the same expanded enum; add an `actions` block:

```json
"actions": {
  "refund":  "Refund",
  "capture": "Capture",
  "void":    "Void",
  "viewDetails": "View details",
  "confirmRefund": "Refund {{amount}} {{currency}}?",
  "confirmCapture": "Capture this authorized payment?",
  "confirmVoid": "Void this authorized payment?"
}
```

Add the parallel Arabic strings to `ar/adminPayments.json`.

---

## 8. Phase 5 — Tokenization & saved cards (P2)

Deferred to a separate plan after Phase 1–4 are in production. Sketch:

- Use `source.save_card: true` on `creditcard` charges to instruct
  Moyasar to return a `token` string in the response.
- Persist that token in a new `SavedPaymentMethod` collection keyed
  on `userId`. Never store PAN or CVC.
- Re-charges use `source: { type: 'token', token }`. No `callback_url`
  is needed for token charges (Moyasar honours a stored 3DS exemption
  inside the saved card).
- Frontend "saved cards" screen lets the user mark a default and
  delete saved tokens (deleting just removes the row; we don't ask
  Moyasar to invalidate the token, as it expires naturally on the
  card's expiry).

Schema:

```js
const SavedPaymentMethodSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    moyasarTokenId: { type: String, required: true, unique: true },
    type: { type: String, enum: ["creditcard"], default: "creditcard" },
    company: String,
    last4: String,
    expiryMonth: Number,
    expiryYear: Number,
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);
```

---

## 9. Phase 6 — Coupons (P2)

Moyasar coupons are BIN-based and configured by Moyasar support — there
is no public API to create them. Integration is:

- Pass `apply_coupon: true` on the charge (it is the default; we only
  set it to `false` if a host has opted out of issuer promotions).
- After a charge, read `metadata['#coupon_id']` and
  `metadata['#coupon_discount']` from the response.
- If present, store them on the Payment row's `metadata.couponId` and
  `metadata.couponDiscount`. Show in payment history.

App-level discount codes (`subscriptions.service applyDiscount`) and
Moyasar coupons coexist: app discount reduces the amount we send to
Moyasar; Moyasar coupon reduces what the cardholder is actually
charged at the issuer level.

---

## 10. Phase 7 — Configuration & testing (P0)

### 10.1 Environment variables

**MODIFY** `labbe-backend-/config.env` — append:

```env
# ─── Moyasar ──────────────────────────────────────────────────────
MOYASAR_API_KEY=                        # sk_test_xxx in dev; sk_live_xxx in prod
MOYASAR_PUBLISHABLE_KEY=                # pk_test_xxx / pk_live_xxx (frontend)
MOYASAR_BASE_URL=https://api.moyasar.com/v1
MOYASAR_WEBHOOK_SECRET=                 # constant string from the dashboard's webhook config
MOYASAR_WEBHOOK_IP_WHITELIST=           # OPTIONAL, comma-separated. Leave blank to disable.
```

(Frontend) **MODIFY** `labbe/.env.local` (and Vercel project env):

```env
NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY=pk_test_xxx
```

### 10.2 Webhook configuration in Moyasar

In the Moyasar dashboard:

1. Webhooks → New webhook.
2. URL: `https://<api-host>/api/v2/payments/webhook`
3. Secret token: a random 32-byte hex string. Copy it to
   `MOYASAR_WEBHOOK_SECRET`.
4. Subscribed events: `payment_paid`, `payment_failed`, `payment_authorized`,
   `payment_captured`, `payment_refunded`, `payment_voided`,
   `payment_updated`, plus `invoice_paid` / `invoice_failed` if Phase 3
   is live.
5. Test the webhook by clicking "send test event" in the dashboard;
   verify a 200 in API logs and a `payment.webhook_unknown` audit row.

### 10.3 Test plan

A minimum acceptance set, runnable against the stub provider with
`MOYASAR_API_KEY` unset:

1. **Free / trial subscribe** — no payment row, no Moyasar call,
   subscription is `trial` for 14 days. (Existing test still passes.)
2. **Paid subscribe, immediate paid** — one Payment row in `paid`,
   subscription `active`, `subscription.metadata.paymentId` set.
3. **Paid subscribe, requires_action** — pass
   `source: { type: 'creditcard_3ds_test' }`. Endpoint returns
   `{ requiresAction: true, redirectUrl, paymentId }`. Hit
   `GET /payments/_stub/3ds-complete?id=<id>`, then poll
   `GET /payments/:id/poll`. Subscription is created on the server
   side via `finalizePending3ds`. Idempotent: a second poll returns
   the same subscription.
4. **Webhook simulation** — POST a Moyasar-shaped body to
   `/payments/webhook` with a stub payment id; assert 200, then assert
   the Payment row state is updated.
5. **Webhook auth** — same POST without `secret_token` → 401.
6. **Refund** — admin POSTs `/payments/:id/refund` with no `amount`
   (full refund). Assert Payment is `refunded`, linked subscription
   is `cancelled`.
7. **Partial refund** — POST `/payments/:id/refund` with `amount: 10`
   on a 30 SAR payment. Assert `partially_refunded`, `refunds[0].amount === 10`.
8. **Capture flow** — charge with `manual: true` (when implemented in
   the frontend). Assert `authorized`. POST
   `/payments/:id/capture`. Assert `captured`.
9. **Void flow** — same starting state, POST `/payments/:id/void`.
   Assert `voided`.
10. **Reconciliation cron** — insert a stale `pending_3ds` row
    pointing at a stub id whose status was flipped to `paid` out of
    band. Run `runReconcileTick()`. Assert the row is now `paid` and
    the subscription is created.
11. **Idempotent webhook** — deliver the same webhook event twice in
    quick succession. Assert the second call returns 200 immediately
    via `withIdempotency` cache replay; assert no duplicate audit row.
12. **Idempotent admin refund** — call refund twice with the same
    `Idempotency-Key`. Assert exactly one Moyasar call was made (the
    second is a route-level cache replay).

A static-checks file (`scripts/static-checks-payments.js`) should
mirror the Phase-5 pattern (`bb40b4f` style) and assert:

- `paymentProvider/index.js` exports `charge`, `refund`, `capture`,
  `voidPayment`, `fetchPayment`.
- Every required environment variable is referenced from at least
  one source file.
- `app.js` mounts `/payments` under `/api/v2`.
- `scheduledTasks.js initScheduledTasks` calls
  `schedulePaymentReconcile()`.

---

## 11. Role-based access matrix

| Role | View admin payments (`GET /admin/payments`) | View own (`GET /subscriptions/payments`) | View payment by id (`GET /payments/:id`) | Refund / Capture / Void (`POST /payments/:id/...`) | Whitelabel scope |
|---|---|---|---|---|---|
| **SUPER_ADMIN**          | ✓ all   | n/a   | ✓ any | ✓ | — |
| **ADMIN**                | ✓ all   | n/a   | ✓ any | ✓ | — |
| **MODERATOR**            | ✓ all   | n/a   | ✓ any | ✗ | — |
| **WHITELABEL_ADMIN**     | ✓ org   | n/a   | ✓ any | ✗ | filterByWhitelabel |
| **WHITELABEL_MODERATOR** | ✓ org   | n/a   | ✓ any | ✗ | filterByWhitelabel |
| **HOST**                 | ✗       | ✓ own | ✓ own only | ✗ | — |

**Read-side gating** (`/admin/payments`, `/admin/payments/:id`,
`/admin/payments/summary`, `/admin/payments/export`): uses
`requirePageAccess(ADMIN_PAGES.PAYMENTS, 'view')` + `filterByWhitelabel`.
Per `shared/constants/permissions.js`, `WHITELABEL_ADMIN.PAYMENTS = FULL`,
which grants view; `filterByWhitelabel` then restricts the result set
to the admin's org.

**Write-side gating** (`/payments/:id/refund|capture|void`): uses
`restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN)` directly. We do **not** use
`requirePageAccess(...,'full')` for two reasons that are easy to miss
and worth re-reading: `canAccessPage` does not recognise `'full'` as a
valid action (only `view`/`create`/`update`/`edit`/`delete`/`export`),
so passing it would 403 everyone; and even with `'export'` (the action
that maps to FULL), WHITELABEL_ADMIN's `PAYMENTS: FULL` access level
would let them refund. `restrictTo` is the explicit audit trail.

**Self-access for `GET /payments/:id`**: the controller compares
`req.user._id` to `payment.userId` and returns 403 to non-admin users
trying to read someone else's payment. The route does not gate by
`requirePageAccess`, so HOST users can read their own payments by id.

---

## 12. Implementation order & checkpoints

| Week | Phase | Definition of done |
|---|---|---|
| 1 | §4 (Phase 1) | PaymentModel exists; new provider methods land; subscribe + addon write Payment rows; webhook responds 200 with secret check; refund admin endpoint works end-to-end against the stub; static-checks-payments.js green. |
| 2 | §5 (Phase 2) | Frontend method selector renders; `source` is forwarded on subscribe; 3DS return page polls and finalizes; reconcile cron runs in dev. |
| 3 | §7 (Phase 4) | Admin payments page reads from Payment collection (legacy retained as fallback); admin refund/capture/void usable from UI; localization updated. |
| 4 | §6 (Phase 3) | Recurring billing via Moyasar invoice for monthly/quarterly/annual plans; renewal cron registered; expired subscriptions transition to `past_due` on invoice failure. |
| 5 | §8 + §9 | Saved-card tokenization; coupon visibility on payment history. |

Each weekly checkpoint must include:
- Audit grep for `pending_refund` rows — count must be 0 in green
  staging deploys.
- Production smoke against a known-test card (Moyasar provides several):
  4111 1111 1111 1111 (success), 4242 4242 4242 4242 (failure).

Once Phase 4 is two weeks old in production with no
`getPayments_legacy` reads, delete the legacy function and the
`subscription.metadata.paymentTransactionId` field becomes a read-only
backward-compat surface.

---

## 13. Open questions for the implementer

Things that are out of scope of this plan but should be settled
before Phase 2 ships:

1. **Apple Pay token sourcing** — is the Moyasar JS SDK acceptable on
   the web (it imports their iframe), or do we want to hand-roll
   PassKit and pass the encrypted token? The plan accommodates either
   by treating `source.token` as opaque.
2. **Refund of addon with consumed quota** — automated quota-rollback
   is non-trivial (events may already have been launched against the
   extra invites). The current plan leaves this to operations: the
   admin issues the refund, the audit log captures it, but the addon
   row's quota effects are not unwound. Confirm with product whether
   that is acceptable; if not, this becomes Phase 6.
3. **3DS frictionless responses** — Moyasar may return `paid` directly
   for low-risk transactions (no `transaction_url`). The plan handles
   that path correctly. Verify on the first live test.
4. **Webhook IP allowlist source of truth** — Moyasar publishes IPs
   inconsistently. Treat the env var as advisory; rely primarily on
   `secret_token`.

---

## 14. Risk register

| Risk | Mitigation in this plan |
|---|---|
| Moyasar's `given_id` is not honoured retroactively (we have months of `Idempotency-Key`-only charges) | New code uses `given_id`. Old idempotency cache is still consulted via `withIdempotency`, so retries within 24h of an old call still dedupe at our layer. |
| Webhook outage → Subscription stuck in `pending_3ds` after 3DS | Reconcile cron picks up rows older than 2 minutes and pulls fresh state from Moyasar. |
| Multi-instance deploys fire reconcile twice | `cronLease.acquire("payment_reconcile")` lets only one node run. |
| Admin issues refund mid-3DS (subscription not yet active) | `issueRefund` only accepts `paid|captured|partially_refunded`, so a `pending_3ds` payment is rejected with a 400. |
| Card data leaks into `IdempotencyKey.response.body` cache | The cached `response.body` is the trimmed object returned by `paymentProvider.charge`, which already redacts raw Moyasar payload (only last4 / bin in `paymentMethod`). PAN, CVC, full numbers are never returned. |
| Refund endpoint replayed via stale Idempotency-Key | Route-level idempotency middleware caches the 2xx response; a second call replays the cached refund summary without re-hitting Moyasar. |
| `pending_refund` audit rows accumulate | A dashboard query + alert (admin homepage widget) counts these and pages on > 0 for > 1 hour. (Implementation: a new `getPendingRefundCount` admin route, surfaced as a stat card.) |

---

## 15. Implementation-readiness corrections

This section was added on 2026-05-07 after a second pass against HEAD.
The earlier sections were written from a partly-stale model of the
codebase; the items below are the deltas an implementer would otherwise
hit at runtime. **Where this section disagrees with §4-§7, this section
is correct.** Snippets in §4 / §7 that were already wrong have been
inline-edited; the catalogue here exists so a reviewer can see *what*
changed and *why*.

### 15.1 Runtime-blocking bugs (now fixed inline above)

These three would have crashed at import time or silently broken
idempotency. They have been corrected in the relevant section; the list
is here for traceability.

| # | Where (section) | Symptom | Fix |
|---|---|---|---|
| 1 | §4.8 `payments.controller.js` | `const { catchAsync } = require('../../shared/errors')` returns `undefined`; controller routes blow up on first request. | Use `const catchAsync = require('../../shared/utils/catchAsync')` (matches every other controller in the repo). |
| 2 | §5.2 reconcile cron | `const { acquireCronLease } = require('./cronLease')` — `acquireCronLease` is not an export. The module exports `acquire`, `release`, `withLease`. | Use `cronLease.withLease(name, fn, { ttlMs })`, mirroring `scheduleSubscriptionStatusUpdate` at line 771 of the existing `scheduledTasks.js`. |
| 3 | §7.3 `paymentsAPI.refund/capture/void` | (a) `apiRequest({…, headers: {…}})` is the wrong shape — the apiClient ignores top-level `headers`; (b) `crypto.randomUUID()` per call defeats idempotency. | Pass headers via `config: { headers: { … } }`; require the caller to supply the `idempotencyKey` so a double-clicked "Refund" reuses the same key. |

### 15.2 Missing wiring (must add)

These pieces were missing from §4 and would let the new code compile but
fail at the request boundary.

#### A. `subscriptions.controller.js` — accept `source` and handle the 3DS branch

**MODIFY** `labbe-backend-/src/modules/subscriptions/subscriptions.controller.js`
around lines 33-43. The current handler hard-codes
`{ planCode, discountCode }` and always calls `sendCreated`. Once the
service can return `{ requiresAction, redirectUrl, paymentId }` we have
to (a) pass `source` and `callbackUrl` through, and (b) branch on the
3DS response so the client doesn't see a `201 Created` for a payment
that is still mid-redirect:

```js
exports.subscribe = catchAsync(async (req, res) => {
  const { planCode, discountCode, source, callbackUrl } = req.body;
  const idempotencyKey = req.get('idempotency-key') || undefined;

  const result = await subscriptionsService.subscribe(req.user._id, {
    planCode,
    discountCode,
    source,
    callbackUrl,
    idempotencyKey,
  });

  if (result?.requiresAction) {
    // 3DS / STC OTP redirect — no resource created yet. Use 200 so the
    // client distinguishes "completed" (201) from "redirect required" (200).
    return sendSuccess(res, result, 'Payment requires additional action');
  }
  return sendCreated(res, result, 'Subscription created successfully');
});
```

The same shape applies to `addonsController.purchaseAddon` — accept
`source` from the body, return `200` with the redirect for the 3DS path.

#### B. `getPaymentDetail` whitelabel scoping

§4.8 + §7.2 mount `GET /admin/payments/:id` behind
`requirePageAccess(ADMIN_PAGES.PAYMENTS, 'view')`. Per
`shared/constants/permissions.js`, `WHITELABEL_ADMIN.PAYMENTS = FULL`,
so a whitelabel admin from org A would otherwise be able to read a
payment belonging to org B by guessing the id. **`adminController.getPaymentDetail`
must enforce ownership before returning:**

```js
exports.getPaymentDetail = catchAsync(async (req, res) => {
  const detail = await adminService.getPaymentDetail(req.params.id);
  const wlFilter = getWhitelabelIdFromFilter(req); // existing helper at top of admin.controller.js
  if (
    wlFilter !== undefined
    && String(detail?.whitelabelId || '') !== String(wlFilter || '')
  ) {
    return next(new AppError('Payment not found', 404));
  }
  return sendSuccess(res, detail, 'Payment retrieved successfully');
});
```

The host-side `GET /payments/:id` controller in §4.8 already does an
ownership check (`String(payment.userId) !== String(req.user._id)`) for
non-admins; the gap is admin-side.

#### C. `subscriptions.service.subscribe()` — preserve `existingActive` across the new flow

The replacement block in §4.5 lifts the cancel-old-subs loop out of its
original position. The variable `existingActive` is computed on actual
line 360-363 of the file (before the charge block). Keep that
computation *exactly where it is* — the replacement block in §4.5 only
covers lines 378-510 (the `let paymentTransactionId = null` through the
end of the create-try). **Do not move or delete the
`existingActive = await Subscription.find(...)` query.** The plan's
diff anchors are:

| Plan said | Actual line range to replace |
|---|---|
| "the body of `subscribe()` between lines 375 and 507" | Lines **378-510** of the current file (from `let paymentTransactionId = null;` through the closing `}` of the `} catch (createErr) { … }` block). |
| "post-create work (lines 509+) is unchanged" | Actual lines **512-541** (discount apply → user update → notification → return). |
| "`_recordPendingRefund` signature update around lines 985-1040" | Actual lines **988-1043**. |

#### D. Frontend `api.config.js` — exact insertion point

§4.9 says "add to the existing top-level object." The file has two
distinct registers: `API_PATHS` (constructed object, lines 7-450) and
the named-export block at the bottom (lines 459-470). To make the new
section consumable both ways:

1. Add `hostPayments: { … }` inside `API_PATHS` (anywhere; alphabetical
   neighbours sit around `subscriptions` at line 161).
2. Extend the existing `payments: { … }` block at line 335 with the new
   action paths.
3. Append `hostPayments` to the bottom destructured `export const { … }`
   list (otherwise consumers can only read it via `API_PATHS.hostPayments`).

#### E. `useSubscriptionMutation('subscribe')` — pass `source` through

The current mutation at `labbe/hooks/reactQueryHooks/useSubscriptions.js`
lines 80-91 destructures `{ planCode, discountCode }` only. The §4.9
replacement block is correct; the only gap is that the file at line 81
takes the args inside the `mutationFn` arrow directly — when you replace
it, keep the surrounding shape (`useSubscriptionMutation` factory + the
`mutations` object).

#### F. Joi env-schema (optional, recommended)

`labbe-backend-/src/config/env.js` validates env at boot via Joi. The
schema currently has `unknown(true)` so missing entries don't fail
validation, but adding the new keys lets `config.env` boot loudly when
they are misset:

```js
// inside the envSchema object:
MOYASAR_API_KEY: Joi.string().allow('').default(''),
MOYASAR_PUBLISHABLE_KEY: Joi.string().allow('').default(''),
MOYASAR_BASE_URL: Joi.string().uri().default('https://api.moyasar.com/v1'),
MOYASAR_WEBHOOK_SECRET: Joi.string().allow('').default(''),
MOYASAR_WEBHOOK_IP_WHITELIST: Joi.string().allow('').default(''),
```

Nice-to-have: surface `config.payments = { moyasarKey: env.MOYASAR_API_KEY, … }`
in `src/config/index.js` so the modules can import the typed config
object instead of touching `process.env` directly. The codebase rule
(comment at the top of `config/index.js`) is "NO direct process.env
access elsewhere"; we deliberately keep `paymentProvider/moyasar.js` as
the single allowed exception (it predates the rule).

### 15.3 Naming overlap — `PAYMENT_STATUS` (delete the legacy one)

`src/shared/constants/status.js` lines 117-123 defines a `PAYMENT_STATUS`
constant:

```js
const PAYMENT_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  CANCELLED: 'cancelled',
};
```

It is exported from `shared/constants/index.js` and **has zero
references anywhere in the codebase** (`grep -r 'PAYMENT_STATUS'`
returns only the definition + the re-export — no imports, no usages in
the backend, web, or mobile app).

**Action:** delete it as part of Phase 1.

- Remove the `const PAYMENT_STATUS = { ... }` block from `status.js`.
- Remove `PAYMENT_STATUS` from the `module.exports` list in the same
  file (line 207).
- Re-run `grep -rn 'PAYMENT_STATUS' src models` to confirm only
  `Payment.PAYMENT_STATUS` (the model static, with the broader
  lifecycle vocabulary) remains.

The new lifecycle enum (`pending | pending_3ds | authorized | paid |
captured | failed | refunded | partially_refunded | voided`) lives on
`PaymentModel` as a static and is the single source of truth going
forward. Admin reporting buckets the lifecycle into display labels
(`completed/pending/failed/refunded`) inside `admin.service.getPayments`
— that mapping is local to the service, not a shared constant, so it
doesn't need a parallel enum.

### 15.4 Partial-refund detection on Moyasar snapshots

`PaymentModel.applyMoyasarSnapshot` (§4.1, lines 479-526 of the plan)
flips to PARTIALLY_REFUNDED only when Moyasar's `status === 'refunded'`
and `refundedAmount < amount`. In practice Moyasar reports partial
refunds with `status === 'paid'` or `'captured'` and a non-zero
`refunded` field — the plan's `if` would never fire for the real
partial-refund case. Tighten the mapping:

```js
const internal = map[status];
if (internal) {
  // Partial-refund detection: Moyasar keeps `status` at `paid`/`captured`
  // and just bumps the `refunded` number. Detect that case explicitly.
  if (
    (internal === PAYMENT_STATUS.PAID || internal === PAYMENT_STATUS.CAPTURED)
    && this.refundedAmount > 0
    && this.refundedAmount < this.amount
  ) {
    this.status = PAYMENT_STATUS.PARTIALLY_REFUNDED;
  } else if (internal === PAYMENT_STATUS.REFUNDED && this.refundedAmount < this.amount) {
    this.status = PAYMENT_STATUS.PARTIALLY_REFUNDED;
  } else {
    this.status = internal;
  }
  // …unchanged timestamp updates…
}
```

### 15.5 Webhook body parsing

Plan §4.8 `webhook.controller.js` reads `req.body?.secret_token` — this
relies on `express.json()` having parsed the body. The codebase mounts
JSON globally (`src/app.js` around line 165), so the read works as
written. The HMAC of the *raw* body is **not** part of the Moyasar
contract (their auth is the constant `secret_token` field, not a body
HMAC), so we don't need raw-body capture. Documenting this here so a
future maintainer doesn't introduce a `bodyParser.raw()` shim hoping to
"strengthen" the auth — that would break the existing constant-time
compare.

### 15.6 Idempotency-Key generation in the admin UI

The corrected §7.3 `paymentsAPI` helpers now require the caller to
supply the `idempotencyKey`. The standard pattern in the rest of the
admin app (e.g. host bulk-actions) is:

```jsx
const [refundIdempotencyKey] = useState(() => crypto.randomUUID());
// …
const onConfirmRefund = () =>
  paymentRefundMutation.mutateAsync({
    id: payment._id,
    amount,
    reason,
    idempotencyKey: refundIdempotencyKey,  // SAME UUID across retries within the modal session
  });
```

`useAdminPaymentRefund` (§7.3) should accept and forward the
`idempotencyKey`. The mutation does **not** generate one — that's the
caller's job, because the caller knows the operation boundary (a single
modal session) that the key must outlive.

### 15.7 Source-typing constraints on Moyasar `source` field

Moyasar's `/v1/payments` documents these `source.type` values:
`creditcard`, `applepay`, `samsungpay`, `stcpay`, `token`. The plan
already uses these. Two contractual subtleties to anchor:

- `creditcard` requires `name`, `number`, `month`, `year`, `cvc`.
- `stcpay` requires `mobile` (saudi-format `05XXXXXXXX`) and a Moyasar
  side OTP (returned via `transaction_url` redirect — same flow as 3DS).
- `applepay` requires `token` (the encrypted PassKit payload — see §13
  question 1).
- `token` (saved-card in §8) requires `token` only; no callback_url
  unless 3DS step-up is required by the issuer.

Add input validation for these in
`subscriptions.service.subscribe()` *before* hitting the provider, so
the user gets a 400 with a useful message rather than a
`paymentProvider.charge: 'source' is required (e.g. { type: 'creditcard', ... })`
proxied as a generic "Payment failed".

### 15.8 Static-checks file — concrete contract

The §10.3 reference to `scripts/static-checks-payments.js` should
verify, at minimum:

```js
// scripts/static-checks-payments.js
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');

// 1. Provider factory exposes the new methods.
const factory = require(path.join(root, 'src/infrastructure/paymentProvider'));
['charge', 'refund', 'capture', 'voidPayment', 'fetchPayment'].forEach((m) => {
  assert(typeof factory[m] === 'function', `paymentProvider.${m} missing`);
});

// 2. PaymentModel statics carry the lifecycle enum.
const Payment = require(path.join(root, 'models/PaymentModel'));
assert(Payment.PAYMENT_STATUS && Payment.PAYMENT_STATUS.PENDING_3DS,
  'PaymentModel.PAYMENT_STATUS.PENDING_3DS missing');

// 3. app.js mounts /payments under /api/v2.
const appSrc = fs.readFileSync(path.join(root, 'src/app.js'), 'utf8');
assert(/\/api\/v2.*\/payments/.test(appSrc) || appSrc.includes("`${prefix}/payments`"),
  '/payments routes not mounted');

// 4. scheduledTasks initialises the reconcile cron.
const tasksSrc = fs.readFileSync(path.join(root, 'src/shared/utils/scheduledTasks.js'), 'utf8');
assert(tasksSrc.includes('schedulePaymentReconcile()'),
  'schedulePaymentReconcile() not invoked from initScheduledTasks');

// 5. Webhook secret env var is referenced.
const webhookSrc = fs.readFileSync(
  path.join(root, 'src/modules/payments/webhook.controller.js'), 'utf8'
);
assert(webhookSrc.includes('MOYASAR_WEBHOOK_SECRET'),
  'webhook handler does not consult MOYASAR_WEBHOOK_SECRET');

console.log('static-checks-payments: OK');
```

### 15.9 Definition-of-done addendum to §12

Each weekly checkpoint must additionally:

- run `node scripts/static-checks-payments.js` in CI green;
- run a one-shot reconciliation against staging Moyasar (sandbox key) to
  verify a real `pending_3ds` row migrates to `paid` after the cron tick;
- assert `IdempotencyKey.findOne({ scope: 'payment.charge' })` returns a
  cached row with `status: 'completed'` after the test charge — proves
  the new `given_id` code path also flows through `withIdempotency`
  (defense-in-depth).

### 15.10 Files this plan now touches that the §3 table missed

The §3 file-table is still authoritative, but these were missed in the
original draft and are required for the corrected §15 instructions:

| Action | Path | Reason |
|---|---|---|
| **MODIFY** | `labbe-backend-/src/modules/subscriptions/subscriptions.controller.js` | accept `source`/`callbackUrl`, branch on `requiresAction` (§15.2A) |
| **MODIFY** | `labbe-backend-/src/modules/addons/addons.controller.js` | same — accept `source`, branch on `requiresAction` |
| **MODIFY** | `labbe-backend-/src/config/env.js` | add Joi entries for the new Moyasar env vars (§15.2F) |
| **MODIFY** | `labbe-backend-/src/shared/constants/status.js` | delete the unused `PAYMENT_STATUS` constant + its re-export (§15.3) |
| **CREATE** (optional) | `labbe-backend-/scripts/static-checks-payments.js` | CI gate (§15.8) |

---

*End of plan.*
