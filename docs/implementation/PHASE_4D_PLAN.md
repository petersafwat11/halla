# Phase 4d — Plan (Mobile Update Flow + Create-Event Correctness + Shared Schemas)

**Branch:** `claude/phase-4b-4c-4d-plans-Sajqf` (this docs commit) → implementation lands on `implementation/phase-4d-mobile-update-shared-schemas`.
**Cut from:** post-Phase-4c head (tag `phase-4c-merged`).
**Source of truth:** `docs/implementation/halla-phase-4-extension-plan.md` (Rev 4) §2 Phase 4d + the Phase 4d prompt.

> **Why this plan reads differently from the prompt.** A live audit (May 3 2026) found that `halla-mobile/screens/host/UpdateEventScreen.js` already exists at **407 lines** — Phase 4 carry-forward had a host-only update wizard. The 4d prompt's W1-MOBILE-UPDATE assumes greenfield ("New: `halla-mobile/screens/update-event/{StepOne,…}.js`"). The work is **consolidate + unify across roles + integrate atomic step-2 + add Step 5 from 4c structure**, not "build from scratch".

---

## 0. Pre-flight verification

| # | Check | Result vs prompt assumption | Adjustment |
|---|-------|-----------------------------|------------|
| 1 | `halla-mobile/screens/update-event/` directory | **MISSING.** | The mobile update wizard exists at `screens/host/UpdateEventScreen.js` (407 lines, 4 steps, reuses createEvent components). W1-MOBILE-UPDATE relocates and consolidates per 4d prompt's file structure. |
| 2 | Mobile update wizard supports admin / whitelabel | **PARTIAL.** Screen reads `useAuthStore` for the current user (line 17 import), reuses createEvent components — but no role-aware branches and the navigator entry is registered only as `HostUpdateEventScreen` (`AppNavigator.js:27, 255`). | W1-MOBILE-UPDATE adds role-aware branches inline (admin can edit any event; whitelabel can edit any tenant event). Renames the navigator entry to a single `UpdateEventScreen`. |
| 3 | Mobile update wizard step count | **4 steps today.** Phase 4c locks **6 steps** for web (event details / guest+staff / visual / Taqnyat / messaging / summary). Mobile parity = 5 visible steps + summary. | W1-MOBILE-UPDATE adds the Taqnyat-picker step (new step 4) and the messaging step (new step 5), reusing 4c's mobile components. |
| 4 | Mobile create-event field-name canonicalization | **PARTIAL.** `halla-mobile/utils/schemas/createEventSchema.js` still defines flat `templateBrideName` / `templateGroomName` / `templateGuestMessage` / `templateClosingMessage` / `templatePrimaryColor` / `templateFont` keys. `screens/host/UpdateEventScreen.js:73-79` unpacks `inv.visualTemplate?.data?.{messageText|brideName|groomName|guestMessage|endMessage}` into these flat keys. **4c W2-MOBILE-RENAME** is supposed to fix this. | W1-MOBILE-CREATE-VERIFY's job is verification + any residual fix-ups. **If `halla-mobile/components/createEvent/StepThree.js:34-149` already emits canonical `field.key` payload (audit confirmed it does — line 199 `visualTemplate.data: converted`), the schema's flat keys are legacy unpacking only and don't propagate to the API.** Verify round-trip; document. |
| 5 | `halla-mobile/utils/schemas/updateEventSchema.js` | **MISSING.** Update reuses createEventSchema today (no separate update schema). | W0-SCHEMAS creates `updateEventSchema` from the post-4c canonical shape. |
| 6 | Workspace tooling (yarn workspaces / pnpm / turbo / lerna) | **None visible at root.** `/home/user/halla/` has no `package.json`, no `pnpm-workspace.yaml`, no `lerna.json`. The three sub-projects (`labbe`, `labbe-backend-`, `halla-mobile`) each have their own `package.json` and lockfiles, no inter-project linking. | W0-SCHEMAS introduces a workspace. Choice = **npm workspaces** (zero-friction; `npm` is already what each project's lockfile expects via `package-lock.json` for backend and labbe; mobile uses lockfile). Document in PROGRESS before any code lands. |
| 7 | `useEventActionGate` hook (mobile) | **EXISTS (Phase 4b W2-POLL-FAIL).** | Reuse for live-event lockout UX in W1-MOBILE-UPDATE. |
| 8 | Mobile mutations for invitation/launch | **PARTIAL.** `halla-mobile/hooks/mutations/useEventMutations.js` has `useUpdateEvent`, `useUpdateGuestList`, `useSubmitTemplate`, `useNotifyStaff`, `useSendTestMessage`, `useSendBulkInvitations`, `useRetryFailed`, `useSendReminder` — **MISSING:** `useUpdateInvitationSettings`, `useUpdateLaunchSettings`, `useUpdateVisualTemplate`, `useUpdateTaqnyatTemplate`, `useUpdateMessagingContent`, `useUpdateEventStep2`. | W1-MOBILE-UPDATE adds the missing wrappers (services already exist at `eventsService2.js:226 updateInvitationSettings, :731 updateLaunchSettings`). |
| 9 | Backend atomic step-2 endpoint | **MISSING.** `labbe-backend-/src/modules/events/events.routes.js` has `:id/guest-list` (line 376–382) and `:id/staff-list` (line 420) — **no `:id/step2`.** | W0-ATOMIC builds it. |
| 10 | MongoDB transaction support | Need to verify the deployed Mongo setup (replica set vs standalone). Local development uses a standalone instance per Phase 0 commit history; production is presumably a replica set. **If standalone, sessions still work but atomic guarantees are weaker.** Document and gate. | W0-ATOMIC writes a `try/catch` shape that works on both topologies (the `session.startTransaction()` call will throw in standalone — catch and fall back to non-transactional ordered writes with a compensation rollback). |
| 11 | Backend test scaffold | **No `specs/` directory.** Project convention = `docs/implementation/phase-N-smoke-tests/` IIFE static checks. | Phase 4d smoke tests at `docs/implementation/phase-4d-smoke-tests/`. |
| 12 | `useUpdateEventStep2` web mutation | **MISSING.** Web update wizard step 2 dispatches `useUpdateGuestList` + `useUpdateStaffList` separately (`hooks/events/useEventForm.js:256-321` `buildStepPayload` step 2 returns `{ guestList, staffList }` and the `handleSave` step 2 case dispatches both via `Promise.all`). | W1-WEB-ATOMIC adds the new mutation and switches the step 2 dispatch to a single call. |
| 13 | Schema-drift CI infrastructure | **No CI configured** in any of the three sub-projects (no `.github/workflows`, no `.gitlab-ci.yml`). | W0-SCHEMAS ships `scripts/check-schema-drift.sh` as a manual command and documents in REPORT that CI wiring is a Phase 5 hand-off. |
| 14 | Mobile create-event StepThree canonical emission | **CONFIRMED CANONICAL.** `halla-mobile/components/createEvent/StepThree.js:199` → `visualTemplate.data: converted` where `converted` is built from `field.key` directly. The flat `templateBrideName`-style keys appear only in form state (legacy form structure), not in API payload. | W1-MOBILE-CREATE-VERIFY documents this and removes the unused unpacking branch in `mapApiToFormValues` once 4c's renamed shape is live. |

---

## 1. Locked decisions (relevant subset + 4d-specific tie-breakers)

Inherits master plan + the Phase 4d prompt:

- **D2.** Single update-event page used by all roles on web AND mobile.
- **D6.** Shared Zod schema package — start with create + update event schemas; ledger note for the rest.
- **D7.** scheduleDate/Time stays post-creation only.
- **D10.** Allow guest-list additions during `live` events; everything else locked.

4d-specific tie-breakers:

- **D4d-1.** Workspace tool = **npm workspaces** (D4d below). Package name = `@halla/shared-schemas`. Path = `packages/shared-schemas/`. Language = JavaScript (matches the rest of the codebase; no TS introduction).
- **D4d-2.** Atomic step-2 endpoint = `PATCH /api/v2/events/:id/step2` accepting `{ guestList, supervisorsList }` (web naming) or `{ guestList, staffList }` (mobile naming). **The endpoint accepts both** for transition; payload normalization happens at the controller boundary. Old endpoints (`PATCH /events/:id/guest-list` + `PATCH /events/:id/staff-list`) stay as compat for one release cycle.
- **D4d-3.** Transaction fallback: if `session.startTransaction()` throws (`MongoError: Transactions are not supported on this topology`), fall back to **ordered writes with compensation**: save guests first, then staff; on staff failure, revert guests to pre-image. Document the fallback in the controller comments.
- **D4d-4.** Mobile update wizard role gating: admin can edit any event; whitelabel admin/moderator can edit any tenant event (`event.host.whitelabelId === user.whitelabelId`); host can edit own event only. Role read from `useAuthStore.getState().user.role`. **No new screens per role.**
- **D4d-5.** Schema-drift check — `scripts/check-schema-drift.sh` runs `diff -r packages/shared-schemas/src labbe/utils/schemas` (re-export shims should match) and fails on any mismatch. Manual command; CI wiring is a Phase 5 hand-off.
- **D4d-6.** Backend optional consumption of shared schemas = **deferred.** v4.1/v4.2 don't introduce Zod on the backend; 4d won't either. Phase 5 ledger note.

---

## 2. Wave & sub-track map (file ownership)

Four tracks. Wave 0 (backend + shared schemas) merges first; B and C gate behind it.

| Wave | Sub-track | ID | Description | Primary files |
|------|-----------|----|-------------|---------------|
| 0 | Atomic step-2 endpoint with MongoDB transaction (+ topology fallback) | `W0-ATOMIC` | New `PATCH /api/v2/events/:id/step2`. Service method opens a session, transactions if supported, falls back to compensation otherwise. Reuses Phase 4b W0-RBAC's `GUEST_LIST_BELOW_CONFIRMED` capacity guard. | `labbe-backend-/src/modules/events/events.routes.js`, `labbe-backend-/src/modules/events/events.controller.js`, `labbe-backend-/src/modules/events/events.service.js`, `labbe-backend-/src/shared/constants/events.js` (capacity-guard constant if extracted) |
| 0 | Shared Zod schemas workspace package | `W0-SCHEMAS` | Create `packages/shared-schemas/`, copy `createEventSchema.js` + `updateEventSchema.js` from post-4c web schemas, set up npm workspaces at the repo root. Replace `labbe/utils/schemas/createEventSchema.js` and `halla-mobile/utils/schemas/createEventSchema.js` with re-export shims. Add `updateEventSchema.js` (new) on the shared side. Schema-drift script. | NEW `packages/shared-schemas/{package.json, index.js, src/createEventSchema.js, src/updateEventSchema.js}`, ROOT NEW `package.json` + `package-lock.json` (workspaces declaration), `labbe/package.json` (add workspace dep), `halla-mobile/package.json` (add workspace dep), `labbe/utils/schemas/{createEventSchema.js, updateEventSchema.js}` (shimmed), `halla-mobile/utils/schemas/{createEventSchema.js, updateEventSchema.js}` (shimmed), NEW `scripts/check-schema-drift.sh` |
| 1 | Unified mobile update-event wizard (all roles) | `W1-MOBILE-UPDATE` | Move `screens/host/UpdateEventScreen.js` → `screens/update-event/UpdateEventScreen.js`; split steps into `screens/update-event/{StepOne,StepTwo,StepThree,StepFour,StepFive}.js`. Add role-aware branches inline (read role from `useAuthStore`). Add new mutations (`useUpdateInvitationSettings`, `useUpdateLaunchSettings`, `useUpdateVisualTemplate`, `useUpdateTaqnyatTemplate`, `useUpdateMessagingContent`, `useUpdateEventStep2`). Wire D10 lockout. Wire `EventDetails` "Edit" button to `UpdateEventScreen` (already wires per audit; verify route param shape). | NEW `halla-mobile/screens/update-event/{UpdateEventScreen.js, StepOne.js, StepTwo.js, StepThree.js, StepFour.js, StepFive.js}`, DELETE `halla-mobile/screens/host/UpdateEventScreen.js` (or convert to thin re-export shim), `halla-mobile/components/events/EventDetails.js` (verify `handleManagePress` route name), `halla-mobile/navigation/AppNavigator.js`, `halla-mobile/hooks/mutations/useEventMutations.js` (add 6 mutations) |
| 1 | Mobile create-event field-name normalization verification | `W1-MOBILE-CREATE-VERIFY` | Verify post-4c the create-event flow emits canonical keys: StepThree → `visualTemplate.fieldValues.{key}`; StepFour → `taqnyatTemplate.templateRef`; StepFive → top-level `invitationMessage`, `guestReplies.*`, `hostNote`. Round-trip test (manual, in checklist). Adopt shared `createEventSchema`. Drop legacy unpacking in `mapApiToFormValues` (UpdateEventScreen). | `halla-mobile/components/createEvent/{StepThree.js, StepFour.js, StepFive.js}` (verify only), `halla-mobile/utils/schemas/createEventSchema.js` (re-export shim from W0-SCHEMAS — already done), `halla-mobile/screens/update-event/UpdateEventScreen.js` (drop legacy `mapApiToFormValues` flat-key unpack now that the form uses canonical) |
| 2 | Web step-2 atomic endpoint switch | `W1-WEB-ATOMIC` | Add `useUpdateEventStep2` mutation; switch web update wizard step 2 from parallel `Promise.all([updateGuestList, updateStaffList])` to single mutation call. Verify atomicity by injecting capacity-guard rejection on a payload that should fail. | `labbe/app/[lang]/host/update-event/page.js` (handleSave step 2 branch), `labbe/hooks/events/mutations/useEventMutation.js` (new mutation), `labbe/hooks/events/useEventForm.js` (`buildStepPayload` returns `{ guestList, supervisorsList }` instead of two separate keys) |

Wave gating: W0-ATOMIC and W0-SCHEMAS both in Wave 0 — disjoint files (backend module vs root + packages + utils/schemas), can run in parallel. Both must merge before Waves 1 and 2.

---

## 3. Standing rules (Phase 4d)

- Branch (implementation): `implementation/phase-4d-mobile-update-shared-schemas`. Plans land on `claude/phase-4b-4c-4d-plans-Sajqf`.
- Commit prefix per sub-track: `[PHASE-4D-W0-ATOMIC]`, `[PHASE-4D-W0-SCHEMAS]`, `[PHASE-4D-W1-MOBILE-UPDATE]`, `[PHASE-4D-W1-MOBILE-CREATE-VERIFY]`, `[PHASE-4D-W1-WEB-ATOMIC]`.
- Smoke specs (Node IIFE) under `docs/implementation/phase-4d-smoke-tests/`:
  - `static-checks-4d.js` — atomic-route mount string, capacity-guard reuse, shared-schemas package presence, npm-workspaces declaration in root `package.json`.
  - `atomic-step2-failure.js` — failure injection: forces second save to throw; asserts pre-image restored.
  - `schema-drift.sh` — manual run, must exit 0 in green stop gate.
- Manual verification items recorded in `docs/implementation/PHASE_4D_MANUAL_VERIFICATION.md` per sub-track. Critical items mirror the prompt §9.
- Update `PHASE_4D_PROGRESS.md` after every commit.
- Append to `IMPLEMENTATION_LEDGER.md` at phase end.
- AuditLog `targetType` enum stays lowercase (no new types in 4d).
- `git add <file>` per commit; never `git add -A`.
- Bilingual: every new copy string lands in both `ar.json` + `en.json` (web) and `localization/{ar,en}.js` (mobile).
- **No new backend dependency.** Mongoose's transaction APIs are already available in the installed version (`>=5.x`).
- **Mobile uses `npm install` from the repo root** post-W0-SCHEMAS to wire workspaces. Document in PROGRESS.

---

## 4. Out-of-scope (Phase 4d)

Carry to Phase 5:

- **Removal of `Event.invitationSettings`** (4c kept dual-write; cleanup phase removes after one release cycle).
- **Removal of `PATCH /events/:id/guest-list` + `PATCH /events/:id/staff-list` compat aliases** (4d kept for one cycle).
- **Removal of `PATCH /events/:id/invitation-settings` compat alias** (4c held it; remove post-cycle).
- **Detox / Maestro mobile UI test baseline** (Phase 4 hand-off).
- **CI wiring** for `scripts/check-schema-drift.sh` (no CI exists today).
- **Backend Zod adoption** for request validation (Phase 5 ledger note).
- **Migration of remaining schemas** (auth, subscription, addon, plan, ticket, vendor, whitelabel) into `@halla/shared-schemas` — Phase 5 follow-up.

Explicitly **not** in 4d:

- New features.
- Real Moyasar integration.
- Test infrastructure.
- Server-side admin search.

---

## 5. Hand-offs from Phase 4c honored here

- **Renamed schemas** (`labbe/utils/schemas/createEventSchema.js` post-rename) are the source for the shared-schemas package. W0-SCHEMAS copies the renamed version into `packages/shared-schemas/src/`.
- **`renderField` web + mobile** — W1-MOBILE-UPDATE step 3 reuses the mobile helper from 4c W2-MOBILE-WIZARD.
- **Taqnyat-template selection field** (`taqnyatTemplate.templateRef`) — W1-MOBILE-UPDATE's step 4 dispatches against it; the new mutation `useUpdateTaqnyatTemplate` calls `PATCH /events/:id/taqnyat-template` (introduced in 4c W0-RENAME §4).
- **Live-event field locks (D10)** — mobile `useEventActionGate` (Phase 4b W2-POLL-FAIL) wired into W1-MOBILE-UPDATE.

---

## 6. Hand-offs to Phase 5 surfaced now

To populate `PHASE_4D_REPORT.md` "Hand-offs":

- **Shared Zod-schema package — remaining migrations** (auth, subscription, addon, plan, ticket, vendor, whitelabel, etc.). Ping Peter when Phase 5 closes to scope a follow-up phase.
- **Removal of deprecated `Event.invitationSettings`** field after one release cycle.
- **Removal of deprecated compat endpoints** (`PATCH /events/:id/guest-list`, `PATCH /events/:id/staff-list`, `PATCH /events/:id/invitation-settings`).
- **CI integration** for `scripts/check-schema-drift.sh` (any CI provider; the script is the contract).
- **Detox / Maestro mobile UI test baseline.**
- **Inventory files 01–08** — archive under `docs/inventory/archive/` once Phase 4d closes (or leave under `docs/inventory/phase-4-extension/` as historical reference; Peter chooses).
- **Backend Zod adoption** for request validation — recommended on the post-4c renamed endpoints.
- **MongoDB topology** — verify production is a replica set (transaction guarantees). If standalone, the W0-ATOMIC compensation path is the active code; document any operational implication.

---

## 7. Stop gate criteria

**Wave 0 stop gate:**
- New `PATCH /events/:id/step2` endpoint passes happy-path + failure-injection specs (`atomic-step2-failure.js`).
- Topology fallback verified: in a standalone Mongo dev instance, the controller returns 200 on success and rolls back guests on staff-save failure (no transaction, but atomicity preserved via compensation).
- Shared-schemas package builds in isolation (`cd packages/shared-schemas && node -e "require('./')"`).
- Web and mobile both import from `@halla/shared-schemas` without breakage. `npm install` at repo root wires the workspace.
- `scripts/check-schema-drift.sh` exits 0 (no drift introduced by W0-SCHEMAS itself).

**Wave 1 stop gate:**
- Mobile host edits an existing event end-to-end across all 5 steps. Saves succeed.
- Mobile admin and mobile whitelabel admin/moderator do the same on the same wizard component (verified via React DevTools — single component tree).
- Mobile create-event field-name verification passes (round-trip works: mobile creates event → backend stores under canonical names → mobile reads back → all fields visible).
- Live-event field locks active on mobile (only step 2 add-guest editable).
- Old `screens/host/UpdateEventScreen.js` deleted (or thin re-export shim if backward-compat needed for navigation).

**Wave 2 stop gate:**
- Web update wizard step 2 dispatches the new atomic mutation (verified via React Query devtools — single PATCH to `/events/:id/step2`).
- Atomicity verified: an injected failure (capacity-guard rejection on a payload that includes a supervisorsList change) leaves the event unchanged on both fields (Network panel + DB inspection).

**Overall stop gate:**
- All four roles can edit an event end-to-end on web AND mobile.
- Web + mobile both import schemas from the shared package; manual schema-drift check exits 0.
- `IMPLEMENTATION_LEDGER.md` updated.
- Inventory files 01–08 archived per D4d hand-off (or the archive location decision documented in REPORT).
- Phase 4 / 4b / 4c / 3 / 2 / 1 smoke regressions re-run with no new failures.
- Branch pushed to `origin/implementation/phase-4d-mobile-update-shared-schemas`.

---

## 8. Anti-patterns to avoid (carried + audit-grounded)

- Do **not** create role-specific mobile update screens. ONE screen.
- Do **not** introduce a new schema-drift class. The shared package is the source of truth — re-exports only on web/mobile sides.
- Do **not** remove the deprecated endpoints in 4d. Compat first; cleanup later.
- Do **not** skip the live-event field lock. Mobile must enforce it the same way web does.
- Do **not** broaden scope beyond §2.
- Do **not** introduce TypeScript in `packages/shared-schemas/`. Match the codebase (JS).
- Do **not** introduce yarn or pnpm. Repo uses npm; W0-SCHEMAS uses npm workspaces.
- Do **not** rebuild `screens/host/UpdateEventScreen.js` from scratch. Move + restructure; preserve `mapApiToFormValues` until canonical-shape verification confirms it's safe to drop legacy unpacking.
- Do **not** assume MongoDB transactions are available. The compensation fallback is mandatory on standalone topologies.
- Do **not** ship the workspace without `package-lock.json` regeneration. Lockfile is the contract.

---

## 9. File ownership conflict map

| File | Owner | Notes |
|------|-------|-------|
| `labbe-backend-/src/modules/events/events.routes.js` | W0-ATOMIC | Sole writer in 4d. |
| `labbe-backend-/src/modules/events/events.controller.js` | W0-ATOMIC | Sole writer. |
| `labbe-backend-/src/modules/events/events.service.js` | W0-ATOMIC | Sole writer. |
| `labbe/utils/schemas/createEventSchema.js` | W0-SCHEMAS | Becomes a re-export shim. W1-WEB-ATOMIC reads but doesn't write. |
| `labbe/utils/schemas/updateEventSchema.js` | W0-SCHEMAS (NEW) | Created as a re-export shim from day 1. |
| `halla-mobile/utils/schemas/createEventSchema.js` | W0-SCHEMAS | Same. |
| `halla-mobile/utils/schemas/updateEventSchema.js` | W0-SCHEMAS (NEW) | Same. |
| `packages/shared-schemas/*` | W0-SCHEMAS | NEW. |
| Root `package.json` + lockfile | W0-SCHEMAS | NEW. |
| `halla-mobile/screens/host/UpdateEventScreen.js` | W1-MOBILE-UPDATE | Deleted or shimmed; relocated to `screens/update-event/`. |
| `halla-mobile/screens/update-event/*` | W1-MOBILE-UPDATE | NEW. |
| `halla-mobile/navigation/AppNavigator.js` | W1-MOBILE-UPDATE | Single screen entry. |
| `halla-mobile/components/events/EventDetails.js` | W1-MOBILE-UPDATE | Verify `handleManagePress` target. |
| `halla-mobile/hooks/mutations/useEventMutations.js` | W1-MOBILE-UPDATE | Adds 6 wrappers. |
| `halla-mobile/components/createEvent/*` | W1-MOBILE-CREATE-VERIFY | Verification only — no edits beyond removing legacy unpack branches. |
| `labbe/app/[lang]/host/update-event/page.js` | W1-WEB-ATOMIC | Step 2 dispatch branch. |
| `labbe/hooks/events/mutations/useEventMutation.js` | W1-WEB-ATOMIC | New `useUpdateEventStep2`. |
| `labbe/hooks/events/useEventForm.js` | W1-WEB-ATOMIC | `buildStepPayload` step 2 returns `{ guestList, supervisorsList }`. |

---

## 10. Final deliverables

- All commits on `implementation/phase-4d-mobile-update-shared-schemas`.
- `docs/implementation/PHASE_4D_PLAN.md` (this file), `PHASE_4D_PROGRESS.md`, `PHASE_4D_REPORT.md`, `PHASE_4D_MANUAL_VERIFICATION.md`.
- `IMPLEMENTATION_LEDGER.md` updated with all closed findings + Phase 5 ledger notes from §6.
- `docs/implementation/phase-4d-smoke-tests/` populated.
- Smoke tests green (4d new + 4c / 4b / 4 / 3 / 2 / 1 regression).
- Inventory files 01–08 archived (or location decision documented).
- Hand-off section enumerates Phase 5 entry points.
- Translations snapshot in REPORT.

When everything is green, ping Peter for review.
