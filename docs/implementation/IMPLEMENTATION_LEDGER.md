# Halla Implementation Ledger

Single source of truth for every audit finding's implementation status.

**Statuses:** `not started` | `in progress` | `closed in PHASE_N (commit <SHA>)` | `deferred (reason)`

**Scope:** All flow-level findings (FLOW-NN-FNN) plus cross-flow findings (PIPELINE-FNN, RBAC-FNN, TENANT-FNN). Total finding IDs tracked: 125 (derived from `docs/audit/FINDINGS_SUMMARY.md`; the audit's stated total of 129 includes overlapping IDs that resolve to the same finding e.g. `FLOW-18-F01 / PIPELINE-F02`).

> Some IDs in the audit are paired (e.g. `TENANT-F01 / RBAC-F02`, `PIPELINE-F02 / FLOW-18-F01`). When closed, both halves are recorded under the canonical (cross-flow) ID and aliased here.

---

## Closed in Phase 0

- **TENANT-F01 / RBAC-F02** — closed in PHASE_0 (commit `dc20aef`)
  - `filterByWhitelabel` no longer hands ADMIN / MODERATOR a `{ whitelabelId: null }` filter.
  - All admin user-creation paths require a `whitelabelId`.
  - `scripts/audit-admin-whitelabel.js` reports any pre-existing rows still missing one.
- **PIPELINE-F02 / FLOW-18-F01** — closed in PHASE_0 (commit `31a69bc`)
  - WhatsApp webhook HMAC verification now fails closed.
  - `WHATSAPP_APP_SECRET` is required at server startup.

---

## Closed in Phase 1a (auth redesign)

Commit: `[PHASE-1a]` on branch `claude/implement-phase-1-1b-PO0KU`.

- **FLOW-01-F01** — JWT TTL flipped from 90d to 15m + 30d rotating refresh.
- **FLOW-01-F02** — `POST /auth/refresh` exists, rotates, revokes the old token.
- **FLOW-01-F03** — Mobile refresh token in `expo-secure-store`; access token in memory only.
- **FLOW-01-F05** — Server-side revocation via `RefreshTokenModel`; replay = chain revoke.
- **FLOW-01-F06** — Legacy `signToken` / `createSendToken` removed; one source of truth.
- **FLOW-01-F07** — `LOCK_TIME` is now 30 minutes.
- **FLOW-05-F01** — Same constant + `resetPassword` clears `lockUntil` and `loginAttempts`.
- **FLOW-05-F02** — Mobile `requireRole(user)` hard-fails if server omits role.
- **FLOW-05-F03** — Mobile navigator surfaces error for unsupported roles.
- **FLOW-06-F01** — Reset-link TTL 1 hour; email body updated.
- **FLOW-06-F02** — `resetPassword` clears lock + revokes all refresh tokens.
- **FLOW-06-F03** — `resetPasswordAPI` + `RESET_PASSWORD` endpoint added on mobile (deep-link UI is Phase 4).

---

## Closed / progressed in Phase 1b (utilities)

Commit: `[PHASE-1b]` on branch `claude/implement-phase-1-1b-PO0KU`.

- **PIPELINE-F05** — Launch cron uses UTC math via `timezone.isDue`.
- **FLOW-25-F05** — S3 utility fails closed; no silent local-disk fallback.

Foundations laid (full wiring continues in Phases 2–5):
- Idempotency utility (model + middleware + helper) wired into `POST /addons/purchase`.
- Audit log middleware wired into `PATCH /admin/vendors/:id/status`.
- Payment scaffold (Moyasar real + stub factory) wired into `subscriptions.service.subscribe`.

---

## Closed in Phase 3abc (RSVP pipeline coherence — ordering / dispatch / failure)

Branch: `claude/implement-phase-3-plans-ZWa40`. See `PHASE_3abc_REPORT.md`.

- **PIPELINE-F01 / FLOW-14-F01** — send-then-mark-live ordering in `runEventLaunch` / `scheduleEventLaunch`.
- **PIPELINE-F03** — compensating `releaseInvites` in `events.service.createEvent`.
- **PIPELINE-F04 / FLOW-15-F01** — `failed` value added to EVENT_STATUS enum.
- **FLOW-14-F04 / FLOW-17-F02** — Taqnyat sends carry idempotency keys via `withIdempotency` (per-attempt namespacing).
- **FLOW-15-F02** — `scheduleEventRetry` cron auto-invokes retry; backoff 5m/30m/2h/6h/12h, max 5 attempts, 24h grace.
- **FLOW-15-F03** — "We're sorry" failure UI on web (`EventFailureBanner.jsx`) and mobile (`EventFailureBanner.js`).
- **FLOW-15-F04** — Manual retry endpoint `POST /events/:id/retry-launch` + UI button (RBAC: host / wl-admin / admin / super_admin).
- **FLOW-15-F05** — Failure notifications fire on terminal fail: in-app + email to host, in-app to admins/super_admins.
- **FLOW-17-F01** — `runBatched` utility (concurrency 5, 10/sec) replaces 100ms serial loop in `sendBulk` and `scheduleGuestReminders`.
- **FLOW-21-F01** — Same `runBatched` + idempotency in post-event `sendBulkAccessEmails` and `_generateTokensAndNotify`.

---

## Closed in Phase 3de (webhook / RSVP / scanner / post-event)

Branch: `claude/implement-phase-3-plans-ZWa40` (same branch as 3abc, separate commits). See `PHASE_3de_REPORT.md`.

- **FLOW-18-F01 / PIPELINE-F02** — verification close (Phase 0 originally implemented; 3d.1 adds the 4-scenario static-check spec).
- **FLOW-18-F02** — Webhook host-notification dedup via `withIdempotency` keyed on `payload.messageId` (or 30s-bucket SHA fallback).
- **FLOW-18-F03** — Guest QR rotation endpoint `POST /events/:eventId/guests/:guestId/rotate-qr`; revoked tokens return 410 Gone with `reason: 'qr_rotated'`.
- **FLOW-19-F02** — RSVP submit idempotency middleware on `POST /guests/:id/rsvp` with derived key shape `rsvp_<sha256(eventId:guestId:choice)>`.
- **FLOW-20-F01** — Staff token revocation endpoint `POST /events/:eventId/staff/:staffId/revoke` (RBAC: host / wl-admin / admin / super_admin); idempotent at action level.
- **FLOW-20-F03** — Check-in idempotency via atomic CAS in `_performIdempotentCheckIn` (Guest doc `status` field is the primitive — `findOneAndUpdate({ status: { $ne: 'checked_in' } })` ensures at most one caller's update lands; replays return `alreadyCheckedIn: true` with the original `checkedInAt`). Chose this over the HTTP idempotency cache because the cache returns the first-call body verbatim — wrong for the "already checked in" UX.
- **FLOW-21-F03** — `GuestAccessToken` expiry + manual-revoke endpoint `POST /events/:eventId/guests/:guestId/revoke-access`; 410 Gone for `qr_expired` / `qr_revoked`. Backfill script `scripts/backfill-guest-access-token-expiry.js` ships **NOT YET RUN**.

Drive-by improvements (no FLOW ID — recorded for traceability):
- AuditLog `targetType` enum extended with `staff_access_token`, `guest_access_token`, `rsvp`.
- `GuestAccessToken.validateToken` now returns structured `reason` (qr_invalid / qr_rotated / qr_revoked / qr_expired) instead of a single opaque string.
- Stats polling cadence wired in web + mobile (30s live / 5min completed / off otherwise) per Phase 3 master decision Type C.

---

## Closed in Phase 4 (mobile parity + admin gaps)

Branch: `claude/implement-phase-4-3lGwb`. See `PHASE_4_REPORT.md`.

- **FLOW-11-F01** — closed in PHASE_4 (commit `9ba4717`)
  - Mobile EventSummary surfaces `scheduleDate` / `scheduleTime` per D3
    + "Launches immediately on submit" fallback. Timezone-aware via
    `utils/locale.js#formatDateTime`.
- **FLOW-23-F03** — closed in PHASE_4 (verified existing)
  - Mobile ticket assignment UI was already shipped in
    `components/admin-dashboard/tickets/AssignTicketModal.js`. Phase 4
    re-confirmed via the smoke-check audit.
- **FLOW-23-F04 / FLOW-28-F01..F04** — closed in PHASE_4 (commit `203c7d8`)
  - Host event list + per-event guest exports use a new
    `utils/download.js#saveBlopAndShare` helper (expo-file-system +
    expo-sharing). Admin tier exports keep using `Linking.openURL`
    (already worked); the saveBlobAndShare parity is a Phase 5
    follow-up.

Hand-offs from Phase 3de that closed in Phase 4 (no audit-FLOW IDs):

- Mobile staff-token revocation UI — closed in PHASE_4 (W2-STAFF / `e14fb44`).
- Mobile guest QR rotation UI — closed in PHASE_4 (W2-QR / `e14fb44`).
- Mobile manual GuestAccessToken revocation UI — closed in PHASE_4 (W2-GAT / `e14fb44`).
- Mobile stats polling consumer (Phase 3d.4 hand-off) — confirmed in PHASE_4 (W1-STATS / `2f2c52b`).

Master-plan items that closed in Phase 4 (no audit-FLOW IDs):

- Mobile centralized auth-token interceptor + 30 s request timeout —
  W0-AUTH / `4a13925`. Finishes the Phase 1a migration started under M-13.
- Mobile error boundary at app root — W0-ERR / `3fc7d51`.
- Mobile RTL via `I18nManager.forceRTL(true)` (gated outside Expo Go) —
  W0-RTL / `4f5b3e5`.
- Mobile Arabic numerals via `utils/locale.js#formatCount` and
  friends — W0-RTL / `4f5b3e5`.
- Mobile pagination via `useInfiniteQuery` + `AdminFlatList` infinite
  scroll on hosts / vendors / events / tickets / whitelabels / payments —
  W3-PAGE / `599e006`.
- Whitelabel post-approval setup-password mobile screen +
  `halla://setup-password/:token` deep link — W3-WL / `dd8395b`.

Drive-by fixes (no audit-FLOW IDs):

- `vendorService` AsyncStorage stale auth-token key replaced with
  `useAuthStore.getState().token`.
- `marketplaceService` dedicated 30 s axios instance.
- `MapPicker`, `App.js` push-token, `useLocations`, `useEventMutations`,
  `useTicketMutations`, `WhitelabelDetailsScreen` admin features endpoint
  all routed through `apiFetch` / `fetchWithTimeout` for the 30 s
  timeout + auth refresh.
- `PaymentList` aggregate stats now from `/admin/payments/summary` (the
  paginated list response no longer carries totals).

---

## Closed in Phase 4b (tier consistency + UX gates)

Branch: `claude/implement-phase-4b-MgwjZ`. See `PHASE_4B_REPORT.md`.

Inventory-surfaced findings closed (no audit-FLOW IDs — tracked under
the inventory references the master plan's §9 quick-reference table
calls out):

- **Inventory 01 §5.1 / §7 gap 4** — Stats RBAC for whitelabel tier
  closed in PHASE_4B (`62b0cab` W0-RBAC). `_buildScopedEventQuery`
  resolves single-event scope per role (host / SUPER_ADMIN / ADMIN /
  MODERATOR / WHITELABEL_ADMIN / WHITELABEL_MODERATOR); tenant-scoped
  roles without a whitelabelId fail closed.
- **Inventory 03 §gap-2 / Bug #6** — Capacity-floor guard closed in
  PHASE_4B (`62b0cab` W0-RBAC). `updateGuestList` rejects newCount
  below confirmed-RSVP count with `GUEST_LIST_BELOW_CONFIRMED` (HTTP
  400).
- **Inventory 03 §gap-3** — Launch settings dispatch wired in the
  unified update wizard via `useUpdateLaunchSettings` (`019cc9b`
  W1-UPD). No payload emitter today per D7 (schedule stays
  post-creation).
- **Inventory 04 §gap-1** — Schedule pipeline gates (min-date) closed
  in PHASE_4B (`62b0cab` W0-RBAC). `messaging.scheduleBulkSend`
  rejects schedules below `SCHEDULE_MIN_LEAD_HOURS` (default 48h,
  env-overridable) with `SCHEDULE_TOO_SOON`.
- **Inventory 04 §gap-2 / §gap-5** — Failure UI closed in PHASE_4B
  (`0ff55db` W1-GATE-FAIL on web + `8b324f1` W2-POLL-FAIL on mobile).
  `useEventActionGate` hook centralises gate state; new
  `PartialFailureBanner` (web + mobile) renders for live / completed
  events with `messagingStatus.failedCount > 0`.
- **Inventory 06 §5 GAP 5 / 07 Task 1** — Whitelabel setup-password
  email + page closed in PHASE_4B (`239d6c3` W0-EMAIL +
  `0840896` W1-WL-EMAIL). Backend mints the token + sends the
  existing `whitelabelApproval` template behind a
  `dispatchSetupEmail` flag; FE Approve dialog drives it; new web
  `/setup-password/[token]` page consumes the link.
- **Inventory 08 (NEW Wave −1)** — `Event.invitationSettings` rename
  mapping doc landed (`dfb2579` INV08).
  `docs/inventory/phase-4-extension/08-event-shape-rename-mapping.md`
  with all 5 tasks + §7 open questions awaiting Peter's lock before
  4c kicks off.

Hand-offs closed in Phase 4b (no audit-FLOW IDs — Phase 4 final report
carry-forwards):

- **Web `/setup-password/[token]` page** — closed in PHASE_4B
  (`0840896` W1-WL-EMAIL). The Phase 4 final report flagged the
  email's link landing on a 404; the route + form ship now.
- **`GET /events/:eventId/staff-tokens` endpoint + mobile UI** —
  closed in PHASE_4B (`448ffa5` W0-STAFF + `da10e05` W2-STAFF). The
  Phase 4 final report noted the endpoint was redundant for the
  revoke flow but Peter still asked for an explicit "active staff
  tokens" list view.

Drive-by improvements (no audit-FLOW IDs — recorded for traceability):

- Per-step PATCH service methods (`updateEventDetails`,
  `updateGuestList`, `updateStaffList`, `updateInvitationSettings`,
  `updateLaunchSettings`, `sendTestMessage`) accept a full user
  context and resolve scope via `_buildScopedEventQuery`. Required
  for the unified update wizard (W1-UNIFY) to work for admin /
  whitelabel-admin / whitelabel-moderator without 404'ing.
- Admin update-event 392-line duplicate
  (`labbe/app/[lang]/admin-dash/update-event/_components/UpdateEventContent.jsx`)
  deleted. Single source of truth lives at
  `app/[lang]/host/update-event/_components/UpdateEventWizard.jsx`.
- AuditLog `targetType: 'whitelabel'` row written on
  `whitelabel.status_update` per the Phase 4b plan standing-rule
  reminder (already in the enum; no schema change).

---

## Open

- FLOW-01-F04 — not started (Phase 1c)
- FLOW-02-F01 — not started
- FLOW-02-F02 — not started
- FLOW-02-F03 — not started
- FLOW-03-F01 — not started
- FLOW-03-F02 — not started
- FLOW-03-F03 — not started
- FLOW-03-F04 — not started
- FLOW-04-F01 — not started
- FLOW-04-F02 — not started
- FLOW-04-F03 — not started
- FLOW-04-F04 — not started
- FLOW-06-F04 — not started
- FLOW-07-F01 — not started
- FLOW-07-F02 — not started
- FLOW-07-F03 — not started
- FLOW-08-F01 — not started
- FLOW-08-F02 — not started
- FLOW-08-F03 — not started
- FLOW-09-F01 — not started
- FLOW-09-F02 — not started
- FLOW-09-F04 — not started
- FLOW-10-F01 — not started
- FLOW-10-F02 — not started
- FLOW-10-F03 — not started
- FLOW-11-F01 — closed in PHASE_4 (commit `9ba4717`)
- FLOW-11-F02 — not started
- FLOW-11-F03 — not started
- FLOW-11-F04 — not started
- FLOW-11-F05 — not started
- FLOW-12-F01 — not started
- FLOW-12-F02 — not started
- FLOW-12-F03 — not started
- FLOW-12-F04 — not started
- FLOW-13-F01 — not started
- FLOW-13-F02 — not started
- FLOW-13-F03 — not started
- FLOW-13-F04 — not started
- FLOW-13-F05 — not started
- FLOW-14-F01 — closed in PHASE_3a (commit pending)
- FLOW-14-F02 — not started
- FLOW-14-F03 — not started
- FLOW-14-F04 — closed in PHASE_3b (commit pending)
- FLOW-14-F05 — not started
- FLOW-15-F01 — closed in PHASE_3a (commit pending)
- FLOW-15-F02 — closed in PHASE_3c (commit pending)
- FLOW-15-F03 — closed in PHASE_3c (commit pending)
- FLOW-15-F04 — closed in PHASE_3c (commit pending)
- FLOW-15-F05 — closed in PHASE_3c (commit pending)
- FLOW-15-F06 — not started
- FLOW-16-F01 — not started
- FLOW-16-F02 — not started
- FLOW-16-F03 — not started
- FLOW-17-F01 — closed in PHASE_3b (commit pending)
- FLOW-17-F02 — closed in PHASE_3b (commit pending)
- FLOW-17-F03 — not started
- FLOW-17-F04 — not started
- FLOW-18-F02 — closed in PHASE_3d (commit pending)
- FLOW-18-F03 — closed in PHASE_3e (commit pending)
- FLOW-19-F01 — not started
- FLOW-19-F02 — closed in PHASE_3d (commit pending)
- FLOW-19-F03 — not started
- FLOW-20-F01 — closed in PHASE_3e (commit pending)
- FLOW-20-F02 — not started
- FLOW-20-F03 — closed in PHASE_3e (commit pending)
- FLOW-21-F01 — closed in PHASE_3b (commit pending)
- FLOW-21-F02 — not started
- FLOW-21-F03 — closed in PHASE_3e (commit pending)
- FLOW-21-F04 — not started
- FLOW-21-F05 — not started
- FLOW-22-F01 — not started
- FLOW-22-F02 — not started
- FLOW-22-F03 — not started
- FLOW-23-F01 — not started
- FLOW-23-F02 — not started
- FLOW-23-F03 — closed in PHASE_4 (verified existing `AssignTicketModal`)
- FLOW-23-F04 — closed in PHASE_4 (commit `203c7d8`)
- FLOW-24-F01 — not started
- FLOW-24-F02 — not started
- FLOW-24-F03 — not started
- FLOW-24-F04 — not started
- FLOW-24-F05 — not started
- FLOW-25-F01 — not started
- FLOW-25-F02 — not started
- FLOW-25-F03 — not started
- FLOW-25-F04 — not started
- FLOW-26-F01 — not started
- FLOW-26-F02 — not started
- FLOW-26-F03 — not started
- FLOW-26-F04 — not started
- FLOW-26-F05 — not started
- FLOW-27-F01 — not started
- FLOW-27-F02 — not started
- FLOW-27-F03 — not started
- FLOW-27-F04 — not started
- FLOW-28-F01 — closed in PHASE_4 (commit `203c7d8`)
- FLOW-28-F02 — closed in PHASE_4 (commit `203c7d8`)
- FLOW-28-F03 — closed in PHASE_4 (commit `203c7d8`)
- FLOW-28-F04 — closed in PHASE_4 (commit `203c7d8`)
- PIPELINE-F01 — closed in PHASE_3a (commit pending)
- PIPELINE-F03 — closed in PHASE_3a (commit pending)
- PIPELINE-F04 — closed in PHASE_3a (commit pending)
- RBAC-F01 — not started
- RBAC-F03 — not started
- RBAC-F04 — not started
- TENANT-F02 — not started
- TENANT-F03 — not started

---

## Notes

- The audit summary lists 129 findings (117 flow + 12 cross-flow). Five flow-level findings (e.g. `FLOW-09-F03`) are referenced in the master plan but absent from the cross-flow extraction, and a handful of cross-flow findings overlap with their flow-level twin (paired IDs above). The 125 IDs above cover every uniquely identified finding plus the cross-flow set; if Phase 1 discovers a missing ID it is added in arrears.
- Update this file at the end of every phase. Add a new "Closed in Phase N" section, move the corresponding IDs out of "Open", and record the commit SHA.
