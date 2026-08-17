# Halaa external store + RevenueCat MCP execution runbook

**Executor:** Claude with authorized MCP servers/connectors for App Store Connect, Google Play Console/Android Publisher, RevenueCat, EAS, and deployment secrets.  
**Purpose:** create/configure the app records, products, listings, billing integrations, and evidence needed for submission.  
**Important:** this runbook supersedes the level of detail in `store-readiness-EXTERNAL-STEPS.md`; it does not waive manual account-holder, banking, tax, legal, identity, or review actions.

## Non-negotiable safety rules for Claude

1. **Start read-only.** List MCP tools and permissions; export current state before any mutation.
2. **Never print or commit secrets.** Store only secret names, key IDs, masked suffixes, and verification status in evidence.
3. **Do not invent IDs or legal answers.** Use `BLOCKED_NEEDS_OWNER` for missing account, team, legal, tax, privacy, content-rating, or pricing approvals.
4. **Do not create production SKUs until the catalog gate is signed.** Apple/Google product IDs cannot safely be treated as disposable.
5. **Make writes idempotent.** Read by immutable bundle/package/product ID before create; update only managed fields; never duplicate.
6. **Do not submit for review, publish, change production availability, or release a build without the owner’s explicit final confirmation.** “Ready for submission” is the target of this runbook.
7. **Save before/after evidence.** Every mutation must have tool name, timestamp, account/app/project ID, redacted request summary, result ID/state, and verification readback.
8. **Stop on drift.** If console state conflicts with the signed manifest, report a diff; do not guess which side wins.

## 0. Inputs Claude must load

Read completely:

- `docs/store-readiness-CLAUDE-MASTER-PLAN.md`
- `docs/store-readiness-REVIEW-FINDINGS.md`
- `docs/store-readiness-BILLING-COMPLETION-PLAN.md`
- `docs/store-readiness-SEO-ASO-METADATA-PLAN.md`
- `docs/store-readiness-LEGAL-PARITY-PLAN.md`
- canonical store catalog generated in Billing Phase 0
- committed AR/EN store metadata and product localizations
- final signed IPA/AAB metadata report and checksums

Refuse product mutations if the six-tier/ten-tier decision is unresolved.

## 1. MCP capability discovery and execution report

Create `docs/evidence/external-mcp/CAPABILITY-REPORT.md` with:

| Provider | MCP/server | Auth identity/role | Read capabilities | Write capabilities | Unsupported/manual actions |
|---|---|---|---|---|---|
| Apple | App Store Connect | masked team/key IDs | apps, versions, IAP, subscriptions, localizations, review state | only what tools prove | app record creation is manual; agreements/tax/banking/manual attestations |
| Google | Android Publisher/Play | service account email | app/listing/products/tracks | only what tools prove | initial Play app record/account attestations may be manual |
| RevenueCat | RevenueCat API/MCP | masked project/key | apps/products/entitlements/offerings/webhooks | only what tools prove | account/billing/project bootstrap if unsupported |
| EAS | Expo/EAS | owner/project | env/build/submit profiles | secrets/build/submit only if authorized | Apple/Google agreements |
| Deployment | secret manager/VPS | environment name | variable names/health | secret updates/deploy if authorized | provider key issuance |

If a requested MCP is unavailable, Claude must not simulate success. Produce a manual step with exact console path, required role, input values, and verification readback.

Official API boundaries:

- Apple says new app records are created on the App Store Connect website, not through the Apps API: https://developer.apple.com/documentation/appstoreconnectapi/apps
- Google documents app creation through Play Console: https://support.google.com/googleplay/android-developer/answer/9859152
- App Store Connect API can manage IAP/subscription metadata after the app exists: https://developer.apple.com/app-store-connect/api/
- Android Publisher API manages catalog/publishing after access is established: https://developers.google.com/android-publisher
- RevenueCat API v2 supports products/offerings/packages and store product identifiers: https://www.revenuecat.com/docs/api-v2

## 2. Owner/manual bootstrap checklist

Claude verifies and records; account holder completes where required.

### Apple

- Active organization Apple Developer Program membership.
- Legal entity/D-U-N-S and Account Holder identity complete.
- Agreements, Tax, and Banking: Paid Apps agreement active.
- Bundle ID `com.halla.app` registered with required capabilities.
- New iOS app record created manually with owner-approved name, SKU, primary locale, bundle ID.
- App Store Connect API key issued with least privilege; record issuer ID/key ID only, keep `.p8` in secret manager.
- Sandbox tester accounts available.

### Google

- Verified organization Play developer account and payments profile.
- App record manually created for `com.halla.app`, default language approved.
- Play App Signing enrolled; upload and app-signing SHA-256 fingerprints recorded.
- Service account linked in Play Console with least required permissions; JSON stored only in secret manager/EAS.
- License testers and internal/closed test track available.
- Determine whether closed-testing requirements apply to the account.

### RevenueCat

- Production project exists.
- iOS app and Google app exist under the same project.
- Secret API key with minimum permissions stored server-side.
- Public SDK keys available for EAS environments.
- Project restore/transfer behavior is owner-approved.

### Legal/finance/product

- Catalog signed.
- SAR store prices/price points approved for every product class/tier.
- Product tax categories approved.
- Saudi-only v1 availability approved.
- AR/EN app/product metadata approved.
- Privacy, Terms, Community, Refund, Support, Deletion pages live and signed.
- Apple App Privacy and Google Data Safety worksheets signed.

## 3. Canonical variable sheet

Claude creates `docs/evidence/external-mcp/RESOLVED-INPUTS.md` without secret values:

```text
APPLE_TEAM_ID=
APPLE_APP_ID=<TeamID>.com.halla.app
APPLE_ASC_APP_ID=
APPLE_BUNDLE_ID=com.halla.app
APPLE_SKU=
APPLE_PRIMARY_LOCALE=
APPLE_API_KEY_ID=<masked>
APPLE_API_ISSUER_ID=<masked>

GOOGLE_PACKAGE_NAME=com.halla.app
GOOGLE_PLAY_APP_ID/record=
GOOGLE_SERVICE_ACCOUNT=<email only>
GOOGLE_APP_SIGNING_SHA256=
GOOGLE_UPLOAD_SHA256=

REVENUECAT_PROJECT_ID=
REVENUECAT_IOS_APP_ID=
REVENUECAT_ANDROID_APP_ID=
REVENUECAT_RECURRING_ENTITLEMENT_ID=
REVENUECAT_DEFAULT/SEGMENT_OFFERING_IDS=

CANONICAL_ORIGIN=https://halaa.com.sa
SUPPORT_URL_AR=
SUPPORT_URL_EN=
PRIVACY_URL_AR=
PRIVACY_URL_EN=
TERMS_URL_AR=
TERMS_URL_EN=
COMMUNITY_URL_AR=
COMMUNITY_URL_EN=
REFUND_URL_AR=
REFUND_URL_EN=
DELETE_URL_AR=
DELETE_URL_EN=
SUPPORT_EMAIL=
SUPPORT_PHONE=
LEGAL_ENTITY_AR=
LEGAL_ENTITY_EN=

CATALOG_VERSION=
CATALOG_SHA256=
IPA_BUILD/CHECKSUM=
AAB_VERSION_CODE/CHECKSUM=
```

Any blank required value becomes an explicit blocker.

## 4. Preflight read-only exports

Export normalized JSON/Markdown snapshots to `docs/evidence/external-mcp/before/`:

- Apple app info, locales, versions, availability, IAPs, subscription groups/products/levels/prices/localizations/review status.
- Google app details, listings/locales/assets, countries, tracks/releases, subscriptions/base plans/offers, one-time products, app content state where API-visible.
- RevenueCat project apps, products, entitlements, offerings, packages, attached products, integrations/webhooks, restore behavior where accessible.
- EAS project/build profiles/environment variable **names** and last build metadata.
- Production readiness response with sensitive values redacted.

Generate a diff against the signed catalog/metadata. Owner resolves destructive conflicts before writes.

## 5. App Store Connect configuration

### 5.1 App information

Upsert/read back:

- localized app name/subtitle (AR, EN)
- primary category and secondary category
- privacy policy URLs
- content rights declaration
- updated 2026 age-rating questionnaire (manual if API/tool lacks fields)
- Saudi Arabia availability only
- standard EULA or approved custom EULA decision

### 5.2 Version metadata

Upsert AR/EN:

- description
- keywords
- promotional text
- support URL
- marketing URL
- What’s New
- copyright
- reviewer contact and notes
- non-admin host, business-host (if applicable), and vendor review steps/credentials reference

Never store reviewer passwords in repo evidence; record secret-manager reference and last rotation date.

### 5.3 Screenshots/assets

Upload approved localized sets:

- highest required iPhone size
- 13-inch iPad because `supportsTablet=true`
- optional previews if approved

Verify count, locale, device family, dimensions, and post-upload processing state.

### 5.4 App Privacy/export compliance

Apply only the signed worksheet. Verify Privacy URL and User Privacy Choices/Delete URL. Record any console-only attestations needing Account Holder confirmation.

## 6. Apple product catalog

### 6.1 Subscription group

Create/upsert one owner-approved group for interchangeable recurring Halaa plans unless product/legal deliberately chooses otherwise. Add AR/EN group localization.

Customers can hold only one subscription per group. Levels must represent benefit ordering, not merely arbitrary price ordering.

### 6.2 Auto-renewable products

For every catalog `subscription` item:

- immutable product ID
- reference name
- duration (1 month, 3 months, or 1 year)
- group and level
- Saudi availability and approved price point
- AR/EN display name/description
- tax category
- family sharing decision (recommended off unless intentionally supported)
- review note and review screenshot

Verify upgrade/downgrade/crossgrade order matches backend/mobile semantics.

### 6.3 One-time IAPs

For every approved event/add-on item:

- consumable or non-consumable exactly as cataloged
- immutable product ID/reference name
- Saudi price point
- AR/EN name/description
- tax category
- review note/screenshot

The first IAP/subscriptions must be attached/submitted with the app version as Apple requires. Keep them ready, not submitted, until the owner approves final submission.

Official product requirements:

- https://developer.apple.com/help/app-store-connect/manage-in-app-purchases/create-consumable-or-non-consumable-in-app-purchases
- https://developer.apple.com/help/app-store-connect/manage-subscriptions/offer-auto-renewable-subscriptions/

## 7. Google Play configuration

### 7.1 Store listing/app content

Upsert AR/EN:

- app name, short/full description
- support email/phone/website
- privacy and deletion URLs
- category/tags
- localized icon/feature graphic/screenshots/phone assets
- release notes

Complete or report manual blockers for:

- App access instructions
- Ads declaration
- Data Safety + account deletion
- Target audience/content
- Content rating
- News/health/financial/other special declarations if the console asks
- Government/organization declarations if applicable

### 7.2 Subscriptions

Use the signed Google catalog design. For each recurring item:

- subscription product ID
- base plan ID and auto-renewing period
- Saudi regional availability/price
- AR/EN listing/benefits
- resubscribe and grace/account-hold policy
- offers/promo codes if approved
- active state only after RevenueCat/import validation

Remember: RevenueCat’s Google subscription store identifier is `productId:basePlanId`, not just `productId`.

### 7.3 One-time products

For event/add-on items:

- immutable product ID
- AR/EN title/description
- buy purchase option
- Saudi availability/price
- tax/compliance settings
- active state
- consumable/non-consumable behavior agreed with app/RevenueCat

Official catalog model: https://support.google.com/googleplay/android-developer/answer/14590082

### 7.4 Build/track bootstrap

- Upload first AAB manually if API access requires prior bootstrap.
- Verify Play App Signing certificates and update `assetlinks` inputs.
- Create internal test release from the signed AAB; do not promote to production.
- Confirm target API, 16 KB compatibility, Billing Library version, permissions, device catalog, and pre-launch report.

At 2026-06-28, Billing Library 7 remains accepted until 2026-08-31, but use 8+ for release durability if the resolved dependency supports it. Official schedule: https://developer.android.com/google/play/billing/deprecation-faq

## 8. RevenueCat configuration

### 8.1 Store connections

Configure/read back:

- Apple app with bundle ID and current recommended App Store credentials/key
- Google app with package name and Play service account credentials
- Apple server notifications and Google RTDN/Pub/Sub per RevenueCat instructions
- production vs sandbox/test separation

### 8.2 Products

Import/create one RevenueCat product per platform store product. Verify:

- Apple identifier exact
- Google subscription identifier `productId:basePlanId`
- correct app/platform
- type/duration
- active store state visible

RevenueCat v2 may push supported products to Apple, but use this only when the MCP/API proves the correct app/product type and the catalog is signed. Read back from both RevenueCat and the store.

### 8.3 Entitlements

- Create one explicit recurring-access entitlement (approved ID).
- Attach recurring subscriptions only.
- Attach **no consumable** and no operational add-on to this entitlement.
- If a non-consumable truly represents permanent access, use a separate explicit entitlement and update backend logic accordingly.

### 8.4 Offerings/packages

Recommended offerings:

- `host_plans`
- `business_plans`
- `host_addons`
- `business_addons`

For every canonical package lookup key, attach the equivalent iOS and Android product. Validate no missing/multiple platform product. Set current offering only as required by the revised mobile implementation; do not assume all code reads only `current`.

### 8.5 Identity/restore behavior

Owner signs one restore-transfer policy after testing account A/B behavior. Record it in the evidence. Backend must handle resulting TRANSFER webhooks before release.

### 8.6 Webhook

Configure:

- exact production URL: `<BACKEND_PUBLIC_ORIGIN>/api/v2/payments/revenuecat/webhook`
- cryptographically random authorization header stored in secret manager
- production environment/app filtering
- all required lifecycle events

Send RevenueCat test event and verify authenticated ingestion. Then test real sandbox purchases because dashboard test events do not prove store lifecycle behavior.

## 9. Deployment/EAS secrets and config

### Backend secret manager

Set variable **values** securely and verify names/status only:

- `NATIVE_BILLING_ENABLED=true` only after code/catalog are ready
- `REVENUECAT_WEBHOOK_AUTH`
- `REVENUECAT_API_KEY`
- `REVENUECAT_APP_ID`
- `REVENUECAT_ENVIRONMENT=PRODUCTION` (sandbox environment uses its own deployment/config)
- `REVENUECAT_RECURRING_ENTITLEMENT_ID`
- catalog version/hash or generated maps

Also finish the existing rotation/readiness variables from `EXTERNAL-STEPS.md`.

### EAS

Set per environment:

- `REVENUECAT_IOS_KEY`
- `REVENUECAT_ANDROID_KEY`
- `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`, environment/release values
- `GOOGLE_MAPS_API_KEY` with package/bundle/API restrictions
- production API URL
- Apple submit identifiers
- Play service-account file secret

Never reuse production RC keys in development Test Store builds unless intentionally isolated.

## 10. Verification/readback after writes

Export to `docs/evidence/external-mcp/after/` and run a normalized diff:

- every catalog row exists exactly once in Apple, Google, and RevenueCat for each platform;
- types, periods, audience, prices, localizations, availability, package attachments, and entitlement attachments match;
- all required app/listing fields and assets exist for AR/EN;
- no unapproved country availability;
- no consumable attached to recurring entitlement;
- webhook/RTDN/server notification connections healthy;
- backend/EAS required secret names present;
- live legal/support/deletion URLs return 200 and match console values;
- AASA/assetlinks use final team/signing IDs and validate.

Produce `docs/evidence/external-mcp/FINAL-DIFF.md` with zero unexplained drift.

## 11. Sandbox execution

Use `store-readiness-BILLING-COMPLETION-PLAN.md` Phase 8. Claude may automate event/log collection through MCP, but real store sheets and device interactions require testers/devices. Link every test to:

- store transaction/order ID
- RevenueCat customer/event/product
- backend event/payment/subscription/entitlement/add-on IDs
- before/after quota
- screenshot/video and result

No production submission while a required row is untested/failed.

## 12. Final ready-for-submission packet

Create:

- capability report
- resolved inputs with no secrets
- before/after console exports
- signed catalog and SHA-256
- Apple/Google/RevenueCat zero-drift report
- signed IPA/AAB checksums and artifact inspection
- AR/EN listing/product metadata export
- privacy/data-safety/legal approval references
- reviewer accounts/steps verification (password references only)
- sandbox matrix
- pre-launch/TestFlight test results
- remaining manual Account Holder actions
- explicit go/no-go recommendation

Stop at **READY_FOR_OWNER_SUBMISSION_APPROVAL**. The owner then authorizes submit/release actions separately.

## Claude handoff prompt

```text
Use the authorized MCP servers to execute docs/store-readiness-EXTERNAL-MCP-RUNBOOK.md.
First operate read-only: produce the capability report, resolved-input blockers,
and before-state exports. Do not create store products until the signed canonical
catalog exists and the six-tier/ten-tier contradiction is resolved. Never print or
commit secrets. Apply idempotent writes only where the MCP tool proves support,
read back every write, and produce a zero-drift after export. Do not submit for
review or publish without explicit owner approval. Continue until the state is
READY_FOR_OWNER_SUBMISSION_APPROVAL or a concrete owner/manual blocker is recorded.
```
