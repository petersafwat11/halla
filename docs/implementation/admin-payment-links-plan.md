# Halaa admin payment links — implementation handoff

Prepared 2026-09-10. This is a plan, not an implemented feature. Repository findings were checked against the current working tree; Moyasar API behavior was checked against official documentation. Preserve unrelated working-tree changes.

## 1. Product decision and scope

Add **Payment links** as a second tab within the existing **Payments** area:

- Transactions: `/[lang]/admin-dash/payments` (existing default route).
- Payment links: `/[lang]/admin-dash/payments/links` (new nested page).
- Keep the existing Payments sidebar entry. Broaden its header subtitle beyond subscription payments. Use a shared tab component on both pages without duplicating the page header or SSR prefetch.

This is the natural home because Payments already contains financial status, transaction details, and refunds. A separate table keeps unpaid requests distinct from actual transactions. Direct routing makes the tab bookmarkable and preserves independent filters.

**V1:** super admins, admins, and moderators generate a fixed-amount SAR request, copy the URL, manually send it using their preferred channel, and track payment in the dashboard. Clients pay without Halaa accounts on Moyasar's hosted invoice page. Support cancellation of unpaid links because an incorrect amount must be retractable.

The request collects a standalone payment. It does not automatically activate a subscription, grant invitations, purchase an addon, or fulfill a business assignment. Do not repurpose those checkout flows. Native mobile admin UI, automatic messaging/reminders, bulk generation, partial installments, reusable donation links, and tax-document generation are outside V1. The admin web experience must work on mobile browsers.

Proposed defaults: links expire after 7 days; staff may choose 24 hours, 7 days, or 30 days. The amount entered is the final client charge; do not silently add tax or fees. A provider payment request is not automatically a Halaa tax invoice. These are product defaults, not facts discovered in the repository.

## 2. Existing code and integration constraints

| Area | Existing file(s) | Consequence |
| --- | --- | --- |
| Payments UI | `halaa-web/app/[lang]/admin-dash/payments/page.js`, `_components/PaymentsPageHeader.jsx`, `PaymentsTable.js`, `PaymentDetailModal.js` | Reuse header, table, money, dialogs, loading and error conventions. |
| Admin queries | `halaa-web/hooks/admin/{keys,queries,mutations}.js`, `shared/src/api/paths.js` | Extend established query keys and API contract. |
| Payment records | `halaa-backend/models/PaymentModel.js` | `userId` is required; amounts are SAR major units; provider payment ID already has a partial unique index. Guest payment ownership needs an explicit extension. |
| Provider adapter | `halaa-backend/src/infrastructure/paymentProvider/{index,moyasar}.js` | `createInvoice` and `fetchInvoice` exist. Creation currently converts SAR major units to halalas, sends `callback_url`, and returns the hosted URL. It lacks expiry/cancel/recovery support for this feature. |
| Webhook | `halaa-backend/src/modules/payments/webhook.controller.js` | Invoice events currently target subscription renewal. Unknown payment IDs are acknowledged and ignored. New invoice payments cannot rely on that behavior unchanged. |
| Recovery | `halaa-backend/src/modules/payments/payments.reconcile.js`, `src/shared/utils/scheduledTasks.js` | Existing cron handles pending Payment rows with known payment IDs, not unpaid invoices. Add invoice-specific recovery. |
| Authorization | backend `src/shared/constants/permissions.js`, `src/shared/middleware/rbac.js`; web `services/serverAuth.js`, `ui/layout/navConfig`, `hooks/usePageAccess.js` | Moderators default to Payments VIEW. `manage` requires FULL plus admin/super_admin. Do not grant moderators global payment management just to create links. |
| Middleware idempotency | backend `src/shared/middleware/idempotency.js` | Non-success responses remove cached intents. It cannot alone protect against an invoice being created remotely before a timeout. |
| Admin transaction data | backend `src/modules/admin/admin.payments.service.js` | Labels/search currently assume a host. Guest payments must have meaningful labels, safe detail responses, and export support. |

No AGENTS.md was found by the repository file search. Implementation must recheck repository instructions and changes before editing.

## 3. Admin experience

### Create and copy

Primary action on the Payment links tab: **Create payment link** / **إنشاء رابط دفع**. Use one short dialog, full-screen on narrow phones:

1. **Amount (SAR)** — prominent, required, fixed currency suffix. Accept Arabic and Western digits and normalize the Arabic decimal separator. Allow at most two fractional digits. Reject grouping ambiguity, exponents, signs, extra decimals and invalid values rather than rounding silently.
2. **Payment description** — optional input, maximum 200 characters; visible to the client. Default a localized description containing the generated request reference when empty. Clearly label that clients see this text.
3. **Client label** — optional, maximum 100 characters, internal only; enough to identify the request without collecting phone/email. Label it as an intended recipient, not verified payer identity.
4. **Expires after** — default 7 days, with the choices above and a human-readable exact expiration preview.
5. Final summary: “Client will pay SAR 250.00”. Submit: **Create link**.

Keep entered values on errors. Disable repeated submit while pending. On success, keep the dialog open and show amount, reference, expiry, read-only URL, and prominent **Copy link**. Add **Done** and **Create another** as secondary actions. Insert/invalidate the newest row immediately. A browser clipboard failure must show a selectable URL and manual-copy guidance; only show “Copied” after clipboard success.

Do not claim a link was sent when it was copied. No messaging API calls are needed. For an uncertain provider response show “Still creating — checking with the payment provider” with the saved request reference; do not invite blind recreation.

### List and detail

Default newest-first, server pagination of 20 rows, URL-persisted filters. Columns: reference/client label, description, amount, status, creator, created date, expiry, actions. On narrow screens show the reference/client, amount, status, and Copy action prominently; place secondary information in an expandable detail or existing responsive table pattern.

Filters: search by reference/description/client label, status, created date range, creator. Debounce search, reset page on filter changes, escape regex or use an indexed search strategy, bound query lengths and limits. Use status text as well as color.

Default summary cards: **Awaiting payment**, **Paid**, **Net collected (SAR)**, computed by the backend for the same filters. Net collected includes verified successful transactions minus refunds, not requested amounts. Label date filters as request creation dates so the cards' date semantics are unambiguous.

Row actions: Copy link for active unpaid requests; View details; Refresh status; Cancel for eligible unpaid requests. Paid, expired, canceled, refunded, and provider-blocked links have no primary payment/share action. The original URL may remain visible in admin details for audit/reference, clearly marked inactive.

Details show creator, intended client label, final amount, reference, expiry, current status, last successful provider check, paid time, refunds, and linked transaction(s). Show only sanitized failure summaries. Link to the existing payment-detail experience for a recorded transaction. A failed attempt should be visible in detail without suggesting that the entire request can never be paid.

Refresh local list data every 20 seconds while the tab is visible, refetch on focus, and pause in background. A detail dialog may poll every 10 seconds while awaiting a payment. These reads hit Halaa's database; they must not fan out provider requests. Manual Refresh queues/coalesces a bounded provider check and shows its result. Provider outages preserve the last known payment status with “Could not check latest status”; never translate an outage to “Unpaid”.

Use existing AR/EN translations, MoneyAmount, logical CSS properties and design tokens. URLs render LTR inside RTL layouts. Provide focus trapping/restoration, labeled inputs, inline validation, accessible status announcements, keyboard operation, and touch targets. Empty state explains the flow and offers creation; filtered-empty and load-error states remain distinct.

## 4. Authorization policy

Introduce a **feature-specific capability**, e.g. `canManagePaymentLinks(user)`: exact role is `super_admin`, `admin`, or `moderator`, and effective Payments page access is not NONE. Use it for creation, refresh, and unpaid-link cancellation. This deliberately permits the requested feature for the default VIEW moderator without expanding refund, capture, void, export, or unrelated editing privileges. Document this exception in permission tests and moderator-facing permission copy.

Respect explicit Payments NONE overrides. All three roles may view all payment links, matching the current global Payments list; record the creator and offer a creator filter. Use the same capability on backend mutations and frontend buttons; backend remains authoritative. A host, vendor, unauthenticated visitor, or any role merely inheriting unrelated permissions is denied. Refund operations continue to require existing `manage` permission. Avoid changing broad role matrices as a shortcut.

## 5. Data model and money

Create `halaa-backend/models/PaymentLinkModel.js` for the durable request:

- `_id`, unique human-readable `reference`, immutable `createdBy` plus creator display snapshot.
- `amountHalalas` as a positive safe integer; `currency` fixed to SAR.
- Client-visible description, optional internal client label, locale.
- Creation state: `creating`, `ready`, `creation_unknown`, `creation_failed`.
- Raw invoice status; normalized lifecycle and collection status; provider invoice ID and HTTPS hosted URL; environment (`test`/`live`) and provider identity.
- `expiresAt`, `paidAt`, `canceledAt`, timestamps; collection/refund totals in minor units; linked successful transaction ID(s).
- Durable creation key, canonical request hash, reconciliation lease/version, `lastSyncedAt`, `nextReconcileAt`, retry count, sanitized sync error.

Indexes: unique reference; unique partial provider invoice ID with environment where appropriate; unique `{createdBy, creationKey}`; `{createdAt:-1,_id:-1}`; status/creator with creation time for list queries; `{nextReconcileAt:1}` for workers. Add only indexes justified by query plans. No TTL deletion of financial requests.

Accept API `amountSar` as a normalized decimal string and convert by string parsing to integer halalas. Minimum is **1 SAR**, consistent with the current Create Invoice documentation. Upper limit must be a required server configuration validated against this merchant account's limits; return the configured constraints to the form, and reject values outside them on the server. Do not invent an unlimited range. Preserve exact integer values through the provider request. Keep existing major-unit adapter behavior backward-compatible by adding an explicit minor-unit argument or dedicated wrapper; never convert twice.

For actual provider payment attempts, reuse `PaymentModel` with explicit `paymentLinkId` and `metadata.purpose='admin_payment_link'`. Make `userId` optional **only for this new standalone kind**, with model/service invariants requiring a valid link; keep existing checkout ownership required. Never assign the staff creator as the payer or invent a placeholder user. Store creator on the request; no entitlement references on its payments.

Upsert verified attempts by provider payment ID; retain the unique index. Use integer arithmetic for link totals and convert to the existing Payment major-unit fields only at that boundary. Adapt admin list/detail/search/export labels to “Payment link / intended client label”; nullable owners must not cause crashes. Audit Payment hooks, notifications, host-self reads, privacy deletion/retention, refunds, and reporting before changing required ownership. Guest transactions cannot appear in a staff member's personal purchases or generate subscription notifications. Add a purpose guard to existing finalization/notification paths as needed. Do not store raw card payloads or provider tokens.

## 6. Provider integration and reliable creation

Use Moyasar's hosted invoice URL directly as the copied link. This keeps payment entry and authentication on the provider and avoids a new public Halaa checkout surface. V1 can use the hosted completion experience with no custom `success_url` or `back_url`; verify the actual paid/expired/canceled UX in sandbox. A Halaa receipt page is not necessary for the requested workflow.

Extend the existing invoice adapter with expiry, cancellation (`PUT /invoices/:id/cancel`) and metadata-filtered invoice lookup for recovery. Separate invoice `callback_url` (server notification) from `success_url` (browser redirect). Existing renewal callers must retain their behavior. Construct callback URLs from trusted backend configuration, not request Host headers. Validate returned hosted URLs against the verified Moyasar HTTPS host allowlist before exposing them.

Creation sequence:

1. Authorize and validate; require `Idempotency-Key`, stable for one UI submission and its retries.
2. Persist one creation intent and payload hash before provider I/O. Same actor/key and same input returns that same request; different input returns 409. Use a durable unique constraint and lease, not just disabled buttons.
3. One worker/request holds the creation lease and creates an invoice with server-stored amount, expiry, description and metadata containing `purpose=admin_payment_link`, local link ID and creation reference. No private client label or staff identity in provider metadata.
4. Validate and persist invoice ID/URL/status before returning a copyable link.
5. A definite provider rejection becomes `creation_failed`. Timeout, reset, 5xx, or a crash after dispatch becomes `creation_unknown`; do not automatically issue another create call.
6. Recover by listing invoices with the exact persisted metadata reference, paging as needed and checking amount, currency and environment. One match is adopted; multiple matches are flagged for operator resolution without publishing extra links. No matches on one poll do not prove remote failure. Keep checking with backoff; unresolved cases become an actionable admin error until the original operation is conclusively resolved.

Moyasar's documented `given_id` idempotency is for payment creation. Do not assume invoice creation supports it. Durable local creation plus recovery is required unless sandbox/provider evidence establishes a stronger supported invoice contract.

## 7. Status synchronization and races

Implement one `reconcilePaymentLink(id)` service called by callback, existing payment webhook dispatch, manual refresh, and the scheduled worker. Serialize per-link updates using a lease or compare-and-set; commit Payment upserts and link projections transactionally or via a recoverable idempotent sequence. Do not hold a Mongo transaction open while calling Moyasar.

The invoice callback documented by Moyasar posts an invoice object, unlike the application's existing event-envelope webhook. Add a dedicated callback route, e.g. `POST /api/v2/payment-links/provider-callback`, mounted outside authentication. Treat its payload only as a reconciliation hint. Bound body size and rate, validate invoice ID, find the known link, and fetch the invoice with the server's secret key. If creation is still unresolved, a fetched invoice may be correlated using its persisted metadata reference after all identity checks. Unknown invoices must not create arbitrary local records. Do not assume this callback includes `MOYASAR_WEBHOOK_SECRET`; verify its actual sandbox contract. An unsigned notification must never directly mark a request paid.

Extend the authenticated Moyasar webhook handler to recognize link invoices and payments via stored invoice ID or verified invoice membership **before** unknown-payment acknowledgement or subscription-renewal dispatch. Leave its authentication intact. Avoid permanently deduplicating mutable payment updates by only `{paymentId,eventType}`; use verified event IDs when available, or persist a durable reconciliation wakeup independent of payload state. Multiple partial refunds of the same payment must be reflected. Callback acknowledgement follows either completed reconciliation or a durable queued wakeup; do not acknowledge and lose work on a database error.

Reconciliation must verify invoice ID, local metadata reference/purpose, configured environment, SAR currency, exact requested amount, and every associated payment's invoice membership and successful amount. Fetch individual payment records when needed to verify settlement/refunds. Only confirmed paid/captured funds count as collected; authorization alone does not. Ambiguous or mismatched snapshots become “Needs review” with no automatic paid transition.

Store invoice lifecycle separately from collection outcome and derive badges:

| Verified condition | UI status/behavior |
| --- | --- |
| Ready invoice, no successful payment | Awaiting payment |
| Payment attempt is still initiated/authorized | Processing / Awaiting confirmation; never Paid |
| An attempt failed, invoice still payable | Awaiting payment; last failure in detail, same link may retry |
| Verified full payment | Paid, with provider paid time |
| Confirmed expired/canceled with no collected funds | Expired / Canceled |
| Some/all collected funds refunded | Partially refunded / Refunded; preserve original paid time |
| Provider failed/on_hold/voided or unfamiliar state | Explicit unavailable/review state; no Pay/Copy CTA until resolved |

Never allow an older failed attempt, delayed callback, local expiry clock, or cancellation response to overwrite a verified successful payment. Re-fetch current provider state under serialized reconciliation rather than trusting notification ordering. Keep raw provider state and reconcile evidence for investigation.

Cancellation requires a confirmation showing reference and amount. Fetch current state, cancel at the provider, then reconcile again. Only report canceled after provider confirmation. On timeout retain cancellation-pending/unknown and retry reconciliation. If the client paid concurrently, show Paid and reject cancellation; refund remains a separate privileged operation. Do not locally disable the record while leaving the copied provider URL payable. Amount and description are immutable after creation; a corrected request requires canceling the old invoice and explicitly creating a new one. A refunded request never becomes payable again automatically.

Register an invoice worker in existing scheduledTasks/cronLease infrastructure. Suggested cadence: every minute, batch 50 due links, concurrency 2 with rate-limit backoff and per-link next-run times. Use fair `nextReconcileAt` scheduling so old unresolved links do not starve new ones. Reconcile unpaid/unknown/cancel-pending links and perform a final provider check around expiry. Also schedule lower-frequency rechecks of settled links within the merchant's supported refund window, and use refund webhooks for prompt updates. Existing pending-Payment cron alone is insufficient. A mismatch, persistent creation uncertainty, duplicate successful transactions, or repeated sync failure must be visible to staff and operations. Record all actual transactions if duplicate collection occurs; flag excess collection and require existing authorized refund handling rather than hiding it.

## 8. API contract

All paths below use existing `/api/v2` conventions and response envelopes. Keep `/admin/payment-links` distinct from `/admin/payments/:id`.

| Endpoint | Contract |
| --- | --- |
| `GET /admin/payment-links/config` | Allowed expiry choices, min/max amount and caller capabilities; no secrets. |
| `POST /admin/payment-links` | `{amountSar,description?,clientLabel?,expiresInDays,locale}` plus idempotency key. 201 ready request; 202 saved creating/unknown request with ID; 409 key/input conflict. |
| `GET /admin/payment-links` | Validated pagination, search, status, creator, from/to; local rows, filter-scoped summary and pagination. |
| `GET /admin/payment-links/:id` | Sanitized request detail and associated transaction summaries. |
| `POST /admin/payment-links/:id/refresh` | Coalesced, cooldown-limited reconciliation; 200 current result or 202 queued. |
| `POST /admin/payment-links/:id/cancel` | Feature capability, idempotency key and cancellation state guards. |
| `POST /payment-links/provider-callback` | Public provider notification hint; no financial detail in response. |

Do not expose a public list/detail endpoint. The payer uses the hosted provider link. Admin responses must use explicit DTOs: internal idempotency data, credentials, raw snapshots and private operational errors do not leave the backend. Standardize 400 validation, 401 unauthenticated, 403 forbidden, 404 unknown record, 409 state conflict and 429 throttling. Add OpenAPI and shared API paths. CSRF/origin protection and credential behavior must follow the existing admin mutation setup.

## 9. Implementation sequence

1. **Verify provider contract in sandbox.** Confirm this merchant can use invoices, configured min/max, hosted AR/EN behavior, available payment methods, final hosted screens, invoice metadata filtering, callback payload/authentication, failed-attempt retry behavior, cancellation and payment/refund event payloads. Use merchant-approved test credentials and test mode. Record redacted fixtures; do not transact live money during implementation.
2. **Models and provider adapter.** Add PaymentLink, durable creation recovery, monetary validation, provider expiry/cancel/list methods and guest Payment invariants. Create migration/index scripts where necessary. Keep adapters backward compatible.
3. **Backend API and authorization.** Add `src/modules/payment-links/` model-facing service, controllers, validation, admin/public routes; mount admin routes in `src/modules/admin/admin.routes.js` and callback in the app's existing v2 router. Add feature capability and DTOs. Test before UI work.
4. **Synchronization.** Implement common reconciler, callback routing, webhook dispatch, worker lease/fair scheduling, cancellation races and guest notification guards. Existing subscription renewal must have regression coverage.
5. **Admin web.** Add the nested tab page, shared tabs, create/result dialog, list and details. Extend `hooks/admin`, shared paths, filter normalizer and both `localization/locales/{ar,en}/adminPayments.json`. Adapt existing transaction display/export for guest payments and preserve current filters/refund access.
6. **Verification and release.** Run targeted backend integration/runtime tests, relevant existing billing/admin tests, web runtime tests, lint and production build. Visually exercise Arabic/English desktop and narrow mobile layouts. Document results, fixture behavior, configuration and any remaining provider limitation.

Suggested new test files: backend `test/payment-links.integration.test.js`, `test/payment-links-reconciliation.test.js`, `test/payment-links-provider.test.js`; web `__tests__/runtime/adminPaymentLinksRuntime.test.mjs`. Use the current test harness and real Mongo integration where uniqueness/concurrency/transactions matter.

## 10. Required acceptance tests

- Each requested role creates, copies, refreshes, and cancels unpaid links; Payments NONE, host/vendor, and unauthenticated access are denied. A default moderator still cannot refund/capture/void or gain unrelated payment mutation privileges.
- `250`, `250.5`, `250.50`, and equivalent Arabic input charge exactly 25,000/25,050 halalas as appropriate. Zero, negative, below 1 SAR, more than two decimals, non-SAR, overflow, exponent notation and over-configured-limit amounts fail before provider I/O.
- Double click, simultaneous same-key requests, page reload and retry yield one durable intent and one published invoice; changed input with same key returns conflict.
- Inject timeout after remote creation and crash before local persistence. Recover the original invoice by metadata without a second create request; an unresolved operation stays explicitly uncertain.
- Client opens the copied link signed out of Halaa, pays the exact amount, and sees provider completion. Admin becomes Paid even if the client closes the browser without returning anywhere.
- Verify actual failed-attempt-then-success, initiated/authorized states, duplicate and out-of-order notifications, forged callbacks, amount/currency/environment mismatch and unknown invoice/payment IDs.
- Drop callbacks/webhooks: scheduled reconciliation repairs state. Exhaust one batch and verify fair progress. Provider 429/outage does not mark unpaid, lose verified paid status or hammer requests from each row poll.
- Payment/cancel and payment/expiry races resolve to authoritative collected-fund state. Canceled/expired copied URLs cannot start a fresh payment. Already paid or refunded links do not collect again.
- Multiple partial refunds, full refund, and dashboard-originated provider refunds update details/net collected exactly once. Transaction creation/notification hooks do not grant entitlements or message the creator as payer.
- One successful request appears once in transaction totals, never once per callback. Requested amounts do not count as revenue. Existing host, checkout, addon, business checkout, renewal, RevenueCat and refund behavior remain intact.
- Clipboard denied, create error, 202 creation state, refresh error, empty/filter-empty states, stale data and revoked permissions have useful UI states.
- AR/EN, RTL/LTR URLs, keyboard focus, screen-reader labels, 360–390px phones and desktop pass browser checks. SSR hydration and URL filter/back-navigation behavior remain stable.

## 11. Release and operations

Add a feature flag that gates admin creation/UI but leaves reconciliation and callbacks functioning for existing links. Configure the allowed amount maximum, expiry choices, trusted callback base URL, hosted URL allowlist and reconciliation limits. Keep API keys server-side. Deploy schema/index/backend compatibility before UI; enable only after sandbox evidence and production merchant invoice capability are confirmed.

Instrument created/ready/unknown intents, provider failures, last successful sync age, unresolved mismatches, cancellation uncertainty and duplicate collection. Audit create/cancel/status transitions with actor and request IDs, without logging full share URLs, provider secrets, callback payloads or card data. Register collection retention and guest-data handling with the existing privacy operation conventions; do not invent a new retention duration.

Rollback disables new creation and hides its entry points while keeping records, callbacks, workers and administrative status access available for already shared links. Do not delete records or orphan live provider invoices. Production smoke verification should use an approved process; this plan does not authorize a live charge.

## 12. Official provider references

- [Creating invoices](https://docs.moyasar.com/guides/invoices/creating-invoices): hosted links, expiry and notification workflow.
- [Create Invoice](https://docs.moyasar.com/api/invoices/01-create-invoice): minimum 100 minor units, request/response and distinction between callback and browser return.
- [Fetch Invoice](https://docs.moyasar.com/api/invoices/04-show-invoice): authoritative invoice and associated payment attempts.
- [List Invoices](https://docs.moyasar.com/api/invoices/03-list-invoice): metadata filters for recovering uncertain creation.
- [Cancel invoice](https://docs.moyasar.com/api/invoices/06-cancel-invoice): provider-side cancellation.
- [Idempotency](https://docs.moyasar.com/api/idempotency): payment `given_id`; invoice support must not be inferred from it.

The next agent should implement this specification, first resolving the sandbox/provider checks, and report changed files, tests, visual evidence and remaining operational requirements. Do not declare the feature complete solely because a URL can be generated: payment recognition, recovery, guest accounting and permission behavior are part of the feature.
