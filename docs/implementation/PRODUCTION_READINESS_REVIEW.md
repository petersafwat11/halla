# Halla — Production-Readiness Review (Phases 0 → 3de)

**Reviewer:** senior full-stack pass over committed code on branch `master`.
**Scope:** Verify each fix claimed in Phase 0, 1a, 1b, 2, 3abc, 3de reports against the actual code in `labbe-backend-/`, `labbe/`, `halla-mobile/`. Surface production-readiness gaps, edge cases, and 3-tier inconsistencies.
**Branch:** `claude/review-implementation-plans-e0ONB`
**Method:** 6 parallel deep reviews (one per phase). Each agent read prompt + plan + report + actual code, traced call sites, and looked for bypasses, races, and cross-tier drift.

---

## TL;DR — overall verdict

The phases are **structurally correct** and the headline fixes land at the cited file/lines. However, the implementation is **not production-ready** as it stands. Across the six phases, the audit found:

- **6 BLOCKERs** (deploy-blocking — money loss, double-charges, double-SMS, broken UX)
- **22 HIGHs** (real bugs / race conditions / 3-tier breaks)
- **18 MEDIUMs** (correctness gaps that will bite at scale)
- ~12 LOWs (polish)

The pattern is consistent: backend mostly hardened, but the **3-tier contract is broken at the edges** — web/mobile clients haven't been updated to the new endpoints (Phase 2), the new structured 410 reasons aren't rendered (Phase 3de), the new whitelabelId requirement breaks SUPER_ADMIN UX (Phase 0), and Phase 1a's HttpOnly-cookie auth model is bypassed by a JS-readable cookie that the web tier still uses for every request.

**Recommendation:** do **not** ship as-is. Address the 6 BLOCKERs and at least the `HIGH-1`–`HIGH-7` items from §1 before launch. The MEDIUMs can be a Phase 5 / fast-follow, but track them — the idempotency global-key collision (`HIGH-3`) in particular will fire under any small concurrency.

---

## 1. BLOCKERs (do not ship)

| # | Phase | Location | Issue | Fix |
|---|-------|----------|-------|-----|
| **B-1** | 1a | `labbe/hooks/reactQueryHooks/useAuthMutation.js:13-23` + `labbe/services/new-backend/apiClient.js:74-77` | Web writes the access token into a **non-HttpOnly cookie** named `token` and reads it as a `Bearer` header on every axios call. The Phase 1a HttpOnly cookie is bypassed; XSS can exfiltrate the access token. | Remove `Cookies.set("token", …)`. Switch axios to rely on the HttpOnly cookie via `withCredentials: true` only. |
| **B-2** | 1b | `labbe-backend-/src/infrastructure/paymentProvider/moyasar.js:30` + `subscriptions.service.js:344` + `addons.service.js:100` | `amount` is a JS `Number` from `pricing.oneTime` (no documented unit) multiplied by 100 in `Math.round(amount * 100)`. If anyone stores `2999` meaning halalas (already minor units) the customer is charged **100×**. | Pick one: store integer minor units everywhere and remove `* 100`, or document the contract and add a unit-validation guard in the provider. |
| **B-3** | 2 | `labbe-backend-/src/modules/subscriptions/subscriptions.service.js:329-376` and `:543-559` | `subscribe()` and `changePlan()` cancel the user's existing subscription **before** charging. If the charge fails, the user is left with no subscription. No transaction, no rollback. | Reverse the order: charge first, then cancel old / activate new. Or wrap in a Mongo transaction (replica-set required) with explicit rollback on charge failure. |
| **B-4** | 2 | `labbe-backend-/src/modules/addons/addons.service.js:114-176` | `Addon.create()` and `_applyQuota()` run **after** payment. If either throws, money is taken with no addon delivered. `paymentProvider.refund` is a stub (`moyasar.js:62`). | Either (a) implement refund and call it on post-charge failure, or (b) capture the failure into an `addon_refund_pending` audit row + admin alert + retry job. Today, on-call has to manually reconcile. |
| **B-5** | 3abc | `labbe-backend-/src/shared/utils/scheduledTasks.js:168` + `labbe-backend-/src/modules/messaging/messaging.service.js:135-205, 280-285` | Retry attempts re-call `sendBulk` over the **entire** `event.guestList`. `sendToGuest` does not short-circuit on `invitation.sent === true`. Per-attempt idempotency fingerprint generates a fresh key each retry. After 5 attempts an already-delivered guest can receive **5 duplicate SMS invitations**. | Filter `guestIds` to `invitation.sent !== true` inside `runEventLaunch`/`sendBulk`, OR have `sendToGuest` early-return on `invitation.sent`. |
| **B-6** | 3abc | `labbe-backend-/src/shared/utils/scheduledTasks.js:801-816` + `notificationService.js:259` + `NotificationModel.js:401-410` | `_markFailedAndNotify` passes `true` as the third arg expecting it to send email — but the parameter is `skipPreferenceCheck`, not "send email". **No email is ever sent on terminal failure.** FLOW-15-F05 doc claim ("email + in-app to host") is unmet. | Explicitly `await emailService.sendEventLaunchFailedEmail(host.email, …)` in the same idempotent block. |

---

## 2. HIGH-severity issues (fix before launch)

### Auth (Phase 1a)
- **H-1** Refresh token rotation race — `auth.service.js:113-143` does `findOne` → check `revokedAt` → `issueTokenPair` → save revoke. Two parallel refresh calls both pass the check; both succeed without triggering replay detection. Fix: atomic `findOneAndUpdate({ tokenHash, revokedAt: null }, { $set: { revokedAt: now } })` and treat null result as replay.
- **H-2** `POST /auth/refresh` has no rate limit (`auth.routes.js:266`).
- **H-3** Web `authStore.logout()` (`labbe/stores/authStore.js:152-168`) clears local state without calling `/auth/logout` — refresh token stays alive server-side until 30d expiry.
- **H-4** Mobile signup-OTP path (`halla-mobile/stores/authStore.js:174-200`) creates server-side refresh token but doesn't persist locally; if user backgrounds before `completeProfile`, token is orphaned forever.

### Idempotency (Phase 1b — affects every later phase)
- **H-5** **`IdempotencyKeyModel.js:23` uses globally-unique `key`**, not compound `{userId, scope, key}`. Two users with the same client-supplied `Idempotency-Key` value collide — User B can replay User A's cached response (potentially leaks data) or hit a 409. **This bug is fundamental** because Phases 2 + 3abc + 3de all build on this utility. Fix: change to compound unique index, update lookup to `findOne({ key, userId, scope })`.
- **H-6** Idempotency middleware (`middleware/idempotency.js:41-72`) does `findOne` → run handler → insert. Two concurrent requests both miss the lookup, both run the handler (double side-effect), then one wins the unique index. Stripe-style fix: insert "pending" row up-front; concurrent callers wait/replay.
- **H-7** Subscription `subscribe()` doesn't derive an idempotency key (`subscriptions.service.js:347-376`). Header-only opt-in. Combined with B-3, double-tap = double-cancel + double-charge.

### S3 / Storage
- **H-8** `s3Upload.js:177-194, 212-217` does **not** set `ACL` explicitly. Bucket policy is the only access gate. If the bucket is mis-configured public, every upload is world-readable; if private, the constructed URL returns 403. Set `ACL: 'private'` and use signed URLs for read.

### Audit log
- **H-9** Vendor status audit captures only the `after` value (`admin.routes.js:465`). No "before". For compliance "who changed what from what to what" this is incomplete. Capture `before` in pre-handler middleware, stash on `res.locals`.

### Payment / Subscription consistency (Phase 2)
- **H-10** Multiple call sites bypass `findActiveForUser`: `auth.service.js:209` (no sort), `admin.service.js:351, 1197, 1465` (no status filter, no sort), `admin.controller.js:426`. Migrate all to `findActiveForUser` for deterministic results.
- **H-11** Provider error string forwarded to client — `subscriptions.service.js:371` and `addons.service.js:117` throw `ValidationError(charge.error)` where `charge.error` is `err.response?.data?.message` from Moyasar. Replace with generic message + log provider detail server-side.
- **H-12** Expiry cron emits **no notification** to user on transition (`scheduledTasks.js:678-721`). Hosts silently downgraded.
- **H-13** Addon quota update is not atomic with `Addon.create` (`addons.service.js:153-176`). Without `Idempotency-Key`, a retry double-credits.

### 3-tier consistency
- **H-14** Web (`labbe/services/adminDashboard.js`) and mobile (`halla-mobile/services/adminDashboardService.js`) do **not** expose Phase 2's new endpoints: `POST /plans/admin`, `DELETE /plans/admin/:code`, `POST /subscriptions/admin/assign`, `POST /addons/purchase`, `POST /addons/admin/:id/activate`. `labbe/app/[lang]/host/plans/_components/AddonsSection.jsx` is a static render. The closed FLOW-08/09/10 findings are reachable only via curl.
- **H-15** Web (`AddModeratorPopup.jsx`) and mobile (`AddModeratorModal.js`) admin-create UIs do **not** surface `whitelabelId` selection. After Phase 0's tightening, SUPER_ADMIN cannot create moderators from either UI — backend rejects with 500 / ValidationError.
- **H-16** Frontend ignores Phase 3de's structured `qr_*` reason — `labbe/app/[lang]/post-event/page.js:34-44` shows one generic message regardless of `qr_rotated` / `qr_revoked` / `qr_expired`. Mobile has zero usage of these reasons. The whole point of the `validateToken` rewrite is wasted.

### Phase 3 pipeline / scanner
- **H-17** Event send lock TTL = 10 min (`eventLock.js:22`) but `sendBulk` at 10/sec for >6000 guests runs longer. A second cron tick reacquires the stale lock and double-fires the entire batch. Compute TTL dynamically OR refresh lock periodically.
- **H-18** QR rotation (`guests.service.js:301-370`) returns the new `qrUrl` to the host but **never sends WhatsApp/SMS to the guest**. Defeats rotation's purpose (lost-phone scenario). Add dispatch inside `rotateGuestQR` after `create()`.
- **H-19** Webhook HMAC computed over `JSON.stringify(req.body)` (`messaging.controller.js:40-45`), not raw bytes. Any reverse proxy / body-parser key reorder breaks legit traffic. Add raw-body capture middleware on the webhook route.
- **H-20** Staff token `validateToken` (`StaffAccessTokenModel.js:113-122`) returns one opaque reason for revoked/expired/missing — Phase 3de did the rewrite for guest tokens but skipped staff. Mirror it.
- **H-21** Check-in does not record `checkedInBy` — `GuestModel.js:91-94` field is commented out, `staff.service.js:345` ignores `_staffUser`. On replay, staff B has no idea who originally checked the guest in.
- **H-22** Stats endpoints scan entire Guest collection — `staff.service.js:136, 226` do `Guest.find({ event }).select('status')`. With 10K guests + 30s polling = noticeable load. Use `aggregate([{$match}, {$group: {_id:'$status', n:{$sum:1}}}])`.

### Other
- **H-23** Test fixture (`scripts/seedTestUsers.js:167-205, 287, 299`) creates ADMIN/MODERATOR with no `whitelabelId`. After Phase 0 these seeded users hit 500 on every admin endpoint. Either seed them with a tenant or skip them.

---

## 3. MEDIUM issues (track for Phase 5 / fast-follow)

### Idempotency
- M-1 `withIdempotency` defaults `requestHash` to empty string (`utils/idempotency.js:47`) — defeats conflict detection for non-HTTP callers.
- M-2 Idempotency cache stores no headers — replay loses `Set-Cookie`/`Location`.
- M-3 Moyasar `raw` payload (potentially card-adjacent data, last4) cached in `IdempotencyKey.response.body` for 24h (`moyasar.js:50`). Strip `raw` before caching.

### Timezone
- M-4 `timezone.js:77-82` hardcoded to `Asia/Riyadh`; non-Riyadh `tz` arg silently falls back to UTC. Throw on unknown tz, or pull in `date-fns-tz`.
- M-5 Naïve `toLocaleString`/`getDate` calls remain in 8+ locations (`events.service.js:869, 875, 904, 907, 1347`, `messaging.service.js:527`, `guests.service.js:279, 282`, `scheduledTasks.js:534`). Server-locale dependent; wrong times in admin exports.

### S3
- M-6 Buffered uploads (`s3Upload.js:215`) — 50MB × N concurrent = OOM. Switch to `Upload` from `@aws-sdk/lib-storage` for streaming.
- M-7 `multerS3.AUTO_CONTENT_TYPE` re-detects MIME from buffer — declared MIME and stored MIME can diverge.

### Audit
- M-8 Audit middleware fail-open (`middleware/auditLog.js:77-79`) + no sensitive-field sanitization. Add denylist filter for `password`/`token`/`apiKey`.
- M-9 Plans/addons audit rows still use `targetType:'system'` (acknowledged for Phase 5).
- M-10 Check-in lacks AuditLog entry — inconsistent with FLOW-20-F03 "closed" claim.

### Auth
- M-11 Legacy `jwt` cookie still accepted in `protect` (`shared/middleware/auth.js:53`) — confirm Phase 1c removed it.
- M-12 CORS allows non-same-host origins with `credentials: true` (`app.js:59-86`); refresh actually works only because of B-1's JS cookie fallback. Resolve the CORS-vs-cookie mismatch.
- M-13 Mobile per-service `fetch(...)` calls do not auto-refresh — 15-min token will silently break notification/events/messaging mid-session until cold-launch.
- M-14 `verifyEmailCode` uses non-constant-time `===` (`UserModel.js:582-585`).
- M-15 `setupPassword` doesn't revoke prior refresh tokens for the user.

### Phase 2 / Subscriptions
- M-16 `SubscriptionModel.js:540` sort lacks `_id` tiebreaker — non-deterministic on identical `createdAt`.
- M-17 Expiry cron has no cluster lock (`scheduledTasks.js:678`) — multi-instance deploy duplicates audit rows.
- M-18 `plans.service.js:291-296` blocks ANY `maxInvitesPerEvent` reduction unconditionally — over-strict.

### Phase 3
- M-19 Manual retry has no client-side `Idempotency-Key` (`useEventMutation.js:296-306`, `eventsService2.js:291-301`). Double-click safety only via lock.
- M-20 Failure banners have no countdown to next retry attempt; both banners are Arabic-only hardcoded (no `useTranslations`).
- M-21 `runBatched` doesn't back off on 429 (`runBatched.js:40-53`).
- M-22 `releaseInvites` failure leaves pool inconsistent — no reconciliation queue or admin alert.
- M-23 Backfill script `scripts/backfill-guest-access-token-expiry.js` is unparallelized and doesn't warn operator that legacy rows where `createdAt + 365d < now` will be auto-deleted by TTL within 60s of backfill.
- M-24 Multi-checkin design boundary — `GuestModel.js` has no `checkInLog` array (single-checkin design).
- M-25 Dead-code `performCheckIn` instance method sets invalid `'attended'` status (`GuestModel.js:262-268`).

---

## 4. Low-severity (polish — Phase 5)

L-1 Idempotency middleware lookup TTL/cache header doc gap.
L-2 Audit `res.on("finish")` race on process crash.
L-3 Mobile auth logs include email/phone — gate with `__DEV__`.
L-4 `RefreshTokenModel` add `{ userId: 1, revokedAt: 1 }` compound index.
L-5 `/auth/refresh` returns full `user` object — could be slimmer.
L-6 Web `Cookies.set("userType", profileCompleted)` plaintext role on web (no real signal but ensure no middleware trusts it).
L-7 `12h` retry backoff entry unreachable (`MAX_LAUNCH_ATTEMPTS = 5`, `scheduledTasks.js:765-773`).
L-8 No frontend `EVENT_STATUS` constant — `'failed'` literal in two banners.
L-9 Route `restrictTo` for `/retry-launch` is broader than service-level RBAC (returns 403 not 401).
L-10 Webhook dedup not event-scoped (`messaging.controller.js:251-283`).
L-11 RSVP idempotency seed in code drifts from D2 doc (`guests.routes.js:39`).
L-12 Web vs mobile `useSingleEventStats` hook has different signature (object vs positional).

---

## 5. Cross-tier observations

### What's consistent
- Auth response contract `{ status, token, refreshToken, data: { user } }` from every backend issuance.
- Failure banner *visual* parity on web/mobile.
- Stats polling cadence parity (30s live / 5min completed / off otherwise).
- AuditLog enum values, GUEST_STATUS / EVENT_STATUS enums.

### What's diverged
- **Web bypasses HttpOnly cookies** via JS-readable `token` cookie (B-1).
- **Admin moderator/plan/addon UIs aren't wired** to new Phase 2 endpoints (H-14, H-15).
- **Frontend ignores Phase 3de structured `qr_*` reasons** (H-16); mobile has zero usage.
- **Mobile per-service fetches** don't auto-refresh access tokens (M-13).
- Hook signatures (web vs mobile) differ for stats polling (L-12).

---

## 6. What's solid

Crediting the work that landed correctly:

- **Phase 0** — `filterByWhitelabel` core fix, `WHATSAPP_APP_SECRET` startup validation, timing-safe HMAC compare, audit script. Solid security baseline.
- **Phase 1a backend** — JWT TTL, `RefreshTokenModel` with TTL index, replay-revoke chain, `LOCK_TIME` 30min, reset password clears lock + revokes all tokens. Mobile uses `expo-secure-store` correctly. Legacy `signToken` removed.
- **Phase 1b** — `IdempotencyKeyModel` schema + TTL index, `S3` fail-closed in production, immutable `AuditLogModel`, `timezone.isDue` correct semantics for KSA, payment factory pattern with stub fallback.
- **Phase 2** — `findActiveForUser` sort fix, expiry cron logic (transition correct, just no notify), admin-assign endpoint with audit, soft-delete with active-subscriber guard, plan-update validation guard for 4 of 5 limits.
- **Phase 3abc** — send-then-mark-live ordering, compensating `releaseInvites`, `failed` enum, `runBatched` correctness for typical case, atomic event-lock acquisition (`findOneAndUpdate`), idempotent terminal-fail in-app notification.
- **Phase 3de** — atomic CAS check-in with correct replay semantics, structured `qr_*` reasons in `GuestAccessToken.validateToken` (just unused on the frontend), `expiresAt` TTL on guest access tokens, dry-run/idempotent backfill script, manual-revoke endpoints with proper RBAC.

---

## 7. Suggested action plan

**Before launch (P0, days):**
1. Fix B-1 (web HttpOnly bypass). 1 day.
2. Decide payment unit, fix B-2. 0.5 day.
3. Add transactions or rollback to B-3 (subscription cancel-then-charge). 1 day.
4. Add refund stub or pending-refund queue for B-4 (addon partial failure). 0.5 day.
5. Fix B-5 (filter delivered guests on retry). 0.5 day.
6. Fix B-6 (actually send the failure email). 0.5 day.
7. Wire Phase 2 endpoints into web + mobile clients (H-14). 2-3 days.
8. Wire `whitelabelId` selector into admin-create UIs (H-15). 1 day.
9. Compound-unique idempotency key (H-5) — schema migration + lookup change. 1 day.
10. Atomic refresh rotation (H-1) + rate limit (H-2). 0.5 day.
11. Per-service mobile auth interceptor (M-13) — promotes from medium to high if mobile is launching. 2 days.

**P1 (week after launch):**
- All remaining HIGHs (H-3 to H-13, H-16 to H-22) and the more visible MEDIUMs (M-3, M-4, M-13, M-19, M-20).

**P2 (Phase 5 polish):**
- All remaining MEDIUMs and LOWs.

---

## 8. Testing gaps surfaced

- "Smoke tests" under `docs/implementation/phase-*-smoke-tests/` are mostly **source-grep static checks**, not executable HTTP tests. The Phase 3de `static-checks-3de.js` asserts string presence in source, not actual webhook behavior. Real production confidence requires:
  - At minimum, executable curl runbooks gated behind a CI job that hits a staging API.
  - Ideally Vitest/Jest for the idempotency middleware, refresh rotation, retry-launch state machine, and check-in CAS — these are pure-logic surfaces with high blast radius.
- No end-to-end test exercises a full event launch in non-Saudi timezone, which the master plan named as the Phase 3 stop-gate criterion.

---

## 9. Documentation gaps

- Payment `amount` unit contract (B-2) is undocumented. Add a comment in `PlanModel.pricing` and a JSDoc on `paymentProvider.charge`.
- `withIdempotency` race semantics (H-6) should be explicit in the helper's JSDoc.
- The "send everyone again on retry" design (B-5) — the report claims this is intentional ("retryFailed" semantics) but the code does not implement filtered retry. Either the doc is wrong or the code is wrong.
- The 24h backfill TTL-deletion side-effect (M-23) needs an operator runbook entry.

---

## Appendix A — Per-phase summary tables

### Phase 0
- ✅ TENANT-F01 / RBAC-F02 core fix; ✅ webhook HMAC fail-closed; ✅ audit script
- ⚠️ BLOCKER: seed script breaks; ⚠️ HIGH: web/mobile admin UIs broken; ⚠️ MEDIUM: stale comment + JSON.stringify HMAC input

### Phase 1a
- ✅ All 12 finding IDs verified at code level
- ⚠️ BLOCKER: web JS-readable token cookie; ⚠️ HIGH: rotation race, no rate limit on /refresh, web logout gap, mobile orphan token

### Phase 1b
- ✅ 5 utilities exist and the proof wirings work
- ⚠️ BLOCKER: payment unit ambiguity; ⚠️ HIGH × 5: idempotency global key, race, S3 ACL, audit no-before, payment idempotency scope

### Phase 2
- ✅ 9 of 9 finding IDs landed in backend
- ⚠️ BLOCKER × 2: cancel-before-charge, addon no-refund-on-failure; ⚠️ HIGH × 6 inc. unwired clients

### Phase 3abc
- ✅ Pipeline ordering, locks, runBatched, banners, retry endpoint
- ⚠️ BLOCKER × 2: retry double-sends, failure email never sent; ⚠️ HIGH × 1: lock TTL too short

### Phase 3de
- ✅ Atomic CAS check-in, structured 410 reasons (backend), backfill safety, polling cadence
- ⚠️ HIGH × 6: QR rotation no delivery, JSON.stringify HMAC, staff token opaque reasons, frontend ignores reasons, missing `checkedInBy`, full-collection stats scan

---

*End of review.*
