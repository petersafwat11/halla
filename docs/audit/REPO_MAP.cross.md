# Halla Product Cross-Repository Map

**Audit Date:** 2026-04-28  
**Scope:** Three-repo monorepo (labbe web, labbe-backend, halla-mobile)

## 1. Workspace Layout

**Single Git Repo Structure:**
- `labbe/` — Next.js 15 web frontend
- `labbe-backend-/` — Express.js + MongoDB backend  
- `halla-mobile/` — React Native + Expo mobile app
- `docs/audit/` — This report directory

**Root package.json:** Minimal (ssh2 only); no workspaces/lerna.

---

## 2. Shared Concept Map

| Concept | Backend Model | Endpoint(s) | Web | Mobile | Notes |
|---------|---|---|---|---|---|
| User/Auth | UserModel (unified) | POST /auth/login, /signup/*, /otp/* | useAuthMutation, Zustand | OTP-based signup | Mobile password reset missing |
| Event | EventModel | POST/GET/PATCH /events, /admin/* | useEventMutations | Full CRUD in config | Consistent across platforms |
| Guest/RSVP | GuestModel | GET /guests/invitation/:code, POST /rsvp | Public portal | Public portal | Same endpoint, no auth |
| Subscription | SubscriptionModel, PlanModel | POST /subscriptions/subscribe, GET /plans | usePlans, useSubscriptions | Plans in signup | Consistent |
| Ticket | TicketModel | POST/PATCH /tickets/:id | useTicketMutations | Not visible | Mobile missing |
| Vendor | UserModel (role=vendor) | POST /auth/signup/vendor, GET /users/vendors | useVendorSignup | useVendorSignup | Vendor approval workflow |
| Whitelabel | UserModel.whitelabelId | POST /auth/signup/whitelabel | Tenant isolation | Not in mobile config | Mobile tenant awareness missing |
| Post-Event | PostEventContentModel | GET /post-event/:eventId/*, uploads | Gallery view | Not visible | Separate guest tokens |
| Notification | NotificationModel | GET /notifications, read/clear | Preferences API | Not visible | Mobile incomplete |

---

## 3. API Endpoint Summary

**Base:** `/api/v2` and `/api` (dual mount for backward compatibility)

**Total Endpoints:** 100+

**Major Routes:**
- **Auth (20):** signup, login, OTP, password reset, logout, profile
- **Events (30+):** CRUD, guests, staff, settings, stats, exports, admin
- **Guests (7):** public invitation/RSVP, protected list/CRUD/export
- **Users (13):** profile, hosts, vendors, moderators
- **Subscriptions (9):** manage, limits, plans, features
- **Staff (4):** verify, check-in, guest list, stats
- **Tickets (11):** CRUD, assign, rate, export
- **Messaging, Templates, Locations, Post-Event, Admin, Discounts, Addons**

---

## 4. Auth Token Flow

**Web (Next.js):**
```
Login → POST /auth/login → JWT returned
js-cookie.set('token', {secure, httpOnly}) → Zustand authStore
axios adds Bearer header → Backend protect middleware
Logout → remove cookies + clear store
```

**Mobile (React Native):**
```
OTP → POST /auth/otp/verify-login → JWT returned
AsyncStorage.setItem('token') → Zustand context
axios adds Bearer header → Same backend middleware
Logout → removeItem + clear context
```

**Differences:**
| Aspect | Web | Mobile |
|--------|-----|--------|
| Storage | js-cookie + Zustand | AsyncStorage + Zustand |
| Persistence | 7-day cookie | Until logout |
| Refresh | None | None |

---

## 5. Environment & Config

**Backend (config.env):**
- NODE_ENV, PORT, DATABASE, JWT_SECRET, JWT_EXPIRES_IN=90d
- FRONTEND_URL, EMAIL (SMTP), TAQNYAT (SMS), AWS (S3)

**Web:**
- No .env visible; API_BASE_URL hardcoded
- `https://labbe-backend-production.up.railway.app/api/v2`

**Mobile:**
- Same hardcoded URL in config/api.js
- No dev/staging variants

**Issues:** Hardcoded URLs, plaintext secrets in config.env, AWS credentials exposed.

---

## 6. Divergences

**Field Names:**
- Backend: `mobile` field; Frontend: `phoneNumber` input (normalized by middleware)

**Endpoints:**
- Dual paths: `/guests/events/:eventId` AND `/events/:eventId/guests`

**Roles/Status:**
- Not centralized; risk of frontend/backend mismatch
- 7 backend roles (HOST, ADMIN, VENDOR, WHITELABEL_ADMIN, MODERATOR, etc.)
- Mobile lacks admin/moderator UI

**Gaps:**
- RSVP status values not enumerated in frontend code
- Ticket status/priority not documented
- Event draft/publish logic unclear

---

## 7. Missing Features

**Backend Endpoints Not Called by Web/Mobile:**
- Whitelabel setup (`/auth/setup-password`, `/auth/validate-setup-token`)
- Admin bulk operations
- Ticket assignment, export

**Mobile Features Missing (backend exists):**
- Ticket management
- Admin dashboard
- Whitelabel setup
- Post-event gallery
- Notification preferences

---

## 8. Recommendations

1. **Security:** Move secrets to secret manager; implement token refresh
2. **API:** Centralize enum constants; standardize endpoint naming; share TypeScript types
3. **Environments:** Add `.env.local` pattern; support dev/staging/prod builds
4. **Mobile:** Implement missing admin/ticket/gallery features
5. **Docs:** Generate OpenAPI spec from Swagger comments; document shared enums

