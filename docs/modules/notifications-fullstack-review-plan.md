# Notifications — Full-Stack Review Plan

**Module:** notifications
**Generated:** 2026-05-07
**Prompt:** docs/implementation/MODULE_FULLSTACK_REVIEW_PROMPT.md
**Status:** Awaiting green light · NOT IMPLEMENTED YET

---

## 0. Executive Summary

- **9 routes** + **1 orphan controller method** (no matching route) in the module
- **0 backend file-size violations** inside the module folder (service: 407, routes: 285, controller: 169)
- **1 adjacent-but-out-of-module file-size violation:** `shared/utils/notificationService.js` (1068 lines, cap 300)
- **2 backend Swagger drift findings** (incomplete `type` enum on list, missing `isRead` query param, missing detailed schemas on send/broadcast)
- **2 backend validation gaps** (`POST /send` and `POST /broadcast` accept untyped body)
- **3 backend audit-log / consistency gaps** (no audit on `/send`, bulk paths skip pre-save mirror, console.error swallows in service)
- **3 web data-path duplicates for the same job** (`useNotifications.js` React Query hook + `notificationStore.js` Zustand + legacy `services/notification.js`) — B0.2 violation
- **1 web file-size violation** (`stores/notificationStore.js` 321 lines)
- **8 web hardcoded `/notifications` paths** in `services/adminDashboard.js` (not via `API_PATHS`)
- **~25 web hardcoded user-facing strings** in `SendNotificationPopup.js`
- **3 web missing error states** (NotificationDropdown, NotificationBell polling, NotificationPreferences)
- **1 mobile file-size violation** (`SendNotificationModal.js` 444 lines)
- **1 mobile direct-service-call bypassing canonical hook** (`SettingsNotifications.js`)
- **2 mobile hardcoded paths** (`adminDashboardService.js:112`, `App.js:66` push-token registration)
- **3 backend phase-marker comment blocks to remove** (`FLOW-27-F01`, `FLOW-27-F04`, `TENANT-F03`)
- **0 web/mobile field divergences** on the canonical `GET /notifications` shape (both read `data.notifications`, `data.pagination`, `data.unreadCount`)
- **Estimated effort:** **M** (web data-path consolidation + popup i18n are the bulk; backend changes are small)

---

## 0.1 Locked Decisions (user-confirmed 2026-05-08)

1. **Orphan `deleteAllRead`** → **DELETE** the controller method. No route, no consumer.
2. **`NotificationModel.toClientJSON` vs service `_formatNotification`** → keep exactly one. Verify via grep before deleting; if `toClientJSON` has zero importers (current evidence: none), **delete `toClientJSON`** and keep `_formatNotification` as the canonical formatter. If grep shows a live consumer, keep that one and delete the other.
3. **Locale namespace** for the SendNotificationPopup keys → **`adminNotifications.*`** (e.g. `adminNotifications.role.host`, `adminNotifications.success.toAll`). Section 8 keys re-namespaced accordingly.
4. **Unread-count poll cadence** → **unified at 60 seconds** on both web (`useUnreadNotificationCount`) and mobile (`useUnreadCount`). Compromise between web's current 30 s freshness and mobile's 2 min battery target. No per-platform divergence.
5. **`services/adminDashboard.js` admin send/broadcast wrappers (8 callers)** → **delete the wrapper functions** (`hostsAPI.sendNotification`, `hostsAPI.notifyAll`, `moderatorsAPI.*`, `whitelabelAPI.*`, `vendorsAPI.*` send/notifyAll). Migrate every caller to `useNotificationMutation('adminSend' | 'adminBroadcast')` directly. No `API_PATHS`-only retrofit.
6. **Out-of-PR followups** → confirmed out of scope: split `shared/utils/notificationService.js` (1068 lines), reconcile `_shouldSendEmail` with `NOTIFICATION_TYPE_TO_PREFERENCE`, implement push delivery, fix `useNotificationSettings` fallback chain (cross-module). Listed in §7.E only.
7. **Validation library** → **Zod via `validateZod` middleware** (`shared/middleware/validation.js:373`). No Joi. All references to "Joi" / generic `validate(schema)` in this plan mean Zod schemas + `validateZod`.
8. **Rate limiting on `/send` and `/broadcast`** → **SKIP**. RBAC (ADMIN / SUPER_ADMIN) is the gate.

---

## 1. Endpoint Inventory

Module mounted at `/api/v2/notifications` (see `src/app.js:25, 214`).

| # | Method | Path | Controller | Service | Middleware | Swagger | Web hook | Mobile hook | Status |
|---|--------|------|------------|---------|------------|---------|----------|-------------|--------|
| 1 | GET | /notifications/unread-count | getUnreadCount | getUnreadCount | protect | OK | useUnreadNotificationCount + Zustand fetchUnreadCount | useUnreadCount | KEEP |
| 2 | PATCH | /notifications/read-all | markAllAsRead | markAllAsRead | protect | OK | useNotificationMutation('markAllAsRead') + Zustand markAllAsRead | useMarkAllAsRead | KEEP |
| 3 | DELETE | /notifications/clear-all | clearAllNotifications | clearAllNotifications | protect | OK | useNotificationMutation('clearAll') + Zustand clearAll | useClearAllNotifications | KEEP |
| 4 | GET | /notifications | getNotifications | getUserNotifications | protect | DRIFT (incomplete type enum, missing isRead) | useNotifications + Zustand fetchNotifications | useNotifications (infinite) | KEEP |
| 5 | GET | /notifications/:id | getNotification | getNotification | protect, validateObjectId | OK | useNotification | (none — verify need) | KEEP |
| 6 | DELETE | /notifications/:id | deleteNotification | deleteNotification | protect, validateObjectId | OK | useNotificationMutation('deleteNotification') + Zustand deleteNotification | useDeleteNotification | KEEP |
| 7 | PATCH | /notifications/:id/read | markAsRead | markAsRead | protect, validateObjectId | OK | useNotificationMutation('markAsRead') + Zustand markAsRead | useMarkAsRead | KEEP |
| 8 | POST | /notifications/send | sendNotification | sendToUsers | protect, restrictTo(ADMIN, SUPER_ADMIN) | DRIFT (body schema lists only userIds/title/message; controller actually accepts titleAr, messageAr, type, data) | useNotificationMutation('adminSend') + direct apiRequest in `SendNotificationPopup.js` + adminDashboard.js (4 hardcoded callers) | useSendNotification + adminDashboardService.js (1 hardcoded caller) | KEEP |
| 9 | POST | /notifications/broadcast | broadcastNotification | broadcast | protect, restrictTo(ADMIN, SUPER_ADMIN) | DRIFT (body schema lists only role/title/message; controller accepts titleAr, messageAr, type, whitelabelId) | useNotificationMutation('adminBroadcast') + direct apiRequest in `SendNotificationPopup.js` + adminDashboard.js (4 hardcoded callers) | useBroadcastNotification | KEEP |
| — | DELETE | /notifications/read | deleteAllRead | deleteAllRead | — (no route) | — | — | — | **ORPHAN CONTROLLER — DELETE method or add route** |

**Note on RBAC.** No `ADMIN_PAGES.NOTIFICATIONS` constant exists in `shared/constants/`; per A4.2 (`requirePageAccess` is for page-scoped admin routes, `restrictTo` is for non-page-scoped roles), `restrictTo(ROLES.ADMIN, ROLES.SUPER_ADMIN)` is the correct gate. **Not flagged.**

---

## 2. Backend Findings

### 2.1 File-size violations (inside module folder)

None. (`notifications.routes.js` 285/400, `notifications.controller.js` 169/300, `notifications.service.js` 407/600.)

### 2.2 Swagger drift

- **`GET /notifications` — `type` enum is wrong.** `notifications.routes.js:99-102` lists `[system, event, guest, message, ticket, subscription]`, but `NotificationModel.js:13-67` defines 30+ specific values (`event_created`, `guest_rsvp_accepted`, `payment_failed`, etc.). Either reference the model's enum (or a `NotificationType` schema in `config/swagger.js`) or remove the enum and document in `description`.
- **`GET /notifications` — missing `isRead` query parameter.** Service at `notifications.service.js:188-190` reads `filters.isRead`. The Swagger block declares only `page`, `limit`, `type`. Add `isRead: { type: boolean }` to parameters.
- **`POST /notifications/send` — request body schema incomplete.** `notifications.routes.js:218-241` lists only `userIds, title, message`. Controller at `notifications.controller.js:117-118` accepts `userIds, title, titleAr, message, messageAr, type, data`. Update Swagger body schema to match (validation enforced via Zod — see 2.6).
- **`POST /notifications/broadcast` — request body schema incomplete.** `notifications.routes.js:255-269` lists only `role, title, message`. Controller at `notifications.controller.js:136-138` accepts `role, title, titleAr, message, messageAr, type, whitelabelId`. Update.
- **`POST /notifications/send` & `/broadcast` — response schemas missing.** Both block end with a generic `200: description: …`. Add a `data: { sentCount: integer }` response shape.
- **Schemas reused.** `Notification` and `Pagination` schemas both exist in `config/swagger.js` (lines 496, 1009). `$ref` usage is valid.

### 2.3 Missing middleware / safeguards

- **`POST /notifications/send` lacks audit log.** `notifications.controller.broadcastNotification` writes `logAudit({ action: 'notification.broadcast', … })` (controller:156-165) but `sendNotification` (controller:117-130) writes none. Add a parallel `logAudit({ action: 'notification.send', … })` with `recipientCount: result?.sentCount` and the `userIds` length.
- **`POST /notifications/send` & `/broadcast` lack rate limiting.** **LOCKED: skip.** RBAC (ADMIN / SUPER_ADMIN) is the gate. No change.
- **No idempotency on bulk paths.** `notifications.service.sendToUsers` (line 322) and `broadcast` (line 337) use `Notification.insertMany(...)` with no idempotency key. Single-user path uses `withIdempotency` (line 149). Probably intentional for bulk admin actions, but document the asymmetry in §6.

### 2.4 Duplicate / dead endpoints

- **`exports.deleteAllRead` controller method has no route.** `notifications.controller.js:84-88` defines a handler, but `notifications.routes.js` never mounts `DELETE /notifications/read`. **LOCKED: delete the controller method.** No consumer in web or mobile.

### 2.5 Service / controller violations

- **`notifications.service.js:52, 62, 94, 223, 284, 297, 313, 330` — `console.error` swallows in catch blocks.** Per A2.4 / A3.2, let `globalErrorHandler` handle. Specifically:
  - line 52: email send failure — keep as `logger.warn` since this path intentionally swallows (best-effort delivery), but switch from `console.error` to `shared/utils/logger`.
  - line 62: deliveryStatus writeback — same — switch to `logger.warn`.
  - line 94: `sendToAdmins` per-recipient catch — switch to `logger.warn`.
  - The shared `shared/utils/notificationService.js` has 11 more `console.error` calls (lines 223, 284, 297, 313, 330, 348) — see 2.5 cross-cutting note below.
- **`_formatNotification` (service:371) duplicates `NotificationModel#toClientJSON` (model:309).** **LOCKED: keep `_formatNotification`, delete `toClientJSON`** (returns both languages so client picks via i18n; current grep shows zero importers of `toClientJSON`). If implementation-time grep finds a live consumer of `toClientJSON`, keep that one and delete `_formatNotification` instead — single canonical formatter is the invariant.
- **Service-layer reads do not use `.lean()`** in `getUserNotifications` (line 196) and `getNotification` (line 304). They feed into `_formatNotification` which only reads plain fields, so `.lean()` is safe. Add it.
- **Controller imports `ROLES` and `logAudit`** (`notifications.controller.js:13-14`). Once the planned audit-log addition (2.3) lands, both stay used. Currently `ROLES` is used at line 142 — fine.

### 2.6 Validation gaps

No `notifications.validation.js` file exists. Required additions (**Zod only** — wire via `validateZod(schema)` from `shared/middleware/validation.js:373`):

- **`sendNotificationSchema`** — `userIds: z.array(z.string().regex(objectIdRegex)).min(1).max(1000)`, `title: z.string().min(1).max(200)`, `titleAr: z.string().max(200).optional()`, `message: z.string().min(1).max(1000)`, `messageAr: z.string().max(1000).optional()`, `type: z.enum([...NOTIFICATION_TYPES]).default('custom')`, `data: z.record(z.any()).optional()`.
- **`broadcastNotificationSchema`** — `role: z.enum([...ROLES]).optional()`, `whitelabelId: z.string().regex(objectIdRegex).optional()`, `title`, `titleAr`, `message`, `messageAr`, `type: z.enum([...NOTIFICATION_TYPES]).default('announcement')`.
- Wire via `validateZod(schema)` middleware on the route. **No Joi.**

### 2.7 Comment hygiene

Remove or de-marker (`shared/utils/auditLog`-style — no FLOW/PHASE/W0/TENANT/BUG markers):

- `notifications.service.js:32` — `// FLOW-27-F04: …` (block comment 4 lines) — convert to plain explanatory comment about why deliveryStatus writeback is best-effort, or remove if the line above already conveys it.
- `notifications.service.js:128` — `// FLOW-27-F01: idempotency guard via withIdempotency utility.` — the JSDoc already explains; strip the marker.
- `notifications.controller.js:140` — `// TENANT-F03: non-SUPER_ADMIN users can only broadcast within their own tenant` — keep the explanation, drop the marker.

### 2.5b Adjacent-but-out-of-module finding (informational)

`shared/utils/notificationService.js` is 1068 lines (cap 300 per A8). It defines `NotificationService` with ~30 domain-specific helpers (`notifyEventCreated`, `notifyGuestRSVP`, `notifyTicketCreated`, etc.). **Out of scope for this module review** but flagged for the user's awareness — propose splitting into `shared/utils/notifications/{event,guest,subscription,ticket,vendor,user,admin,announcement}.notifier.js` in a separate refactor.

---

## 3. Frontend Web Findings

### 3.1 Component tree per page / surface

Notifications surface on web is split across:

- **Header bell (global, present on all dashboards)**
  - `ui/layout/header/Header.js` (145 lines) — renders `<NotificationBell/>` at line 99.
  - `ui/layout/notifications/NotificationBell.js` (115 lines) — consumes Zustand `useNotificationStore` (lines 24-25).
  - `ui/layout/notifications/NotificationDropdown.js` (178 lines) — consumes Zustand store; calls `fetchNotifications`, `markAsRead`, `clearAll`.
  - `ui/layout/notifications/NotificationItem.js` (168 lines).
  - `ui/layout/notifications/NotificationEmpty.js` (32 lines).
- **Settings — notification preferences (under `/users/notification-preferences`, a different module — out of scope)**
  - `app/[lang]/host/settings/page.js` (93 lines)
  - `app/[lang]/vendor-dashboard/settings/page.js` (239 lines)
  - `app/[lang]/admin-dash/settings/_components/AdminSettingsClient.js` (77 lines)
  - `ui/settings/notificationsPrefrences/NotificationPreferences.js` (208 lines)
- **Admin send/broadcast popup**
  - `ui/admin/SendNotificationPopup/SendNotificationPopup.js` (161 lines).
- **Hooks / state**
  - `hooks/reactQueryHooks/useNotifications.js` (161 lines) — canonical React Query layer.
  - `stores/notificationStore.js` (321 lines, **VIOLATION**) — Zustand layer that calls the legacy service directly.
  - `services/notification.js` (229 lines) — legacy axios service used only by the Zustand store; hardcoded ENDPOINTS (lines 12-21).

### 3.2 File-size violations

- **`stores/notificationStore.js` — 321 lines** (cap 250). However, the right move is **delete the store entirely** (see 3.5) once the bell/dropdown migrate to React Query hooks; splitting is wasted work.

### 3.3 Hardcoded text / data / paths

**Hardcoded user-facing text in `ui/admin/SendNotificationPopup/SendNotificationPopup.js`:**

| Line | Literal | Replace with |
|------|---------|---------------|
| 26-32 | role labels object (`super_admin: { en: 'Super Admins', ar: 'المشرفون الرئيسيون' }`, etc.) | `t("adminNotifications.role.<role>")` lookup or move to a locale section |
| 66 | "تم إرسال الإشعار لجميع المستخدمين" / "تم إرسال الإشعار بنجاح" | `t("adminNotifications.success.toAll")` / `t("adminNotifications.success.toUser")` |
| 67 | "Notification sent to all users" / "Notification sent successfully" | (same keys, English values) |
| 72 | "فشل في إرسال الإشعار" / "Failed to send notification" | `t("adminNotifications.error.failed")` |
| 85-86 | `\`إرسال إشعار لجميع ${roleLabels[targetRole]}\`` | `t("adminNotifications.titleBroadcast", { role })` |
| 87 | "إرسال إشعار" / "Send Notification" | `t("adminNotifications.titleSingle")` |
| 104-105 | "العنوان (عربي) *" + Arabic placeholder | `t("adminNotifications.fields.titleAr.label")` + `.placeholder` |
| 111-112 | "العنوان (إنجليزي)" + placeholder | `t("adminNotifications.fields.titleEn.label")` + `.placeholder` |
| 117-118 | "الرسالة (عربي) *" + placeholder | `t("adminNotifications.fields.messageAr.label")` + `.placeholder` |
| 124-125 | "الرسالة (إنجليزي)" + placeholder | `t("adminNotifications.fields.messageEn.label")` + `.placeholder` |
| 134-135 | broadcast warning text | `t("adminNotifications.broadcastWarning", { role })` |
| 142 | "إلغاء" / "Cancel" | `t("common.cancel")` |
| 150 | "إرسال" / "Send" | `t("common.send")` |

(Add the keys to §8; do not edit locale JSON without approval.)

**Hardcoded API paths (NOT via `API_PATHS`):**

- `services/adminDashboard.js:270` — `/notifications/send` (`hostsAPI.sendNotification`)
- `services/adminDashboard.js:277` — `/notifications/broadcast` (`hostsAPI.notifyAll`)
- `services/adminDashboard.js:370` — `/notifications/send` (`moderatorsAPI.sendNotification`)
- `services/adminDashboard.js:377` — `/notifications/broadcast` (`moderatorsAPI.notifyAll`)
- `services/adminDashboard.js:474` — `/notifications/send` (`whitelabelAPI.sendNotification`)
- `services/adminDashboard.js:481` — `/notifications/broadcast` (`whitelabelAPI.notifyAll`)
- `services/adminDashboard.js:590` — `/notifications/send` (`vendorsAPI.sendNotification`)
- `services/adminDashboard.js:597` — `/notifications/broadcast` (`vendorsAPI.notifyAll`)

Replace each with `API_PATHS.notifications.sendNotification` / `API_PATHS.notifications.broadcastNotification`.

**Hardcoded ENDPOINTS in legacy service** `services/notification.js:12-21` — moot once the file is deleted (see 3.5).

### 3.4 Data mapping bugs / fallback chains

- **No fallback chains found** in `useNotifications.js` — `apiRequest` returns the response directly; consumers read `data?.data?.notifications`, `data?.data?.pagination`, `data?.data?.unreadCount` from the JSON object. Verified shape matches backend `_formatNotification` + `sendSuccess` shape.
- **`stores/notificationStore.js:78` reads `response.data.notifications`** — same shape, correct. (But the store will be deleted, so this becomes moot.)

### 3.5 Duplicate hooks / direct apiRequest calls — **B0.2 violation, three parallel data paths**

For the same six endpoints (1–7 in §1) the web has:

1. **Canonical:** `hooks/reactQueryHooks/useNotifications.js` — React Query, used by … nothing in the current Header/dropdown surface. This was the planned canonical layer but was not adopted.
2. **Zustand + legacy service:** `stores/notificationStore.js` calls `services/notification.js` axios wrappers. Used by `NotificationBell.js` (lines 24-25, 33-39) and `NotificationDropdown.js` (lines 25-35, 39, 43-77).
3. **Direct `apiRequest`:** `ui/admin/SendNotificationPopup/SendNotificationPopup.js:51-61` calls `apiRequest` with `API_PATHS.notifications.sendNotification` / `…broadcastNotification` instead of using the `useNotificationMutation('adminSend' / 'adminBroadcast')` hooks that already exist.
4. **Hardcoded paths:** `services/adminDashboard.js` (8 instances, listed in 3.3).

**Resolution (per B0.2):**

- Make `useNotifications.js` the single source of truth.
- Migrate `NotificationBell.js` to `useUnreadNotificationCount()` (already provides 30s `refetchInterval` matching the Zustand polling cadence).
- Migrate `NotificationDropdown.js` to `useNotifications({ page, limit })` + `useNotificationMutation('markAsRead' | 'markAllAsRead' | 'deleteNotification' | 'clearAll')`. Pagination becomes the `page` param. Load-more = increment page and merge via React Query's `placeholderData: keepPreviousData` — or convert to `useInfiniteQuery` if true infinite scroll is needed (current dropdown UX appears to use a "Load more" button, so paginated `useNotifications` fits cleanly).
- Migrate `SendNotificationPopup.js` to `useNotificationMutation('adminSend' / 'adminBroadcast')`.
- Migrate the 8 `services/adminDashboard.js` callers — these are wrappers that take `(token, hostId, notificationData)` and POST. The simplest move is to delete those wrapper functions and have callers use `useNotificationMutation('adminSend')` directly. Greppable callers: Step 7.B will grep `hostsAPI.sendNotification`, `moderatorsAPI.sendNotification`, etc., and replace.
- Delete `stores/notificationStore.js` and `services/notification.js` after all consumers move.

### 3.6 State / loading / error gaps

- **`NotificationDropdown.js`** — has `isLoading` (line 132-135) and empty state (line 136-137); `error` from store is never rendered. Add an error block (translated, with retry).
- **`NotificationBell.js`** — silent on polling errors. Add a small error indicator OR rely on the global error toast. Recommend: silent in bell, log to `logger`, no UI change (matches "background poll" UX).
- **`NotificationPreferences.js`** — no error rendering when `useNotificationPreferences` fails. Add `if (error) return <ErrorFallback/>`.
- **`SendNotificationPopup.js`** — uses `toast.error` (line 71-72) directly, including hardcoded message. Migrate to `handleError(error, t, { fallbackMessage: "adminNotifications.error.failed" })` per B8.

### 3.7 Comment hygiene

No `// FLOW-`, `// PHASE-`, `// FE-`, `// BUG-` markers found in the notification surface files. Clean.

---

## 4. Frontend Mobile Findings

### 4.1 Screen → component tree

| File | Lines | Role |
|------|-------|------|
| `screens/common/NotificationsScreen.js` | 282 | List screen with infinite scroll, mark/delete/clear |
| `screens/host/NotificationSettingsScreen.js` | 49 | Host preferences |
| `screens/host/HomeScreen.js` | 211 | Renders `NotificationBell` |
| `screens/vendor/VendorHomeScreen.js` | 345 | Renders `NotificationBell` |
| `screens/admin/admin-dashboard/AdminNotificationSettingsScreen.js` | 47 | Admin preferences |
| `screens/admin/admin-dashboard/AdminSettingsScreen.js` | 67 | Settings hub |
| `components/notifications/NotificationItem.js` | 246 | List item + EmptyState + LoadMoreFooter |
| `components/notifications/NotificationBell.js` | 60 | Badge in headers |
| `components/settings/NotificationSettings.js` | 322 | Host prefs form |
| `components/admin-dashboard/settings/AdminNotificationSettings.js` | 290 | Admin prefs form |
| `components/admin-dashboard/settings/SettingsNotifications.js` | 122 | Inline admin panel — **bypasses hooks (see 4.3)** |
| `components/admin-dashboard/notifications/SendNotificationModal.js` | 444 | **VIOLATION cap=350** — admin send/broadcast modal |
| `components/admin-dashboard/hosts/HostActions.js` | 70 | Trigger for SendNotificationModal |

### 4.2 File-size violations

- **`components/admin-dashboard/notifications/SendNotificationModal.js` — 444 lines** (cap 350). Proposed split: extract `<SendNotificationForm/>` (the form fields + validation), `<SendNotificationActions/>` (submit / cancel buttons), and a `useSendNotificationForm` hook for state. **Style preservation:** every `StyleSheet.create({...})` value must be moved verbatim to the extracted components — no rounding or renaming. The bilingual title/message field pattern repeats — extract a `<BilingualField label, labelAr, value, valueAr, …/>` reusable inside the modal's CSS.

### 4.3 Service / hook violations

- **`components/admin-dashboard/settings/SettingsNotifications.js:19, 44`** — calls `getNotificationPreferencesAPI(token)` / `updateNotificationPreferencesAPI(updated, token)` directly from a component. C2 forbids direct service calls in components. Migrate to `useNotificationSettings()` (already in `hooks/queries/useUser.js`) + `useUpdateNotificationSettings()` (already in `hooks/mutations/useUserMutations.js`).
- **`services/notificationService.js`** retains a `_legacyToken` parameter on every export (line 16 docstring: "ignored; kept for caller compatibility"). Per C1 the parameter must be dropped when the next consumer touches the function. Concretely:
  - `getNotifications(_legacyToken, filters)` → `getNotifications(filters)`
  - `getUnreadCount(_legacyToken)` → `getUnreadCount()`
  - `markAsRead(_legacyToken, id)` → `markAsRead(id)` — etc.
  - Update callers in `hooks/queries/useNotifications.js` and `hooks/mutations/useNotificationMutations.js`.
- **`hooks/queries/useUser.js#useNotificationSettings`** mapping `data?.preferences || data || response` (fallback chain). Per C3 / B0.1 / D3, pick the actual backend shape and drop the chain. (Verify `/users/notification-preferences` response shape — out of this module's scope but list as a cross-module followup.)

### 4.4 Hardcoded text / data / paths

- **Hardcoded paths:**
  - `services/adminDashboardService.js:112` — `apiRequest("/notifications/send", "POST", token, …)` → use `ENDPOINTS.NOTIFICATIONS.SEND`.
  - `App.js:66` — direct `fetchWithTimeout` to `${API_BASE_URL}/auth/update-push-token`. **Two issues**: (a) bypasses `apiFetch` (no auth interceptor / no refresh-on-401 / no timeout consistency), (b) hardcoded path. Migrate to `apiFetch(ENDPOINTS.AUTH.UPDATE_PUSH_TOKEN, …)`. (Touches the auth module surface; flag for cross-module followup.)
- **Hardcoded user-facing text:** none found. All notification screens/components use `t()`.

### 4.5 Web/Mobile divergence

For the canonical endpoints (1–7 in §1), web and mobile both read `response.data.notifications`, `response.data.pagination`, `response.data.unreadCount`. **No field divergence found.**

The only behavioral divergence:

- **Web** uses Zustand polling at 30 s + canonical hook with 30 s `refetchInterval` (after migration both will be the React Query hook).
- **Mobile** uses `useUnreadCount` with `refetchInterval: 2 * 60 * 1000` (2 min) — slower cadence.

**LOCKED: unify at 60 000 ms (60 s) on both platforms.** Update `useUnreadNotificationCount` (web `hooks/reactQueryHooks/useNotifications.js`) and `useUnreadCount` (mobile `hooks/queries/useNotifications.js`) to `refetchInterval: 60 * 1000`. Acceptance check: both hooks share the same numeric literal.

### 4.6 Loading / error / empty states

All notification screens/components have loading / error / empty handling per §C6. No gaps found.

### 4.7 Comment hygiene

- `services/notificationService.js:5` — `M-13: route notification calls through the centralized apiFetch wrapper…` → strip marker, keep the explanatory text.
- `services/settingsService.js:4` — `Phase 4 W0-AUTH: routed through apiFetch…` → strip marker.
- `services/adminDashboardService.js:5` — `Phase 4 W0-AUTH: routed through apiFetch…` → strip marker.

(These strip-only edits are inside the service files; safe and local.)

---

## 5. Cross-Platform API Consumption Diff

| Endpoint | Aspect | Web | Mobile | Backend truth | Action |
|----------|--------|-----|--------|---------------|--------|
| GET /notifications | path | `API_PATHS.notifications.getNotifications` | `ENDPOINTS.NOTIFICATIONS.BASE` | `/notifications` | Match |
| GET /notifications | query.type values | unrestricted (form) | unrestricted | should be `NOTIFICATION_TYPES` enum | Backend swagger drift only |
| GET /notifications | query.isRead | not used today | not used today | accepted | optional; both fine |
| GET /notifications | response read path | `data?.data?.notifications` etc. | `response.data?.notifications` etc. | `data.notifications` | Match |
| GET /notifications/unread-count | response read path | `data?.data?.unreadCount` (React Query path), `response.data.unreadCount` (Zustand path) | `response.data?.unreadCount` | `data.unreadCount` | Match |
| PATCH /notifications/:id/read | path | `API_PATHS.notifications.markAsRead(id)` | `${ENDPOINTS.NOTIFICATIONS.BASE}/${id}/read` | `/notifications/:id/read` | Match |
| DELETE /notifications/:id | path | `API_PATHS.notifications.deleteNotification(id)` | `${ENDPOINTS.NOTIFICATIONS.BASE}/${id}` | `/notifications/:id` | Match |
| PATCH /notifications/read-all | path | `API_PATHS.notifications.markAllAsRead` | `ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ` | `/notifications/read-all` | Match |
| DELETE /notifications/clear-all | path | `API_PATHS.notifications.clearAllNotifications` | `ENDPOINTS.NOTIFICATIONS.CLEAR_ALL` | `/notifications/clear-all` | Match |
| POST /notifications/send | body fields | `userIds, title, titleAr, message, messageAr, type, data` | `userIds, title, titleAr, message, messageAr, type, data` | accepts all | Match (backend Swagger needs update) |
| POST /notifications/broadcast | body fields | `role, title, titleAr, message, messageAr, type, whitelabelId` | `role, title, titleAr, message, messageAr, type, whitelabelId` | accepts all | Match (backend Swagger needs update) |

**No web/mobile field disagreement.** All divergence is between backend implementation and backend Swagger annotations.

---

## 6. Suspected Bugs Worth Verifying

(Things that look broken but the agent cannot confirm without running the app — flag for sanity check.)

1. **Bulk `insertMany` skips Mongoose `pre-save` hook → `titleAr`/`messageAr` undefined for admin sends.** `NotificationModel.js:489-493` defines a `pre('save')` hook that mirrors `titleAr = title` / `messageAr = message` if not provided. `notifications.service.sendToUsers` (line 328) and `broadcast` (line 358) use `Notification.insertMany(...)`, which bypasses pre-save. Result: when an admin sends a notification with only `title`/`message`, the recipient document has `titleAr: undefined` / `messageAr: undefined`, and `_formatNotification` returns those undefineds to the client. Easy verify: send a single-language notification via `POST /notifications/send` and read it back. **Fix proposal:** mirror titleAr/messageAr inside the service builders before `insertMany`, or add `{ runValidators: false, ordered: true }` is irrelevant — the only real fix is defaulting in code. Single-user `createNotification` is fine because it uses `.create()` which runs hooks.

2. **Orphan `deleteAllRead` controller method.** `notifications.controller.js:84-88`. Either route + Swagger or delete the method. Recommended: delete (no consumer demand, see 2.4).

3. **`_shouldSendEmail` has a tiny preference map.** `notifications.service.js:114-118` only knows three notification types (`event_created`, `event_reminder`, `guest_rsvp`). All other types fall through and email is sent regardless of preference. The richer mapping lives in `shared/utils/notificationService.NOTIFICATION_TYPE_TO_PREFERENCE`. The two should reconcile — service's `_shouldSendEmail` should import the central map. Out of scope for THIS module's surface but worth flagging.

4. **`createNotification` idempotency key collides on `entityId: "none"`.** `notifications.service.js:140-141` — if `notificationData.data?.entityId` is missing the key becomes `notification:<userId>:<type>:none`, which would dedupe **all** entityId-less notifications of the same type per user across the 24-hour TTL window. For event-tied notifications this is fine (entityId always present). For type=`announcement` or `welcome` the dedup becomes an unintended "first one wins for 24 h." Acceptable for `welcome` (can't have two welcomes), problematic for `announcement` if admins broadcast multiple per day. Note: announcements actually go through `broadcast` (not `createNotification`), so currently safe — but a future caller could trip this. Document in code or include `requestHash` in the key.

5. **Idempotency asymmetry.** Single-user `createNotification` is idempotent; `sendToUsers` and `broadcast` (the bulk admin paths) are not. An admin who double-clicks "Send" creates duplicate notifications for every recipient. Probably tolerable; verify the popup disables the Send button while pending. (`SendNotificationPopup.js:145` does set `loading` state — looks fine.)

6. **Web Header bell + dropdown both poll independently after the migration.** Today both consume the Zustand store, which polls once. After moving to `useUnreadNotificationCount()` and `useNotifications()`, both run their own React Query refetch timers. Verify dedup works as expected (same query key collapses) — for `useUnreadNotificationCount` only the bell uses it, so fine; for `useNotifications` the dropdown is the sole caller.

7. **Mobile push token registration uses raw `fetchWithTimeout` and lacks retry-on-401.** `App.js:66`. If the token is stale, the registration silently fails (no refresh). Migrate to `apiFetch` (handled in 4.4).

8. **Backend has `channels.push` field + `deliveryStatus.push` but no actual push sender.** Only email delivery is implemented. Mobile registers an Expo push token via `/auth/update-push-token`, but no backend code consumes the token to send a push notification when a Notification document is created. Verify whether this is on the roadmap or whether the field is dead. Out of this module's PR scope.

---

## 7. Implementation Plan (Ordered)

Apply changes in this order. Each item ends with a checkbox the agent will tick during Phase 2.

### 7.A Backend
- [ ] **A.1** Delete orphan `exports.deleteAllRead` from `notifications.controller.js:84-88`. (No route, no consumer. Locked §0.1 #1.)
- [ ] **A.2** Fix `sendToUsers` and `broadcast` to mirror `titleAr=title` / `messageAr=message` before `insertMany`, since `pre-save` is bypassed. (`notifications.service.js:322-330, 354-358`) — also add a service-level helper `_normalizeBilingual({title, titleAr, message, messageAr})` and reuse in `createNotification` for symmetry.
- [ ] **A.3** Add audit log to `sendNotification` controller, parallel to broadcast. (`notifications.controller.js:117-130` — add `logAudit({ action: 'notification.send', actor, targetType: 'notification', metadata: { recipientCount: result?.sentCount, userIdsCount: userIds?.length, type } })`.)
- [ ] **A.4** Create `notifications.validation.js` with `sendNotificationSchema` and `broadcastNotificationSchema` as **Zod schemas** (specs in §2.6). Wire via `validateZod(schema)` middleware (`shared/middleware/validation.js:373`) on `POST /send` and `POST /broadcast`. No Joi.
- [ ] **A.5** Update Swagger blocks for `GET /notifications` (correct `type` enum or remove enum, add `isRead`), `POST /notifications/send` (full body schema + response shape), `POST /notifications/broadcast` (full body schema + response shape). (`notifications.routes.js:99-102, 218-241, 255-269`.)
- [ ] **A.6** Replace `console.error` swallows in `notifications.service.js:52, 62, 94` with `shared/utils/logger.warn` calls (preserve the best-effort behavior; just stop using `console`).
- [ ] **A.7** Add `.lean()` to read queries in `notifications.service.js:196` (`getUserNotifications`) and `notifications.service.js:304` (`getNotification`). Returns are already routed through `_formatNotification`.
- [ ] **A.8** Comment hygiene: strip markers in `notifications.service.js:32` (`FLOW-27-F04`), `notifications.service.js:128` (`FLOW-27-F01`), `notifications.controller.js:140` (`TENANT-F03`). Keep the explanatory prose where useful, drop the marker prefix.
- [ ] **A.9** Delete `NotificationModel.toClientJSON` (model:309). Verify with `grep -r toClientJSON` first; if a live consumer is found, delete `_formatNotification` instead and route the service through `toClientJSON`. Single canonical formatter is the invariant. (See §0.1 #2.)

### 7.B Web
- [ ] **B.1** Migrate `NotificationBell.js` from Zustand `useNotificationStore` to `useUnreadNotificationCount()` from `hooks/reactQueryHooks/useNotifications.js`. Set `refetchInterval: 60 * 1000` (locked §0.1 #4 — unify with mobile). Preserve every CSS class and JSX node exactly. (file:`ui/layout/notifications/NotificationBell.js:24-39`)
- [ ] **B.2** Migrate `NotificationDropdown.js` from Zustand store to `useNotifications({ page, limit })` + `useNotificationMutation('markAsRead' | 'markAllAsRead' | 'deleteNotification' | 'clearAll')`. Replace the load-more state with React Query page increment + `keepPreviousData`. **Preserve styling exactly.** (`ui/layout/notifications/NotificationDropdown.js:25-77`)
- [ ] **B.3** Add error-state rendering to `NotificationDropdown.js` (translated message + retry button) — uses the same `styles.error` pattern from sibling components. (`ui/layout/notifications/NotificationDropdown.js`, after line 135)
- [ ] **B.4** Add error-state rendering to `NotificationPreferences.js`. (`ui/settings/notificationsPrefrences/NotificationPreferences.js`)
- [ ] **B.5** Migrate `SendNotificationPopup.js` from direct `apiRequest` to `useNotificationMutation('adminSend' | 'adminBroadcast')`. Replace toast strings with `t()`. Replace `toast.error(...)` with `handleError(error, t, { fallbackMessage: "adminNotifications.error.failed" })`. Replace all hardcoded text strings (table in §3.3) with `t()` keys. (`ui/admin/SendNotificationPopup/SendNotificationPopup.js:51-72, 85-150`)
- [ ] **B.6** **LOCKED: delete the wrapper functions** (`hostsAPI.sendNotification`, `hostsAPI.notifyAll`, `moderatorsAPI.sendNotification`, `moderatorsAPI.notifyAll`, `whitelabelAPI.sendNotification`, `whitelabelAPI.notifyAll`, `vendorsAPI.sendNotification`, `vendorsAPI.notifyAll`) at `services/adminDashboard.js:270, 277, 370, 377, 474, 481, 590, 597`. Grep each function name; replace every caller with `useNotificationMutation('adminSend')` or `useNotificationMutation('adminBroadcast')` directly.
- [ ] **B.7** Delete `stores/notificationStore.js` (after B.1 + B.2 land and no consumer remains — verify via grep `useNotificationStore`).
- [ ] **B.8** Delete `services/notification.js` (after B.7; verify no remaining importer).
- [ ] **B.9** Comment hygiene: re-run grep for `// FLOW`, `// PHASE`, `// FE-`, `// BUG-` in the touched files. None expected — confirm.

### 7.C Mobile
- [ ] **C.1** Migrate `components/admin-dashboard/settings/SettingsNotifications.js` from direct `getNotificationPreferencesAPI`/`updateNotificationPreferencesAPI` calls to `useNotificationSettings()` + `useUpdateNotificationSettings()` hooks. (`components/admin-dashboard/settings/SettingsNotifications.js:19, 44`)
- [ ] **C.2** Replace hardcoded `/notifications/send` in `services/adminDashboardService.js:112` with `ENDPOINTS.NOTIFICATIONS.SEND`.
- [ ] **C.3** Migrate `App.js:66` push-token registration from raw `fetchWithTimeout` to `apiFetch(ENDPOINTS.AUTH.UPDATE_PUSH_TOKEN, …)`. (Cross-module: touches auth surface — verify `ENDPOINTS.AUTH.UPDATE_PUSH_TOKEN` exists.)
- [ ] **C.4** Drop the unused `_legacyToken` parameter from `services/notificationService.js` exports and update call sites in `hooks/queries/useNotifications.js`, `hooks/mutations/useNotificationMutations.js`, and any other callers found via grep. (`services/notificationService.js`)
- [ ] **C.5** Split `components/admin-dashboard/notifications/SendNotificationModal.js` (444 lines → cap 350): extract `<SendNotificationForm/>` (form fields + state), `<BilingualField/>` (the duplicated Arabic/English pair), preserving every `StyleSheet.create({...})` value and every `View`/`Text` hierarchy unchanged. (`components/admin-dashboard/notifications/SendNotificationModal.js`)
- [ ] **C.6** Drop fallback chain in `hooks/queries/useUser.js#useNotificationSettings` mapping (`data?.preferences || data || response`). Verify the actual `/users/notification-preferences` response shape and pick one path. (Cross-module: touches users surface — coordinate with users module review.)
- [ ] **C.7** Comment hygiene: strip phase markers in `services/notificationService.js:5`, `services/settingsService.js:4`, `services/adminDashboardService.js:5`.
- [ ] **C.8** Update mobile `useUnreadCount` `refetchInterval` from `2 * 60 * 1000` to `60 * 1000` (locked §0.1 #4 — unify with web). (`hooks/queries/useNotifications.js`)

### 7.D Cross-platform alignment (do AFTER A/B/C)
- [ ] **D.1** Re-grep `/notifications` and `notifications.send`/`notifications.broadcast` in both `labbe/` and `halla-mobile/`; confirm zero hardcoded path literals remain.
- [ ] **D.2** Verify both web and mobile, after migration, call all module endpoints through their canonical hook (`useNotifications.js` web; `useNotifications.js` + `useNotificationMutations.js` mobile). No direct `apiRequest`/`apiFetch` in components or screens.
- [ ] **D.3** Smoke check the bilingual rendering path: send a notification from the admin popup with only English text and verify the recipient (web + mobile) doesn't show `undefined` for the Arabic title (proves the §6.1 bug is fixed).
- [ ] **D.4** Smoke check the Header bell unread count updates after marking a notification as read (verifies React Query invalidation cascades through both bell and dropdown).

### 7.E Out-of-module followups (do NOT do in this PR — flag for the user)
- [ ] **E.1** Split `shared/utils/notificationService.js` (1068 lines → cap 300) into per-domain notifier files. Separate refactor.
- [ ] **E.2** Reconcile `_shouldSendEmail` (notifications.service.js) preference map with `NOTIFICATION_TYPE_TO_PREFERENCE` (shared util). Either delete the local map and import the shared one, or document why they differ. Separate refactor.
- [ ] **E.3** Decide whether to implement push delivery (`channels.push` / `deliveryStatus.push` are written but never read). Product decision.

---

## 8. Locale-key additions required

(Listed for the user — agent does NOT modify locale JSON without explicit approval.)

For `SendNotificationPopup.js` migration (B.5). **LOCKED namespace: `adminNotifications.*`** (§0.1 #3).

| Key | English | Arabic |
|-----|---------|--------|
| `adminNotifications.role.super_admin` | "Super Admins" | "المشرفون الرئيسيون" |
| `adminNotifications.role.admin` | "Admins" | "المشرفون" |
| `adminNotifications.role.host` | "Hosts" | "المنظمون" |
| `adminNotifications.role.vendor` | "Vendors" | "البائعون" |
| `adminNotifications.role.moderator` | "Moderators" | "المراقبون" |
| `adminNotifications.role.whitelabel_admin` | "Whitelabel Admins" | "مديرو العلامة البيضاء" |
| `adminNotifications.role.whitelabel_moderator` | "Whitelabel Moderators" | "مراقبو العلامة البيضاء" |
| `adminNotifications.success.toAll` | "Notification sent to all users" | "تم إرسال الإشعار لجميع المستخدمين" |
| `adminNotifications.success.toUser` | "Notification sent successfully" | "تم إرسال الإشعار بنجاح" |
| `adminNotifications.error.failed` | "Failed to send notification" | "فشل في إرسال الإشعار" |
| `adminNotifications.titleSingle` | "Send Notification" | "إرسال إشعار" |
| `adminNotifications.titleBroadcast` | "Send Notification to All {{role}}" | "إرسال إشعار لجميع {{role}}" |
| `adminNotifications.fields.titleAr.label` | "Title (Arabic) *" | "العنوان (عربي) *" |
| `adminNotifications.fields.titleAr.placeholder` | "Notification title in Arabic" | "عنوان الإشعار بالعربية" |
| `adminNotifications.fields.titleEn.label` | "Title (English)" | "العنوان (إنجليزي)" |
| `adminNotifications.fields.titleEn.placeholder` | "Notification title in English (optional)" | "عنوان الإشعار بالإنجليزية (اختياري)" |
| `adminNotifications.fields.messageAr.label` | "Message (Arabic) *" | "الرسالة (عربي) *" |
| `adminNotifications.fields.messageAr.placeholder` | "Notification content in Arabic" | "محتوى الإشعار بالعربية" |
| `adminNotifications.fields.messageEn.label` | "Message (English)" | "الرسالة (إنجليزي)" |
| `adminNotifications.fields.messageEn.placeholder` | "Notification content in English (optional)" | "محتوى الإشعار بالإنجليزية (اختياري)" |
| `adminNotifications.broadcastWarning` | "⚠️ This notification will be sent to all {{role}}" | "⚠️ سيتم إرسال هذا الإشعار لجميع {{role}}" |
| `common.cancel` | "Cancel" | "إلغاء" (likely already exists) |
| `common.send` | "Send" | "إرسال" (likely already exists) |

---

## 9. Rollback plan

For each implementation item, the rollback is a `git revert` of its commit. None of the planned items touch DB shape or migration; the riskiest items are:

- **B.1 / B.2** (Zustand → React Query migration). Rollback restores Zustand store + legacy service. Visual surface unchanged either way (style preservation requirement).
- **B.7 / B.8** (deletions). Re-add the files from history if needed.
- **A.4** (validation schemas). If a previously-permitted body shape is now rejected, relax the schema. The schemas above only require fields the controller already requires, so risk is low.
- **A.2** (titleAr/messageAr mirror). Strictly additive — only changes documents that today have `undefined` Arabic fields.

---

## 10. Acceptance checklist (run after Phase 2)

- [ ] No file in module exceeds the cap.
- [ ] All notification endpoints have current Swagger.
- [ ] No duplicate / orphan endpoints remain (`deleteAllRead` is gone).
- [ ] Web + Mobile call the same paths with the same shapes for every endpoint.
- [ ] No fallback chains in data mapping in this module's surface area.
- [ ] No `// FLOW-…` / `// PHASE-…` / `// W0-…` / `// TENANT-…` / `// BUG-…` comments in the touched files.
- [ ] Web has exactly one canonical data layer for notifications (`useNotifications.js`).
- [ ] No remaining `useNotificationStore` import in web.
- [ ] No remaining `services/notification.js` import in web.
- [ ] No remaining hardcoded `/notifications/...` path strings in web (`services/adminDashboard.js` clean).
- [ ] No remaining hardcoded `/notifications/...` path strings in mobile (`adminDashboardService.js` clean).
- [ ] `npm run lint` clean (or no new warnings introduced) on backend, web, mobile.
- [ ] Visual smoke test: Header bell + dropdown look identical before/after the refactor on every dashboard.
- [ ] Bilingual smoke test: a notification sent with English-only fields renders the English title/message on both web and mobile (no `undefined` Arabic).
