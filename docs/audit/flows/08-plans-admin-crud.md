# 08 — Plans Admin CRUD

## Overview
Admin manages subscription plans: create, read, update, delete. Plans define guest limits, features, pricing, and billing type. Currently only `PATCH /admin/:code` exists; POST (create) and DELETE are missing. Plan codes are hardcoded in `src/shared/constants/plans.js` and seeded via `scripts/seedPlans.js`. Peter decided plans must become fully admin-editable with CRUD endpoints.

## Scope tags
- admin-only operations (SUPER_ADMIN role)
- plan lifecycle: create, read, update, deactivate
- billing types: event, monthly, quarterly, annual
- plan families: basic, premium, business
- pricing and feature toggles

## Roles involved
- SUPER_ADMIN: full CRUD + whitelabel assignment
- WHITELABEL_ADMIN: view only (read own assigned plans)
- HOST: read-only (see available plans)

## Entry points
- Backend: `labbe-backend-/src/modules/plans/plans.routes.js:24–25` (GET all, PATCH by code)
- Backend Controller: `labbe-backend-/src/modules/plans/plans.controller.js:69–81` (getAllPlansAdmin, updatePlanByCode)
- Backend Service: `labbe-backend-/src/modules/plans/plans.service.js:115–139` (getAllPlansAdmin, updatePlanByCode)
- Mobile admin dashboard: `halla-mobile/components/admin-dashboard/plans/index.js` (imports PlanList, EditPlanModal, PlanTabs)
- Mobile plan list: `halla-mobile/components/admin-dashboard/plans/PlanList.js:13–49`
- Mobile plan item: `halla-mobile/components/admin-dashboard/plans/PlanListItem.js` (render per-plan edit button)
- Mobile edit modal: `halla-mobile/components/admin-dashboard/plans/EditPlanModal.js` (form + submit)
- Seed script (reference): `labbe-backend-/scripts/seedPlans.js:25–37` (creates plans via Plan.create)
- Plan model: `labbe-backend-/models/PlanModel.js` (schema validation)
- Plan constants: `labbe-backend-/src/shared/constants/plans.js:1–48` (PLAN_TYPES, PLAN_CODES, PLAN_FAMILIES, BILLING_TYPES)

## Exit / terminal states
- Plan created (active, public, visible in API)
- Plan updated (live pricing/features/limits change immediately)
- Plan deactivated (`isActive: false`, no longer returned by public endpoints)
- Plan deletion (soft-delete via `isActive: false` or hard delete if never subscribed to)
- Plan reassignment (switch whitelabel partner from one plan tier to another)

## Touched modules (by repo)
### labbe-backend-
- `src/modules/plans/plans.routes.js` (add POST /admin, DELETE /admin/:code)
- `src/modules/plans/plans.controller.js` (add createPlan, deletePlan)
- `src/modules/plans/plans.service.js` (add createPlan, deletePlan validation)
- `src/modules/plans/index.js` (export routes)
- `models/PlanModel.js` (ensure schema allows all editable fields)
- `src/shared/constants/plans.js` (NOT hardcoded—move plan config to seedPlans or admin-created defaults)
- `scripts/seedPlans.js` (seed only if no plans exist in DB)

### labbe-
- `app/admin-dash/` (find or create plans management page)
- Web UI: plans list + create modal + edit modal + delete confirmation

### halla-mobile-
- `components/admin-dashboard/plans/PlanList.js` (already renders list + onEdit callback)
- `components/admin-dashboard/plans/PlanListItem.js` (add delete button)
- `components/admin-dashboard/plans/EditPlanModal.js` (handle create vs edit modes)
- `components/admin-dashboard/plans/PlanTabs.js` (filter by type/family if exists)
- `screens/admin-dashboard/` (route to plans management)

## Dependencies on other flows
- **09 (Subscription Lifecycle)**: subscribing to a plan depends on plan existing and being active
- **12 (Quota Enforcement)**: plan limits (maxGuests, invitePool) directly enforce host quotas

## Known divergences (web ↔ mobile, frontend ↔ backend)
- **Mobile UI state**: EditPlanModal may not exist yet—may need to be created or UI scaffold exists but is incomplete
- **Web admin dashboard**: plans management may not be implemented—verify in `labbe/app/admin-dash/`
- **Hardcoded codes**: if plan codes are still in constants/plans.js, database migration needed to allow dynamic creation
- **Soft vs hard delete**: unclear if plans should be archived (soft) or removed (hard); recommend soft-delete to preserve historical subscriptions

## Open questions

**Q1: Plan code generation: how are new plan codes generated?**

A: Plans use predefined slug-style codes from the `PLAN_CODES` constant (e.g., `'basic_event_25'`). No dynamic UUID or slug generation exists. The admin PATCH endpoint accepts an existing code; there is no POST (create) endpoint yet. New codes require adding to constants and seeding.

Source: `labbe-backend-/src/shared/constants/plans.js:26-48`

**Q2: Backward compatibility: how do we migrate from hardcoded plan codes in constants/plans.js to DB-driven?**

A: No migration needed — plans already live in MongoDB (seeded via `seedPlans.js`). Constants are lookup keys only. `Plan.getOrCreateByCode()` creates missing plans on-demand. Once a POST /admin endpoint is built, new plans can be created purely via DB without touching constants.

Source: `labbe-backend-/src/modules/subscriptions/subscriptions.service.js:292` (getOrCreateByCode call)

**Q3: Plan template: required fields vs optional when admin creates a plan?**

A: Schema required fields are `code` (unique) and `planType`. All other fields have defaults. Practical minimum for a usable plan: `nameAr`/`nameEn` (for UI), `isActive: true`, and appropriate `limits` fields. `billingType` and `planFamily` are enums with `null` defaults. but we don't need to create new plans currently 

Source: `labbe-backend-/models/PlanModel.js:83-93`

**Q4: Whitelabel plans: can whitelabel partners create their own plans?**

A: No. Only SUPER_ADMIN accesses admin plan endpoints. The `availableFor` field on each plan controls which role can subscribe (`'host'`, `'whitelabel'`, `'platform_admin'`), but creation is SUPER_ADMIN only. Whitelabel admins can only read their assigned plans.

Source: `labbe-backend-/models/PlanModel.js:96`, `labbe-backend-/src/modules/plans/plans.service.js:123-139`

**Q5: Versioning: if a plan is edited mid-billing-period, does it affect existing subscriptions?**

A: [PETER DECISION] Plans are stored by reference (`planId`) in subscriptions. Updating a plan changes limits/features immediately for ALL subscriptions referencing that plan. There is no version snapshotting. Choice: accept live update for all (current behavior) vs snapshot plan data at subscription creation time. 
peter note : accept live update for all (current behavior) we mostly will not update anything related to plans

**Q6: Delete constraints: what prevents deleting a plan if subscribers are on it?**

A: No `deletePlan` endpoint exists — only PATCH is implemented. No hard-delete or soft-delete protection is enforced by code. [CONFIRM] Proposed default: soft-delete via `isActive: false`; block hard delete if any active subscriptions reference the plan.

Source: `labbe-backend-/src/modules/plans/plans.service.js:123-138`

---

## State machine

```
Plan entity:
  (non-existent) → SEED / POST /admin → active
  active          → PATCH isActive:false  → inactive
  inactive        → PATCH isActive:true   → active
  active/inactive → (no DELETE endpoint)  → (no terminal delete state reachable via API)
```

---

## Data handoffs

| Step | Producer | Consumer | Payload | Validation? |
|------|----------|----------|---------|-------------|
| Admin reads plans | `GET /admin/all` | Client | All plan docs sorted by sortOrder, tier, createdAt | Auth + SUPER_ADMIN role only |
| Admin updates plan | `PATCH /admin/:code` body | `updatePlanByCode` | Whitelisted fields only (nameAr, nameEn, isActive, pricing, limits, features, tier) | Mongoose runValidators:true |
| Plan update persists | MongoDB `Plan.findOneAndUpdate` | All subscribers | Live change immediately affects all subscriptions referencing this planId | No snapshot taken |
| Plan read (host) | `GET /plans/host` | Host client | Active plans for host role | No auth required |

---

## Role variations

| Role | CAN | CANNOT | Notes |
|------|-----|--------|-------|
| SUPER_ADMIN | Read all plans, update any plan field | Create new plan via API, delete plan | POST and DELETE routes do not exist |
| WHITELABEL_ADMIN | Read own assigned plans | Modify any plan | availableFor filter enforced |
| HOST | Read active plans available for host | Modify any plan | Public read, no auth |
| MODERATOR | Read active plans | Modify any plan | Same as host |

---

## Web ↔ mobile parity

| Feature | Web | Mobile | Gap? |
|---------|-----|--------|------|
| View all plans (admin) | Unknown — no admin plans page found in `labbe/app/admin-dash/` | Yes — PlanList.js + PlanTabs.js + PlanListItem.js | Yes — web admin plans UI not confirmed |
| Edit plan | Unknown | Yes — EditPlanModal.js | Yes — web may lack edit UI |
| Create plan | No (API missing) | No (API missing) | No gap — both blocked by same missing endpoint |
| Delete plan | No (API missing) | No (API missing) | No gap — both blocked by same missing endpoint |
| View plans (host) | Yes | Yes — PlansScreen.js | No |

---

## Edge cases & failure modes

- **Live plan update affects all subscribers:** A SUPER_ADMIN reducing `limits.maxInvitesPerEvent` from 200 to 50 immediately affects all active hosts on that plan, potentially blocking events in progress. No validation prevents this.
- **No plan creation via API:** New plan families or billing types require direct DB intervention (seed script). An admin locked to the dashboard cannot add plans.
- **No delete protection:** If a DELETE endpoint is ever added without checking active subscriptions first, hard-deleting a plan would orphan all subscriptions referencing it (planId → null), breaking quota enforcement everywhere.
- **PATCH without plan code in DB:** If a plan code exists in constants but was never seeded, `findOneAndUpdate` returns null and throws NotFoundError. `getOrCreateByCode` in subscribe path creates it on demand, but the admin PATCH path does not.

---

## Findings

### FLOW-08-F01 — POST /admin (create plan) and DELETE /admin/:code endpoints are missing
- **Severity**: Medium
- **Type**: MISSING
- **Location**: `labbe-backend-/src/modules/plans/plans.routes.js:24`
- **Description**: Only `GET /admin/all` and `PATCH /admin/:code` exist. No route for creating a new plan or deleting/deactivating one via API.
- **Why it matters**: SUPER_ADMIN cannot add new plan tiers or retire obsolete plans without direct database access. Any new pricing strategy requires an engineer intervention.
- **Recommended change**: Add a create-plan endpoint and a soft-delete (deactivate) endpoint accessible to SUPER_ADMIN only. Soft-delete should block deactivation if active subscriptions reference the plan.
- **Related**: FLOW-09-F01

### FLOW-08-F02 — Live plan update silently changes limits for all active subscribers
- **Severity**: Medium
- **Type**: DESIGN
- **Location**: `labbe-backend-/src/modules/plans/plans.service.js:136`
- **Description**: `Plan.findOneAndUpdate` with no snapshot means any field change (pricing, limits) takes effect immediately for every subscription holding a reference to that `planId`.
- **Why it matters**: A misconfigured plan update (e.g., `maxInvitesPerEvent: 0`) silently breaks every active host on that plan with no rollback path. Peter accepted live-update, but no guard prevents destructive values.
- **Recommended change**: Add a server-side validation step that rejects plan limit reductions below the current maximum usage across active subscriptions on that plan (or at minimum logs a warning and requires an explicit override flag from the admin).
- **Related**: FLOW-12-F01

### FLOW-08-F03 — No audit event emitted when a plan is updated
- **Severity**: Medium
- **Type**: MISSING
- **Location**: `labbe-backend-/src/modules/plans/plans.service.js:123`
- **Description**: `updatePlanByCode` updates the plan document with no audit log entry. No record of who changed what, when, or what the previous values were.
- **Why it matters**: Gate-1 #10 requires audit events for every sensitive write. Plan changes affect billing and quotas for all subscribers — they must be auditable.
- **Recommended change**: Emit an audit event on every plan update recording the admin's user ID, the plan code, the previous values, and the new values.
- **Related**: None

---

## Cross-flow notes

- **Flow 09**: `subscribe()` calls `Plan.getOrCreateByCode()` — if a plan is deactivated via `isActive: false` but still seeded in constants, it can be re-created on next subscribe call. Deactivation logic must also prevent `getOrCreateByCode` from resurrecting inactive plans.
- **Flow 12**: Plan `limits.maxInvitesPerEvent` and `invitePool` are read directly from the plan document at quota enforcement time (via subscription's populated `planId`). Live plan updates immediately affect enforcement.
- **Flow 10**: Addon pricing tiers are hardcoded in `addons.js` constants, not in the DB. If plan pricing becomes admin-managed, addon pricing should follow the same model.
