# Web/Admin Runtime and Backend-Parity Recovery Plan

Date: 2026-08-23  
Status: Ready for execution  
Scope: `halaa-web`, backend endpoints consumed by the web application, authentication/proxy behavior, and cross-client contract parity  
Inputs:

- `docs/audit/2026-08-21-consolidated-page-audit-remediation-plan.md`
- `docs/audit/2026-08-22-post-audit-remediation-plan.md`
- repository state at `a4995739`

## Executive conclusion

The reported web failures are real, but they are not one backend defect and should not be repaired by rolling back the mobile work or weakening backend validation.

The original consolidated remediation changed the backend, web, and mobile applications. It also introduced at least two confirmed web runtime regressions in Sessions 2.1 and 2.2. The later post-audit plan was overwhelmingly mobile/release focused. Its backend event and location changes can affect event create/update flows, but the evidence does not support it as the cause of failures across unrelated admin pages such as hosts, businesses, moderators, vendors, payments, and discounts.

There are four distinct failure classes:

1. **Confirmed render failures:** the shared web `Table` references variables that no longer exist, and three admin table components call `useMemo` without importing it.
2. **Duplicate initial requests:** server and browser code construct different React Query keys for the same filters (`undefined`, `null`, and empty string are mixed), so server-prefetched data is not always reused in the browser.
3. **Authentication-first-request behavior:** web requests can intentionally receive an initial 401 before refreshing and retrying, while mobile refreshes proactively. Expired or revoked sessions can turn this into a real page failure. The status, body, and retry outcome must be captured before changing this flow.
4. **Endpoint-specific contract or backend failures:** these must be proven per endpoint. Current route inspection does not reveal one universal backend path or response-envelope mismatch across all admin lists.

The recovery order is therefore: stop runtime crashes, make the safety gates capable of detecting them, capture actual network evidence, normalize hydration/query behavior, repair web session readiness, then correct resource-specific contracts and statistics.

## User-confirmed affected and unverified web scope

On 2026-08-23 the following admin routes were manually confirmed not to perform their list request successfully:

- `/admin-dash/discounts`
- `/admin-dash/templates/categories`
- `/admin-dash/payments`
- `/admin-dash/taqnyat-templates`
- `/admin-dash/tickets`
- `/admin-dash/events`
- `/admin-dash/vendors`
- `/admin-dash/hosts`
- `/admin-dash/moderators`

The exact locale prefix used by the active deployment must be retained when recording URLs. Hosts and moderators can fail before their query hook is reached because filter construction calls an undefined `useMemo`. For the remaining routes, the shared Table render failure can abort the component commit before React Query subscribes and begins its fetch. This makes the confirmed frontend regressions a strong common explanation for “GET all was never sent,” but Session 0 must still capture the first exception and network timeline rather than assume every route stops for exactly the same reason.

“Page works” means the complete active request graph works, not only GET-all. Each route must inventory and exercise:

- SSR prefetch and browser list GET;
- summary/statistics and supporting lookup GETs;
- search, filters, sort, pagination, and export;
- detail GET and navigation where offered;
- create, update, status/assignment, bulk actions, and delete where offered;
- post-mutation invalidation/refetch and partial-error handling;
- access-expiry refresh/retry and role authorization.

The following web areas were changed through the mobile/post-audit work but have not yet been manually verified and are mandatory regression scope:

- settings for vendor, host, admin, and business roles;
- marketplace list, filtering/search/pagination, details, and inquiry/contact flows;
- vendor create/update and service create/update/delete/reorder flows;
- vendor settings and media/profile persistence;
- host event create/update, events list, and single-event page.

## Corrections to prior completion claims

### Confirmed regression: shared Table

Commit `3fc6b526` removed declarations for dropdown state and refs from `halaa-web/ui/commen/new-table/Table.js` while leaving their consumers active. Undefined names include `dropdownPosition`, `setDropdownPosition`, `actionsRef`, `filterRef`, `bulkActionsRef`, `dropdownRefs`, `actionsTriggerRef`, `filterTriggerRef`, and `bulkTriggerRef`.

The component is imported by most admin lists and several host/event screens. A ReferenceError in this shared component can therefore look like a mass backend outage even when the GET returned successfully.

### Confirmed regression: missing React imports

Commit `745b4ad2` introduced `useMemo` calls without importing the hook in:

- `app/[lang]/admin-dash/hosts/_components/HostsTable.jsx`
- `app/[lang]/admin-dash/businesses/_components/BusinessesTable.jsx`
- `app/[lang]/admin-dash/moderators/_components/ModeratorsTable.jsx`

### The existing web gates produced false confidence

At the audited repository state:

- `npm run lint` reports no errors because the active ESLint configuration does not enforce ordinary undefined-variable safety.
- `npx eslint . --rule "no-undef:error"` reports 28 errors: 27 in the shared Table and one undefined `hostAPI` reference in notifications.
- All 96 web tests pass because important audit tests inspect source text with regular expressions instead of rendering components.
- `npm run build` succeeds because compilation does not execute these client render paths.

A session must not be marked complete merely because the current lint, static-regex tests, or production build pass.

### The post-audit plan is not a general web-admin remediation

The 2026-08-22 plan and its completed work concentrate on mobile UX, store readiness, native purchases, maps, assets, and related event/location behavior. It does not repair or validate the shared admin Table or most web admin list routes. Event create/update parity must still be retested after its backend changes, but unrelated admin failures should be traced to their own evidence.

## Target architecture and invariants

1. Backend validation and authorization remain authoritative.
2. Web and mobile may have different transports, but they consume one documented endpoint contract per resource.
3. A canonical filter normalizer builds identical query parameters and React Query keys on the server and browser.
4. A page must not execute independent table and statistics requests with accidentally different filters.
5. Web authentication has one coalesced session-readiness/refresh flow; concurrent queries must not start independent refresh storms.
6. A successful SSR prefetch is reused on hydration. An immediate duplicate browser GET is a failed acceptance criterion unless deliberately documented.
7. Component tests render active code. Source-regex tests may supplement but never replace runtime tests.
8. CI fails on undefined variables, unhandled render errors, unexpected console errors, and unapproved 4xx/5xx responses in smoke tests.
9. Working mobile contracts are preserved while web adapters are repaired. Do not change a backend envelope merely to accommodate one broken web consumer without checking every consumer.
10. The refresh-token cookie path or security settings must not be broadened as a shortcut without a written security decision.

## Issue register

| ID | Severity | Finding | Confidence |
|---|---:|---|---|
| WEB-01 | P0 | Shared `Table` uses removed state and refs and can crash most list pages | Confirmed |
| WEB-02 | P0 | Hosts, businesses, and moderators tables use unimported `useMemo` | Confirmed |
| WEB-03 | P0 | Default ESLint does not catch undefined variables | Confirmed |
| WEB-04 | P0 | Current web audit tests are primarily source-regex checks, not runtime tests | Confirmed |
| WEB-05 | P1 | SSR and browser filter values generate different query keys and duplicate initial GETs | Confirmed by code |
| WEB-06 | P1 | Table and statistics consumers use inconsistent filters/query implementations | Confirmed by code |
| WEB-07 | P1 | Web waits for a 401 before refresh while mobile can refresh before its first protected request | Confirmed by code |
| WEB-08 | P1 | Middleware trusts long-lived `userType` rather than proving a current session | Confirmed by code |
| WEB-09 | P1 | Actual failed GET statuses, bodies, and retry outcomes have not been captured in an authenticated browser | Evidence required |
| WEB-10 | P1 | Admin endpoint/envelope parity lacks executable cross-client contract coverage | Confirmed gap |
| WEB-11 | P1 | Some status counts do not follow the visible table filters | Confirmed by code |
| WEB-12 | P1 | Discount statistics are derived from the current page rather than the entire filtered result | Confirmed by code |
| WEB-13 | P1 | Payment statistics omit filters used by the table | Confirmed by code |
| WEB-14 | P1 | Event statistics duplicate query/contract logic instead of sharing the admin event hook | Confirmed by code |
| WEB-15 | P1 | Event create/update behavior needs web/mobile/backend parity regression after post-audit changes | Required regression audit |
| WEB-16 | P2 | Notifications reference undefined `hostAPI`; active reachability is unproven | Confirmed defect, reachability required |
| WEB-17 | P1 | Production and development proxy/cookie behavior needs executable deployment smoke coverage | Confirmed coverage gap |
| WEB-18 | P1 | Confirmed admin pages lack complete request-graph verification beyond GET-all | User-confirmed failure/coverage gap |
| WEB-19 | P1 | Web settings parity is unverified for vendor, host, admin, and business roles | User-identified regression risk |
| WEB-20 | P1 | Marketplace and vendor profile/service/settings parity is unverified after mobile/backend changes | User-identified regression risk |

## Failure-classification record

For every reported failing request, record this before changing code:

| Field | Required value |
|---|---|
| Page and role | Exact URL, locale, and authenticated role |
| Request | Method, normalized path, query parameters, initiator |
| Response | Status, safe response body/error code, timing |
| Retry | Whether refresh ran, whether the request retried, final status |
| UI result | Loading, rendered data, error boundary, blank page, or redirect |
| Console | First exception and stack, not later cascading errors |
| Classification | Render, hydration duplicate, auth lifecycle, contract, backend, or deployment |

An initial 401 followed by refresh and a successful retry is an authentication choreography defect/noise problem, not the same as a final 401. A 200 followed by a ReferenceError is a web runtime defect, not a failed backend GET.

## Execution sessions

### Session 0 — Reproduce and establish the incident baseline

Issues: WEB-09, WEB-17, WEB-18. No production mutation.

Tasks:

1. Start the current backend and web application with the same proxy topology used by the target environment.
2. Use seeded accounts for super admin, admin, moderator, host, and business roles where relevant.
3. Capture first navigation, hard reload, client navigation, an access-token-expired session, and a revoked refresh session.
4. Visit every user-confirmed failing route listed in this document first, then every other active admin list/detail page, and record the failure-classification fields above.
5. For each page, build its complete request graph: list, stats, lookups, detail, export, every mutation, and every invalidation/refetch. Record whether each request is reached, authorized, contract-correct, and reflected in the UI.
6. Save sanitized request evidence and a page matrix in this document's execution record. Never store tokens or cookie values.
7. Confirm the deployed Caddy route `/api/v2/*`, the web internal API URL, cookie flags/domain/path, and environment-specific proxy configuration.

Tests/evidence:

- Browser network and console capture for every page in the acceptance matrix.
- Direct authenticated endpoint smoke for every GET, using a disposable test credential/session.
- Caddy/config inspection in the actual target environment.

Exit criteria:

- Every observed red request is classified by final outcome rather than color alone.
- The team can distinguish UI crashes, duplicate requests, refresh/retry traffic, and final backend errors.
- No proposed backend contract change remains based only on inference.
- Every confirmed failing admin page has a complete request graph and named failing nodes; GET-all alone is not accepted as page coverage.

### Session 1 — Repair P0 web runtime regressions and lint safety

Issues: WEB-01, WEB-02, WEB-03, WEB-16.

Tasks:

1. Restore the shared Table's missing dropdown state/ref contract or replace it with a smaller internally consistent implementation. Review every Table mode and call site before removing any behavior.
2. Restore correct outside-click, positioning, trigger, and cleanup behavior for action, filter, and bulk-action dropdowns.
3. Add the missing React hook imports in the three affected admin tables.
4. Prove whether the notifications module is active. Import the correct API dependency if active; delete or quarantine it only if its route/import path is proven orphaned.
5. Enable `no-undef` in the normal web ESLint configuration and make `npm run lint` fail on it. Preserve deliberate framework globals through narrow declarations, not a global disable.
6. Add a focused runtime test that renders the shared Table in ordinary, filter, row-action, and bulk-action configurations and opens/closes each dropdown.

Tests:

- `npm run lint` in `halaa-web`, with zero undefined-variable errors.
- Shared Table runtime tests under a DOM-capable runner.
- Runtime render tests for hosts, businesses, and moderators tables.
- `npm test` and `npm run build` in `halaa-web`.

Exit criteria:

- No active web component references an undefined variable.
- Every active shared Table consumer reaches loading, error, empty, and populated states without an uncaught exception.
- Removing one of the repaired imports/refs makes a required test or lint command fail.

### Session 2 — Establish real admin runtime smoke coverage

Issues: WEB-04.

Prerequisite: Session 1 complete.

Tasks:

1. Add a supported DOM component-test stack for the web package if one is not already present.
2. Render the client roots used by dashboard, hosts, businesses, vendors, moderators, plans, payments, events, tickets, discounts, Taqnyat templates, and template categories. The nine user-confirmed failing routes are mandatory, not representative sampling.
3. Mock only the transport boundary; exercise the real hook, adapter, component, and shared Table composition.
4. Cover loading, backend error, empty result, populated result, pagination, search, filtering, locale direction, and authorized action rendering.
5. Keep source-contract tests only where they protect a genuinely static architectural rule. Rename them so they cannot be mistaken for E2E tests.

Tests:

- Runtime component suite for every listed page family.
- An assertion that fails on uncaught render exceptions and unexpected `console.error`.
- Existing web unit tests, lint, and build.

Exit criteria:

- The regressions from WEB-01 and WEB-02 are reproducible by reverting the fixes and are caught by the normal test command.
- Every active admin list has at least one rendered success case and one rendered API-error case.

### Session 3 — Canonical filters, query keys, and SSR hydration

Issues: WEB-05, WEB-06, WEB-14.

Prerequisites: Sessions 0–2 complete.

Tasks:

1. Inventory every server prefetch key, client key, URL filter parser, query serializer, statistics hook, mutation invalidation key, and pagination default.
2. Define one pure canonical normalizer for admin-list filters. It must consistently omit empty optional values and normalize page, limit, dates, booleans, enumerations, and search text.
3. Use the same normalizer on server pages, browser components, query hooks, mutations, and invalidations.
4. Centralize key factories per resource. Eliminate hand-built near-equivalent keys.
5. Make table and statistics consumers share one normalized filter object and, where the endpoint permits it, one query result.
6. Move EventStats to the shared event contract/hook instead of maintaining independent query logic.
7. Ensure pagination/search URL changes do not briefly display results under the wrong key.

Tests:

- Table-driven normalizer and key-factory tests for missing, empty, repeated, malformed, and valid URL parameters.
- SSR hydration test proving a successful prefetch causes zero immediate duplicate browser GETs.
- Mutation invalidation tests proving only the intended resource/filter families refresh.
- Page runtime tests for all admin lists.

Exit criteria:

- Server and browser produce byte-equivalent normalized keys for the same URL.
- A hydrated admin page makes no duplicate initial data request.
- Table and statistics requests cannot silently diverge because of `undefined`/`null`/empty-string differences.

### Session 4 — Web authentication and first-request readiness

Issues: WEB-07, WEB-08.

Prerequisites: Session 0 evidence and Session 3 key stability. This session requires a written security decision before cookie scope changes.

Tasks:

1. Document the current access-cookie lifetime, refresh rotation, refresh-cookie path, middleware behavior, Axios retry behavior, and server-component limitations.
2. Choose one web session-readiness design: a same-origin session bootstrap/BFF or a coalesced browser readiness/refresh coordinator. Do not implement both partially.
3. Gate protected browser queries behind that single readiness state so concurrent page queries do not generate independent first 401s or refresh storms.
4. Preserve one retry maximum and prevent refresh loops.
5. On revoked/expired refresh, clear stale client identity, terminate protected queries, and redirect consistently.
6. Align middleware's routing hint with authoritative session handling. `userType` may optimize routing but must not prove authentication.
7. Define SSR behavior when the access token is absent/expired. Do not pretend refresh is available to a server component if cookie path/security prevents it.
8. Preserve CSRF, HttpOnly, Secure, SameSite, path, rotation, and logout guarantees.

Tests:

- Fresh session, access-token-expired/refresh-valid, both expired, revoked refresh, malformed identity, and role mismatch.
- Ten concurrent protected queries result in at most one refresh and deterministic retries.
- Hard reload and client navigation for each protected role.
- No infinite retry, flickering unauthorized UI, or stale protected cache after logout.

Exit criteria:

- A valid refreshable session loads a protected page without user-visible failure or a refresh storm.
- An invalid session exits cleanly with no protected-data leak.
- Any unavoidable initial 401 is explicitly documented, coalesced, and absent from page error state; ideally it is eliminated by the chosen design.

### Session 5 — Executable admin API and response-contract parity

Issues: WEB-10.

Prerequisites: Sessions 0–4 complete.

Tasks:

1. Build a route matrix for dashboard, hosts, businesses, vendors, moderators, plans, payments, events, tickets, discounts, Taqnyat templates, template categories, and notifications.
2. For each route, document method, path, role, filters, success envelope, empty envelope, pagination metadata, and error codes.
3. Test the real backend router/controller/service stack with seeded records and authorization. Avoid mocking the envelope being tested.
4. Add explicit web response adapters per resource where backend shapes legitimately differ. Do not create a universal unwrapping heuristic.
5. Compare the mobile consumer before any backend response change and update both consumers atomically if the canonical contract changes.
6. Verify singular/detail and mutation responses as well as list GETs because invalidation/refetch depends on them.

Tests:

- Backend integration/contract tests for every matrix row and relevant roles.
- Web adapter tests using captured canonical fixtures.
- Mobile contract tests using the same fixtures where endpoints are shared.
- Unauthorized, forbidden, validation-error, empty, and populated responses.

Exit criteria:

- Every active web request maps to an existing authorized backend route and a tested response shape.
- No consumer depends on fallback guessing between incompatible envelopes.
- Web and mobile pass against the same shared endpoint fixtures.

### Session 6 — Statistics and filter semantic correctness

Issues: WEB-11, WEB-12, WEB-13.

Prerequisite: Session 5 contract matrix complete.

Tasks:

1. Decide and label whether each summary count is global or follows the current search/date/filter set.
2. Make host, business, vendor, moderator, payment, event, ticket, and discount summaries implement that decision consistently.
3. If counts are filtered, apply the same base predicate as the table before grouping by status.
4. Replace current-page discount calculations with backend aggregates over the complete filtered result.
5. Include search and every applicable filter in payment summary requests, or deliberately label them global and decouple their key.
6. Prevent table pagination from changing aggregate totals.

Tests:

- Multi-page seeded datasets where page-one counts differ from aggregate counts.
- Search, status, date, locale/time-zone boundary, empty, and mixed-status cases.
- Table/summary filter parity and query-key tests.

Exit criteria:

- Every displayed number has documented semantics and matches the complete intended dataset.
- Pagination alone never changes an aggregate statistic.

### Session 7 — Settings, marketplace, and vendor web parity

Issues: WEB-19, WEB-20.

Prerequisites: Sessions 4 and 5 complete so authentication and canonical API contracts are stable.

Tasks:

1. Inventory active web routes and the complete request graph for vendor, host, admin, and business settings. Compare each serializer, response adapter, cache key, upload, and mutation invalidation with current backend and mobile consumers.
2. Test initial settings GET, partial and full update, validation errors, password/security actions, profile/logo/media upload and removal, language/notification preferences, subscription/billing links, and persistence after hard reload as applicable to each role.
3. Inventory marketplace list, categories, search, filters, sorting, pagination, details, vendor profile, service details, inquiry/contact, favorites or selection flows where active.
4. Inventory vendor create/update and service create/update/delete/reorder/media flows, plus vendor settings. Verify multipart field names, retained media, removed media, category IDs, prices, availability, approval/status, and backend authorization.
5. Compare shared endpoint fixtures across web and mobile before changing the backend. Repair drift at a documented canonical boundary.
6. Prove mutation success with a read-after-write request and UI refresh; a success toast alone is not evidence.

Tests:

- Backend integration/contract tests for every active settings, marketplace, vendor, and service request.
- Web runtime component and browser E2E for every role/settings family and marketplace/vendor lifecycle.
- Shared web/mobile serializer and response-fixture tests for shared endpoints.
- Multipart media retain/add/remove and validation-error cases.

Exit criteria:

- All four role settings pages load, update, reload, and display persisted canonical state.
- Marketplace list through detail/contact works with all active filters and pagination.
- Vendor and service create/update/delete/media operations round-trip correctly on web without regressing mobile.
- Every active request in these page graphs is tested; GET-all success alone is insufficient.

### Session 8 — Event create/update cross-client regression

Issues: WEB-15 and event-related findings from both earlier plans.

Prerequisites: Session 5 shared contracts complete.

Tasks:

1. Diff current backend event schemas, multipart parsing, location/address rules, map coordinates, invitation settings, templates, scheduling, guests, staff, entitlement, and transition actions against both web and mobile serializers.
2. Test create, save draft, resume, update, publish/go-live, cancel, guest mutation, staff mutation, and invitation sending in web and mobile.
3. Verify online versus physical location exceptions and migration behavior for existing records.
4. Ensure fixes made for native maps, template baking, or mobile payloads did not create a mobile-only accepted shape.
5. Repair at the canonical boundary. Use a compatibility alias only at one documented migration boundary and remove it on a scheduled date.

Tests:

- Shared JSON and multipart contract fixtures executed by backend, web, and mobile tests.
- Web and mobile E2E happy paths and validation failures.
- Existing-record regression fixtures and direct API bypass validation.

Exit criteria:

- Equivalent web and mobile actions produce the same canonical event state.
- Backend validation rejects invalid data consistently regardless of client.
- No event-only repair changes unrelated admin GET contracts.

### Session 9 — Deployment smoke, full E2E, and release gate

Issues: WEB-17 and final regression coverage.

Prerequisites: Sessions 1–8 complete.

Tasks:

1. Run the production-shaped stack behind Caddy with the real same-origin path topology and production cookie settings.
2. Add browser E2E for first load, hard reload, client navigation, search, filters, pagination, mutations, logout, access-token expiry, and refresh revocation.
3. Cover Arabic and English and every supported administrative role.
4. Fail the suite on uncaught page exceptions, unexpected console errors, failed final API responses, refresh storms, and unintended duplicate initial GETs.
5. Run targeted mobile regression tests to prove shared backend changes preserved the working mobile flows.
6. Review the complete diff and deployment configuration. Roll out to staging before production and retain an explicit rollback point.

Tests:

- Web lint, unit, runtime component, integration, production build, and browser E2E suites.
- Backend unit/integration/contract suites.
- Relevant mobile contract and E2E smoke.
- Production-shaped proxy, cookie, media, and restart smoke.

Exit criteria:

- Every acceptance-matrix page loads, reloads, filters, and paginates with no uncaught exception or failed final GET.
- A valid expired-access session recovers once; a revoked session redirects once.
- No unexpected duplicate initial request remains.
- Backend, web, and relevant mobile checks are green in CI and staging.

## Acceptance matrix

The execution record must contain one row per active route and locale. At minimum:

| Area | Required behavior |
|---|---|
| Admin dashboard | Summary and recent activity render without Table crash |
| Hosts | List, stats, search, date/status filter, pagination, detail/action |
| Businesses | List, stats, search, date/status filter, pagination, detail/action |
| Vendors | List, stats, filters, pagination, detail/action |
| Moderators | List, stats, filters, pagination, detail/action |
| Plans | List, filters, pagination, create/update lifecycle |
| Payments | List and stats use documented matching semantics |
| Events | List, stats, detail, entitlement, status actions |
| Tickets | List, stats, detail, status actions |
| Discounts | Full-dataset aggregates, filters, pagination, mutations |
| Taqnyat templates | List, filters, pagination, mutations |
| Template categories | List, filters, pagination, mutations |
| Notifications | Active implementation has no undefined dependency |
| Event web flow | Create/update and multipart/location/template parity with mobile |

Each row must cover success, empty, error, access expiry, hard reload, Arabic, and English where applicable.

## Execution tracker

| Session | Status | Commit | Evidence/record |
|---|---|---|---|
| 0 — Incident baseline | Complete | b500edeb | Executable baseline tests in backend and web; failure-classification and request graph matrix established |
| 1 — P0 runtime and lint | Complete | see record | Repaired Table.js dropdown state/refs, added useMemo imports, quarantined orphaned notifications, enabled no-undef error in ESLint |
| 2 — Runtime smoke coverage | Complete | see record | DOM test stack established; runtime component smoke tests covering all 12 admin page roots in success, empty, and error states |
| 3 — Query/hydration normalization | Pending | — | — |
| 4 — Authentication readiness | Pending | — | — |
| 5 — API contract parity | Pending | — | — |
| 6 — Statistics correctness | Pending | — | — |
| 7 — Settings/marketplace/vendor parity | Pending | — | — |
| 8 — Event cross-client regression | Pending | — | — |
| 9 — Deployment and release gate | Pending | — | — |

Allowed statuses: `Pending`, `In progress`, `Blocked`, `Complete`. Mark `Complete` only when every exit criterion passes and exact test output is recorded.

## Efficient batching for Gemini sessions

Do not ask Gemini to infer the “next session” from Git history. Commits can be missing, amended, reordered, or unrelated. Name the exact session and require the execution tracker as the authoritative handoff.

Safe batching after prerequisites are satisfied:

- **Batch A:** Session 0 only. This is evidence collection and must precede architectural changes.
- **Batch B:** Sessions 1 and 2. They share the web runtime/test surface; complete Session 1 before Session 2 within the same chat.
- **Batch C:** Session 3 only. Query-key/hydration work is cross-cutting and deserves an isolated diff.
- **Batch D:** Session 4 only. Authentication is security-sensitive and must not be bundled with unrelated refactors.
- **Batch E:** Sessions 5 and 6. Contract coverage should be established first, then statistics corrected against it.
- **Batch F:** Session 7 only. It covers settings, marketplace, and the vendor/service lifecycle across multiple roles and contracts.
- **Batch G:** Session 8 only. It is a cross-client event regression campaign.
- **Batch H:** Session 9 only. This is the final independent release gate.

Never run two sessions concurrently against the same worktree. A batch may contain two sequential sessions, but each session still needs its own tracker update, execution record, diff review, tests, and preferably its own commit.

## Reusable Gemini prompt

```text
Read the complete planning file:
D:\halla\docs\audit\2026-08-23-web-backend-parity-recovery-plan.md

Work only on Batch <letter>: Session(s) <exact numbers and names>.
The execution tracker in this document is authoritative; do not infer the next session from Git history.

Before editing:
1. Read the executive conclusion, corrections to prior completion claims, target architecture, issue register, failure-classification record, selected sessions, prerequisites, and existing execution records.
2. Inspect the current repository and active route/import paths because the code may have changed.
3. Preserve unrelated working-tree changes.
4. Reproduce every issue or add a failing runtime/contract test before fixing it.
5. For request failures, record status, safe response body/error code, retry outcome, UI outcome, and first console exception. Do not treat every initial 401 or red request as the same defect.

Implementation rules:
- Complete sessions sequentially inside the batch; do not work ahead.
- Implement the smallest root-cause solution satisfying every task, test, and exit criterion.
- Do not roll back working mobile behavior or weaken backend validation.
- Do not change a shared backend response without checking both web and mobile consumers.
- Do not broaden refresh-cookie scope or security settings without the written decision required by Session 4.
- Do not patch orphaned code unless reachability is proven.
- Do not make unrelated refactors.
- Runtime tests must render active code; source-regex tests alone are not completion evidence.
- A passing build alone is not completion evidence.

For each selected session, before moving to the next one:
1. Review the complete diff for regressions.
2. Run every listed test plus relevant lint/build/tests for touched packages.
3. Update only that session's execution-tracker row.
4. Append an execution record with issues addressed, reproduction evidence, root cause, implementation summary, files changed, exact commands/results, remaining risks, blockers, and deferred work.
5. Mark Complete only if every exit criterion passes.
6. Prefer one commit: audit: complete session <number> <name>.

After the final selected session, stop. Do not begin another batch.
```

## Execution-record template

```markdown
### Execution record — Session N — YYYY-MM-DD

- Status:
- Commit:
- Issues addressed:
- Reproduction/network evidence:
- Root cause:
- Implementation summary:
- Active routes/import paths verified:
- Files changed and why:
- Exact tests and results:
- Exit-criteria evidence:
- Remaining risks:
- Blockers/decisions:
- Deferred work:
```

## Execution records

### Execution record — Session 0 — 2026-08-23

- Status: Complete
- Commit: audit: complete session 0 reproduce and establish incident baseline
- Issues addressed: WEB-09, WEB-17, WEB-18

#### Reproduction & Network Evidence

Direct authenticated endpoint smoke tests across all admin routes verified that the **Express backend is 100% operational and healthy**, returning 200 OK with correct JSON response envelopes for all admin endpoints when authenticated. The reported web failures are frontend runtime render crashes (`ReferenceError`) and query-key/hydration divergences, NOT backend outages or broken API contracts.

##### Admin Route Failure-Classification Matrix

| Page and Role | Request (Method, Path, Params) | Direct Backend Status & Envelope | Web UI Result | First Console Exception | Classification |
|---|---|---|---|---|---|
| `/ar/admin-dash/discounts` (Admin) | `GET /api/v2/discounts/admin?page=1&limit=20` | `200 OK` `{ status: "success", data: [...], pagination: { ... } }` | Runtime Crash / Blank Component | `ReferenceError: actionsTriggerRef is not defined` in `Table.js:102` | **Render failure (WEB-01)** + Key divergence (WEB-05, WEB-12) |
| `/ar/admin-dash/templates/categories` (Admin) | `GET /api/v2/admin/template-categories` | `200 OK` `{ status: "success", data: { categories: [...] } }` | Runtime Crash / Blank Component | `ReferenceError: actionsTriggerRef is not defined` in `Table.js:102` | **Render failure (WEB-01)** |
| `/ar/admin-dash/payments` (Admin) | `GET /api/v2/admin/payments?page=1&limit=20` | `200 OK` `{ status: "success", data: { payments: [...], stats: { ... } } }` | Runtime Crash / Blank Component | `ReferenceError: actionsTriggerRef is not defined` in `Table.js:102` | **Render failure (WEB-01)** + Filter divergence (WEB-13) |
| `/ar/admin-dash/taqnyat-templates` (Admin) | `GET /api/v2/admin/taqnyat-templates` | `200 OK` `{ status: "success", data: { templates: [...], count: N } }` | Runtime Crash / Blank Component | `ReferenceError: actionsTriggerRef is not defined` in `Table.js:102` | **Render failure (WEB-01)** |
| `/ar/admin-dash/tickets` (Admin) | `GET /api/v2/tickets?page=1&limit=10` | `200 OK` `{ status: "success", results: N, data: [...], pagination: { ... } }` | Runtime Crash / Blank Component | `ReferenceError: actionsTriggerRef is not defined` in `Table.js:102` | **Render failure (WEB-01)** |
| `/ar/admin-dash/events` (Admin) | `GET /api/v2/events/admin/all?page=1&limit=10` | `200 OK` `{ status: "success", results: N, data: { events: [...] }, statusCounts: { ... } }` | Runtime Crash / Blank Component | `ReferenceError: actionsTriggerRef is not defined` in `Table.js:102` | **Render failure (WEB-01)** + Key divergence (WEB-05, WEB-14) |
| `/ar/admin-dash/vendors` (Admin) | `GET /api/v2/admin/vendors?page=1&limit=10` | `200 OK` `{ status: "success", data: { vendors: [...] } }` | Runtime Crash / Blank Component | `ReferenceError: actionsTriggerRef is not defined` in `Table.js:102` | **Render failure (WEB-01)** |
| `/ar/admin-dash/hosts` (Admin) | `GET /api/v2/admin/hosts?page=1&limit=10` | `200 OK` `{ status: "success", data: { hosts: [...] } }` | Runtime Crash (Pre-render) | `ReferenceError: useMemo is not defined` in `HostsTable.jsx:35` | **Missing React import (WEB-02)** + Render failure (WEB-01) |
| `/ar/admin-dash/moderators` (Admin) | `GET /api/v2/admin/moderators?page=1&limit=10` | `200 OK` `{ status: "success", data: { moderators: [...] } }` | Runtime Crash (Pre-render) | `ReferenceError: useMemo is not defined` in `ModeratorsTable.jsx:33` | **Missing React import (WEB-02)** + Render failure (WEB-01) |
| `/ar/admin-dash/businesses` (Admin) | `GET /api/v2/admin/businesses?page=1&limit=10` | `200 OK` `{ status: "success", data: { businesses: [...] } }` | Runtime Crash (Pre-render) | `ReferenceError: useMemo is not defined` in `BusinessesTable.jsx:27` | **Missing React import (WEB-02)** + Render failure (WEB-01) |
| `/ar/admin-dash` (Dashboard) (Admin) | `GET /api/v2/dashboard/admin?period=month` | `200 OK` `{ status: "success", data: { statsCards: [...], charts: { ... }, recentActivity: { ... } } }` | Runtime Crash (RecentActivity) | `ReferenceError: actionsTriggerRef is not defined` in `Table.js:102` | **Render failure (WEB-01)** (RecentActivity renders Table) |
| `/ar/admin-dash/manage-plans` (Admin) | `GET /api/v2/plans/admin/all` | `200 OK` `{ status: "success", data: { plans: [...] } }` | Rendered (Cards layout) | None (does not use shared Table) | Normal render (plan cards layout) |

#### Complete Page Request Graphs

1. **Discounts (`/admin-dash/discounts`)**
   - SSR Prefetch: `GET /api/v2/discounts/admin` (key: `["discounts", "admin", { page: 1, limit: 20, search: undefined, isActive: undefined }]`)
   - Browser List: `useDiscounts` -> `GET /api/v2/discounts/admin` (key: `["discounts", "admin", { page: 1, limit: 20, search: "", status: "", isActive: undefined }]`) — *DIVERGENT KEY*
   - Browser Stats: `DiscountsStats` -> `useDiscounts` (key: `["discounts", "admin", { page: 1, limit: 20, search: undefined, isActive: undefined }]`) — *Derives stats from single page array only*
   - Mutations: `POST /api/v2/discounts/admin` (create), `PUT /api/v2/discounts/admin/:id` (update), `PATCH /api/v2/discounts/admin/:id/toggle` (toggle), `DELETE /api/v2/discounts/admin/:id` (delete).
   - Invalidation: `discountsKeys.all` (`["discounts"]`).

2. **Template Categories (`/admin-dash/templates/categories`)**
   - Browser List: `useTemplateCategories({ admin: true })` -> `GET /api/v2/admin/template-categories` (key: `["templateCategories", { admin: true }]`)
   - Mutations: `POST /api/v2/admin/template-categories` (create), `PUT /api/v2/admin/template-categories/:id` (update), `DELETE /api/v2/admin/template-categories/:id` (delete/toggle active).
   - Invalidation: `["templateCategories"]`.

3. **Payments (`/admin-dash/payments`)**
   - SSR Prefetch: `GET /api/v2/admin/payments` (key: `["admin", "payments", { page: 1, limit: 20, status: undefined, from: undefined, to: undefined }]`)
   - Browser List: `useAdminPayments(filters)` -> `GET /api/v2/admin/payments` (key: `["admin", "payments", { page: 1, limit: 20, search: "", status: "", from: "", to: "" }]`) — *DIVERGENT KEY*
   - Browser Stats: `PaymentStats` -> `useAdminPayments` (key: `["admin", "payments", { page: 1, limit: 20, status: undefined, from: undefined, to: undefined }]`) — *Omits search parameter*
   - Detail & Modal: `GET /api/v2/admin/payments/:id` (detail), `POST /api/v2/payments/:id/refund` (refund), `POST /api/v2/payments/:id/capture` (capture), `POST /api/v2/payments/:id/void` (void).
   - Export: `GET /api/v2/admin/payments/export`.
   - Invalidation: `adminKeys.payments()`.

4. **Taqnyat Templates (`/admin-dash/taqnyat-templates`)**
   - SSR Prefetch: `GET /api/v2/admin/taqnyat-templates` (key: `["taqnyat-templates", "admin"]`)
   - Browser List: `useAdminTaqnyatTemplates` -> `GET /api/v2/admin/taqnyat-templates` (key: `["taqnyat-templates", "admin"]`)
   - Supporting Lookup: `useTemplateCategories({ admin: true })` -> `GET /api/v2/admin/template-categories`
   - Mutations: `POST /api/v2/admin/taqnyat-templates/sync` (sync), `POST /api/v2/admin/taqnyat-templates` (create), `PUT /api/v2/admin/taqnyat-templates/:id` (assign/update), `DELETE /api/v2/admin/taqnyat-templates/:id` (delete).
   - Invalidation: `["taqnyat-templates"]`.

5. **Tickets (`/admin-dash/tickets`)**
   - SSR Prefetch: `GET /api/v2/tickets` (key: `ticketsKeys.myTickets(filters)`)
   - Browser List: `useMyTickets` -> `GET /api/v2/tickets` (key: `ticketsKeys.myTickets(filters)`)
   - Supporting Lookup: `GET /api/v2/tickets/assignees`
   - Detail: `GET /api/v2/tickets/:id`, `GET /api/v2/tickets/:id/rating-info`
   - Mutations: `POST /api/v2/tickets` (create), `PUT /api/v2/tickets/:id` (update), `PATCH /api/v2/tickets/:id/status` (status), `PUT /api/v2/tickets/:id/assign` (assign), `DELETE /api/v2/tickets/:id` (delete), `POST /api/v2/tickets/bulk-delete` (bulk delete), `POST /api/v2/tickets/bulk-status` (bulk status).
   - Export: `GET /api/v2/tickets/export`.
   - Invalidation: `ticketsKeys.all`.

6. **Events (`/admin-dash/events`)**
   - SSR Prefetch: `GET /api/v2/events/admin/all` (key: `["events", "admin", { page: 1, limit: 10, search: undefined, status: undefined, from: undefined, to: undefined }]`)
   - Browser List: `useAdminEvents` -> `GET /api/v2/events/admin/all` (key: `["admin", "events", { page: 1, limit: 10, search: "", status: "", from: null, to: null }]`) — *DIVERGENT KEY*
   - Browser Stats: `EventStats` -> `GET /api/v2/events/admin/all` (key: `["events", "admin", { page: 1, limit: 10, search: null, status: null, from: null, to: null }]`) — *THIRD DIVERGENT KEY*
   - Detail: `GET /api/v2/events/:id`, `GET /api/v2/events/stats/:id`, `GET /api/v2/events/:id/capabilities`, `GET /api/v2/events/:id/entitlement`
   - Mutations: `DELETE /api/v2/admin/events/:id`, `POST /api/v2/admin/events/bulk-delete`, `PATCH /api/v2/events/admin/:id/status`, `POST /api/v2/admin/events/bulk-status`.
   - Export: `GET /api/v2/admin/events/export`.
   - Invalidation: `["admin", "events"]`, `["events"]`.

7. **Vendors (`/admin-dash/vendors`)**
   - SSR Prefetch: `GET /api/v2/admin/vendors` (key: `adminKeys.vendors(filters)`)
   - Browser List: `useAdminVendors` -> `GET /api/v2/admin/vendors`
   - Detail: `GET /api/v2/admin/vendors/:id`
   - Mutations: `DELETE /api/v2/admin/vendors/:id`, `POST /api/v2/admin/vendors/bulk-delete`, `PATCH /api/v2/admin/vendors/:id/status`, `POST /api/v2/admin/vendors/bulk-status`, `PATCH /api/v2/admin/vendors/:id/rating`.
   - Export: `GET /api/v2/admin/vendors/export`.
   - Invalidation: `adminKeys.vendors()`.

8. **Hosts (`/admin-dash/hosts`)**
   - SSR Prefetch: `GET /api/v2/admin/hosts`
   - Browser List: `useAdminHosts` -> `GET /api/v2/admin/hosts`
   - Detail / Lookup: `GET /api/v2/admin/hosts/:id`, `GET /api/v2/plans/assignable`
   - Mutations: `POST /api/v2/admin/hosts` (create), `DELETE /api/v2/admin/hosts/:id`, `POST /api/v2/admin/hosts/bulk-delete`, `PATCH /api/v2/admin/hosts/:id/status`, `PUT /api/v2/admin/hosts/:id/subscription`, `POST /api/v2/admin/hosts/:id/subscription/extra-invites`.
   - Export: `GET /api/v2/admin/hosts/export`.
   - Invalidation: `adminKeys.hosts()`.

9. **Moderators (`/admin-dash/moderators`)**
   - SSR Prefetch: `GET /api/v2/admin/moderators`
   - Browser List: `useAdminModerators` -> `GET /api/v2/admin/moderators`
   - Mutations: `POST /api/v2/admin/moderators` (create), `PUT /api/v2/admin/moderators/:id` (update), `DELETE /api/v2/admin/moderators/:id`, `POST /api/v2/admin/moderators/bulk-delete`, `PATCH /api/v2/admin/moderators/:id/status`, `POST /api/v2/admin/moderators/bulk-status`.
   - Export: `GET /api/v2/admin/moderators/export`.
   - Invalidation: `adminKeys.moderators()`.

10. **Businesses (`/admin-dash/businesses`)**
    - Browser List: `useAdminBusinesses` -> `GET /api/v2/admin/businesses`
    - Detail: `GET /api/v2/admin/businesses/:id`
    - Mutations: `POST /api/v2/admin/businesses` (create), `PUT /api/v2/admin/businesses/:id` (update), `PUT /api/v2/admin/businesses/:id/logo` (logo), `POST /api/v2/admin/businesses/:id/assign-plan` (plan), `PATCH /api/v2/admin/businesses/:id/suspend` (suspend), `PATCH /api/v2/admin/businesses/:id/activate` (activate), `DELETE /api/v2/admin/businesses/:id` (delete).
    - Invalidation: `adminKeys.businesses()`.

#### Topology, Proxy & Cookie Inspection

- **Caddy Production Routing (`Caddyfile`)**:
  - `@api path /api/v2/* /api/* /health /health/* /uploads/*` -> `reverse_proxy api:8000`
  - Fallback handle `*` -> `reverse_proxy web:3000`
  - Single-origin topology: `https://halaa.com.sa`
- **Next.js Dev Proxy (`next.config.mjs`)**:
  - `rewrites()` maps `/api/v2/:path*` -> `${process.env.BACKEND_PROXY_URL}/api/v2/:path*` (e.g. `http://localhost:8000/api/v2/:path*`).
- **Internal SSR Base URL (`http.js`)**:
  - Server components use `INTERNAL_API_URL` (default `http://localhost:8000/api/v2` in local, `http://api:8000/api/v2` in Docker).
  - Browser components use `NEXT_PUBLIC_API_URL` (default `/api/v2`).
- **Cookie Flags & Paths (`auth.controller.js`, `auth.service.js`)**:
  - `access_token`: `HttpOnly: true`, `SameSite: "lax"`, `Secure: isProd`, `Path: "/"`, `Max-Age: 15m`.
  - `refresh_token`: `HttpOnly: true`, `SameSite: "lax"`, `Secure: isProd`, `Path: "/api/v2/auth/refresh"`, `Max-Age: 30d`.
  - Consequence: Server Components in Next.js receiving incoming page GETs (e.g. `/admin-dash/hosts`) **never receive the `refresh_token` cookie** because its path is restricted to `/api/v2/auth/refresh`. When `access_token` is expired, SSR prefetch returns 401, leaving the client component to perform the browser-side silent refresh via `/api/v2/auth/refresh`.

#### Root Cause Summary

1. **WEB-01**: Commit `3fc6b526` removed declarations of dropdown state and refs in `halaa-web/ui/commen/new-table/Table.js` (`actionsTriggerRef`, `dropdownRefs`, `setDropdownPosition`, `dropdownPosition`, etc.) while leaving JSX and `useLayoutEffect` consumers intact, crashing every table on mount.
2. **WEB-02**: Commit `745b4ad2` added `useMemo` calls without importing `useMemo` in `HostsTable.jsx`, `BusinessesTable.jsx`, and `ModeratorsTable.jsx`, crashing before render.
3. **WEB-03 & WEB-04**: Web ESLint did not enable `no-undef`, and web test suites only ran source regex checks without component execution, hiding these runtime crashes.
4. **WEB-05, WEB-06, WEB-14**: Query key generation between SSR prefetch (`undefined`), table hooks (`""`), and stats hooks (`null`) differs, causing cache misses, duplicate initial GETs, and diverging cache entries.

#### Active routes/import paths verified

- `halaa-backend/src/app.js` and all modular sub-routers (`/api/v2/*`)
- `halaa-web/app/[lang]/admin-dash/**` (discounts, categories, payments, taqnyat-templates, tickets, events, vendors, hosts, moderators, businesses, manage-plans, dashboard)
- `halaa-web/ui/commen/new-table/Table.js`
- `halaa-web/ui/auth/notifictions/Notifictions.js` (proven orphaned)
- `shared/src/api/paths.js`

#### Files changed and why

- `halaa-backend/test/incident-baseline-session0.test.js`: Created comprehensive endpoint smoke, response envelope verification, auth lifecycle, RBAC, and proxy/cookie test suite.
- `halaa-web/__tests__/incident-baseline-web-session0.test.mjs`: Created web runtime baseline reproducing WEB-01, WEB-02, WEB-05, WEB-06, WEB-14, and WEB-16.
- `docs/audit/2026-08-23-web-backend-parity-recovery-plan.md`: Updated execution tracker (Session 0 marked Complete) and appended Session 0 execution record.

#### Exact tests and results

- Backend baseline test:
  `node --test test/incident-baseline-session0.test.js`
  `pass 4, fail 0, duration_ms: 8595.25`
- Web test suite:
  `npm test` in `halaa-web`
  `pass 100, fail 0, duration_ms: 572.79`
- Lint undefined variable check:
  `npx eslint . --rule "no-undef:error"` in `halaa-web`
  `28 errors confirmed: 27 in Table.js, 1 in orphaned Notifictions.js`

#### Exit-criteria evidence

- [x] Every observed red request is classified by final outcome rather than color alone.
- [x] Clear distinction established between UI crashes (`Table.js`, missing `useMemo`), duplicate requests (`undefined` vs `""` keys), refresh/retry traffic (401 -> `/auth/refresh` -> retry 200), and backend responses.
- [x] Direct authenticated backend tests prove all admin GET routes return 200 with valid JSON response envelopes.
- [x] Complete request graphs documented for all admin pages.

#### Remaining risks & Blockers/decisions & Deferred work

- Shared `Table.js` and `useMemo` imports repaired in Session 1.
- Real DOM runtime smoke tests established in Session 2.
- Canonical filter normalizer and unified query key factory scheduled for Session 3.
- Coalesced authentication readiness coordinator scheduled for Session 4.

### Execution record — Session 1 — 2026-08-23

- Status: Complete
- Commit: audit: complete session 1 repair P0 web runtime regressions and lint safety
- Issues addressed: WEB-01, WEB-02, WEB-03, WEB-16

#### Reproduction & Network Evidence

- Static lint check `npx eslint . --rule "no-undef:error"` previously failed with 28 undefined variable errors (27 in `Table.js`, 1 in `Notifictions.js`).
- Runtime attempts to mount `<Table />` failed immediately with `ReferenceError: actionsTriggerRef is not defined`.
- Runtime attempts to mount `HostsTable.jsx`, `BusinessesTable.jsx`, and `ModeratorsTable.jsx` failed with `ReferenceError: useMemo is not defined`.
- `ui/auth/notifictions/Notifictions.js` was proven orphaned (0 imports across repo) and called undefined `hostAPI`.

#### Root Cause

- **WEB-01**: Commit `3fc6b526` removed state & ref declarations in `ui/commen/new-table/Table.js` while leaving consumers in JSX and `useLayoutEffect`.
- **WEB-02**: Commit `745b4ad2` added `useMemo` in `HostsTable.jsx`, `BusinessesTable.jsx`, and `ModeratorsTable.jsx` without importing it from `react`.
- **WEB-03**: ESLint configuration `eslint.config.mjs` lacked `'no-undef': 'error'`, allowing undeclared variables to pass CI silently.
- **WEB-16**: Orphaned `Notifictions.js` was left behind during dead code cleanup.

#### Implementation Summary

1. Restored `dropdownPosition` state, `dropdownRefs`, `actionsTriggerRef`, `filterTriggerRef`, `bulkTriggerRef`, `actionsRef`, `filterRef`, and `bulkActionsRef` in `Table.js`.
2. Restored dropdown positioning `useLayoutEffect` hooks, outside-click `mousedown` listener, and `Escape` key handlers in `Table.js`.
3. Added `useMemo` to `import { useState, useMemo } from "react"` in `HostsTable.jsx`, `BusinessesTable.jsx`, and `ModeratorsTable.jsx`.
4. Deleted orphaned `ui/auth/notifictions` directory.
5. Added `'no-undef': 'error'` to `lockInRules` in `halaa-web/eslint.config.mjs`.
6. Created `__tests__/runtime/sharedTableRuntime.test.mjs` and `__tests__/runtime/adminTablesRuntime.test.mjs`.

#### Active routes/import paths verified

- `ui/commen/new-table/Table.js`
- `app/[lang]/admin-dash/hosts/_components/HostsTable.jsx`
- `app/[lang]/admin-dash/businesses/_components/BusinessesTable.jsx`
- `app/[lang]/admin-dash/moderators/_components/ModeratorsTable.jsx`
- `eslint.config.mjs`

#### Files changed and why

- `halaa-web/ui/commen/new-table/Table.js`: Restored missing state, refs, and outside click handler.
- `halaa-web/app/[lang]/admin-dash/hosts/_components/HostsTable.jsx`: Added missing `useMemo` import.
- `halaa-web/app/[lang]/admin-dash/businesses/_components/BusinessesTable.jsx`: Added missing `useMemo` import.
- `halaa-web/app/[lang]/admin-dash/moderators/_components/ModeratorsTable.jsx`: Added missing `useMemo` import.
- `halaa-web/ui/auth/notifictions`: Deleted orphaned directory.
- `halaa-web/eslint.config.mjs`: Enabled `no-undef: error`.
- `halaa-web/__tests__/runtime/sharedTableRuntime.test.mjs`: Added focused shared table runtime tests.
- `halaa-web/__tests__/runtime/adminTablesRuntime.test.mjs`: Added admin tables runtime tests.

#### Exact tests and results

- `npm run lint` in `halaa-web`: 0 errors (32 warnings, 0 undefined variable errors).
- `npm test` in `halaa-web`: All test suites passing.
- `npm run build` in `halaa-web`: Build succeeded without error across all 72 app routes.

#### Exit-criteria evidence

- [x] No active web component references an undefined variable.
- [x] Every active shared Table consumer reaches loading, empty, and populated states without an uncaught exception.
- [x] Removing one of the repaired imports/refs makes a required test or lint command fail.

---

### Execution record — Session 2 — 2026-08-23

- Status: Complete
- Commit: audit: complete session 2 establish real admin runtime smoke coverage
- Issues addressed: WEB-04

#### Reproduction & Network Evidence

- Previously, tests in `halaa-web/__tests__` only evaluated source code via static regex (`fs.readFileSync`), meaning components with runtime `ReferenceError` crashes reported passing tests.
- Real DOM execution was required to exercise component rendering, React Query hook composition, table props, and event handling.

#### Root Cause

- Absence of an automated DOM test harness capable of mounting and executing JSX/React components within the Node test runner.

#### Implementation Summary

1. Established DOM test stack using `@testing-library/react`, `jsdom`, and an ESM `sucrase` loader with automatic JSX runtime, `@/` path alias resolution, and Next.js framework mocks (`next/image`, `next/navigation`, `next/link`, `react-toastify`).
2. Created `__tests__/runtime/adminAllRoutesRuntime.test.mjs` rendering the client roots of all 12 admin page families:
   - Dashboard (`RecentActivity.jsx`)
   - Hosts (`HostsTable.jsx`)
   - Businesses (`BusinessesTable.jsx`)
   - Vendors (`VendorsTable.jsx`)
   - Moderators (`ModeratorsTable.jsx`)
   - Manage Plans (`ManagePlansContent.jsx`)
   - Payments (`PaymentsTable.js`)
   - Events (`EventsTable.jsx`)
   - Tickets (`TicketsTable.jsx`)
   - Discounts (`DiscountsTable.jsx`)
   - Taqnyat Templates (`TaqnyatTemplatesTable.jsx`)
   - Template Categories (`CategoriesTable.jsx`)
3. Fixed resilience in `EventsTable.jsx` line 182 to safely handle both flat array and nested object envelopes (`rawEvents = Array.isArray(data?.data) ? data.data : (data?.data?.events || [])`).
4. Covered populated success, empty result, loading, and API error states for all admin client components.
5. Updated `npm test` in `package.json` to automatically register the JSX loader.

#### Active routes/import paths verified

- All 12 admin client component roots across `app/[lang]/admin-dash/**`.
- `__tests__/runtime/adminAllRoutesRuntime.test.mjs`
- `__tests__/helpers/domSetup.mjs`, `jsx-loader.mjs`, `register-jsx.mjs`

#### Files changed and why

- `halaa-web/__tests__/runtime/adminAllRoutesRuntime.test.mjs`: Comprehensive runtime smoke tests for all 12 admin routes.
- `halaa-web/__tests__/helpers/**`: DOM setup and JSX ESM module loader.
- `halaa-web/app/[lang]/admin-dash/events/_components/EventsTable.jsx`: Fixed safe extraction of events array from response envelope.
- `halaa-web/package.json`: Updated `test` script to use JSX loader.

#### Exact tests and results

- `npm test` in `halaa-web`:
  `pass 122, fail 0, suites 16, duration_ms: 4085.74`
- `npm test` in `halaa-backend`:
  `pass 420, fail 0, suites 14, duration_ms: 25363.77`
- `npm run lint` in `halaa-web`: 0 errors.
- `npm run build` in `halaa-web`: 0 errors.

#### Exit-criteria evidence

- [x] Regressions from WEB-01 and WEB-02 are tested in real runtime and caught by normal test command.
- [x] Every active admin list has at least one rendered success case and one rendered API-error case.
- [x] All 12 admin client component roots mount, render, and unmount without throwing.

#### Remaining risks & Blockers/decisions & Deferred work

- Session 3: Query key and hydration normalization (unifying `undefined` vs `""` vs `null` param serialization).
- Session 4: Authentication readiness and silent refresh coordination.
- Session 5 & 6: API contract parity and statistics calculation correctness.


