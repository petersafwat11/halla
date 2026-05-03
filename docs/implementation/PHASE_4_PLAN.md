# Phase 4 — Plan (Mobile Parity + Admin Gaps)

**Branch:** `claude/implement-phase-4-3lGwb` (assigned by user; substitutes for `implementation/phase-4-mobile-parity-admin` from prompt)
**Cut from:** post-Phase-3 hardening on the same branch (last commit `4c6393c`).
**Source of truth:** `docs/implementation/halla-master-implementation-plan.md` §Phase 4 + the Phase 4 prompt provided by Peter (matches the wave structure below).

## 0. Pre-flight verification (Standing Rules §"Verify before locking the plan")

| # | Check | Result |
|---|-------|--------|
| 1 | Centralized auth token interceptor on mobile | `services/apiClient.js` exposes `apiFetch` (fetch-based wrapper, not axios). Token attached + 401 → `useAuthStore.refreshTokens()` → single retry. **13 services still use raw `fetch` directly** (authService, settingsService, plansService, postEventService, hostPostEventService, staffService, subscriptionService, adminDashboardService, templateService, eventsService2, ticketsService, marketplaceService still uses axios for vendor lookups, vendorService still uses axios). Phase 4 W0-AUTH = consolidate the missing services through `apiFetch` and add a 30 s timeout. |
| 2 | RTL setup state | `localization/providers/LanguageProvider.js:63` says "We don't use I18nManager in Expo Go as it doesn't work properly". RTL today is purely flexDirection + context. `index.js:5` repeats the same note. The Phase 4 prompt's D2 still requires `I18nManager.forceRTL(true)` for Arabic — we honor that for production builds (it works on standalone iOS/Android binaries; the Expo Go limitation is documented in the manual checklist). |
| 3 | EventSummary path | Confirmed `halla-mobile/components/createEvent/EventSummary.js`. Currently displays metrics (guests, moderators, date, location), invitation preview, description, confirm checkbox. **No scheduled-launch row, no template-data section.** |
| 4 | StepThree template-input divergence | StepThree already migrated to dynamic templates (Phase 4c-ish work shipped earlier). It writes `visualTemplate.data` after host hits "Confirm template". W1-WIZ5 = read those `data` keys back into EventSummary so the host can confirm before submit. |
| 5 | Admin list screens | Confirmed `screens/admin-dashboard/Admin{Hosts,Vendors,Events,Tickets,Whitelabels,Payments}Screen.js`. All call hooks like `useAdminEvents({ page: 1, limit: 50 })`. No infinite scroll today. |
| 6 | Backend admin endpoints support pagination | Confirmed: `admin.controller.js` reads `page` / `limit` for hosts, vendors, events, tickets, whitelabels, payments. Defaults are `page=1, limit=10`. No backend change needed — only mobile-side wiring. |

Drive-by surfaces (logged for handling within scope or hand-off):
- `useSingleEventStats` in `hooks/queries/useEvents.js` already polls per status (Phase 3de.4) — **W1-STATS is already shipped at the hook layer**; the only Phase 4 work is making sure `SingleEventStats` consumes it (today the screen receives `stats` as a prop from upstream `EventsScreen` which already calls the polling hook). Mark W1-STATS as a verification + documentation task.
- `AssignTicketModal.js` already exists for FLOW-23-F03 (Phase 3 era). Only the export buttons (FLOW-23-F04 / FLOW-28) need a UI; the service functions `exportEvents` / `exportEventGuests` already exist.

## 1. Locked decisions (D1 – D8 from the prompt)

**D1. Sub-agent concurrency cap.** Max 3 concurrent sub-agents. Wave-based execution. Inside this single Claude Code session, I work as the coordinator and execute each track sequentially within a wave to keep the diffs reviewable.

**D2. Foundation-first ordering (Wave 0):** AUTH, ERR, RTL — sequential, three commits.

**D3. FLOW-11-F01 fix shape.** EventSummary reads `scheduleDate` + `scheduleTime` from form context, renders a "Scheduled launch" row above the confirm row (RTL-aware) using the Phase 1 timezone helper. Fallback string: "Launches immediately on submit" (Arabic: "ينطلق فور التأكيد").

**D4. Mobile stats polling cadence.** Match Phase 3de.4 (30 s live / 5 min completed / off otherwise) via `useSingleEventStats(eventId, { eventStatus })`. The hook already implements it; W1-STATS verifies the consumer uses it.

**D5. Mobile pagination strategy.** FlatList `onEndReached` + `onEndReachedThreshold={0.5}`. Page size 20. Infinite scroll, append. New `useInfiniteQuery`-based hooks (or per-screen page-state) on top of existing services.

**D6. Mobile request timeouts.** 30 s globally via `AbortController` inside `apiFetch`. Override per call only when the call has a documented reason.

**D7. Verification approach.** Backend changes none → no Node IIFE specs needed for the page-state work because the backend is unchanged. Mobile-only changes get the manual checklist (`PHASE_4_MANUAL_VERIFICATION.md`). Existing Phase 3 / 2 / 1 smoke regressions still get run.

**D8. Out-of-scope items.** Bulk admin operations on mobile, marketplace search filters polish, notifications preferences UI on mobile — NOT in Phase 4. They stay open for Phase 5 discretionary.

## 2. Wave & sub-track map (file ownership)

| Wave | Sub-track | ID | Description | Primary files |
|------|-----------|----|-------------|---------------|
| 0 | Auth fetch consolidation + 30 s timeout | W0-AUTH | `apiFetch` adds AbortController/timeout; remaining services migrated through `apiFetch` (or refresh-aware shim). | `services/apiClient.js`, `services/{settings,plans,subscription,template,tickets,staff,postEvent,hostPostEvent,adminDashboard}Service.js`, raw fetches in `eventsService2.js`. |
| 0 | App-level error boundary | W0-ERR | Class component with reset, wraps NavigationContainer in `App.js`. | `components/shared/ErrorBoundary.js` (new), `App.js`. |
| 0 | RTL forceRTL + Arabic numerals helper | W0-RTL | Call `I18nManager.forceRTL` based on locale (guarded), add `lib/locale.js` helpers. | `localization/providers/LanguageProvider.js`, `utils/locale.js` (new). |
| 1 | EventSummary scheduled-launch row | W1-FLOW-11-F01 | Add row using form data; timezone-aware. | `components/createEvent/EventSummary.js`. |
| 1 | Mobile stats polling consumption | W1-STATS | Confirm `SingleEventStats` consumer pulls from polling hook; document. | `screens/EventsScreen.js`, `components/events/SingleEventStats.js` (verify only), `PHASE_3de_NOTES.md` (cross-reference). |
| 1 | EventSummary template details | W1-WIZ5 | Show `visualTemplate.data` keys per `template.fields` schema. | `components/createEvent/EventSummary.js`. |
| 2 | Staff revoke UI | W2-STAFF | Long-press `ModeratorListItem` → revoke action. | `components/events/ModeratorListItem.js`, `components/events/SingleEventStats.js`, `services/eventsService2.js` (new `revokeStaffAccess`). |
| 2 | Guest QR rotate UI | W2-QR | Long-press `GuestListItem` → rotate-qr action. | `components/events/GuestListItem.js`, `components/events/SingleEventStats.js`, `services/eventsService2.js` (new `rotateGuestQr`). |
| 2 | Guest access manual revoke UI | W2-GAT | Long-press `GuestListItem` → revoke-access action; collapses with W2-QR. | same files as W2-QR. |
| 3 | Mobile admin pagination | W3-PAGE | FlatList + onEndReached on each list screen; new infinite-query hooks. | `hooks/queries/useAdmin.js` (add infinite variants), `screens/admin-dashboard/Admin{Hosts,Vendors,Events,Tickets,Whitelabels,Payments}Screen.js`. |
| 3 | Whitelabel setup-password screen + deep-link | W3-WL | New `SetupPasswordScreen`, route mapped via `expo-linking`, navigator entry, service. | `screens/SetupPasswordScreen.js` (new), `services/authService.js`, `navigation/AppNavigator.js`, `app.json` linking config. |
| 3 | Mobile admin exports UI | W3-ADMIN | Export button on `AdminEventsScreen` (events) and `EventDetails` (guests) using existing service functions + `expo-file-system` + `expo-sharing`. Ticket assign UI already done. | `screens/admin-dashboard/AdminEventsScreen.js`, `components/events/EventDetails.js` or `SingleEventStats.js`, `services/eventsService2.js` (new download-and-share helper), maybe new `utils/download.js`. |

Wave gating: Wave N+1 starts only after every Wave N item is committed and re-read in the main session.

## 3. Standing rules (Phase 4)

- Branch: `claude/implement-phase-4-3lGwb` (per user's branch assignment).
- Commit prefix per sub-step: `[PHASE-4-WAVE<N>-<TRACK>]`.
- Smoke specs (if any) under `docs/implementation/phase-4-smoke-tests/` (Node IIFE pattern).
- Manual verification items recorded in `docs/implementation/PHASE_4_MANUAL_VERIFICATION.md` per sub-track.
- Update `PHASE_4_PROGRESS.md` after every commit.
- No two parallel sub-agents touch the same file (n/a within a single session — but tracked here for consistency with prior phases).
- AuditLog `targetType` enum is lowercase (carried gotcha — no new audit writes expected on mobile-only work).
- No `git add -A`; targeted `git add <file>` per commit.
- `I18nManager.forceRTL(true)` requires app reload; documented in manual verification — Peter may need to relaunch Expo Go or rebuild a dev client.

## 4. Out-of-scope (Phase 5 discretionary, per D8)

- Bulk admin operations on mobile (rating updates, bulk delete, bulk suspend) — web has full UI; real users do these from desktops.
- Marketplace search filters polish — vendors are findable; nicer filters are quality-of-life.
- Notifications preferences UI on mobile — settings exist; defaults are fine for most users.

## 5. Hand-offs from Phase 3 honored here

- Mobile staff revoke UI — Wave 2 (W2-STAFF).
- Mobile guest QR rotate UI — Wave 2 (W2-QR).
- Mobile manual GuestAccessToken revoke UI — Wave 2 (W2-GAT).
- Mobile event-detail data flow polish for `failureReason` / `attemptCount` / `launchLock` — verified during W1-STATS / W1-FLOW-11-F01 review (the failure banner already reads these fields; we only need to confirm `eventsService2.getEventById` returns them).

## 6. Hand-offs to Phase 5 surfaced now

- Detox / Maestro mobile UI test baseline.
- AuditLog enum extension for `plan` / `addon` (carried from Phase 2).
- Audit-log-everywhere pass for RSVP submit + check-in (Phase 3de hand-off).
- Web `/setup-password/{token}` page (the backend link target is web; mobile gets its own deep-link flow this phase, but the web page is still missing — see inventory `halla-phase-4-extension-plan.md` §06 GAP 5).

## 7. Stop gate criteria

- All 12 sub-tracks committed with their `[PHASE-4-WAVE<N>-<TRACK>]` commits.
- `PHASE_4_PROGRESS.md` reflects done/blocked status per track.
- `PHASE_4_REPORT.md` written.
- `IMPLEMENTATION_LEDGER.md` updated with FLOW-11-F01 / FLOW-23-F04 / FLOW-28 closures + the un-numbered hand-off items.
- Phase 1, 2, 3 smoke regressions re-run with no new failures.
- Branch pushed to `origin/claude/implement-phase-4-3lGwb`.
