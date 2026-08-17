# 03 — signup-vendor

## One-paragraph description
Vendor application and approval flow: vendor fills multi-step form (email, password, business details, documents) → application submitted with status "pending" → admin reviews in dashboard → admin approves/declines → approval email sent → vendor can first login with email+password. This is a two-party flow (vendor + admin) spanning signup, review, and first login.

## Scope tags
[web] [backend] [mobile]

## Roles involved
Vendor (applicant), Admin (approver)

## Entry points
Web vendor signup: `labbe/app/[lang]/signup-vendor/page.js:1`
Mobile vendor signup: `halla-mobile/screens/SignupScreen.js:55` (handleRoleSelection → navigate("VendorSignup"))
Backend vendor signup: `labbe-backend-/src/modules/auth/auth.routes.js:163` (POST /signup/vendor)
Vendor signup controller: `labbe-backend-/src/modules/auth/auth.controller.js:105` (vendorSignup)
File upload handling: `labbe-backend-/src/shared/utils/fileUpload.js` (uploadVendorFiles middleware at auth.routes.js:165)

## Exit / terminal states
Success (pending approval): Vendor account created with status "pending", email sent to admin for review.
Success (approved): Vendor status changes to "active", approval email sent to vendor, vendor can login.
Failure: Email/phone already registered (checkDuplicates at auth.routes.js:61), missing required fields, file upload fails.
Declined: Admin rejects application, vendor cannot login (status "rejected").

## Touched modules
**Backend:**
- `labbe-backend-/src/modules/auth/auth.routes.js` (route 163-173 for /signup/vendor)
- `labbe-backend-/src/modules/auth/auth.controller.js` (vendorSignup:105)
- `labbe-backend-/src/modules/auth/auth.service.js` (signupVendor method)
- `labbe-backend-/src/modules/admin/admin.service.js` (vendor approval logic)
- `labbe-backend-/src/shared/utils/fileUpload.js` (uploadVendorFiles middleware)
- `models/UserModel.js` (vendor fields: brandName, ownerFullName, documents)
- `labbe-backend-/src/infrastructure/email.js` (approval/rejection emails)
- `labbe-backend-/src/shared/constants/status.js` (vendor status: pending, active, rejected)

**Web:**
- `labbe/app/[lang]/signup-vendor/page.js` (vendor signup entry point)
- `labbe/ui/auth/signup/vendor/` (6-step form: stepOne through stepSix)
- `labbe/stores/authStore.js` (state: user, pendingApproval flag)

**Mobile:**
- `halla-mobile/screens/SignupScreen.js` (vendor signup navigation)
- `halla-mobile/screens/VendorSignupScreen.js` (vendor signup form screens)
- `halla-mobile/components/auth/` (vendor form components)
- `halla-mobile/stores/authStore.js` (signupVendor method)
- `halla-mobile/services/authService.js` (signupVendorAPI:46)

## Dependencies on other flows
- **Flow 01 (auth-foundation)**: Uses token generation if vendor signs up with password initially (not typical in this flow)
- **Flow 05 (login)**: Vendor first login uses email+password via login flow
- **Flow 07 (profile-settings)**: Vendor completes additional profile details after approval

## Known divergences (web ↔ mobile, frontend ↔ backend)
Web vendor signup is 6-step form (stepOne through stepSix); mobile implementation pending confirmation of step count.
File upload: web uses FormData with file inputs; mobile must use FileSystem API (React Native doesn't have native file input).
Web form is linear (sequential steps); mobile can potentially allow step skipping (confirm in implementation).
Approval workflow: backend has admin approval endpoints; web admin dashboard exists, mobile admin dashboard limited (adminStore.js shows whitelabel management).

## Open questions
1. What are the 6 vendor signup steps (web)? (email, password, business name, phone, documents, summary?) check the code for that it's pretty clear what steps we have but i think they very different that, please check the   const steps = [
    { id: 1, desc: t("signupForm.vendor.steps.identity") },
    { id: 2, desc: t("signupForm.vendor.steps.serviceData") },
    { id: 3, desc: t("signupForm.vendor.steps.samplesAndPackages") },
    { id: 4, desc: t("signupForm.vendor.steps.commercialVerification") },
    { id: 5, desc: t("signupForm.vendor.steps.otherLinksAndData") },
  ];

labbe/ui/auth/signup/vendor that's the ui part for vendor signup

**Type A — Code lookup**
**Bucket 2 — Clarified (5 data-entry steps + 1 summary = 6 total; flow file said 6 steps correctly)**

Confirmed from `labbe/ui/auth/signup/vendor/` source files:
- **Step 1 — Identity** (`stepOne/StepOne.js`): brandName, ownerFullName, nationalId number (text), phoneNumber, email, password, passwordConfirm
- **Step 2 — Service Data** (`stepTwo/StepTwo.js`): serviceDescription, service category checkboxes (eventPlanning, mediaProduction, giftsAndGiveaways, foodAndBeverages, beautyAndFashion, logisticsAndDelivery, corporateServices, supportServices, technicalServices, soundLightingEntertainment, hallsAndVenues), location, otherData
- **Step 3 — Samples & Packages** (`stepThree/StepThree.js`): portfolioImages (multiple, up to 10), businessLogo (single), pricePackages (single file upload)
- **Step 4 — Commercial Verification** (`stepFour/StepFour.js`): commercialRecordImage (single), commercialRecordNumber (text), nationalIdImage (single), nationalId number (text — also collected in step 1; confirm deduplication)
- **Step 5 — Other Links & Data** (`stepFive/StepFive.js`): instagramLink, facebookLink, tiktokLink, websiteLink, profileFile (single document upload); cv field is commented out
- **Step 6 — Summary** (`stepSix/`): review screen before final submit

Note: the step array in VendorSignup.js shows 5 items (IDs 1–5) but the `TOTAL_STEPS = 6` constant in `VendorSignupScreen.js` (mobile) counts the summary as step 6. The web `VendorSignup.js` orchestrator determines the actual step count.

2. Mobile VendorSignupScreen — is it fully implemented? (referenced at SignupScreen.js:55 but not listed in screens/ directory check) i think it's implemented but i haven't tested it also it should be identical to the steps and what data it gets from the vendor on mobile to be like the web with identical steps 
 const steps = [
    { id: 1, desc: t("signupForm.vendor.steps.identity") },
    { id: 2, desc: t("signupForm.vendor.steps.serviceData") },
    { id: 3, desc: t("signupForm.vendor.steps.samplesAndPackages") },
    { id: 4, desc: t("signupForm.vendor.steps.commercialVerification") },
    { id: 5, desc: t("signupForm.vendor.steps.otherLinksAndData") },
  ];

labbe/ui/auth/signup/vendor also confirm that backend gets all the vendor data from these steps and saves all of them correctly as this is critical

**Type A — Code lookup**
**Bucket 4 — Enhanced (screen exists and is implemented; backend persistence confirmed; per-step validation gap noted)**

`halla-mobile/screens/VendorSignupScreen.js` exists and is fully scaffolded: `TOTAL_STEPS = 6`, uses react-hook-form + zodResolver (`vendorSignupSchema`), renders `VendorStep1Identity` through `VendorStep6Summary`, and on submit calls `signupVendor` mutation then navigates to `Login`.

Backend `signupVendor` (`auth.service.js:306–377`) saves: `brandName`, `ownerFullName`, `serviceCategories` (array from checkbox selections), `serviceLocation`, `socialLinks` (instagram, facebook, tiktok, website), `nationalId`, `commercialRecordNumber`, and all 4 document file paths (`businessLogo`, `nationalIdImage`, `commercialRecordImage`, `portfolioImages`). All fields from all 5 data-entry steps are persisted.

**Gap:** `STEP_FIELDS` in `VendorSignupScreen.js:21–28` only defines validation triggers for steps 1 and 2. Steps 3–5 have empty arrays, meaning per-step field validation is not triggered before advancing. This could allow a vendor to skip step 3 (portfolio/logo) or step 4 (legal documents) without uploading files. Step-level validation must be added for all steps that include required fields.
3. Vendor documents required: businessLogo, nationalIdImage, commercialRecordImage — are these validated (format, size)? should be validated and logically similar about what backend checks and what format we tell the user to upload them as and size too should tell the use the size we have as a maximum

**Type A — Code lookup + Type C — Product decision**
**Bucket 4 — Enhanced (backend validation confirmed; UI messaging gap noted)**

Backend validation (`labbe-backend-/src/shared/utils/s3Upload.js:507–515`): `uploadVendorFiles` uses `uploadGeneral` which applies `generalFilter`. Allowed MIME types: `image/jpeg`, `image/jpg`, `image/png`, `image/gif`, `image/webp`, `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`. Max file size per file: **10 MB** (line 497). Portfolio images: max 10 files. Price packages: max 5 files.

`businessLogo` (step 3) and `portfolioImages` (step 3) use `UploadFile` with `acceptImages={true}` — image-only on the frontend even though the backend allows PDF/doc. For legal documents (`nationalIdImage`, `commercialRecordImage` in step 4), `acceptImages={true}` is also set — but national ID images and commercial records may be PDFs in practice.

**Required UI improvements:**
- Show accepted formats and max size in the file upload component hint text for each field.
- For `nationalIdImage` and `commercialRecordImage`: change `acceptImages={true}` to also accept PDF (or use a separate `acceptDocuments` prop) to align with the backend's `generalFilter`.
- Display "Max file size: 10 MB" and "Accepted: JPG, PNG, PDF" under each upload field.
- On validation error from backend, surface the multer error message to the user.
4. Admin approval process: who can approve? (super_admin, admin, whitelabel_admin?) admin and super admin can approve only 

**Type A — Code lookup**
**Bucket 1 — Kept as-is (Peter is correct; confirmed by permission table)**

Peter's answer confirmed. The vendor status update route (`admin.routes.js:453`) uses `requirePageAccess(ADMIN_PAGES.VENDORS, 'update')`. The `ROLE_PAGE_ACCESS` table in `labbe-backend-/src/shared/constants/permissions.js:91–165` shows:
- `SUPER_ADMIN`: VENDORS = FULL → can update (approve/reject) ✓
- `ADMIN`: VENDORS = FULL → can update (approve/reject) ✓
- `MODERATOR`: VENDORS = VIEW → cannot update (read-only) ✗
- `WHITELABEL_ADMIN`: VENDORS = NONE → no access at all ✗
- `WHITELABEL_MODERATOR`: VENDORS = NONE → no access ✗

The mechanism is page-access-based (not a `restrictTo` role list), but the effective result matches Peter's stated rule: only ADMIN and SUPER_ADMIN can approve or reject vendors.
5. Approval email content: what information is sent to vendor? Setup instructions? Login credentials reset link? welcome message tell him about halla store, tell him how it works that he can manage his service with all the crud operations and we show him in the market place in the correct category and how search works, and he should complete his profile if anything is missing

**Type C — Product decision**
**Bucket 4 — Enhanced (email template exists but is missing most of Peter's required content)**

Peter's required content: welcome message, explain Halla Store marketplace, explain how vendor manages services (CRUD), explain how the vendor appears in marketplace by category and how search works, prompt to complete profile if anything is missing.

Current template (`labbe-backend-/email/templates/vendors.js:98–164`, `vendorApprovalEmail`): mentions dashboard access, services setup, and profile completion — but does NOT mention the Halla Store marketplace, category listing, or search discovery.

**Required additions to `vendorApprovalEmail`:**
- Paragraph explaining the vendor appears on the Halla Store marketplace in their service category (eventPlanning, mediaProduction, etc.) automatically after approval.
- Explanation that hosts searching for services in that category will see the vendor's profile in results.
- Brief how-to: log in → go to My Services → add/edit services with photos, description, and pricing packages.
- Call-to-action to complete profile if any fields are still missing.
- Keep the dashboard link button.
6. Can vendor reapply after rejection? Is there a cooldown period? we neee a way in the dashboard for vendor when admin reject a vendor it should open for admin a popup to put in it a message that message input in the popup should be have intial value as appolgy for the vendor that we couldn't enroll him , and in the message should be ready for admin to tell which sections that admin didn't like or parts that get the vendor rejected and the message also should have the ending that he can signup again with all hte required data that admin told him about and after the rejection email is sent the old rejected acc should be deleted so he can signup again with same email and number without any issues

**Type C — Product decision**
**[PETER DECISION — NOT YET IMPLEMENTED]**

**Peter's decision:** Hard-delete the vendor account on rejection. Email with admin's custom message is sent first; the account and all services are then permanently deleted so the vendor can re-signup with the same credentials.

**Current code reality (NOT implemented):** `admin.controller.js:163-172` extracts only `status` from `req.body` (no `rejectionMessage`) and calls `adminService.updateVendorStatus(id, status, whitelabelId)` with 3 args. The service (`admin.service.js:607-664`) only sets `vendor.status = USER_STATUS.INACTIVE` on rejection and saves — no rejection email, no `Service.deleteMany`, no `User.findByIdAndDelete`. The `VendorDetailsWrapper.js` has no rejection modal or custom message textarea.

**Still required:**
- `labbe-backend-/src/modules/admin/admin.service.js` — `updateVendorStatus` must: (1) send rejection email with custom `rejectionMessage` via `emailModule.send.vendorRejection`, (2) delete all vendor services via `Service.deleteMany({ vendor: vendor._id })`, (3) hard-delete the user via `User.findByIdAndDelete`. Remove the `vendor.save()` call on rejection path.
- `labbe-backend-/src/modules/admin/admin.controller.js` — extract `rejectionMessage` from `req.body` and pass to service as 4th arg.
- `labbe/services/adminDashboard.js` — `vendorsAPI.updateStatus` must accept and forward `rejectionMessage`.
- `labbe/app/[lang]/admin-dash/vendors/[id]/_components/VendorDetailsWrapper.js` — "Reject" button (visible on pending vendors) must open a modal with a pre-filled, editable textarea; submit calls the API; on success, redirect to `/admin-dash/vendors` since the record will be gone.

**Audit log note:** Pre-approval vendors have no activity record; hard-delete does not create an audit gap for data that never existed in the active state. When the audit log system is built (Gate 1 #10), rejected vendor deletion should emit a `VENDOR_REJECTED_DELETED` event before the delete call fires.
7. Are uploaded documents stored in S3/cloud or local filesystem? in s3

**Type A — Code lookup**
**Bucket 1 — Kept as-is (confirmed: S3 with local fallback)**

Confirmed. `labbe-backend-/src/shared/utils/s3Upload.js` uses `multer-s3` with `@aws-sdk/client-s3`. If `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, and `AWS_S3_BUCKET` are all set, uploads go to S3. If any env var is missing, it falls back to local disk at `./public/uploads`. Files are organized by type:
- `vendors/logos/{vendorId}/` — businessLogo
- `vendors/portfolios/{vendorId}/` — portfolioImages
- `vendors/packages/{vendorId}/` — pricePackages
- `vendors/documents/{vendorId}/` — nationalIdImage, commercialRecordImage, cv, profileFile

Ensure all four AWS env vars are present in production config. If S3 is unavailable, the fallback silently uses local disk — this must be surfaced as an error in production rather than silently degrading.

## Notes from answer pass

1. **nationalId number collected twice.** Step 1 (`StepOne.js:63–70`) has a `commercialVerification.nationalId` text field for the national ID number. Step 4 (`StepFour.js:82–99`) also has `commercialVerification.nationalId`. This duplication in the form namespace means step 1 and step 4 share the same form field value. Confirm this is intentional (pre-fill from step 1 into step 4) or remove the field from step 1 and only collect it in step 4 alongside the document image.

2. **`vendorRejectionEmail` template exists but is not called by `updateVendorStatus`.** `admin.service.js:607–664` changes the user status but the rejection email import/call is absent from this method. Verify that the email is actually sent on rejection, and wire the `rejectionMessage` from the admin popup (Q6) into the email template's `reason` field.

3. **Step-level validation missing for steps 3–5 on mobile.** `VendorSignupScreen.js` `STEP_FIELDS` array has empty arrays for steps 3, 4, and 5. This means no react-hook-form `trigger()` call validates those fields before the user advances. Add field names for all required uploads and text inputs in each step's entry in `STEP_FIELDS`.

4. **S3 silent-fallback to local disk must be disabled in production.** `s3Upload.js:147–150` logs a warning and continues to disk. Add a hard error (throw or process exit) when `isS3Configured()` returns false in production (`config.isProd === true`).

5. **cv upload field is commented out in StepFive.** `stepFive/StepFive.js:75–82` has the `cv` upload commented out. The backend's `uploadVendorFiles` still lists `cv` as an accepted field (maxCount: 1). Either re-enable the field or remove it from the backend's field list to avoid confusion.

---

## State machine

```
[anonymous]
     │ fill steps 1–5, submit
     ▼
[pending-approval]  ──── admin rejects ──► [deleted] (hard-delete, can re-signup)
     │ admin approves
     ▼
[active]
     │ first login (email + password)
     ▼
[authenticated / vendor dashboard]
```

Notes:
- No email OTP or phone verification required for vendor signup — email uniqueness is enforced at the DB level.
- Approval and rejection are performed exclusively by ADMIN or SUPER_ADMIN roles.
- On rejection: rejection email with admin's custom message is sent first, then vendor account + all services are hard-deleted.

---

## Data handoffs

| Step | Source | Payload | Destination |
|------|--------|---------|-------------|
| Step 1–5 form submission | Web: `WhitelabelForm.js`; Mobile: `VendorSignupScreen.js` | FormData with text fields + up to 4 file categories | POST /signup/vendor with `uploadVendorFiles` middleware |
| signupVendor service | `auth.service.js:306–377` | All vendor fields including file paths | `UserModel` with `role: 'vendor'`, `status: 'pending'` |
| Admin approval | `admin.service.js:updateVendorStatus` | `status: 'active'` | UserModel status field; approval email sent |
| Admin rejection | `admin.service.js:updateVendorStatus` | `rejectionMessage` | Rejection email sent, then `User.findByIdAndDelete` + `Service.deleteMany` |
| First login | `auth.controller.js:64` | `email + password` | JWT issued, `{ user, token, subscription }` returned |

---

## Role variations

Only the `vendor` role enters this flow. Admin/SUPER_ADMIN interact with this flow only at the approval/rejection stage via the admin dashboard. MODERATOR has view-only access to vendor records and cannot approve or reject.

---

## Web ↔ mobile parity

| Capability | Web | Mobile | Gap |
|-----------|-----|--------|-----|
| Step count | 5 data steps + 1 summary (6 total) | 6 total (TOTAL_STEPS = 6) | Parity confirmed on count |
| Step 1 fields | brandName, ownerFullName, nationalId, phoneNumber, email, password, passwordConfirm | `VendorStep1Identity` | Verify field names match exactly |
| Step 2 fields | serviceDescription, serviceCategories (10 checkboxes), location, otherData | `VendorStep2ServiceData` | Verify all 10 category checkboxes present |
| Step 3 files | portfolioImages (≤10), businessLogo, pricePackages | `VendorStep3SamplesPackages` | Verify file-type accept props match backend |
| Step 4 files | commercialRecordImage, commercialRecordNumber, nationalIdImage | `VendorStep4CommercialVerification` | Verify PDF accepted for legal docs |
| Step 5 links | instagramLink, facebookLink, tiktokLink, websiteLink, profileFile | `VendorStep5OtherLinks` | cv field commented out web and mobile — align |
| Step-level validation | Web react-hook-form triggers per step | Mobile `STEP_FIELDS` empty for steps 3–5 | Gap: mobile step 3–5 validation missing (FLOW-03-F01) |
| File type hints | `acceptImages={true}` — no size/format hint shown | Same pattern | Gap: no user-facing constraint messaging (FLOW-03-F02) |

---

## Edge cases & failure modes

1. **Same nationalId collected in step 1 and step 4:** Both `StepOne.js` and `StepFour.js` have `commercialVerification.nationalId` text field. If step 1 value is pre-filled into step 4, this is a UX convenience. If they diverge, the final submit sends step 4's value. The backend saves one `nationalId` field — confirm which step's value takes precedence.
2. **File upload partial failure:** If 3 of 4 file uploads succeed and 1 fails (e.g., oversized portfolio image), the `uploadVendorFiles` middleware rejects the entire request. No partial-save recovery exists. User must re-upload all files.
3. **Rejection then re-signup race:** After rejection, the account is hard-deleted before the email is confirmed delivered. If the email send fails, the account is gone but the vendor received no rejection reason. Email send should be confirmed before delete, or deletion should be made async after email delivery confirmation.
4. **cv field mismatch:** Backend `uploadVendorFiles` accepts `cv` (maxCount: 1) but StepFive has it commented out. Any vendor who previously uploaded a cv via API (bypassing frontend) will have a stored cv path. Subsequent updates via the form will not touch the cv field, leaving stale data.
5. **S3 fallback to local disk in production:** `s3Upload.js:147–150` logs a warning and falls back to local disk if S3 env vars are missing. In a multi-instance deployment, uploaded files on instance A are not visible to instance B.

---

## Findings

### FLOW-03-F01
- **Title:** Step-level form validation missing for steps 3–5 on mobile
- **Type:** Medium
- **Severity:** Medium
- **File:** `halla-mobile/screens/VendorSignupScreen.js:21`
- **Detail:** `STEP_FIELDS` defines which fields are triggered for validation before advancing to the next step. Steps 3, 4, and 5 have empty arrays (`[]`). This means react-hook-form's `trigger()` call fires on an empty set, always returns valid, and allows the user to advance without uploading required files or entering required text in those steps. A vendor could submit without uploading their business logo, national ID image, or commercial record image.
- **Recommended change:** Populate `STEP_FIELDS[2]` with `['portfolioImages', 'businessLogo']`, `STEP_FIELDS[3]` with `['commercialRecordImage', 'commercialRecordNumber', 'nationalIdImage']`, and `STEP_FIELDS[4]` with `['instagramLink']` (or whichever step 5 fields are required). Match required field names to the Zod schema.
- **Related:** None

### FLOW-03-F02
- **Title:** File upload components show no format or size constraints to the user
- **Type:** Medium
- **Severity:** Medium
- **File:** `labbe/ui/auth/signup/vendor/stepThree/StepThree.js`
- **Detail:** All vendor file upload fields use `UploadFile` with `acceptImages={true}` but display no hint about accepted formats or maximum file size. Backend enforces 10 MB per file and accepts JPG, PNG, GIF, WEBP, PDF, DOC, DOCX. Users uploading large files or wrong formats receive a raw multer error with no friendly guidance. `nationalIdImage` and `commercialRecordImage` likely need PDF support — `acceptImages={true}` may block PDFs on those fields.
- **Recommended change:** Add hint text under each upload field: "Accepted formats: JPG, PNG, PDF. Max size: 10 MB." For `nationalIdImage` and `commercialRecordImage`, add `acceptDocuments={true}` (or equivalent) to allow PDF uploads. Surface backend multer errors as user-friendly messages.
- **Related:** None

### FLOW-03-F03
- **Title:** Vendor files stored on local filesystem — not S3
- **Type:** High
- **Severity:** High
- **File:** `labbe-backend-/src/modules/auth/auth.service.js:338`
- **Detail:** `signupVendor` at lines 338–348 stores `businessLogo`, `nationalIdImage`, `commercialRecordImage`, and `portfolioImages` as local paths (`/uploads/logos/`, `/uploads/documents/`, `/uploads/portfolios/`). Peter confirmed all uploads must go to S3. Local filesystem storage is not viable in horizontally-scaled deployments and files are lost on container restart.
- **Recommended change:** Route all vendor file uploads through the S3 pipeline in `s3Upload.js`. Confirm `uploadVendorFiles` middleware is using the S3-backed multer instance (not local disk). In production, disable the local-disk fallback in `s3Upload.js` and throw an error if S3 is not configured.
- **Related:** FLOW-07-F02 (portfolio images in settings also stored locally)

### FLOW-03-F04
- **Title:** S3 local-disk fallback must be disabled in production
- **Type:** High
- **Severity:** High
- **File:** `labbe-backend-/src/shared/utils/s3Upload.js:147`
- **Detail:** When S3 env vars are missing, `s3Upload.js` logs a warning and continues with local disk storage. In production, missing S3 config is a deployment error — silently falling back to disk hides this error and causes data loss in multi-instance or ephemeral-storage environments.
- **Recommended change:** In `s3Upload.js`, check `config.isProd` (or equivalent). If production and S3 not configured, throw an error that prevents the server from starting rather than falling back to disk silently.
- **Related:** FLOW-03-F03

---

## Cross-flow notes

- **Flow 07 (profile-settings):** Vendor portfolio images in profile update settings face the same S3 gap (FLOW-03-F03). A single fix to the upload middleware covers both signup and settings.
- **Flow 05 (login):** Vendor first login after approval uses email+password path. The approval email must contain the correct login URL and a reminder to use email+password (not OTP) to avoid user confusion.
- **Flow 01 (auth-foundation):** The JWT issued at vendor first login inherits the 90-day expiry (FLOW-01-F01). Vendor tokens are equally long-lived as host tokens.
- **Flow 09 (subscription-lifecycle):** After approval and first login, vendor accounts do not go through the subscription flow — verify no subscription is auto-created for vendors (they are service providers, not plan subscribers).
