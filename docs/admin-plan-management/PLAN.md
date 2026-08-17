# Implementation Plan — 2026-06-23 batch

Four independent workstreams. Each ships as its **own verified commit** (not one mega-diff).
Order: (1) mobile export → download, (2) admin time-range crash, (3) vendor settings rewrite,
(4) admin "Manage Plan" two-mode popup + unification. **Task 4 is plan-first — do not implement
until reviewed/approved.**

---

## TASK 1 — Mobile exports: download instead of share

**Decision (from user):** Android → silent direct save to the device **Downloads** folder + toast.
iOS → native **"Save to Files"** dialog (iOS has no general Downloads folder for xlsx/csv/pdf).

**Single chokepoint:** every admin + user export funnels through
`halla-mobile/utils/download.js → saveBlobAndShare()`, and the guest template through
`halla-mobile/utils/xlsxUtils.js → exportTemplateXLSX()`. Both call `Sharing.shareAsync()` today.
Libraries already installed: `expo-file-system@~19`, `expo-sharing@~14`. **No new dependency.**

**Changes:**
1. `utils/download.js` — rename/repurpose to `saveBlobToDevice(blob, filename, opts)`:
   - Write base64 to a cache file (as today).
   - **Android:** `StorageAccessFramework.requestDirectoryPermissionsAsync()` (persist the granted
     tree URI in AsyncStorage so we only prompt once) → `createFileAsync(dir, name, mime)` →
     `writeAsStringAsync(uri, base64, { encoding: Base64 })`. Return `{ success, savedTo: "Downloads" }`.
     Fallback to `Sharing.shareAsync` if the user denies the directory grant.
   - **iOS:** `Sharing.shareAsync(fileUri, { UTI, mimeType })` — on iOS this surfaces the system
     "Save to Files" sheet (the iOS-native save). (No Expo API exposes the bare UIDocumentPicker
     export dialog in managed workflow; the share sheet's "Save to Files" is the supported path.)
2. `utils/xlsxUtils.js` — route `exportTemplateXLSX` through the same helper.
3. Keep all call sites unchanged (they already await the helper and show a toast). Update the two
   user-facing handlers that branch on `share.success` to read `result.savedTo` for the toast copy.
4. `app.json` — confirm no extra Android permission needed for SAF (it does not require
   WRITE_EXTERNAL_STORAGE). No native rebuild expected.

**Verify:** Android emulator/device → export Hosts/Events/Guests → file lands in Downloads, no share
sheet. iOS → "Save to Files" appears. Toast copy correct in ar/en.

---

## TASK 2 — Admin events page: time-range crash (end-to-end)

**Confirmed bugs (fix regardless of the crash):**
- `ui/admin/dateRange/DateRange.js` passes the "all time" preset value `{ from: null, to: null }`
  straight into `react-day-picker@^9.7.0`, whose `selected` expects `undefined` (v9 breaking change).
  The `classNames` also mix v8 keys (`day_selected`, `day_today`) with v9 keys (`month_caption`).
- Backend date filtering is **inconsistent**: `events.getAllEvents` honors `from`/`to`
  (`events.crud.service.js:286`), but `tickets.service.getTickets` **silently drops them**
  (`tickets.service.js:99`), and `admin.payments` applies the range to the rows but **not** to the
  stats aggregation (`baseMatch={}`), so stat cards ignore the filter.

**Status of the events-specific crash:** the events data path (page → EventStats → EventsTable →
StatsCards) is null-guarded and the backend handles dates, so I could not reproduce the exact crash
by static analysis, and the backend can't be booted here (no `.env`/secrets). **I need the exact
error text from the events page** to pin it. Leading candidates: (a) the v9 `{from:null,to:null}`
issue when "all time"/clear is used; (b) a runtime error only visible at run time.

**Changes:**
1. `DateRange.js` — represent "all time" as `undefined` (or `{from: undefined, to: undefined}`),
   pass `selected={range?.from ? range : undefined}` to `DayPicker`, and migrate `classNames`/
   `modifiersClassNames` to v9 keys so styling + selection are correct.
2. `Header.js` — already null-guarded; add a defensive guard before `.toISOString()` (no-op if dates
   are always Date objects, but cheap insurance) and ensure clearing deletes both params.
3. Backend — make `from`/`to` honored **consistently and optionally** (absent = no filter, so mobile,
   which sends neither, is unaffected). Apply the existing `buildDateRangeQuery` helper to both the
   list query and the stats aggregation for every admin list that shows the date control
   (tickets list + stats; payments stats; audit others). Events already works — verify only.
4. After the user provides the error text, apply the precise fix and confirm it's gone.

**Verify:** events page + a second page (tickets) — apply a range, clear it, pick "all time"; no
crash, list + stat cards both reflect the range; no range = unchanged behavior.

---

## TASK 3 — Vendor settings (web): clean rewrite, same functionality

**Page:** `app/[lang]/vendor-dashboard/settings/page.js` — one route, 4 section cards + modals:
PersonalInfo, ServiceDetails, ImagesAndPricing, AdditionalLinks. CSS Modules + tokens in
`globals.css`. i18n namespace `vendorSettings`.

**Hard rule (preserve byte-for-byte):** every API call, hook, Zod schema, and payload stays
identical. The two things a "from scratch" rewrite silently breaks — guard them explicitly:
- the **phone-change OTP** two-step flow (`sendPhoneChangeOtp` → `updatePhone`),
- the **signed-URL-key image deletes** (`DELETE /users/profile/vendorImage` with `{ field, key }`
  where `key` is parsed out of the signed S3 URL).

**Approach:** restructure presentational JSX + CSS only, section by section, reusing the existing
handlers/hooks/schemas. Unify on design tokens (`--color-*`, `--spacing-*`, `--radius-*`, type
scale), one shared card/field/button pattern, and consistent breakpoints (1024 / 768 / 480).
Keep RTL (`dir`) handling and all translation keys.

**Verify:** desktop + tablet + mobile widths; edit/save each section; logo + image upload/delete;
phone OTP; password change; cancel→refetch. Visual QA via Playwright per the documented setup.

---

## TASK 4 — Admin "Manage Plan" popup (two modes) + unification  ⟵ REVIEW THIS

### Confirmed root causes / facts
- **Dropdown doesn't load:** `GET /plans/admin/all` is gated by
  `requirePageAccess(MANAGE_PLANS, 'view')`, but role `admin` has `MANAGE_PLANS: NONE`
  (`permissions.js:116`) — every non-super-admin gets **403** → the popup's error branch. Response
  shape (`data.plans`) is correct; RBAC is the only blocker.
- **How self-service plan changes actually work (the behavior we must match):**
  - *Change/upgrade plan*: create a **fresh** subscription via `Subscription.createForUser`
    (invitePool/compensationPool fresh from plan, `invitesConsumed=0`, `firstSendAt=null`), **cancel**
    old active subs, and **for business only** carry remaining invites
    (`old.invitePool+comp−consumed`) into the new `compensationPool`. Gated behind Moyasar payment for
    paid plans; free/trial immediate.
  - *Extra invites*: `POST /addons/purchase` → charge → create `Addon` row → `applyQuota` does
    `$inc invitePool` (pool scope). Never touches `invitesConsumed`/`firstSendAt`.
- **Current admin paths diverge:** the host popup calls `admin.hosts.updateHostSubscription`, which
  **mutates the sub in place and never cancels old subs** (orphan-active-subscription bug). A correct
  path already exists (`subscriptions.service.assignSubscription`: fresh + cancel-old). Business uses
  `assignGrant` (fresh + carryover + cancel-old — already matches self-service). `Subscription.upgradeTo()`
  is dead code. **No admin path to grant extra invites exists.**

### Design — unify into one shared lifecycle service
New `subscriptions/subscriptionLifecycle.service.js` exposing two no-payment primitives that mirror
self-service exactly:

1. **`changePlan(userId, planCode, { actor, reason })`**
   = `createForUser` + (business) invite carryover + cancel old active subs + set `user.subscription`.
   Identical to what self-service does *after* payment. Consequence (consistent with self-service):
   a fresh sub resets `invitesConsumed`/`firstSendAt`; business remaining invites carry into the new
   compensation pool; host does not carry over (matches host self-service).
   - Host admin → replaces buggy `updateHostSubscription`.
   - Business admin grant → delegate `assignGrant`'s activation to this (keeps setup-fee waiver).
   - (Phase 2, risk-flagged) self-service checkout `_createSubscriptionFromCheckout` + business
     `_activateSubscription` refactored to call the same core, so there is exactly ONE place that
     mutates a subscription on plan change.

2. **`grantExtraInvites(userId|subscriptionId, quantity, { actor, reason })`**
   = `$inc invitePool` by quantity + write an `Addon` audit row (`extra_invites`, scope `pool`,
   `price:0`, `status:active`, `metadata.grantedBy/reason`). Same mutation as self-service addon,
   minus the charge. Works for **all** plan types (per-event / monthly / quarterly / annual) because
   invites are a unified pool. Does not touch `invitesConsumed`/`firstSendAt`.

### New / changed endpoints
- `GET /plans/assignable?availableFor=host|business` — `protect` + `isAdminRole` (NOT MANAGE_PLANS).
  Flat formatted active plan list. New hook `useAssignablePlans`; repoint both popups. (Leave
  `useAdminPlans`/`MANAGE_PLANS` untouched — the super-admin Plans screen still uses them.)
- `POST /admin/hosts/:id/subscription/extra-invites` `{ quantity, reason }` → `grantExtraInvites`.
- `POST /admin/businesses/:id/subscription/extra-invites` `{ quantity, reason }` → `grantExtraInvites`.
- Host change-plan endpoint keeps its route but its service now calls `changePlan`.
- Business change-plan stays on `assignPlan` (grant/checkout); grant path delegates to `changePlan`.
- All Zod-validated (`validateZod`), quantity bounded to `EXTRA_INVITES_TIERS` range (1–500).

### Blockers / things to confirm (none hard — all consistent if we mirror self-service)
- **Per-event plans:** extra invites enlarge the pool but do **not** lift the `firstSendAt`
  re-creation gate — i.e. they add guest capacity to the current event, not a new event. This is the
  same as self-service; documented, not changed.
- **Plan change resets usage** (fresh sub): accepted because it is exactly what self-service does.
  Business remaining invites are preserved via carryover; host's are not (matches host self-service).
- **Business setup fee:** admin grant waives it (unchanged). Changing to `business_event` via grant
  stays fee-waived.

### Frontend — web
Replace the plan section of `SubscriptionAssignmentPopup` (host) and `AssignPlanPopup` (business)
with one shared `ManagePlanPopup` (two modes, design-token styling, shows current plan + remaining
invites):
- **Mode A — Add extra invites:** package presets (from `EXTRA_INVITES_TIERS`) + custom quantity,
  optional reason → extra-invites endpoint.
- **Mode B — Change plan:** assignable-plans dropdown, a "what changes" summary (new pool, business
  carryover note, usage-reset note), an optional *also add extra invites* field, optional reason.
  Business keeps the grant / checkout-link sub-choice.

### Frontend — mobile (user chose: build business too)
- **Host:** enhance existing `components/admin-dashboard/hosts/SubscriptionModal.js` with the two modes
  (reuse `useAssignablePlans` + new mutations).
- **Business (new):** add an admin **Businesses** area — list screen, detail screen, and the same
  two-mode manage modal — plus a navigation entry in the admin dashboard. Reuses the web endpoints.

### Task 4 build order (each verified before the next)
1. Backend: `subscriptionLifecycle` service + `GET /plans/assignable` + extra-invites endpoints; wire
   host change-plan to `changePlan`; business grant delegates to it. (Self-service refactor = phase 2.)
2. Web: `useAssignablePlans` + new mutations + `ManagePlanPopup`; wire into host + business pages.
3. Mobile host: two-mode `SubscriptionModal`.
4. Mobile business: new list/detail/manage screens + nav.

### Verify (Task 4)
Per-event + monthly + quarterly + annual, host + business: dropdown loads for a plain `admin`; Mode A
adds invites (pool grows, consumed untouched); Mode B changes plan (old sub cancelled, fresh pool,
business carryover correct); admin result === self-service result for the same plan.
