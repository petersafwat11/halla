# tickets — Full-Stack Review Plan

**Module:** tickets
**Generated:** 2026-05-07
**Prompt:** docs/implementation/MODULE_FULLSTACK_REVIEW_PROMPT.md
**Status:** Decisions locked 2026-05-08 · NOT IMPLEMENTED YET

---

## 0a. Decisions Locked (2026-05-08, audit-corrected 2026-05-09)

User-confirmed answers. These override anything in §1–§10 below where they conflict; affected sections have been rewritten to match.

### Audit corrections applied 2026-05-09 (read before implementing)
The plan was deep-audited against the codebase. Major corrections:
1. **`SearchBar.jsx` is NOT dead** — used by `TicketsHeader.jsx`. §B.10 dropped.
2. **`getTicketAssignees` permissions query is NOT a bug** — `User.permissions` is `[String]` and Mongo treats `{permissions: "manage_tickets"}` as array-contains. §6.9 / §A.12 dropped.
3. **`TicketDetailView.jsx` `_id` fallback exists at line 44 only** — not at 112/136/150/166 as originally claimed. §B.4 simplified.
4. **`ticketsAPI.bulkDelete` and `ticketsAPI.bulkResolve` hit non-existent backend endpoints** and have zero web callers — delete them in §B.8.
5. **`ticketsAPI.createTicket` HAS a real consumer** (`MakeTicketPopup.js:56`). New §B.17 added to migrate that flow + add subject input.
6. **Canonical `useTicketMutation('updateStatus')` does NOT forward `resolution`.** New §B.4b added to widen the hook before §B.5 swaps consumers.
7. **`utils/schemas/ticketSchema.js` exists with stale `"pending"` status enum and no `subject` field** — new §B.16 added to reconcile with backend.
8. **Mobile `AssignTicketModal` uses `useAdminModerators` instead of `/tickets/assignees`** — new §C.12 added for parity with web.
9. **Validation middleware path corrected** — `src/shared/middleware/validation.js:401` (singular `middleware`, line 401), not `shared/middlewares/validation.js:373`.
10. **Stale line numbers corrected** throughout (see §A and §B for the fixed locations).

1. **Validation library — Zod only.** New `tickets.validation.js` uses Zod schemas wired via `validateZod` middleware (`src/shared/middleware/validation.js:401` — **path corrected 2026-05-09 from earlier wrong `src/shared/middleware/validation.js:401`. Directory is singular `middleware`, function exported at line 401.**). Joi is forbidden. (Memory: `feedback_validation_zod.md`.)
2. **Replies feature — REMOVED entirely.** Tickets are handled out-of-band by a customer agent on WhatsApp. When the agent finishes, the admin marks the ticket resolved and writes a *close message* (the existing `resolutionResponse` field on `TicketModel`, written via `PATCH /tickets/:id/status` body `resolution`). All replies code is deleted: model `replies` array, service `addReply`, controller `addReply`, route `POST /:id/replies`, populate paths, `_formatTicket` reply-mapping branch. No `useAddReply` hook, no `replyLimiter`, no replies Swagger.
3. **`subject` is REQUIRED on create.** Backend Zod schema requires it; mobile vendor create form must add a subject input.
4. **Ticket-rating page — switch to `/rating-info`** (option A): add `useTicketForRating(id)` web hook and migrate `app/[lang]/ticket-rating/[id]/page.js`.
5. (n/a — no question raised.)
6. **Mobile services consolidation — keep the shim.** `services/adminDashboardService.js` re-exports ticket ops from `services/ticketsService.js` during migration.
7. **`tickets.service.js` 610-line over-cap — defer split.** Just trim comment hygiene to land ≤ 600.
8. **Dead-file deletions are conditional on grep.** Before deleting `useTicketsTableData.js` and `useAllTickets`, agent must confirm zero callers across `labbe/` and report grep evidence in the PR. **`SearchBar.jsx` is NOT dead** — verified 2026-05-09 via audit: it is imported and rendered by `app/[lang]/host/tickets/_components/TicketsHeader.jsx:8, 41`. The original §B.10 deletion was wrong; it has been removed from this plan.
9. (Reply rate-limit moot — no replies feature.)
10. **All replies-related code deleted** (covered by #2).

---

## 0. Executive Summary

- **11** total endpoints after deletion (was 12; `POST /:id/replies` is being removed — see §0a-2)
- **1** endpoint to delete (`POST /:id/replies`); **2** legacy-services duplicate every endpoint outside the module
- **2** Swagger drift findings (export, rating-info responses) — replies entry dropped
- **0** backend file-size violations after replies deletion (`tickets.service.js` will drop below 600 once `addReply`/replies-mapping/replies-populate are removed)
- **3** web file-size violations (none over 250, but `useTicketsTableData.js` is unused dead code, `TicketsTable.jsx` and `TicketDetailView.jsx` are close to cap)
- **0** mobile file-size violations (all under 350)
- **6** web/mobile API consumption mismatches
- **5** data mapping bugs hiding behind fallback chains
- **2** missing safeguards (Zod body validation on remaining endpoints; export RBAC action)
- **~22** comment-hygiene blocks to remove (FLOW-23-F01/F02, TENANT-F02, "Phase 4 W0-AUTH", "Phase 4 W3-PAGE", "Phase 4 review fix —")
- **1 BROKEN FEATURE BEING REMOVED** — `replies` (see §0a-2; admins use `resolutionResponse` close-message instead)
- Estimated effort: **L** (replies removal + admin-tickets-table fix are blocking, plus a meaningful refactor pass)

---

## 1. Endpoint Inventory

| # | Method | Path | Controller | Service | Middleware chain | Swagger | Web hook | Mobile hook | Status |
|---|--------|------|------------|---------|------------------|---------|----------|-------------|--------|
| 1 | GET | /tickets/assignees | tickets.controller.getAssignees | ticketsService.getTicketAssignees | protect, requirePageAccess(TICKETS,'update') | OK | useTicketAssignees | (none — admin uses useAdminModerators instead) | KEEP |
| 2 | GET | /tickets | tickets.controller.getTickets | ticketsService.getTickets | protect | OK (but response schema is wrong — claims `data.tickets` while sendPaginated returns `data` array directly) | useMyTickets, useAllTickets (duplicate) | useTickets, useAdminTicketsInfinite (split) | KEEP — fix swagger + delete useAllTickets |
| 3 | POST | /tickets | tickets.controller.createTicket | ticketsService.createTicket | protect | OK | useTicketMutation('createTicket') | useCreateTicket | KEEP — add Zod validation |
| 4 | GET | /tickets/export | tickets.controller.exportTickets | ticketsService.exportTickets | protect, requirePageAccess(TICKETS,'view') | **MISSING** | (none — uses raw `apiClient.get('/tickets/export')` in services/adminDashboard.js) | adminDashboardService.tickets.export (raw URL) | KEEP — add Swagger, add API_PATHS.tickets.exportTickets, requirePageAccess action should be 'export' not 'view' |
| 5 | GET | /tickets/:id | tickets.controller.getTicketById | ticketsService.getTicketById | protect, validateObjectId('id') | OK | useTicket | useTicket (common), useAdminTicketById (admin) | KEEP |
| 6 | PATCH | /tickets/:id | tickets.controller.updateTicket | ticketsService.updateTicket | protect, validateObjectId('id') | OK | useTicketMutation('updateTicket') | useUpdateTicket, adminDashboardService.tickets.respond (legacy) | KEEP — drop `respond` legacy |
| 7 | DELETE | /tickets/:id | tickets.controller.deleteTicket | ticketsService.deleteTicket | protect, validateObjectId('id') | OK | useTicketMutation('deleteTicket') | useDeleteTicket, useDeleteAdminTicket | KEEP — consolidate two mobile delete hooks |
| 8 | PATCH | /tickets/:id/assign | tickets.controller.assignTicket | ticketsService.assignTicket | protect, validateObjectId('id'), requirePageAccess(TICKETS,'update') | OK | useTicketMutation('assignTicket') | useAssignTicket | KEEP — add Zod validation |
| 9 | PATCH | /tickets/:id/status | tickets.controller.updateStatus | ticketsService.updateTicketStatus | protect, validateObjectId('id'), requirePageAccess(TICKETS,'update') | OK | useTicketMutation('updateStatus') | useResolveTicket, useReopenTicket | KEEP — add Zod validation |
| 10 | PATCH | /tickets/:id/rate | tickets.controller.rateTicket | ticketsService.rateTicket | protect, validateObjectId('id') | OK | useTicketMutation('rateTicket') | useRateTicket | KEEP — add Zod validation |
| 11 | GET | /tickets/:id/rating-info | tickets.controller.getTicketForRating | ticketsService.getTicketForRating | protect, validateObjectId('id') | OK (but response schema wrong — service returns flat object, not `{ ticket: {...} }`) | (none — ticket-rating page uses useTicket instead, mismatched) | (none) | KEEP — fix Swagger + add useTicketForRating web hook + migrate ticket-rating page |
| 12 | ~~POST~~ | ~~/tickets/:id/replies~~ | ~~addReply~~ | ~~addReply~~ | — | — | — | — | **DELETE — see §0a-2.** Feature removed; admins use close-message via `PATCH /:id/status` `resolution` body field (persists to `resolutionResponse`). |

**Legend:** KEEP, DELETE-DUPLICATE-OF-#N, RENAME, MERGE-WITH-#N

---

## 2. Backend Findings

### 2.1 File-size violations
- `tickets.service.js` — **610 lines** (cap 600). After deleting `addReply` (~25 lines), the populate-`replies.user` line, and the replies branch in `_formatTicket` (~10 lines), the file lands well under cap. Defer further notification-helper split per §0a-7.

### 2.2 Swagger drift
- `GET /tickets` — JSDoc claims `data.tickets[]` + `data.pagination`, but `responseHelper.sendPaginated` writes `{ data: <array>, pagination }` at top level (siblings, not nested). Frontend reads `data.data.tickets` and gets `undefined` (this is the admin-table broken-data bug — see §3.4). **Fix Swagger to match the actual wire shape.** (`tickets.routes.js:74-90`)
- `GET /tickets/export` — no `@swagger` block at all. Add one (`/tickets/export`, `tags:[Tickets]`, query params, response: file blob). (`tickets.routes.js:189-193`)
- `GET /tickets/:id/rating-info` — service returns a flat `{ id, ticketNumber, subject, status, canRate, hasRated, currentRating }` shape, but the JSDoc has no schema; describe it explicitly. (`tickets.service.js:417-427`, `tickets.routes.js:317-341`)
- ~~`POST /tickets/:id/replies`~~ — endpoint deleted (§0a-2). No Swagger needed.

### 2.3 Missing middleware / safeguards
- ~~`POST /tickets/:id/replies`~~ — endpoint deleted (§0a-2).
- `PATCH /tickets/:id/status` and `PATCH /tickets/:id/assign` — no Zod validation; controllers trust the body. Add schemas in §2.6.
- `POST /tickets` — no Zod validation; relies on Mongoose schema. Add schema (**subject required**, ≤ 200; message 10–5000; type enum; optional priority enum) — §0a-3.
- `GET /tickets/export` — uses `requirePageAccess(TICKETS, 'view')`; per A4.2 `'export'` is the conventional action for export endpoints. Switch.

### 2.4 Duplicate / dead endpoints
None inside the module. (See §3.5 for legacy *frontend* duplicates.)

### 2.5 Service / controller violations
- **REPLIES FEATURE REMOVAL** (§0a-2). Delete:
  - `labbe-backend-/models/TicketModel.js` — the `replies: [{ content, author, authorRole, createdAt }]` array field. (No data loss: due to the prior schema-mismatch bug, every persisted entry was empty `{ _id, createdAt }`.)
  - `tickets.service.js:159` — drop `.populate("replies.user", ...)` from `getTicketById`.
  - `tickets.service.js:206-242` (audit-corrected 2026-05-09; was 204-238) — delete the entire `addReply` method and its notification helpers `_notifyUserTicketReply` / `_notifyAdminsTicketReply` (and remove their call sites).
  - `tickets.service.js:515-523` (audit-corrected 2026-05-09; was 514-525) — delete the `if (includeReplies && ticket.replies) { formatted.replies = ... }` branch in `_formatTicket`. Remove the `includeReplies` parameter.
  - `tickets.controller.js` — delete the `addReply` controller export.
  - `tickets.routes.js:343-348` (audit-corrected 2026-05-09; line 343 is the `// FLOW-23-F02` comment, the `router.post(...)` block is 344-348) — delete the entire range, including the comment.
  - **Admins close tickets via `PATCH /:id/status` with `resolution` body** (already implemented; persists to `resolutionResponse` per `tickets.service.js:271-280`, surfaced as `resolution: { message, by, at }` in `_formatTicket`). No new endpoint needed.
- `tickets.service.js:190, 193, 236, 238, 295, 318` — `.catch(console.error)` for fire-and-forget notifications. Backend rule A2.4 forbids `console.*` in committed code. Replace with `.catch((err) => logger.error('ticket notification failed', err))` from `shared/utils/logger.js`, or — better — wrap the helper to swallow silently after logging.
- `tickets.service.js:81-93` `getTicketAssignees` uses string literals `'manage_tickets'` and `'suspended'`. Replace with `PERMISSIONS.MANAGE_TICKETS` and `USER_STATUS.SUSPENDED` constants (verified 2026-05-09 — both exist in `shared/constants/permissions.js` and `shared/constants/status.js:60-62`). **The MongoDB query `{permissions: "manage_tickets"}` itself works correctly** — `User.permissions` is `[String]` (verified `models/UserModel.js:318-324`) and Mongo treats this as array-contains semantics. The suspected bug in §6.9 is NOT real; only this cosmetic rename is needed.
- `tickets.service.js:178-196` `createTicket` doesn't audit-log creation, while `addReply` and `updateTicketStatus` do. Add `logAudit({ action: 'ticket.created', ... })` for consistency (and because admin-side dashboards filter audit by entity).
- `tickets.service.js:103-146` `getTickets` skips `.lean()` because `_formatTicket` is a no-op transform that doesn't need Mongoose docs. Add `.lean()` for the read path; keep populate as-is.
- `tickets.service.js:251-298` `updateTicketStatus` mutates `existing.status` indirectly: it fetches `existing.status`, then does a separate `findByIdAndUpdate`. Two round-trips. Acceptable, but flag — if needed for performance, use a single `findOneAndUpdate({ _id, status: { $in: VALID_TRANSITIONS_FROM_ALLOWED } }, ...)` pattern.
- `tickets.service.js:178-196` `createTicket` doesn't atomically update `whitelabelId`-based usage counts (none today), so no transaction needed. Confirmed.

### 2.6 Validation gaps (Zod — see §0a-1)

A new `labbe-backend-/src/modules/tickets/tickets.validation.js` is required, written in **Zod** (Joi forbidden). Wire each schema via the `validateZod(schema, source)` middleware (`src/shared/middleware/validation.js:401`). Spec:

```js
const { z } = require('zod');
const { TICKET_STATUS, TICKET_PRIORITY } = require('../../shared/constants');

const TICKET_TYPE_VALUES = ['technical','payment','event','user','other','inquiry','issue','request','suggestion'];
const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');

// §0a-3: subject is REQUIRED on create
const createTicketSchema = z.object({
  subject:  z.string().trim().min(1).max(200),
  type:     z.enum(TICKET_TYPE_VALUES),
  message:  z.string().trim().min(10).max(5000),
  priority: z.enum(Object.values(TICKET_PRIORITY)).optional(),
}).strict();

const updateTicketSchema = z.object({
  subject:  z.string().trim().min(1).max(200).optional(),
  message:  z.string().trim().min(10).max(5000).optional(),
  type:     z.enum(TICKET_TYPE_VALUES).optional(),
  priority: z.enum(Object.values(TICKET_PRIORITY)).optional(),
  status:   z.enum(Object.values(TICKET_STATUS)).optional(),
}).strict().refine((v) => Object.keys(v).length > 0, 'At least one field required');

const updateStatusSchema = z.object({
  status:     z.enum(Object.values(TICKET_STATUS)),
  resolution: z.string().trim().max(5000).optional(),  // close-message — see §0a-2
}).strict();

const assignTicketSchema = z.object({
  assigneeId: objectId,
}).strict();

const rateTicketSchema = z.object({
  rating:   z.number().int().min(1).max(5),
  feedback: z.string().trim().max(1000).optional(),
}).strict();

// addReplySchema REMOVED — replies feature deleted (§0a-2)

const listTicketsQuerySchema = z.object({
  page:     z.coerce.number().int().min(1).optional(),
  limit:    z.coerce.number().int().min(1).max(100).optional(),
  status:   z.enum([...Object.values(TICKET_STATUS), 'all']).optional(),
  priority: z.enum(Object.values(TICKET_PRIORITY)).optional(),
  source:   z.string().optional(),
  search:   z.string().trim().max(200).optional(),
  from:     z.coerce.date().optional(),
  to:       z.coerce.date().optional(),
}).strict();

module.exports = { createTicketSchema, updateTicketSchema, updateStatusSchema,
  assignTicketSchema, rateTicketSchema, listTicketsQuerySchema };
```

Note: `status: 'all'` is a sentinel value the admin mobile screen currently sends — the mobile-side fix (§4.5, C.1) strips it before sending, so the schema accepts `'all'` only as a transitional safety net during rollout. After C.1 ships and mobile is verified, drop `'all'` from the enum.

### 2.7 Comment hygiene
- `tickets.service.js:37` — `// FLOW-23-F01: valid status transitions matrix` → keep the `VALID_TRANSITIONS` const, drop the FLOW marker (the name is self-explanatory)
- `tickets.service.js:114` — `// TENANT-F02: whitelabel admin/moderator sees only their tenant's tickets` → keep the *behavioral* comment ("Whitelabel admins see only their tenant's tickets") and drop the marker
- `tickets.service.js:256` — `// FLOW-23-F01: enforce state machine — fetch current status first` → drop the FLOW prefix
- ~~`tickets.controller.js:157` — `// Add reply to ticket (FLOW-23-F02)`~~ — line deleted with the controller method (§0a-2).
- ~~`tickets.routes.js:343` — `// FLOW-23-F02: Add reply to ticket`~~ — line deleted with the route (§0a-2).
- `tickets.routes.js:232, 273` — `// Ticket assignment (admin/moderator only)` / `// Ticket status update (admin/moderator only)` — re-statements that the `requirePageAccess(TICKETS,'update')` line already encodes. Delete.
- `tickets.routes.js:314, 336` — same pattern. Delete.

---

## 3. Frontend Web Findings

### 3.1 Component tree per page

- `app/[lang]/admin-dash/tickets/page.js` (48 lines)
  - `_components/TicketsPageHeader.jsx` (15 lines)
  - `_components/TicketStats.jsx` (76 lines) — has data-mapping bug
  - `_components/TicketsTable.jsx` (163 lines) — has data-mapping bug; calls legacy `ticketsAPI.export`
    - `_components/TicketTableContent.jsx` (152 lines)
    - `_components/AssignTicketPopup.jsx` (88 lines)
    - `_components/TicketResponsePopup.jsx` (128 lines) — bypasses canonical mutation hook
    - `ui/commen/new-table/Table.js` (shared)
  - `_components/useTicketsTableData.js` (205 lines) — **DEAD FILE**, not imported anywhere; was the prior consolidator before TicketsTable was refactored. Delete.

- `app/[lang]/admin-dash/tickets/[id]/page.js` (32 lines)
  - `[id]/_components/TicketDetailsContent.jsx` (31 lines) — fallback chain on response shape
    - `[id]/_components/TicketDetailView.jsx` (193 lines) — uses `ticket.id || ticket._id` fallback (backend formatter always returns `id`, never `_id`)

- `app/[lang]/host/tickets/page.js` (189 lines)
  - `_components/TicketsHeader.jsx` (57 lines)
  - `_components/TicketCard.jsx` (181 lines) — heavy inline SVG, inline `style={{ background, color }}`, hardcoded color hex
  - `_components/SendTicketPopup.jsx` (248 lines)
  - `_components/EmptyState.jsx` (54 lines)
  - `_components/SearchBar.jsx` (28 lines) — file exists but **not imported** by page.js (page renders `<TicketsHeader>` instead). Verify dead.
  - `ui/vendor/modals/DeleteConfirmation` (shared)
  - `ui/common/loading/SimpleLoading` (shared)
  - `ui/common/error/ErrorBoundary` (shared)

- `app/[lang]/vendor-dashboard/tickets/page.js` (135 lines) — **legacy (no React Query)**:
  - imports host `TicketsHeader/TicketCard/SendTicketPopup/EmptyState` directly via deep `app/[lang]/host/...` paths
  - uses `ticketService` from `services/tickets.js` (legacy)
  - `useState`+`useEffect` instead of React Query
  - reads `response.data?.tickets || response.data?.data?.tickets || []` (fallback chain over a wrong shape)

- `app/[lang]/ticket-rating/[id]/page.js` (249 lines)
  - `ui/commen/inputs/starRating/StarRating`
  - `ui/commen/inputs/inputGroup/TextArea`
  - `ui/common/errorBoundary/ErrorBoundary`
  - calls `useTicket(id)` instead of the dedicated `/rating-info` endpoint

### 3.2 File-size violations
None over the 250-line cap. Page-level files are healthy. (Do not split anything; just delete dead `useTicketsTableData.js`.)

### 3.3 Hardcoded text / data / paths
- `app/[lang]/host/tickets/page.js:151` — `&quot;{searchQuery}&quot;` is wrapped in quotes but the prefix uses `t("search.noResults", "No results found")` — fine. *No fix needed.*
- `app/[lang]/vendor-dashboard/tickets/page.js:107` — `<p>لا توجد نتائج للبحث &quot;{searchQuery}&quot;</p>` — hardcoded Arabic. → `t("search.noResults") + " \"" + searchQuery + "\""` (or use the host page's translated path).
- `app/[lang]/host/tickets/_components/TicketCard.jsx:158, 167, 173` — `t("createdAt") || "تم الإنشاء:"`, `t("actions.delete") || "حذف"`, `t("actions.edit") || "تعديل"` — literal Arabic fallbacks should be removed since the keys exist; if missing, add to locales.
- `services/tickets.js:117-160` — `ticketHelpers.getTypeLabel`/`getStatusLabel`/`getPriorityLabel` contain hardcoded Arabic literals as fallbacks for every label. These helpers are dead code (no callers after the React-Query migration) — verify and delete the whole file. *Replaces it: components call `t("types.<value>")` directly.*
- `services/adminDashboard.js:177` — hardcoded path `/tickets/export`. Add `API_PATHS.tickets.exportTickets` and reference it.
- `app/[lang]/host/tickets/_components/TicketCard.jsx:9-30` — `statusConfig` defines hex colors inline. Acceptable (Core Rule says preserve styles), but the `style={{ background, color }}` inline-style usage at line 149-154 *does* count as "hardcoded styles." Move colors into `TicketCard.module.css` modifier classes (`.statusOpen`, `.statusInProgress`, etc.) without changing pixel output — same hex values, just keyed by class.

### 3.4 Data mapping bugs / fallback chains
**(These are the most user-visible bugs. They explain why the admin tickets table is broken in production.)**

- **`_components/TicketsTable.jsx:105`** — `(data?.data?.tickets || []).map(...)`. Backend `sendPaginated` returns `{ data: <array>, pagination }`, so the actual array is `data.data`. **The admin tickets table is broken: it always renders empty.** Replace with `(data?.data || []).map(...)`.
- **`_components/TicketTableContent.jsx:144-147`** (audit-corrected 2026-05-09; the original plan said `TicketsTable.jsx:146-147` but those references actually live in `TicketTableContent.jsx`) — `data?.data?.pagination?.pages || data?.data?.pagination?.totalPages || 1`, `data?.data?.pagination?.total`. Same shape error. Should read `data?.pagination?.pages`, `data?.pagination?.total`. (`responseHelper.sendPaginated` writes pagination as a top-level sibling.)
- **`_components/TicketStats.jsx:29-30`** — `data?.data?.tickets || []`, `data?.data?.pagination?.total`. Same shape error. → `data?.data || []`, `data?.pagination?.total`.
- **`_components/TicketResponsePopup.jsx:21-25`** — uses raw `useMutation` against `API_PATHS.tickets.updateTicketStatus`. Replace with the canonical `useTicketMutation('updateStatus')`. (The path is right; the issue is the duplicate hook violating B0.2.)
- **`[id]/_components/TicketDetailsContent.jsx:28`** — `data?.data?.ticket || data?.data || data`. Backend service returns `{ ticket: {...} }`, wrapped by `sendSuccess` into `{ data: { ticket: {...} } }`. Replace with `data?.data?.ticket`.
- **`[id]/_components/TicketDetailView.jsx:44`** — `ticket.id || ticket._id` (audit-corrected 2026-05-09: lines 112, 136, 150, 166 do NOT contain `_id` — only line 44 has the fallback). Backend `_formatTicket` always returns `id`, never `_id`. Drop the `_id` branch at line 44 only.
- **`ticket-rating/[id]/page.js:44`** — `ticketData?.data?.data || ticketData?.data || ticketData`. The page fetches via `useTicket(id)`, which returns `{ data: { ticket: {...} } }`. Either:
  - A. Switch to a new `useTicketForRating(id)` hook that hits `/rating-info`, returning the dedicated flat shape (recommended — uses an endpoint that exists for exactly this purpose), or
  - B. Read `ticketData?.data?.ticket` and accept the heavier payload.
  Choose A.
- **`vendor-dashboard/tickets/page.js:26`** — `response.data?.tickets || response.data?.data?.tickets || []`. Whole page should migrate to React Query; the fallback chain disappears in the rewrite.
- **`_components/AssignTicketPopup.jsx:20`** — `(assignees?.data || [])`. Correct against actual `sendSuccess(res, assignees)` shape (`{ data: [...] }`). Keep.
- **Host `page.js:35`** — `ticketsData?.data || []`. Correct.
- **Host `page.js:73-83`** — uses `["tickets", "my-tickets", {}]` as the cache-update key. Correct because `useMyTickets()` (no params) keys on `["tickets", "my-tickets", {}]`. Keep.

### 3.5 Duplicate hooks / direct apiRequest calls
- `services/tickets.js` exports a whole legacy `ticketService` (`createTicket`, `getTickets`, `getTicket`, `updateTicket`, `deleteTicket`) bypassing React Query and using `apiClient.post('/tickets', ...)` with hardcoded paths. **Used only by `vendor-dashboard/tickets/page.js`.** Delete the file once vendor page migrates to canonical hooks. Keep the `TICKET_TYPES` / `TICKET_STATUS` / `TICKET_PRIORITY` enum exports — those are still imported (e.g. `ticket-rating/[id]/page.js:15`). Move the enums into `utils/constants/ticketConstants.js` (no helpers, just the three frozen objects).
- `hooks/reactQueryHooks/useTickets.js:71-83` — `useAllTickets` is a literal duplicate of `useMyTickets` (same path, same params). Delete; migrate consumers (search the codebase — at this writing there are zero callers).
- `hooks/reactQueryHooks/useTickets.js` — has no `useTicketForRating` hook. Add it (§0a-4). No `useAddReply` — replies feature removed (§0a-2).
- `app/[lang]/admin-dash/tickets/_components/useTicketsTableData.js` (205 lines) — **dead file.** No imports. Delete.
- `app/[lang]/admin-dash/tickets/_components/TicketResponsePopup.jsx:21-25` — local `useMutation` instead of canonical `useTicketMutation('updateStatus')`. Replace.
- `services/adminDashboard.js:59-186` — entire `ticketsAPI` object duplicates everything in `useTickets.js` plus the export endpoint, all with hardcoded paths and `apiClient.get/patch/delete` direct calls. Used by `_components/TicketsTable.jsx:90` (`ticketsAPI.export`) and `_components/useTicketsTableData.js:66` (dead). After cleaning up, only `ticketsAPI.export` will still be referenced — preserve that one method (or fold the export into `useTickets.js` as a `useExportTickets` hook). The other methods (`getAll, getById, assignTo, resolve, reopen, respond, delete, statusUpdate`) are dead — confirm and delete.

### 3.6 State / loading / error gaps
- `app/[lang]/host/tickets/page.js:25-31` — uses `useState` for filter (search) state. Per B14, search should live in the URL via `useSearchParams`. Acceptable for a host-side personal list (small, doesn't need bookmarking), but flag.
- `app/[lang]/vendor-dashboard/tickets/page.js` — no React Query, no `staleTime`, no cache invalidation. Whole page will be replaced.
- `app/[lang]/host/tickets/page.js:131` — error branch renders `<ErrorBoundary>` *as a render-error fallback*, not as a query-error display. The query is already finished by the time we get here; should render `<div><p>{t("errors.loadFailed")}</p><button onClick={refetch}>retry</button></div>` directly.

### 3.7 Comment hygiene
- `app/[lang]/admin-dash/tickets/_components/SendTicketPopup.jsx` — none.
- `app/[lang]/host/tickets/page.js:72, 102` — `// Optimistic update`, `// Popup component handles its own mutation and cache invalidation` (and the next line). The first explains *why* (rollback on error) — keep. The second is dead obvious — drop both lines including the empty handler.
- `services/tickets.js` — entire JSDoc-heavy file is being deleted; no per-line cleanup needed.
- No FLOW/PHASE markers spotted in web tickets surface. Clean.

---

## 4. Frontend Mobile Findings

### 4.1 Screen → component tree

- `screens/admin/admin-dashboard/AdminTicketsScreen.js` (303 lines)
  - `components/admin-dashboard/tickets/TicketListItem.js` (117 lines)
  - `components/admin-dashboard/tickets/ResolveTicketModal.js` (292 lines)
  - `components/admin-dashboard/tickets/AssignTicketModal.js` (284 lines)
  - `components/admin-dashboard/tickets/ModeratorList.js` (150 lines) — used by AssignTicketModal
  - `components/plans/TopBar.js` (shared)
  - `components/admin-dashboard/common/AdminPageHeader.js` (shared)
  - `components/admin-dashboard/common/AdminFlatList.js` (shared)
  - `components/admin-dashboard/common/ExportButton.js` (shared)
  - `components/admin-dashboard/common/BulkActionsBar.js` (shared)

- `screens/admin/admin-dashboard/TicketDetailsScreen.js` (227 lines)
  - `components/admin-dashboard/tickets/TicketHeroCard.js` (50 lines)
  - `components/admin-dashboard/tickets/TicketDetailsCard.js` (294 lines)
  - `components/admin-dashboard/tickets/TicketSectionCard.js` (79 lines)
  - `components/admin-dashboard/tickets/TicketActions.js` (47 lines)
  - `components/admin-dashboard/tickets/ResolveTicketModal.js` (292 lines)
  - `components/admin-dashboard/tickets/AssignTicketModal.js` (284 lines)

- `screens/common/TicketsScreen.js` (316 lines) — used by hosts
  - `components/tickets/TicketCard.js` (256 lines)
  - `components/tickets/TicketModal.js` (348 lines)
  - `components/tickets/TicketRatingModal.js` (344 lines)

- `screens/vendor/VendorTicketsScreen.js` (240 lines)
  - inline modal (no extraction) — file owns its own form, dropdown, textarea, list item

### 4.2 File-size violations
- All ticket screens and components are within the 350-line cap. Do **not** split anything; preserve styles.

### 4.3 Service / hook violations
- `services/ticketsService.js` exports only **two** read functions (`getTicketsAPI`, `getTicketAPI`). All mutations are inlined inside `hooks/mutations/useTicketMutations.js` via a private `ticketRequest` helper that re-implements the same `apiFetch + JSON parse + throw` pattern. **Move the four mutation calls (create/update/delete/rate) into `services/ticketsService.js`** so the service file owns one-call-per-endpoint, and the hooks only do `useMutation({ mutationFn: createTicketAPI, onSuccess: invalidate })`.
- `services/ticketsService.js:19-30` — both functions still take `_legacyToken` as first arg, ignored. Per C1, drop the arg in new code; cascade-update the two callers in `hooks/queries/useTickets.js:14, 31`.
- The admin path goes through `services/adminDashboardService.js:220-246` (`apiRequest(...)` + `openExportUrl(...)` raw paths, no `ENDPOINTS` constants). The non-admin path goes through `services/ticketsService.js` (clean `apiFetch` + `ENDPOINTS`). **Divergent.** Recommend: move the admin-only ops (`assignTo`, `resolve`, `reopen`, `delete` to `/admin/tickets/...`? — no, they all hit the same `/tickets/:id/...` endpoints) into `services/ticketsService.js` so all ticket calls share the same module. Then `services/adminDashboardService.js` exports `tickets` as a re-export of those functions.
- `hooks/queries/useTickets.js:8-37` — `useTickets(filters)` is the host/vendor read hook. `useAdminTicketsInfinite(filters)` (in `useAdminInfinite.js:182`) is the admin read hook. Both call the same backend endpoint with different paginators. Keep both; flag that the **filter shape must agree** (see §4.5).
- `hooks/mutations/useTicketMutations.js:55-65` — `useRateTicket` exists; good. `hooks/mutations/useAdminMutations.js:265-319` defines `useAssignTicket`, `useResolveTicket`, `useReopenTicket`, `useDeleteAdminTicket`. There is **no `useDeleteTicket` for admin** that goes through the canonical service — `useDeleteTicket` (common) and `useDeleteAdminTicket` (admin) both call `/tickets/:id` DELETE but invalidate different keys (`['tickets']` vs `['admin','tickets']`). Consolidate so admin screens invalidate both keys, or admin mutations invalidate `['tickets']` (broader → covers both).
- No mobile hook for replies — feature removed (§0a-2).

### 4.4 Hardcoded text / data / paths
- `services/adminDashboardService.js:223-245` — eight hardcoded `/tickets...` literals. Move to `ENDPOINTS.TICKETS` (+ add `ASSIGN`, `STATUS`, `EXPORT`).
- `screens/common/TicketsScreen.js:185, 213-215, 259, 263, 290-292, 308` — colors `#c28e5c`, `#e0e0e0`, `#f8f8f8`, etc. Style preservation rule applies — **do NOT change colors**, just keep them; flag as a future tokens migration.
- `screens/vendor/VendorTicketsScreen.js:13-26` — `STATUS_COLORS` and `PRIORITY_COLORS` literal-hex maps inside the screen. Preserve as-is (Core Rule); flag as parity-with-web concern (web uses CSS class names with the same hex; values match per-status — verify in §4.5).
- `screens/admin/admin-dashboard/AdminTicketsScreen.js:71-87` — maps backend ticket through `tk.subject || tk.title` etc. — see §4.5.

### 4.5 Web/Mobile divergence (and backend parity issues)
- **Status filter "all" sentinel.** `AdminTicketsScreen.js:50` sends `{ status: activeFilter }` where `activeFilter` defaults to `"all"`. Backend `getTickets` does `if (status) query.status = status;` → `query.status = "all"` matches no docs. **Net effect: admin mobile screen shows zero tickets when "All" is selected.** Web doesn't have this bug (the filter dropdown uses `""` as the all-bucket). Fix mobile: send `undefined`/strip when `activeFilter === 'all'`. Or fix backend: treat `"all"` as no-filter. Pick mobile-side fix; backend stays strict.
- **`subject` vs `title` and `message` vs `description`.** `AdminTicketsScreen.js:75-76`, `TicketDetailsScreen.js:70-71`, `TicketListItem.js` (likely) all do `tk.subject || tk.title`, `tk.message || tk.description`. Backend never returns `title`/`description`. Dead branches → delete.
- **`submittedBy` vs `user`.** Same files: `tk.submittedBy || tk.user`. Backend formatter returns `user`. Dead branch → delete.
- **Vendor mobile create form is missing `subject` — must be added (§0a-3).** `VendorTicketsScreen.js:38, 60, 88, 91` currently posts `{ type, message }`. Backend Zod (§2.6) and web require `subject`. Add a subject input to the vendor mobile form and include `subject` in the POST body. Backend Mongoose schema must also be updated to mark `subject` as `required: true` for symmetry.
- ~~Reply field shape~~ — feature removed (§0a-2).
- **Pagination shape disagreement.** Web reads `data.data.pagination.pages|totalPages|total` (wrong); mobile `_normalizePage` reads through `inner.pagination` then falls back to `outer.pagination` — has the right intention but burns extra branches. After web is fixed (§3.4), simplify mobile's `_normalizePage` to read only `outer.pagination` since that's the actual `sendPaginated` shape.
- **Response field paths for single ticket.** Web reads `data.data.ticket` (after §3.4 fix); mobile `TicketDetailsScreen.js:68` reads `resp?.data?.ticket || resp?.data` — drop the second branch.

| Endpoint | Aspect | Web | Mobile | Backend truth | Action |
|----------|--------|-----|--------|---------------|--------|
| GET /tickets | response array path | `data.data.tickets` ❌ | `inner.tickets ?? inner.data ?? inner` | `data` (top-level array per `sendPaginated`) | Fix web |
| GET /tickets | pagination path | `data.data.pagination.*` ❌ | `inner.pagination ?? outer.pagination` | `pagination` (top-level sibling) | Fix web; simplify mobile |
| GET /tickets | status="all" | excluded from URL | sent as `status=all` ❌ | unknown filter → no match | Fix mobile |
| POST /tickets | body.subject | required | omitted | optional | Make web optional or mobile add field — pick web optional |
| GET /tickets/:id | response.ticket path | `data.data.ticket` (after fix) | `data.ticket` ❌ | `data.ticket` | Drop fallback both sides |
| ~~POST /tickets/:id/replies~~ | — | — | — | DELETED (§0a-2) | Remove route, controller, service method, model field |
| GET /tickets/:id/rating-info | hook | (uses `/tickets/:id` instead) ❌ | (none) | `/rating-info` exists | Add `useTicketForRating` web; migrate ticket-rating page |

### 4.6 Loading / error / empty states
- All four mobile screens render a loading branch and an empty state. AdminTicketsScreen lacks an explicit error UI (toasts via `useEffect`); accept.
- `screens/common/TicketsScreen.js:62-66` — error → `toast.error(error.message)` raw to user. Replace with translated string `t("messages.loadError")`.

### 4.7 Comment hygiene
- `services/ticketsService.js:1-7` — header comment `Phase 4 W0-AUTH: routed through apiFetch …` → drop the marker, keep "Routed through apiFetch for token + 401 refresh + 30s timeout" only if non-obvious; otherwise drop entirely.
- `hooks/mutations/useTicketMutations.js:5-9` — same pattern. Drop `Phase 4 W0-AUTH:` marker.
- `hooks/queries/useAdminInfinite.js:1-31, 12-17, 23-25, 27-30` — extensive `Phase 4 W3-PAGE`, `Phase 4 review fix`, `master plan D5`, etc. Strip markers; keep the substantive shape-explanation comment in `_normalizePage`.
- `screens/admin/admin-dashboard/AdminTicketsScreen.js:46, 53, 89, 118, 129, 141, 207` — `// Phase 4 review fix —`, `// Phase 4 W3-PAGE`, `// ── Selection ──` (acceptable as a section divider), etc. Drop FLOW/Phase markers; keep section dividers.

---

## 5. Cross-Platform API Consumption Diff

| Endpoint | Aspect | Web | Mobile | Backend truth | Action |
|----------|--------|-----|--------|---------------|--------|
| GET /tickets/assignees | hook used | `useTicketAssignees` | uses `useAdminModerators` (different endpoint!) | `/tickets/assignees` (returns admins+moderators with `manage_tickets`) | Mobile should use `/tickets/assignees` (supports moderators with explicit permission) |
| GET /tickets | array path | `data.data.tickets` ❌ | `data.data` or `data.data.tickets` (auto-detect) | `data` array | Fix web |
| GET /tickets | pagination | `data.data.pagination.*` ❌ | `inner.pagination ?? outer.pagination` | top-level `pagination` | Fix web, simplify mobile |
| GET /tickets | status `"all"` | omitted | sent verbatim ❌ | no-match | Fix mobile |
| POST /tickets | `subject` required | yes | no ❌ | required (§0a-3) | Add subject input to mobile vendor form; mark Mongoose schema `required: true` |
| GET /tickets/:id | `data.ticket` | `data.data.ticket` ✅ (after fix) | `data.ticket` ❌ | `data.ticket` | Drop fallback both sides |
| GET /tickets/:id/rating-info | called | no (uses `/tickets/:id`) ❌ | no | yes | Add `useTicketForRating` |
| GET /tickets/export | path | hardcoded `/tickets/export` ❌ | hardcoded `/tickets/export` ❌ | yes | Add to `API_PATHS` and `ENDPOINTS` |
| PATCH /tickets/:id/status | `resolution` field | sent on resolve | sent on resolve | accepted | OK |
| ~~POST /tickets/:id/replies~~ | — | — | — | DELETED (§0a-2) | Remove from backend |

---

## 6. Suspected Bugs Worth Verifying

1. ~~Replies silently dropped~~ — moot. Replies feature being removed entirely (§0a-2). Pre-deletion sanity check still useful: confirm `tickets.replies` documents are all empty `{ _id, createdAt }` so deletion has no real-data impact.
2. **Admin tickets table renders empty** (§3.4). Confirm: open `/admin-dash/tickets` in dev, with at least one ticket present. The table will be empty because `data.data.tickets` is `undefined`. Verify before §7.B.1.
3. **Admin tickets stats show only `total` from pagination** (§3.4). The other three cards (open/resolved/highPriority) compute from `tickets[]` which is `[]`, so they all show `0` regardless of state.
4. **Admin mobile "All" filter shows zero tickets** (§4.5). Verify by selecting "All" in `AdminTicketsScreen` filter chips and observing empty list. The other filters (`open`, `in_progress`, etc.) work because they happen to match real values.
5. **Ticket-rating page hits `/tickets/:id` instead of `/tickets/:id/rating-info`** (§3.4). Heavier payload (full ticket including replies array) than the page needs. Functionally works because the page reads `ticket.userRating` which is on both shapes. Performance/consistency only.
6. **`services/tickets.js` `ticketHelpers` may still be imported by orphaned code** — grep before deleting. (Cursory check found only enums imported in `ticket-rating/[id]/page.js:15`.)
7. **`useTicketsTableData.js` (205 lines) appears dead** — confirm with one more grep across `app/` and `components/` before deletion.
8. **`SearchBar.jsx` in host/_components/** — confirm dead (page renders `TicketsHeader`, never `SearchBar`). If so, delete.
9. ~~**`getTicketAssignees` filters by `permissions: "manage_tickets"`**~~ **AUDIT-RESOLVED 2026-05-09: NOT A BUG.** `User.permissions` is `[String]` (`models/UserModel.js:318-324`) and Mongo treats `{permissions: "manage_tickets"}` as array-contains. The query works as-is. No code change needed beyond the cosmetic `PERMISSIONS.MANAGE_TICKETS` constant rename in §A.8.
10. **`createTicket` never sets `whitelabelId` from the host's *creator* whitelabel.** It uses `user.whitelabelId` directly — for hosts under a whitelabel admin, this should be the whitelabel admin's id, not the host's own field. Verify by creating a ticket as a whitelabel-tenant host and inspecting persisted `whitelabelId`.

---

## 7. Implementation Plan (Ordered)

Apply changes in this order. Each item ends with a checkbox the agent will tick during Phase 2.

### 7.A Backend
- [ ] **A.1 — REPLIES REMOVAL (§0a-2).** Delete:
  - `labbe-backend-/models/TicketModel.js` — `replies` array field.
  - `tickets.service.js` — `addReply` method, `_notifyUserTicketReply`, `_notifyAdminsTicketReply`, the `replies.user` populate at line 159, the replies branch in `_formatTicket` and the `includeReplies` parameter.
  - `tickets.controller.js` — `addReply` controller export.
  - `tickets.routes.js:343` — `POST /:id/replies` route + Swagger comments.
  - Mark `subject` as `required: true` on the Mongoose `TicketModel` schema (§0a-3).
- [ ] **A.2 — Zod schemas (§0a-1).** Create `labbe-backend-/src/modules/tickets/tickets.validation.js` with the **Zod** schemas from §2.6. **Joi is forbidden.**
- [ ] **A.3** Wire `validateZod(schema, source)` middleware (`src/shared/middleware/validation.js:401`) in `tickets.routes.js` for: POST `/` (createTicketSchema), PATCH `/:id` (updateTicketSchema), PATCH `/:id/status` (updateStatusSchema), PATCH `/:id/assign` (assignTicketSchema), PATCH `/:id/rate` (rateTicketSchema), GET `/` query (listTicketsQuerySchema). **No replies route.**
- [ ] **A.4** ~~Reply rate limiter~~ — n/a (§0a-2).
- [ ] **A.5** Switch `GET /export` from `requirePageAccess(TICKETS,'view')` to `'export'`.
- [ ] **A.6** Add Swagger block for `GET /tickets/export`. Fix Swagger response shape for `GET /tickets` (pagination is sibling, not child of data) and `GET /tickets/:id/rating-info` (flat shape, not `{ ticket }`). **No replies Swagger** (§0a-2).
- [ ] **A.7** Replace `.catch(console.error)` in `tickets.service.js:190, 193, 295, 318` with logger calls (line numbers shift after A.1; the two `addReply`-internal `console.error`s at 236, 238 vanish with the method).
- [ ] **A.8** Replace string literals `'manage_tickets'`/`'suspended'` in `getTicketAssignees` with `PERMISSIONS.MANAGE_TICKETS`/`USER_STATUS.SUSPENDED`.
- [ ] **A.9** Add `logAudit({ action: 'ticket.created', ... })` in `createTicket`.
- [ ] **A.10** Add `.lean()` to read paths in `getTickets` and `getTicketById`.
- [ ] **A.11** Comment hygiene: strip `FLOW-23-F01`, ~~`FLOW-23-F02`~~ (gone with the route), `TENANT-F02`, and re-statement comments listed in §2.7.
- [ ] ~~**A.12**~~ **DROPPED 2026-05-09 after audit.** The query already works (Mongo array-contains semantics). No change needed.

### 7.B Web
- [ ] **B.1** Fix data shape in two files (audit-corrected 2026-05-09):
  - `app/[lang]/admin-dash/tickets/_components/TicketsTable.jsx:105` — array path: read `data?.data` (not `data?.data?.tickets`).
  - `app/[lang]/admin-dash/tickets/_components/TicketTableContent.jsx:144-147` — pagination paths: read `data?.pagination?.pages` and `data?.pagination?.total` (not `data?.data?.pagination?.*`).
  (Unblocks the admin table.)
- [ ] **B.2** Fix data shape in `app/[lang]/admin-dash/tickets/_components/TicketStats.jsx:29-30`.
- [ ] **B.3** Fix `app/[lang]/admin-dash/tickets/[id]/_components/TicketDetailsContent.jsx:28` to read `data?.data?.ticket` only.
- [ ] **B.4** Drop the `|| ticket._id` fallback at `TicketDetailView.jsx:44` (audit-corrected 2026-05-09: only ONE occurrence, not 4 — lines 112/136/150/166 do not contain `_id`).
- [ ] **B.4b** **(NEW 2026-05-09 — prerequisite for B.5.)** Widen the canonical `useTicketMutation('updateStatus')` mutation in `hooks/reactQueryHooks/useTickets.js:153-165` to accept and forward `resolution`. Current `mutationFn` only sends `{ status }`; change it to `({ ticketId, status, resolution }) => apiRequest({ method: 'PATCH', path: API_PATHS.tickets.updateTicketStatus(ticketId), data: { status, ...(resolution !== undefined && { resolution }) } })`. Without this fix, B.5 silently drops the close-message.
- [ ] **B.5** Replace local `useMutation` in `_components/TicketResponsePopup.jsx:21-25` with `useTicketMutation('updateStatus')`. After B.4b lands, the popup can pass `{ ticketId, status: 'resolved', resolution }`.
- [ ] **B.6** Add `useTicketForRating(ticketId)` hook in `hooks/reactQueryHooks/useTickets.js` calling `API_PATHS.tickets.getTicketForRating(id)`. Migrate `app/[lang]/ticket-rating/[id]/page.js:28` to use it; delete the fallback chain at line 44.
- [ ] **B.7** Migrate `app/[lang]/vendor-dashboard/tickets/page.js` to canonical hooks (`useMyTickets`, `useTicketMutation('deleteTicket')`). Drop `useState`+`useEffect` server-data pattern. Replace hardcoded Arabic at line 107 with `t()`.
- [ ] **B.8** Add `API_PATHS.tickets.exportTickets = '/tickets/export'` only. ~~`addReply`~~ — n/a (§0a-2). Replace hardcoded `/tickets/export` in `services/adminDashboard.js:177`. **Also delete dead `ticketsAPI.bulkDelete` and `ticketsAPI.bulkResolve` methods** (`services/adminDashboard.js:149-173`) — audit confirmed 2026-05-09 they hit non-existent backend routes (no `/tickets/bulk-delete` / `/tickets/bulk-resolve` exist) AND have zero web callers. Mobile bulk hooks (`useBulkDeleteTickets` / `useBulkResolveTickets` in `useAdminMutations.js:481, 497`) loop-call individual endpoints and continue to work — leave them alone. **Then move `export` into a new `useExportTickets` hook in `useTickets.js` and delete the entire `ticketsAPI` object** (after migrating its sole survivor consumer at `TicketsTable.jsx:90` and `MakeTicketPopup.js:56` per B.17).
- [ ] **B.9 (§0a-8)** Confirm zero callers via grep across `labbe/`, then delete dead `app/[lang]/admin-dash/tickets/_components/useTicketsTableData.js` (205 lines). Report grep evidence in PR.
- [ ] ~~**B.10**~~ **DROPPED 2026-05-09 after audit.** `SearchBar.jsx` is NOT dead — it is imported and rendered by `app/[lang]/host/tickets/_components/TicketsHeader.jsx:8, 41`. Keep it.
- [ ] **B.11 (§0a-8)** Confirm zero consumers via grep, then delete `useAllTickets` (`hooks/reactQueryHooks/useTickets.js:71-83`). Report grep evidence in PR.
- [ ] **B.12** Migrate `services/tickets.js` enum exports (`TICKET_TYPES`, `TICKET_STATUS`, `TICKET_PRIORITY`) to `utils/constants/ticketConstants.js`. Update `app/[lang]/ticket-rating/[id]/page.js:15` import. Delete `services/tickets.js` after `vendor-dashboard/tickets/page.js` migration (B.7).
- [ ] **B.13** Replace inline `style={{ background, color }}` in `app/[lang]/host/tickets/_components/TicketCard.jsx:149-154` with CSS module modifier classes (same hex values, same visual output — preserve styles).
- [ ] **B.14** Strip Arabic literal fallbacks from `TicketCard.jsx:158, 167, 173` (`t("createdAt") || "تم الإنشاء:"`, etc.); confirm locale keys exist or add to §8.
- [ ] **B.15** Fix host page error branch (`app/[lang]/host/tickets/page.js:127-135`) to render an inline error UI instead of `<ErrorBoundary>` as a query-error fallback.
- [ ] **B.16** **(NEW 2026-05-09)** Reconcile `labbe/utils/schemas/ticketSchema.js` with the backend Zod from §A.2:
  - Drop `"pending"` from the `TICKET_STATUS` enum (backend does NOT have a `pending` status).
  - Add `subject: z.string().trim().min(1).max(200)` as a required field on `createTicketSchema` (matches backend §0a-3).
  - Verify all consumers (`MakeTicketPopup.js`, ticket-rating page, etc.) still validate cleanly.
- [ ] **B.17** **(NEW 2026-05-09 — required for §0a-3 admin-create flow.)** Migrate `ui/admin/dashboard/makeTicketPopup/MakeTicketPopup.js`:
  - Add a `subject` input (between type and priority) using the existing input components.
  - Update RHF `defaultValues` (`MakeTicketPopup.js:36-44`) to include `subject: ""`.
  - Include `subject` in the POST body.
  - Migrate from `ticketsAPI.createTicket` (line 56) to `useTicketMutation('createTicket')` (canonical).
  - Without this fix, after A.1 marks `subject: required` on the Mongoose schema, the admin web ticket-creation flow returns 400.
- [ ] **B.18** Comment hygiene pass: drop optimistic-update annotations that don't add value, no FLOW markers found.

### 7.C Mobile
- [ ] **C.1** Fix `screens/admin/admin-dashboard/AdminTicketsScreen.js:47-49` (audit-corrected 2026-05-09; was 48-51) filter so `status: 'all'` is omitted before sending. (Unblocks admin "All" tab.)
- [ ] **C.2** Drop dead branches `tk.subject || tk.title`, `tk.message || tk.description`, `tk.submittedBy || tk.user` in `AdminTicketsScreen.js:71-87`, `TicketDetailsScreen.js:68-74`, **and `TicketListItem.js:53-55`** (audit-confirmed 2026-05-09 — same pattern lives there too).
- [ ] **C.3** Drop the `data?.data?.data || data?.data || []` fallback in `screens/common/TicketsScreen.js:42` (audit-corrected 2026-05-09; was 43). Read `response?.data` only.
- [ ] **C.4** Move ticket mutations (`createTicket`, `updateTicket`, `deleteTicket`, `rateTicket`) from `hooks/mutations/useTicketMutations.js` into `services/ticketsService.js` as named exports. Hooks become `useMutation({ mutationFn: createTicketAPI, ... })` thin wrappers.
- [ ] **C.5 (§0a-6)** Add `assignTicketAPI`, `updateTicketStatusAPI`, `getTicketForRatingAPI`, `exportTicketsAPI` to `services/ticketsService.js` (moves the admin-only operations out of `services/adminDashboardService.js`). The actual ticket block in `adminDashboardService.js` is at **lines 203-229** (audit-corrected 2026-05-09; was 220-246) and the hardcoded `/tickets/export` literal is at **line 228** (was 245). ~~`addReplyAPI`~~ — n/a (§0a-2). **Keep the shim** in `services/adminDashboardService.js` as a re-export during migration. After C.5 lands and is verified, decide whether the shim can be dropped — per the user's "no backward-compat" rule it SHOULD be dropped in this same PR; only retain if other modules' adminDashboardService consumers force it.
- [ ] **C.6** Add `EXPORT`, `ASSIGN(id)`, `STATUS(id)` keys to `ENDPOINTS.TICKETS` in `config/api.js`. ~~`REPLIES(id)`~~ — n/a (§0a-2). Replace hardcoded `/tickets/export` literal in `services/adminDashboardService.js:245` (or move the function entirely per C.5).
- [ ] **C.7** Drop `_legacyToken` parameter from `services/ticketsService.js:19, 25` and update both callers in `hooks/queries/useTickets.js:14, 31`.
- [ ] **C.8** Consolidate `useDeleteTicket` (common) and `useDeleteAdminTicket` (admin) so both invalidate `['tickets']` (broader prefix that covers both `['tickets', filters]` and `['admin','tickets','infinite', filters]`).
- [ ] **C.9** Comment hygiene: strip `Phase 4 W0-AUTH`, `Phase 4 W3-PAGE`, `Phase 4 review fix —`, `master plan D5` markers from `services/ticketsService.js`, `hooks/mutations/useTicketMutations.js`, `hooks/queries/useAdminInfinite.js`, `screens/admin/admin-dashboard/AdminTicketsScreen.js`. Keep substantive comments (the `_normalizePage` shape doc) but drop the marker prefix.
- [ ] **C.10** Replace `toast.error(error.message)` with translated `t("messages.loadError")` in `screens/common/TicketsScreen.js:62-66`.
- [ ] **C.12** **(NEW 2026-05-09 — required for web/mobile parity per user rule.)** Mobile `AssignTicketModal.js:22, 46` currently uses `useAdminModerators` (different endpoint). Web uses `useTicketAssignees` against `/tickets/assignees` which already includes admins + moderators with `manage_tickets`. Add a `useTicketAssignees` hook in `halla-mobile/hooks/queries/useTickets.js` (a new file — `queries/useTickets.js` does not currently exist; create it) and migrate `AssignTicketModal` to use it. Backend endpoint #1 (`GET /tickets/assignees`) is the source of truth for both platforms.
- [ ] **C.13** Mobile `_normalizePage` simplification (`hooks/queries/useAdminInfinite.js`): currently supports both `inner.tickets` and `inner.data`. Backend only returns `data` array (top-level array per `sendPaginated`). After §B.1 fixes web, simplify mobile's `_normalizePage` to read `outer.data` only — drop the `inner.tickets` and `inner.data` branches.
- [ ] **C.14** Update ticket-rating page (web `app/[lang]/ticket-rating/[id]/page.js` after §B.6) to read the FLAT shape returned by `/rating-info`: `currentRating.rating` (not `ticket.userRating.rating`), top-level `status`, `canRate`, `hasRated` flags, and `subject`. Audit confirmed 2026-05-09 the §B.6 hook swap alone is insufficient — the page reads the heavy `useTicket` shape today.
- [ ] **C.11 (§0a-3)** Add a `subject` input to `screens/vendor/VendorTicketsScreen.js` create form and include `subject` in the POST body (`VendorTicketsScreen.js:38, 60, 88, 91`). Backend Zod and Mongoose mark subject required.

### 7.D Cross-platform alignment (do AFTER A/B/C)
- [ ] **D.1** Re-grep both `labbe/` and `halla-mobile/` for the strings `data?.data?.tickets`, `data.tickets`, `_id || ticket.id` to confirm no fallback chains remain in module surface.
- [ ] **D.2** Verify both web and mobile call `GET /tickets` with the same query-param keys (`status`, `priority`, `search`, `from`, `to`, `page`, `limit` — no `state`, no `category`, no `submittedBy`).
- [ ] **D.3** Confirm `POST /tickets` body from both clients: `{ subject?, type, message, priority? }` only.
- [ ] **D.4** Manual smoke check: (a) admin tickets table loads with rows; (b) admin "All" filter returns rows; (c) creating a ticket from host web/mobile/vendor mobile all succeed (with `subject` required); (d) admin can resolve a ticket via `PATCH /:id/status` with a `resolution` close-message and the message persists/displays correctly (§0a-2).

---

## 8. Locale-key additions required

(Listed for the user — agent does NOT modify locale JSON without explicit approval.)

Existing keys that should already cover the strings in §3.3, but verify:

- `tickets:createdAt` (en: "Created:", ar: "تم الإنشاء:")
- `tickets:actions.delete` (en: "Delete", ar: "حذف")
- `tickets:actions.edit` (en: "Edit", ar: "تعديل")
- `tickets:search.noResults` (en: "No results found", ar: "لا توجد نتائج")

Possibly missing (add if absent in `localization/locales/{en,ar}/tickets.json`):

- `tickets:messages.loadError` (already used by `TicketsScreen.js`; verify present in mobile json)
- `adminTickets:errors.loadFailed` (already used; verify present)

---

## 9. Rollback plan

For each implementation item, the rollback is a `git revert` of its commit. The replies-schema change (A.1) requires no data migration because the existing `replies` rows are empty (only `_id`/`createdAt`); rolling back leaves residual junk rows but not corruption.

---

## 10. Acceptance checklist (run after Phase 2)

- [ ] No file in module exceeds the cap.
- [ ] All endpoints have current Swagger.
- [ ] No duplicate endpoints remain (in module or shadowed by legacy frontend services).
- [ ] Web + Mobile call the same paths with the same shapes for every endpoint.
- [ ] No fallback chains in data mapping in this module's surface area.
- [ ] No `// FLOW-…` / `// PHASE-…` / `// BUG-…` / `// W0-…` / `// W3-…` comments in module's surface area.
- [ ] `npm run lint` clean (or no new warnings introduced).
- [ ] Visual smoke test: every page/screen looks identical before/after the refactor.
- [ ] No references to `replies` / `addReply` / `POST /:id/replies` remain anywhere in the codebase (§0a-2). Grep `labbe/`, `halla-mobile/`, `labbe-backend-/` to verify.
- [ ] All validation schemas are Zod (no `require('joi')` in the tickets module — §0a-1).
- [ ] `subject` is required on create from web AND mobile vendor flow (§0a-3).
- [ ] Admin can resolve a ticket and the close-message (`resolution` → `resolutionResponse.message`) persists and renders for admins.
- [ ] Admin tickets table renders rows when tickets exist.
- [ ] Admin mobile "All" filter renders rows when tickets exist.
- [ ] Admin web `MakeTicketPopup` form has a `subject` input and submits successfully (B.17).
- [ ] Mobile `AssignTicketModal` lists assignees from `/tickets/assignees` (not `/admin/moderators`) — same source as web (C.12).
- [ ] No stale Joi or wrong-path references to `shared/middlewares/validation.js:373` remain — every Zod wiring uses `src/shared/middleware/validation.js:401`.

---

## 11. Pre-flight checks for the implementing agent (added 2026-05-09)

Before starting, the agent MUST:

1. **Confirm fact base is current.** Re-grep these claims and STOP if any has changed since 2026-05-09:
   - `SearchBar.jsx` IS used by `TicketsHeader.jsx:8, 41` (do NOT delete it; §B.10 was dropped).
   - `MakeTicketPopup.js:56` calls `ticketsAPI.createTicket` (B.17 must migrate this caller).
   - `TicketDetailView.jsx:44` is the ONLY line with `|| ticket._id` fallback.
   - Pagination shape bug lives in `TicketTableContent.jsx:144-147` (NOT `TicketsTable.jsx:146-147`).
   - `User.permissions` is `[String]` (do NOT change the `getTicketAssignees` Mongo query — it works).

2. **Sequence rule:** B.4b (widen canonical `updateStatus` mutation to forward `resolution`) MUST land BEFORE B.5 (swap `TicketResponsePopup` to use the canonical hook). Otherwise the close-message is silently dropped.

3. **Validation middleware path:** Always reference `src/shared/middleware/validation.js:401` (singular `middleware`, line 401) — NOT `shared/middlewares/validation.js:373`.

4. **Required-subject coordination:** A.1 (mark `subject: required` on Mongoose) breaks the admin web ticket-create flow unless B.17 + B.16 land in the same PR. Do not split into separate PRs.

5. **Acceptance after the PR:** No `replies` references anywhere (`grep -rn 'replies' labbe/ halla-mobile/ labbe-backend-/src/modules/tickets/` returns zero matches). No `ticketsAPI` object on web (only the canonical hooks). Subject input present in BOTH `MakeTicketPopup` (admin) and `SendTicketPopup` (host) on web AND in `VendorTicketsScreen` create form on mobile. Web and mobile both consume `/tickets/assignees` for the assignee dropdown.

6. **Web/mobile parity assertion:** After this PR, both platforms (a) use a canonical React Query hook for tickets, (b) post `{ subject, type, message, priority? }` to `POST /tickets`, (c) read `data.data` for the array and `data.pagination.*` for pagination on `GET /tickets`, (d) use `/tickets/assignees` for the assignee list, (e) call `PATCH /tickets/:id/status` with `{ status, resolution? }` for resolve.
