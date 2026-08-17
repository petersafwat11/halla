# 26 — Marketplace Browse

## One-paragraph description
Hosts (unauthenticated or authenticated) browse the vendor services marketplace: list active services with filters (category, location, price range, rating, search), click a service card to see the vendor's profile details in a modal/popup, and discover vendors to contact. The marketplace is the primary discovery mechanism for hosts seeking vendors. Services are sourced from vendors with `vendorStatus: "approved"` who have active service listings. Both web and mobile have the same filter set applied on the backend. There are no favorites, wishlist, inquiry, or booking features — the marketplace is browse-only.
## Scope tags
- marketplace listing, vendor browse, service discovery
- filtering (category, location, price, rating, search) — all filters applied on backend
- vendor detail popup/modal when service card is clicked
- service card display (image, name, price, location, tags, rating)
- search functionality
- shared marketplace (no whitelabel isolation — all vendors visible to all users)

## Roles involved
- **Guest / Unauthenticated**: view marketplace (all endpoints are public, no auth required)
- **Host**: view marketplace (same public endpoints; no favorites or inquiry features exist)
- **Vendor**: can view the marketplace as a guest
- **Admin / Super Admin**: manage which vendors appear (via vendor approval/status); no marketplace-specific admin view

## Entry points (cite file:line)
- **Primary marketplace endpoint**: `labbe-backend-/src/modules/services/services.routes.js:70` GET `/services/public` (public, no auth; query params: `search`, `category`, `vendorId`, `regionId`, `cityId`, `districtIds`, `minPrice`, `maxPrice`, `minRating`, `page`, `limit`)
- **Get vendor categories**: `labbe-backend-/src/modules/vendors/vendors.routes.js:34` GET `/vendors/categories` (public; used to populate category filter dropdown)
- **Get vendor by ID (for popup)**: `labbe-backend-/src/modules/vendors/vendors.routes.js:104` GET `/vendors/{id}` (public, no auth; called when vendor popup opens to get full vendor profile)
- **Web marketplace page**: `labbe/app/[lang]/market-place/page.js` (Next.js client component; URL-driven filter state, pagination)
- **Mobile marketplace screen**: `halla-mobile/screens/Marketplace.js` (marketplace list with filter popup and vendor popup)
- **Mobile API service**: `halla-mobile/services/marketplaceService.js` (`getVendors()` calls `/services/public`; `getVendorDetails()` calls `/vendors/:id`)

## Exit / terminal states
- **Service list viewed**: user browses paginated list of active services with applied filters
- **Vendor popup viewed**: user clicks a service card → modal/popup shows vendor's brand name, description, contact details (email, phone, website), social links
- **Session ends**: user leaves the page (no persistent state saved — no favorites, no inquiry)

## Touched modules (file paths by repo)
### labbe-backend-
- `src/modules/services/services.routes.js:70` — GET `/services/public` (primary marketplace endpoint)
- `src/modules/services/services.controller.js` — `getPublicServices` handler; passes all query params to service layer
- `src/modules/services/services.service.js` — `getPublicServices()`: filters on `status: "active"`, `isPublic: true`, category, location (regionId/cityId/districtIds), price range, rating, search; populates `vendorId` with brand name, logo, social links, description
- `src/modules/vendors/vendors.routes.js:34` — GET `/vendors/categories` (category dropdown data)
- `src/modules/vendors/vendors.routes.js:104` — GET `/vendors/{id}` (full vendor profile for popup)
- `src/modules/vendors/vendors.service.js` — `getVendorById()`: returns formatted vendor including rating, portfolioImages, socialLinks
- `models/ServiceModel.js` — service schema: name, nameAr, description, type (category enum), image, price, currency, tags, status, isPublic, serviceLocation, rating (stub — always 0), viewCount, inquiryCount (stub)
- `models/UserModel.js` — `vendorDataSchema`: brandName, serviceDescription, serviceCategories, serviceLocation, socialLinks, rating (set by admin), numberOfClicks (view counter — not yet incremented)

### halla-mobile
- `screens/Marketplace.js` — filter state, search, `useVendors` hook, `MoreInfoPopup` (vendor detail popup on card press)
- `services/marketplaceService.js` — `getVendors()` maps all filter params to `/services/public` query string; `getVendorDetails()` calls `/vendors/:id`
- `components/marketplace/VendorCards.js` — FlatList of service cards (no infinite scroll wired)
- `components/marketplace/MoreInfoPopup.js` — vendor detail popup shown when a service card is pressed
- `components/marketplace/FilterPopup.js` — filter modal with region/city/district/price/rating pickers
- `hooks/queries/useMarketplace.js` — `useVendors()` single-page query (needs upgrade to `useInfiniteQuery`)

### labbe (web)
- `app/[lang]/market-place/page.js` — URL-driven filter state, `usePublicVendorServices` hook, pagination, service grid; vendor popup NOT wired
- `app/[lang]/market-place/_components/card/Card.js` — service card with `onCallClick` prop (button present but handler not passed from page)
- `app/[lang]/market-place/_components/filters/Filters.js` — inline filter bar (region, city, district, price range, rating, search)
- `app/[lang]/market-place/_components/filtersPopup/FiltersPopup.js` — mobile filter drawer
- `app/[lang]/market-place/_components/pagination/Pagination.js` — traditional page pagination

## Dependencies on other flows
- **Vendor Profile & Services** (Flow 25): services listed in the marketplace are created and managed by vendors; the marketplace surfaces services, and clicking a service card shows the vendor's profile data
- **Vendor Onboarding** (Flow 24): intended gate — only approved vendors' services should appear. However `getPublicServices()` does NOT filter by `vendorStatus: "approved"`. A service from a suspended/rejected vendor will appear if its own `status: "active"` and `isPublic: true`. See Known Divergences.
- No inquiry, booking, favorites, or wishlist dependency — these features do not exist

## Known divergences (web ↔ mobile, frontend ↔ backend)
- **Primary endpoint**: Both web and mobile call `GET /services/public` (not `GET /vendors`). The marketplace shows service cards, not vendor cards. Clicking a card shows vendor profile data from the populated `vendorId` field.
- **Filtering**: All filters (category, regionId, cityId, districtIds, minPrice, maxPrice, minRating, search) are applied on the backend in `getPublicServices()`. Web (`market-place/page.js`) correctly passes all filters as query params. Mobile (`Marketplace.js`) correctly builds query params including all filter fields. Filter logic is on backend only — no client-side filtering.
- **Pagination**: Backend supports page/limit. Web uses traditional pagination (`Pagination` component). Mobile uses a `FlatList` with pull-to-refresh but **no infinite scroll** — `onEndReached` is not wired; a single page of results is fetched.
- **Vendor popup**: Mobile has `MoreInfoPopup` shown when a service card is clicked (`handleVendorCallPress`). Web `Card.js` has an `onCallClick` prop but `market-place/page.js` does not pass an `onClick` handler — the vendor popup does not open on web.
- **Rating display**: `ServiceModel.rating` is always 0 (never incremented). The service's `vendor.rating` (set by admin via `PATCH /admin/vendors/:id/rating`) is NOT included in the `vendorPopulateFields` string — it is not returned in marketplace responses. Rating shown in marketplace cards is always 0.
- **Search**: MongoDB regex search on `name` and `description`. No full-text index or Elasticsearch.
- **Vendor approval gate missing from services**: `getPublicServices()` filters only on `service.status: "active"` and `service.isPublic: true`. It does NOT check that the vendor is approved (`vendorStatus: "approved"`) or active (`user.status: "active"`). A service belonging to a suspended or rejected vendor will still appear in the marketplace if its own flags are set to active/public. The `GET /vendors` endpoint correctly gates on `vendorStatus: "approved"`, but `GET /services/public` does not join that check.
- **Whitelabel isolation**: No isolation. All approved vendors are in one shared marketplace regardless of `whitelabelId`. Only admin/super_admin manage vendor status.

## Open questions

**Q1: Service ratings: Are service ratings separate from vendor ratings?**

A: [NEEDS PETER RE-CONFIRMATION]

**Current behavior:** Peter's intent is that the rating displayed on marketplace cards comes from the vendor account rating (set only by admin via `PATCH /admin/vendors/:id/rating`, stored in `User.profile.vendorData.rating`). However this is not implemented. `ServiceModel.rating` defaults to 0 and is never incremented. The `vendorPopulateFields` string in `getPublicServices()` does not include `profile.vendorData.rating`, so the vendor's admin-set rating is not returned in the marketplace API response. All service cards in the marketplace show rating = 0.

**Assessment:** BUG

**Why:** The intent (show vendor account rating on service cards) exists but the wire-up is missing. Two things are needed: (1) add `profile.vendorData.rating` to `vendorPopulateFields` in `services.service.js:49`; (2) in `_formatService()`, return `vendor.rating` from the populated vendor data instead of `service.rating`.

**Recommended change:** In `services.service.js`:
- `vendorPopulateFields`: add `profile.vendorData.rating profile.vendorData.numberOfRatings`
- `_formatService()`: change `rating: service.rating || 0` to `rating: service.vendorId?.profile?.vendorData?.rating || 0` and expose `reviewsCount` from `profile.vendorData.numberOfRatings`.

Source: `labbe-backend-/src/modules/services/services.service.js:49`, `labbe-backend-/src/modules/services/services.service.js:247-249`

---

**Q2: Filtering by price range: Does backend support price filtering?**

A: [KEPT FROM PETER — VERIFIED]

Backend filtering is confirmed. `getPublicServices()` in `services.service.js:42-46` handles `minPrice` and `maxPrice` as `query.price.$gte` / `query.price.$lte`. The same function handles `regionId`, `cityId`, `districtIds`, `category`, `minRating`, and `search` — all server-side. Web `market-place/page.js` passes all filters as query params via `usePublicVendorServices`. Mobile `marketplaceService.getVendors()` appends all params via `URLSearchParams`. No client-side filtering — all filtering is on the backend.

Source: `labbe-backend-/src/modules/services/services.service.js:21-58`, `halla-mobile/services/marketplaceService.js:49-76`, `labbe/app/[lang]/market-place/page.js:104-115`

---

**Q3: Location-based search: How does it work?**

A: [KEPT FROM PETER — CLARIFIED]

Location filtering uses the region/city/district hierarchy stored during vendor onboarding. `getPublicServices()` filters by `serviceLocation.regionId`, `serviceLocation.cityId`, and `serviceLocation.districtIds.$in`. Coverage is determined by `coverageType` set on the service: a service with `coverageType: "region"` covers all cities in the region; `"city"` covers one city; `"districts"` covers specific neighbourhoods.

Both web and mobile send `regionId`, `cityId`, and `districtIds` (comma-separated) as query params. No geo-distance or coordinate-based filtering — purely hierarchical ID matching.

Source: `labbe-backend-/src/modules/services/services.service.js:36-41`, `labbe-backend-/models/ServiceModel.js:73-113`

---

**Q4: Favorites / Wishlist: Is this feature planned?**

A: [KEPT FROM PETER]

No. Feature does not exist and is not planned. No Favorites model, no saved preferences, no routes. Removed from scope.

---

**Q5: Vendor detail popup: Done on mobile, needs adding to web?**

A: [NEEDS PETER RE-CONFIRMATION]

**Current behavior:** Mobile shows `MoreInfoPopup` (via `handleVendorCallPress`) when a service card "call" button is pressed. The popup receives `selectedVendor` which includes `companyName`, `email`, `phone`, `website`, `description`, `rating`, `location`. Web `Card.js` has an `onCallClick` prop and a visible "اتصل الان" (Call Now) button, but `market-place/page.js` does not pass an `onClick`/`onCallClick` handler to `ServiceCard` — the button is inert.

**Assessment:** BUG

**Why:** Peter confirmed the popup is done on mobile but not web, and web needs it added. The web `ServiceCard` already has the button UI; it just needs the click handler wired and a popup component added.

**Recommended change:** In `market-place/page.js`: (1) add `selectedService` state; (2) pass `onCallClick={() => setSelectedService(service)}` to each `ServiceCard`; (3) add a `VendorDetailModal` component (matching the mobile `MoreInfoPopup`) that shows when `selectedService != null`, displaying brand name, description, email, phone, website, and social links from `service.vendor`.

Source: `labbe/app/[lang]/market-place/page.js:263-282`, `labbe/app/[lang]/market-place/_components/card/Card.js:82-98`, `halla-mobile/screens/Marketplace.js:101-108,157-162`

---

**Q6: Mobile vs web filter parity?**

A: [KEPT FROM PETER — VERIFIED]

Both platforms have the same filter set: category (service type), regionId, cityId, districtIds, minPrice, maxPrice, minRating, search. All filters are sent to the backend. Web uses URL search params with debounced search. Mobile uses component state with a `FilterPopup`. Parity is achieved for filters. The remaining gap is the vendor detail popup (Q5) and infinite scroll (Q9).

Source: `labbe/app/[lang]/market-place/page.js:36-46,104-115`, `halla-mobile/screens/Marketplace.js:25-40,36-43`

---

**Q7: Whitelabel marketplace isolation?**

A: [KEPT FROM PETER]

No isolation. One shared marketplace. All vendors with `vendorStatus: "approved"` appear regardless of their `whitelabelId`. Only admin and super_admin manage vendor status. Whitelabel admins have no marketplace-level controls.

Source: `labbe-backend-/src/modules/services/services.service.js:25-28`

---

**Q8: Trending / Featured vendors or services?**

A: [PETER DECISION]

**The choice:** Implement a featured/trending flag now vs. defer to later

**Recommendation:** Defer. No code exists for this feature. Add a `isFeatured: Boolean` field to `ServiceModel` and `UserModel.vendorData` when the feature is scoped. For now, the default sort is `createdAt: -1` (newest first).

**Why:** Premature implementation risks building the wrong sorting/curation UI. Peter confirmed this is a future feature.

**Trade-offs:** Without featuring, all services are equally ranked by creation date. Vendors cannot pay or apply to be featured. This is acceptable for the current launch scope.

Source: `labbe-backend-/src/modules/vendors/vendors.service.js:94-98`

---

**Q9: Search performance: Pagination, lazy loading, infinite scroll?**

A: [PETER DECISION — ENHANCED WITH REASONING]

**The choice:** Web traditional pagination (already implemented) vs. mobile infinite scroll (partially implemented)

**Recommendation:** Keep web traditional pagination. Add infinite scroll to mobile.

**Why:** Web marketplace (`market-place/page.js`) already has a working `Pagination` component with `page` synced to URL params, 12 items per page. This is correct for web. Mobile `VendorCards.js` uses a `FlatList` — the right primitive for infinite scroll — but `onEndReached` is not wired, and `useVendors` has no pagination logic. A single page (default 20 items) is fetched. For a marketplace that could have hundreds of services, this is a gap.

**Trade-offs:** Infinite scroll requires converting `useVendors` to `useInfiniteQuery` and adding `fetchNextPage` to `onEndReached`. This is a well-understood React Query pattern. Web pagination is already correct and does not need changing.

**[IMPLEMENTED in this session]**

- `halla-mobile/hooks/queries/useMarketplace.js` — `useVendors` converted to `useInfiniteQuery`. `queryFn` now receives `{ pageParam }` (default 1), passes `page` + `limit: 20` to `getVendors`. `getNextPageParam` reads `pagination.page` and `pagination.pages` from the last page response.
- `halla-mobile/screens/Marketplace.js` — destructures `infiniteData`, `fetchNextPage`, `hasNextPage`, `isFetchingNextPage` from the hook. `vendors` memo flattens all pages via `flatMap`. `VendorCards` receives `onEndReached` (guarded: `hasNextPage && !isFetchingNextPage → fetchNextPage()`) and `isFetchingNextPage`.
- `halla-mobile/components/marketplace/VendorCards.js` — `FlatList` now has `onEndReached`, `onEndReachedThreshold={0.3}`, and `ListFooterComponent` that renders a small `ActivityIndicator` while fetching the next page.

Source: `halla-mobile/hooks/queries/useMarketplace.js` (updated), `halla-mobile/screens/Marketplace.js` (updated), `halla-mobile/components/marketplace/VendorCards.js` (updated)

---

**Q10: View tracking: Should vendor profile views be tracked?**

A: [NEEDS PETER RE-CONFIRMATION]

**Current behavior:** `UserModel.profile.vendorData.numberOfClicks` field exists (default 0) and is surfaced in `dashboard.service.js` analytics. However, no code increments `numberOfClicks` when a user clicks a service card to view the vendor popup. The field is seeded in test data (`scripts/seedTestUsers.js:102`) but never updated in the live API.

**Assessment:** BUG

**Why:** Peter explicitly wants to track "how many users clicked on the vendor services and showed his profile." The field exists in the model but the increment is missing.

**Recommended change:** Add a `POST /vendors/:id/track-view` endpoint (or embed it in `GET /vendors/:id`) that atomically increments `profile.vendorData.numberOfClicks` using `User.updateOne({ _id: id }, { $inc: { 'profile.vendorData.numberOfClicks': 1 } })`. Call this from mobile `Marketplace.js` inside `handleVendorCallPress` and from web when the vendor popup opens. Use a debounce or session flag to avoid double-counting on repeated opens within a session.

Source: `labbe-backend-/models/UserModel.js:111`, `labbe-backend-/src/modules/dashboard/dashboard.service.js:275`

## Notes from answer pass

- Marketplace shows **services**, not vendors. `GET /services/public` is the primary endpoint. Clicking a service card reveals vendor profile data from the populated `vendorId` field. The `GET /vendors` endpoint is used only for the categories endpoint, not for the marketplace listing.
- Favorites, wishlist, inquiry, and booking features do not exist and are not planned. All references removed from scope.
- Whitelabel isolation does not apply to the marketplace. All approved vendors share one marketplace; only admin/super_admin control vendor visibility.
- **BUG (Q1)**: Vendor account rating set by admin is not shown in marketplace. `vendorPopulateFields` must include `profile.vendorData.rating` and `_formatService()` must use it instead of `service.rating`.
- **BUG (Q5)**: Web vendor detail popup is missing. `market-place/page.js` does not pass an `onCallClick` handler to `ServiceCard`. Mobile popup (`MoreInfoPopup`) is correctly wired.
- **BUG (Q10)**: `numberOfClicks` field exists on `UserModel.vendorData` but is never incremented. No endpoint tracks vendor profile views. A `POST /vendors/:id/track-view` (or inline `$inc` in `GET /vendors/:id`) is needed; both platforms must call it when the vendor popup opens.
- **BUG (vendor approval gate)**: `GET /services/public` does not filter by `vendorStatus: "approved"` or `user.status: "active"`. Services from suspended/rejected vendors appear in the marketplace. Fix by adding a `$lookup` or a populate + filter step on the vendor's status, or by storing a denormalized `vendorApproved: Boolean` on each service that is flipped when admin changes vendor status.
- **GAP (Q9)**: Mobile infinite scroll is not implemented. `VendorCards.js` `FlatList` has no `onEndReached`. `useVendors` hook fetches a single page. Convert to `useInfiniteQuery` and wire `onEndReached`.
- Search backend uses MongoDB regex — no full-text index. A `$text` index on `name`/`description` would improve search at scale, but this is a performance optimization to address after launch.

---

## State machine

```
Marketplace browse (stateless session — no persistent entity):
  (page load)      → GET /services/public?filters → service list rendered
  (filter change)  → GET /services/public?filters → service list re-rendered
  (card pressed)   → GET /vendors/:id             → vendor popup shown
  (popup closed)   → (return to list; no state saved)
  (page exit)      → session ends; no favorites, no history persisted
```
No persistent entity is created during browse. The only side-effect is the `numberOfClicks` increment that should fire on `GET /vendors/:id` but currently does not.

---

## Data handoffs

| Step | Producer | Consumer | Payload | Validation? |
|------|----------|----------|---------|-------------|
| Apply filters | Client | GET /services/public | query: `{ search, category, vendorId, regionId, cityId, districtIds, minPrice, maxPrice, minRating, page, limit }` | All optional; backend applies only present params |
| Service list response | services.service.getPublicServices() | Client | Array of formatted service objects with populated vendorId fields | No vendorStatus check (BUG — see F02) |
| Vendor popup open | Client | GET /vendors/:id | path param: vendorId | No auth required; public endpoint |
| Vendor detail response | vendors.service.getVendorById() | Client | `{ brandName, description, email, phone, website, socialLinks, rating, portfolioImages }` | vendorId must be valid ObjectId |
| View tracking (intended) | Client | POST /vendors/:id/track-view | path param: vendorId | **Missing** — no endpoint exists; `numberOfClicks` never incremented |

---

## Role variations

| Role | CAN | CANNOT |
|------|-----|--------|
| Unauthenticated guest | Browse all active services, view vendor popup | Favorite, inquire, book |
| HOST | Same as unauthenticated guest | Favorite, inquire, book (features do not exist) |
| VENDOR | Browse as guest | Manage others' services; no self-promotion controls |
| ADMIN / SUPER_ADMIN | Control vendor visibility (approve/suspend vendor) | No marketplace-specific admin view; changes take effect by altering vendorStatus |
| WHITELABEL_ADMIN | Browse (no isolation — shared marketplace) | Cannot restrict marketplace to own tenant's vendors |

---

## Web ↔ mobile parity

| Feature | Web | Mobile | Gap? |
|---------|-----|--------|------|
| Service list with filters | Confirmed present (`market-place/page.js` with full filter set) | Confirmed present (`Marketplace.js` with `FilterPopup`) | No |
| Category filter dropdown | Confirmed present (`GET /vendors/categories` wired) | Confirmed present (FilterPopup uses categories) | No |
| Region/city/district filter | Confirmed present (URL params → `usePublicVendorServices`) | Confirmed present (FilterPopup state → `getVendors`) | No |
| Price range filter | Confirmed present | Confirmed present | No |
| Rating filter | Confirmed present | Confirmed present | No |
| Search | Confirmed present (URL param, debounced) | Confirmed present (text input with debounce) | No |
| Vendor detail popup on card click | **Missing** — `Card.js` has `onCallClick` prop but `page.js` does not pass a handler | Confirmed present (`MoreInfoPopup` wired via `handleVendorCallPress`) | **Yes — web gap** |
| Pagination / infinite scroll | Confirmed present (traditional `Pagination` component) | **Missing** — `FlatList` has no `onEndReached`; single page fetched | **Yes — mobile gap** |
| Rating displayed on card | Confirmed present (UI renders `service.rating`) but always 0 | Confirmed present (UI renders rating) but always 0 | Both broken — backend bug (F01) |

---

## Edge cases & failure modes

- **Suspended vendor services visible**: `getPublicServices()` does not check `vendorStatus`. A vendor with `status: 'suspended'` whose service has `isPublic: true` and `status: 'active'` will appear in marketplace results.
- **Rating always 0**: `ServiceModel.rating` defaults to 0 and is never incremented. `vendorPopulateFields` does not include the admin-set vendor rating. All cards show 0 stars regardless of the vendor's actual rating.
- **Web vendor popup inert**: `Card.js` renders an "اتصل الان" button but `market-place/page.js` never passes `onCallClick`. The button does nothing on web.
- **Single-page mobile results**: `useVendors` fetches one page (default 20). With hundreds of vendor services, a host sees only 20 and has no way to load more.
- **No full-text search index**: MongoDB regex search scans all documents. At scale (1000+ services), response time degrades without a `$text` index on `name`/`description`.
- **numberOfClicks never incremented**: The field exists in `UserModel.vendorData` and surfaces in admin analytics but is always 0. Admin dashboard vendor click metrics are meaningless.

---

## Findings

### FLOW-26-F01 — Vendor rating never shown in marketplace; vendorPopulateFields missing rating
- **Severity**: High
- **Type**: BUG
- **Location**: `labbe-backend-/src/modules/services/services.service.js:49` (vendorPopulateFields string), line 247-249 (_formatService rating field)
- **Description**: Vendor account rating (`profile.vendorData.rating`) is set by admin via `PATCH /admin/vendors/:id/rating`. `vendorPopulateFields` does not include this field, so it is absent from marketplace API responses. `_formatService()` returns `service.rating` (always 0). All marketplace cards display zero stars.
- **Why it matters**: Rating is the primary trust signal for hosts choosing vendors. Zero-ratings across the board make the marketplace useless for comparison shopping.
- **Recommended change**: Add `profile.vendorData.rating profile.vendorData.numberOfRatings` to `vendorPopulateFields` at `services.service.js:49`. In `_formatService()`, replace `rating: service.rating || 0` with `rating: service.vendorId?.profile?.vendorData?.rating || 0`.

### FLOW-26-F02 — getPublicServices() does not filter by vendor approval status
- **Severity**: High
- **Type**: BUG
- **Location**: `labbe-backend-/src/modules/services/services.service.js:25-28`
- **Description**: `getPublicServices()` filters only on `service.status: "active"` and `service.isPublic: true`. It does not check that the owning vendor has `vendorStatus: "approved"` or `user.status: "active"`. A suspended or rejected vendor's services remain visible in the marketplace as long as their own service flags are active.
- **Why it matters**: Suspended vendors (e.g., for fraud or quality violations) continue to receive host inquiries, undermining trust and admin controls.
- **Recommended change**: Add a populate-and-filter step: after populating `vendorId`, filter results where `vendorId.profile.vendorData.vendorStatus !== 'approved'` or `vendorId.status !== 'active'`. Alternatively, store a denormalized `vendorApproved: Boolean` on each `ServiceModel` and flip it when admin changes vendor status.

### FLOW-26-F03 — Web vendor detail popup not wired; onCallClick handler never passed
- **Severity**: Medium
- **Type**: BUG
- **Location**: `labbe/app/[lang]/market-place/page.js:263-282` (no onCallClick passed), `labbe/app/[lang]/market-place/_components/card/Card.js:82-98`
- **Description**: `Card.js` accepts an `onCallClick` prop and renders a visible "اتصل الان" button. `market-place/page.js` never passes this prop to any `ServiceCard`. The button is inert — pressing it does nothing. Mobile correctly wires `handleVendorCallPress` → `MoreInfoPopup`.
- **Why it matters**: Hosts on web cannot view vendor contact details after browsing. The core discovery action (contact the vendor) is broken on web.
- **Recommended change**: In `market-place/page.js`, add `selectedService` state. Pass `onCallClick={() => setSelectedService(service)}` to each card. Add a `VendorDetailModal` component (mirroring `MoreInfoPopup`) that opens when `selectedService != null`.

### FLOW-26-F04 — Mobile marketplace has no infinite scroll; single page fetched regardless of result count
- **Severity**: Medium
- **Type**: MISSING (parity gap)
- **Location**: `halla-mobile/hooks/queries/useMarketplace.js` (useVendors — no pagination), `halla-mobile/components/marketplace/VendorCards.js` (FlatList no onEndReached)
- **Description**: `useVendors` fetches a single page (default 20 items). `VendorCards.js` `FlatList` has no `onEndReached` handler. With a marketplace of 50+ services, a host sees only the first 20 with no way to load more.
- **Why it matters**: Vendors beyond the first page are invisible to mobile hosts. This directly hurts vendor discovery and revenue.
- **Recommended change**: Convert `useVendors` to `useInfiniteQuery`. Wire `onEndReached` on `FlatList` to call `fetchNextPage` when `hasNextPage` is true. Add a footer `ActivityIndicator` during `isFetchingNextPage`.

### FLOW-26-F05 — numberOfClicks never incremented; vendor view analytics always zero
- **Severity**: Low
- **Type**: BUG
- **Location**: `labbe-backend-/models/UserModel.js:111` (field exists), no endpoint increments it
- **Description**: `profile.vendorData.numberOfClicks` field exists and surfaces in admin analytics dashboard. No code path calls `$inc` on this field when a host views the vendor popup. The field is seeded in test data but never updated in production.
- **Why it matters**: Vendor analytics showing click counts are permanently zero. Admin and vendors cannot assess marketplace performance.
- **Recommended change**: Embed `User.updateOne({ _id: vendorId }, { $inc: { 'profile.vendorData.numberOfClicks': 1 } })` in `vendors.service.getVendorById()`. Both web (when popup is wired, FLOW-26-F03) and mobile call this endpoint when the vendor popup opens.

---

## Cross-flow notes

- **Flow 24 (Vendor Onboarding)**: Only approved vendors should appear in marketplace. FLOW-26-F02 (no approval gate in getPublicServices) is a direct downstream gap from the onboarding approval flow.
- **Flow 25 (Vendor Profile & Services)**: Services listed in the marketplace are created and updated via Flow 25. Rating set via admin vendor management (Flow 24/25) should surface here but does not until FLOW-26-F01 is fixed.
- **Flow 22 (Event Stats)**: `numberOfClicks` surfaces in the admin vendor analytics panel covered by Flow 22. Until FLOW-26-F05 is fixed, all vendor click metrics in admin stats are zero.
