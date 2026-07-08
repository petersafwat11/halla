# Expected-count report (generated)

> **GENERATED — do not edit by hand.** Source: `halaa-backend/src/shared/commerce/` (`catalog.overlay.js` + `buildCatalog.js`). Regenerate with `npm run catalog:generate`.
>
> All Apple / Google / RevenueCat identifiers below are **PROPOSED** and **NOT yet created** in any store console. Prices are shown in SAR from the current backend catalog; the stores collect Saudi VAT (15%) and render the localized price string (PRICE-OWNER, signed 2026-07-01).

## Counts

| metric | value |
| --- | --- |
| DB plans | 34 |
| store-eligible plans | 32 |
| add-ons (all store-eligible) | 22 |
| store-eligible add-ons | 22 |
| **proposed store products per platform** | **54** |
| — subscriptions | 14 |
| — event consumables | 18 |
| — add-on consumables | 22 |
| internal / non-store (trial + unlimited) | 2 |

## Plans per planType

| planType | count |
| --- | --- |
| trial | 1 |
| basic_event | 6 |
| basic_monthly | 6 |
| premium_event | 6 |
| premium_monthly | 6 |
| business_event | 6 |
| business_quarterly | 1 |
| business_annual | 1 |
| unlimited | 1 |

## Signed add-on classifications (DEC-03 / DEC-03L)

| add-on | kind | refund policy | restore | fulfillment |
| --- | --- | --- | --- | --- |
| design_template_* | addon_consumable | non_refundable_from_creation | none | managed_service_admin |
| extra_invites_* | addon_consumable | clawback_unused | backend_ledger | automatic |
| business_customization | addon_consumable | managed_service_legal_review | none | managed_service_admin |
