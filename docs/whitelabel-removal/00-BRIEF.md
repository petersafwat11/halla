# Whitelabel Removal — Mission Brief

**Goal:** Completely remove the white-label feature from the entire Halla product (web `labbe/`, mobile `halla-mobile/`, backend `labbe-backend-/`, shared contracts `shared/`, and the database). After this work there will be **no `whitelabel_admin` role, no `whitelabel_moderator` role, no whitelabel tenant-management feature, no whitelabel signup/setup flows, and no `whitelabelId` multi-tenancy field** anywhere.

## What "whitelabel" covers in this codebase

1. **Two roles** — `whitelabel_admin` and `whitelabel_moderator` (constants `WHITELABEL_ADMIN`, `WHITELABEL_MODERATOR`).
2. **Role-system helpers built around them** — `WHITELABEL_ROLES`, `isWhitelabelRole`, `PLATFORM_ADMIN_ROLES` (defined in opposition to whitelabel), role-hierarchy entries, `ADMIN_ROLES` membership.
3. **Tenant-management feature** — the super-admin pages under `admin-dash/whitelabels/**` that let platform admins create/manage whitelabel organisations and their hosts/plans/subscriptions.
4. **Whitelabel-scoped dashboard** — whitelabel users log into `admin-dash` with a filtered nav (`whitelabelNavItems`, `DASHBOARD_TYPES.WHITELABEL`, `whitelabel-dash` path, `getDashboardTypeFromPath`/`getBasePath` branches, `ROLE_NAV_ACCESS`/`ROLE_PAGE_ACCESS` entries for the two roles).
5. **Signup / onboarding** — `signup-whitelabel`, `setup-password` (whitelabel-invite password setup), `WhitelabelSignupScreen` (mobile), auth schemas for whitelabel signup.
6. **`whitelabelId` multi-tenancy field** — present on many Mongo models (User, Event, Payment, Subscription, Notification, Ticket, etc.), set on signup, used by middleware (`whitelabel.js`, `subscription.js`, `rbac.js`, `auth.js`) and queries to scope data to a tenant. **This is the riskiest item** — it may be load-bearing for non-whitelabel scoping and existing DB documents carry it.
7. **Supporting assets** — email templates (`whitelabels.js`), seed/audit scripts (`createWhitelabelTestUsers.js`, `audit-admin-whitelabel.js`, `seedTestUsers.js`), swagger docs, localization strings, audit-log/notification types.

## Known whitelabel-only frontend page trees (web; mobile mirrors these)
- `labbe/app/[lang]/admin-dash/whitelabels/**` — whitelabel tenant management (DELETE)
- `labbe/app/[lang]/signup-whitelabel/**` — whitelabel signup (DELETE)
- `labbe/app/[lang]/setup-password/**` — invite password setup (INVESTIGATE — confirm whitelabel-only)

## Shared / cross-cutting pages (whitelabel + other roles — EDIT, don't delete)
These admin-dash pages serve admins/moderators too; only the whitelabel branches get removed:
`create-event`, `events`, `hosts`, `manage-plans`, `moderators`, `payments`, `plans`, `post-event`, `tickets`, `update-event`, `admin-dash/page.js`.

## Classification vocabulary (every finding must be tagged)
- **DELETE-FILE** — file/folder exists *only* for whitelabel → remove entirely.
- **EDIT-FILE** — file is shared with other roles → strip only the whitelabel parts; must record *what other functionality the file serves* so we don't break it.
- **DB/DATA** — schema field, migration, or stored data implication.
- **INVESTIGATE** — ambiguous; needs Round-2 verification before classifying.

## Rounds
- **Round 1 (discovery):** four agents (web / mobile / backend+db / shared) produce inventories under `round1/`.
- **Round 2 (verification):** re-check Round-1 inventories — find missed dead code, confirm DELETE-vs-EDIT calls, trace cross-area dependency edges, verify no non-whitelabel functionality breaks. Output under `round2/`.
- **Final:** synthesized `FINAL_MIGRATION_PLAN.md` with ordered, safe steps.

## Hard rule
**No loss of external (non-whitelabel) functionality.** Every EDIT must preserve behaviour for `super_admin`, `admin`, `moderator`, `host`, `vendor`, `guest`.
