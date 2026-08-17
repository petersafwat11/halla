# dashboard — Full-Stack Review Plan

**Module:** dashboard
**Generated:** 2026-05-07
**Prompt:** docs/implementation/MODULE_FULLSTACK_REVIEW_PROMPT.md
**Status:** Awaiting green light · NOT IMPLEMENTED YET

---

## 0. Executive Summary

- 3 total endpoints in module (`GET /dashboard/admin`, `GET /dashboard/host`, `GET /dashboard/vendor`).
- 1 endpoint with **zero consumers** on either platform (`GET /dashboard/vendor` — dead code candidate).
- 1 web hook with a **duplicated definition** (`useAdminDashboard` exists in both `useDashboard.js` and `useAdmin.js`; the latter is the one actually used; the former is dead).
- 4 Swagger drift findings (response schemas not described; `from`/`to` query params undocumented; vendor/host `period`/`from`/`to` not accepted by service).
- 0 backend file-size violations (largest is `dashboard.service.js` at 453 lines vs 600 cap).
- 1 web file-size violation (`ui/host/main-page/latsEventStats/LastEventStats.jsx` — 572 lines vs 250 cap).
- 2 mobile file-size violations (`components/home/LastEvent.js` — 452 lines vs 350 cap; `components/home/EventTemplates.js` — 354 lines vs 350 cap).
- 4 web/mobile API consumption mismatches (mobile renders English `statsCards.title` raw without `t()`; mobile lacks whitelabel `analytics` rendering; mobile drops `period` filter on subscription chart; web `/host` doesn't expose admin's `period`/`from`/`to` query forwarding).
- 7+ data mapping bugs / fallback chains hiding mismatched shapes (most critically: web + mobile both read `lastEvent.stats.pending` and `lastEvent.stats.approved`, but the backend emits `confirmed`, `declined`, `invited`, `checkedIn` — `pending` and `approved` are always `undefined`, so the response-rate panel always shows 0).
- Multiple missing pieces: no Joi validation on `period`/`from`/`to` query, no audit log on dashboard reads (acceptable — they're reads), no `restrictTo(SUPER_ADMIN, ADMIN, ...)` because the `requirePageAccess` already gates admin role.
- Comment-hygiene blocks to remove: 2 `Phase 4c W0-RENAME` markers (web `LastEventStats.jsx` lines 36–37, backend `dashboard.service.js` line 363); 1 `M-13` marker (mobile `dashboardService.js`); 1 `Phase 4 W0-AUTH` marker (mobile `adminDashboardService.js`); 1 `Phase 4b W2-POLL-FAIL` marker (mobile `LastEvent.js`).
- **Estimated effort: M.**

---

## 1. Endpoint Inventory

| # | Method | Path | Controller | Service | Middleware chain | Swagger | Web hook | Mobile hook | Status |
|---|--------|------|------------|---------|------------------|---------|----------|-------------|--------|
| 1 | GET | /dashboard/admin | `dashboard.controller.getAdminDashboard` | `dashboardService.getDashboardStats` | `protect` → `requirePageAccess(ADMIN_PAGES.DASHBOARD,'view')` → `whitelabelIsolation` | partial — schema generic; `period`/`from`/`to` query params not documented | `useAdminDashboard` (from `useAdmin.js`) | `useAdminStats` (from `useAdmin.js`) | KEEP |
| 2 | GET | /dashboard/host | `dashboard.controller.getHostDashboard` | `dashboardService.getHostDashboardStats` | `protect` → `restrictTo(ROLES.HOST)` | partial — schema generic; no params | `useHostDashboard` (from `useDashboard.js`) | `useHostDashboard` (from `useEvents.js`) | KEEP |
| 3 | GET | /dashboard/vendor | `dashboard.controller.getVendorDashboard` | `dashboardService.getVendorDashboardStats` | `protect` → `restrictTo(ROLES.VENDOR)` | partial — schema generic | `useVendorDashboard` (from `useDashboard.js`) — **0 consumers** | none | DELETE-OR-CONSUME |

**Legend:** KEEP, DELETE-DUPLICATE-OF-#N, RENAME, MERGE-WITH-#N, DELETE-OR-CONSUME (route exists but is unreachable from any UI today).

**Action on #3:** the vendor dashboard endpoint is fully implemented backend-side but no UI calls it. Three options to discuss with the user:
1. **Delete** the route + service method + web hook (scope creep, not used).
2. **Wire it up** to mobile `screens/vendor/VendorHomeScreen.js` (and a corresponding web vendor page) — the data shape is sensible and would replace ad-hoc queries.
3. **Park** it as ready-to-use until vendor home design lands. Default recommendation in §7 is option 1 unless the user objects.

---

## 2. Backend Findings

### 2.1 File-size violations
- None. Largest file: `dashboard.service.js` at 453 lines (cap 600).

### 2.2 Swagger drift
- `GET /dashboard/admin` JSDoc declares only a generic `period: string` query param. Controller actually accepts `period`, `from`, `to`. **Fix:** add `from`/`to` ISO-date query params to Swagger.
- `GET /dashboard/admin` response is `$ref: '#/components/schemas/SuccessResponse'`. The actual shape is rich (`statsCards[]`, `charts.subscriptionsByPlan`, `recentActivity.{hosts,events}`, `bestVendors[]`, `analytics?`). **Fix:** add a dedicated `AdminDashboardStats` schema in `config/swagger.js` and reference it. (file: `dashboard.routes.js:24-50`, `config/swagger.js`)
- `GET /dashboard/host` response: same drift — service returns `{ stats, lastEvent, subscription, hasEvents }`. **Fix:** add `HostDashboardStats` schema. (file: `dashboard.routes.js:58-83`)
- `GET /dashboard/vendor` response: same drift — service returns `{ stats, profile, services }`. **Fix:** add `VendorDashboardStats` schema, OR delete the route per §1 #3. (file: `dashboard.routes.js:86-110`)

### 2.3 Missing middleware / safeguards
- `GET /dashboard/admin` `period` query is unvalidated; service falls through to default but a junk value (`?period=foo`) silently behaves like `month`. **Fix:** add a tiny Joi schema in `dashboard.validation.js` (new file) and a `validate(querySchema, 'query')` step on the route. Allowed values: `today | week | month | quarter | year`. Also validate `from`/`to` as optional ISO dates and require `from <= to`.
- `GET /dashboard/host` and `/vendor` accept no query params and the service ignores anything passed — this is fine, but they should not be tagged as accepting `period` in the future.

### 2.4 Duplicate / dead endpoints
- `GET /dashboard/vendor` — see §1 #3. Recommendation: DELETE unless we wire the vendor home to it.

### 2.5 Service / controller violations
- `dashboard.service.js:81` (`getDashboardStats`) — uses `Promise.all` correctly, but `User.find(...).select(...).sort(...).limit(5)` and `Event.find(...).populate(...).sort(...).limit(5)` lack `.lean()`. Both are read-only; add `.lean()` to skip Mongoose hydration. (file: `dashboard.service.js:135-136`)
- `dashboard.service.js:298` (`getHostDashboardStats`) — `Subscription.findOne(...).populate('planId')` and `Event.findOne(...).populate('guestList')` lack `.lean()`. The follow-up `Guest.find({ event: lastEvent._id })` (line 322) is sequentially awaited *after* the `Promise.all`, but it depends on `lastEvent._id` so it must be sequential. However, `Guest.find(...)` should use `.lean()`. (file: `dashboard.service.js:311-322`)
- `dashboard.service.js:412` (`getVendorDashboardStats`) — `User.findById(userId).select(...)` and `Service.find({ vendor: userId })` should be parallelized via `Promise.all` *and* leaned. The `user` and `services` queries do not depend on each other. (file: `dashboard.service.js:412-415`)
- `dashboard.service.js:339` — `planLimits.maxGuestsPerEvent || 100` and `planFeatures.compensationPercentage || 10` use magic-number fallbacks for plan defaults. **Concern:** if a plan legitimately has `maxGuestsPerEvent = 0`, the `||` chain falls through to `100`. Use `??` instead. Same for `compensationPercentage || 10`.
- `dashboard.service.js:396-398` — `subscription.planId?.limits?.maxEvents || subscription.planId?.limits?.events || 1` and `...maxGuestsPerEvent || ...guests || 100` are defensive fallback chains across a renamed plan-limits schema. After plans-module enforcement (separate review), one canonical key should remain. **Action:** flag in §6, do not change here without confirming the canonical key with the plans owner.
- `dashboard.service.js:363-373` — `Phase 4c W0-RENAME` block emits BOTH a legacy `invitationSettings` shape AND new `visualTemplate` / `taqnyatTemplate` keys. Comment is exactly the kind to remove per A9. The dual-write is genuine business logic — keep the code; delete the comment (or replace with a one-line "Both legacy and canonical template fields are emitted while consumers migrate").

### 2.6 Validation gaps
- No `dashboard.validation.js` exists. Add one with:
  - `adminDashboardQuery`: `{ period?: 'today'|'week'|'month'|'quarter'|'year', from?: iso-date, to?: iso-date }` with `from <= to` cross-field check and `unknown(false)`.
- Routes file currently does no `validate()` on query — wire it up.

### 2.7 Comment hygiene
- `dashboard.service.js:16` — `// Import existing models during migration` → remove (states the obvious; "during migration" is meaningless context now).
- `dashboard.service.js:363-366` — `// Phase 4c W0-RENAME — emit BOTH legacy invitationSettings ...` → reduce to one line: `// Emits both legacy and canonical template fields during the consumer-migration window.` (We keep the *why* and drop the phase marker.)
- `dashboard.service.js:283` — `// Top vendors by service views — used by both web Bottom component and mobile AdminDashboardScreen` → drop the consumer reference; keep only `// Top vendors by aggregate service views.`
- `dashboard.service.js:380, 387, 389, 401` — short trailing one-line comments describing what each return key is for (`// For StatsCards component - direct use`, etc.) → remove. They re-state shape; the structure itself is self-evident.
- `dashboard.routes.js:1-4` — the 4-line module JSDoc header is fine; the empty `swagger tags` block at lines 6-11 is fine.

---

## 3. Frontend Web Findings

### 3.1 Component tree per page

**Admin dashboard:** `app/[lang]/admin-dash/page.js` (54 lines)
- `_components/DashboardPageHeader.jsx` (15 lines)
- `_components/DashboardStats.jsx` (198 lines)
  - `ui/host/main-page/StatsCards.jsx` (42 lines)
  - `ui/common/loading/SimpleLoading` — shared
- `_components/DashboardCharts.jsx` (167 lines)
  - `ui/admin/dashboard/charts/pieChart/PieChart.js` (150 lines)
  - `ui/common/loading/SimpleLoading` — shared
- `_components/RecentActivity.jsx` (170 lines)
  - `ui/commen/new-table/Table` — shared
  - `ui/admin/dashboard/bottom/Bottom.js` (15 lines)
    - `ui/admin/dashboard/bottom/topVendors/TopVendors.js` (26 lines)
    - `ui/admin/dashboard/bottom/activitySummery/ActivitySummery.js` (23 lines, **dead — commented out in `Bottom.js:9`**)

**Host dashboard:** `app/[lang]/host/page.js` (32 lines)
- `app/[lang]/host/HostDashboardContent.jsx` (98 lines)
  - `ui/host/main-page/HeroSection.jsx` (53 lines)
  - `ui/host/main-page/StatsCards.jsx` (42 lines)
  - `ui/host/main-page/EventTemplatesSection.jsx` (139 lines)
  - `ui/host/main-page/latsEventStats/LastEventStats.jsx` (572 lines) — **VIOLATION cap=250**
    - `ui/host/main-page/TestMessagePopup.js` (126 lines)
    - `ui/host/popups/scheduleSendingPopup/ScheduleSendingPopup` — shared
    - `ui/host/popups/popupWrapper/PopupWrapper` — shared

(`ui/admin/dashboard/wrapper/Wrapper.js` at 442 lines exists in the tree but is not imported by any dashboard page after the refactor. Confirm with grep — see §6.)

### 3.2 File-size violations
- `ui/host/main-page/latsEventStats/LastEventStats.jsx` — 572 lines (cap 250). Proposed split:
  - `LastEventStats.jsx` — top-level orchestrator, hooks, layout (~120 lines).
  - `_components/LastEventHeader.jsx` — title + status badge + meta row.
  - `_components/LastEventStats.parts.jsx` — the response-rate stats block (mobile + desktop variants).
  - `_components/LastEventQuota.jsx` — subscription-quota row.
  - `_components/LastEventActions.jsx` — buttons + dropdown (the largest block; lines 349-544).
  - **Style preservation note:** classes `eventCard`, `container`, `eventImage`, `imagePlaceholder`, `eventInfo`, `headerContainer`, `titleContainer`, `eventTitle`, `statusBadge`, `statusText`, `metaInfo`, `metaItem`, `metaText`, `divider`, `responseRateSection`, `responseRateContainer`, `responseRateHeader`, `responseRateLabel`, `responseRateText`, `responseLegend`, `legendItem`, `legendDot`, `dotGray`, `dotRed`, `dotGreen`, `legendText`, `statsContainer`, `statBox`, `statLabel`, `statValue`, `statBoxDeclined`, `statLabelDeclined`, `statValueDeclined`, `statBoxApproved`, `statLabelApproved`, `statValueApproved`, `subscriptionQuota`, `quotaItem`, `quotaLabel`, `quotaValue`, `quotaSeparator`, `actionsContainer`, `dropdownWrapper`, `primaryButton`, `outlineButton`, `dropdown`, `dropdownItem`, `secondaryActions`, `loading`, `statusActive`, `statusPending`, `statusNotSubmitted`, `statusPublished`, `statusSuspended` must remain in `LastEventStats.module.css` and be imported into the extracted components by `import styles from "../LastEventStats.module.css";` — do NOT move/rename them.

### 3.3 Hardcoded text / data / paths
- `app/[lang]/host/HostDashboardContent.jsx:20-24` — `"Loading..."` and `Error: ${error.message}` rendered as raw English. Replace with `t("common.loading")` / `t("errors.loadFailed")`. Also: showing `error.message` to the end user is forbidden per B8 — use `handleError` + `toastUtils`.
- `ui/host/main-page/latsEventStats/LastEventStats.jsx:47` — `<div className={styles.loading}>Loading...</div>` — same fix.
- `ui/host/main-page/latsEventStats/LastEventStats.jsx:56-62` — Arabic literals `"مسودة"`, `"مجدول"`, `"مكتمل"` passed as fallback values to `t(...)`. Per B2 fallbacks are OK, but the second argument should be the English fallback only. Today it mixes Arabic into a fallback whose role is "English copy when key is missing" — confusing. Standardize to English fallbacks (or remove fallback when the key is guaranteed to exist).
- `ui/host/main-page/latsEventStats/LastEventStats.jsx:145, 147` — `t("staff.notifySuccess", "تم إرسال الإشعار للفريق")` and `t("staff.notifyError", "فشل إرسال الإشعار")` — same Arabic-fallback pattern.
- No hardcoded API paths found. (All consumers use `API_PATHS.dashboard.*`.)
- No hardcoded data found in the dashboard tree.

### 3.4 Data mapping bugs / fallback chains

**(a) `useAdmin.js` `useAdminDashboard` is canonical; `useDashboard.js` `useAdminDashboard` is dead.** Both export the same name; the dead one in `useDashboard.js` does not accept `filters`. `app/[lang]/admin-dash/page.js`, `_components/DashboardStats.jsx`, `_components/DashboardCharts.jsx`, `_components/RecentActivity.jsx` all import from `@/hooks/reactQueryHooks/useAdmin`. Delete the `useDashboard.js` `useAdminDashboard` export (lines 11-26).

**(b) `_components/DashboardStats.jsx:78-79`** — `const data = responseData?.data || responseData;`. The backend always wraps via `sendSuccess`, so the shape is `{ success, status, data: {...} }`. `responseData` is the apiClient envelope — let the apiClient unwrap once and consumers read `.data` only. Audit `apiClient.apiRequest` to confirm — but the fallback `|| responseData` is a dead branch.

**(c) `_components/DashboardStats.jsx:84-185` (the `useMemo`)** — has THREE branches:
1. Whitelabel-role branch (lines 87-126) — reads from `data.statsCards` + `data.analytics`. ✅ matches backend.
2. `backendCards.length > 0` branch (lines 128-144) — reads `data.statsCards`. ✅ matches.
3. **Dead legacy branch (lines 146-184)** — reads `data?.users?.hosts || data?.hosts`, `data?.users?.vendors || data?.vendors`, `data?.events`, `data?.tickets` — none of these paths are emitted by the current backend. This whole `return [...]` block (lines 151-184) is unreachable because branch 2's `backendCards.length > 0` is always true after the new contract. **Delete branches 3.**
4. Inside branch 2, `card.subtitle?.split(" ")[0]` (line 132) parses an English subtitle string back to an integer. The backend already provides the count separately; this is fragile. **Fix:** ask the backend to emit `subtitleCount` and `subtitleLabel` separately in `statsCards` (or just `count` and `label`), so the frontend doesn't string-parse. Document as an A6 contract change in §7.A.

**(d) `_components/DashboardCharts.jsx:48`** — `const data = responseData?.data || responseData;` — same dead fallback. Delete.

**(e) `_components/DashboardCharts.jsx:140, 144-164`** — non-whitelabel branch renders THREE pie charts: revenue, tickets, subscriptions. **Backend only emits `charts.subscriptionsByPlan`.** `chartsData.revenue` and `chartsData.tickets` are always `undefined`, so the `revenue` and `tickets` pies always render empty. This is a real bug — flag in §6 and decide:
- Either remove the revenue + tickets pies until the backend emits the data.
- Or extend the backend response to include them.

**(f) `_components/RecentActivity.jsx:62`** — same `responseData?.data || responseData` dead fallback. Delete.

**(g) `_components/RecentActivity.jsx:127-133`** — `host.id || host._id`, `host.username || host.name`, `host.email || "-"`, `host.status || "active"`, `host.createdAt || host.created_at || new Date().toISOString()`. The backend (`dashboard.service.js:268-274`) emits `{ id, name (= name||username), email, status, createdAt }`. Therefore:
- `host.id` is canonical (no `_id`).
- `host.name` is canonical (already pre-fallback'd backend-side).
- `host.email` is canonical.
- `host.status` always present.
- `host.createdAt` always present (no `created_at`).
**Delete every fallback in this map; use `data.recentActivity.hosts.map((h) => ({ id: h.id, name: h.name, email: h.email, status: h.status, createdAt: h.createdAt }))`.** The `|| "-"` empty-state guards are still allowed at the JSX level if a row legitimately may have no value, but `host.email` is guaranteed by the backend, so drop those too.
- `_components/RecentActivity.jsx:148-154` — same for events: backend emits `{ id, title, date, status, host }`. Drop all `_id`, `host` fallbacks except the empty-state `|| "-"` if needed.

**(h) `HostDashboardContent.jsx:27-29`** — `const dashData = data?.data || data;` then reads `dashData.hasEvents`, `dashData.stats`. The backend wraps via `sendSuccess` so `data?.data` is the right path — drop the `|| data` fallback.

**(i) `LastEventStats.jsx:27-29`** — same pattern. Drop fallback.

**(j) `LastEventStats.jsx:31, 38-40, 42, 44, 50-51`** — multi-source reads:
- `data.testMessageSent` — backend emits ✅.
- `data.taqnyatTemplate?.templateRef` — backend emits ✅.
- `data.invitationSettings?.selectedTemplate?.name` — backend emits the legacy `invitationSettings` block too (per dashboard.service.js:367-373). After the dual-write window closes (per backend §2.5), the frontend should read from `data.taqnyatTemplate.templateRef` only, then this `||` becomes dead. Track in §7.A.
- `data?.staffCount`, `data?.staffList?.length` (line 44) — **neither is emitted by the backend.** `hasStaff` is therefore always `false`. **Bug.** Either the backend must populate staff data on `lastEvent` or the frontend must remove the staff button. Flag in §6.
- `data.entryTime || data.time` (line 82) — backend only emits `time` (from `eventDetails.time`), not `entryTime`. Drop the `entryTime` branch.
- `data.location?.address || data.location?.city || data.location` (line 210) — backend emits `location` (a string from `eventDetails.location`) and `locationName` (a string from `eventDetails.locationName`). Reduce to `data.locationName || data.location || ''`.
- `data.stats.pending`, `data.stats.declined`, `data.stats.approved` (lines 247, 256, 265, 277, 284, 292) — **CRITICAL BUG.** Backend emits `confirmed`, `declined`, `invited`, `checkedIn` (no `pending`, no `approved`). Frontend reads `pending` and `approved` — both undefined. Fix mapping:
  - `noResponse` → `data.stats.invited` (or compute `total - confirmed - declined`).
  - `approved` → `data.stats.confirmed`.
  - Or rename backend keys to `pending`/`approved` (less invasive in frontends but a bigger contract churn). **Recommendation:** rename frontend reads to match backend (`confirmed`, `invited`, `declined`); rename `noResponse` UI label key but keep backend names canonical. Cross-platform — the same bug exists on mobile (§4).

### 3.5 Duplicate hooks / direct apiRequest calls
- `useDashboard.js` has duplicate `useAdminDashboard` already noted in §3.4(a). Same file's `useHostDashboard` is the canonical web host hook (used by `HostDashboardContent.jsx` and `LastEventStats.jsx`). The `useVendorDashboard` export is dead — see §1 #3.
- No direct `apiRequest` / `useQuery` calls in dashboard pages or components. ✅

### 3.6 State / loading / error gaps
- `HostDashboardContent.jsx:20-25` — loading + error states present, but they show raw "Loading..." and `Error: ${error.message}`. Per B13: replace with `<SimpleLoading/>` and a proper error fallback. Currently lacks an empty state, but `!hasEvents` branch handles it functionally.
- `LastEventStats.jsx:47` — same raw "Loading..." string.
- `_components/DashboardStats.jsx`, `DashboardCharts.jsx`, `RecentActivity.jsx` — all three render `<SimpleLoading/>` and a translated error block. ✅ But each one fires its own `useAdminDashboard(filters)` call. React Query's deduplication ensures only one network request, but the three components compute the same `filters` from `searchParams` independently. Acceptable.
- `app/[lang]/admin-dash/page.js` — lacks an `ErrorBoundary` wrapper per B19. Add `<ErrorBoundary>` around the component tree.
- `app/[lang]/host/page.js` — same: no `ErrorBoundary`.
- `app/[lang]/admin-dash/page.js:39` — `console.error("Error prefetching dashboard data:", error);` — leave (server-side prefetch error is fine to log, per D6 backend-side; here it runs in a Next 15 server component and the exception is otherwise swallowed). Verify `errorHandlingService` does not exist server-side; if it does, route through it instead.
- `app/[lang]/host/page.js:23` — `console.error("Error prefetching dashboard:", error);` — same.

### 3.7 Comment hygiene
- `LastEventStats.jsx:36-37` — `// Phase 4c W0-RENAME — accept canonical taqnyatTemplate.templateRef alongside the legacy selectedTemplate.name during dual-write.` → remove or compress to `// Read canonical template ref, fall back to legacy until backend dual-write ends.`
- `LastEventStats.jsx:67, 71, 92` — three short header comments (`// Format date and time using locale`, `// Format date and time`, `// Dropdown menu items - matching the 4 steps in create event`) — remove all three; the function names are self-describing.
- `useDashboard.js:7-8, 28, 45` — section banners (`// ============= DASHBOARD QUERIES =============`, `* Hook to fetch admin dashboard stats`, etc.) — keep the JSDoc `/** ... */` blocks; remove the `// =====` banner separators.

---

## 4. Frontend Mobile Findings

### 4.1 Screen → component tree

**Admin dashboard:** `screens/admin/admin-dashboard/AdminDashboardScreen.js` (98 lines)
- `screens/admin/admin-dashboard/_components/AdminStatsGrid.js` (89 lines)
- `screens/admin/admin-dashboard/_components/AdminSubscriptionsChart.js` (114 lines)
- `screens/admin/admin-dashboard/_components/AdminRecentHosts.js` (131 lines)
- `screens/admin/admin-dashboard/_components/AdminRecentEvents.js` (133 lines)
- `screens/admin/admin-dashboard/_components/AdminTopVendors.js` (102 lines)
- `components/plans/TopBar.js` — shared

**Host home:** `screens/host/HomeScreen.js` (211 lines)
- `components/home/HomeHeaderContent.js` (95 lines)
- `components/home/LastEvent.js` (452 lines) — **VIOLATION cap=350** (rendered through `HomeHeaderContent`)
- `components/home/EventActionsHeader.js` (201 lines)
- `components/home/StatsCards.js` (323 lines)
- `components/home/EventTemplates.js` (354 lines) — **VIOLATION cap=350** (only by 4 lines)
- `components/home/MakeYourFirst.js` — shared
- `components/home/TestMessageModal.js` — shared
- `components/home/ScheduleSendingModal.js` — shared
- `components/notifications/NotificationBell` — shared
- `components/plans/TopBar` — shared

### 4.2 File-size violations
- `components/home/LastEvent.js` — 452 lines (cap 350). Proposed split:
  - `LastEvent.js` — orchestrator + outer container (~150 lines).
  - `_components/LastEventHeader.js` — image + title + status badge + meta row.
  - `_components/LastEventStatsRow.js` — response-rate stats (mobile-only since host screen is mobile-only).
  - `_components/LastEventActions.js` — primary/secondary action buttons + dropdown.
  - **Style preservation:** every `StyleSheet.create({...})` value at the bottom of `LastEvent.js` must be moved verbatim to the extracted file's StyleSheet block. Do not round/rename keys. Specifically: `container`, `contentRow`, `textContent`, `titleRow`, `title`, `statusBadge`, `statusText`, `metaContainer`, `metaItem`, `metaText`, `divider`, `responseRateSection`, `responseRateContainer`, `responseLegend`, `legendItem`, `legendDot`, `dotGray`, `dotRed`, `dotGreen`, `legendText`, `statsContainer`, `statBox`, `statLabel`, `statValue`, `statBoxDeclined`, `statLabelDeclined`, `statValueDeclined`, `statBoxApproved`, `statLabelApproved`, `statValueApproved`, `subscriptionQuota`, `quotaItem`, `quotaLabel`, `quotaValue`, `quotaSeparator`, `actionsContainer`, `dropdownWrapper`, `primaryButton`, `outlineButton`, `dropdown`, `dropdownItem`, `secondaryActions`. (Confirm exact list when reading the file in Phase 2.)
- `components/home/EventTemplates.js` — 354 lines (4 over cap). Two options: extract a small sub-component to bring the file ≤ 350 lines, or accept as a borderline case and wait until the next legitimate refactor. Recommendation: extract the templates list item into `_components/EventTemplateCard.js` to bring the parent below 280.

### 4.3 Service / hook violations
- `services/dashboardService.js` (19 lines) is correct — uses `apiFetch`, returns `data.data`. ✅ **Comment hygiene:** drop the `M-13:` marker on lines 6-9.
- `services/adminDashboardService.js` is **a misnamed god-service** — 371 lines that bundle dashboard, hosts, moderators, vendors, events, tickets, payments, plans, subscriptions, addons, whitelabels, discounts. Per C1 each service file should own one domain. **This is out of scope for the dashboard module review** — flag for the future `admin` module review. For dashboard's slice, the only relevant export is `dashboard.getStats`; that one function should move into `services/dashboardService.js` (or be inlined into `hooks/queries/useAdmin.js → useAdminStats`) so the dashboard service is self-contained. Mobile then has one canonical service file per dashboard-style endpoint.
- `services/adminDashboardService.js:75-81` — comment hygiene: `// ─── Dashboard ───...` separators → remove (cosmetic). `Phase 4 W0-AUTH:` block-comment header at lines 5-12 → remove.
- `hooks/queries/useAdmin.js:1-18` — `useAdminStats` is the canonical mobile admin-dashboard hook. ✅ But it embeds an inline comment about the response wrapping (`// adminDashboardService wraps the backend response: ...`) that is the kind of "why" comment we *do* keep. Leave it.
- `hooks/queries/useEvents.js:100-114` — `useHostDashboard` lives in `useEvents.js`, not `useDashboard.js`. Per C2 the canonical location is `hooks/queries/useDashboard.js`. **Action:** create `hooks/queries/useDashboard.js` and move `useHostDashboard` (and `useAdminStats` if we want platform parity with web) there. Update the one consumer (`screens/host/HomeScreen.js:22`).
- `hooks/queries/useAdmin.js:5` — `useAdminStats(period = 'month')` accepts only `period`, not `from`/`to`. Web's `useAdminDashboard` accepts the full `filters` object. Mobile cannot today filter by `from`/`to`. **Decision:** mobile admin dashboard does not yet expose date pickers; current behavior (fixed period) is fine. Document the divergence as intentional in §5.
- Mobile admin stats hook reads `response.data?.data || response.data` (line 13). After the unwrap the right path is `response.data.data` (the backend's `data` key inside the `success`-envelope wrapped by `adminDashboardService.apiRequest`). The fallback is a dead branch — but **be careful**: `adminDashboardService.apiRequest` wraps the *whole* `response.json()` into `{ success, data: <full backend response>, error }`. So `response.data.data` is `{ statsCards, charts, ... }`. The `|| response.data` fallback would return the wrapper itself if the backend ever returns no `data` field — defensive only, never legitimately reached.

### 4.4 Hardcoded text / data / paths
- `components/home/LastEvent.js:6-11` — `dropdownItems` array contains hardcoded Arabic labels (`"تفاصيل المناسبة"`, `"قائمة الضيوف"`, `"تصميم الدعوة"`, `"تخصيص الدعوة"`). Replace with `t("lastEvent.dropdown.eventDetails")` etc. ✅ Web already has these keys.
- `components/home/LastEvent.js:28` — `event.title || event.eventDetails?.title || "مناسبة بدون عنوان"` — both fallback paths and the Arabic literal. Replace with `event.title || t("lastEvent.untitled", "Untitled event")`.
- `components/home/LastEvent.js:62-68` — `getUnifiedStatus()` returns hardcoded Arabic status labels and inline color hex values. Replace text with `t("lastEvent.status.draft")` etc.; centralize the colors in `styles/tokens` if not already.
- `components/home/LastEvent.js:47-52` — `toLocaleDateString("ar-SA", ...)` hardcodes Arabic locale. Should follow the user's locale (mirror web `currentLocale` logic). Low priority since the app currently is RTL/Arabic-first.
- `screens/admin/admin-dashboard/AdminDashboardScreen.js:42-46` — fallback `statsCards` array hardcodes English labels through `t(...)` calls — those are translated, but the icons/values are placeholders shown only when the data is empty. Acceptable as a loading-fallback, but it duplicates the backend's own fallback shape. After §3.4 lands (backend always emits 5 cards), this fallback is unreachable; consider removing it to keep one source of truth.
- No hardcoded API paths found (mobile uses `ENDPOINTS.DASHBOARD.HOST` / `/dashboard/admin` literal in `adminDashboardService.dashboard.getStats`). The literal is a violation per C1 — replace with `ENDPOINTS.DASHBOARD.ADMIN` after the service is moved. Currently `adminDashboardService.js:79` has the literal `/dashboard/admin`.

### 4.5 Web/Mobile divergence

| Endpoint | Web | Mobile | Backend truth | Action |
|----------|-----|--------|---------------|--------|
| GET /dashboard/admin | sends `period`, `from`, `to` | sends only `period` (mobile doesn't expose date pickers) | accepts all three | Document as intentional. No change. |
| GET /dashboard/admin response — `analytics` (whitelabel) | rendered by `DashboardStats.jsx` (4 alt cards) and `DashboardCharts.jsx` (Monthly Events bar + Events-by-Status list) | **not rendered** — mobile shows the same standard `statsCards` for whitelabel admin | Backend emits the same shape; mobile lacks UI parity | Flag as intentional gap *or* extend `AdminDashboardScreen.js` for whitelabel admins. Recommend §6: confirm with PM. |
| GET /dashboard/admin — `statsCards[].title` is English | `DashboardStats.jsx` translates via `cardTitleKeys` map and falls back to `card.title` | `AdminStatsGrid.js:26` renders `item.title` raw → English appears in Arabic UI | Backend emits English labels (legacy contract) | Either backend emits a `titleKey` (preferred — single contract) or mobile duplicates the cardTitleKeys map. **Recommendation:** add `titleKey` field server-side; both clients translate via key. |
| GET /dashboard/admin — `statsCards[].subtitle` parsing | Web parses leading number from subtitle string | Mobile renders raw subtitle string | Backend emits e.g. `"3 active"` | Same root cause: backend should emit structured `{ count, labelKey }` instead of pre-formatted English string. **Recommendation:** structure the subtitle. |
| GET /dashboard/host — `lastEvent.stats.pending/approved` | both web `LastEventStats.jsx` and mobile `LastEvent.js` read these | Backend emits `confirmed`, `declined`, `invited`, `checkedIn` | **bug on both platforms** | Fix mappings on both. See §6. |
| GET /dashboard/host — `lastEvent.staffCount/staffList` | web reads `data?.staffCount || data?.staffList?.length` | mobile passes through; not used in current UI | Backend does not emit staff fields | Web button always hidden. Either remove web button code or extend backend to populate. |
| GET /dashboard/vendor | web hook exists, no consumer | no hook exists at all | Implemented | Either delete the route + web hook, or wire both UIs. |

### 4.6 Loading / error / empty states
- `AdminDashboardScreen.js:53-64` — has loading spinner + `useEffect` toast on error. ✅ But the empty state (no data) is implicit — when `data` is `undefined` the screen still renders (with `—` placeholders). Acceptable.
- `HomeScreen.js:35` — passes `loading`, `error`, `hasEvents`, etc. into `HomeHeaderContent`. Coverage looks good; verify `HomeHeaderContent` actually renders distinct loading vs error vs empty.
- `_components/AdminTopVendors.js`, `AdminRecentHosts.js`, `AdminRecentEvents.js`, `AdminSubscriptionsChart.js` — receive their data already extracted and sliced. They render `null` / empty when data is empty (verified visually in lines 51-78 of `AdminDashboardScreen.js`). Acceptable.

### 4.7 Comment hygiene
- `services/dashboardService.js:5-9` — `// M-13: routed through apiFetch ...` → remove or compress to one line about the auth-refresh behavior. The `M-13:` marker must go.
- `services/adminDashboardService.js:1-12` — `Phase 4 W0-AUTH:` header → remove.
- `services/adminDashboardService.js:281-285, 287-289` — `// H-14: Phase 2 admin endpoints — were defined backend-only.` and `// H-14: SUPER_ADMIN can assign a subscription to a host directly. Audit log is wired server-side.` → remove the `H-14:` markers; keep the *audit log is wired server-side* sentence as a one-line note.
- `components/home/LastEvent.js:32-34` — `// Phase 4b W2-POLL-FAIL: gate logic moved to useEventActionGate ...` → remove the marker; one-line replacement: `// Centralized action-gate logic so dashboard, single-event header, and web mirror agree.`
- `components/home/LastEvent.js:42, 59, 73, 77` — `// Format date and time`, `// Match web's getUnifiedStatus — based on event.status`, `// Match web stats keys: pending / declined / approved`, `// Format date and time` — **REMOVE.** "Match web stats keys" is exactly the kind of cross-platform marker that goes stale; once the bug in §3.4(j) is fixed, the comment is wrong.
- `hooks/queries/useEvents.js:100-103` — `* Matches web frontend's useHostDashboard -> GET /dashboard/host` and `* Returns: { stats, lastEvent, subscription, hasEvents }` — keep the return-shape line, drop the "Matches web frontend" line (cross-ref to web is brittle).

---

## 5. Cross-Platform API Consumption Diff

| Endpoint | Aspect | Web | Mobile | Backend truth | Action |
|----------|--------|-----|--------|---------------|--------|
| GET /dashboard/admin | path | `/dashboard/admin` (via `API_PATHS.dashboard.getAdminDashboard`) | `/dashboard/admin` (literal in `adminDashboardService.js:79`) | `/dashboard/admin` | Replace mobile literal with `ENDPOINTS.DASHBOARD.ADMIN`. |
| GET /dashboard/admin | query.period | sent | sent | accepted | OK |
| GET /dashboard/admin | query.from / to | sent | not sent | accepted | Intentional — mobile no UI |
| GET /dashboard/admin | response.statsCards[].title | translated via local map + fallback to literal | rendered raw | English literals | Backend should emit a `titleKey` — single contract |
| GET /dashboard/admin | response.charts.subscriptionsByPlan | rendered (PieChart) | rendered (custom chart) | emitted | OK |
| GET /dashboard/admin | response.charts.revenue / tickets | web reads them; backend does not emit | mobile does not read | not emitted | Web has a UI bug (always-empty pies). Fix web. |
| GET /dashboard/admin | response.recentActivity.{hosts,events} | rendered | rendered | emitted | OK |
| GET /dashboard/admin | response.bestVendors | rendered (`Bottom`/`TopVendors`) | rendered (`AdminTopVendors`) | emitted | OK |
| GET /dashboard/admin | response.analytics (whitelabel) | rendered (alt stats grid + monthly events bar + status list) | not rendered | emitted | Mobile gap. Document as intentional or build UI. |
| GET /dashboard/host | path | `/dashboard/host` | `/dashboard/host` | OK | OK |
| GET /dashboard/host | response.stats.{totalEvents,activeEvents,draftEvents,endedEvents} | rendered | rendered | OK | OK |
| GET /dashboard/host | response.lastEvent.stats.{pending,approved} | reads | reads | **NOT emitted** (backend has confirmed/declined/invited/checkedIn) | Both platforms wrong. Fix both. |
| GET /dashboard/host | response.lastEvent.entryTime | reads as fallback | reads as fallback | not emitted | Drop fallback both sides. |
| GET /dashboard/host | response.lastEvent.staffCount/staffList | reads | not used | not emitted | Drop on web. |
| GET /dashboard/host | response.lastEvent.location.{address,city} | reads as fallback | reads as fallback | location is a flat string | Drop nested-object fallback both sides. |
| GET /dashboard/host | response.subscription.eventsLimit | reads | not surfaced in UI | emitted | OK |
| GET /dashboard/vendor | path | `/dashboard/vendor` (hook exists, dead) | not consumed | implemented | Delete or wire up. |

---

## 6. Suspected Bugs Worth Verifying

1. **`lastEvent.stats.pending`/`approved` on web AND mobile** → backend emits `confirmed`, `declined`, `invited`, `checkedIn`. Both clients render `0` in the response-rate panel because the keys don't exist. **High confidence — confirmed by reading both files. Run the host home page in browser + emulator to confirm visually before §7.B/§7.C edits.**
2. **`charts.revenue` and `charts.tickets` pie charts (web admin dashboard)** → backend doesn't emit either. Both pies render with `total = 0` and no slices. **High confidence — confirmed via grep.**
3. **`hasStaff` on web `LastEventStats.jsx:44`** → backend doesn't emit `staffCount` or `staffList` on `lastEvent`. The "Notify Staff" button never renders. **High confidence.**
4. **`useDashboard.js useAdminDashboard` is dead code** — no consumer imports it. Confirm with `Grep` over `labbe/` for `from "@/hooks/reactQueryHooks/useDashboard"` callers of `useAdminDashboard` (only `useHostDashboard` should be used from this file).
5. **`useDashboard.js useVendorDashboard`** — same: zero consumers. Confirm before deletion.
6. **`Bottom.js:9` has commented-out `<ActivitySummery/>`** — the imported `ActivitySummery` is unused. Verify with grep, then delete the import + the file under `bottom/activitySummery/` if no other consumer exists.
7. **`adminStore.js:380`** — `await adminDashboardService.dashboard.getStats(token);` is a side-channel into the dashboard endpoint outside React Query. Investigate why a Zustand store fetches dashboard data (likely a leftover from pre-React-Query days). Likely dead, but confirm before deleting.
8. **Whitelabel mobile admin dashboard** — backend emits an `analytics` object for whitelabel tenants but mobile renders the standard non-whitelabel layout. PM should confirm whether mobile parity is required.
9. **Plan-limits naming drift** — `planLimits.maxEvents` vs `.events`, `.maxGuestsPerEvent` vs `.guests` (backend `dashboard.service.js:396-398`). The fallback chain implies plans are mid-rename. Confirm with the plans-module owner before deleting either branch.

---

## 7. Implementation Plan (Ordered)

Apply changes in this order. Each item ends with a checkbox the agent will tick during Phase 2.

### 7.A Backend
- [ ] **A.1** Decide on `/dashboard/vendor`: delete route + controller + service method + Swagger block, OR park. Default: delete (no consumer). (`dashboard.routes.js:106-110`, `dashboard.controller.js:31-38`, `dashboard.service.js:411-450`)
- [ ] **A.2** Add `dashboard.validation.js` with `adminDashboardQuery` Joi schema; wire `validate(adminDashboardQuery, 'query')` into the admin route. (new file; `dashboard.routes.js:51-56`)
- [ ] **A.3** Add `.lean()` to read-only Mongoose queries in `dashboard.service.js`: `User.find` (line 135), `Event.find` (line 136), `Subscription.findOne` (line 311), `Event.findOne` (line 313), `Guest.find` (line 322), `User.findById` + `Service.find` in vendor service (lines 412, 415). (file:lines listed)
- [ ] **A.4** Parallelize the two independent reads in `getVendorDashboardStats` via `Promise.all`. (`dashboard.service.js:412-415`) — only if A.1 keeps the endpoint.
- [ ] **A.5** Replace `||` with `??` for plan-limit fallbacks where `0` is a legitimate value. (`dashboard.service.js:339, 342, 396-398`)
- [ ] **A.6** **(contract change)** Restructure `statsCards[]` to emit `{ id, icon, titleKey, value, subtitle: { count, labelKey }, highlight }` instead of pre-formatted English strings. Both web and mobile consumers will be updated in §7.B/§7.C. (`dashboard.service.js:217-260`)
- [ ] **A.7** Update Swagger: add `from`/`to` query params on `/dashboard/admin`; add concrete response schemas (`AdminDashboardStats`, `HostDashboardStats`) in `config/swagger.js` and reference via `$ref`. (`dashboard.routes.js:24-83`, `config/swagger.js`)
- [ ] **A.8** Comment hygiene pass: remove markers/banners listed in §2.7 (4 sites). (`dashboard.service.js:16, 283, 363-366, 380, 387, 389, 401`)

### 7.B Web
- [ ] **B.1** Delete the dead `useAdminDashboard` and `useVendorDashboard` exports from `hooks/reactQueryHooks/useDashboard.js`; the canonical `useAdminDashboard` lives in `useAdmin.js`. (`useDashboard.js:11-26, 45-60`)
- [ ] **B.2** Replace `responseData?.data || responseData` fallback in `DashboardStats.jsx:78`, `DashboardCharts.jsx:48`, `RecentActivity.jsx:62` with the canonical `responseData?.data` (or have apiClient unwrap once and read `responseData` directly — pick one and apply consistently). (file:lines)
- [ ] **B.3** Delete the dead legacy fallback branch in `DashboardStats.jsx:146-184` (lines 146-184 entirely). (file:line)
- [ ] **B.4** Remove revenue + tickets pie charts in `DashboardCharts.jsx:144-157` until backend emits them. Keep subscriptions pie. **Style preservation:** preserve the `.chartsGrid` / `.chartBox` classes; just remove the two `<div className={styles.chartBox}>` blocks and their contents. (file:line)
- [ ] **B.5** Update `DashboardStats.jsx` to consume the new `statsCards` shape (after A.6) — translate by `titleKey`; render subtitle as `t(card.subtitle.labelKey, { count: card.subtitle.count })`. (file:line)
- [ ] **B.6** Migrate `RecentActivity.jsx:127-154` to read backend's actual fields (`id`, `name`, `email`, `status`, `createdAt`; events: `id`, `title`, `date`, `status`, `host`); drop `_id`/`username`/`created_at`/`event.id||event._id` fallbacks. (file:line)
- [ ] **B.7** Fix `LastEventStats.jsx` data mapping to match backend: `data.stats.invited` (not `pending`), `data.stats.confirmed` (not `approved`); drop `data.entryTime`, `data.location?.address/.city`, `data.staffCount`, `data.staffList`. Remove the staff "Notify" button (or keep behind a feature flag if backend will start emitting). (`LastEventStats.jsx:44, 82, 210, 247, 256, 265, 277, 284, 292, 418, 479`)
- [ ] **B.8** Replace `responseData?.data || responseData` fallback in `LastEventStats.jsx:27, HostDashboardContent.jsx:27` with the canonical path. (file:line)
- [ ] **B.9** Replace raw `"Loading..."` and `"Error: ${error.message}"` in `HostDashboardContent.jsx:20-25` and `LastEventStats.jsx:47` with `<SimpleLoading/>` and an `errors.loadFailed`-keyed translated block. (file:line)
- [ ] **B.10** Wrap `app/[lang]/admin-dash/page.js` and `app/[lang]/host/page.js` in `<ErrorBoundary>` per B19. (file)
- [ ] **B.11** Split `LastEventStats.jsx` (572 lines) into 4 sub-components per §3.2. **Style preservation:** every class name and every `LastEventStats.module.css` import must remain identical. (file:line)
- [ ] **B.12** Verify `ui/admin/dashboard/wrapper/Wrapper.js` (442 lines) is dead by grepping consumers; if so, delete. Otherwise out of scope. (file)
- [ ] **B.13** Verify `bottom/activitySummery/ActivitySummery.js` is dead (commented out in `Bottom.js:9`); if so, delete the file and remove the import. (file)
- [ ] **B.14** Comment hygiene pass: remove markers listed in §3.7 (3 sites). (`LastEventStats.jsx:36-37, 67, 71, 92`; `useDashboard.js:7-8`)

### 7.C Mobile
- [ ] **C.1** Move `dashboard.getStats` out of `services/adminDashboardService.js` into `services/dashboardService.js`, replacing the literal `/dashboard/admin` with `ENDPOINTS.DASHBOARD.ADMIN`. Update `useAdminStats` to import from the new location. (`adminDashboardService.js:75-81`, `dashboardService.js`, `useAdmin.js:3, 10`)
- [ ] **C.2** Move `useHostDashboard` from `hooks/queries/useEvents.js:105-114` to a new `hooks/queries/useDashboard.js`. Update import in `screens/host/HomeScreen.js:22`. (file:lines)
- [ ] **C.3** Fix mobile `LastEvent.js` data mapping: `event.stats.invited` (not `pending`), `event.stats.confirmed` (not `approved`); drop `entryTime`/`time`/`eventDetails?.time` fallback chain (read only `event.time`); drop `event.location.address/.city/typeof string` fallback chain (read only `event.locationName || event.location`). (`LastEvent.js:53, 74-76, 78-83`)
- [ ] **C.4** Replace hardcoded Arabic literals in `LastEvent.js:6-11, 28, 62-68` with `t(...)` keys. Add the keys list to §8 for the user to approve. (file:lines)
- [ ] **C.5** Update `AdminStatsGrid.js` to translate by `titleKey` after backend A.6 lands. (file:line)
- [ ] **C.6** Decide: delete the unused `ENDPOINTS.DASHBOARD.VENDOR` constant if the route is deleted in A.1. (`config/api.js:43`)
- [ ] **C.7** Investigate `adminStore.js:380` — likely dead; remove if unused. (file:line)
- [ ] **C.8** Split `components/home/LastEvent.js` (452 lines) into 3-4 sub-components per §4.2. **Style preservation:** every `StyleSheet.create({...})` value moved verbatim. (file:line)
- [ ] **C.9** Either extract a sub-component from `EventTemplates.js` (354 lines) or accept the 4-line overage; recommend extraction for hygiene. (file:line)
- [ ] **C.10** Comment hygiene pass: remove markers listed in §4.7 (5 sites). (`dashboardService.js:5-9`; `adminDashboardService.js:1-12, 281-285, 287-289`; `LastEvent.js:32-34, 42, 59, 73, 77`; `useEvents.js:100-103`)

### 7.D Cross-platform alignment (do AFTER A/B/C)
- [ ] **D.1** Verify both web and mobile read the same fields from `lastEvent.stats` (`invited`, `confirmed`, `declined`, `checkedIn`). Re-grep for `stats.pending` / `stats.approved`.
- [ ] **D.2** Verify both web and mobile read the new `statsCards` shape correctly after A.6.
- [ ] **D.3** Verify whether mobile whitelabel admins should see `analytics` UI parity with web — file follow-up if confirmed.
- [ ] **D.4** Manual smoke check: log in as super-admin (web), whitelabel-admin (web), host (web + mobile), confirm every screen renders the correct numbers and no console errors.

---

## 8. Locale-key additions required

(Listed for the user — agent does NOT modify locale JSON without explicit approval.)

**Web (`localization/locales/{en,ar}/`):**
- `home-events.common.loading` (en: "Loading…", ar: "جارٍ التحميل…")
- `home-events.errors.loadFailed` (en: "Failed to load dashboard", ar: "تعذّر تحميل لوحة التحكم")
- `home-events.lastEvent.untitled` (en: "Untitled event", ar: "مناسبة بدون عنوان")
- `adminDashboard.stats.<id>.title` and `adminDashboard.stats.<id>.subtitleLabel` keys to back the new `titleKey`/`labelKey` contract from A.6 (one each for `hosts`, `vendors`, `events`, `subscriptions`, `tickets`).

**Mobile (`localization/locales/{en,ar}/`):**
- `home.lastEvent.dropdown.eventDetails` (en: "Event details", ar: "تفاصيل المناسبة")
- `home.lastEvent.dropdown.guestList` (en: "Guest list", ar: "قائمة الضيوف")
- `home.lastEvent.dropdown.invitationDesign` (en: "Invitation design", ar: "تصميم الدعوة")
- `home.lastEvent.dropdown.invitationCustomization` (en: "Invitation customization", ar: "تخصيص الدعوة")
- `home.lastEvent.untitled` (en: "Untitled event", ar: "مناسبة بدون عنوان")
- `home.lastEvent.status.draft|scheduled|live|completed|suspended` (mirror web `home-events.lastEvent.status.*` values)
- `admin.dashboard.stats.<id>.title` / `subtitleLabel` to back A.6.

---

## 9. Rollback plan

For each implementation item, the rollback is a `git revert` of its commit. Items that touch the public response shape (A.6, A.1) are coupled across backend + both clients — revert all three commits together if a regression is found. No DB schema changes are introduced by this plan.

---

## 10. Acceptance checklist (run after Phase 2)

- [ ] No file in module exceeds the cap.
- [ ] All endpoints have current Swagger.
- [ ] No duplicate endpoints / hooks remain (`useDashboard.js` no longer exports `useAdminDashboard`/`useVendorDashboard`).
- [ ] Web + Mobile call the same paths with the same shapes for every endpoint.
- [ ] No fallback chains in dashboard data mapping (§3.4 / §4.3 entries all resolved).
- [ ] No `// FLOW-…` / `// PHASE-…` / `// W0-…` / `// M-…` / `// H-…` markers in module's surface area.
- [ ] `npm run lint` clean (or no new warnings introduced) on web + mobile.
- [ ] Visual smoke test: admin dashboard, host home, both at `?period=month` and a non-default period — every page/screen looks identical before/after the refactor (modulo the bug fixes called out in §6).
- [ ] Backend: `npm test` clean (no dashboard-specific tests changed semantics).

---

**Stop. Awaiting green light from the user. Reply `green light` (or with edits) to begin Phase 2.**
