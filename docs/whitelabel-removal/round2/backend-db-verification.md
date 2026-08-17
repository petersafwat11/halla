# Whitelabel Removal — Round 2 Verification: BACKEND + DATABASE

**Verifier scope:** `D:\halla\labbe-backend-\` only. Read-only; this markdown is the sole output.
**Verifying:** `round1\backend-db-inventory.md`. Every load-bearing claim was independently re-grepped / re-read against source (file:line cited).

---

## 1. VERDICT

**YES — WITH CORRECTIONS.**

The Round-1 backend inventory is **substantially correct** on its central thesis (no `Whitelabel` model; a whitelabel is a `User(role: whitelabel_admin)`; `whitelabelId` is a self/parent pointer that is `null` on every real platform record, so dropping its query clauses is behaviour-preserving **iff** the data migration nulls the abnormal non-null records). The architecture facts, the DELETE/EDIT classifications, and the per-model blast-radius are all confirmed.

**Five corrections are required**, one of them HIGH-severity (the "business plans" / `availableFor:'whitelabel'` conflation, which as written would delete a live public product). Details in §3.

---

## 2. CONFIRMED CORRECT (re-verified against source)

- **No `Whitelabel`/`WhitelabelOrg` model.** `models/` has 24 models, none is a whitelabel org (dir listing). A "whitelabel" is a `User` with `role: 'whitelabel_admin'`; the self-ref is set at `auth.service.js:668` (`whitelabel.whitelabelId = whitelabel._id`). Confirmed.
- **`EventModel.whitelabelId` has the dangling `ref:"WhiteLabel"`** (EventModel.js:289). Also `PostEventContentModel.js:237` and `AuditLogModel.js:93` use `ref:"WhiteLabel"`; `UserModel/Subscription/Payment/Notification/Ticket` use `ref:"User"`. Latent bug, harmless, dies with the field.
- **Real platform users carry `whitelabelId = null`.** All three public signup paths create users WITHOUT setting `whitelabelId` (defaults to null): `signupHost` (auth.service.js:408–432), `signupVendor` (auth.service.js:573–582), `verifySignupOTP` (auth.service.js:874–895). Confirmed — this is the load-bearing fact for the whole removal.
- **The ONLY non-null `whitelabelId` producers** are: (a) `signupWhitelabel` self-ref (auth.service.js:668); (b) `admin.hosts.service.createHost` `whitelabelId: whitelabelId||null` (L222) + `findOrCreateHost` (L464); (c) `admin.moderators.service.createModerator` (L127); (d) `seedTestUsers.js` scoping platform admin+moderator to the WL admin id. Confirmed.
- **`filterByWhitelabel` is the linchpin** (whitelabel.js:14–72) and its output `req.whitelabelFilter` is consumed by every admin read via `getWhitelabelIdFromFilter` (admin.controller.shared.js:17). Confirmed.
- **`subscription.js` coupled edit** — `isAdminRole(role) && !whitelabelId` at L25, L101, L156 (exactly 3 spots). Confirmed. Net effect after coupled removal (drop `!whitelabelId`, drop WL from `ADMIN_ROLES`) is unchanged for platform admins. Confirmed safe.
- **`admin.moderators.service.js` conflates platform + WL roles** (L148, L194, L226, L249, L286, L302 carry the 4-role `$in`; L25/L276/L303 branch on null). Confirmed; highest care needed but the platform branch is preserved by collapsing to `{role:{$in:[MODERATOR,ADMIN]}}`.
- **`auth.js` sets `req.whitelabelId`/`req.tenant`/`req.isWhitelabel`** (L138, L142–143, L176, L179–180) + `extractTenantContext` (L195–263, with the `halaa.sa` subdomain + customDomain `User`/role:whitelabel_admin lookups) + `validateTenant` (L268–284). The `.populate("whitelabelId", "identity.names domain status")` is at **L92** (inventory said L92 — correct). Confirmed.
- **`req.tenant`/`req.isWhitelabel`/`req.whitelabelId`/`req.currentWhitelabelId` consumers** = ONLY `auth.js` (sets), `auditLog.js:110` (reads `req.whitelabelId`), `validateTenant` (reads `req.tenant`/`req.whitelabelId`). No hidden consumer. Confirmed clean.
- **`ScheduledExtraReminderModel` has NO `whitelabelId` field** (grep = no match; field-level indexes at L36/42/49/64/69 are unrelated). INVESTIGATE #2 resolved: nothing to drop in the model; only the *service* passes `whitelabelId` to `logAudit`.
- **`checkFeature` is NOT mounted on any route.** Only two references exist: definition `rbac.js:211` + re-export `middleware/index.js:23`. No `checkFeature(` invocation anywhere. INVESTIGATE #3 resolved: the whole middleware is dead and can be deleted (not merely simplified).
- **DELETE-file importer sweep (Q5)** — confirmed below in §4.5; no non-WL `require()` breaks.
- **15-ish whitelabel indexes + subdomain index** exist (the inventory's "13" is an undercount — see §3 correction E and §5 enumeration).

---

## 3. CORRECTIONS

### A. **HIGH — "Business plans" are a LIVE PUBLIC PRODUCT tagged `availableFor:'whitelabel'`; the migration as written would delete them.**
The inventory (§2 plans.service row + Open-Q#4) calls `plans.service.getWhitelabelPlans` "likely dead, delete," and migration step 4 says "delete Plan docs with `availableFor:'whitelabel'` (business event/quarterly/annual)." Both are wrong:

- The function is named **`getBusinessPlans`**, not `getWhitelabelPlans` (plans.service.js:33). There is **no** `getWhitelabelPlans`.
- It is **NOT dead.** It is mounted on a **public, unauthenticated** route `GET /plans/business` (plans.routes.js:314, `security: []`), exposed via `plans.controller.js:33`, AND invoked by `getLandingPlans` (plans.service.js:364) which serves the marketing landing page.
- It queries `availableFor:'whitelabel'` (plans.service.js:35) for `planType ∈ {business_event, business_quarterly, business_annual}` — the **"هلا أعمال / Halaa Business"** customer product (planDefaults.js:204–313; 6 event tiers + quarterly + annual = 8 plan defs, all `availableFor: PLAN_AVAILABILITY.WHITELABEL`).

**Corroboration:** the shared inventory (§4d) independently warns the "هلا أعمال/managed" plan types are "unrelated to whitelabel, do NOT touch."

**Impact / fix (flag — not for me to resolve, read-only):** Do **NOT** delete `availableFor:'whitelabel'` Plan docs, do **NOT** remove `PLAN_AVAILABILITY.WHITELABEL` from `constants/plans.js`, and do **NOT** delete the business plan defs in `planDefaults.js` — all three would break the public `/plans/business` + `/plans/landing` endpoints. **Recommended disposition:** retag the 8 business plans to a NEW non-WL availability value (e.g. `'business'` or `'public'`) and migrate the enum + the `getBusinessPlans` query in lockstep with shared `availabilityEnum`. This is cheap because `planFamily:'business'` + `planType ∈ business_*` already uniquely discriminate these plans — the `'whitelabel'` availability tag is **redundant** for the query and is purely a legacy/overloaded value. NOTE: this is the `availableFor` axis and is **entirely separate** from the `whitelabelId` axis — `PlanModel` has no `whitelabelId` field. Keep the two stories distinct.

### B. **MED — `admin.controller.shared.js` doc-comment is stale; the `length===0 → undefined` branch is effectively dead, and super_admin gets `whitelabelId:null` (not "no filter").**
The doc-comment (admin.controller.shared.js:7–9) claims super_admin → `req.whitelabelFilter = {}` → `getWhitelabelIdFromFilter` returns `undefined` ("sees everything"). The **live** middleware sets super_admin → `req.whitelabelFilter = { whitelabelId: null }` (whitelabel.js:29), so `getWhitelabelIdFromFilter` returns **`null`**, and downstream admin services apply `query.whitelabelId = null`. Because `filterByWhitelabel` *always* sets a single-key `{whitelabelId: …}` object (whitelabel.js:29/44/58/65/68 — every branch assigns one key), the `if (Object.keys(filter).length === 0) return undefined` branch (admin.controller.shared.js:19) is **effectively dead on every route that mounts `filterByWhitelabel`** (it would only fire if some admin route called `getWhitelabelIdFromFilter` *without* the middleware mounted, leaving `req.whitelabelFilter` undefined — that `!filter` sub-condition is the actual live guard, not `length===0`). This does **not** change safety (real records are all null, so the null-equality returns the same set the post-removal no-clause query returns), but the inventory's §3 line *"SUPER_ADMIN→{whitelabelId:null} (= 'show all' to downstream)"* is **wrong**: for the equality-shaped admin services it scopes super_admin to null-only records, not "all." (The only place a literal "skip on null" happens is `getAllEvents`, the null-skip shape — see §4.2.) Correct the reasoning; the conclusion stands.

### C. **LOW — `setup-password` is NOT INVESTIGATE; it is definitively WL-only and fully DELETE-able.** (Inventory marked it INVESTIGATE / "likely-DELETE.") See the definitive verdict in §4.3. Upgrade the classification from INVESTIGATE to DELETE.

### D. **LOW — `admin.vendors.service` scoping is NOT "never executed" vestigial — it currently DOES apply `whitelabelId:null` to platform-admin vendor reads; it is vestigial only because all vendors are null.** `getVendors` (admin.vendors.service.js:24) and `getVendorById` (L77) apply `query.whitelabelId = whitelabelId` whenever `whitelabelId !== undefined`. The controller threads `getWhitelabelIdFromFilter(req)`, which returns `null` for platform admins (not `undefined`) — so the clause **is** added (`whitelabelId: null`). It just happens to match every vendor (all signed up with no WL). Net: dropping the 23 hits is safe and does NOT change vendor visibility (confirmed: `signupVendor` sets no whitelabelId). Conclusion unchanged; the *reason* in the inventory ("likely vestigial / never scope vendor reads") is imprecise — they ARE applied, but inert.

### E. **MED — Index count is WRONG: there are ~15 whitelabelId indexes + 1 subdomain index = ~16, not "13."** Mongoose emits a separate index for each field-level `index:true` **and** each `schema.index(...)`. Five models declare `index:true` on the `whitelabelId` field itself (a standalone `{whitelabelId:1}` index) **in addition** to a compound. The inventory collapsed "field+index" into one. Full enumeration with file:line in §5.

### F. **Independent-sweep MISSES (files/symbols in code but absent or under-described in Round 1):**
- **`email/templates/vendors.js`** (`vendorApprovalEmail`, L101) — **MISSED entirely by Round 1.** It has a conditional `data.setupPasswordUrl ? "Set Up Password" : "Go to Dashboard"` branch (L124–144) and `email/index.js:275` documents `setupPasswordUrl` in its param list. This is a **red herring that must be called out**: the live caller `admin.vendors.service.js:180` passes only `{vendorName, brandName, status, dashboardUrl}` — **never** `setupPasswordUrl` — so the falsy branch always renders. The `setupPasswordUrl` plumbing in `vendors.js` is dead template parameter; it does NOT mint a token and does NOT make setup-password non-WL. Recommend deleting the dead `setupPasswordUrl` branch from `vendorApprovalEmail` while removing the setup-password feature (optional cleanup, LOW).
- **`models/NotificationPreferencesModel.js`** — **MISSED by Round 1 entirely** (it only listed the *shared* notification-preference schemas). The backend model has `whitelabel_admin`/`whitelabel_moderator` in a role enum (L36–37) **and** switch-cases mapping those roles to notification-preference defaults (L168–169, L205–206). Real EDIT site: remove the 2 enum members + the 2 `case "whitelabel_admin": case "whitelabel_moderator":` blocks. LOW-MED.
- **`models/NotificationModel.js:46`** — `WHITELABEL_REGISTERED: "whitelabel_registered"` notification-TYPE enum member. Round-1's NotificationModel row noted the `whitelabelId` field + `createForRole` but NOT this type. **This is the definitive answer to shared inventory Open-Q#5:** yes, the `whitelabel_registered` type is defined here and should be removed — which makes the shared `NOTIFICATION_ICON_MAP` `whitelabel_registered` removal correct/consistent. LOW.
- **`models/TicketModel.js:137 & 163`** — Round-1's TicketModel row covered the field/index/populate but MISSED that the model **also** contains WL-source logic: a pre-save hook auto-setting HIGH priority `if (this.source === TICKET_SOURCE.WHITELABEL)` (L137) and a static query `{ source: TICKET_SOURCE.WHITELABEL }` (L163). These must be stripped along with `TICKET_SOURCE.WHITELABEL` (status.js:174 region) and the service's local copy (tickets.service.js:31/60). LOW-MED.
- **`getBusinessPlans` second caller** `getLandingPlans` (plans.service.js:364) — not noted in Round 1; relevant to correction A.

**Round-1 INVESTIGATE items in §F/§G now resolved by reading the files:**
- **`events.settings.service.js`** — `whitelabel` appears ONLY in a doc-comment (L120: "works for admin / whitelabel-admin / whitelabel-moderator"). Scope is delegated to `_buildScopedEventQuery` (events.crud) — there is **no independent WL branch here**. Comment-only EDIT. Confirms Round-1 LOW.
- **`email/templates/reports.js`** — has a live-looking WL branch: `stats.pendingWhitelabels` renders a "whitelabel applications pending approval" block in the admin report (L95, L114, L119–120). **But no service anywhere populates `stats.pendingWhitelabels`** (grep of `src/` + `email/` = zero producers), so the branch evaluates `undefined > 0` → always falsy → **dead at runtime today**. EDIT: remove the `pendingWhitelabels` block + the `|| stats.pendingWhitelabels > 0` condition. LOW.

**Named-sweep closure (brief's symbol list):**
- `WHITELABEL_ROLES` backend consumers = `admin.events.controller.js` (L12/39/150), `admin.events.service.js` (L11/146/171), `middleware/whitelabel.js` (L8/34) — all already inventoried (EDIT/DELETE).
- `isWhitelabelRole` — **zero** backend consumers (defined in roles.js, never imported in backend). The shared copy has frontend consumers (shared inventory) but the backend export is dead.
- `manage_whitelabels`/`MANAGE_WHITELABELS` — only permissions.js:19 (the permission) + permissions.js:259 (`PERMISSION_TO_PAGE` mapping → `ADMIN_PAGES.WHITELABELS`). Inventoried.
- `req.tenant`/`req.isWhitelabel`/`req.whitelabelId`/`req.currentWhitelabelId` — consumers = auth.js (sets), auditLog.js:110 (reads), validateTenant (reads) only. Inventoried.

With those two files read, the rest of the 95-file grep reconciles 1:1 with the Round-1 inventory (the only true MISSES are the items listed in this §3-F: `vendors.js` dead `setupPasswordUrl` branch, `NotificationPreferencesModel.js`, `NotificationModel.js:46` type enum, `TicketModel.js:137/163` hook+static, and `getLandingPlans`).

---

## 4. DEFINITIVE ANSWERS TO THE 5 CROSS-AREA QUESTIONS

### Q1 — Is there any other collection/ref modelling whitelabel orgs?
**No.** Re-read `models/` (24 models). No `Whitelabel` model. A whitelabel org is `User(role:'whitelabel_admin')` (self-ref `whitelabelId=_id` at auth.service.js:668). The dangling `ref:"WhiteLabel"` strings (EventModel:289, PostEventContentModel:237, AuditLogModel:93) point at a **non-existent** model and are never `.populate()`d as such — harmless, removed with the fields. CONFIRMED correct.

### Q2 — Is `whitelabelId` SAFE TO DROP? (whitelabelId blast radius PER ROLE)

**Verdict: SAFE TO DROP — *conditional* on the data migration nulling the abnormal non-null `admin`/`moderator`/`host` records first.** "Drop the clause" is behaviour-preserving **only** because every real record's `whitelabelId` is `null`. The blast radius is entirely about records that abnormally carry a non-null value (seed + WL onboarding).

There are **three** query shapes (all re-verified by reading the files), each of which reduces to "drop the clause":
- **(1) Equality shape** (the common one): `query.whitelabelId = X` where `X = caller's whitelabelId` (or `null`), applied via `if (whitelabelId !== undefined)` or a `...whitelabelFilter` spread. Sites verified: `admin.hosts.service` (L29 etc.), `admin.moderators.service` (L25/L276/L303), `admin.vendors.service` (L24/L77), `admin.payments.service` (L47/L63/L126/L168), `admin.events.service`, `dashboard.service` spreads (`...whitelabelFilter` at dashboard.service.js:120–133+), `_buildScopedEventQuery` (events.crud.service.js:217), `guests.service` getEventGuests (L186), `post-event.service` buildScopedEventQuery (L84), `notifications.broadcast` (L441). Real callers pass `null` → matches null records.
- **(2) Null-skip shape** (the ONE place "null" is treated as "no filter"): `getAllEvents` (events.crud.service.js:319–329) — `if (whitelabelFilter.whitelabelId !== undefined && !== null) {host $in WL hosts}`; `null` is **skipped** → admins see ALL events via no host filter.
- **(3) Null-OR-not-exists shape**: `notifications.sendToAdmins` (notifications.service.js:165–172) — `$or:[{whitelabelId:null},{whitelabelId:{$exists:false}}]` to target platform admins. After removal, drop the `$or` → all admins of the role qualify (correct).

All three reduce to "drop the clause." (The Round-1 inventory characterised these as "two code shapes"; there are three, but the safe transform is identical for all.)

| Role | Query BEFORE removal | Query AFTER removal | Change? |
|---|---|---|---|
| **super_admin** | Admin list services: `whitelabelId:null` equality (filterByWhitelabel sets `{whitelabelId:null}`, whitelabel.js:29 → getWhitelabelIdFromFilter returns `null`). `getAllEvents`: null is skipped → all events. Per-event `_buildScopedEventQuery`: SUPER_ADMIN → no scope (sees any, events.crud:202–204). | All clauses dropped → sees all. | **No change** (null-only set == all, since every real record is null). The stale doc-comment claims super_admin already saw "all" via `undefined`; in reality it saw null-only on the equality services. End state is identical to today's effective result. |
| **admin (whitelabelId = null)** | Admin list services: `whitelabelId:null` equality → platform records only. `getAllEvents`: null skipped → all events. Per-event reads (`getEventById`/guests/post-event): role ∈ tenantScoped + `!whitelabelId` ⇒ **403 fail-closed** *by the code as written* (events.crud:212–215, guests:181–185, post-event:79–83) — i.e. a null-whitelabelId admin *would* 403 on these per-event endpoints. | All clauses dropped; admin removed from `tenantScoped` → sees any event; list services unscoped → all platform records. | **No change for list/dashboard reads.** **Per-event reads BROADEN from a (code-deduced) 403-fail-closed to "see all"** — a deliberate, correct fix: if real admins carry null whitelabelId, they currently cannot open a single event/guest/post-event view, and after removal they can. Flag as intended behaviour gain. (Whether the 403 is observed in production depends on the same "do real admins carry null?" premise as the rest of this table.) |
| **moderator (whitelabelId = null)** | Same as admin. `admin.moderators.service.getModerators` (L28–30): `{role:{$in:[MODERATOR,ADMIN]}, whitelabelId:null}` → platform mods/admins only. | `{role:{$in:[MODERATOR,ADMIN]}}` (drop whitelabelId) → identical set. Per-event: same broadening as admin. | **No change** for listings (identical set). Per-event broadens (same fix as admin). |
| **admin / moderator with a NON-NULL whitelabelId** (seed `seedTestUsers.js:320/335`, or onboarded under a WL) | Tenant-scoped: sees ONLY their tenant's data. | All clauses dropped → sees ALL platform data. | **BROADENS — THIS IS THE REAL BLAST RADIUS.** Must be addressed by the data migration (null these records). Until nulled, shipping code first creates a transient window where such an admin sees platform-wide data. Acceptable for a deletion, but call it out (see §6). |
| **host (whitelabelId = null, normal signup)** | `getMyEvents` keys on `host: req.user._id`; the `filterByWhitelabel` mount on `/my-events` + `/stats` sets a filter that host queries don't use. `_buildScopedEventQuery`: host → `host: userId` (events.crud:187–189 equivalent). | Filter removed; host queries unchanged. | **No change** (filter was inert for hosts). |
| **host under a WL (whitelabelId = wl._id)** | Same `host: userId` keying; whitelabelId never narrows a host's own-event query. | Unchanged. | **No change** functionally; their parent WL admin disappears (migration nulls their `whitelabelId`). |
| **vendor** | `signupVendor` sets no whitelabelId. `admin.vendors.service` applies `whitelabelId:null` for platform-admin reads (inert — all vendors null). | Clause dropped. | **No change** (correction D). |
| **whitelabel_admin / whitelabel_moderator** | Tenant-scoped everywhere. | **Roles deleted; user docs disposed in migration.** | N/A (removed). |

**`subscription.js` (gate, not filter):** `isAdminRole(role) && !whitelabelId` at L25/L101/L156. For a null-whitelabelId platform admin, `!whitelabelId === true` → `isPlatformAdmin = isAdminRole(role)`. After the coupled edit (drop `!whitelabelId` term **and** drop WL from `ADMIN_ROLES`): `isPlatformAdmin = isAdminRole(role)`. **No change** — super_admin/admin/moderator bypass limits, host/vendor still gated. CONFIRMED safe; must be done as one coupled change (a partial edit that drops the field but leaves WL in `ADMIN_ROLES` would wrongly grant a former-WL role a bypass).

**`guests.service` (access gate, not filter):** `isWhitelabelAdmin` OR-clauses in QR rotate/revoke (L421–426, L515–519) are pure additive `|| isWhitelabelAdmin`. Removing them leaves `!isHost && !isAdmin` → host + ADMIN/SUPER_ADMIN paths preserved exactly. CONFIRMED safe.

**Bottom line for Q2:** No non-whitelabel role's data scope changes **for null-whitelabelId records** (which is every real record). The only scope changes are (1) a deliberate, beneficial broadening of admin/moderator **per-event** reads from a current 403-fail-closed to "see all," and (2) the genuine broadening of any abnormally-scoped admin/moderator/host record — which the migration neutralises by nulling those records before/with the schema drop.

### Q3 — setup-password verdict (backend owns the truth)

**VERDICT: the ENTIRE setup-password feature can be DELETED.** No non-whitelabel flow mints or depends on a `passwordSetupToken`.

`createPasswordSetupToken()` (the sole minter, UserModel.js:595–604) is called in **exactly two** places (grep-verified, whole backend):
1. **`admin.whitelabels.service.js:183`** — WL approval (`updateWhitelabelStatus`). This file is DELETE.
2. **`auth.controller.js:593`** — `resendSetupEmail` (a PUBLIC route: auth.routes.js:572–576, only `passwordResetLimiter` + Zod, no `protect`). Its guard `if (user.password && !user.passwordSetupToken) throw` (L587) blocks only the `(has-password AND no-token)` case; it **proceeds for any passwordless user**. ⚠️ **This means it CAN mint a setup token for a non-WL passwordless host** — e.g. an OTP-signup host (`verifySignupOTP` creates a HOST with no `password`, auth.service.js:874–895). So the minter is NOT strictly WL-only.
   **However the feature is still fully DELETE-able**, because the resend path is **redundant**, not load-bearing. The clinching fact: **both `resendSetupEmail` and `forgotPassword` are email-keyed** (each does `User.findOne({email})` — auth.controller.js:580, auth.service.js:1039). A pure OTP-signup host has **no email** (verifySignupOTP sets none), so neither path can reach them — and they don't need a password (they OTP-login). Any user who *does* have an email is fully covered by the standard **forgot-password / reset-password** flow, which works for users with no existing password (`forgotPassword` mints a reset token for any user with an email — auth.service.js:1038–1063; `resetPassword` sets `user.password` regardless of a prior value — auth.service.js:1095). No product flow ever *directs* a non-WL user to `/setup-password` or sends them a setup link: `createHost`/`createModerator` set passwords inline, public host/vendor signup sets a password. Deleting setup-password removes **no unique capability for any cohort**. **Net: deletable — justification is "redundant with forgot-password," NOT "the guard blocks non-WL users" (it does not).**

Non-WL invite flows do NOT use it:
- **Hosts:** `createHost` sets `whitelabelId||null` and a real `password` (admin.hosts.service.js:214–222); public host signup sets a password directly. No token.
- **Moderators:** `createModerator` sets `password` **inline** at User.create (admin.moderators.service.js:119–127). No token, no setup link.
- **Vendors:** `signupVendor` sets a `password` (auth.service.js:576); approval email passes **no** `setupPasswordUrl` (admin.vendors.service.js:180–185). The `setupPasswordUrl` branch in `vendorApprovalEmail` (vendors.js:124) is **dead** template plumbing (see §3-F).
- The `setupPassword` controller comment itself says "activate the **whitelabel** account" (auth.controller.js:547).

**Surviving non-WL password path (must remain):** the standard **forgot-password / reset-password** flow (auth.service.js:1038/1073; routes intact) is the path any passwordless OTP host uses to set a password. It does NOT depend on the setup-password feature. Keep it.

**Safe to delete in full:** backend `validateSetupToken`/`setupPassword`/`resendSetupEmail` (auth.controller.js:495–611) + routes (auth.routes.js:508, 540–543, 575–576) + `setupPasswordSchema`/`resendSetupEmailSchema` (auth.validation.js:166, 181, exports 205/207) + `passwordSetupToken`/`passwordSetupExpires` fields (UserModel.js:297–298) + `createPasswordSetupToken` method (UserModel.js:595–604) + the `toJSON` deletes (UserModel.js:756–757) + the select-list mentions (`getMe` auth.service.js:1173, users.service.js:54) + the `passwordSetup` email template + `send.passwordSetup` wrapper. (Web `setup-password/**` + mobile screen are other agents' scope; the shared `paths.js` INVESTIGATE block → DELETE.)

### Q4 — Dead-code confirmations
- **`getWhitelabelPlans` unreferenced?** — **Mis-stated by Round 1.** No such function. The real `getBusinessPlans` is LIVE on a public route. See correction A. **Not dead; do not delete.**
- **`checkFeature` mounted anywhere?** — **No.** Only definition (rbac.js:211) + re-export (middleware/index.js:23). No invocation. Confirmed dead → the whole `checkFeature` middleware can be deleted (stronger than the inventory's "simplify to always-allow").
- **`admin.vendors.service` 23 `whitelabelId` hits vestigial?** — Yes, safe to drop, BUT they ARE applied (`whitelabelId:null`) for platform-admin reads, not "never executed." Inert because all vendors are null. See correction D. Vendor visibility unchanged after removal.
- **`ScheduledExtraReminderModel` has a `whitelabelId` field?** — **No.** Grep = no match. Nothing to drop in the model; only the service passes `whitelabelId` to `logAudit`. INVESTIGATE #2 resolved.

### Q5 — DELETE-file safety (importer / route-mount sweep)
Grep for importers of all 7 DELETE targets, outside the WL feature itself:

| DELETE file | External references found | Safe? |
|---|---|---|
| `middleware/whitelabel.js` | Imported by: `admin.events.routes.js:7`, `admin.hosts.routes.js:7`, `admin.moderators.routes.js:7`, `admin.payments.routes.js:7`, `admin.vendors.routes.js:7`, `admin.whitelabels.routes.js:7`, `events.admin.routes.js:14`, `events.routes.js:36`, `dashboard.routes.js:19` (`whitelabelIsolation`), and `middleware/index.js` re-export. **ALL are EDIT sites** (remove the import + the `filterByWhitelabel`/`whitelabelIsolation`/`injectWhitelabel` mounts). None is a non-WL functional dependency. | **Safe** once those routes drop the mounts (already inventoried as EDITs). |
| `admin.whitelabels.routes.js` | Mounted only at `admin.routes.js:23` (`router.use(require('./admin.whitelabels.routes'))`) — that line is an **EDIT** (delete L23). | Safe. |
| `admin.whitelabels.controller.js` | Merged only at `admin.controller.js:9` (`Object.assign(exports, require('./admin.whitelabels.controller'))`) — **EDIT** (delete L9). | Safe. |
| `admin.whitelabels.service.js` | Required only at `admin.service.js:10` (`const whitelabels = require('./admin.whitelabels.service')`) — **EDIT** (remove that line + any `whitelabels` re-export in the barrel). | Safe. |
| `email/templates/whitelabels.js` | Imported at `email/templates/index.js:11` (+ category/registry entries) — **EDIT**. | Safe. |
| `scripts/createWhitelabelTestUsers.js` | No importer (only its own usage doc-comment, L5). | Safe (standalone script). |
| `scripts/audit-admin-whitelabel.js` | No code importer; only a doc-comment cross-reference in `seedTestUsers.js:290`. | Safe (standalone script). |

**One EDIT not to miss:** `admin.service.js:10` requires the WL service (`const whitelabels = require('./admin.whitelabels.service')`) — Round-1 marked `admin.service.js` as "(verify) thin barrel." **Confirmed: it re-exports the WL service**; the require line must be removed (EDIT, not delete). All 7 DELETEs are safe; the mount/merge/require lines are EDITs already (mostly) catalogued.

---

## 5. VERIFIED DATA-MIGRATION CHECKLIST

### Collections carrying `whitelabelId` (8) — confirmed field present
1. `users` (UserModel.js:343) · 2. `events` (EventModel.js:287) · 3. `subscriptions` (SubscriptionModel.js:142) · 4. `payments` (PaymentModel.js:80) · 5. `notifications` (NotificationModel.js:98) · 6. `tickets` (TicketModel.js:61) · 7. `posteventcontents` (PostEventContentModel.js:235) · 8. `auditlogs` (AuditLogModel.js:91).
- `StaffAccessTokenModel` — **no own field**; only a `.populate(... "host status whitelabelId")` select string (StaffAccessTokenModel.js:130) reading Event's field. Drop the token from that string only.
- `ScheduledExtraReminderModel` — **no field** (correction confirmed).
- `PlanModel` — **no `whitelabelId` field**; carries `availableFor:'whitelabel'` data only (the `availableFor` axis — see correction A).

### Indexes to DROP — ~16 total (NOT 13). file:line of each definition:
**Field-level `index:true` on `whitelabelId` (each = a standalone `{whitelabelId:1}` index):**
1. UserModel.js:347
2. PaymentModel.js:84
3. NotificationModel.js:102
4. TicketModel.js:65
5. AuditLogModel.js:94

**Explicit compound/single `schema.index({whitelabelId...})`:**
6. UserModel.js:409 — `{whitelabelId:1, role:1}`
7. EventModel.js:444 — `{whitelabelId:1}`
8. EventModel.js:445 — `{whitelabelId:1, host:1}`
9. EventModel.js:446 — `{whitelabelId:1, status:1}`
10. SubscriptionModel.js:171 — `{whitelabelId:1, status:1}`
11. PaymentModel.js:180 — `{whitelabelId:1, status:1, createdAt:-1}`
12. NotificationModel.js:251 — `{whitelabelId:1, type:1, createdAt:-1}`
13. TicketModel.js:128 — `{whitelabelId:1, status:1}`
14. PostEventContentModel.js:250 — `{whitelabelId:1}`
15. AuditLogModel.js:159 — `{whitelabelId:1, timestamp:-1}`

**Plus the subdomain index (the `domain` subdoc):**
16. UserModel.js:419–421 — `{"domain.subdomain":1}` `unique` + `partialFilterExpression:{ "domain.subdomain": {$type:"string"} }`.

> EventModel, SubscriptionModel, PostEventContentModel have the field but **no** field-level `index:true` (verified L287–291 / L142–146 / L235–239) — their only whitelabelId indexes are the explicit ones above. So the count is 5 (field-level) + 10 (explicit whitelabelId) + 1 (subdomain) = **16**. The inventory's "13" undercounts by ~3 (the field-level singles that coexist with a compound). A dedicated drop script is warranted — precedent `scripts/drop-subdomain-index.js` already exists for the subdomain index specifically; extend the same pattern for the rest (Mongoose `syncIndexes`/`ensureIndexes` will otherwise error on the mismatch, or silently leave orphaned indexes).

### Document dispositions (read-only inventory first, decide with Peter)
1. **WL user docs:** `db.users.find({role:{$in:['whitelabel_admin','whitelabel_moderator']}})` → hard-delete vs convert (→host/admin) vs soft-deactivate. Cascade their child hosts.
2. **Abnormal platform docs (THE Q2 blast radius):** `db.users.find({role:{$in:['admin','moderator']}, whitelabelId:{$ne:null}})` — these are the records that BROADEN on removal. Null their `whitelabelId` (this is what `scripts/audit-admin-whitelabel.js` was built to surface — keep its output as the pre-migration record).
3. **Child hosts:** `db.users.find({role:'host', whitelabelId:{$ne:null}})` → set `whitelabelId` unset.
4. **Null-out / drop the field** across all 8 collections.
5. **Plan docs — CORRECTION A:** Do **NOT** delete `availableFor:'whitelabel'` plans. **Retag** the 8 business plans (`business_event`×6, `business_quarterly`, `business_annual`) to a new non-WL availability value, in lockstep with `getBusinessPlans`, `constants/plans.js`, `planDefaults.js`, and shared `availabilityEnum`. Only after that is the `'whitelabel'` availability value safe to retire. (Verify no live subscription references a true WL plan; any that does belonged to a WL admin handled in step 1.)
6. **Re-seed:** edit `seedTestUsers.js` to create platform `admin`/`moderator` with `whitelabelId` **unset** (drop the WL-scoping at L320/L335); delete `createWhitelabelTestUsers.js`.

### Safe ORDER (confirmed correct)
**ship code (stop reading/writing `whitelabelId`, drop WL from `ADMIN_ROLES` in the SAME deploy as the subscription.js edit) → migrate data (dispose WL users, null abnormal admin/mod/host records, retag business plans) → drop indexes (dedicated script, ~16 indexes) → drop schema fields.**
Caveat to surface: shipping code before the data migration creates a transient window in which any abnormally-scoped (`whitelabelId != null`) admin/moderator sees platform-wide data and per-event admin reads broaden. Both are acceptable for a feature deletion, but should be an explicit, signed-off step — ideally run the data migration immediately after the code deploy.

---

## 6. SUMMARY OF CORRECTED COUNTS

| Metric | Round-1 said | Verified |
|---|---|---|
| Files matching `whitelabel\|white-label\|tenant` | 95 | **95** ✓ |
| DELETE-FILE | 7 | **7** ✓ (middleware/whitelabel.js; admin.whitelabels.{service,routes,controller}.js; email/templates/whitelabels.js; createWhitelabelTestUsers.js; audit-admin-whitelabel.js). **+`checkFeature` middleware is also fully deletable** (not just simplifiable) — though it lives inside the shared `rbac.js` (EDIT the file, delete the export). |
| whitelabelId indexes to drop | 13 | **~16** (15 whitelabelId + 1 subdomain) — see §5 |
| `getWhitelabelPlans` dead code | "delete" | **WRONG** — it's `getBusinessPlans`, LIVE on public `/plans/business` + `/plans/landing` |
| setup-password | INVESTIGATE | **DELETE** (definitively WL-only) |
| Models with WL field | "9 (8 field + 1 ref-only)" | **8 fields + StaffAccessToken (populate-string only) + ScheduledExtraReminder (NO field) + PlanModel (`availableFor` data only)** ✓ |
| Missed files | — | `email/templates/vendors.js` (dead `setupPasswordUrl` branch), `NotificationPreferencesModel.js` (verify WL pref keys), `getLandingPlans` caller |
