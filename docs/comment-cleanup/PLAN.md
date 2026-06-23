# Comment cleanup — refactoring "mesh" removal

**Status:** proposed · **Date:** 2026-06-24 · **Scope:** `labbe/`, `halla-mobile/`, `labbe-backend-`, `shared/`

## Goal

During the multi-phase unification/refactor we left a large amount of
**provenance narration** in code comments — comments that describe the
*history* of the refactor ("Phase 2 unification: X now lives in
@halla/shared", "Compat re-export", "Phase 8 will migrate this") rather
than what the code *currently does*. This plan removes that narration
while preserving every comment (or clause) that explains the current
flow or a non-obvious design decision.

This document is the **plan only**. No files are edited yet.

---

## The core rule: edit-down, don't delete

These comments are usually **mixed** — a provenance clause bolted onto a
genuine explanation. The default action is **edit the comment down**:
strip the history, keep the explanation. Full deletion applies only when
a comment is *entirely* provenance.

Decision procedure, applied clause by clause:

| Verdict | Clause describes… | Action |
|--------|-------------------|--------|
| **REMOVE** | the refactor's history / provenance — where code *used to* live, what *moved*, which Phase did it, what a *future* Phase *will* do | cut the clause |
| **KEEP** | what the current code does, or **why** it's shaped this way (a real constraint, dependency, or divergence that still holds) | leave untouched |

A comment survives the pass if anything explanatory remains; if nothing
does, delete the whole comment.

### Litmus test (the rule must produce both verdicts)

- `MapPicker.web.js` → *"Web stub for MapPicker — react-native-maps is
  not supported on web. Shows a disabled placeholder."* → **KEEP IN
  FULL.** It explains why the `.web.js` file exists. (Note it matches no
  removal keyword — good.)
- `createEventSchema.js` → *"Compat re-export. Canonical create-event
  schema lives in @halla/shared…"* → **EDIT DOWN** to a one-line
  navigation note (see Category C).

If a proposed rule nukes both because both say "lives in"/"on web", it's
a keyword filter, not a rule — reject it.

---

## Hard carve-outs (DO NOT TOUCH)

These contain Phase labels *by design*; stripping them is wrong:

1. `docs/**` — planning artifacts (this folder included).
2. `plans/**` — proposal/audit docs.
3. `**/phase-*-smoke-tests/**` and any `static-checks*.js` — the Phase
   labels map to plan findings; they are the test's contract.
4. `*UNIFICATION_REPORT*.md`, `PHASE_*_*.md`, `DEPLOYMENT_*.md`.
5. `node_modules/**`, lockfiles, `*.zip`.

### Functional comments — never remove (a broadened pass must skip these)

These look like comments but change behavior or tooling output:

- `eslint-disable` / `eslint-disable-next-line` / `eslint-enable`
- `@ts-expect-error`, `@ts-ignore`, `@ts-nocheck`
- `prettier-ignore`, `biome-ignore`
- `webpackChunkName`, `@vite-ignore`, `c8 ignore`, `istanbul ignore`
- `#region` / `#endregion` fold markers
- JSDoc `@param`/`@returns`/`@type` that the IDE relies on

---

## Categories with examples

### Category A — Provenance file headers (EDIT DOWN)

The flagship case. Keep the "what this file does" + real constraints;
delete the Phase/now-lives-in/will-migrate narration.

**`labbe/services/errorHandlingService.js`** (the user's example)

Before:
```js
/**
 * Centralized error handling for the web app.
 *
 * Phase 2 unification: `ErrorTypes`, `STATUS_CODE_MESSAGES`, and
 * `getAuthErrorMessage` (aliased to `authErrorMessage`) now live in
 * `@halla/shared/errors`. Web-specific helpers (toast wiring,
 * `parseError` that reads axios's response shape, `handleError`,
 * retry-with-backoff) stay here — they depend on `toastUtils` and the
 * axios `error.response` convention.
 */
```
After:
```js
/**
 * Centralized error handling for the web app. The toast wiring,
 * `parseError` (reads axios's `error.response` shape), `handleError`,
 * and retry-with-backoff helpers depend on `toastUtils` and the axios
 * convention, so they live here rather than in `@halla/shared/errors`.
 */
```

**`halla-mobile/config/api.js`**

Before: header explains `Phase 1 unification … now shared … Phase 5/8
will migrate … this wrapper will be deleted`, then a kept clause about
`API_BASE_URL` being platform-specific.
After: drop the Phase 1/5/8 narration; keep *"`API_BASE_URL` is
platform-specific (mobile points straight at production over HTTPS; web
routes via Next rewrites)."*

Other Category-A files (non-exhaustive): `labbe/services/http.js`,
`labbe/utils/schemas/vendorSettings.js`,
`labbe/utils/schemas/notificationPreferencesSchemas.js`,
`labbe-backend-/src/shared/utils/timezone.js`,
`labbe-backend-/src/shared/utils/schedulingWindow.js`,
`shared/src/utils/locale.js`, `shared/src/api/paths.js`.

### Category B — Inline Phase / report-tag labels (EDIT DOWN or DELETE)

Inline comments prefixed with a Phase or requirement tag. **Strip the
tag prefix; keep any explanation that follows.** If only the tag
remains, delete the line.

- `// Phase 3a.5 dropped the Taqnyat native-scheduling path entirely: there is …`
  → keep the explanation, drop "Phase 3a.5 dropped".
- `// FLOW-24-F02: profile-completion flag (auto-set when required vendor fields are present)`
  → `// profile-completion flag (auto-set when required vendor fields are present)`
- `// ---------- Phase 3a / 3c launch lifecycle tracking ----------`
  → `// launch lifecycle tracking` (or delete if redundant with code).

Heavy concentrations: `labbe-backend-/models/EventModel.js`,
`labbe-backend-/models/AuditLogModel.js`,
`labbe-backend-/models/UserModel.js`, `labbe-backend-/models/OTPModel.js`,
`labbe-backend-/src/shared/utils/scheduledTasks.js`.

### Category C — Compat / re-export shim headers (REDUCE to one line)

Files that exist only to re-export from `shared`. The shim itself is
real and worth a *navigation* note, but not a paragraph of history.

- `halla-mobile/utils/schemas/createEventSchema.js`,
  `updateEventSchema.js`, `labbe/utils/schemas/createEventSchema.js`
  → reduce to: `// Re-export; canonical schema in @halla/shared/schemas/events`.

### Category D — Pure-provenance comments (DELETE whole comment)

No current-behavior content at all:

- `shared/src/utils/index.js` → `// Placeholder — Phase 1+ moves locale/date/direction/xlsx utils here.`
- `shared/src/constants/permissions.js` → `… See UNIFICATION_REPORT.md Phase 8 slice 3 follow-ups.`
- Any `Phase 8 will retire/migrate/revisit …` standalone line.

---

## Borderline categories — proposed default, **please confirm/veto**

These are judgment calls. Proposed defaults below; flag any you disagree
with before execution.

1. **`FLOW-XX-FXX` / `PIPELINE-FXX` traceability tags** (mostly backend
   models). *Default: strip the tag, keep the trailing explanation.*
   Veto if you still trace code → requirements doc by these IDs and want
   them kept.

2. **Cross-platform "mirrors the web X" / "web uses… mobile uses…"
   notes.** *Default: split them* — keep notes that explain a **current
   divergence** that still matters (e.g. `shared/src/schemas/settings.js`
   "web uses `t`, mobile passes i18n keys through"); delete pure
   "mirrors X" provenance (e.g. `shared/src/utils/resolveTaqnyatPlaceholders.js`
   "Mirrors the backend resolver in …").

3. **Reference-to-report pointers** (`see UNIFICATION_REPORT.md …`).
   *Default: delete the pointer clause*, keep surrounding explanation.

---

## Regenerating the candidate set

Run from repo root; these greps stay live as the source of truth (the
two carve-out path filters keep planning docs out):

```bash
# Category A/B/D — Phase / provenance narration
rg -n -i --glob '*.{js,jsx,ts,tsx}' \
  '^\s*(//|\*).*(Phase [0-9]|now live|now lives|used to live|stays here|lives in|unification|mirrors the|parity with|previously|renamed from|moved (out|to|here|into)|extracted (from|to)|formerly|Compat re-export|delegates here|will (migrate|retire|revisit))' \
  labbe halla-mobile labbe-backend- shared

# Category B/borderline — report tags
rg -n -i --glob '*.{js,jsx,ts,tsx}' \
  '^\s*(//|\*).*(UNIFICATION_REPORT|FLOW-[0-9]|PIPELINE-|W[0-9]-[A-Z]|hand-?off|slice [0-9])' \
  labbe halla-mobile labbe-backend- shared
```

Current footprint (excluding the carve-outs): **~264 matches across ~167
files.** Backend models + `shared/` carry the densest Category A/B load;
the web `hooks/` and mobile `components/` trees carry many one-line
Category B/C hits.

---

## Execution plan (after approval)

1. **Confirm** the three borderline defaults above.
2. Work **one workspace at a time** (`shared` → backend → `labbe` →
   `halla-mobile`) so diffs stay reviewable and a regression is easy to
   bisect to a workspace.
3. Within a workspace, go file-by-file from the grep list; apply the
   edit-down rule per clause. **No logic changes** — comments only.
4. Skip every carve-out and functional comment listed above.
5. After each workspace: run its lint + build (`npm run lint`, the app's
   build) to confirm nothing referenced a stripped comment (e.g. a
   `webpackChunkName`) — comments-only edits should be a no-op.
6. Commit per workspace with a clear message (`chore(<ws>): remove
   refactor-provenance comments`).

Given the volume (~167 files), execution is a good fit for a fan-out
once the rule + borderline defaults are locked — but that is a separate,
explicitly-approved step, not part of this plan.
