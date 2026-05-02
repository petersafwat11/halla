# 23 — Tickets Lifecycle

## One-paragraph description
Support ticket full lifecycle: any authenticated user (host, vendor, guest, admin) can create a support ticket → system notifies admins and the ticket creator → admin reviews ticket and can assign it to a moderator/admin for handling → assigned moderator/admin works on the ticket through status transitions (open → in_progress → waiting_response → resolved → closed) → after resolution or closure, the ticket creator can submit a rating (1-5 stars with optional feedback) → admins can export all tickets to Excel. Mobile admin has full access to ticket management BUT cannot assign tickets to other admins (missing feature). Web admin can assign tickets via the `/tickets/{id}/assign` endpoint.

## Scope tags
- support ticket lifecycle, CRUD, assignment
- status workflows, ticket replies/conversation
- user rating system, ticket export
- admin moderator workflows
- **Gap**: Mobile admin ticket assignment missing

## Roles involved
- **Host**: create ticket, view own tickets, update own ticket (subject/message) before closure, delete own ticket, rate ticket after resolution
- **Vendor**: same as host
- **Guest**: create ticket, view own tickets (implied by user model), rate ticket
- **Admin / Super Admin**: view all tickets, assign to moderator, update ticket status & priority, add resolution, export
- **Moderator**: view assigned tickets, update status, add resolution, reply to tickets
- **Whitelabel Admin**: view whitelabel tenant's tickets only

## Entry points (cite file:line)
- **Create ticket**: `labbe-backend-/src/modules/tickets/tickets.routes.js:113-116` POST `/tickets` → `tickets.controller.createTicket:62`
- **Get tickets**: `tickets.routes.js:114` GET `/tickets` → `tickets.controller.getTickets:31`
- **Get single ticket**: `tickets.routes.js:197` GET `/tickets/{id}` → `tickets.controller.getTicketById:49`
- **Assign ticket**: `tickets.routes.js:233-238` PATCH `/tickets/{id}/assign` → `tickets.controller.assignTicket:86`
- **Update status**: `tickets.routes.js:274-279` PATCH `/tickets/{id}/status` → `tickets.controller.updateStatus:71`
- **Rate ticket**: `tickets.routes.js:315` PATCH `/tickets/{id}/rate` → `tickets.controller.rateTicket:119`
- **Export tickets**: `tickets.routes.js:189-193` GET `/tickets/export` → `tickets.controller.exportTickets:146`
- **Mobile**: `halla-mobile/screens/TicketsScreen.js:28` (user/vendor tickets), `halla-mobile/screens/VendorTicketsScreen.js:13` (vendor/host tickets)

## Exit / terminal states
- **Ticket resolved**: status = `resolved`, `resolvedAt` timestamp set, optional `resolutionResponse` with message/resolver info
- **Ticket closed**: status = `closed`, `closedAt` timestamp set; user can rate before or after closure
- **Ticket deleted**: physically removed from DB (owner or admin only)
- **Export**: data serialized to Excel buffer, downloaded as `.xlsx`

## Touched modules (file paths by repo)
### labbe-backend-
- `src/modules/tickets/tickets.routes.js` — all endpoints (CRUD, assign, status, rate, export)
- `src/modules/tickets/tickets.controller.js` — HTTP handling, delegates to service
- `src/modules/tickets/tickets.service.js` — business logic, notifications, formatting
- `models/TicketModel.js` — schema: status, subject, message, type, user, assignedTo, priority, source, replies, userRating, resolution response, whitelabelId, timestamps
- `src/modules/notifications/notifications.service.js` — called for ticket creation, reply, status change, assignment notifications
- `src/shared/utils/excelExport.js` — Excel generation for export endpoint

### halla-mobile
- `screens/TicketsScreen.js` — user/host ticket list, create, edit, delete, rate; FAB for new ticket; no admin assignment UI
- `screens/VendorTicketsScreen.js` — vendor/host ticket list, same as TicketsScreen, vendor workflow
- `services/ticketsService.js` — API calls: `getTicketsAPI()`, `getTicketAPI()` (read-only; mutation hooks missing)
- `hooks/` — `useTickets` (fetch), `useCreateTicket`, `useUpdateTicket`, `useDeleteTicket` (implied by TicketsScreen usage)
- `components/tickets/` — `TicketCard`, `TicketModal`, `TicketRatingModal` (render and form components)

### labbe (web)
- `app/[lang]/admin-dash/tickets/` — admin tickets list page (built; exact path inferred from Next.js build output)
- `app/[lang]/admin-dash/tickets/[id]/` — ticket detail page with assignment UI
- Export button in admin tickets page (built into Next.js chunks)

## Dependencies on other flows
- **Notifications** (Flow 27): ticket creation → admins notified; status change → user notified; assignment → assigned admin notified
- **User / Authentication** (implicit): tickets require authenticated user context; roles determine CRUD access
- **Whitelabel** (multi-tenant): tickets filtered by `whitelabelId` for whitelabel admins

## Known divergences (web ↔ mobile, frontend ↔ backend)
- **Mobile admin ticket assignment: MISSING** — Backend route `/tickets/{id}/assign` exists and enforces `requirePageAccess(ADMIN_PAGES.TICKETS, 'update')` (backend-ready), but mobile has NO UI to list assignees or call this endpoint. Web admin has full assignment UI.
- **Mobile export: MISSING** — Backend `/tickets/export` exists (Excel generation), but mobile has no export button or feature. Web admin has export.
- **Ticket replies / conversation**: Backend model has `replies` array (content, author, authorRole, createdAt); no evidence of reply UI in mobile or web screens in scope (may be in detail view).
- **Ticket source field**: Backend automatically infers source from user role (WHITELABEL, ADMIN, HOST, VENDOR, GUEST, OTHER); frontend does not control it.
- **Status workflow**: Backend allows direct status transitions without enforcing strict state machine (service allows any `TICKET_STATUS` value); frontend should validate logical transitions (open → in_progress → resolved → closed).

## Open questions

**Q1 — Mobile admin ticket assignment: is this a priority gap?**
- Type: C | Bucket: 6 (product decision — Peter confirmed: add it to mobile)
- Decision: YES — add ticket assignment UI to mobile admin screens
- Backend is ready: `PATCH /tickets/{id}/assign` with `requirePageAccess(ADMIN_PAGES.TICKETS, 'update')` exists and works
- Web reference: `labbe/app/[lang]/admin-dash/tickets/_components/AssignTicketPopup.jsx` — fetches assignees from `GET /tickets/assignees`, submits PATCH with `{ assigneeId }`
- Mobile must implement: (1) `getAssigneesAPI()` call in `halla-mobile/services/ticketsService.js`, (2) assign popup/sheet on the ticket detail screen, (3) display assigned admin name on ticket card/detail
- Mobile currently: `ticketsService.js` only has `getTicketsAPI()` and `getTicketAPI()` — no mutation calls at all
- Sources: `labbe-backend-/src/modules/tickets/tickets.routes.js:233-238`, `labbe/app/[lang]/admin-dash/tickets/_components/AssignTicketPopup.jsx`, `halla-mobile/services/ticketsService.js`

**Q2 — Mobile export: should tickets export be added to mobile admin dashboard?**
- Type: C | Bucket: 6 (product decision — Peter confirmed: add to all pages on mobile just like web)
- Decision: YES — export button must be added to every admin table in mobile, including tickets
- Backend is ready: `GET /tickets/export` with optional filters (search, status, priority, date range) returns Excel buffer
- Web reference: `labbe/app/[lang]/admin-dash/tickets/_components/TicketsTable.jsx` — "Export" button calls `ticketsAPI.export()` with current filters, triggers file download
- Mobile must implement: (1) `exportTicketsAPI()` in `halla-mobile/services/ticketsService.js`, (2) export button in the admin tickets list screen, (3) handle file download / share sheet on mobile
- Gate-1 mobile-web parity rule applies: every feature present in web admin must be present in mobile admin
- Sources: `labbe-backend-/src/modules/tickets/tickets.routes.js:189-193`, `labbe/app/[lang]/admin-dash/tickets/_components/TicketsTable.jsx`

**Q3 — Ticket replies/messaging: is there a separate replies API?**
- Type: A | Bucket: 1 (confirmed — no replies flow, and dead code found)
- Peter confirmed: no conversation/reply flow exists. Workflow is: receive ticket → assign to customer service agent → agent contacts user directly on WhatsApp
- Code finding: `tickets.service.js` has a fully implemented `addReply()` method (lines 190-222) that pushes to `ticket.replies[]` and auto-transitions status to IN_PROGRESS on admin reply — but **no route exposes this method**. It is dead code.
- `TicketModel.js` `replies` array (content, author, authorRole, createdAt) exists in the schema but is unreachable via any API endpoint
- ACTION REQUIRED: Either (a) remove the `addReply` method and `replies` schema field to avoid confusion, or (b) decide to implement the reply flow properly with a route and frontend UI. Currently it creates a false expectation of functionality.
- Sources: `labbe-backend-/src/modules/tickets/tickets.service.js:190-222` (addReply — no route), `labbe-backend-/src/modules/tickets/tickets.routes.js` (no /reply route), `labbe-backend-/models/TicketModel.js` (replies array)

**Q4 — Notification channels for ticket events: in-app only?**
- Type: A | Bucket: 1 (confirmed — in-app only)
- Peter confirmed: ticket notifications are in-app only (no email, no SMS, no push)
- Notification triggers: ticket creation → admin notified; status change → ticket owner notified; assignment → assigned admin notified
- Sources: `labbe-backend-/src/modules/notifications/notifications.service.js`

**Q5 — Status validation: should status transitions enforce a state machine?**
- Type: B | Bucket: 3 (BUG — Peter said yes, but backend has no state machine)
- Peter's intent: yes, enforce state machine — cannot jump from OPEN directly to CLOSED without going through RESOLVED
- What the code actually does: `tickets.service.js updateTicketStatus()` (lines 232-265) only validates `Object.values(TICKET_STATUS).includes(status)` — any-to-any transition is allowed (OPEN → CLOSED, RESOLVED → OPEN, etc.)
- Valid state machine: `OPEN → IN_PROGRESS → WAITING_RESPONSE → RESOLVED → CLOSED`; `assignTicket` auto-sets IN_PROGRESS which is correct
- ACTION REQUIRED: Add a transition guard in `updateTicketStatus()`:
  ```
  const VALID_TRANSITIONS = {
    OPEN: ['IN_PROGRESS'],
    IN_PROGRESS: ['WAITING_RESPONSE', 'RESOLVED'],
    WAITING_RESPONSE: ['IN_PROGRESS', 'RESOLVED'],
    RESOLVED: ['CLOSED'],
    CLOSED: []  // terminal
  };
  ```
  Throw a 400 if the requested transition is not in the allowed list for the current status. The `assignTicket` auto-transition to IN_PROGRESS is already correct behavior.
- Sources: `labbe-backend-/src/modules/tickets/tickets.service.js:232-265`, `labbe-backend-/models/TicketModel.js` (TICKET_STATUS enum)

**Q6 — Bulk ticket operations: planned for web or mobile?**
- Type: A | Bucket: 1 (confirmed by reading web code — no bulk ops exist anywhere)
- Peter said "mobile should be identical to web, check web as reference"
- Code finding: `labbe/app/[lang]/admin-dash/tickets/_components/TicketsTable.jsx` has individual row-level actions only (assign, mark urgent, resolve, delete via dropdown) — **no bulk select, no bulk assign, no bulk status change exists on web either**
- Conclusion: bulk operations are out of scope for both web and mobile. Mobile parity = mobile should have the same individual row actions that web has, not bulk operations that do not exist.
- No action required for bulk ops. Action required: ensure mobile admin ticket list has the same individual row actions as web (assign, status update, export)
- Sources: `labbe/app/[lang]/admin-dash/tickets/_components/TicketsTable.jsx`

## Notes from answer pass
- **BUG (Q5)**: Backend `updateTicketStatus` has no state machine — any-to-any status jump allowed. Must add transition guard before production. See proposed `VALID_TRANSITIONS` map above.
- **Dead code (Q3)**: `addReply()` in `tickets.service.js` is implemented but has no route. `replies[]` in `TicketModel` is unreachable. Remove or expose — do not leave in limbo.
- **Mobile gaps to close (Q1, Q2)**: Mobile admin tickets needs: (a) assignment UI + `getAssigneesAPI` + `assignTicketAPI`, (b) export button + `exportTicketsAPI`. Both backend endpoints exist and are ready.
- **No bulk ops on either platform (Q6)**: Web has individual row actions only. Mobile parity means implementing the same individual actions, not bulk operations.

---

## State machine

```
Ticket entity:
  (none)        → POST /tickets              → OPEN
  OPEN          → PATCH /tickets/:id/assign  → IN_PROGRESS   (auto-set by assignTicket())
  OPEN          → PATCH /tickets/:id/status  → IN_PROGRESS   ← MISSING: no guard; any-to-any allowed
  IN_PROGRESS   → PATCH /tickets/:id/status  → WAITING_RESPONSE
  IN_PROGRESS   → PATCH /tickets/:id/status  → RESOLVED
  WAITING_RESPONSE → PATCH /tickets/:id/status → IN_PROGRESS
  WAITING_RESPONSE → PATCH /tickets/:id/status → RESOLVED
  RESOLVED      → PATCH /tickets/:id/status  → CLOSED
  RESOLVED      → PATCH /tickets/:id/rate    → (rating written; status unchanged)
  CLOSED        → (terminal; no allowed outbound transitions)
  any           → DELETE /tickets/:id        → (deleted from DB)
```
MISSING: `updateTicketStatus()` at `tickets.service.js:232` only validates the target value is in the TICKET_STATUS enum. No transition guard exists — any status→any status is accepted.

---

## Data handoffs

| Step | Producer | Consumer | Payload | Validation? |
|------|----------|----------|---------|-------------|
| Create ticket | Client | POST /tickets | `{ subject, message, type, source? }` | type validated against TICKET_TYPE enum; source auto-inferred from role if absent |
| Ticket created | tickets.service.js | MongoDB TicketModel | userId, subject, message, type, source, status:'OPEN', whitelabelId, priority:'medium' | Mongoose schema validation |
| Notify admins | tickets.service.js | notifications.service.sendToAdmins() | `{ type:'ticket_created', data:{ ticketId, subject, userName } }` | None |
| Assign ticket | Client | PATCH /tickets/:id/assign | `{ assigneeId }` | requirePageAccess TICKETS update; assigneeId validated by findById |
| Status update | Client | PATCH /tickets/:id/status | `{ status }` | Value must be in TICKET_STATUS enum — no transition guard |
| Rate ticket | Client | PATCH /tickets/:id/rate | `{ rating (1-5), feedback? }` | rating validated 1-5; ticket must be RESOLVED or CLOSED |
| Export tickets | Client | GET /tickets/export | query: `{ search, status, priority, from, to }` | filters optional; whitelabelId from filterByWhitelabel |
| Export response | tickets.service.js | Client | xlsx buffer with Content-Disposition header | Row cap: none (see FLOW-28-F02) |

---

## Role variations

| Role | CAN | CANNOT |
|------|-----|--------|
| HOST | Create, view own, update own (before close), delete own, rate after resolution | Assign, update status, view other users' tickets |
| VENDOR | Same as HOST | Same as HOST |
| GUEST | Create, view own, rate after resolution | Assign, update status, view others |
| ADMIN / SUPER_ADMIN | View all, assign, update status/priority, export, delete any | — |
| MODERATOR | View assigned tickets, update status, add resolution | Assign to others (requires update page access) |
| WHITELABEL_ADMIN | View whitelabel tenant tickets, assign within tenant | View cross-tenant tickets, export across tenants |

---

## Web ↔ mobile parity

| Feature | Web | Mobile | Gap? |
|---------|-----|--------|------|
| List own tickets (host/vendor) | Confirmed present (`app/[lang]/host-dash/tickets/`) | Confirmed present (`TicketsScreen.js`) | No |
| Create ticket | Confirmed present (form on web) | Confirmed present (FAB → TicketModal) | No |
| View ticket detail | Confirmed present (web detail page) | Confirmed present (TicketCard opens detail) | No |
| Rate ticket after resolution | Confirmed present (web) | Confirmed present (`TicketRatingModal`) | No |
| Admin: assign ticket to moderator | Confirmed present (`AssignTicketPopup.jsx` calls `GET /tickets/assignees` + `PATCH /tickets/:id/assign`) | **Missing** — no assignee fetch, no assign UI, no `assignTicketAPI` in `ticketsService.js` | **Yes — mobile gap** |
| Admin: update ticket status | Confirmed present (web dropdown) | Confirmed present (`updateTicketStatusAPI` in service) | No |
| Admin: export tickets | Confirmed present (Export button in `TicketsTable.jsx`) | **Missing** — `ExportButton` component exists but no `exportTicketsAPI` wired in any admin screen | **Yes — mobile gap** |
| Admin: view all tickets | Confirmed present (`admin-dash/tickets/`) | Confirmed present (admin tickets list screen) | No |

---

## Edge cases & failure modes

- **Any-to-any status transition**: `updateTicketStatus()` accepts OPEN→CLOSED directly; admin can close without resolution, losing resolution context and skipping host notification.
- **Assign to self**: `assignTicket()` has no guard against assigning a ticket to the assigning admin's own `_id`. Self-assignment succeeds silently.
- **Delete own ticket mid-investigation**: Owner can `DELETE /tickets/:id` while ticket is IN_PROGRESS or WAITING_RESPONSE. The assigned moderator loses the ticket with no notification.
- **Rating on non-terminal ticket**: `rateTicket()` correctly blocks on OPEN/IN_PROGRESS — only RESOLVED or CLOSED allowed. If a moderator sets RESOLVED without a resolution message, the field is optional and the ticket can be rated with no resolution text.
- **Export with no filters = full tenant dataset**: `GET /tickets/export` with no query params fetches all tickets. No row cap exists (see FLOW-28-F02); large tenants risk OOM/timeout.
- **addReply() dead code**: `tickets.service.js:190-222` implements full reply logic with no route. `replies[]` schema field is populated in the model but never written via any live API.

---

## Findings

### FLOW-23-F01 — updateTicketStatus() accepts any-to-any transition; no state machine enforced
- **Severity**: High
- **Type**: BUG
- **Location**: `labbe-backend-/src/modules/tickets/tickets.service.js:232-265`
- **Description**: `updateTicketStatus()` validates only that the requested value is in the `TICKET_STATUS` enum. No transition guard exists. A caller can jump from `OPEN` directly to `CLOSED`, skip `RESOLVED`, or reopen a `CLOSED` ticket.
- **Why it matters**: Bypassing intermediate states removes resolution context and skips notification triggers tied to transitions. Admin can close a ticket without recording any resolution response.
- **Recommended change**: Add `VALID_TRANSITIONS` map: `OPEN→[IN_PROGRESS]`, `IN_PROGRESS→[WAITING_RESPONSE,RESOLVED]`, `WAITING_RESPONSE→[IN_PROGRESS,RESOLVED]`, `RESOLVED→[CLOSED]`, `CLOSED→[]`. Throw 400 if the requested transition is not in the allowed list. `assignTicket()` auto-transition to IN_PROGRESS is already correct behavior.

### FLOW-23-F02 — addReply() implemented but has no route; replies[] schema field is unreachable
- **Severity**: Medium
- **Type**: MISSING
- **Location**: `labbe-backend-/src/modules/tickets/tickets.service.js:190-222`, `labbe-backend-/models/TicketModel.js` (replies array)
- **Description**: `addReply()` pushes to `ticket.replies[]`, auto-transitions status, and notifies the ticket owner. No route in `tickets.routes.js` exposes it. The `replies` array in `TicketModel` is unreachable via any API endpoint.
- **Why it matters**: Dead code implies planned functionality, creates false expectations, and bloats every ticket document with an empty array. Future developers may build against it incompletely.
- **Recommended change**: Either (a) remove `addReply()` and the `replies` field from `TicketModel`, or (b) wire to `POST /tickets/:id/reply` with frontend UI. Do not leave in limbo.

### FLOW-23-F03 — Mobile admin missing ticket assignment UI; backend ready but frontend absent
- **Severity**: High
- **Type**: MISSING (parity gap, Gate-1 #4)
- **Location**: `halla-mobile/services/ticketsService.js` (no assignTicketAPI), `halla-mobile/screens/` (no assign UI)
- **Description**: Backend `PATCH /tickets/:id/assign` exists with full auth. Web has `AssignTicketPopup.jsx` calling `GET /tickets/assignees` and the assign endpoint. Mobile has neither `getAssigneesAPI` nor `assignTicketAPI` in `ticketsService.js`, and no assignment UI on any admin ticket screen.
- **Why it matters**: Gate-1 Decision #4 requires mobile parity. Ticket assignment is the primary moderation workflow; mobile admins cannot manage ticket queues.
- **Recommended change**: Add `getAssigneesAPI()` + `assignTicketAPI()` to `ticketsService.js`. Add assign sheet/modal on mobile ticket detail screen mirroring `AssignTicketPopup`. Display assigned admin name on ticket card.

### FLOW-23-F04 — Mobile admin ticket export not wired; ExportButton has no API call
- **Severity**: Medium
- **Type**: MISSING (parity gap, Gate-1 #4)
- **Location**: `halla-mobile/components/admin-dashboard/common/ExportButton.js` (no API call), admin ticket screens
- **Description**: Backend `GET /tickets/export` returns xlsx buffer. Web admin has a working Export button in `TicketsTable.jsx`. Mobile `ExportButton` component renders a styled button but no admin screen passes it an `onPress` handler that calls the export endpoint.
- **Why it matters**: Gate-1 #4 mobile parity. Export is present on web but absent on mobile admin.
- **Recommended change**: Add `exportTicketsAPI()` to `ticketsService.js`. Wire it as the `onPress` on `ExportButton` in the mobile admin tickets screen. Use `expo-file-system` + `expo-sharing` (both in `package.json`) to write the buffer and open the native share sheet.

---

## Cross-flow notes

- **Flow 27**: Every ticket event (create, status change, assignment) calls `notifications.service.sendToAdmins()` or `sendToUser()`. If FLOW-27-F01 (no idempotency key) is not fixed, any caller retry will produce duplicate notifications.
- **Flow 28**: `exportTickets()` uses `generateExcel()` with no row cap. Until FLOW-28-F02 is fixed, a large-tenant ticket export risks OOM/timeout.
- **Flow 24 (Vendor Onboarding)**: Vendor-submitted tickets follow the same lifecycle. The `source` field is auto-inferred from user role so no special routing is needed.
- **Flow 10 (Addon Purchase)**: Peter noted design template addon requests should follow a ticket-like lifecycle (pending → assigned → completed). Consider reusing TicketModel or defining a parallel `TemplateRequest` model backed by the same status machine.
