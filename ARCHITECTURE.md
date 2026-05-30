# Halaa — Architecture

This document is the **operating contract** for the three packages in this
monorepo. It is the condensed, durable version of the unification work
described in `UNIFICATION_REPORT.md`; the report is the historical record,
this file is what to read first.

If a rule below contradicts existing code, the code is the bug — open a PR
to fix the code, not this doc. If a rule is wrong, propose the change here
first.

---

## 1. Packages

| Package          | Role                                         | Lives in              |
| ---------------- | -------------------------------------------- | --------------------- |
| `@halla/shared`  | Platform-neutral contract (the only shared code) | `shared/`             |
| `labbe`          | Web app (Next.js 15, App Router, JS)         | `labbe/`              |
| `halla-mobile`   | Mobile app (React Native + Expo SDK 54, JS)  | `halla-mobile/`       |
| `labbe-backend-` | Express backend (`/api/v2`, Zod, JS)         | `labbe-backend-/`     |

npm workspaces (no pnpm, no yarn). JS only — no TypeScript files in any
package. JSDoc `@typedef` blocks are encouraged where editor autocomplete
on shared shapes matters.

---

## 2. Mental model

```
┌──────────────────────────────────────────────────────────────┐
│ @halla/shared  (workspace package, plain JS)                 │
│                                                              │
│  ├─ src/schemas/      Zod schemas — single source            │
│  ├─ src/api/                                                 │
│  │   ├─ paths.js      API_PATHS registry (only place where   │
│  │   │                /api/v2/... literals are allowed)      │
│  │   └─ transport.js  Transport interface (JSDoc typed)      │
│  ├─ src/errors/       ApiError + code → i18n-key mapper      │
│  ├─ src/constants/    Roles, statuses, plan tiers, etc.      │
│  ├─ src/utils/        Pure utils (locale, date, xlsx core)   │
│  └─ src/hooks/        Pure React hooks with no platform deps │
└──────────────────────────────────────────────────────────────┘
              ▲                                ▲
              │                                │
┌─────────────┴────────────┐  ┌────────────────┴────────────────┐
│ labbe/ (Next.js, JS)     │  │ halla-mobile/ (React Native, JS)│
│                          │  │                                 │
│ services/                │  │ services/                       │
│  ├─ http.js   axios      │  │  ├─ apiClient.js   fetch        │
│  └─ ...      typed call  │  │  └─ ...           typed call    │
│                          │  │                                 │
│ stores/      Zustand     │  │ stores/      Zustand            │
│  authStore.js (cookies)  │  │  authStore.js (SecureStore)     │
│                          │  │                                 │
│ hooks/<domain>/          │  │ hooks/<domain>/                 │
│  queries/                │  │  queries/                       │
│  mutations/              │  │  mutations/                     │
│  keys.js                 │  │  keys.js                        │
└──────────────────────────┘  └─────────────────────────────────┘
```

---

## 3. `@halla/shared` — what goes in, what stays out

### Goes in

- **Zod schemas** mirroring `labbe-backend-/src/modules/<domain>/<domain>.validation.js`. Field-by-field. Same regex, same min/max, same enum values, same optional/required flags.
- **`API_PATHS` registry** — the single source of truth for ~460 backend endpoints, lifted from the legacy `labbe/services/new-backend/api.config.js`.
- **`ApiError` class + error-code-to-i18n-key mapper.**
- **Pure utilities** — `getLocalized`, `formatNumber`, `formatCurrency`, `formatDateTime`, `localizeDigits`, `formatTemplateDate`, `xlsxUtils` core (header/row mapping, validators).
- **Role/permission constants** — `ROLES`/`USER_ROLES`, `ADMIN_PAGES`/`PAGES`, `ACCESS_LEVELS`, `ADMIN_ROLES`, `WHITELABEL_ROLES`, `PLATFORM_ADMIN_ROLES`, hierarchy helpers — mirroring `labbe-backend-/src/shared/constants/{roles,permissions}.js`.
- **Status enums** — `EVENT_STATUSES`, `EVENT_STATUS_GROUPS`, `TICKET_TYPES`, `TICKET_STATUS`, `TICKET_PRIORITY`.
- **Pure React hooks** — currently `useEventActionGate`, `useDebounce`. They use only React; no platform imports.

### Stays out (platform-specific)

- **HTTP transport** — axios on web, fetch on mobile. Same interface, two adapters.
- **Token storage** — HttpOnly cookies (web) vs `expo-secure-store` (mobile).
- **React Query hooks** that wire to platform navigation, toasts, or auth stores — they import from shared, but live per-app.
- **Zustand stores** — they import shared *types* but state shape is per-app.
- **Anything depending on** `next/headers`, `next/navigation`, `react-native`, `expo-*`. (Enforced by ESLint `no-restricted-imports` in `shared/eslint.config.mjs`.)

### Matrix divergence — flagged, not silently reconciled

`ROLE_PAGE_ACCESS` (web) and `ACCESS_MATRIX` (mobile) disagree with the backend on several role × page rows (`MODERATOR.SETTINGS`, `WHITELABEL_MODERATOR.SETTINGS`, `WHITELABEL_MODERATOR.plans`, `ADMIN.manage_plans`, etc.). Reconciling them changes what a logged-in user can see/do — a **product decision**, not a refactor. Until resolved, `shared/src/constants/permissions.js` intentionally omits `ROLE_PAGE_ACCESS`; the per-app matrices stay authoritative.

---

## 4. HTTP layer — one interface, two adapters

```js
// @halla/shared/src/api/transport.js
/**
 * @typedef {Object} TransportRequest
 * @property {'GET'|'POST'|'PATCH'|'PUT'|'DELETE'} method
 * @property {string} path             // resolved from API_PATHS
 * @property {unknown|FormData} [body]
 * @property {Object<string, string|number|boolean|undefined>} [query]
 * @property {Object<string,string>} [headers]
 * @property {string} [idempotencyKey]
 * @property {number} [timeoutMs]
 * @property {AbortSignal} [signal]
 */
```

Both adapters return parsed JSON and throw `ApiError` from shared.

- **Web (`labbe/services/http.js`):** axios + `withCredentials` + interceptor refresh.
- **Mobile (`halla-mobile/services/apiClient.js`):** fetch + Bearer header from `authStore` + secure-store refresh + replay-protection for FormData.

**Envelope handling:** the backend's `sendSuccess()`/`sendCreated()`/`sendPaginated()` already emit both `{ success: true, status: 'success' }` together. The client adapter:

1. Checks `success === true` (or `status === 'success'`).
2. Reads the documented `data` field per route.
3. Throws `ApiError` for everything else.

**Single-resource data shapes** vary by route (`{ event }` vs `{ user }` vs raw object). They are intentional per-route — clients read the documented field; do NOT push transformation logic into UI code.

**Mobile FormData replay limitation:** mobile cannot retry FormData bodies after a 401 refresh (stream not seekable). Documented limitation — do not regress.

---

## 5. Hook layout — one rule for both apps

```
hooks/
  <domain>/
    queries/      one file per query endpoint (or grouped if 2-3 related)
    mutations/    one file per mutation endpoint (or grouped)
    keys.js       query-key factory (one place per domain)
    index.js      barrel
```

Domains today: `events/`, `guests/`, `auth/`, `admin/`, `payments/`, `addons/`, `tickets/`, `notifications/`, `plans/`, `post-event/`, `staff/`, `users/`, `templates/`, `discounts/`, `vendors/`, `marketplace/`, `messaging/`, `subscriptions/`, `locations/`, `dashboard/`.

**Same names on both platforms. Same query-key factories on both platforms.**

### Conventions

1. **One mutation factory per domain** that takes an action key and dispatches via a config map (see `labbe/hooks/events/mutations/useEventMutation.js`).
2. **Query keys come from `hooks/<domain>/keys.js` only.** Inline `["events", id]` arrays are forbidden.
3. **Forms validate via `zodResolver(schemaFromShared)`.** Services never re-validate.
4. **Side-effects split:** hooks do data + cache invalidation; screens do toast + navigate. No `useNavigation`/`useRouter` inside `hooks/`.

---

## 6. Reconciliation — backend is ground truth

When a schema, error code, or request shape differs between web, mobile, and backend, **the backend's Zod schema is the tiebreaker, not the team's preference**. The API enforces it at runtime; anything else creates UX bugs (user submits a form the client accepted but the API rejects).

Concrete rules:

1. **Schemas:** `@halla/shared/schemas/<domain>.js` mirrors `labbe-backend-/src/modules/<domain>/<domain>.validation.js`.
2. **When web and mobile both diverge from backend:** shared follows the backend; both apps update.
3. **When only one client diverges:** the matching one wins; the diverging one updates.
4. **Field names:** prefer the backend's field name even when it's awkward. If the backend reads `phoneNumber`, both apps send `phoneNumber`.
5. **i18n keys are app-side concerns.** Schemas in shared emit *opaque keys* (e.g., `"validation.invalidSaudiPhone"`); apps translate them. Never hardcode user-visible strings in shared.

---

## 7. Auth — diverges only at storage

- **Same Zustand store shape** — `{ user, role, status: 'checking'|'loading'|'authenticated'|'unauthenticated', error }`.
- **Same actions** — `login`, `signupHost`, `signupVendor`, `sendOTP`, `verifyOTP`, `completeProfile`, `refreshTokens`, `logout`, `forgotPassword`, `resetPassword`.
- **Same status machine.**
- **Differences confined to `_persistAuth` / `restoreSession`:** web writes nothing locally (HttpOnly cookies handled by backend); mobile writes refresh token to `secureStorage`.
- **Bearer-token handling is mobile-only;** on web the transport enables `withCredentials`.
- **Deep links (mobile):** the email's `/reset-password/:token` URL opens `ResetPasswordScreen` directly via universal/app links.

---

## 8. Cross-app pattern resolutions

### 8.1 Toast — unify the API, not the implementation

- **Web:** `labbe/utils/toastUtils.js` — `react-toastify` wrapper exposing `toast.success/error/info/warning`.
- **Mobile:** `halla-mobile/contexts/ToastContext.js` — RN context with animated stack, exposes the same surface via `useToast()`.

**Contract:** `toast.success("message")` works on both, just exposed differently (named import on web, hook on mobile). Any code intended to be portable through shared (e.g., shared hooks that happen to need a toast) **must accept the toast function as a parameter, not import a global**. Hooks in `@halla/shared` never call toast directly.

### 8.2 Debounce — lives in shared

`@halla/shared/utils/useDebounce.js` — pure React hook, no platform deps. 500 ms default (web's conservative typeahead default). Both apps import from shared.

### 8.3 Action gate — lives in shared

`@halla/shared/hooks/useEventActionGate.js` — same RBAC check, same `whitelabelId` scoping, same `_id.toString()` defensive cast on both platforms.

### 8.4 Form builder — divergent by design

- **Web:** `labbe/hooks/events/useEventForm.js` — single-form, react-hook-form based, all 4 steps in one form context. Fits desktop.
- **Mobile:** `halla-mobile/hooks/useCreateEventForm.js` — step-based, separate validation per step. Fits small screens.

Both consume the same shared schemas, so validation is consistent. **Do not attempt to unify.**

---

## 9. ESLint lock-in rules (Phase 9)

The CI gate enforces three things, in every package:

| Rule                       | What it blocks                                                | Lives in                                  |
| -------------------------- | ------------------------------------------------------------- | ----------------------------------------- |
| `no-restricted-syntax`     | Literal `/api/v[0-9]+/` strings outside the legitimate edge   | `eslint.config.mjs` in each package       |
| `no-restricted-imports`    | Deleted-shim paths + cross-platform imports inside shared     | `eslint.config.mjs` in each package       |
| `--max-warnings 0` (shared/mobile) | New lint warnings can't ship                          | `package.json` `lint` script              |

### Legitimate `/api/v2/` literal locations (rule exempts these)

- `shared/src/api/paths.js` — the registry itself.
- `halla-mobile/config/api.js` — the `API_BASE_URL` constant.
- `labbe/next.config.mjs` — Next.js rewrite rules.
- The eslint configs themselves (the rule's selector regex contains the prefix).

### Local probe to verify the gate is live

```sh
# 1. Drop a literal in any source file:
echo 'const __probe = "/api/v2/probe";' >> labbe/services/http.js
cd labbe && npm run lint   # expect: error, no-restricted-syntax

# 2. Drop a banned import:
echo "import x from '@/services/apiClient';" >> labbe/services/http.js
cd labbe && npm run lint   # expect: error, no-restricted-imports

# 3. Revert both and re-run — should be clean.
```

### Important: labbe uses `eslint` directly, not `next lint`

`next lint` is deprecated in Next 15 and was silently ignoring the lock-in rules in `eslint.config.mjs`. The labbe `lint` script calls `eslint .` directly. Do not revert to `next lint`.

### Deferred to a future slice (NOT enforced in Phase 9)

Per UNIFICATION_REPORT §7.3, these will land in a future cleanup pass once the underlying code is ready:

- **No `console.log` in `halla-mobile/services/**`** (PII risk in release builds; use `dlog` from `utils/log.js` instead).
- **No `useNavigation` / `useRouter` inside `hooks/`** (enforces the hooks-do-data / screens-do-side-effects split).
- **Restrict `staffToken` cookie access** (web — move staff portal token to HttpOnly per §7.1).

---

## 10. CI

Three GitHub Actions workflows in `.github/workflows/`:

- **`labbe.yml`** — triggers on changes to `labbe/**` or `shared/**`. Steps: install → `shared` lint → `labbe` lint → `next build`.
- **`halla-mobile.yml`** — triggers on changes to `halla-mobile/**` or `shared/**`. Steps: install → `shared` lint → `halla-mobile` lint → `expo config` check → `expo export --platform android` (Metro bundle smoke).
- **`labbe-backend.yml`** — triggers on changes to `labbe-backend-/**`. Steps: install → boot smoke.

Both app workflows lint `shared` first, so a typo in shared fails both pipelines.

---

## 11. Where to read more

- **`UNIFICATION_REPORT.md`** — historical record of the unification (inventory, migration phases, decisions, slice-by-slice progress log). Read for context on *why* the current shape.
- **`DEPLOYMENT_PLAN.md`, `DEPLOYMENT_RECORD_2026-05-14.md`** — production deployment specifics for the Contabo VPS.
- **`PHASE_9_SMOKE_CHECKLIST.md`** — manual end-to-end smoke checklist (run before every release).
