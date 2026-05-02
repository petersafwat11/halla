# Phase 1a — Auth smoke tests

These are runnable curl scripts (not Playwright). The harness this session runs in does not have a live backend, so the tests below are documented end-to-end checks that a developer / CI can execute against `npm run dev` in `labbe-backend-/`. Each section asserts contract + behaviour.

## Setup

```bash
export API=http://localhost:8000/api/v2
export EMAIL=admin@example.com
export PASSWORD=ChangeMe!1
```

Use a cookie jar so the HttpOnly cookies persist between calls:

```bash
COOKIE=/tmp/halla-smoke-cookies.txt; rm -f $COOKIE
```

---

## 1. Login → access cookie + refresh cookie issued

```bash
curl -sS -c $COOKIE -b $COOKIE \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  $API/auth/login
```

Expected:
- `200`, JSON body with `token`, `refreshToken`, `data.user`.
- Cookie jar contains `access_token` (Path=/, ~15 min) and `refresh_token` (Path=/api/v2/auth/refresh, 30 days).

## 2. Authenticated GET works

```bash
curl -sS -b $COOKIE $API/auth/me
```

Expected `200` and the same user object.

## 3. Manual rotation

```bash
curl -sS -c $COOKIE -b $COOKIE -X POST $API/auth/refresh
```

Expected:
- `200`, new `token` and new `refreshToken` in body.
- The old `refresh_token` cookie value is replaced in the jar.

## 4. Replay attack (reuse old refresh)

Capture an old token, rotate, then try the old token again:

```bash
OLD=$(curl -sS -c $COOKIE -b $COOKIE \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" $API/auth/login | jq -r .refreshToken)

curl -sS -X POST -H 'Content-Type: application/json' \
  -d "{\"refreshToken\":\"$OLD\"}" $API/auth/refresh    # 200, rotated

curl -sS -X POST -H 'Content-Type: application/json' \
  -d "{\"refreshToken\":\"$OLD\"}" $API/auth/refresh    # 401 — replay

curl -sS -b $COOKIE $API/auth/me                        # 401 — chain revoked
```

Expected: replay produces 401 *and* invalidates the entire user's refresh chain (the second `me` call also fails because the user's other refresh tokens were revoked).

## 5. Logout revokes the active refresh token

```bash
curl -sS -c $COOKIE -b $COOKIE -X POST $API/auth/logout
curl -sS -X POST -H 'Content-Type: application/json' \
  -d "{\"refreshToken\":\"$(grep refresh_token $COOKIE | awk '{print $7}')\"}" $API/auth/refresh
```

Expected: second call returns 401.

## 6. Password reset clears lockout (FLOW-06-F02) and revokes sessions

1. Trigger 5 failed logins to lock the account.
2. Call `/auth/forgot-password`, click the email link, submit a new password via `PATCH /auth/reset-password/:token`.
3. Login immediately — expect 200 (lock cleared).
4. The refresh token captured in step (1) — if any — should now return 401 on `/auth/refresh` (sessions revoked).

## 7. Mobile contract check

```bash
# Login: refresh token must come back in JSON body so React Native can store it
curl -sS -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" $API/auth/login | jq '.refreshToken,.token' | grep -v null

# Refresh via body (no cookie jar): mirrors mobile behaviour
RT=$(curl -sS -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" $API/auth/login | jq -r .refreshToken)
curl -sS -X POST -H 'Content-Type: application/json' \
  -d "{\"refreshToken\":\"$RT\"}" $API/auth/refresh | jq '.token,.refreshToken' | grep -v null
```

Both must be non-null strings.

## 8. Lockout duration is 30 minutes (FLOW-01-F07 / FLOW-05-F01)

After triggering a lock, the error response should report ~30 remaining minutes (was ~15). Verified by reading the `lockUntil` field on the user document in MongoDB or by capturing the `AccountLockedError` message.

## 9. Web silent refresh (browser test)

1. Login on `http://localhost:3000` (web).
2. Open DevTools → Application → Cookies. Confirm `access_token` and `refresh_token` are present, `HttpOnly` and `Secure` flags.
3. In DevTools → Application → Cookies, manually delete `access_token`.
4. Click any UI control that calls a protected API.
5. Network tab should show: original request → 401 → `POST /api/v2/auth/refresh` → 200 → original request retried → 200.
6. `access_token` is back in the jar.

## 10. Mobile cold launch (Expo)

1. After login, kill the app.
2. Restart. The store calls `restoreSession()` → `POST /auth/refresh` with the secure-stored refresh token → 200 → user lands on dashboard.
3. Manually wipe SecureStore (`SecureStore.deleteItemAsync('halla.refreshToken')`), restart → user lands on login.

---

These ten checks cover every Phase 1a finding. Failure of any blocks the merge.
