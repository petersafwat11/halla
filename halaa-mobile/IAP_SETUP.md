# In-App Purchases (RevenueCat) — Setup & Architecture Guide

For the Saudi Arabia storefront (App Store and Google Play), digital subscriptions and add-ons are processed via **native in-app billing** (StoreKit / Google Play Billing through RevenueCat). Moyasar card checkout is strictly **web-only**.

---

## 1. Architectural Model & Guarantees

### A. Stable User Identity (`billingUserId`)
- RevenueCat uses the user's permanent `billingUserId` (never MongoDB `_id`, phone number, or email).
- Configured via `services/purchases.js` → `initPurchases(billingUserId)`.
- Prevents purchase collisions across logins and guarantees deterministic receipt ownership.

### B. Fail-Closed Pricing Policy
- The native UI **ONLY** displays localized price strings provided directly by the StoreKit / Google Play package (`package.product.priceString`).
- Native checkout **NEVER** substitutes backend SAR totals or mock amounts for missing store packages.
- If a package or price is missing from the store offering, the purchase surface enters a safe, localized `unavailable` state with disabled CTA.

### C. Discrete 10-State Readiness Engine (`purchaseReadiness.js`)
Purchase surfaces (`PlansSummaryScreen.js` and `AddonsPurchaseScreen.js`) evaluate:
1. `loading` — Queries in flight (shows native loading indicator, never premature unavailable)
2. `sdk_unconfigured` — SDK key absent in build profile
3. `user_unidentified` — User lacks valid `billingUserId`
4. `catalog_error` — Network failure from `/payments/revenuecat/catalog` (offers retry)
5. `offerings_error` — StoreKit/Play Store failure (offers retry)
6. `entry_missing` — Requested product code not in backend catalog
7. `not_store_eligible` — Trial or unlimited products (not store sellable)
8. `package_missing` — Store offering lacks matching package SKU
9. `price_missing` — Store package lacks localized price string
10. `ready` — All preconditions met; CTA active

### D. Standalone Add-on Fulfillment (`AddonsPurchaseScreen.js`)
- Store-eligible add-ons (extra invites, design templates, business customizations) are purchased on a dedicated add-on screen.
- Each add-on executes an explicit preflight (`/revenuecat/preflight/addon`) and exact transaction reconciliation (`/revenuecat/fulfillment`).
- Consumable add-ons are never presented as restorable durable subscriptions.

---

## 2. Store Configuration Checklist

1. **RevenueCat Dashboard:**
   - App bundle ID: `com.halaa.app`
   - Offerings: `host_plans`, `business_plans`, `host_addons`, `business_addons`
   - Set public SDK keys in EAS secrets / environment:
     - `REVENUECAT_IOS_KEY`
     - `REVENUECAT_ANDROID_KEY`

2. **App Store Connect & Google Play Console:**
   - Subscriptions: Single events, Lite, Pro, Elite (monthly / annual)
   - Consumables / Non-consumables: Extra invite pools, design templates, business customizations
   - Verify Saudi storefront pricing (SAR) and accepted agreements.

3. **Backend Webhook:**
   - Webhook URL: `https://halaa.com.sa/api/v2/payments/revenuecat/webhook`
   - Auth Header: Configured via `REVENUECAT_WEBHOOK_AUTH` secret.
   - Catalog: Served via `GET /api/v2/payments/revenuecat/catalog`.

---

## 3. Testing in Sandbox / Internal Track

1. Must be run on a signed native build (TestFlight or Google Play Internal Track) or development client with bundle ID `com.halaa.app` (not bare Expo Go).
2. Log in with an authenticated user who has `billingUserId`.
3. Verify store package prices resolve in Arabic and English.
4. Verify purchase completion, exact reconciliation modal, and subscription/add-on fulfillment.
