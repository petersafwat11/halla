# Phase 4 — Report (Mobile Parity + Admin Gaps)

**Branch:** `claude/implement-phase-4-3lGwb`
**Cut from:** post-Phase-3 hardening (`4c6393c` on the same branch).
**Status:** complete pending Peter's manual verification (mobile work is verification-hostile).

## Wave summary

| Wave | Sub-track | Commit | Status |
|------|-----------|--------|--------|
| plan | branch + plan/progress/manual-verification | `e4481dc` | done |
| 0 | W0-AUTH — apiFetch + 30 s timeout + fetch consolidation | `4a13925` | done |
| 0 | W0-ERR — ErrorBoundary at App root | `3fc7d51` | done |
| 0 | W0-RTL — I18nManager.forceRTL + Arabic numerals helpers | `4f5b3e5` | done |
| 1 | W1-FLOW-11-F01 + W1-WIZ5 — EventSummary schedule row + template details | `9ba4717` | done |
| 1 | W1-STATS — EventsScreen options-object hook signature | `2f2c52b` | done |
| 2 | W2-STAFF + W2-QR + W2-GAT — long-press menus + services | `e14fb44` | done |
| 3 | W3-PAGE — infinite-query hooks + AdminFlatList + 6 screens | `599e006` | done |
| 3 | W3-WL — SetupPasswordScreen + halla:// deep link | `dd8395b` | done |
| 3 | W3-ADMIN — host event/guest export buttons + saveBlobAndShare | `203c7d8` | done |
| smoke | 13/13 phase-4 checks + 3de regression accepts options-object | `af60981` | done |
| review | post-merge audit + production-readiness fixes (see §"Review fixes") | (this commit) | done |

Total commits: 12.

## Review fixes (post-merge audit)

After the initial 11-commit Phase 4 landed, an end-to-end audit surfaced
three production-readiness issues that this commit closes:

1. **HIGH — Server-side filtering on admin lists.** `useAdminInfinite`
   hooks now accept a `filters` object that the React Query key
   incorporates, so changing `status` / `search` resets pagination to
   page 1 and refetches. Each of the seven admin screens
   (`AdminHostsScreen`, `AdminVendorsScreen`, `AdminEventsScreen`,
   `AdminTicketsScreen`, `AdminWhitelabelsScreen`, `AdminPaymentsScreen`,
   `AdminModeratorsScreen`) lifts its filter state and passes it
   through. Search is debounced 350 ms via the new `hooks/useDebouncedValue.js`
   so each keystroke doesn't refetch. The four `*List` components
   accept controlled `searchQuery`/`activeFilter` props with
   uncontrolled fallbacks for back-compat.
2. **HIGH — `_normalizePage` envelope handling.** Now reads pagination
   from BOTH the inner `data.data.pagination` (`sendSuccess` shape) and
   the outer `data.pagination` (`sendPaginated` shape). Honors
   `pagination.pages` (the actual key the backend uses, not
   `totalPages` which my first cut incorrectly assumed). Items still
   resolve from the collection key OR a top-level array.
3. **MEDIUM — `apiClient` null initial token.** Before issuing a
   request that would 401 because the access token is missing, `apiFetch`
   triggers the refresh-token path first. Saves a wasted round-trip
   and surfaces a real error if no refresh token exists either. Same
   `_refreshOnce` dedup guards against concurrent calls.

Polish landed in the same commit:

- `LanguageProvider._isExpoGo` switched to `Constants.appOwnership`
  (expo-constants) — the canonical SDK 54 API, no more brittle native-
  module chain.
- `SetupPasswordScreen` is fully bilingual via the new
  `auth.setupPassword.*` translation block (`ar` + `en`).
- `download.saveBlobAndShare` recognises iOS share-sheet cancel as a
  non-error path (returns `{ canceled: true }`) and rejects blobs
  larger than 50 MB before attempting base64 encoding (Hermes OOM
  guard). Consumers (`EventList`, `SingleEventStats`) no longer alert
  on user-cancel.
- `SingleEventStats` stacks the export FAB above the add FAB in a
  shared `fabColumn` so they don't overlap on small screens. Also
  added optimistic `guestActions` / `staffActions` flags so the
  revoked / rotated / access-revoked badges flip immediately on
  success and roll back on failure.
- `GuestListItem` renders `qrRotated` / `accessRevoked` badges for
  parity with `ModeratorListItem`'s `revoked` badge.
- `EventSummary.renderScheduleText` always copies the form `Date` via
  `getTime()` before mutating, eliminating the (theoretical) chance
  that `setHours` leaks back into the form's value.
- Filter-chip counts removed from all admin list filterOptions —
  with server-side pagination, the loaded-pages count is misleading.
  The chips show labels only.

`AdminModeratorsScreen` was migrated to the infinite hook in the same
pass (it was the one screen the initial Wave 3 missed).

## Findings closed

| ID | Status | Sub-track |
|----|--------|-----------|
| FLOW-11-F01 | closed | W1-FLOW-11-F01 |
| FLOW-23-F03 | closed (already shipped — verified by audit of `AssignTicketModal.js`) | pre-existing |
| FLOW-23-F04 / FLOW-28-F01..F04 | closed | W3-ADMIN (host exports) + admin Linking.openURL exports already shipped |
| Mobile staff revoke UI | closed (3de hand-off) | W2-STAFF |
| Mobile guest QR rotate UI | closed (3de hand-off) | W2-QR |
| Mobile manual GuestAccessToken revoke UI | closed (3de hand-off) | W2-GAT |
| Mobile stats polling consumer | closed (3de hand-off) | W1-STATS |
| Mobile pagination | closed (master plan) | W3-PAGE |
| Mobile request timeouts | closed (master plan) | W0-AUTH |
| Mobile centralized auth interceptor | closed (master plan) — `apiFetch` was the Phase 1a foundation; W0-AUTH finishes the migration | W0-AUTH |
| Mobile error boundary | closed (master plan) | W0-ERR |
| Mobile RTL via I18nManager.forceRTL | closed (master plan, gated for Expo Go) | W0-RTL |
| Mobile Arabic numerals (`toLocaleString('ar-SA')`) | closed (master plan) | W0-RTL |
| Whitelabel post-approval setup-password mobile | closed (master plan) | W3-WL |

## Smoke tests

```
phase-4-smoke-tests/static-checks-4.js         — 13 / 13 PASS
phase-3-smoke-tests/static-checks.js           — 19 / 19 PASS
phase-3-smoke-tests/static-checks-3de.js       — 16 / 16 PASS  (one assertion updated to accept the new options-object signature)
phase-2-smoke-tests/static-checks.js           — 13 / 13 PASS
phase-1-smoke-tests/auth-static-checks.js      — 13 / 13 PASS
phase-1-smoke-tests/utilities-static-checks.js —  5 /  5 PASS
phase-1-smoke-tests/timezone-unit.js           — 16 / 16 PASS
```

## Decisions locked (D1 – D8)

All eight decisions from the prompt landed verbatim. See `PHASE_4_PLAN.md §1`.

## Drive-by fixes (no separate finding ID — recorded for traceability)

- `vendorService` was reading the access token from a stale `AsyncStorage.getItem("authToken")` key; rewired to `useAuthStore.getState().token` while adding the 30 s axios timeout.
- `marketplaceService` migrated from the global `axios` default to a dedicated 30 s instance.
- `MapPicker` Nominatim search now uses `fetchWithTimeout` (was an unbounded `fetch`).
- `App.js` push-token registration uses `fetchWithTimeout`.
- `useEventMutations` + `useTicketMutations` + `useLocations` migrated through `apiFetch` / `fetchWithTimeout`.
- `WhitelabelDetailsScreen` admin features endpoint now flows through `apiFetch` (auto-refresh on 401).
- `StatsCards` is the first formatCount consumer — Wave 1 EventSummary adds two more (guest count + moderator count).
- `PaymentList` now reads aggregate stats from the dedicated `/admin/payments/summary` endpoint instead of the paginated list (the list response no longer carries totals once paginated).

## Anomalies surfaced

- **Search filter under infinite-scroll.** Admin list screens still filter the loaded pages client-side (`filteredHosts`, `filteredVendors`, etc.). When the user is searching for a row that lives on a not-yet-loaded page, they have to scroll to surface it. Acceptable for Phase 4 — a server-side search query (passed through the hook's `filters`) is the proper Phase 5 follow-up.
- **`I18nManager.forceRTL` is suppressed under Expo Go.** This is by design (the platform's documented limitation). Manual verification doc tells Peter to use a dev client / standalone build for the RTL check.
- **`saveBlobAndShare` uses `FileReader`.** Hermes ships one but older Metro/RN runtimes may not. The fallback path returns success but tells the caller the share sheet isn't available; if any user hits that case in production we can switch to an `ArrayBuffer → base64` polyfill.
- **Search-side filter on payments list won't see status changes from later pages** because the status filter is server-side now. Same trade-off as above — acceptable.
- **`xlsx` admin exports on the admin tier** still go through `Linking.openURL` (which opens the device browser with the auth token in the query string). For Wave 3 we kept that path unchanged because it works; switching admin exports to the new `saveBlobAndShare` is a low-cost follow-up. The host tier (where there was no export UX at all) gets the proper file-system share path now.
- **The Phase 4 prompt's W2-STAFF "carry-forward" mention** said the UI was already built and only the GET endpoint was missing. In reality neither was shipped — we built the UI from scratch. The backend `revokeStaffToken` endpoint accepts the `event.staffList[i]._id` directly (no intermediate StaffAccessToken doc lookup needed), so the missing GET endpoint did NOT block this phase. Phase 4b can still ship the GET endpoint when it lands.

## Hand-offs to Phase 5

- **Detox / Maestro mobile UI test baseline.** Carried over again — Phase 4 still relies on manual verification.
- **Server-side search on admin lists.** Push the search query through the hook so paginated screens search every page, not just loaded ones.
- **AuditLog enum extension** for `plan` / `addon` (Phase 2 hand-off, still open).
- **Audit-log-everywhere pass** for RSVP submit + check-in (Phase 3de hand-off).
- **Run** `scripts/backfill-guest-access-token-expiry.js --apply` during a quiet window (Phase 3de hand-off).
- **Web `/setup-password/{token}` page.** Backend mints the link to the web URL; we shipped the mobile deep-link path. The web page is still missing — see `halla-phase-4-extension-plan.md` §06 GAP 5.
- **Universal links** (apple-app-site-association + assetlinks.json) so the email link can open the mobile app directly without prompting the user to choose a handler.
- **Switch admin exports to `saveBlobAndShare`** for parity with host exports (currently they still open the device browser via `Linking.openURL`).

## Hand-offs to Phase 4b / 4c / 4d (per `halla-phase-4-extension-plan.md`)

- The 4b GET `/events/:eventId/staff-tokens` endpoint is now redundant for the revoke flow (mobile revokes by `event.staffList[i]._id`). Keep it on the 4b list if Peter still wants the UI to render an explicit "active staff tokens" view.
- 4c template-system unification builds on `renderField` — not touched in Phase 4 since EventSummary only displays template values from `visualTemplate.data` (already populated by StepThree's existing dynamic field renderer).
- 4d mobile update wizard inherits the new `saveBlobAndShare` + `apiFetch` plumbing.

## Stop gate

```
STOP — Phase 4 complete

Branch: claude/implement-phase-4-3lGwb
Commits (in wave order):
  e4481dc  [PHASE-4-PLAN]
  4a13925  [PHASE-4-WAVE0-AUTH]
  3fc7d51  [PHASE-4-WAVE0-ERR]
  4f5b3e5  [PHASE-4-WAVE0-RTL]
  9ba4717  [PHASE-4-WAVE1-FLOW-11-F01,WIZ5]
  2f2c52b  [PHASE-4-WAVE1-STATS]
  e14fb44  [PHASE-4-WAVE2-STAFF,QR,GAT]
  599e006  [PHASE-4-WAVE3-PAGE]
  dd8395b  [PHASE-4-WAVE3-WL]
  203c7d8  [PHASE-4-WAVE3-ADMIN]
  af60981  [PHASE-4-SMOKE]

Findings closed (~14):
- FLOW-11-F01 (mobile EventSummary scheduled-launch field)
- FLOW-23-F03 (mobile ticket assignment UI — already shipped, verified)
- FLOW-23-F04 / FLOW-28 (mobile exports — host events + per-event guests)
- (Mobile staff token revocation UI — 3de hand-off)
- (Mobile guest QR rotation UI — 3de hand-off)
- (Mobile manual GuestAccessToken revocation UI — 3de hand-off)
- (Mobile stats polling consumer — 3de hand-off)
- (Mobile pagination — master plan)
- (Mobile RTL setup — master plan, gated for Expo Go)
- (Mobile Arabic numerals — master plan)
- (Mobile centralized auth interceptor — master plan, finishes Phase 1a migration)
- (Mobile error boundary — master plan)
- (Mobile request timeouts — master plan)
- (Whitelabel post-approval setup-password mobile — master plan)

Smoke tests:
- Phase 4 specs: 13 / 13
- Phase 3 regression: 35 / 35
- Phase 2 regression: 13 / 13
- Phase 1 regression: 34 / 34

Manual verification: HANDED OFF
- Verification doc: docs/implementation/PHASE_4_MANUAL_VERIFICATION.md
- Items: ~24 across Wave 0 / 1 / 2 / 3
- Critical-path (MUST-VERIFY) items: ~12
- expo dev server: NOT RUNNING (start with `cd halla-mobile && npx expo start`)

Files produced:
- docs/implementation/PHASE_4_PLAN.md
- docs/implementation/PHASE_4_PROGRESS.md
- docs/implementation/PHASE_4_REPORT.md
- docs/implementation/PHASE_4_MANUAL_VERIFICATION.md
- docs/implementation/phase-4-smoke-tests/static-checks-4.js

Issues encountered:
- Phase 3de regression failed once because EventsScreen migrated to the
  options-object hook signature; the assertion was updated to accept
  both shapes (positional and options-object). No production-code fix
  required.

Drive-by fixes:
- vendorService AsyncStorage stale key.
- marketplace + map + locations + push-token + ticket/event mutations
  routed through apiFetch / fetchWithTimeout.
- WhitelabelDetailsScreen admin features now via apiFetch.
- PaymentList aggregate stats source.

Anomalies surfaced:
- Client-side search-under-pagination trade-off (see report).
- Expo Go I18nManager.forceRTL is a documented platform limitation.
- saveBlobAndShare relies on FileReader (Hermes-fine).

Hand-offs to Phase 5:
- Detox/Maestro baseline.
- Server-side search on admin lists.
- AuditLog enum (plan/addon).
- Audit-log-everywhere on RSVP + check-in.
- backfill-guest-access-token-expiry.js --apply.
- Web /setup-password/{token} page.
- Universal links for email-to-app deep linking.
- Admin exports → saveBlobAndShare parity.

Phase 4 status: COMPLETE (pending manual verification by Peter).
```
