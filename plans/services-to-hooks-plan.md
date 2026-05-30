# Services → hooks-only migration plan

## TL;DR

- **labbe (web)** does *not* "mostly work with hooks only." ~30 admin-dash files
  still import domain services directly (`AdminCreateEvent`, `HostSelector`,
  `EventsTable`, `HostsTable`, `EventStats`, `PaymentsTable`,
  `taqnyat-templates/*Popup`, etc.). The hooks that have been modernized
  (`hooks/notifications/queries.js`, `hooks/admin/*`, `hooks/staff/*`,
  `hooks/scheduledExtraReminders/*`, `hooks/taqnyatTemplates/*`,
  `hooks/templates/*`) bypass the service files entirely — they call
  `apiRequest` + `API_PATHS` directly. The services still exist only because
  consumers haven't been migrated. That is the cleanup story.

- **halla-mobile** is in the same shape, just earlier. ~25 screens/components
  import services directly, and hook directories are present but half-built
  (auth = mutations only, checkout = mutations only, dashboard = queries only,
  templates / taqnyatTemplates = queries only, etc.). The plan: fill the
  missing hook halves so every endpoint is reachable via a hook, repoint
  consumers, then delete the domain services.

## What we keep vs. delete

### Keep — infrastructure (both apps)

| labbe              | halla-mobile         | Why |
|--------------------|----------------------|-----|
| `services/http.js` | `services/http.js`   | Axios instance / `apiFetch` — auth interceptor, 401 refresh coalescer, timeout controller. The hook layer cannot replace this. |
| `services/apiResponseHandler.js` | — | Response shape helpers (`isSuccess`, `extractPagination`). Used across hooks. |
| `services/errorHandlingService.js` | (mobile has its own `@halla/shared/errors` path) | Web-specific `parseError` reads axios `error.response`. |
| `services/serverAuth.js` | — | Next.js Server Component RBAC — `cookies()`/`redirect()`. Can't move into a hook. |
| `services/guestTokenUtils.js` | `services/secureStorage.js`, `services/authErrors.js` | Storage / token helpers. Pure utilities; not API calls. |

### Delete — domain services (after migration)

| labbe (6 files)                          | halla-mobile (~22 files) |
|------------------------------------------|--------------------------|
| `adminDashboard.js`                      | `adminDashboardService.js` |
| `notification.js`                        | `notificationService.js` |
| `staff.js`                               | `staffService.js` |
| `scheduledExtraRemindersService.js`      | `scheduledExtraRemindersService.js` |
| `taqnyatTemplatesService.js`             | `taqnyatTemplatesService.js` |
| `templatesService.js`                    | `templateService.js` |
|                                          | `authService.js`, `addonsService.js`, `checkoutService.js`, `dashboardService.js`, `eventsService.js`, `eventGuestsService.js`, `hostPostEventService.js`, `locationsService.js`, `marketplaceService.js`, `messagingService.js`, `plansService.js`, `postEventService.js`, `settingsService.js`, `subscriptionService.js`, `ticketsService.js`, `userAccountService.js`, `vendorService.js` |

No "kept by design" carve-outs. Pure helpers inside services (e.g.
`formatEventForDisplay`, `calculateResponseRate`, `groupGuestsByStatus` in
`eventsService.js`) move to `utils/` or `@halla/shared/utils/event` — they are
not API code and don't belong in a hook either.

## Target hook pattern (mirror web Phase-8)

Per domain, `hooks/{domain}/`:

```
keys.js       — queryKey factory ({ all, list(params), detail(id) })
queries.js    — useQuery / useInfiniteQuery; queryFn calls apiFetch + ENDPOINTS directly
mutations.js  — useMutation; mutationFn calls apiFetch + ENDPOINTS directly
index.js      — barrel re-export
```

No domain-service indirection inside `queryFn` / `mutationFn`. The function
body is the HTTP call, like `hooks/notifications/queries.js` on web already
does. Mobile uses `apiFetch` (returns `Response`, throws on `!ok`); do **not**
introduce `apiRequest`/`apiResponseHandler` on mobile — they're axios-shaped
and the mobile fetch path already throws cleanly.

## Phasing — one PR per domain

Order by blast radius (smallest, most isolated first):

**Mobile P1 — easy fills, no consumer changes needed**

1. `taqnyatTemplates` — add `mutations.js` (`adminSync`, `adminCreate`,
   `adminAssign`, `adminDelete`)
2. `templates` — add `mutations.js` (admin CRUD + image upload)
3. `dashboard` — add `mutations.js` if any (likely none; service is read-only)
4. `auth` — add `queries.js` (`useMe`, `useSession`)
5. `checkout` — add `queries.js` (cart preview / pricing)

For each: write hook file → repoint the ≤3 consumers → delete service file.

**Mobile P2 — domain services with many consumers**

6. `notifications` — already has both halves; just repoint
   `screens/notifications/*` and `services/notificationService` re-exports
   (`formatTimeAgo` etc. → import from `@halla/shared/utils/notification`
   directly)
7. `events` (largest) — split into `crud`, `guests`, `staff`, `settings`,
   `exports` matching the service shape; keep composite calls like
   `getSingleEventStats` (Promise.all of two endpoints) as a single `useQuery`
   with the composed `queryFn`. Move display helpers
   (`formatEventForDisplay`, `calculateResponseRate`, `groupGuestsByStatus`)
   to `utils/event-display.js`.
8. `admin` (adminDashboard) — biggest consumer list (`HostList`,
   `ModeratorList`, `VendorList`, `WhitelabelList`, `AdminEventList`,
   `HostSelectorStep`, `AdminPaymentsScreen`, `AdminTicketsScreen`).
   Group by sub-API (`hostsAPI`, `moderatorsAPI`, `whitelabelAPI`,
   `vendorsAPI`, `eventsAPI`).
9. `staff` (`StaffPortalScreen.js`) — staff token handling stays in
   `services/secureStorage.js`; only API calls move to hooks.
10. `subscription`, `plans`, `addons` — overlap with checkout/payments;
    audit which consumers cross-call.
11. `vendor`, `marketplace`, `tickets`, `messaging`, `locations`,
    `settings`, `userAccount`, `postEvent`, `hostPostEvent`,
    `scheduledExtraReminders`, `eventGuests` — same pattern, one PR each.

**Web cleanup (parallel track)**

Same shape for the 6 leftover labbe domain services. Each PR:
- Confirm `hooks/{domain}/{queries,mutations}.js` covers every endpoint the
  service exposes; backfill if not
- Repoint admin-dash imports
- Delete the service file

## Per-PR checklist

- [ ] Hook halves exist and cover every endpoint on the service being retired
- [ ] `keys.js` queryKey factory present; cache invalidations updated
- [ ] All consumers grep-clean: `grep -r "from.*services/<name>" screens components contexts navigation` returns nothing
- [ ] Pure helpers extracted to `utils/` or `@halla/shared`, not deleted
- [ ] `@halla/shared` re-exports that previously routed through the service
      (e.g. `formatTimeAgo`) now imported directly by consumers
- [ ] Edge cases handled in the hook layer, not pushed back to callers:
  - **Blob exports** — `mutationFn` returns `{ blob, filename }`; the caller
    invokes `saveBlobAndShare`. The hook should not own the share UI step.
  - **FormData uploads** — `apiFetch` already detects FormData; no
    Content-Type override needed
  - **Idempotency keys** — generate inside `mutationFn`, never in the
    component
  - **Composite calls** — `Promise.all`-style services collapse into a single
    `useQuery` with the composed `queryFn`; do not split into N hooks the
    consumer has to coordinate

## Out of scope

- No new infrastructure on mobile (no `apiResponseHandler`,
  `errorHandlingService`, or `serverAuth` analogues — mobile's path is
  different and already works)
- No rewrite of `services/http.js` on either side
- No move of auth-token storage out of `secureStorage.js` /
  `guestTokenUtils.js` — those are not API services

## Locked decisions (2026-05-30)

1. **Order:** finish web cleanup first, then mobile. Sequential, not parallel.
2. **Branch / push cadence:** work on `master` in `D:/halla` (single repo
   covering both `labbe/` and `halla-mobile/`). User will clean and push
   in-flight local changes first; agent starts fresh after that. **One push
   at the end of the whole migration**, not per-domain. No intermediate
   pushes to `master`.
3. **Display helpers:** pure helpers extracted from domain services
   (`formatEventForDisplay`, `calculateResponseRate`, `groupGuestsByStatus`,
   `formatTimeAgo` family, etc.) go into `@halla/shared/utils/<domain>`
   **once** and are imported from both `labbe` and `halla-mobile`. No
   per-app duplication.
4. **PR cadence:** per-domain phasing kept as the working sequence
   internally, but since the agent only pushes once at the end, treat the
   per-domain phases as ordered commits on `master`, not separate PRs.
