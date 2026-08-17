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
2. Does phone normalization (normalizePhoneNumber at auth.service.js) handle international formats? What format is stored? we currently needs it to work with saudi arabia numbers only so u may need to delete what is not used 
3. Email is optional during host signup — should it be requested during profile completion (Flow 07)? optional because we create an acc when he puts his number and otp but he must complete his profile before redirecting to dashboard including his email and full name etc
4. Mobile completeProfile (SignupScreen.js:93) — what data is required? (fullName, bio, company, etc.) complete profile for mobile should be identical to web complete profile please refer to the web page for complete profile
5. Web continue-signup page (signup/continue-signup/page.js) — does it validate that user came from initial signup step? why we need to validate it came from the signup?it may come from login when he created acc and didn't compelete profile then tried to login then should be redirected to the complete profile page as well
6. OTP expiry is 5 minutes (otp.service.js:15) — is this configurable per environment? 5m in all enviroments 
