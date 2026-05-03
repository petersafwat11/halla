# Halla — Phase 4 Extension Master Plan (4b / 4c / 4d) — Rev 4 (Audit-Grounded)

**Status.** Ready for implementation. Decisions locked. Per-phase plans drafted in `PHASE_4B_PLAN.md` / `PHASE_4C_PLAN.md` / `PHASE_4D_PLAN.md`. Inventory 08 folded into Phase 4b Wave −1.

**Supersedes.** `halla-phase-4-extension-plan-rev3.md` (the prompt-bundle version with placeholder hypotheses) and `halla-phase-4-extension-plan.md` (the original "Rev 1" decision draft).

**Why Rev 4.** A live audit of `labbe-backend-/`, `labbe/`, and `halla-mobile/` (May 3 2026) produced a list of deltas where the prompt assumptions and the real codebase diverge. Examples: the admin-dash update-event "stub" is actually a 392-line duplicate; `_getEventBodyParams` returns 5 hardcoded params (not 4); `react-native-view-shot` is already installed; the mobile update-event screen already exists at 407 lines; `TemplateModel` and `TemplateCategoryModel` are completely missing on the backend; web has no `setup-password/[token]` route at all. Each per-phase plan logs its delta table in §0; this master plan stays high-level and references them.

**Background.** Phase 4 closed the 14 mobile-parity / admin-gap items from `PHASE_4_FINAL_REPORT.md`. Eight inventory passes (01–08) mapped the correctness, tier-consistency, and template-system work that was outside the original 131-finding audit. Phase 4b/4c/4d closes those gaps and lands the visual + Taqnyat template system end-to-end across all roles on web and mobile.

**Guiding principle (per Peter).** **Unification over duplication.** ONE update-event page, ONE single-event page, ONE wizard — used by host, admin, whitelabel admin, whitelabel moderator on web AND mobile. Role-aware customizations live as branches inside the existing page. No mobile work deferred for any role.

**Out of scope.** Phase 5 (audit log + edges + polish), real Moyasar integration, test infrastructure, new features.

---

## 1. The three sub-phases

| Phase | Name | Estimated duration | Per-phase plan | Key deliverable |
|-------|------|--------------------|----------------|-----------------|
| 4b | Tier consistency + UX gates (incl. Inventory 08 pre-flight) | 1.5 weeks | `PHASE_4B_PLAN.md` | Single update-event + single event-detail page on web (mobile carries forward existing screen). Backend RBAC includes whitelabel tier. Capacity guard, schedule min-date, failure UI + retry, partial-failure banner. Whitelabel approval emits setup-password email via confirm popup. Web setup-password page **built from scratch** (was missing). Setup-password mutations wired. W2-STAFF endpoint + UI re-wire closed. **Output:** Inventory 08 rename mapping locked. |
| 4c | Template system unification | 2.5–3 weeks | `PHASE_4C_PLAN.md` | Backend `TemplateModel` + `TemplateCategoryModel` + `TaqnyatTemplateModel` (all greenfield). Admin Visual templates page + Admin Taqnyat templates page. Web wizard step 3 wired to DB; dynamic `TemplateForm`. Mobile step 3 wired; canvas-bake pipeline via `react-native-view-shot` (already installed). Naming refactor across web/mobile/DB per inventory 08. `_getEventBodyParams` becomes dynamic (5-param legacy fallback preserved). Absorbs `template-system-refactor-plan-v4.1.md` + v4.2 patches as the implementation reference for the visual editor. |
| 4d | Mobile update flow + create-event correctness + shared schemas | 1 week | `PHASE_4D_PLAN.md` | Mobile update-event screen relocated + unified across roles + new step structure (5 steps + summary). Mobile create-event field-name verification (round-trip). Shared `@halla/shared-schemas` workspace package via npm workspaces. Atomic `PATCH /events/:id/step2` endpoint with topology-aware fallback. |

**Total estimated duration:** 4.5–5.5 weeks.

**Sequencing.** 4b independent → 4c after 4b stop gate (Inventory 08 must be locked) → 4d after 4c stop gate.

---

## 2. The audit-grounded plumbing changes

These deltas to the original prompts are baked into the per-phase plans. The full delta tables live in each plan's §0; here is the consolidated list.

| Delta | Phase | Per-phase note |
|-------|-------|----------------|
| Admin update-event "stub" is a 392-line duplicate. | 4b | W1-UNIFY **deletes** it, doesn't fill it in. |
| `useSingleEventStats` already polls (Phase 3d.4) — no import swap needed. | 4b | W1-UNIFY drops the import-swap task; verifies consumers only. |
| `_getEventBodyParams` returns 5 params, not 4. | 4c | W0-DYNAMIC's legacy fallback preserves the 5-param shape. |
| `EventFailureBanner` already exists (Phase 3c.4). | 4b | Reuse; W1-GATE-FAIL adds the **partial-failure** sibling banner. |
| `useAuthMutation.js` missing `validateSetupToken` + `setupPassword`. | 4b | W1-WL-EMAIL adds them. |
| Web `/setup-password/[token]` page MISSING entirely. | 4b | W1-WL-EMAIL builds the page from scratch. |
| Whitelabel detail page has no explicit Approve button — Activate/Suspend toggle only. | 4b | W1-WL-EMAIL adds the Approve action. |
| `events.service.js` `getEventById` checks ownership only; route restrictTo lacks whitelabel tier. | 4b | W0-RBAC fixes both. |
| Capacity guard on `updateGuestList` MISSING (despite `checkGuestLimit` middleware). | 4b | W0-RBAC adds it inside the service. |
| `messaging.service.js` `scheduleBulkSend` min-date validation MISSING. | 4b | W0-RBAC adds it. |
| `GET /events/:eventId/staff-tokens` MISSING. | 4b | W0-STAFF lands it. |
| `admin.service.js` `updateWhitelabelStatus` doesn't send email; `User.createPasswordSetupToken()` exists; template exists. | 4b | W0-EMAIL stitches them. |
| `TemplateModel` + `TemplateCategoryModel` MISSING (greenfield). | 4c | W0-VISUAL-BACKEND builds per v4.1 §C, §A-7, §A-10. |
| Admin templates routes MISSING. | 4c | W0-VISUAL-BACKEND + W1-VISUAL build from scratch. |
| StepThree on web has hardcoded 3-template array. | 4c | W1-VISUAL drops + wires to `templatesService.getTemplates`. |
| StepFour fetches Taqnyat templates direct passthrough (no backend cache). | 4c | W0-MODEL adds the cache; W1-WIZARD-RENAME rewires. |
| Sidebar nav has no `templates` entry. | 4c | W1-VISUAL adds entries (templates, template_categories, taqnyat_templates) to `permissions.js` + `serverAuth.js` + `navConfig.js`. |
| Mobile `react-native-view-shot` is **already installed** (4.0.3). | 4c | W2-MOBILE-WIZARD drops the "install" step; removes dead `html-to-image` + `html2canvas`. |
| Mobile StepThree already has dynamic `renderField` (Phase 4 era). | 4c | W2-MOBILE-WIZARD's StepThree is verification + thumbnail-grid wiring. |
| Mobile `screens/host/UpdateEventScreen.js` already exists (407 lines, 4 steps). | 4d | W1-MOBILE-UPDATE relocates + restructures to 5 steps + role-aware branches. |
| Mobile `useUpdateInvitationSettings`, `useUpdateLaunchSettings`, etc. mutations MISSING (services exist). | 4d | W1-MOBILE-UPDATE adds wrappers. |
| `useEventActionGate` MISSING on both web and mobile. | 4b | Built in W1-GATE-FAIL (web) + W2-POLL-FAIL (mobile). |
| No `specs/` directory in backend. Project uses `docs/implementation/phase-N-smoke-tests/` Node IIFE. | 4b/4c/4d | All smoke tests use the established convention. |
| No CI configured. | 4d | Schema-drift script ships as a manual command; CI wiring is a Phase 5 hand-off. |
| No workspace tooling at root. | 4d | W0-SCHEMAS introduces npm workspaces (matches the project's existing `package-lock.json` per sub-project). |
| MongoDB topology not verified (replica vs standalone). | 4d | W0-ATOMIC ships a topology-aware fallback (transaction → ordered writes with compensation). |

---

## 3. Decisions locked

(Rev 3 decisions stand. Restated for self-containment + 4b/4c/4d-specific tie-breakers from each plan.)

### Master decisions (D1–D11)

| # | Decision | Locked answer |
|---|----------|---------------|
| D1 | Whitelabel-admin stats scope | Tenant-wide |
| D2 | Whitelabel update-event page | NO new page — unified single page on web AND mobile |
| D3 | Taqnyat var mapping storage | Separate `TaqnyatTemplateModel` |
| D4 | Wizard structure for Taqnyat picker | Step 4 (after visual template) — backend-cached, no longer direct passthrough |
| D5 | Whitelabel approval email dispatch | Confirm popup on Approve → atomic status update + email send |
| D6 | Web/mobile schema strategy | Shared package (`@halla/shared-schemas`); 4d migrates create + update event; ledger note for the rest |
| D7 | scheduleDate/Time in create wizard | Keep post-creation only |
| D8 | Manual retry button visibility | Visible to anyone with single-event-page access |
| D9 | Partial-failure warning threshold | Any failed |
| D10 | Field locks during `live` events | Allow guest-list additions only; everything else locked |
| D11 | Admin/whitelabel create-event | Use host wizard with role-aware branches |

### Phase 4b tie-breakers

- **D4b-1.** Inventory 08 = Wave −1 of 4b (single docs commit, half-session). Output: `docs/inventory/phase-4-extension/08-event-shape-rename-mapping.md`. Peter locks before 4c.
- **D4b-2.** Old `PATCH /events/:id/invitation-settings` stays untouched in 4b.
- **D4b-3.** Schedule min-date lead = 48h (`SCHEDULE_MIN_LEAD_HOURS`, env-overridable). Error codes: `SCHEDULE_TOO_SOON`, `GUEST_LIST_BELOW_CONFIRMED`.
- **D4b-4.** Manual retry click is role-agnostic at the UI (RBAC at the backend).

### Phase 4c tie-breakers

- **D4c-1.** Wizard steps (locked): 1 details / 2 guest+staff / 3 visual / 4 Taqnyat / 5 messaging+replies+note / 6 summary.
- **D4c-2.** Backend rename = mandatory dual-write for one release cycle.
- **D4c-3.** RBAC: super_admin/admin = FULL on templates/template_categories/taqnyat_templates; moderator = EDIT on templates, VIEW on categories, NONE on Taqnyat; whitelabel/host = NONE.
- **D4c-4.** S3 presigned-POST upload (5 MB cap, image/jpeg|png|webp) + sharp thumbnails + orphan cleanup (inline + daily GC).
- **D4c-5.** New deps: `react-rnd`, `@dnd-kit/sortable`, `@aws-sdk/client-s3`, `@aws-sdk/s3-presigned-post`, `sharp`. **No** `react-router-dom`, `react-use`, `@shopify/react-native-skia`.
- **D4c-6.** Admin editor uses `useForm({ mode: "onSubmit" })` + custom `useUnsavedChanges` hook (v4.2 Patch B).
- **D4c-7.** Naming refactor scope = inventory 08 §Task 4 only.

### Phase 4d tie-breakers

- **D4d-1.** Workspace tool = npm workspaces. Package = `@halla/shared-schemas`. Path = `packages/shared-schemas/`. Language = JS.
- **D4d-2.** Atomic endpoint = `PATCH /events/:id/step2` accepting both `supervisorsList` (web naming) and `staffList` (mobile naming) — normalize at the controller. Old endpoints kept compat one cycle.
- **D4d-3.** Transaction fallback to compensation on standalone Mongo topology.
- **D4d-4.** Mobile update wizard role gating inline (no per-role screens).
- **D4d-5.** Schema-drift check = `scripts/check-schema-drift.sh`, manual.
- **D4d-6.** Backend Zod adoption deferred to Phase 5.

---

## 4. Sequencing & gating

```
Phase 4b
  Wave −1: INV08 (single docs commit)
       ↓ Peter locks the rename mapping
  Wave 0:  W0-RBAC → W0-STAFF → W0-EMAIL  (backend, sequential on shared files)
       ‖
  Wave 1:  W1-UNIFY ‖ W1-UPD ‖ W1-GATE-FAIL ‖ W1-WL-EMAIL ‖ W1-IMG-PATH  (web, parallel on disjoint files)
       ‖
  Wave 2:  W2-POLL-FAIL ‖ W2-STAFF  (mobile, parallel)
       ↓
  Stop gate (web + mobile + backend smoke + manual)

Phase 4c (gated on 4b stop gate + INV08 lock)
  Wave 0:  W0-MODEL ‖ W0-VISUAL-BACKEND  →  W0-RENAME → W0-DYNAMIC  (backend)
       ↓
  Wave 1:  W1-VISUAL ‖ W1-TAQNYAT-ADMIN ‖ W1-WIZARD-RENAME  (web)
       ‖
  Wave 2:  W2-MOBILE-WIZARD ‖ W2-MOBILE-RENAME  (mobile)
       ↓
  Stop gate (incl. dry-run migration + test send + legacy fallback)

Phase 4d (gated on 4c stop gate)
  Wave 0:  W0-ATOMIC ‖ W0-SCHEMAS  (backend + workspace)
       ↓
  Wave 1:  W1-MOBILE-UPDATE ‖ W1-MOBILE-CREATE-VERIFY  (mobile)
       ‖
  Wave 2:  W1-WEB-ATOMIC  (web; named "Wave 2" to keep numbering even though it's a single track)
       ↓
  Stop gate (atomicity, schema-drift exit 0, all 4 roles edit on web + mobile)
```

Sub-agent parallelism rule: parallel-safe ⇔ disjoint files + no dependency. The coordinator owns merge order and tracks file ownership in each phase plan's §9 conflict map.

---

## 5. Per-phase document set

**Per phase:**
- `PHASE_4{B|C|D}_PLAN.md` — drafted alongside this rev (this docs commit lands them).
- `PHASE_4{B|C|D}_PROGRESS.md` — written during implementation.
- `PHASE_4{B|C|D}_REPORT.md` — written at phase end.
- `PHASE_4{B|C|D}_MANUAL_VERIFICATION.md` — drop with the plan.

**Per-phase smoke tests:**
- `docs/implementation/phase-4{b|c|d}-smoke-tests/` — Node IIFE static checks.

**Cross-phase:**
- `docs/implementation/IMPLEMENTATION_LEDGER.md` — updated at each phase end.
- `docs/inventory/phase-4-extension/01..08-*.md` — historical reference; archived after 4d closes.

**External references absorbed:**
- `docs/template-system-refactor-plan-v4.1.md` + `docs/template-system-refactor-plan-v4.2.md` — implementation reference for Phase 4c W0-VISUAL-BACKEND + W1-VISUAL.

---

## 6. What's not in scope (intentional)

- **Phase 5** (audit log activation + edges + polish) — runs after 4d.
- **Real Moyasar integration** — Phase 1 stub stands.
- **Test infrastructure (Jest / Detox / Maestro)** — manual + Node IIFE static checks.
- **New features** beyond inventory-surfaced gaps + v4.1/v4.2 scope.
- **Server-side admin-list search** (Phase 4 anomaly) — Phase 5.
- **Universal links / apple-app-site-association / assetlinks.json** — Phase 5.
- **Admin exports `saveBlobAndShare` parity** — Phase 5.
- **CI wiring** for the schema-drift script — Phase 5.

---

## 7. Phase 5+ ledger notes

To be appended to `IMPLEMENTATION_LEDGER.md` at 4d close (consolidated from per-phase `Hand-offs to Phase 5`):

- **Shared Zod-schema package — remaining migrations** (auth, subscription, addon, plan, ticket, vendor, whitelabel).
- **Removal of deprecated `Event.invitationSettings`** field after one release cycle.
- **Removal of compat endpoints** (`PATCH /events/:id/invitation-settings`, `/guest-list`, `/staff-list`).
- **Run `scripts/migrate-event-shape.js` on production** (4c runs on staging only).
- **Run `scripts/seedInitialTemplates.js` on production**.
- **Register `scripts/gcOrphanTemplateImages.js` as a daily cron**.
- **CloudFront provisioning** for `imageUrl` + S3 cache-control headers.
- **ClamAV virus-scan** Lambda for uploaded template images.
- **iPad/tablet** touch-optimized admin canvas (`react-rnd` desktop-first carry).
- **Detox / Maestro mobile UI test baseline**.
- **CI integration** for `scripts/check-schema-drift.sh`.
- **Backend Zod adoption** for request validation.
- **Server-side admin-list search**.
- **Audit-log-everywhere** on RSVP + check-in (Phase 3de hand-off).
- **AuditLog enum extension** for `plan` / `addon` (Phase 2 hand-off).
- **Run `backfill-guest-access-token-expiry.js --apply`**.
- **Universal links** for email-to-app deep linking.
- **Admin exports → `saveBlobAndShare`** parity (Phase 4 hand-off).

---

## 8. Approval gate

- The three per-phase plans (`PHASE_4{B|C|D}_PLAN.md`) are the authoritative implementation contracts.
- This Rev 4 master plan is the high-level continuity document.
- Inventory 08 runs as Wave −1 of Phase 4b. Peter locks the rename mapping before 4c kickoff.
- Each phase's stop gate (per-phase plan §7) is the merge gate.
- After 4d's overall stop gate, ping Peter for the Phase 5 kickoff.

---

## 9. Quick reference — finding-ID coverage

| Inventory file | Finding(s) | Closed by |
|----------------|------------|-----------|
| 01 §5.1, §7 gap 4 | Stats RBAC for whitelabel tier | 4b W0-RBAC |
| 01 §7 gap 4 | Mobile single-event polling consumer | 4b W2-POLL-FAIL (already verified in Phase 4 W1-STATS) |
| 02 §gap-1 | Mobile create-event field-name normalization | 4d W1-MOBILE-CREATE-VERIFY |
| 02 §gap-2 | Wizard scheduleDate/Time control | Out of scope (D7) |
| 02 §gap-5 | Web/mobile schema unification | 4d W0-SCHEMAS |
| 03 §gap-1 | Mobile update event wizard | 4d W1-MOBILE-UPDATE |
| 03 §gap-2 | Capacity-reduce guard | 4b W0-RBAC |
| 03 §gap-3 | Launch settings in update wizard | 4b W1-UPD |
| 03 §gap-5 | Multi-section atomicity in update step 2 | 4d W0-ATOMIC + W1-WEB-ATOMIC |
| 04 §gap-1 | Schedule pipeline gates (min-date) | 4b W0-RBAC |
| 04 §gap-2 | Failure UI on event detail | 4b W1-GATE-FAIL + W2-POLL-FAIL |
| 04 §gap-4 | Dynamic `_getEventBodyParams` | 4c W0-DYNAMIC |
| 04 §gap-5 | Partial-failure warning | 4b W1-GATE-FAIL + W2-POLL-FAIL |
| 05 critical-1 | Web wizard StepThree DB-driven | 4c W1-VISUAL |
| 05 critical-2 | Dynamic `_getEventBodyParams` | 4c W0-DYNAMIC |
| 05 critical-3 | TaqnyatTemplateModel + admin CRUD | 4c W0-MODEL + W1-TAQNYAT-ADMIN |
| 05 mobile | Mobile StepThree DB-driven + canvas-bake | 4c W2-MOBILE-WIZARD |
| 06 §5 GAP 5 | Whitelabel setup-password admin dispatch | 4b W0-EMAIL + W1-WL-EMAIL |
| 07 Task 1 | Setup-password page mutations live bug | 4b W1-WL-EMAIL |
| 07 Task 4 | Mobile dead `html-to-image` dep | 4c W2-MOBILE-WIZARD |
| 08 (NEW, Wave −1 of 4b) | Event.invitationSettings rename mapping | 4b INV08 → 4c W0-RENAME |

---

When everything is green at 4d's overall stop gate, Phase 5 starts.
