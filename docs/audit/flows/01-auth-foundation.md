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
Mobile secure store: `halla-mobile/services/authService.js` (NOTE: expo-secure-store is NOT imported anywhere in halla-mobile — this entry point is incorrect. Mobile currently uses AsyncStorage only. expo-secure-store must be added as part of the Gate-1 refresh-token implementation.)
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
Mobile uses AsyncStorage (NOT expo-secure-store — confirmed by code); web uses a single HttpOnly cookie. Neither currently separates access from refresh tokens. Gate-1 target: mobile uses expo-secure-store for refresh token + in-memory access token; web uses two HttpOnly cookies.
Refresh token rotation logic not yet fully implemented in mobile (design ready, implementation pending).
Backend currently uses single 90-day JWT; new design specifies 15min access + 30d refresh (implementation not yet live).
Login attempt tracking and account locking implemented in backend (labbe-backend-/src/modules/auth/auth.service.js:124), not enforced on mobile.

## Open questions
1. Where is refresh token rotation implemented? Is there a revocation list in Redis or MongoDB?

**Type B — Behavior critique / Gap against Gate-1 decision**
**Bucket 6 — Fresh answer (no prior Peter answer)**

Refresh token rotation is NOT implemented anywhere in the current codebase. Code search finds zero `refreshToken` fields in `UserModel.js`, no `/auth/refresh` route in `auth.routes.js`, and no revocation list in either Redis or MongoDB. The mobile `refreshToken()` store method (`halla-mobile/stores/authStore.js:290`) calls `refreshTokenAPI` which itself is documented in `halla-mobile/services/authService.js` with an explicit comment: *"Backend does not have a refresh-token endpoint. Token refresh is handled by re-authenticating via /auth/me."*

This is a direct conflict with **Gate-1 Decision #1** (short-lived access token + rotating refresh token). The entire refresh token architecture must be built from scratch:
- Backend: add `refreshToken` field to `UserModel`, new `POST /auth/refresh` endpoint, rotation-on-use, server-side revocation list (MongoDB collection or Redis set with TTL).
- Web: store refresh token in a second HttpOnly cookie; access token in memory or a short-lived cookie.
- Mobile: store refresh token in expo-secure-store (not AsyncStorage); call `/auth/refresh` silently before each request when access token is expired.
2. Are refresh tokens themselves stored in HttpOnly cookies on web, or only access tokens?

**Type B — Behavior critique / Gap against Gate-1 decision**
**Bucket 6 — Fresh answer (not yet addressed in codebase)**

Currently there is only one token and one cookie. `auth.controller.js:23–32` (`setTokenCookie`) sets a single `jwt` cookie with `httpOnly: true` — this is the main JWT that functions as both access and session token. There is no separate refresh token, so the question of "which token goes in the cookie" is moot until the dual-token architecture is built.

Target design per Gate-1:
- Refresh token → HttpOnly, Secure, SameSite=Strict cookie, path `/auth/refresh` only, 30-day expiry.
- Access token → short-lived HttpOnly cookie (15-min) or in-memory (avoids XSS on web). Using an HttpOnly access-token cookie alongside a refresh-token cookie is the standard approach when a JS bundle must not touch either token.
3. Mobile uses AsyncStorage for auth state — should refresh token be in expo-secure-store instead?

**Type A — Code lookup**
**Bucket 6 — Fresh answer (entry-point note "(uses expo-secure-store)" is factually wrong)**

Code confirms: `halla-mobile/stores/authStore.js:62` (`persistAuth`) writes `{ user, token, role }` to **AsyncStorage** under key `@auth_state`. No file in the entire `halla-mobile/` directory imports `expo-secure-store` — a full-directory grep returns zero matches. The entry-point listing in this file that says "(uses expo-secure-store)" is incorrect and should be removed.

**Gate-1 intent:** The refresh token (when built) must be stored in `expo-secure-store`, which is backed by the iOS Keychain and Android Keystore. The short-lived access token can live in memory (React state / Zustand store, not persisted), removed on app close. AsyncStorage is plain-text on rooted/jailbroken devices and is not acceptable for a long-lived credential. The entry point listing has been corrected: `halla-mobile/services/authService.js` does NOT use expo-secure-store in any form today.
4. Is there a revocation check in the protect middleware (labbe-backend-/src/shared/middleware/auth.js) that validates token against server-side revocation list?

**Type A — Code lookup**
**Bucket 6 — Fresh answer**

No. The `protect` middleware (`auth.js:32–120`) does the following checks in order: extract token from Bearer header or cookie → verify with `JWT_SECRET` → check `changedPasswordAfter` → check user status (suspended/rejected/inactive/pending). There is no step that checks a revocation list, a blocklist, or a `jti` claim against any store. If a token is stolen or a user is force-logged-out, the token remains valid until expiry.

This is a security gap that Gate-1 Decision #1 requires closing. Once the dual-token architecture is live, the protect middleware must additionally: (a) reject access tokens whose `jti` appears in a revocation set, and (b) the `/auth/refresh` endpoint must invalidate the old refresh token immediately on rotation to prevent replay.
5. How is token expiry (config.jwt.expiresIn at labbe-backend-/src/modules/auth/auth.service.js:50) configured? Is it 15min or 90 days?

**Type A — Code lookup**
**Bucket 6 — Fresh answer**

Currently **90 days** by default. `labbe-backend-/src/config/env.js:32` defines `JWT_EXPIRES_IN: Joi.string().default('90d')` and `JWT_COOKIE_EXPIRES_IN: Joi.number().default(90)` (days). `config/index.js:43` reads `env.JWT_EXPIRES_IN` into `config.jwt.expiresIn`. The `signToken` in `auth.service.js:45` calls `jwt.sign(..., config.jwt.expiresIn)` — so if no override is in `config.env`, the token lives 90 days.

A second legacy `signToken` exists in `auth.js:171` that reads `process.env.JWT_EXPIRES_IN || '90d'` directly — same fallback.

**Gate-1 Decision #1 requires:** access token expiry must become `15m`; `JWT_COOKIE_EXPIRES_IN` becomes `0.0104` (15 minutes in days) or the cookie is set with `maxAge: 15 * 60 * 1000`. A separate `REFRESH_TOKEN_EXPIRES_IN: '30d'` env var must be introduced. The `90d` default must be removed from `env.js`.
6. Account lockout (user.lockUntil logic at line 125) — what is the lock duration?30m is reasonable

**Type C — Product decision**
**Bucket 4 — Enhanced (Peter says 30m; code currently sets 15m; keeping 30m but noting what must change)**

Peter's answer: 30 minutes is reasonable.

Code reality: `labbe-backend-/models/UserModel.js:601–622` (`incLoginAttempts` method) sets `MAX_LOGIN_ATTEMPTS = 5` and `LOCK_TIME = 15 * 60 * 1000` (15 minutes). The lock is stored in the root-level `lockUntil` field (line 343) and there is a second `profile.adminData.lockUntil` path that `isLocked()` at line 592 also checks.

**Decision confirmed: change lock duration to 30 minutes.** Update `LOCK_TIME` in `UserModel.js` from `15 * 60 * 1000` to `30 * 60 * 1000`. Threshold of 5 attempts stays. Also verify `profile.adminData.lockUntil` is cleaned up or unified with the root `lockUntil` field — having two separate lockUntil paths checked in `isLocked()` is a maintenance hazard.

## Notes from answer pass

1. **Two signToken implementations coexist.** `auth.service.js:45` reads `config.jwt.expiresIn` (the canonical version, used by all login/signup flows). `auth.js:171` has a legacy `signToken` reading `process.env.JWT_EXPIRES_IN || '90d'` directly. The legacy version should be deleted or consolidated; having both is a maintenance risk and a source of silent divergence if env vars are updated.

2. **The "entry points" section listed expo-secure-store — this was wrong.** Corrected in this pass. No file in `halla-mobile/` imports expo-secure-store. Any future mobile secure-storage implementation must install the package (`expo-secure-store`) explicitly.

3. **Redis is present in config but not used for auth.** `config/index.js` has a `redis` block and `REDIS_ENABLED` env var. Redis could serve as the revocation list store for short-lived access token JTIs once the dual-token architecture is built — this is the natural fit. If Redis is not available in prod, a MongoDB `RevokedTokens` collection with a TTL index is the fallback.

4. **`profileCompleted` is not checked in `protect` middleware.** Although this is Flow 02's primary concern, it is worth noting here that the auth middleware has no hook to enforce profile completion before routing to the dashboard. A `requireCompleteProfile` middleware wrapping all dashboard routes is needed across all three platforms.

---

## State machine

```
[unauthenticated]
      │ login / OTP-verify / signup-complete
      ▼
[token-issued]  ──── changedPasswordAfter fails ──► [unauthenticated]
      │               status: suspended/rejected     │
      │               /logout                        │
      ▼                                              │
[authenticated] ──────────────────────────────────►─┘
      │
      │ token expired (currently: never within 90d)
      ▼
[token-expired]  ── refresh (not implemented) ──► [authenticated]
                 └─ no refresh endpoint ──────────► [unauthenticated]
```

Token states: `issued` → `active` → `expired` | `invalidated-by-password-change` | `logged-out`

Note: "revoked" state is architecturally required (Gate-1 #1) but currently unreachable — no revocation list exists.

---

## Data handoffs

| Step | Source | Payload | Destination |
|------|--------|---------|-------------|
| signToken() | `auth.service.js:45` | `{ id, role }` → 90d JWT string | HTTP response body + `jwt` cookie |
| setTokenCookie() | `auth.controller.js:23` | JWT string | HttpOnly cookie `jwt` (secure in prod) |
| persistAuth() | `halla-mobile/stores/authStore.js:62` | `{ user, token, role }` | AsyncStorage key `@auth_state` (plain-text) |
| protect middleware | `auth.js:32` | JWT from `Authorization: Bearer` or cookie | `req.user` populated with DB user object |
| changedPasswordAfter() | `UserModel.js:512` | `passwordChangedAt` timestamp vs JWT `iat` | Rejects token if password changed post-issue |
| refreshToken() [mobile] | `authStore.js:290` | GET /auth/me with existing token | Re-reads user object — NOT a real token refresh |

---

## Role variations

All roles pass through the same `signToken` / `protect` path. No role-specific token claim or expiry variation exists today. The JWT payload carries `{ id, role }` only — no org scope, no tenant ID. Whitelabel-scoped requests rely on the user's stored `whitelabelData` in the DB, not a JWT claim, meaning a compromised long-lived token from one whitelabel partner is not scoped to their tenant at the token level.

---

## Web ↔ mobile parity

| Capability | Web | Mobile | Gap |
|-----------|-----|--------|-----|
| Token storage | HttpOnly cookie (secure) | AsyncStorage (plain-text) | CRITICAL — mobile stores long-lived token insecurely |
| Token type | Single 90d JWT | Single 90d JWT | Same; both need migration to short-lived access + refresh |
| Refresh mechanism | None (cookie re-sent on each request) | GET /auth/me re-read, not a refresh | Both non-compliant with Gate-1 #1 |
| Logout token invalidation | Cookie cleared; no server-side revocation | Token removed from AsyncStorage; no server-side revocation | Same gap on both platforms |
| Secure credential store | N/A (cookie is HttpOnly) | expo-secure-store NOT installed | Mobile gap — must install and migrate |
| JWT_SECRET source | `config.jwt.secret` (auth.service.js:49) | N/A (mobile doesn't sign) | Legacy `auth.js:171` reads `process.env.JWT_SECRET` directly |

---

## Edge cases & failure modes

1. **Stolen token (no revocation):** If a mobile token is stolen from AsyncStorage (rooted device), it is valid for up to 90 days with no way to revoke it server-side.
2. **Password change doesn't revoke mobile token:** `changedPasswordAfter` is checked in `protect` middleware — but only when a request is made. A mobile client with a cached token that never re-hits the server will remain "authenticated" in the local store even after a password change, until the next API call.
3. **Two signToken implementations silent divergence:** If `process.env.JWT_EXPIRES_IN` is set but `config.jwt.expiresIn` is not (or vice versa), the two `signToken` functions at `auth.service.js:45` and `auth.js:171` will produce tokens with different expiries from the same codebase.
4. **optionalAuth missing changedPasswordAfter:** `auth.js:126` (`optionalAuth`) verifies the JWT but does not call `changedPasswordAfter`. A user whose password changed will still get a populated `req.user` on optional-auth routes, silently bypassing the password-change invalidation.
5. **Redis enabled but unused for auth:** `config/index.js` has a `redis` block. If Redis is configured but auth never uses it, the revocation list will be absent even when infra is ready.

---

## Findings

### FLOW-01-F01
- **Title:** JWT expiry is 90 days — violates Gate-1 access-token limit
- **Type:** CONFLICT
- **Severity:** Critical
- **File:** `labbe-backend-/src/config/env.js:32`
- **Detail:** `JWT_EXPIRES_IN` defaults to `'90d'`; `JWT_COOKIE_EXPIRES_IN` defaults to `90` (days). Gate-1 Decision #1 requires access tokens ≤ 15 minutes with a separate 30-day rotating refresh token. A 90-day single token means any stolen credential (from AsyncStorage on mobile or a network leak) grants 90 days of unrevocable access.
- **Recommended change:** Change default in `env.js` to `JWT_EXPIRES_IN: '15m'` and `JWT_COOKIE_EXPIRES_IN: 0.0104` (≈15 min in days). Add `REFRESH_TOKEN_EXPIRES_IN: Joi.string().default('30d')`. Implement the refresh-token endpoint and rotation logic.
- **Related:** FLOW-01-F02 (missing refresh endpoint), FLOW-01-F03 (AsyncStorage token storage)

### FLOW-01-F02
- **Title:** No refresh-token endpoint — token rotation architecture missing
- **Type:** CONFLICT
- **Severity:** Critical
- **File:** `halla-mobile/services/authService.js:464`
- **Detail:** `refreshTokenAPI` is documented with the comment "Backend does not have a refresh-token endpoint." The mobile store calls GET /auth/me to re-read user data, which is not a token refresh. No `POST /auth/refresh` route exists in `auth.routes.js`. The entire dual-token architecture required by Gate-1 #1 is absent.
- **Recommended change:** Add `POST /api/v2/auth/refresh` that accepts a valid refresh token (from HttpOnly cookie on web, expo-secure-store on mobile), issues a new short-lived access token, rotates the refresh token (delete old, issue new), and logs the rotation. Add `refreshToken` field to `UserModel` or a separate `RefreshToken` collection with TTL index.
- **Related:** FLOW-01-F01, FLOW-01-F03

### FLOW-01-F03
- **Title:** Mobile token stored in AsyncStorage — not secure storage
- **Type:** CONFLICT
- **Severity:** Critical
- **File:** `halla-mobile/stores/authStore.js:62`
- **Detail:** `persistAuth` writes `{ user, token, role }` to `AsyncStorage` key `@auth_state`. AsyncStorage is plain-text on rooted/jailbroken devices. Gate-1 Decision #1 mandates expo-secure-store (iOS Keychain / Android Keystore) for long-lived credentials. expo-secure-store is not installed anywhere in `halla-mobile/`.
- **Recommended change:** Install `expo-secure-store`. Store the refresh token (once implemented) exclusively in expo-secure-store. Keep the short-lived access token in Zustand in-memory state (not persisted). On app restart, read the refresh token from secure store and call `/auth/refresh` silently.
- **Related:** FLOW-01-F01, FLOW-01-F02

### FLOW-01-F04
- **Title:** Both `/api/v2` and `/api` prefixes active simultaneously
- **Type:** CONFLICT
- **Severity:** High
- **File:** `labbe-backend-/src/app.js:183`
- **Detail:** `mountRoutes('/api/v2')` and `mountRoutes('/api')` are both called, exposing every endpoint on both prefixes. Gate-1 Decision #2 requires only `/api/v2`. An attacker can reach any endpoint via the unversioned `/api` prefix, bypassing any future rate-limiter or middleware added specifically to `/api/v2`.
- **Recommended change:** Remove the `mountRoutes('/api')` call at `app.js:184`. Update any client code that still calls the unversioned prefix. Add a 410 Gone response at `app.use('/api', ...)` for 30 days to help catch stragglers.
- **Related:** Referenced in FLOW-02, FLOW-05, FLOW-06 findings

### FLOW-01-F05
- **Title:** No server-side token revocation in protect middleware
- **Type:** High
- **Severity:** High
- **File:** `labbe-backend-/src/shared/middleware/auth.js:32`
- **Detail:** `protect` checks signature, `changedPasswordAfter`, and user status — but has no revocation list check. A manually logged-out user (client deletes cookie/token) remains authenticated at the server level until expiry. Under the current 90-day JWT, this is a 90-day window. Even under the target 15-min access token, refresh tokens must be revocable.
- **Recommended change:** After the refresh-token architecture is built, add a `jti` claim to access tokens and maintain a Redis set (or MongoDB TTL collection) of revoked JTIs. Check this set in `protect` after signature verification.
- **Related:** FLOW-01-F01, FLOW-01-F02

### FLOW-01-F06
- **Title:** Two `signToken` implementations with separate secret sources
- **Type:** Medium
- **Severity:** Medium
- **File:** `labbe-backend-/src/shared/middleware/auth.js:171`
- **Detail:** `auth.service.js:45` uses `config.jwt.secret`; the legacy `signToken` in `auth.js:171` reads `process.env.JWT_EXPIRES_IN || '90d'` and `process.env.JWT_SECRET` directly. If the two env-var paths diverge (e.g., `config` overrides vs raw env), tokens signed by one function will be rejected by the other.
- **Recommended change:** Delete the legacy `signToken` from `auth.js`. All token generation must go through `auth.service.js:signToken`.
- **Related:** FLOW-01-F01

### FLOW-01-F07
- **Title:** Account lock duration is 15 min — Gate-1 requires 30 min
- **Type:** CONFLICT
- **Severity:** Medium
- **File:** `labbe-backend-/models/UserModel.js:609`
- **Detail:** `LOCK_TIME = 15 * 60 * 1000` (15 minutes). Peter confirmed 30 minutes. This is also flagged in Flow 05 (login). Additionally, `isLocked()` at line 592 checks both `profile.adminData.lockUntil` and the root `this.lockUntil` — two separate lock paths create a maintenance hazard.
- **Recommended change:** Change `LOCK_TIME` to `30 * 60 * 1000`. Unify the two `lockUntil` paths into a single root-level field.
- **Related:** FLOW-05-F01

---

## Cross-flow notes

- **Flow 02 (signup-host):** `verifySignupOTP` issues a JWT immediately after phone verify. Until that JWT uses a 15-min expiry (FLOW-01-F01), incomplete-profile hosts hold a 90-day credential.
- **Flow 05 (login):** Lock duration CONFLICT (FLOW-01-F07) is the same code change as FLOW-05-F01 — fix in UserModel.js once.
- **Flow 06 (password-reset):** `resetPassword` sets `passwordChangedAt`, which is the only current revocation mechanism. Under Gate-1 dual-token architecture, it must also purge all refresh tokens for the user.
- **Flow 04 (signup-whitelabel):** `setupPassword` issues a JWT via `authService.signToken` — same 90d expiry applies.
