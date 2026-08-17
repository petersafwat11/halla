# Round 1 — WEB App (`labbe/`) Whitelabel Inventory

Scope: **`D:\halla\labbe` only.** Mobile, backend, and shared are owned by other agents; cross-boundary references are noted but not classified.
Method: case-insensitive grep across `labbe` for `whitelabel|white-label|whiteLabel|WHITELABEL|whitelabelId|whitelabel_admin|whitelabel_moderator|whitelabels|whitelabel-dash|signup-whitelabel|setup-password|WHITELABEL_ROLES|isWhitelabelRole|DASHBOARD_TYPES.WHITELABEL|whitelabelNavItems|tenant`, then thread-following + importer checks. 678 raw occurrences across 93 files.

> NOTE: the literal directory segment is `[lang]` (Next.js dynamic route). All paths are relative to `D:\halla`.

---

## Summary

| Metric | Count |
|---|---|
| Total files touched (non-node_modules, source + i18n) | **~70** |
| DELETE-FILE (whole files/trees) | **42 files** across 4 trees + 4 standalone + 4 i18n |
| EDIT-FILE (shared — strip whitelabel only) | **~26** |
| INVESTIGATE | **3** (mostly cross-boundary confirmations) |
| DB/DATA (web-observed, owned by backend agent) | 2 fields (`event.whitelabel`, `user.whitelabelId`/`whitelabelSubscription`) |

### Top 5 highest-risk items
1. **`labbe/ui/layout/navConfig.js`** (EDIT, HIGH) — central RBAC/nav map. Re-exports `WHITELABEL_ROLES`/`isWhitelabelRole` from `@halla/shared`, defines `DASHBOARD_TYPES.WHITELABEL`, `whitelabelNavItems`, two `ROLE_NAV_ACCESS`/`ROLE_PAGE_ACCESS` role rows, and whitelabel branches in `getNavItems`/`canAccessPage`/`getNavItemsForRole`/`getDashboardTypeFromPath`/`getBasePath`. Consumed by Header, Sidebar, NotificationBell, layout index. A wrong edit silently breaks **admin/moderator** nav. Depends on shared constants being de-whitelabeled first (cross-boundary ordering).
2. **`labbe/app/[lang]/admin-dash/plans/page.js`** (EDIT→effectively dead, HIGH) — the **entire page** is gated on `useAuthStore().isWhitelabel()`: line ~159 redirects every non-whitelabel user to `/admin-dash`, and the plans query only runs `enabled: isWhitelabel()`. This is the whitelabel-user self-checkout page living at the *shared* `/admin-dash/plans` route (in `adminNavItems` for super_admin). After removal the page has no audience → likely delete-the-route, but it is in the shared nav so must be reconciled with `navConfig`/`serverAuth` `plans` entries. Needs a deliberate decision in Round 2.
3. **`labbe/app/[lang]/admin-dash/create-event/_components/HostSelector/HostSelector.js`** (EDIT, HIGH) — serves **platform admins** (super_admin/admin/moderator) with a "Create for self / host / **whitelabel**" target picker. Whitelabel-specific: the `whitelabel` target tab, `useAdminEventTargets("whitelabel")` list, `WHITELABEL_ADMIN_ROLES`, `isWhitelabelAdmin` self-subscription branches, `currentUser.whitelabelId`/`whitelabelSubscription` reads, and whitelabel i18n. Must keep the self+host flows for platform admins intact.
4. **`labbe/services/serverAuth.js`** (EDIT, HIGH) — server-side RBAC mirror. Defines `USER_ROLES.WHITELABEL_*`, `WHITELABEL_ROLES`, `ADMIN_ROLES` membership of the two WL roles, two `ROLE_PAGE_ACCESS` rows, `isWhitelabelUser()`, and `ADMIN_PAGES.WHITELABELS`. `requirePageAccess`/`canAccessPage` are used by every admin page (gates hosts/vendors/events/etc.). Breaking this breaks server-side access control for all admin roles.
5. **`labbe/middleware.js`** (EDIT, HIGH) — routing gate for the whole app. `USER_ROLES.WHITELABEL_*`, `isWhitelabelRole`, `canAccessAdminDash` (admins+WL), `PROTECTED_ROUTES.whitelabel="/whitelabel-dash"`, the `/signup/whitelabel` auth route, and the `whitelabel-dash → admin-dash` redirect block. Must preserve host/admin/vendor routing exactly.

---

## A. Pages (`labbe/app/[lang]/...`)

### A1. DELETE-FILE — whole trees

**`labbe/app/[lang]/admin-dash/whitelabels/**`** — whitelabel tenant-management feature (super-admin only). DELETE entire tree (33 files). Confirmed: imported only from within itself + `adminNavItems`/`serverAuth` entries (handled in EDIT items). Notable files:
- `whitelabels/page.js` (server page; `requirePageAccess("whitelabels")`, prefetch `API_PATHS.admin.whitelabels.getAll`)
- `whitelabels/page.module.css`
- `whitelabels/_components/WhitelabelsTable.jsx` (+ `.module.css`), `WhitelabelStats.jsx` (+css), `WhitelabelsPageHeader.jsx`, `useWhitelabelTableActions.js`
- `whitelabels/_components/whitelabelCard/WhitelabelCard.js` (+css)
- `whitelabels/_components/hostsTable/HostsTable.js` (+css)
- `whitelabels/[id]/page.js` (+css), `whitelabels/[id]/_components/`: `WhitelabelDetailsContent.jsx` (+css), `WhitelabelHero.jsx`, `WhitelabelHostsList.jsx`, `WhitelabelQuickStats.jsx`, `WhitelabelContactInfo.jsx`, `WhitelabelSubscriptionInfo.jsx`
- `whitelabels/[id]/details/page.js` (+css), `whitelabels/[id]/details/_components/`: `WhitelabelDetailsWrapper.js` (+css), `WlAddress.js`, `WlBrandIdentity.js`, `WlContactInfo.js`, `WlFeatureManagement.js`, `WlLicenseTax.js`, `WlPlanSelection.js`, `WlRequirements.js`, `WlStatsGrid.js`
- Cross-boundary: calls `API_PATHS.admin.whitelabels.*` (backend), reads `profile.whitelabelData`/`roleData` (DB shape). Risk: low (isolated tree).

**`labbe/app/[lang]/signup-whitelabel/**`** — whitelabel public signup. DELETE (2 files): `page.js`, `page.module.css`. `page.js` imports `WhiteLabelForm` (also DELETE) + landing `Header`. Risk: low.

### A2. DELETE-FILE — confirmed whitelabel-only standalone page

**`labbe/app/[lang]/setup-password/[token]/page.jsx`** — DELETE.
- **INVESTIGATE→resolved as DELETE.** The brief flagged this as ambiguous; evidence is conclusive it is whitelabel-only: file header says *"Phase 4b W1-WL-EMAIL … Lands the whitelabel admin from the approval email"*; the link is built by `admin.service.updateWhitelabelStatus`; the only caller of `useAuthMutation("setupPassword"/"validateSetupToken")` is the WL flow. It is *not* the host/vendor password-reset flow (that is `/change-password` + `useAuthMutation("resetPassword")`, unaffected).
- Cross-boundary: `GET /auth/validate-setup-token/:token`, `POST /auth/setup-password` (backend). Routes to `/admin-dash` on success.

### A3. EDIT-FILE — shared admin-dash pages (strip WL branches only)

| path | what else it serves | what to remove | risk |
|---|---|---|---|
| `app/[lang]/admin-dash/plans/page.js` | (see #2) **nothing else** — effectively WL-only (whole page redirects non-WL users; query `enabled: isWhitelabel()`) → leans **DELETE-FILE, INVESTIGATE for route decision** (see open Q1) | whole file (or, if kept, the `isWhitelabel()` gate + WL plan checkout) | HIGH |
| `app/[lang]/admin-dash/plans/_components/CurrentPlanCard.jsx` | **only** the WL plans page above | **orphan / DELETE if plans page is removed** — contains no "whitelabel" string (missed by keyword grep), but its sole importer is `plans/page.js`. Verify no other importer in R2 | MED |
| `app/[lang]/admin-dash/plans/page.module.css` | styles for the WL plans page | orphan / DELETE with the page | low |
| `app/[lang]/admin-dash/update-event/page.js` | admin update-event wizard wrapper | only a doc comment referencing whitelabel; no code change beyond comment | low |
| `app/[lang]/host/update-event/page.js` | host update-event wrapper | only a doc comment ("future whitelabel") | low |
| `app/[lang]/host/update-event/_components/UpdateEventWizard.jsx` | shared create/update wizard (host+admin) | 1 occurrence — comment/role note only (verify in R2) | low |
| `app/[lang]/admin-dash/create-event/_components/AdminCreateEvent.jsx` | admin event-creation wizard (platform admins + hosts) | `WHITELABEL_ADMIN_ROLES` const, `isWhitelabelUser`, HostSelector-skip + step-0 logic for WL, `whitelabelSubscription` read, WL "upgrade → /admin-dash/plans" branch | MED |
| `app/[lang]/admin-dash/create-event/_components/HostSelector/HostSelector.js` | (see #3) platform-admin target picker | WL tab, WL targets list, WL self-subscription branches, `whitelabelId`/`whitelabelSubscription`, WL i18n strings | HIGH |
| `app/[lang]/admin-dash/page.js` | admin dashboard root | **no WL refs** (delegates to widgets); no change | none |

### A4. EDIT-FILE — shared admin-dash dashboard widgets (`admin-dash/_components/`)

| path | what else it serves | what to remove | risk |
|---|---|---|---|
| `_components/DashboardStats.jsx` | stats cards for all admin roles | `isWhitelabelRole` branch building WL-specific stat cards (lines ~65-112) + WL i18n keys | MED |
| `_components/DashboardCharts.jsx` | charts for all admin roles | `isWhitelabelRole` branch rendering WL charts (lines ~44-110) + `whitelabelGrid` style + WL i18n | MED |
| `_components/RecentActivity.jsx` | recent hosts/events tables for all admin roles | `isWhitelabelAdmin` flag + `{!isWhitelabelAdmin && <Bottom .../>}` gate (keep `<Bottom>` for everyone else) | low |
| `_components/SubscriptionAssignmentPopup.jsx` | host **and** whitelabel subscription assignment (`entityType` prop) | `useAdminWhitelabelMutation`, `entityType==="whitelabel"` branch, `whitelabelId` idKey, `adminWhitelabels` i18n namespace. KEEP the host path. (Also drop `whitelabel` callers once the WL tree is gone.) | MED |
| `_components/DashboardCharts.module.css` | chart layout | `.whitelabelGrid` rule(s) (3 refs) | low |

### A5. EDIT-FILE — moderators pages (role dropdown)

| path | what else it serves | what to remove | risk |
|---|---|---|---|
| `app/[lang]/admin-dash/moderators/_components/AddModeratorPopup.jsx` | platform admins add moderators/admins | `isWhitelabel` check + WL roleOptions branch + `whitelabel_moderator` default; keep moderator/admin options | MED |
| `app/[lang]/admin-dash/moderators/_components/EditModeratorPopup.jsx` | platform admins edit moderators | same as above | MED |

### A6. EDIT-FILE — guest invitation portal (`invitation/[code]`) — **functional WL branding, NOT comment-only**

The guest RSVP portal is a CORE feature (every event's guests use it). It currently reads `event.whitelabel` to theme itself. Strip the WL theming; keep the portal rendering with default branding.

| path | what else it serves | what to remove | risk |
|---|---|---|---|
| `app/[lang]/invitation/[code]/page.jsx` | the entire public guest RSVP portal | `const whitelabel = event?.whitelabel \|\| {}`, `cssVars` from `whitelabel.primaryColor/backgroundColor` (keep `DEFAULT_PRIMARY/BG`), `logoUrl = whitelabel.logo`, and `whitelabel`/`logoUrl` props passed to the 3 portal children | MED |
| `app/[lang]/invitation/[code]/_components/PortalRsvpForm.jsx` | RSVP form UI | `whitelabel` prop + `whitelabel.name` alt-text fallback | low |
| `app/[lang]/invitation/[code]/_components/PortalConfirmed.jsx` | confirmed screen + wallet pass | `whitelabel` prop, `whitelabel?.logo` pass-logo fallback, `whitelabel?.name` alt, comment | low |
| `app/[lang]/invitation/[code]/_components/PortalThankYou.jsx` | declined/maybe screen | `whitelabel` prop + `whitelabel.name` alt fallback | low |

> Cross-boundary / DB: `event.whitelabel` (object: `primaryColor`,`backgroundColor`,`logo`,`logoUrl`,`name`) is provided by the backend `GET /guests/:code` payload. Removal of the field itself is the backend agent's call; the web side must stop consuming it. Flagged as **INVESTIGATE (cross-area)**: confirm backend stops sending it / portal still renders with defaults.

---

## B. Components / UI (`labbe/ui/...`, `labbe/components/...`)

### B1. DELETE-FILE — whitelabel signup form tree
**`labbe/ui/auth/signup/whiteLabel/**`** — DELETE (15 files). Imported only by `signup-whitelabel/page.js` (also deleted). Files: `WhiteLabelForm.js`, `whiteLabelform.module.css`, `title/SectionTitle.js`, `stepOne/StepOne.js`(+css), `stepTwo/StepTwo.js`(+css), `stepThreee/StepThree.js`(+css), `stepFive/StepFive.js`(+css), `stepSix/StepSix.js` + `stepSix/SummarySection.js`(+css).
- Cross-boundary: imports `whitelabelSignupSchema` from `@halla/shared/schemas/auth`; uses `useAuthMutation("signupWhiteLabel")` → `POST /auth/whitelabel-signup`; uses `buildWhitelabelFormData`/`WHITELABEL_STEP_FIELDS` from `authFormHelpers` (EDIT item). Risk: low.

### B2. DELETE-FILE — whitelabel admin UI
- **`labbe/ui/admin/whitelabels/ApproveWhitelabelDialog.jsx`** — DELETE. Imported only by `whitelabels/[id]/_components/WhitelabelDetailsContent.jsx` (deleted tree). Phase 4b WL approval dialog. Risk: low.
- **`labbe/ui/admin/FeatureToggle.jsx`** — DELETE. JSDoc: "Toggle … for white-label tenants". Imported only by `WlFeatureManagement.js` + `WhitelabelDetailsWrapper.js` (deleted tree). Exports `FeatureToggle` (default) + `FeatureToggleGroup`. Importer check confirms no non-WL consumer. (Has its own `FeatureToggle.module.css` → delete too.) Risk: low.

### B3. EDIT-FILE — shared UI

| path | what else it serves | what to remove | risk |
|---|---|---|---|
| `ui/layout/header/Header.js` | global header for **all** dashboards | `DASHBOARD_TYPES.WHITELABEL` case in `getRoleLabel()` returning `header.whitelabelRole`. Keep admin/vendor/host cases | low |
| `ui/layout/index.js` | barrel export for layout | re-exports of `WHITELABEL_ROLES`, `isWhitelabelRole`, `whitelabelNavItems` (lines 13-25). Keep the rest | low |
| `ui/auth/login/form/Form.js` | login for all roles | `USER_ROLES.WHITELABEL_ADMIN/MODERATOR` cases in `navigateByRole` (they map to `/admin-dash`, same as admin → can collapse). Keep all other roles | low |
| `ui/landing/Header/Header.jsx` | public landing/marketplace header | `whitelabel_admin/moderator` entries in `dashboardPathForRole` (map to `/admin-dash` like admin → removable). No behaviour change for other roles | low |
| `ui/commen/inputs/LogoUpload.js` | generic file/logo upload (reusable) | only default i18n key strings `signupForm.whiteLabel.identity.logo.*` as `descriptionKey`/`buttonKey` defaults. Component is generic; callers pass their own keys. **Verify in R2** whether any surviving caller relies on the WL defaults; if not, retarget defaults. | low |
| `ui/layout/notifications/NotificationItem.js` | notifications list (all roles) | `whitelabel_registered: IoPersonOutline` entry in the icon map (1 line). Harmless to keep, but it is a WL notification type | low |
| `ui/settings/notificationsPrefrences/NotificationPreferences.js` | unified notif prefs for host/vendor/admin/whitelabel | only a header comment + it calls `getNotificationOptionsForRole` (EDIT item below) which has a WL branch. No direct WL code here beyond comment | low |
| `components/event-detail/EventFailureBanner.jsx` | host/admin event-failure retry banner | only a doc comment ("whitelabel-admin who owns the event's whitelabel"); RBAC via `useEventActionGate` (shared). Comment-only edit | low |

---

## C. Routing + Middleware

| path | classification | what / why | what to remove | cross-boundary | risk |
|---|---|---|---|---|---|
| `middleware.js` | EDIT | app routing gate | `USER_ROLES.WHITELABEL_*`, `isWhitelabelRole()`, `canAccessAdminDash` (fold to `isMainAdminRole`), `PROTECTED_ROUTES.whitelabel`, `/signup/whitelabel` in `AUTH_ROUTES`, `isWhitelabelRoute` + the `whitelabel-dash→admin-dash` redirect block (lines ~225-231). Keep host/admin/vendor logic | — | HIGH |

---

## D. Nav + Layout

| path | classification | what / why | what to remove | cross-boundary | risk |
|---|---|---|---|---|---|
| `ui/layout/navConfig.js` | EDIT | central nav + RBAC mirror (see #1) | `WHITELABEL_ROLES`/`isWhitelabelRole` imports+re-exports; `DASHBOARD_TYPES.WHITELABEL`; entire `whitelabelNavItems` array; `whitelabels` item in `adminNavItems`; `whitelabels` entries in `ROLE_NAV_ACCESS`/`ROLE_PAGE_ACCESS` for super_admin/admin/moderator; the `WHITELABEL_ADMIN`/`WHITELABEL_MODERATOR` rows in both maps; WL branches in `getNavItemsForRole` (the `isWhitelabelRole` vendors/whitelabels filter), `canAccessPage` (WL page block + `WHITELABEL_MODERATOR` permission branch), `getNavItems` (WHITELABEL case), `getDashboardTypeFromPath` (whitelabel-dash branch), `getBasePath` (whitelabel-dash case); `manage_whitelabels` in `PERMISSION_TO_NAV_KEY` | imports from `@halla/shared/constants/roles` — **must coordinate ordering** with shared agent (shared de-whitelabel first, or this import breaks) | HIGH |
| `ui/layout/sidebar/Sidebar.js` | EDIT (none/verify) | consumes `getDashboardTypeFromPath` | no WL literal; only indirectly affected when navConfig changes. Verify it still renders admin/host/vendor nav | — | low |
| `ui/layout/notifications/NotificationBell.js` | EDIT (none/verify) | consumes `getDashboardTypeFromPath`/`getBasePath` | no WL literal; indirect only | — | low |

> Note: `serverAuth.js` is its own server RBAC mirror — listed under Hooks+Services (E) but is a Nav/RBAC sibling of navConfig.

---

## E. Auth + Signup / Hooks + Services

| path | classification | what / why | what to remove (EDIT) | cross-boundary | risk |
|---|---|---|---|---|---|
| `services/serverAuth.js` | EDIT | server RBAC mirror (see #4) | `USER_ROLES.WHITELABEL_*`, `ADMIN_ROLES` WL members, `WHITELABEL_ROLES`, `ADMIN_PAGES.WHITELABELS`, `whitelabels` keys in super_admin/admin/moderator `ROLE_PAGE_ACCESS`, the two `WHITELABEL_*` `ROLE_PAGE_ACCESS` rows, `isWhitelabelUser()`. Keep `requirePageAccess`/`canAccessPage`/`getPageAccessLevel` working for surviving roles | mirror of backend `permissions.js` | HIGH |
| `stores/authStore.js` | EDIT | client auth store (all roles) | `USER_ROLES.WHITELABEL_*`, `isWhitelabel()` getter, `setupTokenValid`/`setupTokenData` state + `setSetupTokenValid`/`clearSetupState` setters + their reset in `logout()` (the setup-token state is WL-only). Keep isAdmin/isHost/isVendor | consumed widely; `isWhitelabel()` consumers = plans/page.js, AdminCreateEvent (both EDIT) | MED |
| `utils/authFormHelpers.js` | EDIT | vendor + whitelabel signup helpers | `flattenWhitelabelData`, `buildWhitelabelFormData`, `WHITELABEL_STEP_FIELDS`, and their lines in the default `authService` export object. Keep all vendor helpers + generic step/nested utils | only WhiteLabelForm (deleted) imports the WL ones | low |
| `hooks/auth/mutations.js` | EDIT | all auth flows (login/otp/signup/reset/logout) | `signupWhiteLabel`, `validateSetupToken`, `setupPassword` actions in the `mutations` map. Keep login/otp/vendor/reset/logout/completeProfile/verifyEmail | `POST /auth/whitelabel-signup`, `GET /auth/validate-setup-token`, `POST /auth/setup-password` | MED |
| `hooks/admin/queries.js` | EDIT | admin data for hosts/vendors/moderators/plans/payments/events | `useAdminWhitelabels`, `useAdminWhitelabel`, `useAdminWhitelabelFeatures`. Keep all other query hooks | `API_PATHS.admin.whitelabels.*` | MED |
| `hooks/admin/mutations.js` | EDIT | admin mutations for all resources | `useAdminWhitelabelMutation`, `useAdminWhitelabelsExport`, `useAdminWhitelabelFeatureMutation`. Keep host/vendor/moderator/event/plan/payment mutations + `buildExportMutation` | `API_PATHS.admin.whitelabels.*` | MED |
| `hooks/admin/keys.js` | EDIT | query-key factory for admin namespace | `whitelabels`, `whitelabelsAll`, `whitelabelDetail`, `whitelabelFeatures` key builders. Keep the rest | — | low |
| `hooks/admin/index.js` | EDIT | admin hooks barrel | re-exports of `useAdminWhitelabels`, `useAdminWhitelabel`, `useAdminWhitelabelFeatures`, `useAdminWhitelabelMutation`, `useAdminWhitelabelsExport`, `useAdminWhitelabelFeatureMutation` | — | low |
| `hooks/guests/queries.js` | EDIT (comment-only) | guest invitation queries (core) | only "(whitelabel portal)" wording in 2 doc comments. No code change | — | none |
| `hooks/guests/mutations.js` | EDIT (comment-only) | guest mutations incl. public `rsvp` (core) | only "(public, whitelabel portal)" comment | — | none |
| `utils/schemas/notificationPreferencesSchemas.js` | EDIT | notif-prefs config for all roles | the `whitelabel` block in `getNotificationOptionsForRole` `configs` + the `WHITELABEL_*` cases in its `switch`; the re-exports of `whitelabel*` schemas/defaults from `@halla/shared/schemas/settings` (lines 20-28). Keep host/admin configs | imports `whitelabel*` schemas from `@halla/shared/schemas/settings` (shared agent owns the schemas) | low |
| `providers/index.js` | EDIT | global i18n namespace registration | `"adminWhitelabels"` namespace string from `i18nNamespaces` (and add/keep `setupPassword`? — it is loaded ad-hoc by SetupPassword via `useTranslation("setupPassword")`, not registered here, so only `adminWhitelabels` listed). Remove `adminWhitelabels` | — | low |

> Cross-boundary symbols observed (web→shared/backend), for the other agents:
> - `@halla/shared/constants/roles` → `WHITELABEL_ROLES`, `isWhitelabelRole` (navConfig)
> - `@halla/shared/schemas/auth` → `whitelabelSignupSchema` (WhiteLabelForm — deleted)
> - `@halla/shared/schemas/settings` → `whitelabel*` notif schemas/defaults (notificationPreferencesSchemas)
> - `@halla/shared/schemas/admin` → `subscriptionAssignmentSchema`/`addModeratorSchema`/`editModeratorSchema` (still needed; verify they carry no WL-only role enum)
> - `API_PATHS.admin.whitelabels.*`, `API_PATHS.auth.whitelabelSignup`, `API_PATHS.auth.validateSetupToken`, `API_PATHS.auth.setupPassword` (backend routes)

---

## F. i18n strings (`labbe/localization/locales/{ar,en}/`)

### F1. DELETE-FILE — whitelabel-only namespaces (both `ar` and `en`)
- `localization/locales/{ar,en}/adminWhitelabels.json` — whitelabel tenant-management UI strings (en has 31 keys). DELETE (4 files total ar+en). Also remove `"adminWhitelabels"` from `providers/index.js` namespace list (EDIT, above) and any `useTranslation("adminWhitelabels")` callers (all in deleted WL tree + ApproveWhitelabelDialog/SubscriptionAssignmentPopup — the latter switches namespace, handled in its EDIT).
- `localization/locales/{ar,en}/setupPassword.json` — WL invite password-setup strings. DELETE (used only by `SetupPassword.js`, deleted).

### F2. EDIT-FILE — remove whitelabel keys/blocks (both ar+en unless noted)
| file | what to remove |
|---|---|
| `signup.json` (en+ar) | the large `whiteLabel` block (en ~line 629) + `whiteLabel` promo lines (~23/28). Keep vendor/host signup strings |
| `login.json` (en+ar) | `whiteLabel` block (~line 62) + `whiteLabel` promo lines (~48/53) |
| `common.json` (en+ar) | `header.whitelabelRole` ("Platform Manager") |
| `home-events.json` (en+ar) | `header.whitelabelRole` |
| `admin.json` (en+ar) | `whitelabel_admin` label (~line 226) |
| `adminDashboard.json` (en+ar) | the two `whitelabel` blocks (`stats.whitelabel.*`, `charts.whitelabel.*`) used by DashboardStats/DashboardCharts |
| `adminEvents.json` (en+ar) | `createForWhitelabel`, `noWhitelabelsFound`, `whitelabelAdmin`, `whitelabelDescription`, `createEventAsWhitelabel` (HostSelector strings) |
| `adminModerators.json` (en+ar) | `whitelabelRequired`, `roles.whitelabelModerator`, `roles.whitelabelAdmin`, `whitelabel`, `selectWhitelabel` (moderator role-dropdown strings) |
| `landing.json` (en+ar) | 1 occurrence (verify which key — likely a "white-label solution" marketing line). **Verify in R2** it is not a generic feature blurb worth rewording vs deleting |

---

## G. Misc / DB-DATA (web-observed)

- **`app/[lang]/admin-dash/post-event/[eventId]/page.js`** — EDIT (comment-only). Header comment says the endpoint is "tenant/role-scoped" and "tenant-scoped admins/moderators can manage events under their scope." No WL code; reword/trim the comment. Risk: none.
- **Negative results (substantiates "exhaustive"):**
  - `tenant`/`tenantId` — **no functional code**; 4 hits total, all comments (navConfig, FeatureToggle JSDoc, post-event page.js). The multi-tenancy mechanism is named "whitelabel" in web, never "tenant". No `tenantId` field anywhere in `labbe`.
  - `PLATFORM_ADMIN_ROLES` — only the local const in `HostSelector.js` (already covered). No other file defines/gates on it as inverse-of-whitelabel.
  - **No `app/[lang]/whitelabel-dash/**` route folder exists** (only `signup-whitelabel`). The `middleware.js` `/whitelabel-dash` PROTECTED_ROUTE + redirect point at a non-existent route → safe to remove, no hidden orphan layout/page files.

- **DB/DATA (backend-owned):** `event.whitelabel` (theming object on the guest-portal payload) and `user.whitelabelId` / `user.whitelabelSubscription` / `profile.whitelabelData` (read by HostSelector, AdminCreateEvent, deleted WL tree). Web must stop consuming; field removal/migration is the backend+db agent's responsibility.

---

## Open questions / ambiguities for Round 2

1. **`admin-dash/plans/page.js` + `_components/CurrentPlanCard.jsx` fate (HIGH).** The page is *entirely* whitelabel-gated → tag is **DELETE-FILE pending the route decision** (delete the route vs repurpose). It sits in `adminNavItems`/`serverAuth` `plans`. Decide route deletion + reconcile the `plans` nav/RBAC entries (note `plans` is `ACCESS_LEVELS.NONE` for super_admin/admin/moderator in `serverAuth` already — so the nav item may already be effectively hidden; confirm). If deleted, `_components/CurrentPlanCard.jsx` + `page.module.css` orphan with it (no other importer found — re-verify in R2). Hosts use a different plans page (`app/[lang]/host/plans/...`) — unaffected.
2. **`navConfig.js` ↔ `@halla/shared` ordering (HIGH).** navConfig imports `WHITELABEL_ROLES`/`isWhitelabelRole` from shared. Removal must be sequenced so shared exports are de-whitelabeled in lockstep (or kept as no-op shims during transition) to avoid an import-time crash that breaks ALL nav.
3. **`event.whitelabel` portal branding (MED, cross-area).** Confirm backend will stop sending `event.whitelabel`; verify the guest portal renders correctly on `DEFAULT_PRIMARY`/`DEFAULT_BG`/platform logo once the prop is gone. (No non-WL functionality should regress — it already falls back to defaults.)
4. **`LogoUpload.js` defaults (LOW).** Its default `descriptionKey`/`buttonKey` point at `signupForm.whiteLabel.identity.logo.*`. Confirm no surviving caller relies on those defaults (all current WL callers are deleted); if a generic caller exists, retarget the defaults rather than leaving dangling i18n keys.
5. **`landing.json` single WL string (LOW).** Identify the exact key — delete vs reword if it is general marketing copy.
6. **Does removing the two `WHITELABEL_*` rows from `ROLE_NAV_ACCESS`/`ROLE_PAGE_ACCESS` (navConfig + serverAuth) affect admin/moderator?** Expectation: no (they are separate role keys). Verify `getNavItemsForRole`/`canAccessPage` still return correct sets for super_admin/admin/moderator after the WL-specific filter branches are removed (the `isWhitelabelRole` filter that hides `vendors`/`whitelabels` must be deleted *together with* the `whitelabels` nav item, else admin loses nothing but the dead branch lingers).
7. **`signup/whitelabel` vs `signup-whitelabel`.** Middleware `AUTH_ROUTES` lists `/signup/whitelabel` (slash), but the actual page route is `signup-whitelabel` (hyphen). Likely dead/legacy entry; confirm no `/signup/whitelabel` route exists (none found) and remove the stale `AUTH_ROUTES` entry.
8. **`subscriptionAssignmentSchema` / moderator schemas from `@halla/shared/schemas/admin`** — confirm with shared agent these don't embed a WL-only role enum that would 400 the surviving host/moderator flows after backend removes WL roles.
