# Phase 4c — Plan (Template System Unification)

**Branch:** `claude/phase-4b-4c-4d-plans-Sajqf` (this docs commit) → implementation lands on `implementation/phase-4c-template-system`.
**Cut from:** post-Phase-4b head (tag `phase-4b-merged`).
**Source of truth:**
- `docs/implementation/halla-phase-4-extension-plan.md` (Rev 4) §2 Phase 4c.
- The Phase 4c prompt provided by Peter.
- **`docs/template-system-refactor-plan-v4.1.md` + v4.2 patches** — the comprehensive template-system spec; sections C/D/E/F drive 4c implementation. **This plan absorbs v4.1+v4.2 by reference.**
- `docs/inventory/phase-4-extension/08-event-shape-rename-mapping.md` (Wave −1 of 4b) — locked rename mapping.

> **Why this plan reads differently from the prompt.** The Phase 4c prompt assumes `TemplateModel`, `TemplateCategoryModel`, and admin templates routes already exist. A live audit (May 3 2026) confirms they **do not exist on the backend or web**. The visual-template editor + host-facing template fetch are entirely greenfield. v4.1/v4.2 specifies them in detail and is folded in as the implementation reference. The Phase 4c prompt's wave structure stays; the per-wave plumbing absorbs v4.1/v4.2.

---

## 0. Pre-flight verification

| # | Check | Result vs prompt assumption | Adjustment |
|---|-------|-----------------------------|------------|
| 1 | `labbe-backend-/models/TemplateModel.js` | **MISSING.** | Build per v4.1 §C — Templates Mongoose, with the [PATCH 2] enum addition (`email`, `password`). |
| 2 | `labbe-backend-/models/TemplateCategoryModel.js` | **MISSING.** | Build per v4.1 §A-11. |
| 3 | `labbe-backend-/models/TaqnyatTemplateModel.js` | **MISSING** (expected per prompt). | Build per Phase 4c prompt §W0-MODEL schema. |
| 4 | Admin templates routes (`/api/admin/templates*`) | **MISSING.** | Build per v4.1 §A-10 (presigned-POST upload, RBAC, soft-delete, sharp thumbnail) — NOT a "polish" pass; this is greenfield admin CRUD. |
| 5 | Web `app/[lang]/admin-dash/templates/` route | **MISSING.** | Build per v4.1 §D (TemplatesPageContent, TemplateEditorPage, TemplateEditorCanvas, FieldConfigPanel, DecorationPanel, CategoryManager). |
| 6 | Web `services/templatesService.js` | **MISSING.** | Build alongside W1-VISUAL. |
| 7 | StepThree hardcoded 3-template array | **CONFIRMED.** `labbe/app/[lang]/host/create-event/_components/stepThree/StepThree.js` lines 10–32. | Drop and wire to `templatesService.getTemplates({ category })`. |
| 8 | Mobile StepThree dynamic field rendering | **EXISTS.** `halla-mobile/components/createEvent/StepThree.js:34-149` already has `renderField(field, locale, t)` and packs into `visualTemplate.data: converted` (line 199). | W2-MOBILE-WIZARD's StepThree migration is verification + thumbnail-grid wiring; the renderer is already in place. |
| 9 | `react-native-view-shot` installed on mobile | **EXISTS.** `halla-mobile/package.json:52` → `^4.0.3`. **`html-to-image` and `html2canvas` are still in `package.json` (dead).** | Drop the "install" step from prompt §W2-MOBILE-WIZARD #1 — the package is installed; the dead deps get removed. The canvas-bake utility (`utils/canvasBake.js`) is still net-new. |
| 10 | `_getEventBodyParams` returns 4 hardcoded params | **MISMATCH.** Returns **5** at `messaging.service.js:37-45` (`guestName`, title, formatted date, time, location). | W0-DYNAMIC's "legacy fallback" must preserve the 5-param shape. |
| 11 | `Event.invitationSettings` schema today | Per `EventModel.js:142-158`: sub-fields are `selectedTemplate` (Taqnyat-template chosen by host), `visualTemplate` (sub-doc with `id, name, src, data`), `attendanceAutoReply`, `absenceAutoReply`, `expectedAttendanceAutoReply`, `templateImage`, `note`. **The Taqnyat template ID lives on `selectedTemplate`, NOT a separate field.** | Inventory 08 must document this — current "step 4" Taqnyat picker writes into `selectedTemplate`. The rename mapping splits Taqnyat → `taqnyatTemplate.templateRef` (new) and visual → `visualTemplate.{templateRef, fieldValues, bakedImagePath}`. |
| 12 | StepFour Taqnyat fetch path | **EXISTS via `API_PATHS.invitations.getApprovedTemplates`** (web `StepFour.js:44-49`). Direct backend → Taqnyat passthrough; results NOT cached on the backend. | W0-MODEL adds the cache (TaqnyatTemplateModel + sync route + filtered public read). W1-WIZARD-RENAME rewires StepFour to `GET /api/v2/taqnyat-templates?category=`. |
| 13 | Admin sidebar link to `/admin-dash/templates` | **MISSING.** `labbe/ui/layout/navConfig.js` admin section (lines 135-222) has no entry. | W1-VISUAL adds it AND adds the `templates` + `template_categories` + `taqnyat_templates` entries to `ADMIN_PAGES` / `ROLE_PAGE_ACCESS` (both backend `permissions.js` and web `serverAuth.js` mirrors per v4.1 §A-1). |
| 14 | Backend cron scheduler exists | **No `src/jobs/` directory** in `labbe-backend-/`. Cron entries currently scheduled in-process via `node-cron` (per Phase 3 ledger entries that mention `scheduleEventRetry` cron). | W0-MODEL's daily Taqnyat sync uses the same in-process `node-cron` registration; create `src/jobs/` if needed and document. |
| 15 | Migration script convention | Existing scripts under `labbe-backend-/scripts/` (e.g. `audit-admin-whitelabel.js`, `backfill-guest-access-token-expiry.js`, `seedInitialTemplates.js`). | W0-RENAME's `migrate-event-shape.js` lands here. |
| 16 | `seedInitialTemplates.js` | **EXISTS** at `labbe-backend-/scripts/seedInitialTemplates.js`. Currently seeds nothing meaningful (the Template model didn't exist). | Update post-W0-MODEL to seed the canonical visual templates per v4.1 §B-17 `INITIAL_TEMPLATE_NAMES` constant. Run on staging at end of phase (not now). |

Drive-by surfaces:

- `frontend.url` is wired at `src/config/index.js:72-74` — used by W0-RENAME for any URL constructed from a renamed path.
- `event.status` enum already includes `failed` (Phase 3a). Nothing to add for the rename.
- `EventModel.messagingStatus` shape (lines 176–221) is unchanged by 4c — the Taqnyat template ref doesn't affect messaging status tracking, only `_getEventBodyParams` resolution.
- The web canvas-bake pipeline (`labbe/utils/index.js:201` `htmlToImageConvert` via `html2canvas`) works end-to-end per inventory 07 — reused as-is for 4c. **Confirmed it currently uploads to `PATCH /events/:id/invitation-settings` (multipart);** W1-VISUAL must verify it routes to the renamed `PATCH /events/:id/visual-template` endpoint.

---

## 1. Locked decisions (relevant subset + 4c-specific tie-breakers)

Inherits master plan + the Phase 4c prompt:

- **D3.** Taqnyat var mapping = separate `TaqnyatTemplateModel`.
- **D4.** Step 4 Taqnyat picker stays on the wizard (now backend-cached, was direct passthrough).
- **D6.** Web/mobile schema strategy = shared package (4d kicks off the migration; 4c renames in place under the canonical shape).
- **D11.** Admin/whitelabel create-event = host wizard with role-aware branches.

4c-specific tie-breakers:

- **D4c-1.** **Wizard step structure (locked):**
  1. Event details
  2. Guest list + supervisors (atomic in 4d)
  3. Visual template (card pick + form + canvas bake)
  4. Taqnyat template (filtered by step 3 category)
  5. Invitation messaging + guest replies + host note (was old step 4's body)
  6. Summary
  Web becomes 6 steps; mobile gets the same shape (4 → 5 → confirm).
- **D4c-2.** Backend rename: **dual-write** is mandatory for one release cycle. Read paths prefer new shape, fall back to old. Endpoints kept as compat aliases (per W0-RENAME §4).
- **D4c-3.** Visual template editor RBAC: `templates` page = `FULL` for super_admin/admin, `EDIT` for moderator, `VIEW` for nobody else; `template_categories` page = `FULL` for super_admin/admin, `VIEW` for moderator. `taqnyat_templates` page = `FULL` for super_admin/admin (super-admin only for sync action), no access for moderator. Whitelabel/host get NONE on all three.
- **D4c-4.** Image storage: AWS S3 via presigned-POST upload (v4.1 §A-7), 5 MB cap, content-type allowlist `^image/(jpeg|png|webp)$`, S3 orphan cleanup inline + daily GC script (v4.1 §A-7.1). The Phase 1b S3 utility (`PIPELINE-F05` ledger entry — `FLOW-25-F05`) is the foundation; 4c adds the presigned-POST flow and orphan GC.
- **D4c-5.** Frontend stack additions:
  - `react-rnd` (drag-resize on admin canvas; not currently in `labbe/package.json`).
  - `@dnd-kit/sortable` for field-order reorder in the right panel.
  - `@aws-sdk/client-s3` + `@aws-sdk/s3-presigned-post` (backend).
  - `sharp` (backend, thumbnail generation; check current presence).
- **D4c-6.** Form behavior: admin editor uses `useForm({ mode: "onSubmit" })` (v4.1 [PATCH 10]) and `useUnsavedChanges` custom hook (v4.2 Patch B) — no `react-router-dom` / `react-use` dependencies introduced.
- **D4c-7.** Naming refactor scope: only the rename mapping locked in inventory 08 §Task 4 lands in 4c. Anything else surfaced during the refactor goes to a 4c hand-off note rather than expanding scope.

---

## 2. Wave & sub-track map (file ownership)

Six tracks. Wave 0 (backend) merges first; Waves 1 & 2 gate on its API contract.

| Wave | Sub-track | ID | Description | Primary files |
|------|-----------|----|-------------|---------------|
| 0 | TaqnyatTemplateModel + sync + admin CRUD + cron | `W0-MODEL` | New model, routes, controller, service, integration with Taqnyat fetch, daily cron registration. | `labbe-backend-/models/TaqnyatTemplateModel.js` (NEW), `labbe-backend-/src/modules/taqnyat-templates/{routes,controller,service}.js` (NEW), `labbe-backend-/src/integrations/taqnyat.js` (extend with `fetchApprovedTemplates`), `labbe-backend-/src/app.js` (route mount), `labbe-backend-/src/jobs/syncTaqnyatTemplates.js` (NEW) |
| 0 | EventModel rename + migration script + dual-write services + new sub-object endpoints | `W0-RENAME` | Per inventory-08 mapping: add `visualTemplate.{templateRef, fieldValues, bakedImagePath}`, `taqnyatTemplate.templateRef`, `guestReplies.{onAttend, onAbsent, onExpected}`, top-level `invitationMessage`, `hostNote`. Keep `invitationSettings` for compat. Dual-write in services. New endpoints; old endpoints remain compat aliases. | `labbe-backend-/models/EventModel.js`, `labbe-backend-/src/modules/events/{events.service.js, events.controller.js, events.routes.js}`, `labbe-backend-/scripts/migrate-event-shape.js` (NEW) |
| 0 | Dynamic `_getEventBodyParams` | `W0-DYNAMIC` | Reads `event.taqnyatTemplate.templateRef` (or legacy fallback to `event.invitationSettings.selectedTemplate`); resolves `varMapping[]` against event data. Legacy fallback returns the **5-param** array (audit-corrected from prompt's "4-param"). | `labbe-backend-/src/modules/messaging/messaging.service.js` |
| 0 | Visual template model + admin REST + S3 presigned-POST + orphan GC | `W0-VISUAL-BACKEND` | Builds `TemplateModel` + `TemplateCategoryModel` + admin CRUD + presigned-POST flow + sharp thumbnails + orphan cleanup (inline + daily GC). Per v4.1 §A-7, A-7.1, A-10, A-11, A-12 + §C. Adds `templates` / `template_categories` to `ADMIN_PAGES` + `ROLE_PAGE_ACCESS`. | `labbe-backend-/models/{TemplateModel.js, TemplateCategoryModel.js}` (NEW), `labbe-backend-/src/modules/templates/{routes,controller,service}.js` (NEW + admin variant), `labbe-backend-/src/modules/events/templateDataValidator.js` (NEW per v4.1 §A-12), `labbe-backend-/src/shared/constants/{permissions.js, fontRegistry.js}` (NEW for fonts), `labbe-backend-/scripts/gcOrphanTemplateImages.js` (NEW) |
| 1 | Admin visual-template editor + sidebar link + wizard step 3 wired + dynamic TemplateForm | `W1-VISUAL` | Per v4.1 §A-2, §D, §E, §F: admin editor (TemplateEditorPage / Canvas / FieldConfigPanel / DecorationPanel / CategoryManager), `TemplatePreviewCanvas` shared component, sidebar link, host StepThree wired to `getTemplates`, `TemplateForm` becomes dynamic via `renderField`, `buildDynamicTemplateSchema` Zod factory, `useUnsavedChanges` custom hook (v4.2 Patch B), categories multi-select via `SearchableSelect` in `<Controller>` (v4.2 Patch A), fonts hydrated from `GET /api/fonts`. **Snap-shot logic** (v4.1 §A-8) for old-flow events. | `labbe/app/[lang]/admin-dash/templates/{page.js, [id]/page.js, categories/page.js}` (NEW), `labbe/app/[lang]/admin-dash/templates/_components/*` (NEW per v4.1 §D file structure), `labbe/components/shared/{TemplatePreviewCanvas.jsx, OverlayItem.jsx}` (NEW), `labbe/services/templatesService.js` (NEW), `labbe/hooks/{useUnsavedChanges.js, queries/useTemplates.js, mutations/useTemplateMutations.js}` (NEW), `labbe/config/fonts.js` (NEW per v4.1 §B-18), `labbe/utils/schemas/createEventSchema.js` (extend with `buildDynamicTemplateSchema`), `labbe/app/[lang]/host/create-event/_components/stepThree/StepThree.js`, `labbe/app/[lang]/host/create-event/_components/templateForm/TemplateForm.jsx`, `labbe/ui/commen/inputs/inputGroup/{InputGroup.js, TextArea.js, ColorPickerGroup.js}` (extend per v4.1 §A-4 [PATCH 4-7]), `labbe/ui/layout/navConfig.js` (sidebar entries) |
| 1 | Admin Taqnyat-templates page | `W1-TAQNYAT-ADMIN` | Per Phase 4c prompt §W1-TAQNYAT-ADMIN: table + Sync button + Assign dialog (category + per-`{{N}}` source-key dropdown). Reuses existing admin-table pattern (e.g. `WhitelabelsTable`). | `labbe/app/[lang]/admin-dash/taqnyat-templates/page.jsx` (NEW), `labbe/app/[lang]/admin-dash/taqnyat-templates/_components/{TaqnyatTemplatesTable.jsx, AssignTaqnyatTemplateDialog.jsx}` (NEW), `labbe/services/taqnyatTemplatesService.js` (NEW), `labbe/hooks/queries/useTaqnyatTemplates.js` (NEW), `labbe/ui/layout/navConfig.js` (sidebar entry) |
| 1 | Web wizard step rename + Taqnyat picker step + invitationSettings rename across web | `W1-WIZARD-RENAME` | Lock the 6-step structure (D4c-1). Build new step 4 (Taqnyat picker via cached backend). Reorganize old step 4 content into new step 5 under canonical names. Rename across all web files that read/write old field names. Translation keys in both `ar.json` + `en.json`. **All four roles resolve to the same wizard component.** | `labbe/app/[lang]/host/create-event/_components/stepFour/StepFour.js` (rebuild as Taqnyat picker), `labbe/app/[lang]/host/create-event/_components/stepFive/StepFive.js` (NEW — invitation messaging + guest replies + host note), `labbe/app/[lang]/host/create-event/page.js` (steps wiring), `labbe/services/createAndUpdateEvents.js` (canonical payload shape), `labbe/utils/schemas/createEventSchema.js` (rename in place; 4d migrates to shared package), `labbe/hooks/events/useEventForm.js` (form context keys), `labbe/localization/{ar,en}.json` |
| 2 | Mobile step 3 + step 4 + step 5 + canvas-bake pipeline + dead-dep removal | `W2-MOBILE-WIZARD` | StepThree thumbnail grid wired to `templatesService.getTemplates({ category })` (mobile already has `services/templateService.js` — extend). Build `utils/canvasBake.js` using `react-native-view-shot` (already installed). Remove dead `html-to-image` + `html2canvas` deps from `halla-mobile/package.json`. Build new StepFour (Taqnyat picker) + StepFive (messaging + replies + note). Mobile `i18n` updated. | `halla-mobile/components/createEvent/{StepThree.js, StepFour.js, StepFive.js, PreviewInvitation.js}`, `halla-mobile/utils/canvasBake.js` (NEW), `halla-mobile/services/{templateService.js (extend), taqnyatTemplatesService.js (NEW)}`, `halla-mobile/utils/schemas/createEventSchema.js` (canonical names), `halla-mobile/utils/timeFormat.js` (NEW per v4.1 §B-18), `halla-mobile/package.json` (remove dead deps) |
| 2 | Mobile-wide rename of `invitationSettings.*` consumers | `W2-MOBILE-RENAME` | Grep-driven rename. Read paths fall back to old shape during dual-write window. | Every mobile file matched by `rg "invitationSettings\.|selectedTemplate|templateImage|attendanceAutoReply|absenceAutoReply|expectedAttendanceAutoReply" halla-mobile/`. **Specifically:** `screens/host/UpdateEventScreen.js:51-79` (the `mapApiToFormValues` function) and `services/eventsService2.js`. |

Wave gating: Wave 0 has 4 backend tracks; W0-MODEL and W0-VISUAL-BACKEND can run in parallel (disjoint trees). W0-RENAME and W0-DYNAMIC must follow because they read the new TaqnyatTemplate model. Wave 1 + Wave 2 gate on Wave 0's API contract being merged.

---

## 3. Standing rules (Phase 4c)

- Branch (implementation): `implementation/phase-4c-template-system`. Plans land on `claude/phase-4b-4c-4d-plans-Sajqf`.
- Commit prefix per sub-track: `[PHASE-4C-W0-MODEL]`, `[PHASE-4C-W0-RENAME]`, `[PHASE-4C-W0-DYNAMIC]`, `[PHASE-4C-W0-VISUAL-BACKEND]`, `[PHASE-4C-W1-VISUAL]`, `[PHASE-4C-W1-TAQNYAT-ADMIN]`, `[PHASE-4C-W1-WIZARD-RENAME]`, `[PHASE-4C-W2-MOBILE-WIZARD]`, `[PHASE-4C-W2-MOBILE-RENAME]`.
- Smoke specs (Node IIFE) under `docs/implementation/phase-4c-smoke-tests/`:
  - `static-checks-4c.js` — model existence, route mount strings, RBAC scope on admin templates, `varMapping` resolver helper exports.
  - `mig-script-static.js` — dry-run output of `migrate-event-shape.js` against fixture event documents.
  - `dynamic-params.js` — `_getEventBodyParams` legacy 5-param + mapped resolution.
- Manual verification items recorded in `docs/implementation/PHASE_4C_MANUAL_VERIFICATION.md` per sub-track. **Critical** items: admin editor end-to-end, host on web + mobile end-to-end, Taqnyat assign dialog, test-send with mapped values, old-event legacy send.
- Update `PHASE_4C_PROGRESS.md` after every commit.
- Append to `IMPLEMENTATION_LEDGER.md` at phase end.
- AuditLog `targetType` enum: extend with `template`, `template_category`, `taqnyat_template` if not already covered (lowercase per gotcha). Audit-log writes on admin template create/update/delete + Taqnyat sync runs + Taqnyat var-mapping assignment.
- `git add <file>` per commit; never `git add -A`.
- Bilingual: every new copy string lands in both `ar.json` + `en.json` (web) and `localization/{ar,en}.js` (mobile). v4.1 §H-2a is the canonical key list.
- **No new dependency** outside D4c-5 list. v4.2 Patch B is explicit: no `react-router-dom` / `react-use`.

---

## 4. Out-of-scope (Phase 4c)

Carry forward:

- **4d.** Mobile update-event consolidation, atomic step-2, shared Zod-schema package, mobile create-event verification round-trip.
- **5.** Removing legacy `invitationSettings` field, Detox/Maestro baseline, server-side admin search, Phase 5 audit-log everywhere, real Moyasar integration, test infrastructure.
- v4.1 sections that 4c **does not** cover (defer to Phase 5 or later if surfaced):
  - Real CloudFront provisioning (CloudFront-not-provisioned fallback URL is the 4c default).
  - ClamAV virus scan integration.
  - Tablet/iPad touch optimization on `react-rnd` (desktop-first).

Explicitly **not** in 4c:

- Removing `Event.invitationSettings` (post-cutover cleanup).
- Removing the `PATCH /events/:id/invitation-settings` compat alias (kept for one release cycle).
- Removing dead `html2canvas` from `labbe/package.json` (web canvas-bake still uses it; only mobile's dead `html2canvas` is removed in W2-MOBILE-WIZARD).
- Touching plan/pricing files (per Peter's standing note).
- New features beyond inventory-surfaced gaps + v4.1/v4.2 scope.

---

## 5. Hand-offs from Phase 4b honored here

- **Inventory 08 mapping** — locked rename table; W0-RENAME implements it row-for-row.
- **`useEventActionGate` hook (web)** — W1-WIZARD-RENAME's per-step locks reuse it (v4.1 §A-2 mode="onSubmit" notwithstanding; locks are consumer-level, not form-validation-level).
- **`PartialFailureBanner` shape** — mobile companion in 4b W2-POLL-FAIL inherits the web shape.
- **Whitelabel approve flow** — no 4c work; assumes 4b shipped the email dispatch end-to-end.

---

## 6. Hand-offs to Phase 4d / 5 surfaced now

To populate `PHASE_4C_REPORT.md` "Hand-offs":

- **4d entry points:**
  - The **renamed schemas** (`createEventSchema.js`) + the new `updateEventSchema.js` (4d builds from the renamed shape).
  - `renderField` web + mobile equivalents — 4d's mobile update wizard reuses without reimplementation.
  - The Taqnyat-template selection field (`taqnyatTemplate.templateRef`) is now persisted; 4d's mobile update wizard step 4 dispatches against it.
  - Atomic `PATCH /events/:id/step2` (4d W0-ATOMIC) replaces the parallel `Promise.all([updateGuestList, updateSupervisorsList])` pattern; 4c does NOT change this (it's still parallel until 4d).
- **5 entry points:**
  - **Removal of deprecated `Event.invitationSettings`** after one release cycle.
  - **Removal of compat aliases** `PATCH /events/:id/invitation-settings`, `PATCH /events/:id/guest-replies` (if any 4c-introduced compat shim).
  - Run **`scripts/migrate-event-shape.js` on production** during a quiet window after Phase 5 lands (4c runs it on staging only).
  - Run **`scripts/seedInitialTemplates.js`** on production after admin sign-off (4c runs on staging at end of phase).
  - Run **`scripts/gcOrphanTemplateImages.js`** as a Phase 5 cron registration.
  - **CloudFront provisioning** for `imageUrl` + S3 cache-control headers.
  - **ClamAV** virus-scan Lambda for uploaded template images.
  - **iPad / tablet** touch-optimized admin canvas (carry from v4.1 note).

---

## 7. Stop gate criteria

**Wave 0 stop gate:**
- All Wave-0 specs pass.
- `migrate-event-shape.js --dry-run` against a copy of staging data: every event maps cleanly. Document the dry-run summary in REPORT.
- Admin can `POST /api/v2/admin/taqnyat-templates/sync` and the response is the upserted set. Subsequent `GET /api/v2/taqnyat-templates?category=…` returns the synced templates.
- `_getEventBodyParams` returns mapped values for an event with `taqnyatTemplate.templateRef`; returns the legacy 5-param array for an event without one (no throw).
- Admin can `POST /api/v2/admin/templates/upload-url` (presigned POST), browser uploads to S3 with HTTP 204, then `POST /api/v2/admin/templates` creates the Template record with `imageUrl`, `thumbnailUrl`, `naturalWidth`, `naturalHeight` populated.
- S3 orphan-cleanup `try/catch` returns the upload to clean state on any post-upload throw (verified by injecting a sharp failure).
- New `ADMIN_PAGES` entries are visible in `serverAuth.js` mirror.

**Wave 1 stop gate:**
- Admin opens `/admin-dash/templates`, creates a new template (drag-drop overlays, custom fields, decorations, category), saves. Template appears in StepThree's thumbnail grid (filtered by category).
- `useUnsavedChanges` triggers on tab close + on Next.js soft navigation when admin form is dirty.
- Host on web picks the template in step 3, fills the dynamic form (text/textarea/date/time/color/font/number/email/password fields all render), sees the canvas-baked preview, confirms.
- Host on web picks a Taqnyat template in step 4 (filtered by step 3's category, fetched via `GET /api/v2/taqnyat-templates?category=`).
- Step 5 captures invitation message + guest replies (on attend/absent/expected) + host note under canonical names. The form context keys match the rename mapping.
- Admin opens `/admin-dash/taqnyat-templates`, syncs from Taqnyat, assigns category + var mapping. New template available in step 4 for events in that category.
- Bilingual: AR + EN translations present for every new copy string. RTL editor canvas behaves correctly under `dir="rtl"`.

**Wave 2 stop gate:**
- Mobile host repeats the same flow end-to-end. Including canvas-bake (using `react-native-view-shot.captureRef`).
- Mobile shows the same template options as web (same `GET /templates` endpoint, same data).
- Mobile-baked image dimensions match web (both render at the template's `naturalWidth × naturalHeight`).
- Mobile reads existing events with old field names correctly via the dual-write fallback.
- Dead deps removed from `halla-mobile/package.json`; lockfile regenerated; build green on Android + iOS dev clients.

**Overall stop gate:**
- Test event sends end-to-end: baked image attaches as multipart and Taqnyat template body fills correctly with mapped values. Verified via Taqnyat sandbox or mock dispatcher logs.
- Pre-migration event (legacy `invitationSettings.selectedTemplate` only, no `taqnyatTemplate.templateRef`) still sends correctly via legacy 5-param fallback.
- Migration script runs on staging successfully: every `Event` document has the new sub-objects in addition to the old ones (dual-write).
- Translation keys (ar + en) updated. Snapshot of new keys in REPORT for review.
- `IMPLEMENTATION_LEDGER.md` updated.
- Phase 4 / 4b / 3 / 2 / 1 smoke regressions re-run with no new failures.
- Branch pushed to `origin/implementation/phase-4c-template-system`.

---

## 8. Anti-patterns to avoid (carried + audit-grounded)

- Do **not** skip the dual-write. Migration is irreversible if you only write new fields and an event was created mid-rollout from a stale client.
- Do **not** remove `invitationSettings` from the schema in 4c.
- Do **not** introduce role-specific component files. Same wizard for all roles.
- Do **not** bake assumptions about the rename mapping if inventory 08 hasn't been incorporated. Stop and ask Peter.
- Do **not** add new copy strings without translations for both `ar` and `en`.
- Do **not** broaden scope. If a finding is not in §2, defer with a hand-off note.
- Do **not** install `@shopify/react-native-skia` (the plan picked `react-native-view-shot`).
- Do **not** install `react-router-dom` or `react-use` (v4.2 Patch B forbids).
- Do **not** ship `useForm` with `mode: "onChange"` on the admin editor (v4.1 [PATCH 10] mandates `onSubmit`).
- Do **not** pass `rules={...}` props to mobile renderField (v4.1 [PATCH 1] forbids — zodResolver is single source of truth).
- Do **not** touch plan/pricing files.
- Do **not** silently change the `templateImage` storage shape **outside** the rename mapping locked in inventory 08. The legacy `Event.invitationSettings.templateImage` continues to dual-write to `Event.visualTemplate.bakedImagePath`.
- Do **not** drop the 5-param legacy fallback in `_getEventBodyParams` (audit-corrected from prompt's "4-param").

---

## 9. File ownership conflict map

If two tracks need the same file, merge into one track. Single-source-of-truth ownership:

| File | Owner | Notes |
|------|-------|-------|
| `labbe-backend-/models/EventModel.js` | W0-RENAME | W0-MODEL adds a sibling model only. |
| `labbe-backend-/src/modules/events/events.service.js` | W0-RENAME | W0-DYNAMIC reads it but doesn't write. |
| `labbe-backend-/src/modules/messaging/messaging.service.js` | W0-DYNAMIC | Sole writer. |
| `labbe-backend-/src/shared/constants/permissions.js` | W0-VISUAL-BACKEND | Adds `templates`, `template_categories`, `taqnyat_templates`. W0-MODEL adds nothing here. |
| `labbe-backend-/src/app.js` | W0-MODEL (route mount) | Coordinate route-mount commit ordering with W0-VISUAL-BACKEND. |
| `labbe/services/serverAuth.js` | W1-VISUAL | Mirror of `permissions.js`. |
| `labbe/ui/layout/navConfig.js` | W1-VISUAL | One commit; W1-TAQNYAT-ADMIN appends in the same commit (or commit ordering documented). |
| `labbe/app/[lang]/host/create-event/_components/stepThree/StepThree.js` | W1-VISUAL | W1-WIZARD-RENAME does not touch step 3. |
| `labbe/app/[lang]/host/create-event/_components/stepFour/StepFour.js` | W1-WIZARD-RENAME | W1-VISUAL does not touch step 4. |
| `labbe/utils/schemas/createEventSchema.js` | W1-WIZARD-RENAME (rename) → W1-VISUAL (extend with `buildDynamicTemplateSchema`) | Sequence: rename first, then extend. Same file → same track ideally. **Decision:** W1-VISUAL owns the file, W1-WIZARD-RENAME's rename rebases on top. |
| `halla-mobile/utils/schemas/createEventSchema.js` | W2-MOBILE-WIZARD | W2-MOBILE-RENAME does not touch this file (it does the consumer-side renames). |
| `halla-mobile/screens/host/UpdateEventScreen.js` | W2-MOBILE-RENAME | The `mapApiToFormValues` function reads old shape; rename to canonical. Phase 4d will further consolidate. |
| `halla-mobile/services/eventsService2.js` | W2-MOBILE-RENAME | The `updateInvitationSettings` consumer payload mapping. |

---

## 10. Final deliverables

- All commits on `implementation/phase-4c-template-system`, ready to merge.
- `docs/implementation/PHASE_4C_PLAN.md` (this file), `PHASE_4C_PROGRESS.md`, `PHASE_4C_REPORT.md`, `PHASE_4C_MANUAL_VERIFICATION.md`.
- `IMPLEMENTATION_LEDGER.md` updated.
- `docs/implementation/phase-4c-smoke-tests/` populated.
- Smoke tests green (4c new + 4b / 4 / 3 / 2 / 1 regression).
- **Migration runbook in REPORT** (commands, expected output, rollback plan).
- Hand-off section enumerates Phase 4d entry points (renamed schemas, renderField helpers, atomic step-2 expectation, removal milestones).
- Translations snapshot in REPORT.

When everything is green, ping Peter for review.
