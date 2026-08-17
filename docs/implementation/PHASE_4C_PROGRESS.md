# Phase 4c — Progress

**Branch:** `claude/implement-phase-4c-9WdgB`
**Plan:** `PHASE_4C_PLAN.md` + v4.1/v4.2 absorbed by reference.

| Sub-track | Status | Commit | Notes |
|-----------|--------|--------|-------|
| W0-MODEL | done | `28b562c` | TaqnyatTemplateModel + sync service/routes + daily 03:30 cron |
| W0-VISUAL-BACKEND | done | `401945b` | TemplateModel + TemplateCategoryModel + admin CRUD + presigned-POST + sharp + orphan GC + permissions + AuditLog enum |
| W0-RENAME | done | `ae2b97f` | EventModel canonical sub-objects + dual-write services + migration script |
| W0-DYNAMIC | done | `b2e9107` | Dynamic `_getEventBodyParams` + 5-param legacy fallback + canonical reply fallback chain |
| W1-VISUAL | done | `947d292` | Admin templates editor + sidebar + dynamic StepThree + dynamic TemplateForm |
| W1-TAQNYAT-ADMIN | done | `d4158d4` | Admin Taqnyat-templates page + Sync + Assign dialog |
| W1-WIZARD-RENAME | done | `773a2fc` | 6-step wizard + StepFour rebuilt as Taqnyat picker + StepFive (NEW) |
| W2-MOBILE-WIZARD | done | `e855b93` | Mobile 6-step wizard + Taqnyat picker + canvasBake util + dead-dep removal |
| W2-MOBILE-RENAME | done | `beb03dd` | Mobile invitationSettings consumers read canonical first |
| HARDENING | done | (next) | templateDataValidator wired + admin dual-write + Button danger/small + LastEventStats / useEventActionGate (web) / scheduledTasks / dashboard.service / createAndUpdateEvents canonical-first |

## Smoke tests

- `docs/implementation/phase-4c-smoke-tests/static-checks-4c.js` —
  **56/56 PASS** at the close of the hardening pass (48 sub-track
  checks + 8 hardening checks).
- Phase 4b regression: 31/31 PASS.
- Phase 4 regression: 24/24 PASS.
- Phase 3 regressions (3abc + 3de): 19/19 + 16/16 PASS.
- Phase 2 regression: 13/13 PASS.
- Phase 1 regressions: 13 + 16 + 5 PASS.

## Audit deltas honored from PLAN §0

- `react-native-view-shot` already installed (4.0.3) → no install step;
  dead `html-to-image` + `html2canvas` removed in W2-MOBILE-WIZARD.
- `_getEventBodyParams` returns 5 params, not 4 → preserved in
  W0-DYNAMIC's legacy fallback.
- Mobile StepThree `renderField` already exists per Phase 4 era → only
  thumbnail-grid wiring + canonical-key plumbing in W2-MOBILE-WIZARD
  (the renderer was untouched).
- Mobile `utils/timeFormat.js` already exists → no new file.
- Mobile `utils/schemas/createEventSchema.js` already has
  `buildDynamicTemplateSchema` and `buildDefaultValues` → reused, not
  recreated.
- TemplateModel + TemplateCategoryModel + TaqnyatTemplateModel + admin
  routes were entirely greenfield — built from scratch in W0-MODEL +
  W0-VISUAL-BACKEND.
- StepThree on web had a hardcoded 3-template demo array → dropped in
  W1-VISUAL, wired to `templatesService.getTemplates`.
- StepFour fetched Taqnyat direct passthrough → migrated to backend
  cache in W1-WIZARD-RENAME (and W2-MOBILE-WIZARD on mobile).

## Inventory 08 §7 lock notes

§7 had six open questions; PHASE_4C_PLAN §2 W0-RENAME already locked the
final shape so 4c proceeded with these names:
- `visualTemplate.{templateRef, fieldValues, bakedImagePath}` (top-level)
- `taqnyatTemplate.templateRef` (top-level)
- `guestReplies.{onAttend, onAbsent, onExpected}` (top-level)
- `invitationMessage` + `hostNote` (both top-level)
- `invitationSettings.*` retained AS-IS for one release cycle dual-write.

The Inventory 08 proposed names (`templateSettings`, `messagingSettings`)
were NOT adopted in 4c — the PLAN's locked shape ships the
sub-object split as five named top-level fields rather than two named
parents. Phase 5 hand-off notes record this as the canonical naming
going forward.

## Notes for follow-ups (handed off to Phase 4d / 5 in REPORT)

- Backend deps to install at deploy: `sharp`, `@aws-sdk/s3-presigned-post`.
- Web deps to install at deploy: `react-rnd`, `@dnd-kit/core`,
  `@dnd-kit/sortable`, `@dnd-kit/utilities`.
- Mobile lockfile regen needed after dead-dep removal.
- Migration `scripts/migrate-event-shape.js --apply` runs on staging at
  the 4c stop gate; production run is a Phase 5 hand-off.
- `scripts/gcOrphanTemplateImages.js` is manual-run for now; Phase 5
  registers it in `initScheduledTasks`.
- `react-rnd` drag-resize wrapping around overlays in
  `TemplateEditorCanvas` is a follow-up — current editor uses numeric %
  inputs which are functional but less ergonomic.
