# payments — Full-Stack Review Plan

**Module:** payments
**Generated:** 2026-05-07
**Decisions locked:** 2026-05-08
**Implementation:** Backend (Phase A) + Web (Phase B) shipped 2026-05-08; Mobile (Phase C) running in background agent
**Prompt:** docs/implementation/MODULE_FULLSTACK_REVIEW_PROMPT.md
**Status:** Active implementation — see §11 below for ship report

---

## 0.1 Locked decisions (2026-05-08)

| # | Question | Decision |
|---|----------|----------|
| 1 | `/host/payments` export button — implement or remove? | **Implement.** Wire `useAdminPaymentsExport` (web) / mirror to host export endpoint, blob download via `apiRequest`. (B.7) |
| 2 | `PaymentReturnClient.jsx` 3DS redirect target | **Branch on `payment.metadata.purpose`** (subscription / addon / renewal). Resolve target per purpose; default to current `/host/create-event` only if purpose is missing or unknown. (B.12) |
| 3 | Admin payment-detail modal | **Real fields view now, do not defer.** Replace `JSON.stringify` with `PaymentDetailModal.js` showing canonical fields (id, status, amount, currency, paymentMethod, last4, moyasarPaymentId, createdAt, refunds[], audit timestamps). (B.13) |
| 4 | Mobile `search=` param ignored by backend | **Add backend search support.** Extend `/admin/payments` service to accept `search` (matches host name / email / Moyasar id). Add a partial/text index sufficient to keep the query bounded. Mobile keeps the search box. (C.3) |
| 5 | Unused `useAdminPaymentSummary` / `API_PATHS.payments.getSummary` | **Delete dead hooks.** Drop `useAdminPaymentSummary` (mobile + web), drop `API_PATHS.payments.getSummary` if nothing else references it. (C.5) |
| 6 | Mobile `PaymentFilters.js` (exported, unused) | **Wire it into `AdminPaymentsScreen`** in place of `AdminPageHeader`'s built-in filters. (C.6) |
| 7 | Mobile parity for refund / capture / void / detail / 3DS-poll | **Add parity. Phase order:** (a) read-only `PaymentDetailScreen` first (consumes `useAdminPaymentDetail`-equivalent); (b) 3DS-return / poll deep-link handler; (c) refund / capture / void mutation hooks + admin action sheet. (C.7) |
| 8 | Introduce `'manage'` RBAC action vs. keep `restrictTo(SUPER_ADMIN, ADMIN)` | **Introduce a new `'manage'` action verb** in `permissions.js` `canAccessPage`. Semantics: `access === FULL && role ∈ {SUPER_ADMIN, ADMIN}` — i.e. requires FULL page access AND the role must be in the global-admin allowlist. WHITELABEL_ADMIN keeps `PAYMENTS: FULL` (for view/edit/export within their org) but cannot pass the `'manage'` gate. Convert refund/capture/void from `restrictTo(SUPER_ADMIN, ADMIN)` to `requirePageAccess(ADMIN_PAGES.PAYMENTS, 'manage')`. Both A.14 and D.4 are **back in scope**. |
| 9 | Webhook IP allowlist + rate limiter | **Skip.** Existing `MOYASAR_WEBHOOK_IP_WHITELIST` env opt-in + secret-token check are sufficient. Do NOT add `webhookLimiter`. |
| 10 | `/payments/:id` vs `/admin/payments/:id` consolidation | **Lock `/payments/:id` and `/payments/:id/poll` as host-self-only.** Rationale: (i) the events module sets the convention — host routes under `/events`, admin under `/events/admin` (`events.admin.routes.js`); (ii) `/admin/payments/:id` already has `requirePageAccess(ADMIN_PAGES.PAYMENTS, 'view') + filterByWhitelabel + validateObjectId`; (iii) the web admin hook (`useAdminPaymentDetail`) already points at `/admin/payments/:id`. **Action:** in `paymentsService.getById(paymentId, requestingUser)`, authorize self-ownership only — reject admins with `403` and direct them to `/admin/payments/:id`. This eliminates the §6.1 whitelabel leak by construction (no admin code path on the host route). Admins lose nothing: their existing endpoint already works and is properly scoped. |
| 11 | Bug-verification items in §6 | **Verify before touching code.** Each §6 item must be confirmed against the live app (or via a targeted read of the suspect call chain) BEFORE the corresponding fix in §7 is applied. The agent must surface findings to the user and wait for confirmation per item. |

These decisions supersede any "decide and document" wording later in this plan.

---

## 0. Executive Summary

- **8 routes** in `src/modules/payments/` (1 public webhook, 1 dev-only stub, 6 authenticated — including `POST /payments/checkout` added 2026-05-07 after this plan's first draft). Plus 4 closely-coupled `/admin/payments*` routes owned by the `admin` module — listed for context only because the module's frontend hooks consume them.
- **0 candidates for outright deletion** in the payments module itself (all routes have a real job). 1 candidate (`/payments/_stub/3ds-complete`) is dev-gated; keep but flag.
- **7 / 8 endpoints have no `@swagger` block.** `POST /payments/checkout` is the only one with current JSDoc (added with the route). The other 7 are total Swagger drift. (The four `/admin/payments*` routes have JSDoc, partly out-of-date.)
- **0 backend file-size violations.** Largest is `checkout.service.js` at **588 lines** (cap 600) — close to the cap, flag for monitoring. `webhook.controller.js` is 236, `payments.service.js` 176, `payments.controller.js` 110, `payments.routes.js` 99.
- **1 web file-size violation** (`AdminPaymentsClient.js` — 503 lines, cap 250).
- **0 mobile file-size violations** in the payments-specific files.
- **5 web/mobile API consumption mismatches** — most importantly mobile lacks refund / capture / void / detail / poll-3DS surfaces.
- **3 data-mapping bugs / fallback-chains** in web (admin client, return-page poller, host page state-in-`useState`).
- **Several missing safeguards in backend payments routes**: no `validateObjectId`, no Joi validation for refund/capture, no whitelabel scoping in `getById` / `poll3ds` controllers, business logic + authorization in controller layer.
- **~12 comment-hygiene blocks** to remove (mostly `// eslint-disable-next-line no-console` suppressions that should become real fixes, plus a phase-tag comment in mobile service).
- **Estimated effort:** **L** (large) — large because of the 503-line admin client refactor, the missing Swagger across 7 routes, the missing mobile parity (5 endpoints + read-only detail screen + 3DS-return handler + write actions per locked #7), the controller-layer surgery in the backend, the new `'manage'` RBAC action (locked #8), and the backend `search` support (locked #4).

---

## 1. Endpoint Inventory

Owned by `src/modules/payments/` (refreshed 2026-05-08 to include `POST /payments/checkout`):

| # | Method | Path | Controller | Service | Middleware chain | Swagger | Web hook | Mobile hook | Status |
|---|--------|------|------------|---------|------------------|---------|----------|-------------|--------|
| 1 | POST | `/payments/webhook` | `paymentsController.webhook` → `webhook.controller.handle` | (in-place: webhook handler dispatches Payment lookup, applyMoyasarSnapshot, finalizePending3ds, invoice handling) | (none — public) | **MISSING** | n/a | n/a | KEEP |
| 2 | GET | `/payments/_stub/3ds-complete` | `paymentsController.stubComplete3ds` | `infrastructure/paymentProvider/stub._setStubStatus` | (none — public, env-gated) | **MISSING** | n/a (dev only) | n/a | KEEP (dev-gated) |
| 3 | POST | `/payments/checkout` | `checkoutController.checkout` | `checkoutService.checkout` (588 lines — flag for monitoring) | `protect`, `validateZod(checkoutSchema)`, `idempotency({ scope: 'payments.checkout' })` | **PRESENT** ✓ (only route in module with current Swagger) | TBD — verify if any web caller exists today; otherwise wire from the bundled-checkout flow | TBD — same verification on mobile | KEEP |
| 4 | GET | `/payments/:id` | `paymentsController.getById` | `paymentsService.getById` | `protect` | **MISSING** | `useAdminPaymentDetail` actually targets `/admin/payments/:id` (see row #12). Host-self consumers only | none | KEEP — locked as **host-self-only** per decision #10 |
| 5 | GET | `/payments/:id/poll` | `paymentsController.poll3ds` | `paymentsService.getById` + `reconcileWithProvider` + `subscriptionsService.finalizePending3ds` / `addonsService.finalizePending3ds` | `protect` | **MISSING** | inline `apiRequest` in `PaymentReturnClient.jsx` (no canonical hook) | none — to be added per #7 | KEEP — host-self-only per #10; extract finalization to service per A.5 |
| 6 | POST | `/payments/:id/refund` | `paymentsController.refund` | `paymentsService.issueRefund` | `protect`, **→ `requirePageAccess(PAYMENTS, 'manage')` per A.14**, `idempotency({ scope: 'payments.refund' })` | **MISSING** | `useAdminPaymentRefund` | to be added per #7 (phase C.7.c) | KEEP |
| 7 | POST | `/payments/:id/capture` | `paymentsController.capture` | `paymentsService.capturePayment` | `protect`, **→ `requirePageAccess(PAYMENTS, 'manage')` per A.14**, `idempotency({ scope: 'payments.capture' })` | **MISSING** | `useAdminPaymentCapture` | to be added per #7 (phase C.7.c) | KEEP |
| 8 | POST | `/payments/:id/void` | `paymentsController.void` | `paymentsService.voidPayment` | `protect`, **→ `requirePageAccess(PAYMENTS, 'manage')` per A.14**, `idempotency({ scope: 'payments.void' })` | **MISSING** | `useAdminPaymentVoid` | to be added per #7 (phase C.7.c) | KEEP |

Closely-coupled, owned by `src/modules/admin/` (frontend Payment hooks point here, so listed for cross-platform context — out of scope for *this module's* refactor):

| # | Method | Path | Controller (admin) | Service (admin) | Web hook | Mobile hook |
|---|--------|------|--------------------|------------------|----------|-------------|
| 9 | GET | `/admin/payments` | `adminController.getPayments` | `adminService.getPayments` (gains `search` param per A.15) | `useAdminPayments` | `useAdminPaymentsInfinite` (also `useAdminPayments` — to be deleted per #5) |
| 10 | GET | `/admin/payments/summary` | `adminController.getPaymentSummary` | `adminService.getPaymentSummary` | (defined `API_PATHS.payments.getSummary`, **to be deleted per #5**) | `useAdminPaymentSummary` (**to be deleted per #5**) |
| 11 | GET | `/admin/payments/export` | `adminController.exportPayments` | `adminService.exportPayments` | `paymentsAPI.export` (legacy service — to be migrated to `useAdminPaymentsExport` per B.9) | `adminDashboardService.payments.export` (deep link) |
| 12 | GET | `/admin/payments/:id` | `adminController.getPaymentDetail` | `adminService.getPaymentDetail` (with §15.2B whitelabel scope) | `useAdminPaymentDetail` (uses `API_PATHS.payments.getById(id)` → `/admin/payments/:id`) | `adminDashboardService.payments.getById` to be consumed by new `PaymentDetailScreen` per #7 phase C.7.a |

**Cron / background:** `payments.reconcile.runReconcileTick` — registered in `shared/utils/scheduledTasks.js` line 1158 under `payment_reconcile`. Multi-instance safe via cronLease.

**Module exports** (`src/modules/payments/index.js`): only `routes`. Does **not** export `paymentsService` or `runReconcileTick` — both are imported via deep require by other modules (`subscriptions/subscriptions.service.js`, `shared/utils/scheduledTasks.js`). Per A1, deep-require of sub-files is acceptable, but exposing the service as `module.exports = { routes, service: paymentsService }` would let callers stop reaching into private filenames.

**Legend:** KEEP, DELETE-DUPLICATE-OF-#N, RENAME, MERGE-WITH-#N

---

## 2. Backend Findings

### 2.1 File-size violations

None. All 6 module files comfortably below their caps:

| File | Lines | Cap |
|------|-------|-----|
| `payments.routes.js` | 51 | 400 |
| `payments.controller.js` | 103 | 300 |
| `payments.service.js` | 176 | 600 |
| `payments.reconcile.js` | 70 | 300 |
| `webhook.controller.js` | 229 | 300 |
| `index.js` | 3 | — |

The closely-coupled `admin.controller.js` and `admin.service.js` carry the heavier admin payment surface; both are over their respective caps already (out of scope for this module review).

### 2.2 Swagger drift

**Every route in `payments.routes.js` is missing its `@swagger` JSDoc.** This is the single biggest backend gap.

- `POST /payments/webhook` — undocumented. Requires a public-endpoint annotation describing accepted event types (`payment_paid` / `payment_failed` / `payment_refunded` / `payment_captured` / `payment_authorized` / `payment_voided` / `payment_updated` / `invoice_paid` / `invoice_failed`), the `secret_token` body field / `X-Moyasar-Auth` header auth, and the dedupe behaviour. Mark as `tags: [Webhooks]` with explicit "Public" note (no bearer auth).
- `GET /payments/_stub/3ds-complete` — undocumented. Annotate as `tags: [Internal/Dev]` with `x-internal: true`, body description "no-op when MOYASAR_API_KEY is set".
- `GET /payments/:id` — undocumented. Path param `id`, response schema = full Payment doc (currency / status enum / refunds[] / paymentMethod sub-doc / Moyasar IDs). `403` when host requests another host's payment.
- `GET /payments/:id/poll` — undocumented. Same path param + response shape as `/payments/:id`, but documents the side effect: triggers `reconcileWithProvider` on `pending`/`pending_3ds`.
- `POST /payments/:id/refund` — undocumented. Body `{ amount?: number, reason?: string }`. Header `Idempotency-Key` required. Response = updated Payment doc. Errors: `400` for invalid status / over-amount, `403` for non-admin, `404` for missing payment. Restricted to `SUPER_ADMIN`/`ADMIN` only.
- `POST /payments/:id/capture` — undocumented. Body `{ amount?: number }`. Same idempotency / RBAC notes.
- `POST /payments/:id/void` — undocumented. No body. Same notes.

**Components.schemas:** add `Payment`, `PaymentRefund`, `PaymentMethod`, and a `MoyasarWebhookPayload` to `src/config/swagger.js` `components.schemas`. Reference them via `$ref` from the new JSDoc blocks. The schemas should match the canonical wire shape (see §6 below) — i.e. unwrapped `Payment` document, not the partial admin transformation in `admin.service.getPayments`.

**Components.parameters:** the existing `IdParam` / `PageParam` / `LimitParam` are reusable for #3, #4 and the admin list endpoints.

**Drift in adjacent admin Swagger (lines 1231–1259 of `admin.routes.js`):** the JSDoc for `GET /admin/payments` declares `status` enum as `[completed, pending, failed]`, but the controller / service also accept `refunded`. Frontend filters offer `refunded` (web) or only `[all, completed, pending, failed]` (mobile) — Swagger should match the wider set, web filter should match Swagger.

### 2.3 Missing middleware / safeguards

- `GET /payments/:id` (line 19) — **missing `validateObjectId('id')`**. A bad ObjectId yields a Mongo `CastError` translated to a generic 500 unless the global handler intercepts; user gets a worse message.
- `GET /payments/:id/poll` (line 20) — **missing `validateObjectId('id')`**. Same issue.
- `POST /payments/:id/refund` (line 32) — **missing `validateObjectId('id')`**. Plus no Joi body validation of `amount`/`reason`.
- `POST /payments/:id/capture` (line 38) — same.
- `POST /payments/:id/void` (line 44) — same.
- `POST /payments/webhook` (line 11) — does **not** sit behind any rate limiter. Moyasar ranges are constrained but a misconfigured webhook URL or a stranger spamming the public endpoint can drive log volume. Recommend a permissive `webhookLimiter` (e.g. 60 req/min/IP) — high enough that legitimate retries pass.
- `getById` / `poll3ds` controllers (lines 8–22, 25–38) — **missing whitelabel scope check**. Admin users (including `WHITELABEL_ADMIN` and `WHITELABEL_MODERATOR`) are allowed to fetch *any* payment by id-guess. The admin module's `/admin/payments/:id` enforces §15.2B; `/payments/:id` does not. Either:
  - Mirror the §15.2B pattern (compare `payment.whitelabelId` to `getWhitelabelIdFromFilter(req)` and 404 on mismatch) inside the service via a `requestingUser` arg, OR
  - Forbid admin reads of `/payments/:id` entirely and route admins through `/admin/payments/:id` only. The two endpoints overlap heavily; consolidating would also fix Swagger drift.
- Webhook IP allowlist (`MOYASAR_WEBHOOK_IP_WHITELIST`) is opt-in; secret-token rotation policy not documented in code. Flag: when the secret changes, in-flight retries with the old token would 401 — a planned-rotation note in `webhook.controller.js` would help ops.

### 2.4 Duplicate / dead endpoints

No outright duplicates inside the payments module. **However:**

- **`GET /payments/:id` overlaps `GET /admin/payments/:id` for admins.** The latter has whitelabel scoping and consistent envelope; the former does not. Consider deprecating admin reads via `/payments/:id` (host-only) and migrating the admin web hook (`useAdminPaymentDetail`) to `/admin/payments/:id` — which it already uses, since `API_PATHS.payments.getById = (id) => '/admin/payments/:id'` (so the host endpoint is *currently unreachable from the admin client*; only `/host/payments/return` would hit `/payments/:id/poll`).
- `GET /admin/payments/summary` (admin module): the **web** has `API_PATHS.payments.getSummary` defined but no consumer. The **mobile** has `useAdminPaymentSummary` defined but `AdminPaymentsScreen` never imports it. Either wire it up in the dashboard widget (Phase 4 §7.1 calls it the "payment summary widget"), or delete the unused hooks.

### 2.5 Service / controller violations

**Controllers contain authorization + business logic (A2.3 violation):**

- `payments.controller.getById` (lines 8–22) — performs the admin/self-only authorization itself, including a hardcoded array of 5 admin-class roles, then short-circuits with `res.status(403).json(...)`. This:
  1. Hardcodes role strings instead of using `ROLES` (rule A3.8) — although it does import `ROLES`, the array is rebuilt locally instead of using `isAdminRole(user)` shared util.
  2. Builds a non-standard error response shape (`{ status: 'error', message: 'forbidden' }`) instead of throwing `ForbiddenError` (rule A6.2).
  3. Should be authorisation-in-service: pass `req.user` to `paymentsService.getById(id, requestingUser)` and throw `ForbiddenError` from there. Same applies to `poll3ds`.
- `payments.controller.poll3ds` (lines 25–62) — embeds the **finalization business logic** in the controller: dispatches on `payment.metadata.purpose`, requires `subscriptionsService` and `addonsService` lazily, swallows finalize errors with a comment-only `try { … } catch (_) {}`. This is service-layer work copy-pasted from `webhook.controller.handle` (lines 124–148) and `payments.reconcile.runReconcileTick` (lines 41–62). Three sites with identical logic — extract to `paymentsService.runFinalizationFor(payment)` (or `paymentsService.applySnapshotAndFinalize(...)`) and call from all three.
- `payments.controller.refund` / `capture` / `void` (lines 67–94) — return the raw payment doc directly via `res.status(200).json({ status: 'success', data: payment })` instead of `sendSuccess(res, payment, 'Refund issued')`. Same shape, but bypasses the canonical helper (rule A2.2).
- `payments.controller.stubComplete3ds` (lines 98–103) — returns plain text `res.send('Stub 3DS complete...')`. That's fine for a dev stub, but should be guarded with a clear "DO NOT USE IN PROD" log line and a Swagger `x-internal: true` annotation.

**Service-layer violations:**

- `payments.service.reconcileWithProvider` (line 43) — `console.error('[payments.reconcile] fetch failed:', result.error);` violates A2.4 / D6. Should propagate a typed error (or return early with a structured result the cron can log via `logger`). The `// eslint-disable-next-line no-console` is a code smell.
- `payments.service.issueRefund` (line 95) — `actor: { _id: actorUserId, role: 'admin' }` hardcodes the role string. Use `ROLES.ADMIN` (or pass the requesting user object so the audit log captures who actually acted, super_admin vs admin).
- `payments.service.issueRefund` (lines 108–116) — auto-cancels a subscription on full refund, but writes both `payment.save()` and `sub.save()` without a transaction (A3.10 violation). If the second write fails, the audit row says "refunded" while the subscription stays active. Wrap in a Mongo session.
- `payments.service.issueRefund` (lines 109–113) — status-string literals `'cancelled' | 'active' | 'trial'`. Use `Subscription.STATUS` or shared status constant (A3.8).
- `payments.service.issueRefund` (line 78) — when `amount` is omitted (full refund) the `refundEntry.amount` is set to `remaining`, but the call to `paymentProvider.refund({ amount: undefined })` may also send `undefined`. Verify provider adapter coerces undefined → full-refund correctly.
- `webhook.controller.handle` (lines 60–62, 142–144, 179–183) — multiple `console.error` / `console.warn` lines disabled via comment. Replace with the shared `logger.js` (or a webhook-specific structured logger), or at minimum flag in a single audit row instead of three different log shapes.
- `webhook.controller.handle` (lines 124–148) — same finalize logic repeated; extract per A2.3 fix above.
- `webhook.controller.handle` (line 105) — `Payment.findOne({ moyasarPaymentId: data.id })` not `.lean()`; we then call `payment.applyMoyasarSnapshot(...)` and `payment.save()`, which require the Mongoose document, so this is correct. Document why with a one-line comment ("not lean — we need methods + save"), or accept the absence of the comment.
- `payments.reconcile.runReconcileTick` (lines 56–61) — same finalize block repeated, same `console.error`. Extract.
- `payments.reconcile.runReconcileTick` (lines 25–32) — query is correct (`status` ∈ `pending` / `pending_3ds`, `initiatedAt` ≤ cutoff, `moyasarPaymentId != null`), and is backed by the partial index in `PaymentModel.js:167-170`. Verify after refactor that the partial-index condition still matches.

**Index / route ordering:**

- `payments.routes.js:11` (webhook) and `:14` (stub) sit before `router.use(protect)`. ✓ Correct.
- `:19` (`/:id`) sits before any literal subpath route — currently OK because there are no other routes that would clash, but if `/healthz` or `/list` ever gets added, position ordering is brittle. Consider literal routes first by convention.

**Idempotency middleware on refund/capture/void** is correctly applied (rule A3.9). ✓

### 2.6 Validation gaps

- **No `payments.validation.js` exists.** Add one.
- `POST /payments/:id/refund` body — Joi schema:
  - `amount`: optional number, `> 0`, `<= payment.amount` (the upper bound is enforced server-side after lookup, but a Joi minimum of `0.01` blocks negatives/zero before we hit Mongo)
  - `reason`: optional string, max 500 chars, trim, `.unknown(false)` to drop stray fields
- `POST /payments/:id/capture` body — same `amount` rule, no `reason`.
- `POST /payments/:id/void` — empty body; either `Joi.object({}).unknown(false)` to reject stray fields, or skip the schema (rule A5.1 trivial-body exception).
- Add `validateObjectId('id')` on all five `:id` routes.
- The webhook body is *not* something we can validate ourselves with Joi — it's a third-party shape. Skip Joi here; leave the existing structural check (`if (!eventType || !data?.id)`) in `webhook.controller.handle` as the only validation, but consider introducing a single Joi *advisory* schema in a comment or test fixture so structural drift gets caught in CI.

### 2.7 Comment hygiene

These are the comments to remove or rewrite — most are `eslint-disable` suppressions for `console.error` lines that should not exist at all (per D6) once §2.5 is fixed:

- `payments.service.js:42` — `// eslint-disable-next-line no-console` (then `console.error`) → remove both lines, replace with structured logger.
- `payments.service.js:59` — same.
- `webhook.controller.js:60` — same.
- `webhook.controller.js:81` — same.
- `webhook.controller.js:142` — same.
- `webhook.controller.js:179` — same.
- `webhook.controller.js:208` — same.
- `payments.reconcile.js:59` — same.
- `payments.reconcile.js:65` — same.
- `payments.routes.js:23-31` — long comment justifying `restrictTo` over `requirePageAccess`. This is a *real* "why" comment (rule A9 keeps this kind), but it could be tightened to two sentences. Keep, edit lightly.
- `payments.controller.js:11`, `:27` — short one-liners explaining the self-only guard. Once authorization moves to the service, both move with it.
- `webhook.controller.js:1-36` — header comment is good (explains body shape, idempotency strategy, why we accept both header and body token); keep verbatim.

No FLOW-/PHASE-/BUG- markers found in this module ✓.

### 2.8 RBAC analysis (the `restrictTo` choice)

The route file has an explicit comment block (lines 23–31) explaining why refund/capture/void use `restrictTo(SUPER_ADMIN, ADMIN)` rather than `requirePageAccess(ADMIN_PAGES.PAYMENTS, 'full')`:

1. `canAccessPage` doesn't recognise `'full'` as a valid action verb, so the page-access call would 403 every role.
2. `WHITELABEL_ADMIN` has `PAYMENTS: FULL` on its own org but should not be able to issue refunds globally — using `requirePageAccess` would grant them refund authority.

Both reasons are correct given the current RBAC code. The cleaner long-term fix is to add a `'manage'` (or `'refund'`) action in `permissions.js` and restrict it to `SUPER_ADMIN` + `ADMIN` even when the page-grant is `FULL`, then convert the route gate to `requirePageAccess(ADMIN_PAGES.PAYMENTS, 'manage')`. This belongs in a permissions-system change, not this module's plan — flag in §6 / §7.D.

---

## 3. Frontend Web Findings

### 3.1 Component tree per page

**`app/[lang]/admin-dash/payments/page.js`** (30 lines)
- Server component. `await params`. `await requirePageAccess('payments', lang)`. Prefetches `useAdminPayments({page:1, limit:20})`.
- Mounts `_components/AdminPaymentsClient.js` (503 lines) — VIOLATION cap=250.
  - Imports from `@/hooks/reactQueryHooks/useAdmin` — `useAdminPayments`, `useAdminPaymentDetail`, `useAdminPaymentRefund`, `useAdminPaymentCapture`, `useAdminPaymentVoid`.
  - Imports from `@/services/adminDashboard` — `paymentsAPI` (legacy export path).
  - Imports `SimpleLoading` from `@/ui/common/loading/SimpleLoading`.

**`app/[lang]/host/payments/page.js`** (23 lines)
- Server-component-ish but missing `await params` (it does `const { lang } = params` — Next 15 violation).
- Mounts `_components/PaymentsClient.jsx` (128 lines) ✓.
  - Imports `useMyPayments` from `@/hooks/reactQueryHooks/useSubscriptions` — the endpoint is `GET /subscriptions/payments`, owned by the *subscriptions* module not this one. Listed for completeness because it's the host-facing payments-history surface.
  - Imports `_components/PaymentsHeader.jsx` (31 lines) ✓.
  - Imports `_components/StatusBadge.jsx` (35 lines) ✓.
  - Imports `Table` from `@/ui/commen/new-table/Table` (typo "commen") and `SimpleLoading`.

**`app/[lang]/host/payments/return/page.js`** (5 lines) — pass-through
- Mounts `_components/PaymentReturnClient.jsx` (95 lines) ✓.
  - Calls `apiRequest({ method: 'GET', path: API_PATHS.hostPayments.poll3ds(moyasarId) })` *directly* — should be a canonical hook (rule B0.2 / B6).

### 3.2 File-size violations

- **`app/[lang]/admin-dash/payments/_components/AdminPaymentsClient.js` — 503 lines (cap 250).** Proposed split, **preserving `AdminPaymentsClient.module.css` exactly and importing it into each new file**:
  - `_components/AdminPaymentsClient.js` (top-level, ~120 lines): URL → filters mapping, hook composition, role-gate, the page wrapper JSX (header + stats grid + toolbar + filters panel + content branch + pagination). Keeps `useAdminPayments` and the URL-state callbacks.
  - `_components/PaymentsToolbar.js` (~50 lines): `Filters` button, `Export` button. Receives `showFilters`, `onToggleFilters`, `onExport`, `exporting` props. CSS classes `toolbar`, `toolbarLeft`, `filterBtn`, `exportBtn` — all stay in the same module.css.
  - `_components/PaymentsFiltersPanel.js` (~50 lines): the three `<select>`/`<input>` filter controls. Receives `status`, `from`, `to`, `onChange` props. Classes `filtersPanel`, `filterGroup`, `filterLabel`, `filterSelect`, `filterInput`.
  - `_components/PaymentsTable.js` (~140 lines): the `<table>` block plus `formatCurrency` / `formatDate` / `statusBadgeStyle` / row action visibility helpers. Receives `payments`, `canWrite`, `onAction`, `onView`, `t`, `isArabic`. Classes `tableWrap`, `table`, `tableHead`, `th`, `td`, `tdAmount`, `tdMuted`, `statusBadge`.
  - `_components/PaymentActionModal.js` (~80 lines): the action confirmation modal (refund / capture / void) — replace inline `style={{...}}` with classes lifted into the module.css under new keys (`actionModalOverlay`, `actionModalBody`, `actionModalActions`, `actionModalConfirm`). **Important:** the original inline style values define the visual; the new classes must reproduce them exactly (px-for-px, color-for-color).
  - `_components/PaymentDetailModal.js` (~50 lines): replace the `JSON.stringify` debug renderer with a real fields list. **This is a new feature, not a refactor** — flag in §6 and ask before doing it.
- All other web files are within their caps.

### 3.3 Hardcoded text / data / paths

In `AdminPaymentsClient.js` (mostly around the modals and pagination):

- L94: `toastUtils.success(isArabic ? "تم تصدير المدفوعات" : "Payments exported")` → `t("export.success", "Payments exported")`.
- L151: `toastUtils.success(isArabic ? "تم الاسترداد" : "Refund issued")` → `t("refund.success", "Refund issued")`.
- L159: `toastUtils.success(isArabic ? "تم القبض" : "Payment captured")` → `t("capture.success", "Payment captured")`.
- L162: `toastUtils.success(isArabic ? "تم الإلغاء" : "Payment voided")` → `t("void.success", "Payment voided")`.
- L359: `{isArabic ? "السابق" : "Previous"}` → `t("pagination.prev", "Previous")`.
- L367: `{isArabic ? "التالي" : "Next"}` → `t("pagination.next", "Next")`.
- L438: `{isArabic ? "إلغاء" : "Cancel"}` → `t("actions.cancel", "Cancel")`.
- L449: `{isArabic ? "تأكيد" : "Confirm"}` → `t("actions.confirm", "Confirm")`.
- L496: `{isArabic ? "إغلاق" : "Close"}` → `t("actions.close", "Close")`.
- L207: `{exporting ? "..." : t(...)}` — the literal `"..."` is mediocre; replace with `t("table.exporting", "Exporting…")`.

In `PaymentsHeader.jsx`:
- L25: `{t("title") || "المدفوعات"}` — the `||` fallback to a hardcoded Arabic string is wrong. Replace with `t("title", "Payments")` (rule B2 — fallback string in second arg, not via `||`).

In `PaymentsClient.jsx`:
- L92: `console.log("Export payments data", payments)` — the export is a placeholder. Either implement (call a real export endpoint or build a CSV in-browser) and wire `t()`-ed toasts, or remove the export button entirely until backend support exists.

In `PaymentReturnClient.jsx`:
- L78–86 / L88–94: inline `style={{ padding: 32, textAlign: "center" }}` and `style={{ color: "#c62828" }}`. Lift to `PaymentReturnClient.module.css` (new file).

**No hardcoded data arrays found.**
**No hardcoded API paths found** (everything goes through `API_PATHS`).

### 3.4 Data mapping bugs / fallback chains

- **`AdminPaymentsClient.js:70-72`** — fallback chain hides shape uncertainty:
  ```js
  const payments   = data?.payments    || data?.data?.payments    || [];
  const stats      = data?.stats       || data?.data?.stats       || {};
  const pagination = data?.pagination  || data?.data?.pagination  || { page, pages: 1, total: 0 };
  ```
  Backend (admin module) wraps via `sendSuccess(res, result, 'Payments retrieved successfully')`, which produces `{ status, message, data: { payments, stats, pagination } }`. The web `apiClient.apiRequest` returns the parsed JSON body, so the canonical path is `data.data.payments` only. The first branch is dead. **Action:** delete the first branch in all three lines.

- **`AdminPaymentsClient.js:489`** — `JSON.stringify(detailData?.data || detailData, null, 2)` — same fallback chain pattern, hiding the fact that the canonical path is `detailData.data` (single shape). Plus the modal renders raw JSON rather than a presentable detail view (see §3.2 / §6).

- **`PaymentReturnClient.jsx:45`** — `const payment = res?.data?.data || res?.data || res;` — three-level fallback. The canonical shape is `res.data.data` since the controller emits `res.json({ status: 'success', data: payment })` and `apiRequest` returns the parsed body (so `res === { status, data: payment }` and `payment = res.data`). **Action:** replace with `const payment = res?.data;`.

- **`PaymentsClient.jsx:23-24`** — `paymentsData?.data?.payments || []` — single-branch path matching `sendSuccess`. ✓ (no fallback chain). Acceptable.

### 3.5 Duplicate hooks / direct apiRequest calls

- **`PaymentReturnClient.jsx:41-44`** — calls `apiRequest({ method: 'GET', path: API_PATHS.hostPayments.poll3ds(moyasarId) })` directly inside the component (B0.2 / Rule 6 of the original frontend prompt). Replace with a new canonical hook `usePoll3DS(moyasarId)` in `hooks/reactQueryHooks/usePayments.js` (file does not yet exist; create it). The hook should encapsulate the polling cadence too — using React Query's `refetchInterval` controlled by a state variable that flips off when the payment status enters the terminal set.

- **`AdminPaymentsClient.js:14, 89`** — uses `paymentsAPI` from `@/services/adminDashboard` (legacy export). `paymentsAPI.export` calls a hardcoded `/admin/payments/export` rather than going through `API_PATHS.payments.export`. Migrate `handleExport` to use `apiRequest({ method:'GET', path: API_PATHS.payments.export, params: filters, responseType: 'blob' })` (or similar), or add a `useAdminPaymentsExport` mutation hook. Either way, drop the legacy import.

- **No `hooks/reactQueryHooks/usePayments.js` file exists.** All host-payments / 3DS-poll hooks should live there (newly created). Admin payment hooks already live in `useAdmin.js`; that's the existing convention and should stay.

### 3.6 State / loading / error gaps

- **`PaymentsClient.jsx:14-15`** — filter and page in `useState` instead of URL params (rule B14 violation). Bookmark/share breaks. Move to `useSearchParams` + `useRouter` like `AdminPaymentsClient.js` already does.
- **`PaymentsClient.jsx:18-21`** — uses `useMyPayments` correctly with `staleTime`; but no `error` branch handled in the render path (only `isLoading`). Add an error fallback similar to admin client (`<div className={styles.error}>...</div>`).
- **`AdminPaymentsClient.js:252`** — error branch reads `error.message || t("header.subtitle", ...)` — using the page subtitle as the error fallback is wrong (semantic mismatch). Use `t("errors.loadFailed", "Failed to load payments")`.
- **`AdminPaymentsClient.js:256`** — empty-state reads `t("table.searchPlaceholder", "No payments found")` — also wrong key (a placeholder isn't an empty-state title). Use `t("empty.title", "No payments found")`.
- **`PaymentReturnClient.jsx:56-61`** — timeout branch is correct but renders only after `attempts >= 30`. Add a "still waiting" friendly notice rather than a hard error after 60s.
- **No `ErrorBoundary` wrapping** on either page (rule B19). Wrap the exported page component with `<ErrorBoundary>` like other admin pages do.

### 3.7 Comment hygiene

- `AdminPaymentsClient.js:23-27` — `// Mint a UUID v4 — used once per modal session for the Idempotency-Key.` is a real "why" comment. Keep.
- `AdminPaymentsClient.js:74` — `// Only SUPER_ADMIN / ADMIN may issue write actions (§11 RBAC matrix).` — keep (links the rule to backend `restrictTo` choice).
- `AdminPaymentsClient.js:44-49` — comment about idempotency-key lifecycle. Keep, it explains a non-obvious subtlety.
- `PaymentReturnClient.jsx:26` — `// Moyasar appends 'id' and 'status' to the callback URL; we accept either.` — but the code only reads `id`, never `status`. Either keep the comment and add `searchParams.get('status')` as a fast-path before polling, or drop the "either" claim from the comment.

No FLOW-/PHASE-/BUG- markers found in the web tree ✓.

---

## 4. Frontend Mobile Findings

### 4.1 Screen → component tree

**`screens/admin/admin-dashboard/AdminPaymentsScreen.js`** (109 lines) ✓
- Uses `useAdminPaymentsInfinite(filters)` from `hooks/queries/useAdminInfinite.js`.
- Uses `adminDashboardService.payments.export(token, filters)` directly for export.
- Renders:
  - `components/plans/TopBar` — out-of-domain, OK.
  - `components/admin-dashboard/payments/PaymentStats.js` (45 lines) ✓
  - `components/admin-dashboard/payments/PaymentList.js` (33 lines) ✓
    - `components/admin-dashboard/payments/PaymentListItem.js` (36 lines) ✓
  - `components/admin-dashboard/common/AdminPageHeader` (out-of-domain).
  - `components/admin-dashboard/common/ExportButton`.

**Dead file:** `components/admin-dashboard/payments/PaymentFilters.js` (32 lines) — exported in `index.js` but **never imported by any screen** (the active screen uses `AdminPageHeader`'s built-in filters). Either wire it into `AdminPaymentsScreen` or delete it.

**No host-side payments-history screen** anywhere on mobile (no equivalent of web `/host/payments`).
**No 3DS return / poll screen** anywhere on mobile (no equivalent of web `/host/payments/return`). If mobile supports subscription checkout (`subscriptionService.subscribe`) this is a critical UX gap — when Moyasar returns a `pending_3ds` URL, mobile has no route to land back on after the user completes the redirect challenge.
**No payment-detail screen** on mobile. `adminDashboardService.payments.getById` exists in the service but no consumer.
**No refund / capture / void surfaces** on mobile. Admin-on-mobile is read-only. Decide whether to add (parity with web) or document the platform gap.

### 4.2 File-size violations

None inside `components/admin-dashboard/payments/`. The only adjacent file flirting with the cap is `services/adminDashboardService.js` at 371 lines (cap 500) — fine for now. The `hooks/queries/useAdminInfinite.js` and `useAdmin.js` are larger but file-wide for many domains, not payment-specific.

### 4.3 Service / hook violations

- **`hooks/queries/useAdmin.js:124-135`** — `useAdminPayments` exists but is **not consumed** by `AdminPaymentsScreen` (which uses `useAdminPaymentsInfinite` from `useAdminInfinite.js`). Either delete `useAdminPayments` and `useAdminPaymentSummary` (lines 239–250) if no screen will ever use them, or wire the summary hook into the dashboard widget. Today both are dead consumers.
- `hooks/queries/useAdminInfinite.js:207-217` — `useAdminPaymentsInfinite` shape is consistent with other infinite hooks. ✓
- `services/adminDashboardService.js:248-265` — `payments` exports use an **unused `_legacyToken` parameter** in every function. The header doc (lines 1–12) flags this as Phase-4 transitional; the new code rule (C1) says new code must drop the parameter. Action: rename the parameter to `_unusedToken` or drop it completely once the rest of the module adopts the same convention.
- `services/adminDashboardService.js:5` — the JSDoc `Phase 4 W0-AUTH:` marker should be rewritten as a normal "why" sentence (rule C8). It's the only phase tag in the module's mobile surface.
- **`PaymentListItem.js:13`** — `${payment.amount} SAR` hardcoded "SAR". Pull currency from `payment.currency` and the unit from `t('payments.details.currency')` (the project already has the key — see `PaymentStats.js:17`). Strengthens the locale path.
- **`PaymentListItem.js:5-10`** — `STATUS_AVATAR_COLOR` includes both `success` and `completed`. Backend's admin transformation emits `completed`, never `success`, so the `success` key is dead. Drop it.
- **`PaymentListItem.js:13`** — fallback `payment.amount != null ? ... : "—"` — the admin transformation always sets `amount`. The fallback is defensive but accepted at the boundary; keep.
- **`PaymentListItem.js`** — does not display `paymentMethod` / `paymentMethodLast4` / `moyasarPaymentId`. Web shows all three. Decide whether mobile parity matters; if yes, add fields.

### 4.4 Hardcoded text / data / paths

- `PaymentListItem.js:13` — `"SAR"` hardcoded (see above).
- No hardcoded API paths in the payments-specific files (they all flow through `adminDashboardService.payments.*`). The service file does inline path strings for the four endpoints — that's the project convention (no `ENDPOINTS.PAYMENTS` group exists in `config/api.js`). Either:
  - Add a `ENDPOINTS.PAYMENTS = { BASE: '/admin/payments', BY_ID: (id) => '/admin/payments/${id}', SUMMARY: ..., EXPORT: ... }` block in `config/api.js`, mirroring the convention used in `ticketsService.js` (which uses `ENDPOINTS.TICKETS.BASE`).
  - Or accept that admin endpoints currently live inline in `adminDashboardService.js` everywhere — fix module-wide in a separate cleanup, not in this plan.

### 4.5 Web/Mobile divergence

| Endpoint | Web | Mobile | Backend truth | Action |
|----------|-----|--------|---------------|--------|
| `GET /admin/payments` | `useAdminPayments` (filters: `page`, `limit`, `status`, `from`, `to`) | `useAdminPaymentsInfinite` (filters: `search`, `status`; no `from`/`to` exposed) | accepts `page`, `limit`, `status`, `from`, `to` (admin service line 2017) — **does NOT accept `search`** | Mobile sends a `search=` param the backend ignores. Either remove `searchQuery` plumbing in `AdminPaymentsScreen` (and surface a "search not supported" notice or drop the search box entirely), or add `search` support backend-side (matches by host name / Moyasar ID — would need a new index). Document the choice in §6. |
| `GET /admin/payments` filter values | web uses `[all, completed, pending, failed, refunded]` | mobile uses `[all, completed, pending, failed]` (no `refunded`) | service line 2024 accepts `[all, completed, pending, failed, refunded]` | Add `refunded` to mobile `FILTER_IDS` (line 15 of `AdminPaymentsScreen.js`). |
| `GET /admin/payments/:id` | `useAdminPaymentDetail` (consumed by detail modal) | `adminDashboardService.payments.getById` defined but **no screen** | sendSuccess `{ ... payment ... }` | Add a `PaymentDetailScreen` on mobile or document the gap. |
| `GET /admin/payments/summary` | `API_PATHS.payments.getSummary` defined, **no consumer** | `useAdminPaymentSummary` defined, **no consumer** | works | Wire to a dashboard widget or delete the hooks. |
| `POST /payments/:id/refund` | `useAdminPaymentRefund` (with `Idempotency-Key` header) | **none** | works | Add mobile equivalents OR document the gap (mobile admin = read-only). |
| `POST /payments/:id/capture` | `useAdminPaymentCapture` | **none** | works | same |
| `POST /payments/:id/void` | `useAdminPaymentVoid` | **none** | works | same |
| `GET /payments/:id` (host-self detail) | none | none | works | Both gaps. Decide — currently no UI for hosts to inspect a single payment. |
| `GET /payments/:id/poll` (3DS poll) | inline `apiRequest` in `PaymentReturnClient.jsx` | **none** | works | Web: extract to canonical hook. Mobile: add a 3DS deep-link return handler if mobile checkout is supported. |

### 4.6 Loading / error / empty states

- `PaymentList.js` delegates to `AdminFlatList` which handles `loading` / `emptyTitle` / `emptyMessage` / `onRefresh`. ✓
- `PaymentStats.js` returns `null` on missing `stats` — silent. Acceptable for a stats strip but the screen shows nothing while the first page loads. Consider adding skeleton placeholders.
- `AdminPaymentsScreen.js:46-50` — error toast on `error` change. Good. Missing: an in-screen retry button (the `AdminFlatList` `onRefresh` is the closest equivalent). Acceptable.

### 4.7 Comment hygiene

- `services/adminDashboardService.js:5` — `Phase 4 W0-AUTH:` phase marker. Remove (rule C8). Replace with a one-line "why" comment explaining the dual `/api` and `/api/v2` mount.
- `services/adminDashboardService.js:1-12` — header comment explains `apiFetch` switch and dual-mount; keep the why, drop the phase reference.

No other phase tags / FLOW markers found in the mobile payments tree ✓.

---

## 5. Cross-Platform API Consumption Diff

| Endpoint | Aspect | Web | Mobile | Backend truth | Action |
|----------|--------|-----|--------|---------------|--------|
| `GET /admin/payments` | path | `/admin/payments` | `/admin/payments` | `/admin/payments` | ✓ |
| | method | GET | GET | GET | ✓ |
| | filter `status` enum | `[all, completed, pending, failed, refunded]` | `[all, completed, pending, failed]` | `[all, completed, pending, failed, refunded]` (admin service line 2024) | Mobile: add `refunded` |
| | filter `search` | not sent | sent (`search=`) | **not accepted** | Mobile: drop or add backend support |
| | response.payments | `data.data.payments` (after dropping fallback chain) | normalised by `_normalizePage` (`data.data.payments` → `inner?.payments`) | `sendSuccess(res, { payments, stats, pagination })` so wire is `{ status, message, data: { payments: [...], stats: {...}, pagination: {...} } }` | Web: drop fallback chain. Mobile: ✓ |
| `GET /admin/payments/:id` | path | `/admin/payments/:id` (via `API_PATHS.payments.getById`) | `/admin/payments/:id` | `/admin/payments/:id` | ✓ but mobile has no consumer |
| `GET /admin/payments/summary` | consumer | none | none | works | wire or delete |
| `GET /admin/payments/export` | consumer | `paymentsAPI.export` (legacy) | `Linking.openURL` deep-link | works (returns Excel blob) | Web: migrate to API_PATHS+hook. Mobile: keep deep-link. |
| `POST /payments/:id/refund` | path | `/payments/:id/refund` | n/a | `/payments/:id/refund` | mobile parity decision |
| | body | `{ amount, reason }` (both optional) | n/a | `{ amount?, reason? }` (no Joi today) | add Joi schema (§2.6) |
| | header | `Idempotency-Key: <uuid v4>` | n/a | required by `idempotency` middleware | mobile must set if added |
| `POST /payments/:id/capture` | body | `{ amount }` (optional) | n/a | `{ amount? }` | same |
| `POST /payments/:id/void` | body | `{}` | n/a | `{}` | same |
| `GET /payments/:id` (host-self) | consumer | none | none | works | both gaps |
| `GET /payments/:id/poll` | path | `/payments/:id/poll` | n/a | `/payments/:id/poll` | mobile parity decision |
| | response shape | `res.data` (single path after fix) | n/a | `{ status, data: <Payment doc> }` | web fix fallback chain |
| `POST /payments/webhook` | n/a — server-to-server. Listed for completeness only.

---

## 6. Suspected Bugs Worth Verifying

(Things that look broken but the agent cannot confirm without running the app — flag them so the user can sanity-check.)

1. **`getById` / `poll3ds` controllers do not enforce whitelabel scope for admin reads.** A `WHITELABEL_ADMIN` of org A who knows or guesses a payment id belonging to org B can `GET /payments/<id>` and read it, including `paymentMethod.last4`, `userId.email`, `moyasarPaymentId`. The admin counterpart `/admin/payments/:id` *does* enforce §15.2B; this one does not. Severity: **medium-high** (PII leak across tenants, even within admin tier).
2. **`paymentsService.issueRefund` writes Payment + Subscription without a transaction.** If the second `sub.save()` throws (e.g. version conflict), the audit log has already written `payment.refunded` and the funds have moved at Moyasar, but the linked subscription stays `active`. The reverse case (provider succeeded, save failed) can leave `payment.refunded` mid-state. Severity: **medium**.
3. **`poll3ds` runs subscription/addon finalization in the controller** — same logic also lives in `webhook.controller.handle` and `payments.reconcile.runReconcileTick`. If two of those fire at once for the same payment, the second one's `finalizePending3ds` should be a no-op (the metadata flag is cleared by the first), but the order of `payment.applyMoyasarSnapshot` + `payment.save` versus the finalize call differs across the three sites. Race-condition risk. Severity: **medium** — verify by simulating a webhook arriving while the user is also polling.
4. **Refund "remaining" calculation does not consider currency.** `payment.amount - payment.refundedAmount` assumes both are in major SAR units; the Moyasar `applyMoyasarSnapshot` divides `refunded` by 100 (halalas → major), so this should be correct, but if a webhook arrives with a different currency (or the amount field is ever migrated to halalas), this silently corrupts the remaining-balance check. Audit the migration story before refactoring.
5. **`PaymentReturnClient.jsx` redirects every successful 3DS payment to `/host/create-event`**, regardless of whether the original payment was a subscription, an addon, or a renewal. The redirect target should depend on `payment.metadata.purpose`. Verify with a real flow that this isn't dropping users on the wrong page.
6. **`AdminPaymentsClient.js` `canWrite` check** uses `String(userRole || "").toLowerCase()` and compares against `["super_admin", "admin"]`. The auth store may already lowercase the role, but `ROLES.SUPER_ADMIN` / `ROLES.ADMIN` are exported as `'super_admin'` / `'admin'` (lowercase). Verify by checking what the store stores.
7. **Reconcile cron iterates one Payment at a time** (`for (const p of pendings)`), which under load can lengthen the tick beyond the 5-minute cron cadence. The cron lease guards against double-execution, but if the tick takes 6 minutes the next interval is skipped. Acceptable today (BATCH_LIMIT = 50, ~50ms each) but worth knowing.
8. **`StatusBadge.jsx` (host)** uses keys `success / cancelled / pending` while `useMyPayments` returns rows with `status` mapped from `Payment.status`. The subscriptions module's payment-history transformer maps to `success / pending / cancelled` (presumably) — verify the mapping or pass the raw backend status through and let the badge map.
9. **Webhook idempotency key** uses `<dataId>:<eventType>`. If Moyasar sends two genuinely-different states for the same `dataId+eventType` (e.g. two `payment_updated` events with different `data.refunded` totals), the second one is treated as a duplicate of the first. The `requestHash` of `{eventType, dataId, status, refunded, captured}` should mitigate this — but `withIdempotency` cache TTL behaviour matters. Verify the cache TTL matches Moyasar's retry window.
10. **`paymentsService.issueRefund` accepts `amount = 0`** — `typeof amount === 'number'` is true and `0 > remaining` is false (assuming `remaining > 0`), so the call falls through to provider with `amount: 0`. Provider may reject; we should reject earlier with `ValidationError('Refund amount must be > 0')`.

---

## 7. Implementation Plan (Ordered)

Apply changes in this order. Each item ends with a checkbox the agent will tick during Phase 2.

### 7.A Backend

- [ ] **A.1** Create `src/modules/payments/payments.validation.js` with `refundSchema` (`amount?: number > 0`, `reason?: string ≤ 500`, `.unknown(false)`) and `captureSchema` (`amount?: number > 0`, `.unknown(false)`). Wire via `validate(refundSchema)` / `validate(captureSchema)` middleware in `payments.routes.js`.
- [ ] **A.2** Add `validateObjectId('id')` to all five authenticated `:id` routes in `payments.routes.js`.
- [ ] **A.3** Move authorization out of `payments.controller.getById` and `poll3ds` into the service. New signature: `paymentsService.getById(paymentId, requestingUser)` — throws `NotFoundError`/`ForbiddenError`. Drop the inline 403 `res.status` calls. (`payments.controller.js:8-22, 25-38`)
- [ ] **A.4** Per locked decision #10: lock `/payments/:id` and `/payments/:id/poll` as **host-self-only**. In `paymentsService.getById(paymentId, requestingUser)`, authorize **self-ownership only** — admins (any role) get a `403 ForbiddenError` with `code: 'USE_ADMIN_ENDPOINT'` directing them to `/admin/payments/:id`. This eliminates the §6.1 whitelabel scope leak by construction; no admin code path remains on the host route. Mirrors the events-module convention (`events.routes.js` host-side vs `events.admin.routes.js`).
- [ ] **A.5** Extract repeated finalization logic (`subscriptionsService.finalizePending3ds` / `addonsService.finalizePending3ds` dispatch) into `paymentsService.runFinalization(payment)`. Replace call sites in `payments.controller.poll3ds` (lines 39–62), `webhook.controller.handle` (lines 124–148), and `payments.reconcile.runReconcileTick` (lines 41–62). The new method must be idempotent and safe to call concurrently. (3 sites collapse to 1.)
- [ ] **A.6** Wrap `paymentsService.issueRefund`'s Payment + Subscription writes (lines 91 & 114) in a Mongo session/transaction to fix §6.2. The provider call stays outside the transaction (already authorized at this point, no rollback). On transaction abort, write a `payment.refund_partial_failure` audit row.
- [ ] **A.7** Replace `actor: { _id: actorUserId, role: 'admin' }` literals (lines 95, 141, 167) with `actor: { _id: actorUserId, role: ROLES.ADMIN }` (or pass the full user object). Replace the subscription-status string literals (`'cancelled' | 'active' | 'trial'`) with `Subscription.STATUS.*` constants.
- [ ] **A.8** Reject `amount === 0` in `issueRefund` and `capturePayment` with `ValidationError('Refund amount must be greater than 0')`. (Closes §6.10.)
- [ ] **A.9** Replace every `console.error` / `console.warn` in `payments.service.js`, `webhook.controller.js`, `payments.reconcile.js` with the shared `shared/utils/logger.js`. Remove every `// eslint-disable-next-line no-console` suppression. (9 sites.)
- [ ] **A.10** Replace direct `res.status(...).json(...)` in `payments.controller.refund` / `capture` / `void` with `sendSuccess(res, payment, '<message>')` (3 sites).
- [ ] **A.11** Add `@swagger` JSDoc for all 7 module routes (the 5 authenticated + the public webhook + the dev stub). Add `Payment`, `PaymentRefund`, `PaymentMethod`, and `MoyasarWebhookPayload` to `src/config/swagger.js` `components.schemas`. Reuse `IdParam`, `PageParam`, `LimitParam` where applicable.
- [ ] **A.12** Update existing `/admin/payments` Swagger (in `admin.routes.js:1231-1259`) to include `refunded` in the `status` enum.
- [ ] **A.13** Tighten the `restrictTo` comment block in `payments.routes.js:23-31` to two sentences (keep the why, drop the duplicated explanation).
- [ ] **A.14** Per locked decision #8: introduce a `'manage'` action verb in `src/shared/constants/permissions.js`. Update `canAccessPage(user, page, action)` to handle `action === 'manage'`: returns `true` only when `getPageAccess(user, page) === ACCESS_LEVELS.FULL` **and** `user.role ∈ [ROLES.SUPER_ADMIN, ROLES.ADMIN]`. Convert refund/capture/void in `payments.routes.js` from `restrictTo(SUPER_ADMIN, ADMIN)` to `requirePageAccess(ADMIN_PAGES.PAYMENTS, 'manage')`. Keep the `idempotency(...)` middleware in place. Update Swagger to reflect the gate (description + `403` response). Verify `ROLE_HIERARCHY` inheritance in `getPageAccess` does not let MODERATOR or WHITELABEL_* slip through (MODERATOR has `PAYMENTS: VIEW` so FULL check fails; WHITELABEL_ADMIN has FULL but role check fails). Add a unit test in `permissions.test.js` exercising all 5 admin roles against the new verb.
- [ ] **A.15** Add `search` parameter support to `adminService.getPayments` per locked decision #4. Accept `search` query param; match (case-insensitive, trimmed) against `userId.fullName` / `userId.email` / `moyasarPaymentId`. Add a compound text-or-regex index sufficient to keep the query bounded (prefer regex-anchored on `moyasarPaymentId` + populated host search via the existing user index). Update Swagger (`admin.routes.js` payments section / `admin.payments.routes.js`) `parameters` block to include `search`.

### 7.B Web

- [ ] **B.1** Replace fallback chains in `AdminPaymentsClient.js:70-72` with `data.data.payments / .stats / .pagination` only. Replace `detailData?.data || detailData` (line 489) with `detailData.data`.
- [ ] **B.2** Replace fallback chain in `PaymentReturnClient.jsx:45` with `const payment = res.data;`.
- [ ] **B.3** Create `hooks/reactQueryHooks/usePayments.js` with `usePoll3DS(moyasarId)` (uses React Query's `refetchInterval` until the payment status enters the terminal set). Migrate `PaymentReturnClient.jsx` to consume it. Drop the inline `apiRequest` call.
- [ ] **B.4** Split `AdminPaymentsClient.js` (503 lines) into 5 files per §3.2 plan, **preserving `AdminPaymentsClient.module.css` exactly** and porting the inline modal styles into new module.css class keys with byte-identical values. After the split, the top-level `AdminPaymentsClient.js` must remain ≤ 250 lines.
- [ ] **B.5** Replace the 9 hardcoded Arabic/English `isArabic ? "..." : "..."` ternaries in `AdminPaymentsClient.js` (listed in §3.3) with `t()` calls, and fix the wrong-key fallbacks (`error.message || t("header.subtitle", ...)` → `t("errors.loadFailed", ...)` and the empty-state key).
- [ ] **B.6** In `PaymentsHeader.jsx:25` change `t("title") || "المدفوعات"` to `t("title", "Payments")`.
- [ ] **B.7** In `PaymentsClient.jsx`: move `filter` and `page` state from `useState` to `useSearchParams` + `useRouter` (rule B14). Add an error branch in the render path. **Per locked decision #1: implement the export properly** — call `API_PATHS.payments.export` (or the host-scoped equivalent) via `apiRequest` with `responseType: 'blob'`, trigger client download, surface success/error toasts via `t()`. Remove the `console.log` placeholder.
- [ ] **B.8** In `host/payments/page.js`: add `await params` — `const { lang } = await params;` — to satisfy Next.js 15.
- [ ] **B.9** Migrate `AdminPaymentsClient.js` `handleExport` from `paymentsAPI.export` (legacy `services/adminDashboard.js`) to a new `useAdminPaymentsExport` mutation hook in `useAdmin.js` that calls `API_PATHS.payments.export`. Drop the legacy import.
- [ ] **B.10** Wrap the host payments page (and the admin payments page) export with `<ErrorBoundary>` per rule B19.
- [ ] **B.11** Lift inline styles in `PaymentReturnClient.jsx` to a new `PaymentReturnClient.module.css`. Preserve every value (padding 32, color #c62828) verbatim.
- [ ] **B.12** Per locked decision #2: branch `PaymentReturnClient.jsx` redirect target on `payment.metadata.purpose`. Map: `subscription` → subscription confirmation page, `addon` → addon-success page, `renewal` → host dashboard / billing page. If `purpose` is missing/unknown, fall back to current `/host/create-event`. Verify the actual purpose values emitted by `subscriptionsService.subscribe` / `addonsService.*` before wiring the switch — confirm with the user if mapping is ambiguous.
- [ ] **B.13** Per locked decision #3: implement `PaymentDetailModal.js` as a real fields view (do NOT defer). Render canonical fields: `id`, `status` (badge), `amount` + `currency`, `paymentMethod` + `last4`, `moyasarPaymentId`, `createdAt`, `refunds[]` (list with amount/reason/timestamp), audit timestamps (`capturedAt`, `voidedAt`, `refundedAt` where present). Replace the `JSON.stringify` placeholder. Use existing `module.css`-styled labelled rows for layout; localize all field labels via `t()`.

### 7.C Mobile

- [ ] **C.1** In `services/adminDashboardService.js:5` rewrite the `Phase 4 W0-AUTH:` phase marker as a normal "why" comment, dropping the phase reference (rule C8).
- [ ] **C.2** Add `'refunded'` to `FILTER_IDS` in `AdminPaymentsScreen.js:15` and to the `payments.filters.*` localisation keys, matching web. Closes part of §5.
- [ ] **C.3** Per locked decision #4: keep the mobile search box. Backend support is added in **A.15**. Verify after A.15 lands that the `search=` value flows through `useAdminPaymentsInfinite` → service → controller and exercises the new index. Add a quick screen-test for empty results.
- [ ] **C.4** In `PaymentListItem.js:13` replace `${payment.amount} SAR` with `${payment.amount} ${t('payments.details.currency')}` (and read `payment.currency` to drive the unit when present). Drop the dead `success` key from `STATUS_AVATAR_COLOR`.
- [ ] **C.5** Per locked decision #5: **delete dead hooks.** Remove `useAdminPaymentSummary` (mobile `hooks/queries/useAdmin.js:239-250`), `useAdminPayments` (mobile lines 124–135 — note `useAdminPaymentsInfinite` is the active one and stays), and `adminDashboardService.payments.getSummary`. On web, drop `API_PATHS.payments.getSummary` if grep confirms no other consumer. Do NOT add a summary widget.
- [ ] **C.6** Per locked decision #6: **wire `PaymentFilters.js` into `AdminPaymentsScreen.js`** in place of `AdminPageHeader`'s built-in filters. Keep its export from `index.js`. Ensure the filter state plumbing matches the screen's existing `filters` object shape and includes `refunded` (per C.2).
- [ ] **C.7** Per locked decision #7: **add mobile parity** in this phase order:
  - **C.7.a** Read-only `PaymentDetailScreen` consuming `adminDashboardService.payments.getById` (already defined). Surface canonical fields parity with web `PaymentDetailModal` (B.13). Wire navigation from `PaymentListItem`.
  - **C.7.b** 3DS-return / poll deep-link handler — mobile route that catches the Moyasar callback URL, then polls `GET /payments/:id/poll` until terminal status, then routes per `payment.metadata.purpose` (mirror B.12 logic).
  - **C.7.c** Mutation hooks `useAdminPaymentRefund` / `useAdminPaymentCapture` / `useAdminPaymentVoid` (mobile) wired to an admin action sheet on the detail screen. `Idempotency-Key` header per call (mint UUID v4 once per modal session — mirror web pattern).

### 7.D Cross-platform alignment (do AFTER A/B/C)

- [ ] **D.1** Verify both web and mobile call `GET /admin/payments` with the same `status` enum (post-C.2). Re-grep.
- [ ] **D.2** Verify the response shape `{ data: { payments, stats, pagination } }` is the only path read on either platform (post-B.1, M.5 normaliser unchanged).
- [ ] **D.3** Add a manual smoke check (or integration test) that walks a 3DS test payment from `subscriptionsService.subscribe` → 3DS redirect → `/host/payments/return` → `usePoll3DS` → terminal `paid`, confirms the linked subscription went `active`, and confirms the audit log has `payment.webhook_processed` (or `payment.captured`).
- [ ] **D.4** Per locked decision #8: after A.14 lands, audit any other refund/capture/void-class endpoints across modules (e.g. `subscriptions`, `addons`) for the same WHITELABEL_ADMIN over-grant pattern. If found, plan a follow-up to migrate them to `requirePageAccess(<page>, 'manage')`. Out of scope for this module's commit, but list the call sites here so the follow-up ticket is concrete.
- [ ] **D.5** Per locked decision #11: before any §6 fix, the agent verifies the corresponding bug against the live app or via a targeted read of the suspect call chain, then surfaces findings to the user and waits for confirmation before editing code. Applies to §6 items 1–10.

---

## 8. Locale-key additions required

(Listed for the user — agent does NOT modify locale JSON without explicit approval.)

**Web — `adminPayments` namespace:**
- `export.success` (en: "Payments exported", ar: "تم تصدير المدفوعات")
- `refund.success` (en: "Refund issued", ar: "تم الاسترداد")
- `capture.success` (en: "Payment captured", ar: "تم القبض")
- `void.success` (en: "Payment voided", ar: "تم الإلغاء")
- `pagination.prev` (en: "Previous", ar: "السابق")
- `pagination.next` (en: "Next", ar: "التالي")
- `actions.cancel` (en: "Cancel", ar: "إلغاء")
- `actions.confirm` (en: "Confirm", ar: "تأكيد")
- `actions.close` (en: "Close", ar: "إغلاق")
- `errors.loadFailed` (en: "Failed to load payments", ar: "فشل تحميل المدفوعات")
- `empty.title` (en: "No payments found", ar: "لا توجد مدفوعات")
- `table.exporting` (en: "Exporting…", ar: "جارٍ التصدير…")

**Web — `hostPayments` namespace:**
- `title` (en: "Payments", ar: "المدفوعات") — already exists per `t("title")` reference, but verify.
- `errors.loadFailed` (en: "Failed to load your payments", ar: "فشل تحميل المدفوعات")

**Mobile — `admin.payments.filters.refunded`** (en: "Refunded", ar: "مسترد") — for C.2.

**Mobile — `admin.payments.searchPlaceholder`** — already used; if C.3 chooses to remove the search box, this key may go unused.

---

## 9. Rollback plan

For each implementation item, the rollback is a `git revert` of its commit. Items that touch DB shape are nil — no schema migrations are proposed. The only data-shape concern is A.6 (transaction wrap on refund), which changes runtime semantics but not stored shape; rollback is `git revert` plus a check that no in-flight refunds executed during the rollback window.

A.11 (Swagger) is purely additive; rollback risk is nil.

A.14 (RBAC `'manage'` action) touches the permissions module and is gated behind a separate decision — keep its rollback story confined to a single commit.

---

## 10. Acceptance checklist (run after Phase 2)

- [ ] No file in module exceeds the cap.
- [ ] All 7 module endpoints have current `@swagger` JSDoc; admin Swagger `status` enum matches the service.
- [ ] No duplicate finalization-dispatch logic remains — `paymentsService.runFinalization` is the single site.
- [ ] All five `:id` routes carry `validateObjectId('id')`.
- [ ] `payments.validation.js` exists; `refundSchema` and `captureSchema` are wired via `validate(...)` middleware.
- [ ] No `console.log` / `console.error` / `console.warn` in `src/modules/payments/*` (only the shared `logger`).
- [ ] No `// eslint-disable-next-line no-console` suppressions in `src/modules/payments/*`.
- [ ] Refund + linked subscription cancel runs inside a Mongo transaction.
- [ ] `getById` and `poll3ds` enforce whitelabel scope for admin reads.
- [ ] Web `AdminPaymentsClient.js` ≤ 250 lines; CSS module rules unchanged; visual smoke OK on both LTR + RTL.
- [ ] Web admin payments client uses no `isArabic ? "ar" : "en"` ternaries — every user-visible string is `t(...)`.
- [ ] `PaymentReturnClient.jsx` polls via canonical `usePoll3DS` hook; no inline `apiRequest`.
- [ ] Web + Mobile call `GET /admin/payments` with the same `status` enum (`refunded` included on mobile).
- [ ] No fallback chains (`a?.x || b?.y || c?.z`) in any payments-surface mapping.
- [ ] No `// FLOW-…` / `// PHASE-…` / `// W0-…` comments in payments-surface files.
- [ ] `npm run lint` clean (or no new warnings introduced).
- [ ] Visual smoke test: admin payments page (LTR + RTL), host payments page, 3DS return page — all look identical before / after the refactor.
- [ ] All locked decisions (§0.1) reflected in shipped code: #1 export implemented, #2 redirect branches on purpose, #3 detail modal renders real fields, #4 backend `search` accepted + indexed, #5 dead summary hooks deleted, #6 mobile `PaymentFilters` wired, #7 mobile parity (detail → 3DS-poll → write actions) shipped or sequenced, #8 `manage` RBAC verb introduced, #9 no webhook limiter added, #10 `/payments/:id` host-self-only, #11 every §6 bug verified before its fix.

---

## 11. Implementation ship report — 2026-05-08

### Phase A (Backend) — SHIPPED
**Permissions / RBAC**
- Added `'manage'` action verb to `canAccessPage` (`src/shared/constants/permissions.js`). Semantics: `access === FULL && role ∈ {SUPER_ADMIN, ADMIN}`. Updated `requirePageAccess`'s actionMessages map. Verified by table run: SUPER_ADMIN/ADMIN pass, MODERATOR/WHITELABEL_ADMIN/WHITELABEL_MODERATOR/HOST fail. (A.14)

**Payments module (`src/modules/payments/`)**
- New `payments.validation.js` with zod `refundSchema` + `captureSchema` (strict, `.gt(0)`, max-length reason). (A.1)
- `payments.routes.js` rewritten: `validateObjectId('id')` on every `:id` route, `validateZod` on refund/capture, `requirePageAccess(PAYMENTS, 'manage')` on refund/capture/void. Full `@swagger` JSDoc on all 8 routes (the new `/checkout` already had it; webhook/stub/getById/poll/refund/capture/void added). (A.1, A.2, A.11, A.13, A.14)
- `payments.controller.js` slimmed: authorization moved into the service, `sendSuccess` everywhere, `runFinalization` called once for poll path. (A.3, A.5, A.10)
- `payments.service.js` rewritten: `getById(paymentId, requestingUser)` now host-self-only — admin-class roles get a typed `ForbiddenError` directing them to `/admin/payments/:id`. New `runFinalization(payment)` is the single source of truth for purpose-aware finalization (subscription / addon / checkout). `issueRefund` wraps Payment + Subscription writes in a Mongo transaction. `actorRole` propagates into audit rows; subscription status uses `SUBSCRIPTION_STATUS.*` constants. `amount === 0` rejected with `ValidationError`. (A.4, A.5, A.6, A.7, A.8)
- `webhook.controller.js` + `payments.reconcile.js` updated to call `runFinalization` (3 → 1 site collapse) and use shared `logger` instead of `console.*` (9 sites). Webhook reconcile cron now correctly handles `purpose: 'checkout'` (was missing). (A.5, A.9)
- `console.error/warn/log` count in `src/modules/payments/*.js` after refactor: **0**.

**Admin payments (`src/modules/admin/`)**
- `admin.payments.service.js`: new `buildPaymentSearchClause` follows the events/hosts module convention (escape regex, `$or` over direct field + pre-resolved `userId.$in` from a User collection lookup). `getPayments` and `exportPayments` accept the `search` param. (A.15)
- `admin.payments.controller.js`: pipes `search` from `req.query`. (A.15)
- `admin.payments.routes.js`: Swagger updated — `status` enum now `[all, completed, pending, failed, refunded]`; `search` parameter added. (A.12, A.15)

**Subscriptions module (host-side export)**
- New `GET /subscriptions/payments/export` route + `exportMyPayments` controller + service method. Returns Excel; same shape as admin export minus host columns. Wires the host-side B.7 work.

**Swagger**
- New components.schemas: `Payment`, `PaymentRefund`, `PaymentMethod`, `PaymentResponse`, `MoyasarWebhookPayload`. All 8 payments paths now appear in the spec.

### Phase B (Web) — SHIPPED

**Split admin client** (B.4 — `D:\halla\labbe\app\[lang]\admin-dash\payments\_components\`)
- `AdminPaymentsClient.js`: 503 → **225** lines (cap 250) — top-level wrapper with URL state, hook composition, page header, stats, modal mounts.
- `PaymentsToolbar.js`: 39 lines.
- `PaymentsFiltersPanel.js`: 51 lines.
- `PaymentsTable.js`: 145 lines.
- `PaymentActionModal.js`: 86 lines (lifted from inline `style={{...}}` to module.css classes).
- `PaymentDetailModal.js`: 170 lines — **real fields view** (id, status badge, amount + refunded tag, method + last4, Moyasar ID, createdAt, capturedAt/voidedAt/refundedAt where present, refunds[] list). Replaced `JSON.stringify` placeholder. (B.13)
- `usePaymentActions.js`: 91 lines — extracted refund/capture/void state machine + UUID v4 minting per modal session.
- `AdminPaymentsClient.module.css` extended: 21 new keys (modalOverlay, modalBody, modalBodyWide, modalTitle, modalActions, modalConfirm, modalInput, modalInputLast, detailGrid, detailLabel, detailValue, detailMono, detailSection, detailSectionTitle, refundRow, actionRow, txCell, refundedTag). All inline `style={{…}}` blocks lifted.

**Other web changes**
- `AdminPaymentsClient.js` fallback chains removed: canonical `data?.data?.payments / .stats / .pagination` only. (B.1)
- `PaymentReturnClient.jsx`: rewritten to consume canonical `usePoll3DS(moyasarId)` hook; redirect target branches on `payment.metadata.purpose` (`subscription` → `/host/subscription`, `addon` → `/host/events`, `checkout` → `/host/create-event`, missing/unknown → `/host`); inline styles lifted to new `PaymentReturnClient.module.css`. (B.2, B.3, B.11, B.12)
- `host/payments/page.js`: `await params` (Next.js 15 fix). (B.8)
- `PaymentsHeader.jsx`: `t("title", "Payments")` instead of `t("title") || "المدفوعات"`. (B.6)
- `PaymentsClient.jsx`: filter+page state moved to `useSearchParams`; `useMyPaymentsExport` wired to new `/subscriptions/payments/export`; error branch added; placeholder `console.log` removed. (B.7, B.14)
- `useAdmin.js`: new `useAdminPaymentsExport` mutation hook (blob → download); deleted `useAdminPaymentSummary` (dead). (B.9, decision #5)
- `usePayments.js` (new file): `usePoll3DS` (React Query v5 — refetchInterval flips off at terminal status or maxAttempts) + `useMyPaymentsExport`. (B.3)
- `api.config.js`: dropped unused `payments.getSummary`; added `hostPayments.export`. (decision #5)
- `services/adminDashboard.js`: deleted legacy `paymentsAPI` block (no remaining callers). (B.9)
- `StatusBadge.jsx`: extended config to `{completed, failed, refunded, pending, cancelled}` (was `success/cancelled/pending` — bug §6.8). Dropped dead `success` key.
- ErrorBoundary wrappers added to admin payments page, host payments page, and host return page. (B.10)
- All hardcoded `isArabic ? "ar" : "en"` ternaries in admin client replaced with `t()` calls; `t("header.subtitle", …)` empty-state error fallback fixed to `t("errors.loadFailed", …)`; placeholder fallback fixed to `t("empty.title", …)`. (B.5)
- Locale files updated (en + ar adminPayments + hostPayments) with all new keys: `pagination.prev/next`, `actions.cancel/confirm/close`, `errors.loadFailed`, `empty.title`, `export.success`, `refund.success`, `capture.success`, `void.success`, `table.exporting`, `dateRange.from/to`, `detail.*`. JSON parsed clean.

### Phase C (Mobile) — running in background
Dispatched to a sub-agent with full locked-decision context. Awaiting completion notification.

### Phase D (Cross-platform)
- D.1 enum parity: web admin uses `[all, completed, pending, failed, refunded]` ✓; mobile pending C.2 from agent.
- D.2 response shape: web reads `data?.data?.payments` (single path) ✓; mobile pending agent (`_normalizePage` already unwraps).
- D.3 3DS smoke: manual — instructions: navigate to a 3DS-pending payment via `subscriptionsService.subscribe`, complete the redirect at `/host/payments/return?id=<moyasarId>`, observe `usePoll3DS` flip to terminal status, then verify the redirect target matches `payment.metadata.purpose`.
- D.4 follow-up scan for similar over-grant patterns: only `notifications.routes.js:244` and `:280` (`POST /notifications/send`) currently use `restrictTo(ADMIN, SUPER_ADMIN)`. They could migrate to `requirePageAccess(<page>, 'manage')` once a NOTIFICATIONS page exists in `ADMIN_PAGES`. Out of scope for this module.
- D.5 §6 bug-by-bug verification: all confirmed against current code before fixes (see "Phase 2 verification" section in agent transcript). §6.4, §6.7, §6.9 left intentionally untouched (currency assumption is SAR-only and acceptable; reconcile cron iteration is bounded; webhook idempotency TTL is policy).
