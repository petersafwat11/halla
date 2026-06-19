# Whitelabel Removal — Round 1 Inventory: BACKEND + DATABASE

Scope: `D:\halla\labbe-backend-\` only (Express app, Mongoose models, modules, middleware, scripts, email, swagger). Web / mobile / shared owned by other agents; cross-boundary contracts are noted but not classified for deletion here. All paths relative to `D:\halla`.

---

## 1. Summary header

- **Files touching whitelabel/tenant:** 95 files match `whitelabel|white-label|tenant` (case-insensitive); **55 files** contain `whitelabelId` (486 occurrences).
- **In-scope findings classified below: ~78 files** (excludes docs and pure frontend).
  - **DELETE-FILE: 5** — `middleware/whitelabel.js`, `admin.whitelabels.{routes,controller,service}.js`, `email/templates/whitelabels.js`, plus 2 scripts (`createWhitelabelTestUsers.js`, `audit-admin-whitelabel.js`). *(7 deletions total; the 3 admin.whitelabels files counted as one module + 2 standalone files + 1 middleware + 1 email = 7.)*
  - **EDIT-FILE: ~52** — every shared service/controller/route/model/constant that strips a whitelabel branch but preserves platform-admin/host/vendor/moderator behaviour.
  - **DB-DATA: 9 models** carry `whitelabelId` (8 with the field + indexes; 1 reference-only) + whitelabel-only Plan docs + WL user docs.
  - **INVESTIGATE: ~6** — `setup-password` token flow, `plans.service.getWhitelabelPlans`, `checkFeature` middleware, `domain` subdoc + subdomain index, `WHITELABEL_APPLICATION_STATUS`/`TICKET_SOURCE.WHITELABEL`, swagger enums.

### CRITICAL ARCHITECTURE FACT
**There is NO dedicated `Whitelabel`/`WhitelabelOrg` model.** A "whitelabel" **IS a `User` document with `role: 'whitelabel_admin'`.** The `whitelabelId` field on every other model is an `ObjectId` pointing back to that user's `_id` (self-reference on the WL admin: `whitelabel.whitelabelId = whitelabel._id`). `EventModel.whitelabelId` declares `ref: "WhiteLabel"` (a non-existent model — latent bug); all others use `ref: "User"`.

### THE `whitelabelId: null` SEMANTICS (crux of every EDIT)
`whitelabelId` has **two semantics that both reduce to "drop the clause" on removal — but only because real platform records carry `null`:**
1. **Skip-filter sentinel** (`getAllEvents`, `getWhitelabelIdFromFilter`): `whitelabelId === null` means "platform admin → show ALL, no host filter."
2. **Equality match** (`dashboard.service`, `admin.hosts/moderators/events`, `UserModel` statics, notifications): `whitelabelId: null` is spread into the Mongo query as an equality, matching real platform records (which are all null/absent).

Hosts/vendors created via normal signup (`signupHost`, `verifySignupOTP`, `signupVendor`) **never get a whitelabelId set** → it defaults to `null`. The ONLY producers of a non-null `whitelabelId` are: (a) `signupWhitelabel` (self-ref), (b) admin-created hosts/moderators under a WL admin, and (c) `seedTestUsers.js` which deliberately scopes the platform `admin`+`moderator` to the WL admin's id (see DB-DATA risk). **Therefore dropping the field is safe for the real platform**, provided each read site drops its clause and `ADMIN_ROLES`/role helpers are simplified in the same coupled change.

### Top 5 highest-risk
1. **`labbe-backend-\src\shared\middleware\whitelabel.js`** (DELETE) — `filterByWhitelabel` populates `req.whitelabelFilter` consumed by EVERY admin read via `getWhitelabelIdFromFilter`. Its `whitelabelId: null` output is the "show all" signal for platform admins. Removing it requires reworking all admin controllers to pass no filter. **HIGH.**
2. **`labbe-backend-\src\shared\middleware\auth.js`** (EDIT) — runs on every authenticated request; sets `req.whitelabelId`, `req.tenant`, `req.isWhitelabel`, populates `user.whitelabelId` (the populated-doc bug source), and contains `extractTenantContext` + `validateTenant` (subdomain/customDomain tenant resolution). **HIGH.**
3. **`labbe-backend-\models\UserModel.js`** (EDIT/DB-DATA) — `whitelabelId` field + index, `domain` subdoc + unique partial index, `whitelabelDataSchema`, `isAdmin`+`isWhitelabelUser` virtuals, `findByRole`/`countByRole`/`getStats`/`search` optional whitelabelId, `toPublicJSON` WL branch. Touches all user reads. **HIGH.**
4. **`labbe-backend-\src\modules\events\events.crud.service.js`** (EDIT) — `_buildScopedEventQuery` (fail-closed tenant scoping for admin/WL roles), `getAllEvents` (the null-skip special case), `_getWhitelabelHostIds`. Mishandling silently 404s/400s event reads for admins. **HIGH.**
5. **`labbe-backend-\src\modules\admin\admin.moderators.service.js`** (EDIT) — uniquely **conflates platform and WL roles in the same query** (`role: { $in: [MODERATOR, WHITELABEL_MODERATOR, ADMIN, WHITELABEL_ADMIN] }` + branchy null logic). Easiest place to break the platform moderator listing if edited carelessly. **HIGH.**

---

## 2. Sections

### A. Constants + Roles

| Path | Class | What / why | What to remove (preserve the rest) | Risk |
|---|---|---|---|---|
| `labbe-backend-\src\shared\constants\roles.js` | EDIT | Defines the two WL roles + all helpers. Non-WL: SUPER_ADMIN/ADMIN/MODERATOR/HOST/VENDOR/GUEST definitions, `ROLE_HIERARCHY`, `hasRoleAccess`, `getManageableRoles`, `isAdminRole`. | Remove `WHITELABEL_ADMIN`/`WHITELABEL_MODERATOR` from `ROLES`; remove their `ROLE_HIERARCHY` keys + their entries inside `SUPER_ADMIN`'s array; remove WL roles from `ADMIN_ROLES`; remove `WHITELABEL_ROLES`, `isWhitelabelRole`. `PLATFORM_ADMIN_ROLES` (`[SUPER_ADMIN, ADMIN, MODERATOR]`) + `isPlatformAdmin` become redundant with `ADMIN_ROLES` — keep or fold (callers exist; see Misc). | HIGH (exported widely) |
| `labbe-backend-\src\shared\constants\permissions.js` | EDIT | `MANAGE_WHITELABELS` permission, `WHITELABELS` page, WL `DEFAULT_PERMISSIONS`, WL `ROLE_PAGE_ACCESS` entries. Non-WL: all other pages/permissions, `getPageAccess` (incl. hierarchy fallback over `ADMIN_ROLES`), `canAccessPage`, `PERMISSION_TO_PAGE`. | Remove `PERMISSIONS.MANAGE_WHITELABELS`; `ADMIN_PAGES.WHITELABELS`; `DEFAULT_PERMISSIONS[WHITELABEL_ADMIN]` + `[WHITELABEL_MODERATOR]`; `ROLE_PAGE_ACCESS[WHITELABEL_ADMIN]` + `[WHITELABEL_MODERATOR]`; the `WHITELABELS` lines inside every other role's page map; `PERMISSION_TO_PAGE[MANAGE_WHITELABELS]`. NOTE: `getPageAccess` hierarchy fallback filters by `ADMIN_ROLES` — correct once WL roles leave `ADMIN_ROLES`. | HIGH |
| `labbe-backend-\src\shared\constants\status.js` | EDIT | `WHITELABEL_APPLICATION_STATUS` object + export; `TICKET_SOURCE.WHITELABEL`. Non-WL: all other status enums. | Remove `WHITELABEL_APPLICATION_STATUS` (used only by the WL signup applicationStatus); remove `TICKET_SOURCE.WHITELABEL`. Verify `tickets.service` local `TICKET_SOURCE` copy (it has its own). | LOW-MED |
| `labbe-backend-\src\shared\constants\plans.js` | EDIT | `PLAN_AVAILABILITY.WHITELABEL`. Non-WL: `HOST`, `PLATFORM_ADMIN`, all plan-type predicates (`isUnlimited`/`isPerEventPlan`/`isPoolPlan`). | Remove `PLAN_AVAILABILITY.WHITELABEL`. | LOW |
| `labbe-backend-\src\shared\constants\planDefaults.js` | EDIT | 3 plan defs with `availableFor: PLAN_AVAILABILITY.WHITELABEL` (business event/quarterly/annual). Non-WL: host plans, trial, unlimited admin plan. | Remove the whitelabel plan definitions (lines ~208–307 region). **DB-DATA:** these are also seeded into the Plan collection — see migration note. | MED |
| `labbe-backend-\src\shared\constants\events.js` | EDIT | `HOST_LIMIT_EXCEEDED` error code is documented as a whitelabel-plan-limit error but is a generic code. | Keep the constant; only its WL doc-comment is WL-specific. The sole thrower is `admin.hosts.service.createHost`'s WL host-limit block (removed there). Low action. | LOW |

### B. Middleware

| Path | Class | What / why | What to remove | Risk |
|---|---|---|---|---|
| `labbe-backend-\src\shared\middleware\whitelabel.js` | **DELETE** | Entire file is the tenant-scoping middleware: `filterByWhitelabel`, `injectWhitelabel`, `whitelabelAdminOnly`, `whitelabelIsolation` alias. | Delete file. Remove its 4 exports from `middleware/index.js` and every route import (events, dashboard, admin.whitelabels.routes). Callers that relied on `req.whitelabelFilter` must instead pass NO tenant filter (see consumer edits). | **HIGH** |
| `labbe-backend-\src\shared\middleware\auth.js` | EDIT | Core auth (`protect`, `optionalAuth`). Non-WL: token extraction/verify, user attach, status checks, password-change revocation — must be preserved exactly. | Remove `.populate("whitelabelId", …)` on both `protect` (L92) and `optionalAuth`; remove `req.whitelabelId` assignments (L138, L176); remove `req.tenant`/`req.isWhitelabel` assignments (L142–143, L179–180); delete `extractTenantContext` (L195–263, incl. subdomain/customDomain `WhiteLabel` lookups); delete `validateTenant` (L268–284) and its `middleware/index.js` export. | **HIGH** |
| `labbe-backend-\src\shared\middleware\subscription.js` | EDIT | Feature/limit gating. Non-WL: `requireSubscription`, `checkEventLimit`, `checkGuestLimit`, `checkMessageLimit`, `incrementEventUsage` for hosts + platform admins. | Simplify `isPlatformAdmin = isAdminRole(role) && !req.user?.whitelabelId` → `isAdminRole(role)` in 3 spots (L25, L101, L156). Remove the whitelabel per-event cross-host comment. **Coupled** with dropping WL from `ADMIN_ROLES` — net effect unchanged (platform admins bypass, hosts don't). | MED |
| `labbe-backend-\src\shared\middleware\rbac.js` | EDIT/INVESTIGATE | Non-WL: `restrictTo`, `requirePageAccess`, `requirePermission`, `superAdminOnly`, `checkAccess`. `checkFeature` reads `req.user.whitelabelId` → looks up WL user → merges WL `features`/plan features; platform users get `hasAccess=true`. | In `checkFeature` the `if (whitelabelId)` branch (L223–233) becomes dead (no user has whitelabelId) → simplify to always-allow, or **INVESTIGATE** whether `checkFeature` is mounted anywhere (grep shows it's exported; confirm route usage in Round 2). `req.isAdmin` (L165) is NOT whitelabel — leave. | MED |
| `labbe-backend-\src\shared\middleware\auditLog.js` | EDIT | Audit-log middleware writes `whitelabelId: req.whitelabelId \|\| req.user?.whitelabelId \|\| null` (L110). Non-WL: the entire audit-logging behaviour. | Remove the `whitelabelId` property from the logged payload (always null after removal). | LOW |
| `labbe-backend-\src\shared\middleware\index.js` | EDIT | Re-exports 4 whitelabel fns + `validateTenant` + the `whitelabel` module object. | Remove `validateTenant`, `filterByWhitelabel`, `whitelabelIsolation`, `injectWhitelabel`, `whitelabelAdminOnly` exports and the `whitelabel` require/re-export. | MED (import errors if missed) |

### C. Modules (per sub-list)

#### auth
| Path | Class | What / why | What to remove | Risk |
|---|---|---|---|---|
| `src\modules\auth\auth.service.js` | EDIT | `signupWhitelabel` (L620–701) + `_notifyAdminsNewWhitelabel` (L1361–1376) are WL-only. `getMe` populates `whitelabelId` (L1179). Non-WL: login, host/vendor signup, OTP, password reset/update, `getMe`, profile completion. | Delete `signupWhitelabel`, `_notifyAdminsNewWhitelabel`. In `getMe` remove `.populate('whitelabelId', 'identity domain status')`. Remove `passwordSetupToken/Expires` from `getMe` select if setup flow removed (see INVESTIGATE). | MED |
| `src\modules\auth\auth.controller.js` | EDIT | `whitelabelSignup` (L243), `setupPassword`/`validateSetupToken`/`resendSetupEmail` (the "PASSWORD SETUP (Whitelabel)" block L488–611). Non-WL: all other auth endpoints. | Delete `whitelabelSignup`. **INVESTIGATE/likely-DELETE** the setup-password block (whitelabel-invite only — see deep-dive §3 + open Q1). | MED |
| `src\modules\auth\auth.validation.js` | EDIT | `whitelabelSignupSchema` (L96, exported L197). Plus `setupPasswordSchema` (referenced by controller). Non-WL: all other Zod schemas. | Remove `whitelabelSignupSchema` + export. Remove `setupPasswordSchema` if setup flow removed. | LOW |
| `src\modules\auth\auth.routes.js` | EDIT | 3 `whitelabelId` hits — routes for `/signup/whitelabel`, `/setup-password`, `/validate-setup-token`, `/resend-setup-email`. Non-WL: login/signup/otp/password routes. | Remove the WL signup route + (pending Q1) the setup-password routes + their middleware (`uploadLogo`/multer for WL). | MED |

#### admin
| Path | Class | What / why | What to remove | Risk |
|---|---|---|---|---|
| `src\modules\admin\admin.whitelabels.service.js` | **DELETE** | Entire WL CRUD: `getWhitelabels`, `getWhitelabelById`, `updateWhitelabelStatus` (mints setup token + WL approval email), subscription/feature toggles, delete/bulk/export. Queries `User` by `role: WHITELABEL_ADMIN`. | Delete file. | MED |
| `src\modules\admin\admin.whitelabels.routes.js` | **DELETE** | All `/whitelabels*` endpoints (super-admin only). No non-WL route here. | Delete file + remove `router.use(require('./admin.whitelabels.routes'))` from `admin.routes.js` (L23). | MED |
| `src\modules\admin\admin.whitelabels.controller.js` | **DELETE** | Thin controller delegating to the WL service; merged via `Object.assign` in `admin.controller.js` (L9). | Delete file + remove the `Object.assign(exports, require('./admin.whitelabels.controller'))` line. | MED |
| `src\modules\admin\admin.routes.js` | EDIT | Mounts `admin.whitelabels.routes` (L23). Non-WL: mounts hosts/vendors/moderators/events/payments routers + `protect`. | Remove L23. | LOW |
| `src\modules\admin\admin.controller.js` | EDIT | `Object.assign(exports, require('./admin.whitelabels.controller'))` (L9). Non-WL: assigns events/payments/etc. controllers. | Remove L9. | LOW |
| `src\modules\admin\admin.controller.shared.js` | EDIT | **ENTIRE PURPOSE is whitelabel:** `getWhitelabelIdFromFilter(req)` reads `req.whitelabelFilter`. Returns `undefined`/`null`/ObjectId. Consumed by every admin controller. | After `filterByWhitelabel` is gone, `req.whitelabelFilter` no longer exists. Either delete this file and update all callers to pass NO whitelabelId, or make it return `undefined` always. **Coordinated with all admin controllers below.** | MED (touch surface) |
| `src\modules\admin\admin.hosts.service.js` | EDIT | `whitelabelId` param on every fn with `if (whitelabelId !== undefined) query.whitelabelId = whitelabelId`. `createHost` WL plan `maxHosts` limit block (L187–211). Non-WL: full host CRUD for platform admins. | Drop the `whitelabelId` params + all `query.whitelabelId` guards; delete the WL `maxHosts` block + `HOST_LIMIT_EXCEEDED` import. | MED |
| `src\modules\admin\admin.hosts.controller.js` | EDIT | Threads `getWhitelabelIdFromFilter(req)` into host service calls. | Remove the whitelabelId args. | LOW |
| `src\modules\admin\admin.hosts.routes.js` | EDIT | Imports `filterByWhitelabel`; mounts it on host routes. | Remove import + mountings. | LOW |
| `src\modules\admin\admin.moderators.service.js` | EDIT | **Conflates platform+WL roles.** `getModerators`/`bulkUpdateModeratorStatus`/`exportModerators` branch on `whitelabelId === null` vs value; `createModerator`/`updateModerator` pin WL vs platform role. Non-WL: platform moderator/admin CRUD. | Collapse to platform-only: query `role: { $in: [MODERATOR, ADMIN] }` with NO whitelabelId; remove WL role arrays, the `actorRole === WHITELABEL_ADMIN` branch, `filterWhitelabelId`, WL `$in` role lists. **Preserve the platform branch exactly.** | **HIGH** |
| `src\modules\admin\admin.moderators.controller.js` | EDIT | Imports `getWhitelabelIdFromFilter`; threads `whitelabelId`/`filterWhitelabelId` into all 8 moderator ops. | Remove the import + all whitelabelId args. | MED |
| `src\modules\admin\admin.moderators.routes.js` | EDIT | (verify) imports/mounts `filterByWhitelabel`. | Remove. | LOW |
| `src\modules\admin\admin.events.service.js` | EDIT | `whitelabelId` guards on `getEventById`/`updateEventFull`/`updateEventStatus`/`deleteEvent`/`bulkDeleteEvents`/`exportEvents`. `getEventTargets` (`type='whitelabel'` returns WL admins; WL-user filtering). `createEventForHost` resolves WL admin as subscription owner. Non-WL: admin event CRUD + create-for-host. | Drop `whitelabelId`/`context.whitelabelId` guards. In `getEventTargets`: remove the `whitelabel` type + WL filtering + the "hosts share WL subscription" block (keep host targets + own-sub). In `createEventForHost`: remove the `context.whitelabelId` subscription-owner resolution. Remove `WHITELABEL_ROLES`, `isWhitelabelUser` usage (L146–149). | MED-HIGH |
| `src\modules\admin\admin.events.controller.js` | EDIT | `WHITELABEL_ROLES`/`PLATFORM_ADMIN_ROLES` imports; `WHITELABEL_ROLES.includes(req.user.role)` createForSelf branch (L39); `getWhitelabelIdFromFilter`; resolves `whitelabelId` from target user (L61–69). Non-WL: admin event create/status/delete/export. | Remove WL createForSelf branch; simplify platform-admin skip (`PLATFORM_ADMIN_ROLES.includes(role) && !whitelabelId` → `isAdminRole(role)`); remove all whitelabelId resolution/threading. | MED |
| `src\modules\admin\admin.events.routes.js` | EDIT | (verify) `filterByWhitelabel` mount. | Remove. | LOW |
| `src\modules\admin\admin.payments.service.js` | EDIT | (7 hits) whitelabelId scoping in payment reads. Non-WL: admin payment list/detail/refund. | Drop whitelabelId guards/filters. | MED |
| `src\modules\admin\admin.payments.controller.js` | EDIT | (9 hits) `getWhitelabelIdFromFilter` threading. | Remove whitelabelId args. | LOW |
| `src\modules\admin\admin.payments.routes.js` | EDIT | (verify) `filterByWhitelabel`. | Remove. | LOW |
| `src\modules\admin\admin.vendors.service.js` | EDIT | (23 hits) whitelabelId param/guards on vendor ops. NOTE: vendors are global (marketplace) — WL scoping here is likely vestigial. Non-WL: full vendor CRUD/approval. | Drop whitelabelId params/guards. Verify vendors are never tenant-scoped in practice. | MED |
| `src\modules\admin\admin.vendors.controller.js` | EDIT | (17 hits) `getWhitelabelIdFromFilter` threading. | Remove whitelabelId args. | LOW |
| `src\modules\admin\admin.vendors.routes.js` | EDIT | (verify) `filterByWhitelabel`. | Remove. | LOW |
| `src\modules\admin\admin.validation.js` | EDIT | `whitelabelId: objectId.optional()` (L69) in moderator schema; `role` enum includes WL roles (L80); 5 WL schemas (`updateWhitelabelStatus/Subscription/Feature`, `bulkDeleteWhitelabels`, `bulkWhitelabelStatus`) + exports. | Remove the 5 WL schemas + exports; remove `whitelabelId` field + WL roles from the moderator/role enums. | LOW |
| `src\modules\admin\admin.service.js` | EDIT | (verify) thin barrel; likely re-exports shared. | Check for WL re-exports; remove. | LOW |

#### events
| Path | Class | What / why | What to remove | Risk |
|---|---|---|---|---|
| `src\modules\events\events.crud.service.js` | EDIT | `_buildScopedEventQuery` (tenant-scope for ADMIN/MOD/WL roles, fail-closed); `getAllEvents` whitelabelFilter null-skip; `_getWhitelabelHostIds`; `createEvent` WL per-event cross-host limit (L435–451) + `whitelabelId` set (L558–560); `_formatEvent` returns `whitelabelId` (L886). Non-WL: all host+admin event CRUD, pool/per-event capacity logic. | In `_buildScopedEventQuery`: remove WL roles from `tenantScoped`; for ADMIN/MODERATOR drop the whitelabelId equality → they see any event (matches "platform admin sees all"); keep SUPER_ADMIN any + host own. In `getAllEvents`: drop the `whitelabelFilter` param + the whole `_getWhitelabelHostIds` branch (admins see all). Delete `_getWhitelabelHostIds`. In `createEvent`: remove the WL per-event block + `whitelabelId` set + `whitelabelId`/`adminId`-derived WL logic. Remove `whitelabelId` from `_formatEvent`. | **HIGH** |
| `src\modules\events\events.controller.js` | EDIT | (6 hits) passes `req.whitelabelFilter`/whitelabelId to service (`getAllEvents`, `getMyEvents`, stats). | Remove whitelabelFilter args; call services without tenant filter. | MED |
| `src\modules\events\events.routes.js` | EDIT | Imports `filterByWhitelabel`+`injectWhitelabel`; mounts on `/my-events`, `/stats`, create; `restrictTo(...)` includes WL roles (L69); retry route allows WL_ADMIN (L962). Non-WL: all event routes for host/admin. | Remove the 2 middleware imports + all mountings; remove `WHITELABEL_ADMIN`/`WHITELABEL_MODERATOR` from `restrictTo` lists. | MED |
| `src\modules\events\events.admin.routes.js` | EDIT | Imports + mounts `filterByWhitelabel` on `GET /` (getAllEvents). | Remove import + mount. | LOW |
| `src\modules\events\events.admin.controller.js` | EDIT | (verify) whitelabel threading for admin event list. | Remove whitelabelId args. | LOW |
| `src\modules\events\events.validation.js` | EDIT | (1 hit) likely `whitelabelId` optional in a schema. | Remove. | LOW |
| `src\modules\events\events.settings.service.js` | EDIT | (matches) whitelabel reference in settings. | Inspect + remove WL branch. | LOW |
| `src\modules\events\events.launch.service.js` | EDIT | (4 hits) `whitelabelId` passed to audit/notify. | Drop `whitelabelId` from audit/notify payloads. | LOW |
| `src\modules\events\events.stats-export.service.js` | EDIT | (4 hits) whitelabel scoping in stats/export. | Drop whitelabelId filter. | LOW |

#### dashboard
| Path | Class | What / why | What to remove | Risk |
|---|---|---|---|---|
| `src\modules\dashboard\dashboard.service.js` | EDIT | (3 hits but ~20 query usages) `getDashboardStats` spreads `...whitelabelFilter` into ~20 counts/aggregations; `isWhitelabelTenant` analytics block (L179–203) runs only for WL tenants. Non-WL: the entire platform-admin dashboard. | Remove the `whitelabelFilter` param; drop every `...whitelabelFilter` spread; delete the `isWhitelabelTenant` analytics block (or always return null analytics). | MED |
| `src\modules\dashboard\dashboard.controller.js` | EDIT | Passes `req.whitelabelFilter` to service (L18). | Remove the arg. | LOW |
| `src\modules\dashboard\dashboard.routes.js` | EDIT | Imports `whitelabelIsolation` (L19); mounts on admin dashboard (L74). Non-WL: `/host` route via `restrictTo(HOST)`. | Remove import + mount. | LOW |

#### notifications
| Path | Class | What / why | What to remove | Risk |
|---|---|---|---|---|
| `src\modules\notifications\notifications.service.js` | EDIT | (6 hits) `sendToAdmins` filters platform admins by `whitelabelId: null OR not-exists` (L164–172); `broadcast` `if (whitelabelId) query.whitelabelId` (L441). Non-WL: all notification send/broadcast. | In `sendToAdmins` drop the `$or: [{whitelabelId:null},{$exists:false}]` (all admins are platform); in `broadcast` remove the `whitelabelId` destructure + filter. | LOW-MED |
| `src\modules\notifications\notifications.controller.js` | EDIT | (6 hits) `broadcastNotification` computes `effectiveWhitelabelId` (super_admin vs own tenant, L137–148, L162). | Remove `whitelabelId` from body destructure + `effectiveWhitelabelId` logic; broadcast to role/all platform-wide. | LOW |

#### payments
| Path | Class | What / why | What to remove | Risk |
|---|---|---|---|---|
| `src\modules\payments\checkout.service.js` | EDIT | `plan.availableFor === 'whitelabel'` gate (L46); `whitelabelId: user.whitelabelId \|\| null` on Payment.create (L188). Non-WL: host checkout, payment creation. | Remove the WL plan gate; remove `whitelabelId` from Payment.create. | LOW |
| `src\modules\payments\payments.service.js` | EDIT | `ADMIN_LIKE` Set includes WL roles (L26–27); doc-comments about WL scope. Non-WL: host-self payment read, the 403-for-admins rule. | Remove WL roles from the Set. | LOW |
| `src\modules\payments\webhook.controller.js` | EDIT | (matches) `payer.role === 'whitelabel_admin'` → admin-dash actionUrl branch (L317, L322). Non-WL: host payment-success notify + activation. | Remove the `whitelabel_admin` branch (host path remains). | LOW |
| `src\modules\payments\payments.routes.js` | EDIT | Doc-comments reference whitelabel scope; `manage` verb rationale mentions WHITELABEL_ADMIN. Non-WL: payment routes. | Comment-only; optional cleanup. | LOW |

#### post-event / tickets / staff / guests / scheduled-extra-reminders / services / subscriptions / plans
| Path | Class | What / why | What to remove | Risk |
|---|---|---|---|---|
| `src\modules\post-event\post-event.service.js` | EDIT | `buildScopedEventQuery` mirror (tenant-scope for ADMIN/MOD/WL, fail-closed) + populated-doc normalize. Non-WL: post-event content read/write for host+admin. | Remove WL roles from `tenantScoped`; for ADMIN/MODERATOR drop the whitelabelId equality (see events.crud parallel). | MED |
| `src\modules\tickets\tickets.service.js` | EDIT | Local `TICKET_SOURCE.WHITELABEL` (L32); WL-role source/priority branch (L58–61); (3 whitelabelId hits) tenant scoping. Non-WL: full ticket CRUD for host/admin/guest. | Remove the WL source + WL-role branch; drop whitelabelId scoping. | LOW-MED |
| `src\modules\staff\staff.service.js` | EDIT | `isWhitelabelAdmin` RBAC branch for token list/revoke (L255–259); `whitelabelId: event.whitelabelId \|\| null` audit (L345). Non-WL: host/platform-admin/super-admin staff token mgmt. | Remove the `isWhitelabelAdmin` branch (host+admin+super_admin remain); drop whitelabelId from audit. | LOW-MED |
| `src\modules\guests\guests.service.js` | EDIT | (15 hits) `getEventGuests` tenant-scope (WL roles + populated-doc normalize, L160–186); QR rotate/revoke `isWhitelabelAdmin` checks (L420–425, L515–519); `whitelabelId: event.whitelabelId \|\| null` audits (L490, L551). Non-WL: guest listing, QR mgmt for host/admin. | Remove WL roles from tenant-scope lists + the `isWhitelabelAdmin` branches; drop whitelabelId from audits. **Preserve host + ADMIN/SUPER_ADMIN paths.** | MED |
| `src\modules\scheduled-extra-reminders\scheduled-extra-reminders.service.js` | EDIT | (2 hits) `whitelabelId: event.whitelabelId \|\| null` audit (L172). Non-WL: reminder scheduling. | Drop whitelabelId from audit. | LOW |
| `src\modules\scheduled-extra-reminders\scheduled-extra-reminders.routes.js` | EDIT | (matches) mounted under events; comment references WL scope via `_buildScopedEventQuery`. | Comment-only; no functional WL middleware here. | LOW |
| `src\modules\services\services.service.js` | EDIT (comment-only) | Comment: "Intentionally cross-tenant: no whitelabelId filter" (L20). Marketplace is global. | Update comment only. No functional change. | LOW |
| `src\modules\services\services.routes.js` | EDIT (comment-only) | "Globally cross-tenant" doc. | Comment only. | LOW |
| `src\modules\subscriptions\subscriptions.service.js` | EDIT | (2 hits) `whitelabelId: existing.whitelabelId \|\| null` / `targetUser.whitelabelId \|\| null` passed to Subscription create + audit (L225, L245). Non-WL: subscription assign/cancel. | Drop `whitelabelId` from Subscription.create options + audit. | LOW |
| `src\modules\plans\plans.service.js` | INVESTIGATE/EDIT | `getWhitelabelPlans` queries `availableFor: 'whitelabel'` (L34–36). No route in `plans.routes.js` calls it (grep: no match). Likely dead or called by an admin/whitelabel frontend. Non-WL: host plan listing (`availableFor: host`), `{ $ne: 'platform_admin' }`. | Confirm no caller → delete `getWhitelabelPlans`; else strip. The `$ne: 'platform_admin'` public list is non-WL — keep. | LOW-MED |

### D. Models + DB schema  *(see §3 deep-dive for blast radius)*

| Path | Class | Whitelabel fields / indexes | Risk |
|---|---|---|---|
| `models\UserModel.js` | EDIT/DB-DATA | `whitelabelId` field+`index:true` (L343–348); index `{whitelabelId:1, role:1}` (L409); `domain` subdoc (L351–354) + unique partial subdomain index (L419–422); `whitelabelDataSchema` (L162–218) + `profile.whitelabelData` (L367); `isWhitelabelUser` virtual (L465–467); `isAdmin` virtual lists WL roles (L454–462); `toPublicJSON` WL image branch (L797–800) + `if(this.whitelabelId)` (L807–809); statics `findByRole`/`countByRole`/`getStats`/`search` optional whitelabelId; role-data map WL entries (L774–775). | **HIGH** |
| `models\EventModel.js` | EDIT/DB-DATA | `whitelabelId` field `ref:"WhiteLabel"`(!) default null (L287–291); indexes `{whitelabelId:1}`, `{whitelabelId:1,host:1}`, `{whitelabelId:1,status:1}` (L444–446). | HIGH |
| `models\SubscriptionModel.js` | EDIT/DB-DATA | `whitelabelId` field (L142); index `{whitelabelId:1,status:1}` (L171); `createForUser` writes `whitelabelId` option (L570); statics `getStats(whitelabelId)` (L708–711), `findForWhitelabel` (L736–738). | MED-HIGH |
| `models\PaymentModel.js` | EDIT/DB-DATA | `whitelabelId` field+index (L80–85); index `{whitelabelId:1,status:1,createdAt:-1}` (L180). | MED |
| `models\NotificationModel.js` | EDIT/DB-DATA | `whitelabelId` field+index (L98–103); index `{whitelabelId:1,type:1,createdAt:-1}` (L251); `createForRole(role,data,whitelabelId)` (L428–453). | MED |
| `models\TicketModel.js` | EDIT/DB-DATA | `whitelabelId` field (L61); index `{whitelabelId:1,status:1}` (L128); `.populate("whitelabelId","username")` (L171). | MED |
| `models\PostEventContentModel.js` | EDIT/DB-DATA | `whitelabelId` field (L235); index `{whitelabelId:1}` (L250). | MED |
| `models\AuditLogModel.js` | EDIT/DB-DATA | `whitelabelId` field (L91); index `{whitelabelId:1,timestamp:-1}` (L159). | MED |
| `models\StaffAccessTokenModel.js` | EDIT | NO own field — only a populate select string `"…host status whitelabelId"` (L130) reading the Event's field. | LOW |
| `models\ScheduledExtraReminderModel.js` | INVESTIGATE | Brief lists it as carrying `whitelabelId`, but grep found NO field in the model file (only the *service* passes `whitelabelId` to `logAudit`). **Confirm Round 2** — likely no schema field; nothing to drop here. | LOW |
| `models\PlanModel.js` | EDIT/DB-DATA | `availableFor` enum includes `'whitelabel'` (whitelabel-only plans live as data). No `whitelabelId` field. | LOW |
| *(no `WhitelabelModel.js`)* | — | Confirmed absent. | — |

### E. Scripts

| Path | Class | What / why | Risk |
|---|---|---|---|
| `scripts\createWhitelabelTestUsers.js` | **DELETE** | Creates a `whitelabel_admin` + `whitelabel_moderator` test pair. Pure WL. | LOW |
| `scripts\audit-admin-whitelabel.js` | **DELETE** | Reports admins missing `whitelabelId` (TENANT-F01 artifact). Obsolete once field is gone. | LOW |
| `scripts\seedTestUsers.js` | EDIT | (5 hits) Seeds `whitelabelAdmin` + `whitelabelModerator` users; **deliberately scopes platform `admin`+`moderator` to the WL admin's id** (L320, L335 — see DB-DATA risk). Non-WL: seeds host/vendor/super_admin/admin/moderator. | MED |
| `scripts\backfill-payments.js` | EDIT | (1 hit) Copies `whitelabelId: sub.whitelabelId \|\| null` onto backfilled Payment docs (L63). Non-WL: payment backfill. | LOW |
| `scripts\assignAdminUnlimitedPlan.js` | EDIT | (3 hits) Finds platform admins via `whitelabelId: null OR not-exists` (L60). Non-WL: assigns unlimited plan to platform admins. | LOW |

### F. Email templates

| Path | Class | What / why | What to remove | Risk |
|---|---|---|---|---|
| `email\templates\whitelabels.js` | **DELETE** | 8 WL email templates (application-pending/approval/rejection, new-host, host-subscription-assigned, weekly-report, subscription-expiring, moderator-added). | Delete file. | LOW |
| `email\templates\index.js` | EDIT | Imports `whitelabelsTemplates` (L11), categorized `whitelabels` export (L81), spread into `allTemplates` (L131), 8 `TEMPLATE_REGISTRY` keys (L181–190), `whitelabels` in module.exports (L254). Non-WL: all other categories. | Remove the import, the `whitelabels` category const + export, the spread, the 8 registry keys. NOTE: `moderatorAdded` lives in this file — confirm no platform-moderator flow uses it (it's WL "moderator added"). | LOW-MED |
| `email\index.js` | EDIT | `send.whitelabelApplicationPending/whitelabelApproval/whitelabelRejection/moderatorAdded` wrappers (L307–350). Non-WL: all other `send.*`. | Remove these 4 wrapper methods. | LOW |
| `src\shared\utils\emailService.js` | EDIT | `sendWhitelabelApplicationPendingEmail` wrapper (L91–97). | Remove. | LOW |
| `email\templates\auth.js` | INVESTIGATE | Matches `whitelabel` — likely `passwordSetupEmail` doc/branch (used by WL invite). Non-WL: welcome/reset/verify/etc. | Inspect; if `passwordSetup` is WL-only and setup flow removed, drop it (see Q1). | LOW |
| `email\templates\reports.js` | INVESTIGATE | Matches `whitelabelId` — likely a report template field. | Inspect; drop WL-only report bits. | LOW |

### G. Swagger + config

| Path | Class | What / why | What to remove | Risk |
|---|---|---|---|---|
| `src\config\swagger.js` | EDIT | (1 `whitelabelId` + several enum hits) `whitelabelId` in Payment schema (L2244); role enums include `whitelabel_admin` (L460); `availableFor` enums include `whitelabel` (L859, L996, L1066); dashboard analytics "Whitelabel-tenant-only analytics block" (L346). Non-WL: all other API docs. | Remove `whitelabel_admin` from role enums; `whitelabel` from `availableFor` enums; `whitelabelId` from Payment schema; the WL analytics block from the dashboard response schema. | LOW |

### H. Misc / cross-cutting backend

- **`PLATFORM_ADMIN_ROLES` / `isPlatformAdmin`** (roles.js) — defined "in opposition to whitelabel." Consumers: `events.crud.service._getWhitelabelHostIds`, `admin.events.controller`. After removal `PLATFORM_ADMIN_ROLES === ADMIN_ROLES`. Decide: keep as an alias or replace call sites with `ADMIN_ROLES`/`isAdminRole`. (EDIT, LOW)
- **`s3Upload.js`** — `logo: 'whitelabels/logos/${userId}'` upload-path key (L85), used by WL logo upload in `signupWhitelabel`. Remove the key once WL signup is gone. (EDIT, LOW)
- **`req.whitelabelId` / `req.tenant` / `req.isWhitelabel` / `req.currentWhitelabelId`** consumers (confirmed by grep): ONLY `auth.js` (sets), `auditLog.js` middleware (reads `req.whitelabelId`), `validateTenant` (reads). No other backend consumer. Clean to remove.
- **`src\modules\admin\admin.shared.service.js`** — EDIT. `getUserSubscriptionInfo` (L150–170) has a `WHITELABEL_MODERATOR` fallback: if a user has no own subscription but `user.whitelabelId` + `role === WHITELABEL_MODERATOR`, it loads the WL admin's subscription (L158–161); also `.select('role name whitelabelId')` (L151). Non-WL: `buildSearchQuery`, `buildDateRangeQuery`, `formatUserResponse`, `formatTargetSubscription`, `mapSubStatusToPayment` — all heavily used by every admin service and must be preserved. Remove the `WHITELABEL_MODERATOR` fallback block + `whitelabelId` from the select. (LOW-MED)
- **`src\shared\utils\scheduledTasks.js`** — EDIT. (10 hits) The cron/launch worker. All whitelabel usages are write-only: `whitelabelId: event/sub.whitelabelId || null` passed into ~8 `logAudit` calls (L221, L320, L351, L771, L829, L885, L1024, L1401, L1501) + a `.select("… whitelabelId")` on the expired-subscription sweep (L867). Non-WL: the entire event-launch, reminder, and subscription-expiry scheduling — must be preserved. Remove `whitelabelId` from the audit payloads + the select string (always null after removal). (LOW)

---

## 3. `whitelabelId` deep-dive

### Per model — fields + indexes + blast radius if removed

> **Universal rule:** real platform documents carry `whitelabelId = null` (or absent). Every query clause below is either a null-equality (matches platform rows) or a null-skip sentinel — so **dropping the clause is behaviour-preserving for platform/host/vendor/moderator** as long as the role helpers (`ADMIN_ROLES`) are simplified in the same change.

1. **UserModel** — field `whitelabelId` (`ref:User`, default null, `index:true`) + compound `{whitelabelId:1, role:1}`.
   - **SET by:** `signupWhitelabel` (self-ref `wl.whitelabelId = wl._id`); `admin.hosts.service.createHost`/`findOrCreateHost` (host under a WL); `admin.moderators.service.createModerator` (moderator under WL admin); `seedTestUsers.js` (admin+moderator scoped to WL admin id — **abnormal**, see DB risk).
   - **READ by:** `auth.js protect/optionalAuth` (`.populate` + `req.whitelabelId`/`req.tenant`); `filterByWhitelabel` (builds `req.whitelabelFilter`); `getWhitelabelIdFromFilter` → every admin service; `dashboard.service` spreads; `UserModel.findByRole/countByRole/getStats/search`; `admin.events.service.getEventTargets`; `checkFeature`.
   - **Blast radius if removed (without care):** admin endpoints that relied on `filterByWhitelabel` to set `req.whitelabelFilter` would get `undefined` → `getWhitelabelIdFromFilter` returns `undefined` → services skip the clause → **admins see all platform data (correct end state).** The populated-doc CastError bug disappears (no more populate). **Real risk:** any prod admin/moderator with a *non-null* whitelabelId (from seed or WL onboarding) currently sees only their tenant; after removal they see everything — a deliberate broadening (see migration).
   - Drop: field, both indexes, `domain` subdoc + subdomain unique index, `whitelabelDataSchema`, `isWhitelabelUser`, WL entries in `isAdmin` + role-data map, `toPublicJSON` WL branch, optional-whitelabelId in 4 statics.

2. **EventModel** — field `whitelabelId` (`ref:"WhiteLabel"` ← dangling ref, default null) + 3 indexes.
   - SET by: `events.crud.createEvent` (from context.whitelabelId), `admin.events.createEventForHost`. READ by: `_buildScopedEventQuery` (ADMIN/MOD/WL equality), `getAllEvents` (null-skip), `_getWhitelabelHostIds`, `admin.events.service.*` guards, dashboard event counts.
   - Blast radius: ADMIN/MODERATOR event reads currently filter `whitelabelId == caller.whitelabelId` (which is null for real admins → matches all null events). Dropping the clause → admins see all events (same result). SUPER_ADMIN/host unaffected. **Safe.**

3. **SubscriptionModel** — field + index `{whitelabelId:1,status:1}`; `createForUser` option; statics `getStats`, `findForWhitelabel`.
   - SET by: `createForUser` (WL/host-under-WL), seeds. READ by: `dashboard` sub counts, `findForWhitelabel` (WL only). Blast radius: sub counts spread `whitelabelId:null` → matches platform subs. `findForWhitelabel` is WL-only → delete. **Safe.**

4. **PaymentModel** — field + index. SET by `checkout.service`, `backfill-payments`, webhook. READ by `admin.payments.service` scoping. Blast radius: admin payment reads broaden to all. **Safe.**

5. **NotificationModel** — field + index; `createForRole(…, whitelabelId)`. SET by broadcast/createForRole. READ by `sendToAdmins` (`whitelabelId null/absent` filter), `broadcast`. Blast radius: `sendToAdmins` already targets only null-whitelabel admins → after removal all admins qualify (correct). **Safe.**

6. **TicketModel** — field + index + `.populate("whitelabelId","username")`. Blast radius: ticket tenant scoping drops; `.populate` must be removed or it no-ops. **Safe, but the populate must go.**

7. **PostEventContentModel** — field + index. READ by `post-event.service.buildScopedEventQuery`. Same null-equality pattern. **Safe.**

8. **AuditLogModel** — field + index. WRITE-only sink: ~12 call sites pass `whitelabelId: event/sub.whitelabelId || null` (always null after removal). Blast radius: none functional; drop field + index + the property from all `logAudit` calls + `auditLog.js` middleware. **Safe.**

9. **StaffAccessTokenModel** — NO field; only a populate select string reads Event.whitelabelId. Drop `whitelabelId` from that select string. **Safe.**

### Per middleware/query — how SET vs READ + exact blast radius

- **`auth.js` (SET `req.whitelabelId`, `req.tenant`, `req.isWhitelabel`):** populates `user.whitelabelId` then derives request flags. Consumers are only `auditLog.js` + `validateTenant`. Remove all three + `extractTenantContext` + `validateTenant`. **Blast radius: none beyond audit (which just logs null).**
- **`filterByWhitelabel` (SET `req.whitelabelFilter`, `req.currentWhitelabelId`):** SUPER_ADMIN→`{whitelabelId:null}` (= "show all" to downstream); ADMIN/MODERATOR→ scoped if they have a whitelabelId else `{whitelabelId:null}`; WL roles→ their id (fail-closed if missing); host/vendor→ their id or null. **Blast radius:** this is the linchpin. After deletion, downstream `getWhitelabelIdFromFilter` returns `undefined` ⇒ services skip the clause ⇒ all admin-class roles see all platform data. For HOST endpoints (`/my-events`, `/stats`) the filter was added but host queries already key on `host: userId`, so dropping it is inert. **Safe if every consumer is updated to not require `req.whitelabelFilter`.**
- **`getWhitelabelIdFromFilter` (READ):** the universal admin-controller adapter. `undefined`→no filter, `null`→platform-only, ObjectId→tenant. After removal, hardwire to "no filter."
- **`subscription.js` `isPlatformAdmin = isAdminRole(role) && !whitelabelId`:** **coupled edit.** Dropping `whitelabelId` + dropping the `!whitelabelId` term + removing WL roles from `ADMIN_ROLES` together yield `isPlatformAdmin = isAdminRole(role)` — platform admins bypass limits, hosts/vendors do not. A *partial* edit (e.g. dropping the field but leaving WL in `ADMIN_ROLES`) would wrongly grant a former-WL-admin role bypass. Do all three together.
- **`getAllEvents` null-skip vs `dashboard`/`admin.*` null-equality:** two different code shapes, same safe transform (remove the clause). Documented above as the crux.

---

## 4. Cross-boundary contracts (frontends rely on these — coordinate, don't break)

- **API routes removed:** `POST /api/v2/auth/signup/whitelabel`; `GET/POST/PATCH/DELETE /api/v2/admin/whitelabels*` (list/detail/status/subscription/feature/bulk/export); **(pending Q1)** `POST /auth/setup-password`, `GET /auth/validate-setup-token/:token`, `POST /auth/resend-setup-email`. Web `signup-whitelabel/**` + `admin-dash/whitelabels/**` + `setup-password/**` and mobile `WhitelabelSignupScreen` call these.
- **Role strings removed from contracts:** `whitelabel_admin`, `whitelabel_moderator` — frontends must drop nav/access entries (web `whitelabelNavItems`, `DASHBOARD_TYPES.WHITELABEL`; mobile mirrors). `/auth/me` response will no longer carry a populated `whitelabelId`/tenant.
- **Response shape changes:** `whitelabelId` disappears from event payloads (`_formatEvent`), Payment objects, `/auth/me` user; dashboard response loses the WL `analytics` block; `availableFor: 'whitelabel'` plans vanish from plan listings.
- **`@halla/shared`** (other agent's scope): roles/permissions/plan-availability constants + any Zod schemas (`whitelabelSignupSchema`, settings notificationPreferences WL keys) must be removed in lockstep so the backend `require('@halla/shared')` (if any) and the frontends agree.

---

## 5. Open questions / ambiguities for Round 2

1. **#1 — `setup-password` / `passwordSetupToken` flow.** Evidence says it's whitelabel-invite-only: section header "PASSWORD SETUP (Whitelabel)", and the only token minters are `admin.whitelabels.service.updateWhitelabelStatus` (WL approval) and `auth.controller.resendSetupEmail`. Hosts use `completeHostProfile`; moderators are created with a password inline. **Verify no admin-created host/moderator path is intended to use a setup link**, then remove: `passwordSetupToken`/`passwordSetupExpires` (UserModel), `createPasswordSetupToken`, `setupPassword`/`validateSetupToken`/`resendSetupEmail` controllers + routes + `setupPasswordSchema`, `passwordSetup` email template + `send.passwordSetup` wrapper, and the select-list mentions in `getMe`/`users.service`.
2. **`ScheduledExtraReminderModel`** — brief lists it as carrying `whitelabelId` but the model has NO such field (only the service passes it to `logAudit`). Confirm there is nothing to drop in the model.
3. **`checkFeature` (rbac.js)** — confirm whether it's mounted on any live route. If unused, the whole middleware can go; if used, its `if(whitelabelId)` branch is dead-but-harmless after removal.
4. **`plans.service.getWhitelabelPlans`** — no route in `plans.routes.js` references it. Confirm it's dead (delete) vs. invoked from an admin/whitelabel controller path.
5. **`admin.vendors.service` whitelabelId scoping (23 hits)** — vendors are a global marketplace; confirm the WL scoping there is fully vestigial so it can be dropped without changing vendor visibility.
6. **`domain` subdoc + unique partial subdomain index (UserModel)** — only `extractTenantContext` reads it. Dropping the field is safe, but the **unique partial index must be dropped from the live DB** (a migration step), not just the schema. Also `scripts/drop-subdomain-index.js` already exists — relevant to migration.
7. **`PLATFORM_ADMIN_ROLES`/`isPlatformAdmin`** — decide alias-vs-inline before editing the ~3 consumers.
8. **`email/templates/whitelabels.js::moderatorAdded`** — confirm the platform "moderator added" notification does NOT route through this WL template (it appears to be WL-moderator-specific; platform moderator creation in `admin.moderators.service` sends an in-app notification, not this email).

---

## 6. DATA MIGRATION note (first cut) — tag: DB-DATA

A "whitelabel" is a `User(role: whitelabel_admin)`; `whitelabelId` is a self/parent pointer. Existing documents across 8 collections carry it. Ordered plan:

1. **Inventory existing WL data (read-only first):**
   - `db.users.find({ role: { $in: ['whitelabel_admin','whitelabel_moderator'] } })` — the WL user docs themselves.
   - `db.users.find({ role: { $in: ['admin','moderator'] }, whitelabelId: { $ne: null } })` — **platform admins/mods carrying a non-null whitelabelId** (per H-23 comment + `seedTestUsers`; `audit-admin-whitelabel.js` exists precisely to surface these). On removal their access **broadens to platform-wide** — a deliberate, acceptable behaviour change, but call it out and review the list with Peter before dropping.
   - Counts of non-null `whitelabelId` on events/payments/subscriptions/notifications/tickets/post-event/audit-logs.
2. **Disposition of WL user documents** (brief explicitly requires this): choose per Peter — (a) hard-delete `whitelabel_admin`/`whitelabel_moderator` users (+ cascade their events/subs/payments?), or (b) convert survivors (e.g. a WL admin who should remain → `host`/`admin`), or (c) soft-deactivate (`status: deleted`). Must also handle their child hosts (currently `whitelabelId → wl._id`) — null the children's `whitelabelId`.
3. **Null-out / drop the field:** for every remaining doc set `whitelabelId` unset across the 8 collections; or simply drop the field after code no longer reads it. Either way **drop the indexes**: User `{whitelabelId:1,role:1}` + the `domain.subdomain` unique partial index; Event ×3; Subscription, Payment, Notification, Ticket, PostEventContent, AuditLog ×1 each. (Mongo will error on `ensureIndexes` mismatch otherwise; `scripts/drop-subdomain-index.js` is a precedent.)
4. **Whitelabel-only Plan documents:** delete Plan docs with `availableFor: 'whitelabel'` (seeded from `planDefaults.js`: business event/quarterly/annual) — and verify no live subscription references them; if any do, that subscription belonged to a WL admin (handled in step 2).
5. **Re-seed:** update `seedTestUsers.js` to create platform `admin`/`moderator` with `whitelabelId` unset (drop the WL-scoping); delete `createWhitelabelTestUsers.js`.
6. **Order:** ship code edits (stop writing `whitelabelId`) → run data migration (dispose users, null fields) → drop indexes → drop field/schema. Keep the audit script output as the pre-migration record.
