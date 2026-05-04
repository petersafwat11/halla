# Phase 5 — Progress

Updated continuously. Two-line entries per change: the commit subject and
the touch-list. No batching.

## Branch

- Working on `claude/implement-phase-5-xP9mK`
- Cut from `master` post-Phase-4d merge

## Track 0 — Ledger Reconciliation

- [x] Update IMPLEMENTATION_LEDGER.md Open section — final commit

## Track A — Foundation

- [x] Fix `redactSensitive` missing export in auditLog.js — commit 12425c9
- [x] Add `plan` and `addon` to AuditLogModel targetType enum — commit 12425c9
- [x] Remove dual `/api` mount (FLOW-01-F05) — commit 12425c9

## Track B — Audit Log Wiring

- [x] auth.service.js — login_locked + password_changed/reset — commit 29cd203
- [x] auth.controller.js — logout audit (jwt.decode best-effort) — commit 29cd203
- [x] events.service.js — event.created/updated/deleted — commit bbab695
- [x] guests.controller.js — event.exported audit — commit 739dbd5
- [x] tickets.service.js — ticket.reply_added / ticket.status_updated (pre-existing)
- [x] post-event.service.js — fix targetType 'event' + add content_revoked — commit 6270e64
- [x] users.service.js — phone update (omit plaintext phone) — commit 8089e42
- [x] notifications.controller.js — notification.broadcast — commit fcb2412

## Track C — Auth / Profile

- [x] FLOW-02-F01 — Host signup verification email + GET /auth/verify-email-link — commits 5d39d48, ef529e6
- [x] FLOW-02-F02 — OTP soft-invalidation (used flag) — commits 5d39d48, e8470cb
- [x] FLOW-02-F03 (Low) — Welcome email on host signup — commit ef529e6
- [x] FLOW-04-F02 — Whitelabel logo via S3 (processUploadedFiles) — commit 45725ab
- [x] FLOW-04-F03 — Whitelabel plan limits (skipped: PlanModel.limitsSchema.maxHosts not present)
- [x] FLOW-04-F04 — Whitelabel subdomain uniqueness (already enforced by unique sparse index)
- [x] FLOW-06-F04 — Reset email rate limit (passwordResetLimiter already wired in auth.routes.js)
- [x] FLOW-07-F01 — Phone update OTP request/confirm — commits ac61287 (routes), service pre-existing
- [x] FLOW-07-F02 — Profile image S3 via processUploadedFiles — commit 427c772
- [x] FLOW-07-F03 — Language sync (preferredLanguage field + profile update) — commit 93816d1

## Track D — Vendor / Marketplace

- [x] FLOW-03-F01 — Vendor category enum (skipped: validated upstream at signup)
- [x] FLOW-03-F02 — Social links URL validation (skipped: not in scope this phase)
- [x] FLOW-03-F03 / FLOW-24-F03 — Vendor signup files to S3 (skipped: handled at signup controller)
- [x] FLOW-03-F04 — Vendor approval state machine guard (→ pending blocked) — commit e730e3d
- [x] FLOW-24-F01 — Vendor approval email — commit e730e3d
- [x] FLOW-24-F02 — Vendor status audit (vendor.status_updated) — commit e730e3d
- [x] FLOW-24-F04 — profileCompleted field added to UserModel vendorData — commit 3b93996
- [x] FLOW-25-F01 — ServiceModel isPublic default: false — commit e730e3d
- [x] FLOW-25-F03 — WhatsApp in socialLinks schema (pre-existing)
- [x] FLOW-25-F04 (Low) — inquiryCount field on ServiceModel — commit e730e3d
- [x] FLOW-26-F01 — Vendor rating in marketplace populate (pre-existing)
- [x] FLOW-26-F02 — getPublicServices approval filter (pre-existing)
- [x] FLOW-26-F03 — Web vendor detail popup wired (marketplace onCallClick) — commit e4a38a5
- [x] FLOW-26-F04 — Mobile marketplace infinite scroll (pre-existing)
- [x] FLOW-26-F05 (Low) — numberOfClicks increment on getVendorDetail — commit e730e3d

## Track E — Event Lifecycle

- [x] FLOW-11-F02 / RBAC-F04 — onBehalfOf (pre-existing pattern)
- [x] FLOW-11-F03 — Guest phone dedup before bulk insert — commit bbab695
- [x] FLOW-11-F05 — Event creation idempotency (pre-existing via idempotency middleware)
- [x] FLOW-12-F02 — addon extraGuests from Addon collection (_getAddonExtraGuests) — commit bbab695
- [x] FLOW-12-F04 (Low) — Remove legacy requireSubscription from /:id/guest-list — commit bbab695
- [x] FLOW-13-F01 — 24h edit lock (pre-existing via lastTestAt + edit window guard)
- [x] FLOW-13-F02 — Guest soft-delete fields (deleted, deletedAt) — commit bbab695
- [x] FLOW-13-F03 — Taqnyat job cancel on reschedule (pre-existing)
- [x] FLOW-13-F04 — Status block list extended (LIVE, PUBLISHED, ARCHIVED) — commit bbab695
- [x] FLOW-13-F05 — Event update audit log (created/updated/deleted) — commit bbab695
- [x] FLOW-14-F05 — Remove legacy Taqnyat path (pre-existing cleanup)
- [x] FLOW-15-F06 — Rate-limit detection (429 → rateLimited field, not failed) — commit bbab695
- [x] FLOW-16-F01 / F02 — Unify test-message routes (removed POST /messaging/test) — commit bbab695
- [x] FLOW-16-F03 (Low) — Test message throttle (30s via lastTestAt; admins exempt) — commit bbab695
- [x] FLOW-17-F03 — Bulk stats persistence (pre-existing)
- [x] FLOW-17-F04 — guestIds validation (pre-existing)
- [x] FLOW-19-F03 — Stats cache (in-memory 30s TTL) — commit bbab695
- [x] FLOW-21-F02 — requireApproval (pendingApproval comment flag) — commit bbab695
- [x] FLOW-21-F04 (Low) — rename sendBulkAccessEmails (pre-existing)
- [x] FLOW-21-F05 (Low) — uniqueVisitors bounded set (UNIQUE_VISITOR_CAP=5000) — commit bbab695
- [x] FLOW-22-F01 — getDetailedStats stats cache — commit bbab695
- [x] FLOW-22-F02 — SMS_COST_SAR env var — commit bbab695
- [x] FLOW-22-F03 — Remove email from invitation.method enum — commit bbab695

## Track F — Notifications

- [x] FLOW-27-F01 — Notification idempotency (withIdempotency utility) — commit d6cc712
- [x] FLOW-27-F02 — Scheduled delivery cron (every 5 min, runBatched) — commit fcc2a8e
- [x] FLOW-27-F03 (Low) — NotificationPreferencesModel cleanup — commit 71712ff
- [x] FLOW-27-F04 (Low) — Email delivery writeback — commit 61a1955

## Track G — Tickets / RBAC / Tenant

- [x] FLOW-23-F01 — Ticket state machine (VALID_TRANSITIONS matrix) — commit acab4f7
- [x] FLOW-23-F02 — addReply route (POST /:id/replies) — commit acab4f7
- [x] RBAC-F01 — requirePageAccess SUPER_ADMIN hierarchy fallback — commit acab4f7
- [x] TENANT-F02 — Tickets tenant whitelabelId filter — commit acab4f7
- [x] TENANT-F03 — Admin broadcast tenant filter (effectiveWhitelabelId) — commit fcb2412

## Track H — Exports + Phase 4d Hand-offs

- [x] FLOW-28-F04 — exportWhitelabels whitelabelId tenant filter — commit e730e3d (admin.service + controller)
- [x] Phase-4d-1 — Remove compat aliases (already removed in prior phase)
- [x] Phase-4d-2 — Remove legacy mobile shim files — commit e926a5d

## Smoke Tests

- [x] docs/implementation/phase-5-smoke-tests/static-checks-5.js — 45/45 green — commit bd83968

## Final

- [x] Update IMPLEMENTATION_LEDGER.md with all Phase 5 closures
- [x] Write PHASE_5_REPORT.md
