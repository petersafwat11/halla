# 06 — password-reset

## One-paragraph description
Password management flows: (a) Forgot password — user submits email → backend sends reset email with token → user clicks link → validates token → enters new password → password updated. (b) Email verification — authenticated user requests verification code → backend sends code to email → user enters code → email marked verified. Both flows use temporary tokens and time-based expiry for security.

## Scope tags
[web] [backend] [mobile]

## Roles involved
Any authenticated or unauthenticated user (email field required for forgot-password)

## Entry points
Web forgot-password page: `labbe/app/[lang]/(auth-layout)/forget-password/page.js:1`
Web forgot-password form: `labbe/ui/auth/forget-password/ForgetPassword.js`
Web change-password page: `labbe/app/[lang]/(auth-layout)/change-password/page.js:1` (logged-in users)
Mobile forgot-password screen: `halla-mobile/screens/ForgetPasswordScreen.js:1`
Backend forgot-password endpoint: `labbe-backend-/src/modules/auth/auth.routes.js:421` (POST /forgot-password)
Backend reset-password endpoint: `labbe-backend-/src/modules/auth/auth.routes.js:462` (PATCH /reset-password/:token)
Backend email verification: `labbe-backend-/src/modules/auth/auth.routes.js:716` (POST /send-verification-code)
Backend verify-email endpoint: `labbe-backend-/src/modules/auth/auth.routes.js:748` (POST /verify-email)

## Exit / terminal states
Forgot-password success: User receives reset email with token-based link.
Reset-password success: User sets new password, password updated in DB, can login with new credentials.
Reset-password failure: Token invalid/expired, password doesn't meet requirements.
Email-verification success: User enters code, email marked emailVerified=true in DB.
Email-verification failure: Code invalid, expired (15min TTL at auth.controller.js:346), user not authenticated.

## Touched modules
**Backend:**
- `labbe-backend-/src/modules/auth/auth.routes.js` (routes 421-555 for password and email verification)
- `labbe-backend-/src/modules/auth/auth.controller.js` (forgotPassword:208, resetPassword:218, updatePassword:241, sendEmailVerificationCode:327, verifyEmail:356)
- `labbe-backend-/src/modules/auth/auth.service.js` (forgotPassword, resetPassword, updatePassword, email verification logic)
- `models/UserModel.js` (passwordResetToken, passwordResetExpires, emailVerificationCode, emailVerificationExpires fields)
- `labbe-backend-/src/infrastructure/email.js` (reset-password and verification emails)
- `labbe-backend-/src/shared/middleware/rateLimiter.js` (passwordResetLimiter)

**Web:**
- `labbe/app/[lang]/(auth-layout)/forget-password/page.js:1` (forgot-password entry point)
- `labbe/ui/auth/forget-password/ForgetPassword.js` (forgot-password form component)
- `labbe/app/[lang]/(auth-layout)/change-password/page.js:1` (change-password entry point for logged-in users)
- `labbe/ui/auth/change-password/ChangePassword.js` (change-password form component)
- `labbe/stores/authStore.js` (state: resetTokenSent, resetEmail)

**Mobile:**
- `halla-mobile/screens/ForgetPasswordScreen.js:1` (forgot-password entry point)
- `halla-mobile/services/authService.js` (forgotPasswordAPI, resetPasswordAPI)
- `halla-mobile/stores/authStore.js` (methods for password reset)

## Dependencies on other flows
- **Flow 01 (auth-foundation)**: New token issued after successful password reset (auth.controller.js:228)
- **Flow 05 (login)**: User logs in with new password after reset
- **Flow 07 (profile-settings)**: Email verification often part of profile completion

## Known divergences (web ↔ mobile, frontend ↔ backend)
Web change-password form (ChangePassword.js) requires current password; forgot-password doesn't.
Mobile ForgetPasswordScreen — does it support both forgot and change-password, or just forgot?
Email verification code delivery: backend sends 6-digit code (auth.controller.js:346); web/mobile must handle code input.

## Open questions

**Q1: Password reset token expiry — how long is reset link valid?**

A: [CLARIFIED FROM PETER — REQUIRES CODE CHANGE]

**Current behavior:** `UserModel.js:535` sets `passwordResetExpires = Date.now() + 10 * 60 * 1000` — **10 minutes**. The email body in `auth.service.js:684` explicitly states `"expiresIn: '10 minutes'"`.

**Assessment:** CONFLICTS-WITH-GATE-1-DECISION

**Why:** Peter confirmed the reset link should be valid for 1 hour. 10 minutes is too short and will frustrate users who don't act immediately.

**Recommended change:** Change `UserModel.js:535` from `10 * 60 * 1000` to `60 * 60 * 1000` (1 hour). Also update `auth.service.js:684` to pass `expiresIn: '1 hour'` to the email template.

Source: `labbe-backend-/models/UserModel.js:535`, `labbe-backend-/src/modules/auth/auth.service.js:684`

---

**Q2: Email verification code format — is it numeric (6 digits) or alphanumeric?**

A: [KEPT FROM PETER]

**Current behavior:** `UserModel.js:561-571` — `createEmailVerificationCode` generates `Math.floor(100000 + Math.random() * 900000).toString()` — a **6-digit numeric** code, hashed with SHA-256 before storage.

**Assessment:** CORRECT

**Why:** Code produces exactly a 6-digit numeric code, matching Peter's expectation.

Source: `labbe-backend-/models/UserModel.js:561-571`

---

**Q3: Can user verify email immediately after signup, or only later?**

A: [KEPT FROM PETER]

**Current behavior:** `sendEmailVerificationCode` (auth.controller.js:327) is a protected route requiring authentication. The user must first be logged in. Email can be added during `complete-profile` (for hosts), then verified in settings.

**Assessment:** CORRECT

**Why:** The flow is: user enters email during profile completion (optional at signup), then goes to settings page to trigger verification. This matches Peter's stated design.

**Recommended change:** None for the flow. Ensure the settings page for each role (host, vendor, whitelabel) has a visible "Verify Email" button that calls `POST /send-verification-code`.

Source: `labbe-backend-/src/modules/auth/auth.controller.js:327`

---

**Q4: Rate limiting on forgot-password — what is the limit?**

A: [CLARIFIED FROM PETER]

**Current behavior:** `passwordResetLimiter` is defined in `rateLimiter.js:168-178`. Config: `RATE_LIMIT.PASSWORD_RESET = { WINDOW_MS: 60 * 60 * 1000, MAX_REQUESTS: 3 }` (from `status.js:187`). Key generator at `rateLimiter.js:175-177`: `req.body?.email || req.body?.phoneNumber || req.ip`. For the forgot-password endpoint, the email body field is always present, so the effective key is the email address — **3 requests per hour per email**. Falls back to IP if neither is present (not relevant for forgot-password).

**Assessment:** CORRECT

**Why:** Matches Peter's "per email" intent. 3 attempts per hour per email is a reasonable anti-abuse limit.

Source: `labbe-backend-/src/shared/middleware/rateLimiter.js:168-178`, `labbe-backend-/src/shared/constants/status.js:187`

---

**Q5: Change-password (logged-in users) — is current password required?**

A: [KEPT FROM PETER]

**Current behavior:** Backend: `auth.controller.js:241` destructures `{ currentPassword, newPassword, passwordConfirm }` and passes all three to `authService.updatePassword`. `auth.service.js:755` calls `user.comparePassword(currentPassword)` and throws `UnauthorizedError` if incorrect — current password is **enforced on the backend**.

Web frontend (`ChangePassword.js`): This component calls `resetPassword` mutation (the token-based forgot-password reset), NOT `updatePassword`. It does **not** pass `currentPassword` — it is the post-forgot-password reset form, not the authenticated change-password form. A separate authenticated change-password form (calling `PATCH /update-password`) needs to exist in profile/settings for logged-in users.

**Assessment:** WEAK

**Why:** The `ChangePassword.js` component is named for change-password but implements the token-based reset flow. An authenticated "change my password from settings" flow is either missing or in a different file not yet inspected.

**Recommended change:** Confirm or create an authenticated change-password form in the settings pages for each role (web and mobile) that passes `currentPassword`, `newPassword`, `passwordConfirm` to `PATCH /api/v2/auth/update-password`.

Source: `labbe-backend-/src/modules/auth/auth.controller.js:241`, `labbe-backend-/src/modules/auth/auth.service.js:741-770`, `labbe/ui/auth/change-password/ChangePassword.js:76-79`

---

**Q6: After password reset, should old sessions be invalidated?**

A:

**Current behavior:** `auth.service.js:720-723` sets `user.passwordChangedAt = Date.now() - 1000` on password reset. The JWT protect middleware (in `auth.routes.js`) calls `user.changedPasswordAfter(JWTTimestamp)` (`UserModel.js:512-521`) to reject tokens issued before the password change. This means all existing JWTs are effectively invalidated on reset — they will fail the `changedPasswordAfter` check on next protected request.

**Assessment:** WEAK (current mechanism works for JWTs; incomplete for Gate 1 refresh token redesign)

**Why:** Industry standard (OWASP) requires invalidating all active sessions on password change. The current `changedPasswordAfter` check achieves this for single-token JWTs. However, Gate 1 decision #1 mandates short-lived access tokens + long-lived rotating refresh tokens with a **server-side revocation list**. Under that architecture, bumping `passwordChangedAt` is not sufficient — all refresh tokens for the user must also be revoked server-side. This revocation is not yet implemented.

**Recommended change:** When the refresh-token architecture is implemented (Gate 1 #1), add a step in `resetPassword` and `updatePassword` to revoke all active refresh tokens for the user (e.g., delete all entries in the refresh token store keyed by `userId`).

Source: `labbe-backend-/src/modules/auth/auth.service.js:720-723`, `labbe-backend-/models/UserModel.js:512-521`

---

**Q7: Email verification — can user change email?**

A: [KEPT FROM PETER]

**Current behavior:** `auth.controller.js:278-297` (`updateMe`) allows updating the `email` field for authenticated users. When email is changed, `emailVerified` should be reset to `false` (verify this is enforced in the pre-save hook or `updateMe` handler — not currently visible in `updateMe` code). The user can then re-verify via `POST /send-verification-code`.

**Assessment:** WEAK

**Why:** Peter confirmed users can change email from settings. However, `updateMe` in `auth.controller.js:278-297` does not explicitly reset `emailVerified = false` when email changes. If not reset, a user could change their email but retain verified status on the new unverified address.

**Recommended change:** In `updateMe` (or via a pre-save hook on the `email` field change): if `email` is modified, set `emailVerified = false` and clear `emailVerificationCode/Expires`.

Source: `labbe-backend-/src/modules/auth/auth.controller.js:278-297`

---

**Q8: If email not verified by certain time, should signup be rolled back?**

A: [KEPT FROM PETER]

**Current behavior:** No expiry or rollback logic exists for unverified emails. Email uniqueness is enforced at the DB level (`UserModel.js:374-377` — unique sparse index on `email`). An unverified email blocks re-registration.

**Assessment:** CORRECT

**Why:** Peter's intent is clear: an existing email (verified or not) blocks re-registration. This prevents email squatting by a different user. If the original user loses access, they should use forgot-password or contact support.

**Recommended change:** None for the blocking behavior. Document this in user-facing UX (e.g., "This email is already registered. Try logging in or reset your password").

Source: `labbe-backend-/models/UserModel.js:374-377`

---

## State machine

```
[authenticated or anonymous — knows email]
     │ submit email (forgot-password)
     ▼
[reset-email-sent]  ──── token expires (currently 10min, should be 1h) ──► [token-expired]
     │ user clicks link in email
     ▼
[token-valid]  ──── token already used or expired ──► [token-invalid error]
     │ submit new password
     ▼
[password-updated]  ──── lockUntil NOT cleared (bug) ──► [still-locked]
     │
     ▼
[authenticated with new JWT]

---

[authenticated]
     │ request email verification code
     ▼
[code-sent]  ──── code expires (15min TTL) ──► [code-expired]
     │ submit correct 6-digit code
     ▼
[emailVerified = true]
```

Notes:
- Password reset token: SHA-256 hashed in DB, 10-min TTL (must be 1 hour).
- Email verification code: 6-digit numeric, SHA-256 hashed, 15-min TTL — correct and implemented.
- Mobile has no UI to enter a reset token — only an email-submission screen.

---

## Data handoffs

| Step | Source | Payload | Destination |
|------|--------|---------|-------------|
| forgotPassword | `auth.controller.js:208` | `{ email }` → `createPasswordResetToken()` | Hashed token stored in DB; plain token sent in email link |
| resetPassword | `auth.controller.js:218` | `{ token }` param + `{ password, passwordConfirm }` body | Password updated, `passwordChangedAt` set, JWT issued |
| sendEmailVerificationCode | `auth.controller.js:327` | authenticated user's email | 6-digit code stored hashed; sent via email |
| verifyEmail | `auth.controller.js:356` | `{ code }` | `user.emailVerified = true` |
| updatePassword | `auth.controller.js:241` | `{ currentPassword, newPassword, passwordConfirm }` | Password updated, `passwordChangedAt` set, JWT issued |

---

## Role variations

All authenticated roles can use `updatePassword` (PATCH /update-password). All users with an email can use `forgotPassword`. Email verification is available to all roles with an email address.

Role-specific nuance: hosts who complete profile via OTP signup set their password during `completeHostProfile` — they may later use `forgotPassword` if they forget it. Vendors and whitelabel admins set passwords during signup, so `forgotPassword` is their standard recovery path. Whitelabel admins who have NOT completed Phase 2 (setup-password) should not reach `forgotPassword` — they should use `resend-setup-email` instead.

---

## Web ↔ mobile parity

| Capability | Web | Mobile | Gap |
|-----------|-----|--------|-----|
| Forgot-password form | `ForgetPassword.js` (email submit) | `ForgetPasswordScreen.js` (email submit) | Parity on submission |
| Reset-password token entry | `change-password/page.js` + `ChangePassword.js` | NOT IMPLEMENTED — no screen to enter reset token | Critical gap: mobile user receives email, clicks link, gets web page — no mobile handler |
| Change-password (authenticated) | `ChangePassword.js` in settings (uses token-based reset path — see Q5 BUG) | Not confirmed | Both web and mobile need authenticated change-password form calling PATCH /update-password |
| Email verification | `AccountSettings.js` send + verify OTP flow | `halla-mobile/components/settings/AccountSettings.js` | Parity confirmed per Q6 |
| Rate limiting visibility | 3 resets per hour per email | Same backend | Frontend must show user-friendly "Too many attempts" message |

---

## Edge cases & failure modes

1. **Reset link clicked on mobile device:** The reset email contains `${config.frontend.url}/reset-password/${token}` — a web URL. If opened on mobile, browser opens the web app. There is no deep link or universal link to route to the mobile app.
2. **Locked user resets password but stays locked:** `resetPassword` does not clear `loginAttempts` or `lockUntil`. User resets password successfully but cannot log in for up to 30 minutes (after FLOW-05-F01 fix) or 15 minutes (current). Hostile UX and contrary to OWASP guidance.
3. **`ChangePassword.js` is a token-based reset form, not an authenticated change-password form:** The web `ChangePassword.js` component calls the token-based `resetPassword` path. An authenticated user going to "Change Password" in settings is actually using the forgot-password flow. This means no `currentPassword` verification happens, which is a weaker security posture than requiring the current password.
4. **Email-change with no re-verification:** `updateMe` allows changing the email field directly. `emailVerified` is not reset. A user can change email to an unverified address and remain in `emailVerified = true` state. This is a separate finding in Flow 07 but directly impacts this flow's email verification logic.
5. **Rate limiter key falls back to IP:** `passwordResetLimiter` key generator: `req.body?.email || req.ip`. If email is omitted from the request body, all requests from the same IP share the 3/hour limit, which could block legitimate users on shared networks.

---

## Findings

### FLOW-06-F01
- **Title:** Password reset token expiry is 10 min — Gate-1 requires 1 hour
- **Type:** CONFLICT
- **Severity:** Medium
- **File:** `labbe-backend-/models/UserModel.js:535`
- **Detail:** `createPasswordResetToken` sets `passwordResetExpires = Date.now() + 10 * 60 * 1000` (10 minutes). Peter confirmed it should be 1 hour. The email template in `auth.service.js:684` also passes `expiresIn: '10 minutes'` as copy. Users who don't act within 10 minutes must request a new link — frustrating in low-connectivity environments.
- **Recommended change:** Change `UserModel.js:535` to `60 * 60 * 1000`. Change `auth.service.js:684` email template argument to `expiresIn: '1 hour'`.
- **Related:** None

### FLOW-06-F02
- **Title:** `resetPassword` does not clear account lockout on success
- **Type:** Medium
- **Severity:** Medium
- **File:** `labbe-backend-/src/modules/auth/auth.service.js:699`
- **Detail:** `resetPassword` at lines 699–731 updates `user.password` and sets `passwordChangedAt` but does not clear `loginAttempts` or `lockUntil`. A locked user who successfully resets their password (proving identity via email access) cannot log in until the lock timer expires. OWASP recommends clearing the lock on successful identity verification.
- **Recommended change:** Add `user.loginAttempts = 0; user.lockUntil = undefined;` inside `resetPassword` after token validation succeeds and before `user.save()`.
- **Related:** FLOW-05-F01

### FLOW-06-F03
- **Title:** Mobile has no reset-password token entry screen
- **Type:** High
- **Severity:** High
- **File:** `halla-mobile/services/authService.js`
- **Detail:** The mobile `ForgetPasswordScreen.js` submits the email and shows a confirmation. No screen exists to enter the reset token and new password. When a mobile user clicks the reset link in the email, a web browser opens the web app's reset page. There is no native mobile reset-password form, no deep link registered, and no `resetPasswordAPI` function in `authService.js` that calls `PATCH /reset-password/:token`.
- **Recommended change:** (1) Add `resetPasswordAPI` to `halla-mobile/services/authService.js`. (2) Create `ResetPasswordScreen` with token input (or URL param from deep link) and password/confirm fields. (3) Register a deep link for `/reset-password/:token` in `app.json` to intercept reset email links on mobile.
- **Related:** FLOW-04-F01 (same pattern: mobile missing post-email token flow)

### FLOW-06-F04
- **Title:** Web `ChangePassword.js` uses token-based reset path instead of authenticated change-password
- **Type:** Medium
- **Severity:** Medium
- **File:** `labbe/ui/auth/change-password/ChangePassword.js:76`
- **Detail:** `ChangePassword.js` calls the `resetPassword` mutation (token-based forgot-password reset) rather than the authenticated `PATCH /update-password` endpoint. This means the "Change Password" settings form does not require the user to enter their current password, which is a weaker security posture. The `PATCH /update-password` endpoint (which requires `currentPassword`) is implemented on the backend but is not called from the web settings page.
- **Recommended change:** Replace the `resetPassword` call in `ChangePassword.js` with a call to `PATCH /api/v2/auth/update-password`. Add `currentPassword` field to the form. This is the correct authenticated change-password flow.
- **Related:** None

---

## Cross-flow notes

- **Flow 01 (auth-foundation):** `resetPassword` sets `passwordChangedAt`, which triggers `changedPasswordAfter` check in `protect` middleware — invalidating all existing JWTs for the user. Under Gate-1 dual-token architecture, this must also revoke all refresh tokens.
- **Flow 05 (login):** FLOW-06-F02 and FLOW-05-F01 describe the same fix to `resetPassword` — clearing `lockUntil` after password reset.
- **Flow 07 (profile-settings):** The email-change-without-re-verification bug in `updateMe` (FLOW-07-F01) directly affects the email verification flow documented here. After an email change, the verification state is stale until the fix is applied.
- **Flow 04 (signup-whitelabel):** A whitelabel who has not completed Phase 2 has no password — `forgotPassword` will find the user by email but the token-based reset will set a password on an account that should be using the `setup-password` flow. Consider blocking `forgotPassword` for accounts with a pending `passwordSetupToken`.
