# RBAC Enforcement Matrix

Role × resource × action audit. Documents backend middleware requirements, frontend guard presence, and cross-platform enforcement gaps.

Finding ID prefix: `RBAC-FNN`

---

## Role Hierarchy (from `rbac.js`)

```
SUPER_ADMIN
  └── ADMIN
        └── MODERATOR
              └── WHITELABEL_ADMIN
                    └── WHITELABEL_MODERATOR
                          └── HOST
                                └── VENDOR
                                      └── GUEST
                                            └── STAFF
```

`restrictTo(...roles)` uses `ROLE_HIERARCHY` — a role inherits permissions of all roles below it.
`requirePageAccess(page, action)` checks `permissions[role][page][action]` without hierarchy inheritance — exact role match only.

---

## Backend RBAC Implementation

### `restrictTo(...roles)` — route-level role guard
Applied via: `router.use(restrictTo(...))` or per-route middleware.
Relies on `ROLE_HIERARCHY` so specifying `ROLES.ADMIN` also admits `SUPER_ADMIN` (hierarchy traversal).

### `requirePageAccess(page, action)` — page-level permission guard
Applied per-route for admin operations. Checks `permissions[role][page][action]` map from `src/shared/constants/permissions.js`.
Does NOT use hierarchy — exact role match. A `SUPER_ADMIN` does not inherit `ADMIN` page permissions; they are granted separately.

---

## Resource × Role × Action Matrix (Backend)

### Events

| Action | Required Roles (Backend) | Middleware | Web Guard | Mobile Guard | Gap? |
|--------|--------------------------|------------|-----------|--------------|------|
| Create event | HOST, ADMIN, SUPER_ADMIN, WHITELABEL_ADMIN, MODERATOR, WHITELABEL_MODERATOR | restrictTo(HOST,ADMIN,SUPER_ADMIN,WHITELABEL_ADMIN,MODERATOR,WHITELABEL_MODERATOR) | Confirmed (host dashboard route) | Confirmed (requireAuth in navigator) | No |
| View own events | HOST (+ admin roles) | authenticate + filterByWhitelabel | Confirmed | Confirmed | No |
| Update event details | Owner or admin via requirePageAccess | authenticate + ownership check or ADMIN_PAGES.EVENTS | Confirmed | Confirmed | No |
| Admin list all events | ADMIN, SUPER_ADMIN, WHITELABEL_ADMIN, MODERATOR | requirePageAccess(EVENTS, 'view') + filterByWhitelabel | Confirmed (admin-dash/events) | Confirmed (admin navigator) | No |
| Admin delete event | ADMIN, SUPER_ADMIN | requirePageAccess(EVENTS, 'delete') | Confirmed | Confirmed | No |
| Launch event (cron) | System (no HTTP auth) | Internal cron — no auth | N/A | N/A | No |

### Subscriptions

| Action | Required Roles | Middleware | Web Guard | Mobile Guard | Gap? |
|--------|----------------|------------|-----------|--------------|------|
| Subscribe to plan | HOST | authenticate (HOST implied by business logic) | Confirmed (plans page) | Confirmed (plans screen) | No |
| View own subscription | Any authenticated | authenticate | Confirmed | Confirmed | No |
| Admin manage subscriptions | ADMIN, SUPER_ADMIN | requirePageAccess(HOSTS, 'view') + filterByWhitelabel | Confirmed | Confirmed | No |
| Create plan (admin) | ADMIN, SUPER_ADMIN | requirePageAccess(PLANS, action) | Confirmed (admin) | Confirmed (admin) | No |

### Tickets

| Action | Required Roles | Middleware | Web Guard | Mobile Guard | Gap? |
|--------|----------------|------------|-----------|--------------|------|
| Create ticket | Any authenticated | authenticate | Confirmed (form on web) | Confirmed (TicketsScreen FAB) | No |
| View own tickets | Any authenticated (own) | authenticate + userId filter | Confirmed | Confirmed | No |
| Admin view all tickets | requirePageAccess(TICKETS, 'view') | requirePageAccess | Confirmed (admin-dash/tickets) | Confirmed (admin navigator) | No |
| Assign ticket | requirePageAccess(TICKETS, 'update') | requirePageAccess | Confirmed (web AssignTicketPopup) | **Missing** — no mobile assign UI | **Yes — FLOW-23-F03** |
| Update ticket status | requirePageAccess(TICKETS, 'update') | requirePageAccess | Confirmed | Confirmed | No |
| Rate ticket | Owner, ticket RESOLVED or CLOSED | authenticate + ownership + status | Confirmed | Confirmed (TicketRatingModal) | No |
| Export tickets | requirePageAccess(TICKETS, 'view') | requirePageAccess | Confirmed (web export button) | **Missing** — no mobile export call | **Yes — FLOW-23-F04** |

### Admin Dashboard Resources (Hosts, Vendors, Moderators, Payments)

| Action | Required Roles | Middleware | Web Guard | Mobile Guard | Gap? |
|--------|----------------|------------|-----------|--------------|------|
| List hosts | requirePageAccess(HOSTS, 'view') | requirePageAccess + filterByWhitelabel | Confirmed | Confirmed | No |
| Create host (manual) | requirePageAccess(HOSTS, 'create') | requirePageAccess + filterByWhitelabel | Confirmed | Confirmed | No |
| Update host status | requirePageAccess(HOSTS, 'update') | requirePageAccess + filterByWhitelabel | Confirmed | Confirmed | No |
| Delete host | requirePageAccess(HOSTS, 'delete') | requirePageAccess + filterByWhitelabel | Confirmed | Confirmed | No |
| Approve vendor | requirePageAccess(VENDORS, 'update') | requirePageAccess + filterByWhitelabel | Confirmed | Confirmed | No |
| Export hosts | requirePageAccess(HOSTS, 'view') | requirePageAccess + filterByWhitelabel | Confirmed (web) | **Missing** (see FLOW-28-F01) | **Yes** |
| Export vendors | requirePageAccess(VENDORS, 'view') | requirePageAccess + filterByWhitelabel | Confirmed (web) | **Missing** | **Yes** |
| Admin list payments | requirePageAccess(PAYMENTS, 'view') | requirePageAccess + filterByWhitelabel | Confirmed | Confirmed | No |

### Notifications

| Action | Required Roles | Middleware | Web Guard | Mobile Guard | Gap? |
|--------|----------------|------------|-----------|--------------|------|
| View own notifications | Any authenticated | authenticate + userId filter | Confirmed | Confirmed | No |
| Mark as read | Owner | authenticate + userId | Confirmed | Confirmed | No |
| Admin send notification | ADMIN, SUPER_ADMIN | restrictTo(ADMIN, SUPER_ADMIN) | Confirmed | Confirmed | No |
| Admin broadcast | ADMIN, SUPER_ADMIN | restrictTo(ADMIN, SUPER_ADMIN) | Confirmed | Confirmed | GAP: no whitelabel filter — see TENANT-F03 |

### Services / Marketplace

| Action | Required Roles | Middleware | Web Guard | Mobile Guard | Gap? |
|--------|----------------|------------|-----------|--------------|------|
| Browse public marketplace | None (public) | None (GET /services/public has no protect) | N/A | N/A | No |
| Create service | VENDOR only | authenticate + restrictTo(VENDOR) | Confirmed (vendor portal) | N/A (vendor portal is web-only) | No |
| Update own service | VENDOR (owner) | authenticate + restrictTo(VENDOR) + ownership | Confirmed | N/A | No |
| Admin rate vendor | requirePageAccess(VENDORS, 'update') | requirePageAccess | Confirmed | Confirmed | No |

### Gate Scanner / Staff

| Action | Required Roles | Middleware | Web Guard | Mobile Guard | Gap? |
|--------|----------------|------------|-----------|--------------|------|
| Check in guest | STAFF (via StaffAccessToken) | verifyStaffToken (custom middleware) | N/A | Confirmed (StaffPortalScreen) | No |
| View event guest list | STAFF (own event) | verifyStaffToken + event ownership | N/A | Confirmed | No |
| Revoke staff token | — | **Missing** — no revocation endpoint | — | — | **Yes — FLOW-20-F01** |

### Post-Event / Content

| Action | Required Roles | Middleware | Web Guard | Mobile Guard | Gap? |
|--------|----------------|------------|-----------|--------------|------|
| Publish post-event content | HOST (own event) | authenticate + ownership | Confirmed | Confirmed (HostPostEventScreen) | No |
| Access post-event content (guest) | None (GuestAccessToken) | verifyGuestToken (custom middleware) | N/A | N/A | No |
| GuestAccessToken revocation | — | **Missing** — no revocation endpoint | — | — | **Yes — FLOW-21-F03 related** |

---

## Mobile RBAC Navigation Guard

`halla-mobile/navigation/AdminNavigator.js` gates admin screens by role. Verified roles checked:

| Screen | Role Required | Guard Present? |
|--------|---------------|----------------|
| Admin Dashboard | ADMIN, SUPER_ADMIN, WHITELABEL_ADMIN, MODERATOR | Yes |
| Admin Tickets | ADMIN, SUPER_ADMIN, MODERATOR | Yes |
| Admin Events | ADMIN, SUPER_ADMIN | Yes |
| Admin Hosts | ADMIN, SUPER_ADMIN, WHITELABEL_ADMIN | Yes |
| Admin Vendors | ADMIN, SUPER_ADMIN | Yes |
| Admin Subscriptions | ADMIN, SUPER_ADMIN | Yes |
| Host Create Event | HOST | Yes (AppNavigator requireAuth) |
| Staff Portal | STAFF (StaffAccessToken, not JWT) | Yes (StaffPortalScreen token check) |

---

## Findings

### RBAC-F01 — requirePageAccess and restrictTo use different role resolution; SUPER_ADMIN may be blocked by requirePageAccess
- **Severity**: High
- **Type**: BUG
- **Location**: `labbe-backend-/src/shared/middleware/rbac.js` (requirePageAccess vs restrictTo implementations)
- **Description**: `restrictTo(...roles)` uses `ROLE_HIERARCHY` — a `SUPER_ADMIN` passes a check for `restrictTo(ADMIN)` by inheritance. `requirePageAccess(page, action)` does NOT use hierarchy — it checks `permissions[req.user.role][page][action]` exactly. If `permissions.SUPER_ADMIN` is not explicitly populated for every page/action combination, a `SUPER_ADMIN` will be blocked by `requirePageAccess` on routes where only `ADMIN` is explicitly listed. These two middleware have inconsistent role resolution semantics, creating invisible access control gaps.
- **Why it matters**: An intermittent 403 for SUPER_ADMIN on production is a support escalation waiting to happen. More critically, if `WHITELABEL_ADMIN` has explicit permissions that `ADMIN` lacks, a WHITELABEL_ADMIN could gain unintended access.
- **Recommended change**: Unify role resolution. Either extend `requirePageAccess` to use the same `ROLE_HIERARCHY` traversal as `restrictTo`, or add explicit `SUPER_ADMIN` entries to every page/action in `permissions.js` and document the dual-check invariant.
- **Source**: `labbe-backend-/src/shared/middleware/rbac.js`

### RBAC-F02 — ADMIN and MODERATOR roles receive null whitelabelId filter — same cross-tenant access as SUPER_ADMIN
- **Severity**: High
- **Type**: BUG
- **Location**: `labbe-backend-/src/shared/middleware/whitelabel.js` (filterByWhitelabel)
- **Description**: See TENANT-F01 — `filterByWhitelabel` sets `{ whitelabelId: null }` for ADMIN and MODERATOR, granting them cross-tenant data access. This is an RBAC gap because regular ADMIN users are intended to operate within one tenant.
- **Why it matters**: Any ADMIN account is a de-facto SUPER_ADMIN for data visibility purposes. A compromised ADMIN credential exposes all tenant data.
- **Recommended change**: Assign each ADMIN/MODERATOR to exactly one `whitelabelId` at creation time. `filterByWhitelabel` should then scope them to their assigned tenant exactly as it does for WHITELABEL_ADMIN.
- **Source**: `labbe-backend-/src/shared/middleware/whitelabel.js`

### RBAC-F03 — Staff portal uses a separate token type (StaffAccessToken) outside the JWT RBAC system; no unified revocation
- **Severity**: Medium
- **Type**: BUG (design gap)
- **Location**: `labbe-backend-/models/StaffAccessTokenModel.js`, gate scanner routes
- **Description**: Staff check-in authenticates via `StaffAccessToken` (a separate database-backed token), not via the standard JWT `protect` middleware. This token is outside the ROLE_HIERARCHY and RBAC middleware chain. There is no `DELETE /staff/:id/token` or equivalent revocation endpoint. If a staff member's device is compromised, their gate scanner access cannot be revoked without direct DB manipulation.
- **Why it matters**: Gate-1 requires role-based access control. A compromised StaffAccessToken grants unlimited check-in access for all events associated with the token's event scope.
- **Recommended change**: Add `DELETE /events/:id/staff-tokens/:tokenId` to revoke a specific staff token. Consider adding a `revokedAt` field to `StaffAccessTokenModel` and checking it during token verification.

### RBAC-F04 — onBehalfOf hardcoded false; SUPER_ADMIN acting as host creates events under wrong actor for audit trail
- **Severity**: Medium
- **Type**: CONFLICT (Bucket-3 — Gate-1 #10)
- **Location**: `labbe-backend-/src/modules/events/events.service.js:373`
- **Description**: Peter stated SUPER_ADMIN should be able to create events on behalf of a host. The code hardcodes `onBehalfOf: false` at line 373 regardless of request context. Even when a SUPER_ADMIN uses the API, the event's `createdBy` field will be the admin's own userId, with no `onBehalfOf` linkage.
- **Why it matters**: Gate-1 Decision #10 requires audit logging of who acted on whose behalf. Without this, SUPER_ADMIN event creation is indistinguishable from host event creation in audit logs.
- **Recommended change**: Accept `{ onBehalfOf: userId }` in the request body for SUPER_ADMIN/ADMIN callers. If present, store `createdBy: req.user._id` and `onBehalfOfHost: userId` on the event document.
