# Phase 5 — Progress

Updated continuously. Two-line entries per change: the commit subject and
the touch-list. No batching.

## Branch

- Working on `claude/implement-phase-5-xP9mK`
- Cut from `master` post-Phase-4d merge

## Track 0 — Ledger Reconciliation

- [ ] Update IMPLEMENTATION_LEDGER.md Open section

## Track A — Foundation

- [x] Fix `redactSensitive` missing export in auditLog.js — commit 12425c9
- [x] Add `plan` and `addon` to AuditLogModel targetType enum — commit 12425c9
- [x] Remove dual `/api` mount (FLOW-01-F05) — commit 12425c9

## Track B — Audit Log Wiring

- [x] auth.service.js — login.locked + password.changed/reset — commit 29cd203
- [x] auth.controller.js — logout audit — commit 29cd203
- [x] events.service.js — event.created/updated/deleted (already wired pre-session)
- [x] guests.controller.js — event.exported audit — commit 739dbd5
- [x] tickets.service.js — ticket.reply_added / ticket.status_updated (already wired pre-session)
- [x] post-event.service.js — fix targetType + add content_revoked — commit 6270e64
- [x] users.service.js — phone update (omit plaintext phone) — commit 8089e42
- [x] notifications.controller.js — notification.broadcast — commit fcb2412

## Track C — Auth / Profile

- [ ] FLOW-02-F01 — Host signup verification email
- [ ] FLOW-02-F02 — OTP invalidation
- [ ] FLOW-02-F03 (Low) — Welcome email
- [ ] FLOW-04-F02 — Whitelabel branding S3
- [ ] FLOW-04-F03 — Whitelabel plan limits at host creation
- [ ] FLOW-04-F04 — Whitelabel subdomain uniqueness
- [ ] FLOW-06-F04 — Reset email rate limit
- [ ] FLOW-07-F01 — Phone update OTP
- [ ] FLOW-07-F02 — Profile image S3
- [ ] FLOW-07-F03 — Language sync

## Track D — Vendor / Marketplace

- [ ] FLOW-03-F01 — Vendor category enum validation
- [ ] FLOW-03-F02 — Social links URL validation
- [ ] FLOW-03-F03 / FLOW-24-F03 — Vendor signup files to S3
- [ ] FLOW-03-F04 — Vendor approval state machine
- [ ] FLOW-24-F01 — Vendor approval email
- [ ] FLOW-24-F02 — Vendor rejection soft-delete + audit
- [ ] FLOW-24-F04 — profileCompleted enforcement
- [ ] FLOW-25-F01 — Services default isPublic: false
- [ ] FLOW-25-F03 — WhatsApp in socialLinks schema
- [ ] FLOW-25-F04 (Low) — inquiryCount/bookingCount increment
- [ ] FLOW-26-F01 — Vendor rating in marketplace populate
- [ ] FLOW-26-F02 — getPublicServices approval filter
- [ ] FLOW-26-F03 — Web vendor detail popup wired
- [ ] FLOW-26-F04 — Mobile marketplace infinite scroll
- [ ] FLOW-26-F05 (Low) — numberOfClicks increment

## Track E — Event Lifecycle

- [ ] FLOW-11-F02 / RBAC-F04 — onBehalfOf
- [ ] FLOW-11-F03 — Guest phone dedup
- [ ] FLOW-11-F05 — Event creation idempotency
- [ ] FLOW-12-F02 — addon extraGuests
- [ ] FLOW-12-F04 (Low) — Remove legacy requireSubscription
- [ ] FLOW-13-F01 — 24h edit lock
- [ ] FLOW-13-F02 — Guest soft-delete
- [ ] FLOW-13-F03 — Taqnyat job cancel on reschedule
- [ ] FLOW-13-F04 — Status block list
- [ ] FLOW-13-F05 — Event update audit log
- [ ] FLOW-14-F05 — Remove legacy Taqnyat path
- [ ] FLOW-15-F06 — Partial send count
- [ ] FLOW-16-F01 / F02 — Unify test-message routes
- [ ] FLOW-16-F03 (Low) — Test message throttle
- [ ] FLOW-17-F03 — Bulk stats persistence
- [ ] FLOW-17-F04 — guestIds validation
- [ ] FLOW-19-F03 — Stats cache
- [ ] FLOW-21-F02 — requireApproval
- [ ] FLOW-21-F04 (Low) — rename sendBulkAccessEmails
- [ ] FLOW-21-F05 (Low) — uniqueVisitors bounded set
- [ ] FLOW-22-F01 — getDetailedStats cache
- [ ] FLOW-22-F02 — SMS cost env var
- [ ] FLOW-22-F03 — Remove email from invitation.method

## Track F — Notifications

- [ ] FLOW-27-F01 — Notification idempotency
- [ ] FLOW-27-F02 — Scheduled delivery cron
- [ ] FLOW-27-F03 (Low) — NotificationPreferencesModel cleanup
- [ ] FLOW-27-F04 (Low) — Email delivery writeback

## Track G — Tickets / RBAC / Tenant

- [ ] FLOW-23-F01 — Ticket state machine
- [ ] FLOW-23-F02 — addReply route
- [ ] RBAC-F01 — requirePageAccess consistency
- [ ] TENANT-F02 — Tickets tenant filter
- [ ] TENANT-F03 — Admin broadcast tenant filter

## Track H — Exports + Phase 4d Hand-offs

- [ ] FLOW-28-F04 — exportWhitelabels tenant filter
- [ ] Phase-4d-1 — Remove compat aliases guest-list/staff-list
- [ ] Phase-4d-2 — Remove legacy mobile shim files

## Smoke Tests

- [ ] docs/implementation/phase-5-smoke-tests/static-checks-5.js

## Final

- [ ] Update IMPLEMENTATION_LEDGER.md with all Phase 5 closures
- [ ] Write PHASE_5_REPORT.md
