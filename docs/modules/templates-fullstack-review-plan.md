# templates — Full-Stack Review Plan

**Module:** templates
**Generated:** 2026-05-07
**Decisions locked:** 2026-05-08
**Prompt:** docs/implementation/MODULE_FULLSTACK_REVIEW_PROMPT.md
**Status:** Decisions locked · NOT IMPLEMENTED YET

---

## Locked decisions (2026-05-08)

1. **Validation:** Zod only via `validateZod` middleware (`shared/middleware/validation.js:373`). Joi is forbidden. All §2.6 / A.1 schemas to be rewritten as Zod.
2. **`POST /admin/templates/upload-url`:** DELETE. No `WHY:` retention comment. (Ref §2.4, A.3)
3. **Template-category soft-delete:** Option (a) — rename audit action to `template_category.deactivate`; update UI copy from "deleted" to "disabled". Backend stays soft-delete. (Ref §2.3, §6.5, A.9)
4. **`GET /fonts`:** stays public. No `protect` middleware. (Ref §6.1)
5. **Optimistic-lock plumbing:** IMPLEMENT in this PR. Capture `version`, send `expectedVersion`, surface 409 with reload-and-retry toast. (Ref §6.2, B.14)
6. **Role check:** replace `"super_admin"` literal with `ROLES.SUPER_ADMIN` AND move `isSuperAdmin` derivation from controller into `service.listForAdmin`. (Ref §2.3, §2.5, A.5)
7. **Mobile `useFonts` hook:** add NOW even though no consumer exists yet. Mirrors web. Mobile templates surface (picker, hooks, services) stays — implement all of §4 / §7.C as originally planned (React Query migration, category-filter bug fix, file split, etc.). Create-event flow is untouched.
8. **Locale keys:** all additions in §8 approved. Agent may add the listed keys to `admin.json` and `createEvent.json` during implementation.

---

## 0. Executive Summary

- **17** total endpoints in module (host: 2, admin: 8, categories public: 1, categories admin: 4, fonts: 1, plus 1 deprecated `upload-url`)
- **1** endpoint to DELETE (`POST /admin/templates/upload-url` — decision #2)
- **16** Swagger drift findings — the entire module has **zero** `@swagger` JSDoc blocks; every kept endpoint is undocumented
- **0** backend file-size violations (largest is `templates.service.js` at 554/600)
- **3** web file-size violations (`TemplateForm.jsx` 774, `TemplatesPageContent.jsx` 557, `FieldConfigPanel.jsx` 301; `FieldsSection.jsx` 269 marginal)
- **1** mobile file-size violation (`EventTemplates.js` 354/350)
- **3** web/mobile API consumption mismatches (mobile sends `_id` instead of `code` for category, lacks fonts hook entirely, no canonical hook layer)
- **6** data mapping fallback chains in web (`data?.data?.templates || data?.templates || []`, same for `categories`, `fonts`, `template`) and mobile (`res.templates || res.data || []`)
- **5** missing/incorrect safeguards (no Zod validation file, no audit log on duplicate, no audit log rename for category soft-delete, controller reads literal `"super_admin"` string instead of `ROLES.SUPER_ADMIN`, web `confirm()` browser dialog)
- **~25** comment-hygiene blocks to remove (Phase 4c / W0 / W1 / W2 / [PATCH N] markers across backend + web + mobile)
- **1** dead web component (`CategoryManager.jsx` + `.module.css`, not imported anywhere)
- **1** unused web API path (`API_PATHS.templates.adminUploadUrl`)
- Estimated effort: **L** (large web pieces to split, mobile React-Query migration, optimistic-lock plumbing)

---

## 1. Endpoint Inventory

| # | Method | Path | Controller | Service | Middleware chain | Swagger | Web hook | Mobile hook | Status |
|---|--------|------|------------|---------|------------------|---------|----------|-------------|--------|
| 1 | GET | `/templates` | `controller.list` | `service.listForHost` | `protect` | MISSING | `useHostTemplates` | `templateService.getTemplates` (raw `useEffect`) | KEEP |
| 2 | GET | `/templates/:id` | `controller.getById` | `service.getById` | `protect`, `validateObjectId('id')` | MISSING | `useTemplate` (admin path) | none | KEEP |
| 3 | GET | `/admin/templates` | `controller.adminList` | `service.listForAdmin` | `protect`, `requirePageAccess(TEMPLATES,'view')` | MISSING | `useAdminTemplates` | n/a | KEEP |
| 4 | POST | `/admin/templates/upload-url` | `controller.adminGetUploadUrl` | `service.getUploadUrl` | `protect`, `requirePageAccess(TEMPLATES,'create')`, `uploadUrlLimiter` | MISSING | none (declared but unused in `api.config`) | n/a | **DELETE — superseded by upload-image** |
| 5 | POST | `/admin/templates/upload-image` | `controller.adminUploadImage` | `service.handleImageUpload` | `protect`, `requirePageAccess(TEMPLATES,'create')`, `uploadUrlLimiter`, `memUpload.single('image')` | MISSING | `templatesService.adminUploadImage` (called from `TemplateEditorPage`) | n/a | KEEP |
| 6 | POST | `/admin/templates` | `controller.adminCreate` | `service.createTemplate` | `protect`, `requirePageAccess(TEMPLATES,'create')` | MISSING | `useCreateTemplate` | n/a | KEEP |
| 7 | GET | `/admin/templates/:id` | `controller.getById` | `service.getById` | `protect`, `validateObjectId('id')`, `requirePageAccess(TEMPLATES,'view')` | MISSING | `useTemplate` | n/a | KEEP |
| 8 | PUT | `/admin/templates/:id` | `controller.adminUpdate` | `service.updateTemplate` | `protect`, `validateObjectId('id')`, `requirePageAccess(TEMPLATES,'update')` | MISSING | `useUpdateTemplate` | n/a | KEEP |
| 9 | POST | `/admin/templates/:id/duplicate` | `controller.adminDuplicate` | `service.duplicateTemplate` | `protect`, `validateObjectId('id')`, `requirePageAccess(TEMPLATES,'create')` | MISSING | `useDuplicateTemplate` | n/a | KEEP |
| 10 | DELETE | `/admin/templates/:id` | `controller.adminDelete` | `service.deleteTemplate` | `protect`, `validateObjectId('id')`, `requirePageAccess(TEMPLATES,'delete')` | MISSING | `useDeleteTemplate` | n/a | KEEP |
| 11 | GET | `/template-categories` | `controller.listCategories` | `service.listCategories` | (none — public) | MISSING | `useTemplateCategories({admin:false})` | `templateService.getCategories` (raw `useEffect`) | KEEP |
| 12 | GET | `/admin/template-categories` | `controller.adminListCategories` | `service.listCategories` | `protect`, `requirePageAccess(TEMPLATE_CATEGORIES,'view')` | MISSING | `useTemplateCategories({admin:true})` | n/a | KEEP |
| 13 | POST | `/admin/template-categories` | `controller.adminCreateCategory` | `service.createCategory` | `protect`, `requirePageAccess(TEMPLATE_CATEGORIES,'create')` | MISSING | `useCreateCategory` | n/a | KEEP |
| 14 | PUT | `/admin/template-categories/:id` | `controller.adminUpdateCategory` | `service.updateCategory` | `protect`, `validateObjectId('id')`, `requirePageAccess(TEMPLATE_CATEGORIES,'update')` | MISSING | `useUpdateCategory` | n/a | KEEP |
| 15 | DELETE | `/admin/template-categories/:id` | `controller.adminDeleteCategory` | `service.deleteCategory` | `protect`, `validateObjectId('id')`, `requirePageAccess(TEMPLATE_CATEGORIES,'delete')` | MISSING | `useDeleteCategory` | n/a | KEEP |
| 16 | GET | `/fonts` | `controller.listFonts` | (inline — returns `FONTS` constant) | (none — public) | MISSING | `useFonts` | none (declared `ENDPOINTS.FONTS.LIST` but never called) | KEEP |

**Legend:** KEEP, DELETE-DUPLICATE-OF-#N, RENAME, MERGE-WITH-#N

---

## 2. Backend Findings

### 2.1 File-size violations
None — all backend files are within caps:
- `templates.routes.js` — 146 / 400
- `templates.controller.js` — 111 / 300
- `templates.service.js` — 554 / 600
- (no `templates.validation.js` exists)

### 2.2 Swagger drift
**The entire module has zero `@swagger` JSDoc blocks.** Every endpoint listed in §1 is undocumented. This is the single largest finding. Fix: add a `@swagger` block above every route definition (or method on `router.route(...)`), referencing schemas via `$ref` in `config/swagger.js`. Minimum schemas to add to `components.schemas`:
- `Template` (matches `models/TemplateModel.js` — root + `fieldDef`, `overlay`, `decoration` sub-schemas)
- `TemplateCategory` (matches `models/TemplateCategoryModel.js`)
- `TemplateFontEntry` (matches the `FONTS` registry shape)
- `TemplateUploadUrlResponse` ({url, fields, s3Key})
- `TemplateUploadImageResponse` ({s3Key})
- `TemplateCreateInput` / `TemplateUpdateInput` (mirror Joi schemas once added — see §2.6)
- `TemplateCategoryCreateInput` / `TemplateCategoryUpdateInput`

### 2.3 Missing middleware / safeguards
- `templates.controller.js:38` — controller reads `req.user?.role === "super_admin"` literal. Replace with `req.user?.role === ROLES.SUPER_ADMIN`. Better: move the `isSuperAdmin` derivation into the service (controllers must not contain role checks per A2.3).
- `templates.service.js:103` — `console.error("[templates.service] S3 delete failed:", err.message)`. Per A2.4 / D6, swap for shared `logger` from `shared/utils/logger.js`.
- `templates.service.js:312-314,394-396,424-426,486-489,507-510,527-530` — six `try { logAudit(...) } catch(_) { /* swallow */ }` blocks. The shared `logAudit` already swallows internally per `shared/utils/auditLog.js`; the wrapper is unnecessary noise. Remove the try/catch and let `logAudit` run.
- `templates.service.js:430-454` — `duplicateTemplate` is a sensitive admin write but does **not** call `logAudit`. Add the `template.duplicate` audit log entry mirroring `create`/`update`.
- `templates.service.js:514-532` — `deleteCategory` performs a soft-delete (`active = false`) but writes the audit action as `template_category.delete`. The action name is misleading because the row is not deleted. Either rename the action to `template_category.deactivate` or actually hard-delete when no templates reference it (and audit `template_category.delete`). Recommend the rename — the data is preserved by design (see comment at line 517).
- `templates.routes.js:33-40` — `uploadUrlLimiter` is correctly applied to `upload-url` and `upload-image`. No change.
- `templates.routes.js:111` — `categoriesRouter.get('/')` is intentionally public (per `// public, no auth per v4.1 §A-11`). No change, but keep the comment as a true *why*.
- `templates.routes.js:140` — `fontsRouter.get('/')` is also public (used during host preview before login on public landing pages? Verify — see §6.1).
- **No Joi validation** on any `POST` / `PUT` body. `createCategory`/`updateCategory` rely on inline `if (!payload.code || !payload.nameEn || !payload.nameAr)` checks (`templates.service.js:467-469`). `createTemplate`/`updateTemplate` rely on Mongoose schema defaults. See §2.6.

### 2.4 Duplicate / dead endpoints
- `POST /admin/templates/upload-url` (#4) — declared in routes/controller/service, declared in `api.config.js` as `adminUploadUrl`, but **no consumer**. Web migrated to `upload-image` (proxy upload) per the comment in `labbe/services/templatesService.js:60`. Delete:
  - Route: `templates.routes.js:60-65`
  - Controller: `templates.controller.js:43-48`
  - Service: `templates.service.js:107-152` (`getUploadUrl`) + the lazy-load of `@aws-sdk/s3-presigned-post` (`templates.service.js:45-52`) once the function is gone
  - Service export: `templates.service.js:545` (`getUploadUrl`)
  - Web `API_PATHS`: `labbe/services/new-backend/api.config.js:305` (`adminUploadUrl`)
  - **Note:** if the team plans to revert to presigned-POST after CloudFront provisioning (Phase 5), keep the code but mark with a `WHY:` comment. Decision needed — surface in §6.

### 2.5 Service / controller violations
- `templates.controller.js:51` — `throw new (require("../../shared/errors").ValidationError)("image file is required")` uses inline `require(...)`. Hoist the import to the top of the file alongside other shared imports.
- `templates.service.js:222` — local `const { PutObjectCommand } = require("@aws-sdk/client-s3")` inside `processImage` shadows the top-level import already on line 30. Delete the inner require.
- `templates.controller.js:32-39` — `adminList` does a small amount of derivation (`includeInactive: includeInactive !== "false"`, `isSuperAdmin: req.user?.role === "super_admin"`). Per A2.3 this should live in the service: pass `req.query` and `req.user` and let the service compute defaults.
- `templates.service.js:251-261` (`listForHost`) and `templates.service.js:263-277` (`listForAdmin`) — neither uses pagination; both return the full collection. With current data volumes (admin-curated templates) this is fine, but the model lacks a hard upper bound. Add `.limit(200)` on both reads as defense-in-depth.
- `templates.service.js:285-323` (`createTemplate`) — `processImage` runs S3 GET + sharp + S3 PUT + Mongo `create` sequentially across awaits. The orphan-cleanup `try/catch` is correct, but the multi-resource write could leave the thumbnail in S3 if `Template.create` fails *and* `deleteS3Key` then fails. Document this race in `processImage` only — the daily GC script handles it (per file header). No code change required, just confirm the GC job is wired in `jobs/`.

### 2.6 Validation gaps
**Critical: no `templates.validation.js` exists.** Every `POST`/`PUT` body lands in the service unvalidated except for the inline checks in `service.createCategory` and the Mongoose schema. Per A5.1 add **Zod** schemas (decision #1 — Joi is forbidden):

- `createTemplateSchema` — body for `POST /admin/templates`. Required: `nameEn`, `nameAr`, `categories[]` (min 1 string), `s3Key`, `naturalWidth`, `naturalHeight`. Optional: `fields[]`, `overlays[]`, `decorations[]`, `sortOrder`, `active`. Each item shape mirrors `TemplateModel.fieldDefSchema` / `overlaySchema` / `decorationSchema`.
- `updateTemplateSchema` — same fields but all optional, plus `expectedVersion` (number).
- `createCategorySchema` — body for `POST /admin/template-categories`. Required: `code` (snake_case lowercase pattern), `nameEn`, `nameAr`. Optional: `sortOrder` (≥0), `active` (bool).
- `updateCategorySchema` — `nameEn?`, `nameAr?`, `sortOrder?`, `active?`. `code` must be omitted (immutable per model comment).
- ~~`uploadUrlSchema`~~ — N/A (route deleted per decision #2).
- `templateCategoryQuerySchema` — query for `GET /templates`: `category?` (string).
- `adminListQuerySchema` — query for `GET /admin/templates`: `category?`, `search?`, `includeInactive?` (string `"true"|"false"`), `includeDeleted?` (same).

Wire each via `validateZod(schema)` from `shared/middleware/validation.js:373` in `templates.routes.js`.

### 2.7 Comment hygiene
- `templates.routes.js:1-11` — JSDoc header `Phase 4c W0-VISUAL-BACKEND` → trim to a single-sentence summary or remove.
- `templates.routes.js:30-32` — `// Per v4.1 §A-10: …` marker → keep the *why* (rate-limit reason) but drop the version reference.
- `templates.controller.js:1-11` — `Phase 4c W0-VISUAL-BACKEND` header → trim.
- `templates.service.js:1-16` — `Phase 4c W0-VISUAL-BACKEND` + `v4.1 §A-7.1` markers → trim, keep the orphan-cleanup behaviour description.
- `templates.service.js:35-36` — `PHASE_4C_PLAN §1 D4c-5` → replace with a short *why* or remove.
- `templates.service.js:45-46` — same comment marker.
- `templates.service.js:78-82` — `v4.1 §A-7 imageUrl fallback` marker → trim.
- `templates.service.js:223-243` — `Hardening (post-review C-R3)` marker. Keep the *why* (CloudFront provisioning, ACL inheritance) but drop the review reference.
- `templates.service.js:331-336` — `Polish (post-review)` marker. Keep the optimistic-lock *why*, drop the marker.
- `templates.service.js:107-113` — `Body shape: …` block re-states what the function signature already encodes — trim.
- `models/TemplateModel.js:1-10` — `Phase 4c W0-VISUAL-BACKEND` + `[PATCH 2]` + `v4.1 §A-3` markers → trim.
- `models/TemplateCategoryModel.js:1-9` — `Phase 4c W0-VISUAL-BACKEND` + `v4.1 §A-11` markers → trim.
- `templates.service.js:439` — trailing `// shares the original — admin should re-upload before publishing` is a real *why* — keep.
- All `try { logAudit(...) } catch(_) { /* swallow */ }` swallow-comments are unnecessary once the wrapper is removed (§2.3).
- `shared/constants/fontRegistry.js:1-8` — `Phase 4c W0-VISUAL-BACKEND` header → trim. Keep the *why* about display names being i18n-resolved.

---

## 3. Frontend Web Findings

### 3.1 Component tree per page

`labbe/app/[lang]/admin-dash/templates/page.js` (16) — list
- `_components/TemplatesPageContent.jsx` (557) — **VIOLATION cap=250**
  - inline `SearchInput` (in same file)
  - inline `CategoryFilter` (in same file)
  - inline `IncludeInactiveToggle` (in same file)
  - `ui/commen/button/Button.js` (shared)
  - `ui/common/loading/SimpleLoading.js` (shared)

`labbe/app/[lang]/admin-dash/templates/[id]/page.js` (15) — editor
- `_components/TemplateEditorPage.jsx` (233)
  - `_components/ImageUploadPane.jsx` (63)
  - `_components/FieldConfigPanel.jsx` (301) — **VIOLATION cap=250**
    - `_components/FieldsSection.jsx` (269) — **VIOLATION cap=250 (marginal)**
    - `_components/OverlaysSection.jsx` (249) — close to cap, OK
    - `_components/IconPicker.jsx` (230) — OK
  - `_components/templateSchema.js` (118) — Zod schemas
  - `ui/commen/button/Button.js`, `InputGroup`, `InputSelect`, `ToggleInput`, `CheckBoxItems`, `TextArea`, `ColorPickerGroup` (shared)
  - `components/shared/TemplatePreviewCanvas.jsx` (used by `ImageUploadPane`)

`labbe/app/[lang]/admin-dash/templates/categories/page.js` (8) — categories admin
- `_components/CategoriesPageContent.jsx` (18)
  - `_components/CategoriesPageHeader.jsx` (19)
  - `_components/CategoriesStats.jsx` (48)
  - `_components/CategoriesTable.jsx` (179)
    - `_components/CategoryFormPopup.jsx` (118)
  - `ui/host/main-page/StatsCards.js`, `ui/commen/new-table/Table.js`, `ui/commen/popup/PopupLayout.js` (shared)

Host consumers (StepThree of create-event):
- `labbe/app/[lang]/host/create-event/_components/stepThree/StepThree.js` (182)
  - `_components/stepThree/templatesCards/TemplatesCards.js` (not opened — assumed within cap)
  - `_components/templateForm/TemplateForm.jsx` (774) — **VIOLATION cap=250 (major)**
    - `components/shared/TemplatePreviewCanvas.jsx`
    - `_components/templateForm/renderField.jsx` (not opened — assumed within cap)
    - many shared `ui/commen/inputs/*` components

Hooks/services:
- `labbe/hooks/queries/useTemplates.js` (52) — OK
- `labbe/hooks/mutations/useTemplateMutations.js` (63) — OK
- `labbe/services/templatesService.js` (95) — OK

### 3.2 File-size violations
- `app/[lang]/host/create-event/_components/templateForm/TemplateForm.jsx` — **774 / 250**. Split into:
  - `templateForm/TemplateForm.jsx` (router) — picks dynamic vs legacy path, < 60 lines.
  - `templateForm/DynamicTemplateForm.jsx` — the Phase-4c dynamic path (~350 lines now; will need further extraction of the preview-bake `onSubmit` and the form layout).
  - `templateForm/LegacyTemplateForm.jsx` — the legacy SVG-template path.
  - `templateForm/useTemplateBake.js` — extract `htmlToImageConvert` orchestration + CORS pre-flight.
  - **Style preservation note:** `templateForm.module.css` stays single-file; both children import it.
- `app/[lang]/admin-dash/templates/_components/TemplatesPageContent.jsx` — **557 / 250**. Split into:
  - `TemplatesPageContent.jsx` — page-level wiring (`useAdminTemplates`, URL-state, mutation handlers, layout shell).
  - `_components/TemplateSearchInput.jsx` — extract inline `SearchInput` (lines 31-79).
  - `_components/TemplateCategoryFilter.jsx` — extract inline `CategoryFilter` (lines 81-220).
  - `_components/TemplateIncludeInactiveToggle.jsx` — extract inline `IncludeInactiveToggle` (lines 222-236).
  - `_components/TemplateGridCard.jsx` — extract the card body (lines 360-518) including its actions. Receives `tpl`, `lang`, `langParam`, `onDuplicate`, `onDelete`, `dupPending`, `delPending`.
  - **Style preservation note:** keep `TemplatesPageContent.module.css`; the extracted children import the same module file (no class renames).
- `app/[lang]/admin-dash/templates/_components/FieldConfigPanel.jsx` — **301 / 250**. Split the four sections:
  - `_components/TemplateIdentitySection.jsx` — section 1 (lines 30-89).
  - `_components/TemplateDecorationsSection.jsx` — section 4 (lines 119-298), keeping `IconPicker` integration.
  - `FieldConfigPanel.jsx` becomes the layout shell rendering `<TemplateIdentitySection/>`, `<FieldsSection/>`, `<OverlaysSection/>`, `<TemplateDecorationsSection/>`.
  - **Style preservation note:** keep `FieldConfigPanel.module.css`; new section files import it.
- `app/[lang]/admin-dash/templates/_components/FieldsSection.jsx` — **269 / 250**. Marginal. Extract a single inline row component (`<FieldRow/>`) to drop ~30 lines.

### 3.3 Hardcoded text / data / paths
- `FieldConfigPanel.jsx:46` — placeholder `"Template name in English"` → `t("templates.panel.nameEnPlaceholder", "Template name in English")`.
- `FieldConfigPanel.jsx:52` — placeholder `"اسم القالب بالعربية"` → `t("templates.panel.nameArPlaceholder", "اسم القالب بالعربية")`.
- `FieldConfigPanel.jsx:85` — description `"Enable or disable this template"` → `t("templates.panel.activeDescription", ...)`.
- `FieldConfigPanel.jsx:165` — `"Decoration #"` literal → `t("templates.panel.decorationNumber", { number: idx+1 })`.
- `FieldConfigPanel.jsx:202` — `"Choose icon..."` → `t("templates.panel.chooseIcon", "Choose icon...")`.
- `FieldConfigPanel.jsx:212` — `"e.g. image URL"` → `t("templates.panel.imageUrlPlaceholder", ...)`.
- `FieldConfigPanel.jsx:238` — `"Icon Size (vh %)"` → `t("templates.panel.iconSizeVh", ...)`.
- `FieldConfigPanel.jsx:294` — `"No decorations added yet"` → `t("templates.panel.noDecorations", ...)`.
- `FieldConfigPanel.jsx:295` — `"Click \"Add Decoration\" to get started"` → `t("templates.panel.addDecorationHint", ...)`.
- `FieldConfigPanel.jsx:66-69` — inline `style={{ color: "var(--error, #e53e3e)", fontSize: "1.2rem", marginTop: "0.4rem" }}` → move to `.module.css` per B11.
- `StepThree.js:99-130` — entire category-chip block uses inline `style={{...}}` (rule B11 forbids inline styles). Move to `stepThree.module.css`.
- `StepThree.js:107,122` — chip border color `"#c28e5c"` and active background `"#fff7eb"` hardcoded → CSS classes.
- `StepThree.js:112-113` — `"كل الفئات"` literal → `t("create_event.all_categories", "كل الفئات")` (key is in current shape; verify namespace).
- `StepThree.js:135-138` — `"...", "لا توجد قوالب متاحة بعد. تواصل مع الدعم."` → `t("create_event.no_templates_available", ...)`.
- `StepThree.js:164` — `style={{ color: "#2a8c5b", fontWeight: 600 }}` → CSS class.
- `CategoriesTable.jsx:31-127` — Arabic fallback strings inside `t(...)` calls (e.g. `t("templates.categories.confirmDelete", "هل أنت متأكد من حذف هذه الفئة؟")`). Per B2 fallbacks are acceptable; **only** issue is the duplication. Confirm the keys exist in `localization/locales/{en,ar}/admin.json` (see §8).
- `CategoryFormPopup.jsx:38,41,67-89,96-108` — same pattern. Confirm keys exist.
- `TemplatesPageContent.jsx:212` — `t("templates.noCategoriesFound")` lacks fallback per B2 ("Always provide a fallback string"). Add fallback to all `t()` calls in the file (lines 114, 159, 172, 212, 295, 311, 324, 325, 329, 332, 341, 353, 358, 401, 412, 432, 449, 474, 515, 551).

### 3.4 Data mapping bugs / fallback chains
Per B0.1 / D3 the backend response is single-shape (`sendSuccess(res, { templates })` → `{ success, data: { templates: [...] } }`). The fallback chains hide errors and must be reduced to one path:

- `TemplatesPageContent.jsx:261-262` — `data?.data?.templates || data?.templates || []`, `catData?.data?.categories || catData?.categories || []` → keep only `data?.data?.templates || []` and `catData?.data?.categories || []`.
- `TemplatesPageContent.jsx:310` — `res?.data?.template?._id || res?.template?._id` → keep only `res?.data?.template?._id`.
- `TemplateEditorPage.jsx:69` — `tplData?.data?.template || tplData?.template` → keep only `tplData?.data?.template`.
- `TemplateEditorPage.jsx:148` — `res?.data?.template?._id || res?.template?._id` → keep only `res?.data?.template?._id`.
- `TemplateEditorPage.jsx:167-168` — `catData?.data?.categories || catData?.categories || []`, `fontsData?.data?.fonts || fontsData?.fonts || []` → drop the second branch.
- `CategoriesStats.jsx:15` — `data?.data?.categories || data?.categories || []` → drop the second branch.
- `CategoriesTable.jsx:130` — same fix.
- `CategoryManager.jsx:44` — same fix (and the file is dead — see §3.5 — so this disappears entirely).
- `StepThree.js:42-43` — `catData?.data?.categories || catData?.categories || []`, `tplData?.data?.templates || tplData?.templates || []` → drop the second branch.
- `TemplateForm.jsx:76` — `fontsData?.data?.fonts || fontsData?.fonts || []` → drop the second branch.

### 3.5 Duplicate hooks / direct apiRequest calls / dead code
- `app/[lang]/admin-dash/templates/_components/CategoryManager.jsx` (161 lines) and its sibling `CategoryManager.module.css` are **dead code** — `CategoryManager` is not imported anywhere. The categories admin page uses `CategoriesPageContent.jsx` → `CategoriesTable.jsx` + `CategoryFormPopup.jsx`. Delete both `.jsx` and `.module.css`.
- `services/new-backend/api.config.js:305` — `adminUploadUrl: '/admin/templates/upload-url'` is unused (see §2.4). Delete from API_PATHS once the backend route is removed.
- No direct `apiRequest`/`useQuery` calls inside components — all consumers go through `useTemplates` / `useTemplateMutations`. Good.

### 3.6 State / loading / error gaps
- `TemplatesPageContent.jsx:357-358` — has `<SimpleLoading/>` for loading and `<p className={styles.error}>` for error. **No empty state component**: the `.empty` div on line 521 only renders when `!isLoading && templates.length === 0` and is rendered *inside* the grid container — that is acceptable, no fix needed.
- `TemplatesPageContent.jsx:295` — `confirm(t("templates.confirmDelete"))` — replaces a `confirm()` browser dialog with a proper `ConfirmPopup` (the project has `ui/commen/popup` components). Per the original prompt's anti-pattern checklist, native dialogs are avoided.
- `CategoriesTable.jsx:33,93` — same `confirm()` calls. Replace with the project's confirmation popup.
- `CategoryManager.jsx:57` — also uses `confirm(...)` — moot once the file is deleted.
- `TemplateEditorPage.jsx:170-172` — `if (!isNew && isLoading) return <SimpleLoading />` — fine. **No error branch**: if `useTemplate(id)` errors (e.g. the ID is not found), the component renders the empty form without telling the user. Add `if (!isNew && error) return <ErrorState />`.
- `CategoriesStats.jsx:45` — same: no error branch, only loading.
- `CategoryFormPopup.jsx:45-47` — three `console.error` debug logs that must be removed (D6). Replace with no-op (handleError already runs).
- `StepThree.js:133-134` — loading text `{t("loading", "...")}` is `"..."` — replace with the shared `<SimpleLoading/>` or `<ActivityIndicator/>` to match other host pages.

### 3.7 Comment hygiene
- `TemplatesPageContent.jsx:1-11` — `Phase 4c W1-VISUAL` + `v4.1 §A-1` + `[PATCH 14]` markers → trim.
- `TemplatesPageContent.jsx:245` — `// Rule 14: filter state lives in URL params` → drop the rule reference, keep nothing (the code is self-evident).
- `StepThree.js:1-20` — `Phase 4c W1-VISUAL` + `Phase 4c W0-RENAME` markers → trim, keep the contract description if useful.
- `StepThree.js:42-49` — comments restating the next two lines. Trim.
- `StepThree.js:73,86,88` — comments restating `setValue` calls. Trim.
- `TemplateEditorPage.jsx` — none significant.
- `templateSchema.js:5,12,19,25,27,46,63,88,101` — section comment headers (`// ── helpers ──…`) — these are acceptable structural separators; keep.
- `FieldConfigPanel.jsx:29-127` — comments like `{/* ── 1. Template Identity ── */}` — section markers, acceptable.
- `useTemplates.js` / `useTemplateMutations.js` — no markers, clean.
- `services/templatesService.js:1-7` — `Phase 4c W1-VISUAL` header → trim.
- `services/templatesService.js:58-61` — `Avoids the browser→S3 CORS restriction of the old presigned-POST flow` → real *why*, keep.

---

## 4. Frontend Mobile Findings

### 4.1 Screen → component tree

The mobile surface for the templates module is the picker only — there is **no admin** equivalent and **no dynamic-form rendering** path on mobile (web's `DynamicTemplateForm` has no mobile counterpart).

`screens/host/HomeScreen.js` — uses `EventTemplates` for the home preview band.
`components/createEvent/StepThree.js` (284) — the create-event wizard step.
- `components/home/EventTemplates.js` (354) — **VIOLATION cap=350 (marginal)**.
`components/createEvent/StepFour.js` — reads `visualTemplate.categories[0]` to filter Taqnyat templates.
`screens/common/update-event/StepThree.js` — wraps the same `EventTemplates`.

Service / hooks:
- `services/templateService.js` (29) — single domain wrapper, OK.
- **No `hooks/queries/useTemplates.js`** and **no `hooks/mutations/useTemplateMutations.js`** — mobile diverges from web by using raw `useEffect` against `templateService` (`EventTemplates.js:34-51`).

### 4.2 File-size violations
- `components/home/EventTemplates.js` — 354 / 350. Trim by extracting:
  - `_components/TemplateCategoryChips.js` — the categories ScrollView block (lines 65-122).
  - `_components/TemplateCard.js` — the template card with animated scale/opacity (lines 164-200).
  - **Style preservation:** every `StyleSheet.create({...})` value must be moved into the extracted children verbatim — no rounding/renaming/reordering.
- `services/templateService.js` — 29, OK.

### 4.3 Service / hook violations
- **Major:** `EventTemplates.js:34-51` uses `useState + useEffect + .then(setState)` — forbidden per C2/C4 ("React Query for server data"). Migrate to:
  ```js
  // hooks/queries/useTemplates.js
  export function useHostTemplates({ category } = {}) {
    const token = useAuthStore((s) => s.token);
    return useQuery({
      queryKey: ["templates", "host", category || "all"],
      queryFn: () => templateService.getTemplates(category ? { category } : {}),
      enabled: !!token,
      staleTime: 5 * 60 * 1000,
    });
  }
  export function useTemplateCategories() {
    return useQuery({
      queryKey: ["template-categories", "public"],
      queryFn: () => templateService.getCategories(),
      staleTime: 10 * 60 * 1000,
    });
  }
  ```
- `templateService.js:25,27` — accepts `token` as a parameter, but `apiFetch` reads the token from `useAuthStore` automatically. Drop the parameter (rule C1: `_legacyToken` is being phased out).
- `services/templateService.js` — **no `getFonts()` method**, even though `ENDPOINTS.FONTS.LIST` is declared. Add `getFonts: () => request(ENDPOINTS.FONTS.LIST)` and a `useFonts` query hook now (decision #7 — locked). Mobile's `DynamicTemplateForm` analogue does not yet exist; the hook is added ahead of consumer.
- `EventTemplates.js:38,49` — `.catch(console.error)`. Per C8/D6 use a proper error toast / state.

### 4.4 Hardcoded text / data / paths
- `EventTemplates.js:62` — `{t("templates") || "قوالب المناسبات"}` — the `||` fallback is a hardcoded literal. Use `t("templates", "قوالب المناسبات")` (the translation library accepts the second argument as the default).
- `EventTemplates.js:90` — `{t("navigation.events") || "الكل"}` — same. Also: this label is meant to be "All", not "events" — wrong key. Use `t("common.all", "الكل")` (or whatever the project key is).
- `EventTemplates.js:208-352` — every color and font value is hardcoded. Acceptable per project conventions (RN doesn't use CSS Modules), but recommend constants for `#C28E5C`, `#FFFAEA`, `Cairo_700Bold`, `Cairo_500Medium` if a shared theme module exists.
- `EventTemplates.js:334-352` — large block of commented-out styles (`indicatorsContainer`, `indicator`, `indicatorActive`). Per C8 / D5 — delete dead commented code. If indicators are coming back, leave a single `// TODO: pagination indicators planned` line.

### 4.5 Web/Mobile divergence
| Endpoint | Aspect | Web | Mobile | Backend truth | Action |
|----------|--------|-----|--------|---------------|--------|
| `GET /templates` | category param value | `cat.code` (string `"wedding"`) | `cat._id` (ObjectId) | `categories` field stores `code` strings | **Fix mobile** — pass `cat.code`, not `cat._id`. (`EventTemplates.js:99,107`) |
| `GET /templates` | response mapping | `data?.data?.templates \|\| data?.templates \|\| []` | `res.templates \|\| res.data \|\| []` | `data.templates` | Fix both — single path `data.data.templates` |
| `GET /template-categories` | response mapping | `data?.data?.categories \|\| data?.categories \|\| []` | `res.categories \|\| res.data \|\| []` | `data.categories` | Fix both — single path `data.data.categories` |
| `GET /fonts` | consumer | `useFonts` (called by host `TemplateForm`) | **none** (endpoint declared, never called) | n/a | Add `useFonts` mobile hook now (decision #7); integrate into mobile dynamic form when it ships |
| Hook layer | canonical hook | `hooks/queries/useTemplates.js` | **missing** — raw `useEffect`s in `EventTemplates.js` | n/a | Add mobile `hooks/queries/useTemplates.js` mirroring web key shape |
| Cache key | host list key | `["templates", "host", category \|\| "all"]` | inline `setTemplates` (no cache) | n/a | Use the same key in mobile React Query hook |

### 4.6 Loading / error / empty states
- `EventTemplates.js:66-67,126-127` — `<ActivityIndicator/>` for loading on both categories and templates. Good.
- **No error state** — `.catch(console.error).finally(...)` swallows. Add an inline error message + retry button.
- **No empty state** — when `templates.length === 0` after load, the ScrollView simply renders nothing. Add an empty placeholder copying the pattern from `screens/host/EventsScreen.js` or similar sibling.
- `StepThree.js` (mobile) — verify it shows the same state branches when the user picks a category that has no templates. (Behaviour inherited from `EventTemplates`.)

### 4.7 Comment hygiene
- `services/templateService.js:1-7` — `Phase 4 W0-AUTH` + "Token argument retained for caller compatibility but ignored" — once the token parameter is removed (§4.3), trim the header to a one-sentence summary.
- `config/api.js:203-204` — `Phase 4c W2-MOBILE-WIZARD` marker → trim.
- `config/api.js:210-211` — same.
- `EventTemplates.js:38,49` — `.catch(console.error)` are not comments but the same hygiene category.

---

## 5. Cross-Platform API Consumption Diff

| Endpoint | Aspect | Web | Mobile | Backend truth | Action |
|----------|--------|-----|--------|---------------|--------|
| `GET /templates` | `category` query | `cat.code` | `cat._id` | string `code` from `TemplateCategory.code` | **Fix mobile to send code** |
| `GET /templates` | response field path | `data.data.templates` (with fallback) | `res.templates` (with fallback) | `data.templates` (sendSuccess wrapping) | Fix both to read `data.data.templates` only |
| `GET /templates/:id` | response field path | `tplData.data.template` (with fallback) | n/a | `data.template` | Fix web to read `data.data.template` only |
| `GET /admin/templates` | `includeInactive` value | `"true"` / `"false"` (string) | n/a | controller treats `req.query.includeInactive !== "false"` | OK (web sends the right shape) |
| `GET /admin/templates` | `search` query | `search` | n/a | service escapes regex; OK | OK |
| `POST /admin/templates` | body fields | `{nameEn, nameAr, categories, s3Key, naturalWidth, naturalHeight, fields, overlays, decorations, sortOrder, active}` | n/a | service requires `s3Key` | OK |
| `PUT /admin/templates/:id` | body fields | `{...same, expectedVersion?}` | n/a | service supports `expectedVersion` for optimistic lock | Web must send `expectedVersion` (decision #5, B.14) |
| `POST /admin/templates/upload-image` | body | `multipart/form-data { image }` | n/a | `memUpload.single("image")` | OK |
| ~~`POST /admin/templates/upload-url`~~ | — | — | — | — | DELETED (decision #2) |
| `GET /template-categories` | response mapping | `data.data.categories` | `res.categories` (with fallback) | `data.categories` | Fix both |
| `GET /admin/template-categories` | response mapping | same | n/a | same | Fix web |
| `POST /admin/template-categories` | body | `{code, nameEn, nameAr, sortOrder}` | n/a | service requires `code`, `nameEn`, `nameAr` | OK |
| `PUT /admin/template-categories/:id` | body | `{nameEn?, nameAr?, sortOrder?, active?}` (also `body: { active }` from CategoriesTable toggle) | n/a | service writes `nameEn\|nameAr\|sortOrder\|active`; **does not** accept or update `code` (immutable) | OK |
| `DELETE /admin/template-categories/:id` | semantics | client treats as hard delete (toast: "تم حذف الفئة بنجاح") | n/a | service performs **soft delete** (`active=false`) | Fix UI copy to "disabled" and audit-log action name to `deactivate` (decision #3, A.9) |
| `GET /fonts` | consumer | `useFonts` | **none today** | `data.fonts` array of `{id, webFamily, mobileFamily, supportsArabic, weights}` | Add mobile `useFonts` now (decision #7); public route stays (decision #4) |

---

## 6. Suspected Bugs Worth Verifying

(Things that look broken but the agent cannot confirm without running the app — flag them so the user can sanity-check.)

### 6.1 `GET /fonts` is public — intentional or accidental?
`templates.routes.js:138-140` mounts the fonts router **without** `protect`. Compare to `/template-categories` which is also public per `// public, no auth per v4.1 §A-11`. If the host preview during pre-login is a real use case, this is correct. Otherwise add `protect`.

### 6.2 Web optimistic-lock not actually engaged
`templates.service.updateTemplate` supports `expectedVersion` → 409 conflict response. But `TemplateEditorPage.jsx` builds the update payload (`onSubmit`, lines 133-160) without including `expectedVersion`. Two admins editing the same template will silently overwrite each other. Recommend: load `version` from the fetched template, send it as `expectedVersion`, and surface the 409 with a "reload and retry" toast. Already a polish-style follow-up — confirm it should be implemented.

### 6.3 Mobile category filter is broken
`EventTemplates.js:107` sends `cat._id` as the `category` query param. Backend filters `Template.find({ categories: <code> })` where `categories` stores strings like `"wedding"`. So picking any category in mobile returns no templates. Verify by smoke-test on device.

### 6.4 Web "Manage Categories" link goes to `/admin-dash/templates/categories`, but the categories page header expects translation keys not present in `admin.json`
The keys `templates.categories.title`, `templates.categories.create.title`, etc. all use B2-style fallbacks today — verify the keys exist and that English translations are populated. List in §8.

### 6.5 `CategoriesTable.jsx:139` vs `CategoryFormPopup.jsx:38` — soft vs hard delete copy
The toast `"تم حذف الفئة بنجاح"` reads as "Category deleted successfully" but the backend only flips `active=false`. If a deleted category is later re-activated it will reappear, surprising the admin. Either change the copy to "Category disabled" or implement a hard-delete in the backend (when no templates reference it).

### 6.6 Mobile uses `cat._id || cat.id` even though backend `_id` is canonical
Defensive `||` chain at `EventTemplates.js:99`. Backend always returns `_id` (Mongo). The `id` branch is dead. Drop it once the response shape is canonicalised.

### 6.7 `templates.service.processImage` re-imports `PutObjectCommand` locally
Line 222: `const { PutObjectCommand } = require("@aws-sdk/client-s3")` shadows the top-level import on line 30. Harmless today (same export), but confusing. Already in §2.5; flagged here for sanity.

### 6.8 Admin role check uses string literal
`templates.controller.js:38` reads `req.user?.role === "super_admin"`. `shared/constants/roles.js` defines `ROLES.SUPER_ADMIN`. If the constant is `"super_admin"` (likely), the behaviour is correct today; if anyone renames the role string, this silently breaks. Verify via grep before fixing in §2.3.

---

## 7. Implementation Plan (Ordered)

Apply changes in this order. Each item ends with a checkbox the agent will tick during Phase 2.

### 7.A Backend
- [ ] **A.1** Add `templates.validation.js` with all **Zod** schemas listed in §2.6 (`createTemplateSchema`, `updateTemplateSchema`, `createCategorySchema`, `updateCategorySchema`, `adminListQuerySchema`, etc.). Wire each via `validateZod(schema)` from `shared/middleware/validation.js:373` in `templates.routes.js`. (Decision #1)
- [ ] **A.2** Add `@swagger` JSDoc blocks for **every** endpoint in §1 (16 keep + 1 to delete). Add the schemas listed in §2.2 to `config/swagger.js` `components.schemas`.
- [ ] **A.3** Delete `POST /admin/templates/upload-url` route + controller + service function + lazy `@aws-sdk/s3-presigned-post` require + service export. Update `api.config.js`. (Ref: §2.4)
- [ ] **A.4** `templates.controller.js:51` — hoist `require("../../shared/errors")` to the top of the file.
- [ ] **A.5** `templates.controller.js:38` — replace `"super_admin"` literal with `ROLES.SUPER_ADMIN`. Move `isSuperAdmin` derivation into `service.listForAdmin`. (Ref: §2.3, §2.5)
- [ ] **A.6** `templates.service.js:222` — delete the local `require("@aws-sdk/client-s3")` line; rely on the top-level import.
- [ ] **A.7** `templates.service.js:103` — replace `console.error` with `logger.error` from `shared/utils/logger.js`. (Ref: §2.3)
- [ ] **A.8** Add `logAudit` call in `service.duplicateTemplate` (action `template.duplicate`). (Ref: §2.3)
- [ ] **A.9** Rename `template_category.delete` audit action to `template_category.deactivate` to match the actual soft-delete behaviour. (Ref: §2.3, §6.5)
- [ ] **A.10** Remove the redundant `try { logAudit(...) } catch(_) { /* swallow */ }` wrappers in `templates.service.js` (six occurrences). (Ref: §2.3)
- [ ] **A.11** Add `.limit(200)` to `service.listForHost` and `service.listForAdmin` queries. (Ref: §2.5)
- [ ] **A.12** Comment hygiene pass (Ref: §2.7) — trim every Phase/W0/[PATCH N]/v4.1 marker in `templates.routes.js`, `templates.controller.js`, `templates.service.js`, `models/TemplateModel.js`, `models/TemplateCategoryModel.js`, `shared/constants/fontRegistry.js`. Keep the *why* comments.

### 7.B Web
- [ ] **B.1** Delete dead code: `app/[lang]/admin-dash/templates/_components/CategoryManager.jsx` and `CategoryManager.module.css`. Confirm no imports remain. (Ref: §3.5)
- [ ] **B.2** Remove `adminUploadUrl` from `services/new-backend/api.config.js` (after A.3 lands).
- [ ] **B.3** Replace fallback chains with single response paths across all listed sites:
  - [ ] **B.3.1** `TemplatesPageContent.jsx:261-262, 310`
  - [ ] **B.3.2** `TemplateEditorPage.jsx:69, 148, 167-168`
  - [ ] **B.3.3** `CategoriesStats.jsx:15`
  - [ ] **B.3.4** `CategoriesTable.jsx:130`
  - [ ] **B.3.5** `StepThree.js (host create-event):42-43`
  - [ ] **B.3.6** `TemplateForm.jsx:76`
  (Ref: §3.4)
- [ ] **B.4** Remove three `console.error` calls in `CategoryFormPopup.jsx:45-47`. (Ref: §3.6)
- [ ] **B.5** Replace `confirm(...)` browser dialogs with the project's confirmation popup in `TemplatesPageContent.jsx:295` and `CategoriesTable.jsx:33,93`. (Ref: §3.6)
- [ ] **B.6** Add error/empty branches missing today:
  - [ ] **B.6.1** `TemplateEditorPage.jsx` — render an error state when `useTemplate(id)` errors.
  - [ ] **B.6.2** `CategoriesStats.jsx` — render an error state.
  (Ref: §3.6)
- [ ] **B.7** Split `TemplatesPageContent.jsx` into 5 files per §3.2. **Preserve `TemplatesPageContent.module.css` unchanged** — extracted children import the same module.
- [ ] **B.8** Split `FieldConfigPanel.jsx` into the layout shell + 2 section files per §3.2. **Preserve `FieldConfigPanel.module.css` unchanged**.
- [ ] **B.9** Split `FieldsSection.jsx` (extract `<FieldRow/>`). **Preserve `FieldsSection.module.css` unchanged**.
- [ ] **B.10** Split `TemplateForm.jsx` (host) into router + dynamic + legacy + bake hook per §3.2. **Preserve `templateForm.module.css` unchanged**.
- [ ] **B.11** Replace ~12 hardcoded strings + inline styles in `FieldConfigPanel.jsx` with `t()` + `.module.css` rules. (Ref: §3.3)
- [ ] **B.12** Replace inline styles + literal Arabic in `host/create-event/_components/stepThree/StepThree.js` lines 99-138, 162-167 with CSS modules and `t()` keys. (Ref: §3.3)
- [ ] **B.13** Add fallback strings to all `t()` calls in `TemplatesPageContent.jsx` per B2. (Ref: §3.3)
- [ ] **B.14** Implement optimistic-lock `expectedVersion` plumbing in `TemplateEditorPage.jsx`. Capture `version` from `useTemplate` payload; send as `expectedVersion` in update; on 409 surface a "reload and retry" toast. (Decision #5 — locked)
- [ ] **B.15** Comment hygiene pass — trim Phase/W*/[PATCH N] markers in `TemplatesPageContent.jsx`, host `StepThree.js`, `templatesService.js`, hooks files. (Ref: §3.7)

### 7.C Mobile
- [ ] **C.1** Create `halla-mobile/hooks/queries/useTemplates.js` with `useHostTemplates({ category })` and `useTemplateCategories()` per §4.3 snippet.
- [ ] **C.2** Migrate `components/home/EventTemplates.js` to use the new hooks — drop `useState + useEffect` for `categories`, `templates`, `loadingCats`, `loadingTemplates`.
- [ ] **C.3** Fix the category-filter bug: change `const catId = cat._id || cat.id` to `const catCode = cat.code`; pass `cat.code` to `setSelectedCategory`; query backend with `{ category: cat.code }`. (Ref: §4.5, §6.3)
- [ ] **C.4** Drop the `_legacyToken` parameter from `templateService.getCategories` and `getTemplates`. (Ref: §4.3)
- [ ] **C.5** Add `templateService.getFonts()` and a mobile `useFonts` hook now even though no consumer exists yet (decision #7 — locked). Mirrors web key shape.
- [ ] **C.6** Replace fallback chains in mobile data mapping to `data.data.templates` and `data.data.categories` (single path, mirror web after §3.4 fixes). (Ref: §4.5)
- [ ] **C.7** Add error + empty states to `EventTemplates.js`. Replace `.catch(console.error)` with a proper error toast / inline message. (Ref: §4.6)
- [ ] **C.8** Replace `t("templates") || "قوالب المناسبات"` and `t("navigation.events") || "الكل"` with `t(key, fallback)` form. Verify `t("common.all")` is the right key for "All". (Ref: §4.4)
- [ ] **C.9** Delete the commented-out style block at `EventTemplates.js:334-352`. (Ref: §4.4, §4.7)
- [ ] **C.10** Split `EventTemplates.js` per §4.2. **Preserve every `StyleSheet.create({...})` value verbatim** in extracted components.
- [ ] **C.11** Comment hygiene pass — trim Phase markers in `services/templateService.js`, `config/api.js:203-211`. (Ref: §4.7)

### 7.D Cross-platform alignment (do AFTER A/B/C)
- [ ] **D.1** Verify both web and mobile send `category` as the **code string** (e.g. `"wedding"`), not an `_id`. Re-grep both repos for `selectedCategory` / `category=` patterns.
- [ ] **D.2** Verify response shape is `data.data.templates` / `data.data.categories` / `data.data.fonts` end-to-end on both platforms — no fallback chains remain.
- [ ] **D.3** Document a manual smoke check: (a) admin creates a template, (b) host on web sees it in the category-filtered grid, (c) host on mobile sees it in the category-filtered grid, (d) admin disables the template, (e) hosts no longer see it.
- [ ] **D.4** Re-run `npm run lint` in `labbe-backend-/`, `labbe/`, and `halla-mobile/` (or whatever the project lint commands are) and ensure no new warnings.

---

## 8. Locale-key additions required

(Listed for the user — agent does NOT modify locale JSON without explicit approval.)

### Web (`localization/locales/{en,ar}/admin.json`)
- `templates.panel.nameEnPlaceholder` (en: "Template name in English", ar: "اسم القالب بالإنجليزية")
- `templates.panel.nameArPlaceholder` (en: "Template name in Arabic", ar: "اسم القالب بالعربية")
- `templates.panel.activeDescription` (en: "Enable or disable this template", ar: "تفعيل أو تعطيل هذا القالب")
- `templates.panel.decorationNumber` (en: "Decoration #{{number}}", ar: "زخرفة #{{number}}")
- `templates.panel.chooseIcon` (en: "Choose icon...", ar: "اختر أيقونة...")
- `templates.panel.imageUrlPlaceholder` (en: "e.g. image URL", ar: "مثال: رابط الصورة")
- `templates.panel.iconSizeVh` (en: "Icon Size (vh %)", ar: "حجم الأيقونة (vh %)")
- `templates.panel.noDecorations` (en: "No decorations added yet", ar: "لم تضف أي زخارف بعد")
- `templates.panel.addDecorationHint` (en: "Click \"Add Decoration\" to get started", ar: "انقر على \"إضافة زخرفة\" للبدء")
- Verify all `templates.categories.*` keys used by `CategoriesTable.jsx` and `CategoryFormPopup.jsx` exist (currently using inline Arabic fallbacks).

### Web (`localization/locales/{en,ar}/createEvent.json`)
- `all_categories` (en: "All categories", ar: "كل الفئات")
- `no_templates_available` (en: "No templates available yet. Contact support.", ar: "لا توجد قوالب متاحة بعد. تواصل مع الدعم.")
- Verify `select_template`, `selected_template`, `loading` exist.

### Mobile (`halla-mobile/localization/locales/...`)
- Verify `t("templates")` and `t("common.all")` exist; if not add `templates` and `common.all` keys.

---

## 9. Rollback plan

For each implementation item, rollback is a `git revert` of its commit. Items that touch DB shape (none in this plan — there are no migrations) need no special rollback. The deletion of `POST /admin/templates/upload-url` (item A.3) is reversible by reverting the commit; no data is lost (no rows ever depended on the response).

---

## 10. Acceptance checklist (run after Phase 2)

- [ ] No file in module exceeds the cap (backend ≤600/300/400, web ≤250, mobile ≤350/500).
- [ ] All 16 (kept) endpoints have current Swagger blocks referencing schemas in `components.schemas`.
- [ ] `POST /admin/templates/upload-url` route + controller + service + `api.config.js` entry deleted (decision #2).
- [ ] Web + Mobile call the same paths with the same shapes for every host endpoint (`/templates`, `/template-categories`, `/fonts`).
- [ ] Mobile sends `category=<code>` (not `_id`).
- [ ] Mobile has React-Query hooks for templates and `useFonts` (decision #7), with `_legacyToken` parameter removed from service.
- [ ] No fallback chains in data mapping for templates/categories/fonts on either platform.
- [ ] Web `expectedVersion` plumbing live: editor sends version, 409 surfaces reload-and-retry toast (decision #5).
- [ ] Audit log for `template.duplicate` is emitted; `template_category.delete` action renamed to `template_category.deactivate`; UI copy reads "disabled" not "deleted" (decision #3).
- [ ] Controller uses `ROLES.SUPER_ADMIN`; `isSuperAdmin` derivation lives in service, not controller (decision #6).
- [ ] `GET /fonts` remains public (decision #4) — confirm no `protect` was added.
- [ ] No `// FLOW-…` / `// PHASE-…` / `// W0-…` / `// [PATCH N]` / `// v4.1 §…` comments in module's surface area.
- [ ] No `console.error`/`console.log` in `templates.service.js`, `CategoryFormPopup.jsx`, `EventTemplates.js`.
- [ ] **Zod** validation file exists and is wired via `validateZod` for every `POST`/`PUT` body and admin list query (decision #1). No Joi anywhere.
- [ ] `npm run lint` clean (or no new warnings introduced) on all three repos.
- [ ] Visual smoke test: admin templates list, editor, categories page, host StepThree (web + mobile), mobile EventTemplates, web optimistic-lock conflict path render identically before/after the refactor.
