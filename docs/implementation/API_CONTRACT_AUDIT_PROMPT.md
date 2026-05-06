# End-to-End API Contract Audit Prompt

## Instructions for AI Agent

You are performing a **complete end-to-end API contract audit** between frontend (web + mobile) and backend. Your goal is to trace every HTTP request from the UI component that initiates it, through the service/mutation layer, to the backend route/controller/service, and back — identifying every mismatch, mapping error, or broken contract.

---

## Scope

The user will provide a list of **pages/screens** to audit. For each page, you must:

1. **Read the page component** and identify all data-fetching calls (queries, mutations, direct API calls)
2. **Trace the component tree** — read every child component imported by the page and identify additional API calls
3. **Follow each call** through the entire chain:
   - UI component → hook/service → apiClient → backend route → controller → service → model → response
   - Backend response → service/mutation → hook → UI component (data mapping)

---

## Audit Methodology

For **each API endpoint** discovered, produce the following structured analysis:

### 1. Endpoint Identification

```
Endpoint: POST /api/v2/subscriptions/subscribe
Found in: labbe/app/[lang]/host/plans/PlansPage.js:132
Called via: useSubscriptionMutation("subscribe") → apiRequest()
```

### 2. Caller → Mutation/Service Contract

```
What the caller sends:
  { planCode: "basic_event_25", discountCode: "SAVE10" }

What the mutation expects (destructure signature):
  mutationFn: ({ planId, data }) => ...

MISMATCH: Caller sends `planCode`, mutation destructures `planId` → planId = undefined
```

### 3. Mutation/Service → Backend Request

```
What the mutation sends to backend:
  { planId: undefined } → serializes to {} (empty body)

What the backend route expects (req.body):
  { planCode: string, discountCode?: string }

MISMATCH: Backend reads req.body.planCode → gets undefined → throws ValidationError
```

### 4. Backend Response Shape

```
Backend returns on success:
  { status: "success", data: { subscription: { ... }, paymentTransactionId: "..." } }

Backend returns on error:
  { status: "fail", message: "Invalid plan code" }  (HTTP 400)
```

### 5. Frontend Response Handling

```
How the mutation receives the response:
  apiRequest() returns the parsed JSON body directly

How the UI component uses it:
  PlansPage.js:136 → toast.success(t("toasts.subscriptionCreated"))
  PlansPage.js:137 → router.push(`/${lang}/host/create-event`)

MISMATCH: No issue on success path. Error path at line 139 checks `error.status === 400` but
  apiRequest throws AxiosError where status is at error.response.status, not error.status.
```

### 6. Verdict

```
Status: ❌ BROKEN
Root cause: Field name mismatch between caller (planCode) and mutation (planId)
Impact: Subscription creation always fails with 400 "Invalid plan code"
Fix: Change useSubscriptions.js:62 to destructure { planCode, ...rest } instead of { planId, data }
```

---

## Tracing Rules

### Frontend Tracing

1. **Start from the page/screen component** — read the entire file
2. **List all imports** that could make API calls:
   - React Query hooks (`useQuery`, `useMutation`, custom hooks like `useHostPlans`)
   - Service files (`subscriptionService`, `eventsService`, etc.)
   - Direct `apiClient` or `apiRequest` calls
   - `fetch()` calls
3. **For each hook/service call**, read its definition file:
   - What parameters does it accept?
   - What does it destructure from the caller?
   - What does it send to the API?
   - What does it return to the caller?
4. **Read child components** imported by the page:
   - Follow the import chain: Page → ChildComponent → GrandchildComponent
   - Check if any child makes its own API calls (not through the page)
   - Check if props passed to children match what children expect
5. **Check the apiClient configuration**:
   - What is the base URL?
   - How are auth tokens attached?
   - How are errors transformed?
   - What is the response shape returned to callers?

### Backend Tracing

1. **Find the route** that matches the endpoint:
   - Search in `labbe-backend-/src/modules/*/routes.js`
   - Note the HTTP method, path, and middleware chain
2. **Read the controller handler**:
   - What does it read from `req.body`, `req.params`, `req.query`?
   - What does it pass to the service?
   - What does it return via `res.json()` or `sendSuccess()`?
3. **Read the service method**:
   - What parameters does it accept?
   - What validation does it perform?
   - What does it return?
4. **Read the model interaction**:
   - What fields are queried/created/updated?
   - What does the Mongoose query return?
   - Are there virtual fields or populate calls that affect the shape?

---

## Mismatch Categories to Check

### Request Side

| Category | What to Check |
|----------|---------------|
| **Field name mismatch** | Caller sends `planCode`, backend expects `planCode` — but mutation sends `planId` |
| **Missing required field** | Backend requires `planCode`, caller doesn't send it |
| **Extra field ignored** | Caller sends `addonItems`, backend doesn't read it |
| **Type mismatch** | Caller sends string `"25"`, backend expects number `25` |
| **Nested vs flat** | Caller sends `{ plan: { code: "x" } }`, backend reads `req.body.planCode` |
| **Array vs single** | Caller sends `["a","b"]`, backend expects `"a,b"` |
| **Boolean stringification** | Caller sends `true`, backend reads `"true"` from query param |
| **Date format** | Caller sends ISO string, backend expects `YYYY-MM-DD` |
| **File upload** | Caller sends JSON, backend expects `multipart/form-data` |
| **Header missing** | Backend requires `X-Idempotency-Key`, caller doesn't send it |
| **Auth token** | Caller uses wrong token storage or cookie name |

### Response Side

| Category | What to Check |
|----------|---------------|
| **Response envelope mismatch** | Backend returns `{ status, data }`, frontend reads `response.data` (double-wrapped) |
| **Field name mismatch** | Backend returns `invitePool`, frontend reads `response.invites` |
| **Nested path mismatch** | Backend returns `data.subscription`, frontend reads `data` |
| **Null vs undefined** | Backend returns `null`, frontend does `response.foo.bar` → crash |
| **Array vs object** | Backend returns `[{...}]`, frontend does `response.name` |
| **Missing field** | Backend doesn't return `rating`, frontend displays `rating` as undefined |
| **Type coercion** | Backend returns number `0`, frontend checks `if (response.count)` → falsy |
| **Date parsing** | Backend returns ISO string, frontend doesn't parse it |
| **Pagination shape** | Backend returns `{ page, limit, total }`, frontend reads `response.pagination` |
| **Error shape** | Backend returns `{ message }`, frontend reads `response.error` |

### Component Props

| Category | What to Check |
|----------|---------------|
| **Prop name mismatch** | Parent passes `plans`, child expects `planList` |
| **Prop type mismatch** | Parent passes object, child expects array |
| **Missing required prop** | Parent doesn't pass `onSelect`, child calls `onSelect()` → crash |
| **Unused prop** | Parent passes `showDetails`, child never reads it |

---

## Output Format

For each page/screen audited, produce:

```markdown
## Page: [page path]

### API Calls Discovered: [N]

---

### Call 1: [HTTP Method] [endpoint]

**Discovery chain:**
`[PageComponent.js:line]` → `[hookName()]` → `[apiRequest()]` → `[backend route]` → `[controller]` → `[service]`

**Caller → Mutation:**
- Caller sends: `{ ... }`
- Mutation expects: `({ ... })`
- Mismatch: [description or "None"]

**Mutation → Backend:**
- Sends: `{ ... }`
- Backend expects: `req.body.{ ... }` / `req.params.{ ... }` / `req.query.{ ... }`
- Mismatch: [description or "None"]

**Backend Response:**
- Success shape: `{ ... }`
- Error shape: `{ ... }`

**Frontend Response Handling:**
- Receives: `response.{ ... }`
- Uses: `response.{ ... }` in [component:line]
- Mismatch: [description or "None"]

**Verdict:** ✅ OK / ❌ BROKEN / ⚠️ PARTIAL
**Fix:** [if broken]
```

---

## Coverage Requirements

For each page/screen provided:

1. ✅ Read the **entire page file** — every line
2. ✅ Read **every imported component** that is rendered in the page's JSX
3. ✅ Read **every hook** called by the page or its children
4. ✅ Read **every service file** imported by hooks or the page
5. ✅ Read the **apiClient** configuration used
6. ✅ Read the **backend route** file for each endpoint
7. ✅ Read the **backend controller** for each endpoint
8. ✅ Read the **backend service** for each endpoint
9. ✅ Read the **backend model** if it affects response shape (virtuals, populate, transforms)
10. ✅ Check **error handling paths** — not just the happy path

---

## Special Attention Areas

1. **React Query hooks** — check `mutationFn` and `queryFn` parameter destructuring vs what callers pass
2. **apiClient wrappers** — check how `apiRequest` transforms the response before returning it
3. **Response unwrap logic** — check if hooks do `return response.data` or `return response`
4. **Error transformation** — check if errors are re-thrown with the right shape
5. **Loading/optimistic state** — check if `onMutate` or `onSettled` use correct data shapes
6. **Pagination** — check if `page`, `limit`, `total` are consistently named across all layers
7. **File uploads** — check if `FormData` is used correctly vs JSON body
8. **Query params** — check if filters are serialized correctly (arrays, booleans, dates)
9. **Auth context** — check if tokens are attached to every request
10. **Mobile vs Web parity** — if both platforms call the same endpoint, check if they send the same shape

---

## What NOT to Do

- Do NOT assume an endpoint works because the code looks correct — trace every layer
- Do NOT skip child components — they may make independent API calls
- Do NOT skip error paths — the happy path may work but error handling may be broken
- Do NOT skip the apiClient layer — it may transform requests/responses in unexpected ways
- Do NOT stop at the controller — the service may return a different shape than the controller sends
- Do NOT guess field names — read the actual code at every layer

---

## Starting Point

When the user provides a list of pages/screens, begin by:

1. Reading each page file completely
2. Building an import tree for each page (page → children → grandchildren)
3. Identifying all API calls in the tree
4. Tracing each call end-to-end using the methodology above
5. Producing the structured audit output for each call
