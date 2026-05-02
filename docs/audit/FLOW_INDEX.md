# Halla — Flow Index

**Branch:** `audit/pre-production`  
**Phase:** 2 complete — all stubs written, ready for Phase 3 deep audit  
**Audit date:** 2026-04-27

---

## Section A: Flows

28 flows. All status = `stubbed`. Phase 3 will fill each stub with the full audit template.

| ID | Slug | Title | Scope | Status | Key Roles | Depends On |
|----|------|-------|-------|--------|-----------|------------|
| 01 | auth-foundation | Auth — access + refresh token redesign | [backend] [web] [mobile] | stubbed | all | — |
| 02 | signup-host | Signup — host (OTP) | [backend] [web] [mobile] | stubbed | host | 01 |
| 03 | signup-vendor | Signup — vendor (application → approval → first login) | [backend] [web] [mobile] | stubbed | vendor, admin, super_admin | 01 |
| 04 | signup-whitelabel | Signup — whitelabel (application + post-approval setup-password) | [backend] [web] [mobile] | stubbed | whitelabel_admin, admin, super_admin | 01 |
| 05 | login | Login — all roles (OTP + email/password) | [backend] [web] [mobile] | stubbed | all | 01 |
| 06 | password-reset | Password reset & email verification | [backend] [web] [mobile] | stubbed | host, vendor, whitelabel_admin, admin | 01 |
| 07 | profile-settings | Profile & account settings per role | [backend] [web] [mobile] | stubbed | all | 01, 05 |
| 08 | plans-admin-crud | Plans — admin CRUD (admin-editable, not hardcoded) | [backend] [web] | stubbed | super_admin | — |
| 09 | subscription-lifecycle | Subscription purchase, change, cancel, expiry | [backend] [web] [mobile] | stubbed | host, whitelabel_admin, admin, super_admin | 08 |
| 10 | addon-purchase | Addon purchase & flexible guest quota | [backend] [web] [mobile] | stubbed | host, whitelabel_admin | 09 |
| 11 | event-creation | Event creation wizard — 5 steps (web + mobile parity) | [backend] [web] [mobile] | stubbed | host | 09, 12 |
| 12 | quota-enforcement | Plan/quota enforcement during event creation | [backend] [web] [mobile] | stubbed | host, system | 09 |
| 13 | event-update | Event update — allowed fields per status & time-window locks | [backend] [web] [mobile] | stubbed | host, admin, whitelabel_admin | 11 |
| 14 | event-launch-happy | Event launch — happy path (cron-only, invites first) | [backend] [web] [mobile] | stubbed | host, system | 13, 17 |
| 15 | event-launch-failure | Event launch failure & recovery (retry, failed status, notifications, UI) | [backend] [web] [mobile] | stubbed | host, admin, super_admin, system | 14 |
| 16 | test-message | Test message send | [backend] [web] [mobile] | stubbed | host | 13 |
| 17 | bulk-dispatch | Bulk WhatsApp/SMS dispatch (idempotency, rate cap, cron race) | [backend] | stubbed | system | 13, 14 |
| 18 | messaging-webhook | Messaging webhook & delivery callbacks (HMAC, RSVP, idempotent) | [backend] | stubbed | system | 14, 15 |
| 19 | guest-wa-interaction | Guest WhatsApp interaction → event stats refresh | [backend] [web] [mobile] | stubbed | guest, host | 14, 21 |
| 20 | gate-scanner | Gate scanner (auth, happy path, error cases, stats update) | [backend] [web] [mobile] | stubbed | staff, host, admin | 11, 22 |
| 21 | post-event-content | Post-event content (create, upload, share, view) | [backend] [web] [mobile] | stubbed | host, guest | 11, 20 |
| 22 | event-stats-visibility | Event stats visibility per role | [backend] [web] [mobile] | stubbed | host, whitelabel_admin, whitelabel_moderator, admin, super_admin | 11, 20 |
| 23 | tickets-lifecycle | Tickets — full lifecycle (create → assign → resolve → rate) | [backend] [web] [mobile] | stubbed | host, vendor, admin, moderator, whitelabel_admin | 11 |
| 24 | vendor-onboarding | Vendor onboarding (register → pending → approve/decline → first login) | [backend] [web] [mobile] | stubbed | vendor, admin, super_admin | 03 |
| 25 | vendor-profile-services | Vendor profile & service CRUD | [backend] [web] [mobile] | stubbed | vendor, admin | 24 |
| 26 | marketplace-browse | Marketplace browse (list, filter, vendor popup) | [backend] [web] [mobile] | stubbed | host, guest | 25 |
| 27 | notifications-delivery | Notifications — in-app, email, push, WhatsApp (delivery + preferences) | [backend] [web] [mobile] | stubbed | all | — |
| 28 | exports | Exports — all endpoints and screens (mobile parity gap) | [backend] [web] | stubbed | host, admin, super_admin, whitelabel_admin | 11, 22, 23 |

---

## Section B: Cross-flow artifacts

These are documents, not flows. They cut across all flows and will be filled in Phase 3.

| File | Purpose | Status |
|------|---------|--------|
| `RBAC_MATRIX.md` | Every role × every protected resource × allowed actions; derived from `restrictTo()` calls and frontend guards | stub |
| `TENANT_SCOPING_MATRIX.md` | Per route group: should be tenant-scoped (yes/no/cross-tenant by design) + reasoning + actual code state | stub |
| `PARITY_MATRIX.md` | Every user-facing feature × web present × mobile present × gap description × severity | stub |
| `AUDIT_LOG_POLICY.md` | Which actions get logged, required fields, who can read, retention, performance budget | stub |
| `API_DEPRECATION.md` | Remove `/api` non-versioned mount. One web caller found (`labbe/utils/index.js:291`). Zero mobile callers. | stub |
| `SHARED_CONSTANTS_PLAN.md` | Shared npm package: ROLES, STATUS enums, ENDPOINTS, PLAN_CODES across all three repos | stub |

---

## Section C: Infrastructure findings (Phase 2 confirmations)

### C-1 — `config.env` git status
**Severity:** Medium (at-rest risk only; no git exposure)

`git ls-files labbe-backend-/config.env` → no output (not tracked).  
`git log -- labbe-backend-/config.env` → no commits (never committed).  
Both `labbe-backend-/.gitignore` and root `.gitignore` list `config.env`.

**Result:** Secrets have never been in git history. Risk is limited to server at-rest exposure (plaintext file on disk). Medium severity — acceptable for dev, must use secret manager before production.

---

### C-2 — Whitelabel post-approval setup-password absent on mobile
**Severity:** High

`WhitelabelSignupScreen.js` (application phase, 5-step form) exists on mobile — confirmed present.  
Zero references to `setup-password`, `validate-setup-token`, or `SETUP_PASSWORD` found anywhere in `halla-mobile/`.  

Web has:
- `labbe-backend-/src/modules/auth/auth.routes.js` — `GET /auth/validate-setup-token/:token` and `POST /auth/setup-password`
- `labbe-backend-/src/modules/auth/auth.controller.js` — `validateSetupToken`, `setupPassword`

Mobile has: nothing.

**Decision (confirmed):** Must be added to mobile. An approved whitelabel admin currently cannot complete onboarding on mobile.

---

### C-3 — Plans hardcoded in source, not admin-editable
**Severity:** High

Current state:
- `labbe-backend-/src/shared/constants/plans.js` — `PLAN_CODES` (36 plan codes), `PLAN_FAMILIES`, `BILLING_TYPES`
- `labbe-backend-/src/shared/constants/planDefaults.js` — all price/limit/feature defaults keyed by `PLAN_CODE`
- `labbe-backend-/scripts/seedPlans.js` — seeds PlanModel from these constants

Admin endpoints today: only `GET /plans/admin/all` and `PATCH /plans/admin/:code` (SUPER_ADMIN only).  
Missing: `POST /plans/admin` (create), `DELETE /plans/admin/:code`.

**Decision (confirmed):** Plans must be fully admin-editable from the dashboard. Requires: new POST + DELETE endpoints, DB-first plan management (constants become seeds only, not the source of truth).

---

### C-4 — Subscription unreachable states
**Severity:** Low

States actually written anywhere in codebase:
- `trial` — `SubscriptionModel` default
- `active` — `subscriptions.service.js` on subscribe/change-plan
- `cancelled` — `subscriptions.service.js:390, 438`
- `expired` — `scheduledTasks.js` subscription status update cron

States defined in `SUBSCRIPTION_STATUS` but **never written**:
- `past_due` — placeholder for future payment processor
- `pending` — unused
- `suspended` — unused
- `completed` — unused

**Decision:** These 4 states are dead code until payment lands. Flag for cleanup in Phase 7.

---

### C-5 — Scheduling dual-path — remove Taqnyat-native path
**Severity:** High

Two paths exist for the same outcome:

Path A (cron): `scheduledTasks.js:scheduleEventLaunch` runs every minute, finds `status=scheduled` events at their `scheduledTime`, calls `messagingService.sendBulk()`.

Path B (Taqnyat-native): `messaging.service.js:409–452` — when host schedules an event, sends SMS with `scheduledDatetime` param to Taqnyat. Stores `taqnyatDeleteId` in event. Cron (`scheduledTasks.js:151–155`) then SKIPS the send if `taqnyatDeleteId` exists.

Problems:
- If Taqnyat silently drops the scheduled send, event stays `scheduled`, no alert fires
- If both paths fire, host gets duplicate messages
- Taqnyat likely does not support native WhatsApp scheduling (Peter confirmed: SMS only, not WhatsApp)

**Decision (confirmed):** Remove Path B entirely. Use cron only. Remove `taqnyatDeleteId` logic from `messaging.service.js` and `scheduledTasks.js`. Remove `taqnyatDeleteId` field from `EventModel`.

---

### C-6 — `BusinessSetupFeeModel` semi-orphaned write path
**Severity:** Medium

Only usage found: `subscriptions.service.js:319` — `BusinessSetupFee.findOne({ organizationId: userId, status: 'paid' })` — guards trial re-subscription for business plans.  
Registered explicitly in `server.js:13`.  
No WRITE to this model anywhere in application code.

The guard check queries for a fee record that nothing in the app creates. An admin would have to insert this record directly in MongoDB. Fix phase decision: either wire up a fee-creation endpoint or remove the guard if the business setup fee concept is being retired.

---

## Phase 2 flow refinement rationale

### vs. Phase 1 candidate list (34 items → 28 flows + 6 artifacts)

| Change | Rationale |
|--------|-----------|
| Kept flows 1–7 (auth & account) | No merges — each signup variant has a distinct approval step and distinct entry points |
| Added flow 10 (addon-purchase) | Peter confirmed addons must dynamically update event quotas — this is a distinct contract from subscription lifecycle |
| Merged "RBAC enforcement matrix" into cross-flow artifact | It is a document, not a user journey |
| Merged "multi-tenancy scoping" into cross-flow artifact | Same — a decision matrix, not a flow |
| Merged "web ↔ mobile parity audit" into cross-flow artifact (PARITY_MATRIX) | It is a verification document, not a flow |
| Added cross-flow artifact SHARED_CONSTANTS_PLAN | Peter confirmed the shared package must be built |
| Added cross-flow artifact API_DEPRECATION | Peter confirmed /api non-versioned must be removed |
| Kept "audit log" as cross-flow artifact | Contract document, not a flow |
| Flow 17 scope is [backend] only | Bulk dispatch is a backend-only pipeline; web/mobile trigger it but don't participate in the loop |
| Flow 18 scope is [backend] only | Webhook is backend-only; downstream effects appear in other flows |
| Flow 28 (exports) scope is [backend][web] only | Mobile has zero export implementation today; gap is captured as a finding |
