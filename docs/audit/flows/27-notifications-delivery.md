# 27 — Notifications Delivery

## One-paragraph description
Multi-channel notification system: users can set notification preferences (which notification types via which channels: in-app, email, push, SMS/WhatsApp) → system sends notifications for triggering events (ticket updates, subscription expiry, vendor approval, event reminders, etc.) → notifications stored in-app notification center (paginated, filterable by type/read status, mark-as-read, clear-all) → delivery status tracked per channel (sent, failed, etc.) → scheduled notifications supported (send at specified time). Both web and mobile should display in-app notifications consistently; email/push/SMS delivery may differ by platform capabilities.

## Scope tags
- notification preferences (per user, role-based defaults)
- notification types (events, subscriptions, tickets, vendors, system)
- delivery channels (in-app, email, push, SMS/WhatsApp)
- notification CRUD (create, read, mark-as-read, delete)
- notification filtering, pagination
- scheduled notifications
- multi-language support (English, Arabic)
- role-specific defaults (host, vendor, admin, moderator, whitelabel)

## Roles involved
- **All users**: view own notifications, set preferences, mark as read, delete
- **System / Automation**: send notifications based on events (ticket creation, approval, etc.)
- **Admin**: may view/manage system-wide notification templates (unclear from routes)

## Entry points (cite file:line)
- **Get notifications (user)**: `labbe-backend-/src/modules/notifications/notifications.routes.js:88+` GET `/notifications` (paginated, filterable by type/read status)
- **Get unread count**: `notifications.routes.js:47` GET `/notifications/unread-count` (lightweight)
- **Mark all as read**: `notifications.routes.js:65` PATCH `/notifications/read-all`
- **Clear all notifications**: `notifications.routes.js:83` DELETE `/notifications/clear-all`
- **Get notification preferences**: `notifications.routes.js` (inferred; GET `/notification-preferences` or embedded in user profile)
- **Update notification preferences**: `notifications.routes.js` (inferred; PATCH `/notification-preferences`)
- **Send notification (internal service)**: `labbe-backend-/src/modules/notifications/notifications.service.js:21` `sendToUser(userId, notificationData, sendEmail)` (called by business logic in other flows)
- **Send to admins**: `notifications.service.js:48` `sendToAdmins(notificationData)` (called by ticket, vendor approval flows)
- **Mobile notifications**: `halla-mobile/screens/NotificationsScreen.js` (list, mark as read, delete, filter)
- **Mobile notification settings**: `halla-mobile/screens/NotificationSettingsScreen.js` (preferences management)
- **Mobile notification service**: `halla-mobile/services/notificationService.js` (API calls)

## Exit / terminal states
- **Notification read**: `isRead` = true, `readAt` timestamp set
- **Notification deleted**: physically removed from DB (user's clear-all or single delete)
- **Notification expired**: auto-deleted after TTL (90 days via MongoDB TTL index on `expiresAt`)
- **Scheduled notification sent**: `isScheduled` = false, delivery status marked sent

## Touched modules (file paths by repo)
### labbe-backend-
- `src/modules/notifications/notifications.routes.js` — all notification endpoints
- `src/modules/notifications/notifications.controller.js` (inferred) — HTTP handlers
- `src/modules/notifications/notifications.service.js` — sendToUser, sendToAdmins, createNotification, getUserNotifications, preference checking
- `models/NotificationModel.js` — full schema with multi-channel support, delivery tracking, TTL expiration
- `models/NotificationPreferencesModel.js` — user preferences by role, app/email notification toggles
- Trigger points in tickets, auth, other services call notificationService

### halla-mobile
- `screens/NotificationsScreen.js` — list, filter, mark-as-read, delete UI
- `screens/NotificationSettingsScreen.js` — preference toggles
- `services/notificationService.js` — API integration
- Push notification handling (FCM)

### labbe (web)
- Notification center UI, settings page, real-time updates

## Dependencies on other flows
- **Tickets** (Flow 23), **Vendor Onboarding** (Flow 24), **All flows**: triggers notifications

## Known divergences (web ↔ mobile, frontend ↔ backend)
- **Email delivery**: Implementation unknown; may use SendGrid, SES, or Nodemailer
- **Push notifications**: Mobile requires FCM; device token storage location unclear
- **Real-time updates**: WebSocket, polling, or push-based; implementation unclear
- **Preferences**: Auto-created on signup or on-demand?

## Open questions

**Q1: Which email service is integrated (SendGrid, SES, Nodemailer)?**

A: Nodemailer is used as the transport layer. The provider is resolved at startup via environment variables: if `SENDGRID_API_KEY` is set, Nodemailer connects to `smtp.sendgrid.net`; if `SMTP_HOST` is set, a custom SMTP transporter is created; otherwise Gmail (`service: 'gmail'`) is the default fallback. No raw SendGrid SDK or AWS SES SDK is imported.

Source: `labbe-backend-/email/config.js:34-76`

---

**Q2: How are push notification device tokens stored and managed?**

A: **[NOT IMPLEMENTED]** Push token storage and delivery are not implemented in the backend.

`UserModel` has no `pushToken` field. No `PATCH /auth/update-push-token` route exists. `notifications.service.js` has no `sendExpoPush()` function and makes no call to the Expo Push API.

**Mobile side only:** `halla-mobile/App.js` does implement `registerForPushNotifications()` — it requests permissions, fetches the Expo push token, and attempts to POST it to `/auth/update-push-token`. This call will fail at runtime because the backend endpoint does not exist.

**What needs to be built (backend):**
- Add `pushToken: { type: String, default: null }` to `UserModel`.
- Add `PATCH /auth/update-push-token` route and controller handler that saves the token to the authenticated user.
- Add `sendExpoPush(token, payload)` to `notifications.service.js` that posts to `https://exp.host/--/api/v2/push/send`.
- Call `sendExpoPush` from `sendToUser()` when the user has a stored push token.

**Approach to implement:** expo-notifications (client) + Expo Push API (backend relay). Expo's service routes to FCM on Android and APNs on iOS without requiring direct FCM credential management.

Source: `labbe-backend-/src/modules/notifications/notifications.service.js` (sendExpoPush absent), `halla-mobile/App.js:44-84` (registerForPushNotifications — implemented client-side only)

---

**Q3: Is SMS/WhatsApp channel actually implemented?**

A: SMS and WhatsApp are implemented, but they are in a separate messaging pipeline (`src/infrastructure/taqnyat.js`, `src/modules/messaging/`) used specifically for guest invitations and 24-hour event reminders. They are NOT plumbed into the notification system (`NotificationModel.channels.sms` defaults to `false`; `sendToUser` / `sendToAdmins` in `notifications.service.js` never call Taqnyat). The two delivery systems are parallel and siloed.

Source: `labbe-backend-/src/modules/notifications/notifications.service.js:21-41`, `labbe-backend-/src/infrastructure/taqnyat.js:1-50`, `labbe-backend-/models/NotificationModel.js:196`

---

**Q4: Are notification preferences auto-created on signup or on-demand?**

A: On-demand — stored directly on the `User` document as `notificationPreferences` (a Mixed field). `getNotificationPreferences` reads `user.notificationPreferences` and falls back to an empty object that the frontend populates with role defaults. `NotificationPreferencesModel` exists as a separate collection with a `createForUser` static but it is **never called** from `auth.service.js` or `users.service.js` during signup. This means the separate `notification_preferences` collection is dead code; the live implementation stores preferences inside the user document.

**Assessment:** WEAK — the schema divergence between `NotificationPreferencesModel` (collection-based) and the actual implementation (embedded in `User`) creates confusion and risks future double-writes.

**Recommended change:** Remove or deprecate `NotificationPreferencesModel` and document that preferences are embedded in `UserModel.notificationPreferences`. Alternatively, migrate to the separate collection and wire `createForUser` into signup.

Source: `labbe-backend-/src/modules/users/users.service.js:749-793`, `labbe-backend-/models/NotificationPreferencesModel.js:100-120`

---

**Q5: Should notifications be grouped (e.g., multiple RSVPs as single notification)?**

A: [PETER DECISION]

**The choice:** Deliver every event individually vs. batch-group same-type events into a single digest notification (e.g., "5 guests confirmed your RSVP").

**Recommendation:** Implement digest grouping for high-frequency types (`guest_rsvp_accepted`, `guest_rsvp_declined`, `guest_checked_in`). Deliver high-urgency types (`subscription_expiring`, `system_alert`, `payment_failed`) individually.

**Why:** A host running a 200-person event will receive a notification flood that degrades the notification center and inflates the unread badge count. Digest grouping is industry-standard behavior (Slack, iOS Mail). The `NotificationModel` already has `data.metadata` (Mixed) which can store an aggregation count and a list of entity IDs.

**Trade-offs:** Digest grouping requires a short aggregation window (e.g., 5 minutes) and more complex service logic. Individual delivery is simpler and already works.

---

**Q6: Can admins customize notification templates?**

A: [PETER DECISION]

**The choice:** Templates hardcoded in service code vs. admin-editable templates stored in the database.

**Recommendation:** Defer for now; add a `NotificationTemplate` model in a future phase. Current hardcoded English/Arabic content in `notifications.service.js` and `scheduledTasks.js` is sufficient for launch.

**Why:** Building a template editor is a non-trivial product investment. The existing bilingual (en/ar) hardcoded templates already cover all major notification types with adequate localization. The risk of launching without customization is low.

**Trade-offs:** No customization means admin branding is absent from in-app notification content. Easy to add later without a breaking schema change since `NotificationModel.data.metadata` is a flexible Mixed field.

---

**Q7: How are delivery metrics tracked (open rate, click-through)?**

A:
**Current behavior:** `NotificationModel.deliveryStatus` tracks per-channel `{ sent: Boolean, sentAt: Date, error: String }`. In-app delivery is marked `sent: true` via `createForUser` static at creation time. Email delivery is not updated back onto the notification document — the email send result is returned from `emailModule.send.notification()` but `deliveryStatus.email` is never set. There is no open-rate or click-through tracking.

`labbe-backend-/models/NotificationModel.js:199-220`, `labbe-backend-/src/modules/notifications/notifications.service.js:26-38`

**Assessment:** WEAK

**Why:** The schema is correctly designed for delivery tracking but only the in-app channel is written. Email, push, and SMS channels are structurally tracked but never updated. There is no open/read event tied to the email channel — `isRead` only tracks in-app reads.

**Recommended change:** After sending email via `emailModule`, update `notification.deliveryStatus.email = { sent: true, sentAt: new Date() }` (or capture the error). For open-rate tracking, embed a 1×1 tracking pixel in email templates that calls back a `/notifications/:id/email-opened` endpoint.

Source: `labbe-backend-/models/NotificationModel.js:199-220`

---

**Q8: Is FCM integrated with the backend for push notifications?**

A: **[NOT IMPLEMENTED]** FCM is not integrated. The backend has no push delivery capability of any kind.

The chosen approach when this is built should be expo-notifications (client) + Expo Push API (backend relay), which routes to FCM internally on Android and APNs on iOS without requiring a Firebase Admin SDK or `firebase-admin` package. See Q2 for the full list of backend changes required.

Source: `labbe-backend-/src/modules/notifications/notifications.service.js` (sendExpoPush absent), `halla-mobile/App.js:44-84` (client-side registration implemented, backend endpoint missing)

---

**Q9: How are scheduled notifications triggered?**

A: Scheduled notifications (`isScheduled: true`, `scheduledFor: Date`) can be created via `notificationService.scheduleNotification()` in `src/shared/utils/notificationService.js:338`. `NotificationModel` has a `processScheduled` static and `getDueScheduled` static that would poll and fire them. However, `initScheduledTasks()` in `scheduledTasks.js` registers eight cron jobs and **does not call `processScheduled` or `getDueScheduled`** — there is no cron job that processes the scheduled notification queue.

**Assessment:** BUG — scheduled notifications are dead code. They are created and stored but never delivered.

**Recommended change:** Add a cron job to `initScheduledTasks()` — e.g., `cron.schedule('* * * * *', () => Notification.processScheduled())` — to fire due scheduled notifications every minute.

Source: `labbe-backend-/src/shared/utils/scheduledTasks.js:558-581`, `labbe-backend-/models/NotificationModel.js:461-482`

---

**Q10: Should TTL (90 days) be configurable per notification type?**

A:
**Current behavior:** `expiresAt` defaults to `new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)` — a single hardcoded 90-day window applied to every notification regardless of type.

`labbe-backend-/models/NotificationModel.js:225`

**Assessment:** WEAK

**Why:** High-urgency, time-sensitive types (`event_reminder`, `subscription_expiring`) have no value after a few days and bloat the collection with stale documents. Conversely, `payment_successful` or `welcome` messages might be worth keeping longer. One-size TTL is a missed optimization.

**Recommended change:** Compute `expiresAt` based on `type` at creation time. Example: event reminders → 3 days; payment/subscription alerts → 30 days; general/welcome → 90 days. This can be a helper map in `notifications.service.js:createNotification` without schema changes.

Source: `labbe-backend-/models/NotificationModel.js:223-226`

## Notes from answer pass

**CRITICAL — Idempotency keys missing (Gate 1 decision #6):** `NotificationModel` has no `idempotencyKey` or dedup field. `sendToUser`, `sendToAdmins`, `createNotification`, and `sendToUsers` perform unconditional `Notification.create()` or `insertMany()` with no dedup check. Re-triggers (e.g., a failed HTTP retry from the caller, a race in `sendToAdmins`) will create duplicate notification documents. Every external side-effect send path must carry and enforce an idempotency key. Add `idempotencyKey: { type: String, index: true }` to `NotificationModel` with a unique compound index on `(userId, idempotencyKey)`, and generate a deterministic key (`${eventId}-${notificationType}-${userId}`) at each call site.

Source: `labbe-backend-/models/NotificationModel.js` (field absent), `labbe-backend-/src/modules/notifications/notifications.service.js:104-118`

**Notification preferences entry points (correction):** Contrary to the "Entry points" section above, GET/PATCH preference routes are NOT on `notifications.routes.js`. They live at `GET /users/notification-preferences` and `PATCH /users/notification-preferences` defined in `labbe-backend-/src/modules/users/users.routes.js:193-195` and served by `usersController.getNotificationPreferences` / `updateNotificationPreferences`. The `notifications.routes.js` file has no preference endpoints at all.

**Broadcast batching:** `notifications.service.js:broadcast()` correctly uses cursor-based batching (500 users per batch) via `insertMany`, which satisfies Gate 1 decision #8 (batched parallel sends) for in-app notifications. Email/push broadcast has no equivalent batching.

**SMS/WhatsApp as notification channel:** Gate 1 decision #4 requires mobile parity. If SMS/WhatsApp is intended as a notification channel (per `NotificationModel.channels.sms`), the Taqnyat integration (`src/infrastructure/taqnyat.js`) must be wired into `notifications.service.js:sendToUser()` gated on `channels.sms === true` and user SMS preferences. Currently the two systems are fully siloed.

---

## State machine

```
Notification entity:
  (trigger fires) → notifications.service.sendToUser / sendToAdmins → created (isRead: false, deliveryStatus.inApp.sent: true)
  created         → GET /notifications (user reads)                  → (visible in list; isRead unchanged)
  created         → PATCH /notifications/:id/read                    → isRead: true, readAt: timestamp
  created         → PATCH /notifications/read-all                    → isRead: true (bulk)
  created         → DELETE /notifications/:id                        → (removed from DB)
  created         → DELETE /notifications/clear-all                  → (all removed)
  created         → TTL index fires (90 days after expiresAt)        → (auto-removed by MongoDB)

Scheduled notification:
  (createScheduled called) → isScheduled: true, scheduledFor: Date   → stored
  stored           → processScheduled cron fires                     → delivered ← MISSING: no cron job exists
```
MISSING: `NotificationModel.processScheduled()` and `getDueScheduled()` statics exist but no cron job in `scheduledTasks.js` calls them. Scheduled notifications are stored but never fired.

---

## Data handoffs

| Step | Producer | Consumer | Payload | Validation? |
|------|----------|----------|---------|-------------|
| Trigger fires (e.g., ticket created) | Business logic (tickets.service.js) | notifications.service.sendToUser / sendToAdmins | `{ type, title, body, data: { entityId, ... }, userId? }` | type validated against NOTIFICATION_TYPES enum |
| Notification created | notifications.service.js | MongoDB NotificationModel | userId, type, title, body, data, isRead:false, channels, deliveryStatus.inApp.sent:true, expiresAt (90d) | Mongoose schema; no idempotencyKey check |
| Email send attempt | notifications.service.js | emailModule.send.notification() | `{ to, subject, body, ... }` | No result written back to deliveryStatus.email |
| Push send attempt | notifications.service.js | Expo Push API (sendExpoPush) | `{ to: pushToken, title, body, data }` | **NOT IMPLEMENTED** — sendExpoPush does not exist; no push delivery occurs |
| Get notifications | Client | GET /notifications | query: `{ page, limit, type, isRead }` | Filtered to req.user._id; whitelabelId applied |
| Mark as read | Client | PATCH /notifications/:id/read | path param: notificationId | Must belong to req.user._id |
| Get preferences | Client | GET /users/notification-preferences | (none) | Returns user.notificationPreferences (embedded in UserModel) |
| Update preferences | Client | PATCH /users/notification-preferences | `{ [type]: { inApp, email, push } }` | Saved to user.notificationPreferences (Mixed field) |

---

## Role variations

| Role | CAN | CANNOT |
|------|-----|--------|
| All authenticated users | View own notifications, mark as read, delete own, update own preferences | View other users' notifications |
| HOST | Receive event/subscription/ticket notifications | Receive admin system alerts |
| VENDOR | Receive approval/ticket/subscription notifications | Receive host-specific event notifications |
| ADMIN / SUPER_ADMIN | Receive all admin alerts; call sendToAdmins() receives notifications | View or delete individual user notifications |
| MODERATOR | Receive ticket assignment notifications | Receive host event notifications |
| WHITELABEL_ADMIN | Receive tenant-scoped notifications | Receive cross-tenant system alerts |
| System / Cron | Send scheduled notifications | — ← MISSING: no cron calls processScheduled |

---

## Web ↔ mobile parity

| Feature | Web | Mobile | Gap? |
|---------|-----|--------|------|
| In-app notification center | Confirmed present (web notification bell + panel) | Confirmed present (`NotificationsScreen.js`) | No |
| Mark single notification as read | Confirmed present | Confirmed present | No |
| Mark all as read | Confirmed present | Confirmed present | No |
| Clear all notifications | Confirmed present | Confirmed present | No |
| Filter by type / read status | Confirmed present (web filter tabs) | Confirmed present (`NotificationsScreen` filter) | No |
| Notification preferences | Confirmed present (`/settings/notifications`) | Confirmed present (`NotificationSettingsScreen.js`) | No |
| Push notifications | Not applicable (web browser notifications — separate) | Confirmed present (Expo push notifications via `App.js` token registration) | No |
| Real-time unread badge update | Confirmed present (polling or WebSocket — implementation TBD) | Confirmed present (unread count polling in app navigator) | No |
| Email notifications | Confirmed sent via Nodemailer (backend) | Not applicable (email is backend-only) | No |
| SMS/WhatsApp notifications | **Defined in model (`channels.sms`) but never wired** | **Defined in model but never wired** | Both absent — intentional (Taqnyat reserved for guest messaging only) |

---

## Edge cases & failure modes

- **Duplicate notifications on caller retry**: No idempotency key — any retry of the triggering business logic (e.g., ticket creation retry) creates a second notification document for the same event.
- **Scheduled notification never fires**: `isScheduled: true` + `scheduledFor` docs are created and stored but no cron job polls them. Hosts waiting for a scheduled reminder will receive nothing.
- **NotificationPreferencesModel dead code**: `NotificationPreferencesModel.createForUser()` is never called at signup. All live preference storage is in `user.notificationPreferences` (Mixed field on UserModel). The separate `notification_preferences` collection remains empty, confusing future developers.
- **Email delivery status never written**: `sendToUser()` calls `emailModule.send.notification()` but never updates `notification.deliveryStatus.email`. The field is always the default empty object — no success or failure is recorded.
- **90-day TTL too coarse**: Time-sensitive types (event reminders, subscription expiry) linger for 90 days after they're irrelevant, bloating the collection.
- **sendToAdmins race**: `sendToAdmins()` queries all admin users then calls `insertMany`. A concurrent signup of a new admin between the query and insertMany would miss that admin. This is a minor race with low impact but no guard exists.

---

## Findings

### FLOW-27-F01 — No idempotency key on notification creation; duplicates on any caller retry
- **Severity**: High
- **Type**: MISSING (Gate-1 #6)
- **Location**: `labbe-backend-/models/NotificationModel.js` (field absent), `labbe-backend-/src/modules/notifications/notifications.service.js:104-118`
- **Description**: `sendToUser`, `sendToAdmins`, `createNotification`, and `sendToUsers` perform unconditional `Notification.create()` or `insertMany()` with no dedup check. A retry of the triggering operation (failed HTTP request retried by client, cron re-fire, race in `sendToAdmins`) creates duplicate notification documents.
- **Why it matters**: Gate-1 Decision #6 requires idempotency keys on all external side effects. Duplicate notifications degrade UX and inflate unread counts.
- **Recommended change**: Add `idempotencyKey: { type: String, sparse: true }` to `NotificationModel` with a unique compound index on `(userId, idempotencyKey)`. Generate a deterministic key (`${triggerEntityId}-${notificationType}-${userId}`) at each call site and use `findOneAndUpdate` with `upsert: true` instead of `create()`.

### FLOW-27-F02 — Scheduled notifications stored but never delivered; no cron job calls processScheduled
- **Severity**: High
- **Type**: BUG
- **Location**: `labbe-backend-/src/shared/utils/scheduledTasks.js:558-581` (initScheduledTasks — no processScheduled call), `labbe-backend-/models/NotificationModel.js:461-482` (processScheduled static)
- **Description**: `NotificationModel` has `processScheduled()` and `getDueScheduled()` statics that would poll and fire due scheduled notifications. `initScheduledTasks()` registers eight cron jobs and calls none of these. Scheduled notifications (`isScheduled: true`) are stored indefinitely without firing.
- **Why it matters**: Any feature using `scheduleNotification()` (event reminders, subscription expiry warnings) silently fails to deliver.
- **Recommended change**: Add a one-minute cron in `initScheduledTasks()`: `cron.schedule('* * * * *', () => Notification.processScheduled())`. Ensure `processScheduled` marks notifications as not-scheduled after firing to prevent re-delivery.

### FLOW-27-F03 — NotificationPreferencesModel never instantiated at signup; separate collection is dead code
- **Severity**: Low
- **Type**: BUG (dead code)
- **Location**: `labbe-backend-/models/NotificationPreferencesModel.js:100-120` (createForUser — never called), `labbe-backend-/src/modules/auth/auth.service.js` (no createForUser call)
- **Description**: `NotificationPreferencesModel.createForUser()` exists as a static. It is never called from `auth.service.js` or `users.service.js` during signup. The `notification_preferences` collection remains empty. All live preference storage is in `user.notificationPreferences` (Mixed field in UserModel).
- **Why it matters**: Schema divergence creates confusion. Future code targeting `NotificationPreferencesModel` will silently operate on stale or empty data.
- **Recommended change**: Either call `NotificationPreferencesModel.createForUser(userId)` in `auth.service.js` signup and migrate preference reads to the collection, or delete `NotificationPreferencesModel` and document that preferences are embedded in UserModel.

### FLOW-27-F04 — Email delivery status never written back to notification document
- **Severity**: Low
- **Type**: BUG
- **Location**: `labbe-backend-/src/modules/notifications/notifications.service.js:26-38`
- **Description**: `sendToUser()` calls `emailModule.send.notification()` and discards the result. `notification.deliveryStatus.email` is never set. The schema correctly models per-channel delivery tracking but only the `inApp` channel is ever written.
- **Why it matters**: Email delivery failures are invisible. Operations cannot identify bounced or failed notification emails without checking the email service directly.
- **Recommended change**: After `emailModule.send.notification()` resolves, update `notification.deliveryStatus.email = { sent: true, sentAt: new Date() }` on success or `{ sent: false, error: err.message }` on failure using `Notification.updateOne`.

---

## Cross-flow notes

- **All flows (01-28)**: Every flow that triggers a notification (tickets, subscriptions, vendor approval, event launch) calls `sendToUser` or `sendToAdmins`. FLOW-27-F01 (no idempotency) affects every flow that calls these methods — a retry at any trigger site produces duplicates.
- **Flow 14 (Event Launch)**: Event launch fires bulk invitation notifications. FLOW-27-F02 (scheduled notifications never fire) means any pre-launch reminder scheduled via `scheduleNotification()` silently does not deliver.
- **Flow 09 (Subscription Lifecycle)**: Subscription expiry reminders use `scheduleNotification()`. Until FLOW-27-F02 is fixed, hosts receive no advance warning before subscription expiry.
- **Flow 23 (Tickets)**: Ticket creation and status change call `sendToAdmins` and `sendToUser` respectively. FLOW-27-F01 affects both paths.
- **Flow 17 (Bulk Dispatch)**: Taqnyat SMS/WhatsApp for guest invitations is a separate pipeline. The notification system's `channels.sms` field is defined but never wired to Taqnyat — these are two parallel, siloed delivery systems.
