# Marketplace and Public Vendor Experience — Implementation Plan

Status: revised and ready for implementation  
References: `D:/marketplace-fin.png`, `D:/vendor.png`  
Applications: `labbe` (web), `halla-mobile` (mobile), `labbe-backend-` (API/database), `shared` (shared contracts)

## 1. Confirmed scope

Build polished marketplace and public vendor pages based closely on the supplied references, with equivalent mobile experiences.

This implementation will:

- Replace the current vendor popup/modal with a permanent, shareable public vendor page.
- Redesign the marketplace hierarchy, categories, filters, sorting, cards, loading states, and responsive behavior.
- Display useful vendor identity, description, location coverage, admin-assigned rating, contact details, services, prices, and portfolio.
- Send users directly to the vendor's WhatsApp with a localized prefilled message when they choose a service or contact the vendor.
- Extend signup/settings/service forms only for useful public data that belongs naturally in the existing vendor lifecycle.
- Use existing project colors and tokens from web global CSS and mobile design tokens.

## 2. Explicitly out of scope

The following will not be introduced:

- No service delivery-time fields or delivery-time UI.
- No dedicated vendor cover-image field or cover upload lifecycle.
- No user ratings, reviews, or rating submission flow. Vendor ratings remain admin-assigned only.
- No persistent vendor favorites or favorite database/API.
- No service-request, booking, quotation, or order workflow.
- No vendor profile-completeness system.
- No contact visibility preferences. Available public vendor contact data is always displayed.
- No quote-only pricing workflow.

Buttons in the references that imply requesting or booking will instead open WhatsApp. Decorative reference controls for unsupported product features, such as favorites and posting a marketplace request, will be removed or replaced with useful existing actions.

## 3. Reference-to-product mapping

### 3.1 Marketplace

| Reference element | Implementation decision |
|---|---|
| Existing right dashboard sidebar | Preserve the current host dashboard shell and navigation. |
| Marketplace title and notifications | Reuse existing title and live notification behavior. |
| Favorites button/card heart | Remove because favorites are not part of the product. |
| “Post service request” button | Remove because there is no request workflow. Do not create a dead CTA. |
| Editorial marketplace hero | Keep as a platform-owned static/responsive visual with localized copy. |
| Category icon strip | Implement from canonical service categories with web/mobile icon maps. |
| Filters and sorting | Complete using the existing public vendor endpoint and URL/query state. |
| Vendor card image | Use the first suitable portfolio image, then service image, then business logo, then a branded fallback. No new cover field. |
| Vendor badge | Use server-defined badge rules only, such as admin-approved/featured if supported. |
| Vendor summary | Add localized short tagline or derive a short excerpt from the localized About text. |
| Rating | Display the existing admin-assigned vendor rating. Do not show a review count unless it has a trustworthy source. |
| Location | Show localized region, city, and optional district/coverage area. |
| Tags | Derive up to three representative service/category tags. |
| Starting price | Derive the lowest active public service price and currency. |
| Details button | Navigate to the public vendor page. |

### 3.2 Public vendor page

| Reference element | Implementation decision |
|---|---|
| Large photographic hero | Build from existing portfolio/service imagery with a controlled crop, blur/gradient overlay, and branded fallback. Do not add a cover upload. |
| Circular vendor logo | Use `businessLogo`, with an initials fallback. |
| Brand title and tagline | Use `brandName` and localized tagline fields. |
| Rating | Display the admin-assigned rating only. |
| Location | Show region, city, and optional district/coverage area. |
| About panel | Use localized Arabic/English public description fields. |
| Contact panel | Always show available phone, WhatsApp, email, website, social links, and public location. |
| “Request quote” button | Replace with a WhatsApp CTA and a suitable localized prefilled message. |
| Service cards | Show image, localized title/description, tags, location coverage where useful, and price. No delivery duration. |
| “Request service” button | Open WhatsApp with vendor and selected service context. |
| Portfolio | Use existing `portfolioImages` in a responsive gallery/lightbox. |

## 4. Data-model changes

### 4.1 Extend `User.profile.vendorData`

Update `labbe-backend-/models/UserModel.js` with localized public copy:

```text
taglineAr: string, max 160
taglineEn: string, max 160
aboutAr: string, max 2000
aboutEn: string, max 2000
```

Retain and reuse existing fields:

- `brandName`
- `serviceDescription` during migration
- `serviceCategories`
- `serviceLocation` including region, city, district, and coverage
- `portfolioImages`
- `businessLogo`
- `socialLinks`, including WhatsApp and website
- user phone and email
- `rating`, controlled only by admin
- existing vendor approval/status fields

Migration and fallback rules:

- Keep `serviceDescription` for backward compatibility.
- Copy the legacy description to the vendor/account's preferred-language About field when safe.
- Public display fallback order: requested language, other language, legacy description.
- Tagline fallback: localized tagline, other-language tagline, short About excerpt, localized generic vendor label.
- Do not expose owner identity, verification files, commercial documents, internal status history, private files, or storage keys.

No `coverImage`, contact-preference, favorite, review, profile-completeness, or request fields will be added.

### 4.2 Service model

Keep and complete the bilingual fields already introduced in the current working implementation:

```text
name / nameAr
description / descriptionAr
category
image
price
currency
tags
included
status
isPublic
serviceLocation
```

Rules:

- Remove delivery/duration from the redesigned public cards and from this plan's new form requirements.
- Preserve an existing legacy `duration` field in the database for compatibility, but do not require, extend, or display it.
- No price-unit model is required unless an already-supported unit has a reliable source. Default public wording is simply “starts from {price} {currency}”.
- Marketplace minimum price considers only active, public services.
- A service with no valid public price can omit price and still provide a WhatsApp contact action, subject to existing backend validation constraints.
- Service location may inherit vendor coverage or override it when the existing service schema supports a narrower area.

### 4.3 Admin-assigned rating

- Keep the existing admin vendor-rating endpoint and fields as the only rating source.
- Public APIs return a nullable numeric rating.
- The UI displays a rating only when present; unrated vendors receive neutral copy or no rating block.
- Do not display interactive stars, review counts, review links, or wording suggesting user-generated reviews.

## 5. Contact and WhatsApp behavior

### Data capture

- Ensure WhatsApp is collected consistently in vendor signup and vendor settings on both web and mobile.
- Normalize Saudi/local and international phone input into a WhatsApp-compatible international number.
- Validate website/social URLs and phone numbers server-side.
- Available vendor contact data is public by product policy; there are no visibility toggles.

### CTA behavior

All primary vendor/service conversion actions open WhatsApp:

- General vendor CTA message includes a greeting and vendor name.
- Service CTA message includes vendor name, localized service name, displayed price when present, and the public vendor-page URL.
- Marketplace-card WhatsApp action, if included, uses the general vendor message; the main card CTA still opens vendor details.
- Arabic UI produces Arabic copy; English UI produces English copy.
- Use `https://wa.me/{normalizedNumber}?text={encodedMessage}` on web.
- Use the appropriate deep link on mobile with a browser fallback.
- If WhatsApp is missing, fall back to `tel:` when phone exists; otherwise display email/website contact without rendering a dead primary button.
- Never send private user/event data automatically in the message.

Suggested Arabic service message:

```text
مرحباً، أرغب في الاستفسار عن خدمة "{serviceName}" لدى {vendorName}. شاهدت الخدمة عبر منصة هلا: {vendorUrl}
```

Suggested English service message:

```text
Hello, I would like to ask about “{serviceName}” from {vendorName}. I found the service on Halla: {vendorUrl}
```

## 6. Backend and API contract

### Public vendor list

`GET /vendors/public`

Query parameters:

- `search`
- `category`
- `regionId`
- `cityId`
- `districtId` where supported
- `minPrice`
- `maxPrice`
- `rating`
- `sort`: `recommended`, `rating`, `price_asc`, `price_desc`, `newest`
- `page`, `limit`

Card response:

- Vendor ID
- Localized brand name/tagline
- Best available presentation image and logo
- Localized region/city/district summary
- Primary category and representative tags
- Nullable admin-assigned rating
- Server-approved badges
- Minimum active public service price/currency
- Active public service count

Recommended ordering should be deterministic and use approved status, optional admin feature priority if already supported/approved, admin rating, public data quality, and recent activity. It must not reference a profile-completeness feature exposed to vendors.

### Public vendor detail

`GET /vendors/public/:vendorId`

Return:

- Localized public vendor identity and About text
- Logo and best existing hero image candidate
- Admin-assigned rating
- Canonical categories and localized location coverage
- Always-public available phone, WhatsApp, email, website, and social links
- Active public services with localized data and price
- Portfolio images

Return `404` for missing, unapproved, suspended, or otherwise non-public vendors. Build an explicit DTO so private vendor fields cannot leak.

### Existing management APIs

- Extend vendor signup/profile update validation for localized tagline/About and WhatsApp.
- Extend vendor public response mapping and media URL signing.
- Ensure web/mobile service create and update accept Arabic names/descriptions consistently.
- Keep existing admin-only rating management unchanged except for tests and public DTO mapping.
- Update `shared/src/api/paths.js` and client query keys only where current paths/contracts require it.

No favorites, reviews, requests, quotes, bookings, delivery, cover upload, or contact-preference endpoints will be created.

## 7. Vendor lifecycle changes

### Signup — web and mobile

Update existing steps with minimal added friction:

1. Preserve identity and verification inputs.
2. Add Arabic and English tagline/About alongside existing service description data.
3. Preserve categories and structured location coverage.
4. Preserve logo and portfolio uploads; explain that the strongest landscape portfolio image may represent the vendor in marketplace/hero layouts.
5. Add/standardize WhatsApp with website and social links.

The account's main language fields may be required while the second language remains optional. No cover upload, visibility preferences, profile score, or preview-completion workflow is required.

### Vendor settings — web and mobile

Allow vendors to edit:

- Brand name
- Arabic/English tagline and About
- Categories
- Region, city, optional district, and service coverage
- Logo and portfolio
- Phone, WhatsApp, email, website, and social links

Admin rating remains read-only for vendors. Existing private verification settings remain separate from the public profile data.

### Service create/update — web and mobile

Complete all create/edit surfaces with:

- English and Arabic name
- English and Arabic description
- Category
- Service image
- Price and currency
- Tags and included items
- Active/public state
- Existing location coverage fields where applicable

Do not add delivery time, quote settings, request settings, or profile-completeness requirements.

## 8. Web marketplace specification

Build within the current host dashboard shell and reuse a route-neutral marketplace view for the public route.

Desktop composition:

1. Header with localized marketplace title and existing notification controls. Unsupported favorites/request buttons are omitted.
2. Wide editorial hero using a platform-owned event image, soft fade/gradient, localized headline, supporting copy, and search where it fits cleanly.
3. Horizontal/wrapping icon category strip with a gold active state from project tokens.
4. Filter control, active-filter count/chips, and sort dropdown.
5. Responsive results grid: four columns at wide dashboard widths, then three, two, and one as space narrows.
6. Accessible pagination or load-more behavior.

Vendor card anatomy:

- Best available existing vendor image
- Optional server-defined badge
- Brand name
- Two-line localized tagline/About excerpt
- Admin-assigned rating when present
- Region/city
- Up to three tags/categories
- Starting public service price and currency when present
- “View details” CTA

Do not render favorite hearts. The full card may be navigable with correct keyboard semantics.

Required states:

- Final-shape skeletons
- Useful empty state with filter reset
- Inline error/retry
- Missing-image branded fallback
- Missing-price and missing-rating layouts that do not look broken

## 9. Web public vendor page specification

Desktop composition:

1. Hero using the best landscape portfolio/service image, with a blurred/enlarged background treatment where necessary, controlled overlay, logo medallion, brand name, tagline, admin rating, category, and location.
2. Main RTL-aware grid with a broad About panel and a narrower sticky contact panel.
3. Contact panel with WhatsApp as the primary action, call as secondary, then available phone, email, website, social links, and service area.
4. Responsive service grid with image, localized title/description, tags, price, and WhatsApp CTA. No delivery row.
5. Portfolio gallery with consistent crops and accessible lightbox.
6. Share action and repeated WhatsApp action after long content where useful.

Hero fallback strategy:

1. Best landscape portfolio image.
2. Best service image.
3. Enlarged/softened logo with a branded gradient background.
4. Pure branded gradient/pattern with logo and typography.

This keeps the design strong without introducing a cover-image lifecycle.

Responsive behavior:

- Stack the contact panel below summary/About at tablet widths.
- Keep logo and hero text readable across unknown image crops.
- Use a safe-area bottom contact bar on narrow screens.
- Verify Arabic RTL and English LTR independently.

SEO/accessibility:

- Vendor-specific metadata, canonical URL, Open Graph image from available vendor media, and accurate structured data where applicable.
- Logical headings, meaningful alt text, visible focus, keyboard gallery support, reduced-motion support, and WCAG AA contrast.

## 10. Mobile specification

### Marketplace

- Compact title/notification bar.
- Full-width search.
- Horizontally scrollable category chips.
- Filter and sort bottom sheets.
- One-column vendor cards using existing imagery, with concise metadata and details CTA.
- No favorites or post-request action.
- Pull-to-refresh, paginated loading, skeletons, retry, and preserved filters when returning from vendor details.

### Public vendor page

- Compact image hero using the same existing-media fallback strategy.
- Overlapping logo, summary, rating when present, category, and location.
- Separate About and contact cards.
- Vertical services without delivery-time rows.
- Two-column portfolio gallery.
- Sticky safe-area actions for WhatsApp and call.
- Native share and deep-linkable public URL.
- Minimum 44-point touch targets and screen-reader labels.

## 11. Design rules

- Use `labbe` global CSS variables and mobile design tokens for colors, spacing, typography, radii, and shadows.
- Gold remains a focused accent for active categories, badges, prices, and primary actions.
- Use warm neutral surfaces, subtle borders, restrained shadows, and generous white space from the references.
- Production hero imagery must be owned/licensed. Reference/mock imagery is not automatically a production asset.
- Use project icon libraries and canonical category icon maps; no emoji icons.
- Treat Arabic as a first-class layout and validate English separately.
- Avoid manufacturing visual features that imply unsupported capabilities.

## 12. Implementation phases

### Phase 0 — Baseline and safety

- Preserve all current uncommitted work and stay on the current branch as requested.
- Capture current build/test status and screenshots.
- Turn the two references into a visual acceptance checklist.

### Phase 1 — Data and contracts

- Add localized tagline/About fields with backward-compatible migration.
- Standardize WhatsApp normalization and validation.
- Complete public list/detail DTOs and private-field exclusion.
- Confirm location serialization for region, city, district, and coverage.
- Keep admin rating as the sole rating source.

### Phase 2 — Vendor and service management

- Update web/mobile signup and vendor settings with bilingual public copy and WhatsApp.
- Complete web/mobile service create/edit bilingual fields and location handling.
- Keep legacy fields readable without adding delivery or cover requirements.

### Phase 3 — Web marketplace

- Implement the reference-led hero, categories, filters, sort, cards, and responsive states.
- Connect list/detail navigation and remove popup entry points.
- Remove unsupported favorites/request controls.

### Phase 4 — Web vendor page

- Implement existing-media hero, About/contact layout, service grid, portfolio, share, and WhatsApp actions.
- Add metadata, RTL/LTR responsiveness, and graceful missing-data fallbacks.

### Phase 5 — Mobile marketplace and vendor page

- Implement mobile-native list, filters, vendor profile, gallery, share, and sticky WhatsApp/call actions.
- Add deep-link and browser fallbacks for WhatsApp.

### Phase 6 — Verification and release

- Run migrations in dry-run/staging first.
- Test public field privacy, filtering, localization, WhatsApp URL generation, missing-data fallbacks, and admin rating behavior.
- Run web builds, mobile lint/bundles, and Playwright visual QA against both references.
- Add analytics for search, filters, profile views, service views, and contact clicks without recording message contents.

## 13. File-level implementation map

### Backend

- `labbe-backend-/models/UserModel.js`
- `labbe-backend-/models/ServiceModel.js` only for compatibility/field consistency where required
- `labbe-backend-/src/modules/auth/auth.validation.js`
- `labbe-backend-/src/modules/auth/auth.service.js`
- `labbe-backend-/src/modules/users/users.validation.js`
- Vendor profile/upload handlers in auth/users modules
- `labbe-backend-/src/modules/vendors/*`
- `labbe-backend-/src/modules/services/*`
- Existing admin vendor-rating routes/tests
- Migration scripts for localized vendor descriptions

### Shared

- `shared/src/api/paths.js`
- Canonical category/sort contracts where both clients can reuse them

### Web

- `labbe/app/[lang]/host/market-place/page.js`
- `labbe/app/[lang]/market-place/page.js`
- `labbe/app/[lang]/market-place/_components/*`
- `labbe/app/[lang]/market-place/vendors/[vendorId]/*`
- `labbe/hooks/vendors/*`
- Vendor signup under `labbe/ui/auth/signup/vendor/*`
- Vendor settings under `labbe/app/[lang]/vendor-dashboard/settings/*`
- Service create/edit components and validation schemas
- Arabic/English locale files

### Mobile

- `halla-mobile/screens/common/Marketplace.js`
- `halla-mobile/screens/common/VendorPublicProfileScreen.js`
- `halla-mobile/components/marketplace/*`
- `halla-mobile/hooks/marketplace/*`
- `halla-mobile/components/auth/vendor-signup/*`
- `halla-mobile/components/vendor/ServiceDetailsForm.js`
- Vendor settings/home components
- Navigation, design tokens, API config, and Arabic/English locale files

## 14. Verification matrix

### Automated and functional

- Public DTO tests prove private identity/verification data is absent.
- List tests cover category, region, city, district, price, rating, search, sort, and pagination.
- Admin rating appears publicly but cannot be changed through public/vendor endpoints.
- WhatsApp message and number encoding tests cover Arabic, English, spaces, punctuation, and missing phone data.
- Service visibility tests ensure disabled/private services never appear.
- Web builds and route-level tests pass.
- Mobile lint/tests and Android/iOS production exports pass.

### Playwright visual QA

Compare against supplied references at:

- 1680×945 reference-like desktop
- 1440×900 desktop
- 1024×768 tablet
- 390×844 mobile web

Review hero hierarchy, dashboard integration, card density, image crops, Arabic typography, location display, missing-data states, service cards without delivery rows, sticky contact behavior, overflow, and English mirroring.

### Manual scenarios

- Vendor has portfolio image and logo.
- Vendor has only logo.
- Vendor has neither logo nor usable images.
- Vendor has region/city/district versus only region.
- Vendor has and does not have an admin rating.
- Vendor has WhatsApp, only phone, or only email/site.
- Vendor has no public services or multiple services.
- Arabic content is complete, English is missing, and vice versa.
- WhatsApp opens with the correct localized vendor/service message.

## 15. Definition of done

- The marketplace and vendor page closely follow the references while remaining honest to supported product functionality.
- The old vendor popup is removed from all marketplace entry points.
- Web and mobile have equivalent discovery, detail, location, contact, service, and portfolio capabilities.
- No delivery, cover-upload, favorites, reviews, quote/request, visibility-preference, or completeness systems are introduced.
- Ratings are displayed as nullable admin-assigned values only.
- Every service/contact CTA opens WhatsApp with a correct localized message and a safe fallback.
- Available contact information is consistently public.
- Existing vendor media produces a polished hero through deterministic fallbacks.
- Arabic/English localization, RTL/LTR, responsive behavior, privacy, accessibility, builds, mobile exports, and Playwright checks pass.
