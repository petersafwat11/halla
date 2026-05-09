# locations — Full-Stack Review Plan

**Module:** locations
**Generated:** 2026-05-07
**Prompt:** docs/implementation/MODULE_FULLSTACK_REVIEW_PROMPT.md
**Status:** Decisions locked 2026-05-07 · NOT IMPLEMENTED YET

---

## Locked decisions (2026-05-07)

1. **`/locations/resolve` route** — **DELETE** (Option B). No frontend consumer; in-process `services.service._resolveLocationNames` is the real entry point. Removes route + controller method + service method + web hook + `API_PATHS.locations.resolveLocationNames` key.
2. **Zod validation rollout (A.3)** — **PROCEED** unconditionally. We are in dev; no external/lenient clients to worry about. Use `validateZod` middleware from `shared/middleware/validation.js:373`. Joi is forbidden per project rule (`feedback_validation_zod`).
3. **Mobile hook path move** — **PROCEED**. `halla-mobile/hooks/useLocations.js` → `halla-mobile/hooks/queries/useLocations.js` per project convention.
4. **`useFilterData` rewrite onto React Query (C.5)** — **PROCEED**. Hook becomes pure local-state coordinator after the migration.
5. **Rate limiter (A.5)** — **REUSE existing `apiLimiter`** from `shared/middleware/rateLimiter.js:99-110` (100 req / 15 min, IP-keyed; **only skip is `/health` paths — there is NO admin-skip**, contrary to the original plan note). Already used by `guests.routes.js:84, :139` for the same public-unauthenticated-read pattern. **Do NOT create a new `publicReadLimiter`.**
6. **B.2 plans-hooks scope** — **CORRECTED 2026-05-09 after deep audit.** The original claim that `labbe/hooks/useLocations.js` "also contains plans hooks (`usePlans/useEnterprisePlans/useHostPlans/usePlanByCode/usePlanById`)" is **FACTUALLY WRONG** — verified by reading the file (lines 1-124): it contains ONLY location hooks (`useRegions, useCitiesByRegion, useDistrictsByCity, useAllLocations, useSearchLocations`). Furthermore, `useEnterprisePlans`, `usePlanByCode`, `usePlanById` do **not exist anywhere** in `labbe/` (grep confirmed zero matches). Canonical `labbe/hooks/reactQueryHooks/usePlans.js` exports only 3 hooks (`usePlans, useHostPlans, useBusinessPlans`). **Net work for B.2: delete `labbe/hooks/useLocations.js` outright** after migrating its sole consumer (`LocationSelector.js:6`) in B.1. Nothing else to do — no plans-hooks migration. **Do NOT hallucinate new plans hooks.**

---

## 0. Executive Summary

- **6** total endpoints in module (regions, cities/:regionId, districts/:cityId, all, search, resolve)
- **2** endpoints unused by any web/mobile UI (`/locations/all`, `/locations/resolve`) — keep `all` (public utility), but `resolve` has zero consumers and the same logic is duplicated inside `services.service._resolveLocationNames`
- **3** Swagger drift findings (Region/City/District schemas in `config/swagger.js` describe a Mongo doc with `_id`/`name:{en,ar}` that does not exist; the data is plain JSON with `region_id`, `name_ar`, `name_en`, etc.)
- **0** backend file-size violations
- **2** web file-size violations (`LocationSelector.js` 342, `ServiceDetailsEditForm.jsx` 357 — cap 250)
- **0** mobile file-size violations (`useFilterData.js` 130, `LocationSelector.js` 130, `marketplaceService.js` 168)
- **5** web/mobile API consumption mismatches (two web hook files; mobile splits the same endpoint between a React Query hook and an axios marketplace service; mobile uses fallback chains for response shape; web has one stray import of the legacy hook file; coverageType handling in `LocationSelector` differs between platforms)
- **6** data mapping bugs / fallback chains (mobile `LocationSelector.js`, mobile `useFilterData.js` x3, web district search using EN-only `toLowerCase`, services-side `_resolveLocationNames` accepting both `region_id` and `id`)
- **3** missing/incorrect validation/rate-limit (Zod missing on numeric path params, `searchLocations` lacks `q` length & result-cap validation, no rate limit on `/locations/all` which serves a 50k-row payload)
- **3** comment-hygiene blocks to remove (Phase 4 W0-AUTH markers in mobile `useLocations.js` and `marketplaceService.js`; redundant JSDoc re-statements in service)
- Estimated effort: **M** (no schema migrations; mostly hook-dedup, file-split, and Swagger fixes; the largest move is migrating mobile filter screens off `useFilterData`'s ad-hoc fetcher onto React Query)

---

## 1. Endpoint Inventory

| # | Method | Path | Controller | Service | Middleware chain | Swagger | Web hook | Mobile hook | Status |
|---|--------|------|------------|---------|------------------|---------|----------|-------------|--------|
| 1 | GET | `/locations/regions` | `getRegions` | `LocationsService.getRegions` | (none — public) | OK signature, response schema OK | `useRegions` (canonical + legacy) | `useRegions` + `marketplaceService.getRegions` | KEEP |
| 2 | GET | `/locations/cities/:regionId` | `getCitiesByRegion` | `LocationsService.getCitiesByRegion` | (none — public) | OK signature; missing 400 for non-numeric `regionId` | `useCitiesByRegion` (canonical + legacy) | `useCitiesByRegion` + `marketplaceService.getCities` | KEEP |
| 3 | GET | `/locations/districts/:cityId` | `getDistrictsByCity` | `LocationsService.getDistrictsByCity` | (none — public) | OK signature; missing 400 | `useDistrictsByCity` (canonical + legacy) | `useDistrictsByCity` + `marketplaceService.getDistricts` | KEEP |
| 4 | GET | `/locations/all` | `getAllLocations` | `LocationsService.getAllLocations` | (none — public) | Swagger has only `200: description`; no response schema | `useAllLocations` | — | KEEP (used by canonical hook only; no UI consumer yet — leave the hook for now) |
| 5 | GET | `/locations/search?q=` | `searchLocations` | `LocationsService.searchLocations` | (none — public) | Swagger documents `q` query param but no response schema; no `400` on missing `q` | `useSearchLocations` (canonical + legacy) | — | KEEP (UI not wired yet but hook exists) |
| 6 | POST | `/locations/resolve` | `resolveLocationNames` | `LocationsService.resolveLocationNames` | (none — public) | Body schema is inline; response schema absent | `useResolveLocationNames` (canonical only; **no consumer**) | — | KEEP (consider deprecating after we confirm services-side `_resolveLocationNames` is the real entry point) |

**Notes**
- All 6 routes are intentionally public (no auth). That is correct for public location lookups, but `searchLocations` and `getAllLocations` need at least a basic rate-limit because they are unauthenticated and return large payloads.
- `validateObjectId` does NOT apply here — the IDs are numeric (`region_id` / `city_id` / `district_id`) sourced from `shared/data/cities/*.json`, not Mongo ObjectIds. Replace with a numeric Zod check.

**Legend:** KEEP, DELETE-DUPLICATE-OF-#N, RENAME, MERGE-WITH-#N

---

## 2. Backend Findings

### 2.1 File-size violations
None. `index.js` 15, `controller` 64, `routes` 180, `service` 131. All under cap.

### 2.2 Swagger drift (`labbe-backend-/src/config/swagger.js`)

The shared `Region`, `City`, `District` component schemas describe a Mongo document shape that does not exist in this codebase. The actual data is loaded from JSON files and has these shapes:

```jsonc
// regions.json
{ "region_id": 1, "capital_city_id": 3, "code": "RD", "name_ar": "...", "name_en": "Riyadh", "population": 6777146 }
// cities.json
{ "city_id": 1, "region_id": 7, "name_ar": "تبوك", "name_en": "Tabuk" }
// districts.json
{ "district_id": 10100003001, "city_id": 3, "region_id": 1, "name_ar": "...", "name_en": "..." }
```

But Swagger declares (`labbe-backend-/src/config/swagger.js:1063-1130` — Region 1063-1084, City 1086-1107, District 1109-1130; **corrected from original plan's wrong line range 644-712, which is actually inside `PlanCreate` schema**):

```yaml
Region:    { _id: string, name: { en, ar }, code }
City:      { _id: string, name: { en, ar }, region: string }
District:  { _id: string, name: { en, ar }, city: string }
```

This is wrong on every field name and on the type of the IDs (numbers, not strings/ObjectIds). Fix:

- Replace `Region` / `City` / `District` schemas with the JSON shape (`region_id: integer`, `name_ar: string`, `name_en: string`, etc.).
- Add `LocationsAllResponse` schema for `/locations/all` (regions[] with nested `cities[].districts[]`).
- Add `LocationsSearchResponse` schema for `/locations/search` (`{ regions, cities, districts }`).
- Add `LocationResolveResponse` schema for `/locations/resolve` (`{ region: {id,nameEn,nameAr}|null, city, district }`).

### 2.3 Missing middleware / safeguards
- `GET /locations/all` (`locations.routes.js:126`) returns the full 50k-row nested document. Add a basic rate limiter (`shared/middleware/rateLimiter.publicReadLimiter` or equivalent — confirm/create) so an unauthenticated client cannot hammer the endpoint. The in-memory cache helps server-side cost but not bandwidth. Also flag that the canonical hook on web has `staleTime: 1h`, so client-side burst is unlikely; rate-limit primarily protects against scripted clients.
- `GET /locations/search` lacks `q` length validation. Empty / single-char `q` is a no-op or returns everything that contains a single common letter — a request returning 26k+ districts. Enforce `q.length >= 2` and cap each result list (e.g. `slice(0, 50)`) inside the service.
- `POST /locations/resolve` should be `GET /locations/resolve?regionId=…&cityId=…&districtId=…`. It is a pure read with no side effects. POST violates A4.9 (HTTP method discipline). Also, no consumer exists today, so renaming is safe — but defer the route change until §7.A.6 confirms no internal caller.

### 2.4 Duplicate / dead endpoints
- `POST /locations/resolve` has zero frontend consumers. The corresponding canonical web hook `useResolveLocationNames` exists but is not imported anywhere. The same logic is duplicated server-side inside `services.service._resolveLocationNames` (`labbe-backend-/src/modules/services/services.service.js:336`). Decide: either (a) wire the hook to a real UI need, or (b) delete the route + the hook and keep only the in-process helper. The plan defers this decision to the user.

### 2.5 Service / controller violations
- `locations.service.js:104` — `resolveLocationNames` accepts `regionId`/`cityId`/`districtId` but does not validate the inputs are integers or that the `cityId` actually belongs to the given `regionId`. **Note:** the route is being deleted per locked decision #1 (A.6), so this validation gap is moot — the in-process helper `services.service._resolveLocationNames` is the real entry point and validates via `services.validation.js`.
- `locations.service.js:71-90` — `searchLocations`: AR branch uses `name_ar.includes(query)` (raw, case-sensitive in the original case) while EN uses `toLowerCase()`. Make both branches consistent: lowercase the search term once and match against `toLowerCase()`-ed candidates (Arabic `toLowerCase` is a no-op so still safe). Also cap each list at 50 entries.
- `locations.service.js:51-64` — `getAllLocations` builds a per-instance memoized cache. That's fine but the cache is keyed only by "this instance", so a second worker rebuilds it on first hit. Acceptable; flag for awareness only.
- `locations.controller.js:51-55` — `searchLocations` controller silently substitutes `''` when `q` is missing (`req.query.q || ''`). Once Zod is wired this branch becomes dead.

### 2.6 Validation gaps
- No `locations.validation.js` file exists. Create one with **Zod** schemas (Joi forbidden per project rule):
  - `regionIdParam` — `z.object({ regionId: z.coerce.number().int().positive() })`
  - `cityIdParam` — `z.object({ cityId: z.coerce.number().int().positive() })`
  - `searchQuery` — `z.object({ q: z.string().trim().min(2).max(100) })`
  - ~~`resolveBody`~~ — N/A; route deleted per locked decision #1.
- Wire each schema into the route with `validateZod(schema, source)` from `shared/middleware/validation.js:373`.

### 2.7 Comment hygiene
None to remove inside `labbe-backend-/src/modules/locations/`. Service docstrings describe "Business logic for Saudi Arabia locations" — fine. (Mobile files have phase markers; covered in §4.7.)

---

## 3. Frontend Web Findings

### 3.1 Component tree per consumer

**Consumer 1 — Vendor signup (host platform):**
- `ui/auth/signup/vendor/stepTwo/LocationSelector.js` (**342 lines** — VIOLATION cap=250)
  - Imports `@/hooks/useLocations` ← **legacy duplicate hook file**
  - Reads `data?.data?.regions / cities / districts`

**Consumer 2 — Marketplace (public):**
- `app/[lang]/market-place/page.js` (202 lines, OK)
  - Imports `@/hooks/reactQueryHooks/useLocations` ← canonical
  - Drills `regions`, `cities`, `districts` arrays into `Filters` and `FiltersPopup`
- `app/[lang]/market-place/_components/filters/Filters.js` (not yet inspected; assume OK pending)
- `app/[lang]/market-place/_components/filtersPopup/FiltersPopup.js` (not yet inspected; assume OK pending)

**Consumer 3 — Vendor settings:**
- `app/[lang]/vendor-dashboard/settings/_components/ServiceDetailsSection/ServiceDetailsEditForm.jsx` (**357 lines** — VIOLATION cap=250)
  - Imports `@/hooks/reactQueryHooks/useLocations` ← canonical

### 3.2 File-size violations
- `ui/auth/signup/vendor/stepTwo/LocationSelector.js` — 342 lines. Proposed split:
  - Extract `<DistrictsMultiSelect />` (≈110 lines covering the dropdown + search + checkbox list). 
  - Extract a `useLocationFormSelection()` hook (covers the four `setValue` blocks for region/city/district handlers + the two `useEffect`s that mirror IDs to nameAr/nameEn).
  - **Style preservation:** keep `locationSelector.module.css` in place; the extracted child component imports the same module. Do NOT rename any class.
- `app/[lang]/vendor-dashboard/settings/_components/ServiceDetailsSection/ServiceDetailsEditForm.jsx` — 357 lines. Proposed split:
  - Extract `<EditFormHeader />` (the close button + title block, ≈30 lines).
  - Extract `<DocumentUploadsRow />` (`UploadFileStandalone` x2 row, ≈40 lines).
  - Extract `<LocationFieldsRow />` (region + city + districts dropdowns, ≈110 lines).
  - **Style preservation:** keep `serviceDetailsSection.module.css`; the new components import the same module and use existing class names verbatim.

### 3.3 Hardcoded text / data / paths
None inside the location-touching code itself — all strings already use `t()` with English/Arabic fallbacks. Acceptable.

(`ServiceDetailsEditForm.jsx:323` has a single `style={{ color: "#9ca3af", cursor: "not-allowed" }}` — minor B11 violation; move into the CSS module as a `disabledLabel` class. Not blocking.)

### 3.4 Data mapping bugs / fallback chains
- `ServiceDetailsEditForm.jsx:78` — district search filter uses `district.name_en || district.name_ar` and lower-cases only the EN side, so an Arabic-typing user matches nothing if the district has both names (it falls into the EN branch). Mirror the `LocationSelector.js:288-294` pattern: try `name_ar.includes(searchQuery)` AND `name_en.toLowerCase().includes(searchLower)` independently.
- `ServiceDetailsEditForm.jsx:235, :260, :312` — labels use `region.name_en || region.name_ar` (EN-first), which displays in English even for Arabic users. Use `i18n.language === "ar" ? name_ar : name_en` consistently with `LocationSelector.js:147`.

### 3.5 Duplicate hooks / direct apiRequest calls
- **Two duplicate hook files** in web (B0.2 violation):
  - `labbe/hooks/useLocations.js` (legacy; **CONTAINS ONLY 5 LOCATION HOOKS** — the original plan's claim about mixed plans hooks was wrong, verified 2026-05-09)
  - `labbe/hooks/reactQueryHooks/useLocations.js` (canonical; has the extra `useResolveLocationNames` hook)
  - `LocationSelector.js:6` imports from the legacy file. Migrate it to the canonical file (B.1).
  - After migration, simply **delete** `labbe/hooks/useLocations.js`. No plans-hook splitting needed.

- The canonical hook differs slightly from the legacy in `useSearchLocations` query construction:
  - Legacy: `path: ${API_PATHS.locations.searchLocations}?q=${encodeURIComponent(query)}` (manual URL).
  - Canonical: `path: API_PATHS.locations.searchLocations, params: { q: query }` (axios-managed).
  - Pick canonical (`params:`) — it's the project convention and handles encoding automatically.

### 3.6 State / loading / error gaps
- `LocationSelector.js` has loading text in the placeholder option but no `isError` branch. If `useRegions()` errors, the dropdown silently stays empty. Add an inline error message using `regionsError` from the hook (the hook already returns `error`).
- `ServiceDetailsEditForm.jsx` has the same gap; same fix.
- Marketplace `page.js` already uses `SimpleLoading` for services but not for region/city/district loaders inside `<Filters />`/`<FiltersPopup />` — verify in §3.1's pending inspection. Likely fine since the lists fall back to `[]`.

### 3.7 Comment hygiene
- `hooks/useLocations.js:9-11` — `============================================ LOCATIONS QUERIES …` banner comments. Restate-of-the-code; remove on the merge into the canonical file.

---

## 4. Frontend Mobile Findings

### 4.1 Screen → component tree

**Consumer A — Vendor signup:**
- `components/auth/vendor-signup/VendorStep2ServiceData.js` (not over cap)
  - Renders `components/commen/LocationSelector.js` (130 lines, OK)
    - Uses `hooks/useLocations.js` (54 lines, OK)

**Consumer B — Marketplace filters:**
- `components/marketplace/FilterPopup.js` (201 lines, OK)
  - Calls `hooks/useFilterData.js` (130 lines, OK)
    - Calls `services/marketplaceService.js` `.getRegions/getCities/getDistricts`
- `components/marketplace/_components/FilterInputs.js` (91 lines)

### 4.2 File-size violations
None.

### 4.3 Service / hook violations

- **Two parallel implementations of the same three endpoints exist on mobile** (D2/C5 violation):
  1. `hooks/useLocations.js` — uses `fetchWithTimeout` directly (a 30 s wrapper around raw `fetch`), bypassing `apiFetch`. Used by `components/commen/LocationSelector.js`.
  2. `services/marketplaceService.js:109-151` — uses a separate `axios.create({ baseURL, timeout })` instance and calls the same paths. Used via `hooks/useFilterData.js` by `components/marketplace/FilterPopup.js`.
  Pick one, delete the other. The canonical pattern per C1 is `apiFetch` + a `_request` helper. Recommended:
  - Move the three location calls into a new `services/locationsService.js` that wraps `apiFetch` (auth header is a no-op on these public routes, but the timeout + token-refresh hooks are still desirable for the day a private location-admin endpoint is added).
  - Add `ENDPOINTS.LOCATIONS.ALL`, `ENDPOINTS.LOCATIONS.SEARCH`, `ENDPOINTS.LOCATIONS.RESOLVE` to `config/api.js` (currently missing).
  - Rewrite `hooks/queries/useLocations.js` (move the file from `hooks/useLocations.js` → `hooks/queries/useLocations.js` to match the project convention) on top of the new service, and delete the marketplaceService location helpers.
  - Migrate `hooks/useFilterData.js` to consume `useRegions/useCitiesByRegion/useDistrictsByCity` directly (see §4.5 below). After that migration the `useFilterData` shrinks to a small URL/state coordinator and the manual `setLoading*` flags disappear.

- `config/api.js:175-187` — `REGIONS` and `LOCATIONS` are duplicate sub-trees pointing at the same paths. **Order matters:** mobile `hooks/useLocations.js:20, 29, 39` currently uses `ENDPOINTS.REGIONS.*`. Before deleting `REGIONS`, migrate the hook to `ENDPOINTS.LOCATIONS.*` (covered by C.3). Then delete `REGIONS`; keep `LOCATIONS` and add `ALL`, `SEARCH`. **No `RESOLVE` — route deleted per A.6.**

- `hooks/useFilterData.js:44-101` — does manual `useState` + `useEffect` + `try/catch/console.error` for server data (regions/cities/districts/serviceTypes). VIOLATION C2/C4/C6 (no React Query, fallback chains, console-only error handling). Replace with React Query hooks; the hook then becomes pure URL/local-state.

### 4.4 Hardcoded text / data / paths
- `services/marketplaceService.js:111, :127, :144` — paths are hardcoded (`/locations/regions`, `/locations/cities/${regionId}`, `/locations/districts/${cityId}`). Replace with `ENDPOINTS.LOCATIONS.*` (after the dedup above). Same file: `${this.baseURL}/vendors/categories`, `${this.baseURL}/services/public`, `${this.baseURL}/vendors/${vendorId}` are out of scope but flagged for the relevant module reviews.

### 4.5 Web/Mobile divergence (data mapping & response shape)
- `components/commen/LocationSelector.js:20, :27, :34` — fallback chain `regionsData?.data?.regions || regionsData?.regions || []`. Backend returns `data.regions` (under the `sendSuccess` envelope). Replace with `regionsData?.data?.regions || []` only.
- `hooks/useFilterData.js:48, :78, :93` — same fallback chain `response.data?.regions || response.data || []`. Same fix.
- Coverage logic divergence:
  - Web `LocationSelector.js:80-141` writes `coverageType: "region" | "city" | "districts"` and updates it inside synchronous handlers.
  - Mobile `LocationSelector.js:67-80` runs the same logic from a `useEffect` keyed on `selectedDistrictIds.length`. Functionally equivalent, but the mobile effect doesn't reset `coverageType` when the user goes back to "region only". Verify with a quick UAT and harmonize on the synchronous handler approach.

### 4.6 Loading / error / empty states
- `useFilterData.js` has `loadingCities`/`loadingDistricts` flags but no `error` flag and no retry. After the React Query migration, surface `cityError`/`districtError` and render an inline error inside `FilterPopup.js`'s field (mirroring the existing `ActivityIndicator` placement at line 86-88).
- `FilterPopup.js:103-112` — district section is hidden entirely when `districts.length === 0`. That collapses both "city has no districts" and "districts haven't loaded yet" into the same UI. Add an explicit `loadingDistricts` branch (currently only used inside `<DistrictCheckboxes loading={loadingDistricts} />` which is only mounted when the section is visible — i.e. never during the loading window).

### 4.7 Comment hygiene
- `hooks/useLocations.js:5-9` — `Phase 4 W0-AUTH: routed through fetchWithTimeout so locations lookups time out at 30 s instead of hanging on a flaky link. No auth needed (public endpoints), so we don't go through apiFetch.` → remove the phase marker; if a reason needs preserving, replace with one short line: `// Public endpoints — no auth header needed; bounded timeout via fetchWithTimeout.` (kept only because the choice not to use apiFetch is non-obvious).
- `services/marketplaceService.js:9-12` — `Phase 4 W0-AUTH: dedicated axios instance with the same 30 s default timeout as apiFetch. Marketplace calls are largely public reads so we don't add auth-refresh — but bounded latency is still important.` → after the dedup migration, the file collapses or loses these locations entries; remove the marker either way.

---

## 5. Cross-Platform API Consumption Diff

| Endpoint | Aspect | Web | Mobile | Backend truth | Action |
|----------|--------|-----|--------|---------------|--------|
| GET /locations/regions | response field | `data?.data?.regions` ✓ | `data?.data?.regions \|\| data?.regions` (LocationSelector) and `response.data?.regions \|\| response.data` (useFilterData) | `data.regions` (under `sendSuccess`) | Fix mobile — drop fallback chain |
| GET /locations/cities/:regionId | response field | `data?.data?.cities` ✓ | `data?.data?.cities \|\| data?.cities` (LocationSelector); `response.data?.cities \|\| response.data` (useFilterData) | `data.cities` | Fix mobile |
| GET /locations/districts/:cityId | response field | `data?.data?.districts` ✓ | `data?.data?.districts \|\| data?.districts` (LocationSelector); `response.data?.districts \|\| response.data` (useFilterData) | `data.districts` | Fix mobile |
| GET /locations/regions | hook source of truth | TWO files (`hooks/useLocations.js` and `hooks/reactQueryHooks/useLocations.js`) | TWO sources (`hooks/useLocations.js` + `services/marketplaceService.js`) | One canonical hook per endpoint | Dedup both platforms |
| GET /locations/all | consumer | hook exists, no UI consumer | not represented in `ENDPOINTS` at all | Should exist in both | Add `ENDPOINTS.LOCATIONS.ALL` to mobile or document as web-only |
| GET /locations/search | consumer | hook exists, no UI consumer | not represented | Should exist in both once the UI uses it | Same |
| POST /locations/resolve | consumer | hook exists, no UI consumer | absent | One method; verify final method (we recommend GET) | Decide before exposing on mobile |
| /locations/* — language label | display logic | `isArabic ? name_ar : name_en` (LocationSelector); `name_en \|\| name_ar` (ServiceDetailsEditForm — bug) | `r.name_ar \|\| r.name_en` (LocationSelector); `r.name_ar` (FilterPopup, hard) | UX: pick by `i18n.language` | Standardize on `i18n.language === 'ar' ? name_ar : name_en` everywhere |
| `coverageType` derivation | timing | synchronous handler (web) | `useEffect`-driven (mobile) | n/a (frontend-only) | Harmonize on synchronous handler |

---

## 6. Suspected Bugs Worth Verifying

(Need to be confirmed by running the app — flagged so the user can spot-check.)

1. **Stale `coverageType` on mobile** — when a user picks a region, then a city, then districts, then deselects all districts, mobile's `useEffect([selectedDistrictIds.length])` fires only when the length changes; when the list is already empty (e.g. user switches city → resets districtIds to `[]`), the effect does NOT re-run because the length stayed at 0. Result: `coverageType` may remain `"districts"` after a city change. Verify with the vendor signup happy path on mobile.

2. **Search returns inconsistent shape across endpoints** — `searchLocations` returns `{ regions, cities, districts }` arrays directly under `data`, whereas the per-resource endpoints return them under named keys with the same names (`{ regions }`, `{ cities }`, `{ districts }`). Same shape, fine. But the frontend hooks read `data?.data?.regions` etc; the canonical web `useSearchLocations` similarly reads `data?.data?.regions / cities / districts` — confirm the wire shape matches once a UI consumer is added.

3. **`_resolveLocationNames` accepts `r.id`** — `services.service.js:343` falls back to `r.id` if `region_id` is missing. The JSON data only ever has `region_id` / `city_id` / `district_id`. The `r.id` branch is dead code (or worse, a left-over that suggests another schema once existed). Likely safe to delete; verify there is no Mongoose model overriding the JSON file with an `id` virtual.

4. **`getAllLocations` in-memory cache + multi-process** — when the API runs under PM2 / multiple Node workers, each worker rebuilds the cache on first hit. Not a bug per se but worth confirming the desired cache strategy (e.g. memoize the JSON.parse at module-load time inside `shared/data/cities/index.js` and let the service read from there).

5. **No upper bound on `searchLocations`** — a single-character `q` (e.g. "ا") would return thousands of districts whose `name_ar` contains it. After Zod enforces `min(2)` this is mitigated; still recommend `slice(0, 50)` per array.

6. **Mobile `useFilterData` re-fetches on every popup open** — because it lives in component state (not React Query), it does not benefit from the project's `staleTime` policy. Verify network tab: opening/closing the filter popup should hit the API once per session, not once per open.

---

## 7. Implementation Plan (Ordered)

Apply changes in this order. Each item ends with a checkbox the agent will tick during Phase 2.

### Cross-plan sequencing (READ FIRST — added 2026-05-09 after audit)

`halla-mobile/services/marketplaceService.js` is touched by THREE plans simultaneously (locations, vendors, services). Sequencing rules:

1. **Locations §C.4 deletes** `getRegions / getCities / getDistricts` from `marketplaceService.js`. After §C.4 only 4 methods remain (`getServiceTypes`, `getVendors`, `getVendorDetails`, `getImageUrl`).
2. **Vendors §C.1/C.2** then migrates the remaining 4 methods to `apiFetch`.
3. **Phase-marker stripping** is idempotent — whichever plan runs first removes the banner; later plans treat it as already done.

When running locations §C.4: do NOT touch lines 79, 96 (vendors-owned paths). Only delete the locations methods.

If the implementing agent finds `marketplaceService.js` already migrated to `apiFetch` (i.e. vendors plan ran first), the §C.4 deletion still applies — just delete the location methods regardless of which networking pattern they use.

### 7.A Backend
- [ ] **A.1** Replace `Region` / `City` / `District` Swagger schemas in `labbe-backend-/src/config/swagger.js:1063-1130` (Region 1063-1084, City 1086-1107, District 1109-1130) with the actual JSON shape (`region_id` int, `name_ar`, `name_en`, etc.). Add `LocationsAllResponse`, `LocationsSearchResponse` schemas. **Do NOT add `LocationResolveResponse` — `/locations/resolve` is being deleted in A.6.**
- [ ] **A.2** Update Swagger blocks in `locations.routes.js` to reference the new schemas in their `responses.200.content`.
- [ ] **A.3** Create `labbe-backend-/src/modules/locations/locations.validation.js` with **Zod** schemas `regionIdParam`, `cityIdParam`, `searchQuery` (per §2.6 — no `resolveSchema`, route deleted in A.6). Wire each via `validateZod(schema, source)` from `shared/middleware/validation.js:373`. **Joi is forbidden.**
- [ ] **A.4** Service: in `searchLocations`, lowercase the search term once and use it for both branches; cap each output array at 50 entries. Remove the `query`-vs-`searchTerm` divergence at `locations.service.js:72-90`.
- [ ] **A.5** Apply existing `apiLimiter` from `shared/middleware/rateLimiter.js` to `GET /locations/all` and `GET /locations/search` (mirror the usage in `guests.routes.js:104`). **Do NOT create a new limiter.**
- [ ] **A.6** **LOCKED: Option B — delete `/locations/resolve`.** Remove the route from `locations.routes.js` (line 178), the `resolveLocationNames` controller method, the service method, and the inline Swagger block. Keep `services.service._resolveLocationNames` (in-process helper) untouched.
- [ ] **A.6b** **(NEW — added 2026-05-09 from audit.)** In `labbe-backend-/src/modules/services/services.service.js` lines `343, 352, 362`, delete the dead `r.id` / `c.id` / `d.id` fallbacks in `_resolveLocationNames`. The JSON data only has `region_id` / `city_id` / `district_id`; the `r.id` branch is dead code (project rule: no dead code). Replace `const region = regions.find(r => (r.region_id || r.id) === Number(regionId))` with `regions.find(r => r.region_id === Number(regionId))` and the analogous changes for cities/districts.
- [ ] **A.7** Comment hygiene pass: no markers in module itself; remove the redundant doc-banner-style JSDoc in `locations.service.js` if any survive after A.4.

### 7.B Web
- [ ] **B.1** Migrate `ui/auth/signup/vendor/stepTwo/LocationSelector.js:6` to import from `@/hooks/reactQueryHooks/useLocations` (canonical).
- [ ] **B.2** **(REWRITTEN 2026-05-09 after deep audit.)** Delete `labbe/hooks/useLocations.js` outright. Audit verified the only consumer is `LocationSelector.js:6` (handled in B.1) and the legacy file contains ONLY location hooks (5 of them) — no plans hooks. The original plan's claim about plans hooks (`useEnterprisePlans/usePlanByCode/usePlanById`) was FACTUALLY WRONG; those names do not exist anywhere in `labbe/`. Canonical `labbe/hooks/reactQueryHooks/usePlans.js` already has the 3 plans hooks that DO exist (`usePlans/useHostPlans/useBusinessPlans`); **leave usePlans.js untouched**. Acceptance: after B.2, `find labbe/hooks -name useLocations.js` returns only `labbe/hooks/reactQueryHooks/useLocations.js` (the canonical one).
- [ ] **B.3** Split `LocationSelector.js` (342 → ≤250) by extracting `<DistrictsMultiSelect/>` and a `useLocationFormSelection` hook. **Preserve `locationSelector.module.css` unchanged.**
- [ ] **B.4** Split `ServiceDetailsEditForm.jsx` (357 → ≤250) by extracting `<EditFormHeader/>`, `<DocumentUploadsRow/>`, `<LocationFieldsRow/>`. **Preserve `serviceDetailsSection.module.css` unchanged.**
- [ ] **B.5** Fix `ServiceDetailsEditForm.jsx:78, :235, :260, :312` — use `i18n.language === 'ar' ? name_ar : name_en` for labels and run district search against both `name_ar` and `name_en` independently. Add `useTranslation` `i18n` import if not already present.
- [ ] **B.6** Add `error` branch rendering on `LocationSelector.js` and `ServiceDetailsEditForm.jsx` for the three location queries (small inline error + retry).
- [ ] **B.7** **LOCKED (Option B):** Delete `useResolveLocationNames` from `hooks/reactQueryHooks/useLocations.js` and the `resolveLocationNames` key from `services/new-backend/api.config.js`.
- [ ] **B.8** Move the inline `style={{ color: "#9ca3af", cursor: "not-allowed" }}` in `ServiceDetailsEditForm.jsx:323` into the CSS module as `disabledLabel`.

### 7.C Mobile
- [ ] **C.1** **(Order: do BEFORE C.3 deletes the legacy hook.)** Add `ENDPOINTS.LOCATIONS.ALL = "/locations/all"` and `ENDPOINTS.LOCATIONS.SEARCH = "/locations/search"` to `halla-mobile/config/api.js:175-187`. **NO `RESOLVE`** — route deleted in A.6. After C.3 migrates the legacy hook off `ENDPOINTS.REGIONS.*`, delete the entire `ENDPOINTS.REGIONS` sub-tree. Final `LOCATIONS` shape: `{ REGIONS: "/locations/regions", CITIES_BY_REGION: (id) => ..., DISTRICTS_BY_CITY: (id) => ..., ALL: "/locations/all", SEARCH: "/locations/search" }`.
- [ ] **C.2** Create `halla-mobile/services/locationsService.js` with `_request`-style helpers for all 6 endpoints, all going through `apiFetch`.
- [ ] **C.3** Move `halla-mobile/hooks/useLocations.js` to `halla-mobile/hooks/queries/useLocations.js`, rewrite the three query hooks on top of `locationsService`, and add `useAllLocations` / `useSearchLocations`. **Also update the sole consumer** `halla-mobile/components/commen/LocationSelector.js:6` to import from the new path. **Switch all `ENDPOINTS.REGIONS.*` references to `ENDPOINTS.LOCATIONS.*`** (done in this step, before C.1 finalizes by deleting `REGIONS`). (No `useResolveLocationNames` — A.6 deletes the endpoint; mobile never had this hook so nothing to delete on mobile.)
- [ ] **C.4** Delete `marketplaceService.getRegions/getCities/getDistricts` from `halla-mobile/services/marketplaceService.js`.
- [ ] **C.5** Refactor `halla-mobile/hooks/useFilterData.js` to consume the React Query hooks directly. The result is a small hook that owns only `localFilters` state + the four `updateFilter`/`toggleDistrict`/`resetFilters` callbacks; the `regions/cities/districts/loading*` flags come from the queries.
- [ ] **C.6** Fix mobile `components/commen/LocationSelector.js` fallback chains (lines 20, 27, 34) to read `data?.data?.regions / cities / districts` only.
- [ ] **C.7** Fix mobile `coverageType` reset logic (move to synchronous handlers per the web pattern; remove the `useEffect([selectedDistrictIds.length])` race).
- [ ] **C.8** Replace each `console.error("Error fetching X:", error)` in `useFilterData.js` with React Query's error surface + a translated retry control inside `FilterPopup.js`.
- [ ] **C.9** Comment hygiene. **Audit-corrected 2026-05-09:** `halla-mobile/hooks/useLocations.js:5-9` does NOT contain a literal `Phase 4 W0-AUTH:` marker — the comment reads "Routed through fetchWithTimeout so locations lookups time out at 30 s instead of hanging on a flaky link" (no phase prefix). Trim it to one line if the intent is non-obvious; otherwise drop entirely. `halla-mobile/services/marketplaceService.js:9-11` DOES contain the literal `Phase 4 W0-AUTH:` marker — strip it. (Note: locations §C.4 deletes the location-related methods from this file before any phase-marker stripping happens; coordinate with vendors §C.4 and services §C.7 — whichever runs first wins.)

### 7.D Cross-platform alignment (do AFTER A/B/C)
- [ ] **D.1** Re-grep `data?.data?.regions`, `data?.data?.cities`, `data?.data?.districts` across both repos — every match should be the only path read; no `||` chains remain in `locations` consumers.
- [ ] **D.2** Confirm both web and mobile call the three primary endpoints with **numeric** IDs (no quoted-string IDs leak into the URL). Run a manual smoke check using the Riyadh region (`region_id=1`).
- [ ] **D.3** Confirm there is exactly one canonical hook file per platform: `labbe/hooks/reactQueryHooks/useLocations.js` and `halla-mobile/hooks/queries/useLocations.js`. No duplicates remain.
- [ ] **D.4** Manual visual smoke: vendor signup (web + mobile), vendor settings (web), marketplace filters (web + mobile). Each region/city/district dropdown populates and the selected coverageType maps correctly.

---

## 8. Locale-key additions required

(Listed for the user — agent does NOT modify locale JSON without explicit approval.)

- `common.errors.locationLoadFailed` (en: "Couldn't load locations", ar: "تعذّر تحميل المواقع") — for the new error branches in B.6 / C.8.
- `common.actions.retry` (en: "Retry", ar: "إعادة المحاولة") — used by the same error branches. Verify whether this key already exists in `common` namespace; if so, reuse.

No other new keys are needed; existing `signupForm.vendor.serviceData.location.*`, `serviceDetails.*`, `marketplace.filters.*` keys cover all current strings.

---

## 9. Rollback plan

For each implementation item, the rollback is a `git revert` of its commit. Items that touch the public API contract:

- **A.1, A.2** (Swagger schemas) — purely doc-level; revert is safe and has no runtime effect.
- **A.3** (Zod validation) — adds 400-class rejections that did not exist before. If a previously-accepted client was relying on lenient parsing, validation will reject it. Rollback by reverting the route-level `validateZod(...)` wiring; the schema file itself can remain.
- **A.6** (resolve route deletion or method change) — breaking change for any external client. Document in CHANGELOG; rollback is to re-mount the original POST handler.
- **B.2** (delete `hooks/useLocations.js`) — breaks any straggler import. Mitigation: do a pre-deletion repo-wide grep and migrate any unexpected consumers in the same commit.
- **C.1** (drop `ENDPOINTS.REGIONS`) — same risk; grep first.

No DB shape changes in this scope.

---

## 10. Acceptance checklist (run after Phase 2)

- [ ] No file in module exceeds the cap (web cap 250, mobile cap 350, backend caps per A8).
- [ ] All 6 endpoints have current Swagger with correct schemas referenced from `components.schemas`.
- [ ] No duplicate endpoints remain; the `resolve` decision (delete vs. convert to GET) is committed.
- [ ] Web + Mobile call the same paths with the same shapes for every endpoint.
- [ ] Exactly one canonical location hook file per platform.
- [ ] No fallback chains in `data?.x \|\| data?.y` form in any locations consumer.
- [ ] No `// FLOW-…` / `// PHASE-…` / `// W0-…` / `// BUG-…` comments in module's surface area.
- [ ] `npm run lint` clean (or no new warnings introduced) on both `labbe` and `halla-mobile`.
- [ ] Visual smoke: vendor signup, vendor settings, marketplace filters look identical before/after on web and mobile.

---

## 11. Pre-flight checks for the implementing agent (added 2026-05-09)

Before starting, the agent MUST:

1. **Confirm fact base is current.** Re-grep these claims and STOP if any has changed since 2026-05-09:
   - `LocationSelector.js:6` is the only consumer of `@/hooks/useLocations` on web.
   - `useResolveLocationNames` has zero callers in `labbe/`.
   - Mobile `hooks/useLocations.js` uses `ENDPOINTS.REGIONS.*` (not `LOCATIONS.*`) at lines 20, 29, 39.
   - `services.service.js:343, 352, 362` still contain the `r.id` / `c.id` / `d.id` fallbacks in `_resolveLocationNames`.

2. **Sequence rule:** Do NOT delete `ENDPOINTS.REGIONS` (mobile `config/api.js`) until after C.3 has migrated the legacy hook. The order is: C.1 (add new keys) → C.3 (rewrite hook + update consumer) → C.1 finalize (delete REGIONS).

3. **Cross-plan rule:** When editing `halla-mobile/services/marketplaceService.js` for §C.4, only delete the location methods (`getRegions`, `getCities`, `getDistricts`). Leave `getServiceTypes`, `getVendors`, `getVendorDetails`, `getImageUrl` untouched — they are owned by the vendors plan.

4. **Acceptance after the PR:** `find labbe/hooks -name useLocations.js` returns ONLY `labbe/hooks/reactQueryHooks/useLocations.js`. `find halla-mobile/hooks -name useLocations.js` returns ONLY `halla-mobile/hooks/queries/useLocations.js`. No `@/hooks/useLocations` imports anywhere on web. No `ENDPOINTS.REGIONS.*` references anywhere on mobile. `/locations/resolve` returns 404. `services.service._resolveLocationNames` no longer uses `r.id` / `c.id` / `d.id` fallbacks.

5. **Web/mobile parity assertion:** After this PR, both platforms must (a) use a canonical React Query hook for locations, (b) read `data.data.regions / cities / districts` with no fallback chain, (c) send the same query params (no `lang` param anywhere), (d) use the same `i18n.language === 'ar' ? name_ar : name_en` locale-picking logic.

## Implementation log

- **2026-05-09** — Phase 2 COMPLETE. All items A.1–A.6b, B.1–B.8, C.1–C.9, D.1–D.4 implemented.
  - Backend: Swagger schemas fixed, Zod validation wired, rate limiter applied, `/locations/resolve` deleted, search capped at 50, dead `r.id`/`c.id`/`d.id` fallbacks removed.
  - Web: Legacy hook deleted, canonical hook cleaned (no `useResolveLocationNames`), `LocationSelector.js` split (134 lines), `ServiceDetailsEditForm.jsx` split (130 lines), locale-picking harmonized, error branches added, inline style moved to CSS module.
  - Mobile: `hooks/useLocations.js` → `hooks/queries/useLocations.js`, `locationsService.js` created, `marketplaceService` location methods deleted, `useFilterData` on React Query, fallback chains removed, `coverageType` moved to sync handler, `ENDPOINTS.REGIONS` deleted, `ENDPOINTS.LOCATIONS.ALL/SEARCH` added.
  - Verification: No duplicate hooks, no fallback chains, no `ENDPOINTS.REGIONS` refs, no `/locations/resolve` route, all files under cap.
