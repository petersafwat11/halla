# Vendor Settings — Cross-Stack Audit & Fix Plan
Date: 2026-05-22
Scope: vendor profile/settings on **mobile (halla-mobile)**, **web (labbe)**, and **backend (labbe-backend-)**. Host, whitelabel, and admin settings are out of scope.

---

## 1. The Five Tabs (canonical list)

| # | Section | Owns |
|---|---------|------|
| 1 | Personal Info | ownerFullName, email, password (change), avatar/businessLogo |
| 2 | Basic Account Info | brandName, ownerFullName, email, phoneNumber |
| 3 | Service Details | serviceDescription, serviceCategories, serviceLocation, nationalId, nationalIdImage, commercialRecordNumber, commercialRecordImage |
| 4 | Images & Pricing | portfolioImages, pricePackages |
| 5 | Additional Links | socialLinks { website, instagram, facebook, twitter, tiktok } |

Mobile currently merges "Personal" + "Basic Account" into one form; web splits them. Plan: align on **web's split** since it matches the data model (top-level user fields vs. vendorData section).

---

## 2. Critical Findings

### Backend (`labbe-backend-`)
- **B-1 (CRITICAL):** S3 bucket is private (`acl: 'private'`, `s3Upload.js:194`) but `processUploadedFiles` stores **unsigned bucket URLs** in the DB. In production these return **403**. `getFileUrlSigned` exists but is not used at write or read time.
- **B-2:** `updateProfileSectionSchema = z.record(z.unknown())` (`users.validation.js:34`) — no per-section validation. Effectively accepts anything.
- **B-3:** `uploadUserProfile` uses `uploadImage` filter (`s3Upload.js:671`) — rejects PDFs. Vendor signup allows PDFs via `uploadVendorFiles` (`uploadGeneral`). Mismatch: vendors cannot update commercialRecord/nationalId as PDF after signup.
- **B-4:** Shallow merge on nested objects (`users.service.js:104`). Partial `socialLinks` update wipes the other links. Same for `serviceLocation`.
- **B-5:** No deletion of old S3 objects on overwrite. `deleteFile` exists; never called. Orphan files accumulate.
- **B-6:** `updateProfileSchema` is `.strict()` and lacks `phoneNumber` — but web sends phoneNumber here under some paths (see W-2). Phone storage is contradictory across the stack (see Open Question 1).
- **B-7:** `portfolioImages`/`pricePackages` are APPENDED on update (`users.service.js:131-141`) with no remove endpoint. Both clients show "delete" UIs that don't actually persist (see Open Question 2).
- **B-8:** `toPublicJSON` not inspected — see plan §4.
- **B-9:** `profileCompleted` flag auto-set only in `updateMyProfileSection` for vendorData (good) but bypasses validation that categories are valid enum keys.

### Web (`labbe`)
- **W-1:** `utils/schemas/vendorSettings.js` uses **custom `validateField`/`validateForm`**, not Zod. Violates CLAUDE.md ("Zod only").
- **W-2:** `BasicAccountInfo` makes **two separate PATCH calls** (`page.js:141-158`) — one for vendor fields, one for email. Race-prone, half-applied state on partial failure.
- **W-3:** `ServiceDetailsEditForm` has **no validation at all** — invalid `nationalId` accepted.
- **W-4:** `ServiceDetailsSection.jsx:72, 103` calls `.startsWith()` on potentially-null image values → runtime crash if image missing.
- **W-5:** `ImagesAndPricingSection.jsx:67` image-type detection logic is wrong for raw File objects.
- **W-6:** `getImageUrl` (`utils/vendorHelpers.js`) returns S3 URLs as-is → if backend stores unsigned URLs, web will request 403'd images.
- **W-7:** Password fields collected in PersonalInfo form but **never submitted** (PersonalInfoSection.jsx:44-45).
- **W-8:** Dead module `services/vendor.js` uses `/user/...` singular paths — zero importers. Flag, defer deletion to a cleanup PR.
- **W-9:** Hardcoded Arabic strings in schema files (`vendorSettings.js`) — bypasses i18n.

### Mobile (`halla-mobile`)
- **M-1:** `utils/schemas/vendorSchemas.js` is **Yup**, not Zod. Violates CLAUDE.md. Also: schemas exist but are **never wired** via resolver (no `yupResolver()` / `zodResolver()` calls in any form). All validation is server-side only.
- **M-2:** Image state lives **outside react-hook-form context** in PersonalInfo, ServiceDetails, ImagesAndPricing (`PersonalInfoForm.js:26-27`, etc). `methods.reset()` does not clear images → stale preview after form reset.
- **M-3:** `PersonalInfoForm` reads `data?.name` but submits `ownerFullName` — silent backend dependency.
- **M-4:** `ImagesAndPricingForm` mixes existing-URL strings and new-File objects in the same arrays; index math in `removeImage` breaks when existing items are deleted and new ones added (`ImagesAndPricingForm.js:69-85`).
- **M-5:** Submit button disabled when `newFiles.length === 0` even if user has deleted existing images.
- **M-6:** Categories hardcoded as i18n keys rather than pulled from a canonical source/API.
- **M-7:** No image-size validation client-side; large picks may timeout backend.

---

## 3. The Canonical Contract (target state)

### Per-section field contract
Every section update across web and mobile MUST conform to this:

**Personal Info** → `PATCH /api/v2/users/profile` (multipart if avatar) + `PATCH /api/v2/users/profile/vendorData` (multipart if businessLogo)
- Top-level: `{ name?, email?, avatar?: File }`
- Section vendorData: `{ businessLogo?: File }`

**Password** → `PATCH /api/v2/users/password`
- `{ currentPassword, newPassword, passwordConfirm }`

**Basic Account Info** → `PATCH /api/v2/users/profile/vendorData` (+ optionally main route per Open Question 1)
- Section: `{ ownerFullName?, brandName? }`
- Top-level via main route: `{ email? }` (phone TBD per Open Question 1)

**Service Details** → `PATCH /api/v2/users/profile/vendorData` (multipart if any document file)
- `{ serviceDescription?, nationalId?, commercialRecordNumber?, serviceCategories?: object, serviceLocation?: object, nationalIdImage?: File, commercialRecordImage?: File }`

**Images & Pricing** → `PATCH /api/v2/users/profile/vendorData` (multipart) — add semantics
- `{ portfolioImages?: File[], pricePackages?: File[] }` for ADD
- New: `DELETE /api/v2/users/profile/vendorData/image` with body `{ field, key }` for REMOVE (per Open Question 2)

**Additional Links** → `PATCH /api/v2/users/profile/vendorData`
- `{ socialLinks: { website?, instagram?, facebook?, twitter?, tiktok? } }` — backend deep-merges this object so partial updates are safe

### Response contract
Every read/write endpoint returns `{ status, data: { user }, message }`. The `user` object has all image fields pre-signed at serialization (1h TTL). Clients render the URL string directly.

### Validation contract
- **Backend**: Zod, section-discriminated.
- **Web**: Zod (`react-hook-form` + `zodResolver`).
- **Mobile**: Zod (`react-hook-form` + `zodResolver` — same library available).
- Shared field rules (lengths, regexes) extracted once into a `vendorContract.js` and imported by both clients.

---

## 4. The S3 Strategy (decided)

**Store the S3 key in DB. Sign at serialization. Backward-compat on read.**

1. `processUploadedFiles` → returns `file.key` (S3) instead of `file.location`. Falls back to local path in dev.
2. `User.toPublicJSON()` becomes **async**. Walks a known list of image-bearing paths:
   - `avatar`
   - `profile.vendorData.businessLogo`
   - `profile.vendorData.nationalIdImage`
   - `profile.vendorData.commercialRecordImage`
   - `profile.vendorData.portfolioImages[]`
   - `profile.vendorData.pricePackages[]`
   - `profile.vendorData.profileFile`
   - `profile.vendorData.cv`
   - `profile.documents.nationalIdImage`
   - `profile.documents.commercialRecordImage`
   - Same list for hostData/whitelabelData if those fields exist (will scope-fence to vendor only in this PR).
3. For each, if value is an S3 key → `getSignedUrlForKey(key)`. If value already starts with `http` (legacy unsigned URL) → run through `getKeyFromUrl` to recover the key, then sign. If neither → leave as-is.
4. Refactor the two service callers (`getMyProfile`, `updateMyProfile`, `updateMyProfileSection`) to `await user.toPublicJSON()`.
5. **Other consumers** of profile data must also use signed URLs. Audit needed before merge: marketplace vendor cards, admin user lists, vendor moreInfoPopup. These will be listed in the PR description and patched.

---

## 5. Phased Execution

### Phase 1 — Backend (single PR, isolated)
1. Add section-discriminated Zod schemas in `users.validation.js` (one per section: `vendorDataUpdateSchema`, `hostDataUpdateSchema` (passthrough), etc.). Replace `updateProfileSectionSchema` with a discriminator that picks the right schema from the `section` param.
2. `uploadUserProfile` → use `uploadGeneral` filter so PDFs work on update (matches signup).
3. Deep-merge `socialLinks` and `serviceLocation` inside `updateMyProfileSection` instead of shallow.
4. `processUploadedFiles` stores `file.key` (S3) / local path (dev).
5. `User.toPublicJSON` → async, sign all image paths.
6. Update `getMyProfile`, `updateMyProfile`, `updateMyProfileSection` to await `toPublicJSON`.
7. Backward-compat: serialization detects legacy `http`-prefixed values and signs them.
8. Single-value image overwrite (businessLogo, nationalIdImage, commercialRecordImage) — call `deleteFile(oldKey)` on update.
9. `phoneNumber` handling per Open Question 1.
10. Image delete endpoint per Open Question 2.
11. Audit and patch any other consumer reading image fields directly (marketplace card, vendor popup, admin lists).

### Phase 2 — Web (separate PR)
1. Migrate `utils/schemas/vendorSettings.js` from custom validators → Zod. Wire each section's form to `useForm({ resolver: zodResolver(schema) })`.
2. Delete dead `services/vendor.js`.
3. Fix BasicAccountInfo per Open Question 1 (one call or two).
4. Add validation to `ServiceDetailsEditForm`.
5. Fix null-safe `.startsWith()` calls in `ServiceDetailsSection.jsx:72, 103`.
6. Fix image-type detection in `ImagesAndPricingSection.jsx:67`.
7. Wire password change to `/users/password` endpoint (currently dropped).
8. `getImageUrl` simplified — backend now returns ready-to-render URLs; helper becomes pass-through with legacy fallback for old data only.
9. All hardcoded Arabic strings → i18n keys.
10. Field-level error display per section.

### Phase 3 — Mobile (separate PR)
1. Port `utils/schemas/vendorSchemas.js` from Yup → Zod. Wire `zodResolver` on each form.
2. Move image state INTO react-hook-form (`Controller`) so `reset()` clears them.
3. Align PersonalInfoForm submission shape with web (`{ name, email }` to main route, `{ businessLogo }` to section route — no more local `ownerFullName` shorthand).
4. Split mobile's combined Personal/Basic tab into two sections to match web (or keep combined but submit via two API calls — TBD with user; default: keep combined UX, internal two-call).
5. Fix ImagesAndPricingForm index math; track existing/new separately.
6. Image-delete UI matched to chosen backend semantics (Open Question 2).
7. Categories list pulled from a shared `vendorContract` constant (or backend endpoint if dynamic).
8. Image-size validation (warn if file > 5 MB to match backend `uploadImage` limit).

### Phase 4 — Parity tests
- One integration test per section per client hitting the real backend (per CLAUDE.md user memory: no DB mocks). Validates: payload accepted, response shape correct, image renders.

---

## 6. Out of Scope (this round)
- Host settings, whitelabel settings, admin settings.
- Phone-change OTP verification flow (mentioned in `page.js:152`).
- Migration script to rewrite legacy URL fields in DB to keys (backward-compat at read time covers this).
- Removing `services/vendor.js` (dead-code cleanup PR).
- CDN in front of S3.
- Anything in `git status` that's not vendor settings (event/marketplace/etc.).

---

## 8. Implementation log (2026-05-22)

### Backend (`labbe-backend-`)
- `s3Upload.js`: `processUploadedFiles` now returns S3 keys (`file.key`); added `signStoredImage` / `signStoredImages` helpers; `uploadUserProfile` now uses `uploadGeneral` filter so PDFs are accepted on update.
- `UserModel.toPublicJSON` is **async** and signs every image field on read (avatar, businessLogo, nationalIdImage, commercialRecordImage, portfolioImages[], pricePackages[], profileFile, cv, whitelabel logo/favicon).
- `users.validation.js`: section-discriminated Zod schemas (`vendorDataUpdateSchema`, `hostDataUpdateSchema`, `documentsUpdateSchema`, etc.); strict; `getSectionSchema(section)` exposed for the router. Added `updatePhoneSchema`, `sendPhoneOtpSchema`, `deleteImageSchema`.
- `users.service.js`: deep-merge of `socialLinks` / `serviceLocation`; delete-on-overwrite for every single-value image field; new methods `sendPhoneChangeOtp`, `updatePhone`, `deleteVendorImage`. All return values awaited through `toPublicJSON`.
- `users.routes.js`: new `POST /users/profile/phone/send-otp`, `PATCH /users/profile/phone`, `DELETE /users/profile/vendorData/image`; per-section validator middleware.
- `auth.service.js` and `auth.controller.js`: `sanitizeUser` is async; every call site awaited (12 sites).
- `services.service.js`: vendor `logo` / `avatar` on service responses now signed via `signStoredImage`.
- `admin.vendors.service.js`: `getVendorById` signs every image field in `vendorData` + top-level `avatar`.

### Web (`labbe`)
- `utils/schemas/vendorSettings.js`: full Zod rewrite. Each section exports a `zodSchema` + field metadata; `validateField` / `validateForm` are Zod-backed.
- `ui/vendor/dynamicForm/DynamicForm.js`: uses `validateForm(formData, schema)` on submit.
- `utils/vendorHelpers.js`: `getImageUrl` simplified (backend now returns ready-to-render signed URLs); added `keyFromSignedUrl` for delete operations.
- `hooks/reactQueryHooks/useUsers.js`: added `sendPhoneChangeOtp`, `updatePhone`, `deleteVendorImage` mutations.
- `services/new-backend/api.config.js`: new API paths.
- `app/[lang]/vendor-dashboard/settings/page.js`: split save handlers; password change uses dedicated `/users/password` endpoint with `currentPassword` collected by the form (no `window.prompt`).
- `BasicAccountInfo.jsx`: phone changes open the new `PhoneChangeOtpModal` (OTP send + verify).
- `PersonalInfoSection.jsx`: collects `currentPassword`; passes it into save.
- `ServiceDetailsEditForm.jsx`: Zod validation; null-safe optional location payload.
- `ServiceDetailsSection.jsx`: image rendering uses `unoptimized` unconditionally (no null `.startsWith()`).
- `ImagesAndPricingSection.jsx`: inline delete button on every thumbnail; calls `DELETE /users/profile/vendorData/image` with extracted S3 key.
- `PhoneChangeOtpModal/`: new component (sends OTP on open, verifies on submit, resend supported).
- `services/vendor.js`: dead file deleted (had wrong `/user/...` singular paths and zero importers).

### Mobile (`halla-mobile`)
- `utils/schemas/vendorSchemas.js`: full Yup → Zod rewrite.
- All vendor settings forms now use `zodResolver`: `PersonalInfoForm`, `BasicAccountInfoForm` (new), `ServiceDetailsForm`, `AdditionalLinksForm`.
- `PersonalInfoForm` owns top-level fields only (`name`, `email`, avatar). It no longer writes `ownerFullName` — `BasicAccountInfoForm` is the only writer for that field, eliminating the cross-form overwrite race.
- `BasicAccountInfoForm` (new): owner/brand/email + OTP-gated phone change.
- `PhoneChangeOtpModal` (new): mobile OTP flow.
- `ImagesAndPricingForm`: tracks existing and new images separately; deletes existing via DELETE endpoint with key extracted from the signed URL; new files removed locally before save.
- `ServiceDetailsForm`: serviceCategories rendered as toggleable chips; serviceLocation kept as React state (controlled `MapPicker`).
- `MapPicker`: dual-mode — RHF (`name` prop) or controlled (`value`/`onChange`). Backward-compatible.
- `services/vendorService.js`: new methods `updateProfile`, `updateProfileWithFiles`, `updatePassword`, `sendPhoneChangeOtp`, `updatePhone`, `deleteVendorImage`.
- `VendorAccountSetupScreen.js`: routes payloads to both `/users/profile` (top-level) and `/users/profile/vendorData` (section); refetches on any change.

### Still TODO (manual verification — author of this PR)
1. **End-to-end smoke per section** on web and mobile against the real backend (no mocks) — `CLAUDE.md` mandates real DB integration tests. Open the app, save one field per section, verify the network request + DB write + re-render.
2. **DELETE-with-body verification**: confirm `req.body.field` / `req.body.key` arrive populated server-side when the clients hit `DELETE /users/profile/vendorData/image`. If a proxy strips DELETE bodies in production, fall back to `POST /users/profile/vendorData/image/delete`.
3. **Existing S3 data**: per the user's "clean fix, no backward compat" directive, any pre-existing DB records that store full S3 URLs (instead of keys) will not render. Wipe vendor profile image fields or re-upload during smoke testing.

---

## 7. Open Questions (block execution)
1. **Phone number location.** Currently contradictory: User model has top-level `phoneNumber`, but `updateProfileSchema` doesn't accept it (strict mode), and web writes phone into `vendorData` section. Pick:
   - (a) Top-level only — add `phoneNumber` to `updateProfileSchema`, fix web to send via main route, remove from section schema. Simpler, no OTP for now.
   - (b) OTP-required — keep phone read-only in settings until an OTP flow exists. Both clients hide phone editing.
2. **Image deletion semantics.** Currently backend appends portfolio/price arrays; no remove. Pick:
   - (a) Add `DELETE /users/profile/vendorData/image` taking `{ field, key }` — deletes from S3 and removes from array.
   - (b) PATCH-replace semantics — client sends desired final array, backend diffs and deletes orphans. Simpler client logic but heavier payload.
   - (c) v1 = add-only, hide delete UI on both clients.
