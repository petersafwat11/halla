#!/usr/bin/env node
/**
 * Phase 4 static contract checks.
 *
 * Run from repo root:
 *   node docs/implementation/phase-4-smoke-tests/static-checks-4.js
 *
 * Mobile-only phase — no live backend tests. These checks confirm:
 *   - apiClient exposes the 30s timeout + AbortController machinery.
 *   - Raw `fetch(` calls outside apiClient are gone (every service /
 *     hook routes through apiFetch or fetchWithTimeout).
 *   - ErrorBoundary exists and is mounted in App.js.
 *   - I18nManager.forceRTL is called from LanguageProvider.
 *   - Locale helpers (formatCount, formatDateTime, localizeDigits)
 *     exist and at least one consumer uses them.
 *   - EventSummary exposes the scheduled-launch row + template details.
 *   - Mobile services for staff revoke / QR rotate / GAT revoke exist.
 *   - GuestListItem / ModeratorListItem expose the new long-press
 *     callbacks.
 *   - Infinite-scroll admin hooks exist + AdminFlatList accepts
 *     onLoadMore/hasMore/loadingMore.
 *   - SetupPasswordScreen exists, screen registered in navigator,
 *     deep-link config present in App.js.
 *   - Download helper exists and is wired into the host event-list
 *     and per-event guest export buttons.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..", "..");
const checks = [];

const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const exists = (p) => fs.existsSync(path.join(ROOT, p));

const check = (name, fn) => {
  try {
    fn();
    checks.push({ name, ok: true });
  } catch (e) {
    checks.push({ name, ok: false, error: e.message });
  }
};
const expect = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

// ─── W0-AUTH ──────────────────────────────────────────────────────────────────
check("W0-AUTH: apiClient exports DEFAULT_TIMEOUT_MS + AbortController timeout", () => {
  const src = read("halla-mobile/services/apiClient.js");
  expect(src.includes("DEFAULT_TIMEOUT_MS"), "DEFAULT_TIMEOUT_MS not exported");
  expect(src.includes("AbortController"), "AbortController missing");
  expect(src.includes("TimeoutError"), "TimeoutError name missing");
  expect(src.includes("fetchWithTimeout"), "fetchWithTimeout helper missing");
});

check("W0-AUTH: no raw fetch( outside apiClient in services/hooks", () => {
  const targets = [
    "halla-mobile/services/authService.js",
    "halla-mobile/services/settingsService.js",
    "halla-mobile/services/plansService.js",
    "halla-mobile/services/subscriptionService.js",
    "halla-mobile/services/templateService.js",
    "halla-mobile/services/ticketsService.js",
    "halla-mobile/services/postEventService.js",
    "halla-mobile/services/hostPostEventService.js",
    "halla-mobile/services/adminDashboardService.js",
    "halla-mobile/services/eventsService2.js",
    "halla-mobile/services/staffService.js",
    "halla-mobile/hooks/mutations/useEventMutations.js",
    "halla-mobile/hooks/mutations/useTicketMutations.js",
    "halla-mobile/hooks/useLocations.js",
  ];
  for (const f of targets) {
    const src = read(f);
    // Match `await fetch(` not preceded by `apiF` or `fetchWith`.
    const matches = src.match(/await\s+fetch\(/g) || [];
    expect(matches.length === 0, `${f} still has ${matches.length} raw fetch call(s)`);
  }
});

check("W0-AUTH: vendorService reads token from useAuthStore (not AsyncStorage)", () => {
  const src = read("halla-mobile/services/vendorService.js");
  expect(src.includes("useAuthStore"), "vendorService not pulling token from useAuthStore");
  expect(!src.includes('AsyncStorage.getItem("authToken")'), "vendorService still reads stale AsyncStorage authToken key");
});

// ─── W0-ERR ───────────────────────────────────────────────────────────────────
check("W0-ERR: ErrorBoundary exists + wraps App tree", () => {
  expect(exists("halla-mobile/components/shared/ErrorBoundary.js"), "ErrorBoundary file missing");
  const eb = read("halla-mobile/components/shared/ErrorBoundary.js");
  expect(eb.includes("componentDidCatch"), "componentDidCatch missing");
  expect(eb.includes("getDerivedStateFromError"), "getDerivedStateFromError missing");
  const app = read("halla-mobile/App.js");
  expect(app.includes("ErrorBoundary"), "ErrorBoundary not imported/mounted in App.js");
  expect(/<ErrorBoundary>[\s\S]*<\/ErrorBoundary>/.test(app), "ErrorBoundary not wrapping the tree");
});

// ─── W0-RTL ───────────────────────────────────────────────────────────────────
check("W0-RTL: I18nManager.forceRTL called + locale helpers exist", () => {
  const lp = read("halla-mobile/localization/providers/LanguageProvider.js");
  expect(lp.includes("I18nManager.forceRTL"), "I18nManager.forceRTL not called");
  expect(lp.includes("applyRTLForLocale"), "applyRTLForLocale helper missing");
  expect(exists("halla-mobile/utils/locale.js"), "utils/locale.js missing");
  const loc = read("halla-mobile/utils/locale.js");
  expect(loc.includes("formatCount"), "formatCount export missing");
  expect(loc.includes("formatDateTime"), "formatDateTime export missing");
  expect(loc.includes("localizeDigits"), "localizeDigits export missing");
  expect(loc.includes("ar-SA"), "ar-SA locale not referenced");
});

check("W0-RTL: at least one consumer uses formatCount", () => {
  const stats = read("halla-mobile/components/events/StatsCards.js");
  expect(stats.includes("formatCount"), "StatsCards does not use formatCount");
});

// ─── W1-FLOW-11-F01 + W1-WIZ5 ────────────────────────────────────────────────
check("W1-FLOW-11-F01 + W1-WIZ5: EventSummary surfaces schedule + template fields", () => {
  const es = read("halla-mobile/components/createEvent/EventSummary.js");
  expect(es.includes("sendSchedule"), "sendSchedule not read");
  expect(es.includes("scheduleDate"), "scheduleDate not read");
  expect(es.includes("scheduleTime"), "scheduleTime not read");
  expect(es.includes("renderScheduleText"), "renderScheduleText helper missing");
  expect(es.includes("Launches immediately"), "fallback string missing");
  expect(es.includes("visualTemplateFields"), "template fields not iterated");
  expect(es.includes("resolveFieldValue"), "resolveFieldValue helper missing");
});

// ─── W1-STATS ─────────────────────────────────────────────────────────────────
check("W1-STATS: EventsScreen passes eventStatus via options object", () => {
  const ev = read("halla-mobile/screens/EventsScreen.js");
  expect(/useSingleEventStats\(\s*selectedEventId,\s*\{\s*eventStatus/.test(ev),
    "EventsScreen does not pass { eventStatus: ... }");
});

// ─── W2-STAFF + W2-QR + W2-GAT ────────────────────────────────────────────────
check("W2-STAFF/QR/GAT: service exports + UI wiring", () => {
  const svc = read("halla-mobile/services/eventsService2.js");
  expect(svc.includes("export const revokeStaffAccess"), "revokeStaffAccess service missing");
  expect(svc.includes("export const rotateGuestQr"), "rotateGuestQr service missing");
  expect(svc.includes("export const revokeGuestAccess"), "revokeGuestAccess service missing");
  expect(svc.includes("/staff/${staffId}/revoke"), "staff revoke path missing");
  expect(svc.includes("/guests/events/${eventId}/guests/${guestId}/rotate-qr"), "QR rotate path missing");
  expect(svc.includes("/guests/events/${eventId}/guests/${guestId}/revoke-access"), "guest revoke-access path missing");

  const mod = read("halla-mobile/components/events/ModeratorListItem.js");
  expect(mod.includes("onRevoke"), "ModeratorListItem doesn't accept onRevoke");
  expect(mod.includes("isRevoked"), "ModeratorListItem doesn't render revoked state");

  const guest = read("halla-mobile/components/events/GuestListItem.js");
  expect(guest.includes("onRotateQr"), "GuestListItem doesn't accept onRotateQr");
  expect(guest.includes("onRevokeAccess"), "GuestListItem doesn't accept onRevokeAccess");

  const ses = read("halla-mobile/components/events/SingleEventStats.js");
  expect(ses.includes("handleModeratorRevoke"), "SingleEventStats missing handleModeratorRevoke");
  expect(ses.includes("handleGuestRotateQr"), "SingleEventStats missing handleGuestRotateQr");
  expect(ses.includes("handleGuestRevokeAccess"), "SingleEventStats missing handleGuestRevokeAccess");
});

// ─── W3-PAGE ──────────────────────────────────────────────────────────────────
check("W3-PAGE: AdminFlatList supports infinite scroll props", () => {
  const fl = read("halla-mobile/components/admin-dashboard/common/AdminFlatList.js");
  expect(fl.includes("onEndReached"), "onEndReached missing");
  expect(fl.includes("onEndReachedThreshold"), "threshold missing");
  expect(fl.includes("loadingMore"), "loadingMore prop missing");
  expect(fl.includes("hasMore"), "hasMore prop missing");
  expect(fl.includes("ListFooterComponent"), "ListFooterComponent missing");
});

check("W3-PAGE: useAdminInfinite hooks exist + admin screens migrated", () => {
  expect(exists("halla-mobile/hooks/queries/useAdminInfinite.js"), "useAdminInfinite file missing");
  const inf = read("halla-mobile/hooks/queries/useAdminInfinite.js");
  for (const name of [
    "useAdminHostsInfinite",
    "useAdminVendorsInfinite",
    "useAdminEventsInfinite",
    "useAdminTicketsInfinite",
    "useAdminWhitelabelsInfinite",
    "useAdminPaymentsInfinite",
    "useAdminModeratorsInfinite",
  ]) {
    expect(inf.includes(`export function ${name}`), `${name} not exported`);
  }
  expect(inf.includes("useInfiniteQuery"), "useInfiniteQuery not used");
  expect(/DEFAULT_PAGE_SIZE\s*=\s*20/.test(inf), "page size not 20");

  const screens = [
    "halla-mobile/screens/admin-dashboard/AdminHostsScreen.js",
    "halla-mobile/screens/admin-dashboard/AdminVendorsScreen.js",
    "halla-mobile/screens/admin-dashboard/AdminEventsScreen.js",
    "halla-mobile/screens/admin-dashboard/AdminTicketsScreen.js",
    "halla-mobile/screens/admin-dashboard/AdminWhitelabelsScreen.js",
    "halla-mobile/screens/admin-dashboard/AdminPaymentsScreen.js",
  ];
  for (const f of screens) {
    const src = read(f);
    expect(src.includes("Infinite"), `${f} not wired to *Infinite hook`);
    expect(src.includes("hasNextPage") && src.includes("fetchNextPage"),
      `${f} not consuming hasNextPage / fetchNextPage`);
  }
});

// ─── W3-WL ────────────────────────────────────────────────────────────────────
check("W3-WL: SetupPasswordScreen + service + navigator + deep link", () => {
  expect(exists("halla-mobile/screens/SetupPasswordScreen.js"), "SetupPasswordScreen missing");
  const sps = read("halla-mobile/screens/SetupPasswordScreen.js");
  expect(sps.includes("setupPasswordAPI"), "screen doesn't call setupPasswordAPI");

  const auth = read("halla-mobile/services/authService.js");
  expect(auth.includes("setupPasswordAPI"), "setupPasswordAPI export missing");

  const cfg = read("halla-mobile/config/api.js");
  expect(cfg.includes("SETUP_PASSWORD"), "SETUP_PASSWORD endpoint missing");

  const nav = read("halla-mobile/navigation/AppNavigator.js");
  expect(nav.includes("SetupPassword"), "navigator doesn't register SetupPassword");

  const app = read("halla-mobile/App.js");
  expect(app.includes("setup-password/:token"), "deep link path missing in App.js");
  expect(app.includes("halla://"), "halla:// scheme not in linking prefixes");
});

// ─── W3-ADMIN ─────────────────────────────────────────────────────────────────
check("W3-ADMIN: download helper + export buttons wired", () => {
  expect(exists("halla-mobile/utils/download.js"), "utils/download.js missing");
  const dl = read("halla-mobile/utils/download.js");
  expect(dl.includes("saveBlobAndShare"), "saveBlobAndShare export missing");
  expect(dl.includes("expo-file-system"), "expo-file-system import missing");
  expect(dl.includes("expo-sharing"), "expo-sharing import missing");

  const evList = read("halla-mobile/components/events/EventList.js");
  expect(evList.includes("exportEvents"), "EventList missing exportEvents import");
  expect(evList.includes("saveBlobAndShare"), "EventList missing saveBlobAndShare import");
  expect(evList.includes("handleExport"), "EventList missing handleExport");

  const ses = read("halla-mobile/components/events/SingleEventStats.js");
  expect(ses.includes("exportEventGuests"), "SingleEventStats missing exportEventGuests import");
  expect(ses.includes("handleExportGuests"), "SingleEventStats missing handleExportGuests");
});

// ─── Run + report ─────────────────────────────────────────────────────────────
let pass = 0;
let fail = 0;
for (const c of checks) {
  if (c.ok) {
    pass++;
    process.stdout.write(`PASS  ${c.name}\n`);
  } else {
    fail++;
    process.stdout.write(`FAIL  ${c.name}\n      ${c.error}\n`);
  }
}
process.stdout.write(`\n${pass} / ${pass + fail} PASS\n`);
process.exit(fail === 0 ? 0 : 1);
