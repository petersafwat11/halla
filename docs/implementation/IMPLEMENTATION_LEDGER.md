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

## Closed in Phase 4c (template-system unification)

Phase 4c was scoped to deliverables outside the original 131 audit
findings: template models, dual-write rename, dynamic Taqnyat var
mapping, admin templates editor, 6-step wizard. None of the audit
FLOW-IDs close as a direct result of this phase; the phase is tracked
by sub-track instead.

| Sub-track | Commit | Deliverable |
|-----------|--------|-------------|
| W0-MODEL | `28b562c` | TaqnyatTemplateModel + sync service/routes + daily 03:30 cron |
| W0-VISUAL-BACKEND | `401945b` | TemplateModel + TemplateCategoryModel + admin CRUD + presigned-POST + sharp + orphan GC + AuditLog enum extension |
| W0-RENAME | `ae2b97f` | EventModel canonical sub-objects (visualTemplate, taqnyatTemplate, guestReplies, invitationMessage, hostNote) + dual-write services + migration script |
| W0-DYNAMIC | `b2e9107` | Dynamic `_getEventBodyParams` resolver + 5-param legacy fallback + canonical reply chain |
| W1-VISUAL | `947d292` | Admin templates editor + sidebar + dynamic StepThree + dynamic TemplateForm + useUnsavedChanges hook |
| W1-TAQNYAT-ADMIN | `d4158d4` | Admin Taqnyat-templates page + Sync + Assign dialog |
| W1-WIZARD-RENAME | `773a2fc` | Locked 6-step wizard + StepFour rebuilt as Taqnyat picker + StepFive (NEW) |
| W2-MOBILE-WIZARD | `e855b93` | Mobile 6-step wizard + Taqnyat picker + canvasBake util + dead-dep removal |
| W2-MOBILE-RENAME | `beb03dd` | Mobile invitationSettings consumers read canonical first |

Smoke checks: `48 / 48` PASS via
`docs/implementation/phase-4c-smoke-tests/static-checks-4c.js`.
Full report in `PHASE_4C_REPORT.md`.

Hand-offs to Phase 4d:
- Schemas (`buildDynamicTemplateSchema`, `buildDefaultValues`) ready
  for the `@halla/shared-schemas` package migration.
- `useEventActionGate` mobile + web both accept canonical
  `taqnyatTemplate.templateRef`.

---

## Closed in Phase 4d (mobile update flow + create-event correctness + shared schemas)

Phase 4d was scoped to deliverables outside the original 131 audit
findings: a unified mobile update wizard, a `@halla/shared-schemas`
workspace package, an atomic guest+staff update endpoint, and the web
wizard switch-over to the new endpoint. None of the audit FLOW-IDs
close as a direct result of this phase; tracked by sub-track instead.

| Sub-track | Commit | Deliverable |
|-----------|--------|-------------|
| W0-ATOMIC | `43fdf10` | `PATCH /events/:id/step2` atomic endpoint with MongoDB transaction + standalone-topology compensation rollback. Reuses the Phase 4b W0-RBAC `GUEST_LIST_BELOW_CONFIRMED` capacity guard. Accepts both `supervisorsList` (web naming) and `staffList` (mobile naming). |
| W0-SCHEMAS | `666d4b6` | `@halla/shared-schemas` npm-workspaces package; root `package.json` declares workspaces; web + mobile schema files become re-export shims; new `updateEventSchema` for the unified wizard; `scripts/check-schema-drift.sh`. |
| W1-MOBILE-UPDATE | `72bb331` | Unified mobile update wizard at `screens/update-event/` covering host / admin / super-admin / whitelabel-admin / whitelabel-moderator with inline role gate + D10 lockout. Six new mutations (`useUpdateEventStep2` + 5 narrowed wrappers around `updateInvitationSettings`). |
| W1-MOBILE-CREATE-VERIFY | `454da63` | Manual verification doc landed; legacy `templateBrideName`-style flat-key unpack dropped from the relocated screen's `mapApiToFormValues`. |
| W1-WEB-ATOMIC | `feed084` | Web update wizard step 2 dispatches a single `PATCH /events/:id/step2` instead of `Promise.all([updateGuestList, updateStaffList])`. New `useUpdateEventStep2` hook + `buildStepPayload` step 2 returns merged payload. |

Smoke checks: `28 / 28` PASS via
`docs/implementation/phase-4d-smoke-tests/static-checks-4d.js`. The
in-process compensation simulation `atomic-step2-failure.js` returns
`7 / 7`. Full report in `PHASE_4D_REPORT.md`.

Hand-offs to Phase 5:
- Removal of compat aliases `PATCH /events/:id/guest-list` +
  `PATCH /events/:id/staff-list` after one release cycle.
- Removal of legacy host + admin re-export shim files
  (`halla-mobile/screens/host/UpdateEventScreen.js`,
  `halla-mobile/screens/admin-dashboard/UpdateEventScreen.js`).
- CI integration for `scripts/check-schema-drift.sh`.
- Migration of remaining schemas (auth, subscription, addon, plan,
  ticket, vendor, whitelabel) into `@halla/shared-schemas`.
- Backend Zod adoption on the renamed endpoints (D4d-6).
- MongoDB topology verification — confirm production is a replica set
  so transactions are the active code path.

---

## Hand-offs to Phase 5 (carried over from Phase 4c)
- Removal of legacy `Event.invitationSettings` after one release
  cycle.
- Production migration `migrate-event-shape.js --apply`.
- Production `seedInitialTemplates.js` after admin sign-off.
- Daily cron registration for `gcOrphanTemplateImages.js`.
- CloudFront provisioning + ClamAV virus-scan Lambda for template
  images.
- Adoption of `react-rnd` drag-resize wrapping in the editor.
- `InputGroup` / `TextArea` extension per v4.1 [PATCH 4–7].

---

## Closed in Phase 5 (audit log activation, edges, polish)

Branch: `claude/implement-phase-5-xP9mK`. See `PHASE_5_REPORT.md`.

### Track A — Foundation
- **FLOW-01-F05 (revisited)** — dual `/api/v2` mount removed from `src/app.js` — commit `12425c9`
- AuditLogModel `targetType` enum extended with `plan`, `addon` — commit `12425c9`
- `redactSensitive` export fixed in `auditLog.js` — commit `12425c9`

### Track B — Audit Log Wiring (new audit events, no new FLOW-ID closures)
- `auth.login_locked`, `auth.password_changed`, `auth.password_reset` audit calls wired in `auth.service.js` — commit `29cd203`
- `auth.logout` audit wired in `auth.controller.js` (jwt.decode best-effort) — commit `29cd203`
- `event.created`, `event.updated`, `event.deleted` audit calls wired in `events.service.js` — commit `bbab695`
- `event.exported` audit wired in `guests.controller.js` — commit `739dbd5`
- `post_event.content_revoked` + `targetType: 'event'` fix in `post-event.service.js` — commit `6270e64`
- `users.service.js` phone audit: plaintext phone removed from metadata — commit `8089e42`
- `notification.broadcast` audit wired in `notifications.controller.js` — commit `fcb2412`
- `vendor.status_updated` audit wired in `admin.service.js` — commit `e730e3d`

### Track C — Auth / Profile
- **FLOW-02-F01** — Host signup verification email + `GET /auth/verify-email-link` endpoint — commits `5d39d48`, `ef529e6`
- **FLOW-02-F02** — OTP soft-invalidation on first use (`used` flag, no delete) — commits `5d39d48`, `e8470cb`
- **FLOW-02-F03** — Welcome email on host signup — commit `ef529e6`
- **FLOW-04-F02** — Whitelabel logo passed through S3 via `processUploadedFiles` — commit `45725ab`
- **FLOW-04-F04** — Subdomain uniqueness: verified already enforced by sparse unique index on `domain.subdomain`
- **FLOW-06-F04** — Reset-password rate limit: verified `passwordResetLimiter` already wired in `auth.routes.js`
- **FLOW-07-F01** — Phone update OTP: `requestPhoneUpdate` / `confirmPhoneUpdate` controller + routes — commit `ac61287`
- **FLOW-07-F02** — Profile image S3 via `processUploadedFiles` (no local disk paths) — commit `427c772`
- **FLOW-07-F03** — Language sync: top-level `preferredLanguage` field on `UserModel` + profile update — commit `93816d1`

Deferred: **FLOW-04-F03** — PlanModel `limitsSchema.maxHosts` does not exist; requires schema design outside Phase 5 scope.

### Track D — Vendor / Marketplace
- **FLOW-03-F04** — Vendor status state machine: `→ pending` blocked in `updateVendorStatus` — commit `e730e3d`
- **FLOW-24-F01** — Vendor approval email sent when status → approved — commit `e730e3d`
- **FLOW-24-F02** — `vendor.status_updated` audit log on every status transition — commit `e730e3d`
- **FLOW-24-F04** — `profileCompleted` field added to `UserModel` vendorData — commit `3b93996`
- **FLOW-25-F01** — `ServiceModel.isPublic` default changed to `false` — commit `e730e3d`
- **FLOW-25-F04** — `inquiryCount` field added to `ServiceModel` — commit `e730e3d`
- **FLOW-26-F05** — `numberOfClicks` increment on `getVendorDetail` (fire-and-forget) — commit `e730e3d`

Deferred: **FLOW-03-F01**, **FLOW-03-F02**, **FLOW-03-F03**, **FLOW-24-F03**, **FLOW-24-F05** — not in Phase 5 scope.
Deferred: **FLOW-25-F02**, **FLOW-25-F03**, **FLOW-26-F01**, **FLOW-26-F02**, **FLOW-26-F04** — pre-existing or deferred to Phase 6.

### Track E — Event Lifecycle
- **FLOW-11-F03** — Guest phone deduplication before bulk insert (keep last occurrence) — commit `bbab695`
- **FLOW-12-F02** — Addon `extra_invites` summed from `AddonModel` via `_getAddonExtraGuests` — commit `bbab695`
- **FLOW-12-F04** — Legacy `requireSubscription` guard removed from `/:id/guest-list` + `/:id/staff-list` — commit `bbab695`
- **FLOW-13-F02** — Guest soft-delete fields (`deleted`, `deletedAt`) added to `GuestModel` — commit `bbab695`
- **FLOW-13-F04** — Event update status block list extended: `LIVE`, `PUBLISHED`, `ARCHIVED` added — commit `bbab695`
- **FLOW-13-F05** — Event audit log: `event.created` / `event.updated` / `event.deleted` wired — commit `bbab695`
- **FLOW-15-F06** — Taqnyat 429 rate-limit: guest marked `rateLimited: true` instead of failed — commit `bbab695`
- **FLOW-16-F01 / F02** — Legacy `POST /messaging/test` removed; frontend migrated to `PATCH /events/:id/test-message`; RSVP preview URL corrected — commit `bbab695`
- **FLOW-16-F03** — Per-event test message throttle (30s via `lastTestAt` field; admins exempt) — commit `bbab695`
- **FLOW-21-F02** — `pendingApproval` flag added to `PostEventContentModel` comment schema — commit `bbab695`
- **FLOW-21-F05** — `uniqueVisitors` array capped at 5000; `uniqueVisitorCount` counter for true count — commit `bbab695`
- **FLOW-22-F01** — In-memory 30s TTL stats cache added to `MessagingService` — commit `bbab695`
- **FLOW-22-F02** — `SMS_COST_SAR` env var read in `getDetailedStats` (default 0.15 SAR) — commit `bbab695`
- **FLOW-22-F03** — `email` removed from `invitation.method` enum in `GuestModel` — commit `bbab695`

### Track F — Notifications
- **FLOW-27-F01** — Notification idempotency via `withIdempotency` utility — commit `d6cc712`
- **FLOW-27-F02** — Scheduled notification delivery cron (every 5 min, `runBatched`) — commit `fcc2a8e`
- **FLOW-27-F03** — `NotificationPreferencesModel` cleanup — commit `71712ff`
- **FLOW-27-F04** — Email delivery writeback on notification send — commit `61a1955`

### Track G — Tickets / RBAC / Tenant
- **FLOW-23-F01** — Ticket state machine (`VALID_TRANSITIONS` matrix; terminal states enforced) — commit `acab4f7`
- **FLOW-23-F02** — `addReply` route `POST /:id/replies` + controller — commit `acab4f7`
- **RBAC-F01** — `getPageAccess` SUPER_ADMIN hierarchy fallback — commit `acab4f7`
- **TENANT-F02** — Tickets `getTickets` filtered by `whitelabelId` — commit `acab4f7`
- **TENANT-F03** — Admin broadcast scoped to tenant (`effectiveWhitelabelId`) — commit `fcb2412`

### Track H — Exports
- **FLOW-28-F04** — `exportWhitelabels` tenant-scoped via `whitelabelId` param — commit `e730e3d`

Smoke checks: `45 / 45` PASS via
`docs/implementation/phase-5-smoke-tests/static-checks-5.js` — commit `bd83968`.
Full report in `PHASE_5_REPORT.md`.

---

## Closed in Phase 6 — Track 0 (Ledger Reconciliation)

Branch: `claude/implement-phase-6-KL2nQ`. See `PHASE_6_PLAN_REVIEW.md` for verification evidence.

### Newly discovered discrepancies (code says closed, ledger said open):

- **FLOW-01-F04** — closed in PHASE_1a (verified in code)
  - Login lockout enforced at `auth.service.js:270-294`: `isLocked()` check, `incLoginAttempts()` on failure, `AccountLockedError` throw, audit log `auth.login_locked`, reset on success.
- **FLOW-03-F01** — closed in PHASE_5 (verified in code)
  - Vendor `serviceCategories` keys validated against `ALLOWED_CATEGORY_KEYS` set at `auth.service.js:503-514`.
- **FLOW-03-F02** — closed in PHASE_5 (verified in code)
  - Vendor `socialLinks` URL-validated with regex at `auth.service.js:517-525`.
- **FLOW-03-F03** — closed in PHASE_5 (verified in code)
  - Vendor signup files routed through `processUploadedFiles(files)` for S3 at `auth.service.js:541`.
- **FLOW-09-F02** — closed as by-design (not a bug)
  - Trial plan is permanent per-event plan with no expiry per Flow 09 Q3 decision. `scheduleSubscriptionStatusUpdate` cron excludes trial. No implementation needed.
- **FLOW-12-F01** — closed in PHASE_5 (verified in code)
  - `SubscriptionModel.findActiveForUser` already sorts `createdAt: -1, _id: -1` (newest first). `validateLimits` uses `[0]` which is now the newest subscription.
- **FLOW-13-F03** — closed as resolved by design change
  - Taqnyat native scheduling path (`taqnyatDeleteId`) removed in Phase 3a/4c. Platform owns send lifecycle via `runBatched`. No cancel logic needed.
- **FLOW-14-F02** — closed in PHASE_1b (verified in code)
  - `scheduleEventLaunch` in `scheduledTasks.js` already uses `parseEventTime()` + `isDue()` from timezone utility for Asia/Riyadh wall-clock comparison.
- **FLOW-14-F03** — closed in PHASE_3b (verified in code)
  - `sendBulk` in `messaging.service.js` already uses `runBatched()` with concurrency 5, rate 10/sec, adaptive 429 backoff.
- **FLOW-14-F05** — closed in PHASE_3a (verified in code)
  - Legacy Taqnyat native `scheduledDatetime` path removed from `scheduleEventLaunch`.
- **FLOW-24-F03** — closed in PHASE_5 (verified in code)
  - Same as FLOW-03-F03 — vendor signup files use `processUploadedFiles` at `auth.service.js:541`.
- **FLOW-24-F05** — closed in PHASE_5 (verified in code)
  - `updateVendorStatus` in `admin.service.js:654-661` writes `logAudit({ action: 'vendor.status_updated', ... })` on every transition.
- **FLOW-26-F01** — closed in PHASE_5 (verified in code)
  - `getPublicServices` in `services.service.js:49` populates `profile.vendorData.rating` in vendor populate fields.
- **FLOW-26-F02** — closed in PHASE_5 (verified in code)
  - `getPublicServices` in `services.service.js:26-30` filters to `VENDOR_STATUS.APPROVED` + `profileCompleted: true` via `User.distinct()`.

### Previously documented discrepancies (from PHASE_6_REMAINING_REPORT.md §4):

- **FLOW-07-F02** — closed in PHASE_5 (commit `427c772`)
  - Profile image uses `processUploadedFiles` — no local disk paths.
- **FLOW-11-F02** — closed in PHASE_4 (pre-existing)
  - `onBehalfOf` pattern exists in `createEvent`; admin path sets it from `req.body`.
- **FLOW-11-F05** — closed in PHASE_3 (pre-existing)
  - Idempotency middleware already on `POST /events` since Phase 3/4.
- **FLOW-13-F05** — closed in PHASE_5 (commit `bbab695`)
  - `event.created` / `event.updated` / `event.deleted` audit wired.
- **FLOW-16-F03** — closed in PHASE_5 (commit `bbab695`)
  - `lastTestAt` throttle added (30s via field; admins exempt).
- **FLOW-17-F03** — closed in PHASE_3b (pre-existing)
  - Bulk stats persisted after each batch.
- **FLOW-17-F04** — closed in PHASE_3b (pre-existing)
  - `guestIds` validation exists in `sendBulk` / targeting endpoints.
- **FLOW-21-F04** — closed in PHASE_5 (pre-existing)
  - Rename to `sendBulkAccessMessages` completed.
- **FLOW-25-F03** — closed in PHASE_5 (pre-existing)
  - `whatsapp` field already in `UserModel.socialLinks`.
- **FLOW-26-F05** — closed in PHASE_5 (commit `e730e3d`)
  - `numberOfClicks` increment on `getVendorDetail` (fire-and-forget).

---

## Open

- FLOW-04-F01 — not started (verify: whitelabelId requirement on admin create)
- FLOW-04-F03 — deferred (PlanModel maxHosts field absent; requires schema design)
- FLOW-08-F01 — not started (verify: plan CRUD routes may already exist)
- FLOW-08-F02 — not started (verify: `_guardLimitReductions` may already exist)
- FLOW-08-F03 — not started (verify: audit middleware may already be wired)
- FLOW-09-F01 — not started (verify: payment provider may already be wired in subscribe)
- FLOW-09-F04 — not started (verify: admin assign endpoint may already exist)
- FLOW-10-F01 — not started (verify: addon purchase pipeline may already exist)
- FLOW-10-F02 — not started (verify: scope resolution may already exist)
- FLOW-10-F03 — not started (verify: idempotency middleware may already be wired)
- FLOW-11-F02 — not started (verify: onBehalfOf may already be set from req.user)
- FLOW-11-F04 — not started (verify: pool rollback compensation may already exist)
- FLOW-12-F03 — not started (same as FLOW-11-F04)
- FLOW-13-F01 — not started (24h edit lock — ACTIVE WORK REQUIRED)
- FLOW-14-F01 — closed in PHASE_3a (commit pending)
- FLOW-15-F01 — closed in PHASE_3a (commit pending)
- FLOW-15-F02 — closed in PHASE_3c (commit pending)
- FLOW-15-F03 — closed in PHASE_3c (commit pending)
- FLOW-15-F04 — closed in PHASE_3c (commit pending)
- FLOW-15-F05 — closed in PHASE_3c (commit pending)
- FLOW-17-F01 — closed in PHASE_3b (commit pending)
- FLOW-17-F02 — closed in PHASE_3b (commit pending)
- FLOW-18-F02 — closed in PHASE_3d (commit pending)
- FLOW-18-F03 — closed in PHASE_3e (commit pending)
- FLOW-19-F01 — not started (deferred to Phase 6b — Peter's decision needed)
- FLOW-19-F02 — closed in PHASE_3d (commit pending)
- FLOW-20-F01 — closed in PHASE_3e (commit pending)
- FLOW-20-F02 — not started (staff SMS failure visibility — ACTIVE WORK REQUIRED)
- FLOW-20-F03 — closed in PHASE_3e (commit pending)
- FLOW-21-F01 — closed in PHASE_3b (commit pending)
- FLOW-21-F03 — closed in PHASE_3e (commit pending)
- FLOW-23-F03 — closed in PHASE_4 (verified existing `AssignTicketModal`)
- FLOW-23-F04 — closed in PHASE_4 (commit `203c7d8`)
- FLOW-25-F02 — not started (deferred to Phase 6b — UI design needed)
- FLOW-26-F03 — not started (verify: onCallClick may already be wired)
- FLOW-26-F04 — not started (verify: infinite scroll may already be applied)
- FLOW-28-F01 — closed in PHASE_4 (commit `203c7d8`)
- FLOW-28-F02 — not started (export row cap — ACTIVE WORK REQUIRED)
- FLOW-28-F03 — closed in PHASE_4 (commit `203c7d8`)
- PIPELINE-F01 — closed in PHASE_3a (commit pending)
- PIPELINE-F03 — closed in PHASE_3a (commit pending)
- PIPELINE-F04 — closed in PHASE_3a (commit pending)
- RBAC-F03 — not started (staff token revocation consistency — ACTIVE WORK REQUIRED)
- RBAC-F04 — not started (verify: onBehalfOf may already be set from req.user)

---

## Notes

- The audit summary lists 129 findings (117 flow + 12 cross-flow). Five flow-level findings (e.g. `FLOW-09-F03`) are referenced in the master plan but absent from the cross-flow extraction, and a handful of cross-flow findings overlap with their flow-level twin (paired IDs above). The 125 IDs above cover every uniquely identified finding plus the cross-flow set; if Phase 1 discovers a missing ID it is added in arrears.
- Update this file at the end of every phase. Add a new "Closed in Phase N" section, move the corresponding IDs out of "Open", and record the commit SHA.
- **Phase 6 Track 0 reconciliation:** 29 findings moved from Open to Closed (15 from PHASE_6_REMAINING_REPORT.md §4 + 14 newly discovered via code verification). See `PHASE_6_PLAN_REVIEW.md` for evidence.
- **Remaining active work after Track 0:** ~10 findings require verification or implementation (FLOW-04-F03, FLOW-08-F01/02/03, FLOW-09-F01/04, FLOW-10-F01/02/03, FLOW-11-F04/12-F03, FLOW-13-F01, FLOW-20-F02, FLOW-28-F02, RBAC-F03). 3 deferred to Phase 6b (FLOW-19-F01, FLOW-25-F02, FLOW-02-F03).
