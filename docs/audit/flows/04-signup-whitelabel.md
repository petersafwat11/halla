# 04 — signup-whitelabel

## One-paragraph description
Whitelabel partner flow in two phases: (1) Application phase (both web and mobile) — partner fills 5-step signup form (email, phone, englishName, arabicName, logo) → submitted with status "pending". (2) Post-approval setup-password phase — admin approves → system emails setup link with token → whitelabel partner clicks link → validates token → sets password → account activated. Phase 1 is complete on both web and mobile; Phase 2 (setup-password) is **CONFIRMED MISSING on mobile** and only exists on web.

## Scope tags
[web] [backend] [mobile]

## Roles involved
Whitelabel Admin (applicant & post-approval user), Super Admin (approver)

## Entry points
Web whitelabel signup: `labbe/app/[lang]/signup-whitelabel/page.js:1`
Mobile whitelabel signup: `halla-mobile/screens/SignupScreen.js:57` (handleRoleSelection → navigate("WhitelabelSignup"))
Backend whitelabel signup: `labbe-backend-/src/modules/auth/auth.routes.js:210` (POST /signup/whitelabel)
Backend setup-password validation: `labbe-backend-/src/modules/auth/auth.routes.js:491` (GET /validate-setup-token/:token)
Backend setup-password endpoint: `labbe-backend-/src/modules/auth/auth.routes.js:522` (POST /setup-password)

## Exit / terminal states
Phase 1 Success: Whitelabel account created with status "pending", logo stored, email sent to super_admin for review.
Phase 1 Failure: Email/phone already registered, invalid form data, logo upload fails.
Phase 2 Success: Admin approves, setup-password email sent, whitelabel clicks link, validates token, sets password, status → "active".
Phase 2 Failure: Setup token invalid/expired, password doesn't meet requirements, token validation fails. 
Abandoned: Whitelabel exits Phase 1 before submission, or doesn't complete Phase 2 within token expiry (~24h) (note by peter make the token expire in 7 days not 24 as this little time for them to respond).

## Touched modules
**Backend:**
- `labbe-backend-/src/modules/auth/auth.routes.js` (routes 210-555 for signup and setup-password flows)
- `labbe-backend-/src/modules/auth/auth.controller.js` (whitelabelSignup:117, validateSetupToken:385, setupPassword:410, resendSetupEmail:456)
- `labbe-backend-/src/modules/auth/auth.service.js` (signupWhitelabel, password setup token creation/validation methods)
- `labbe-backend-/src/shared/utils/fileUpload.js` (uploadLogo middleware at auth.routes.js:212)
- `models/UserModel.js` (passwordSetupToken, passwordSetupExpires fields)
- `labbe-backend-/src/infrastructure/email.js` (setup-password email template)
- `labbe-backend-/src/shared/constants/status.js` (whitelabel status: pending, active, rejected)

**Web:**
- `labbe/app/[lang]/signup-whitelabel/page.js:1` (Phase 1 signup entry point)
- `labbe/ui/auth/signup/whiteLabel/WhiteLabelForm.js` (5-step signup form)
- `labbe/app/[lang]/(auth-layout)/setup-password/` (Phase 2 setup-password page, if it exists)
- `labbe/stores/authStore.js` (state: setupTokenValid, setupTokenData)

**Mobile:**
- `halla-mobile/screens/SignupScreen.js:57` (Phase 1 navigation)
- `halla-mobile/screens/WhitelabelSignupScreen.js` (Phase 1 signup form screens) **[INCOMPLETE]**
- `halla-mobile/stores/authStore.js` (signupWhitelabel method) **[MISSING: Phase 2 support]**
- `halla-mobile/services/authService.js` (signupWhitelabelAPI) **[MISSING: Phase 2 APIs]**

## Dependencies on other flows
- **Flow 01 (auth-foundation)**: Uses token generation for Phase 1 signup, Phase 2 uses different token (passwordSetupToken)
- **Flow 05 (login)**: First login after Phase 2 setup uses email+password via login flow
- **Flow 07 (profile-settings)**: Whitelabel can configure additional settings after account activation

## Known divergences (web ↔ mobile, frontend ↔ backend)
**CRITICAL GAP: Mobile completely missing Phase 2 (setup-password) workflow.** Web has /setup-password route; mobile has no corresponding screen or service methods.
Phase 1 form: web WhiteLabelForm.js, mobile WhitelabelSignupScreen.js (structure may differ).
Logo upload: web uses FormData, mobile must use FileSystem API.
Email delivery: backend sends setup-password email (auth.controller.js:479), but mobile cannot receive/process it.

## Open questions

**Q1: Mobile Phase 2 (setup-password) — is this intentionally deferred or actually missing?**

A: [KEPT FROM PETER]

**Current behavior:** Mobile has no setup-password screen, no `validateSetupToken` call, and no `setupPassword` call in `halla-mobile/services/authService.js` or `halla-mobile/stores/authStore.js`. Phase 2 is entirely absent on mobile.

**Assessment:** BUG

**Why:** Product owner confirmed Phase 2 MUST be added to mobile. The whitelabel partner receives the setup email, clicks the link, and has no mobile-side handler. The web path exists only partially (see Q2).

**Recommended change:** Add `WhitelabelSetupPasswordScreen` to mobile, implement `validateSetupTokenAPI` and `setupPasswordAPI` in `halla-mobile/services/authService.js`, and add corresponding store methods.

Source: `halla-mobile/services/authService.js` (absent methods), `halla-mobile/stores/authStore.js` (absent methods)

---

**Q2: Web setup-password page at `labbe/app/[lang]/(auth-layout)/setup-password/` — does it exist?**

A:

**[NOT IMPLEMENTED — page does not exist in the codebase]**

The `(auth-layout)` directory contains only: `change-password`, `forget-password`, `login`, `signup`. No `setup-password` directory exists anywhere under `labbe/app/` or `labbe/ui/auth/`. The backend endpoints (`GET /validate-setup-token/:token` and `POST /setup-password`) are implemented and working, but there is no web page to receive the link from the admin approval email.

**Still required:**
- `labbe/app/[lang]/(auth-layout)/setup-password/[token]/page.js` — Next.js route. Token comes from the URL path (`[token]` segment, matching the backend's email link format `/setup-password/${setupToken}`).
- `labbe/ui/auth/setup-password/SetupPassword.js` — UI component with 4 states: `VALIDATING` (calls `GET /validate-setup-token/:token` on mount), `INVALID` (expired/bad token, shows "contact admin" + "Back to Login"), `FORM` (password + confirm inputs with strength checklist), `SUCCESS` (welcome screen + "Go to Dashboard" button).
- `labbe/ui/auth/setup-password/setupPassword.module.css` — matches change-password layout.
- `labbe/hooks/reactQueryHooks/useAuthMutation.js` — add `validateSetupToken` (GET mutation) and `setupPassword` (POST mutation; on success calls `setAuth` and sets cookies, logging the whitelabel admin in immediately).
- `labbe/utils/schemas/authSchema.js` — add `setupPasswordSchema` with min-8 + complexity + match validation.

---

**Q3: Setup token expiry — how long is the link valid?**

A: [CLARIFIED FROM PETER — REQUIRES CODE CHANGE]

**Current behavior:** `UserModel.js:552` sets `passwordSetupExpires = Date.now() + 24 * 60 * 60 * 1000` — **24 hours**.

**Assessment:** CONFLICTS-WITH-GATE-1-DECISION

**Why:** Peter confirmed the token should be valid for 7 days. 24 hours is too short for a whitelabel partner who may not check email immediately after admin approval.

**Recommended change:** Change `UserModel.js:552` to `Date.now() + 7 * 24 * 60 * 60 * 1000` (7 days). Also update any email template copy that states an expiry time.

Source: `labbe-backend-/models/UserModel.js:552`

---

**Q4: Can whitelabel resend setup email?**

A: [CLARIFIED FROM PETER — PARTIALLY IMPLEMENTED]

**Current behavior:** Backend endpoint exists: `POST /resend-setup-email` at `auth.routes.js:550`, implemented in `auth.controller.js:456`. However, no button or UI call exists in the admin dashboard (`labbe/ui/`) — grep across `labbe/ui` finds zero callers of `resendSetupEmail` or `resend-setup-email`.

**Assessment:** WEAK

**Why:** The backend is ready but the admin dashboard has no trigger. Admins cannot use this feature without directly calling the API.

**Recommended change:** Add a "Resend Setup Email" button in the whitelabel detail view in the admin dashboard (wherever whitelabel accounts are managed), wired to `POST /api/v2/auth/resend-setup-email` with the whitelabel's email. Show only when `passwordSetupToken` is still active (status: pending, no password set).

Source: `labbe-backend-/src/modules/auth/auth.routes.js:550`, `labbe-backend-/src/modules/auth/auth.controller.js:456`

---

**Q5: After Phase 2 password setup, can whitelabel change password?**

A: [KEPT FROM PETER]

**Current behavior:** `PATCH /update-password` is implemented in `auth.controller.js:241` and `auth.service.js:741`. It accepts `currentPassword`, `newPassword`, `passwordConfirm` and is protected by the `protect` middleware — accessible to any authenticated user including `whitelabel_admin`.

**Assessment:** CORRECT

**Why:** The endpoint is role-agnostic and accessible to any authenticated user. Whitelabel admins can change their password after completing Phase 2 setup.

**Recommended change:** Verify that whitelabel settings pages on both web and mobile include a "Change Password" form that calls this endpoint. This is a parity check item.

Source: `labbe-backend-/src/modules/auth/auth.controller.js:241`, `labbe-backend-/src/modules/auth/auth.service.js:741`

---

**Q6: Logo storage — where are logos stored and served from?**

A: [KEPT FROM PETER]

**Current behavior:** `auth.service.js` currently stores vendor logos at `/uploads/logos/${filename}` (local filesystem, line ~338). The whitelabel logo field is in `whitelabelDataSchema` (`UserModel.js:152`).

**Assessment:** WEAK

**Why:** Peter confirmed all images must be stored in S3. Local filesystem storage does not work in horizontally-scaled deployments and is not production-safe.

**Recommended change:** Replace local `multer` disk storage with S3-backed storage (using `multer-s3` or a pre-signed upload flow) for all image uploads across the project: logos, portfolios, documents.

Source: `labbe-backend-/src/modules/auth/auth.service.js` (~line 338), `labbe-backend-/models/UserModel.js:152`

---

**Q7: Is whitelabel status transition automatic upon password setup, or does admin need to manually activate?**

A: [KEPT FROM PETER]

**Current behavior:** `setupPassword` in `auth.controller.js:410-450` clears the setup token fields and saves the user, but does NOT change `user.status`. The whitelabel account status is set to `USER_STATUS.PENDING` at creation (`auth.service.js` line ~423). Admin approval (which triggers the setup email) must happen first — but the `setupPassword` endpoint itself does not change the status to `active`.

**Assessment:** WEAK

**Why:** The flow description says "Phase 2 Success: status → active", but `setupPassword` does not set `status = 'active'`. If admin approval sets status to `active` before sending the setup email, the flow is correct. If not, whitelabels complete password setup but remain in `pending` status and cannot log in (`_validateUserStatus` blocks pending users).

**Recommended change:** Either (a) confirm that the admin approval action sets `status = 'active'` before triggering the setup email, or (b) have `setupPassword` set `user.status = USER_STATUS.ACTIVE` upon successful password setup. Option (b) is simpler and safer — the token itself proves admin approval already happened.

Source: `labbe-backend-/src/modules/auth/auth.controller.js:410-450`, `labbe-backend-/src/modules/auth/auth.service.js` (~line 423)

---

## State machine

```
[anonymous]
     │ fill 5-step form (email, phone, englishName, arabicName, logo)
     ▼
[pending-approval]
     │ admin approves → setup-password email sent with token
     ▼
[setup-token-valid]  ──── token expired (currently 24h, should be 7d) ──► [setup-token-expired]
     │ whitelabel clicks link → validates token → sets password
     ▼
[password-set]  ──── status still pending? ──► [blocked-on-login]
     │ status = active (must be confirmed — see Q7)
     ▼
[active / authenticated]
     │ first login (email + password)
     ▼
[whitelabel dashboard]
```

Notes:
- Phase 1 (application) is implemented on both web and mobile.
- Phase 2 (setup-password) is implemented on web only. Mobile has zero Phase 2 code.
- Setup token is 24 hours (must be 7 days per Peter). Token hashed with SHA-256 before storage.
- `setupPassword` does NOT set `user.status = 'active'` — status transition path must be confirmed.

---

## Data handoffs

| Step | Source | Payload | Destination |
|------|--------|---------|-------------|
| Phase 1 submit | Web: `WhiteLabelForm.js`; Mobile: `WhitelabelSignupScreen.js` | `{ email, phone, englishName, arabicName, logo }` | POST /signup/whitelabel with `uploadLogo` middleware |
| signupWhitelabel service | `auth.service.js` (~line 410–460) | Whitelabel fields + logo path | `UserModel` with `role: 'whitelabel_admin'`, `status: 'pending'` |
| Admin approves | Admin dashboard action | `status` change | `createPasswordSetupToken()` called, setup email sent |
| Setup email | `emailModule.send.passwordSetup` | `{ userName, setupUrl: /setup-password/${token} }` | Whitelabel admin's email inbox |
| validateSetupToken | `auth.controller.js:385` | `token` param | `{ valid: true, user: { email, username, role } }` |
| setupPassword | `auth.controller.js:410` | `{ token, password, passwordConfirm }` | Password saved, token cleared, JWT issued |
| resendSetupEmail | `auth.controller.js:456` | `{ email }` | New token created, new setup email sent |

---

## Role variations

Only `whitelabel_admin` enters Phase 1. The admin dashboard (accessed by ADMIN or SUPER_ADMIN) is the approval gate. After Phase 2 completion, the whitelabel admin can create sub-users (`whitelabel_moderator`) within their organization. Those sub-users go through a separate invitation flow, not this signup flow.

---

## Web ↔ mobile parity

| Capability | Web | Mobile | Gap |
|-----------|-----|--------|-----|
| Phase 1 form | `WhiteLabelForm.js` (5 steps) | `WhitelabelSignupScreen.js` | Confirm step-level field parity |
| Logo upload | FormData with file input | FileSystem API / ImagePicker | Confirm mobile uses multipart form body |
| Phase 2 token validation | `GET /validate-setup-token/:token` (web `SetupPassword.js`) | NOT IMPLEMENTED | Critical gap — mobile has no Phase 2 handler |
| Phase 2 password entry | `SetupPassword.js` FORM state | NOT IMPLEMENTED | Critical gap — no screen, no service method |
| Phase 2 deep link handling | URL path `/setup-password/[token]` | No deep link registered | Critical gap — email link has no mobile handler |
| Resend setup email | No admin UI button (admin dashboard gap) | N/A | Admin dashboard missing trigger |

---

## Edge cases & failure modes

1. **Setup email link opened on mobile:** The email contains `${config.frontend.url}/setup-password/${setupToken}` — a web URL. If a whitelabel admin opens this on a mobile device, the browser opens the web app, not the mobile app. There is no deep-link or universal-link mapping for the mobile app to intercept this URL.
2. **Token expires before whitelabel acts (24h window):** Admin approves on Friday evening; whitelabel admin checks email on Monday. Token is expired. The resend endpoint exists (`POST /resend-setup-email`) but no admin dashboard UI exposes it. Admin must call the API directly.
3. **setupPassword does not set status = active:** If admin approval does NOT set status to `active` before sending the setup email, the whitelabel completes password setup but `_validateUserStatus` in the protect middleware blocks login because status is still `pending`. The status transition must happen before or during Phase 2.
4. **Logo stored locally (not S3):** Whitelabel logo upload at `auth.service.js:~338` follows the same pattern as vendor logos — potential local filesystem storage if S3 not configured.
5. **No resend rate limiting:** `POST /resend-setup-email` is not rate-limited. An attacker who knows a whitelabel email can flood token regeneration, each call invalidating the previous token.

---

## Findings

### FLOW-04-F01
- **Title:** Mobile Phase 2 (setup-password) entirely missing
- **Type:** High
- **Severity:** High
- **File:** `halla-mobile/services/authService.js`
- **Detail:** `halla-mobile/` has no `WhitelabelSetupPasswordScreen`, no `validateSetupTokenAPI`, no `setupPasswordAPI`, and no deep-link handler for `/setup-password/:token`. A whitelabel admin who receives the setup email cannot complete account activation on mobile. All mobile-side Phase 2 code must be built from scratch.
- **Recommended change:** (1) Add `validateSetupTokenAPI` (GET `/validate-setup-token/:token`) and `setupPasswordAPI` (POST `/setup-password`) to `halla-mobile/services/authService.js`. (2) Create `WhitelabelSetupPasswordScreen` with 4 states: VALIDATING, INVALID, FORM, SUCCESS. (3) Register deep link for `setup-password/:token` in `app.json` / `AppNavigator.js`. (4) Add store methods in `authStore.js`.
- **Related:** None

### FLOW-04-F02
- **Title:** Setup password token expiry is 24 hours — Gate-1 requires 7 days
- **Type:** CONFLICT
- **Severity:** Medium
- **File:** `labbe-backend-/models/UserModel.js:558`
- **Detail:** `createPasswordSetupToken` sets `passwordSetupExpires = Date.now() + 24 * 60 * 60 * 1000` (24 hours). Peter confirmed the token must be valid for 7 days to give whitelabel partners sufficient time to act after admin approval. 24 hours is too short in a B2B context.
- **Recommended change:** Change `UserModel.js:558` to `Date.now() + 7 * 24 * 60 * 60 * 1000`. Update any email template copy that states an expiry time to say "7 days".
- **Related:** None

### FLOW-04-F03
- **Title:** `setupPassword` does not set `user.status = 'active'`
- **Type:** High
- **Severity:** High
- **File:** `labbe-backend-/src/modules/auth/auth.controller.js:410`
- **Detail:** `setupPassword` at lines 410–450 clears `passwordSetupToken` and `passwordSetupExpires` and saves the user, but does not change `user.status`. If admin approval sets status to `active` before sending the setup email, login will work. If it does not, whitelabel completes Phase 2 but `_validateUserStatus` blocks login because status remains `pending`. The code currently issues a JWT at line 439 and sends it back — but a subsequent login attempt may fail if status was never changed.
- **Recommended change:** Add `user.status = USER_STATUS.ACTIVE` inside `setupPassword` before `user.save()`. This is safe: the setup token proves admin approval already occurred. Alternatively, confirm admin approval explicitly sets status to `active` in the admin service and document that dependency.
- **Related:** None

### FLOW-04-F04
- **Title:** No admin dashboard UI to resend setup email
- **Type:** Medium
- **Severity:** Medium
- **File:** `labbe-backend-/src/modules/auth/auth.routes.js:550`
- **Detail:** `POST /resend-setup-email` is implemented in backend (`auth.controller.js:456`) but no UI trigger exists in the admin dashboard. Grep across `labbe/ui/` finds zero callers of `resendSetupEmail` or `resend-setup-email`. Admins cannot use this feature without calling the API directly. Combined with the 24-hour token expiry (FLOW-04-F02), this is a workflow blocker.
- **Recommended change:** Add a "Resend Setup Email" button in the whitelabel detail view in the admin dashboard. Show only when the account has `passwordSetupToken` still active (status: `pending`, no password set). Wire to `POST /api/v2/auth/resend-setup-email` with the whitelabel's email.
- **Related:** FLOW-04-F02

---

## Cross-flow notes

- **Flow 01 (auth-foundation):** The JWT issued at `setupPassword` completion uses the 90-day expiry from FLOW-01-F01. Same fix applies.
- **Flow 05 (login):** After Phase 2, first login uses email+password. The approval email must clearly state to use email+password — not phone OTP — since whitelabel admins have email-based accounts.
- **Flow 09 (subscription-lifecycle):** After activation, the whitelabel admin subscribes to a whitelabel plan. Confirm the plan selection flow on web and mobile is accessible immediately after first login, and that the subscription endpoint correctly handles `whitelabel_admin` role.
