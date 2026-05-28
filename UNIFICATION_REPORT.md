# Halaa — Web + Mobile Unification: Inventory & Plan

**Date:** 2026-05-26 (revised after code-verification pass)
**Scope:** `halla-mobile/{services,stores,utils,hooks}` and `labbe/{config,hooks,providers,services,staticData,stores,utils}`
**Goal:** Single coherent architecture across web (Next.js) and mobile (React Native), production-ready, no duplication, one canonical API contract.

> **Revision note (2026-05-26, evening pass):** Section 1.5 was rewritten end-to-end after a per-file verification pass. Three of the four "critical divergences" in the previous draft were **refuted by the code** (mobile already routes host vs admin event creation correctly; web/mobile/backend all use `PUT` for staff update; mobile already surfaces test-message and retry-launch via `TestMessageModal.js` + `EventFailureBanner.js`). Only the mobile reset-password screen gap survives. Section 1.3, §2.3, Phase 4b and the effort table were recalibrated accordingly. See Appendix B for the verification log.

---

## Session Progress Log

### 2026-05-26, follow-up session (Opus 4.7) — Phase 4 mobile events consolidation

**Shipped, build-validated (`expo export --platform web` exit 0, 3287 modules bundled):**

- **New consolidated `halla-mobile/services/eventsService.js`** — single file replacing the 8 shards. `authenticatedFetch` is inlined (module-private); every per-domain function is exported by name AND grouped into `crud`/`guests`/`staff`/`settings`/`exports` sub-objects on the default export, so both `import { foo } from "../services/eventsService"` and `import service from "../services/eventsService"` (`service.crud.foo` / `service.foo`) resolve.
- **`halla-mobile/services/eventGuestsService.js`** — rename of `guestsService.js` via `git mv`. Per-guest CRUD stays separate because the backend mount is on the `/guests` module (`/guests/events/:eventId/...`), not events.
- **`halla-mobile/hooks/events/useEventForm.js`** — pure-helper module (NOT a hook) holding the validation, list-management, CSV-import, step-validation, payload-transform, and default-form-values helpers extracted from `EventsService.js`. File name kept as `useEventForm.js` for parity with web's hook file (web's file is a real hook with different concerns; mobile-local helpers stay mobile-local — verified web's file does not contain these names).
- **`halla-mobile/hooks/events/mutations/useEventMutation.js`** — single-file factory mirroring web's pattern but with the config-map collapsed inline (web has 4 sub-hooks + façade; mobile's smaller surface fits one file). Action keys: `createEvent`, `updateEventDetails`, `deleteEvent`, `bulkDeleteEvents`, `updateEventStep2`, `updateGuestList` (bulk), `updateStaffList`/`addStaff`/`updateStaff`/`deleteStaff`/`notifyStaff`, `updateInvitationSettings`/`updateLaunchSettings`/`updateVisualTemplate`/`updateTaqnyatTemplate`/`updateMessagingContent`/`retryLaunch`. Convenience hooks (`useCreateEvent`, `useNotifyStaff`, `useAddEventStaff`, etc.) wrap the factory with literal actions so the action arg stays stable.
- **18 importers re-pointed:**
  - Service consumers (form helpers, queries, EventList, useEventLoadAndGate, mutation hooks): all moved off `eventsService2`/`EventsService`/`guestsService` to the new files.
  - `hooks/index.js` barrel: `./mutations/useEventMutations` → `./events/mutations/useEventMutation`.
  - Messaging-hook consumers (`TestMessageModal`, `ScheduleSendingModal`, `SendInvitationModal`, `EventDetailsScreen`) re-pointed directly at `useMessagingMutations.js` — the prior re-export through `useEventMutations` is gone. `useMessagingMutations.js` itself is NOT in the deletion list (per plan §4) and stays separate.
  - `EventDetailsScreen.js` staff CRUD consumer re-pointed from `useEventStaffCrudMutations` to the factory's convenience hooks. Verified call-site arg shapes (`{ eventId, data }`, `{ eventId, staffId, data }`, `{ eventId, staffId }`) match the factory's `mutationFn` signatures.
- **13 files deleted** (all on the Phase 4 ledger in §A.2):
  - `services/EventsService.js`, `eventsService.{crud,http,guests,settings,staff,exports}.js`, `eventsService2.js`.
  - `hooks/mutations/useEvent{Crud,Guest,Mutations,Settings,Staff,StaffCrud}Mutations.js`.
- Grep verified: zero remaining imports of any deleted file across the mobile tree.

**Notes / deliberate divergences:**
- Mobile factory uses one file + config map vs. web's four sub-hooks; the plan §4.4 allows either ("config map" called out explicitly). Easier to maintain at mobile's smaller surface size.
- `useStaffMutations.useRevokeStaffAccess` and per-guest hooks in `useGuestMutations` stay where they are (separate concerns: StaffAccessToken lifecycle and the `/guests` module respectively).
- Vestigial `_token` args on every service function preserved to minimise call-site churn; `apiFetch` ignores them and reads the in-memory token from the auth store.

**Pre-existing bug not fixed (out of scope):** `useEventLoadAndGate.js:156-158` reads `res?.data` from `getEventById`, which already unwraps `data?.data` and returns the event object directly. Likely never noticed because the surrounding code re-extracts via `eventData.eventDetails ?? eventData`. Leave for a focused session.

**Remaining ledger after this session:**
- Phase 5 — hook layout standardization (both apps)
- Phase 6 — auth store alignment
- Phase 8 — remaining items (lint rules, helper extractions, `userAccountService`, `getStaticAssetBaseUrl`, schema-shim removals)
- Phase 9 — final verification + ARCHITECTURE.md

### 2026-05-26, late-evening session (Opus 4.7) — Phase 7+8 partial completion

**Verified-on-disk before starting (so the picture matches the file system, not memory):**
Phase 0/0a/0b/0c done; Phase 1 partial (auth/events/tickets in shared, 5 domains still in app dirs); Phase 2 done; Phase 3 done; Phase 4b done (`halla-mobile/screens/auth/ResetPasswordScreen.js` exists); Phases 4, 5, 6, 7, 8 outstanding.

**Shipped this session, build-validated (`next build` exit 0 after):**

- **Phase 8 safe deletes (zero-importer verified by grep):**
  - `labbe/staticData/events/data.js` — deleted; `staticData/` folder removed.
  - `halla-mobile/utils/errorHandler.js` — deleted.
  - `labbe/utils/schemas/phoneValidation.js` — deleted.
- **Phase 8 documented console.log cleanup:**
  - `labbe/utils/index.js:56,77` — debug `console.log("formValues", ...)` and `console.log("result", ...)` removed inside `validateStep`.
  - `halla-mobile/services/authService.js:265,315` — replaced raw `console.log` with `dlog` (PII leak in release builds; previously logged phone number).
- **Phase 7 mobile — `halla-mobile/stores/adminStore.js` deleted.**
  - Grep returned zero importers across the mobile codebase before delete. The store was wholly orphaned — RQ already served all admin tables via `hooks/queries/useAdmin*`. No consumer rewrites required.
- **Phase 7 web — `labbe/stores/notificationStore.js` deleted, 2 consumers rewritten:**
  - `labbe/ui/layout/notifications/NotificationBell.js` — now reads from `useUnreadNotificationCount()`; the hook already had a 30 s `refetchInterval` so the manual `setInterval(30s)` polling is gone with no behavior change.
  - `labbe/ui/layout/notifications/NotificationDropdown.js` — rewired to use `useInfiniteQuery` against `API_PATHS.notifications.getNotifications` for paginated load-more (preserves the original "append next page" UX) plus `useNotificationMutation` for markAsRead / markAllAsRead / delete / clearAll.
  - **Note on follow-up:** `useInfiniteQuery` was used inline in the dropdown component because the existing `useNotifications` hook in `hooks/reactQueryHooks/useNotifications.js` is a `useQuery` returning a single page. A future tidy-up could promote `useNotificationsInfinite` into that hook file and have the dropdown import it. Left inline to minimize risk in this session.

**Deliberately deferred (and why):**

- **Phase 6 — auth store alignment.** Mobile already uses the canonical status machine (`checking → loading → authenticated|unauthenticated`); web uses `isAuthenticated`+`isLoading` booleans. Aligning the two requires touching ~30 consumer files (found via grep on `isAuthenticated|isLoading`). Doing it partially risks an inconsistent state machine. Needs a dedicated session that can build-validate after every batch.
- **Phase 4 — mobile events service consolidation.** 8 service shards + 6 mutation hook files; touches the entire mobile event-creation flow. Plan estimates 2-3 focused days. Not safe to rush.
- **Phase 5 — hook layout standardization across ~20 domains.** Plan itself calls this "Risk: Highest." Cache-key migration alone is a session.
- **Phase 1 leftovers — 5 schema domains.** ~2000 lines of schema code across 12+ files plus consumer re-pointing across ~40 files. Manageable but a session of its own.

**Build evidence:** `labbe` → `next build` exit 0 after Phase 7 web rewrite. Mobile → no runtime-affecting changes this session (only zero-importer deletes + log-level swap); `expo export` ran as a final sanity check.

**Remaining ledger after this session:**
- Phase 1 leftovers — 5 schema domains (plans, vendor, settings, admin, post-event)
- Phase 4 — mobile events consolidation
- Phase 5 — hook layout standardization (both apps)
- Phase 6 — auth store alignment
- Phase 7 leftover — none (both stores resolved)
- Phase 8 — remaining items (lint rules, helper extractions, userAccountService, getStaticAssetBaseUrl)
- Phase 9 — final verification + ARCHITECTURE.md

### 2026-05-26, late-night follow-up — Phase 1 leftovers completed

**Shipped, build-validated (`next build` exit 0, `expo export` exit 0):**

- **5 new shared schema files** created in `D:\halla\shared\src\schemas\`:
  - `plans.js` — `createPlanSchema`, `editPlanSchema`, `PLAN_TYPES`, enums (planType/planFamily/billingType/availability/currency). Admin-only, English messages preserved.
  - `post-event.js` — guest portal schemas (PostType, PostSchema, CommentSchema, TokenValidationResponseSchema, PostEventContentResponseSchema, LikeToggleResponseSchema, AddCommentSchema, etc.). `File`-typed fields softened to `z.any()` so mobile RN file objects also pass (web's File instance check was platform-specific).
  - `admin.js` — addHost/addModerator/editModerator, vendorRating, ticket/template/notification/taqnyat/discount popups. Hardcoded Arabic messages preserved verbatim (admin surface; not user-facing).
  - `settings.js` — union of `settingsSchemas.js` + `accountSettingsSchema.js` + `notificationPreferencesSchemas.js` validation portions + mobile `settingsSchema.js`. Both `accountSettingsSchema` variants kept (factory `(t) => …` for web, opaque-key version for mobile — exported as `accountSettingsSchema` and `mobileAccountSettingsSchema` respectively). Role-aware host/vendor/admin/whitelabel notification preferences schemas + defaults + `getNotificationSchemaForRole` / `getNotificationDefaultsForRole` helpers.
  - `vendor.js` — Zod portions split out of `vendorSettings.js` (web's section-object pattern keeps its `fields` metadata locally; only `zodSchema` payloads moved). Mobile vendorSchemas (English-message variants) included with `mobile*` prefix; original names preserved via the shim's `mobileX as X` aliases.
- **`shared/src/schemas/index.js` barrel** updated with the 5 new namespaces.
- **Compat shims** (the pattern established by the prior agent) installed at every former source location so consumer imports keep working unchanged:
  - `labbe/utils/schemas/planSchema.js` — re-exports from `@halla/shared/schemas/plans`.
  - `labbe/utils/schemas/postEventSchemas.js` — re-exports from `@halla/shared/schemas/post-event` (named + default).
  - `labbe/utils/schemas/adminPopupSchemas.js` — re-exports the 15 popup schemas from `@halla/shared/schemas/admin`.
  - `labbe/utils/schemas/settingsSchemas.js` — re-exports from `@halla/shared/schemas/settings`. `hostEmailNotificationsSchema` aliased from the legacy variant (`hostEmailNotificationsSchemaLegacy` in shared) since two files exported the same name with different fields; the legacy 5-field shape stays here, the role-aware 5-field shape stays under the canonical name in `notificationPreferencesSchemas.js`.
  - `labbe/utils/schemas/accountSettingsSchema.js` — re-exports the factory variant.
  - `labbe/utils/schemas/notificationPreferencesSchemas.js` — re-exports all schemas/defaults/getters from shared; keeps `getNotificationOptionsForRole` (UI option config with hardcoded Arabic labels + i18n keys) inline since it's a web-side rendering concern, not validation.
  - `labbe/utils/schemas/vendorSettings.js` — keeps the section-object wrappers (`personalInfoSchema = { sectionKey, titleKey, zodSchema, fields, ... }`) and the `validateField` / `validateForm` helpers that `DynamicForm` consumes; swaps each `zodSchema` body for an import from `@halla/shared/schemas/vendor`. Form metadata stays web-side; validation moved.
  - `halla-mobile/utils/schemas/vendorSchemas.js` — re-exports mobile variants with `mobileX as X` aliases.
  - `halla-mobile/utils/schemas/settingsSchema.js` — re-exports mobile variants with `mobileX as X` aliases.
- **Orphan deletions (verified zero importers by grep):**
  - `labbe/utils/schemas/addHostSchema.js` — orphan (its consumers use `adminPopupSchemas.js#addHostSchema`, a different shape).
  - `labbe/utils/schemas/addModeratorSchema.js` — same story.

**Build evidence:** `labbe` → `next build` exit 0; mobile → `expo export --platform web` exit 0. Both with the new shared schemas resolved through the workspace symlink.

**Files NOT migrated this session (out of scope — not in the user-named 5 domains):**
- `labbe/utils/schemas/createEventSchema.js`, `updateEventSchema.js`, `eventAddintionSchemas.js`, `staffSchemas.js`, `ticketSchema.js`, `ticketRatingSchema.js`, `authSchema.js`, `addServiceSchema.js` — these belong to domains (events, tickets, auth, vendor-service) that are either already in shared (auth/events/tickets) and just need re-pointing in a future pass, or are UI-coupled (addServiceSchema has hardcoded Arabic SERVICE_TYPES list).
- Mobile `createEventSchema.js`, `updateEventSchema.js`, `ticketSchema.js`, `authSchemas.js`, `discountSchema.js`, `vendorServiceSchema.js` — same story.

**Remaining ledger after this follow-up:**
- Phase 1 — **complete for the 5 user-named domains**; non-named-domain stragglers above remain as a future tidy-up.
- Phase 4 — mobile events consolidation
- Phase 5 — hook layout standardization (both apps)
- Phase 6 — auth store alignment
- Phase 8 — physical removal of the compat shims (this session and the prior one both intentionally use shims to minimize consumer churn); other Phase 8 items (lint rules, helper extractions, userAccountService, getStaticAssetBaseUrl).
- Phase 9 — final verification + ARCHITECTURE.md

---

## 0. TL;DR

Both apps consume the same backend (`/api/v2`, ~460 endpoints, Zod-validated). They have **diverged in three independent ways**, none of which are intrinsic to the platform:

1. **Two transport stacks** — web ran an axios overhaul (`services/new-backend/`) but never deleted the legacy fetch client (`services/apiClient.js`). Three services (`notification.js`, `staff.js`, `adminDashboard.js`) still point at the legacy one. Mobile has its own fetch-based `apiClient.js` that re-implements the same refresh-coalescing logic. → **One transport interface, two thin platform adapters.**
2. **No shared API contract** — web has a high-quality `API_PATHS` registry (`services/new-backend/api.config.js`, ~460 endpoints, single source of truth). Mobile hard-codes endpoint strings through a per-app `ENDPOINTS` map in `config/api.js` plus inline strings inside each service file. → **Promote `API_PATHS` to a shared package consumed by both.**
3. **Hooks/services file layout drifted in opposite directions** — web has *three* parallel hook trees (`hooks/events/`, `hooks/queries/ + hooks/mutations/`, `hooks/reactQueryHooks/`). Mobile has a clean `hooks/queries + hooks/mutations` split but bloats events into eight `eventsService.*.js` shards with a `eventsService2.js` façade plus six overlapping `useEvent*Mutations.js` hook files. → **Adopt one layout (per-domain folders) on both sides.**

Everything else (auth, Zustand stores, Zod schemas, error handling) is largely the same logic implemented twice. **Product behavior across the two apps is closer than expected** — after verification, only one real cross-platform UX gap remains (mobile lacks the reset-password completion screen). The unification is large but boring: it's **delete + relocate**, not new design or behavior repair.

---

## 1. Inventory Summary

### 1.1 Mobile (`halla-mobile/`)

| Folder | Files | Health |
|---|---|---|
| `services/` | 32 (incl. 8 `eventsService.*`) | Working, but events fragmented; no endpoint registry |
| `stores/` | 2 (`authStore`, `adminStore`) | `authStore` solid; `adminStore` duplicates RQ cache |
| `utils/` | 14 (+8 schemas, 2 constants) | Clean |
| `hooks/` | 47 (queries 25, mutations 20, utility 4) | Clean folder structure, but events split across 6 mutation hook files with overlapping responsibilities |

**Strengths:** Single fetch-based `apiClient.js` with coalesced 401→refresh→retry, in-memory access token + `expo-secure-store` refresh token. Structured `ApiError` with i18n key mapping. Zod everywhere.

**Smells:**
- `EventsService.js` + `eventsService.{crud,http,guests,settings,staff,exports}.js` + `eventsService2.js` (façade) — confusing naming, "v2" leftover. Per-guest CRUD lives in a *separate* `guestsService.js` despite being event-scoped.
- Six event-related mutation hook files (`useEventMutations.js`, `useEventCrudMutations.js`, `useEventGuestMutations.js`, `useEventSettingsMutations.js`, `useEventStaffMutations.js`, `useEventStaffCrudMutations.js`) with overlapping concerns — `useEventMutations.js` is already a façade re-exporting from the others.
- `adminStore.js` mirrors data that should live in React Query cache → two sources of truth for admin lists.
- No `API_PATHS` equivalent — endpoint strings duplicated inline in 20+ service files.
- Query keys are inline arrays, no factory → invalidation is fragile.
- 8 schema files vs web's 18 — mobile is missing schemas for admin add-host/add-moderator/add-service, notification preferences, post-event details, account-settings, plan, etc.

### 1.2 Web (`labbe/`)

| Folder | Files | Health |
|---|---|---|
| `config/` | 1 (`fonts.js`) | Fine |
| `providers/` | 3 (i18n SSR, react-i18next client, RQ) | Fine — SSR i18n race already fixed |
| `services/` | 12 incl. `new-backend/` (2) | **Two clients coexist; legacy still in use** |
| `services/new-backend/` | `apiClient.js` (axios + RQ helpers), `api.config.js` (API_PATHS registry, ~460 paths) | **Canonical** |
| `stores/` | 3 (`authStore`, `notificationStore`, `sidebarStore`) | `notificationStore` calls service directly, bypasses RQ |
| `utils/` | ~12 + **18 schema files** | Bloated schemas folder; some duplicates (`phoneValidation.js` repeats `authSchema.js` regex) |
| `hooks/` | ~50 across **three parallel trees** | Major fragmentation |
| `staticData/` | `events/data.js` (mock) | **Orphaned (verified: zero imports)** |

**Strengths:**
- `API_PATHS` registry is excellent — single source of truth for all endpoints.
- `new-backend/apiClient.js` (527 lines) is well-built: axios interceptors, logging, request-ID tracing, silent coalesced 401 refresh, `useApiQuery` / `useApiMutation` / `useUploadMutation` / `useExportMutation` / server-side prefetch helpers, B-1 hardened (HttpOnly only).
- `errorHandlingService.js` maps backend `otpErrorType`/`accountStatus`/`meta` to i18n keys cleanly.
- Schema coverage broader than mobile.

**Smells:**
- **Legacy `services/apiClient.js`** (381 lines, fetch-based) still consumed by `services/notification.js:6`, `services/staff.js:11`, `services/adminDashboard.js:7`. Its `getToken()` reads a JS-readable mirror cookie — the exact pattern B-1 hardening removed elsewhere.
- **`services/apiResponseHandler.js`** (327 lines) duplicates work axios + `errorHandlingService` already do.
- **Three hook trees** for the same operations:
  - `hooks/events/` — new canonical for events (queries + mutations factories).
  - `hooks/queries/ + hooks/mutations/` — old narrow scope; only templates + scheduled-reminders + taqnyat-templates.
  - `hooks/reactQueryHooks/` — comprehensive (~20 files) but `useEvents.js` is now a 7-line deprecated façade re-exporting `hooks/events/`.
- `notificationStore.js` calls `services/notification.js` directly with manual `setInterval` polling (line 248-250, 30s) → no React Query caching/dedup; doesn't compose with the rest of RQ.
- **Two parallel sources of truth for notifications.** A perfectly serviceable RQ hook tree exists at `labbe/hooks/reactQueryHooks/useNotifications.js` (`useNotifications`, `useUnreadNotificationCount` with 30 s `refetchInterval`, `useNotificationMutation`) — but the Zustand store bypasses it and re-implements polling/state. Pick the RQ side, retire the store's data layer.
- `staticData/events/data.js` — orphaned mock data, zero importers (`grep` returned no consumers).
- `utils/schemas/phoneValidation.js` duplicates regex already in `authSchema.js`.

### 1.3 Backend API surface (`labbe-backend-/src/modules/`)

- Base mount: `/api/v2`.
- ~460 endpoints across 22 modules.
- **Zod-only validation** for all new code (confirmed; matches the team's saved feedback rule). No Joi observed in route layer.
- Auth: Bearer token via `Authorization` header (mobile) or HttpOnly cookie (web). Refresh via cookie *or* body `refreshToken` field — dual transport for the two clients.
- **Response envelope is almost fully unified.** `shared/utils/responseHelper.js#sendSuccess` always emits **both** `success: true` AND `status: 'success'` on the same payload — so clients reading either field are correct as long as the helper is used. Counts (verification pass):
  - ~214 routes use `sendSuccess()` / `sendCreated()` / `sendPaginated()` (canonical).
  - ~17 controllers hand-roll a `{ success: true, ... }` payload (bypass the helper).
  - 1 controller emits only `{ status: 'success' }`.
  - **Implication for the plan:** rather than build envelope-normalization logic into both client adapters (the previous draft's plan), spend two backend hours migrating the ~18 outliers to the helper. The clients then trust *one* shape. See Phase 0c.
- Other inconsistencies that *cannot* be cheaply unified on the backend (clients still must handle these):
  - Single-resource envelopes vary: `{ data: { event } }`, `{ data: { user } }`, `{ data: object }`. Each route's "data shape" is intentional and bound to docs — clients normalize by reading the documented field per route, not by transformation.
  - Some POSTs return 200 with `requiresAction: true` (3DS payments) instead of 201 — caller must read body, not status.
  - Revoked/expired access tokens return **410 Gone** with a structured `reason` — both clients already handle, but the shared `ApiError` mapper must preserve the code.
  - Multipart endpoints expect specific fields pre-stringified as JSON (`eventDetails`, `guestList`, `staffList`) — undocumented per route. Capture this in shared docs.

### 1.4 Direct duplication map (web ↔ mobile)

| Concern | Mobile file | Web file | Verdict |
|---|---|---|---|
| API client core | `services/apiClient.js` | `services/new-backend/apiClient.js` (+ legacy `services/apiClient.js`) | Different transports (fetch vs axios) but identical responsibilities. Keep one *interface*, two thin adapters. |
| Endpoint registry | (none — `ENDPOINTS` map + hardcoded paths) | `services/new-backend/api.config.js` (`API_PATHS`) | Web's is canonical; lift to shared package. |
| Auth state | `stores/authStore.js` (Zustand) | `stores/authStore.js` (Zustand) | Same library, divergent shape. Unify field names + computed getters. |
| Error mapping | `services/authErrors.js` | `services/errorHandlingService.js` | Same job (backend code → i18n key). Merge. |
| Token storage | `services/secureStorage.js` | HttpOnly cookies + `js-cookie` | Platform-specific — keep separate. |
| Zod schemas | `utils/schemas/*` (8) | `utils/schemas/*` (18) | Promote union to shared package; both import same source. |
| RQ provider | (root `App.js`) | `providers/ReactQueryProvider.jsx` | Configure identically (staleTime 60s, no refetch-on-focus). |
| Event service | 8 `eventsService.*.js` + `EventsService.js` validation helpers | `hooks/events/*` + `services/...` (none) | Mobile to consolidate to one `eventsService.js`; web has already moved logic into hooks. |
| Event mutation hooks | 6 overlapping `useEvent*Mutations.js` files | `hooks/events/mutations/useEventMutation.js` factory | Mobile to collapse to one factory-driven file. |
| Admin data | `stores/adminStore.js` | `hooks/reactQueryHooks/useAdmin.js` | Web pattern is correct; drop mobile's adminStore in favor of RQ. |
| Notification feed | `services/notificationService.js` + hooks | `services/notification.js` + `stores/notificationStore.js` | Both should land on RQ hooks. Web's store-based polling is the outlier. |
| Date/locale utils | `utils/locale.js`, `utils/timeFormat.js`, `utils/DirectionUtils.js` | `utils/locale.js`, `utils/date/*`, `utils/DirectionUtils.js` | Same functions, slightly different names. Merge. |
| xlsx utils | `utils/xlsxUtils.js` | `utils/xlsxUtils.js` | Likely identical; merge or import from shared. |

### 1.5 Page-to-endpoint parity audit — RESULT: ~21/22 flows are byte-identical

A flow-by-flow trace from screen → hook → service → endpoint on both sides, **re-verified file-by-file in this revision**.

**Verified-or-carried-forward identical (21 flows):** host email login, host OTP login, host signup, vendor signup, whitelabel signup, **forgot-password request**, logout, **event creation (host route + admin-for-host route — both routes correctly used per role on both apps)**, event wizard steps 1-4, single event detail+stats, guest CRUD/rotate-QR/revoke, events list (host + admin), plans+checkout incl. 3DS poll, admin host list (incl. bulk), notifications (list/count/mark/markAll), post-event guest portal (validate/content/like/comments), support tickets (list/create/update/rate), **staff CRUD including update (all use `PUT /events/:eventId/staff/:staffId`)**, **test-message and retry-launch** (web via `useEventMutation` button; mobile via `TestMessageModal.js` and `EventFailureBanner.js`).

> **Honest scope note:** this revision *re-verified* the four flows the previous draft called out as divergent (events 1, 12, 16, 17 and forgot-password 6) plus the notification and staff-update paths. The remaining ~15 flows are **carried forward from the prior trace, not re-walked in this pass**. Treat that as "no contrary evidence found" rather than "byte-confirmed today." Appendix B lists exactly what was re-touched.

**Real divergence (1 flow):**

| # | Flow | Web does | Mobile does | Verdict |
|---|---|---|---|---|
| 1 | Forgot-password completion (reset via token) | Two-step request → reset wired through `/forget-password` route screens; `PATCH /auth/reset-password/:token` callable from UI | `forgotPassword()` is wired; `resetPasswordAPI()` exists in `halla-mobile/services/authService.js:466-476` but **no `ResetPasswordScreen` exists and no deep-link handler routes the email's reset link into the app** | **Real UX gap on mobile** — user can request reset, can't complete it in-app. |

**Refuted claims from the previous draft of this section (kept here so they don't reappear):**

- ❌ **"Mobile event creation routes everything through `/admin/events/create-for-host`."** *Not true.* `halla-mobile/screens/common/CreateEventScreen.js:30-46` checks `role === "host"` and returns `<CreateEventForm mode="host" />` (which uses `useCreateEvent` → `POST /events`). The `useCreateEventForHost` mutation on line 41 is only reached for non-host roles.
- ❌ **"Mobile uses PUT for staff update, web uses PATCH — backend wants PUT."** *Not true.* Backend (`labbe-backend-/src/modules/events/events.routes.js:725`), mobile (`halla-mobile/services/eventsService.staff.js:53`), AND web (`labbe/hooks/events/mutations/useEventStaffMutation.js:49`) all use `PUT`. Consistent.
- ❌ **"Mobile is missing test-message and retry-launch buttons."** *Not true.* `halla-mobile/components/home/TestMessageModal.js` (full modal) is invoked from `halla-mobile/screens/host/HomeScreen.js`. `halla-mobile/components/events/EventFailureBanner.js` provides retry, invoked from `halla-mobile/screens/common/EventDetailsScreen.js`. Both endpoints (`ENDPOINTS.EVENTS.TEST_MESSAGE`, `ENDPOINTS.EVENTS.RETRY_LAUNCH`) have wired hooks in `hooks/mutations/useMessagingMutations.js`.

**Implication for the plan:** the previous draft framed Phase 4b as "behavior parity fixes" with four items. After verification only one item remains, and the structural unification is therefore the bulk of remaining work. The TL;DR claim "mostly delete + relocate, not new design" is *more* true now.

### 1.6 Dead-code candidates

| Path | Status | Action |
|---|---|---|
| `labbe/staticData/events/data.js` | **Verified zero importers** | **Delete** |
| `labbe/services/apiResponseHandler.js` | Superseded by axios + errorHandlingService | **Delete after migration (Phase 3)** |
| `labbe/services/apiClient.js` (legacy) | Still consumed by notification/staff/adminDashboard | **Migrate consumers, then delete (Phase 3)** |
| `labbe/hooks/reactQueryHooks/useEvents.js` | Verified 7-line deprecated façade | **Update imports, then delete (Phase 5)** |
| `labbe/utils/schemas/phoneValidation.js` | Duplicates `authSchema.js` regex | **Delete; consolidate into shared `schemas/auth`** |
| `labbe/utils/cookieUtils.js` | Pre-HttpOnly legacy | **Audit; remove non-display uses (Phase 3)** |
| `halla-mobile/services/eventsService2.js` | Façade re-export with confusing "v2" name | **Drop after consolidation (Phase 4)** |
| `halla-mobile/services/EventsService.js` (capital E) | Validation/CSV helpers misclassified as service | **Move into `shared/utils/event-form.js` or `halla-mobile/hooks/events/useEventForm.js`** |
| `halla-mobile/hooks/mutations/useEventMutations.js` | Façade re-export, overlaps with other 5 files | **Collapse into a factory like web's `useEventMutation.js`** |
| `halla-mobile/stores/adminStore.js` | Duplicates RQ cache | **Delete; migrate consumers to `hooks/admin/queries/use*`** |
| `halla-mobile/services/adminDashboardService.js` lines 334–350 (`addons` export) | Self-marked "Legacy" | **Delete; consumers already use `addonsService`/`useAddons`** |
| `halla-mobile/services/notificationService.js` `_legacyToken` parameter | Kept for caller compat, but ignored everywhere | **Remove parameter once all callers audited** |
| `halla-mobile/services/marketplaceService.js:71` `.replace("/api/v2", "")` | Strips `/api/v2` from `API_BASE_URL` to produce CDN/asset URLs | **Keep — legitimate; but extract to `getStaticAssetBaseUrl()` helper for clarity** |

**Revised — NOT to delete:**
- `halla-mobile/services/guestsService.js` — endpoints are structurally under `/guests/events/:eventId/...` (not `/events/:id/guests/...`); the split mirrors the backend. Renaming to `eventGuestsService.js` is OK; full merge is not.

**Consolidation candidate kept from previous draft:**
- `halla-mobile/services/vendorService.js` and `halla-mobile/services/settingsService.js` both hit `PATCH /users/profile` and `PATCH /users/password` (verified: `vendorService.js:87,94,101` and `settingsService.js:18,27,35`). Extract a `userAccountService` that owns those endpoints; vendor-specific methods stay in `vendorService` and delegate. Same on web.

---

## 2. Target Architecture

### 2.1 Mental model

```
┌──────────────────────────────────────────────────────────────┐
│ @halla/shared  (in-repo npm workspace, plain JS)             │
│                                                              │
│  ├─ src/schemas/      Zod schemas — single source            │
│  ├─ src/api/                                                 │
│  │   ├─ paths.js      API_PATHS registry                     │
│  │   ├─ contracts.js  Endpoint → method/path/schema map      │
│  │   └─ transport.js  Transport interface (JSDoc-typed)      │
│  ├─ src/errors/       ApiError + code→i18n-key mapper        │
│  ├─ src/constants/    Roles, statuses, plan tiers, etc.      │
│  └─ src/utils/        Pure utils (locale, date, direction)   │
└──────────────────────────────────────────────────────────────┘
              ▲                                ▲
              │                                │
┌─────────────┴────────────┐  ┌────────────────┴────────────────┐
│ labbe/ (Next.js, JS)     │  │ halla-mobile/ (React Native, JS)│
│                          │  │                                 │
│ services/                │  │ services/                       │
│  ├─ http.js   axios      │  │  ├─ http.js   fetch             │
│  └─ api.js   typed call  │  │  └─ api.js   typed call         │
│                          │  │                                 │
│ stores/      Zustand     │  │ stores/      Zustand            │
│  authStore.js (cookies)  │  │  authStore.js (SecureStore)     │
│                          │  │                                 │
│ hooks/                   │  │ hooks/                          │
│  <domain>/queries/       │  │  <domain>/queries/              │
│  <domain>/mutations/     │  │  <domain>/mutations/            │
└──────────────────────────┘  └─────────────────────────────────┘
```

### 2.2 The shared package — what goes in, what stays out

**Goes in:**
- Zod schemas (union of `utils/schemas/` from both sides, deduplicated, web's stricter version wins where they differ).
- `API_PATHS` registry (lifted from `labbe/services/new-backend/api.config.js`).
- `ApiError` class + error-code-to-i18n-key mapper (merge of `halla-mobile/services/authErrors.js` and `labbe/services/errorHandlingService.js`).
- Shared types derived via `z.infer<typeof schema>` (events, users, guests, tickets, plans, addons, etc.).
- Pure utilities: `getLocalized`, `DirectionUtils`, date formatters, `xlsxUtils`, status enums.
- Role/permission constants (`USER_ROLES`, `ADMIN_PAGES`, `ACCESS_LEVELS`).

**Stays out (platform-specific):**
- HTTP transport (axios on web, fetch on mobile — they share an *interface*, not an implementation).
- Token storage (HttpOnly cookies on web, `expo-secure-store` on mobile).
- React Query *hooks* — they import from shared but live per-app because they wire to platform navigation, toasts, and auth stores.
- Zustand stores — they import shared *types* but state shape is per-app.
- Anything depending on `next/headers`, `next/navigation`, `react-native`, `expo-*`.

### 2.3 HTTP layer — one interface, two adapters

```ts
// @halla/shared/src/api/transport.js
export interface Transport {
  request<T>(opts: {
    method: 'GET'|'POST'|'PATCH'|'PUT'|'DELETE',
    path: string,                 // resolved from API_PATHS
    body?: unknown | FormData,
    query?: Record<string, string|number|boolean|undefined>,
    headers?: Record<string,string>,
    idempotencyKey?: string,
    timeoutMs?: number,
    signal?: AbortSignal,
  }): Promise<T>;
}
```

Each app implements `Transport` once:
- **Web:** axios + `withCredentials` + interceptor refresh (the existing `new-backend/apiClient.js` already does this; just narrow the surface).
- **Mobile:** fetch + Bearer header from `authStore` + secure-store refresh + replay-protection for FormData (the existing `services/apiClient.js` already does this; just narrow the surface).

Both return parsed JSON, both throw `ApiError` from shared.

**Envelope handling:** because Phase 0c migrates the ~18 backend stragglers onto `sendSuccess()` (which already emits both `{ success, status }`), the client adapter no longer needs to *normalize* the envelope. It only needs to:
1. Validate `success === true` (and/or `status === 'success'`).
2. Read the documented `data` field for the route.
3. Throw `ApiError` for everything else.

That's a much smaller surface than the previous draft assumed. Adapter code stays under ~150 lines.

### 2.4 Hook layout — one rule for both apps

```
hooks/
  <domain>/
    queries/      one file per query endpoint (or grouped if 2-3 related)
    mutations/    one file per mutation endpoint (or grouped)
    keys.js       query-key factory (one place per domain)
    index.js      barrel
```

Examples: `hooks/events/`, `hooks/guests/`, `hooks/auth/`, `hooks/admin/`, `hooks/payments/`, `hooks/addons/`, `hooks/tickets/`, `hooks/notifications/`, `hooks/plans/`, `hooks/post-event/`, `hooks/staff/`, `hooks/users/`, `hooks/templates/`, `hooks/discounts/`, `hooks/vendors/`, `hooks/marketplace/`, `hooks/messaging/`, `hooks/subscriptions/`, `hooks/locations/`, `hooks/dashboard/`.

Same names on both platforms. Same query-key factories on both platforms.

### 2.5 Reconciliation rules — backend is ground truth

When a schema, error code, or request shape differs between web and mobile, **the backend's Zod schema is the tiebreaker, not the team's preference**. The API enforces it at runtime; anything else creates UX bugs (user submits a form the client accepted but the API rejects).

**Concrete rules:**

1. **Schemas:** `@halla/shared/schemas/<domain>.js` mirrors `labbe-backend-/src/modules/<domain>/<domain>.validation.js`. Field-by-field. Same regex, same min/max, same enum values, same optional/required flags.
2. **When web and mobile both diverge from backend:** the shared schema follows the backend. Both apps update. If business wants a different rule (e.g., allow Egyptian phone numbers), change the backend first.
3. **When only one client diverges:** the matching one wins by default. The diverging one updates.
4. **Field names:** prefer the backend's field name even when it's awkward. E.g., if web sends `phoneNumber` and mobile sends `mobile`, but backend reads `phoneNumber`, both apps standardize on `phoneNumber`.
5. **i18n keys are app-side concerns.** Schemas in shared emit *opaque keys* (e.g., `"validation.invalidSaudiPhone"`); apps translate them. Never hardcode user-visible strings in shared.

**Three real divergences found during verification (must be resolved during Phase 1):**

| Domain | Web behavior | Mobile behavior | Backend contract | Resolution |
|---|---|---|---|---|
| Phone validation (login/signup) | Accepts Saudi (5/05) and Egypt (01) via 3-branch refine | Accepts any 9-15 digit string | Strict Saudi `^(\+966\|966\|0)?5\d{8}$` | Both apps adopt backend regex |
| Event guest contact | Phone *or* email (either required) | Phone required, no email field | Phone required, email optional | Web adopts mobile shape; phone required, email added as optional |
| Ticket rating schema | Missing | Present (`ticketRatingSchema`) | Present (Zod in `tickets.validation.js`) | Add to shared; web gains the schema |

These are **real product bugs** disguised as schema differences. Phase 1 fixes them as part of lifting schemas into shared.

### 2.6 API integration patterns — what's platform-mandated vs accidental

Web and mobile differ in three categories. Each is treated differently in the migration.

**Platform-mandated (keep different):**
- **Token storage:** HttpOnly cookies (web) vs `expo-secure-store` (mobile). Cannot unify.
- **Refresh transport:** cookie-based (web) vs body-field (mobile). Cannot unify.
- **FormData replay after 401 refresh:** web can retry; mobile cannot (stream not seekable). Documented limitation, do not regress.

**Accidental divergence (unify in Phase 1-3):**
- **Response unwrapping location.** Web unwraps `{ token, data: { user } }` in the hook's `onSuccess`. Mobile unwraps inside the service. → Move both into the adapter, return flat shapes to hooks.
- **FormData building.** Web's `useEventCrudMutation` builds FormData inside the hook (caller passes plain object). Mobile's hook expects pre-built FormData from the caller. → Standardize: hooks build FormData; callers pass plain JS objects with `File`/`Blob` references.
- **Cache invalidation breadth.** Mobile event-create invalidates `["events"]` + `["dashboard", "host"]`; web only `["events"]`. → Query-key factories (§2.4) define one canonical invalidation set per mutation.
- **Error mapping path.** Web routes through `errorHandlingService` → i18n key. Mobile throws raw and lets RQ surface the error. → Both adapters throw shared `ApiError` with `.i18nKey` getter (after Phase 2).

**Consumer-side conventions (codified in Phase 5):**
1. **One mutation factory per domain** that takes an action key and dispatches via a config map (matches `labbe/hooks/events/mutations/useEventMutation.js`).
2. **Query keys come from `hooks/<domain>/keys.js` only.** Inline `["events", id]` arrays forbidden by ESLint.
3. **Forms validate via `zodResolver(schemaFromShared)`.** Services never re-validate.
4. **Side-effects split:** hooks do data + cache invalidation; screens do toast + navigate. Lint rule: no `useNavigation`/`useRouter` inside `hooks/`.

### 2.7 Auth — diverges only at storage

- Same Zustand store *shape* (`{ user, role, status: 'checking'|'loading'|'authenticated'|'unauthenticated', error }`).
- Same actions (`login`, `signupHost`, `signupVendor`, `sendOTP`, `verifyOTP`, `completeProfile`, `refreshTokens`, `logout`, `forgotPassword`, **`resetPassword`** ← new on mobile).
- Same status machine.
- Differences confined to the `_persistAuth` / `restoreSession` internals: web writes nothing locally (HttpOnly cookies handled by backend), mobile writes refresh token to `secureStorage`.
- Bearer-token handling is mobile-only; on web the transport simply enables `withCredentials`.
- **Deep links:** mobile must register a universal/app link scheme so the email's `/reset-password/:token` URL opens `ResetPasswordScreen` directly with the token (covered in Phase 4b).

---

## 3. Migration Plan (sequenced, by phase)

> Each phase produces a green build and is independently revertable. The order minimizes risk of breaking flows already in production.

### Phase 0 — Decision & setup (no code changes that touch runtime)

**Decisions (recommendations are now defaults — see §6 for the reasoning):**
1. **Monorepo layout** — **npm workspaces** (no new tooling; all three packages already use `package-lock.json`, none use pnpm/yarn). Three packages: `labbe`, `halla-mobile`, `@halla/shared`. Root `package.json` (currently empty) becomes the workspace root.
2. **Language strategy** — **JS everywhere, no TypeScript.** All three packages (`labbe`, `halla-mobile`, `@halla/shared`) stay JS. Use JSDoc `@typedef` blocks for shared schema-derived shapes so editors/IDE still surface autocomplete without a TS toolchain. Zod schemas remain the single source of truth at runtime; JSDoc mirrors the shape for editor hints. Do NOT introduce `.ts` files in any package.
3. **Build target for shared** — pure ESM, no JSX, no React, no transpilation step. Plain JS files consumed directly via package name `@halla/shared` in both apps.
4. **Versioning** — shared lives in-repo at `D:\halla\shared\`; both apps depend on `"@halla/shared": "*"` resolved via workspace symlinks.
5. **CI** — there is **none today** for web/backend (mobile has `eas.json`). Adding CI is in scope: lightweight GitHub Actions workflow per app running lint + type-check + build on PR. Not a blocker for Phase 1 but should land in the same milestone.

**Phase 0a — Bundler-resolution spike (MUST complete before Phase 1):**
Making one workspace package importable by both **Metro (React Native)** and **Next.js webpack/turbopack** simultaneously is not free. Specifically verify the following in a throwaway PR:
- Metro can resolve `@halla/shared` via the workspace symlink. RN's Metro has historically required `watchFolders` extension and sometimes explicit `resolver.nodeModulesPaths` — confirm in `halla-mobile/metro.config.js`.
- Next.js `transpilePackages: ['@halla/shared']` in `next.config.mjs` so the shared package isn't externalized.
- Both bundlers handle the chosen module format. Plain ESM is the default target since shared is hand-written JS; if Metro needs CJS for any reason, add a dual-format `exports` map at that point — not before.
- Source maps work end-to-end (so a Zod parse error in shared points at the shared file, not a transpiled artifact).
- No build step for shared if at all possible: consume `.js` files directly via workspace symlink. Avoid bundlers/transpilers in the shared package.

Output of the spike: a 1-page memo confirming the chosen approach actually loads in both bundlers, plus a `shared/package.json` `exports` field that both bundlers consume. **Do not start Phase 1 until this is green.**

**Phase 0b — CI baseline (parallelizable with 0a):**
Add a GitHub Actions workflow per app: `lint && type-check && build`. Mobile already has `eas.json` for builds; layer a workflow on top so PRs surface failures before merge. Keep it fast (<5 min) so it doesn't become the bottleneck.

**Phase 0c — Backend envelope cleanup (2 hours, blocks nothing but unblocks §2.3 simplifications):**
Migrate the ~18 remaining ad-hoc `{ success: true, ... }` responses in `labbe-backend-/src/modules/**/*.controller.js` to use `sendSuccess()` / `sendCreated()` / `sendPaginated()` from `shared/utils/responseHelper.js`. Grep target: `return res\.(json|status)` and `res\.json\(\{\s*success`. After this, every backend response carries **both** `success: true` AND `status: 'success'` — client adapter code drops to "check one field, read documented data path, throw on anything else."

Deliverable: `D:\halla\package.json` with workspaces; `D:\halla\shared\package.json` with verified `exports` map; one demo export imported and used by a single throwaway file in each app to prove resolution works; CI passing on a noop PR for each app.

### Phase 1 — Lift `API_PATHS` & shared schemas (low risk, immediate win)

1. Copy `labbe/services/new-backend/api.config.js` → `shared/src/api/paths.js`. Keep it as plain JS — freeze the top-level object with `Object.freeze` (and ideally `as const`-equivalent via JSDoc `@type`) so consumers don't mutate it.
2. Identify the union of schemas: merge `labbe/utils/schemas/*` and `halla-mobile/utils/schemas/*` into `shared/src/schemas/*`, organized per domain (`auth`, `events`, `guests`, `staff`, `tickets`, `plans`, `addons`, `post-event`, `vendor`, `settings`, `notifications`, `admin`). Where the same domain exists in both, take the stricter/more-complete version (typically web), reconcile field names with backend.
3. Re-point imports:
   - `labbe`: replace `@/services/new-backend/api.config` with `@halla/shared/api/paths`. Replace `@/utils/schemas/*` with `@halla/shared/schemas/*`.
   - `halla-mobile`: introduce these imports; replace inline endpoint strings + the `ENDPOINTS` map in `config/api.js` with `API_PATHS.events.byId(id)`-style helpers; replace local schema imports.
4. Delete the moved-from files in each app.

**Risk:** Low. Imports change but behavior is identical. **Test:** type-check + smoke-test login, signup, create event on both apps.

**Concrete files affected:** every file in `labbe/utils/schemas/` and most of `halla-mobile/utils/schemas/`; every service file in `halla-mobile/services/` (the hardcoded endpoint strings); `halla-mobile/config/api.js` (collapses to a thin re-export).

### Phase 2 — Unify `ApiError` and error→i18n mapping

1. Merge `halla-mobile/services/authErrors.js` + `labbe/services/errorHandlingService.js` → `shared/src/errors/index.js`. Preserve every code currently mapped in either app — union, not intersection.
2. **i18n key audit:** for every error code the shared mapper references, run an existence check against both `labbe/localization/locales/{ar,en}/errors.json` and `halla-mobile/localization/locales/{ar,en}/errors.json` (and any other locale file referenced by the mapper). Add missing keys to whichever side is short. Mobile is currently missing Arabic translations for some vendor-only error codes that web has.
3. Both apps' HTTP adapters throw the shared `ApiError`.
4. Map the backend's `410 Gone` (revoked-token) + structured `reason` into a dedicated `ApiError` subtype so both clients can react with a single auth-store action (`logout({ reason })`).

**Risk:** Medium — error UX is user-visible. **Test:** force an OTP cooldown, suspended account, invalid token; verify both apps show the same message.

### Phase 3 — Web: collapse to one HTTP client

1. Migrate `labbe/services/notification.js`, `labbe/services/staff.js`, `labbe/services/adminDashboard.js` from legacy `apiClient` to `apiRequest` (the axios one). They already reference `API_PATHS` in places; just swap the call site.
2. Delete `labbe/services/apiClient.js` (legacy), `labbe/services/apiResponseHandler.js`. Audit `labbe/utils/cookieUtils.js` and delete any usage that reads the legacy JS-readable cookie. Display-only helpers (e.g., remembered username) can stay if they exist.
3. Delete the JS-readable mirror-cookie `getToken()` codepath (B-1 hardening). Cookies remain HttpOnly; tests confirm refresh still works.

**Risk:** Medium. **Test:** notification list + unread count poll; staff portal QR check-in; admin dashboard tables (hosts, vendors, moderators, payments).

### Phase 4 — Mobile: consolidate events service

1. Move the *validation* helpers from `halla-mobile/services/EventsService.js` (`validateListItem`, `processImportedCSV`, `transformFormDataToPayload`, `getDefaultFormValues`) into `shared/src/utils/event-form.js` if pure, or into `halla-mobile/hooks/events/useEventForm.js` (a non-hook helper file is fine, matches web's `useEventForm.js`).
2. Merge the seven `eventsService.*.js` shards + `eventsService2.js` façade into a single `services/eventsService.js` with sub-objects (`events.crud`, `events.guests`, `events.staff`, `events.settings`, `events.exports`). Update all hook imports.


3. Move per-guest CRUD from `services/guestsService.js` into the same `eventsService.guests` namespace (endpoint path lives at `/guests/events/:eventId/...` but is logically event-scoped; rename file to `eventGuestsService` for backend-shape parity).
4. **Collapse the six `useEvent*Mutations.js` hook files into one factory-driven `useEventMutation.js`** that takes an operation key (mirroring web's `labbe/hooks/events/mutations/useEventMutation.js`). The current `useEventMutations.js` is already a façade — fold the underlying CRUD/guest/settings/staff/messaging files into a single config map.
5. Delete `EventsService.js`, `eventsService.{crud,http,guests,settings,staff,exports}.js`, `eventsService2.js`, `useEventCrudMutations.js`, `useEventGuestMutations.js`, `useEventSettingsMutations.js`, `useEventStaffMutations.js`, `useEventStaffCrudMutations.js`.

**Risk:** Medium-high — lots of imports change. **Test:** create event flow end-to-end (host + admin paths), edit guests, edit staff, send test message, retry launch.

### Phase 4b — Behavior parity fix (small, surgical)

The previous draft listed four parity fixes; verification reduced this to **one** real gap.

1. **Mobile reset-password completion.** Add `halla-mobile/screens/auth/ResetPasswordScreen.js` that calls the already-existing `resetPasswordAPI()` in `halla-mobile/services/authService.js:466-476`. Wire it into the navigator and register a universal/app link so the email's `https://halaa.com.sa/reset-password/:token` URL opens the screen directly with the token in route params. Add a `resetPassword` action to `authStore.js` (mirroring web's). Smoke-test end-to-end: request reset → click email link on phone → land in app → submit new password → log in.

**Risk:** Low. **Test:** full forgot-password flow on mobile from a real email; ensure web flow still works (no shared changes).

**Web cross-check (verified during the revision pass):** web's flow lives at `labbe/app/[lang]/(auth-layout)/change-password/page.js` and uses a query-string token (`/change-password?token=…`) rather than a path parameter. The form is `ChangePassword.js` and the mutation goes through `useAuthMutation("resetPassword")`. Note the URL-shape divergence: backend route is `PATCH /auth/reset-password/:token` but the web *landing* URL is `/change-password?token=`. Mobile should mirror this exactly — same landing URL, same query-param scheme — unless the team wants to standardize the public URL on `/reset-password/:token` (recommended for hygiene; cost = update the email template + one Next.js route rename + universal-link configuration for mobile).

### Phase 5 — Both apps: standardize hook layout

1. **Web:** create `hooks/<domain>/{queries,mutations,keys.js,index.js}` for every domain currently in `hooks/reactQueryHooks/*`. Move file contents over; update imports. Delete `hooks/reactQueryHooks/`. Delete `hooks/queries/` and `hooks/mutations/` (legacy). Delete the deprecated `hooks/reactQueryHooks/useEvents.js` façade (already documented as "use hooks/events instead").
2. **Mobile:** rename current `hooks/queries/useEvents.js` etc. into `hooks/events/queries/`, etc. Add `keys.js` per domain. Delete old flat layout. Apply this consistently across all ~20 domains in §2.4.
3. Adopt query-key factories everywhere. Example:
   ```ts
   // hooks/events/keys.js
   export const eventKeys = {
     all: ['events'] as const,
     lists: () => [...eventKeys.all, 'list'] as const,
     list: (filters: EventFilters) => [...eventKeys.lists(), filters] as const,
     details: () => [...eventKeys.all, 'detail'] as const,
     detail: (id: string) => [...eventKeys.details(), id] as const,
     stats: (id: string) => [...eventKeys.detail(id), 'stats'] as const,
   };
   ```
4. Invalidation always goes through the factory — fewer "I forgot to invalidate this key" bugs.
5. **Cache-migration safety:** when a query-key shape changes, invalidate the old keys explicitly on first load of the next app version (or just clear the RQ cache on app start during the rollout window). Mobile, where users hold app versions for weeks, needs this more than web.

**Risk:** Highest of all phases because of import churn. Do it after Phase 4. **Test:** each domain's primary screens on both apps.

### Phase 6 — Auth store alignment

1. Define the canonical store shape in shared as a Zod schema (for the *snapshot*, not the store itself). Both apps' Zustand stores conform.
2. Mobile: keep `secureStorage.js` (it's the platform delta), but re-name fields to match web (e.g., both use `subscription` not `plan`).
3. Web: stop relying on `Cookies.get("token")` anywhere; the cookie is HttpOnly. The store's `token` field becomes vestigial — delete it.
4. Both apps emit the same auth status machine (`checking → loading → authenticated|unauthenticated`).
5. Both stores expose the same action surface, including the new `resetPassword` from Phase 4b.

**Risk:** Low-medium. **Test:** cold-launch with cached refresh on mobile; refresh-after-expiry on web; logout from both clears all state.

### Phase 7 — Kill the duplicate stores

1. **Mobile:** delete `stores/adminStore.js`. Replace each consumer with the corresponding `hooks/admin/queries/use*` or `hooks/admin/mutations/use*`. RQ becomes the single source of truth for admin lists.
2. **Web:** convert `stores/notificationStore.js` from "store that calls service + manual `setInterval` polling" to "thin store of UI state only (read/unread toggle, filter state)" — the RQ hooks **already exist** in `labbe/hooks/reactQueryHooks/useNotifications.js` (with `useUnreadNotificationCount` already configured for 30 s `refetchInterval`). The work is to route consumers to those hooks and gut the store's data layer, not to build new hooks. Relocate `useNotifications.js` to `hooks/notifications/queries/` as part of Phase 5.
3. Remove the manual `setInterval` at `labbe/stores/notificationStore.js:248-250`.

**Risk:** Medium. **Test:** admin tables (mobile), notification bell + list (web).

### Phase 8 — Cleanup pass

- Delete `labbe/staticData/events/data.js` (verified zero importers).
- Delete `labbe/utils/schemas/phoneValidation.js` (consolidate into `shared/src/schemas/auth.js`).
- **Delete `halla-mobile/utils/errorHandler.js`** — dead code, zero importers verified. Any unique error codes/messages it defines get harvested into `@halla/shared/errors/errorCodeMap.js`; the rest is duplicate of `services/authErrors.js` patterns.
- Extract `getStaticAssetBaseUrl()` helper for the `API_BASE_URL.replace("/api/v2", "")` pattern in `halla-mobile/services/marketplaceService.js:71` and any other callers.
- Extract `userAccountService` (shared between `vendorService` and `settingsService`) on both apps.
- Apply the cleanup-in-place items from §7 (console.log removal, comment-block cleanup, helper deduplication).
- Delete any `// removed` / unused exports flagged during the above phases.
- Run grep for leftover imports from the deleted files; fail the build if any remain.
- Lint pass: forbid imports from `@/services/apiClient` (web) and from `services/EventsService` (mobile) via ESLint `no-restricted-imports`. Add a rule that forbids literal `/api/v2/` strings anywhere outside `@halla/shared`. Add a rule banning `console.log` in production code paths (warn-level on `console.warn`/`console.error`).

### Phase 9 — Verify & lock in

- End-to-end smoke on both apps: auth (4 paths: host email, host OTP, vendor, whitelabel) + **full forgot-password reset on mobile**, event create wizard (host + admin), guest CRUD, plan checkout (with 3DS), admin host/vendor list, notifications, post-event guest portal.
- CI check: `eslint` against `@halla/shared`, `labbe`, and `halla-mobile`; `next build` for `labbe`; `expo prebuild --no-install` dry-run for `halla-mobile`.
- CI check: fails if either app has a literal URL string matching `/api/v2/` (forces use of `API_PATHS`).
- CI check: fails if either app imports from a deleted path (compile-time guarantee).
- Document the rules in a top-level `ARCHITECTURE.md` (mostly a condensed version of §2 here).

---

## 4. Order of operations & rough effort

| Phase | Effort (focused) | Risk | Blocks |
|---|---|---|---|
| 0 — workspace setup | 0.5 day | low | 0a |
| 0a — bundler-resolution spike | 0.5-1 day | medium (spike may surface integration pain) | 1, 4 |
| 0b — CI baseline (parallel) | 0.5 day | low | 9 |
| 0c — backend envelope cleanup | 0.25 day (2h) | low | 2 |
| 1 — lift API_PATHS + schemas | 2-3 days | low | 2, 3, 4 |
| 2 — unify error mapping + i18n audit | 1 day | medium | 3 |
| 3 — web: collapse HTTP clients | 2 days | medium | 5 |
| 4 — mobile: consolidate events service + event mutation hooks | 2-3 days | medium-high | 5 |
| **4b — mobile reset-password screen + deep link** | **0.5 day** | **low** | **9** |
| 5 — standardize hook layout (both apps, ~20 domains) | 3-4 days | high (churn) | 6, 7 |
| 6 — auth store alignment | 1-2 days | low-medium | 7 |
| 7 — kill duplicate stores | 1-2 days | medium | — |
| 8 — cleanup (+ helpers, lint rules) | 1-2 days | low | — |
| 9 — verify & lock in | 1 day | low | — |

**Total: ~16-20 focused engineering days** on a feature-freeze branch with continuous integration testing. Suggest tackling phases 0-2 in the first week, 3-4b in the second, 5-9 in the third.

---

## 5. Risks & guardrails

- **Big bang vs phased:** the phasing above keeps every step shippable. Resist the temptation to do 1+3+4 in one PR — diffs become unreviewable.
- **Schema name reconciliation:** when merging schemas, keep the stricter set of fields and the stricter validators. If web validates `email` with `.toLowerCase().trim()` and mobile doesn't, take the stricter one — backend doesn't care.
- **Hook key factories without migration plan = silent cache misses.** When you change a query key shape, invalidate the old keys explicitly on first load (or just clear the RQ cache on app start during the rollout window). Mobile is the bigger risk because users hold an app version for weeks.
- **Mobile FormData replay limitation:** the existing apiClient already documents that FormData bodies can't be retried after refresh. Don't regress this when narrowing the transport.
- **Server-only code on web:** `services/serverAuth.js`, `providers/index.js` use `next/headers` and `next/navigation`. They cannot move into shared. Keep them in `labbe/`.
- **Backend response shape inconsistencies** (§1.3) — after Phase 0c, the envelope is uniform. **Single-resource data shapes** (`{ event }` vs `{ user }` vs the raw object) are intentional per route — clients read the documented field; do NOT push transformation logic into UI code.
- **i18n keys for errors** (Phase 2) — when merging error mappers, audit both apps' locale files for missing keys. Mobile currently shows English fallbacks for some vendor-only error codes that web has Arabic translations for.
- **Mobile deep links (Phase 4b)** — universal links / app links must be configured on both iOS (`apple-app-site-association`) and Android (`assetlinks.json`). Backend serves these via `halaa.com.sa`. Don't forget the test on a physical device — simulator behavior diverges.

---

## 6. Open questions — answered

The previous draft listed open questions for the team. These are now decided based on the code state of the repo. Override only with explicit pushback.

### Q1. Workspace tool

**Decision: npm workspaces.**
All three packages already use `package-lock.json` exclusively (no `yarn.lock`, no `pnpm-lock.yaml`). No `packageManager` field set in any `package.json`. Expo + pnpm has historical symlink/peer-resolution pain; npm 7+ workspaces are zero-friction.

### Q2. TypeScript scope

**Decision: JS everywhere. No TypeScript in any package.**
Confirmed by team: stay JS across `labbe`, `halla-mobile`, and `@halla/shared`. Use JSDoc `@typedef` blocks (sourced from Zod schemas via comments, not codegen) where editor autocomplete on shared shapes is valuable. Mobile's `tsconfig.json` + `typescript` devDep can stay (Expo accepts both), but no `.ts` files get added. Validation continues to live at runtime in Zod schemas; types are documentation, not enforcement.

### Q3. CI

**Decision: add minimal CI as part of Phase 0b.**
Today: mobile has `eas.json`; web and backend have **nothing** (no `.github/workflows/`, no `vercel.json` deploy config, no other CI files). Add GitHub Actions per app: `lint && type-check && build` on PR. ~1 day total. Mobile workflow layers on top of EAS for build dispatch.

### Q4. Backend response envelope normalization

**Decision: fix on the backend, not the client.**
The verification pass found that `sendSuccess()`/`sendCreated()`/`sendPaginated()` in `labbe-backend-/src/shared/utils/responseHelper.js` already emit **both** `success: true` AND `status: 'success'` on the same payload — so the "two envelopes" problem only exists where controllers bypass the helper. Count: ~214 routes use the helper; ~18 don't. Estimated effort to migrate the stragglers: **2 hours**. After Phase 0c, the client adapter checks one field and reads documented `data` — no transformation pipeline needed. This collapses §2.3 from "envelope-normalizing adapter" to "validating adapter."

### Q5. Notification polling — keep, or move to realtime?

**Decision: keep 30s polling.**
Backend has zero realtime infrastructure today (no `ws`, no `socket.io`, no `pusher`, no SSE, no FCM server SDK). Mobile already has `expo-notifications` installed — that's the right channel for *push* (critical alerts, urgent updates), not the unread-count badge. Polling cost is trivial: ~200 B every 30 s, dominated by TLS overhead. Revisit at 100k+ DAU. For Phase 7, RQ's `refetchInterval` replaces the `setInterval` cleanly; same wire cost, better dedup.

---

## 7. Cleanup-in-place — kept files that still need work

The deletion lists in Appendix A are aggressive but they leave many files in place. A final read-through of those "stays" files surfaced **specific cleanups required before the refactor declares done**. None block the structural phases; they all fold into Phase 8.

### 7.1 Web (`labbe/`)

**`labbe/utils/index.js`** — NEEDS-CLEANUP
- Lines 56 and 77: `console.log("formValues", ...)` and `console.log("result", ...)` left from a debug session inside `validateStep`. Remove.
- `getMediaUrl()` (lines 21-50) is genuinely useful and non-trivial (handles File / Blob / absolute / relative-with-backend-origin). **Promote to `@halla/shared/utils/media.js`** — mobile's `marketplaceService.js:71` strip-`/api/v2` trick is solving the same problem badly.
- `validateStep`, `createStepHandler`, `setNestedValue` overlap with helpers in `authFormHelpers.js`. Pick one location per helper; delete duplicates.

**`labbe/utils/vendorHelpers.js`** — NEEDS-CLEANUP
- Overlaps with `utils/index.js` (`getMediaUrl` is defined or re-implemented). Dedupe: keep `vendorHelpers.js` for vendor-specific data shaping; move generic helpers out.

**`labbe/services/notification.js`** — NEEDS-CLEANUP (Phase 3)
- Still imports legacy `apiClient` (line 6) — Phase 3 migration to axios is mandatory.
- `formatTimeAgo`, `getNotificationIcon`, `getPriorityColor` (presentation helpers) are duplicated client-side logic. **Move to `@halla/shared/utils/notification.js`** — mobile has the same need.
- Line 94: raw `console.error`; wrap in `process.env.NODE_ENV === "development"` check or remove.

**`labbe/services/staff.js`** — DEFERRED HARDENING
- Reads `Cookies.get("staffToken")` (JS-readable) — documented at lines 5-8 as intentional ("future hardening pass"). **Add to a Phase 3b backlog item:** move staff-portal token to HttpOnly cookie like the main auth flow. Not blocking this unification but flag it explicitly.

**`labbe/providers/index.js`** — MINOR
- Commented-out redirect block at lines 45-47. Decide: delete the dead block, or convert to a real `// TODO` comment with the ticket reference.

**`labbe/hooks/usePageAccess.js`** — UPDATE AFTER PHASE 1
- Imports `ACCESS_LEVELS` and three permission predicates from `@/ui/layout/navConfig`. The file exists and the hook works today, **but `ACCESS_LEVELS` will move to `@halla/shared/constants/roles.js` in Phase 1.** Update this import as part of Phase 1's re-pointing pass; do not leave a dangling local copy of `ACCESS_LEVELS` in `navConfig.js` after Phase 1.

**`labbe/hooks/UseLanguageChange.js`** — MINOR
- Commented-out lines (16, 33-40). Clean up or remove.

### 7.2 Mobile (`halla-mobile/`)

**`halla-mobile/utils/errorHandler.js`** — DELETE (moved to Appendix A)
- Verified zero importers. Hardcoded Arabic/English error messages duplicate what `@halla/shared/errors/errorCodeMap.js` will hold after Phase 2. Harvest any unique codes, then delete.

**`halla-mobile/services/authService.js`** — NEEDS-CLEANUP
- Lines 265 and 315: raw `console.log` with phone number (`"[AUTH SERVICE] Verifying OTP for login:", mobile`). **PII leak in release builds.** Replace with `dlog` (already used elsewhere in the file at line 42). Audit all `console.log` in service files for similar PII exposure during Phase 8.

**`halla-mobile/services/notificationService.js`** — NEEDS-CLEANUP
- Audit `console.log` usage; same `dlog` rule.
- The `_legacyToken` parameter is already on the Phase 8 list (remove after caller audit).

**`halla-mobile/services/marketplaceService.js`** — NEEDS-CLEANUP (already in Phase 8)
- Line 71 `.replace("/api/v2", "")` → extract to `getStaticAssetBaseUrl()`. The same helper should serve web's `getMediaUrl()` once promoted to shared.

**`halla-mobile/hooks/useDebouncedValue.js`** — UNIFY WITH WEB
- Web exports `useDebounce` (500 ms default); mobile exports `useDebouncedValue` (350 ms default). **Same code, different name and default.** Resolution: move the hook to `@halla/shared/utils/useDebounce.js` (it's pure React, no platform dependency); both apps re-export under the canonical name `useDebounce` with the same default (pick one — web's 500 ms is the more conservative default for typeahead-style usage). Update consumers.

**`halla-mobile/contexts/QueryProvider.js` vs `halla-mobile/config/queryClient.js`** — GOOD as-is
- QueryProvider wraps the client; queryClient holds the config. No duplication. Document this split in `ARCHITECTURE.md`.

**`halla-mobile/contexts/ToastContext.js`** — PLATFORM-SPECIFIC, but contract aligns with web (see §8 below)

### 7.3 ESLint additions to lock in

After Phase 8, add these rules so the same problems don't grow back:
- **No-restricted-imports:** `@/services/apiClient` (web legacy), `services/EventsService` (mobile capital-E), `services/eventsService2` (mobile façade).
- **No-restricted-syntax:** literal regex `\/api\/v2\/` outside `@halla/shared`.
- **No-console:** error on `console.log` in `src/**` (mobile services + utils); warn on `console.warn`/`console.error`. Allow inside files explicitly tagged `// eslint-disable-next-line no-console` for known-good logging.
- **No `useNavigation` / `useRouter` inside `hooks/`** — enforces the hooks-do-data / screens-do-side-effects split from §2.6.

---

## 8. Remaining cross-app pattern divergences — addressed

After Phase 7, four patterns still differ between web and mobile. Three are now unified; one stays divergent by design.

### 8.1 Toast surface — unify the API, not the implementation

- **Web:** `labbe/utils/toastUtils.js` — `react-toastify` wrapper exposing `toast.success`, `toast.error`, `toast.info`, `toast.warning`.
- **Mobile:** `halla-mobile/contexts/ToastContext.js` — custom RN context with animated stack, exposes `toast.success/error/info/warning` via a hook (`useToast()`).

**Resolution:** the **call site contract is identical** (`toast.success("message")`) — just exposed differently (named import on web, hook on mobile). Codify in `ARCHITECTURE.md` that any code intended to be portable through shared (e.g., shared hooks that happen to need a toast) must accept the toast function as a parameter, not import a global. New rule: hooks in `@halla/shared` never call toast directly.

### 8.2 Debounce hook — move to shared

- See §7.2. Move `useDebounce` to `@halla/shared/utils/useDebounce.js`. Both apps import the same hook with the same default. Delete the two local copies.

### 8.3 Action gate — move to shared

- **Web:** `labbe/hooks/events/useEventActionGate.js` (95 lines).
- **Mobile:** `halla-mobile/hooks/useEventActionGate.js`.
- Verified during final review: **the two files are functionally identical** — same RBAC check, same `whitelabelId` scoping, same `_id.toString()` defensive cast.
- **Resolution:** promote to `@halla/shared/hooks/useEventActionGate.js`. Pure React, no platform deps. Both apps import the canonical version. Delete both local copies in Phase 5/8.

### 8.4 Form-builder pattern — keep divergent, document

- **Web:** `labbe/hooks/events/useEventForm.js` — single-form, react-hook-form based, all 4 steps live in one form context.
- **Mobile:** `halla-mobile/hooks/useCreateEventForm.js` — step-based, separate validation per step, navigates between screens.
- **Verdict:** **intentional UX divergence**, not architectural drift. Mobile's step model fits small screens; web's single-form fits desktop. Both consume the same shared schemas, so validation is consistent.
- **Resolution:** document the split in `ARCHITECTURE.md`. Do not attempt to unify.

### 8.5 Date/time formatting

- Web has `utils/date/useLocalizedDate.js` (Intl.DateTimeFormat hook) and `utils/formatTemplateDate.js`.
- Mobile has `utils/timeFormat.js` and `utils/formatTemplateDate.js`.
- **Resolution:** move pure formatters (`formatTemplateDate`, `formatTime`, date utilities) to `@halla/shared/utils/date.js` in Phase 1. Keep `useLocalizedDate` web-only if it does anything Next.js-specific; otherwise also move to shared as a portable hook.

---

## Appendix A — File-level diff snapshot

> **Counts:** ~52 files deleted from `labbe/` (web) + 5 folders removed. ~37 files deleted from `halla-mobile/` (mobile) + 3 folders removed. Many more files are *modified* (imports re-pointed) but not deleted.

### A.1 Web — files to delete, grouped by phase

**Phase 1 — schemas + utils that migrate to `@halla/shared`:**

Entire folder `labbe/utils/schemas/` removed (all 18 files):
```
labbe/utils/schemas/accountSettingsSchema.js
labbe/utils/schemas/addHostSchema.js
labbe/utils/schemas/addModeratorSchema.js
labbe/utils/schemas/addServiceSchema.js
labbe/utils/schemas/adminPopupSchemas.js
labbe/utils/schemas/authSchema.js
labbe/utils/schemas/createEventSchema.js
labbe/utils/schemas/eventAddintionSchemas.js
labbe/utils/schemas/notificationPreferencesSchemas.js
labbe/utils/schemas/phoneValidation.js
labbe/utils/schemas/planSchema.js
labbe/utils/schemas/postEventSchemas.js
labbe/utils/schemas/settingsSchemas.js
labbe/utils/schemas/staffSchemas.js
labbe/utils/schemas/ticketRatingSchema.js
labbe/utils/schemas/ticketSchema.js
labbe/utils/schemas/updateEventSchema.js
labbe/utils/schemas/vendorSettings.js
```

Duplicate phone-validation copy at utils root:
```
labbe/utils/phoneValidation.js
```

Pure-utility files that move into `@halla/shared/utils/` then their local copies are deleted:
```
labbe/utils/locale.js              → @halla/shared/utils/locale.js
labbe/utils/DirectionUtils.js      → @halla/shared/utils/direction.js
labbe/utils/formatTemplateDate.js  → @halla/shared/utils/date.js
labbe/utils/xlsxUtils.js           → @halla/shared/utils/xlsx.js
```

Constants folder also migrates:
```
labbe/utils/constants/             → @halla/shared/constants/
```

**Phase 2 — error mapping merge:**
```
labbe/services/errorHandlingService.js     (merged into @halla/shared/errors/)
labbe/services/new-backend/api.config.js   (already lifted to @halla/shared/api/paths.js in Phase 1)
```

**Phase 3 — HTTP client collapse:**
```
labbe/services/apiClient.js                (legacy fetch client, 381 lines)
labbe/services/apiResponseHandler.js       (327 lines, superseded)
labbe/utils/cookieUtils.js                 (audit; remove the JS-readable mirror-token path; keep file if other UI-only uses remain)
```

**Phase 5 — hook tree consolidation. Three entire folders removed:**

`labbe/hooks/reactQueryHooks/` (20 files):
```
labbe/hooks/reactQueryHooks/useAddons.js
labbe/hooks/reactQueryHooks/useAdmin.js
labbe/hooks/reactQueryHooks/useAuthMutation.js
labbe/hooks/reactQueryHooks/useCheckout.js
labbe/hooks/reactQueryHooks/useDashboard.js
labbe/hooks/reactQueryHooks/useDiscounts.js
labbe/hooks/reactQueryHooks/useEvents.js                       (7-line deprecated façade)
labbe/hooks/reactQueryHooks/useGuests.js
labbe/hooks/reactQueryHooks/useLocations.js
labbe/hooks/reactQueryHooks/useMessaging.js
labbe/hooks/reactQueryHooks/useNotifications.js
labbe/hooks/reactQueryHooks/usePayments.js
labbe/hooks/reactQueryHooks/usePlans.js
labbe/hooks/reactQueryHooks/useServices.js
labbe/hooks/reactQueryHooks/useStaff.js
labbe/hooks/reactQueryHooks/useSubscriptions.js
labbe/hooks/reactQueryHooks/useTickets.js
labbe/hooks/reactQueryHooks/useUsers.js
labbe/hooks/reactQueryHooks/useVendors.js
labbe/hooks/reactQueryHooks/post-event/useGuestPostEvent.js
labbe/hooks/reactQueryHooks/post-event/useHostPostEvent.js
```
(contents relocate to `labbe/hooks/<domain>/{queries,mutations}/`)

`labbe/hooks/queries/` (3 files):
```
labbe/hooks/queries/useScheduledExtraReminders.js
labbe/hooks/queries/useTaqnyatTemplates.js
labbe/hooks/queries/useTemplates.js
```

`labbe/hooks/mutations/` (1 file):
```
labbe/hooks/mutations/useTemplateMutations.js
```

**Phase 7 — partial delete in notification store:**
```
labbe/stores/notificationStore.js          (data-fetching half: setInterval @ lines ~248-250,
                                            fetchUnreadCount, fetchNotifications service calls)
                                            File kept as UI-state-only store.
```

**Phase 8 — relocations (delete after move to shared):**
```
labbe/utils/index.js                       `getMediaUrl` moved to @halla/shared/utils/media.js;
                                            console.log lines 56/77 removed; helper dedupe with
                                            authFormHelpers.js (see §7.1)
labbe/services/notification.js             presentation helpers (formatTimeAgo, getNotificationIcon,
                                            getPriorityColor) moved to @halla/shared/utils/notification.js
labbe/hooks/useDebounce.js                 relocated to @halla/shared/utils/useDebounce.js
labbe/hooks/events/useEventActionGate.js  relocated to @halla/shared/hooks/useEventActionGate.js
```

**Phase 8 — orphaned dead code:**
```
labbe/staticData/events/data.js            (orphaned mock data — zero importers verified)
labbe/staticData/events/                   (folder removed if empty)
labbe/staticData/                          (folder removed if empty)
```

**Web files that explicitly STAY** (platform-specific, no shared analogue):
```
labbe/services/serverAuth.js               uses next/headers (SSR)
labbe/services/guestTokenUtils.js          web-only guest-portal cookie handling
labbe/services/notification.js             kept (migrated to axios in Phase 3)
labbe/services/staff.js                    kept (migrated to axios in Phase 3)
labbe/services/adminDashboard.js           kept (migrated to axios in Phase 3)
labbe/services/scheduledExtraRemindersService.js
labbe/services/taqnyatTemplatesService.js
labbe/services/templatesService.js
labbe/services/new-backend/apiClient.js    → renamed to labbe/services/http.js in Phase 8
labbe/stores/authStore.js                  web-specific HttpOnly cookie auth
labbe/stores/notificationStore.js          retained as UI-state-only store
labbe/stores/sidebarStore.js
labbe/providers/*                          SSR i18n + RQ provider
labbe/utils/authFormHelpers.js
labbe/utils/toastUtils.js
labbe/utils/vendorHelpers.js
labbe/utils/index.js
labbe/utils/date/                          web's date helpers (kept; shared utils complement, not replace)
labbe/hooks/events/                        already canonical — populated further in Phase 5
labbe/hooks/{UseLanguageChange, use-media-query, useDebounce, useDirection, usePageAccess, useUnsavedChanges}.js
labbe/config/fonts.js                      Next/font config
```

---

### A.2 Mobile — files to delete, grouped by phase

**Phase 1 — schemas + utils that migrate to `@halla/shared`:**

Entire folder `halla-mobile/utils/schemas/` removed (all 8 files):
```
halla-mobile/utils/schemas/authSchemas.js
halla-mobile/utils/schemas/createEventSchema.js
halla-mobile/utils/schemas/discountSchema.js
halla-mobile/utils/schemas/settingsSchema.js
halla-mobile/utils/schemas/ticketSchema.js
halla-mobile/utils/schemas/updateEventSchema.js
halla-mobile/utils/schemas/vendorSchemas.js
halla-mobile/utils/schemas/vendorServiceSchema.js
```

Constants folder migrates:
```
halla-mobile/utils/constants/eventStatus.js   → @halla/shared/constants/eventStatus.js
halla-mobile/utils/constants/plans.js         → @halla/shared/constants/plans.js
```
(Local `halla-mobile/utils/constants/` folder removed.)

Pure-utility files that move into `@halla/shared/utils/`:
```
halla-mobile/utils/locale.js               → @halla/shared/utils/locale.js
halla-mobile/utils/DirectionUtils.js       → @halla/shared/utils/direction.js
halla-mobile/utils/formatTemplateDate.js   → @halla/shared/utils/date.js
halla-mobile/utils/timeFormat.js           → @halla/shared/utils/date.js (merged)
halla-mobile/utils/xlsxUtils.js            → @halla/shared/utils/xlsx.js
```

Endpoint registry collapses to a re-export:
```
halla-mobile/config/api.js                 (the ENDPOINTS map is removed — file becomes
                                            a 1-line re-export of @halla/shared/api/paths,
                                            kept only for `API_BASE_URL` constant)
```

**Phase 2 — error mapping merge:**
```
halla-mobile/services/authErrors.js        (merged into @halla/shared/errors/)
```

**Phase 4 — events service + event mutation hooks consolidation:**

Service shards collapse to one `services/eventsService.js`:
```
halla-mobile/services/EventsService.js                 (capital E — validation moves to shared utils)
halla-mobile/services/eventsService.crud.js
halla-mobile/services/eventsService.http.js
halla-mobile/services/eventsService.guests.js
halla-mobile/services/eventsService.settings.js
halla-mobile/services/eventsService.staff.js
halla-mobile/services/eventsService.exports.js
halla-mobile/services/eventsService2.js                (façade)
```

`guestsService.js` is **renamed** to `eventGuestsService.js`, not deleted (backend route shape `/guests/events/:eventId/...` justifies keeping it separate from `eventsService.js`):
```
halla-mobile/services/guestsService.js     → renamed to halla-mobile/services/eventGuestsService.js
```

Six event-mutation hook files collapse into one factory:
```
halla-mobile/hooks/mutations/useEventMutations.js          (existing façade)
halla-mobile/hooks/mutations/useEventCrudMutations.js
halla-mobile/hooks/mutations/useEventGuestMutations.js
halla-mobile/hooks/mutations/useEventSettingsMutations.js
halla-mobile/hooks/mutations/useEventStaffMutations.js
halla-mobile/hooks/mutations/useEventStaffCrudMutations.js
```
(replaced by a single `halla-mobile/hooks/events/mutations/useEventMutation.js` factory)

**Phase 5 — hook tree restructure. Two entire folders removed:**

`halla-mobile/hooks/queries/` (22 files):
```
halla-mobile/hooks/queries/useAddons.js
halla-mobile/hooks/queries/useAdmin.js
halla-mobile/hooks/queries/useAdminInfinite.js
halla-mobile/hooks/queries/useDashboard.js
halla-mobile/hooks/queries/useDiscounts.js
halla-mobile/hooks/queries/useEvents.js
halla-mobile/hooks/queries/useGuestPortal.js
halla-mobile/hooks/queries/useGuests.js
halla-mobile/hooks/queries/useLocations.js
halla-mobile/hooks/queries/useMarketplace.js
halla-mobile/hooks/queries/useNotifications.js
halla-mobile/hooks/queries/usePaymentPoll.js
halla-mobile/hooks/queries/usePlans.js
halla-mobile/hooks/queries/useScheduledExtraReminders.js
halla-mobile/hooks/queries/useStaff.js
halla-mobile/hooks/queries/useSubscriptions.js
halla-mobile/hooks/queries/useTaqnyatTemplates.js
halla-mobile/hooks/queries/useTemplates.js
halla-mobile/hooks/queries/useTickets.js
halla-mobile/hooks/queries/useUser.js
halla-mobile/hooks/queries/useVendor.js
halla-mobile/hooks/queries/post-event/useGuestPostEvent.js
halla-mobile/hooks/queries/post-event/useHostPostEvent.js
```

`halla-mobile/hooks/mutations/` remaining files (13 after Phase 4 already removed the 6 event ones):
```
halla-mobile/hooks/mutations/useAddonMutations.js
halla-mobile/hooks/mutations/useAdminMutations.js
halla-mobile/hooks/mutations/useAuthMutations.js
halla-mobile/hooks/mutations/useCheckout.js
halla-mobile/hooks/mutations/useDiscountMutations.js
halla-mobile/hooks/mutations/useGuestMutations.js
halla-mobile/hooks/mutations/useGuestPortal.js
halla-mobile/hooks/mutations/useMessagingMutations.js
halla-mobile/hooks/mutations/useNotificationMutations.js
halla-mobile/hooks/mutations/useStaffMutations.js
halla-mobile/hooks/mutations/useTicketMutations.js
halla-mobile/hooks/mutations/useUserMutations.js
halla-mobile/hooks/mutations/useVendorMutations.js
```
(Contents move to `halla-mobile/hooks/<domain>/{queries,mutations}/` — same code, new home.)

**Phase 7 — duplicate store deletion:**
```
halla-mobile/stores/adminStore.js          (full delete — RQ becomes single source of truth)
```

**Phase 8 — partial deletes / cleanup:**
```
halla-mobile/utils/errorHandler.js                FULL DELETE — verified zero importers; surfaced in §7
halla-mobile/services/adminDashboardService.js   lines ~334-350 (self-marked legacy `addons` block)
halla-mobile/services/notificationService.js     `_legacyToken` parameter (kept-for-compat, ignored
                                                  everywhere — remove after callers audited)
halla-mobile/services/marketplaceService.js:71   `.replace("/api/v2", "")` → extract to
                                                  `getStaticAssetBaseUrl()` helper (refactor, not delete)
halla-mobile/hooks/useDebouncedValue.js          relocated to @halla/shared/utils/useDebounce.js;
                                                  local copy deleted, callers re-pointed (see §7.2, §8.2)
halla-mobile/hooks/useEventActionGate.js         relocated to @halla/shared/hooks/useEventActionGate.js;
                                                  local copy deleted (see §8.3)
```

**Mobile files that explicitly STAY** (platform-specific, no shared analogue):
```
halla-mobile/services/apiClient.js            → renamed to halla-mobile/services/http.js in Phase 8
halla-mobile/services/secureStorage.js        expo-secure-store wrapper (platform-mandated)
halla-mobile/services/authService.js          kept (uses platform-specific storage)
halla-mobile/services/addonsService.js
halla-mobile/services/adminDashboardService.js  kept (clean up legacy block only)
halla-mobile/services/checkoutService.js
halla-mobile/services/dashboardService.js
halla-mobile/services/hostPostEventService.js
halla-mobile/services/locationsService.js
halla-mobile/services/marketplaceService.js
halla-mobile/services/messagingService.js
halla-mobile/services/notificationService.js
halla-mobile/services/plansService.js
halla-mobile/services/postEventService.js
halla-mobile/services/scheduledExtraRemindersService.js
halla-mobile/services/settingsService.js      kept (will share /users/profile + /users/password
                                              logic with vendorService via new userAccountService)
halla-mobile/services/staffService.js
halla-mobile/services/subscriptionService.js
halla-mobile/services/taqnyatTemplatesService.js
halla-mobile/services/templateService.js
halla-mobile/services/ticketsService.js
halla-mobile/services/vendorService.js        kept (same userAccountService pattern)
halla-mobile/stores/authStore.js              kept (uses secureStorage)
halla-mobile/utils/adminPermissions.js
halla-mobile/utils/canvasBake.js              RN-specific
halla-mobile/utils/download.js                RN-specific
halla-mobile/utils/errorHandler.js            kept (thin wrapper over shared ApiError)
halla-mobile/utils/imageUtils.js              RN-specific
halla-mobile/utils/languageStorage.js         AsyncStorage wrapper
halla-mobile/hooks/index.js                   barrel — regenerated after Phase 5
halla-mobile/hooks/useCreateEventForm.js
halla-mobile/hooks/useDebouncedValue.js
halla-mobile/hooks/useEventActionGate.js
halla-mobile/hooks/useFilterData.js
halla-mobile/hooks/useListManager.js
halla-mobile/config/queryClient.js            RQ config
halla-mobile/config/api.js                    retained for API_BASE_URL only after Phase 1
```

---

### A.3 Summary counts

| Side | Files deleted | Files relocated to shared | Files renamed | Folders removed |
|---|---|---|---|---|
| Web (`labbe/`) | ~53 | 4 (`useDebounce`, `useEventActionGate`, `getMediaUrl`, notification presentation helpers) | 1 (`new-backend/apiClient.js` → `http.js`) | 5 |
| Mobile (`halla-mobile/`) | ~38 (incl. `utils/errorHandler.js`) | 2 (`useDebouncedValue`, `useEventActionGate`) | 2 | 3 |
| **Total** | **~91 files** | **6 relocations to shared** | **3 renames** | **8 folders** |

**To create:**
- `D:\halla\shared\package.json`
- `D:\halla\shared\src\api\paths.js`
- `D:\halla\shared\src\api\transport.js`
- `D:\halla\shared\src\schemas\*` (one file per domain — auth, events, guests, tickets, plans, addons, staff, vendors, post-event, settings, notifications, admin)
- `D:\halla\shared\src\errors\index.js`
- `D:\halla\shared\src\constants\index.js`
- `D:\halla\shared\src\utils\{locale,date,direction,event-form,xlsx,media,notification,useDebounce}.js`
- `D:\halla\shared\src\hooks\useEventActionGate.js`
- `D:\halla\labbe\services\http.js` (axios adapter implementing `Transport`)
- `D:\halla\halla-mobile\services\http.js` (fetch adapter implementing `Transport`)
- `D:\halla\halla-mobile\screens\auth\ResetPasswordScreen.js` *(Phase 4b)*
- `D:\halla\.github\workflows\labbe.yml`, `D:\halla\.github\workflows\halla-mobile.yml`, `D:\halla\.github\workflows\labbe-backend.yml` *(Phase 0b)*
- `D:\halla\ARCHITECTURE.md` (final state documentation)

**To restructure (no semantic change, just relocation):**
- All `labbe/hooks/reactQueryHooks/*` → `labbe/hooks/<domain>/{queries,mutations}/`
- All `halla-mobile/hooks/queries/*` and `halla-mobile/hooks/mutations/*` → `halla-mobile/hooks/<domain>/{queries,mutations}/`

---

## Appendix B — Shared package: concrete layout + sample files

This is what `D:\halla\shared\` looks like after Phase 1 finishes. Plain JS, no transpile step.

```
D:\halla\shared\
├── package.json                    { "name": "@halla/shared", "main": "src/index.js", "exports": {...} }
├── src/
│   ├── index.js                    barrel — re-exports schemas/api/errors/constants/utils
│   │
│   ├── schemas/                    rewritten to mirror backend validation files
│   │   ├── _shared.js              saudiPhone, email, requiredString, password (primitives)
│   │   ├── auth.js                 login, signup, otp, forgotPassword, resetPassword, ...
│   │   ├── events.js               createEvent, guest, staff, eventSettings, ...
│   │   ├── tickets.js              createTicket, ticketRating
│   │   ├── plans.js                planSelect, checkout, addon
│   │   ├── vendor.js               vendorProfile, vendorService
│   │   ├── admin.js                addHost, addModerator, addService
│   │   ├── post-event.js           guestValidate, comment
│   │   ├── settings.js             accountSettings, notificationPreferences
│   │   └── index.js                barrel
│   │
│   ├── api/
│   │   ├── paths.js                API_PATHS (frozen)
│   │   ├── contracts.js            (optional) endpoint → { method, requestSchema, responseSchema } map
│   │   └── transport.js            Transport interface (JSDoc-typed)
│   │
│   ├── errors/
│   │   ├── ApiError.js             class ApiError extends Error with code/status/meta/reason/i18nKey
│   │   └── errorCodeMap.js         { "OTP_COOLDOWN": "errors.otp.cooldown", ... }  ~80 codes
│   │
│   ├── constants/
│   │   ├── roles.js                USER_ROLES, ADMIN_PAGES, ACCESS_LEVELS
│   │   ├── plans.js                PLAN_TIERS, ADDON_KINDS
│   │   ├── eventStatus.js          EVENT_STATUSES, GUEST_STATUSES, TICKET_STATUSES
│   │   └── index.js                barrel
│   │
│   └── utils/
│       ├── locale.js               getLocalized(obj, lang), isRTL(lang)
│       ├── direction.js            DirectionUtils helpers
│       ├── date.js                 formatDate, formatTime, parseTemplateDate
│       ├── eventForm.js            transformFormDataToPayload, validateListItem, processImportedCSV
│       ├── xlsx.js                 xlsx export helpers
│       └── index.js                barrel
```

### Sample — `src/schemas/_shared.js`
```js
import { z } from "zod";

// Mirrors labbe-backend-/src/modules/auth/auth.validation.js#phoneNumber
export const saudiPhone = z
  .string()
  .trim()
  .regex(/^(\+966|966|0)?5\d{8}$/, "validation.invalidSaudiPhone");

export const email = z
  .string()
  .trim()
  .toLowerCase()
  .email("validation.invalidEmail");

export const requiredString = z.string().trim().min(1, "validation.required");

export const password = z
  .string()
  .min(8, "validation.passwordMinLength")
  .regex(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "validation.passwordComplexity");
```

### Sample — `src/schemas/events.js`
```js
import { z } from "zod";
import { saudiPhone, email, requiredString } from "./_shared.js";

// Mirrors labbe-backend-/src/modules/events/events.validation.js#guestEntry
export const guestSchema = z.object({
  id: z.number().optional(),
  name: requiredString.max(120),
  phone: saudiPhone,                          // required (matches backend)
  email: email.optional().or(z.literal("")),  // optional (matches backend)
});

export const createEventSchema = z.object({
  eventDetails: z.object({ /* mirrors backend */ }),
  guestList: z.array(guestSchema).min(1),
  staffList: z.array(staffSchema).optional(),
  /* ... full shape mirrors labbe-backend-/.../events.validation.js#createEvent */
});
```

### Sample — `src/api/paths.js`
```js
// Lifted verbatim from labbe/services/new-backend/api.config.js, frozen.
export const API_PATHS = Object.freeze({
  auth: Object.freeze({
    login: "/auth/login",
    signup: "/auth/signup",
    forgotPassword: "/auth/forgot-password",
    resetPassword: (token) => `/auth/reset-password/${token}`,
    refresh: "/auth/refresh",
    logout: "/auth/logout",
  }),
  events: Object.freeze({
    list: "/events",
    byId: (id) => `/events/${id}`,
    create: "/events",
    update: (id) => `/events/${id}`,
    updateStaff: (eventId, staffId) => `/events/${eventId}/staff/${staffId}`,
    // ... ~460 paths total
  }),
  // ...
});
```

### Sample — `src/errors/ApiError.js`
```js
import { errorCodeMap } from "./errorCodeMap.js";

export class ApiError extends Error {
  constructor({ message, code, status, meta, reason }) {
    super(message);
    this.name = "ApiError";
    this.code = code;        // backend code, e.g., "OTP_COOLDOWN"
    this.status = status;    // HTTP status
    this.meta = meta;        // backend meta payload (cooldown ms, etc.)
    this.reason = reason;    // for 410 Gone revoked-token responses
  }
  get i18nKey() {
    return errorCodeMap[this.code] ?? "errors.unknown";
  }
}
```

### Sample — `src/api/transport.js`
```js
/**
 * @typedef {Object} TransportRequest
 * @property {"GET"|"POST"|"PATCH"|"PUT"|"DELETE"} method
 * @property {string} path                                  resolved from API_PATHS
 * @property {unknown|FormData} [body]
 * @property {Record<string, string|number|boolean>} [query]
 * @property {Record<string, string>} [headers]
 * @property {string} [idempotencyKey]
 * @property {number} [timeoutMs]
 * @property {AbortSignal} [signal]
 */

/**
 * @typedef {Object} Transport
 * @property {<T>(opts: TransportRequest) => Promise<T>} request
 */

// Each app implements this interface; shared never instantiates it.
export {};
```

### Sample — `package.json`
```json
{
  "name": "@halla/shared",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "src/index.js",
  "exports": {
    ".":            "./src/index.js",
    "./schemas":    "./src/schemas/index.js",
    "./schemas/*":  "./src/schemas/*.js",
    "./api/paths":  "./src/api/paths.js",
    "./api/*":      "./src/api/*.js",
    "./errors":     "./src/errors/ApiError.js",
    "./constants":  "./src/constants/index.js",
    "./utils":      "./src/utils/index.js",
    "./utils/*":    "./src/utils/*.js"
  },
  "dependencies": { "zod": "^3.x" }
}
```

Both apps import like:
```js
import { createEventSchema, guestSchema } from "@halla/shared/schemas/events";
import { API_PATHS } from "@halla/shared/api/paths";
import { ApiError } from "@halla/shared/errors";
import { USER_ROLES } from "@halla/shared/constants";
```

---

## Appendix C — Verification log

These claims were code-verified during the 2026-05-26 revision pass. When implementation starts, treat anything **not** in this list as needing re-verification before action.

| Claim | Status | Evidence |
|---|---|---|
| Web has two HTTP clients; legacy still consumed by 3 services | VERIFIED | `labbe/services/{notification.js:6, staff.js:11, adminDashboard.js:7}` all import the legacy `apiClient` |
| `API_PATHS` registry at `labbe/services/new-backend/api.config.js`, ~460 endpoints | VERIFIED | 487 lines, ~27 top-level domains |
| Mobile lacks an `API_PATHS` equivalent | VERIFIED | `halla-mobile/config/api.js` has a flat `ENDPOINTS` map; services build paths inline |
| Web has three parallel hook trees | VERIFIED | `labbe/hooks/{events, queries+mutations, reactQueryHooks}/` all coexist; `reactQueryHooks/useEvents.js` is 7-line façade |
| Mobile fragmented events service (8 files + façade) | VERIFIED | Files enumerated; `eventsService2.js` is a re-export façade |
| Mobile has 6 overlapping `useEvent*Mutations.js` files | VERIFIED | `useEventMutations.js` re-exports from the other 5 |
| Mobile `adminStore.js` duplicates RQ cache | VERIFIED | Stores `hosts/moderators/vendors/events/tickets/payments` Zustand state that already lives in RQ |
| Web `notificationStore.js` uses manual `setInterval` polling (30s) | VERIFIED | `stores/notificationStore.js:248-250` |
| Legacy `addons` block in `adminDashboardService.js` lines 334-350 | VERIFIED | Self-marked "Legacy: prefer …" |
| `labbe/staticData/events/data.js` orphaned | VERIFIED | `grep` for `staticData/events/data` returns zero importers |
| `phoneValidation.js` duplicates `authSchema.js` regex | VERIFIED | Both contain the same 9/10/11-digit Saudi-phone patterns |
| `marketplaceService.js:71` strips `/api/v2` for asset URLs | VERIFIED | Legitimate; consider extracting helper |
| `vendorService` and `settingsService` both hit `/users/profile` + `/users/password` | VERIFIED | `vendorService.js:{87,94,101}` and `settingsService.js:{18,27,35}` |
| Backend envelope: ~214 routes use `sendSuccess`, ~18 ad-hoc | VERIFIED | Helper at `labbe-backend-/src/shared/utils/responseHelper.js` emits both `success` + `status` |
| Mobile event-create routing per-role | VERIFIED-CORRECT | `halla-mobile/screens/common/CreateEventScreen.js:30-46` — host → `useCreateEvent` → `/events`; non-host → `useCreateEventForHost` → `/admin/events/create-for-host` |
| Staff update method — web/mobile/backend all PUT | VERIFIED-CONSISTENT | Backend `events.routes.js:725` PUT; mobile `eventsService.staff.js:53` PUT; web `useEventStaffMutation.js:49` PUT |
| Mobile has test-message and retry-launch UI wired | VERIFIED-PRESENT | `TestMessageModal.js` + `EventFailureBanner.js`, hooks in `useMessagingMutations.js` |
| Mobile lacks reset-password completion screen | VERIFIED-GAP | `resetPasswordAPI()` exists in `authService.js:466-476` but no screen/deep-link consumer found |
| Stack is JS-only (team decision) | DECIDED | All packages stay JS; `tsconfig.json` in mobile is dormant and not enforced |
| No CI for web/backend; mobile has `eas.json` only | VERIFIED | No `.github/workflows/`, no `vercel.json` deploy config in either app |
| All three apps use npm (package-lock.json), no yarn/pnpm lockfiles | VERIFIED | Lockfile-only check |
| Web also exists as JS with `jsconfig.json` (no TS) | VERIFIED | `labbe/jsconfig.json` is path-alias-only |

| Web has a complete reset-password page | VERIFIED — at `/change-password?token=…` | `labbe/app/[lang]/(auth-layout)/change-password/page.js` + `labbe/ui/auth/change-password/ChangePassword.js` (reads `token` from query string, submits via `useAuthMutation("resetPassword")`) |
| Web has a notifications RQ hook tree (so the Zustand store bypass is "two sources of truth," not "missing hook") | VERIFIED | `labbe/hooks/reactQueryHooks/useNotifications.js` defines `useNotifications`, `useUnreadNotificationCount` (30 s `refetchInterval`), `useNotification`, `useNotificationMutation` |

**Not re-verified in this pass (treat as assumed; verify before acting):**
- Exact endpoint count "~460" — based on previous draft's stated count, not recounted here.
- The ~15 "byte-identical" parity flows not specifically named in §1.5 verifications (host signup, vendor signup, event wizard steps, plans+checkout, etc.) were not re-traced in this pass; carried forward from prior trace.
- Specific i18n key gaps in `errors.json` — Phase 2 will surface these.
- Bundler-resolution behavior (Metro + Next.js) — Phase 0a spike will surface this.
- Backend single-resource data shape inventory (`{ event }` vs `{ user }` vs raw) — Phase 1 schema work will surface this.
