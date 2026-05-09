# Discounts — Full-Stack Review Plan

**Module:** discounts
**Generated:** 2026-05-07
**Prompt:** docs/implementation/MODULE_FULLSTACK_REVIEW_PROMPT.md
**Status:** Awaiting green light · NOT IMPLEMENTED YET

---

## 0. Executive Summary

- **7** total endpoints in module (1 public-validate + 6 admin CRUD).
- **0** candidates for outright deletion (no duplicate endpoints), but **1 dead file** (`labbe/app/[lang]/admin-dash/discounts/_components/DiscountsContent.jsx`) + **2 dead-branch fallbacks** in web/mobile.
- **7** Swagger drift findings — **all 7 endpoints have NO `@swagger` annotation** (A7 violation).
- **0** backend file-size violations (largest is `discounts.service.js` at 280 lines, cap 600).
- **2** web file-size violations (`DiscountsFormPopup.jsx` 359 / `DiscountsTable.jsx` 268 — cap 250; plus `Summary.js` 397 — cap 250, but only the discount slice is in scope here).
- **0** mobile file-size violations (largest is `DiscountFormModal.js` 262 — cap 350).
- **5** web/mobile API consumption mismatches (response envelope drift, query-key prefix divergence, hook layer divergence, `planType` payload divergence between web and mobile, missing `applicablePlanTypes` field on mobile form).
- **3** data-mapping bugs / fallback chains (web `Summary.js:82`, mobile `AdminDiscountsScreen.js:41`, mobile `useAdminDiscounts` over-unwrap).
- **9** missing/incorrect backend safeguards: no Joi validation, no rate limit on `/validate`, no audit log on any mutation, controller bypasses `responseHelper`, controller does request-validation, sequential awaits in `getAll`, no `.lean()`/`.select()`, no Swagger, no `requirePageAccess` (uses `restrictTo` against admin pages — A4.2 violation), and `MODERATOR` is included in `DISCOUNT_MANAGERS` while every web/mobile RBAC matrix denies discounts to MODERATOR.
- **0** comment-hygiene blocks to remove in the discounts module itself; **2** in adjacent files (`adminDashboardService.js:5–11` "Phase 4 W0-AUTH" header, `subscriptionService.js:21` outdated tag — out of scope, leave for those modules' reviews).
- **Estimated effort:** **M** (1.5–2 days backend + frontend + mobile parity).

---

## 1. Endpoint Inventory

Mounted under `/api/v2/discounts` (and the legacy `/api` mirror) by `labbe-backend-/src/app.js:226`. Every route runs `protect`.

| # | Method | Path | Controller | Service | Middleware chain | Swagger | Web hook | Mobile hook | Status |
|---|--------|------|------------|---------|------------------|---------|----------|-------------|--------|
| 1 | POST   | `/discounts/validate`        | `discounts.controller.validate`     | `discountsService.validate`     | `protect`, `filterByWhitelabel`                                        | MISSING | `discountsAPI.validate` (direct call, no React Query) | `adminDashboardService.discounts.validate` (direct, no hook) | KEEP |
| 2 | GET    | `/discounts/admin`           | `discounts.controller.getAll`       | `discountsService.getAll`       | `protect`, `restrictTo(SUPER_ADMIN, ADMIN, MODERATOR)`, `filterByWhitelabel` | MISSING | `useQuery(["discounts","admin",filters], discountsAPI.getAll)` (inlined in `DiscountsStats.jsx` + `DiscountsTable.jsx`) | `useAdminDiscounts` | KEEP |
| 3 | POST   | `/discounts/admin`           | `discounts.controller.create`       | `discountsService.create`       | `protect`, `restrictTo(...)`, `filterByWhitelabel`                     | MISSING | `useMutation` inlined in `DiscountsFormPopup.jsx` → `discountsAPI.create` | `useCreateDiscount` | KEEP |
| 4 | GET    | `/discounts/admin/:id`       | `discounts.controller.getById`      | `discountsService.getById`      | `protect`, `restrictTo(...)`, `validateObjectId('id')`                  | MISSING | (none — popup uses row data) | (none — list item carries data) | KEEP (low traffic; document) |
| 5 | PATCH  | `/discounts/admin/:id`       | `discounts.controller.update`       | `discountsService.update`       | `protect`, `restrictTo(...)`, `validateObjectId('id')`                  | MISSING | inlined `useMutation` in `DiscountsFormPopup.jsx` → `discountsAPI.update` | `useUpdateDiscount` | KEEP |
| 6 | PATCH  | `/discounts/admin/:id/toggle`| `discounts.controller.toggleStatus` | `discountsService.toggleStatus` | `protect`, `restrictTo(...)`, `validateObjectId('id')`                  | MISSING | inlined `useMutation` in `DiscountsTable.jsx` → `discountsAPI.toggleStatus` | `useToggleDiscount` | KEEP |
| 7 | DELETE | `/discounts/admin/:id`       | `discounts.controller.delete`       | `discountsService.delete`       | `protect`, `restrictTo(...)`, `validateObjectId('id')`                  | MISSING | inlined `useMutation` in `DiscountsTable.jsx` → `discountsAPI.delete` | `useDeleteDiscount` | KEEP |

**Legend:** KEEP, DELETE-DUPLICATE-OF-#N, RENAME, MERGE-WITH-#N. None of the rows are duplicates.

**Cross-module callers of the service (verify before refactor):**
- `subscriptions.service.js:593` — `discountsService.applyDiscount(discountCode)` after a free / zero-amount subscription is created.
- `subscriptions.service.js:722` — `discountsService.applyDiscount(intent.discountCode)` after a Moyasar payment is captured.

`applyDiscount` is **not** exposed via HTTP — it's only invoked internally by subscriptions.

---

## 2. Backend Findings

### 2.1 File-size violations
None. All four files are well under their caps:
- `discounts.routes.js` — 105 lines (cap 400). OK.
- `discounts.controller.js` — 100 lines (cap 300). OK.
- `discounts.service.js` — 280 lines (cap 600). OK.
- `index.js` — 10 lines. OK.

No split required. (`discounts.validation.js` does not exist — see §2.6.)

### 2.2 Swagger drift
The module has **zero `@swagger` JSDoc blocks** (`grep @swagger labbe-backend-/src/modules/discounts → 0 hits`). All 7 endpoints are missing OpenAPI annotations entirely. Add a JSDoc block above each route with:

- `tags: [Discounts]`
- `summary` + `description`
- `parameters` (path/query) using `$ref: '#/components/parameters/IdParam'` for `:id` and `PageParam`/`LimitParam` for the admin list
- `requestBody` with `$ref` to a new schema `DiscountInput` (create/update payload)
- `responses` with refs to a new schema `DiscountResponse` and the standard `401`/`403`/`404`/`409` envelopes

New schemas to register in `labbe-backend-/src/config/swagger.js → components.schemas`:
- `Discount` — id, code, descriptionEn, descriptionAr, discountType (enum: percentage|fixed), value, maxUses, usedCount, validFrom, validUntil, isActive, applicablePlanTypes (string[]), minimumAmount, whitelabelId, createdBy, createdAt, updatedAt
- `DiscountInput` — same minus id/usedCount/createdAt/updatedAt; mark `code`, `discountType`, `value` as required
- `DiscountValidateRequest` — { code, amount, planType? }
- `DiscountValidateResponse` — discriminated union of `{ valid: false, reason }` and `{ valid: true, code, discountType, value, discountAmount, finalAmount, descriptionEn, descriptionAr }`

### 2.3 Missing middleware / safeguards

| Route | Issue | Fix |
|-------|-------|-----|
| `POST /discounts/validate` (`discounts.routes.js:29-33`) | No rate limit. Authenticated callers can brute-force the 30-char `^[A-Z0-9_-]{3,30}$` keyspace. | Add `authLimiter` (or a new `validateLimiter` if tighter — recommend the existing `authLimiter` for now; backend has no per-user-per-endpoint limiter but `authLimiter` is appropriate). |
| `POST /discounts/validate` | Controller does request-shape validation inline (lines 76-87) — A2.3 / A4.4 violation. | Move to Joi schema `validateDiscountSchema` invoked via `validate(...)` middleware. |
| All admin routes | RBAC uses `restrictTo(SUPER_ADMIN, ADMIN, MODERATOR)` — A4.2 violation. The matching ADMIN_PAGES key (`ADMIN_PAGES.DISCOUNTS`) and matrix already exist in `labbe-backend-/src/shared/constants/permissions.js:73,111,127`. | Replace `restrictTo(...DISCOUNT_MANAGERS)` with `requirePageAccess(ADMIN_PAGES.DISCOUNTS, "view")` for GET, `"create"` for POST, `"update"` for PATCH, `"delete"` for DELETE, `"export"` is N/A. |
| All admin routes | The `MODERATOR` role in `DISCOUNT_MANAGERS` (`discounts.routes.js:16`) contradicts every RBAC matrix: `permissions.js:131` (backend), `serverAuth.js:130` (web), `adminPermissions.js` (mobile) all set DISCOUNTS=NONE for MODERATOR. So a MODERATOR can hit `/discounts/admin` directly via curl despite no UI access. | Fix by switching to `requirePageAccess(ADMIN_PAGES.DISCOUNTS, …)` (above) — the matrix decides, and MODERATOR will be denied automatically. |
| All admin routes | No `requirePageAccess` for `WHITELABEL_ADMIN`, but the route runs `filterByWhitelabel` and the service supports `whitelabelId` scoping — design intent is unclear. The web/mobile matrix denies whitelabel admins, but the backend's whitelabel scope hooks are wired up. | Decision needed (§6 bug #1). Recommend: keep platform-only for now (matches the matrix) and remove `filterByWhitelabel` from admin routes until whitelabel-scoped discounts are explicitly turned on. |
| `POST /discounts/admin`, `PATCH /discounts/admin/:id`, `PATCH /discounts/admin/:id/toggle`, `DELETE /discounts/admin/:id` | No `logAudit` calls. A3.6 / D5 violation — discount creation/edit/toggle/delete are exactly the kind of admin-financial change that must be auditable. | Add `logAudit(req, { action: 'create' \| 'update' \| 'toggle' \| 'delete', resource: 'discount', resourceId, before, after })` in service after each successful mutation. (`AuditLog` enum already accepts `'discount'` per `models/AuditLogModel.js`; verify before adding.) |
| All routes | No idempotency middleware on `POST /discounts/admin`. Admin form double-clicks could create two duplicate-named codes — though the unique index on `code` saves us. | Optional. Recommend skipping idempotency-key middleware here; the unique index + existence check already protects. Note in §6. |

### 2.4 Duplicate / dead endpoints
None. Every endpoint serves a distinct purpose.

### 2.5 Service / controller violations

| File:line | Issue | Fix |
|-----------|-------|-----|
| `discounts.controller.js:21,30,39,48,57,66,96` | Every handler calls `res.status(...).json({ status: 'success', ...result })` directly — A2.2 violation. Should use `responseHelper`. | Use `sendSuccess(res, result.discount \|\| result, 'message')`, `sendCreated(res, result.discount, 'Discount created')`, `sendPaginated(res, result.discounts, result.pagination)`, `sendDeleted(res, 'Discount deleted')`. **This changes the wire shape** (top-level `discounts` → nested under `data`) — see §5 for matching frontend changes. |
| `discounts.controller.js:73-87` | Inline `if (!code)` / `if (!amount)` request validation — A2.3 + A4.4 violation. | Move to a Joi `validateDiscountSchema` and remove the manual checks from the controller. |
| `discounts.service.js:42-47` | Sequential awaits: `await Discount.countDocuments(query); const discounts = await Discount.find(...)`. A3.3 violation. | Wrap in `Promise.all`: `const [total, discounts] = await Promise.all([Discount.countDocuments(query), Discount.find(query).populate(...).sort(...).skip(skip).limit(parseInt(limit)).lean()]);` |
| `discounts.service.js:43-47, 64` | No `.lean()` on read-only queries. A3.4 violation. (The list result is mapped through `_format` which only reads fields — safe to `.lean()`. `getById` is also read-only and returned via `_format`.) | Add `.lean()` to both list and `getById` queries. The methods on the doc (`isValid`, `calculateDiscount`, `incrementUsage`) are only used inside `validate` and `applyDiscount`, which already do their own `findOne` — keep those non-lean. |
| `discounts.service.js:43,64` | `populate('createdBy', 'name email')` — fine, projection is explicit. But `_format` returns the populated object as-is. After `.lean()` the populated value is a plain object (good); ensure web/mobile mapping doesn't break (it reads `discount.createdBy.name` — currently unused on web/mobile UI; verify before locking in). | Verify — likely safe. |
| `discounts.service.js:98-101` | `findOne({ code })` + `Discount.create(...)` — TOCTOU race against the unique index. The throw-then-create pattern is acceptable (the unique index is the real guard) but the duplicate-key error on `Discount.create` is currently caught only by the global handler, which converts it to a generic message. | Either (a) drop the pre-check and let the global handler render `DUPLICATE_FIELD` + reformat the message in `globalErrorHandler`, or (b) keep both but add a try/catch around `create()` that re-throws as `ConflictError` if it's a duplicate key on `code`. Recommend (a) — simpler. |
| `discounts.service.js:155-158`, `164-170` | `delete()` and `toggleStatus()` return `_format(discount)` for toggle but only `{message}` for delete. After `_format` the `createdBy` is the raw ObjectId because `findById(id)` (line 165) doesn't `populate`. UI may render `null` / object-Id post-toggle. | In `toggleStatus`, replace with `findByIdAndUpdate(id, [{ $set: { isActive: { $not: '$isActive' } } }], { new: true }).populate('createdBy','name email').lean()` to keep the shape consistent and atomic. |
| `discounts.service.js:113` | `applicablePlanTypes: applicablePlanTypes \|\| []` accepts any string. There is no enum constraint — neither in the model nor in the Joi schema (which doesn't exist). Web sends `["single_event","subscription","enterprise","trial","lite","pro","elite"]`; mobile doesn't expose the field at all; backend `validate()` is called with `planType: planFamily` ("basic"/"premium") on web and `planType: selectedPlan?.code` on mobile — none of which match the enum web's create-form lists. | (1) Define a single enum (`PLAN_TYPES`) in `shared/constants/` and use it on the model `enum:`, the Joi schema, and the web form's `PLAN_TYPE_OPTIONS`. (2) Decide what `planType` callers should pass — see §6 bug #2. |
| `discounts.service.js:183-200` | `validate()` returns `{ valid: false, reason: 'Invalid discount code' }` on **every** failure. Good UX but no signal whether the code exists / is just expired etc. — verify this is intentional (security: don't leak which codes exist to brute force). Likely OK, but document it. | Add `// Why: do not differentiate "invalid code" vs "expired" to avoid leaking the keyspace to brute force.` comment above line 198. |
| `discounts.service.js:246-251` | `applyDiscount()` does `findOne` then `incrementUsage` — two trips. The `incrementUsage` itself is `$inc`-atomic, but the find+inc race could exceed `maxUses` slightly under heavy contention. | Replace with one atomic op: `Discount.findOneAndUpdate({ code: code.toUpperCase(), $or: [{ maxUses: 0 }, { $expr: { $lt: ['$usedCount', '$maxUses'] } }] }, { $inc: { usedCount: 1 } });` — and surface a `ConflictError` if zero docs were updated and the code exists with `usedCount >= maxUses`. The subscriptions caller currently ignores the result either way, so this is a soft fix. |
| `discounts.service.js:103-118` | `Discount.create(...)` allows callers to pass `whitelabelId` straight from the body. Since the route already runs `filterByWhitelabel`, a WHITELABEL_ADMIN (if ever enabled) could create platform-wide discounts by sending `whitelabelId: null` in the body. | In `create()`, if `req.user.role` is whitelabel-scoped, **force** `whitelabelId = requestingUser.whitelabelId` regardless of body value. Pass `req.user` into `create()` and apply server-side. (Currently moot because matrix denies whitelabel admins — but the bug is dormant.) |

### 2.6 Validation gaps
**No `discounts.validation.js` file exists.** Add it with these Joi schemas:

```js
// shared validators
const codePattern = /^[A-Z0-9_-]{3,30}$/;
const planTypePattern = Joi.string(); // tighten to enum once §6 bug #2 is decided

// createDiscountSchema (POST /discounts/admin)
{
  code:               Joi.string().pattern(codePattern).uppercase().required(),
  descriptionEn:      Joi.string().allow('').max(200).optional(),
  descriptionAr:      Joi.string().allow('').max(200).optional(),
  discountType:       Joi.string().valid('percentage','fixed').required(),
  value:              Joi.number().min(0).when('discountType', { is: 'percentage', then: Joi.number().max(100) }).required(),
  maxUses:            Joi.number().integer().min(0).default(0),
  validFrom:          Joi.date().iso().optional(),
  validUntil:         Joi.date().iso().greater(Joi.ref('validFrom')).optional(),
  isActive:           Joi.boolean().default(true),
  applicablePlanTypes:Joi.array().items(planTypePattern).default([]),
  minimumAmount:      Joi.number().min(0).default(0),
  whitelabelId:       Joi.string().hex().length(24).allow(null).optional(),
}.unknown(false)

// updateDiscountSchema (PATCH /discounts/admin/:id) — same as create minus `code` (immutable per UI),
// every field optional, no defaults.

// validateDiscountSchema (POST /discounts/validate)
{
  code:     Joi.string().pattern(codePattern).uppercase().required(),
  amount:   Joi.number().min(0).required(),
  planType: planTypePattern.allow(null, '').optional(),
}.unknown(false)
```

Wire all three through `validate(schema)` middleware in `discounts.routes.js`.

### 2.7 Comment hygiene
- `discounts.routes.js:15`: `// Roles that can manage discounts` — remove (variable name says it). Will become moot when §2.3 replaces `restrictTo` with `requirePageAccess`.
- `discounts.routes.js:21-23,35-37,172-174` (service): banner comments `// =====... PUBLIC` / `// =====... ADMIN-ONLY CRUD` / `// PRIVATE`. Allowed if they materially help, but in a 105-line file they're noise. Recommend removing the route-file banners; keep the service banners (the service is 280 lines).
- `discounts.service.js:30,57,73,123,153,162,176,242` — JSDoc comments are fine, no FLOW/PHASE/BUG markers.

No PHASE/FLOW/BUG markers found in this module's source files. **Total markers to strip: 0** (count is for `discounts/*` only; the surrounding subscriptions / adminDashboard files have their own).

---

## 3. Frontend Web Findings

### 3.1 Component tree per page

**`labbe/app/[lang]/admin-dash/discounts/page.js` (38 lines)** — server component, prefetches `["discounts","admin",filters]` against hardcoded path `/discounts/admin`.
- `_components/DiscountsPageContent.jsx` (41 lines) — orchestrator
  - `_components/DiscountsPageHeader.jsx` (17 lines)
    - `app/[lang]/admin-dash/_components/AdminPageHeader` (out of scope — verify line count separately)
  - `_components/DiscountsStats.jsx` (75 lines)
    - `ui/host/main-page/StatsCards` (out of scope)
  - `_components/DiscountsTable.jsx` (**268 lines — VIOLATION cap=250**)
    - `ui/commen/new-table/Table` (out of scope)
    - `ui/common/loading/SimpleLoading` (out of scope)
  - `_components/DiscountsFormPopup.jsx` (**359 lines — VIOLATION cap=250**)
    - `ui/commen/popup/PopupLayout` (out of scope)

**`labbe/app/[lang]/host/plans/summary/Summary.js` (397 lines — VIOLATION cap=250 for the whole file, but only the discount slice is in scope here)** — calls `discountsAPI.validate(...)` directly (lines 77-81) without React Query.

Dead file:
- `_components/DiscountsContent.jsx` — 7 lines, contents are just a comment saying "this file is no longer used". **Delete it.**

### 3.2 File-size violations

| File | Lines | Cap | Proposed split | Style preservation note |
|------|-------|-----|----------------|-------------------------|
| `discounts/_components/DiscountsTable.jsx` | 268 | 250 | Extract `getDiscountStatus`, `buildFilters` and the inline `renderCell` into a sibling `_components/DiscountsTableHelpers.js`. Extract the `filterOptions` factory and `handlePageChange` callback into `useDiscountsTableFilters` hook. Move the inline status-pill `style={{...}}` to `DiscountsTable.module.css` (see §3.6) which also brings the file down. | Keep `styles.codeCell`, `styles.codeText`, `styles.copyBtn`, `styles.container` references unchanged. The status-pill currently uses `style={{ display:'inline-flex', padding:'0.3rem 1.2rem', borderRadius:'9999px', background:cfg.bg, color:cfg.color, fontSize:'1.2rem', fontFamily:'Cairo' }}` — moving these declarations to `.module.css` (with status-color CSS variables) **is a style change**; verify pixel match before/after. |
| `discounts/_components/DiscountsFormPopup.jsx` | 359 | 250 | Extract the JSX form body (the `<div className={styles.grid}>` and the actions row) into `_components/DiscountsFormBody.jsx`. Extract `validate()` + `EMPTY_FORM` + `PLAN_TYPE_OPTIONS` constant into `_components/discountsFormUtils.js`. The mutations stay in the parent. Optionally migrate to RHF + Zod (B12) — but flag separately, do not bundle. | Keep `styles.modal`, `styles.title`, `styles.grid`, `styles.field`, `styles.fieldFull`, `styles.label`, `styles.input`, `styles.inputError`, `styles.error`, `styles.statusToggle`, `styles.statusActive`, `styles.statusInactive`, `styles.chips`, `styles.chip`, `styles.chipActive`, `styles.actions`, `styles.cancelBtn`, `styles.saveBtn` references identical. Import the same `.module.css` into the extracted component. |

`Summary.js` (397 lines) is over cap but it lives outside the discounts module's surface area; call it out for the `plans` module review.

### 3.3 Hardcoded text / data / paths

- `labbe/services/adminDashboard.js:907,912,916,921,926,931,938` — every path is a string literal (`"/discounts/admin"`, `"/discounts/validate"` etc.) instead of an `API_PATHS` constant. **B7 violation.** `labbe/services/new-backend/api.config.js` has no `discounts` block at all. Add:
  ```js
  discounts: {
    list:   "/discounts/admin",
    byId:   (id) => `/discounts/admin/${id}`,
    create: "/discounts/admin",
    update: (id) => `/discounts/admin/${id}`,
    toggle: (id) => `/discounts/admin/${id}/toggle`,
    delete: (id) => `/discounts/admin/${id}`,
    validate: "/discounts/validate",
  }
  ```
  Then either (a) migrate `discountsAPI` (in `adminDashboard.js`) to use them, or (b) replace `discountsAPI` entirely with a canonical `useDiscounts*` hook in `labbe/hooks/reactQueryHooks/useDiscounts.js`.

- `labbe/app/[lang]/admin-dash/discounts/page.js:27` — server-side prefetch uses literal `"/discounts/admin"`. After the API_PATHS work above, switch to `path: API_PATHS.discounts.list`.

- `Summary.js` discount slice uses **literal Arabic/English strings** for placeholders, errors, button labels (lines 92-94, 100-101, 244-246, etc.). B2 violation. Locale keys to add (see §8).

- `DiscountsTable.jsx:166` — `new Date(value).toLocaleDateString("ar-SA")` is hardcoded `ar-SA` regardless of `i18n.language`. Pass the active locale.

- `DiscountsFormPopup.jsx:13-21` — `PLAN_TYPE_OPTIONS` is **hardcoded** with `{en, ar}` strings. B2 + B3 violation. Should source labels from `t("discounts.planTypes.<value>")` and source the values from a single shared `PLAN_TYPES` constant (also fixes the planType drift from §2.5).

### 3.4 Data mapping bugs / fallback chains

| File:line | Code | Problem | Fix |
|-----------|------|---------|-----|
| `Summary.js:82` | `const result = response?.data || response;` | Backend wire shape for `/discounts/validate` is `{ status:'success', data: {valid, ...} }`. The legacy `apiClient` returns the parsed body. So `response.data` is the inner object — **never** the legacy fallback `response`. The `\|\| response` branch is dead. B0.1 violation. | `const result = response?.data;` — drop the fallback. |
| `DiscountsStats.jsx:34-42`, `DiscountsTable.jsx:92-93` | Direct `data.discounts` / `data.pagination` reads. | Currently works because the controller emits `{status, discounts, pagination}` (top-level). After §2.5 ("use `sendPaginated`") the wire becomes `{success:true, data:{ items: [...] }, pagination: {...}}` — these reads will break. | Must change in lock-step with §2.5: switch to `data?.data?.discounts \|\| []` and `data?.pagination`. (Or keep `sendSuccess(res, { discounts, pagination })` if we don't want to use `sendPaginated` — decide in §2.5.) |

### 3.5 Duplicate hooks / direct apiRequest calls

- `DiscountsStats.jsx:27-31` and `DiscountsTable.jsx:41-45` each define their own `useQuery({ queryKey: ["discounts","admin",filters], queryFn: () => discountsAPI.getAll(filters) })`. Same key, same params — TanStack will dedupe at runtime, but it's still **B0.2 / B6 violation** (no canonical hook). Extract `useDiscounts(filters)` into `labbe/hooks/reactQueryHooks/useDiscounts.js`; import from both components.

- `DiscountsTable.jsx:47-57` defines mutations `toggleDiscount` and `deleteDiscount` inline. Move to `useDiscountMutation('toggle' \| 'delete')` factory in the same hook file (B6 pattern).

- `DiscountsFormPopup.jsx:74-96` defines `createMutation` and `updateMutation` inline. Move to `useDiscountMutation('create' \| 'update')`.

- `Summary.js:77-81` calls `discountsAPI.validate(...)` directly inside an event handler — no React Query, no hook. Add `useValidateDiscount` mutation hook (one-shot validation) in `useDiscounts.js` and use it from `Summary.js`.

- `discountsAPI` lives in `labbe/services/adminDashboard.js` and uses the **legacy** `apiClient` (the one re-exported from `services/apiClient.js`) — distinct from `services/new-backend/apiClient`. Once the canonical hook exists, delete `discountsAPI` and rely on the new hook. (Out-of-scope reminder: `Summary.js` will need a new mutation hook before the legacy export can go.)

### 3.6 State / loading / error gaps

- `DiscountsTable.jsx:88-90` — `if (error) return null;` swallows errors silently. Replace with the project's standard error UI (see B13: `<div className={styles.error}>{t("errors.loadFailed")}</div>`).
- `DiscountsTable.jsx:88` and `DiscountsStats.jsx:72` — neither distinguishes empty vs not-loaded. After error fix, render `<EmptyState>` when `discounts.length === 0`.
- `DiscountsFormPopup.jsx:132-150` — `handleSubmit` only `mutate()`s; `createMutation`/`updateMutation` rely on `onError` for toast, which is fine — but the form doesn't disable inputs while pending (only the buttons). Acceptable but document.
- `DiscountsTable.jsx:73` — `confirm("...")` is the browser native confirm. The project uses `PopupLayout` confirms elsewhere (verify in `ui/`). Replace with the project's standard confirm dialog. B9 / B10.
- `DiscountsTable.jsx:147-160` — inline `style={{ display:'inline-flex', ... }}` on the status pill. **B11 violation.** Move to `DiscountsTable.module.css` with status-color CSS variables (e.g. `--status-active-bg`, `--status-active-fg`, etc.). **Style preservation note:** the bg/fg colors must match the existing literal hex values exactly (`#EAF4EF/#2A8C5B`, `#F5F5F5/#666`, `#F9EBEA/#C0392B`, `#FBF3E6/#D38200`).
- `DiscountsTable.jsx:235-239` — `handlePageChange` is wrapped in `useCallback` ✓. But `filterOptions` (lines 205-233) defines three inline `() => { router.push(...) }` callbacks each render. Memoize with `useMemo`/`useCallback`.
- `Summary.js` discount slice: state is in 5 separate `useState`s (lines 39-43). Acceptable, but `discountLoading` could be replaced by the React Query mutation's `isPending` once the hook is added.
- Page-level: `page.js` is a server component; it does not wrap children in `ErrorBoundary` (B19). The file does call `requirePageAccess("discounts", lang)` so RBAC ✓. Recommend wrapping `<DiscountsPageContent />` in the project's `ErrorBoundary` (verify the convention used by sibling admin pages — e.g. `admin-dash/hosts/page.js` — and copy).

### 3.7 Comment hygiene
- `_components/DiscountsContent.jsx` — 7-line dead-file marker. Delete the file entirely.
- `_components/DiscountsTable.jsx:107` — `// kept for actions lookup` — keep (this *why* would not be obvious).
- `_components/DiscountsFormPopup.jsx:45` — `// Populate form when editing` — re-states code; remove.
- No FLOW/PHASE/BUG/ticket-number markers.

---

## 4. Frontend Mobile Findings

### 4.1 Screen → component tree

**`halla-mobile/screens/admin/admin-dashboard/AdminDiscountsScreen.js` (191 lines)** — admin list / search / filter / delete / toggle.
- `components/plans/TopBar` (out of scope)
- `components/admin-dashboard/common/AdminPageHeader` (out of scope)
- `components/admin-dashboard/common/AdminFlatList` (out of scope)
- `components/admin-dashboard/discounts/DiscountListItem.js` (247 lines) — OK (cap 350)
- `components/admin-dashboard/discounts/DiscountFormModal.js` (262 lines) — OK
  - `_components/DiscountFormFields.js` (217 lines) — OK
- `components/admin-dashboard/discounts/index.js` (2 lines) — barrel export

**`halla-mobile/screens/host/PlansSummaryScreen.js`** — uses `adminDashboardService.discounts.validate(...)` directly (lines 50-54).

**`halla-mobile/screens/admin/WhitelabelPlansSummaryScreen.js`** — same direct call (lines 61-65).

Both summary screens render `components/plans/DiscountCodeCard.js` (130 lines).

### 4.2 File-size violations
None. All under cap 350.

### 4.3 Service / hook violations

| File:line | Issue | Fix |
|-----------|-------|-----|
| `halla-mobile/services/adminDashboardService.js:25-58` | `apiRequest` wraps `apiFetch` and re-wraps the JSON body in `{ success, data, error }`. **Different shape** than the canonical mobile `_request` pattern in `ticketsService.js` (which returns `data` directly). C1 violation. | Out-of-scope to fully migrate (touches every admin-* domain), but flag for a future cross-service review. For now, accept the wrapped shape and document the unwrap path the discounts hooks use. |
| `halla-mobile/hooks/queries/useAdmin.js:226-237` | `useAdminDiscounts` returns `response.data` from the wrapped envelope. Then the screen reads `data?.data \|\| data` (`AdminDiscountsScreen.js:41`) — fallback chain. Currently works because: `response.data` = `{status,discounts,pagination}`, so `data?.data` is undefined and falls to `data`, and `d.discounts` reads. But fragile. C3 violation. | (1) Once §2.5 backend change lands and the wire becomes `{ success, data: { discounts, pagination } }`, the hook can `return response.data?.data` and the screen can read `data?.discounts` directly. (2) Drop the fallback in `AdminDiscountsScreen.js:41`. |
| `halla-mobile/hooks/queries/useAdmin.js:229` | Query key is `['admin', 'discounts', params]`. **Web uses** `['discounts', 'admin', params]`. The platforms diverge on the key prefix — the actual data is the same, but cache invalidation across hooks won't behave consistently if the platforms ever share a query client. | Pick a canonical convention: web's `['discounts', 'admin', filters]` is consistent with backend route shape. Mobile should switch to `['discounts', 'admin', filters]`. Update mutations in `useAdminMutations.js` (lines 530, 544, 558, 572) accordingly. |
| `halla-mobile/hooks/queries/useAdmin.js:222,235` | `staleTime: 2 * 60 * 1000`. Web uses `5 * 60 * 1000`. C2 says project standard is 3-5min for list/detail. Tighten or align. | Pick 5min on both, or 3min on both. Recommend 5min. |
| `halla-mobile/hooks/mutations/useAdminMutations.js:521-573` | All four mutation hooks invalidate `['admin', 'discounts']` only. After fix above, switch to `['discounts']` (broader prefix) to match web — currently web invalidates `['discounts']` (`DiscountsTable.jsx:50,56`, `DiscountsFormPopup.jsx:72`) which catches both `['discounts','admin',filters]` and any future `['discounts','validate',...]`. | Match web: invalidate `['discounts']`. |
| `halla-mobile/screens/host/PlansSummaryScreen.js:50` and `screens/admin/WhitelabelPlansSummaryScreen.js:61` | Direct `adminDashboardService.discounts.validate(...)` call inside the screen. C2 forbids direct service calls in screens — go through a hook. | Add `useValidateDiscount` (mutation hook) in `halla-mobile/hooks/mutations/useDiscountMutations.js` (new file), use it from both screens. |
| `components/admin-dashboard/discounts/DiscountFormModal.js:27-38, 97-108` | Mobile create/update payload **omits `applicablePlanTypes` and `descriptionEn/Ar` field types are limited**. Web allows multi-select plan types; mobile sends nothing. After §2.5 enum tightening, mobile-created discounts will silently apply to all plans — divergence from web behaviour. C5 / D1 violation. | Add a multi-select field in `DiscountFormFields.js` (chip pattern, mirroring web). |
| `screens/host/PlansSummaryScreen.js:53` | Sends `planType: selectedPlan?.code \|\| null`. | See §6 bug #2 — `planType` payload is inconsistent across web (`planFamily`, e.g. "basic"/"premium") and mobile (`selectedPlan?.code`). |
| `screens/admin/WhitelabelPlansSummaryScreen.js:64` | Same `planType: selectedPlan?.code` pattern. | Same fix. |

### 4.4 Hardcoded text / data / paths

- `halla-mobile/services/adminDashboardService.js:341,345,348,351,354,357` — every path is a literal. Mobile equivalent of `API_PATHS` is `halla-mobile/config/api.js → ENDPOINTS`. **C1 violation: paths missing.** Add an `ENDPOINTS.DISCOUNTS = { ADMIN: '/discounts/admin', BY_ID: id => `/discounts/admin/${id}`, TOGGLE: id => `/discounts/admin/${id}/toggle`, VALIDATE: '/discounts/validate' }` block.
- `DiscountListItem.js` — uses `t()` correctly throughout (verify on read).
- `DiscountFormModal.js`, `DiscountFormFields.js` — uses `t()` correctly throughout (verify on read).
- `DiscountCodeCard.js` — uses `t("summary.discountCode.*")` correctly.

### 4.5 Web/Mobile divergence

| Endpoint | Aspect | Web | Mobile | Action |
|----------|--------|-----|--------|--------|
| `GET /discounts/admin` | response wire | reads `data.discounts` directly (top-level) | reads `data?.data \|\| data` then `.discounts` (fallback chain) | After §2.5 change, both read `data?.data?.discounts`. Drop mobile fallback. |
| `GET /discounts/admin` | query-key prefix | `["discounts","admin",filters]` | `['admin','discounts',params]` | Mobile → `["discounts","admin",filters]`. |
| `POST /discounts/admin` | form payload | includes `applicablePlanTypes`, `descriptionEn/Ar` | omits `applicablePlanTypes` | Add field to mobile form (§4.3). |
| `POST /discounts/validate` | `planType` argument | sends `planFamily` ("basic" / "premium") (`Summary.js:80`) | sends `selectedPlan?.code` (mobile) | Backend's `applicablePlanTypes` enum is the canonical list — both clients must converge on the **same** vocabulary as the create-form's `PLAN_TYPE_OPTIONS`. Decision: web's `planFamily` is wrong (it's never in `applicablePlanTypes`); mobile's `selectedPlan?.code` may or may not match. **Pick a canonical set, document it, and align both clients + the backend Joi.** §6 bug #2. |
| `POST /discounts/validate` | invocation layer | direct `discountsAPI.validate` (no hook) | direct service call (no hook) | Both: extract canonical hook (`useValidateDiscount`) on each platform. |
| Toggle/Delete/Update invalidation | invalidation key | `['discounts']` | `['admin','discounts']` | Align (§4.3). |
| `staleTime` on list query | duration | 5 min | 2 min | Pick one (recommend 5 min). |

### 4.6 Loading / error / empty states
- `AdminDiscountsScreen.js:36-38` — surfaces error via toast + `useEffect`. The list still renders (empty). Acceptable but the user has no inline retry beyond pull-to-refresh. C6 says "retry affordance" — `AdminFlatList` provides `onRefresh` ✓ — adequate.
- `PlansSummaryScreen.js:46-83`, `WhitelabelPlansSummaryScreen.js:57-95` — discount validation has loading (`validating`) and toast errors. ✓.

### 4.7 Comment hygiene
- `halla-mobile/services/adminDashboardService.js:5-11` header — "Phase 4 W0-AUTH …" — out of scope of the discounts module (touches every admin-* service). **Do not modify** as part of this review.
- No PHASE/FLOW/BUG markers inside the discounts mobile files themselves.

---

## 5. Cross-Platform API Consumption Diff

| Endpoint | Aspect | Web | Mobile | Backend truth | Action |
|----------|--------|-----|--------|---------------|--------|
| `GET /discounts/admin` | path | `/discounts/admin` ✓ | `/discounts/admin` ✓ | `/discounts/admin` | OK |
| `GET /discounts/admin` | query params | `{page,limit,search,isActive}` | `{page,limit,search,isActive}` | accepts all four | OK |
| `GET /discounts/admin` | response root | `{status,discounts,pagination}` (top-level — current) → after §2.5 `{success,data:{discounts},pagination}` | same body, wrapped by `apiRequest` | match after §2.5 | Coordinate web + mobile reads with backend change |
| `POST /discounts/admin` | body fields | code, descriptionEn, descriptionAr, discountType, value, maxUses, validFrom, validUntil, isActive, applicablePlanTypes, minimumAmount | code, descriptionEn, descriptionAr, discountType, value, maxUses, validFrom, validUntil, minimumAmount, isActive (**no applicablePlanTypes**) | accepts all listed | Add `applicablePlanTypes` to mobile form |
| `POST /discounts/validate` | body | `{code, amount, planType: planFamily}` | `{code, amount, planType: selectedPlan?.code}` | accepts; treats unknown planType as no-restriction | **Decide canonical `planType` vocabulary** (§6) and align both clients |
| `POST /discounts/validate` | response | `{status, data: {valid, ...}}` | wrapped: `res.data.data` | unchanged after §2.5 (validate uses raw `res.json`, not responseHelper) | Switch validate to `sendSuccess(res, result)` for consistency — see §2.5 |
| Mutation invalidation | key | `['discounts']` | `['admin','discounts']` | n/a | Align mobile to web |
| Hook layer | canonical hook | mixed (inline `useQuery`/`useMutation`) | `useAdminDiscounts`/`useCreateDiscount`/etc. | n/a | Web: extract canonical `useDiscounts*` hooks. Mobile: rename keys + add `useValidateDiscount`. |

---

## 6. Suspected Bugs Worth Verifying

1. **Whitelabel-scoped discounts may be unreachable.** The route mounts `filterByWhitelabel`, the model has a `whitelabelId` field, and the service reads it — but every RBAC matrix (`permissions.js:131`, `serverAuth.js:130`, `adminPermissions.js`) sets DISCOUNTS=NONE for `WHITELABEL_ADMIN`/`WHITELABEL_MODERATOR`. No whitelabel admin can access `/discounts/admin`, so the whitelabel scoping is dead code today. **Decision needed:** either (a) enable WHITELABEL_ADMIN access on the matrix and `requirePageAccess` (preferred, since the model + service are already wired), or (b) drop the `filterByWhitelabel` middleware and the `whitelabelId` body field. Recommend (a).

2. **`planType` payload divergence.** Web `Summary.js:80` sends `planType: planFamily` ("basic" / "premium"). Mobile `PlansSummaryScreen.js:53` sends `planType: selectedPlan?.code`. The web admin form's `PLAN_TYPE_OPTIONS` (`DiscountsFormPopup.jsx:13-21`) lists `single_event`, `subscription`, `enterprise`, `trial`, `lite`, `pro`, `elite`. None of the three vocabularies overlap — so any discount whose `applicablePlanTypes` is non-empty will *always* fail web's `validate()` and mobile's `validate()`. Effectively, `applicablePlanTypes` is broken end-to-end. **Smoke-test recommended:** create a discount with `applicablePlanTypes: ['lite']`, try to apply on web/mobile — expect failure. Then fix the canonical vocabulary in code.

3. **`validate()` returns `valid: false` with leaky reasons.** Lines 199-225 emit `'Discount code is inactive'` / `'Discount code has expired'` / `'Discount code usage limit reached'` / `'Minimum order amount is X SAR'` / `'Discount code is not applicable for this plan type'`. The first three reveal that the code exists and just isn't usable — useful for legitimate users, but also useful for brute-forcing the keyspace. Consider collapsing inactive/expired/exhausted into a single "invalid or expired" message and only revealing `minimumAmount` / `planType` reasons to authenticated paying users.

4. **`useToggleDiscount` returns un-populated `createdBy`.** `discounts.service.toggleStatus()` does `findById` + `save` (no `populate`). The toggle response has `createdBy` as a raw ObjectId. Web doesn't currently render `createdBy` (verify in DiscountsTable cells), but mobile's `DiscountListItem` may — read it before locking in the fix.

5. **Web `Summary.js` legacy `apiClient` uses cookie-token vs new-backend uses HttpOnly cookie.** `discountsAPI` (`adminDashboard.js`) routes through `apiClient.get/post(...)`. Verify the legacy `apiClient` does not still read `localStorage` for tokens (B22 security checklist).

6. **`maxUses` race.** `applyDiscount()` uses two trips (find + `$inc`) — under heavy contention `usedCount` can exceed `maxUses`. The exposure is small (no concurrent payments per user) but worth a one-shot atomic update. Recommended fix in §2.5.

7. **`/discounts/validate` is callable by any authenticated user with no rate-limit + symmetric error messages.** Combined with #3, this is a brute-force vector. Adding `authLimiter` is enough to mitigate.

---

## 7. Implementation Plan (Ordered)

### 7.A Backend
- [ ] **A.1** Replace `restrictTo(...DISCOUNT_MANAGERS)` with `requirePageAccess(ADMIN_PAGES.DISCOUNTS, action)` on every admin route in `discounts.routes.js:43-103`. Drop the `DISCOUNT_MANAGERS` constant. (file:`labbe-backend-/src/modules/discounts/discounts.routes.js`)
- [ ] **A.2** Create `discounts.validation.js` with `createDiscountSchema`, `updateDiscountSchema`, `validateDiscountSchema` (specs in §2.6). Wire via `validate(schema)` middleware on POST/PATCH/validate routes. (new file)
- [ ] **A.3** Remove inline `if (!code)` / `if (!amount)` checks in `discounts.controller.validate` (lines 76-87) — Joi handles it.
- [ ] **A.4** Switch every controller method to `responseHelper`: `sendPaginated(res, discounts, pagination)` for list, `sendSuccess(res, { discount })` for read/update/toggle, `sendCreated(res, { discount })` for create, `sendDeleted(res, ...)` for delete, `sendSuccess(res, validateResult)` for validate. (file:`discounts.controller.js`)
- [ ] **A.5** Use `Promise.all` for `[total, discounts]` in `getAll()`; add `.lean()` and explicit `.select()` projection on both `getAll` and `getById`. (file:`discounts.service.js:42-47, 64`)
- [ ] **A.6** Convert `toggleStatus` to a single atomic `findByIdAndUpdate` with `$set: { isActive: { $not: '$isActive' } }` and `.populate('createdBy','name email').lean()`. (file:`discounts.service.js:164-170`)
- [ ] **A.7** Convert `applyDiscount` to a single atomic `findOneAndUpdate` with the `usedCount<maxUses` guard expression. (file:`discounts.service.js:246-251`)
- [ ] **A.8** Drop the redundant pre-check + `ConflictError` in `create()` (lines 98-101); rely on the unique index + global error handler's duplicate-key translation. (file:`discounts.service.js`)
- [ ] **A.9** Force-set `whitelabelId` in `create()` for whitelabel-scoped creators (`req.user`-driven), regardless of body input. Update controller to pass `req.user`. (file:`discounts.service.js`, `discounts.controller.js`)
- [ ] **A.10** Add `logAudit(req, ...)` calls in `create`, `update`, `toggleStatus`, `delete` after successful mutation. Verify `AuditLog` enum already accepts `'discount'`. (file:`discounts.service.js`)
- [ ] **A.11** Add `authLimiter` middleware to `POST /discounts/validate` route. (file:`discounts.routes.js:29-33`)
- [ ] **A.12** Add `@swagger` JSDoc blocks to all 7 routes (specs in §2.2). Register `Discount`, `DiscountInput`, `DiscountValidateRequest`, `DiscountValidateResponse` schemas in `labbe-backend-/src/config/swagger.js`. (files: `discounts.routes.js`, `swagger.js`)
- [ ] **A.13** Define `PLAN_TYPES` in `shared/constants/` (or extend the existing constants barrel). Apply to model `applicablePlanTypes: [{ enum: PLAN_TYPES }]`, Joi `validateDiscountSchema`/`createDiscountSchema`, and reuse on web + mobile. (cross-cutting)
- [ ] **A.14** Consider collapsing inactive/expired/exhausted reasons in `validate()` into one message (§6 bug #3). Decision required from product. Default: leave as-is, add comment. (file:`discounts.service.js:199-225`)
- [ ] **A.15** Comment hygiene: remove banner comments in `discounts.routes.js:21-23, 35-37` (route file is short enough). Service banners may stay. (file:`discounts.routes.js`)

### 7.B Web
- [ ] **B.1** Add `discounts` block to `labbe/services/new-backend/api.config.js` `API_PATHS` (spec in §3.3). (file:`labbe/services/new-backend/api.config.js`)
- [ ] **B.2** Create `labbe/hooks/reactQueryHooks/useDiscounts.js` with: `useDiscounts(filters)`, `useDiscountMutation(action: 'create' | 'update' | 'toggle' | 'delete')`, factories `useCreateDiscount`/`useUpdateDiscount`/`useToggleDiscount`/`useDeleteDiscount`, `useValidateDiscount` mutation. Use the new-backend `apiRequest` + `API_PATHS`. (new file)
- [ ] **B.3** Migrate `DiscountsStats.jsx`, `DiscountsTable.jsx`, `DiscountsFormPopup.jsx` to consume the new hooks; delete inline `useQuery`/`useMutation` blocks. (files:`_components/*.jsx`)
- [ ] **B.4** Migrate `Summary.js:77-81` from `discountsAPI.validate(...)` to `useValidateDiscount` mutation. (file:`labbe/app/[lang]/host/plans/summary/Summary.js`)
- [ ] **B.5** Update `page.js:27` server prefetch to `path: API_PATHS.discounts.list`. (file:`page.js`)
- [ ] **B.6** Drop the dead `\|\| response` fallback in `Summary.js:82`. (file:`Summary.js`)
- [ ] **B.7** Update web data-mapping to backend's new wire shape after A.4 (read `data?.data?.discounts`, `data?.data?.discount`, `data?.data?.valid`). (files:`DiscountsStats.jsx`, `DiscountsTable.jsx`, `DiscountsFormPopup.jsx`, `Summary.js`)
- [ ] **B.8** Once all consumers use the new hooks, delete `discountsAPI` from `labbe/services/adminDashboard.js:902-940` and the `adminDashboardAPI.discounts` reference at line 956. (file:`labbe/services/adminDashboard.js`)
- [ ] **B.9** Move the inline status-pill `style={{...}}` (`DiscountsTable.jsx:147-160`) to `DiscountsTable.module.css` with status-color CSS vars. **Style preservation:** keep the exact bg/fg colors (`#EAF4EF/#2A8C5B`, `#F5F5F5/#666`, `#F9EBEA/#C0392B`, `#FBF3E6/#D38200`), padding `0.3rem 1.2rem`, border-radius `9999px`, font-size `1.2rem`, font-family `Cairo`. (file:`DiscountsTable.jsx`, `DiscountsTable.module.css`)
- [ ] **B.10** Replace `confirm("…")` with the project's standard confirm dialog (verify the convention in a sibling admin page first). (file:`DiscountsTable.jsx:73`)
- [ ] **B.11** Replace `if (error) return null;` (`DiscountsTable.jsx:89`) with the project's standard error UI. (file:`DiscountsTable.jsx`)
- [ ] **B.12** Pass active locale to date format: `new Date(value).toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : 'en-US')`. (file:`DiscountsTable.jsx:166`)
- [ ] **B.13** Replace `PLAN_TYPE_OPTIONS` literals with t-key + the shared `PLAN_TYPES` constant from A.13. (file:`DiscountsFormPopup.jsx:13-21`)
- [ ] **B.14** Split `DiscountsFormPopup.jsx` (359 → ≤250 lines) by extracting `DiscountsFormBody.jsx` (the JSX form fields) and `discountsFormUtils.js` (`EMPTY_FORM`, `validate()`). **Style preservation:** import the same `.module.css` into the extracted component. (files:`DiscountsFormPopup.jsx`, new files)
- [ ] **B.15** Split `DiscountsTable.jsx` (268 → ≤250) by extracting helpers (`getDiscountStatus`, `buildFilters`, `useDiscountsTableFilters`). **Style preservation as B.9.** (files:`DiscountsTable.jsx`, new files)
- [ ] **B.16** Wrap `<DiscountsPageContent />` in `ErrorBoundary` (copy convention from a sibling admin page). (file:`page.js`)
- [ ] **B.17** Replace hardcoded Arabic/English strings in `Summary.js` discount slice (lines 92-94, 100-101, 244-246, 261-271) with `t("plans.discountCode.*")`. Locale keys in §8. (file:`Summary.js`)
- [ ] **B.18** Delete dead file `_components/DiscountsContent.jsx`. (file:`DiscountsContent.jsx`)
- [ ] **B.19** Comment hygiene: remove `// Populate form when editing` (`DiscountsFormPopup.jsx:45`); keep `// kept for actions lookup` (`DiscountsTable.jsx:107`).

### 7.C Mobile
- [ ] **C.1** Add `ENDPOINTS.DISCOUNTS` block to `halla-mobile/config/api.js` (spec in §4.4). (file:`halla-mobile/config/api.js`)
- [ ] **C.2** Migrate `adminDashboardService.discounts.*` literal paths to use `ENDPOINTS.DISCOUNTS.*`. (file:`halla-mobile/services/adminDashboardService.js:337-358`)
- [ ] **C.3** Move `useAdminDiscounts` from `hooks/queries/useAdmin.js` to a new `hooks/queries/useDiscounts.js`. Move all 4 mutations from `hooks/mutations/useAdminMutations.js:521-573` to `hooks/mutations/useDiscountMutations.js`. Add `useValidateDiscount` mutation hook. (new files; updates to existing)
- [ ] **C.4** Rename query keys to `['discounts','admin',params]` and invalidation keys to `['discounts']` to match web. (files:new hooks; verify all consumers)
- [ ] **C.5** Bump `staleTime` on `useAdminDiscounts` to `5 * 60 * 1000`. (new hook file)
- [ ] **C.6** Update `AdminDiscountsScreen.js:40-43` to read `data?.discounts` (or whichever path matches after backend A.4) — drop the `data?.data \|\| data` fallback. (file:`AdminDiscountsScreen.js`)
- [ ] **C.7** Migrate `PlansSummaryScreen.js:50-54` and `WhitelabelPlansSummaryScreen.js:61-65` to `useValidateDiscount` mutation. (files:`PlansSummaryScreen.js`, `WhitelabelPlansSummaryScreen.js`)
- [ ] **C.8** Add `applicablePlanTypes` multi-select chip field to `DiscountFormFields.js` and propagate through `DiscountFormModal.js` payload (line 97-108). Mirror the web chip styling. **Style preservation:** every existing `StyleSheet.create({...})` value stays verbatim; new chip styles match the web color/spacing exactly. (files:`DiscountFormFields.js`, `DiscountFormModal.js`)
- [ ] **C.9** Align `planType` argument to canonical vocabulary chosen in A.13. (files:`PlansSummaryScreen.js:53`, `WhitelabelPlansSummaryScreen.js:64`)

### 7.D Cross-platform alignment (do AFTER A/B/C)
- [ ] **D.1** Verify `GET /discounts/admin` response is read identically on web (`DiscountsTable.jsx`, `DiscountsStats.jsx`) and mobile (`AdminDiscountsScreen.js`). Re-grep for any leftover `?.data?.data` or `\|\| data?.discounts` fallback chains.
- [ ] **D.2** Verify `POST /discounts/validate` payload from both clients matches the Joi schema (`{ code, amount, planType }` where `planType ∈ PLAN_TYPES`).
- [ ] **D.3** Verify mutation invalidation: trigger create → list refetches on both platforms. Trigger toggle → both list and detail (if any) refetch.
- [ ] **D.4** Smoke-test a discount with `applicablePlanTypes: ['lite']` end-to-end: create on admin web → create on admin mobile → apply on host web → apply on host mobile. All four flows must succeed.
- [ ] **D.5** Document the manual smoke check in `docs/modules/discounts-fullstack-review-progress.md` (or append to this file's bottom).

---

## 8. Locale-key additions required

(Listed for the user — agent does NOT modify locale JSON without explicit approval.)

**Web (`labbe/localization/locales/{en,ar}/`):**

`adminDashboard.json`:
- `discounts.planTypes.single_event` (en: "Single Event", ar: "مناسبة واحدة")
- `discounts.planTypes.subscription` (en: "Subscription", ar: "اشتراك")
- `discounts.planTypes.enterprise`   (en: "Enterprise",   ar: "مؤسسات")
- `discounts.planTypes.trial`        (en: "Trial",        ar: "تجريبي")
- `discounts.planTypes.lite`         (en: "Lite",         ar: "لايت")
- `discounts.planTypes.pro`          (en: "Pro",          ar: "برو")
- `discounts.planTypes.elite`        (en: "Elite",        ar: "إيليت")

`plans.json` (or `host-events.json` / wherever Summary.js lives):
- `plans.discountCode.title`              (en: "Discount Code", ar: "كود الخصم")
- `plans.discountCode.placeholder`        (en: "Enter discount code", ar: "أدخل كود الخصم")
- `plans.discountCode.apply`              (en: "Apply", ar: "تطبيق")
- `plans.discountCode.applied`            (en: "Applied", ar: "مطبق")
- `plans.discountCode.remove`             (en: "Remove", ar: "إزالة")
- `plans.discountCode.invalid`            (en: "Invalid discount code", ar: "كود الخصم غير صالح")
- `plans.discountCode.verifyFailed`       (en: "Could not verify code. Please try again", ar: "تعذر التحقق من الكود. حاول مرة أخرى")

**Mobile (`halla-mobile/localization/locales/{en,ar}/admin.json`):** if `applicablePlanTypes` field is added (C.8), add the same `discounts.planTypes.*` keys; otherwise no new keys.

---

## 9. Rollback plan

Each implementation item is a single-purpose commit; rollback is `git revert` of the offending commit. Items with cross-platform dependencies (notably **A.4 + B.7 + C.6** — they all change with the response wire shape) must be merged together as one PR or staged with backwards-compat reads (read both old and new shape during a rollout window).

DB-shape changes: **none** in this plan. The model gains a tighter `enum` on `applicablePlanTypes` (A.13) — that's index-free and reversible by relaxing the enum.

---

## 10. Acceptance checklist (run after Phase 2)

- [ ] No file in module exceeds the cap (`discounts/*.js` ≤ 600/300/400, web component files ≤ 250, mobile component files ≤ 350).
- [ ] All 7 endpoints have current `@swagger` annotations matching the actual implementation.
- [ ] No duplicate endpoints remain (none existed; verified).
- [ ] Web + mobile call the same path with the same request body shape and the same response field reads for every endpoint.
- [ ] No fallback chains remain in discount data mapping (`Summary.js:82`, `AdminDiscountsScreen.js:41`).
- [ ] No `// FLOW-…` / `// PHASE-…` / `// BUG-…` comments inside `labbe-backend-/src/modules/discounts/`, `labbe/app/[lang]/admin-dash/discounts/`, `halla-mobile/components/admin-dashboard/discounts/`.
- [ ] All admin routes use `requirePageAccess(ADMIN_PAGES.DISCOUNTS, …)`; MODERATOR is denied (matches matrix).
- [ ] Joi schemas reject unknown fields (`.unknown(false)`) on all three discount endpoints.
- [ ] `authLimiter` is applied to `POST /discounts/validate`.
- [ ] `logAudit` is called on every create / update / toggle / delete.
- [ ] `npm run lint` clean (or no new warnings introduced).
- [ ] Visual smoke test: admin discount list, create modal, edit modal, status pill colors, toggle/delete confirmation, host plan summary discount input — all look identical before/after the refactor.
- [ ] §6 bug #2 (planType vocabulary) resolved with explicit decision recorded.
- [ ] §6 bug #1 (whitelabel admin access) resolved with explicit decision recorded.
