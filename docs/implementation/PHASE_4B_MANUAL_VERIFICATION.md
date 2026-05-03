# Phase 4b — Manual verification checklist

For the items the smoke tests can't cover. Sign each off (initials + date) before declaring 4b done.

## Wave 0 — backend

- [ ] **W0-RBAC** Whitelabel-admin token hits `GET /api/v2/events/stats/:id` for an event in the same `whitelabelId` → 200. Cross-tenant call → 403.
- [ ] **W0-RBAC** Same for `GET /api/v2/events/:id`.
- [ ] **W0-RBAC** `PATCH /api/v2/events/:id/guest-list` with `guestList.length < confirmedRSVPCount` → 400 / `GUEST_LIST_BELOW_CONFIRMED`.
- [ ] **W0-RBAC** `POST /api/v2/messaging/schedule` with `scheduledDate < now + SCHEDULE_MIN_LEAD_HOURS` (default 48h) → 400 / `SCHEDULE_TOO_SOON`.
- [ ] **W0-STAFF** `GET /api/v2/events/:eventId/staff-tokens` returns the seeded `StaffAccessToken` rows for the event; revoked rows are flagged `isRevoked: true`.
- [ ] **W0-EMAIL** `PUT /api/v2/admin/whitelabels/:id/status` with `{status: 'approved', dispatchSetupEmail: true}` triggers email send (verify Mailtrap / log `[email] sent whitelabelApprovalEmail` or similar) AND mints a `passwordSetupToken`.

## Wave 1 — web

- [ ] **W1-UNIFY** Host, admin, whitelabel_admin, whitelabel_moderator each navigate from a single-event page to the unified update-event wizard. No new bundle for the admin/whitelabel route.
- [ ] **W1-UNIFY** `app/[lang]/admin-dash/update-event/_components/UpdateEventContent.jsx` is gone (`git status` clean after delete).
- [ ] **W1-UPD** Update wizard step 4 → save → React Query devtools shows `useUpdateLaunchSettings` mutation fired and event payload contains the new launch settings.
- [ ] **W1-UPD** Event in `live` status → every step except step 2 (allow-add-only) is disabled and the lockout banner copy is present in both AR and EN.
- [ ] **W1-GATE-FAIL** Event in `failed` status renders `EventFailureBanner` + manual retry button on the host event page.
- [ ] **W1-GATE-FAIL** Click retry → Network panel shows `POST /events/:id/retry-launch` with 200.
- [ ] **W1-GATE-FAIL** Event in `live` status with `messagingStatus.failedCount > 0` renders the new `PartialFailureBanner`.
- [ ] **W1-WL-EMAIL** Admin clicks Approve on a `pending` whitelabel → `ApproveWhitelabelDialog` opens → Confirm → email arrives → user opens `/setup-password/<token>` → form validates the token → password set → user redirected to dashboard.
- [ ] **W1-IMG-PATH** Spot-check three consumers of `event.invitationSettings.templateImage` use the `getMediaUrl` helper (or are documented as already URL-safe).

## Wave 2 — mobile

- [ ] **W2-POLL-FAIL** Mobile single-event screen polls every 30 s for `live` events, every 5 min for `completed`, no polling otherwise (verify via React DevTools or dev console).
- [ ] **W2-POLL-FAIL** Mobile `EventFailureBanner` + `PartialFailureBanner` both render; manual retry button works.
- [ ] **W2-POLL-FAIL** `useEventActionGate` returns the same gate state on mobile and web for the same event payload.
- [ ] **W2-STAFF** Mobile staff tab lists active staff tokens (from the new endpoint, not from `event.staffList`); revoke flips `isRevoked` optimistically and the revoke endpoint returns 200.
