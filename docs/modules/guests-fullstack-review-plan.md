# Guests — Full-Stack Review Plan

**Module:** guests
**Generated:** 2026-05-07
**Prompt:** docs/implementation/MODULE_FULLSTACK_REVIEW_PROMPT.md
**Status:** Decisions locked 2026-05-07 · Ready to implement (see §0.1)

---

## 0. Executive Summary

- **9 endpoints** owned by the `guests` module + **4 duplicate guest endpoints** living inside the `events` module (bypass `guests.service`).
- **4 candidates for deletion** (events-module duplicates A1–A4). The previously-flagged "dead" web hooks `useGuestByToken` / `useGuestInvitation` / `useGuestMutation('rsvp')` are **NOT deleted** — per §0.1.1 they become the foundation of the new whitelabel guest portal page.
- **6 Swagger drift findings** (missing/incorrect schemas, missing rotate-qr / revoke-access JSDoc, missing 410 error response).
- **0 backend file-size violations** (largest is `guests.service.js` at 568 lines, cap 600).
- **2 web file-size violations** (`GuestTable.jsx` 396 / cap 250, `AdminGuestTable.jsx` 343 / cap 250) plus `useEventMutation.js` 460 / cap 250 (shared, not owned by this module).
- **2 mobile file-size violations** (`SingleEventStats.js` 655 / cap 350, `eventsService2.js` 964 / cap 500 — shared).
- **6 web/mobile API consumption mismatches** (web mixes guests-module reads with events-module writes; mobile uses events-module CRUD exclusively; admin web bypasses React Query and calls raw `apiClient`).
- **5 data-mapping bugs** (multi-branch fallbacks: `guestsData?.data || guestsData || []`, `guest.guestId || guest._id`, `eventData?.data?.event || eventData?.event`, etc.).
- **6 missing/incorrect safeguards**: missing `validateObjectId('id')` on RSVP, no `requireSubscription`/`checkGuestLimit` on `POST /guests/events/:eventId`, no Joi validation file, no audit log on add/update/delete, fire-and-forget notification with `console.error` swallow, `submitRSVP` writes fields that don't exist in `Guest.rsvp` schema.
- **~22 comment-hygiene blocks** to remove (`FLOW-`, `Phase 3d.2`, `D2`, `D7`, `D8`, `H-18`, `H-21`, `M-5`, `M-25`, `L-11`, `Bug 6`, `W0-MODEL`, `W2-QR`, `W2-GAT`, etc.).
- **Estimated effort:** L (≈ 2–3 working days) for the canonicalization + bug-fix scope. Add ≈ 1 day for the guest portal page (web) and ≈ 1 day for the mobile portal screen — see §0.1.

---

## 0.1 Locked Decisions (2026-05-07)

The following ambiguities raised during review have been resolved by the user. Treat these as binding inputs for Phase 2.

1. **Guest portal — BUILD, scoped to whitelabel events only.**
   - Whitelabel-event guests receive an invitation link → land on the portal → choose RSVP. On `confirmed` the page shows a welcome message + the entry QR. On `declined` / `maybe` it shows a thank-you message.
   - Host-event guests use the existing **WhatsApp interactive-button flow** (auto-reply tailored per choice) and do **NOT** see the portal.
   - **Do NOT delete** the existing web hooks `useGuestByToken`, `useGuestInvitation`, `useGuestMutation('rsvp')` — they are the foundation for the portal.
   - Build the portal on **both web and mobile** (mobile via deep link / unauthenticated screen).
   - Backend portal endpoints (`GET /guests/invitation/:code`, `POST /guests/:id/rsvp`) stay public + rate-limited as currently configured.
   - Tasks added: §7.B.6 (rewritten — build the page, not delete the hooks) and §7.C.9 (new — mobile portal screen).

2. **Mobile / backend release ordering — NOT a concern.**
   - Project is still in development; no in-the-wild mobile builds. The events-module duplicate routes (A1–A4) can be deleted as soon as web + mobile consumers migrate. **No "keep duplicates for N releases" gate, no min-app-version check.**
   - §7.A.15 ships in the same merge as §7.B.4 / §7.C.1 / §7.C.6.

3. **Canonical mount = `/guests/...`** (already the plan's recommendation in §2.4 — explicitly confirmed).

---

## 1. Endpoint Inventory

### 1.A `guests` module routes (`labbe-backend-/src/modules/guests/guests.routes.js`)

| # | Method | Path | Controller | Service | Middleware chain | Swagger | Web hook | Mobile hook | Status |
|---|--------|------|------------|---------|------------------|---------|----------|-------------|--------|
| 1 | GET  | `/guests/invitation/:code` | `getByInvitationCode` | `getGuestByCode` | `apiLimiter` | OK | `useGuestByToken` / `useGuestInvitation` (dead — no consumer) | none | KEEP, but consumer gap (§3.5) |
| 2 | POST | `/guests/:id/rsvp` | `submitRSVP` | `submitRSVP` | `apiLimiter`, `deriveRsvpIdempotencyKey`, `idempotency` | partial (no `validateObjectId`, schema enum `[confirmed, declined]` while service accepts `maybe`) | `useGuestMutation('rsvp')` (dead) | none | KEEP, fix Swagger + add `validateObjectId('id')` |
| 3 | GET  | `/guests/events/:eventId` | `getEventGuests` | `getEventGuests` | `protect`, `validateObjectId('eventId')` | OK | `useEventGuests` (in `hooks/events/queries/`) | none — admin/host mobile reads guests via populated `event.guestList` | KEEP |
| 4 | POST | `/guests/events/:eventId` | `addGuest` | `addGuest` | `protect`, `validateObjectId('eventId')` | OK | none — web uses events-module duplicate | none — mobile uses events-module duplicate | DELETE-DUPLICATE-OF-#A1 (or vice versa — see §2.4) |
| 5 | PATCH | `/guests/events/:eventId/guests/:guestId` | `updateGuest` | `updateGuest` | `protect`, two `validateObjectId` | OK | none — web uses events-module duplicate | none — mobile uses events-module duplicate | DELETE-DUPLICATE-OF-#A2 |
| 6 | DELETE | `/guests/events/:eventId/guests/:guestId` | `deleteGuest` | `deleteGuest` | `protect`, two `validateObjectId` | OK | none — web uses events-module duplicate | none — mobile uses events-module duplicate | DELETE-DUPLICATE-OF-#A3 |
| 7 | GET  | `/guests/events/:eventId/export` | `exportGuests` | `exportGuestsExcel` | `protect`, `validateObjectId('eventId')` | OK | none — web uses events-module duplicate | none — mobile uses events-module duplicate | DELETE-DUPLICATE-OF-#A4 |
| 8 | POST | `/guests/events/:eventId/guests/:guestId/rotate-qr` | `rotateQR` | `rotateGuestQR` | `protect`, two `validateObjectId`, `idempotency` | **MISSING JSDoc** | none | `rotateGuestQr` in `eventsService2.js` (raw `apiFetch`) | KEEP — add Swagger, add web hook |
| 9 | POST | `/guests/events/:eventId/guests/:guestId/revoke-access` | `revokeAccess` | `revokeGuestAccess` | `protect`, two `validateObjectId`, `idempotency` | **MISSING JSDoc** | none | `revokeGuestAccess` in `eventsService2.js` | KEEP — add Swagger, add web hook |

### 1.B Duplicate guest endpoints living under `events` module (`labbe-backend-/src/modules/events/events.routes.js`)

| # | Method | Path | Controller | Service | Middleware chain | Swagger | Web hook | Mobile hook | Status |
|---|--------|------|------------|---------|------------------|---------|----------|-------------|--------|
| A1 | POST | `/events/:eventId/guests` | `addGuestToEvent` | `addGuestToEvent` | `protect`, `validateObjectId`, `requireSubscription`, `checkGuestLimit(1)` | OK | `useEventMutation('addGuest')` | `addGuest` in `eventsService2.js` | **CANONICAL CANDIDATE** (has subscription gating; better than #4) |
| A2 | PUT  | `/events/:eventId/guests/:guestId` | `updateEventGuest` | `updateEventGuest` | `protect`, two `validateObjectId` | OK (response schema points to `$ref Guest` — wrong; service returns `{guest}` un-formatted) | `useEventMutation('updateGuest')` | `updateGuest`/`updateGuestStatus` in `eventsService2.js` | CANONICAL or merge with #5 (see §2.4) |
| A3 | DELETE | `/events/:eventId/guests/:guestId` | `deleteEventGuest` | `deleteEventGuest` | `protect`, two `validateObjectId` | OK | `useEventMutation('deleteGuest')` | `deleteGuest` in `eventsService2.js` | CANONICAL or merge with #6 |
| A4 | GET | `/events/export/:id/guests` | `exportEventGuestsAsExcel` | events-module export logic | `protect`, `validateObjectId('id')` | OK | `eventsAPI.exportGuests` (services/adminDashboard.js) + `downloadExportFile(API_PATHS.events.exportEventGuestsAsExcel)` | `exportEventGuests` in `eventsService2.js` | CANONICAL or merge with #7 |

**Legend:** KEEP = stays as-is or with fixes; DELETE-DUPLICATE-OF-#X = remove and migrate consumers; MERGE = fold one into the other.

**Recommended canonical decision (covered in §2.4):** keep all CRUD under the **`guests` module** (#4–#7) and **delete the four `events`-module duplicates** (A1–A4). Reasoning:

1. The `guests` module exists *because* guest concerns were extracted from `events` for separation of concerns; leaving the duplicates makes that extraction half-done.
2. Mobile already calls `/guests/events/:eventId/guests/:guestId/rotate-qr` (the rotate/revoke endpoints only exist on the `guests` module), so mobile is already familiar with the `/guests/...` mount.
3. Migration cost: the `requireSubscription` + `checkGuestLimit(1)` middleware on A1 must be ported onto #4 (currently #4 only does an inline `event.guestLimit` check that bypasses subscription quota usage tracking).
4. Audit logs and notifications on `_notifyHostStatusChange` already live in `guests.service.js`; the `events.service.addGuestToEvent` has none.

---

## 2. Backend Findings

### 2.1 File-size violations (cap 600 / 300 / 400 / 300 / 300)

- `guests.service.js` — 568 lines. Within cap (600). No split required, but trim phase markers (§2.7) — drops to ~530.
- `guests.routes.js` — 352 lines. Within cap (400). The 30-line block-comment about idempotency-key derivation (lines 23–51) can be trimmed to ~6 lines without losing the *why*.
- `guests.controller.js` — 147 lines. Within cap (300).
- `guests.validation.js` — **DOES NOT EXIST** (see §2.6).

### 2.2 Swagger drift

- **Endpoint #8 (`POST /guests/events/:eventId/guests/:guestId/rotate-qr`) — no `@swagger` JSDoc block at all.** Routes file has only a free-text comment. Add full block: tags `[Guests]`, summary, params, success response with `{token, qrUrl, expiresAt, delivery: {attempted, channel, success, error}}`, 401, 403, 404.
- **Endpoint #9 (`POST /guests/events/:eventId/guests/:guestId/revoke-access`) — no `@swagger` JSDoc block.** Add block: tags `[Guests]`, summary, params, success response `{revoked, affected, wasAlreadyRevoked}`, 401, 403, 404.
- **Endpoint #2 (`POST /guests/:id/rsvp`)** — Swagger says `enum: [confirmed, declined]` but service also accepts `'maybe'`. Either tighten service to reject `'maybe'` (rule A3.8: use `RSVP_STATUS` constant from `shared/constants/status.js` which includes `MAYBE`) or expand Swagger enum to `[confirmed, declined, maybe]`. **Decision: expand Swagger** — `RSVP_STATUS` already defines `MAYBE` and `_notifyHostRSVP` handles it.
- **Endpoint #2** — Swagger doesn't document the 409 / 410 response from idempotency replay.
- **Endpoint #3 (`GET /guests/events/:eventId`)** — Swagger says response `data.guests[]` but service returns `data` as the array directly via `sendPaginated(res, result.data, result.pagination)`, which serializes to `{success, status, data: [...], pagination}`. Frontend reads `guestsData?.data || guestsData || []` precisely because this is unclear. Fix Swagger to match wire shape: `data: array of Guest, pagination: Pagination`.
- **Endpoint #4 / events-module A1** — Both annotated to receive `AddGuestRequest`. Confirm `AddGuestRequest` schema in `config/swagger.js` matches the Mongoose model (name required, phone OR email required; current schema must reflect that XOR).

### 2.3 Missing middleware / safeguards

- **#2 `POST /guests/:id/rsvp`** lacks `validateObjectId('id')`. Current behavior: invalid id → CastError caught by global handler, but message is generic. Add `validateObjectId('id')`. (`guests.routes.js:144`)
- **#4 `POST /guests/events/:eventId`** — no `requireSubscription`, no `checkGuestLimit(1)`, no audit log. Decision in §2.4: keep `guests` as canonical → port these three pieces over from events-module A1. (`guests.routes.js:244` and `guests.service.js:156`)
- **#5/#6 update/delete** — no `auditLog` call for guest mutations; rule A3.6 says guest-touching mutations should write audit logs (matching `users`/`tickets` pattern). Add `logAudit` calls in `updateGuest` and `deleteGuest` services with action `'guest.updated' | 'guest.deleted'`. (`guests.service.js:191` and `guests.service.js:240`)
- **#7 export** — already writes audit log in the controller (rule A2.3 violation: controller has business logic). Move the `logAudit` call into `guests.service.exportGuestsExcel`. (`guests.controller.js:130-136`)
- **#2 RSVP `_notifyHostRSVP`** uses `.catch(console.error)` — rule A3.2 violation. Either await it (with try/catch wrapping a logger call) or use the shared `logger` instead of `console.error`. Same fix in `_notifyHostStatusChange` at line 227. (`guests.service.js:94, 227`)
- **#1 invitation-code lookup** uses `apiLimiter` only. The endpoint is public and unauthenticated — recommend a tighter rate limit (e.g., a new `guestPortalLimiter` at 30 req/min/IP) or document the decision to keep `apiLimiter`.

### 2.4 Duplicate / dead endpoints — DECISION REQUIRED

**Recommended: canonicalize on `/guests/...` mount. Delete the events-module duplicates A1, A2, A3, A4 after migrating consumers.**

Migration steps (executed in §7):
1. Port `requireSubscription` + `checkGuestLimit(1)` middleware from events-module A1 onto `guests.routes.js` `POST /events/:eventId` route.
2. Port the `event.guestList.push(guest._id)` + `event.save()` logic check (already present in both places — keep `guests.service.addGuest`).
3. Web — switch `useEventMutation('addGuest' | 'updateGuest' | 'deleteGuest')` mutationFn to call `API_PATHS.guests.addGuest(eventId)` etc. Switch `eventsAPI.deleteGuest`/`updateGuest`/`exportGuests` in `services/adminDashboard.js` to point at the same paths (or delete and use `useEventMutation`/canonical guest hooks).
4. Web — replace direct path strings in `services/adminDashboard.js` (`/events/:id/guests/...`) with the canonical guest paths.
5. Web — switch `downloadExportFile({ path: API_PATHS.events.exportEventGuestsAsExcel(eventId) })` in `GuestTable.jsx:51` to use `API_PATHS.guests.exportGuests(eventId)`.
6. Mobile — switch `addGuest` / `updateGuest` / `updateGuestStatus` / `deleteGuest` / `exportEventGuests` in `eventsService2.js` to call `/guests/events/:eventId[/guests/:guestId]` paths via direct `apiFetch` (matching the `rotateGuestQr` pattern at line 932).
7. Backend — delete `addGuestToEvent`, `updateEventGuest`, `deleteEventGuest`, `exportEventGuestsAsExcel` route handlers from `events.routes.js`. Delete the corresponding methods from `events.controller.js` (lines 367–399) and `events.service.js` (lines 2069–2138). Delete the Swagger blocks. Keep `Event.findOne({ host })` ownership check inside the moved logic.
8. Backend — delete the now-dead `API_PATHS.events.exportEventGuestsAsExcel`, `addGuestToEvent`, `updateEventGuest`, `deleteEventGuest` keys from `labbe/services/new-backend/api.config.js`. Delete `eventsAPI.deleteGuest|updateGuest|exportGuests` from `labbe/services/adminDashboard.js`.

Alternative (lower cost): keep events-module duplicates and **delete** `guests` module CRUD #4–#7. This would bypass the existing `/guests/events/:eventId` query (#3) which has consumers. Not recommended — the query and CRUD belong together.

### 2.5 Service / controller violations

- `guests.service.submitRSVP` writes `guest.rsvp = { response, respondedAt, message, dietaryRestrictions, plusOnes }` but the `Guest.rsvp` schema only declares `responded` and `respondedAt`. Mongoose `strict: true` (default) **silently drops** `response`, `message`, `dietaryRestrictions`, `plusOnes`. **DATA LOSS bug.** Fix: extend the `rsvp` subdoc in `models/GuestModel.js` to declare those fields, OR persist them on the top-level `Guest` doc. (`guests.service.js:83-89`, `models/GuestModel.js:71-80`)
- `guests.service.exportGuestsExcel` reads `guest.checkIn?.time` and `guest.invitation?.sent`. The schema field is `checkIn.checkedInAt`, not `checkIn.time`. Excel column "Check-in Time" is therefore always empty. Fix: change to `guest.checkIn?.checkedInAt`. (`guests.service.js:286`, `models/GuestModel.js:88`)
- `guests.controller.exportGuests` writes the audit log inline — rule A2.3 says controllers don't do business logic. Move the `logAudit` call into the service. (`guests.controller.js:124-146`)
- `guests.service.getGuestByCode` does `populate({ path: 'event', populate: { path: 'host' } })` without selecting only the host fields needed at the response level (it does pick `'username name'` — fine), but the parent populate for `event` selects `'eventDetails status host'`. Confirm `eventDetails` is small enough; otherwise add explicit sub-fields. (`guests.service.js:30-34`)
- `guests.service.addGuest` does an inline `Guest.countDocuments({event: eventId})` for guestLimit check; the events-module duplicate uses `event.guestList?.length`. The two yield different answers if the `guestList` array gets out of sync with the `Guest` collection (which it can, given soft-delete `deleted: true` flag in the model). After §2.4 canonicalization, settle on `Guest.countDocuments({ event: eventId, deleted: { $ne: true } })`. (`guests.service.js:163-167`, `events.service.js:2074`)
- `guests.service.addGuest` and `deleteGuest` push/pull from `event.guestList` and call `event.save()` — that's a denormalized index that should be eliminated long-term. For this review, keep parity (don't drift) and flag in §6 for a future cleanup.
- `guests.service` mixes `'admin' | 'super_admin' | 'whitelabel_admin'` string literals (`rotateGuestQR`, `revokeGuestAccess`). Rule A3.8 violation. Replace with `ROLES.ADMIN`, `ROLES.SUPER_ADMIN`, `ROLES.WHITELABEL_ADMIN`. (`guests.service.js:313-318, 420-425`)
- `guests.service.updateGuest` re-validates phone format inline — duplicated in the events-module duplicate. After §2.4 the inline validation should move to a Joi schema (§2.6).
- `guests.routes.js:104` — public route uses `apiLimiter`, fine. But the protected `router.use(protect)` on line 155 means routes 3–9 inherit no rate limiter at all — acceptable for authenticated host routes.

### 2.6 Validation gaps

- **No `guests.validation.js` file.** Add one with these Joi schemas, registered via `validate(schema)`:
  - `addGuestSchema`: `{ name: required string ≤100, phone: optional string matching `/^[+]?[0-9]{7,15}$/`, email: optional valid email, .custom(v => v.phone || v.email) }`. Reject unknown.
  - `updateGuestSchema`: same fields as above but all optional, plus `status: optional GUEST_STATUS enum`.
  - `submitRSVPSchema`: `{ response: required RSVP_STATUS, invitationCode: required string, message: optional string ≤500, dietaryRestrictions: optional string ≤200, plusOnes: optional integer min 0 max 10 }`. Reject unknown.
- Wire `validate(addGuestSchema)` into route #4, `validate(updateGuestSchema)` into #5, `validate(submitRSVPSchema)` into #2.
- Optional: extract the Saudi phone regex into `shared/utils/validators.js` since `events.service`, `guests.service`, and `users.service` all duplicate it.

### 2.7 Comment hygiene (backend)

Remove or trim — drop FLOW/Phase/H-/M-/L-/D-markers, keep the genuine *why* in 1–2 lines:

- `guests.routes.js:23-51` — 30-line `deriveRsvpIdempotencyKey` block-comment with FLOW-19-F02, decision D2, L-11, D8 markers. Trim to ~5 lines: "Derive idempotency key from `${guestId}:${choice}:${code}` so a double-tap is dedup'd but `confirmed → declined` is treated as a fresh request."
- `guests.routes.js:322-329` — `Phase 3e.3 / FLOW-18-F03` block-comment.
- `guests.routes.js:338-343` — `Phase 3e.4 / FLOW-21-F03` block-comment.
- `guests.controller.js:101` — `Phase 3e.3 / FLOW-18-F03`.
- `guests.controller.js:111` — `Phase 3e.4 / FLOW-21-F03`.
- `guests.service.js:17` — `// M-5`.
- `guests.service.js:274` — `// FLOW-28-F02`.
- `guests.service.js:284, 287` — `// M-5`.
- `guests.service.js:296-305` — `Phase 3e.3 / FLOW-18-F03 / D7` block.
- `guests.service.js:362-371` — `H-18` block in `rotateGuestQR` SMS section. The "lost phone" rationale is the *why*; trim to one line.
- `guests.service.js:406-411` — `Phase 3e.4 / FLOW-21-F03 / D8` block.
- `guests.service.js:466-473` — `wasAlreadyRevoked` rationale block — trim to one line.
- `models/GuestModel.js:91-96` — `H-21` block.
- `models/GuestModel.js:178-180` — `FLOW-15-F06`.
- `models/GuestModel.js:181-182` — `FLOW-13-F02`.
- `models/GuestModel.js:288-294` — `M-25` block.
- `events.service.js:2073` — `Bug 6` marker on guest limit check.

---

## 3. Frontend Web Findings

### 3.1 Component tree per page

- `app/[lang]/host/events/[id]/page.jsx` (66 lines) — wires `<GuestTable />`.
  - `_components/GuestTable.jsx` (396 lines) — **VIOLATION cap=250**.
  - imports `useEventGuests` from `hooks/events/queries/useEventGuests.js` (28 lines).
  - imports `useEventMutation` from `hooks/events/mutations/useEventMutation.js` (460 lines — module-shared).
  - imports `useEvent` from `hooks/reactQueryHooks/useEvents.js`.
  - renders `Table` (`ui/commen/new-table/Table`), `AddGuestPopup` (`ui/host/popups/addGuestPopup/AddGuestPopup.js`, 165 lines), `ReminderPopup`, `SendInvitationPopup`, `DeleteConfirmation`, `PopupWrapper`, `Button`.

- `app/[lang]/admin-dash/events/[id]/_components/EventDetailsContent.jsx` (51 lines) — wires `<AdminGuestTable data={eventData} />`.
  - `_components/AdminGuestTable.jsx` (343 lines) — **VIOLATION cap=250**.
  - reads `data.guests` directly (from populated event) — does NOT call `useEventGuests`.
  - calls `eventsAPI.deleteGuest`/`updateGuest`/`exportGuests` (raw `apiClient`, bypasses React Query).
  - reuses the same `AddGuestPopup`.

- `hooks/reactQueryHooks/useGuests.js` (107 lines) — defines `useEventGuests`, `useGuestByToken`, `useGuestInvitation`, `useGuestMutation('rsvp')`. **All four are unused** by any page in the repo. Either DELETE the file or wire them into a new RSVP / invitation-portal page.

### 3.2 File-size violations (web)

- `app/[lang]/host/events/[id]/_components/GuestTable.jsx` — 396 / cap 250. Proposed split (preserve `singleEvent.module.css` and the existing JSX/className tree exactly):
  - `_components/GuestTable/index.jsx` (≤80 lines) — top-level data wiring, popup state.
  - `_components/GuestTable/GuestRows.jsx` (≤120 lines) — `data.map`, `renderCell`, status / sentVia badges (the inline-style badges remain inline-style inside this component verbatim — see §3.6).
  - `_components/GuestTable/GuestPopups.jsx` (≤80 lines) — `AddGuestPopup`, `ReminderPopup`, `SendInvitationPopup`, `DeleteConfirmation` wrappers.
  - `_components/GuestTable/useGuestTableActions.js` (≤120 lines) — `handleConfirmDelete`, `handleUpdateGuest`, `handleConfirmReminder`, `handleConfirmSendInvitation` (lifted out of the component).
  - **Style preservation note:** every `styles.*` reference stays pointing at the SAME `singleEvent.module.css`; every inline `style={{...}}` (status/sentVia badges) is moved verbatim to the extracted file — no rounding, no Tailwind, no conversion to CSS modules.

- `app/[lang]/admin-dash/events/[id]/_components/AdminGuestTable.jsx` — 343 / cap 250. Proposed split:
  - `_components/AdminGuestTable/index.jsx` (≤80 lines).
  - `_components/AdminGuestTable/AdminGuestRows.jsx` (≤140 lines) — `Table` + `renderCell` for status badges.
  - `_components/AdminGuestTable/AdminGuestPopups.jsx` (≤60 lines).
  - `_components/AdminGuestTable/useAdminGuestActions.js` (≤90 lines).
  - **Same style-preservation rules as above.**

- `hooks/events/mutations/useEventMutation.js` — 460 / cap 250 (module-shared, not strictly part of guests scope). After §2.4 the `addGuest`/`updateGuest`/`deleteGuest` action branches relocate to a new `useGuestMutation` factory in `hooks/reactQueryHooks/useGuests.js`. That action removal alone trims `useEventMutation.js` by ~50 lines. Final split of the rest is out of scope for this review (events module review will own it).

### 3.3 Hardcoded text / data / paths

- `GuestTable.jsx:166` — Arabic literal `"لا يوجد ضيوف لديهم أرقام هواتف"` passed as `t("messaging.noGuestsWithPhone", "...")` — already has key, fallback OK; consider whether key exists in `home-events` locale (verify in §8).
- `GuestTable.jsx:266-268` — hardcoded badge labels `"واتساب"`, `"SMS (بديل)"`, `"SMS"` in `renderCell` — wrap with `t("table.channel.whatsapp", "واتساب")` etc.
- `GuestTable.jsx:270-285` — inline `style={{...}}` for sentVia badge with hex colors `#D1F2EB`, `#1A7A5E`, `#FFF3CD`, `#856404`. **Style-preservation rule applies** — keep inline; do not refactor to CSS module unless explicitly requested.
- `GuestTable.jsx:287-336` — same pattern for status badge (hex colors `#EAF4EF`, `#2A8C5B`, etc.).
- `AdminGuestTable.jsx:135` — Arabic literal `"لا يوجد ضيوف لديهم أرقام هواتف"` — already has translation key; verify §8.
- `AdminGuestTable.jsx:158` — fallback string `\`تم إرسال ${...} دعوة بنجاح\`` — replace by the keyed pluralization in `messaging.invitationsSent`.
- No hardcoded API paths (good — uses `API_PATHS.events.exportEventGuestsAsExcel`).

### 3.4 Data mapping bugs / fallback chains

- `GuestTable.jsx:34` — `const event = eventData?.data?.event || eventData?.event;` — backend `getEventById` (events module) returns `data.event` per `sendSuccess`. Replace with `eventData?.data?.event || null`.
- `GuestTable.jsx:35` — `const guests = guestsData?.data || guestsData || [];` — backend `getEventGuests` returns `{success, status, data: [...guests], pagination}` per `sendPaginated`. Replace with `guestsData?.data || []`.
- `GuestTable.jsx:90-102` — optimistic update reads `old.data?.data || old.data || old`, writes `data: {...(old.data||{}), data: filtered}`. The structure `data.data` does not exist on the wire. Should be `old.data` array directly. Replace with: `queryClient.setQueryData(["guests", "events", eventId], (old) => old ? { ...old, data: (old.data||[]).filter(g => g.id !== guestId) } : old);`.
- `AdminGuestTable.jsx:59, 79, 138, 190, 205, 215` — every cell reads `guest.guestId || guest._id`. After §2.4 the canonical service formats guests via `_formatGuest` returning `{ id, ... }`. The admin path comes from a different upstream (populated `event.guestList`) which still has Mongoose `_id`. **Two upstream shapes.** Either:
  - (a) Make the admin event-detail endpoint pass guests through `_formatGuest` so it also returns `id`, or
  - (b) Switch admin to call `useEventGuests(eventId)` directly (matching host) — recommended.
- `AdminGuestTable.jsx:194` — `addedBy: guest.addedBy || "-"`. Host side reads `guest.addedBy?.username || guest.addedBy?.name`. The two pages display addedBy differently because the admin's upstream populates it differently. After (b) above, both align on `addedBy: { id, username }`.
- `AdminGuestTable.jsx:196` — `responseTime: guest.respondAt`. The schema field is `rsvp.respondedAt`. **TYPO** — column is always empty for admin view. Fix to `guest.rsvp?.respondedAt`.

### 3.5 Duplicate hooks / direct apiRequest calls

- **Duplicate `useEventGuests`:**
  - `hooks/reactQueryHooks/useGuests.js:16` — queryKey `["events", eventId, "guests"]`, staleTime 2 min.
  - `hooks/events/queries/useEventGuests.js:14` — queryKey `["guests", "events", eventId]`, staleTime 5 min. **Used by `GuestTable.jsx`.**
  - Decision: keep `hooks/events/queries/useEventGuests.js` as canonical (its queryKey ordering matches `useEventMutation.addGuest` invalidation `["guests", "events", eventId]`). Delete the duplicate from `hooks/reactQueryHooks/useGuests.js`.
- **Dead hooks in `hooks/reactQueryHooks/useGuests.js`:** `useGuestByToken`, `useGuestInvitation`, `useGuestMutation('rsvp')` have **no consumers** in `app/`, `ui/`, or `components/`. Either delete the file entirely (recommended — guest portal RSVP page does not yet exist), or migrate to a new `app/[lang]/invitation/[code]/page.jsx` if PM intends to ship the guest portal soon. **Flag in §6 for decision.**
- **Direct `apiClient` call in `services/adminDashboard.js`** (lines 695–732) — `deleteGuest`, `updateGuest`, `exportGuests`. Rule B0.2 / B6 violation. Migrate `AdminGuestTable.jsx` to canonical hooks.
- **Direct `downloadExportFile` in `GuestTable.jsx:50`** — acceptable for binary downloads (responseHelper rule allows raw `res.send` for Excel/PDF). Not a violation, but the `path` should switch to `API_PATHS.guests.exportGuests(eventId)` after §2.4.
- **`messagingService.sendReminder`** is called from both tables — outside this review's scope (messaging module).

### 3.6 State / loading / error gaps

- `GuestTable.jsx` has **no `isLoading` / `error` branch** for `useEvent` or `useEventGuests`. If either is loading or errors, the table renders `[]` silently. Add `<SimpleLoading />` / error message branch — same pattern as `EventDetailsContent.jsx:17-29`.
- `AdminGuestTable.jsx` doesn't fetch — receives `data` prop. Loading/error handled by the parent `EventDetailsContent.jsx` (good).
- `GuestTable.jsx` filter state: there's no filter / search implemented inside the component beyond what `Table` provides internally. No URL-state handling — table has `showSearch={true}` but the search is purely client-side. Consider URL-state if backend search becomes wired (currently `getEventGuests` accepts `search` and `status` but the front-end never sends them). **Flag in §6.**
- `GuestTable.jsx:114` — `console.error("Delete error:", error)` left in catch block; pair with toast (already done). Replace `console.error` with `handleError(error, t, ...)` per rule B16.
- `GuestTable.jsx:134, 158, 188` — three more `console.error` calls. Replace with `handleError`.
- `AdminGuestTable.jsx` already uses `handleError`. Good.
- Missing `ErrorBoundary` wrapper on the host single-event page (rule B19). Out of scope unless we add one as part of B.7.
- Mutation invalidation in `useEventMutation.addGuest` invalidates both `["events", eventId]` and `["guests", "events", eventId]` — correct.

### 3.7 Comment hygiene (web)

- `GuestTable.jsx:33` — `// Extract data — backend returns { status, data: { event: { ... } } }` — re-states code; remove after §3.4 fix.
- `GuestTable.jsx:89` — `// Optimistic update` — keep (genuine *why*).
- `GuestTable.jsx:178-179` — `// TODO: Use messaging mutation hook when available` — drop or convert to issue link.
- `AdminGuestTable.jsx` — no FLOW/PHASE markers. Clean.
- `useGuests.js:7-9, 30-34, 49-53, 68-71` — JSDoc OK; trim "Hook to fetch guest by token (for RSVP)" if the hook is removed.
- `useEventGuests.js:7-13` — keep as-is.
- `useEventMutation.js:211-250` — guest action branches; OK comments.

---

## 4. Frontend Mobile Findings

### 4.1 Screen → component tree

- `screens/host/EventDetailsScreen.js` (not opened — assume standard pattern) → `components/events/SingleEventStats.js` (655 lines) — **VIOLATION cap=350**.
  - Imports `addGuest`, `updateGuest`, `deleteGuest`, `rotateGuestQr`, `revokeGuestAccess`, `exportEventGuests` from `services/eventsService2.js`.
  - Renders `GuestListItem` (302 lines) and the staff equivalent.
- `screens/admin/admin-dashboard/EventDetailsScreen.js` → `components/admin-dashboard/events/GuestList.js` (232 lines) and `GuestListSection.js` (128 lines) — both within cap.
- `services/eventsService2.js` (964 lines) — **VIOLATION cap=500**. Module-shared; the guest-related functions (`addGuest`, `updateGuestStatus`, `deleteGuest`, `updateGuest`, `rotateGuestQr`, `revokeGuestAccess`, `exportEventGuests`) total ~250 lines. After §2.4 the paths change but the file size doesn't shrink materially. Out-of-scope full split is owned by the events module review; for this review: extract guest-related functions into a new `services/guestsService.js` (≈ 250 lines) following the `_request` helper pattern from `ticketsService.js`. The remaining `eventsService2.js` drops to ~715 — still over cap but progress.

### 4.2 File-size violations (mobile)

- `components/events/SingleEventStats.js` — 655 / cap 350. Proposed split (preserve every `StyleSheet.create({...})` block verbatim):
  - `SingleEventStats/index.js` — top-level orchestration (≤180 lines).
  - `SingleEventStats/GuestsTab.js` — guest tab body (handlers `handleGuestEdit`, `handleGuestDelete`, `handleGuestRotateQr`, `handleGuestRevokeAccess`) (≤180 lines).
  - `SingleEventStats/StaffTab.js` — staff tab body (≤160 lines).
  - `SingleEventStats/AddPopup.js` — popup state (≤80 lines).
  - `SingleEventStats/useEventStatsActions.js` — `handlePopupSave`, optimistic `setGuestActions`/`setStaffActions` reducers (≤90 lines).
  - **StyleSheet preservation:** every `styles.foo` reference in the new files imports the SAME `StyleSheet.create({...})` constant — extract it into a sibling `SingleEventStats/styles.js` file with the *exact same keys and values*; nothing renamed, nothing rounded.
- `services/eventsService2.js` — 964 / cap 500. Extract guest functions to `services/guestsService.js` (see above). Within this review's scope only for the guest section.

### 4.3 Service / hook violations

- **All seven guest service functions in `eventsService2.js` use raw `console.log` / `console.error`** for tracing (`[EVENTS SERVICE] Adding guest...`, etc.). Rule D6 violation. Drop the success-path logs; keep `console.error` only inside catch blocks where the error is re-thrown.
- **No mobile React Query hooks for any guest mutation.** `addGuest`, `updateGuest`, `deleteGuest`, `rotateGuestQr`, `revokeGuestAccess`, `exportEventGuests` are all called directly from `SingleEventStats.js` — rule C2 violation. Wrap them in `hooks/mutations/useGuestMutations.js`:
  - `useAddGuest`, `useUpdateGuest`, `useDeleteGuest`, `useRotateGuestQr`, `useRevokeGuestAccess`, `useExportGuests`. Each invalidates `["events", "single-stats", eventId]`.
- **No mobile query hook for `useEventGuests`** — mobile reads guests off the populated `event.guestList` returned by `useSingleEventStats`. Acceptable as-is; the `/guests/events/:eventId` endpoint (#3) has no mobile consumer. **Flag in §6.**
- **Token argument still threaded through every guest service function** — `_legacyToken` should be dropped per rule C1: `apiFetch` reads from `useAuthStore` directly. Migrate all six guest functions while moving them to `guestsService.js`.
- `eventsService2.js:932-940 / 955-963` — `rotateGuestQr` / `revokeGuestAccess` use raw `apiFetch` because `authenticatedFetch` (defined at top of file) prepends `EVENTS.BASE`. After §2.4 the same pattern applies to `addGuest`/`updateGuest`/`deleteGuest`/`exportEventGuests` — they all need to call `/guests/events/:eventId/...`, NOT `/events/:eventId/guests/...`. Two options:
  - (a) Define a `guestFetch` helper analogous to `authenticatedFetch` but prepending `GUESTS.BASE`. Cleanest.
  - (b) Use direct `apiFetch` with full paths. Less clean but matches existing rotate/revoke shape.
  - **Recommend (a).**

### 4.4 Hardcoded text / data / paths

- `SingleEventStats.js:177, 181, 192, 196, 205, 225, 229, 245, 248, 270, 272, 289, 301-305, 318, 330, 342` — every `Alert.alert("نجاح", "تم...")` has hardcoded Arabic strings. Wrap with `t("...")` from the relevant namespace (`events` per `localization/locales/{en,ar}/events.json`). Add keys in §8.
- `SingleEventStats.js:357` — hardcoded `"تصدير قائمة الضيوف"` dialogTitle.
- `GuestListItem.js`, `GuestList.js`, `GuestListSection.js`, `GuestForm.js` — verify each Arabic literal. (Spot-check confirmed Arabic literals in `RSVP_CONFIG.label` fallbacks at `GuestList.js:43`, `GuestListSection.js:15`.)
- `eventsService2.js` error messages `"Failed to rotate QR"`, `"Failed to revoke guest access"`, `"Failed to export guests"` — these are technical messages thrown to the catch handler; acceptable but should match the canonical translated UX messages in the calling screen.

### 4.5 Web/Mobile divergence

| Endpoint | Web | Mobile | Backend (after §2.4 canonicalization) |
|----------|-----|--------|---------------------------------------|
| List event guests | `GET /guests/events/:eventId` (`useEventGuests`) | reads `event.guestList` populated via `useSingleEventStats` — no separate fetch | `GET /guests/events/:eventId` |
| Add guest | `POST /events/:eventId/guests` (events-module duplicate) | `POST /events/:eventId/guests` | `POST /guests/events/:eventId` |
| Update guest | `PUT /events/:eventId/guests/:guestId` (web uses PUT) | `PUT /events/:eventId/guests/:guestId` | `PATCH /guests/events/:eventId/guests/:guestId` |
| Delete guest | `DELETE /events/:eventId/guests/:guestId` | `DELETE /events/:eventId/guests/:guestId` | `DELETE /guests/events/:eventId/guests/:guestId` |
| Export guests | `GET /events/export/:id/guests` | `GET /events/export/:id/guests` | `GET /guests/events/:eventId/export` |
| Rotate QR | not implemented | `POST /guests/events/:eventId/guests/:guestId/rotate-qr` | same |
| Revoke access | not implemented | `POST /guests/events/:eventId/guests/:guestId/revoke-access` | same |
| Get by invitation code | hook defined but unused | not implemented | `GET /guests/invitation/:code` |
| Submit RSVP | hook defined but unused | not implemented | `POST /guests/:id/rsvp` |

**HTTP-method mismatch** between web update mutation (PUT) and the canonical `guests` route (PATCH). After §2.4 both web and mobile must switch to PATCH.

**Web admin path divergence** — admin uses `eventsAPI.updateGuest` calling `PUT /events/:eventId/guests/:guestId` via raw `apiClient`; admin reads guests from populated `event.guestList`. After §2.4 admin should switch to canonical `useGuestMutation('update')` and `useEventGuests(eventId)`.

### 4.6 Loading / error / empty states

- `SingleEventStats.js` shows `Alert.alert` on success/error (both rule C6-acceptable for one-shot mutations). However the **guest list itself** is rendered from `event.guestList` without an explicit empty-state component — either an empty array renders nothing, or the parent screen handles emptiness. Verify `GuestList.js` renders an empty message when `data.length === 0`.
- `useSingleEventStats` loading/error handled in the parent screen — out of scope here.

### 4.7 Comment hygiene (mobile)

- `eventsService2.js:865` — `==================== STAFF / GUEST ACCESS TOKEN APIs ====================`.
- `eventsService2.js:866-883` — `Phase 4b W2-STAFF` block.
- `eventsService2.js:890-898` — `Phase 4 W2-STAFF` block.
- `eventsService2.js:917-922` — `Phase 4 W2-QR` block.
- `eventsService2.js:929-931` — `// Note: this endpoint lives under the /guests/...` — keep (genuine *why*).
- `eventsService2.js:944-948` — `Phase 4 W2-GAT` block.
- `SingleEventStats.js:252-257` — `Phase 4 W2-STAFF` block.
- `SingleEventStats.js:293, 322, 346` — `Phase 4 W2-QR / W2-GAT / W3-ADMIN` markers.

---

## 5. Cross-Platform API Consumption Diff

| Endpoint | Aspect | Web | Mobile | Backend truth (after §2.4) | Action |
|----------|--------|-----|--------|----------------------------|--------|
| List guests | path | `GET /guests/events/:eventId` | (reads from event populate) | `GET /guests/events/:eventId` | Mobile: add `useEventGuests` hook (or accept the populate path; flag) |
| List guests | response shape | `{success, data: [...], pagination}` (correct) but read via `data?.data || data || []` fallback | n/a | `{success, data: [...], pagination}` | Web: drop fallback chain → `data?.data || []` |
| Add guest | path | `POST /events/:eventId/guests` | `POST /events/:eventId/guests` | `POST /guests/events/:eventId` | Both: switch path |
| Add guest | request body | `{name, email, phone}` | `{name, email, phone}` | same | OK |
| Update guest | path | `PUT /events/:eventId/guests/:guestId` | `PUT /events/:eventId/guests/:guestId` | `PATCH /guests/events/:eventId/guests/:guestId` | Both: switch path + method |
| Update guest | allowed fields | `{name, email, phone, status}` | `{status}` (mobile updateGuestStatus) + `{name, email, phone, status}` (mobile updateGuest) | `{name, email, phone, status}` | Mobile: collapse `updateGuestStatus` and `updateGuest` into one |
| Delete guest | path | `DELETE /events/:eventId/guests/:guestId` | `DELETE /events/:eventId/guests/:guestId` | `DELETE /guests/events/:eventId/guests/:guestId` | Both: switch path |
| Export guests | path | `GET /events/export/:id/guests` | `GET /events/export/:id/guests` | `GET /guests/events/:eventId/export` | Both: switch path |
| Rotate QR | path | not implemented | `POST /guests/events/:eventId/guests/:guestId/rotate-qr` | same | Web: add hook `useRotateGuestQr` (UX gap — flag §6) |
| Revoke access | path | not implemented | `POST /guests/events/:eventId/guests/:guestId/revoke-access` | same | Web: add hook `useRevokeGuestAccess` (flag §6) |
| RSVP | path | not implemented (hook exists, no page) | not implemented | `POST /guests/:id/rsvp` | Decision needed — see §6 |
| RSVP | response field | hook reads `data` opaque | n/a | `{ guest: { id, name, status, rsvp: { responded, respondedAt } } }` after §2.5 schema fix; currently `response`, `message`, `dietaryRestrictions`, `plusOnes` are silently dropped | Backend: extend `Guest.rsvp` schema |
| Get by invitation code | path | not implemented | not implemented | `GET /guests/invitation/:code` | Decision §6 |

---

## 6. Suspected Bugs Worth Verifying

- **`submitRSVP` data loss (high-confidence bug).** `guests.service.js:83-89` writes `response`, `message`, `dietaryRestrictions`, `plusOnes` to `guest.rsvp` — none of those fields exist in the `Guest.rsvp` Mongoose subdoc schema. With `strict: true` (default), they are silently dropped on `guest.save()`. Verify by RSVPing through the API and checking the persisted document in MongoDB. **Fix: extend the schema or re-home those fields.**
- **`exportGuestsExcel` "Check-in Time" column always blank (high-confidence bug).** Service reads `guest.checkIn?.time` but the schema field is `checkIn.checkedInAt`. Verify by running an export against an event with a checked-in guest. (`guests.service.js:286`)
- **`AdminGuestTable.jsx:196` — admin `responseTime` column always blank (high-confidence bug).** Reads `guest.respondAt`; schema is `rsvp.respondedAt`. Verify by RSVPing and viewing the admin event detail page.
- **`requireSubscription` / `checkGuestLimit(1)` bypassed when calling the `guests`-module add path.** Web/mobile currently route through the events-module duplicate which DOES enforce the quota; if any client called `/guests/events/:eventId` directly it would bypass quota usage tracking. After §2.4 this is fixed.
- **`Event.guestList` array ↔ `Guest` collection drift.** `guests.service.addGuest` does both `Guest.create` and `event.guestList.push`; `deleteGuest` does both removals. If a write half-fails (no transaction), the two get out of sync. The mid-term fix is a transaction; flagged for a future pass.
- **Soft-delete (`Guest.deleted: true`)** is set up in the schema but no service in `guests.service.js` filters it out of `getEventGuests`. If there are tombstoned guests in production, the host list shows them. Verify and either filter `{ deleted: { $ne: true } }` in queries or remove the soft-delete field if unused.
- **`Guest.rsvp.responded`** is set by a `pre('save')` hook on status transitions to `confirmed`/`declined`. The service `submitRSVP` writes `guest.rsvp = {...}` (replacing the subdoc) AND `guest.status = response` — the pre-save hook then sees `isModified('status')` true and resets `rsvp.responded = true` and `rsvp.respondedAt = new Date()`. So the assigned `respondedAt` from the service is effectively overridden by the hook (cosmetic, no bug, but redundant work). Verify timing.
- **Invitation portal & RSVP UX — DECIDED (see §0.1): build the portal for whitelabel events on web + mobile.** Existing web hooks (`useGuestByToken`, `useGuestInvitation`, `useGuestMutation('rsvp')`) are the foundation; **do NOT delete them**. Mobile needs equivalent hooks + an unauthenticated deep-linked screen. Host events stay on the WhatsApp-button flow and do NOT use the portal. Tasks: §7.B.6 (web page), §7.C.9 (mobile screen).
- **Web admin `AddGuestPopup` (`addGuestPopup/AddGuestPopup.js:42`)** calls `onConfirm(editGuest._id, data)` — but `_formatGuest` returns `id`, not `_id`. After §3.4 admin migrates to canonical `useEventGuests`, the popup will need to call `onConfirm(editGuest.id, data)`. Verify behavior of edit before/after.
- **`useGuestMutation('rsvp')` invalidation key** is `["guests", "token", token]` but the same hook caches under `["guests", "invitation", invitationToken]` for `useGuestInvitation`. After RSVP both keys would need invalidation. Out-of-scope while no consumer.
- **Status enum mismatch between RSVP route Swagger and service** (`maybe` accepted by service but not in Swagger enum). Verify which contract the FE/mobile expects. Current decision (§2.2): expand Swagger.

---

## 7. Implementation Plan (Ordered)

Apply changes in this order. Each item ends with a checkbox the agent will tick during Phase 2.

### 7.A Backend

- [ ] **A.1** Add `labbe-backend-/src/modules/guests/guests.validation.js` with `addGuestSchema`, `updateGuestSchema`, `submitRSVPSchema` (per §2.6). Wire `validate(...)` into routes #2 / #4 / #5.
- [ ] **A.2** Add `validateObjectId('id')` to `POST /guests/:id/rsvp`. (`guests.routes.js:144`)
- [ ] **A.3** Port `requireSubscription` + `checkGuestLimit(1)` from events-module A1 onto `guests` route #4. (`guests.routes.js:244`)
- [ ] **A.4** Replace string-literal roles with `ROLES.*` constants in `rotateGuestQR`, `revokeGuestAccess`. (`guests.service.js:313-318, 420-425`)
- [ ] **A.5** Move the `logAudit` call from `guests.controller.exportGuests` into `guests.service.exportGuestsExcel`. (`guests.controller.js:130-136`)
- [ ] **A.6** Add `logAudit` calls in `guests.service.updateGuest`, `guests.service.deleteGuest`, `guests.service.addGuest` with `'guest.added' | 'guest.updated' | 'guest.deleted'`. (`guests.service.js:170, 220, 251`)
- [ ] **A.7** Replace `.catch(console.error)` on `_notifyHostRSVP` and `_notifyHostStatusChange` with `.catch((err) => logger.error(...))`. (`guests.service.js:94, 227`)
- [ ] **A.8** Fix `exportGuestsExcel` field reference: `guest.checkIn?.time` → `guest.checkIn?.checkedInAt`. (`guests.service.js:286`)
- [ ] **A.9** Extend `Guest.rsvp` subdoc schema in `models/GuestModel.js` to include `response: { type: String, enum: Object.values(RSVP_STATUS) }`, `message: String`, `dietaryRestrictions: String`, `plusOnes: Number`. Verify the existing pre-save hook still behaves correctly.
- [ ] **A.10** Filter soft-deleted guests out of `getEventGuests` and `addGuest` count: `{ deleted: { $ne: true } }`. (`guests.service.js:117, 164`)
- [ ] **A.11** Add Swagger JSDoc for routes #8 (`rotate-qr`) and #9 (`revoke-access`). (`guests.routes.js:330, 344`)
- [ ] **A.12** Update Swagger for #2 (RSVP) — expand response enum to include `maybe`; add 409/410 idempotency response examples; ensure `parameters` includes `validateObjectId('id')`. (`guests.routes.js:108-142`)
- [ ] **A.13** Update Swagger for #3 (`getEventGuests`) to match `sendPaginated` wire shape: top-level `data: array`, `pagination: object`. (`guests.routes.js:158-204`)
- [ ] **A.14** Comment-hygiene pass on backend: 16 markers listed in §2.7.
- [ ] **A.15** Delete `events`-module guest CRUD duplicates (A1–A4):
  - Routes: `events.routes.js` lines 590–683 + 181–215 (export route).
  - Controllers: `events.controller.js` lines 367–399 + the export controller (locate via grep).
  - Services: `events.service.js` lines 2069–2138 + the export service.
  - Swagger blocks travel with the routes.
  - Verify nothing else in the events module imports those service methods (grep).
- [ ] **A.16** Delete `API_PATHS.events.exportEventGuestsAsExcel`, `API_PATHS.events.addGuestToEvent`, `API_PATHS.events.updateEventGuest`, `API_PATHS.events.deleteEventGuest` from `labbe/services/new-backend/api.config.js`. (Done after FE migration so we don't break the build mid-flight.)

### 7.B Web

- [ ] **B.1** Replace fallback chains in `GuestTable.jsx`:
  - line 34: `eventData?.data?.event || null`
  - line 35: `guestsData?.data || []`
  - lines 90-102: rewrite optimistic update to operate on the array directly (see §3.4).
- [ ] **B.2** Fix `AdminGuestTable.jsx:196` — `responseTime: guest.rsvp?.respondedAt`.
- [ ] **B.3** Migrate `AdminGuestTable.jsx` to canonical hooks (`useEventGuests`, `useGuestMutation('update' | 'delete')`, `useExportGuests`); delete `eventsAPI.deleteGuest|updateGuest|exportGuests` from `services/adminDashboard.js`.
- [ ] **B.4** Add a new canonical `useGuestMutation` factory in `hooks/reactQueryHooks/useGuests.js` with `add | update | delete | rotateQr | revokeAccess | export` actions, all using `API_PATHS.guests.*` paths. Switch host `GuestTable.jsx` mutations from `useEventMutation('addGuest' | 'updateGuest' | 'deleteGuest')` to the new factory. **Do NOT delete the events-module action branches in `useEventMutation.js` until A.15 is merged** (mid-flight safety).
- [ ] **B.5** Switch `GuestTable.jsx:51` `downloadExportFile({path: API_PATHS.events.exportEventGuestsAsExcel(eventId)})` to `API_PATHS.guests.exportGuests(eventId)`.
- [ ] **B.6** Build the guest portal page at `app/[lang]/invitation/[code]/page.jsx` (public, no auth, whitelabel-events only — see §0.1). **Do NOT delete `useGuestByToken` / `useGuestInvitation` / `useGuestMutation('rsvp')` — wire them in.**
  - Use `useGuestByToken(code)` to load `{ guest, event }`.
  - Render event details (name, date, venue, host name) with whitelabel branding (read from `event.whitelabel` / tenant config).
  - Three RSVP buttons → call `useGuestMutation('rsvp')` with `{ token: code, response, data: { invitationCode: code, message?, dietaryRestrictions?, plusOnes? } }`.
  - On `confirmed` → render welcome message + QR encoding `guest.qrcode`.
  - On `declined` / `maybe` → render thank-you message.
  - Handle loading, network error, "event no longer accepting RSVPs" (validation 400), invalid-code (403/404), and idempotency-replay (409/410) states with translated copy.
  - Page is locale-aware (`[lang]` segment) and RTL-safe.
  - **Note:** host-event guests will not be sent this URL (they get WhatsApp buttons), so no event-type gate is required on the page itself — distribution channel enforces scope. If a host-event guest does land on the URL, the page renders normally; out of scope to block.
- [ ] **B.7** Delete the duplicate `useEventGuests` from `hooks/reactQueryHooks/useGuests.js` (keep the one in `hooks/events/queries/useEventGuests.js`).
- [ ] **B.8** Split `GuestTable.jsx` into `_components/GuestTable/` per §3.2. **Preserve `singleEvent.module.css` import path and every inline `style={{...}}` verbatim.**
- [ ] **B.9** Split `AdminGuestTable.jsx` into `_components/AdminGuestTable/` per §3.2.
- [ ] **B.10** Replace `console.error` with `handleError(error, t, ...)` in `GuestTable.jsx:113, 134, 158, 188`.
- [ ] **B.11** Wrap inline Arabic literals in `t()` (badge labels, fallback strings — §3.3). List keys in §8.
- [ ] **B.12** After A.15 merges, remove `addGuest|updateGuest|deleteGuest` action branches from `useEventMutation.js` (lines 211–250) and the `useAddGuest|useUpdateGuest|useDeleteGuest` named exports (lines 428–430).
- [ ] **B.13** Comment-hygiene pass: §3.7.

### 7.C Mobile

- [ ] **C.1** Create `services/guestsService.js` modeled on `ticketsService.js` with a `_request` helper and `guestFetch` that prepends `/guests`. Migrate `addGuest`, `updateGuestStatus` (collapse into `updateGuest`), `updateGuest`, `deleteGuest`, `exportEventGuests`, `rotateGuestQr`, `revokeGuestAccess` from `eventsService2.js`. Drop `_legacyToken` parameters. Use `ENDPOINTS.GUESTS.*` (already defined in `config/api.js`). Strip success-path `console.log`s.
- [ ] **C.2** Create `hooks/queries/useGuests.js` with `useEventGuests(eventId)` (`enabled: !!token`, `staleTime: 3 * 60 * 1000`, `queryKey: ["guests", "events", eventId]`).
- [ ] **C.3** Create `hooks/mutations/useGuestMutations.js` with `useAddGuest`, `useUpdateGuest`, `useDeleteGuest`, `useRotateGuestQr`, `useRevokeGuestAccess`, `useExportGuests`. Each invalidates `["guests"]` and `["events", "single-stats", eventId]`.
- [ ] **C.4** Switch `components/events/SingleEventStats.js` from direct `addGuest|updateGuest|deleteGuest|rotateGuestQr|revokeGuestAccess|exportEventGuests` calls to the new mutation hooks (preserves all existing optimistic flag logic).
- [ ] **C.5** Wrap hardcoded Arabic `Alert.alert` strings in `t()` (per §4.4); add keys in §8.
- [ ] **C.6** Switch existing mobile `addGuest|updateGuest|deleteGuest|exportEventGuests` paths in `eventsService2.js` to the new `/guests/...` paths (or just delete them after C.1 covers them).
- [ ] **C.7** Split `SingleEventStats.js` into the 5-file structure under `SingleEventStats/` per §4.2. **Preserve every `StyleSheet.create({...})` verbatim** in the extracted `styles.js`.
- [ ] **C.8** Comment-hygiene pass: §4.7 (8 phase-marker blocks in `eventsService2.js` and `SingleEventStats.js`).
- [ ] **C.9** Build mobile guest portal screen for whitelabel events (see §0.1). **Public / unauthenticated.**
  - Add deep-link route handling for `/invitation/:code` in the mobile linking config so a tap on an SMS/WhatsApp link opens the screen directly.
  - Add a public-fetch helper: existing `apiFetch` reads from `useAuthStore` and requires a token. Add a `publicFetch` (or `{ skipAuth: true }` option on `apiFetch`) that omits the `Authorization` header. Use it for the two portal endpoints only.
  - Add `hooks/queries/useGuestPortal.js` with `useGuestByToken(code)` and `hooks/mutations/useGuestPortal.js` with `useSubmitRSVP()` (both calling `publicFetch`).
  - Build screen `screens/guest-portal/InvitationScreen.js`:
    - Loads `{ guest, event }` and renders whitelabel-branded event info (logo, colors from `event.whitelabel` / tenant config).
    - Three RSVP buttons (Confirm / Decline / Maybe) → on submit, on `confirmed` show welcome message + QR (encode `guest.qrcode` via existing QR component); on `declined` / `maybe` show thank-you message.
    - Loading / error / expired-event / invalid-code / idempotency-replay branches translated via `events` locale namespace.
  - Host-only mobile builds either omit the screen or leave the deep link unreachable (no menu entry); the whitelabel mobile build registers the deep-link handler.
  - Add locale keys `events.guest.portal.*` (welcome message, RSVP buttons, thank-you copy, error copy) — list in §8 on completion.

### 7.D Cross-platform alignment (do AFTER A/B/C)

- [ ] **D.1** Re-grep `addGuestToEvent`, `updateEventGuest`, `deleteEventGuest`, `exportEventGuestsAsExcel`, `/events/.../guests`, `/events/export/.../guests` across the whole repo — should return **zero hits** in `labbe/`, `halla-mobile/`, `labbe-backend-` (except deleted-route audit comments).
- [ ] **D.2** Verify both web and mobile call `PATCH /guests/events/:eventId/guests/:guestId` (not PUT). Curl test or browser network-tab snapshot.
- [ ] **D.3** Verify both web and mobile read `data.data` as an array for `getEventGuests` and `data.data.guest` for single-guest mutations.
- [ ] **D.4** Smoke test: add → update → delete a guest from web admin, web host, mobile admin, mobile host. RSVP via `curl` (no UI consumer yet). Export from each surface — confirm "Check-in Time" populates after A.8.
- [ ] **D.5** Lint + type-check pass: `cd labbe && npm run lint`. (Mobile typically has no lint; verify Expo build still starts.)

---

## 8. Locale-key additions required

(Listed for the user — agent does NOT modify locale JSON without explicit approval.)

**Web (`labbe/localization/locales/{en,ar}/home-events.json` — namespace `home-events`):**

- `table.channel.whatsapp` (en: "WhatsApp", ar: "واتساب")
- `table.channel.sms` (en: "SMS", ar: "SMS")
- `table.channel.smsFallback` (en: "SMS (fallback)", ar: "SMS (بديل)")

**Web (`labbe/localization/locales/{en,ar}/adminEvents.json` — namespace `adminEvents`):**

- `messaging.invitationsSentRaw` (en: "{{count}} invitations sent successfully", ar: "تم إرسال {{count}} دعوة بنجاح") — already may exist as `messaging.invitationsSent`; verify and dedupe.

**Mobile (`halla-mobile/localization/locales/{en,ar}/events.json`):**

- `events.guest.alerts.updateSuccess` (en: "Guest updated", ar: "تم تعديل الضيف بنجاح")
- `events.guest.alerts.addSuccess` (en: "Guest added", ar: "تم إضافة الضيف بنجاح")
- `events.guest.alerts.deleteSuccess` (en: "Guest deleted", ar: "تم حذف الضيف بنجاح")
- `events.guest.alerts.deleteConfirmTitle` (en: "Delete confirmation", ar: "تأكيد الحذف")
- `events.guest.alerts.deleteConfirmBody` (en: "Are you sure you want to delete this guest?", ar: "هل أنت متأكد من حذف هذا الضيف؟")
- `events.guest.alerts.qrRotatedNew` (en: "New QR code generated. It will be sent to the guest via the usual channel.", ar: "تم إنشاء رمز QR جديد. سيُرسل إلى الضيف عبر القناة المعتادة.")
- `events.guest.alerts.qrUpdated` (en: "Access code updated.", ar: "تم تحديث رمز الدخول.")
- `events.guest.alerts.qrRotateError` (en: "Failed to update QR code.", ar: "تعذر تحديث رمز QR")
- `events.guest.alerts.accessRevokedSuccess` (en: "Guest access to post-event content revoked.", ar: "تم إلغاء صلاحية الضيف لمحتوى ما بعد المناسبة.")
- `events.guest.alerts.accessRevokeError` (en: "Failed to revoke access.", ar: "تعذر إلغاء الصلاحية")
- `events.guest.alerts.exportDialogTitle` (en: "Export guest list", ar: "تصدير قائمة الضيوف")
- `events.guest.alerts.successTitle` (en: "Success", ar: "نجاح")
- `events.guest.alerts.errorTitle` (en: "Error", ar: "خطأ")
- `events.guest.alerts.cancel` (en: "Cancel", ar: "إلغاء")
- `events.guest.alerts.delete` (en: "Delete", ar: "حذف")

(More may surface during C.5 — re-audit on completion.)

---

## 9. Rollback plan

For each `7.X.N` item, the rollback is a `git revert` of the commit. Items that touch DB shape:

- **A.9** (extend `Guest.rsvp` subdoc): adding optional fields is non-breaking (Mongoose simply allows them). No data migration needed; rolling back simply stops persisting them.
- **A.15** (delete events-module guest routes): pair with B.4 / C.1 / C.4 / C.6 in the same merge so the build stays green. **Project is in dev (§0.1.2) — no production rollout window, no min-app-version gate, no "keep duplicates for N releases" requirement.** A revert simply reverts the bundle.

No DB migrations otherwise.

---

## 10. Acceptance checklist (run after Phase 2)

- [ ] No file in module surface area exceeds the cap (backend max 600/300/400/300; web 250; mobile 350; mobile services 500).
- [ ] All `guests` endpoints have current Swagger; `events` module no longer documents guest endpoints.
- [ ] No duplicate guest endpoints remain (zero hits for `/events/.../guests` and `/events/export/.../guests` across the repo).
- [ ] Web + Mobile both call `/guests/events/:eventId/...` for add/update/delete/export.
- [ ] Web + Mobile both use PATCH (not PUT) for update.
- [ ] No multi-branch fallback chains in `GuestTable.jsx`, `AdminGuestTable.jsx`, `useGuests.js`, `useEventGuests.js`.
- [ ] No `// FLOW-…` / `// PHASE-…` / `// W2-…` / `// H-…` / `// M-…` / `// L-…` / `// D-…` markers in `modules/guests/`, `models/GuestModel.js`, `_components/GuestTable*`, `services/eventsService2.js` guest section, `SingleEventStats.js`.
- [ ] `submitRSVP` persists `response`, `message`, `dietaryRestrictions`, `plusOnes` (verify in MongoDB).
- [ ] `exportGuestsExcel` "Check-in Time" column populates for checked-in guests.
- [ ] `AdminGuestTable.jsx` "responseTime" column populates after RSVP.
- [ ] `requireSubscription` + `checkGuestLimit` enforced when adding a guest via the canonical `/guests/events/:eventId` path.
- [ ] `npm run lint` clean in `labbe/` (or no new warnings introduced).
- [ ] Visual smoke: host single-event guest table, admin single-event guest table, and mobile single-event guests tab look identical before/after the refactor (screenshots taken before `7.B`/`7.C` start).
- [ ] **Guest portal (web)**: page at `/[lang]/invitation/:code` loads valid invitations, submits RSVP, shows QR on `confirmed`, thank-you on `declined`/`maybe`, and gracefully handles invalid/expired codes + idempotency replays. Whitelabel branding applied.
- [ ] **Guest portal (mobile)**: deep link `/invitation/:code` opens `InvitationScreen` without requiring login, RSVP submits successfully, QR renders on `confirmed`. `publicFetch` (or `skipAuth` option) sends no `Authorization` header on the two portal endpoints.
- [ ] Existing web hooks `useGuestByToken`, `useGuestInvitation`, `useGuestMutation('rsvp')` are wired into the new portal page (NOT deleted).
