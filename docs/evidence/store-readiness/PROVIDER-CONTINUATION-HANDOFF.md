# Halaa provider continuation handoff

**As of:** 2026-08-16 (updated after the business_annual store removal)  
**Audience:** replacement coding agent (Codex, Gemini, GLM, or human engineer)  
**Source of truth:** `halaa-backend/src/shared/commerce/storeCatalog.generated.json`  
**Catalog hash:** `20d07092eeb8684a3a82acc987bd07355f3e1952ed47e6ec50c966315aca8499`  
**Submission authority:** not granted. Do not submit, publish, promote, or expand beyond Saudi Arabia.

## 0. CRITICAL CHANGE — business_annual removed from all stores (2026-08-16)

Owner directive: `business_annual` creates **zero store products everywhere**. The owner deleted its Apple subscription shell in App Store Connect (verified absent by readback). It must NOT be created on Google Play or RevenueCat. The plan still exists in the backend as internal/admin-only (managed/negotiated acquisition path, like `trial`/`unlimited`). All counts below are the post-removal 53-product contract: **53 per platform = 13 subscriptions + 40 consumables; RevenueCat 106 connections / 53 packages / 26 entitlement connections; `business_plans` 7 packages.** Approval overlay for the new hash: `provider-payloads/provider-approvals.catalog-53.json` (53 price points + 13 levels carried forward from the original approval).

## 1. Current outcome

### Apple — PRODUCT-LEVEL ZERO DRIFT (2026-08-16)

- App Store Connect app ID: `6800947115`; bundle ID: `com.halaa.app`.
- Paid Apps Agreement, bank, U.S. tax, and DSA were completed earlier.
- API access works with the App Manager team key stored outside the repository.
- Live state (readback-verified against catalog `20d07092…`):
  - one subscription group `halaa_recurring`, **13** auto-renewable subscription shells (`business_annual` deleted by owner), **40** consumable shells;
  - **53/53 prices** applied (40 consumable + 13 subscription), each matching the approved price-point IDs, territory `SAU`;
  - **13/13** Saudi-only `UPFRONT` subscription-plan availabilities (`availableInNewTerritories=false`, territories exactly `SAU`);
  - **106/106** product localizations applied and content-verified (ar-SA + en-US on all 53 products);
  - **40/40** consumable Saudi-only availabilities.
- All five sealed stage plans (`shells`, `prices`, `availability`, `localization`, `iap_availability`) report **0 operations, 0 blockers, 0 conflicts** against the live export. Do not re-run apply stages; they are idempotent no-ops now.
- App-level metadata, app territory availability, review screenshots, review submission, and publication have not been applied.

### Google Play — 53 PRODUCTS APPLIED & READBACK-VERIFIED (2026-08-16)

- App `Halaa`, package `com.halaa.app`, exists.
- Signed Android AAB version code 3 is active only on Internal Testing for two testers.
- Opt-in URL: <https://play.google.com/apps/internaltest/4701372785579698840>.
- RevenueCat service-account catalog/subscription validation works.
- Google RTDN → Pub/Sub → RevenueCat test succeeded; last recorded receipt was `2026-08-15 14:47 UTC`.
- Service account permissions resolved (Account + App level "Edit and delete draft apps", "Manage orders and subscriptions", "Manage store presence", "View financial data").
- `regions-version` returned `2025/03`.
- Applied sealed 53-product plan `e0c33e7cd130ff5053e6949f504537305db22d8e38271bf8148f44be0edd9cb2`: **53/53 products created** (13 subscriptions with base plans `monthly`/`quarterly` + 40 one-time consumables), Saudi-only (`SA`), localized in `ar` and `en-US`.
- Live readback export confirmed **13 subscriptions** and **40 one-time products** present as drafts. Journal: `provider-after/google-apply-journal.jsonl` (53 completed, 0 failed). `business_annual` excluded per owner directive.

### RevenueCat — ZERO DRIFT (2026-08-17)

- Project: `projc49d20a4`.
- iOS app: `app63720480d5`; Android app: `appc8bcc56e96`.
- Apple IAP and Google service-account credentials validate.
- Google developer notifications are connected.
- Test Store sample conflicts cleaned with owner approval.
- Applied sealed plan `2f61891d8375346333e7d7db1ef2e43f95ecc72c23c34fc6e10193f580f89e6e`: **106 platform connections (53 iOS + 53 Android), 53 packages, 4 offerings (`host_plans`, `business_plans`, `host_addons`, `business_addons`), and 1 entitlement `recurring_access` (attaching exactly the 26 subscription connections and 0 consumables)**.
- Live readback export confirmed exact counts. Fresh dry-run plan against live export reports **0 operations, 0 blockers, 0 conflicts**. **Zero drift achieved**. Journal: `provider-after/revenueCat-apply-journal.jsonl` (217 completed, 0 failed).

### EAS/build

- Expo project: `d5570c5a-d11b-4716-81d6-108939d72b22`, account `petersafwat`.
- Successful Android production build: `a82dc69c-c3d0-4b81-968e-8ba0b016ada5`.
- iOS signed/TestFlight build and full sandbox billing matrix remain pending.

## 2. Immediate Apple continuation

### Completed on 2026-08-16 (do not repeat)

- Owner approved and the agent applied Saudi-only `UPFRONT` availability for the 13 price-approved subscriptions (sealed plan hash `5774a1ae715e89363895630875d432a99039a1629274dcc9a6797a41c4bd51ad`; journal `provider-after/apple-availability-apply-journal.jsonl`).
- The sealed prices plan `c00108a7c266f273b5e45b61546e14c37954e487f850c79d2abc1c385d89bcd1` was resumed on the same journal and is now **53/53 complete**. Do not re-run it, do not start a new price journal for it, and do not recreate the availability records — the availability stage is idempotent and will simply report zero operations.
- Owner approved and the agent applied **108/108** product localizations (plan `e7dd20af3eff07f24f39a5f13bae966f1658252499836540dadb7c712dae4749`; journal `provider-after/apple-localization-apply-journal.jsonl`) and **40/40** consumable Saudi-only availabilities (journal `provider-after/apple-iap-availability-apply-journal.jsonl`; final plan hash `375530cdaa0bb78e3f12d29cd87b3cbd4cfe8bc843dcb354eaeaa1fd704c600f` after a legitimate state-guard re-seal with an identical operation set). Both stages are idempotent and verified by readback; do not recreate these records.

### Current stop conditions

1. `business_annual` (target SAR 10,000): the Account Holder must request Apple's additional higher price points from App Store Connect. After access is granted, run a new `price-review` for that product, obtain a separate approval, generate a new sealed `prices`-stage plan, and apply it.
2. App-level metadata, app territory availability, review screenshots, and any submission-related configuration remain untouched and require their own review/approval. No Apple adapter stage exists for them yet.

### Toolkit notes for the completed stages

- `export --provider apple` reads subscription `planAvailabilities` (+ territories), subscription/IAP localizations, and IAP availabilities (+ territories).
- Localizations attach directly to products: `POST /v1/subscriptionLocalizations` (relationship `subscription`) and `POST /v1/inAppPurchaseLocalizations` (relationship `inAppPurchaseV2`). IAP availability: `POST /v1/inAppPurchaseAvailabilities` (relationships `inAppPurchase` + `availableTerritories`). The version-based localization model is legacy and unused.
- Stage planners fail closed on localization content mismatches, extra locales, unexpected plan types, and non-SAU territory drift; identical existing records are skipped.

### Remaining sequence
 
1. ~~Retry Google `regions-version` and apply 53 Google products.~~ **COMPLETE (53/53 applied and read back)**.
2. ~~Clean RevenueCat Test Store sample conflicts and wire RevenueCat catalog.~~ **COMPLETE (106 connections / 53 packages / 4 offerings / 1 entitlement / Zero Drift)**.
3. ~~Google Play Store Listing Metadata, Visual Assets, Contact Details, Data Safety API, and IARC Rating.~~ **COMPLETE (`Ready to send for review`)**.
4. ~~Apple App Store Connect "App Privacy", Age Rating (4+), and Pricing (Free / SAR).~~ **COMPLETE & PUBLISHED**.
5. ~~iOS TestFlight production build via EAS (`eas build --platform ios`).~~ **COMPLETE (Distribution Certificate, Provisioning Profile, APNs Key generated; Build active in EAS cloud)**.
6. Install TestFlight build on iOS device, upload live native iOS screenshots to App Store Connect version 1.0, and run the sandbox billing validation matrix. Do not submit for public release without approval.

Historical price plan (completed; do not re-run):

- plan hash: `c00108a7c266f273b5e45b61546e14c37954e487f850c79d2abc1c385d89bcd1`;
- operations: 53 total = 40 consumable + 13 subscription — **all 53 completed** (`business_annual` no longer exists as a store product);
- plan: `provider-payloads/apple-plan.generated.json` (historical, bound to the pre-removal catalog);
- journal: `provider-after/apple-price-apply-journal.jsonl` (53 unique completed; nine historical 409 failures are superseded).

## 3. Credential locations — paths only

Never print, paste, commit, or move these contents into `D:\halla`.

| Provider | File |
|---|---|
| Apple App Store Connect team key | `C:\Users\B\.halaa-provider-secrets\AuthKey_2C4S378QS6.p8` |
| Apple In-App Purchase key | `C:\Users\B\.halaa-provider-secrets\SubscriptionKey_7L4F237P85.p8` |
| Google service-account JSON | `C:\Users\B\.halaa-provider-secrets\google-play-revenuecat-service-account.json` |
| RevenueCat API v2 restricted key | `C:\Users\B\.halaa-provider-secrets\revenuecat-api-v2-key.txt` |

The RevenueCat key starts with `sk_`; do not expose it. The Google JSON and all `.p8` contents are secrets.

## 4. Approval/evidence files

- Copy/price/level review: `provider-payloads/provider-approval-review.generated.md`.
- Initial approval overlay: `provider-payloads/provider-approvals.approved.json`.
- Apple price-point review: `provider-payloads/apple-price-point-review.generated.md` and `.json`.
- 53-price approval overlay (original, pre-removal hash): `provider-payloads/provider-approvals.apple-prices-approved.json`.
- **Current approval overlay (catalog `20d07092…`): `provider-payloads/provider-approvals.catalog-53.json`.**
- Sealed availability plan: `provider-payloads/apple-availability-plan.generated.json` (hash `5774a1ae…`).
- Sealed localization plan: `provider-payloads/apple-localization-plan.generated.json` (hash `e7dd20af…`).
- Sealed IAP-availability plan: `provider-payloads/apple-iap_availability-plan.generated.json` (final hash `375530cd…`).
- Pre/post shell exports: `provider-before/apple-pre-shell-export.json` and `provider-after/apple-post-shell-export.json`.
- Shell apply journal: `provider-after/apple-shell-apply-journal.jsonl`.
- Price apply journal: `provider-after/apple-price-apply-journal.jsonl`.
- Availability apply journal: `provider-after/apple-availability-apply-journal.jsonl`.
- Localization apply journal: `provider-after/apple-localization-apply-journal.jsonl`.
- IAP-availability apply journal: `provider-after/apple-iap-availability-apply-journal.jsonl`.
- Chronological audit: `PROVIDER-EXECUTION-LOG.md`.

## 5. Toolkit commands and validation

From `D:\halla\halaa-backend`:

```powershell
npm run providers:test
npm run providers:generate
npm run providers:preflight
```

Latest provider test result: **24/24 pass**.

`npm run catalog:verify` passes against the current catalog (workspace dependencies were restored on 2026-08-16; the earlier missing-`zod` issue is resolved). The full backend suite has pre-existing failures in this environment from the unbuilt `@halaa/shared` workspace package and DB-dependent integration tests — unrelated to store readiness; do not "fix" the catalog for them.

The worktree contains many pre-existing user changes and new files. Do not reset, clean, discard, or overwrite unrelated work.

## 6. Remaining high-level work

1. Retry Google regions-version after propagation; dry-run/apply/export **53** Google products.
2. Obtain explicit RevenueCat Test Store disposition; configure **106** connections, one entitlement (26 subscription connections), four offerings, **53** packages; preserve zero consumables on entitlements.
3. Configure backend webhook/public SDK environment values without exposing secrets.
4. Build/upload iOS sandbox build, run TestFlight/internal billing matrix, reviewer accounts, AR/EN screenshots, privacy/listing declarations, and zero drift.
5. Independent review, then ask for explicit submission approval. Never infer submission authority.

## 7. Non-negotiable catalog invariants

- 53 products per store: 13 subscriptions + 40 consumables.
- 106 RevenueCat platform connections: 53 iOS + 53 Android.
- Exactly 53 RevenueCat packages, each with matching iOS and Android products.
- Exactly one entitlement: `recurring_access`.
- Attach only 26 subscription connections to the entitlement; attach zero consumables.
- Four offerings: `host_plans`, `business_plans`, `host_addons`, `business_addons` (`business_plans` has 7 packages).
- Saudi Arabia only for v1.
- Trial, unlimited, and business_annual create zero store products.
- Stop before submission, public release, destructive RevenueCat cleanup, or availability expansion.

