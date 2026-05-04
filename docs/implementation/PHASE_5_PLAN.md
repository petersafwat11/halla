# Phase 5 — Audit Log Activation + Edges + Polish — Plan

**Status:** In progress  
**Branch:** `claude/implement-phase-5-xP9mK`  
**Cut from:** `master` post-Phase-4d merge

---

## Overview

Phase 5 closes ALL remaining open findings from the audit ledger. The master
plan groups them as: 5a (audit log wiring), 5b (remaining Mediums + Highs),
5c (Low polish). In practice these often touch the same files, so
implementation proceeds by module/track rather than sub-phase label.

**Stop gate:** All findings marked closed in `IMPLEMENTATION_LEDGER.md`.
Smoke tests pass. Manual checks recorded.

---

## Track 0 — Ledger Reconciliation (no code, data-only)

Update `IMPLEMENTATION_LEDGER.md` to reflect what was actually closed in
Phases 2/3 but never removed from the Open section:

- FLOW-08-F01/F02/F03 → closed in Phase 2
- FLOW-09-F01/F02/F04 → closed in Phase 2
- FLOW-10-F01/F02/F03 → closed in Phase 2
- FLOW-12-F01 → closed in Phase 2
- FLOW-11-F04/PIPELINE-F03/FLOW-12-F03 → closed in Phase 3a
- FLOW-14-F02/PIPELINE-F05 → closed in Phase 1b
- FLOW-14-F03 → closed in Phase 3b (runBatched)
- FLOW-06-F01/F02/F03 → closed in Phase 1a (already in Phase 1a section but still in Open)
- FLOW-01-F04 (account lockout, per findings summary) → closed in Phase 1a
- FLOW-28-F01/F02/F03/F04 → closed in Phase 4 (already in Phase 4 section but still in Open)
- FLOW-05-F01/F02/F03 → closed in Phase 1a (already in Phase 1a section)

---

## Track A — Foundation (5a prerequisites)

Files: `models/AuditLogModel.js`, `src/shared/utils/auditLog.js`

1. **Fix `redactSensitive` bug** — add the function to `auditLog.js` utils and
   export it. The middleware already imports it; missing export causes runtime error.
2. **Add `plan` and `addon` to AuditLogModel targetType enum** — Phase 2 hand-off.
3. **Remove dual `/api` mount (FLOW-01-F05)** — delete `mountRoutes('/api')` from
   `app.js`. Web and mobile clients were migrated to `/api/v2` in Phase 1a.

---

## Track B — Audit Log Wiring (5a)

Wire audit log to all sensitive operations not yet covered.

File ownership (backend only — no two tracks touch the same file):

| Module | New audit events |
|--------|-----------------|
| auth.service.js | login.success, login.failed, login.locked, password.changed, logout |
| events.service.js | event.created, event.updated, event.deleted |
| events.routes.js | event.exported (on GET /events/:id/export-guests) |
| tickets.service.js | ticket.status_changed, ticket.reply_added |
| post-event.service.js | post_event.content_published, post_event.content_revoked |
| users.service.js | user.phone_updated |
| notifications.routes.js | notification.broadcast (admin broadcast) |

---

## Track C — Auth / Profile (Phases 5a + 5b)

| Finding | File | Change |
|---------|------|--------|
| FLOW-02-F01 | auth.service.js | Send verification email on host signup |
| FLOW-02-F02 | OTPModel.js + auth.service.js | Invalidate OTP after first use |
| FLOW-02-F03 (Low) | auth.service.js | Welcome email on host signup |
| FLOW-04-F02 | auth.service.js + users.service.js | Whitelabel branding assets use processUploadedFiles (S3) |
| FLOW-04-F03 | whitelabels.service.js | Enforce plan limits at host creation |
| FLOW-04-F04 | whitelabels.service.js | Subdomain uniqueness check |
| FLOW-06-F04 | auth.routes.js | Rate limit on reset-password email endpoint |
| FLOW-07-F01 | users.service.js | Require OTP re-verification on phone number change |
| FLOW-07-F02 | auth.service.js + users.service.js | Profile image via processUploadedFiles (S3) |
| FLOW-07-F03 | users.service.js + mobile | Sync language preference between platforms |

---

## Track D — Vendor / Marketplace (5b)

| Finding | File | Change |
|---------|------|--------|
| FLOW-03-F01 | auth.service.js / vendors.service.js | Validate serviceCategories against allowed enum |
| FLOW-03-F02 | auth.service.js / vendors.service.js | URL-validate socialLinks on signup + update |
| FLOW-03-F03 / FLOW-24-F03 (High) | auth.service.js | Use processUploadedFiles(files) instead of manual `/uploads/...` paths |
| FLOW-03-F04 | vendors.service.js | Vendor approval state machine guard |
| FLOW-24-F01 | vendors.service.js | Send approval email on status → approved |
| FLOW-24-F02 | vendors.service.js | Soft-delete on rejection (status=rejected, keep record + audit log) |
| FLOW-24-F04 | services.service.js + vendors.service.js | Enforce profileCompleted before marketplace visibility |
| FLOW-24-F05 | vendors.routes.js | Audit log on vendor status transition (already wired in Phase 1b — verify) |
| FLOW-25-F01 | services.service.js | New services default `isPublic: false`; require explicit publish |
| FLOW-25-F03 | models/UserModel.js | Add `whatsapp` to vendor socialLinks schema |
| FLOW-25-F04 (Low) | services.service.js | Increment inquiryCount + bookingCount on events |
| FLOW-26-F01 | services.service.js | Include vendor rating in getPublicServices populate |
| FLOW-26-F02 | services.service.js | Filter unapproved vendors from getPublicServices |
| FLOW-26-F03 | labbe web | Wire onCallClick handler in vendor detail popup |
| FLOW-26-F04 | halla-mobile | Marketplace infinite scroll (if not already done by Phase 4 pagination) |
| FLOW-26-F05 (Low) | services.service.js | Increment numberOfClicks on vendor profile view |

---

## Track E — Event Lifecycle (5b + 5c)

| Finding | File | Change |
|---------|------|--------|
| FLOW-11-F02 / RBAC-F04 | events.service.js | Set onBehalfOf from req.user when super_admin creates for a host |
| FLOW-11-F03 | events.service.js | Phone dedup in createGuestsFromList |
| FLOW-11-F05 | events.routes.js | Idempotency middleware on POST /events |
| FLOW-12-F02 | quota / events.service.js | addon extraGuests augments quota correctly |
| FLOW-12-F04 (Low) | events.routes.js + middleware | Remove legacy requireSubscription middleware |
| FLOW-13-F01 | events.service.js | 24h pre-launch edit lock |
| FLOW-13-F02 | events.service.js | Soft-delete guests on updateGuestList removal |
| FLOW-13-F03 | messaging.service.js | Cancel Taqnyat job on event reschedule |
| FLOW-13-F04 | events.service.js | Complete status block list for event updates |
| FLOW-13-F05 | events.routes.js | Audit log on event update routes |
| FLOW-14-F05 | messaging.service.js | Remove legacy native Taqnyat call path |
| FLOW-15-F06 | events.service.js | Surface partial send count in host-visible state |
| FLOW-16-F01 / F02 | messaging.routes.js + controller | Unify dual test-message routes; fix RSVP link |
| FLOW-16-F03 (Low) | messaging.routes.js | Per-event throttle on test-message endpoint |
| FLOW-17-F03 | scheduledTasks.js | Persist bulk stats after each batch |
| FLOW-17-F04 | events.service.js / messaging | Validate guestIds belong to event |
| FLOW-19-F03 | events / stats | Cache stats endpoint (5-min TTL in-memory or Redis) |
| FLOW-21-F02 | post-event.service.js | Enforce requireApproval flag |
| FLOW-21-F04 (Low) | post-event.service.js | Rename sendBulkAccessEmails → sendBulkAccessMessages |
| FLOW-21-F05 (Low) | PostEventContentModel.js | Cap uniqueVisitors to bounded Set logic |
| FLOW-22-F01 | events.service.js / stats | Cache getDetailedStats (same cache) |
| FLOW-22-F02 | messaging.service.js | SMS cost from env SMS_COST_SAR (default 0.15) |
| FLOW-22-F03 | EventModel.js | Remove 'email' from invitation.method enum |

---

## Track F — Notifications (5b)

| Finding | File | Change |
|---------|------|--------|
| FLOW-27-F01 | notifications.service.js | Idempotency key on notification creation |
| FLOW-27-F02 | scheduledTasks.js | Cron for delivering scheduled notifications |
| FLOW-27-F03 (Low) | NotificationPreferencesModel.js | Remove dead NotificationPreferencesModel or document intent |
| FLOW-27-F04 (Low) | notifications.service.js | Email delivery status writeback |

---

## Track G — Tickets / RBAC / Tenant (5b)

| Finding | File | Change |
|---------|------|--------|
| FLOW-23-F01 | tickets.service.js | State machine guard (valid transitions matrix) |
| FLOW-23-F02 | tickets.routes.js | Wire addReply route |
| RBAC-F01 | auth.js middleware | Align requirePageAccess with restrictTo role resolution |
| RBAC-F03 | already closed in Phase 3e (staff token revocation endpoint) — verify |
| TENANT-F02 | tickets.routes.js / tickets.service.js | whitelabelId filter on ticket queries |
| TENANT-F03 | notifications.routes.js | whitelabelId filter on admin broadcast |

---

## Track H — Exports + Phase 4d Hand-offs (5c)

| Finding | File | Change |
|---------|------|--------|
| FLOW-28-F04 | admin.service.js / admin.routes.js | tenant filter on exportWhitelabels |
| Phase-4d-1 | events.routes.js | Remove compat aliases /guest-list + /staff-list |
| Phase-4d-2 | halla-mobile/screens/host/UpdateEventScreen.js + admin-dashboard/UpdateEventScreen.js | Delete legacy shim files |

---

## Smoke Tests

`docs/implementation/phase-5-smoke-tests/static-checks-5.js` — ~30 assertions

Covers:
- redactSensitive exported from auditLog.js ✓
- AuditLogModel has plan/addon in targetType enum ✓
- /api prefix removed from app.js ✓
- Vendor socialLinks schema has whatsapp ✓
- ServiceModel has isPublic default false ✓
- Ticket state machine exists ✓
- Notification idempotency ✓
- guestIds validation ✓
- Guest soft-delete on removal ✓
- SMS cost env var ✓
- Bounded uniqueVisitors logic ✓
- Phase 4d compat aliases removed ✓
- Legacy mobile shims removed ✓

---

## Parallelism Map

Sequential (same file or dependency):
- Track 0 → Track A → Track B → individual module tracks run in parallel

Parallel-safe tracks (different module files):
- Track C (auth/profile) — backend: auth.service.js + users.service.js
- Track D (vendor/marketplace) — backend: vendors.service.js + services.service.js  
- Track E (event) — backend: events.service.js + messaging.service.js
- Track F (notifications) — backend: notifications.service.js + scheduledTasks.js
- Track G (tickets/RBAC) — backend: tickets.service.js + auth.js middleware

These can execute in parallel but each sub-track within them is sequential.
