# API Contract Audit Report — Vendor Screens

**Date:** 2026-05-04
**Scope:** 6 vendor screens in halla-mobile
**Screens Audited:**
1. `halla-mobile/screens/VendorHomeScreen.js`
2. `halla-mobile/screens/VendorServicesScreen.js`
3. `halla-mobile/screens/VendorSettingsScreen.js`
4. `halla-mobile/screens/VendorSignupScreen.js`
5. `halla-mobile/screens/VendorTicketsScreen.js`
6. `halla-mobile/screens/VendorAccountSetupScreen.js`

---

## Page: halla-mobile/screens/VendorHomeScreen.js

### API Calls Discovered: 3

---

### Call 1: GET /api/v2/services/stats

**Discovery chain:**
`VendorHomeScreen.js:46` → `useVendorStats()` → `vendorService.getStats()` → `GET /api/v2/services/stats` → `servicesController.getMyStats` → `servicesService.getMyStats`

**Caller → Hook:**
- Caller receives: `data` from `useVendorStats()`
- Hook queryFn returns: `response.data?.stats || response.data` (useVendor.js:36)
- Mismatch: None

**Hook → Backend:**
- Service calls: `apiClient.get("/services/stats")` (vendorService.js:53)
- Backend reads: `req.user._id` from auth middleware
- Backend returns via `sendSuccess(res, result)` where result = `{ stats: { totalServices, activeServices, totalViews, totalBookings, avgRating } }` (services.service.js:122-130)
- Mismatch: None

**Backend Response:**
- Success shape: `{ success: "success", data: { stats: { totalServices, activeServices, totalViews, totalBookings, avgRating } } }`
- Error shape: `{ message: "..." }` (401/403)

**Frontend Response Handling:**
- `apiClient` returns `response.data` (vendorService.js:54), so hook receives `{ success, data: { stats } }`
- Hook unwraps: `response.data?.stats || response.data` → returns `{ totalServices, activeServices, ... }`
- Screen reads: `statsData?.activeServices`, `statsData?.totalServices`, `statsData?.avgRating` (VendorHomeScreen.js:52-54)
- Mismatch: None

**Verdict:** ✅ OK

---

### Call 2: GET /api/v2/services

**Discovery chain:**
`VendorHomeScreen.js:47` → `useVendorServices()` → `vendorService.getServices()` → `GET /api/v2/services` → `servicesController.getMyServices` → `servicesService.getMyServices`

**Caller → Hook:**
- Caller receives: `data` from `useVendorServices()`
- Hook queryFn returns: `response.data || []` (useVendor.js:55)
- Mismatch: None

**Hook → Backend:**
- Service calls: `apiClient.get("/services")` (vendorService.js:59)
- Backend reads: `req.user._id`, pagination from `req.query`
- Backend returns via `sendPaginated(res, result.data, result.pagination)` where `result.data` = array of formatted services (services.service.js:99-102)
- Mismatch: None

**Backend Response:**
- Success shape: `{ success: "success", data: [{ id, name, nameAr, description, category, price, image, tags, status, isPublic, rating, ... }], pagination: { page, limit, total, pages } }`
- Error shape: `{ message: "..." }` (401)

**Frontend Response Handling:**
- `apiClient` returns `response.data`, hook receives `{ success, data: [...], pagination }`
- Hook unwraps: `response.data || []` → returns the services array
- Screen maps services at VendorHomeScreen.js:56-68:
  - `s.id` ✅ (backend returns `id: service._id`)
  - `s.name` ✅
  - `s.image` ✅ (backend returns `_sanitizeImagePath(image)`)
  - `s.tags` ✅ (backend returns `tags || []`)
  - `s.price` ✅
  - `s.status` ✅
  - `s.capacity` ⚠️ — Screen reads `s.capacity` but backend does NOT return `capacity`. Backend returns `viewCount`, `inquiryCount`, `bookingCount`. **`capacity` is undefined.**
  - `s.imageCount` ⚠️ — Screen reads `s.imageCount` but backend does NOT return `imageCount`. **`imageCount` is undefined.**

**Verdict:** ❌ BROKEN
**Root cause:** `VendorHomeScreen.js:63-64` reads `s.capacity` and `s.imageCount` which do not exist in the backend response shape. Backend returns `viewCount`, `bookingCount`, `inquiryCount` instead.
**Impact:** `guestCount` and `photoCount` will always be `null` for all services.
**Fix:** Change `VendorHomeScreen.js:63-64` to use available fields:
```js
guestCount: s.bookingCount || null,
photoCount: s.viewCount || null,
```
Or add `capacity` and `imageCount` to the backend `_formatService()` method.

---

### Call 3: POST /api/v2/services (add service)

**Discovery chain:**
`VendorHomeScreen.js:108` → `addServiceMutation.mutate(payload)` → `vendorService.addService(data)` → `POST /api/v2/services` → `servicesController.createService` → `servicesService.createService`

**Caller → Mutation:**
- Caller sends: `{ name, type, description, price, tags, image }` (VendorHomeScreen.js:100-106)
- Mutation expects: `(data)` — receives the full object
- Mismatch: None at this layer

**Mutation → Backend:**
- Service builds FormData with fields: `name`, `type`, `description`, `price`, `tags` (JSON-stringified), `image` (vendorService.js:112-125)
- Backend route uses `uploadServiceImage` middleware, controller reads `req.body` + `req.file` (services.routes.js:194)
- Controller parses `tags` from JSON string and `price` from string (services.controller.js:62-69)
- Backend expects: `name`, `description`, `category`, `price` (swagger: services.routes.js:173-185)
- **MISMATCH:** Frontend sends `type` field, but backend swagger says it expects `category`. However, the ServiceModel stores the field as `type`, and the controller passes `req.body` directly to the service. The backend `_formatService` returns `category: service.type` (services.service.js:301). So `type` in the request body maps to `type` in the model — this actually works, but the swagger docs are misleading.
- **MISMATCH:** Frontend sends `tags` as JSON-stringified array. Backend controller parses it (services.controller.js:64-65). ✅ Works.
- **MISMATCH:** Frontend sends `price` as string. Backend controller does `parseFloat(body.price)` (services.controller.js:67-68). ✅ Works.

**Backend Response:**
- Success shape: `{ success: "success", data: { service: { id, name, ... } } }` (HTTP 201)
- Error shape: `{ message: "..." }` (HTTP 400)

**Frontend Response Handling:**
- Mutation returns `response.data` (useVendorMutations.js:68)
- Screen only uses `onSuccess`/`onError` callbacks, doesn't read the response body
- Mismatch: None

**Verdict:** ✅ OK (with minor swagger doc discrepancy — `type` vs `category` in docs)

---

### Call 4: DELETE /api/v2/services/:id

**Discovery chain:**
`VendorHomeScreen.js:78` → `deleteServiceMutation.mutate(serviceId)` → `vendorService.deleteService(serviceId)` → `DELETE /api/v2/services/:id` → `servicesController.deleteService` → `servicesService.deleteService`

**Caller → Mutation:**
- Caller sends: `serviceId` (string)
- Mutation expects: `(serviceId)` — matches
- Mismatch: None

**Mutation → Backend:**
- Service calls: `apiClient.delete(\`/services/${serviceId}\`)` (vendorService.js:153)
- Backend reads: `req.params.id` with `validateObjectId` middleware
- Mismatch: None

**Backend Response:**
- Success shape: `{ success: "success", data: null, message: "Service deleted" }` (HTTP 200)
- Error shape: `{ message: "Service not found" }` (HTTP 404)

**Frontend Response Handling:**
- Screen only uses `onSuccess`/`onError` callbacks
- Mismatch: None

**Verdict:** ✅ OK

---

### Call 5: PATCH /api/v2/services/:id/toggle-status

**Discovery chain:**
`VendorHomeScreen.js:91` → `toggleStatusMutation.mutate(serviceId)` → `vendorService.toggleServiceStatus(serviceId)` → `PATCH /api/v2/services/:id/toggle-status` → `servicesController.toggleServiceStatus` → `servicesService.toggleServiceStatus`

**Caller → Mutation:**
- Caller sends: `serviceId` (string)
- Mutation expects: `(serviceId)` — matches
- Mismatch: None

**Mutation → Backend:**
- Service calls: `apiClient.patch(\`/services/${serviceId}/toggle-status\`)` (vendorService.js:65-66)
- Backend reads: `req.params.id` with `validateObjectId` middleware
- Mismatch: None

**Backend Response:**
- Success shape: `{ success: "success", data: { service: { ... } } }`
- Error shape: `{ message: "Service not found" }` (HTTP 404)

**Frontend Response Handling:**
- Screen only uses `onError` callback (no success toast in VendorHomeScreen)
- Mismatch: None

**Verdict:** ✅ OK

---

## Page: halla-mobile/screens/VendorServicesScreen.js

### API Calls Discovered: 4

---

### Call 1: GET /api/v2/services

**Discovery chain:**
`VendorServicesScreen.js:42` → `useVendorServices()` → `vendorService.getServices()` → `GET /api/v2/services` → `servicesController.getMyServices` → `servicesService.getMyServices`

**Caller → Hook:**
- Caller receives: `data` from `useVendorServices()`
- Hook queryFn returns: `response.data || []` (useVendor.js:55)
- Mismatch: None

**Backend Response:**
- Same as VendorHomeScreen Call 2 above

**Frontend Response Handling:**
- Screen maps services at VendorServicesScreen.js:50-70:
  - `s.id` ✅
  - `s.name` ✅
  - `s.image` ✅
  - `s.tags` ✅
  - `s.price` ✅
  - `s.status` ✅
  - `s.rating` ✅ (backend returns `rating || 0`)
  - `s.category` ✅ (backend returns `category: service.type`)
  - `s.description` ✅
- Mismatch: None

**Verdict:** ✅ OK

---

### Call 2: POST /api/v2/services (add service)

**Discovery chain:**
`VendorServicesScreen.js:144` → `addServiceMutation.mutate(payload)` → `vendorService.addService(data)` → `POST /api/v2/services`

**Caller → Mutation:**
- Caller sends: `{ name, type, description, price, image, tags }` (VendorServicesScreen.js:120-127)
- Mutation expects: `(data)` — matches
- Mismatch: None

**Mutation → Backend:**
- Same as VendorHomeScreen Call 3 above
- Mismatch: None

**Verdict:** ✅ OK

---

### Call 3: PATCH /api/v2/services/:id (update service)

**Discovery chain:**
`VendorServicesScreen.js:131` → `updateServiceMutation.mutate({ serviceId, data })` → `vendorService.updateService(serviceId, data)` → `PATCH /api/v2/services/:id` → `servicesController.updateService` → `servicesService.updateService`

**Caller → Mutation:**
- Caller sends: `{ serviceId: editingService.id, data: payload }` (VendorServicesScreen.js:132)
- Mutation expects: `({ serviceId, data })` (useVendorMutations.js:81) — matches
- Mismatch: None

**Mutation → Backend:**
- Service builds FormData with: `name`, `description`, `type`, `price`, `tags`, `image` (vendorService.js:131-147)
- Backend controller parses `tags` from JSON and `price` from string (services.controller.js:80-87)
- Mismatch: None

**Backend Response:**
- Success shape: `{ success: "success", data: { service: { ... } } }`
- Error shape: `{ message: "Service not found" }` (HTTP 404)

**Frontend Response Handling:**
- Screen only uses `onSuccess`/`onError` callbacks
- Mismatch: None

**Verdict:** ✅ OK

---

### Call 4: DELETE /api/v2/services/:id

**Same trace as VendorHomeScreen Call 4.**

**Verdict:** ✅ OK

---

### Call 5: PATCH /api/v2/services/:id/toggle-status

**Same trace as VendorHomeScreen Call 5.**

**Verdict:** ✅ OK

---

## Page: halla-mobile/screens/VendorSettingsScreen.js

### API Calls Discovered: 0 (indirect via child components)

This screen has no direct API calls. It renders `VendorSettingsTabs` which is purely UI. The `handleLogout` calls `useAuthStore.logout()` which calls `logoutAPI` → `POST /api/v2/auth/logout`.

### Call 1: POST /api/v2/auth/logout

**Discovery chain:**
`VendorSettingsScreen.js:15` → `useAuthStore.logout()` → `logoutAPI()` → `POST /api/v2/auth/logout` → `authController.logout` → `authService.revokeRefreshToken`

**Caller → Store:**
- Caller calls: `await logout()` (no arguments)
- Store method: `logout: async () => { ... await logoutAPI({ accessToken, refreshToken }) }` (authStore.js:307-319)
- Mismatch: None

**Store → Backend:**
- Service calls: `fetchWithTimeout(\`${API_BASE_URL}/auth/logout\`, { method: "POST", headers: { Authorization }, body: JSON.stringify({ refreshToken }) })` (authService.js:486-493)
- Backend reads: `req.body.refreshToken` or `req.cookies.refresh_token` (auth.controller.js:156)
- Mismatch: None

**Backend Response:**
- Success shape: `{ status: "success", data: null, message: "Logged out successfully" }`
- Error: Swallowed silently (authService.js:494-497)

**Frontend Response Handling:**
- Store clears local state regardless of network outcome
- Screen shows toast after logout (VendorSettingsScreen.js:16)
- Mismatch: None

**Verdict:** ✅ OK

---

## Page: halla-mobile/screens/VendorSignupScreen.js

### API Calls Discovered: 1

---

### Call 1: POST /api/v2/auth/signup/vendor

**Discovery chain:**
`VendorSignupScreen.js:62` → `signupVendor(data)` → `signupVendorAPI(vendorData)` → `POST /api/v2/auth/signup/vendor` → `authController.vendorSignup` → `authService.signupVendor`

**Caller → Mutation:**
- Caller sends: full form data object with nested structure: `{ identity: {...}, serviceData: {...}, samplesAndPackages: {...}, commercialVerification: {...}, socialLinks: {...} }` (VendorSignupScreen.js:38-44)
- Mutation expects: `(vendorData)` — receives the full object
- Mismatch: **POTENTIAL ISSUE** — The screen passes a nested object, but `signupVendorAPI` expects to build FormData from flat fields (authService.js:88-101). The service iterates `Object.entries(vendorData)` and appends each key-value pair. With nested objects like `identity.brandName`, the key would be `"identity"` and the value would be the entire nested object `{ brandName: "...", ... }`. When appended to FormData, this becomes `[object Object]`.

**Mutation → Backend:**
- Service builds FormData by iterating top-level keys: `businessLogo`, `nationalIdImage`, `commercialRecordImage`, `portfolioImages` are treated as file fields; everything else is appended as-is (authService.js:91-100)
- The screen's data has keys: `identity`, `serviceData`, `samplesAndPackages`, `commercialVerification`, `socialLinks` — none of which match the file field list
- So `formData.append("identity", { brandName: "...", ... })` → becomes `[object Object]`
- Backend expects flat fields: `email`, `phoneNumber`, `password`, `brandName`, `ownerFullName`, `serviceDescription`, `nationalId`, `nationalIdImage`, `commercialRecordImage`, etc. (auth.routes.js:167-173)
- **MISMATCH:** The frontend sends nested objects that serialize to `[object Object]`, but the backend expects flat fields at the root level.

**Backend Response:**
- Success shape: `{ status: "success", token: null, refreshToken: null, data: { user: {...}, pendingApproval: true } }` (HTTP 201)
- Error shape: `{ message: "..." }` (HTTP 400)

**Frontend Response Handling:**
- Screen catches error and shows toast (VendorSignupScreen.js:65-67)
- On success, navigates to Login (VendorSignupScreen.js:64)
- **MISMATCH:** The backend returns `token: null` and `refreshToken: null` for vendor signup (pending approval). The `authStore.signupVendor` method handles this correctly (authStore.js:244-254), but the screen's `signupVendor` call comes from `useVendorSignup()` which calls `signupVendorAPI` directly — not through the auth store. The screen does `await signupVendor(data)` and then `toast.success(t('common.success'))` and `navigation.navigate('Login')`. This means the screen shows success even though the vendor is pending approval and cannot log in yet.

**Verdict:** ❌ BROKEN
**Root cause 1 (CRITICAL):** `authService.js:88-101` builds FormData from top-level keys of the vendorData object. The screen sends nested objects (`identity`, `serviceData`, etc.) which serialize to `[object Object]` in FormData. Backend expects flat fields (`email`, `brandName`, `phoneNumber`, etc.).
**Root cause 2 (UX):** Screen navigates to Login immediately after signup success, but vendor accounts require admin approval first. The user will not be able to log in.
**Impact:** Vendor signup always fails with validation errors (missing required fields like email, brandName, etc.) because the FormData contains `[object Object]` instead of actual values.
**Fix:** 
1. Flatten the form data in `signupVendorAPI` or restructure the screen's form to produce flat FormData. The `signupVendorAPI` service needs to handle the nested structure:
```js
// In authService.js, flatten nested fields:
formData.append('email', vendorData.identity?.email);
formData.append('phoneNumber', vendorData.identity?.phoneNumber);
formData.append('password', vendorData.identity?.password);
formData.append('brandName', vendorData.identity?.brandName);
formData.append('ownerFullName', vendorData.identity?.ownerFullName);
formData.append('serviceDescription', vendorData.serviceData?.serviceDescription);
// ... etc
```
2. Change the success navigation to show a "pending approval" screen instead of redirecting to Login.

---

## Page: halla-mobile/screens/VendorTicketsScreen.js

### API Calls Discovered: 4

---

### Call 1: GET /api/v2/tickets

**Discovery chain:**
`VendorTicketsScreen.js:17` → `useTickets()` → `getTicketsAPI(token, filters)` → `GET /api/v2/tickets` → `ticketsController.getTickets` → `ticketsService.getTickets`

**Caller → Hook:**
- Caller receives: `response` from `useTickets()`
- Hook queryFn returns: `response` (raw API response, NOT unwrapped) (useTickets.js:15)
- Mismatch: **ISSUE** — The hook returns the raw response object `{ data: [...], pagination: {...} }` directly, not unwrapped.

**Hook → Backend:**
- Service calls: `apiFetch(path, { method: "GET" })` then `response.json()` (ticketsService.js:13-16)
- Backend returns via `sendPaginated(res, result.data, result.pagination)` → `{ success: "success", data: [...], pagination: {...} }`
- Mismatch: None at service level

**Backend Response:**
- Success shape: `{ success: "success", data: [{ id, ticketNumber, type, subject, message, status, priority, source, ... }], pagination: { page, limit, total, pages } }`
- Error shape: `{ message: "..." }` (HTTP 401)

**Frontend Response Handling:**
- Screen reads: `response?.data?.data || response?.data || []` (VendorTicketsScreen.js:27)
- The `getTicketsAPI` returns the parsed JSON body directly (ticketsService.js:16: `return data`)
- So `response` = `{ success, data: [...], pagination }`
- `response?.data?.data` = undefined (because `data` is the array, not an object with nested `data`)
- `response?.data` = the tickets array ✅
- The fallback chain works: `response?.data?.data` is undefined, so it falls through to `response?.data` which is the array
- Mismatch: None (works by accident due to fallback chain, but the double `?.data?.data` suggests the developer expected a different response shape)

**Verdict:** ⚠️ PARTIAL
**Root cause:** The response extraction `response?.data?.data || response?.data || []` is fragile. It works because `getTicketsAPI` returns the raw JSON body, but the `?.data?.data` path suggests confusion about the response shape. If the API response envelope changes, this could break.
**Impact:** Currently works, but the code is misleading and fragile.
**Fix:** Simplify to `response?.data || []` since `getTicketsAPI` returns the parsed body directly.

---

### Call 2: POST /api/v2/tickets (create ticket)

**Discovery chain:**
`VendorTicketsScreen.js:78` → `createMutation.mutateAsync(formData)` → `ticketRequest('POST', ENDPOINTS.TICKETS.BASE, null, data)` → `apiFetch(path, { method, body })` → `POST /api/v2/tickets` → `ticketsController.createTicket` → `ticketsService.createTicket`

**Caller → Mutation:**
- Caller sends: `{ type, message }` (formData state) (VendorTicketsScreen.js:24)
- Mutation expects: `(data)` — matches
- Mismatch: None

**Mutation → Backend:**
- `ticketRequest` calls `apiFetch(path, { method: 'POST', body: data })` (useTicketMutations.js:11-14)
- `apiFetch` JSON-stringifies the body (apiClient.js:143-144)
- Backend reads: `req.body` (tickets.controller.js:64)
- Backend service creates ticket with `{ ...ticketData, user, source, priority, whitelabelId }` (tickets.service.js:181-187)
- Mismatch: None

**Backend Response:**
- Success shape: `{ success: "success", data: { ticket: { id, ticketNumber, type, message, status, priority, ... } } }` (HTTP 201)
- Error shape: `{ message: "..." }` (HTTP 400)

**Frontend Response Handling:**
- `ticketRequest` parses JSON and returns it (useTicketMutations.js:15)
- Screen only uses `onSuccess`/`onError` via toast
- Mismatch: None

**Verdict:** ✅ OK

---

### Call 3: PATCH /api/v2/tickets/:id (update ticket)

**Discovery chain:**
`VendorTicketsScreen.js:75` → `updateMutation.mutateAsync({ ticketId, data })` → `ticketRequest('PATCH', \`${ENDPOINTS.TICKETS.BASE}/${ticketId}\`, null, data)` → `apiFetch` → `PATCH /api/v2/tickets/:id` → `ticketsController.updateTicket` → `ticketsService.updateTicket`

**Caller → Mutation:**
- Caller sends: `{ ticketId: editingTicket.id || editingTicket._id, data: formData }` (VendorTicketsScreen.js:75)
- Mutation expects: `({ ticketId, data })` (useTicketMutations.js:35) — matches
- Mismatch: None

**Mutation → Backend:**
- Backend reads: `req.params.id`, `req.body` (tickets.controller.js:98-104)
- Backend service allows non-admin fields: `["subject", "message", "type"]` (tickets.service.js:356)
- Frontend sends: `{ type, message }` — both are in the allowed list
- Mismatch: None

**Backend Response:**
- Success shape: `{ success: "success", data: { ticket: { ... } } }`
- Error shape: `{ message: "..." }` (HTTP 403/404)

**Frontend Response Handling:**
- Screen only uses toast on success/error
- Mismatch: None

**Verdict:** ✅ OK

---

### Call 4: DELETE /api/v2/tickets/:id

**Discovery chain:**
`VendorTicketsScreen.js:60` → `deleteMutation.mutateAsync(ticketId)` → `ticketRequest('DELETE', \`${ENDPOINTS.TICKETS.BASE}/${ticketId}\`, null)` → `apiFetch` → `DELETE /api/v2/tickets/:id` → `ticketsController.deleteTicket` → `ticketsService.deleteTicket`

**Caller → Mutation:**
- Caller sends: `ticketId` (string)
- Mutation expects: `(ticketId)` — matches
- Mismatch: None

**Mutation → Backend:**
- Backend reads: `req.params.id` (tickets.controller.js:112)
- Backend service checks ownership: `!isAdmin && ticket.user.toString() !== userId.toString()` (tickets.service.js:333)
- Mismatch: None

**Backend Response:**
- Success shape: `{ success: "success", data: null, message: "Ticket deleted" }` (HTTP 200)
- Error shape: `{ message: "..." }` (HTTP 403/404)

**Frontend Response Handling:**
- Screen only uses toast on success/error
- Mismatch: None

**Verdict:** ✅ OK

---

## Page: halla-mobile/screens/VendorAccountSetupScreen.js

### API Calls Discovered: 3

---

### Call 1: GET /api/v2/users/profile

**Discovery chain:**
`VendorAccountSetupScreen.js:22` → `useVendorProfile()` → `vendorService.getProfile()` → `GET /api/v2/users/profile` → `usersController.getMyProfile` → `usersService.getMyProfile`

**Caller → Hook:**
- Caller receives: `data` from `useVendorProfile()`
- Hook queryFn returns: `response.data?.user || response.data` (useVendor.js:17)
- Mismatch: None

**Hook → Backend:**
- Service calls: `apiClient.get("/users/profile")` (vendorService.js:47)
- Backend returns via `sendSuccess(res, result)` where result = `{ user: user.toPublicJSON() }` (users.controller.js:186-187)
- Mismatch: None

**Backend Response:**
- Success shape: `{ success: "success", data: { user: { _id, name, email, phoneNumber, role, profile: { vendorData: { brandName, ownerFullName, serviceDescription, nationalId, nationalIdImage, commercialRecordImage, serviceLocation, serviceCategories, portfolioImages, pricePackages, socialLinks, businessLogo, ... } } } } }`
- Error shape: `{ message: "..." }` (HTTP 401)

**Frontend Response Handling:**
- `apiClient` returns `response.data`, hook receives `{ success, data: { user } }`
- Hook unwraps: `response.data?.user || response.data` → returns the user object
- Screen reads:
  - `vendorData?.roleData?.ownerFullName` ⚠️ — Screen reads `roleData` but the backend response has `profile.vendorData`, not `roleData`. The fallback `vendorData?.name` would work.
  - `vendorData?.roleData?.businessLogo` ⚠️ — Same issue. Fallback `vendorData?.avatar` would work.
  - `vendorData?.roleData?.serviceDescription` ⚠️ — Should be `vendorData?.profile?.vendorData?.serviceDescription`
  - `vendorData?.email` ✅
  - `vendorData?.roleData?.nationalId` ⚠️ — Same issue
  - `vendorData?.roleData?.socialLinks?.website` ⚠️ — Same issue
- **MISMATCH:** The screen consistently reads `vendorData?.roleData?.X` but the backend returns `vendorData?.profile?.vendorData?.X`. The `roleData` property does not exist in the backend response.

**Verdict:** ❌ BROKEN
**Root cause:** `VendorAccountSetupScreen.js:108-144` reads `vendorData?.roleData?.X` throughout, but the backend `getMyProfile` returns `{ user: { profile: { vendorData: {...} } } }`. The hook unwraps to the user object, so the correct path would be `vendorData?.profile?.vendorData?.X`.
**Impact:** All profile fields display as empty/default values. The account setup form shows no pre-filled data.
**Fix:** Change all `vendorData?.roleData?.X` to `vendorData?.profile?.vendorData?.X` throughout VendorAccountSetupScreen.js. Alternatively, update the hook to flatten the response shape.

---

### Call 2: PATCH /api/v2/users/profile/:section (JSON update)

**Discovery chain:**
`VendorAccountSetupScreen.js:73` → `updateMutation.mutateAsync({ section, data })` → `vendorService.updateSection(section, data)` → `PATCH /api/v2/users/profile/:section` → `usersController.updateMyProfileSection` → `usersService.updateMyProfileSection`

**Caller → Mutation:**
- Caller sends: `{ section: "vendorData", data: {...} }` (VendorAccountSetupScreen.js:73)
- Mutation expects: `({ section, data })` (useVendorMutations.js:8) — matches
- Mismatch: None

**Mutation → Backend:**
- Service calls: `apiClient.patch(\`/users/profile/${section}\`, data)` (vendorService.js:73)
- Backend reads: `req.params.section`, `req.body` (users.controller.js:228-246)
- Backend validates section against `["hostData", "vendorData", "businessInfo", "contactInfo", "documents"]` (users.service.js:850-851)
- Frontend sends `section: "vendorData"` ✅
- Backend merges data into `user.profile[section]` (users.service.js:862)
- Mismatch: None

**Backend Response:**
- Success shape: `{ success: "success", data: { user: { ... } } }`
- Error shape: `{ message: "Invalid profile section: vendorData" }` (HTTP 400)

**Frontend Response Handling:**
- Screen only uses toast on success/error
- Mismatch: None

**Verdict:** ✅ OK

---

### Call 3: PATCH /api/v2/users/profile/:section (file upload update)

**Discovery chain:**
`VendorAccountSetupScreen.js:71` → `updateWithFilesMutation.mutateAsync({ section, formData })` → `vendorService.updateSectionWithFiles(section, formData)` → `PATCH /api/v2/users/profile/:section` → `usersController.updateMyProfileSection` → `usersService.updateMyProfileSection`

**Caller → Mutation:**
- Caller sends: `{ section: "vendorData", formData: FormData }` (VendorAccountSetupScreen.js:71)
- Mutation expects: `({ section, formData })` (useVendorMutations.js:22) — matches
- Mismatch: None

**Mutation → Backend:**
- Service calls: `apiClient.patch(\`/users/profile/${section}\`, formData)` (vendorService.js:79-80)
- The axios interceptor deletes `Content-Type` header for FormData (vendorService.js:33-34) ✅
- Backend uses `uploadUserProfile` middleware + controller (users.routes.js:157-161)
- Controller parses JSON fields: `serviceCategories`, `serviceLocation`, `socialLinks`, `pricePackages`, `portfolioImages` (users.controller.js:233-237)
- Service handles uploaded files via `processUploadedFiles` (users.service.js:879-900)
- Mismatch: None

**Backend Response:**
- Success shape: `{ success: "success", data: { user: { ... } } }`
- Error shape: `{ message: "..." }` (HTTP 400)

**Frontend Response Handling:**
- Screen only uses toast on success/error
- Mismatch: None

**Verdict:** ✅ OK

---

## Summary

| Screen | API Calls | ✅ OK | ❌ BROKEN | ⚠️ PARTIAL |
|--------|-----------|-------|-----------|------------|
| VendorHomeScreen | 5 | 4 | 1 | 0 |
| VendorServicesScreen | 5 | 5 | 0 | 0 |
| VendorSettingsScreen | 1 | 1 | 0 | 0 |
| VendorSignupScreen | 1 | 0 | 1 | 0 |
| VendorTicketsScreen | 4 | 3 | 0 | 1 |
| VendorAccountSetupScreen | 3 | 2 | 1 | 0 |
| **TOTAL** | **19** | **15** | **3** | **1** |

---

## Critical Issues (Must Fix)

### 1. VendorSignupScreen — FormData nested object serialization (CRITICAL)
**File:** `halla-mobile/services/authService.js:88-101`
**Issue:** `signupVendorAPI` iterates top-level keys of the form data object. The screen sends nested objects (`identity`, `serviceData`, etc.) which serialize to `[object Object]` in FormData. Backend expects flat fields.
**Fix:** Flatten the nested form data structure when building FormData in `signupVendorAPI`, or restructure the screen's form to produce flat data.

### 2. VendorAccountSetupScreen — Wrong property path for profile data (CRITICAL)
**File:** `halla-mobile/screens/VendorAccountSetupScreen.js:108-144`
**Issue:** Screen reads `vendorData?.roleData?.X` but backend returns `vendorData?.profile?.vendorData?.X`.
**Fix:** Replace all `roleData` references with `profile?.vendorData`.

### 3. VendorHomeScreen — Non-existent fields in service mapping (MODERATE)
**File:** `halla-mobile/screens/VendorHomeScreen.js:63-64`
**Issue:** Screen reads `s.capacity` and `s.imageCount` which do not exist in the backend response.
**Fix:** Use available fields (`bookingCount`, `viewCount`) or add the missing fields to the backend `_formatService()`.

---

## Minor Issues (Should Fix)

### 4. VendorTicketsScreen — Fragile response extraction (LOW)
**File:** `halla-mobile/screens/VendorTicketsScreen.js:27`
**Issue:** `response?.data?.data || response?.data || []` — the `?.data?.data` path is incorrect but masked by the fallback.
**Fix:** Simplify to `response?.data || []`.

### 5. VendorHomeScreen — Hardcoded Arabic strings (LOW)
**File:** `halla-mobile/screens/VendorHomeScreen.js:72-80`
**Issue:** Delete confirmation and toast messages are hardcoded in Arabic instead of using `t()` translations.
**Fix:** Use `t("services.deleteConfirm")`, etc. like VendorServicesScreen does.

### 6. VendorHomeScreen — Missing edit service functionality (LOW)
**File:** `halla-mobile/screens/VendorHomeScreen.js:181`
**Issue:** `onEditService={() => setAddPopupVisible(true)}` opens the add popup without passing the service to edit. VendorServicesScreen correctly passes the service object.
**Fix:** Pass the service to `setEditingService` like VendorServicesScreen does.
