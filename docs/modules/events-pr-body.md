## Summary

Implements `docs/modules/events-fullstack-review-plan.md` end-to-end across backend, web, and mobile. 16 commits, no DB schema changes, no behavioural regressions intended — file structure and external imports are preserved through façade modules.

### Backend
- New `events.validation.js` (Zod) wired onto every body-bearing route via `validateZod`; reusable `parseFormDataJsonFields` middleware lifted out of the controller.
- D-R3 invariant fix: `DELETE /events/:eventId/staff/:staffId` now revokes the removed staff's access token immediately instead of waiting 48h.
- Whitelabel scope on `GET /events/export/events`, idempotency on `POST /:eventId/notify-staff` and `PATCH /:id/test-message`, transaction on `POST /events/bulk-delete`, audit-log calls added to every event mutation.
- `events.service.js` (2498 lines) split into 7 focused sub-services + a thin façade that preserves the existing public API; `events.routes.js` extracts `/admin/*` into `events.admin.routes.js`; `events.controller.js` extracts admin handlers into `events.admin.controller.js`.
- `console.error/warn` routed through `shared/utils/logger`, role-string literals replaced with `ROLES.*`, plain `throw new Error` swapped for typed errors, `.lean()` added to read-only export paths, Swagger drift fixed (new request schemas + error responses, `403→400` mismatch corrected, missing block on `POST /:eventId/staff/:staffId/revoke`).

### Web
- Host EventsTable: collapsed triple-fallback chains to canonical `data?.data`; rendered loading + error branches (was a silently-empty table on either branch); split 308-line component into `EventsTable.jsx` + `EventsTableToolbar` hook + `EventsTableActions` hook.
- create-event: split `Summary.js` (715→4 files), `StepTwo.js` (472→3 files); inline header styles moved to CSS module.
- admin-dash: split `AdminGuestTable.jsx` (343→3 files; original split shape didn't match the code so re-scoped to handlers hook + popups + table body).
- Mutation factory: `useEventMutation.js` (460) split into 4 domain sub-files + thin façade that preserves all 21 convenience hooks.
- Comment hygiene swept across the entire web events surface.

### Mobile
- Full ENDPOINTS migration in `eventsService2.js` (13 hardcoded `/${id}/...` strings → `ENDPOINTS.EVENTS.*`); added missing keys (`RETRY_LAUNCH`, `LIST_STAFF_TOKENS`, `UPDATE_GUEST`, …) and `ENDPOINTS.GUESTS.{ROTATE_QR, REVOKE_ACCESS}`.
- Canonical response shapes: collapsed every triple-fallback to `data?.data`; dropped dead `phone||mobile` and `respondAt` fallbacks after verifying the backend `Guest` schema.
- All `console.log` removed; `console.error` only inside catch+toast paths (≤10).
- `eventsService2.js` (964) split into 5 sub-services + thin façade; `useEventMutations.js` (415) split into 4 sub-files + façade; deprecated `EventsService.createEvent`/`updateEvent` removed (verified zero consumers).
- `UpdateEventScreen.js` (597) split into `UpdateEventScreen` + `useEventLoadAndGate` + `UpdateEventStepRenderer`; `EventsScreen.js` now renders `MakeYourFirst` empty-state when the event list is empty.
- 9 i18n keys added to `localization/locales/{en,ar}/events.json` (`validation.*` + `csv.headers.*`); `EventsService` validators return prefixed translation keys and the three live consumers (`GuestForm`, `ModeratorForm`, `EditGuestOrModeratorsModal`) translate via `t(key)`.

## Acceptance (§10)

- [x] No file in module exceeds the cap that the plan flagged.
- [x] All endpoints have current Swagger.
- [x] Web + mobile call the same paths with the same shapes for every endpoint.
- [x] No fallback chains in module data mapping.
- [x] No `// FLOW-…` / `// PHASE-…` / `// W0/W1/W2-…` / `// M-…` / `// BUG-…` comments in module surface area.
- [x] Every events mutation calls `logAudit`.
- [x] `DELETE /events/:eventId/staff/:staffId` revokes the staff token (D-R3).
- [x] `GET /events/export/events` honours whitelabel scope.
- [x] Idempotency middleware on `POST /:eventId/notify-staff` and `PATCH /:id/test-message`.
- [x] `POST /events/bulk-delete` runs inside a transaction.
- [x] `events.validation.js` exists and is wired into every non-trivial body route.
- [x] No `console.log` in committed mobile event-service code.
- [ ] **Visual smoke test still pending** — every page/screen needs a manual eyeball.

## Deferred (out of scope or needs you)

- **B.10** URL-state for host-table filters/search — plan flagged Medium-priority, deferable.
- **D.4** end-to-end smoke test — needs the app running.
- **D.5** optional `events-api-reference.md` doc — explicitly optional.
- **Step-count alignment** between create-event (4 forms + summary) and update-event (4 forms, no summary) — reality is the inverse of the original premise (create has the summary, update doesn't), so adding a summary step to update-event would be a product change rather than a refactor; flagged in the working conversation but not actioned here.

## Test plan

- [ ] Pull the branch and run web (`labbe`) + mobile (`halla-mobile`) locally; smoke-test the host create-event wizard end-to-end (steps 1→5 + submit).
- [ ] Open an existing event on web + mobile, push a step-2 update (guest+staff replace), confirm `PATCH /events/:id/step2` returns and the UI rehydrates.
- [ ] On host EventsTable: verify loading spinner appears while `useMyEvents` is fetching, error fallback appears on a forced 500.
- [ ] On admin-dash event detail: verify guest table actions (status update, delete) still work after the AdminGuestTable split.
- [ ] On host single-event: trigger `notify-staff` twice rapidly (same Idempotency-Key flow) — confirm no double SMS.
- [ ] Delete a staff member from a live event — confirm the staff-portal token is revoked immediately (within seconds, not 48h).
- [ ] On mobile EventsScreen with no events: confirm `MakeYourFirst` empty-state renders and "Create" navigates to `CreateEventScreen`.
- [ ] On mobile guest-add form: enter a duplicate phone — confirm the localised duplicate message renders in the active language (en/ar).
- [ ] Run `npm run lint` on `labbe` and `halla-mobile`; verify no new warnings.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
