# Tenant Scoping Decision Matrix

For every backend route group, documents whether tenant scoping is required, the business reason, and whether the code actually enforces it.

Finding ID prefix: `TENANT-FNN`

---

## Legend

- **Should scope?** — YES means only the current tenant's data should be returned/modified; NO means the route is intentionally cross-tenant.
- **How scoped?** — middleware name, or "service-level" if enforced in the service layer, or "N/A" for intentionally public.
- **Status** — OK / GAP / INTENTIONAL (gap is a finding; intentional is by design).

---

## Intentionally Cross-Tenant Routes (Not Findings)

These routes are designed to serve cross-tenant data and are NOT gaps:

| Route | Reason |
|-------|--------|
| `GET /services/public` | Shared marketplace — all approved vendors visible to all hosts |
| `GET /vendors/categories` | Shared reference data |
| `GET /vendors/:id` | Public vendor profile — intentionally cross-tenant |
| `GET /locations/*` | Shared Saudi region/city/district reference data |
| `POST /auth/*` | Pre-auth — no tenant context yet |
| `GET /plans` | Subscription plans are global, not tenant-specific |
| `GET /messaging/webhook` (Taqnyat) | External platform delivery callback — no tenant context |
| `GET /guests/rsvp/:token` | Public RSVP endpoint — guest has no auth |
| `GET /post-event/:token` | Public post-event content access — guest has no auth |

---

## Route Group Matrix

### Admin Routes (`/api/v2/admin/`)

All admin routes pass through `authenticate` → `requirePageAccess` → `filterByWhitelabel`. `filterByWhitelabel` sets `req.whitelabelFilter`:
- `SUPER_ADMIN`: `{ whitelabelId: null }` (global — sees all)
- `ADMIN` / `MODERATOR`: `{ whitelabelId: null }` — **BUG: regular admins should NOT see cross-tenant data** (see TENANT-F01)
- `WHITELABEL_ADMIN`: `{ whitelabelId: req.user.whitelabelId }` (own tenant only — correct)

| Endpoint Group | Should Scope? | filterByWhitelabel Applied? | Status |
|----------------|---------------|----------------------------|--------|
| GET/POST /admin/hosts | YES | Yes | OK (for WHITELABEL_ADMIN) / GAP for ADMIN |
| GET/POST /admin/vendors | YES | Yes | OK (for WHITELABEL_ADMIN) / GAP for ADMIN |
| GET/POST /admin/moderators | YES | Yes | OK (for WHITELABEL_ADMIN) / GAP for ADMIN |
| GET /admin/events | YES | Yes | OK (for WHITELABEL_ADMIN) / GAP for ADMIN |
| GET /admin/subscriptions | YES | Yes | OK (for WHITELABEL_ADMIN) / GAP for ADMIN |
| GET /admin/payments | YES | Yes | OK (for WHITELABEL_ADMIN) / GAP for ADMIN |
| GET /admin/stats/dashboard | YES | Yes | OK (for WHITELABEL_ADMIN) / GAP for ADMIN |
| GET /admin/whitelabels | NO (SUPER_ADMIN only) | No (safe via requirePageAccess) | INTENTIONAL |
| GET /admin/plans | NO (global plans) | No | INTENTIONAL |
| GET /admin/exports (all types) | YES | Yes (except whitelabels — see FLOW-28-F04) | OK |

### Events Routes (`/api/v2/events/`)

| Endpoint | Should Scope? | filterByWhitelabel Applied? | Status |
|----------|---------------|----------------------------|--------|
| POST /events/create | YES | injectWhitelabel (sets whitelabelId on event) | OK |
| GET /events/my-events | YES (own events) | filterByWhitelabel + userId | OK |
| GET /events/stats | YES | filterByWhitelabel | OK |
| PATCH /events/:id/event-details | YES (owner only) | Ownership check via userId | OK |
| PATCH /events/:id/guest-list | YES (owner only) | Ownership check | OK |
| GET /events/:id (admin) | YES | requirePageAccess + filterByWhitelabel | OK |
| DELETE /events/:id (admin) | YES | requirePageAccess + filterByWhitelabel | OK |

### Tickets Routes (`/api/v2/tickets/`)

No `filterByWhitelabel` middleware on any ticket route. Tenant scoping is service-level only.

| Endpoint | Should Scope? | How Scoped? | Status |
|----------|---------------|-------------|--------|
| POST /tickets (create) | YES — host sees own tenant | `createTicket()` sets `whitelabelId: req.user.whitelabelId` on the ticket document | OK (service-level) |
| GET /tickets (list) | YES | `getTickets()` queries `{ whitelabelId: req.user.whitelabelId }` for non-super-admins | OK (service-level) |
| GET /tickets/:id | YES (owner or admin) | `getTicketById()` checks `userId` or admin role | OK |
| PATCH /tickets/:id/assign | YES | requirePageAccess — implicit tenant via assignee's whitelabelId | OK |
| PATCH /tickets/:id/status | YES | requirePageAccess — service reads ticket by id scoped to user's tenant | OK |
| GET /tickets/export | YES | Service reads tickets filtered by whitelabelId | OK (service-level) |

**Note:** Service-level scoping is fragile — a missed `whitelabelId` filter in a new ticket query path would silently cross tenants. No middleware fallback exists for tickets. See TENANT-F02.

### Notifications Routes (`/api/v2/notifications/`)

No `filterByWhitelabel` on notification routes. Scoped by `userId` (each user sees only their own notifications).

| Endpoint | Should Scope? | How Scoped? | Status |
|----------|---------------|-------------|--------|
| GET /notifications | YES (own only) | `getNotifications()` queries `{ userId: req.user._id }` | OK |
| GET /notifications/unread-count | YES (own only) | userId scoped | OK |
| PATCH /notifications/read-all | YES (own only) | userId scoped | OK |
| DELETE /notifications/clear-all | YES (own only) | userId scoped | OK |
| POST /notifications/send (admin) | ADMIN only | restrictTo(ADMIN, SUPER_ADMIN) — no whitelabel filter | GAP — see TENANT-F03 |
| POST /notifications/broadcast | ADMIN only | restrictTo(ADMIN, SUPER_ADMIN) — no whitelabel filter | GAP — see TENANT-F03 |

### Subscriptions Routes (`/api/v2/subscriptions/`)

| Endpoint | Should Scope? | How Scoped? | Status |
|----------|---------------|-------------|--------|
| POST /subscriptions/subscribe | YES (own subscription) | userId from req.user | OK |
| GET /subscriptions/my | YES (own) | userId | OK |
| GET /subscriptions/details | YES (own) | userId | OK |
| POST /subscriptions/:id/cancel | YES (own or admin) | userId or admin check | OK |

### Services Routes (`/api/v2/services/`)

| Endpoint | Should Scope? | How Scoped? | Status |
|----------|---------------|-------------|--------|
| GET /services/public | NO — shared marketplace | Intentionally public | INTENTIONAL |
| GET /services (vendor own) | YES (own services) | restrictTo(VENDOR) + `vendorId: req.user._id` | OK |
| POST /services (vendor create) | YES (own) | restrictTo(VENDOR) + userId set on service | OK |

### Guests Routes (`/api/v2/guests/`)

| Endpoint | Should Scope? | How Scoped? | Status |
|----------|---------------|-------------|--------|
| GET /guests?eventId= | YES (event owner) | Event ownership check | OK |
| PATCH /guests/:id/check-in | YES (event owner or staff) | StaffAccessToken or host ownership | OK |
| GET /guests/export?eventId= | YES (event owner) | eventId + userId check in service | OK |

### Addons Routes (`/api/v2/addons/`)

| Endpoint | Should Scope? | How Scoped? | Status |
|----------|---------------|-------------|--------|
| GET /addons (available) | NO — global catalog | Public | INTENTIONAL |
| POST /addons/purchase | YES (own subscription) | userId from req.user | OK |
| GET /addons/my | YES (own) | userId | OK |

### Discounts Routes (`/api/v2/discounts/`)

| Endpoint | Should Scope? | filterByWhitelabel Applied? | Status |
|----------|---------------|----------------------------|--------|
| GET /discounts (admin list) | YES | Yes | OK |
| POST /discounts (create) | YES | Yes | OK |
| PATCH /discounts/:id | YES | Yes | OK |

---

## Findings

### TENANT-F01 — filterByWhitelabel gives regular ADMIN and MODERATOR roles a null whitelabelId filter — same as SUPER_ADMIN
- **Severity**: High
- **Type**: BUG
- **Location**: `labbe-backend-/src/shared/middleware/whitelabel.js` (filterByWhitelabel role branch)
- **Description**: `filterByWhitelabel()` sets `req.whitelabelFilter = { whitelabelId: null }` for `SUPER_ADMIN`, `ADMIN`, and `MODERATOR` roles. MongoDB queries that use `{ ...req.whitelabelFilter }` with `{ whitelabelId: null }` will return ALL documents regardless of their `whitelabelId` value (MongoDB interprets `null` as "field is null or absent", not "match all"). In practice, admin/moderator users see cross-tenant data on every admin endpoint that passes the filter through.
- **Why it matters**: A regular `ADMIN` account should be scoped to a single tenant. Cross-tenant data visibility means one tenant's admin can read another tenant's host list, event data, and subscription info.
- **Recommended change**: Clarify intent. If `ADMIN` and `MODERATOR` are always single-tenant (assigned to one whitelabel), set `req.whitelabelFilter = { whitelabelId: req.user.whitelabelId }` for these roles. If they are intended to be cross-tenant (i.e., they serve multiple whitelabels under SUPER_ADMIN), document it explicitly and gate the cross-tenant read with a second `requirePageAccess` check.
- **Source**: `labbe-backend-/src/shared/middleware/whitelabel.js`

### TENANT-F02 — Tickets module relies on service-level whitelabel filtering only; no middleware fallback
- **Severity**: Medium
- **Type**: BUG (defense-in-depth gap)
- **Location**: `labbe-backend-/src/modules/tickets/tickets.routes.js` (no filterByWhitelabel), `labbe-backend-/src/modules/tickets/tickets.service.js` (whitelabelId filter in queries)
- **Description**: Unlike admin routes, ticket routes have no `filterByWhitelabel` middleware. All tenant isolation relies on `tickets.service.js` correctly including `whitelabelId` in every query. A new query path added without the filter would silently cross tenant boundaries. No middleware fallback catches it.
- **Why it matters**: Defense-in-depth principle — a single missed filter in service code becomes an immediate data leak. Middleware-level enforcement catches entire classes of mistakes at the routing layer.
- **Recommended change**: Add `filterByWhitelabel` middleware to ticket routes (at minimum on `GET /tickets` and `GET /tickets/export`). Service layer can still use `req.whitelabelFilter` as the source of truth.

### TENANT-F03 — Admin notification send/broadcast has no whitelabel filter; ADMIN can push notifications to all tenants
- **Severity**: Medium
- **Type**: BUG
- **Location**: `labbe-backend-/src/modules/notifications/notifications.routes.js:244`, `labbe-backend-/src/modules/notifications/notifications.routes.js:278-280`
- **Description**: `POST /notifications/send` and `POST /notifications/broadcast` are gated by `restrictTo(ADMIN, SUPER_ADMIN)` but have no `filterByWhitelabel`. An ADMIN sending a broadcast will deliver to all users regardless of whitelabelId. The service's `broadcast()` method queries all users and inserts notifications for them.
- **Why it matters**: A WHITELABEL_ADMIN-level admin pushing a broadcast notification to users belonging to a different tenant is a privacy and UX violation.
- **Recommended change**: Add `filterByWhitelabel` to both notification admin endpoints. In `notifications.service.broadcast()`, apply `req.whitelabelFilter` to the user query so only own-tenant users receive the broadcast.
