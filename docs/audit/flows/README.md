# 01 — auth-foundation

## One-paragraph description
This flow establishes the core authentication architecture with short-lived access tokens and long-lived refresh tokens, replacing the current 90-day JWT model. Includes JWT generation, storage mechanism per platform (HttpOnly cookies on web, expo-secure-store on mobile), server-side token revocation tracking, refresh token rotation on use, and proper expiry handling.

## Scope tags
[web] [backend] [mobile]

## Roles involved
All roles (host, vendor, admin, whitelabel_admin, whitelabel_moderator, super_admin)

## Entry points
Backend JWT generation: `labbe-backend-/src/modules/auth/auth.service.js:45` (signToken method)
Backend token verification: `labbe-backend-/src/shared/middleware/auth.js:32` (protect middleware)
Web token storage: `labbe/stores/authStore.js:32` (useAuthStore state)
Mobile token storage: `halla-mobile/stores/authStore.js:62` (persistAuth method)
Mobile secure store: `halla-mobile/services/authService.js` (uses expo-secure-store)
Web login endpoint: `labbe/app/[lang]/(auth-layout)/login/page.js:1`
Mobile login screens: `halla-mobile/screens/LoginScreen.js:1`

## Exit / terminal states
Success: User authenticated with access token + refresh token issued. Access token valid ~15min, refresh token valid ~30d.
Failure: Invalid credentials, account locked (loginAttempts tracking), account status blocked (suspended/rejected/inactive).
Abandoned: Session cleared by logout, token expiry, or manual revocation.

## Touched modules
**Backend:**
- `labbe-backend-/src/modules/auth/auth.service.js` (signToken, login, signup flows)
- `labbe-backend-/src/modules/auth/auth.controller.js` (setTokenCookie, sendAuthResponse)
- `labbe-backend-/src/shared/middleware/auth.js` (protect middleware, token verification)
- `labbe-backend-/src/shared/constants/roles.js` (role definitions)
- `labbe-backend-/src/shared/constants/status.js` (user status tracking)
- `models/UserModel.js` (password hashing, status fields, loginAttempts)

**Web:**
- `labbe/stores/authStore.js` (state: token, user, subscription; methods: setToken, setUser)
- `labbe/app/[lang]/(auth-layout)/login/page.js` (login entry point)

**Mobile:**
- `halla-mobile/stores/authStore.js` (state: token, user, role; persistAuth/restoreSession)
- `halla-mobile/services/authService.js` (API calls: loginWithEmailAPI, signupWithPhoneAPI, etc.)
- `halla-mobile/screens/LoginScreen.js` (login UI)

## Dependencies on other flows
- **Flow 02 (signup-host)**: Uses token generation from this flow after OTP verification
- **Flow 03 (signup-vendor)**: Uses token generation after vendor signup
- **Flow 04 (signup-whitelabel)**: Uses token generation (phase 1); post-approval (phase 2) uses setup-password token
- **Flow 05 (login)**: Directly implements token generation for all login modes
- **Flow 06 (password-reset)**: Generates new token after password reset
- **Flow 07 (profile-settings)**: Uses token to authenticate profile update requests

## Known divergences (web ↔ mobile, frontend ↔ backend)
Mobile uses expo-secure-store; web uses HttpOnly cookies. Both store token but with different mechanisms.
Refresh token rotation logic not yet fully implemented in mobile (design ready, implementation pending).
Backend currently uses single 90-day JWT; new design specifies 15min access + 30d refresh (implementation not yet live).
Login attempt tracking and account locking implemented in backend (labbe-backend-/src/modules/auth/auth.service.js:124), not enforced on mobile.

## Open questions
1. Where is refresh token rotation implemented? Is there a revocation list in Redis or MongoDB?
2. Are refresh tokens themselves stored in HttpOnly cookies on web, or only access tokens?
3. Mobile uses AsyncStorage for auth state — should refresh token be in expo-secure-store instead?
4. Is there a revocation check in the protect middleware (labbe-backend-/src/shared/middleware/auth.js) that validates token against server-side revocation list?
5. How is token expiry (config.jwt.expiresIn at labbe-backend-/src/modules/auth/auth.service.js:50) configured? Is it 15min or 90 days?
6. Account lockout (user.lockUntil logic at line 125) — what is the lock duration?


# Event Flow Audit Stubs

Five critical flow stubs written for Halla pre-production audit (2026-04-27).

## Files created

1. **13-event-update.md** (7.6K)
   - Event modification after creation
   - Field-level access control per status
   - Guest list tracking and subscription limits
   - Links: events.routes (5 PATCH endpoints), events.service (5 update methods), mobile UpdateEventScreen

2. **14-event-launch-happy.md** (2.7K)
   - Happy path: schedule launch → cron fires → send bulk invites → mark live
   - scheduleEventLaunch cron: */1 * * * * (every minute)
   - scheduleEventCompletion cron: 0 * * * * (hourly, 24h after event date)
   - KEY DIVERGENCE: Code marks event 'live' BEFORE sending invitations; spec says send first, then mark "invitations sent" on event date
   - TBD: Remove Taqnyat native scheduledDatetime path

3. **15-event-launch-failure.md** (6.3K)
   - Failure/retry path: sendBulk errors → retryFailed() → max 3 attempts
   - MISSING IMPLEMENTATION: 
     - No automatic retry cron (retryFailed callable but not called)
     - No 'failed' status in EVENT_STATUS constants
     - No host/admin failure notifications
     - No failure state UI on web/mobile
   - TBD: Add status, notification templates, retry backoff timing

4. **16-test-message.md** (6.6K)
   - Host-initiated test send before launch
   - Two endpoints: PATCH /events/{id}/test-message or POST /messaging/test
   - Template parameter order: guest_name, event_name, event_date, event_time, event_location
   - TBD: Canonical endpoint choice, test data customization, rate limiting

5. **17-bulk-dispatch.md** (3.5K)
   - Core send loop: fetch guest phone → call Taqnyat API for each → track status
   - **CRITICAL FINDINGS**:
     1. 100ms per-guest sleep (line 258 of messaging.service.js) — blocks for 1000+ guests
     2. No idempotency key — retries send duplicate
     3. Cron race condition — status set 'live' before send completes
     4. No rate limiting enforcement — may exceed Taqnyat API limits
     5. Taqnyat native SMS path still exists — not removed per spec
   - TBD: Implement batching + rate cap, add idempotency key, atomic locking, per-subscription rate limits

## Key design findings

- **Status naming**: Event goes 'live' on schedule time (cron), NOT event date. Spec says event should go live on event date; schedule time should only mark "invitations sent."
- **Taqnyat native path**: Old native SMS scheduling via `launchSettings.taqnyatDeleteId` still checked but should be removed.
- **Retry mechanism**: retryFailed() exists but no automatic retry cron. Manual admin call only.
- **No idempotency**: Taqnyat API calls have no idempotency key. Duplicates on cron re-fire or manual retry.
- **Mobile coverage**: UpdateEventScreen TBD; launch UI TBD; failure UI TBD.
- **Admin endpoints**: Some PATCH routes (line 921-926 events.routes.js) for admin event status, but no admin retry endpoint for failed launches.

## Mapping to source

All file:line references cite actual code:
- `labbe-backend-/src/` (Express + MongoDB backend)
- `halla-mobile/` (React Native, specific screens TBD)
- `labbe/` (Next.js web, component paths TBD)

## Next steps

1. Prioritize fixes per critical findings (17 = highest)
2. Add missing 'failed' status to EVENT_STATUS constants
3. Implement automatic retry cron with exponential backoff
4. Replace 100ms sleep with batched parallel sends + rate limiting
5. Add idempotency keys to all Taqnyat API calls
6. Remove Taqnyat native scheduling path entirely
7. Implement host/admin failure notifications and UI
8. Verify mobile screens support all flows
