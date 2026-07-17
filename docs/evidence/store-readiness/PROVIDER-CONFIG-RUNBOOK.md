# Provider console-configuration runbook (Session 8 / MCP-02·03·04·05)

**Status:** `BLOCKED_NEEDS_OWNER` — this is the exact, ordered, **manifest-derived** set of console
actions to run once authenticated Apple / Google Play / RevenueCat / EAS access exists. **No console
write happened this session** (no provider MCP connected — see `MCP-CAPABILITY-REPORT.md`).
**Prepared:** 2026-07-02 · **Identifiers reconciled to `com.halaa.*` / `halaa-backend` / hash `7410b2c6…`:** 2026-07-11 · **Executor (later):** owner or a Claude session with authorized provider MCPs.

> **Source of product identifiers:** `halaa-backend/src/shared/commerce/storeCatalog.generated.json`
> (catalogVersion **1.0.0**, catalogHash **7410b2c6f950400ddfe62d0d2ba9e50caee361ca0594e5b6505b89e5050c0071**)
> and its human-readable renderings in `docs/evidence/store-readiness/generated/`
> (`apple-product-map`, `google-product-map`, `revenuecat-mapping`, `sku-matrix`, `expected-counts`).
> **Do NOT re-derive, rename, or re-price** any product — the manifest is FROZEN (CAT-01). This runbook
> tells you which manifest ids to create where; the id/price columns live in those generated tables.

> **NO secret values appear in this file.** All credentials/secrets are named only. This runbook
> **supplements**, and does not restate, the generic procedure in `store-readiness-EXTERNAL-MCP-RUNBOOK.md`
> (safety rules, official API boundaries, submission gates) and the build steps in
> `SIGNED-BUILD-RUNBOOK.md` (EAS build/submit, artifact inspection). Read both alongside this.

---

## 0. Non-negotiables (from the external runbook — do not violate)

1. **Start read-only.** Export current console state to `docs/evidence/store-readiness/before/` before any mutation (external runbook §4). No before-state exists yet — no console access this session.
2. **Never print/commit secrets.** Names, masked key IDs, and verification status only.
3. **Do not invent IDs, price-point numbers, or legal answers.** Missing account/team/tax/pricing → `BLOCKED_NEEDS_OWNER`.
4. **Idempotent writes.** Read by immutable product id before create; update managed fields only; never duplicate.
5. **Do not submit for review / publish / change availability / release** without explicit owner approval. Target = **`READY_FOR_SANDBOX`**, then owner go/no-go.
6. **Stop on drift.** If console state conflicts with the manifest, emit a diff (§8); do not guess which side wins.

---

## 1. Manual-prerequisite checklist (OWNER-ONLY — do not perform here)

These account/app/agreement/tax/banking/bootstrap steps **must exist before any product config**. They
are the union of external runbook §2 and `SIGNED-BUILD-RUNBOOK.md` §2 — see those for full detail; this
is the gating checklist. **No MCP/API can perform any of these** (Apple/Google create app records only in
the console; agreements/tax/banking are legal attestations).

### Apple (owner)
- [ ] Active **organization** Apple Developer Program membership (D-U-N-S, Account Holder identity).
- [ ] **Agreements, Tax, and Banking** — **Paid Apps agreement ACTIVE** (mandatory for IAP; products can't sell without it).
- [ ] Bundle ID **`com.halaa.app`** registered with the **In-App Purchase** capability (and Associated Domains, driven by `associatedDomains`).
- [ ] **iOS app record** created manually in App Store Connect (name "Halaa", SKU, primary locale `ar-SA`, bundle id `com.halaa.app`).
- [ ] **App Store Connect API key** (`.p8`, App Manager least privilege) — record **Key ID** + **Issuer ID** + **Team ID** (values → secret manager).
- [ ] **Sandbox tester** account(s) for the billing matrix.

### Google (owner)
- [ ] Verified **organization** Play developer account + **payments/merchant profile** + tax info.
- [ ] **Play app record** created manually for `com.halaa.app`, default language approved.
- [ ] **Play App Signing** enrolled; record **app-signing SHA-256** + **upload SHA-256**.
- [ ] **Service account JSON** linked in Play Console (least privilege: manage releases + store listing) → secret manager / EAS file secret.
- [ ] **License testers** + an **internal test track**.

### RevenueCat (owner)
- [ ] Production **project** created.
- [ ] **iOS app** (bundle `com.halaa.app`) + **Android app** (package `com.halaa.app`) added under the one project.
- [ ] **Secret API key** (server-side) + **public SDK keys** (`REVENUECAT_IOS_KEY`, `REVENUECAT_ANDROID_KEY`) issued.
- [ ] **Transfer behavior** decision available: **"Keep with original App User ID"** (signed DEC-04) — set in §5.5.

### Legal / finance / product (owner — mostly signed already)
- [ ] Catalog signed → **DONE** (six-tier / 34 plans + 22 add-ons, DEC-01, frozen in the manifest).
- [ ] SAR prices final → **DONE** (PRICE-OWNER); mechanical SAR→store-price-point mapping remains (§3.2/§4.2/§6).
- [ ] Saudi-only v1 availability → **DONE** (D2).
- [ ] AR/EN listing + product metadata approved → **BLOCKED** (Session-6 ASO README list; only signed-fact fields are approved).
- [ ] Privacy / Terms / Community / Refund / Support / Deletion pages live → **DONE structurally** (Session 5); **copy owner-approval BLOCKED**.
- [ ] Apple App Privacy + Google Data Safety worksheets signed → **BLOCKED** (see `store-metadata/data-safety-worksheet.md`; retention durations owner-gated).

---

## 2. Resolved inputs (secret-free variable sheet)

External runbook §3. Fill blanks at config time; **any blank REQUIRED value is an explicit blocker.**
Values below are **known/signed** (safe, secret-free). Everything marked `BLOCKED` needs the owner.

```text
# ── Known / signed (safe to use) ───────────────────────────────
APPLE_BUNDLE_ID              = com.halaa.app
GOOGLE_PACKAGE_NAME          = com.halaa.app
REVENUECAT_RECURRING_ENTITLEMENT_ID = recurring_access
REVENUECAT_OFFERING_IDS      = host_plans, business_plans, host_addons, business_addons
CANONICAL_ORIGIN             = https://halaa.com.sa
BACKEND_WEBHOOK_URL          = https://halaa.com.sa/api/v2/payments/revenuecat/webhook
PRIVACY_URL_AR/EN            = https://halaa.com.sa/{ar,en}/privacy
TERMS_URL_AR/EN              = https://halaa.com.sa/{ar,en}/terms
REFUND_URL_AR/EN             = https://halaa.com.sa/{ar,en}/refund
COMMUNITY_URL_AR/EN          = https://halaa.com.sa/{ar,en}/community-rules
SUPPORT_URL_AR/EN            = https://halaa.com.sa/{ar,en}/support
DELETE_URL_AR/EN             = https://halaa.com.sa/{ar,en}/delete-account
MARKETING_URL_AR/EN          = https://halaa.com.sa/{ar,en}
APP_NAME_AR / APP_NAME_EN    = هلا / Halaa
AVAILABILITY                 = SA (Saudi Arabia only)
CATALOG_VERSION              = 1.0.0
CATALOG_SHA256               = 7410b2c6f950400ddfe62d0d2ba9e50caee361ca0594e5b6505b89e5050c0071
EAS_PROJECT_ID               = d5570c5a-d11b-4716-81d6-108939d72b22   (app.json extra.eas.projectId)
EAS_OWNER/SLUG               = petersafwat

# ── BLOCKED_NEEDS_OWNER (required before config) ───────────────
APPLE_TEAM_ID                = <BLOCKED>
APPLE_ASC_APP_ID             = <BLOCKED>
APPLE_SKU                    = <BLOCKED>
APPLE_API_KEY_ID             = <BLOCKED, masked>
APPLE_API_ISSUER_ID          = <BLOCKED, masked>
APPLE_PRIMARY_LOCALE         = ar-SA (proposed; owner confirm)
GOOGLE_PLAY_APP_RECORD       = <BLOCKED>
GOOGLE_SERVICE_ACCOUNT       = <BLOCKED, email only>
GOOGLE_APP_SIGNING_SHA256    = <BLOCKED>
GOOGLE_UPLOAD_SHA256         = <BLOCKED>
REVENUECAT_PROJECT_ID        = <BLOCKED>
REVENUECAT_IOS_APP_ID        = <BLOCKED>
REVENUECAT_ANDROID_APP_ID    = <BLOCKED>
SUPPORT_EMAIL                = <BLOCKED — support@halaa.net vs support@halaa.com.sa (Session-5 conflict)>
SUPPORT_PHONE / WHATSAPP     = <BLOCKED — +966552619282 provisional>
LEGAL_ENTITY_AR/EN           = <BLOCKED — 2-way conflict (Session 5)>
POSTAL_ADDRESS               = <BLOCKED — Jeddah provisional>
```

---

## 3. Apple App Store Connect configuration

**Reference table:** `generated/apple-product-map.generated.md` — the exact 54 rows (proposed product id,
apple product type, EN reference name, SAR price, RevenueCat offering). **32 store-eligible plans + 22
add-ons = 54 products.** `trial` and `unlimited` are **NOT** products (they never appear in the map).

### 3.1 App information / privacy / availability
Upsert (external runbook §5.1/§5.4): AR/EN app name (هلا / Halaa), category (proposed **Lifestyle** —
owner confirm secondary), privacy URLs (§2), 2026 age-rating questionnaire (**owner, console-only**),
**Saudi Arabia availability only**, EULA (Apple standard + Terms link, or owner custom). App Privacy =
apply the signed `store-metadata/data-safety-worksheet.md` (`NSPrivacyTracking=false`; **owner attestations**).

### 3.2 One-time IAPs — **18 event consumables + 22 add-on consumables = 40 `consumable` products**
For **every row in the Apple map with `apple product type = consumable`** (all 40): create a **Consumable**
IAP with:
- **Immutable Product ID = the map's `proposed product id`** (e.g. `com.halaa.basic_event_25`) — never rename.
- Reference name = the map's EN reference name.
- **Price:** select the **nearest available Saudi-storefront price point** to the map's **SAR** value at
  console time. **Do not invent a price-tier number here** — the current Apple SA price-point table is not
  verifiable in this repo; the manifest SAR value is the target, the console picks the tier. (PRICE-OWNER:
  SAR values are final; the store renders the localized price and collects Saudi VAT 15%.)
- AR/EN display name + description (owner-approved ASO copy; only signed-fact fields are pre-approved).
- Tax category (owner). Review note + screenshot.
- **No entitlement, no Restore obligation** (consumables). Design-template + business-customization
  consumables are single-use managed services (DEC-03/DEC-03L) — do not present them as restorable.

### 3.3 Auto-renewable subscriptions — **14 products in ONE subscription group**
For **every row with `apple product type = auto_renewable_subscription`** (14: 12 personal monthly + business
quarterly + business annual): create an **auto-renewable subscription** with immutable Product ID = the map
id, duration mapped from the manifest `billingPeriod` (**monthly → 1 month**, **quarterly → 3 months**,
**annual → 1 year**), Saudi price point (nearest to the SAR target, as §3.2),
AR/EN localization, tax category, family sharing **off**, review note + screenshot.

**Subscription group + levels (PROPOSED — the one structure the manifest does not encode).** The manifest
carries `revenueCatOfferingId`, `tier`, and `sortOrder`, **not** Apple subscription-group/level fields, so
this must be proposed explicitly and **owner-confirmed**:
- Create **one** subscription group, e.g. `halaa_recurring` (proposed). Apple allows a customer only **one
  active subscription per group** — which matches the app's single-active-subscription design
  (`repurchasePolicy: single_active_subscription`) and the single `recurring_access` entitlement.
  **One-group-vs-two is itself an owner call:** personal (basic/premium) and business subs sit behind
  different audience gates (a personal host cannot cross to a business plan), so the owner may prefer two
  groups (`halaa_host` / `halaa_business`) so a cross-audience change is never offered. Default proposal =
  one group; owner confirms one vs two before creation.
- **Levels represent benefit ordering** (upgrade/downgrade), not arbitrary price order. Propose levels by
  `sortOrder` within each family, higher tier = higher level (lower level number = higher rank in ASC):
  personal basic monthly 25<50<75<100<150<200, premium monthly 25<50<75<100<150<200 (premium ranks above
  basic), and the two business subs (quarterly, annual) as their own ranks. **Owner confirms the exact
  cross-family level order** before creation (Apple level order drives proration on group changes; must match
  the mobile change-mode logic in `halla-mobile/services/billing/changeMode.js`, MOB-02).
- **Consumables are never in this group** (they are one-time IAPs, §3.2).

> First IAP/subscription must be attached to the app version at submission (Apple requirement). Keep **ready,
> not submitted**, until owner final approval.

---

## 4. Google Play configuration

**Reference table:** `generated/google-product-map.generated.md` — 54 rows (proposed product id, google
product type, base plan id, consumption, EN name, SAR price).

### 4.1 Store listing / app content
Upsert AR/EN listing (name هلا / Halaa, short/full description — **owner ASO copy**), support
email/phone/website (§2, **email BLOCKED**), privacy + deletion URLs, category (proposed **LIFESTYLE**,
owner confirm), assets. Complete/route to owner: **App access instructions** (reviewer login via
`scripts/seedReviewerAccounts.js` — credentials env-only), **Ads declaration**, **Data Safety + account
deletion**, **Target audience/content**, **Content rating**. See `store-metadata/reviewer-notes.md` and
`data-safety-worksheet.md` (Session 6 owns that copy — reference, do not re-author).

### 4.2 Subscriptions — **14 `subs` products, each with ONE base plan**
For every row with `google product type = subs` (14): create the subscription **product id = the map id**,
add a **base plan** with **`base plan id` = the map's base-plan column** (`monthly` for the 12 personal, `quarterly`
for business quarterly, `annual` for business annual) and the matching auto-renewing period. Saudi regional
availability + price (nearest SA price point to the SAR target, as §3.2). AR/EN benefits. Resubscribe +
grace/account-hold policy. **Activate only after RevenueCat import validation (§5.2).**

> **Critical for RevenueCat:** RevenueCat's Google subscription **store identifier is `productId:basePlanId`**
> (e.g. `com.halaa.basic_monthly_25:monthly`), **not** just `productId`. §5.2 uses this.

### 4.3 One-time products — **40 `inapp` products, consumed on grant**
For every row with `google product type = inapp` (18 event + 22 add-on = 40): create the one-time product
**id = the map id**, AR/EN title/description, **buy** purchase option, Saudi availability/price, tax/compliance,
**Active**. Consumption = **consume on grant** (the map's `consumption = consume` column) — the backend consumes
so the buyer can repurchase (`repurchasePolicy: repeatable`).

### 4.4 Build / track bootstrap
Per `SIGNED-BUILD-RUNBOOK.md` §6: upload the first signed **AAB** to an **internal test track** (do not
promote to production), verify Play App Signing certs feed `assetlinks.json`, run the **pre-launch report**,
confirm targetSdk 35 / 16 KB / Billing Library version / permissions.

---

## 5. RevenueCat configuration

**Reference table:** `generated/revenuecat-mapping.generated.md` — grouped by the **4 offerings**, one package
row per store-eligible product (package lookup key === internal code).

### 5.1 Store connections
- **Apple app** (bundle `com.halaa.app`) + in-app-purchase key / **App Store Server Notifications**.
- **Android app** (package `com.halaa.app`) + Play **service-account** credentials + **Google RTDN Pub/Sub**.
- **Two-hop flow (do not conflate):** Apple ASSN + Google RTDN point at **RevenueCat**; then **RevenueCat's
  webhook** (§5.6) points at the **backend**. The backend never receives ASSN/RTDN directly.
- Production vs sandbox separation.

### 5.2 Products — **54 RevenueCat products (one per platform store product)**
Import/create one RC product per store product. Verify each against the manifest:
- **Apple identifier EXACT** = `iosProductId` (e.g. `com.halaa.basic_monthly_25`).
- **Google identifier = `productId:basePlanId`** for the 14 subs (e.g. `com.halaa.basic_monthly_25:monthly`);
  the 40 one-time products use the bare `androidProductId`.
- Correct app/platform, type (subscription vs consumable), duration.

### 5.3 Entitlement — **exactly ONE: `recurring_access`**
- Create the single entitlement **`recurring_access`** (= `REVENUECAT_RECURRING_ENTITLEMENT_ID`).
- **Attach ONLY the 14 subscriptions** (the rows whose `entitlement` column = `recurring_access` in the
  mapping / whose manifest `revenueCatEntitlementId === "recurring_access"`).
- **Attach NO consumable and NO add-on** — every event/add-on row has `entitlement = —` (manifest
  `revenueCatEntitlementId: null`). **This invariant is load-bearing (P0-09): a consumable attached to
  `recurring_access` would unlock recurring access forever after a one-time buy.** The §8 readback diff
  asserts this per product.
- There is **no** permanent-access non-consumable in this catalog, so no second entitlement is needed.

### 5.4 Offerings / packages — **4 offerings, 54 packages total**
Create these offerings and attach the matching iOS+Android product to each package. **Package lookup key ===
internal code**, so mobile matches by code (verified: `revenueCatPackageLookupKey === internalCode` for every
store-eligible product).

| Offering id | Packages | Contents (from mapping) |
|---|---|---|
| `host_plans` | **24** | 12 personal event consumables (basic/premium ×6) + 12 personal subscriptions (basic/premium monthly ×6) |
| `business_plans` | **8** | 6 business event consumables + business_quarterly + business_annual |
| `host_addons` | **21** | 16 extra-invite consumables + 5 design-template consumables |
| `business_addons` | **1** | business_customization |
| **Total** | **54** | — |

For every package, validate exactly one iOS + one Android product (no missing/duplicate platform product).
Set `current` offering only as the mobile implementation requires (mobile reads all offerings via
`useAllOfferings`, not only `current` — do not assume `current`-only).

### 5.5 Identity / restore / transfer
- Custom App User ID model is already correct (`Purchases.logIn(billingUserId)`, no `logOut()`).
- **Set project transfer behavior = "Keep with original App User ID"** (signed DEC-04): no auto cross-account
  transfer, no dual access; genuine migrations are manual by support. Backend already handles `TRANSFER`
  webhooks and post-deletion tombstones (Session 2/4).

### 5.6 Webhook
- **Exact production URL:** `https://halaa.com.sa/api/v2/payments/revenuecat/webhook`.
- Authorization header = a cryptographically random secret stored as **`REVENUECAT_WEBHOOK_AUTH`** (name only).
- Production environment/app filtering; all required lifecycle events.
- Send an RC **test event** → verify authenticated ingestion → then run **real sandbox purchases** (dashboard
  test events do not prove store lifecycle).

---

## 6. EAS / backend secrets and config (NAMES only)

Set **values** securely in the respective secret store; verify **names/status** only. Full detail:
`SIGNED-BUILD-RUNBOOK.md` §3 (EAS) + external runbook §9 (backend).

**Backend secret manager (billing):** `NATIVE_BILLING_ENABLED=true` (only after code+catalog+console ready),
`REVENUECAT_WEBHOOK_AUTH`, `REVENUECAT_API_KEY`, `REVENUECAT_APP_ID`, `REVENUECAT_ENVIRONMENT=PRODUCTION`,
`REVENUECAT_RECURRING_ENTITLEMENT_ID` (= `recurring_access`), catalog version/hash (`1.0.0` / the SHA-256
above). The backend Zod readiness gate (`revenuecat.config.js`, BILL-10) fails closed on missing/placeholder
values — set them all or `/health/ready` stays red.

**EAS (per environment):** `REVENUECAT_IOS_KEY`, `REVENUECAT_ANDROID_KEY`, `SENTRY_DSN`, `SENTRY_ORG`,
`SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`, `SENTRY_ENVIRONMENT`, `GOOGLE_MAPS_API_KEY` (restricted to
`com.halaa.app`), the production API URL (already per-profile in `eas.json`), and the `eas.json` submit
IDs (Apple ID / ascAppId / teamId — the `REPLACE_WITH_*` placeholders) + the Play service-account file secret.
**Never reuse production RC keys in a Test-Store dev build.**

---

## 7. Preflight before writes (once access exists)

Export the current console state to `docs/evidence/store-readiness/before/` (Apple app/IAPs/subscription
group/levels/prices/localizations; Google listing/subs/base-plans/one-time products; RevenueCat
apps/products/entitlement/offerings/packages/webhook; EAS env **names**). Diff against the manifest; owner
resolves any destructive conflict before any create. **No before-state export was possible this session.**

---

## 8. Readback + zero-drift diff (MCP-05) — the acceptance procedure

After writes, export console state to `docs/evidence/store-readiness/after/` and diff against
`storeCatalog.generated.json`. **Zero unexplained drift** is required. Assert, per platform:

1. **Every store-eligible manifest row exists exactly once** in Apple, Google, and RevenueCat.
   Expected counts (from `expected-counts.generated.md`): **54 products/platform** (14 subscriptions + 18 event
   consumables + 22 add-on consumables); **0** products for `trial`/`unlimited`.
2. **Ids match exactly:** Apple product id = `iosProductId`; Google = `androidProductId` (+ `:basePlanId` for
   subs); RevenueCat package lookup key = `internalCode`; RC Apple/Google store identifiers as §5.2.
3. **Types/periods:** each subscription = auto-renewable / `subs` + base plan (`monthly`/`quarterly`/`annual`);
   each event/add-on = consumable / `inapp` consume-on-grant.
4. **Entitlement invariant (the load-bearing check):** for **every** product, assert
   **`console_entitlement == manifest.revenueCatEntitlementId`**. This must resolve to: **exactly the 14
   subscriptions carry `recurring_access`**, and **0** consumables/add-ons carry any entitlement. Any consumable
   found attached to `recurring_access` = **hard fail, stop**.
5. **Prices:** each product's Saudi price point corresponds to its manifest SAR target (nearest tier);
   currency SAR; VAT collected by the store.
6. **Availability:** Saudi Arabia only; no unapproved country.
7. **Offerings/packages:** the 4 offerings with 24 / 8 / 21 / 1 packages; each package has exactly one iOS +
   one Android product.
8. **Localizations:** AR/EN present for every product + all required listing fields/assets.
9. **Integrations healthy:** RC webhook 200 on test event; Apple ASSN + Google RTDN connected to RC; backend
   required secret **names** present; catalog version/hash on backend readiness = `1.0.0` / the SHA-256 above.
10. **Live URLs:** every legal/support/deletion URL returns 200 and matches console values; AASA/assetlinks
    use the final Team ID + Play signing SHA and validate.

Produce `docs/evidence/store-readiness/FINAL-DIFF.md` with zero unexplained drift → then **`READY_FOR_SANDBOX`**
(sandbox matrix per `SIGNED-BUILD-RUNBOOK.md` §8 + billing plan Phase 8). **Not reached this session.**

---

## 9. Manifest write-readiness (verified this session — see also CORRECTIVE-STATUS)

`cd halaa-backend && npm run catalog:verify` (drift check + `test/store-catalog.test.js`) proves the manifest
is safe to hand a console, **DB/credential-free**:
- **Unique ids** — unique internal codes, Apple ids, Google `productId::basePlanId` combos, RC lookup keys
  (`store-catalog.test.js` "unique …" tests).
- **No consumable/add-on on `recurring_access`** — "no consumable or add-on carries the recurring entitlement
  id": non-subscriptions = `null`; **exactly 14** subs carry it.
- **Trial/unlimited absent from store** — "zero trial / unlimited store products": `storeEligible:false`, null
  ids/lookup/entitlement, `nonStore:2`.
- **Google `productId:basePlanId` well-formed** — every subscription has a non-null `androidBasePlanId`
  (`monthly`/`quarterly`/`annual`); combos unique.

**End state:** `BLOCKED_NEEDS_OWNER` — every step above needs authenticated Apple/Google/RevenueCat/EAS access
plus the §1 owner bootstrap. No console write occurred; no `READY_FOR_SANDBOX` claim is made.
