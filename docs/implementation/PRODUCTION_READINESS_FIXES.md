# Production-Readiness Fixes — implementation report

**Branch:** `claude/review-implementation-plans-e0ONB`
**Source review:** `docs/implementation/PRODUCTION_READINESS_REVIEW.md`
**Commits (8):** `cc73d8d` → `35b1ae4` (above the merge of phases 0–3de at `0d1bc6f`).

This document tallies the BLOCKER, HIGH, and MEDIUM items from the review against what landed.

---

## BLOCKERs — all addressed

| # | Status | Commit | Notes |
|---|--------|--------|-------|
| **B-1** Web JS-readable token cookie | ✅ | `002066d` | `useAuthMutation` no longer writes `token` cookie; axios no longer reads it; `Cookies.remove("token")` keeps stale legacy state cleared. Auth on web is exclusively the HttpOnly `access_token` cookie + `withCredentials`. |
| **B-2** Payment unit ambiguity | ✅ | `cc73d8d` | Moyasar provider rejects non-integer / non-positive `amount`; PlanModel `pricing.oneTime` validator enforces non-negative integer minor units; `Math.round(amount * 100)` removed. |
| **B-3** Subscription cancel-then-charge | ✅ | `85e4c2b` | `subscribe()` now charges first, then cancels existing active subs only on charge success. `changePlan()` doesn't charge yet (deferred until plan-change payment is wired) but the same code path is annotated. Provider error string no longer leaked. |
| **B-4** Addon partial-failure no refund | ✅ | `85e4c2b` | New `_recordPendingRefund` helper records audit row + admin notification. AddonModel enum extends with `failed_quota`. Throws clear "money taken, contact support" error to caller instead of swallowing. |
| **B-5** Retry double-sends to delivered guests | ✅ | `85e4c2b` | `runEventLaunch` filters `event.guestList` to `invitation.sent !== true` before invoking `sendBulk`. Edge case where all guests already delivered short-circuits to `live` without dispatching. |
| **B-6** Failure email never sent | ✅ | `85e4c2b` | Two fixes: (a) added the missing `email.send.notification` helper that callers were trying to reach; (b) `_markFailedAndNotify` now invokes the new dedicated `email.send.eventLaunchFailed` template directly with host name, attempt count, reason, support email. |

## HIGH — addressed

| ID | Status | Commit | Notes |
|----|--------|--------|-------|
| **H-1** Refresh rotation race | ✅ | `002066d` | Atomic `findOneAndUpdate({ tokenHash, revokedAt: null }, $set: { revokedAt })`; null result triggers replay-detection chain revoke. |
| **H-2** No rate limit on /auth/refresh | ✅ | `002066d` | New `refreshLimiter` (60 req/min per IP) wired in `auth.routes.js`. |
| **H-3** Web logout doesn't call backend | ✅ | `002066d` | `authStore.logout` awaits `/auth/logout` (lazy-imported to avoid circular dep) before clearing local state. |
| **H-4** Mobile signup-OTP orphans refresh token | ✅ | `002066d` | `verifySignupOTP` now calls `_persistAuth` so secure-store has the refresh from the moment OTP succeeds. |
| **H-5** Idempotency global key collision | ✅ | `cc73d8d` | Compound `{userId, scope, key}` unique index; `withIdempotency` requires explicit `scope` + `requestHash`. Migration script `scripts/migrate-idempotency-key-index.js` ships dry-run by default. |
| **H-6** Idempotency middleware race | ✅ | `cc73d8d` | Insert-pending-first pattern via `findOneAndUpdate` upsert + poll. Concurrent callers wait for the first to complete and replay its cached response. |
| **H-7** Subscription no derived idempotency key | ✅ | `85e4c2b` | `subscribe()` derives `subscribe:${userId}:${plan.code}:${planPrice}` when client omits header. Same pattern in `addons.purchase`. |
| **H-8** S3 uploads missing ACL | ✅ | `002066d` | Forces `ACL: 'private'` on every PutObject + multer-s3. Reads use signed URLs. |
| **H-9** Audit captures only `after` | ✅ | `002066d` + `0531f3c` | `auditLog` middleware accepts `captureBefore` async hook; vendor-status route wires it to snapshot status before controller mutates the doc. |
| **H-10** Scattered active-sub lookups | ✅ | `0531f3c` | `auth.service.getUserSubscription`, `admin.service` (3 sites), `admin.controller` updateVendor — all now route through `findActiveForUser`. |
| **H-11** Provider error leaked to client | ✅ | `85e4c2b` | `subscribe` and `addons.purchase` log the provider error server-side and surface a generic "Payment failed" to the caller. |
| **H-12** Subscription expiry no notification | ✅ | `85e4c2b` | Cron emits `subscription_expired` notification (in-app + email via generic-notification template) per transitioned record. |
| **H-13** Addon atomicity | ✅ (partial) | `85e4c2b` + `cc73d8d` | Derived idempotency key + scope/user compound (relies on H-5). Full atomic guarantees still depend on Mongo transactions, which require replica-set; documented. |
| **H-14** Phase 2 endpoints unwired | ✅ | `4f51784` | Web `adminDashboard.js`: `planAdminAPI.createPlan/deletePlan`, new `subscriptionAdminAPI.assign`, new `addonsAPI`. Mobile `adminDashboardService.js`: parallel exports + extra-headers in `apiRequest`. |
| **H-15** whitelabelId selector missing in admin UIs | ✅ | `4f51784` | Web `AddModeratorPopup` + mobile `AddModeratorModal` show a tenant picker only when current user is super_admin and the role being created requires `whitelabelId`. WL admins still inherit server-side. |
| **H-16** FE ignores qr_* reasons | ✅ | `e16958b` | `labbe/app/[lang]/post-event/page.js` parses `error.response.data.reason` from the 410 body and renders distinct messages for `qr_rotated` / `qr_revoked` / `qr_expired` / `qr_invalid`. |
| **H-17** Event lock TTL too short | ✅ | `85e4c2b` | `eventLock.estimateLockTtl(guestCount)` sizes TTL to worst-case sendBulk wall-clock + 2-min buffer (floor 10 min). New `heartbeat()` helper refreshes lockedAt every minute during long sends; `runEventLaunch` starts/stops it in finally. |
| **H-18** QR rotation no guest delivery | ✅ | `e16958b` | `rotateGuestQR` now Taqnyat-SMS the new QR link to the guest immediately. Delivery is best-effort (failure logged + audited, doesn't roll back rotation). |
| **H-19** Webhook HMAC over JSON.stringify | ✅ | `e16958b` | `req.rawBody` captured by `express.json({ verify })` for the `/messaging/webhook` route only; `verifyWebhookSignature` HMACs over the raw bytes with a documented JSON.stringify fallback if rawBody is missing. |
| **H-20** Staff token opaque reasons | ✅ | `e16958b` | `StaffAccessToken.validateToken` returns structured `staff_invalid` / `staff_revoked` / `staff_expired`. `verifyStaffAccess` maps revoked/expired to 410 Gone with the structured body. |
| **H-21** check-in no `checkedInBy` | ✅ | `e16958b` | GuestModel `checkIn.checkedInBy` (User ref) + `checkIn.checkedInByStaff` (token / name / phone) are now persisted by `_performIdempotentCheckIn`. Replay response surfaces `checkedInBy` so staff B sees who originally checked the guest in. Audit log entry emitted. |
| **H-22** Stats endpoints scan whole collection | ✅ | `e16958b` | `getEventGuests` + `getEventStats` use `Guest.aggregate({$group})` via new `_computeGuestStats` helper. |
| **H-23** Seed script breaks on Phase 0 | ✅ | `e16958b` | `seedTestUsers.js` reordered so whitelabelAdmin is created first; admin + moderator now scoped to its tenant via `whitelabelId`. Fresh dev DBs no longer ship broken admins. |

## MEDIUM — addressed

| ID | Status | Commit | Notes |
|----|--------|--------|-------|
| **M-1** withIdempotency empty requestHash | ✅ | `cc73d8d` | Helper now throws if `opts.scope` or `opts.requestHash` missing. |
| **M-2** Cache loses Set-Cookie/Location | ⚠️ documented | — | Documented in middleware JSDoc; replays restore status + body only. |
| **M-3** `raw` Moyasar payload cached | ✅ | `cc73d8d` | Provider strips `raw` from cached response; raw logged only in non-prod. |
| **M-4** Timezone silently falls back | ✅ | `002066d` | `parseEventTime` throws on unsupported tz; `isDue` catches + treats as not-due so cron tolerates. |
| **M-5** Naïve toLocaleString call sites | ✅ | `0531f3c` | New `formatRiyadh` helper + migrated `events.service` exports, `guests.service` export, `messaging.service._formatDate`, `scheduledTasks._formatDateAr`. |
| **M-6** Buffered S3 uploads | ✅ | `002066d` | `@aws-sdk/lib-storage` Upload helper for buffers > 5 MiB / streams. |
| **M-7** AUTO_CONTENT_TYPE divergence | ⚠️ documented | `002066d` | Documented in S3 utility JSDoc; no code change. |
| **M-8** Audit middleware no field redaction | ✅ | `002066d` | `redactSensitive` walks changes/metadata for password/token/secret/apiKey/cvv/etc. |
| **M-9** Plans/addons audit `targetType: system` | 🔁 deferred | — | Acknowledged as Phase 5 work in original report; still deferred. |
| **M-10** Check-in lacks AuditLog entry | ✅ | `e16958b` | `_performIdempotentCheckIn` emits `guest.check_in` audit entry. |
| **M-11** Legacy `jwt` cookie still accepted | ✅ | `002066d` | Removed from `extractAccessToken`. |
| **M-12** CORS / cookie SameSite mismatch | ✅ | `002066d` | Cookie `SameSite=Lax`; CORS allowlist documented to stay in sync; CSRF tradeoff annotated. |
| **M-13** Mobile per-service no auto-refresh | ✅ (partial) | `35b1ae4` | High-traffic services (notifications, messaging, events, dashboard) routed through `apiFetch` so 401-on-expired-token auto-refreshes. Lower-traffic services (settings, tickets) still use raw fetch — fast-follow. |
| **M-14** Non-constant-time email code | ✅ | `002066d` | `verifyEmailCode` uses `crypto.timingSafeEqual` with length pre-check. |
| **M-15** setupPassword doesn't revoke priors | ✅ | `002066d` | `revokeAllForUser` called before `issueTokenPair`. |
| **M-16** Sub sort lacks _id tiebreaker | ✅ | `0531f3c` | `findActiveForUser` sort: `{ createdAt: -1, _id: -1 }`. |
| **M-17** Cron multi-instance dup | ✅ | `0531f3c` | New `cronLease.withLease` helper; subscription expiry cron wraps in it. |
| **M-18** maxInvitesPerEvent over-strict | ✅ | `0531f3c` | Plan-update validation queries live/scheduled events that would actually breach the new ceiling instead of blocking unconditionally. |
| **M-19** Manual retry no client idempotency-key | ✅ | `0531f3c` | Web `useEventMutation.retryLaunch` and mobile `eventsService2.retryLaunch` send a per-click `Idempotency-Key` header. |
| **M-20** Banner countdown + i18n | ✅ | `0531f3c` + `4f51784` | Web + mobile banners: live countdown to next retry attempt; English fallback strings on every label; web component receives `lang` from route param. |
| **M-21** runBatched no 429 backoff | ✅ | `85e4c2b` | Detects 429 / "rate limit" errors, halves the rate (floor 2/sec), respects `Retry-After`, ramps back up after a 50-success streak; single inline retry per item. |
| **M-22** releaseInvites failure no reconciliation | ✅ | `0531f3c` | Compensating-return failure now emits `subscription.invite_pool_reconcile_pending` audit row and notifies admins. |
| **M-23** Backfill script unparallelized + no TTL warning | ✅ | `e16958b` | `backfill-guest-access-token-expiry.js` uses `bulkWrite` (batches of 500) + optional `--throttle`; counts and warns about rows that will be immediately TTL-swept after backfill. |
| **M-24** Multi-checkin design boundary | 🔁 deferred | — | Single-checkin design retained; Phase 4+ refactor if multi-day events become a requirement. |
| **M-25** Dead `performCheckIn` method | ✅ | `e16958b` | Removed (it set the invalid `'attended'` status). |

## LOW

L-1, L-2, L-3, L-5, L-6, L-9, L-10, L-11, L-12 not addressed — Phase 5 polish.

L-4 (RefreshTokenModel compound index) ✅ commit `002066d`.
L-7 (12h backoff entry unreachable) ✅ commit `0531f3c` — trimmed array.
L-8 (no FE EVENT_STATUS constant) — banners still use string literal `'failed'`; minor.

---

## Files touched (63 changed, +3288 / −483)

Backend (43 files): models (Idempotency, Refresh, User, Plan, Addon, Guest, StaffAccessToken, Subscription, AuditLog), modules (auth, admin, events, guests, staff, messaging, addons, subscriptions, plans, post-event, notifications), shared utils (auditLog, idempotency, timezone, eventLock, runBatched, cronLease, scheduledTasks, s3Upload), middleware (auth, auditLog, idempotency, rateLimiter), email (templates + index), config + app.js, infrastructure/paymentProvider, scripts (seedTestUsers, backfill-guest-access-token-expiry, migrate-idempotency-key-index).

Web (8 files): hooks (useAuthMutation, useEventMutation), services (apiClient, adminDashboard), stores (authStore), schemas (adminPopupSchemas), components (AddModeratorPopup, EventFailureBanner + Client, post-event page).

Mobile (12 files): stores (authStore), services (apiClient — already existed; notificationService, messagingService, eventsService2, dashboardService, adminDashboardService), components (AddModeratorModal, EventFailureBanner).

---

## What remains for Phase 5 / fast-follow

- M-9 (audit `targetType: system` for plans/addons → proper enum values)
- M-13 leftover services (settings, tickets, auth — lower traffic)
- M-24 multi-checkin design boundary (only if requirement appears)
- All L-class polish

---

## Manual verification still required pre-launch

1. **Idempotency index migration** — run `node scripts/migrate-idempotency-key-index.js --apply` once, verify legacy `key_1` index is dropped and the compound `userId_1_scope_1_key_1` exists.
2. **GuestAccessToken backfill** — run `node scripts/backfill-guest-access-token-expiry.js --apply` in a maintenance window. Note the operator-warning about rows that will be TTL-swept immediately.
3. **Payment integration** — confirm with Moyasar that amounts are stored/passed in halalas (minor units). The provider now rejects non-integer values.
4. **CORS + cookie domain sanity** — verify `SameSite=Lax` cookies actually travel from the Vercel web origin to the API origin in production. If not, decide whether to switch to `SameSite=None; Secure` (requires CSRF token added on top).
5. **Cron lease in multi-instance** — when scaling to >1 backend node, the `subscription_status_update` cron now uses `cronLease.withLease`. Other crons (`scheduleEventLaunch`, `scheduleEventRetry`, etc.) are protected by their own per-event locks but should still be reviewed for multi-instance safety in Phase 5.
