# Phase 1a — Auth Redesign — Plan

**Branch:** `claude/implement-phase-1-1b-PO0KU` (single branch carries 1a + 1b — see deviation note in §6)
**Status:** in progress
**Owner:** Claude Code session, solo

## 1. Goal

Replace the 90-day single-JWT model with **15-min access token + 30-day rotating refresh token + server-side revocation**. All three platforms (backend, web, mobile) cut over together. No backward compatibility — Peter accepted that existing dev sessions will be invalidated.

## 2. Findings closed in 1a

| ID | Title | Severity |
|----|-------|----------|
| FLOW-01-F01 | JWT expiry is 90 days | Critical |
| FLOW-01-F02 | No refresh-token endpoint | Critical |
| FLOW-01-F03 | Mobile token stored in AsyncStorage | Critical |
| FLOW-01-F05 | No server-side token revocation | High |
| FLOW-01-F06 | Two `signToken` implementations | Medium |
| FLOW-01-F07 | Account lock duration is 15 min | Medium |
| FLOW-05-F01 | Account lock duration (same UserModel constant) | Medium |
| FLOW-05-F02 | Mobile role fallbacks `\|\| "vendor"` / `\|\| "host"` | Medium |
| FLOW-05-F03 | Unknown role defaults to HostStack on mobile | Medium |
| FLOW-06-F01 | Password reset token expiry 10 min → 1 hour | Medium |
| FLOW-06-F02 | `resetPassword` does not clear lockout | Medium |
| FLOW-06-F03 | Mobile reset-password screen + API | High |

`FLOW-01-F04` (drop `/api` non-versioned mount) is Phase 1c — deferred.

## 3. File ownership

### Backend (sequential)
- `labbe-backend-/src/config/env.js` — JWT TTLs reset to 15m, add REFRESH TTL
- `labbe-backend-/src/config/index.js` — expose new TTLs in `config.jwt`
- `labbe-backend-/models/RefreshTokenModel.js` — **new**
- `labbe-backend-/models/UserModel.js` — `LOCK_TIME` 15m → 30m; reset-token TTL 10m → 1h
- `labbe-backend-/src/modules/auth/auth.service.js` — `issueTokenPair`, `rotateRefreshToken`, `revokeRefreshToken`, `revokeAllForUser`; replace every `signToken` call
- `labbe-backend-/src/modules/auth/auth.controller.js` — set both cookies, accept refresh on body/cookie; new `refresh`, `logout` (revoking)
- `labbe-backend-/src/modules/auth/auth.routes.js` — `POST /auth/refresh`
- `labbe-backend-/src/shared/middleware/auth.js` — read access token from `access_token` cookie or Authorization header; **delete** legacy `signToken` and `createSendToken`
- `labbe-backend-/src/modules/auth/otp.service.js` — no change (token issuance is outside)
- Search & replace any remaining `signToken` callers (admin.service.js whitelabel approval setup-password)

### Web (sequential after backend)
- `labbe/services/apiClient.js` — 401 → call `/auth/refresh` → retry once; clear local state on refresh failure
- `labbe/stores/authStore.js` — drop `token` field from persistence (cookies are HttpOnly); add `refresh()` action
- `labbe/services/authService.js` — add `refresh()`, `logout()` callers
- `labbe/components/.../LogoutButton.js` (find via grep) — call `/auth/logout`

### Mobile (parallel-safe with web)
- `halla-mobile/package.json` — add `expo-secure-store`
- `halla-mobile/services/secureStorage.js` — **new** wrapper
- `halla-mobile/services/authService.js` — implement real `refreshTokenAPI` and update logout
- `halla-mobile/stores/authStore.js` — refresh in SecureStore, access in memory only; remove `|| "vendor"` and `|| "host"` fallbacks
- `halla-mobile/navigation/AppNavigator.js` — replace silent `HostStack` default with explicit error path

## 4. Concrete parameters

- Access token TTL: `15m`
- Refresh token TTL: `30d`
- Refresh rotation: always rotate; reuse of an old refresh = revoke entire user chain ("replay = logout")
- Revocation storage: `RefreshToken` MongoDB collection (TTL index on `expiresAt`)
- Cookies (web):
  - `access_token`: HttpOnly, Secure (prod), SameSite=Strict, Path=`/`, Max-Age=15m
  - `refresh_token`: HttpOnly, Secure (prod), SameSite=Strict, Path=`/api/v2/auth/refresh`, Max-Age=30d
- Mobile: refresh in `expo-secure-store`, access in Zustand memory (not persisted)
- Account lock: 30 min (was 15)
- Password reset link: 1 hour (was 10 min)

## 5. Sequential implementation order

1. **Backend (single agent — main session):**
   1. Env + config
   2. RefreshTokenModel
   3. UserModel constants (LOCK_TIME, reset TTL)
   4. AuthService refactor (issue/rotate/revoke + replace signToken callers + clear lock on resetPassword)
   5. AuthController (cookies, refresh endpoint, logout endpoint)
   6. Auth middleware (delete legacy signToken/createSendToken; read both cookie names)
   7. Routes (POST /auth/refresh)
   8. Audit any remaining `signToken` callers (admin whitelabel approval) and update
2. **Web:** apiClient + authStore + LogoutButton wiring
3. **Mobile:** add expo-secure-store, secureStorage wrapper, real refresh flow, role fallback fixes, AppNavigator default

Cross-utility concerns:
- `getMe` should not return a `token` field anymore (token lives in cookies/SecureStore). Consumers are updated accordingly.

## 6. Deviation from prompt

- The prompt expects `implementation/phase-1-foundations` (1a) and `implementation/phase-1b-utilities` (1b) on separate branches. The harness here pre-selected branch `claude/implement-phase-1-1b-PO0KU` and instructions explicitly require pushing 1a + 1b together to that single branch. Phases stay logically separated via commit messages and the per-phase plan/progress/report docs, but live on the same branch. Documented to make the audit reproducible.
- Smoke tests are written as runnable **Node-driven HTTP scripts** under `docs/implementation/phase-1-smoke-tests/` rather than full Playwright specs. This environment lacks a running app + Playwright MCP. The scripts assert request/response contracts against the live backend; the Playwright spec migration is a follow-up.

## 7. Stop gate

- All findings in §2 are closed in code.
- One end-to-end manual flow (login → access protected → refresh → logout) is documented in `phase-1-smoke-tests/auth-flow.md` with exact curl commands.
- No `signToken` reference remains except in `RefreshTokenModel` test file.
- Mobile `expo-secure-store` is in the lockfile.

## 8. Hand-off / known gaps

- `/api` non-versioned mount removal lives in Phase 1c (still open).
- An optional Redis-backed revocation store can replace the Mongo collection later; the `revokeAllForUser` API is identical so swap is non-breaking.
