# Phase 4 — Progress

Updated continuously as each sub-track lands.

## Wave 0 — Foundation (sequential)

- [x] W0-AUTH — `apiFetch` adds AbortController/timeout (30 s default); `fetchWithTimeout` exported for non-auth calls; raw `fetch(` removed from every service + hook + screen outside `apiClient`. `vendorService` now reads token from `useAuthStore` instead of stale AsyncStorage. `marketplaceService` uses a dedicated 30 s axios instance.
- [x] W0-ERR — `components/shared/ErrorBoundary.js` (class component, dev-mode stack, bilingual fallback, reload button). Wrapped above `SafeAreaProvider` in `App.js`.
- [x] W0-RTL — `applyRTLForLocale` in `LanguageProvider` calls `I18nManager.forceRTL` outside Expo Go; `utils/locale.js` ships `formatNumber/formatCount/formatCurrency/localizeDigits/formatDateTime`. `StatsCards` is the first consumer.

## Wave 1 — Critical mobile UI gaps

- [x] W1-FLOW-11-F01 — EventSummary "Scheduled launch" row with timezone-aware formatting + "Launches immediately on submit" fallback.
- [x] W1-STATS — `EventsScreen` migrated to the `useSingleEventStats(id, { eventStatus })` options-object shape; cadence is driven from the polling-aware hook (Phase 3de.4).
- [x] W1-WIZ5 — EventSummary surfaces template-input values (per `template.fields[].key`) so the host can confirm before submit.

## Wave 2 — 3de mobile hand-offs

- [x] W2-STAFF — `revokeStaffAccess` service + long-press menu in `ModeratorListItem` + revoked badge.
- [x] W2-QR — `rotateGuestQr` service + long-press menu in `GuestListItem`.
- [x] W2-GAT — `revokeGuestAccess` service + long-press menu (distinct option).

## Wave 3 — Pagination + whitelabel + admin

- [x] W3-PAGE — `useAdminInfinite.js` with hooks for hosts / vendors / events / tickets / whitelabels / payments / moderators (all `useInfiniteQuery`, page size 20). `AdminFlatList` accepts `hasMore / onLoadMore / loadingMore / endReachedThreshold` + footer spinner. Six admin screens migrated.
- [x] W3-WL — `SetupPasswordScreen` + `setupPasswordAPI` + navigator entry + `halla://setup-password/:token` deep link.
- [x] W3-ADMIN — `utils/download.js` (saveBlobAndShare via expo-file-system + expo-sharing). Export buttons on host `EventList` (all events) and `SingleEventStats` (per-event guests). Admin tier exports already worked via `Linking.openURL`. Ticket assign UI was already shipped (`AssignTicketModal`).

## Smoke / regression

- [x] Phase 4 specs (`static-checks-4.js`) — **13 / 13 PASS**.
- [x] Phase 3 regression (`static-checks.js` + `static-checks-3de.js`) — 19 + 16 PASS (after updating one assertion to accept the new options-object signature for `useSingleEventStats`).
- [x] Phase 2 regression — 13 / 13 PASS.
- [x] Phase 1 regression — `utilities-static-checks.js` 5 / 5 PASS, `auth-static-checks.js` 13 / 13 PASS, `timezone-unit.js` 16 / 16 PASS.

## Manual verification handoff

- [x] `PHASE_4_MANUAL_VERIFICATION.md` populated with checklists per sub-track (Wave 0 / 1 / 2 / 3) + MUST-VERIFY vs POST-VERIFY tagging.
- [ ] expo dev server: NOT STARTED in this session — start with `cd halla-mobile && npx expo start` before running the manual checklist.
