# Halla Implementation — Phase 0: Stop the Bleeding

> Paste this into a **new** Claude Code session. Phase 0 is the first executable in the master implementation plan. Read the master plan at `docs/implementation/MASTER_PLAN.md` (you should be saving the master plan there) before starting.

## 0. Why this phase exists

Phase 0 closes the two confirmed-real critical security findings that should not sit in code another day. It also validates the workflow — progress file convention, sub-agent parallelism, stop gate review — before larger phases run.

Two findings, two parallel sub-agents, one main session orchestrating.

## 0.5. Naming context — read this before opening any audit file

After Phase 3 completed and before Phase 0 starts, a naming-consistency pass renamed the gate-scanner role and route across the code:

- `STAFF` role → renamed to `ENTRANCE_GATE` in code (constants, role checks, frontend guards, mobile guards).
- `staffPortal` page key → renamed to `entranceGate`.
- The `StaffAccessToken` model name was kept — still `StaffAccessToken` in code.
- The URL `/staff-portal` was kept — preserved for backward compatibility.
- Audit docs were partially updated (`RBAC_MATRIX.md`, `FINDINGS_SUMMARY.md`, flows 20/23/28). Other audit files may still reference `STAFF` and `staffPortal`.

When you read any audit file, treat `STAFF` and `ENTRANCE_GATE` as equivalent. Code uses `ENTRANCE_GATE`. This naming change does NOT affect Phase 0 — neither TENANT-F01 nor PIPELINE-F02 touches staff/gate code. It's noted here so you don't get confused when reading audit references.

Full naming audit lives at `docs/NAMING_AUDIT_STAFF.md`.

## 1. Findings to close

### TENANT-F01 — ADMIN and MODERATOR get null whitelabelId filter
- **Severity:** Critical
- **File:** `labbe-backend-/src/shared/middleware/whitelabel.js` lines 49–52
- **Current behavior:** `filterByWhitelabel` middleware sets `req.whitelabelFilter = { whitelabelId: null }` for ROLES.ADMIN and ROLES.MODERATOR. This grants them cross-tenant data access — they see data from every whitelabel, not just their own. A compromised ADMIN credential is a full data breach.
- **Required change:** Each ADMIN and MODERATOR user must be assigned a `whitelabelId` at user creation. The middleware must scope them to their assigned tenant the same way it scopes WHITELABEL_ADMIN. Only SUPER_ADMIN retains cross-tenant visibility.
- **Implementation steps:**
  1. Read the current `whitelabel.js` middleware end to end.
  2. Read `UserModel.js` to understand the existing `whitelabelId` field and how it's set for WHITELABEL_ADMIN today.
  3. Read every admin user-creation path (`POST /admin/hosts`, `POST /admin/moderators`, etc.) and find where `whitelabelId` is or isn't set for ADMIN/MODERATOR.
  4. Modify the middleware so ADMIN and MODERATOR are scoped to `req.user.whitelabelId` (same logic as WHITELABEL_ADMIN). Leave SUPER_ADMIN with cross-tenant access unchanged.
  5. Modify admin user-creation endpoints to require `whitelabelId` for new ADMIN and MODERATOR users.
  6. Write a one-off migration script (in `scripts/`) that audits existing ADMIN/MODERATOR users in the database and reports any without a `whitelabelId` set. Do NOT auto-assign — output a report only. Peter will assign manually based on the report.

### PIPELINE-F02 / FLOW-18-F01 — Webhook HMAC fails open
- **Severity:** Critical
- **File:** `labbe-backend-/src/modules/messaging/messaging.controller.js` lines 133–142
- **Current behavior:** `if (process.env.WHATSAPP_APP_SECRET && signature)` — the HMAC verification only runs when both the env var is set AND the signature header is present. If either is missing, the request is accepted without verification. An attacker can POST arbitrary RSVP responses or status updates to `/messaging/webhook` when `WHATSAPP_APP_SECRET` is unset.
- **Required change:** Fail closed. `WHATSAPP_APP_SECRET` must be required at server startup (fail-fast if missing). Webhook requests without the `x-hub-signature-256` header must be rejected with 401. Webhook requests with an invalid signature must be rejected with 401.
- **Implementation steps:**
  1. Read the current webhook handler end to end.
  2. Read `src/config/env.js` to understand how env vars are validated at startup. Add `WHATSAPP_APP_SECRET` to the required env vars list.
  3. Modify the webhook handler: change the condition so signature header presence and HMAC validity are both required. Reject with 401 on missing or invalid signature.
  4. Add a startup log line confirming HMAC verification is active when the server boots.
  5. Update `.env.example` (if it exists) to document `WHATSAPP_APP_SECRET` as required.

## 2. Operating rules

- **You may modify source code in this phase.** This is the first phase that does. Be precise. No drive-by refactors.
- **One sub-agent per finding.** Two findings, two sub-agents in parallel. The main session reviews each sub-agent's diff before merging.
- **Branch:** `implementation/phase-0-stop-the-bleeding` off the current main branch. Both fixes land on this branch.
- **Commits:** one commit per finding, with the finding ID in the commit message (e.g. `[TENANT-F01] scope ADMIN and MODERATOR to assigned whitelabel`).
- **No tests yet.** Phase 0 validates the workflow, not test coverage. Smoke verification is manual at the stop gate.
- **No changes outside the two listed files and their direct dependencies.** If you find another bug while reading the code, write it down in `PHASE_0_REPORT.md` notes — do NOT fix it.
- **No edits to other audit files or implementation plans.** This phase only writes new progress/report files and the source-code fixes.

## 3. Progress file convention (used in every phase)

You will create three files in `docs/implementation/`:

### `PHASE_0_PLAN.md` (write first, before any code)
Mirror this prompt's contents into a plan file with concrete file paths and your sub-agent task assignments. Format:
```markdown
# Phase 0 Plan

## Tasks
1. TENANT-F01 — Sub-agent A — files: whitelabel.js, UserModel.js, admin user-creation routes
2. PIPELINE-F02 — Sub-agent B — files: messaging.controller.js, env.js, .env.example

## Sub-agent ownership
Sub-agent A owns: <file list>. Sub-agent B owns: <file list>. No file appears in both lists.

## Stop gate criteria
- TENANT-F01: middleware scopes ADMIN/MODERATOR to their whitelabelId; manual test confirms cross-tenant access blocked.
- PIPELINE-F02: webhook rejects unsigned requests with 401; server fails to start if WHATSAPP_APP_SECRET unset.
- Migration report script runs and outputs a list of ADMIN/MODERATOR without whitelabelId.
- Both commits land on phase-0 branch with finding IDs in messages.
- PHASE_0_PROGRESS.md is current.
- PHASE_0_REPORT.md is written.
```

### `PHASE_0_PROGRESS.md` (update continuously)
Updated after every meaningful step (file read, sub-task complete, commit, blocker hit). Format:
```markdown
# Phase 0 Progress

## Status
- Sub-agent A (TENANT-F01): <not started | reading | implementing | testing | committed | done>
- Sub-agent B (PIPELINE-F02): same

## Last update: <timestamp>

## Log
- <timestamp>: <event>
- <timestamp>: <event>

## Open questions for Peter
- <if any blocker requires Peter input>
```

### `PHASE_0_REPORT.md` (write at the end, before the stop gate)
What landed, what deviated from plan, hand-off notes. Format:
```markdown
# Phase 0 Report

## Landed
- TENANT-F01: <one-paragraph summary, with commit SHAs>
- PIPELINE-F02: same

## Deviations from plan
- <anything you did differently than PHASE_0_PLAN.md described, with reasoning>

## Open items
- TENANT-F01 migration: <N> existing ADMIN/MODERATOR users have no whitelabelId — see report at <path>. Peter must assign manually before Phase 1.
- <anything else Peter needs to action>

## Notes for the next session
- <context that would otherwise be lost between sessions>
- <anything weird in the code you spotted but didn't fix>

## Findings closed
- TENANT-F01: closed in commit <SHA>
- PIPELINE-F02: closed in commit <SHA>
```

### `IMPLEMENTATION_LEDGER.md` (cross-phase, update at end)
If this file doesn't exist yet, create it. If it does, update the two finding IDs to `closed in PHASE_0`.

```markdown
# Halla Implementation Ledger

## TENANT-F01 — closed in PHASE_0 (commit <SHA>)
## PIPELINE-F02 — closed in PHASE_0 (commit <SHA>)
## <every other finding ID> — not started
```

If creating fresh, populate with all 131 finding IDs as `not started` (you can derive the list from `docs/audit/FINDINGS_SUMMARY.md`).

## 4. Sub-agent parallelism rule (re-read each phase)

Two sub-agents must never edit the same file. Before dispatching, the main session lists each sub-agent's owned file paths. If a file would be touched by both, the work consolidates into one sub-agent. The main session enforces this by reviewing the plan file before sub-agent dispatch.

For Phase 0:
- Sub-agent A owns: `whitelabel.js`, `UserModel.js`, admin user-creation route files (whichever ones set `whitelabelId`), and the migration script under `scripts/`.
- Sub-agent B owns: `messaging.controller.js`, `env.js`, `.env.example`.

Zero overlap. Safe to parallelize.

## 5. Process

1. Read this entire prompt.
2. Read `docs/audit/FINDINGS_SUMMARY.md` and confirm TENANT-F01 and PIPELINE-F02 details match.
3. Read the master plan if Peter saved it at `docs/implementation/MASTER_PLAN.md`.
4. Create branch `implementation/phase-0-stop-the-bleeding`.
5. Create `docs/implementation/PHASE_0_PLAN.md` from the template above.
6. Create `docs/implementation/PHASE_0_PROGRESS.md` with status: not started for both.
7. Dispatch sub-agent A on TENANT-F01.
8. Dispatch sub-agent B on PIPELINE-F02.
9. Sub-agents work in parallel. Main session reviews progress and ensures no file overlap as work progresses.
10. After each sub-agent commits, main session reviews the diff and confirms it matches the implementation steps in section 1.
11. After both commits land: write `PHASE_0_REPORT.md`, update `IMPLEMENTATION_LEDGER.md`, output the STOP gate.

## 6. STOP gate

End with:

```
STOP — Phase 0 complete

## Findings closed
- TENANT-F01: <commit SHA>
- PIPELINE-F02: <commit SHA>

## Branch
- implementation/phase-0-stop-the-bleeding (ready for Peter's review)

## Files produced/updated
- docs/implementation/PHASE_0_PLAN.md
- docs/implementation/PHASE_0_PROGRESS.md
- docs/implementation/PHASE_0_REPORT.md
- docs/implementation/IMPLEMENTATION_LEDGER.md (created or updated)
- scripts/audit-admin-whitelabel.js (or similar — the migration report script)

## Manual verification needed from Peter
1. Run the migration script and review the list of ADMIN/MODERATOR without whitelabelId.
2. Confirm `WHATSAPP_APP_SECRET` is set in your local `.env` (server will fail to start without it).
3. Smoke test: log in as an ADMIN user, attempt to access another whitelabel's data via guessable IDs, confirm 403 or filtered results.
4. Smoke test: send an unsigned POST to `/messaging/webhook`, confirm 401.

## Open items handed off to Phase 1
- <anything from PHASE_0_REPORT.md "Open items">

## Anomalies
- <anything weird the sub-agents spotted but didn't fix>
```

Then stop. Wait for Peter to verify and approve before Phase 1 prompt is written.

Begin.
