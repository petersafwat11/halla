# plans — Full-Stack Review Plan

**Module:** plans
**Generated:** 2026-05-07
**Prompt:** docs/implementation/MODULE_FULLSTACK_REVIEW_PROMPT.md
**Status:** Awaiting green light · NOT IMPLEMENTED YET

---

## 0. Executive Summary

- **9 endpoints** in module (3 admin, 6 public).
- **1 endpoint marked DELETE** (`/plans/enterprise` — backward-compat alias of `/plans/business`).
- **1 dead controller export** (`getEnterprisePlans` is exported but never wired to a route).
- **6 Swagger drift findings** (4 admin endpoints have NO `@swagger` block; the shared `Plan` schema in `config/swagger.js` is stale; `business`/`host` response objects are typed as `data: object` with no detail).
- **0 backend file-size violations** (largest file is `plans.service.js` at 370 / cap 600).
- **6 web file-size violations** (`PlansPage.js` 288, `Summary.js` 397, `EditPlanPopup.js` 326, `StepFive.js` 391; under cap but rendered: `AddonsSection.jsx` 239 — fine).
- **1 mobile file-size violation** in the plans component tree rendered by `PlansScreen` — `HostPlanCard.js` 414 / cap 350. (Original plan-doc claims about `AddonsSection.js` 436 and `PaymentSummery.js` 481 are corrected per L10/L11: `AddonsSection.js` is actually 338 lines — under cap; `PaymentSummery.js` is orphaned and gets deleted entirely, not split. `AddionalFeatures.js` does not exist.)
- **Web/mobile API consumption mismatches:** 7 (see §5).
- **Data mapping bugs / fallback chains:** 18+ instances across 8 files (see §3.4 / §4.5).
- **Missing/incorrect RBAC / validation / audit-log / idempotency:**
  - All write endpoints use `restrictTo(ROLES.SUPER_ADMIN)` instead of `requirePageAccess(ADMIN_PAGES.MANAGE_PLANS, ...)` (A4.2).
  - No Joi `validate(...)` on `POST /plans/admin` or `PATCH /plans/admin/:code` — service layer does ad-hoc `if (!data?.x) throw ValidationError`.
  - No `idempotency` middleware on `POST /plans/admin` (low risk: not externally chargeable, but A4.5 still recommends).
  - No body validation file (`plans.validation.js` does not exist).
- **Comment-hygiene blocks to remove:** `FLOW-08-F01`, `FLOW-08-F02`, `FLOW-08-F03`, `FLOW-04-F03`, `M-18`, `H-14`, `B-2`, `Phase 4 W0-AUTH` markers in routes, service, model, mobile service, web `adminDashboard` service.
- **Parallel data-layer found:** `labbe/services/adminDashboard.js` exposes `plansAPI` (8 functions) calling raw paths in parallel to the React-Query hooks in `usePlans.js` / `useAdmin.js`. Used by `EditPlanPopup.js` (and contains 2 dead calls — `getByCode` and `bulkUpdate` — that hit non-existent backend endpoints).
- **Estimated effort:** **L** (large). The module itself is small, but its consumer fan-out (8 web files, 4 mobile files) and the EditPlanPopup form-shape mismatch require careful refactor + verification.

---

## 0.5 Locked Decisions (2026-05-08)

These supersede any conflicting language earlier in the doc. They are the source of truth for §7.

| # | Topic | Decision |
|---|-------|----------|
| L1 | **Validation library** | **Zod**, never Joi. Backend schema at `labbe-backend-/src/modules/plans/plans.schemas.js`, mounted via the `validateZod` middleware (`shared/middlewares/validation.js:373`). Web mirror at `labbe/utils/schemas/planSchema.js`. |
| L2 | **`/plans/enterprise` endpoint** | **Delete** — but only after all 13 consumers (8 web + 5 mobile, listed in §3.5 / §4.3) migrate to `useBusinessPlans`. Migration sequence enforced in §7.D. |
| L3 | **EditPlanPopup form fields** | Full spec frozen — see §7.B.8 for the 9-section field list (Identity read-only, Naming, Description, Pricing, Limits, Feature toggles, Feature numerics, Display, Visibility). ~37 fields total, all in the backend update whitelist. |
| L4 | **Locale namespace for admin plans page** | **Extend `admin.managePlans.*`** (admin.json already has `admin.taqnyat.*` and `admin.templates.*` sub-namespaces — same pattern). Host page uses existing `plans.*`; whitelabel signup uses existing `signup.signupForm.whiteLabel.*`. |
| L5 | **Mobile SubscriptionModal request shape** | **Flatten** to match web + backend canonical shape: `{ hostId, planCode, status?, billingCycle? }`. Drop the `subscriptionData: { ... }` envelope. |
| L6 | **`PlanModel.statics.getOrCreateByCode`** | **Keep** — 8 production callers found (signup ×2, checkout, users, subscriptions ×4). Add a production guard: when `NODE_ENV === 'production'` and the lookup misses, throw `Plan '${code}' missing — DB seeding incomplete` instead of auto-creating. Eliminates the "hidden write from a read path" concern while preserving dev/test convenience. |
| L7 | **`_guardLimitReductions` race** | **Wrap in Mongo transaction now** (read + write in one session). Not deferred. |
| L8 | **Mobile whitelabel billing toggle** | **Drop the toggle.** Show all three groups (event/quarterly/annual) like web's StepFive. Backend `/business` does not provide monthly/yearly grouping. |
| L9 | **Plan dropdown in admin SubscriptionModals** | **Data-driven from `useAdminPlans()`** on both web (`HostSubscriptionPopup`) and mobile (`SubscriptionModal`). No hardcoded plan-code lists. No manual "trial" UI option needed — trial auto-assigned at signup (`auth.service.js:421-425, :820-824`); `trial` plan appears in the dropdown automatically if seeded in DB. |
| L10 | **Mobile `PaymentSummery.js`** | **Delete entirely** (orphaned, 481 lines, no consumers; both summary screens use the clean `PaymentSummaryCard.js` instead). Drop `index.js:2` export. **No rename, no split.** `AddionalFeatures.js` does not exist — drop from scope. |
| L11 | **Mobile `AddonsSection.js` size** | **NOT a violation.** File is 338 lines (under the 350 cap). Plan-doc original 436-line claim was incorrect. **No split needed.** |
| L12 | **Locale key edits** | **Pre-approved** — agent may add new keys to `labbe/localization/locales/{en,ar}/{admin,plans,signup}.json` and the equivalent mobile files without further confirmation. |
| L13 | **Rate limiter on `POST /plans/admin`** | **Skip.** Behind `protect + requirePageAccess(MANAGE_PLANS)`. |
| L14 | **EditPlanPopup rebuild rollout** | **Hard cutover, no feature flag.** Current form persists ~10% of submitted fields silently. Nothing worth A/B-preserving. |
| L15 | **Plans query staleTime** | **5 minutes everywhere** (web + mobile, all hooks). Mobile currently uses 10 min in `hooks/queries/usePlans.js` — align down. |
| L16 | **Drop `tier`** | Not in `PlanModel`, not a real field. Remove from `safeUpdate` whitelist (`plans.service.js:203-207`) AND from sort keys in `getActivePlans` / `getAllPlansAdmin` (`plans.service.js:19,117`). |

---

## 1. Endpoint Inventory

Mounted at `${API_PREFIX}/plans` from `src/app.js:220`.

| # | Method | Path | Controller | Service | Middleware chain | Swagger | Web hook | Mobile hook | Status |
|---|--------|------|------------|---------|------------------|---------|----------|-------------|--------|
| 1 | GET | /plans | `getPlans` | `getActivePlans` | (public) | OK | `usePlans` (×3 places) | `usePlans` | KEEP |
| 2 | GET | /plans/business | `getBusinessPlans` | `getBusinessPlans` | (public) | DRIFT (response typed as bare `object`) | `useBusinessPlans` | — | KEEP |
| 3 | GET | /plans/enterprise | `getBusinessPlans` (alias) | `getBusinessPlans` | (public) | DRIFT (calls itself "enterprise" but proxies to business) | `useEnterprisePlans` (×3 places) | `useEnterprisePlans` (×2 places) | DELETE-DUPLICATE-OF-#2 |
| 4 | GET | /plans/host | `getHostPlans` | `getHostPlans` | (public) | DRIFT (response typed as `data: object` array) | `useHostPlans` (×2 places) | `useHostPlans` | KEEP |
| 5 | GET | /plans/code/:code | `getPlanByCode` | `getPlanByCode` | (public) | OK | `usePlanByCode` | `usePlanByCode` | KEEP |
| 6 | GET | /plans/:id | `getPlanById` | `getPlanById` | `validateObjectId('id')` (public) | OK | `usePlan` | `usePlanById` | KEEP |
| 7 | GET | /plans/admin/all | `getAllPlansAdmin` | `getAllPlansAdmin` | `protect`, `restrictTo(SUPER_ADMIN)` | **MISSING** | `useAdminPlans` | — | KEEP (fix RBAC + Swagger) |
| 8 | POST | /plans/admin | `createPlan` | `createPlan` | `protect`, `restrictTo(SUPER_ADMIN)`, `auditLog(plan.created)` | **MISSING** | — (`plansAPI.createPlan` only) | — | KEEP (fix RBAC + add Joi + Swagger + add hook) |
| 9 | PATCH | /plans/admin/:code | `updatePlanByCode` | `updatePlanByCode` | `protect`, `restrictTo(SUPER_ADMIN)`, `auditLog(plan.updated)` | **MISSING** | `useAdminPlanMutation` | — | KEEP (fix RBAC + add Joi + Swagger) |
| 10 | DELETE | /plans/admin/:code | `deletePlan` | `deletePlanByCode` | `protect`, `restrictTo(SUPER_ADMIN)`, `auditLog(plan.deactivated)` | **MISSING** | — (`plansAPI.deletePlan` only) | — | KEEP (fix RBAC + Swagger + add hook) |

**Legend:** KEEP, DELETE-DUPLICATE-OF-#N, RENAME, MERGE-WITH-#N

**Controller-only dead exports:** `plans.controller.getEnterprisePlans` (line 33) — exported but no route binds to it. Delete.

**Frontend-only dead paths:** `API_PATHS.plans.adminGetByCode` (line 336) and `services/adminDashboard.plansAPI.getByCode` / `plansAPI.bulkUpdate` — backend has NO `GET /plans/admin/:code` and NO `PATCH /plans/admin/bulk-update`. Delete from `api.config.js` and `adminDashboard.js`.

---

## 2. Backend Findings

### 2.1 File-size violations
None. All files within the per-file caps (A8): routes 242/400, controller 117/300, service 370/600.

### 2.2 Swagger drift
- **`GET /plans/admin/all`, `POST /plans/admin`, `PATCH /plans/admin/:code`, `DELETE /plans/admin/:code`** — no `@swagger` block at all. (`plans.routes.js:25-92`). Add full blocks; reference `Plan` schema for request/response.
- **`GET /plans/business`** (`plans.routes.js:122-142`) — response typed `data: { type: object }` with no shape detail. Real shape is `{ event: Plan[], quarterly: Plan[], annual: Plan[], setupFeeRequired: boolean, setupFeeAmount: number }`. Fix with a new `BusinessPlansResponse` component schema.
- **`GET /plans/enterprise`** (`plans.routes.js:144-156`) — JSDoc says "backward compat — use /business" but exposes the same shape with no body schema. Either delete the endpoint (preferred — it duplicates #2) or replace its JSDoc with `deprecated: true` and a `$ref` to `BusinessPlansResponse`. The plan recommends deletion.
- **`GET /plans/host`** (`plans.routes.js:158-181`) — response typed as `array of Plan`, but actual shape is `{ basic: { event: Plan[], monthly: Plan[] }, premium: { event: Plan[], monthly: Plan[] } }`. Replace with `HostPlansResponse`.
- **`GET /plans` and `GET /plans/code/:code` and `GET /plans/:id`** — schemas reference `#/components/schemas/Plan` which is **stale** (`config/swagger.js:384-440+`):
  - The `type` field is enum `['single_event', 'monthly', 'enterprise']` — actual model uses `planType` enum `['trial', 'basic_event', 'basic_monthly', 'premium_event', 'premium_monthly', 'business_event', 'business_quarterly', 'business_annual', 'unlimited']`.
  - Plan schema has no `pricing.oneTime` SAR-major-units note, no `availableFor`, no `planFamily`, no `billingType`, no `featuresArray` (a synthetic field added in `_formatPlan`).
- **No `tags` block reuse:** the routes file declares `tags: [Plans]` once (good), but admin endpoints have no tags at all once Swagger is added — will land under default tag. Use `tags: [Plans]` everywhere.

### 2.3 Missing middleware / safeguards
- **A4.2 RBAC violation:** `restrictTo(ROLES.SUPER_ADMIN)` on all 4 admin routes. Should be `requirePageAccess(ADMIN_PAGES.MANAGE_PLANS, "view"|"create"|"update"|"delete")`. The constant exists (`shared/constants/permissions.js:62`, `MANAGE_PLANS` access matrix is already wired). Functionally equivalent today (only `SUPER_ADMIN` has `MANAGE_PLANS = FULL`), but the convention prevents future drift.
- **A4.4 body validation:** `POST /plans/admin` and `PATCH /plans/admin/:code` rely on the service's hand-written `if (!data?.code) throw new ValidationError(...)` chain (`plans.service.js:131-141`). Add a Joi `plans.validation.js` with `createPlanSchema` + `updatePlanSchema`, mounted with `validate(schema)`. Schemas should mirror `PlanModel` enums (`planType`, `availableFor`, `currency`, `billingType`, `planFamily`) and the SAR 2-decimal rule on `pricing.oneTime`.
- **A4.5 rate-limiting:** none of the admin endpoints have a limiter. Low priority — they sit behind `protect + SUPER_ADMIN` — but A4.5 says "any externally-triggerable expensive endpoint" should have one. Optional.
- **A3.10 transaction safety:** `_guardLimitReductions` reads `Subscription.find` and then `Plan.findOneAndUpdate`. There's no race protection between checking subscriber breaches and writing the new limit. If a host subscribes between the read and the write, they could end up over the new ceiling. Wrap the read+write in a Mongo session/transaction. **Flag — not in MVP, but document.**
- **A3.4 indexes:** `getAllPlansAdmin` sorts by `{ sortOrder, tier, createdAt }`, but **`tier` is not a field on the schema** (only `sortOrder` and a `priorityPoints` exists inside `features`). Sort key is silently ignored. Either remove `tier` from the sort order in `getActivePlans` (line 19) and `getAllPlansAdmin` (line 117), or add a `tier` field to `PlanModel`. Recommend dropping the key.
- **A6 audit logs:** already present via route-level middleware. ✅
- **Admin queries:** `getActivePlans` returns ALL active plans regardless of `availableFor`. The public `/plans` endpoint will leak `platform_admin` plans (if any are seeded as `isActive: true` and `availableFor: 'platform_admin'`). Add `availableFor: { $ne: 'platform_admin' }` to the filter. **Flag.**

### 2.4 Duplicate / dead endpoints
- **`GET /plans/enterprise`** (`plans.routes.js:156`) — proxies to `getBusinessPlans`. Web has 3 hooks calling it (`useEnterprisePlans` × 3) and mobile has 2 hooks calling it. Delete the endpoint after migrating all 5 consumers to `useBusinessPlans` / its mobile equivalent (which doesn't exist yet — must create). D2 violation.
- **`exports.getEnterprisePlans`** in `plans.controller.js:33` — controller method that no route uses. Delete.
- **`PlanModel.statics.getOrCreateByCode`** (`PlanModel.js:283`) — references `PLAN_DEFAULTS` from `shared/constants`. Research found **8 production callers** (`auth.service.js:422,821`, `checkout.service.js:39`, `users.service.js:272`, `subscriptions.service.js:318,760,855,1139`). **Per L6: keep, but add a production guard** that throws when a code lookup misses in `NODE_ENV === 'production'` instead of auto-creating. Eliminates the hidden-write-from-read concern while preserving dev/test convenience.
- **`PlanModel.virtual('yearlyDiscount')`** (`PlanModel.js:208`) — reads `pricing.direct.monthly` and `pricing.direct.yearly`, but the pricing subdoc only has `oneTime`. The virtual always returns 0 or NaN. Delete.

### 2.5 Service / controller violations
- **Phase/flow markers in source comments** (A9 / D5):
  - `plans.routes.js:32` `// FLOW-08-F01: create`
  - `plans.routes.js:52` `// FLOW-08-F01: soft-delete`
  - `plans.routes.js:73` `// FLOW-08-F02 + FLOW-08-F03: validated update with before/after audit`
  - `plans.service.js:122` `Create a new plan (FLOW-08-F01).`
  - `plans.service.js:158` `Soft-delete a plan (FLOW-08-F01).`
  - `plans.service.js:192-195` `FLOW-08-F02 / FLOW-08-F03:`
  - `plans.service.js:218` `// FLOW-08-F02: block destructive limit reductions ...`
  - `plans.service.js:292` `// M-18: previously this branch blocked unconditionally ...` — **keep the *why* (the real edge case) but drop the M-18 marker.**
  - `PlanModel.js:100` `// FLOW-04-F03: null = no limit` — drop, the `default: null` makes the meaning clear.
  - `PlanModel.js:60-67` "AMOUNT UNIT CONTRACT (B-2)" header — keep the *why* (SAR vs halalas), drop the "(B-2)" tag.
- **`console.warn` in service** (`plans.service.js:323-326`): an `eslint-disable-next-line no-console` comment is in place but D6 disallows `console.warn` outside the global error handler / `logger.js`. Replace with the shared `logger`.
- **Controller `res.locals.planAudit` shape** (`plans.controller.js:81-89` and `:95-103`) — controller mutates `res.locals` to feed the audit middleware. This is acceptable but couples the controller to the middleware ordering. Document the contract in a one-line comment. Or move it into a `withAudit(req, res, before, after)` helper if the same pattern ships in 3+ modules.
- **`isActive: data.isActive !== false`** in `createPlan` (`plans.service.js:150`) — defaults `isActive` to true even if `data.isActive` is undefined. OK, but B0.1: prefer `data.isActive ?? true` (more explicit).
- **Sequential reads OK:** the service does no parallelizable reads inside one method that would benefit from `Promise.all` — `_guardLimitReductions` is naturally sequential.

### 2.6 Validation gaps
- **No `plans.schemas.js` file.** Add it (per L1, Zod-only — Joi is forbidden for new code). Schemas needed:
  - `createPlanSchema` — required: `code` (lowercase, snake_case, unique), `planType` (enum), `nameAr`, `nameEn`, `pricing.oneTime` (number ≥ 0, max 2 decimals), `limits.maxEvents` (int ≥ 1 or `-1`), `features` (object). Optional: `descriptionAr`, `descriptionEn`, `currency`, `availableFor`, `planFamily`, `billingType`, `sortOrder`, `isPopular`, `isActive`, `isPublic`, `limits.maxInvitesPerEvent`, `limits.invitePool`, `limits.durationDays`, `limits.maxHosts`. Use `.strict()` to reject unknown keys.
  - `updatePlanSchema` — `createPlanSchema.partial().strict()` minus `code` and `planType` (those are immutable on update). Mirror the service's `allowedFields` whitelist (`plans.service.js:203-207`) AFTER L16 drops `tier`.
- **Mount via `validateZod(schema)`** middleware from `shared/middlewares/validation.js:373`.
- **Trim-and-lowercase** `code` on input via `z.string().trim().toLowerCase()`.
- **Validate `currency` enum** matches `PlanModel`'s list (`SAR | USD | EUR | AED | KWD | BHD | QAR | OMR`) — though note `currency` is not in the update whitelist, so the field is irrelevant for `updatePlanSchema`.

### 2.7 Comment hygiene
Listed in §2.5 above. Net: ~10 comment markers to remove, ~2 `// added in X` style strip.

---

## 3. Frontend Web Findings

### 3.1 Component tree per page

**`app/[lang]/host/plans/page.js`** (38 lines · server prefetch)
- `app/[lang]/host/plans/PlansPage.js` (**288 lines — VIOLATION cap=250**)
  - `_components/CurrentPlanCard.js` (99 lines)
  - `_components/BillingTypeToggle.js` (31 lines)
  - `_components/HostPlanCard.jsx` (114 lines)
    - `_components/FeaturesList.js` (62 lines)
  - `_components/AddonsSection.jsx` (239 lines)
  - `_components/PaymentMethodSelector.jsx` (116 lines) — imported but only rendered inside Summary
  - `summary/Summary.js` (**397 lines — VIOLATION cap=250**)

**`app/[lang]/admin-dash/manage-plans/page.js`** (32 lines · server prefetch + `requirePageAccess`)
- `_components/ManagePlansContent.jsx` (186 lines)
  - `_components/EditPlanPopup.js` (**326 lines — VIOLATION cap=250**)
  - `ui/admin/header/Header` (out of module)
  - `ui/host/main-page/StatsCards` (out of module)
  - `ui/commen/popup/PopupLayout` (out of module)

**`app/[lang]/admin-dash/hosts/_components/HostSubscriptionPopup.jsx`** (169 lines)
- consumes `useHostPlans` from `useAdmin.js` (canonical hook duplicate — see §3.5).

**`app/[lang]/admin-dash/whitelabels/_components/WhitelabelSubscriptionPopup.jsx`** (120 lines) — uses `useEnterprisePlans` (deprecated alias).

**`app/[lang]/admin-dash/whitelabels/_components/whitelabelSubscriptionPopup/WhitelabelSubscriptionPopup.js`** (207 lines) — **second** `WhitelabelSubscriptionPopup`, uses `useBusinessPlans`. Two implementations for the same job (D2).

**`ui/auth/signup/whiteLabel/stepFive/StepFive.js`** (**391 lines — VIOLATION cap=250**) · uses `useBusinessPlans`.
**`ui/auth/signup/whiteLabel/stepSix/StepSix.js`** (224 lines) · uses `useBusinessPlans` (just for summary read).

### 3.2 File-size violations
- `app/[lang]/host/plans/PlansPage.js` — **288 lines**. Proposed split: extract the `FEATURE_MAP` constant + `computeFeatures` + `getInviteValue` into `_components/featuresMap.js`; extract the `Summary`-vs-grid switch into `<PlansPageBody>`; extract the `handleProceedToPayment` flow into a hook `useHostSubscribeFlow(t, router, lang, …)`. **Style preservation:** every reference to `styles.container`, `styles.pageHeader`, `styles.pageTitle`, `styles.backArrow`, `styles.pageSubtitle`, `styles.errorState`, `styles.content`, `styles.billingToggleWrap`, `styles.plansGrid`, `styles.infoNote`, `styles.infoIcon` must remain — the new files re-import the same `plans.module.css`.
- `app/[lang]/host/plans/summary/Summary.js` — **397 lines**. Proposed split: extract `<SummaryHeader>`, `<SummaryDetailsCard>`, `<DiscountCodeSection>`, `<PaymentSummary>` into `_components/`. **Style preservation:** all `summary.module.css` keys (referenced inline in current file) move with their owning JSX into the extracted components.
- `app/[lang]/admin-dash/manage-plans/_components/EditPlanPopup.js` — **326 lines**. Bigger problem: the entire form shape is wrong (see §3.4). Proposed split AFTER fixing the shape: extract `<PlanNamesSection>`, `<PlanPricingSection>`, `<PlanLimitsSection>`. **Style preservation:** every `EditPlanPopup.module.css` class moves with its block.
- `ui/auth/signup/whiteLabel/stepFive/StepFive.js` — **391 lines**. Proposed split: extract `<EventPlansGroup>`, `<QuarterlyPlansGroup>`, `<AnnualPlansGroup>` (the three near-identical mappers — DRY violation per B20), plus `<PlanFeaturesPanel>` and `<CustomBrandingNote>`. **Style preservation:** all `stepFive.module.css` keys + the inline `style={{...}}` blocks (themselves a B11 violation, see §3.6) move verbatim. Replace the inline `style={{...}}` with new module-CSS classes only after a separate visual-diff pass — DO NOT consolidate them while extracting.

### 3.3 Hardcoded text / data / paths

**`PlansPage.js:23-36`** — the entire `FEATURE_MAP` has hardcoded `labelAr` + `labelEn` strings. Each entry needs to become `t("plans:features.<key>.label")`. (12 entries.)
**`PlansPage.js:280`** — `<p>{String(t("infoNote") || "")}</p>` — the `String(... || "")` wrapper is redundant; `t()` returns a string.
**`PlansPage.js:234`** — retry button shows `{t("loading")}` — wrong key, should be `{t("buttons.retry")}`.

**`ManagePlansContent.jsx:48-51`** — stat-card titles: `isArabic ? "إجمالي الباقات" : "Total Plans"` etc. (4 cards × 1 string each). Move to `t("manage_plans.stats.totalPlans")` keys; switch namespace from `admin` to `manage_plans` (or `adminPlans`).
**`ManagePlansContent.jsx:65,73-77,91-92,101,110,127,131,139,144,152-153,158-160,166`** — pervasive `isArabic ? "ar" : "en"` ternaries (~18 instances).
**`ManagePlansContent.jsx:92,127`** — display falls back to `key.replace(/_/g, " ").replace(/\b\w/g, …)` — that's English-only; the user sees `Basic Event` even on the Arabic locale. Replace with `t(`plan_types.${key}`)`.

**`EditPlanPopup.js:71,86,94,105,113-115,132-134,152,162-164,183,200,219,228-229,247,266-268,288-292,304,311-317`** — pervasive `isArabic ? "ar" : "en"` ternaries (~22 instances, including the loading button text).
**`EditPlanPopup.js:171,191,208`** — `prefixText="SAR"` hardcoded; should be `t("common.currency.SAR")`.

**`HostSubscriptionPopup.jsx:46-61,73-160`** — the entire popup bypasses `t()` and uses `isArabic ? "ar" : "en"` (~16 instances). Migrate to namespace `adminDashboard` (already declared but unused).

**`WhitelabelSubscriptionPopup.jsx:34-36`** — uses 3 different namespaces in 3 lines (`status.active`, `subscription.inactive`, `status.suspended`). Pick one (`adminWhitelabels.subscription.statusXxx`).
**`WhitelabelSubscriptionPopup.js`** (the .js, in subdir) — pricing display `{t("subscription.currency", " SAR")}` works but the fallback puts a leading space. Fix the locale entry so fallback isn't needed.

**`StepFive.js:154-163,186-200,214-220,243-258,272-278,302-316,330,338,344-348,362-365,373,384`** — pervasive `isArabic ? "ar" : "en"` ternaries (~28 instances) **plus** inline `style={{display, alignItems, gap, margin, fontSize, color, ...}}` blocks (B11 violation, 6 occurrences). All hardcoded text moves to `signup:signupForm.whiteLabel.planSelection.<key>`; all inline styles move to `stepFive.module.css` (preserve exact pixel/color values — D7).

### 3.4 Data mapping bugs / fallback chains

**`PlansPage.js:73-77`** — `actualPlansData = plansData?.data || plansData;` and `subscription = subscriptionData?.data?.subscription || subscriptionData?.subscription || null;` Backend always wraps in `data:`. Replace with:
```js
const actualPlansData = plansData?.data;
const subscription = subscriptionData?.data?.subscription || null;
```

**`PlansPage.js:38-41`, `HostPlanCard.jsx:7-10`** — `getInviteValue` returns `plan.invites || plan.limits?.maxInvitesPerEvent`. Backend `_formatPlan` always sets `invites = isPool ? null : (plan.limits?.maxInvitesPerEvent || 0)`. For event plans `invites` is reliable. Replace with `plan.invites ?? 0` for non-pool, `plan.invitePool ?? 0` for pool — already keyed off `billingType === "monthly"`.

**`ManagePlansContent.jsx:35`** — `data?.data?.plans || data?.data || data?.plans || []`. Backend returns `data.plans` always. Replace with `data?.data?.plans || []`.
**`ManagePlansContent.jsx:108`** — `plan.nameAr || plan.nameEn` with reverse fallback for English. Pick one direction by locale, no fallback.
**`ManagePlansContent.jsx:111`** — `plan.limits?.maxInvitesPerEvent ?? plan.limits?.invitePool ?? plan.limits?.maxGuestsPerEvent`. Backend model has `maxInvitesPerEvent` and `invitePool` (and **no** `maxGuestsPerEvent`). Branch on `isPoolPlan(plan.planType)` instead.
**`ManagePlansContent.jsx:112`** — `plan.limits?.maxEvents ?? plan.limits?.maxEventsPerMonth`. **`maxEventsPerMonth` does not exist** on the model. Drop the second branch.
**`ManagePlansContent.jsx:116`** — `plan.id || plan._id || plan.code`. Backend `_formatPlan` always returns `id` (`= plan._id`). Replace with `plan.id`.

**`EditPlanPopup.js`** — **major shape mismatch (suspected bug — see §6).** Form fields use `pricing.direct.{oneTime,monthly,yearly}` and `pricing.managed.{oneTime,monthly,yearly}` and `limits.maxGuestsPerEvent` and `limits.maxEventsPerMonth`. **None of these exist on the backend `PlanModel`.** The actual model has `pricing.oneTime` (only), `limits.{maxEvents,maxInvitesPerEvent,invitePool,durationDays,maxHosts}`. The submit handler then re-projects: `pricing: { oneTime: data.pricing.direct.oneTime, monthly: data.pricing.direct.monthly, yearly: data.pricing.direct.yearly }` — Mongoose `pricingSchema` only validates `oneTime`, the other two are silently dropped server-side; and `limits: data.limits` ships unknown subdoc keys that the backend's `safeUpdate` whitelists into the model where `maxEventsPerMonth`/`maxGuestsPerEvent` are **silently dropped** by Mongoose's strict subdoc. Net: the popup looks like it works (no error returned) but only `nameAr`, `nameEn`, `pricing.oneTime`, `limits.maxEvents`, `isActive` actually persist. **Action:** redesign the form to match the model — fields = `pricing.oneTime`, `limits.maxEvents`, `limits.maxInvitesPerEvent`, `limits.invitePool`, `limits.durationDays`, `nameAr`, `nameEn`, `descriptionAr`, `descriptionEn`, `isActive`, `isPublic`, `isPopular`, `sortOrder`, `tier`, `features.*` toggles. Match this against the new `updatePlanSchema` (§2.6).

**`HostSubscriptionPopup.jsx:27-32`** — `data = plansData?.data || plansData || {}`. Backend returns `data.basic` etc. — fix to `plansData?.data || {}`.
**`HostSubscriptionPopup.jsx:36,41`** — `p.nameAr || p.nameEn || p.code` triple fallback. Pick one path by locale.
**`HostSubscriptionPopup.jsx:66`** — `host?.subscription?.planId?.code || host?.subscription?.planType` — depending on whether `planId` is populated, the fallback is necessary; **flag for §6** — backend should always populate `planId.code` for the admin host detail endpoint.
**`HostSubscriptionPopup.jsx:78`** — `host.id || host._id` — same recurring mismatch. Pick canonical `host.id`.

**`WhitelabelSubscriptionPopup.jsx:26`** — `plansData?.data?.plans || plansData?.plans || []`. The old `useEnterprisePlans` calls `/plans/enterprise` which returns the **business** shape `{ event, quarterly, annual, ... }`, NOT a `plans` array. So this whole popup is currently rendering an empty list. **Suspected bug — see §6.** The .jsx version is broken; the .js version (in the subdir) reads the correct shape.

**`StepFive.js:65-71`** — `eventPlans = plansData?.data?.event || plansData?.event || []` (×3) and `customBranding = plansData?.data?.customBranding` and `info = plansData?.data?.info`. Backend `getBusinessPlans` does **not** return `customBranding` or `info` — those keys are dead. Lines 356-378 (custom branding section) and 380-386 (info note section) never render. Delete those branches.
**`StepFive.js:342`** — `selectedPlan.rawFeatures?.compensationPercentage` — backend returns `compensationPercentage` at top level (and `features.compensationPercentage`), never `rawFeatures`. Branch is dead.

**`StepSix.js:17-21,35`** — same fallback chains as StepFive; same dead `customBranding`/`info`.

### 3.5 Duplicate hooks / direct apiRequest calls

**Three definitions of `usePlans`:**
- `hooks/reactQueryHooks/usePlans.js` (canonical) — queryKey `["plans","all"]`
- `hooks/reactQueryHooks/useAuthMutation.js:319` — queryKey `["plans"]`
- `hooks/useLocations.js:129` — queryKey `["plans"]`
Delete the latter two. Re-export from `usePlans.js` via the wildcard if any consumer imported by name.

**Three definitions of `useEnterprisePlans`:**
- `hooks/reactQueryHooks/usePlans.js:87` — queryKey `["plans","enterprise"]`
- `hooks/reactQueryHooks/useAuthMutation.js:337` — queryKey `["plans","enterprise"]`
- `hooks/useLocations.js:147` — queryKey `["plans","enterprise"]`
Delete after migrating consumers to `useBusinessPlans` (and after deleting `/plans/enterprise` server-side per §2.4). The hook itself should disappear.

**Two definitions of `useHostPlans`:**
- `hooks/reactQueryHooks/usePlans.js:32` — staleTime 5 min
- `hooks/reactQueryHooks/useAdmin.js:711` — staleTime 10 min
Pick the canonical (5 min, in `usePlans.js`). Migrate `HostSubscriptionPopup.jsx` to import from `usePlans.js`.

**Parallel data layer in `services/adminDashboard.js:806-852`** (`plansAPI`):
- 8 functions duplicating `usePlans.js` / `useAdmin.js` hooks, called only by `EditPlanPopup.js:70`.
- 2 functions hit non-existent endpoints (`getByCode`, `bulkUpdate`).
- Hardcoded path strings `/plans`, `/plans/enterprise`, `/plans/host`, `/plans/admin/all`, `/plans/admin/${code}`, `/plans/admin/bulk-update`, `/plans/admin` — B7 violation.
**Action:** delete the entire `plansAPI` block; add `useCreateAdminPlan` + `useDeleteAdminPlan` hooks to `usePlans.js`; migrate `EditPlanPopup` to use `useAdminPlanMutation`.

**Two definitions of `WhitelabelSubscriptionPopup`** (D2):
- `app/[lang]/admin-dash/whitelabels/_components/WhitelabelSubscriptionPopup.jsx` (uses deprecated `useEnterprisePlans`, broken response mapping).
- `app/[lang]/admin-dash/whitelabels/_components/whitelabelSubscriptionPopup/WhitelabelSubscriptionPopup.js` (uses canonical `useBusinessPlans`, full plan-card UI).
**Action:** the `.js` version is the one to keep. Migrate `WhitelabelDetailsContent.jsx:10` and `WhitelabelsTable.jsx:8` to import from the subdirectory; delete `WhitelabelSubscriptionPopup.jsx` (the broken duplicate).

### 3.6 State / loading / error gaps
- **`PlansPage.js`** — has loading + error UI. The error retry button uses the wrong t-key (§3.3). No empty-state distinct from "no plans available" — currently if both arrays are empty it just renders nothing. Add an empty card.
- **`PlansPage.js`** — no `<ErrorBoundary>` (B19).
- **`ManagePlansContent.jsx`** — has loading + error; uses `useState` instead of URL params for `activeFilter` (B14 — minor for this internal admin page; flag for cleanup).
- **`ManagePlansContent.jsx`** — no `<ErrorBoundary>` (B19).
- **`StepFive.js`** — has loading + error + empty (no plans) all three.
- **`HostSubscriptionPopup.jsx`** — no error UI for the plans fetch (only loading). Add one.
- **`EditPlanPopup.js`** — wraps submit in try/catch ✅ but uses `handleError(error, null)` (no `t` translator). Pass `t` so error-code mapping localizes. Same issue in `HostSubscriptionPopup.jsx:86` and `WhitelabelSubscriptionPopup.jsx:56` (the .jsx; the .js is correct).
- **`PlansPage.js:124-178`** — `handleProceedToPayment` mixes business-logic branching (checking `error.message?.includes("already have an active subscription")`) — this is a string-match against an English backend message; will break on any rewording. Surface a stable error `code` from the subscription service and switch on that.

### 3.7 Comment hygiene
- `PlansPage.js:163` `// PassKit token sourcing is a separate mini-feature (§13 Q1).` — drop the "(§13 Q1)" tag, keep the *why*.
- `services/adminDashboard.js:840-842` `// H-14: Phase 2 admin plan endpoints — were defined backend-only and unreachable from the dashboard.` — drop the "H-14" tag and the historical commentary; if the block survives at all (it shouldn't, see §3.5).
- `services/adminDashboard.js:854-857` similar `H-14` tag in the surrounding subscription admin block.
- `PlansPage.js:91` `// Default the shared invite count whenever billing type changes or data loads` — restates the code; drop.

---

## 4. Frontend Mobile Findings

### 4.1 Screen → component tree

**`screens/host/PlansScreen.js`** (264 lines)
- `components/plans/TopBar.js` (121 lines)
- `components/plans/CurrentPlanCard.js` (279 lines)
- `components/plans/HostPlanCard.js` (**414 lines — VIOLATION cap=350**)
- `components/plans/AddonsSection.js` (**436 lines — VIOLATION cap=350**)
- (via `useHostPlans` from `hooks/index.js` → `hooks/queries/usePlans.js`)

**`screens/host/PlansSummaryScreen.js`** (separate screen, navigated via `PlansScreen.handleSubscribe`) — out of scope for plans module unless rendered by something here. Includes `PaymentSummery.js` (481 lines — VIOLATION cap=350) — flag separately.

**`components/admin-dashboard/hosts/SubscriptionModal.js`** (307 lines) — uses `useHostPlans` + `useUpdateHostSubscription`.

**`components/auth/whitelabel-signup/WhitelabelStep4PlanSelection.js`** (133 lines) — uses `useEnterprisePlans` from `hooks/useLocations.js` (raw fetch, not `apiFetch`).

### 4.2 File-size violations
- `components/plans/HostPlanCard.js` — **414 lines**. Same hardcoded `FEATURE_MAP` as web. Proposed split: extract `_components/PlanFeatureRow.js`, `_components/InviteSelector.js`, `_components/PlanPriceBlock.js`, plus a shared `featuresMap.js`. **Style preservation:** every `StyleSheet.create({...})` value moves with its owning JSX into the extracted components verbatim.
- ~~`components/plans/AddonsSection.js`~~ — **NOT a violation** (per L11). File is **338 lines**, under the 350 cap. Original plan-doc 436-line claim was incorrect. No split.
- `components/plans/PaymentSummery.js` — **481 lines, orphaned** (per L10). Grep found zero consumers — both summary screens (`host/PlansSummaryScreen.js`, `admin/WhitelabelPlansSummaryScreen.js`) use the clean `PaymentSummaryCard.js` (133 lines) instead. **Action: delete the file + the `components/plans/index.js:2` export.** No rename, no split.
- ~~`components/plans/AddionalFeatures.js`~~ — **does not exist** (per L10). Plan-doc original claim was incorrect. Drop from scope.

### 4.3 Service / hook violations
- **`hooks/useLocations.js:46-53`** — defines `useEnterprisePlans` using a raw `fetchJSON` call (bypasses `apiFetch`). C1 violation: no token refresh, no 30s timeout, no in-memory token. Consumer `WhitelabelStep4PlanSelection.js:6` imports from there. **Action:** delete `useEnterprisePlans` from `useLocations.js`; migrate consumer to `useBusinessPlans` from `hooks/queries/usePlans.js` (after that hook is added — currently `usePlans.js` exposes `useEnterprisePlans` only).
- **`hooks/queries/usePlans.js`** — exposes `useEnterprisePlans` but **no `useBusinessPlans`**. Add `useBusinessPlans` hook + `ENDPOINTS.PLANS.BUSINESS = "/plans/business"`. Then deprecate `useEnterprisePlans` and migrate.
- **No admin mutations on mobile** (`useAdminPlanMutation`, `useCreateAdminPlan`, `useDeleteAdminPlan`). The admin UI is web-only today. If mobile admin support is intended, add hooks; otherwise leave (out of scope) — flag.
- **`SubscriptionModal.js:79`** — `p.nameEn || p.code` — English-only, ignores `i18n.language`. Web does the same fallback dance — pick one direction by locale.
- **`SubscriptionModal.js:87-91`** — `host.subscription?.planId?.code || host.subscription?.planCode || host.subscription?.planType` triple fallback. Pick canonical.

### 4.4 Hardcoded text / data / paths
- **`HostPlanCard.js:13-26`** — same `FEATURE_MAP` with hardcoded `labelAr`/`labelEn`. Move to `t("plans:features.<key>.label")`.
- **`PlansScreen.js:173`** — `<Text style={styles.infoIcon}>💡</Text>` — emoji literal (acceptable as visual decoration). Web has the same; keep parity.
- **`SubscriptionModal.js`** — uses `t(...)` everywhere ✅ except the host-info display. Good.
- **`WhitelabelStep4PlanSelection.js:68`** — `plan.nameEn || plan.nameAr || plan.name` — English-only fallback pattern. Replace with locale-aware selection.
- **`WhitelabelStep4PlanSelection.js:93-98`** — checkbox icon `✓` Unicode literal — acceptable.

### 4.5 Web/Mobile divergence
See §5 cross-platform diff for the canonical list. Major items:
- Mobile `WhitelabelStep4PlanSelection` renders a **monthly/yearly billing toggle** for whitelabel signup, but the backend `/business` endpoint only categorizes plans as `event/quarterly/annual` — the toggle has no effect on the rendered plans. Web's StepFive correctly groups by plan type. **Bug — see §6.**
- Mobile `SubscriptionModal` does not include a "trial" option in the plan dropdown; web `HostSubscriptionPopup` does (`{ value: "trial", isMonthly: false }`). Decide which is correct and align.
- Mobile `SubscriptionModal` does not render a billing-cycle toggle for monthly plans; web does. Align.
- Mobile `SubscriptionModal:103-109` sends `{ hostId, subscriptionData: { planCode, status } }`; web `HostSubscriptionPopup:77-82` sends `{ hostId, planCode, status, billingCycle? }` (flat). Different request shapes for the same admin mutation — verify which one the backend expects (this is in the `users`/`hosts` admin module, not plans, but a plans-touching diff). **Flag for §6.**
- Mobile uses `staleTime: 10 min` for plans queries; web uses `5 min`. Trivial but pick one.

### 4.6 Loading / error / empty states
- **`PlansScreen.js`** — has loading ✅. Error is shown only via `toast` (line 65-69) — no error view with retry. C6 violation: add an error block that mirrors web's retry button.
- **`SubscriptionModal.js`** — has loading ✅. No error state if `useHostPlans` fails; the dropdown silently falls back to empty options. Add a simple error message + retry.
- **`WhitelabelStep4PlanSelection.js`** — has loading and "no plans" empty state, but no error state.

### 4.7 Comment hygiene
- `services/plansService.js:5-10` — header comment with "Phase 4 W0-AUTH:" marker. Keep the *why* (apiFetch's 30s timeout), drop the marker. Drop "skipAuth: true" reference — the code doesn't pass that flag anywhere.
- `services/plansService.js:16` — `_legacyToken = null` parameter unused per project's "phase out" plan. Drop it (no callers pass anything).
- `hooks/queries/usePlans.js` — JSDoc `GET /plans` etc. lines (line 7, 22, etc.) — minor "what" restatement; acceptable since the file is small but consistent with module hooks elsewhere.

---

## 5. Cross-Platform API Consumption Diff

| Endpoint | Aspect | Web | Mobile | Backend truth | Action |
|----------|--------|-----|--------|---------------|--------|
| GET /plans | path | `/plans` (3 hooks) | `/plans` | `/plans` | Web: collapse 3 → 1 hook |
| GET /plans | response mapping | mixed `data?.data || data` chains | `data` (correct) | `{ success, status, data: { plans } }` | Fix web fallbacks |
| GET /plans/business | path | `/plans/business` ✅ | **MISSING** (uses `/plans/enterprise`) | `/plans/business` | Add mobile hook + ENDPOINTS entry |
| GET /plans/business | response.event | `data?.data?.event \|\| data?.event \|\| []` | n/a | `data.event` | Web: drop fallback |
| GET /plans/business | response.customBranding/info | reads `data?.customBranding` and `data?.info` | n/a | **does not exist** in response | Web: delete dead branches |
| GET /plans/enterprise | path | `/plans/enterprise` (3 hooks) | `/plans/enterprise` (2 hooks) | duplicate of /business | Delete from both, then delete server route |
| GET /plans/host | path | `/plans/host` (2 hooks) | `/plans/host` | `/plans/host` | Web: collapse 2 → 1 hook |
| GET /plans/host | response.basic | mixed: `data?.data \|\| data \|\| {}` then `.basic?.event` | `data?.basic?.[billingType]` (correct) | `data.basic.{event,monthly}` etc. | Fix web fallback |
| GET /plans/code/:code | path | `/plans/code/${code}` ✅ | `/plans/code/${code}` ✅ | match | Audit consumers (none yet) |
| GET /plans/:id | path | `/plans/${id}` ✅ | `/plans/${id}` ✅ | match | OK |
| GET /plans/admin/all | path | `/plans/admin/all` (2 places: `useAdminPlans` + `plansAPI.getAllForAdmin`) | n/a | `/plans/admin/all` | Web: delete `plansAPI.getAllForAdmin` |
| POST /plans/admin | path | `/plans/admin` (only in `plansAPI.createPlan`) | n/a | `/plans/admin` | Web: replace with React-Query hook |
| PATCH /plans/admin/:code | request body | `{ pricing: { oneTime, monthly, yearly }, limits: { maxEvents, maxEventsPerMonth, maxGuestsPerEvent }, … }` | n/a | accepts `{ pricing.oneTime, limits.{maxEvents,maxInvitesPerEvent,invitePool,durationDays,maxHosts}, nameAr, nameEn, … }` only — extras silently dropped | Web: rebuild form to model shape (§3.4) |
| DELETE /plans/admin/:code | path | `/plans/admin/${code}` (only in `plansAPI.deletePlan`) | n/a | match | Web: replace with React-Query hook |

---

## 6. Suspected Bugs Worth Verifying

1. **`EditPlanPopup.js` form does almost nothing.** Form fields target `pricing.direct.*`, `pricing.managed.*`, `limits.maxGuestsPerEvent`, `limits.maxEventsPerMonth` — none of which exist on `PlanModel`. Backend silently strips them. Net: an admin who edits a plan's "monthly price" or "guests per event" sees the modal close successfully and then nothing changes server-side. **Confirm by editing a plan and re-reading it.** (`EditPlanPopup.js:30-48,62-69`)

2. **`WhitelabelSubscriptionPopup.jsx` (the `.jsx`, not the `.js`) renders an empty plan dropdown.** It maps `plansData?.data?.plans || []`, but the underlying `useEnterprisePlans` hits `/plans/enterprise` whose response shape is `{ event, quarterly, annual, … }` — there is no `plans` key. The popup *appears* to work because the loading state masks an empty `planOptions` list. **Verify by opening the whitelabel subscription modal from `WhitelabelDetailsContent`** (which is the .jsx consumer). The .js variant (used by `WhitelabelCard`) reads the correct shape and works.

3. **`WhitelabelStep4PlanSelection.js` (mobile) billing-cycle toggle is decorative.** Backend `/business` returns plans grouped by `{event, quarterly, annual}`. The toggle (`monthly`/`yearly`) doesn't filter or change anything. Either remove the toggle or wire it to a real grouping (e.g. show event for monthly, quarterly+annual for yearly).

4. **`getActivePlans` may leak `platform_admin`-only plans** to public callers. The query has no `availableFor` filter (`plans.service.js:18-19`). Verify there are no seeded `platform_admin` plans with `isActive: true`; if there are, they appear in `GET /plans` to anonymous users.

5. **`tier` sort key is dead.** `getActivePlans` and `getAllPlansAdmin` both sort by a `tier` field that does not exist on the schema. Mongo will sort by `_id` after the existing keys collapse to no-op. Order may surprise admins. (`plans.service.js:19`, `:117`)

6. **`PlanModel.virtual('yearlyDiscount')`** divides by `pricing.direct.monthly` × 12; both subfields are always undefined. Always returns 0 or NaN. Dead code.

7. **`PlanModel.statics.getOrCreateByCode`** auto-seeds plans from `PLAN_DEFAULTS`. If a caller looks up an unknown code, the side effect creates a plan in the DB. That's a hidden write from a read path. Research found **8 production call sites** (signup ×2, checkout, users, subscriptions ×4) — deletion is not safe. **Per L6:** add a production guard that throws when the lookup misses in `NODE_ENV === 'production'`, preserving dev/test auto-seed but removing the production-side hidden write.

8. **Web `PlansPage.handleProceedToPayment`** matches the English string `"already have an active subscription"` (`PlansPage.js:171`). Any backend i18n or rewording silently breaks the redirect-to-create-event flow.

9. **`SubscriptionModal.js` (mobile) sends `{ hostId, subscriptionData: { planCode, status } }`** while web sends `{ hostId, planCode, status, billingCycle? }` flat. Both go to `useUpdateHostSubscription` / `useAdminHostMutation('updateSubscription')`. Verify which the backend `users` module accepts; one of them is wrong.

10. **`useAdminPlanMutation` does not invalidate the public plan caches** — only `["admin","plans"]`. After an admin edits a plan's price, the host-side `["plans","host"]` cache still shows the old price for up to 5 min. Add `queryClient.invalidateQueries({ queryKey: ["plans"] })` to the success handler (the prefix matches both admin and public keys).

---

## 7. Implementation Plan (Ordered)

Apply changes in this order. Each item ends with a checkbox the agent will tick during Phase 2. **All decisions in §0.5 are locked — items below are written to those locks.**

### 7.A Backend
- [ ] **A.1** Create `labbe-backend-/src/modules/plans/plans.schemas.js` (per L1, **Zod**) with `createPlanSchema` and `updatePlanSchema` per §2.6 spec. Mount with `validateZod(createPlanSchema)` on `POST /plans/admin` and `validateZod(updatePlanSchema)` on `PATCH /plans/admin/:code` (`plans.routes.js:32,73`). The middleware lives at `shared/middlewares/validation.js:373`. Do not introduce Joi.
- [ ] **A.2** Replace `restrictTo(ROLES.SUPER_ADMIN)` with `requirePageAccess(ADMIN_PAGES.MANAGE_PLANS, "view"|"create"|"update"|"delete")` on the 4 admin routes (`plans.routes.js:25,32,52,73`).
- [ ] **A.3** Delete the duplicate `GET /plans/enterprise` route (`plans.routes.js:144-156`) AFTER all 13 frontend consumers (per L2) migrate via B.5 / C.3 / C.4 / C.13. Delete `plans.controller.getEnterprisePlans` too.
- [ ] **A.4** Add Swagger blocks for the 4 admin endpoints (`/plans/admin/all`, `POST /plans/admin`, `PATCH /plans/admin/:code`, `DELETE /plans/admin/:code`). Use `tags: [Plans]`, reference the new `Plan`/`PlanCreate`/`PlanUpdate` schemas.
- [ ] **A.5** Update the shared `Plan` schema in `config/swagger.js:384` — replace stale `type` enum with `planType` enum from `PlanModel`; add `availableFor`, `planFamily`, `billingType`, `featuresArray`, `pricing.oneTime` (SAR-major-units note), `invitePool`, `compensationPool`, `compensationPercentage`. Add new schemas `BusinessPlansResponse` (`{ event, quarterly, annual, setupFeeRequired, setupFeeAmount }`), `HostPlansResponse` (`{ basic, premium }`).
- [ ] **A.6** **Drop `tier`** (per L16): remove from `safeUpdate` whitelist (`plans.service.js:203-207`) AND from sort keys in both `getActivePlans` (`plans.service.js:19`) and `getAllPlansAdmin` (`plans.service.js:117`). Sort by `{ sortOrder, createdAt }` only.
- [ ] **A.7** Add `availableFor: { $ne: 'platform_admin' }` to `getActivePlans` filter (`plans.service.js:19`).
- [ ] **A.8** Replace `console.warn` (`plans.service.js:323-326`) with `logger.warn` from `shared/utils/logger.js`. Drop the `eslint-disable-next-line` line.
- [ ] **A.9** Delete the dead `PlanModel.virtual('yearlyDiscount')` (`PlanModel.js:208-213`).
- [ ] **A.10** **Add production guard to `PlanModel.statics.getOrCreateByCode`** (per L6 — do NOT delete; 8 production callers found). Pseudocode:
  ```js
  if (!doc && process.env.NODE_ENV === 'production') {
    throw new Error(`Plan '${code}' missing — DB seeding incomplete`);
  }
  ```
  Add a one-line comment explaining the dev/test convenience vs. production strict behavior.
- [ ] **A.11** **Wrap `_guardLimitReductions` + `findOneAndUpdate` in a Mongo session/transaction** (per L7). Pattern: `await mongoose.connection.transaction(async (session) => { ... })` covering the subscriber-breach read AND the plan write. Required, not optional.
- [ ] **A.12** Comment-hygiene pass: remove `FLOW-08-F0X`, `FLOW-04-F03`, `M-18`, `B-2`, `H-14` markers (10 spots listed in §2.5 / §2.7). Keep the *why* lines.

### 7.B Web
- [ ] **B.1** Delete the parallel `plansAPI` block in `services/adminDashboard.js:806-852`. Drop the dead `getByCode` and `bulkUpdate` calls.
- [ ] **B.2** Add `useCreateAdminPlan` and `useDeleteAdminPlan` hooks to `hooks/reactQueryHooks/usePlans.js`. Wire `onSuccess: invalidate(["admin","plans"])` and `invalidate(["plans"])`. **staleTime: 5 min** for any new query hooks (per L15).
- [ ] **B.3** Make `useAdminPlanMutation` (`hooks/reactQueryHooks/useAdmin.js:612-625`) invalidate the broader `["plans"]` key as well — see §6 #10.
- [ ] **B.4** Delete duplicate `usePlans` definitions in `useAuthMutation.js:319-331` and `useLocations.js:129-141`. Re-export from `usePlans.js` if any consumer used a path-import.
- [ ] **B.5** Delete `useEnterprisePlans` definitions in all 3 files (`usePlans.js:87`, `useAuthMutation.js:337`, `useLocations.js:147`). Migrate consumers in `WhitelabelSubscriptionPopup.jsx`, `StepFive.js`, `StepSix.js` to `useBusinessPlans`. (Gates A.3.)
- [ ] **B.6** Delete duplicate `useHostPlans` in `useAdmin.js:711-722`. Migrate `HostSubscriptionPopup.jsx:6` to import from `usePlans.js`.
- [ ] **B.7** Delete the broken `WhitelabelSubscriptionPopup.jsx` (the .jsx, uses deprecated `useEnterprisePlans` and renders an empty dropdown). Migrate `WhitelabelDetailsContent.jsx:10` and `WhitelabelsTable.jsx:8` to import the canonical `whitelabelSubscriptionPopup/WhitelabelSubscriptionPopup.js`.
- [ ] **B.8** **Rebuild `EditPlanPopup.js` form to the locked spec** (per L3, hard cutover per L14, no feature flag). Form sections + fields:

  | Section | Fields | Notes |
  |---------|--------|-------|
  | Identity (read-only) | `code`, `planType` | Display chips, NOT editable |
  | Naming | `nameAr`*, `nameEn`* | Required |
  | Description | `descriptionAr`, `descriptionEn` | Optional, multiline (currently absent) |
  | Pricing | `pricing.oneTime` | SAR major units, ≥0, max 2 decimals |
  | Limits | `maxEvents`, `maxInvitesPerEvent`, `invitePool`, `durationDays`, `maxHosts` | All from `PlanModel:94-103`. `null` = unlimited |
  | Feature toggles (collapsible) | 18 booleans: `hasInAppInvites`, `hasWhatsAppInvites`, `hasSMSInvites`, `hasQRCode`, `hasQRScanning`, `hasFlexibleEntryMode`, `hasStaffCheckIn`, `hasStaffAssignment`, `hasRSVPTracking`, `hasAutoReminders`, `hasEmailNotifications`, `hasCustomWhatsAppNumber`, `hasCompensationInvites`, `hasBasicTemplates`, `hasPremiumTemplates`, `hasPostEventPage`, `hasCustomReports`, `hasWhatsAppSupport` | All from `PlanModel:13-54` |
  | Feature numerics | `compensationPercentage` (0–100), `priorityPoints` (1–10) | |
  | Display | `isPopular`, `sortOrder` | |
  | Visibility | `isActive`, `isPublic` | |

  Update `utils/schemas/planSchema.js` (Zod) to mirror the new backend `updatePlanSchema` exactly. Switch from `plansAPI.updatePlan` to `useAdminPlanMutation`. **DO NOT** include `code`, `planType`, `currency`, `color`, `icon`, `metadata`, `availableFor`, `planFamily`, `billingType`, `tier` — none are in the backend update whitelist (post-A.6) and Mongoose strict-mode silently drops them. **Style preservation:** keep every `EditPlanPopup.module.css` class name; reuse / extend the existing section structure.

- [ ] **B.9** Replace data-mapping fallback chains:
  - `PlansPage.js:73-77` (`actualPlansData`, `subscription`)
  - `PlansPage.js:38-41` / `HostPlanCard.jsx:7-10` (`getInviteValue` — branch on pool vs event without fallback)
  - `ManagePlansContent.jsx:35,108,111,112,116`
  - `HostSubscriptionPopup.jsx:27-32,36,41,78`
  - `WhitelabelSubscriptionPopup.js:110-112` (`eventPlans`, `quarterlyPlan`, `annualPlan`)
  - `StepFive.js:65-71,342` (drop dead `customBranding`/`info`/`rawFeatures` branches)
  - `StepSix.js:17-21,35`
- [ ] **B.10** Replace `PlansPage.handleProceedToPayment`'s English-string match (`PlansPage.js:171`) with a stable backend error `code` check. Coordinate with backend to surface a stable `code` (e.g. `SUBSCRIPTION_ALREADY_ACTIVE`) from the subscription service.
- [ ] **B.11** **Make admin plan dropdowns data-driven** (per L9): replace the hardcoded plan-code list in `HostSubscriptionPopup.jsx` with options sourced from `useAdminPlans()` — `plans.map(p => ({ value: p.code, label: locale === 'ar' ? p.nameAr : p.nameEn }))`. No "trial" hardcode — `trial` shows up automatically if seeded. If the team later wants to forbid manual trial assignment, filter `planType !== 'trial'` here.
- [ ] **B.12** Move all `isArabic ? "ar" : "en"` ternaries to `t()` keys:
  - `ManagePlansContent.jsx` (~22 spots) → namespace `admin.managePlans.*` (per L4)
  - `EditPlanPopup.js` (~22 spots) → `admin.managePlans.editPopup.*`
  - `HostSubscriptionPopup.jsx` (~16 spots) → `adminDashboard.subscription.*`
  - `StepFive.js` (~28 spots) → `signup.signupForm.whiteLabel.planSelection.*`
  - `StepSix.js` (handful) → same
  - `PlansPage.js` `FEATURE_MAP` labels (12 spots) → `plans.features.*` (existing namespace)
  - **Per L12: locale JSON edits are pre-approved** — agent adds keys directly while migrating.
- [ ] **B.13** Replace inline `style={{...}}` blocks in `StepFive.js:154-162,212-220,270-278,367-376` with classes in `stepFive.module.css`. **Style preservation:** copy exact pixel/color values verbatim; no consolidation.
- [ ] **B.14** Wrap `<PlansPage>` and `<ManagePlansContent>` in `<ErrorBoundary>` (B19).
- [ ] **B.15** Add an error-with-retry view to `HostSubscriptionPopup.jsx` (currently only loading is handled).
- [ ] **B.16** Delete dead `API_PATHS.plans.adminGetByCode` (`api.config.js:336`).
- [ ] **B.17** File-size splits **after** B.8 / B.9 / B.12 (split clean code, not buggy code):
  - `PlansPage.js` (288 → ≤250) — extract `featuresMap.js`, `<PlansPageBody>`, `useHostSubscribeFlow`. Style preservation.
  - `summary/Summary.js` (397 → ≤250) — extract `<SummaryHeader>`, `<SummaryDetailsCard>`, `<DiscountCodeSection>`, `<PaymentSummary>`. Style preservation.
  - `EditPlanPopup.js` (post-rebuild — likely still over cap given the new field count) → extract `<PlanIdentityChips>`, `<PlanNamingSection>`, `<PlanDescriptionSection>`, `<PlanPricingSection>`, `<PlanLimitsSection>`, `<PlanFeatureTogglesSection>`, `<PlanFeatureNumericsSection>`, `<PlanDisplaySection>`, `<PlanVisibilitySection>`. Style preservation.
  - `StepFive.js` (391 → ≤250) — extract `<EventPlansGroup>`, `<QuarterlyPlansGroup>`, `<AnnualPlansGroup>`, `<PlanFeaturesPanel>`. Style preservation.
- [ ] **B.18** Comment-hygiene pass: remove `(§13 Q1)`, `H-14`, "Phase 2", "Default the shared invite count whenever billing type changes or data loads" (§3.7).

### 7.C Mobile
- [ ] **C.1** Add `BUSINESS: "/plans/business"` to `config/api.js` `ENDPOINTS.PLANS`.
- [ ] **C.2** Add `useBusinessPlans` query hook to `hooks/queries/usePlans.js` (and a `getBusinessPlans()` method to `services/plansService.js`). **staleTime: 5 min** (per L15 — also retro-update existing `usePlans/useHostPlans/usePlanByCode/usePlanById` from 10 min → 5 min).
- [ ] **C.3** Delete `useEnterprisePlans` from `hooks/useLocations.js:46-53` (raw fetch). Migrate `WhitelabelStep4PlanSelection.js:6` to `useBusinessPlans` from `hooks/queries/usePlans.js`.
- [ ] **C.4** Delete `useEnterprisePlans` from `hooks/queries/usePlans.js:38-47`. (Becomes unused after C.3.)
- [ ] **C.5** Drop `_legacyToken` parameter from `services/plansService.js:16` and the `Phase 4 W0-AUTH:` header marker (§4.7).
- [ ] **C.6** Replace data-mapping fallback chains:
  - `WhitelabelStep4PlanSelection.js:16-21,59,68` (drop `plansData?.data || plansData || {}`, drop `plan.pricing?.oneTime ?? plan.price`, drop `plan.nameEn || plan.nameAr || plan.name`)
  - `SubscriptionModal.js:79,86-91,104` (locale-aware name; canonical `host.id`; canonical `host.subscription.planId.code`)
  - `HostPlanCard.js:28-31` (mirror web's pool-vs-event branch instead of fallback)
- [ ] **C.7** **Drop the monthly/yearly billing toggle** in `WhitelabelStep4PlanSelection.js` (per L8). Render all three groups (event / quarterly / annual) with section headers, matching web's StepFive structure. Backend `/business` does not provide that grouping, so the toggle was decorative.
- [ ] **C.8** **Refactor `SubscriptionModal.js`** (per L5 + L9):
  - **Flatten request body** — change `updateSubscription.mutateAsync({ hostId, subscriptionData: { planCode, status } })` to `updateSubscription.mutateAsync({ hostId, planCode, status, billingCycle })` matching web + backend canonical shape. Update the `useUpdateHostSubscription` hook accordingly.
  - **Data-driven plan dropdown** — replace the hardcoded plan-code list with options sourced from `useAdminPlans()` (add the hook to mobile if absent). `plans.map(p => ({ value: p.code, label: i18n.language === 'ar' ? p.nameAr : p.nameEn }))`.
  - **Drop the manual "trial" UI** — trial is auto-assigned at signup (`auth.service.js:421`); it appears in the data-driven dropdown automatically if seeded.
  - Add a billing-cycle selector ONLY when the selected plan has a billing cycle (i.e. `planType` ends in `_monthly` / `_quarterly` / `_annual`).
- [ ] **C.9** Move `HostPlanCard.js` `FEATURE_MAP` labels to `t()` keys (~12 entries; namespace `plans.features.*`). Pre-approved locale edits per L12.
- [ ] **C.10** Add an error view (with retry) to `PlansScreen.js` (currently only toast).
- [ ] **C.11** Add an error view to `SubscriptionModal.js`'s plan-fetch path.
- [ ] **C.12** File-size split (after C.6 / C.9):
  - `HostPlanCard.js` (414 → ≤350) — extract `_components/PlanFeatureRow.js`, `_components/InviteSelector.js`, `_components/PlanPriceBlock.js`, plus shared `featuresMap.js`. **StyleSheet preservation.**
  - **`AddonsSection.js` is NOT split** (per L11 — actual file is 338 lines, under cap). Original plan-doc claim was wrong.
- [ ] **C.13** **Delete `components/plans/PaymentSummery.js`** (per L10 — orphaned, 481 lines, no consumers; both summary screens use the clean `PaymentSummaryCard.js`). Also remove the `components/plans/index.js:2` export. **Pre-flight check:** before the rm, run a final grep for `PaymentSummery` across `halla-mobile/screens/**`, `halla-mobile/components/**`, `halla-mobile/hooks/**` to confirm zero consumers. The 4 candidate screens (`screens/host/PlansScreen.js`, `screens/host/PlansSummaryScreen.js`, `screens/admin/WhitelabelPlansScreen.js`, `screens/admin/WhitelabelPlansSummaryScreen.js`) all import the proper `PaymentSummaryCard` — verified. **No rename, no split, no `AddionalFeatures.js` work** (file does not exist).
- [ ] **C.14** Comment-hygiene pass: drop `Phase 4 W0-AUTH:` markers in `services/plansService.js`, and any remaining FLOW/M-/H- markers.

### 7.D Cross-platform alignment (do AFTER A/B/C)
- [ ] **D.1** Verify `/plans/enterprise` is gone from frontend and backend; grep the entire repo for `enterprise` and confirm no remaining consumer (web 8 + mobile 5 = 13 sites cleared).
- [ ] **D.2** Re-run the matrix in §5 against the codebase and confirm every row is ✅.
- [ ] **D.3** Verify all plans queries on web + mobile use `staleTime: 5 * 60 * 1000` (per L15) — grep for `staleTime` in plans hook files; no stragglers at 10 min.
- [ ] **D.4** Manual smoke check (described in §10):
  - Open host `/plans` page on web and mobile — same prices, same plan names per locale.
  - Open admin `manage-plans` on web — edit a plan's `pricing.oneTime`, `limits.maxInvitesPerEvent`, and a feature toggle (`hasPremiumTemplates`); reload — values persist; both `/plans` (host) and `/plans/admin/all` reflect the change.
  - Open whitelabel signup StepFive on web and Step4 on mobile — both show the same `event/quarterly/annual` plan groups; mobile no longer has a billing toggle.
  - Open admin host-detail SubscriptionModal on web AND mobile — both populate the plan dropdown from `useAdminPlans()`; both send a flat `{ hostId, planCode, status, billingCycle? }` body.
  - Open whitelabel subscription modal from `WhitelabelDetailsContent` on web — plan dropdown populated (verifies §6 #2 fix).

---

## 8. Locale-key additions required

**Per L12: pre-approved.** Agent adds these keys directly to the JSON files while migrating each component. No further confirmation needed.

### Namespace `plans` (host plans page + mobile `HostPlanCard`)

File: `labbe/localization/locales/{en,ar}/plans.json` + `halla-mobile/localization/locales/{en,ar}/plans.json`. Existing namespace already structured.

- `plans.features.hasInAppInvites.label` (en/ar)
- `plans.features.hasWhatsAppInvites.label`
- `plans.features.hasSMSInvites.label`
- `plans.features.hasQRCode.label`
- `plans.features.hasQRScanning.label`
- `plans.features.hasFlexibleEntryMode.label`
- `plans.features.hasStaffCheckIn.label`
- `plans.features.hasStaffAssignment.label`
- `plans.features.hasRSVPTracking.label`
- `plans.features.hasAutoReminders.label`
- `plans.features.hasEmailNotifications.label`
- `plans.features.hasCompensationInvites.label`
- `plans.features.hasBasicTemplates.label`
- `plans.features.hasCustomWhatsAppNumber.label`
- `plans.features.hasPremiumTemplates.label`
- `plans.features.hasPostEventPage.label`
- `plans.features.hasCustomReports.label`
- `plans.features.hasWhatsAppSupport.label`
- `plans.buttons.retry`

### Namespace `admin.managePlans.*` (extend existing `admin` namespace, per L4)

File: `labbe/localization/locales/{en,ar}/admin.json`. Sub-namespace `managePlans` does not yet collide with existing `admin.taqnyat.*` / `admin.templates.*`.

- `admin.managePlans.title` (en: "Manage Plans & Pricing", ar: "إدارة الباقات والأسعار")
- `admin.managePlans.subtitle`
- `admin.managePlans.stats.total`
- `admin.managePlans.stats.active`
- `admin.managePlans.stats.host`
- `admin.managePlans.stats.business`
- `admin.managePlans.filters.all`
- `admin.managePlans.empty.title`
- `admin.managePlans.errors.loadFailed`
- `admin.managePlans.cards.editButton`
- `admin.managePlans.cards.statusActive` / `statusDisabled`
- `admin.managePlans.cards.invites` / `events` (units)
- `admin.managePlans.priceCurrency` (en: "SAR", ar: "ر.س")
- `admin.managePlans.pricePeriod.event`
- `admin.managePlans.planTypes.{trial,basic_event,basic_monthly,premium_event,premium_monthly,business_event,business_quarterly,business_annual,unlimited}`
- `admin.managePlans.editPopup.title`
- `admin.managePlans.editPopup.sections.{identity,naming,description,pricing,limits,featureToggles,featureNumerics,display,visibility}`
- `admin.managePlans.editPopup.fields.{code,planType,nameAr,nameEn,descriptionAr,descriptionEn,pricingOneTime,maxEvents,maxInvitesPerEvent,invitePool,durationDays,maxHosts,compensationPercentage,priorityPoints,isPopular,sortOrder,isActive,isPublic}` (label + placeholder + help-text per field)
- `admin.managePlans.editPopup.featureLabels.{18 keys mirroring `plans.features.*`}` — OR reuse `plans.features.*` keys directly via cross-namespace `t("plans:features.hasInAppInvites.label")` to avoid duplication. Recommend the latter.
- `admin.managePlans.editPopup.{cancel,save,saving,saveSuccess,unlimited}`

### Namespace `adminDashboard` (web `HostSubscriptionPopup`)

- `adminDashboard.subscription.{title,hostName,plan,selectPlan,loadingPlans,status,selectStatus,billingCycle,monthly,yearly,update,updating,updateSuccess,statusActive,statusExpired,statusCancelled,errorLoadingPlans,retry}`
- **No `trial` key** — per L9, plan dropdown is data-driven; `trial` plan label comes from `plan.nameEn/nameAr`.

### Namespace `adminWhitelabels` (canonical `WhitelabelSubscriptionPopup.js`)

- Many keys exist already (`subscription.manageTitle`, `.cancel`, `.updatePlan`, etc.). Add only the missing ones encountered during B.5 migration.

### Namespace `signup` (`StepFive` + `StepSix` web; `WhitelabelStep4PlanSelection` mobile)

File: `labbe/localization/locales/{en,ar}/signup.json` + `halla-mobile/localization/locales/{en,ar}/signup.json`. Existing `signupForm.whiteLabel.*` already structured.

- `signup.signupForm.whiteLabel.planSelection.eventPlans.title` (en: "Per-Event Plans", ar: "باقات لكل مناسبة")
- `signup.signupForm.whiteLabel.planSelection.eventPlans.subtitle`
- `signup.signupForm.whiteLabel.planSelection.quarterlyPlans.title`
- `signup.signupForm.whiteLabel.planSelection.quarterlyPlans.subtitle`
- `signup.signupForm.whiteLabel.planSelection.annualPlans.title`
- `signup.signupForm.whiteLabel.planSelection.annualPlans.subtitle`
- `signup.signupForm.whiteLabel.planSelection.cards.{select,selected,invitesPerEvent,invitesPool,oneEvent,unlimitedEvents90,unlimitedEvents365,currency}`
- `signup.signupForm.whiteLabel.planSelection.featuresTitle`
- `signup.signupForm.whiteLabel.planSelection.compensation` (with `{percent}` interpolation)

---

## 9. Rollback plan

For each implementation item, the rollback is `git revert` of its commit. Items with cross-cutting impact:

- **A.3 (delete `/plans/enterprise`)** — revertible alone, but if any frontend consumer was missed, it will start 404'ing. Phase 2 must verify B.5 / C.3-C.4 are complete before A.3 lands.
- **A.5 / A.6 (Swagger schema rewrite + drop `tier` sort)** — pure docs / sort key, no data impact.
- **B.7 (delete WhitelabelSubscriptionPopup.jsx)** — irreversible without git; the file was buggy, so revert is unlikely needed.
- **B.8 (EditPlanPopup form rebuild)** — touches user-visible admin UI; preserve module CSS so visual output stays identical, and ship behind a feature flag if the team wants A/B verification. Otherwise revert via `git revert` reinstates the broken form.
- **C.1-C.4 (mobile hook migration)** — purely additive then deletive; revert is safe.

No DB migrations are part of this plan. All schema changes happen in Mongoose model docs, not in migrations.

---

## 10. Acceptance checklist (run after Phase 2)

- [ ] No file in module exceeds the cap.
- [ ] All endpoints have current, accurate Swagger.
- [ ] No duplicate endpoints remain (`/plans/enterprise` deleted).
- [ ] No duplicate hooks remain (web has 1 `usePlans`, 1 `useHostPlans`, 1 `useBusinessPlans`; mobile has 1 each).
- [ ] No `plansAPI` parallel data layer remains in `services/adminDashboard.js`.
- [ ] No `WhitelabelSubscriptionPopup.jsx` (only the canonical `.js`).
- [ ] `EditPlanPopup` round-trip works: edit a plan's `pricing.oneTime`, save, reload, see updated value (host plans page reflects the change too).
- [ ] Web + Mobile call the same paths with the same shapes for every endpoint (re-run §5 matrix).
- [ ] No fallback chains in plan-data mapping in this module's surface area.
- [ ] No `// FLOW-…` / `// PHASE-…` / `// BUG-…` / `// H-14` / `// M-18` / `// B-2` / `// W0-…` comments in module's surface area.
- [ ] `npm run lint` clean in `labbe-backend-`, `labbe`, `halla-mobile` (or no new warnings introduced).
- [ ] Visual smoke test: every page/screen looks identical before/after the refactor — `host/plans`, `admin-dash/manage-plans`, whitelabel signup StepFive, mobile `PlansScreen`, mobile `WhitelabelStep4PlanSelection`.
