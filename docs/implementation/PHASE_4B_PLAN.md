# Phase 4b — Plan (Tier Consistency + UX Gates)

**Branch:** `claude/phase-4b-4c-4d-plans-Sajqf` (this docs commit) → implementation lands on `implementation/phase-4b-tier-consistency`.
**Cut from:** post-Phase-4 head (`claude/implement-phase-4-3lGwb` final commit; tag `phase-4-merged`).
**Source of truth:** `docs/implementation/halla-phase-4-extension-plan.md` (Rev 4) + the Phase 4b prompt (re-grounded against actual code below).

> **Why this plan reads differently from the prompt.** A live audit of `labbe-backend-/`, `labbe/`, and `halla-mobile/` (May 3 2026) revealed several places where the original prompt's assumptions don't match the codebase. Every delta is logged in §0 so the prompt-driven scope still lands but the work doesn't get blocked on a stale assumption.

---

## 0. Pre-flight verification (Standing Rules — "Verify before locking the plan")

| # | Check | Result vs prompt assumption | Adjustment |
|---|-------|-----------------------------|------------|
| 1 | `app/[lang]/admin-dash/update-event/_components/UpdateEventContent.jsx` is "an empty placeholder shell" | **MISMATCH.** File is **392 lines** — a full duplicate of the host wizard with its own form context + `adminDashboardAPI` mutations. | W1-UNIFY's job is **delete + alias**, not "land an implementation". Port any admin-only branch-logic into the host wizard via role props before deletion. |
| 2 | `app/[lang]/admin-dash/events/[id]/_components/EventDetailsContent.jsx` imports from legacy `@/hooks/events` instead of polling-aware `@/hooks/reactQueryHooks/useEvents` | **PARTIAL.** Legacy `@/hooks/events` is the actual implementation; `@/hooks/reactQueryHooks/useEvents.js` is a 6-line **deprecated re-export wrapper** of `@/hooks/events`. Polling lives in `hooks/events/queries/useSingleEventStats.js` (refetchInterval: 30 s live / 5 min completed). | Drop the "swap import" task. W1-UNIFY's only stats work is verifying `useSingleEventStats(eventId, { eventStatus })` is the call site on every consumer. |
| 3 | `_getEventBodyParams` returns "4 hardcoded params" (per Rev 3) | **MISMATCH.** Returns **5 params** at `src/modules/messaging/messaging.service.js:37` (`guestName`, title, formatted date, time, location). | Phase 4b doesn't touch this; flagged for 4c (`W0-DYNAMIC` legacy fallback must preserve 5-param shape). |
| 4 | `useEventActionGate` already exists | **MISSING.** Gate logic is inlined in `labbe/ui/host/events/EventActionsHeader.jsx:14-71` and `halla-mobile/components/home/{EventActionsHeader.js:22-28, LastEvent.js:32-36}`. | Build it in W1-GATE-FAIL (web) and W2-POLL-FAIL (mobile). |
| 5 | `EventFailureBanner` exists | **EXISTS.** `labbe/app/[lang]/host/events/[id]/_components/EventFailureBanner.jsx` (Phase 3c.4); mobile `components/home/EventFailureBanner.js` likewise. | Reuse, don't rebuild. W1-GATE-FAIL adds the **partial-failure** banner (live + failedCount > 0) as a **new** sibling component because the existing one targets `status === 'failed'` only. |
| 6 | `useAuthMutation.js` is missing `validateSetupToken` + `setupPassword` mutations | **CONFIRMED.** Web `hooks/reactQueryHooks/useAuthMutation.js` has login/OTP/forgotPassword/resetPassword/signup* but no setup-password mutations. | W1-WL-EMAIL adds them. |
| 7 | Web `setup-password/[token]/page.jsx` exists | **MISSING ENTIRELY** — no route, no `SetupPassword.js` UI component. Mobile path was shipped in Phase 4 W3-WL but the web target the email links to is absent. | W1-WL-EMAIL builds the page from scratch (route + form + token-validate flow). Hand-off note in Phase 4 final report (`Web /setup-password/{token} page` carry-forward) is closed here. |
| 8 | Whitelabel detail page has an "Approve" button | **PARTIAL.** `app/[lang]/admin-dash/whitelabels/[id]/_components/WhitelabelDetailsContent.jsx:130-142` shows Activate/Suspend toggles only; no explicit Approve. | W1-WL-EMAIL adds the explicit Approve action (only visible when status === `pending`) wrapping the existing status mutation + the new email dispatch flag. |
| 9 | Backend `events.service.js` `isAdmin` check on `getEventById` / `getEventStats` already includes whitelabel tier | **MISMATCH.** `events.service.js:168` `getEventById` checks **ownership only** (`{ host: userId }`); router-level `restrictTo(...)` allows admin/super_admin/moderator but NOT whitelabel_admin/whitelabel_moderator (route `events.routes.js:50`). | W0-RBAC extends the route-level restrictTo AND the service-layer scope check. |
| 10 | `events.service.js` `updateGuestList` capacity guard | **MISSING.** Route line 376–382 mounts `checkGuestLimit` middleware but no confirmed-RSVP-count guard exists. | W0-RBAC adds it inside the service. |
| 11 | `messaging.service.js` `scheduleBulkSend` min-date validation | **MISSING.** No backend min-date enforcement; client-side only. | W0-RBAC adds it. |
| 12 | `GET /events/:eventId/staff-tokens` endpoint | **MISSING** (Phase 4 final report confirmed: `revokeStaffToken` accepts `event.staffList[i]._id` directly, so list endpoint never blocked Phase 4 mobile UI; we still ship it for the explicit "active staff tokens" view per the prompt). | W0-STAFF lands it. |
| 13 | `admin.service.js` `updateWhitelabelStatus` dispatches setup-password email | **MISSING.** `admin.service.js:1159-1181` updates user status + fires in-app notification only. No email send. `User.createPasswordSetupToken()` exists at `models/UserModel.js:544-554`. `email/templates/whitelabels.js:96-192` `whitelabelApprovalEmail` exists with a `setupPasswordUrl` slot. | W0-EMAIL stitches them together behind a `dispatchSetupEmail` flag. |
| 14 | Backend test scaffold `labbe-backend-/specs/phase-4b/` | **No `specs/` directory exists.** Project convention is **Node IIFE static checks** under `docs/implementation/phase-N-smoke-tests/` (see Phase 4 — `phase-4-smoke-tests/static-checks-4.js` 13/13 PASS). | Phase 4b smoke tests live at `docs/implementation/phase-4b-smoke-tests/`. Backend behavior is verified via the IIFE pattern hitting in-memory mongoose models or by static AST checks where appropriate. |
| 15 | Mobile `screens/update-event/` directory | **N/A for 4b** — this is a 4d concern. Noted because Phase 4d prompt is also stale: `screens/host/UpdateEventScreen.js` already exists (407 lines, reuses createEvent components, 4 steps). |

Drive-by surfaces logged for 4b scope:

- `services/serverAuth.js` already mirrors backend `ADMIN_PAGES` / `ROLE_PAGE_ACCESS` (verified). No 4b work, but a note: 4c will need a new `templates` page entry.
- The host update wizard already supports `mode="update"` via `useEventForm({ mode })` (`labbe/hooks/events/useEventForm.js:128-361`) and dispatches per-step PATCHes through `buildStepPayload` (lines 256–321). Step 4 already touches launch-settings via `useUpdateLaunchSettings` (`hooks/events/mutations/useEventMutation.js:126`). **W1-UPD becomes verification + the live-event field-lock UX.**
- `frontend.url` is wired at `labbe-backend-/src/config/index.js:72-74` from `env.FRONTEND_URL` — W0-EMAIL constructs `setupPasswordUrl` against it.

---

## 1. Locked decisions (D1 – D11 + 4b-specific tie-breakers)

Inherits the master plan's locked answers (`halla-phase-4-extension-plan.md` Rev 4 §3). Restated for self-containment:

- **D1.** Whitelabel-admin stats scope = **tenant-wide** (host's `whitelabelId` matches caller's `whitelabelId`).
- **D2.** Single update-event page used by all roles on web AND mobile (4b unifies web; 4d unifies mobile).
- **D5.** Whitelabel approval = **confirm popup on Approve**, atomic status update + email send.
- **D7.** Schedule action stays on the single-event page (`EventActionsHeader`); no work in 4b.
- **D8.** Manual retry button = **visible to anyone with single-event-page access** (RBAC happens at the backend).
- **D9.** Partial-failure banner threshold = **any failed**.
- **D10.** Field locks during `live` events = **allow guest-list additions only**; everything else read-only with a banner.
- **D11.** Admin/whitelabel create+update event = **host wizard with role-aware branches** (no separate trees).

4b-specific tie-breakers:

- **D4b-1.** **Inventory 08 pre-flight runs as Wave −1** of Phase 4b (single docs commit on this branch, half-session) so 4c can start immediately after 4b's stop gate without a separate session. Output is `docs/inventory/phase-4-extension/08-event-shape-rename-mapping.md`. Peter's lock review is the gating event between 4b merge and 4c kickoff.
- **D4b-2.** Old `PATCH /events/:id/invitation-settings` endpoint stays untouched in 4b. Rename happens in 4c (`W0-RENAME`); 4b adds **no new shape**, so dual-write is N/A here.
- **D4b-3.** Schedule min-date lead = **48 hours**, env-overridable (`SCHEDULE_MIN_LEAD_HOURS`, default 48). Backend error code `SCHEDULE_TOO_SOON`; capacity-guard error code `GUEST_LIST_BELOW_CONFIRMED`. Surfaced in the UI via existing toast layer.
- **D4b-4.** Manual retry button click does NOT branch on role; it always calls `POST /events/:id/retry-launch` (already exists, RBAC enforced server-side per `IMPLEMENTATION_LEDGER.md` Phase 3c entry).

---

## 2. Wave & sub-track map (file ownership)

| Wave | Sub-track | ID | Description | Primary files |
|------|-----------|----|-------------|---------------|
| −1 | Inventory 08 pre-flight (rename mapping for `Event.invitationSettings`) | `INV08` | Single sub-agent, read-only on `labbe-backend-/`, `labbe/`, `halla-mobile/`. Produces the rename table 4c bakes into its prompt. | `docs/inventory/phase-4-extension/08-event-shape-rename-mapping.md` (new) |
| 0 | Stats RBAC + capacity guard + schedule min-date | `W0-RBAC` | Whitelabel tier added to `GET /events/:id` + `/events/stats/:id`; `updateGuestList` rejects below-confirmed; `scheduleBulkSend` rejects `now + <SCHEDULE_MIN_LEAD_HOURS`. | `labbe-backend-/src/modules/events/{events.routes.js, events.service.js, events.controller.js}`, `labbe-backend-/src/modules/messaging/messaging.service.js` |
| 0 | `GET /events/:eventId/staff-tokens` list endpoint | `W0-STAFF` | Host-scoped read of `StaffAccessTokenModel` records for a given event. **Runs after W0-RBAC** because both touch `events.routes.js` / `events.controller.js`. | same 3 events files |
| 0 | Whitelabel approval atomic status + email | `W0-EMAIL` | `updateWhitelabelStatus` accepts `dispatchSetupEmail`; on `approved` + flag, mints token + sends `whitelabelApprovalEmail`. Re-approval regenerates token. | `labbe-backend-/src/modules/admin/{admin.service.js, admin.controller.js}`, `labbe-backend-/email/templates/whitelabels.js` (no edit; verify exports), `labbe-backend-/email/index.js` |
| 1 | Page consolidation + admin stats verification | `W1-UNIFY` | Delete `UpdateEventContent.jsx` duplicate; admin-dash + (NEW) whitelabel update-event routes thin-wrap host page. Same for single-event page. Verify polling hook is consumed everywhere. | `labbe/app/[lang]/admin-dash/update-event/{page.js, _components/UpdateEventContent.jsx (DELETE)}`, `labbe/app/[lang]/whitelabel/update-event/page.js (NEW)`, `labbe/app/[lang]/admin-dash/events/[id]/_components/EventDetailsContent.jsx`, `labbe/app/[lang]/whitelabel/events/[id]/page.jsx (NEW or alias)` |
| 1 | Launch-settings wired in update wizard step 4 + live-event field locks | `W1-UPD` | Verify `useUpdateLaunchSettings` is dispatched on step 4 save; add D10 lockout UX (read-only banner outside step 2 when `event.status === 'live'`). | `labbe/app/[lang]/host/update-event/page.js`, `labbe/hooks/events/useEventForm.js` (lock branches), `labbe/app/[lang]/host/create-event/_components/stepTwo/StepTwo.js` (allow-add-only mode) |
| 1 | Shared gate hook + failure UI + partial-failure banner + retry button | `W1-GATE-FAIL` | Extract `useEventActionGate` (web), reuse `EventFailureBanner.jsx`, add **new** `PartialFailureBanner.jsx`. Manual Retry button visible per D8. | NEW `labbe/hooks/events/useEventActionGate.js`, `labbe/ui/host/events/EventActionsHeader.jsx` (consume hook), NEW `labbe/app/[lang]/host/events/[id]/_components/PartialFailureBanner.jsx`, `labbe/app/[lang]/host/events/[id]/_components/EventStats.jsx` (mount banner) |
| 1 | Whitelabel approve flow: confirm popup + setup-password mutations + setup-password page | `W1-WL-EMAIL` | Adds `validateSetupToken` + `setupPassword` mutations; builds `/setup-password/[token]/page.jsx` from scratch (form, server-side token validate, redirect on success); adds `ApproveWhitelabelDialog`; toggles existing detail-page Activate button to "Approve" when status is `pending`. | `labbe/hooks/reactQueryHooks/useAuthMutation.js`, NEW `labbe/app/[lang]/setup-password/[token]/page.jsx`, NEW `labbe/ui/auth/setup-password/SetupPassword.js`, NEW `labbe/ui/admin/whitelabels/ApproveWhitelabelDialog.jsx`, `labbe/app/[lang]/admin-dash/whitelabels/[id]/_components/WhitelabelDetailsContent.jsx`, `labbe/services/admin.js` (extend `updateWhitelabelStatus` payload) |
| 1 | `templateImage` URL handling audit | `W1-IMG-PATH` | Audit web consumers of `event.invitationSettings.templateImage`; consolidate URL construction through one helper. Light task — fold into W1-UNIFY commit if no helper extraction needed. | `labbe/utils/index.js` (add `getMediaUrl` if missing), various consumers found by grep |
| 2 | Mobile single-event polling + failure UI + partial-failure + gate hook | `W2-POLL-FAIL` | Mobile companion to W1-GATE-FAIL. Same hook signature, same banner shapes. Verify `SingleEventStats` already consumes `useSingleEventStats` (per Phase 4 W1-STATS verification — confirmed). | NEW `halla-mobile/hooks/useEventActionGate.js`, `halla-mobile/components/home/EventActionsHeader.js`, `halla-mobile/components/home/LastEvent.js`, `halla-mobile/components/events/SingleEventStats.js`, NEW `halla-mobile/components/home/PartialFailureBanner.js` |
| 2 | Mobile staff-token list + revoke wiring | `W2-STAFF` | Add `listStaffTokens(eventId)` to `services/eventsService2.js`; mount it in the existing long-press menu (Phase 4 W2-STAFF) so "Revoke access" gets the active list rather than walking `event.staffList`. | `halla-mobile/services/eventsService2.js`, `halla-mobile/components/events/SingleEventStats.js` (the staff tab consumer) |

Wave gating: W0 first (W0-RBAC → W0-STAFF → W0-EMAIL on the same backend tree, sequential because they share routes/controllers files). W1 + W2 parallel on disjoint files. Wave −1 runs **before W0** as the inventory commit; it is read-only on the codebase and does not block the backend track from drafting in parallel — but W0 commits don't land until INV08 produces the rename mapping that 4c will inherit.

---

## 3. Standing rules (Phase 4b)

- Branch (implementation): `implementation/phase-4b-tier-consistency`. Plans land on `claude/phase-4b-4c-4d-plans-Sajqf`.
- Commit prefix per sub-track: `[PHASE-4B-INV08]`, `[PHASE-4B-W0-RBAC]`, `[PHASE-4B-W0-STAFF]`, `[PHASE-4B-W0-EMAIL]`, `[PHASE-4B-W1-UNIFY]`, `[PHASE-4B-W1-UPD]`, `[PHASE-4B-W1-GATE-FAIL]`, `[PHASE-4B-W1-WL-EMAIL]`, `[PHASE-4B-W1-IMG-PATH]`, `[PHASE-4B-W2-POLL-FAIL]`, `[PHASE-4B-W2-STAFF]`.
- Smoke specs (Node IIFE pattern) under `docs/implementation/phase-4b-smoke-tests/`. At minimum:
  - `static-checks-4b.js` — RBAC scope check, capacity-guard literal, schedule min-date constant, route-mount strings.
  - `email-dispatch-stub.js` — assertion that `updateWhitelabelStatus` calls the email sender with the expected payload shape (mocked).
- Manual verification items recorded in `docs/implementation/PHASE_4B_MANUAL_VERIFICATION.md` per sub-track.
- Update `PHASE_4B_PROGRESS.md` after every commit.
- Append to `IMPLEMENTATION_LEDGER.md` at phase end (no new audit-FLOW IDs in 4b — record under "Phase 4b" with the prompt's finding numbers from inventories 01/03/04/06).
- AuditLog `targetType` enum stays lowercase (3de gotcha). W0-EMAIL writes a `whitelabel` audit entry on Approve via the existing audit middleware — verify enum value already covered.
- `git add <file>` per commit; never `git add -A`.
- Bilingual strings: every new UI string lands in both `localization/ar.json` and `localization/en.json` (web) and the mobile `localization/{ar,en}.js` blocks.

---

## 4. Out-of-scope (Phase 4b)

Carry to 4c / 4d / 5 explicitly:

- **4c.** Visual + Taqnyat template system (TemplateModel + TemplateCategoryModel + TaqnyatTemplateModel + admin pages + dynamic StepThree + dynamic `_getEventBodyParams` + rename refactor + mobile canvas-bake pipeline + naming refactor on web/mobile/DB). Inventory 08's output is the gating artifact.
- **4d.** Mobile update-event consolidation + atomic step-2 endpoint + shared Zod-schema package.
- **5.** Audit-log-everywhere on RSVP/check-in (3de hand-off), Detox / Maestro mobile UI baseline, server-side admin-list search (Phase 4 anomaly), AuditLog enum extension for plan/addon, `backfill-guest-access-token-expiry.js --apply`, universal-link manifests (apple-app-site-association + assetlinks.json), admin-export saveBlobAndShare parity.

Explicitly **not** in 4b:

- Removing `EventModel.invitationSettings` (4c keeps it dual-write; post-4c-merge cleanup phase removes).
- Touching `_getEventBodyParams` (4c W0-DYNAMIC).
- Any Taqnyat-template work, including the Taqnyat-via-direct-fetch in current StepFour.
- Mobile update-wizard restructuring (4d).

---

## 5. Hand-offs from Phase 4 honored here

- Web `/setup-password/{token}` page (Phase 4 final report `Hand-offs to Phase 5 → Web /setup-password/{token} page`) — closed in W1-WL-EMAIL.
- `GET /events/:eventId/staff-tokens` endpoint — closed in W0-STAFF (the Phase 4 final report noted the endpoint was redundant for the revoke flow but Peter still asked for an explicit "active staff tokens" list view).
- Server-side admin-list search anomaly — **defer to Phase 5** (still out of 4b scope; recorded in this plan for traceability).
- Universal links — **defer to Phase 5**.
- Admin exports → `saveBlobAndShare` parity — **defer to Phase 5**.

---

## 6. Hand-offs to Phase 4c / 4d / 5 surfaced now

To populate `PHASE_4B_REPORT.md` "Hand-offs":

- **4c entry points:**
  - Inventory 08 final mapping (Wave −1 output) — locked by Peter post-4b merge.
  - Wave −1 also surfaces any sub-fields the rename touches that 4b's W1-UNIFY couldn't drop the duplicate logic on; those become 4c rename targets.
  - The new `PartialFailureBanner` component shape — 4c's mobile companion can mirror it.
- **4d entry points:**
  - Atomic `PATCH /events/:id/step2` endpoint (4d W0-ATOMIC) — uses the same capacity guard literal added in 4b W0-RBAC; coordinate constant placement (`labbe-backend-/src/shared/constants/events.js` if not present, otherwise inline).
  - Mobile `screens/host/UpdateEventScreen.js` — already exists at 407 lines (Phase 4 carry); 4d's W1-MOBILE-UPDATE consolidates it under `screens/update-event/` and aligns step structure with the post-4c web wizard.
  - `useEventActionGate` hook (mobile companion shipped in W2-POLL-FAIL) — 4d update wizard reuses for live-event lockout UX.
- **5 entry points:**
  - Removal of legacy `PATCH /events/:id/invitation-settings` (kept dual-write throughout 4c; Phase 5 drops it once one release cycle elapses).
  - Removal of legacy `PATCH /events/:id/guest-list` and `PATCH /events/:id/staff-list` once 4d's atomic `/step2` is live for one cycle (per Phase 4d hand-off list).

---

## 7. Stop gate criteria

**Wave −1 stop gate (Inventory 08):**
- One file at `docs/inventory/phase-4-extension/08-event-shape-rename-mapping.md` with the five tasks per the inventory-08 prompt completed.
- Task 4 (rename table) has every row marked `agree | propose alternative | needs Peter decision`.
- Task 5 (migration considerations) has concrete answers (or "needs Peter decision") for all 5 sub-questions.
- §7 of the inventory output (Open questions) has enough context to decide each in 1–2 minutes.
- Branch is `inventory/phase-4c-preflight` cut from `phase-4-merged` for the inventory commit; the mapping file is then **also** copied into 4b's branch for visibility.

**Wave 0 stop gate:**
- All three backend specs in `phase-4b-smoke-tests/static-checks-4b.js` PASS.
- `curl GET /api/v2/events/stats/:id` with whitelabel-admin token returns 200 for tenant event, 403 for cross-tenant. Verified via mock or DB-seeded staging.
- `curl PATCH /api/v2/events/:id/guest-list` with reduced count returns 400 / `GUEST_LIST_BELOW_CONFIRMED`.
- `curl POST /api/v2/messaging/schedule` with `now + 24h` returns 400 / `SCHEDULE_TOO_SOON`.
- `curl GET /api/v2/events/:eventId/staff-tokens` returns the seeded staff tokens for the event.
- `PUT /api/v2/admin/whitelabels/:id/status` with `{status: 'approved', dispatchSetupEmail: true}` triggers email dispatch (mock asserts the call).

**Wave 1 stop gate:**
- All four roles (host, admin, whitelabel_admin, whitelabel_moderator) navigate from a single-event page to the unified update-event page; the wizard renders with the role-aware branches, no duplicate component tree visible in the Network panel (single bundle hit for the page).
- `app/[lang]/admin-dash/update-event/_components/UpdateEventContent.jsx` is **deleted**.
- Update wizard step 4 dispatches `useUpdateLaunchSettings` on save (verified via React Query devtools).
- Live event: every form input outside step 2 (allow-add-only mode) is disabled with the lockout banner copy.
- An event with `status: 'failed'` renders `EventFailureBanner` + manual-retry button on the host event page; clicking retry triggers `POST /events/:id/retry-launch` (verified via Network panel).
- An event with `messagingStatus.failedCount > 0` AND `status === 'live'` renders the new `PartialFailureBanner`.
- Admin clicks Approve on a `pending` whitelabel → `ApproveWhitelabelDialog` opens → confirm → email arrives in inbox → user clicks email link → `/setup-password/[token]/page.jsx` validates token → password set → user redirected to dashboard. Verified end-to-end on staging.

**Wave 2 stop gate:**
- Mobile single-event page polls when status is `live` (30 s) or `completed` (5 min). Confirmed via React DevTools or RN debug logs.
- Mobile failure block + partial-failure banner render correctly (matches web shape).
- Mobile `useEventActionGate` produces the same gate state as web for the same event payload (parity test in manual checklist).
- Mobile staff-token list returns real records and revoke action returns 200; the row's `isRevoked` flag flips optimistically.

**Overall stop gate:**
- All wave stop gates pass.
- `PHASE_4B_PROGRESS.md` reflects done/blocked status per track.
- `PHASE_4B_REPORT.md` written with the hand-off section enumerating 4c entry points (incl. inventory 08 lock).
- `PHASE_4B_MANUAL_VERIFICATION.md` listed for Peter, MUST-VERIFY items signed off.
- `IMPLEMENTATION_LEDGER.md` updated under "Phase 4b" with the inventory references (01 §5.1, §7 gap 4 / 03 §5 gap 2 — Bug #6 / 03 §gap-1 / 04 §7 gap 1 / 04 §gap-4 / 06 §5 gap GAP 5 / 07 Task 1).
- Phase 4 / 3de / 3abc / 2 / 1 smoke regressions re-run with no new failures.
- Branch pushed to `origin/implementation/phase-4b-tier-consistency`.

---

## 8. Anti-patterns to avoid (carried from prompt + audit-grounded)

- Do **not** create a new admin update-event page with its own component tree. The 392-line duplicate is going **away**, not getting fanned-out.
- Do **not** introduce role-specific component files (e.g., `AdminEventActionsHeader.jsx`).
- Do **not** duplicate gate logic in a fourth place; consume `useEventActionGate`.
- Do **not** silently change `templateImage` storage shape — that's 4c.3 territory.
- Do **not** swap `@/hooks/events` for `@/hooks/reactQueryHooks/useEvents` — the latter is a deprecated re-export wrapper; the actual implementation lives at `@/hooks/events`. Touching imports is a no-op masquerading as a fix.
- Do **not** add `validateSetupToken`/`setupPassword` directly inside `SetupPassword.js` via raw `fetch`; route through `useAuthMutation.js` so the existing `apiClient`-style refresh wrapper applies.
- Do **not** skip the bilingual translation. New copy strings (`approveWhitelabelDialog.*`, `partialFailureBanner.*`, `eventFailureBlock.manualRetryDisabled`, etc.) land in both `ar.json` and `en.json`.
- Do **not** broaden scope. If a finding is not in §2, defer with a hand-off note.

---

## 9. File ownership conflict map

If two tracks need the same file, merge into one track. Single-source-of-truth ownership:

| File | Owner | Notes |
|------|-------|-------|
| `events.routes.js` | W0-STAFF (after W0-RBAC) | Sequential within Wave 0. |
| `events.controller.js` | W0-STAFF (after W0-RBAC) | Sequential. |
| `events.service.js` | W0-RBAC | W0-STAFF only adds a service method, no overlap with W0-RBAC's RBAC + capacity-guard edits. |
| `messaging.service.js` | W0-RBAC | Schedule min-date addition. |
| `admin.service.js` / `admin.controller.js` | W0-EMAIL | No overlap with W0-RBAC. |
| `WhitelabelDetailsContent.jsx` | W1-WL-EMAIL | W1-UNIFY does not touch this file. |
| `EventActionsHeader.jsx` (web) | W1-GATE-FAIL | W1-UPD only modifies `host/update-event/page.js`. |
| `EventStats.jsx` (host event-page consumer) | W1-GATE-FAIL | Mounts the new `PartialFailureBanner`. |
| `useEventForm.js` | W1-UPD | Lock branches. |
| `useAuthMutation.js` (web) | W1-WL-EMAIL | New mutations. |
| `SingleEventStats.js` (mobile) | W2-POLL-FAIL | W2-STAFF only edits `eventsService2.js` + the staff-tab consumer; no overlap. |
| `eventsService2.js` (mobile) | W2-STAFF | W2-POLL-FAIL does not touch services. |

---

## 10. Final deliverables

- All commits on `implementation/phase-4b-tier-consistency`.
- `docs/implementation/PHASE_4B_PLAN.md` (this file), `PHASE_4B_PROGRESS.md`, `PHASE_4B_REPORT.md`, `PHASE_4B_MANUAL_VERIFICATION.md`.
- `docs/inventory/phase-4-extension/08-event-shape-rename-mapping.md` (inventory output, locked by Peter).
- `IMPLEMENTATION_LEDGER.md` updated.
- `docs/implementation/phase-4b-smoke-tests/` populated with the IIFE static checks.
- Smoke tests green (4b new + 4 / 3 / 2 / 1 regression).
- Hand-off section in REPORT clearly enumerates Phase 4c entry points.

When everything is green, ping Peter for review.
