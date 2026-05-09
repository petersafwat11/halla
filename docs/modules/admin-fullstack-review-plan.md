# admin — Full-Stack Review Plan

**Module:** admin
**Generated:** 2026-05-07
**Prompt:** docs/implementation/MODULE_FULLSTACK_REVIEW_PROMPT.md
**Status:** Awaiting green light · NOT IMPLEMENTED YET

---

## 0. Executive Summary

- **38** total endpoints in module (HOST: 10, VENDOR: 8, MODERATOR: 7, WHITELABEL: 10, EVENT: 9, PAYMENT: 4 — minus duplicates).
- **2** exact duplicate route registrations (`/hosts/export`, `/vendors/export` defined twice in `admin.routes.js`).
- **11** missing Swagger blocks (bulk-status, exports, payment summary/detail, event-targets, user subscription-info, event GET/PATCH).
- **3** backend file-size violations: `admin.routes.js` (1327, cap 400), `admin.controller.js` (654, cap 300), `admin.service.js` (2329, cap 600).
- **5** web file-size violations (>250 lines): `AdminPaymentsClient.js` (503), `HostSelector.js` (463), `EditPlanPopup.js` (326), `SubscriptionPopup.js` (320), `WhitelabelCard.jsx` (299), `HostCard.js` (273).
- **3** mobile file-size violations (>350 lines): `AddModeratorModal.js` (587), `EditPlanModal.js` (461), `SendNotificationModal.js` (444).
- **9+** web/mobile API consumption gaps: 40+ admin paths hardcoded in mobile service (not in `ENDPOINTS`); `/admin/whitelabels/:id/features` missing from API_PATHS web side; mobile uses `/events/admin/all` while web uses `/admin/events/*` for one list path.
- **6** data-mapping fallback chains worth tightening (web payments + whitelabels detail, mobile stats + infinite + paginated normalizers).
- **17** sensitive mutations missing `auditLog` middleware/service call (every host/vendor/moderator/whitelabel/event delete + bulk + status/subscription change except `PATCH /vendors/:id/status`).
- **All** routes lack Joi validation — no `admin.validation.js` exists.
- **7** bulk endpoints lack rate limiting.
- **1** missing `validateObjectId` (`GET /payments/:id`).
- **3** multi-collection writes without transactions (createHost+subscription, updateHostSubscription, updateEventFull guest-replace).
- **23** comment-hygiene markers across 4 backend files; ~7 markers in web; ~7 in mobile.
- **Estimated effort: L (large)** — split this into stages: (A1) duplicate-removal + Swagger + validation, (A2) audit-log + rate-limit + transactions, (A3) backend file split, (B/C) web + mobile fixes, (D) cross-platform alignment.

---

## 1. Endpoint Inventory

| # | Method | Path | Controller | Service | Middleware chain | Swagger | Web hook | Mobile hook | Status |
|---|--------|------|------------|---------|------------------|---------|----------|-------------|--------|
| 1 | GET    | /admin/hosts | getHosts | getHosts | protect, requirePageAccess(HOSTS,view), filterByWhitelabel | OK | useAdminHosts | useAdminHosts(+Infinite) | KEEP |
| 2 | GET    | /admin/hosts/verify-phone | verifyHostByPhone | verifyHostByPhone | protect, requirePageAccess(HOSTS,view), filterByWhitelabel | OK | useVerifyHostPhone | hosts.verifyHostPhone (svc) | KEEP |
| 3 | POST   | /admin/hosts/find-or-create | findOrCreateHost | findOrCreateHost | protect, requirePageAccess(HOSTS,create), filterByWhitelabel | OK | useAdminHostMutation('findOrCreate') | — | KEEP — add Joi |
| 4 | GET    | /admin/hosts/export | exportHosts | exportHosts | protect, requirePageAccess(HOSTS,view), filterByWhitelabel | MISSING | hostsAPI export | hosts.export | KEEP — DELETE-DUPLICATE-AT-LINE-1290 |
| 5 | GET    | /admin/hosts/:id | getHostById | getHostById | protect, requirePageAccess(HOSTS,view), validateObjectId, filterByWhitelabel | OK | useAdminHost | useAdminHostById | KEEP |
| 6 | POST   | /admin/hosts | createHost | createHost | protect, requirePageAccess(HOSTS,create), filterByWhitelabel | OK | useAdminHostMutation('create') | hosts.create | KEEP — add Joi + audit |
| 7 | PATCH  | /admin/hosts/:id/status | updateHostStatus | updateHostStatus | protect, requirePageAccess(HOSTS,update), validateObjectId, filterByWhitelabel | OK | useAdminHostMutation('updateStatus') | useUpdateHostStatusMutation | KEEP — add audit |
| 8 | PATCH  | /admin/hosts/:id/subscription | updateHostSubscription | updateHostSubscription | protect, requirePageAccess(HOSTS,update), validateObjectId, filterByWhitelabel | OK | useAdminHostMutation('updateSubscription') | useUpdateHostSubscriptionMutation | KEEP — add audit + tx |
| 9 | DELETE | /admin/hosts/:id | deleteHost | deleteHost | protect, requirePageAccess(HOSTS,delete), validateObjectId, filterByWhitelabel | OK | useAdminHostMutation('delete') | useDeleteHostMutation | KEEP — add audit |
| 10 | POST  | /admin/hosts/bulk-delete | bulkDeleteHosts | bulkDeleteHosts | protect, requirePageAccess(HOSTS,delete), filterByWhitelabel | OK | useAdminHostMutation('bulkDelete') | useBulkDeleteHostsMutation | KEEP — add audit + rate-limit + Joi |
| 11 | GET    | /admin/vendors | getVendors | getVendors | protect, requirePageAccess(VENDORS,view), filterByWhitelabel | OK | useAdminVendors | useAdminVendors(+Infinite) | KEEP |
| 12 | GET    | /admin/vendors/export | exportVendors | exportVendors | protect, requirePageAccess(VENDORS,view), filterByWhitelabel | MISSING | vendorsAPI export | vendors.export | KEEP — DELETE-DUPLICATE-AT-LINE-1296 |
| 13 | GET    | /admin/vendors/:id | getVendorById | getVendorById | protect, requirePageAccess(VENDORS,view), validateObjectId, filterByWhitelabel | OK | useAdminVendor | useAdminVendorById | KEEP |
| 14 | PATCH  | /admin/vendors/:id/status | updateVendorStatus | updateVendorStatus | protect, requirePageAccess(VENDORS,update), validateObjectId, filterByWhitelabel, **auditLog** | OK | useAdminVendorMutation('updateStatus') | useUpdateVendorStatusMutation | KEEP (canonical audit pattern) |
| 15 | PATCH  | /admin/vendors/:id/rating | updateVendorRating | updateVendorRating | protect, requirePageAccess(VENDORS,update), validateObjectId, filterByWhitelabel | OK | useAdminVendorMutation('updateRating') | useGiveVendorRatingMutation | KEEP — add audit |
| 16 | DELETE | /admin/vendors/:id | deleteVendor | deleteVendor | protect, requirePageAccess(VENDORS,delete), validateObjectId, filterByWhitelabel | OK | useAdminVendorMutation('delete') | useDeleteVendorMutation | KEEP — add audit |
| 17 | POST   | /admin/vendors/bulk-delete | bulkDeleteVendors | bulkDeleteVendors | protect, requirePageAccess(VENDORS,delete), filterByWhitelabel | OK | useAdminVendorMutation('bulkDelete') | useBulkDeleteVendorsMutation | KEEP — add audit + rate-limit + Joi |
| 18 | POST   | /admin/vendors/bulk-status | bulkUpdateVendorStatus | bulkUpdateVendorStatus | protect, requirePageAccess(VENDORS,update), filterByWhitelabel | OK | useAdminVendorMutation('bulkStatus') | useBulkApproveVendorsMutation/useBulkSuspendVendorsMutation | KEEP — add audit + rate-limit + Joi |
| 19 | GET    | /admin/moderators | getModerators | getModerators | protect, requirePageAccess(MODERATORS,view), filterByWhitelabel | OK | useAdminModerators | useAdminModerators(+Infinite) | KEEP |
| 20 | POST   | /admin/moderators | createModerator | createModerator | protect, requirePageAccess(MODERATORS,create), filterByWhitelabel | OK | useAdminModeratorMutation('create') | useCreateModeratorMutation | KEEP — add Joi + audit + tenant-bind in service (currently in controller) |
| 21 | PATCH  | /admin/moderators/:id | updateModerator | updateModerator | protect, requirePageAccess(MODERATORS,update), validateObjectId, filterByWhitelabel | OK | useAdminModeratorMutation('update') | useUpdateModeratorMutation | KEEP — add audit |
| 22 | PATCH  | /admin/moderators/:id/status | updateModeratorStatus | updateModeratorStatus | protect, requirePageAccess(MODERATORS,update), validateObjectId, filterByWhitelabel | OK | useAdminModeratorMutation('updateStatus') | useUpdateModeratorStatusMutation | KEEP — add audit |
| 23 | DELETE | /admin/moderators/:id | deleteModerator | deleteModerator | protect, requirePageAccess(MODERATORS,delete), validateObjectId, filterByWhitelabel | OK | useAdminModeratorMutation('delete') | useDeleteModeratorMutation | KEEP — add audit |
| 24 | POST   | /admin/moderators/bulk-delete | bulkDeleteModerators | bulkDeleteModerators | protect, requirePageAccess(MODERATORS,delete), filterByWhitelabel | OK | useAdminModeratorMutation('bulkDelete') | useBulkDeleteModeratorsMutation | KEEP — add audit + rate-limit + Joi |
| 25 | POST   | /admin/moderators/bulk-status | bulkUpdateModeratorStatus | bulkUpdateModeratorStatus | protect, requirePageAccess(MODERATORS,update), filterByWhitelabel | **MISSING** | — | useBulkSuspendModeratorsMutation | KEEP — add Swagger + audit + rate-limit + Joi |
| 26 | GET    | /admin/whitelabels | getWhitelabels | getWhitelabels | protect, requirePageAccess(WHITELABELS,view) | OK | useAdminWhitelabels | useAdminWhitelabels(+Infinite) | KEEP — also add filterByWhitelabel for symmetry (currently uses tenant gating in service) |
| 27 | GET    | /admin/whitelabels/export | exportWhitelabels | exportWhitelabels | protect, requirePageAccess(WHITELABELS,view), filterByWhitelabel | MISSING | — | whitelabels.export | KEEP — add Swagger |
| 28 | GET    | /admin/whitelabels/:id | getWhitelabelById | getWhitelabelById | protect, requirePageAccess(WHITELABELS,view), validateObjectId | OK | useAdminWhitelabel | useAdminWhitelabelById | KEEP |
| 29 | PATCH  | /admin/whitelabels/:id/status | updateWhitelabelStatus | updateWhitelabelStatus | protect, requirePageAccess(WHITELABELS,update), validateObjectId | OK | useAdminWhitelabelMutation('updateStatus') | useUpdateWhitelabelStatusMutation | KEEP — add audit |
| 30 | PATCH  | /admin/whitelabels/:id/subscription | updateWhitelabelSubscription | updateWhitelabelSubscription | protect, requirePageAccess(WHITELABELS,update), validateObjectId | OK | useAdminWhitelabelMutation('updateSubscription') | useUpdateWhitelabelSubscriptionMutation | KEEP — add audit |
| 31 | GET    | /admin/whitelabels/:id/features | getWhitelabelFeatures | getWhitelabelFeatures | protect, requirePageAccess(WHITELABELS,view), validateObjectId | OK | (inline `apiRequest` in WhitelabelDetailsWrapper.js) | (direct `apiFetch` in WhitelabelDetailsScreen.js) | KEEP — add canonical hooks for both platforms |
| 32 | PATCH  | /admin/whitelabels/:id/features | updateWhitelabelFeature | updateWhitelabelFeature | protect, requirePageAccess(WHITELABELS,update), validateObjectId | OK | (inline `apiRequest`) | (direct `apiFetch`) | KEEP — add canonical hooks + audit + Joi |
| 33 | DELETE | /admin/whitelabels/:id | deleteWhitelabel | deleteWhitelabel | protect, requirePageAccess(WHITELABELS,delete), validateObjectId | OK | useAdminWhitelabelMutation('delete') | useDeleteWhitelabelMutation | KEEP — add audit |
| 34 | POST   | /admin/whitelabels/bulk-delete | bulkDeleteWhitelabels | bulkDeleteWhitelabels | protect, requirePageAccess(WHITELABELS,delete) | OK | — | useBulkDeleteWhitelabelsMutation | KEEP — add audit + rate-limit + Joi + web hook |
| 35 | POST   | /admin/whitelabels/bulk-status | bulkUpdateWhitelabelStatus | bulkUpdateWhitelabelStatus | protect, requirePageAccess(WHITELABELS,update) | **MISSING** | — | useBulkSuspendWhitelabelsMutation | KEEP — add Swagger + audit + rate-limit + Joi + web hook |
| 36 | POST   | /admin/events/create-for-host | createEventForHost | (delegated to events.service) | protect, requirePageAccess(EVENTS,create), filterByWhitelabel | OK | useAdminEventMutation('createForHost') | useCreateEventForHostMutation | KEEP — controller has DB lookup; move to service |
| 37 | PATCH  | /admin/events/:id/status | updateEventStatus | updateEventStatus | protect, requirePageAccess(EVENTS,update), validateObjectId, filterByWhitelabel | OK | useAdminEventMutation('updateStatus') | useUpdateEventStatusMutation | KEEP — add audit |
| 38 | DELETE | /admin/events/:id | deleteEvent | deleteEvent | protect, requirePageAccess(EVENTS,delete), validateObjectId, filterByWhitelabel | OK | useAdminEventMutation('delete') (web also calls `/events/admin/:id`) | useDeleteEventMutation | KEEP — add audit; **resolve dual path** (`/admin/events/:id` vs `/events/admin/:id`) |
| 39 | POST   | /admin/events/bulk-delete | bulkDeleteEvents | bulkDeleteEvents | protect, requirePageAccess(EVENTS,delete), filterByWhitelabel | OK | useAdminEventMutation('bulkDelete') | useBulkDeleteEventsMutation | KEEP — add audit + rate-limit + Joi |
| 40 | POST   | /admin/events/bulk-status | bulkUpdateEventStatus | bulkUpdateEventStatus | protect, requirePageAccess(EVENTS,update), filterByWhitelabel | **MISSING** | useAdminEventMutation('bulkStatus') | useBulkSuspendEventsMutation | KEEP — add Swagger + audit + rate-limit + Joi |
| 41 | GET    | /admin/event-targets | getEventTargets | getEventTargets | protect, requirePageAccess(EVENTS,view), filterByWhitelabel | **MISSING** | hostsAPI.getEventTargets (HostSelector.js) | hosts.getEventTargets | KEEP — add Swagger + canonical web hook |
| 42 | GET    | /admin/users/:id/subscription-info | getUserSubscriptionInfo | getUserSubscriptionInfo | protect, requirePageAccess(HOSTS,view), validateObjectId | **MISSING** | (eventsAPI subscriptionInfo helper) | — | KEEP — add Swagger + canonical hook |
| 43 | GET    | /admin/payments | getPayments | getPayments | protect, requirePageAccess(PAYMENTS,view), filterByWhitelabel | OK | useAdminPayments | useAdminPayments(+Infinite) | KEEP |
| 44 | GET    | /admin/payments/summary | getPaymentSummary | getPaymentSummary | protect, requirePageAccess(PAYMENTS,view), filterByWhitelabel | **MISSING** | (used inside useAdminPayments page) | useAdminPaymentSummary | KEEP — add Swagger |
| 45 | GET    | /admin/payments/export | exportPayments | exportPayments | protect, requirePageAccess(PAYMENTS,view), filterByWhitelabel | MISSING | export helper | payments.export | KEEP — add Swagger |
| 46 | GET    | /admin/payments/:id | getPaymentDetail | getPaymentDetail | protect, requirePageAccess(PAYMENTS,view), filterByWhitelabel | **MISSING** | useAdminPaymentDetail | useAdminPaymentById (in service) | KEEP — add `validateObjectId('id')` + Swagger |
| 47 | GET    | /admin/events/export | exportEvents | exportEvents | protect, requirePageAccess(EVENTS,view), filterByWhitelabel | **MISSING** | events export helper | events.export | KEEP — add Swagger |
| 48 | GET    | /admin/moderators/export | exportModerators | exportModerators | protect, requirePageAccess(MODERATORS,view), filterByWhitelabel | **MISSING** | — | moderators.export | KEEP — add Swagger |
| 49 | GET    | /admin/events/:id | getEventById | getEventById | protect, requirePageAccess(EVENTS,view), validateObjectId, filterByWhitelabel | **MISSING** | (inline `useQuery` in EventsTable / EventDetailsContent) | useAdminEventById | KEEP — add Swagger + canonical web hook |
| 50 | PATCH  | /admin/events/:id | updateEventFull | updateEventFull | protect, requirePageAccess(EVENTS,update), validateObjectId, filterByWhitelabel | **MISSING** | useAdminEventMutation('update') | useUpdateEventMutation | KEEP — add Swagger + audit + tx + Joi (FormData) |

**Legend:** KEEP, DELETE-DUPLICATE-OF-#N, RENAME, MERGE-WITH-#N

---

## 2. Backend Findings

### 2.1 File-size violations
- `admin.routes.js` — **1327 lines** (cap 400). Proposed split (preserve mounted paths):
  - `admin.routes.js` (parent, ~80 lines) — applies `protect`, mounts sub-routers
  - `admin.hosts.routes.js` (~190 lines)
  - `admin.vendors.routes.js` (~170 lines)
  - `admin.moderators.routes.js` (~160 lines)
  - `admin.whitelabels.routes.js` (~250 lines)
  - `admin.events.routes.js` (~210 lines)
  - `admin.payments.routes.js` (~90 lines)
- `admin.controller.js` — **654 lines** (cap 300). Proposed split mirroring routes:
  - `admin.controller.js` (façade — re-exports from area files for backward-compat)
  - `admin.hosts.controller.js`, `admin.vendors.controller.js`, `admin.moderators.controller.js`, `admin.whitelabels.controller.js`, `admin.events.controller.js`, `admin.payments.controller.js`.
- `admin.service.js` — **2329 lines** (cap 600). Proposed split mirroring controllers + a shared helpers file:
  - `admin.shared.service.js` (~200 lines: `_buildSearchQuery`, `_formatUserResponse`, `_formatTargetSubscription`, `_mapSubStatusToPayment`, `getWhitelabelIdFromFilter`, etc.)
  - `admin.hosts.service.js` (~430 lines)
  - `admin.vendors.service.js` (~250 lines)
  - `admin.moderators.service.js` (~230 lines)
  - `admin.whitelabels.service.js` (~430 lines)
  - `admin.events.service.js` (~430 lines)
  - `admin.payments.service.js` (~220 lines)
- New file: `admin.validation.js` (~220 lines) with the Joi schemas listed in §2.6.

### 2.2 Duplicate routes
- **`GET /admin/hosts/export`** — registered at `admin.routes.js:152-156` AND again at `:1290-1294`. Express keeps the later one; the earlier one is dead. Delete the duplicate at `:1290-1294`.
- **`GET /admin/vendors/export`** — registered at `:408-412` AND again at `:1296-1300`. Delete the duplicate at `:1296-1300`.

### 2.3 Swagger drift
Endpoints with NO `@swagger` block:
- `POST /admin/moderators/bulk-status` (`admin.routes.js:808`).
- `GET /admin/moderators/export` (`:1302`).
- `POST /admin/whitelabels/bulk-status` (`:1071`).
- `POST /admin/events/bulk-status` (`:1209`).
- `GET /admin/event-targets` (`:1215`).
- `GET /admin/users/:id/subscription-info` (`:1221`).
- `GET /admin/payments/summary` (`:1266`).
- `GET /admin/payments/:id` (`:1284`).
- `GET /admin/payments/export` (`:1276`).
- `GET /admin/events/export` (`:1308`).
- `GET /admin/events/:id` (`:1314`).
- `PATCH /admin/events/:id` (`:1321`).
- `GET /admin/whitelabels/export` (`:864`) — JSDoc above is for `getWhitelabelById`, mis-attributed.
- `GET /admin/hosts/export` (after dedupe).
- `GET /admin/vendors/export` (after dedupe).

Each missing block must reference shared parameters/schemas in `config/swagger.js` (e.g. `$ref: '#/components/parameters/PageParam'`).

### 2.4 Missing middleware / safeguards
- **Audit log middleware missing on:** `PATCH /admin/hosts/:id/status`, `PATCH /admin/hosts/:id/subscription`, `DELETE /admin/hosts/:id`, `POST /admin/hosts/bulk-delete`, `DELETE /admin/vendors/:id`, `POST /admin/vendors/bulk-delete`, `POST /admin/vendors/bulk-status`, `PATCH /admin/moderators/:id/status`, `DELETE /admin/moderators/:id`, `POST /admin/moderators/bulk-delete`, `POST /admin/moderators/bulk-status`, `PATCH /admin/whitelabels/:id/status`, `PATCH /admin/whitelabels/:id/subscription`, `PATCH /admin/whitelabels/:id/features`, `DELETE /admin/whitelabels/:id`, `POST /admin/whitelabels/bulk-delete`, `POST /admin/whitelabels/bulk-status`, `PATCH /admin/events/:id/status`, `PATCH /admin/events/:id`, `DELETE /admin/events/:id`, `POST /admin/events/bulk-delete`, `POST /admin/events/bulk-status`. Use the canonical pattern from `/admin/vendors/:id/status` (`admin.routes.js:454-477`) — record actor + target + before/after.
- **Rate limiting missing on bulk endpoints:** `/hosts/bulk-delete`, `/vendors/bulk-delete`, `/vendors/bulk-status`, `/moderators/bulk-delete`, `/moderators/bulk-status`, `/whitelabels/bulk-delete`, `/whitelabels/bulk-status`, `/events/bulk-delete`, `/events/bulk-status`. Apply a stricter `bulkLimiter` from `shared/middleware/rateLimiter` (or add one if missing — flag).
- **`validateObjectId('id')` missing on `GET /admin/payments/:id`** (`:1284`).
- **`filterByWhitelabel` not on `GET /whitelabels` or `:id` routes** — current code does the tenant filter inside the service. Acceptable but inconsistent with the rest of the module; document the rationale or add the middleware.

### 2.5 Duplicate / dead endpoints
- `/admin/hosts/export` and `/admin/vendors/export` — same path defined twice; delete second registration (see 2.2).
- The `admin.events.deleteEvent` controller is invoked from `DELETE /admin/events/:id` (canonical), but mobile sends `DELETE /events/admin/:id` (different module). Audit `events.routes.js` to confirm that path also exists; if both exist they are duplicates. **Verify, then pick one canonical path** (recommend `/admin/events/:id` — keeps admin endpoints under `/admin`). Migrate mobile in §4.5.

### 2.6 Service / controller violations
- `admin.controller.createEventForHost` (`admin.controller.js:454-462`) — directly imports `Subscription` model and runs `Subscription.findActiveForUser(targetUserId)` in the controller. Move into `adminService.createEventForHost` (or pass the lookup into the existing events service entry).
- Inline validation across most controllers (e.g. `if (!status) throw new ValidationError(...)`) — to be replaced by Joi middleware in §2.7.
- `admin.service.getWhitelabels` (`admin.service.js:1170-1182`) — uses `Promise.all(whitelabels.map(async wl => User.countDocuments(...)))`. Each iteration is a separate query; replace with a single `User.aggregate([{ $match: {role: HOST} }, { $group: { _id: '$whitelabelId', count: { $sum: 1 } } }])` pre-fetch.
- `admin.service` populate without projection: `getWhitelabelById` (`:1204`) — `populate('subscription')`. Add explicit projection (`'planType status currentPeriodEnd'`).
- Missing `.lean()` on read-only queries in `getEventById` (`:1599-1602`) and inside `getPaymentDetail`'s populated event query (`:1960-1962`). Add `.lean()`.
- String literal `'deleted'` instead of `EVENT_STATUS.DELETED` at `:1955` and similar spots — replace with constants.
- Multi-collection writes lacking transactions:
  - `createHost` (`admin.service.js:313-323`) — creates `Subscription`, then updates user.
  - `updateHostSubscription` (`:401-409`) — same pattern.
  - `updateEventFull` (`:1696-1712`) — `Guest.deleteMany` + `Guest.insertMany`.
  Wrap in `mongoose.startSession()` + `session.startTransaction()`.
- `createModerator` controller does TENANT-F01 enforcement (`admin.controller.js:243-258`) — move into the service (controllers must not contain RBAC/tenant logic).
- `console.error` in `.catch(console.error)` (15 occurrences) — replace with `logger.error('admin.<area>.<op> notify failed', err)` from `shared/utils/logger.js`. Functionally identical, removes raw console.

### 2.7 Validation gaps (no `admin.validation.js` exists)
Add a new `admin.validation.js` with Joi schemas referenced from each route via `validate(schema)`:

```
// hosts
createHostSchema:        { phoneNumber: phonePattern.required, name: string.min(2).max(100).required, email: string.email, planCode: string }
updateHostStatusSchema:  { status: string.valid(...USER_STATUSES).required }
updateHostSubscriptionSchema: { planCode: string.required, billingCycle: string.valid('monthly','annual') }
findOrCreateHostSchema:  { phoneNumber: phonePattern.required, name: string }
bulkDeleteSchema:        { ids: array(objectId).min(1).max(200).required }   // shared

// vendors
updateVendorStatusSchema: { status: string.valid('approved','rejected','pending','suspended').required, reason: string }
updateVendorRatingSchema: { rating: number.min(0).max(5).required }
bulkVendorStatusSchema:  { ids: array(objectId).min(1).max(200), status: same as updateVendorStatus }

// moderators
createModeratorSchema:   { name, email, phoneNumber: phonePattern, permissions: array(string), pageAccess: object, whitelabelId: objectId.optional }
updateModeratorSchema:   subset of create
updateModeratorStatusSchema: { status }
bulkModeratorStatusSchema:   { ids, status }

// whitelabels
updateWhitelabelStatusSchema:    { status: string.required, dispatchSetupEmail: boolean.optional }
updateWhitelabelSubscriptionSchema: { planCode, billingCycle }
updateWhitelabelFeatureSchema:   { feature: string.required, enabled: boolean.required }
bulkWhitelabelStatusSchema:      { ids, status }

// events
createEventForHostSchema: handle multipart — Joi.alternatives() + body parser, validate hostId + eventDetails (JSON-stringified)
updateEventStatusSchema:  { status }
updateEventFullSchema:    same FormData pattern; validate top-level + invitationSettings keys
bulkEventStatusSchema:    { ids, status }
```

All schemas use `.unknown(false)`. Reuse `phonePattern`, `objectId`, `passwordSchema` from `auth.validation.js` — extract the shared helpers into `shared/utils/validators.js` if the file does not exist already (flag).

### 2.8 Comment hygiene (backend)
Remove the following markers; rewrite as plain code or move to PR description.

| File | Line | Marker to remove |
|------|------|------------------|
| admin.controller.js | 243 | `// TENANT-F01 …` |
| admin.controller.js | 345 | `// Phase 4b W0-EMAIL …` |
| admin.controller.js | 456 | `// H-10 …` |
| admin.routes.js | 458 | `// Phase 1b consumer …` |
| admin.routes.js | 465 | `// H-9: capture the prior status …` |
| admin.service.js | 21 | `// Phase 4c hardening …` |
| admin.service.js | 267 | `// FLOW-04-F03 …` |
| admin.service.js | 390 | `// H-10 …` |
| admin.service.js | 661 | `// FLOW-03-F04 …` |
| admin.service.js | 684 | `// FLOW-24-F02 …` |
| admin.service.js | 711 | `// FLOW-24-F01 …` |
| admin.service.js | 929 | `// TENANT-F01 …` |
| admin.service.js | 1246 | `// Phase 4b W0-EMAIL (D5) …` |
| admin.service.js | 1340 | `// Phase 4b W1-WL-EMAIL …` |
| admin.service.js | 1419 | `// H-10 …` |
| admin.service.js | 1624 | `// Phase 4c W0-RENAME …` |
| admin.service.js | 1718 | `// Phase 4c W0-RENAME …` |
| admin.service.js | 2009 | `// Phase 4 §7.1 …` |
| admin.service.js | 2097 | `// Phase 4 §7.1 …` |
| admin.service.js | 2126 | `// Phase 4 §7.1 / §15.2B …` |
| admin.service.js | 2278 | `// FLOW-28-F02 …` |
| admin.service.js | 2309 | `// FLOW-28-F02 …` |

Keep the comment at `admin.routes.js:1282` (literal-vs-dynamic ordering rationale) — that is a legitimate "why".

### 2.9 Indexes worth flagging
Confirm or add the following compound indexes on `models/UserModel.js` / `EventModel.js` / `SubscriptionModel.js` / `PaymentModel.js`:

- `User: { role: 1, whitelabelId: 1 }` and `{ phoneNumber: 1 }` (already present? verify).
- `Event: { whitelabelId: 1, status: 1, createdAt: -1 }`.
- `Event: { host: 1 }`.
- `Guest: { event: 1 }`.
- `Subscription: { userId: 1, status: 1 }`.
- `Payment: { whitelabelId: 1, status: 1, createdAt: -1 }`.

If any are missing, list them in §6 (Suspected Bugs) for the user — adding indexes is a separate ops decision (potentially blocking on staging migration).

---

## 3. Frontend Web Findings

### 3.1 Component tree per page
- `app/[lang]/admin-dash/page.js` (54) → DashboardStats / DashboardCharts / RecentActivity (sizes not measured during scan — verify in Phase 2).
- `app/[lang]/admin-dash/hosts/page.js` (43)
  - `_components/HostsPageContent.js` → `HostsTable.jsx` (245) — under cap.
  - Imports `useAdminHosts`, `useAdminHostMutation`, `AddHostPopup`, `HostSubscriptionPopup`.
- `app/[lang]/admin-dash/hosts/[id]/page.js` (32)
  - `HostDetailsContent` → `_components/hostCard/HostCard.js` (**273** — over cap), `_components/eventCard/EventCard.js` (115), `_components/subscriptionPopup/SubscriptionPopup.js` (**320** — over cap).
- `app/[lang]/admin-dash/vendors/page.js` (47)
  - `VendorsTable.jsx` (219), `VendorStatsFilter`, hooks `useVendorActions.js` (78), `useVendorRowActions.js` (79).
- `app/[lang]/admin-dash/vendors/[id]/page.js` (32)
  - `VendorDetailsWrapper.js` (158) + several small section components.
- `app/[lang]/admin-dash/moderators/page.js` (43) → `ModeratorsTable.jsx` (size unverified — verify in Phase 2).
- `app/[lang]/admin-dash/whitelabels/page.js` (47)
  - `WhitelabelsTable.jsx` (178) → `WhitelabelCard.jsx` (**299** — over cap).
- `app/[lang]/admin-dash/whitelabels/[id]/page.js` (32) and `[id]/details/page.js` (33)
  - `WhitelabelDetailsWrapper.js` (144) — has inline `apiRequest` for features (rule violation).
- `app/[lang]/admin-dash/events/page.js` (47) → `EventsTable.jsx` (238) — uses `useQuery` directly.
- `app/[lang]/admin-dash/events/[id]/page.js` → `EventDetailsContent`.
- `app/[lang]/admin-dash/payments/page.js` (30) → `AdminPaymentsClient.js` (**503** — over cap).
- `app/[lang]/admin-dash/create-event/page.js` (41) + `_components/HostSelector/HostSelector.js` (**463** — over cap).
- `app/[lang]/admin-dash/manage-plans/page.js` (29) + `_components/EditPlanPopup.js` (**326** — over cap).
- Plus: `update-event`, `plans`, `tickets`, `settings`, `templates` (not all in module surface but reachable).

### 3.2 File-size violations (web cap 250)
- `_components/AdminPaymentsClient.js` — **503**. Split into `PaymentsHeader`, `PaymentsFilters`, `PaymentsTable`, `PaymentDetailModal`, `PaymentActionToolbar` (refund/capture/void). **Style preservation:** keep `AdminPaymentsClient.module.css` intact; new components import the same module.
- `_components/HostSelector/HostSelector.js` — **463**. Split into `HostSelectorPhoneStep`, `HostSelectorListStep`, `HostSelectorVerifyResult`, `HostSelectorActions`. **Style preservation:** keep colocated `.module.css` (or `StyleSheet`) untouched.
- `_components/EditPlanPopup.js` — **326**. Split into `PlanFormFields`, `PlanFeatureToggles`, `PlanQuotaInputs`, `EditPlanFooter`.
- `_components/subscriptionPopup/SubscriptionPopup.js` — **320**. Split into `SubscriptionPopupHeader`, `PlanCardList`, `BillingCycleToggle`, `SubscriptionFooter`. Replace direct `fetch` (line 46) with `useHostPlans` hook.
- `_components/WhitelabelCard.jsx` — **299**. Extract `WhitelabelCardActions`, `WhitelabelCardStats`, `WhitelabelCardSubscriptionRow`.
- `_components/hostCard/HostCard.js` — **273**. Extract `HostCardHeader`, `HostCardStats`, `HostCardActions`.

### 3.3 Hardcoded text / data / paths
- Inline ternaries `isArabic ? "..." : "..."` instead of `t()`:
  - `payments/_components/AdminPaymentsClient.js:94` — `isArabic ? "تم تصدير المدفوعات" : "Payments exported"`.
  - `manage-plans/_components/EditPlanPopup.js:191` — `isArabic ? "تم حفظ التغييرات بنجاح" : "Changes saved successfully"`.
  - These should become `t("adminPayments.exportSuccess", "Payments exported")` / `t("adminPlans.saveSuccess", "Changes saved successfully")`.
- Locale audit: scan each admin page tree for any remaining `isArabic` ternaries and Arabic literals. Add the missing keys to §8.

### 3.4 Data mapping bugs / fallback chains
- `WhitelabelDetailsWrapper.js:42` — `wl?.roleData || wl?.profile?.whitelabelData || {}` (3-level chain). Verify backend response shape (`/admin/whitelabels/:id`) and pick the canonical path.
- `AdminPaymentsClient.js:70-72` — multi-branch fallbacks for data extraction. Verify against `getPayments` / `getPaymentDetail` shapes (`sendPaginated` with `data.payments` + `pagination`).
- `useAdmin.js:13` — admin stats hook double-unwraps `response.data?.data || response.data`; pick the actual single shape and remove the fallback.
- `vendors/[id]/_components/VendorDetailsWrapper.js:20` — `vendorData?.vendor || vendorData`. Confirm controller wraps response under `data.vendor` and tighten.

### 3.5 Duplicate hooks / direct apiRequest calls
- `whitelabels/[id]/details/_components/WhitelabelDetailsWrapper.js:46-62` — inline `useEffect` + `apiRequest('/admin/whitelabels/:id/features')` for read AND a parallel `apiRequest(..., 'PATCH')` on toggle. Replace with new `useWhitelabelFeatures(id)` query hook + `useWhitelabelFeatureMutation()` in `hooks/reactQueryHooks/useAdmin.js`.
- `hosts/_components/subscriptionPopup/SubscriptionPopup.js:46` — direct `fetch(${API_BASE}/plans/host)`. Replace with the existing `useHostPlans` hook (already exported from `useAdmin.js`).
- `create-event/_components/HostSelector/HostSelector.js:46-65` — `useEffect` wrapping `hostsAPI.getEventTargets()`. Replace with a new `useAdminEventTargets()` query hook.
- `events/_components/EventsTable.jsx` — uses raw `useQuery`. Replace with a new `useAdminEvents()` query hook (currently only `useAdminEventMutation` exists for events on the web side).
- `EventDetailsContent` uses `eventsAPI` for subscription info. Add `useAdminUserSubscriptionInfo(userId)` hook.

### 3.6 State / loading / error gaps
- `EventsTable.jsx` — has `SimpleLoading` for isLoading but no error boundary or empty state.
- `HostsTable.jsx`, `VendorsTable.jsx` — no explicit error UI.
- `whitelabels/[id]/details/_components/WhitelabelDetailsWrapper.js` — features are loaded with raw `apiRequest` and no loading state visible to user (just a flash of empty toggles).
- Confirm every page has the `ErrorBoundary` wrapping pattern (B19) — sample didn't capture all of them.

### 3.7 Console.* statements
- `hosts/_components/eventCard/EventCard.js:80` — `console.log("data", data)` (debug log; remove).
- `hosts/_components/subscriptionPopup/SubscriptionPopup.js` — 2× `console.error` (rewrap with `handleError(error, t, { fallbackMessage: ... })`).
- `hosts/_components/hostCard/HostCard.js` — 2× `console.error` (same).
- `create-event/_components/HostSelector/HostSelector.js:59` — `console.error("Error loading targets:", error)` (use toast + handleError).
- `whitelabels/[id]/details/_components/WhitelabelDetailsWrapper.js:56` — `console.error("Error fetching features:", err)` (will be removed when migrated to canonical hook).
- `admin-dash/page.js:40` — `console.error("Error prefetching dashboard data:", error)` (Server Component prefetch — may legitimately log; keep but use logger not console).
- `admin-dash/settings/page.js` — 2× `console.error` (verify and fix).

### 3.8 Comment hygiene
- `useAdmin.js:472-475` — `// Phase 4b W1-WL-EMAIL …`
- `useAdmin.js:659` — `// §15.6` (idempotency spec ref)
- `update-event/page.js` — `// Phase 4b W1-UNIFY`
- `templates/page.js`, `templates/[id]/page.js` — `// Phase 4c W1-VISUAL` (out-of-scope for admin module review but flagged in scan)

---

## 4. Frontend Mobile Findings

### 4.1 Screen → component tree
- `screens/admin/admin-dashboard/AdminDashboardScreen.js` (98) → DashboardStats components (within `components/admin-dashboard/common/*`).
- `AdminHostsScreen.js` (94) → `components/admin-dashboard/hosts/*` (HostList 190 + HostListItem 110 + AddHostModal 210 + SubscriptionModal 307).
- `AdminVendorsScreen.js` (106) → `components/admin-dashboard/vendors/*` (VendorList 264 + VendorListItem 211 + RatingModal 248 + VendorDetailsCard 332).
- `AdminModeratorsScreen.js` (172) → `components/admin-dashboard/moderators/*` (ModeratorList 226 + ModeratorListItem 106 + **AddModeratorModal 587** — over cap).
- `AdminEventsScreen.js` (75) → `components/admin-dashboard/events/*` (AdminEventList 221 + AdminEventListItem 176 + EventDetailsCard 321 + GuestList 232 + HostSelectorStep 246 + CreateEventForm 222 + UpdateEventForm 209).
- `AdminPaymentsScreen.js` (109) → `components/admin-dashboard/payments/*` (PaymentList 33 + PaymentListItem 36 + PaymentFilters 32 + PaymentStats 45).
- `AdminWhitelabelsScreen.js` (88) → `components/admin-dashboard/whitelabels/*` (WhitelabelList 223 + WhitelabelListItem 155 + WhitelabelSubscriptionModal 348 + WhitelabelDetailsCard 52 + WhitelabelHeroCard 100 + WhitelabelActionRow 47 + WhitelabelStatsRow 43).
- `WhitelabelDetailsScreen.js` (169) — **direct `apiFetch` to `/admin/whitelabels/:id/features` on lines 64 & 71 (violation)**.
- `AdminPlansScreen.js` (137) → `components/admin-dashboard/plans/*` (PlanList 82 + PlanListItem 108 + **EditPlanModal 461** — over cap + PlanTabs 74).
- `AdminTicketsScreen.js` (303) (not strictly admin-module but lives under admin dashboard).
- `CreateEventScreen.js` (61), `HostDetailsScreen.js` (180), `VendorDetailsScreen.js` (198), `EventDetailsScreen.js` (199), settings screens.

### 4.2 File-size violations (mobile cap 350)
- `components/admin-dashboard/moderators/AddModeratorModal.js` — **587**. Split: `AddModeratorForm`, `ModeratorRolePicker`, `ModeratorWhitelabelPicker`, `ModeratorPagePermissionsGrid`. Preserve every `StyleSheet.create({...})` value verbatim.
- `components/admin-dashboard/notifications/SendNotificationModal.js` — **444**. Split: `NotificationTemplatePicker`, `NotificationVariableEditor`, `NotificationRecipientSelector`, `NotificationPreview`.
- `components/admin-dashboard/plans/EditPlanModal.js` — **461**. Split: `PlanFormFields`, `PlanFeatureToggles`, `PlanQuotaInputs`, `PlanModalFooter`.
- `components/admin-dashboard/common/AdminListItem.js` — 293 (within cap, no action). Note: an earlier scan called this out as 293 > 350 — that was wrong.
- Inspect `components/admin-dashboard/events/EventDetailsCard.js` (321) and `vendors/VendorDetailsCard.js` (332) for proximity to cap; safe today but flag if future additions push them over.

### 4.3 Service / hook violations
- `services/adminDashboardService.js` — **40+ hardcoded `/admin/*` paths** (lines 75–372). All paths must be moved into `config/api.js` under a new `ENDPOINTS.ADMIN = { HOSTS: { BASE, BY_ID(id), STATUS(id), … }, VENDORS: { … }, MODERATORS: { … }, WHITELABELS: { … }, EVENTS: { … }, PAYMENTS: { … }, EVENT_TARGETS, USER_SUBSCRIPTION_INFO(id) }`. Service file then references those constants.
- `services/adminDashboardService.js:25` — `_legacyToken` parameter in `apiRequest` is unused. Remove from signature in this PR (no consumers actually rely on it; the in-memory token from `apiFetch` is the source of truth).
- `services/adminDashboardService.js:5` — `// Phase 4 W0-AUTH` marker → remove.
- `services/adminDashboardService.js:274` — `// H-14: Phase 2 admin endpoints` → remove.
- `hooks/queries/useAdmin.js:13` — `response.data?.data || response.data` fallback (admin stats). Backend wraps under `data` consistently after Section A — pick `response.data.data` if `getStats` uses `sendSuccess`, otherwise `response.data`. Verify before changing.
- `hooks/queries/useAdmin.js:147` — `// H-15` marker → remove (preserve the role-gating `enabled: !!token && opts.enabled` mechanic).
- `hooks/queries/useAdminInfinite.js:2` — `// Phase 4 W3-PAGE` marker → remove.
- `hooks/queries/useAdminInfinite.js:43-85` — `_normalizePage` does multi-branch fallbacks for hasMore/totalPages/items. After backend §A6 enforcement, the shape is single (`sendPaginated` always returns `{ data: {<collection>}, pagination: { page, limit, total, pages } }`). Tighten to that one shape and delete the heuristic branch (`hasMore = items.length >= limit`).
- `screens/admin/admin-dashboard/WhitelabelDetailsScreen.js:12,64,71` — direct `apiFetch` calls. Replace with new `useAdminWhitelabelFeatures(id)` query hook + `useUpdateAdminWhitelabelFeatureMutation()` — both wired through `whitelabels.getFeatures()` / `whitelabels.updateFeature()` service functions in `adminDashboardService.js` + new `ENDPOINTS.ADMIN.WHITELABELS.FEATURES(id)`.
- `screens/admin/admin-dashboard/AdminHostsScreen.js:18,32` — `// Phase 4 review fix` and `// Phase 4 W3-PAGE` markers → remove.
- `components/admin-dashboard/hosts/HostList.js:27` — `// Phase 4 review fix` → remove.

### 4.4 Hardcoded text / data / paths
- All UI strings already use `t()` from a sample sweep — no hardcoded Arabic/English JSX text found in admin screens.
- Hardcoded paths: see 4.3 (whole service file).
- Hardcoded constants: page size `20` in `useAdminInfinite.js:37` — acceptable (pagination size).

### 4.5 Web/Mobile divergence
| Endpoint | Web | Mobile | Backend truth | Action |
|----------|-----|--------|---------------|--------|
| Admin events list | `/events/admin/all` (via `eventsAPI`/`API_PATHS.events.getAllEvents`) and `/admin/events/...` for some ops | `/events/admin/all` (`adminDashboardService.events.getAll`) | Backend defines `/admin/events/:id`, `/admin/events/:id/status`, etc. inside the **admin** module. The `/events/admin/*` listing path is mounted by the **events** module. | Pick canonical: list via `/events/admin/all` (events module) is fine since admin module doesn't have `GET /admin/events`; admin-only ops via `/admin/events/:id`. **Document the split** in §6 — not a bug. |
| Event delete | `/admin/events/bulk-delete` for bulk; web has both `/admin/events/:id` and a path going through `events/admin/:id` (verify) | `/admin/events/:id` (`adminDashboardService.events.delete`) | `/admin/events/:id` (admin module). | Verify web; ensure both call `/admin/events/:id`. |
| Whitelabel features | Web uses inline `apiRequest('/admin/whitelabels/:id/features', ...)` | Mobile uses inline `apiFetch('/admin/whitelabels/:id/features', ...)` | `/admin/whitelabels/:id/features` GET + PATCH. | Add canonical hooks both sides + `API_PATHS.admin.whitelabels.features(id)` web side + `ENDPOINTS.ADMIN.WHITELABELS.FEATURES(id)` mobile side. |
| Bulk-status whitelabels | Not exposed in web `useAdmin.js` (no `bulkStatus` action) | Mobile has `useBulkSuspendWhitelabelsMutation` calling `/admin/whitelabels/bulk-status` | Backend has `POST /admin/whitelabels/bulk-status`. | Add web hook + add to `API_PATHS.admin.whitelabels.bulkStatus`. |
| Bulk-delete whitelabels | Web has `useAdminWhitelabelMutation('bulkDelete')` ✓ | Mobile has `useBulkDeleteWhitelabelsMutation` ✓ | Aligned. | None. |
| Bulk-status moderators | Not in web hook list | Mobile has `useBulkSuspendModeratorsMutation` | Backend has it. | Add web hook + `API_PATHS.admin.moderators.bulkStatus`. |
| Vendor bulk-status | Web has `useAdminVendorMutation('bulkStatus')` (single action) | Mobile has 2 mutations: bulkApprove + bulkSuspend (both POST `/admin/vendors/bulk-status` with different `status` body) | Same endpoint. | Cosmetic divergence — acceptable. Document in §6. |
| Event-targets | Web reads via `hostsAPI.getEventTargets()` | Mobile reads via `adminDashboardService.hosts.getEventTargets(type)` | `/admin/event-targets` | Consolidate web side: add `useAdminEventTargets()` hook in `useAdmin.js`; rename mobile namespace from `hosts.getEventTargets` to `events.getTargets` (cleaner) — or leave as-is and document. |
| User subscription-info | Web uses `eventsAPI.getUserSubscriptionInfo(id)` | Mobile not currently consuming | `/admin/users/:id/subscription-info` | Add `useAdminUserSubscriptionInfo(id)` hook on web; mobile doesn't need a hook unless a screen consumes it. |
| Stats hook unwrap | Web doesn't have admin stats hook | Mobile `useAdminStats` does `response.data?.data || response.data` | Backend `getStats` (dashboard module) → confirm shape. | Tighten mobile to the actual shape after verification. |

### 4.6 Loading / error / empty states
- `WhitelabelDetailsScreen.js` toggles features without showing a per-toggle loading spinner — when the backend takes >1s, users may double-click. Add a per-feature pending flag.
- `AdminDashboardScreen.js:36` — `if (error) toast.error(t("common.error"))` but renders skeleton even on error. Add an error UI fallback.
- Most infinite-scroll screens render fine (`isLoading` + `isFetchingNextPage` are handled), but no explicit empty state when `pages[0].items.length === 0` — verify in the FlatList `ListEmptyComponent` prop.

### 4.7 Console.* statements
- `components/admin-dashboard/settings/SettingsNotifications.js:36, 51` — 2× `console.error`. Wrap with toast + remove raw console (or move to a logger util if mobile has one).

### 4.8 Comment hygiene (mobile)
- `services/adminDashboardService.js:5` — `// Phase 4 W0-AUTH …`
- `services/adminDashboardService.js:274` — `// H-14 …`
- `hooks/queries/useAdminInfinite.js:2` — `// Phase 4 W3-PAGE …`
- `hooks/queries/useAdmin.js:147` — `// H-15 …`
- `screens/admin/admin-dashboard/AdminHostsScreen.js:18` — `// Phase 4 review fix …`
- `screens/admin/admin-dashboard/AdminHostsScreen.js:32` — `// Phase 4 W3-PAGE …`
- `components/admin-dashboard/hosts/HostList.js:27` — `// Phase 4 review fix …`

---

## 5. Cross-Platform API Consumption Diff

| Endpoint | Aspect | Web | Mobile | Backend truth | Action |
|----------|--------|-----|--------|---------------|--------|
| GET /admin/whitelabels/:id/features | Implementation | Inline `apiRequest` in component | Inline `apiFetch` in screen | Exists | Add canonical hook **both** sides; add to API_PATHS / ENDPOINTS. |
| PATCH /admin/whitelabels/:id/features | Implementation | Inline `apiRequest` | Inline `apiFetch` | Exists | Same. |
| POST /admin/whitelabels/bulk-status | Hook | **Missing** | `useBulkSuspendWhitelabelsMutation` | Exists | Add web hook + path. |
| POST /admin/moderators/bulk-status | Hook | **Missing** | `useBulkSuspendModeratorsMutation` | Exists | Add web hook + path. |
| GET /admin/event-targets | Hook | Direct `hostsAPI.getEventTargets` | `adminDashboardService.hosts.getEventTargets` (namespace mismatch) | Exists | Add canonical `useAdminEventTargets` web hook; consider renaming mobile namespace. |
| GET /admin/payments/summary | Hook | Inline read | `useAdminPaymentSummary` | Exists | Add canonical web hook. |
| GET /admin/payments/:id | Validation | No `validateObjectId` (backend gap) | OK | Backend should validate | Fix backend (A2.4). |
| GET /admin/events/:id | Hook | Inline `useQuery` (in EventsTable / EventDetailsContent) | `useAdminEventById` | Exists | Add canonical `useAdminEvent` web hook. |
| GET /admin/users/:id/subscription-info | Hook | `eventsAPI.getUserSubscriptionInfo` (helper) | Not consumed | Exists | Add canonical web hook `useAdminUserSubscriptionInfo`. |
| Pagination shape | Mapping | `data?.data?.X` per endpoint | `data?.data?.<collection>` with multi-branch fallback in `_normalizePage` | `sendPaginated` returns `{ data: { <key> }, pagination }` | Tighten both sides to single shape after backend audit. |
| Path style | Routing | `API_PATHS.admin.*` (centralized) | Hardcoded strings in service | n/a | Migrate mobile to `ENDPOINTS.ADMIN.*`. |

---

## 6. Suspected Bugs Worth Verifying

(Things that look broken but the agent cannot confirm without running the app — flag them so the user can sanity-check.)

- **Duplicate `/hosts/export` and `/vendors/export` route registrations** (§2.2). Express keeps the second one. The first ones (lines 152, 408) become dead code. Likely no functional bug, but the `auditLog`/whitelabel guards on the duplicates are slightly different — verify both behave identically before deleting.
- **`getWhitelabels` per-row count query (`admin.service.js:1170-1182`)** — N additional `User.countDocuments` calls per page. With 50 whitelabels and 20-per-page, that is 20 sequential roundtrips. Not a bug, but a perf regression candidate; aggregation-based pre-fetch is recommended.
- **`createHost` (`admin.service.js:313-323`) & `updateHostSubscription` (`:401-409`)** — non-transactional two-step writes (Subscription create → User update). If the second write fails, the user has an orphaned subscription document. Add a session/transaction.
- **`updateEventFull` guest replace (`admin.service.js:1696-1712`)** — `Guest.deleteMany` followed by `Guest.insertMany` without a transaction. If insertMany fails, the event's prior guest list is gone. Add a transaction.
- **Whitelabel delete (`admin.service.deleteWhitelabel`, line 1513)** — verify it correctly cascades or anonymizes hosts/moderators that were tenant-scoped to the deleted whitelabel. If not, stale references are possible.
- **`/admin/payments/:id` lacks `validateObjectId('id')`** (`admin.routes.js:1284`) — invalid ID lands inside the service and throws a generic `CastError`. The global handler will translate it, but the user message is worse. Easy fix.
- **`/admin/whitelabels` listing** — filtering uses `requirePageAccess(WHITELABELS, 'view')` but no `filterByWhitelabel`. Verify that a `WHITELABEL_ADMIN` cannot list other whitelabels (the `getWhitelabels` service implementation should be enforcing this — confirm).
- **`getPaymentDetail` whitelabel scope is enforced in the controller (`§15.2B` comment)** — moving controller logic to service in §2.6 must preserve this guard. Add a unit test.
- **Mobile `WhitelabelDetailsScreen` direct apiFetch** (lines 64, 71) — works today; if backend `requirePageAccess(WHITELABELS, 'update')` was missing, a regular admin could toggle features. Confirmed RBAC is in place at `admin.routes.js:1002`. After the canonical-hook refactor the same guard applies; no functional change expected, but verify.
- **`useAdminPayments` web staleTime is 2 minutes**, **mobile is 2 minutes** — payments status (refund/capture) can change quickly. Verify that mutation `onSuccess` invalidates `["admin","payments"]` (it does) so refunded payments visibly update.
- **`hosts/_components/eventCard/EventCard.js:80`** — `console.log("data", data)` left in production code. Remove.
- **No idempotency middleware on `/admin/payments/refund | capture | void`** — verified `useAdmin.js:659` includes `§15.6` idempotency UUID in the request header but **the backend payments routes (under the `payments` module, not `admin`)** must validate that header. This is OUT OF SCOPE for the admin module review — flag for the next module review (`payments`).
- **Indexes** — listed in §2.9. Unable to confirm without inspecting `models/UserModel.js`, etc. — flagged for the user.

---

## 7. Implementation Plan (Ordered)

Apply changes in this order. Each item ends with a checkbox the agent will tick during Phase 2.

### 7.A Backend
- [ ] **A.1** Delete duplicate route registration `GET /admin/hosts/export` at `admin.routes.js:1290-1294` (keep `:152-156`).
- [ ] **A.2** Delete duplicate route registration `GET /admin/vendors/export` at `admin.routes.js:1296-1300` (keep `:408-412`).
- [ ] **A.3** Add `validateObjectId('id')` to `GET /admin/payments/:id` (`admin.routes.js:1284`).
- [ ] **A.4** Create `admin.validation.js` with all Joi schemas listed in §2.7. Export named schemas; reuse `phonePattern`, `objectId`, etc. from a shared validators module (create `shared/utils/validators.js` if it does not yet exist — confirm first).
- [ ] **A.5** Wire `validate(schema)` middleware on every POST/PATCH/PUT route in `admin.routes.js` (each entry corresponds to one schema in A.4).
- [ ] **A.6** Move tenant-binding (TENANT-F01) logic from `admin.controller.createModerator` (`admin.controller.js:243-258`) into `admin.service.createModerator`.
- [ ] **A.7** Move `Subscription.findActiveForUser` lookup from `admin.controller.createEventForHost` (`:454-462`) into a service method (or inline in `events.service.createEventForHost`).
- [ ] **A.8** Add `auditLog` middleware (using the canonical pattern from `/vendors/:id/status`) to: `PATCH /hosts/:id/status`, `PATCH /hosts/:id/subscription`, `DELETE /hosts/:id`, `POST /hosts/bulk-delete`, `DELETE /vendors/:id`, `POST /vendors/bulk-delete`, `POST /vendors/bulk-status`, `PATCH /vendors/:id/rating`, `PATCH /moderators/:id`, `PATCH /moderators/:id/status`, `DELETE /moderators/:id`, `POST /moderators/bulk-delete`, `POST /moderators/bulk-status`, `PATCH /whitelabels/:id/status`, `PATCH /whitelabels/:id/subscription`, `PATCH /whitelabels/:id/features`, `DELETE /whitelabels/:id`, `POST /whitelabels/bulk-delete`, `POST /whitelabels/bulk-status`, `PATCH /events/:id/status`, `PATCH /events/:id`, `DELETE /events/:id`, `POST /events/bulk-delete`, `POST /events/bulk-status`. Each entry includes `captureBefore` for status fields.
- [ ] **A.9** Add `bulkLimiter` (or `authLimiter`) rate-limit middleware on every `*/bulk-*` route (7 routes).
- [ ] **A.10** Wrap multi-collection writes in transactions:
  - `createHost` (subscription create + user update),
  - `updateHostSubscription` (subscription create + user update),
  - `updateEventFull` (guest deleteMany + insertMany).
- [ ] **A.11** Service: replace per-whitelabel `User.countDocuments` loop (`admin.service.js:1170-1182`) with a single `User.aggregate([{ $match: { role: HOST } }, { $group: { _id: '$whitelabelId', count: { $sum: 1 } } }])`.
- [ ] **A.12** Add `.lean()` to read-only queries in `getEventById` (`:1599-1602`) and `getPaymentDetail`'s populated event lookup (`:1960-1962`).
- [ ] **A.13** Replace populate without projection in `getWhitelabelById` (`:1204`): `populate('subscription', 'planType status currentPeriodEnd')`.
- [ ] **A.14** Replace string literal `'deleted'` with `EVENT_STATUS.DELETED` in `admin.service.js:1955` and similar (full search).
- [ ] **A.15** Replace 15× `.catch(console.error)` with `.catch(err => logger.error('admin.<area>.<op> notify failed', err))`. Verify `logger` import exists in service file (add if absent).
- [ ] **A.16** Add Swagger `@swagger` blocks for the 11 missing routes listed in §2.3. Reference `$ref: '#/components/parameters/PageParam'` etc. from `config/swagger.js`. If shared schemas are needed, add them to `components.schemas` (`AdminHost`, `AdminVendor`, `AdminModerator`, `AdminWhitelabel`, `AdminEvent`, `AdminPayment`, `AdminPaymentSummary`, `BulkIdsRequest`, `BulkStatusRequest`).
- [ ] **A.17** Comment-hygiene pass on `admin.controller.js`, `admin.routes.js`, `admin.service.js` — remove the 22 markers listed in §2.8 (preserve the routing-order comment at `admin.routes.js:1282`).
- [ ] **A.18** **Split `admin.routes.js` into 6 sub-files** + parent (per §2.1 plan). Mounted paths and Swagger blocks must remain identical. Verify `index.js` still exports the same shape.
- [ ] **A.19** **Split `admin.controller.js` into 6 area files**, with the canonical `admin.controller.js` re-exporting all named methods to preserve any external import (none expected, but be safe).
- [ ] **A.20** **Split `admin.service.js` into 7 area files** (6 areas + shared). Canonical `admin.service.js` becomes a façade that re-exports.
- [ ] **A.21** Verify all unit/integration tests (if any) under `tests/admin*` still pass against the new file layout. Update any imports.
- [ ] **A.22** **Index audit (read-only):** confirm presence of indexes listed in §2.9 on `models/UserModel.js`, `EventModel.js`, `GuestModel.js`, `SubscriptionModel.js`, `PaymentModel.js`. Report missing indexes to the user; do NOT add indexes without explicit approval (deployment-impact).

### 7.B Web
- [ ] **B.1** Add new hooks in `labbe/hooks/reactQueryHooks/useAdmin.js` (or a split file if it exceeds 250 lines after additions):
  - `useAdminEvents(filters)` (replaces inline `useQuery` in `EventsTable.jsx`),
  - `useAdminEvent(id)` (replaces inline `useQuery` in `EventDetailsContent`),
  - `useAdminEventTargets(type)` (replaces `hostsAPI.getEventTargets` in `HostSelector.js`),
  - `useAdminUserSubscriptionInfo(userId)` (replaces `eventsAPI.getUserSubscriptionInfo`),
  - `useAdminWhitelabelFeatures(id)` (query) + `useAdminWhitelabelFeatureMutation()` (mutation) — replaces inline `apiRequest` in `WhitelabelDetailsWrapper.js`,
  - `useAdminPaymentSummary(filters)`.
- [ ] **B.2** Extend `API_PATHS.admin` in `labbe/services/new-backend/api.config.js`:
  - `whitelabels.features(id)`,
  - `whitelabels.bulkStatus`,
  - `moderators.bulkStatus`,
  - `events.eventTargets`,
  - `events.userSubscriptionInfo(id)`,
  - `payments.summary`,
  - `payments.detail(id)`,
  - and any others discovered above.
- [ ] **B.3** Migrate `WhitelabelDetailsWrapper.js:46-62` to use `useAdminWhitelabelFeatures` + `useAdminWhitelabelFeatureMutation`. Remove the inline `useEffect`/`apiRequest`.
- [ ] **B.4** Replace `fetch(${API_BASE}/plans/host)` in `SubscriptionPopup.js:46` with the existing `useHostPlans` hook. Remove `console.error` calls; wrap mutations with `handleError(error, t, ...)`.
- [ ] **B.5** Replace `useEffect`+`hostsAPI.getEventTargets` in `HostSelector.js:46-65` with `useAdminEventTargets`. Remove `console.error` line 59.
- [ ] **B.6** Replace inline `useQuery` in `EventsTable.jsx` with `useAdminEvents`.
- [ ] **B.7** Tighten data-mapping fallback chains:
  - `WhitelabelDetailsWrapper.js:42`: pick canonical path for whitelabel (after backend audit, likely `wl?.profile?.whitelabelData || {}`).
  - `AdminPaymentsClient.js:70-72`: tighten to the single backend shape after §A6 (likely `data.payments` + `data.summary`).
  - `vendors/[id]/_components/VendorDetailsWrapper.js:20`: pick `vendorData?.vendor` (or whatever the controller returns).
- [ ] **B.8** Convert `isArabic ? "..." : "..."` ternaries to `t()` calls (sample: `AdminPaymentsClient.js:94`, `EditPlanPopup.js:191`). List affected lines via grep before editing. Add the new keys to §8.
- [ ] **B.9** Remove `console.log("data", data)` at `hosts/_components/eventCard/EventCard.js:80`.
- [ ] **B.10** Replace `console.error` calls in admin pages with `handleError(error, t, { fallbackMessage: ... })` (HostCard, SubscriptionPopup, settings/page.js). Keep `admin-dash/page.js:40` as `logger.error` if available, else leave with a comment marking it server-side.
- [ ] **B.11** Split `_components/AdminPaymentsClient.js` (503 → ≤250 each): `PaymentsHeader`, `PaymentsFilters`, `PaymentsTable`, `PaymentDetailModal`, `PaymentActionToolbar`. **Style preservation:** the same `*.module.css` is imported by every extracted file.
- [ ] **B.12** Split `HostSelector/HostSelector.js` (463 → ≤250 each): `HostSelectorPhoneStep`, `HostSelectorListStep`, `HostSelectorVerifyResult`, `HostSelectorActions`.
- [ ] **B.13** Split `EditPlanPopup.js` (326): `PlanFormFields`, `PlanFeatureToggles`, `PlanQuotaInputs`, `EditPlanFooter`.
- [ ] **B.14** Split `subscriptionPopup/SubscriptionPopup.js` (320): `SubscriptionPopupHeader`, `PlanCardList`, `BillingCycleToggle`, `SubscriptionFooter`.
- [ ] **B.15** Split `WhitelabelCard.jsx` (299): extract `WhitelabelCardActions`, `WhitelabelCardStats`, `WhitelabelCardSubscriptionRow`.
- [ ] **B.16** Split `hostCard/HostCard.js` (273): extract `HostCardHeader`, `HostCardStats`, `HostCardActions`.
- [ ] **B.17** Add missing loading/error/empty states in `EventsTable.jsx`, `HostsTable.jsx`, `VendorsTable.jsx`, and ensure each admin page is wrapped in `<ErrorBoundary>` per B19.
- [ ] **B.18** Comment hygiene pass: remove `// Phase 4b W1-WL-EMAIL`, `// §15.6` (replace with a JSDoc explaining idempotency), `// Phase 4b W1-UNIFY` markers in admin-touching files.

### 7.C Mobile
- [ ] **C.1** Add a new `ADMIN` namespace to `halla-mobile/config/api.js` — `ENDPOINTS.ADMIN = { HOSTS: { BASE, BY_ID, STATUS, SUBSCRIPTION, BULK_DELETE, EXPORT, VERIFY_PHONE, FIND_OR_CREATE, EVENT_TARGETS }, VENDORS: { ... }, MODERATORS: { ... }, WHITELABELS: { ..., FEATURES, BULK_STATUS }, EVENTS: { ... }, PAYMENTS: { ... }, USER_SUBSCRIPTION_INFO }`. Be exhaustive — every path used in `adminDashboardService.js` becomes a constant.
- [ ] **C.2** Replace every hardcoded `/admin/*` literal in `services/adminDashboardService.js` with the corresponding `ENDPOINTS.ADMIN.*` reference (40+ replacements).
- [ ] **C.3** Drop the unused `_legacyToken` parameter from `adminDashboardService.apiRequest` and from every public function signature. Audit consumers (queries, mutations, screens) for any leftover token args and remove them.
- [ ] **C.4** Add `whitelabels.getFeatures(whitelabelId)` and `whitelabels.updateFeature(whitelabelId, { feature, enabled })` functions to `adminDashboardService.js`.
- [ ] **C.5** Add `useAdminWhitelabelFeatures(id)` query hook in `hooks/queries/useAdmin.js` and `useUpdateAdminWhitelabelFeatureMutation` in `hooks/mutations/useAdminMutations.js`.
- [ ] **C.6** Migrate `screens/admin/admin-dashboard/WhitelabelDetailsScreen.js` to use the new hooks. Remove the `apiFetch` import and the two direct calls (lines 12, 64, 71). Add per-toggle pending state.
- [ ] **C.7** Tighten `_normalizePage` in `useAdminInfinite.js` (lines 43-85) to the single backend `sendPaginated` shape after §A6: `{ data: { <collection> }, pagination: { page, limit, total, pages } }`. Remove the heuristic fallback (`hasMore = items.length >= limit`) once the shape is confirmed.
- [ ] **C.8** Tighten `useAdminStats` (`useAdmin.js:13`): pick the canonical path (`response.data.data` if backend uses `sendSuccess`).
- [ ] **C.9** Split mobile component-cap violations:
  - `AddModeratorModal.js` (587) → `AddModeratorForm`, `ModeratorRolePicker`, `ModeratorWhitelabelPicker`, `ModeratorPagePermissionsGrid`.
  - `EditPlanModal.js` (461) → `PlanFormFields`, `PlanFeatureToggles`, `PlanQuotaInputs`, `PlanModalFooter`.
  - `SendNotificationModal.js` (444) → `NotificationTemplatePicker`, `NotificationVariableEditor`, `NotificationRecipientSelector`, `NotificationPreview`.
  **Style preservation:** every `StyleSheet.create({...})` value moves to its new file verbatim.
- [ ] **C.10** Remove `console.error` calls at `components/admin-dashboard/settings/SettingsNotifications.js:36, 51`. Replace with toast.
- [ ] **C.11** Add `ListEmptyComponent` to all admin infinite-scroll screens that lack one.
- [ ] **C.12** Comment hygiene pass: remove `// Phase 4 W0-AUTH`, `// H-14`, `// Phase 4 W3-PAGE`, `// H-15`, `// Phase 4 review fix` markers across `services/adminDashboardService.js`, `hooks/queries/useAdmin.js`, `hooks/queries/useAdminInfinite.js`, `screens/admin/admin-dashboard/AdminHostsScreen.js`, `components/admin-dashboard/hosts/HostList.js`.

### 7.D Cross-platform alignment (do AFTER A/B/C)
- [ ] **D.1** Verify both web `useAdminEvents` and mobile `useAdminEvents` map the identical pagination shape (`data.events`).
- [ ] **D.2** Verify both web and mobile call `/admin/whitelabels/:id/features` via canonical hooks (no direct `apiRequest` / `apiFetch`).
- [ ] **D.3** Add or expand a manual smoke-test checklist (in `docs/modules/admin-fullstack-review-progress.md` once Phase 2 starts) covering: list/detail/create/update/status-change/delete/bulk-action/export for each of hosts, vendors, moderators, whitelabels, events, payments — once on web, once on mobile.
- [ ] **D.4** Run backend test suite + web `npm run lint` + mobile lint. Ensure no new warnings introduced.

---

## 8. Locale-key additions required

(Listed for the user — agent does NOT modify locale JSON without explicit approval.)

These are samples discovered during the scan; a full sweep will produce a longer list in Phase 2.

- `adminPayments.exportSuccess` (en: "Payments exported", ar: "تم تصدير المدفوعات")
- `adminPlans.saveSuccess` (en: "Changes saved successfully", ar: "تم حفظ التغييرات بنجاح")
- `adminWhitelabels.features.toggleSuccess` (en: "Feature updated", ar: "تم تحديث الميزة")
- `adminWhitelabels.features.toggleError` (en: "Failed to update feature", ar: "تعذّر تحديث الميزة")
- `adminHosts.eventTargets.loadError` (en: "Failed to load event targets", ar: "تعذّر تحميل قائمة المضيفين")
- `errors.adminBoundary.title` / `errors.adminBoundary.message` (admin-page error boundaries — verify presence per page)

The full list will be expanded once each `isArabic ? ... : ...` and bare-string occurrence is enumerated during Phase 2 (B.8).

---

## 9. Rollback plan

For each implementation item, the rollback is a `git revert` of its commit. We will land changes as small, reviewable commits scoped to one bullet from §7 each (or a tight cluster), so any single rollback is precise.

Items that touch DB shape are limited:
- §A.10 transactions — additive; rollback = revert. No data migration needed.
- §A.22 (indexes, if approved separately) — `db.<col>.dropIndex(...)`. Run during a low-traffic window.

---

## 10. Acceptance checklist (run after Phase 2)

- [ ] No file in module exceeds the cap (backend 400/300/600; web 250; mobile 350).
- [ ] All endpoints have current Swagger.
- [ ] No duplicate route registrations remain in `admin.routes.js`.
- [ ] Web + Mobile call the same paths with the same shapes for every endpoint (per §5).
- [ ] No fallback chains in data mapping in this module's surface area (per §3.4 / §C.7).
- [ ] No `// FLOW-…` / `// PHASE-…` / `// W0-…` / `// H-…` / `// BUG-…` / `// TENANT-…` comments in module's surface area.
- [ ] Audit logs land in `AuditLogModel` for all sensitive admin mutations.
- [ ] Bulk endpoints rate-limited.
- [ ] All admin pages and screens have loading / error / empty states.
- [ ] `npm run lint` clean on both web and mobile.
- [ ] Backend test suite green.
- [ ] Visual smoke test: every admin page/screen renders identically before vs. after the refactor (style preservation).

---

## Notes for the User

This is a large module with several distinct concerns colliding in one folder. I recommend approving Phase 2 in **stages** to keep PRs reviewable:

1. **Stage 1 (safe + small):** §A.1–A.3 (delete duplicates + add `validateObjectId`) and §A.17 (comment hygiene). One PR, low risk.
2. **Stage 2 (validation + safety):** §A.4–A.10 (Joi + audit log + rate limit + transactions). One or two PRs.
3. **Stage 3 (perf + cleanup):** §A.11–A.16 (aggregation rewrite, lean, populate, logger, Swagger). One PR.
4. **Stage 4 (file split):** §A.18–A.20 (mechanical split). One PR per area (hosts/vendors/moderators/whitelabels/events/payments) — six PRs, each ~self-contained.
5. **Stage 5 (web):** §B.1–B.18 in 2–3 PRs (hooks first, then refactors, then comment hygiene).
6. **Stage 6 (mobile):** §C.1–C.12 in 2–3 PRs (ENDPOINTS migration first, then component splits, then comment hygiene).
7. **Stage 7 (alignment):** §D.1–D.4. One PR.

If you'd like to move forward, reply with green light (and optionally specify which stages to start with). I will execute Phase 2 in order, ticking checkboxes in this file as each item lands.
