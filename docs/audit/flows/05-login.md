# 05 — login

## One-paragraph description
User login flow with role-based entry points: (a) Host login via OTP — user provides phone → receives OTP → verifies code → logged in. (b) Vendor/Admin/Whitelabel login via email+password — user provides credentials → backend verifies → JWT issued → logged in. Different flows are triggered by role selection. Account must be in "active" status; if suspended/rejected/pending, login is denied.

## Scope tags
[web] [backend] [mobile]

## Roles involved
Host (OTP), Vendor (email+password), Admin (email+password), Whitelabel Admin (email+password)

## Entry points
Web login page: `labbe/app/[lang]/(auth-layout)/login/page.js:1`
Web login form: `labbe/ui/auth/login/form/Form.js` (role selector, phone/email form, OTP form)
Mobile login screen: `halla-mobile/screens/LoginScreen.js:1`
Backend email+password login: `labbe-backend-/src/modules/auth/auth.routes.js:251` (POST /login)
Backend OTP send for login: `labbe-backend-/src/modules/auth/auth.routes.js:329` (POST /otp/send-login)
Backend OTP verify for login: `labbe-backend-/src/modules/auth/auth.routes.js:362` (POST /otp/verify-login)

## Exit / terminal states
Success: User authenticated, JWT token issued, logged in with user data and subscription info.
Failure: Invalid credentials, account locked (too many login attempts), account status is not "active" (pending/suspended/rejected/inactive).
Abandoned: User exits login screen/form.

## Touched modules
**Backend:**
- `labbe-backend-/src/modules/auth/auth.routes.js` (routes 251, 329, 362 for login and OTP)
- `labbe-backend-/src/modules/auth/auth.controller.js` (login:64, sendLoginOTP:143, verifyLoginOTP:173)
- `labbe-backend-/src/modules/auth/auth.service.js` (login, sendLoginOTP, verifyLoginOTP methods)
- `labbe-backend-/src/modules/auth/otp.service.js` (OTP generation/verification for login)
- `models/UserModel.js` (password comparison, status validation, loginAttempts tracking)
- `labbe-backend-/src/shared/middleware/rateLimiter.js` (authLimiter, otpLimiter)
- `labbe-backend-/src/shared/constants/status.js` (user status checks)

**Web:**
- `labbe/app/[lang]/(auth-layout)/login/page.js:1` (login entry point)
- `labbe/ui/auth/login/form/Form.js` (main login form component)
- `labbe/ui/auth/login/form/PhoneForm.js` (host OTP login form)
- `labbe/ui/auth/login/form/EmailForm.js` (vendor/admin email+password form)
- `labbe/ui/auth/login/form/otpInput/OtpInput.js` (OTP input component)
- `labbe/stores/authStore.js` (state setters: setUser, setToken, setSubscription, setLoading, setError)

**Mobile:**
- `halla-mobile/screens/LoginScreen.js:1` (login entry point)
- `halla-mobile/services/authService.js` (loginWithEmailAPI:8, sendOTPAPI, verifyOTPAPI)
- `halla-mobile/stores/authStore.js` (loginWithEmail:76, sendOTP:102, verifyOTP:120 methods)

## Dependencies on other flows
- **Flow 01 (auth-foundation)**: Uses token generation and storage from this flow
- **Flow 02 (signup-host)**: Hosts first login after signup completion
- **Flow 03 (signup-vendor)**: Vendors first login after admin approval
- **Flow 05 itself**: OTP login flow depends on sendLoginOTP → verifyLoginOTP sequence

## Known divergences (web ↔ mobile, frontend ↔ backend)
Web login form includes role selector dropdown; mobile login may be role-specific (confirm structure). (mobile and web login should be identical and serve all roles the same way so any role host , vendor or admin or whitelabel all can login with number and otp or email and password login is role agnostic) 
OTP delivery: backend uses SMS (taqnyat service); web/mobile both receive same SMS.
Account lockout: backend enforces (user.lockUntil at auth.service.js:124); mobile doesn't check lock status. (add it to the mobile)
Subscription fetch: backend includes subscription summary; mobile may not load subscription on login. (should use the same endpoint and save it teh same way as web)

## Open questions

**Q1: Role selector on web login — what are the options?**

A: [CLARIFIED FROM PETER]

**Current behavior:** `labbe/ui/auth/login/form/Form.js` has NO role selector dropdown. The form uses `loginType` state (`"otp"` or `"email"`) to toggle between OTP (phone) and email+password, and the user role is determined server-side from the credential. After successful login, the client reads `result.user.role` and navigates to the appropriate dashboard (Form.js:106-124).

**Assessment:** CORRECT

**Why:** Login is fully role-agnostic. Any role (Host, Vendor, Admin, Whitelabel) can use either OTP or email+password — the backend finds the user by credential and returns the role. No role selector is present or needed.

**Recommended change:** None for web. Mobile mirrors this correctly (LoginScreen.js:31-66: `loginMethod` toggles `"mobile"`/`"email"`, no role selector).

Source: `labbe/ui/auth/login/form/Form.js:55,105-124`, `halla-mobile/screens/LoginScreen.js:31-66`

---

**Q2: Email+password login (EmailForm.js) — what validation?**

A: [KEPT FROM PETER]

**Current behavior:** Web uses Zod `emailLoginSchema` (Form.js:72). Backend enforces `password.minlength: 8` at `UserModel.js:273`. Mobile `EmailLoginForm` component validation is not separately inspected but relies on the same schema pattern.

**Assessment:** WEAK

**Why:** Peter confirmed the rule: email format must be valid, password must be at least 8 characters. This must be enforced consistently on frontend in all password fields: login, signup, settings/change-password. Backend already enforces 8-char minimum at the model level.

**Recommended change:** Audit all frontend password fields (web and mobile) to confirm `minLength: 8` is in every Zod/form schema. Specifically check: signup forms, change-password form, setup-password form, and update-password form.

Source: `labbe-backend-/models/UserModel.js:273`, `labbe/ui/auth/login/form/Form.js:72`

---

**Q3: Account lockout threshold — how many failed login attempts before lockout?**

A: [CLARIFIED FROM PETER]

**Current behavior:** `UserModel.js:602` defines `MAX_LOGIN_ATTEMPTS = 5`. After 5 consecutive failed password attempts, the account is locked.

**Assessment:** CORRECT

**Why:** Code matches Peter's stated requirement of 5 wrong attempts.

Source: `labbe-backend-/models/UserModel.js:602`

---

**Q4: Lockout duration — how long is user locked?**

A: [CLARIFIED FROM PETER — REQUIRES CODE CHANGE]

**Current behavior:** `UserModel.js:603` defines `LOCK_TIME = 15 * 60 * 1000` — **15 minutes**. The `auth.service.js:125` reads back the remaining lock time and returns it in the error.

**Assessment:** CONFLICTS-WITH-GATE-1-DECISION

**Why:** Peter specified 30 minutes as the lockout duration. Code currently locks for 15 minutes.

**Recommended change:** Change `UserModel.js:603` from `15 * 60 * 1000` to `30 * 60 * 1000` (30 minutes).

Source: `labbe-backend-/models/UserModel.js:603`, `labbe-backend-/src/modules/auth/auth.service.js:125`

---

**Q5: After account locked, can user use forgot-password to reset and unlock?**

A: [PETER DECISION]

**The choice:** (a) User must wait for lock timer to expire. (b) User can use forgot-password while locked, and a successful password reset clears the lock.

**Recommendation:** Option (b) — allow password reset to unlock the account.

**Why:** The current `resetPassword` in `auth.service.js:719-722` sets `user.password`, clears `passwordResetToken/Expires`, and sets `passwordChangedAt`, but does NOT clear `loginAttempts` or `lockUntil`. This means a locked user who successfully resets their password is still locked. Industry standard (OWASP) recommends that a successful password reset implies identity verification and should clear the lock. Forcing a locked user to wait 30 minutes after verifying their identity via email is unnecessarily hostile.

**Trade-offs:** Clearing the lock on reset is slightly more permissive, but since the reset link requires access to the registered email inbox, it constitutes sufficient identity proof.

**Recommended change:** Add `user.loginAttempts = 0; user.$unset = { lockUntil: 1 }` (or equivalent `updateOne` call) inside `auth.service.js:resetPassword` after a successful token validation.

Source: `labbe-backend-/src/modules/auth/auth.service.js:699-731`

---

**Q6: Subscription data returned on login — what fields?**

A: [KEPT FROM PETER]

**Current behavior:** `auth.controller.js:65` returns `{ subscription }` from `authService.getUserSubscription(user._id)`. `auth.service.js:82-91` fetches the active/trial subscription, populates `planId`, and calls `subscription.getSummary()`. The summary shape is defined in `SubscriptionModel.getSummary()` (not inspected here).

**Assessment:** CORRECT (partial — needs product verification of summary fields)

**Why:** Peter confirmed subscription is used in the create-event page to gate new event creation, and a plan badge must be shown in the navbar. The `getSummary()` call should return at minimum: `planId`, `planName`, `status`, `renewDate`, `eventsRemaining` / `guestsRemaining`. Verify `SubscriptionModel.getSummary()` exposes all fields needed by the badge and the event creation gate.

**Recommended change:** Confirm `getSummary()` includes all badge-necessary fields. If not, extend it. Both web and mobile login responses must carry this data.

Source: `labbe-backend-/src/modules/auth/auth.controller.js:65`, `labbe-backend-/src/modules/auth/auth.service.js:82-91`

---

**Q7: Mobile — does OTP login work for all roles?**

A: [CLARIFIED FROM PETER]

**Current behavior:** Mobile implements both methods. `authStore.js:102` (`sendOTP`) and `authStore.js:120` (`verifyOTP`) handle OTP login. `authStore.js:76` (`loginWithEmail`) handles email+password. `LoginScreen.js:31` uses `loginMethod` state (`"mobile"`/`"email"`) to switch — no role restriction.

However, there is a bug at `authStore.js:80`: `const role = user.role || "vendor"` — if the server omits `role` in the response, email login defaults to `"vendor"`. Similarly `authStore.js:129`: `const role = user.role || "host"` — OTP login defaults to `"host"`. These fallbacks mask response parsing bugs.

**Assessment:** WEAK

**Why:** Both login methods exist and are role-agnostic by design (correct per Peter), but the hardcoded role fallbacks are dangerous. The server always returns `user.role`; the fallbacks should be removed or replaced with an error state so bugs surface immediately.

**Recommended change:** Remove the `|| "vendor"` and `|| "host"` fallbacks. Throw an error or log a warning if `user.role` is missing in the response.

Source: `halla-mobile/stores/authStore.js:80,102,120,129`, `halla-mobile/screens/LoginScreen.js:31-66`

---

## State machine

```
[unauthenticated]
     │
     ├─ email+password login ──► validate creds ──► (lockout check) ──► status check ──► JWT issued
     │                                                     │
     │                                             5 failures → [locked 15min, should be 30min]
     │
     └─ OTP login ──► send OTP (taqnyat) ──► verify OTP ──► status check ──► JWT issued
                                                │
                                      max 3 attempts → rate-limited
     │
     ▼
[authenticated]
     │ profileCompleted check (missing — see FLOW-02-F01)
     ▼
[dashboard] or [complete-profile screen] (only if guard implemented)
```

---

## Data handoffs

| Step | Source | Payload | Destination |
|------|--------|---------|-------------|
| email+password login | `auth.controller.js:64` | `{ email/phone, password }` | `{ user, token, subscription }` |
| OTP send-login | `auth.controller.js:143` | `{ phoneNumber }` | OTP stored hashed; taqnyat SMS sent |
| OTP verify-login | `auth.controller.js:173` | `{ phoneNumber, otp }` | `{ user, token, subscription, isNewUser, profileCompleted }` |
| loginWithEmail (mobile) | `authStore.js:76` | `{ email, password }` | `persistAuth({ user, token, role })` → AsyncStorage |
| verifyOTP (mobile) | `authStore.js:120` | `{ phoneNumber, otp }` | `persistAuth({ user, token, role })` → AsyncStorage |
| lock state (backend) | `auth.service.js:125` | remaining lock milliseconds | Error response: "Account locked. Try again in X minutes" |

---

## Role variations

Login is fully role-agnostic. The same email+password endpoint and the same OTP endpoints serve all roles. The backend finds the user by credential and returns `user.role`. The frontend reads `role` and routes to the appropriate navigator (HostStack, VendorStack, AdminStack, etc.). No role selector is needed or present.

One role-specific case: hosts with `profileCompleted: false` must be routed to the complete-profile screen after successful OTP login. This check is missing on both web (login success handler) and mobile (`AppNavigator.js`) — see FLOW-02-F01.

---

## Web ↔ mobile parity

| Capability | Web | Mobile | Gap |
|-----------|-----|--------|-----|
| Login methods | Email+password + OTP (toggle via `loginType`) | Email+password + OTP (toggle via `loginMethod`) | Parity confirmed |
| Role selector | None (role determined server-side) | None | Parity confirmed |
| Account lockout error display | `auth.service.js:125` error surfaced to UI | Not confirmed — lockout error may be swallowed | Gap: mobile must surface lockout state with countdown |
| profileCompleted redirect | Partial — depends on login success handler implementation | Not implemented in `AppNavigator.js` | Gap: both platforms need this guard (FLOW-02-F01) |
| Subscription data on login | `auth.controller.js:65` returns `subscription` | `loginWithEmail` and `verifyOTP` in `authStore.js` — confirm subscription saved | Verify subscription stored in mobile Zustand state |
| Role fallback | N/A | `|| "vendor"` and `|| "host"` hardcoded defaults | Gap: fallbacks mask server response parsing bugs (FLOW-05-F02) |
| Token storage | HttpOnly cookie | AsyncStorage (plain-text) | Gap: inherits FLOW-01-F03 |

---

## Edge cases & failure modes

1. **Locked user attempts OTP login:** Account lockout (`lockUntil`) is checked in the email+password path (`auth.service.js:125`). Confirm whether it is also checked in `verifyLoginOTP`. If not, a locked user can bypass the lockout by switching from email+password to OTP login with the same phone number.
2. **Unknown role defaults to HostStack (mobile):** `AppNavigator.js:326` default case routes to `HostStack` for unrecognized roles. If a vendor logs in and the role is not mapped, they see the host dashboard silently.
3. **`profileCompleted` not checked post-login:** Described in FLOW-02-F01. Both login paths (email+password and OTP) return `profileCompleted` in the response. Neither web login success handler nor mobile `AppNavigator.js` acts on it.
4. **OTP login for non-existent number returns same error as wrong OTP:** `sendLoginOTP` should not reveal whether a phone number is registered. Confirm the error messages are identical for "number not found" and "OTP incorrect" to prevent user enumeration.
5. **Concurrent login from multiple devices:** A second login from a new device issues a new token without invalidating the first. Under 90-day JWT, both devices remain authenticated indefinitely. Under the Gate-1 refresh-token model, the old refresh token would be rotated out on next use.

---

## Findings

### FLOW-05-F01
- **Title:** Account lock duration is 15 min — Gate-1 requires 30 min
- **Type:** CONFLICT
- **Severity:** Medium
- **File:** `labbe-backend-/models/UserModel.js:609`
- **Detail:** `LOCK_TIME = 15 * 60 * 1000` (15 minutes). Peter confirmed 30 minutes. Also: `resetPassword` in `auth.service.js` does not clear `loginAttempts` or `lockUntil` after a successful password reset, meaning a locked user who resets their password remains locked until the timer expires.
- **Recommended change:** Change `LOCK_TIME` to `30 * 60 * 1000` in `UserModel.js`. Add `user.loginAttempts = 0; user.lockUntil = undefined` inside `resetPassword` in `auth.service.js` after successful token validation.
- **Related:** FLOW-01-F07 (same constant, fix once)

### FLOW-05-F02
- **Title:** Mobile role fallbacks `|| "vendor"` and `|| "host"` mask response parsing bugs
- **Type:** Medium
- **Severity:** Medium
- **File:** `halla-mobile/stores/authStore.js:80`
- **Detail:** `loginWithEmail` at line 80 stores `role = user.role || "vendor"`. `verifyOTP` at line 129 stores `role = user.role || "host"`. The server always returns `user.role`; these fallbacks exist to handle a missing field that should never be missing. If the response shape changes or a parsing error occurs, the user is silently routed to the wrong dashboard with incorrect permissions.
- **Recommended change:** Remove both fallbacks. If `user.role` is absent in the response, throw an error and route to the login screen with a generic "Something went wrong" message.
- **Related:** FLOW-05-F03

### FLOW-05-F03
- **Title:** Unknown role defaults silently to HostStack in mobile navigator
- **Type:** Medium
- **Severity:** Medium
- **File:** `halla-mobile/navigation/AppNavigator.js:326`
- **Detail:** The default case in the role-based navigator switch statement routes unrecognized roles to `HostStack`. A vendor or admin whose role is not mapped (e.g., new role added to backend without mobile update, or role fallback from FLOW-05-F02) will see the host dashboard with no error.
- **Recommended change:** Change the default case to render an error screen or log out the user: show "Unsupported account type — please contact support." This surfaces missing role mappings immediately instead of silently misrouting users.
- **Related:** FLOW-05-F02

---

## Cross-flow notes

- **Flow 01 (auth-foundation):** The JWT issued at login has a 90-day expiry (FLOW-01-F01). Every role inherits this gap. The lock duration fix (FLOW-05-F01) is the same code change as FLOW-01-F07 — fix in `UserModel.js` once.
- **Flow 02 (signup-host):** The `profileCompleted: false` redirect required after OTP login is the same guard required after OTP signup. Implement once in the login success handler and reuse.
- **Flow 06 (password-reset):** Q5 in this file already captures the `resetPassword` + `lockUntil` gap. FLOW-05-F01 and FLOW-06-F02 describe the same fix — implement together.
- **Flow 04 (signup-whitelabel):** Whitelabel admin first login after Phase 2 uses email+password. Confirm the login success handler routes `whitelabel_admin` role to the whitelabel dashboard, not a generic fallback.
