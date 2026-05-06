# Halla Implementation — Phase 5: Audit Log Activation + Edges + Polish

> Paste this into a **fresh** Claude Code session. Phase 5 closes every remaining open finding from the implementation ledger. It wires the audit log everywhere, fixes the remaining Mediums and Lows, and lands the Phase 4d hand-offs.

## 0. Why this exists

Phases 1–4 built the foundations and closed ~107 findings. Phase 5 closes the remaining ~24 open findings across auth/profile, vendor/marketplace, event lifecycle, notifications, tickets, and RBAC/tenant isolation, plus the audit-log-everywhere pass and the Phase 4c/4d hand-offs. When this phase merges, the implementation ledger is fully closed.

Eight tracks. Track A (foundation fixes) and Track B (audit log wiring) run sequentially at the start. Tracks C–H are parallel-safe and run concurrently after Track B settles on the files they share.

## 0.5. State of the world before this prompt

**Branch:** `claude/implement-phase-5-xP9mK` — cut from `master` post-Phase-4d merge.

**Commits already on this branch:**
- `12425c9` — `[PHASE-5] Track A — foundation: redactSensitive fix, AuditLog enum, remove dual /api mount`

**Progress files already in `docs/implementation/`:**
- `PHASE_5_PLAN.md` — full track breakdown (Tracks A–H), file ownership, parallelism map.
- `PHASE_5_PROGRESS.md` — checklist of every item (currently mostly unchecked; update as work lands).

Track A is committed and complete. Start this session at **Track B**.

**Key utilities available (built in Phases 1–4):**
- Idempotency: `src/shared/middleware/idempotency.js` + `src/shared/utils/idempotency.js` (BSON contract: assert on core fields, not deep-equal entire bodies).
- Audit log: `src/shared/middleware/auditLog.js` + `models/AuditLogModel.js`. `targetType` enum is **lowercase** (gotcha from Phase 3a). `plan` and `addon` are now in the enum (Track A).
- S3 file upload: `processUploadedFiles(files)` helper (Phase 1b). Never write manual `/uploads/...` local paths.
- Timezone: `src/shared/utils/timezone.js` — use `nowUtc()` for all timestamp comparisons.
- `runBatched` utility (Phase 3b): concurrency 5, 10/sec cap, use for any bulk operation.
- Payment scaffold: `src/infrastructure/paymentProvider/` (factory + moyasarProvider + stubProvider).
- `@halla/shared-schemas` workspace package (Phase 4d).

**Naming constants (unchanged from prior phases):**
- `STAFF` role (audit docs) ≡ `ENTRANCE_GATE` (code). `StaffAccessToken` model unchanged. `/staff-portal` URL unchanged.

## 1. Standing rules

### 1.1 Check before you create

Before adding any new module, grep for existing patterns. Read each relevant utility before consuming. Confirm import paths and function signatures in the actual files — don't assume they match the Phase 1 docs verbatim; utilities were extended in later phases.

### 1.2 Build + wire actually wired

Every fix in this phase must be fully wired. "Added the model field" without wiring the validation or the service call does not close a finding. Each finding's closing criteria is stated in its track section.

### 1.3 Clean break, no backward compatibility

No compat shims. If removing a route or field, remove it. Schema additions must update consumers in the same commit.

### 1.4 Smoke tests

Smoke tests live in `docs/implementation/phase-5-smoke-tests/`. The existing static-check harness is `static-checks-5.js` (~30 assertions already listed in `PHASE_5_PLAN.md`). Add any additional specs as separate files in the same directory. Each spec runs live against a running server (port 8000 confirmed) before the track is marked done.

### 1.5 Progress files

Update `PHASE_5_PROGRESS.md` after every meaningful milestone. Write `PHASE_5_REPORT.md` at the end. Update `IMPLEMENTATION_LEDGER.md` — move every closed finding from "Open" to a "Closed in Phase 5" section with the commit SHA.

Do not update `IMPLEMENTATION_LEDGER.md` mid-track. Update it once, at the very end, after all smoke tests pass.

### 1.6 Sub-agent parallelism rule

Two sub-agents must never edit the same file. Owned-file lists are declared in `PHASE_5_PLAN.md`. If a sub-agent finds unexpected file overlap, stop and re-plan before edits. Tracks C, D, E, F, G, H each own separate module trees and are parallel-safe.

### 1.7 Branch strategy

All Phase 5 work lands on `claude/implement-phase-5-xP9mK`. No sub-branches. One commit per logical sub-step, labeled `[PHASE-5-B]`, `[PHASE-5-C]`, etc. Track suffix + finding ID in the subject: `[PHASE-5-D] FLOW-03-F04: vendor approval state machine`.

### 1.8 Single session, no parallel working trees

One Claude Code session at a time on this working directory. Sub-agents within the session are fine; separate Claude Code sessions on the same tree are not.

### 1.9 AuditLog target-type gotcha

`AuditLogModel.targetType` enum values are **lowercase strings** (`'user'`, `'event'`, `'plan'`, `'addon'`, `'ticket'`, `'subscription'`, `'vendor'`, `'service'`, `'whitelabel'`, `'notification'`, `'staff_access_token'`, `'guest_access_token'`, `'rsvp'`). Using uppercase causes schema validation failures silently dropped in some Mongo versions. Grep the model before adding a new type to confirm it is not already there.

---

## 2. Findings overview — all eight tracks

| Track | Label | Core files | Findings |
|-------|-------|------------|----------|
| A | Foundation (done) | `auditLog.js`, `AuditLogModel.js`, `app.js` | FLOW-01-F05 + 2 pre-reqs |
| B | Audit log wiring | auth, events, tickets, post-event, users, notifications | 7 audit wire-ups |
| C | Auth / profile | `auth.service.js`, `users.service.js`, `OTPModel.js`, `auth.routes.js` | FLOW-02, FLOW-04, FLOW-06, FLOW-07 |
| D | Vendor / marketplace | `vendors.service.js`, `services.service.js`, `vendors.routes.js`, `UserModel.js` | FLOW-03, FLOW-24, FLOW-25, FLOW-26 |
| E | Event lifecycle | `events.service.js`, `messaging.service.js`, `messaging.routes.js`, `scheduledTasks.js`, `EventModel.js`, `post-event.service.js` | FLOW-11–F02/F03/F05, FLOW-12–F02/F04, FLOW-13, FLOW-14-F05, FLOW-15-F06, FLOW-16, FLOW-17-F03/F04, FLOW-19-F03, FLOW-21-F02/F04/F05, FLOW-22 |
| F | Notifications | `notifications.service.js`, `scheduledTasks.js`, `NotificationPreferencesModel.js` | FLOW-27 |
| G | Tickets / RBAC / Tenant | `tickets.service.js`, `tickets.routes.js`, `auth.js` middleware, `notifications.routes.js` | FLOW-23-F01/F02, RBAC-F01, TENANT-F02/F03 |
| H | Exports + Phase 4d hand-offs | `admin.service.js`, `admin.routes.js`, `events.routes.js`, mobile shim files | FLOW-28-F04, two 4d hand-offs |

Track A is already committed. Tracks C–H are parallel-safe after Track B.

---

## 3. Track B — Audit Log Wiring (5a)

Sequential. Main session work. Run before dispatching parallel tracks C–H.

Wire the audit log middleware to every sensitive operation not yet covered. Use the existing `auditLog(action, { targetType, targetId, actorId, meta })` call pattern — grep `auth.service.js` for the post-Track-A example if the signature isn't clear.

**Owned files:**
- `labbe-backend-/src/modules/auth/auth.service.js`
- `labbe-backend-/src/modules/auth/auth.controller.js`
- `labbe-backend-/src/modules/events/events.service.js`
- `labbe-backend-/src/modules/events/events.routes.js`
- `labbe-backend-/src/modules/tickets/tickets.service.js`
- `labbe-backend-/src/modules/post-event/post-event.service.js`
- `labbe-backend-/src/modules/users/users.service.js`
- `labbe-backend-/src/modules/notifications/notifications.routes.js` (or controller)

### 3.1 auth.service.js — login events

Add audit log calls:
- `login.success` — after `createSendToken` succeeds. `targetType: 'user'`, `targetId: user._id`.
- `login.failed` — in the wrong-credentials branch, before the lock-check. Include `meta.reason: 'bad_credentials'`.
- `login.locked` — when `lockUntil` is set. Include `meta.lockUntil`.
- `password.changed` — in `changePassword` or `updatePassword`. `targetType: 'user'`.
- `logout` — in the logout handler. `targetType: 'user'`.

### 3.2 events.service.js — event CRUD events

Add audit log calls:
- `event.created` — after `Event.save()` in `createEvent`. `targetType: 'event'`, `targetId: event._id`.
- `event.updated` — in the update service method. Capture before/after snapshots for the meta.
- `event.deleted` — in any delete/soft-delete path. `targetType: 'event'`.

### 3.3 events.routes.js — export audit

Add audit log call on `GET /events/:id/export-guests` (or wherever guest-list export is wired). Action: `event.exported`. `targetType: 'event'`, `meta.format: 'csv'` (or whatever format applies).

### 3.4 tickets.service.js — ticket status + reply

- `ticket.status_changed` — in the status-update service method. Include `meta.from` and `meta.to`.
- `ticket.reply_added` — when a reply is appended. `targetType: 'ticket'`.

### 3.5 post-event.service.js — content lifecycle

- `post_event.content_published` — when content status goes to `published`. `targetType: 'event'`.
- `post_event.content_revoked` — when content is revoked/unpublished.

### 3.6 users.service.js — phone update

- `user.phone_updated` — in the phone-change path. `targetType: 'user'`. Do not log the new phone number in plaintext meta — hash or omit it.

### 3.7 notifications.routes.js / controller — admin broadcast

- `notification.broadcast` — in the admin broadcast handler. `targetType: 'notification'`, `meta.recipientCount` if available.

### 3.8 Track B commit strategy

One commit per file touched: `[PHASE-5-B] audit log: auth events`, `[PHASE-5-B] audit log: event CRUD + export`, etc.

After all seven wire-ups land, run the static-checks harness and confirm the new audit paths write real entries to `AuditLogModel` in the running app (a quick curl or Playwright verify is enough; a dedicated smoke spec is optional for Track B).

---

## 4. Track C — Auth / Profile

Sub-agent. Owned files: `auth.service.js`, `auth.controller.js`, `auth.routes.js`, `users.service.js`, `users.controller.js`, `users.routes.js`, `models/OTPModel.js`, `models/UserModel.js` (schema only), `labbe/` frontend components for profile image + language sync, `halla-mobile/` for language sync.

Read each file before editing. The auth service has been heavily modified in Phases 1a and 5-Track-B — confirm actual function signatures before adding calls.

### 4.1 FLOW-02-F01 — Host signup: send verification email

When `signup()` creates a host account, send an email verification link before the account is considered active. The link should use a time-limited token (same OTP pattern as password reset — reuse or extend `OTPModel`). The host cannot log in (or is flagged `emailVerified: false`) until they click the link.

If an email verification flow already exists (grep for `emailVerified` or `verifyEmail`), wire it to the host signup path. If it doesn't exist, implement it: new `OTP` record with `type: 'email_verification'`, TTL 24h, email template reusing existing transactional email infrastructure.

### 4.2 FLOW-02-F02 — OTP invalidation after first use

Find every OTP redemption path (`verifyOTP`, `resetPassword`, `verifyEmail`, etc.). After a successful use, set `used: true` on the OTP record (add the field if absent) and check `used` before accepting a replay. Do not delete the record — soft-invalidation preserves the audit trail.

### 4.3 FLOW-02-F03 (Low) — Welcome email on host signup

After the account is created and the verification email fires, also queue a welcome email. This can be a second call to the existing email service. Keep it simple: the subject and body are a placeholder ("Welcome to Halla — your account is ready") until marketing copy exists. The mechanism matters more than the copy.

### 4.4 FLOW-04-F02 — Whitelabel branding assets via S3

In the whitelabel creation/update flow, branding files (logo, cover image) currently write to local disk via manual path construction. Replace with `processUploadedFiles(files)` — the same helper used by vendor profile images (Phase 1b). Confirm the S3 bucket and the helper signature by reading `src/shared/utils/s3.js` or wherever `processUploadedFiles` lives.

### 4.5 FLOW-04-F03 — Enforce plan limits at host creation

When a whitelabel admin creates a new host sub-account, check the whitelabel's plan limit for `maxHosts` (or equivalent). If the limit would be exceeded, return 422 with a clear error. Grep `validateLimits` for the pattern used by event/quota checks.

### 4.6 FLOW-04-F04 — Subdomain uniqueness

Before saving a new whitelabel, check `Whitelabel.findOne({ subdomain })`. Return 409 if taken. Case-insensitive comparison. This may already exist — verify before adding.

### 4.7 FLOW-06-F04 — Rate limit on password-reset email endpoint

Add rate limiting to `POST /auth/forgot-password` (or equivalent). Use the existing rate-limiter middleware pattern (grep for `rateLimit` or `rateLimiter` in `auth.routes.js`). Limit: 5 requests per IP per 15 minutes. If the route already has a limiter, verify the values and tighten if needed.

### 4.8 FLOW-07-F01 — OTP re-verification on phone number change

Before updating a user's phone number, send an OTP to the **new** phone number and require the user to verify it. The existing OTP flow (`type: 'phone_verification'`) should be reusable. The update is blocked until the OTP is verified.

### 4.9 FLOW-07-F02 — Profile image via S3

Profile image uploads currently write to local disk. Replace with `processUploadedFiles(files)` — same fix as 4.4. One commit, both changes together if they share the same service method.

### 4.10 FLOW-07-F03 — Sync language preference

When a user changes their language preference (from web or mobile), the change must persist to the User document and be returned on the next profile fetch. Mobile must read from the server-side preference on app launch (after authentication) rather than relying solely on local AsyncStorage. Grep for `language` or `locale` in both `users.service.js` and the mobile auth store.

---

## 5. Track D — Vendor / Marketplace

Sub-agent. Owned files: `vendors.service.js`, `vendors.controller.js`, `vendors.routes.js`, `services.service.js`, `services.controller.js`, `services.routes.js`, `models/UserModel.js` (socialLinks schema only), `models/ServiceModel.js`, `labbe/` marketplace components (for FLOW-26-F03), `halla-mobile/` (for FLOW-26-F04).

### 5.1 FLOW-03-F01 — Validate serviceCategories against enum

On vendor signup and profile update, the `serviceCategories` array must be validated against the allowed enum values (grep `SERVICE_CATEGORIES` or `vendorCategories` for the constant). Return 422 with invalid category names listed if any value is not in the enum.

### 5.2 FLOW-03-F02 — URL-validate socialLinks

On vendor signup and profile update, each value in `socialLinks` must be a valid URL. Use a simple regex or `new URL()` parse. Return 422 with the invalid field name if any value fails.

### 5.3 FLOW-03-F03 / FLOW-24-F03 (High) — Vendor signup files to S3

Vendor signup currently builds manual `/uploads/portfolios/...` paths. Replace with `processUploadedFiles(files)`. This closes both FLOW-03-F03 and FLOW-24-F03 in one change.

### 5.4 FLOW-03-F04 — Vendor approval state machine guard

Add a transition guard to the vendor approval endpoint: only allow `pending → approved`, `pending → rejected`, `approved → suspended`, `suspended → approved`. Any other transition returns 422 with `{ error: 'INVALID_TRANSITION', from, to }`. The guard must also block re-approving an already-approved vendor.

### 5.5 FLOW-24-F01 — Send approval email on status → approved

When a vendor's status transitions to `approved`, send a notification email. Use the existing email-service pattern (grep for `sendEmail` or `sendTransactionalEmail`). Template: simple congratulatory message. Wire audit log: `auditLog('vendor.approved', ...)`.

### 5.6 FLOW-24-F02 — Soft-delete on rejection

When a vendor is rejected, set `status: 'rejected'` but **do not hard-delete** the record. Add `rejectedAt: Date` and `rejectedBy: ObjectId(User)` fields to `UserModel` (vendor sub-schema). Wire audit log: `auditLog('vendor.rejected', { meta.reason })`.

### 5.7 FLOW-24-F04 — Enforce profileCompleted before marketplace visibility

`getPublicServices` (or equivalent marketplace listing endpoint) must filter out vendors where `profileCompleted !== true`. Add a `profileCompleted: { type: Boolean, default: false }` field to `UserModel` if not already present. Set it to `true` when all required vendor profile fields are filled (name, category, description, at least one portfolio image). Grep `profileCompleted` — the field may exist already with different logic.

### 5.8 FLOW-24-F05 — Verify audit log on vendor status transition

Phase 1b wired `auditLog` to `PATCH /admin/vendors/:id/status`. Verify it is still working after all the service-layer changes in this phase. If it was removed or the service refactor bypassed it, re-wire it. This is a verification task, not a new implementation.

### 5.9 FLOW-25-F01 — New services default `isPublic: false`

`ServiceModel.isPublic` default should be `false`. New services are private until the vendor explicitly publishes them. Grep for any code path that creates a service and sets `isPublic: true` implicitly — remove it.

### 5.10 FLOW-25-F03 — Add `whatsapp` to vendor socialLinks schema

Add `whatsapp: { type: String }` to the `socialLinks` sub-schema in `UserModel`. Validate it as a URL (extends 5.2). Update the URL-validation logic to cover the new field.

### 5.11 FLOW-25-F04 (Low) — Increment inquiryCount and bookingCount

When a guest sends an inquiry or completes a booking with a vendor, increment `User.inquiryCount` and `User.bookingCount` respectively (or wherever these counters live on the vendor record). Use `$inc` — atomic. If the events that trigger these are unclear, grep for `inquiry` and `booking` in the services module.

### 5.12 FLOW-26-F01 — Include vendor rating in marketplace populate

`getPublicServices` (or the marketplace listing query) must populate the vendor's `rating` field. Grep for the existing populate call. If `rating` is a computed/aggregated value, include it in the pipeline. If it's a stored field, add it to the `select` or `populate` call.

### 5.13 FLOW-26-F02 — Filter unapproved vendors from getPublicServices

`getPublicServices` must add `vendorStatus: 'approved'` (or equivalent) to the query filter. Unapproved, suspended, or rejected vendors must not appear in marketplace results.

### 5.14 FLOW-26-F03 — Wire onCallClick handler in vendor detail popup (web)

Grep `labbe/` for the vendor detail popup or modal. The call/contact button has an `onCallClick` prop or handler that is defined but not wired to any action. Wire it: open `tel:` link for phone, or the WhatsApp URL for the WhatsApp contact. Read the existing `WhatsAppContactButton` component (built in Phase 3c) before writing new click logic.

### 5.15 FLOW-26-F04 — Mobile marketplace infinite scroll

Grep `halla-mobile/` for the marketplace screen. Verify the Phase 4 pagination work (`useInfiniteQuery` + `AdminFlatList`) was applied to the vendor/marketplace list. If it was skipped in Phase 4, apply the same `useInfiniteQuery` pattern used on all other list screens. If it already exists, confirm the `hasNextPage` + `fetchNextPage` wiring is correct.

### 5.16 FLOW-26-F05 (Low) — Increment numberOfClicks on vendor profile view

When a user opens a vendor's profile page (web and/or mobile), increment `User.numberOfClicks` (or `Vendor.numberOfClicks` — grep for the field). Use `$inc`. Fire-and-forget (don't block the profile load on the counter update).

---

## 6. Track E — Event Lifecycle

Sub-agent. This is the largest single track. Owned files: `events.service.js`, `events.controller.js`, `events.routes.js`, `messaging.service.js`, `messaging.routes.js`, `messaging.controller.js`, `scheduledTasks.js`, `models/EventModel.js`, `models/GuestModel.js`, `post-event.service.js`, `post-event.controller.js`, `post-event.routes.js`. Read every file before editing — many of these were heavily modified in Phases 3 and 4.

### 6.1 FLOW-11-F02 / RBAC-F04 — Set onBehalfOf from req.user

When a super_admin or admin creates an event for a host, `event.createdBy` (or `event.onBehalfOf`) must be set to the target host's `_id`, not the admin's `_id`. The admin's identity is already in the audit log. Grep for `onBehalfOf` and `createdBy` in `createEvent`. If the field exists but is not populated from `req.body.onBehalfOf`, add the RBAC check: only SUPER_ADMIN/ADMIN can set a different `onBehalfOf`; hosts can only create for themselves.

### 6.2 FLOW-11-F03 — Phone dedup in createGuestsFromList

Before bulk-inserting guests, deduplicate by phone number within the incoming list and against existing guests for the event. A guest whose phone already exists on the event (status ≠ `deleted`) should be skipped with a count returned in the response (`{ created: N, skipped: M, reason: 'duplicate_phone' }`).

### 6.3 FLOW-11-F05 — Idempotency middleware on POST /events

Wire the existing `idempotencyMiddleware` to `POST /events`. Same pattern as subscriptions and addons. `Idempotency-Key` header, 24h TTL.

### 6.4 FLOW-12-F02 — addon extraGuests augments quota correctly

When a guest-slot addon is active (`scope: 'event'`, `status: 'active'`), the event's effective guest quota should be `plan.limits.maxGuests + addon.quantity`. Grep `validateLimits` or `checkGuestQuota` for where the quota check runs. The addon's `eventId` must match the event being checked. Add a lookup for active event-scope addons in the quota calculation.

### 6.5 FLOW-12-F04 (Low) — Remove legacy requireSubscription middleware

Grep `events.routes.js` for any `requireSubscription` middleware that was superseded by Phase 2's subscription validation. Remove the dead middleware import and the route-level call. Confirm by grepping all consumers of `requireSubscription` — if it has no remaining callers, delete it.

### 6.6 FLOW-13-F01 — 24h pre-launch edit lock

Once an event's `scheduledTime` is within 24 hours of `now()`, block edits to guest list, invitation template, and launch settings. Allow edits to cosmetic fields (title, description) only. Return 422 with `{ error: 'EVENT_EDIT_LOCKED', locksAt: <timestamp> }` when blocked. Use `nowUtc()` from the timezone utility.

### 6.7 FLOW-13-F02 — Soft-delete guests on updateGuestList removal

When `updateGuestList` removes a guest (a phone number present in the old list but not in the new one), set `guest.status = 'deleted'` rather than calling `Guest.deleteOne`. Preserve the record. Grep `updateGuestList` for where `$pull` or `deleteMany` currently fires on guest removal.

### 6.8 FLOW-13-F03 — Cancel Taqnyat job on event reschedule

When an event's `scheduledTime` is updated, the previously-scheduled Taqnyat job (if any) must be cancelled. Grep for `taqnyatJobId` or any Taqnyat schedule-cancel calls. If the Phase 3a removal of the native Taqnyat scheduling path means there is no job to cancel, verify that and document in the commit message.

### 6.9 FLOW-13-F04 — Complete status block list for event updates

Grep `updateEvent` or `patchEvent` in `events.service.js`. Add a check: if `event.status` is in `['live', 'completed', 'failed']`, reject update attempts with 422 `{ error: 'EVENT_NOT_EDITABLE', status: event.status }`. The existing block list may already cover `live` — confirm and extend to `completed` and `failed`.

### 6.10 FLOW-13-F05 — Audit log on event update routes

Wire `auditLog('event.updated', ...)` to the update routes (note: Track B covers `events.service.js`; this task ensures the `routes.js` export guard is also covered if the service call is bypassed). Cross-check with Track B's 3.2 before editing — they may already close this together.

### 6.11 FLOW-14-F05 — Remove legacy native Taqnyat call path

After Phase 3a removed Taqnyat-native scheduling, verify there are no remaining code paths that call Taqnyat's schedule API directly (bypassing `runBatched`). Grep for `taqnyat.schedule`, `taqnyatClient.send` (direct, non-batched), and `taqnyatDeleteId`. Remove any survivors. This is a cleanup/verification task.

### 6.12 FLOW-15-F06 — Surface partial send count in host-visible state

When an event's launch completes with some failed sends, expose `messagingStatus.failedCount` on the event's host-visible response (the dashboard event detail endpoint). The `PartialFailureBanner` (Phase 4b) reads this field. Grep `messagingStatus` in `events.service.js` to confirm the field is populated after `runBatched` completes.

### 6.13 FLOW-16-F01 / F02 — Unify dual test-message routes + fix RSVP link

There are two test-message routes (grep `test-message` in `messaging.routes.js`). Unify into one: `POST /events/:id/test-message`. Body: `{ phoneNumber, language }`. The test message must include a valid RSVP link (`guestId` can be a placeholder for tests). Fix any hardcoded or missing RSVP link in the test-message body.

### 6.14 FLOW-16-F03 (Low) — Per-event throttle on test-message endpoint

Add a per-event rate limit: max 3 test messages per event per 10 minutes (per calling user). Use an in-memory or Redis counter keyed on `eventId:userId`. Return 429 if exceeded.

### 6.15 FLOW-17-F03 — Persist bulk stats after each batch

Inside `runBatched` (or the `sendBulk` wrapper), after each batch completes, update `event.messagingStatus.sentCount` and `event.messagingStatus.failedCount` with the batch's results. Use `findOneAndUpdate({ $inc: { ... } })` — atomic. This prevents data loss if the cron process dies mid-send.

### 6.16 FLOW-17-F04 — Validate guestIds belong to event

The endpoint that accepts an explicit `guestIds` array (for targeted resends or custom sends) must verify each `guestId` belongs to the event. `Guest.find({ _id: { $in: guestIds }, event: eventId })` and compare the returned count to the input count. Return 422 with the invalid IDs listed if any don't match.

### 6.17 FLOW-19-F03 — Cache stats endpoint (5-min TTL)

`GET /events/:id/stats` and `GET /events/:id/detailed-stats` are called on every poll tick (Phase 3d). Add a 5-minute in-memory cache (a plain `Map` keyed on `eventId` is fine; a Redis option if Redis is already in the stack — grep `redisClient`). Return the cached value for the same `eventId` within the TTL. Invalidate on any write that changes stats (new RSVP, check-in, etc.).

### 6.18 FLOW-21-F02 — Enforce requireApproval flag

`PostEventContentModel` has a `requireApproval: Boolean` field. When it is `true`, newly submitted content should land in a `pending` state rather than `published`. Add a `pending → approved` transition endpoint (`PATCH /post-event/:id/approve`, RBAC: host or admin). Guests see `pending` content as "awaiting approval" rather than published.

### 6.19 FLOW-21-F04 (Low) — Rename sendBulkAccessEmails

Rename `sendBulkAccessEmails` to `sendBulkAccessMessages` in `post-event.service.js`. The function sends SMS, not email. Update all callers. This is a rename-only change — no logic changes.

### 6.20 FLOW-21-F05 (Low) — Cap uniqueVisitors to bounded Set logic

`PostEventContentModel.uniqueVisitors` is an unbounded array growing by one entry per visit. Replace with a `Set`-based approach: store visitor IDs in a `Set` (or use a `Map` with a TTL) to de-duplicate within a session, and only persist the **count** (not the full array). If the full array is needed for analytics, cap it at 10,000 entries and note the cap in a comment.

### 6.21 FLOW-22-F01 — Cache getDetailedStats

Same pattern as 6.17 but for `getDetailedStats`. Reuse the same in-memory cache (`Map` keyed on `eventId`). Share the invalidation logic.

### 6.22 FLOW-22-F02 — SMS cost from env SMS_COST_SAR

In `messaging.service.js`, the cost-per-SMS is currently hardcoded (grep for the literal `0.15` or similar). Replace with `parseFloat(process.env.SMS_COST_SAR || '0.15')`. Add `SMS_COST_SAR=0.15` to `config.env` with a comment.

### 6.23 FLOW-22-F03 — Remove 'email' from invitation.method enum

`EventModel.invitation.method` enum currently includes `'email'`. Email-based invitations are not supported. Remove `'email'` from the enum. Add a migration guard: any event docs with `invitation.method === 'email'` should be updated to `'sms'` (the default). Write a one-time script `scripts/fix-invitation-method-email.js` — dry-run by default, `--apply` flag to execute. Do not run it from this prompt.

---

## 7. Track F — Notifications

Sub-agent. Owned files: `notifications.service.js`, `notifications.controller.js`, `scheduledTasks.js` (new cron section only — coordinate with Track E sub-agent on the same file), `models/NotificationPreferencesModel.js`.

**File overlap note:** Track E also touches `scheduledTasks.js`. If both are running in parallel, the Track F sub-agent owns the `scheduleNotificationDelivery` cron section only. Track E owns `scheduleEventRetry` and `scheduleSubscriptionExpiryCheck`. Main session reviews for conflicts before merging.

### 7.1 FLOW-27-F01 — Idempotency key on notification creation

Wire idempotency to the notification creation path (`createNotification` or equivalent). Key: `notification:<userId>:<type>:<targetId>`. TTL 24h. Use the existing idempotency middleware or the utility directly. Prevents duplicate notifications from double-firing cron ticks or retries.

### 7.2 FLOW-27-F02 — Cron for delivering scheduled notifications

Notifications with `scheduledAt` in the future are created but never delivered. Add a cron job `scheduleNotificationDelivery` that runs every 5 minutes, finds notifications where `scheduledAt <= now() && status === 'pending'`, and dispatches them. Status lifecycle: `pending → delivered | failed`. Use `runBatched` for bulk delivery. Wire audit log: `auditLog('notification.broadcast', ...)` for admin-triggered batch notifications.

### 7.3 FLOW-27-F03 (Low) — NotificationPreferencesModel cleanup

Grep `NotificationPreferencesModel`. Determine if it is referenced anywhere. If it has zero callers, add a comment `// Preserved for future use — not yet wired to UI` and leave it. If it has callers but the model is empty/broken, document the gap in `PHASE_5_REPORT.md` under anomalies and leave as-is (don't delete referenced models). This is a documentation task.

### 7.4 FLOW-27-F04 (Low) — Email delivery status writeback

When an email is sent via the existing email service, attempt to capture the delivery result (accepted/rejected/bounced) and write it back to the `Notification` record's `deliveryStatus` field. If the email provider does not support synchronous delivery status, set `deliveryStatus: 'sent'` on successful API call and note the limitation in a comment. Add `deliveryStatus: { type: String, enum: ['pending', 'sent', 'delivered', 'failed'], default: 'pending' }` to `NotificationModel` if absent.

---

## 8. Track G — Tickets / RBAC / Tenant

Sub-agent. Owned files: `tickets.service.js`, `tickets.controller.js`, `tickets.routes.js`, `notifications.controller.js`, `notifications.routes.js`, `labbe-backend-/src/shared/middleware/auth.js` (RBAC middleware only).

**File overlap note:** Track B owns `notifications.routes.js` for audit log wiring (3.7). Track G owns it for the tenant filter (8.5). If running in parallel, the Track G sub-agent should apply its change to the same file after Track B lands, or both sub-agents coordinate on a single commit. Main session adjudicates at merge time.

### 8.1 FLOW-23-F01 — Ticket state machine guard

Add a valid-transitions matrix to `tickets.service.js`:

```
open → in_progress | closed
in_progress → resolved | closed
resolved → (terminal)
closed → (terminal)
```

Before any status update, check `VALID_TRANSITIONS[current].includes(next)`. Return 422 with `{ error: 'INVALID_TICKET_TRANSITION', from, to }` if blocked.

### 8.2 FLOW-23-F02 — Wire addReply route

Grep `tickets.routes.js` for `addReply`. If the route exists but points to a missing or stub controller method, implement `ticketController.addReply`: appends `{ author: req.user._id, body, createdAt }` to `ticket.replies`, saves the ticket, returns the updated ticket. Wire the audit log entry from Track B (3.4).

### 8.3 RBAC-F01 — Align requirePageAccess with restrictTo role resolution

Grep `requirePageAccess` in `auth.js` middleware. It reads permissions from the user's role to check page access. Verify the role-permission mapping matches the `restrictTo` role hierarchy used everywhere else. A common drift: `WHITELABEL_ADMIN` is included in `restrictTo` checks but excluded from `requirePageAccess` permission tables, or vice versa. Fix any misalignment. Document the correct mapping in a comment on the middleware.

### 8.4 TENANT-F02 — whitelabelId filter on ticket queries

All ticket list/search queries must be scoped to the requesting user's `whitelabelId`. Grep `getTickets` and `searchTickets`. Add `{ whitelabelId: req.user.whitelabelId }` to the query filter for non-SUPER_ADMIN callers. SUPER_ADMIN sees all tickets (no filter).

### 8.5 TENANT-F03 — whitelabelId filter on admin broadcast

The admin broadcast notification endpoint must scope the recipient query to the calling admin's `whitelabelId`. SUPER_ADMIN can broadcast across all tenants. ADMIN or WHITELABEL_ADMIN can only broadcast to their own tenant's users. Add the filter before the recipient query runs.

---

## 9. Track H — Exports + Phase 4d Hand-offs

Sub-agent. Owned files: `admin.service.js`, `admin.routes.js`, `events.routes.js`, `halla-mobile/screens/host/UpdateEventScreen.js`, `halla-mobile/screens/admin-dashboard/UpdateEventScreen.js`.

### 9.1 FLOW-28-F04 — Tenant filter on exportWhitelabels

`exportWhitelabels` in `admin.service.js` returns all whitelabels without a tenant filter. ADMIN callers must only export whitelabels belonging to their own whitelabel scope. SUPER_ADMIN exports all. Add the filter.

### 9.2 Phase-4d-1 — Remove compat aliases guest-list and staff-list

`events.routes.js` has compat aliases `PATCH /events/:id/guest-list` and `PATCH /events/:id/staff-list` pointing to the old handlers. These were preserved for one release cycle. Remove them now. Grep for all callers in `labbe/` and `halla-mobile/` — confirm they all use `/step2` (the Phase 4d unified endpoint) before deleting.

### 9.3 Phase-4d-2 — Remove legacy mobile shim files

Delete:
- `halla-mobile/screens/host/UpdateEventScreen.js`
- `halla-mobile/screens/admin-dashboard/UpdateEventScreen.js`

These are re-export shims pointing to the unified update wizard. Grep for their import references first — confirm no screen references them before deletion. If any screen still imports a shim, update the import to point directly to the target.

---

## 10. Parallelism plan

| Sub-agent | Track | Owned files (primary) | Dispatch |
|-----------|-------|-----------------------|----------|
| Main session | B | auth, events, tickets, post-event, users, notifications modules | Immediately after reading this prompt |
| Sub-agent C | C (Auth/Profile) | auth.service.js, users.service.js, OTPModel.js, auth.routes.js | After Track B finishes |
| Sub-agent D | D (Vendor) | vendors.service.js, services.service.js, UserModel.js | After Track B finishes (parallel with C) |
| Sub-agent E | E (Event lifecycle) | events.service.js, messaging.service.js, EventModel.js, scheduledTasks.js | After Track B finishes (parallel with C, D) |
| Sub-agent F | F (Notifications) | notifications.service.js, scheduledTasks.js (cron section only) | After Track B finishes (parallel with C, D, E — but coordinate on scheduledTasks.js with E) |
| Sub-agent G | G (Tickets/RBAC) | tickets.service.js, auth.js middleware, notifications.routes.js | After Track B finishes (parallel with C–F) |
| Sub-agent H | H (Exports + 4d) | admin.service.js, events.routes.js, mobile shims | After Track B finishes (parallel with C–G) |

**Zero-overlap verification before dispatch:** Tracks C–H each own different module trees. The only potential overlaps are `scheduledTasks.js` (E and F) and `notifications.routes.js` (B and G). Main session resolves both by merging the relevant changes into a single commit after the sub-agents finish, or by staggering F and G dispatch to land after B's notification change.

---

## 11. Process

1. Read this prompt fully.
2. Read `PHASE_5_PLAN.md` and `PHASE_5_PROGRESS.md`. Confirm Track A is committed (`12425c9`). Update `PHASE_5_PROGRESS.md` Track A items to checked.
3. Read `IMPLEMENTATION_LEDGER.md` and confirm the Open list matches the tracks in this prompt.
4. Confirm branch: `git status` should show `claude/implement-phase-5-xP9mK`. If not, stop and confirm.
5. Run Track B as main session work. One commit per file. Update `PHASE_5_PROGRESS.md` as each item lands.
6. After Track B is committed: dispatch sub-agents C, D, E, F, G, H in parallel. Provide each sub-agent with this prompt (full) and the relevant track section. State which track they own and which files they must not touch.
7. As each sub-agent finishes: review its diff in the main session, resolve any overlap, merge, update `PHASE_5_PROGRESS.md`.
8. After all tracks land, run the full smoke check:
   ```
   node docs/implementation/phase-5-smoke-tests/static-checks-5.js
   ```
   Confirm all assertions pass. Run any additional Playwright specs added during the phase.
9. Run a Phase 1–4 regression smoke (auth T1-T7, timezone, payment stub, idempotency, S3, subscriptions, plans, event launch, RSVP, check-in, QR rotation, mobile pagination) to confirm no regressions.
10. Update `IMPLEMENTATION_LEDGER.md`: add a "Closed in Phase 5" section with every finding ID closed in this phase, referencing the commit SHA. Move all corresponding findings out of "Open".
11. Write `PHASE_5_REPORT.md` (format mirrors `PHASE_4D_REPORT.md`): sub-track summary, commit-by-commit log, findings-closed table, smoke results, deviations, drive-by fixes, anomalies surfaced, any hand-offs to post-launch.
12. Output the STOP gate.

---

## 12. STOP gate

Output exactly the following block, filled in:

```
STOP — Phase 5 complete

Branch: claude/implement-phase-5-xP9mK
Commits: <list of [PHASE-5-*] SHAs in order>

Track A (Foundation — already committed):
- redactSensitive export: 12425c9
- AuditLog plan/addon enum: 12425c9
- /api mount removed (FLOW-01-F05): 12425c9

Track B (Audit log wiring):
- auth events (login.success / failed / locked / password.changed / logout): <commit>
- event CRUD + export audit: <commit>
- ticket status + reply audit: <commit>
- post-event publish / revoke audit: <commit>
- user phone update audit: <commit>
- admin broadcast audit: <commit>

Track C (Auth / Profile):
- FLOW-02-F01 host verification email: <commit>
- FLOW-02-F02 OTP invalidation: <commit>
- FLOW-02-F03 welcome email: <commit>
- FLOW-04-F02 whitelabel branding S3: <commit>
- FLOW-04-F03 plan limit at host creation: <commit>
- FLOW-04-F04 subdomain uniqueness: <commit>
- FLOW-06-F04 reset-email rate limit: <commit>
- FLOW-07-F01 phone OTP re-verify: <commit>
- FLOW-07-F02 profile image S3: <commit>
- FLOW-07-F03 language sync: <commit>

Track D (Vendor / Marketplace):
- FLOW-03-F01 category enum validation: <commit>
- FLOW-03-F02 socialLinks URL validation: <commit>
- FLOW-03-F03 / FLOW-24-F03 vendor files to S3 (High): <commit>
- FLOW-03-F04 approval state machine: <commit>
- FLOW-24-F01 approval email: <commit>
- FLOW-24-F02 rejection soft-delete: <commit>
- FLOW-24-F04 profileCompleted enforcement: <commit>
- FLOW-24-F05 audit log on status transition (verified): <commit>
- FLOW-25-F01 isPublic default false: <commit>
- FLOW-25-F03 whatsapp in socialLinks: <commit>
- FLOW-25-F04 inquiryCount/bookingCount: <commit>
- FLOW-26-F01 vendor rating in populate: <commit>
- FLOW-26-F02 unapproved vendors filtered: <commit>
- FLOW-26-F03 web onCallClick wired: <commit>
- FLOW-26-F04 mobile marketplace infinite scroll: <commit>
- FLOW-26-F05 numberOfClicks increment: <commit>

Track E (Event Lifecycle):
- FLOW-11-F02 / RBAC-F04 onBehalfOf: <commit>
- FLOW-11-F03 guest phone dedup: <commit>
- FLOW-11-F05 event creation idempotency: <commit>
- FLOW-12-F02 addon extraGuests quota: <commit>
- FLOW-12-F04 remove legacy requireSubscription: <commit>
- FLOW-13-F01 24h edit lock: <commit>
- FLOW-13-F02 guest soft-delete: <commit>
- FLOW-13-F03 Taqnyat job cancel on reschedule: <commit>
- FLOW-13-F04 status block list: <commit>
- FLOW-13-F05 event update audit: <commit>
- FLOW-14-F05 legacy Taqnyat path removed: <commit>
- FLOW-15-F06 partial send count: <commit>
- FLOW-16-F01 / F02 unified test-message route + RSVP link: <commit>
- FLOW-16-F03 test-message throttle: <commit>
- FLOW-17-F03 bulk stats persistence: <commit>
- FLOW-17-F04 guestIds validation: <commit>
- FLOW-19-F03 stats cache (5-min TTL): <commit>
- FLOW-21-F02 requireApproval flag: <commit>
- FLOW-21-F04 rename sendBulkAccessMessages: <commit>
- FLOW-21-F05 uniqueVisitors bounded set: <commit>
- FLOW-22-F01 getDetailedStats cache: <commit>
- FLOW-22-F02 SMS_COST_SAR env var: <commit>
- FLOW-22-F03 email removed from invitation.method enum: <commit>

Track F (Notifications):
- FLOW-27-F01 notification idempotency: <commit>
- FLOW-27-F02 scheduled delivery cron: <commit>
- FLOW-27-F03 NotificationPreferencesModel documented: <commit>
- FLOW-27-F04 email delivery writeback: <commit>

Track G (Tickets / RBAC / Tenant):
- FLOW-23-F01 ticket state machine: <commit>
- FLOW-23-F02 addReply route wired: <commit>
- RBAC-F01 requirePageAccess aligned: <commit>
- TENANT-F02 tickets tenant filter: <commit>
- TENANT-F03 admin broadcast tenant filter: <commit>

Track H (Exports + Phase 4d hand-offs):
- FLOW-28-F04 exportWhitelabels tenant filter: <commit>
- Phase-4d-1 compat aliases removed: <commit>
- Phase-4d-2 legacy mobile shims removed: <commit>

Smoke tests:
- Phase 5 static-checks: <pass>/<total>
- Phase 1–4 regression: <pass/fail summary>

Findings closed (full): <list all FLOW-IDs above>
Findings partially closed: <list, if any>

IMPLEMENTATION_LEDGER.md updated: yes/no
PHASE_5_REPORT.md written: yes/no

Ready for merge: yes/no
Reason if no: <track or test that blocked>

Post-launch hand-offs (not in scope for Phase 5):
- scripts/fix-invitation-method-email.js — NOT YET RUN, run before production migration
- scripts/backfill-guest-access-token-expiry.js (Phase 3de) — confirm if already run
- Production migrations: migrate-event-shape.js --apply, seedInitialTemplates.js (Phase 4c hand-offs)
- CI integration for scripts/check-schema-drift.sh (Phase 4d hand-off)
- MongoDB topology verification: confirm production is replica set for atomic step2 transactions (Phase 4d hand-off)

Anomalies:
- <anything noticed but not fixed>
```

Then stop. Do not push or create a PR — Peter will run the close-out session.

Begin.
