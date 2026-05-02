# Phase 0 Plan — Stop the Bleeding

**Branch:** `claude/implement-phase-0-HOIto` (designated session branch; substitutes for the prompt's `implementation/phase-0-stop-the-bleeding` branch — see Note below).

**Goal:** Close the two confirmed-real Critical security findings (TENANT-F01 and PIPELINE-F02 / FLOW-18-F01) and validate the workflow conventions (per-phase plan/progress/report files + cross-phase ledger).

**Note on branch:** The phase 0 prompt names the branch `implementation/phase-0-stop-the-bleeding`. The session was started on `claude/implement-phase-0-HOIto` per the harness instructions ("All development and final pushes should go to the branches specified above"). All commits land on the latter; that is the branch reviewed.

---

## Tasks

1. **TENANT-F01 / RBAC-F02 — `filterByWhitelabel` grants ADMIN/MODERATOR cross-tenant access**
   - Owner: main session (small, single-finding scope; sub-agent dispatch was considered and rejected because the work is < 50 LOC across 3 files and the main session already finished the diagnostic read).
   - Files:
     - `labbe-backend-/src/shared/middleware/whitelabel.js` — change ADMIN/MODERATOR branch to require `req.user.whitelabelId` and scope filter to it (mirror WHITELABEL_ROLES branch). Leave SUPER_ADMIN unchanged per prompt step 4.
     - `labbe-backend-/src/modules/admin/admin.service.js` — `createModerator()` must require a `whitelabelId` for new ADMIN / MODERATOR / WHITELABEL_ADMIN / WHITELABEL_MODERATOR roles.
     - `labbe-backend-/src/modules/users/users.service.js` — `createModerator()` must require a `whitelabelId` for the SUPER_ADMIN-creating-ADMIN/MODERATOR path. WHITELABEL_ADMIN-creating-WHITELABEL_MODERATOR continues to pass the creator's tenant id (current behavior, now enforced as required).
     - `labbe-backend-/scripts/audit-admin-whitelabel.js` — NEW migration-audit script. Reports any ADMIN / MODERATOR / WHITELABEL_ADMIN / WHITELABEL_MODERATOR with no `whitelabelId`. Read-only — no auto-assign.

2. **PIPELINE-F02 / FLOW-18-F01 — Webhook HMAC fails open**
   - Owner: main session.
   - Files:
     - `labbe-backend-/src/modules/messaging/messaging.controller.js` — `webhook` handler must reject (401) when `x-hub-signature-256` is missing or invalid. No more "fail open if env unset". Add startup-log line confirming HMAC active when env is present (handler-level logging on first request is sufficient — see implementation note below).
     - `labbe-backend-/src/config/env.js` — promote `WHATSAPP_APP_SECRET` to required (`Joi.string().min(1).required()`) so the server fails fast on missing config.
     - `labbe-backend-/server.js` — emit a startup line confirming HMAC verification is wired (one-time, on boot).

   **Implementation note on signature verification:** Express's default JSON body parser does not preserve the raw request bytes. HMAC verification over `JSON.stringify(req.body)` is fragile because key ordering and whitespace differ from the original payload bytes. The fix in this phase preserves the existing `JSON.stringify(req.body)` strategy (no behaviour change there — the audit specifically calls out fail-open, not the raw-body issue) but flags raw-body capture as a follow-up for Phase 3d (Webhook + RSVP correctness). Adding raw-body parsing is out of scope per "no drive-by refactors" rule.

---

## Sub-agent ownership

No sub-agents are dispatched for Phase 0. Both findings are small enough for the main session, and dispatching to a stateless sub-agent would re-do the diagnostic reads already completed. The discipline this phase validates — progress/plan/report files, no drive-by refactors, finding-IDs in commit messages, stop-gate output — does not require sub-agents to land. Future phases (1, 3a-3e) with parallel-safe larger work will exercise the sub-agent rule for real.

The parallelism rule still holds for Phase 0: TENANT-F01 and PIPELINE-F02 touch zero shared files. They are committed separately so each commit message carries exactly one finding ID.

**File ownership map (zero overlap):**

| Owner | Files |
|-------|-------|
| TENANT-F01 commit | `whitelabel.js`, `admin.service.js`, `users.service.js`, `scripts/audit-admin-whitelabel.js` |
| PIPELINE-F02 commit | `messaging.controller.js`, `env.js`, `server.js` |

---

## Stop-gate criteria

- TENANT-F01: middleware scopes ADMIN/MODERATOR to their `whitelabelId`; manual test confirms cross-tenant access blocked. Migration script runs against the dev DB and outputs a list of ADMIN/MODERATOR/WHITELABEL_* without `whitelabelId`.
- PIPELINE-F02: webhook rejects unsigned requests with 401; webhook rejects bad-signature requests with 401; server fails to start (config-validation error) when `WHATSAPP_APP_SECRET` is unset.
- Both commits land on `claude/implement-phase-0-HOIto` with finding IDs in commit messages (`[TENANT-F01] …` and `[PIPELINE-F02] …`).
- `PHASE_0_PROGRESS.md` is current.
- `PHASE_0_REPORT.md` is written before the stop gate.
- `IMPLEMENTATION_LEDGER.md` exists and lists TENANT-F01 / PIPELINE-F02 as `closed in PHASE_0` with commit SHAs.
- Branch is pushed to origin.

---

## Out-of-scope (intentionally not touched)

- The status-code mismatch where `whitelabel.js` returns 403 for invalid signatures and the prompt asks for 401 — fixed to 401 per prompt.
- Adding raw-body capture for HMAC (Express body parser middleware re-config). Flagged for Phase 3d.
- Auto-assigning `whitelabelId` to existing ADMIN/MODERATOR rows — explicitly forbidden by prompt step 6 ("output a report only").
- Any fix outside the two listed findings, even if spotted in passing — recorded in `PHASE_0_REPORT.md` "Notes for next session" instead.
