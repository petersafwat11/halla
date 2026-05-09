# vendors — Full-Stack Review Plan

**Module:** vendors
**Generated:** 2026-05-07
**Decisions locked:** 2026-05-08 (see §0.5 below)
**Prompt:** docs/implementation/MODULE_FULLSTACK_REVIEW_PROMPT.md
**Status:** Decisions locked — ready to implement · NOT IMPLEMENTED YET

---

## 0. Executive Summary

- **3** total endpoints in module (`GET /vendors/categories`, `GET /vendors`, `GET /vendors/:id`)
- **2** candidates for deletion or major repurpose: `GET /vendors` and `GET /vendors/:id` are **unused by every page/screen on both platforms** today (marketplace listing uses `/services/public`; vendor profile pages don't exist). Decide: delete + remove related hooks, OR wire them into the marketplace cards (currently `service.vendor.*` is read from the services-module response, not from this endpoint).
- **3** Swagger drift findings (response shape mis-references `Vendor` schema; pagination shape mis-stated; `category` query param under-documented vs the 11 service-category fields).
- **0** backend file-size violations (all four files well under cap).
- **1** web file-size violation candidate (none over 250 today, but `_components/filtersPopup/FiltersPopup.js` = 309; flagged for split if it grows).
- **1** mobile file-size violation: `components/marketplace/MoreInfoPopup.js` = 552 (cap 350).
- **5** web/mobile API consumption mismatches (mobile bypasses `apiFetch`, uses raw axios; mobile hardcodes paths instead of `ENDPOINTS.VENDORS.*`; mobile `getServiceTypes` passes a `lang=ar` param the backend ignores; mobile `Sections.js` and `useFilterData.js` re-implement category fetching with `useState`+`useEffect` instead of using `useVendorCategories`; mobile lacks the hook at all in production paths).
- **6+** data-mapping bugs / fallback chains (service references vendor fields **not present in the User model** — `brandNameAr`, `businessDescription`, `businessDescriptionAr`, `basePrice`, `reviewCount`; query filters `basePrice` (does not exist) and `businessDescription` (the schema has `serviceDescription`); mobile/web both have multi-branch fallbacks `data?.data?.categories || response.data || []`).
- **2** missing/incorrect safeguards: no rate limiting on **public** routes (open to scraping / click-fraud on the fire-and-forget `numberOfClicks` increment); no audit log on the click increment (low priority but documented).
- **6** comment-hygiene blocks to remove (FLOW-* markers in service + model + mobile services).
- Estimated effort: **M** (most work is decisions + small edits; the open question on whether to delete the unused endpoints is the long pole).

---

## 0.5 Decisions Locked (2026-05-08, audit-corrected 2026-05-09)

These decisions resolve every `[DECISION]` gate in the original plan and supersede the conditional language in §1, §2.4, §2.5, §6, and §7. Verified against the codebase before locking.

### Audit corrections applied 2026-05-09 (read before implementing)
The plan was deep-audited against the codebase. Corrections:
1. **`api.config.js` line numbers wrong**: vendors block is at lines `259-263` (not `253-256` / `250-257` as the plan claimed). `B.4` updated.
2. **File line counts off-by-one**: `vendors.routes.js` 106 (was 107), `vendors.controller.js` 40 (was 41), `vendors.service.js` 195 (was 196).
3. **`getApprovedVendors` body range wrong**: actual lines 18-119 (plan said 18-144, which overlaps `getVendorById`).
4. **`_formatVendor` line range**: actual 167-192 (plan said 171-192; line 171 is the `_formatVendor(vendor) {` body opening, lines 167-170 are JSDoc).
5. **`getVendorById` body range**: actual 121-144 (plan said 124-144; JSDoc 121-125, body 126-144). Click increment confirmed at 138-141.
6. **Mobile `ENDPOINTS.VENDORS.BASE` (`config/api.js:148`) is dead after deletions** — explicitly delete it; only `CATEGORIES` survives. New §C.11 added.
7. **Mobile `useVendors` rename to `useMarketplaceServices` must be a HARD rename** with no deprecated alias (per user's "no backward-compat" rule). §C.8 sharpened.
8. **`MoreInfoPopup` split** is also wanted by the services plan §7.C.6. Sequencing rule: whichever plan ships first does the split; the second plan's checkbox becomes a no-op (verify file ≤350 and skip).

- **D1 — `GET /vendors`: DELETE.** Unused everywhere. The marketplace card flow runs on `/services/public` and that is locked as the source of truth (see D5).
- **D2 — `GET /vendors/:id`: DELETE.** **Premise that the popup is wired turned out to be wrong.** Verified directly:
  - Web: `app/[lang]/market-place/_components/card/Card.js` has no detail modal — only a `tel:` "Call Now" button. Zero callers of `useVendorPublic`.
  - Mobile: `MoreInfoPopup` (`components/marketplace/MoreInfoPopup.js:19`) receives a `vendor` prop built locally in `screens/host/Marketplace.js:60–78` from the denormalized `service.vendor` already returned by `/services/public`. `useVendorDetails`/`marketplaceService.getVendorDetails` are defined but have **zero callers**.
  - Net: nothing real depends on `/vendors/:id`. Deleting it is safe; the mobile popup keeps working on denormalized data. If product later wants richer popup data (portfolio images, full description, social links), the cleaner path is to extend `/services/public` (or its detail variant) rather than revive a parallel vendor endpoint.
- **D3 — Phantom fields (`brandNameAr`, `businessDescription`, `businessDescriptionAr`, `basePrice`, `reviewCount`): MOOT under D1+D2.** Verified via repo-wide search: these names appear nowhere in the backend except `vendors.service.js`'s `_formatVendor` projection (and a speculative read in `halla-mobile/components/admin-dashboard/vendors/VendorDetailsCard.js`, which is admin-module scope). The signup flow does **not** save them. The fields were aspirational. Once `_formatVendor` is deleted with the routes, the dead-field problem disappears. No schema change.
- **D4 — Click counter (move to `POST /vendors/:id/click`, dedupe by IP/user, audit log): MOOT under D2.** No GET to add side effects to. The `numberOfClicks` field stays on `vendorDataSchema` (it sits next to `inquiryCount`/`bookingCount` and may be used by admin/analytics later) but no code increments it after this PR. If product later wants click tracking on marketplace cards, the right home is `/services/public` (or a dedicated `POST /services/:id/click`) — not a deleted module. Track as a future ask outside this PR.
- **D5 — Marketplace card source of truth: `/services/public` (one-per-service).** Confirmed. The denormalized `service.vendor` sub-document remains the source for popup/contact info on mobile.
- **D6 — Whitelabel scoping for public marketplace: NOT siloed.** Single global public marketplace is intentional.
- **D7 — Rate limiter on remaining `/vendors/categories`: NO.** Static 11-item response, low abuse value. Skip.
- **D8 — Hook rename `useVendors` → `usePublicVendors`: MOOT under D1.** The colliding `useVendors` in `hooks/reactQueryHooks/useVendors.js` is being deleted entirely. The admin-side `useVendors` in `useUsers.js:88` keeps the name unopposed.
- **D9 — Validation library: ZOD (not Joi).** Project-wide convention. Schemas live in `*.validation.js` files using `const { z } = require('zod')`; routes wire them via `validateZod(schema, source)` from `shared/middleware/validation.js:401`. Canonical pattern: `events.validation.js` + `events.routes.js:263, 336, 376, …`. Query example: `dashboard.routes.js:75` → `validateZod(adminDashboardQuery, 'query')`. NOTE: with D1+D2, the only surviving route is `GET /vendors/categories` which has no params, so **`vendors.validation.js` is not needed** for this PR. If query params are added later, follow the events pattern.

**Net effect:** module reduces to a single endpoint (`GET /vendors/categories`). Most of the original §7 plan collapses. See the rewritten §7 below.

---

## 1. Endpoint Inventory

| # | Method | Path | Controller | Service | Middleware chain | Swagger | Web hook | Mobile hook | Status |
|---|--------|------|------------|---------|------------------|---------|----------|-------------|--------|
| 1 | GET | `/vendors/categories` | `vendors.controller.getCategories` | `vendorsService.getCategories` | (public, none) | OK (light) | `useVendorCategories` (`hooks/reactQueryHooks/useVendors.js`) | `useVendorCategories` (`hooks/queries/useMarketplace.js`) — but most consumers call `marketplaceService.getServiceTypes()` directly | KEEP |
| 2 | GET | `/vendors` | `vendors.controller.getVendors` | `vendorsService.getApprovedVendors` | (public, none) | Drift (response shape, pagination location) | `useVendors` (defined, **0 callers**) | `useVendors` (`useMarketplace.js` — but its `queryFn` calls `marketplaceService.getVendors` which actually hits **`/services/public`**, not `/vendors`) | DECIDE: DELETE or WIRE |
| 3 | GET | `/vendors/:id` | `vendors.controller.getVendorById` | `vendorsService.getVendorById` | `validateObjectId('id')` (public) | Drift (response shape) | `useVendorPublic` (defined, **0 callers**) | `useVendorDetails` (`useMarketplace.js`, **0 callers**) | DECIDE: DELETE or WIRE |

**Legend:** KEEP, DELETE-DUPLICATE-OF-#N, RENAME, MERGE-WITH-#N, DECIDE.

> Note: `admin.vendors.*` admin paths (`/admin/vendors`, `/admin/vendors/:id/status`, etc.) are owned by the `admin` module, not `vendors`. They're out of scope here. The web admin pages under `app/[lang]/admin-dash/vendors/**` and the mobile screens under `screens/admin/admin-dashboard/AdminVendorsScreen.js` / `VendorDetailsScreen.js` will be covered when running this prompt against `admin`.

---

## 2. Backend Findings

### 2.1 File-size violations
None.

| File | Lines | Cap | Status |
|------|-------|-----|--------|
| `vendors.routes.js` | 106 | 400 | OK |
| `vendors.controller.js` | 40 | 300 | OK |
| `vendors.service.js` | 195 | 600 | OK |
| `index.js` | 16 | — | OK |
*(Line counts audit-corrected 2026-05-09 — plan was off-by-one on three files.)*

### 2.2 Swagger drift
- `GET /vendors` (`vendors.routes.js:38–76`) — JSDoc declares the response as `{ status, data: { vendors: [...], pagination: {...} } }`, but the controller calls `sendPaginated(res, result.data, result.pagination)` which produces `{ status: "success", data: [...], pagination: {...} }` (top-level `pagination`, not nested under `data`). The `Vendor` schema reference also doesn't match what `_formatVendor` actually returns (see §2.4). Fix Swagger to reflect the real wire shape.
- `GET /vendors/:id` (`vendors.routes.js:80–103`) — JSDoc declares response `data: $ref Vendor`, but the service returns `{ vendor: <formatted> }` so the wire shape is `{ status: "success", data: { vendor: {...} } }`. Fix Swagger.
- `GET /vendors/categories` (`vendors.routes.js:24–34`) — JSDoc declares only "Categories retrieved successfully" with no schema. The actual shape is `{ status: "success", data: { categories: [{ key, nameEn, nameAr }, ...] } }`. Add a proper response schema (re-usable as `VendorCategoriesResponse` in `config/swagger.js`).
- `GET /vendors` query params — JSDoc lists `search` and `category`, but the service also accepts `serviceType`, `minRating`, `maxRating`, `minPrice`, `maxPrice`, `regionId`, `cityId`, `sortBy`. Document them all (or, as per §2.4, drop the ones that don't actually work).

### 2.3 Missing middleware / safeguards
- **No rate limiter on any of the three routes** (`vendors.routes.js`). All three are public/unauthenticated. The `getVendorById` endpoint runs a fire-and-forget `User.findByIdAndUpdate(..., { $inc: { 'profile.vendorData.numberOfClicks': 1 } })` on every hit — trivially scriptable to inflate vendor click counters. Add `rateLimit` (or a new `publicReadLimiter`) from `shared/middleware/rateLimiter` to all three routes. Discuss desired RPS with the user.
- **No `validateObjectId` on `:id` was missing before** — actually present at `vendors.routes.js:104`, OK.
- **No tenant/whitelabel filter.** Public marketplace serves all approved vendors across the platform. If whitelabels are meant to be siloed, this is broken — verify with the user. If not (single global marketplace), this is intentional.
- **Click counter inflation:** `vendorsService.getVendorById` (line 138–141) increments `numberOfClicks` even if the same user hits the URL repeatedly, even if the user is the vendor themselves viewing their own page. At minimum, dedupe by IP / by authenticated user; or move the click counter behind a separate explicit endpoint (`POST /vendors/:id/click`) so refreshing the page doesn't inflate. **Flag for product decision.**

### 2.4 Duplicate / dead endpoints / unused fields
**The biggest finding in this module.** The `_formatVendor` projection (lines 171–192) returns five fields that **do not exist** on the `vendorDataSchema` (`labbe-backend-/models/UserModel.js:42–138`):

| Field returned | Actually in User schema? | Effect |
|----------------|--------------------------|--------|
| `brandNameAr` | No | Always `undefined` on the wire |
| `businessDescription` | No (schema has `serviceDescription`) | Always `undefined` |
| `businessDescriptionAr` | No | Always `undefined` |
| `basePrice` | No (schema has `pricePackages: [String]` only) | Always `undefined`; the price filters at lines 64–69 query a non-existent field, so they silently match nothing |
| `reviewCount` | No (schema has `numberOfRatings`) | Always `0` |

Additionally, the search regex at lines 80–88 searches `profile.vendorData.businessDescription` (no such field) — half the search OR-clause is dead.

Decisions needed:
- (a) Add the missing fields to the schema (a real product change — needs PM input on bilingual brand names, base price model, etc.); or
- (b) Strip the missing fields from `_formatVendor`, drop the price filter and the description search; rename `reviewCount` → `numberOfRatings`. **Default recommendation:** option (b) until product confirms (a).

`GET /vendors` and `GET /vendors/:id` are **unused** by every web page and every mobile screen today (verified: 0 callers of `useVendors`, `useVendorPublic` on web; 0 callers of `useVendors`/`useVendorDetails` against this endpoint on mobile — the mobile `useVendors` actually targets `/services/public`). Decisions:
- (a) Delete the two endpoints + their hooks and the `Vendor` Swagger schema; or
- (b) Wire them into the marketplace cards so the front-end consumes the canonical vendor profile from this module instead of denormalising vendor data inside `service.vendor`. **Default recommendation:** ask the user; the marketplace card already shows vendor-level data (brand name, logo, phone) by reading `service.vendor` from `/services/public` — the data path is one of those two, and the unused vendor module is the other. Pick one.

### 2.5 Service / controller violations
- `vendors.service.js:138` — `// FLOW-26-F05: increment click counter (fire-and-forget)`. Comment-hygiene violation (A9). Also: fire-and-forget side effect on a `GET` is questionable (idempotency / REST). Consider moving to an explicit `POST /vendors/:id/click` so the read endpoint is side-effect-free.
- `vendors.service.js:138–141` — the click increment uses `.exec()` without `.catch()`. If the increment fails (connection blip), the rejection becomes an unhandled promise rejection. Either `await` it, or add `.catch((err) => logger.warn(...))`.
- `vendors.service.js:38–55` — the category filter builds an 11-way `$or` across each service-category sub-field. This works but is expensive; consider restructuring `serviceCategories` as `{ category: <enum>, items: [String] }[]` to enable a single `{ "serviceCategories.category": filters.category }` query (model change — **flag for product**, not in scope of this PR).
- `vendors.service.js:32–36` — `serviceType` filter builds `query[\`profile.vendorData.serviceCategories.${filters.serviceType}\`] = { $exists: true, $ne: [] }`. The schema declares all 11 keys, so `$exists: true` is always true; this devolves to `$ne: []`, which mongo evaluates loosely (`$ne: []` matches arrays with at least one element AND missing fields). Tighten to `{ $type: 'array', $not: { $size: 0 } }` or `$exists: true` + `$ne: []` is fine *if* the dev is confident schema-default empty arrays are written on save (the schema has no default). **Verify with a quick query in dev.**
- `vendors.service.js:23` — `let query = { ... }` then conditionally adds `query.$and = andConditions`. Mixing top-level fields with `$and` is fine for Mongo; readability would improve by always pushing the base into `andConditions` and using a single `$and`. Cosmetic.
- Controllers are clean — `req.query` parsing + single service call + `sendPaginated`/`sendSuccess`. ✓

### 2.6 Validation gaps
- **Superseded by D9 + D1/D2.** With `GET /vendors` and `GET /vendors/:id` deleted, the only remaining route (`GET /vendors/categories`) takes no params, so no `vendors.validation.js` is needed for this PR.
- For reference, the project standard for validation is **Zod** via `validateZod(schema, source)` from `shared/middleware/validation.js:401`. Schemas live in `<module>.validation.js` files (`const { z } = require('zod')`). Canonical example: `events.validation.js` + `events.routes.js:263`. Query-source example: `dashboard.routes.js:75` → `validateZod(adminDashboardQuery, 'query')`. **Joi is forbidden for new code** in this codebase.
- `:id` was validated via `validateObjectId` (now deleted with the route).

### 2.7 Comment hygiene
- `vendors.service.js:138` — `// FLOW-26-F05: increment click counter (fire-and-forget)` → drop the FLOW marker; the explanatory phrase "fire-and-forget" is fine to keep if we keep the side effect (but see §2.5).
- `models/UserModel.js:125` — `// FLOW-24-F02: profile-completion flag (auto-set when required vendor fields are present)` → drop FLOW marker; keep the rest.
- `models/UserModel.js:128` — `// FLOW-24-F02: status-change audit timestamps and actor` → drop FLOW marker.
- `models/UserModel.js:133` — `// FLOW-25-F04: vendor-level engagement counters` → drop FLOW marker.

(Model changes are flagged but technically out of module scope — leave these for the `users`/`auth` module review unless the user wants to bundle.)

---

## 3. Frontend Web Findings

### 3.1 Component tree per page

`app/[lang]/market-place/page.js` is the only page in the web tree that touches a `vendors`-module endpoint (via `useVendorCategories` inside `Sections`).

- `app/[lang]/market-place/page.js` (202 lines) — uses `usePublicVendorServices` (services module), `useRegions`/`useCitiesByRegion`/`useDistrictsByCity` (locations), and indirectly `useVendorCategories` via `Sections`.
  - `_components/sections/Sections.js` (59) — uses `useVendorCategories` ← **only direct consumer of vendors module on web**
  - `_components/filters/Filters.js` (188)
  - `_components/filtersPopup/FiltersPopup.js` (309) — close to cap
  - `_components/card/Card.js` (118)
  - `_components/pagination/Pagination.js` (94)
  - `_components/skeleton/ServiceSkeleton.js` (29)
  - `hooks/useMarketplaceFilters.js` (176)
  - `layout.js` (11)
- `hooks/reactQueryHooks/useVendors.js` (65) — defines `useVendorCategories`, `useVendors` (unused), `useVendorPublic` (unused)
- `services/new-backend/api.config.js` lines **259–263** — `vendors.*` paths (audit-corrected 2026-05-09; original plan said 250-257, but that range is the `locations` block. The `vendors:` block opens at 259 and closes at 263).

Other matches found while grepping:
- `hooks/reactQueryHooks/useUsers.js:88` — defines a separate `useVendors` for the **`/users/vendors`** admin endpoint. Same export name as the public marketplace hook (different file). **Naming collision risk** — flag for the `users` module review; out of scope here but documenting.

### 3.2 File-size violations
None over the 250 cap on the marketplace page tree. `FiltersPopup.js` (309) is over the cap; however `FiltersPopup.js` is **not** part of the vendors-module surface area (it doesn't call any `vendors.*` endpoint) — flag during the marketplace / locations review and out of scope here.

### 3.3 Hardcoded text / data / paths
- `_components/sections/Sections.js:18` — `cat.nameAr || cat.nameEn`. Hardcoded preference for Arabic regardless of `i18n.language`. **Use the current locale** (`i18n.language === "ar" ? cat.nameAr : cat.nameEn`). Web mobile parallel below uses the locale correctly — fix web to match.
- No other hardcoded strings or paths inside the vendors-module surface area on web.

### 3.4 Data mapping bugs / fallback chains
- `Sections.js:14` — `categoriesData?.data?.categories || []`. ✓ Correct (matches backend `sendSuccess(res, { categories })` shape).
- `useVendors.js` (web) — three hooks that don't fall back; clean.
- The `_formatVendor` fields documented in §2.4 mean the web hook would (when called) return `undefined` for `brandNameAr` / `businessDescription` / `businessDescriptionAr` / `basePrice` / `reviewCount`. Since no page consumes the hook, this is latent.

### 3.5 Duplicate hooks / direct apiRequest calls
- `useVendors` is defined twice with identical export name (`hooks/reactQueryHooks/useVendors.js:33` for `/vendors`, `hooks/reactQueryHooks/useUsers.js:88` for `/users/vendors`). Different endpoints → different jobs → not strictly a duplicate, but the name collision will bite. Recommendation: rename the public marketplace hook to `usePublicVendors` to match the existing `useVendorPublic` (also flag the asymmetry: `useVendorPublic` should be `usePublicVendor` for consistency). **Defer until §7 decision on whether `/vendors` survives at all.**
- No direct `apiRequest` calls in components for vendors-module endpoints. ✓
- No component-private `useQuery` against vendors paths. ✓

### 3.6 State / loading / error gaps
- `Sections.js` (web) — has loading state, but **no error state**. Add an error fallback that matches the loading UI.
- `Sections.js` (web) — no empty state. If `categories.length === 0` we still render an "All" radio with no others. Acceptable since the backend never returns 0 categories (hardcoded list of 11), but worth noting.
- The marketplace page itself has loading + empty states (lines 123–179); error state from `usePublicVendorServices` is not surfaced (the `useQuery` returns `error` but the page only branches on `isLoading`). Out of strict scope for this prompt, but flagged.

### 3.7 Comment hygiene
None inside the vendors-module surface area on web. ✓

---

## 4. Frontend Mobile Findings

### 4.1 Screen → component tree
- `screens/host/Marketplace.js` (181) — only screen that consumes vendors-module endpoints (transitively).
  - `components/marketplace/SearchAndFilter.js` (144)
  - `components/marketplace/VendorCards.js` (89)
  - `components/marketplace/VendorCard.js` (240)
  - `components/marketplace/MoreInfoPopup.js` (552) — **VIOLATION cap=350**
  - `components/marketplace/FilterPopup.js` (201)
  - `components/marketplace/Sections.js` (183) — calls `marketplaceService.getServiceTypes` directly (NOT via the `useVendorCategories` hook)
  - `components/marketplace/_components/FilterDropdown.js` (160)
  - `components/marketplace/_components/FilterInputs.js` (91)
- `services/marketplaceService.js` (168) — wraps `/vendors/categories`, `/vendors/:id`, plus `/services/public` and `/locations/*`
- `services/vendorService.js` (170) — **misnamed**: covers the vendor *account* (profile / services / orders / tickets); does NOT touch `vendors`-module endpoints. Out of scope here, but flagged because the dual existence (`vendorService.js` and `marketplaceService.js`) makes ownership confusing.
- `hooks/queries/useMarketplace.js` (54) — `useVendors`, `useVendorCategories`, `useVendorDetails`. Only `useVendors` (which actually targets `/services/public`) has a real consumer.
- `hooks/queries/useVendor.js` (99) — vendor-account hooks; out of scope.
- `hooks/useFilterData.js` (130) — duplicates the category fetch logic outside of React Query.

### 4.2 File-size violations
- `components/marketplace/MoreInfoPopup.js` — **552 lines** (cap 350). Proposed split: extract `<VendorContactCard/>`, `<VendorPortfolioGrid/>`, `<VendorMetaRow/>` (or similar — confirm sub-tree boundaries while preserving every `StyleSheet.create` value verbatim).

### 4.3 Service / hook violations
- `services/marketplaceService.js:14` — uses a custom `marketplaceAxios` instance instead of `apiFetch` (Rule C1). Migrate to `apiFetch` (token + 30 s timeout + refresh-once-on-401 are part of the contract for *every* mobile network call, even public reads). Justification ("public reads") in the file's banner is not enough.
- `services/marketplaceService.js:32, 80, 96, 111, 127, 144` — hardcodes `/vendors/categories`, `/vendors/${vendorId}`, `/services/public`, `/locations/*`. Replace with `ENDPOINTS.VENDORS.CATEGORIES`, `${ENDPOINTS.VENDORS.BASE}/${vendorId}`, `ENDPOINTS.SERVICES.PUBLIC`, etc. (Rule C1.)
- `services/marketplaceService.js:34` — passes `{ params: { lang } }` to `/vendors/categories`. Backend ignores `lang` (hardcoded English+Arabic in the response). The mobile `Sections.js` then picks the language locally. Drop the `lang` param.
- `services/marketplaceService.js:9–12` — `Phase 4 W0-AUTH:` banner. Strip (Rule C8).
- `components/marketplace/Sections.js:17–69` — direct service call inside the component via `useState`+`useEffect` (Rule C2 forbids; React Query hook exists at `hooks/queries/useMarketplace.js:28` already). Rewrite to use `useVendorCategories`. Also has a hardcoded fallback list of 4 categories on error (Rule B3 violation) — delete; the 11 categories from backend is the source of truth.
- `components/marketplace/Sections.js:41` — `console.error("Error fetching service types:", error)` without user feedback (Rule D6).
- `hooks/useFilterData.js:44–101` — five `useState`+`useEffect` fetchers for regions/cities/districts/service-types. Replace with the existing React Query hooks (`useRegions`, `useCitiesByRegion`, `useDistrictsByCity`, `useVendorCategories`). The fetchers also use fallback chains (`response.data?.regions || response.data || []`) — Rule B0.1 violation. Out-of-strict-scope (locations module owns 3 of the 4) but the categories one is in scope.
- `hooks/queries/useMarketplace.js:9` — `useVendors` `queryFn` calls `marketplaceService.getVendors` which actually hits **`/services/public`**, not `/vendors`. The hook + service name promises one thing; the implementation does another. Rename to `useMarketplaceServices` + `marketplaceService.getMarketplaceServices`, OR migrate the implementation to actually call `/vendors`. Coordinate with §1 row #2 decision.
- `hooks/queries/useMarketplace.js:31–32` — `marketplaceService.getServiceTypes("ar")` hardcodes Arabic; the backend ignores it but the mobile Sections.js then reads `nameAr`/`nameEn` based on its own `i18n.language`. Drop the `"ar"` literal.
- `services/vendorService.js:9–20` — the entire `Phase 4 W0-AUTH` JSDoc block is comment-hygiene violation. Strip. (Out of strict module scope — flagged for `users`/`services`/`tickets` reviews.)

### 4.4 Hardcoded text / data / paths
- `screens/host/Marketplace.js:54` — `t("errors.loadFailed", "فشل تحميل المزودين")`. Fallback string is fine per Rule B2 (always provide a fallback).
- `screens/host/Marketplace.js:62, 65, 135` — same pattern, fallbacks present. ✓
- `components/marketplace/MoreInfoPopup.js:84` — hardcoded image URL `https://api.builder.io/api/v1/image/assets/TEMP/fcdfb1891ef72b7b32774a9d251821471803e423`. **Bug** (Rule B3). Replace with `vendor.businessLogo` or a project placeholder asset.
- `components/marketplace/Sections.js:41–65` — hardcoded fallback category list. **Bug** (Rule B3); delete the fallback when migrating to the React Query hook.

### 4.5 Web/Mobile divergence
See §5 for the full table.

### 4.6 Loading / error / empty states
- `screens/host/Marketplace.js` — has loading + error toast + end-of-list hint via `VendorCards`. Good. Empty state is implicit (FlatList with 0 items renders nothing visible) — verify `VendorCards` shows an empty hint; if not, add one.
- `components/marketplace/Sections.js` — loading shown; no error state (silently falls back to the hardcoded list). Add an error/empty branch when migrating.

### 4.7 Comment hygiene
- `services/marketplaceService.js:9–12` — `Phase 4 W0-AUTH` block.
- `services/vendorService.js:9–20` — `Phase 4 W0-AUTH` block (out of scope; flagged for the related modules).

---

## 5. Cross-Platform API Consumption Diff

| Endpoint | Aspect | Web | Mobile | Backend truth | Action |
|----------|--------|-----|--------|---------------|--------|
| `GET /vendors/categories` | Path | `/vendors/categories` (via `API_PATHS.vendors.getCategories`) | `/vendors/categories` (hardcoded literal in `marketplaceService`) | `/vendors/categories` | Migrate mobile to `ENDPOINTS.VENDORS.CATEGORIES` |
| `GET /vendors/categories` | Query params | (none) | `?lang=ar` (or current locale) | (none — backend ignores any) | Drop the `lang` param on mobile |
| `GET /vendors/categories` | Response read path | `data.data.categories` | `response.data.categories || response.data` (fallback chain) | `data.categories` | Fix mobile to read `data.categories` only |
| `GET /vendors/categories` | Auth | None (public) | None | None | OK |
| `GET /vendors/categories` | Hook used | `useVendorCategories` (canonical) | Two paths: `useVendorCategories` (defined, **0 callers**) and `marketplaceService.getServiceTypes()` (called directly inside `Sections.js` and `useFilterData.js` with `useState`+`useEffect`) | — | Mobile must use the React Query hook; delete the duplicate `useState` paths |
| `GET /vendors/categories` | Locale picking | `cat.nameAr || cat.nameEn` (always Arabic when present) | `i18n.language === "ar" ? c.nameAr : c.nameEn` (correct) | — | Fix web to match mobile (locale-aware) |
| `GET /vendors` | Path | `API_PATHS.vendors.getVendors` (`/vendors`) | `/services/public` (despite the function name `marketplaceService.getVendors`) | `/vendors` exists; `/services/public` is a different module | DECIDE: delete `/vendors` or wire mobile+web onto it |
| `GET /vendors` | Real consumer | None (hook defined, 0 callers) | None of `/vendors` (the mobile listing is on `/services/public`) | — | Same as above |
| `GET /vendors/:id` | Path | `API_PATHS.vendors.getVendorById(id)` | `/vendors/${vendorId}` (hardcoded; would route via `marketplaceService.getVendorDetails`) | `/vendors/:id` | Migrate mobile to `${ENDPOINTS.VENDORS.BASE}/${id}` if endpoint survives |
| `GET /vendors/:id` | Real consumer | None (`useVendorPublic` defined, 0 callers) | None (`useVendorDetails` defined, 0 callers) | — | DECIDE: delete or wire (see §7.D) |
| `GET /vendors/:id` | Side effect | Increments `numberOfClicks` even on duplicate hits / self-views | Same | Same | Move to a separate `POST /vendors/:id/click` so reads are side-effect-free; or dedupe by IP / authenticated user |

---

## 6. Suspected Bugs Worth Verifying

1. **`basePrice` filter / field is dead.** `vendorsService.getApprovedVendors` accepts `minPrice`/`maxPrice` and filters `profile.vendorData.basePrice`, but `basePrice` does not exist on `vendorDataSchema`. The filter silently matches no documents. (`vendors.service.js:64–69`, `models/UserModel.js:42–138`.) Confirm with a quick `db.users.findOne({ "profile.vendorData.basePrice": { $exists: true } })` — should return null.
2. **`businessDescription` / `brandNameAr` / `businessDescriptionAr` / `reviewCount` always `undefined` on the wire.** `_formatVendor` returns these, but the schema doesn't have them. (`vendors.service.js:171–192`, `models/UserModel.js:42–138`.) Verify by hitting `GET /vendors/<approved-id>` and inspecting the response.
3. **Description search half-dead.** `vendorsService.getApprovedVendors` regex-searches `profile.vendorData.businessDescription`, which doesn't exist; the other branch (`brandName`) does work. (`vendors.service.js:80–88`.)
4. **Click counter inflation.** Anyone refreshing a vendor profile page (or a script hitting `/vendors/:id` in a loop) inflates `numberOfClicks` without bound and without any auth/rate-limit. (`vendors.service.js:138–141`, `vendors.routes.js:104`.)
5. **Web `Sections.js` ignores user locale.** Falls back to Arabic name even when `i18n.language === "en"`. (`app/[lang]/market-place/_components/sections/Sections.js:18`.)
6. **Mobile marketplace listing is misrouted.** `useVendors` (mobile) returns data from `/services/public`. If product expects the marketplace list to come from the vendors module (one card per vendor), this is wrong. If expected to come from services (one card per service offering, with a vendor sub-doc), this is right but the naming is misleading. **Confirm intent with PM.**
7. **Public endpoints exposing rating without abuse controls.** `rating` and `numberOfRatings` are public; `numberOfClicks` is also exposed in `_formatVendor` (line 188 — wait, actually it's NOT in `_formatVendor`; only `rating` and `reviewCount` are returned). Check whether `numberOfClicks` should ever be exposed publicly — currently it is not, which is correct. ✓
8. **Mobile `marketplaceAxios` skips `apiFetch`'s 401-refresh.** Public reads don't need auth, but if/when a vendor opens the marketplace page while their token has just expired in another tab, `apiFetch` would refresh; `marketplaceAxios` will not. Low severity for public reads, but inconsistent.

---

## 7. Implementation Plan (Ordered) — LOCKED

All `[DECISION]` gates from the original draft are resolved in §0.5. The plan below reflects the locked outcome: delete `/vendors` + `/vendors/:id`, keep only `/vendors/categories`, no rate limiter, no validation file (no params), Zod-only convention noted for the future.

### Cross-plan sequencing (READ FIRST — added 2026-05-09 after audit)

This plan touches files also touched by the locations and services plans:

1. **`halla-mobile/services/marketplaceService.js`** — locations §C.4 deletes `getRegions/getCities/getDistricts` from this file. After that, vendors §C.1/C.2 migrates the remaining methods to `apiFetch`. If locations runs first, vendors will see fewer methods to migrate (correct). If vendors runs first, the locations methods stay until locations runs (also correct).
2. **`halla-mobile/components/marketplace/MoreInfoPopup.js` split (552 → ≤350)** — services plan §7.C.6 also wants this. **Whichever plan ships first does the split**; the second plan's split checkbox becomes a no-op (verify the file is already ≤350 and skip §C.7 of THIS plan). Sub-component boundaries: contact ≈ contact, gallery ≈ portfolio, description ≈ meta — both plans align. Ship in folder layout `components/marketplace/MoreInfoPopup/` per services plan's stricter shape.
3. **`Phase 4 W0-AUTH` banner stripping** — multiple plans touch the same banner (idempotent). First plan to run wins; later plans treat it as already done.

### 7.A Backend (single PR scope)
- [ ] **A.1** Delete `GET /vendors` route + JSDoc block (`vendors.routes.js:38–76`).
- [ ] **A.2** Delete `GET /vendors/:id` route + JSDoc block (`vendors.routes.js:80–104`), including the `validateObjectId('id')` middleware import if no longer used.
- [ ] **A.3** Delete `getVendors` and `getVendorById` controller methods (`vendors.controller.js:14–31`); keep `getCategories`. File should drop to ~15 lines.
- [ ] **A.4** Delete from `vendors.service.js` (line ranges audit-corrected 2026-05-09):
  - `getApprovedVendors` lines **18-119** (was 18-144 — that overlapped `getVendorById`)
  - `getVendorById` lines **121-144** (was 124-144 — JSDoc starts at 121); click-counter `$inc` at **138-141** is removed with this deletion
  - `_formatVendor` helper lines **167-192** (was 171-192 — JSDoc starts at 167)
  - Any now-unused imports
  - **Keep only `getCategories` (lines 146-165) and any helper it actually uses.** Audit confirmed `getCategories` does NOT call `_formatVendor` or any helper being deleted, so it is fully self-contained.
  Final `vendors.service.js` should drop to ~30 lines (the file class wrapper + `getCategories` body).
- [ ] **A.5** Strip the `// FLOW-26-F05` marker if any survives the deletion in A.4 (it sits inside the click-counter block being removed, so this should be automatic — verify).
- [ ] **A.6** Drop the `Vendor` Swagger schema definition from `config/swagger.js` (and any `$ref: '#/components/schemas/Vendor'` references).
- [ ] **A.7** Tighten the surviving `GET /vendors/categories` Swagger block: add a real response schema matching `{ status, data: { categories: [{ key, nameEn, nameAr }] } }`. Define a reusable `VendorCategoriesResponse` schema in `config/swagger.js` if it improves readability.
- [ ] **A.8** Comment hygiene: scan the surviving `vendors.service.js` + `vendors.controller.js` + `vendors.routes.js` for any remaining `// FLOW-…` / `// PHASE-…` / `// BUG-…` markers; remove. (Markers in `models/UserModel.js` lines 125/128/133 are out of scope — flag for the `users`/`auth` module review.)
- [ ] **A.9** [SKIPPED per D7] No rate limiter added.
- [ ] **A.10** [SKIPPED per D9] No `vendors.validation.js` — no params remain. If query params are added later, follow the events pattern: Zod schema in `vendors.validation.js`, wired via `validateZod(schema, 'query')` from `shared/middleware/validation.js:401`. Reference: `events.validation.js`, `events.routes.js:263`, `dashboard.routes.js:75`.

### 7.B Web
- [ ] **B.1** `app/[lang]/market-place/_components/sections/Sections.js:18` — replace `cat.nameAr || cat.nameEn` with `i18n.language === "ar" ? cat.nameAr : cat.nameEn` (locale-aware, matches mobile).
- [ ] **B.2** `Sections.js` — add an error fallback branch (currently only `isLoading` is handled). Use the same `<SimpleLoading/>`-shaped error UI as siblings; new locale key `marketplace.errors.categoriesLoadFailed` (see §8).
- [ ] **B.3** `hooks/reactQueryHooks/useVendors.js` — delete `useVendors` (lines 33–47) and `useVendorPublic` (lines 52–64). Keep `useVendorCategories`. The colliding admin-side `useVendors` in `useUsers.js:88` keeps its name (no rename needed per D8).
- [ ] **B.4** `services/new-backend/api.config.js:259-263` (audit-corrected 2026-05-09; the actual `vendors:` block, was wrong 253-256) — delete the `getVendors` (line 261) and `getVendorById` (line 262) entries from `API_PATHS.vendors`. Keep `getCategories` (line 260). Final block: 3 lines (`vendors: { getCategories: '/vendors/categories' }`).
- [ ] **B.5** Comment hygiene: nothing in scope on web. ✓

### 7.C Mobile
- [ ] **C.1** `services/marketplaceService.js` — migrate from raw `marketplaceAxios` (line 14) to `apiFetch` + the `_request` helper pattern (mirror `ticketsService.js`). Required at lines 31, 78, 95, 110, 124, 142.
- [ ] **C.2** `services/marketplaceService.js` — replace hardcoded path strings (lines 32, 79, 96, 111, 127, 144) with `ENDPOINTS.VENDORS.CATEGORIES`, `ENDPOINTS.SERVICES.PUBLIC`, `ENDPOINTS.LOCATIONS.*`. Add any missing entries to `config/api.js:127–130`.
- [ ] **C.3** `services/marketplaceService.js:29–34` and `hooks/queries/useMarketplace.js:32` — drop the `lang` param from `getServiceTypes` (backend ignores it; mobile picks the locale at render time).
- [ ] **C.4** `services/marketplaceService.js:5–12` — strip the `Phase 4 W0-AUTH` JSDoc banner (Rule C8).
- [ ] **C.5** `components/marketplace/Sections.js` — rewrite to use `useVendorCategories` from `hooks/queries/useMarketplace.js`. Remove the `useState`+`useEffect` fetcher (lines 17–69), the hardcoded fallback list of 4 categories (Rule B3), and the `console.error`-only catch (Rule D6). Add an error/empty state. **Preserve every `View`/`Text`/`TouchableOpacity` node + every `StyleSheet.create` value verbatim.**
- [ ] **C.6** `hooks/useFilterData.js:44–101` — migrate `fetchServiceTypes` (the categories one) to `useVendorCategories`. Regions/cities/districts portions of this file are owned by the locations module review — leave them with a `// TODO: locations review` and don't touch this PR.
- [ ] **C.7** `components/marketplace/MoreInfoPopup.js` — split (552 → ≤ 350) into sub-components (e.g. `<VendorContactCard/>`, `<VendorPortfolioGrid/>`, `<VendorMetaRow/>` — confirm boundaries while preserving every `StyleSheet.create` value verbatim). Replace the hardcoded `https://api.builder.io/api/v1/image/...` URL at line 84 with `vendor.image` fallback chain or a local placeholder asset. **Verify the popup still renders correctly on the existing denormalized `vendor` prop** (it must, per D5 — no `/vendors/:id` lookup is added).
- [ ] **C.8** **HARD RENAME (no alias).** Rename `useVendors` (mobile) → `useMarketplaceServices` and `marketplaceService.getVendors` → `getMarketplaceServices`. The function names lied — they hit `/services/public`, not `/vendors`. Update `screens/host/Marketplace.js:14, 50` and any other consumers found via grep. **Per the user's "no backward-compat" rule, do NOT re-export the old name as a deprecated alias.** Single hard rename; fix every call site in the same commit.
- [ ] **C.9** Delete `useVendorDetails` from `hooks/queries/useMarketplace.js:44–54` and `marketplaceService.getVendorDetails` from `services/marketplaceService.js:93`. Both have zero callers; the popup uses denormalized data per D2/D5.
- [ ] **C.10** Comment hygiene pass: the in-scope banner is the one stripped in C.4. The `vendorService.js` Phase-4 banner is out of scope (flag for the related modules).
- [ ] **C.11** **(NEW 2026-05-09 from audit.)** After C.9 deletes `marketplaceService.getVendorDetails`, also delete `ENDPOINTS.VENDORS.BASE` from `halla-mobile/config/api.js:148`. Only `CATEGORIES` survives. Final `ENDPOINTS.VENDORS` shape: `{ CATEGORIES: "/vendors/categories" }` (single key). The original §C.2 reference to `${ENDPOINTS.VENDORS.BASE}/${id}` is moot now that `/vendors/:id` is deleted.

### 7.D Cross-platform alignment (do AFTER A/B/C)
- [ ] **D.1** Verify both web and mobile call `GET /vendors/categories` with no `lang` param.
- [ ] **D.2** Verify both web and mobile read `data.data.categories` (no fallback chains).
- [ ] **D.3** Confirm `/services/public` remains the sole driver of marketplace cards on both platforms (per D5). Mobile popup hydration continues from the card's denormalized `service.vendor`.
- [ ] **D.4** Manual smoke test: open `app/[lang]/market-place` on web (no popup expected — only the `tel:` "Call Now") and `screens/host/Marketplace` on mobile (popup must still open and show vendor info). Run in both Arabic and English. Confirm categories render in the active locale, filters work, no console errors, and `/vendors` and `/vendors/:id` return 404 (or whatever your router's "no such route" response is).

---

## 8. Locale-key additions required

(Listed for the user — agent does NOT modify locale JSON without explicit approval.)

- `marketplace.errors.categoriesLoadFailed` (en: "Failed to load categories", ar: "فشل تحميل الفئات") — for the new web `Sections.js` error fallback (§B.2).
- `marketplace.vendor.placeholderLogo` (en: "Vendor logo", ar: "شعار المزود") — alt text for the placeholder used in `MoreInfoPopup` after the hardcoded image URL is removed (§C.7).

(All other strings used by the components in scope already exist in the `marketplace` namespace.)

---

## 9. Rollback plan

For each implementation item, the rollback is a `git revert` of its commit. Commits touching multiple layers (e.g. A.1 = DELETE wraps backend + web + mobile) should land as a single PR for atomic revert. No DB-shape changes in this scope (the click-counter endpoint move is API-shape only — the field already exists on the model).

---

## 10. Acceptance checklist (run after Phase 2)

- [ ] No file in module exceeds the cap (backend OK already; mobile `MoreInfoPopup.js` ≤ 350; web unchanged).
- [ ] Surviving endpoint (`GET /vendors/categories`) has Swagger that matches the wire shape; deleted routes' Swagger blocks are gone; `Vendor` schema removed from `config/swagger.js`.
- [ ] `GET /vendors` and `GET /vendors/:id` return 404 (deleted per D1/D2).
- [ ] Web + Mobile both call `GET /vendors/categories` with no `lang` param and read `data.data.categories` directly (no fallback chains).
- [ ] No fallback chains in data mapping in this module's surface area (web + mobile `Sections.js`, `marketplaceService.js`, `useFilterData.js` — categories portion).
- [ ] No `// FLOW-…` / `// PHASE-…` / `// BUG-…` comments in module's surface area (the `vendors.service.js:138` marker disappears with A.4; mobile `Phase 4 W0-AUTH` banner stripped in C.4).
- [ ] [Skipped per D7] No rate limiter expected on `/vendors/categories`.
- [ ] [Skipped per D9] No `vendors.validation.js` expected (no params remain). If added later, must use **Zod** + `validateZod` per project convention.
- [ ] `npm run lint` clean (or no new warnings introduced).
- [ ] Visual smoke test: `/market-place` (web) renders categories + cards in both locales (no popup expected); `Marketplace` screen (mobile) renders categories + cards + popup-on-call in both locales; popup still shows vendor name/phone/etc. from denormalized data.
- [ ] Mobile `ENDPOINTS.VENDORS` reduces to `{ CATEGORIES: '/vendors/categories' }` (single key, no `BASE`).
- [ ] No deprecated alias for `useVendors` / `marketplaceService.getVendors` — hard rename complete.

---

## 11. Pre-flight checks for the implementing agent (added 2026-05-09)

Before starting, the agent MUST:

1. **Confirm fact base is current.** Re-grep these claims and STOP if any has changed since 2026-05-09:
   - `useVendors`, `useVendorPublic` (web `hooks/reactQueryHooks/useVendors.js`) have ZERO callers.
   - `useVendorDetails`, `marketplaceService.getVendorDetails` (mobile) have ZERO callers.
   - Mobile popup uses denormalized `service.vendor` from `screens/host/Marketplace.js:60-78` (no `/vendors/:id` lookup).
   - `vendors.service.js` line counts and ranges match the audit-corrected numbers (file 195 lines, `_formatVendor` at 167-192, click counter at 138-141).
   - `api.config.js` vendors block is at lines 259-263.

2. **Hard-rename rule (C.8):** Do NOT add a deprecated alias for `useVendors` → `useMarketplaceServices`. Single rename + grep for every call site + fix all in one commit.

3. **Cross-plan rule:** If the services plan already split `MoreInfoPopup.js`, skip §C.7 (verify file is ≤350 and move on). If locations plan already migrated `marketplaceService.js` to apiFetch and removed location methods, the migration in §C.1 only touches the remaining methods.

4. **Acceptance after the PR:** `/vendors` and `/vendors/:id` return 404. `vendors.service.js` is ~30 lines (only `getCategories` + class wrapper). Mobile `ENDPOINTS.VENDORS` has only `CATEGORIES`. Web + mobile both call `GET /vendors/categories` with no `lang` param, read `data.data.categories`, and pick locale via `i18n.language === 'ar' ? nameAr : nameEn`.

5. **Web/mobile parity assertion:** After this PR, the surviving endpoint (`/vendors/categories`) is consumed identically on both platforms — same hook pattern (React Query `useVendorCategories`), same response read path, same locale picking, no fallback chains, no `useState`+`useEffect` server-data anti-pattern.
