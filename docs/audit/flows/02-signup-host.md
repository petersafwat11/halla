# 02 — signup-host

## One-paragraph description
Host registration flow: user provides phone number → backend sends OTP to phone → user verifies OTP with code → account created in active status with host role → user can optionally complete profile immediately or defer. Flow is available on both web and mobile, with separate entry points. Upon successful OTP verification, user is logged in with JWT token.

## Scope tags
[web] [backend] [mobile]

## Roles involved
Host (newly created)

## Entry points
Web signup page: `labbe/app/[lang]/(auth-layout)/signup/page.js:1`
Web OTP verification: `labbe/app/[lang]/(auth-layout)/signup/continue-signup/page.js:1`
Mobile signup screen: `halla-mobile/screens/SignupScreen.js:26` (handleRoleSelection → setStep("mobile"))
Backend OTP send: `labbe-backend-/src/modules/auth/auth.routes.js:278` (POST /otp/send-signup)
Backend OTP verify: `labbe-backend-/src/modules/auth/auth.routes.js:308` (POST /otp/verify-signup)
Backend signup service: `labbe-backend-/src/modules/auth/auth.service.js` (signupWithPhone methods)

## Exit / terminal states
Success: User account created with status "active", role "host", JWT token issued, logged in.
Failure: Phone already registered (checkDuplicates at labbe-backend-/src/modules/auth/auth.routes.js:61), OTP invalid/expired, too many OTP attempts (max 3 at labbe-backend-/src/modules/auth/otp.service.js:16).
Abandoned: User exits signup without completing OTP verification; no account created.

## Touched modules
**Backend:**
- `labbe-backend-/src/modules/auth/auth.routes.js` (routes 278-308 for OTP send/verify)
- `labbe-backend-/src/modules/auth/auth.controller.js` (sendSignupOTP:133, verifySignupOTP:153)
- `labbe-backend-/src/modules/auth/auth.service.js` (sendSignupOTP, verifySignupOTP methods)
- `labbe-backend-/src/modules/auth/otp.service.js` (OTP generation, verification, TTL)
- `models/UserModel.js` (User creation, phone normalization)
- `labbe-backend-/src/shared/middleware/validation.js` (validatePhone)
- `labbe-backend-/src/shared/middleware/rateLimiter.js` (otpLimiter, otpHourlyLimiter)

**Web:**
- `labbe/app/[lang]/(auth-layout)/signup/page.js` (initial signup form)
- `labbe/app/[lang]/(auth-layout)/signup/continue-signup/page.js` (OTP verification step)
- `labbe/ui/auth/signup/host/Form.js` (signup form component)
- `labbe/ui/auth/signup/host/OTPVerification.jsx` (OTP input component)
- `labbe/stores/authStore.js` (state: otpSent, otpPhone; setters: setOTPSent)

**Mobile:**
- `halla-mobile/screens/SignupScreen.js` (host signup flow orchestration)
- `halla-mobile/components/auth/SignupMobileForm.js` (phone input form)
- `halla-mobile/components/auth/OTPVerificationForm.js` (OTP verification form)
- `halla-mobile/components/auth/CompleteProfileForm.js` (profile completion form)
- `halla-mobile/stores/authStore.js` (methods: signupWithPhone, verifySignupOTP)
- `halla-mobile/services/authService.js` (APIs: sendOTPAPI, verifySignupOTPAPI)

## Dependencies on other flows
- **Flow 01 (auth-foundation)**: Uses token generation from signToken() after OTP verification
- **Flow 07 (profile-settings)**: User can complete profile in this flow or defer to later

## Known divergences (web ↔ mobile, frontend ↔ backend)
Web signup is server-side rendered (Next.js page); mobile uses React Native screens and client-side state.
Mobile can navigate away (e.g., to vendor or whitelabel signup at line 55-57) mid-flow; web form is linear.
Profile completion on mobile (CompleteProfileForm at SignupScreen.js:93) integrated into signup flow; web defers to separate step.

## Open questions
1. After OTP verification, is profile completion mandatory or optional? Line 163 in auth.controller.js returns profileCompleted flag, but flow doesn't enforce it. completion is mandatory so if the user didn't complete his profile and go out them tried to login with this number again then he must complete his profile frist before redirecting to dashboard 

**Type B — Behavior critique**
**Bucket 5 — Mixed (Peter's intent is correct; current code does NOT enforce it — this is a bug)**

Peter's answer: completion is mandatory. If a user exits before completing their profile and tries to log in again with the same number, they must complete their profile before accessing the dashboard.

Code reality: the backend returns `profileCompleted: false` in the OTP-verify response (`auth.controller.js:153–167`) and the login OTP-verify path reads it from `user.profile?.hostData?.profileCompleted ?? true` (`auth.service.js:614`). However:
- The `protect` middleware (`auth.js:32–120`) does NOT check `profileCompleted` at any point.
- No route group wraps dashboard routes with a `requireCompleteProfile` guard.
- The mobile `verifySignupOTP` store method (`authStore.js:177–204`) sets `status: "unauthenticated"` after OTP, correctly deferring authentication — but `completeProfile` sets `status: "authenticated"` only after calling the API. If the user force-kills the app between OTP and completeProfile, restoreSession will read an `unauthenticated` state and the navigation guard must intercept.

**Required fixes:**
- Backend: add a `requireCompleteProfile` middleware that reads `user.profile.hostData.profileCompleted`; attach it to all host dashboard routes.
- Web: after OTP verification, store the temporary token in auth state with a `pendingProfileCompletion: true` flag; redirect to `/signup/continue-signup`; the `ContinueSignupForm` already checks `isAuthenticated` and redirects back to `/signup` if not authenticated — this guard can be extended to also redirect hosts with `pendingProfileCompletion: true` to the complete-profile page instead of the dashboard.
- Mobile: existing flow is structurally correct (OTP → status:unauthenticated → completeProfile → status:authenticated); navigation guards must use `status !== "authenticated"` to block dashboard access.
2. Does phone normalization (normalizePhoneNumber at auth.service.js) handle international formats? What format is stored? we currently needs it to work with saudi arabia numbers only so u may need to delete what is not used 

**Type A — Code lookup + Type C — Product decision**
**Bucket 4 — Enhanced (Egypt support confirmed in code; Peter explicitly wants it removed)**

Code reality: `labbe-backend-/src/shared/utils/phone.js:14–100` has both `normalizePhoneNumber` and `validateAndFormatPhone` supporting two countries:
- Saudi Arabia: `05xx` → `966xx`, bare `5xx` → `966xx`
- Egypt: `01xx` → `20xx`

Stored format is E.164 without the `+` prefix (e.g., `966501234567`).

**Decision: remove Egypt support.** Delete the Egypt branch from both `normalizePhoneNumber` (lines 33–41) and `validateAndFormatPhone` (lines 76–87) in `phone.js`. Keep Saudi Arabia normalization only. If any existing Egyptian numbers are in the database, a one-time migration script or manual cleanup is needed before deploy.
3. Email is optional during host signup — should it be requested during profile completion (Flow 07)? optional because we create an acc when he puts his number and otp but he must complete his profile before redirecting to dashboard including his email and full name etc, 

**Type C — Product decision**
**Bucket 1 — Kept as-is**

Email is NOT collected during the OTP signup step — that step only requires phone number and OTP code. Email (along with full name / username and password) is collected during profile completion. This is correct and matches the web `ContinueSignupForm` (`labbe/ui/auth/signup/host/continueSignupForm/ContinueSignupForm.js:46–52`) which collects `username`, `email`, `password`, `passwordConfirm` via the `hostProfileCompletionSchema`. Backend `completeHostProfile` (`auth.service.js:809–838`) accepts exactly those four fields and sets `profileCompleted: true`. No change needed to the data model for this question.
4. Mobile completeProfile (SignupScreen.js:93) — what data is required? (fullName, bio, company, etc.) complete profile for mobile should be identical to web complete profile please refer to the web page for complete profile

**Type A — Code lookup**
**Bucket 4 — Enhanced (confirmed web fields from code; mobile must match)**

Web complete-profile form (`ContinueSignupForm.js:46–52`) collects exactly four fields via `hostProfileCompletionSchema`:
- `username` (displayed as "Full Name")
- `email`
- `password`
- `passwordConfirm`

Backend `completeHostProfile` (`auth.service.js:809–838`) accepts `username`, `email`, `password`, `passwordConfirm` via PATCH to `/auth/complete-profile`. The mobile `completeProfileAPI` (`authService.js:322–367`) already sends these same four fields via Bearer token.

**Decision:** mobile complete-profile screen must present exactly these four fields (full name, email, password, confirm password) — identical to the web form. No bio or company fields. No deviation from the four-field schema. If the current `CompleteProfileForm` component on mobile collects different fields, it must be updated to match.
5. Web continue-signup page (signup/continue-signup/page.js) — does it validate that user came from initial signup step? why we need to validate it came from the signup?it may come from login when he created acc and didn't compelete profile then tried to login then should be redirected to the complete profile page as well

**Type B — Behavior critique**
**Bucket 2 — Clarified**

Peter's point: there is no need to validate the referrer — the page is legitimately reached from both the signup flow AND the login flow (when a user created an account but never completed their profile, then tries to log in again).

Code reality: `ContinueSignupForm.js:63–67` has a `useEffect` that checks `if (!isAuthenticated) router.push(/${currentLocale}/signup)`. This is the correct guard — anyone without a valid auth session is redirected away. Since the backend issues a token after OTP verification (even before profileCompleted=true), `isAuthenticated` is truthy for the incomplete-profile user. The web flow correctly reaches this page from both paths.

**No origin validation needed.** The only required addition is that the login flow explicitly redirects hosts with `profileCompleted: false` to `/signup/continue-signup` instead of the host dashboard. This redirect should be in the login success handler (web auth store or login page), not on the continue-signup page itself.
6. OTP expiry is 5 minutes (otp.service.js:15) — is this configurable per environment? 5m in all enviroments 

**Type A — Code lookup + Type C — Product decision**
**Bucket 1 — Kept as-is**

Code reality: `labbe-backend-/src/modules/auth/otp.service.js:13–18` defines `OTP_CONFIG` as a module-level constant (not read from env): `{ length: 6, expiryMinutes: 5, maxAttempts: 3, cooldownSeconds: 30 }`. There is no environment-variable override path.

**Decision confirmed: 5 minutes in all environments.** No env-var configurability is needed. The hardcoded constant is acceptable. Document: OTP is 6 digits, expires in 5 minutes, max 3 attempts before cooldown, 30-second resend cooldown. OTPs are hashed with SHA256 before storage in MongoDB; verification uses `crypto.timingSafeEqual` to prevent timing attacks.

## Notes from answer pass

1. **profileCompleted enforcement is the most critical bug in this flow.** The backend returns the flag but no middleware enforces it. Until a `requireCompleteProfile` guard is added to all host dashboard routes (backend) and both frontends redirect incomplete-profile users appropriately, a host can bypass profile completion entirely by navigating directly to the dashboard URL.

2. **Egypt phone normalization must be removed.** `labbe-backend-/src/shared/utils/phone.js` currently supports Saudi Arabia and Egypt. Only Saudi Arabia support is needed. The Egypt branch must be deleted from both utility functions before production.

3. **`profile.hostData.profileCompleted` vs root-level field ambiguity.** The `profileCompleted` flag is nested at `profile.hostData.profileCompleted` (UserModel line 29). The `verifyLoginOTP` path reads it as `user.profile?.hostData?.profileCompleted ?? true` (defaulting to `true` when the field is absent — this is a permissive default that could allow old accounts to bypass the check). The `completeHostProfile` service sets it as `profile.hostData.profileCompleted = true`. Confirm these paths are consistent and the default is not silently permissive for new accounts.

4. **Resend OTP cooldown not mentioned in UI.** The 30-second cooldown (`cooldownSeconds: 30` in `OTP_CONFIG`) should be surfaced in the UI as a countdown timer on the resend button. Verify this is implemented in both `labbe/ui/auth/signup/host/OTPVerification.jsx` and `halla-mobile/components/auth/OTPVerificationForm.js`.

---

## State machine

```
[anonymous]
     │ submit phone number
     ▼
[otp-pending]  ──── OTP expired / max attempts ──► [anonymous]
     │ correct OTP verified
     ▼
[account-created / token-issued]  ─── force-kill app ──► [unauthenticated / incomplete]
     │ complete profile (username, email, password, passwordConfirm)
     ▼
[profile-complete / authenticated]
     │
     ▼ (host dashboard)
```

Notes:
- Between [account-created] and [profile-complete], status is `active` but `profileCompleted = false`.
- `restoreSession` on next app open reads `unauthenticated` (mobile) and must route to complete-profile.
- OTP is 6 digits, SHA-256 hashed at rest, 5-min TTL, 3 max attempts, 30s resend cooldown.

---

## Data handoffs

| Step | Source | Payload | Destination |
|------|--------|---------|-------------|
| sendSignupOTP | `auth.controller.js:133` | `{ phoneNumber }` → normalized to E.164, OTP stored hashed | taqnyat SMS to user |
| verifySignupOTP | `auth.controller.js:153` | `{ phoneNumber, otp }` | `{ user, token, subscription, isNewUser, profileCompleted }` |
| completeHostProfile | `auth.controller.js:310` | `{ username, email, password, passwordConfirm }` | `user.profile.hostData.profileCompleted = true`, new JWT issued |
| persistAuth (mobile) | `authStore.js:62` | `{ user, token, role }` | AsyncStorage `@auth_state` |

---

## Role variations

This flow creates only the `host` role. The OTP send/verify endpoints are role-agnostic (also used for OTP login in Flow 05), but the `verifySignupOTP` service path creates the account with `role: 'host'` when `isNewUser = true`. The `completeHostProfile` endpoint is exclusively for hosts — vendors and whitelabel users complete their profiles during their respective signup flows and do not use this endpoint.

---

## Web ↔ mobile parity

| Capability | Web | Mobile | Gap |
|-----------|-----|--------|-----|
| OTP send form | `signup/page.js` → phone input | `SignupScreen.js` → phone input | Parity confirmed |
| OTP verify form | `continue-signup/page.js` → 6-digit OTP | `OTPVerificationForm.js` | Parity confirmed |
| Complete profile fields | `username, email, password, passwordConfirm` (ContinueSignupForm.js) | `CompleteProfileForm.js` — must be confirmed identical | Gap: mobile fields must be verified to match exactly |
| profileCompleted redirect | Web redirects to `/signup/continue-signup` if `profileCompleted: false` at login | Mobile sets `status: "unauthenticated"` after OTP; no guard if user bypasses | Gap: mobile navigation guard not fully enforced (see FLOW-02-F01) |
| Resend OTP countdown | Not confirmed | Not confirmed | Both must show 30s countdown timer |
| Egypt phone normalization | `phone.js` normalizes both SA and Egypt numbers | Same backend | Gap: Egypt normalization must be removed (FLOW-02-F03) |

---

## Edge cases & failure modes

1. **OTP verified, app killed before complete-profile:** Account exists in DB with `profileCompleted: false`. Next app open restores `unauthenticated` state. User calls `sendSignupOTP` again — backend's `checkDuplicates` at `auth.routes.js:61` will now block because the phone is already registered. User is stuck: cannot re-signup, cannot reach dashboard. The login OTP flow must detect `profileCompleted: false` and route to complete-profile.
2. **profileCompleted ?? true permissive default:** `auth.service.js:614` returns `profileCompleted ?? true` — a user whose `hostData` subdoc is missing (legacy account) silently passes as profile-complete. New accounts will always have the subdoc, but any old data migration must ensure the field is explicitly set.
3. **Egypt number stored, SA-only validation later:** If an Egyptian number was registered before the normalization removal, it will pass DB lookup but may fail any future SA-only phone validators.
4. **OTP replay within TTL:** OTP is not invalidated on first successful use — if the verify endpoint is called again with the same valid OTP within 5 minutes, verify the DB clears the OTP hash after first use.
5. **Concurrent OTP requests:** A user who calls `sendSignupOTP` twice within the 30s cooldown will get two active OTPs if rate limiting is bypassed. Ensure the previous OTP is overwritten, not accumulated.

---

## Findings

### FLOW-02-F01
- **Title:** `profileCompleted` not enforced in backend middleware or mobile navigation
- **Type:** High
- **Severity:** High
- **File:** `labbe-backend-/src/shared/middleware/auth.js:32`
- **Detail:** Peter confirmed profile completion is mandatory before dashboard access. The `protect` middleware does not check `user.profile.hostData.profileCompleted`. No backend route group wraps host dashboard routes with a `requireCompleteProfile` guard. On mobile, `AppNavigator.js` routes to `HostStack` for `status === "authenticated"` without checking `profileCompleted`. A host who calls `completeProfile` separately can bypass the OTP-based profile-completion flow.
- **Recommended change:** (1) Add `requireCompleteProfile` middleware to all host dashboard backend routes. (2) In web login success handler, redirect hosts with `profileCompleted: false` to `/signup/continue-signup`. (3) In mobile, after `verifyLoginOTP` and `loginWithEmail`, check `user.hostData?.profileCompleted === false` and navigate to `CompleteProfile` screen before setting `status: "authenticated"`.
- **Related:** FLOW-01-F05 (protect middleware gaps), FLOW-07-F01

### FLOW-02-F02
- **Title:** `profileCompleted ?? true` permissive default masks missing flag for legacy users
- **Type:** High
- **Severity:** High
- **File:** `labbe-backend-/src/modules/auth/auth.service.js:614`
- **Detail:** `verifyLoginOTP` returns `profileCompleted: user.profile?.hostData?.profileCompleted ?? true`. The `?? true` default means any user whose `hostData` subdoc is absent is treated as profile-complete. This silently bypasses the profile gate for legacy or malformed accounts. New hosts always get `hostData` on creation, but any DB inconsistency produces a false positive.
- **Recommended change:** Change default to `?? false` so missing `hostData` is treated as incomplete. Run a one-time migration to explicitly set `profileCompleted: true` on any active host accounts that have been using the platform successfully (confirming they completed their profile).
- **Related:** FLOW-02-F01

### FLOW-02-F03
- **Title:** Egypt phone normalization still present — SA-only required
- **Type:** Low
- **Severity:** Low
- **File:** `labbe-backend-/src/shared/utils/phone.js:33`
- **Detail:** `normalizePhoneNumber` lines 33–41 and `validateAndFormatPhone` lines 76–87 both contain Egypt (`01xx` → `20xx`) normalization branches. Peter confirmed the product is SA-only. The Egypt branch is dead code that could silently accept and store Egyptian numbers that should be rejected at signup.
- **Recommended change:** Delete the Egypt branch from both functions. Add a comment documenting SA-only support. If any Egyptian numbers exist in the production database, create a migration to flag them.
- **Related:** None

---

## Cross-flow notes

- **Flow 05 (login):** The `profileCompleted: false` interception required here (FLOW-02-F01) must also be implemented in the OTP login and email+password login success handlers. Same fix, same guard.
- **Flow 01 (auth-foundation):** The JWT issued after `verifySignupOTP` has a 90-day expiry (FLOW-01-F01). Until the dual-token architecture lands, incomplete-profile hosts hold a long-lived credential.
- **Flow 07 (profile-settings):** `completeHostProfile` endpoint is the same endpoint used here and in the settings update flow. Ensure the `profileCompleted` flag cannot be set back to `false` via `updateMe`.
- **Flow 06 (password-reset):** If a host with `profileCompleted: false` requests a password reset, the reset link must still route them to complete-profile after password change, not to the dashboard.
