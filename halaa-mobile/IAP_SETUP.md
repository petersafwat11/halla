# In-App Purchases (RevenueCat) — setup & wiring

For the Saudi storefront, Apple and Google require **native in-app billing**
for digital plans/add-ons (the in-app Moyasar card flow is **web-only**). This
repo ships the full RevenueCat integration **plumbing**; the steps below are the
external configuration + final UI wiring that can only be done with the store
accounts and a device/sandbox.

## What's already implemented

**Client**
- `services/purchases.js` — RevenueCat wrapper (init, offerings, purchase,
  restore, customer info). Web-guarded import; no-ops without keys.
- `hooks/purchases/index.js` — `useOffering`, `usePurchasePackage`,
  `useRestorePurchases`.
- `App.js` — `initPurchases(userId)` is called on authentication (so purchases
  attach to the account; RevenueCat `app_user_id` = our user `_id`).
- Keys read from `app.config.js` → `extra.revenueCat` (env
  `REVENUECAT_IOS_KEY` / `REVENUECAT_ANDROID_KEY`).

**Backend**
- `POST /api/v2/payments/revenuecat/webhook` — authenticated via
  `REVENUECAT_WEBHOOK_AUTH`; maps the purchased product → plan code
  (`REVENUECAT_PRODUCT_PLAN_MAP`) and grants the subscription through the same
  `subscriptionLifecycle.changePlan` path used by admin assignment.

## Remaining steps (external — needs store accounts + a device)

1. **RevenueCat dashboard:** create a project; add the iOS + Android apps; get
   the public SDK keys → set EAS env `REVENUECAT_IOS_KEY` / `REVENUECAT_ANDROID_KEY`.
2. **Store products:** create the subscription/consumable products in **App
   Store Connect** and **Google Play Console** matching your plans/add-ons, then
   add them to a RevenueCat **Offering** with packages.
3. **Entitlements/mapping:** set the backend env `REVENUECAT_PRODUCT_PLAN_MAP`
   to `{"<rc_product_id>":"<plan_code>", ...}` and `REVENUECAT_WEBHOOK_AUTH` to a
   secret; configure the **RevenueCat → webhook** to
   `https://halaa.com.sa/api/v2/payments/revenuecat/webhook` with that same
   Authorization header.
4. **Purchase UI — ✅ wired** in `screens/host/PlansSummaryScreen.js`:
   - Web (`Platform.OS === "web"`) keeps the Moyasar card checkout unchanged.
   - Native (iOS/Android) hides the card/discount UI and the footer button runs
     the RevenueCat purchase (`usePurchasePackage`) for the plan's package, then
     navigates Home (the backend webhook grants the plan). A **Restore
     Purchases** button is included (required by App Store review).
   - **Package matching:** `findPackageForPlan` resolves the RC package by, in
     order, `plan.iapProductId` → `package.identifier === plan.code` →
     `product.identifier === plan.code`. So either **name each RevenueCat package
     with the plan code**, or have the backend include an `iapProductId` on the
     plan. Verify this matches your RC product setup.
   - **Limitation:** store IAPs are fixed SKUs, so **add-ons and discount codes
     are not bundled** in the native purchase (they remain web/Moyasar features).
     If add-ons must be sold on mobile, model them as their own IAP products and
     extend the purchase flow, or use App Store / Play **offer codes** for
     discounts. The backend webhook already maps any purchased product → plan.
5. **Build & test:** IAP needs a **native build** (not Expo Go) — `eas build`
   then test purchases in the App Store / Play **sandbox** before submitting.

## Notes
- Keep **Moyasar for web** — do not remove it; only the native store builds use IAP.
- Do **not** show a "pay on our website" link in the iOS app (KSA anti-steering).
- `react-native-purchases` autolinks via Expo prebuild — no config plugin needed.
