# 24 — Vendor Onboarding

## One-paragraph description
Vendor registration → initial status = "pending" → admin reviews vendor application (documents, brand name, description) → admin can approve (status = "approved", vendor approval email sent, vendor can now log in and access dashboard) or decline (status = "rejected") → after approval, vendor can complete profile setup (brand name, description, portfolio images, service location, social links, price packages) and create service listings. Admins can also bulk-manage vendors (bulk delete, update rating, suspend). Web admin has full vendor management UI; mobile admin has limited vendor screens but may lack some bulk operations.

## Scope tags
- vendor registration, signup flow
- approval workflow (pending → approved/rejected)
- vendor status management (active, suspended, rejected)
- email notification on approval
- admin bulk operations (delete, rating update, suspension)
- whitelabel vendor isolation

## Roles involved
- **Vendor**: register, submit application, view approval status, log in after approval, complete profile
- **Host**: none (hosts do not manage vendors directly)
- **Admin / Super Admin**: review vendor applications, approve/reject, view all vendors, bulk delete, update rating, suspend vendors, export vendor list
- **Whitelabel Admin**: manage vendors within their whitelabel tenant only

## Entry points (cite file:line)
- **Vendor signup (register)**: `labbe-backend-/src/modules/auth/auth.routes.js:130-135` POST `/auth/signup/vendor` → `auth.controller.vendorSignup:105`
- **Vendor signup service**: `labbe-backend-/src/modules/auth/auth.service.js` (inferred; `signupVendor` method)
- **Get vendors (admin)**: `labbe-backend-/src/modules/admin/admin.routes.js:377` GET `/admin/vendors` → `adminController.getVendors`
- **Update vendor status (approve/reject/suspend)**: `labbe-backend-/src/modules/admin/admin.routes.js:453` PATCH `/admin/vendors/:id/status` → `adminController.updateVendorStatus` (single endpoint handles approve, reject, and suspend via `status` body field; no separate approve or reject endpoint exists)
- **Update vendor rating (admin)**: `labbe-backend-/src/modules/admin/admin.routes.js:493` PATCH `/admin/vendors/:id/rating` → `adminController.updateVendorRating`
- **Bulk delete vendors**: `labbe-backend-/src/modules/admin/admin.routes.js:559` POST `/admin/vendors/bulk-delete` → `adminController.bulkDeleteVendors`
- **Bulk status update vendors**: `labbe-backend-/src/modules/admin/admin.routes.js:594` POST `/admin/vendors/bulk-status` → `adminController.bulkUpdateVendorStatus`
- **Export vendors**: `labbe-backend-/src/modules/admin/admin.routes.js:407` GET `/admin/vendors/export` → `adminController.exportVendors`
- **Mobile vendor signup**: `halla-mobile/screens/VendorSignupScreen.js` (inferred; signup form)

## Exit / terminal states
- **Vendor approved**: status = "approved", user can log in, vendor dashboard accessible
- **Vendor rejected**: status = "rejected", user cannot log in, application blocked
- **Vendor suspended**: status = "suspended", user can log in but vendor services not visible in marketplace
- **Vendor deleted**: physically removed from DB (admin bulk operation)

## Touched modules (file paths by repo)
### labbe-backend-
- `src/modules/auth/auth.routes.js` (lines 130-135) — POST `/auth/signup/vendor` endpoint definition
- `src/modules/auth/auth.controller.js:105` — `vendorSignup()` handler
- `src/modules/auth/auth.service.js` — `signupVendor()` method (inferred; creates pending vendor user, calls email service)
- `src/modules/admin/admin.routes.js` — vendor-related endpoints (CRUD, approval, bulk ops, export)
- `src/modules/admin/admin.controller.js` — vendor handlers
- `src/modules/admin/admin.service.js` — vendor business logic
- `models/UserModel.js` — User schema with role = "vendor", profile.vendorData (brandName, rating, vendorStatus, serviceCategories, etc.)
- `src/infrastructure/email.js` — vendor approval email template
- `src/shared/utils/fileUpload.js` — file upload for vendor documents (signup)

### halla-mobile
- `screens/VendorSignupScreen.js` — vendor registration form (email, phone, business name, docs upload)
- `services/vendorService.js` (inferred) — API calls for vendor endpoints
- `screens/` (inferred vendor admin screens) — list vendors, approve/reject (may be limited)

### labbe (web)
- `app/[lang]/admin-dash/vendors/` — vendor management page (built; list, approve, reject, manage)
- Vendor approval email template (in backend email infrastructure)

## Dependencies on other flows
- **Authentication** (Flow ?): vendor signup uses auth routes; uses phone/email verification
- **Vendor Profile & Services** (Flow 25): after approval, vendor moves to profile setup
- **Notifications** (Flow 27): approval email sent via notifications/email service
- **Email** (infrastructure): vendor approval email

## Known divergences (web ↔ mobile, frontend ↔ backend)
- **Email verification**: Backend signup may require OTP or email verification; exact flow unclear from routes alone (OTP routes present in auth.routes.js but not listed in assignment).
- **File uploads**: Backend supports `uploadVendorFiles()` middleware; mobile may have different file handling constraints (camera, gallery, size limits).
- **Admin bulk operations on mobile**: Mobile may lack bulk delete, bulk rating update UI; web admin likely has these.
- **Vendor status field**: Backend uses `vendorStatus` (inferred from admin.service.js line 77); may differ from `status` field on User (which can be "active", "suspended", "pending").
- **Whitelabel isolation**: Admin.service filters by `whitelabelId`; mobile should also respect this but unclear if enforced.
- **Profile completion check**: `admin.service.js:56` checks `profile?.vendorData?.profileCompleted`; frontend should track profile completion during onboarding.

## Open questions

**Q1: Email verification flow: Is email/phone OTP required during vendor signup or only during login?**

A: OTP is NOT required during vendor signup. `signupVendor()` creates the vendor record directly without any OTP step and returns `{ pendingApproval: true, token: null }` — no JWT is issued at signup. The vendor cannot log in until admin approves. Login uses email+password with no OTP step.

Source: `labbe-backend-/src/modules/auth/auth.service.js:306-377`

**Q2: Document approval: which documents are required? Stored and validated?**

A: Required data fields enforced at signup: `email`, `phoneNumber`, `password`, `brandName`, `ownerFullName`. Optional file uploads processed by the middleware: `businessLogo`, `nationalIdImage`, `commercialRecordImage`, `portfolioImages`. String reference fields `nationalId` and `commercialRecordNumber` are also accepted. No validation enforces that document images must be present — the service stores whatever files are provided.

Source: `labbe-backend-/src/modules/auth/auth.service.js:307-349`

**Q3: Approval email content: exact template and does it include login link?**

A:
**Current behavior:** `updateVendorStatus()` in `admin.service.js` sends only an in-app notification (`notificationService.sendToUser` with `type: 'vendor_approved'`) on approval. No email is sent in the approval path. During signup, `emailModule.send.vendorApplicationPending` sends a "pending" confirmation email — but no equivalent call exists for the approval transition.

**Assessment:** BUG

**Why:** A vendor who registers and closes the app will never know they were approved. In-app notification requires the app to be open or push notifications to be enabled, making it an unreliable out-of-band channel. Email is the expected standard for account state changes in marketplace vendor workflows.

**Recommended change:** Add `emailModule.send.vendorApproved(vendor.email, { loginUrl, brandName })` to `updateVendorStatus()` in `admin.service.js` when `vendorStatus` transitions to 'approved'. Mirror the existing `vendorApplicationPending` email pattern already used at signup.

Source: `labbe-backend-/src/modules/admin/admin.service.js:635-650`, `labbe-backend-/src/modules/auth/auth.service.js:364-370`

**Q4: Vendor status vs vendorStatus: how do they interact?**

A: Two separate fields govern vendor access. `User.status` (USER_STATUS enum: active/suspended/inactive/pending) controls account-level access. `profile.vendorData.vendorStatus` (VENDOR_STATUS enum: pending/approved/rejected/suspended) controls vendor-specific state. On approval: `status → active` and `vendorStatus → approved`. On rejection: `status → inactive` and `vendorStatus → rejected`. On suspension: `status → suspended` and `vendorStatus → suspended`. Login checks `vendorStatus` first — pending and rejected states block login regardless of `status`.

Source: `labbe-backend-/src/modules/admin/admin.service.js:620-630`, `labbe-backend-/src/modules/auth/auth.service.js:176-185`

**Q5: Mobile admin vendor approval UI: does mobile admin have approve/reject screens?**

A: Yes. Mobile has per-vendor approve, reject, suspend, and activate actions via the `VendorActions.js` component. The buttons rendered depend on the vendor's current status: pending vendors show an Approve button; active vendors show a Suspend button; suspended or inactive vendors show an Activate button. A Delete action is also available in all states.

Source: `halla-mobile/components/admin-dashboard/vendors/VendorActions.js:27-73`

**Q6: Bulk operations on mobile: are bulk delete, rating update, suspension implemented?**

A: Yes, all three bulk operations are implemented on mobile. `VendorList.js` imports and uses `useBulkDeleteVendors`, `useBulkApproveVendors`, and `useBulkSuspendVendors` hooks with a multi-select UI and a bulk action bar. Mobile parity with web admin exists for these operations.

Source: `halla-mobile/components/admin-dashboard/vendors/VendorList.js:35-37,172-193`

**Q7: Profile completion requirement: can vendor see marketplace before completing profile?**

A:
**Current behavior:** A `profileCompleted` flag exists at `profile.vendorData.profileCompleted` and is surfaced in `_formatUserResponse()`. No backend gate blocks marketplace visibility or listing creation when `profileCompleted: false`.

**Assessment:** WEAK

**Why:** A vendor who skips profile setup (no portfolio, no service description, no location) would appear in the marketplace with an empty listing, degrading the buyer experience. The flag exists but has no runtime enforcement.

**Recommended change:** In the marketplace query (Flow 26), add a filter on `profile.vendorData.profileCompleted: true` so incomplete profiles do not surface. Return a 403 with `{ reason: 'profile_incomplete' }` from any endpoint that creates a service listing if `profileCompleted: false`. Add a `PUT /vendors/me/complete-profile` endpoint that validates required fields and then sets `profileCompleted: true`.

Source: `labbe-backend-/src/modules/admin/admin.service.js:56`

## Notes from answer pass

- No vendor approval email is sent (only in-app notification). This is a gap — vendors who are not actively checking the app will not know they were approved. An approval email via `emailModule.send.vendorApproved(...)` should be added in `updateVendorStatus()`.
- The `(inferred)` tags in Entry points for admin vendor routes have been resolved from `admin.routes.js`. Approve and reject both go through `PATCH /admin/vendors/:id/status` (`admin.routes.js:453`) — there are no separate approve or reject endpoints. Bulk status updates go through `POST /admin/vendors/bulk-status` (`admin.routes.js:594`).

---

## State machine

```
REGISTERED (pendingApproval=true, token=null)
  → ADMIN_APPROVE  → APPROVED  (User.status=active, vendorStatus=approved)
  → ADMIN_REJECT   → REJECTED  (User.status=inactive, vendorStatus=rejected, rejectedAt set — record retained)

APPROVED
  → ADMIN_SUSPEND  → SUSPENDED (User.status=suspended, vendorStatus=suspended)

SUSPENDED
  → ADMIN_ACTIVATE → APPROVED  (User.status=active, vendorStatus=approved)
  → ADMIN_DELETE   → DELETED   (bulk delete, physical removal)

APPROVED
  → VENDOR_COMPLETE_PROFILE → PROFILE_COMPLETED (profileCompleted=true — no gate enforced)
```

Terminal states:
- **DELETED** — vendor and all associated services are physically removed via explicit bulk-delete; irreversible.
- **REJECTED** — soft state: `User.status = inactive`, `vendorStatus = rejected`, `rejectedAt` timestamp written. The vendor record is retained in the database. Login is blocked (`_checkVendorStatus` blocks rejected status). No hard-delete occurs on rejection.

Notable asymmetry: suspension is recoverable (`SUSPENDED → APPROVED`); rejection blocks login but the record persists and can theoretically be re-approved. There is no UI to re-approve a rejected vendor, but the data is not destroyed.

Source: `labbe-backend-/src/modules/admin/admin.service.js:625-627`

---

## Data handoffs

| Step | Producer | Consumer | Payload | Validation? |
|------|----------|----------|---------|-------------|
| Vendor signup form submit | Mobile/Web frontend | POST `/auth/signup/vendor` | email, phoneNumber, password, brandName, ownerFullName, serviceDescription, serviceCategories, serviceLocation, socialLinks, nationalId, commercialRecordNumber, businessLogo (file), nationalIdImage (file), commercialRecordImage (file), portfolioImages (files) | Server: email+phone+brandName+ownerFullName required; document files optional with no presence enforcement |
| Signup success | Backend auth service | Vendor (email) | `vendorApplicationPending` email with ownerFullName, brandName | No — email send is fire-and-forget (`.catch`) |
| Signup success | Backend auth service | Admins (in-app notification) | `new_vendor_application` in-app notification | No — non-blocking `.catch` |
| Admin fetches vendor list | GET `/admin/vendors` | Admin UI (web/mobile) | Paginated vendor records including vendorStatus, documents, profileCompleted | Auth required (admin role); whitelabelId scope applied if present |
| Admin approves vendor | PATCH `/admin/vendors/:id/status` | Backend admin service | `{ status: "approved" }` | Auth required (admin role); vendor must exist with role=vendor |
| Approval transition | Backend admin service | Vendor (in-app notification) | `vendor_approved` notification | No — non-blocking `.catch` |
| Approval transition | Backend admin service | Vendor (email) | **Not sent** — no approval email exists | N/A |
| Admin rejects vendor | PATCH `/admin/vendors/:id/status` | Backend admin service | `{ status: "rejected", rejectionMessage? }` | Auth required; sets User.status=inactive, vendorStatus=rejected, writes rejectedAt — record retained |
| Admin suspends vendor | PATCH `/admin/vendors/:id/status` | Backend admin service | `{ status: "suspended" }` | Auth required; sends suspension in-app notification |
| Vendor completes profile | PATCH `/users/profile/vendorData` | Backend users service | brandName, serviceDescription, portfolioImages, serviceLocation, socialLinks, documents | Auth required (vendor role); profileCompleted flag exists but is not set by this endpoint automatically |

---

## Role variations

| Role | CAN | CANNOT | Notes |
|------|-----|--------|-------|
| Vendor (pending) | Register, receive pending email | Log in, access dashboard, create services | Token is null at signup; login blocked until approved |
| Vendor (approved) | Log in, complete profile, create/manage services, view own stats | Approve/reject other vendors, view admin dashboard | profileCompleted flag has no backend enforcement |
| Vendor (suspended) | Log in (account accessible) | Services not visible in marketplace | Suspension sends in-app notification only |
| Admin / Super Admin | Approve, reject, suspend, activate any vendor; bulk delete; update rating; export list | None on vendor management | Rejection is a soft-state change (record retained); physical deletion requires explicit bulk-delete |
| Whitelabel Admin | Manage vendors scoped to own whitelabelId | Manage vendors in other whitelabels | Scoping applied in admin.service updateVendorStatus/getVendors |
| Host | None on vendor management | Cannot register as vendor via host flow | |

---

## Web ↔ mobile parity

| Feature | Web | Mobile | Gap? |
|---------|-----|--------|------|
| Vendor signup form | Yes (`app/[lang]/vendor-signup/`) | Yes (`VendorSignupScreen.js`) | No — both POST to `/auth/signup/vendor` |
| Admin vendor list | Yes | Yes (`VendorList.js` with multi-select) | No |
| Per-vendor approve/reject/suspend | Yes | Yes (`VendorActions.js`) | No |
| Bulk delete vendors | Yes | Yes (`useBulkDeleteVendors`) | No |
| Bulk approve/suspend | Yes | Yes (`useBulkApproveVendors`, `useBulkSuspendVendors`) | No |
| Vendor rating update | Yes | Yes | No |
| Export vendor list | Yes (GET `/admin/vendors/export`) | Unknown — no mobile export UI found | Possible gap |
| Profile completion setup | Web vendor dashboard has full settings page | Mobile `VendorAccountSetupScreen.js` exists; full parity unclear | See Flow 25 for detail |
| Approval email to vendor | Not sent (backend gap) | Not sent (backend gap) | Gap — both affected by same backend issue |

---

## Edge cases & failure modes

- **Rejection has no recovery UI.** A single PATCH request with `status: "rejected"` sets `User.status = inactive` and `vendorStatus = rejected` with a `rejectedAt` timestamp — the record is retained. However, no admin UI allows re-approving a rejected vendor. There is also no audit trail recording which admin performed the rejection or why.
- **Approval email absent.** On approval, only an in-app notification is sent. If push notifications are off or the vendor has not opened the app, they receive no signal that their account is approved. Vendors may wait indefinitely or reapply, causing duplicate records.
- **File uploads to local disk at signup.** Vendor document images (nationalIdImage, commercialRecordImage, portfolioImages, businessLogo) are saved to `/uploads/...` paths on the local filesystem, not S3. In a multi-instance deployment these files are not accessible across instances and will be lost on container restart. (Same root cause as FLOW-03-F03.)
- **profileCompleted flag has no enforcement.** An approved vendor with an empty profile (no portfolio, no description) is treated identically to a fully set-up vendor. No backend gate prevents an incomplete vendor from having their services appear in the marketplace.
- **No audit log on status transitions.** Approve, reject, and suspend operations write no audit log entry. There is no record of which admin performed the action or when, beyond the `approvedAt` timestamp set only on approval.
- **Whitelabel scoping conditional on caller.** `updateVendorStatus` applies `whitelabelId` scoping only `if (whitelabelId !== undefined)`. If the calling controller passes `undefined` (e.g. for a super admin), the check is skipped entirely — correct. But if a whitelabel admin's middleware injects `null` instead of the actual ID, the scope check is also skipped, potentially leaking cross-tenant writes.
- **Suspended vendor login behavior.** A suspended vendor can log in (`vendorStatus === SUSPENDED` is not blocked at `_checkVendorStatus()`). Only pending and rejected statuses block login. This means a suspended vendor can access their dashboard and see their services even while they are hidden from the marketplace.

---

## Findings

### FLOW-24-F01 — No approval email sent to vendor on status transition to approved
- **Severity**: High
- **Type**: MISSING
- **Location**: `labbe-backend-/src/modules/admin/admin.service.js:670`
- **Description**: When a vendor's status is transitioned to `approved`, only an in-app push notification is dispatched. No email is sent. The rejection path does send an email (`vendorRejection`), and the signup path sends a pending-confirmation email (`vendorApplicationPending`), but there is no equivalent email for the approval transition.
- **Why it matters**: Vendors who registered and closed the app will receive no out-of-band signal that their account is approved. In-app notifications require the app to be active or push permissions granted. Vendors may wait indefinitely without knowing they can start using the platform, reducing activation rates.
- **Recommended change**: Add a vendor-approved transactional email (matching the existing pending-application email pattern) that is sent when the vendor status transitions to approved. The email should include the vendor's name, a login link, and a brief description of next steps.
- **Related**: none

### FLOW-24-F02 — Rejected vendor has no recovery path and no audit trail
- **Severity**: Medium
- **Type**: DESIGN
- **Location**: `labbe-backend-/src/modules/admin/admin.service.js:625-627`
- **Description**: When `status: "rejected"` is submitted, the service sets `User.status = inactive` and `vendorStatus = rejected` and writes a `rejectedAt` timestamp — the vendor record is retained. Login is blocked for rejected vendors. However, no admin UI allows re-approving or reviewing a rejected vendor, and no audit log entry records which admin performed the rejection, when, or why.
- **Why it matters**: A vendor rejected in error cannot be recovered without direct database intervention. There is no record available for compliance or dispute review. The rejection and suspension paths look identical in the request body but have different behavioral outcomes (rejection blocks login permanently with no UI recovery path).
- **Recommended change**: Add a rejection reason field and ensure the admin UI exposes a way to re-approve rejected vendors if needed. Record an audit log entry (actor ID, target vendor ID, action type, previous status, new status, timestamp, optional reason) for every vendor status transition.
- **Related**: FLOW-24-F05

### FLOW-24-F03 — Vendor signup documents saved to local filesystem, not S3
- **Severity**: High
- **Type**: BUG
- **Location**: `labbe-backend-/src/modules/auth/auth.service.js:338-348`
- **Description**: Vendor signup file uploads (businessLogo, nationalIdImage, commercialRecordImage, portfolioImages) are stored as `/uploads/logos/`, `/uploads/documents/`, and `/uploads/portfolios/` local paths. The S3 upload utility exists in the codebase but is not used at the vendor signup stage.
- **Why it matters**: Local-disk storage is not durable in containerised or multi-instance deployments. Files will not be available across instances and will be lost on container restart or redeployment. Identity documents (national ID, commercial record) are particularly sensitive and should be in object storage with access control, not on a local disk.
- **Recommended change**: Route all vendor signup file uploads through the existing S3 upload infrastructure. Store only the S3 object key (or presigned URL) in the database, not a local filesystem path.
- **Related**: FLOW-03-F03, FLOW-03-F04, FLOW-07-F02

### FLOW-24-F04 — No backend enforcement of profileCompleted flag for marketplace visibility
- **Severity**: Medium
- **Type**: WEAK
- **Location**: `labbe-backend-/src/modules/admin/admin.service.js:56`
- **Description**: `profileCompleted` is surfaced in `_formatUserResponse()` but no backend endpoint checks it before allowing a vendor's services to appear in the public marketplace or before allowing new service creation. An approved vendor who skips all profile setup (no portfolio, no description, no location) is indistinguishable from a fully configured vendor in marketplace queries.
- **Why it matters**: Incomplete vendor profiles with no images, no description, and no location degrade the marketplace browse experience for hosts and reduce trust in the platform.
- **Recommended change**: Add a check on `profileCompleted` in the service-creation endpoint and in the marketplace public query so that vendors with incomplete profiles cannot publish services or appear in browse results. Provide a dedicated endpoint for vendors to mark their profile as complete after filling all required fields.
- **Related**: FLOW-25-F01

### FLOW-24-F05 — No audit log on vendor status transitions (approve, reject, suspend)
- **Severity**: Medium
- **Type**: MISSING
- **Location**: `labbe-backend-/src/modules/admin/admin.service.js:609`
- **Description**: The `updateVendorStatus` function modifies `vendorStatus` and `User.status` and may delete the entire vendor record, but it writes no audit log entry. There is no record of which admin performed the action, when it occurred, or what the previous state was. The only timestamp stored is `approvedAt` (set on approval only).
- **Why it matters**: Gate 1 rule 10 requires an audit event on sensitive writes. Vendor approval, rejection, and suspension are all sensitive account-state changes affecting a vendor's ability to operate. Without an audit trail, disputed account actions cannot be investigated and regulatory accountability is absent.
- **Recommended change**: Write a structured audit log entry (actor ID, target vendor ID, action type, previous status, new status, timestamp, optional reason) for every vendor status transition. Store these entries in a dedicated audit collection rather than relying on application logs.
- **Related**: none

---

## Cross-flow notes

- Vendor signup document uploads use local filesystem paths (`/uploads/...`) — same root cause as FLOW-03-F03 (portfolio files) and FLOW-07-F02 (portfolio files). All three share the same fix: route file storage through S3.
- The `profileCompleted` flag gap bridges Flow 24 and Flow 25: the flag is set during onboarding but never enforced by any marketplace query (see FLOW-25-F01).
- Vendor approval state is a prerequisite for marketplace listing (Flow 26): a suspended vendor's services will still appear in `GET /services/public` because that endpoint does not join on vendor status — see FLOW-26-F01.
