# Business Account — Research: Account model, admin creation popup, host dashboard, and spec

**Date:** 2026-06-20 · **Scope:** read-only research to spec a NEW `business` account that is "host-like with small differences", created from the admin dashboard.
**Constraint:** Do NOT reintroduce `whitelabelId`/tenant scoping. Spec on top of the post-whitelabel-removal world (`docs/whitelabel-removal/FINAL_MIGRATION_PLAN.md`). The `availableFor:'whitelabel'` plan tag + the 8 business Plan docs are KEPT (migration decision #1).

All paths absolute. `file:line` throughout.

---

## (A) Host account model + role

### A.1 How a host is represented (`UserModel`)
`D:\halla\labbe-backend-\models\UserModel.js` — one unified `User` collection, role-discriminated.

- **Role enum:** `role` field `D:\halla\labbe-backend-\models\UserModel.js:306-311` — `enum: Object.values(ROLES)`, default `GUEST`. `ROLES.HOST = 'host'`.
- **Identity (top-level, shared by all roles):**
  - `email` `:240-250` (lowercased, validated, unique sparse `:425-428`)
  - `mobile` `:253-263` (unique sparse) + legacy `phoneNumber` `:266-270`
  - `username` `:272-277`, `name` `:279-283`
  - **`avatar` `:285`** — top-level image field; **this is the host "logo" slot** (signed on read, see below).
  - `password` `:288-292` (`select:false`, bcrypt-hashed in pre-save `:474-490`)
- **Host-specific profile subdoc:** `hostDataSchema` `:28-38` stored at `profile.hostData` `:364`. Fields: `profileCompleted`, `emailVerified`, `subscribedBefore`, **`bio`**, `company`, `position`. (`bio`/`company` are the only free-text "description"-like fields a host has.)
- **Subscription link:** `subscription` `:357-360` → ref `Subscription`.
- **Permissions:** `permissions` `:314-320` default via `getDefaultPermissions(this.role)` (pre-save `:522-530`).
- **Status:** `status` `:323-327` (`USER_STATUS`, default `ACTIVE`).
- **Tenancy (TO BE REMOVED):** `whitelabelId` `:343-348`, `domain` `:351-354`. Business must NOT use these.
- **Image signing:** `toPublicJSON()` `:749-812` signs `avatar` `:763` and, via `roleDataMap` `:768-777`, copies the role's subdoc to `roleData`. **Note `roleDataMap` has no `business` entry yet** — a business role would fall through and return no `roleData`.

### A.2 How a host gets a subscription / plan
- **At admin creation:** `admin.hosts.service.createHost` auto-creates a **trial** subscription: `D:\halla\labbe-backend-\src\modules\admin\admin.hosts.service.js:231-250` (finds `Plan.findOne({code:'trial'})`, creates `Subscription` in a txn, links `user.subscription`).
- **Self-serve purchase:** host plans page → `useCheckout` → `POST /payments/checkout` → `checkout.service.checkout` (see D.6). Subscription model: `D:\halla\labbe-backend-\models\SubscriptionModel.js`.
- **Admin override:** `admin.hosts.service.updateHostSubscription` `:300-355` (PATCH `/admin/hosts/:id/subscription`).

### A.3 Where ROLES / role enums live (a new `business` role goes here)
- **Shared (frontend source of truth):** `D:\halla\shared\src\constants\roles.js`
  - `ROLES` `:8-17`, `USER_ROLES` alias `:20`
  - `ROLE_HIERARCHY` `:26-48` (SUPER_ADMIN array `:27-35`, ADMIN array `:36`, HOST `:45`)
  - `ADMIN_ROLES` `:50-56`, `isAdminRole` `:69`, `hasRoleAccess` `:73-76`, `getManageableRoles` `:78`
  - WL symbols slated for deletion: `WHITELABEL_ROLES` `:58-61`, `PLATFORM_ADMIN_ROLES` `:63-67`, `isWhitelabelRole`/`isPlatformAdmin` `:70-71`.
- **Backend copy (mirror):** `D:\halla\labbe-backend-\src\shared\constants\roles.js` — `ROLES` `:10-19`, `ROLE_HIERARCHY` `:24-46`, `ADMIN_ROLES` `:51-57`, exports `:110-121`.
- **Default permissions** resolved by `getDefaultPermissions(role)` — defined in the **backend** `D:\halla\labbe-backend-\src\shared\constants\permissions.js:55` (`DEFAULT_PERMISSIONS` map + `getDefaultPermissions`), imported by `UserModel.js:11-17`. (The shared `permissions.js` exports only `ADMIN_PAGES`, not the perms map or `ROLE_PAGE_ACCESS`.)
- **`ROLE_PAGE_ACCESS` (backend matrix):** `D:\halla\labbe-backend-\src\shared\constants\permissions.js:97` — the canonical per-role page-access matrix; web `navConfig.js` + `serverAuth.js` are mirrors. A `business` role does NOT need a row here (it never enters admin-dash).
- **Notification-prefs are role-keyed:** `D:\halla\shared\src\schemas\settings.js` `getNotificationSchemaForRole` / `getNotificationDefaultsForRole` (a new role needs a case or must reuse host's).

> A new `business` role must be added to BOTH `roles.js` copies. See (D.1) for exactly which structures — crucially **NOT** `ADMIN_ROLES` (business is host-like, not an admin).

---

## (B) Admin creation-popup pattern (host / moderator) + endpoints

This is the template for the business-account creation popup (email / name / desc / phone / logo / password).

### B.1 Web popups (closest existing patterns)
- **AddHostPopup:** `D:\halla\labbe\app\[lang]\admin-dash\hosts\_components\AddHostPopup.jsx`
  - `react-hook-form` + `zodResolver(addHostSchema)` `:19-22`; schema imported from `@halla/shared/schemas/admin` `:10`.
  - Fields: `name`, `email`, `phoneNumber`, `password` (all via `InputGroup`) `:43-69`.
  - Wrapped in `PopupLayout` `D:\halla\labbe\ui\commen\popup\PopupLayout` (import `:11`).
  - Submits through `useAdminHostMutation("create")` `:16` → `createHost.mutateAsync(data)` `:26`. **Plain JSON, no file upload.**
- **AddModeratorPopup:** `D:\halla\labbe\app\[lang]\admin-dash\moderators\_components\AddModeratorPopup.jsx`
  - Same shape + a `role` `InputSelect` `:95-101`; `zodResolver(addModeratorSchema)` `:35-44`.
  - `useAdminModeratorMutation("create")` `:19`. Note the WL-role branch `:21-33` (deleted by migration).
- **Shared zod schemas:** `D:\halla\shared\src\schemas\admin.js`
  - `addHostSchema` `:21-29` (name, email, phoneNumber regex `:15`, password optional).
  - `addModeratorSchema` `:42-51` (adds `role`).
  - Neither has a `description` or `logo` field — **a `addBusinessSchema` must be authored here.**
- **Mobile equivalent:** `D:\halla\halla-mobile\components\admin-dashboard\moderators\AddModeratorModal.js` — bottom-sheet `Modal`, manual `validate()` `:92-108`, `useCreateModerator()` `:31`, fields name/email/password/phone/role `:166-318`. (No web/mobile popup uploads an image.)

### B.2 API endpoints + backend services
- **Host create:** `POST /admin/hosts` — `D:\halla\labbe-backend-\src\modules\admin\admin.hosts.routes.js:204-210`
  - Middleware: `requirePageAccess(ADMIN_PAGES.HOSTS,'create')` → `filterByWhitelabel` (deleted) → `validateZod(createHostSchema)` → `auditLog` → `adminController.createHost`.
  - Backend zod: `createHostSchema` `D:\halla\labbe-backend-\src\modules\admin\admin.validation.js:11-19`.
  - Service: `admin.hosts.service.createHost({email,phoneNumber,name,username,password,whitelabelId})` `D:\halla\labbe-backend-\src\modules\admin\admin.hosts.service.js:168-263`:
    - Dedup email/phone `:170-185`; `User.create({...role:ROLES.HOST,status:ACTIVE,profile:{hostData:{profileCompleted:true}}})` `:214-229`; **password is set as a plain field — the `UserModel` pre-save hook hashes it (`:474-490`)**; trial subscription `:231-250`; welcome notification `:253-260`.
- **Moderator create:** `POST /admin/moderators` — `D:\halla\labbe-backend-\src\modules\admin\admin.moderators.routes.js:68-74`; backend zod `createModeratorSchema` `admin.validation.js:61-71` (`password` REQUIRED min 6); service `admin.moderators.service.createModerator` `D:\halla\labbe-backend-\src\modules\admin\admin.moderators.service.js:74-142` (role pinned to actor scope `:107-117`).
- **Mounting / RBAC:** routes gate on `requirePageAccess(ADMIN_PAGES.<X>, action)` (`rbac` middleware). `ADMIN_PAGES` live in `shared/src/constants/permissions.js` + backend copy, and the web mirrors in `navConfig.js` (`ROLE_NAV_ACCESS`/`ROLE_PAGE_ACCESS`) and `serverAuth.js` (`ADMIN_PAGES`/`ROLE_PAGE_ACCESS`).

### B.3 Logo upload — the living mechanism (IMPORTANT: not present on admin-create today)
The admin host/moderator create routes are **plain JSON** (`validateZod`, no multer). The only living user-image-upload path is the **profile update** route:
- **Route:** `PATCH /users/profile` — `D:\halla\labbe-backend-\src\modules\users\users.routes.js:41-46` — middleware `uploadUserProfile` (multer) `:17,43` → `validateZod(updateProfileSchema)` → `usersController.updateMyProfile`.
- **Handler:** `users.service.js:85-96` — `processUploadedFiles(files)` → if `uploaded.avatar` set `user.avatar` `:86-89` (and `businessLogo` for vendors `:90-96`).
- **Multer + key extraction:** `uploadUserProfile` + `extractStoredRef` `D:\halla\labbe-backend-\src\shared\utils\s3Upload.js:496-507`, `processUploadedFiles` `:514-534`. Stored value is an **S3 key**; `signStoredImage` `:564` mints a URL on read (called in `toPublicJSON` `UserModel.js:763`).
- **Precedent for "create account WITH a logo file":** the (being-deleted) `auth.service.signupWhitelabel(userData, logoFile)` `D:\halla\labbe-backend-\src\modules\auth\auth.service.js:620-666` used `extractStoredRef(logoFile)` `:635` and stored it in `whitelabelData.logo` `:646`.

> Consequence: there is **no existing admin-popup file-upload template**. The business popup's logo needs either (i) multer on the new create route (mirror `uploadUserProfile`, store key in `avatar`), or (ii) a two-step "create JSON, then `PATCH /users/profile` avatar" flow. This is Open Question #1.

---

## (C) Host dashboard / settings / plans structure (web + mobile) + reusable components

### C.1 Host dashboard shell (web)
- **Routes root:** `D:\halla\labbe\app\[lang]\host\` — `layout.jsx`, `page.js`, `HostDashboardContent.jsx`, plus subroutes `events/`, `payments/`, `tickets/`, `plans/`, `market-place/`, `settings/`, `post-event/`, `create-event/`, `update-event/`.
- **Layout:** `D:\halla\labbe\app\[lang]\host\layout.jsx:1-20` — renders `<Header dashboardType={DASHBOARD_TYPES.HOST}/>` + `<ResponsiveSidebar dashboardType={DASHBOARD_TYPES.HOST}/>` from `@/ui/layout` `:4,13-14`.
- **Dashboard page:** `host\page.js:8-35` prefetches `API_PATHS.dashboard.getHostDashboard` then renders `HostDashboardContent`.
- **Nav:** `hostNavItems` `D:\halla\labbe\ui\layout\navConfig.js:55-106` — dashboard / events / payments / tickets / **plans** (`/host/plans` `:86-91`) / shop / settings.
  - **KEY:** `DASHBOARD_TYPES.HOST` `navConfig.js:46`. `getNavItems(HOST)` returns `hostNavItems` UNFILTERED `:611-612` — **host nav is NOT role-gated** (unlike admin's `ROLE_NAV_ACCESS`). So any user routed into `/host` gets the full host nav for free.
  - `getDashboardTypeFromPath` `:637-660` maps the `host` path segment → `DASHBOARD_TYPES.HOST` `:655-656`; `getBasePath(HOST)='host'` `:675-677`.

### C.2 Host routing / role gating (how a host lands on `/host`)
- **Client middleware:** `D:\halla\labbe\middleware.js`
  - `getRedirectPath(role)` `:84-90` — host→`/host` `:88`, admins→`/admin-dash`, vendor→`/vendor-dashboard`. Reads `userType` cookie `:111`.
  - **Host-route gate:** `:209-214` — `if (isHostRoute && userType !== USER_ROLES.HOST) redirect(...)`. This is the exact line a `business` role must be admitted through.
  - `USER_ROLES` local copy `:9-17`.
- **Server-side:** `D:\halla\labbe\services\serverAuth.js` — `USER_ROLES` `:14-23`, `ADMIN_ROLES` `:65-71`, `ROLE_PAGE_ACCESS` `:85-162` (admin-dash pages only; host has no entry — host pages aren't RBAC-gated server-side, they rely on the middleware + being under `/host`).

### C.3 Host settings (web) — "changes a little bit" baseline
- **Page:** `D:\halla\labbe\app\[lang]\host\settings\page.js:16-105`.
  - Two tabs `:28-31`: **`account`** + **`notifications`**.
  - `account` → `AccountSettings` `:78-88`; `notifications` → `NotificationPreferences` with `userRole={USER_ROLES.HOST}` `:89-95`.
- **AccountSettings:** `D:\halla\labbe\app\[lang]\host\settings\_components\AccountSettings.js`
  - `zodResolver(accountSettingsSchema(t))` `:25-35` (from `@halla/shared/schemas/settings` `:9`).
  - Fields: `username` `:113-121`, `email` (+ verify-email OTP flow `:78-105,132-159`), and a password-change block `:162-193`.
  - Mutations: `useUserMutation("updateProfile"|"updatePassword")` `:20-21`, `useAuthMutation("sendVerificationCode"|"verifyEmail")` `:22-23`.
- **NotificationPreferences:** `@/ui/settings/notificationsPrefrences/NotificationPreferences` (role-keyed schema). Host prefs are `appNotifications`-only per `UserModel.js:329-339`.

### C.4 Host plans page (web) — fetch + render + the swap target
- **Route:** `D:\halla\labbe\app\[lang]\host\plans\` — `page.js`, `PlansPage.js`, `plans.module.css`, `_components/`, `_hooks/`, `summary/`.
- **Render:** `D:\halla\labbe\app\[lang]\host\plans\PlansPage.js`
  - Components: `CurrentPlanCard`, `BillingTypeToggle`, `AddonsSection`, **`HostPlanCard`** (from `./_components` `:5-10`), plus `Summary` `:11`.
  - Plans grid renders **exactly two `HostPlanCard`s**: `planFamily="basic"` `:157-165` and `planFamily="premium"` `:166-175`, each fed `basicPlans`/`premiumPlans`.
- **State hook:** `D:\halla\labbe\app\[lang]\host\plans\_hooks\usePlansPageState.js`
  - **Data source:** `useHostPlans()` `:7,21` (from `@/hooks/plans`).
  - `billingType` toggle is `"event" | "monthly"` `:27`; selects `actualPlansData.basic[billingType]` `:42-48` and `.premium[billingType]` `:49-55`.
  - Checkout: `handleProceedToPayment` → `useCheckout().mutateAsync({planCode, addons, discountCode, source})` `:131-136`; success → `router.push('/${lang}/host')` `:149`.
- **Plans hooks:** `D:\halla\labbe\hooks\plans\queries.js`
  - `useHostPlans` `:21-32` → `GET API_PATHS.plans.getHostPlans`.
  - **`useBusinessPlans` `:46-53` → `GET API_PATHS.plans.getBusinessPlans` ALREADY EXISTS** (kept by migration decision #1).
  - keys: `plansKeys.host()` / `plansKeys.business()` (`D:\halla\labbe\hooks\plans\keys.js`).
- **Backend shape (CRITICAL — shapes differ):** `D:\halla\labbe-backend-\src\modules\plans\plans.service.js`
  - `getHostPlans()` `:60-81` → **`{ basic:{event:[],monthly:[]}, premium:{event:[],monthly:[]} }`** (planTypes `basic_event/basic_monthly/premium_event/premium_monthly`, `availableFor:'host'`).
  - `getBusinessPlans()` `:33-54` → **`{ event:[], quarterly:[], annual:[] }`** (planTypes `business_event/business_quarterly/business_annual`, `availableFor:'whitelabel'`).
  - `_formatPlan` `:373-403` identical shape per-plan (code, pricing.oneTime, limits, featureBullets, etc.).
  - > The two endpoints have **different family/billing structures**. `PlansPage`/`usePlansPageState`/`HostPlanCard`/`BillingTypeToggle` are hardwired to `basic`+`premium` columns and an `event`/`monthly` toggle. So the plans page is **NOT a pure `useHostPlans`→`useBusinessPlans` swap**. See (D.5).

### C.5 Reusable components (the "same styles/layout/everything")
Card visuals + layout to reuse for the business plans page:
- `HostPlanCard.jsx`, `BillingTypeToggle.js`, `CurrentPlanCard.js`, `AddonsSection.jsx`, `PaymentMethodSelector.jsx` — all in `D:\halla\labbe\app\[lang]\host\plans\_components\` (barrel `_components/index.js`).
- `Summary` flow + `summary/_components/*` (`PlanSummaryCard`, `PaymentSummaryCard`, `DiscountCodeCard`, `ProceedButton`, `AddonsSummaryCard`).
- `plans.module.css` (grid/header styling).
- Settings shells: `AccountSettings.js`, `NotificationPreferences`, `Tabs` (`@/ui/commen/tabs/Tabs`).
- Popup shell: `PopupLayout`, `InputGroup`, `InputSelect`, `Button` (`@/ui/commen/*`).

### C.6 Mobile host stack (orientation)
- Mobile lives in `D:\halla\halla-mobile\`. Host screens/nav under `navigation/AppNavigator.js` (host stack) and `screens/` (e.g. `VendorHomeScreen.js`, plan screens `components/plans/`). Mobile business plan **types/tabs are KEPT** (migration §1d KEEP): `useBusinessPlans` hook + `ENDPOINTS.PLANS.BUSINESS`, `PlanTabs.js`, `PlanListItem.js`, `AdminPlansScreen` business tab. (Mobile UI for business accounts beyond plans is out of scope here / owner says invites are another agent.)

---

## (D) Business-account spec (host-like, no tenancy)

Owner: business account ≈ host account, created from admin dashboard via a popup (email, name, description, phone, logo, password). Frontend = the regular HOST dashboard, with (a) settings a little different, (b) plans page shows BUSINESS plans (same styles), (c) invites differ (other agent).

### D.1 New `business` role (host-like) — where to add it (no tenancy)
Add `BUSINESS: 'business'` to **both** role files and wire the host-like (NOT admin) structures:

1. **`D:\halla\shared\src\constants\roles.js`**
   - `ROLES` `:8-17` → add `BUSINESS:"business"`.
   - `ROLE_HIERARCHY` `:26-48` → add `[ROLES.BUSINESS]: [ROLES.GUEST]` (mirror HOST `:45`); add `BUSINESS` into SUPER_ADMIN `:27-35` and ADMIN `:36` manageable arrays (so admins can create/manage it).
   - **Do NOT add to `ADMIN_ROLES` `:50-56`** (business is not an admin; keeps it out of admin-dash + subscription-bypass).
2. **`D:\halla\labbe-backend-\src\shared\constants\roles.js`** — mirror: `ROLES` `:10-19`, `ROLE_HIERARCHY` `:24-46` (`[ROLES.BUSINESS]:[ROLES.GUEST]` + add to SUPER_ADMIN/ADMIN arrays), NOT `ADMIN_ROLES` `:51-57`.
3. **`UserModel.js` `roleDataMap`** `:768-777` → add `[ROLES.BUSINESS]: "hostData"` (or `"businessData"` if a new subdoc, see D.4) so `toPublicJSON` returns `roleData`.
4. **`getDefaultPermissions(role)` / `DEFAULT_PERMISSIONS`** — backend `D:\halla\labbe-backend-\src\shared\constants\permissions.js:55` → give `business` the same default perms as host (host has none of the admin `PERMISSIONS`; it's a self-serve role). No shared-side perms map exists to mirror.
5. **Notification prefs:** `D:\halla\shared\src\schemas\settings.js` `getNotificationSchemaForRole`/`getNotificationDefaultsForRole` → add a `business` case (reuse host's `appNotifications` schema is simplest).
6. **`role` enum** is `Object.values(ROLES)` (`UserModel.js:308`) so it auto-accepts the new value; swagger role enums list roles explicitly — add `business` there.

### D.2 Admin creation popup (email / name / description / phone / logo / password)
- **Web popup:** new `D:\halla\labbe\app\[lang]\admin-dash\business\_components\AddBusinessPopup.jsx`, cloned from `AddHostPopup.jsx`, adding a **description** `InputGroup` (textarea) and a **logo** uploader. Use `PopupLayout` + `InputGroup` + `Button`.
- **Shared zod:** add `addBusinessSchema` to `D:\halla\shared\src\schemas\admin.js` (mirror `addHostSchema` `:21-29` + `description: z.string().max(...).optional()`; logo handled as a file, not in the zod body).
- **Endpoint + service (recommended):** add `POST /admin/business` in a new `admin.business.routes.js` mounted like hosts (`requirePageAccess(ADMIN_PAGES.BUSINESS,'create')` + `validateZod(createBusinessSchema)`), and `admin.business.service.createBusiness(...)` cloned from `createHost` `admin.hosts.service.js:168-263` but: `role: ROLES.BUSINESS`, **no `whitelabelId`**, store `description`→`hostData.bio`/`businessData`, store logo S3 key→`avatar`. Password flows through the `UserModel` pre-save hash (`:474-490`) exactly like host.
  - Subscription at creation: either no auto-trial, or reuse the trial pattern `:231-250` (decide — Open Q #4).
- **Logo upload (blocking design choice — see B.3):** admin-create routes currently have no multer. Options:
  1. Add `uploadUserProfile`-style multer to `POST /admin/business`, send the popup as `multipart/form-data`, store key in `avatar` via `extractStoredRef`/`processUploadedFiles` (`s3Upload.js:496-534`). Cleanest single-call.
  2. Two-step: create (JSON), then upload logo via the existing `PATCH /users/profile` avatar path — but that route is auth'd as the *target* user, so admin-on-behalf needs a new admin avatar endpoint anyway. **Option 1 is recommended.**
- **Admin nav entry + RBAC:** add `ADMIN_PAGES.BUSINESS` to `shared/src/constants/permissions.js` (+ backend copy + `serverAuth.js` `ADMIN_PAGES` `:28-46`), a `business` nav item to `adminNavItems` (`navConfig.js:111-222`), and rows in `ROLE_NAV_ACCESS` `:321-386` + `ROLE_PAGE_ACCESS` (web `navConfig.js:391-469`, server `serverAuth.js:85-162`, backend `permissions.js` ROLE_PAGE_ACCESS) for super_admin/admin (FULL). Mirror the `hosts`/`moderators` rows.

### D.3 Dashboard reuse (business sees the host dashboard)
- The host shell is selected purely by URL prefix `/host` + `DASHBOARD_TYPES.HOST`, and `hostNavItems` is **not role-filtered** (`navConfig.js:611-612`). So a `business` user routed to `/host` inherits the entire host dashboard with no per-page changes.
- **Required routing edits (minimal):**
  - `middleware.js getRedirectPath` `:84-90` → return `/host` for `business` (add `|| role === 'business'` to the host branch at `:88`).
  - `middleware.js` host-route gate `:210` → `if (isHostRoute && userType !== HOST && userType !== 'business')` (admit business).
  - Add `BUSINESS:'business'` to the `middleware.js` local `USER_ROLES` `:9-17` and `serverAuth.js` `USER_ROLES` `:14-23`.
- No new dashboard pages needed; only the plans + settings differences below.

### D.4 Settings differences (candidate sections)
Host settings has exactly two tabs (`account`, `notifications`) — `host\settings\page.js:28-31`. Candidate business differences:
- Reuse `AccountSettings` `:78-88` as-is (username/email/password) — likely unchanged.
- Add business-specific fields the popup collected: **description** + **logo** editing. Add an InputGroup textarea + logo upload to a business variant of `AccountSettings` (or a new `BusinessProfileSettings` tab), writing `description`→`hostData.bio` (or new `businessData.description`) and logo→`avatar` via `PATCH /users/profile` (the living avatar path, B.3).
- `notifications` tab: pass `userRole={'business'}` and ensure the role-keyed notification schema has a `business` case (D.1 #5), else reuse host's.
- **Data model for description:** simplest = store in existing `hostData.bio` `UserModel.js:34` (no schema change, and `roleDataMap[business]='hostData'`). If business needs richer fields later, add a small `businessDataSchema` (mirror `hostDataSchema` `:28-38`) at `profile.businessData` and point `roleDataMap` there. **Recommend `hostData.bio` for v1** (zero schema churn).
- **Identity mapping (recommend):** logo→top-level **`avatar`** (already signed in `toPublicJSON` `:763`; no new signing code); name→`name`; phone→`phoneNumber`/`mobile`; description→`hostData.bio`.

### D.5 Plans page showing BUSINESS plans (same components, different structure)
- **Data swap:** use the existing **`useBusinessPlans()`** (`hooks/plans/queries.js:46-53`) instead of `useHostPlans()` (`usePlansPageState.js:21`).
- **NOT a drop-in swap** — shapes differ (C.4): host = `{basic,premium}×{event,monthly}`; business = `{event,quarterly,annual}` (`plans.service.js:33-54` vs `:60-81`). Concretely:
  - The 2-column `basic`/`premium` grid in `PlansPage.js:156-176` must become a grid over `event`/`quarterly`/`annual` (3 families, one billing each).
  - `BillingTypeToggle` (event/monthly) doesn't map to business billing — business has fixed cadence per family; the toggle is likely dropped or repurposed.
  - **Recommended:** author a `useBusinessPlansPageState.js` (clone of `usePlansPageState.js` reading `useBusinessPlans` and mapping the `{event,quarterly,annual}` arrays) + a `BusinessPlansPage.js` that reuses `HostPlanCard`/`CurrentPlanCard`/`AddonsSection`/`Summary` **styling** but iterates the business families. "Same everything" = same card components/CSS, different family/billing wiring.
  - Mounted under `/host/plans` for `business` users (or a sibling route the business plans nav points to). Since `hostNavItems` is shared, simplest is to branch inside the plans route on `user.role==='business'` to render the business variant.
- **Checkout success redirect** stays `/host` (`usePlansPageState.js:149`).

### D.6 Checkout eligibility (REQUIRED edit — the current gate rejects business)
- **Gate today:** `D:\halla\labbe-backend-\src\modules\payments\checkout.service.js:46-51`:
  ```
  if (plan.availableFor === 'whitelabel' && user.role !== ROLES.WHITELABEL_ADMIN) throw ...
  if (plan.availableFor === 'host' && user.role !== ROLES.HOST) throw ...
  ```
- **Problem:** the migration KEEPS `availableFor:'whitelabel'` (business plans) but DELETES `ROLES.WHITELABEL_ADMIN`. As-written, post-removal this gate **rejects everyone** for business plans.
- **Required change:** repoint L46's role check to the new business role: `if (plan.availableFor === 'whitelabel' && user.role !== ROLES.BUSINESS) throw ...`. (Tie to migration Open-item #3: optionally rename the tag `'whitelabel'`→`'business'` across the enum + 8 Plan docs + `getBusinessPlans` query `plans.service.js:34` in lockstep; if renamed, update this gate to `=== 'business'`.)
- This is the only backend change needed for business accounts to PURCHASE business plans (subscription create/activation in `_fulfillBundle` is role-agnostic).
- `ROLES` is already imported in `checkout.service.js:11`.

### D.7 Summary of touch-points (no tenancy reintroduced)
| Concern | Files |
|---|---|
| Add `business` role | `shared/src/constants/roles.js` (ROLES, ROLE_HIERARCHY, manageable arrays — NOT ADMIN_ROLES); backend `src/shared/constants/roles.js` mirror; `UserModel.js:768-777` roleDataMap; backend `permissions.js:55` `DEFAULT_PERMISSIONS`; `shared/src/schemas/settings.js` notif role cases |
| Creation popup | NEW `admin-dash/business/_components/AddBusinessPopup.jsx`; `shared/src/schemas/admin.js` `addBusinessSchema`; NEW backend `admin.business.{routes,controller,service}.js` (`POST /admin/business`, multer for logo); `ADMIN_PAGES.BUSINESS` (shared `permissions.js:13` + backend) + RBAC rows (navConfig/serverAuth/backend `permissions.js:97`) |
| Dashboard reuse | `middleware.js:84-90,210` + local `USER_ROLES`; `serverAuth.js` `USER_ROLES` |
| Settings diffs | business variant of `host/settings` AccountSettings (description+logo); notif `userRole='business'` |
| Plans swap | `useBusinessPlans` (exists) + NEW `useBusinessPlansPageState` + `BusinessPlansPage` reusing host plan components; route branch in `/host/plans` |
| Checkout eligibility | `checkout.service.js:46` repoint role check to `ROLES.BUSINESS` |

---

## (E) Open questions
1. **Logo upload mechanism (BLOCKING).** No admin-create route uploads files today (B.3). Recommend adding `uploadUserProfile`-style multer to `POST /admin/business` and storing the S3 key in `avatar`. Confirm `multipart/form-data` popup is acceptable vs a two-step create+upload.
2. **Description storage.** Reuse `profile.hostData.bio` (zero schema churn, `roleDataMap[business]='hostData'`) vs a new `businessDataSchema` at `profile.businessData`. Recommend `hostData.bio` for v1.
3. **`availableFor` tag rename.** Keep the kept tag literally `'whitelabel'` (and gate on it) or execute the optional `'whitelabel'`→`'business'` rename (migration Open-item #3) across enum + 8 Plan docs + `getBusinessPlans`. Affects the exact string in `checkout.service.js:46` and `plans.service.js:34`.
4. **Subscription at creation.** Should `createBusiness` auto-create a trial (like `createHost` `:231-250`) or start with no subscription until the business buys a business plan? Trial plan is `availableFor` unknown for business — verify the trial Plan doc's `availableFor`.
5. **Plans page placement.** Business plans rendered at `/host/plans` via a role branch, or a dedicated route the business plans nav item targets? (Owner says "same layout/everything" → role-branch inside the existing route is least churn.)
6. **Business plan billing structure in UI.** `getBusinessPlans` returns `{event,quarterly,annual}` with no basic/premium split and no event/monthly toggle. Confirm the intended 3-family layout and whether `BillingTypeToggle` is dropped for business.
7. **Mobile business dashboard.** This research is web-centric for the dashboard/settings/plans. Confirm whether business accounts need the mobile host shell too (mobile business plan tabs/types are already KEPT per migration §1d) — and that invites (other agent) cover the rest.
