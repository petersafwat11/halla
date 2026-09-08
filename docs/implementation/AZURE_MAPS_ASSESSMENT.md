# Azure Maps assessment for Halaa

Reviewed September 8, 2026. Decision: viable candidate, but the user's conditions for an unconditional migration are not yet satisfied. No application provider configuration was changed and no Azure subscription or Maps resource was provisioned.

## App requirements and migration scope

- Web: `halaa-web/ui/commen/inputs/MapInput.jsx` uses Google JavaScript rendering, autocomplete and geocoding directly.
- Native: `halaa-mobile/components/commen/MapPicker.js` uses `react-native-maps` with Google rendering; search and reverse geocoding call the backend. Azure cannot be enabled by substituting an API key. A Web SDK map in a WebView or an independently supported renderer is needed.
- Backend: `halaa-backend/src/modules/locations/googleMaps.service.js` supports Saudi-restricted autocomplete, place details and reverse geocoding. Add a separate Azure adapter and provider-neutral routes rather than routing Azure requests through Google-named contracts.
- Stored locations already contain coordinates, address, city, country, provider and placeId. Keep provider IDs distinct and preserve existing event coordinates.
- Guest directions and Uber links in `halaa-backend/src/modules/guests/guestEventActions.js` use coordinates; they do not require replacing the destination apps or buying a routing API.
- Complete migration also includes mobile build configuration, web build variables, readiness checks, attribution, privacy disclosures and regression coverage.

## Coverage and remaining validation

Microsoft documents Saudi address points, street/city and POI coverage, and Saudi Arabic support. Its coverage table does not mark Saudi house-number coverage. Published coverage is not evidence that Halaa's actual wedding halls, hotels and event venues rank correctly in Arabic. Validate a representative set in Riyadh, Jeddah and Dammam before rollout, including pin selection and reverse geocoding on real Android/iOS devices.

## Price comparison

USD public list rates, before tax, discounts and any Saudi Google reseller terms. Queried Microsoft's Retail Prices API for serviceName Azure Maps and armRegionName Global. Current Maps Base Map Tiles and Location Insights Search meters both return $4.50 per 1,000 transactions after 5,000 free monthly transactions in each meter. Do not use old Standard/S0/S1 rates also returned by that API.

| Operation | Azure Maps | Google Maps |
| --- | --- | --- |
| Geocoding/reverse geocoding | $4.50/1,000 search transactions; 5,000 free shared search transactions | $5/1,000 requests in first paid band; 10,000 free |
| Interactive map display | $4.50/1,000 transactions; each transaction covers 15 tile requests; 5,000 free | Web: $7/1,000 map loads after 10,000 free; native Maps SDK display: unlimited free |
| Autocomplete | Geocode Autocomplete: 10 requests per search transaction; do not apply this rate to POI/fuzzy search blindly | $2.83/1,000 requests in first paid band after 10,000 free; session rules can change billing |

Illustration with ONLY geocoding, no other search use: 10,000 monthly requests costs Azure $22.50 and Google $0; 50,000 costs Azure $202.50 and Google $200; 100,000 costs Azure $427.50 and Google $450. This is not a forecast for Halaa. Tile transactions and map loads are not equivalent units; panning/zooming matters.

## Account status

Updated 2026-09-08: The owner account `salembamehriz@gmail.com` has an active Azure subscription. With explicit approval of the Azure Maps License and Privacy Statement, `halaa-maps` was successfully created in resource group `rg-halaa-maps`, Gen2, North Europe. West Europe validation failed because Azure is not accepting new customers there. Subscription: `3c256e7e-8a2b-4f05-95aa-70493f42fdf3`. The account key is stored in ignored local backend configuration, not source control or a public client variable.

Live checks succeeded: Riyadh Front, Jeddah Hilton, Arabic venue search in Jeddah, and Arabic reverse geocoding. These are spot checks, not proof of exhaustive Saudi venue coverage. Arabic raster tiles and attribution were verified in the browser. See `AZURE_MAPS_MIGRATION.md` for implementation and release status.

## Proposed next step

Proceed with an Azure pilot if the owner accepts that costs are usage-dependent and the native renderer must change. Complete Microsoft onboarding, configure a dedicated Maps resource, and test Saudi venue quality before enabling Azure in production. Keep provider credentials server-side; use supported, restricted client authentication. Implement and test web/mobile/backend together, including stale search responses, coordinate preservation, Arabic/English, missing credentials and provider outages.

## Sources

- [Azure Maps pricing and transaction rules](https://azure.microsoft.com/en-us/pricing/details/azure-maps/)
- [Azure Retail Prices API](https://prices.azure.com/api/retail/prices?currencyCode=USD&$filter=serviceName%20eq%20%27Azure%20Maps%27%20and%20armRegionName%20eq%20%27Global%27)
- [Google Maps core pricing](https://developers.google.com/maps/billing-and-pricing/pricing)
- [Saudi geocoding coverage](https://learn.microsoft.com/en-us/azure/azure-maps/geocoding-coverage)
- [Autocomplete coverage](https://learn.microsoft.com/en-us/azure/azure-maps/autocomplete-coverage)
- [Supported languages](https://learn.microsoft.com/en-us/azure/azure-maps/supported-languages)
- [Azure Maps overview](https://learn.microsoft.com/en-us/azure/azure-maps/about-azure-maps)
- [Direct account setup](https://learn.microsoft.com/en-us/azure/azure-maps/quick-demo-map-app)
