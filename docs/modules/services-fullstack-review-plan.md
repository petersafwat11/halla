# services — Full-Stack Review Plan

**Module:** services
**Generated:** 2026-05-07
**Decisions locked:** 2026-05-08
**Prompt:** docs/implementation/MODULE_FULLSTACK_REVIEW_PROMPT.md
**Status:** Decisions locked · ready for Phase 2 implementation

---

## 0a. Locked decisions (2026-05-08)

| # | Question | Locked answer |
|---|----------|---------------|
| 1 | `POST /services/:id/inquire` and `/book` | **DELETE.** Remove routes, controller methods, service methods. Also drop now-orphan fields: `User.profile.vendorData.inquiryCount`, `User.profile.vendorData.bookingCount`, `Service.inquiryCount`, `Service.bookingCount`. Drop `inquiryCount` from `_formatService`. Drop `totalBookings` from `getMyStats` output and from `ServiceModel.statics.getVendorStats`. |
| 2 | `GET /services/:id` rbac | **Option (a).** Move the route OUT of the vendor-only block. Service-side check: if caller is a vendor, scope to their own services; if caller is non-vendor, allow only `isPublic:true && status:active` services. `trackView=true` only when caller is non-vendor. |
| 3 | Marketplace whitelabel scope | **Intentional global marketplace.** No `whitelabelId` filter on `getPublicServices`. Add a one-line comment documenting the intent. |
| 4 | Counter integrity (transaction vs atomic) | **Skip transactions.** Use atomic `$inc` (already in use). Industry best practice — view-count / click-count are analytics-grade counters, not financial. Drop original task 7.A.9. Keep `numberOfClicks` increment fire-and-forget; add a one-line comment noting best-effort semantics. |
| 5 | (subsumed by #1) | — |
| 6 | Web vs mobile edit flow | **Add full web edit-flow parity with mobile.** Web currently has the `useServiceMutation('updateService')` hook but no UI wires it. Add: (a) edit button on `ServiceCard.js`, (b) `editingService` state on `vendor-dashboard/page.js`, (c) `editingService` prop on web `AddServicePopup.js` mirroring the mobile shape (`{_raw, name, ...}`), (d) wire `updateService` mutation when `editingService` is set. |
| 7 | `type` → `category` rename | **Rename the field in `ServiceModel.js`.** Touches: model field + enum + index, `services.service.js:39` (`query.category = filters.category`), `services.service.js:301` (drop the formatter mapping since field is now correctly named), Swagger schemas, validation schema. **Add DB migration** `scripts/migrations/rename-service-type-to-category.js` that runs `db.services.updateMany({}, { $rename: { type: 'category' } })` and rebuilds the index. Mobile form-internal name `serviceType` (form label only, not API key) stays. |
| 8 | Locale keys (§8) | **Approved.** Agent adds the listed keys in `vendorServices.*` and `marketplace.*` namespaces in both `en` and `ar` files. |
| 9 | `type` → `category` migration strategy | **Single-shot.** Project is in dev — no production data at risk. Run `db.services.updateMany({ type: { $exists: true } }, [{ $set: { category: '$type' }, $unset: 'type' }])` in one pass, deploy code together. No expand/contract dance. |
| 10 | Drop `totalBookings` from stats output | **Approved.** Confirmed safe via inventory — `vendor-dashboard/page.js` stats card consumes only `totalServices`, `activeServices`, `inactiveServices`, `rating`. Drop from `getMyStats` aggregation, `_formatService`, and `ServiceModel.statics.getVendorStats`. Sweep `grep -rn "totalBookings"` across `labbe/`, `halla-mobile/`, `labbe-backend-/src/modules/` and remove any remaining UI/code references. |

**Updated effort estimate: M+** (≈ 2 days with the new web edit flow + DB migration script + #7 rename touchpoints).



---

## 0. Executive Summary

- **10** total endpoints in the module (`labbe-backend-/src/modules/services/services.routes.js`)
- **2** candidates for deletion-or-wiring (`POST /services/:id/inquire`, `POST /services/:id/book` — defined backend-side, never called by web or mobile)
- **2** unused web hook exports (`useVendorServicesByCategory`, `useVendorService`) — dead code
- **8** Swagger drift findings (wrong field names, missing query params, missing response envelopes, missing endpoints)
- **0** backend file-size violations (max file is `services.service.js` at 392/600)
- **3** web file-size violations (`vendor-dashboard/page.js` 258/250, `addServicePopup/AddServicePopup.js` 268/250, `market-place/_components/filtersPopup/FiltersPopup.js` 309/250)
- **1** mobile file-size violation (`components/marketplace/MoreInfoPopup.js` 552/350)
- **2** critical web/mobile API consumption mismatches:
  - Web `useMyServices` reads `data.services` — backend returns `data` as the array directly. Page is **silently broken** ("No services available" shown to vendors who have services).
  - Mobile `vendorService.getOrders` calls `/services/orders` — endpoint does not exist on the backend.
- **1** critical backend routing bug: `GET /services/:id` is gated by `restrictTo(ROLES.VENDOR)`, but the controller's `trackView` branch is intended for non-vendor (host marketplace) views — gate makes that branch unreachable.
- **6** missing/incorrect safeguards: no Zod validation file, no audit log on mutations, no idempotency on inquire/book counters, no rate limiting on inquire/book, no transaction around two-collection counter increments, missing query-param validation on `/services/public`.
- **~30** comment-hygiene blocks to remove (FLOW-25-F01/04, FLOW-26-F01/02/03/05, FLOW-24-F04, "Phase 4 W0-AUTH" headers in mobile services).
- **Estimated effort: M** (≈ 1.5 days for the implementation phase, dominated by the data-mapping-bug fix on the vendor dashboard, the Swagger drift, the missing validation file, and the mobile `vendorService` → `apiFetch` migration).

---

## 1. Endpoint Inventory

| # | Method | Path | Controller | Service | Middleware chain | Swagger | Web hook | Mobile hook | Status |
|---|--------|------|------------|---------|------------------|---------|----------|-------------|--------|
| 1 | GET | `/services/public` | `services.controller.getPublicServices` | `servicesService.getPublicServices` | (none — public) | DRIFT (response shape, query params) | `usePublicVendorServices` (`useServices.js:26`) + dead `useVendorServicesByCategory` (`:76`) | `marketplaceService.getVendors` → `useVendors` (`useMarketplace.js:9`) | KEEP |
| 2 | POST | `/services/:id/inquire` | `services.controller.recordInquiry` | `servicesService.recordInquiry` | `protect`, `validateObjectId('id')` | MISSING | none | none | **DELETE (locked decision #1)** |
| 3 | POST | `/services/:id/book` | `services.controller.recordBooking` | `servicesService.recordBooking` | `protect`, `validateObjectId('id')` | MISSING | none | none | **DELETE (locked decision #1)** |
| 4 | GET | `/services` | `services.controller.getMyServices` | `servicesService.getMyServices` | `protect`, `restrictTo(VENDOR)` | DRIFT (response shape) | `useMyServices` (`useServices.js:99`) | `vendorService.getServices` → `useVendorServices` (`useVendor.js:47`) | KEEP |
| 5 | GET | `/services/stats` | `services.controller.getMyStats` | `servicesService.getMyStats` | `protect`, `restrictTo(VENDOR)` | DRIFT (no response schema) | `useServiceStats` (`useServices.js:116`) | `vendorService.getStats` → `useVendorStats` (`useVendor.js:28`) | KEEP |
| 6 | GET | `/services/:id` | `services.controller.getService` | `servicesService.getServiceById` | `protect`, `restrictTo(VENDOR)`, `validateObjectId('id')` | OK | `useVendorService` (`useServices.js:134`, **unused**) | none | KEEP-BUT-UNGATE (rbac gate contradicts the `trackView` branch in the controller; see §2.3) |
| 7 | POST | `/services` | `services.controller.createService` | `servicesService.createService` | `protect`, `restrictTo(VENDOR)`, `uploadServiceImage` | DRIFT (`category` vs `type`, required-fields) | `useServiceMutation('createService')` → `AddServicePopup.js:23` | `vendorService.addService` → `useAddVendorService` (`useVendorMutations.js:62`) | KEEP |
| 8 | PATCH | `/services/:id` | `services.controller.updateService` | `servicesService.updateService` | `protect`, `restrictTo(VENDOR)`, `validateObjectId('id')`, `uploadServiceImage` | DRIFT (`category` vs `type`) | `useServiceMutation('updateService')` (no consumer found in pages — only invoked indirectly through `AddServicePopup` create path; **no edit popup wires `updateService` on web**) | `vendorService.updateService` → `useUpdateVendorService` (`useVendorMutations.js:77`) — wired in `VendorServicesScreen.js:124` | KEEP |
| 9 | PATCH | `/services/:id/toggle-status` | `services.controller.toggleServiceStatus` | `servicesService.toggleServiceStatus` | `protect`, `restrictTo(VENDOR)`, `validateObjectId('id')` | OK | `useServiceMutation('toggleStatus')` → `vendor-dashboard/page.js:32` | `vendorService.toggleServiceStatus` → `useToggleServiceStatus` (`useVendorMutations.js:47`) | KEEP |
| 10 | DELETE | `/services/:id` | `services.controller.deleteService` | `servicesService.deleteService` | `protect`, `restrictTo(VENDOR)`, `validateObjectId('id')` | OK | `useServiceMutation('deleteService')` → `vendor-dashboard/page.js:33` | `vendorService.deleteService` → `useDeleteVendorService` (`useVendorMutations.js:32`) | KEEP |

**Legend:** KEEP, KEEP-NEEDS-WIRING, KEEP-BUT-UNGATE, DELETE-DUPLICATE-OF-#N.

---

## 2. Backend Findings

### 2.1 File-size violations
None. Largest file is `services.service.js` at 392 lines (cap 600).

### 2.2 Swagger drift
1. **`POST /services` request body** lists `required: [name, description, category, price]` and a property `category`. Backend model uses **`type`** (enum, required), not `category`; `description` is **not** required by the model. (`services.routes.js:173-186`, `models/ServiceModel.js:27-43`) — Fix JSDoc to `required: [name, type, price]` with `type` as the enum field. List `tags` (string array) and `serviceLocation` as optional.
2. **`PATCH /services/:id` request body** also uses `category` instead of `type`. (`services.routes.js:209-223`) — Fix JSDoc.
3. **`GET /services` response shape** documents `data.services: [Service]`. The actual response from `sendPaginated(res, result.data, result.pagination)` is `{ status, success, data: [Service], pagination }` — `data` IS the array, there is no `data.services` key. (`services.routes.js:93-105` vs `services.controller.js:34` and `responseHelper.js:66-77`) — Fix JSDoc.
4. **`GET /services/public` response shape** has the same problem — JSDoc claims `data.services` and `data.pagination`; reality is top-level `data` (array) + top-level `pagination`. (`services.routes.js:54-67`) — Fix JSDoc.
5. **`GET /services/public` query parameters** documents only `search, category, vendorId`. The service supports `regionId, cityId, districtIds (csv), minPrice, maxPrice, minRating, page, limit` (`services.service.js:39-59`). — Add to JSDoc.
6. **`GET /services/stats`** has no `responses[200].content` schema and no documented response shape. (`services.routes.js:111-123`) — Add a schema referencing `{ stats: { totalServices, activeServices, totalViews, totalBookings, avgRating } }`.
7. **`POST /services/:id/inquire`** and **`POST /services/:id/book`** have no `@swagger` annotation at all. (`services.routes.js:73-74`) — Add minimal blocks (path, summary, security, 200 OK, 401, 404).
8. **`components.schemas.Service` definition** (in `config/swagger.js`) — verify it lists `category` (the API-exposed field, mapped from model `type`) and includes `nameAr`, `descriptionAr`, `serviceLocation`, `viewCount`, `inquiryCount`, `bookingCount`, `rating`, `reviewsCount`, `priceUnit`, `vendor`. (Out-of-scope to read here without confirming current state — flag for the user to spot-check during Phase 2.)

### 2.3 Missing middleware / safeguards
1. **`GET /services/:id` rbac mismatch (CRITICAL).** The route is mounted under `router.use(restrictTo(ROLES.VENDOR))` (`services.routes.js:78`), but the controller branches on `req.user?.role === 'vendor'` and only sets `trackView=true` for non-vendors (`services.controller.js:50-53`). The `trackView` branch is **dead code** because non-vendors are blocked by the gate. Either:
   - **(a)** drop the `restrictTo(VENDOR)` for this single route and add `validateObjectId('id')` plus a service-side ownership check when the caller IS a vendor (so vendors only see their own services, hosts can see any active+public service); or
   - **(b)** delete the `trackView` logic entirely.
   The intent suggested by the comment "FLOW-26-F05: increment numberOfClicks on public vendor profile view" points to **(a)**. Plan adopts (a).
2. **`POST /services/:id/inquire` / `/book`** lack rate limiting. These endpoints are authenticated but otherwise free to spam, and they increment two persistent counters (`Service.inquiryCount/bookingCount` and `User.profile.vendorData.inquiryCount/bookingCount`). Apply the existing `authLimiter` from `shared/middleware/rateLimiter` (or a new `marketplaceCounterLimiter` if a tighter quota is desired).
3. **No audit log** on `createService`, `updateService`, `deleteService`, `toggleServiceStatus`. These are vendor-owned resources — the project flags vendor-side and admin-side state changes as auditable elsewhere; uniform treatment expected.
4. **Counter increments span two collections** without a transaction. `recordInquiry` and `recordBooking` (`services.service.js:167-197`) update `Service` and `User` separately; if the second update fails, the counters drift. Wrap in a `mongoose.startSession()` + `withTransaction`, or commit to "approximate counters" and document.
5. **Idempotency** on `recordInquiry` / `recordBooking`. Both are increment-on-call — the same client reload can double-count. If the front-end is meant to fire one inquiry per click, accept the de-dup risk; if not, pin to `idempotencyKey` middleware.
6. **No body validation file (`services.validation.js`).** The module relies entirely on Mongoose schema validation. Mongoose silently drops unknown fields and returns less helpful messages. Add a **Zod** file (Joi forbidden per project rule) with at minimum `createServiceSchema`, `updateServiceSchema`, and `getPublicServicesQuerySchema` (the last to coerce `regionId/cityId` to ints, `districtIds` to a comma-list).
7. **Whitelabel isolation** — services are vendor-owned; vendors are tenant-scoped via `whitelabelId` on `User`. `getMyServices` joins on `vendorId` (the vendor's own id) so it's implicitly tenant-safe, but `getPublicServices` lists *all* approved vendors with no whitelabel constraint. Confirm this is intentional (the marketplace is meant to be cross-tenant). If not, add `whitelabelId` filter.

### 2.4 Duplicate / dead endpoints
- No duplicate routes inside the module.
- `POST /services/:id/inquire` and `POST /services/:id/book` are defined but called by **zero** consumers across web (`labbe/`) and mobile (`halla-mobile/`). Either wire them up (where is the "request a quote" / "book" button supposed to live?) or remove them. The plan keeps them and tags them KEEP-NEEDS-WIRING because the controller comments suggest they are part of an in-progress flow (FLOW-25-F04).

### 2.5 Service / controller violations
- **Controllers parse FormData fields manually.** `services.controller.js:61-73` and `:79-96` both contain identical "parse `tags` JSON / parse `price` to float" blocks. Extract into a small middleware (e.g. `parseServiceFormFields`) mounted on POST and PATCH, or push into Zod `.preprocess` / `.coerce` once a validation file exists.
- **Service swallows location-resolution errors silently.** `services.service.js:366-368` — empty `catch`. Replace with a `logger.warn` or document the expected fallthrough so a future reader does not assume all branches succeed.
- **`getServiceById` "fire-and-forget" view-count update** (`services.service.js:152-157`) returns the original Mongoose doc but the increment runs unawaited via `.exec()`. Acceptable for analytics-quality counters; flag for awareness — if a transaction is added per §2.3.4, this branch should also be inside it.
- **No `Promise.all` violation found.** `getPublicServices`, `getMyServices`, and `getMyStats` all parallelize their reads.

### 2.6 Validation gaps
Add `services.validation.js` with at least:
- `createServiceSchema` — `name (string, max 200, required)`, `nameAr (string, optional)`, `description (string, max 2000, optional)`, `descriptionAr (string, optional)`, `type (string, enum from the Service model, required)`, `price (number, min 0, required)`, `currency (string, optional)`, `tags (array<string>, optional, accepts JSON-stringified)`, `serviceLocation (object | JSON-stringified, optional)`.
- `updateServiceSchema` — same shape, all fields optional.
- `getPublicServicesQuerySchema` — `page, limit (int)`, `search (string)`, `category (string)`, `vendorId (objectId)`, `regionId (int)`, `cityId (int)`, `districtIds (string csv → array<int>)`, `minPrice/maxPrice (number)`, `minRating (number 0-5)`.
- For JSON-stringified arrays from multipart forms, use Zod `.preprocess((v) => typeof v === 'string' ? JSON.parse(v) : v, z.array(z.string()))` (Zod equivalent of the legacy `Joi.alternatives().try(Joi.string(), Joi.array())` pattern).
- Wire each schema with `validate(schema)` from `shared/middleware/validation`.

### 2.7 Comment hygiene
Remove the following FLOW/PHASE markers from the module:
- `services.routes.js:72` — `// FLOW-25-F04: Authenticated routes (any logged-in user — host contacts vendor)`
- `services.controller.js:62` — `// FLOW-26-F03: parse JSON-stringified fields from multipart FormData`
- `services.controller.js:80` — same FLOW-26-F03 again
- `services.controller.js:117` — `Record an inquiry on a service (FLOW-25-F04)`
- `services.controller.js:126` — `Record a booking on a service (FLOW-25-F04)`
- `services.service.js:26` — `// FLOW-26-F02 + FLOW-24-F04: filter to approved vendors with completed profiles only`
- `services.service.js:61` — `// FLOW-26-F01: include vendor rating in marketplace populate`
- `services.service.js:150` — `// FLOW-26-F05: increment numberOfClicks on public vendor profile view`
- `services.service.js:164` — `Record an inquiry on a service (FLOW-25-F04)`
- `services.service.js:182` — `Record a booking on a service (FLOW-25-F04)`
- `services.service.js:207` — `// FLOW-25-F01: new services default to isPublic:false; vendor must publish explicitly.`

The *invariant* behind comment 207 (services start `isPublic:false`) is worth keeping if we have a reason — but the FLOW marker can go; replace with a one-liner: `// New services start unpublished — vendor must explicitly publish.`

---

## 3. Frontend Web Findings

### 3.1 Component tree per page

**`app/[lang]/vendor-dashboard/page.js`** (258 lines — VIOLATION cap=250)
- `ui/vendor/statsCards/VendorStatsCards.jsx` (90 lines)
- `ui/vendor/serviceCard/ServiceCard.js` (124 lines)
- `ui/commen/popup/PopupLayout.js` — verify line count (out-of-tree shared)
- `ui/vendor/addServicePopup/AddServicePopup.js` (268 lines — VIOLATION cap=250)
  - `ui/commen/inputs/inputGroup/InputGroup.js`, `ui/commen/inputs/inputGroup/InputSelect.js`, `ui/commen/inputs/uploadFile/UploadFile.js` — shared, not part of services scope.
- `ui/common/error/ErrorBoundary.js`, `ui/common/loading/SimpleLoading.js` — shared.

**`app/[lang]/market-place/page.js`** (202 lines — OK)
- `app/[lang]/market-place/_components/sections/Sections.js` (59 lines)
- `app/[lang]/market-place/_components/filters/Filters.js` (188 lines)
- `app/[lang]/market-place/_components/filtersPopup/FiltersPopup.js` (309 lines — VIOLATION cap=250)
- `app/[lang]/market-place/_components/card/Card.js` (118 lines)
- `app/[lang]/market-place/_components/pagination/Pagination.js` (94 lines)
- `app/[lang]/market-place/hooks/useMarketplaceFilters.js` (176 lines — OK)
- `ui/common/loading/SimpleLoading.js` — shared.

**`hooks/reactQueryHooks/useServices.js`** (226 lines — OK)

### 3.2 File-size violations
- `app/[lang]/vendor-dashboard/page.js` — 258 lines. Proposed split: extract the header block (lines 138–181, the three buttons + page title) into `_components/VendorDashboardHeader.js`, and extract the search-and-filter strip (lines 187–220) into `_components/ServicesSearchBar.js`. **Style preservation note:** keep `page.module.css` co-located with `page.js`; the extracted children import the same `styles.header*` and `styles.filters*` keys via the existing module — no class renames.
- `ui/vendor/addServicePopup/AddServicePopup.js` — 268 lines. Proposed split: pull the "tags grid" block (lines 202–240) into `AddServicePopup/TagsGrid.js`. **Style preservation:** keep `addServicePopup.module.css` and import the same `styles.tag*` keys from the extracted child.
- `app/[lang]/market-place/_components/filtersPopup/FiltersPopup.js` — 309 lines. Proposed split: extract the location-filter block (region/city/district selects), the price-range block, and the rating block into three sibling components inside `_components/filtersPopup/sections/`. **Style preservation:** classes like `popupContent`, `section`, `sectionTitle` stay in `filtersPopup.module.css`; the children import the same keys.

### 3.3 Hardcoded text / data / paths
- `app/[lang]/vendor-dashboard/page.js:115` — `console.log("Promote profile - coming soon")` is debug, not user-facing, but should be removed (rule D6).
- `ui/vendor/addServicePopup/AddServicePopup.js:84,93` — `t("…", "تم إضافة الخدمة بنجاح")` / `t("…", "فشل في إضافة الخدمة")` — fallback strings inline are fine (rule B2 explicitly allows them), but verify the `vendorServices` namespace contains the keys.
- `ui/vendor/serviceCard/ServiceCard.js:8` — `process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, '') || "http://localhost:8000"` — hardcoded localhost fallback. Acceptable as a dev-only fallback, but flag as rule B18 (`hardcoded http://localhost:8000`).
- All `t()` strings appear to flow through the `vendorServices` and `marketplace` namespaces correctly — no raw Arabic/English literals found in JSX outside of fallback args.

### 3.4 Data mapping bugs / fallback chains
- **CRITICAL** `app/[lang]/vendor-dashboard/page.js:30,55-67` — `useMyServices()` returns the full backend payload `{ status, success, data: [Service], pagination }`. The page reads `servicesData?.data?.services` (line 56), which is `undefined` because `data` is the array directly. Result: vendors never see their services on the web dashboard. **Fix:** `servicesData?.data || []` (matches what `app/[lang]/market-place/page.js:76` already does correctly).
- `app/[lang]/vendor-dashboard/page.js:37` — `statsData?.data?.stats` — correct (matches `sendSuccess(res, { stats })`).
- `app/[lang]/market-place/page.js:76` — `servicesData?.data || []` — correct.
- `app/[lang]/market-place/page.js:80-82` — `servicesData?.pagination?.total || vendors.length` — `|| vendors.length` is a soft-fallback that hides a missing pagination payload. Switch to `servicesData?.pagination?.total ?? vendors.length` (treat `0` distinct from `undefined`) and rely on the backend always returning pagination.
- No multi-branch fallback chains (`a?.x || b?.y || c?.z`) found inside the services-module surface area on web.

### 3.5 Duplicate hooks / direct apiRequest calls
- No direct `apiRequest` or component-local `useQuery` calls found inside the services-module surface area on web. All consumers go through `useServices.js`.
- **Dead exports** in `useServices.js`: `useVendorServicesByCategory` (`:76-89`) and `useVendorService` (`:134-146`) — no consumer found. Safe to delete unless a near-future page is planned.

### 3.6 State / loading / error gaps
- `app/[lang]/vendor-dashboard/page.js` — has loading + error branches (good), uses `ErrorBoundary` (good), but:
  - `searchQuery` state is `useState`, not URL params (rule B14 violation).
  - `handleToggleStatus` and `handleDeleteService` only `console.error` on failure — no toast (rule B16). The mobile screen wires toasts; the web page does not.
  - Uses `window.confirm` for delete (line 89) — replace with a project-standard confirm dialog (the codebase has `ui/vendor/modals/DeleteConfirmation.jsx`, 78 lines, available).
- `app/[lang]/market-place/page.js` — has loading + empty branches; **no error branch** (the `useQuery` `error` state is never read). Add an inline error block matching the marketplace layout. Also: the page is **not wrapped in `ErrorBoundary`** (rule B19).
- `ui/vendor/addServicePopup/AddServicePopup.js`:
  - Uses RHF `useForm` but does **not** apply `zodResolver(addServiceSchema)` (`:25-28`) — the imported `addServiceSchema` is only used through a custom `validateAddService` helper, bypassing RHF's standard validation pipe. Wire `resolver: zodResolver(addServiceSchema)` (rule B12) and remove the parallel `validationErrors` state.
  - `toast.error(error.message || …)` (`:92-94`) leaks raw backend error messages to the user (rule B8). Replace with `handleError(error, t, { fallbackMessage: "vendorServices.addServicePopup.error" })`.
  - `console.error("Error adding service:", error)` (`:91`) — acceptable inside catch when paired with toast, but the canonical pattern uses `handleError`.

### 3.7 Comment hygiene
- `useServices.js:7,91,148` — section banners (`// VENDOR SERVICES QUERIES (Public)` etc.). Not phase markers, but the "(Public)" / "(Protected)" split is misleading because some "public" queries are also called by authenticated users. Trim or rewrite.
- `useServices.js:223` — `console.error(\`Service mutation error (${action}):\`, error)` — leaves console error in committed code (rule D6). Either remove (errors propagate to React Query's `error` state already) or guard behind a debug check.
- Web side has **no** FLOW/PHASE markers in services-module files.

---

## 4. Frontend Mobile Findings

### 4.1 Screen → component tree

**`screens/host/Marketplace.js`** (181 lines — OK)
- `components/plans/TopBar.js` (shared)
- `components/marketplace/SearchAndFilter.js` (144 lines)
- `components/marketplace/VendorCards.js` (89 lines)
  - `components/marketplace/VendorCard.js` (240 lines)
- `components/marketplace/MoreInfoPopup.js` (552 lines — VIOLATION cap=350)
- `components/marketplace/FilterPopup.js` (201 lines)
- `components/marketplace/Sections.js` (183 lines) — anti-pattern (useState+useEffect for server data)
- `hooks/queries/useMarketplace.js` (54 lines) — `useVendors` (infinite query)

**`screens/vendor/VendorHomeScreen.js`** (345 lines — at the cap; one extraction would prevent regression)
- `components/vendor/home/Services.js` (256 lines)
- `components/vendor/home/AddServicePopup.js` (314 lines)
- `components/vendor/home/TagsSelector.js` (85 lines)
- `components/notifications/NotificationBell.js` (shared)

**`screens/vendor/VendorServicesScreen.js`** (224 lines — OK)
- Same children as `VendorHomeScreen` minus the stats header.

**`hooks/queries/useVendor.js`** (99 lines), **`hooks/mutations/useVendorMutations.js`** (90 lines), **`hooks/useFilterData.js`** (130 lines).
**`services/marketplaceService.js`** (168 lines), **`services/vendorService.js`** (170 lines).

### 4.2 File-size violations
- `components/marketplace/MoreInfoPopup.js` — 552 lines. Proposed split: extract the contact-row block, the gallery, and the description block into 3 sibling components in `components/marketplace/MoreInfoPopup/`. **Style preservation:** every `StyleSheet.create({...})` value moves verbatim — no rounding, no renames; the parent re-imports the children's styles where they were inlined.
- `screens/vendor/VendorHomeScreen.js` — at 345 / 350. No immediate split required, but the `StyleSheet.create` block (lines 211–343) is large enough that a small future change will push it over. Consider extracting the header texture/stats block (lines 156–188) into `components/vendor/home/VendorHomeHeader.js`. Defer if no other change is needed.

### 4.3 Service / hook violations
- **`services/marketplaceService.js` uses raw `axios`** (a dedicated `marketplaceAxios = axios.create(...)`) instead of the shared `apiFetch` (`services/apiClient.js`). Rule C1: every network call uses `apiFetch`. Migrate `getVendors`, `getVendorDetails`, `getServiceTypes`, `getRegions`, `getCities`, `getDistricts` to `apiFetch`. The file's own header comment admits the deviation; replace it.
- **`services/vendorService.js` uses raw `axios`** for the same reason. Migrate every method to `apiFetch`. The token-refresh-on-401 behavior is then automatically inherited.
- **`vendorService.getOrders('/services/orders')`** (`vendorService.js:159`) — the endpoint `/services/orders` does not exist on the backend. `useVendorOrders` (`useVendor.js:67`) wraps it. Search the screens for any consumer:
  - No screen consumer found in `halla-mobile/screens/**`.
  - **Action:** delete `getOrders` from `vendorService.js` and `useVendorOrders` from `useVendor.js`. If the orders feature is on the roadmap, add a real backend endpoint first.
- **`vendorService.js` mixes domains.** It contains profile (`/users/profile`), password (`/users/password`), and tickets (`/tickets/*`) operations alongside services. None of those are part of the services module. Out of scope for *this* review to refactor (they belong to the `users` and `tickets` module reviews), but flag.
- **Hardcoded paths in services.** `vendorService.js` writes `/services`, `/services/${id}`, `/services/stats`, `/services/${id}/toggle-status` as literals. These should reference `ENDPOINTS.SERVICES.*` from `config/api.js`. The `ENDPOINTS.SERVICES` object is missing `STATS`, `BY_ID`, `TOGGLE_STATUS` — add them.
- **`hooks/useFilterData.js` uses `useState`+`useEffect` for server data.** `fetchRegions`, `fetchCities`, `fetchDistricts`, `fetchServiceTypes` should be React Query hooks. Multi-branch fallback chains (`response.data?.cities || response.data || []`, etc.) hide the canonical shape. Out of scope for the services module *strictly* (those endpoints belong to `locations` and `vendors`), but the file is rendered by the marketplace screen. Note in §6.
- **`components/marketplace/Sections.js`** has the same anti-pattern. Same out-of-scope note.
- `useMarketplace.useVendors` uses `useInfiniteQuery` (correct) and reads `lastPage?.pagination` — matches the backend's top-level `pagination` (correct).
- `useVendor.useVendorServices` reads `response.data || []` (correct).
- `useVendor.useVendorStats` reads `response.data?.stats || response.data` — `|| response.data` is a defensive fallback that hides a wrong response. Backend always returns `data.stats` (`services.controller.js:42-43`). Replace with `response.data?.stats || {}`.

### 4.4 Hardcoded text / data / paths
- `vendorService.js` and `marketplaceService.js` hardcode every URL (see 4.3). They also hardcode the `Authorization` header construction — that's expected for axios interceptors; not a violation, but goes away with the `apiFetch` migration.
- `screens/host/Marketplace.js:65` — fallback strings via `t("vendor.defaultLocation", "المملكة العربية السعودية")` etc. Acceptable per rule C7 (fallback args allowed). Confirm namespace `marketplace` carries the keys.
- Mobile RGB hex literals (`#C28E5C`, `#F9F4EF`, `#2C2C2C`) are inline in `StyleSheet`. Per rule "preserve styles exactly" they stay as-is.

### 4.5 Web/Mobile divergence
| Endpoint | Aspect | Web | Mobile | Backend truth |
|----------|--------|-----|--------|---------------|
| `GET /services` | response shape | reads `data.services` (WRONG) | reads `data` (CORRECT) | `data: [Service]` |
| `GET /services/stats` | response shape | reads `data.stats` (CORRECT) | reads `data.stats` with `|| response.data` fallback (suspect) | `data: { stats: {...} }` |
| `POST /services` | body fields | sends FormData with `name, type, description, price, image, tags(JSON-string)` | sends FormData with `name, type, description, price, image, tags(JSON-string)` | accepts those fields |
| `GET /services/public` | filter `category` | sends `category=<type>` | sends `category=<type>` (mapped from internal `serviceType`) | accepts `category`, maps to `query.type` |
| `GET /services/public` | pagination | reads `data` array + `pagination.{total,pages}` | reads `pages[].data` + `pages[0].pagination` | top-level `data` + top-level `pagination` |
| `useServiceMutation('updateService')` (web) | wired to which page? | `vendor-dashboard/page.js` does not invoke `updateService` — there is no edit path on web | mobile `VendorServicesScreen.js:124` invokes `updateService` for editing | endpoint exists |
| Vendor service detail view | which endpoint? | none called | none called | `GET /services/:id` exists but currently gated to vendors only — see §2.3.1 |
| `POST /services/:id/inquire` | wired? | no | no | endpoint exists, no consumers |
| `POST /services/:id/book` | wired? | no | no | endpoint exists, no consumers |

### 4.6 Loading / error / empty states
- `screens/vendor/VendorServicesScreen.js` — has loading + error blocks (good).
- `screens/vendor/VendorHomeScreen.js` — has loading + error blocks (good).
- `screens/host/Marketplace.js` — has loading + empty states; **no error block** distinct from loading. Wires `error` to a toast (line 53–56) — acceptable, but a retry affordance is missing.
- Mobile `AddServicePopup` shows a spinner during submission; on error, `useAddVendorService` only `onError` is the toast inside the screen — that's fine.

### 4.7 Comment hygiene
Remove the FLOW/PHASE/W0-AUTH markers:
- `services/marketplaceService.js:9-12` — `// Phase 4 W0-AUTH: dedicated axios instance with the same 30 s default timeout as apiFetch. ...`
- `services/vendorService.js:8-20` — `// Phase 4 W0-AUTH:` + multi-line block.
- `services/vendorService.js:46,52,58,64,72,78,87,93,99,105,111,130,152,158,164` — `// Get vendor profile - GET /api/v2/users/profile` style comments that re-state the route. Drop them; the URLs are right above the function bodies.

---

## 5. Cross-Platform API Consumption Diff

| Endpoint | Aspect | Web | Mobile | Backend truth | Action |
|----------|--------|-----|--------|---------------|--------|
| `GET /services` | response mapping | `data.data.services` (WRONG) | `data.data` (correct) | `data` is the array | **Fix web** (`vendor-dashboard/page.js:56`) |
| `GET /services/stats` | response mapping | `data.data.stats` (correct) | `data.data?.stats \|\| data.data` (defensive) | `data: { stats }` | Fix mobile to drop the `\|\| data.data` branch (`useVendor.js:36`) |
| `GET /services/public` | response pagination | `data.pagination` ✓ | `pages[0].pagination` ✓ | top-level `pagination` | OK |
| `POST /services` | body fields | `name, type, description, price, image, tags` (FormData) | same | same | OK |
| `PATCH /services/:id` | body fields | not currently invoked from web (no edit popup wired) | `name, type, description, price, image, tags` | same | Add an edit path on web (or document that vendors edit on mobile only) |
| `DELETE /services/:id` | response | `data: null, message` | `data: null, message` | `sendDeleted` | OK |
| `PATCH /services/:id/toggle-status` | response | `data: { service }, message` | same | `sendSuccess` | OK |
| `POST /services/:id/inquire` | wired? | no | no | endpoint exists | Decide: wire into `MoreInfoPopup` "Send inquiry" CTA OR delete endpoint |
| `POST /services/:id/book` | wired? | no | no | endpoint exists | Same decision |
| `GET /services/:id` | wired? | hook exists, no consumer | no consumer | gated to vendors only | Ungate (§2.3.1) and wire into a "service detail" page if planned |

---

## 6. Suspected Bugs Worth Verifying

- **§2.3.1 RBAC vs trackView contradiction.** Confirm by hitting `GET /api/v2/services/:id` as a host (logged-in non-vendor) — expect 403. If 403, the `viewCount` and `numberOfClicks` increments in the controller are dead code.
- **§3.4 Vendor dashboard "no services" bug.** Confirm by logging in as a vendor with at least one service and visiting `/<lang>/vendor-dashboard`. Expect to see the empty state (`t("noServices")`). After the data-mapping fix, expect to see service cards.
- **`vendorService.js:159` `/services/orders`.** Confirm there is no consumer of `useVendorOrders` in active code — `grep -rn "useVendorOrders" halla-mobile/screens halla-mobile/components` should return zero hits.
- **`recordInquiry` / `recordBooking` race** — two parallel calls from a host who double-taps will both succeed. This is acceptable for marketing-grade counters but if anything downstream treats the counter as ground-truth, document.
- **`getPublicServices` cross-tenant leakage.** A whitelabel admin viewing the marketplace sees vendors from all tenants. Verify that's the product intent — most marketplaces are global, but this codebase enforces whitelabel isolation everywhere else.
- **Service model `type` enum vs frontend `category`.** The backend stores `type`, the API exposes `category` (mapped in `_formatService`), the AddServicePopup form uses `serviceType` (form name) but submits `type` (FormData key), and the marketplace filter URL uses `category`. Naming is internally consistent only because the formatter mediates — but a future contributor will trip over this. Consider renaming the model field `type → category` (a migration), or keeping it and documenting the mapping at the top of `services.service.js`.
- **`AddServicePopup.js` (web) skips `zodResolver`.** The schema is imported but the form doesn't use it; the parallel `validateAddService` helper does the work. Either delete the helper and add `resolver: zodResolver(addServiceSchema)` (preferred), or delete the schema import.
- **`useServices.js` calls `apiRequest({ path: '${path}?${queryString}' })`** instead of passing `params:{}`. Equivalent on the wire, but breaks the `params` discipline used elsewhere. Cosmetic.

---

## 7. Implementation Plan (Ordered)

Apply changes in this order. Each item ends with a checkbox the agent will tick during Phase 2.

### 7.A Backend
- [ ] **A.1** Add `services.validation.js` with `createServiceSchema`, `updateServiceSchema`, `getPublicServicesQuerySchema`. Wire each via `validateZod(...)` middleware (Zod, per memory). (new file)
- [ ] **A.2** Fix `GET /services/:id` rbac (option a): move `router.get('/:id', protect, validateObjectId('id'), getService)` ABOVE the `router.use(restrictTo(VENDOR))` block. In service, branch: if `req.user.role === 'vendor'`, scope `vendorId` to `req.user._id`; else require `isPublic:true && status:active`. Set `trackView=true` only when caller is non-vendor. (`services.routes.js:78,157`, `services.controller.js:50-55`, `services.service.js:139-161`)
- [ ] **A.3** **DELETE** `POST /services/:id/inquire` and `POST /services/:id/book`: remove routes (`services.routes.js:72-74`), controller methods (`services.controller.js:116-132`), service methods (`services.service.js:163-197`). Drop the comment block above the section.
- [ ] **A.4** **DELETE** orphan counter fields after A.3:
    - `Service.inquiryCount`, `Service.bookingCount` from `ServiceModel.js:119-126`.
    - Update `formatService` to drop `inquiryCount` (`services.service.js:311`).
    - Update `getMyStats` aggregation to drop `totalBookings` (`services.service.js:117, 127`).
    - Update `ServiceModel.statics.getVendorStats` to drop `totalBookings` (`ServiceModel.js:183, 196`).
    - `User.profile.vendorData.inquiryCount`, `User.profile.vendorData.bookingCount` from `UserModel.js:134-135`.
    - Search and update any consumer of `totalBookings` outside the services module — search `grep -rn "totalBookings"` across `labbe/`, `halla-mobile/`, `labbe-backend-/src/modules/`. Report findings before deleting.
- [ ] **A.5** **RENAME `type` → `category`** in `ServiceModel.js`:
    - Field name + required message (`ServiceModel.js:27-43`).
    - Index `serviceSchema.index({ type: 1, status: 1 })` → `({ category: 1, status: 1 })` (`ServiceModel.js:147`).
    - In `services.service.js`: line 39 `query.type = filters.category` → `query.category = filters.category`. Line 301 `category: service.type` → drop the mapping (use `category: service.category` or destructure normally — pick the cleaner option).
    - Add migration `labbe-backend-/scripts/migrations/2026-05-rename-service-type-to-category.js` running `db.services.updateMany({ type: { $exists: true } }, [{ $set: { category: '$type' }, $unset: 'type' }])`. Document run instructions at the top.
- [ ] **A.6** Fix Swagger drift on `POST /services` and `PATCH /services/:id`: required fields `[name, category, price]`, add `tags` (array) and `serviceLocation` (object). (`services.routes.js:173-186, 209-223`)
- [ ] **A.7** Fix Swagger drift on `GET /services` and `GET /services/public` response shapes: top-level `data` is the array, top-level `pagination`. (`services.routes.js:54-67, 93-105`)
- [ ] **A.8** Add documented query-param schema for `GET /services/public` (regionId, cityId, districtIds, minPrice, maxPrice, minRating). (`services.routes.js:36-48`)
- [ ] **A.9** Add response schema for `GET /services/stats`. (`services.routes.js:111-123`)
- [ ] **A.10** Add `logAudit` calls on `createService`, `updateService`, `deleteService`, `toggleServiceStatus`. (`services.service.js`)
- [ ] **A.11** Extract the duplicated `parse tags JSON / parse price` block from `services.controller.js:62-69` and `:80-87` into Zod `.preprocess` / `.coerce` once 7.A.1 lands. Then strip the block from controllers.
- [ ] **A.12** Replace empty `catch (err) {}` in `_resolveLocationNames` with `logger.warn` (`services.service.js:366-368`).
- [ ] **A.13** Comment-hygiene pass — delete remaining FLOW markers (FLOW-26-F01/F02/F03/F05, FLOW-24-F04 references inside `services.service.js` and `services.routes.js`). Items already removed by A.3 don't need a separate sweep. Replace `// FLOW-25-F01:` (line 207) with a one-line invariant note about `isPublic` default. Add a one-line comment near the `getPublicServices` query about the **intentional cross-tenant marketplace scope** (decision #3).
- [ ] **A.14** Add a one-line comment near `numberOfClicks` `$inc` (`services.service.js:151-157`) noting it is a best-effort analytics counter (decision #4).

### 7.B Web
- [ ] **B.1** **CRITICAL** Fix data-mapping bug in vendor dashboard. Replace `servicesData?.data?.services` with `servicesData?.data || []`. (`app/[lang]/vendor-dashboard/page.js:56`)
- [ ] **B.2** Move filter `searchQuery` from `useState` into URL params via `useSearchParams`/`useRouter` (rule B14). (`app/[lang]/vendor-dashboard/page.js:26`)
- [ ] **B.3** Replace `console.error` in toggle/delete catches with `handleError(error, t, { fallbackMessage: "vendorServices.errors.update_failed" })` and add `toastUtils.success` on success. (`app/[lang]/vendor-dashboard/page.js:80-98`)
- [ ] **B.4** Replace `window.confirm` with the existing `ui/vendor/modals/DeleteConfirmation.jsx` component. (`app/[lang]/vendor-dashboard/page.js:88-92`)
- [ ] **B.5** Remove the `console.log("Promote profile - coming soon")` debug. (`app/[lang]/vendor-dashboard/page.js:115`)
- [ ] **B.6** Split `app/[lang]/vendor-dashboard/page.js` (258 → ≤ 250) by extracting `VendorDashboardHeader.js` and `ServicesSearchBar.js` into `_components/`. **Preserve all CSS-module class references.**
- [ ] **B.7** Wire `zodResolver(addServiceSchema)` into the RHF `useForm` in `AddServicePopup.js`; remove the parallel `validateAddService` helper and `validationErrors` state. (`ui/vendor/addServicePopup/AddServicePopup.js:25-28, 64-68`)
- [ ] **B.8** Replace `toast.error(error.message || …)` with `handleError(error, t, ...)`. (`ui/vendor/addServicePopup/AddServicePopup.js:91-94`)
- [ ] **B.9** Split `ui/vendor/addServicePopup/AddServicePopup.js` (268 → ≤ 250) by extracting `TagsGrid.js`. **Preserve every `styles.tag*` class.**
- [ ] **B.10** Add an error-state branch to `app/[lang]/market-place/page.js` and wrap its export in `<ErrorBoundary>`. (rule B19)
- [ ] **B.11** Split `app/[lang]/market-place/_components/filtersPopup/FiltersPopup.js` (309 → ≤ 250) into a `sections/` subfolder. **Preserve every `filtersPopup.module.css` class.**
- [ ] **B.12** Delete unused exports `useVendorServicesByCategory` and `useVendorService` from `useServices.js`. (`hooks/reactQueryHooks/useServices.js:76-89, 134-146`)
- [ ] **B.13** Remove `console.error` in mutation `onError` of `useServiceMutation`. (`hooks/reactQueryHooks/useServices.js:222-225`)
- [ ] **B.14** Tighten pagination read: `servicesData?.pagination?.total ?? vendors.length` (use `??` to keep `0` as a real value). (`app/[lang]/market-place/page.js:80-82`)
- [ ] **B.15** **Add web edit-flow parity with mobile** (decision #6):
    - **B.15.1** `ui/vendor/serviceCard/ServiceCard.js` — add an edit button next to the delete button. Accept `onEdit` prop (same shape as `onDelete`). Preserve all existing CSS-module classes; if a new class is needed for the edit-button container, add it in `serviceCard.module.css`.
    - **B.15.2** `app/[lang]/vendor-dashboard/page.js` — add `editingService` state, `handleEditService(service)` handler that sets state and opens the popup; pass `onEdit={handleEditService}` to `ServiceCard`.
    - **B.15.3** `ui/vendor/addServicePopup/AddServicePopup.js` — accept `editingService` prop. When set, prefill RHF `defaultValues` from the service shape and call `useServiceMutation('updateService')` with `{ serviceId: editingService.id, data }` instead of `createService`. Match the mobile `editingService._raw` shape so behavior is unified across platforms.
    - **B.15.4** Reset `editingService` to `null` on popup close + on success.
    - **B.15.5** Locale keys to add (decision #8 approved): `vendorServices.buttons.edit`, `vendorServices.editServicePopup.title`, `vendorServices.editServicePopup.submit`, `vendorServices.success.updated`, `vendorServices.errors.update_failed`. Audit-add into `labbe/localization/locales/{en,ar}/vendorServices.json`.

### 7.C Mobile
- [ ] **C.1** Migrate `services/vendorService.js` from `axios` to `apiFetch`. Drop the local `apiClient` instance and the request interceptor; rely on `apiFetch`. **Preserve every method signature**, the FormData shape, and return values (callers expect raw response bodies).
- [ ] **C.2** Migrate `services/marketplaceService.js` from `axios` to `apiFetch`. Same constraints.
- [ ] **C.3** Add `STATS`, `BY_ID`, `TOGGLE_STATUS` to `ENDPOINTS.SERVICES` in `config/api.js`. Replace literal strings inside `vendorService.js` with the new constants.
- [ ] **C.4** **CRITICAL** Delete `vendorService.getOrders` and `useVendor.useVendorOrders` (the `/services/orders` endpoint does not exist). (`services/vendorService.js:158-161`, `hooks/queries/useVendor.js:67-79`)
- [ ] **C.5** Tighten `useVendorStats` mapping to `response.data?.stats || {}` (drop the `|| response.data` defensive fallback). (`hooks/queries/useVendor.js:36`)
- [ ] **C.6** Split `components/marketplace/MoreInfoPopup.js` (552 → ≤ 350) into 3 sub-components in a `MoreInfoPopup/` folder. **Preserve every `StyleSheet.create({...})` value verbatim** — no value rounding, no key renames; copy blocks across files unchanged.
- [ ] **C.7** Comment-hygiene pass — delete the "Phase 4 W0-AUTH" headers in `services/vendorService.js` and `services/marketplaceService.js`, plus the route-restating per-method comments in `vendorService.js`.
- [ ] **C.8** Update mobile `AddServicePopup.js` to use new `category` field name where it interacts with backend payloads. Form-internal name `serviceType` (label only) stays unchanged. Verify `editingService._raw.serviceType` reading still matches what the API returns post-rename — if `_raw` carries the API-shaped service, update that read too.

### 7.D Cross-platform alignment (do AFTER A/B/C)
- [ ] **D.1** Re-grep for `data?.services` and `data?.data?.services` across `labbe/`. Expected: zero hits inside the services-module surface area.
- [ ] **D.2** Re-grep for raw axios usage inside `halla-mobile/services/vendorService.js` and `marketplaceService.js`. Expected: zero `axios.create` / `axios.get` / `axios.patch` calls in those files.
- [ ] **D.3** Smoke test (manual): on dev, log in as a vendor on web AND mobile, and verify the dashboard list of services is identical (same order, same fields). Then log in as a host on web and visit the marketplace; verify the same vendor's services appear.
- [ ] **D.4** Run the backend's swagger generator (or visit `/api-docs`) and visually confirm the services tag's endpoints all match the new annotations.

---

## 8. Locale-key additions required

(Listed for the user — agent does NOT modify locale JSON without explicit approval.)

**Web (`labbe/localization/locales/{en,ar}/`):**
- `vendorServices.errors.update_failed` — used by the new `handleError` calls in `vendor-dashboard/page.js`
- `vendorServices.errors.delete_failed` — same
- `vendorServices.success.updated` — toast on toggle success
- `vendorServices.success.deleted` — toast on delete success
- `vendorServices.confirmDelete.title` — for the new `<DeleteConfirmation>` modal
- `vendorServices.confirmDelete.message` — same
- (If 7.B.15) `vendorServices.inquiry.success` / `vendorServices.inquiry.error`

**Mobile (`halla-mobile/localization/locales/{en,ar}/`):**
- (If 7.C.8) `marketplace.inquiry.cta` — "Send inquiry" / "إرسال استفسار"
- `marketplace.inquiry.success` / `marketplace.inquiry.error`

Confirm before adding — many of these may already exist in adjacent namespaces.

---

## 9. Rollback plan

For each implementation item, the rollback is a `git revert` of its commit. The risky items are:

- **7.A.2 (rbac on `GET /services/:id`)** — if the new ungate causes a privacy issue (a host accidentally seeing a non-public service), revert to `restrictTo(VENDOR)` and remove the `trackView` logic.
- **7.A.3 + A.4 (deletion of inquire/book and orphan field cleanup)** — irreversible code-side via `git revert`. DB side: dropped fields will simply not exist on new docs; existing docs retain their values until next save (Mongoose strips unknown fields on save). If the booking flow needs to come back later, schema fields must be re-added before the route.
- **7.A.5 (`type` → `category` rename + DB migration)** — **this IS a DB-shape change**, but per locked decision #9 the project is in dev with no production data at risk, so a **single-shot** migration is the chosen approach. Forward: `db.services.updateMany({ type: { $exists: true } }, [{ $set: { category: '$type' }, $unset: 'type' }])`. Reverse (only needed if rollback): `db.services.updateMany({ category: { $exists: true } }, [{ $set: { type: '$category' }, $unset: 'category' }])`. Both scripts live under `labbe-backend-/scripts/migrations/`.
- **7.C.4 (deleting `getOrders`/`useVendorOrders`)** — irreversible only if a consumer is found later that the grep missed; recoverable by `git revert`.
- **7.B.1 (vendor dashboard data-mapping fix)** — irreversible regression risk is zero (the current code shows nothing; the fix adds rendering).
- **7.B.15 (web edit flow add)** — additive, no rollback risk; revert removes the new code.

---

## 10. Acceptance checklist (run after Phase 2)

- [ ] No file in the services module's surface area exceeds the cap.
- [ ] All 10 endpoints have current Swagger that matches the controller + service truth.
- [ ] No duplicate endpoints remain. `/services/:id/inquire` and `/services/:id/book` are either wired or removed.
- [ ] Web + Mobile call the same paths with the same shapes for every endpoint.
- [ ] No fallback chains (`a?.x || b?.y || c?.z`) in data mapping inside the surface area.
- [ ] No `// FLOW-…` / `// PHASE-…` / `// W0-AUTH` comments in the surface area.
- [ ] `npm run lint` clean in both `labbe/` and `halla-mobile/` (or no new warnings introduced).
- [ ] Visual smoke test: vendor dashboard shows services (web + mobile), marketplace shows services (web + mobile), `AddServicePopup` creates a service end-to-end, `toggle-status` flips correctly, `delete` removes from list.
- [ ] No web file in the surface area uses `console.error` outside of a catch that also raises a user-visible toast / `handleError`.
- [ ] No mobile service file uses raw `axios` for HTTP calls.
