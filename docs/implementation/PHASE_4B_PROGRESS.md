# Phase 4b — Progress Tracker

**Branch:** `claude/implement-phase-4b-MgwjZ` (per user direction; the plan §3 originally specified `implementation/phase-4b-tier-consistency`).
**Started:** 2026-05-03

Track every commit-worthy change here. One row per sub-track, status updated continuously.

| Wave | Sub-track | Status | Commit | Notes |
|------|-----------|--------|--------|-------|
| −1 | `INV08` — Inventory 08 rename mapping | in flight | (this commit) | `docs/inventory/phase-4-extension/08-event-shape-rename-mapping.md` produced; Peter's lock pending. |
| 0 | `W0-RBAC` — backend stats RBAC + capacity guard + schedule min-date | not started | — | — |
| 0 | `W0-STAFF` — `GET /events/:eventId/staff-tokens` endpoint | not started | — | — |
| 0 | `W0-EMAIL` — Whitelabel approval atomic + setup-password email | not started | — | — |
| 1 | `W1-UNIFY` — delete admin update-event duplicate + thin wrappers | not started | — | — |
| 1 | `W1-UPD` — launch settings step 4 + live-event field locks | not started | — | — |
| 1 | `W1-GATE-FAIL` — `useEventActionGate` + `PartialFailureBanner` + manual retry | not started | — | — |
| 1 | `W1-WL-EMAIL` — setup-password page + auth mutations + Approve dialog | not started | — | — |
| 1 | `W1-IMG-PATH` — templateImage URL helper audit | not started | — | — |
| 2 | `W2-POLL-FAIL` — mobile gate hook + failure + partial banners | not started | — | — |
| 2 | `W2-STAFF` — mobile staff token list + revoke wiring | not started | — | — |
| — | Smoke tests | not started | — | `docs/implementation/phase-4b-smoke-tests/static-checks-4b.js` to land. |
| — | Manual verification | not started | — | `PHASE_4B_MANUAL_VERIFICATION.md` populated. |

## Open questions / blockers

- Peter to lock Inventory 08 §7 (six questions) before Phase 4c starts. Phase 4b is unblocked regardless — the lock only gates 4c.

## Hand-off / continuity notes

- `claude/implement-phase-4b-MgwjZ` is the implementation branch (user-assigned).
- All commit prefixes per plan §3: `[PHASE-4B-INV08]`, `[PHASE-4B-W0-RBAC]`, etc.
- Smoke tests use the established Node IIFE pattern under `docs/implementation/phase-4b-smoke-tests/`.
