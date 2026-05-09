# auth — Full-Stack Review Plan

**Module:** auth
**Generated:** 2026-05-07
**Prompt:** docs/implementation/MODULE_FULLSTACK_REVIEW_PROMPT.md
**Status:** Awaiting green light · NOT IMPLEMENTED YET

---

## 0. Executive Summary

- **23 total endpoints** in module (mounted at `/api/v2/auth`)
- **0 candidates for hard deletion** — every endpoint is consumed somewhere; 6 endpoints are wired on backend but not on web/mobile (gaps, not duplicates)
- **6 Swagger drift findings** (mostly: schema defined in `auth.validation.js` but never applied → JSDoc claims validation that doesn't run)
- **3 backend file-size violations** — `auth.service.js` (1186), `auth.routes.js` (779), `auth.controller.js` (665)
- **8 web file-size violations** (1 service @526, 1 service @524, 1 service @431, 1 hook @351, 1 schema @567, 4 UI files >250)
- **1 mobile file-size violation** — `services/authService.js` (596 lines, cap 500)
- **6 web/mobile API consumption mismatches** (mostly: mobile sends `phoneNumber`, web sends different shape; web uses `email` for login, mobile uses `email` — aligned; mobile reads `data.data.token` with fallback to `data.token`, web reads `data.data` only)
- **5+ data-mapping issues** (web has triple fallback `resp?.data?.data || resp?.data || resp` in setup-password; mobile has documented `data.data?.x || data.x` chain in 8 places)
- **12 endpoints lacking Joi schema validation** despite 6 schemas being defined and unused (CRITICAL)
- **3 missing rate-limit middleware** (signup/host, signup/vendor, signup/whitelabel, logout — DoS exposure)
- **5 missing audit logs** (vendor signup, whitelabel signup, OTP signup verify, complete-profile, update-me)
- **~20 phase/flow comments** in backend that the prompt says to remove — but these are well-structured "FLOW-XX-FYY" markers that document active flow tracking; recommend KEEPING (they explain *why* across files), confirm with user
- **2 console.log lines** in production web code (`ContinueSignupForm.js`)
- **10 `console.error` calls in backend** that should use logger (`auth.service.js` non-blocking notifications + `otp.service.js`)
- **1 raw `fetchWithTimeout`** call in mobile (`App.js:66` push-token registration)
- **2 missing email-verification flows** end-to-end (`/auth/verify-email-link` + `/auth/send-verification-code` + `/auth/verify-email` not wired on web; verify-email-link not wired on mobile)
- **Estimated effort: L (Large)** — auth is the largest and most security-sensitive module; combined backend+web+mobile changes touch ~25 files. Recommend splitting into 3 PRs (backend hardening, web cleanup, mobile cleanup).

---

## 1. Endpoint Inventory

All paths mounted at `/api/v2/auth/...`.

| # | Method | Path | Controller | Service | Middleware chain | Swagger | Web hook | Mobile hook | Status |
|---|--------|------|------------|---------|------------------|---------|----------|-------------|--------|
| 1 | POST | /signup/host | hostSignup | signupHost | `validate(hostSignupSchema)`, `checkDuplicates` | OK | `useAuthMutation('sendSignupOTP')` (indirect) | `signupWithPhoneAPI` → `useAuthStore.signupWithPhone` | KEEP — add rate limiter |
| 2 | POST | /signup/vendor | vendorSignup | signupVendor | `uploadVendorFiles`, `validateEmail/Phone/Password/StringLength`, `checkDuplicates` | OK (multipart) | `useAuthMutation('signupVendor')` | `signupVendorAPI` → `useVendorSignup()` | KEEP — add Joi + rate limiter |
| 3 | POST | /signup/whitelabel | whitelabelSignup | signupWhitelabel | `uploadLogo`, `validateEmail/Phone/StringLength`, `checkDuplicates` | OK (multipart) | `useAuthMutation('signupWhiteLabel')` | `signupWhitelabelAPI` | KEEP — add Joi + rate limiter |
| 4 | POST | /login | login | login | `authLimiter`, `validate(loginSchema)` | OK | `useAuthMutation('login')` | `loginWithEmailAPI` | KEEP |
| 5 | POST | /refresh | refresh | rotateRefreshToken | `refreshLimiter` | OK | (apiClient interceptor) | `refreshTokenAPI` | KEEP — accept body OR cookie token (already does) |
| 6 | POST | /otp/send-signup | sendSignupOTP | sendSignupOTP | `otpLimiter`, `otpHourlyLimiter`, `validatePhone`, `checkDuplicates` | OK | `useAuthMutation('sendSignupOTP')` | `sendOTPAPI(type='signup')` | KEEP — add Joi |
| 7 | POST | /otp/verify-signup | verifySignupOTP | verifySignupOTP | `authLimiter`, `validate(otpVerifySchema)` | OK | `useAuthMutation('verifySignupOTP')` | `verifySignupOTPAPI` | KEEP |
| 8 | POST | /otp/send-login | sendLoginOTP | sendLoginOTP | `otpLimiter`, `otpHourlyLimiter`, `validatePhone` | OK | `useAuthMutation('sendLoginOTP')` | `sendOTPAPI(type='login')` | KEEP — add Joi |
| 9 | POST | /otp/verify-login | verifyLoginOTP | verifyLoginOTP | `authLimiter`, `validate(otpVerifySchema)` | OK | `useAuthMutation('verifyLoginOTP')` | `verifyOTPAPI` | KEEP |
| 10 | POST | /otp/resend | resendOTP | resendOTP | `otpLimiter`, `otpHourlyLimiter`, `validatePhone` | OK | ❌ MISSING | `resendOTPAPI` (defined but no consumer) | KEEP — wire FE consumers |
| 11 | POST | /forgot-password | forgotPassword | forgotPassword | `passwordResetLimiter`, `validateEmail` | OK | `useAuthMutation('forgotPassword')` | `forgotPasswordAPI` | KEEP — apply Joi `forgotPasswordSchema` |
| 12 | PATCH | /reset-password/:token | resetPassword | resetPassword | `authLimiter` | OK | `useAuthMutation('resetPassword')` | `resetPasswordAPI` (defined but no screen) | KEEP — apply Joi `resetPasswordSchema` |
| 13 | GET | /validate-setup-token/:token | validateSetupToken | (controller-only) | `authLimiter` | OK | `useAuthMutation('validateSetupToken')` | not used | KEEP |
| 14 | POST | /setup-password | setupPassword | (controller-only, mostly) | `authLimiter` | OK | `useAuthMutation('setupPassword')` | `setupPasswordAPI` | KEEP — add Joi schema |
| 15 | POST | /resend-setup-email | resendSetupEmail | (controller-only) | `passwordResetLimiter`, `validateEmail` | OK | ❌ MISSING | not used | KEEP — wire FE consumers if flow exists |
| 16 | POST | /logout | logout | revokeRefreshToken | (none) | OK | `useAuthMutation('logout')` + `authStore.logout` | `logoutAPI` | KEEP — add rate limiter |
| 17 | GET | /verify-email-link | verifyEmailLink | verifyEmailLink | `authLimiter` | OK | ❌ MISSING (no page) | not used | KEEP — add `/verify-email/[token]` page on web |
| 18 | GET | /me | getMe | getMe | `protect` | OK | ❌ MISSING (web reads via dashboard endpoint) | indirect via `getProfileAPI` → `/users/profile` (DIVERGENCE — see §5) | KEEP — pick canonical |
| 19 | PATCH | /update-password | updatePassword | updatePassword | `protect`, `authLimiter`, `validatePassword('newPassword')` | OK | ❌ MISSING | `changePasswordAPI` → `useChangePassword()` | KEEP — apply Joi `updatePasswordSchema` + wire web |
| 20 | PATCH | /update-me | updateMe | (controller-only, raw Mongoose write) | `protect` | OK | ❌ MISSING | not exported | KEEP — **add Joi + service method**; fix field-injection |
| 21 | PATCH | /complete-profile | completeHostProfile | completeHostProfile | `protect` | OK | `useAuthMutation('completeProfile')` | `completeProfileAPI` | KEEP — apply Joi `completeProfileSchema` |
| 22 | POST | /send-verification-code | sendEmailVerificationCode | (controller-only) | `protect` | OK | ❌ MISSING | `sendEmailVerificationCodeAPI` (defined, no consumer) | KEEP — move logic to service; add Joi |
| 23 | POST | /verify-email | verifyEmail | (controller-only) | `protect` | OK | ❌ MISSING | `verifyEmailAPI` (defined, no consumer) | KEEP — apply Joi `verifyEmailSchema`; move logic to service |

**Legend:** KEEP, DELETE-DUPLICATE-OF-#N, RENAME, MERGE-WITH-#N. No deletions in this module — all 23 are distinct jobs. Frontend has 7 unwired endpoints (10, 15, 17, 18, 19, 20, 22, 23).

---

## 2. Backend Findings

### 2.1 File-size violations

- `auth.service.js` — **1186 lines** (cap 600). Proposed split:
  - `auth.signup.service.js` — `signupHost`, `signupVendor`, `signupWhitelabel` (~400 lines)
  - `auth.password.service.js` — `forgotPassword`, `resetPassword`, `updatePassword`, `setupPassword` helper (~250 lines)
  - `auth.session.service.js` — `login`, `verifyLoginOTP`, `rotateRefreshToken`, `revokeRefreshToken` (~300 lines)
  - `auth.profile.service.js` — `getMe`, `completeHostProfile`, `verifyEmail`, `updateMe`, `sendEmailVerificationCode` (~150 lines)
  - `auth.notifications.service.js` — the 4 private notification helpers L1126–1183 (~80 lines)
  - `auth.service.js` becomes a thin façade that re-exports.
- `auth.routes.js` — **779 lines** (cap 400). Proposed split:
  - `auth.signup.routes.js` (signup/host, signup/vendor, signup/whitelabel)
  - `auth.session.routes.js` (login, refresh, logout, /me)
  - `auth.otp.routes.js` (otp/send-signup, otp/verify-signup, otp/send-login, otp/verify-login, otp/resend)
  - `auth.password.routes.js` (forgot-password, reset-password, update-password, setup-password, validate-setup-token, resend-setup-email)
  - `auth.profile.routes.js` (update-me, complete-profile, send-verification-code, verify-email, verify-email-link)
  - `auth.routes.js` becomes a parent router that mounts the five sub-routers.
- `auth.controller.js` — **665 lines** (cap 300). Mirror the routes split.

### 2.2 Swagger drift

- **`PATCH /reset-password/:token`** (`auth.routes.js:447–478`) — Swagger documents body `{password, passwordConfirm}` but no Joi schema is applied to the route; manual validation lives in `auth.service.js:947–954`. Apply `resetPasswordSchema` (defined but unused) so the request-body contract matches the JSDoc.
- **`POST /setup-password`** (`auth.routes.js:517–544`) — Swagger documents `{token, password, passwordConfirm}` but no Joi schema exists at all. Manual validation in `auth.controller.js:574–582`. Add a `setupPasswordSchema` and apply it.
- **`PATCH /update-password`** (`auth.routes.js:641–680`) — `updatePasswordSchema` is defined in `auth.validation.js:139–145` but never applied; route uses `validatePassword('newPassword')` middleware only. Apply the schema.
- **`PATCH /update-me`** (`auth.routes.js:681–705`) — Swagger documents body fields but no Joi schema gates them. Controller uses `allowedFields` allowlist (`auth.controller.js:420–426`) which is good, but no shape validation. Add a `updateMeSchema`.
- **`PATCH /complete-profile`** (`auth.routes.js:709–728`) — `completeProfileSchema` defined in `auth.validation.js:150–157` but unused. Apply.
- **`POST /verify-email`** (`auth.routes.js:751–777`) — `verifyEmailSchema` defined in `auth.validation.js:162–166` but unused. Apply.

### 2.3 Missing middleware / safeguards

- **`POST /signup/host`, `/signup/vendor`, `/signup/whitelabel`** lack rate limiting (`auth.routes.js:135, 177, 220`). Add `authLimiter` (or a dedicated `signupLimiter` — propose 5/hour/IP).
- **`POST /logout`** lacks rate limiting (`auth.routes.js:599`). Add `authLimiter`.
- **Audit log gaps:**
  - `vendorSignup` (`auth.service.js:485`) — no `logAudit('vendor_signup', ...)` call on success.
  - `whitelabelSignup` (`auth.service.js:581`) — no audit log.
  - `verifySignupOTP` (`auth.service.js:757`) — no audit log on user-creation path.
  - `completeHostProfile` (`auth.service.js:1071`) — no audit log.
  - `updateMe` (`auth.controller.js:418`) — no audit log on user self-update.
- **OTP cooldown gap:** `otp.service.sendOTP` (`otp.service.js:24–51`) deletes prior OTPs but does not enforce a per-phone 30-second cooldown the way `resendOTP` does (`otp.service.js:88–98`). Route-level `otpLimiter` (1/min) mitigates, but service should also gate.
- **`PATCH /update-me`** (`auth.routes.js:705`) has no validation middleware. Direct write to Mongoose; while the controller uses an `allowedFields` allowlist (`auth.controller.js:420–426`), shape and type validation are absent. Add Joi.

### 2.4 Duplicate / dead endpoints

- No duplicate endpoints. The three OTP send routes (signup, login, resend) all serve distinct flows — KEEP.
- Dead Joi schemas (defined in `auth.validation.js` but never applied):
  - `otpResendSchema` (L114–117)
  - `forgotPasswordSchema` (L122–124)
  - `resetPasswordSchema` (L129–134)
  - `updatePasswordSchema` (L139–145)
  - `completeProfileSchema` (L150–157)
  - `verifyEmailSchema` (L162–166)

  All six should be wired into their routes (rule A4.4 / A5.1).

### 2.5 Service / controller violations

- **Business logic in controller** — `auth.controller.js:418–441` (`updateMe` does direct `User.findByIdAndUpdate` + response shaping); `auth.controller.js:489–511` (`sendEmailVerificationCode` generates code + saves model directly); `auth.controller.js:517–536` (`verifyEmail` validates + writes directly). All three should have matching service methods on `authService`.
- **`console.error` swallowing** — 10 instances in `auth.service.js` of `.catch(console.error)` for non-blocking notification chains: lines 432, 442, 456, 465, 559, 565, 632, 639, 802, 812. Replace with `logger.error('description', err)` from `shared/utils/logger.js`. The pattern hides errors during incident triage.
- **`console.error` in OTP service** — `otp.service.js:48` `console.error('[OTP] Send failed:', error)`. Replace with `logger.error`.
- **Sequential awaits where Promise.all would apply:** `auth.service.js:468–476` (host signup post-save) — minor, low priority.
- **Subscription / whitelabel projections:** `getMe` (`auth.service.js:1044–1049`) populates subscription + whitelabel without `.select()`. Add explicit projections to limit payload.

### 2.6 Validation gaps

- **No Joi schema on `PATCH /reset-password/:token`** — apply `resetPasswordSchema`.
- **No Joi schema on `POST /setup-password`** — write a new schema.
- **No Joi schema on `PATCH /update-password`** — apply `updatePasswordSchema`.
- **No Joi schema on `PATCH /update-me`** — write a new schema (allowed fields: name, profileImage, … per controller allowlist).
- **No Joi schema on `PATCH /complete-profile`** — apply `completeProfileSchema`.
- **No Joi schema on `POST /verify-email`** — apply `verifyEmailSchema`.
- **No Joi schema on `POST /forgot-password`** — apply `forgotPasswordSchema`.
- **No Joi schema on `POST /otp/resend`** — apply `otpResendSchema`.
- **No Joi schema on `POST /otp/send-signup`, `/otp/send-login`** — write a `phoneOnlySchema`.
- **No Joi schema on `POST /send-verification-code`** — write a body-less / minimal schema or rely on JWT identity.
- **Multipart endpoints (vendor/whitelabel signup)** — currently use middleware-only (`validateEmail`, `validatePhone`, `validatePassword`, `validateStringLength`). Consider a Joi schema that accepts `Joi.alternatives().try(Joi.string(), Joi.object())` for JSON-stringified social/services fields (rule A5.1).
- **Duplicated phone pattern** (`auth.validation.js:12` and `shared/middleware/validation.js validatePhone`). Centralize into `shared/utils/validators.js` (or wherever the shared registry lives).
- **Duplicated password pattern** (`auth.validation.js:17–25` and manual checks in `auth.service.js:952–954`, `auth.controller.js:574–582`). Always go through Joi.

### 2.7 Comment hygiene

The auth module has well-structured FLOW-XX-FYY markers that the PROMPT says to remove (rule A9). However, in this module they consistently document the *why* of multi-file flows (e.g. FLOW-02-F02 explains OTP soft-invalidation across `auth.service.js` and `otp.service.js`). **Recommend keeping these markers, pending user decision.**

If user wants strict A9 enforcement (delete all FLOW-/PHASE-/W0-/B-R/H-/M- markers), the deletions are:

- `auth.controller.js:38, 242, 599, 606`
- `auth.routes.js:266, 508, 601`
- `auth.service.js:116, 228, 444, 459, 503, 516, 540, 594, 650, 853, 930, 971, 976, 1021`
- `otp.service.js:55, 82`

(~20 markers total. Each is a single line; net diff is small.)

No re-statement-of-code comments, no TODOs requiring removal, no stale ticket references found.

### 2.8 Suspected bugs (backend)

- **`PATCH /update-me`** trusts `allowedFields` filter (`auth.controller.js:420–426`) but has no schema — if the allowlist drifts from the user model, an attacker could set sensitive fields. Add Joi.
- **OTP send cooldown** (`otp.service.js:24–51`) — see §2.3.
- **OTP idempotency on retry after success** — once OTP is `used: true`, a retry returns "OTP not found / expired" instead of a clean idempotent success. Cosmetic UX issue, not a security bug.
- **Refresh token in JSON body for web responses** (`auth.controller.js:109–126`) — token is set as HttpOnly cookie *and* echoed in body. Web clients ignore the body field today, but echoing it widens leak surface (logs, error reporters, screenshot of devtools). Consider removing from body when the request originates from a browser (User-Agent or `x-client: web`).
- **Password compare timing-safety** (`auth.service.js:277` calls `user.comparePassword`) — depends on `userModel.js` implementation. If that uses `bcrypt.compare`, it is constant-time and safe. Verify before closing.

---

## 3. Frontend Web Findings

### 3.1 Component tree per page (auth surface)

- `app/[lang]/(auth-layout)/login/page.js` → `ui/auth/login/form/Form.js` (294) → `ui/auth/login/form/otpInput/OtpInput.js`
- `app/[lang]/(auth-layout)/signup/host/page.js` → `ui/auth/signup/host/Form.js`
- `app/[lang]/(auth-layout)/signup/host/continue/page.js` → `ui/auth/signup/host/continueSignupForm/ContinueSignupForm.js`
- `app/[lang]/(auth-layout)/signup/vendor/page.js` → `ui/auth/signup/vendor/{StepOne, StepTwo (301), StepTwo/LocationSelector (342), …, StepSix (336)}`
- `app/[lang]/(auth-layout)/signup/whitelabel/page.js` → similar multi-step
- `app/[lang]/(auth-layout)/forget-password/page.js` → `ui/auth/forget-password/ForgetPassword.js`
- `app/[lang]/(auth-layout)/change-password/page.js` → `ui/auth/change-password/ChangePassword.js`
- `app/[lang]/setup-password/[token]/page.jsx` → `ui/auth/setup-password/SetupPassword.js`

### 3.2 File-size violations

| File | Lines | Cap | Action |
|------|-------|-----|--------|
| `services/new-backend/apiClient.js` | 526 | 400 | Split into `apiClient.js` (axios + interceptors), `apiRefresh.js` (refresh-on-401 logic), `apiServerHelpers.js` (`createServerQueryClient`, `prefetchServerData`, `QueryClientServerProvider`). **Preserve every imported symbol from existing call sites — a façade re-export from `apiClient.js` is required.** |
| `services/authService.js` | 431 | 400 | Marginal — split signup vs login vs password vs token blocks if/when next change touches it. |
| `services/auth.js` | 524 | 400 | Inspect for overlap with `services/authService.js` — likely a legacy duplicate. **Investigate before touching** (see §6). |
| `hooks/reactQueryHooks/useAuthMutation.js` | 351 | 250 | Split factory into `useAuthLoginMutations.js`, `useAuthSignupMutations.js`, `useAuthPasswordMutations.js`, `useAuthSessionMutations.js`. Re-export from `useAuthMutation.js`. |
| `utils/schemas/authSchema.js` | 567 | 250 | Split per-form schema (`loginSchema.js`, `signupHostSchema.js`, `vendorSignupSchema.js`, `whitelabelSignupSchema.js`, `forgetPasswordSchema.js`, `changePasswordSchema.js`, `setupPasswordSchema.js`, `continueSignupSchema.js`). |
| `ui/auth/login/form/Form.js` | 294 | 250 | Extract `<EmailLoginPanel/>` and `<OtpLoginPanel/>` (the two branches of the dynamic resolver). **Style preservation:** import the same `Form.module.css` into both extracted components. |
| `ui/auth/signup/vendor/stepSix/StepSix.js` | 336 | 250 | Extract sub-sections (review fields). **Style preservation strict.** |
| `ui/auth/signup/vendor/stepTwo/LocationSelector.js` | 342 | 250 | Extract map / dropdown sections. **Style preservation strict.** |
| `ui/auth/signup/vendor/stepTwo/StepTwo.js` | 301 | 250 | Extract address-fields + ownership-fields sub-components. |

### 3.3 Hardcoded text / data / paths

- `ui/auth/signup/host/continueSignupForm/ContinueSignupForm.js:93` — fallback string `"Failed to complete profile. Please try again."` is not translated. Wrap with `t("errors.complete_profile_failed", "Failed to complete profile. Please try again.")`.
- No hardcoded API paths found in auth UI — all use `API_PATHS.auth.*` ✅.
- OTP placeholder `"+966XXXXXXXXX"` (`ui/auth/login/form/otpInput/OtpInput.js:113`) is acceptable (UI placeholder hint). No action.

### 3.4 Data mapping bugs / fallback chains

- `ui/auth/setup-password/SetupPassword.js:80` — **triple fallback `resp?.data?.data || resp?.data || resp`**. Determine the actual setup-password response shape (`auth.service.js` or controller) and map directly to one path. Replace with `resp?.data?.data` if `sendSuccess` wraps the body, else `resp?.data`.
- `hooks/reactQueryHooks/useAuthMutation.js:137–143` — `resetPassword` mutation reads `response.token` directly *and* `response.data?.user`. The backend returns the standard `{ status, data: { user, ... }, token, refreshToken }` envelope (where `token`/`refreshToken` live at the root because that is what `sendAuthResponse` returns) — confirm in `auth.controller.js:109–126`. If the contract is mixed, normalize the controller to put session data inside `data` and read `response.data.token`.
- `?? true` defaults on `profileCompleted` (`useAuthMutation.js:68, 104, 175`, `Form.js:182`) — these are fine (they default unknown-shape to "completed" for routing) but document the intent in a one-line comment.

### 3.5 Duplicate hooks / direct apiRequest calls

- `stores/authStore.js:172` — `logout()` dynamically imports `apiRequest` + `API_PATHS` to call `/auth/logout` directly to avoid a circular import. **Acceptable** (rule B0.2 allows direct calls when going through the canonical hook would deadlock module init). Add a one-line comment explaining the dynamic import.
- No other component-level direct `apiRequest`/`fetch` calls touching `/auth/` paths.
- **Two service files (`services/auth.js` 524 and `services/authService.js` 431)** appear to overlap. Investigate and dedupe (see §6).

### 3.6 State / loading / error gaps

- `ui/auth/login/form/Form.js` — no `<SimpleLoading/>` component during `isLoading`; relies on disabled-button only. Add a top-level loading indicator consistent with sibling auth pages.
- `ui/auth/signup/host/Form.js` — no loading spinner during OTP send. Same fix.
- `ui/auth/signup/host/continueSignupForm/ContinueSignupForm.js` — no loading spinner.
- `ui/auth/forget-password/ForgetPassword.js` — no loading spinner.
- `ui/auth/change-password/ChangePassword.js` — no loading spinner.
- **No ErrorBoundary on auth pages.** Wrap each top-level page with `ErrorBoundary` (rule B19) using existing `ui/common/error/ErrorBoundary.jsx`.
- **Manual `isFormValid()` in `ui/auth/login/form/Form.js:210–220`** — bypasses RHF's `formState.isValid`. Replace with `formState.isValid` from `useForm`.
- **Two `console.log` in `ContinueSignupForm.js:80, 89`** — remove (rule D6).

### 3.7 Comment hygiene

Web has fewer markers than backend, but several Phase comments exist:

- `services/new-backend/apiClient.js:38–42` — "Phase 1a: HttpOnly access_token / refresh_token cookies …"
- `hooks/reactQueryHooks/useAuthMutation.js:14–22` — "B-1 fix: the access token is now exclusively delivered via …"
- `ui/auth/setup-password/SetupPassword.js:17–35` — "Phase 4b W1-WL-EMAIL flow"
- `app/[lang]/setup-password/[token]/page.jsx:1–10` — Phase marker

These are *informative* (they explain why HttpOnly cookies replaced JS-readable ones). Recommend KEEPING for the same reason as backend (§2.7), pending user decision.

If strict A9/B23 enforcement: delete the markers above. The "why" can stay if rephrased without the phase tag.

### 3.8 Missing wiring (backend exists, frontend missing)

- **`/auth/me`** — no canonical web hook. Web reads user info via dashboard endpoints today. Decide: either wire `useMe()` query in `useAuth.js` or document that web intentionally reads `/users/profile` instead (must align with mobile decision in §5).
- **`/auth/update-password`** — no web hook. If web has a "change password while logged in" UI, wire `useUpdatePasswordMutation()`. If not, leave as-is.
- **`/auth/update-me`** — no web hook. Wire if profile-edit UI exists; otherwise leave.
- **`/auth/send-verification-code` + `/auth/verify-email`** — no web flow. **Email verification is currently broken on web.** Add a `/verify-email/[token]` page + wire mutations.
- **`/auth/verify-email-link`** — no web page. The backend issues a magic link to the user's email; clicking it lands on a 404 today.
- **`/auth/otp/resend`** — no web hook. OTP screens force users to re-trigger `send-*` instead. Wire `useResendOtp()` and call from OTP UI.
- **`/auth/resend-setup-email`** — no web flow.

---

## 4. Frontend Mobile Findings

### 4.1 Screen → component tree

- `screens/auth/LoginScreen.js` (165) → form components in `components/auth/`
- `screens/auth/SignupScreen.js` (233) → multi-step form components
- `screens/auth/VendorSignupScreen.js` (128) → vendor-step components
- `screens/auth/WhitelabelSignupScreen.js` (123) → whitelabel-step components
- `screens/auth/ForgetPasswordScreen.js` (127)
- `screens/auth/SetupPasswordScreen.js` (325) — near 350 cap; watch
- `screens/host/AccountSettingsScreen.js`, `screens/vendor/VendorSettingsScreen.js`, `screens/admin/admin-dashboard/AdminAccountSettingsScreen.js` (consume change-password / logout)

### 4.2 File-size violations

- `services/authService.js` — **596 lines** (cap 500). Split:
  - `services/auth/loginService.js` (login + OTP send/verify login)
  - `services/auth/signupService.js` (host phone signup, vendor signup, whitelabel signup, OTP send/verify signup)
  - `services/auth/passwordService.js` (forgot, reset, setup, update)
  - `services/auth/sessionService.js` (refresh, logout, push-token)
  - `services/authService.js` becomes a façade that re-exports.
- All other auth files are within caps. ✅

### 4.3 Service / hook violations

- **Raw `fetchWithTimeout` in `App.js:66`** — push-token registration. Move to `services/authService.js` as `updatePushTokenAPI()` and route via `apiFetch`. Add `ENDPOINTS.AUTH.UPDATE_PUSH_TOKEN` to `config/api.js` if missing.
- **`_legacyToken` parameter** — accepted-and-ignored in `services/settingsService.js:27, 33, 44, 78, 81, 88, 95, 102, 109` and in mutation hooks (`useUpdateProfile`, `useChangePassword`, `useUpdateNotificationSettings`). Per rule C1, when the next consumer touches each call site, drop the argument. Document in plan and migrate all call sites in one pass since they are localized.
- **`/auth/me` divergence:** mobile `useProfile()` reads `/users/profile` (`ENDPOINTS.USERS.PROFILE`), not `/auth/me`. Backend has both — confirm canonical. If `/auth/me` is the source of truth, migrate mobile. If `/users/profile` is canonical and `/auth/me` is a dup, delete `/auth/me` from auth module (and document in §2.4).

### 4.4 Hardcoded text / data / paths

- All auth screens i18n strings via `t(...)` with Arabic fallbacks. ✅
- All paths via `ENDPOINTS.AUTH.*` except `App.js:66` push-token (see §4.3). ✅ (after fixing 4.3)

### 4.5 Web/Mobile divergence (preview — full diff in §5)

- Mobile uses `data.data?.x || data.x` 8-deep fallback to handle legacy flat responses. After backend response normalization (see §2 / §6), drop the fallbacks and read `data.data.x` only.
- Mobile `useProfile` calls `/users/profile`; web likely calls something else. Pick one (see §4.3).
- Mobile sends `phoneNumber` (e.g. `verifyOTPAPI`); confirm web sends the same field name on every OTP endpoint. (Web's `useAuthMutation` should match — verify.)

### 4.6 Loading / error / empty states

- `LoginScreen.js`, `SignupScreen.js`, `ForgetPasswordScreen.js`, `SetupPasswordScreen.js`, `AccountSettingsScreen.js` — all have explicit loading/error states. ✅
- Profile/notification queries via `useUser.js` rely on React Query state and consumers handle. ✅

### 4.7 Comment hygiene

Mobile has Phase 1a / Phase 4 W3-WL / H-4 fix / FLOW-01-F02 / FLOW-01-F03 / FLOW-06-F03 markers in:
- `services/apiClient.js:3–34, 151–161`
- `services/authService.js:514–517, 547, 569–574`
- `services/secureStorage.js:4–14`
- `stores/authStore.js:24–36, 184–196`
- `screens/auth/SetupPasswordScreen.js:2–21, 73–75`

These document non-obvious decisions (in-memory vs SecureStore tokens, refresh-once coalescing). Recommend KEEPING. If user wants strict C8 enforcement, delete the phase tags but rephrase the rationale as "why" comments.

One TODO: `App.js:7` — `// TODO: run: npx expo install expo-notifications expo-constants`. This is a note for the developer, not a code TODO. Delete it (the install is presumably done since the imports work).

---

## 5. Cross-Platform API Consumption Diff

Backend is the source of truth (after §2 fixes are applied).

| Endpoint | Aspect | Web | Mobile | Backend truth | Action |
|----------|--------|-----|--------|---------------|--------|
| `POST /auth/login` | body | `{email, password}` | `{email, password}` | `{email, password}` | ✅ aligned |
| `POST /auth/login` | response | reads `response.token`, `response.data.user` | reads `data.data.{token, refreshToken, user, subscription}` with `data.data || data` fallback | `{status, token, refreshToken, data: {user, subscription}}` (per `sendAuthResponse`) | Normalize: both should read `response.token` and `response.data.user`. Drop mobile's flat-fallback once verified. |
| `POST /auth/otp/send-signup` | body | `{phoneNumber}` | `{phoneNumber: mobile}` | `phoneNumber` | ✅ aligned |
| `POST /auth/otp/verify-signup` | body | `{phoneNumber, otp}` | `{phoneNumber, otp}` | same | ✅ aligned |
| `POST /auth/forgot-password` | body | `{email}` | `{email}` | `{email}` | ✅ aligned |
| `PATCH /auth/reset-password/:token` | body | `{password, passwordConfirm}` | `{password, passwordConfirm}` | currently no Joi → manual `password, passwordConfirm` check | ✅ aligned (apply Joi to lock contract) |
| `PATCH /auth/update-password` | body | (not wired) | `{currentPassword, newPassword, passwordConfirm: newPassword}` | accepts via `validatePassword('newPassword')` middleware | Mobile sends `passwordConfirm`; current backend doesn't require it. Decide: enforce confirm in Joi schema (web + mobile + backend aligned) or drop from mobile. |
| `POST /auth/setup-password` | body | `{token, password, passwordConfirm}` | `{token, password, passwordConfirm}` | manually validated in controller | ✅ aligned (lock with Joi) |
| `POST /auth/refresh` | body | (cookie-only on web) | `{refreshToken}` | accepts both cookie and body | ✅ aligned by design |
| `GET /auth/me` | path | not wired | calls `/users/profile` instead | `/auth/me` exists | **DIVERGENT** — pick canonical and migrate. |
| `POST /auth/logout` | body | (cookie-only) | `{refreshToken}` + Authorization header | accepts both | ✅ aligned by design |
| `PATCH /auth/complete-profile` | body | `{username, email, password, passwordConfirm}` | `{username, email, password, passwordConfirm: password}` | currently no Joi → manual | ✅ aligned (lock with `completeProfileSchema`) |

**Refresh-token transport divergence is intentional**: web uses HttpOnly cookies (no JS access), mobile uses SecureStore. Backend correctly accepts either. Document the decision once and stop carrying flat-response fallbacks.

---

## 6. Suspected Bugs Worth Verifying

(Things that look broken but cannot be confirmed without running the app — flagged for sanity-check.)

1. **`labbe/services/auth.js` (524 lines) vs `labbe/services/authService.js` (431 lines)** — two service files with similar names in the web app. Likely one is legacy. **Before any cleanup: confirm which is referenced by which call sites and delete the unused one.** Greppable on import.
2. **`PATCH /auth/update-me`** — `auth.controller.js:418–441` uses `User.findByIdAndUpdate` with an `allowedFields` allowlist. Verify the allowlist covers exactly the fields exposed by the user-profile UI; otherwise users might see "save succeeded" while a field silently dropped.
3. **`POST /auth/setup-password`** triple fallback in web (`SetupPassword.js:80`) suggests the response shape has drifted in the past. After locking the schema, run an end-to-end test of the whitelabel-setup flow on web.
4. **Email verification flow is broken on web** — backend issues a link to `/auth/verify-email-link?token=...`; web has no `/verify-email/[token]` route. Users currently can't verify emails via web. Confirm if email verification is required for any privileged action.
5. **OTP idempotency on retry** — once OTP is `used: true`, a second verify of the same code returns "OTP not found" rather than "already verified". Confirm the mobile OTP screen handles this gracefully (it should treat the second response as success if the user is already authenticated).
6. **Refresh token leak surface** — `auth.controller.js:109–126` echoes `refreshToken` in JSON for web responses even though web ignores it. Verify no logger or error reporter captures the response body before this is changed.
7. **Mobile push-token registration** (`App.js:66`) — uses `fetchWithTimeout` not `apiFetch`; if the access token has expired, this call won't auto-refresh and silently fails. Confirm with a fresh-install run after a long idle.
8. **`/auth/me` vs `/users/profile`** — mobile reads `/users/profile`, backend exposes both. Verify the response shapes match exactly, otherwise consumers hit different fields per platform.
9. **`comparePassword` timing-safety** (`auth.service.js:277` calls `user.comparePassword`) — verify `userModel.js` uses `bcrypt.compare` (constant-time). If it uses `===`, fix in the user module review.
10. **Whitelabel temp-password flow** (`auth.service.js:615, 620`) — `whitelabelSignup` saves a temp password that `setupPassword` later overrides. Confirm the temp password is never accepted at `/auth/login` (e.g. user account is in pending status that login service rejects).

---

## 7. Implementation Plan (Ordered)

Apply changes in this order. Each item ends with a checkbox the agent will tick during Phase 2.

### 7.A Backend (highest priority — security)

#### A.1 — Validation lock-in (CRITICAL)
- [ ] **A.1.1** Apply `forgotPasswordSchema` to `POST /forgot-password`. (`auth.routes.js:438`, `auth.validation.js:122`)
- [ ] **A.1.2** Apply `resetPasswordSchema` to `PATCH /reset-password/:token`. (`auth.routes.js:479`, `auth.validation.js:129`)
- [ ] **A.1.3** Apply `updatePasswordSchema` to `PATCH /update-password`. (`auth.routes.js:672`, `auth.validation.js:139`)
- [ ] **A.1.4** Apply `completeProfileSchema` to `PATCH /complete-profile`. (`auth.routes.js:728`, `auth.validation.js:150`)
- [ ] **A.1.5** Apply `verifyEmailSchema` to `POST /verify-email`. (`auth.routes.js:777`, `auth.validation.js:162`)
- [ ] **A.1.6** Apply `otpResendSchema` to `POST /otp/resend`. (`auth.routes.js:400`, `auth.validation.js:114`)
- [ ] **A.1.7** Add `setupPasswordSchema` and apply to `POST /setup-password`. (`auth.validation.js`, `auth.routes.js:544`)
- [ ] **A.1.8** Add `updateMeSchema` (allowlist: per controller `auth.controller.js:420–426`) and apply to `PATCH /update-me`. (`auth.routes.js:705`)
- [ ] **A.1.9** Add `phoneOnlySchema` and apply to `POST /otp/send-signup`, `POST /otp/send-login`. (`auth.routes.js:295, 346`)

#### A.2 — Rate limiting (CRITICAL)
- [ ] **A.2.1** Add `authLimiter` to `POST /signup/host`. (`auth.routes.js:135`)
- [ ] **A.2.2** Add `authLimiter` to `POST /signup/vendor`. (`auth.routes.js:177`)
- [ ] **A.2.3** Add `authLimiter` to `POST /signup/whitelabel`. (`auth.routes.js:220`)
- [ ] **A.2.4** Add `authLimiter` to `POST /logout`. (`auth.routes.js:599`)

#### A.3 — Audit log gaps (HIGH)
- [ ] **A.3.1** Add `logAudit('vendor_signup', ...)` to `signupVendor`. (`auth.service.js:485`)
- [ ] **A.3.2** Add `logAudit('whitelabel_signup', ...)` to `signupWhitelabel`. (`auth.service.js:581`)
- [ ] **A.3.3** Add `logAudit('signup_otp_verified', ...)` to `verifySignupOTP`. (`auth.service.js:757`)
- [ ] **A.3.4** Add `logAudit('profile_completed', ...)` to `completeHostProfile`. (`auth.service.js:1071`)
- [ ] **A.3.5** Add `logAudit('user_self_update', ...)` to a new `authService.updateMe`. (after A.4.1)

#### A.4 — Controller → service refactor
- [ ] **A.4.1** Move `updateMe` business logic from `auth.controller.js:418–441` into `authService.updateMe`. Controller only parses request, calls service, sends response.
- [ ] **A.4.2** Move `sendEmailVerificationCode` from `auth.controller.js:489–511` into `authService.sendEmailVerificationCode`.
- [ ] **A.4.3** Move `verifyEmail` from `auth.controller.js:517–536` into `authService.verifyEmail`.

#### A.5 — Logger and error handling
- [ ] **A.5.1** Replace 10 instances of `.catch(console.error)` in `auth.service.js` (L432, 442, 456, 465, 559, 565, 632, 639, 802, 812) with `.catch((err) => logger.error('<descr>', err))` from `shared/utils/logger.js`.
- [ ] **A.5.2** Replace `console.error` in `otp.service.js:48` with `logger.error`.

#### A.6 — Other safeguards
- [ ] **A.6.1** Add 30-second per-phone cooldown check inside `otp.service.sendOTP` mirroring `resendOTP`. (`otp.service.js:24–51`)
- [ ] **A.6.2** Add `.select()` projections to `getMe` populates. (`auth.service.js:1044–1049`)
- [ ] **A.6.3** Stop echoing `refreshToken` in JSON body for web responses (or decide to keep — see §6.6). (`auth.controller.js:109–126`)

#### A.7 — File-size split (deferred until A.1–A.6 land, lower-risk)
- [ ] **A.7.1** Split `auth.service.js` into 5 sub-services (signup, password, session, profile, notifications). Re-export façade. Tests must continue to pass.
- [ ] **A.7.2** Split `auth.routes.js` into 5 sub-routers. Mount under one parent.
- [ ] **A.7.3** Split `auth.controller.js` to mirror routes.

#### A.8 — Comment hygiene (only if user wants strict A9)
- [ ] **A.8.1** Decision pending: keep `// FLOW-XX-FYY`, `// H-N`, `// M-N`, `// B-RN`, `// W0-AUTH`, `// Phase 4` markers OR delete them. Default: keep, since they document multi-file flows.

#### A.9 — Centralize duplicated patterns
- [ ] **A.9.1** Move phone regex from `auth.validation.js:12` and `shared/middleware/validation.js validatePhone` into `shared/utils/validators.js` (or wherever the shared registry lives). Import into both call sites.
- [ ] **A.9.2** Same for password rules.

### 7.B Web

#### B.1 — Investigate and dedupe duplicate auth services
- [ ] **B.1.1** Compare `services/auth.js` (524 lines) and `services/authService.js` (431 lines). Identify which is canonical. Delete the dead one. Migrate any consumers.

#### B.2 — Wire missing endpoints
- [ ] **B.2.1** Add `useResendOtp()` mutation in `useAuthMutation.js`. Wire into login + signup OTP UI to replace "send-otp again" hacks.
- [ ] **B.2.2** Decide on `/auth/me` vs `/users/profile` (cross-platform). If `/auth/me` is canonical, add `useMe()` query.
- [ ] **B.2.3** Add `useUpdatePasswordMutation` if a "change password while logged in" UI exists (verify by grep).
- [ ] **B.2.4** Add `useUpdateMeMutation` similarly if a profile-edit UI exists.
- [ ] **B.2.5** Build the email-verification UX: `app/[lang]/verify-email/[token]/page.jsx` calling `GET /auth/verify-email-link`. Add `useSendVerificationCode` + `useVerifyEmail` mutations for in-app verification.
- [ ] **B.2.6** Add `useResendSetupEmail` mutation if whitelabel-setup-resend flow is expected.

#### B.3 — Bugfixes
- [ ] **B.3.1** Replace triple fallback in `ui/auth/setup-password/SetupPassword.js:80` with single canonical path.
- [ ] **B.3.2** Replace manual `isFormValid()` in `ui/auth/login/form/Form.js:210–220` with RHF's `formState.isValid`.
- [ ] **B.3.3** Translate fallback error string in `ui/auth/signup/host/continueSignupForm/ContinueSignupForm.js:93`.
- [ ] **B.3.4** Remove `console.log` from `ContinueSignupForm.js:80, 89`.

#### B.4 — Loading / error / boundary
- [ ] **B.4.1** Add `<SimpleLoading/>` (or sibling-equivalent) to `Login/Form.js`, `Signup/host/Form.js`, `ContinueSignupForm.js`, `ForgetPassword.js`, `ChangePassword.js` during `isLoading`.
- [ ] **B.4.2** Wrap each top-level auth page with `ErrorBoundary` from `ui/common/error/ErrorBoundary.jsx`.

#### B.5 — File-size splits (preserve styles strictly)
- [ ] **B.5.1** Split `services/new-backend/apiClient.js` (526) into `apiClient.js` + `apiRefresh.js` + `apiServerHelpers.js`. Façade re-export.
- [ ] **B.5.2** Split `hooks/reactQueryHooks/useAuthMutation.js` (351) into 4 sub-hooks. Façade re-export.
- [ ] **B.5.3** Split `utils/schemas/authSchema.js` (567) per-form. Re-export from `authSchema.js`.
- [ ] **B.5.4** Split `ui/auth/login/form/Form.js` (294) into `<EmailLoginPanel/>` and `<OtpLoginPanel/>`. **Style preservation note:** import the same `Form.module.css` into both extracted components; do not rename any class.
- [ ] **B.5.5** Split `ui/auth/signup/vendor/stepSix/StepSix.js` (336). **Style preservation strict.**
- [ ] **B.5.6** Split `ui/auth/signup/vendor/stepTwo/LocationSelector.js` (342). **Style preservation strict.**
- [ ] **B.5.7** Split `ui/auth/signup/vendor/stepTwo/StepTwo.js` (301). **Style preservation strict.**

### 7.C Mobile

#### C.1 — Bugfixes / consistency
- [ ] **C.1.1** Move push-token registration from `App.js:66` (raw `fetchWithTimeout`) into `services/authService.js` as `updatePushTokenAPI()`. Add `ENDPOINTS.AUTH.UPDATE_PUSH_TOKEN`. Call via `apiFetch`.
- [ ] **C.1.2** Drop `_legacyToken` parameter from `services/settingsService.js` and from `useUpdateProfile`, `useChangePassword`, `useUpdateNotificationSettings` callers. (`settingsService.js:27, 33, 44, 78, 81, 88, 95, 102, 109`)
- [ ] **C.1.3** Decide on `/auth/me` vs `/users/profile` and migrate `useProfile()` to canonical (cross-platform with B.2.2).
- [ ] **C.1.4** After backend response shapes are locked (A.1), drop the `data.data?.x || data.x` fallbacks in `authService.js` (L62–65, 131–134, 205–208, 284–289, 352–357, 539–542, 562–565, 592–595).
- [ ] **C.1.5** Wire `resendOTPAPI` (defined but no consumer) into login/signup OTP screens.
- [ ] **C.1.6** Remove TODO comment in `App.js:7` (install presumed done).

#### C.2 — File-size split
- [ ] **C.2.1** Split `services/authService.js` (596) into `services/auth/{loginService, signupService, passwordService, sessionService}.js`. `authService.js` becomes a façade.

#### C.3 — Comment hygiene (only if user wants strict C8)
- [ ] **C.3.1** Decision pending: keep Phase 1a / Phase 4 W3-WL / FLOW-XX-FYY / H-4 markers OR delete them. Default: keep.

### 7.D Cross-platform alignment (do AFTER A/B/C)

- [ ] **D.1** Re-grep both web and mobile for every auth endpoint and confirm path + method + body shape match the backend (after A.1 schemas are locked).
- [ ] **D.2** Confirm both platforms read response fields from the *same* canonical path (no fallbacks).
- [ ] **D.3** Manual smoke test: login (email + OTP), signup (host phone + vendor multipart + whitelabel multipart), forgot/reset, setup-password, change-password, complete-profile, email-verify, refresh-on-401, logout — on web and on mobile.
- [ ] **D.4** Run `npm run lint` in each repo and resolve new warnings (no auto-fix that touches styles).

---

## 8. Locale-key additions required

(For the user — agent does NOT modify locale JSON without explicit approval.)

- `errors.complete_profile_failed` (en: "Failed to complete profile. Please try again.", ar: "فشل إكمال الملف. حاول مجددًا.") — to replace the hardcoded fallback in `ContinueSignupForm.js:93`.
- Email-verification namespace (if B.2.5 lands): `verifyEmail.title`, `verifyEmail.cta`, `verifyEmail.success`, `verifyEmail.error.invalidLink`, `verifyEmail.error.expired`, `verifyEmail.resendCta`, `verifyEmail.codeSent`.
- Resend-OTP UX (if B.2.1 lands): `auth.otp.resendCta`, `auth.otp.resendCooldown`.

---

## 9. Rollback plan

- Each implementation item is a separate commit. Rollback = `git revert` of that commit.
- The schema-application items (A.1.1–A.1.9) are individually revertable; if a deployed schema rejects a legitimate request, revert just that schema's commit.
- The file-splits (A.7, B.5, C.2) are pure code moves with façade re-exports. Rollback = revert the move; the façade preserves the same exports so consumers don't change.
- No DB migrations in this plan.

---

## 10. Acceptance checklist (run after Phase 2)

- [ ] No file in module exceeds the cap (backend, web, mobile).
- [ ] Every auth endpoint runs through a Joi schema (the 12 currently unprotected endpoints all gated).
- [ ] Every signup + logout endpoint has a rate limiter.
- [ ] Audit log entries appear for vendor signup, whitelabel signup, signup-OTP verify, complete-profile, update-me.
- [ ] All current Swagger annotations match request/response shape (response field paths + status codes).
- [ ] No `console.log` in committed web code; no `console.error` in committed backend service code (logger only).
- [ ] No fallback chains in web/mobile data mapping (single canonical path per response).
- [ ] Email-verification flow works end-to-end on web (B.2.5).
- [ ] Resend-OTP works on web + mobile (B.2.1, C.1.5).
- [ ] `/auth/me` vs `/users/profile` decision made and both platforms aligned.
- [ ] `npm run lint` clean (no new warnings) in `labbe-backend-/`, `labbe/`, `halla-mobile/`.
- [ ] Visual smoke test of every auth page (web) and screen (mobile) before/after — no pixel diff.

---

## 11. Implementation log (Phase 2 — to be filled in)

(Empty until user gives green light.)
