# Full-Stack Module Review & Fix Prompt (Backend + Web + Mobile)

## Instructions for AI Agent

You are performing a **complete full-stack module review** for the Halla platform. The user invokes this prompt with a single backend module name (e.g. `tickets`, `events`, `auth`, `users`, `vendors`, `plans`, `notifications`, `dashboard`, `subscriptions`, `services`, `staff`, `guests`, `messaging`, `discounts`, `addons`, `templates`, `taqnyat-templates`, `post-event`, `locations`, `admin`).

### How the user runs this prompt

The user types something like:

> Run `docs/implementation/MODULE_FULLSTACK_REVIEW_PROMPT.md` for module: **tickets**

### Two-phase workflow (REQUIRED)

**Phase 1 — Plan only.**
You scan the backend module, every web page/component that uses it, every mobile screen/component that uses it, and produce a single plan file at:

```
docs/modules/<module>-fullstack-review-plan.md
```

You do **not** modify any code in this phase. You stop and wait for the user's explicit green-light.

**Phase 2 — Implement.**
After the user approves, you execute the plan step by step, updating the plan file with progress as you go (mark each item with `[x] DONE` and a one-line note pointing to the file/line that was changed).

> **Note on the docs convention.** The wider project tracks work as `PHASE_*_PLAN.md` + `PHASE_*_PROGRESS.md` + `PHASE_*_REPORT.md` triples under `docs/implementation/`. This prompt deliberately deviates: per-module reviews live in `docs/modules/` as a single growing file (`<module>-fullstack-review-plan.md`) that holds the original analysis at the top and the implementation log at the bottom. If at any point a module review grows large enough that splitting helps, do so by appending `<module>-fullstack-review-progress.md` and `<module>-fullstack-review-report.md` siblings — but the default is one file.

### Module → frontend mapping you must derive

For each backend module, derive the related frontend artifacts on **both platforms**:

- **Backend module folder** — `labbe-backend-/src/modules/<module>/`
- **Backend models** — `labbe-backend-/models/*Model.js` (only the ones imported by the module)
- **Web API paths** — the matching section inside `labbe/services/new-backend/api.config.js`
- **Web React Query hooks** — `labbe/hooks/reactQueryHooks/use<Module>.js` and any siblings (`useAdmin.js` may host admin-side queries for several modules — find them all)
- **Web pages** — every `app/[lang]/**/page.js` whose data depends on the module's endpoints
- **Web components** — every component rendered (transitively) by those pages, including everything under their `_components/` folders and anything imported from `ui/` or `components/`
- **Mobile services** — `halla-mobile/services/<module>Service.js` (and any other service file that calls the module's endpoints)
- **Mobile hooks** — `halla-mobile/hooks/queries/use<Module>.js` and `halla-mobile/hooks/mutations/use<Module>Mutations.js` (plus any admin equivalents)
- **Mobile screens** — every screen under `halla-mobile/screens/**` whose data depends on the module
- **Mobile components** — every component under `halla-mobile/components/**` rendered (transitively) by those screens

You must search for usages — do not assume the obvious folder is the only one. Grep for the API paths, hook names, and service function names across the whole frontend.

---

## CORE RULE — PRESERVE STYLES AND VISUAL STRUCTURE

**This rule overrides everything else when refactoring.**

When you split a large component/page/screen into smaller pieces because it exceeds a line limit, or when you de-duplicate code, or when you rename hooks, or when you delete a fallback chain — **you MUST preserve the existing visual output exactly**:

- **Do not** change any CSS class name, CSS module file, inline style object, or `StyleSheet.create` block.
- **Do not** change the HTML / JSX tag tree structure (same elements, same nesting, same order, same `className`/`style` props on the same nodes).
- **Do not** change any color, spacing, font, border, shadow, or animation value.
- **Do not** change the `View` / `Text` / `ScrollView` / `FlatList` hierarchy on mobile.
- **Do not** rename CSS Modules class keys when extracting a sub-component — copy the exact `styles.foo` references into the new file by importing the same `.module.css` (or moving the relevant rules into a sibling `.module.css` with identical class names).
- **Do not** reflow whitespace in a way that changes how the design renders.

If you find a real visual bug while refactoring, **document it in the plan** and ask — do not silently "fix" appearance.

The legitimate refactors are: extracting a sub-tree to a new component file, lifting state to a parent or a hook, replacing a fallback chain with a direct map, replacing duplicated fetch logic with a shared hook, removing dead branches. The illegitimate refactors are anything that changes what a user would see or interact with.

---

## Project Stack Reference

| Layer | Technology |
|-------|------------|
| Backend | Node.js + Express, MongoDB + Mongoose, Joi validation, JWT auth, Swagger (swagger-jsdoc + swagger-ui-express) |
| Web | Next.js 15.5.9 (App Router, Turbopack), React 19, Zustand 5, TanStack React Query 5, React Hook Form + Zod, i18next, Axios via custom apiClient, CSS Modules |
| Mobile | React Native (Expo), TanStack React Query, Zustand, custom `apiFetch`, AsyncStorage / SecureStore for tokens, StyleSheet co-located |

---

## Directory Structure Reference

```
halla/
├── labbe-backend-/                     # Backend (Express)
│   ├── models/                         # Mongoose models
│   └── src/
│       ├── app.js                      # Express app + module wiring
│       ├── server.js
│       ├── config/
│       │   ├── index.js
│       │   └── swagger.js              # OpenAPI spec assembly
│       ├── infrastructure/             # email, payments, taqnyat
│       ├── jobs/                       # cron jobs
│       ├── modules/                    # ALL feature modules
│       │   └── <module>/
│       │       ├── index.js            # exports { routes }
│       │       ├── <module>.routes.js  # Express router + Swagger JSDoc
│       │       ├── <module>.controller.js
│       │       ├── <module>.service.js
│       │       └── <module>.validation.js   # Joi schemas (when needed)
│       └── shared/
│           ├── constants/              # ROLES, PERMISSIONS, ADMIN_PAGES, STATUS, …
│           ├── data/
│           ├── errors/                 # AppError, errorTypes, globalErrorHandler
│           ├── middleware/             # auth, rbac, validation, rateLimiter, idempotency, subscription, whitelabel, auditLog, guestAuth, staffAuth
│           └── utils/                  # catchAsync, responseHelper, logger, fileUpload, s3Upload, emailService, notificationService, pdfGenerator, excelExport, eventLock, idempotency, runBatched, scheduledTasks, timezone, phone, auditLog
│
├── labbe/                              # Frontend Web (Next.js 15)
│   ├── app/[lang]/                     # Pages (App Router)
│   ├── ui/                             # UI component library
│   ├── components/shared/              # Shared components (small)
│   ├── hooks/
│   │   ├── reactQueryHooks/            # Domain hooks (canonical)
│   │   ├── queries/ mutations/ events/
│   ├── services/
│   │   └── new-backend/
│   │       ├── apiClient.js            # axios + React Query bridge
│   │       └── api.config.js           # API_PATHS registry
│   ├── stores/ providers/ utils/ config/
│   └── localization/locales/{en,ar}/   # 33 namespaces
│
└── halla-mobile/                       # Frontend Mobile (React Native / Expo)
    ├── App.js
    ├── screens/                        # admin/, auth/, common/, host/, vendor/
    ├── components/                     # admin-dashboard/, auth/, common/, createEvent/, events/, home/, host/, marketplace/, notifications/, plans/, settings/, shared/, tickets/, vendor/, …
    ├── services/                       # apiClient.js + per-domain *Service.js
    ├── hooks/
    │   ├── queries/                    # useEvents, useTickets, useUser, useAdmin, …
    │   └── mutations/                  # useEventMutations, useTicketMutations, …
    ├── stores/ contexts/ navigation/ localization/ utils/ config/
```

---

# SECTION A — BACKEND RULES

The backend follows a strict **routes → controller → service** layering with shared middleware and a shared error/response toolkit. These rules are derived from scanning the existing `tickets`, `users`, `auth`, `events`, and `vendors` modules. Several rules are not yet uniformly applied across all modules — your job is to enforce them.

## A1. Module Structure (canonical)

A module folder must contain at minimum:

```
modules/<module>/
├── index.js                  # exports { routes } (and any sub-services consumed by other modules)
├── <module>.routes.js        # Express Router + Swagger JSDoc
├── <module>.controller.js    # HTTP layer only
├── <module>.service.js       # Business logic only
└── <module>.validation.js    # Joi schemas (only if the module accepts non-trivial input)
```

Sub-files are allowed when it materially helps clarity (`otp.service.js`, `templateRefResolver.js`). Do **not** create sub-files for every helper.

## A2. Controller Layer — HTTP only

**Pattern (from `tickets.controller.js`):**

```js
const catchAsync = require("../../shared/utils/catchAsync");
const { sendSuccess, sendCreated, sendPaginated, sendDeleted } = require("../../shared/utils/responseHelper");
const ticketsService = require("./tickets.service");

exports.createTicket = catchAsync(async (req, res) => {
  const result = await ticketsService.createTicket(req.body, req.user);
  sendCreated(res, result, "Ticket created successfully");
});
```

**Mandatory rules:**

1. Every async controller is wrapped in `catchAsync` — never write `try/catch` inside a controller for the purpose of forwarding errors. Throwing `AppError` from the service is the only allowed mechanism.
2. Every successful response goes through `sendSuccess` / `sendCreated` / `sendPaginated` / `sendDeleted` / `sendNoContent`. **Never** call `res.status(...).json(...)` directly except for binary downloads (Excel/PDF).
3. Controllers must not contain business logic, DB queries, validation, role checks, or audit-log calls. They:
   - parse `req.params`, `req.query`, `req.body`
   - parse pagination via `getPaginationFromQuery` (or inline `parseInt`)
   - call exactly one service method
   - send the response

   Anything else belongs in the service.
4. **No `console.log` / `console.error`** in committed code. Use the shared logger from `shared/utils/logger.js` if you genuinely need server-side observability; otherwise rely on the global error handler.
5. JSDoc on each export must include the HTTP method + path. Keep it short — one sentence summary, not a paragraph.
6. **No phase/flow comments** (`FLOW-23-F02`, `Phase 4c W0-MODEL`, `BUG-1234`, `// fixing migration issue`). Remove them. A comment is allowed only when it explains a *why* that the code cannot.

## A3. Service Layer — Business logic only

**Pattern (from `tickets.service.js`):**

- A class (`class TicketsService { … }`) **or** a flat object of named exports — pick one consistently per module. Existing modules mix both; for new code prefer the class form because most modules already use it.
- Imports are limited to: shared constants, shared errors, shared utils, models, and other services it depends on.
- It **must not** import Express, `req`, `res`, `next`, or anything HTTP-shaped.

**Mandatory rules:**

1. Throw typed errors from `shared/errors`:
   - `NotFoundError` (404), `ForbiddenError` (403), `ValidationError` (400), `ConflictError` (409), `AppError(message, status, code?)` for everything else.
   - Never throw plain `Error` and never `return { error: "…" }`.
2. Never call `console.error` and swallow — let `globalErrorHandler` handle it.
3. Use `Promise.all` for independent reads (see `getTickets`: `[tickets, total] = await Promise.all([...])`). Sequential awaits for independent queries are a violation.
4. **MongoDB best practices:**
   - Use `.lean()` on read-only queries when you don't need Mongoose document instance methods.
   - Use `.select()` to project only the fields you need (`.select("_id username name email role")`).
   - Use `.populate(path, projection)` with an explicit projection — never blank-`populate`.
   - Escape user input that lands inside `$regex` with `value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')`.
   - Always limit pagination to a sane upper bound (`Math.min(100, …)` — already in `getPaginationFromQuery`).
   - Indexes: when introducing a new query pattern (sort/filter on a new field), the model must have a matching index. If the index is missing, flag it in the plan.
5. **Whitelabel isolation:** any read of users/events/etc. for an admin must respect `req.user.whitelabelId` when the role is `WHITELABEL_ADMIN` / `WHITELABEL_MODERATOR`. The pattern (from `tickets.service.getTickets`):
   ```js
   if (isAdmin && requestingUser?.whitelabelId &&
       [ROLES.WHITELABEL_ADMIN, ROLES.WHITELABEL_MODERATOR].includes(requestingUser.role)) {
     query.whitelabelId = requestingUser.whitelabelId;
   }
   ```
6. **Audit logs:** mutations on sensitive entities (users, plans, payments, subscriptions, tickets status changes, RBAC changes, whitelabels) must call `logAudit` from `shared/utils/auditLog.js`.
7. **Notifications:** when a state change concerns another user, dispatch via `notificationService` from `modules/notifications`.
8. **No string literals for roles, permissions, statuses, ticket priorities, etc.** Use the matching constant from `shared/constants/{roles,permissions,status,…}.js`.
9. **Idempotency:** any payment, charge, mutation that issues OTP/SMS at cost, or external-write must use the `idempotency` middleware. If a route lacks it where it should have it, flag in the plan.
10. **Transactions:** any mutation that must update 2+ collections atomically (e.g. event + guests, subscription + invoice) must use a Mongo session/transaction. If multi-collection writes are split across awaits without one, flag in the plan.
11. **No defensive fallback chains** like `data?.x ?? data?.y ?? defaultValue` *unless* both branches are real shapes the function can legitimately receive. The vast majority of these are dead branches that confuse readers — remove them. Only keep fallbacks at true API boundaries (e.g. a webhook that may use legacy field names).

## A4. Routes Layer

**Pattern (from `tickets.routes.js`):**

```js
const express = require("express");
const router = express.Router();
const ticketsController = require("./tickets.controller");
const { protect } = require("../../shared/middleware/auth");
const { restrictTo, requirePageAccess } = require("../../shared/middleware/rbac");
const { ADMIN_PAGES, ROLES } = require("../../shared/constants");
const { validateObjectId } = require("../../shared/middleware/validation");

router.use(protect);

router.get("/assignees", requirePageAccess(ADMIN_PAGES.TICKETS, "update"), ticketsController.getAssignees);
router.route("/").get(ticketsController.getTickets).post(ticketsController.createTicket);
router.route("/:id")
  .get(validateObjectId("id"), ticketsController.getTicketById)
  .patch(validateObjectId("id"), ticketsController.updateTicket)
  .delete(validateObjectId("id"), ticketsController.deleteTicket);
```

**Mandatory rules:**

1. **Auth gating:** every router that touches user data uses `router.use(protect)` (or `optionalAuth` for hybrid public/authenticated reads). Public-only routes must be defined *before* the `protect` line and explicitly justified.
2. **RBAC:** every admin/moderator route uses `requirePageAccess(ADMIN_PAGES.<PAGE>, "<action>")` with action ∈ `view | create | update | delete | export`. Use `restrictTo(ROLES.X, ROLES.Y)` only for non-page-scoped roles (e.g. host-only, vendor-only). Never use `restrictTo` to gate an admin page — use `requirePageAccess`.
3. **Param validation:** every `:id` (or any ObjectId param) uses `validateObjectId("id")`. Same for nested ids (`:eventId`, `:userId`). If missing, the global error handler will still catch invalid casts but the user gets a worse message — fix it.
4. **Body validation:** non-trivial request bodies must run through a Joi schema in `<module>.validation.js` invoked via `validate(schema)` from `shared/middleware/validation`. Trivial bodies (single boolean toggle) may rely on the controller-level shape check, but most modules under-validate today — flag and add schemas.
5. **Rate limiting:** auth, OTP, password reset, signup, and any externally-triggerable expensive endpoint must use the matching limiter from `shared/middleware/rateLimiter` (`authLimiter`, `otpLimiter`, `otpHourlyLimiter`, `passwordResetLimiter`, `refreshLimiter`).
6. **Subscription / quota gating:** routes that consume a paid quota (event creation, message send, guest add) must use `checkEventLimit` / `checkMessageLimit` / `checkGuestLimit` / `requireSubscription` and increment usage on success.
7. **Tenant injection:** routes that expose tenant-scoped lists must run `filterByWhitelabel` or `whitelabelIsolation` so the service receives `req.whitelabelFilter` ready to use.
8. **No business logic in routes** — `checkDuplicates`-style middleware in `auth.routes.js` (lines 62–83) is acceptable when it crosses concerns of multiple controllers, but the default is: validation → middleware → controller, no inline async DB calls.
9. **HTTP method discipline:**
   - `GET` for reads (no side effects)
   - `POST` for create (or non-idempotent action)
   - `PATCH` for partial update / status transitions
   - `PUT` for full replacement (rare in this codebase)
   - `DELETE` for delete
10. **Path discipline:** plural noun resources (`/tickets`, `/users/hosts`), kebab-case for multi-word (`/forgot-password`), nested resources for sub-collections (`/tickets/:id/replies`).
11. **No duplicate routes / one route per job.** A common smell is two endpoints that do the same thing (e.g. `getTicket` + `getTicketDetail`, or `getMyEvents` + `getMyEventsList`). Identify duplicates, pick the canonical one, delete the other, migrate consumers.
12. **Comment cleanup:** drop FLOW-/Phase-/BUG- markers, ticket numbers, "TODO: remove after migration", and the like. Keep only comments that explain a *why* a future reader could not infer.

## A5. Validation Layer (Joi)

**Pattern (from `auth.validation.js`):**

- One file per module, exporting Joi schemas by name.
- Reuse base patterns (e.g. `phonePattern`, `passwordSchema`) at the top of the file.
- Schemas use explicit `.messages({...})` for fields whose default Joi message would be unhelpful in production.
- `Joi.alternatives().try(Joi.string(), Joi.object())` for fields that may arrive JSON-stringified (multipart form upload paths).

**Mandatory rules:**

1. Every public POST/PATCH/PUT body is validated by a schema; do not rely on Mongoose schema validation as the only line of defense (Mongoose ignores unknown fields silently and gives bad messages).
2. Common patterns (Saudi phone, password rules, ObjectId, ISO date, pagination `{page, limit}`) live in `shared/utils/validators` if they exist, or are duplicated across modules — flag duplications and propose a shared file.
3. Reject unknown fields when safe (`.unknown(false)`) for admin write endpoints. For user-facing endpoints prefer `.unknown(false)` too unless there's a documented reason.

## A6. Errors & Response Shape

**Single response shape:**

- Success: `{ success: true, status: "success", data?, message?, pagination? }`
- Failure: `{ success: false, status: "fail" | "error", message, code? }`

**Mandatory rules:**

1. Never invent a different success shape — use `responseHelper`.
2. Throw typed errors. The `globalErrorHandler` translates Mongo `CastError`, duplicate key, validation, JWT errors into friendly `AppError`s — do not duplicate that handling per module.
3. Error `code` strings are stable contracts for the frontend (e.g. `INVALID_ID`, `DUPLICATE_FIELD`, `TOKEN_EXPIRED`). Use the same code from the same place — do not invent new codes that overlap.

## A7. Swagger / OpenAPI

**Mandatory rules:**

1. Every public endpoint has a `@swagger` JSDoc block immediately above its route definition (or above its method on a chained `router.route(...)`).
2. The block must specify: `tags`, `summary`, `description`, `parameters` (path/query), `requestBody` (when applicable), and at least the success response + the major error responses (`401`, `403`, `404`, `409` where applicable).
3. **Schema reuse:** request/response schemas live in `config/swagger.js`'s `components.schemas` — reference them with `$ref: '#/components/schemas/<Name>'`. Do not inline a 30-line schema into JSDoc.
4. **Parameters reuse:** `PageParam`, `LimitParam`, `IdParam` live in `components.parameters` — reference them, do not redefine.
5. **Drift audit:** read every `@swagger` block in the module and compare against the controller + service:
   - Endpoint exists in code but missing from Swagger → add it.
   - Endpoint annotated in Swagger but the route was deleted → delete the JSDoc.
   - Path in JSDoc differs from the actual mounted path → fix JSDoc.
   - Request body schema in JSDoc differs from what the Joi schema accepts → fix JSDoc to match the truth (or fix the Joi schema if it's the wrong one — judgment call, document it).
   - Response schema in JSDoc differs from what the service returns (after `sendSuccess`/`sendPaginated` shaping) → fix JSDoc.
6. **One source of truth.** If the module has a duplicate endpoint slated for deletion (rule A4.11), remove its JSDoc together with the route.

## A8. File-size limits (Backend)

| File | Max lines |
|------|-----------|
| `*.routes.js` | **400** |
| `*.controller.js` | **300** |
| `*.service.js` | **600** |
| `*.validation.js` | **300** |
| Any other single helper file | **300** |

**Existing violations identified at the time of writing this prompt:**

- `auth.service.js` — 1186 lines
- `events.service.js` — 2498 lines
- `users.service.js` — 1051 lines
- `events.routes.js` — 1031 lines
- `auth.routes.js` — 779 lines
- `auth.controller.js` — 665 lines
- `events.controller.js` — 532 lines
- `users.routes.js` — 531 lines

When a file exceeds the limit, split it as follows (preserving public exports / route mounts exactly — same paths, same handler names, same exported names from `index.js`):

- **Routes file too long:** split by sub-resource (`auth.routes.js` → `auth.signup.routes.js`, `auth.otp.routes.js`, `auth.password.routes.js`, `auth.profile.routes.js`) and re-mount under one parent router exported from the original `auth.routes.js`. Swagger blocks travel with the routes they document.
- **Controller too long:** split by sub-resource (mirror routes) into `<module>.<area>.controller.js` and re-export from the canonical controller.
- **Service too long:** split by domain concern into `<module>.<area>.service.js`. The canonical `<module>.service.js` becomes a thin façade that re-exports.
- **Models / shared utils:** if a model definition exceeds 600 lines, extract pre/post hooks into `models/hooks/<Name>Hooks.js` and statics/methods into `models/methods/<Name>Methods.js`.

## A9. Comment Hygiene (Backend)

Remove every comment that fits any of these patterns:

- `// FLOW-XX-FYY` / `// PHASE-X-…` / `// W0-…` / `// TENANT-FXX` / `// M-12 …`
- `// fixing bug 1234` / `// fix for FE-456`
- `// TODO: remove after migration X` / `// kept for backward-compat with phase Y`
- `// added in commit abc1234`
- Trailing inline comments that just rename the variable they sit on (`const x = 5; // x value`).
- Multi-line block comments that re-state what the code does line-by-line.

Keep comments that explain:

- A non-obvious *why* (a workaround, an order-dependent operation, a known edge case in an external dep).
- An invariant that callers must respect.
- A documented security / privacy constraint.

When in doubt, delete. The git history holds the rationale.

---

# SECTION B — FRONTEND WEB RULES (Next.js 15)

The 20 rules from `docs/implementation/FRONTEND_PAGE_REVIEW_PROMPT.md` apply, with **two important amendments**:

## B0. Amendment — File-size limit applies to ALL components

The 250-line cap is **not** only for page files. It applies to every `.js`/`.jsx` file in the page's component tree:

- Page files (`app/[lang]/**/page.js`) — **≤ 250 lines**
- Page-private components (`app/[lang]/**/_components/**/*.js`) — **≤ 250 lines**
- Shared UI components (`ui/**/*.js`, `components/**/*.js`) — **≤ 250 lines**
- Custom hooks (`hooks/**/*.js`) — **≤ 250 lines**
- Service files (`services/**/*.js`) — **≤ 400 lines** (services tend to legitimately enumerate paths/methods)

When any file in the tree exceeds the limit, split it. **Preserve styles and structure exactly** (Core Rule above).

## B0.1 Amendment — No fallback chains in data mapping

The frontend has accumulated patterns like:

```js
const items =
  data?.data?.items ||
  data?.items ||
  data?.results ||
  data?.list ||
  [];
```

These are wrong. The backend response shape is **a single, known shape** per endpoint. Read the backend (after applying Section A) and map directly:

```js
const items = data?.data?.tickets || []; // matches sendPaginated shape
```

The only legitimate fallback is the empty-array / empty-object guard (`|| []`, `|| {}`) when the request hasn't loaded yet — and even that disappears once you handle the `isLoading` branch correctly.

When you find a fallback chain:

1. Verify the actual backend response shape (read controller + service + `sendSuccess`/`sendPaginated` call).
2. Pick the one correct path.
3. Delete every other branch.
4. If the test reveals the backend actually does emit two shapes — fix the backend (rule A6.1) so it doesn't.

## B0.2 Amendment — One canonical query/mutation per endpoint

Today the codebase has duplicate hooks for the same endpoint (e.g. multiple `useEvents`-flavored hooks across `hooks/queries/`, `hooks/reactQueryHooks/`, and component-private `useQuery` calls). This is forbidden.

For each endpoint:

- One `useXxx` query hook in `hooks/reactQueryHooks/use<Module>.js`.
- One `useXxxMutation` (or factory) in the same file.
- All consumers import from there.
- Direct `apiRequest` calls in components are forbidden (Rule 6 of the original frontend prompt).
- Direct `useQuery({ queryFn: () => fetch(...) })` in components is forbidden.
- Component-local `useMutation` is acceptable only when it composes the canonical hook.

When you find duplicates, pick the canonical one, migrate consumers, delete the other.

## B1. Page + component file size — 250 lines (web)

Page files **and** every component, hook, or shared module rendered (transitively) by them must NOT exceed **250 lines**. When over the cap, extract to:
- `_components/` directory next to the page (page-private UI)
- `hooks/` for business logic
- `services/` for API calls

**❌ Anti-pattern:**
```jsx
// 400-line page with inline components, state, handlers
const MyPage = () => {
  const [s1, setS1] = useState(); const [s2, setS2] = useState();
  // … 300 more lines …
  const StatCard = ({ title, value }) => ( … );  // inline component
  const FilterBar = ({ filters }) => ( … );      // inline component
  return ( … );
};
```

**✅ Correct:**
```jsx
import MyPageContent from "./_components/MyPageContent";
import { useMyPageData } from "@/hooks/useMyPageData";

const MyPage = () => {
  const { data, isLoading } = useMyPageData();
  return <MyPageContent data={data} isLoading={isLoading} />;
};
```

## B2. NO hardcoded text — always `t()`

Every user-facing string goes through `useTranslation(<namespace>)`'s `t()`. Never inline Arabic or English in JSX.

**❌:** `<h1>لوحة التحكم</h1>` · `<button>إضافة مضيف</button>` · `<span>{t("x")} - {data.count} عنصر</span>`
**✅:** `<h1>{t("dashboard.title")}</h1>` · `<button>{t("buttons.addHost")}</button>` · `<span>{t("common.items_count", { count: data.count })}</span>`

**Namespace rules:**
- Admin pages → `adminDashboard | adminHosts | adminEvents | adminTickets | adminVendors | adminPayments | adminSettings | adminWhitelabels | adminModerators`
- Host pages → `createEvent | host-events | hostPayments | plans`
- Vendor pages → `vendorServices | vendorSettings`
- Auth → `login | signup | continueSignup | forgetPassword | changePassword | setupPassword`
- Common → `common | table | pagination`
- Always provide a fallback string: `t("key", "Fallback text")`.

Locale namespaces (33) live under `localization/locales/{en,ar}/`. Missing keys go in §8 of the plan; the agent does not modify locale JSON without explicit approval.

## B3. NO hardcoded data — fetch from backend

Any value that can come from the API must come from the API via React Query.

**❌:** `const plans = [{ id:1, name:"Basic" }, …];` · `const stats = { totalEvents: 42, … };`
**✅:** `const { data: plansData } = usePlans(); const plans = plansData?.data?.plans || [];`

**Acceptable hardcoded:** pagination size constants, default form values, URL/path constants, enum mirrors of backend constants (`USER_ROLES`).

## B4. Server Component pattern (dashboard pages)

```jsx
import { cookies } from "next/headers";
import {
  createServerQueryClient,
  prefetchServerData,
  QueryClientServerProvider,
} from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";
import PageContent from "./_components/PageContent";

export default async function DashboardPage({ params, searchParams }) {
  const { lang } = await params;
  // optional: await requirePageAccess("pageKey", lang);

  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const queryClient = createServerQueryClient();

  const urlParams = await searchParams;
  const filters = {
    page: urlParams?.page || 1,
    limit: urlParams?.limit || 10,
    search: urlParams?.search,
    status: urlParams?.status,
  };

  if (token) {
    try {
      await prefetchServerData({
        queryClient,
        queryKey: ["domain", "data-key", filters],
        path: API_PATHS.domain.getData,
        params: filters,
        token,
      });
    } catch (error) {
      console.error("Error prefetching data:", error);
    }
  }

  return (
    <QueryClientServerProvider queryClient={queryClient}>
      <PageContent />
    </QueryClientServerProvider>
  );
}
```

**❌:** not `await`-ing `params` (Next.js 15 — they're Promises) · `fetch()` in page instead of `prefetchServerData` · missing `QueryClientServerProvider` wrapper.

## B5. Client Component pattern (interactive pages)

```jsx
"use client";
import React, { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams, useRouter } from "next/navigation";
import { useDebounce } from "@/hooks/useDebounce";
import { useDomainData } from "@/hooks/reactQueryHooks/useDomain";
import PageContent from "./_components/PageContent";

const MyPage = () => {
  const { t } = useTranslation("namespace");
  const router = useRouter();
  const searchParams = useSearchParams();

  const searchQuery = searchParams.get("search") || "";
  const currentPage = parseInt(searchParams.get("page")) || 1;

  const [searchInput, setSearchInput] = useState(searchQuery);
  const debouncedSearch = useDebounce(searchInput, 400);

  const { data, isLoading, error } = useDomainData({ search: debouncedSearch, page: currentPage });
  const items = useMemo(() => data?.data?.items || [], [data]);

  const handleFilterChange = useCallback((key, value) => {
    const params = new URLSearchParams(searchParams);
    value ? params.set(key, value) : params.delete(key);
    params.set("page", "1");
    router.push(`?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  if (isLoading) return <SimpleLoading />;
  if (error) return <ErrorFallback message={t("errors.loadFailed")} />;

  return <PageContent items={items} onFilterChange={handleFilterChange} />;
};
```

**❌:** missing `"use client"` with hooks · inline `onClick={() => router.push(...)}` instead of `useCallback` · filter state in `useState` instead of URL · missing loading/error branches.

## B6. React Query hook pattern (factory)

```jsx
"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";

export const useDomainData = (params = {}, options = {}) => {
  return useQuery({
    queryKey: ["domain", "data-key", params],
    queryFn: () => apiRequest({ method: "GET", path: API_PATHS.domain.getData, params }),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export const useDomainMutation = (action) => {
  const queryClient = useQueryClient();
  const mutations = {
    create: {
      mutationFn: (data) => apiRequest({ method: "POST", path: API_PATHS.domain.create, data }),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["domain", "data-key"] }),
    },
    update: {
      mutationFn: ({ id, data }) => apiRequest({ method: "PATCH", path: API_PATHS.domain.update(id), data }),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["domain", "data-key"] }),
    },
    delete: {
      mutationFn: (id) => apiRequest({ method: "DELETE", path: API_PATHS.domain.delete(id) }),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["domain", "data-key"] }),
    },
  };
  return useMutation(mutations[action]);
};

export const useCreateDomain = () => useDomainMutation("create");
export const useUpdateDomain = () => useDomainMutation("update");
export const useDeleteDomain = () => useDomainMutation("delete");
```

**❌:** direct `apiRequest` in component · generic queryKey (`["data"]`) that conflicts · mutation without `onSuccess` invalidation · query without `staleTime`.

## B7. API_PATHS only — no hardcoded URLs

```jsx
// ✅
path: API_PATHS.events.getMyEvents
path: API_PATHS.admin.hosts.getAll
path: API_PATHS.dashboard.getHostDashboard
```
**❌:** `path: "/events/my-events"` · `` path: `${process.env.NEXT_PUBLIC_API_URL}/auth/login` ``.

## B8. Centralized error handling

```jsx
import { handleError } from "@/services/errorHandlingService";
import { toastUtils } from "@/utils/toastUtils";

try {
  await mutation.mutateAsync(data);
  toastUtils.success(t("success.created"));
} catch (error) {
  handleError(error, t, { fallbackMessage: "errors.create_failed" });
}
```

**❌:** `console.error("Error:", error)` only · `toast.error(error.message)` raw to user · per-status custom branches instead of `handleError`.

## B9. Component extraction

Extract when:
- File exceeds line cap.
- A JSX block repeats 2+ times.
- A section owns its own state/logic (≥10 lines).
- A UI section is logically separable (header, filters, table, cards).

**Folder shape (web):**
```
app/[lang]/domain/page/
├── page.js                    # ≤ 250 lines
├── page.module.css
└── _components/
    ├── PageHeader/{PageHeader.js, PageHeader.module.css}
    ├── Filters/{Filters.js, Filters.module.css}
    ├── DataTable/{DataTable.js, DataTable.module.css}
    └── StatsCards/{StatsCards.js, StatsCards.module.css}
```

**Props pattern:**
- Destructure with defaults. Group related fields into a single object prop (`<UserCard user={user} />`, not 7 individual props).
- Callback props prefixed with `on` (`onChange`, `onFilterChange`, `onReset`).

**❌:** inline component definition inside a page · prop drilling 4+ levels · 6+ scalar props that should be one object.

## B10. State management

| State Type | Tool | Example |
|------------|------|---------|
| Server data | React Query | `useMyEvents()`, `useDashboard()` |
| Local UI | `useState` | `isOpen`, `searchInput`, `currentStep` |
| Shared UI | Zustand | `useAuthStore`, `useSidebarStore` |
| Form | React Hook Form | `useForm()`, `FormProvider` |
| URL | `useSearchParams` + `useRouter` | filters, pagination, search |
| Debounced input | `useDebounce` | search input |

**❌:** `useState + useEffect` for server data · `useState` for auth state · React Query for form state.

## B11. CSS Modules only

```jsx
import styles from "./page.module.css";
<div className={styles.container}>
<div className={`${styles.card} ${styles.active}`}>
```

**❌:** inline `style={{...}}` · global class names · Tailwind.

## B12. Forms — RHF + Zod

```jsx
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { mySchema } from "@/utils/schemas/mySchema";

const MyForm = () => {
  const methods = useForm({
    mode: "onChange",
    resolver: zodResolver(mySchema),
    defaultValues: { name: "", email: "" },
  });
  const { handleSubmit, register, formState: { errors } } = methods;

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit((data) => mutation.mutate(data))}>
        <input {...register("name")} />
        {errors.name && <span>{errors.name.message}</span>}
      </form>
    </FormProvider>
  );
};
```

**❌:** manual form state with `useState` per field · ad-hoc validation in `handleSubmit` · skipping Zod.

## B13. Loading + error + empty states

Every fetcher renders all three.

```jsx
const { data, isLoading, error } = useDomainData();
if (isLoading) return <SimpleLoading />;
if (error) return <div className={styles.error}><p>{t("errors.loadFailed", "Failed to load data")}</p></div>;
if (!data?.data?.items?.length) return <EmptyState />;
return <PageContent data={data} />;
```

**❌:** rendering `data.items.map(...)` without guarding for `undefined` during load · raw `<div className="spinner">`.

## B14. URL state for filters

```jsx
const searchParams = useSearchParams();
const router = useRouter();
const category = searchParams.get("category") || "all";
const page = parseInt(searchParams.get("page")) || 1;

const handleFilterChange = useCallback((key, value) => {
  const params = new URLSearchParams(searchParams);
  if (!value) params.delete(key); else params.set(key, value);
  params.set("page", "1"); // reset pagination on filter change
  router.push(`?${params.toString()}`, { scroll: false });
}, [searchParams, router]);
```

**❌:** filter state in `useState` (not bookmarkable) · forgetting to reset `page` on filter change.

## B15. RBAC / access control

```jsx
// Server
import { requirePageAccess } from "@/services/serverAuth";
export default async function AdminPage({ params }) {
  const { lang } = await params;
  await requirePageAccess("hosts", lang);
}

// Client
import { usePageAccess } from "@/hooks/usePageAccess";
import { ADMIN_PAGES } from "@/ui/layout/navConfig";
const { canCreate, canDelete, canExport } = usePageAccess(ADMIN_PAGES.HOSTS);
{canCreate && <AddButton />}
{canDelete && <DeleteButton />}
{canExport && <ExportButton />}
```

## B16. Mutation error handling in components

```jsx
const createMutation = useCreateDomain();
const handleSubmit = async (data) => {
  try {
    await createMutation.mutateAsync(data);
    toastUtils.success(t("success.created"));
    router.push(`/${lang}/domain`);
  } catch (error) {
    handleError(error, t, { fallbackMessage: "errors.create_failed" });
  }
};
```

**❌:** no try/catch around `mutateAsync` (unhandled rejection) · `alert()` instead of `toastUtils` · per-status custom branches.

## B17. Next.js 15 params

```jsx
export default async function Page({ params, searchParams }) {
  const resolvedParams = await params;
  const { lang, id } = resolvedParams;
  const urlParams = await searchParams;
}
```

**❌:** `const { lang } = params;` (Promise) · destructuring without `await`.

## B18. Image handling

```jsx
import Image from "next/image";

<Image src={imageUrl || "/images/placeholder.jpg"} alt={t("images.event_alt")} width={200} height={200} />

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
const getImageUrl = (p) => {
  if (!p) return "/images/placeholder.jpg";
  if (p.startsWith("http")) return p;
  return `${BACKEND_URL}/api/${p.startsWith("/") ? p.slice(1) : p}`;
};
```

**❌:** `<img>` instead of `<Image>` · hardcoded `http://localhost:8000`.

## B19. Page export with ErrorBoundary

```jsx
const MyPageContent = () => { /* logic */ };

const WrappedMyPage = () => {
  const { t } = useTranslation("namespace");
  return (
    <ErrorBoundary
      fallbackTitle={t("errors.boundaryTitle")}
      fallbackMessage={t("errors.boundaryMessage")}
    >
      <MyPageContent />
    </ErrorBoundary>
  );
};
export default WrappedMyPage;
```

## B20. DRY — extract reusable pieces

```jsx
const StatCard = ({ icon, label, value, trend }) => (
  <div className={styles.statCard}>
    {icon}
    <span className={styles.label}>{label}</span>
    <span className={styles.value}>{value}</span>
    {trend && <span className={styles.trend}>{trend}</span>}
  </div>
);

<StatCard icon={<Users />}    label={t("stats.totalGuests")}  value={stats.guests} />
<StatCard icon={<Calendar />} label={t("stats.totalEvents")}  value={stats.events} />
<StatCard icon={<Money />}    label={t("stats.totalRevenue")} value={stats.revenue} />
```

**❌:** three near-identical `<div className={styles.card}>...</div>` blocks copy-pasted.

## B21. Page-level fix priority order

When fixing a page, apply in this order:
1. **Critical** — hardcoded text → `t()`
2. **Critical** — hardcoded data → React Query
3. **Critical** — hardcoded API paths → `API_PATHS`
4. **High** — file size over cap → split (preserve styles)
5. **High** — missing loading/error states
6. **High** — missing mutation error handling
7. **Medium** — inline components → extract
8. **Medium** — repeated JSX → reusable component
9. **Medium** — wrong state management tool
10. **Low** — import organization · unused imports/vars · formatting

## B22. Anti-pattern checklist (run on every page)

**Code Quality**
- [ ] File exceeds 250 lines
- [ ] Any component in the page tree exceeds 250 lines
- [ ] Inline component definitions inside the page
- [ ] Repeated JSX blocks (≥2)
- [ ] Messy/unorganized imports
- [ ] Unused imports/variables
- [ ] `console.log`/`console.error` left in (except inside catch with user feedback)
- [ ] TODO/FIXME without tracking

**Hardcoded values**
- [ ] User-facing text not via `t()`
- [ ] API paths not via `API_PATHS`
- [ ] Hardcoded data arrays/objects
- [ ] Hardcoded backend URLs
- [ ] Hardcoded styles

**Data fetching**
- [ ] `useState`+`useEffect` for server data
- [ ] Missing loading state
- [ ] Missing error state
- [ ] No `staleTime`
- [ ] No invalidation on mutations
- [ ] Direct `fetch`/`apiRequest` in component
- [ ] Not awaiting `params`/`searchParams` in Next 15

**i18n**
- [ ] Hardcoded Arabic / English / mixed `t()` and literal
- [ ] Wrong namespace
- [ ] Missing fallback in `t()`

**State management**
- [ ] `useState` for auth state
- [ ] `useState` for server data
- [ ] React Query for form state
- [ ] Filter state in `useState` instead of URL
- [ ] No `useCallback` on handlers passed to memoized children
- [ ] No `useMemo` on expensive derives

**Component structure**
- [ ] No extraction when over cap
- [ ] Excessive prop drilling
- [ ] Too many scalar props (use one object)
- [ ] Missing default values for optional props
- [ ] Callback props not `on*`-prefixed

**Error handling**
- [ ] No try/catch around mutations
- [ ] `console.error` only (no user feedback)
- [ ] Raw error message to user
- [ ] Custom error switch instead of `handleError`
- [ ] `alert()` instead of `toastUtils`

**Styling**
- [ ] Inline styles · global classes · Tailwind classes
- [ ] `<img>` instead of `next/image`

**Security**
- [ ] Reading/writing tokens in JS instead of HttpOnly cookies (web)
- [ ] Missing RBAC checks on admin pages
- [ ] Sensitive data in console logs

## B23. Comment Hygiene (Web)

Same rules as backend (A9). Specifically remove:

- `// FLOW-…`, `// FE-…`, `// PHASE-…`, `// fix for bug …`
- `// added by Claude` / `// auto-generated by ...`
- Re-statements of obvious code

---

# SECTION C — FRONTEND MOBILE RULES (React Native / Expo)

Mobile follows the same data-layer principles as Web with platform-specific differences. The 350-line cap (vs 250 on web) accounts for co-located StyleSheet blocks.

## C0. Components, screens, and hooks — line limit applies to ALL files

- Screens (`screens/**/*.js`) — **≤ 350 lines**
- Components (`components/**/*.js`) — **≤ 350 lines**
- Hooks (`hooks/**/*.js`) — **≤ 350 lines**
- Services (`services/*.js`) — **≤ 500 lines**

When extracting, **preserve the exact `View`/`Text`/`ScrollView`/`FlatList` tree, every `style={...}` reference, and every `StyleSheet.create({...})` value** (Core Rule).

## C1. Service layer

**Verified pattern (from `halla-mobile/services/ticketsService.js`):**

```js
import { ENDPOINTS } from "../config/api";
import { apiFetch } from "./apiClient";

const _request = async (path, init, errorMessage) => {
  const response = await apiFetch(path, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || errorMessage);
  return data;
};

export const getTicketsAPI = async (_legacyToken, filters = {}) => {
  const queryString = new URLSearchParams(filters).toString();
  const path = `${ENDPOINTS.TICKETS.BASE}${queryString ? `?${queryString}` : ""}`;
  return _request(path, { method: "GET" }, "Failed to get tickets");
};
```

**Mandatory rules:**

- Every network call uses `apiFetch` from `services/apiClient.js` (auth interceptor + 30 s timeout + refresh-once on 401). **No raw `fetch`** — migrate any laggards.
- API paths come from the central `ENDPOINTS` object in `config/api.js`. **Never** hardcode path literals in services or hooks. When a path is missing, add it to `ENDPOINTS` (the equivalent of web's `API_PATHS`).
- The `_legacyToken` parameter on existing service functions is being phased out — `apiFetch` reads the in-memory token directly from `useAuthStore`. New code must not require a token argument; old code accepting `_legacyToken` should be migrated to drop the parameter when the next consumer touches it.
- Each service file owns one domain. A `_request` helper that wraps `apiFetch` and unwraps `response.json()` is the canonical shape — reuse it; don't reinvent.
- Service functions return `data` (the parsed JSON body) — they do **not** wrap it again. Hooks consume `data` directly.

## C2. Query/mutation hooks

**Verified pattern (from `halla-mobile/hooks/queries/useTickets.js` + `mutations/useTicketMutations.js`):**

```js
// Query
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../stores/authStore";
import { getTicketsAPI } from "../../services/ticketsService";

export function useTickets(filters = {}) {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ["tickets", filters],
    queryFn: () => getTicketsAPI(token, filters),
    enabled: !!token,
    staleTime: 3 * 60 * 1000,
  });
}

// Mutation
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ENDPOINTS } from "../../config/api";
import { apiFetch } from "../../services/apiClient";

const ticketRequest = async (method, path, _legacyToken, data) => {
  const response = await apiFetch(path, { method, body: data });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || "Request failed");
  return result;
};

export function useCreateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => ticketRequest("POST", ENDPOINTS.TICKETS.BASE, null, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tickets"] }),
  });
}
```

**Mandatory rules:**

- One canonical query hook per endpoint in `hooks/queries/use<Module>.js`. One canonical mutation hook (or set) per endpoint in `hooks/mutations/use<Module>Mutations.js`.
- Direct `apiFetch` calls inside screens/components are forbidden — go through a hook.
- Query keys are arrays starting with the domain (`["tickets", filters]`, `["tickets", id]`, `["events", "stats", filters]`). Mutations invalidate the broadest correct prefix (`queryClient.invalidateQueries({ queryKey: ["tickets"] })`).
- `staleTime` is mandatory; the project standard is 3–5 minutes for list/detail data and shorter for live counters.
- `enabled: !!token` (or the equivalent) gates queries on authentication — copy the pattern from existing hooks; don't fire requests for unauthenticated users.
- When the same hook exists today both in `hooks/queries/` and inside a screen as a private `useQuery`, delete the private copy and migrate the screen.
- Mutation `onSuccess` must invalidate the relevant query keys. If the mutation belongs to two domains, invalidate both.

## C3. Mobile data-mapping discipline (mirrors B0.1)

The same backend response shape is consumed by both web and mobile. After Section A enforcement the shape is single and known. Mobile mappings must match it exactly:

- ❌ `data?.data?.tickets || data?.tickets || data?.items || []`
- ✅ `data?.data?.tickets || []` (when backend uses `sendPaginated` with the field named `tickets`)

If web reads `data?.data?.tickets` and mobile reads `data?.data?.items`, the platforms have diverged — list it in §5 of the plan and pick the canonical one (matching the backend after A6).

## C4. State management

| State Type | Tool |
|------------|------|
| Server data | React Query |
| Auth | Zustand (`useAuthStore`) |
| Local UI | `useState` |
| Forms | RHF (when used) — otherwise plain controlled inputs |
| Persistent prefs | Zustand `persist` + AsyncStorage |
| Secrets / tokens | `expo-secure-store` (see `secureStorage.js`) |

## C5. Identical API consumption with web

This is non-negotiable. For every endpoint in the module:

1. The mobile consumer must call **the same path**, **the same method**, **the same request body shape**, **the same query params**, as the web consumer.
2. Mobile must extract the same fields from the response and render the same data the user would see on web (subject to platform-specific layout — but the data model is identical).
3. If web and mobile diverge today (different paths, different mappings, different filters, different fallback chains), pick the correct version (the one that matches the backend after Section A enforcement) and migrate the other.

## C6. Loading / error / empty states

Every screen that fetches data must render:

- A loading indicator (use the project's existing `<Loading/>` component or `ActivityIndicator` if that's the convention in the screen's neighborhood).
- An error view with a translated message and a "retry" affordance.
- An empty state distinct from the loading state.

If any of these are missing today, add them — copying the existing pattern from a sibling screen so styling stays consistent.

## C7. i18n

- Every user-facing string goes through the project's `t()` (see `localization/`). No hardcoded Arabic/English in JSX.
- Use the namespace that matches the screen's domain. Add missing keys in the plan (do not modify locale JSON without listing the additions).

## C8. Comment hygiene

Same as A9 / B23. Remove FLOW-/PHASE-/BUG- markers and any commentary that re-states the code. The `Phase 4 W0-AUTH:` headers in `services/ticketsService.js`, `useTicketMutations.js`, etc. are exactly the kind of marker to strip.

---

# SECTION D — CROSS-CUTTING RULES (apply to all 3 layers)

## D1. Identical API consumption between Web and Mobile

For each backend endpoint owned by the module:

| Aspect | Both web and mobile must agree on |
|--------|-----------------------------------|
| Path | exact string from `API_PATHS` / mobile equivalent |
| HTTP method | GET/POST/PATCH/DELETE |
| Query params | names, types, required/optional |
| Request body | field names, types, optionality |
| Response field paths | the **single** path they read each value from |
| Pagination shape | `{page, limit, total, pages}` everywhere |

If today they disagree, the plan must list each disagreement with the proposed canonical version and what changes on each side.

## D2. One job — one endpoint

If two endpoints exist for the same job (e.g. `GET /events/my-events` and `GET /events/list-mine`, or `POST /tickets` and `POST /tickets/create`), the plan must:

1. Identify both.
2. Pick the canonical one (preserves the cleaner naming, matches REST conventions, has a Joi schema, has Swagger doc, has more consumers).
3. Migrate every web consumer + every mobile consumer to the canonical one.
4. Delete the duplicate route, controller method, service method, validation schema, and Swagger block.

## D3. No defensive fallback chains anywhere

This is the same rule restated for all layers — backend services that build response objects, API config, frontend mappings:

- Map directly to the one known shape.
- Empty-state guards (`|| []`, `|| {}`, `?? 0`) at the boundary where data first arrives are fine.
- Multi-branch fallbacks (`a?.x || b?.y || c?.z`) are forbidden once the canonical shape is enforced.

## D4. Request/Response Lifecycle Audit (mandatory)

For each endpoint owned by the module, trace the full lifecycle and document any mismatch in the plan:

1. **Route** — middleware chain, validation, RBAC. Is it correct?
2. **Controller** — what does it pass to the service? What does it forward in the response?
3. **Service** — what shape does it return? Does it match what `sendSuccess` / `sendPaginated` will wrap?
4. **Wire shape** — final JSON the client receives. Document this exactly.
5. **Web hook** — `queryFn` shape, the mapping from `data` → component props.
6. **Web component** — does it read the right fields? Does it handle loading/error?
7. **Mobile hook** — same questions.
8. **Mobile screen** — same questions.
9. **Mismatches** — list every place the chain breaks: missing fields, mistyped fields, fallback chains hiding wrong shapes, components reading paths that are never populated, components passing arguments the backend doesn't accept.

## D5. Comment hygiene (all layers)

Apply A9 / B23 / C8 uniformly. The desired final state:

- No FLOW/PHASE/BUG/ticket-number markers.
- No re-statements of code.
- Comments only when they explain *why* the code is the way it is and a reader of the code alone could not infer it.

## D6. Logs and console statements

- Backend: no `console.log` / `console.error` outside the global error handler and `logger.js`.
- Web/Mobile: no `console.log` in committed code. Use `console.error` only inside catch blocks that also surface a user-visible error via `handleError` / toast.

## D7. Style preservation overrides everything

When a refactor would cause **any** visual change, stop and document the discrepancy in the plan. The user reviews and decides. Style changes must never be a side effect of a code-quality refactor.

---

# SECTION E — Module Scan Procedure

When the user invokes this prompt for a module, perform these steps **in order**.

## Step 1 — Inventory the backend module

1. Read `labbe-backend-/src/modules/<module>/index.js` to learn what it exports.
2. Read every `.js` file in the module folder fully.
3. List every endpoint: method + path + middleware chain + controller method + service method.
4. List every model the service touches.
5. List every shared util/middleware the module imports.
6. List every Swagger annotation block + the schemas/parameters it references.
7. Note files that exceed line limits (A8).
8. Note duplicate endpoints, duplicate route handlers, dead code.
9. Note Swagger drift (annotated path/shape vs actual implementation).
10. Note missing pieces: validation, RBAC, audit log, idempotency, transaction, rate limiting, whitelabel filter, subscription gate.

## Step 2 — Map endpoints to web frontend

1. For each endpoint, grep the path and the API_PATHS constant key in `labbe/`.
2. Find the canonical hook in `labbe/hooks/reactQueryHooks/`.
3. Find every direct consumer (`Grep` for the hook name, the API_PATHS path, and the api.config key).
4. List every page (`app/[lang]/**/page.js`) that consumes the module.
5. For each such page, recursively walk its component tree: every component imported, every component imported by those, every hook used.
6. Collect the full file list and check each against B0 line caps.
7. Identify duplicate hooks, fallback chains, hardcoded text, hardcoded paths, hardcoded data, missing loading/error states, prop drilling, inline components, repeated JSX.
8. Note files where the data mapping is wrong (won't match the backend's actual response shape after A6).

## Step 3 — Map endpoints to mobile frontend

1. For each endpoint, grep the path string in `halla-mobile/`.
2. Find the canonical hook (`hooks/queries/use<Module>.js`, `hooks/mutations/use<Module>Mutations.js`).
3. Find every screen and component consumer.
4. Recursively walk each screen's component tree.
5. Check each file against C0 line caps.
6. Identify the same anti-patterns as web (C1–C7) plus mobile-specific issues: raw `fetch` instead of `apiFetch`, no token-refresh handling, no timeout, secure-storage misuse, divergence from web in API consumption.

## Step 4 — Cross-platform diff

For each endpoint, produce a 3-column table:

| Aspect | Web | Mobile |

Columns: path, method, query params, request body, response mapping, hook name, consumer count.

Mark every row where Web and Mobile disagree.

## Step 5 — Write the plan

The plan goes in `docs/modules/<module>-fullstack-review-plan.md` with the format below.

---

# SECTION F — Plan File Format

The plan you write **MUST** follow this template exactly.

```markdown
# <Module> — Full-Stack Review Plan

**Module:** <module>
**Generated:** <YYYY-MM-DD>
**Prompt:** docs/implementation/MODULE_FULLSTACK_REVIEW_PROMPT.md
**Status:** Awaiting green light · NOT IMPLEMENTED YET

---

## 0. Executive Summary

- N total endpoints in module
- N candidates for deletion (duplicates / unused)
- N Swagger drift findings
- N backend file-size violations
- N web file-size violations
- N mobile file-size violations
- N web/mobile API consumption mismatches
- N data mapping bugs (wrong field paths / fallback chains hiding errors)
- N missing/incorrect RBAC / validation / rate-limit / audit-log
- N comment-hygiene blocks to remove
- Estimated effort: <S/M/L>

---

## 1. Endpoint Inventory

| # | Method | Path | Controller | Service | Middleware chain | Swagger | Web hook | Mobile hook | Status |
|---|--------|------|------------|---------|------------------|---------|----------|-------------|--------|
| 1 | GET | /tickets | tickets.controller.getTickets | ticketsService.getTickets | protect, optional whitelabelFilter | OK | useTickets | useTickets (mobile) | KEEP |
| … |

**Legend:** KEEP, DELETE-DUPLICATE-OF-#N, RENAME, MERGE-WITH-#N

---

## 2. Backend Findings

### 2.1 File-size violations
- `<module>.service.js` — N lines (cap 600). Proposed split: …
- …

### 2.2 Swagger drift
- `GET /tickets/:id` — JSDoc claims response includes `replies[]` array; service returns `replies` only when `?include=replies` is set. Fix: …
- …

### 2.3 Missing middleware / safeguards
- `POST /tickets/:id/replies` lacks rate limiting; recommend `authLimiter`. (file:line)
- `PATCH /tickets/:id/status` does not write audit log. Add `logAudit` call in service. (file:line)
- …

### 2.4 Duplicate / dead endpoints
- `GET /tickets/list` duplicates `GET /tickets`. Delete `/tickets/list` after migrating frontend consumers.
- …

### 2.5 Service / controller violations
- `tickets.service.getTickets` does sequential awaits where Promise.all applies. (file:line)
- `tickets.controller.assignTicket` has business logic that belongs in service. (file:line)
- …

### 2.6 Validation gaps
- `POST /tickets` body lacks Joi schema; add `createTicketSchema` in `tickets.validation.js`. Schema spec: …
- …

### 2.7 Comment hygiene
- `tickets.service.js:38` — `// FLOW-23-F01: …` → remove
- …

---

## 3. Frontend Web Findings

### 3.1 Component tree per page
- `app/[lang]/admin-dash/tickets/page.js` (N lines)
  - `_components/TicketsTable.js` (N lines) — VIOLATION cap=250
  - `_components/TicketRow.js` (N lines)
  - `ui/buttons/PrimaryButton.js` (N lines)
- …

### 3.2 File-size violations
- `app/[lang]/admin-dash/tickets/_components/TicketsTable.js` — 312 lines. Proposed split: extract `<FilterBar/>`, `<RowActions/>`. **Style preservation note:** classes `tableContainer`, `headerCell`, `row` must remain in the same `.module.css` and be imported into the extracted components.
- …

### 3.3 Hardcoded text / data / paths
- `…/page.js:42` — `<h1>التذاكر</h1>` → `t("adminTickets.title")`
- …

### 3.4 Data mapping bugs / fallback chains
- `useTickets.js:23` — `data?.data?.tickets || data?.tickets || []` — backend returns `data.tickets` (paginated). Replace with `data?.data?.tickets || []` only.
- …

### 3.5 Duplicate hooks / direct apiRequest calls
- `app/[lang]/host/tickets/page.js:67` has a local `useQuery` against `/tickets` — replace with canonical `useTickets`.
- …

### 3.6 State / loading / error gaps
- `…/page.js` lacks error boundary; lacks `SimpleLoading`; uses `useState` for filter state instead of URL params.
- …

### 3.7 Comment hygiene
- `useTickets.js:5` — `// FLOW-23-F02 added in phase 5` → remove
- …

---

## 4. Frontend Mobile Findings

### 4.1 Screen → component tree
- `screens/host/TicketsScreen.js` (N lines)
  - `components/tickets/TicketCard.js` (N lines) — VIOLATION cap=350
  - `components/tickets/TicketFilters.js` (N lines)
- …

### 4.2 File-size violations
- `components/tickets/TicketCard.js` — 412 lines. Proposed split: extract `<TicketCardHeader/>` and `<TicketCardActions/>`. **Style preservation:** every `StyleSheet.create({...})` value must be moved to the extracted components verbatim, no rounding/renaming.
- …

### 4.3 Service / hook violations
- `services/ticketsService.js:88` uses raw `fetch` — migrate to `apiFetch`.
- Mobile `useTickets` keys data as `data?.data?.items` while web uses `data?.data?.tickets` — backend returns `tickets`. Fix mobile.
- …

### 4.4 Hardcoded text / data / paths
- …

### 4.5 Web/Mobile divergence
- `GET /tickets` filters: web sends `status`, mobile sends `state` — backend accepts `status`. Fix mobile.
- `POST /tickets` — web sends `subject` + `message`; mobile sends `title` + `body`. Backend accepts `subject` + `message`. Fix mobile.
- …

### 4.6 Loading / error / empty states
- …

### 4.7 Comment hygiene
- …

---

## 5. Cross-Platform API Consumption Diff

| Endpoint | Aspect | Web | Mobile | Backend truth | Action |
|----------|--------|-----|--------|---------------|--------|
| GET /tickets | query.status | `status` | `state` | `status` | Fix mobile |
| POST /tickets | body field | `subject` | `title` | `subject` | Fix mobile |
| GET /tickets/:id | response.ticket.replies | `data.ticket.replies` | `data.replies` | `data.ticket.replies` | Fix mobile |
| … |

---

## 6. Suspected Bugs Worth Verifying

(Things that look broken but the agent cannot confirm without running the app — flag them so the user can sanity-check.)

- `PATCH /tickets/:id/status` — service trusts the new status without checking the `VALID_TRANSITIONS` matrix when called by an admin overriding a closed ticket. Possible bypass.
- Web `TicketsTable.js` reads `ticket.assignedTo.username` but the service only populates `username email` — should be safe; verify with a quick run.
- Mobile `useTickets` invalidates `["tickets"]` on success but the query key is `["tickets", filters]` — invalidation works (prefix match) but the hand-written key doesn't include the filter dependency consistently across screens. Investigate.
- …

---

## 7. Implementation Plan (Ordered)

Apply changes in this order. Each item ends with a checkbox the agent will tick during Phase 2.

### 7.A Backend
- [ ] **A.1** Update `tickets.service.js` to use `Promise.all` in `getTicketAssignees`. (file:line)
- [ ] **A.2** Add `logAudit` call in `updateTicketStatus`. (file:line)
- [ ] **A.3** Add Joi schema for `POST /tickets`. (new file: `tickets.validation.js`)
- [ ] **A.4** Delete duplicate `GET /tickets/list` route + controller + Swagger.
- [ ] **A.5** Update Swagger response for `GET /tickets/:id` to match service shape.
- [ ] **A.6** Split `auth.service.js` (only if module is `auth`) — propose 4-file split.
- [ ] **A.7** Comment hygiene pass: 14 markers to remove (listed in §2.7).
- …

### 7.B Web
- [ ] **B.1** Replace fallback chain in `useTickets.js:23`. (file:line)
- [ ] **B.2** Migrate `host/tickets/page.js:67` to canonical `useTickets`. (file:line)
- [ ] **B.3** Split `TicketsTable.js` into 3 components, **preserving CSS modules unchanged**. (file:line)
- [ ] **B.4** Replace 12 hardcoded strings with `t()` (each listed). (files:lines)
- [ ] **B.5** Move filter state to URL params. (file:line)
- [ ] **B.6** Comment hygiene pass: 9 markers to remove (listed in §3.7).
- …

### 7.C Mobile
- [ ] **C.1** Migrate `ticketsService.js` from raw `fetch` to `apiFetch`. (file:line)
- [ ] **C.2** Fix mobile `useTickets` data path to match backend. (file:line)
- [ ] **C.3** Fix mobile `POST /tickets` body fields. (file:line)
- [ ] **C.4** Split `TicketCard.js` into 3 components, **preserving StyleSheet values unchanged**. (file:line)
- [ ] **C.5** Replace N hardcoded strings with `t()` (each listed). (files:lines)
- [ ] **C.6** Comment hygiene pass: M markers (listed in §4.7).
- …

### 7.D Cross-platform alignment (do AFTER A/B/C)
- [ ] **D.1** Verify both web and mobile call `GET /tickets` with `status=` (not `state=`). Re-grep.
- [ ] **D.2** Verify both serialize/deserialize the same response shape end-to-end.
- [ ] **D.3** Add an integration smoke test (or document a manual smoke check) that confirms parity.

---

## 8. Locale-key additions required

(Listed for the user — agent does NOT modify locale JSON without explicit approval.)

- `adminTickets.title` (en: "Tickets", ar: "التذاكر")
- `adminTickets.empty.title` (…)
- …

---

## 9. Rollback plan

For each implementation item, the rollback is a `git revert` of its commit. Items that touch DB shape (rare in this prompt's scope) are called out separately with their own rollback steps.

---

## 10. Acceptance checklist (run after Phase 2)

- [ ] No file in module exceeds the cap.
- [ ] All endpoints have current Swagger.
- [ ] No duplicate endpoints remain.
- [ ] Web + Mobile call the same paths with the same shapes for every endpoint.
- [ ] No fallback chains in data mapping in this module's surface area.
- [ ] No `// FLOW-…` / `// PHASE-…` / `// BUG-…` comments in module's surface area.
- [ ] `npm run lint` clean (or no new warnings introduced).
- [ ] Visual smoke test: every page/screen looks identical before/after the refactor.
```

---

# SECTION G — How the agent should think while running this prompt

1. **Read first, fix later.** Phase 1 is exclusively analysis. Touching code in Phase 1 is forbidden except for grep/read tool calls.
2. **Be exhaustive about the component tree.** Missing a component because it's imported from `ui/` and not from `_components/` is the most common failure mode of the original frontend prompt — fix it here.
3. **Trust the backend, then verify.** The plan should treat the backend's actual response (per A6 / A8) as ground truth. Where the frontend (web or mobile) maps a different shape, the frontend is wrong.
4. **Style preservation is sacred.** When in doubt, propose a smaller refactor that keeps the styling layer untouched, rather than a tidy refactor that risks pixel drift.
5. **Report doubts.** Section 6 (Suspected Bugs) is where you put anything that looks broken but you cannot prove without running the app. Better to over-report than to silently rewrite.
6. **One job, one endpoint.** When in doubt about a duplicate, pick the one with: better Swagger, better naming, better validation, more consumers — and migrate the rest to it.

---

# SECTION H — Output discipline

When the user runs this prompt:

1. Output a one-line confirmation: `Beginning full-stack review of module: <module>. Plan will be written to docs/modules/<module>-fullstack-review-plan.md.`
2. Do all reading silently (you may emit short progress lines: `Scanned backend module (N files). Scanned web (M files). Scanned mobile (K files).`).
3. Write the plan file in one shot.
4. Output a single closing line with the plan path and the count of items in §7. Stop. Wait for green light.

When the user gives green light:

1. Output `Beginning Phase 2 implementation per docs/modules/<module>-fullstack-review-plan.md.`
2. Work through §7 in order. After each item, edit the plan file to tick the box and append `— DONE: <one-line note pointing to the changed file>`.
3. Run lint / type-check / build commands as appropriate when the section finishes.
4. At the end, run the acceptance checklist (§10), tick what passes, and surface what doesn't.
5. Stop. Do not commit unless the user asks.

---

# Quick-start for the user

```
Run docs/implementation/MODULE_FULLSTACK_REVIEW_PROMPT.md for module: <module-name>
```

Available `<module-name>` values (from `labbe-backend-/src/modules/`):

`addons`, `admin`, `auth`, `dashboard`, `discounts`, `events`, `guests`, `locations`, `messaging`, `notifications`, `plans`, `post-event`, `services`, `staff`, `subscriptions`, `taqnyat-templates`, `templates`, `tickets`, `users`, `vendors`.

The plan will land at `docs/modules/<module-name>-fullstack-review-plan.md`. Read it, request changes if needed, and reply with green light to start Phase 2.
