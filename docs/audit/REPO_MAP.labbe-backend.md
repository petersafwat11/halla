# Halla Backend — Repository Map

**Path:** `labbe-backend-/`  
**Audit date:** 2026-04-27

---

## 1. Stack & Versions

| Item | Detail |
|------|--------|
| Runtime | Node.js (no `.nvmrc`; implied LTS) |
| Framework | Express 4.x |
| Database | MongoDB (via Mongoose ODM) |
| ORM/ODM | Mongoose — models in `models/` |
| Auth | jsonwebtoken + bcryptjs |
| Validation | express-validator, custom validators in `shared/middleware/validation.js` |
| File storage | AWS S3 SDK v3 (`@aws-sdk/client-s3`, presigned URLs) + local disk fallback |
| Email | Nodemailer (SMTP) — `src/infrastructure/email.js` |
| WhatsApp/SMS | Taqnyat (custom axios wrapper) — `src/infrastructure/taqnyat.js` |
| Queue | **None** — synchronous calls + node-cron for scheduling |
| Cache | **None** — no Redis |
| Logging | `console.log/error` + `morgan` in dev; no structured logger |
| Docs | Swagger (`swagger-ui-express`) — dev only at `/api-docs` |
| Security | `helmet`, `express-mongo-sanitize`, `compression`, `cors` |
| Rate limiting | Custom `express-rate-limit` wrappers in `src/shared/middleware/rateLimiter.js` |

**Entry point:** `src/server.js` → `src/app.js`

---

## 2. Entry Points

### API Mount
All routes are mounted **twice** — under `/api/v2` and `/api` (backward compat):

```
app.use(`${prefix}/auth`, authRoutes)
app.use(`${prefix}/users`, usersRoutes)
app.use(`${prefix}/subscriptions`, subscriptionsRoutes)
app.use(`${prefix}/events`, eventsRoutes)
app.use(`${prefix}/notifications`, notificationsRoutes)
app.use(`${prefix}/tickets`, ticketsRoutes)
app.use(`${prefix}/staff`, staffRoutes)
app.use(`${prefix}/guests`, guestsRoutes)
app.use(`${prefix}/dashboard`, dashboardRoutes)
app.use(`${prefix}/post-event`, postEventRoutes)
app.use(`${prefix}/plans`, plansRoutes)
app.use(`${prefix}/locations`, locationsRoutes)
app.use(`${prefix}/vendors`, vendorsRoutes)
app.use(`${prefix}/services`, servicesRoutes)
app.use(`${prefix}/messaging`, messagingRoutes)
app.use(`${prefix}/admin`, adminRoutes)
app.use(`${prefix}/discounts`, discountsRoutes)
app.use(`${prefix}/addons`, addonsRoutes)
app.use(`${prefix}/admin/templates`, adminTemplatesRoutes)
app.use(`${prefix}/admin/template-categories`, adminTemplateCategoriesRoutes)
app.use(`${prefix}/templates`, templatesRoutes)
app.use(`${prefix}/fonts`, fontsRoutes)
```

`app.js:44–170`

### Health check
`GET /health` — returns status, timestamp, environment. Does NOT check DB connectivity.

### Swagger UI
`GET /api-docs` — dev only.

### CORS allowed origins (`app.js:57–76`)
- `localhost:3000`, `localhost:5173`, `localhost:8081`, `10.0.2.2:8081`
- `https://labbe.vercel.app`, `config.frontend.url`
- Wildcard pattern `*.halaa.sa`
- Requests with no `origin` are allowed (mobile apps, Postman)

---

## 3. Domain Modules

All modules follow the pattern: `controller.js` / `service.js` / `routes.js` / `index.js`

| Module | Path | Purpose |
|--------|------|---------|
| auth | `src/modules/auth/` | Signup (host/vendor/whitelabel), login (email+password + OTP), password reset, email verification, profile completion |
| events | `src/modules/events/` | Full CRUD, launch, scheduling, staff, guest quotas, export |
| guests | `src/modules/guests/` | Public RSVP/invitation portal, protected guest CRUD, export |
| messaging | `src/modules/messaging/` | WhatsApp/SMS send (individual, bulk, reminder, retry), webhook, template management |
| subscriptions | `src/modules/subscriptions/` | Subscribe, change plan, cancel, validate limits, get features |
| plans | `src/modules/plans/` | Public plan listing + admin CRUD |
| staff | `src/modules/staff/` | Gate scanner auth (`/verify`), check-in, guest list, stats |
| tickets | `src/modules/tickets/` | Support ticket CRUD, assignment, rating, export |
| notifications | `src/modules/notifications/` | In-app notification read/clear |
| post-event | `src/modules/post-event/` | Post-event gallery/content CRUD |
| admin | `src/modules/admin/` | Super admin CRUD for hosts, vendors, moderators, whitelabels, events, reports |
| dashboard | `src/modules/dashboard/` | Aggregate stats for admin dashboards |
| users | `src/modules/users/` | Profile, host list, vendor list, moderators |
| vendors | `src/modules/vendors/` | Vendor listing for marketplace |
| services | `src/modules/services/` | Vendor services CRUD |
| discounts | `src/modules/discounts/` | Discount code CRUD and validation |
| addons | `src/modules/addons/` | Addon purchase (extra invites, reminders, templates) |
| templates | `src/modules/templates/` | WhatsApp/invitation template CRUD for admin and host |
| locations | `src/modules/locations/` | Saudi Arabia region/city/district data |

---

## 4. Database Models

All models in `models/` (legacy path; `server.js` also requires `models/BusinessSetupFeeModel.js` explicitly).

### UserModel (`models/UserModel.js`)
Single unified model for all user types. Role-based sub-document discrimination.

**Key fields:**
- `role` — enum from `ROLES` (see §5)
- `status` — `USER_STATUS`: `pending | active | suspended | rejected | inactive`
- `email`, `mobile` (phone), `password` (bcrypt), `fullName`, `username`
- `whitelabelId` — ObjectId ref `User` (null for platform users)
- `hostData` — sub-doc: `profileCompleted`, `emailVerified`, `subscribedBefore`, bio, company
- `vendorData` — sub-doc: brandName, serviceCategories (11 category arrays), serviceLocation, portfolioImages, pricePackages, verification docs, `vendorStatus`
- `vendorStatus` — `VENDOR_STATUS`: `pending | approved | rejected | suspended`
- `adminData` — sub-doc: permissions array
- `whitelabelData` — sub-doc: arabicName, englishName, logo, domain, customization

### EventModel (`models/EventModel.js`)
**Key fields:**
- `status` — `EVENT_STATUS`: `draft | pending_review | scheduled | live | published | cancelled | completed | archived`
- `eventDetails` — sub-doc: `title`, `type` (wedding|birthday|graduation|engagement|meeting|conference|other), `date`, `time`, `location`
- `invitationSettings` — Taqnyat template + visual template
- `launchSettings` — `scheduledDate`, `scheduledTime`, `taqnyatDeleteId` (for native Taqnyat scheduling)
- `messagingStatus` — `preferredChannel` (sms|whatsapp), `bulkSendStarted`, `reminderSent`
- `guestList` — `[ObjectId → Guest]`
- `host` — `ObjectId → User`
- `quotaSource` — `event | subscription`
- `maxGuests` — frozen from subscription at creation

### GuestModel (`models/GuestModel.js`)
- `name`, `phone`, `event` (ObjectId), `host` (ObjectId)
- `status` — `GUEST_STATUS`: `invited | confirmed | declined | checked_in | no_show | maybe`
- `rsvpStatus` — `RSVP_STATUS`: `pending | confirmed | declined | maybe`
- `checkinStatus` — `CHECKIN_STATUS`: `not_checked_in | checked_in | no_show`
- `invitation.sent` (bool), `invitation.sentAt` (Date)

### SubscriptionModel (`models/SubscriptionModel.js`)
- `userId` — ObjectId → User
- `planId` — ObjectId → Plan
- `packageType` — `event | subscription | hybrid`
- `status` — `SUBSCRIPTION_STATUS`: `trial | active | past_due | expired | cancelled | completed | pending | suspended`
- `invitePool` — total invite quota (pool plan)
- `invitesConsumed` — running total
- `compensationPool` — compensation invite quota
- `usage` — sub-doc: `eventsCreated`, `totalGuests`, `guestsUsed`, `lastEventDate`
- `pricePaid` — sub-doc: `amount`, `currency` (SAR), `discountCode`, `discountAmount`

### PlanModel (`models/PlanModel.js`)
- `code` — unique plan code (see PLAN_CODES below)
- `family` — `PLAN_FAMILIES`: `basic | premium | business`
- `billingType` — `BILLING_TYPES`: `event | monthly | quarterly | annual`
- `maxGuests` — invite limit per event or pool
- Feature flags: `hasWhatsAppInvites`, `hasSMSInvites`, `hasQRCode`, `hasQRScanning`, `hasRSVPTracking`, `hasAutoReminders`, `hasCustomReports`, etc. (20+ flags — `src/shared/constants/plans.js:FEATURE_LABELS`)
- `availability` — `host | whitelabel | platform_admin`

**Plan codes:** `trial`, `basic_event_25..300`, `basic_monthly_100..300`, `premium_event_25..300`, `premium_monthly_100..300`, `business_event_100..500`, `business_quarterly`, `business_annual`, `unlimited`

### TicketModel (`models/TicketModel.js`)
- `status` — `TICKET_STATUS`: `open | in_progress | waiting_response | resolved | closed`
- `priority` — `TICKET_PRIORITY`: `low | medium | high | urgent`
- `source` — `TICKET_SOURCE`: `host | whitelabel | guest | vendor | system`

### Other models
| Model | Purpose |
|-------|---------|
| `OTPModel` | OTP codes with expiry |
| `NotificationModel` | In-app notifications |
| `NotificationPreferencesModel` | Per-user notification preferences |
| `ServiceModel` | Vendor service listings |
| `TemplateModel` | WhatsApp/invitation templates |
| `TemplateCategoryModel` | Template categories |
| `PostEventContentModel` | Post-event gallery items |
| `DiscountModel` | Discount codes |
| `AddonModel` | Addon definitions |
| `AuditLogModel` | Audit trail (exists but usage is partial) |
| `GuestAccessTokenModel` | Tokens for guest portal access |
| `StaffAccessTokenModel` | Tokens for gate scanner access |
| `BusinessSetupFeeModel` | Business setup fee records |

---

## 5. Auth & RBAC

### Roles (`src/shared/constants/roles.js`)
```
SUPER_ADMIN   → manages all roles
ADMIN         → manages moderators, hosts, vendors, guests
MODERATOR     → no sub-roles (read-heavy)
WHITELABEL_ADMIN → manages whitelabel_moderator, host, vendor, guest within tenant
WHITELABEL_MODERATOR → no sub-roles
HOST          → manages guests
VENDOR        → no sub-roles
GUEST         → no sub-roles
```

### Auth middleware (`src/shared/middleware/auth.js`)
- `protect` — extracts JWT from `Authorization: Bearer <token>` or `req.cookies.jwt`; verifies with `jwt.verify()`; attaches user to `req.user`
- `restrictTo(...roles)` — checks `req.user.role` against allowed roles; returns 403 if not in list
- `filterByWhitelabel` — sets `whitelabelId` filter on queries for WHITELABEL_ADMIN/MODERATOR

### Login flow
1. `POST /auth/login` — email+password → JWT (90d expiry, set in `config.env`)
2. `POST /auth/otp/send-login` → SMS OTP via Taqnyat
3. `POST /auth/otp/verify-login` → validates OTP → JWT

No refresh token mechanism exists.

---

## 6. Multi-tenancy

- Whitelabel admins have `whitelabelId` on their UserModel document
- Hosts belonging to a whitelabel also carry `whitelabelId`
- `filterByWhitelabel` middleware (`src/shared/middleware/auth.js`) appends `{ whitelabelId: req.user.whitelabelId }` to queries when the caller is a whitelabel role
- **Risk:** scoping is middleware-level, not enforced at the DB query layer. An endpoint that bypasses the middleware (or is called with a forged token with the wrong whitelabelId) can see cross-tenant data.

---

## 7. Integrations

### Taqnyat (`src/infrastructure/taqnyat.js`)
- Custom axios wrapper around the Taqnyat SMS/WhatsApp API
- Functions: `sendSMS`, `sendWhatsAppTemplate`, `scheduleWhatsApp`, `cancelScheduled`, `getBalance`, `submitTemplateForApproval`, `getTemplateStatus`
- Supports native scheduling via Taqnyat's `scheduledDatetime` field (stores `deleteId` in event for cancellation)
- **No HMAC signature verification on incoming webhooks** (`POST /messaging/webhook`)
- **No idempotency key** — duplicate HTTP calls produce duplicate sends

### Email (`src/infrastructure/email.js`)
- Nodemailer SMTP
- 8 template categories: signup confirmation, password reset, event reminder, subscription alert, daily/weekly reports, vendor approval, whitelabel setup

### AWS S3
- `@aws-sdk/client-s3` v3
- Presigned URLs for direct frontend upload
- Local disk fallback when `AWS_ACCESS_KEY_ID` is not set
- File upload middleware in `src/shared/utils/fileUpload.js`

### No payment processor
- `pricePaid` fields exist in SubscriptionModel
- No payment SDK integrated — subscriptions are created manually or by admin

---

## 8. Background Jobs

All jobs in `src/shared/utils/scheduledTasks.js` via `node-cron`:

| Job | Schedule | What it does |
|-----|----------|-------------|
| `scheduleEventLaunch` | Every minute (`* * * * *`) | Finds `status=scheduled` events at `scheduledDate/Time`; marks them `live`; sends bulk SMS/WhatsApp. **Note:** if `taqnyatDeleteId` exists, skips send (Taqnyat handles natively) |
| `scheduleEventReminders` (host) | Daily 8:00 AM (`0 8 * * *`) | Sends in-app + email reminder to event hosts for today's events |
| `scheduleDailyAdminReport` | Daily 9:00 AM (`0 9 * * *`) | Aggregates stats → PDF → emails to all ADMIN+SUPER_ADMIN |
| `scheduleWeeklyReport` | Monday 9:00 AM (`0 9 * * 1`) | Same as daily but 7-day window |
| `scheduleSubscriptionExpiryCheck` | Daily 6:00 AM (`0 6 * * *`) | Warns users at 7/3/1 days before `endDate`; sends email at 3/1 days |
| `scheduleSubscriptionStatusUpdate` | Daily 1:00 AM (`0 1 * * *`) | Sets `active/trial` → `expired` when `endDate < now` |
| `scheduleEventCompletion` | Every hour (`0 * * * *`) | Sets `live` → `completed` for events whose `date` was >24h ago |
| `scheduleGuestReminders` | Every 30 min (`*/30 * * * *`) | Sends 24h pre-event reminders to guests (segmented by RSVP status); WA template → SMS fallback; sets `messagingStatus.reminderSent` |
| `scheduleTemplateStatusPolling` | Every 30 min (`*/30 * * * *`) | Polls Taqnyat for WhatsApp template approval status |

---

## 9. All API Endpoints (key routes)

### Auth (`/api/v2/auth`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/signup/host` | Public | Host signup |
| POST | `/signup/vendor` | Public | Vendor signup (multipart) |
| POST | `/signup/whitelabel` | Public | Whitelabel signup (multipart) |
| POST | `/login` | Public | Email+password login |
| POST | `/otp/send-signup` | Public | Send signup OTP |
| POST | `/otp/verify-signup` | Public | Verify signup OTP |
| POST | `/otp/send-login` | Public | Send login OTP |
| POST | `/otp/verify-login` | Public | Verify login OTP → JWT |
| POST | `/otp/resend` | Public | Resend OTP |
| POST | `/forgot-password` | Public | Password reset email |
| PATCH | `/reset-password/:token` | Public | Set new password |
| GET | `/validate-setup-token/:token` | Public | Validate whitelabel setup token |
| POST | `/setup-password` | Public | Set password for whitelabel post-approval |
| POST | `/resend-setup-email` | Public | Resend whitelabel setup email |
| POST | `/logout` | protect | Logout |
| GET | `/me` | protect | Get current user |
| PATCH | `/update-password` | protect | Change password |
| PATCH | `/update-me` | protect | Update profile |
| PATCH | `/complete-profile` | protect | Complete host profile |
| POST | `/send-verification-code` | protect | Send email verification OTP |
| POST | `/verify-email` | protect | Verify email |

### Events (`/api/v2/events`)
GET `/my-events`, GET `/stats`, GET `/subscription-info`, GET `/export/events`, GET `/:id`, PATCH `/:id` (update), PATCH `/:id/status`, PATCH `/:id/launch`, PATCH `/:id/schedule`, PATCH `/:id/invitation-settings`, PATCH `/:id/settings`, POST `/` (create), DELETE `/:id`, POST `/:id/staff`, PUT `/:id/staff/:staffId`, DELETE `/:id/staff/:staffId`, POST `/:id/guests`, PUT `/:id/guests/:guestId`, DELETE `/:id/guests/:guestId`, GET `/:id/guests`, PATCH `/:id/quota`

### Guests (`/api/v2/guests`)
GET `/invitation/:code` (public), POST `/rsvp` (public), protected: GET/POST/PATCH/DELETE with event context

### Messaging (`/api/v2/messaging`)
GET/POST `/webhook`, POST `/test`, GET `/templates/approved`, GET `/template/status/:eventId`, POST `/schedule`, POST `/send`, POST `/send-bulk`, POST `/retry`, POST `/send-reminder`, GET `/balance`, GET `/stats/:eventId`, GET `/status/:eventId`

### Subscriptions (`/api/v2/subscriptions`)
GET `/my-subscription`, POST `/subscribe`, POST `/change-plan`, POST `/cancel`, POST `/validate-limits`, GET `/limits`, GET `/features/:featureName`, GET `/plans`, GET `/plans/:code`

### Staff (`/api/v2/staff`)
GET `/verify` (public, rate-limited), GET `/:eventId/guests`, POST `/:eventId/checkin`, POST `/:eventId/scan`, GET `/:eventId/stats`

### Plans (`/api/v2/plans`)
GET `/admin/all` (SUPER_ADMIN), PATCH `/admin/:code` (SUPER_ADMIN), GET `/`, GET `/business`, GET `/enterprise`, GET `/host`, GET `/code/:code`, GET `/:id`

### Admin (`/api/v2/admin`)
Hosts: GET/POST/PATCH/DELETE with bulk ops + subscription management
Vendors: GET/PATCH/DELETE with bulk ops + rating
Moderators: GET/POST
Whitelabels: GET/POST/PATCH/DELETE
Events: GET/PATCH
Templates: GET/POST/PATCH/DELETE
Template categories: GET/POST/PATCH/DELETE
Reports: aggregate stats

### Tickets (`/api/v2/tickets`)
GET (list), GET `/:id`, PATCH `/:id/status`, PATCH `/:id/assign`, PATCH `/:id/rate`, GET `/export`

---

## 10. Error Handling & Cross-cutting

- **Global error handler:** `src/shared/errors/index.js` → `globalErrorHandler` — catches operational vs programmer errors, sends JSON response
- **`catchAsync`:** wrapper for all async route handlers (`src/shared/utils/catchAsync.js`)
- **`AppError`:** custom error class with `statusCode` and `isOperational` flag
- **Rate limits (`src/shared/middleware/rateLimiter.js`):**
  - API: 100 req / 15 min
  - Auth: 10 req / 1 hour
  - OTP: 1 req / min, 5 req / hour
  - Password reset: 3 req / hour
  - Webhook: 30 req / min
- **Input validation:** custom validators (`validateEmail`, `validatePhone`, `validatePassword`), Zod schemas in auth
- **NoSQL injection:** `express-mongo-sanitize` on all routes
- **Idempotency:** None — no idempotency keys on messaging, subscription, or any endpoint
- **Audit log:** `AuditLogModel` exists but is not consistently written to
- **Request correlation:** No `X-Request-ID` threading through logs

---

## 11. Key Observations & Red Flags

1. **No idempotency on WhatsApp/SMS sends** — a retry after a network timeout sends the message twice. No deduplication key in Taqnyat calls.
2. **Webhook not verified** — `POST /messaging/webhook` has no HMAC signature check. Anyone can POST to it.
3. **Tenant scoping is middleware-only** — if a route handler is called without `filterByWhitelabel` (or with a crafted request that skips it), cross-tenant data leaks. No DB-level tenant filter.
4. **No payment processor** — subscription `pricePaid` fields exist but no charge is ever made. Every subscription is effectively free or admin-created.
5. **JWT expiry 90 days, no refresh** — a compromised token stays valid for 90 days. No revocation mechanism (no token blocklist, no session table).
6. **Dual API mount** (`/api` and `/api/v2`) means all endpoints are callable at two URLs. This doubles attack surface and causes confusion in logs.
7. **Event launch cron runs every minute** — if the cron job itself takes >1 min (large guest list), the next tick fires before it finishes, potentially double-launching.
8. **`scheduleGuestReminders` 100ms delay** between guests — a 500-guest event takes 50 seconds per cron tick; for events with 1000+ guests this exceeds the 30-min cron interval.
9. **`BusinessSetupFeeModel` required in `server.js`** directly (not via module index) — smells like dead legacy code.
10. **`AuditLogModel` unused** — exists but no writes found in module code. No way to trace who changed what.
11. **Secrets in `config.env` plaintext** — `JWT_SECRET`, Taqnyat API key, AWS credentials all in a plaintext file committed alongside code.
12. **Health check does not validate DB** — `/health` returns 200 even if MongoDB is down.
