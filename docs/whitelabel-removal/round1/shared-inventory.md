# Round 1 — Shared Contracts Inventory (`@halla/shared`)

**Scope:** `D:\halla\shared\` only (the `@halla/shared` package consumed by web `labbe/`, mobile `halla-mobile/`, and backend `labbe-backend-/`).
**Mission:** Exhaustive inventory of every whitelabel-related code path so the feature can be removed.
**Rule:** No source files modified — this markdown is the only output.

---

## 1. Summary

| Metric | Count |
|---|---|
| Files in `shared/src` with whitelabel hits | **10** |
| **DELETE-FILE** | **0** (no shared file is whitelabel-only) |
| **EDIT-FILE** | **8** |
| **INVESTIGATE** | **1** (`api/paths.js` setup-password block — backend-owned) |
| **DB/DATA** | **0** direct (shared has no models; `whitelabelId` appears only in a hook's input doc shape) |

**Files touched (all EDIT-FILE except as noted):**
1. `shared/src/constants/roles.js`
2. `shared/src/constants/permissions.js`
3. `shared/src/schemas/auth.js`
4. `shared/src/schemas/settings.js`
5. `shared/src/schemas/admin.js`
6. `shared/src/schemas/plans.js`
7. `shared/src/schemas/_shared.js`
8. `shared/src/api/paths.js` (contains the INVESTIGATE block)
9. `shared/src/hooks/useEventActionGate.js`
10. `shared/src/utils/notification.js`

### Top risks
1. **`PLATFORM_ADMIN_ROLES` is the single highest-ripple symbol.** It is imported by backend middleware (`subscription.js`), backend events service/controller, web `HostSelector`, mobile `adminPermissions.js` + `HostSelectorStep`. Once whitelabel roles are gone it becomes **value-identical to `ADMIN_ROLES`** (`[super_admin, admin, moderator]`). Removing it breaks all those importers; keeping it is dead-but-harmless. **Open question — keep as alias vs. delete and migrate all importers to `ADMIN_ROLES`.** Cannot be deleted in the shared layer without a coordinated edit across web+mobile+backend.
2. **`ROLE_HIERARCHY` and `ADMIN_ROLES` must SURVIVE in edited form** (strip the two whitelabel members + the two whitelabel hierarchy keys). They are core auth primitives mirrored from backend; a careless delete here breaks every role check in all three apps.
3. **`useEventActionGate.js` has a whitelabel branch inside live RBAC logic** (`canManualRetry`). Editing the branch must NOT drop the host/admin/super_admin retry paths — those are non-whitelabel functionality used by mobile EventDetails/LastEvent/SingleEventStats and web host single-event.
4. **`_shared.js` exports 4 primitive regexes used ONLY by the whitelabel signup schema** (`ARABIC_TEXT_REGEX`, `ENGLISH_TEXT_REGEX`, `LICENSE_REGEX`, `TAX_REGEX`). Verified: no other consumer in the entire repo. Safe to delete *with* the schema, but they are public exports — coordinate so no app imports them directly later.
5. **`availabilityEnum` in `plans.js` contains a `"whitelabel"` member.** It is a backend-mirrored plan-availability enum (`["host","whitelabel","platform_admin"]`). Removing the member is a **DB/DATA-adjacent** change: existing Plan documents may have `availableFor: "whitelabel"`. Strip the enum member only after backend confirms no live plan uses it (Round 2 / backend agent).
6. **`setup-password` path family** (`validateSetupToken`, `setupPassword`, `resendSetupEmail` in `paths.js`) is labelled "Whitelabel" and backend evidence shows the setup-token is minted **only** by whitelabel approval — but the final keep/delete call is backend-owned. Classified INVESTIGATE per brief.

---

## 2. Constants — roles (`shared/src/constants/roles.js`) — EDIT-FILE

This file is the frontend mirror of `labbe-backend-/src/shared/constants/roles.js`. **It is core auth; it survives, heavily edited.** Re-exported wholesale via `constants/index.js` (`export * from "./roles.js"`) and surfaced on the top-level barrel as `constants.*` (`src/index.js`). Every app imports role symbols from here.

### PURELY whitelabel → DELETE these symbols
| Symbol | Lines | Action |
|---|---|---|
| `ROLES.WHITELABEL_ADMIN` enum member | 12 | Remove key |
| `ROLES.WHITELABEL_MODERATOR` enum member | 13 | Remove key |
| `WHITELABEL_ROLES` export | 58–61 | **Delete export** |
| `isWhitelabelRole` export | 70 | **Delete export** |
| `ROLE_HIERARCHY[WHITELABEL_ADMIN]` key + its array | 38–43 | Remove key |
| `ROLE_HIERARCHY[WHITELABEL_MODERATOR]` key | 44 | Remove key |
| `ROLES.WHITELABEL_*` refs inside `SUPER_ADMIN`'s hierarchy array | 30–31 | Remove the two lines |
| `ROLES.WHITELABEL_*` refs inside `ADMIN_ROLES` | 54–55 | Remove the two lines |

### REFERENCES whitelabel but must SURVIVE (edit, don't delete)
| Symbol | Lines | What to keep / change |
|---|---|---|
| `ROLES` / `USER_ROLES` | 8–20 | Keep; only drop the 2 whitelabel members |
| `ROLE_HIERARCHY` | 26–48 | Keep; drop whitelabel keys + whitelabel entries in `SUPER_ADMIN` |
| `ADMIN_ROLES` | 50–56 | Keep; drop the 2 whitelabel members → becomes `[super_admin, admin, moderator]` |
| `PLATFORM_ADMIN_ROLES` | 63–67 | **Survives but becomes redundant** (== `ADMIN_ROLES` after edit). See risk #1 / open question. Do NOT delete in this layer without coordinating importers. |
| `isPlatformAdmin` | 71 | Keep (depends on `PLATFORM_ADMIN_ROLES`); redundant-but-harmless |
| `isAdminRole`, `hasRoleAccess`, `getManageableRoles` | 69, 73–78 | Keep unchanged |

> Note: `ROLES` is `Object.freeze`d — deleting members is a source edit, fine. No computed access to the deleted members exists in shared.

---

## 3. Constants — permissions (`shared/src/constants/permissions.js`) — EDIT-FILE

Mirror of backend `permissions.js`. Re-exported via `constants/index.js`. **Survives, edited.**

| Symbol | Line | Action | Notes |
|---|---|---|---|
| `ADMIN_PAGES.WHITELABELS: "whitelabels"` | 21 | **Delete the key** | Page key for the whitelabel tenant-management page (web/mobile nav). |
| `PERMISSIONS.MANAGE_WHITELABELS: "manage_whitelabels"` | 44 | **Delete the key** | The whitelabel-only permission. |
| `ADMIN_PAGES` (rest), `ACCESS_LEVELS`, `PERMISSIONS` (rest) | — | **Keep** | Non-whitelabel page/permission keys. |

`ROLE_PAGE_ACCESS` is **NOT** defined here yet (header comment says it still lives per-app pending unification) — so the whitelabel access-matrix rows are owned by web/mobile inventories, not shared.

---

## 4. Schemas

### 4a. `shared/src/schemas/auth.js` — EDIT-FILE
| Symbol | Lines | Action | Downstream importers |
|---|---|---|---|
| `whitelabelSignupSchema` (export) | 282–363 | **Delete export + entire factory** | web `labbe/ui/auth/signup/whiteLabel/WhiteLabelForm.js`, web `labbe/utils/schemas/authSchemas.js` (re-export); mobile `halla-mobile/utils/schemas/authSchemas.js` → `WhitelabelSignupScreen.js` |
| `authSchemas.whitelabelSignup` barrel entry | 447 | **Remove line** | consumers using `schemas.auth.whitelabelSignup` form |
| Imports of `ARABIC_TEXT_REGEX, ENGLISH_TEXT_REGEX, LICENSE_REGEX, TAX_REGEX` | 12–15 | **Remove** (only the whitelabel schema used them) | — |
| Everything else (login, OTP, password, host signup, vendor signup, profile, auth store snapshot) | — | **Keep** | Core auth shared by all roles |

### 4b. `shared/src/schemas/settings.js` — EDIT-FILE
Role-aware notification preferences. **Survives, edited.**
| Symbol | Lines | Action | Downstream importers |
|---|---|---|---|
| `whitelabelAppNotificationsSchema` | 277–283 | **Delete export** | web `labbe/utils/schemas/notificationPreferencesSchemas.js` |
| `whitelabelEmailNotificationsSchema` | 285–290 | **Delete export** | web `notificationPreferencesSchemas.js` |
| `whitelabelNotificationPreferencesSchema` | 301–304 | **Delete export** | web `notificationPreferencesSchemas.js` |
| `whitelabelNotificationDefaults` | 367–381 | **Delete export** | web `notificationPreferencesSchemas.js` |
| `getNotificationSchemaForRole` — `WHITELABEL_ADMIN`/`WHITELABEL_MODERATOR` case | 326–328 | **Remove the case** (falls to `default` throw) | called by both apps' settings screens |
| `getNotificationDefaultsForRole` — whitelabel case | 389–391 | **Remove the case** | same |
| `USER_ROLES` local dup — `WHITELABEL_ADMIN`/`WHITELABEL_MODERATOR` | 313–314 | **Remove the 2 keys** | local back-compat constant; safe to trim |
| host/admin schemas, defaults, profile/password/account-deletion, mobile variants, validate helpers | — | **Keep** | non-whitelabel functionality |

### 4c. `shared/src/schemas/admin.js` — EDIT-FILE
| Symbol | Lines | Action | Notes |
|---|---|---|---|
| `whitelabelSubscriptionSchema` | 75–78 | **Delete export** | **No importer found anywhere in repo** (likely dead, or reached only via `schemas.admin.*` barrel namespace). It is byte-identical to `hostSubscriptionSchema` (31–34) — confirm in Round 2 that the whitelabel subscription popup is the sole user before deleting. |
| Everything else (addHost, addModerator, vendor rating, ticket, template-category, notification-send, taqnyat, discount) | — | **Keep** | admin/moderator functionality |

### 4d. `shared/src/schemas/plans.js` — EDIT-FILE (DB/DATA-adjacent)
| Symbol | Line | Action | Notes |
|---|---|---|---|
| `availabilityEnum` member `"whitelabel"` | 46 (in array 44–48) | **Remove the member** → `["host","platform_admin"]` | `availabilityEnum` is used by `createPlanSchema.availableFor` (133) and mirrors backend `plans.schemas.js`. **DB/DATA risk:** existing Plan docs may store `availableFor: "whitelabel"`; removing the member makes the schema reject them. Coordinate with backend agent — strip only after confirming no live plan uses it (and a migration re-points/removes such plans). |
| `availabilityEnum` (the export itself) | 44–48 | **Keep** (edit member only) | |
| `planTypeEnum`, `planFamilyEnum`, all plan schemas, `PLAN_TYPES` | — | **Keep** | Non-whitelabel; note `PLAN_TYPES` labels mention "هلا أعمال/managed" — unrelated to whitelabel, do NOT touch |

### 4e. `shared/src/schemas/_shared.js` — EDIT-FILE
Primitive regex fragments. **Survives, edited.** Verified across the whole repo: the four regexes below are imported ONLY by `auth.js` for the whitelabel signup schema — no other consumer.
| Symbol | Lines | Action |
|---|---|---|
| `ARABIC_TEXT_REGEX` | 33–34 | **Delete export** (dead after whitelabel schema removed) |
| `ENGLISH_TEXT_REGEX` | 36–37 | **Delete export** |
| `LICENSE_REGEX` | 39–40 | **Delete export** |
| `TAX_REGEX` | 42–43 | **Delete export** |
| `SAUDI_PHONE_REGEX`, `PASSWORD_COMPLEXITY_REGEX`, `OTP_REGEX`, `SAUDI_NATIONAL_ID_REGEX`, `SAUDI_COMMERCIAL_REG_REGEX`, and all factory helpers | — | **Keep** | used by host/vendor/login/settings schemas |

> Caveat: these are exported primitives. Grep shows zero direct importers in web/mobile/backend today, so deletion is safe, but flag for synthesis in case an app adds an import before the change lands.

---

## 5. API paths (`shared/src/api/paths.js`) — EDIT-FILE + INVESTIGATE

`PATHS` is `deepFreeze`d; `admin` and `auth` are exported as whole namespaces (lines 451, 472) — there are **no individual `whitelabels`/setup-password named exports** to remove, so editing the inner objects is sufficient.

### EDIT — definitively whitelabel
| Path | Lines | Action | Notes |
|---|---|---|---|
| `auth.whitelabelSignup: "/auth/signup/whitelabel"` | 32 | **Delete the line** | Maps to backend `POST /auth/signup/whitelabel` (whitelabel signup). |
| `admin.whitelabels` object (getAll/getById/updateStatus/updateSubscription/features/delete/bulkDelete/bulkStatus/export) | 418–428 | **Delete the entire `whitelabels` sub-object** | The whitelabel tenant-management admin API surface. Consumed by web `admin-dash/whitelabels/**` and the mobile mirror. |

### INVESTIGATE — setup-password family (backend-owned decision)
| Path | Lines | Why INVESTIGATE |
|---|---|---|
| `auth.validateSetupToken` | 49 | Header comment reads "Password Setup (Whitelabel)". |
| `auth.setupPassword` | 50 | Backend evidence: `createPasswordSetupToken()` is minted in only TWO places — `admin.whitelabels.service.js:183` (whitelabel approval) and `auth.controller.js:593` (the `resendSetupEmail` endpoint re-minting for a user who already has a token). **No addHost/addModerator flow mints a setup token.** That strongly implies the setup-password flow exists *solely* to onboard whitelabel admins → would become DELETE. |
| `auth.resendSetupEmail` | 51 | Same flow. |

**Recommendation:** treat as **likely DELETE**, but defer to the backend agent / Round 2 to confirm no non-whitelabel invite (host/moderator) is ever issued a setup token. If confirmed whitelabel-only, delete all three path lines + the `// Password Setup (Whitelabel)` comment (48). Downstream: web `setup-password/**` page + mobile equivalent (owned by other agents).

---

## 6. Hooks (`shared/src/hooks/useEventActionGate.js`) — EDIT-FILE

Live RBAC gate hook used by **web host single-event** and **mobile EventDetails / LastEvent / SingleEventStats**. Exported via `hooks/index.js`. **Survives, edited carefully.**

| What | Lines | Action |
|---|---|---|
| `whitelabel_admin` branch of `canManualRetry` | 72–75 (`(userRole === "whitelabel_admin" && eventWlId && userWlId && eventWlId.toString() === userWlId.toString())`) | **Remove the `||`-ed whitelabel clause** |
| `userWlId` local (`currentUser?.whitelabelId`) | 63 | **Remove** (only used by the deleted clause) |
| `eventWlId` local (`event.whitelabelId`) | 64 | **Remove** (only used by the deleted clause) |
| `whitelabelId` mentions in JSDoc | 12, 16 | Remove from doc comment |
| Host / `admin` / `super_admin` retry paths (67–71), and ALL other outputs | — | **KEEP** — this is the non-whitelabel functionality; do not regress |

After edit, `canManualRetry` = `isFailed && (eventHostId === userId || userRole === "admin" || userRole === "super_admin")`.

---

## 7. Utils (`shared/src/utils/notification.js`) — EDIT-FILE

| What | Line | Action | Notes |
|---|---|---|---|
| `whitelabel_registered: "building"` in `NOTIFICATION_ICON_MAP` | 60 | **Delete the entry** | Icon mapping for the `whitelabel_registered` notification type (emitted by backend on whitelabel registration). Unknown types already fall back to `"bell"`, so removal is safe. Confirm with backend agent that the `whitelabel_registered` notification type is also being removed. |
| All other icon/priority/time-ago helpers | — | **Keep** | |

---

## 8. Exported-symbol disposition table

Legend: **KEEP** = no change · **EDIT** = symbol stays but whitelabel parts stripped · **DELETE** = export removed entirely.

| Symbol | File | Disposition | Rationale | Known / likely downstream consumers |
|---|---|---|---|---|
| `ROLES.WHITELABEL_ADMIN` / `WHITELABEL_MODERATOR` | constants/roles.js | **DELETE** (members) | Whitelabel roles | `ROLES.*` consumed transitively via the two symbols below; the role-string values also appear app-locally (web `middleware.js`, `serverAuth.js`; mobile `HostSelectorStep.js`) and in backend's own `roles.js` — those are app-owned copies |
| `WHITELABEL_ROLES` | constants/roles.js | **DELETE** | Purely whitelabel | **Confirmed importers of the shared symbol:** web `labbe/ui/layout/navConfig.js` (re-exported by `labbe/ui/layout/index.js`); mobile `halla-mobile/utils/adminPermissions.js` (re-export), `halla-mobile/components/admin-dashboard/events/CreateEventForm.js` (direct `import { WHITELABEL_ROLES } from "@halla/shared/constants/roles"`). Backend uses its OWN copy (`labbe-backend-/src/shared/constants/roles.js` → `whitelabel.js`, `admin.events.service.js`, `admin.events.controller.js`) — not the shared one. |
| `isWhitelabelRole` | constants/roles.js | **DELETE** | Purely whitelabel | **Confirmed importers of the shared symbol:** web `navConfig.js` (+ re-export `index.js`, used at `navConfig.js:551`); mobile `adminPermissions.js` (re-export). Backend uses its own copy. (Web `DashboardStats.jsx`/`DashboardCharts.jsx`, `middleware.js` define their OWN local `isWhitelabelRole` — app-owned.) |
| `ROLE_HIERARCHY` | constants/roles.js | **EDIT** | Core; drop whitelabel keys/entries | web, mobile, backend |
| `ADMIN_ROLES` | constants/roles.js | **EDIT** | Core; drop 2 whitelabel members | web, mobile, backend |
| `PLATFORM_ADMIN_ROLES` | constants/roles.js | **EDIT/KEEP (redundant)** | Becomes == ADMIN_ROLES; can't delete without migrating importers | backend `subscription.js`, backend events svc/controller, web `HostSelector`, mobile `adminPermissions.js` + `HostSelectorStep` |
| `isPlatformAdmin` | constants/roles.js | **KEEP** | Depends on PLATFORM_ADMIN_ROLES | same as above |
| `ROLES`/`USER_ROLES`, `isAdminRole`, `hasRoleAccess`, `getManageableRoles` | constants/roles.js | **KEEP** (ROLES edits members only) | core | all |
| `ADMIN_PAGES.WHITELABELS` | constants/permissions.js | **DELETE** (key) | Whitelabel page key | The `WHITELABELS`/`PAGES.WHITELABELS` access-matrix rows live in app-local copies, NOT the shared barrel: web `serverAuth.js` (own `ADMIN_PAGES`), mobile `adminPermissions.js` (own `PAGES`), backend's own `permissions.js`. Many mobile whitelabel components key off `PAGES.WHITELABELS` (`AdminNavigator.js`, `WhitelabelList/ListItem/Actions.js`, `WhitelabelDetailsScreen.js`, `AdminMoreScreen.js`). Removing the shared key is low-ripple; the app-local matrices are owned by web/mobile agents. |
| `PERMISSIONS.MANAGE_WHITELABELS` | constants/permissions.js | **DELETE** (key) | Whitelabel permission | No app imports the shared `MANAGE_WHITELABELS` identifier directly. Backend has its own `PERMISSIONS.MANAGE_WHITELABELS` (`permissions.js:259` maps it → `ADMIN_PAGES.WHITELABELS`). Shared-key removal is safe; backend copy owned by backend agent. |
| `whitelabelSignupSchema` | schemas/auth.js | **DELETE** | Whitelabel signup | web `WhiteLabelForm.js` + `authSchemas.js`; mobile `authSchemas.js`→`WhitelabelSignupScreen.js` |
| `authSchemas.whitelabelSignup` | schemas/auth.js | **DELETE** (entry) | barrel entry for above | barrel consumers |
| `whitelabelAppNotificationsSchema` | schemas/settings.js | **DELETE** | Whitelabel notif prefs | web `notificationPreferencesSchemas.js` |
| `whitelabelEmailNotificationsSchema` | schemas/settings.js | **DELETE** | Whitelabel notif prefs | web `notificationPreferencesSchemas.js` |
| `whitelabelNotificationPreferencesSchema` | schemas/settings.js | **DELETE** | Whitelabel notif prefs | web `notificationPreferencesSchemas.js`; also referenced internally (327) |
| `whitelabelNotificationDefaults` | schemas/settings.js | **DELETE** | Whitelabel notif prefs | web `notificationPreferencesSchemas.js`; also referenced internally (391) |
| `getNotificationSchemaForRole` / `getNotificationDefaultsForRole` | schemas/settings.js | **EDIT** | Drop whitelabel `case` | both apps' settings screens |
| `USER_ROLES` (local dup) | schemas/settings.js | **EDIT** | Drop 2 whitelabel members | local |
| `whitelabelSubscriptionSchema` | schemas/admin.js | **DELETE** | Whitelabel-only; dup of hostSubscriptionSchema | **no importer found** — verify in Round 2 |
| `availabilityEnum` (`"whitelabel"` member) | schemas/plans.js | **EDIT** (member) | DB/DATA-adjacent; backend-mirrored | backend plans; web/mobile plan forms — verify no live plan uses it |
| `ARABIC_TEXT_REGEX` | schemas/_shared.js | **DELETE** | Only whitelabel schema used it | none direct (verified) |
| `ENGLISH_TEXT_REGEX` | schemas/_shared.js | **DELETE** | Only whitelabel schema used it | none direct (verified) |
| `LICENSE_REGEX` | schemas/_shared.js | **DELETE** | Only whitelabel schema used it | none direct (verified) |
| `TAX_REGEX` | schemas/_shared.js | **DELETE** | Only whitelabel schema used it | none direct (verified) |
| `API_PATHS.auth.whitelabelSignup` | api/paths.js | **DELETE** (path) | Whitelabel signup endpoint | web/mobile signup |
| `API_PATHS.admin.whitelabels.*` | api/paths.js | **DELETE** (sub-object) | Whitelabel tenant-mgmt API | web `admin-dash/whitelabels/**`, mobile mirror |
| `API_PATHS.auth.validateSetupToken / setupPassword / resendSetupEmail` | api/paths.js | **INVESTIGATE** (→ likely DELETE) | Setup-token minted only by whitelabel approval | web `setup-password/**`, mobile equivalent |
| `useEventActionGate` | hooks/useEventActionGate.js | **EDIT** | Drop whitelabel retry branch + WL locals | web host single-event; mobile EventDetails/LastEvent/SingleEventStats |
| `getNotificationIcon` (via `whitelabel_registered` map entry) | utils/notification.js | **EDIT** (map entry) | Drop one icon mapping | web + mobile notification rendering |

### Barrel ripple to keep in mind
- `constants/index.js` does `export * from "./roles.js"` and `./permissions.js"`, and `src/index.js` does `export * as constants`. Deleting `WHITELABEL_ROLES`/`isWhitelabelRole`/`MANAGE_WHITELABELS`/`WHITELABELS` removes them from `constants.*` too — any app reading `constants.WHITELABEL_ROLES` etc. must be updated.
- `schemas/index.js` re-exports each schema module as a namespace (`auth`, `admin`, `settings`, `plans`, `_primitives`). Deleting the schema exports above also removes `schemas.auth.whitelabelSignupSchema`, `schemas.settings.whitelabel*`, `schemas.admin.whitelabelSubscriptionSchema`, `schemas._primitives.*_REGEX`. **Schemas are NOT on the top-level `src/index.js` barrel** — consumers import schemas via subpath (`@halla/shared/schemas/auth`) or the `schemas/index.js` namespace, never via `@halla/shared` root.
- `api/paths.js` exports `admin` and `auth` as whole namespaces — editing the inner objects suffices; no named-export list change needed.

---

## 9. Open questions for Round 2

1. **`PLATFORM_ADMIN_ROLES` — delete or keep as alias?** After whitelabel removal it equals `ADMIN_ROLES`. Options: (a) keep it as a thin alias `export const PLATFORM_ADMIN_ROLES = ADMIN_ROLES;` to avoid touching its 5 importers; (b) delete it and migrate backend `subscription.js` + events svc/controller, web `HostSelector`, mobile `adminPermissions.js` + `HostSelectorStep` to `ADMIN_ROLES`. Needs a cross-area decision (synthesis).
2. **`setup-password` flow — confirm whitelabel-only.** Backend shows the setup token is minted only by whitelabel approval (+ self-resend). Does any host/moderator invite path (`POST /admin/users`, addHost/addModerator) ever mint `passwordSetupToken`? If not → delete `validateSetupToken`/`setupPassword`/`resendSetupEmail` paths + backend routes/controller + web `setup-password/**` + mobile screen. Backend agent owns the final call.
3. **`availabilityEnum` `"whitelabel"` member — any live Plan docs?** This is the one DB/DATA-adjacent edit in shared. Does Mongo hold any Plan with `availableFor: "whitelabel"`? If yes, a migration is required before tightening the enum (backend+DB agent).
4. **`whitelabelSubscriptionSchema` (admin.js) — truly unused?** Grep found no importer. Confirm it is not reached via the `schemas.admin.*` namespace from a web/mobile whitelabel subscription popup before deleting. (It duplicates `hostSubscriptionSchema`, so even if used by a whitelabel popup it dies with that popup.)
5. **`whitelabel_registered` notification type** — confirm the backend stops emitting this type (and any audit-log/notification enum) so the shared icon-map removal is complete and consistent.
6. **Schemas barrel namespace usage** — do any app call sites destructure whitelabel schemas via the `schemas.settings.*` / `schemas.auth.*` namespace rather than direct named import? The direct importers are catalogued above; the namespace path should be double-checked in web/mobile inventories.

---

*End of shared-inventory.md — 10 files, 0 DELETE-FILE, 8 EDIT-FILE, 1 INVESTIGATE block. No source files were modified.*
