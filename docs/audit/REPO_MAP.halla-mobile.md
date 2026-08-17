# Halla Mobile — Repository Map

**Path:** `halla-mobile/`  
**Audit date:** 2026-04-27

---

## 1. Stack & Versions

| Item | Detail |
|------|--------|
| React Native | 0.81.5 |
| Expo SDK | 54.0.33 (Managed workflow) |
| Navigation | `@react-navigation/native`, `@react-navigation/stack`, `@react-navigation/bottom-tabs` |
| HTTP client | `fetch` (native) — `axios` imported but unused |
| State management | Zustand + `@tanstack/react-query` |
| Token storage | `@react-native-async-storage/async-storage` — **PLAINTEXT** |
| i18n | `i18next` + `react-i18next`, custom `useTranslation()` hook |
| Fonts | Expo Google Fonts (`@expo-google-fonts/cairo`) |
| Icons | `@expo/vector-icons` (Ionicons, FontAwesome, MaterialCommunityIcons) |
| Image picker | `expo-image-picker` |
| RTL | Context-based direction via `useLanguage()` hook (NOT `I18nManager`) |
| JS | JavaScript (not TypeScript) |

---

## 2. Entry Points & Navigation

**App entry:** `App.js` → wraps `SafeAreaProvider → QueryClientProvider → LanguageProvider → ToastProvider → AppNavigator`

### Navigator tree (`navigation/AppNavigator.js`)

```
AppNavigator (Stack)
├── If not authenticated:
│   ├── WelcomeWrapper      (language selection + onboarding)
│   ├── Login               (LoginScreen)
│   ├── Signup              (SignupScreen — host OTP flow)
│   ├── VendorSignup        (VendorSignupScreen — 6-step form)
│   ├── WhitelabelSignup    (WhitelabelSignupScreen — 5-step form)
│   └── ForgetPassword      (ForgetPasswordScreen)
│
├── If role = HOST:
│   └── HostTabs (BottomTab)
│       ├── Home            (HomeScreen)
│       ├── Events          (EventsScreen)
│       ├── Tickets         (TicketsScreen)
│       ├── Marketplace     (Marketplace)
│       └── Settings (Stack)
│           ├── SettingsMain      (SettingsScreen)
│           ├── AccountSettings   (AccountSettingsScreen)
│           └── NotificationSettings (NotificationSettingsScreen)
│   Plus modal/stack screens:
│       CreateEvent, UpdateEvent, Plans, PlansSummary, PostEvent,
│       HostPostEvent, Notifications, WhitelabelPlans, WhitelabelPlansSummary
│
├── If role = VENDOR:
│   └── VendorTabs (BottomTab)
│       ├── VendorHome      (VendorHomeScreen)
│       ├── Tickets         (VendorTicketsScreen)
│       ├── Marketplace     (Marketplace)
│       └── VendorSettings (Stack)
│           ├── VendorSettingsMain  (VendorSettingsScreen)
│           └── VendorAccountSetup  (VendorAccountSetupScreen)
│   Plus: VendorServices screen
│
├── If role = ADMIN / SUPER_ADMIN / MODERATOR / WHITELABEL_*:
│   └── AdminNavigator (navigation/AdminNavigator.js)
│       └── AdminTabs (BottomTab — tabs filtered by role permissions)
│           ├── Dashboard    (admin-dashboard screens)
│           ├── Hosts
│           ├── Events
│           ├── Tickets
│           └── More (additional admin screens)
│
└── StaffPortal (StaffPortalScreen) — standalone, auth via staff access token
```

---

## 3. Screens (28 total)

| Screen | File | Role(s) | Purpose |
|--------|------|---------|---------|
| LoginScreen | `screens/LoginScreen.js` | All | Email+pw (admin/vendor) or OTP (host) |
| SignupScreen | `screens/SignupScreen.js` | Host | 3-step: phone → OTP → profile |
| VendorSignupScreen | `screens/VendorSignupScreen.js` | Vendor | 6-step vendor registration |
| WhitelabelSignupScreen | `screens/WhitelabelSignupScreen.js` | WL admin | 5-step whitelabel registration |
| ForgetPasswordScreen | `screens/ForgetPasswordScreen.js` | All | Password reset via email |
| HomeScreen | `screens/HomeScreen.js` | Host | Event overview, stats, quick actions |
| EventsScreen | `screens/EventsScreen.js` | Host | Event list |
| CreateEventScreen | `screens/CreateEventScreen.js` | Host | 4-step event creation wizard |
| UpdateEventScreen | `screens/host/UpdateEventScreen.js` | Host | Edit existing event |
| PlansScreen | `screens/PlansScreen.js` | Host | Subscription plan selection |
| PlansSummaryScreen | `screens/PlansSummaryScreen.js` | Host | Plan purchase summary |
| WhitelabelPlansScreen | `screens/WhitelabelPlansScreen.js` | WL admin | Whitelabel plan selection |
| WhitelabelPlansSummaryScreen | `screens/WhitelabelPlansSummaryScreen.js` | WL admin | WL plan summary |
| TicketsScreen | `screens/TicketsScreen.js` | Host | Support tickets |
| VendorTicketsScreen | `screens/VendorTicketsScreen.js` | Vendor | Vendor support tickets |
| Marketplace | `screens/Marketplace.js` | Host/Vendor | Vendor service marketplace |
| SettingsScreen | `screens/SettingsScreen.js` | Host | Account settings |
| AccountSettingsScreen | `screens/AccountSettingsScreen.js` | Host | Profile edit |
| NotificationSettingsScreen | `screens/NotificationSettingsScreen.js` | Host | Notification preferences |
| NotificationsScreen | `screens/NotificationsScreen.js` | Host | In-app notification list |
| VendorHomeScreen | `screens/VendorHomeScreen.js` | Vendor | Vendor dashboard |
| VendorServicesScreen | `screens/VendorServicesScreen.js` | Vendor | Manage vendor services |
| VendorSettingsScreen | `screens/VendorSettingsScreen.js` | Vendor | Vendor settings |
| VendorAccountSetupScreen | `screens/VendorAccountSetupScreen.js` | Vendor | Vendor profile setup |
| PostEventScreen | `screens/PostEventScreen.js` | Host | View post-event content/gallery |
| HostPostEventScreen | `screens/HostPostEventScreen.js` | Host | Upload post-event content |
| StaffPortalScreen | `screens/StaffPortalScreen.js` | Staff | Gate scanner / check-in |
| Admin dashboard screens | `screens/admin-dashboard/` | Admin roles | ~19 admin screens |

---

## 4. Components

130+ files organized under `components/`:

| Group | Purpose |
|-------|---------|
| `components/auth/` | Login form, OTP input, signup steps |
| `components/auth/vendor/` | 6-step vendor signup substeps |
| `components/auth/whitelabel/` | 5-step whitelabel signup substeps |
| `components/createEvent/` | StepOne–StepFour, GuestQuotaCounter, EventSummary |
| `components/events/` | EventList, EventListItem, event detail components |
| `components/home/` | StatsCards, LastEvent, EventActionsHeader, EventTemplates |
| `components/plans/` | MonthlyPlans, SingleEventPlans, ServiceModeToggle |
| `components/tickets/` | TicketList, TicketItem, CreateTicket |
| `components/marketplace/` | ServiceList, VendorPopup, CategoryFilter |
| `components/admin-dashboard/` | 60+ admin-specific components (events, hosts, vendors, moderators, whitelabels, subscriptions, payments, discounts, tickets, templates, settings) |
| `components/shared/` | Shared UI primitives |
| `components/commen/` | **typo** — should be `common/`; common utility components |
| `components/welcom/` | **typo** — should be `welcome/`; WelcomeWrapper, language selector |
| `components/languagePrefrence/` | **typo** — should be `languagePreference/` |
| `components/notifications/` | Notification list item, badge |
| `components/settings/` | Settings form components |
| `components/vendor/` | Vendor dashboard components |

---

## 5. API / Service Layer

**Base URL (hardcoded):** `https://labbe-backend-production.up.railway.app/api/v2`  
File: `config/api.js:5`

**No dev/staging variant** — single hardcoded production URL.

### Service files and endpoint coverage

| Service | File | Key endpoints |
|---------|------|---------------|
| authService | `services/authService.js` | login, signup (host/vendor/whitelabel), OTP send/verify/resend, forgot/reset password, complete-profile, me, update-me, update-password, logout, send-verification-code |
| eventsService2 | `services/eventsService2.js` | my-events, create, get by id, update, delete, stats, subscription-info, launch, schedule, invitation-settings |
| dashboardService | `services/dashboardService.js` | admin dashboard stats |
| plansService | `services/plansService.js` | get plans (host, whitelabel, business) |
| subscriptionService | `services/subscriptionService.js` | my-subscription, subscribe, change-plan, cancel, limits, validate-limits |
| ticketsService | `services/ticketsService.js` | list, create, update status |
| notificationService | `services/notificationService.js` | list, mark-read, mark-all-read, clear, count, preferences |
| vendorService | `services/vendorService.js` | vendor profile, update, services CRUD |
| marketplaceService | `services/marketplaceService.js` | vendor list, vendor by id, service search |
| postEventService | `services/postEventService.js` | public post-event gallery |
| hostPostEventService | `services/hostPostEventService.js` | host post-event upload, manage |
| messagingService | `services/messagingService.js` | send, bulk, test, reminder, stats, status, templates |
| staffService | `services/staffService.js` | verify access, check-in, scan, stats, guest list |
| templateService | `services/templateService.js` | list templates, get by id |
| settingsService | `services/settingsService.js` | update profile, notification settings |
| adminDashboardService | `services/adminDashboardService.js` | all admin CRUD (hosts, vendors, events, tickets, payments, plans, moderators, whitelabels, discounts, templates) |
| EventsService | `services/EventsService.js` | **validation only** — event form validation helpers (not API calls; confusing name) |

### Token attachment
Each service manually constructs the `Authorization: Bearer <token>` header by reading the token from Zustand store or AsyncStorage. **No global HTTP interceptor.** If a service call forgets to attach the header, it silently fails with a 401 that may not propagate correctly.

---

## 6. Auth & Roles

### Login flows
- **Host:** OTP flow — `POST /auth/otp/send-login` → `POST /auth/otp/verify-login` → JWT
- **Vendor / Admin roles:** email+password — `POST /auth/login` → JWT

### Token storage
```
AsyncStorage.setItem('@auth_state', JSON.stringify({ token, user, subscription }))
```
**Plaintext in AsyncStorage** — no encryption, no `expo-secure-store`. A device with root access or a backup can extract the JWT.

### Role-based navigation
`AppNavigator.js` reads `authStore.user.role` and routes to:
- `host` → HostTabs
- `vendor` → VendorTabs  
- `admin | super_admin | moderator | whitelabel_admin | whitelabel_moderator` → AdminNavigator

### RBAC in admin panel
`AdminNavigator.js` maintains a permissions matrix: 5 admin roles × 12 admin pages → `FULL | EDIT | VIEW | NONE` access levels. Tabs and actions are conditionally rendered based on `user.role`.

### Full role list (found in code)
`host`, `vendor`, `super_admin`, `admin`, `moderator`, `whitelabel_admin`, `whitelabel_moderator`

---

## 7. Multi-tenancy / Whitelabel

- Mobile does not have dynamic tenant switching — one app instance = one tenant context
- `whitelabel_admin` and `whitelabel_moderator` roles receive scoped data from backend (backend applies `filterByWhitelabel` middleware)
- No subdomain logic on mobile — tenant is determined by the logged-in user's `whitelabelId` on the backend

---

## 8. i18n / RTL / Arabic

### Setup
- `i18next` + `react-i18next`; initialized in `localization/index.js`
- Languages: `ar` (Arabic) and `en` (English)
- Default: `ar`
- Language choice persisted in `AsyncStorage('@app_language')`
- `LanguageProvider` context provides `language`, `direction`, `changeLanguage()`
- `useTranslation(namespace)` hook wraps `react-i18next`

### Locale files
14 JSON files per language under `localization/locales/{ar,en}/`:
`admin`, `auth`, `common`, `events`, `home`, `marketplace`, `plans`, `postEvent`, `settings`, `staff`, `tickets`, `vendor`, `welcome` + `index.js`

### RTL approach
- Direction (`'rtl' | 'ltr'`) passed as prop from `useLanguage()`
- Components conditionally apply `flexDirection: 'row-reverse'`, `textAlign: 'right'`, etc.
- `I18nManager.forceRTL()` is **NOT** called — RTL is entirely layout-based, not OS-level
- **Risk:** third-party components that rely on OS-level RTL may render incorrectly in Arabic

### Arabic number formatting
No explicit `toLocaleString('ar-SA')` found — numbers likely render as Latin digits in Arabic UI.

---

## 9. All API Calls (via config/api.js)

The `ENDPOINTS` object in `config/api.js` is the canonical list. Key groups:

- **AUTH (15):** login, signup host/vendor/whitelabel, OTP send/verify (login+signup), resend OTP, complete-profile, forgot-password, logout, me, update-me, update-password, send-verification-code
- **EVENTS (16):** my-events, create, get-by-id, update, delete, stats, subscription-info, launch, schedule, invitation-settings, settings, guests (CRUD), quota, export
- **GUESTS (4):** invitation by code (public), RSVP (public), list, export  
- **PLANS (5):** host, whitelabel, business, by-code, by-id
- **SUBSCRIPTIONS (6):** my-subscription, subscribe, change-plan, cancel, limits, features
- **TICKETS (3):** list, create, update-status
- **NOTIFICATIONS (6):** list, mark-read, mark-all-read, clear, count, preferences
- **MESSAGING (8):** send, bulk, test, reminder, stats, status, templates/approved, template status
- **POST-EVENT (11):** public gallery, host CRUD, upload
- **STAFF (4):** verify, check-in, scan, stats, guest-list
- **LOCATIONS (3):** regions, cities, districts
- **USERS (3):** profile, update, vendors list
- **TEMPLATES (2):** list, get-by-id
- **DASHBOARD (3):** stats, host counts, event counts

---

## 10. Web ↔ Mobile Parity (preliminary)

| Feature | Web | Mobile | Gap |
|---------|-----|--------|-----|
| Host login (OTP) | ✓ | ✓ | — |
| Admin/vendor login (pw) | ✓ | ✓ | — |
| Host signup | ✓ | ✓ | — |
| Vendor signup (6-step) | ✓ | ✓ | — |
| Whitelabel signup | ✓ | ✓ | — |
| Event creation wizard | ✓ 5-steps | ✓ 4-steps | **Web has Step 5 (template confirm); mobile stops at Step 4 (summary)** |
| Event list | ✓ | ✓ | — |
| Plans / subscription | ✓ | ✓ | — |
| Support tickets | ✓ | ✓ | — |
| Marketplace | ✓ | ✓ | — |
| Post-event | ✓ | ✓ | — |
| Gate scanner (staff) | ✓ | ✓ | — |
| Admin dashboard | ✓ full | ✓ partial | Mobile admin has limited views vs full web admin |
| Password reset (email) | ✓ | ✓ | — |
| Notification preferences | ✓ | ✓ | — |
| Whitelabel setup flow | ✓ | ✗ | **Mobile missing whitelabel onboarding after approval** |
| Ticket assignment (admin) | ✓ | ✗ | Mobile admin cannot assign tickets |
| Export (events/guests) | ✓ | ✗ | No export on mobile |
| Bulk guest operations | ✓ | ✗ | No bulk ops on mobile |

---

## 11. Key Observations & Red Flags

1. **Plaintext token storage** (`AsyncStorage`) — a rooted device or full backup exposes the JWT. Should use `expo-secure-store`.
2. **No global HTTP interceptor** — token is manually attached in every service function. Any service that forgets the header silently fails. Central interceptor would also catch 401s and trigger re-auth.
3. **No token refresh** — JWTs expire in 90 days (backend setting). On expiry, the user gets a silent 401 with no feedback loop.
4. **No pagination anywhere** — all list endpoints fetch unbounded result sets. A host with 500+ events will load everything at once.
5. **No request timeout** — `fetch` with no timeout means a stalled request hangs indefinitely with no UX feedback.
6. **No error boundaries** — an uncaught render error crashes the whole app instead of showing a fallback UI.
7. **`axios` imported but unused** — dead dependency, increases bundle size.
8. **`EventsService.js` vs `eventsService2.js`** — naming confusion; `EventsService.js` is actually a validator, not an API service. Should be renamed.
9. **Three typos in folder names:** `commen/`, `welcom/`, `languagePrefrence/` — minor but signals low attention to naming.
10. **No tests** — zero `.test.js` files in the repo.
11. **No error tracking** (Sentry or similar) — crashes in production are silent.
12. **RTL via CSS layout only** — OS-level RTL (`I18nManager`) not set. Third-party components may render LTR in Arabic context.
13. **Arabic numerals not localized** — numbers display as Latin digits in the Arabic UI.
14. **Console.log statements throughout services** — including sensitive data like login attempts (`[AUTH SERVICE] Login attempt: { email }`).
15. **Web event wizard has 5 steps; mobile has 4** — functional divergence that may confuse users who switch platforms.
