# Phase 9 — End-to-End Smoke Checklist

This is the **manual** half of Phase 9 verification. The CI gate
(`lint`, `next build`, `expo export`, lock-in ESLint rules) catches structural
regressions automatically; this checklist catches behavior regressions that
only surface at runtime.

Run before every release. Capture results in the PR description or a
shared note. If a step fails, file a follow-up issue with the exact step
and the broken behavior — do not patch silently.

**Scope per `UNIFICATION_REPORT.md` §3 Phase 9:**

> End-to-end smoke on both apps: auth (4 paths: host email, host OTP,
> vendor, whitelabel) + **full forgot-password reset on mobile**, event create
> wizard (host + admin), guest CRUD, plan checkout (with 3DS), admin
> host/vendor list, notifications, post-event guest portal.

---

## Pre-flight

- [ ] Both apps point at the same backend environment (staging or prod, your call — note which).
- [ ] Backend version recorded: `__________` (from `/api/v2/health` or commit SHA).
- [ ] Web build deployed (or `npm run dev` against the same backend).
- [ ] Mobile build installed on a **physical device** for both iOS and Android (simulator behavior diverges for deep links and SecureStore).
- [ ] One disposable test host account and one test vendor account ready.

---

## Auth — 4 paths × 2 apps

| Flow | Web (labbe) | Mobile (halla-mobile) |
| --- | --- | --- |
| Host email/password login | [ ] | [ ] |
| Host OTP login (phone) | [ ] | [ ] |
| Vendor signup (full multi-step) | [ ] | [ ] |
| Whitelabel signup (full multi-step) | [ ] | [ ] |
| Logout (token cleared from storage; refreshing returns to login) | [ ] | [ ] |

### Forgot password — mobile is the **must-verify** one

UNIFICATION_REPORT §1.5 flagged the mobile reset-password completion screen + deep link as the only remaining cross-app UX gap. Phase 4b shipped the fix; this checklist verifies it end-to-end.

- [ ] Web: request password reset → email arrives → click link → land on `/reset-password/:token` → set new password → log in with new password.
- [ ] **Mobile: request password reset → email arrives → tap link on the device** → app opens directly on `ResetPasswordScreen` with the token populated (NOT a deep-link-handler fallback that shows the home tab first) → set new password → log in.
- [ ] Mobile deep link works on a freshly-installed app (no warm session in memory).
- [ ] Mobile deep link works on iOS *and* Android.

---

## Event create wizard

| Step | Web | Mobile |
| --- | --- | --- |
| Host route: 4-step wizard end-to-end → event created → appears in events list | [ ] | [ ] |
| Admin-for-host route: admin creates event on behalf of a host → host sees it under their account | [ ] | [ ] |
| FormData replay invariant (web): trigger a 401 during step 2 submit → refresh succeeds → original FormData replays. | [ ] | n/a |
| FormData replay limitation (mobile): trigger a 401 during a FormData submit → refresh succeeds → submit fails cleanly with a user-visible error (per `apiClient.js` documented limitation — do NOT silently retry). | n/a | [ ] |
| Test-message: from event detail, send test message → mobile receives | [ ] | [ ] |
| Retry-launch: simulate a failed launch → the failure banner appears → retry button kicks off a fresh launch | [ ] | [ ] |

---

## Guest CRUD

- [ ] Add guest manually (one) — web. [ ] mobile.
- [ ] Import guests via XLSX — web. [ ] mobile.
- [ ] Edit guest contact — web. [ ] mobile.
- [ ] Rotate guest QR — web. [ ] mobile.
- [ ] Revoke guest access — web. [ ] mobile.
- [ ] Delete guest — web. [ ] mobile.

---

## Plan checkout (with 3DS)

- [ ] Host: select a paid plan → checkout → enter test 3DS-required card (Moyasar test cards) → 3DS challenge appears → confirm → returns to app with `requiresAction: true` polled to `succeeded` → plan reflected in account.
- [ ] Web: as above. [ ] Mobile: as above.
- [ ] Cancellation mid-3DS surfaces a user-visible error (no spinner-of-doom).
- [ ] Webhook reconciliation: a successful payment shows up in the admin plan history within 60 s.

---

## Admin host/vendor list

- [ ] Admin dashboard → hosts tab → list paginates → filter by role/status works.
- [ ] Bulk action on hosts (e.g., bulk suspend) → backend confirms → list refreshes.
- [ ] Vendors tab → list paginates → filter works.
- [ ] Web *and* mobile both render the same counts for the same filter combo.

---

## Notifications

- [ ] Trigger an action that generates a notification (e.g., guest RSVP) → both apps' notification bell badge updates within 30 s (per the documented `refetchInterval`).
- [ ] Mark one as read → badge decrements on both clients.
- [ ] Mark all as read → both clients zero out.
- [ ] Notification list shows the same items on both apps for the same user.

---

## Post-event guest portal

- [ ] Open a guest's post-event link (issued via QR or notification) → portal loads with content gated by the token.
- [ ] Like a moment / post a comment → backend persists → other guests see it.
- [ ] Try with an expired/revoked token → 410 Gone surfaces a friendly error (NOT a raw stack).

---

## Cross-cutting checks

- [ ] No `/api/v2/` literals slipped into source code (the CI ESLint gate covers this, but a final `grep -rn '/api/v2/' labbe halla-mobile shared --include='*.js' | grep -v node_modules` should return nothing outside `paths.js`, `config/api.js`, `next.config.mjs`, and eslint configs).
- [ ] No `console.log` regressions in mobile services (search `halla-mobile/services` for `console.log` — should not have grown since the last release).
- [ ] Bundle sizes: labbe `next build` first-load JS shared by all stays under ~110 kB; mobile `expo export --platform web` stays under ~7 MB. Note today's numbers in the PR.

---

## Sign-off

| Item             | Tester | Date | Notes |
| ---------------- | ------ | ---- | ----- |
| Auth — 4 paths   |        |      |       |
| Forgot password  |        |      |       |
| Event wizard     |        |      |       |
| Guest CRUD       |        |      |       |
| Plan + 3DS       |        |      |       |
| Admin lists      |        |      |       |
| Notifications    |        |      |       |
| Post-event       |        |      |       |
| Cross-cutting    |        |      |       |
