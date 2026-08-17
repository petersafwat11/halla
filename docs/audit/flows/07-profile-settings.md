# 07 — profile-settings

## One-paragraph description
User profile management per role: authenticated users view and update their profile information. Host: fullName, phone, bio, company, profileCompleted flag. Vendor: brandName, serviceDescription, portfolioImages, business details. Admin: permissions and role settings. Whitelabel Admin: partner details and domain settings. Also includes email verification as part of profile completion, where user can request verification code and confirm email address.
note by peter:
 these data are wrong please refer to the settings page for each role their is no bio for host profile completed we don't show it in the settings page as the host have to complete his profile to then go to dashboard and then to settings
 Vendor: brandName, serviceDescription, portfolioImages, business details >their are many more stuff vendor can change in the settings page please go to the web settings for vendor in labbe/app/[lang]/vendor-dashboard/settings
 Admin: permissions and role settings. also check for that on as it's wrong labbe/app/[lang]/admin-dash/settings
 this isn't correct too please see the same page as it's serving admins and whitelabel and moderators etc labbe/app/[lang]/admin-dash/settings

## Scope tags
[web] [backend] [mobile]

## Roles involved
Host, Vendor, Admin, Whitelabel Admin (all authenticated roles)

## Entry points
Backend get-me endpoint: `labbe-backend-/src/modules/auth/auth.routes.js:609` (GET /auth/me, protected)
Backend update-me endpoint: `labbe-backend-/src/modules/auth/auth.routes.js:676` (PATCH /auth/update-me, protected)
Backend complete-profile endpoint: `labbe-backend-/src/modules/auth/auth.routes.js:699` (PATCH /auth/complete-profile, protected)
Web account settings screen: `labbe/app/[lang]/` (assumed account/settings directory)
Mobile account settings screen: `halla-mobile/screens/AccountSettingsScreen.js:1`
Mobile vendor account setup: `halla-mobile/screens/VendorAccountSetupScreen.js:1`
Backend profile controller: `labbe-backend-/src/modules/auth/auth.controller.js` (getMe:268, updateMe:278, completeHostProfile:310)

## Exit / terminal states
Success: User profile retrieved/updated, all fields validated and persisted.
Partial success: Some fields updated, others failed validation.
Failure: User not authenticated, invalid input (email format, phone format, name length).
Blocked: User role doesn't allow profile updates (e.g., admin permissions cannot be self-assigned).

## Touched modules
**Backend:**
- `labbe-backend-/src/modules/auth/auth.routes.js` (routes 609-748 for profile and email verification)
- `labbe-backend-/src/modules/auth/auth.controller.js` (getMe:268, updateMe:278, completeHostProfile:310, sendEmailVerificationCode:327, verifyEmail:356)
- `labbe-backend-/src/modules/auth/auth.service.js` (getMe, completeHostProfile, email verification logic)
- `models/UserModel.js` (profile fields: fullName, phone, bio, company, brandName, serviceDescription, etc.)
- `labbe-backend-/src/shared/middleware/validation.js` (email, phone, name validation)
- `labbe-backend-/src/infrastructure/email.js` (verification code email)

**Web:**
- Web account/settings pages (structure TBD — not found in current directory scan)
- `labbe/stores/authStore.js` (state: user, subscription; methods: setUser, setSubscription)

**Mobile:**
- `halla-mobile/screens/AccountSettingsScreen.js:1` (host/general account settings)
- `halla-mobile/screens/VendorAccountSetupScreen.js:1` (vendor-specific profile setup)
- `halla-mobile/services/authService.js` (profile API calls)
- `halla-mobile/stores/authStore.js` (user state management)

## Dependencies on other flows
- **Flow 01 (auth-foundation)**: User authenticated via token from this flow
- **Flow 02 (signup-host)**: Host profile completion often deferred to this flow
- **Flow 03 (signup-vendor)**: Vendor profile may be completed after approval
- **Flow 06 (password-reset)**: Email verification overlaps with profile completion

## Known divergences (web ↔ mobile, frontend ↔ backend)
Web profile pages structure unknown — no account/settings pages found in directory structure. 
Mobile has separate screens for host (AccountSettingsScreen) and vendor (VendorAccountSetupScreen); web may consolidate.
Profile completion: backend endpoint is /complete-profile (host-specific); vendors may use /update-me or custom endpoint.
Email verification: backend has dedicated endpoints (send-verification-code, verify-email); web/mobile integration unclear.

## Open questions

**Q1 — Web profile/account settings pages — where are they?**
- Type: A | Bucket: 1 (correct, confirmed by code)
- Three separate settings surfaces confirmed by file inspection:
  - `labbe/app/[lang]/host/settings/_components/AccountSettings.js` — hosts (username, email, password, email verification)
  - `labbe/app/[lang]/admin-dash/settings/_components/AdminSettingsClient.js` — all admin roles (admin, super_admin, moderator, whitelabel_admin, whitelabel_moderator); two tabs: Account + Notifications; reuses AccountSettings component with `isAdmin={true}`
  - `labbe/app/[lang]/vendor-dashboard/settings/_components/` — vendors; multiple sub-components for each section (BasicAccountInfo, ServiceDetailsSection, ImagesAndPricingSection, AdditionalLinksSection)

**Q2 — What fields can each role update?**
- Type: A | Bucket: 1 (confirmed by reading all settings components)
- **Host** (`AccountSettings.js`): `username` (displayed as "full name"), `email`, password change; email verification OTP flow
- **Admin / Moderator / Whitelabel Admin / Whitelabel Moderator** (`AdminSettingsClient.js`): same as host — `username`, `email`, password; notification preferences; no role/permission self-assignment
- **Vendor** (vendor-dashboard settings):
  - `BasicAccountInfo.jsx`: `ownerFullName`, `brandName`, `email`, `phoneNumber`
  - `ServiceDetailsSection.jsx`: `serviceDescription`, `nationalId`, `nationalIdImage`, `commercialRecordImage`, `serviceLocation`, `serviceCategories`
  - `ImagesAndPricingSection.jsx`: `portfolioImages`, `pricePackages`
  - `AdditionalLinksSection.jsx`: `socialLinks` (website, instagram, facebook, twitter, tiktok)
- Sources: `labbe/app/[lang]/host/settings/_components/AccountSettings.js`, `labbe/app/[lang]/admin-dash/settings/_components/AdminSettingsClient.js`, `labbe/app/[lang]/vendor-dashboard/settings/_components/`

**Q3 — Profile completion for hosts — what fields are required?**
- Type: A | Bucket: 2 (Peter's answer was directionally correct but vague; code reveals exact fields)
- Host profile completion collects: `username` (full name), `email`, `password`, `passwordConfirm` — confirmed by `ContinueSignupForm.js` and `authService.completeHostProfile()` (lines 809-838 in auth.service.js)
- The backend `completeHostProfile` sets `profileCompleted = true` on the `hostData` subdoc
- Fields like bio/company/position exist in `hostDataSchema` in `UserModel.js` but are NOT part of the completion form — they are NOT required
- Vendors and whitelabel admins complete their profiles during signup (single-step), so this endpoint is host-only
- Mobile equivalent: `halla-mobile/components/auth/CompleteProfileForm.js` — must mirror `labbe/app/[lang]/(auth-layout)/signup/continue-signup`; verify field parity (username, email, password, passwordConfirm) and that it calls the same `/auth/complete-profile` endpoint
- Sources: `labbe-backend-/src/modules/auth/auth.service.js:809-838`, `labbe/ui/auth/signup/host/continueSignupForm/ContinueSignupForm.js`

**Q4 — Vendor portfolio images: uploaded during signup or profile update?**
- Type: A | Bucket: 3 (BUG — Peter stated "saved in s3" but code contradicts this)
- Portfolio images are uploaded during **signup** (`signupVendor` in `auth.service.js:348`) but are stored at `uploads/portfolios/${f.filename}` — **local filesystem**, NOT S3
- Peter explicitly stated "saved in s3" — this is incorrect per the current code
- ACTION REQUIRED: Migrate portfolio upload handling to use the S3/cloud storage pipeline that exists for other media in the project, or confirm this is an intentional temporary approach
- Sources: `labbe-backend-/src/modules/auth/auth.service.js:348` (`/uploads/portfolios/` path, no S3 call)

**Q5 — Admin/Whitelabel profile updates — are permissions self-assignable?**
- Type: A | Bucket: 1 (correct — permissions are not self-assignable)
- `auth.controller.js updateMe` uses `allowedFields = ["username", "email", "avatar", "phoneNumber"]` — no role or permission fields are in the allow-list
- Admin role/permissions are set exclusively through admin-management routes, not the profile update endpoint
- Shared permissions package (planned) will enforce this at the type level across backend and frontend
- Sources: `labbe-backend-/src/modules/auth/auth.controller.js:278`

**Q6 — Email verification: mandatory or optional?**
- Type: A | Bucket: 1 (correct — optional, happens in settings)
- Email verification is opt-in: user clicks "verify email" button in settings → receives 6-digit OTP (15-min TTL, SHA-256 hashed in DB) → enters code → `emailVerified` flag set to `true`
- Not gated: unverified email does not block login or feature access
- Endpoints: `POST /auth/send-verification-code` → `GET /auth/verify-email`
- Both web (`AccountSettings.js`) and mobile (`halla-mobile/components/settings/AccountSettings.js`) implement the full OTP flow — parity confirmed
- Sources: `labbe-backend-/src/modules/auth/auth.controller.js:327-376`, `labbe-backend-/models/UserModel.js` (verifyEmailCode method)

**Q7 — Can user change email address? Is it re-verified?**
- Type: B | Bucket: 3 (BUG — Peter's stated intent is NOT implemented in code)
- Peter's intent: "if he wants to change we should send an OTP to his new email immediately and he has to enter it to proceed"
- What the code actually does: `auth.controller.js updateMe` calls `findByIdAndUpdate` directly with the new email — NO OTP sent, NO `emailVerified = false` reset on email change
- The existing `sendEmailVerificationCode` / `verifyEmail` endpoints operate on the current email, not a pending new email — they cannot be repurposed for email-change verification without modification
- ACTION REQUIRED: Backend must implement email-change OTP flow: (1) accept `newEmail` field, (2) send OTP to new address, (3) only persist email change after OTP confirmed, (4) reset `emailVerified = false` in the interim
- Sources: `labbe-backend-/src/modules/auth/auth.controller.js:278-302` (updateMe — no OTP on email change)

**Q8 — How are profile fields exposed to frontend?**
- Type: A | Bucket: 1 (confirmed by code)
- `UserModel.toPublicJSON()` strips sensitive fields and maps role-specific data: the `profile` object is deleted and replaced by the relevant role key (e.g., `hostData`, `vendorData`, `adminData`, `whitelabelData`) at the root level of the response
- Frontend settings components read directly from this shape: e.g., `user.hostData.profileCompleted`, `user.vendorData.brandName`, `user.adminData.title`
- Sources: `labbe-backend-/models/UserModel.js` (`toPublicJSON` method)

**Q9 — Vendor account setup (mobile) — what data is collected?**
- Type: B | Bucket: 2 (parity should be verified against web)
- Web vendor signup (`labbe/ui/auth/signup/vendor`) collects the full vendor profile: brandName, ownerFullName, serviceDescription, serviceCategories, portfolioImages, pricePackages, nationalId, commercialRecordNumber, socialLinks, etc.
- Mobile vendor signup (`halla-mobile/components/auth/vendor-signup`) should be identical per Peter's directive
- Mobile parity is a Gate-1 requirement — any mobile vendor signup screen that omits fields present in the web signup is a divergence that must be closed
- ACTION REQUIRED: Verify field-by-field parity between `labbe/ui/auth/signup/vendor` and `halla-mobile/components/auth/vendor-signup`; log any gaps as mobile-parity bugs
- Sources: `labbe/ui/auth/signup/vendor` (web), `halla-mobile/components/auth/vendor-signup` (mobile)

**Q10 — Is there a profile_completion_required flag that blocks actions if profile incomplete?**
- Type: A | Bucket: 1 (correct — host-only gate, other roles are one-step)
- Flag: `user.hostData.profileCompleted` (Boolean in `UserModel.js hostDataSchema`)
- Gate behavior: if a host has `profileCompleted === false` at login, the frontend redirects to the complete-profile page (`/signup/continue-signup`) — they cannot reach the host dashboard
- Other roles (vendor, admin, whitelabel) complete their profiles in a single signup step, so no deferred completion gate applies to them
- Mobile must enforce the same redirect logic: if `hostData.profileCompleted === false` after login, push to the complete-profile screen before allowing dashboard access
- Sources: `labbe-backend-/models/UserModel.js` (`hostDataSchema.profileCompleted`), `labbe/ui/auth/signup/host/continueSignupForm/ContinueSignupForm.js`

## Notes from answer pass
- **BUG (Q4)**: Vendor portfolio images stored on local filesystem (`/uploads/portfolios/`), not S3 as Peter stated. Must be migrated to cloud storage.
- **BUG (Q7)**: Email change in `updateMe` has no OTP re-verification. Peter's intent (OTP to new email) is not implemented. Backend change required before this is production-safe.
- **Parity task (Q9)**: Mobile vendor signup must be audited field-by-field against web vendor signup. Differences should be treated as mobile-parity gaps per Gate-1.
- **Profile completion gate (Q10)**: Mobile must implement the `profileCompleted` redirect guard the same way web does.

---

## State machine

```
[authenticated]
     │ GET /auth/me
     ▼
[profile-loaded]
     │
     ├─ PATCH /auth/update-me (username, email, avatar, phoneNumber)
     │         └── email change: no OTP, no emailVerified reset (BUG)
     │
     ├─ PATCH /auth/complete-profile (host: username, email, password, passwordConfirm)
     │         └── sets profileCompleted = true
     │
     ├─ POST /send-verification-code → 6-digit code sent to email
     │         └── POST /verify-email → emailVerified = true
     │
     └─ PATCH /auth/update-password (currentPassword, newPassword, passwordConfirm)
               └── sets passwordChangedAt, invalidates old JWTs
```

---

## Data handoffs

| Step | Source | Payload | Destination |
|------|--------|---------|-------------|
| getMe | `auth.controller.js:268` | user `_id` from `req.user` | `UserModel.toPublicJSON()` — role-scoped user object |
| updateMe | `auth.controller.js:278` | `{ username, email, avatar, phoneNumber }` | `findByIdAndUpdate` direct call, no OTP for email change |
| completeHostProfile | `auth.controller.js:310` | `{ username, email, password, passwordConfirm }` | `profileCompleted = true`, new JWT issued |
| sendEmailVerificationCode | `auth.controller.js:327` | authenticated user email | 6-digit code hashed, sent to email |
| verifyEmail | `auth.controller.js:356` | `{ code }` | `emailVerified = true` |
| updatePassword | `auth.controller.js:241` | `{ currentPassword, newPassword, passwordConfirm }` | password updated, `passwordChangedAt` set, JWT issued |
| toPublicJSON | `UserModel.js` | DB user document | Role-specific shape: `hostData`, `vendorData`, `adminData`, or `whitelabelData` at root |

---

## Role variations

| Role | Settings fields | Profile completion | Notes |
|------|-----------------|--------------------|-------|
| Host | `username`, `email`, password change, email verification | Required (`profileCompleted`) — done at signup | No bio/company in settings |
| Vendor | `ownerFullName`, `brandName`, `email`, `phoneNumber`, `serviceDescription`, `nationalId`, `commercialRecordImage`, `nationalIdImage`, `serviceLocation`, `serviceCategories`, `portfolioImages`, `pricePackages`, `socialLinks` | Done at signup (no deferred completion) | Most fields; portfolio files |
| Admin / Moderator / Whitelabel Admin / Whitelabel Moderator | `username`, `email`, password change, notification preferences | Done at signup | No role/permission self-assignment |

---

## Web ↔ mobile parity

| Capability | Web | Mobile | Gap |
|-----------|-----|--------|-----|
| Host settings | `AccountSettings.js` (username, email, password, email verify) | `AccountSettingsScreen.js` | Confirm all 4 capabilities present on mobile |
| Vendor settings | 4-section vendor-dashboard settings page | `VendorAccountSetupScreen.js` | Verify field parity — Q9 action item |
| Admin settings | `AdminSettingsClient.js` (username, email, password, notifications) | Not confirmed | Verify admin mobile settings screen exists |
| Email verification OTP flow | `AccountSettings.js` — confirmed | `components/settings/AccountSettings.js` — confirmed | Parity confirmed per Q6 |
| Email change OTP | NOT IMPLEMENTED (BUG) | NOT IMPLEMENTED (BUG) | Both platforms missing — same backend fix needed |
| Avatar upload | `updateMe` accepts `req.file` — paths written locally (`req.file.path || req.file.filename`) | Not confirmed | Avatar may share local-disk storage gap |
| Password change (authenticated) | `ChangePassword.js` uses reset path (BUG — FLOW-06-F04) | Not confirmed | Both platforms need `PATCH /update-password` form |

---

## Edge cases & failure modes

1. **Email changed without re-verification:** `updateMe` at `auth.controller.js:278` calls `findByIdAndUpdate` directly. If `email` is in the update payload, it is saved with no OTP confirmation and `emailVerified` is not reset. The user retains `emailVerified: true` on a new unconfirmed address.
2. **Avatar stored at `req.file.path || req.file.filename`:** This path is a local filesystem path when S3 is not configured (same pattern as vendor files). Avatar URLs returned to the frontend will be relative local paths, not absolute CDN URLs.
3. **Vendor portfolio update via settings — S3 gap:** Vendor updates portfolio images through the settings page. If the upload middleware for the settings endpoint uses the same local-disk path as signup, the new images are also stored locally, not S3.
4. **Vendor `nationalId` collected twice:** `StepOne.js` and `StepFour.js` in the vendor signup form both collect `commercialVerification.nationalId`. The settings `ServiceDetailsSection.jsx` shows `nationalId` — confirm the displayed/editable value comes from the correct single source in the DB.
5. **`toPublicJSON` role-specific shaping:** If a user's `profile` subdoc is missing the expected role key (e.g., a vendor with no `vendorData`), `toPublicJSON` would return an empty or undefined role-data object. Frontend settings components would render blank or crash.

---

## Findings

### FLOW-07-F01
- **Title:** Email change in `updateMe` has no OTP verification and does not reset `emailVerified`
- **Type:** High
- **Severity:** High
- **File:** `labbe-backend-/src/modules/auth/auth.controller.js:278`
- **Detail:** `updateMe` calls `findByIdAndUpdate` directly with the new email value. No OTP is sent to the new address, and `emailVerified` is not reset to `false`. A user can change their email to any address and retain verified status on an address they do not own. Peter's stated intent is "send OTP to new email, require confirmation before persisting."
- **Recommended change:** Backend: (1) Accept `newEmail` as a separate field (not just `email`). (2) Send a 6-digit OTP to `newEmail`. (3) Store `pendingEmail` and `pendingEmailCode` (hashed) in `UserModel`. (4) Add `POST /auth/confirm-email-change` endpoint that verifies the code, moves `pendingEmail` → `email`, and sets `emailVerified = false`. (5) In the interim, if email is updated via `updateMe` without OTP, set `emailVerified = false` at minimum.
- **Related:** FLOW-06-F04 (email verification in password-reset flow)

### FLOW-07-F02
- **Title:** Vendor portfolio images stored on local filesystem, not S3
- **Type:** High
- **Severity:** High
- **File:** `labbe-backend-/src/modules/auth/auth.service.js:348`
- **Detail:** `signupVendor` stores portfolio images at `uploads/portfolios/${f.filename}` — local disk path. The vendor settings page likely uses the same upload middleware, producing the same issue on profile update. Peter confirmed all media must be stored in S3. Local storage fails in multi-instance deployments and on container restarts.
- **Recommended change:** Route all vendor file uploads through the S3-backed `uploadVendorFiles` middleware in `s3Upload.js`. Disable local-disk fallback in production.
- **Related:** FLOW-03-F03 (same issue at signup — fix once covers both)

### FLOW-07-F03
- **Title:** Avatar upload in `updateMe` uses local filesystem path
- **Type:** Medium
- **Severity:** Medium
- **File:** `labbe-backend-/src/modules/auth/auth.controller.js:289`
- **Detail:** `updateMe` at line 289 sets `updateData.avatar = req.file.path || req.file.filename`. `req.file.path` is a local absolute path when multer disk storage is used. If S3 is configured, this would be an S3 URL — but if the S3 config is absent, a local path is stored in the DB and served to clients as an avatar URL, which will be unreachable on any instance other than the one that received the upload.
- **Recommended change:** Ensure the avatar upload middleware uses the same S3-backed multer instance as other file uploads. Confirm `req.file.location` (the S3 URL set by multer-s3) is used when available, falling back to `req.file.path` only in development.
- **Related:** FLOW-03-F03, FLOW-03-F04

---

## Cross-flow notes

- **Flow 06 (password-reset):** The email verification flow documented in Q3 and Q6 of this file overlaps directly with Flow 06. The `emailVerified` reset on email change (FLOW-07-F01) must be paired with the re-verification flow in Flow 06.
- **Flow 02 (signup-host):** `completeHostProfile` is called from both the signup flow (Flow 02) and the settings view (Flow 07) via the same endpoint. Ensure it cannot be called again after `profileCompleted` is already `true` to prevent re-setting the flag.
- **Flow 03 (signup-vendor):** FLOW-07-F02 and FLOW-03-F03 are the same underlying issue — vendor file storage. Fix `s3Upload.js` and the vendor upload middleware once; it covers signup, settings, and all other vendor file operations.
- **Flow 01 (auth-foundation):** `updatePassword` sets `passwordChangedAt`, triggering token invalidation via `changedPasswordAfter` in `protect`. Under Gate-1 dual-token, this must also revoke refresh tokens — same requirement as in password-reset (FLOW-06).
