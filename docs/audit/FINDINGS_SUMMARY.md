# Findings Summary — Halla Platform Pre-Production Audit

Consolidates all findings from flows 01–28 and cross-flow artifacts (RSVP_PIPELINE_COHERENCE, TENANT_SCOPING_MATRIX, RBAC_MATRIX). Includes Refinement 4 re-rate decisions.

**Audit branch**: `audit/pre-production`
**Audit date**: 2026-04-29
**Total findings**: 129 (117 flow-level + 12 cross-flow)

> Cross-flow findings marked with ★ overlap with a flow-level finding. Both are kept — the cross-flow finding adds pipeline or architectural framing the flow-level finding lacks.

---

## Severity Counts (after Refinement 4 re-rate)

| Severity | Before re-rate | Promotions | Demotions | After re-rate |
|----------|---------------|------------|-----------|---------------|
| Critical | 16 | +3 | 0 | **19** |
| High | 40 | -3 | 0 | **37** |
| Medium | 52 | 0 | 0 | **52** |
| Low | 21 | 0 | 0 | **21** |
| **Total** | **129** | | | **129** |

---

## Refinement 4 — Re-rate Decisions

### Promoted: High → Critical

**TENANT-F01 / RBAC-F02** — `filterByWhitelabel` grants ADMIN and MODERATOR roles `{ whitelabelId: null }` — the same cross-tenant access as SUPER_ADMIN.
- **Reasoning for promotion**: This is a full multi-tenant isolation failure. Every admin endpoint passes the filter through to MongoDB. Any ADMIN account has cross-tenant read/write on hosts, events, subscriptions, payments, and vendors. A single compromised ADMIN credential exposes the entire platform's data across all tenant boundaries. This meets the Critical rubric ("can corrupt data or expose secrets in a way that affects more than one user").

**FLOW-12-F01** — `findActiveForUser()` sorts oldest-first; `validateLimits()` always enforces the host's oldest (most restrictive) subscription plan.
- **Reasoning for promotion**: This is a core business logic failure that silently fires on every event creation and every quota check. A host who upgrades their subscription plan will still have their new event blocked by the old plan's limits. The upgraded plan is invisible to quota enforcement. This directly breaks the most critical host workflow and causes chargeable events to be incorrectly rejected. Meets Critical rubric ("silently corrupts the primary user flow").

**PIPELINE-F05 / FLOW-14-F02** — Timezone bug in launch cron; `scheduleEventLaunch` uses server local time instead of the event's timezone.
- **Previous rating**: High (FLOW-14-F02). **New rating**: Critical in pipeline context (already written as Critical in RSVP_PIPELINE_COHERENCE.md).
- **Reasoning for promotion**: The platform is deployed for a Saudi Arabia market where the server runs UTC and all events are in `Asia/Riyadh` (UTC+3). Every scheduled event launch fires 3 hours early in absolute terms. This is a Critical data-delivery failure for the platform's primary feature. The original High rating was too conservative.

---

## Complete Findings Register

### Critical (19)

| ID | Title | Location | Gate-1 |
|----|-------|----------|--------|
| FLOW-01-F01 | Refresh token not rotated on use; replay window open | auth.service.js | #1 |
| FLOW-01-F02 | Access token not invalidated on refresh; old tokens remain valid after rotation | auth.service.js | #1 |
| FLOW-01-F03 | Refresh token stored as plain hash in DB; collision attack possible | UserModel.js | #1 |
| FLOW-09-F01 | subscribe() creates subscription without any Moyasar payment check | subscriptions.service.js | #3 |
| FLOW-10-F01 | Addon purchase creates pending record only — no payment, no activation, no quota update | addons.service.js:39 | #3 |
| FLOW-11-F01 | Mobile Step 5 EventSummary has no scheduledDate/scheduledTime inputs | EventSummary.js | #4,#11 |
| FLOW-12-F01 ★ **PROMOTED** | findActiveForUser sorts oldest-first; validateLimits enforces wrong plan | subscriptions.service.js | — |
| FLOW-14-F01 ★ | Event.status set to 'live' before sendBulk completes; no rollback | scheduledTasks.js:141 | #11 |
| FLOW-14-F02 ★ **PROMOTED** | Timezone bug: launch cron uses server local time, not event timezone | scheduledTasks.js:99-104 | — |
| FLOW-15-F01 ★ | No 'failed' status in EventModel; launch failures leave event in undefined state | EventModel.js (status enum) | — |
| FLOW-15-F02 | retryFailed() exists but is never auto-invoked by cron or webhook | scheduledTasks.js | — |
| FLOW-18-F01 ★ | HMAC verification fails open when WHATSAPP_APP_SECRET unset | messaging.controller.js:133 | #7 |
| PIPELINE-F01 ★ | Event marked 'live' before invitation dispatch completes; no rollback | scheduledTasks.js:141 | #11 |
| PIPELINE-F02 ★ | HMAC webhook verification fails open; unauthenticated payloads accepted | messaging.controller.js:133 | #7 |
| PIPELINE-F04 ★ | No 'failed' event status; launch failures leave events in undefined state | EventModel.js | — |
| PIPELINE-F05 ★ | Timezone bug in launch cron; Saudi Arabia events fire 3 hours early | scheduledTasks.js:99-104 | — |
| TENANT-F01 ★ **PROMOTED** | filterByWhitelabel gives ADMIN/MODERATOR same cross-tenant access as SUPER_ADMIN | whitelabel.js | — |
| RBAC-F02 ★ **PROMOTED** | ADMIN/MODERATOR receive null whitelabelId filter; full cross-tenant data access | whitelabel.js | — |
| FLOW-17-F01 ★ | Sequential 100ms-sleep loop for bulk dispatch; blocks event loop for 200+ guests | messaging.service.js | #8 |

*Note: FLOW-17-F01 promoted from High because it affects every event launch and violates Gate-1 #8 (batched parallel sends). An event with 200 guests blocks the Node.js event loop for 20+ seconds, during which the process is unresponsive.*

### High (37)

| ID | Title | Location |
|----|-------|----------|
| FLOW-01-F04 | No account lockout after repeated failed login attempts | auth.service.js |
| FLOW-01-F05 | Dual /api/v1 + /api/v2 route prefixes; v1 paths still active | app.js routes |
| FLOW-02-F01 | Host signup does not send verification email in some paths | auth.service.js |
| FLOW-02-F02 | OTP not invalidated after use; replay window open | OtpModel |
| FLOW-03-F03 | Vendor document upload saved to local filesystem (not S3) | multer config |
| FLOW-03-F04 | Vendor approval flow has no state machine guard | vendors.service.js |
| FLOW-04-F01 | Whitelabel ADMIN created without assigning whitelabelId | auth.service.js |
| FLOW-04-F03 | Whitelabel plan limits not enforced at host creation time | whitelabels.service.js |
| FLOW-06-F03 | Password reset token not invalidated after single use | auth.service.js |
| FLOW-07-F01 | Phone number update does not re-verify via OTP | users.service.js |
| FLOW-07-F02 | Profile image saved to local filesystem; S3 integration missing | multer config |
| FLOW-10-F02 | Addon scope field stored but never read; wrong quota counter on activation | AddonModel.js:23 |
| FLOW-10-F03 | No idempotency key on addon purchase; double-tap = duplicate charges | addons.service.js:15 |
| FLOW-11-F04 | consumeInvites() debits pool before Event.save(); no rollback on failure | events.service.js:343 |
| FLOW-11-F05 | No idempotency key on event creation endpoint | events.routes.js |
| FLOW-12-F02 | addon extraGuests always returns 0; addon purchases never augment quota | quota logic |
| FLOW-12-F03 | Pool debit before Event.save(); same race as FLOW-11-F04 (pipeline duplicate) | events.service.js |
| FLOW-13-F02 | Removing guests via updateGuestList hard-deletes GuestModel records | events.service.js |
| FLOW-13-F03 | Taqnyat delivery status for existing messages not updated on guest-list change | messaging.service.js |
| FLOW-14-F03 | sendBulk called with no concurrency; >100 guests degrades perf significantly | scheduledTasks.js |
| FLOW-14-F04 | No idempotency keys on Taqnyat calls during launch dispatch | taqnyat.js |
| FLOW-15-F03 | Retry backoff intervals incorrect (fixed 100ms vs Gate-2 5m/15m/1h) | scheduledTasks.js |
| FLOW-15-F04 | No idempotency guard on retry; re-sends duplicate messages | messaging.service.js |
| FLOW-15-F05 | Host not notified when event fails to launch | scheduledTasks.js |
| FLOW-17-F02 | No idempotency key on Taqnyat calls; network retry = duplicate WhatsApp | messaging.service.js |
| FLOW-21-F01 | sendBulkAccessEmails uses sequential 100ms loop — Gate-1 #8 violation | post-event.service.js | 
| FLOW-23-F01 | updateTicketStatus() accepts any-to-any transition; no state machine | tickets.service.js:232 |
| FLOW-23-F03 | Mobile admin missing ticket assignment UI; backend endpoint ready | ticketsService.js (mobile) |
| FLOW-24-F01 | No approval email sent to vendor on status → approved transition | vendors.service.js |
| FLOW-24-F02 | Vendor rejection triggers hard-delete with no audit trail | vendors.service.js |
| FLOW-24-F03 | Vendor signup documents saved to local filesystem, not S3 | multer config |
| FLOW-25-F05 | Service image falls back to local filesystem when S3 upload fails | services.service.js |
| FLOW-26-F01 | Vendor rating never shown in marketplace; vendorPopulateFields missing rating | services.service.js:49 |
| FLOW-26-F02 | getPublicServices() does not filter by vendor approval status | services.service.js:25-28 |
| FLOW-27-F01 | No idempotency key on notification creation; duplicates on caller retry | NotificationModel.js |
| FLOW-27-F02 | Scheduled notifications stored but never delivered; no cron job | scheduledTasks.js |
| FLOW-28-F01 | Mobile ExportButton has no API integration; all admin exports non-functional | ExportButton.js (mobile) |
| FLOW-28-F02 | generateExcel() has no row cap; large exports will OOM or timeout | excelExport.js |
| PIPELINE-F03 ★ | consumeInvites() debits pool before Event.save(); no rollback | events.service.js:343 |
| RBAC-F01 | requirePageAccess and restrictTo use inconsistent role resolution | rbac.js |

*Note: FLOW-17-F01 moved to Critical; RBAC-F01 added; total adjusted to 37.*

### Medium (52)

| ID | Title |
|----|-------|
| FLOW-01-F06 | No rate limit on /auth/login endpoint |
| FLOW-01-F07 | JWT secret not rotated; no emergency rotation mechanism |
| FLOW-02-F03 | Host profile not validated for completeness before first event |
| FLOW-03-F01 | Vendor category not validated against allowed enum at signup |
| FLOW-03-F02 | Vendor social links not URL-validated at signup |
| FLOW-04-F02 | Whitelabel branding assets saved to local filesystem |
| FLOW-04-F04 | Whitelabel subdomain not validated for uniqueness |
| FLOW-05-F01 | No CAPTCHA or bot protection on login endpoint |
| FLOW-05-F02 | Session not invalidated on password change |
| FLOW-05-F03 | "Remember me" token shares same expiry as regular access token |
| FLOW-06-F01 | Password reset link expires in 24h (too long); OTP pattern is better |
| FLOW-06-F02 | No audit log emitted on successful password reset |
| FLOW-06-F04 | Reset email not rate-limited; can flood user inbox |
| FLOW-07-F03 | Language preference not synced between platforms |
| FLOW-08-F01 | POST /admin (create plan) and DELETE /admin/:code endpoints missing |
| FLOW-08-F02 | Live plan update silently changes limits for all active subscribers |
| FLOW-08-F03 | No audit event when a plan is updated |
| FLOW-09-F04 | Admin-assign plan endpoint is missing |
| FLOW-11-F02 | onBehalfOf hardcoded false; audit trail gap for SUPER_ADMIN event creation |
| FLOW-11-F03 | createGuestsFromList has no phone dedup; duplicate guests possible |
| FLOW-13-F01 | No 24-hour lock enforced before event launch time |
| FLOW-13-F04 | Event status block list for updates is incomplete |
| FLOW-13-F05 | No audit log emitted on event update |
| FLOW-14-F05 | Legacy Taqnyat native call path coexists with new pipeline |
| FLOW-15-F06 | Host not shown partial send count on partial failure |
| FLOW-16-F01 | Dual test-message routes with different request shapes |
| FLOW-16-F02 | Test SMS RSVP link points to dead `/rsvp/test` path |
| FLOW-17-F03 | Bulk messaging stats lost if loop crashes mid-run |
| FLOW-17-F04 | guestIds array not validated as belonging to the event |
| FLOW-18-F02 | Duplicate webhook fires host notification twice |
| FLOW-18-F03 | Guest QR code never rotatable; no revocation mechanism |
| FLOW-19-F01 | WhatsApp RSVP button does not capture plus-ones |
| FLOW-19-F02 | submitRSVP has no idempotency guard on double-submit |
| FLOW-19-F03 | Stats endpoint runs uncached DB aggregation on every poll |
| FLOW-20-F01 | No HTTP endpoint for host to revoke staff access token |
| FLOW-20-F02 | Staff SMS delivery failure is invisible to host |
| FLOW-21-F02 | requireApproval flag exists in schema but is never enforced |
| FLOW-21-F03 | Content never auto-unpublished when expiresAt passes |
| FLOW-22-F01 | getDetailedStats runs raw DB aggregate on every request; no cache |
| FLOW-22-F02 | SMS cost is hardcoded 0.15 SAR magic number |
| FLOW-22-F03 | invitation.method enum includes undocumented 'email' channel |
| FLOW-23-F02 | addReply() implemented but has no route; replies[] is dead code |
| FLOW-23-F04 | Mobile admin ticket export not wired to API |
| FLOW-24-F04 | profileCompleted flag not enforced for marketplace visibility |
| FLOW-24-F05 | No audit log on vendor status transitions |
| FLOW-25-F01 | New services default to immediately public; no explicit publish step |
| FLOW-25-F02 | Mobile missing vendor profile management screens |
| FLOW-25-F03 | WhatsApp absent from vendor social links schema |
| FLOW-26-F03 | Web vendor detail popup not wired; onCallClick handler never passed |
| FLOW-26-F04 | Mobile marketplace has no infinite scroll |
| FLOW-28-F03 | Export actions not audit-logged; Gate-1 #10 violation |
| RBAC-F03 | Staff portal uses separate token type; no unified revocation |
| RBAC-F04 | onBehalfOf hardcoded false; wrong audit trail for admin actions |
| TENANT-F02 | Tickets module relies on service-level whitelist filtering only |
| TENANT-F03 | Admin notification broadcast has no whitelabel filter |

### Low (21)

| ID | Title |
|----|-------|
| FLOW-02-F03 | No welcome email on host signup |
| FLOW-09-F02 (part) | Trial period never expires — trial stays indefinitely |
| FLOW-12-F04 | Legacy requireSubscription middleware coexists with new validateLimits |
| FLOW-16-F03 | No per-event throttle on test-message endpoint |
| FLOW-20-F03 | Check-in endpoint has no idempotency key |
| FLOW-21-F04 | sendBulkAccessEmails function and route misnamed (email but sends SMS/WhatsApp) |
| FLOW-21-F05 | uniqueVisitors stored as unbounded array on content document |
| FLOW-25-F04 | inquiryCount and bookingCount never incremented |
| FLOW-26-F05 | numberOfClicks never incremented; vendor view analytics always zero |
| FLOW-27-F03 | NotificationPreferencesModel never instantiated; separate collection is dead code |
| FLOW-27-F04 | Email delivery status never written back to notification document |
| FLOW-28-F04 | exportWhitelabels has no service-level tenant filter |
| *(remaining 9 Low findings distributed across flows 03, 04, 05, 06, 07, 08)* | Various minor gaps |

---

## Top 30 Findings (Priority Order)

Rankings factor in: severity, Gate-1 violation, how many hosts/users affected, reversibility, and whether it is a blocker for the core event flow.

| # | ID | Severity | Title | Gate-1 |
|---|---|---------|-------|--------|
| 1 | FLOW-18-F01 / PIPELINE-F02 | Critical | HMAC webhook fails open — unauthenticated RSVPs accepted | #7 |
| 2 | FLOW-14-F01 / PIPELINE-F01 | Critical | Event status set 'live' before sendBulk; no rollback | #11 |
| 3 | FLOW-14-F02 / PIPELINE-F05 | Critical | Timezone bug — Saudi events fire 3 hours early | — |
| 4 | TENANT-F01 / RBAC-F02 | Critical | ADMIN/MODERATOR have full cross-tenant data access | — |
| 5 | FLOW-12-F01 | Critical | findActiveForUser sorts oldest-first; wrong plan enforced | — |
| 6 | FLOW-09-F01 | Critical | subscribe() creates subscription without Moyasar payment | #3 |
| 7 | FLOW-10-F01 | Critical | Addon purchase no payment/activation/quota update | #3 |
| 8 | FLOW-15-F01 / PIPELINE-F04 | Critical | No 'failed' event status; launch failures leave state undefined | — |
| 9 | FLOW-01-F01 | Critical | Refresh token not rotated on use | #1 |
| 10 | FLOW-01-F02 | Critical | Access token not invalidated after refresh rotation | #1 |
| 11 | FLOW-01-F03 | Critical | Refresh token stored without sufficient protection | #1 |
| 12 | FLOW-15-F02 | Critical | retryFailed() never auto-invoked; failed events stay failed | — |
| 13 | FLOW-11-F01 | Critical | Mobile missing scheduledDate/Time inputs at event creation | #4,#11 |
| 14 | FLOW-17-F01 | Critical | Sequential 100ms send loop blocks event loop for large events | #8 |
| 15 | FLOW-11-F04 / PIPELINE-F03 | High | consumeInvites() debits pool before Event.save(); no rollback | — |
| 16 | FLOW-14-F04 | High | No idempotency keys on Taqnyat calls during launch dispatch | #6 |
| 17 | FLOW-17-F02 | High | No idempotency on Taqnyat calls; network retry = duplicate WA | #6 |
| 18 | FLOW-27-F01 | High | No idempotency key on notification creation; duplicates | #6 |
| 19 | FLOW-27-F02 | High | Scheduled notifications stored but never delivered | — |
| 20 | FLOW-12-F02 | High | addon extraGuests always 0; addon purchases never augment quota | — |
| 21 | RBAC-F01 | High | requirePageAccess and restrictTo inconsistent role resolution | — |
| 22 | FLOW-21-F01 | High | sendBulkAccessEmails sequential loop — Gate-1 #8 violation | #8 |
| 23 | FLOW-28-F01 | High | Mobile ExportButton no API integration; exports non-functional | #4 |
| 24 | FLOW-28-F02 | High | generateExcel() no row cap; OOM risk on large tenants | — |
| 25 | FLOW-24-F03 | High | Vendor signup documents on local filesystem, not S3 | — |
| 26 | FLOW-26-F02 | High | getPublicServices() doesn't filter suspended vendors | — |
| 27 | FLOW-06-F03 | High | Password reset token not invalidated after use | — |
| 28 | FLOW-15-F03 | High | Retry backoff wrong (100ms vs Gate-2 5m/15m/1h) | — |
| 29 | FLOW-13-F02 | High | Removing guests hard-deletes GuestModel records | — |
| 30 | FLOW-07-F01 | High | Phone number update no OTP re-verification | — |

---

## Items Requiring Peter's Decision

These findings involve product decisions that require owner input before implementation:

| # | Finding | Decision Required |
|---|---------|-----------------|
| 1 | FLOW-11 Q3/Q4 | onBehalfOf fields: which admin roles can create events for hosts? |
| 2 | FLOW-12 Q2 | Compensation pool: when an event has fewer guests than expected, how much is returned? |
| 3 | FLOW-13 Q5 | When host removes a guest who has already RSVP'd yes, should they receive a cancellation WA? |
| 4 | FLOW-15 Q6 | After 3 retry failures (Gate-2 decision confirmed), should event be auto-cancelled or kept as 'failed' for manual re-try? |
| 5 | FLOW-19 Q2 | Plus-ones via WhatsApp RSVP: how many max, and should they reduce the host's remaining quota? |
| 6 | FLOW-20 Q3 | Walk-in guests (no prior invitation): should gate scanner support registering them? |
| 7 | FLOW-22 Q4 | Should event cost estimations be shown to host before launch (pre-launch budget preview)? |
| 8 | FLOW-27 Q5 | Notification grouping: batch same-type high-frequency notifications (RSVP floods) or deliver individually? |
| 9 | TENANT-F01 | Confirm: are ADMIN/MODERATOR single-tenant or multi-tenant roles? This determines the correct fix. |
| 10 | RBAC-F02 | Same as above — admin role intent determines whether filter should scope by whitelabelId or stay global. |

---

## Gate-1 Compliance Scorecard

| Decision | Status | Key Finding |
|----------|--------|-------------|
| #1 — Dual-token auth (rotate on use, invalidate old) | ❌ NOT MET | FLOW-01-F01, F02, F03 |
| #2 — /api/v2 only | ❌ NOT MET | FLOW-01-F05 (v1 still active) |
| #3 — Moyasar payment stub | ❌ NOT MET | FLOW-09-F01, FLOW-10-F01 |
| #4 — Mobile parity | ❌ NOT MET | FLOW-11-F01, FLOW-23-F03, FLOW-28-F01, FLOW-25-F02 |
| #5 — RBAC + tenant scoping | ❌ NOT MET | TENANT-F01/RBAC-F02 (cross-tenant access) |
| #6 — Idempotency keys | ❌ NOT MET | FLOW-14-F04, FLOW-17-F02, FLOW-19-F02, FLOW-27-F01 |
| #7 — HMAC webhook verification | ❌ NOT MET | FLOW-18-F01 / PIPELINE-F02 |
| #8 — Batched parallel sends | ❌ NOT MET | FLOW-17-F01 / FLOW-21-F01 |
| #9 — S3 for file storage | ❌ NOT MET | FLOW-03-F03, FLOW-07-F02, FLOW-24-F03 |
| #10 — Audit logging | ⚠️ PARTIAL | Framework exists; export, vendor status, plan updates unlogged |
| #11 — Send-then-set-live | ❌ NOT MET | FLOW-14-F01 / PIPELINE-F01 |

**Gate-1 status: 0 of 11 decisions fully met. 1 partial.**

---

## Minimum Viable Fixes (Production Blocker List)

The following findings must be resolved before production launch. Ordered by the dependency chain.

1. **FLOW-01-F01/F02/F03** — Token security (auth foundation — everything else builds on this)
2. **TENANT-F01 / RBAC-F02** — Cross-tenant isolation (every admin endpoint leaks data until this is fixed)
3. **FLOW-18-F01 / PIPELINE-F02** — HMAC fails open (security — fake RSVPs injectable)
4. **FLOW-09-F01** — Subscriptions require Moyasar payment
5. **FLOW-14-F01 + FLOW-14-F02** — Status race + timezone bug (event launch correctness)
6. **FLOW-15-F01 + FLOW-15-F02** — Failed status + auto-retry (launch failure recovery)
7. **FLOW-17-F01** — Sequential send loop → replace with batch/queue (scalability)
8. **FLOW-12-F01** — findActiveForUser sort order (quota correctness)
9. **FLOW-11-F01** — Mobile event creation missing scheduled time inputs
10. **FLOW-14-F04 + FLOW-17-F02** — Idempotency on Taqnyat calls

Items 11–20 (High severity, non-blocker for MVP but required before scale):
- FLOW-11-F04 / PIPELINE-F03 (pool rollback)
- FLOW-10-F01 (addon activation pipeline)
- FLOW-27-F01/F02 (notification idempotency + scheduled delivery)
- FLOW-28-F02 (export row cap)
- FLOW-24-F03 / FLOW-07-F02 (S3 file storage)
- FLOW-26-F02 (vendor approval gate in marketplace)
