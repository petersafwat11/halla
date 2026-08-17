# Halla Frontend - Repository Map

## Summary
Next.js 15 + React 19 SaaS frontend for Arabic-first RTL event management platform.
- JavaScript (not TypeScript)
- i18next for i18n, zustand for state, React Query for data
- 7 user roles, RBAC via middleware + hooks
- Whitelabel multitenancy support
- 200+ API endpoints via fetch/axios

## Stack
- Next.js 15.5.9, React 19, JavaScript
- @tanstack/react-query 5.90.21 (server state)
- zustand 5.0.6 (client state)
- i18next 25.2.1, next-i18n-router 5.5.2
- axios 1.10.0, react-hook-form 7.57.0, zod 3.25.56
- React-toastify, recharts, swiper, html2canvas, xlsx

## Key Modules
- /hooks/reactQueryHooks - useAuthMutation, useAdmin, useEvents, etc.
- /services - apiClient (fetch), new-backend/apiClient (axios), admin/event/messaging/notification services
- /stores - Zustand: authStore (persisted), messagingStore, notificationStore
- /ui - Components by page (auth, admin-dash, host-dash, vendor-dash)
- /localization - i18n setup, 30+ translation files per language

## Auth
- Two login modes: OTP (hosts) and email/password (admins)
- Cookies: token, userType, profileCompleted
- Roles: SUPER_ADMIN, ADMIN, MODERATOR, WHITELABEL_ADMIN, WHITELABEL_MODERATOR, HOST, VENDOR
- Guards: middleware + usePageAccess hook

## Routes
- Public: /, /privacy, /terms, /market-place
- Auth: /login, /signup, /signup-vendor, /signup-whitelabel, /forget-password
- Host: /host/* (events, payments, plans, tickets, settings)
- Admin: /admin-dash/* (all CRUD: hosts, vendors, moderators, whitelabels, events, tickets, payments, discounts, plans, templates, settings)
- Vendor: /vendor-dashboard/*

## i18n & RTL
- Locales: ar (default), en
- RTL: HTML dir attribute per locale, Cairo font for Arabic
- Locale detection: Cookie → Accept-Language → ar
- useLanguageChange() hook for switching

## APIs (200+ endpoints)
- Auth (12): login, signup, OTP, password reset
- Events (20+): CRUD, export, guests, staff
- Admin (100+): hosts, vendors, moderators, whitelabels, events, tickets, payments, discounts, plans, templates
- Messaging (9): send, bulk, test, reminder, schedule, stats, template
- Notifications (7), Post-Event (7), Vendor Services (7), Staff (4), Subscriptions (5), Locations (5), Plans (5)

## State Management
- Zustand authStore (persisted to localStorage) - user, token, subscription
- React Query hooks for API data caching
- messagingStore for invitation state (no React Query)
- notificationStore, sidebarStore

## Critical Issues
1. No session validation on app mount
2. Two parallel API clients (fetch + axios) - inconsistent
3. No Error Boundaries
4. Hardcoded localhost default for API
5. Token expiration race condition (multiple 401 redirects)
6. No refresh token flow
7. Cookies not HttpOnly (by design)
8. Messaging store outside React Query
9. No explicit tenant context (relies on backend RLS)
10. Admin routes not namespaced by role
11. localStorage not fully cleared on logout
12. No E2E tests, no Storybook, no error tracking (Sentry)
13. No README or .env.example
14. Whitelabel routing normalized in middleware (may break nav)
15. Unused legacy authService.js

## Deployment
- Set NEXT_PUBLIC_API_URL environment variable
- WhatsApp Business Account, AWS S3, payment provider integration
- Google Maps API key
- Backend auth response format: {token, data: {user, subscription}}
- CSP headers required

