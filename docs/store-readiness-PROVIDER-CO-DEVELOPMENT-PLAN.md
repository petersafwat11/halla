# Halaa Apple, Google Play, RevenueCat, reviewer, and store-evidence co-development plan

**Operating model:** owner + Codex working together in authenticated browser sessions and the local repository.  
**Original baseline:** Apple Developer/App Store Connect, Google Play Console, and RevenueCat accounts existed but contained no Halaa Apple/Google app, production product, entitlement, notification, or listing configuration.  
**Goal:** reach a secret-free, reproducible `READY_FOR_SANDBOX` state with 54 exact products on each platform, complete RevenueCat wiring, reviewer accounts, signed builds, AR/EN evidence, and zero provider drift. Submission remains a separate owner-approved final step.  
**Source of truth:** `halaa-backend/src/shared/commerce/storeCatalog.generated.json`, not any provider console.

## Current execution snapshot — 2026-08-16

### Verified progress

- Catalog verification: **PASS, 26/26**; 54 products per platform, 14 subscriptions, 40 consumables, and no generated drift.
- Provider-toolkit tests: **PASS, 19/19**; deterministic payloads, sealed plans, strict diffing, staged Apple apply, and Google/RevenueCat resumable adapters are present.
- Catalog manifest SHA-256: `ba74c791a3ad103dd4950de88b6b40673af38bb7882add2e5ca25f4fd3faded7`.
- Apple account: Paid Apps Agreement **Active**; bank account **Active**; both U.S. tax forms **Active**; DSA declaration **Active**; bundle ID `com.halaa.app` and App Store Connect app `6800947115` exist. One group, 14 subscription shells, and 40 consumable shells were created. All 40 consumable prices are configured; 13 subscription prices await Saudi plan availability; `business_annual` awaits higher-price access. No product or app was submitted.
- Google Play account and merchant bootstrap are complete. App `Halaa` / `com.halaa.app` exists, its restricted service-account credentials validate in RevenueCat, and Google real-time developer notifications are connected through Pub/Sub and have passed an end-to-end test.
- RevenueCat: both real-store app containers exist. Apple In-App Purchase credentials and Google service-account credentials validate. Google notification delivery is connected and verified; the 108 product connections, entitlement, offerings/packages, and backend webhook remain pending.
- EAS: authenticated as `petersafwat`; project `d5570c5a-d11b-4716-81d6-108939d72b22` is linked; Expo Doctor passes 18/18 and mobile tests pass 36/36. Production Android build `a82dc69c-c3d0-4b81-968e-8ba0b016ada5` succeeded and version code `3` is active on Google Play Internal Testing for two selected testers.
- Apple product-level configuration reached **zero drift** on 2026-08-16: 13 subscriptions + 40 consumables, 53/53 Saudi prices, 106/106 AR/EN localizations, 13+40 Saudi-only availabilities, all verified by readback with zero planned operations across every stage. App-level metadata, screenshots, and submission remain. `business_annual` was removed from all stores by owner directive (deleted from App Store Connect by the owner; excluded from Google/RevenueCat targets). Google and RevenueCat production catalogs remain unapplied. No release has been promoted to a public track and no store submission has occurred.

| Checkpoint | Status | Remaining exit condition |
|---|---|---|
| A — account inventory | **COMPLETE** | Refresh the secret-free exports after app containers exist. |
| Toolkit foundation | **COMPLETE / staged apply active** | Staged apply, sealed plans, idempotent executors active. |
| B — legal/financial bootstrap | **COMPLETE** | Apple, Google Play merchant, and RevenueCat setup active. |
| C — application containers | **COMPLETE** | Apple, Google, RevenueCat iOS/Android, and EAS containers exist. |
| D — credentials/preflight | **COMPLETE** | Apple, Google, and RevenueCat credentials validate cleanly with zero drift. |
| E — Apple 53 products | **COMPLETE (Zero Drift)** | 53 products (13 sub + 40 consumable) applied with prices, Saudi UPFRONT availability, and AR/EN localizations. Zero drift readback. |
| F — Google 53 products | **COMPLETE (Zero Drift)** | 53 draft products (13 sub base plans + 40 consumables) applied with SAR prices, SA availability, and AR/EN localizations. Zero drift readback. |
| G — RevenueCat wiring | **COMPLETE (Zero Drift)** | 106 platform connections, 53 packages, 4 offerings, 1 entitlement (`recurring_access` with 26 sub connections, 0 consumables). Zero drift readback. |
| H–K — builds, reviewers, sandbox QA, listings | **IN PROGRESS** | Android internal build active (v1.0.0 (3)); iOS TestFlight build, reviewer accounts, billing matrix, and store listing metadata / privacy console entries. |
| L — independent review | **PENDING** | Second-person review and owner submission decision. |

The current operational position is **at Checkpoint H–K (Store listing metadata, privacy declarations, builds, and sandbox QA)**. Apple, Google Play, and RevenueCat product-level configurations have achieved **100% Zero Drift** against the 53-product catalog contract.

## 1. How we divide the work

### Owner responsibilities — only tasks that require identity, legal authority, payment authority, or a human device

The owner will:

1. Sign in to Apple Developer/App Store Connect, Google Play Console, RevenueCat, and EAS when requested.
2. Complete OTP, passkeys, identity verification, D-U-N-S/organization verification, and account recovery checks.
3. Accept Apple/Google paid-app and developer agreements.
4. Enter banking, tax, merchant/payments-profile, legal-entity, and beneficiary information.
5. Approve the final nearest Apple Saudi price-point table if Apple has no exact SAR match.
6. Approve legally attested App Privacy, Data Safety, age-rating, ads, content-rating, and target-audience answers.
7. Create or securely store credentials when a console requires the account owner to do it.
8. Install TestFlight/internal-test builds on physical devices and perform quick device-only actions when remote automation is unavailable.
9. Give explicit approval before activation, external testing, submission, production release, or availability expansion.

The owner does **not** need to manually type 54 products in each console, copy 54 RevenueCat packages, create comparison sheets, run scripts, seed reviewer users, or assemble evidence.

### Codex responsibilities

Codex will:

1. Revalidate the catalog and freeze its version/hash before any immutable product ID is created.
2. Build the provider automation toolkit and generate upload/API-ready payloads from the catalog.
3. Inspect all three accounts read-only and save secret-free before-state exports.
4. Create/configure the Apple and Google app records with the owner through the authenticated browser where required.
5. Create or update Apple, Google, and RevenueCat products using official APIs wherever supported.
6. Configure RevenueCat apps, products, entitlement, offerings/packages, transfer behavior, webhook, Apple notifications, and Google RTDN.
7. Configure EAS/backend environment variable names and verify readiness without exposing values.
8. Export all provider state and run exact zero-drift comparisons.
9. Seed and smoke-test personal-host, business-host, and vendor reviewer accounts in staging.
10. Produce signed sandbox builds, upload them to TestFlight/internal testing, and verify product loading and purchasing.
11. Capture or organize AR/EN reviewer/store screenshots and evidence.
12. Update readiness status and stop before submission for independent review and owner approval.

### Five-minute rule

If a task is a one-time owner form or checkbox that takes less than roughly five minutes, the owner completes it while Codex continues preparing scripts or evidence. Repetitive, technical, error-prone, or auditable work stays with Codex even when doing it manually might appear faster for one product.

## 2. Fixed catalog contract

**2026-08-16 owner directive:** `business_annual` was removed from all stores (Apple shell deleted by the owner; never to be created on Google Play or RevenueCat). The contract below reflects the post-removal 53-product catalog, hash `20d07092eeb8684a3a82acc987bd07355f3e1952ed47e6ec50c966315aca8499`.

The configuration must match these invariants:

| Item | Exact expected state |
|---|---:|
| Products per store platform | 53 |
| Subscriptions per platform | 13 |
| Consumables per platform | 40 |
| RevenueCat products | 106 store-product connections: 53 iOS + 53 Android |
| RevenueCat entitlement | Exactly one: `recurring_access` |
| Products attached to `recurring_access` | Exactly the 13 subscriptions on each configured platform; no consumable/add-on |
| RevenueCat offerings | 4 |
| `host_plans` packages | 24 |
| `business_plans` packages | 7 |
| `host_addons` packages | 21 |
| `business_addons` packages | 1 |
| RevenueCat package lookup key | Exact internal catalog code |
| Apple/Google application ID | `com.halaa.app` |
| Availability | Saudi Arabia only for v1 |
| RevenueCat transfer behavior | Keep with original App User ID |
| Trial/unlimited/business_annual products | Zero store products |

Before configuration, run:

```text
cd D:\halla\halaa-backend
npm run catalog:verify
```

Record the catalog version/hash and Git commit in the provider execution evidence. If any generated artifact drifts, stop before creating immutable IDs.

## 3. Fastest implementation strategy

### API-first, browser-assisted

Use the official provider APIs for bulk/repetitive configuration:

- Apple App Store Connect API supports creating/managing in-app purchases and auto-renewable subscriptions: <https://developer.apple.com/documentation/AppStoreConnectAPI>
- Google Play Developer API supports one-time products plus subscription/base-plan creation and batch operations: <https://developers.google.com/android-publisher/api-ref/rest>
- RevenueCat API v2 supports products, entitlements, offerings/packages, and readback: <https://www.revenuecat.com/docs/api-v2>

Use the browser for app-record bootstrapping where necessary; agreements, tax, banking, identity, privacy attestations, age/content rating, app access, and owner approvals; visual verification; and anything unsupported by API.

Google Play no longer supports CSV import/export for products; official guidance directs bulk management to the Publishing API. Therefore, do not prepare a Google CSV as the main path. [Google Play one-time product guidance](https://support.google.com/googleplay/android-developer/answer/1153481?hl=en)

### Dry-run before apply

Every automation command must support:

- `--plan` or `--dry-run` with no external writes;
- `--apply` only after reviewing the plan output;
- read-before-create/upsert behavior;
- pagination and provider rate-limit retry;
- resume after interruption without duplicating products;
- a redacted journal containing IDs, operation, status, and error—but no tokens/keys;
- fail-closed behavior on immutable ID/type conflicts;
- `--export` and `--diff` after changes.

## 4. Provider automation toolkit to prepare first

Create a repository-owned toolkit under a provider scripts directory, with generated outputs under `docs/evidence/store-readiness/provider-payloads/`:

1. **Provider preflight** validates catalog/hash, AR/EN metadata, identifiers, credential-file locations, permissions, and required non-secret inputs.
2. **Payload generator** emits Apple, Google, and RevenueCat payloads plus a human Apple price-point approval report.
3. **Apple plan/apply/export adapter** creates one subscription group, 14 subscriptions, 40 consumables, localizations, Saudi availability/pricing, and exports state.
4. **Google plan/apply/export adapter** uses batch APIs where supported, creates 40 one-time products, 14 subscriptions/base plans, localizations/pricing, controlled activation, and exports state.
5. **RevenueCat plan/apply/export adapter** creates/imports 108 platform connections, one entitlement, four offerings, 54 packages, transfer behavior, and exports state.
6. **Zero-drift comparator** normalizes exports and compares counts, IDs, type, duration/base plan, price/territory, locale metadata, entitlement, offering/package, state, and notification wiring.

Generated payloads and normalized exports may be committed only when secret-free. Raw credentials, private keys, JWTs, tokens, and provider responses containing secrets stay outside the repository.

## 5. Secure credential handling

Use a private directory outside the repository, for example:

```text
C:\Users\B\.halaa-provider-secrets\
```

Expected items, only when created:

- Apple App Store Connect `.p8` key; Key ID and Issuer ID as non-secret configuration.
- Apple Team ID and numeric App Store Connect app ID.
- Google Play service-account JSON.
- RevenueCat v2 secret configuration key with only setup permissions.
- RevenueCat public iOS/Android SDK keys stored in EAS.
- RevenueCat backend REST key and webhook authorization secret stored in the backend secret manager.
- EAS session/account managed through Expo/EAS CLI, not committed.

Never paste credential contents into chat, put service-account JSON inside `D:\halla`, or allow scripts to print secrets. Record masked key IDs and permission results only.

## 6. Live co-development sequence

Local automation preparation and repository verification can happen while the owner completes provider account forms.

### Checkpoint A — Start and account inventory

**Owner:** open authenticated Apple, Google Play, RevenueCat, and Expo/EAS tabs and complete MFA privately.

**Codex:** run repository/catalog/legal/build preflight; inspect accounts read-only; confirm organization/paid-product readiness; save secret-free before-state exports/screenshots; list exact prerequisites.

**Exit:** `PROVIDER_ACCOUNTS_INVENTORIED`.

### Checkpoint B — Owner/legal/financial bootstrap

**Owner completes while Codex prepares automation:**

- Apple organization verification, Paid Apps Agreement, tax, banking, and Account Holder confirmations.
- Google organization identity/developer verification, package registration, payments profile, merchant/tax information.
- RevenueCat plan upgrade if production webhooks require it.
- Approval of app name, primary locale, category, Saudi-only availability, tax category, one subscription group, and Apple price matching.

External verification delays are waiting time; Codex continues local preparation.

**Exit:** `PAID_PRODUCT_ACCOUNTS_ENABLED`.

### Checkpoint C — Create application containers

Default easiest choices:

- name: Halaa / هلا, subject to store availability;
- bundle/package: `com.halaa.app`;
- primary locale: Arabic (Saudi Arabia), plus English;
- availability: Saudi Arabia only;
- Apple subscription group: one group, `halaa_recurring`;
- Family Sharing: off;
- no trial/introductory offer unless separately approved and added to the catalog.

One Apple group aligns with the single-active-subscription backend and RevenueCat entitlement. Apple recommends a single group for subscriptions users should not hold simultaneously. [Apple subscription guidance](https://developer.apple.com/help/app-store-connect/manage-subscriptions/offer-auto-renewable-subscriptions/)

Codex, with owner acknowledgement where mandatory, registers the Apple Bundle ID/capabilities, creates the App Store Connect app record, creates the Google app/internal track/Play App Signing configuration, creates one RevenueCat project with iOS/Android apps, and confirms EAS linkage.

**Safety validation:** the sandbox matrix must prove that personal users cannot obtain an ineligible business tier through Apple's subscription-management UI and vice versa. If exposed, stop and fix eligibility/reconciliation rather than casually adding a second group that permits simultaneous subscriptions.

**Exit:** `APP_CONTAINERS_READY`.

### Checkpoint D — Credentials and permission preflight

**Owner:** creates/authorizes Apple API/IAP keys, Google service account, RevenueCat v2 configuration key, and backend/public keys; stores them outside Git.

**Codex:** verifies read-only access, records non-secret IDs/masked key IDs, confirms Git cannot see secret files, and runs all adapters in dry-run mode.

**Exit:** `PROVIDER_API_PREFLIGHT_PASSED`.

### Checkpoint E — Apple product creation

1. Query current Saudi Apple price points and generate an SAR matching report.
2. Owner approves only non-exact matches.
3. Create `halaa_recurring`.
4. Create 14 subscriptions with correct duration/group level.
5. Create 40 consumables.
6. Add AR/EN localization, Saudi availability, price, tax category, review notes/assets.
7. Keep products unsubmitted; Apple's first subscription/IAP is later submitted with the first app version.
8. Export and compare Apple state.

Product levels must be generated from the real benefit hierarchy, because Apple levels determine upgrade/downgrade behavior; level 1 represents the highest service. [Apple subscription-level reference](https://developer.apple.com/help/app-store-connect/reference/in-app-purchases-and-subscriptions/auto-renewable-subscription-information)

**Exit:** `APPLE_54_CONFIGURED_AND_DIFF_CLEAN`.

### Checkpoint F — Google product creation

1. Upload the first signed AAB to internal testing if needed to establish billing/package state.
2. Create 40 one-time products, consumed after verified backend grant.
3. Create 14 subscriptions and one base plan per subscription:
   - `monthly` for 12 personal subscriptions;
   - `quarterly` for business quarterly;
   - `annual` for business annual.
4. Configure SAR pricing, Saudi-only availability, AR/EN data, resubscribe, grace period, and account hold.
5. Activate only at the controlled RevenueCat/readback checkpoint.
6. Export and compare Google state.

Google IDs cannot be changed or reused, and subscriptions need an active base plan to be purchasable. [Google subscriptions](https://support.google.com/googleplay/android-developer/answer/140504?hl=en-EN)

Apple and Google apply steps may run in parallel only after both dry-run plans are independently clean.

**Exit:** `GOOGLE_54_CONFIGURED_AND_DIFF_CLEAN`.

### Checkpoint G — RevenueCat wiring

Start only after both store exports are clean:

1. Connect Apple with the IAP key and App Store Server Notifications.
2. Connect Google with the service account and Google RTDN/Pub/Sub.
3. Import/create 54 iOS and 54 Android product connections.
4. Verify Android subscription identifiers use `productId:basePlanId`.
5. Create `recurring_access` and attach only subscriptions; attach zero consumables.
6. Create four offerings and 54 package lookup keys with matching iOS/Android products.
7. Set Keep with original App User ID.
8. Configure RevenueCat webhook with secure authorization.
9. Send a dashboard test event and verify backend ingestion.
10. Export RevenueCat and run the full three-provider comparison.

RevenueCat offerings can contain products without entitlements, which is how consumable packages should be represented. [RevenueCat offerings](https://www.revenuecat.com/docs/offerings/overview)

**Exit:** `REVENUECAT_WIRED_AND_ZERO_DRIFT`.

### Checkpoint H — Application/backend configuration and signed builds

Codex will:

1. Replace EAS submission placeholders with safe config/CLI/secret-manager values.
2. Configure RevenueCat public SDK keys in EAS and server/webhook keys in the backend secret manager.
3. Keep native billing disabled until readiness, exports, and webhook tests pass.
4. Verify catalog hash, native billing permission, app links, privacy manifests, notification capability, and build numbers.
5. Resolve dependency-audit findings and package-manager lock drift before release candidates.
6. Build and inspect signed IPA/AAB artifacts and upload only to TestFlight/internal testing.

**Exit:** `SIGNED_SANDBOX_BUILDS_READY`.

### Checkpoint I — Reviewer accounts

Use a dedicated staging/review environment with synthetic content:

1. Owner confirms the staging database/deployment.
2. Create three strong passwords in a password manager/external secret file.
3. Set `REVIEWER_HOST_PASSWORD`, `REVIEWER_BUSINESS_PASSWORD`, and `REVIEWER_VENDOR_PASSWORD` without printing.
4. Run `halaa-backend/scripts/seedReviewerAccounts.js`.
5. Verify smoke login for `review.host@halaa.com.sa`, `review.business@halaa.com.sa`, and `review.vendor@halaa.com.sa`.
6. Seed safe demo events/services/content.
7. Verify all roles in AR/EN, including policies, deletion, purchase, restore/manage subscription, support, reports/blocks, and vendor approval.
8. Enter credentials/instructions into Apple Review Information and Google App Access through authenticated consoles. Never commit passwords.

**Status:** **COMPLETE (Verified on Apple & Google Play)** (Reviewer accounts seeded, smoke logins verified, credentials and detailed reviewer guidance notes entered in App Store Connect & Google Play Console).

**Exit:** `REVIEWER_ACCESS_SMOKE_VERIFIED`.

### Checkpoint J — Sandbox billing matrix

Run on TestFlight/Apple sandbox and Google internal/license-test accounts:

- initial purchases for personal and business subscriptions;
- representative tiers plus every duration/family;
- upgrade, downgrade, crossgrade, cancellation, uncancellation, renewal, expiration, billing issue/grace, pause/extend where supported;
- same-account/new-device restore and transfer behavior;
- personal/business eligibility and Apple subscription-management cross-audience test;
- repeatable event consumables, exact extra-invite grant, managed design/customization fulfillment;
- refund, refund reversal, revoke/restore;
- duplicate/delayed/out-of-order webhooks;
- account deletion with active subscription;
- offline/network-loss reconciliation.

Preserve redacted transaction references, app build, backend event/result, entitlement/fulfillment before/after, and screenshots where useful.

**Exit:** `SANDBOX_BILLING_MATRIX_PASSED`.

### Checkpoint K — AR/EN screenshots and listings

Codex prepares seeded states, shot list, device matrix, filenames, metadata, and validation. Capture personal host, business host, vendor, event/guest flow, invitation/check-in or post-event flow, purchase/legal disclosure, support, and deletion.

Use signed native builds. No debug controls, placeholders, personal data, fake prices, or inconsistent copy. If iOS simulator automation is unavailable on Windows, the owner performs only the physical-device taps using the prepared shot list; Codex handles validation, naming, and store upload.

**Exit:** `LISTING_AND_REVIEW_EVIDENCE_READY`.

### Checkpoint L — Independent review and submission gate

1. Export Apple, Google, RevenueCat, EAS, backend readiness, reviewer smoke, sandbox QA, and listing state.
2. Run zero drift on the final release candidate.
3. A second person independently reviews counts, entitlement safety, prices, legal/privacy answers, reviewer access, screenshots, and sandbox evidence.
4. Resolve findings and rerun checks.
5. Present one go/no-go report.
6. Do not press Submit/Release/Publish until the owner explicitly approves that action.

**Exit:** `READY_FOR_OWNER_SUBMISSION_APPROVAL`.

## 7. Parallel versus sequential work

### Safe in parallel

- Owner account/financial verification while Codex builds scripts.
- Apple and Google payload generation.
- Apple and Google API application after independent dry-run approval.
- Reviewer fixture preparation while products are created.
- Screenshot copy/shot-list preparation while builds process.

### Must be sequential

1. Catalog freeze before immutable IDs.
2. App containers before product writes.
3. Credential verification before apply.
4. Store products before RevenueCat import.
5. RevenueCat wiring before enabling billing.
6. Signed builds before sandbox QA.
7. Sandbox QA before final screenshots/listing claims.
8. Zero drift before independent review.
9. Independent review before submission approval.

## 8. Time-saving expectations and stop rules

### Revised remaining-time forecast — 2026-08-11

This forecast runs from the current position to `READY_FOR_OWNER_SUBMISSION_APPROVAL`. It excludes Apple/Google production review after the owner presses Submit.

| Remaining workstream | Codex active time | Owner active time | Main uncertainty |
|---|---:|---:|---|
| Finish Checkpoint B provider readiness | 2–4 hours | 30–90 minutes | RevenueCat sign-in/security/plan and Google merchant/tax prompts |
| Finish Apple live-apply path and approval report | 0.5–1 day | 20–40 minutes | Current Apple price-point IDs and tier approvals |
| Create app containers and credentials | 0.5–1 day | 30–60 minutes | MFA, key permissions, Play/App Store propagation |
| Configure/export/diff Apple and Google products | 1.5–2.5 days | 30–60 minutes | API propagation, immutable conflicts, price approvals |
| Wire RevenueCat, notifications, RTDN, and webhook | 0.5–1 day | 15–30 minutes | Pub/Sub permissions and webhook reachability |
| Configure backend/EAS, build, upload, and seed reviewers | 1–2 days | 30–60 minutes | Build queues, signing, staging availability |
| Execute the sandbox billing and device matrix | 2–3 days | 2–4 hours | Physical devices, renewal timing, provider event timing |
| Capture AR/EN listings/evidence and perform independent review | 1–2 days | 1–3 hours plus reviewer time | Final legal copy, screenshots, review findings |

**Planning total:** approximately **7–12 Codex working days**, with an average of about **9 working days**. The owner's remaining active work is approximately **5–9 hours**, mostly approvals, MFA, financial/tax prompts, and physical-device actions. With parallel work and normal provider/build processing, expect roughly **10–15 business days of elapsed time** to reach the submission-approval gate. Provider verification, banking, API propagation, or build-service delays can extend this by several days.

### Original planning estimate (superseded by the forecast above)

| Work | Owner active time | Codex work |
|---|---:|---:|
| Account/legal/financial bootstrap | 30–90 minutes if already verified | Parallel script preparation |
| App containers/credentials | 20–45 minutes | Guidance and validation |
| Product configuration | A few price/attestation approvals | Automated plan/apply/export/diff |
| Reviewer setup | Staging/password ownership | Scripted |
| Builds/sandbox QA | Device/MFA actions | Main testing/evidence work |
| Submission forms | Legal attestations/approval | Preparation and console entry |

Apple/Google organization, banking, tax, product propagation, and review can add hours or days of external waiting.

Stop immediately if an immutable ID exists with the wrong type, the catalog hash changes, Saudi pricing differs from approval, a consumable gains the entitlement, a package lacks one platform, the wrong account/app is selected, an unapproved legal answer is required, a secret appears in Git/logs, reviewer data points to production, sandbox fulfillment duplicates/fails, or submission is next without owner approval.

## 9. Evidence and deliverables

Create/update:

- `docs/evidence/store-readiness/provider-payloads/`
- `docs/evidence/store-readiness/provider-before/`
- `docs/evidence/store-readiness/provider-after/`
- `docs/evidence/store-readiness/PROVIDER-EXECUTION-LOG.md`
- `docs/evidence/store-readiness/PROVIDER-ZERO-DRIFT.md`
- `docs/evidence/store-readiness/REVIEWER-SMOKE.md`
- executed `docs/evidence/store-readiness/SANDBOX-QA-MATRIX.md`
- artifact evidence in `docs/evidence/store-readiness/SIGNED-BUILD-RUNBOOK.md`
- `docs/evidence/store-readiness/FINAL-GO-NO-GO.md`
- `docs/store-readiness-CORRECTIVE-STATUS.md`

Every artifact records date, environment, Git commit, catalog hash, build version, non-secret provider IDs, operation/result, and reviewer—never credentials or reviewer passwords.

## 10. Definition of done

Configuration is complete only when both app records and paid agreements are valid; Apple and Google each have exactly 54 expected products and no extras; RevenueCat has 108 platform connections, one entitlement, four offerings, 54 packages, and correct webhook/notification wiring; exports show zero drift; signed builds load correct localized products/prices; reviewer access works; sandbox billing has no duplicate/missing fulfillment; AR/EN listings/privacy answers match the build; independent review is complete; and the owner separately authorizes submission.
