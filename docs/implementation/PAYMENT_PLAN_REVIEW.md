# Payment System — Plan Review

**Audience:** product, ops, business stakeholders + tech leads doing a sanity pass.
**Length:** ~10 minute read.
**Source of truth:** `PAYMENT_SYSTEM_COMPLETION_PLAN.md` (3,500+ lines). Read that for code-level detail.

---

## 1. The problem in one paragraph

Halla can charge cards today, but the payment integration is incomplete in
ways that will hurt real users the moment we plug in a live Moyasar key:

- **Real cards almost always require 3-D Secure** — the bank sends an SMS
  / app prompt, the user approves, and the bank tells Moyasar the
  outcome. Today our code drops that whole conversation on the floor:
  the user is redirected, returns, and we have no idea whether the
  payment succeeded.
- **Refunds don't work.** The refund function returns
  `"Refund flow not yet implemented"`. Operations cannot refund a
  customer who got charged but didn't get what they paid for.
- **Idempotency is fake.** Our charge call passes a header that
  Moyasar's API silently ignores, so a network retry can result in two
  real charges to the same card.
- **No webhook handler.** Moyasar pings us when a payment status
  changes. We don't listen, so our database can drift permanently out
  of sync with the bank.
- **No record-keeping.** Each charge lives only as a string buried
  inside the subscription row. Refund history, capture state, payment
  method details — none of it exists in our DB.

These aren't theoretical risks. The first day we point at a real
Moyasar key, every paid signup that lands on a 3-D Secure card will
fail or hang.

---

## 2. What we're shipping in one paragraph

A complete payment system: a dedicated `Payment` collection that records
every charge, full Moyasar integration (3-D Secure, refunds, capture,
void), a webhook listener that keeps our DB synchronised with the bank,
a reconciliation cron that catches anything the webhook misses, and an
admin UI that lets ops issue refunds with a button instead of a Mongo
query. The work is split into five weekly phases so we can ship and
verify each piece independently.

---

## 3. The system at a glance

### Before — what we have today

```
┌─────────────────────────────────────────────────────────────────┐
│  Subscription document                                          │
│  ─────────────────────────                                      │
│  status: "active"                                               │
│  metadata: { paymentTransactionId: "pay_abc123" }  ← all we got │
└─────────────────────────────────────────────────────────────────┘

         ↑ no refund history, no method, no 3DS state, no webhook
```

### After — what we're building

```
┌─────────────────────────────────────────────────────────────────┐
│  Payment document                                               │
│  ──────────────────                                             │
│  amount, currency, status (pending → pending_3ds → paid → …)    │
│  moyasarPaymentId, givenId  (the bank's IDs)                    │
│  paymentMethod { type, last4, brand, … }                        │
│  refunds [ … ], capturedAmount, fee                             │
│  redirectUrl  (for 3-D Secure)                                  │
│  ↓ links to                                                     │
│  subscriptionId  OR  addonId                                    │
└─────────────────────────────────────────────────────────────────┘
        ↑                                 ↑
        │                                 │
   webhook handler                  reconciliation cron
   (listens 24/7)                  (sweeps every 5 min)
```

Why a separate collection? Because a single subscription can have many
payments over time (initial purchase, upgrades, renewals, addons) and a
payment can outlive its subscription (refund, then re-subscribe). Tying
payments to subscriptions one-to-one is the wrong shape.

---

## 4. The five phases

Each phase is one calendar week. They are sequenced so that any one of
them can ship to production on its own without breaking what came
before.

### Phase 1 — Foundation (Week 1)

The core plumbing. Once this lands we can charge real cards safely.

- New `Payment` collection with a full status lifecycle
  (`pending → pending_3ds → paid → captured → refunded`).
- Rewritten Moyasar integration that actually does 3-D Secure, real
  idempotency, refunds, captures, voids.
- Webhook listener at `/api/v2/payments/webhook` that authenticates
  with a shared secret and updates payment state.
- A 3-D Secure return page so when the user comes back from their
  bank's challenge, they see a clean "Confirming with the bank…"
  screen, not a 404.
- One-time backfill script that converts every existing subscription
  into a proper Payment row.

**User-visible result:** real cards work. 3-D Secure works. Refunds
work (from API; UI lands in Phase 4).

### Phase 2 — Checkout choices + reconciliation (Week 2)

- Frontend gets a payment-method selector: card, Apple Pay, STC Pay.
  The selector shows in the checkout summary panel.
- Reconciliation cron runs every 5 minutes. If a payment is stuck in
  `pending` for more than 2 minutes, the cron asks Moyasar what
  happened and updates our DB. This is our safety net for missed
  webhooks.

**User-visible result:** Saudi customers see STC Pay alongside card.
Operations stops worrying about payments stuck in limbo.

### Phase 3 — Recurring billing (Week 4)

(Note: ships *after* Phase 4 — see timeline.)

- Monthly / quarterly / annual plans automatically renew via Moyasar
  invoices.
- A daily cron creates an invoice 3 days before expiry, emails the
  user the payment link, and marks the subscription `past_due` if the
  invoice isn't paid by the deadline.

**User-visible result:** subscriptions renew themselves. Hosts no
longer need to re-subscribe manually every month.

### Phase 4 — Admin payments page (Week 3)

- Admin payments table now shows real columns: payment method,
  transaction ID, refund badge.
- Three new buttons per row — **Refund**, **Capture**, **Void** —
  guarded by role permissions and confirmation modals.
- A payment-detail modal showing the full Moyasar response, refund
  history, and the linked subscription/addon.

**User-visible result:** ops issues refunds with a click. A clear paper
trail behind every payment.

### Phase 5 — Saved cards + coupons (Week 5)

- Optional. After Phase 1-4 are stable, add saved-card tokenization so
  hosts don't re-type card numbers every renewal.
- Surface Moyasar's BIN-level coupons (issuer promos) on the payment
  history page.

**User-visible result:** smoother re-subscribe. Issuer discount visible
to the customer.

---

## 5. Key flows (diagrams)

### 5.1 A 3-D Secure card payment

```
┌──────┐    1. Subscribe        ┌─────────┐
│ User ├───────────────────────▶│  Halla  │
└──────┘                        └────┬────┘
   ▲                                  │
   │                                  │ 2. Charge
   │                                  ▼
   │                          ┌────────────┐
   │  3. "Pay & 3DS prompt"   │  Moyasar   │
   │ ◀────────────────────────┤            │
   │     redirect to bank     └────────────┘
   ▼
┌────────┐  4. Approve OTP    ┌─────────────┐
│  Bank  ├───────────────────▶│  Moyasar    │
└────────┘                    └──┬───────┬──┘
                                 │       │
                  5. Webhook ────┘       └──── 6. Redirect
                  "payment_paid"             user back to Halla
                       │                          │
                       ▼                          ▼
                ┌─────────────────────────────────────────┐
                │              Halla backend              │
                │  • marks Payment "paid"                 │
                │  • activates the subscription           │
                │  • emails the user                      │
                └─────────────────────────────────────────┘
```

The webhook (step 5) and the user redirect (step 6) race. Whichever
arrives first activates the subscription; the other is a no-op (we
deduplicate by payment id). If both fail, the reconciliation cron picks
it up within 5 minutes.

### 5.2 Refund flow

```
   ┌──────────────────┐
   │ Admin: Refund 50 │
   │  (with reason)   │
   └────────┬─────────┘
            │
            ▼
    ┌───────────────┐  POST /refund   ┌──────────┐
    │ Halla backend ├────────────────▶│ Moyasar  │
    └───────┬───────┘                 └────┬─────┘
            │                              │
            │       success                │
            │ ◀────────────────────────────┘
            ▼
    Update Payment row:
    • status = "partially_refunded" (50 of 100)
    • refunds[] gets a new entry with admin id + reason
    • audit log gets "payment.refunded"

    If full refund AND the subscription is still active:
    • subscription.status = "cancelled"
    • subscription.cancelReason = "refund_issued"
```

### 5.3 The safety nets

```
                         ┌──────────────────────────────────────┐
                         │        Webhook handler 24/7          │
                         │    (Moyasar pushes status changes)   │
                         └──────────────────────────────────────┘
                                          ↑
                                          │   misses something?
                                          │
                         ┌──────────────────────────────────────┐
                         │   Reconciliation cron (every 5 min)  │
                         │  • finds Payments stuck in pending   │
                         │    for > 2 min                       │
                         │  • asks Moyasar for fresh state      │
                         │  • updates the row + activates the   │
                         │    subscription if needed            │
                         └──────────────────────────────────────┘
                                          ↑
                                          │   still drifts?
                                          │
                         ┌──────────────────────────────────────┐
                         │  Pending-refund audit alerts ops     │
                         │  (existing system, unchanged)        │
                         │  Any "money taken, no benefit" case  │
                         │  pages a human within minutes.       │
                         └──────────────────────────────────────┘
```

Three layers: realtime push (webhook), polling sweep (cron), human
escalation (audit + alert). No single failure leaves a customer
charged-but-unfulfilled.

---

## 6. Rollout timeline

```
Week 1 ──── Phase 1: Foundation
           ├─ deploy code (no behaviour change yet — stub provider)
           ├─ run backfill script on staging (dry-run)
           ├─ run backfill on production (idempotent — safe to re-run)
           └─ flip MOYASAR_API_KEY to live key

Week 2 ──── Phase 2: Method selector + reconciliation cron
           ├─ ships only frontend + cron — backward-compatible
           └─ smoke test against Moyasar sandbox card numbers

Week 3 ──── Phase 4: Admin payments page
           ├─ replaces the current admin table query
           ├─ adds refund / capture / void buttons
           └─ schema cleanup PR: drop the legacy paymentTransactionId field

Week 4 ──── Phase 3: Recurring billing (only after Phase 1-2 are clean)

Week 5 ──── Phase 5: Saved cards + coupons (optional / can defer)
```

**Each weekly checkpoint passes before the next one starts:**

- ✅ Static checks green (`scripts/static-checks-payments.js`).
- ✅ Zero `pending_refund` audit rows in staging.
- ✅ One successful end-to-end test against a real Moyasar test card
  (Moyasar provides `4111 1111 1111 1111` for success cases and
  `4242 4242 4242 4242` for expected failures).

If a checkpoint fails, we hold the next phase until the issue is
resolved. There is no "ship it and watch."

---

## 7. Risks & how we mitigate them

| Risk | What could go wrong | What stops it |
|---|---|---|
| Customer charged, no subscription created | A bug in our code creates the Payment row and takes their money but fails to grant the plan. | The `pending_refund` audit row + admin notification fires within seconds. The reconciliation cron also catches the orphan within 5 minutes. |
| Webhook outage | Moyasar's webhook delivery is delayed or drops. | Reconciliation cron polls Moyasar directly every 5 minutes for any payment stuck in `pending`. |
| Two charges on a network retry | A flaky network resends the charge before our DB writes "done." | Two layers of idempotency: our internal cache (returns the prior result) + Moyasar's `given_id` field (deduplicates at the bank). |
| Webhook forged by an attacker | Anyone who finds the URL pretends to be Moyasar. | Constant-time secret-token check on every webhook. Optional IP allowlist as defense-in-depth. |
| Admin double-clicks "Refund" | Two refunds issued instead of one. | Per-modal idempotency key — both clicks send the same key, server returns the cached result on the second. |
| Card data leaks into our cache | The full card number ends up in our idempotency cache for 24 hours. | The provider response is trimmed before caching: only last 4 digits and BIN are kept. PAN, CVC, full numbers never enter our DB. |
| Admin from whitelabel A reads payment from whitelabel B | A whitelabel admin guesses payment IDs from another tenant. | Whitelabel scoping enforced in the controller — getPaymentDetail returns 404 unless the payment belongs to the admin's org. |

---

## 8. What's *not* in this plan

These were considered and deliberately deferred:

- **Apple Pay token sourcing.** The plan accommodates Apple Pay
  payments but assumes the encrypted token comes from a separate
  PassKit handshake (browser-side). Implementing PassKit is its own
  mini-feature.
- **Automatic addon-quota rollback on refund.** Refunding an addon
  whose quota has already been consumed (e.g. extra invites have been
  sent) is a real ops decision that depends on the event state. The
  plan logs the refund cleanly and leaves quota cleanup to humans.
- **Multi-currency.** Halla prices in SAR. Cross-currency conversion
  is out of scope.
- **Moyasar coupon admin.** Moyasar's coupons are configured by
  Moyasar support — there's no API to create them. We just surface
  the discount the issuer applied.

---

## 9. Why this is "implementation-ready" (not just a plan)

The original draft of this plan made a few assumptions about our
codebase that turned out to be wrong (different export names, wrong
import paths, stale line numbers, an over-cautious "keep both old and
new" migration story). Those have been corrected against HEAD as of
2026-05-07:

- Every code snippet now uses the actual import paths the codebase
  uses (`catchAsync` from `shared/utils`, `cronLease.withLease` not
  `acquireCronLease`, `apiRequest` headers via `config.headers`).
- Every line range cited has been re-checked against the file.
- The dual-write story was dropped after we verified the legacy
  `paymentTransactionId` field has zero frontend readers — a clean
  cutover with a one-shot backfill is faster, simpler, and safer.
- The unused `PAYMENT_STATUS` constant in `shared/constants/status.js`
  was identified as dead code and is deleted in Phase 1.

Section 15 of the main plan catalogues each of these corrections with
the file path, the wrong code, and the fix, so the reviewer can see
exactly *what* changed since the last revision and *why*.

---

## 10. Glossary

- **3-D Secure (3DS):** the bank's "is this really you?" step. The
  user is redirected to their bank, approves with an SMS code or app
  notification, then comes back. Required by Saudi banks for almost
  every online card transaction.
- **Moyasar:** our Saudi payment processor. Cards, Apple Pay, STC Pay,
  invoices.
- **STC Pay:** Saudi mobile wallet. Same redirect-and-approve flow as
  3-D Secure, but with an OTP screen instead of a bank challenge.
- **Halalas:** the minor unit of SAR (1 SAR = 100 halalas). Moyasar's
  API uses halalas; our code uses SAR everywhere except the Moyasar
  module itself.
- **Webhook:** Moyasar pings our server when a payment status changes
  (paid, failed, refunded, etc.). Authenticated with a shared secret.
- **Idempotency key:** a unique string that lets the server recognise
  "this is the same request you already saw — return the same answer"
  instead of re-running the work.
- **Capture / void / refund:** three terminal states for a payment.
  *Capture* finalises money on a previously authorized card. *Void*
  cancels an authorized payment before capture (no money moves).
  *Refund* returns money for a payment that was already captured.
- **Pending refund:** an internal audit row that fires when we charged
  the customer but couldn't activate the thing they bought. Pages
  ops; does not auto-refund (refund decisions stay with humans).

---

*For code-level detail, see `PAYMENT_SYSTEM_COMPLETION_PLAN.md`. For
the corrections that made this plan implementation-ready, see §15 of
that document.*
