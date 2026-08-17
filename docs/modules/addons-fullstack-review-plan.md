# addons — Full-Stack Review Plan

**Module:** addons
**Generated:** 2026-05-07
**Prompt:** docs/implementation/MODULE_FULLSTACK_REVIEW_PROMPT.md
**Status:** Awaiting green light · NOT IMPLEMENTED YET

---

## 0. Executive Summary

- **4** total endpoints in module (`GET /addons`, `POST /addons/purchase`, `GET /addons/my`, `POST /addons/admin/:id/activate`).
- **0** Swagger annotations exist for the module (entire module is invisible to OpenAPI).
- **1** endpoint candidate for verification — `GET /addons` is implemented and exposed via both API clients (`addonsAPI.listMine` web, `addons.listMine` mobile) but **never consumed**; both clients hardcode the catalog locally. Either the endpoint should be wired up, or the dead client wrappers + `getAvailableAddons` controller path should be deleted.
- **1** backend file-size violation: `addons.service.js` 682 lines (cap 600).
- **2** web file-size violations: `PlansPage.js` 288 lines, `Summary.js` 397 lines (cap 250).
- **1** mobile file-size violation: `components/plans/AddonsSection.js` 436 lines (cap 350).
- **1** silent-failure data bug in mobile: `addons.purchase` returns `{success:false, error}` envelope (does **not** throw on non-2xx), but `AddonsSection.js` only branches on `try/catch` — a failed purchase is silently counted as success. Confirmed.
- **2** missing-validation findings: `POST /addons/purchase` body has **no** Joi schema; `POST /addons/admin/:id/activate` lacks `validateObjectId('id')`.
- **5+** controller/service violations: controllers wrap with manual `try/catch + next()` (no `catchAsync`), use raw `res.status().json()` (no `responseHelper`), service uses raw `console.error`/`eslint-disable`s, role string literal `'host'` in audit calls, sequential awaits where parallel is possible, silent `.save().catch(() => {})`.
- **22+** FLOW-10-Fxx / H-14 / W0 / B-4 phase markers across backend + web + mobile.
- **2** locale gaps: web `plans.json` missing `addons.purchase.*` and `addons.designTypes.*` namespaces (mobile already has them).
- **3** hardcoded-data findings: tier prices duplicated in `addons.js` (backend), `AddonsSection.jsx` (web), `AddonsSection.js` (mobile) — three copies of the same source-of-truth catalog.
- **1** missing module hygiene: no `index.js` in `labbe-backend-/src/modules/addons/` (other modules have one); no `addons.validation.js`.
- Estimated effort: **L** (large — backend split + Joi schema + Swagger + canonical web/mobile React-Query hooks + 250-line page splits + locale additions, all preserving CSS module/StyleSheet output).

---

## 1. Endpoint Inventory

| # | Method | Path | Controller | Service | Middleware chain | Swagger | Web hook/consumer | Mobile hook/consumer | Status |
|---|--------|------|------------|---------|------------------|---------|-------------------|----------------------|--------|
| 1 | GET    | /addons | `getAvailableAddons` | `getAvailableAddons` (returns constants) | (none — public) | **MISSING** | none — `addonsAPI.listMine`/`addons.listMine` exists but is dead code | none — same | **VERIFY**: either wire to a `useAvailableAddons` hook and replace hardcoded tiers, OR delete `addonsAPI.listMine` and the controller path. (Note `listMine` clients call this same path with a query string; the backend ignores `userId` filtering — it returns the catalog, not user purchases. Naming on clients is **wrong**: `listMine` calls the catalog endpoint, not `GET /addons/my`.) |
| 2 | POST   | /addons/purchase | `purchaseAddon` | `purchaseAddon` | `protect`, `idempotency({scope:'addons.purchase'})` | **MISSING** | `addonsAPI.purchase` (services/adminDashboard.js:874) → `AddonsSection.jsx` direct call | `addons.purchase` (adminDashboardService.js:292) → `AddonsSection.js` direct call | KEEP — needs Joi schema, Swagger doc, React-Query mutation hooks on both clients |
| 3 | GET    | /addons/my | `getMyAddons` | `getMyAddons` | `protect` | **MISSING** | none (no consumer) | none (no consumer) | **VERIFY**: endpoint exists and works; clients have no consumer despite the dashboard surface implying "my addons" — see §6 |
| 4 | POST   | /addons/admin/:id/activate | `adminActivateAddon` | `activateAddonAsAdmin` | `protect`, `restrictTo(SUPER_ADMIN)`, `idempotency({scope:'addons.admin_activate'})`, `auditLog(...)` | **MISSING** | `addonsAPI.adminActivate` exists, no UI consumer | `addons.adminActivate` exists, no UI consumer | KEEP — but note: `validateObjectId('id')` middleware is missing. Admin UI to drive this is also missing — operators currently must hit it via curl. |

**Legend:** KEEP, DELETE-DUPLICATE-OF-#N, RENAME, MERGE-WITH-#N, VERIFY.

**Service-only (not routed):** `addonsService.finalizePending3ds(paymentId)` is invoked from `payments/webhook.controller.js:139`, `payments/payments.reconcile.js:56`, `payments/payments.controller.js:57`. It is fully wired but has no Swagger surface (because it isn't an HTTP endpoint owned by addons).

---

## 2. Backend Findings

### 2.1 File-size violations

- `labbe-backend-/src/modules/addons/addons.service.js` — **682 lines** (cap 600).
  Proposed split (preserving public `module.exports = new AddonsService()` API):
  - `addons.service.js` (canonical, façade) — exports the singleton, re-exports the same public methods.
  - `addons.purchase.service.js` — `purchaseAddon`, `finalizePending3ds`, the price/scope helpers.
  - `addons.quota.service.js` — `_applyQuota`.
  - `addons.refund.service.js` — `_recordPendingRefund` and the admin-notify path.
  - `activateAddonAsAdmin` and `getMyAddons` and `getAvailableAddons` stay in the façade.

  All callers (`payments/webhook.controller.js`, `payments/payments.controller.js`, `payments/payments.reconcile.js`) import `require('../addons/addons.service')` — the façade keeps that import contract intact.

### 2.2 Swagger drift

The module has **zero** `@swagger` annotations across `addons.routes.js`. Every endpoint listed in §1 needs JSDoc adding. Recommended schema components to add to `config/swagger.js`:

- `AddonCatalog` — the tiered shape returned by `GET /addons`.
- `AddonPurchaseRequest` — body for `POST /addons/purchase` (mirrors the new Joi schema in §2.6).
- `Addon` — the Mongo document shape (matches `AddonModel.js`).
- `AddonPurchaseResponse` — the success envelope `{ success, data: Addon }`.
- `Addon3DSResponse` — `{ success, data: { requiresAction:true, redirectUrl, paymentId } }` (note: status 200 even on success — see §6).
- `AdminActivateRequest` — `{ notes?: string }`.

### 2.3 Missing middleware / safeguards

- `POST /addons/admin/:id/activate` — missing `validateObjectId('id')`. (file: `addons.routes.js:32–48`)
- `POST /addons/purchase` — missing Joi body validation entirely (see §2.6).
- `GET /addons` — no `protect` (acceptable for a public catalog). Should be **explicitly justified** with a one-line comment per A4.1 ("public catalog, no PII"); today there is no comment, just an absent middleware.
- `getMyAddons` — no pagination (returns potentially unbounded list). Cap should be added (`limit` query param via `getPaginationFromQuery`).
- `service._applyQuota` — performs `Subscription.findByIdAndUpdate(...)` and `Event.findByIdAndUpdate(...)` outside any transaction; the addon row is created in a separate `await` from the quota mutation. The compensating-action path (`addon.status = 'failed_quota'` + `_recordPendingRefund`) is documented and reasonable — keep, but flag explicitly in plan that this is intentional, not a TODO.
- `purchaseAddon` calls `paymentRecord.save().catch(() => {})` (lines 152, 259) — silently swallows persistence errors. A persistence failure here means the Payment row is in an inconsistent state but no operator is notified. Replace with `logger.error(...)` (or rethrow) — see A3.2.

### 2.4 Duplicate / dead endpoints

- `GET /addons` (catalog) — **not consumed** by any web/mobile component. Both clients hardcode the same tier data locally. Decision required (see §6):
  1. **Wire it up**: add `useAvailableAddons` hook on web, `useAvailableAddons` query hook on mobile, replace the three hardcoded tier arrays with backend-derived data, then keep the endpoint.
  2. **Delete it**: drop the route, controller method, service method, and the corresponding `addonsAPI.listMine` / `addons.listMine` client wrappers (which today silently misroute to this catalog endpoint with a query string the backend ignores).

  Recommend (1): the catalog is currently triplicated, the tier prices already drifted once (see §5: web design template `nameAr` shortened vs backend), and a single source of truth eliminates the next drift.

### 2.5 Service / controller violations

- `addons.controller.js:3, 10, 29, 40` — every handler is `try { ... } catch (err) { next(err); }`. Replace with `catchAsync` per A2.1.
- `addons.controller.js:6, 22, 25, 33, 49` — uses raw `res.json(...)` and `res.status(201).json(...)`. Replace with `sendSuccess`, `sendCreated`, etc., per A2.2. The 3DS branch (line 22) returns `200` with `{ requiresAction: true }` — keep status 200 but call `sendSuccess` (which defaults to 200).
- `addons.controller.js:24, 48` — `res.locals.addonAudit` is set on the response object so the route-level `auditLog` middleware can read it. This pattern is fine but underdocumented; add a one-line `// audit middleware reads res.locals.addonAudit` comment.
- `addons.service.js:155, 446, 489, 493` — direct `console.error`/`console.warn` with `eslint-disable` markers. Replace with `logger.error`/`logger.warn` from `shared/utils/logger.js` per A2.4.
- `addons.service.js:319, 457, 661` — `actor: { _id: userId, role: 'host' }` hardcodes the role string literal. Use `ROLES.HOST` per A3.8. (Equivalent issue: `activatedBy: adminUserId` is fine; the hardcoded literal is the `role` field.)
- `addons.service.js:208, 581` — `Subscription.findActiveForUser(userId)` is awaited; in the same function we then await another DB call that does not depend on its result. These are not parallelizable in this case (the second depends on the first's outcome), so leave as-is. Flagged as **already-correct**; mention so the implementation pass doesn't try to "fix" it.
- `addons.service.js:152, 259` — `paymentRecord.save().catch(() => {})` swallows errors silently. Replace with `try { await paymentRecord.save(); } catch (e) { logger.error('addons.purchase paymentRecord save failed', e); }`.
- `addons.service.js:297, 642` — `try { ... } catch (_) { /* swallow — we'll still record the pending refund */ }` for the compensating-action path. Acceptable since the next step records the refund regardless, but the `_` should be named and at least logged at warn level.
- `addons.service.js:474–490` — best-effort `notificationService.sendToAdmins`. Rename the inner catch variable from `notifyErr` to be consistent and replace `console.warn` with `logger.warn`.

### 2.6 Validation gaps

`POST /addons/purchase` body has **no** Joi schema. Add `addons.validation.js` with:

```js
const Joi = require('joi');
const { ADDON_TYPES } = require('../../shared/constants/addons');

const purchaseAddonSchema = Joi.object({
  addonType: Joi.string().valid(...Object.values(ADDON_TYPES)).required(),
  quantity: Joi.number().integer().min(1).max(50).when('addonType', {
    is: Joi.valid(ADDON_TYPES.DESIGN_TEMPLATE, ADDON_TYPES.BUSINESS_CUSTOMIZATION),
    then: Joi.optional(),
    otherwise: Joi.required(),
  }),
  templateType: Joi.string()
    .valid('ready_made', 'custom_male', 'custom_themed', 'animated', '3d')
    .when('addonType', {
      is: ADDON_TYPES.DESIGN_TEMPLATE,
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    }),
  scope: Joi.string().valid('event', 'pool', 'org').optional(),
  eventId: Joi.string().hex().length(24).when('scope', {
    is: 'event',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  subscriptionId: Joi.string().hex().length(24).optional(),
  source: Joi.object({
    type: Joi.string().valid('creditcard', 'creditcard_3ds_test', 'stcpay', 'applepay').required(),
    name: Joi.string().optional(),
    number: Joi.string().optional(),
    month: Joi.alternatives(Joi.number(), Joi.string()).optional(),
    year: Joi.alternatives(Joi.number(), Joi.string()).optional(),
    cvc: Joi.string().optional(),
    mobile: Joi.string().optional(),
    token: Joi.string().allow(null).optional(),
  }).optional(),
  idempotencyKey: Joi.string().optional(), // legacy — service prefers the header
}).unknown(false);

const adminActivateSchema = Joi.object({
  notes: Joi.string().max(2000).optional().allow(''),
}).unknown(false);

module.exports = { purchaseAddonSchema, adminActivateSchema };
```

Wire via `validate(purchaseAddonSchema)` in the routes file ahead of the `idempotency` middleware (so a bad body short-circuits before the idempotency cache is touched).

### 2.7 Comment hygiene (backend)

Markers to remove:

- `addons.routes.js:17–19` — `FLOW-10-F03: idempotency on the canonical "external side effect" route. The middleware was already wired in Phase 1b; reaffirmed here alongside the activation pipeline.`
- `addons.routes.js:29–31` — `FLOW-10-F01: admin activation hook for business-customization addons. Audit-logged with the addon id so the manual provisioning step is traceable.` (the second sentence is fine as a `// why` comment if reworded — keep "audit-logged for ops traceability" only.)
- `addons.service.js:19–20` — `FLOW-10-F02.`
- `addons.service.js:39` — `FLOW-10-F01 / F02 / F03.`
- `addons.service.js:78–91` — long FLOW-10-F03 comment. Useful core (the *why* of not deriving a fallback key) is worth keeping; trim the FLOW-10 prefix and the procedural narration.
- `addons.service.js:95–98` — `§2.1: only paymentRecord is the source of truth.` Reword without the `§2.1` reference; the truth-statement is fine.
- `addons.service.js:113` — `purpose: 'addon' is the dispatch key used by webhook/reconcile/poll.` Keep — this is a legitimate "why" comment.
- `addons.service.js:228–236` — `B-4` block. The "money taken with no benefit" explanation is the right kind of comment; strip the `B-4` marker only.
- `addons.service.js:286` — `Compensating action:` — keep, drop the implicit phase reference.
- `addons.service.js:368–371` — `Audit log is emitted by the route-level auditLog middleware...` — keep, this is a legitimate why.
- `addons.service.js:419–428` — `B-4: record a "money taken, no benefit"...` Strip `B-4` marker.
- `addons.service.js:497–499` — `FLOW-10-F02: branch on scope...` Strip marker.
- `addons.service.js:519–521` — `Snapshot field is guestLimit ... per EventModel.js:278.` The line-number reference rots. Replace with "frozen from subscription at event creation".
- `AddonModel.js:20–26` — `FLOW-10-F01: ...` and `B-4: ...`. Strip both markers; rewrite the enum-comment as a plain description of each status.

---

## 3. Frontend Web Findings

### 3.1 Component tree per page

The host plans page is the only web surface that touches addons:

- `app/[lang]/host/plans/page.js` (server component, prefetches `useHostPlans` data — verified) → `PlansPage.js`
- `app/[lang]/host/plans/PlansPage.js` (288 lines — VIOLATION) imports:
  - `_components/CurrentPlanCard.js` — not addon-relevant
  - `_components/BillingTypeToggle.js` — not addon-relevant
  - `_components/AddonsSection.jsx` (239 lines — OK)
  - `_components/HostPlanCard.jsx` — not addon-relevant
  - `_components/PaymentMethodSelector.jsx` — not addon-relevant
  - `summary/Summary.js` (397 lines — VIOLATION)
  - `@/hooks/reactQueryHooks/usePlans` (`useHostPlans`)
  - `@/hooks/reactQueryHooks/useSubscriptions` (`useMySubscription`, `useSubscriptionMutation`)
  - `@/services/adminDashboard` (via Summary.js → `discountsAPI`)
  - `@/ui/common/loading/SimpleLoading`

Other surfaces that mention "addon" but do **not** consume the API:

- `services/adminDashboard.js:868–899` — defines `addonsAPI` (used only by `AddonsSection.jsx`).
- `app/[lang]/host/update-event/_hooks/useStepConfig.js`, `app/[lang]/host/create-event/_components/stepTwo/StepTwo.js`, `app/[lang]/host/create-event/_components/stepTwo/actionButtons/ActionButtons.js` — string-mention `"addon"` only, no API call. Out of scope.

### 3.2 File-size violations

- `app/[lang]/host/plans/PlansPage.js` — **288 lines** (cap 250). Proposed split:
  - Extract a hook `_hooks/usePlansPageState.js` for the 14 useState declarations + `buildSource` + `handleProceedToPayment` + `handleAddonsChange` + `handleSubscribe` + selectedInvites/feature derivation. Keeps the JSX section under cap.
  - **Style preservation note:** `styles.container`, `styles.pageHeader`, `styles.pageTitle`, `styles.backArrow`, `styles.pageSubtitle`, `styles.errorState`, `styles.content`, `styles.billingToggleWrap`, `styles.plansGrid`, `styles.infoNote`, `styles.infoIcon` must remain in the same `plans.module.css`. The hook extraction is logic-only and should not move any JSX or class reference.
- `app/[lang]/host/plans/summary/Summary.js` — **397 lines** (cap 250). Proposed split:
  - `summary/_components/PlanSummaryCard.js` (lines 158–231 — Plan Details card).
  - `summary/_components/DiscountCodeCard.js` (lines 233–288 — discount input + apply/remove handlers; lift the 4 discount-related useStates here or pass them down).
  - `summary/_components/PaymentSummaryCard.js` (lines 290–342).
  - `summary/_components/ProceedButton.js` (lines 363–390).
  - **Style preservation note:** Every `styles.<key>` reference (card, cardHeader, cardTitle, cardContent, planInfo, planIcon, planDetails, planName, planType, planPrice, priceAmount, priceCurrency, featuresSummary, featureItem, featureIcon, billingPeriod, billingLabel, billingValue, cardTitleIcon, discountInputWrapper, discountInput, discountApplied, discountError, applyButton, removeButton, discountSuccess, discountErrorMsg, summaryBreakdown, summaryRow, summaryLabel, summaryValue, discountRow, summaryValueDiscount, summaryDivider, totalRow, totalLabel, totalValue, managedBadge, proceedButton, processingText, totalBadge, termsNotice, container, backButton, header, headerContent, title, subtitle, content, mainSection) must continue to import the existing `summary.module.css`. Each extracted component imports `../summary.module.css`.
- `app/[lang]/host/plans/_components/AddonsSection.jsx` — 239 lines (cap 250). OK, but should be reduced anyway when:
  - Hardcoded tier arrays move to a shared source (or to the catalog hook).
  - Direct `addonsAPI.purchase` call moves to a `usePurchaseAddon` mutation hook.

### 3.3 Hardcoded text / data / paths

- **Hardcoded data (B3 violation):** `AddonsSection.jsx:9–31` — three constant arrays (`EXTRA_INVITES_TIERS`, `EXTRA_REMINDERS_TIERS`, `DESIGN_TEMPLATE_TIERS`) duplicate `labbe-backend-/src/shared/constants/addons.js`. Replace with `useAvailableAddons()` hook (see §3.5) once the GET /addons endpoint is wired. The `nameAr` text in `DESIGN_TEMPLATE_TIERS` is **not** identical to the backend's — backend says `"تصميم دعوات جاهزة (رجالي/نسائي)"`, web says `"تصميم جاهز (رجالي/نسائي)"`. Drift confirmed.
- **Hardcoded text (B2):** `AddonsSection.jsx:98, 121, 130–132, 200, 209, 210` — fallback strings are inline Arabic (`"اختر إضافة أولاً"`, `"فشل شراء الإضافة"`, `"تم شراء {{count}} إضافة"`, `"الإجمالي"`, `"شراء الإضافات المحددة"`, `"جارٍ المعالجة..."`). Replace with `t()` and add the missing locale keys (see §8). Note that the keys themselves (`addons.purchase.noneSelected` etc.) are already used in the mobile `plans.json` — port them to web verbatim.
- **Hardcoded text (B2):** `AddonsSection.jsx:170, 190, 229` — `{isAr ? "ر.س" : "SAR"}` repeated three times. Use a `t("currency", {context:isAr})` key or a tiny `useCurrency()` helper.
- **Hardcoded path (B7):** `services/adminDashboard.js:875, 885, 897` — `/addons/purchase`, `/addons/admin/${addonId}/activate`, `/addons${qs}` are string literals. Move to `services/new-backend/api.config.js` under a new `addons` namespace:
  ```js
  addons: {
    list: "/addons",
    purchase: "/addons/purchase",
    listMine: "/addons/my",
    adminActivate: (id) => `/addons/admin/${id}/activate`,
  }
  ```
  Then have the canonical `useAddons` hook (§3.5) read from `API_PATHS.addons.*`.
- **Hardcoded text in `Summary.js`:** lines 38, 55–69, 90–101, 130–141, 144–151, 161–179, 195–217, 222–229, 236–238, 245–246, 263–273, 277–282, 293–295, 300–305, 311–315, 321–326, 333–337, 348–349, 369–377, 386–390 — every user-facing string is `isArabic ? "..." : "..."`. The component does not call `useTranslation` at all (only reads `i18n.language`). Replace the entire `isArabic ? ar : en` pattern with `t()` per B2. Massive locale-key addition required (§8) — also matches what mobile `plans.summary.*` already provides.

### 3.4 Data mapping bugs / fallback chains

- `PlansPage.js:73` — `actualPlansData = plansData?.data || plansData;` — fallback chain hiding the canonical shape. After verifying `useHostPlans` returns the wrapped `{success, data}` envelope (see backend), pick `plansData?.data` and delete the fallback. (B0.1)
- `PlansPage.js:74–77` — `subscription = subscriptionData?.data?.subscription || subscriptionData?.subscription || null;` — same fallback chain. Backend returns `{ success, data: { subscription } }`; pick `subscriptionData?.data?.subscription || null`.
- `AddonsSection.jsx:45–47` — `notify(inv, rem, des)` aggregates a local cart and bubbles it up. No backend mapping bug here, but the parent `PlansPage` then **never sends `addonItems` to the backend** (it only displays them in `Summary.js`, which renders them but never POSTs them). The actual purchase happens inline in `AddonsSection.jsx` via `addonsAPI.purchase`. So the `addonItems` → `Summary` → `Summary.handlePayment` path is dead UX — purchase already happened. Verify intended flow with the user (§6).

### 3.5 Duplicate hooks / direct apiRequest calls

- `AddonsSection.jsx:6, 113` — direct `addonsAPI.purchase(sel, null, idempotencyKey)` call inside the component. Forbidden per B6 (no direct `apiRequest`/service calls in components). Create canonical hooks under `labbe/hooks/reactQueryHooks/useAddons.js`:
  ```js
  // useAvailableAddons() — GET /addons (catalog), staleTime 24h
  // useMyAddons(params) — GET /addons/my, staleTime 5min
  // usePurchaseAddon() — POST /addons/purchase, sets Idempotency-Key from a per-call uuid
  // useAdminActivateAddon() — POST /addons/admin/:id/activate (admin-only consumers)
  // useAddonMutation(action) — factory in the same file
  ```
  Migrate `AddonsSection.jsx` to call `usePurchaseAddon().mutateAsync(sel)`. Invalidate `["subscriptions","my"]` (so `usage.invitePool` updates) and `["addons","my"]` on success.
- `Summary.js:20` — direct `discountsAPI.validate(...)` call. **Out of scope** (this is `discounts` module's concern). Flag and move when the discounts module is reviewed.
- No duplicate hook exists today; the issue is **absence** of a canonical hook, not duplication.

### 3.6 State / loading / error gaps

- `AddonsSection.jsx:40` — `purchasing` is local `useState`. Once the canonical `usePurchaseAddon` mutation hook lands, replace with `mutation.isPending` (B10). Same for `purchasing` toggle on the button.
- `AddonsSection.jsx:138–142` — error path uses `toast.error(...)` from `react-toastify` directly, not via `toastUtils` or `handleError`. Replace per B8.
- `AddonsSection.jsx:115–123` — error message extraction uses `err?.response?.data?.message || err?.message` fallback chain. After moving to `usePurchaseAddon` + `handleError(error, t, { fallbackMessage })`, this collapses to a single `handleError` call.
- `PlansPage.js:223–236` — error UI is correct (loading + error branches both rendered). Keep.
- `Summary.js:97–105` — `catch {}` swallows the discount-validation error and shows a fallback message but `console`s nothing. Acceptable per D6 (no console + visible user feedback). Keep, but route through `handleError` once `discounts` module is reviewed.
- `Summary.js` does **not** wrap with `ErrorBoundary` (B19). Add when splitting.

### 3.7 Comment hygiene (web)

- `services/adminDashboard.js:854–857` — `H-14: Phase 2 subscription admin endpoints...` Strip H-14 prefix.
- `services/adminDashboard.js:867–871` — `H-14: Phase 2 addon endpoints — purchase + admin activate...` Strip H-14 prefix; keep the description sentence.
- `AddonsSection.jsx:55–71` — long `H-14 (BLOCKER fix): Phase 2 added a backend addons.purchase endpoint...` block. Trim to: "We send each selection as its own purchase call so per-item idempotency keys are preserved and a partial failure doesn't roll back successful charges." Drop the H-14 reference and the "Previously this component just bubbled selections up" historical note — git history holds that.
- `AddonsSection.jsx:196` — `// Purchase summary + CTA — H-14 wiring.` Delete.
- `PlansPage.js:146–148` — `// PassKit token sourcing is a separate mini-feature (§13 Q1).` Replace with a plain "applepay token left null until PassKit integration ships" or remove.
- `Summary.js:48, 53, 70–71, 116–123, 125–132, 191, 221, 233, 290, 344–361, 363–391` — many "Calculate totals", "Get plan display info", "Get billing period" etc. comments restate what the next 1–4 lines obviously do. Remove per B23.
- `Summary.js:46` — `selectedPaymentMethod` is set with `useState("card")` but never used (the actual state is in PlansPage). Dead useState — remove.

---

## 4. Frontend Mobile Findings

### 4.1 Screen → component tree

- `screens/host/PlansScreen.js` (264 lines — OK)
  - `components/plans/TopBar.js` — out of scope
  - `components/plans/CurrentPlanCard.js` — out of scope
  - `components/plans/HostPlanCard.js` — out of scope
  - `components/plans/AddonsSection.js` (**436 lines — VIOLATION**)
  - `components/plans/AddonServiceCard.js` (133 lines — OK; **unused**, see §4.5)
  - `components/plans/AddionalFeatures.js` (459 lines — exceeds 350 cap; **unused**, see §4.5)
  - hooks: `../../hooks` → `useHostPlans`, `useSubscription`
- `screens/common/update-event/StepTwo.js`, `screens/common/update-event/UpdateEventScreen.js` — string-mention only, no API call.

### 4.2 File-size violations

- `components/plans/AddonsSection.js` — **436 lines** (cap 350). Proposed split:
  - `components/plans/_addons/TierGrid.js` — the 5-button tier row (used twice for invites and reminders).
  - `components/plans/_addons/TemplateList.js` — design template list.
  - `components/plans/_addons/PurchaseRow.js` — purchase total + CTA.
  - Keep `AddonsSection.js` as the orchestrator (state + `purchaseSelected` + StyleSheet).
  - **Style preservation note:** every `StyleSheet.create({...})` value (section, heading, title, subtitle, card, cardHeader, cardName, cardDesc, tierRow, tierBtn, tierBtnActive, tierQty, tierQtyActive, tierPrice, tierPriceActive, templateList, templateBtn, templateBtnActive, templateName, templateNameActive, templateRight, purchaseRow, purchaseTotal, purchaseBtn, purchaseBtnDisabled, purchaseBtnText) must move verbatim into the extracted file's local `StyleSheet.create`. No rounding, no token swaps.
- `components/plans/AddionalFeatures.js` — 459 lines (cap 350). **DELETE** — unused (no importer; see §4.5). If kept for future use, split into `_addons/DropdownSelector.js` + `_addons/FeatureCard.js`.

### 4.3 Service / hook violations

- `services/adminDashboardService.js:287–306` — addons live inside a multi-domain admin service file. Per C1 ("each service file owns one domain") split into `halla-mobile/services/addonsService.js`. Re-export from `adminDashboardService.js` if any caller imports `addons` from there (today only `AddonsSection.js` imports it, so the move is clean).
- `services/adminDashboardService.js:25–58` (`apiRequest`) returns an envelope `{ success, data, error }` — does **not** throw on non-2xx. The mobile `addons.purchase` therefore returns `{success:false, error}` on HTTP 4xx/5xx, but `AddonsSection.js:117–127` does `try { await addonsAPI.purchase(...); succeeded += 1 } catch (err) {...}`. **A 400/500 from the backend is silently counted as success.** Two acceptable fixes:
  1. Refactor `addons.purchase` to use the canonical `apiFetch` + `_request` shape from C1 (throws on `!response.ok`).
  2. Have the caller check the returned envelope: `const r = await addonsAPI.purchase(...); if (!r.success) throw new Error(r.error)`.

  Recommend (1) — and migrate the rest of the addons calls (`adminActivate`, `listMine`) at the same time. This is the mobile equivalent of "stop using the legacy `_legacyToken`+envelope pattern".
- **No canonical hooks** for addons. Add `halla-mobile/hooks/queries/useAddons.js` (`useAvailableAddons`, `useMyAddons`) and `halla-mobile/hooks/mutations/useAddonMutations.js` (`useAddonPurchase`, `useAddonAdminActivate`). Migrate `AddonsSection.js` from `addonsAPI.purchase` to `useAddonPurchase().mutateAsync(...)`. Invalidate `["subscriptions"]` and `["addons"]` keys on success.
- `config/api.js` has **no** `ADDONS` block. Add:
  ```js
  ENDPOINTS.ADDONS = {
    BASE: "/addons",
    PURCHASE: "/addons/purchase",
    MY: "/addons/my",
    ADMIN_ACTIVATE: (id) => `/addons/admin/${id}/activate`,
  };
  ```
  Then services read from there, not string literals (C1).

### 4.4 Hardcoded text / data / paths

- `components/plans/AddonsSection.js:15–37` — three tier arrays duplicated. Same as §3.3 — replace with `useAvailableAddons()`.
- `components/plans/AddonsSection.js:177, 207, 220, 265` — `{isArabic ? "ر.س" : "SAR"}` four times. Single locale key.
- `components/plans/AddonServiceCard.js:52–131` — hardcoded hex colors (`#FFF`, `#E5E7EA`, `#C28E5C`, `#FFFBF7`, `#000`, `#2C2C2C`, `#656565`, `#8A6541`). Should reference `colors.*` from `styles/tokens.js`. **Out of scope** (file is currently unused — see §4.5 — and replacing tokens would change visual output if tokens differ, violating Core Rule). Flag only; do not change in this pass.

### 4.5 Web/Mobile divergence

- `GET /addons` — both clients have a `listMine`/`addons.listMine` wrapper with the same wrong behavior (calls catalog, not `/addons/my`). Both unused. Action: rename to `getCatalog` and add a separate `getMyAddons` wrapper that hits `/addons/my`.
- `POST /addons/purchase` — request body fields **agree**: `{ addonType, quantity, templateType, scope, eventId }`. Both clients send identical shapes. **Confirmed parity.**
- Idempotency-Key — both clients generate `addon-${type}-${uuid}`-style keys client-side and pass via the `Idempotency-Key` header. **Confirmed parity.**
- Tier text — web uses `nameAr`/`nameEn` from local hardcoded constants; mobile uses `t("addons.designTypes.<type>")` keys. After §8 lands the web locale keys, both should `t()`-render identically.
- Currency text — both inline `isAr ? "ر.س" : "SAR"`. Both should move to a `t()` key.
- Mobile `AddonServiceCard.js` and `AddionalFeatures.js` exist but are **not imported by any screen** (verified via Grep — only the `components/plans/index.js` re-exports them, and `index.js` itself is not imported anywhere — verify). Action: confirm with user, then delete both files.

### 4.6 Loading / error / empty states

- `screens/host/PlansScreen.js:91–101` — handles loading (full-screen ActivityIndicator) and an `error` toast effect. Empty state for `basicPlans.length === 0 && premiumPlans.length === 0` (line 142) renders `errors.noPlansAvailable`. **Adequate** for the plans section. The addons section itself never renders a loading or error state — when the catalog moves to a query (§4.3), add the standard 3-branch render.
- `components/plans/AddonsSection.js:128–141` — relies on per-item toast for errors (after the silent-failure bug in §4.3 is fixed). Acceptable; consider also showing a summary "N succeeded / M failed" toast for clarity.

### 4.7 Comment hygiene (mobile)

- `services/adminDashboardService.js:5–11` — `Phase 4 W0-AUTH: routed through apiFetch...` Strip `Phase 4 W0-AUTH:` marker; keep the explanation.
- `services/adminDashboardService.js:287–290` — `H-14: addon purchase (host) and admin activation...` Strip `H-14:` marker.
- `components/plans/AddonsSection.js` — currently has **no** FLOW/PHASE/H-14 markers visible in the body (clean). Only the `// Extra Invites`, `// Extra Reminders`, `// Purchase summary`, `// Design Template` section comments remain — all are restating the immediately following JSX block. Remove per C8.
- `components/plans/AddionalFeatures.js` — entire file is unused. Either delete or scrub.

---

## 5. Cross-Platform API Consumption Diff

| Endpoint | Aspect | Web | Mobile | Backend truth | Action |
|----------|--------|-----|--------|---------------|--------|
| GET /addons | Consumer | none (dead `addonsAPI.listMine` exists) | none (dead `addons.listMine` exists) | returns catalog | Either wire both to a `useAvailableAddons` hook (recommended) or delete both wrappers + the route |
| GET /addons | Wrapper name | `addonsAPI.listMine` (misnamed — calls catalog) | `addons.listMine` (misnamed) | catalog endpoint, not user list | Rename to `addonsAPI.getCatalog` / `addons.getCatalog` |
| GET /addons/my | Consumer | none | none | returns user's addon list | Add `useMyAddons` hook on both; show in a "my addons" UI surface (currently absent) |
| POST /addons/purchase | path | `/addons/purchase` (literal) | `/addons/purchase` (literal) | `/addons/purchase` | Move to `API_PATHS.addons.purchase` (web) and `ENDPOINTS.ADDONS.PURCHASE` (mobile) |
| POST /addons/purchase | body fields | `{addonType, quantity, templateType?, scope, eventId?}` | identical | matches `purchaseAddonSchema` | OK — confirmed parity |
| POST /addons/purchase | Idempotency-Key | client-generated uuid, header set in service helper | identical | required upstream by middleware (with scope `addons.purchase`) | OK — confirmed parity |
| POST /addons/purchase | error handling | try/catch + toast.error per item; no shared `handleError` | try/catch but **silent failure on non-2xx** (envelope not thrown) | service throws ValidationError, sends 400 | Web: route through `handleError`. Mobile: switch to throwing helper or check envelope |
| POST /addons/purchase | response.requiresAction | not handled — `addonsAPI.purchase` returns `data` and component drops the redirect | not handled — same | service returns `{requiresAction:true, redirectUrl, paymentId}` on 3DS | Both clients ignore the 3DS branch → host gets a "purchased" toast for an addon that does not exist yet. Confirmed bug, see §6 |
| POST /addons/admin/:id/activate | Consumer | `addonsAPI.adminActivate` defined, no UI driver | same on mobile | exists, audited | Either build admin UI (admin-dash) or document why it's curl-only |
| Tier catalog source | Source | hardcoded constants in `AddonsSection.jsx` | hardcoded constants in `AddonsSection.js` | `shared/constants/addons.js` | Single source of truth: backend `getAvailableAddons` + a shared client hook |
| Tier display text | Display | `tier.nameAr`/`tier.nameEn` baked in | `t("addons.designTypes.<type>")` | backend catalog has nameAr/nameEn | After locale parity (§8), web also uses `t(...)` |
| Currency unit | Display | `{isAr ? "ر.س" : "SAR"}` inline | `{isArabic ? "ر.س" : "SAR"}` inline | n/a | Single locale key (`common.currency.sar`) |

---

## 6. Suspected Bugs Worth Verifying

1. **3DS redirect path is silently swallowed by both clients.** Backend `purchaseAddon` returns `{ requiresAction: true, redirectUrl, paymentId }` with HTTP 200 when the payment provider needs 3DS. Web `addonsAPI.purchase` resolves with that body and `AddonsSection.jsx:113` does `await addonsAPI.purchase(sel, ...)` without inspecting `requiresAction`. The user is shown the "purchased" toast and the addons-selection state is reset (lines 134–138), but no redirect happens — the addon row is not created until `finalizePending3ds` runs on webhook. Mobile has the same bug. Compare with `useSubscriptionMutation` in `usePlans` which **does** handle `result?.requiresAction` and triggers `window.location` (PlansPage.js:161). **Action**: mirror that pattern in the new `usePurchaseAddon` hook (web) and the mobile equivalent.

2. **Mobile silent-failure on HTTP error** (already detailed in §4.3): a backend `400 ValidationError` is presented as a successful purchase to the user.

3. **`addons.routes.js:15`** — `router.get('/', getAvailableAddons);` is reachable without `protect`. The catalog has no PII so this is acceptable, but `req.user` is undefined inside the controller — confirm no future change accidentally reads it.

4. **`getMyAddons`** returns the entire history with `Addon.find({ userId }).sort({ createdAt: -1 })` — no `.lean()`, no `.limit()`, no pagination. For a host with 100s of addon purchases over the years this returns the whole list every call. Add `getPaginationFromQuery` and a sane cap.

5. **`_applyQuota` for `scope === 'event'`** — increments `event.guestLimit` only when the event has a finite guestLimit (`current === null || current === -1` → no-op). Correct for unlimited plans, but no audit-log entry records the no-op. A host could pay for `extra_invites` on an unlimited-plan event and silently get nothing back. Verify whether the guard at line 219–225 (rejects pool/org without subscription) covers the unlimited-event case as well — it does **not**. Suggest adding a parallel guard in `_resolveScope` or `purchaseAddon`: when `scope === 'event'` and the target event already has unlimited capacity, refuse the purchase before charging.

6. **Mobile `crypto.randomUUID` guard** (`AddonsSection.js:39–46`) — React Native's `crypto` global may exist but lack `randomUUID` on older Hermes versions. The fallback `Date.now() + Math.random()` is acceptable but produces a key that is not unique under high-concurrency tests. Low priority — flag and keep.

7. **Web `addonsAPI.listMine` query string** (`services/adminDashboard.js:893–898`) — appends `?status=active&...` etc. to `/addons` (catalog), which the backend silently ignores. If anyone added consumers expecting it to filter "my purchased" addons, those consumers would receive the catalog. Either rename + reroute or delete.

8. **Idempotency middleware scope** — backend uses `idempotency({scope: 'addons.purchase'})` and the service additionally derives `derivedKey = ... || addon:${userId}:${addonType}:${scope}:${eventId||'pool'}:${price}` to pass to the payment provider. Two layers of dedup with different keyspace. Verify with the user that this is intentional (per the long comment at addons.service.js:78–91 it is) and document in the new Swagger block.

9. **`AddonModel.js`** has no compound index for `{userId, status}` queries vs the existing single-field indexes (`userId`, `status` separately). The `getMyAddons` query on `{userId}` uses the userId index. Acceptable today; flag if `status`-filtered "my addons" lists are added.

10. **`Summary.js` flow disconnect** — the addons cart is bubbled from `AddonsSection.jsx` to `PlansPage.js` to `Summary.js` for display, but `AddonsSection.jsx` already POSTs each item synchronously when "Purchase selected" is clicked, **before** `Summary` is rendered. Result: by the time the user hits Summary's "Activate Subscription", the addons are already paid for. Either:
    - The summary view should render addons as "already purchased" (read from `useMyAddons`), OR
    - The purchase trigger should move from `AddonsSection.jsx` into the Summary's `handlePayment` flow so plan + addons are charged together.

    This is a UX/flow design decision, not a code-quality decision — surface to user.

---

## 7. Implementation Plan (Ordered)

Apply changes in this order. Each item ends with a checkbox the agent will tick during Phase 2.

### 7.A Backend

- [ ] **A.1** Create `labbe-backend-/src/modules/addons/addons.validation.js` with `purchaseAddonSchema` and `adminActivateSchema` (§2.6).
- [ ] **A.2** Wire `validate(purchaseAddonSchema)` and `validate(adminActivateSchema)` in `addons.routes.js`. Add `validateObjectId('id')` to the admin route.
- [ ] **A.3** Refactor `addons.controller.js`: replace `try/catch + next(err)` with `catchAsync`; replace raw `res.status().json()` with `sendSuccess` / `sendCreated`; preserve the 200-vs-201 distinction for the 3DS branch.
- [ ] **A.4** Replace `console.error`/`console.warn` in `addons.service.js` with `logger.error`/`logger.warn` (lines 155, 446, 489, 493). Remove the `eslint-disable no-console` comments.
- [ ] **A.5** Replace string literal `'host'` with `ROLES.HOST` in `logAudit` calls (`addons.service.js:319, 457, 661`).
- [ ] **A.6** Replace `paymentRecord.save().catch(() => {})` (lines 152, 259) with logged catches.
- [ ] **A.7** Add pagination to `getMyAddons` via `getPaginationFromQuery`; cap to 100.
- [ ] **A.8** Add a public-route justification comment on `router.get('/', ...)` in `addons.routes.js`.
- [ ] **A.9** Add Swagger schemas (`AddonCatalog`, `AddonPurchaseRequest`, `Addon`, `AddonPurchaseResponse`, `Addon3DSResponse`, `AdminActivateRequest`) to `config/swagger.js`. Add `@swagger` JSDoc blocks above each route in `addons.routes.js`.
- [ ] **A.10** Split `addons.service.js` (682 → ≤600) per §2.1. The façade keeps `module.exports = new AddonsService()` and re-exports the public methods so payment-module callers don't change.
- [ ] **A.11** Comment hygiene pass: strip FLOW-10-Fxx / B-4 / §-references from `addons.routes.js`, `addons.controller.js`, `addons.service.js`, `models/AddonModel.js` per §2.7. Keep "why" comments (idempotency dual-layer rationale, compensating-action rationale, audit-middleware reads `res.locals.addonAudit`).
- [ ] **A.12** Add a guard in `purchaseAddon` (or `_resolveScope`) that rejects an event-scoped `extra_invites` purchase when the target event has unlimited capacity (`guestLimit === null || guestLimit === -1`). See §6 #5.

### 7.B Web

- [ ] **B.1** Add `addons` namespace to `labbe/services/new-backend/api.config.js` per §3.3.
- [ ] **B.2** Create `labbe/hooks/reactQueryHooks/useAddons.js` with `useAvailableAddons`, `useMyAddons`, `usePurchaseAddon`, `useAdminActivateAddon`, `useAddonMutation` factory (§3.5).
- [ ] **B.3** Migrate `AddonsSection.jsx` to consume `useAvailableAddons` (replacing the three hardcoded tier arrays) and `usePurchaseAddon` (replacing the direct `addonsAPI.purchase` call).
- [ ] **B.4** Handle `result?.requiresAction` in `usePurchaseAddon` consumers (mirror PlansPage.js:161 pattern). Redirect via `window.location.href = result.redirectUrl` and skip the success toast. **(Bug fix — see §6 #1.)**
- [ ] **B.5** Add web locale keys per §8 (`addons.purchase.*`, `addons.designTypes.*`, plus `summary.*` to support the Summary refactor and a `common.currency.sar` key). **Wait for user approval before editing locale JSON.**
- [ ] **B.6** Replace the hardcoded `isArabic ? ar : en` strings in `AddonsSection.jsx` and `Summary.js` with `t()` calls. Use the existing `useTranslation("plans")` (already imported in `AddonsSection.jsx`) and add `useTranslation` to `Summary.js`.
- [ ] **B.7** Replace `toast.error/success` from `react-toastify` with `toastUtils` + `handleError(err, t, {fallbackMessage})` per B8.
- [ ] **B.8** Split `Summary.js` (397 → ≤250) into `_components/PlanSummaryCard.js`, `_components/DiscountCodeCard.js`, `_components/PaymentSummaryCard.js`, `_components/ProceedButton.js`. **Preserve every CSS-module class reference verbatim** by importing the same `summary.module.css` in each extracted file.
- [ ] **B.9** Wrap the exported `Summary` (or its parent in `PlansPage`) in `<ErrorBoundary>` per B19.
- [ ] **B.10** Split `PlansPage.js` (288 → ≤250) by extracting `_hooks/usePlansPageState.js`. Keep all JSX in `PlansPage.js` so the visual tree is unchanged. **Preserve `plans.module.css` references verbatim.**
- [ ] **B.11** Replace the fallback chains at `PlansPage.js:73, 74–77` with the canonical paths after verifying the backend response shape (B0.1).
- [ ] **B.12** Remove the unused `selectedPaymentMethod` useState in `Summary.js:46`.
- [ ] **B.13** Comment hygiene pass: 9 markers/blocks per §3.7.
- [ ] **B.14** Decide with user (after green light, before code change): keep "purchase happens in `AddonsSection`" (current behavior, just fix toast/redirect) **OR** move the purchase trigger into Summary's `handlePayment` so plan + addons are bundled. See §6 #10.

### 7.C Mobile

- [ ] **C.1** Add `ENDPOINTS.ADDONS` to `halla-mobile/config/api.js` per §4.3.
- [ ] **C.2** Create `halla-mobile/services/addonsService.js` using the canonical `apiFetch` + `_request` pattern from `ticketsService.js` (throws on non-2xx). Migrate `getCatalog`, `getMyAddons`, `purchase`, `adminActivate` here. Keep `addons` re-export from `adminDashboardService.js` so any forgotten caller keeps working — then remove that re-export in a follow-up.
- [ ] **C.3** Create `halla-mobile/hooks/queries/useAddons.js` (`useAvailableAddons`, `useMyAddons`) and `halla-mobile/hooks/mutations/useAddonMutations.js` (`useAddonPurchase`, `useAddonAdminActivate`). Both `enabled: !!token`, both with mandatory `staleTime`, both with `onSuccess` invalidating `["subscriptions"]` and `["addons"]`.
- [ ] **C.4** Migrate `components/plans/AddonsSection.js` to consume `useAvailableAddons` (replacing the three hardcoded tier arrays) and `useAddonPurchase` (replacing direct `addonsAPI.purchase`). Drop the local `purchasing` useState; use `mutation.isPending`.
- [ ] **C.5** Handle `result?.requiresAction` in mobile `useAddonPurchase` consumers — open the redirect URL via `Linking.openURL(redirectUrl)`. **(Bug fix — see §6 #1.)**
- [ ] **C.6** Confirm with user: delete `halla-mobile/components/plans/AddionalFeatures.js` and `halla-mobile/components/plans/AddonServiceCard.js` (both unused). If kept, split `AddionalFeatures.js` (459 → ≤350).
- [ ] **C.7** Split `components/plans/AddonsSection.js` (436 → ≤350) into `_addons/TierGrid.js`, `_addons/TemplateList.js`, `_addons/PurchaseRow.js`. **Preserve every `StyleSheet.create` value verbatim** in the new files.
- [ ] **C.8** Replace `{isArabic ? "ر.س" : "SAR"}` instances with a single `t()` call (mobile already has the `plans` namespace; key `common.currency.sar` to be added).
- [ ] **C.9** Comment hygiene pass: strip `Phase 4 W0-AUTH:`, `H-14:` markers from `services/adminDashboardService.js`. Remove section restating `// Extra Invites` etc. comments in `AddonsSection.js`.

### 7.D Cross-platform alignment (do AFTER A/B/C)

- [ ] **D.1** Verify both `useAvailableAddons` (web) and `useAvailableAddons` (mobile) hit `GET /addons` and surface the same catalog. Compare with `npm run` test smoke / a dev-server hit.
- [ ] **D.2** Verify both `usePurchaseAddon` (web) and `useAddonPurchase` (mobile) send the same body shape and handle `requiresAction` redirect identically.
- [ ] **D.3** Re-grep both clients for `/addons` literal — should be zero matches outside `api.config.js` / `config/api.js`.
- [ ] **D.4** Re-grep for the `EXTRA_INVITES_TIERS` / `EXTRA_REMINDERS_TIERS` / `DESIGN_TEMPLATE_TIERS` constants — should remain only in backend `shared/constants/addons.js`.
- [ ] **D.5** Re-grep for `FLOW-10`, `H-14:`, `B-4:`, `Phase 4 W0`, `§2.1`, `§13 Q1` markers — should be zero.
- [ ] **D.6** Run `npm run lint` in `labbe-backend-`, `labbe`, `halla-mobile` (or whatever the project standard is). No new warnings.
- [ ] **D.7** Visual smoke test (manual): open `/host/plans` on web with a host account; open the Plans tab on mobile; select one of each addon type; confirm purchase succeeds, succeeds-via-3DS-redirect, and 400-on-bad-input all behave correctly.

---

## 8. Locale-key additions required

(Listed for the user — agent does NOT modify locale JSON without explicit approval.)

### Web — `labbe/localization/locales/{en,ar}/plans.json`

Under `addons`, add:

- `addons.purchase.total` (en: "Total", ar: "الإجمالي")
- `addons.purchase.cta` (en: "Purchase selected add-ons", ar: "شراء الإضافات المحددة")
- `addons.purchase.processing` (en: "Processing...", ar: "جارٍ المعالجة...")
- `addons.purchase.noneSelected` (en: "Select an add-on first", ar: "اختر إضافة أولاً")
- `addons.purchase.success` with `count` interpolation (en: "{{count}} add-on(s) purchased", ar: "تم شراء {{count}} إضافة")
- `addons.purchase.error` (en: "Failed to purchase add-on", ar: "فشل شراء الإضافة")
- `addons.designTypes.ready_made` (en: "Ready-made design", ar: "تصميم دعوات جاهزة (رجالي/نسائي)")
- `addons.designTypes.custom_male` (en: "Custom male design", ar: "تصميم دعوات رجالية مخصصة")
- `addons.designTypes.custom_themed` (en: "Themed custom design", ar: "تصميم دعوات حسب ثيم المناسبة")
- `addons.designTypes.animated` (en: "Animated background design", ar: "تصميم دعوات بخلفيات متحركة")
- `addons.designTypes.3d` (en: "3D invitation design", ar: "تصميم دعوات ثلاثية الأبعاد (3D)")

For the Summary refactor (B.6 / B.8):

- `summary.title` (en: "Order Summary", ar: "ملخص الطلب")
- `summary.subtitle` (en: "Review your order before payment", ar: "راجع طلبك قبل إتمام الدفع")
- `summary.back` (en: "Back", ar: "رجوع")
- `summary.planDetails` (en: "Plan Details", ar: "تفاصيل الباقة")
- `summary.planFamilyBadges.basic` (en: "Basic", ar: "بيسك")
- `summary.planFamilyBadges.premium` (en: "Premium", ar: "بريميوم")
- `summary.singleEvent` (en: "Single Event", ar: "مناسبة واحدة")
- `summary.invitePoolLabel` (en: "{{count}} invites (pool)", ar: "{{count}} دعوة (شهري)")
- `summary.invitesLabel` (en: "{{count}} invites", ar: "{{count}} دعوة")
- `summary.unlimitedEvents` (en: "Unlimited events", ar: "مناسبات غير محدودة")
- `summary.singleEvent90Days` (en: "1 event — 90 days", ar: "مناسبة واحدة — 90 يوم")
- `summary.compensationInvitesLabel` (en: "{{count}} compensation invites", ar: "{{count}} دعوات تعويضية")
- `summary.billingPeriodLabel` (en: "Billing Period:", ar: "فترة الاشتراك:")
- `summary.periods.monthly` (en: "30 days", ar: "30 يوم")
- `summary.periods.event` (en: "90 days (1 event)", ar: "90 يوم (مناسبة واحدة)")
- `summary.discount.title` (en: "Discount Code", ar: "كود الخصم")
- `summary.discount.placeholder` (en: "Enter discount code", ar: "أدخل كود الخصم")
- `summary.discount.apply` (en: "Apply", ar: "تطبيق")
- `summary.discount.remove` (en: "Remove", ar: "إزالة")
- `summary.discount.success` with `code` and `amount` interpolation (en: "✓ Code \"{{code}}\" — {{amount}} SAR off", ar: "✓ كود \"{{code}}\" — خصم {{amount}} ر.س")
- `summary.discount.invalidDefault` (en: "Invalid discount code", ar: "كود الخصم غير صالح")
- `summary.discount.networkError` (en: "Could not verify code. Please try again", ar: "تعذر التحقق من الكود. حاول مرة أخرى")
- `summary.payment.title` (en: "Payment Summary", ar: "ملخص الدفع")
- `summary.payment.planPrice` (en: "Plan Price", ar: "سعر الباقة")
- `summary.payment.discount` (en: "Discount", ar: "الخصم")
- `summary.payment.total` (en: "Total", ar: "الإجمالي")
- `summary.payment.method` (en: "Payment Method", ar: "طريقة الدفع")
- `summary.proceed.cta` (en: "Activate Subscription", ar: "تفعيل الاشتراك")
- `summary.proceed.processing` (en: "Activating...", ar: "جاري التفعيل...")
- `summary.terms` (en: "By clicking Complete Payment, you agree to our Terms of Service and Privacy Policy", ar: "بالضغط على إتمام الدفع، أنت توافق على شروط الخدمة وسياسة الخصوصية")
- `addonItems.extra_invites` with `quantity` interpolation (en: "Extra Invites +{{quantity}}", ar: "دعوات إضافية +{{quantity}}")
- `addonItems.extra_reminders` with `quantity` interpolation (en: "Extra Reminders +{{quantity}}", ar: "تذكيرات إضافية +{{quantity}}")
- `addonItems.design_template` (en: "Design Template", ar: "تصميم الدعوة")

### Web — `labbe/localization/locales/{en,ar}/common.json`

- `currency.sar` (en: "SAR", ar: "ر.س")

### Mobile — `halla-mobile/localization/locales/{en,ar}/plans.json`

Mobile already has `addons.purchase.*` and `addons.designTypes.*`. Confirm parity with the web keys above (the Arabic text for design types should match the backend `addons.js` constants — currently mobile has shorter strings; agent should propose updating mobile to match the longer backend strings, or vice versa, in the implementation phase).

### Mobile — `halla-mobile/localization/locales/{en,ar}/common.json`

- `currency.sar` (en: "SAR", ar: "ر.س")

---

## 9. Rollback plan

Each of the §7 items is committed independently and can be reverted via `git revert <sha>`. Items that span backend + frontend (e.g. wiring `useAvailableAddons`) ship as a single commit so revert leaves no broken consumer.

DB shape: no migrations are introduced. The only persisted-data behavior change (A.7 pagination) is read-side; the only schema-touching change (A.11 `AddonModel.js` comment cleanup) is comments only. No special rollback needed.

---

## 10. Acceptance checklist (run after Phase 2)

- [ ] No file in module exceeds the cap.
  - [ ] `addons.service.js` ≤ 600.
  - [ ] `PlansPage.js` ≤ 250.
  - [ ] `Summary.js` ≤ 250.
  - [ ] `components/plans/AddonsSection.js` ≤ 350.
- [ ] Every endpoint in `addons.routes.js` has a current `@swagger` block.
- [ ] No duplicate endpoints remain (none expected — this module is small).
- [ ] Web + Mobile call the same paths with the same body shapes for every endpoint (D.1–D.4).
- [ ] No fallback chains (`a?.x || b?.y || ...`) in addons-touching files outside true API boundaries.
- [ ] No `// FLOW-10-…` / `// PHASE-…` / `// H-14:` / `// B-4:` / `// W0-…` markers in addons-touching files.
- [ ] Mobile `addons.purchase` failure correctly throws (or the consumer checks the envelope) — verified by a manual 400 trigger.
- [ ] 3DS redirect path: web redirects via `window.location`, mobile via `Linking.openURL`.
- [ ] Web `plans.json` has the `addons.purchase.*`, `addons.designTypes.*`, and `summary.*` keys; both languages present.
- [ ] `npm run lint` clean (or no new warnings introduced) in `labbe-backend-`, `labbe`, `halla-mobile`.
- [ ] Visual smoke test: `/host/plans` (web) and Plans tab (mobile) render identically before/after the refactor — same colors, same spacing, same fonts, same RTL layout.
