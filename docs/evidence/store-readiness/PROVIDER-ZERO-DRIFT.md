# Provider zero-drift status

**State:** `ALL_PROVIDERS_PRODUCT_LEVEL_ZERO_DRIFT_ACHIEVED (Apple, Google Play, RevenueCat)`  
**Catalog version:** `1.0.0`  
**Catalog hash:** `20d07092eeb8684a3a82acc987bd07355f3e1952ed47e6ec50c966315aca8499` (post-`business_annual` removal: 53 products per store = 13 subscriptions + 40 consumables)

## 1. Apple — product-level zero drift & store readiness ACHIEVED (2026-08-16 / 2026-08-18)

Against the 53-product catalog (13 subscriptions + 40 consumables), sealed stage plans from the live read-only export report **0 operations, 0 blockers, 0 conflicts** for every stage:

- `shells`: exact 1 subscription group, 13 subscriptions, 40 consumables (`business_annual` deleted by owner; absent live).
- `prices`: 53/53 applied price records read back; each price-point ID matches the approved overlay exactly, territory `SAU`.
- `availability`: 13/13 subscription plan availabilities `UPFRONT`, `availableInNewTerritories=false`, territories exactly `SAU`.
- `localization`: 106/106 records (26 subscription + 80 consumable) content-verified against the approved AR/EN copy.
- `iap_availability`: 40/40 consumable availabilities Saudi-only, `availableInNewTerritories=false`.
- **App Privacy:** 15 data categories published on App Store Connect (0% tracking, App Functionality + Analytics, deletion/privacy URLs linked).
- **Age Rating:** Universal **4+** calculated and set.
- **Pricing & Availability:** Free (SAR 0.00) in Saudi Arabia.
- **Signing & Build:** Distribution Certificate, Provisioning Profile, and APNs Push Key created; EAS production iOS build initiated.

## 2. Google Play — product-level zero drift & store readiness ACHIEVED (2026-08-16 / 2026-08-17)

- `regions-version` resolved with active region version `2025/03` after enabling "Edit and delete draft apps", "Manage orders and subscriptions", and "Manage store presence".
- Applied sealed plan `e0c33e7cd130ff5053e6949f504537305db22d8e38271bf8148f44be0edd9cb2`: **53/53 products created** (13 subscriptions with base plans `monthly`/`quarterly` + 40 one-time consumables).
- Saudi Arabia only (`SA`), priced in SAR, localized in `ar` and `en-US`.
- Live readback export confirmed exact 13 subscriptions and 40 one-time products.
- Dry-run plan against fresh export reports **0 operations, 0 blockers, 0 conflicts**. **Zero drift achieved**.
- **Store Listing & Details:** Committed AR/EN titles (`هلا` / `Halaa`), short descriptions, full descriptions, contact info, and category `Events` via API (`Edit ID: 12034065165806943494`).
- **Store Visual Assets:** Uploaded 512x512 app icon, 1024x500 feature graphic, and 4 screenshots via API (`Edit ID: 02874674653027154223`).
- **Data Safety:** Full audited CSV declaration applied via API (`Status: 204 No Content`).
- **Content Rating:** Universal IARC **3+** rating certificate generated and active.
- **Status:** **`Ready to send for review`**.

## 3. RevenueCat — zero drift ACHIEVED (2026-08-17)

- Cleaned legacy Test Store sample conflicts (`default` offering, `Halaa Pro` entitlement, 3 test products).
- Applied sealed plan `2f61891d8375346333e7d7db1ef2e43f95ecc72c23c34fc6e10193f580f89e6e`:
  - **106 platform product connections** (53 iOS on `app63720480d5` + 53 Android on `appc8bcc56e96`);
  - **1 entitlement** `recurring_access` attaching exactly the 26 subscription connections (13 iOS + 13 Android) and 0 consumables;
  - **4 offerings**: `host_plans` (24 packages, marked current), `business_plans` (7 packages), `host_addons` (21 packages), `business_addons` (1 package);
  - **53 packages** attaching matching iOS and Android product pairs.
- Live readback export confirmed exact counts.
- Dry-run plan against fresh export reports **0 operations, 0 blockers, 0 conflicts**. **Zero drift achieved**.

## 4. Invariants & Scope Rules

- 53 products per store: 13 subscriptions + 40 consumables.
- 106 RevenueCat platform connections: 53 iOS + 53 Android.
- Exactly 53 RevenueCat packages, each with matching iOS and Android products.
- Exactly one entitlement: `recurring_access`.
- Attach only 26 subscription connections to the entitlement; attach zero consumables.
- Four offerings: `host_plans`, `business_plans`, `host_addons`, `business_addons` (`business_plans` has 7 packages).
- Saudi Arabia only for v1.
- Trial, unlimited, and business_annual create zero store products.
- App-level listing metadata, review screenshots, and submission remain separate owner-gated steps.
