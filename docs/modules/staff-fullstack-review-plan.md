# staff — Full-Stack Review Plan

**Module:** staff
**Generated:** 2026-05-07
**Decisions locked:** 2026-05-08
**Prompt:** docs/implementation/MODULE_FULLSTACK_REVIEW_PROMPT.md
**Status:** Decisions locked · Phase 2 ready to start

---

## 0.0 Locked Decisions (2026-05-08)

These supersede every "Decision needed" / "KEEP-OR-DELETE" / "Flag in §6" line below. Where the original plan disagrees with what's locked here, **this section wins**.

1. **`POST /staff/events/:eventId/manual-check-in` → DELETE.** Zero callers; `overrideDeclined` is undefined behavior (controller passes a 4th arg the service silently drops at `staff.service.js:196`). Remove route, controller method, service method, Swagger block, web hook stub, mobile endpoint constant.
2. **`GET /staff/events/:eventId/stats` → DELETE, but FIRST merge `lastCheckIn` into the guests-response `stats` object.** Standalone endpoint is dead on both web (canonical hook + `services/staff.js:183 getStats` both unused) and mobile (`staffService.getEventStats` unused). The only thing it returned beyond `_computeGuestStats` was `lastCheckIn` — fold that into `getEventGuests` so no info is lost.
3. **Web staff cookie stays JS-writable for now.** The main app token (`Cookies.get("token")` in `apiClient.js:160`) has the same property — staff cookie is no worse. Defer to a global cookie-hardening pass. Plan §3.3's claim that the main token is HttpOnly was incorrect.
4. **Mobile staff session token → `expo-secure-store`.** Infra exists already (`services/secureStorage.js`, `expo-secure-store` in package.json, used by `authStore`). Drop-in replacement for the 3 `AsyncStorage.*Item` calls in `services/staffService.js:17-39`.
5. **Web data layer:** keep page-private `useStaffAuth` (URL-param routing the canonical hook lacks), migrate everything else to the canonical `hooks/reactQueryHooks/useStaff.js`. Fix the invalidation-key bug at the same time (active key is `["staff","guests",eventId]`, not `["staff","events",eventId]`).
6. **Revoke + list-staff-tokens UI: web only.** Mobile already has it — `halla-mobile/components/events/SingleEventStats/StaffTab.js` lists tokens and `useEventStatsActions.js:247` calls `revokeStaffAccess`; `ENDPOINTS.STAFF.LIST_STAFF_TOKENS` and `REVOKE_STAFF` already exist at `halla-mobile/config/api.js:117,119`. **Plan §4.3's claim that mobile hardcodes these paths is wrong — disregard 7.C.1.** Web side: add the UI in `labbe/app/[lang]/host/events/[id]/_components/EventHeader.jsx` (already renders `staffList`); mirror the mobile UI shape (active/revoked/expired/lastUsedAt badges + Revoke button gated on `usePageAccess(...).canDelete`).
7. **Filters: web AND mobile both gain search + status.** Mobile today has search only, no status (`PortalView.js`); web has neither. Target identical UX. Web uses URL state (B14); mobile lifts to route state.
8. **Locale-blind notification: fix now.** `UserModel.preferredLanguage` exists (default `'ar'`). In `staff.service.js:576-590` `_notifyHostCheckIn`, populate `host` with `preferredLanguage` and substitute `${event.host.preferredLanguage || 'ar'}` into the actionUrl.
9. **Per-phone rate-limit on `/staff/verify`: defer.** Document in a follow-up security audit; do not change here.
10. **`getEventGuests` response envelope: use `sendSuccess(res, { guests, stats, pagination })`.** `sendPaginated`'s signature is `(res, data, pagination, message)` — no meta arg, so passing `stats` through it is impossible without a helper change. `sendSuccess` produces wire shape `{ success, status, data: { guests, stats, pagination } }` — exactly what web and mobile already read, so **no frontend remap is needed and 7.D.1 becomes a no-op**.
11. **Validation library: Zod, not Joi.** Project rule (`feedback_validation_zod`): use `validateZod` middleware from `shared/middleware/validation.js:401`. Every "Joi" mention in §2.6 / §7.A.1 / §7.A.2 / §10 is replaced with the Zod equivalent.

### Plan errors discovered during decision-lock

- §3.3 — claim that the main auth token uses HttpOnly cookies is **wrong**; it's `Cookies.get("token")` in JS.
- §4.3 — claim that mobile hardcodes `LIST_STAFF_TOKENS`/`REVOKE` URLs is **wrong**; both are in `config/api.js:117,119` and used through `eventsService.staff.js`.
- §6 — endpoint #6/#7 are listed as having no consumer on either side; in fact mobile already consumes both via `SingleEventStats/StaffTab.js` + `useEventStatsActions.js`.

---

## 0. Executive Summary

- **7 total endpoints** owned by the `staff` module (5 mounted at `/staff/*` in `staff.routes.js`, 2 mounted at `/events/:eventId/staff-tokens` and `/events/:eventId/staff/:staffId/revoke` in `events.routes.js`).
- **0 candidates for outright deletion** (no duplicate jobs), but **1 endpoint is unconsumed by any client** — `POST /staff/events/:eventId/manual-check-in` has a web hook stub but zero callers, and the mobile app does not implement it. Decision needed: build the UI on both platforms or delete the endpoint.
- **5 Swagger drift findings** — `GET /staff/events/:eventId/guests` documents `SuccessResponse` but the controller emits a bespoke envelope (`{ status, results, data: { guests, stats, pagination } }`), `POST /staff/events/:eventId/check-in` body schema marks all three identifier fields optional with no oneOf constraint, `GET /staff/verify` response is undocumented (returns `verified, staff, event, sessionToken`), `POST /events/:eventId/staff/:staffId/revoke` has only a comment-block (no `@swagger` JSDoc), and the documented response of all staff endpoints does not mention the 410 GONE branch the service throws for revoked/expired tokens.
- **0 backend file-size violations.** `staff.service.js` is 593 lines (cap 600) — close to the limit but compliant; flagged in §6 because more business logic is likely to be added.
- **0 web file-size violations.** Largest file in the staff page tree is `QRScanner.js` at 236 lines.
- **0 mobile file-size violations.** Largest file is `PortalView.js` at 270 lines (cap 350).
- **6 web/mobile API consumption mismatches** — see §5.
- **3 data-mapping/contract bugs** — `useVerifyStaffAccess` (web canonical hook) makes the call without query params and can never succeed; the bespoke web `useStaff.js` canonical hooks are entirely unused while a parallel `app/[lang]/staff/hooks/useStaff*.js` set runs the actual page; mobile has no React Query hooks for staff at all (everything is imperative).
- **Missing safeguards:** no Zod `staff.validation.js`, no rate-limit on `/check-in` / `/manual-check-in`, regex search not escaped (regex-injection-class issue), role string literals instead of `ROLES` constants, top-level `logAudit` import duplicated by an inline `require()`, hardcoded `/ar/...` host link in notification, web `staffToken` cookie set from JS (not HttpOnly), mobile staff token in AsyncStorage (not SecureStore).
- **~15 comment-hygiene blocks to remove** across backend (`FLOW-20-F01/F03`, `Phase 3e.1/3e.2/4b`, `H-20/H-21/H-22`, `M-10`, `D5/D6`, `L-9`, `W0-STAFF`, `W0-AUTH`).
- **Estimated effort:** **M** (touches backend service contract, both frontend layers, and adds a Zod schema + a small RBAC test of revoke/list — but no large file splits required).

---

## 1. Endpoint Inventory

| # | Method | Path | Controller | Service | Middleware chain | Swagger | Web hook | Mobile hook | Status |
|---|--------|------|------------|---------|------------------|---------|----------|-------------|--------|
| 1 | GET | `/staff/verify` | `verifyStaffAccess` | `verifyStaffAccess` | `apiLimiter` | partial — response shape undocumented; 410 GONE branch undocumented | `staffService.verifyByToken / verifyByPhone` (web has `useVerifyStaffAccess` but it omits query params and is never called) | `staffService.verifyByPhone / verifyByToken` (no React Query hook) | KEEP — fix swagger + canonical hook |
| 2 | GET | `/staff/events/:eventId/guests` | `getEventGuests` | `getEventGuests` | `staffAuth`, `validateObjectId("eventId")` | drift — controller hand-rolls `{ status, results, data: { guests, stats, pagination } }` instead of `sendPaginated` | `useStaffEventGuests` (canonical, unused) **and** `app/[lang]/staff/hooks/useStaffGuests.js` (actually used) | direct `staffService.getEventGuests` call from `PortalView` | KEEP — switch controller to `sendPaginated`, dedupe web hooks, add mobile React Query hook |
| 3 | POST | `/staff/events/:eventId/check-in` | `checkInGuest` | `checkInByQR` / `checkInByIdentifier` | `staffAuth`, `validateObjectId("eventId")` | partial — body documented loosely (`qrCode`/`guestId`/`phone` all optional, no oneOf) | `useStaffMutation("checkInGuest")` (unused) **and** `staffService.checkInById/QR/Phone` (used) | `staffService.checkInById/checkInByQR/checkInByPhone` (no hook) | KEEP — Joi schema (oneOf), rate-limit, dedupe web mutation usage, add mobile React Query mutation |
| 4 | POST | `/staff/events/:eventId/manual-check-in` | `manualCheckIn` | `manualCheckIn` | `staffAuth`, `validateObjectId("eventId")` | partial — body schema lists fields but no validation; `overrideDeclined` semantics undocumented | `useStaffMutation("manualCheckIn")` (unused) | none | **DELETE (locked 2026-05-08)** — see §0.0 #1 / 7.A.15 |
| 5 | GET | `/staff/events/:eventId/stats` | `getEventStats` | `getEventStats` | `staffAuth`, `validateObjectId("eventId")` | partial — response shape `{ stats: {...} }` undocumented (returns `total, confirmed, checkedIn, declined, pending, lastCheckIn`) | `useStaffEventStats` (unused) | none | KEEP — fix swagger, dedupe |
| 6 | POST | `/events/:eventId/staff/:staffId/revoke` | `revokeStaffToken` (in staff module) mounted on events router | `revokeStaffToken` | `protect` (router head), `validateObjectId("eventId")`, `validateObjectId("staffId")`, `idempotency({ scope: "staff.revoke" })` | **missing** — comment block only, no `@swagger` JSDoc | none | hardcoded path in `eventsService2.js:910` | KEEP — add Swagger, add API_PATHS entry, add canonical web hook + UI plan or document why no UI |
| 7 | GET | `/events/:eventId/staff-tokens` | `listStaffTokens` (in staff module) mounted on events router | `listStaffTokens` | `protect` (router head), `validateObjectId("eventId")` | partial — `@swagger` block exists (`events.routes.js:847`) but response schema not enumerated | none | hardcoded path in `eventsService2.js:886` | KEEP — flesh out Swagger response schema, add API_PATHS entry, add web hook |

**Legend:** KEEP, DELETE-DUPLICATE-OF-#N, RENAME, MERGE-WITH-#N, KEEP-OR-DELETE.

> **Note on cross-module placement.** The `staff` controller exports the handlers for #6 and #7 but the routes are mounted under `events.routes.js`. That coupling is fine (URL shape mirrors the resource hierarchy), but it means a future reader looking at `modules/staff/` alone misses two endpoints. Add a one-line comment at the top of `staff.controller.js` and `staff.routes.js` calling out that #6/#7 are mounted on the events router.

---

## 2. Backend Findings

### 2.1 File-size violations

- None. `staff.service.js` is 593 / 600 — flag for proactive split if any further logic is added (see §6).

### 2.2 Swagger drift

- **`GET /staff/verify`** (`staff.routes.js:60`) — JSDoc says `200 → SuccessResponse`. Service actually returns `{ verified, staff: { _id?, name, phone, role }, event: { _id, title, date, time, location, status }, sessionToken }`. Also throws **410 GONE** with body `{ reason: "staff_revoked"|"staff_expired", message, expiresAt?, revokedAt? }` (`staff.service.js:38-52`). Add a `StaffVerifyResponse` schema and a `410` response branch.
- **`GET /staff/events/:eventId/guests`** (`staff.routes.js:99`) — JSDoc claims `SuccessResponse`. Controller hand-rolls `{ status, results, data: { guests, stats, pagination } }` (`staff.controller.js:39-48`). After §2.5 fix (switch to `sendPaginated`), add a `StaffGuestListResponse` schema and reference it.
- **`POST /staff/events/:eventId/check-in`** (`staff.routes.js:142`) — body schema lists `qrCode`, `guestId`, `phone` all as plain string with no `oneOf` requirement. Service requires exactly one (`staff.controller.js:60-71`). After Zod schema is added in §2.6, update JSDoc to use `oneOf` + `required: true`.
- **`POST /staff/events/:eventId/manual-check-in`** (`staff.routes.js:186`) — `overrideDeclined: boolean` is documented but its semantics aren't (it bypasses RSVP `declined` check). Either implement the override path explicitly in the service (it currently is **not** wired — `manualCheckIn` does not branch on `overrideDeclined`) and document it, or remove the field from the body (and from `useStaffMutation`).
- **`POST /events/:eventId/staff/:staffId/revoke`** (`events.routes.js:838`) — **no `@swagger` JSDoc at all**, only a comment block. Add a full block matching the response shape `{ revoked: boolean, affected: number, wasAlreadyRevoked: boolean }`.

### 2.3 Missing middleware / safeguards

- `POST /staff/events/:eventId/check-in` and `POST /staff/events/:eventId/manual-check-in` have **no rate limiter**. A staff session token + a guess loop can hammer the endpoint. Add `apiLimiter` (or a tighter limit, e.g. 60/min/staff token).
- `GET /staff/verify` (`staff.routes.js:61`) accepts `phone+eventId`. `apiLimiter` is in place (good) but the lookup path is `event.staffList.find(s => s.phone === phone)` — there is no per-phone lockout. If `apiLimiter` is keyed by IP only, document that explicitly (or add a per-phone bucket). **Flag** for security review, do not change without confirmation.
- **No idempotency middleware** on `/check-in`. The service uses an atomic CAS in `_performIdempotentCheckIn` (`staff.service.js:455-491`) which the comment explicitly defends as superior to the HTTP idempotency cache for this use case. Keep — but add a one-line `// IDEMPOTENCY: handled at DB level via CAS in service.` comment so the next reviewer doesn't re-flag it.
- **Audit log on guest check-in** (`staff.service.js:498-517`) wraps `logAudit` in `try/catch` and falls back to `console.warn`. The intent is correct (don't fail check-in because audit failed) but the `console.warn` violates D6. Replace with the shared logger from `shared/utils/logger.js`.

### 2.4 Duplicate / dead endpoints

- **`POST /staff/events/:eventId/manual-check-in`** has zero consumers (web hook stub `useStaffMutation("manualCheckIn")` is exported but never imported; mobile does not call it). Status: **KEEP-OR-DELETE — needs decision**. If the host UX requires "manual check-in with note + override declined" then build the UI on web + mobile; otherwise delete the route, controller, service method, and `API_PATHS.staff.manualCheckIn` / `ENDPOINTS.STAFF.MANUAL_CHECK_IN` / `useStaffMutation("manualCheckIn")` together.
- **`DELETE /events/:eventId/staff/:staffId`** (`events.routes.js:822-827`) and **`POST /events/:eventId/staff/:staffId/revoke`** (`events.routes.js:838-843`) live next to each other, both keyed on `:staffId`, and the path shapes invite confusion: the `DELETE` route's `:staffId` is a `staffList` sub-document `_id` and removes a staff member from the event; the `POST .../revoke` route's `:staffId` is **also** a `staffList` sub-document `_id` (per `staff.service.js:391`) and revokes their access tokens. These are **not duplicates** but the colocation reads as if they might be. Add a short JSDoc note above each that disambiguates the action and the lifecycle (delete vs revoke).

### 2.5 Service / controller violations

- **`staff.controller.js:39-48`** — `getEventGuests` calls `res.status(200).json({ status, results, data: { guests, stats, pagination } })` directly, violating A2 rule #2 ("Never call `res.status(...).json(...)` directly"). **Locked fix (§0.0 #10):** replace with `sendSuccess(res, { guests, stats, pagination })` — wire shape stays the same minus the `results` field, so no frontend remap. `sendPaginated` cannot carry `stats` (its signature is `(res, data, pagination, message)` with no meta arg).
- **`staff.controller.js:55-74`** — `checkInGuest` performs business validation (`if (!qrCode && !guestId && !phone) throw new ValidationError(...)`). Move into the Zod schema (use `.refine(...)` to enforce exactly one of the three) so the controller reduces to "parse → call service → respond".
- **`staff.controller.js:69`** — inline `require("../../shared/errors")` inside the handler. Move to the top of the file.
- **`staff.service.js:9-19`** — `logAudit` and `AppError` are imported at the top **and** required again inline at lines 39, 499 inside service methods. Dedupe (use the top-level imports throughout).
- **`staff.service.js:134`** — `new RegExp(search, 'i')` does not escape user input (A3 rule #4). Apply `.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')` (or use `$text` if the model has a text index). This is a regex-injection / DoS-class issue (a hand-crafted `(a+)+$` from the URL can pin the Node event loop).
- **`staff.service.js:317, 380-385`** — role checks use string literals (`'admin'`, `'super_admin'`, `'whitelabel_admin'`). A3 rule #8 violation. Import from `shared/constants/roles.js` (`ROLES.ADMIN`, `ROLES.SUPER_ADMIN`, `ROLES.WHITELABEL_ADMIN`).
- **`staff.service.js:495, 516`** — `console.error` and `console.warn` calls. D6 violation. Replace with the shared logger or drop and let the global error handler / audit-log truth-source own it.
- **`staff.service.js:587`** — `actionUrl: ${frontendUrl}/ar/host/events/${eventId}` — language is **hardcoded as `ar`**, ignoring the host's preference. Notification clicks always send the host to the Arabic version. Use the host's `preferredLanguage` (load from `event.host` or default to event-level locale), or keep as-is and document why. **Flag in §6** as a likely UX bug, not silently fix.
- **`staff.service.js:309-348` (`listStaffTokens`)** — RBAC check is duplicated with `revokeStaffToken` (lines 376-389). Extract a private helper `_assertStaffTokensRBAC(event, actor)` that both call.
- **`staff.service.js:495`** — `_notifyHostCheckIn(...).catch(console.error)` — fire-and-forget log goes to console; replace with logger.

### 2.6 Validation gaps

- **No `staff.validation.js`.** Add it with **Zod** schemas (project rule — Joi is forbidden for new code):
  - `verifyStaffAccessQuery` — `z.object({ token: z.string().optional(), phone: phoneSchema.optional(), eventId: objectIdSchema.optional() }).refine(...)` enforcing `token` XOR (`phone` AND `eventId`).
  - `checkInBody` — `z.object({ qrCode: z.string().optional(), guestId: objectIdSchema.optional(), phone: phoneSchema.optional() }).refine(...)` enforcing exactly one of the three.
  - ~~`manualCheckInBody`~~ — **NOT NEEDED** (endpoint deleted in A.15).
  - `getEventGuestsQuery` — `z.object({ search: z.string().max(120).optional(), status: z.enum(["invited","confirmed","declined","checked_in","maybe"]).optional(), page: z.coerce.number().int().min(1).optional(), limit: z.coerce.number().int().min(1).max(100).optional() })`.
- Wire each schema with `validateZod(schema, source)` middleware (`shared/middleware/validation.js:401`) in `staff.routes.js` *before* the controller call.

### 2.7 Comment hygiene

Remove the following markers (the rationale they encode either belongs in git history or is already obvious from the code):

- `staff.controller.js:109` — `// Phase 3e.1 / FLOW-20-F01`
- `staff.controller.js:118` — `// Phase 4b W0-STAFF`
- `staff.service.js:33-40` — `H-20:` block (keep the reasoning paragraph as a `// 410 vs 403 disambiguation:` short comment, drop the `H-20:` ticket number).
- `staff.service.js:156-160` — `H-22:` aggregation comment. Keep one line ("counts via aggregation; full collection load was OOM-class at >10K guests"), drop the `H-22:`.
- `staff.service.js:171-178` — `Phase 3e.2 (FLOW-20-F03 / decision D6):` block. Replace with a 1-line "see `_performIdempotentCheckIn` for CAS rationale".
- `staff.service.js:243-246` — `H-22:` repeat. Drop ticket marker.
- `staff.service.js:293-307` — `Phase 4b W0-STAFF` paragraph. Keep the **why** ("active-token list distinct from staff sub-doc list"), drop the phase tag.
- `staff.service.js:351-371` — `Phase 3e.1 / FLOW-20-F01 / D5` block. Trim to just the RBAC + idempotency rationale; drop the markers.
- `staff.service.js:440-454` — `Phase 3e.2 / FLOW-20-F03 / D6` and `M-10 / Phase 5 hand-off groundwork:` (line 497) — drop both markers, keep the substantive CAS-vs-HTTP-idempotency rationale (it's load-bearing for future readers).
- `staff.service.js:458-463` — `H-21:` marker. Keep the *why* (staff sessions don't have a `_id`), drop the marker.
- `events.routes.js:830` — `Phase 3e.1 / FLOW-20-F01.` Drop.
- `events.routes.js:850` — `Phase 4b W0-STAFF`. Drop.

---

## 3. Frontend Web Findings

### 3.1 Component tree per page

The staff feature has exactly one user-facing page on web.

- **`app/[lang]/staff/page.js`** (156 lines) — host-issued staff portal landing.
  - `app/[lang]/staff/_components/header/Header.js` (12 lines)
  - `app/[lang]/staff/_components/cards/Cards.js` (94 lines) — stats cards
  - `app/[lang]/staff/_components/list/List.js` (94 lines)
    - `app/[lang]/staff/_components/list/ListItem.js` (34 lines, used transitively by `List.js`)
  - `app/[lang]/staff/_components/qrScanner/QRScanner.js` (236 lines) — jsQR camera modal
  - `app/[lang]/staff/_components/scanIcon/ScanIcon.js` (74 lines) — floating SVG button
  - `app/[lang]/staff/_components/successAndFaild/SuccessAndFaild.js` (158 lines) — check-in result modal
  - `ui/common/loading/SimpleLoading` (shared)
- **Hooks (page-private):**
  - `app/[lang]/staff/hooks/useStaffAuth.js` (67 lines)
  - `app/[lang]/staff/hooks/useStaffGuests.js` (43 lines)
- **Shared services:**
  - `services/staff.js` (197 lines) — bespoke `staffService` exporting `verifyByToken`, `verifyByPhone`, `getGuests`, `checkInById/QR/Phone`, `manualCheckIn`, `getStats`, plus token cookie helpers.
- **Canonical (mostly unused) hooks:**
  - `hooks/reactQueryHooks/useStaff.js` (118 lines) — exports `useVerifyStaffAccess`, `useStaffEventGuests`, `useStaffEventStats`, `useStaffMutation`. **None are imported by any consumer.**
- **Locales:**
  - `localization/locales/en/staff.json` and `ar/staff.json` (both 37 lines, in sync per scan).

There is **no host-side UI** for revoking staff access tokens or listing them — endpoints #6 and #7 have no web consumer.

### 3.2 File-size violations

- None.

### 3.3 Hardcoded text / data / paths

- None found in the staff page tree (every user-facing string goes through `t("staff:…")`; every API call goes through `API_PATHS.staff.*`). Exception worth noting: `services/staff.js:56` and `:74` build the URL with template strings (`?token=…`, `?phone=…&eventId=…`) instead of letting `apiClient` serialize a `params` object. Functional but inconsistent with the rest of the codebase. Switch to `apiClient.get(API_PATHS.staff.verifyStaffAccess, { params: { token } })` style.
- **Cookie storage of the staff session token in JS** (`services/staff.js:23-31` — `Cookies.set("staffToken", …, { sameSite: "Lax" })`) violates B22's "Reading/writing tokens in JS instead of HttpOnly cookies (web)" rule. The main auth token uses HttpOnly cookies set by the backend; the staff session token here is JS-readable. **Flag for security review** in §6 — do not silently switch (it would require a backend `Set-Cookie` change to issue the staff cookie HttpOnly, and the app code that currently reads the cookie via JS would need to stop doing so).

### 3.4 Data mapping bugs / fallback chains

- **`hooks/reactQueryHooks/useStaff.js:15-26` (`useVerifyStaffAccess`)** is **broken**. It calls `apiRequest({ method: "GET", path: API_PATHS.staff.verifyStaffAccess })` with no `params` — the backend requires `?phone=…&eventId=…` or `?token=…` and will 400. The hook can never succeed. Either delete (the `services/staff.js` direct functions cover this) or change the signature to `useVerifyStaffAccess({ token } | { phone, eventId })` and pass `params`.
- **`hooks/reactQueryHooks/useStaff.js:33-45` (`useStaffEventGuests`)** does not accept or forward `search`, `status`, `page`, `limit`. Backend supports them. Either accept a `params` arg and pass it (and include it in the queryKey for cache correctness), or delete the hook in favor of the active `app/[lang]/staff/hooks/useStaffGuests.js`.
- **`app/[lang]/staff/hooks/useStaffGuests.js:27`** — `response.data || { guests: [], stats: EMPTY_STATS }` is a single-branch fallback at the API boundary, which is acceptable per B0.1. Keep.
- **`app/[lang]/staff/hooks/useStaffGuests.js:37-38`** — `query.data?.guests || []`, `query.data?.stats || EMPTY_STATS`. Single-branch empty-state guards. Acceptable; keep.
- After the backend response shape is normalized (§7.A.5: switch `getEventGuests` controller to `sendPaginated`), the mappings in `services/staff.js:111` (`response = apiClient.get(...)` → caller reads `response.data.guests`) need to follow the new envelope. Document the migration in §7.D.

### 3.5 Duplicate hooks / direct apiRequest calls

- **Two parallel data layers exist for the staff portal**:
  1. `hooks/reactQueryHooks/useStaff.js` (canonical per project convention, but **unused**).
  2. `app/[lang]/staff/hooks/useStaff*.js` + `services/staff.js` (the ones the page actually uses).
  Per B0.2 "one canonical query/mutation per endpoint", this must collapse to one. Recommended: **migrate the staff page to the canonical `hooks/reactQueryHooks/useStaff.js` hooks** after fixing the bugs in §3.4, and delete `app/[lang]/staff/hooks/useStaffAuth.js` + `app/[lang]/staff/hooks/useStaffGuests.js`. The page-private `useStaffAuth` does some URL-param routing logic that the canonical hook doesn't cover — keep that logic but lift it into the canonical layer (e.g. add a `useStaffAccessFromSearchParams()` orchestrator). Confirm direction with user before refactoring (§6).
- **The page calls `staffService.checkInById(...)` / `checkInByQR(...)` directly** (`app/[lang]/staff/page.js:43, 72`), bypassing `useStaffMutation("checkInGuest")`. Either build the page on top of the mutation hook (preferred) or delete the unused mutation hook.

### 3.6 State / loading / error gaps

- The staff page renders loading + error + (via `<List/>`) empty states correctly.
- It is **not wrapped in `<ErrorBoundary>`** (B19). Add one.
- Filter state (search/status) is not exposed in the UI at all. The backend supports `search` + `status`. Either expose them with URL-state (B14) or deliberately note in §6 that the staff portal is intentionally unfiltered.
- `useStaffAuth` collapses every error reason to `t("errors.verificationFailed")` (`useStaffAuth.js:57`). The backend distinguishes 410 GONE (`reason: "staff_revoked" | "staff_expired"`) from 403 (invalid). Surface those with distinct messages so a revoked staff member sees "Your access was revoked" instead of a generic verification failure.

### 3.7 Comment hygiene

- `hooks/reactQueryHooks/useStaff.js:115` — `console.error(\`Staff mutation error (${action}):\`, error);` — D6 violation. Either let `handleError` surface to the user (component-level catch) or drop entirely; do not console-error in committed code.
- No FLOW-/PHASE-/H-/M- markers found in the web staff tree.

---

## 4. Frontend Mobile Findings

### 4.1 Screen → component tree

- **`screens/common/StaffPortalScreen.js`** (74 lines) — orchestrator that renders `LoginView` or `PortalView`.
  - `components/common/staff-portal/LoginView.js` (196 lines) — phone + eventId form; calls `staffService.verifyByPhone`.
  - `components/common/staff-portal/PortalView.js` (270 lines) — guest list + check-in + stats; calls `staffService.getEventGuests / checkInById / checkInByQR`.
    - `components/common/staff-portal/GuestCard.js` (109 lines)
    - `components/common/staff-portal/QRModal.js` (125 lines)
    - `components/common/staff-portal/StatCard.js` (41 lines)
- **Service:** `services/staffService.js` (206 lines) — exports `verifyByPhone/Token`, `getEventGuests`, `checkInById/QR/Phone`, `getEventStats`, plus AsyncStorage token helpers. Uses a bespoke `staffFetch()` (custom `fetchWithTimeout`) **not** the project-standard `apiFetch`. The split is intentional per the inline comment ("staff session token must not trigger user-token refresh") but it duplicates timeout / JSON-parse / error-shaping logic. After §4.5 is settled, consider parameterizing `apiFetch` to accept an alternate token source so this duplication can be removed.
- **Locale:** `localization/locales/{en,ar}/staff.json` (~63 lines) — in sync.

### 4.2 File-size violations

- None. `PortalView.js` at 270 lines is the largest staff screen file (cap 350).

### 4.3 Service / hook violations

- **No React Query hooks for staff** (C2 violation). Every staff operation is `staffService.*` called inside `useState`/`useCallback` handlers in `LoginView.js` and `PortalView.js`. Add `hooks/queries/useStaff.js` (`useStaffEventGuests`, `useStaffEventStats`) and `hooks/mutations/useStaffMutations.js` (`useVerifyStaffAccess`, `useCheckInGuest`, `useManualCheckIn`) so check-ins automatically invalidate the guest list (currently the screens manage this with imperative re-fetches).
- **`services/staffService.js:29, 37`** — `console.error("[StaffService] …")`. D6 violation. Replace with `logger.warn` if a logger exists, or drop and rely on the thrown `Error` reaching the screen.
- **`services/staffService.js:49`** — `// Phase 4 W0-AUTH` marker. D5 / C8 violation. Remove (keep the rationale prose if present).
- **Hardcoded paths in `services/eventsService2.js:886` (`listStaffTokens`) and `:910` (`revokeStaffAccess`)** — both build the URL with backticks instead of using `ENDPOINTS.STAFF.*`. Add `ENDPOINTS.STAFF.LIST_TOKENS = (eventId) => '/events/' + eventId + '/staff-tokens'` and `ENDPOINTS.STAFF.REVOKE = (eventId, staffId) => '/events/' + eventId + '/staff/' + staffId + '/revoke'` to `config/api.js`, then have those service functions use them.
- **`PortalView.js:30-94`** — three `useCallback`s call `staffService.*` directly with imperative `setGuests`/`setStats` updates after success. Replace with React Query mutations whose `onSuccess` invalidates `["staff", "guests", eventId]` and `["staff", "stats", eventId]`.
- **Auth token storage**: `services/staffService.js` puts the staff session JWT in **AsyncStorage** rather than `expo-secure-store`. Auth-bearing tokens should be in SecureStore (mobile equivalent of HttpOnly). **Flag for security review** in §6 — do not silently move (some persistence callers may assume async-storage availability on RN web).

### 4.4 Hardcoded text / data / paths

- All user-facing strings go through `t("staff:…")` per agent scan. ✓
- See §4.3 for the two hardcoded URL templates in `eventsService2.js`.

### 4.5 Web/Mobile divergence

See §5 for the per-endpoint table. The biggest aggregate divergences:
- Mobile has no React Query layer for staff; web has one (mostly unused).
- Mobile does not implement `manual-check-in` at all; web has a hook stub.
- Mobile hardcodes the host-side staff-tokens endpoints; web does not call them at all.
- Mobile uses `staffFetch` (custom token + custom timeout); web uses `apiClient` (shared instance).

### 4.6 Loading / error / empty states

- `PortalView.js` renders all three states. ✓
- `LoginView.js` renders loading + error; empty state N/A. ✓
- Error UI does not differentiate the 410 GONE branch (revoked / expired) from a generic auth failure — same observation as web (§3.6).

### 4.7 Comment hygiene

- `services/staffService.js:49` — `// Phase 4 W0-AUTH:` block. Trim to the rationale ("we use a separate `staffFetch` so refresh-on-401 doesn't fire for staff sessions"); drop the phase marker.
- No other markers found in mobile staff tree.

---

## 5. Cross-Platform API Consumption Diff

| Endpoint | Aspect | Web | Mobile | Backend truth | Action |
|----------|--------|-----|--------|---------------|--------|
| #1 `GET /staff/verify` | Param style | Template-string query (`services/staff.js:56,74`) | Template-string query (`staffService.js`) | Accepts `?token=` xor `?phone=&eventId=` | Both: switch to params object once Zod schema lands; both: surface 410 GONE reason in UI |
| #1 | Response mapping | Reads `response.data.{verified, staff, event, sessionToken}` | Reads same fields | Service returns `{ verified, staff, event, sessionToken }` wrapped in `sendSuccess` (so wire = `{ success, status, data: { verified, ... } }`) | ✅ Aligned |
| #2 `GET /staff/events/:id/guests` | Query params sent | None today (page has no filter UI) | `search?, status?, page?, limit?` (`PortalView.js`) | All four supported | Web: add filter UI or document the gap; Mobile: keep |
| #2 | Response envelope | Reads `response.data.{guests, stats, pagination}` | Reads same | Controller hand-rolls `{ status, results, data: { guests, stats, pagination } }` | **Locked (§0.0 #10):** after 7.A.5, wire becomes `{ success, status, data: { guests, stats, pagination } }` — same `data.*` shape clients already read. **No frontend remap.** `stats` will additionally include `lastCheckIn` after A.5b. |
| #3 `POST /staff/events/:id/check-in` | Body shape | `{ qrCode } | { guestId } | { phone }` (3 separate service fns) | `{ qrCode } | { guestId } | { phone }` (3 separate fns) | accepts any one of three (no Zod yet) | ✅ Aligned; tighten with Zod `.refine()` enforcing exactly-one |
| #3 | Response mapping | Reads `response.data.{guest, alreadyCheckedIn}` | Reads `result.data.{guest, alreadyCheckedIn}` | Service returns `{ guest, alreadyCheckedIn, checkedInAt, message, [checkedInBy]? }` | Both should also surface `checkedInAt` to display "checked in at HH:MM" — currently neither does. Optional polish, flag in §6. |
| #4 `POST /staff/events/:id/manual-check-in` | Existence | Hook stub `useStaffMutation("manualCheckIn")` (no consumer) | ❌ not implemented | Endpoint exists | **DELETE (locked 2026-05-08)** — see §0.0 #1 / 7.A.15 / 7.B.7 / 7.C.4 |
| #5 `GET /staff/events/:id/stats` | Caller | Implicit (returned via `getEventGuests` envelope, not called separately) | Implicit (same) | Service exposes a separate stats endpoint that includes `lastCheckIn` | Decide whether the dedicated endpoint should be polled (e.g. live counter) or removed in favor of the embedded stats. **Suspected dead-on-arrival** — flag in §6. |
| #6 `POST /events/:id/staff/:staffId/revoke` | Web caller | ❌ none | hardcoded path in `eventsService2.js:910` | Endpoint exists | Web: add `API_PATHS.events.revokeStaffToken(eventId, staffId)` + canonical hook + UI hook-up in host event-staff page; Mobile: move path into `ENDPOINTS` |
| #7 `GET /events/:id/staff-tokens` | Web caller | ❌ none | hardcoded path in `eventsService2.js:886` | Endpoint exists | Web: add path + hook + UI; Mobile: move path into `ENDPOINTS` |

---

## 6. Suspected Bugs Worth Verifying

(Things that look broken but the agent cannot confirm without running the app — flag them so the user can sanity-check.)

1. **`useVerifyStaffAccess` (web canonical hook) is unreachable.** It makes the call without `params`, and the backend requires `phone+eventId` or `token`. Either no caller exists (which is what the grep shows) or any future caller of this hook will see 400 forever. Recommend deleting once §7.B confirms the migration path.
2. **`overrideDeclined` body field on `manual-check-in` is undefined behavior.** The controller forwards it (`staff.controller.js:83`) and the service signature accepts an `options` object (`staff.service.js:196` — `manualCheckIn(eventId, guestId, staffUser)` — actually it **doesn't** accept the third options arg; the controller passes a 4th arg the service ignores). Verify whether `overrideDeclined` was ever wired. If not, either implement (and gate behind `requirePageAccess`) or remove from the route + Joi + frontend hook stub.
3. **`getEventStats` (#5) may be effectively dead.** The guest-list endpoint already returns the same `stats` object alongside the list. Verify whether any client (web or mobile) polls `/stats` independently — if not, delete the route + service method to reduce surface area.
4. **Notification deep-link is locale-blind.** `staff.service.js:587` builds `${frontendUrl}/ar/host/events/${eventId}` — the `/ar/` is hardcoded. Hosts whose `preferredLanguage` is `en` get an Arabic page on click. Confirm the host model has a language preference and use it; otherwise leave this for a separate notifications-module audit.
5. **Phone+eventId verification is rate-limited per-IP only.** `apiLimiter` is keyed by IP (verify in `shared/middleware/rateLimiter.js`). Anyone who knows an event ID and a staff member's phone format can session-hijack from a single IP at the limiter rate. Consider a per-phone bucket too. Security review needed.
6. **Web staff session cookie is JS-writable.** `services/staff.js:23` writes `Cookies.set("staffToken", token)` with `sameSite: "Lax"` and no `httpOnly`. Susceptible to XSS exfiltration. The whole staff portal lives at `/[lang]/staff` — confirm there's no user-generated HTML rendering on those pages, but plan to switch to a backend-issued `Set-Cookie: HttpOnly` for the staff token.
7. **Mobile staff JWT is in AsyncStorage.** Should be `expo-secure-store` per C4. Confirm the constraint with the team.
8. **`_performIdempotentCheckIn` audit log writes `actor: null` for scanner check-ins.** When the staff user is a session payload (no `_id`), the audit log entry has no actor — only `metadata.performedByStaff.{name,phone}`. This is correct under the current audit schema, but verify that downstream audit consumers (admin "who checked this guest in?" UI) read `metadata.performedByStaff` as a fallback to `actor`.
9. **`useStaffMutation` invalidates the wrong key.** `onSuccess` invalidates `["staff", "events", eventId]` — but the active `useStaffGuests` hook keys on `["staff", "guests", eventId]`. So if anyone migrates the page to use `useStaffMutation`, invalidation will silently miss the active guest list cache. Worth fixing as part of the dedupe in §7.B.

---

## 7. Implementation Plan (Ordered)

Apply changes in this order. Each item ends with a checkbox the agent will tick during Phase 2.

### 7.A Backend
- [ ] **A.1** Add `staff.validation.js` with **Zod** schemas: `verifyStaffAccessQuery` (`token` XOR `phone+eventId`), `checkInBody` (`qrCode` XOR `guestId` XOR `phone`), `getEventGuestsQuery` (`search`, `status`, `page`, `limit`); wire each via `validateZod(schema, source)` middleware (`shared/middleware/validation.js:401`) in `staff.routes.js`. **No `manualCheckInBody` — endpoint is being deleted in A.15.**
- [ ] **A.2** Move `checkInGuest` body-required validation from controller to Zod (`staff.controller.js:55-74` → schema with `.refine` enforcing exactly one of `qrCode|guestId|phone`).
- [ ] **A.3** Replace inline `require()` for `AppError` (`staff.service.js:39`), `ValidationError` (`staff.controller.js:69`), `logAudit` (`staff.service.js:499`) with the existing top-level imports.
- [ ] **A.4** Escape `search` regex input in `staff.service.js:134` (`String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')`).
- [ ] **A.5** Switch `getEventGuests` controller to `sendSuccess(res, { guests, stats, pagination })`. Wire shape stays `{ success, status, data: { guests, stats, pagination } }` — identical to the current hand-rolled envelope minus the `results` field, so no frontend remap. **Do NOT use `sendPaginated`** — its signature is `(res, data, pagination, message)` and cannot carry `stats`.
- [ ] **A.5b** **(New, replaces deleted /stats)** Inside `getEventGuests`, augment the returned `stats` with `lastCheckIn` (the same `Guest.findOne({event, "checkIn.checkedInAt": {$exists: true}}).sort({"checkIn.checkedInAt":-1})` that today lives in `getEventStats`). This preserves the only field `/stats` returned that `/guests` did not.
- [ ] **A.6** Replace role-string literals (`'admin'`, `'super_admin'`, `'whitelabel_admin'`) with `ROLES.*` from `shared/constants/roles.js` in `staff.service.js:317, 380-385`.
- [ ] **A.7** Replace `console.error` / `console.warn` (`staff.service.js:495, 516`) with the shared logger (or drop and let the global error handler / audit own it).
- [ ] **A.8** Add `apiLimiter` to `POST /staff/events/:eventId/check-in` in `staff.routes.js`. (No manual-check-in route after A.15.)
- [ ] **A.9** Extract a private `_assertStaffTokensRBAC(event, actor)` helper from `revokeStaffToken` and `listStaffTokens` (`staff.service.js:309-348` and `:372-389`).
- [ ] **A.10** Add full `@swagger` JSDoc to `POST /events/:eventId/staff/:staffId/revoke` (`events.routes.js:838`); enumerate response schema (`StaffRevokeResponse` with `revoked, affected, wasAlreadyRevoked`).
- [ ] **A.11** Add `StaffVerifyResponse`, `StaffGuestListResponse` (now includes `lastCheckIn` in `stats`), `StaffCheckInResponse`, `StaffTokensListResponse`, `StaffRevokeResponse` schemas to `config/swagger.js` `components.schemas`; reference them from each endpoint's JSDoc. **No `StaffStatsResponse` — endpoint deleted.**
- [ ] **A.12** Document the 410 GONE branch on `GET /staff/verify` JSDoc (response body: `{ reason, message, expiresAt?, revokedAt? }`).
- [ ] **A.13** Comment hygiene pass per §2.7 (12 markers / blocks). Keep the underlying *why* paragraphs that are load-bearing (CAS rationale, RBAC mirroring); strip the FLOW-/Phase-/H-/M-/D- tags.
- [ ] **A.14** Add a one-line note at the top of `staff.controller.js` and `staff.routes.js` noting that endpoints #6 and #7 are mounted on the events router.
- [ ] **A.15** **DELETE `manual-check-in` end-to-end:** route registration in `staff.routes.js`, `manualCheckIn` controller export, `manualCheckIn` service method, Swagger block, `API_PATHS.staff.manualCheckIn` (web) and `ENDPOINTS.STAFF.MANUAL_CHECK_IN` (mobile, if present). See 7.B.7 / 7.C.4 for matching frontend deletions.
- [ ] **A.16** **DELETE `GET /staff/events/:eventId/stats`** after A.5b lands: route, `getEventStats` controller, `getEventStats` service method, Swagger block, `API_PATHS.staff.getEventStats` (web), `ENDPOINTS.STAFF.EVENT_STATS` (mobile if present, plus the dead `services/staffService.js:203 getEventStats` and web `services/staff.js:183 getStats` + canonical `useStaffEventStats`).
- [ ] **A.17** **(New)** Locale-blind notification fix in `staff.service.js:576-590`: change `Event.findById(eventId).select('host eventDetails')` to `.populate('host', 'preferredLanguage')`, then `${event.host?.preferredLanguage || 'ar'}` into `actionUrl`.

### 7.B Web
- [ ] **B.1** Resolve the parallel data layer: keep `app/[lang]/staff/hooks/useStaffAuth.js` (URL-param routing the canonical hook lacks); migrate everything else to the canonical `hooks/reactQueryHooks/useStaff.js`. Delete the broken `useVerifyStaffAccess` and the unused `app/[lang]/staff/hooks/useStaffGuests.js` once the canonical hook accepts filter params (B.2).
- [ ] **B.2** Fix `useStaffEventGuests` (`hooks/reactQueryHooks/useStaff.js:33-45`) to accept and forward `{ search, status, page, limit }` and include them in the queryKey.
- [ ] **B.3** Fix `useStaffMutation` invalidation key to match the active guest list key (use `["staff", "guests", eventId]`, not `["staff", "events", eventId]`). See §6.9.
- [ ] **B.4** Migrate `app/[lang]/staff/page.js` to call `useStaffMutation("checkInGuest")` instead of `staffService.checkInById/QR` directly.
- [ ] **B.5** Remove `console.error` from `hooks/reactQueryHooks/useStaff.js:115`; route errors through the component-level `handleError` already in place.
- [ ] **B.6** Surface 410 GONE reason in `useStaffAuth.js`: read `error?.response?.data?.reason` and map `staff_revoked` / `staff_expired` to distinct `t("errors.staffRevoked"|"staffExpired")` strings (locale additions in §8).
- [ ] **B.7** **(Locked: DELETE)** Remove `useStaffMutation("manualCheckIn")` action branch and `API_PATHS.staff.manualCheckIn`. Pairs with A.15.
- [ ] **B.8** Add `API_PATHS.events.listStaffTokens(eventId)` and `API_PATHS.events.revokeStaffAccess(eventId, staffId)` (mirror mobile's `ENDPOINTS.EVENTS.LIST_STAFF_TOKENS` / `REVOKE_STAFF` shape at `halla-mobile/config/api.js:117,119`); add canonical hooks `useEventStaffTokens` and `useRevokeStaffAccess`; wire into `labbe/app/[lang]/host/events/[id]/_components/EventHeader.jsx` (already renders `staffList`). Mirror the mobile UI from `halla-mobile/components/events/SingleEventStats/StaffTab.js` — active/revoked/expired/lastUsedAt badges + "Revoke" button gated on `usePageAccess(...).canDelete`. Idempotency-Key header per click (mirror mobile pattern at `eventsService.staff.js:120-126`).
- [ ] **B.9** Wrap the staff page in `<ErrorBoundary>` per B19.
- [ ] **B.10** **(Locked: KEEP)** Staff session cookie stays JS-writable. Consistent with the main app token (also `Cookies.get("token")`). Re-evaluate in a separate cookie-hardening pass.
- [ ] **B.11** **(Locked: ADD)** Expose search + status filters on `app/[lang]/staff/page.js` using URL state (B14). Mirror the mobile filter shape so both platforms send the same query params.
- [ ] **B.12** **(Locked: DELETE)** Remove `useStaffEventStats` from `hooks/reactQueryHooks/useStaff.js` and the dead `services/staff.js:183 getStats`. Pairs with A.16.
- [ ] **B.13** Comment hygiene pass: 1 marker (`useStaff.js:115` — the `console.error` will be deleted in B.5; no FLOW-/PHASE- markers left after).

### 7.C Mobile
- [ ] ~~**C.1**~~ **(Locked: SKIP — already done)** `ENDPOINTS.EVENTS.LIST_STAFF_TOKENS` and `REVOKE_STAFF` already exist at `halla-mobile/config/api.js:117,119`; `eventsService.staff.js` uses them. Plan §4.3 was wrong about hardcoded paths.
- [ ] **C.2** Add `hooks/queries/useStaff.js` (`useStaffEventGuests`, `useEventStaffTokens`) and `hooks/mutations/useStaffMutations.js` (`useVerifyStaffAccess`, `useCheckInGuest`, `useRevokeStaffAccess`). **No `useStaffEventStats` / `useManualCheckIn`** — endpoints deleted in A.15/A.16. Use `enabled: !!staffToken` (or user token where appropriate). `staleTime` 30 s for live-counter queries, 3 min for the rest.
- [ ] **C.3** Migrate `LoginView.js` to use `useVerifyStaffAccess`; migrate `PortalView.js` to use `useStaffEventGuests` + `useCheckInGuest`. Remove imperative `setGuests` / `setStats` updates — let React Query invalidations drive the refresh.
- [ ] **C.3b** **(Locked: ADD)** Add status filter UI to `PortalView.js` (it already has search). Mirror the web filter shape so both send the same query params.
- [ ] **C.3c** **(Locked: REFACTOR)** Migrate `SingleEventStats/StaffTab.js` from imperative `useStaffTokens` (custom `useState`+`useCallback`) to `useEventStaffTokens` from C.2. Migrate `useEventStatsActions.js:247` from imperative `revokeStaffAccess` call to `useRevokeStaffAccess` mutation; drop the `console.warn` at `StaffTab.js:31`.
- [ ] ~~**C.4**~~ **(Locked: DELETE)** Remove `ENDPOINTS.STAFF.MANUAL_CHECK_IN` if present (and any service stub). Pairs with A.15.
- [ ] **C.5** Remove `console.error` calls in `services/staffService.js:29, 37`.
- [ ] **C.6** Drop the `// Phase 4 W0-AUTH` marker (`services/staffService.js:49`); keep the rationale prose about staff token isolation.
- [ ] **C.7** **(Locked: MOVE)** Replace the 3 `AsyncStorage.*Item` calls in `services/staffService.js:17-39` with `secureStorage` from `services/secureStorage.js`. No backend coordination required (storage strategy is mobile-only).
- [ ] **C.8** Surface 410 GONE reason in mobile login error UI same as B.6 (translation keys to be added in §8).
- [ ] **C.9** **(Locked: DELETE)** Remove `getEventStats` from `services/staffService.js:203` and `ENDPOINTS.STAFF.EVENT_STATS` if it's unused elsewhere. Pairs with A.16.

### 7.D Cross-platform alignment (do AFTER A/B/C)
- [ ] ~~**D.1**~~ **(Locked: NO-OP)** `sendSuccess(res, { guests, stats, pagination })` produces the same wire shape both clients already read. No remap needed.
- [ ] **D.2** Verify both web and mobile render distinct UX for 410 GONE (revoked vs expired vs invalid).
- [ ] **D.3** Verify both web and mobile invalidate `["staff","guests",eventId]` after every check-in. (No stats key — endpoint deleted.)
- [ ] **D.4** Verify both web and mobile send the **same** filter query params (`search`, `status`, `page`, `limit`) on `GET /staff/events/:eventId/guests` after B.11 + C.3b land.
- [ ] **D.5** Verify the host single-event page on both web (`labbe/app/[lang]/host/events/[id]`) and mobile (`SingleEventStats/StaffTab`) shows: token state badges, lastUsedAt, useCount, Revoke button gated on canDelete. Same data shape, same affordances.
- [ ] **D.6** Add a manual smoke checklist: run a fresh staff session on both web and mobile against a live backend, scan a QR, scan it again (alreadyCheckedIn branch), revoke the staff member, attempt re-verify (expect 410), check that `stats.lastCheckIn` updates in the guests response after a check-in.

---

## 8. Locale-key additions required

(Listed for the user — agent does NOT modify locale JSON without explicit approval.)

- `staff.errors.staffRevoked` (en: "Your staff access was revoked.", ar: "تم إلغاء صلاحياتك كموظف.")
- `staff.errors.staffExpired` (en: "Your staff access link has expired.", ar: "انتهت صلاحية رابط الوصول الخاص بك.")
- `staff.errors.checkInRateLimited` (en: "Too many check-in attempts. Please wait a moment.", ar: "محاولات كثيرة لتسجيل الحضور، الرجاء الانتظار قليلاً.")
- `staff.checkIn.alreadyAt` (en: "Already checked in at {{time}}", ar: "تم تسجيل الحضور في {{time}}") — for surfacing `checkedInAt` after `alreadyCheckedIn: true`.
- `staff.filters.searchPlaceholder`, `staff.filters.allStatuses`, `staff.filters.checkedIn`, `staff.filters.confirmed`, `staff.filters.declined`, `staff.filters.invited` — only if 7.B.11 is taken on.

---

## 9. Rollback plan

For each implementation item, the rollback is `git revert` of the corresponding commit. Specifically:

- 7.A.5 (controller envelope change) and 7.D.1 (frontend remap) must be reverted **together** — the wire shape changes. If the deploy sequence is backend-first, frontend will silently break for one deploy cycle. Coordinate or feature-flag.
- 7.A.15 (manual-check-in deletion) is destructive of route + Swagger together. If the user later wants the feature, restore from history.
- 7.A.16 (`/stats` deletion) is destructive of route + service method + Swagger together. `lastCheckIn` is preserved on the `/guests` response via A.5b, so rolling back A.16 alone is safe; rolling back A.5b without A.16 leaves the field duplicated, which is harmless.
- 7.B.10 / 7.C.7 (cookie / SecureStore migration) require coordinated backend cookie issuance. Roll back together.
- All comment-hygiene passes (7.A.13, 7.B.12, 7.C.6) are pure deletions of comments. Trivial revert.

---

## 10. Acceptance checklist (run after Phase 2)

- [ ] No file in module exceeds the cap (already true; verify after refactor).
- [ ] Every staff endpoint has current Swagger (request + success + 401 + 403 + 404 + 410 where applicable).
- [ ] No duplicate or dead endpoints remain — `manual-check-in` and `/stats` are gone (A.15, A.16); `lastCheckIn` lives on the `/guests` response.
- [ ] Web + Mobile call the same paths with the same query/body shapes for every endpoint, including `search` + `status` filters (D.4).
- [ ] Web + Mobile single-event page show identical staff-token UI (D.5).
- [ ] No fallback chains in data mapping in this module's surface area.
- [ ] No `// FLOW-…` / `// PHASE-…` / `// H-…` / `// M-…` / `// W0-…` / `// D5/D6` comments remain in the staff surface area.
- [ ] No `console.log` / `console.error` / `console.warn` in committed staff code.
- [ ] **Zod** schemas reject malformed bodies / queries on every staff route (verified by hand-curl test). No Joi imports in `staff.validation.js`.
- [ ] Regex search input is escaped (`?search=(a+)+$` returns empty result, does not stall the event loop).
- [ ] Role checks use `ROLES.*` constants throughout staff service.
- [ ] Web staff page wraps in `<ErrorBoundary>` and distinguishes 410 reason.
- [ ] Mobile staff screens use React Query hooks; no imperative `setGuests`/`setStats` paths remain.
- [ ] `npm run lint` clean on each layer (or no new warnings introduced).
- [ ] Visual smoke test: staff portal on web and mobile renders identically before/after the refactor (CSS Modules / StyleSheet untouched).

---

## Implementation Log (Phase 2)

_Empty until the user gives green light. Each item below will be appended as Phase 2 progresses, in the form_:

```
- [x] **A.1** DONE — added labbe-backend-/src/modules/staff/staff.validation.js (4 schemas) and wired in staff.routes.js
```
