# Whitelabel Removal — Round 1 Inventory: MOBILE (`halla-mobile/`)

Scope: React Native app at `D:\halla\halla-mobile\` only. Paths below are relative to `D:\halla`.
Cross-boundary deps (to `@halla/shared`, backend endpoints, deep-links) are noted per finding but owned by other agents.

---

## 1. Summary

Counts are unique file paths, recounted directly off the body; each path appears in exactly one bucket.

- **Total files touching whitelabel:** **59** (= 20 DELETE + 1 INVESTIGATE + 38 EDIT). The broad grep's 55 hits excluded `hooks/plans/*` and the two orphan plans components, and included `components/shared/*` false positives (substring "shared") + pure-comment mentions.
- **DELETE-FILE:** **20** — 5 WL screens + the 5-file `components/auth/whitelabel-signup/` dir + the 8-file `components/admin-dashboard/whitelabels/` dir + 2 orphaned plans components (`BusinessPlanCard.js`, `SummaryCards.js`).
- **EDIT-FILE:** **38** — strip WL parts only (8 screens, 2 navigators, 6 auth files, `authStore`, `adminPermissions`, 15 hooks/api+shared-component files, 4 i18n files, `InvitationScreen`).
- **INVESTIGATE:** **1** — `SetupPasswordScreen.js` (DELETE-pending backend confirmation that `/auth/setup-password` is WL-only). NB `useEventLoadAndGate.js` is classified **EDIT** (it will be edited); the moderator-scope question is an open flag in §10, not an unclassified file.
- **DB/DATA:** none owned by mobile (no schema; `whitelabelId` is only read off the server `user`/`event` objects — backend/shared own the field).
- Note on the orphaned `useBusinessPlans` hook + `ENDPOINTS.PLANS.BUSINESS`: these are **EDIT** (delete a function/export/constant; the host `hooks/plans/*` and `config/api.js` files stay), counted under EDIT-FILE, not DELETE.

### Top 5 highest-risk

1. **`halla-mobile/screens/common/update-event/useEventLoadAndGate.js`** — `canEditEvent` scopes events by `whitelabelId` **for `moderator` too**, not just whitelabel roles. Both naive edits break moderator editing. Correct post-removal moderator scope is undetermined from mobile — must come from backend `_buildScopedEventQuery`. EDIT / **high** / cross-boundary.
2. **`halla-mobile/utils/adminPermissions.js`** — the role-gating spine. Imports `WHITELABEL_ROLES`, `isWhitelabelRole`, `PLATFORM_ADMIN_ROLES`, `ADMIN_ROLES` from `@halla/shared/constants`; `NAV_ITEMS` gate on `PLATFORM_ADMIN_ROLES`/`ADMIN_ROLES`. If shared renarrows those constants under us, mobile nav silently over/under-exposes tabs. EDIT / **high** / cross-boundary.
3. **`halla-mobile/components/events/EventFailureBanner.js`** — `canRetry` launch-permission logic reads `whitelabelId`; touching it risks changing who can retry a failed event for host/admin. EDIT / **med-high**.
4. **`halla-mobile/components/admin-dashboard/events/CreateEventForm.js`** — wizard step-count + host-selector skip logic branches on `WHITELABEL_ROLES`; shared by host + super_admin/admin/moderator create-event. Mis-edit breaks the 6-step admin flow or 5-step host flow. EDIT / **med**.
5. **`halla-mobile/components/admin-dashboard/common/SubscriptionAssignmentModal.js`** & **`halla-mobile/components/admin-dashboard/events/HostSelectorStep.js`** — both are `entityType`/tab-driven shared host+whitelabel components; must collapse cleanly to host-only without breaking host subscription assignment / host event-target selection. EDIT / **med**.

---

## 2. Screens

### DELETE-FILE
- `halla-mobile/screens/auth/WhitelabelSignupScreen.js` — DELETE — 5-step whitelabel signup wizard; imports only `components/auth/whitelabel-signup/*`. Importers: only `AppNavigator.js` (route `WhitelabelSignup`) + `SignupScreen.js` role branch. Risk: **low**.
- `halla-mobile/screens/admin/admin-dashboard/AdminWhitelabelsScreen.js` — DELETE — whitelabel tenant list screen; imports `components/admin-dashboard/whitelabels` + shared `SubscriptionAssignmentModal`. Importer: only `AdminNavigator.js` (`AdminWhitelabelsList`, gated `isSuperAdmin`). Risk: **low**.
- `halla-mobile/screens/admin/admin-dashboard/WhitelabelDetailsScreen.js` — DELETE — whitelabel detail/approve/subscription screen (69 hits). Imports `WhitelabelHeroCard`, `WhitelabelSubscriptionModal`, `ApproveWhitelabelDialog`. Importer: only `AdminNavigator.js` (`WhitelabelDetails`). Risk: **low**.
- `halla-mobile/screens/admin/WhitelabelPlansScreen.js` — DELETE — whitelabel "business plans" purchase screen; gated by `onlyRoles:[WHITELABEL_ADMIN]` (AdminMoreScreen) / `canViewPage(PLANS)`. Uses `useBusinessPlans` + `BusinessPlanCard` (both orphaned, see §below). Importer: only `AdminNavigator.js` (`WhitelabelPlans`). Risk: **low** (but see "AdminPlans vs WhitelabelPlans" open question).
- `halla-mobile/screens/admin/WhitelabelPlansSummaryScreen.js` — DELETE — checkout summary for the above; imports `SummaryCards.js` (orphaned). Importer: only `AdminNavigator.js` (`WhitelabelPlansSummary`). Risk: **low**.

### INVESTIGATE (DELETE-pending-backend-confirmation)
- `halla-mobile/screens/auth/SetupPasswordScreen.js` — **INVESTIGATE → likely DELETE**. Header doc explicitly: "Whitelabel post-approval setup-password screen." POSTs to backend `POST /auth/setup-password` (via `setupPassword` in `hooks/auth/_api.js`). Reached via route `SetupPassword` + deep-link `halla://setup-password/<token>`.
  - **Discriminator for Round 2 / backend agent:** *Does any non-whitelabel invite flow hit `POST /auth/setup-password`?* Mobile evidence says **whitelabel-only**: the only other invite path on mobile is `AddModeratorModal`, which sends `password` inline (admin sets it directly) — there is no email-setup flow for mobile-created moderators/admins. The setup-email sender lives in the backend, so leave the final call to the backend agent. If confirmed whitelabel-only → DELETE the screen + its route registration + deep-link mapping + the `setupPassword` API helper + i18n block.
  - Cross-boundary: backend `/auth/setup-password`, deep-link scheme. Risk: **low** (isolated screen).

### EDIT-FILE
- `halla-mobile/screens/common/update-event/useEventLoadAndGate.js` — EDIT — **see top-5 #1**. Serves: loads event by id + maps API→form for the unified update wizard for **all** roles, plus live-event lockout flags. Whitelabel specifics: `canEditEvent` (lines ~130-148) lumps `whitelabel_admin`/`whitelabel_moderator`/`moderator` into one `whitelabelId`-equality branch; the `idOf(user.whitelabelId)` normaliser + the comment block (lines ~108-128). Imports `useEventActionGate` from `@halla/shared/hooks` (cross-boundary, keep). **Do not propose a concrete rewrite** — moderator's correct scope is a backend question. Risk: **high**.
- `halla-mobile/screens/common/update-event/UpdateEventScreen.js` — EDIT — whitelabel only in the header doc comment (lines ~2-4). Serves: the unified update wizard chrome for every role. Remove "whitelabel admin/moderator any event in their tenant" phrasing. Risk: **low** (comment only).
- `halla-mobile/screens/common/EventDetailsScreen.js` — EDIT — whitelabel only in comments (lines ~89, ~129). Logic is `isAdmin = role !== 'host'` (an inverse check that happens to include WL roles) — functionally fine once WL roles no longer exist. Serves: combined host+admin single-event details. Remove WL mentions from comments. Risk: **low** (comment only).
- `halla-mobile/screens/common/CreateEventScreen.js` — EDIT — whitelabel only in a comment (line ~25). Serves: unified create-event screen for all roles. Remove WL mention. Risk: **low** (comment only).
- `halla-mobile/screens/auth/SignupScreen.js` — EDIT — `handleRoleSelection` has a `whitelabel` branch (lines ~51-53) → `navigation.navigate("WhitelabelSignup")`. Serves: host signup (mobile/otp/complete) + vendor signup routing. Remove the `else if (role === "whitelabel")` branch. Risk: **low**.
- `halla-mobile/screens/admin/admin-dashboard/AdminDashboardScreen.js` — EDIT — `isWhitelabelRole` (lines ~43-44) drives a whole alternate stats-card set + chart layout (lines ~49-82, ~136-170) and a `stats.whitelabel.*` i18n namespace. Serves: the admin dashboard for super_admin/admin/moderator (non-WL branch). Remove `isWhitelabelRole` + collapse to the non-WL branch. Risk: **med**.
- `halla-mobile/screens/admin/admin-dashboard/AdminMoreScreen.js` — EDIT — nav config has a `PAGES.WHITELABELS`→`AdminWhitelabelsList` entry (lines ~35-40), an `AdminPlans` entry `excludeRoles:[WHITELABEL_*]` (line ~46), and a `WhitelabelPlans` entry `onlyRoles:[WHITELABEL_ADMIN]` (lines ~48-54). Serves: the admin "More" menu for all admin roles. Remove the whitelabels entry + the WhitelabelPlans entry; drop `excludeRoles` from the AdminPlans entry. Risk: **med** (see AdminPlans/WhitelabelPlans open question).
- `halla-mobile/screens/admin/admin-dashboard/AdminPlansScreen.js` — EDIT — the super_admin/admin plans-management screen (stays). Whitelabel surface: a `business` tab in `TYPE_PREFIX_BY_TAB` (line ~34, `["business_"]`) that filters for whitelabel/business plan types, plus the describing comment (line ~29). The tab is rendered via the `PlanTabs` component. After WL removal the `business` plan types are gone, so the `business` tab is vestigial — remove the tab entry + comment (and verify the `PlanTabs` tab list in Round 2). Risk: **low**.

> Note: every other `screens/admin/admin-dashboard/*` screen (hosts, vendors, events, tickets, payments, settings, templates, discounts, etc.) is **non-whitelabel** and stays unchanged.

---

## 3. Navigation

- `halla-mobile/navigation/AppNavigator.js` — EDIT — Whitelabel: import `WhitelabelSignupScreen` (line 44); `<Stack.Screen name="WhitelabelSignup">` (line 276); the two switch cases `case "whitelabel_admin":`/`case "whitelabel_moderator":` (lines 375-376) that route to `AdminStack`. Serves: the entire app's role-based root navigation (host/vendor/admin stacks + auth stack). **Removal is clean:** drop the import, the WhitelabelSignup screen, and the two switch cases — the remaining `super_admin/admin/moderator` cases still map to `AdminStack`, and the `default` branch already surfaces unknown roles. `SetupPassword` (line 50/280) registration removed only if SetupPassword is confirmed whitelabel-only. `Invitation` (lines 51/284) **stays** (see §Misc). Risk: **low**.
- `halla-mobile/navigation/AdminNavigator.js` — EDIT — Whitelabel: imports `AdminWhitelabelsScreen`, `WhitelabelDetailsScreen` (lines 26, 29), `WhitelabelPlansScreen`, `WhitelabelPlansSummaryScreen` (lines 49-50); the `isSuperAdmin`-gated `AdminWhitelabelsList`/`WhitelabelDetails` registrations (lines 265-276); `canViewPage(PAGES.WHITELABELS)` clause in `showMore` (line 366). Serves: the admin bottom-tab navigator + Hosts/Events/Tickets/More stacks for all admin roles. Remove WL imports, the two WL registrations, and the `WHITELABELS` clause in `showMore`. The `WhitelabelPlans`/`WhitelabelPlansSummary` registrations (lines 294-307) are gated by `PAGES.PLANS` (misnamed) — they only host the now-deleted WL plans screens, so remove them too. Risk: **med**.

---

## 4. Auth + Signup + SetupPassword

### DELETE-FILE (whitelabel-signup component dir)
All five are imported only by `WhitelabelSignupScreen.js` (being deleted):
- `halla-mobile/components/auth/whitelabel-signup/WhitelabelStep1Identity.js` — DELETE — Risk: **low**.
- `halla-mobile/components/auth/whitelabel-signup/WhitelabelStep2Login.js` — DELETE — Risk: **low**.
- `halla-mobile/components/auth/whitelabel-signup/WhitelabelStep3Requirements.js` — DELETE — Risk: **low**.
- `halla-mobile/components/auth/whitelabel-signup/WhitelabelStep4PlanSelection.js` — DELETE — uses orphaned `useBusinessPlans`. Risk: **low**.
- `halla-mobile/components/auth/whitelabel-signup/WhitelabelStep5Summary.js` — DELETE — Risk: **low**.
- (The whole `halla-mobile/components/auth/whitelabel-signup/` directory can be removed.)

### EDIT-FILE
- `halla-mobile/components/auth/RoleSelectionView.js` — EDIT — the `whitelabel` ("Business") role card object in the `ROLES` array (lines ~29-36, keys `signup.businessRole`/`businessRoleDescription`). Serves: the host/vendor/whitelabel signup role picker. Remove the third array entry. Risk: **low**.
- `halla-mobile/hooks/auth/_api.js` — EDIT — `signupWhitelabel` (lines ~145-180, posts `ENDPOINTS.AUTH.SIGNUP_WHITELABEL`) and `setupPassword` (lines ~304-323, posts `ENDPOINTS.AUTH.SETUP_PASSWORD`). Serves: login, OTP, vendor signup, complete-profile, forgot/reset password, logout, refresh — all non-WL. Remove the two functions (setupPassword pending §SetupPassword confirmation). Cross-boundary: backend endpoints. Risk: **low**.
- `halla-mobile/hooks/auth/index.js` — EDIT — re-exports `useWhitelabelSignup` (line 1). Keep `useVendorSignup`, `useMe`, `useSession`, `authKeys`. Risk: **low**.
- `halla-mobile/hooks/auth/mutations.js` — EDIT — `useWhitelabelSignup` (lines ~10-14) + its `signupWhitelabel` import (line 2). Keep `useVendorSignup`. Risk: **low**.
- `halla-mobile/utils/schemas/authSchemas.js` — EDIT — re-exports `whitelabelSignupSchema` (line 14) from `@halla/shared/schemas/auth`. Keep the other 8 schema re-exports. Cross-boundary: shared owns the schema definition. Risk: **low**.
- `halla-mobile/App.js` — EDIT — the `linking` config has the whitelabel deep-link comment block (lines ~132-139) and `SetupPassword: "setup-password/:token"` screen mapping (line 145). Serves: deep-link config for reset-password, invitation (guest portal), 3DS payment return. Remove the WL comment + the SetupPassword mapping (pending §SetupPassword); the `Invitation` comment at line ~153 mislabels it "whitelabel guest portal" — keep the mapping, fix the comment. Risk: **low**.

---

## 5. Stores + State

- `halla-mobile/stores/authStore.js` — EDIT — two whitelabel touch-points only: the `isWhitelabel()` getter (line ~398, `["whitelabel_admin","whitelabel_moderator"].includes(role)`) and the two WL role strings inside `isAdminDashboardRole()` (lines ~399-402). Serves: the entire mobile auth lifecycle (login/OTP/signup/refresh/logout, token persistence, role getters `isHost`/`isVendor`/`isAdmin`). **`authStore uses whitelabelId for nothing`** — role is derived purely from `user.role`; there is no `whitelabelId` field or logic in the store. Remove the `isWhitelabel()` getter and drop the two WL strings from `isAdminDashboardRole()`'s array.
  - Consumer check: `isWhitelabel()` and `isAdminDashboardRole()` have **no external callers** (grep finds only the definitions) — safe to trim. Risk: **low**.

---

## 6. Permissions + Role-Gating

- `halla-mobile/utils/adminPermissions.js` — EDIT — **see top-5 #2** (21 hits). Whitelabel surface:
  - Imports/re-exports `WHITELABEL_ROLES`, `isWhitelabelRole`, `PLATFORM_ADMIN_ROLES` (lines 12-27) from `@halla/shared/constants`.
  - `ACCESS_MATRIX` rows `[ROLES.WHITELABEL_ADMIN]` (lines ~93-106) and `[ROLES.WHITELABEL_MODERATOR]` (lines ~107-120), plus the `PAGES.WHITELABELS` column on every other role row.
  - `NAV_ITEMS`: `WHITELABELS` item (line 149, `requiredRoles:[SUPER_ADMIN]`); WL roles inside the `Moderators` (line 148) and `plans` (line 150) `requiredRoles` arrays.
  - `isWhitelabelAdmin()` helper (line ~171); WL entries in `getRoleDisplayName` map (lines ~181-182); `isModerator()` includes `WHITELABEL_MODERATOR` (line ~173); `WHITELABEL_ROLES` in the default export.
  - Serves: the **entire** mobile admin RBAC — page access levels, nav filtering, role checks for super_admin/admin/moderator. Used by `AdminNavigator`, `EventDetailsScreen`, `AddModeratorModal`, etc.
  - Cross-boundary open question: the post-removal shapes of `ADMIN_ROLES` / `PLATFORM_ADMIN_ROLES` / `isWhitelabelRole` (shared agent). `NAV_ITEMS` use `PLATFORM_ADMIN_ROLES` (Vendors/Tickets/Templates) and `ADMIN_ROLES` (Dashboard/Hosts/Events/Payments/Settings) — if shared deletes/renarrows them, nav visibility shifts. Coordinate with shared inventory before editing. Risk: **high**.

---

## 7. Hooks + API

### EDIT-FILE
- `halla-mobile/config/api.js` — EDIT — `AUTH.SIGNUP_WHITELABEL` (line 26); the entire `ADMIN.WHITELABELS` block (lines 269-278); `AUTH.SETUP_PASSWORD`/`AUTH.RESEND_SETUP_EMAIL` (lines 43-44, remove if SetupPassword confirmed WL-only). `PLANS.BUSINESS` (line 55) becomes orphaned once `useBusinessPlans` goes — remove it too. **Keep** `ADMIN.EVENT_TARGETS` (line 285, used by HostSelectorStep for host targets). Serves: the full endpoint registry (everything else). All values reference `API_PATHS` from `@halla/shared/api/paths` — cross-boundary (shared owns the path strings). Risk: **low**.
- `halla-mobile/hooks/admin/index.js` — EDIT — re-exports 11 WL hooks: `useAdminWhitelabelById`, `useAdminWhitelabelFeatures`, `useAdminWhitelabels` (queries); `useAdminWhitelabelsInfinite` (infinite); `useBulkDeleteWhitelabels`, `useBulkSuspendWhitelabels`, `useDeleteWhitelabel`, `useExportWhitelabels`, `useUpdateAdminWhitelabelFeatureMutation`, `useUpdateWhitelabelStatus`, `useUpdateWhitelabelSubscription` (mutations). Keep all host/vendor/moderator/event/ticket/payment/plan re-exports. Risk: **low**.
- `halla-mobile/hooks/admin/queries.js` — EDIT — `useAdminWhitelabels` (lines ~150-164), `useAdminWhitelabelById` (lines ~166-179), `useAdminWhitelabelFeatures` (lines ~241-254). **Keep** `useAdminEventTargets` (lines ~260-272) — it's shared (called with `'host'` and `'whitelabel'`; the WL caller is `HostSelectorStep`, but the hook itself stays for host targets). Risk: **low**.
- `halla-mobile/hooks/admin/mutations.js` — EDIT — the entire WHITELABELS section (lines ~630-757): `useUpdateWhitelabelStatus` (note `dispatchSetupEmail` param — ties to the WL setup-email flow), `useDeleteWhitelabel`, `useUpdateWhitelabelSubscription`, `useBulkDeleteWhitelabels`, `useBulkSuspendWhitelabels`, `useUpdateAdminWhitelabelFeatureMutation`, `useExportWhitelabels`. Keep all other mutations. Risk: **low**.
- `halla-mobile/hooks/admin/infinite.js` — EDIT — `useAdminWhitelabelsInfinite` (lines ~169-182). Keep the rest. Risk: **low**.
- `halla-mobile/hooks/admin/keys.js` — EDIT — `whitelabels`, `whitelabelsAll`, `whitelabelDetail`, `whitelabelsInfinite`, `whitelabelFeatures` key factories (lines ~35-44). Keep the rest. Risk: **low**.
- `halla-mobile/hooks/plans/index.js` — EDIT — the `useBusinessPlans` export (line ~4). Keep host/business-other plan hooks that remain in use. Risk: **low**.
- `halla-mobile/hooks/plans/queries.js` — EDIT — the `useBusinessPlans` function (lines ~35-39, hits `ENDPOINTS.PLANS.BUSINESS`). **Orphaned** once the two WL plan screens + `WhitelabelStep4PlanSelection` are deleted (those are its only consumers). Remove the function. Risk: **low**.

### EDIT-FILE (shared host/whitelabel components)
- `halla-mobile/components/admin-dashboard/events/CreateEventForm.js` — EDIT — **see top-5 #4**. Whitelabel: import `WHITELABEL_ROLES` from `@halla/shared/constants/roles` (line 21); `isWhitelabelRole`/`skipHostSelector` derivation (lines ~63-82); WL-conditional step math + gating + comments (lines ~120-128, ~228-271). Serves: host mode (5-step) + admin/super_admin/moderator mode (6-step with HostSelector). After removal `skipHostSelector` collapses to `isHostMode`. Cross-boundary: shared roles constant. Risk: **med**.
- `halla-mobile/components/admin-dashboard/events/HostSelectorStep.js` — EDIT — **see top-5 #5**. Locally-defined `WHITELABEL_ROLES` (line 18); `isPlatformAdmin = ... && !user?.whitelabelId` (line 23); `isWhitelabelAdmin` (line 24); the `'whitelabel'` tab (TABS line 25, `useAdminEventTargets('whitelabel')` lines ~36-38, `handleSelectWhitelabel` lines ~69-71, `whitelabels` data line 124, the whole `activeTab === 'whitelabel'` block lines ~195-209). Serves: the 'self' + 'host' tabs (create event for self or for a host by phone). After removal: drop the WL tab, the WL roles const, and the `!user?.whitelabelId` qualifier (becomes just `PLATFORM_ADMIN_ROLES.includes(role)`). Risk: **med**.
- `halla-mobile/components/admin-dashboard/common/SubscriptionAssignmentModal.js` — EDIT — **see top-5 #5**. `entityType`-driven host/whitelabel "Manage Subscription" modal. Whitelabel: import `useUpdateWhitelabelSubscription` (line 24) + `whitelabelMutation` (lines ~83-86); `nsPrefix`/label/sublabel `whitelabels` branches (lines 80, ~154-160); `whitelabelId` payload branch (line ~137); `entityType` propType `oneOf(["host","whitelabel"])` (line 259); `useAdminPlans({availableFor:'whitelabel'})` when called from WL screen. Serves: host subscription assignment (`AdminHostsScreen` uses it with `entityType="host"`). After removal: collapse to host-only (drop ternaries). Importers: `AdminHostsScreen` (keep) + `AdminWhitelabelsScreen` (deleted). Risk: **med**.
- `halla-mobile/components/admin-dashboard/moderators/AddModeratorModal.js` — EDIT — `isWhitelabel` check (lines ~34-36) + WL `ROLE_OPTIONS` branch (lines ~38-46, `whitelabel_admin`/`whitelabel_moderator`) + `defaultRole` (line ~48). Serves: add/edit moderator modal for super_admin/admin (the `moderator`/`admin` role options). After removal: `ROLE_OPTIONS` becomes the non-WL array, `defaultRole = "moderator"`. Risk: **low-med**.
- `halla-mobile/components/admin-dashboard/moderators/ModeratorListItem.js` — EDIT — `ROLE_LABEL_KEYS` has `whitelabel_moderator`/`whitelabel_admin` keys (lines 9-10). Serves: moderator/admin role-label display. Remove the two keys. Risk: **low**.
- `halla-mobile/components/admin-dashboard/notifications/SendNotificationModal.js` — EDIT — `ROLE_OPTIONS` has a `whitelabel_admin` entry (line 22). (Note: `ROLE_OPTIONS` is declared but not visibly consumed in this file's JSX — verify it isn't dead in Round 2.) Serves: send/broadcast notification to host/vendor/moderator/admin. Remove line 22. Risk: **low**.
- `halla-mobile/components/events/EventFailureBanner.js` — EDIT — **see top-5 #3**. `whitelabelId`-based `canRetry` (lines ~157-169): `userWhitelabelId`, `eventWhitelabelId`, and the `userRole === 'whitelabel_admin' && ...` clause. Serves: the failed/retrying event banner for host (owner) + admin/super_admin. After removal: keep host-owner / admin / super_admin clauses, drop the WL clause + the two `*WhitelabelId` vars. Risk: **med-high** (retry-permission logic).

---

## 8. i18n strings

All EDIT-FILE. EN and AR mirror each other structurally (the broad grep undercounts AR because its strings don't contain the literal "whitelabel"). Keep every non-WL key.

- `halla-mobile/localization/locales/en/auth.json` — EDIT —
  - `signup.businessRole` + `signup.businessRoleDescription` (lines ~66-67).
  - `signupForm.whiteLabel` block (the WL signup wizard strings, starts line ~857).
  - top-level `setupPassword` block (lines ~1082-1098) — remove if SetupPassword confirmed WL-only.
- `halla-mobile/localization/locales/ar/auth.json` — EDIT — same keys: `businessRole`/`businessRoleDescription` (66-67), `...whiteLabel` block (line ~344), `setupPassword` block (line ~600).
- `halla-mobile/localization/locales/en/admin.json` — EDIT (37 hits) —
  - `...whitelabel` plans-availability key (line ~89) and `roles.whitelabel_moderator`/`roles.whitelabel_admin` (lines ~282-283).
  - plans `availableFor.whitelabel = "For Whitelabel"` (line ~607).
  - top-level `whitelabelDetails` block (lines ~877-934, incl. approve/setup-email strings).
  - top-level `whitelabels` block (lines ~936-996).
  - `more.whitelabels` (line ~1312) and a `whitelabel_admin: "Whitelabel Admins"` plural label (line ~1375).
  - Also a `stats.whitelabel.*` namespace used by `AdminDashboardScreen` (search `stats.whitelabel`).
- `halla-mobile/localization/locales/ar/admin.json` — EDIT (11 literal hits but structurally mirrors EN) — parallel blocks: `whitelabel` (89), `whitelabel_moderator`/`whitelabel_admin` (282-283), availability `whitelabel` (607), `whitelabelDetails` (877), `whitelabels` (936), `more.whitelabels` (1312), role plural (1375), plus the `stats.whitelabel.*` mirror.

---

## 9. Misc / Dead-code cascade (orphaned by removal)

- `halla-mobile/components/admin-dashboard/whitelabels/` (whole directory) — **DELETE** — 8 files: `index.js`, `WhitelabelList.js`, `WhitelabelListItem.js`, `WhitelabelHeroCard.js`, `WhitelabelActions.js`, `WhitelabelSubscriptionModal.js`, `ApproveWhitelabelDialog.js`, `PlanCard.js`. Imported only by `AdminWhitelabelsScreen` / `WhitelabelDetailsScreen` (both deleted) and each other. Risk: **low**.
- `halla-mobile/components/plans/BusinessPlanCard.js` — **DELETE** — orphaned once WL plan screens go; only consumer is `WhitelabelPlansScreen` (deleted). No host/vendor entry point to "business plans" exists. Imports `PlanDescription` (which **stays** — also used by `HostPlanCard.js`). Risk: **low**.
- `halla-mobile/components/plans/SummaryCards.js` — **DELETE** — barrel of `PlanSummaryCard`/`DiscountCodeCard`/`PaymentSummaryCard`; only consumer is `WhitelabelPlansSummaryScreen` (deleted). NOTE: the host `PlansSummaryScreen` imports the **standalone** files `./PlanSummaryCard`, `./DiscountCodeCard`, `./PaymentSummaryCard` (separate components), which **stay**. Only `SummaryCards.js` is dead. Risk: **low** (verify no other importer in Round 2).
- `useBusinessPlans` (in `hooks/plans/queries.js` + `hooks/plans/index.js`) and `ENDPOINTS.PLANS.BUSINESS` (`config/api.js`) — orphaned; covered as EDIT-FILE in §7.

---

## 10. Open questions / ambiguities for Round 2

1. **Is `SetupPasswordScreen` whitelabel-only?** Mobile evidence says yes (only invite path is WL approval → setup email; `AddModeratorModal` sets passwords inline). **Discriminator:** does the backend `POST /auth/setup-password` serve any non-WL invite (admin-created moderator/admin)? The setup-email sender lives in backend — defer the DELETE call to the backend agent. If WL-only: delete the screen, route registration (`AppNavigator` line 280), deep-link (`App.js` line 145), `setupPassword` helper (`hooks/auth/_api.js`), `AUTH.SETUP_PASSWORD`/`RESEND_SETUP_EMAIL` endpoints, and the `setupPassword` i18n blocks.
2. **`useEventLoadAndGate.canEditEvent` — moderator scope after removal (HIGH RISK).** `moderator` currently shares the `whitelabelId`-equality branch with the WL roles. Two failure modes: (a) deleting the branch drops `moderator` into host-ownership matching (can only edit owned events); (b) keeping `moderator` in a `whitelabelId` check makes `Boolean(userWl)` always false for a platform moderator (never edits). There's also a **pre-existing inconsistency**: a platform moderator with no `whitelabelId` returns `false` here today, yet `ACCESS_MATRIX` grants `MODERATOR.EVENTS = EDIT`. The correct post-removal scope is **undetermined from mobile** — it must mirror backend `_buildScopedEventQuery`. Round 2 must reconcile with the backend inventory before editing.
3. **`adminPermissions.js` ↔ `@halla/shared/constants` (HIGH RISK / cross-boundary).** After shared removes WL, what are the final shapes of `ADMIN_ROLES`, `PLATFORM_ADMIN_ROLES`, and `isWhitelabelRole`? Mobile's `NAV_ITEMS` depend on `PLATFORM_ADMIN_ROLES` (Vendors/Tickets/Templates) and `ADMIN_ROLES` (Dashboard/Hosts/Events/Payments/Settings); the `ACCESS_MATRIX` keys on `ROLES.WHITELABEL_*`. If shared renarrows or deletes these constants, mobile nav silently over/under-exposes tabs. Coordinate edit ordering with the shared inventory.
4. **AppNavigator after WL removal.** Confirmed clean: removing the two switch cases + the `WhitelabelSignup` screen + import leaves no orphan; `super_admin/admin/moderator` still route to `AdminStack`, and `default` already surfaces unknown roles with an error. `Invitation` and `SetupPassword` (pending #1) are independent.
5. **Does `authStore` use `whitelabelId` for anything non-whitelabel?** **No.** Role is derived purely from `user.role`; the store holds no `whitelabelId` field and no logic reads it. The only WL surface is `isWhitelabel()` + two role strings in `isAdminDashboardRole()`, neither of which has external callers. Clean trim.
6. **Is the `Invitation` screen whitelabel-only?** **No** — it is the public guest RSVP portal, registered in Auth/Host/Vendor/Admin stacks and deep-linkable (`halla://invitation/<code>`). It reads `event.whitelabel` **only** for optional branding (brandColor/accentColor/logo) with `FALLBACK_*` colors for non-WL events. **Keep the screen + route**; treat as EDIT to strip the WL branding overlay:
   - `halla-mobile/screens/guest-portal/InvitationScreen.js` — EDIT — WL branding at lines ~36-49 (`whitelabel` source, `brandColor`/`accentColor`/`logoUri`), used in `themedStyles` (lines ~61-65), the loading spinner (line ~72), and three logo `<Image>` blocks (lines ~131-174). Serves: the entire guest RSVP flow (`useGuestByToken` + `useSubmitRSVP`). After removal: drop the `event.whitelabel` source and fall back to `event.eventDetails.primaryColor` / `FALLBACK_*` directly. Also fix the mislabeled "Whitelabel guest portal" comment in `App.js`. Risk: **med** (branding is threaded through rendering).
7. **`SendNotificationModal.ROLE_OPTIONS`** appears unused in the file's JSX — confirm in Round 2 whether the role array is dead (then the whole const goes) or consumed by a parent.
8. **`AdminPlans` vs `WhitelabelPlans` "plans" tab.** Today: `AdminPlans` excludes WL roles; `WhitelabelPlans` is WL-admin-only; both gate via `PAGES.PLANS`/`canViewPage`. After removal, only `AdminPlans` remains for super_admin/admin — confirm no role loses legitimate plans access and that the `PLANS` page-key (mobile-only alias in `adminPermissions.js`) still resolves for the surviving roles.
