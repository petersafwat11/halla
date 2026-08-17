# subscriptions — Full-Stack Review Plan (REWRITTEN after deep audit)

**Module:** subscriptions
**Generated:** 2026-05-07 · **Re-audited & rewritten:** 2026-05-08
**Prompt:** docs/implementation/MODULE_FULLSTACK_REVIEW_PROMPT.md
**Status:** Decisions LOCKED · Ready to implement

> **Why this was rewritten.** The original plan (2026-05-07) was written before commits `2381e52 feat(web): bundled checkout flow` and `38cc284 feat(mobile): bundled checkout flow` landed (same day). The codebase migrated host self-subscribe from `POST /subscriptions/subscribe` to a new bundled `POST /payments/checkout` endpoint. That changed the plan's premise. ~50% of the original Phase-2 items are no longer applicable (file-size violations gone, fallback chains gone, hardcoded i18n gone, return-page stub gone, filename typos gone). What remains is bigger, not smaller: a large portion of the `subscriptions` module is now **dead** and should be deleted, not patched.

---

## 0. Locked Decisions

| # | Question | User answer | Final lock (after audit) |
|---|----------|-------------|--------------------------|
| 1 | Validation library | Zod | **Zod via `validateZod(schema, source='body')`** from `shared/middleware/validation.js:401`. Joi is forbidden. |
| 2 | Delete the 4 unused endpoints | Delete | **Delete 8 endpoints, not 4.** Audit found `subscribe`, `change-plan`, `cancel`, `validate-limits` are also dead now. Keep only `my-subscription`, `admin/assign`, `payments`, `payments/export`. |
| 3 | `packageService.js` (web) — A or B | Verify unused first | **Confirmed zero consumers across `D:\halla\labbe\`. DELETE the file outright.** Plan's claim that `services/createAndUpdateEvents.js` consumes it was wrong — that file does not exist on web. |
| 4 | Mobile `useUpgradeSubscription` / `useCancelSubscription` | Delete | **Confirmed zero consumers. Delete both hooks AND the underlying `subscriptionService.upgrade` / `cancel` / `validateLimits` / `getLimits` methods.** |
| 5 | Mobile `subscriptionStore.js` | Delete | **Confirmed zero consumers (only the file itself references its own `useSubscriptionStore`). Delete the file entirely.** |
| 6 | Locale keys | Add all needed | **Confirmed list in §8. Web `Summary.js` already uses `t()` (audit corrected the original plan); only the deletion-related keys + a small adminDashboard set are still needed.** |
| 7 | 3DS flow — confirm from code | Confirm | **Confirmed:** backend `GET /payments/:id/poll` (`payments.controller.js:14-24` → `payments.routes.js:163`). Web hook `usePoll3DS` already wired in `app/[lang]/host/payments/return/_components/PaymentReturnClient.jsx`. Mobile uses `Linking.openURL(redirectUrl)` in `useCheckout.js:62` + `screens/host/PaymentReturnScreen.js`. **Both platforms already implement 3DS** via the checkout path; the only gap is the dead `/subscriptions/subscribe` legacy path which is being deleted. |
| 8 | Bundle vs split PRs | Don't split | **One PR, sequenced internally** (backend → web migrations → mobile migrations → final dead-code purge). |

**Standing user constraints applied throughout this rewrite:**
- Web and mobile **must be identical** in API surface, request/response shape, and behavior.
- **No dead code.** No backward-compat shims.
- Anything unused gets deleted, not preserved.

---

## 1. Executive Summary (corrected)

- **12** subscription endpoints exist today (mounted at `/api/v2/subscriptions`).
- **After this PR: 4 endpoints remain**, 8 are deleted. 67% endpoint reduction.
- **`subscriptions.service.js` is 1386 lines** (cap 600). After deleting the dead methods (`subscribe`, `finalizePending3ds`, `assignSubscription` stays for `/admin/assign` only, `changePlan`, `cancelSubscription`, `validateLimits`, `getPackageLimits`, `canAccessFeature`, `getAvailablePlans`, `getPlanByCode`, `_recordPendingRefund`, `_formatPlan`, `_getPackageLimits`, `incrementUsage`, `validateGuestLimit`, `validateModeratorLimit`, plus all helpers solely used by the deleted methods), the file shrinks dramatically — likely to ≤ 600 lines without any split. **Re-measure after deletions; only split if still over cap.**
- **Service `subscriptions.service.js` has 3 external callers** (audit corrected the plan's "5"):
  - `events.crud.service.js:34` calls `validateEventCreation()`
  - `payments.service.js:105` calls `finalizePending3ds()` → moves to checkout flow; verify whether subscriptions still owns this method or it migrates to `payments/checkout.service.js` (see §2.4).
  - `scheduledTasks.js:1190` calls `renewSubscription()` (KEEP).
- **NO `subscriptions.validation.js` file** — confirmed absent. Build it with **Zod schemas** for the 1 endpoint that still accepts a body (`/admin/assign`).
- **No file-size violations on web or mobile** for the subscription-touching files. Audit confirmed:
  - Web `PlansPage.js` 154, `Summary.js` 177, `AddonsSection.jsx` 189 — all under cap.
  - Mobile `HostPlanCard.js` 195, `AddonsSection.js` 338, `CurrentPlanCard.js` 282 — all under cap. Files `AddionalFeatures.js`, `PaymentSummery.js`, `PlansOverview.js` listed in the original plan **do not exist**.
- **Web `Summary.js` already uses `t()` throughout** (zero `isArabic` literals). Original plan was wrong.
- **Web 3DS return page is fully implemented** at `app/[lang]/host/payments/return/page.js` + `_components/PaymentReturnClient.jsx`. Original plan was wrong.
- **`packageService.js` is 100% unused on web** (zero importers). Delete entirely.
- **`subscriptionStore.js` is 100% unused on mobile**. Delete entirely.
- **`useUpgradeSubscription`, `useCancelSubscription` (mobile) zero consumers.** Delete.
- **`useValidateLimits`, `useSubscriptionMutation` "upgrade"/"cancel" branches (web) zero consumers.** Delete.
- **`subscriptionService.subscribe` (web) has 1 consumer** (`admin-dash/plans/page.js:56`). Migrate to `useCheckout`, then delete the service file.
- **`useSubscribe` (mobile) has 1 consumer** (`WhitelabelPlansSummaryScreen.js:27`). Migrate to `useCheckout`, then delete.
- Backend service has **14 console.* sites** (confirmed — file:lines listed in §2.6).
- Backend service has **1 bare `throw new Error`** at line 346.
- Backend service has **40+ comment markers** (`FLOW-`, `PHASE-`, `HIGH-`, `B-3`, `H-5`, `MED-8`, `FIX Bug 3`) — listed in §2.7.
- Mobile service has **1 marker**: `Phase 4 W0-AUTH:` at `subscriptionService.js:4`.
- Web has **1 stray `console.error`** at `app/[lang]/host/plans/page.js:30`.
- Web has **1 fallback chain** at `admin-dash/plans/page.js:36-37` (going away with the migration in §3.B.1).
- Mobile has **dead substring-match error branches** at `WhitelabelPlansSummaryScreen.js:100-106` (going away with the migration in §3.C.1).
- Estimated effort: **M (medium)** — most of the work is deletion. The two migrations (web admin-dash plans → useCheckout, mobile WhitelabelPlansSummaryScreen → useCheckout) plus Zod validation file plus comment-hygiene + console-replacement pass.

---

## 2. Backend Findings

### 2.1 Endpoint inventory & disposition

| # | Method | Path | Disposition | Reason |
|---|--------|------|-------------|--------|
| 1 | GET  | /subscriptions/my-subscription | **KEEP** | Core read; consumed on web (`useMySubscription`) and mobile (`useSubscription` in `hooks/queries/useUser.js`). |
| 2 | POST | /subscriptions/subscribe | **DELETE** | Superseded by `POST /payments/checkout` (bundled flow with addons + 3DS). Migrate the 2 remaining callers (web `admin-dash/plans/page.js`, mobile `WhitelabelPlansSummaryScreen.js`). |
| 3 | POST | /subscriptions/admin/assign | **KEEP** | Distinct flow: SUPER_ADMIN grants a sub without payment. Already has `restrictTo`, `idempotency`, `auditLog`. |
| 4 | POST | /subscriptions/change-plan | **DELETE** | Zero real consumers (web `useSubscriptionMutation("upgrade")` is unused; mobile `useUpgradeSubscription` is unused). Plan switching now flows through `/payments/checkout` (which handles cancel-old + activate-new in one transaction). |
| 5 | POST | /subscriptions/cancel | **DELETE** | Zero real consumers. Self-cancel UI does not exist on either platform; if added later, do it via a new endpoint with a clean spec. |
| 6 | POST | /subscriptions/validate-limits | **DELETE** | Zero real consumers (web `useValidateLimits` defined but unused; web `packageService.js` defines wrappers but no caller; mobile method exists but no caller). Limits are read from `getMySubscription().data.summary`. |
| 7 | GET  | /subscriptions/limits | **DELETE** | Zero consumers, duplicates `getMySubscription().summary`. |
| 8 | GET  | /subscriptions/features/:featureName | **DELETE** | Zero consumers, duplicates `getMySubscription().features` client-side gating. |
| 9 | GET  | /subscriptions/plans | **DELETE** | Duplicates `GET /plans/host`. |
| 10 | GET  | /subscriptions/plans/:code | **DELETE** | Duplicates `GET /plans/code/:code`. |
| 11 | GET  | /subscriptions/payments | **KEEP** | Web `useMyPayments` consumer; mobile gets a new consumer in §4. |
| 12 | GET  | /subscriptions/payments/export | **KEEP** | Web `useAdminPaymentsExport` references it (`hooks/reactQueryHooks/usePayments.js:68`). Verify consumer at implementation time. |

**After this PR**, `subscriptions.routes.js` has 4 routes only.

### 2.2 Service file split decision

**Plan changed.** Original plan proposed splitting `subscriptions.service.js` (1386 lines) into 4 sub-services. After deleting the methods backing endpoints #2/#4/#5/#6/#7/#8/#9/#10, the file should drop below the 600-line cap. **Action: delete first, then re-measure. Only split if still over cap.**

Methods that survive (after deletions) — verified via internal grep:
- `getMySubscription` (controller for endpoint #1)
- `getMyPayments`, `exportMyPayments` (controllers for #11, #12)
- `assignSubscription` (controller for #3 — admin/assign)
- `validateEventCreation` (called by `events.crud.service.js:34`)
- `countEventsInBillingPeriod` (private helper used by `validateEventCreation`)
- `_getAddonExtraGuests` (private helper used by `validateEventCreation` at line 73 — KEEP)
- `_getPackageLimits` (private helper used by `validateEventCreation` at line 74 — KEEP)
- `renewSubscription` (called by `scheduledTasks.js:1191`)
- `_mapSubStatusToPayment` (private helper used by `getMyPayments`)

Methods DELETED with their endpoints (verified zero external callers):
- `subscribe`, `_recordPendingRefund` (private helper)
- `finalizePending3ds` (per §2.4 — chained with the `purpose === 'subscription'` branch in `payments.service.runFinalization`)
- `changePlan`, `cancelSubscription`
- `validateLimits`, `getPackageLimits`, `validateGuestLimit`, `validateModeratorLimit`, `canAccessFeature`
- `getAvailablePlans`, `getPlanByCode`, `_formatPlan` (subscriptions copy — `plans.service` has its own)
- `getSubscriptionById` (zero external callers, zero internal callers — DELETE)
- `incrementUsage` (zero callers anywhere — DELETE; was a stub for future use that never landed)

### 2.3 Validation file (Zod, not Joi)

Create `labbe-backend-/src/modules/subscriptions/subscriptions.validation.js` with **one** schema (only `/admin/assign` accepts a body after the deletions):

```js
const { z } = require('zod');
const { Types } = require('mongoose');

const objectId = z.string().refine((s) => Types.ObjectId.isValid(s), 'invalid id');

const adminAssignSchema = z.object({
  userId: objectId,
  planCode: z.string().min(1),
  notes: z.string().max(500).optional(),
}).strict();

module.exports = { adminAssignSchema };
```

Wire in routes via `validateZod(adminAssignSchema)` per `validation.js:401-413`.

### 2.4 finalizePending3ds disposition (RESOLVED — DELETE)

Confirmed by reading `payments.service.js:94-128` (`runFinalization`):
- `purpose === 'subscription'` branch (lines 99-105) is the **only** caller of `subscriptionsService.finalizePending3ds`. It fires only when `payment.metadata.pendingSubscribeIntent` is set, which is created by the legacy `POST /subscriptions/subscribe` flow.
- Checkout has its own finalization at `purpose === 'checkout'` (lines 113-119) → `checkoutService.finalizePending3ds`. Independent path.
- After `POST /subscriptions/subscribe` is deleted, no Payment row will ever carry `pendingSubscribeIntent`, so the legacy branch is unreachable.

**Action:** delete `subscriptionsService.finalizePending3ds` AND remove the entire `purpose === 'subscription'` branch from `payments.service.runFinalization`. This is a chained deletion — both must land in A.6.

### 2.5 Middleware adjustments (after deletions)

Originally the plan called for adding rate-limiters and auditLogs to `/subscribe`, `/change-plan`, `/cancel`. **Those routes are deleted**, so these items go away. Action items remaining:
- `/admin/assign` — already has `restrictTo`, `idempotency`, `auditLog` ✓
- `/my-subscription`, `/payments`, `/payments/export` — `protect` only (correct; reads).

**Net middleware change for backend: only the validation wiring on `/admin/assign`.**

### 2.6 console.* sites (REPLACE WITH LOGGER)

Confirmed 14 sites in `subscriptions.service.js`. After endpoint deletions, many are removed with their owning method. Remaining sites in surviving methods (`getMyPayments`, `validateEventCreation`, `renewSubscription`, etc.) use the shared `logger` from `shared/utils/logger.js`. Specific lines to replace (verify after deletions land):
- 443-447, 503-509, 575-576, 597, 617 (notification fire-and-forget), 667-668, 737, 795, 836, 895, 927, 984, 1008, 1336-1340, 1378.

**Pattern:** replace `console.error('msg', err)` with `logger.error({ err }, 'msg')`. Replace `.catch(console.error)` on notification fire-and-forget with `.catch((err) => logger.warn({ err }, 'notification dispatch failed'))`.

### 2.7 Comment markers (REMOVE)

40+ markers confirmed in `subscriptions.service.js`. After the deletions in §2.2, most go away with their owning method. Remaining markers to scrub from surviving code:
- Line 55: `// FIX Bug 3:` (validateEventCreation)
- Line 72: `// FLOW-12-F02:` (counting addons)
- Line 118: `(FLOW-12-F02)` JSDoc
- Line 136: `(FLOW-12-F02)` JSDoc
- Line 763: `// FLOW-12-F01 / FLOW-09-F02:` + `MED-8 review:`
- Line 933: `Phase 3 §6.2` JSDoc opener
- Line 957-959: PlanModel pricing comment (keep the *why*, drop the marker)
- Line 1311: `HIGH-6 review:`
- Controller line 54: `(FLOW-09-F04)`

Replace each with one-line plain English explaining the *why* if non-obvious, or delete entirely.

### 2.8 Bare `throw new Error`

`subscriptions.service.js:346` — inside `subscribe` method. **Goes away when subscribe is deleted.** No action needed.

### 2.9 Swagger drift

After endpoint deletions, only 4 routes remain. Update Swagger blocks for:
- `getMySubscription` — match the actual `data: { subscriptions[], hasSubscription, subscription }` shape (controller line 19-27).
- `adminAssign` — move inline schema to `components.schemas.AdminAssignSubscriptionRequest`.
- `getMyPayments` — add `PaymentHistoryItem` + `PaymentHistoryResponse` schemas (currently undocumented; controller line 158-171).
- `exportMyPayments` — confirm/add response shape.

### 2.10 Whitelabel isolation

Confirmed: `getMySubscription`, `getMyPayments` use `req.user._id` only (correct for self-reads — `protect` middleware scopes `req.user` to the authenticated user's whitelabel upstream). No filter changes needed.

### 2.11 NEW finding — index.js exports

`subscriptions/index.js` re-exports `service`, `controller`, `routes`. After deletions, audit the file to ensure no orphaned re-exports remain.

---

## 3. Web Findings

### 3.1 File-size violations

**NONE.** Plan was based on stale code; refactor in commit `df7c6b0` already extracted `usePlansPageState`. Confirmed line counts:
- `app/[lang]/host/plans/PlansPage.js` — 154 (cap 250) ✓
- `app/[lang]/host/plans/summary/Summary.js` — 177 (cap 250) ✓
- `app/[lang]/host/plans/_components/AddonsSection.jsx` — 189 (cap 250) ✓
- `app/[lang]/host/payments/_components/PaymentsClient.jsx` — 159 (cap 250) ✓
- `app/[lang]/admin-dash/plans/page.js` — 149 (cap 250) ✓
- `app/[lang]/admin-dash/hosts/_components/HostSubscriptionPopup.jsx` — 178 (cap 250) ✓

**No splits required.**

### 3.2 Dead service migration: `admin-dash/plans/page.js`

Currently calls `subscriptionService.subscribe(...)` (line 56), the last consumer of the dead `subscriptionService.js`. After this PR, the file uses `useCheckout` like the host plans flow.

**Required changes (B.1):**
- Replace `subscriptionService.subscribe(...)` call (line 56) with `useCheckout` mutation.
- Pass `addons: []` (admin-dash plans page has no addons UI today; matches the bundled-checkout body).
- On success result with `requiresAction` → `useCheckout` already redirects via `window.location.href = redirectUrl` (matches host flow); skip toast.
- On non-3DS success, replace `setSubscription(response.data)` with React Query invalidation `queryClient.invalidateQueries({ queryKey: ["subscriptions"] })`.
- Remove the import of `@/services/subscriptionService` and **delete `services/subscriptionService.js` entirely**.

### 3.3 Dead packageService.js

**100% unused on web** (no importer found). User's "totally unused?" question — confirmed. Action: **delete `services/packageService.js` outright** along with its 3 internal `/subscriptions/validate-limits` calls.

### 3.4 Dead hooks in `useSubscriptions.js`

After backend endpoint deletions, the file shrinks to:
- `useMySubscription` (KEEP)
- `useMyPayments` (KEEP)

DELETE:
- `useValidateLimits` (lines 32-45) — zero consumers.
- `useSubscriptionMutation(...)` factory (lines 75-147) — the entire factory. The `subscribe` branch is the only one with a *theoretical* consumer (host plans flow now uses `useCheckout`); `upgrade` and `cancel` branches have zero consumers. The factory itself becomes orphaned.

### 3.5 API config cleanup

In `services/new-backend/api.config.js:155-181`, after backend endpoint deletions, the `subscriptions` namespace shrinks to:

```js
subscriptions: {
  getMySubscription: '/subscriptions/my-subscription',
  adminAssign: '/subscriptions/admin/assign',  // currently lives elsewhere; verify
  getMyPayments: '/subscriptions/payments',
  export: '/subscriptions/payments/export',
}
```

DELETE keys: `subscribe`, `changePlan`, `cancelSubscription`, `validateLimits`, `getPackageLimits`, `checkFeatureAccess`, `getAvailablePlans`, `getPlanByCode`.

### 3.6 Other cleanup

- **`app/[lang]/host/plans/page.js:30`** — `console.error("Error prefetching plans data:", error)`. Replace with silent logger (this is server-side prefetch; an error here is not user-visible). Either drop it or send to an error reporter.
- **`app/[lang]/admin-dash/plans/page.js:36-37`** — `businessPlansData = businessPlansResponse?.data || businessPlansResponse || {}`. After migrating to `useCheckout` + `useBusinessPlans`, drop the right branch: `businessPlansData = businessPlansResponse?.data ?? {}`.
- **`HostSubscriptionPopup.jsx`** (admin-dash/hosts) — does not touch the subscriptions module directly (uses `useAdminHostMutation("updateSubscription")` and `useAdminPlans`). **Out of scope for this PR.** The original plan's i18n migration there belongs to the admin-dash/hosts module review.

### 3.7 Comment hygiene (web)

- `app/[lang]/host/plans/page.js:30` — `console.error` (per §3.6).
- No `FLOW-`, `PHASE-`, `B-`, `H-`, `HIGH-`, `MED-`, `FIX Bug` markers found in subscriptions-touching web files. Original plan claim of "~25 markers" was wrong.

---

## 4. Mobile Findings

### 4.1 File-size violations

**NONE in scope.** Plan referenced files that don't exist (`AddionalFeatures.js`, `PaymentSummery.js`, `PlansOverview.js`). Confirmed actual sizes:
- `screens/host/PlansScreen.js` — 327 (cap 350) ✓
- `screens/host/PlansSummaryScreen.js` — 271 ✓
- `screens/admin/WhitelabelPlansSummaryScreen.js` — 269 ✓
- `components/plans/HostPlanCard.js` — 195 ✓
- `components/plans/AddonsSection.js` — 338 ✓
- `components/plans/CurrentPlanCard.js` — 282 ✓

**No splits, no renames.** Filename typos are in commits that no longer exist on master.

### 4.2 WhitelabelPlansSummaryScreen migration (CRITICAL — only real bug)

**File:** `screens/admin/WhitelabelPlansSummaryScreen.js`
**Current bug:** uses `useSubscribe()` (line 27) which calls the legacy `POST /subscriptions/subscribe` without `source` or `callbackUrl`. Real Moyasar will reject. If response ever returns `requiresAction: true`, the screen ignores it and `toast.success` + `navigation.goBack()` (lines 96-98) — silent failure.

**Migration (C.1):**
- Replace `useSubscribe` import with `useCheckout` (line 17).
- Replace `subscribeMutation = useSubscribe()` with `checkoutMutation = useCheckout()` (line 27).
- Build a payment source from a payment-method selector (today the screen has no payment method UI — **add a minimal payment method selector matching `PlansSummaryScreen`'s pattern**).
- In `handlePayment` (lines 88-112):
  - Build `payload = { planCode, addons: [], discountCode?, source, callbackUrl: <deep-link> }`.
  - Call `await checkoutMutation.mutateAsync(payload)`.
  - If `result?.requiresAction` → `useCheckout` already opened the URL via `Linking.openURL`; just `return` (matches `PlansSummaryScreen.js:110-114`).
  - Otherwise toast success + navigate.
- **Delete the substring-match error branches at lines 100-106** (`error.message?.includes("already have an active subscription")` etc.) — those backend errors don't fire on the new path because `checkout.service` auto-cancels existing subs.

### 4.3 Dead hook deletions

**Delete file `hooks/mutations/useSubscriptionMutations.js` entirely** after C.1 lands. Hooks `useSubscribe`, `useUpgradeSubscription`, `useCancelSubscription` all become orphaned.

### 4.4 Dead store deletion

**Delete `stores/subscriptionStore.js`** (zero consumers; `useSubscriptionStore` is only referenced inside the file itself). The store also calls a non-existent `subscriptionService.getUsageStats(token)` (line 54) — broken code path, dead code anyway.

### 4.5 Service file shrink

`services/subscriptionService.js` currently exposes: `getMySubscription`, `subscribe`, `upgrade`, `cancel`, `validateLimits`, `getLimits`. After this PR:
- Keep `getMySubscription` (used by `hooks/queries/useUser.js#useSubscription`).
- **Add `getMyPayments(params)`** mirroring web `useMyPayments` (closes the web/mobile parity gap on payment history).
- Delete `subscribe`, `upgrade`, `cancel`, `validateLimits`, `getLimits` (no consumers after C.1 / C.3).
- Drop the file-level `Phase 4 W0-AUTH:` comment marker (line 4).

### 4.6 New mobile feature: payments history screen

To match web's `host/payments/page.js`, add:
- `hooks/queries/useSubscriptions.js` — `useMyPayments(params)` hook calling `subscriptionService.getMyPayments(params)`.
- `screens/host/PaymentsScreen.js` — list view mirroring web `PaymentsClient.jsx` (rows + pagination + status badge).
- Wire the screen into `navigation/HostNavigator.js` (or wherever host-tab routes live).

### 4.7 Query-key alignment

Mobile `useSubscription` queryKey is `['subscription', 'info']` (singular); mutations invalidate `['subscription']` (singular prefix). Web uses `['subscriptions', 'my-subscription']` (plural).

**Action (C.5):** rename mobile to `['subscriptions', 'my-subscription']` to match web. Update the invalidation in `useCheckout.js:70` from `['subscription']` to `['subscriptions']`.

### 4.8 Comment hygiene (mobile)

Only 1 marker confirmed: `services/subscriptionService.js:4` `Phase 4 W0-AUTH:`. Drop.

### 4.9 NEW finding — `getStatusDisplay` literals (moot)

`stores/subscriptionStore.js:227-237` hardcodes Arabic/English status labels. **Moot — the store is being deleted.** No i18n migration needed; the data path becomes `data.data.subscription.status` consumed via web/mobile rendering with `t("subscription.status.${status}")` inline at the consumer.

---

## 5. Cross-Platform API Diff (target state)

After this PR, both platforms call **only these 4 subscription endpoints**, with identical bodies/query/response handling:

| Endpoint | Web | Mobile | Notes |
|----------|-----|--------|-------|
| GET /subscriptions/my-subscription | `useMySubscription` (queryKey `['subscriptions','my-subscription']`) | `useSubscription` renamed to use queryKey `['subscriptions','my-subscription']` | Read `data.data.subscription` on both. |
| POST /subscriptions/admin/assign | `services/adminDashboard.js:710` | (admin not used on mobile today — leave) | Validated via Zod `adminAssignSchema`. |
| GET /subscriptions/payments | `useMyPayments` | NEW `useMyPayments` hook + PaymentsScreen | Identical params (page, limit, status). |
| GET /subscriptions/payments/export | `useAdminPaymentsExport` | (CSV export deferred for mobile — out of scope) | Web-only initially; ok per platform fit. |

**Subscribe / plan-switch / cancel are no longer subscription-module endpoints** — both platforms route through `POST /payments/checkout` (already migrated for the host flow; this PR completes the migration for the two remaining stragglers).

---

## 6. Suspected Bugs (now with verdicts)

1. **Mobile WhitelabelPlansSummaryScreen subscribe is non-functional.** CONFIRMED. Fix via §4.2.
2. **Mobile silently consumes 3DS as success on the legacy path.** CONFIRMED for WhitelabelPlansSummaryScreen only. PlansSummaryScreen already handles `requiresAction` correctly via `useCheckout`. Fix via §4.2.
3. **`subscriptionStore.fetchUsageStats` calls a non-existent service method.** CONFIRMED. Moot — store is deleted in C.4.
4. **Web `PlansPage.js:170-174` substring match on error message.** OBSOLETE — `PlansPage.js` no longer contains that branch (audit confirmed; that handler is now in `usePlansPageState.handleProceedToPayment` and uses `error?.response?.data?.message` correctly).
5. **`apiClient` shape leak.** WEB: `apiRequest` returns the unwrapped response — confirm by reading `services/new-backend/apiClient.js` end-to-end at implementation time. MOBILE: `apiFetch` returns the response with `{ data: ... }` wrapper. The `data?.data || data` patterns can be tightened **after** picking the canonical shape — but this is small polish, not a bug.
6. **`/subscriptions/plans*` and `/limits` may be called by jobs.** RESOLVED: backend grep across `shared/utils/scheduledTasks.js`, `webhook.controller.js`, `payments.reconcile.js` shows zero references. Safe to delete.
7. **Web `host/payments/return/page.js` is a 5-line stub.** OBSOLETE — file is 10 lines and delegates to `PaymentReturnClient.jsx` (126 lines, fully functional). Audit confirmed.
8. **Mobile invalidates `['subscription']` while query is `['subscription','info']`.** CONFIRMED but prefix-match works today. Cleaned up in §4.7.
9. **`useSubscriptionMutation` non-3DS swallow path.** OBSOLETE — the entire factory is being deleted in §3.4.
10. **`subscriptions.service.js:346` bare `throw new Error`.** OBSOLETE — entire `subscribe` method is being deleted.

---

## 7. Implementation Plan (Ordered, single PR)

Sequence intentionally puts non-breaking deletions last so each step is independently verifiable.

### 7.A Backend (must land before Web/Mobile migrations)

- [ ] **A.1** Create `subscriptions.validation.js` with Zod `adminAssignSchema` (§2.3). Wire `validateZod(adminAssignSchema)` on `POST /admin/assign` route. Keep existing `restrictTo`, `idempotency`, `auditLog`.
- [ ] **A.2** _(Pre-resolved in §2.4 — no investigation needed at implementation time. `finalizePending3ds` deletes outright, along with the `purpose === 'subscription'` branch of `payments.service.runFinalization`. This step is folded into A.6.)_
- [ ] **A.3** Replace `console.error/warn/log` and `.catch(console.error)` patterns in `subscriptions.service.js` (§2.6) with the shared `logger`. Targets only the surviving methods (most go away in A.6).
- [ ] **A.4** Replace bare `throw new Error` at line 346 (only relevant if A.6 is somehow deferred — otherwise this disappears with A.6).
- [ ] **A.5** Comment-hygiene pass on surviving code — drop `FLOW-` / `PHASE-` / `HIGH-` / `MED-` / `FIX Bug` / `B-3` / `H-5` markers (§2.7), keeping plain-English why-comments.
- [ ] **A.6** **Delete dead code** — methods + their controller actions + their routes + their Swagger blocks:
  - Service methods: `subscribe`, `_recordPendingRefund`, `finalizePending3ds`, `changePlan`, `cancelSubscription`, `validateLimits`, `getPackageLimits`, `validateGuestLimit`, `validateModeratorLimit`, `canAccessFeature`, `getAvailablePlans`, `getPlanByCode`, `_formatPlan`, `getSubscriptionById`, `incrementUsage`
  - Service helpers KEPT (used by `validateEventCreation`): `_getAddonExtraGuests`, `_getPackageLimits`, `countEventsInBillingPeriod`
  - Routes: `subscribe`, `change-plan`, `cancel`, `validate-limits`, `limits`, `features/:f`, `plans`, `plans/:code`
  - Controllers: `subscribe`, `changePlan`, `cancelSubscription`, `validateLimits`, `getPackageLimits`, `checkFeatureAccess`, `getAvailablePlans`, `getPlanByCode`
  - Chain: in `payments.service.runFinalization` (`payments.service.js:99-105`), delete the `purpose === 'subscription'` branch entirely (per §2.4).
- [ ] **A.7** Re-measure `subscriptions.service.js` line count. If still > 600, split into 2 (`subscriptions.lifecycle.service.js` for assign+renew+validateEventCreation, `subscriptions.queries.service.js` for getMySubscription+getMyPayments+exportMyPayments). If ≤ 600, leave as-is.
- [ ] **A.8** Update Swagger blocks for the 4 surviving routes (§2.9). Move admin-assign request schema to `components.schemas.AdminAssignSubscriptionRequest`. Add `PaymentHistoryItem` + `PaymentHistoryResponse`.
- [ ] **A.9** Audit `subscriptions/index.js` — drop any orphaned re-exports.
- [ ] **A.10** Run backend tests; expect failures only on tests covering the deleted endpoints (delete those tests too).

### 7.B Web

- [ ] **B.1** Migrate `app/[lang]/admin-dash/plans/page.js`: replace `subscriptionService.subscribe(...)` (line 56) with `useCheckout` from `@/hooks/reactQueryHooks/useCheckout`. Pass `addons: []`. Replace the `setSubscription(response.data)` with `queryClient.invalidateQueries({ queryKey: ["subscriptions"] })`. Remove the `subscriptionService` import. **No changes required to `Summary` component** — it already defaults `addonItems = [], addonTotal = 0` (Summary.js:18-19) and works unchanged when invoked from this page.
- [ ] **B.2** Tighten the fallback chain at line 36-37 to `businessPlansResponse?.data ?? {}`.
- [ ] **B.3** **Delete `services/subscriptionService.js`** (now zero consumers).
- [ ] **B.4** **Delete `services/packageService.js`** (zero consumers).
- [ ] **B.5** Trim `hooks/reactQueryHooks/useSubscriptions.js`:
  - Delete `useValidateLimits` export.
  - Delete `useSubscriptionMutation` factory (the entire function).
  - Keep `useMySubscription`, `useMyPayments`.
- [ ] **B.6** Trim `services/new-backend/api.config.js` `subscriptions` namespace per §3.5.
- [ ] **B.7** Drop `console.error` at `app/[lang]/host/plans/page.js:30`.
- [ ] **B.8** Run web `npm run lint` and visual smoke test (host plans page, admin-dash plans page, host payments page, 3DS return page).

### 7.C Mobile

- [ ] **C.1** Migrate `screens/admin/WhitelabelPlansSummaryScreen.js` from `useSubscribe` to `useCheckout` (§4.2). Add a minimal payment-method selector matching `PlansSummaryScreen`. Build full body `{ planCode, addons: [], discountCode?, source, callbackUrl }`. Handle `requiresAction` via early return. Delete substring-match error branches.
- [ ] **C.2** **Delete `hooks/mutations/useSubscriptionMutations.js`** (now zero consumers).
- [ ] **C.3** Trim `services/subscriptionService.js`:
  - Keep `getMySubscription`.
  - Add `getMyPayments(params, token)` matching backend `/subscriptions/payments`.
  - Delete `subscribe`, `upgrade`, `cancel`, `validateLimits`, `getLimits`.
  - Drop `Phase 4 W0-AUTH:` marker (line 4).
- [ ] **C.4** **Delete `stores/subscriptionStore.js`** (zero consumers).
- [ ] **C.5** Rename `useSubscription` queryKey from `['subscription','info']` to `['subscriptions','my-subscription']` (matches web). Update invalidation in `hooks/mutations/useCheckout.js:70` to `['subscriptions']`.
- [ ] **C.6** Add `hooks/queries/useSubscriptions.js` with `useMyPayments` hook.
- [ ] **C.7** Add `screens/host/PaymentsScreen.js` mirroring web `PaymentsClient.jsx`. Wire into `HostNavigator`.
- [ ] **C.8** Verify `services/subscriptionService.getLimits()` and any other unused exports — delete after grep confirms zero consumers.
- [ ] **C.9** Run `npm run lint` (or `expo lint`) and physical-device smoke test (host plans subscribe, whitelabel admin subscribe, payments history).

### 7.D Cross-platform alignment

- [ ] **D.1** Re-grep `D:\halla\labbe\` and `D:\halla\halla-mobile\` for `/subscriptions/` — confirm only the 4 surviving paths remain.
- [ ] **D.2** Manual smoke: host subscribe + 3DS flow on web AND mobile — both end at "create event" with active subscription.
- [ ] **D.3** Manual smoke: admin SUPER_ADMIN assigns a free sub via `/admin/assign` — confirm AuditLog row + Subscription row.
- [ ] **D.4** Manual smoke: whitelabel admin self-subscribes via `WhitelabelPlansSummaryScreen` (now uses checkout) — confirm Payment row + Subscription row.
- [ ] **D.5** Manual smoke: mobile PaymentsScreen renders the same rows as web PaymentsClient for the same user.

---

## 8. Locale keys to add

(Agent does NOT modify locale JSON without explicit user approval. The list below is what the agent will need to add when wiring i18n strings.)

After audit, only **Mobile** needs new keys. Web `Summary.js` already uses `t()` throughout; original plan's claim of "Summary.js has no t() at all" was wrong.

**Mobile — new namespace `subscription` (for the new PaymentsScreen):**
- `subscription.payments.title` — en: "Payment History" / ar: "سجل المدفوعات"
- `subscription.payments.empty` — en: "No payments yet" / ar: "لا توجد مدفوعات حتى الآن"
- `subscription.payments.columns.date` — en: "Date" / ar: "التاريخ"
- `subscription.payments.columns.plan` — en: "Plan" / ar: "الخطة"
- `subscription.payments.columns.amount` — en: "Amount" / ar: "المبلغ"
- `subscription.payments.columns.status` — en: "Status" / ar: "الحالة"
- `subscription.status.active` — en: "Active" / ar: "نشط"
- `subscription.status.trial` — en: "Trial" / ar: "تجريبي"
- `subscription.status.expired` — en: "Expired" / ar: "منتهي"
- `subscription.status.cancelled` — en: "Cancelled" / ar: "ملغي"
- `subscription.status.pastDue` — en: "Past due" / ar: "متأخر"
- `subscription.status.completed` — en: "Completed" / ar: "مكتمل"

**Web — namespace `businessPlans` (admin-dash plans page after migration):**
- `plansPage.toasts.subscriptionCreated` — en: "Subscription activated" / ar: "تم تفعيل الاشتراك"
- `plansPage.toasts.subscriptionFailed` — en: "Could not activate subscription" / ar: "تعذر تفعيل الاشتراك"

(The host-plans namespace already has `toasts.subscriptionCreated` / `toasts.subscriptionFailed` — reuse if the admin-dash page can share the namespace.)

---

## 9. Rollback plan

Each Phase 2 commit is a stand-alone change set; rollback is `git revert <sha>`. Specific concerns:

- **A.6 (delete 8 endpoints)** — non-reversible-by-revert if any external system (Postman collection, integration partner) depended on the deleted paths. **User to confirm before merge** that no external consumer hits `/subscriptions/{subscribe,change-plan,cancel,validate-limits,limits,features/*,plans,plans/*}`. Backend grep shows zero internal callers.
- **B.1 / C.1 (migrate to checkout)** — rollback via revert. Single-PR atomic merge means there is no production window where frontend and backend disagree. (If this work is later split across multiple deploys, sequence frontend migrations before backend deletions.)
- **A.7 (split service file)** — only do if file is still > 600 after A.6. Façade-style split keeps external imports stable.
- **C.4 (delete subscriptionStore)** — destructive; commit on its own so revert is one click.

---

## 10. Acceptance checklist (run after Phase 2)

- [ ] `subscriptions.routes.js` has exactly 4 routes (`my-subscription`, `admin/assign`, `payments`, `payments/export`).
- [ ] `subscriptions.validation.js` exists with Zod `adminAssignSchema`; `/admin/assign` runs through `validateZod`.
- [ ] `subscriptions.service.js` ≤ 600 lines (or split per A.7).
- [ ] No file in `app/[lang]/host/plans/**` exceeds 250 lines (already true).
- [ ] No file in `halla-mobile/components/plans/**` exceeds 350 lines (already true).
- [ ] No `/subscriptions/{subscribe,change-plan,cancel,validate-limits,limits,features/*,plans,plans/*}` references anywhere in `D:\halla\` (excluding `.claude/worktrees/` and node_modules).
- [ ] Web + Mobile both perform self-subscribe via `POST /payments/checkout` (no exceptions).
- [ ] Web + Mobile both consume `GET /subscriptions/my-subscription` via queryKey `['subscriptions','my-subscription']`.
- [ ] Mobile has a `PaymentsScreen` showing the same data as web `PaymentsClient`.
- [ ] No `// FLOW-…` / `// PHASE-…` / `// FIX Bug N` / `// HIGH-N` / `// MED-N` / `// B-N` / `// H-N` / `// W0-AUTH` markers in any subscriptions-touched file (backend or frontend).
- [ ] No `console.log` / `console.error` / `console.warn` in subscriptions module on either platform (excluding catch blocks that also surface a user-visible error via toast).
- [ ] Files deleted: web `services/subscriptionService.js`, web `services/packageService.js`, mobile `stores/subscriptionStore.js`, mobile `hooks/mutations/useSubscriptionMutations.js`.
- [ ] `npm run lint` clean (or no new warnings) in both `labbe/` and `halla-mobile/`.
- [ ] Smoke tests in §7.D all pass.

---

## 11. What changed vs the original 2026-05-07 plan

For traceability:

**Items removed (no longer applicable — codebase changed):**
- All file-size violations (web `Summary.js` 397→177, `PlansPage.js` 288→154, mobile `AddionalFeatures.js`/`PaymentSummery.js`/`PlansOverview.js` files don't exist).
- All `isArabic ?` literal migrations in `Summary.js` (already done).
- All filename rename items (typos don't exist).
- Web 3DS return page implementation (already done in `PaymentReturnClient.jsx`).
- Most data-mapping / fallback-chain items (already cleaned).
- Duplicate-hook deletions (`useHostPlans` x3, `usePlanByCode` x2 don't exist; already deduped).
- `FEATURE_MAP` extraction (already in `usePlansPageState.js`, no longer in `PlansPage.js`).
- Adding rate-limiter / auditLog to `/subscribe`, `/change-plan`, `/cancel` (those routes are deleted).
- Most comment-hygiene markers (already scrubbed in the survivor set; markers are concentrated in soon-to-be-deleted methods).

**Items expanded (decision changed based on user constraints):**
- Endpoint deletion: 4 → 8.
- Service file split: required → contingent on post-deletion line count.
- packageService: keep with bug fix → delete entirely.
- Frontend service files: keep partially → delete entirely (web `subscriptionService.js`, mobile `subscriptionStore.js`, mobile `useSubscriptionMutations.js`).
- Validation library: Joi → Zod (locked by user's standing rule).

**Items newly discovered:**
- `payments.service.js:105` calls `finalizePending3ds` — needs disposition (move or delete).
- Backend service is 1386 lines, not 1344.
- Backend has 3 external callers, not 5.
- Web admin-dash plans page is the last consumer of legacy subscribe — migrate to `useCheckout`.
- Mobile WhitelabelPlansSummaryScreen is the last consumer of legacy subscribe + the only true broken-3DS path.
- Mobile query key alignment to web (`['subscriptions','my-subscription']`).
- Mobile needs new PaymentsScreen for parity with web.

---

**End of plan. Decisions locked. Ready for Phase 2.**
