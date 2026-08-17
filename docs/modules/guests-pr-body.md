## Summary

End-to-end implementation of `docs/modules/guests-fullstack-review-plan.md`. Canonicalizes guest CRUD on the `/guests/...` mount (deletes the four `events`-module duplicates), fixes three real data bugs, replaces inline validation with Zod schemas, splits oversized files preserving styles verbatim, and ships a whitelabel-only guest invitation portal on web + mobile.

## Backend

- New `guests.validation.js` (Zod) wired via the existing `validateZod` middleware for add/update/RSVP routes.
- `POST /guests/:id/rsvp` gains `validateObjectId('id')`.
- `POST /guests/events/:eventId` gains `requireSubscription` + `checkGuestLimit(1)` (was bypassing quota when called via the canonical mount).
- `ROLES.*` constants replace string literals in `rotateGuestQR` / `revokeGuestAccess`.
- Audit logs (`guest.added | guest.updated | guest.deleted`) added; export audit moved out of controller into service.
- Notification call sites use shared `logger.error` instead of `console.error`.
- **Data bugs fixed:** `exportGuestsExcel` now reads `checkIn.checkedInAt` (was `.time` — silently empty); `Guest.rsvp` subdoc extended with `response/message/dietaryRestrictions/plusOnes` so RSVP body fields stop being silently dropped.
- Soft-delete filter `{ deleted: { $ne: true } }` on `getEventGuests` and `addGuest` count.
- Full Swagger for `rotate-qr` / `revoke-access` (response schemas extracted to reusable components in `swagger.js`); RSVP enum expanded to include `maybe` + 409/410 idempotency replays; `getEventGuests` Swagger now reflects actual `sendPaginated` shape.
- **Events-module duplicates A1–A4 deleted** across routes / controller / `events.guests.service.js` / `events.stats-export.service.js` / Swagger.

## Web

- `GuestTable.jsx`: data fallback chains collapsed (`guestsData?.data || []`); optimistic update fixed to operate on the array directly.
- `AdminGuestTable.jsx`: `respondAt` → `rsvp.respondedAt` (data bug — column was always blank); migrated from raw `apiClient` (`eventsAPI.deleteGuest|updateGuest|exportGuests`) to React Query hooks.
- New canonical `useGuestMutation` factory (`add | update | delete | rotateQr | revokeAccess | export | rsvp`); update is **PATCH** (not PUT); paths under `API_PATHS.guests.*`.
- `GuestTable` and `AdminGuestTable` split into folders. Inline `style={{...}}` blocks (status/sentVia hex badges) and `singleEvent.module.css` import preserved verbatim.
- Duplicate `useEventGuests` removed; events-module guest action branches and named exports removed; dead `API_PATHS.events.*Guest*` constants deleted; orphan `services/createAndUpdateEvents.js` and `services/events.js` deleted.
- `console.error` → `handleError(error, t, ...)`; Arabic literals wrapped in `t()`.

## Web portal (whitelabel)

- New page `app/[lang]/invitation/[code]/page.jsx` wired to existing `useGuestByToken` + `useGuestMutation('rsvp')`.
- Three RSVP buttons → on `confirmed` shows welcome + QR (via newly added `qrcode.react`); on `declined`/`maybe` shows thank-you. Idempotency replay (409/410) treated as success.
- Whitelabel branding (logo, primary color) read from `event.whitelabel` with sensible defaults.
- Optional message / dietary / plus-ones inputs.
- Full state handling: loading skeleton, 404 / 403 / 400 / network / unknown errors.
- New `guest-portal` locale namespace (en + ar) registered in `providers/index.js`.

## Mobile

- `services/guestsService.js` extracted with `guestFetch` helper; old guest CRUD removed from `eventsService2.js` / `eventsService.guests.js` / `eventsService.exports.js`. PATCH not PUT. `_legacyToken` plumbing dropped (uses `useAuthStore` via `apiFetch`).
- New `hooks/queries/useGuests.js` and `hooks/mutations/useGuestMutations.js`.
- `SingleEventStats.js` (655 lines) split into `SingleEventStats/{index,GuestsTab,StaffTab,AddPopup,useEventStatsActions,styles}.js`. Every `StyleSheet.create({...})` copied verbatim into `styles.js` — visual diff zero.
- `Alert.alert` strings wrapped via `events.guest.alerts.*` keys (en + ar).
- `EVENTS.{ADD_GUEST,UPDATE_GUEST,DELETE_GUEST,EXPORT_GUESTS}` dead constants removed from `config/api.js`.

## Mobile portal (whitelabel)

- New `screens/guest-portal/InvitationScreen.js` reachable via deep link `halla://invitation/<code>`.
- Registered on **all four stacks** (Auth/Host/Vendor/Admin) so logged-in users tapping a guest invite link still land on the screen.
- `apiFetch({ skipAuth: true })` used for the two unauthenticated portal endpoints (`GET /guests/invitation/:code`, `POST /guests/:id/rsvp`).
- QR via newly added `react-native-qrcode-svg`.
- `events.guest.portal.*` locale keys (en + ar).

## Verification

- `node --check` passes for every backend file touched.
- Web `npm run lint` shows zero new errors (only the three pre-existing unrelated warnings remain).
- Mobile `@babel/parser` parses every new/edited file.
- Repo-wide grep: zero hits for `addGuestToEvent | updateEventGuest | deleteEventGuest | exportEventGuestsAsExcel` outside docs/worktrees; zero `/events/.../guests` raw paths in live code (all canonical `/guests/events/...`); update paths use PATCH on all three platforms.
- File-size compliance: all files within hard caps. `guests.routes.js` trimmed from 434 → 398 (cap 400) by extracting verbose response schemas into reusable Swagger components.

## Test plan

- [ ] **Backend** — RSVP `confirmed`/`declined`/`maybe` persists `response/message/dietaryRestrictions/plusOnes` (verify in MongoDB).
- [ ] **Backend** — `requireSubscription` + `checkGuestLimit` enforced when adding via canonical `/guests/events/:eventId` (over-quota → 403).
- [ ] **Backend** — Excel export "Check-in Time" column populates for checked-in guests.
- [ ] **Backend** — Audit log entries written for `guest.added`/`guest.updated`/`guest.deleted`.
- [ ] **Web (host)** — single-event guest table: add / update / delete / export round-trip on canonical `/guests/...` paths.
- [ ] **Web (admin)** — admin guest table: add / update / delete / export now via React Query; "Response Time" column populates.
- [ ] **Web (portal)** — `/{lang}/invitation/{code}`: load valid invitation → confirm → QR renders; decline/maybe → thank-you; invalid code → friendly error; idempotency replay handled.
- [ ] **Mobile** — host single-event: add / update / delete / rotate QR / revoke access / export hit canonical paths.
- [ ] **Mobile (portal)** — deep link `halla://invitation/<code>` opens `InvitationScreen` on auth + host + vendor + admin stacks; RSVP submit shows QR or thank-you.
- [ ] **Cross-platform** — confirm web + mobile both call PATCH (not PUT) for update.

## Notes

- No backward-compat shims — project is in dev. `/events/.../guests` duplicates fully removed; clients must use `/guests/...`.
- `qrcode.react` and `react-native-qrcode-svg` added to package manifests; root `package-lock.json` synced.
- Plan document checked in: `docs/modules/guests-fullstack-review-plan.md` (decisions locked under §0.1).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
