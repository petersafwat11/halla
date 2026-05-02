# 28 — Exports

## One-paragraph description
Admin and host users can export data to Excel/CSV for reporting and analysis: events export (with guest RSVP counts, status), guests export (contact info, RSVP status, check-in status), tickets export (subject, priority, status, assigned admin), hosts export (admin only; user info, subscription status, event count), vendors export (admin only; brand name, rating, status, service count). Web admin dashboard has export buttons in list views; mobile admin has ExportButton component UI but NO functional export implementation (missing feature). All exports are filtered by query parameters (date range, search, status filters), paginated in DB, then serialized to Excel via xlsx library.

## Scope tags
- event export, guest list export
- ticket export with admin assignment info
- host/user export (admin only)
- vendor export (admin only)
- payment export (admin only)
- Excel/CSV file generation
- query filtering, date ranges, search
- **Gap**: Mobile admin export endpoints not implemented

## Roles involved
- **Admin / Super Admin**: export all data types (events, guests, hosts, vendors, payments, tickets)
- **Host**: export own event guests (if implemented; unclear from code)
- **Moderator**: export assigned tickets (if implemented; unclear)
- **Whitelabel Admin**: export filtered to whitelabel tenant only

## Entry points (cite file:line)
- **Export events**: `labbe-backend-/src/modules/events/events.routes.js` (inferred; GET `/events/export?filters`)
- **Export guests**: `labbe-backend-/src/modules/guests/guests.routes.js` (inferred; GET `/guests/export?filters`)
- **Export tickets**: `labbe-backend-/src/modules/tickets/tickets.routes.js:189-193` GET `/tickets/export` → `tickets.controller.exportTickets:146`
- **Export hosts**: `labbe-backend-/src/modules/admin/admin.routes.js:195+` GET `/admin/hosts/export` → `admin.controller.exportHosts`
- **Export vendors**: `labbe-backend-/src/modules/admin/admin.routes.js:197+` GET `/admin/vendors/export` → `admin.controller.exportVendors`
- **Export moderators**: `labbe-backend-/src/modules/admin/admin.routes.js` GET `/admin/moderators/export` (inferred)
- **Export payments**: `labbe-backend-/src/modules/admin/admin.routes.js:199+` GET `/admin/payments/export` (inferred)
- **Export whitelabels**: `labbe-backend-/src/modules/admin/admin.routes.js:201+` GET `/admin/whitelabels/export` (inferred)
- **Export button (UI only)**: `halla-mobile/components/admin-dashboard/common/ExportButton.js` — React component, no API integration
- **Web export buttons**: `labbe/app/[lang]/admin-dash/` — export buttons in tables (Events, Guests, Hosts, Vendors, Tickets pages)

## Exit / terminal states
- **Export completed**: HTTP response with file buffer, headers set:
  - `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (for .xlsx)
  - `Content-Disposition: attachment; filename=<type>.xlsx`
- **File downloaded**: user receives .xlsx file in browser downloads folder

## Touched modules (file paths by repo)
### labbe-backend-
- `src/modules/tickets/tickets.routes.js:189-193` — GET `/tickets/export` route definition
- `src/modules/tickets/tickets.controller.js:146-153` — `exportTickets()` handler: accepts filters (search, status, priority, from, to), calls service, generates Excel buffer, sets headers, sends
- `src/modules/tickets/tickets.service.js:400-432` — `exportTickets()` service: builds query with filters, populates user/assignee info, returns formatted array (Subject, Type, User, Priority, Status, Assigned To, Created At)
- `src/modules/admin/admin.routes.js` — multiple export routes (hosts, vendors, moderators, payments, whitelabels) with `requirePageAccess(ADMIN_PAGES.<TYPE>, 'view')`
- `src/modules/admin/admin.controller.js` — `exportHosts()`, `exportVendors()`, `exportPayments()`, `exportWhitelabels()`, `exportModerators()` handlers (inferred; similar pattern to tickets)
- `src/modules/admin/admin.service.js` — export service methods (inferred; filtering, aggregation, formatting)
- `src/shared/utils/excelExport.js` — utility function `generateExcel(data, filename)`: converts array of objects to xlsx workbook, returns Buffer
- `models/TicketModel.js`, `models/UserModel.js`, `models/EventModel.js`, `models/GuestModel.js` — data sources
- Optional `src/modules/events/events.routes.js`, `src/modules/guests/guests.routes.js` — event/guest exports (inferred; not explicitly listed but likely follow same pattern)

### halla-mobile
- `components/admin-dashboard/common/ExportButton.js` — touchable button component with green styling, download icon, "Export" label, loading state spinner; **NO API call integration** (function stub only)
- Used in admin screens: presumably imported in event list, guest list, ticket list, host list, vendor list (inferred; not visible in ExportButton alone)
- Services: no integration written; would need `ticketsService.exportTickets()`, `hostsService.exportHosts()`, etc.

### labbe (web)
- `app/[lang]/admin-dash/events/page.js`, `...events/[id]/page.js` — export button in EventsTable, EventStats
- `app/[lang]/admin-dash/hosts/page.js` — export in host list table
- `app/[lang]/admin-dash/vendors/page.js` — export in vendor list table
- `app/[lang]/admin-dash/tickets/page.js` — export in ticket list
- Backend integrations: API calls to `/api/v2/<endpoint>/export` endpoints

## Dependencies on other flows
- **Tickets Lifecycle** (Flow 23): export accesses ticket data
- **Vendor Onboarding** (Flow 24): vendor list export
- **Admin pages** (multiple flows): export is feature within each admin screen

## Known divergences (web ↔ mobile, frontend ↔ backend)
- **Mobile export: COMPLETELY MISSING** — ExportButton UI component exists but has no onPress handler implementation; no API calls written; no mobile screens call export endpoints. **This is a major feature gap.**
- **Excel format only**: Backend only supports xlsx (Excel); no CSV fallback.
- **Column order**: Tickets export has fixed columns (Subject, Type, User, Priority, Status, Assigned To, Created At); other exports inferred to have similar structures but not verified.
- **Data filtering**: Backend filters via query params (status, priority, search, from, to); mobile/web UI must pass these correctly.
- **Performance**: Large data sets (10k+ records) may timeout or OOM; backend may need streaming/chunked export or queued job approach.
- **File download**: Browser-based (mobile web) vs. app download handler (mobile native app) — implementation differs.
- **Whitelabel isolation**: Export routes filter by whitelabelId; unclear if enforced on mobile.

## Open questions

**Q1: Mobile export implementation — is ExportButton just a placeholder?**

A:
**Current behavior:** `ExportButton` is a fully styled React Native component that accepts `onPress`, `loading`, `label`, and `style` props. It renders a download icon, a spinner when loading, and fires `onPress` when tapped. However it has **no built-in API call** — `onPress` is passed in by the parent screen. No admin screen in `halla-mobile` currently passes a working `onPress` handler that calls an export endpoint.

`halla-mobile/components/admin-dashboard/common/ExportButton.js:20-36`

**Assessment:** BUG (mobile parity gap, Gate 1 decision #4). The component is wired for use but no screen connects it to an API call.

**Recommended change:** Peter confirmed all admin tables/lists on both web and mobile should have a working export button. Each admin screen that renders a list must import `ExportButton`, call the appropriate backend export endpoint (e.g., `GET /api/v2/admin/hosts/export?<filters>`), receive the xlsx buffer, write it to disk via `expo-file-system`, and trigger sharing via `expo-sharing`. `expo-file-system` and `expo-sharing` are already in `halla-mobile/package.json`.

Source: `halla-mobile/components/admin-dashboard/common/ExportButton.js`, `halla-mobile/package.json:25-27`

---

**Q2: Are all backend exports fully implemented?**

A: [KEPT FROM PETER — VERIFIED]

All backend export functions exist and are correctly implemented:
- `exportTickets` — `tickets.controller.js:146`, `tickets.service.js:400`
- `exportHosts`, `exportVendors`, `exportModerators`, `exportEvents` — `admin.controller.js:532-569`
- `exportPayments` — `admin.controller.js:522`
- `exportWhitelabels` — `admin.controller.js:572`
- `exportGuests` — `guests.controller.js:103`

All follow the same pattern: build query with filters → fetch from MongoDB → map to flat object array → `generateExcel()` → stream buffer with xlsx content-type headers. Guest export is scoped to a specific event via `eventId` path param.

Source: `labbe-backend-/src/modules/admin/admin.controller.js:522-579`, `labbe-backend-/src/modules/guests/guests.controller.js:103-116`

---

**Q3: How are >10k record exports handled?**

A: [PETER DECISION — ENHANCED WITH REASONING]

**Current behavior:** `generateExcel()` loads the entire query result into memory, calls `xlsx.write()` synchronously, and streams the resulting buffer in the HTTP response. No pagination, no streaming, no queue.

`labbe-backend-/src/shared/utils/excelExport.js:9-22`

**The choice:** Keep synchronous in-process export vs. implement streaming (xlsx-stream) vs. offload to a background worker.

**Recommendation:** Background worker with polling — see Q4.

**Why:** For large tenants (10k+ rows), the current approach risks: (a) Node.js event loop blocking during `xlsx.write()`, (b) HTTP gateway timeout (typically 30–60 s), and (c) OOM if the dataset is in the MB range. Streaming xlsx is partial mitigation but doesn't fix gateway timeouts. A queue-based approach is the clean solution and aligns with Peter's stated intent in Q4.

**Trade-offs:** Worker approach requires BullMQ + Redis infrastructure that is not yet in the stack. For MVP with expected data volumes under 5k rows, the current synchronous approach is acceptable but should be time-limited before a large whitelabel tenant onboards.

---

**Q4: Should exports be queued background jobs?**

A: [PETER DECISION — ENHANCED WITH REASONING]

**Peter's decision:** Yes — queued background worker approach.

**Phased implementation (go with this):**

**Phase 1 — Not yet implemented (no new infrastructure required):**
Add a 10,000-row hard cap to `generateExcel()` in `labbe-backend-/src/shared/utils/excelExport.js`. If the export query would return more than `EXPORT_MAX_ROWS` (default 10,000, env-configurable), throw a `422` error instructing the admin to apply stricter date/status filters. This prevents OOM and HTTP timeout while BullMQ is not yet available. Set `EXPORT_MAX_ROWS=10000` in production env.

**Phase 2 — BullMQ + Redis (implement when scale requires it):**
1. Add `bullmq` + `ioredis` to `labbe-backend-/package.json`.
2. Create `src/jobs/exportQueue.js` with a BullMQ `Queue` and `Worker`. Worker runs `generateExcel()` and uploads result to S3, storing a signed download URL.
3. All export endpoints change from `GET` to `POST` returning `202 Accepted + { jobId }`.
4. Add `GET /api/v2/exports/:jobId/status` polling endpoint returning `{ status: queued|processing|done|failed, downloadUrl? }`.
5. `ExportButton` on web and mobile: shows spinner during polling, then triggers download when `status === done`.

**Why BullMQ over alternatives:** It's the de-facto standard for Node.js job queues, has built-in retry/failure handling, and Redis (required) also benefits stats caching and rate limiting. MongoDB-based schedulers (Agenda) are slower and less battle-tested for high-concurrency export jobs.

**Current status:** Phase 1 not implemented — `excelExport.js` has no row cap. Phase 2 requires Redis provisioning — plan with ops before starting.

Source: `labbe-backend-/src/shared/utils/excelExport.js` (no EXPORT_MAX_ROWS guard present), `labbe-backend-/package.json` (no bull/bullmq present yet)

---

**Q5: Should CSV be supported as an alternative to xlsx?**

A: [KEPT FROM PETER]

No. The current xlsx-only export is the decided format. No CSV fallback will be added.

Source: `labbe-backend-/src/shared/utils/excelExport.js`

---

**Q6: Can users customize which columns to export?**

A: [KEPT FROM PETER]

No. Column sets are preset per export type in each service method and are not configurable at runtime. Example: tickets export always emits `Subject, Type, User, Priority, Status, Assigned To, Created At`.

Source: `labbe-backend-/src/modules/tickets/tickets.service.js:423-431`

---

**Q7: Scheduled/recurring exports?**

A: [PETER DECISION — ENHANCED WITH REASONING]

**Peter's decision:** Not now. Planned for a future phase alongside scheduled notifications — exports will be generated on a schedule and emailed to the user as an attachment.

**Recommended future path:** When the notification/email scheduler is built (Flow 27), extend it to support `exportSchedule` documents: `{ userId, exportType, filters, cronExpression, emailTo }`. The scheduled tasks runner calls the appropriate service export method, passes the buffer to `emailService.send.invitationReport()` or a new `exportReportEmail`, and delivers the file. The `ExportQueue` from Q4 can be reused.

**Trade-offs:** Scheduling requires the user to configure a recurring export via UI (adds frontend scope). For now, on-demand is sufficient.

---

**Q8: Data privacy — encryption, watermarking, audit logging?**

A:
**Current behavior:** Exported files are generated in memory via `generateExcel()`, sent directly as a buffer HTTP response, and never persisted on the server. No encryption, no watermarking, no audit log of who exported what.

`labbe-backend-/src/shared/utils/excelExport.js:9-22`, `labbe-backend-/src/modules/admin/admin.controller.js:532-540`

**Assessment:** WEAK (Gate 1 decision #10 — audit log is coming; export actions must be included)

**Why:** An admin or whitelabel admin can download the full host list, vendor list, or payment history with no record of the action. This is a compliance gap for any region with data protection requirements (PDPL in Saudi Arabia). Audit logging of exports is explicitly flagged as a Gate 1 concern (#10).

**Recommended change:** Add an `AuditLog` write at the start of each export controller handler — e.g., `auditLog.record({ userId: req.user._id, action: 'EXPORT', resource: 'hosts', filters: req.query, ip: req.ip })`. This does not require the full audit system to be built first — even a simple `AuditEvent.create()` call suffices as a placeholder. Encryption and watermarking are lower priority and can remain deferred.

Source: `labbe-backend-/src/modules/admin/admin.controller.js:532-540`

---

**Q9: Mobile file handling — where is the file saved?**

A: [PETER DECISION — ENHANCED WITH REASONING]

**Peter's decision:** Downloaded file goes to the device download folder.

**Implementation note:** React Native requires `expo-file-system` to write files — both `expo-file-system` (`~19.0.21`) and `expo-sharing` (`~14.0.8`) are already present in `halla-mobile/package.json`. The implementation pattern should be:

```
const fileUri = FileSystem.documentDirectory + 'export.xlsx';
await FileSystem.downloadAsync(downloadUrl, fileUri);
await Sharing.shareAsync(fileUri);
```

`Sharing.shareAsync()` opens the native share sheet, which lets the user save to Files, send via WhatsApp, email, etc. On Android, `MediaLibrary` can additionally copy the file to the Downloads folder. Direct "save to Downloads" without the share sheet requires `expo-media-library` (not currently installed).

Source: `halla-mobile/package.json:25,49`

---

**Q10: Does export respect user data visibility (tenant scoping)?**

A:
**Current behavior:** All admin export routes pass through `filterByWhitelabel` middleware except one — `GET /admin/whitelabels/export` (line 845–848 in `admin.routes.js`) has **no `filterByWhitelabel` middleware**. However, `exportWhitelabels` in `admin.controller.js:572` does not call `getWhitelabelIdFromFilter(req)` at all and passes no whitelabelId to the service, which queries `{ role: ROLES.WHITELABEL_ADMIN }` globally with no tenant filter. This is safe because `ADMIN_PAGES.WHITELABELS` is `ACCESS_LEVELS.NONE` for all non-super_admin roles — the `requirePageAccess` middleware blocks all access for whitelabel_admin, moderator, and admin roles. Only `SUPER_ADMIN` can reach this endpoint.

All other export routes (`hosts`, `vendors`, `moderators`, `payments`, `events`) correctly include `filterByWhitelabel` and pass `whitelabelId` to the service layer.

Guest export (`guests.controller.js:103`) scopes by `eventId` + `req.user._id`, ensuring hosts only export their own events' guests.

**Assessment:** CORRECT — tenant scoping is enforced via page-access permissions for the whitelabels route and via `filterByWhitelabel` middleware for all other export routes.

Source: `labbe-backend-/src/modules/admin/admin.routes.js:845-848`, `labbe-backend-/src/shared/constants/permissions.js:100,115,130,145,159`

## Notes from answer pass

**Mobile export is the highest-priority gap in this flow.** `expo-file-system` and `expo-sharing` are already in the mobile dependencies. The blocker is purely service-layer code (calling the export endpoint, receiving the buffer/URL, writing to disk, and triggering the share sheet). This is a Gate 1 violation (#4 — mobile parity) that should be addressed before production.

**No queue infrastructure exists.** `labbe-backend-/package.json` has no `bull`, `bullmq`, or `agenda` entry. Peter's Q4 decision (queued export worker) requires adding Redis + BullMQ to the stack. This is an infrastructure dependency that should be planned with ops before the export queue is implemented.

**Audit log for exports (Gate 1 #10):** Every export controller handler currently fires with no record. When the audit log system is built, each export endpoint must write an audit event (`who`, `what resource`, `what filters`, `when`, `ip`). Recommend adding a TODO comment in each export controller function now as a placeholder.

**`exportWhitelabels` missing tenant filter is safe but fragile.** It relies entirely on `requirePageAccess` blocking non-super_admins. If page access configuration is ever relaxed for admin roles, the lack of a service-level whitelabelId filter would become a data leak. Recommend adding an explicit `if (whitelabelId !== undefined) query.whitelabelId = whitelabelId` guard in `adminService.exportWhitelabels()` as defense-in-depth.

---

## State machine

```
Export operation (stateless — no persistent entity):
  (admin clicks Export) → GET /api/v2/<resource>/export?filters → generates xlsx buffer in memory → HTTP 200 with attachment headers
  (client receives buffer) → browser triggers file download / mobile share sheet
  (error — OOM or timeout) → HTTP 500 or gateway timeout ← no row cap guard exists
```
No persistent export entity is created. Exports are synchronous in-process operations. A queued export model (Phase 2, Peter decision Q4) would add a persistent `ExportJob` entity, but this is not yet implemented.

---

## Data handoffs

| Step | Producer | Consumer | Payload | Validation? |
|------|----------|----------|---------|-------------|
| Request export | Admin (web or mobile) | GET /api/v2/<resource>/export | query: `{ search, status, priority, from, to, ... }` | requirePageAccess enforced; filterByWhitelabel applied |
| Query DB | export service method | MongoDB | filters → array of documents with populated relations | No row cap — full result set loaded |
| Generate xlsx | excelExport.generateExcel(data, filename) | xlsx library | array of flat objects → workbook buffer | No size limit |
| Send response | export controller | Client | Buffer with `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | No streaming; full buffer in one response |
| File write (mobile) | Client (mobile) | expo-file-system | buffer written to `FileSystem.documentDirectory` | expo-file-system + expo-sharing in package.json |
| Share sheet (mobile) | Client (mobile) | Sharing.shareAsync() | fileUri | Mobile only — no current implementation (ExportButton has no onPress handler) |

---

## Role variations

| Role | CAN | CANNOT |
|------|-----|--------|
| ADMIN / SUPER_ADMIN | Export all resource types (hosts, vendors, moderators, events, guests, tickets, payments, whitelabels) filtered by their tenant scope | Export whitelabels (SUPER_ADMIN only via requirePageAccess) |
| WHITELABEL_ADMIN | Export resources filtered to own whitelabelId (filterByWhitelabel applied) | Export cross-tenant data |
| MODERATOR | Export assigned tickets only (if page access allows) | Export hosts, vendors, payments |
| HOST | Export own event's guests via `GET /guests/export?eventId=...` | Export admin resources |
| VENDOR | Confirmed missing — no vendor-scoped export endpoint exists | — |

---

## Web ↔ mobile parity

| Feature | Web | Mobile | Gap? |
|---------|-----|--------|------|
| Export tickets | Confirmed present (Export button in `TicketsTable.jsx` calls `/tickets/export`) | **Missing** — `ExportButton` component present, no API call wired | **Yes — mobile gap** |
| Export hosts | Confirmed present (web admin hosts table) | **Missing** — ExportButton present, no API call | **Yes — mobile gap** |
| Export vendors | Confirmed present (web admin vendors table) | **Missing** — ExportButton present, no API call | **Yes — mobile gap** |
| Export events | Confirmed present (web admin events table) | **Missing** — ExportButton present, no API call | **Yes — mobile gap** |
| Export guests (per event) | Confirmed present (web event detail page) | **Missing** — no implementation | **Yes — mobile gap** |
| Export payments | Confirmed present (web admin payments page) | **Missing** — ExportButton present, no API call | **Yes — mobile gap** |
| Export whitelabels | Confirmed present (web super-admin only) | **Missing** | **Yes — mobile gap** |
| File download to device | Browser auto-download (web) | Requires expo-file-system + expo-sharing (in package.json, not implemented) | **Yes — implementation gap** |

---

## Edge cases & failure modes

- **OOM on large dataset**: `generateExcel()` loads the entire query result into memory synchronously. A tenant with 50k hosts or events will exhaust Node.js heap. No row cap or streaming exists.
- **Gateway timeout**: Synchronous in-process generation with no timeout guard. A 30-60s gateway timeout (typical in cloud load balancers) will kill the request mid-transfer for large exports.
- **No audit trail**: Any admin can export the full guest list, host list, or payment history. No `AuditLog.create()` call exists in any export handler. Gate-1 #10 requires all admin actions to be logged.
- **exportWhitelabels no service-level filter**: Relies on `requirePageAccess` to block non-super_admins. If page access is misconfigured, there is no service-layer defense.
- **Mobile buffer handling**: Mobile receives an xlsx buffer but has no code to write it to disk or open the share sheet. `ExportButton.onPress` is `undefined` in all admin screens.
- **Concurrent large exports**: No concurrency guard. Multiple admins simultaneously exporting large datasets will spike memory and potentially crash the Node process.

---

## Findings

### FLOW-28-F01 — Mobile ExportButton has no API integration; all admin exports non-functional on mobile
- **Severity**: High
- **Type**: MISSING (parity gap, Gate-1 #4)
- **Location**: `halla-mobile/components/admin-dashboard/common/ExportButton.js` (no onPress API call), all mobile admin screens that render ExportButton
- **Description**: `ExportButton` is a styled React Native component accepting `onPress`, `loading`, `label`, and `style` props. No mobile admin screen passes a working `onPress` handler that calls an export endpoint. The button renders and is tappable but does nothing. `expo-file-system` and `expo-sharing` are already in `package.json`.
- **Why it matters**: Gate-1 Decision #4 requires mobile parity with web admin. All web admin tables have working export. Mobile admin has zero working export functionality.
- **Recommended change**: For each admin screen with a table (tickets, hosts, vendors, events, payments), add a service method (e.g., `exportTicketsAPI(filters)`), wire it to `ExportButton.onPress`, use `FileSystem.downloadAsync()` + `Sharing.shareAsync()` to deliver the file to the device. All required packages are present.

### FLOW-28-F02 — generateExcel() has no row cap; large exports will OOM or timeout
- **Severity**: High
- **Type**: MISSING
- **Location**: `labbe-backend-/src/shared/utils/excelExport.js:9-22`
- **Description**: `generateExcel()` receives a pre-fetched array of arbitrary size, calls `xlsx.write()` synchronously, and returns the buffer. No maximum row limit, no streaming, no size check. For large tenants (10k+ rows), this risks Node.js heap exhaustion and HTTP gateway timeout.
- **Why it matters**: A single large export request can crash the backend process for all concurrent users.
- **Recommended change**: Add an `EXPORT_MAX_ROWS` environment variable (default 10,000). At the start of each export service method, count matching documents before fetching. If count exceeds the limit, return a 422 error instructing the admin to narrow filters. This is the Phase 1 fix; Phase 2 (BullMQ background job) can be added when Redis is provisioned.

### FLOW-28-F03 — Export actions not audit-logged; Gate-1 #10 violation
- **Severity**: Medium
- **Type**: MISSING (Gate-1 #10)
- **Location**: `labbe-backend-/src/modules/admin/admin.controller.js:522-579`, `labbe-backend-/src/modules/tickets/tickets.controller.js:146`, `labbe-backend-/src/modules/guests/guests.controller.js:103`
- **Description**: Every export controller handler fires and returns the file with no audit record. No `AuditLog.create()` or equivalent is called. An admin can export the complete host list, payment history, or guest contact database with no trace.
- **Why it matters**: Gate-1 Decision #10 requires audit logging of all admin actions. Export of PII-rich data (guest contacts, payment records) is particularly high-risk under PDPL (Saudi Arabia data protection law).
- **Recommended change**: At the start of each export handler, write an audit event: `AuditEvent.create({ userId: req.user._id, action: 'EXPORT', resource: '<type>', filters: req.query, ip: req.ip, timestamp: new Date() })`. Even a minimal stub now satisfies the Gate-1 requirement and can be enhanced later.

### FLOW-28-F04 — exportWhitelabels has no service-level tenant filter; relies solely on page access permission
- **Severity**: Low
- **Type**: BUG (defense-in-depth gap)
- **Location**: `labbe-backend-/src/modules/admin/admin.controller.js:572`, `labbe-backend-/src/modules/admin/admin.routes.js:845-848`
- **Description**: `exportWhitelabels` controller does not call `getWhitelabelIdFromFilter(req)` and passes no `whitelabelId` to the service, which queries `{ role: ROLES.WHITELABEL_ADMIN }` globally. Safety is provided only by `requirePageAccess(ADMIN_PAGES.WHITELABELS, 'view')` which blocks all non-SUPER_ADMIN roles. If page access configuration is ever relaxed, this becomes an unrestricted cross-tenant data read.
- **Why it matters**: Defense-in-depth principle — access control should be enforced at multiple layers. A misconfiguration in permissions propagates immediately to a data leak.
- **Recommended change**: Add `if (req.user.whitelabelId) query.whitelabelId = req.user.whitelabelId` in `adminService.exportWhitelabels()` as a service-level guard. This is a one-line defensive addition that costs nothing.

---

## Cross-flow notes

- **Flow 23 (Tickets)**: `exportTickets()` shares the same `generateExcel()` codepath. FLOW-28-F02 (no row cap) affects ticket exports equally. A large tenant's ticket history will OOM.
- **Flow 27 (Notifications)**: No export endpoint exists for notifications. Admin analytics on notification delivery rates rely on aggregation queries, not exports.
- **Flow 24/25 (Vendor)**: `exportVendors()` in `admin.controller.js` is the primary vendor data export. The `numberOfClicks` field (always 0 per FLOW-26-F05) will appear as zero in every vendor export row.
- **Gate-1 #10 (Audit Log)**: FLOW-28-F03 is one instance of a broader gap: the audit log system is not yet built. All export handlers need audit stubs now, not after the full audit system is designed.
