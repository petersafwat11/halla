# Phase 4d — Progress

**Branch:** `claude/implement-phase-4d-xC9tN` (implementation lands here per Git Development Branch Requirements).
**Cut from:** `9971df1` (post-Phase-4c merge into main via PR #9).
**Tracking source:** `PHASE_4D_PLAN.md`.

---

## Wave 0 — Backend + workspace foundations

### W0-ATOMIC — `PATCH /events/:id/step2`

- [x] Plan reviewed; reuses Phase 4b W0-RBAC `_buildScopedEventQuery` and Phase 4b W0-RBAC `GUEST_LIST_BELOW_CONFIRMED` capacity guard.
- [x] Service: `updateEventStep2(eventId, { guestList, staffList }, userContext)` — opens session, tries transaction, falls back to compensation (pre-image rollback) on standalone Mongo topologies.
- [x] Controller: `updateEventStep2` accepts both `supervisorsList` (web) and `staffList` (mobile) at the controller boundary.
- [x] Route: `PATCH /:id/step2` with `validateObjectId` + `requireSubscription` + `checkGuestLimit` middleware (matches `/guest-list`).
- [x] Old endpoints (`PATCH /:id/guest-list`, `PATCH /:id/staff-list`) preserved as compat per D4d-2.

### W0-SCHEMAS — `@halla/shared-schemas` workspace

- [x] Repo-root `package.json` declares npm workspaces: `packages/*`, `labbe`, `halla-mobile`, `labbe-backend-`.
- [x] `packages/shared-schemas/{package.json, index.js, src/createEventSchema.js, src/updateEventSchema.js}` created.
- [x] `labbe/utils/schemas/createEventSchema.js` rewritten as a re-export shim from `@halla/shared-schemas`.
- [x] `labbe/utils/schemas/updateEventSchema.js` (NEW) re-export shim.
- [x] `halla-mobile/utils/schemas/createEventSchema.js` rewritten as a re-export shim.
- [x] `halla-mobile/utils/schemas/updateEventSchema.js` (NEW) re-export shim.
- [x] `labbe/package.json` + `halla-mobile/package.json` declare `@halla/shared-schemas` workspace dep.
- [x] `scripts/check-schema-drift.sh` — manual schema-drift check; documented as Phase 5 hand-off for CI.

---

## Wave 1 — Mobile update wizard (all roles) + create-event verify

### W1-MOBILE-UPDATE

- [x] `halla-mobile/screens/update-event/UpdateEventScreen.js` — unified screen for host / admin / whitelabel admin / whitelabel moderator (role gating inline, no per-role screens — D4d-4).
- [x] Step files split into `screens/update-event/{StepOne,StepTwo,StepThree,StepFour,StepFive}.js`.
- [x] D10 live-event lockout via `useEventActionGate` — only step 2 add-guest is editable on live events.
- [x] Six new mutations in `hooks/mutations/useEventMutations.js`: `useUpdateInvitationSettings`, `useUpdateLaunchSettings`, `useUpdateVisualTemplate`, `useUpdateTaqnyatTemplate`, `useUpdateMessagingContent`, `useUpdateEventStep2`.
- [x] `halla-mobile/navigation/AppNavigator.js` — single `UpdateEventScreen` entry pointing at the unified screen.
- [x] `halla-mobile/components/events/EventDetails.js` — `handleManagePress` route name verified.
- [x] Old `halla-mobile/screens/host/UpdateEventScreen.js` converted to thin re-export shim for legacy navigator references.

### W1-MOBILE-CREATE-VERIFY

- [x] `StepThree` confirmed canonical: emits `visualTemplate.data` from `field.key` directly.
- [x] `StepFour` confirmed canonical: writes `taqnyatTemplate.templateRef`.
- [x] `StepFive` confirmed canonical: writes top-level `invitationMessage`, `guestReplies.*`, `hostNote`.
- [x] Adopted shared `createEventSchema` via shim (W0-SCHEMAS).
- [x] Legacy flat-key unpacking dropped from `mapApiToFormValues` in the new `screens/update-event/UpdateEventScreen.js` (canonical-first; legacy still tolerated until Phase 5 drops the dual-write window).

---

## Wave 2 — Web step-2 atomic switch

### W1-WEB-ATOMIC

- [x] `useUpdateEventStep2` mutation added to `labbe/hooks/events/mutations/useEventMutation.js`.
- [x] `buildStepPayload` step 2 now returns `{ guestList, supervisorsList }` (single payload for the atomic endpoint).
- [x] `UpdateEventWizard.jsx` step 2 dispatches the new mutation (single PATCH instead of `Promise.all([updateGuestList, updateStaffList])`).
- [x] Old `useUpdateGuestList` + `useUpdateStaffList` hooks retained for non-update-wizard callers (compat).

---

## Smoke tests

- [x] `docs/implementation/phase-4d-smoke-tests/static-checks-4d.js` covers atomic-route mount, capacity-guard reuse, shared-schemas workspace presence, npm-workspaces declaration in root `package.json`, mobile update wizard relocation, web step-2 mutation dispatch.
- [x] `docs/implementation/phase-4d-smoke-tests/atomic-step2-failure.js` runs an in-process compensation simulation: forces second save to throw; asserts pre-image restored.
- [x] `scripts/check-schema-drift.sh` — manual run, exits 0 when schemas match.
- [x] Phase 4c regression: `56 / 56` PASS.
- [x] Phase 4b regression: `31 / 31` PASS.
- [x] Phase 4 regression: `24 / 24` PASS.
- [x] Phase 3abc + 3de regression: `19 / 19` + `16 / 16` PASS.
- [x] Phase 2 regression: `13 / 13` PASS.
- [x] Phase 1 regression: `13 + 16 + 5` PASS.

---

## Pending hand-offs to Phase 5

- Removal of compat aliases (`PATCH /:id/guest-list`, `PATCH /:id/staff-list`) after one release cycle.
- CI wiring for `scripts/check-schema-drift.sh` (no CI exists today).
- Migration of remaining schemas (auth, subscription, addon, plan, ticket, vendor, whitelabel) into `@halla/shared-schemas`.
- Backend Zod adoption.
- Detox / Maestro mobile UI test baseline.
- Inventory archival decision (`docs/inventory/phase-4-extension/` historical reference).
- MongoDB topology verification — confirm production replica set so the W0-ATOMIC happy path uses real transactions.
