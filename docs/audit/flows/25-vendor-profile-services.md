# 25 — Vendor Profile & Services

## One-paragraph description
After a vendor is approved (Flow 24) and logs in, they can update their vendor profile (brand name, service description, portfolio images, service location, social links, business details, price packages, service categories) and manage service listings (CRUD: create, read, update, delete services). Services are the products/offerings that appear in the marketplace for hosts to browse and book. Vendors can view their service stats (views, inquiries, bookings). Both web and mobile vendors should have parity for profile and service management, but mobile may lack some advanced features (bulk operations, detailed analytics).

## Scope tags
- vendor profile management, brand info, portfolio
- service listing CRUD, service metadata
- service categories, pricing tiers
- service visibility/marketplace publishing
- portfolio images, social links
- service statistics/analytics (views, inquiries)
- whitelabel isolation for services

## Roles involved
- **Vendor**: create/read/update/delete own services, update own profile, view service stats
- **Admin / Super Admin**: view all vendor profiles and services (read-only or with edit capability); may enforce service publishing rules
- **Host**: cannot edit vendor profiles or services; can only view in marketplace (Flow 26)
- **Whitelabel Admin**: manage vendors and services within whitelabel tenant only

## Entry points (cite file:line)
- **Get vendor profile**: `labbe-backend-/src/modules/vendors/vendors.routes.js:77` GET `/vendors` (public, approved vendors only)
- **Get vendor by ID**: `labbe-backend-/src/modules/vendors/vendors.routes.js:104` GET `/vendors/{id}` (public detail)
- **Update vendor profile (top-level fields)**: `labbe-backend-/src/modules/users/users.routes.js:89` PATCH `/users/profile` (auth required; handles name, email, businessLogo via `uploadUserProfile` middleware)
- **Update vendor profile section (vendorData)**: `labbe-backend-/src/modules/users/users.routes.js:153` PATCH `/users/profile/:section` (auth required; section=`vendorData` handles brandName, serviceDescription, serviceLocation, socialLinks, portfolioImages, etc.)
- **Create service**: `labbe-backend-/src/modules/services/services.routes.js:190` POST `/services` (vendor-protected route)
- **Get my services (vendor)**: `labbe-backend-/src/modules/services/services.routes.js:105` GET `/services` (vendor auth required)
- **Get service by ID**: `labbe-backend-/src/modules/services/services.routes.js:153` GET `/services/{id}` (vendor auth required)
- **Update service**: `labbe-backend-/src/modules/services/services.routes.js:227` PATCH `/services/{id}`
- **Toggle service visibility**: `labbe-backend-/src/modules/services/services.routes.js:247` PATCH `/services/{id}/toggle-status`
- **Delete service**: `labbe-backend-/src/modules/services/services.routes.js:267` DELETE `/services/{id}`
- **Get service stats**: `labbe-backend-/src/modules/services/services.routes.js:121` GET `/services/stats` (vendor auth required)
- **Get public services**: `labbe-backend-/src/modules/services/services.routes.js:70` GET `/services/public` (public, no auth, filterable by category, vendorId, regionId, cityId, districtIds, minPrice, maxPrice, minRating, search)
- **Mobile vendor services**: `halla-mobile/screens/VendorServicesScreen.js` (CRUD services — create, edit, delete, toggle status)

## Exit / terminal states
- **Service published**: visible in marketplace `/services/public` endpoint, appears in host browse
- **Service unpublished/draft**: exists but not returned by public endpoint (vendor-only view)
- **Service deleted**: physically removed from DB
- **Profile completed**: `profile.vendorData.profileCompleted` = true; unlocks vendor dashboard

## Touched modules (file paths by repo)
### labbe-backend-
- `src/modules/vendors/vendors.routes.js` — GET `/vendors` (public list), GET `/vendors/{id}` (public detail), implied PUT/PATCH for profile updates
- `src/modules/vendors/vendors.controller.js` (inferred) — handlers for vendor endpoints
- `src/modules/vendors/vendors.service.js` (inferred) — vendor profile business logic
- `src/modules/services/services.routes.js` — GET `/services/public` (public list), GET/POST/PATCH/DELETE `/services` (vendor CRUD), GET `/services/stats`
- `src/modules/services/services.controller.js` (inferred) — service CRUD handlers
- `src/modules/services/services.service.js` (inferred) — service business logic
- `models/ServiceModel.js` — schema: name, description, vendor (FK to User), category, pricing, images, location, availability, stats (views, inquiries, bookings)
- `models/UserModel.js` — User schema with profile.vendorData (brandName, serviceDescription, portfolioImages, serviceLocation, socialLinks, rating, etc.)
- `src/shared/utils/s3Upload.js` — `uploadServiceImage()` middleware for portfolio images
- `src/shared/constants` — service categories, statuses

### halla-mobile
- `screens/VendorAccountSetupScreen.js` — vendor profile completion form after signup/approval
- `screens/VendorServicesScreen.js` — service list, create/edit/delete service forms
- `services/vendorService.js` — API calls for vendor profile and service endpoints
- `components/marketplace/` (inferred) — service card, detail components for marketplace browse

### labbe (web)
- `app/[lang]/vendor-dashboard/profile/` (inferred) — vendor profile edit page
- `app/[lang]/vendor-dashboard/services/` (inferred) — vendor service CRUD pages
- Service images upload components

## Dependencies on other flows
- **Vendor Onboarding** (Flow 24): vendor must be approved before accessing profile/services screens
- **Marketplace Browse** (Flow 26): services published here are discovered by hosts in marketplace
- **Notifications** (Flow 27): vendor inquiry notifications may link to service

## Known divergences (web ↔ mobile, frontend ↔ backend)
- **Service images**: Backend uses S3 upload (`uploadServiceImage()` = `uploadImage.single("image")`, 5MB cap); mobile uses `AddServicePopup` with image picker; web uses standard form. Both platforms use the same `POST /services` and `PATCH /services/:id` endpoints.
- **Service categories**: Backend enforces a 11-value enum on `ServiceModel.type`; both platforms should populate the category picker from `GET /vendors/categories` — not hardcode the values.
- **Portfolio images**: Stored as `[String]` in `UserModel.profile.vendorData.portfolioImages`. Backend caps at 10 images (`uploadVendorFiles` maxCount: 10). Web manages this via `/vendor-dashboard/settings`; mobile has no portfolio management screen.
- **Service stats**: Stats endpoint exists (`GET /services/stats`); mobile `VendorServicesScreen.js` does not display stats. Web may show stats in vendor dashboard home page.
- **Bulk service operations**: No bulk service CRUD on either platform — single CRUD only.
- **Service visibility**: Services have `status: "active"|"disabled"` and `isPublic: Boolean`. Toggle via `PATCH /services/:id/toggle-status`. A newly created service is immediately active and public.
- **Location**: Both vendor profile and service use region/city/district hierarchy (`coverageType: "region"|"city"|"districts"`). No coordinates. Names auto-resolved on save from the locations service.
- **Profile management gap**: Web vendor settings covers portfolio images, social links, service location, documents. Mobile only manages per-service CRUD; profile-level settings are absent on mobile.

## Open questions

**Q1: Service categories: Is category a free-text field or enum from backend constants?**

A: [KEPT FROM PETER — CLARIFIED]

Category is a backend-enforced enum. `ServiceModel.js` defines 11 exact string values in the `type` field's enum. The `GET /vendors/categories` endpoint returns these same values with bilingual labels. Frontends must use a dropdown populated from this endpoint — free-text input would fail schema validation.

Enum values: `eventPlanning`, `mediaProduction`, `giftsAndGiveaways`, `foodAndBeverages`, `beautyAndFashion`, `logisticsAndDelivery`, `corporateServices`, `supportServices`, `technicalServices`, `soundLightingEntertainment`, `hallsAndVenues`.

Source: `labbe-backend-/models/ServiceModel.js:30-42`, `labbe-backend-/src/modules/vendors/vendors.service.js:146-158`

---

**Q2: Portfolio image storage: Are images stored in S3, uploaded via URL, or embedded? Limits on count/size?**

A: [PETER DECISION — ENHANCED WITH REASONING]

**The choice:** Keep current S3 implementation with a tighter cap vs. increase limits vs. add multi-image per service

**Recommendation:** Keep S3, enforce the existing 10-image / 10MB cap on portfolio images, and enforce the existing 5MB / single-image cap per service listing. Add client-side UI enforcement to show remaining slots.

**Why:** The S3 infrastructure is already in place and working. `uploadVendorFiles` already enforces `portfolioImages: maxCount: 10` with a 10MB general filter. `uploadServiceImage` uses `uploadImage.single("image")` capped at 5MB per image. Presigned URLs are available via `getSignedUrlForKey()` for private access if needed. Industry benchmarks (Thumbtack, Fiverr) use 10–20 images at ≤10MB each; the current limits are within range.

**Trade-offs:** Raising the per-file limit to match industry max (20MB) would accommodate higher-resolution event photography but increases storage cost and upload time on mobile networks. Leave at 5MB for service images (fast loads in marketplace cards); leave at 10MB for portfolio images (viewed at full size in vendor profile).

Source: `labbe-backend-/src/shared/utils/s3Upload.js:482-486,507-515`

---

**Q3: Service visibility: Do services have explicit "draft" vs "published" status?**

A: [KEPT FROM PETER — CLARIFIED]

**Current behavior:** Services have a two-field gate: `status` (enum `["active","disabled"]`, default `"active"`) and `isPublic` (boolean, default `true`). The public endpoint at `GET /services/public` filters on `{ status: "active", isPublic: { $ne: false } }`. Vendors toggle visibility via `PATCH /services/:id/toggle-status` which flips `status` between `active` and `disabled`. There is no separate "draft" concept — a newly created service is immediately active and public.

**Assessment:** CORRECT

**Why:** The toggle endpoint exists and is wired correctly. Both the mobile `VendorServicesScreen.js` (`handleToggleService`) and the web vendor dashboard support the toggle. Filtering in `getPublicServices` correctly gates on both fields.

**Recommended change:** None for visibility. However, consider defaulting `isPublic: false` on service creation so vendors explicitly opt in to marketplace visibility — avoids half-finished services appearing in the marketplace.

Source: `labbe-backend-/models/ServiceModel.js:63-71`, `labbe-backend-/src/modules/services/services.service.js:25`, `labbe-backend-/src/modules/services/services.routes.js:247`

---

**Q4: Pricing structure: Can vendors list multiple price tiers per service?**

A: [KEPT FROM PETER]

No multiple tiers per service. `ServiceModel.price` is a single `Number` field with `currency` defaulting to `"SAR"`. Peter's design intent is correct: vendors create multiple separate service listings, each with its own price. The model does not support tiered pricing (basic/pro/premium SKUs) within a single service record.

Source: `labbe-backend-/models/ServiceModel.js:48-56`

---

**Q5: Service location: What format is serviceLocation?**

A: [KEPT FROM PETER — CLARIFIED]

Both the vendor's profile location (`UserModel.profile.vendorData.serviceLocation`) and a service's own location (`ServiceModel.serviceLocation`) use the same nested structure:

```
{
  regionId: Number,
  regionNameAr: String,
  regionNameEn: String,
  cityId: Number,        // null = all cities in region
  cityNameAr: String,
  cityNameEn: String,
  districtIds: [Number], // empty = all districts in city
  districtNames: [{ nameAr, nameEn }],
  coverageType: "region" | "city" | "districts"
}
```

`coverageType` signals the granularity: `"region"` means the vendor serves the entire region; `"city"` means one city; `"districts"` means specific neighbourhoods only. Name strings are auto-resolved from the locations service on save (`_resolveLocationNames`). No coordinates are stored — this is region/city/district hierarchy only, not geospatial.

Source: `labbe-backend-/models/UserModel.js:67-81`, `labbe-backend-/models/ServiceModel.js:73-113`, `labbe-backend-/src/modules/services/services.service.js:274-309`

---

**Q6: Social links: Which platforms are supported?**

A: [CLARIFIED FROM PETER]

Five platforms are defined in `UserModel.profile.vendorData.socialLinks`: `instagram`, `facebook`, `tiktok`, `twitter`, `website`. Note that **WhatsApp is not included** despite being a primary communication channel in the Saudi market. The web vendor settings page (`AdditionalLinksSection`) exposes exactly these five fields.

If WhatsApp contact should be supported, a `whatsapp` string field needs to be added to `vendorDataSchema.socialLinks` and exposed in both the settings form and the marketplace vendor popup.

Source: `labbe-backend-/models/UserModel.js:100-106`

---

**Q7: Inquiry/booking: Are these tracked in this flow?**

A: [KEPT FROM PETER]

No inquiry or booking system exists. The marketplace is browse-only. Hosts view vendor profiles and service details but cannot submit inquiries or bookings through the platform. `ServiceModel` has `inquiryCount` and `bookingCount` fields (stats only, never incremented by any active code path). These fields are legacy stubs and can be ignored.

Source: `labbe-backend-/models/ServiceModel.js:119-122`, `labbe-backend-/src/modules/services/services.service.js:97-118`

---

**Q8: Mobile parity: Should mobile vendor have same profile/service management UI as web?**

A: [NEEDS PETER RE-CONFIRMATION]

**Current behavior:** Mobile (`VendorServicesScreen.js`) supports service CRUD (create, edit, delete, toggle status) via `AddServicePopup`. The popup collects `name`, `type` (service category), `description`, `price`, `image`, and `tags`. Web vendor settings (`/vendor-dashboard/settings`) additionally manages portfolio images, price package images, social links, business documents (nationalIdImage, commercialRecordImage), and service location with region/city/district pickers.

**Assessment:** WEAK

**Why:** Mobile is missing profile-level management: no portfolio image upload, no social links editing, no service location picker, no document management. These are all managed only on web. Peter confirmed parity should be "similar to web with all features," but the gap is significant.

**Recommended change:** Add a vendor profile settings screen to mobile covering: portfolio images upload (up to 10), social links form (instagram/facebook/tiktok/twitter/website), service location picker (region → city → district cascade), and document upload. The backend endpoints (`PATCH /users/profile/vendorData`) already exist and accept these fields.

Source: `halla-mobile/screens/VendorServicesScreen.js:33-154`, `labbe/app/[lang]/vendor-dashboard/settings/page.js:119-218`

## Notes from answer pass

- Profile updates do NOT go through `/vendors` routes. They go through `PATCH /users/profile` (top-level fields like name, email, businessLogo) and `PATCH /users/profile/:section` with `section=vendorData` (brand name, service description, portfolio images, service location, social links, documents). Entry points corrected from "inferred PATCH /vendors/profile" to the actual routes in `users.routes.js:89` and `users.routes.js:153`.
- Service category is a strict 11-value backend enum (verified in `ServiceModel.js:30-42`). Frontends must fetch from `GET /vendors/categories` and render a dropdown — no free-text allowed.
- Service visibility uses two fields: `status` ("active"/"disabled") toggled by vendor, and `isPublic` (boolean). New services default to active+public immediately. Consider defaulting `isPublic: false` so vendors explicitly publish.
- Single price per service confirmed (`ServiceModel.price: Number`). No tiered pricing within a single service record.
- `serviceLocation` is region/city/district hierarchy with `coverageType` (not coordinates). Identical structure in both `UserModel.vendorData` and `ServiceModel`.
- Social links: `instagram`, `facebook`, `tiktok`, `twitter`, `website`. WhatsApp is absent despite being a common contact channel in Saudi market — Peter should decide whether to add it.
- No inquiry or booking system exists. `inquiryCount` and `bookingCount` on `ServiceModel` are legacy stubs, never incremented.
- Mobile vendor parity gap: service CRUD matches web, but profile management (portfolio, social links, location, documents) is web-only. Backend endpoints already support all these operations via `PATCH /users/profile/vendorData`.

---

## State machine

```
SERVICE (newly created)
  → status=active, isPublic=true   [immediately visible in marketplace]
  → VENDOR_TOGGLE_OFF → DISABLED   (status=disabled, hidden from public)
  → VENDOR_TOGGLE_ON  → ACTIVE     (status=active)
  → VENDOR_DELETE     → DELETED    (physical removal)
  → ADMIN_VENDOR_REJECT → ALL SERVICES DELETED (cascade from vendor hard-delete)

VENDOR_PROFILE
  → profileCompleted=false  [default on first login]
  → VENDOR_FILLS_PROFILE    → profileCompleted=true  [flag set manually; no backend gate]
```

Terminal states:
- **DELETED** — service physically removed from database.
- **ALL SERVICES DELETED** — cascade from vendor account hard-delete on rejection (see Flow 24).

Notable: there is no "draft" service state. A newly created service is immediately public (`isPublic=true`, `status=active`) — there is no explicit opt-in to marketplace visibility.

---

## Data handoffs

| Step | Producer | Consumer | Payload | Validation? |
|------|----------|----------|---------|-------------|
| Update vendor profile top-level | PATCH `/users/profile` | Backend users service | name, email, avatar (file via `uploadUserProfile` middleware) | Auth required (vendor role); 5MB file cap |
| Update vendor profile section | PATCH `/users/profile/vendorData` | Backend users service | brandName, serviceDescription, serviceLocation, socialLinks, portfolioImages (files), pricePackages, etc. | Auth required; portfolioImages max 10 files / 10MB general cap |
| Create service | POST `/services` | Backend services service | name, nameAr, description, descriptionAr, type (enum), price, currency, tags, serviceLocation, image (file) | Auth required (vendor role); `type` enforced as 11-value enum; price required and ≥ 0; image 5MB cap via `uploadServiceImage` |
| Get vendor services | GET `/services` | Vendor UI | Paginated service list scoped to authenticated vendor | Auth required; scoped by vendorId from JWT |
| Toggle service status | PATCH `/services/:id/toggle-status` | Backend services service | No body required | Auth required; verifies service belongs to caller's vendorId |
| Update service | PATCH `/services/:id` | Backend services service | Partial service fields; image (optional file) | Auth required; verifies service belongs to caller's vendorId |
| Delete service | DELETE `/services/:id` | Backend services service | No body | Auth required; verifies service belongs to caller's vendorId; physical deletion |
| Get service stats | GET `/services/stats` | Vendor dashboard | Aggregated stats: totalServices, activeServices, totalViews, totalBookings, avgRating | Auth required; totalBookings and avgRating always 0 (stub fields) |

---

## Role variations

| Role | CAN | CANNOT | Notes |
|------|-----|--------|-------|
| Vendor (approved) | Create, read, update, delete own services; toggle visibility; update own profile sections; view own stats | Edit other vendors' services or profiles; bypass `type` enum | Stats endpoint returns booking/inquiry data but those fields are always 0 |
| Vendor (suspended) | Log in and access dashboard | Have services visible in marketplace | Services remain in DB; toggle and edit still work |
| Admin / Super Admin | View all vendor profiles and services via admin routes | No dedicated admin endpoint to edit individual service content directly | Admin can indirectly remove all services by rejecting the vendor (hard-delete cascade) |
| Whitelabel Admin | Same as Admin scoped to own whitelabelId | Access vendors outside their whitelabel | |
| Host | View services in marketplace (public endpoint, Flow 26) | Create, edit, or delete vendor services | |

---

## Web ↔ mobile parity

| Feature | Web | Mobile | Gap? |
|---------|-----|--------|------|
| Create service | Yes (`/vendor-dashboard/services/`) | Yes (`AddServicePopup` in `VendorServicesScreen.js`) | No functional gap; web and mobile both POST to `/services` |
| Edit service | Yes | Yes | No |
| Delete service | Yes | Yes | No |
| Toggle service visibility | Yes | Yes (`handleToggleService`) | No |
| View service list | Yes | Yes | No |
| View service stats | Yes (vendor dashboard home) | No — `VendorServicesScreen.js` does not render stats | Gap: mobile missing stats display |
| Portfolio images management | Yes (`/vendor-dashboard/settings`) | No dedicated portfolio screen | **Gap** — mobile has no portfolio image upload or management |
| Social links management | Yes (`AdditionalLinksSection`) | No social links form on mobile | **Gap** |
| Service location picker | Yes (region → city → district cascade) | No — mobile `AddServicePopup` does not include location picker | **Gap** |
| Business document upload | Yes (nationalIdImage, commercialRecordImage) | No document management screen on mobile | **Gap** |
| Profile section edit (vendorData) | Yes | No equivalent profile settings screen on mobile | **Gap** |

---

## Edge cases & failure modes

- **New services are immediately public.** `createService()` hardcodes `status: 'active', isPublic: true`. A vendor who creates a service and then discovers an error cannot prevent it from briefly appearing in public search results — they must manually toggle it off after the fact.
- **profileCompleted flag not enforced.** `profileCompleted: false` on a vendor's account does not prevent service creation or marketplace visibility. An approved vendor with a blank profile and no portfolio can have services listed publicly.
- **inquiryCount and bookingCount are never incremented.** Both fields exist on `ServiceModel` and are returned in stats and service responses, but no code path increments them. The stats endpoint returns zeros for bookings. Vendors see misleading zero-activity stats.
- **Mobile profile management gap.** Portfolio images, social links, service location, and document uploads are only manageable on the web dashboard. A vendor who primarily uses mobile cannot set up a complete, discoverable profile without switching to web.
- **WhatsApp absent from social links.** The five supported social link fields are `instagram`, `facebook`, `tiktok`, `twitter`, `website`. WhatsApp is the dominant direct-contact channel in the Saudi market. Vendors cannot surface a WhatsApp contact link in their profile.
- **Image URL fallback to local path.** In `updateService()` and `createService()`, `getFileUrl(file) || /uploads/services/${file.filename}` means that if S3 upload fails silently, a local path is stored instead. The service appears to save successfully but the image URL will be broken in any multi-instance or containerised environment.
- **No validation that serviceLocation is present before marketplace publish.** A service can be created with no `serviceLocation`. It will appear in location-filtered queries only if `regionId`/`cityId` filter params are absent (no filter = all services returned). Location-less services pass through the public endpoint silently.

---

## Findings

### FLOW-25-F01 — New services default to immediately public; no explicit publish step
- **Severity**: Medium
- **Type**: DESIGN
- **Location**: `labbe-backend-/src/modules/services/services.service.js:151-152`
- **Description**: `createService()` hardcodes `status: 'active'` and `isPublic: true` on every new service. There is no draft state and no explicit publish action. A service becomes visible in the marketplace the moment it is created.
- **Why it matters**: A vendor filling in service details incrementally (e.g. creating the record first, then adding images and pricing) exposes an incomplete listing to hosts between creation and completion. For new vendors especially, this increases the risk of hosts seeing unfinished, unrepresentative service cards.
- **Recommended change**: Default new services to an unpublished state (hidden from public browse). Require vendors to take an explicit action to publish a service to the marketplace. The existing toggle mechanism can serve this purpose once the default is changed.
- **Related**: FLOW-24-F04

### FLOW-25-F02 — Mobile missing vendor profile management screens (portfolio, social links, location, documents)
- **Severity**: Medium
- **Type**: MISSING
- **Location**: `halla-mobile/screens/VendorServicesScreen.js:33`
- **Description**: Mobile supports service CRUD (create, edit, delete, toggle status) via `AddServicePopup`, but has no screens for portfolio image upload, social links editing, service location selection, or business document management. These capabilities are available on the web vendor dashboard (`/vendor-dashboard/settings`). The backend endpoints for all these operations exist and accept the required fields.
- **Why it matters**: Gate 1 rule 4 (mobile parity) is violated. A vendor who primarily operates on mobile cannot set up a complete, publicly discoverable profile. Incomplete profiles reduce marketplace quality and make mobile-only vendors disadvantaged compared to web users.
- **Recommended change**: Add a vendor profile settings screen to mobile that covers portfolio image management (upload up to the allowed maximum), social links form (all supported platforms), service location picker with region/city/district cascade, and document upload. All required backend endpoints already exist.
- **Related**: FLOW-24-F04

### FLOW-25-F03 — WhatsApp absent from vendor social links schema
- **Severity**: Medium
- **Type**: MISSING
- **Location**: `labbe-backend-/models/UserModel.js:100-106`
- **Description**: The `vendorData.socialLinks` schema supports `instagram`, `facebook`, `tiktok`, `twitter`, and `website`. WhatsApp is not included. No WhatsApp field exists anywhere in the vendor profile schema or the service model.
- **Why it matters**: WhatsApp is the primary direct-contact channel in the Saudi market. Vendors cannot expose a WhatsApp contact link in their marketplace profile. Hosts browsing the marketplace lose the most common and expected contact method. This is a market-localisation gap affecting the core "discover and contact vendor" workflow.
- **Recommended change**: Add a `whatsapp` field to the vendor social links schema and expose it in the vendor detail view on both the web marketplace popup and the mobile `MoreInfoPopup`. Validate that the value is a well-formed phone number or WhatsApp link.
- **Related**: none

### FLOW-25-F04 — inquiryCount and bookingCount are never incremented (dead stat fields)
- **Severity**: Low
- **Type**: BUG
- **Location**: `labbe-backend-/models/ServiceModel.js:119-122`
- **Description**: `ServiceModel` defines `inquiryCount` and `bookingCount` fields (both default 0). The service stats endpoint aggregates `bookingCount` and returns it to the vendor dashboard. No code path in the active API ever increments either field; they are legacy stubs.
- **Why it matters**: Vendors see zero-value inquiry and booking stats permanently, regardless of actual platform activity. The stats dashboard is misleading. If a real inquiry or booking system is added later, there is a risk of conflating the stub zeros with real data.
- **Recommended change**: Either remove the fields from the stats response entirely (returning only metrics that are actually tracked) or add explicit placeholder UI labels that indicate booking and inquiry tracking are coming in a future release. Do not return metrics that will always read zero.
- **Related**: none

### FLOW-25-F05 — Service image falls back to local filesystem path when S3 upload fails
- **Severity**: High
- **Type**: BUG
- **Location**: `labbe-backend-/src/modules/services/services.service.js:161`
- **Description**: In `createService()`, the image URL is set as `getFileUrl(file) || '/uploads/services/${file.filename}'`. If `getFileUrl()` returns a falsy value (S3 upload fails silently), a local filesystem path is stored. The create operation returns HTTP 200 with no error indication.
- **Why it matters**: A stored local path will produce broken image URLs in any multi-instance or containerised deployment. The silent fallback is the same root cause identified in FLOW-03-F04. Vendors and hosts will see broken images in service cards with no error reported.
- **Recommended change**: Treat a failed or missing S3 URL as an error condition: reject the create/update request with an appropriate error response so the vendor can retry. Do not silently store a local path as a fallback in any environment that uses object storage.
- **Related**: FLOW-03-F04

---

## Cross-flow notes

- The `profileCompleted` flag links Flow 24 (onboarding) and Flow 25 (profile): the flag exists but is never enforced by any gate — see FLOW-24-F04 and FLOW-25-F01.
- Service image local-fallback (FLOW-25-F05) is the same root cause as FLOW-03-F04 (S3 silent fallback to local disk) — the same pattern recurs in `createService` and `updateService`.
- Services becoming immediately public on creation feeds directly into the marketplace approval-gate problem in Flow 26: a service from an unapproved or suspended vendor that manages to get created will appear publicly unless the vendor-status gate is added to `GET /services/public` (see FLOW-26-F01).
- WhatsApp missing from social links (FLOW-25-F03) also affects the vendor detail popup in Flow 26 — the popup cannot surface a WhatsApp contact link even if the vendor wants to provide one.
