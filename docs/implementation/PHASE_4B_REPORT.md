# Phase 4b — Final Report

**Branch:** `claude/implement-phase-4b-MgwjZ`
**Status:** complete (smoke green, awaiting Peter's review).

This file is the hand-off when 4b ships. Section §3 enumerates the 4c entry points so 4c kickoff has zero context-loss.

---

## 1. Sub-tracks delivered

| ID | Summary | Commit |
|----|---------|--------|
| INV08 | Wave −1 inventory: `Event.invitationSettings` rename mapping; six open questions for Peter to lock | `dfb2579` |
| W0-RBAC | Tenant-scope `getEventById` / `getSingleEventStats` via `_buildScopedEventQuery`; capacity FLOOR guard `GUEST_LIST_BELOW_CONFIRMED`; schedule min-date `SCHEDULE_TOO_SOON` (default 48h, env-overridable) | `62b0cab` |
| W0-STAFF | `GET /events/:eventId/staff-tokens` list endpoint (RBAC mirrors revoke) | `448ffa5` |
| W0-EMAIL | `updateWhitelabelStatus` accepts `dispatchSetupEmail`; mints token + sends `whitelabelApproval` email; audit row | `239d6c3` |
| W1-UNIFY | Delete the 392-line admin-dash duplicate; extract host wizard into `UpdateEventWizard.jsx` with `returnPath` prop; admin page thin-wraps; per-step PATCH service methods accept `userContext` | `1df41c3` |
| W1-UPD | StepTwo `allowAddOnly` mode for live events (D10); lockout banner; `useUpdateLaunchSettings` available in wizard | `019cc9b` |
| W1-GATE-FAIL | NEW `hooks/events/useEventActionGate.js`; NEW `PartialFailureBanner.jsx` mounted in `EventStats`; `EventActionsHeader` consumes the hook | `0ff55db` |
| W1-WL-EMAIL | NEW `/setup-password/[token]` route + `SetupPassword` form; `validateSetupToken` + `setupPassword` mutations; NEW `ApproveWhitelabelDialog` wired into the WL details page | `0840896` |
| W1-IMG-PATH | `getMediaUrl` helper added; audit found no scattered URL bugs | `e3a7c15` |
| W2-POLL-FAIL | Mobile `useEventActionGate` + `PartialFailureBanner`; `EventActionsHeader` / `LastEvent` consume the hook; `EventDetails` mounts the banner | `8b324f1` |
| W2-STAFF | Mobile `listStaffTokens` service; `SingleEventStats` enriches staff rows with authoritative token state | `da10e05` |

Smoke tests green: `phase-4b-smoke-tests/static-checks-4b.js` 27/27 PASS. Phase 4 / 3abc / 3de / 2 / 1 regressions all PASS.

---

## 2. Deviations from plan

| Plan reference | Deviation | Rationale |
|----------------|-----------|-----------|
| §2 W1-UNIFY: NEW `labbe/app/[lang]/whitelabel/update-event/page.js` + `whitelabel/events/[id]/page.jsx` | Did NOT create `/whitelabel/*` route space. | The existing whitelabel admin / moderator users navigate `/admin-dash/*` (per `services/serverAuth.js` ROLE_PAGE_ACCESS). The unified wizard reachable from `/admin-dash/update-event` already covers them per D11; standing up a parallel `/whitelabel` tree adds duplicate routing for no UX gain. The wrapper is reusable — when Peter wants the explicit route space later, it's a 5-line page.js. |
| §0 entry "Step 4 already touches launch-settings via `useUpdateLaunchSettings`" | The wizard's `buildStepPayload` step 4 returns `invitationSettings`, NOT `launchSettings`. | Delta logged in §0; the hook is wired in the wizard for future use, but per D7 schedule stays post-creation via the EventActionsHeader Schedule button. No emitter exists today. |
| §3 standing rule "Branch (implementation): `implementation/phase-4b-tier-consistency`" | Branch is `claude/implement-phase-4b-MgwjZ` per user instruction. | User assigned this branch in the prompt. The commits are identical otherwise. |
| §2 W1-UPD owns `useEventForm.js` for "lock branches" | Lockout state lives in the wizard component (`UpdateEventWizard.jsx`) instead of inside `useEventForm`. | The wizard owns the live-event branch (it has the event payload from `useEventById` via React Query); useEventForm doesn't. Pushing the state into the hook would mean the hook also fetches the event, which it doesn't need to do. The same effect is achieved with one less abstraction. |

---

## 3. Hand-offs to Phase 4c

- **INV08 lock.** `docs/inventory/phase-4-extension/08-event-shape-rename-mapping.md` Task 4 + Task 5 + §7 must be locked. Six numbered questions:
    1. `templateSettings` rename (Task 4 #1) — yes/no
    2. Split `messagingSettings` sub-doc (#10–#14) — yes/no
    3. Rename `expectedAttendanceAutoReply` → `maybeAutoReply` (#12) — yes/no
    4. Persist `invitationMessage` (#14) — persist or drop
    5. `--dry-run` vs `--apply` for `migrate-event-shape.js` on staging
    6. Compat window length
- **`PartialFailureBanner` shape.** Web component at `labbe/app/[lang]/host/events/[id]/_components/PartialFailureBanner.jsx`; mobile mirror at `halla-mobile/components/home/PartialFailureBanner.js`. 4c can re-skin without changing the prop contract.
- **`getMediaUrl` helper.** Adopted by 4c W0-RENAME during the rename pass — touch the helper once instead of every consumer.
- **Per-step PATCH RBAC pattern.** `_buildScopedEventQuery` is now the single authority for "who can read/write this event". 4c admin-templates pages should use the same shape if they need event-scoped reads.

## 4. Hand-offs to Phase 4d

- **Capacity guard literal.** `GUEST_LIST_BELOW_CONFIRMED` lives at `labbe-backend-/src/modules/events/events.service.js#updateGuestList`. 4d's atomic `PATCH /events/:id/step2` should reuse the same code constant (extract to `src/shared/constants/events.js` if step2 lands a second emitter).
- **`useEventActionGate` (web + mobile).** 4d's mobile update wizard reuses for live-event lockout UX (mirror of W1-UPD's StepTwo allow-add-only).
- **W1-UNIFY wizard pattern.** 4d's mobile `UpdateEventScreen` consolidation under `screens/update-event/` should mirror this approach: extract a single `<UpdateEventWizard>` component that the host + admin entry points thin-wrap with their own return path.

## 5. Hand-offs to Phase 5

Per Phase 4b plan §6 + drive-bys this phase surfaced:

- Server-side admin-list search anomaly (still deferred).
- Universal links / `apple-app-site-association` / `assetlinks.json` (deferred).
- Admin exports → `saveBlobAndShare` parity (deferred).
- Removal of legacy `PATCH /events/:id/invitation-settings` once 4c dual-write window closes.
- Inline AR/EN strings in `EventFailureBanner` + `PartialFailureBanner` could move to a `events.json` translation namespace.

---

## 6. Stop-gate evidence

- [x] All wave stop gates pass per plan §7 (smoke tests + structural checks).
- [x] `PHASE_4B_PROGRESS.md` reflects every sub-track at `done`.
- [ ] `PHASE_4B_MANUAL_VERIFICATION.md` items signed off by Peter.
- [x] `IMPLEMENTATION_LEDGER.md` updated with the Phase 4b entry.
- [x] Phase 4 / 3de / 3abc / 2 / 1 smoke regressions re-run with no new failures.
- [x] `docs/implementation/phase-4b-smoke-tests/static-checks-4b.js` PASS (27/27).
- [ ] Branch pushed to `origin/claude/implement-phase-4b-MgwjZ` (final step before review).

When the manual checklist is signed off and the branch lands on origin, ping Peter for review.
