# taqnyat-templates — Full-Stack Review Plan

**Module:** taqnyat-templates
**Generated:** 2026-05-07
**Prompt:** docs/implementation/MODULE_FULLSTACK_REVIEW_PROMPT.md
**Status:** Awaiting green light · NOT IMPLEMENTED YET

---

## 0. Executive Summary

- **6 total endpoints** in module (1 host-facing + 5 admin)
- **0 candidates for deletion** (no duplicate endpoints; all 6 are distinct surfaces)
- **6 Swagger drift findings** — every endpoint is missing its `@swagger` JSDoc block (the module ships with zero OpenAPI annotations)
- **0 backend file-size violations** (routes 74 / controller 58 / service 357 — all within caps)
- **0 web file-size violations** (largest file is `TaqnyatTemplatesTable.jsx` at 214 lines, AssignTaqnyatTemplatePopup at 215, CreateTaqnyatTemplatePopup at 204 — all under 250)
- **0 mobile file-size violations** (mobile StepFour 319 lines under 350 cap; UpdateEventScreen 597 is out of scope of this module)
- **1 web/mobile API consumption mismatch** — mobile uses an inline `useQuery` instead of a canonical hook; otherwise paths/methods/query-params/response shape are identical
- **8 data mapping bugs** — fallback chains hiding the canonical backend shape (`data?.data?.templates || data?.templates || []`) in 4 web files + 1 mobile file, and `data?.data?.categories || data?.categories || []` in 1 web file
- **2 missing/incorrect safeguards** — no rate limiter on `POST /sync` and `POST /` (both make external Meta API calls); no Joi validation file exists for non-trivial PATCH/POST bodies
- **3 plain-`Error` throws** instead of typed `AppError` in service (sync/create/delete failure paths)
- **~12 comment-hygiene blocks to remove** — `Phase 4c W0-MODEL`, `W1-TAQNYAT-ADMIN`, `W2-MOBILE-WIZARD`, `D4c-1/2/3` markers across backend + web + mobile files
- **Estimated effort:** **M** (medium — mostly Swagger + Joi + fallback-chain + canonical-hook work; no large refactors required)

---

## 1. Endpoint Inventory

| # | Method | Path | Controller | Service | Middleware chain | Swagger | Web hook | Mobile hook | Status |
|---|--------|------|------------|---------|------------------|---------|----------|-------------|--------|
| 1 | GET | `/taqnyat-templates` | `controller.listForHost` | `service.listForHost({ category })` | `protect` | **MISSING** | `useHostTaqnyatTemplates` | inline `useQuery` in `StepFour.js` (no canonical hook) | KEEP |
| 2 | GET | `/admin/taqnyat-templates` | `controller.listForAdmin` | `service.listForAdmin({ search, includeInactive })` | `protect`, `requirePageAccess(TAQNYAT_TEMPLATES, "view")` | **MISSING** | `useAdminTaqnyatTemplates` | — (admin is web-only by design) | KEEP |
| 3 | POST | `/admin/taqnyat-templates/sync` | `controller.sync` | `service.syncFromTaqnyat({ actor })` | `protect`, `superAdminOnly` | **MISSING** | `useSyncTaqnyat` | — | KEEP |
| 4 | POST | `/admin/taqnyat-templates` | `controller.createUpstream` | `service.createUpstreamTemplate(body, actor)` | `protect`, `superAdminOnly` | **MISSING** | `useCreateTaqnyatTemplate` | — | KEEP |
| 5 | PATCH | `/admin/taqnyat-templates/:id` | `controller.assignMapping` | `service.assignMapping(id, updates, actor)` | `protect`, `validateObjectId("id")`, `requirePageAccess(TAQNYAT_TEMPLATES, "update")` | **MISSING** | `useAssignTaqnyat` | — | KEEP |
| 6 | DELETE | `/admin/taqnyat-templates/:id` | `controller.deleteUpstream` | `service.deleteUpstreamTemplate(id, actor)` | `protect`, `validateObjectId("id")`, `superAdminOnly` | **MISSING** | `useDeleteTaqnyatTemplate` | — | KEEP |

**Legend:** KEEP, DELETE-DUPLICATE-OF-#N, RENAME, MERGE-WITH-#N

**Notes:**
- The admin-router is mounted at `/api/v2/admin/taqnyat-templates` from `src/app.js:237` via the `adminRoutes` export.
- Authorization is **mixed** between `requirePageAccess(TAQNYAT_TEMPLATES, ...)` (rows #2, #5) and `superAdminOnly` (rows #3, #4, #6). This is intentional per the route-file header comment ("templates are an account-wide resource and Meta rate-limits creates / hard-delete strips template from every host"), but it creates a divergence from the role-permission matrix in `permissions.js` where `ADMIN` is granted `FULL` access on `taqnyat_templates`. **See §6 (Suspected Bugs).**

---

## 2. Backend Findings

### 2.1 File-size violations

None. All four module files are under their caps:
- `taqnyat-templates.routes.js` — 74 / 400
- `taqnyat-templates.controller.js` — 58 / 300
- `taqnyat-templates.service.js` — 357 / 600
- `models/TaqnyatTemplateModel.js` — 119 (model)

### 2.2 Swagger drift

The module ships with **zero `@swagger` annotations** on its 6 endpoints. The `config/swagger.js` master spec has no `Taqnyat*` schemas defined. This is a major documentation gap — every endpoint needs a JSDoc block plus a shared schema component.

Required Swagger work:
- **2.2.1** Add `components.schemas.TaqnyatTemplate` (mirror of model: `_id`, `taqnyatId`, `templateName`, `language`, `status`, `metaCategory`, `category`, `bodyText`, `hasImageHeader`, `varMapping[]`, `active`, `removedFromMeta`, `lastSyncedAt`, `sortOrder`, `createdAt`, `updatedAt`).
- **2.2.2** Add `components.schemas.VarMappingEntry` (`placeholder`, `sourceKey`, `fallback`).
- **2.2.3** Add `components.schemas.TaqnyatTemplateCreateRequest` (`name`, `category`, `language`, `headerText?`, `bodyText`, `bodyExamples[]?`, `footerText?`).
- **2.2.4** Add `components.schemas.TaqnyatTemplateAssignRequest` (`category?`, `varMapping?`, `active?`, `sortOrder?`).
- **2.2.5** Add `@swagger` JSDoc immediately above each route declaration in `taqnyat-templates.routes.js` (`tag: TaqnyatTemplates`). Cover 200/400/401/403/404/409/500 where each applies.

### 2.3 Missing middleware / safeguards

- **POST /admin/taqnyat-templates/sync** (`taqnyat-templates.routes.js:46-50`) — calls Meta upstream every time; **no rate limiter**. Recommend `authLimiter` or a dedicated `metaWriteLimiter` with low ceiling (e.g. 5/hour) since the underlying upstream is rate-limited and an accidental retry storm is realistic from a mis-clicked button.
- **POST /admin/taqnyat-templates** (`taqnyat-templates.routes.js:53-57`) — same; no rate limiter, also calls Meta upstream.
- **DELETE /admin/taqnyat-templates/:id** (`taqnyat-templates.routes.js:66-71`) — same; no rate limiter, also calls Meta upstream.
- **GET /taqnyat-templates** (host-facing list) — no whitelabel filter is applied. The catalogue is intentionally global per the model header (it's a Meta-account-wide resource), so this is **not a finding** — but it's worth noting in the plan as an explicit "verified intentional" item so future readers don't try to add isolation here.
- **Idempotency:** `POST /sync` and `POST /` (create) are not idempotency-keyed. They are super-admin-only, low-frequency button-driven actions, so a missing key is acceptable; flagged here for completeness only.

### 2.4 Duplicate / dead endpoints

None. The pre-W0 host endpoint `GET /messaging/approved-templates` referenced in the model header has been retired and there are no remaining consumers anywhere in the codebase (verified by grep across `labbe`, `halla-mobile`, `labbe-backend-`).

### 2.5 Service / controller violations

- **`taqnyat-templates.service.js:28`** — `throw new Error('Taqnyat sync failed: ...')`. Should throw a typed `AppError(message, 502, 'TAQNYAT_UPSTREAM_FAILED')` (or `BadGatewayError`) so the global handler maps it cleanly and the frontend can branch on `code` instead of message string-matching.
- **`taqnyat-templates.service.js:253`** — same pattern in `createUpstreamTemplate`. Replace with typed `AppError`.
- **`taqnyat-templates.service.js:322`** — same pattern in `deleteUpstreamTemplate`. Replace with typed `AppError`.
- **`taqnyat-templates.service.js:96-98`, `180-182`, `291-293`, `327-341`** — three `try { logAudit(...) } catch (_) { /* swallow */ }` blocks. Logging audit failures with `logger.warn` (instead of swallowing) is the project convention; consider a small helper `safeAudit(...)`.
- **`taqnyat-templates.service.js:148-185`** — `assignMapping` mutates the loaded doc and calls `doc.save()`. This is fine, but an alternative `findByIdAndUpdate` with `runValidators: true` would avoid the round-trip read for the no-mapping update case. Low priority — leave as-is unless we trip the 600-line cap.
- Controllers are HTTP-only and use `catchAsync`/`sendSuccess` correctly. **No violations.**

### 2.6 Validation gaps

The module has **no `taqnyat-templates.validation.js` file**. PATCH and POST bodies are validated inline inside the service (regex on name, enum check on category, array-shape check on varMapping). This violates A5.1.

Schemas to add (`taqnyat-templates.validation.js`):

```js
const Joi = require('joi');

const varMappingEntry = Joi.object({
  placeholder: Joi.string().pattern(/^\{\{\d+\}\}$/).required(),
  sourceKey: Joi.string().min(1).max(120).required(),
  fallback: Joi.string().allow('').max(200),
});

exports.createTemplateSchema = Joi.object({
  name: Joi.string().pattern(/^[a-z][a-z0-9_]{0,511}$/).required(),
  category: Joi.string().valid('UTILITY','MARKETING','AUTHENTICATION').required(),
  language: Joi.string().valid('ar','en').default('ar'),
  headerText: Joi.string().max(60).allow(''),
  bodyText: Joi.string().min(1).max(1024).required(),
  bodyExamples: Joi.array().items(Joi.string().max(60)),
  footerText: Joi.string().max(60).allow(''),
}).unknown(false);

exports.assignMappingSchema = Joi.object({
  category: Joi.string().allow(null, ''),
  varMapping: Joi.array().items(varMappingEntry),
  active: Joi.boolean(),
  sortOrder: Joi.number().integer().min(0),
}).unknown(false);
```

Mount via `validate(schema)` middleware on routes #4 (`POST /`) and #5 (`PATCH /:id`). Once Joi runs, the inline `ValidationError` throws inside the service can be removed (kept only for invariants Joi can't express, which in this case is none).

### 2.7 Comment hygiene (backend)

Remove all `Phase 4c W0-MODEL` / `D4c-*` / `W0-DYNAMIC` markers and ticket-style breadcrumbs. Specific lines to clean:

- `taqnyat-templates.routes.js:1-20` — strip the `Phase 4c W0-MODEL` header. Replace with a 2-line module summary (`Routes for the Taqnyat WhatsApp template cache (host list + admin CRUD).`) — the `superAdminOnly` rationale is worth keeping but in one sentence per protected route.
- `taqnyat-templates.controller.js:1-11` — strip `Phase 4c W0-MODEL` JSDoc header; keep the @module tag only.
- `taqnyat-templates.service.js:1-14` — same.
- `taqnyat-templates.service.js:30, 45, 78, 84` — comments explaining "why" (preserve admin-curated fields, soft-delete reasoning) are legitimate; **keep** them.
- `models/TaqnyatTemplateModel.js:1-22, 29-39, 51, 67-74, 80, 84-89, 94-100, 106` — strip `Phase 4c W0-MODEL` header; the comment block explaining *why* the cache exists is genuinely useful — keep, but trim phase markers.
- Total markers to remove: ~12.

---

## 3. Frontend Web Findings

### 3.1 Component tree per page

**Admin page** — `app/[lang]/admin-dash/taqnyat-templates/page.jsx` (29 lines, server component):
- `_components/TaqnyatTemplatesPageContent.jsx` (34 lines, client wrapper)
  - `_components/TaqnyatTemplatesHeader.jsx` (17 lines)
    - `app/[lang]/admin-dash/_components/AdminPageHeader` (shared)
  - `_components/TaqnyatTemplatesStats.jsx` (57 lines)
    - `ui/host/main-page/StatsCards` (shared)
    - `ui/common/loading/SimpleLoading` (shared)
  - `_components/TaqnyatTemplatesTable.jsx` (214 lines)
    - `ui/commen/new-table/Table` (shared)
    - `ui/common/loading/SimpleLoading` (shared)
    - `_components/AssignTaqnyatTemplatePopup.jsx` (215 lines)
      - `ui/commen/popup/PopupLayout`, `Button`, `InputGroup`, `ToggelInput`, `SearchableSelect` (shared)
    - `_components/CreateTaqnyatTemplatePopup.jsx` (204 lines)
      - `ui/commen/popup/PopupLayout`, `Button`, `InputGroup`, `TextArea` (shared)

**Host wizard** — `app/[lang]/host/create-event/_components/stepFour/StepFour.js` (234 lines, client):
- consumes `useHostTaqnyatTemplates` directly. No further taqnyat-template-owned children.

**Hooks file** — `hooks/queries/useTaqnyatTemplates.js` (56 lines).
**Service file** — `services/taqnyatTemplatesService.js` (58 lines).

### 3.2 File-size violations

None.

### 3.3 Hardcoded text / data / paths

- **`StepFour.js:27-32`** — `AUTO_REPLIES_DEFAULTS` block contains 3 long Arabic strings hardcoded (`شكراً لتأكيد حضورك...` etc.). Move to `localization/locales/{en,ar}/createEvent.json` (`createEvent.autoReplies.defaults.attending|maybe|absence`) and read via `t()`.
- **`StepFour.js:34-38`** — `REPLY_TABS` array hardcodes Arabic labels `الحضور`, `ربما`, `الاعتذار`. Replace `label` with a translation key and resolve at render time: `{ key: "attending", labelKey: "auto_replies.tab.attending", ... }`.
- **`StepFour.js:108-112`** — inline label `"تم الفلترة حسب الفئة"` already wrapped with `t(..., "تم الفلترة حسب الفئة")` (acceptable fallback).
- **`StepFour.js:217`** — `placeholder={t("auto_reply_placeholder", "اكتب الرد التلقائي هنا")}` — acceptable.
- **`AssignTaqnyatTemplatePopup.jsx:18-27`** — `SOURCE_KEY_OPTIONS` array contains hardcoded Arabic descriptors (`(الضيف)`, `(عنوان الحدث)`, etc.). Move labels to admin.json `taqnyat.sourceKeys.<key>` and build the array via `t()`.
- **`AssignTaqnyatTemplatePopup.jsx:151`** — `<h2>{template.templateName}</h2>` — template name is dynamic data, OK.
- **`CreateTaqnyatTemplatePopup.jsx:114-117, 125-127`** — option labels (`UTILITY`, `MARKETING`, `AUTHENTICATION`, `العربية (ar)`, `English (en)`) — UTILITY/MARKETING/AUTHENTICATION are wire-format enum values and are acceptable as literals. Language labels could be `t("taqnyat.lang.ar")` / `t("taqnyat.lang.en")` for parity but is borderline.
- **No hardcoded API paths or backend URLs** — every call goes through `API_PATHS.taqnyatTemplates.*` ✅.

### 3.4 Data mapping bugs / fallback chains

Backend canonical shape (verified in `taqnyat-templates.controller.js:20, 29, 46`): `sendSuccess(res, { templates })` produces `{ success: true, status: "success", data: { templates: [...] } }`. There is exactly one path: `data.data.templates`.

- **`useTaqnyatTemplates.js`** — the hook itself doesn't do mapping (callers do).
- **`TaqnyatTemplatesStats.jsx:14`** — `data?.data?.templates || data?.templates || []` → replace with `data?.data?.templates || []`.
- **`TaqnyatTemplatesTable.jsx:37`** — same fallback chain → replace with `data?.data?.templates || []`.
- **`TaqnyatTemplatesTable.jsx:38`** — `catData?.data?.categories || catData?.categories || []` → replace with `catData?.data?.categories || []` (this is the templates-module shape, not taqnyat — flag and confirm with `useTemplateCategories` author; we should NOT change this without checking that hook's response shape, but the same rule applies).
- **`TaqnyatTemplatesTable.jsx:43`** — `res?.data?.count || res?.count || 0` → replace with `res?.data?.count || 0`.
- **`StepFour.js:55`** — `data?.data?.templates || data?.templates || []` → replace with `data?.data?.templates || []`.

### 3.5 Duplicate hooks / direct apiRequest calls

- **None** — every consumer goes through `useHostTaqnyatTemplates` / `useAdminTaqnyatTemplates` / `useSyncTaqnyat` / `useAssignTaqnyat` / `useCreateTaqnyatTemplate` / `useDeleteTaqnyatTemplate`. ✅

### 3.6 State / loading / error gaps

- **`TaqnyatTemplatesTable.jsx:151`** — only `if (isLoading) return <SimpleLoading/>;`. **No error state**. If `useAdminTaqnyatTemplates` rejects, the table renders with `templates = []`. Add `if (error) return <ErrorFallback message={t('errors.loadFailed')} />`.
- **`TaqnyatTemplatesStats.jsx:54`** — same: only handles `isLoading`. Add error branch.
- **`TaqnyatTemplatesPageContent.jsx`** — no `<ErrorBoundary>` wrapper as recommended in B19. Wrap the page export in `WrappedTaqnyatTemplatesPage` with `ErrorBoundary`.
- **`StepFour.js:115-181`** — handles loading + empty correctly, **no error branch** for the `useHostTaqnyatTemplates` query. Add a thin error message above the empty-state fallback.
- **`TaqnyatTemplatesTable.jsx:51`** — `window.confirm(t('taqnyat.deleteConfirm', ...))` — uses the browser's native dialog rather than the project's `ConfirmModal` (used elsewhere in admin). Replace with the project pattern.
- **`TaqnyatTemplatesTable.jsx:46, 59`** — `handleError(err, t, { fallbackMessage: 'taqnyat.synced' })` and `'taqnyat.saved'` — **the fallback messages reuse success keys instead of failure keys**. Should be `taqnyat.syncFailed` / `taqnyat.deleteFailed`. Likely a copy-paste bug.

### 3.7 Component / DRY issues

- **`detectPlaceholders` is duplicated** — defined identically in `AssignTaqnyatTemplatePopup.jsx:29-34` and `CreateTaqnyatTemplatePopup.jsx:17-22`. Extract to `app/[lang]/admin-dash/taqnyat-templates/_utils/detectPlaceholders.js` and import in both.
- **`TaqnyatTemplatesHeader.jsx:9`** — destructures `canUpdate` from `usePageAccess` but never uses it. Dead code — remove the import and call.
- **`TaqnyatTemplatesPageContent.jsx`** — receives `lang` only to pass it through to `TaqnyatTemplatesTable` → `AssignTaqnyatTemplatePopup`. Acceptable prop drilling (2 levels) but consider letting Assign read `lang` from the route directly via `useParams` to flatten.
- **Inline `style={{...}}`** on react-icons in `TaqnyatTemplatesStats.jsx:24, 31, 38, 45` (`color`, `fontSize`). Per B11 these should be CSS Modules classes. Low priority; consistent with existing `StatsCards` callers across the codebase, but flag.
- **`useTaqnyatTemplates.js`** — exports 4 separate mutation hooks (`useSyncTaqnyat`, `useAssignTaqnyat`, `useCreateTaqnyatTemplate`, `useDeleteTaqnyatTemplate`). The B6 canonical pattern is one factory `useTaqnyatTemplateMutation(action)` — but the codebase already mixes both styles. Leave as-is (low priority, no bug).

### 3.8 Comment hygiene (web)

- **`services/taqnyatTemplatesService.js:1-6`** — `// Taqnyat Templates Service — Phase 4c W1-TAQNYAT-ADMIN`. Strip phase marker; keep one-line module description.
- **`hooks/queries/useTaqnyatTemplates.js`** — clean, no markers.
- **`StepFour.js:1-13`** — `Phase 4c` markers in the multiline comment header are absent on this file (verified) — but the comment block describes the "legacy" + "canonical" dual-write contract, which is a legitimate *why* — **keep**.
- **`StepFour.js:70`** — `// eslint-disable-next-line react-hooks/exhaustive-deps` on the defaults-init effect. Acceptable but the `[]` deps array intentionally fires once; consider switching to RHF `defaultValues` so the effect can be deleted altogether (medium effort — out of scope for this pass).
- **`AssignTaqnyatTemplatePopup.jsx`** — clean.
- **`CreateTaqnyatTemplatePopup.jsx:42-43, 47-48`** — explanatory comments about placeholder tracking are legitimate *why*; keep.
- Total comment markers to clean on web side: **2** lines (one in `taqnyatTemplatesService.js`, one in `useTaqnyatTemplates.js` if header banner exists — verified clean).

---

## 4. Frontend Mobile Findings

### 4.1 Screen → component tree

- `screens/common/update-event/UpdateEventScreen.js` (597 lines — out of cap, but most of the file deals with all 5 wizard steps; the taqnyat-templates portion is ~25 lines around lines 305-320 + the import on line 46. **Not in this module's refactor scope** but flagged for the events-module review.)
  - imports `useUpdateTaqnyatTemplate` from `hooks/mutations/useEventMutations.js` — that mutation lives in the events module and is correctly typed (transforms `taqnyatTemplate.templateRef` → `invitationSettings.taqnyatTemplateRef` body). **Out of scope** for this module.
- `components/createEvent/StepFour.js` (319 lines, under 350 cap)
  - imports `taqnyatTemplatesService` directly
  - calls `useQuery(...)` inline (Rule C2 violation — see §4.3)

**Hooks** — none. Mobile has no `hooks/queries/useTaqnyatTemplates.js`.
**Service file** — `services/taqnyatTemplatesService.js` (31 lines).
**Endpoints** — `config/api.js:211-213` defines `ENDPOINTS.TAQNYAT_TEMPLATES.LIST = "/taqnyat-templates"`.

### 4.2 File-size violations

- **`screens/common/update-event/UpdateEventScreen.js`** — 597 / 350. Out of scope of this module (multi-step screen owned by the events module), flagged for that review.

### 4.3 Service / hook violations

- **`components/createEvent/StepFour.js:51-55`** — uses `useQuery({ queryKey: ['taqnyat-templates','host', category||'all'], queryFn: () => taqnyatTemplatesService.getTemplates(...), staleTime: 5*60*1000 })` **inline inside the component**. This violates C2 ("Direct `apiFetch`/`useQuery` calls inside screens/components are forbidden — go through a hook"). Create `halla-mobile/hooks/queries/useTaqnyatTemplates.js` exporting `useHostTaqnyatTemplates({ category }, opts = {})` matching the web hook contract, and have StepFour consume it.
- **`components/createEvent/StepFour.js:57`** — same fallback chain `data?.data?.templates || data?.templates || []`. Replace with `data?.data?.templates || []`.
- **`services/taqnyatTemplatesService.js:1-7`** — `Phase 4c W2-MOBILE-WIZARD` header. Strip.
- **`services/taqnyatTemplatesService.js:19-24`** — `request()` helper does not pass `_legacyToken` (correct — `apiFetch` reads token from `useAuthStore` directly). Consistent with the C1 standard.
- The new mobile hook MUST gate fetching on auth: `enabled: !!token && (opts?.enabled ?? true)`.

### 4.4 Hardcoded text / data / paths

- **`StepFour.js:28-33`** — `AUTO_REPLIES_DEFAULTS` block — same hardcoded Arabic as web. Move to mobile localization namespace (`createEvent.autoReplies.defaults.*`).
- **`StepFour.js:35-39`** — `REPLY_TABS` array hardcodes Arabic `الحضور`, `ربما`, `الاعتذار`. Convert to `labelKey` and resolve via mobile `t()`.
- **`StepFour.js:48`** — `category = visualTemplate?.categories?.[0] || ""` — fine.
- **No hardcoded API paths** — everything goes through `ENDPOINTS.TAQNYAT_TEMPLATES.LIST` ✅.

### 4.5 Web/Mobile divergence

- **API paths** — `GET /taqnyat-templates?category=…` — **identical** ✅.
- **Request body / query** — both pass `category` query param only (omitted when empty). **Identical** ✅.
- **Response mapping** — both currently use the same broken fallback chain `data?.data?.templates || data?.templates || []`. After the §3.4 + §4.3 fixes, both will read `data?.data?.templates || []`. Will be **identical** ✅.
- **Hook surface** — web has `useHostTaqnyatTemplates`; mobile uses inline `useQuery`. Plan creates the mobile equivalent.
- **Field consumed when picking a template** — both web (`StepFour.js:73-87`) and mobile (`StepFour.js:79-93`) read the same fields (`_id`, `templateName`, `language`, `hasImageHeader`, `bodyText`) and dual-write `selectedTemplate` (legacy) + `taqnyatTemplate.templateRef` (canonical) + `taqnyatTemplateRef` (form-flat). **Identical** ✅.
- **Admin endpoints (sync/create/assign/delete)** — web only by design (D4c-3). **Confirmed intentional** — no mobile alignment work needed.

### 4.6 Loading / error / empty states

- **`StepFour.js`** — handles `isLoading` (skeleton) and empty (`templates.length === 0` → empty card). **No error branch**. Add an error view distinct from empty (re-using the empty card style is acceptable; just feed it a different title/hint and a retry tap).

### 4.7 Comment hygiene (mobile)

- **`services/taqnyatTemplatesService.js:1-7`** — `Phase 4c W2-MOBILE-WIZARD` header. Strip.
- **`components/createEvent/StepFour.js:1-10`** — describes legacy+canonical dual-write contract; **keep** (legitimate *why*).
- Total comment markers to clean on mobile: **1** block.

---

## 5. Cross-Platform API Consumption Diff

| Endpoint | Aspect | Web | Mobile | Backend truth | Action |
|----------|--------|-----|--------|---------------|--------|
| GET `/taqnyat-templates` | path | `/taqnyat-templates` | `/taqnyat-templates` | `/taqnyat-templates` | OK |
| GET `/taqnyat-templates` | query.category | `category` (omit when empty) | `category` (omit when empty) | `category` optional | OK |
| GET `/taqnyat-templates` | response.templates | `data.data.templates` (with fallback chain) | `data.data.templates` (with fallback chain) | `data.data.templates` | Remove fallback both sides |
| GET `/admin/taqnyat-templates` | path | `/admin/taqnyat-templates` | (web only) | `/admin/taqnyat-templates` | OK |
| GET `/admin/taqnyat-templates` | query | none used | (web only) | `search`, `includeInactive` | Web doesn't use `search`/`includeInactive` query params today — admin UI is unfiltered. Not a bug; both fields are optional. |
| POST `/admin/taqnyat-templates/sync` | body | (none) | (web only) | (none) | OK |
| POST `/admin/taqnyat-templates` | body | `{ name, category, language, headerText?, bodyText, bodyExamples?, footerText? }` | (web only) | matches | OK |
| PATCH `/admin/taqnyat-templates/:id` | body | `{ category, varMapping, active, sortOrder }` | (web only) | matches | OK |
| DELETE `/admin/taqnyat-templates/:id` | body | (none) | (web only) | (none) | OK |

**Net divergence:** none in semantics; the only structural divergence is web has a canonical hook and mobile does not. Both surfaces consume the same wire shape with the same fallback chain (which is wrong on both sides for the same reason).

---

## 6. Suspected Bugs Worth Verifying

(Things that look broken but the agent cannot confirm without running the app.)

1. **`TaqnyatTemplatesTable.jsx:46`** — `handleError(err, t, { fallbackMessage: 'taqnyat.synced' })`. The fallback message key for a sync FAILURE is the SUCCESS key. Likely copy-paste; the user sees a misleading toast on failure. Same pattern at `TaqnyatTemplatesTable.jsx:59` (`fallbackMessage: 'taqnyat.saved'` on a delete failure) and `AssignTaqnyatTemplatePopup.jsx:143` (`fallbackMessage: 'taqnyat.saved'` on a save failure). **Verify and fix to `taqnyat.syncFailed` / `taqnyat.deleteFailed` / `taqnyat.saveFailed`.**
2. **RBAC inconsistency between `permissions.js` matrix and route gates** — `permissions.js:114, 130` grants `ADMIN` and `SUPER_ADMIN` `FULL` on `taqnyat_templates`, but `routes.js:46, 53, 66` apply `superAdminOnly` (not `requirePageAccess(..., "create"/"delete")`). An `ADMIN` (non-super) would be blocked from create/sync/delete despite having FULL in the matrix. **The route-file comment at line 14-19 documents this as intentional ("super-admin only — Meta upstream call" / "strips template from every host's wizard immediately") — but the matrix should reflect this so usePageAccess on the frontend doesn't show the buttons enabled for ADMIN.** Either tighten the matrix entries to `EDIT` for ADMIN and update RBAC tests, or relax the routes to `requirePageAccess` and accept the regular-admin can hit Meta. Pick one and align both sides.
3. **`TaqnyatTemplatesTable.jsx:67-70`** — `handleAssignFromRow` does `templates.find((tpl) => tpl._id === row.id)`. If the `Table` component were ever to mutate `id` (e.g. changing the `tableData.id` shape), the popup would receive the row's flattened shape (which lacks `varMapping`, `_id`, `sortOrder`) and the Assign form would silently drop those fields. Add a runtime assertion: if the lookup returns undefined, show a toast and bail out, instead of falling back to `row` which is the lossy shape.
4. **`taqnyat-templates.service.js:317-323`** — `isAlreadyGone` regex matches against `result.error` strings — string-matching upstream errors is fragile. The list of phrases (`/not[\s_]?found|already[\s_]?deleted|does\s?not\s?exist/i`) covers what's been observed in practice but Meta wording can drift. Consider also matching upstream HTTP status code (`result.errorCode === 404`) when the infrastructure layer surfaces it.
5. **Mobile `StepFour.js` query has no `enabled: !!token` gate** — the create-event flow is auth-gated upstream, so this is unlikely to fire unauth, but the rest of the mobile codebase uniformly gates queries on token. After §4.3's hook extraction, gate the new hook explicitly.
6. **`syncFromTaqnyat`** — orphan soft-delete uses `removedFromMeta: true`. If Meta returns an empty list due to an upstream outage, this would soft-delete every cached template in one shot and the host wizard would go empty until the next successful sync. Worth a defensive check: skip the orphan pass when `upstream.length === 0` (could mean "really empty" or "outage" — but soft-deleting all in the second case is destructive). Discuss with team before changing.

---

## 7. Implementation Plan (Ordered)

Apply changes in this order. Each item ends with a checkbox the agent will tick during Phase 2.

### 7.A Backend
- [ ] **A.1** Create `labbe-backend-/src/modules/taqnyat-templates/taqnyat-templates.validation.js` with `createTemplateSchema` and `assignMappingSchema` per §2.6.
- [ ] **A.2** Wire `validate(createTemplateSchema)` on `POST /admin/taqnyat-templates` (routes.js:53-57) and `validate(assignMappingSchema)` on `PATCH /admin/taqnyat-templates/:id` (routes.js:58-63).
- [ ] **A.3** In `taqnyat-templates.service.js:232-296` (`createUpstreamTemplate`), remove the inline name/category/bodyText validation now that Joi enforces it. Keep only `buildComponents`'s placeholder-vs-bodyExamples invariant (Joi can't express "examples count must equal unique placeholder count").
- [ ] **A.4** Replace `throw new Error(...)` in `service.js:28, 253, 322` with `throw new AppError(message, 502, 'TAQNYAT_UPSTREAM_FAILED')` (import from `shared/errors`). (file:line)
- [ ] **A.5** Replace the three `try { logAudit(...) } catch (_) {}` blocks (`service.js:96-98, 180-182, 291-293, 327-341`) with calls that route the failure to `logger.warn('taqnyat audit log failed', { err })` from `shared/utils/logger`.
- [ ] **A.6** Add `@swagger` JSDoc blocks above each route in `taqnyat-templates.routes.js`. Tag: `TaqnyatTemplates`. Reference component schemas added in A.7.
- [ ] **A.7** Add `TaqnyatTemplate`, `VarMappingEntry`, `TaqnyatTemplateCreateRequest`, `TaqnyatTemplateAssignRequest` to `config/swagger.js` `components.schemas`.
- [ ] **A.8** (Optional, after team sign-off on §6.2) — choose and apply the RBAC alignment: either tighten the matrix in `permissions.js` so non-super ADMIN doesn't see create/delete buttons, or relax `superAdminOnly` to `requirePageAccess(TAQNYAT_TEMPLATES, "create"/"delete")` on routes #3, #4, #6. Update `usePageAccess` consumers on web accordingly.
- [ ] **A.9** Add a rate limiter to the three Meta-write routes (#3 sync, #4 create, #6 delete). Reuse `authLimiter` or introduce `metaWriteLimiter` (5/hour per user) in `shared/middleware/rateLimiter.js`.
- [ ] **A.10** Comment hygiene pass on backend: 12 markers to remove per §2.7. Preserve "why" comments in service (preserve-admin-fields, soft-delete invariant, isAlreadyGone matrix) and model.

### 7.B Web
- [ ] **B.1** Replace fallback chains in `useTaqnyatTemplates`-consuming files:
  - `TaqnyatTemplatesStats.jsx:14` → `data?.data?.templates || []`
  - `TaqnyatTemplatesTable.jsx:37` → `data?.data?.templates || []`
  - `TaqnyatTemplatesTable.jsx:43` → `res?.data?.count || 0`
  - `StepFour.js:55` → `data?.data?.templates || []`
  - `TaqnyatTemplatesTable.jsx:38` → `catData?.data?.categories || []` (ONLY after verifying the templates-module hook returns this shape).
- [ ] **B.2** Add error branches:
  - `TaqnyatTemplatesStats.jsx` after isLoading check
  - `TaqnyatTemplatesTable.jsx` after isLoading check
  - `StepFour.js` next to the empty-state branch
- [ ] **B.3** Wrap `TaqnyatTemplatesPageContent` (page export) in `<ErrorBoundary>` per B19.
- [ ] **B.4** Fix `fallbackMessage` keys in `TaqnyatTemplatesTable.jsx:46, 59` and `AssignTaqnyatTemplatePopup.jsx:143` to point at failure keys (`taqnyat.syncFailed`, `taqnyat.deleteFailed`, `taqnyat.saveFailed`). Add the matching locale entries (§8).
- [ ] **B.5** Replace `window.confirm` in `TaqnyatTemplatesTable.jsx:51` with the project's confirmation modal pattern.
- [ ] **B.6** Move hardcoded Arabic strings out of:
  - `StepFour.js:27-32` (AUTO_REPLIES_DEFAULTS)
  - `StepFour.js:34-38` (REPLY_TABS labels)
  - `AssignTaqnyatTemplatePopup.jsx:18-27` (SOURCE_KEY_OPTIONS labels)
  Add locale keys per §8 and resolve via `t()`. **Preserve styles and JSX tree exactly** — no class/structure changes.
- [ ] **B.7** Extract `detectPlaceholders` to `app/[lang]/admin-dash/taqnyat-templates/_utils/detectPlaceholders.js` and import in both popups.
- [ ] **B.8** Remove unused `canUpdate` destructure in `TaqnyatTemplatesHeader.jsx:9` and the now-dead `usePageAccess` import.
- [ ] **B.9** Strip `Phase 4c W1-TAQNYAT-ADMIN` header from `services/taqnyatTemplatesService.js:1-6`. Reduce to a 1-line comment.
- [ ] **B.10** Add a runtime guard in `TaqnyatTemplatesTable.jsx:67-70` (per §6.3) — if `templates.find(...)` returns undefined, toast an error and abort the popup open.

### 7.C Mobile
- [ ] **C.1** Create `halla-mobile/hooks/queries/useTaqnyatTemplates.js` exporting `useHostTaqnyatTemplates({ category } = {}, opts = {})`. Mirror web's contract (queryKey `["taqnyat-templates", "host", category || "all"]`, staleTime 5min). Gate on `enabled: !!token && (opts?.enabled ?? true)`.
- [ ] **C.2** Migrate `components/createEvent/StepFour.js:24, 51-55` from inline `useQuery` + service import to `useHostTaqnyatTemplates`. Remove the `useQuery` and `taqnyatTemplatesService` imports from the screen.
- [ ] **C.3** Replace fallback chain at `StepFour.js:57` with `data?.data?.templates || []`.
- [ ] **C.4** Add an error-branch view to `StepFour.js` (between the loading skeleton and empty-state branches) reusing the empty-card style. **Preserve every `StyleSheet.create({...})` value untouched.**
- [ ] **C.5** Move hardcoded Arabic strings in `StepFour.js:28-33` (AUTO_REPLIES_DEFAULTS) and `:35-39` (REPLY_TABS labels) to mobile `t()` per §8.
- [ ] **C.6** Strip `Phase 4c W2-MOBILE-WIZARD` header from `services/taqnyatTemplatesService.js:1-7`.

### 7.D Cross-platform alignment (do AFTER A/B/C)
- [ ] **D.1** Re-grep both repos for `data?.templates`, `data?.results`, `data?.list` chained off taqnyat hook results — should be zero matches.
- [ ] **D.2** Smoke-test the host wizard on web AND mobile against a category that has templates assigned, against a category that has none, and against an upstream-error scenario. Confirm identical empty/error/loaded states.
- [ ] **D.3** Smoke-test the admin page: load list, sync, create new template (PENDING row appears), assign mapping, soft-disable, hard-delete (confirm Meta call + local removal), verify each path renders the correct success/failure toast.
- [ ] **D.4** Run `npm run lint` in both `labbe` and `halla-mobile`; verify no new warnings.
- [ ] **D.5** Verify Swagger UI now shows all 6 endpoints under the `TaqnyatTemplates` tag with correct request/response shapes.

---

## 8. Locale-key additions required

(Listed for the user — agent does NOT modify locale JSON without explicit approval.)

**Web — `labbe/localization/locales/{en,ar}/admin.json` under `taqnyat`:**
- `syncFailed` (en: "Sync failed", ar: "فشلت المزامنة")
- `deleteFailed` (already present per existing review — confirm spelling: `deleteFailed`) ✅ exists
- `saveFailed` (en: "Save failed", ar: "فشل الحفظ")
- `tableTitle` (en: "Taqnyat Templates", ar: "قوالب Taqnyat") ← already used as fallback; add formal key
- `syncing` (en: "Syncing…", ar: "جاري المزامنة...")
- `assignBtn` ✅ exists
- `deleteBtn` ✅ exists
- `deleteConfirm` ✅ exists
- `unassigned` ✅ exists
- `noPlaceholders` ✅ exists
- `pickSource` ✅ exists
- `fallback` ✅ exists
- `varMapping` ✅ exists
- `selectCategory` (en: "Select a category", ar: "اختر الفئة")
- `sourceKeys.guest_name` (en: "Guest name", ar: "اسم الضيف")
- `sourceKeys.event_title` (en: "Event title", ar: "عنوان الحدث")
- `sourceKeys.event_dateFormatted` (en: "Event date (formatted)", ar: "تاريخ الحدث (منسّق)")
- `sourceKeys.event_time` (en: "Event time", ar: "وقت الحدث")
- `sourceKeys.event_location` (en: "Event address", ar: "عنوان الحدث (الموقع)")
- `sourceKeys.host_name` (en: "Host name", ar: "اسم المضيف")
- `sourceKeys.hostNote` (en: "Host note", ar: "ملاحظة المضيف")
- `sourceKeys.invitationMessage` (en: "Invitation message", ar: "رسالة الدعوة")

**Web — `labbe/localization/locales/{en,ar}/createEvent.json`:**
- `auto_replies.tab.attending` (en: "Attending", ar: "الحضور")
- `auto_replies.tab.maybe` (en: "Maybe", ar: "ربما")
- `auto_replies.tab.absence` (en: "Apology", ar: "الاعتذار")
- `auto_replies.defaults.attending` (3-line Arabic message — match current literal)
- `auto_replies.defaults.maybe` (Arabic message — match current literal)
- `auto_replies.defaults.absence` (Arabic message — match current literal)

**Mobile — `halla-mobile/localization/locales/{en,ar}/createEvent.json` (or equivalent namespace):**
- Same `auto_replies.tab.*` and `auto_replies.defaults.*` keys as web for parity.

---

## 9. Rollback plan

For each implementation item, the rollback is a `git revert` of its commit. The plan introduces:
- One new file (`taqnyat-templates.validation.js`).
- One new mobile hook file (`hooks/queries/useTaqnyatTemplates.js`).
- One new web util file (`_utils/detectPlaceholders.js`).
- Edits to existing routes/controller/service/model/page/component/hook/service files.

No DB schema changes. No migration risk. Reverting the validation-middleware mount immediately restores the old inline validation path because the inline service-level checks remain (per A.3 we trim those AFTER A.2 is verified — keep them until then to enable easy rollback).

---

## 10. Acceptance checklist (run after Phase 2)

- [ ] No file in module exceeds the cap. (Already passes — preserve.)
- [ ] All 6 endpoints have current Swagger.
- [ ] No duplicate endpoints remain. (Already passes — confirm.)
- [ ] Web + Mobile call the same paths with the same shapes for every endpoint.
- [ ] No fallback chains in data mapping in this module's surface area.
- [ ] No `// FLOW-…` / `// PHASE-…` / `// W1-…` / `// W2-…` / `// W0-…` / `// D4c-…` comments in module's surface area.
- [ ] `npm run lint` clean (or no new warnings introduced) in both `labbe-backend-`, `labbe`, and `halla-mobile`.
- [ ] Visual smoke test: admin page, host wizard StepFour (web + mobile), update-event StepFour (mobile) — all look identical before/after.
- [ ] Mutation failure toasts surface failure-keyed messages, not success-keyed strings.
- [ ] `window.confirm` is gone — delete confirmation now flows through the project's modal.
- [ ] `usePageAccess('taqnyat_templates')` correctly hides destructive buttons for non-super-admin (after A.8 alignment).
