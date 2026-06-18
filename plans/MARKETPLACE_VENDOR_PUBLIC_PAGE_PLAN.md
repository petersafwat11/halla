# Marketplace and Public Vendor Profile Plan

Status: planning only — no product code changed  
Scope: `labbe` web, `labbe-backend-` API, `halla-mobile` app  
Prepared from the current working tree on 2026-06-18

## 1. Product outcome

Replace the current vendor-information popup/modal with a real, shareable public vendor profile on web and a dedicated vendor profile screen on mobile. Improve the marketplace so it is useful for discovery, filtering, comparison, and navigation rather than acting as a grid of cards whose main action opens an oversized popup.

The two surfaces have different jobs:

- Marketplace: help a user quickly find and compare relevant approved vendors.
- Vendor profile: establish trust, explain the vendor, present active public services and portfolio work, and make contact actions easy.

## 2. Current-state audit

### Backend

- Vendor profile fields live under `User.profile.vendorData` in `models/UserModel.js`.
- Vendor services live in `models/ServiceModel.js` and are managed through `src/modules/services`.
- `GET /api/v2/vendors/public` currently returns the vendor's full public presentation plus every active public service. This makes marketplace pages heavier than needed and signs many portfolio and service-image URLs for each list request.
- There is no dedicated `GET /api/v2/vendors/public/:vendorId` public-detail endpoint.
- `GET /api/v2/services/:id` is behind authentication even though service logic contains a public branch. The route and service intent are inconsistent.
- Marketplace filters supported by the API are search, category, region, city, districts, min/max price, and minimum rating.
- Vendor list ordering is hardcoded to click count and creation date; there is no explicit user-facing sort contract.
- `ServiceModel` defines `name`, `description`, `price`, and `currency`, but validation and response formatting also refer to `nameAr`, `descriptionAr`, and `priceUnit`. Those fields are not currently declared in the Mongoose schema, so the localized values can be silently discarded under normal strict-schema behavior.
- Vendor categories are duplicated in vendor validation, service validation, service model enums, and the vendor category endpoint.
- Public vendor responses already expose email, mobile, and social links. That behavior should be made explicit in a public DTO rather than relying on broad user selection.

### Web (`labbe`)

- The public marketplace is `app/[lang]/market-place/page.js`.
- The host marketplace at `app/[lang]/host/market-place/page.js` duplicates the public page with import-path changes.
- Both pages open `VendorInfoPopup` from the card's “Call now” action.
- The card is presenting a vendor, but is named `ServiceCard` and receives a remapped `service` object. This increases conceptual and maintenance confusion.
- Existing filter, section, and filter-state components are present, but the current marketplace page does not render or connect them.
- The page has no search, category navigation, applied-filter summary, result count, sort control, error state, or retry action.
- Colors in the marketplace CSS are mostly hardcoded instead of using the variables in `app/[lang]/globals.css`.
- Category keys are displayed directly in the web card instead of consistently translated labels.
- The modal already contains about, portfolio, services, contact links, WhatsApp, and call actions, but its constrained height, nested horizontal scrollers, sticky modal footer, and lack of URL/history make it unsuitable for a full vendor experience.

### Mobile (`halla-mobile`)

- `screens/common/Marketplace.js` fetches vendors and opens `components/marketplace/MoreInfoPopup`.
- The current marketplace screen does not render the existing `SearchAndFilter`, `Sections`, or `FilterPopup` components.
- The mobile popup is a full-screen-like `Modal` with a nested vertical `ScrollView` and horizontal scroll areas for portfolio and services.
- Host and vendor roles both render the same marketplace tab, so the new detail screen must be reachable from both navigation stacks.
- Marketplace components use many hardcoded colors despite the complete token set in `styles/tokens.js`.
- Current list animation delays grow with the item index, which becomes increasingly undesirable during infinite scrolling and should be capped or removed.

## 3. Public data contract and privacy boundary

The API must construct an allowlisted public DTO. It must never serialize a user document and remove a few fields afterward.

### Public vendor fields

| Source | Public output | Notes |
| --- | --- | --- |
| `User._id` | `id` | Stable route key |
| `vendorData.brandName` / `User.name` | `brandName` | Brand name with safe fallback |
| `vendorData.serviceDescription` | `description` | Vendor about copy |
| `vendorData.serviceCategories` | `categories` | Return normalized category keys with non-empty values |
| `vendorData.serviceLocation` | `location` | Region/city/district display data and coverage type |
| `vendorData.businessLogo` | `logo` | Signed URL |
| `vendorData.portfolioImages` | `portfolio` | Signed URLs on detail only |
| `vendorData.socialLinks` | `socialLinks` | Allowlist supported protocols/domains before rendering |
| `vendorData.rating` | `rating` | Display only when meaningful |
| `vendorData.numberOfRatings` | `ratingCount` | Use one response name across clients |
| `User.email` | `contact.email` | Include only under the chosen contact-visibility policy |
| `User.mobile` / `phoneNumber` | `contact.phone` | Normalize for `tel:` and WhatsApp links |
| active public services | `services` | Detail endpoint; stable localized DTO |
| derived service values | `startingPrice`, `serviceCount`, `coverImage` | List/detail summaries |

### Never public

- `ownerFullName`
- `commercialRecordNumber`, `commercialRecordImage`
- `nationalId`, `nationalIdImage`
- `profileFile` unless a future explicit “publish company profile” field is added
- `adminNotes`, `rejectionReason`, approval actor/timestamps
- authentication fields, permissions, account status internals, reset/setup tokens
- raw internal S3 keys
- click counters and internal moderation metadata

### Recommended visibility rule

Keep the current contact information visible for approved vendors to preserve behavior, but implement it through an explicit `contact` DTO. A later privacy setting can add `publicContact.email`, `publicContact.phone`, and `publicContact.whatsapp` without changing client shapes.

## 4. Proposed API design

### `GET /api/v2/vendors/public`

Purpose: lightweight marketplace summaries only.

Response item:

```json
{
  "id": "...",
  "brandName": "...",
  "shortDescription": "...",
  "logo": "signed-url",
  "coverImage": "signed-url",
  "rating": 4.7,
  "ratingCount": 24,
  "categories": ["eventPlanning"],
  "location": { "regionNameAr": "...", "regionNameEn": "...", "cityNameAr": "...", "cityNameEn": "...", "coverageType": "city" },
  "startingPrice": { "amount": 2500, "currency": "SAR" },
  "serviceCount": 4
}
```

Do not include portfolio arrays, full contacts, social links, or full services in list results.

Query additions:

- Keep current filters.
- Add `sort=recommended|rating|priceAsc|newest`.
- Normalize empty and zero-valued price filters correctly; avoid truthiness checks that drop `0`.
- Define deterministic secondary sorting for stable pagination.

### `GET /api/v2/vendors/public/:vendorId`

Purpose: complete public profile for one approved vendor.

Response:

```json
{
  "vendor": {
    "id": "...",
    "brandName": "...",
    "description": "...",
    "logo": "signed-url",
    "coverImage": "signed-url",
    "portfolio": ["signed-url"],
    "rating": 4.7,
    "ratingCount": 24,
    "categories": ["eventPlanning"],
    "location": {},
    "contact": { "email": "...", "phone": "...", "whatsapp": "..." },
    "socialLinks": {},
    "startingPrice": { "amount": 2500, "currency": "SAR" },
    "serviceCount": 4,
    "services": []
  }
}
```

Rules:

- Return 404 for missing, non-vendor, unapproved, inactive, or otherwise non-public profiles. Do not reveal moderation state.
- Include only `status=active` and `isPublic=true` services.
- Sign image URLs at response time.
- Use a dedicated formatter/DTO shared by list and detail formatting.
- Either cap embedded services to a safe maximum and add service pagination, or formally accept the expected upper bound. Recommended first version: include all active services if vendor limits are small; otherwise expose `GET /vendors/public/:id/services`.

### Optional analytics endpoint

Use `POST /api/v2/vendors/public/:vendorId/view` or a generic analytics event endpoint for profile impressions and contact clicks. Do not make a read-only GET responsible for business-critical counting. Contact actions should identify `call`, `whatsapp`, `email`, or `website` without storing personal user content.

### Service model cleanup

- Add `nameAr` and `descriptionAr` to `ServiceModel`, or remove them from validation/docs/formatters. Recommendation: add them because both products are bilingual.
- Standardize on `currency`; remove the ambiguous `priceUnit` fallback unless price unit is a genuinely separate concept.
- Standardize `reviewCount` in storage and `ratingCount` or `reviewCount` in all API responses; choose one name.
- Move category constants to one shared backend constant and consume it from model validation and Zod schemas.
- Add indexes aligned to public detail/list queries if query plans show a need, especially public services by `vendorId + status + isPublic + price`.

## 5. Information architecture and UX

### Marketplace

Desktop structure:

```text
[Header]
[Marketplace intro + concise value proposition]
[Search________________] [Category] [Location] [Filters] [Sort]
[Active filter chips]                         [N vendors]

[Vendor card] [Vendor card] [Vendor card]
[Vendor card] [Vendor card] [Vendor card]

[Pagination]
[Footer]
```

Mobile structure:

```text
[Top bar: Marketplace]
[Search________________] [Filter]
[Horizontally scrollable category chips]
[N vendors / active-filter summary]
[Vendor card]
[Vendor card]
[Infinite-load footer]
```

Marketplace changes:

- Rename the primary card action from “Call now” to “View profile” / “View vendor”. Calling belongs on the detail page, after the user has seen enough context.
- Make the image/title/card affordance open the profile as well, with one clear interactive model and accessible focus states.
- Keep cards concise: cover, logo, brand, category labels, location, rating and rating count, starting price, service count, profile CTA.
- Translate category keys in both languages.
- Connect debounced search and existing category/location/rating/price filters to the query.
- Keep applied filters visible and individually removable.
- Add result count, reset, retry, skeleton, zero-results, and end-of-list states.
- Store web filters in URL search parameters so filtered marketplace views are shareable and browser Back works.
- Reset pagination when any filter or sort changes.
- Preserve mobile filters when returning from a vendor profile.

### Public vendor profile

Desktop structure:

```text
[Breadcrumb: Marketplace / Vendor]

[Large portfolio-led cover strip........................]
[Logo] [Brand + categories + location + rating] [Contact panel]

[About vendor........................] [Call]
[Service area / trust facts..........] [WhatsApp]
                                       [Website/email]

[Services — responsive grid]
[Service card] [Service card] [Service card]

[Portfolio — deliberate image gallery/lightbox]
[Related navigation: Back to marketplace]
```

Mobile structure:

```text
[Back] [Share]
[Cover / portfolio hero]
[Overlapping logo + brand]
[Rating • location • categories]
[About]
[Services — vertical cards]
[Portfolio — 2-column grid / viewer]
[Contact and social links]
[Sticky safe-area CTA: WhatsApp | Call]
```

Section behavior:

- Hero: cover comes from the first portfolio image, then first service image, then a branded fallback. The fallback should use the project palette and brand initial without pretending to be photography.
- Identity: brand name is primary; categories and coverage are supporting data.
- Trust: rating is shown only when there are ratings. Never display `0.0` as if it were a reviewed score.
- About: hide the section if empty; preserve readable line length.
- Services: use a real responsive grid on web and vertical cards on mobile. Each service shows localized name/description, category, image, price/currency, duration, included items, tags, location, rating only if available, and a contact action.
- Portfolio: use a grid and image viewer, not a narrow horizontal strip on desktop.
- Contact: phone, WhatsApp, email, website, and supported social links; sanitize links and use clear external-link behavior.
- Mobile CTA: fixed above safe area, present only for available actions; content gets matching bottom padding.
- Sharing: web URL is inherently shareable; mobile should use the native share sheet with the public web URL.
- Empty content: sections disappear cleanly, but the page always retains vendor identity, back navigation, and any available contact method.

## 6. Visual direction

Use the existing Halla palette and tokens rather than inventing a new visual identity.

- Canvas: `--bg-artboard` / `backgrounds.artboard` (`#fcfaf8`).
- Surface: natural white and soft natural-100/150.
- Primary action: primary-500 `#c28e5c`, with primary-600/800 states.
- Headings: natural-900 `#2c2c2c`.
- Supporting text: natural-450 `#656565` and natural-350 `#a0a0a0`.
- Borders: natural-200/250 and primary-100/200 for selected states.
- Success and error states: use the existing semantic token families.
- Typography: Cairo for Arabic and Inter for English from the existing systems.
- Radius: 12–20 px from tokens; do not introduce arbitrary pill shapes except category/filter chips.
- Spacing: use the existing 4 px scale.

Signature element: make the vendor's actual work the visual identity of the page. The profile opens with a calm, edge-to-edge “portfolio ribbon” whose image proportions adapt to available work, then settles into a disciplined information layout. This is specific to event vendors and avoids a generic gradient-dashboard hero.

Motion:

- One restrained page entrance/hero reveal.
- Small card image/focus transitions on web.
- Native screen transition on mobile.
- Respect `prefers-reduced-motion`; do not stagger every item indefinitely.

Accessibility:

- Semantic web headings and landmarks, keyboard focus, descriptive image alt text, and visible hover/focus parity.
- Minimum 44 px mobile touch targets.
- Contrast checked against token combinations.
- RTL verified for layout, icon direction, breadcrumbs, phone numbers, and mixed Arabic/Latin content.
- Screen-reader names describe outcomes (“View Al Noor profile”, “Call Al Noor”).

## 7. Implementation plan by phase

### Phase 0 — protect the working tree

- Record the current modified files before implementation. Marketplace files already contain uncommitted work in both web and mobile.
- Do not overwrite or revert those changes. Implement by reviewing diffs and preserving current behavior until replacement routes are ready.
- Create a dedicated `codex/` branch only when implementation is authorized.

### Phase 1 — backend contract and model consistency

Primary files:

- `labbe-backend-/models/UserModel.js`
- `labbe-backend-/models/ServiceModel.js`
- `labbe-backend-/src/modules/vendors/vendors.routes.js`
- `labbe-backend-/src/modules/vendors/vendors.controller.js`
- `labbe-backend-/src/modules/vendors/vendors.service.js`
- `labbe-backend-/src/modules/vendors/vendors.validation.js`
- `labbe-backend-/src/modules/services/services.service.js`
- `labbe-backend-/src/modules/services/services.validation.js`
- shared constants/OpenAPI schemas as applicable

Tasks:

1. Define list-summary and public-detail DTO formatters with allowlisted fields.
2. Slim the list endpoint and add deterministic sort support.
3. Add and validate `GET /vendors/public/:vendorId` before any catch-all protected route can intercept it.
4. Reconcile service localization, currency, and review-count fields.
5. Normalize/sanitize public contact and social links.
6. Ensure only approved vendors and active public services are returned.
7. Add API tests for authorization boundary, privacy exclusions, filters, sort, 404 behavior, empty services, and signed-image outputs.
8. Update Swagger/OpenAPI docs.

Backward compatibility: either ship the new list shape behind `view=summary`, or update web and mobile in the same release. Recommended: coordinated release with a short compatibility window in which old fields remain aliases if independent deployment timing is uncertain.

### Phase 2 — shared marketplace domain mapping

- Create a small adapter in each client that maps the API DTO to UI-ready localized values.
- Centralize category-label lookup, location formatting, rating display, starting-price formatting, and phone/WhatsApp URL creation.
- Keep raw API objects out of presentation components.
- Add client query keys and a vendor-detail query hook:
  - web: `labbe/hooks/vendors/*`
  - mobile: `halla-mobile/hooks/marketplace/*`

### Phase 3 — web public vendor route

Suggested route:

- `labbe/app/[lang]/market-place/vendors/[vendorId]/page.js`

Supporting components:

- `VendorProfileHero`
- `VendorOverview`
- `VendorContactPanel`
- `VendorServicesGrid`
- `VendorServiceCard`
- `VendorPortfolioGallery`
- `VendorProfileSkeleton`
- route-level `loading.js`, `error.js`, and `not-found.js`

Tasks:

1. Fetch the dedicated detail endpoint by route ID.
2. Prefer server rendering for the public profile and generate localized metadata/title/description for discoverability and link previews.
3. Build responsive, RTL-safe sections using variables from `app/[lang]/globals.css`.
4. Add call, WhatsApp, email, website, social, share/copy-link, and back-to-marketplace actions.
5. Add an accessible portfolio viewer only after the base grid works.
6. Remove the popup from the marketplace flow once route navigation is complete.

### Phase 4 — web marketplace improvement and deduplication

Primary files:

- `labbe/app/[lang]/market-place/page.js`
- `labbe/app/[lang]/market-place/page.module.css`
- `labbe/app/[lang]/market-place/_components/card/*`
- existing filters, sections, pagination, and filter hook
- `labbe/app/[lang]/host/market-place/page.js`
- marketplace localization files

Tasks:

1. Extract a shared `MarketplaceView` used by public and host routes; eliminate page duplication.
2. Rename/refactor `ServiceCard` into `VendorCard` with a vendor-shaped prop.
3. Connect search, category, location, rating, price, sort, and pagination to URL state and API params.
4. Replace “Call now” with profile navigation and make the intended card areas navigable.
5. Add result count, active-filter chips, skeletons, retry, no-results, and empty-market states.
6. Replace hardcoded colors/spacing/radii with global CSS variables.
7. Translate all categories and normalize currency/location formatting by active language.

### Phase 5 — mobile vendor profile screen

Suggested files:

- `halla-mobile/screens/common/VendorPublicProfileScreen.js`
- `halla-mobile/components/marketplace/vendor-profile/*`
- `halla-mobile/hooks/marketplace/queries.js`
- `halla-mobile/navigation/AppNavigator.js`

Tasks:

1. Register `VendorPublicProfile` in both `HostStack` and `VendorStack`.
2. Navigate using only `vendorId`; fetch authoritative detail data on the destination screen.
3. Build the screen with `FlatList` or a section-aware list rather than deeply nested same-direction scroll views.
4. Implement hero, overview, services, portfolio, contact/social links, share, error/retry, and skeleton states.
5. Add a safe-area-aware sticky call/WhatsApp action bar.
6. Replace the modal and remove it from exports only after no references remain.
7. Use `styles/tokens.js` for all new colors, spacing, typography, radii, and semantic states.

### Phase 6 — mobile marketplace improvement

Primary files:

- `halla-mobile/screens/common/Marketplace.js`
- `halla-mobile/components/marketplace/VendorCard.js`
- `VendorCards.js`, `SearchAndFilter.js`, `Sections.js`, `FilterPopup.js`

Tasks:

1. Wire search, category chips, and filter sheet into `useMarketplaceVendors`.
2. Debounce search, reset infinite pages on filter change, and retain applied state when navigating back.
3. Change CTA to “View profile”; allow card/image/title taps to navigate.
4. Improve list padding, loading skeleton, retry, zero results, and pagination footer.
5. Cap/remove index-based stagger delay for later pages.
6. Replace marketplace hardcoded colors with design tokens and verify tablet behavior.

### Phase 7 — localization, quality, and release

- Add complete Arabic and English copy for marketplace controls, profile sections, actions, empty/error states, category labels, and accessibility labels.
- Verify UTF-8 source handling and actual Arabic rendering in both products.
- Add backend integration tests, component/unit tests where infrastructure exists, and focused end-to-end smoke tests.
- Capture and compare desktop, tablet, small mobile, Arabic RTL, English LTR, content-rich, and sparse-vendor screenshots.
- Test real `tel:`, WhatsApp, `mailto:`, website, social, native share, and web copy-link behavior.
- Test slow network, expired signed images, broken image fallback, offline/retry on mobile, 404 vendor, and vendor becoming unapproved between list and detail.
- Run lint/build for web, lint/Expo checks for mobile, and backend tests before handoff.
- Deploy backend first with compatibility, then web/mobile clients, then remove old response aliases and popup code in a later cleanup release if needed.

## 8. Acceptance criteria

### Functional

- Clicking/tapping a marketplace vendor opens a dedicated vendor route/screen, never the old popup.
- Web vendor profiles have stable, refreshable, shareable URLs.
- Mobile Back returns to the same marketplace position and filters.
- Only approved vendors and active public services are visible.
- Search, category, location, rating, price, sort, reset, pagination/infinite scroll, and retry work as specified.
- Contact actions launch the correct platform behavior.
- Vendor detail data remains correct when opened directly rather than only from a preloaded card.

### Privacy and security

- Public responses contain none of the never-public fields listed above.
- Vendor IDs cannot be used to retrieve pending/rejected vendors or private services.
- External URLs are validated/sanitized; phone and WhatsApp values are normalized.
- API responses never contain raw storage keys or authentication fields.

### Design and accessibility

- New UI uses existing project tokens and supports Arabic RTL and English LTR.
- Web works at 320, 768, 1024, and 1440 px widths without overflow.
- Mobile works on small phones, modern tall phones, and tablets with safe areas.
- Keyboard, screen-reader labels, touch targets, focus visibility, contrast, and reduced motion meet the agreed quality floor.
- Sparse vendors do not leave awkward empty shells; rich vendors do not create nested-scroll traps.

### Performance

- Marketplace list payload no longer contains full portfolios and full service arrays.
- Images use responsive sizing/caching and render fallbacks without layout shift.
- Filters do not fire a request per keystroke without debounce.
- Pagination is stable under deterministic sorting and does not duplicate vendors.

## 9. Delivery checkpoints

1. Backend DTO/API review with sample list and detail payloads.
2. Static visual review of web desktop/mobile and native mobile profile using realistic Arabic and English vendor data.
3. Functional marketplace review with all filters and navigation.
4. Privacy/security response review.
5. Cross-platform QA and release sign-off.

## 10. Decisions to preserve during implementation

- Use a stable vendor ID in routes for the first version. A human-readable slug may be added later, but must not become the identity key.
- Keep the vendor profile public and canonical even when opened from the authenticated host marketplace.
- Treat services as first-class profile content, not separate popups.
- Hide missing sections instead of filling them with fake content.
- Do not expose verification documents as “trust badges.” Approval may be represented as an approved vendor state, but the underlying documents remain private.
- Do not start with a review-writing feature; current data supports aggregate ratings, not a complete public review model.

