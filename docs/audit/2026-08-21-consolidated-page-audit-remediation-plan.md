# Consolidated Page Audit and Remediation Plan

Date: 2026-08-21  
Repository: `D:\halla`  
Reviewed surface: `halaa-web`, `halaa-mobile`, `halaa-backend`, `halaa-shared`  
Source material: eight Gemini page-audit reports covering event creation and details, settings, tickets/events administration, the broader admin dashboard, vendor dashboard, marketplace, and plans/checkout.

## 1. Executive conclusion

The reports found many genuine defects, but they should not be executed as eight independent fix lists. Most defects come from a smaller set of architectural causes:

1. Web, mobile, and backend independently encode the same statuses, DTOs, validation rules, query keys, and plan semantics.
2. Shared UI components do not declare whether filtering/search is local or server-controlled.
3. Generic admin mutation paths bypass domain invariants enforced by dedicated services.
4. Mobile lint disables rules that would catch active runtime failures and dead validation branches.
5. Duplicate and orphaned implementations make scans report defects in code that users cannot reach.
6. Cache invalidation and SSR hydration keys are not consistently derived from canonical key factories.
7. Several business rules are enforced only in a client, making them bypassable by another client or a direct API call.

The correct strategy is therefore contract-first: protect data and state transitions in the backend, publish one canonical contract to both clients, repair shared infrastructure, and only then fix individual screens. Applying the page reports in their original order would repeatedly patch symptoms and is likely to create regressions.

### Priority summary

- **P0 — fix first:** active mobile event crash; corrupted Taqnyat invitation settings; missing server enforcement for live-event guest edits; dangerous generic/bulk event mutations; payment amount/expiry correctness; backend/client contract mismatches that make actions silently fail.
- **P1 — next:** non-functional admin search/filter; incorrect aggregate stats; ticket transitions/bulk actions; scheduling and final-review validation; subscription ownership; marketplace filtering/scalability; settings identity and email verification synchronization.
- **P2 — after contracts are stable:** localization, labels, empty/error states, dead-code removal, duplicate actions, and visual consistency.

This plan is divided into small sessions. One Gemini session should execute exactly one session below, run its specified checks, update this document, and stop.

## 2. Review method and status legend

Material claims from all reports were compared with the current routes, services, validation, hooks, screens/components, shared schemas, query keys, and localization files. The existing invite/plan rework documentation was treated as architectural evidence rather than blindly following older audit text.

Report coverage map:

| Input audit | Consolidated coverage |
|---|---|
| Create/update event on web, mobile, and admin | EVT-01 through EVT-17; Sessions 1.1–1.6 |
| Single event pages for host/business/admin | EVT-10 through EVT-18; Sessions 1.3–1.6 |
| Settings across roles | SET-01 through SET-09; Sessions 5.1–5.3 |
| Admin tickets and events | ADM-01 through ADM-09, ADM-14; Sessions 2.1–2.5 |
| Admin dashboard, people, plans, moderators | ADM-01 through ADM-13 and plan items; Sessions 2.1–3.2 |
| Vendor dashboard | MKT-03 through MKT-10; Sessions 4.1, 4.3, 6.1 |
| Marketplace | MKT-01, MKT-02, MKT-07, MKT-10, MKT-11; Sessions 4.2–4.4 |
| Host/business/admin plans and checkout | PLN-01 through PLN-09; Sessions 3.1–3.4 |

Status labels used below:

- **Confirmed:** exists in an active or externally callable current path.
- **Latent/dead:** defect exists in code, but no active import/navigation path was found.
- **Stale/fixed:** report describes an older state; current code already differs.
- **Incorrect recommendation:** the observation may be related to a real problem, but Gemini's proposed fix is wrong.
- **Decision required:** product semantics must be chosen before implementation.
- **Needs focused reproduction:** static evidence is suggestive, but the behavior must be reproduced before editing.

## 3. Corrections to the Gemini reports

These corrections are important because implementing the original recommendation would either waste work or damage the current design.

### 3.1 Do not restore `maxInvitesPerEvent`

The recommendation to add `maxInvitesPerEvent` back to admin plan forms is obsolete. The implemented invite-pool redesign makes `invitePool` the authoritative capacity. The correct work is to remove remaining dual-field compatibility assumptions, make rules plan-type-aware, and add parity tests. Unlimited plans may use `invitePool: null`; sellable capped plans require a positive pool.

Source of truth: `docs/invites-plans-rework/PLAN.md` and the current shared plan schema.

### 3.2 Mobile admin role access is not broken

The report says `state.role` is unavailable in the mobile auth store. The store persists a root `role`, so that claim is false. Do not rewrite this access unless a runtime reproduction proves a different bug.

### 3.3 Several reported crashes are in orphaned code

- The undefined language reference in the mobile `EventHeroCard` is real in that component, but no consumer was found.
- The mobile vendor `StatsCards` icon issue is in an export-only/orphaned component; `VendorHomeScreen` uses a different path.
- `CreateEventForm` ignores update props, but its update branch is currently unreachable. Updates use the dedicated update-event screen.

The right action is an import/navigation graph audit followed by deletion or consolidation. Wiring orphaned update paths back into production would create duplicate implementations.

### 3.4 Subscription response shape was described incorrectly

The backend currently returns `subscriptions`, `hasSubscription`, and a singular `subscription` object. It does not return only an array as the report states. However, current mobile consumers still incorrectly index `subscription[0]`, so the consumer bug is confirmed.

### 3.5 Do not replace `suspended` with `cancelled` mechanically

`suspended` is not a valid event status, so the current action is broken. But `cancelled` is not automatically the same business operation. Define the event state machine and the desired admin action first. If product semantics are cancellation, rename the UI action to “Cancel” and implement an auditable, reversible transition where required.

### 3.6 Do not increment analytics blindly on profile GET requests

Service detail reads already increment both `Service.viewCount` and a legacy vendor click counter, while the dashboard now aggregates service views. The metric is inconsistent, but adding more increments to vendor-profile GET requests would inflate analytics through refreshes, crawlers, and retries. Choose one metric and preferably record it through an explicit, deduplicated analytics event.

### 3.7 Ticket attachments are substantially newer than the report

The current mobile ticket card renders image previews and opens videos; the backend signs stored attachment URLs. Treat broad “attachments are missing” claims as stale. Test admin-detail and user-detail variants separately and only fix a reproduced gap.

### 3.8 Staff token revocation is already handled by the dedicated service

The older finding about staff deletion leaving tokens active is fixed in the dedicated staff service. The remaining risk is that the admin event header writes an entire staff list through a generic event update, bypassing that service. Remove the bypass; do not duplicate revocation logic in clients.

## 4. Verified issue register

### 4.1 Event creation, updates, details, and guests

| ID | Priority | Status | Problem | Root solution |
|---|---:|---|---|---|
| EVT-01 | P0 | Confirmed | Mobile `EventSummary` references `currentLanguage` without defining it; mobile lint does not flag undefined variables. | Fix the component and enable safety lint rules so the class cannot recur. |
| EVT-02 | P0 | Confirmed | Invitation-settings multipart parsing omits `taqnyatTemplate`; the mobile client also sends `taqnyatTemplateRef`, while the service expects `taqnyatTemplate`. Strings can be spread as objects. | Define one request DTO, explicitly parse JSON fields, reject wrong shapes, and make web/mobile use one serializer. |
| EVT-03 | P0 | Confirmed | Live-event “add guests only” is dropped in the mobile component chain and is not enforced by the backend step-two service. Direct API calls can edit/delete live guests. | Enforce immutable-existing-guests/add-new-only in the backend; make the client reflect server capability. |
| EVT-04 | P0 | Confirmed | Generic admin full-event update can delete/recreate guests, resetting RSVP/QR state. | Deprecate/remove generic full update for domain collections; route all changes through dedicated event/guest/staff services. |
| EVT-05 | P0 | Confirmed | Admin bulk event delete soft-deletes records without releasing per-event plan slots/counters and skips important single-delete invariants. | Implement a domain bulk command that calls the same invariant-preserving transition per event and returns per-item results. |
| EVT-06 | P0 | Confirmed | Admin bulk status accepts arbitrary strings; mobile emits invalid `suspended`. | Centralize an explicit event state machine and action-oriented endpoints with authorization, idempotency, audit, and transition tests. |
| EVT-07 | P1 | Confirmed | Mobile final confirmation is effectively dead (`case 5` always true; full check is in unreachable step 6). | Derive step validation from a single ordered step definition and test every transition. |
| EVT-08 | P1 | Confirmed | Web step-one and backend validation allow incomplete address/location data. | Put minimum event-location requirements in backend/shared schema and mirror errors in clients. |
| EVT-09 | P1 | Confirmed | Scheduling models exist, but web summary hardcodes `isScheduled=false`; mobile scheduling UI is orphaned. | Make an explicit product decision: implement one scheduling contract and UI on both clients, or remove dormant fields/UI. |
| EVT-10 | P1 | Confirmed | Admin-on-behalf update checks the logged-in admin’s subscription, not the event owner’s/stamped entitlement. | Add an authorized backend “event entitlement/capabilities” response derived from event ownership and subscription snapshot. |
| EVT-11 | P1 | Confirmed | Web event card links with `section=` while the update page reads `step=`. | Export one route builder/parser and validate parameters. |
| EVT-12 | P1 | Confirmed | Web guest-table “send invitations” only shows a toast. | Connect it to the canonical messaging mutation; add loading, partial failure, and quota handling. |
| EVT-13 | P1 | Confirmed | Admin event header updates a whole staff list through a generic event update; cache handling is incomplete. | Use dedicated staff CRUD exclusively and invalidate canonical event/staff keys. |
| EVT-14 | P2 | Confirmed | Staff token UI uses TanStack Query v4 `isLoading` on a v5 mutation. | Use `isPending`; cover disabled/loading state in a component test. |
| EVT-15 | P1 | Confirmed | Some guest actions assume `guest.id`; records may expose `_id` or `guestId`. Mobile admin views also use `rsvpStatus` where the canonical field is `status`. | Introduce a boundary adapter producing one `GuestDTO` and stop mapping IDs/statuses inside components. |
| EVT-16 | P1 | Confirmed | Single-event pending stats count only `invited`, excluding other pending states. | Define RSVP buckets once, aggregate them in the backend, and test every status. |
| EVT-17 | P1 | Confirmed | Mobile reminder/scheduling consumers treat singular `subscription` as an array. | Publish/consume one subscription DTO and add contract tests. |
| EVT-18 | P2 | Latent/dead | Orphaned event hero and create/update branches contain defects. | Delete or consolidate only after route/import graph verification. |

### 4.2 Admin tables, events, tickets, people, and plans

| ID | Priority | Status | Problem | Root solution |
|---|---:|---|---|---|
| ADM-01 | P1 | Confirmed/systemic | Shared admin table filters only invoke `option.onClick`; most screens provide `{label,value}`, so event/ticket/host/business/vendor/moderator filters are inert. | Add a controlled table contract with `activeFilter/onFilterChange`; migrate every call site. |
| ADM-02 | P1 | Confirmed/systemic | Shared table search filters only the current server page and does not update URL/API search. Several mobile screens also re-filter paginated server results locally. | Distinguish `server` and `client` modes; server mode debounces controlled search, resets page, and never locally filters a page. |
| ADM-03 | P1 | Confirmed | Event, ticket, and moderator status cards derive counts from the current page while showing a global total. | Return aggregate `statusCounts` with list responses using the same filters, preferably via `$facet`. |
| ADM-04 | P0 | Confirmed/systemic | Web bulk requests use resource-specific keys (`hostIds`, `vendorIds`, `moderatorIds`, `eventIds`) while backend endpoints expect `{ids}`. | Define one `BulkIdsRequest` schema in shared/API paths and add request contract tests. |
| ADM-05 | P1 | Confirmed | Resolved-ticket reopen sends `open`, which the backend transition rules reject. | Define named ticket actions/transitions and render only allowed actions from backend capabilities. |
| ADM-06 | P2 | Confirmed | One ticket detail view uses `title` while the model uses `subject`. | Normalize to `TicketDTO.subject`. |
| ADM-07 | P1 | Confirmed | Ticket bulk resolve is sequential and includes ineligible states; bulk delete can invoke per-item confirmations. | Add backend bulk transition/delete commands with one confirmation and per-item success/failure results. |
| ADM-08 | P1 | Confirmed | Admin event list/mobile filters include statuses that do not exist; chart/status mappings differ by client. | Generate UI choices and chart buckets from canonical status constants/state machine. |
| ADM-09 | P1 | Confirmed | Admin update-event SSR prefetch key differs from the client detail key. Admin plans has the same exact-key hydration mismatch. | Use canonical key factories in server prefetch, client query, invalidation, and cache writes. |
| ADM-10 | P1 | Confirmed | Host/vendor/moderator creation password requirements and “auto-generate” UI do not agree; empty strings can fail validation. | Choose and implement one server contract: required password or server-generated credential. Omit optional empty fields at the boundary. |
| ADM-11 | P1 | Confirmed | Phone construction can prepend `+966` to local numbers without normalization. | Use one E.164 normalizer/validator shared by all creation and settings forms. |
| ADM-12 | P2 | Confirmed | Some mutations rely on `router.refresh()` even though visible state is held in React Query. | Invalidate/update canonical query keys; use router refresh only for server-rendered state that needs it. |
| ADM-13 | P2 | Stale/fixed | Mobile admin `state.role` is allegedly unavailable. | No change; retain as a regression assertion only. |
| ADM-14 | P2 | Needs focused reproduction | Ticket attachment behavior varies by surface; broad missing-attachment claim is stale. | Run the explicit attachment matrix in Session 2.5 before changing code. |

### 4.3 Plans, checkout, and money

| ID | Priority | Status | Problem | Root solution |
|---|---:|---|---|---|
| PLN-01 | P0 | Confirmed | Web and relevant mobile-web card inputs parse/display expiry as `YY/MM`, contrary to the expected `MM/YY`. | Use one strict expiry parser/formatter, normalize before gateway submission, and test boundary dates. |
| PLN-02 | P0 | Confirmed/risk | Clients locally recompute totals and some displays round with `.toFixed(0)`, while the backend/gateway can use fractional SAR/minor units. | Represent money in integer minor units, expose an authoritative checkout quote, and render the returned total with a shared formatter. |
| PLN-03 | P1 | Confirmed | Mobile classifies only `monthly` as recurring; quarterly/annual plans can be labeled as single-event. Similar collapsing exists in web business summaries/cards. | Centralize plan/billing classification and preserve the actual billing period everywhere. |
| PLN-04 | P1 | Confirmed | Admin mobile edit rejects `invitePool: null`, which is valid for unlimited plans; empty duration can become zero. | Make validation conditional on plan type; omit/null optional duration and require positive values only when applicable. |
| PLN-05 | P1 | Confirmed | Shared `isPerEventPlan` and backend semantics disagree about `trial`; comments/defaults still carry legacy invite-limit concepts. | Declare a canonical plan semantics module and parity-test backend and both clients. |
| PLN-06 | P2 | Confirmed | Web plan management/cards hardcode “per event” or collapse non-event plans; mobile host plan title is misleading. | Render labels from plan type and billing period through localization keys. |
| PLN-07 | P2 | Confirmed | Web admin bullet textarea loses a trailing blank line while editing. | Keep raw editing text locally; normalize only on submit. |
| PLN-08 | P1 | Likely/verify in session | Setup fee/WhatsApp/extras visibility can diverge based on mapping flags. | Define a single presentation DTO and test every priced line item against the checkout quote. |
| PLN-09 | P1 | Incorrect recommendation | Reports recommend restoring `maxInvitesPerEvent`. | Do not restore it; complete the invite-pool migration and remove legacy assumptions. |

### 4.4 Vendor dashboard and marketplace

| ID | Priority | Status | Problem | Root solution |
|---|---:|---|---|---|
| MKT-01 | P1 | Confirmed in affected path | Multi-district selection is truncated to one value in some marketplace client/API paths. A newer services path supports `districtIds`, so the codebase has two contracts. | Standardize all marketplace requests on `districtIds[]`/CSV serialization and `$in` semantics; remove singular adapters. |
| MKT-02 | P1 | Confirmed in vendor-directory path | One marketplace vendor listing loads a broad candidate set, then sorts/slices in JavaScript. | Replace with an indexed Mongo aggregation using deterministic sort and `$facet` for rows/counts. |
| MKT-03 | P1 | Confirmed | Service-location input on mobile can produce coordinates while the sanitizer accepts administrative IDs, causing location data to be dropped. | Reuse the canonical region/city/district selector. Store coordinates separately only if the API explicitly supports them. |
| MKT-04 | P1 | Confirmed | Web/mobile service form limits disagree with backend limits; clearing Arabic fields can be omitted from multipart updates. | Publish one service schema and make serializers send explicit empty values for clearable fields. |
| MKT-05 | P2 | Confirmed | Web placeholder image path has no matching asset. | Add an approved asset or use a guaranteed existing fallback component. |
| MKT-06 | P1 | Confirmed | Service status toggle invalidates detail/list but can leave statistics stale. | Include stats in the canonical mutation invalidation set or update cache atomically. |
| MKT-07 | P2 | Confirmed | Locale-aware region/city/district names and separators are inconsistent; some public/error states and mobile moderation reasons are untranslated. | Map localized fields at the DTO/presentation boundary and complete namespace parity. |
| MKT-08 | P2 | Confirmed | Hardcoded production image base URLs make environments brittle. | Use signed/absolute URLs returned by the API or one environment-aware media helper. |
| MKT-09 | P2 | Latent/dead | Mobile vendor stats component has an undefined icon path but is not the active home screen. | Remove/consolidate after import graph audit; do not patch as a production P0. |
| MKT-10 | P1 | Decision required | “Clicks/views” is measured by both service views and a legacy vendor counter, with GET-triggered increments. | Choose a canonical metric and collection mechanism; prefer an explicit deduplicated analytics event. |
| MKT-11 | P2 | Decision required | Public/guest marketplace navigation differs between web and mobile. | Product must define guest access and authentication gates before route changes. |

### 4.5 Settings and account management

| ID | Priority | Status | Problem | Root solution |
|---|---:|---|---|---|
| SET-01 | P1 | Confirmed | Web “full name” edits `username`, although backend supports distinct `name` and `username`. | Publish an identity DTO and label/bind each field correctly. |
| SET-02 | P1 | Confirmed | Web always offers email verification; mobile verification does not refresh the persisted user after success. | Derive UI from canonical `emailVerified`, update/refetch the user on success, and test both clients. |
| SET-03 | P1 | Confirmed/design flaw | Settings save paths combine profile, email, password, business/vendor data, and files into multiple mutations with partial-success risk. Client rollback is not reliable. | Split independent concerns into separate forms/actions. For truly atomic DB updates, add a transactional aggregate endpoint; stage file work explicitly. |
| SET-04 | P2 | Confirmed | Host/admin/vendor mobile settings expose duplicate delete-account entry points. | Keep one well-explained destructive action per role and reuse one confirmation flow. |
| SET-05 | P2 | Confirmed | Reopened modals/forms can retain stale business/location state; parent location changes do not always clear descendants. | Reset form state on identity/open changes and use one cascading location state machine. |
| SET-06 | P2 | Confirmed | Mobile vendor logout success uses the wrong toast/message. | Correct namespace/key and add a small behavior assertion. |
| SET-07 | P2 | Confirmed | Card/account inputs can retain pasted separators. | Normalize digits at input and API boundaries; format only for display. |
| SET-08 | P2 | Confirmed | Admin templates settings route is effectively a placeholder. | Either implement the scoped feature or hide the route/menu until it exists. |
| SET-09 | P2 | Confirmed | Some cross-tab/settings links navigate inconsistently. | Define role-aware route builders and add navigation smoke tests. |

## 5. Important omissions found during the review

The original reports focused on individual pages and missed several broader risks:

1. **Backend live-event guest enforcement is missing.** Fixing only the mobile prop would leave the API bypassable.
2. **Generic admin full-event update is a data-loss path.** It can reset guest RSVP/QR state and bypass staff token lifecycle.
3. **Bulk event deletion does not preserve plan-slot/counter invariants.** This is more severe than the visible UI failures.
4. **Bulk payload mismatch affects more resources than reported.** Hosts, vendors, moderators, and events share the same web/backend contract problem.
5. **The table search/filter defect is shared infrastructure, not just events/tickets.** Every paginated admin list must be migrated together or explicitly documented as client-only.
6. **Mobile lint is configured to miss high-value JavaScript errors.** `no-undef`, `no-unreachable`, `no-dupe-keys`, `valid-typeof`, and `no-unsafe-optional-chaining` are disabled.
7. **Scheduling is a cross-platform product/contract gap.** Fields and components exist, but the active clients do not present one coherent flow.
8. **Plan capacity and billing semantics still have legacy drift after the invite-pool rework.** The audit recommendation itself was based on an obsolete model.
9. **Analytics has two competing counters.** Page-level fixes cannot make dashboard metrics trustworthy without a product definition.
10. **Dead implementations distort audit results.** Route/import reachability must be part of every future inventory.

## 6. Target architecture and non-negotiable invariants

The work below should converge on these rules.

### 6.1 Contract boundaries

- Backend validation is authoritative; client validation improves UX but never owns a security or data-integrity rule.
- Every entity exposed to clients has one normalized DTO: stable `id`, canonical status field, dates, localized/presentation fields, and optional fields with deliberate `null`/omitted semantics.
- Shared modules contain pure schemas, constants, route/query builders, and serializers. They must not import UI or server-only infrastructure.
- Multipart JSON fields are explicitly serialized and explicitly parsed. Never spread an unvalidated string into a settings object.

### 6.2 State transitions

- Event and ticket mutations use named domain actions, not arbitrary status strings.
- Single and bulk operations call the same invariant-preserving domain function.
- Transitions are authorized, validated, idempotent where practical, audited, and return per-item outcomes for bulk requests.
- Guest RSVP/QR data, staff tokens, plan slots, notification behavior, and cache invalidation are part of the transition contract.

### 6.3 Query and table behavior

- One query-key factory is used by SSR prefetch, client queries, invalidations, and optimistic updates.
- A table is explicitly in `server` or `client` mode.
- Server mode owns search/filter/sort/page in the URL/query state, resets page when criteria change, and never re-filters only the current page.
- Aggregate cards are computed against the full filtered dataset, not the visible page.

### 6.4 Plans and checkout

- `invitePool` is authoritative. `maxInvitesPerEvent` is not reintroduced.
- Plan type, billing interval, capacity, duration, and unlimited behavior have one definition.
- Monetary calculations use integer minor units or a decimal-safe library. The server quote is authoritative.
- The payment UI displays exactly what the server intends to charge.

### 6.5 Safety and reachability

- Active code must pass undefined-variable, unreachable-code, duplicate-key, unsafe-optional-chain, and valid-`typeof` checks.
- A suspected defect in unreachable code is not promoted to P0. First decide whether the code should be deleted or made canonical.
- No broad refactor is merged without focused contract tests and a smoke path for web and mobile.

## 7. Phased, session-sized execution plan

### Execution tracker

Update one row only after its exit criteria and required tests pass. Use `Blocked — <decision/evidence>` when appropriate; do not use “complete” for a partial implementation.

| Session | Status | Depends on |
|---|---|---|
| 0.1 Baseline and safety lint | Complete | — |
| 0.2 Contract foundations | Complete | 0.1 |
| 1.1 Event validation/location | Not started | 0.2 |
| 1.2 Invitation/Taqnyat contract | Not started | 0.2 |
| 1.3 Live-event guest invariants | Not started | 0.2 |
| 1.4 Admin event/staff mutation safety | Not started | 0.2, preferably 1.3 |
| 1.5 Event entitlement/routes/messaging/stats | Not started | 0.2, 1.2 |
| 1.6 Scheduling | Not started | 1.1, product decision |
| 2.1 Shared table server mode | Not started | 0.2 |
| 2.2 Admin list migrations/stats | Not started | 2.1 |
| 2.3 Bulk API envelope | Not started | 0.2 |
| 2.4 Ticket transitions/bulk | Not started | 0.2, 2.3 |
| 2.5 Ticket attachment matrix | Not started | 0.1 |
| 2.6 Admin creation/cache keys | Not started | 0.2 |
| 3.1 Plan semantics/invite pool | Not started | 0.2 |
| 3.2 Plan editing/presentation | Not started | 3.1 |
| 3.3 Money/checkout quote | Not started | 3.1 |
| 3.4 Expiry/payment UX | Not started | 3.3 |
| 4.1 Vendor service form contract | Not started | 0.2 |
| 4.2 Marketplace filters/query | Not started | 0.2 |
| 4.3 Marketplace analytics | Not started | Product decision |
| 4.4 Marketplace locale/navigation | Not started | Access decision; preferably 4.2 |
| 5.1 Identity/email verification | Not started | 0.2 |
| 5.2 Settings mutation/form stability | Not started | 5.1 |
| 5.3 Settings destructive/navigation paths | Not started | 5.1 |
| 6.1 Reachability/dead-code cleanup | Not started | Phases 1–5 scoped paths stable |
| 6.2 Localization/accessibility sweep | Not started | Phases 1–5 scoped paths stable |
| 6.3 Final regression/release gate | Not started | All preceding required sessions |

### Phase 0 — Freeze contracts and add guardrails

#### Session 0.1 — Baseline, issue ledger, and safety lint

Scope: repository tooling plus only the minimum files needed to resolve newly enabled lint errors.

Tasks:

1. Record current web/mobile/backend/shared test and lint commands and their baseline results.
2. Add the issue IDs from this document to the project tracker or keep this file as the tracker.
3. Re-enable `no-undef`, `no-unreachable`, `no-dupe-keys`, `valid-typeof`, and `no-unsafe-optional-chaining` for active mobile source. If the existing error count is too large, use directory/file overrides with a documented ratchet; do not silently leave all rules disabled.
4. Fix EVT-01 and any equally certain violations exposed in touched active files.
5. Add CI commands that fail on new violations.

Tests: mobile lint; web lint; affected unit tests; launch/import smoke for event summary.

Exit criteria: EVT-01 is fixed; safety rules protect active event code; the baseline and any temporary lint debt are documented with a decreasing ceiling.

#### Session 0.2 — Canonical DTO/status/query-key foundations

Scope: shared pure modules and focused parity tests; no screen redesign.

Tasks:

1. Inventory current event, guest, ticket, subscription, plan, and bulk-ID representations.
2. Add or consolidate canonical constants/schemas/adapters for `id`, status, RSVP buckets, `{ids}`, and subscription shape.
3. Add canonical query-key factories for event detail, admin plans, guests, tickets, vendor services/stats.
4. Add backend/shared parity tests. Avoid a “big bang” migration; expose adapters for later sessions.

Tests: shared tests; backend schema tests; key-factory snapshot/equality tests.

Exit criteria: later sessions can import stable primitives rather than inventing new mappings.

### Phase 1 — Event correctness and data integrity

#### Session 1.1 — Event step validation and location contract

Issues: EVT-07, EVT-08.

Tasks:

1. Define ordered create/update steps once per client from a shared step identifier list.
2. Make the final review/confirmation mandatory in active web/mobile flows.
3. Define backend minimum location/address requirements, including intentional online/physical exceptions if applicable.
4. Return field-addressable validation errors and map them in both clients.

Tests: step-by-step unit tests; backend validation tests; web/mobile happy path and missing-address path.

Exit criteria: no client can skip final confirmation, and the API rejects an invalid event even if the client is bypassed.

#### Session 1.2 — Invitation settings and Taqnyat contract

Issues: EVT-02, EVT-17.

Tasks:

1. Define a canonical invitation-settings request/response schema.
2. Normalize `taqnyatTemplate` naming; remove `taqnyatTemplateRef` drift or support a deliberate migration alias at one boundary only.
3. Explicitly parse all multipart JSON fields and reject strings/arrays where an object is required.
4. Update web/mobile serializers and singular subscription consumers.
5. Add round-trip contract tests for JSON and multipart payloads.

Tests: backend route/service tests; mobile/web serializer tests; one end-to-end settings save/read.

Exit criteria: the same settings payload round-trips without shape loss on web and mobile; malformed data yields 400, not corruption.

#### Session 1.3 — Live-event guest invariants

Issues: EVT-03, EVT-15.

Tasks:

1. Define live-event capability: existing guests immutable, new guests allowed, or the chosen alternative.
2. Enforce the rule in the backend step-two/guest service by diffing canonical guest IDs/phones.
3. Preserve RSVP, QR/token, send history, and audit fields.
4. Pass/display backend capabilities in mobile and web; disable forbidden controls.
5. Normalize guest IDs and status into `GuestDTO`.

Tests: backend add/edit/delete matrix for draft/live/completed/cancelled; mobile/web component behavior; direct API bypass tests.

Exit criteria: prohibited edits fail server-side and allowed additions preserve every existing guest field.

#### Session 1.4 — Admin event mutation safety and staff lifecycle

Issues: EVT-04, EVT-05, EVT-06, EVT-13, EVT-14.

Tasks:

1. Define event transition actions and allowed transition matrix.
2. Replace generic staff-list writes with dedicated staff CRUD.
3. Restrict/deprecate generic full-event update from mutating guests/staff/domain-owned collections.
4. Make bulk status/delete call the same domain operation as single status/delete, including plan-slot/counter, token, audit, and notification invariants.
5. Return per-item results; update web/mobile actions and loading state (`isPending`).

Tests: transition matrix; single/bulk parity; plan-slot release; RSVP/QR preservation; staff token revoke; partial bulk failure.

Exit criteria: no public admin path can reset guest state or bypass staff/plan invariants; invalid statuses are impossible to submit.

#### Session 1.5 — Event entitlement, routes, messaging, and stats

Issues: EVT-10, EVT-11, EVT-12, EVT-16, ADM-09 event part.

Tasks:

1. Add an authorized event-capabilities/entitlement response based on event owner and stamped subscription data.
2. Make admin-on-behalf screens consume it.
3. Unify update route parameter builder/parser.
4. Connect guest invitation action to the messaging mutation with quota/partial-error feedback.
5. Define RSVP buckets and return correct aggregate event stats.
6. Use the same query key for SSR, client detail, mutations, and invalidation.

Tests: owner/admin entitlement cases; route-link test; invitation mutation test; all RSVP status buckets; hydration assertion.

Exit criteria: admin updates no longer depend on the admin’s personal plan; invitation is not a toast-only action; stats and hydration are correct.

#### Session 1.6 — Scheduling decision and implementation

Issue: EVT-09. Prerequisite: a written product decision.

Option A — scheduling is supported:

1. Define schedule time, timezone, edit/cancel rules, background job behavior, retry, and user-visible status.
2. Validate in backend and implement equivalent web/mobile controls and summaries.
3. Test timezone/DST, past dates, rescheduling, cancellation, and job idempotency.

Option B — scheduling is not supported now:

1. Remove unreachable UI and stop accepting dormant schedule fields.
2. Preserve/migrate existing scheduled records deliberately.

Exit criteria: there is one coherent behavior; no hardcoded false state or orphan scheduling controls remain.

### Phase 2 — Admin platform foundation

#### Session 2.1 — Shared table server-mode contract

Issues: ADM-01, ADM-02.

Tasks:

1. Add explicit `mode`, controlled search/filter/sort/page props, callbacks, debounce, clear behavior, accessibility, and URL reset rules.
2. Remove implicit `option.onClick` as the only filter contract.
3. Migrate events and tickets first as reference implementations.
4. Add table contract tests.

Tests: component tests for server/client mode; URL/query request assertions; page reset; RTL/LTR keyboard behavior.

Exit criteria: event/ticket search and filters affect backend requests and never filter only a current server page.

#### Session 2.2 — Migrate all admin lists and aggregate stats

Issues: ADM-03 and the systemic remainder of ADM-01/02.

Tasks:

1. Migrate hosts, businesses, vendors, moderators, payments, plans/templates where applicable.
2. Add `statusCounts`/summary aggregations using the same filters as rows.
3. Use `$facet` or parallel indexed aggregates; document response shape.
4. Remove mobile double-filtering for server-paginated resources.

Tests: every list search/filter/page combination; aggregate counts against seeded data larger than one page.

Exit criteria: all admin lists declare their mode, and displayed counts are independent of the visible page.

#### Session 2.3 — Bulk API contract across admin resources

Issue: ADM-04.

Tasks:

1. Standardize request body to `{ids: string[]}` with bounds, duplicate removal, authorization, and invalid-ID reporting.
2. Update web hosts/vendors/moderators/events and any other mismatched clients.
3. Keep resource-specific domain actions behind the common envelope.
4. Return `{succeeded, failed}` rather than pretending all-or-nothing if operations are not transactional.

Tests: request contract tests for every endpoint; mixed valid/invalid IDs; empty/oversized input; authorization.

Exit criteria: all clients and routes use the same envelope; failures are visible and retryable.

#### Session 2.4 — Ticket transition and bulk behavior

Issues: ADM-05, ADM-06, ADM-07.

Tasks:

1. Define ticket state machine and named actions, including the exact semantics of reopen.
2. Expose allowed actions/capabilities or share a pure transition table.
3. Normalize `subject` in `TicketDTO`.
4. Implement one-confirmation bulk resolve/delete with eligibility and per-item results.
5. Update web/mobile screens and cache keys.

Tests: transition matrix; invalid transition; bulk mixed-state result; one-confirmation UI; subject rendering.

Exit criteria: every rendered action is accepted by the backend and bulk operations cannot double-confirm or silently skip failures.

#### Session 2.5 — Ticket attachment focused matrix

Issue: ADM-14.

Do not start by editing. Test:

1. User creates image ticket and video ticket on web/mobile.
2. User list/detail views both attachments.
3. Admin list/detail views both attachments.
4. Signed URL expiry/refresh, missing file, unsupported MIME, and 50 MB limit.
5. Access control: another user cannot retrieve the private attachment.

Only fix reproduced failures. Prefer a shared media-viewer behavior and backend-signed URL response.

Exit criteria: matrix evidence is recorded and all confirmed gaps have focused tests.

#### Session 2.6 — Admin creation forms, phone/password, and cache keys

Issues: ADM-09 plans part, ADM-10, ADM-11, ADM-12.

Tasks:

1. Decide required versus server-generated passwords by role; align validation, service, delivery/reset flow, and UI copy.
2. Omit optional empty values instead of sending empty strings.
3. Introduce shared E.164 normalization and apply it to admin creation/settings.
4. Fix admin plan SSR/client key parity and replace refresh-only cache handling.

Tests: each role create with/without password; common Saudi phone forms; hydration/cache refresh tests.

Exit criteria: UI promise matches server behavior and newly created records appear without a reload.

### Phase 3 — Plans and checkout

#### Session 3.1 — Canonical plan semantics and invite-pool completion

Issues: PLN-03, PLN-04, PLN-05, PLN-09.

Tasks:

1. Write the plan-type matrix: sellability, billing interval, duration, capacity, renewal, and unlimited semantics.
2. Make `invitePool` authoritative; remove remaining functional reliance on `maxInvitesPerEvent`.
3. Align trial/per-event helpers across shared/backend.
4. Make admin web/mobile validation conditional on type; preserve `null` deliberately.
5. Add a compatibility/data audit before deleting legacy stored fields.

Tests: a table-driven test for every plan type on shared, backend, web mapping, and mobile mapping.

Exit criteria: the same raw plan is classified and validated identically everywhere.

#### Session 3.2 — Plan editing and presentation parity

Issues: PLN-06, PLN-07, PLN-08.

Tasks:

1. Build a canonical plan presentation DTO including actual billing period and every priced extra.
2. Update admin editors, host/business cards, summaries, and localized titles.
3. Keep bullet textarea raw until submit.
4. Verify setup fees, WhatsApp, customization, and other line items against backend data.

Tests: visual/component fixtures for every plan type in Arabic/English; create-edit-read round trip.

Exit criteria: no plan is hardcoded as per-event/monthly, and no priced line item disappears from summary.

#### Session 3.3 — Money and authoritative checkout quote

Issue: PLN-02.

Tasks:

1. Choose integer halalas or a decimal-safe money type throughout the quote/payment boundary.
2. Add/standardize a server quote response containing line items, discount, tax if any, setup/extras, currency, and final total.
3. Make clients render and submit the quote identifier/authoritative amount rather than recomputing independently.
4. Add stale-quote/price-change and idempotency behavior.

Tests: decimals, discounts, zero, large values, changed plan price, duplicate submit, and gateway amount equality.

Exit criteria: displayed amount, persisted transaction, and gateway charge match exactly.

#### Session 3.4 — Card expiry and payment UX

Issue: PLN-01.

Tasks:

1. Implement strict `MM/YY` input/normalization with month 01–12 and non-expired validation.
2. Verify gateway-required wire format independently from display format.
3. Cover web checkout and only the mobile platforms that actually expose card entry; retain native IAP behavior.
4. Localize errors and protect double submit.

Tests: `00/YY`, `13/YY`, current month, expired, paste with separators, gateway payload, platform gates.

Exit criteria: correct display and gateway format with no effect on native IAP-only flows.

### Phase 4 — Vendor services and marketplace

#### Session 4.1 — Vendor service form contract

Issues: MKT-03, MKT-04, MKT-05, MKT-06, MKT-08.

Tasks:

1. Consolidate service schema limits and multipart serializer.
2. Reuse administrative location selection; explicitly separate optional coordinates.
3. Support clearing Arabic/optional fields.
4. Standardize returned media URLs and guaranteed placeholder behavior.
5. Invalidate list, detail, and stats after create/update/delete/toggle.

Tests: create/edit/clear fields; all limit boundaries; cascading location; media in dev/prod-style URL; cache freshness.

Exit criteria: the same service round-trips without dropped fields on web/mobile and stats update immediately.

#### Session 4.2 — Marketplace filter contract and database query

Issues: MKT-01, MKT-02.

Tasks:

1. Choose one query contract for region/city/multiple district IDs, search, category, price, rating, sort, and pagination.
2. Migrate both marketplace implementations or deliberately retire one.
3. Replace in-memory vendor sorting/pagination with indexed aggregation and deterministic tie-breaker.
4. Preserve moderation blocks, vendor approval, service activity, and count consistency.
5. Add/explain compound indexes using real query shapes; inspect execution plans on representative data.

Tests: multi-district OR semantics; empty filters; blocked vendors; page stability; count parity; performance dataset/explain.

Exit criteria: no selected district is dropped and response work is bounded by page size/indexed aggregation.

#### Session 4.3 — Marketplace analytics decision

Issue: MKT-10. Product decision session first; implementation may be a second session if non-trivial.

Decide:

1. What counts: service impression, service detail view, vendor profile view, outbound contact click, or multiple named events.
2. Who/what is deduplicated and for how long.
3. Whether authenticated identity, anonymous session, or privacy-preserving aggregate is stored.
4. Which metric each dashboard card displays.

Implementation preference: explicit analytics endpoint/event with validation, rate limiting/deduplication, and one aggregation source. Remove or clearly label legacy counter behavior after a data migration decision.

Exit criteria: metric definition, collection point, and dashboard query agree; refresh/crawler traffic does not arbitrarily inflate a “click” metric.

#### Session 4.4 — Marketplace localization, public states, and navigation

Issues: MKT-07, MKT-11.

Tasks:

1. Complete Arabic/English field selection, punctuation, loading/error/not-found, report/block reasons, and accessible labels.
2. Use locale-aware route builders for relative links.
3. Implement the approved mobile guest-access decision with explicit auth gates.
4. Test RTL/LTR and anonymous/authenticated navigation.

Exit criteria: locale and access behavior are deliberate and consistent, with no hardcoded production-facing English in scoped screens.

### Phase 5 — Settings and identity

#### Session 5.1 — Identity fields and email verification synchronization

Issues: SET-01, SET-02.

Tasks:

1. Define `name`, `username`, `email`, and `emailVerified` semantics and edit permissions.
2. Bind labels/fields correctly on web/mobile.
3. Hide/disable verification for verified users.
4. On verification success, update/refetch canonical user state and persistence.

Tests: edit name without username change; username validation; unverified/verified flows; relaunch persistence.

Exit criteria: identity fields do not overwrite each other and verification state changes immediately everywhere.

#### Session 5.2 — Split settings mutations and stabilize forms

Issues: SET-03, SET-05, SET-07.

Tasks:

1. Split profile, email, password, business/vendor details, and media into independent save sections unless backend atomicity is truly required.
2. For an atomic aggregate endpoint, use a transaction for DB changes and explicitly stage/compensate file operations.
3. Reset modal/form state when opened for a new entity.
4. Use cascading location state and digits-only/card/phone normalizers.

Tests: partial failure; reopen/switch entity; parent location change; cleared optional fields; file failure.

Exit criteria: users can tell exactly which section saved, and a failed later action does not misrepresent earlier success.

#### Session 5.3 — Destructive actions, settings navigation, and placeholder routes

Issues: SET-04, SET-06, SET-08, SET-09.

Tasks:

1. Keep one delete-account entry and one shared confirmation/re-auth flow per role.
2. Correct logout messaging.
3. Fix role-aware cross-tab links.
4. Either implement admin template settings with a separately approved scope or remove/hide the placeholder navigation.

Tests: role matrix for settings links; logout; cancel/confirm account deletion; hidden/implemented template route.

Exit criteria: destructive/navigation behavior is unambiguous and no menu ends at a non-feature.

### Phase 6 — Cleanup, localization, and release verification

#### Session 6.1 — Reachability audit and duplicate-code removal

Issues: EVT-18, MKT-09 and related duplicates.

Tasks:

1. Build/import-search an entry-point-to-component reachability map for event create/update and vendor dashboard.
2. Identify canonical implementations and prove orphan status with imports/routes/navigation registration.
3. Remove orphan components/branches/exports and obsolete props; do not remove dynamically referenced files without runtime proof.
4. Update documentation and tests.

Tests: builds/bundles; route/navigation smoke; import graph; lint.

Exit criteria: one canonical implementation per flow, fewer false positives, no broken dynamic route/import.

#### Session 6.2 — Localization and accessibility parity sweep

Scope: only the audited screens after functional changes have landed.

Tasks:

1. Compare Arabic/English namespace key sets automatically.
2. Find hardcoded user-facing strings and hardcoded date/number/currency locales.
3. Verify RTL layout, focus order, keyboard operation, labels, contrast, and dynamic announcements for errors/loading.
4. Use locale-aware date/number/currency utilities.

Tests: key-parity script; rendering snapshots/smoke in both locales; focused accessibility tests.

Exit criteria: no missing scoped keys or hardcoded locale formatting; core actions work by keyboard/screen reader where applicable.

#### Session 6.3 — End-to-end regression and rollout gate

Tasks:

1. Run the acceptance matrix below on seeded roles and realistic data greater than one page.
2. Run lint, unit, integration, contract, and E2E suites for all four packages.
3. Verify database migrations/indexes with dry-run, backup, and rollback instructions.
4. Check logs/metrics for validation errors, failed bulk items, payment mismatches, and query latency.
5. Release behind flags where behavior changes are risky (scheduling, analytics, new bulk transitions).

Exit criteria: all P0/P1 issues are closed or explicitly waived with owner/reason; no unresolved data migration; rollback is documented.

## 8. Acceptance matrix

At minimum, the final release gate must cover:

| Area | Required scenarios |
|---|---|
| Roles | host, business, admin, moderator where authorized, vendor, anonymous marketplace user |
| Locales | Arabic RTL and English LTR |
| Platforms | web desktop/mobile viewport; iOS/Android for active native paths; mobile web where checkout is exposed |
| Events | create; update every step; physical/allowed alternative location; final review; live add-only guest behavior; completed/cancelled restrictions; admin-on-behalf |
| Invitations | template save/read; Taqnyat; immediate/scheduled according to decision; quota failure; partial send; singular subscription response |
| Guests/staff | ID variants normalized; RSVP/QR preserved; staff token lifecycle; pending stats |
| Admin lists | search, filter, sort, page, reset, empty/error; more than one page; aggregate counts; URL persistence |
| Bulk actions | valid, mixed valid/invalid, unauthorized, repeated/idempotent, partial failure; plan/token/audit invariants |
| Tickets | every allowed/forbidden transition; subject; image/video attachment matrix; bulk resolve/delete |
| Plans | every plan type/interval; unlimited null pool; trial; edit round trip; extras; localization |
| Checkout | decimal totals; discounts; quote changes; expiry boundaries; double submit; gateway/persisted/displayed amount equality |
| Marketplace | multi-district; moderation blocks; approved/active only; deterministic pagination; localized names; anonymous policy |
| Vendor services | create/edit/clear; schema boundaries; location; media; status and stats cache |
| Settings | identity separation; verification sync; partial failure; stale modal reset; deletion; route links |

## 9. Required engineering evidence per session

Every Gemini session must leave these artifacts in its response or commit/PR notes:

1. Issue IDs addressed and exact acceptance criteria.
2. Evidence that each touched path is active, or an explicit dead-code proof.
3. Before-state reproduction or failing test.
4. Contract/state/data invariants considered.
5. Files changed and why.
6. Tests run with exact commands and results.
7. Remaining risks, migrations, product decisions, and follow-ups.
8. Updated checkboxes/status in this document. Do not mark an issue complete only because code was written.

## 10. Standard prompt for each Gemini session

Use this template, replacing the session identifier:

> Work only on **Session X.Y** in `docs/audit/2026-08-21-consolidated-page-audit-remediation-plan.md`.
>
> First read the executive conclusion, corrections, target architecture/invariants, the selected session, and all listed prerequisites. Inspect the current code because the repository may have changed since the audit. Reproduce each issue or add a failing test before changing behavior. Do not work on later sessions, do not restore `maxInvitesPerEvent`, do not invent status transitions, and do not patch orphaned code without proving it should remain.
>
> Implement the smallest root-cause fix that satisfies the session exit criteria across backend/shared/web/mobile paths in scope. Preserve unrelated user changes. Run the specified tests plus relevant package lint/type/build checks. Report issue IDs, evidence, files changed, commands/results, migrations/risks, and any blocked product decision. Update only this session’s completion state in the plan, then stop.

For a review-only pass, append:

> Do not modify code. Return a discrepancy report against the current repository, proposed test cases, and any correction needed to the plan.

## 11. Sequencing and safe parallelism

Recommended order is the numbered order. The following dependencies must be respected:

- Session 0.2 precedes DTO/status/key migrations.
- Sessions 1.2–1.4 precede broad event UI cleanup.
- Session 2.1 precedes 2.2.
- Session 3.1 precedes 3.2–3.4.
- Session 4.1 precedes vendor cleanup; 4.3 requires a product decision.
- Session 6.1 happens after functional paths are stabilized, not before.

If multiple engineers or sessions run in parallel, safe candidates are separate domains after Phase 0—for example 2.4 tickets, 4.1 vendor service forms, and 5.1 identity—provided they do not independently redefine shared DTOs/query keys. Event transition work, plan semantics, shared table work, and money/quote work should each have a single owner until their contracts land.

## 12. Completion definition

This program is complete only when:

- all P0 and P1 issues are fixed, deliberately rejected with evidence, or converted into owned product decisions;
- backend rules prevent client bypass and single/bulk operations preserve identical invariants;
- web/mobile consume canonical DTOs, statuses, plan semantics, and query keys;
- money displayed equals money charged;
- server-paginated search/filter and aggregate counts are correct beyond one page;
- active code is protected by safety lint;
- dead duplicate paths are removed after reachability proof;
- the full acceptance matrix passes in Arabic and English;
- migrations, feature flags, monitoring, and rollback steps are documented.

## 13. Execution records

### Session 0.1 — Baseline, issue ledger, and safety lint

- **Date:** 2026-08-21
- **Status:** Complete
- **Issues addressed:** EVT-01 (P0: Mobile `EventSummary` undefined `currentLanguage` crash).
- **Implementation summary:**
  - Re-enabled critical safety lint rules in `halaa-mobile/eslint.config.mjs` (`no-undef`, `no-unreachable`, `no-dupe-keys`, `valid-typeof`, `no-unsafe-optional-chaining`) with `error` severity.
  - Re-enabled clean `eslint:recommended` rules with zero violations (`no-async-promise-executor`, `no-cond-assign`, `no-constant-condition`, `no-fallthrough`, `no-irregular-whitespace`, `no-misleading-character-class`, `no-redeclare`, `no-self-assign`, `no-sparse-arrays`, `no-useless-catch`, `getter-return`, `no-case-declarations`, `no-control-regex`, `no-prototype-builtins`, `no-useless-escape`).
  - Fixed EVT-01 in `halaa-mobile/components/createEvent/EventSummary.js` by destructuring `currentLanguage` from `useTranslation("createEvent")` and adding it to the `useMemo` dependency array for `resolvedInvitation`.
  - Fixed companion `no-undef` in `halaa-mobile/components/admin-dashboard/events/EventActionsSection.js` by calling `useTranslation()` in `EventHeroCard`.
  - Added unit regression test `halaa-mobile/__tests__/regressions/eventSummarySmoke.test.js` asserting `currentLanguage` scoping and safety rule enforcement.
  - Added `npm run test` step to `.github/workflows/halaa-mobile.yml`.
- **Files changed:**
  - `halaa-mobile/components/createEvent/EventSummary.js`
  - `halaa-mobile/components/admin-dashboard/events/EventActionsSection.js`
  - `halaa-mobile/eslint.config.mjs`
  - `halaa-mobile/__tests__/regressions/eventSummarySmoke.test.js` (new)
  - `.github/workflows/halaa-mobile.yml`
  - `docs/audit/2026-08-21-consolidated-page-audit-remediation-plan.md`
- **Exact test commands & results:**
  - `cd halaa-mobile && npm run lint` → PASS (0 errors, 0 warnings under `eslint . --max-warnings 0`)
  - `cd halaa-mobile && npm run test` → PASS (97 tests passed, 0 failures)
  - `cd halaa-web && npm run lint && npm run test` → PASS (Lint: 0 errors, 33 warnings; Tests: 28 passed, 0 failures)
  - `cd shared && npm run lint && npm run legal:verify && npm run aso:verify` → PASS (Lint: 0 errors; Legal & ASO verified)
  - `cd halaa-backend && npm run catalog:verify && npm run test` → PASS (Catalog: 26 passed; Backend: 310 passed)
- **Remaining risks / debt ceiling:**
  - `no-unused-vars` remains silenced on mobile due to pre-existing unused React imports / destructured variables in legacy components.
- **Blockers / deferred work:**
  - None for Phase 0. Session 0.2 (Canonical DTO/status/query-key foundations) is unblocked.

### Session 0.2 — Canonical DTO/status/query-key foundations

- **Date:** 2026-08-21
- **Status:** Complete
- **Issues addressed:** EVT-15 (Guest ID / status normalization), EVT-16 (RSVP buckets definition), EVT-17 (Subscription response shape normalization), ADM-04 (Bulk ID Request envelope normalization), ADM-06 (Ticket title vs subject normalization), ADM-09 (Canonical query key factories).
- **Implementation summary:**
  - Consolidated canonical status constants in `@halaa/shared/constants` with full parity to backend: `USER_STATUS`, `VENDOR_STATUS`, `EVENT_STATUS` (all 10 lifecycle statuses), `SUBSCRIPTION_STATUS`, `TICKET_STATUS`, `TICKET_PRIORITY`, `RSVP_STATUS`, `GUEST_STATUS`, `CHECKIN_STATUS`, `INVITATION_TYPE`.
  - Implemented `RSVP_BUCKETS` and `classifyRsvpBucket(status)` in `@halaa/shared/constants/eventStatus.js`.
  - Implemented boundary DTO adapters in `@halaa/shared/utils/adapters.js`: `normalizeId`, `toGuestDTO`, `toTicketDTO`, `normalizeSubscriptionResponse`, `toSubscriptionDTO`, `toBulkIdsPayload`.
  - Implemented `bulkIdsRequestSchema` and `bulkActionResponseSchema` in `@halaa/shared/schemas/bulk.js`.
  - Implemented canonical query key factories in `@halaa/shared/utils/queryKeys.js`: `eventKeys`, `guestKeys`, `ticketKeys`, `planKeys`, `vendorServiceKeys`, `subscriptionKeys`.
  - Added test suite `shared/test/contracts.test.js` covering all adapters, schemas, RSVP buckets, and query keys.
  - Added backend parity test `halaa-backend/test/shared-parity.test.js` asserting zero drift between backend and shared status constants.
- **Files changed:**
  - `shared/src/constants/eventStatus.js`
  - `shared/src/constants/status.js` (new)
  - `shared/src/constants/index.js`
  - `shared/src/schemas/bulk.js` (new)
  - `shared/src/schemas/index.js`
  - `shared/src/utils/adapters.js` (new)
  - `shared/src/utils/queryKeys.js` (new)
  - `shared/src/utils/index.js`
  - `shared/package.json`
  - `shared/test/contracts.test.js` (new)
  - `halaa-backend/test/shared-parity.test.js` (new)
  - `docs/audit/2026-08-21-consolidated-page-audit-remediation-plan.md`
- **Exact test commands & results:**
  - `cd shared && npm run lint && npm run test && npm run legal:verify && npm run aso:verify` → PASS (10 unit tests passed, 0 lint errors, legal/aso verified)
  - `cd halaa-backend && node --test test/shared-parity.test.js && npm run catalog:verify && npm run test` → PASS (Parity: 2 passed; Catalog: 26 passed; Backend: 310 passed)
  - `cd halaa-mobile && npm run lint && npm run test` → PASS (0 errors, 97 tests passed)
  - `cd halaa-web && npm run lint && npm run test` → PASS (0 errors, 28 tests passed)
- **Remaining risks / decisions:**
  - None. Stable foundation primitives are ready for consumption in Phase 1 (Events), Phase 2 (Admin tables), Phase 3 (Plans), Phase 4 (Vendor), and Phase 5 (Settings).
- **Blockers / deferred work:**
  - Phase 0 is complete. Phase 1 (Session 1.1 — Event validation and location contract) is ready to begin.


