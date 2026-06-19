# Whitelabel Removal — Final Migration Plan

**Status:** Ready to execute · **Date:** 2026-06-19
**Inputs:** `round1/{web,mobile,backend-db,shared}-inventory.md` + `round2/{...}-verification.md` (exhaustive file-level detail lives there; this plan is the execution spec).

---

## 0. Owner decisions (locked)

1. **Business plans = KEEP, untouched.** The "هلا أعمال / Halaa Business" product (`getBusinessPlans`, `getLandingPlans`, `GET /plans/business`, `GET /plans/landing`, the 8 seeded business Plan docs, `PLAN_AVAILABILITY.WHITELABEL`, `planDefaults.js` business defs, shared `availabilityEnum "whitelabel"`, swagger `availableFor` enums) is reserved for future business accounts and is **out of scope**. We do **not** delete or retag it.
2. **Delete whitelabel accounts & their tenant data** — destructive migration: remove `whitelabel_admin` + `whitelabel_moderator` users and the hosts/events/payments/subscriptions/notifications/tickets/post-event docs scoped under them.
3. **Moderator → edit any event platform-wide** — apply consistently in backend `_buildScopedEventQuery`, mobile `useEventLoadAndGate`, and web RBAC.

## THE governing rule — two independent "whitelabel" axes

There are two unrelated things both spelled "whitelabel". **Removing one, keeping the other:**

| Axis | What it is | Disposition |
|---|---|---|
| **`whitelabelId` axis** | the multi-tenancy pointer (`User.whitelabelId` self/parent ref) + the two roles + tenant-mgmt + signup/setup | **REMOVE entirely** |
| **`availableFor: 'whitelabel'` axis** | a plan-availability *value* the **business-plans product** rides on (`PlanModel` has **no** `whitelabelId` field) | **KEEP untouched** |

`PlanModel` has no `whitelabelId`, so the data migration never touches Plan docs. The literal string `"whitelabel"` intentionally survives **only** as the business-plans availability tag (rename to `'business'` later if desired). Every other `whitelabel*` symbol is removed.

---

## 1. Scope summary (corrected counts, post-verification)

| Area | DELETE files | EDIT files | Notes |
|---|---|---|---|
| **Web** (`labbe/`) | ~43 code+i18n (+ CSS orphans in deleted trees) | ~23 | `LogoUpload.js` is dead→DELETE; `admin-dash/plans/page.js`+`CurrentPlanCard.jsx`→DELETE (WL-role-gated). `hooks/plans/*` `useBusinessPlans` **KEPT** (business). |
| **Mobile** (`halla-mobile/`) | 21 (incl. `SetupPasswordScreen`) | ~37 | `useEventLoadAndGate` needs a **positive** moderator fix. Business tab/types/cards KEPT. |
| **Backend** (`labbe-backend-/`) | 7 (+ `checkFeature` export in `rbac.js`) | ~52 | Business-plans code KEPT. setup-password fully DELETE. ~16 DB indexes to drop. |
| **Shared** (`shared/`) | 0 | 8 | `availabilityEnum "whitelabel"` member KEPT (business). `PLATFORM_ADMIN_ROLES`/`isPlatformAdmin` deleted (rec C). |

**Architecture fact that makes this safe:** there is **no `Whitelabel` model**. A whitelabel *is* a `User(role:'whitelabel_admin')`; `whitelabelId` self-references it. Every real platform record (host/vendor/admin via normal signup) carries `whitelabelId = null`, so dropping every query clause is behaviour-preserving once the abnormal non-null records are removed.

---

## 2. Cross-cutting hazards & the rules that neutralise them

These are the ways this migration could break **non-whitelabel** functionality. Each has a mandatory rule.

- **H1 — Shared-package import crash (HIGH).** `WHITELABEL_ROLES`/`isWhitelabelRole` are imported from `@halla/shared` by web `ui/layout/navConfig.js` (+ re-export `ui/layout/index.js`), mobile `utils/adminPermissions.js` (+ re-export), and mobile `components/admin-dashboard/events/CreateEventForm.js:21`. If shared deletes these exports while a consumer still imports them, the named import resolves to `undefined` and the **entire layout barrel throws → all dashboards down**.
  **Rule:** edit the consumers and delete the shared exports **in the same change** (one branch/PR per the monorepo). Never deploy shared ahead of its consumers.
- **H2 — Subscription bypass coupling (HIGH).** `subscription.js` computes `isPlatformAdmin = isAdminRole(role) && !whitelabelId` (×3). Dropping the `!whitelabelId` term, dropping `whitelabelId`, and removing WL roles from backend `ADMIN_ROLES` must be **one atomic change**. A partial edit would grant a stale role a limits-bypass.
- **H3 — `getWhitelabelIdFromFilter` chain (HIGH).** Deleting `middleware/whitelabel.js` removes `req.whitelabelFilter`; every admin controller that calls `getWhitelabelIdFromFilter(req)` must be updated to pass **no** tenant filter in the same change (hosts/moderators/vendors/payments/events controllers + `admin.controller.shared.js`).
- **H4 — Moderator scope is a deliberate broadening (MED).** Today a null-`whitelabelId` moderator is fail-closed on per-event reads/edits. Post-removal moderators **edit any event** (decision #3). This is intended; verify it lands identically on backend (`_buildScopedEventQuery`) **and** mobile (`useEventLoadAndGate.canEditEvent` → move `moderator` into the `return true` branch, do **not** just delete the WL clause or it falls to host-ownership and mobile disagrees with backend).
- **H5 — Transient data-broadening window (MED).** Between code deploy and the data migration, any abnormally-scoped (`whitelabelId != null`) admin/moderator sees platform-wide data. Acceptable for a deletion; run the data migration immediately after the code deploy.
- **H6 — DB index mismatch (MED).** ~16 `whitelabelId`/subdomain indexes must be dropped from the live DB or Mongoose `syncIndexes` errors / leaves orphans. Use a dedicated script (precedent: `scripts/drop-subdomain-index.js`).

---

## 3. Phased execution

### Phase 0 — Pre-flight (read-only, reversible)
1. `git checkout -b chore/remove-whitelabel` (single coordinated branch across all four packages).
2. **Snapshot DB** (full backup/dump).
3. Run `node scripts/audit-admin-whitelabel.js` → save output as the pre-migration record of abnormal `whitelabelId != null` admin/moderator records.
4. Capture counts (read-only): WL users; child hosts; non-null `whitelabelId` on events/payments/subscriptions/notifications/tickets/post-event/audit-logs; subscriptions pointing at WL accounts.

### Phase 1 — Code removal (one branch, all four packages, internally consistent)
Order **within** the branch (so the tree never half-compiles), then build/verify each app before merge:

**1a. Shared (`shared/`)** — see `round2/shared-verification.md §4` for the exact symbol table:
- `constants/roles.js`: drop `ROLES.WHITELABEL_ADMIN/MODERATOR`, `WHITELABEL_ROLES`, `isWhitelabelRole`, the two `ROLE_HIERARCHY` WL keys + the two WL entries in `SUPER_ADMIN`'s array, the two WL members of `ADMIN_ROLES`; **delete `PLATFORM_ADMIN_ROLES` + `isPlatformAdmin` (rec C)**. Keep `ROLES/USER_ROLES`, `ROLE_HIERARCHY`, `ADMIN_ROLES`, `isAdminRole`, `hasRoleAccess`, `getManageableRoles`.
- `constants/permissions.js`: drop `ADMIN_PAGES.WHITELABELS`, `PERMISSIONS.MANAGE_WHITELABELS`.
- `schemas/auth.js`: delete `whitelabelSignupSchema` + barrel entry + the 4 regex imports.
- `schemas/_shared.js`: delete `ARABIC_TEXT_REGEX`, `ENGLISH_TEXT_REGEX`, `LICENSE_REGEX`, `TAX_REGEX` (verified used only by the WL schema).
- `schemas/settings.js`: delete the 4 `whitelabel*` notification schemas/defaults + the WL `case`s in `getNotificationSchemaForRole`/`getNotificationDefaultsForRole` + the 2 WL members of the local `USER_ROLES`.
- `schemas/admin.js`: delete `whitelabelSubscriptionSchema` (zero importers, verified).
- `schemas/plans.js`: **KEEP `availabilityEnum "whitelabel"`** (business plans — decision #1). No change.
- `api/paths.js`: delete `auth.whitelabelSignup`, the whole `admin.whitelabels` object, and `auth.{validateSetupToken,setupPassword,resendSetupEmail}` (+ comment).
- `hooks/useEventActionGate.js`: drop the `whitelabel_admin` clause in `canManualRetry` + the `userWlId`/`eventWlId` locals. Keep host/admin/super_admin retry.
- `utils/notification.js`: drop the `whitelabel_registered` icon-map entry.

**1b. Backend (`labbe-backend-/`)** — see `round1/backend-db-inventory.md §2` + `round2/backend-db-verification.md`:
- **DELETE files:** `src/shared/middleware/whitelabel.js`; `src/modules/admin/admin.whitelabels.{service,routes,controller}.js`; `email/templates/whitelabels.js`; `scripts/createWhitelabelTestUsers.js`; `scripts/audit-admin-whitelabel.js` (after Phase 0 uses it).
- **Roles/permissions/status/plans constants:** mirror the shared edits in backend's own copies; drop `WHITELABEL_APPLICATION_STATUS` + `TICKET_SOURCE.WHITELABEL`. **KEEP `PLAN_AVAILABILITY.WHITELABEL` + the business defs in `planDefaults.js`** (decision #1).
- **Middleware:** delete `whitelabel.js`; in `auth.js` remove the `.populate("whitelabelId"…)`, `req.whitelabelId/req.tenant/req.isWhitelabel`, `extractTenantContext`, `validateTenant`; **H2** coupled edit in `subscription.js`; delete `checkFeature` from `rbac.js` (dead — verified unmounted); drop `whitelabelId` from `auditLog.js` payload; fix `middleware/index.js` exports.
- **admin module (H3):** remove the WL route mount (`admin.routes.js:23`), the `Object.assign` (`admin.controller.js:9`), the `require` (`admin.service.js:10`); rework `admin.controller.shared.js` + every admin controller (hosts/moderators/vendors/payments/events) to stop threading `getWhitelabelIdFromFilter`. **`admin.moderators.service.js`**: collapse to `{role:{$in:[MODERATOR,ADMIN]}}` with no `whitelabelId` — preserve the platform branch exactly (HIGH).
- **events:** `_buildScopedEventQuery` → remove WL roles from `tenantScoped`; ADMIN/MODERATOR drop the `whitelabelId` equality (→ **edit any event**, decision #3); keep super_admin-any + host-own. Same in `post-event.service.buildScopedEventQuery`. Drop `getAllEvents` null-skip + `_getWhitelabelHostIds`; drop `whitelabelId` from `_formatEvent` + `createEvent`. Strip WL from `events.routes` `restrictTo` lists + middleware mounts.
- **auth:** delete `signupWhitelabel`, `_notifyAdminsNewWhitelabel`, the whole setup-password block (`setupPassword`/`validateSetupToken`/`resendSetupEmail` + routes + `setupPasswordSchema`/`resendSetupEmailSchema` + `createPasswordSetupToken` + `passwordSetupToken/Expires` fields + `toJSON` deletes + `getMe`/`users.service` select mentions). **forgot-password/reset-password stay** (covers all real users — verified).
- **dashboard / notifications / payments / tickets / staff / guests / subscriptions / scheduled-reminders:** strip `whitelabelId` filters/audits + WL role branches per inventory; preserve host/admin paths. Payments: in `checkout.service.js` remove L188 `whitelabelId` on Payment.create (whitelabelId axis) but **KEEP the L46 `plan.availableFor==='whitelabel'` gate** (business axis).
- **Newly found dead code (Round 2):** `models/NotificationPreferencesModel.js` (drop WL enum members L36-37 + the 2 switch cases); `models/NotificationModel.js:46` (`WHITELABEL_REGISTERED` type); `models/TicketModel.js:137/163` (WL pre-save hook + static); `email/templates/vendors.js` dead `setupPasswordUrl` branch; `email/templates/reports.js` dead `pendingWhitelabels` block.
- **Email:** delete `whitelabels.js` template + its `index.js` registry/category/spread entries + the 4 `send.*` wrappers + `emailService.sendWhitelabelApplicationPendingEmail`.
- **Models (schema field DECLARATIONS stay until Phase 4):** in Phase 1 only stop **reading/writing** `whitelabelId` (queries/sets/populates/audits). Leave the field + index declarations in the schema for now so the live indexes aren't auto-touched mid-flight.
- **Misc:** `s3Upload.js` WL logo path key; `scheduledTasks.js` audit `whitelabelId`; `admin.shared.service.js` WL_MODERATOR subscription fallback; swagger role/`availableFor` enums — **leave `whitelabel` in `availableFor` (business)**, remove `whitelabel_admin` from role enums + the WL dashboard-analytics block + `whitelabelId` in Payment schema.
- **PLATFORM_ADMIN_ROLES (backend copy):** delete + inline to `isAdminRole`/`ADMIN_ROLES` at its consumers (`admin.events.controller.js:47`, `events.crud.service.js:921`), matching shared rec C.

**1c. Web (`labbe/`)** — see `round1/web-inventory.md` + `round2/web-verification.md`:
- **DELETE trees/files:** `app/[lang]/admin-dash/whitelabels/**`; `app/[lang]/signup-whitelabel/**`; `app/[lang]/setup-password/**`; `ui/auth/signup/whiteLabel/**` (14 files); `ui/auth/setup-password/SetupPassword.js`(+css); `ui/admin/whitelabels/ApproveWhitelabelDialog.jsx`; `ui/admin/FeatureToggle.jsx`(+css); `ui/commen/inputs/LogoUpload.js` (**dead — 0 importers**); `app/[lang]/admin-dash/plans/page.js` + `_components/CurrentPlanCard.jsx`(+css) (**WL-role-gated, no audience**); i18n `{ar,en}/adminWhitelabels.json` + `{ar,en}/setupPassword.json`.
- **navConfig.js (H1, HIGH):** drop the `@halla/shared` WL imports + re-exports (and in `ui/layout/index.js`), `DASHBOARD_TYPES.WHITELABEL`, `whitelabelNavItems`, the `whitelabels` nav item, all WL rows in `ROLE_NAV_ACCESS`/`ROLE_PAGE_ACCESS`, the `isWhitelabelRole` filter (:551), the WL branches in `getNavItems`/`canAccessPage`/`getDashboardTypeFromPath`/`getBasePath`, `PERMISSION_TO_NAV_KEY.manage_whitelabels`. **Also remove the now-dead `plans` nav/RBAC rows** (coupled with deleting the plans route). Verify super_admin/admin/moderator nav is byte-for-byte unchanged.
- **serverAuth.js / middleware.js:** strip WL roles/pages/`isWhitelabelUser`/`canAccessAdminDash` WL membership/`PROTECTED_ROUTES.whitelabel`/`whitelabel-dash` redirect/stale `/signup/whitelabel` AUTH_ROUTE.
- **EDIT (strip WL branch, keep the rest):** `HostSelector.js`, `AdminCreateEvent.jsx`, dashboard widgets (`DashboardStats/Charts/RecentActivity` + `.whitelabelGrid` CSS), `SubscriptionAssignmentPopup.jsx` (collapse to host-only), `Add/EditModeratorPopup.jsx`, login `Form.js`, landing `Header.jsx`, `Header.js`, `NotificationItem.js`, `notificationPreferencesSchemas.js` (H1 mirror), `authStore.js` (drop `isWhitelabel()` + setup-token state), `authFormHelpers.js`, `hooks/auth/mutations.js`, `hooks/admin/{queries,mutations,keys,index}.js`, `providers/index.js` (`adminWhitelabels` namespace).
- **Invitation portal (functional):** `invitation/[code]/page.jsx` + 3 Portal children — strip `event.whitelabel` theming/logo derivations; it already falls back to `DEFAULT_PRIMARY/BG` so the guest RSVP portal keeps working.
- **i18n EDIT:** strip WL blocks/keys from `signup/login/common/home-events/admin/adminDashboard/adminEvents/adminModerators` (ar+en); `landing.json` → **reword** `features.items[10]` (don't delete the array element).
- **KEEP (decision #1):** `hooks/plans/{queries,index,keys}.js` `useBusinessPlans`/`plansKeys.business` + `API_PATHS.plans.getBusinessPlans` — retained as reserved business-plans data layer even though temporarily unreferenced after the WL plans page is deleted.

**1d. Mobile (`halla-mobile/`)** — see `round1/mobile-inventory.md` + `round2/mobile-verification.md`:
- **DELETE:** screens `WhitelabelSignupScreen`, `AdminWhitelabelsScreen`, `WhitelabelDetailsScreen`, `WhitelabelPlansScreen`, `WhitelabelPlansSummaryScreen`, `SetupPasswordScreen`; dirs `components/auth/whitelabel-signup/**` (5) and `components/admin-dashboard/whitelabels/**` (8); orphaned `components/plans/BusinessPlanCard.js` + `components/plans/SummaryCards.js`.
- **Navigation:** `AppNavigator.js` (drop WL import, `WhitelabelSignup` + `SetupPassword` screens, the 2 WL switch cases — `default` already handles unknowns); `AdminNavigator.js` (drop WL screen imports/registrations + `PAGES.WHITELABELS` clause).
- **`adminPermissions.js` (H1, HIGH):** drop the shared WL imports + re-exports + `PLATFORM_ADMIN_ROLES`/`isPlatformAdmin` (rec C → swap NAV_ITEMS to `ADMIN_ROLES`); delete the 2 WL `ACCESS_MATRIX` rows + `PAGES.WHITELABELS` columns + `WHITELABELS` NAV_ITEM + `isWhitelabelAdmin` (dead) + WL entries in `isModerator`/`getRoleDisplayName`. Verify surviving-role tab exposure unchanged.
- **`useEventLoadAndGate.js` (H4, HIGH):** **positive fix** — `if (role==='super_admin'||role==='admin'||role==='moderator') return true;` then host-own fallback; drop WL branch + `userWl`/`eventWl`/`idOf(user.whitelabelId)` + WL comment block. Mirrors backend.
- **EDIT:** `CreateEventForm.js` (drop shared `WHITELABEL_ROLES` import + `skipHostSelector`→`isHostMode`), `HostSelectorStep.js` (drop WL tab + `!user?.whitelabelId` qualifier), `SubscriptionAssignmentModal.js` (host-only; hardcode `availableFor:"host"`), `AddModeratorModal.js` (+ remove now-unused `currentUser`), `ModeratorListItem.js`, `SendNotificationModal.js` (**delete the whole dead `ROLE_OPTIONS` const**), `EventFailureBanner.js` (plain WL-clause deletion is correct — moderator unaffected), `AdminDashboardScreen.js` (collapse to non-WL branch), `AdminMoreScreen.js`, `SignupScreen.js`, `RoleSelectionView.js`, `authStore.js`, `hooks/auth/*`, `hooks/admin/{queries,mutations,infinite,keys,index}.js`, `config/api.js` (drop WL + setup-password endpoints), `App.js` (drop SetupPassword link + fix Invitation comment), `authSchemas.js`, `InvitationScreen.js` (strip WL branding overlay; keep portal).
- **i18n EDIT:** `{en,ar}/auth.json` + `{en,ar}/admin.json` WL blocks (incl. `stats.whitelabel.*`); keep all non-WL keys.
- **KEEP (decision #1 + verified):** business plan **types/tabs** (`discountsFormUtils.js`, `PlanListItem.js`, `PlanTabs.js`, `AdminPlansScreen` business tab — stripping would desync from the canonical backend enum) and the `useBusinessPlans` hook + `ENDPOINTS.PLANS.BUSINESS` + `hooks/plans/keys.js` business key, as reserved business data layer.

**Phase 1 exit gate:** each app builds; lint/typecheck clean; run the app smoke paths in §4.

### Phase 2 — Data migration (immediately after the Phase-1 deploy)
Destructive (decision #2). Script must support `--dry-run` (default), print counts, require `--commit` to write, and run inside the Phase-0 backup safety net.
1. Resolve WL admin ids: `tenantIds = users.find({role:'whitelabel_admin'})._id` (+ `whitelabel_moderator` users).
2. **Cascade-delete tenant data** across the 8 collections where `whitelabelId ∈ tenantIds` (events, payments, subscriptions, notifications, tickets, posteventcontents, auditlogs) **and** the child users (`role:'host'/'vendor'/'moderator'` with `whitelabelId ∈ tenantIds`) and their dependent docs. Then delete the WL user docs themselves.
3. **Null residual abnormal records:** for any surviving doc with `whitelabelId != null` (e.g. seeded platform admin/moderator from `seedTestUsers.js`) → unset `whitelabelId`. These are platform accounts, not WL — they stay, de-scoped.
4. **Do NOT touch Plan docs** (business plans — decision #1; PlanModel has no `whitelabelId` anyway).
5. Keep the Phase-0 audit output + this script's logs as the migration record.
6. Update `scripts/seedTestUsers.js` to create platform `admin`/`moderator` with `whitelabelId` **unset** (drop L320/L335 scoping).

### Phase 3 — Drop indexes (dedicated script, ~16)
Extend the `scripts/drop-subdomain-index.js` pattern to drop (per `round2/backend-db-verification.md §5`): field-level singles on `users/payments/notifications/tickets/auditlogs`; explicit `{whitelabelId…}` compounds on `users(×1)/events(×3)/subscriptions/payments/notifications/tickets/posteventcontents/auditlogs`; and the `domain.subdomain` unique partial index on `users`. Verify with `db.<coll>.getIndexes()`.

### Phase 4 — Drop schema fields (contract step)
Remove from the Mongoose schemas: `whitelabelId` field + index declarations (8 models); `domain` subdoc + `whitelabelDataSchema` + `profile.whitelabelData` + `isWhitelabelUser`/`isAdmin` WL entries + `toPublicJSON` WL branch + optional-`whitelabelId` in statics (UserModel); the `.populate(... whitelabelId)` select token in `StaffAccessTokenModel`. Deploy; confirm `syncIndexes` is clean against the Phase-3 DB.

---

## 4. Verification checklist (proves no external functionality regressed)

Run after Phase 1 (code) and again after Phase 4. **All must pass with whitelabel gone:**

- **Auth:** host signup (mobile+OTP), vendor signup, login for super_admin/admin/moderator/host/vendor, forgot-password → reset-password (the surviving passwordless path), logout. No route references `signup-whitelabel`/`setup-password`.
- **Admin dashboard (web+mobile):** super_admin sees full nav **minus** Whitelabels; admin nav unchanged; moderator nav unchanged; dashboard stats/charts render for each (no WL branch). No layout crash (H1).
- **Events:** host creates/edits own events; admin creates-for-host; **moderator edits any event** (H4) on both web and mobile and backend agree (open the wizard + save). Event launch/retry banner works for host/admin/super_admin.
- **Admin CRUD:** hosts/vendors/moderators/payments/tickets list+detail return **all** platform records for super_admin/admin (no tenant scoping), no 403/400 on per-event admin reads.
- **Guest portal:** RSVP load/submit/confirmed/declined renders on default branding (no `event.whitelabel`).
- **Subscriptions/limits:** platform admins bypass limits; hosts are gated (H2 unchanged).
- **Business plans (decision #1):** public `GET /plans/business` + `/plans/landing` still return the business plans; admin plan edit form opens an `availableFor:'whitelabel'` plan without 400.
- **DB:** `db.users.find({role:{$in:['whitelabel_admin','whitelabel_moderator']}}).count() === 0`; no collection has `whitelabelId` after Phase 4; `getIndexes()` shows none of the 16 dropped indexes.

---

## 5. Rollback

- **Phase 1 (code):** revert the branch / redeploy previous build. No data touched.
- **Phase 2 (data):** restore from the Phase-0 backup (cascade-delete is irreversible without it) — this is why the backup + `--dry-run` are mandatory.
- **Phases 3-4:** indexes/fields are recreated by redeploying the pre-migration schema + `syncIndexes`; data already migrated stays migrated (forward-only) — restore from backup if a full revert is needed.

---

## 6. Open / review items (low-stakes, decide at execution)

1. **`PLATFORM_ADMIN_ROLES`/`isPlatformAdmin`:** plan uses **rec C** (delete shared + backend copies, inline to `ADMIN_ROLES`/`isAdminRole`; the only shared importer is mobile `adminPermissions.js`, already in scope). Fallback **A** = keep as a redundant alias (zero ripple) if you prefer minimal churn.
2. **Reserved business frontend UI:** `useBusinessPlans` (web+mobile) and the mobile business tab are kept as reserved code per decision #1. If you'd rather not carry temporarily-unreferenced frontend code, they can be deleted now and rebuilt with the future business-accounts UI — backend stays regardless. (Default: keep.)
3. **`availableFor:'whitelabel'` rename:** optional later cleanup to rename the business-plans tag to `'business'` (enum + 8 docs + `getBusinessPlans` query in lockstep). Not required now.

---

## 7. Suggested execution structure

One branch, four parallel implementation agents (web/mobile/backend/shared) constrained by the H1–H6 rules and this file, then a single integration build + the §4 verification, then Phases 2-4 run by you against a backed-up DB. The exhaustive per-file line references are in the `round1/` + `round2/` docs alongside this plan.
