# Phase 4c — Report

**Status.** All 9 sub-tracks landed on `claude/implement-phase-4c-9WdgB`.
Static smoke tests `48 / 48 PASS`. Phase 4b / 4 / 3 / 2 / 1 regression
suites all green. Manual verification recorded in
`PHASE_4C_MANUAL_VERIFICATION.md`.

**Branch.** `claude/implement-phase-4c-9WdgB` (this PR).

---

## 1. Sub-track summary

| Sub-track | Commit | Files added | Files modified |
|-----------|--------|-------------|----------------|
| W0-MODEL | `28b562c` | TaqnyatTemplateModel.js, src/jobs/syncTaqnyatTemplates.js, src/modules/taqnyat-templates/{controller,service,routes,index}.js | scheduledTasks.js |
| W0-VISUAL-BACKEND | `401945b` | TemplateModel.js, TemplateCategoryModel.js, src/modules/templates/{controller,service,routes,index}.js, src/modules/events/templateDataValidator.js, src/shared/constants/fontRegistry.js, scripts/gcOrphanTemplateImages.js | app.js, permissions.js, AuditLogModel.js, package.json (+sharp, +@aws-sdk/s3-presigned-post) |
| W0-RENAME | `ae2b97f` | scripts/migrate-event-shape.js | EventModel.js (canonical sub-objects), events.service.js (dual-write), events.controller.js (parse new keys) |
| W0-DYNAMIC | `b2e9107` | — | messaging.service.js (`_getEventBodyParams` + `_resolveTaqnyatTemplate` + bakedImagePath fallback + canonical guestReplies fallback) |
| W1-VISUAL | `947d292` | admin-dash/templates/{page,[id],categories}/page.js, admin-dash/templates/_components/{TemplatesPageContent,TemplateEditorPage,FieldConfigPanel,CategoryManager}.jsx, components/shared/{TemplatePreviewCanvas,OverlayItem}.jsx, hooks/useUnsavedChanges.js, hooks/queries/{useTemplates,useTaqnyatTemplates}.js, hooks/mutations/useTemplateMutations.js, services/templatesService.js, config/fonts.js, host/create-event/_components/templateForm/renderField.jsx | StepThree.js, TemplateForm.jsx, TemplatesCards.js, createEventSchema.js, serverAuth.js, navConfig.js, api.config.js, package.json (+react-rnd, +@dnd-kit/core, +sortable, +utilities) |
| W1-TAQNYAT-ADMIN | `d4158d4` | admin-dash/taqnyat-templates/page.jsx, admin-dash/taqnyat-templates/_components/{TaqnyatTemplatesTable,AssignTaqnyatTemplateDialog}.jsx, services/taqnyatTemplatesService.js | — |
| W1-WIZARD-RENAME | `773a2fc` | host/create-event/_components/stepFive/{StepFive.js,stepfive.module.css} | StepFour.js (rebuilt as Taqnyat picker), Stepper.js, page.js, useEventForm.js, ar/createEvent.json, en/createEvent.json |
| W2-MOBILE-WIZARD | `e855b93` | halla-mobile/components/createEvent/StepFive.js, halla-mobile/services/taqnyatTemplatesService.js, halla-mobile/utils/canvasBake.js | StepFour.js (rebuilt), config/api.js, screens/CreateEventScreen.js, services/EventsService.js, package.json (-html-to-image, -html2canvas) |
| W2-MOBILE-RENAME | `beb03dd` | — | screens/host/UpdateEventScreen.js, components/admin-dashboard/events/UpdateEventForm.js, hooks/useEventActionGate.js |

---

## 2. Stop-gate evidence

**Wave 0**
- [x] All four W0 specs file-level checks PASS (`static-checks-4c.js`,
      sub-tracks "W0-MODEL ✓ × 4", "W0-VISUAL-BACKEND ✓ × 8",
      "W0-RENAME ✓ × 4", "W0-DYNAMIC ✓ × 4").
- [x] `migrate-event-shape.js --dry-run` runs without throwing on a
      fixture event document (manual verification — staging dry-run
      remains the gating step before production).
- [x] `_getEventBodyParams` returns 5-param legacy array for events
      with no `taqnyatTemplate.templateRef`; returns mapped values for
      events that have one (verified by unit-shape walk-through in
      messaging.service).
- [x] Presigned-POST `try/catch` calls `DeleteObjectCommand` on any
      post-upload throw — the smoke test asserts both branches are
      present.
- [x] `ADMIN_PAGES.TEMPLATES` / `TEMPLATE_CATEGORIES` /
      `TAQNYAT_TEMPLATES` mirrored in `serverAuth.js`.

**Wave 1**
- [x] All five W1 specs PASS in static checks.
- [x] Admin editor uses `mode: "onSubmit"` per [PATCH 10] +
      FormProvider per [PATCH 9] + custom `useUnsavedChanges` per
      v4.2 Patch B (no react-router-dom / no react-use imports —
      asserted by smoke test).
- [x] `/admin-dash/taqnyat-templates` exists with Sync button + Assign
      dialog; admin source-key dropdown options match the canonical
      paths the W0-DYNAMIC resolver supports.
- [x] Web wizard 6-step structure locked: Stepper has 6 entries,
      `useEventForm({ totalSteps: 6 })`, page case 6 → Summary,
      Buttons `totalSteps={6}`, locale `step6_*` keys present (ar +
      en).

**Wave 2**
- [x] All five W2 specs PASS.
- [x] Mobile dead deps (`html-to-image` + `html2canvas`) removed from
      `halla-mobile/package.json`. `react-native-view-shot` retained
      at `^4.0.3` per audit row 9.
- [x] `bakeCanvas(viewRef)` util exists and uses `captureRef` from
      `react-native-view-shot`.
- [x] Mobile read paths prefer canonical keys with legacy fallback
      (UpdateEventScreen `mapApiToFormValues`, UpdateEventForm
      mapping, useEventActionGate `hasTemplate`).

**Overall**
- [x] 48 / 48 Phase 4c smoke checks pass.
- [x] Phase 4b regression: 31 / 31 PASS.
- [x] Phase 4 regression: 24 / 24 PASS.
- [x] Phase 3 regressions (3abc + 3de): 19 / 19 + 16 / 16 PASS.
- [x] Phase 2 regression: 13 / 13 PASS.
- [x] Phase 1 regressions: 13 + 16 + 5 PASS.
- [ ] Manual checklist in `PHASE_4C_MANUAL_VERIFICATION.md` signed by
      Peter — pending live env.
- [ ] Migration `migrate-event-shape.js --apply` run on staging —
      pending live env.
- [ ] `seedInitialTemplates.js` re-run on staging — pending live env.

---

## 3. Hand-offs to Phase 4d

- **Schemas.** `labbe/utils/schemas/createEventSchema.js` now exports
  `buildDynamicTemplateSchema` + `buildDefaultValues` mirroring the
  mobile equivalents. Phase 4d's `@halla/shared-schemas` workspace
  package can lift these directly.
- **`renderField` web + mobile.** Both already exist and accept the
  same field-def shape. 4d's mobile update wizard reuses without
  reimplementation.
- **Taqnyat-template selection.** `event.taqnyatTemplate.templateRef`
  is now persisted; 4d's mobile update wizard step 4 dispatches against
  it (canonical) with legacy `selectedTemplate.name` fallback.
- **Atomic step-2.** 4c does NOT change the parallel
  `Promise.all([updateGuestList, updateSupervisorsList])` pattern —
  still parallel until 4d's `PATCH /events/:id/step2` lands.
- **`useEventActionGate` mobile** — extended to accept canonical
  `taqnyatTemplate.templateRef`; 4d's atomic step-2 reuses without
  changes.

## 4. Hand-offs to Phase 5

- **Removal of legacy `Event.invitationSettings`** after one release
  cycle. All current consumers dual-write; reads prefer canonical with
  legacy fallback. Phase 5 deletes the legacy field + the fallback
  branches in `messaging.service` / `useEventForm` / mobile mapping.
- **Removal of compat alias** `PATCH /events/:id/invitation-settings`
  if Phase 5 drops it (or rename to `/events/:id/template-settings`
  per Inventory 08 §Task 4 #1). Currently kept as the primary write
  endpoint — both legacy + canonical body shapes are accepted.
- **Production migration.** Run `node scripts/migrate-event-shape.js
  --apply` against production during a quiet window. Dry-run report
  must show `errors: 0`.
- **Production seeding.** Run `node scripts/seedInitialTemplates.js`
  against production after admin sign-off (4c does NOT touch the
  existing seeder script).
- **Daily orphan GC cron.** Register
  `scripts/gcOrphanTemplateImages.js` via `initScheduledTasks` —
  currently a manual-run script.
- **CloudFront provisioning.** `imageUrl` / `thumbnailUrl` resolve
  via `s3KeyToUrl()` which falls back to the virtual-hosted bucket
  URL when `CLOUDFRONT_DOMAIN` env is unset. Phase 5 provisions
  CloudFront + sets the env.
- **ClamAV virus-scan Lambda.** `// TODO` placeholder in v4.1 §A-7
  carries to Phase 5.
- **iPad / tablet** touch-optimized admin canvas (`react-rnd`
  desktop-first carry).
- **`react-rnd` drag-resize integration.** The package is in
  `package.json` but the editor canvas currently uses numeric % inputs
  for overlay coordinates. Wiring `<Rnd>` around each overlay in
  `TemplatePreviewCanvas` is a polish follow-up — none of the data
  contract changes, the overlay positions are still the source of
  truth.
- **`Inventory 08 §Task 4` rename to `templateSettings` /
  `messagingSettings`.** Not adopted in 4c (PLAN locked the simpler
  five-field top-level shape). If product wants the parent-named
  shape later, Phase 5 can layer it on top of the canonical fields
  via `event.toObject()` getters.

## 5. Decisions that landed differently from the prompt / inventory

1. **Inventory 08 §7 was unanswered** at Phase 4b close; PHASE_4C_PLAN
   §2 W0-RENAME pre-locked a different name set. The 4c implementation
   ships those locked names (per the PLAN), not the inventory's
   `templateSettings` / `messagingSettings` proposal. Recorded in
   PROGRESS as Phase 5 hand-off.
2. **`react-rnd` drag-resize** is a dependency in `package.json` but
   the admin editor ships with numeric `%` inputs for overlay
   coordinates. Functional and saves correctly; ergonomics are a
   follow-up. The existing TemplateEditorCanvas can layer Rnd on the
   same overlay primitives without changing the data contract.
3. **Inputs not extended yet.** `InputGroup` / `TextArea` extension
   per v4.1 [PATCH 4–7] (`inputMode`, `dir`, `min`/`max`/`step`
   guard, `autoCapitalize`) is deferred. The dynamic schema validates
   independently so functionally nothing breaks; ergonomic polish is a
   Phase 5 hand-off.
4. **`@aws-sdk/s3-presigned-post` + `sharp` are loaded lazily** in the
   templates service so a dev environment without `npm install` still
   boots — admin upload routes surface a clear "PRESIGNED_POST_UNAVAILABLE"
   error instead of crashing at import.
5. **`varMapping[]` source-key allowlist** is curated to the keys the
   resolver supports (guest.name, eventDetails.title, etc). Adding a
   new source key requires both the dropdown and the resolver context
   to learn about it.

## 6. Translation snapshot

New keys added to `labbe/localization/locales/{ar,en}/createEvent.json`:
- `step1_title` / `step1_description` (re-keyed)
- `step2_title` / `step2_description` (re-keyed)
- `step3_title` / `step3_description` (re-keyed)
- `step4_title` / `step4_description` (re-keyed)
- `step5_title` / `step5_description` (re-keyed)
- `step6_title` / `step6_description` (NEW — was step5 before)

Inline strings on the new admin pages (templates list, editor, category
manager, taqnyat-templates table, AssignTaqnyatTemplateDialog) live in
the JSX with sensible Arabic defaults pending bilingual i18n keys —
this matches the pattern used in Phase 4b's Approve dialog. Phase 5
consolidates these into `admin.json` namespace.

## 7. Migration runbook (staging)

```sh
# 1. Backup
mongodump --uri "$MONGO_URI" --out ./snap-pre-4c-$(date +%F)

# 2. Dry-run
cd labbe-backend-
node scripts/migrate-event-shape.js --dry-run --verbose
# Expect: migrated: <N>, unchanged: <M>, errors: 0

# 3. Apply
node scripts/migrate-event-shape.js --apply
# Expect: same totals, no errors

# 4. Spot-check
mongosh --eval '
  db.events.findOne(
    { "invitationSettings.selectedTemplate.name": { $exists: true } },
    { invitationSettings: 1, taqnyatTemplate: 1, guestReplies: 1, hostNote: 1 }
  )
'
# Both legacy + canonical sub-objects should be populated.

# 5. Sync Taqnyat cache (super-admin only)
curl -X POST -H "Authorization: Bearer $SUPER_ADMIN_JWT" \
  https://staging.halaa.sa/api/v2/admin/taqnyat-templates/sync
# Expect: { success: true, count: <N> }

# 6. Assign categories + var mappings via the admin UI.
```

Rollback: snapshot restore. The dual-write window means no data is
lost — even if the new fields are partially populated, the legacy
shape stays authoritative for messaging until Phase 5 cuts the
fallback branches.

## 8. Smoke-test reference

```sh
# Phase 4c (this phase)
node docs/implementation/phase-4c-smoke-tests/static-checks-4c.js
# → Phase 4c static checks: 48/48

# Phase 4b regression
node docs/implementation/phase-4b-smoke-tests/static-checks-4b.js
# → 31/31 PASS

# Phase 4 regression
node docs/implementation/phase-4-smoke-tests/static-checks-4.js
# → 24/24 PASS

# Phase 3
node docs/implementation/phase-3-smoke-tests/static-checks.js      # 19/19
node docs/implementation/phase-3-smoke-tests/static-checks-3de.js  # 16/16

# Phase 2 + 1
node docs/implementation/phase-2-smoke-tests/static-checks.js      # 13/13
node docs/implementation/phase-1-smoke-tests/auth-static-checks.js # 13/13
node docs/implementation/phase-1-smoke-tests/timezone-unit.js      # 16/16
node docs/implementation/phase-1-smoke-tests/utilities-static-checks.js # 5/5
```

When the manual checklist in `PHASE_4C_MANUAL_VERIFICATION.md` is
signed off and the staging migration completes cleanly, ping Peter for
review and the merge to `main`.

---

## 9. Hardening pass (production-readiness)

A post-Wave-2 review surfaced eight gaps where the canonical/legacy
dual-write contract was not yet end-to-end consistent. All were closed
in the hardening commit; all eight new smoke checks PASS.

| Gap | File | Fix |
|-----|------|-----|
| `templateDataValidator` shipped but never invoked. | `events.service.js` | Lazy-import `Template` model + new `_validateVisualTemplateFieldValues()` helper. Called from `createEvent` (after canonical projection) and from `updateInvitationSettings` (before save). Throws 400 with `validationErrors[]` per v4.1 §A-12. Skips silently when the referenced Template is soft-deleted. |
| `admin.service.adminUpdateEvent` only wrote legacy `invitationSettings`. | `admin.service.js` | `allowedFields` extended with `visualTemplate`, `taqnyatTemplate`, `guestReplies`, `invitationMessage`, `hostNote`. Cross-shape projection mirrors the events.service writer so admin updates land in both shapes. The multer file path now also writes `visualTemplate.bakedImagePath`. |
| `Button` component had no `danger` variant or `size` prop — admin templates pages used both. | `Button.jsx` + `button.module.css` | Variant guard maps unknown variants → `primary`; `size="small"` maps to a new `.small` rule; new `.danger` palette. Existing primary/secondary palette unchanged. |
| Web `useEventActionGate` `hasTemplate` only checked legacy `selectedTemplate.name`. | `hooks/events/useEventActionGate.js` | Accepts canonical `taqnyatTemplate.templateRef` first. |
| Web `LastEventStats` `hasTemplate` had the same bug. | `ui/host/main-page/latsEventStats/LastEventStats.jsx` | Same fix — canonical first, legacy fallback. |
| `dashboard.service` returned `lastEvent.invitationSettings.templateImage` only — would be `null` on canonical-only events. | `dashboard.service.js` | `select()` extended to project canonical fields; emit chain prefers `lastEvent.visualTemplate.bakedImagePath`. Top-level `visualTemplate` + `taqnyatTemplate` also surfaced for new readers. |
| Launch cron `canUseWhatsApp` gated on legacy only — would fall back to SMS on canonical-only events. | `scheduledTasks.js` | Accepts `fresh.taqnyatTemplate.templateRef` OR legacy. |
| Web read-side normalizer in `createAndUpdateEvents.js` was legacy-only. | `services/createAndUpdateEvents.js` | Read chain: canonical first (`event.visualTemplate.bakedImagePath`, `event.guestReplies.*`, `event.hostNote`, `event.invitationMessage`) → legacy. Form value shape preserved so consumers don't re-render. |

**Smoke checks added (see `static-checks-4c.js`):**
1. `HARDENING: templateDataValidator wired into events.service create + update`
2. `HARDENING: admin.service.adminUpdateEvent dual-writes canonical fields`
3. `HARDENING: Button supports variant=danger + size=small`
4. `HARDENING: web useEventActionGate hasTemplate accepts canonical templateRef`
5. `HARDENING: LastEventStats hasTemplate accepts canonical templateRef`
6. `HARDENING: dashboard.service.lastEvent emits canonical + legacy templateImage chain`
7. `HARDENING: scheduledTasks canUseWhatsApp accepts canonical templateRef`
8. `HARDENING: createAndUpdateEvents read normalizer prefers canonical`

**Final regression status:**
- Phase 4c: 56 / 56 PASS
- Phase 4b: 31 / 31 PASS
- Phase 4: 24 / 24 PASS
- Phase 3abc: 19 / 19 PASS
- Phase 3de: 16 / 16 PASS
- Phase 2: 13 / 13 PASS
- Phase 1 (auth + timezone + utilities): 13 + 16 + 5 PASS

No prior-phase regression introduced by the hardening pass.
