# Whitelabel Removal — Final Migration Plan

**Status:** Ready to execute · **Updated:** 2026-06-20 (rev 2 — folds in the Codex review + Round-3 verification + advisor checkpoint)
**Inputs:** `round1/` inventories + `round2/` verifications + `round3/codex-verification.md` (exhaustive file:line detail lives there; this plan is the execution spec).
**Companion:** the future **business-account** feature is specced in **[BUSINESS_ACCOUNT_PLAN.md](../business-account/BUSINESS_ACCOUNT_PLAN.md)** — built in phases **after** this removal.

> ## ⚠️ DEV-SCOPE ASSUMPTION (read first)
> This plan resets the database instead of running a production data migration. **That is only safe if the only live DB is the local/dev DB.** A deployed environment exists (`halaa.com.sa`, Mongo Atlas — see memory `reference_contabo_vps.md` / `project_deploy_halla_shared.md`). **If a production DB with real users/events exists, DO NOT run Phase 2 — use [Appendix A: Production data-migration fallback](#appendix-a--production-data-migration-fallback) instead.** Round-3 confirmed the dev DB is seed-sourced (`seedTestUsers.js`), so the dev path is correct for local work; the prod path is preserved, not deleted.

---

## 0. Owner decisions (locked)

1. **Business plans = KEEP, untouched** (one necessary exception, §1b-checkout). The "هلا أعمال / Halaa Business" catalog (`getBusinessPlans`, `getLandingPlans`, `GET /plans/business`, `/plans/landing`, the seeded business Plan docs, `PLAN_AVAILABILITY.WHITELABEL`, `planDefaults.js` business defs, shared `availabilityEnum "whitelabel"`, swagger `availableFor` enums) is reserved for the future business accounts.
2. **Delete whitelabel accounts & their tenant data** (dev: achieved by the DB reset; prod: Appendix A).
3. **Moderator → edit any event platform-wide** — backend `_buildScopedEventQuery` + mobile `useEventLoadAndGate` (positive fix) + web RBAC.

## THE governing rule — two independent "whitelabel" axes

| Axis | What it is | Disposition |
|---|---|---|
| **`whitelabelId` axis** | the multi-tenancy pointer (`User.whitelabelId` self/parent ref) + the two roles + tenant-mgmt + signup/setup | **REMOVE entirely** |
| **`availableFor:'whitelabel'` axis** | a plan-availability *value* the **business-plans product** rides on (`PlanModel` has **no** `whitelabelId`) | **KEEP** (one exception: the checkout gate, §1b) |

`PlanModel` has no `whitelabelId`, so the dev reset / data work never targets Plan docs. The literal string `"whitelabel"` survives **only** as the business-plans availability tag (renamed to `'business'` in the business phase). Every other `whitelabel*` symbol is removed.

**Architecture fact (why this is safe):** there is no `Whitelabel` model — a whitelabel *is* a `User(role:'whitelabel_admin')`, `whitelabelId` self-references it, and every real platform record is `whitelabelId = null`, so dropping each query clause is behaviour-preserving.

---

## 1. Code changes by package

Counts (post Round-2/3): Web ~43 deletes / ~23 edits · Mobile 21 deletes / ~37 edits · Backend 7 file-deletes + many edits · Shared 0 deletes / 8 edits. Full file lists in `round1/`+`round2/`; the high-risk and **newly-added** items are called out here.

### 1a. Shared (`shared/`) — `round2/shared-verification.md §4`
- `constants/roles.js`: drop `ROLES.WHITELABEL_ADMIN/MODERATOR`, `WHITELABEL_ROLES`, `isWhitelabelRole`, the two `ROLE_HIERARCHY` WL keys + the two WL entries in `SUPER_ADMIN`'s array, the two WL members of `ADMIN_ROLES`.
  - **`PLATFORM_ADMIN_ROLES` / `isPlatformAdmin`: LEAVE UNTOUCHED.** They are already `[super_admin, admin, moderator]` (never contained WL members) → **zero change** from whitelabel removal. (Deleting them is an *optional, separate* cleanup — explicitly **out of scope** here to keep the removal's review surface minimal, per Codex. Do not migrate their importers.)
- `constants/permissions.js`: drop `ADMIN_PAGES.WHITELABELS`, `PERMISSIONS.MANAGE_WHITELABELS`.
- `schemas/auth.js`: delete `whitelabelSignupSchema` + barrel entry + the 4 regex imports.
- `schemas/_shared.js`: delete `ARABIC_TEXT_REGEX`, `ENGLISH_TEXT_REGEX`, `LICENSE_REGEX`, `TAX_REGEX` (verified used only by the WL schema).
- `schemas/settings.js`: delete the 4 `whitelabel*` notification schemas/defaults + the WL `case`s in `getNotificationSchemaForRole`/`getNotificationDefaultsForRole` + the 2 WL members of the local `USER_ROLES`.
- `schemas/admin.js`: delete `whitelabelSubscriptionSchema` (zero importers, verified).
- `schemas/plans.js`: **KEEP `availabilityEnum "whitelabel"`** (business plans).
- `api/paths.js`: delete `auth.whitelabelSignup`, the whole `admin.whitelabels` object, and `auth.{validateSetupToken,setupPassword,resendSetupEmail}` (+ comment).
- `hooks/useEventActionGate.js`: drop the `whitelabel_admin` clause in `canManualRetry` + the `userWlId`/`eventWlId` locals (keep host/admin/super_admin retry).
- `utils/notification.js`: drop the `whitelabel_registered` icon-map entry.

### 1b. Backend (`labbe-backend-/`) — `round1/backend-db-inventory.md` + `round2`/`round3`
- **DELETE files:** `src/shared/middleware/whitelabel.js`; `src/modules/admin/admin.whitelabels.{service,routes,controller}.js`; `email/templates/whitelabels.js`; `scripts/createWhitelabelTestUsers.js`; `scripts/audit-admin-whitelabel.js`.
- **Constants:** mirror the shared role/permission edits in backend's own copies; drop `WHITELABEL_APPLICATION_STATUS` + `TICKET_SOURCE.WHITELABEL`. **KEEP `PLAN_AVAILABILITY.WHITELABEL` + `planDefaults.js` business defs.** `PLATFORM_ADMIN_ROLES`/`isPlatformAdmin` (backend copy): **leave untouched** (already WL-free; matches §1a).
- **Middleware:** delete `whitelabel.js`; `auth.js` remove `.populate("whitelabelId")`, `req.whitelabelId/req.tenant/req.isWhitelabel`, `extractTenantContext`, `validateTenant`; **H2** atomic edit in `subscription.js` (drop `!whitelabelId` term **with** dropping WL from `ADMIN_ROLES`); delete `checkFeature` from `rbac.js` (dead, verified unmounted); drop `whitelabelId` from `auditLog.js`; fix `middleware/index.js` exports.
- **admin module (H3):** remove the WL route mount + `Object.assign` + `require('./admin.whitelabels.service')` (`admin.service.js:10`); rework `admin.controller.shared.js` + every admin controller (hosts/moderators/vendors/payments/events) to stop threading `getWhitelabelIdFromFilter`. `admin.moderators.service.js`: collapse to `{role:{$in:[MODERATOR,ADMIN]}}`, preserve the platform branch exactly (HIGH).
- **events (decision #3):** `_buildScopedEventQuery` → remove WL roles from `tenantScoped`; ADMIN/MODERATOR drop the `whitelabelId` equality (→ edit any event); keep super_admin-any + host-own. Same in `post-event.service.buildScopedEventQuery`. Drop `getAllEvents` null-skip + `_getWhitelabelHostIds`; drop `whitelabelId` from `_formatEvent` + `createEvent`. Strip WL from `events.routes` `restrictTo` lists + middleware mounts.
- **auth + setup-password (full delete):** delete `signupWhitelabel`, `_notifyAdminsNewWhitelabel`, and the entire setup-password feature: `setupPassword`/`validateSetupToken`/`resendSetupEmail` controllers + routes + `setupPasswordSchema`/`resendSetupEmailSchema` + `createPasswordSetupToken` + `passwordSetupToken/Expires` fields + `toJSON` deletes + `getMe`/`users.service` select mentions. **forgot-password/reset-password stay** (covers all real users). Also `auth.js` template residue: `welcomeEmail` WL `roleMessage` (L41-44) + `getRoleName*` WL cases (L528-529/545-546).
- **dashboard/notifications/payments/tickets/staff/guests/subscriptions/scheduled-reminders:** strip `whitelabelId` filters/audits + WL role branches per inventory; preserve host/admin paths.
- **checkout — THE one necessary exception to decision #1:** `checkout.service.js:188` remove `whitelabelId` on Payment.create (whitelabelId axis). `checkout.service.js:46` currently gates `plan.availableFor==='whitelabel'` on `user.role !== ROLES.WHITELABEL_ADMIN`; that constant is being deleted, so the gate **cannot be left literally untouched** (it would reference `undefined`). **Rewrite it to reserved-only:** `if (plan.availableFor === 'whitelabel') throw <reserved/not-purchasable>;`. Result: business plans remain **queryable/editable/displayable** (public `/plans/business` does not pass through this gate — unaffected) but **not purchasable** until the business-account phase repoints the gate to `role === 'business'`. This matches "reserved for later".
- **Newly-found residue (Round 3 — add these explicitly):**
  - `models/EventModel.js:331-332` **and** `:362-363` — `createdBy.role`/`createdFor.role` are the legitimate "a super_admin/admin/moderator created this event **for** a host (or, later, a business account)" enums. **Strip ONLY the two whitelabel values** (`whitelabel_admin`, `whitelabel_moderator`) from both; **KEEP** `super_admin`/`admin`/`moderator`/`host`. Do not collapse or remove the enums. (The business phase adds `business` here.)
  - `models/AuditLogModel.js:33-34` — drop both WL values from `performedByRole`; `:57` — drop `targetType:"whitelabel"` (only writer was the deleted `admin.whitelabels.service`).
  - `models/PaymentModel.js:372/377` — **runtime** WL-admin branch (`payerActionUrl` + notify gate); collapse to the host path (not just an enum).
  - `models/NotificationPreferencesModel.js` (WL enum members + 2 switch cases), `models/NotificationModel.js:46` (`WHITELABEL_REGISTERED` type), `models/TicketModel.js:137/163` (WL pre-save hook + static).
  - `src/modules/events/events.resend.service.js:354` — drop `whitelabelId` from the `extraReminder` audit (Round-1/2 missed this sibling).
  - `src/shared/utils/scheduledTasks.js` — **9** audit `whitelabelId` sites (not singular) + the `.select` token.
  - `email/templates/auth.js:169` (`passwordSetupEmail` + export :560), `email/templates/index.js:148` (registry), `email/index.js:69-72` (`send.passwordSetup` wrapper), `emailService.sendWhitelabelApplicationPendingEmail`; `email/templates/vendors.js` dead `setupPasswordUrl` branch; `email/templates/reports.js` dead `pendingWhitelabels` block.
- **Email:** delete `whitelabels.js` template + its `index.js` registry/category/spread + the 4 `send.*` wrappers.
- **Models — remove the field declarations now** (dev reset rebuilds indexes from the current schema, so no expand-contract needed): `whitelabelId` field + indexes on the 8 models; `domain` subdoc + `whitelabelDataSchema` + `profile.whitelabelData` + `isWhitelabelUser`/`isAdmin` WL entries + `toPublicJSON` WL branch + optional-`whitelabelId` statics (UserModel); the `.populate(... whitelabelId)` token in `StaffAccessTokenModel`.
- **`scripts/seedTestUsers.js` — full rewrite (not just L320/335)** per `round3/codex-verification.md §2`: delete the `whitelabelAdmin` def (~L109-145), `whitelabelModerator` def (~L207-225), the `businessQuarterlyPlan` lookup+guard (~L246/253-256 — a now-dead *seed* reference; the catalog plan is untouched), the WL-admin create+subscription block (~L298-314), the H-23 scoping comment (~L285-296), the WL-moderator create (~L346-352), the two summary rows (~L384/385) + notes line (~L398), **and** drop `whitelabelId` from the admin/moderator spreads (L320/335). Net: 5 seeded users, none tenant-scoped.
- **Swagger/misc:** remove `whitelabel_admin` from role enums + the WL dashboard-analytics block + `whitelabelId` in Payment schema; **leave `whitelabel` in `availableFor` enums** (business). `s3Upload.js` WL logo path key; `admin.shared.service.js` WL_MODERATOR subscription fallback.

### 1c. Web (`labbe/`) — `round1/web-inventory.md` + `round2/web-verification.md`
- **DELETE:** `admin-dash/whitelabels/**`; `signup-whitelabel/**`; `setup-password/**`; `ui/auth/signup/whiteLabel/**`; `ui/auth/setup-password/SetupPassword.js`(+css); `ui/admin/whitelabels/ApproveWhitelabelDialog.jsx`; `ui/admin/FeatureToggle.jsx`(+css); `ui/commen/inputs/LogoUpload.js` (dead, 0 importers); `admin-dash/plans/page.js` + `_components/CurrentPlanCard.jsx`(+css) (WL-role-gated, no audience); i18n `{ar,en}/adminWhitelabels.json` + `{ar,en}/setupPassword.json`.
- **navConfig.js (H1, HIGH):** drop the `@halla/shared` WL imports + re-exports (and `ui/layout/index.js`), `DASHBOARD_TYPES.WHITELABEL`, `whitelabelNavItems`, the `whitelabels` nav item, all WL `ROLE_NAV_ACCESS`/`ROLE_PAGE_ACCESS` rows, the `isWhitelabelRole` filter (:551), WL branches in `getNavItems`/`canAccessPage`/`getDashboardTypeFromPath`/`getBasePath`, `PERMISSION_TO_NAV_KEY.manage_whitelabels`, **and the now-dead `plans` nav/RBAC rows** (coupled with deleting the plans route). Verify super_admin/admin/moderator nav byte-for-byte unchanged.
- **serverAuth.js / middleware.js:** strip WL roles/pages/`isWhitelabelUser`/`canAccessAdminDash` WL membership/`PROTECTED_ROUTES.whitelabel`/`whitelabel-dash` redirect/stale `/signup/whitelabel`.
- **EDIT:** `HostSelector.js`, `AdminCreateEvent.jsx`, `DashboardStats/Charts/RecentActivity` (+`.whitelabelGrid` css), `SubscriptionAssignmentPopup.jsx` (host-only), `Add/EditModeratorPopup.jsx`, login `Form.js`, landing `Header.jsx`, `Header.js`, `NotificationItem.js`, `notificationPreferencesSchemas.js` (H1 mirror), `authStore.js`, `authFormHelpers.js`, `hooks/auth/mutations.js`, `hooks/admin/{queries,mutations,keys,index}.js`, `providers/index.js`.
- **Invitation portal:** `invitation/[code]/page.jsx` + Portal children — strip the (already-vestigial) `event.whitelabel` theming; it falls back to defaults. (Branding will be re-added, business-sourced, in the business phase.)
- **i18n:** strip WL blocks from `signup/login/common/home-events/admin/adminDashboard/adminEvents/adminModerators` (ar+en); `landing.json` → reword `features.items[10]` (don't delete the element).
- **KEEP (decision #1):** `hooks/plans/{queries,index,keys}.js` `useBusinessPlans`/`plansKeys.business` + `API_PATHS.plans.getBusinessPlans` (reserved business data layer).

### 1d. Mobile (`halla-mobile/`) — `round1/mobile-inventory.md` + `round2/mobile-verification.md`
- **DELETE (21):** screens `WhitelabelSignupScreen`, `AdminWhitelabelsScreen`, `WhitelabelDetailsScreen`, `WhitelabelPlansScreen`, `WhitelabelPlansSummaryScreen`, `SetupPasswordScreen`; dirs `components/auth/whitelabel-signup/**` (5), `components/admin-dashboard/whitelabels/**` (8); orphans `components/plans/BusinessPlanCard.js`, `components/plans/SummaryCards.js`.
- **Navigation:** `AppNavigator.js` (drop WL import, `WhitelabelSignup` + `SetupPassword` screens, the 2 WL switch cases); `AdminNavigator.js` (drop WL imports/registrations + `PAGES.WHITELABELS` clause).
- **`adminPermissions.js` (H1, HIGH):** drop the shared WL imports + re-exports (`WHITELABEL_ROLES`/`isWhitelabelRole`), the 2 WL `ACCESS_MATRIX` rows + `PAGES.WHITELABELS` columns + `WHITELABELS` NAV_ITEM + `isWhitelabelAdmin` (dead) + WL entries in `isModerator`/`getRoleDisplayName`. **`PLATFORM_ADMIN_ROLES` import + NAV_ITEMS usage stay as-is** (no rec-C swap). Verify surviving-role tabs unchanged.
- **`useEventLoadAndGate.js` (H4, HIGH):** positive fix — `if (role==='super_admin'||role==='admin'||role==='moderator') return true;` then host-own fallback; drop WL branch + WL locals. Mirrors backend.
- **EDIT:** `CreateEventForm.js` (drop shared `WHITELABEL_ROLES` import; `skipHostSelector`→`isHostMode`), `HostSelectorStep.js`, `SubscriptionAssignmentModal.js` (host-only), `AddModeratorModal.js` (+ unused `currentUser`), `ModeratorListItem.js`, `SendNotificationModal.js` (delete the whole dead `ROLE_OPTIONS`), `EventFailureBanner.js` (plain WL-clause deletion correct), `AdminDashboardScreen.js`, `AdminMoreScreen.js`, `SignupScreen.js`, `RoleSelectionView.js`, `authStore.js`, `hooks/auth/*`, `hooks/admin/*`, `config/api.js`, `App.js`, `authSchemas.js`, `InvitationScreen.js` (strip WL branding overlay; keep portal).
- **i18n:** `{en,ar}/auth.json` + `{en,ar}/admin.json` WL blocks (incl. `stats.whitelabel.*`).
- **KEEP (decision #1 + verified):** business plan types/tabs (`discountsFormUtils.js`, `PlanListItem.js`, `PlanTabs.js`, `AdminPlansScreen` business tab — stripping desyncs from the canonical enum) + `useBusinessPlans` + `ENDPOINTS.PLANS.BUSINESS` + `hooks/plans/keys.js` business key.

---

## 2. Cross-cutting hazards & rules

- **H1 — Shared-import crash (HIGH).** `WHITELABEL_ROLES`/`isWhitelabelRole` are imported from `@halla/shared` by web `navConfig.js` (+ `ui/layout/index.js` re-export), mobile `adminPermissions.js` (+ re-export), mobile `CreateEventForm.js:21`. A named import of a deleted export throws at module load → the layout barrel throws → all dashboards down.
  **Rule (atomic):** shared exports and **all** their consumers change in **one integration change**. Do **not** build, commit, or deploy an intermediate state where shared is de-whitelabeled but a consumer still imports the symbol (or vice-versa). Equivalent safe ordering: edit consumers first, then remove the shared exports — but land them together.
- **H2 — Subscription bypass coupling (HIGH).** `subscription.js` `isPlatformAdmin = isAdminRole(role) && !whitelabelId` (×3): drop the `!whitelabelId` term **and** remove WL from `ADMIN_ROLES` in one atomic change.
- **H3 — `getWhitelabelIdFromFilter` chain (HIGH).** Deleting `whitelabel.js` removes `req.whitelabelFilter`; update every admin controller + `admin.controller.shared.js` to pass no tenant filter in the same change.
- **H4 — Moderator broadening (intended, MED).** Moderators go from fail-closed to "edit any event". Land identically on backend `_buildScopedEventQuery` and mobile `useEventLoadAndGate` (positive move, not a deletion).
- **H5/H6 (prod only):** transient data-broadening window + index-drop — N/A on the dev reset (fresh DB); see Appendix A for prod.

---

## 3. Execution (DEV path — default)

### Phase 0 — Branch hygiene (the worktree is dirty)
`git status` shows **many unrelated modified files** (marketplace, vendor signup, etc.). **Do not** sweep them into this work.
1. Review/stash/commit the existing unrelated changes first, on their own, so the working tree is clean.
2. Then branch: `git checkout -b chore/remove-whitelabel`. Keep this branch to whitelabel-only edits.

### Phase 1 — Code + schema removal (one atomic integration change, all 4 packages)
Apply §1a–§1d on the branch as a single internally-consistent change (H1 atomicity). Order the work consumers-then-shared, but commit/build as one. Includes removing the model field declarations and the full `seedTestUsers.js` rewrite. Exit gate: every app builds + lints clean (§4 commands).

### Phase 2 — Dev environment reset (NOT for production — see banner)
1. **Drop the dev database** (e.g. `mongosh <devUri> --eval 'db.dropDatabase()'`). Fresh DB → no stale `whitelabelId`/subdomain indexes, no WL docs; Mongoose rebuilds indexes from the current (whitelabel-free) schema on boot.
2. **Delete dev uploads** — local upload dir and/or the dev S3 prefix (clears WL logos under `whitelabels/logos/*`).
3. **Restart the backend** (clean boot; confirm no schema/index errors).
4. **Reseed** with the rewritten `seedTestUsers.js` + plan/reference seed (`planDefaults`, taqnyat templates, categories — whatever the seed scripts cover). Business plan docs reseed normally (catalog untouched).
5. **Verify** (§4): indexes contain no `whitelabelId`/`domain.subdomain`; smoke-test the §4 flows.

*(No backups, dry-run cascade scripts, residual-nulling, or manual index-drop scripts are needed on the dev reset. They live in Appendix A for if/when production data exists.)*

---

## 4. Verification

### 4.1 Build/lint commands (run per package — the Phase-1 exit gate)
- **Shared:** `npm --workspace shared run lint` (or the package's lint script).
- **Web (`labbe/`):** `npm run lint` **and** a production build `npm run build` (catches the H1 import-time crash that dev HMR can mask).
- **Mobile (`halla-mobile/`):** `npm run lint` **and** a bundle validation `npx expo export` (or `expo-doctor` / Metro bundle) to catch the `@halla/shared` named-import break.
- **Backend (`labbe-backend-/`):** the test suite + a startup smoke (`node` boot to "listening" with no schema/index error).
- **i18n:** JSON-parse **every** `localization/locales/**/**.json` (web + mobile) so a stripped key didn't leave invalid JSON.

### 4.2 Residual-search gate (mechanical completeness — run after Phase 1)
Repo-wide, case-insensitive search; **every surviving hit must be on the allowlist or it's a miss to fix:**
- **Allowlist (expected survivors — business plans only):** `PLAN_AVAILABILITY.WHITELABEL`, `availableFor: "whitelabel"`/`'whitelabel'`, the business-plan swagger/schema `availableFor` enum values, and `getBusinessPlans`/`useBusinessPlans`/`/plans/business` (+ business plan types `business_*`).
- **Must return ZERO (outside the allowlist):** `whitelabel_admin`, `whitelabel_moderator`, `WHITELABEL_ROLES`, `isWhitelabelRole`, `whitelabelId`, `isWhitelabel`, `manage_whitelabels`/`MANAGE_WHITELABELS`, `whitelabel-dash`, `signup-whitelabel`, `setupPassword`/`setup-password`/`passwordSetup`, `tenantScoped`, `extractTenantContext`/`validateTenant`/`req.tenant`, `domain.subdomain`, `whitelabel_registered`, `adminWhitelabels`.
- Review each survivor against the allowlist; anything else → add to §1 and re-run.

### 4.3 Authorization tests (automate the highest-risk behaviour — don't rely on manual smoke)
- super_admin / admin / **moderator** can read **and edit any** event; host can edit **only owned** events; vendor **cannot** edit events.
- moderator cannot **delete** if RBAC is edit-only (per `ROLE_PAGE_ACCESS`).
- admin roles **bypass** subscription limits; host/vendor **do not**.
- removed auth/admin routes (`/auth/signup/whitelabel`, `/admin/whitelabels*`, `/auth/setup-password`, `/auth/validate-setup-token`, `/auth/resend-setup-email`) return **404**.
- validation **rejects** `role: whitelabel_admin`/`whitelabel_moderator`.
- business-plan endpoints (`/plans/business`, `/plans/landing`) still return the expected plans; admin plan-edit opens an `availableFor:'whitelabel'` plan without 400.

### 4.4 Manual smoke (after the above pass)
Auth (host/vendor signup, login all roles, forgot→reset, logout) · admin dashboard nav/stats for super_admin/admin/moderator (no Whitelabels item, no crash) · event create/edit per role · guest RSVP portal on default branding · subscription limits.

---

## 5. Open / optional items
1. **`PLATFORM_ADMIN_ROLES`/`isPlatformAdmin`:** left untouched (already WL-free). Deleting them is a separate optional cleanup, not part of this removal.
2. **`availableFor:'whitelabel'` → `'business'` rename:** deferred to the business-account phase (enum + docs + `getBusinessPlans` in lockstep).
3. **Reserved frontend business UI** (`useBusinessPlans` web+mobile, business tab): kept as reserved code per decision #1.

---

## Appendix A — Production data-migration fallback

**Use ONLY if a production DB with real users/events exists (do not run the Phase-2 dev reset against it).** This is the original expand-contract migration, preserved:

- **A0 Pre-flight:** full DB backup; run `audit-admin-whitelabel.js` (before deleting it) to snapshot abnormal `whitelabelId != null` admin/moderator records; capture WL-user + per-collection non-null counts.
- **A1 Code deploy:** ship Phase-1 code (H2 atomic) — but **keep the model `whitelabelId` field declarations** until after the index drop (expand-contract), rather than removing them in Phase 1.
- **A2 Data migration (decision #2 — delete WL accounts & data):** a script with `--dry-run` default + `--commit`: resolve `tenantIds = whitelabel_admin _ids`; cascade-delete docs with `whitelabelId ∈ tenantIds` across the 8 collections + the child users (host/vendor/moderator scoped under them) + the WL user docs; then **null residual** `whitelabelId != null` on surviving platform admins/moderators. Do **not** touch Plan docs.
- **A3 Drop indexes (~16):** dedicated script à la `scripts/drop-subdomain-index.js` — the 5 field-level `whitelabelId` singles + the 10 explicit compounds + the `domain.subdomain` unique partial (`round2/backend-db-verification.md §5`).
- **A4 Contract:** remove the model field declarations; deploy; confirm `syncIndexes` clean.
- **Rollback:** A1 revert = redeploy previous build; A2 = restore from the A0 backup (cascade delete is forward-only).
