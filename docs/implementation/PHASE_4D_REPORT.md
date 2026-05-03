# Phase 4d — Report

**Status.** All five sub-tracks landed on `claude/implement-phase-4d-xC9tN`.
Static smoke tests `28 / 28` PASS plus the in-process compensation
simulation `7 / 7` PASS. Phase 4c / 4b / 4 / 3abc / 3de / 2 / 1
regression suites all green: `56/56`, `31/31`, `24/24`, `19/19`,
`16/16`, `13/13`, `13+16+5`. Schema-drift check (`scripts/check-schema-drift.sh`)
exits 0. Manual verification recorded in `PHASE_4D_MANUAL_VERIFICATION.md`.

**Branch.** `claude/implement-phase-4d-xC9tN`.

---

## 1. Sub-track summary

| Sub-track | Commit | Files added | Files modified |
|-----------|--------|-------------|----------------|
| W0-ATOMIC | `43fdf10` | docs/implementation/PHASE_4D_PROGRESS.md | labbe-backend-/src/modules/events/{routes,controller,service}.js |
| W0-SCHEMAS | `666d4b6` | package.json (root), packages/shared-schemas/{package.json,index.js,src/createEventSchema.js,src/updateEventSchema.js}, labbe/utils/schemas/updateEventSchema.js, halla-mobile/utils/schemas/updateEventSchema.js, scripts/check-schema-drift.sh | labbe/package.json, labbe/utils/schemas/createEventSchema.js, halla-mobile/package.json, halla-mobile/utils/schemas/createEventSchema.js |
| W1-MOBILE-UPDATE | `72bb331` | halla-mobile/screens/update-event/{UpdateEventScreen,StepOne,StepTwo,StepThree,StepFour,StepFive}.js | halla-mobile/screens/host/UpdateEventScreen.js (shim), halla-mobile/screens/admin-dashboard/UpdateEventScreen.js (shim), halla-mobile/hooks/mutations/useEventMutations.js, halla-mobile/services/eventsService2.js, halla-mobile/config/api.js, halla-mobile/navigation/{App,Admin}Navigator.js |
| W1-MOBILE-CREATE-VERIFY | `454da63` | docs/implementation/PHASE_4D_MANUAL_VERIFICATION.md | — |
| W1-WEB-ATOMIC | `feed084` | — | labbe/services/new-backend/api.config.js, labbe/hooks/events/mutations/useEventMutation.js, labbe/hooks/events/useEventForm.js, labbe/app/[lang]/host/update-event/_components/UpdateEventWizard.jsx |
| Smoke tests | `1fdcdeb` | docs/implementation/phase-4d-smoke-tests/{static-checks-4d.js,atomic-step2-failure.js} | docs/implementation/phase-4c-smoke-tests/static-checks-4c.js (relocation tracking) |

---

## 2. Stop-gate evidence

**Wave 0**
- [x] `PATCH /events/:id/step2` mounted with `validateObjectId` +
      `requireSubscription` + `checkGuestLimit` middleware — same guard
      stack as the legacy `/guest-list` route.
- [x] Service `updateEventStep2` uses `mongoose.startSession()` +
      `session.startTransaction()` and falls back to ordered writes +
      compensation rollback when `startTransaction` throws (standalone
      Mongo). Compensation deletes the freshly-created guests, restores
      the pre-image guest list, and re-creates any guests that were
      removed mid-flight.
- [x] Controller normalises both `supervisorsList` (web) and
      `staffList` (mobile) per D4d-2.
- [x] Reuses Phase 4b W0-RBAC `GUEST_LIST_BELOW_CONFIRMED` floor check
      so capacity-guard rejection fires before any writes land.
- [x] Failure-injection simulation passes:
      `atomic-step2-failure.js` returns `7 / 7`.
- [x] Shared-schemas package layout in place; root `package.json`
      declares npm workspaces (`packages/*`, `labbe`, `halla-mobile`,
      `labbe-backend-`).
- [x] Web + mobile schema files become re-export shims; no inline
      `z.object(...)` definitions — `scripts/check-schema-drift.sh`
      exits 0.
- [x] Mobile shim sets `timeAsDate: true` (mobile TimePicker emits
      `Date`); web shim injects `FONT_IDS` from `@/config/fonts`.
- [x] `updateEventSchema` (NEW) accepts both `supervisorsList` and
      `staffList` array shapes per D4d-2.

**Wave 1 (mobile)**
- [x] Unified `screens/update-event/UpdateEventScreen.js` is a single
      component used for host / admin / super-admin / whitelabel-admin
      / whitelabel-moderator. Inline role gate (`canEditEvent`) blocks
      cross-tenant edits client-side; backend is the source of truth.
- [x] D10 live-event lockout via `useEventActionGate`: only step 2
      stays interactive (allow-add-only), every other step disables
      the form and shows the lockout banner.
- [x] Per-step mutation dispatch — step 1 → `useUpdateEvent`, step 2
      → `useUpdateEventStep2` (atomic), step 3 → `useUpdateVisualTemplate`,
      step 4 → `useUpdateTaqnyatTemplate`, step 5 → `useUpdateMessagingContent`.
- [x] Six new mutations added to `useEventMutations.js` (the four
      catalogued as missing in plan §0 row 8 plus the two extras the
      step-based wizard required for visual + Taqnyat + messaging
      narrowing).
- [x] `eventsService2.updateEventStep2` hits the new `/step2` endpoint;
      `config/api.js` registers `UPDATE_STEP2`.
- [x] Both navigators (`AppNavigator`, `AdminNavigator`) point at the
      unified screen. Legacy paths (`screens/host/UpdateEventScreen.js`,
      `screens/admin-dashboard/UpdateEventScreen.js`) are thin
      re-export shims so any other import paths still resolve.
- [x] `mapApiToFormValues` in the new screen is canonical-first; the
      legacy `templateBrideName` / `templateGroomName` / `templateGuestMessage`
      flat-key unpacking is gone.
- [x] Manual verification doc (`PHASE_4D_MANUAL_VERIFICATION.md`)
      lists every live-environment check needed (W0-ATOMIC happy path
      + atomicity + compensation; W1 unified screen behaviour + role
      gate; W1-WEB-ATOMIC single PATCH dispatch).

**Wave 2 (web)**
- [x] `useEventMutation.updateEventStep2` mutation registered;
      convenience hook `useUpdateEventStep2` exported.
- [x] `useEventForm.buildStepPayload` step 2 returns
      `{ type: "step2", data: { guestList, supervisorsList } }` —
      single payload for the atomic endpoint.
- [x] `UpdateEventWizard.jsx` step 2 dispatches the new single
      mutation (no more `Promise.all([updateGuestList, updateStaffList])`).
- [x] Old `useUpdateGuestList` / `useUpdateStaffList` hooks remain in
      the registry for any non-update-wizard callers (compat).
- [x] Backend compat aliases `/guest-list` + `/staff-list` retained for
      one release cycle (Phase 5 hand-off).

**Overall**
- [x] Phase 4d static checks: `28 / 28`.
- [x] Phase 4d failure simulation: `7 / 7`.
- [x] Phase 4c regression: `56 / 56` (the smoke test for the renamed
      `UpdateEventScreen` was relocated to track the file move).
- [x] Phase 4b regression: `31 / 31`.
- [x] Phase 4 regression: `24 / 24`.
- [x] Phase 3abc + 3de regression: `19 / 19` + `16 / 16`.
- [x] Phase 2 regression: `13 / 13`.
- [x] Phase 1 regressions: `13 + 16 + 5` PASS.
- [x] Schema-drift check exits 0.
- [ ] Manual checklist in `PHASE_4D_MANUAL_VERIFICATION.md` signed by
      Peter — pending live env.
- [ ] `npm install` at repo root run on a developer workstation —
      pending live env.

---

## 3. Hand-offs to Phase 5

- **Removal of compat aliases** `PATCH /events/:id/guest-list` +
  `PATCH /events/:id/staff-list` after one release cycle. The unified
  wizard (web + mobile) no longer hits them; any third-party clients
  should migrate to `/step2`.
- **CI integration** for `scripts/check-schema-drift.sh`. No CI
  pipeline exists today; once one is in place wire the script as a
  required pre-merge check.
- **Migration of remaining schemas** (auth, subscription, addon, plan,
  ticket, vendor, whitelabel, etc.) into `@halla/shared-schemas`. 4d
  scoped the migration to event create + update; the rest is a
  follow-up phase.
- **Backend Zod adoption.** Currently the backend doesn't validate
  request bodies through Zod — `@halla/shared-schemas` is consumed
  client-side only. Phase 5 may wire it into the request middleware on
  the renamed endpoints (per D4d-6).
- **MongoDB topology verification.** Confirm production is a replica
  set (transaction guarantees). If standalone, the W0-ATOMIC
  compensation path is the active code; document the operational
  implication and any latency cost.
- **Detox / Maestro mobile UI test baseline.** Carried over from
  Phase 4 hand-offs.
- **Inventory archival decision.** Move
  `docs/inventory/phase-4-extension/08-event-shape-rename-mapping.md`
  under `docs/inventory/archive/` once 4d is signed off, or leave as
  historical reference under the current path. Peter chooses.
- **Cleanup of legacy host / admin update screens.** Once two release
  cycles confirm no caller still imports `screens/host/UpdateEventScreen`
  or `screens/admin-dashboard/UpdateEventScreen`, the shim files can
  be deleted.

---

## 4. Decisions that landed differently from the plan

1. **Step count.** Mobile wizard is 5 steps (event details → guests +
   staff → visual → Taqnyat → messaging) without a separate summary
   step. The plan's "5 visible steps + summary" framing maps onto 5
   step components since the create-event Step 6 (`EventSummary`) is
   create-only — there's nothing to confirm in update mode that wasn't
   already saved per-step.
2. **Per-step save instead of single submit.** The legacy mobile
   update screen submitted everything in `Promise.all` at the end;
   the new screen mirrors the web wizard's per-step dispatch so each
   section saves independently and a failure in step 4 doesn't lose
   step 1's edits.
3. **Mobile uses `staffList` on the wire.** Even though the unified
   schema accepts both names, mobile always sends `staffList` because
   the rest of the app's domain language already uses that key. The
   controller normalises so this is a wire-format choice, not a
   compatibility concern.
4. **Three extra mobile mutations beyond the plan's six.** The plan
   listed `useUpdateInvitationSettings` / `useUpdateLaunchSettings`
   as required but stop short of narrowing for the per-step dispatch.
   The wizard needed the narrower `useUpdateVisualTemplate` /
   `useUpdateTaqnyatTemplate` / `useUpdateMessagingContent` so each
   step's save action only writes the fields it owns. All three are
   thin wrappers around `updateInvitationSettings` (same backend
   endpoint).
5. **Schema-drift check is a manual bash script.** Plan §3 calls for
   `scripts/check-schema-drift.sh`; this lands as a coarse grep-based
   check rather than a deep diff. The goal is to catch new inline
   `z.object(...)` definitions on the consumer side, not to assert
   byte-for-byte identity. A deeper structural check is a Phase 5
   follow-up if needed.
6. **Phase 4c regression test relocation.** The smoke check for
   "UpdateEventScreen reads canonical first" was rewritten to point at
   the relocated file path. The behaviour is preserved; only the file
   moved.

---

## 5. Smoke-test reference

```sh
# Phase 4d (this phase)
node docs/implementation/phase-4d-smoke-tests/static-checks-4d.js
# → Phase 4d static checks: 28/28

node docs/implementation/phase-4d-smoke-tests/atomic-step2-failure.js
# → Result: 7 pass / 0 fail

# Schema-drift check
bash scripts/check-schema-drift.sh
# → Phase 4d schema-drift check: PASS

# Phase 4c regression (file location updated to follow 4d relocation)
node docs/implementation/phase-4c-smoke-tests/static-checks-4c.js
# → 56/56 PASS

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

When the manual checklist in `PHASE_4D_MANUAL_VERIFICATION.md` is
signed off, ping Peter for review and the merge to `main`.

---

## 6. Translation snapshot

No new locale keys land in 4d. The unified update screen reuses the
Arabic copy from the old host update screen (`STEP_TITLES`,
`STEP_DESCRIPTIONS` arrays inlined for now); when Phase 5 unifies
admin + whitelabel copy keys these can move to the standard locale
files.
