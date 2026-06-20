# Business Account — Feature Plan (post-removal phases)

**Status:** Spec / future · **Rev 4** (2026-06-20) — folds in Codex reviews #2+#3 + [round2-](round2-codex-verification.md)/[round3-codex-verification.md](round3-codex-verification.md) + owner decisions.
**Depends on:** [whitelabel removal](../whitelabel-removal/FINAL_MIGRATION_PLAN.md) complete; **invite-accounting rework already merged** (commit `b0f28680`, `docs/invites-plans-rework/PLAN.md` — consume-on-send, unified invite pool, refund clawback). The only invite-side gaps left for this feature are the **cron subscription re-check** and **upgrade/renewal behaviour**, folded in below.

## Core model
`role:'host'` + `accountType:'business'` (NOT a new role). Inherits host authorization; never reintroduces `whitelabelId`/tenancy.

## Six cross-cutting principles
1. **Segregate by accountType** (shared `personalHostFilter()`/`businessHostFilter()`/`allCustomerHostsFilter()`; 12 sites in `admin.hosts.service.js`, 5 in `dashboard.service.js`; IDOR tests both ways). [#14]
2. **Explicit serialization** — `toPublicJSON` does `delete obj.profile` (`UserModel.js:783`); a business DTO must surface `businessData` on login/refresh/`/me`/admin/auth-store. [#6]
3. **Server-owned, snapshotted state** — branding (logo **key** + business name), price/fee/currency, delivery mode + template id/version are all snapshotted at creation, never read live, never client-submitted. [#9 #10 #22 #23 #24]
4. **Authoritative server money** — a server **quote** with **durable line items** is the source of truth; setup fee added **after** discount; refunds allocate against line-item IDs. Money stays **SAR major-unit `Number`** (consistent with the whole payment system) with explicit 2-dp rounding + discount-allocation rules. [#3 #4 #14 #21]
5. **Durable assignment + entitlement state machines** — the "checkout link" and the setup fee are persisted records with compare-and-set transitions, not a URL + a boolean. [#1 #2 #5]
6. **One centralized dispatch-policy gate** — every send path (initial/retry/resend/reminder/cron) consults a single guard, not ad-hoc per-endpoint checks. [#11]

## Locked owner decisions
- Model `role:host`+`accountType:'business'`; **mobile full parity**.
- **Plan ownership:** admin assigns the initial plan (no-sub businesses are **admin-assigned only** — no self-purchase); once active, the business may **self-upgrade among business plans, immediately, with proration + invite-pool carryover**. (Resolves the rev-3 hybrid contradiction. [#6])
- **Assignment delivery:** mode A = direct grant (no payment; setup waived; audited); mode B = WhatsApp checkout link (+ SMS fallback) → hosted summary (plan + setup fee).
- **Setup fee: once per account; settles on the FIRST activation of ANY business plan** (a zero-fee quarterly/annual or a grant settles it permanently → a later event plan is never charged). Amount = the activating plan's `setupFeeAmount` (event=1200, q/a=0). Not discountable. [#2 #5]
- **Identity:** reject duplicate email/phone (no conversion v1). [#15]
- **Branding:** logo + business name snapshotted (immutable); no colors (global tokens); "message" = `event.eventDetails.description`. [#16 terminology + #15-branding]
- **RBAC:** super_admin/admin manage Businesses; **moderators none** (locked).
- **Password:** admin-set in popup + **server-enforced `mustChangePassword`** on first login.

## Branding + invite-page model (minimal, immutable, server-owned)
- **Profile:** `accountType:'business'` + `avatar` (logo S3 key) + `profile.businessData.description`. No colors/website.
- **Event snapshot:** `event.branding = { logoKey, businessName }` (logo copied to an event-owned immutable key; business **name** snapshotted too so a later rename doesn't change old invitations [#15-name]) + `event.invitationDeliveryMode` + `event.invitationTemplate = { id, version }`.
- **Public DTO:** `_formatEventForGuest` → **async**, signs `logoKey` (~1h), returns `branding:{ logoUrl, businessName }` + `description`. No internal fields.
- **Invite page (web+mobile):** logo + business name + title + description + RSVP (3 buttons + "+1" + message). Global tokens.

## Hard prerequisites
1. Whitelabel removal merged + verified.
2. Web RSVP-submit fix + mobile +1/message parity — done 2026-06-20 (**uncommitted**; commit + live-test before B5).
3. **Fix existing bug** `checkout.service.js:511` (`user` ReferenceError in `_fulfillBundle`) before B2B builds on checkout.

---

## Phases (reordered per Codex — schema before payment state)

### B0 — Lock schema, policy, money & contracts (no code)
- **Account schema:** `accountType ∈ ['personal','business', null]` default `null`; required `personal|business` when `role==='host'`; admin-controlled + immutable via normal profile endpoints; index `{role,accountType,status}`. **Fail-closed for `null`** [#13]: every host create/import/seed sets `personal`; a startup/static assertion + a test forbid `{role:'host', accountType:null}`; monitoring alert on any; scope helpers **never** treat `null` as personal. Identity prechecks are backed by **DB uniqueness** (two concurrent creates can both pass a service check).
- **Money** [#14]: SAR major-unit `Number` everywhere (decided); define rounding (2-dp), tax inclusion, and discount-allocation rules once, centrally.
- **Setup-fee semantics** [#2 #5]: settle-on-first-activation (above); a grant waiver settles permanently; a zero-fee first plan settles permanently; refund of a setup fee re-opens eligibility **only** in the paid-but-activation-failed case (no setup delivered); **non-refundable after successful activation**.
- **Refund rules (line-item aware)** [#3]: customer-after-activation / paid-but-activation-failed (full incl. setup) / admin-cancel / fraud-duplicate / partial-plan — each allocates against line-item IDs.
- **Upgrade rules** [#7]: immediate + prorated — define proration formula (daily on plan price → credit), **invite-pool carryover** (carry remaining base+compensation invites per the merged pool model; a per-event plan with `invitesConsumed>0` is "used" but is being replaced, so carry its remaining pool to the new subscription), old-subscription cancellation, per-event↔quarterly/annual both directions, add-on carryover, and the **concurrent admin-grant-vs-self-checkout** guard (the assignment state machine + the one-actionable-assignment unique index).
- **Identity/conversion:** reject duplicates; `findOrCreateHost` handles the conflict explicitly (don't silently filter `accountType:'personal'`, miss a business, then ConflictError).
- **RBAC:** `ADMIN_PAGES.BUSINESSES` + matrices + nav + route protection; moderators none.
- **Canonical URL** [#26]: one `FRONTEND_URL` config for WhatsApp buttons / SMS / web route / mobile universal links (reconcile `halaa.sa` backend fallback vs `halaa.com.sa`).
- **Checkout-token contract** [security]: ≥256-bit random; store **hash + unique index**; rate-limit by IP **and** token; **consumed on successful checkout submission, not on page view**; CSRF/replay handling; **no sensitive business data on the public summary page**; rotation + revocation semantics.
- **Template contract:** `deliveryMode` rule is **deterministic** — personal event → `quick_reply`, business event → `portal_link` (no per-business choice v1); snapshot the provider template **id/version/capability** on the event; **centralize message construction in ONE formatter** (don't patch every send impl). Approve both Meta templates (`business_checkout`, invite link) now — longest lead time.
- **Plan cleanup:** moderator access = none (locked, no longer "open"); setup-fee storage = a dedicated entitlement record (B2A), decided here.

### B1 — Rename `availableFor:'whitelabel'`→`'business'` (~13 files) + dev reset/reseed
(Right after whitelabel removal + DB reset; no live data.)

### B2A — Account model, DTO, scope helpers, lifecycle guard (before any payment code)
- `accountType` + `profile.businessData.description`; **initialize BOTH** `hostData.{profileCompleted:true}` and `businessData` at admin creation [#8]; index [#5].
- **Serialization DTO** [#6]: surface `businessData` when business; update login/refresh/`/me`/admin list+detail/web+mobile auth-store; expose `mustChangePassword`.
- **`mustChangePassword` enforcement** [security]: server-side gate — until changed, allow only `/me`, change-password, logout/refresh (a frontend prompt is bypassable).
- **Scope helpers** [#14] applied to the 12+5 sites; **IDOR tests**.
- **Reporting/targeting** [#16]: add `totalPersonalHosts`/`totalBusinesses`/`totalCustomerAccounts`/recent/revenue; daily reports + notification broadcasts gain account-type grouping/targeting.
- **Lifecycle** [#12]: suspend (revoke sessions + checkout links, pause sends, preserve data/sub) / soft-delete (revoke links/sessions, cancel future sends, retain financial+event history) / reactivate (don't auto-revive expired links). Define impact on pending links, active sub, scheduled events, pending reminders, refresh tokens/sessions, add-ons, setup-fee entitlement, existing RSVP links.

### B2B — Assignment + payment + entitlement state machines
- **`BusinessPlanAssignment`** [#1 #2]: fields `{ businessUserId, planId, mode:'grant'|'checkout', status, version (optimistic lock), failureCode, planPriceSnapshot, setupFeeSnapshot, currency, lineItems (immutable), tokenHash, expiresAt, usedAt, supersededBy, createdBy, paymentId, subscriptionId, completedAt, deliveryAttempts[] }`.
  - **States:** `pending_payment → payment_processing → paid → active`; off-happy: `paid → activation_failed → refund_pending → refunded`, `payment_processing → failed`, `pending_payment → expired` (cron, **retained — never TTL-deleted**, financial/audit), `pending_payment|payment_processing → cancelled`, `pending_payment → superseded`. Mode A grant → `active` directly. **`paid` ≠ `active`** (a paid-but-not-activated assignment is `activation_failed`, not ambiguously `failed`).
  - **Compare-and-set transitions** on `version` so webhook + browser callback + reconciliation can never activate twice. [#2]
  - **Supersede rules** [#3-of-review]: only `pending_payment` may be superseded; an in-flight `payment_processing`/`paid` must NOT be cancelled by a new assignment. Enforce a **partial unique index** = one *actionable* assignment per business (`status ∈ {pending_payment, payment_processing, paid}`).
- **`Payment.lineItems[]`** [#4]: `{ id, type:'plan'|'setup_fee'|'addon'|'discount'|'tax', referenceId, quantity, unitAmount, subtotal, discountAllocation, taxAmount, total, refundableAmount, refundedAmount }`. Refunds carry `allocations[]:{ lineItemId, amount }`. (Existing `refunds[]` already has `amount/reason/deductInvites` — extend it; it is NOT yet a line-item ledger.)
- **Setup-fee entitlement record** [#5]: dedicated, **unique per business** (replace/extend `BusinessSetupFeeModel`, which is only `pending|paid` + non-unique). Status: `not_applicable | waived | pending | processing | paid | refund_pending | refunded | failed`, with `settled` flag + `paymentId`/`assignmentId`/`lineItemId`/audit refs. Settle-on-first-activation rule wired here.
- **Server quote** [#21]: `{ lineItems[], plan, addons, discount, setupFee, tax, total, currency, quoteExpiresAt }`; `discountable = plan+addons`; `total = discountable − discount + setupFee` (fee not discounted). Frontend never recomputes; snapshot at assignment; quote expiry; plan edits don't mutate an issued link.
- **Payment finalization:** idempotent webhook+callback (compare-and-set); paid-but-activation-failed → `refund_pending` → refund incl. setup line; reconcile.
- **Direct-grant semantics** [#13]: grantedBy, reason, nominal price, setup=`waived`, start/end, prior-sub cancellation, audit; distinguishable from paid.
- **Link delivery** [#20]: `business_checkout` WhatsApp template (model on `events.staff.service.js:258+`) + SMS fallback + admin copy button; record `deliveryAttempts`.

### B3 — Admin Businesses page + checkout-link operations (web; mobile-admin optional)
Full-management `admin-dash/businesses` (list/add/edit/assign-plan A·B/suspend·activate/delete). Full plumbing: shared `api/paths`, web admin keys/queries/mutations/index, **backend CommonJS zod schemas IN the backend validation module AND shared schemas for forms** [#18], controller/service barrels + route mount, `providers` namespace, `adminBusinesses.json` (en+ar), cache invalidation. **Logo upload** = multipart `POST /admin/businesses` or `PATCH /admin/businesses/:id/logo` (NOT self `/users/profile`); MIME/size/dimension validation + old-image cleanup [#9]. **Checkout-link UI states:** pending/payment-pending/expired/active/failed/waived + regenerate/revoke + copy button [#20]. Clean `entityType:'business'` subscription-assignment variant. Plural naming `/admin/businesses`.

### B4 — Business-user dashboard, settings, plans, upgrade, no-sub UX (web + mobile)
- **Routing** [#27]: no change (business is `role:host`); work is in plans/settings/gating/auth-store `accountType`.
- **Settings** [#7]: edit description + logo (web+mobile forms + backend `businessData` validation/authz/service + logo update-delete + cache + auth-store).
- **Plans + self-upgrade** [#4 #7]: business plans (`useBusinessPlans`/`/plans/business`); **SSR fix** `host/plans/page.js:15` branch on `accountType`; business variant of `usePlansPageState`; immediate+prorated self-upgrade per the B0 rules (proration/credit, invite carryover, old-sub cancel) gated by the assignment state machine.
- **Mobile business plans** [#28]: real new screen/state (list, assigned-plan, checkout-link open, payment return/deep-link, current sub, setup-fee summary, pending/failed).
- **No-sub UX** [#29]: create-event is already subscription-gated → no-sub = can't create. Banner ("activate a plan"), create-event nav disabled, pending-checkout status, contact-admin; **no self-purchase before activation** (admin-assigned only until active).
- **Checkout-link page:** hosted summary (plan + setup fee) from the B2B quote; consumes token on submit, not view.

### B5 — Event delivery-mode + immutable snapshots + provider template + cron gating
- **Branding snapshot (server-owned, with failure semantics)** [#9 #10 #S3]: pre-generate `event._id`; **copy the logo to a versioned event-owned key BEFORE committing the event**; reject creation if the copy fails; delete the copied object if event/guest creation fails; content-type/extension handling; retention/cleanup after soft-delete; **upload/swap/delete-after-grace** to avoid the race where live-logo replacement deletes the source mid-copy. Snapshot `businessName` too. `_formatEventForGuest` async-signs on read. Cover self-created AND admin-created; updates don't silently replace.
- **Delivery mode + template snapshot** [#23 #24]: `event.invitationDeliveryMode` + `event.invitationTemplate{id,version}` set at creation (owner `accountType` not populated on send paths); send branches on the snapshot via the single formatter.
- **All send paths** [#25]: one formatter applied to `sendToGuest`, bulk/launch, test message, retry (`events.resend.service`), resend, scheduled (`messaging.reminder.service`+cron), SMS fallback. Post-event/staff links stay separate.
- **Centralized dispatch-policy gate** [#11 #dispatch]: ONE service checked before every send (user active/not-deleted, correct subscription owner, subscription active/unexpired, event non-terminal, assignment/subscription not under refund, invite availability). Wire into initial/retry/resend/reminder/cron (`scheduledTasks.js:171→:300` currently skips it).
- **Canonical URL** [#26]: single config everywhere; test cold/warm/not-installed app, ar/en, expired/invalid codes.

### B6 — Verification
Concurrent checkout submissions; callback/webhook race (no double-activate); expired/revoked/superseded links; admin changes plan after link; mode A then B; quarterly/annual (0) + settle-on-first-activation; **immediate+prorated upgrade** (credit + invite carryover + old-sub cancel + per-event↔q/a both ways + concurrent grant-vs-checkout); full+partial refunds with line-item allocation; paid-but-activation-failed; suspend before scheduled launch; cron subscription-lapse gate; logo replacement doesn't break old events + signed-URL expiry/regen + copy-fail rollback; business-name rename doesn't change old invites; personal/business IDOR; `{role:host,accountType:null}` fail-closed; duplicate email/phone reject; business serialization + `mustChangePassword` enforcement; admin RBAC; reporting/targeting; residual `availableFor:'whitelabel'` zero-match; personal-host regression.

---

## Corrected/overstated Codex points (record)
- Per-line refunds exist only as a *pattern* (addon clawback + `deductInvites`); there is **no money line-item ledger** yet — B2B adds it.
- `getEventTargets` inverts under the pivot (auto-includes business; the work is labelling).
- Invite-accounting (#8) is **largely merged** (`b0f28680`); only cron-sub-check + upgrade behaviour remain (folded into B5/B0).
- `createHost` throws a service `ConflictError`, not a raw dup-key.

## Open sub-items
1. Event-target selector: combined list + account-type badge (assumed) vs separate tab.
2. Whether admins manage businesses on **mobile** (business *users* on mobile are in scope).

---

## Implementation status (Rev 5 — 2026-06-20)

Implemented end-to-end on branch `claude/business-account-plan-impl-6qqexv`.

**B1 — availability rename** ✅ `whitelabel`→`business` across `PLAN_AVAILABILITY`,
planDefaults, `PlanModel` enum, `plans.service` query, swagger, shared zod enum.
Idempotent migration `scripts/migrate-plan-availability-whitelabel-to-business.js`.
Prereq bug fixed: `checkout.service` `_fulfillBundle` `user` ReferenceError.

**B2A — account model** ✅ `accountType` (fail-closed host validator) +
`mustChangePassword` + `profile.businessData` + `{role,accountType,status}` index on
`UserModel`. `toPublicJSON`/admin `formatUserResponse` surface businessData/accountType/
mustChangePassword. Central `accountScope` helpers applied to admin.hosts (12) +
dashboard host counts (segregated) + business reporting counts/stat card. All host
creates set accountType. Server-enforced mustChangePassword gate in `protect` (+self-
service allowlist; cleared on password change). `ADMIN_PAGES.BUSINESSES` RBAC. Startup
fail-closed assertion + `scripts/migrate-host-account-type-backfill.js`.

**B2B — state machines** ✅ `BusinessPlanAssignment` model (full status machine,
compare-and-set `transition()`, partial unique index = one actionable per business,
hashed token). `Payment.lineItems[]` + refund `allocations[]`. `BusinessSetupFee`
entitlement (unique-per-business, settle-on-first-activation). `money` util (round2 +
proportional discount allocation; fee after discount). `business` module: setupFee,
quote, and assignment services (grant A + checkout B, idempotent activation, invite-pool
carryover, paid-but-activation-failed refund, revoke/regenerate/expire-stale). Payment
finalization routes `business_checkout` → idempotent activation. Canonical URL config.

**B3 — admin Businesses** ✅ backend: `admin.businesses` service/controller/routes
(list/detail/create+logo/update/logo-replace/assign-plan A·B/revoke·regenerate/suspend·
activate·delete), zod schemas, barrels + mount; public `/business/checkout/:token`
summary+submit; `business_checkout` WhatsApp+SMS delivery. Web: api/paths + admin query
keys/queries/mutations. **Page UI + i18n: delivered via UI build (see B3/B4 frontend
commits).**

**B5 — event delivery** ✅ Event `branding{logoKey,businessName}` +
`invitationDeliveryMode` (deterministic) + `invitationTemplate{id,version,provider}`
snapshot; `createEvent` copies the logo to an event-owned immutable S3 key (rollback on
fail) + snapshots name (covers self- AND admin-created via `createEventForHost`→
`createEvent`); `_formatEventForGuest` async-signs branding; centralized **dispatch-policy
gate** wired into cron **launch + retry + guest-reminder** paths (HTTP sends already carry
`requireSubscription`); hourly cron expires stale links. **Follow-up (gated on B0
Meta-template approval):** the guest WhatsApp send still resolves the host-selected
template; deterministic `portal_link`-vs-`quick_reply` template *selection* off the
snapshot should be flipped on once both approved provider templates exist. The branded
invite *page* (the main visible business value) is fully delivered.

**B4 — business dashboard (web + mobile)** — frontend UI (plans/self-upgrade/settings/
no-sub/hosted-checkout page + mobile parity) delivered via the frontend build.

**B6 — verification** — unit tests for money rules + account-scope fail-closed
(`test/business-money.test.js`, `test/account-scope.test.js`, 9 passing). DB-integration
tests require an environment with deps installed (`link:../shared` workspace).

**Operator runbook (deploy order):** run both migrations with `--apply`
(plan-availability + host-accountType backfill), reseed plans if needed, approve the two
Meta templates (`business_checkout`, invite link), set `FRONTEND_URL`,
`WA_BUSINESS_CHECKOUT_TEMPLATE`/`_LANG`.
