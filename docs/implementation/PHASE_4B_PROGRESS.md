# Phase 4b — Progress Tracker

**Branch:** `claude/implement-phase-4b-MgwjZ`
**Started:** 2026-05-03
**Status:** complete (all sub-tracks shipped, smoke tests green, ready for Peter's review)

| Wave | Sub-track | Status | Commit | Notes |
|------|-----------|--------|--------|-------|
| −1 | `INV08` — Inventory 08 rename mapping | done | `dfb2579` | `docs/inventory/phase-4-extension/08-event-shape-rename-mapping.md`; six open questions for Peter to lock before 4c. |
| 0 | `W0-RBAC` — backend stats RBAC + capacity guard + schedule min-date | done | `62b0cab` | `_buildScopedEventQuery` extends getEventById/Stats; capacity FLOOR guard `GUEST_LIST_BELOW_CONFIRMED`; `messaging.scheduleBulkSend` rejects `now + < SCHEDULE_MIN_LEAD_HOURS` (default 48h). |
| 0 | `W0-STAFF` — `GET /events/:eventId/staff-tokens` endpoint | done | `448ffa5` | New service method + controller + route. RBAC mirrors revoke endpoint. |
| 0 | `W0-EMAIL` — Whitelabel approval atomic + setup email | done | `239d6c3` | `updateWhitelabelStatus` accepts `dispatchSetupEmail`; mints token, sends `whitelabelApproval`, audit-logs. |
| 1 | `W1-UNIFY` — delete admin duplicate + thin wrappers | done | `1df41c3` | 392-line `UpdateEventContent.jsx` deleted. Host wizard extracted to `_components/UpdateEventWizard.jsx` with `returnPath` prop. Admin page thin-wraps. Per-step PATCH service methods accept `userContext`. |
| 1 | `W1-UPD` — launch settings step 4 + live-event lockouts | done | `019cc9b` | StepTwo `allowAddOnly` mode wired (D10); wizard renders lockout banner; `useUpdateLaunchSettings` available via `payload.type === "launchSettings"` (no current emitter, per D7). |
| 1 | `W1-GATE-FAIL` — `useEventActionGate` + `PartialFailureBanner` | done | `0ff55db` | New hook centralises gate logic; `EventActionsHeader` consumes it; new `PartialFailureBanner.jsx` mounted in `EventStats`. |
| 1 | `W1-WL-EMAIL` — setup-password page + mutations + Approve dialog | done | `0840896` | `/setup-password/[token]` route + form built from scratch. `useAuthMutation` adds `validateSetupToken` + `setupPassword`. New `ApproveWhitelabelDialog` opens from WL details when status is `pending`. |
| 1 | `W1-IMG-PATH` — `getMediaUrl` helper | done | `e3a7c15` | Audit found no scattered URL bugs; helper added for 4c W0-RENAME hand-off. |
| 2 | `W2-POLL-FAIL` — mobile gate hook + failure + partial banners | done | `8b324f1` | Mobile companion of the web hook; same prop / return shape. EventDetails mounts `PartialFailureBanner`. |
| 2 | `W2-STAFF` — mobile staff token list + revoke wiring | done | `da10e05` | `listStaffTokens` service. `SingleEventStats` enriches staff rows with authoritative `isRevoked / isExpired / lastUsedAt / useCount`. |
| — | Smoke tests | done | (this commit) | `phase-4b-smoke-tests/static-checks-4b.js` 27/27 PASS. Phase 4 / 3abc / 3de / 2 / 1 regressions all PASS. |
| — | Manual verification | pending Peter | — | `PHASE_4B_MANUAL_VERIFICATION.md` populated. |

## Open questions / blockers

- **INV08 §7** — six numbered questions for Peter to lock before 4c W0-RENAME starts. Phase 4b ships green regardless; only 4c is gated.

## Hand-off / continuity notes

- Branch: `claude/implement-phase-4b-MgwjZ`. All commits prefixed per plan §3.
- Per-step PATCH RBAC was extended as a side effect of W1-UNIFY (the unified wizard wouldn't work for admin / WL admin without it). The relevant service methods (`updateEventDetails`, `updateGuestList`, `updateStaffList`, `updateInvitationSettings`, `updateLaunchSettings`, `sendTestMessage`) now resolve scope via `_buildScopedEventQuery`.
- Web `/whitelabel/*` route space was NOT created (the Phase 4b plan §2 mentioned it but the existing whitelabel admin / moderator users navigate `/admin-dash/*`). The unified wizard already covers them via the admin-dash route. Documented in W1-UNIFY commit message and the report's deviations section.
- Mobile `EventActionsHeader.js` previously gated on `event.whatsappTemplateStatus?.status` for canSendTest / canSchedule; the shared hook moves to `event.invitationSettings.selectedTemplate?.name` (matching web). The Submit-for-approval branch is mobile-only and remains inlined.
- `useUpdateLaunchSettings` is wired in the wizard but the current 4-step update flow doesn't emit a `launchSettings` payload (D7 — schedule stays post-creation via the EventActionsHeader Schedule button on the single-event page). The dispatch is reserved for a future buildStepPayload extension.
- `events.json` translation file does NOT exist; both `EventFailureBanner` (Phase 3c.4) and the new `PartialFailureBanner` ship inline AR/EN strings via the `t(_, fallback)` pattern. Future commit can extract.
