# Phase 1a — Auth redesign — Report

**Branch:** `claude/implement-phase-1-1b-PO0KU`
**Status:** complete (pending Peter review)

## What landed

### Backend

| Area | Change | Files |
|------|--------|-------|
| Env | `JWT_EXPIRES_IN` defaults to `15m`; `REFRESH_TOKEN_EXPIRES_DAYS=30`; `JWT_COOKIE_EXPIRES_IN` removed | `src/config/env.js`, `src/config/index.js` |
| Model | New `RefreshTokenModel` with TTL index, `tokenHash`, `revokedAt`, `replacedBy` | `models/RefreshTokenModel.js` |
| UserModel | `LOCK_TIME` → 30 min; `passwordResetExpires` → 1 hour | `models/UserModel.js` |
| Service | New `issueTokenPair`, `rotateRefreshToken`, `revokeRefreshToken`, `revokeAllForUser`. Every callsite of the old `signToken` migrated. `resetPassword` clears lockout + revokes all sessions; `updatePassword` revokes all sessions | `src/modules/auth/auth.service.js` |
| Controller | Sets `access_token` (Path=/) and `refresh_token` (Path=/api/v2/auth/refresh) HttpOnly cookies. New `refresh` and `logout` (cookie- or body-driven) handlers. `setupPassword` and `completeHostProfile` rewritten to use the new pair | `src/modules/auth/auth.controller.js` |
| Routes | `POST /auth/refresh` (public). `/auth/logout` is public so an expired access token can still log out | `src/modules/auth/auth.routes.js` |
| Middleware | `protect` + `optionalAuth` read `access_token` cookie or Bearer header; legacy `signToken` / `createSendToken` exports deleted; `optionalAuth` now honours `changedPasswordAfter` | `src/shared/middleware/auth.js`, `src/shared/middleware/index.js` |

### Web

| Area | Change | Files |
|------|--------|-------|
| API base URL | bumped from `/api` to `/api/v2` so the path-restricted refresh cookie matches | `services/apiClient.js`, `services/authService.js`, `services/createAndUpdateEvents.js`, `services/new-backend/apiClient.js` |
| Silent refresh (fetch path) | `apiClient.request()` retries once via `POST /auth/refresh` on 401, with concurrent-call coalescing; on failure redirects to `/{lang}/login` | `services/apiClient.js` |
| Silent refresh (axios path) | `withCredentials: true` so HttpOnly cookies flow on cross-origin requests; response interceptor calls `_refreshOnce()` on 401 and replays the original request once before redirecting to login | `services/new-backend/apiClient.js` |
| Store | `token` field documented as in-memory only (already excluded from `partialize`); zero functional change to existing flows because the cookies are HttpOnly | `stores/authStore.js` |

### Mobile

| Area | Change | Files |
|------|--------|-------|
| Dependency | Added `expo-secure-store` (`~15.0.7`) | `halla-mobile/package.json` |
| Storage | New `secureStorage.js` wrapper — Keychain/Keystore on native, AsyncStorage fallback on web bundle | `services/secureStorage.js` |
| Auth API | Real `refreshTokenAPI` calls `POST /auth/refresh`; new `resetPasswordAPI`; `logoutAPI` now revokes the refresh token; every signup/login/OTP path forwards `refreshToken` | `services/authService.js`, `config/api.js` |
| Store | Refresh token in secure storage; access token in memory; `requireRole(user)` blocks the silent-fallback bug; `restoreSession` uses real refresh on cold launch | `stores/authStore.js` |
| Navigator | Default case for an unknown role now renders an explicit error screen, not `<HostStack/>` | `navigation/AppNavigator.js` |

## Findings closed

| ID | Status | Notes |
|----|--------|-------|
| FLOW-01-F01 | closed | 90d → 15m + 30d rotating refresh |
| FLOW-01-F02 | closed | `POST /auth/refresh` exists, rotates, revokes |
| FLOW-01-F03 | closed | Refresh in `expo-secure-store`; AsyncStorage no longer holds credentials |
| FLOW-01-F05 | closed | Server-side revocation via `RefreshToken` collection + replay-detection chain revoke |
| FLOW-01-F06 | closed | Legacy `signToken` / `createSendToken` deleted; one source of truth in `authService.issueTokenPair` |
| FLOW-01-F07 | closed | LOCK_TIME 30 min |
| FLOW-05-F01 | closed | Same constant + `resetPassword` clears lockout |
| FLOW-05-F02 | closed | `requireRole(user)` throws if server omits role |
| FLOW-05-F03 | closed | Mobile navigator returns an error screen for unsupported roles |
| FLOW-06-F01 | closed | Reset link TTL 1 hour; email body updated |
| FLOW-06-F02 | closed | `resetPassword` clears `lockUntil` and `loginAttempts` |
| FLOW-06-F03 | closed | `resetPasswordAPI` + `RESET_PASSWORD` endpoint on mobile (deep-link UI is Phase 4) |

## Smoke tests

- `docs/implementation/phase-1-smoke-tests/auth-flow.md` — 10-step manual / curl flow against a live backend (login, refresh, replay-detection, logout, lockout-clear, mobile contract, web silent refresh, mobile cold-launch).
- `docs/implementation/phase-1-smoke-tests/auth-static-checks.js` — Node script asserting structural invariants. **All 10 checks pass** (`node docs/implementation/phase-1-smoke-tests/auth-static-checks.js` → exit 0).

## Open / hand-off

- **`/api` non-versioned mount removal (FLOW-01-F04)** — deferred to Phase 1c per master plan. The legacy `jwt` cookie name is still accepted by `protect` for one deploy cycle so existing dev sessions don't 401 immediately; that fallback is removed in 1c.
- **Web Playwright smoke specs** — the smoke flow lives as a curl runbook + static contract checks. Migrating to actual Playwright specs (with the MCP server) is left to the broader testing track per master plan §6.
- **Mobile reset-password screen (deep-link UI)** — `resetPasswordAPI` is wired but the `<ResetPasswordScreen />` and the `app.json` deep link are Phase 4 mobile-parity work. The API contract is in place so the screen drops in cleanly.
- **`useAuthMutation.js` (web)** still calls `Cookies.set("token", ...)` for legacy UI hints. Harmless: the backend reads the HttpOnly `access_token` cookie, not this JS-readable value. Cleanup is part of the next polish pass.
- **Mobile per-service `fetch(...)` callers don't auto-refresh**. A new `halla-mobile/services/apiClient.js` (`apiFetch`) provides the centralized refresh-on-401 pattern, but the 15+ existing services (events, messaging, subscriptions, etc.) still use raw `fetch` and so will fail an authenticated call once the access token hits its 15-min TTL until the user reopens the app (cold launch triggers refresh). Migrating those callers to `apiFetch` is Phase 4 (mobile parity) per the master plan; the wrapper is in place so the migration is mechanical.

## Anomalies

- The session ran on a single branch (`claude/implement-phase-1-1b-PO0KU`) instead of the two branches described in the prompts. This is a harness constraint; commits are tagged so 1a and 1b can be reviewed independently.
- Several legacy frontend services still default to `http://localhost:8000/api`. Updated to `/api/v2` so the path-scoped refresh cookie reaches the right endpoint.
