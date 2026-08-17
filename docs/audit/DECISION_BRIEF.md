# DECISION_BRIEF — Halla Platform Pre-Production Audit

**Produced from**: 28 flow files + RSVP_PIPELINE_COHERENCE.md + TENANT_SCOPING_MATRIX.md + RBAC_MATRIX.md + FINDINGS_SUMMARY.md  
**Audit branch**: `audit/pre-production`  
**Brief date**: 2026-04-29

---

## Headline numbers

- **Total findings**: 129 (117 flow-level + 12 cross-flow)
- **Critical**: 19 | **High**: 37 | **Medium**: 52 | **Low**: 21
- **Findings per repo** (estimated by primary fix location): labbe-backend ~70, halla-mobile ~20, labbe (web) ~9, cross-repo ~30
- **Bucket-3 findings** (Peter stated intent ≠ code reality, CONFLICT type): **16**
- **Gate-1 conflicts**: 10 of 11 decisions unmet; 1 partial (#10 audit logging)
- **Pipeline-coherence findings** (invisible at single-flow level): **5**
- **Tenant-scoping findings**: **3**
- **RBAC findings**: **4**

The codebase has zero Gate-1 decisions fully met and 19 Critical findings — a higher-than-expected density driven by three root causes: the entire dual-token auth architecture is absent (not partially broken — absent), the event-launch pipeline has three independent Critical bugs that interact to create silent data-loss scenarios, and cross-tenant isolation is broken at the middleware level for every admin endpoint. Medium findings (52) are largely parity gaps and missing guards that are low-risk individually but signal systemic incomplete-feature patterns across mobile in particular.

---

## Section 2 — Findings by flow (sortable table)

> Severity counts reflect post-Refinement-4 re-rates from FINDINGS_SUMMARY.md. FINDINGS_SUMMARY uses different finding IDs for some entries than the individual flow files; where they diverge, FINDINGS_SUMMARY is treated as authoritative for severities.

| Flow | Critical | High | Medium | Low | Total | Bucket-3 |
|------|----------|------|--------|-----|-------|----------|
| 01 — auth-foundation | 3 | 2 | 2 | 0 | 7 | 5 |
| 02 — signup-host | 0 | 2 | 0 | 1 | 3 | 0 |
| 03 — signup-vendor | 0 | 2 | 2 | 0 | 4 | 0 |
| 04 — signup-whitelabel | 0 | 2 | 2 | 0 | 4 | 1 |
| 05 — login | 0 | 0 | 3 | 0 | 3 | 1 |
| 06 — password-reset | 0 | 1 | 3 | 0 | 4 | 1 |
| 07 — profile-settings | 0 | 2 | 1 | 0 | 3 | 0 |
| 08 — plans-admin-crud | 0 | 0 | 3 | 0 | 3 | 0 |
| 09 — subscription-lifecycle | 1 | 2 | 1 | 0 | 4 | 1 |
| 10 — addon-purchase | 1 | 2 | 0 | 0 | 3 | 0 |
| 11 — event-creation | 1 | 2 | 2 | 0 | 5 | 2 |
| 12 — quota-enforcement | 1 | 2 | 0 | 1 | 4 | 0 |
| 13 — event-update | 0 | 2 | 3 | 0 | 5 | 0 |
| 14 — event-launch-happy | 2 | 2 | 1 | 0 | 5 | 0 |
| 15 — event-launch-failure | 2 | 3 | 1 | 0 | 6 | 0 |
| 16 — test-message | 0 | 0 | 2 | 1 | 3 | 0 |
| 17 — bulk-dispatch | 1 | 1 | 2 | 0 | 4 | 2 |
| 18 — messaging-webhook | 1 | 0 | 2 | 0 | 3 | 1 |
| 19 — guest-wa-interaction | 0 | 0 | 3 | 0 | 3 | 0 |
| 20 — gate-scanner | 0 | 0 | 2 | 1 | 3 | 0 |
| 21 — post-event-content | 0 | 1 | 2 | 2 | 5 | 1 |
| 22 — event-stats-visibility | 0 | 0 | 3 | 0 | 3 | 0 |
| 23 — tickets-lifecycle | 0 | 2 | 2 | 0 | 4 | 0 |
| 24 — vendor-onboarding | 0 | 3 | 2 | 0 | 5 | 0 |
| 25 — vendor-profile-services | 0 | 1 | 3 | 1 | 5 | 0 |
| 26 — marketplace-browse | 0 | 2 | 2 | 1 | 5 | 0 |
| 27 — notifications-delivery | 0 | 2 | 0 | 2 | 4 | 0 |
| 28 — exports | 0 | 2 | 1 | 1 | 4 | 0 |
| **Cross-flow (PIPELINE)** | 4 | 1 | 0 | 0 | 5 | — |
| **Cross-flow (TENANT)** | 1 | 0 | 2 | 0 | 3 | — |
| **Cross-flow (RBAC)** | 1 | 1 | 2 | 0 | 4 | — |

**Top 5 flows by Critical count:**
1. Flow 01 — auth-foundation (3)
2. Flow 14 — event-launch-happy (2)
3. Flow 15 — event-launch-failure (2)
4. Flow 09 — subscription-lifecycle (1), Flow 10 — addon-purchase (1), Flow 11 — event-creation (1), Flow 12 — quota-enforcement (1), Flow 17 — bulk-dispatch (1), Flow 18 — messaging-webhook (1) (tied)

**Top 5 flows by total findings:**
1. Flow 01 — auth-foundation (7)
2. Flow 15 — event-launch-failure (6)
3. Flow 11 — event-creation (5), Flow 13 — event-update (5), Flow 14 — event-launch-happy (5), Flow 21 — post-event-content (5), Flow 24 — vendor-onboarding (5), Flow 25 — vendor-profile-services (5), Flow 26 — marketplace-browse (5) (all tied at 5)

---

## Section 3 — Critical findings inventory

All 19 Critical findings. ★ = finding also present in a cross-flow artifact.

| ID | Flow | Type | Location | One-line description |
|----|------|------|----------|----------------------|
| FLOW-01-F01 | 01 | CONFLICT | `auth.service.js` | JWT_EXPIRES_IN defaults 90d; Gate-1 #1 requires ≤15min access token |
| FLOW-01-F02 | 01 | CONFLICT | `auth.service.js` | No /auth/refresh endpoint; token rotation architecture entirely absent |
| FLOW-01-F03 | 01 | CONFLICT | `authStore.js:62` (mobile) | Refresh token in AsyncStorage plain-text; expo-secure-store not installed |
| FLOW-09-F01 | 09 | CONFLICT | `subscriptions.service.js` | subscribe() creates subscription with no Moyasar payment check |
| FLOW-10-F01 | 10 | MISSING | `addons.service.js:39` | Addon purchase stores pending record only; no payment, activation, or quota update |
| FLOW-11-F01 ★ | 11 | CONFLICT | `EventSummary.js` (mobile) | Mobile Step 5 has no scheduledDate/scheduledTime inputs; event launch date lost |
| FLOW-12-F01 ★ | 12 | BUG | `subscriptions.service.js` | findActiveForUser sorts oldest-first; validateLimits enforces worst (oldest) plan |
| FLOW-14-F01 ★ | 14 | BUG | `scheduledTasks.js:141` | event.status set 'live' before sendBulk completes; no rollback on send failure |
| FLOW-14-F02 ★ | 14 | BUG | `scheduledTasks.js:99–104` | Timezone bug: cron uses server local time; SA events fire 3 hours early (UTC vs UTC+3) |
| FLOW-15-F01 ★ | 15 | MISSING | `EventModel.js` (status enum) | No 'failed' status; exhausted retries leave event 'live' with zero delivered invitations |
| FLOW-15-F02 | 15 | MISSING | `scheduledTasks.js` | retryFailed() exists but is never auto-invoked; failed sends never retried |
| FLOW-17-F01 ★ | 17 | CONFLICT | `messaging.service.js` | Sequential 100ms-sleep loop; 200 guests blocks Node event loop for 20+ seconds |
| FLOW-18-F01 ★ | 18 | CONFLICT | `messaging.controller.js:133` | HMAC check fails open if WHATSAPP_APP_SECRET unset; fake RSVPs injectable |
| PIPELINE-F01 ★ | 14→17 | BUG | `scheduledTasks.js:141` | Event 'live' before dispatch confirms; same as FLOW-14-F01, pipeline framing |
| PIPELINE-F02 ★ | 18→19 | Security | `messaging.controller.js:133` | HMAC fails open; same as FLOW-18-F01, pipeline framing |
| PIPELINE-F04 ★ | 15 | MISSING | `EventModel.js` | No 'failed' status; same as FLOW-15-F01, pipeline framing |
| PIPELINE-F05 ★ | 14 | BUG | `scheduledTasks.js:99–104` | Timezone bug; same as FLOW-14-F02, pipeline framing |
| TENANT-F01 ★ | RBAC | BUG | `whitelabel.js` | filterByWhitelabel gives ADMIN/MODERATOR null filter = full cross-tenant read/write |
| RBAC-F02 ★ | RBAC | BUG | `whitelabel.js` | ADMIN/MODERATOR whitelabelId=null; cross-tenant data exposure on every admin endpoint |

> ★ findings appear in both a flow file and a cross-flow artifact. Both are kept; the cross-flow entry adds pipeline/architectural framing. Implementation counts them as one fix each (PIPELINE-F01=FLOW-14-F01, PIPELINE-F02=FLOW-18-F01, PIPELINE-F04=FLOW-15-F01, PIPELINE-F05=FLOW-14-F02, TENANT-F01=RBAC-F02 one middleware fix).

---

## Section 4 — High findings inventory

All 37 High findings.

| ID | Flow | Location | One-line description |
|----|------|----------|----------------------|
| FLOW-01-F04 | 01 | `app.js routes` | Dual /api/v1 + /api/v2 prefixes; unversioned path bypasses v2 middleware |
| FLOW-01-F05 | 01 | `auth.js:32` | No server-side token revocation; logout doesn't invalidate server-side |
| FLOW-02-F01 | 02 | `auth.service.js` | profileCompleted flag returned but never enforced by middleware or navigator |
| FLOW-02-F02 | 02 | `auth.service.js:614` | profileCompleted ?? true default; missing hostData silently treated as profile-complete |
| FLOW-03-F03 | 03 | `auth.service.js:338` | Vendor signup docs stored at local /uploads/; not S3 |
| FLOW-03-F04 | 03 | `s3Upload.js:147` | S3 absent → local disk fallback in production; silent data-loss on multi-instance |
| FLOW-04-F01 | 04 | `authService.js` (mobile) | Mobile Phase 2 (setup-password) entirely absent; WL admin can't activate on mobile |
| FLOW-04-F03 | 04 | `auth.controller.js:410` | setupPassword doesn't set user.status='active'; login may fail after Phase 2 |
| FLOW-06-F03 | 06 | `authService.js` (mobile) | Mobile has no reset-password token screen or deep-link; reset links open web browser |
| FLOW-07-F01 | 07 | `auth.controller.js:278` | Email change in updateMe has no OTP re-verify; emailVerified stays true on new address |
| FLOW-07-F02 | 07 | `auth.service.js:348` | Vendor portfolio images stored locally, not S3 |
| FLOW-10-F02 | 10 | `AddonModel.js:23` | Addon scope field never read; wrong quota counter incremented on addon activation |
| FLOW-10-F03 | 10 | `addons.service.js:15` | No idempotency key on addon purchase; double-tap creates duplicate pending records |
| FLOW-11-F04 | 11 | `events.service.js:343` | consumeInvites() debits pool before Event.save(); no rollback on save failure |
| FLOW-11-F05 | 11 | `events.routes.js` | No idempotency key on event creation endpoint |
| FLOW-12-F02 | 12 | quota logic | addon extraGuests always returns 0; addon purchases never augment guest quota |
| FLOW-12-F03 | 12 | `events.service.js` | Pool debit before Event.save(); same race as FLOW-11-F04 (pipeline duplicate) |
| FLOW-13-F02 | 13 | `events.service.js` | Removing guests via updateGuestList hard-deletes GuestModel records; no tombstone |
| FLOW-13-F03 | 13 | `messaging.service.js` | Taqnyat delivery status not updated for existing messages on guest-list change |
| FLOW-14-F03 | 14 | `scheduledTasks.js` | sendBulk called with no concurrency limit; >100 guests degrades performance |
| FLOW-14-F04 | 14 | `taqnyat.js` | No idempotency keys on Taqnyat calls during launch dispatch; network retry = duplicate |
| FLOW-15-F03 | 15 | `scheduledTasks.js` | Retry backoff is immediate (100ms) instead of Gate-2 schedule (5m/15m/1h) |
| FLOW-15-F04 | 15 | `messaging.service.js` | No idempotency guard on retryFailed(); double-call sends duplicate messages |
| FLOW-15-F05 | 15 | `scheduledTasks.js` | Host, admins, and super-admins never notified when event launch fails |
| FLOW-17-F02 | 17 | `messaging.service.js` | No idempotency key on Taqnyat calls; network retry = duplicate WhatsApp message |
| FLOW-21-F01 | 21 | `post-event.service.js` | sendBulkAccessEmails uses sequential 100ms loop; Gate-1 #8 violation |
| FLOW-23-F01 | 23 | `tickets.service.js:232` | updateTicketStatus() accepts any-to-any transition; no state machine enforced |
| FLOW-23-F03 | 23 | `ticketsService.js` (mobile) | Mobile admin missing ticket assignment UI; backend endpoint ready but unreachable |
| FLOW-24-F01 | 24 | `vendors.service.js` | No approval email sent to vendor when status transitions to 'approved' |
| FLOW-24-F02 | 24 | `vendors.service.js` | Vendor rejection triggers irreversible hard-delete with no audit trail |
| FLOW-24-F03 | 24 | multer config | Vendor signup documents stored on local filesystem, not S3 |
| FLOW-25-F05 | 25 | `services.service.js` | Service image falls back to local filesystem when S3 upload fails |
| FLOW-26-F01 | 26 | `services.service.js:49` | Vendor rating never shown in marketplace; vendorPopulateFields missing rating field |
| FLOW-26-F02 | 26 | `services.service.js:25–28` | getPublicServices() does not filter by vendor approval status; suspended vendors visible |
| FLOW-27-F01 | 27 | `NotificationModel.js` | No idempotency key on notification creation; caller retry = duplicate notifications |
| FLOW-27-F02 | 27 | `scheduledTasks.js` | Scheduled notifications stored but never delivered; no cron job calls processScheduled |
| FLOW-28-F01 | 28 | `ExportButton.js` (mobile) | Mobile ExportButton has no API integration; all admin exports non-functional on mobile |
| FLOW-28-F02 | 28 | `excelExport.js` | generateExcel() has no row cap; large tenant exports will OOM or timeout |
| PIPELINE-F03 ★ | 11→12 | `events.service.js:343` | consumeInvites() debits pool before Event.save(); same as FLOW-11-F04, pipeline framing |
| RBAC-F01 | RBAC | `rbac.js` | requirePageAccess and restrictTo use inconsistent role resolution; SUPER_ADMIN can be 403'd |

---

## Section 5 — Medium and Low counts only

- **Medium total**: 52
- **Low total**: 21

**Medium findings touching Gate-1 #10 (audit logging):**
FLOW-08-F03, FLOW-13-F05, FLOW-24-F05, FLOW-28-F03, RBAC-F04 (5 findings)

**Medium findings — performance issues:**
FLOW-19-F03 (uncached stats aggregation), FLOW-22-F01 (getDetailedStats no cache — Peter confirmed 5m cache required), FLOW-21-F05 (uniqueVisitors unbounded array)

**Medium findings — parity gaps (web ↔ mobile feature missing):**
FLOW-25-F02 (mobile missing vendor profile management screens), FLOW-23-F04 (mobile ticket export not wired), FLOW-26-F03 (web vendor detail popup onCallClick not wired), FLOW-26-F04 (mobile marketplace no infinite scroll)

**Medium findings — dead code / schema rot:**
FLOW-21-F02 (requireApproval flag never enforced), FLOW-22-F03 ('email' channel in enum undocumented), FLOW-23-F02 (addReply() has no route), FLOW-27-F03 (NotificationPreferencesModel never instantiated), FLOW-25-F04 (inquiryCount/bookingCount never incremented)

---

## Section 6 — Bucket-3 findings inventory

Peter's stated intent ≠ code reality. All findings with **Type: CONFLICT** in the flow files. Sorted by severity DESC then ID ASC.

| ID | Flow | Severity | Location | What Peter said | What code does |
|----|------|----------|----------|-----------------|----------------|
| FLOW-01-F01 | 01 | Critical | `env.js:32` | Gate-1 #1: access tokens expire in ≤15 min | JWT_EXPIRES_IN defaults '90d'; single 90-day token issued |
| FLOW-01-F02 | 01 | Critical | `authService.js:464` | Gate-1 #1: rotating refresh endpoint required | No /auth/refresh route; mobile calls GET /auth/me as fake refresh |
| FLOW-01-F03 | 01 | Critical | `authStore.js:62` | Gate-1 #1: refresh token in expo-secure-store | AsyncStorage plain-text; expo-secure-store not installed in halla-mobile |
| FLOW-09-F01 | 09 | Critical | `subscriptions.service.js` | Gate-1 #3: Moyasar payment stub before subscription created | subscribe() saves subscription document with no payment check or stub |
| FLOW-11-F01 | 11 | Critical | `EventSummary.js` | Gate-1 #4 mobile parity + #11 schedule-before-launch | Mobile Step 5 has no scheduledDate/scheduledTime inputs; field absent |
| FLOW-17-F01 | 17 | Critical | `messaging.service.js` | Gate-1 #8: parallel/batched sends for >10 recipients | Sequential per-guest 100ms sleep loop; 200 guests = 20s event-loop block |
| FLOW-18-F01 | 18 | Critical | `messaging.controller.js:133` | Gate-1 #7: HMAC must fail closed | if (env_var && signature) → both optional; unset env var = skip verification |
| FLOW-01-F04 | 01 | High | `app.js:183–184` | Gate-1 #2: /api/v2 only; /api/v1 retired | mountRoutes('/api') and mountRoutes('/api/v2') both active simultaneously |
| FLOW-17-F02 | 17 | High | `taqnyat.js` | Gate-1 #6: idempotency keys on all external effects | No idempotency key on Taqnyat calls; network-level retry sends duplicate WA |
| FLOW-21-F01 | 21 | High | `post-event.service.js` | Gate-1 #8: parallel/batched sends | sendBulkAccessEmails uses same sequential 100ms loop as sendBulk |
| FLOW-01-F07 | 01 | Medium | `UserModel.js:609` | Peter confirmed: 30-minute account lockout | LOCK_TIME = 15 * 60 * 1000 (15 minutes) |
| FLOW-04-F02 | 04 | Medium | `UserModel.js:558` | Peter confirmed: 7-day setup token for B2B partners | passwordSetupExpires = Date.now() + 24h |
| FLOW-05-F01 | 05 | Medium | `UserModel.js:609` | Peter confirmed: 30-minute lockout (same constant as F07 above) | LOCK_TIME = 15 minutes; same single-line fix |
| FLOW-06-F01 | 06 | Medium | `UserModel.js:535` | Peter confirmed: 1-hour reset token | passwordResetExpires = Date.now() + 10 minutes |
| FLOW-11-F02 | 11 | Medium | `events.service.js:373` | Peter confirmed: SUPER_ADMIN can create events on behalf of host | onBehalfOf hardcoded false; no onBehalfOfHost linkage in audit trail |
| RBAC-F04 | RBAC | Medium | `events.service.js:373` | Peter confirmed: SUPER_ADMIN acting as host → audit trail | onBehalfOf hardcoded false (same finding as FLOW-11-F02, RBAC framing) |

> FLOW-01-F07 and FLOW-05-F01 are the same one-line code change (`LOCK_TIME` in `UserModel.js:609`). FLOW-11-F02 and RBAC-F04 are the same gap (`onBehalfOf` in `events.service.js:373`). Both pairs produce two finding IDs because they appear in different flow-file audit passes.

---

## Section 7 — Cross-flow root causes (the shared-utility list)

Sorted by leverage (most findings closed per shared fix) DESC.

### Pattern: Missing idempotency keys on external/mutating calls
- **Affected findings**: FLOW-10-F03, FLOW-11-F05, FLOW-14-F04, FLOW-15-F04, FLOW-17-F02, FLOW-19-F02, FLOW-20-F03, FLOW-27-F01
- **One-fix scope**: Create a shared `generateIdempotencyKey(namespace, ...args)` utility; wrap all Taqnyat calls, notification creates, and RSVP submits with it; store keys with TTL in Redis or MongoDB
- **Estimated leverage**: 8 findings closed

### Pattern: Local filesystem storage (S3 absent or fallback active)
- **Affected findings**: FLOW-03-F03, FLOW-03-F04, FLOW-07-F02, FLOW-24-F03, FLOW-25-F05
- **One-fix scope**: In `s3Upload.js`, throw if `NODE_ENV=production` and S3 env vars absent (remove silent disk fallback); route all upload middlewares through the S3 instance
- **Estimated leverage**: 5 findings closed

### Pattern: Sequential per-item send loops (Gate-1 #8)
- **Affected findings**: FLOW-17-F01, FLOW-21-F01 (and PIPELINE-F01 indirectly)
- **One-fix scope**: Replace the 100ms-sleep loop in `messaging.service.sendBulkMessages()` with a queue-based batch dispatcher (e.g., Bull queue or p-limit); `sendBulkAccessEmails` uses the same pattern and must be migrated at the same time
- **Estimated leverage**: 3 findings closed (blocks PIPELINE-F01 fix too)

### Pattern: Missing audit logging on write operations (Gate-1 #10)
- **Affected findings**: FLOW-08-F03, FLOW-13-F05, FLOW-24-F05, FLOW-28-F03, RBAC-F04 (indirect)
- **One-fix scope**: Add an `emitAuditEvent(action, actor, target, diff)` call in a shared audit middleware or service; wire to plan-update, event-update, vendor-status-change, and export routes
- **Estimated leverage**: 4 findings closed directly; framework benefits all future routes

### Pattern: Event launch failure state machine absent
- **Affected findings**: FLOW-15-F01, FLOW-15-F02, PIPELINE-F04
- **One-fix scope**: Add `'failed'` to `EVENT_STATUS` enum in `status.js`; add retry cron in `scheduledTasks.js`; update `scheduleEventLaunch` catch block to set status='failed' and notify
- **Estimated leverage**: 3 findings closed (prerequisite for PIPELINE-F01 fix)

### Pattern: Pool/quota debit before persistent save (race condition)
- **Affected findings**: FLOW-11-F04, FLOW-12-F03, PIPELINE-F03
- **One-fix scope**: Move `consumeInvites()` to after `Event.save()` succeeds, or wrap both in a MongoDB multi-document transaction; add compensating `returnInvites()` in catch block
- **Estimated leverage**: 3 findings closed

### Pattern: Cross-tenant null filter (ADMIN/MODERATOR scope)
- **Affected findings**: TENANT-F01, RBAC-F02
- **One-fix scope**: In `filterByWhitelabel()`, set `whitelabelId: req.user.whitelabelId` for ADMIN/MODERATOR roles (same as WHITELABEL_ADMIN branch); requires each ADMIN/MODERATOR to have a whitelabelId assigned at creation
- **Estimated leverage**: 2 findings closed directly; secures 20+ admin endpoints as side-effect

### Pattern: Missing mobile screens / parity gaps
- **Affected findings**: FLOW-04-F01 (WL setup-password), FLOW-06-F03 (reset-password), FLOW-23-F03 (ticket assignment), FLOW-25-F02 (vendor profile), FLOW-28-F01 (export button)
- **One-fix scope**: Build 5 missing mobile screens/flows; each is independent but share the pattern of "backend endpoint ready, mobile screen absent"
- **Estimated leverage**: 5 findings closed (each is a separate build task)

---

## Section 8 — Pipeline-coherence findings

All 5 findings from `RSVP_PIPELINE_COHERENCE.md`. ★ = also a flow-level finding.

| ID | Severity | Boundary | Issue |
|----|----------|----------|-------|
| PIPELINE-F01 ★ | Critical | 14→17 | Event marked 'live' before sendBulk completes; no rollback on send failure |
| PIPELINE-F02 ★ | Critical | 18→19 | HMAC webhook verification fails open; unauthenticated payloads inject fake RSVPs |
| PIPELINE-F03 ★ | High | 11→12 | consumeInvites() debits quota pool before Event.save(); host loses quota on save failure |
| PIPELINE-F04 ★ | Critical | 14→15 | No 'failed' event status; exhausted retries leave event stuck in 'live' with zero sends |
| PIPELINE-F05 ★ | Critical | 14 (cron) | Timezone bug: scheduleEventLaunch uses server local time; SA events fire 3 hours early |

All 5 pipeline findings are ★ (overlapping with flow-level findings). The pipeline document adds cross-stage framing: PIPELINE-F01 + PIPELINE-F04 must be fixed together (can't fix the status-race without the 'failed' status existing).

---

## Section 9 — Tenant scoping outcomes

- **Routes audited**: 48 distinct endpoint groups across 10 route modules
- **"Should be scoped, is not" findings**: 3
- **"Cross-tenant by design, confirmed correct"**: 9

**"Should be scoped, is not" routes:**

| Finding | Routes affected | Description |
|---------|----------------|-------------|
| TENANT-F01 (Critical) | All GET/POST `/admin/*` (hosts, vendors, events, subscriptions, payments, stats) | filterByWhitelabel gives ADMIN/MODERATOR null filter; same cross-tenant access as SUPER_ADMIN |
| TENANT-F02 (Medium) | GET/POST `/tickets/*` | No filterByWhitelabel middleware; tenant isolation is service-level only — one missed query silently crosses tenants |
| TENANT-F03 (Medium) | POST `/notifications/send`, POST `/notifications/broadcast` | restrictTo(ADMIN, SUPER_ADMIN) with no whitelabel filter; ADMIN broadcast reaches all-tenant users |

**Cross-tenant by design (confirmed correct):**
GET /services/public (shared marketplace), GET /vendors/categories (reference data), GET /vendors/:id (public profile), GET /locations/* (SA region data), POST /auth/* (pre-auth, no tenant), GET /plans (global catalog), GET /messaging/webhook (Taqnyat callback), GET /guests/rsvp/:token (public RSVP), GET /post-event/:token (public content access)

---

## Section 10 — RBAC inconsistencies

- **Backend ↔ frontend role/permission mismatches**: 2 (FLOW-23-F03 ticket assignment mobile gap; FLOW-28-F01 export mobile gap — not RBAC per se, but frontend doesn't surface backend-ready endpoints)
- **RBAC findings (RBAC_MATRIX.md)**:

| ID | Severity | One-line description |
|----|----------|----------------------|
| RBAC-F01 | High | requirePageAccess uses exact-role match; restrictTo uses hierarchy — SUPER_ADMIN can be 403'd on requirePageAccess routes |
| RBAC-F02 | Critical | ADMIN/MODERATOR receive null whitelabelId filter; de-facto SUPER_ADMIN data access |
| RBAC-F03 | Medium | StaffAccessToken is outside JWT RBAC system; no unified revocation endpoint |
| RBAC-F04 | Medium | onBehalfOf hardcoded false; SUPER_ADMIN event creation misattributed in audit trail |

---

## Section 11 — Open product decisions blocking implementation

### 11a. [NEEDS RE-CONFIRMATION] from Phase 2 still pending

None documented — confirmed by scan of FINDINGS_SUMMARY "Items Requiring Peter's Decision" section, which does not flag any Phase 2 answers awaiting re-confirmation. All listed decisions are net-new from Phase 3 deep audit.

### 11b. New product decisions surfaced in Phase 3

| Question | Flow | What was proposed | Why it blocks implementation |
|----------|------|-------------------|------------------------------|
| onBehalfOf: which admin roles can create events for hosts? | 11 | SUPER_ADMIN and ADMIN can create on behalf; payload includes onBehalfOfHost userId | Can't build onBehalfOf audit trail without role list confirmed |
| Compensation pool: how much returned when event has fewer guests than expected? | 12 | Full refund of unconsumed invites to subscription pool | Quota rollback logic depends on refund formula |
| Cancel WA message to RSVP'd guest when removed from guest list? | 13 | Not specified | Removing guest could require Taqnyat cancel-message call if yes |
| After 3 retry failures, auto-cancel event or keep as 'failed' for manual retry? | 15 | Keep as 'failed' (recoverable) — proposed | Determines whether 'failed' status is terminal or recoverable |
| Plus-ones via WhatsApp RSVP: max count, and does it reduce host quota? | 19 | Not specified | submitRSVP plus-one logic and quota debit depend on this |
| Walk-in guests (no prior invitation): does gate scanner support registering them? | 20 | Not specified | GuestModel insert path and check-in endpoint scope differ |
| Pre-launch cost estimate shown to host before sending? | 22 | Not specified | Affects EventSummary screen design in mobile and web |
| Notification grouping: batch same-type notifications or deliver individually? | 27 | Not specified | NotificationModel schema and delivery cron design differ |
| Are ADMIN/MODERATOR single-tenant or multi-tenant roles? | TENANT-F01 | Single-tenant assumed for fix | filterByWhitelabel fix requires each ADMIN to have whitelabelId assigned — breaks if ADMIN is intentionally cross-tenant |
| Same as above from RBAC perspective | RBAC-F02 | Same | RBAC-F02 fix is identical code; same decision needed |

---

## Section 12 — Dependency hints

| Prerequisite | Dependent | Reason |
|--------------|-----------|--------|
| FLOW-01-F02 (build /auth/refresh endpoint) | FLOW-01-F03 (mobile expo-secure-store migration) | Mobile can't migrate to expo-secure-store until the refresh endpoint exists to silently re-issue tokens on startup |
| FLOW-01-F01 (15min access token) | FLOW-01-F05 (server-side token revocation) | Revocation list only makes operational sense once tokens are short-lived; 90d JTIs in a blocklist would require unbounded storage |
| FLOW-15-F01 (add 'failed' status to EVENT_STATUS) | FLOW-14-F01 fix (set 'failed' on send failure instead of staying 'live') | The catch block in scheduleEventLaunch cannot set event.status='failed' until that constant exists |
| FLOW-15-F01 (add 'failed' status) | FLOW-15-F02 (auto-retry cron) | Retry cron must query events with status='failed' or a 'launching' intermediate status |
| FLOW-15-F01 + FLOW-15-F02 | PIPELINE-F01 fix (send-then-set-live) | The status-race fix requires a defined failure path; without 'failed' status, the catch block has nowhere to go |
| FLOW-17-F01 (replace sequential loop with batch queue) | FLOW-14-F01 fix (know when "all sends complete") | Knowing dispatch is complete requires the queue to signal completion; a loop can check synchronously, but the fix requires async batch tracking |
| TENANT-F01 / RBAC-F02 fix (assign whitelabelId to ADMIN) | All admin endpoint QA | Cross-tenant isolation must be closed before admin features can be meaningfully end-to-end tested without data bleeding between tenants |
| FLOW-09-F01 (Moyasar payment stub for subscriptions) | FLOW-10-F01 (addon purchase pipeline) | Addon purchase design mirrors subscription payment; build subscription payment first as the pattern |
| FLOW-12-F01 (fix findActiveForUser sort to newest-first) | FLOW-12-F02 fix (addon extraGuests augmentation) | Sort fix establishes the correct active subscription; addon augmentation logic reads from the same query result |
| FLOW-03-F04 (disable S3 disk fallback in prod) | FLOW-03-F03, FLOW-07-F02, FLOW-24-F03, FLOW-25-F05 | All filesystem-storage findings require the same underlying fix: enforce S3 in production; disabling the fallback surfaces misconfiguration before data is written to disk |
| FLOW-01-F01/F02/F03 (dual-token architecture) | FLOW-06-F01 (password reset purges refresh tokens) | Under Gate-1 architecture, resetPassword must also purge all refresh tokens for the user; can't implement purge until refresh tokens exist |

---

## Section 13 — Calibration check

- **Mean Critical per flow**: 13 flow-level Criticals ÷ 28 flows = **0.46**
- **Max Critical in one flow**: **3** (Flow 01 — auth-foundation)
- **Min Critical in one flow**: **0** (Flows 02, 03, 04, 05, 06, 07, 08, 13, 16, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28)
- **Flows with zero findings**: None — all 28 flows have at least 3 findings
- **Flows with >10 findings**: None — Flow 01 (7) is the maximum single-flow count
- **Severity re-rates documented in FINDINGS_SUMMARY (Refinement 4 pass)**: **4 promoted** (TENANT-F01, RBAC-F02, FLOW-12-F01, PIPELINE-F05/FLOW-14-F02, plus FLOW-17-F01 noted separately); **0 demoted**

**Calibration observations worth flagging:**
- Flow 01 is 3× denser than the median (7 vs ~3.5) — justifiable; it is the auth foundation and most other flows inherit its gaps
- Flows 05, 07, 08, 22 each have 3 findings, all Medium or below — none Critical or High. These flows have a disproportionate share of cosmetic/parity findings and may be under-audited relative to their security surface (login and profile-settings in particular have known attack surface that produced only Medium findings)
- FINDINGS_SUMMARY and individual flow files have finding ID discrepancies for several flows (notably FLOW-01, FLOW-02, FLOW-05): FINDINGS_SUMMARY uses different descriptions for the same FLOW-XX-FNN ID that appears in the flow file. Implementors must treat FINDINGS_SUMMARY as the authoritative post-consolidation register and cross-check the flow file for full code context

---

## Section 14 — Quick-win candidates

Critical or High severity, single-file fix, no product decisions blocking, no dependencies on unbuilt features. Maximum 15 rows.

| ID | Severity | Location | One-line description |
|----|----------|----------|----------------------|
| FLOW-18-F01 | Critical | `messaging.controller.js:133` | Flip HMAC condition to fail closed: `if (!secret \|\| !sig \|\| !verify(...))` |
| FLOW-14-F02 | Critical | `scheduledTasks.js:99–104` | Replace getHours()/getMinutes() with timezone-aware extraction (date-fns-tz, 'Asia/Riyadh') |
| FLOW-12-F01 | Critical | `subscriptions.service.js` | Change `.sort({createdAt: 1})` to `.sort({createdAt: -1})` in findActiveForUser |
| FLOW-01-F04 | High | `app.js:184` | Remove `mountRoutes('/api')` call; add 410 Gone handler at `/api/*` |
| FLOW-03-F04 | High | `s3Upload.js:147` | Throw on startup if `NODE_ENV=production` and S3 env vars absent; no silent fallback |
| FLOW-04-F03 | High | `auth.controller.js:410` | Add `user.status = USER_STATUS.ACTIVE` inside setupPassword before user.save() |
| FLOW-26-F02 | High | `services.service.js:25–28` | Add `{ status: 'approved' }` to getPublicServices() query; suspended vendors leak to marketplace |
| FLOW-27-F02 | High | `scheduledTasks.js` | Add `notificationService.processScheduled()` call to the existing scheduled-tasks cron |
| FLOW-09-F03 | High | `subscriptions.service.js` | Fix expiry cron to set `subscription.status = 'expired'` instead of leaving status unchanged |
| FLOW-23-F01 | High | `tickets.service.js:232` | Add allowed-transition map; reject illegal status transitions with 400 before update |
| FLOW-24-F02 | High | `vendors.service.js` | Change hard-delete on vendor rejection to soft-delete + audit log entry |
| FLOW-13-F02 | High | `events.service.js` | Replace `Guest.deleteMany()` with `Guest.updateMany({}, { $set: { deleted: true } })` on guest removal |
| FLOW-06-F04 | High | `ChangePassword.js:76` | Replace resetPassword mutation with PATCH /update-password; add currentPassword field to form |
| FLOW-01-F07 | Medium | `UserModel.js:609` | Change `LOCK_TIME = 15 * 60 * 1000` to `30 * 60 * 1000` (one constant, fixes FLOW-01-F07 + FLOW-05-F01) |
| FLOW-06-F01 | Medium | `UserModel.js:535` | Change `passwordResetExpires` from `+10min` to `+60min`; update email template copy |

---

## STOP — Decision brief produced

### File produced
- `docs/audit/DECISION_BRIEF.md` (~12 pages, 129 total findings consolidated)

### Section completion check
- [x] Section 1 — Headline numbers
- [x] Section 2 — Findings by flow (28-flow table + cross-flow rows)
- [x] Section 3 — Critical inventory (19 rows)
- [x] Section 4 — High inventory (40 rows including cross-flow; 37 unique by FINDINGS_SUMMARY count)
- [x] Section 5 — Medium/Low counts (52 M / 21 L)
- [x] Section 6 — Bucket-3 inventory (16 rows; 2 pairs are same code change)
- [x] Section 7 — Cross-flow root causes (8 patterns)
- [x] Section 8 — Pipeline-coherence findings (5)
- [x] Section 9 — Tenant scoping outcomes (3 gaps, 9 intentional)
- [x] Section 10 — RBAC inconsistencies (4 findings)
- [x] Section 11 — Open product decisions (10 blocking; 0 Phase 2 re-confirmations pending)
- [x] Section 12 — Dependency hints (11 documented)
- [x] Section 13 — Calibration check
- [x] Section 14 — Quick-win candidates (15 rows)

### Anomalies worth flagging

**Finding ID discrepancy between flow files and FINDINGS_SUMMARY**: The FINDINGS_SUMMARY uses different finding descriptions for several same-numbered IDs (e.g., FLOW-02-F03 is "Egypt phone normalization / Low" in the flow file but appears as "Host profile not validated / Medium" in FINDINGS_SUMMARY; FLOW-01-F04/F05 descriptions differ similarly). FINDINGS_SUMMARY also lists ~9 Low findings "distributed across flows 03–08" that do not appear in any individual flow file. The two sources are not reconcilable by ID alone — the implementation plan must treat FINDINGS_SUMMARY as the consolidated register and use flow files for code context, not for ID lookups.

**FLOW-27-F03/F04 appear in both Medium and Low lists** in FINDINGS_SUMMARY — the flow file clearly shows both as Low (grep confirms severity lines at Low). The Medium listing in FINDINGS_SUMMARY is a copy-paste error in the summary document.

**TENANT-F01 and RBAC-F02 are the same one-line fix** (`filterByWhitelabel` role branch in `whitelabel.js`), promoted to Critical from two different audit lenses. The implementation plan should count these as one PR, not two.
