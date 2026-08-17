# Phase 5 — Implementation Report

**Branch:** `claude/implement-phase-5-xP9mK`
**Base:** `master` (post-Phase-4d merge)
**Smoke check:** `45 / 45` PASS — `docs/implementation/phase-5-smoke-tests/static-checks-5.js`

---

## Scope

Phase 5 closed the remaining open audit findings: ~24 FLOW-ID items spanning auth/profile,
vendor/marketplace, event lifecycle, notifications, tickets, RBAC, and tenant isolation.
It also completed an audit-log-everywhere pass and frontend cookie/routing hardening.

---

## Tracks Completed

### Track A — Foundation (commits: `12425c9`)

- Removed duplicate `/api/v2` mount from `src/app.js` (FLOW-01-F05).
- Extended `AuditLogModel.targetType` enum with `plan` and `addon`.
- Fixed missing `redactSensitive` export in `auditLog.js`.

### Track B — Audit Log Wiring (commits: `29cd203`, `739dbd5`, `6270e64`, `8089e42`, `fcb2412`, `bbab695`, `e730e3d`)

New audit events added (no FLOW-ID, audit-log-everywhere pass):

| Event | Location | Notes |
|-------|----------|-------|
| `auth.login_locked` | auth.service | fires on consecutive-failure lock |
| `auth.password_changed` | auth.service | fires after `updatePassword` |
| `auth.password_reset` | auth.service | fires after `resetPassword` |
| `auth.logout` | auth.controller | best-effort jwt.decode (no verify) since logout runs before `protect` |
| `event.created` / `event.updated` / `event.deleted` | events.service | with metadata |
| `event.exported` | guests.controller | export = PII, requires audit trail |
| `post_event.content_revoked` | post-event.service | targetType fixed: `event` (not `post_event_content`) |
| `notification.broadcast` | notifications.controller | logs targetRole + whitelabelId |
| `vendor.status_updated` | admin.service | logs previous + new status |

Also fixed: `users.service` phone update audit was logging plaintext phone numbers — removed `newPhone` and `previousPhone` from metadata.

### Track C — Auth / Profile (commits: `5d39d48`, `e8470cb`, `ef529e6`, `45725ab`, `427c772`, `93816d1`, `ac61287`)

- **FLOW-02-F01**: Host signup now sends a verification email with a signed link.
  New `GET /auth/verify-email-link?token=...` endpoint marks email as verified.
- **FLOW-02-F02**: OTP soft-invalidation — on first use, sets `used: true` instead of deleting,
  preventing replay without destroying the row. `OTPModel` extended with `used`, `email`, and
  `email_verification` type fields.
- **FLOW-02-F03**: Welcome email sent after host signup (alongside verification).
- **FLOW-04-F02**: Whitelabel logo passed through S3 via `processUploadedFiles`; no local path.
- **FLOW-04-F04**: Subdomain uniqueness already enforced by sparse unique index on `domain.subdomain`.
- **FLOW-06-F04**: `passwordResetLimiter` already wired to `POST /forgot-password` — verified.
- **FLOW-07-F01**: `requestPhoneUpdate` / `confirmPhoneUpdate` controller methods + routes wired.
- **FLOW-07-F02**: `processUploadedFiles` used for profile image; local `/uploads/` paths removed.
- **FLOW-07-F03**: Top-level `preferredLanguage` field added to `UserModel`; exposed in profile update.

Deferred: **FLOW-04-F03** — `PlanModel.limitsSchema` has no `maxHosts` field; design needed.

### Track D — Vendor / Marketplace (commits: `3b93996`, `e730e3d`)

- **FLOW-03-F04**: `updateVendorStatus` now blocks `→ pending` transition with 422.
- **FLOW-24-F01**: Approval email sent via `email.send.vendorApproval` on `→ approved`.
- **FLOW-24-F02**: `vendor.status_updated` audit log on every transition.
- **FLOW-24-F04**: `profileCompleted`, `approvedAt`, `rejectedAt`, `rejectedBy` fields added to `UserModel.vendorData`.
- **FLOW-25-F01**: `ServiceModel.isPublic` default changed from `true` → `false`.
- **FLOW-25-F04**: `inquiryCount` field added to `ServiceModel`; `bookingCount` already present.
- **FLOW-26-F05**: `numberOfClicks` incremented fire-and-forget on `getVendorDetail`.

### Track E — Event Lifecycle (commit: `bbab695`)

- **FLOW-11-F03**: Guest list deduplicated by normalized phone before bulk insert (keep-last policy).
- **FLOW-12-F02**: `_getAddonExtraGuests` reads active `extra_invites` addons from `AddonModel` and adds them to guest capacity.
- **FLOW-12-F04**: Legacy `requireSubscription` guard removed from `PATCH /:id/guest-list` + `/:id/staff-list` routes.
- **FLOW-13-F02**: `deleted` / `deletedAt` soft-delete fields added to `GuestModel`.
- **FLOW-13-F04**: Event update status block list extended: `LIVE`, `PUBLISHED`, `ARCHIVED` added to the immutable set.
- **FLOW-13-F05**: `event.created`, `event.updated`, `event.deleted` audit calls wired in `events.service`.
- **FLOW-15-F06**: Taqnyat 429 response detected and stored as `invitation.rateLimited: true` on `GuestModel`; guest not marked as failed, remains eligible for retry.
- **FLOW-16-F01/F02**: Legacy `POST /messaging/test` route removed. Frontend `sendTestInvitation` migrated to `PATCH /events/:id/test-message`. RSVP preview URL corrected from dead `/rsvp/test` to `/rsvp/preview?event=:id`.
- **FLOW-16-F03**: 30-second per-event test message throttle via new `EventModel.lastTestAt` field. Admins exempt.
- **FLOW-21-F02**: `pendingApproval` boolean added to `PostEventContentModel` comment schema for host-approval gating.
- **FLOW-21-F05**: `uniqueVisitors` array capped at 5000 entries; `uniqueVisitorCount` counter maintains authoritative total.
- **FLOW-22-F01**: In-memory 30-second TTL stats cache added to `MessagingService` (`_statsCache` Map + `invalidateStatsCache`).
- **FLOW-22-F02**: `SMS_COST_SAR` env var read in `getDetailedStats`; default 0.15 SAR; added to `config.env`.
- **FLOW-22-F03**: `email` removed from `GuestModel.invitation.method` and `invitation.effectiveChannel` enums.

### Track F — Notifications (commits: `d6cc712`, `fcc2a8e`, `71712ff`, `61a1955`)

- **FLOW-27-F01**: Notification idempotency via `withIdempotency` utility (key: `notification:<userId>:<type>:<targetId>`).
- **FLOW-27-F02**: Scheduled notification delivery cron runs every 5 minutes; `runBatched` (concurrency 5, 10/sec cap) delivers pending notifications.
- **FLOW-27-F03**: `NotificationPreferencesModel` fields cleaned up.
- **FLOW-27-F04**: Email delivery writeback: scheduled notifications record email delivery status.

### Track G — Tickets / RBAC / Tenant (commit: `acab4f7`)

- **FLOW-23-F01**: `VALID_TRANSITIONS` matrix in `tickets.service.js` enforces ticket state machine.
  Terminal states: `closed`. `→ pending` is disallowed; all transitions validated before update.
- **FLOW-23-F02**: `POST /:id/replies` route + `addReply` controller exported. Audit call wired.
- **RBAC-F01**: `getPageAccess` in `permissions.js` falls back to `SUPER_ADMIN`-managed role permissions when caller is `SUPER_ADMIN` and has no explicit page mapping.
- **TENANT-F02**: `getTickets` in `tickets.service.js` now filters by `whitelabelId` for non-SUPER_ADMIN callers.
- **TENANT-F03**: `broadcastNotification` in `notifications.controller.js` computes `effectiveWhitelabelId`: SUPER_ADMIN passes the requested `whitelabelId`; all others are restricted to their own tenant.

### Track H — Exports (commit: `e730e3d`)

- **FLOW-28-F04**: `exportWhitelabels` now accepts `whitelabelId` as first param; `admin.controller` passes it from `getWhitelabelIdFromFilter`, enforcing tenant-scoped exports for non-SUPER_ADMIN admins.

### Frontend Hardening (commits: `e4a38a5`)

The Track C + E agents identified and fixed a cross-cutting frontend issue:

- The backend sets `access_token` as an HttpOnly cookie, but the frontend was reading `token`.
  All server-component cookie reads updated to `access_token`.
- `next.config.mjs` rewrites `/api/v2/*` to `BACKEND_PROXY_URL` in dev, so browser requests go
  through `:3000` and the backend's `Set-Cookie` headers land on the correct origin.
- `apiClient.js` distinguishes server/browser: server uses `INTERNAL_API_URL` directly; browser uses relative `/api/v2` proxy path.
- Login form uses `window.location.href` instead of `router.push` so HttpOnly cookies are carried on the first post-login navigation.
- `middleware.js` reads `userType` cookie (set by `js-cookie`, JS-readable) rather than `access_token` (HttpOnly, invisible to middleware on a different dev port).

---

## Deferred / Not in Scope

| Finding | Reason |
|---------|--------|
| FLOW-04-F03 | `PlanModel.limitsSchema` has no `maxHosts` field — schema redesign needed |
| FLOW-03-F01/F02/F03 | Category enum validation + social links + signup files — not in Phase 5 plan |
| FLOW-24-F05 | Not in Phase 5 plan |
| FLOW-08/09/10 series | Payment / subscription flows — deferred to Phase 6 |
| FLOW-13-F01 | 24h edit lock — depends on a scheduled job design decision |
| FLOW-13-F03 | Taqnyat job cancel on event reschedule — requires Taqnyat API design |

---

## Smoke Test Results

```
Phase 5 static checks: 45/45

  ✓ TRACK-A: auditLog.js exports redactSensitive
  ✓ TRACK-A: AuditLogModel targetType enum includes plan + addon
  ✓ TRACK-A: no dual /api mount in app entry
  ✓ TRACK-B: auth.service audits auth.login_locked
  ✓ TRACK-B: auth.service audits auth.password_changed
  ✓ TRACK-B: auth.service audits auth.password_reset
  ✓ TRACK-B: auth.controller audits auth.logout
  ✓ TRACK-B: post-event.service uses targetType: 'event' (not post_event_content)
  ✓ TRACK-B: post-event.service has content_revoked action
  ✓ TRACK-B: users.service omits plaintext phone from audit metadata
  ✓ TRACK-B: notifications.controller audits notification.broadcast
  ✓ TRACK-B: guests.controller audits event.exported
  ✓ TRACK-C: OTPModel has used flag + email field + email_verification type
  ✓ TRACK-C: auth.routes has GET /verify-email-link endpoint
  ✓ TRACK-C: users.service uses processUploadedFiles for S3 (no local disk paths)
  ✓ TRACK-C: UserModel has preferredLanguage field
  ✓ TRACK-C: users.routes has phone update endpoints
  ✓ TRACK-D: ServiceModel isPublic defaults to false
  ✓ TRACK-D: admin.service blocks vendorStatus → pending
  ✓ TRACK-D: admin.service sends approval email on vendor approved
  ✓ TRACK-D: admin.service audits vendor.status_updated
  ✓ TRACK-D: vendors.service increments numberOfClicks
  ✓ TRACK-D: UserModel has profileCompleted + vendorStatus history fields
  ✓ TRACK-E: events.service deduplicates guests by phone before insert
  ✓ TRACK-E: events.service extended status block list
  ✓ TRACK-E: events.service audits event.created, event.updated, event.deleted
  ✓ TRACK-E: GuestModel has soft-delete fields (deleted, deletedAt)
  ✓ TRACK-E: GuestModel has rateLimited field for 429 detection
  ✓ TRACK-E: EventModel has lastTestAt field for throttle
  ✓ TRACK-E: messaging.service has in-memory stats cache
  ✓ TRACK-E: messaging.service reads SMS_COST_SAR env var
  ✓ TRACK-E: messaging.service throttles test messages via lastTestAt
  ✓ TRACK-E: messaging.routes removed legacy POST /test
  ✓ TRACK-E: subscriptions.service reads addon extraGuests from Addon collection
  ✓ TRACK-E: PostEventContentModel has pendingApproval + uniqueVisitorCount
  ✓ TRACK-F: notifications.service uses withIdempotency utility (FLOW-27-F01)
  ✓ TRACK-F: idempotency utility provides withIdempotency + sha256
  ✓ TRACK-F: scheduledTasks has runBatched scheduled delivery
  ✓ TRACK-G: tickets.service has VALID_TRANSITIONS state machine
  ✓ TRACK-G: tickets.routes has POST /:id/replies (addReply)
  ✓ TRACK-G: tickets.service filters by whitelabelId for tenant isolation
  ✓ TRACK-G: permissions.js getPageAccess has SUPER_ADMIN hierarchy fallback
  ✓ TRACK-G: notifications.controller enforces TENANT-F03 broadcast scope
  ✓ TRACK-H: admin.service exportWhitelabels accepts whitelabelId
  ✓ TRACK-H: admin.controller passes whitelabelId to exportWhitelabels
```

---

## Hand-offs to Phase 6

- **FLOW-04-F03**: Whitelabel plan limits at host creation — requires `PlanModel.maxHosts`.
- **FLOW-08/09/10 series**: Payment, subscription, addon flows — not touched in Phase 5.
- **FLOW-13-F01**: 24h edit lock — decision needed on whether to block edits or just warn.
- **FLOW-13-F03**: Taqnyat job cancel on event reschedule — depends on Taqnyat async job ID tracking.
- **FLOW-17-F03/F04**: Bulk stats persistence, guestIds validation — remaining messaging cleanup.
- **FLOW-21-F04**: Rename `sendBulkAccessEmails` — cosmetic, low priority.
- **FLOW-24-F03/F05**: Vendor signup S3 file upload + additional vendor admin controls.
- **FLOW-25-F02/F03**: Vendor social links schema + WhatsApp.
- **FLOW-26-F01/F02/F03/F04**: Vendor marketplace rating, approval filter, popup, mobile infinite scroll.
- **RBAC-F03/F04**: Role-based access control gaps not covered in Phase 5.
- CI integration for `scripts/check-schema-drift.sh` (Phase 4d hand-off).
- MongoDB topology verification — replica set for production transactions.
- Production migration scripts: `migrate-event-shape.js --apply`, `seedInitialTemplates.js`.
