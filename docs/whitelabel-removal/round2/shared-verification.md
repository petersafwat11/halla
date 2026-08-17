# Round 2 — Shared Contracts Verification (`@halla/shared`)

**Scope verified:** `D:\halla\shared\src\` (constants, schemas, api/paths, hooks, utils). Importers independently re-grepped across the **entire monorepo** (`labbe/`, `halla-mobile/`, `labbe-backend-/`). Read-only; no source files modified.

---

## 1. Verdict

**YES — with one material correction.**

Round 1's symbol classifications (KEEP / EDIT / DELETE), line numbers, and 10-file scope are **all accurate**. Every DELETE symbol's importer list was independently confirmed. The single correction is the **`PLATFORM_ADMIN_ROLES` / `isPlatformAdmin` importer count** — Round 1 over-counted by **misattributing app-local `const` definitions as imports of the shared symbol**. This correction makes the disposition *easier*, not harder (see §5).

---

## 2. Confirmed correct (independently re-verified)

- **Every line number** in Round 1's tables matches the current source (roles.js, permissions.js, auth.js, settings.js, admin.js, plans.js, _shared.js, paths.js, useEventActionGate.js, notification.js).
- **The 4 regex helpers (`ARABIC_TEXT_REGEX`, `ENGLISH_TEXT_REGEX`, `LICENSE_REGEX`, `TAX_REGEX`) are used ONLY by the whitelabel signup schema.** Whole-monorepo grep returns **zero** consumers outside `_shared.js` (definitions) and `auth.js` (the import block L12–15 + the WL schema usages L289/294/301/306). Nothing reaches them via the `schemas._primitives.*` barrel namespace either. **Safe to delete with the schema.** (Round 1's strongest claim — verified.)
- **`whitelabelSubscriptionSchema` (admin.js:75) has ZERO importers** anywhere — no direct import, no `schemas.admin.whitelabelSubscriptionSchema` namespace access. Byte-identical to `hostSubscriptionSchema`. **Confirmed dead — safe to delete.**
- **`whitelabelSignupSchema`** importers = web `ui/auth/signup/whiteLabel/WhiteLabelForm.js:12` + mobile `utils/schemas/authSchemas.js:14` (→ `WhitelabelSignupScreen.js`). Matches Round 1.
- **`WHITELABEL_ROLES` / `isWhitelabelRole` (shared)** importers = web `ui/layout/navConfig.js` (+ re-export `ui/layout/index.js`; usage navConfig:551) and mobile `utils/adminPermissions.js` (re-export) + mobile `components/admin-dashboard/events/CreateEventForm.js:21` (direct, used L67–68). All other "isWhitelabelRole" hits are **app-local definitions** (web `DashboardStats.jsx`, `DashboardCharts.jsx`, `middleware.js`, `serverAuth.js`; backend's own `roles.js`/`whitelabel.js`; mobile `AdminDashboardScreen.js`, `HostSelectorStep.js`). Matches Round 1.
- **`MANAGE_WHITELABELS` / `ADMIN_PAGES.WHITELABELS` (shared)** — no app imports the shared identifiers. Web `navConfig.js:518` uses the bare string `"manage_whitelabels"` as a map key (not the shared symbol); mobile `PAGES.WHITELABELS` resolves through mobile's own `PAGES` (`{...ADMIN_PAGES, PLANS}`); backend uses its own copies. Shared-key removal is low-ripple. Matches Round 1.
- **Settings WL schemas** (`whitelabelAppNotificationsSchema`, `whitelabelEmailNotificationsSchema`, `whitelabelNotificationPreferencesSchema`, `whitelabelNotificationDefaults`) — sole importer is web `utils/schemas/notificationPreferencesSchemas.js`. Matches Round 1.
- **`useEventActionGate` importers** — web `components/event-detail/EventFailureBanner.jsx` (only consumer of `canManualRetry`), `PartialFailureBanner.jsx`, `ui/host/events/EventActionsHeader.jsx`; mobile `screens/common/update-event/useEventLoadAndGate.js`, `components/home/{PartialFailureBanner,LastEvent,EventActionsHeader}.js`. Matches Round 1.
- **Complete 10-file scope.** A directory-wide case-insensitive grep of `D:\halla\shared` for `whitelabel|tenant` returns hits in **only** the 10 files Round 1 catalogued. The other 25 shared source files (errors/*, transport.js, events.js, tickets.js, vendor.js, post-event.js, marketplace.js, eventStatus.js, ticketConstants.js, plans-constant, media.js, useDebounce.js, locale.js, xlsx.js, formatTemplateDate.js, resolveTaqnyatPlaceholders.js) have **zero** whitelabel content. **`tenant` appears nowhere in shared.** Nothing missed.

---

## 3. CORRECTIONS

### C1 (MATERIAL) — `PLATFORM_ADMIN_ROLES` / `isPlatformAdmin`: Round 1 over-counted importers by misattribution

Round 1 (risk #1, open Q1, disposition table) claims **5 importers** of `PLATFORM_ADMIN_ROLES` / `isPlatformAdmin`: *"backend subscription.js + events svc/controller, web HostSelector, mobile adminPermissions.js + HostSelectorStep."*

**Independent grep proves only ONE of these imports the shared symbol.** The rest define their own local `const` or use the backend's own `roles.js`:

| Claimed importer | Reality (file:line) | Imports `@halla/shared`? |
|---|---|---|
| mobile `adminPermissions.js` | import L16 (`PLATFORM_ADMIN_ROLES`), L19 (`isPlatformAdmin`); **used** in `NAV_ITEMS` L144/146/152; re-exported L26/27 | **YES — the only one** |
| web `HostSelector.js` | **L16: `const PLATFORM_ADMIN_ROLES = ["super_admin","admin","moderator"];`** — local; `isPlatformAdmin` is a local computed `const` (L38) | **NO** |
| mobile `HostSelectorStep.js` | **L17: `const PLATFORM_ADMIN_ROLES = ['super_admin','admin','moderator'];`** — local; `isPlatformAdmin` local (L23) | **NO** |
| backend `subscription.js` | `isPlatformAdmin` computed inline `isAdminRole(role) && !whitelabelId` (L24/101/156) | **NO** (backend's own helpers) |
| backend `events.crud.service.js` | `require("../../shared/constants/roles")` (L920) → **backend's own** roles.js | **NO** |
| backend `admin.events.controller.js` | `require('../../shared/constants/roles')` (L12) → **backend's own** roles.js | **NO** |

**Corrected facts:**
- **Shared `PLATFORM_ADMIN_ROLES`: exactly 1 real importer** — mobile `adminPermissions.js`.
- **Shared `isPlatformAdmin`: 0 functional consumers** — it is imported into `adminPermissions.js` only to be passed through in a re-export (L27) that **no mobile file consumes**. It is effectively dead.
- Backend has its **own** `roles.js` (`labbe-backend-/src/shared/constants/roles.js:67,88,115,118`) defining + exporting `PLATFORM_ADMIN_ROLES`/`isPlatformAdmin`. The backend NEVER imports `@halla/shared` for roles. The same alias-vs-delete decision must be made there independently (backend agent owns it).

This is the only correction. It does not change any KEEP/EDIT/DELETE verdict except to unlock recommendation **C** for `PLATFORM_ADMIN_ROLES`/`isPlatformAdmin` at trivial cost (§5).

### C2 (clarification, not a defect) — two task questions Round 1 left implicit

- **setup-password schema:** There is **NO setup-password Zod schema in `@halla/shared`.** Shared owns only the three path strings (`paths.js` L49 `validateSetupToken`, L50 `setupPassword`, L51 `resendSetupEmail`). The actual `setupPasswordSchema` lives in **backend** (`auth.validation.js`). So in the shared layer there is nothing to delete beyond the 3 path lines + the `// Password Setup (Whitelabel)` comment (L48). They are **whitelabel-only and DELETE-able** — confirmed: `createPasswordSetupToken()` is minted in exactly two backend places, `admin.whitelabels.service.js:183` (WL approval, being deleted) and `auth.controller.js:593` (`resendSetupEmail` self-re-mint of the same flow). No addHost/addModerator path mints a setup token.
- **`availabilityEnum "whitelabel"` is NOT a pure code change — it needs a DB migration.** Backend `planDefaults.js` seeds **three** Plan docs with `availableFor: PLAN_AVAILABILITY.WHITELABEL` (L210, L289, L305 = business event/quarterly/annual). These persist in the Mongo `Plan` collection. Shared `availabilityEnum` feeds `createPlanSchema.availableFor` (plans.js:133) — the admin plan create/**edit** form. If the enum drops `"whitelabel"` while such docs still exist, opening any one in the admin edit form 400s. **Strip the enum member only after the backend/DB migration deletes or re-points those 3 plan docs** (backend inventory §6 step 4 already plans this). Matches Round 1's DB/DATA flag.

---

## 4. DEFINITIVE corrected exported-symbol disposition table

Legend: **KEEP** = no change · **EDIT** = symbol stays, WL parts stripped · **DELETE** = export/member removed.
"Shared importers" lists ONLY files that import the symbol **from `@halla/shared`** (app-local re-definitions are noted, not counted).

| Symbol | File | Disposition | Shared importers (web / mobile / backend) | Coordinated edit required |
|---|---|---|---|---|
| `ROLES.WHITELABEL_ADMIN` / `WHITELABEL_MODERATOR` | constants/roles.js | **DELETE** (members, L12–13) | Consumed transitively via `WHITELABEL_ROLES`/`ADMIN_ROLES`/`ROLE_HIERARCHY`. No app reads `ROLES.WHITELABEL_*` from shared directly. | Remove 2 enum members. |
| `WHITELABEL_ROLES` | constants/roles.js | **DELETE** (L58–61) | web `navConfig.js` (+re-export `ui/layout/index.js`); mobile `adminPermissions.js` (re-export), `CreateEventForm.js` (direct). Backend uses own copy. | Delete export; web+mobile drop import/re-export/usage in lockstep. |
| `isWhitelabelRole` | constants/roles.js | **DELETE** (L70) | web `navConfig.js` (+re-export; usage :551); mobile `adminPermissions.js` (re-export). Backend uses own copy. | Delete export; consumers drop the WL nav-filter branch. |
| `ROLE_HIERARCHY` | constants/roles.js | **EDIT** (L26–48) | web, mobile, backend (role helpers) | Drop keys `[WHITELABEL_ADMIN]` (L38–43) + `[WHITELABEL_MODERATOR]` (L44) **and** the 2 WL entries inside SUPER_ADMIN's array (L30–31). **No-break:** ADMIN/MODERATOR/HOST/VENDOR/GUEST keys + entries untouched → `hasRoleAccess`/`getManageableRoles` identical for surviving roles. |
| `ADMIN_ROLES` | constants/roles.js | **EDIT** (L50–56) | web, mobile (`adminPermissions.js`), backend | Drop the 2 WL members (L54–55) → `[super_admin, admin, moderator]`. **No-break:** becomes value-identical to `PLATFORM_ADMIN_ROLES`; mobile NAV_ITEMS that split on the two sets now resolve to the same set → nav visibility for surviving roles unchanged. |
| `PLATFORM_ADMIN_ROLES` | constants/roles.js | **DELETE (recommended C)** — fallback **KEEP** (L63–67) | **mobile `adminPermissions.js` ONLY** (import :16, used NAV_ITEMS :144/146/152, re-export :26). NOT web HostSelector / mobile HostSelectorStep (both local consts) / backend (own copy). | See §5. If C: migrate the 1 mobile file to `ADMIN_ROLES`. |
| `isPlatformAdmin` | constants/roles.js | **DELETE (recommended)** — fallback KEEP (L71) | **0 functional consumers** — only an unconsumed passthrough re-export in mobile `adminPermissions.js:27`. | If C/delete: remove import :19 + re-export :27 in `adminPermissions.js`. Backend keeps its own. |
| `ROLES`/`USER_ROLES`, `isAdminRole`, `hasRoleAccess`, `getManageableRoles` | constants/roles.js | **KEEP** | all | ROLES edits members only (above). |
| `ADMIN_PAGES.WHITELABELS` | constants/permissions.js | **DELETE** (key, L21) | none (no app imports the shared key) | Remove key. App-local matrices (web `serverAuth.js`, mobile `adminPermissions.js`, backend `permissions.js`) owned by those agents. |
| `PERMISSIONS.MANAGE_WHITELABELS` | constants/permissions.js | **DELETE** (key, L44) | none (web :518 uses bare string; backend own copy) | Remove key. |
| `whitelabelSignupSchema` + `authSchemas.whitelabelSignup` | schemas/auth.js | **DELETE** (L282–363; barrel L447) | web `WhiteLabelForm.js`; mobile `authSchemas.js`→`WhitelabelSignupScreen.js` | Delete factory + barrel line + the `ARABIC/ENGLISH/LICENSE/TAX_REGEX` imports (L12–15). |
| `ARABIC_TEXT_REGEX`, `ENGLISH_TEXT_REGEX`, `LICENSE_REGEX`, `TAX_REGEX` | schemas/_shared.js | **DELETE** (L33–43) | **none** (verified: only `auth.js` WL schema) | Delete the 4 exports + their comments. No app imports them directly. |
| `whitelabelAppNotificationsSchema` / `whitelabelEmailNotificationsSchema` / `whitelabelNotificationPreferencesSchema` / `whitelabelNotificationDefaults` | schemas/settings.js | **DELETE** (L277–304, L367–381) | web `notificationPreferencesSchemas.js` | Delete exports; web drops the re-exports + WL config block. |
| `getNotificationSchemaForRole` / `getNotificationDefaultsForRole` | schemas/settings.js | **EDIT** (L320–336 / L383–399) | web `NotificationPreferences.js` (via web re-export) | Remove the `WHITELABEL_ADMIN`/`WHITELABEL_MODERATOR` `case` (L326–328 / L389–391). **No-break:** admin/host/super_admin/moderator cases unchanged; WL roles won't exist to hit `default`. |
| `USER_ROLES` (local dup) | schemas/settings.js | **EDIT** (L309–318) | local-only | Drop the 2 WL keys (L313–314). |
| `whitelabelSubscriptionSchema` | schemas/admin.js | **DELETE** (L75–78) | **none** (verified zero importers) | Delete export. Does NOT affect `hostSubscriptionSchema`/`subscriptionAssignmentSchema`/`addModeratorSchema`/`editModeratorSchema` (web still needs those — they carry no WL role enum). |
| `availabilityEnum` `"whitelabel"` member | schemas/plans.js | **EDIT** (member, L46) | backend mirror; feeds `createPlanSchema.availableFor` (L133) | **DB/DATA:** strip the member ONLY after backend deletes/re-points the 3 seeded WL Plan docs (`planDefaults.js` L210/289/305). Otherwise admin edit form rejects existing WL plans. |
| `API_PATHS.auth.whitelabelSignup` | api/paths.js | **DELETE** (L32) | web `hooks/auth/mutations.js:169`; mobile `config/api.js:26` | Delete path line. |
| `API_PATHS.admin.whitelabels.*` | api/paths.js | **DELETE** (L418–428 sub-object) | web `admin-dash/whitelabels/**` + admin hooks; mobile `config/api.js` ADMIN.WHITELABELS + admin hooks | Delete the whole `whitelabels` object. |
| `API_PATHS.auth.validateSetupToken` / `setupPassword` / `resendSetupEmail` | api/paths.js | **DELETE** (L49–51 + comment L48) | web `setup-password/**` + `hooks/auth/mutations.js`; mobile `config/api.js` AUTH.SETUP_PASSWORD/RESEND_SETUP_EMAIL + `hooks/auth/_api.js` | Whitelabel-only (confirmed). **No setup-password Zod schema in shared** — only these 3 path strings. |
| `useEventActionGate` (`canManualRetry` WL branch) | hooks/useEventActionGate.js | **EDIT** (clause L72–75; locals L63–64; JSDoc L12,16) | web `EventFailureBanner.jsx` (consumes `canManualRetry`); mobile `useEventLoadAndGate.js` | Drop the `whitelabel_admin` clause + `userWlId`/`eventWlId` locals. **No-break:** result = `isFailed && (host-owner ‖ admin ‖ super_admin)` — those paths preserved. |
| `getNotificationIcon` (`whitelabel_registered` map entry) | utils/notification.js | **EDIT** (entry L60) | web + mobile notification rendering (via `getNotificationIcon`) | Delete the one map entry; unknown types already fall back to `"bell"`. Confirm backend stops emitting the type. |

### Barrel ripple (verified)
- `src/index.js` re-exports `constants` (→ `WHITELABEL_ROLES`, `isWhitelabelRole`, `PLATFORM_ADMIN_ROLES`, `isPlatformAdmin`, `MANAGE_WHITELABELS`, `WHITELABELS` are all reachable as `constants.*`), `api`, `utils`, `errors`. **`schemas` and `hooks` are NOT on the top-level barrel** — consumers import them via subpath (`@halla/shared/schemas/auth`, `@halla/shared/hooks/useEventActionGate`) or the `schemas/index.js` namespace. So deleting schema/hook symbols cannot break a `@halla/shared`-root import.
- `schemas/index.js` namespace exposure (`schemas.auth.*`, `schemas.admin.*`, `schemas.settings.*`, `schemas._primitives.*`) — re-grepped: no call site reaches any deleted WL schema via the namespace path. Safe.

---

## 5. PLATFORM_ADMIN_ROLES recommendation: **C (delete + migrate the single importer)**

**Recommendation: C** — delete `PLATFORM_ADMIN_ROLES` and `isPlatformAdmin` from `shared/src/constants/roles.js`, migrate the one real importer to `ADMIN_ROLES`.

**Why C (not A, not B):**
- The user's goal is to remove whitelabel **entirely**; the brief explicitly lists `PLATFORM_ADMIN_ROLES` as a whitelabel-coupled helper ("defined in opposition to whitelabel"). Leaving a now-redundant, WL-rationale symbol behind is residue.
- Round 1 rejected C because it looked like a 5-app migration. **That premise is wrong (C1):** the shared symbol has **1** importer, and that file (`adminPermissions.js`) is *already* being edited for WL removal. So C costs **one extra line-swap in a file already in scope** — not a cross-app migration.
- `isPlatformAdmin` is **dead** in the shared layer (0 consumers) → it should be removed regardless of the A/C choice.
- **B (alias `export const PLATFORM_ADMIN_ROLES = ADMIN_ROLES;`) is the worst option:** it still edits shared, still leaves a redundant WL-named symbol, and introduces a by-reference-identity subtlety for zero benefit. Reject B.

**No-break proof:** after the `ADMIN_ROLES` EDIT, `ADMIN_ROLES === [super_admin, admin, moderator]`, which is exactly the old `PLATFORM_ADMIN_ROLES` value. Swapping the reference is value-preserving; mobile's NAV_ITEMS that previously distinguished the two sets now use one identical set → nav visibility for super_admin/admin/moderator is unchanged.

**Exact edits for C:**

*Shared* (`shared/src/constants/roles.js`):
- Delete `PLATFORM_ADMIN_ROLES` (L63–67) and `isPlatformAdmin` (L71).

*Mobile* (`halla-mobile/utils/adminPermissions.js` — already a WL-edit target):
- Import block (L12–24): remove `PLATFORM_ADMIN_ROLES` (L16) and `isPlatformAdmin` (L19).
- Re-export L26: drop `PLATFORM_ADMIN_ROLES` → `export { ROLES, ADMIN_ROLES };`
- Re-export L27: drop `isPlatformAdmin` → `export { isAdminRole, hasRoleAccess, getManageableRoles };` (also drops `isWhitelabelRole`, already a WL deletion).
- `NAV_ITEMS` L144 (Vendors), L146 (Tickets), L152 (Templates): replace `requiredRoles: PLATFORM_ADMIN_ROLES` → `requiredRoles: ADMIN_ROLES`.

*Backend* (separate copy — backend agent's edit, same decision): `labbe-backend-/src/shared/constants/roles.js` defines its own `PLATFORM_ADMIN_ROLES` (L67) + `isPlatformAdmin` (L88), exported L115/118. Its consumers (`admin.events.controller.js:47`, `events.crud.service.js:921`, and the inline `isAdminRole(role) && !whitelabelId` in `subscription.js`/`events.controller.js`) collapse to `isAdminRole`/`ADMIN_ROLES` once WL roles leave the backend `ADMIN_ROLES`. Coordinate the identical delete-and-inline there.

**Fallback (A — KEEP both as-is):** zero-ripple and fully defensible if synthesis prefers minimal churn. If A is chosen, still delete the dead `isPlatformAdmin` re-export passthrough in `adminPermissions.js:27` (or leave it — harmless). A leaves `PLATFORM_ADMIN_ROLES` as a redundant alias-by-value of `ADMIN_ROLES`; functionally inert, semantically stale.

---

## 6. Independent sweep result

A whole-`shared` case-insensitive grep for `whitelabel|tenant` reconciles **100%** to the 10 files in Round 1's table. `tenant`/`tenantId` appears **nowhere** in shared (the mechanism is named "whitelabel" only). **No symbol, importer, or file was missed by Round 1.** The sole correction is the `PLATFORM_ADMIN_ROLES`/`isPlatformAdmin` importer misattribution in §3/C1.

*End of shared-verification.md — verdict: yes-with-corrections (1 material). No source files modified.*
