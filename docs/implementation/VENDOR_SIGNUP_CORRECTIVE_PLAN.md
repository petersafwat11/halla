# Vendor Signup Full-Stack Corrective Plan

Status: implementation-ready after repository audit on 2026-09-06  
Scope: `halaa-web`, `halaa-mobile`, `halaa-backend`, and `shared`  
Goal: make vendor application submission reliable, secure, localized, resumable, and visually consistent in Arabic and English.

## 1. Ground rules for the implementation

- Treat the backend contract as the source of truth and make web and mobile serialize the same logical application.
- Preserve unrelated working-tree changes. In particular, do not overwrite the existing modified host continuation-signup files or the modified shared `ConfirmBtn` files. Inspect their diff before touching shared button code; prefer vendor-scoped styling if there is a conflict.
- Do not persist passwords, password confirmation, national ID numbers, verification documents, or file blobs in `localStorage`/plain `AsyncStorage`. Persist only non-sensitive text selections with a TTL. Files and sensitive values must be reselected/re-entered after a restart.
- Use the existing warm Halaa visual language and design tokens. This is a hierarchy, spacing, accessibility, and behavior correction—not a visual rebrand.
- Add tests with each phase; do not defer all testing to the end.

## 2. Verified findings and corrections to the earlier Gemini audit

### Confirmed high-impact defects

1. A successfully submitted vendor is created as `PENDING`, receives no usable token, and cannot log in, but both clients send the applicant directly to the login screen.
2. The backend upload middleware accepts `pricePackages` and `profileFile`, and the model contains both fields, but `signupVendor` does not persist either field.
3. Web Step 5 writes to `otherLinksAndData`, while validation expects `socialLinks`.
4. Web has a worse payload bug than originally described: `buildVendorFormData` chooses `socialLinks || otherLinksAndData`. Because the form initializes `socialLinks` to the truthy value `{}`, every legacy Step 5 link can be omitted from the request, including WhatsApp.
5. Mobile Step 5 has no step-level fields. Invalid hidden social URL fields can therefore prevent final submission from Step 6 without navigating back to the invalid step or explaining the block.
6. Mobile omits WhatsApp from the multipart `socialLinks` object.
7. Mobile file normalization is inconsistent. Expo picker assets do not reliably have the React Native multipart `{ uri, name, type }` shape.
8. Web `InputGroup` always renders `<input>`; `type="textarea"` does not create a multiline field. A reusable `TextArea` already exists and should be used instead of expanding `InputGroup` unless there is a strong reason to consolidate.
9. Web password visibility has two competing state owners. Once the parent changes `type` to `text`, `InputGroup` hides its own toggle.
10. National ID is duplicated on web Steps 1 and 4.
11. The shared service schema does not require any selected service category.
12. Web and mobile store service category arrays directly under `serviceData`, while the shared schema describes a nested `serviceData.serviceCategories` object. Serialization currently papers over that disagreement instead of validating the real form state.
13. Web service categories are all expanded; the page becomes unnecessarily long. The mobile flow has the same scanning problem.
14. Web Step 3 lacks a desktop layout rule for its sections and has inconsistent spacing from the other steps.
15. Web step containers use different nested padding strategies, so the form width and footer button positions shift between steps.
16. The web stepper is visual-only even though it receives navigation-related props. Its steps are plain containers, not accessible controls.
17. RTL/LTR behavior uses physical left/right offsets and a hard-coded right arrow in multiple places.
18. Web upload previews create object URLs without revoking them. The summary also creates new object URLs and assumes every file is an image.
19. Web uploads have no client-side count or size enforcement, their drop surface is not keyboard-operable, and selecting the same removed file may not fire a new change event.
20. Current clients are image-only for fields for which the intended experience includes PDF documents.
21. Web copy says three portfolio images while the schema requires one; brand-name copy says 50 characters while the schema allows 100; several price-package messages describe a text description rather than a file.
22. Web Step 6 references nonexistent values, omits meaningful values and attachment presence, and has no edit actions. Mobile Step 6 omits all sample/price/profile files, WhatsApp, and other useful details and also has no edit actions.
23. Mobile Arabic translations contain English strings throughout the active vendor flow, not only in service-category names.
24. Both clients lose the application state on refresh/process death/back navigation. Mobile's top-bar back action exits the screen; web query-string navigation can load an arbitrary or out-of-range step.
25. The rendered web page confirms excess vertical whitespace. The exact cause is structural: the 90px sticky header is followed by a 76px signup margin, while the fixed sidebar begins at 76px and therefore overlaps the bottom 14px of the header. Mobile inherits the same unnecessary top margin.

### Important defects missed in the earlier audit

1. Backend validation is far weaker than client validation. The server does not enforce password confirmation, ID/CR formats, required documents, the client service description limits, or the canonical nested JSON shapes. Direct API calls can bypass most onboarding rules.
2. The backend silently turns malformed JSON form fields into `{}`. Bad `serviceCategories`, `location`, or `socialLinks` payloads can be accepted instead of returning field-specific validation errors.
3. Uploads run before Zod validation and duplicate checks. A failed validation, duplicate, or service/database operation can leave orphaned S3 objects.
4. The general upload filter is shared by every vendor field and accepts document/spreadsheet formats for fields later rendered as images. A direct client can upload PDF/DOCX/XLSX as a logo or portfolio image.
5. Verification images are optional in the shared schema and are not included in mobile Step 4 validation even though the UI presents them as required verification evidence.
6. The backend accepts and processes a `cv` upload, and public serialization refers to it, but the vendor model has no `cv` field and neither current signup UI uses it. This is dead contract surface.
7. Vendor pending/approval/rejection email calls do not use the submitted locale. The helper defaults to Arabic, so English applicants can receive Arabic lifecycle emails even though `User.preferredLanguage` already exists.
8. The existing pending email promises a review in 1–3 business days. The proposed 24–48-hour success copy would conflict with that promise.
9. Generic backend social-link validation errors are not mapped to a particular client field because the response is not a structured field-error map.
10. Location loading failures are poorly surfaced. Mobile can look like it has no options; web only exposes the region query error and ignores downstream city/district failures.
11. Mobile's Arabic summary prefers English region/city names even when the current locale is Arabic.
12. Draft persistence was proposed too broadly. Persisting passwords, identity data, or documents in ordinary browser/mobile storage would create a new security defect.

### Corrections to proposed implementation details

- Do not use `file.type || file.mimeType` for Expo assets. Expo's `type` may be the generic string `image`, not a MIME type. Prefer a value containing `/`, with `mimeType` checked before `type`, and derive `name` from `fileName`, `name`, or the URI.
- Do not merely make the existing stepper clickable. Render semantic `<button type="button">` controls on web, expose accessibility roles/labels on mobile, permit completed/backward steps, and validate before any forward jump.
- Do not add another textarea branch blindly. Use the existing web `TextArea` component and give it the same label/error/helper API.
- Do not promise an application ID unless the backend explicitly returns a stable `applicationId`.
- Do not use the earlier screenshot's approximate pixel count as a CSS target. Remove the duplicate header offset and derive the sidebar position from the real header height.

## 3. Canonical contract to implement

Keep multipart transport, but define and test one logical `VendorApplication` contract.

### Text and JSON fields

- `email`
- `phoneNumber`
- `password`
- `passwordConfirm` (validation-only; never persist it)
- `preferredLanguage`: `ar | en`
- `brandName`
- `ownerFullName`
- `tagline`
- `serviceDescription`
- `aboutAr`
- `aboutEn`
- `commercialRegistrationNumber`
- `nationalId`
- `serviceCategories`: JSON object whose known category keys contain string arrays
- `location`: JSON object containing `regionId`, optional `cityId`, `districtIds`, and `coverageType`
- `socialLinks`: JSON object containing `whatsapp`, `twitter`, `instagram`, `facebook`, `linkedin`, `youtube`, and `website`

### File fields and limits

- `businessLogo`: optional, one image
- `portfolioImages`: required, 1–10 images
- `pricePackages`: required unless product explicitly changes the existing schema, 1–5 PDF/JPEG/PNG files
- `profileFile`: optional, one PDF/DOC/DOCX file
- `commercialRecordImage`: required, one PDF/JPEG/PNG file
- `nationalIdImage`: required, one PDF/JPEG/PNG file
- Maximum size: 10 MB per file, enforced consistently by clients and server.
- Do not accept SVG for identity, logo, or portfolio uploads. Do not accept spreadsheets unless a real business requirement is documented.
- Remove `cv` from the signup upload contract and related dead serialization, unless product explicitly adds a modeled CV field and UI.

### Validation rules

- Email and Saudi phone rules must match on client and server.
- Password: 8–128 characters, at least one letter and one digit; symbols are allowed rather than rejected. Show a proactive localized helper and strength/requirements feedback. Confirmation must match on client and server.
- Brand name: choose one limit and use it everywhere. Retain 100 unless product requests 50.
- Service description: retain the client rule of 10–500 and enforce it on the server.
- Require at least one selected option across all service-category arrays.
- Reject unknown category keys and invalid option IDs; do not merely validate category names.
- Region is required. City remains optional when region-wide coverage is supported; remove the misleading required asterisk from city rather than forcing a city for region coverage.
- CR/national ID numeric rules must be identical on client and server.
- Normalize blank optional URLs to absence. Validate every provided social URL and return a field-specific path such as `socialLinks.instagram`.
- WhatsApp should be normalized and validated as a phone/contact value, not as a generic URL.
- Reject malformed JSON with HTTP 400 and a precise field error; never silently coerce it to `{}`.

## 4. Implementation sequence

### Phase 1 — Backend source of truth and storage integrity

Primary files:

- `halaa-backend/src/modules/auth/auth.validation.js`
- `halaa-backend/src/modules/auth/auth.routes.js`
- `halaa-backend/src/modules/auth/auth.service.js`
- `halaa-backend/src/modules/auth/auth.controller.js`
- `halaa-backend/src/shared/utils/s3Upload.js`
- `halaa-backend/models/UserModel.js`

Tasks:

1. Replace the permissive vendor signup schema with the canonical contract above, including JSON parsing/refinement and field paths.
2. Validate `passwordConfirm`, then discard it before model creation.
3. Validate category option IDs against the authoritative allowed option set.
4. Make upload filtering field-aware and enforce count, MIME, extension, and 10 MB size at the server boundary.
5. Persist `pricePackages` and `profileFile` alongside existing file fields.
6. Remove the unused `cv` signup path unless it is intentionally modeled end-to-end.
7. Add cleanup for all newly uploaded S3 keys when validation, duplicate detection, service validation, or database creation fails. Prefer staging uploads until validation where feasible; otherwise use one idempotent cleanup path in `finally`/error handling.
8. Return structured errors in a stable form, for example `{ code, message, fieldErrors: { "socialLinks.instagram": "..." } }`.
9. Return a stable `applicationId`, `status: "pending"`, and `pendingApproval: true`. Do not return tokens for a pending account.
10. Accept `preferredLanguage`, store it on the new user, and pass it to pending, approval, and rejection email templates.
11. Keep the review promise at 1–3 business days across API-facing copy, email, web, and mobile unless product deliberately changes the SLA everywhere.
12. Confirm that a public vendor projection never exposes identity/verification documents. Applicant/admin authenticated projections may include them only where required.

Exit criteria:

- A direct multipart API call cannot bypass onboarding validation.
- All accepted fields are persisted; all rejected/failed submissions leave no new S3 objects.
- Arabic and English applicants receive lifecycle emails in their preferred language.

### Phase 2 — Shared form schema and contract fixtures

Primary files:

- `shared/src/schemas/auth.js`
- `shared/src/schemas/_shared.js`
- shared auth schema tests/fixtures

Tasks:

1. Make the shared form shape match the real form state, including direct category fields or refactor both forms to the canonical nested shape. Prefer the nested canonical shape if the refactor remains contained.
2. Add the cross-category minimum-one refinement.
3. Add required verification-document rules and aligned count/size/type refinements for client feedback.
4. Allow password symbols while retaining length, letter, and digit requirements.
5. Add localized required/type messages for region and file fields.
6. Create reusable valid/invalid application fixtures used by web, mobile, and backend contract tests.

Exit criteria:

- The same fixture has the same pass/fail result at the shared client layer and server layer.

### Phase 3 — Web data correctness and navigation

Primary files:

- `halaa-web/ui/auth/signup/vendor/VendorSignup.js`
- `halaa-web/utils/authFormHelpers.js`
- `halaa-web/ui/auth/signup/vendor/stepOne/StepOne.js`
- `halaa-web/ui/auth/signup/vendor/stepTwo/StepTwo.js`
- `halaa-web/ui/auth/signup/vendor/stepThree/StepThree.js`
- `halaa-web/ui/auth/signup/vendor/stepFour/StepFour.js`
- `halaa-web/ui/auth/signup/vendor/stepFive/StepFive.js`
- `halaa-web/ui/auth/signup/vendor/stepSix/StepSix.js`
- `halaa-web/ui/commen/stepper/Stepper.js`

Tasks:

1. Replace `otherLinksAndData` with `socialLinks` everywhere. Delete the legacy fallback after migrating defaults, validation, serializer, summary, and error mapping.
2. Add Twitter and retain WhatsApp in the canonical payload.
3. Ensure final submission uses the validated values passed by React Hook Form instead of reading unvalidated `getValues()`.
4. Clamp/validate the `?step=` value to 1–6. Do not allow a URL to jump forward past incomplete required steps.
5. Remove national ID from Step 1 and keep it in commercial verification.
6. Give password visibility one state owner inside `InputGroup`; make labels localized and accessible.
7. Replace fake textarea inputs with the existing `TextArea` component.
8. Make the stepper semantic and keyboard-operable. Completed/backward steps may be visited; forward visits require all intervening steps to validate.
9. On validation failure during final submit, find the earliest invalid field, navigate to its step, focus it, and show a localized summary/toast.
10. Add draft restore for non-sensitive fields only, namespaced by locale/user intent, with schema version and TTL. Explicitly exclude password, confirmation, national ID, CR number, and every file.
11. Warn before abandoning a dirty application, but do not trap the user after successful submission.

Exit criteria:

- Every visible Step 5 value appears in the multipart request.
- An invalid hidden field always takes the user to a visible error.
- Refresh restores only approved non-sensitive fields and never restores secrets/documents.

### Phase 4 — Web uploads, summary, and layout

Tasks:

1. Build one upload component API that supports image-only, document-only, or mixed rules per field; show allowed types, maximum count, and 10 MB limit before selection.
2. Enforce counts/types/sizes client-side and map server upload errors to the same field.
3. Make the drop surface a real button or accessible labelled control with keyboard activation and focus styling.
4. Reset the native input value after a selection/removal so the same file can be selected again.
5. Revoke all object URLs on replacement/unmount. Show document rows/icons for PDFs/DOCX rather than rendering every file as `<img>`.
6. Clarify add-versus-replace behavior for multiple files.
7. Rebuild Step 6 as a complete review grouped by step: account, service/about/categories, location, portfolio/logo/price/profile, verification numbers/document presence, and all social links.
8. Add localized Edit actions that return to the relevant step without losing data.
9. Remove the duplicate 76px top margin below the sticky header. Share one header-height variable and use it for the fixed sidebar offset.
10. Constrain the welcome block and form to one content axis. Reduce redundant headings so each step has one page title, one short description, and clear section labels.
11. Use one consistent form/card padding scale and a stable footer. Keep Back and Continue in fixed semantic positions in both RTL and LTR; stack them on narrow screens if necessary.
12. Add the missing Step 3 desktop grid/gap. Convert service categories to progressive disclosure (accordion/search/filter) while keeping selections visible in collapsed headers.
13. Replace physical `left`/`right`, margins, padding, and arrows with logical properties/direction-aware icons.
14. Remove dead Step 4 CSS and replace the indigo focus fallback with the Halaa focus token.

Visual acceptance:

- No sidebar/header overlap at desktop breakpoints.
- No unexplained empty band below the header on mobile or desktop.
- The form axis, title axis, and footer controls do not jump between steps.
- All controls have visible keyboard focus and meet practical WCAG AA contrast/target sizing.
- Test at 320, 390, 768, 1024, 1280, and 1440 CSS pixels in Arabic and English.

### Phase 5 — Mobile serialization, navigation, and resilience

Primary files:

- `halaa-mobile/screens/auth/VendorSignupScreen.js`
- `halaa-mobile/hooks/auth/_api.js`
- `halaa-mobile/components/auth/vendor-signup/*`
- `halaa-mobile/components/commen/ImageInput.js`
- `halaa-mobile/components/commen/MultiImageInput.js`
- mobile vendor-flow translations

Tasks:

1. Add Step 5 social fields to step validation and include WhatsApp in serialization.
2. Implement a single `normalizeRNFile(file, fieldKind)` adapter returning `{ uri, name, type }`.
   - Prefer `mimeType` when it contains `/`.
   - Use `type` only when it contains `/`.
   - Otherwise infer from a trusted extension and the field's allowlist.
   - Derive the filename from `fileName`, then `name`, then the URI.
   - Reject unknown/disallowed files instead of assigning a misleading default MIME type.
3. Apply the adapter to single-image, multi-image, and document-picker results before appending FormData.
4. Use the already-installed document picker for PDF/document fields; keep image picker for image-only fields.
5. Add visible progress, cancellation-safe state, and field-specific upload errors.
6. On final invalid submit, navigate to and focus the earliest invalid step/field.
7. Change the top-bar behavior: within the wizard, go to the previous step; from Step 1, show a discard confirmation only when the non-sensitive draft is dirty.
8. Persist only approved non-sensitive fields with schema version and TTL. Do not persist passwords, IDs, files, or transient picker URIs.
9. Restore the draft after location/category reference data loads, and discard incompatible/expired option IDs.
10. Complete Step 6 and use locale-aware region/city/category labels.
11. Add accessible stepper state and allow safe backward/completed-step navigation.
12. Fix the bottom safe-area background so it matches the footer/form surface.
13. Finish Arabic localization for every active vendor-flow label, option, validation message, picker message, summary label, and action.
14. Show loading, retry, empty, and failure states for region/city/district requests.

Exit criteria:

- Multipart payloads from iOS and Android contain valid `name` and MIME `type` for every file.
- Background/foreground and process restart preserve only allowed draft fields.
- Arabic UI and summary do not fall back to English for known translated data.

### Phase 6 — Pending-approval completion experience

Implement a dedicated web page and mobile screen displayed after a successful application.

Required content:

- Clear `Application received` / Arabic equivalent.
- Pending review state, not `account created`.
- Stable application ID returned by the backend.
- One consistent promise: 1–3 business days.
- Explanation that login becomes available only after approval.
- Primary action to return home/marketplace and secondary support/contact action.
- No primary action that sends the user to a login flow that must reject them.

Handle repeat submissions and duplicate email/phone errors without implying that a new application was created.

### Phase 7 — Tests and release gates

Add automated coverage for at least the following:

#### Backend/integration

- Valid multipart application persists every text, JSON, and file field.
- Password mismatch and malformed JSON are rejected with field paths.
- Zero categories and unknown category/option IDs are rejected.
- Missing required documents, wrong per-field MIME, too many files, and oversized files are rejected.
- A failed validation, duplicate, or simulated database failure cleans up uploaded S3 keys.
- Pending response has no token and includes a stable application ID.
- Pending/approved/rejected emails use `preferredLanguage`.

#### Web

- Step 5 values serialize under canonical `socialLinks`, including WhatsApp and Twitter.
- Textareas are actual `<textarea>` elements.
- Password reveal remains operable and accessible.
- Arbitrary query steps cannot bypass validation.
- Hidden invalid fields navigate/focus correctly.
- Object URLs are revoked and PDFs use document previews.
- Draft storage excludes every sensitive/file field.
- Stepper and upload controls pass keyboard tests.

#### Mobile

- Expo assets normalize correctly for both iOS and Android shapes.
- WhatsApp is present in FormData.
- Hidden Step 5 errors navigate back visibly.
- Back behavior, draft TTL/versioning, and sensitive-field exclusion work.
- Arabic summary resolves Arabic names.
- PDF selection and rejection rules match the server.

#### End-to-end and visual

- Submit one complete application from web Arabic, web English, Android Arabic, and iOS English against a test backend and verify the database/S3/admin review projection.
- Approve and reject test applications and verify localized email plus subsequent login behavior.
- Capture visual regression snapshots for all six steps and pending completion at the target widths.
- Run accessibility checks plus manual keyboard/screen-reader smoke tests.

Release is blocked if any accepted field is dropped, any pending user is redirected to login as the success path, any failed submission leaks uploads, or any client/server validation rule disagrees.

## 5. Suggested commit boundaries

1. `fix(auth): enforce canonical vendor application contract`
2. `fix(auth): persist vendor documents and clean failed uploads`
3. `fix(shared): align vendor signup schema and fixtures`
4. `fix(web): repair vendor wizard data and validation flow`
5. `fix(web): rebuild vendor upload review and responsive layout`
6. `fix(mobile): normalize vendor multipart files and navigation`
7. `fix(i18n): complete vendor signup Arabic and lifecycle email locale`
8. `feat(auth): add pending vendor application confirmation`
9. `test(auth): cover vendor application contract end to end`

## 6. Execution instruction for Gemini

Implement this plan in phase order. Before changing code, inspect current diffs and preserve unrelated edits. For each phase, first add or update the narrow failing tests, implement the smallest coherent change, run the relevant package tests/lint/type checks, and report exact commands and results. Do not claim completion from UI-only behavior: verify the final multipart payload, database fields, S3 cleanup, preferred-language email selection, and pending-account response. Stop and surface a product decision only if it changes the contract listed above; otherwise use the specified defaults.
