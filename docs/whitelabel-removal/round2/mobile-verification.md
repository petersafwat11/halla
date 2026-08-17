# Whitelabel Removal — Round 2 Verification: MOBILE (`halla-mobile/`)

Adversarial re-check of `round1/mobile-inventory.md`. Method: global case-insensitive sweep first, diffed against the inventory's file list; every DELETE orphan-proven by grepping component **names + route-name strings** across the whole app; every HIGH/risky EDIT read at source and reconciled against backend `_buildScopedEventQuery` / shared `useEventActionGate`. All line refs below independently confirmed against current source. **No source files modified.**

---

## 1. Verdict

**YES-WITH-CORRECTIONS.** The inventory's 20 DELETE-FILE calls are all correctly orphaned, the HIGH-risk reconciliations are sound, and the SetupPassword/AppNavigator/authStore resolutions hold. The corrections are narrow: (1) the `useEventLoadAndGate` moderator edit-gate needs a **positive fix** (move `moderator` into the edit-any branch), not a naive WL-clause deletion — otherwise mobile disagrees with backend (HIGH); (2) `SendNotificationModal.ROLE_OPTIONS` is **entirely dead** (delete the whole const, not one line); (3) one missed orphan, `hooks/plans/keys.js` `business` key; (4) `EventFailureBanner.canRetry` is **over-rated** (LOW, not med-high — plain deletion is correct). I initially flagged a "business plan" cluster as missed, but **verified it stays** — business plan *types* survive backend removal (only WL-availability *docs* are deleted), so stripping them would introduce a desync bug (C1). Net: the plan is safe to execute with the C2 moderator fix folded in.

---

## 2. Confirmed correct

- **All 20 DELETE-FILE targets are truly orphaned.** Greps for each component/screen name AND each route-name string (`navigation.navigate("…")`, `name="…"`) return hits **only inside the deleted set or inside files already classified EDIT** (where the importing line is itself being stripped):
  - `WhitelabelSignup`: navigated from `SignupScreen.js:52` (EDIT, branch removed) + registered `AppNavigator.js:276` (EDIT). 
  - `AdminWhitelabelsList` / `WhitelabelDetails`: registered `AdminNavigator.js:267/273`; nav-config `AdminMoreScreen.js:39`; navigated only from `AdminWhitelabelsScreen.js:67` (itself DELETE). 
  - `WhitelabelPlans` / `WhitelabelPlansSummary`: registered `AdminNavigator.js:296/303`; nav-config `AdminMoreScreen.js:52`; navigated only from `WhitelabelPlansScreen.js:50` (itself DELETE). 
  - `components/auth/whitelabel-signup/**` (5 files): imported only by `WhitelabelSignupScreen.js`. 
  - `components/admin-dashboard/whitelabels/**` (8 files): imported only by the two deleted WL screens + each other. 
  - `components/plans/BusinessPlanCard.js`, `components/plans/SummaryCards.js`: no importer outside the deleted WL plan screens (confirmed — no other `BusinessPlanCard`/`SummaryCards` import in the tree).
- **`authStore` getters have ZERO callers.** Grep for `isWhitelabel(` / `isAdminDashboardRole(` invocations across the app → **no matches**. Trimming `isWhitelabel()` + the two WL strings in `isAdminDashboardRole()` is safe. authStore reads no `whitelabelId` (role derived purely from `user.role`) — confirmed.
- **AppNavigator switch (lines 367-389) is clean.** Dropping cases `whitelabel_admin`/`whitelabel_moderator` (375-376) leaves `super_admin`/`admin`/`moderator` → `<AdminStack/>`, and `default` surfaces an explicit "Unsupported account type" error (no silent host fall-through). Import drop (line 44) + screen drop (276) clean.
- **`EventFailureBanner.canRetry` (lines 162-169) — naive WL-clause deletion is CORRECT.** Structurally identical to shared `useEventActionGate.canManualRetry` (lines 67-75): `host-owner || admin || super_admin || (whitelabel_admin && wl-match)`. **`moderator` is in neither path today.** Removing the `whitelabel_admin` clause leaves `host-owner || admin || super_admin` — exactly the shared end-state (shared-inventory §6). No host/moderator gains or loses retry. (Contrast with `canEditEvent` — see CORRECTION #2.)
- **`CreateEventForm` vs `HostSelectorStep` lockstep contrast — confirmed exactly as inventoried.** `CreateEventForm.js:21` does `import { WHITELABEL_ROLES } from "@halla/shared/constants/roles"` (**coupled** — breaks the moment shared deletes the export). `HostSelectorStep.js:17-18` **defines `PLATFORM_ADMIN_ROLES` + `WHITELABEL_ROLES` locally** (**independent**). 
- **`SubscriptionAssignmentModal` importers = exactly 2:** `AdminHostsScreen.js` (`entityType="host"`, KEEP) + `AdminWhitelabelsScreen.js` (`entityType="whitelabel"`, DELETE). Collapse to host-only is safe; note line 93 `useAdminPlans({ availableFor: entityType })` must hardcode `"host"` after collapse.
- **i18n EDIT files** — `en/auth.json`, `ar/auth.json`, `en/admin.json`, `ar/admin.json` all confirmed to carry the WL key blocks. AR mirrors EN structurally (see §5 for exact AR key confirmation).

---

## 3. CORRECTIONS

### C1 — DO-NOT-STRIP (verified): the mobile "business plan" surface mostly STAYS; only the `useBusinessPlans` query-key is orphaned
I initially flagged the whole business-plan surface as missed-and-strip. **Verified against backend source — that was wrong; correcting to a precise conditional.** The premise "business == whitelabel, strip it" is half-true and the dangerous half would introduce a desync bug:
- **Business plan TYPES survive removal.** `labbe-backend-\src\shared\constants\plans.js` defines `BUSINESS_EVENT/QUARTERLY/ANNUAL` as first-class `PLAN_TYPES` members (lines 7-9), `PLAN_FAMILIES.BUSINESS` (16), and — decisively — `isManagedPlan`/`getPlanFamily`/`getBillingType` (lines 72-84) treat `business_*` as core, **non-whitelabel-conditional** plan logic. Shared-inventory line 119 corroborates: KEEP `planTypeEnum`/`PLAN_TYPES`, "do NOT touch." Whitelabel removal strips only `PLAN_AVAILABILITY.WHITELABEL` + the three WL-availability plan **docs** — not the type strings.
- **What this means file-by-file:**
  - **`components/admin-dashboard/discounts/discountsFormUtils.js:1-10`** — **KEEP `business_*`.** Its own comment: "Canonical plan types — must match backend `shared/constants/plans.js`." Since the backend enum keeps `business_*`, stripping the mobile mirror would **desync it from the canonical enum = a NEW bug.** My original C1 was wrong here. **No edit.**
  - **`components/admin-dashboard/plans/PlanListItem.js:14-28`** (`familyOf` business branch + `FAMILY_CONFIG.business`), **`PlanTabs.js:10`** (business tab), **`AdminPlansScreen.js:34`** (`TYPE_PREFIX_BY_TAB.business`) — after the WL **plan docs** are deleted the `business` tab simply renders empty and the branch never matches. **Cosmetically vestigial, functionally harmless — SAFE TO LEAVE.** Optional cleanup only (remove the empty tab for tidiness); NOT a required edit and NOT a correctness issue. The inventory's choice to remove only the `AdminPlansScreen` business line is therefore *acceptable*, and even that is optional.
  - **`hooks/plans/keys.js:5`** — `business: () => [...]` query-key. This one IS genuinely orphaned once `useBusinessPlans` is deleted (it was the key's only user). **Minor EDIT** — remove the key with the hook. (The only true addition to the inventory's plan-hook edits.)
  - **i18n `plans.types.business*`** (en `admin.json` 1052, 1227-1229 + AR mirror) — keep if the business tab/labels stay; remove only if the tab is removed for tidiness. Not load-bearing either way.
- **"managed" is a surviving non-WL product, distinct from whitelabel** — `components/createEvent/yourEventManagedByUsPopup.js` + `isManagedPlan` (which also includes `premium_*`) = the managed-service tier, unrelated to the WL feature. Do NOT touch.
- **False positives confirmed:** `components/plans/CurrentPlanCard.js:42` (capacity **comment** only); `components/createEvent/EventSummary.js` (no WL/business/availableFor token at all).
- **Net C1 correction:** the inventory was essentially right to leave the business surface alone. The ONE real addition is `hooks/plans/keys.js:5` (orphaned `business` key). Everything else is keep-or-optional. This conflicts with the shared inventory only on wording, not substance.

### C2 — WRONG-RESOLUTION RISK: `useEventLoadAndGate.canEditEvent` moderator needs a POSITIVE fix, not a deletion (HIGH)
`canEditEvent` (lines 130-148, refs accurate):
```
if (role === "super_admin" || role === "admin") return true;
if (whitelabel_admin || whitelabel_moderator || moderator)  return Boolean(userWl) && userWl === eventWl;
return Boolean(eventHostId) && eventHostId === userId;   // host
```
- **TODAY, a real platform `moderator` (whitelabelId=null) returns `false`** here (`Boolean(null)` is false) — i.e. a moderator currently **cannot edit ANY event** through this gate. The backend agrees today: `_buildScopedEventQuery` (events.crud.service.js:205-218) puts `MODERATOR` in `tenantScoped` and **throws 403** when `whitelabelId` is falsy. So **mobile and backend AGREE today: null-WL moderator is denied single-event edit.**
- **Backend post-removal end-state (backend-db-inventory §C/L99):** "remove WL roles from `tenantScoped`; for ADMIN/MODERATOR drop the whitelabelId equality → they see/edit ANY event; keep SUPER_ADMIN any + host own." So **moderator → edit ANY event** post-removal.
- **Therefore the correct mobile edit is to MOVE `moderator` into the `return true` branch** (alongside super_admin/admin), then delete the now-empty WL branch:
  ```
  if (role === "super_admin" || role === "admin" || role === "moderator") return true;
  return Boolean(eventHostId) && eventHostId === userId;   // host
  ```
  Plus drop the `userWl`/`eventWl` locals + the `idOf(user.whitelabelId)` usage + the WL comment block (108-128, 134, 136).
- **HIGH DISAGREEMENT if edited naively:** simply deleting the WL branch drops `moderator` into the host-ownership clause (line 147) → mobile would let a moderator edit **only events they personally host** while the backend returns **any** event → the wizard loads (backend 200) but the client gate blocks it (or vice-versa on a foreign event). Fix = the positive move above.
- **HONEST "gains access" disclosure (brief requires this):** this is a deliberate **broadening** — a platform moderator goes from "cannot edit any event" (today, both layers) to "can edit any event" (post-removal, both layers). It resolves a pre-existing inconsistency (`adminPermissions.ACCESS_MATRIX` already grants `MODERATOR.EVENTS=EDIT`, line 83, but this gate denied it). It is correct and intended per the backend end-state, but it is NOT a no-op for moderators — call it out to Peter.

### C3 — UNDER-SCOPED: `SendNotificationModal.ROLE_OPTIONS` is ENTIRELY DEAD (open-Q #7 resolved)
Read the whole file: `ROLE_OPTIONS` (lines 17-23) is **declared and never referenced** — recipient is driven by `targetUser`/`targetRole` props and the role label uses `t(\`sendNotification.roles.${targetRole}\`)` directly (line 141). Inventory said "remove line 22"; **correct action is to delete the entire `ROLE_OPTIONS` const (lines 17-23)** as dead code. Low risk either way.

### C4 — MINOR: residual unused imports after edits (flag, not blockers)
- `AddModeratorModal.js`: after removing the `isWhitelabel` branch (34-36), `currentUser` (line 33) is used only by that check → becomes unused; remove the `useAuthStore` selector too.
- `adminPermissions.js`: `isWhitelabelAdmin` (line 171) has **zero callers** (grep confirmed) and is exported in the default object (line 198) — delete the function + the export entry, don't just leave it.

---

## 4. Definitive resolutions to open questions

### Q (moderator scope) — see C2.
**Conclusion:** mobile `canEditEvent` must route `moderator` to `return true` (edit any), matching backend `_buildScopedEventQuery` post-removal. `super_admin`/`admin` unchanged (edit any). `host` unchanged (own only). `whitelabel_*` cease to exist. Moderator's access **broadens** (today denied → post-removal edit-any) — intended, flag to Peter. `EventFailureBanner.canRetry` is the opposite case: a plain deletion is correct (moderator never had retry; no change).

### Q (SetupPasswordScreen) — DELETE (conditional on backend, which strongly supports it)
Mobile evidence: the only mobile invite flow besides WL approval is `AddModeratorModal`, which sets `password` inline (no email-setup). Backend-db-inventory (§3 / open-Q1) + shared-inventory (§5) independently establish that `createPasswordSetupToken()` is minted in **only two** places — `admin.whitelabels.service.updateWhitelabelStatus` (WL approval) and `auth.controller.resendSetupEmail` (self re-mint). **No addHost/addModerator path mints a setup token.** (Note: no `docs/whitelabel-removal/round2/backend-*.md` exists yet to make this *fully* closed; the call is backend-owned but the evidence is one-directional → treat as **DELETE**.)
**Delete set (all confirmed present):**
- `screens/auth/SetupPasswordScreen.js` (whole file).
- `AppNavigator.js` — import (line 50) + `<Stack.Screen name="SetupPassword">` (line 280).
- `App.js` — `SetupPassword: "setup-password/:token"` linking entry (line 145) + the WL deep-link comment (lines ~132-139).
- `hooks/auth/_api.js` — `setupPassword` helper (+ any `resendSetupEmail`).
- `config/api.js` — `AUTH.SETUP_PASSWORD` (line 43) + `AUTH.RESEND_SETUP_EMAIL` (line 44).
- i18n — `setupPassword` block in `en/auth.json` (~1082-1098) and `ar/auth.json` (~600).
There is **no** `navigation.navigate("SetupPassword")` anywhere (only the deep-link/route registration) — the route is reachable purely via the `halla://setup-password/<token>` deep link, which dies with the WL approval email. Clean DELETE.

### Q (AppNavigator) — CONFIRMED CLEAN (see §2). Two switch-case removals + import + screen drop; `default` already error-surfaces unknown roles. `Invitation` stays (see §6 below).

### Q (adminPermissions ordering) — ORDERING HAZARD IS REAL; edit in lockstep with shared
`adminPermissions.js` **imports `WHITELABEL_ROLES` (line 15) and `isWhitelabelRole` (line 18) from `@halla/shared/constants` and RE-EXPORTS both (lines 26-27).** Shared-inventory deletes both symbols outright (not as aliases). **If shared lands first, lines 15/18 resolve to `undefined` and the re-exports export `undefined`** — `CreateEventForm.js:21` (direct shared import of `WHITELABEL_ROLES`) would also break. **Edit `adminPermissions.js` (drop lines 15,18,26,27) + `CreateEventForm.js:21` in the SAME commit as the shared deletion, or before it.** `PLATFORM_ADMIN_ROLES` (line 16) is KEPT by shared (redundant alias == `ADMIN_ROLES`), so `NAV_ITEMS` lines 144/146/152 (Vendors/Tickets/Templates) stay valid; `HostSelectorStep.js` defines its own copies (independent).
**Tab-exposure after edit — verified unchanged for the surviving roles:**
- Drop `[PAGES.WHITELABELS]` column (lines 59/73/87) + the `WHITELABELS` NAV_ITEM (149): removes the Whitelabels tab (was super-admin-only `FULL`). super_admin loses only the WL tab. ✓
- `NAV_ITEMS` Moderators (148) `[SUPER_ADMIN, ADMIN, WHITELABEL_ADMIN]` → `[SUPER_ADMIN, ADMIN]`; moderator was never in it. ✓
- `NAV_ITEMS` plans (150) `[SUPER_ADMIN, ADMIN, WHITELABEL_ADMIN, WHITELABEL_MODERATOR]` → `[SUPER_ADMIN, ADMIN]`; **moderator was never in it AND `MODERATOR.plans=NONE` (line 88)** → moderator never saw plans, unchanged. ✓
- Delete the two WL `ACCESS_MATRIX` rows (93-120), `isWhitelabelAdmin` (171, uncalled), the WL entry in `isModerator` (173), WL entries in `getRoleDisplayName` (180-181), and `WHITELABEL_ROLES` from the default export.
- **`PAGES.PLANS` alias survives** for super_admin/admin (mobile-only `plans` key, line 40) — `AdminPlansScreen` keeps resolving via `canViewPage(role, "plans")`. ✓ (open-Q #8 resolved: only `AdminPlans` remains; super_admin/admin keep plans; no role loses legitimate access.)

---

## 5. i18n AR-mirror + Invitation portal — confirmed

- **AR mirrors EN exactly** (inventory admitted the broad grep undercounts AR; verified by reading AR keys directly):
  - `ar/auth.json`: `businessRole`/`businessRoleDescription` (66-67), `whiteLabel` block (344), `setupPassword` block (600). ✓ matches inventory.
  - `ar/admin.json`: `whitelabel` plans-availability (89), `roles.whitelabel_moderator`/`whitelabel_admin` (282-283), `availableFor.whitelabel` (607), `whitelabelDetails` block (877), `whitelabels` block (936), `more.whitelabels` (1312), role-plural `whitelabel_admin` (1375). ✓ matches inventory. **Plus** the `stats.whitelabel.*` namespace mirror (consumed by `AdminDashboardScreen`).
  - **i18n `plans.types.business*`** (en 1052, 1227-1229 + AR mirror): only optional (tied to the cosmetic business-tab cleanup, C1) — **not** a required WL edit. Keep unless the empty business tab is also removed.
- **`AdminDashboardScreen.js` (lines 43-44, 49-82, 136, 168)** — confirmed: local `isWhitelabelRole` drives an alternate stats-card set + `stats.whitelabel.*` keys + a chart-layout branch. EDIT classification accurate; collapse to the non-WL branch.
- **`InvitationScreen` is NOT whitelabel-only — EDIT, keep.** Registered in **all four stacks** (`AppNavigator.js:284/305/326/342` = Auth/Host/Vendor/Admin) + deep link `App.js:157` (`invitation/:code`). `event.whitelabel` (lines 36-49) is **optional branding only** (brandColor/accentColor/logoUri) with `FALLBACK_*` constants (17-19) for non-WL events. Strip the `event.whitelabel` source → fall back to `event.eventDetails.primaryColor`/`FALLBACK_*`; fix the "Whitelabel guest portal" comment in `App.js`. Inventory open-Q #6 confirmed.

### Full file-set reconciliation (sweep vs inventory)
Global case-insensitive sweep = 55 files on `whitelabel|white-label|WhiteLabel|setup-password|setupPassword|WHITELABEL_ROLES|isWhitelabelRole|PLATFORM_ADMIN_ROLES`, + 12 on `whitelabelId`, + the business-plan grep. Every file resolves to: (a) in the inventory's 59, or (b) a business-plan vestige in C1, or (c) a false positive. **False positives confirmed:** `components/createEvent/EventSummary.js` (no WL/business token — matched a stale broad grep only), `components/plans/CurrentPlanCard.js` (capacity **comment** only). **No DELETE-FILE was missed.** All 12 `whitelabelId` hits ⊆ inventory. All WL route-name strings ⊆ deleted/edited set (§2).

---

## 6. Corrected DELETE / EDIT counts

- **DELETE-FILE: 20 — UNCHANGED.** All independently orphan-proven (5 WL screens + `components/auth/whitelabel-signup/**` ×5 + `components/admin-dashboard/whitelabels/**` ×8 + `components/plans/BusinessPlanCard.js` + `components/plans/SummaryCards.js`).
- **INVESTIGATE → resolved to DELETE: `SetupPasswordScreen.js`** (conditional on backend, which one-directionally supports it; see §4). So effective DELETE-FILE for the screen = **21** once SetupPassword is folded in (the inventory already pre-counted its cascade as conditional).
- **EDIT-FILE: 38 → 39** (+1 genuinely-missed file; the business-plan cluster does NOT count — see C1):
  1. **`hooks/plans/keys.js`** — orphaned `business` query-key (line 5), dies with `useBusinessPlans`. The only real addition.
  - **NOT added (C1 corrected):** `PlanListItem.js`, `PlanTabs.js`, `discountsFormUtils.js`, and `plans.types.business*` i18n — business plan **types survive** backend removal, so these stay (stripping `discountsFormUtils` would desync from the canonical enum = a new bug). At most an optional cosmetic removal of the empty `business` tab; not required.
  - Plus two **scope corrections** within already-listed EDIT files: `SendNotificationModal.js` (delete the whole dead `ROLE_OPTIONS` const, not just one line — C3); `useEventLoadAndGate.js` (positive moderator fix, not a deletion — C2).
- **HIGH-risk count holds at 2 truly load-bearing:** `useEventLoadAndGate.canEditEvent` (C2 — needs the positive moderator fix to avoid mobile/backend disagreement) and `adminPermissions.js` (ordering lockstep with shared `WHITELABEL_ROLES`/`isWhitelabelRole` deletion). `EventFailureBanner.canRetry` is **downgraded to LOW** — verified structurally identical to shared gate, plain WL-clause deletion is correct, moderator unaffected (inventory had it med-high).

---

*End of mobile-verification.md — verdict: YES-WITH-CORRECTIONS. 20 DELETE confirmed (+1 conditional SetupPassword), 38→43 EDIT, business-plan vestige cluster + dead `ROLE_OPTIONS` newly surfaced, moderator edit-gate needs a positive fix. No source files modified.*
