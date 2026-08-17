# Frontend Page Code Review & Fix Prompt

## Instructions for AI Agent

You are performing a **complete page code review and refactor** for the Halla frontend (Next.js 15 + React 19). Your goal is to read each page file, identify all anti-patterns, violations, and code quality issues, then fix the page to match the established project conventions.

The user will provide a list of **page paths** to audit. For each page, you must read it fully, identify issues, and fix them according to the rules below.

---

## Project Stack Reference

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15.5.9 (App Router, Turbopack) |
| React | 19.0.0 |
| State Management | Zustand 5.0.6 (with persist middleware) |
| Data Fetching | TanStack React Query 5.90.21 |
| Forms | React Hook Form 7.57.0 + Zod 3.25.56 |
| i18n | i18next 25.2.1 + react-i18next 15.5.2 |
| HTTP Client | Axios (new-backend) + Fetch (legacy apiClient) |
| Styling | CSS Modules (`.module.css`) |
| Icons | lucide-react + react-icons |
| Toasts | react-toastify 11.0.5 |
| Charts | Chart.js 4.5.0 + react-chartjs-2, Recharts 3.1.2 |

---

## Directory Structure Reference

```
labbe/
├── app/[lang]/                    # Pages (App Router)
│   ├── layout.js                  # Root layout (async Server Component)
│   ├── page.js                    # Landing page
│   ├── (auth-layout)/             # Auth route group
│   ├── admin-dash/                # Admin dashboard pages
│   ├── host/                      # Host dashboard pages
│   ├── vendor-dashboard/          # Vendor dashboard pages
│   ├── market-place/              # Marketplace pages
│   ├── post-event/                # Post-event guest pages
│   └── staff/                     # Staff pages
├── components/shared/             # Shared components (minimal)
├── ui/                            # UI component library (bulk of components)
├── hooks/                         # Custom hooks
│   ├── events/                    # Event-related hooks
│   ├── mutations/                 # Generic mutation hooks
│   ├── queries/                   # Generic query hooks
│   └── reactQueryHooks/           # React Query domain hooks
├── services/                      # API services
│   ├── new-backend/               # Modern API client (axios + React Query)
│   │   ├── apiClient.js           # Main API client
│   │   └── api.config.js          # API_PATHS registry
│   └── *.js                       # Domain services
├── stores/                        # Zustand stores
├── providers/                     # React providers
├── localization/                  # i18n configuration
│   ├── i18n.js                    # Server-side i18n init
│   └── locales/{en,ar}/           # Translation JSON files (33 namespaces each)
├── utils/                         # Utility functions
│   ├── schemas/                   # Zod validation schemas
│   ├── toastUtils.js              # Toast wrapper
│   └── date/                      # Date utilities
└── config/                        # App configuration
```

---

## Rule 1: Page and Component File Size Limits

### Web (Next.js) — MAX 250 LINES
Page files and all components in their component tree must NOT exceed **250 lines**. If a file exceeds this limit, extract logic into:
- `_components/` directory for UI components
- Custom hooks in `hooks/` for business logic
- Service files in `services/` for API calls

### Mobile (React Native) — MAX 350 LINES
For React Native pages and all components used by these pages, files must NOT exceed **350 lines** (styles are co-located in the same files). If a file exceeds this limit, extract logic into:
- Separate component files for UI components
- Custom hooks in `hooks/` for business logic
- Service files in `services/` for API calls

### Anti-Pattern (VIOLATION)
```jsx
// ❌ BAD: 400-line page file with inline components, logic, and API calls
const MyPage = () => {
  const [state1, setState1] = useState();
  const [state2, setState2] = useState();
  // ... 300 more lines of inline logic, JSX, handlers ...
  const StatCard = ({ title, value }) => ( ... ); // inline component
  const FilterBar = ({ filters }) => ( ... );     // inline component
  return ( ... );
};
```

### Correct Pattern
```jsx
// ✅ GOOD: Page file under line limit, delegates to components and hooks
import MyPageContent from "./_components/MyPageContent";
import { useMyPageData } from "@/hooks/useMyPageData";

const MyPage = () => {
  const { data, isLoading } = useMyPageData();
  return <MyPageContent data={data} isLoading={isLoading} />;
};
```

### Component Tree Rule
When reviewing a page, **all components in its tree** (components rendered by the page, and components rendered by those components, etc.) must also follow the same line limits:
- **Web**: Every component in the page's tree must NOT exceed 250 lines
- **Mobile**: Every component in the page's tree must NOT exceed 350 lines

If any component in the tree exceeds the limit, it must be refactored and split just like the page itself.

---

## Rule 2: NO Hardcoded Text — Always Use i18n

### Pattern
ALL user-facing text MUST use the `t()` function from `useTranslation()`. Never hardcode Arabic or English strings in JSX.

### Anti-Pattern (VIOLATION)
```jsx
// ❌ BAD: Hardcoded text
<h1>لوحة التحكم</h1>
<p>نظرة عامة على الأداء والإحصائيات</p>
<button>إضافة مضيف</button>
<div>لا توجد نتائج</div>
<span>{t("some.key")} - {data.count} عنصر</span> // mixed hardcoded + t()
```

### Correct Pattern
```jsx
// ✅ GOOD: All text through t()
const { t } = useTranslation("adminDashboard");

<h1>{t("dashboard.title")}</h1>
<p>{t("dashboard.subtitle")}</p>
<button>{t("buttons.addHost")}</button>
<div>{t("noResults.title")}</div>
<span>{t("common.items_count", { count: data.count })}</span>
```

### Namespace Rules
- Use the **appropriate namespace** for each page domain:
  - Admin pages → `"adminDashboard"`, `"adminHosts"`, `"adminEvents"`, etc.
  - Host pages → `"createEvent"`, `"host-events"`, `"hostPayments"`, `"plans"`
  - Vendor pages → `"vendorServices"`, `"vendorSettings"`
  - Auth pages → `"login"`, `"signup"`, `"forgetPassword"`, `"changePassword"`
  - Common UI → `"common"`, `"table"`, `"pagination"`
- Default namespace (no argument) loads `"common"` — use explicit namespace for domain-specific text
- Always provide fallback: `t("key", "Fallback text")` for safety

### Locale File Reference
Translation files live in `localization/locales/{en,ar}/`:
```
adminDashboard.json, adminEvents.json, adminHosts.json, adminModerators.json,
adminPayments.json, adminSettings.json, adminTickets.json, adminVendors.json,
adminWhitelabels.json, changePassword.json, common.json, continueSignup.json,
createEvent.json, events.json, forgetPassword.json, home-events.json,
host-events.json, hostPayments.json, landing.json, login.json, pagination.json,
plans.json, postEvent.json, settings.json, setupPassword.json, signup.json,
staff.json, table.json, ticketRating.json, tickets.json, vendorServices.json,
vendorSettings.json, whitelabelPlans.json
```

---

## Rule 3: NO Hardcoded Data — Fetch from Backend

### Pattern
ALL data that comes from the backend MUST be fetched via React Query hooks or service calls. Never hardcode arrays, objects, or values that should come from an API.

### Anti-Pattern (VIOLATION)
```jsx
// ❌ BAD: Hardcoded data that should come from backend
const plans = [
  { id: 1, name: "Basic", price: 99 },
  { id: 2, name: "Pro", price: 199 },
];

const stats = {
  totalEvents: 42,
  totalGuests: 1200,
  revenue: 5000,
};

const categories = ["wedding", "conference", "birthday"];
```

### Correct Pattern
```jsx
// ✅ GOOD: Data fetched from backend via hooks
const { data: plansData } = usePlans();
const { data: statsData } = useHostDashboard();
const { data: categoriesData } = useEventCategories();

const plans = plansData?.data?.plans || [];
const stats = statsData?.data?.stats || {};
const categories = categoriesData?.data?.categories || [];
```

### Exception: Static config/constants
Only these are acceptable as hardcoded:
- `ITEMS_PER_PAGE = 12` (pagination config)
- `DEFAULT_ADDRESS` (form default values)
- URL/path constants
- Enum values that match backend constants (e.g., `USER_ROLES`)

---

## Rule 4: Server Component Pattern (for Dashboard Pages)

### Pattern
Dashboard pages that need SSR data prefetching MUST use this pattern:

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
  // 1. Await params (Next.js 15 requirement)
  const resolvedParams = await params;
  const { lang } = resolvedParams;

  // 2. Optional: RBAC check
  // await requirePageAccess("pageKey", lang);

  // 3. Get auth token from cookies
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  // 4. Create server QueryClient
  const queryClient = createServerQueryClient();

  // 5. Parse search params for filters
  const urlParams = await searchParams;
  const filters = {
    page: urlParams?.page || 1,
    limit: urlParams?.limit || 10,
    search: urlParams?.search,
    status: urlParams?.status,
  };

  // 6. Prefetch data if authenticated
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

  // 7. Wrap content in QueryClientServerProvider
  return (
    <QueryClientServerProvider queryClient={queryClient}>
      <PageContent />
    </QueryClientServerProvider>
  );
}
```

### Anti-Pattern (VIOLATION)
```jsx
// ❌ BAD: Not awaiting params (Next.js 15)
export default function DashboardPage({ params }) {
  const { lang } = params; // params is a Promise in Next.js 15!

// ❌ BAD: Fetching data in page instead of prefetching
export default async function DashboardPage() {
  const res = await fetch("/api/data");
  const data = await res.json();
  return <PageContent data={data} />;

// ❌ BAD: Missing QueryClientServerProvider wrapper
export default async function DashboardPage() {
  return <PageContent />; // No hydration boundary!
```

---

## Rule 5: Client Component Pattern (for Interactive Pages)

### Pattern
Pages with client-side interactivity (forms, filters, state) MUST use this pattern:

```jsx
"use client";
import React, { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams, useRouter } from "next/navigation";
import { useDomainData } from "@/hooks/reactQueryHooks/useDomain";
import { useDebounce } from "@/hooks/useDebounce";
import PageContent from "./_components/PageContent";
import Filters from "./_components/Filters";

const MyPage = () => {
  // 1. i18n with correct namespace
  const { t } = useTranslation("namespace");

  // 2. Navigation hooks
  const router = useRouter();
  const searchParams = useSearchParams();

  // 3. URL-based state (for filters/search)
  const searchQuery = searchParams.get("search") || "";
  const currentPage = parseInt(searchParams.get("page")) || 1;

  // 4. Local state for inputs
  const [searchInput, setSearchInput] = useState(searchQuery);
  const debouncedSearch = useDebounce(searchInput, 400);

  // 5. React Query hooks for data
  const { data, isLoading, error } = useDomainData({ search: searchQuery });

  // 6. Memoized derived data
  const items = useMemo(() => data?.data?.items || [], [data]);

  // 7. useCallback for all handlers
  const handleFilterChange = useCallback((key, value) => {
    const params = new URLSearchParams(searchParams);
    params.set(key, value);
    params.set("page", "1");
    router.push(`?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  // 8. Loading state
  if (isLoading) return <SimpleLoading />;

  // 9. Error state
  if (error) return <ErrorFallback message={t("errors.loadFailed")} />;

  // 10. Render with extracted components
  return (
    <div className={styles.container}>
      <Filters filters={...} onFilterChange={handleFilterChange} />
      <PageContent items={items} />
    </div>
  );
};

export default MyPage;
```

### Anti-Pattern (VIOLATION)
```jsx
// ❌ BAD: Missing "use client" directive with hooks
import { useState } from "react"; // Will crash without "use client"

// ❌ BAD: Inline event handlers instead of useCallback
<button onClick={() => { router.push(`/page?id=${id}`); }}>

// ❌ BAD: Not using URL state for filters (breaks bookmarking/sharing)
const [filter, setFilter] = useState("all"); // Should be in URL

// ❌ BAD: Missing loading/error states
const { data } = useDomainData();
return <PageContent items={data.items} />; // No loading/error handling
```

---

## Rule 6: React Query Hook Pattern

### Pattern
All data fetching hooks MUST follow this structure:

```jsx
"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";

// Query hook
export const useDomainData = (params = {}, options = {}) => {
  return useQuery({
    queryKey: ["domain", "data-key", params],
    queryFn: () => apiRequest({
      method: "GET",
      path: API_PATHS.domain.getData,
      params,
    }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options, // Allow caller overrides
  });
};

// Mutation hook (action-based factory pattern)
export const useDomainMutation = (action) => {
  const queryClient = useQueryClient();
  const mutations = {
    create: {
      mutationFn: (data) => apiRequest({
        method: "POST",
        path: API_PATHS.domain.create,
        data,
      }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["domain", "data-key"] });
      },
    },
    update: {
      mutationFn: ({ id, data }) => apiRequest({
        method: "PATCH",
        path: API_PATHS.domain.update(id),
        data,
      }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["domain", "data-key"] });
      },
    },
    delete: {
      mutationFn: (id) => apiRequest({
        method: "DELETE",
        path: API_PATHS.domain.delete(id),
      }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["domain", "data-key"] });
      },
    },
  };
  return useMutation(mutations[action]);
};

// Convenience exports
export const useCreateDomain = () => useDomainMutation("create");
export const useUpdateDomain = () => useDomainMutation("update");
export const useDeleteDomain = () => useDomainMutation("delete");
```

### Anti-Pattern (VIOLATION)
```jsx
// ❌ BAD: Direct apiRequest in component instead of hook
const handleSubmit = async () => {
  const res = await apiRequest({ method: "POST", path: "/api/data", data });
};

// ❌ BAD: Missing queryKey or inconsistent queryKey
useQuery({
  queryKey: ["data"], // Too generic, will conflict
  queryFn: () => ...,
});

// ❌ BAD: No cache invalidation on mutation
useMutation({
  mutationFn: (data) => apiRequest({ method: "POST", path: "...", data }),
  // No onSuccess to invalidate queries!
});

// ❌ BAD: Missing staleTime
useQuery({
  queryKey: ["domain", "key"],
  queryFn: () => ...,
  // No staleTime — will refetch on every window focus
});
```

---

## Rule 7: API_PATHS Usage

### Pattern
ALL API paths MUST come from `API_PATHS` in `services/new-backend/api.config.js`. Never hardcode URLs.

```jsx
// ✅ GOOD
import { API_PATHS } from "@/services/new-backend/api.config";

path: API_PATHS.events.getMyEvents
path: API_PATHS.admin.hosts.getAll
path: API_PATHS.dashboard.getHostDashboard
path: API_PATHS.auth.login
```

### Anti-Pattern (VIOLATION)
```jsx
// ❌ BAD: Hardcoded API paths
path: "/events/my-events"
path: "/api/v2/dashboard/host"
path: `${process.env.NEXT_PUBLIC_API_URL}/auth/login`
```

---

## Rule 8: Error Handling Pattern

### Pattern
Use the centralized `errorHandlingService` for all error handling:

```jsx
import { handleError } from "@/services/errorHandlingService";
import { toastUtils } from "@/utils/toastUtils";

// In mutation/error handler
try {
  await mutation.mutateAsync(data);
  toastUtils.success(t("success.created"));
} catch (error) {
  handleError(error, t, { fallbackMessage: "errors.create_failed" });
}
```

### Anti-Pattern (VIOLATION)
```jsx
// ❌ BAD: Console.error only (user sees nothing)
catch (error) {
  console.error("Error:", error);
}

// ❌ BAD: Raw error message to user
catch (error) {
  toast.error(error.message); // Shows technical error to user

// ❌ BAD: Custom error handling instead of centralized service
catch (error) {
  if (error.response?.status === 400) {
    toast.error("Bad request");
  } else if (error.response?.status === 500) {
    toast.error("Server error");
  }
}
```

---

## Rule 9: Component Extraction Pattern

### Pattern
Extract components when:
- Page or component file exceeds the line limit (250 for web, 350 for mobile)
- A JSX block is repeated 2+ times
- A section has its own state/logic (10+ lines)
- A UI section is logically separable (header, filters, table, cards)

Component file structure (Web):
```
app/[lang]/domain/page/
├── page.js                    # Page file (max 250 lines)
├── page.module.css            # Page styles
└── _components/
    ├── PageHeader/
    │   ├── PageHeader.js
    │   └── PageHeader.module.css
    ├── Filters/
    │   ├── Filters.js
    │   └── Filters.module.css
    ├── DataTable/
    │   ├── DataTable.js
    │   └── DataTable.module.css
    └── StatsCards/
        ├── StatsCards.js
        └── StatsCards.module.css
```

Component file structure (Mobile React Native):
```
src/screens/DomainScreen/
├── DomainScreen.js            # Page file (max 350 lines, styles included)
└── components/
    ├── PageHeader/
    │   └── PageHeader.js      # Component (max 350 lines, styles included)
    ├── Filters/
    │   └── Filters.js
    ├── DataTable/
    │   └── DataTable.js
    └── StatsCards/
        └── StatsCards.js
```

### Component Props Pattern
```jsx
// ✅ GOOD: Destructured props with defaults
const StatsCards = ({ stats, isLoading = false, onRefresh }) => {
  // ...
};

// ✅ GOOD: Single object prop for complex data
const ServiceCard = ({ service, onToggleStatus, onDelete }) => {
  // service = { id, title, tags, isAvailable, price, image, rating }
};

// ✅ GOOD: Callback props named with "on" prefix
const FilterBar = ({ filters, onFilterChange, onReset, onApply }) => {
```

### Anti-Pattern (VIOLATION)
```jsx
// ❌ BAD: Inline component in page file
const MyPage = () => {
  const StatCard = ({ title, value }) => (
    <div className={styles.card}>
      <h3>{title}</h3>
      <span>{value}</span>
    </div>
  );
  return <StatCard title="Events" value={10} />;
};

// ❌ BAD: Props drilling too deep (use context or state management)
<Page data={data}>
  <Section data={data}>
    <Card data={data}>
      <Item data={data} />
    </Card>
  </Section>
</Page>

// ❌ BAD: Passing too many individual props (use object)
<UserCard
  name={user.name}
  email={user.email}
  phone={user.phone}
  role={user.role}
  status={user.status}
  avatar={user.avatar}
  createdAt={user.createdAt}
/>
// Better: <UserCard user={user} />
```

---

## Rule 10: State Management Pattern

### Pattern
Use the right tool for the right job:

| State Type | Tool | Example |
|------------|------|---------|
| Server data | React Query | `useMyEvents()`, `useDashboard()` |
| UI state (local) | `useState` | `isOpen`, `searchInput`, `currentStep` |
| UI state (shared) | Zustand | `useAuthStore()`, `useSidebarStore()` |
| Form state | React Hook Form | `useForm()`, `FormProvider` |
| URL state | `useSearchParams` + `useRouter` | Filters, pagination, search |
| Debounced input | `useDebounce` | Search input with delay |

### Anti-Pattern (VIOLATION)
```jsx
// ❌ BAD: Using useState for server data
const [events, setEvents] = useState([]);
useEffect(() => {
  fetch("/api/events").then(r => r.json()).then(setEvents);
}, []);
// Should use: const { data } = useMyEvents();

// ❌ BAD: Using useState for auth state
const [isAuthenticated, setIsAuthenticated] = useState(false);
// Should use: const { isAuthenticated } = useAuthStore();

// ❌ BAD: Using React Query for form state
const { data: formData } = useQuery({
  queryKey: ["form"],
  queryFn: () => formValues,
});
// Should use: const { register, handleSubmit } = useForm();
```

---

## Rule 11: CSS Modules Pattern

### Pattern
All styling MUST use CSS Modules. Never use inline styles or global CSS (except in `globals.css`).

```jsx
// ✅ GOOD
import styles from "./page.module.css";

<div className={styles.container}>
  <h1 className={styles.title}>...</h1>
  <div className={`${styles.card} ${styles.active}`}>...</div>
</div>
```

### Anti-Pattern (VIOLATION)
```jsx
// ❌ BAD: Inline styles
<div style={{ display: "flex", gap: "16px", padding: "20px" }}>

// ❌ BAD: Global class names
<div className="container">
<div className="flex gap-4 p-5">

// ❌ BAD: Tailwind classes (not used in this project)
<div className="bg-white rounded-lg shadow-md p-4">
```

---

## Rule 12: Form Pattern (React Hook Form + Zod)

### Pattern
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

  const onSubmit = (data) => {
    // data is validated by Zod
    mutation.mutate(data);
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <input {...register("name")} />
        {errors.name && <span>{errors.name.message}</span>}
        <button type="submit">Submit</button>
      </form>
    </FormProvider>
  );
};
```

### Anti-Pattern (VIOLATION)
```jsx
// ❌ BAD: Manual form state without react-hook-form
const [name, setName] = useState("");
const [email, setEmail] = useState("");
const [errors, setErrors] = useState({});

const handleSubmit = () => {
  const newErrors = {};
  if (!name) newErrors.name = "Required";
  if (!email) newErrors.email = "Required";
  if (Object.keys(newErrors).length > 0) {
    setErrors(newErrors);
    return;
  }
  // submit...
};

// ❌ BAD: No Zod validation
// All form validation should use Zod schemas from utils/schemas/
```

---

## Rule 13: Loading & Error States

### Pattern
Every page/component that fetches data MUST handle loading and error states:

```jsx
const { data, isLoading, error } = useDomainData();

// Loading state
if (isLoading) {
  return <SimpleLoading />;
  // Or: <SimpleLoading message={t("loading.data")} />
}

// Error state
if (error) {
  return (
    <div className={styles.error}>
      <p>{t("errors.loadFailed", "Failed to load data")}</p>
    </div>
  );
}

// Success state
return <PageContent data={data} />;
```

### Anti-Pattern (VIOLATION)
```jsx
// ❌ BAD: No loading state (shows undefined data while loading)
const { data } = useDomainData();
return <PageContent items={data.items} />; // data is undefined during load

// ❌ BAD: No error state (crashes on error)
const { data } = useDomainData();
return <PageContent items={data.items} />; // crashes if error

// ❌ BAD: Using raw loading spinner instead of SimpleLoading component
if (isLoading) return <div className="spinner"></div>;
```

---

## Rule 14: URL State for Filters

### Pattern
Filter state MUST live in URL query params for bookmarkability and shareability:

```jsx
const searchParams = useSearchParams();
const router = useRouter();

// Read from URL
const category = searchParams.get("category") || "all";
const page = parseInt(searchParams.get("page")) || 1;

// Update URL (use useCallback)
const handleFilterChange = useCallback((key, value) => {
  const params = new URLSearchParams(searchParams);
  if (!value) {
    params.delete(key);
  } else {
    params.set(key, value);
  }
  params.set("page", "1"); // Reset pagination on filter change
  router.push(`?${params.toString()}`, { scroll: false });
}, [searchParams, router]);
```

### Anti-Pattern (VIOLATION)
```jsx
// ❌ BAD: Filter state in useState (not bookmarkable)
const [category, setCategory] = useState("all");
const [page, setPage] = useState(1);

// ❌ BAD: Not resetting page on filter change
const handleFilterChange = (key, value) => {
  const params = new URLSearchParams(searchParams);
  params.set(key, value);
  router.push(`?${params.toString()}`); // Page stays at old value!
};
```

---

## Rule 15: RBAC / Access Control Pattern

### Pattern
For admin pages, use `requirePageAccess` in server components and `usePageAccess` in client components:

```jsx
// Server component (page.js)
import { requirePageAccess } from "@/services/serverAuth";

export default async function AdminPage({ params }) {
  const { lang } = await params;
  await requirePageAccess("hosts", lang); // Throws if no access
  // ...
}

// Client component
import { usePageAccess } from "@/hooks/usePageAccess";
import { ADMIN_PAGES } from "@/ui/layout/navConfig";

const AdminContent = () => {
  const { canCreate, canDelete, canExport } = usePageAccess(ADMIN_PAGES.HOSTS);

  return (
    <div>
      {canCreate && <AddButton />}
      {canDelete && <DeleteButton />}
      {canExport && <ExportButton />}
    </div>
  );
};
```

---

## Rule 16: Mutation Error Handling in Components

### Pattern
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

### Anti-Pattern (VIOLATION)
```jsx
// ❌ BAD: No try/catch around mutation
const handleSubmit = async (data) => {
  await createMutation.mutateAsync(data); // Unhandled rejection!
};

// ❌ BAD: Manual error handling instead of handleError
const handleSubmit = async (data) => {
  try {
    await createMutation.mutateAsync(data);
  } catch (error) {
    if (error.response?.status === 400) {
      toast.error("Bad request");
    }
  }
};

// ❌ BAD: Not using toastUtils
const handleSubmit = async (data) => {
  await createMutation.mutateAsync(data);
  alert("Success!"); // Use toastUtils.success() instead
};
```

---

## Rule 17: Next.js 15 Params Handling

### Pattern
In Next.js 15, `params` and `searchParams` are Promises and MUST be awaited:

```jsx
// Server component
export default async function Page({ params, searchParams }) {
  const resolvedParams = await params;
  const { lang, id } = resolvedParams;

  const urlParams = await searchParams;
  const filter = urlParams?.filter;
  // ...
}
```

### Anti-Pattern (VIOLATION)
```jsx
// ❌ BAD: Not awaiting params (Next.js 15)
export default function Page({ params }) {
  const { lang } = params; // params is a Promise!

// ❌ BAD: Destructuring before awaiting
export default async function Page({ params }) {
  const { lang } = await params; // Works but less clear
```

---

## Rule 18: Image Handling Pattern

### Pattern
Use Next.js `Image` component with proper attributes:

```jsx
import Image from "next/image";

<Image
  src={imageUrl || "/images/placeholder.jpg"}
  alt={t("images.event_alt")}
  width={200}
  height={200}
/>
```

For dynamic backend URLs:
```jsx
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

const getImageUrl = (imagePath) => {
  if (!imagePath) return "/images/placeholder.jpg";
  if (imagePath.startsWith("http")) return imagePath;
  const cleanPath = imagePath.startsWith("/") ? imagePath.slice(1) : imagePath;
  return `${BACKEND_URL}/api/${cleanPath}`;
};
```

### Anti-Pattern (VIOLATION)
```jsx
// ❌ BAD: Using <img> tag instead of Next.js Image
<img src={imageUrl} alt="Event" />

// ❌ BAD: Hardcoded backend URL
<img src={`http://localhost:8000/api/${imagePath}`} />
```

---

## Rule 19: Export Pattern

### Pattern
Pages should have a default export. Wrap with ErrorBoundary when appropriate:

```jsx
const MyPageContent = () => {
  // ... page logic
};

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

---

## Rule 20: No Repetitive Code (DRY)

### Pattern
Extract repeated patterns into reusable components or utility functions:

```jsx
// ✅ GOOD: Reusable stat card component
const StatCard = ({ icon, label, value, trend }) => (
  <div className={styles.statCard}>
    {icon}
    <span className={styles.label}>{label}</span>
    <span className={styles.value}>{value}</span>
    {trend && <span className={styles.trend}>{trend}</span>}
  </div>
);

// Usage
<StatCard icon={<Users />} label={t("stats.totalGuests")} value={stats.guests} />
<StatCard icon={<Calendar />} label={t("stats.totalEvents")} value={stats.events} />
```

### Anti-Pattern (VIOLATION)
```jsx
// ❌ BAD: Repeated JSX blocks
<div className={styles.card}>
  <Users />
  <span>{t("stats.totalGuests")}</span>
  <span>{stats.guests}</span>
</div>
<div className={styles.card}>
  <Calendar />
  <span>{t("stats.totalEvents")}</span>
  <span>{stats.events}</span>
</div>
<div className={styles.card}>
  <Money />
  <span>{t("stats.totalRevenue")}</span>
  <span>{stats.revenue}</span>
</div>
```

---

## Complete Anti-Pattern Checklist

When reviewing a page file, check for ALL of these violations:

### Code Quality
- [ ] Page file exceeds line limit (250 for web, 350 for mobile)
- [ ] Component in page tree exceeds line limit (250 for web, 350 for mobile)
- [ ] Inline component definitions inside page
- [ ] Repeated JSX blocks (not extracted to component)
- [ ] Messy/unorganized imports (not grouped by type)
- [ ] Unused imports or variables
- [ ] Console.log/console.error left in production code (except error handlers)
- [ ] TODO/FIXME comments without tracking

### Hardcoded Values
- [ ] Hardcoded user-facing text (not using `t()`)
- [ ] Hardcoded API paths (not using `API_PATHS`)
- [ ] Hardcoded data arrays/objects that should come from backend
- [ ] Hardcoded backend URLs (not using env vars)
- [ ] Hardcoded colors/styles (not using CSS modules)

### Data Fetching
- [ ] Using `useState` + `useEffect` for server data instead of React Query
- [ ] Missing loading state
- [ ] Missing error state
- [ ] No `staleTime` on queries
- [ ] No cache invalidation on mutations
- [ ] Direct `fetch()` or `apiRequest()` in component instead of through hooks
- [ ] Not awaiting `params`/`searchParams` in Next.js 15 server components

### i18n
- [ ] Hardcoded Arabic text
- [ ] Hardcoded English text
- [ ] Mixed hardcoded + `t()` in same component
- [ ] Using wrong namespace for domain
- [ ] Missing fallback values in `t()` calls

### State Management
- [ ] Using `useState` for auth state (should use `useAuthStore`)
- [ ] Using `useState` for server data (should use React Query)
- [ ] Using React Query for form state (should use `useForm`)
- [ ] Filter state in `useState` instead of URL params
- [ ] Not using `useCallback` for event handlers
- [ ] Not using `useMemo` for expensive computations

### Component Structure
- [ ] Not extracting components when page/component exceeds line limit (250 web, 350 mobile)
- [ ] Props drilling too deep (should use context/Zustand)
- [ ] Passing too many individual props (should use object)
- [ ] Missing default values for optional props
- [ ] Callback props not prefixed with "on"

### Error Handling
- [ ] No try/catch around mutations
- [ ] Using `console.error` only (no user feedback)
- [ ] Showing raw error messages to users
- [ ] Custom error handling instead of `handleError()`
- [ ] Using `alert()` instead of `toastUtils`

### Styling
- [ ] Using inline styles
- [ ] Using global class names
- [ ] Using Tailwind classes (not in this project)
- [ ] Using `<img>` instead of Next.js `<Image>`

### Security
- [ ] Reading/writing tokens in JS (should use HttpOnly cookies)
- [ ] Missing RBAC checks on admin pages
- [ ] Exposing sensitive data in console logs

---

## Fix Priority Order

When fixing a page, apply fixes in this order:

1. **Critical**: Hardcoded text → replace with `t()` calls
2. **Critical**: Hardcoded data → replace with React Query hooks
3. **Critical**: Hardcoded API paths → replace with `API_PATHS`
4. **High**: Page/component exceeds line limit (250 web, 350 mobile) → extract components
5. **High**: Missing loading/error states
6. **High**: Missing error handling on mutations
7. **Medium**: Inline components → extract to files
8. **Medium**: Repeated code → extract to reusable components
9. **Medium**: Wrong state management tool
10. **Low**: Import organization
11. **Low**: Unused imports/variables cleanup
12. **Low**: Code formatting consistency

---

## Output Format

For each page reviewed, produce:

```markdown
## Page: [page path]

### Issues Found: [N]

| # | Severity | Rule | Description | Location | Fix Applied |
|---|----------|------|-------------|----------|-------------|
| 1 | Critical | Rule 2 | Hardcoded text "لوحة التحكم" | page.js:15 | Replaced with t("dashboard.title") |
| 2 | High | Rule 1 | Page file is 380 lines | page.js | Extracted StatsCards, Filters to _components/ |
| 3 | Medium | Rule 9 | Inline StatCard component | page.js:45 | Extracted to _components/StatCard/StatCard.js |

### Changes Made
1. Created `_components/StatsCards/StatsCards.js` and `.module.css`
2. Created `_components/Filters/Filters.js` and `.module.css`
3. Replaced 12 hardcoded text strings with `t()` calls
4. Added loading state with `<SimpleLoading />`
5. Added error state with translated message
6. Replaced hardcoded API path with `API_PATHS.dashboard.getHostDashboard`
7. Organized imports by type (React, hooks, components, services, styles)

### Final Page Line Count: [N] lines (was [M] lines)
```

---

## What NOT to Do

- Do NOT change the page's functional behavior — only refactor structure and patterns
- Do NOT remove existing functionality — only improve code quality
- Do NOT change CSS class names unless extracting to a new component
- Do NOT modify backend code or API contracts
- Do NOT change the component's prop interface unless fixing a bug
- Do NOT introduce new libraries or dependencies
- Do NOT change the i18n namespace structure
- Do NOT modify existing locale JSON files (note missing keys for the user to add)
- Do NOT skip reading child components — they may have their own issues
- Do NOT assume a pattern is correct just because it exists in one page — verify against ALL established patterns

---

## Starting Point

When the user provides a list of pages, begin by:

1. Reading each page file completely (every line)
2. Reading every imported component rendered in the page's JSX
3. Reading every hook called by the page or its children
4. Reading every service file imported by hooks or the page
5. Checking the locale JSON files for missing translation keys
6. Identifying all violations using the checklist above
7. Fixing issues in priority order (Critical → High → Medium → Low)
8. Producing the structured output for each page
