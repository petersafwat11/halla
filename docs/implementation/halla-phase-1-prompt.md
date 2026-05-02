# Halla Implementation — Phase 1: Foundations

> Paste this into a **new** Claude Code session on branch `audit/pre-production` (after Phase 0 has been merged). Phase 1 is the largest phase. It builds the shared utilities and the redesigned auth that every later phase depends on.

## 0. Why this phase exists

Phase 0 closed two security-critical findings. Phase 1 builds the foundations that Phases 2–5 consume. Without these, every later phase would either reinvent the same utility multiple times, or work around the gaps and produce technical debt.

The phase has three sub-phases with stop gates between them. Sub-phase 1b runs five utility builds in parallel via sub-agents.

## 0.5. Naming context

Per the prior naming audit:
- `STAFF` role (in audit docs) ≡ `ENTRANCE_GATE` (in code)
- `staffPortal` page key (audit) ≡ `entranceGate` (code)
- `StaffAccessToken` model name unchanged
- `/staff-portal` URL preserved for backward compatibility

When reading audit references, treat `STAFF` and `ENTRANCE_GATE` as equivalent. None of Phase 1 directly modifies staff/gate code.

## 1. Standing rules for Phase 1 (apply to every sub-phase)

These rules apply to every task in this phase. Treat them as constraints, not suggestions.

### 1.1 Check before you create

**Before building any utility, grep the existing codebase to see what's already there.** New folders or new files duplicating an existing concept are forbidden. Same domain lives in the same folder.

For each new utility:
1. Grep `labbe-backend-/src/` for existing modules in the same domain.
2. Check `labbe-backend-/src/infrastructure/` and `labbe-backend-/src/shared/utils/` first — these are the conventional homes.
3. If something exists: extend it, harden it, or document why it doesn't fit and where the new module will live.
4. If nothing exists: place the new module in the conventional folder for its domain.
5. Document the location decision in the sub-phase's plan file.

### 1.2 Build + wire one consumer

Every utility must be wired to **one real consumer route or function** before its task is considered done. This catches contract bugs at build time. The consumer wiring is part of the utility's task, not deferred.

The "wire one consumer" rule does not mean "wire everywhere" — that's later phases. One real call site is enough to validate the contract.

### 1.3 Clean break, no backward compatibility

No migration windows, no compat shims, no flag toggles. Existing dev sessions will be invalidated when auth changes — that's acceptable per Peter (no real users yet). Existing local-disk uploads are not migrated to S3 — new uploads go to S3, old paths stay where they are. Old test data may need re-creation; document and move on.

### 1.4 Same-host hosting

Backend and frontend are co-located at `halaa.com.sa`. Cookie strategy can use the tightest settings: `SameSite=Strict, Secure, HttpOnly, domain=halaa.com.sa`. CORS is moot for `/auth/refresh` because same-origin.

### 1.5 Smoke tests via Playwright MCP

Every sub-phase's stop gate includes Playwright smoke tests run against the running app, using the seed admin credentials. Tests live under `docs/implementation/phase-1-smoke-tests/` (or wherever existing test conventions put them — apply rule 1.1 to find out). Tests are reusable artifacts, not throwaway.

If a smoke test discovers a regression, it blocks the sub-phase from completing.

### 1.6 Progress files (continuing the convention from Phase 0)

Per sub-phase, three files in `docs/implementation/`:
- `PHASE_1<a|b|c>_PLAN.md` — written at sub-phase start, with concrete file paths and sub-agent assignments.
- `PHASE_1<a|b|c>_PROGRESS.md` — updated continuously.
- `PHASE_1<a|b|c>_REPORT.md` — written at sub-phase end with commits, smoke results, deviations, hand-off notes.

`IMPLEMENTATION_LEDGER.md` is updated at the end of each sub-phase with finding IDs that closed.

### 1.7 Sub-agent parallelism rule (unchanged)

Two sub-agents must never edit the same file. The main session lists each sub-agent's owned files in the plan file before dispatch. Overlap = consolidate into one sub-agent.

### 1.8 Branch strategy

Single branch for the whole phase: `implementation/phase-1-foundations` off `audit/pre-production` (post-Phase-0 merge). All sub-phase commits land here. Stop gates allow Peter to review before the next sub-phase runs, but no new branches.

---

## 2. Sub-phase 1a — Auth redesign

**Goal**: Replace the 90-day JWT model with short-lived access tokens + rotating refresh tokens, server-side revocation, secure storage on mobile, HttpOnly cookies on web. All three platforms migrate together. Clean break — no backward compat for old tokens.

**Findings closed in 1a**:
FLOW-01-F01, FLOW-01-F02, FLOW-01-F03, FLOW-01-F04 (account lockout — wait, that's account lockout, separate; check audit again before assuming), FLOW-05-F02 (session not invalidated on password change), FLOW-06-F03 (password reset token not invalidated after use). Plus any others where the root cause is the auth redesign.

The session must read the audit findings list at the start and produce its own list of which finding IDs it expects to close in 1a. This is part of the plan file.

### 2.1 Concrete auth parameters

- **Access token TTL**: 15 minutes.
- **Refresh token TTL**: 30 days.
- **Refresh rotation**: always rotate. Every refresh request issues a new refresh token AND invalidates the old one. The old token going through twice (replay) means the user is forcibly logged out.
- **Revocation storage**: MongoDB collection with TTL index. Redis is available in config but unused — keep simplicity; we can migrate to Redis later if scale demands.
- **Web refresh cookie**: HttpOnly, Secure, SameSite=Strict, domain=halaa.com.sa, path=/auth/refresh only.
- **Web access token**: HttpOnly cookie, Secure, SameSite=Strict, domain=halaa.com.sa, path=/, 15-minute expiry.
- **Mobile refresh token**: stored in `expo-secure-store` (install package). Never in AsyncStorage.
- **Mobile access token**: in-memory only (Zustand state, not persisted). Re-fetched via /auth/refresh on app launch using the secure-stored refresh token.

### 2.2 Files known to be involved

From audit references:
- Backend: `auth.service.js` (`signToken` at line 45), `auth.controller.js` (`setTokenCookie` lines 23-32, `sendAuthResponse`), `auth.routes.js`, `auth.js` middleware (`protect`, plus the legacy second `signToken` at line 171 — delete this), `UserModel.js` (`changedPasswordAfter`).
- Web: `labbe/stores/authStore.js`, `labbe/services/apiClient` (any 401-retry logic).
- Mobile: `halla-mobile/stores/authStore.js` (`persistAuth` at line 62), `halla-mobile/services/authService.js` (`refreshTokenAPI` is documented as a no-op — replace with real refresh).
- Config: `labbe-backend-/src/config/env.js` — JWT_EXPIRES_IN currently 90d, REFRESH_TOKEN_EXPIRES_IN doesn't exist yet.

The session should read all of these before designing.

### 2.3 Implementation order within 1a

**Backend first** (sequential within itself):
1. New `RefreshToken` model with TTL index, fields: `userId`, `tokenHash`, `expiresAt`, `revokedAt`, `replacedBy`, `userAgent`, `ip` (for audit).
2. Update env config: access TTL 15m, refresh TTL 30d, remove JWT_EXPIRES_IN 90d default.
3. New service methods: `issueTokenPair(user)`, `rotateRefreshToken(oldRefresh)`, `revokeRefreshToken(refresh)`, `revokeAllForUser(userId)`.
4. Replace `signToken` callers with `issueTokenPair`. Delete the legacy `signToken` in `auth.js` middleware.
5. `protect` middleware: verify access token, check expiry, no behavior change beyond TTL.
6. New `/auth/refresh` endpoint: accept refresh token (from cookie on web, body on mobile), validate against `RefreshToken` model, rotate, return new pair.
7. New `/auth/logout` endpoint: revoke current refresh token. Also wire to revoke on password change (FLOW-05-F02) and password reset (FLOW-06-F03).
8. Setup-password flow (whitelabel post-approval) and OTP-verify flow re-issue token pair via the new method.

**Web second** (sequential after backend):
9. Cookie strategy: refresh cookie path-restricted to `/auth/refresh`, access cookie on `/`. Both HttpOnly Secure SameSite=Strict.
10. API client 401 handler: on 401, attempt one refresh via `/auth/refresh`, retry the original request. If refresh fails, redirect to login and clear local state.
11. Logout button calls `/auth/logout` then clears local state.

**Mobile third** (sequential after backend):
12. Install `expo-secure-store` (`npx expo install expo-secure-store`).
13. Replace `persistAuth` AsyncStorage write with: refresh token → SecureStore, access token → in-memory Zustand only. Remove access token from any persisted shape.
14. App launch flow: read refresh from SecureStore, call `/auth/refresh`, populate access token in memory. If refresh fails, send to login.
15. API client 401 handler: same pattern as web — attempt refresh, retry, redirect to login on failure.
16. Logout: call `/auth/logout`, delete SecureStore entry, clear Zustand state.

### 2.4 Smoke tests for 1a (Playwright + manual mobile)

Live tests using seed admin credentials:
1. **Login → access token works** — Login as seed ADMIN, hit a protected admin endpoint, expect 200.
2. **Access token expiry** — Wait 16 minutes (or fast-forward via test config), hit protected endpoint, expect 401.
3. **Refresh works** — From the 401 state, frontend silently refreshes, retries, succeeds. End user never sees the 401.
4. **Refresh rotation** — Capture old refresh token. Use it once (succeeds). Use it again (expect rejection). Confirm the second use revokes the user's session entirely (security: replay = logout).
5. **Logout** — Logout clears cookies/SecureStore and revokes refresh on backend. Subsequent refresh attempt fails.
6. **Password change invalidates sessions** — Change password, confirm previous refresh tokens are revoked.
7. **Password reset invalidates sessions** — Reset password, same expectation.
8. **Mobile launch with valid refresh** — Cold launch, refresh token in SecureStore, app silently authenticates, lands on dashboard.
9. **Mobile launch with invalid/expired refresh** — Cold launch with no/expired refresh, app routes to login.
10. **Cross-platform** — Login on web, log out on mobile (using same account). Web's access token still works for 15 min (separate access tokens), but refresh on web after 15 min must succeed via web's cookie. Confirm logout doesn't affect the other platform's session.

Write these as Playwright specs (web + backend tests) and a manual checklist for mobile (Playwright doesn't cover React Native cleanly). The mobile checklist is run by Peter post-merge or by the session if Expo's dev tools are accessible.

### 2.5 Sub-agent parallelism for 1a

Auth is largely sequential because each layer depends on the one below. Three sub-agents make sense if you want parallelism on smoke tests:

- Main session: backend implementation (steps 1–8). Sequential.
- After backend lands: Sub-agent A handles web (steps 9–11). Sub-agent B handles mobile (steps 12–16). Independent files, parallel-safe.
- After both land: Sub-agent C writes Playwright smoke tests.

If solo-sequential is preferred, single-thread the whole sub-phase. Either is fine; document the choice in the plan file.

### 2.6 Stop gate for 1a

```
STOP — Sub-phase 1a (Auth redesign) complete

Findings closed: <list with commit SHAs>
Smoke tests: <pass count>/<total>, with any failures explained
Files modified: <list>
Open items for 1b/1c: <if any cross-cutting issue>
```

Peter reviews before 1b begins.

---

## 3. Sub-phase 1b — Five utilities in parallel

**Goal**: Build the five remaining foundation utilities. Five sub-agents, five different module trees, zero file overlap.

Per rule 1.1, each starts with a grep pass to confirm what exists.

### 3.1 Idempotency utility

**Per rule 1.1**: grep for any existing idempotency-related code. Likely none, but check `src/infrastructure/`, `src/shared/utils/`, and any middleware named `idempot*`. If nothing exists, place new module in `src/shared/utils/idempotency.js` (or wherever existing utility patterns suggest).

Build:
- `IdempotencyKey` MongoDB model: `key` (unique index), `requestHash`, `response`, `createdAt` (TTL index — 24h is plenty for at-most-once external calls).
- Middleware that accepts an `Idempotency-Key` header on POST/PUT/PATCH routes. If key exists, return cached response. If not, run the handler, cache response, return.
- Service helper for non-HTTP idempotency (e.g. cron jobs sending Taqnyat messages): `withIdempotency(key, fn)`.

Wire one consumer (per rule 1.2): pick one existing route — a payment-adjacent one would be ideal but any POST that produces an external side effect works. Document which route was wired.

Smoke test: Playwright spec that POSTs the same idempotency key twice, expects identical response and only one underlying side effect.

### 3.2 S3 utility — verify existing first

**Per rule 1.1**: an S3 utility likely exists. The audit (FLOW-25-F05) explicitly says "service image falls back to local filesystem when S3 upload fails," which means S3 code exists somewhere. Find it.

Search order:
1. `labbe-backend-/src/infrastructure/` — most likely home.
2. `labbe-backend-/src/shared/utils/` — secondary.
3. Grep for `aws-sdk`, `s3.upload`, `S3Client`, `multer-s3`.

Once found, audit it:
- Does it fail open (write to local on S3 error)? That's the bug to fix.
- Are credentials read from env? Confirm config is sane.
- Does the upload return a public URL or a key? Standardize.
- Are file types and sizes validated?

Harden:
- Fail closed on S3 error — return a real error to the caller, do NOT fallback to local. Caller decides retry strategy.
- Standard interface: `uploadFile({ buffer, mimeType, folder, allowedTypes, maxSize }) → { url, key, size }`.
- Allowed types and max sizes per upload domain (vendor portfolio, profile avatar, service image, post-event content).

**Do not migrate existing local files.** Clean break. New uploads go to S3, old paths stay where they are. Document the dead-link risk in the report.

Wire one consumer: pick one upload path (vendor portfolio is fine — see flow 03), replace the existing direct multer-disk write with the hardened utility.

Smoke test: upload via the wired route, confirm S3 URL returned, confirm file accessible at the URL, confirm S3-error case returns a real error to the caller.

### 3.3 Audit log middleware

**Per rule 1.1**: `AuditLogModel` exists per the audit notes ("model exists but is never written to"). Check `labbe-backend-/models/AuditLogModel.js`. Confirm schema fields. Don't redesign the model unless something is clearly broken.

Build:
- Express middleware `auditLog(action, getResourceFn)` that writes an entry after a successful response. Schema fields: `actorUserId`, `actorRole`, `action`, `resourceType`, `resourceId`, `whitelabelId` (for tenant scoping), `previousValue`, `newValue`, `requestId`, `ip`, `userAgent`, `timestamp`. (Verify against existing model, adapt as needed.)
- Service helper `logAudit(...)` for non-HTTP paths (cron jobs, webhook handlers).

Wire one consumer: pick one admin write route — `PATCH /admin/vendors/:id/status` is a good candidate (vendor approve/reject). Add `auditLog('vendor_status_change')` middleware. Confirm an entry appears in `AuditLogModel` after a status change.

Smoke test: trigger the wired route via Playwright, query AuditLogModel, confirm entry exists with correct fields.

### 3.4 Timezone utility

**Per rule 1.1**: grep for existing timezone helpers. `date-fns-tz`, `moment-timezone`, custom date utils. Likely none — the bug (PIPELINE-F05) suggests no utility exists. Confirm via grep.

Build:
- Standard convention: **all timestamps stored as UTC ISO strings in MongoDB.** Backend never depends on server local time. Date math (cron firing time, "is event in the past") happens in UTC.
- Frontend converts UTC to user's local timezone at display time only. Backend returns UTC timestamps; frontend formats.
- Utility module exposes:
  - `nowUtc()` — current time as UTC ISO string.
  - `parseEventTime(eventDoc) → Date` — given an event with `scheduledDate` and `scheduledTime` and (if present) `timezone`, return a UTC Date for cron comparison.
  - For frontend (web + mobile): `formatInUserTimezone(utcIsoString, userTz, formatString)`.

The launch cron (PIPELINE-F05) bug: the existing cron uses `now.getHours()` to compare against `event.scheduledTime`. The fix is to convert the event's scheduled time to UTC, then compare against `Date.now()` directly. Fix the cron as part of this utility's "wire one consumer" — the cron is the consumer.

Wire one consumer: the launch cron (`scheduleEventLaunch` in `scheduledTasks.js`). Replace the local-time comparison with UTC-based comparison using the new utility.

Smoke test: set a fake event with `scheduledDate` for today and `scheduledTime` that's 3 hours in the past in Asia/Riyadh time. Run the cron tick. Confirm: if server is UTC and event time was 3h ago Riyadh time (i.e. 6h ago UTC), event should fire. If event time was 1h ago Riyadh time (4h ago UTC) and the cron has a 5h window, fire. Etc. The point: server timezone shouldn't matter.

### 3.5 Payment scaffold (Moyasar)

**Per rule 1.1**: grep for any existing payment-related modules. None expected, but check `src/infrastructure/`, `src/modules/payments`, `src/modules/subscriptions/`. If `subscriptions` already has any payment-call code, harden in place rather than creating a new folder.

Build:
- `paymentProvider.js` interface module with `charge(amount, currency, customer, metadata) → { success, transactionId, error }`.
- Two implementations:
  - `moyasarProvider`: real Moyasar API calls when `MOYASAR_API_KEY` is set.
  - `stubProvider`: returns `{ success: true, transactionId: 'stub-' + nanoid() }` when `MOYASAR_API_KEY` is absent.
- A factory at boot that chooses based on env. Logs which provider is active at startup.
- Idempotency: every charge call carries an idempotency key derived from caller-provided context (e.g. subscription ID + plan code + attempt timestamp). Use the idempotency utility from 3.1 — declares cross-utility wiring.

Wire one consumer: subscription creation (`POST /subscriptions/subscribe`). Currently creates subscription with no payment call. Add a `paymentProvider.charge(...)` call before subscription save, gate save on success. In stub mode (no Moyasar key), this returns success and subscription saves as today's behavior. When real keys are added, this becomes a real charge.

Smoke test: subscribe to a plan via the seed admin, confirm log line shows `stubProvider used, MOYASAR_API_KEY absent`. Confirm subscription saved. Then set a fake `MOYASAR_API_KEY` and confirm the factory picks `moyasarProvider` (which will fail to call the real API in dev — that's expected; just verify the factory logic).

### 3.6 Sub-agent parallelism for 1b

Five sub-agents, five owned-file lists, zero overlap:

- **Sub-agent A** — Idempotency: `src/shared/utils/idempotency.js` (or wherever 1.1 grep places it), `models/IdempotencyKeyModel.js`, the one wired route's controller.
- **Sub-agent B** — S3: existing S3 utility location (post-grep), `src/infrastructure/<existing>`, the one wired upload route.
- **Sub-agent C** — Audit log: existing `AuditLogModel.js`, `src/shared/middleware/auditLog.js` (or extension of existing), the one wired admin route.
- **Sub-agent D** — Timezone: `src/shared/utils/timezone.js`, plus the launch cron in `scheduledTasks.js`.
- **Sub-agent E** — Payment scaffold: `src/infrastructure/paymentProvider.js` (post-grep), plus the subscription creation service to wire it.

Cross-utility dependency: payment scaffold (3.5) uses idempotency utility (3.1). Sub-agent E must wait for sub-agent A's utility to land before wiring its consumer. Sub-agent E can build the provider modules in parallel; only the wiring step is sequential.

The main session orchestrates: dispatches A, B, C, D in parallel; after A lands, dispatches E.

### 3.7 Smoke tests for 1b

Each utility's smoke test runs independently. Playwright specs under `docs/implementation/phase-1-smoke-tests/` (or wherever 1.1 grep finds existing tests). Five specs minimum.

### 3.8 Stop gate for 1b

```
STOP — Sub-phase 1b (Five utilities) complete

Per utility:
  - Idempotency: built at <path>, wired at <route>, smoke <pass/fail>
  - S3: existing utility at <path>, hardened, wired at <route>, smoke <pass/fail>
  - Audit log: existing model at <path>, middleware at <path>, wired at <route>, smoke <pass/fail>
  - Timezone: built at <path>, wired in cron, smoke <pass/fail>
  - Payment scaffold: built at <path>, wired in subscription, smoke <pass/fail>

Findings closed: <list>
Findings partially closed (utility built but only one consumer wired): <list>
Open items for 1c or later phases: <list>
```

Peter reviews before 1c begins.

---

## 4. Sub-phase 1c — Drop `/api` non-versioned mount

**Goal**: Remove the `/api` mount that duplicates `/api/v2`. Findings: FLOW-01-F05 (or whichever ID corresponds to the dual-mount issue per the latest ledger).

### 4.1 Steps

1. Grep across all three repos (`labbe-backend-/`, `labbe/`, `halla-mobile/`) for any URL containing `/api/` not followed by `v2/`. Also check string concatenations like `${API_BASE}/auth` where `API_BASE` might point to `/api`.
2. Document any callers found. If any of our own code uses unversioned `/api`, fix them first.
3. After confirming zero internal callers (or all fixed), remove the `mountRoutes('/api')` line in `labbe-backend-/src/app.js` (around line 184 per audit references).
4. Add a 30-day grace period: keep `app.use('/api', ...)` returning 410 Gone with a clear error message pointing to `/api/v2`. After 30 days (post-launch), remove this stub too.

### 4.2 Smoke test

Playwright spec: hit `/api/auth/login` (no v2). Expect 410 Gone. Hit `/api/v2/auth/login`. Expect 200/4xx based on credentials but route is reachable.

### 4.3 Stop gate for 1c

```
STOP — Sub-phase 1c (/api mount removed) complete

Internal callers of unversioned /api: <count, with file:line>
Fixes applied: <list>
Mount removed: yes
410 Gone stub in place: yes
Smoke test: <pass/fail>
```

---

## 5. Phase 1 final stop gate

After all three sub-phases land:

```
STOP — Phase 1 complete

Sub-phases: 1a, 1b, 1c all complete.

Total findings closed in Phase 1: <N>
- Critical: <N>
- High: <N>
- Medium: <N>

Foundations built (one-consumer-wired):
- Auth redesign (full migration)
- Idempotency utility
- S3 utility (hardened existing)
- Audit log middleware (existing model wired)
- Timezone utility
- Payment scaffold (Moyasar stub + real)

Branch ready to merge: implementation/phase-1-foundations into audit/pre-production: yes/no
Reason if no: <which sub-phase failed and why>

Smoke tests: <total pass>/<total>
Playwright specs added: <list of spec paths>

Items handed off to Phase 2:
- <foundations are built but not yet consumed by every relevant flow — Phase 2 onwards wires them>
- <any specific known regressions or follow-ups>

Anomalies:
- <anything noteworthy that wasn't in the plan>
```

Peter merges Phase 1 into `audit/pre-production`. Phase 2 prompt is written next, calibrated against what we learned.

---

## 6. Process

1. Read this entire prompt.
2. Read `docs/implementation/MASTER_PLAN.md`, `docs/audit/FINDINGS_SUMMARY.md`, and `docs/implementation/IMPLEMENTATION_LEDGER.md`.
3. Confirm branch is `audit/pre-production` (post-Phase-0 merge), and create `implementation/phase-1-foundations` from it.
4. Begin sub-phase 1a. Apply rule 1.1 grep before any new files. Update `PHASE_1a_PLAN.md` with discovered file locations.
5. Run 1a end-to-end including smoke tests. Stop gate. Wait for Peter.
6. After Peter approval, run 1b. Five sub-agents per section 3.6. Each applies rule 1.1.
7. After 1b stop gate, run 1c.
8. Output final Phase 1 stop gate.

Begin.
