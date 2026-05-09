# Users — Full-Stack Review Plan

**Module:** users
**Generated:** 2026-05-07
**Updated:** 2026-05-08 — locked-in decisions applied (zod-only, D1 approved, D2 = delete phone routes, D3 = fix mobile plumbing, C.7 = Mongoose model is canonical)
**Prompt:** docs/implementation/MODULE_FULLSTACK_REVIEW_PROMPT.md
**Status:** Awaiting green light · NOT IMPLEMENTED YET

---

## Locked Decisions (2026-05-08)

| # | Decision | Resolution |
|---|----------|-----------|
| **VALIDATION** | Joi vs Zod | **Zod only.** Use the existing `validateZod` middleware (`shared/middleware/validation.js:373`). Joi is forbidden for new code. All schemas in this plan are zod schemas. |
| **D1** | Delete `/users/hosts*`, `/users/vendors*`, `/users/moderators*` (rows 9–18)? | **APPROVED — DELETE.** The admin module owns these. A.18 + B.3 run unconditionally. After deletion, no file-size split is needed (re-measure first). |
| **D2** | Phone-update orphan endpoints (`POST /users/phone/request-update`, `PATCH /users/phone`) | **DELETE THE ROUTES.** Remove from routes/controller/service/Swagger. No UI to build. Drops A.12 (OTP rate limiter) and A.14 (add Swagger blocks); replaces with deletion task. Drops `requestPhoneUpdateSchema` and `confirmPhoneUpdateSchema` from A.11. |
| **D3** | Mobile `passwordConfirm` shape | **FIX MOBILE PLUMBING.** Both web and mobile UIs already collect `currentPassword + newPassword + confirmPassword`. Web wires all three correctly. Mobile drops `confirmPassword` in `components/settings/AccountSettings.js:61` and `screens/host/AccountSettingsScreen.js:31-37` (also misnames `currentPassword` → `oldPassword`). Pass `confirmPassword` through and send `{ currentPassword, newPassword, passwordConfirm }` to the backend. Remove the auto-equal hack in `changePasswordAPI` (`services/settingsService.js:55-76`). |
| **C.7** | Canonical admin notification key set | **Mongoose model is the source of truth** (`labbe-backend-/src/models/NotificationPreferencesModel.js`). Align both web `utils/schemas/notificationPreferencesSchemas.js` and mobile `components/admin-dashboard/settings/SettingsNotifications.js` to whatever the model defines for the admin role. |

---

## 0. Executive Summary

- **18** total endpoints today → **4** after this plan (rows 9–18 deleted by D1, rows 7–8 deleted by D2). Surviving: GET/PATCH `/users/profile`, PATCH `/users/password`, PATCH `/users/profile/:section`, GET/PATCH `/users/notification-preferences` (count: 6 surviving routes covering 4 distinct endpoints).
- **10** endpoints to delete: `/users/hosts*`, `/users/vendors*`, `/users/moderators*` (D1 — admin module owns this surface) + 2 phone-update orphans (D2 — zero consumers).
- **Swagger drift** on every surviving endpoint (empty `type: object` request bodies, profile-section enum mismatch); fixed in §7.A.8–A.9.
- **2** backend file-size violations (`users.service.js` 1051, `users.routes.js` 531) — both go well under cap once D1+D2 deletions are done; **no split needed.**
- **0** web file-size violations in this module's surface.
- **0** mobile file-size violations (largest is `NotificationSettings.js` at 322 lines, under 350 cap).
- **3** web/mobile API consumption mismatches (mobile response-shape fallback chains, mobile password-plumbing drops `confirmPassword`, divergent admin-notification key set) — all addressed.
- **3** real bugs in service/controller wiring that survive deletion: dead `phoneChanged` branch in `updateMyProfile`, fallback chains in `getNotificationPreferences`/`updateNotificationPreferences`, admin-settings notification-shape bug on web (`services/settings.js`).
- **Validation:** module currently has **no validation file**. Add `users.validation.js` using **zod** (project standard — Joi forbidden). Wire via `validateZod` middleware. (§2.6, §7.A.7)
- **~22** comment-hygiene markers to remove (FLOW-XX-FYY, TENANT-F01, Phase 4 W0-AUTH, etc.); most disappear automatically with D1/D2 deletions.
- Estimated effort: **M** (medium — biggest item is mass deletion which is fast; plus zod-validation file, web admin-settings rewrite, mobile password plumbing fix, vendorService → apiFetch migration). Touches ~4 backend files, ~7 web files, ~9 mobile files.

---

## 1. Endpoint Inventory

| # | Method | Path | Controller | Service | Middleware chain | Swagger | Web hook | Mobile hook | Status |
|---|--------|------|-----------|---------|------------------|---------|----------|-------------|--------|
| 1 | GET | /users/profile | `getMyProfile` | `getMyProfile` | `protect` | OK | `useMyProfile` | `useProfile` (queries/useUser.js) + `vendorService.getProfile` | KEEP (canonical self-profile read) |
| 2 | PATCH | /users/profile | `updateMyProfile` | `updateMyProfile` | `protect`, `uploadUserProfile` | minimal — body schema is empty `type: object` | `useUserMutation("updateProfile")` | `useUpdateProfile` (settingsService.updateProfileAPI) + `vendorService.updateAccountAPI` (unused) | KEEP |
| 3 | PATCH | /users/password | `updateMyPassword` | `updateMyPassword` | `protect` | OK (basic) | `useUserMutation("updatePassword")` | `useChangePassword` + `vendorService.updatePassword` (parallel) | KEEP |
| 4 | PATCH | /users/profile/:section | `updateMyProfileSection` | `updateMyProfileSection` | `protect`, `uploadUserProfile` | **DRIFT** — JSDoc claims enum `[personal, business, preferences]`; service accepts `[hostData, vendorData, businessInfo, contactInfo, documents]` | `useUserMutation("updateProfileSection")` | `vendorService.updateSection`/`updateSectionWithFiles` | KEEP — fix Swagger |
| 5 | GET | /users/notification-preferences | `getNotificationPreferences` | `getNotificationPreferences` | `protect` | minimal | `useNotificationPreferences` | `useNotificationSettings` (settingsService.getNotificationPreferencesAPI) + admin SettingsNotifications inline `useEffect` | KEEP |
| 6 | PATCH | /users/notification-preferences | `updateNotificationPreferences` | `updateNotificationPreferences` | `protect` | minimal | `useUserMutation("updateNotificationPreferences")` | `useUpdateNotificationSettings` + admin inline `updateNotificationPreferencesAPI` | KEEP |
| 7 | POST | /users/phone/request-update | `requestPhoneUpdate` | `requestPhoneUpdate` | `protect` | **MISSING** — no `@swagger` block | none | none | KEEP (real flow) — add Swagger, add OTP rate-limit, add Joi schema, add web/mobile consumer or document why orphan |
| 8 | PATCH | /users/phone | `confirmPhoneUpdate` | `confirmPhoneUpdate` | `protect` | **MISSING** | none | none | KEEP — same as #7 |
| 9 | GET | /users/hosts | `getHosts` | `getHosts` | `protect`, `requirePageAccess(HOSTS,view)`, `whitelabelIsolation` | OK | `useHosts` (orphan in `useUsers.js`) | none | **DELETE-DUPLICATE-OF /admin/hosts** (admin module owns this — web `useAdminHosts` hits `/admin/hosts`; the `/users/hosts` route has zero real consumers) |
| 10 | POST | /users/hosts | `createHost` | `createHost` | `protect`, `requirePageAccess(HOSTS,create)`, `whitelabelIsolation` | minimal body schema | `useUserMutation("createHost")` (orphan) | none | **DELETE-DUPLICATE-OF /admin/hosts (POST)** |
| 11 | GET | /users/hosts/:id | `getHostById` | `getHostById` | `protect`, `validateObjectId`, `requirePageAccess(HOSTS,view)`, `whitelabelIsolation` | OK | `useHost` (orphan) | none | **DELETE-DUPLICATE-OF /admin/hosts/:id** |
| 12 | DELETE | /users/hosts/:id | `deleteHost` | `deleteHost` | same as #11 with `delete` | OK | `useUserMutation("deleteHost")` (orphan) | none | **DELETE-DUPLICATE-OF /admin/hosts/:id (DELETE)** — also has an arg-order bug (see §6) |
| 13 | PATCH | /users/hosts/:id/status | `updateHostStatus` | `updateHostStatus` | same with `update` | minimal | `useUserMutation("updateHostStatus")` (orphan) | none | **DELETE-DUPLICATE-OF /admin/hosts/:id/status** |
| 14 | GET | /users/vendors | `getVendors` | `getVendors` | `protect`, `requirePageAccess(VENDORS,view)`, `whitelabelIsolation` | OK | `useVendors` (orphan) | none | **DELETE-DUPLICATE-OF /admin/vendors** |
| 15 | GET | /users/vendors/:id | `getVendorById` | `getVendorById` | same w/ `validateObjectId` | OK | `useVendor` (orphan) | none | **DELETE-DUPLICATE-OF /admin/vendors/:id** |
| 16 | PATCH | /users/vendors/:id/status | `updateVendorStatus` | `updateVendorStatus` | same w/ `update` | minimal | `useUserMutation("updateVendorStatus")` (orphan) | none | **DELETE-DUPLICATE-OF /admin/vendors/:id/status** — has an `actorId` wiring bug (§6) |
| 17 | GET | /users/moderators | `getModerators` | `getModerators` | `protect`, `requirePageAccess(MODERATORS,view)`, `whitelabelIsolation` | OK | `useModerators` (orphan) | none | **DELETE-DUPLICATE-OF /admin/moderators** |
| 18 | POST | /users/moderators | `createModerator` | `createModerator` | `protect`, `requirePageAccess(MODERATORS,create)`, `whitelabelIsolation` | minimal | `useUserMutation("createModerator")` (orphan) | none | **DELETE-DUPLICATE-OF /admin/moderators (POST)** |

**Legend:** KEEP, DELETE-DUPLICATE-OF-…, RENAME, MERGE-WITH-…

> **D1 — LOCKED:** Delete rows 9–18 (`/users/hosts*`, `/users/vendors*`, `/users/moderators*`). Admin module owns this surface. After deletion, the users module is: self-profile read/update, password change, profile-section update, notification preferences (4 endpoints — phone routes deleted per D2).
>
> **D2 — LOCKED:** Delete rows 7 and 8 (`POST /users/phone/request-update`, `PATCH /users/phone`). Zero consumers; not building UI.

---

## 2. Backend Findings

### 2.1 File-size violations
- `users.service.js` — **1051 lines** (cap 600). Proposed split (after row 9–18 deletion the file shrinks dramatically; recommend doing the deletion first and re-measuring before splitting):
  - `users.profile.service.js` — self-profile read/update, password change, profile-section, notification preferences, phone update (≈ 350 lines)
  - `users.hosts.service.js` — `getHosts`, `getHostById`, `createHost`, `_assignHostSubscription`, `updateHostStatus`, `deleteHost` (≈ 250 lines)
  - `users.vendors.service.js` — `getVendors`, `getVendorById`, `updateVendorStatus`, `_notifyVendorStatusChange` (≈ 180 lines)
  - `users.moderators.service.js` — `getModerators`, `createModerator` (≈ 150 lines)
  - `users.service.js` becomes a thin façade re-exporting the four. **If §7.D2 is approved (delete the host/vendor/moderator endpoints) only the profile module remains and no split is needed.**
- `users.routes.js` — **531 lines** (cap 400). After §7.D2 the routes file collapses to ≈ 200 lines (profile + phone + notification-preferences) — split is not needed if the deletion happens. Otherwise: split into `users.profile.routes.js` + `users.admin.routes.js` (the latter mounting `/hosts`, `/vendors`, `/moderators`).

### 2.2 Swagger drift
- `PATCH /users/profile/:section` — JSDoc enum `[personal, business, preferences]` does not match service-accepted `[hostData, vendorData, businessInfo, contactInfo, documents]`. Fix the JSDoc to match the truth (the service is right; the JSDoc is fiction). (`users.routes.js:140-156`)
- `POST /users/phone/request-update` and `PATCH /users/phone` — no `@swagger` blocks at all. Add them with body schemas (`{ newPhone }` and `{ newPhone, otp }`) and the matching error responses (400 invalid format, 409 phone in use, 422 OTP mismatch). (`users.routes.js:91-93`)
- `GET/PATCH /users/notification-preferences` — JSDoc declares `requestBody.schema: type: object` (empty). Add a real schema reference in `config/swagger.js` (`NotificationPreferencesUpdateInput` with the `appNotifications`, `emailNotifications`, `smsNotifications` shape) and `$ref` it. (`users.routes.js:163-199`)
- `PATCH /users/profile` — request body declared `multipart/form-data` with empty schema. Document the supported FormData fields (`avatar`, `businessLogo`, `username`, `name`, `email`, `phoneNumber` (rejected), `profile` (JSON-stringified)).
- `PATCH /users/profile/:section` — same body schema gap.
- `POST /users/hosts`, `POST /users/moderators`, `PATCH /users/*/:id/status` — request bodies all `type: object` empty. Document them — but these may be deleted entirely per §7.D2.
- `200` response schemas omit the `data` envelope shape — no `$ref` to `User`/`Subscription` etc. Add response schemas for at least #1 (profile) and #5/#6 (notification preferences).

### 2.3 Missing middleware / safeguards
- ~~`POST /users/phone/request-update` rate limiter~~ — **MOOT (D2): route is being deleted.**
- ~~`PATCH /users/phone` rate limiter~~ — **MOOT (D2): route is being deleted.**
- ~~`POST /users/hosts` audit~~ — **MOOT (D1): endpoint is being deleted.**
- ~~`PATCH /users/hosts/:id/status` audit~~ — **MOOT (D1): endpoint is being deleted.**
- ~~`DELETE /users/hosts/:id` audit~~ — **MOOT (D1): endpoint is being deleted.**
- ~~`POST /users/moderators` audit~~ — **MOOT (D1): endpoint is being deleted.**
- ~~`PATCH /users/vendors/:id/status` actorId wiring~~ — **MOOT (D1): endpoint is being deleted.**
- ~~`_notifyStatusChange` / `_notifyVendorStatusChange`~~ — **MOOT (D1): both helpers go away with the host/vendor service methods.**
- ~~Hardcoded `'ar'` notification language in `_notifyVendorStatusChange`~~ — **MOOT (D1): helper is being deleted.**
- All endpoints that mutate (rows 2, 3, 4, 6) lack a **zod** validation schema (`users.validation.js` does not exist — module has no `validation.js` at all). The body shape is enforced only by Mongoose, which silently drops unknown fields and gives unhelpful messages. **High priority** for self-profile and password endpoints because they accept unknown user input directly. Use the existing `validateZod` middleware at `shared/middleware/validation.js:373`.

### 2.4 Duplicate / dead endpoints
- Rows 9–18 (all host/vendor/moderator CRUD under `/users/`) duplicate the live `/admin/hosts*`, `/admin/vendors*`, `/admin/moderators*` set in `labbe-backend-/src/modules/admin/admin.routes.js` (lines 61, 158, 193, 232, 303, 378, 414, 454, 543, 640, 675, 705, 736, 767). The admin set has more functionality (`bulkDelete`, `bulkStatus`, `bulkStatus`, `verifyPhone`, `findOrCreate`, `updateRating`, `updateSubscription`, `update`, `export`).
- Web admin-dash uses **only** the admin module's set (via `useAdmin.js` → `API_PATHS.admin.*`).
- `useUsers.js` exports `useHosts`, `useHost`, `useVendors`, `useVendor`, `useModerators`, and the `useUserMutation` actions `createHost`, `deleteHost`, `updateHostStatus`, `updateVendorStatus`, `createModerator` — **none of these are imported by any component** (verified by grep). They are dead in `useUsers.js`.
- Recommendation: **delete the admin-side endpoints from the users module and from `useUsers.js`**; document the canonical source as the admin module. Plan item D1 in §7. **Confirm with user before executing.**

### 2.5 Service / controller violations
- **`updateMyProfile` allows `phoneNumber` then rejects it** — `allowedFields` includes `phoneNumber` (line 700) but the function throws if `phoneNumber !== user.phoneNumber` (line 696). Remove `phoneNumber` from `allowedFields` so the field is dropped silently when the value matches and the explicit reject is unambiguous. (`users.service.js:691-757`)
- **`updateMyProfile` re-evaluates `phoneChanged` after rejecting it** — line 743 checks `phoneChanged` after the rejection; the branch is dead. Remove. (`users.service.js:743-754`)
- **Inline `require()` calls inside methods** — `require('crypto')` (line 233), `require('../auth/otp.service')` (line 763, 780), `require('../../shared/utils/phone')` (line 764, 781), `require('../../shared/constants/events')` (line 216). Lift to top-level imports.
- **`_assignHostSubscription` writes to `host.subscription`** with the populated subscription object as id — `whitelabelAdmin.subscription._id || whitelabelAdmin.subscription` (line 266). The fallback is dead because `whitelabelAdmin.subscription` is a populated doc when present. Replace with `whitelabelAdmin.subscription._id`.
- **`getHosts` returns `host.profile?.hostData?.emailVerified`** but the canonical email-verified flag is the top-level `User.emailVerified` (kept in sync by auth). Use `host.emailVerified`. (`users.service.js:122`)
- **`getHosts` returns `host.profile?.hostData?.profileCompleted`** which IS the canonical (model line 29), so OK — just call out that `User.profileCompleted` (line 126) is a separate top-level field meant for vendors. Keep current path; flag the model duplication in §6.
- **`getNotificationPreferences` reads three keys but writes a `result` object that always has all three** — the `else` branch (legacy) returns the same shape as the `if` branch; the conditional is decorative. Collapse to one expression. (`users.service.js:935-947`)
- **`updateNotificationPreferences` accepts both wrapped and unwrapped formats** (line 958) — fallback chain that exists "just in case". Backend returns the wrapped shape; the client always sends it. Remove the fallback. (`users.service.js:956-962`)
- **`createHost` enforces `maxHosts` against `whitelabelAdmin.subscription.planId.limits.maxHosts`** without a fallback — if `whitelabelAdmin` has no subscription, the limit is silently skipped. Either treat "no subscription" as zero hosts allowed or document why it's open. (`users.service.js:204-228`)
- **Class-form module exports a singleton (`new UsersService()`)** — fine; consistent with the project pattern but repeated `this.buildSearchQuery` keeps state-free helpers as instance methods. Static class methods would be a small win; not required.

### 2.6 Validation gaps
- `users.validation.js` does **not exist**. Add it using **zod** (project standard — `validateZod` middleware at `shared/middleware/validation.js:373`). Schemas required (post-D1/D2 — only the surviving endpoints):
  - `updatePasswordSchema` — `z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(8), passwordConfirm: z.string() }).refine(d => d.newPassword === d.passwordConfirm, { path: ["passwordConfirm"] })`.
  - `updateProfileSchema` — `z.object({ username: z.string().optional(), name: z.string().optional(), email: z.string().email().optional(), preferredLanguage: z.enum(["ar","en"]).optional(), profile: z.unknown().optional() }).strict()` (use `.strict()` to reject unknown keys, the zod equivalent of Joi's `.unknown(false)`).
  - `updateProfileSectionSchema` — body accepts arbitrary fields per section (`z.record(z.unknown())`); param-level zod for `section` enum: `z.enum(["hostData","vendorData","businessInfo","contactInfo","documents"])`.
  - `updateNotificationPreferencesSchema` — three optional `z.record(z.boolean())` objects (`appNotifications`, `emailNotifications`, `smsNotifications`); use `.strict()`.
  - ~~`requestPhoneUpdateSchema`~~ — **MOOT (D2): route deleted.**
  - ~~`confirmPhoneUpdateSchema`~~ — **MOOT (D2): route deleted.**
  - ~~Host/moderator/vendor schemas~~ — **MOOT (D1): endpoints deleted.**
- Saudi phone pattern, password rules, ObjectId validators are duplicated across modules. Propose a shared file `shared/utils/validators/common.js` exporting reusable zod schemas (`phoneSchema`, `passwordSchema`, `objectIdSchema`). Flag, do not create in this module's review.

### 2.7 Comment hygiene
Remove every FLOW-/PHASE-/TENANT- marker:
- `users.controller.js:166` — `TENANT-F01: …` → keep the explanation but drop the marker, or remove if the comment just re-states the code.
- `users.controller.js:195`, `:231` — `// FLOW-26-F03: parse JSON-stringified fields …` → keep WHY (multipart can't carry nested objects natively) without the marker.
- `users.controller.js:270`, `:277` — `// FLOW-07-F01: Request phone update …` → drop marker; keep one-line summary.
- `users.routes.js:91` — `// FLOW-07-F01: Phone number update via OTP (2-step)` → drop marker.
- `users.routes.js:529` — **`console.log("Moderators route defined");`** → delete (debug leftover).
- `users.service.js:203`, `:450`, `:457`, `:470`, `:503`, `:612`, `:615`, `:695`, `:706`, `:734`, `:746`, `:760`, `:777`, `:864`, `:904` — all FLOW-/TENANT- markers. Strip the markers; preserve the *why* lines that genuinely explain a non-obvious constraint (e.g. "phone updates require OTP — direct update is rejected here", "vendor state machine: pending→approved|rejected, approved→suspended, suspended→approved").
- `_notifyStatusChange` and `_notifyVendorStatusChange` `.catch(console.error)` — strip the `console.error` and let `globalErrorHandler` see the rejection by `await`-ing inside `Promise.allSettled` — or use `logger.warn` if the failure is recoverable. (`users.service.js:307,518`)

---

## 3. Frontend Web Findings

### 3.1 Component tree per page

**`app/[lang]/host/settings/page.js`** (93 lines) — host-only consumer of the users module.
- `_components/AccountSettings.js` (221 lines) — uses `useUserMutation("updateProfile" | "updatePassword" | "sendVerificationCode" | "verifyEmail")`.
- `@/ui/settings/notificationsPrefrences/NotificationPreferences.js` (208 lines) — uses `useUserMutation("updateNotificationPreferences")`.
- `@/ui/common/error/ErrorBoundary` (small).
- `@/ui/common/loading/SimpleLoading` (small).
- `@/ui/commen/tabs/Tabs` (small).

**`app/[lang]/vendor-dashboard/settings/page.js`** (239 lines) — vendor consumer.
- `_components/SettingsTabs/SettingsTabs.js`
- `_components/PersonalInfoSection/PersonalInfoSection.js`
- `_components/BasicAccountInfo/BasicAccountInfo.js`
- `_components/ServiceDetailsSection/ServiceDetailsSection.js`
- `_components/ImagesAndPricingSection/ImagesAndPricingSection.js`
- `_components/AdditionalLinksSection/AdditionalLinksSection.js`
- `@/ui/settings/notificationsPrefrences/NotificationPreferences.js` (shared).
- Uses `useMyProfile`, `useNotificationPreferences`, `useUserMutation("updateProfileSection" | "updateProfile")`.

**`app/[lang]/admin-dash/settings/page.js`** (66 lines) — admin consumer (server component).
- `_components/AdminSettingsClient.js` (77 lines) — re-uses host's `AccountSettings.js` and the shared `NotificationPreferences.js`.
- **Fetches via `services/settings.js`'s `settingsService.getProfile` and `settingsService.getNotificationPreferences`** — bypasses React Query / `prefetchServerData`.

### 3.2 File-size violations
None in this module's surface — the largest file is `vendor-dashboard/settings/page.js` at 239 lines (under the 250 cap). `AccountSettings.js` 221, `NotificationPreferences.js` 208, `AdminSettingsClient.js` 77 are all fine.

### 3.3 Hardcoded text / data / paths
- `host/settings/page.js:28-30` — `t("tabs.account") || "إعدادات الحساب"` and `t("tabs.notifications") || "الإشعارات"`. Same pattern at `:36`, `:56`, `:44`. Replace the hardcoded Arabic literal with the second arg of `t(key, fallback)` so the key lookup wins when present (B2). Same pattern in `host/settings/_components/AccountSettings.js` indirectly via shared keys.
- `ui/settings/notificationsPrefrences/NotificationPreferences.js:71-93,111,114,138,144,156,189,197` — Arabic literals as second `t()` arg are fine, but the toast strings and the inline warning use the second-arg fallback Arabic. Acceptable per B2 ("Always provide a fallback string"), but make sure the locale namespace `settings` actually has the keys; if not, list missing keys in §8.
- `services/settings.js` — hardcodes `/users/profile`, `/users/password`, `/users/notification-preferences` etc. as string literals (B7 violation). Migrate every call site to use `API_PATHS.users.*` via `apiClient` (or delete the file and migrate `app/[lang]/admin-dash/settings/page.js` to use `prefetchServerData` per B4).
- Inline `style={{ transform: ..., cursor: "pointer", fontSize: "2.4rem" }}` on `host/settings/page.js:50-54` (B11 violation). Move to `page.module.css`.

### 3.4 Data mapping bugs / fallback chains
- `host/settings/page.js:25` — `const user = profileData?.data?.user;` matches backend exactly (`{ data: { user }}`). OK.
- `host/settings/page.js:80` — `notificationPrefsData?.data?.preferences` matches backend exactly. OK.
- `vendor-dashboard/settings/page.js:38` — `const vendorData = profileData?.data?.user;` matches. OK.
- `useUsers.js` — no fallback chains. OK.
- **`services/settings.js:37` (admin server fetch)** reads `userResponse?.data?.user || userResponse?.data || null` — fallback chain. The backend returns `{ data: { user }}`. Replace with `userResponse?.data?.user || null`. (B0.1)
- **`services/settings.js:36`** — same file's notification fetch reads `notifResponse?.data || null` and treats `apiNotifications.appNotifications/emailNotifications` directly — but `getNotificationPreferences` returns `{ data: { preferences: { appNotifications, emailNotifications, smsNotifications }}}`. The page's `apiNotifications.appNotifications` will always be `undefined` → admin notification screen reads stale defaults. **Bug** (also flagged in §6).

### 3.5 Duplicate hooks / direct apiRequest calls
- **`services/settings.js`** is a parallel implementation of the same six profile/password/notification endpoints already covered by `hooks/reactQueryHooks/useUsers.js`. Used only by `app/[lang]/admin-dash/settings/page.js`. Migrate that page to:
  - Use `prefetchServerData` per the B4 server-component pattern, with `API_PATHS.users.getMyProfile` and `API_PATHS.users.getNotificationPreferences`.
  - Drop the entire `services/settings.js` file.
- **`useUsers.js`** exports six host/vendor/moderator hooks (`useHosts`, `useHost`, `useVendors`, `useVendor`, `useModerators`) and four mutation actions (`createHost`, `deleteHost`, `updateHostStatus`, `updateVendorStatus`, `createModerator`) that no component imports. Dead code — delete in lockstep with backend §7.D2.
- `useUserMutation` includes `sendVerificationCode` and `verifyEmail` actions whose paths point to `API_PATHS.auth.sendVerificationCode` and `API_PATHS.auth.verifyEmail`. These belong in `useAuthMutation`, not `useUserMutation` — but they are consumed by `host/settings/_components/AccountSettings.js` lines 21-22, so move them to `useAuthMutation` and update the consumer. (B0.2)

### 3.6 State / loading / error gaps
- `host/settings/page.js` — has `SimpleLoading` and an `ErrorBoundary` but no inline error state if `useMyProfile` errors (the `ErrorBoundary` catches *render* errors, not mutation/query errors). Add `if (profileError) return <ErrorView … />;`. (B13)
- `vendor-dashboard/settings/page.js` — same issue: it shows `SimpleLoading` for `profileLoading` but doesn't render an error state on profile fetch failure. (B13)
- `host/settings/_components/AccountSettings.js:73` — `console.error("Error updating account settings:", error);` is followed by a `toastUtils.error`. Remove the `console.error` per D6 (toast already surfaces the failure).
- `ui/settings/notificationsPrefrences/NotificationPreferences.js:91` — same pattern. Remove `console.error`.
- `vendor-dashboard/settings/page.js:66,87,159` — three `console.error` calls inside catch blocks alongside `toast.error`. Remove. (D6)
- `useUsers.js:304` — `useUserMutation` has a global `onError: (error) => console.error(...)`. Remove. (B22 / A9 / D6 — it adds noise without surfacing anything to the user, and obscures the mutation's own onError.)
- `host/settings/page.js:32` — `if (profileLoading || (activeTab === "notifications" && notifLoading))` — the notification fetch always runs, but the loading guard only fires when the tab is active. If a user lands on `notifications` first, `notifLoading` is true and `profileLoading` is false, then the whole page shows `SimpleLoading` — UX OK but a racey re-render. Acceptable. Document.

### 3.7 Comment hygiene
- `useUsers.js` — no FLOW markers. Clean.
- `services/settings.js` — comment-rich but no markers. Acceptable, but the file is being deleted per §3.5.
- `vendor-dashboard/settings/page.js:151-155` — inline `// Update top-level user fields (email only — phone requires OTP flow)` is a useful *why*. Keep.
- `vendor-dashboard/settings/page.js:73,141-162` — large in-line `onSave` callbacks for `BasicAccountInfo` (~30 lines). Extract to a `useVendorSaveHandlers` hook for legibility (no style impact). Optional.
- `AccountSettings.js`, `NotificationPreferences.js` — clean.

---

## 4. Frontend Mobile Findings

### 4.1 Screen → component tree

**`screens/host/AccountSettingsScreen.js`** (65 lines)
- `components/settings/AccountSettings.js` (235 lines)
  - `components/settings/_components/EmailVerificationSection.js` (183 lines)
- `components/plans/TopBar`
- Hooks: `useUpdateProfile`, `useChangePassword` (mutations/useUserMutations.js).

**`screens/host/NotificationSettingsScreen.js`** (66 lines)
- `components/settings/NotificationSettings.js` (322 lines)
- Hooks: `useNotificationSettings` (queries/useUser.js), `useUpdateNotificationSettings` (mutations/useUserMutations.js).

**`screens/admin/admin-dashboard/AdminAccountSettingsScreen.js`** (65 lines)
- Re-uses `components/settings/AccountSettings.js`.
- Hooks: same as host.

**`screens/admin/admin-dashboard/AdminNotificationSettingsScreen.js`** (63 lines)
- `components/admin-dashboard/settings/AdminNotificationSettings` (separate component — divergent from web's role-aware shared component).
- Hooks: `useNotificationSettings`, `useUpdateNotificationSettings` (good — uses the canonical hook).

**`components/admin-dashboard/settings/SettingsSecurity.js`** (91 lines) and **`SettingsNotifications.js`** (122 lines) — these appear to be older versions that still use raw service calls and inline `useEffect`. Either dead or used by a parallel admin-dashboard surface (worth confirming who imports them). They directly call `changePasswordAPI`, `getNotificationPreferencesAPI`, `updateNotificationPreferencesAPI`.

**`screens/vendor/VendorSettingsScreen.js`** (70 lines)
- Imports `vendorService` indirectly via `useUpdateVendorProfile` / `useVendorProfile`.

**`screens/vendor/VendorAccountSetupScreen.js`** (184 lines) — also touches `vendorService.updateSection`.

### 4.2 File-size violations
None — `NotificationSettings.js` 322 lines is the largest, under the 350 cap. `AccountSettings.js` 235, `EmailVerificationSection.js` 183, `VendorAccountSetupScreen.js` 184 — all OK.

### 4.3 Service / hook violations
- **`services/vendorService.js`** uses **raw `axios.create()` + manual interceptor (lines 21-41)** instead of `apiFetch` (C1 violation). The whole file must be migrated to use `apiFetch` and centralize auth/refresh-on-401/timeout. Hardcoded paths (`"/users/profile"`, `` `/users/profile/${section}` ``, `"/users/password"`) must be replaced with `ENDPOINTS.USERS.PROFILE`, `ENDPOINTS.USERS.UPDATE_PROFILE`, etc. — and a new `ENDPOINTS.USERS.UPDATE_PROFILE_SECTION(section)` and `ENDPOINTS.USERS.UPDATE_PASSWORD` need to be added to `config/api.js`. (`vendorService.js:1-170`, `config/api.js:120-124`)
- **`components/admin-dashboard/settings/SettingsSecurity.js`** — calls `changePasswordAPI` directly inside the screen via `useState`/`Alert` (C2 violation). Migrate to `useChangePassword` from `hooks/mutations/useUserMutations.js`. Remove the `Alert.alert` calls in favor of the `useToast` context already in use elsewhere. (`SettingsSecurity.js:1-91`)
- **`components/admin-dashboard/settings/SettingsNotifications.js`** — `useState` + `useEffect` for server data (C4 violation), direct service calls (C2), no React Query. Migrate to `useNotificationSettings` + `useUpdateNotificationSettings`. (`SettingsNotifications.js:1-122`)
- **`hooks/queries/useUser.js:33-36`** — `return response.data?.preferences || response.data || response;` is a fallback chain (C3 / D3 violation). Backend always returns `{ data: { preferences }}`. Replace with `return response.data?.preferences;`. (Then update `screens/host/NotificationSettingsScreen.js:17` `response?.preferences` → `response` since the hook now returns the unwrapped preferences.)
- **`useUser.js`** does not include a `useMyProfile` mutation parity — there's `useProfile` but no top-level `useUpdateProfile` (the mutation is in a separate file `useUserMutations.js`). That's the project convention; OK.
- **`hooks/mutations/useUserMutations.js`** — three mutations all call `_legacyToken` parameter on the service (C1 transitional). Per the prompt's note, **drop the `token` argument when the next consumer touches it**. Do that. Also `useChangePassword` has no `onSuccess` invalidation — fine because no query depends on the password.
- **`services/settingsService.js:55-76`** — `changePasswordAPI` accepts either an object or two strings (`if (typeof passwordData === "object")` branch). Pick one shape (object). The current weird signature exists because legacy callers passed two strings. Find any remaining string-style caller and migrate; then delete the branch.
- **`services/settingsService.js:88-100`** — `getNotificationPreferencesAPI` and `updateNotificationPreferencesAPI` are good. Keep.
- **Mobile has no equivalent of `useUserMutation("updateProfileSection")` for hosts** — only vendor uses it (via `vendorService`). Hosts use only `updateProfileAPI` (top-level). That mirrors the host UI which has no profile-section concept on mobile. OK.

### 4.4 Hardcoded text / data / paths
- `SettingsSecurity.js:40,42,52,62,69,73,84,86,87` — every string is hardcoded English: `"Security"`, `"Current Password"`, `"New Password"`, `"Confirm Password"`, `"Change Password"`, `"Changing..."`, `"Error"`, `"Passwords do not match"`, `"Password must be at least 8 characters"`, `"Password changed successfully"`, `"Failed to change password"`. Migrate to `t()`. (C7)
- `SettingsNotifications.js:57,66,70,82,98,116-117` — `"Notifications"`, `"In-App"`, `"Email"`, key formatter; all hardcoded English. Migrate to `t()` and remove the `formatKey` function in favor of looking up labels in the `settings` namespace. (C7)
- `vendorService.js:45,51,57,71,86,92,98,104,110,128,151,157,163` — comments are fine; **paths are hardcoded** (C1). Migrate to `ENDPOINTS.*`.
- `EmailVerificationSection.js` — `t()` is used everywhere. Clean.

### 4.5 Web/Mobile divergence

| Endpoint | Web | Mobile | Backend truth | Action |
|---|---|---|---|---|
| `GET /users/profile` | hook returns full envelope; consumer reads `data.data.user` | `useProfile` returns full envelope; component reads `response.data?.user` then top-level `response.user` (varies by screen) | `{ data: { user }}` | Mobile: standardize the `select` to return `data.user` directly so screens don't have to know the envelope. |
| `GET /users/notification-preferences` | reads `data.data.preferences` | reads `response.data?.preferences \|\| response.data \|\| response` (fallback chain) | `{ data: { preferences }}` | Mobile: drop fallback chain, return `data.preferences` directly. |
| `PATCH /users/password` | sends `{ currentPassword, newPassword, passwordConfirm }` (caller supplies all three) | UI already collects `confirmPassword` + zod-validates it; plumbing drops it: `AccountSettings.js:61` calls `onPasswordChange(currentPassword, newPassword)` only; `AccountSettingsScreen.js:31-37` renames it `oldPassword` and sends `{ oldPassword, newPassword }`; `changePasswordAPI` then auto-sets `passwordConfirm = newPassword`. | requires all three (and equality, validated in service) | **D3 LOCKED — fix mobile plumbing.** Pass `confirmPassword` form → screen → mutation; restore `currentPassword` (drop `oldPassword`); remove auto-equal hack in `changePasswordAPI`. |
| `PATCH /users/profile/:section` | section sent: `vendorData` only (vendor settings) | section sent: anything (`vendorData`, `documents`, etc. via vendorService.updateSection) | accepts `[hostData, vendorData, businessInfo, contactInfo, documents]` | Aligned. Update mobile to use `ENDPOINTS.USERS.UPDATE_PROFILE_SECTION(section)` once added. |
| Notification keys (admin role) | web `NotificationPreferences.js` reads role-specific options from `getNotificationOptionsForRole(USER_ROLES.ADMIN, t)` | mobile `SettingsNotifications.js` hardcodes `["eventUpdates", "subscriptionAlerts", "systemUpdates"]` for `appNotifications` and `["weeklyReport", "criticalAlerts"]` for `emailNotifications` — **these keys do not match the web/admin schema** | backend admin defaults are defined in `models/NotificationPreferencesModel.js` — neither web nor mobile aligns with them perfectly | **Bug** (§6) — pick the canonical key set (the model's) and align both sides. Mobile is the more divergent and should be fixed; web's role-aware schema then becomes the contract. |
| ~~`POST /users/phone/request-update`, `PATCH /users/phone`~~ | — | — | — | **DELETE the routes (D2 locked).** |

### 4.6 Loading / error / empty states
- `screens/admin/admin-dashboard/AdminNotificationSettingsScreen.js` — has loading + error toast. OK.
- `screens/host/NotificationSettingsScreen.js` — has loading + error toast. OK.
- `screens/host/AccountSettingsScreen.js` — no loading state shown for the profile read (relies on `useAuthStore` for the user object). If the cached user is stale, the form prefills with old data. **Bug-ish** — should show loading until at least one read completes, or call `useProfile()` to ensure fresh data. (C6)
- `SettingsSecurity.js` and `SettingsNotifications.js` — no loading/error states beyond `ActivityIndicator`/console.error. (C6)

### 4.7 Comment hygiene
- `services/settingsService.js:1-9` — `Phase 4 W0-AUTH:` block comment. Remove the marker; keep one line that says *why* (the wrapper attaches auth/refresh/timeout).
- `services/settingsService.js:27,33,44` etc. — `_legacyToken` parameter naming. Per the prompt's note, drop the parameter when the next consumer touches it. Plan item.
- `services/vendorService.js:45-167` — descriptive comments are fine; no markers.
- `useUserMutations.js`, `useUser.js` — clean.

---

## 5. Cross-Platform API Consumption Diff

| Endpoint | Aspect | Web | Mobile | Backend truth | Action |
|----------|--------|-----|--------|---------------|--------|
| GET /users/profile | response unwrapping | `data.data.user` | `data.data?.user \|\| data.data` | `data.user` | Mobile drop fallback chain. |
| GET /users/notification-preferences | response unwrapping | `data.data.preferences` | `response.data?.preferences \|\| response.data \|\| response` | `data.preferences` | Mobile drop fallback chain. |
| PATCH /users/password | `passwordConfirm` field | sent by caller | UI collects it but plumbing drops it; wrapper auto-equals to `newPassword` | required + must equal | **D3 LOCKED — fix mobile plumbing** (see §5 row above). |
| PATCH /users/profile | content-type | `multipart/form-data` when caller passes FormData; JSON otherwise | always JSON via `apiFetch` (no FormData branch in `updateProfileAPI`) | accepts both | Mobile: ensure FormData path works through `apiFetch` (it already does for `uploadProfileImageAPI`). Document. |
| PATCH /users/profile/:section | path constants | `API_PATHS.users.updateMyProfileSection(section)` | `vendorService.updateSection` hardcodes the path | accepts `[hostData, vendorData, businessInfo, contactInfo, documents]` | Mobile add `ENDPOINTS.USERS.UPDATE_PROFILE_SECTION(section)`. |
| GET/PATCH /users/notification-preferences | admin-role notification keys | role-aware via `getNotificationOptionsForRole` | hardcoded keys that don't match the model | model defines canonical defaults | Sync both to the model; mobile is the more divergent. |
| /users/phone/* | consumers | none | none | route exists | Add a UI on at least one platform OR delete the route. |
| /users/hosts*, /users/vendors*, /users/moderators* | consumers | `useUsers.js` orphan exports + admin-dash uses `/admin/*` parallel set instead | none | duplicates `/admin/*` | **Delete from users module + delete `useUsers.js` exports.** |

---

## 6. Suspected Bugs Worth Verifying

(Things that look broken but the agent cannot confirm without running the app — flag them so the user can sanity-check.)

1. **`users.controller.js:84` — `deleteHost` argument-order bug.**
   - Service signature: `deleteHost(id, deletedBy = null, whitelabelFilter = null)` (`users.service.js:318`).
   - Controller calls: `usersService.deleteHost(req.params.id, req.whitelabelFilter)`.
   - Result: `deletedBy` receives the whitelabel-filter object, `whitelabelFilter` receives `null`. Soft-delete then writes the filter object into `user.deletedBy` (Mongoose silently casts/fails) and the `findOne` runs without whitelabel scope — **whitelabel admins can delete hosts outside their tenant.** Confirm by trying to delete a host that belongs to another whitelabel as a `WHITELABEL_ADMIN`.
   - Fix: pass `(req.params.id, req.user._id, req.whitelabelFilter)`.

2. **`users.controller.js:127-135` — `updateVendorStatus` doesn't pass `actorId`.**
   - Service signature: `updateVendorStatus(id, statusData, whitelabelFilter = null, actorId = null)` (`users.service.js:442`).
   - Controller calls: `usersService.updateVendorStatus(req.params.id, req.body, req.whitelabelFilter)` — `actorId` is missing.
   - Result: audit row records `actor: { _id: undefined }` and `profile.vendorData.rejectedBy` is never set on rejections. **Audit trail is broken for vendor status transitions.**
   - Fix: pass `req.user._id` as the 4th arg.

3. **`services/settings.js` (web admin settings) — wrong notification-preferences shape.**
   - Reads `notifResponse?.data?.appNotifications || {}` but backend returns `{ data: { preferences: { appNotifications, … }}}`. Should be `notifResponse?.data?.preferences?.appNotifications`.
   - Result: admin settings page on web *always* renders empty/default notification toggles, regardless of saved state. Confirm by toggling, saving, and reloading the admin settings page.

4. **`SettingsNotifications.js` (mobile admin) — divergent admin notification keys.**
   - Hardcodes `appNotifications: { eventUpdates, subscriptionAlerts, systemUpdates }`, `emailNotifications: { weeklyReport, criticalAlerts }`. The backend's `NotificationPreferencesModel` admin defaults differ. The PATCH response will therefore drop unknown keys (Mongoose silent), and on next GET the keys mobile expects are absent → toggles always render OFF.
   - Confirm by checking `models/NotificationPreferencesModel.js` (or wherever admin defaults are defined) against the four keys above.

5. **`users.routes.js:529` — `console.log("Moderators route defined");`** is a stray debug log.

6. **`users.service.js:122` — `getHosts` returns `host.profile?.hostData?.emailVerified`** but the canonical email-verified flag is the top-level `User.emailVerified`. They are kept in sync by `auth.service.js:674,676` and `auth.controller.js:525,530`, so practical behavior matches — but if either path drops the dual write, this row diverges. Use the top-level field.

7. **`users.service.js:691-757` — `updateMyProfile` allows `phoneNumber` then rejects it.** The dead branch on line 743 (`phoneChanged` audit log) can never run because line 696 throws first. Either the rejection should be relaxed (allowing phone updates here) or the audit branch deleted. Likely: delete the audit branch and remove `phoneNumber` from `allowedFields`.

8. **`useUserMutation` exposes auth actions.** `useUserMutation("sendVerificationCode" | "verifyEmail")` calls `API_PATHS.auth.sendVerificationCode` / `API_PATHS.auth.verifyEmail`. Mixing layers — these belong in `useAuthMutation`. The `host/settings/AccountSettings.js` consumer would need a one-line import change.

9. **`ENDPOINTS.USERS` (mobile) is missing entries** for `UPDATE_PASSWORD`, `UPDATE_PROFILE_SECTION(section)`, `PHONE_REQUEST_UPDATE`, `PHONE_CONFIRM` — that's why `vendorService.js` and `settingsService.js` end up hardcoding paths.

10. ~~**Phone-update orphan endpoints.**~~ **Resolved (D2):** routes are being deleted — no further action.

---

## 7. Implementation Plan (Ordered)

Apply changes in this order. Each item ends with a checkbox the agent will tick during Phase 2.

> **Phase-2 entry condition:** all four decisions are LOCKED (Validation=Zod, D1=Delete, D2=Delete, D3=Fix mobile plumbing, C.7=Mongoose model). Agent may proceed without further confirmation. Before deleting routes (A.18), agent must still re-grep both repos for any non-obvious string-built path references and surface them.

### 7.A Backend
- [ ] **A.1** **DELETE rows 9–18** (`/users/hosts*`, `/users/vendors*`, `/users/moderators*`): routes, controller methods, service methods, Swagger blocks, and any related private helpers (`_assignHostSubscription`, `_notifyStatusChange`, `_notifyVendorStatusChange`). Before deleting, re-grep both repos for any string-built path references. After deletion, re-measure `users.service.js` and `users.routes.js`; both should now be well under caps — no split needed.
- [ ] **A.2** **DELETE rows 7–8** (`POST /users/phone/request-update`, `PATCH /users/phone`): routes, controller methods, service methods, Swagger blocks. Drop the related inline imports (`auth/otp.service`, `shared/utils/phone`) once they have no remaining usage.
- [ ] **A.3** Delete the stray `console.log("Moderators route defined");`. (`users.routes.js:529` — will likely be removed as part of A.1.)
- [ ] **A.4** Remove `phoneNumber` from `allowedFields` in `updateMyProfile`; delete the dead `phoneChanged` audit branch (since A.2 deletes the OTP flow, phone updates are entirely out of scope for this module). (`users.service.js:700,743-754`)
- [ ] **A.5** Lift any remaining inline `require()`s to top-level imports: `crypto` (line 233), `shared/constants/events` (216), and any others surviving A.1/A.2. Confirm none remain.
- [ ] **A.6** Collapse the legacy/structured branch in `getNotificationPreferences` and the `toStore` fallback in `updateNotificationPreferences` (no behavior change). (`users.service.js:935-947, 956-962`)
- [ ] **A.7** Add `users.validation.js` using **zod** with: `updatePasswordSchema`, `updateProfileSchema`, `updateProfileSectionSchema` (+ param-level `section` enum), `updateNotificationPreferencesSchema`. Wire via `validateZod` middleware (`shared/middleware/validation.js:373`) on the four surviving mutation endpoints (rows 2, 3, 4, 6). See §2.6 for shapes.
- [ ] **A.8** Fix `PATCH /users/profile/:section` JSDoc enum to `[hostData, vendorData, businessInfo, contactInfo, documents]`. (`users.routes.js:140`)
- [ ] **A.9** Replace empty `type: object` request bodies in JSDoc with proper schema refs for `PATCH /users/profile`, `PATCH /users/profile/:section`, `PATCH /users/notification-preferences`. Add response schemas for `GET /users/profile`, `GET /users/notification-preferences`. Define the missing component schemas in `config/swagger.js` (e.g. `UpdateProfileInput`, `UpdateProfileSectionInput`, `NotificationPreferencesUpdateInput`, `NotificationPreferencesEnvelope`).
- [ ] **A.10** Comment hygiene pass — strip every surviving FLOW-/PHASE-/TENANT-/W0- marker (most disappear with A.1/A.2; sweep what's left). Preserve genuine *why* comments (e.g. JSON-stringified multipart fields).

### 7.B Web
- [ ] **B.1** Replace fallback chain in `services/settings.js:20,37` (`userResponse?.data?.user || userResponse?.data || null` → `userResponse?.data?.user || null`; `notifResponse?.data?.appNotifications || {}` → `notifResponse?.data?.preferences?.appNotifications || {}`). (Bug §6.3) — superseded by B.2 if that runs first; keep as a fallback step in case B.2 is staged.
- [ ] **B.2** Migrate `app/[lang]/admin-dash/settings/page.js` to the B4 server-component pattern: use `prefetchServerData` with `API_PATHS.users.getMyProfile` and `API_PATHS.users.getNotificationPreferences`, wrap children in `QueryClientServerProvider`, rely on `useMyProfile`/`useNotificationPreferences` client-side. **Delete `services/settings.js` entirely.**
- [ ] **B.3** **DELETE** the dead host/vendor/moderator hooks and mutations from `hooks/reactQueryHooks/useUsers.js`: `useHosts`, `useHost`, `useVendors`, `useVendor`, `useModerators`, and the `createHost/deleteHost/updateHostStatus/updateVendorStatus/createModerator` cases of `useUserMutation`. Delete the corresponding `API_PATHS.users.{getHosts, createHost, getHostById, deleteHost, updateHostStatus, getVendors, getVendorById, updateVendorStatus, getModerators, createModerator}` entries. (Locked by D1.)
- [ ] **B.4** Move `sendVerificationCode` and `verifyEmail` actions out of `useUserMutation` into `useAuthMutation` (they call `API_PATHS.auth.*`). Update `host/settings/_components/AccountSettings.js:21-22` to import from `useAuthMutation`. (`hooks/reactQueryHooks/useUsers.js:206-226`)
- [ ] **B.5** Remove the global `onError: console.error` from `useUserMutation`. (`useUsers.js:303-305`)
- [ ] **B.6** Remove `console.error` from catch blocks in `host/settings/_components/AccountSettings.js:73`, `vendor-dashboard/settings/page.js:66,87,159`, `ui/settings/notificationsPrefrences/NotificationPreferences.js:91`. Keep the `toastUtils.error`. (D6)
- [ ] **B.7** Add an inline error state to `host/settings/page.js` and `vendor-dashboard/settings/page.js` for `useMyProfile` errors (B13). Use `<ErrorFallback message={t("errors.loadFailed")} />` shape consistent with sibling pages.
- [ ] **B.8** Replace inline `style={{...}}` on `host/settings/page.js:50-54` with a CSS module class. (B11)
- [ ] **B.9** Replace hardcoded Arabic literals in `t(key) || "Arabic"` with `t(key, "Arabic")` second-arg fallback in `host/settings/page.js:28-30,36,56`. (B2)
- [ ] **B.10** **(C.7)** Update `utils/schemas/notificationPreferencesSchemas.js` admin role keys to match `NotificationPreferencesModel.js`. (Locked: Mongoose model is canonical.)

### 7.C Mobile
- [ ] **C.1** Add `ENDPOINTS.USERS.UPDATE_PASSWORD = "/users/password"` and `ENDPOINTS.USERS.UPDATE_PROFILE_SECTION = (section) => `/users/profile/${section}`` to `config/api.js`. (Phone endpoints NOT added — D2 deletes them.) (`config/api.js:120-124`)
- [ ] **C.2** Migrate `services/vendorService.js` from raw axios to `apiFetch`. Replace hardcoded paths `"/users/profile"`, `` `/users/profile/${section}` ``, `"/users/password"` with `ENDPOINTS.USERS.PROFILE`, `ENDPOINTS.USERS.UPDATE_PROFILE_SECTION(section)`, `ENDPOINTS.USERS.UPDATE_PASSWORD`. Remove the bespoke `axios.create` and interceptors. (`vendorService.js:1-170`)
- [ ] **C.3** Drop fallback chain in `hooks/queries/useUser.js:33-36`. Return `response.data?.preferences` only. Update `screens/host/NotificationSettingsScreen.js:17` accordingly so it consumes the unwrapped preferences. (C3)
- [ ] **C.4** Replace `components/admin-dashboard/settings/SettingsSecurity.js`'s direct `changePasswordAPI` call with `useChangePassword` hook from `hooks/mutations/useUserMutations.js`. Replace `Alert.alert` with `useToast`. Migrate hardcoded English to `t("settings.security.*")` keys (list new keys in §8). (`SettingsSecurity.js:1-91`)
- [ ] **C.5** Replace `components/admin-dashboard/settings/SettingsNotifications.js` `useState`/`useEffect`/raw API calls with `useNotificationSettings` + `useUpdateNotificationSettings` from the canonical mobile hooks. Migrate hardcoded English to `t()`. Align the admin notification key set with the **Mongoose model** (see C.7). (`SettingsNotifications.js:1-122`)
- [ ] **C.6** Drop the `_legacyToken` parameter from `getProfileAPI`, `updateProfileAPI`, `uploadProfileImageAPI`, `changePasswordAPI`, `deleteAccountAPI`, `updateAccountAPI`, `getNotificationPreferencesAPI`, `updateNotificationPreferencesAPI`, `sendEmailVerificationCodeAPI`, `verifyEmailAPI` (and update their callers in `useUserMutations.js`, `useUser.js`, `EmailVerificationSection.js`, `SettingsSecurity.js` after C.4). (`services/settingsService.js`)
- [ ] **C.7** **(LOCKED — Mongoose model is canonical.)** Read `labbe-backend-/src/models/NotificationPreferencesModel.js`, extract the admin-role default key set, and apply to both mobile `SettingsNotifications.js` (after C.5) and web `utils/schemas/notificationPreferencesSchemas.js` (B.10). No further decision needed.
- [ ] **C.8** **(D3 — LOCKED — fix mobile password plumbing.)**
  - `components/settings/AccountSettings.js:18-21,49-77` — change `onPasswordChange` callback signature to accept the full form data (or `{currentPassword, newPassword, confirmPassword}`); pass `confirmPassword` through.
  - `screens/host/AccountSettingsScreen.js:31-41` — rename `handlePasswordChange(oldPassword, newPassword)` to accept `{currentPassword, newPassword, confirmPassword}`; send `{currentPassword, newPassword, passwordConfirm: confirmPassword}` to the mutation. Replicate the same fix in any admin/vendor screen using `useChangePassword`.
  - `services/settingsService.js:55-76` (`changePasswordAPI`) — accept only the `{currentPassword, newPassword, passwordConfirm}` object shape; delete the `if (typeof passwordData === "object")` legacy branch and the `passwordConfirm = newPassword` auto-equal hack.
  - `hooks/mutations/useUserMutations.js` — `useChangePassword` mutationFn just forwards the object; verify no callers still pass two strings.
- [ ] **C.9** Update `screens/host/AccountSettingsScreen.js` to call `useProfile()` (not just `useAuthStore`) so the form prefills from a fresh fetch and shows a loading state until the read completes. (C6)
- [ ] **C.10** Comment hygiene — strip `Phase 4 W0-AUTH:` block in `services/settingsService.js`, `components/admin-dashboard/settings/SettingsNotifications.js`, and any `_legacyToken` JSDoc lines now obsolete after C.6. (~6 lines)

### 7.D Cross-platform alignment (do AFTER A/B/C)
- [x] ~~**D.1**~~ **LOCKED — APPROVED.** Executed via A.1 (backend) + B.3 (web). After execution, re-grep both repos for `/users/hosts`, `/users/vendors`, `/users/moderators` and confirm zero references remain.
- [x] ~~**D.2**~~ **LOCKED — DELETE.** Executed via A.2 (backend route deletion). After execution, re-grep both repos for `/users/phone` and confirm zero references remain.
- [x] ~~**D.3**~~ **LOCKED — FIX MOBILE PLUMBING.** Executed via C.8.
- [ ] **D.4** Re-grep `/users/profile`, `/users/password`, `/users/notification-preferences` across `labbe/` and `halla-mobile/` and confirm zero call sites bypass the canonical hooks/services. Add an integration smoke test: log in as host on web, change name + password (test confirm-password mismatch + happy path) + notification toggle; log in as the same user on mobile, verify the changes are visible. (Document the manual smoke check; do not write a real test unless asked.)
- [ ] **D.5** Verify `useChangePassword` mobile + `useUserMutation("updatePassword")` web both succeed against the validated `updatePasswordSchema` from A.7. Specifically test that mismatched `passwordConfirm` is rejected by the zod refinement on both platforms.

---

## 8. Locale-key additions required

(Listed for the user — agent does NOT modify locale JSON without explicit approval.)

**Web (`labbe/localization/locales/{en,ar}/settings.json`):**
- (likely already present — no new web keys identified that aren't already used as `t()` calls with fallbacks. Verify the keys `tabs.account`, `tabs.notifications`, `errors.boundary`, `errors.loadFailed` exist.)

**Mobile (`halla-mobile/localization/<settings.json>`):**
- `settings.security.title` (en: "Security", ar: "الأمان")
- `settings.security.currentPassword` (en: "Current Password", ar: "كلمة المرور الحالية")
- `settings.security.newPassword` (en: "New Password", ar: "كلمة المرور الجديدة")
- `settings.security.confirmPassword` (en: "Confirm Password", ar: "تأكيد كلمة المرور")
- `settings.security.changePassword` (en: "Change Password", ar: "تغيير كلمة المرور")
- `settings.security.changing` (en: "Changing…", ar: "جاري التغيير…")
- `settings.security.passwordsDoNotMatch` (en: "Passwords do not match", ar: "كلمات المرور غير متطابقة")
- `settings.security.passwordTooShort` (en: "Password must be at least 8 characters", ar: "يجب أن تتكون كلمة المرور من 8 أحرف على الأقل")
- `settings.security.changeSuccess` (en: "Password changed successfully", ar: "تم تغيير كلمة المرور بنجاح")
- `settings.security.changeError` (en: "Failed to change password", ar: "فشل تغيير كلمة المرور")
- `settings.adminNotifications.title` (en: "Notifications", ar: "الإشعارات")
- `settings.adminNotifications.inApp` (en: "In-App", ar: "داخل التطبيق")
- `settings.adminNotifications.email` (en: "Email", ar: "البريد الإلكتروني")
- One label per admin notification key — TBD after C.7 picks the canonical set.

---

## 9. Rollback plan

- Backend changes (A.1–A.17): each is small and isolated; per-commit `git revert`.
- A.18 (deletion of host/vendor/moderator endpoints): revert the deletion commit. The data layer is untouched (no DB schema change, no migration). Mobile/web orphan hook deletions revert independently.
- Web B.1–B.10: per-commit revert.
- Mobile C.1–C.10: per-commit revert. C.2 (vendorService → apiFetch) carries a small risk of breaking vendor settings flows; smoke-test before merge.
- No DB migrations are required by this plan.

---

## 10. Acceptance checklist (run after Phase 2)

- [ ] No file in module exceeds the cap (D1+D2 deletions take both backend files well under cap — no split needed).
- [ ] Every surviving `users` endpoint has a current Swagger block with a real schema (no empty `type: object`).
- [ ] Rows 9–18 (host/vendor/moderator) fully removed from backend, web hooks, and `API_PATHS.users.*`.
- [ ] Rows 7–8 (phone update) fully removed from backend; no UI exists.
- [ ] Web + Mobile call the same paths with the same shapes for self-profile, password, notification-preferences, profile-section.
- [ ] Mobile password change sends `{ currentPassword, newPassword, passwordConfirm }` end-to-end; mismatch is rejected by zod and surfaces a clear error.
- [ ] Admin notification key set matches `NotificationPreferencesModel.js` on both web and mobile.
- [ ] No fallback chains in data mapping in this module's surface area on web or mobile.
- [ ] No `// FLOW-…` / `// PHASE-…` / `// TENANT-…` / `// W0-…` markers in module's surface area (backend, web, mobile).
- [ ] No `console.log` in committed code; `console.error` only inside catch blocks that ALSO surface a user-visible error.
- [ ] `users.validation.js` exists, uses **zod** (not Joi), and every surviving PATCH runs through `validateZod`.
- [ ] `npm run lint` clean (or no new warnings introduced).
- [ ] Manual smoke test: log in as host on web → edit profile → save → password change (confirm-mismatch path + happy path) → notification toggle → log in same user on mobile → confirm same state.
- [ ] Manual smoke test (admin): log in as admin on web → settings → notification toggle saves and reloads; same on mobile admin dashboard.
- [ ] Visual smoke test: every settings page/screen renders identically before/after the refactor (Core Rule).
