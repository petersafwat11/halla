# 22 — event-stats-visibility

## One-paragraph description
Different user roles see different event statistics. Host sees their own event's guest count, confirmed/declined/maybe counts, check-in count, messages sent/delivered/read, per-channel breakdown (SMS vs. WhatsApp). Whitelabel admin sees all events under their tenant. Admin/super_admin see platform-wide stats. Stats are aggregated from GuestModel (statuses, check-in, RSVP) and messaging delivery records. The flow defines role-based access control for stats endpoints and determines whether stats are computed fresh on each request or cached with TTL. Includes messaging stats (sent/delivered/read rates) and guest engagement metrics.

## Scope tags
- Role-based stats visibility (host, whitelabel_admin, admin, super_admin)
- Guest stats aggregation (total, confirmed, declined, maybe, checked-in)
- Messaging stats (sent, delivered, read, failed, SMS vs. WhatsApp)
- Real-time or cached stats computation
- Multi-tenant isolation (whitelabel tenant filtering)
- Event-level and platform-level dashboards

## Roles involved
- Host (sees own event stats)
- Whitelabel admin (sees all events under tenant)
- Admin / Super_admin (sees platform-wide stats)
- Backend (aggregates and filters stats by role)

## Entry points (cite file:line)
- `labbe-backend-/src/modules/events/events.routes.js:90-100` — GET /stats (platform or tenant-level stats, TBD)
- `labbe-backend-/src/modules/events/events.controller.js` — getEventStats() or similar
- `labbe-backend-/src/modules/events/events.service.js` — getEventStats() service method
- `labbe-backend-/src/modules/messaging/messaging.controller.js:279-296` — getDetailedStats endpoint
- `labbe-backend-/src/modules/messaging/messaging.service.js:758-859` — getDetailedStats() (messaging + RSVP breakdown)
- `labbe-backend-/src/modules/dashboard/dashboard.service.js` (TBD) — platform-level aggregations

## Exit / terminal states
- Host views event stats: confirmed count, declined count, maybe count, checked-in count, message stats returned
- Whitelabel admin views tenant stats: filtered to whitelabelId
- Super admin views platform stats: all events or top-level KPIs
- Stats cached (if applicable): subsequent requests within TTL return cached result
- Messaging stats queried: delivery rate, response rate, cost estimate returned

## Touched modules (file paths by repo)
**labbe-backend-:**
- `src/modules/events/events.routes.js` — event stats endpoints
- `src/modules/events/events.controller.js` — HTTP handlers
- `src/modules/events/events.service.js` — event stats service methods
- `src/modules/messaging/messaging.controller.js:279-296` — getDetailedStats handler
- `src/modules/messaging/messaging.service.js:758-859` — getDetailedStats() method
- `src/modules/dashboard/dashboard.service.js` (TBD) — platform-level stats
- `models/GuestModel.js` — .aggregate() for guest stats
- `models/EventModel.js` — event status, date, host filter
- `src/shared/middleware/rbac.js` — role-based access control checks
- `src/shared/middleware/whitelabel.js` — filterByWhitelabel middleware
- `src/shared/utils/cacheService.js` — Confirmed missing — no file matches `cacheService` in `labbe-backend-/src/`

**halla-mobile/:**
- `screens/HomeScreen.js` — host dashboard with stats cards; confirmed present
- `components/home/StatsCards.js` — stats display component; confirmed present (shows event-count aggregates only)

**labbe/:**
- `app/[lang]/admin-dash/page.js` — admin platform dashboard; confirmed present
- `app/[lang]/host/events/[id]/_components/GuestTable.jsx` — per-guest status in host event view; confirmed present
- `hooks/events/queries/useEventStats.js` — event stats hook; confirmed present
- `hooks/events/queries/useSingleEventStats.js` — single event stats hook; confirmed present

## Dependencies on other flows
- Flow 18 (messaging-webhook): updates guest RSVP status (impacts confirmed/declined counts)
- Flow 19 (guest-wa-interaction): updates guest status (impacts stats)
- Flow 20 (gate-scanner): updates check-in count
- Flow 21 (post-event-content): view counts

## Known divergences (web ↔ mobile, frontend ↔ backend)
- Backend: aggregation logic and role filtering
- Mobile: stats dashboard limited to host's own events (event-count aggregates only via StatsCards)
- Web: has admin dashboard with platform-wide views
- Messaging stats: detailed breakdown (sent/delivered/read/failed) visible to host on web; mobile confirmed missing (see parity table)

## Open questions

**Q1 — Stats caching: computed fresh or cached? TTL? Cache invalidation?**
- Type: B | Bucket: 3 (BUG — Peter's answer is wrong; no backend cache exists)
- Peter stated: "cached for 5m" — this is incorrect
- What the code actually does: `messaging.service.js getDetailedStats()` (lines 758-859) runs a raw MongoDB `$facet` aggregate on every request — NO cache layer, NO Redis, NO in-memory TTL. No `cacheService.js` exists anywhere in `labbe-backend-`
- The messaging stats endpoint (`/messaging/stats/{eventId}`) is called via a direct fetch in `labbe/services/messaging.js:92` — there is NO React Query `staleTime` wrapping this call at all. Every page load that shows stats triggers a fresh DB aggregate.
- Peter's "5m" claim has no basis in the current code. It may be a confused reference to the React Query staleTime values used on other queries (e.g., guests: 5m, tickets: 2-5m), but the stats query itself has no staleness configuration.
- ACTION REQUIRED: If server-side caching is desired (e.g., Redis with 5-min TTL keyed by `eventId`), it must be implemented. Also decide: when a webhook updates guest status (Flow 18), should the cache be purged? Currently there is nothing to purge.
- Sources: `labbe-backend-/src/modules/messaging/messaging.service.js:758-859` (no cache), `labbe/services/messaging.js:92` (direct fetch, no staleTime)

**Q2 — Platform-level dashboard: where is the super_admin view?**
- Type: A | Bucket: 1 (confirmed)
- Platform-wide stats dashboard is at `labbe/app/[lang]/admin-dash/page.js` (web)
- Mobile equivalent is in `halla-mobile/screens/HomeScreen.js` with `components/home/StatsCards.js`
- Mobile `StatsCards.js` shows event-count aggregates only (totalEvents, activeEvents, draftEvents, endedEvents) — it does NOT show guest-level or messaging stats at the platform level
- Sources: `halla-mobile/components/home/StatsCards.js`, `labbe/app/[lang]/admin-dash/page.js`

**Q3 — Whitelabel isolation: tenant stats only, or per-event detail?**
- Type: A | Bucket: 1 (correct — confirmed by middleware)
- Whitelabel admin sees only stats for their tenant's events, filtered by `whitelabelId`
- The `filterByWhitelabel` middleware (`src/shared/middleware/whitelabel.js`) injects the `whitelabelId` constraint into queries — whitelabel admin cannot query events outside their tenant
- They do NOT get host-level per-event detail drill-down; that scope is limited to the event's host or platform admins
- Sources: `labbe-backend-/src/shared/middleware/whitelabel.js`

**Q4 — Real-time messaging stats: cache invalidated immediately on webhook?**
- Type: B | Bucket: 3 (moot — there is no server-side cache to invalidate)
- Peter stated: "should be immediately" — this is aspirational, not descriptive of what exists
- Since `getDetailedStats()` has no backend cache (see Q1), every request already reads live DB data. Webhook status updates (Flow 18) are reflected on the next stats request with zero lag from a caching perspective
- However, if a server-side cache is added in the future, webhook handlers must invalidate the per-event stats cache entry at that time
- No action currently needed; revisit when/if server-side caching is implemented
- Sources: `labbe-backend-/src/modules/messaging/messaging.service.js:758-859`

**Q5 — Cost estimation: is 0.15 SAR per SMS accurate for Taqnyat?**
- Type: C | Bucket: 5 (mixed — hardcoded value, accuracy unknown, should be configurable)
- Code finding: `messaging.service.js:839` has `const estimatedCost = (smsSent * 0.15).toFixed(2)` — the 0.15 SAR figure is a magic number baked directly into the service
- Taqnyat API pricing: Taqnyat charges vary by message type, country, and plan tier. 0.15 SAR is a reasonable estimate for Saudi domestic SMS but may not match the actual account rate, and it does not account for WhatsApp message pricing (which is different)
- Peter's answer: "don't know about this, investigate please" — this question is intentionally left for investigation
- ACTION REQUIRED:
  1. Check the Taqnyat account dashboard or API response for the actual per-SMS rate
  2. Move the cost-per-SMS value to an environment variable or config (`TAQNYAT_SMS_COST_SAR`) so it can be updated without a code deploy
  3. WhatsApp messages currently have no cost estimate at all — add WhatsApp pricing if the Taqnyat plan charges for it
- Sources: `labbe-backend-/src/modules/messaging/messaging.service.js:839`

**Q6 — Export functionality: can hosts export event stats?**
- Type: A | Bucket: 1 (confirmed — export exists for guest tables)
- Guest export is implemented: `guests.service.exportGuestsExcel()` — hosts can export their guest list as Excel
- Convention: every data table in the project has an export button
- Stats themselves (counts, rates) are not separately exportable as a standalone report, but the underlying guest data table (which shows per-guest status and timestamp) is exportable
- Sources: `labbe-backend-/src/modules/guests/guests.service.js:259` (exportGuestsExcel)

**Q7 — Guest export: should it be visible to host?**
- Type: A | Bucket: 1 (confirmed — yes, every table has export)
- Guest export is host-accessible; the convention "every table has an export button" applies here
- `exportGuestsExcel()` is already implemented in the service and is a host-level operation (scoped to the host's event)
- Mobile admin dashboard should also expose this export per the mobile-parity Gate-1 rule

**Q8 — Messaging channel breakdown: SMS vs. WhatsApp only, or also email?**
- Type: A | Bucket: 3 (Peter's answer diverges from the schema — email channel exists in code)
- Peter stated: "only SMS/WhatsApp"
- Code finding: `GuestModel.js invitation.method` enum includes `"email"` alongside `"sms"` and `"whatsapp"` — a third channel is schema-defined
- The `getDetailedStats()` `methodBreakdown` facet groups by `invitation.method`, so email stats would appear if any guests were invited by email
- ACTION REQUIRED: Clarify whether email invitation is active. If email is not used in production, remove it from the enum to eliminate confusion. If it is used, the stats display must include it in the channel breakdown UI.
- Sources: `labbe-backend-/models/GuestModel.js` (invitation.method enum), `labbe-backend-/src/modules/messaging/messaging.service.js:813-816`

**Q9 — Time-series stats: snapshot only, or over time?**
- Type: A | Bucket: 1 (correct — current snapshot only)
- `getDetailedStats()` returns a point-in-time aggregate — totals and rates as of the moment of the request
- Per-guest status change timestamps exist on individual guest records (accessible in the guest table view), so users can see when each guest's status changed, but there is no time-bucketed aggregation (e.g., "confirmed per day" chart)
- This is the accepted design: no time-series charts, only current counts + the detailed guest table for temporal context
- Sources: `labbe-backend-/src/modules/messaging/messaging.service.js:758-859`

**Q10 — Performance: does GuestModel.aggregate() scale for 10k+ guests?**
- Type: A | Bucket: 1 (confirmed — indexes exist and are appropriate)
- `GuestModel.js` has the following relevant indexes confirmed by code inspection:
  - `{ event: 1, status: 1 }` (compound, line 204) — directly covers the primary facet grouping by event + status
  - `{ event: 1, "checkIn.checkedIn": 1 }` (compound, line 205) — covers the check-in facet
  - `{ event: 1 }` (single) — fallback for event-only scans
- The `$facet` aggregate runs all sub-pipelines after an initial `{ $match: { event: eventId } }`, which hits the `{ event: 1 }` or `{ event: 1, status: 1 }` index and works on the already-filtered document set
- For 10k guests per event this is well within acceptable MongoDB aggregate performance — documents per event are bounded, not platform-wide
- No additional indexes are needed for the current query pattern
- Sources: `labbe-backend-/models/GuestModel.js:200-210` (index definitions)

## Notes from answer pass
- **BUG (Q1)**: No server-side stats cache exists. Peter's "cached for 5m" refers to React Query client-side staleness only. If server-side caching is added later, implement cache invalidation on webhook status updates.
- **BUG (Q5)**: SMS cost (0.15 SAR) is hardcoded magic number. Must be moved to config/env variable. WhatsApp message cost is not estimated at all.
- **Schema divergence (Q8)**: `invitation.method` enum includes `email` — either remove it if unused, or ensure the stats UI displays email as a third channel alongside SMS/WhatsApp.
- **Confirmed correct (Q10)**: Compound indexes `{ event, status }` and `{ event, checkIn.checkedIn }` exist and cover the aggregate query pattern adequately.

---

## State machine

Stats are computed-on-demand — no state machine in the traditional sense. Key query paths:

```
Host requests event stats:
  GET /events/:id/stats → getEventStats() → Guest.aggregate() → { confirmed, declined, maybe, checkedIn }
  GET /messaging/stats/:eventId → getDetailedStats() → $facet aggregate →
    { methodBreakdown, statusBreakdown, rsvpBreakdown, estimatedCost }
  → returns combined stats; NO CACHE at any layer
  (Bucket-3 Q1 finding: Peter said "cached for 5m" — no cache exists in code)

Platform-level dashboard:
  SUPER_ADMIN → GET /admin/stats → dashboard.service.js aggregations → platform KPIs
  HOST → GET /events/stats → filtered to own events

WhiteLabel admin:
  GET via filterByWhitelabel middleware → scoped to whitelabelId
```

---

## Data handoffs

| Step | Producer | Consumer | Payload | Validation? |
|------|----------|----------|---------|-------------|
| GuestModel.aggregate($facet) | DB | getEventStats() / getDetailedStats() | `{confirmed, declined, maybe, checked_in, invited}` counts | No cache; direct DB query every request |
| getDetailedStats($facet) | messaging.service.js:758 | HTTP response | `{methodBreakdown, statusBreakdown, rsvpBreakdown, estimatedCost (0.15 SAR × smsSent)}` | No auth scope check beyond eventId matching |
| Host stats page (web) | labbe/services/messaging.js:92 | GET /messaging/stats/:eventId | Direct fetch, no React Query staleTime on this endpoint | No client-side cache |
| Mobile StatsCards | halla-mobile/components/home/StatsCards.js | GET /dashboard/stats or similar | Platform-level event counts (totalEvents, activeEvents, draftEvents) only | No guest-level or messaging stats on mobile home screen |

---

## Role variations

| Role | Stats visible | Scope |
|------|--------------|-------|
| Host | Own event stats: confirmed/declined/maybe/checkedIn + messaging breakdown (sent/delivered/read/failed + cost estimate) | Scoped by event ownership |
| Whitelabel Admin | Events within own whitelabel tenant | filterByWhitelabel middleware injects whitelabelId constraint |
| Admin / Moderator | Events within platform (whitelabelId=null) | filterByWhitelabel middleware confirmed at whitelabel.js |
| SUPER_ADMIN | Platform-wide KPIs | filterByWhitelabel sets whitelabelId=null scope |
| Staff | Real-time check-in stats only via GET /staff/events/:id/stats | StaffAccessToken scope; no messaging breakdown |

---

## Web ↔ mobile parity

| Feature | Web | Mobile | Gap? |
|---------|-----|--------|------|
| Event-level RSVP stats (confirmed/declined/maybe/checkedIn) | Confirmed at `labbe/app/[lang]/host/events/[id]/` via useEventStats.js and useSingleEventStats.js | Confirmed at `halla-mobile/screens/HomeScreen.js` + StatsCards.js — shows platform-level event counts only, not per-event RSVP breakdown | Gap: mobile shows event-count totals (active/draft/ended) but not per-event confirmed/declined/maybe breakdown on home screen |
| Messaging breakdown (sent/delivered/read/failed per channel) | Confirmed at `labbe/services/messaging.js:92` calls `/messaging/stats/:eventId` | Confirmed missing — no file in `halla-mobile/` matches `messagingStats` or `getDetailedStats`; `halla-mobile/services/messagingService.js` has `getInvitationStats()` but mobile hooks do not render a breakdown screen | Gap: messaging stats breakdown not surfaced on mobile |
| Per-guest status in guest table | Confirmed at `labbe/app/[lang]/host/events/[id]/_components/GuestTable.jsx` — status column with confirmed/declined/maybe/invited/checkedIn badges | Confirmed at `halla-mobile/screens/StaffPortalScreen.js` — per-guest status color badges (staff portal only, not host-side guest table screen) | Gap: mobile host view has no equivalent guest-table screen with status column; only staff portal shows per-guest status |
| Cost estimate display | Confirmed — `getDetailedStats()` returns `estimatedCost` in web stats | Confirmed missing — mobile messaging service calls `/messaging/stats/:eventId` but no cost display screen found in `halla-mobile/` | Gap: cost estimate not surfaced on mobile |
| Admin platform dashboard | Confirmed at `labbe/app/[lang]/admin-dash/page.js` | Confirmed at `halla-mobile/screens/HomeScreen.js` (StatsCards) — partial (event counts only) | Gap: mobile admin dashboard shows only counts; no charts, no messaging stats, no revenue breakdown |

---

## Edge cases & failure modes

1. **Stats stale during active send:** `sendBulk` updates guest records atomically per guest but platform-level `sentCount` is written only after the loop completes. If the loop is in progress, stats show 0 sent even if 50% of messages have already been dispatched.
2. **Concurrent stat reads during high-traffic RSVP period:** No cache means many simultaneous aggregation queries fire. Compound indexes exist (confirmed Q10) so scale is acceptable but not optimal — see FLOW-22-F01.
3. **email channel in methodBreakdown:** `GuestModel.invitation.method` enum includes `'email'`; `methodBreakdown` facet groups by this field. An `email` group will appear in stats responses if any guests were invited by email (see FLOW-22-F03).
4. **Hardcoded SAR cost per SMS:** `0.15` SAR may not match the actual Taqnyat account rate. WhatsApp messages have no cost estimate at all (see FLOW-22-F02).

---

## Findings

### FLOW-22-F01 — getDetailedStats runs raw DB aggregate on every request with no cache
- **Severity**: Medium
- **Type**: Bucket-3, Inconsistency
- **Location**: `labbe-backend-/src/modules/messaging/messaging.service.js:758-859`
- **Description**: Peter stated stats are "cached for 5 minutes." The code does the opposite: `getDetailedStats()` runs a raw MongoDB `$facet` aggregate on every single request. No Redis instance, no `cacheService.js`, no React Query `staleTime` exists for the stats endpoint at `labbe/services/messaging.js:92`. On a 10-15s polling interval with multiple concurrent viewers, this is one fresh DB aggregate per viewer per interval.
- **Why it matters**: For peak-load events (1000+ guests, multiple admins viewing stats simultaneously), uncached aggregation on the guest collection creates unnecessary DB load at exactly the wrong moment — during active invitation dispatch.
- **Recommended change**: Add a Redis cache keyed by `eventId` with a 30-second TTL on `getDetailedStats()`. Invalidate the cache key when `handleButtonResponse()` or `checkInGuest()` updates a guest in that event.
- **Related**: FLOW-19-F03

### FLOW-22-F02 — SMS cost is hardcoded magic number; WhatsApp cost unestimated
- **Severity**: Medium
- **Type**: BUG
- **Location**: `labbe-backend-/src/modules/messaging/messaging.service.js:839`
- **Description**: The estimated SMS cost is hardcoded as `smsSent * 0.15` where `0.15` is a SAR-per-SMS magic number with no environment variable, no configuration, and no documentation of its source. WhatsApp message cost is not estimated at all.
- **Why it matters**: If the actual Taqnyat account rate differs from 0.15 SAR (due to plan tier, volume discount, or price change), the cost estimate shown to hosts and admins is incorrect. Hosts may budget based on a wrong figure.
- **Recommended change**: Move the per-SMS cost to an environment variable `TAQNYAT_SMS_COST_SAR` (default `0.15`). Add a separate `TAQNYAT_WHATSAPP_COST_SAR` for WhatsApp message cost estimation. Document both in `.env.example`.
- **Related**: none

### FLOW-22-F03 — invitation.method enum includes undocumented 'email' channel
- **Severity**: Medium
- **Type**: Bucket-3, Inconsistency
- **Location**: `labbe-backend-/models/GuestModel.js` (invitation.method enum)
- **Description**: Peter stated the only channels are "SMS and WhatsApp." The code includes a third: `invitation.method` enum contains `"email"` alongside `"sms"` and `"whatsapp"`. `getDetailedStats()` groups by `invitation.method` in a `$facet` pipeline, so an `email` group will appear in the stats response if any guests were invited by email.
- **Why it matters**: If email is not used in production, the enum value creates confusion in stats dashboards (an empty email channel column appears). If email IS used somewhere in the codebase, the stats UI must surface it alongside SMS/WhatsApp. Either way, the current state mismatches Peter's stated intent.
- **Recommended change**: Confirm whether email invitation is ever used by checking for any code path that sets `invitation.method = 'email'`. If no such path exists, remove `'email'` from the enum. If it is used, add the email channel to the stats display UI on both web and mobile.
- **Related**: none

---

## Cross-flow notes

- **Flow 18 and 19**: Stats freshness depends on webhook updates (Flow 18) and RSVP writes (Flow 19) landing in the DB promptly. FLOW-22-F01 and FLOW-19-F03 are the same root cause — both `getDetailedStats()` and `getEventStats()` are uncached. A single Redis cache layer keyed by `eventId`, invalidated on RSVP and check-in writes, fixes both.
- **Flow 17 (bulk send)**: `sentCount`/`failedCount` are written only after the sequential send loop completes. Stats show 0 sent while the loop is in progress. Cache invalidation timing for FLOW-22-F01 must account for this — do not cache mid-send stats.
- **Flow 20 (check-in)**: `checkInGuest()` writes to the guest record and must be included in cache invalidation logic if server-side stats caching is added.
- **Flow 21 (post-event content)**: Post-event view counts (FLOW-21-F05 uniqueVisitors array) are separate from the guest-status stats in this flow. No join currently exists between post-event stats and the `getDetailedStats()` aggregate.
