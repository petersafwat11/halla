# RevenueCat — offering / package / entitlement map (generated)

> **GENERATED — do not edit by hand.** Source: `halaa-backend/src/shared/commerce/` (`catalog.overlay.js` + `buildCatalog.js`). Regenerate with `npm run catalog:generate`.
>
> All Apple / Google / RevenueCat identifiers below are **PROPOSED** and **NOT yet created** in any store console. Prices are shown in SAR from the current backend catalog; the stores collect Saudi VAT (15%) and render the localized price string (PRICE-OWNER, signed 2026-07-01).

Recurring access is derived from ONE entitlement: `recurring_access` (PROPOSED `REVENUECAT_RECURRING_ENTITLEMENT_ID`). **No consumable/add-on carries any entitlement** (P0-09: a consumable attached to an entitlement would unlock it forever). Package lookup key === internal code, so mobile matches packages by code. Transfer behavior = "Keep with original App User ID" (DEC-04).

## Offering `business_addons`

| package lookup key | revenuecat type | proposed product id (ios=android) | entitlement | kind |
| --- | --- | --- | --- | --- |
| business_customization | consumable | com.halaa.business_customization | — | addon_consumable |

## Offering `business_plans`

| package lookup key | revenuecat type | proposed product id (ios=android) | entitlement | kind |
| --- | --- | --- | --- | --- |
| business_event_25 | consumable | com.halaa.business_event_25 | — | event_consumable |
| business_event_50 | consumable | com.halaa.business_event_50 | — | event_consumable |
| business_event_75 | consumable | com.halaa.business_event_75 | — | event_consumable |
| business_event_100 | consumable | com.halaa.business_event_100 | — | event_consumable |
| business_event_150 | consumable | com.halaa.business_event_150 | — | event_consumable |
| business_event_200 | consumable | com.halaa.business_event_200 | — | event_consumable |
| business_quarterly | subscription | com.halaa.business_quarterly | recurring_access | subscription |
| business_annual | subscription | com.halaa.business_annual | recurring_access | subscription |

## Offering `host_addons`

| package lookup key | revenuecat type | proposed product id (ios=android) | entitlement | kind |
| --- | --- | --- | --- | --- |
| extra_invites_10 | consumable | com.halaa.extra_invites_10 | — | addon_consumable |
| extra_invites_20 | consumable | com.halaa.extra_invites_20 | — | addon_consumable |
| extra_invites_30 | consumable | com.halaa.extra_invites_30 | — | addon_consumable |
| extra_invites_40 | consumable | com.halaa.extra_invites_40 | — | addon_consumable |
| extra_invites_50 | consumable | com.halaa.extra_invites_50 | — | addon_consumable |
| extra_invites_75 | consumable | com.halaa.extra_invites_75 | — | addon_consumable |
| extra_invites_100 | consumable | com.halaa.extra_invites_100 | — | addon_consumable |
| extra_invites_125 | consumable | com.halaa.extra_invites_125 | — | addon_consumable |
| extra_invites_150 | consumable | com.halaa.extra_invites_150 | — | addon_consumable |
| extra_invites_200 | consumable | com.halaa.extra_invites_200 | — | addon_consumable |
| extra_invites_250 | consumable | com.halaa.extra_invites_250 | — | addon_consumable |
| extra_invites_300 | consumable | com.halaa.extra_invites_300 | — | addon_consumable |
| extra_invites_350 | consumable | com.halaa.extra_invites_350 | — | addon_consumable |
| extra_invites_400 | consumable | com.halaa.extra_invites_400 | — | addon_consumable |
| extra_invites_450 | consumable | com.halaa.extra_invites_450 | — | addon_consumable |
| extra_invites_500 | consumable | com.halaa.extra_invites_500 | — | addon_consumable |
| design_template_ready_made | consumable | com.halaa.design_template_ready_made | — | addon_consumable |
| design_template_custom_male | consumable | com.halaa.design_template_custom_male | — | addon_consumable |
| design_template_custom_themed | consumable | com.halaa.design_template_custom_themed | — | addon_consumable |
| design_template_animated | consumable | com.halaa.design_template_animated | — | addon_consumable |
| design_template_3d | consumable | com.halaa.design_template_3d | — | addon_consumable |

## Offering `host_plans`

| package lookup key | revenuecat type | proposed product id (ios=android) | entitlement | kind |
| --- | --- | --- | --- | --- |
| basic_event_25 | consumable | com.halaa.basic_event_25 | — | event_consumable |
| basic_event_50 | consumable | com.halaa.basic_event_50 | — | event_consumable |
| basic_event_75 | consumable | com.halaa.basic_event_75 | — | event_consumable |
| basic_event_100 | consumable | com.halaa.basic_event_100 | — | event_consumable |
| basic_event_150 | consumable | com.halaa.basic_event_150 | — | event_consumable |
| basic_event_200 | consumable | com.halaa.basic_event_200 | — | event_consumable |
| basic_monthly_25 | subscription | com.halaa.basic_monthly_25 | recurring_access | subscription |
| basic_monthly_50 | subscription | com.halaa.basic_monthly_50 | recurring_access | subscription |
| basic_monthly_75 | subscription | com.halaa.basic_monthly_75 | recurring_access | subscription |
| basic_monthly_100 | subscription | com.halaa.basic_monthly_100 | recurring_access | subscription |
| basic_monthly_150 | subscription | com.halaa.basic_monthly_150 | recurring_access | subscription |
| basic_monthly_200 | subscription | com.halaa.basic_monthly_200 | recurring_access | subscription |
| premium_event_25 | consumable | com.halaa.premium_event_25 | — | event_consumable |
| premium_event_50 | consumable | com.halaa.premium_event_50 | — | event_consumable |
| premium_event_75 | consumable | com.halaa.premium_event_75 | — | event_consumable |
| premium_event_100 | consumable | com.halaa.premium_event_100 | — | event_consumable |
| premium_event_150 | consumable | com.halaa.premium_event_150 | — | event_consumable |
| premium_event_200 | consumable | com.halaa.premium_event_200 | — | event_consumable |
| premium_monthly_25 | subscription | com.halaa.premium_monthly_25 | recurring_access | subscription |
| premium_monthly_50 | subscription | com.halaa.premium_monthly_50 | recurring_access | subscription |
| premium_monthly_75 | subscription | com.halaa.premium_monthly_75 | recurring_access | subscription |
| premium_monthly_100 | subscription | com.halaa.premium_monthly_100 | recurring_access | subscription |
| premium_monthly_150 | subscription | com.halaa.premium_monthly_150 | recurring_access | subscription |
| premium_monthly_200 | subscription | com.halaa.premium_monthly_200 | recurring_access | subscription |
