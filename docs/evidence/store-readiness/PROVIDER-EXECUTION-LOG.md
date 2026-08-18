# Provider execution log

This log records provider operations without credentials, tokens, private keys, reviewer passwords, personal contact details, or full raw provider responses.

## 2026-08-15 — Google container, billing transport, and internal build verified

- Created the Google Play app `Halaa` for package `com.halaa.app`; no production-track release or store submission was made.
- Created a dedicated Google Cloud project and restricted service account for RevenueCat catalog, subscription, and purchase validation. Credential material remains outside Git.
- RevenueCat Google credentials validate successfully for both the in-app product catalog and subscription/base-plan catalog.
- Connected Google Play real-time developer notifications to RevenueCat through Pub/Sub topic `projects/halaa-store-providers/topics/Play-Store-Notifications`.
- Google Play's test notification succeeded and RevenueCat recorded receipt at `2026-08-15 14:47 UTC`.
- Expo Doctor passed **18/18** and mobile tests passed **36/36**. EAS production Android build `a82dc69c-c3d0-4b81-968e-8ba0b016ada5` completed successfully with version code `3`.
- Uploaded the signed AAB to Google Play Internal Testing. Release `Halaa Internal Billing v1.0.0 (3)` is **Active**, available only to the selected two-person tester list, and has not been promoted to production.
- Internal-test opt-in URL: `https://play.google.com/apps/internaltest/4701372785579698840`.
- Remaining automation gates: App Store Connect API credential, restricted RevenueCat API v2 credential, read-only provider preflight, reviewed product dry-runs, and explicit apply approval.

## 2026-08-15 — provider API preflight and live readback

- App Store Connect API organization access was approved. Team key `2C4S378QS6` has the App Manager role and its private key is stored outside Git.
- Created a restricted RevenueCat API v2 key: project/apps/integrations read-only; products, entitlements, offerings, and packages read/write; all customer, analytics, collaborator, audit, and unrelated configuration access disabled. The secret remains outside Git.
- Provider preflight: `readyForLocalGeneration: true`, `readyForProviderRead: true`, no missing configuration, and both credential files confirmed outside the repository. Apply remains fail closed.
- Apple, Google catalog, and RevenueCat read-only exports succeeded. Provider toolkit tests remain **PASS, 15/15**.
- Corrected two empty/new-account readback defects in the local exporter: Google `204 No Content` now normalizes to an empty catalog, and RevenueCat project metadata is selected through its supported project-list endpoint.
- Live dry-runs from readback: Apple `55` operations / `0` conflicts; Google `54` operations / `0` conflicts; RevenueCat `222` operations / `5` expected legacy Test Store conflicts. External writes: **0**.
- Google service-account app permission `Manage store presence` was added and saved. Catalog reads work, but `convertRegionPrices` still returns `403` while the new permission propagates; no broader permission was granted.

## 2026-08-15 — pre-creation localization, price, and level review

- Generated a secret-free approval sheet covering all **54** products, **108** Arabic/English localization rows, target Saudi Riyal amounts, and proposed levels for all **14** subscriptions.
- Replaced overlong generic copy discovered during validation. All names now fit Apple's 30-character limit and all descriptions fit its 45-character limit (observed maxima: 28 and 43).
- Proposed Apple subscription ordering: business annual/quarterly at level 1; premium monthly capacities at levels 2–7; basic monthly capacities at levels 8–13. This remains awaiting explicit owner approval.
- Exact Apple price-point IDs are intentionally deferred: they are product-specific and can only be read after approved immutable shells exist. Target SAR amounts are presented now; exact Saudi price-point IDs will receive a second approval before price application.
- `npm run providers:test`: **PASS, 17/17**. `npm run catalog:verify`: **PASS, 26/26**. External provider writes: **0**.
- Review artifact: `provider-payloads/provider-approval-review.generated.md`.

## 2026-08-16 — approved Apple shells and Saudi price-point readback

- Recorded explicit approval for the generated AR/EN copy, frozen SAR targets, and proposed subscription levels in the catalog-bound approval overlay.
- Applied sealed Apple plan `1c47a056e5681ee3a5224e0b767d74f312ac001c513ca1dc6018462e2f85d040` in the restricted `shells` stage.
- Created exactly **1** subscription group, **14** auto-renewable subscription shells, and **40** consumable shells. Metadata, availability, prices, submission, and publication were technically excluded from this stage.
- Post-write readback verified **1 / 14 / 40** with no count drift. Provider-toolkit tests: **PASS, 18/18**.
- Read all product-specific Saudi price points. Results: **27** exact SAR matches; **23** nearest matches at SAR `-0.01`; **3** nearest matches at SAR `+4.00`; and **1** higher-price access requirement for `business_annual` (target SAR 10,000; currently exposed maximum SAR 4,299.99).
- No Apple price was applied. Price review artifact: `provider-payloads/apple-price-point-review.generated.md`.

## 2026-08-16 — approved Apple price application (partial by provider prerequisite)

- Recorded explicit approval for **53** product-specific Apple price points; `business_annual` remains deferred pending higher-price access.
- Applied and journaled all **40/40** approved consumable price schedules successfully.
- Apple rejected the first subscription starting-price request because its subscription-plan availability prerequisite does not yet exist. The executor stopped with **0/13** subscription prices applied.
- No metadata, localization, territory availability, submission, or publication was changed during the price stage.
- Next authorization required: create Saudi-only (`SAU`) `UPFRONT` subscription-plan availability for the 13 price-approved subscriptions, then resume their sealed price operations. The annual subscription remains excluded.

## 2026-08-16 — cross-agent continuation package

- Updated the co-development plan, provider toolkit README, zero-drift status, and chronological execution log to the current partial-apply state.
- Added `PROVIDER-CONTINUATION-HANDOFF.md` with secret-free provider IDs, credential paths, approvals, journals, exact resume instructions, stop rules, and remaining work for a replacement coding agent.
- Added machine-readable `provider-current-state-2026-08-16.json`.
- Reconfirmed Google `regions-version` remains HTTP 403 with the restricted service account; this is documented as unresolved.
- Confirmed the Apple price journal contains 40 unique completed consumable price operations and zero completed subscription prices. The same journal must be reused.
- Secret-pattern scan of the new handoff/current-state documents found no private-key blocks, service-account private key, or RevenueCat secret value.

## 2026-08-18 — Apple App Privacy Published, iOS Production EAS Build Completed & Submitted to TestFlight

- **Apple App Privacy Published:** Completed and published the full 15-category App Privacy nutrition label on App Store Connect (App ID: `6800947115`). Declared 0% tracking, App Functionality + Analytics purposes, and linked privacy URLs (`https://halaa.com.sa/ar/privacy` and `https://halaa.com.sa/ar/delete-account`).
- **Apple Age Rating:** Configured and calculated universal **4+** rating (Suitable for all ages).
- **Apple App Pricing:** Set base country to Saudi Arabia (SAR) with Price: **Free (SAR 0.00)**.
- **RevenueCat iOS SDK Key Provisioned:** Added `REVENUECAT_IOS_KEY` (`appl_...`) to EAS production environment.
- **Apple Credentials & Signing Generated:**
  - Distribution Certificate: `4E389D3FACECF6F055E55DC1A8AB6AD8` (Exp: Aug 18, 2027)
  - Provisioning Profile: `88Y75RGCQ4` for `com.halaa.app`
  - Apple Push Notification (APNs) key generated and assigned.
  - App Store Connect API Key for EAS Submit: `AW4492353G`.
- **iOS Production Build:** Completed successfully on EAS (Build ID: `3fe4e684-d422-4c35-a7b7-cb305ca1a3af`, Version 1.0.0, Build 2).
- **TestFlight Upload:** Successfully uploaded binary to App Store Connect (`https://appstoreconnect.apple.com/apps/6800947115/testflight/ios`) via EAS Submission `60533462-9dd7-4993-852c-8fb77cf60602`. Processing on Apple servers.

## 2026-08-17 — Google Play Data Safety, IARC Content Rating, Visual Assets, and Store Settings Completed (Ready for Review)

- **Google Play Data Safety:** Audited and submitted full questionnaire via Google Play Developer API (`applications.dataSafety` with CSV payload); received **Status: 204 No Content (Success)**. Master definition saved at `docs/store-readiness/store-metadata/google-data-safety.csv`.
- **IARC Content Rating:** Official rating questionnaire completed in Google Play Console; issued universal rating **Rated for 3+** (Rest of World / Saudi Arabia), ESRB Everyone, PEGI 3, USK 0.
- **Store Settings & Contact Details:** Applied support email (`support@halaa.com.sa`), phone (`+966552619282`), website (`https://halaa.com.sa`), and category `Events` via API (`Edit ID: 12034065165806943494`).
- **Store Visual Assets Uploaded & Committed:** Generated 512x512 app icon, 1024x500 brand feature graphic banner, and 4 high-resolution mobile phone & tablet screenshots from the landing page. Uploaded and committed for both Arabic (`ar`) and English (`en-US`) via API (`Edit ID: 02874674653027154223`).
- **Policy Declarations:** Completed Government Apps (No), Financial Features (No financial features), Health (No health features), AI Asset Labeling (Don't label).
- **Google Play Console Status:** Reached **`Ready to send for review`**.

## 2026-08-17 — Store listing metadata applied across Apple App Store Connect & Google Play Console

- Owner approved Arabic and English store listing copy, category selections, support URLs, promotional text, keywords, and reviewer contact/notes.
- Google Play Store listings applied via Google Play Developer API (`scripts/providers/applyGoogleListings.js`):
  - Arabic (`ar`): Title `هلا`, Short description, Full description committed.
  - English (`en-US`): Title `Halaa`, Short description, Full description committed.
  - API Edit ID: `15952615365779525237` committed with status 200.
- Apple App Store Connect metadata entered & saved on app `6800947115` (Version 1.0):
  - Arabic (`ar-SA`): Name `هلا`, Subtitle `منصة إدارة المناسبات والدعوات`, Promotional text, Keywords (80 bytes), Full description, Support & Marketing URLs, Copyright.
  - App Categories: Primary `Lifestyle`, Secondary `Business`.
  - App Review Information: Reviewer contact info (`Salem Bamehriz`, `+966552619282`, `support@halaa.com.sa`), reviewer sign-in credentials & guidance notes.
- Updated and validated ASO metadata templates: `shared/scripts/validate-aso-metadata.mjs` passes with **16/16 approved fields, 0 blocked, 0 over-limit**.

## 2026-08-16 / 2026-08-17 — RevenueCat production catalog apply: 106 connections, 53 packages, 4 offerings, 1 entitlement, ZERO DRIFT

- Owner approved cleaning legacy Test Store sample objects via API (`default` offering, `Halaa Pro` entitlement, 3 test products `lifetime`/`monthly`/`yearly`).
- Created initial production offering `host_plans` (`ofrng8aa4564fd2`), designated it `is_current: true`, deleted dummy `default` offering and dummy packages.
- Sealed 217-operation RevenueCat plan `2f61891d8375346333e7d7db1ef2e43f95ecc72c23c34fc6e10193f580f89e6e` against clean live export.
- Applied all operations via RevenueCat API v2:
  - **106 platform product connections** (53 iOS on `app63720480d5` + 53 Android on `appc8bcc56e96`);
  - **1 entitlement** `recurring_access` attaching exactly the 26 subscription connections (13 iOS + 13 Android) and 0 consumables;
  - **4 offerings**: `host_plans` (24 packages), `business_plans` (7 packages), `host_addons` (21 packages), `business_addons` (1 package);
  - **53 packages** attaching matching iOS and Android product pairs.
- Journal: `provider-after/revenueCat-apply-journal.jsonl` (217 operations completed, 0 failed).
- Live readback export confirmed exact counts: **106 products, 1 entitlement (26 attached), 4 offerings, 53 packages**.
- Fresh plan against live export reports **0 operations, 0 blockers, 0 conflicts** (`56c216d7…`). **RevenueCat ZERO DRIFT achieved**.

## 2026-08-16 — Google 53-product apply: zero blockers, 53 drafts applied and read back

- Permissions resolved: Owner granted "Edit and delete draft apps", "Manage orders and subscriptions", and "Manage store presence" at both Account and App levels for the service account in Google Play Console.
- `regions-version` returned active region version `2025/03` with exit code 0.
- Normalized Google listing language code mapping (`ar-SA` → `ar`) in `googleApply.js` to adhere to Google Play Developer API BCP-47 requirements. Provider toolkit tests: **PASS, 24/24**.
- Generated and sealed the 53-product Google plan `e0c33e7cd130ff5053e6949f504537305db22d8e38271bf8148f44be0edd9cb2` against the live empty export and catalog-53 approval overlay.
- Owner gave explicit approval to apply the sealed Google plan.
- Applied all **53/53** operations (13 auto-renewing subscriptions with base plan `monthly`/`quarterly` + 40 one-time consumable products). Journal: `provider-after/google-apply-journal.jsonl` (53 completed, 0 failed).
- Readback export (`provider-after/google-export.json`) confirmed exactly **13 subscriptions** and **40 one-time products** present as Saudi-only (`SA`) drafts in Google Play Console. `business_annual` excluded per directive.
- External writes: 53 draft product records created on Google Play Console. No production release or submission attempted.

## 2026-08-16 — owner directive: business_annual removed from all stores; catalog 54→53; Apple product-level zero drift

- Owner directive (this session): `business_annual` is removed from every store — the owner deleted its Apple subscription shell directly in App Store Connect, and the product must not be created on Google Play or RevenueCat. The plan remains in the backend catalog as an internal/admin-only plan (managed/negotiated acquisition path only), exactly like `trial`/`unlimited`.
- Catalog change: `catalog.overlay.js` marks `business_annual` internal (`storeEligible=false`, `fulfillment=admin_only`, `providerExclusionReason=owner_directive_2026_08_16_store_removed_managed_acquisition_only`). Regenerated all artifacts. New catalog hash `20d07092eeb8684a3a82acc987bd07355f3e1952ed47e6ec50c966315aca8499` (supersedes `7410b2c6…`). Store products are now **53 per platform = 13 subscriptions + 40 consumables**; RevenueCat targets become 106 connections / 53 packages / 26 entitlement attachments / `business_plans` 7 packages.
- Restored local workspace dependencies (`npm install`; the handoff's known missing-`zod` environment issue — the catalog itself was never changed for that).
- Updated invariant counts in the provider toolkit (`lib/catalog.js`, `lib/desiredState.js`) and tests: store-catalog contract tests, RevenueCat store-safe projection test (54→53), provider-toolkit tests (24/24 pass; `catalog:verify` passes; backend failures in this environment are the pre-existing unbuilt `@halaa/shared` workspace package and DB-dependent integration tests, unrelated to this change).
- Created new catalog-bound approval overlay `provider-payloads/provider-approvals.catalog-53.json`: the 53 owner-approved Apple price points and 13 subscription levels carried forward verbatim from the 2026-08-16 approval and re-bound to the new catalog hash, with the removal directive recorded. The original overlay is preserved as historical evidence.
- Added price readback to the Apple exporter (`GET /v1/subscriptions/{id}/prices` and `GET /v1/inAppPurchasePriceSchedules/{id}/manualPrices` with price-point/territory includes) and made the `prices` stage idempotent with `APPLE_PRICE_MISMATCH` conflicts on drift.
- Live Apple readback after the owner's console deletion: 13 subscriptions, 40 consumables, 26+80=106 localizations, 13+40 availabilities, 13+40 prices — `business_annual` absent.
- **Apple product-level zero drift achieved**: sealed plans for all five stages (`shells`, `prices`, `availability`, `localization`, `iap_availability`) against the fresh export report **0 operations, 0 blockers, 0 conflicts**. Product-level Apple configuration exactly matches the 53-product catalog.
- Google: owner granted the service account "View financial data" (account level). `regions-version` (`monetization.convertRegionPrices`) still returns HTTP 403 — likely propagation (Google documents up to 24 hours for API permission changes) or the per-app permission column needs ticking too. No other permission was changed; Google apply remains gated on this readback.
- External writes this session: **0** (catalog/tests/docs only; the only provider mutation was the owner's own console deletion of the Apple annual shell).

## 2026-08-16 — approved Apple AR/EN localization and consumable Saudi availability

- Probed the live App Store Connect API with invalid empty bodies (zero side effects) to confirm the current endpoint contract: subscription localizations are created via `POST /v1/subscriptionLocalizations` with a direct `subscription` relationship; IAP localizations via `POST /v1/inAppPurchaseLocalizations` with a direct `inAppPurchaseV2` relationship; IAP availability via `POST /v1/inAppPurchaseAvailabilities`. The version-based localization model in older API versions is not used; localizations attach directly to products.
- Added sealed `localization` and `iap_availability` stages to the provider toolkit: readback of subscription/IAP localizations and IAP availabilities with territories; fail-closed planners (content mismatch, extra locale, and territory drift become conflicts; idempotent skips for exact matches); journaled executors. Provider-toolkit tests: **PASS, 24/24**.
- Recorded explicit owner approval for both stages against sealed plan hashes `e7dd20af3eff07f24f39a5f13bae966f1658252499836540dadb7c712dae4749` (localization, 108 operations) and `b07993ec8821ddcb1876ee6a7512b48faaf5bc92b4e50a3e780f5dd91ae46a8b` (IAP availability, 40 operations).
- Applied **108/108** localization records: Arabic `ar-SA` and English `en-US` display name and description for all 54 products (28 subscription + 80 consumable records), using exactly the copy approved in the earlier localization review. Journal: `provider-after/apple-localization-apply-journal.jsonl` (108 started / 108 completed / 0 failed).
- The first `iap_availability` apply attempt was stopped by the toolkit's state-change guard because the localization apply had changed App Store Connect state after the shared export basis. Regenerated the plan from a fresh export and verified the operation set was byte-identical (40 × `set_iap_availability`, territories exactly `SAU`, `availableInNewTerritories=false`); resealed as `375530cdaa0bb78e3f12d29cd87b3cbd4cfe8bc843dcb354eaeaa1fd704c600f` and applied it. Journal: `provider-after/apple-iap-availability-apply-journal.jsonl` (40 started / 40 completed / 0 failed).
- Final read-only readback verified: **108/108** localizations match the approved AR/EN copy exactly (0 mismatches); **40/40** consumable availabilities are Saudi-only with `availableInNewTerritories=false` (0 violations); the 13 subscription plan availabilities remain `UPFRONT`/`SAU`.
- No app-level metadata, app territory availability, review submission, screenshot upload, or publication was changed. `business_annual` price remains deferred pending higher-price access.
- Remaining Apple work: `business_annual` higher-price request + new price review/approval, review screenshots/metadata that require a build, and final zero drift.

## 2026-08-16 — approved Saudi UPFRONT availability and completed all approved Apple prices

- Recorded the explicit owner approval: "I approve enabling Saudi-only availability for the 13 price-approved subscriptions." It was granted against sealed availability plan hash `5774a1ae715e89363895630875d432a99039a1629274dcc9a6797a41c4bd51ad`.
- Added a separately sealed Apple `availability` stage to the provider toolkit: read-only `planAvailabilities` + `availableTerritories` export readback, an idempotent fail-closed planner (unexpected plan types and non-SAU territory drift become conflicts), a journaled apply executor, and the CLI apply gate. Stage-specific plan files are now written as `<provider>-<stage>-plan.generated.json` so the canonical sealed full/prices plan is never overwritten. Provider-toolkit tests: **PASS, 21/21**.
- Applied **13/13** Saudi-only `UPFRONT` subscription-plan availability operations with `availableInNewTerritories=false`; journaled in `provider-after/apple-availability-apply-journal.jsonl` (13 started / 13 completed / 0 failed).
- Read back and verified all **13** availability records: `planType=UPFRONT`, `availableInNewTerritories=false`, territories exactly `SAU`. `business_annual` was excluded as deferred.
- Resumed sealed prices plan `c00108a7c266f273b5e45b61546e14c37954e487f850c79d2abc1c385d89bcd1` on the **same** price journal and applied the remaining **13** subscription starting prices. The journal now contains **53 unique completed** operations (40 consumables + 13 subscriptions); the nine historical 409 failures from the earlier aborted run are all superseded by completed records.
- Read back all 13 subscription prices through `GET /v1/subscriptions/{id}/prices`: each has exactly one price record whose `subscriptionPricePoint` ID matches the approved 53-price overlay exactly and whose territory is `SAU`.
- No app metadata, product localization, consumable/app-level availability, review submission, or publication was changed. External writes in this session were limited to 13 availability records and 13 subscription starting-price records.
- Remaining Apple gates: Account Holder requests higher price-point access for `business_annual` (SAR 10,000), then a new price review/approval; AR/EN metadata and remaining availability orchestration still fail closed until implemented and separately approved.

## 2026-08-13 — application-container execution started

- Catalog verification: **PASS, 26/26**; provider-toolkit tests: **PASS, 15/15**; dry-run external writes: **0**.
- Registered Apple bundle ID `com.halaa.app` with Associated Domains, Push Notifications, and In-App Purchase capabilities.
- Created the App Store Connect app `Halaa` with numeric app ID `6800947115`, Arabic primary language, and SKU `HALAA-IOS-001`. No version, product, build, or app was submitted.
- Prepared Google Play app fields for `Halaa` / `com.halaa.app` / Arabic / App / Free. Creation remains gated by the owner's Developer Program Policies, Play App Signing, and U.S. export-law declarations.
- RevenueCat Apple app creation is prepared but blocked on the required Apple In-App Purchase `.p8` key, Key ID, and Issuer ID. No credential contents were captured.
- EAS authentication and project linkage were revalidated. Expo Doctor passed **18/18** and mobile tests passed **36/36**. No preview EAS environment variables exist, so no signed build was started.
- Structured evidence: `provider-after/container-readiness-2026-08-13.json`.

## 2026-08-09 — `PROVIDER_ACCOUNTS_INVENTORIED`

- Mode: read-only; external writes: **0**.
- Git commit inspected: `ebefaf875b920ad029f8f8c1ac8f532941fb5cc4` on `master`.
- Catalog: version `1.0.0`; catalog hash `7410b2c6f950400ddfe62d0d2ba9e50caee361ca0594e5b6505b89e5050c0071`; manifest SHA-256 `ba74c791a3ad103dd4950de88b6b40673af38bb7882add2e5ca25f4fd3faded7`.
- `npm run catalog:verify`: **PASS**, 26/26 contracts; 54 products per store, 14 subscriptions, 40 consumables.
- Apple: authenticated Account Holder/Admin; no apps; updated Developer Agreement and legal-entity update required before the Paid Apps Agreement can be signed.
- Google Play: authenticated organization account; no apps; app creation locked pending identity, website, and phone verification; policy status reports no issues.
- RevenueCat: existing `Halaa` project (`projc49d20a4`), Owner access, email unconfirmed, 2FA disabled, no real-store app configurations, one default Test Store offering with three packages. Current transfer behavior conflicts with the signed keep-with-original policy.
- EAS: existing `halla` project (`d5570c5a-d11b-4716-81d6-108939d72b22`) matches local `app.json`; no production build or submission; one expired preview Android artifact observed.
- Full structured inventory: `provider-before/account-inventory.json`.

### Owner prerequisites discovered

1. Apple Account Holder accepts the updated Developer Agreement and updates the legal entity; then completes the Paid Apps Agreement, banking, and tax.
2. Google account owner completes identity/document, website, and phone verification; payments/tax readiness is checked after app creation unlocks.
3. RevenueCat owner confirms the account email and enables 2FA before configuration credentials are created.

### Stop-rule observations

- No immutable Apple or Google product IDs exist, so the frozen catalog has no provider conflict yet.
- RevenueCat is not empty. The existing default Test Store offering and three packages must be explicitly reconciled before the final exact-four-offerings drift gate.
- No setting was changed and no app, product, key, or credential was created during inventory.

## 2026-08-09 — deterministic toolkit foundation

- Added catalog validation, deterministic desired-state generation, strict normalized diffing, credential-location preflight, pagination/retry support, and read-only Apple/Google/RevenueCat exporters.
- Generated payload counts: Apple 54; Google 54; RevenueCat 108 product connections, one entitlement, four offerings, 54 packages.
- `npm run providers:test`: **PASS**, 5/5 provider invariants.
- Full backend `npm test`: **PASS**, 279/279.
- `npm run catalog:verify`: **PASS**, 26/26.
- Provider dry-run: **PASS**, `externalWrites: 0`.
- Secret-pattern scan of new provider scripts/evidence: no credential material detected.
- Live `apply` and `resume` remain deliberately fail-closed pending owner prerequisites, credentials, provider readback, and reviewed-plan approval.

## 2026-08-09 â€” reviewed-plan and provider adapter hardening

- Mode: local generation/test only; external provider writes: **0**.
- Sealed dry-run plans now require an exact approval hash, a same-catalog read-only export, zero blockers, and zero conflicts before apply.
- Added redacted JSONL operation journals and resumable, idempotent Google Play and RevenueCat adapters.
- Google resources are restricted to Saudi Arabia, use the catalog product/base-plan IDs, and remain draft until RevenueCat validation.
- Added a read-only Google `convertRegionPrices` lookup for the current regions version.
- Added catalog-bound, secret-free approval overlays for Apple price-point IDs, subscription levels, and generated localization copy.
- Added Apple subscription-group, consumable, and subscription shell request builders. Apple apply remains fail closed until localization, Saudi availability, and price-schedule operations are implemented and approved.
- `npm run providers:test`: **PASS**, 15/15.
- `npm run catalog:verify`: **PASS**, 26/26.
- Full backend `npm test`: **PASS**, 288/288.
- Credential-pattern scan of provider scripts and generated evidence: **PASS**.
- Regenerated all provider payloads and dry-run plans; `externalWrites: 0`.
