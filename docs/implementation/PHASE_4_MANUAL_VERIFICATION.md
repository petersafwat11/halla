# Phase 4 — Manual Verification Checklist

> Phase 4 is mobile-heavy and there is no Detox / Maestro baseline, so visual confirmation is required on a real device or Expo Go before merging. Items marked **MUST-VERIFY** are merge-blockers; **POST-VERIFY** items can land first and be checked in a follow-up.

## How to run

```
cd halla-mobile
npx expo start
```

Open in Expo Go on your phone (or build a dev client for items that require `I18nManager.forceRTL` to take effect — Expo Go ignores it).

---

## Wave 0

### W0-AUTH — Centralized auth + 30 s timeout (MUST-VERIFY)

- [ ] Open the app while logged in. Navigate to "Events". Confirm events load (proves `apiFetch` token attach works).
- [ ] Force-expire the access token (set TTL low in dev or wait 15 min). Pull-to-refresh on Events. Confirm the screen recovers without a manual logout (proves auto-refresh on 401).
- [ ] Disable Wi-Fi mid-load. Confirm the request fails with a timeout error after ~30 s (rather than spinning forever).

### W0-ERR — Error boundary (MUST-VERIFY)

- [ ] Temporarily add `throw new Error("manual-test")` to a screen render. Reload. Confirm the fallback UI ("Something went wrong. Tap to reload.") shows instead of the white screen of death.
- [ ] Tap the reload button. Confirm the app returns to a usable state.

### W0-RTL — RTL + Arabic numerals (POST-VERIFY in Expo Go; MUST-VERIFY in dev client)

- [ ] In Arabic locale, open the home screen. Confirm guest counts (e.g. ٢٥٠ instead of 250). Same on Plans, EventSummary, EventDetails.
- [ ] In a dev client (not Expo Go), confirm `I18nManager.isRTL` is true after first launch in Arabic; relaunch if needed.
- [ ] Confirm switching to English does not freeze the app and the layout flips back to LTR after one relaunch.

---

## Wave 1

### W1-FLOW-11-F01 — EventSummary scheduled-launch row (MUST-VERIFY)

- [ ] Wizard step 1: pick "schedule for later" with a date/time (e.g. tomorrow 18:00 Riyadh).
- [ ] Wizard step 5 (EventSummary): confirm a "Scheduled launch" row shows the formatted time + timezone abbreviation.
- [ ] Reset the schedule, repeat the wizard. Confirm step 5 shows "Launches immediately on submit" (Arabic equivalent in AR locale).

### W1-STATS — Mobile stats polling cadence (POST-VERIFY)

- [ ] Open stats for an event with `status === "live"`. With a network sniffer (or browser dev tools on web debug build), confirm `GET /events/stats/<id>` fires every 30 s.
- [ ] Mark the event `completed` (DB or admin tool). Confirm cadence stretches to 5 min.
- [ ] Navigate away. Confirm the polling stops.

### W1-WIZ5 — EventSummary template details (MUST-VERIFY)

- [ ] Wizard step 3: pick a template, fill in the dynamic fields (e.g. bride name, intro text), confirm the template.
- [ ] Wizard step 5: confirm a "Template details" section shows each field key/value (or "—" if not set).

---

## Wave 2

### W2-STAFF — Staff token revoke UI (MUST-VERIFY)

- [ ] As event host, open the "موظفون" tab in event stats. Long-press a staff row.
- [ ] Confirm a "Revoke access" action appears.
- [ ] Tap → confirm dialog ("Revoke staff access for <name>? They won't be able to scan QR codes anymore.") → tap Revoke.
- [ ] Confirm a toast and the staff row disappears (or shows a "revoked" badge).
- [ ] Try scanning a QR with the revoked staff token. Backend should reject (401).

### W2-QR — Guest QR rotation UI (MUST-VERIFY)

- [ ] As event host, open the "ضيوف" tab. Long-press a guest row.
- [ ] Confirm a "Rotate QR" action appears.
- [ ] Tap → confirm dialog → tap Rotate.
- [ ] Confirm toast. Try the old QR — backend returns 410 with `qr_rotated`. New QR works.

### W2-GAT — Manual GuestAccessToken revoke UI (MUST-VERIFY)

- [ ] On the same long-press menu, confirm a separate "Revoke post-event access" action exists.
- [ ] Tap → confirm dialog explains the difference from QR rotate. Tap Revoke.
- [ ] Confirm 410 with `qr_revoked` on subsequent post-event content fetch.

---

## Wave 3

### W3-PAGE — Mobile admin pagination (MUST-VERIFY)

- [ ] Admin Hosts list with > 20 rows. Scroll to bottom. Confirm "loading" indicator + next 20 appear.
- [ ] Same for Vendors, Events, Tickets, Whitelabels, Payments.
- [ ] Confirm the spinner stops (no further fetches) when last page returns < 20 rows.

### W3-WL — Whitelabel setup-password screen + deep link (POST-VERIFY for deep link, MUST-VERIFY for screen)

- [ ] Manually navigate to `SetupPassword` route with a valid token (use a test token from backend). Confirm the form renders with new-password + confirm-password inputs.
- [ ] Submit → confirm success toast → confirm app navigates to login.
- [ ] Tap a `halla://setup-password/<token>` deep link from outside the app. Confirm it opens the app to the SetupPassword screen.

### W3-ADMIN — Admin exports (MUST-VERIFY)

- [ ] Open AdminEventsScreen. Tap the "Export" button. Confirm the events `.xlsx` downloads + the share sheet opens.
- [ ] Open an event's stats. Tap "Export Guests". Confirm `event-<id>-guests.xlsx` downloads + share sheet opens.

---

## Notes & known constraints

- `I18nManager.forceRTL(true)` is **ignored by Expo Go**. To verify, build a dev client (or production build) for iOS/Android. The first install in Arabic forces a relaunch the next time the app starts.
- Long-press menus on iOS sometimes feel unresponsive in Expo Go's dev menu mode — use a real device for verification rather than the simulator.
- The old QR scan should return HTTP 410 + JSON body `{ reason: "qr_rotated" }`. If the scanner UI shows a generic error, that's a separate UI polish issue (out of scope for Phase 4).
