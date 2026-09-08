# Azure Maps migration — 2026-09-08

## Status

Azure Maps account `halaa-maps` is live (Gen2, North Europe) under the owner's active subscription. The backend adapter, web picker and native picker integration are implemented locally. Production has not been deployed and signed native builds have not been installed or tested on devices.

## Implementation

- Authenticated `/locations/azure/autocomplete` returns Saudi suggestions with full event-location objects; selecting a suggestion does not require another paid place-details request.
- Authenticated `/locations/azure/reverse-geocode` preserves the exact requested pin. Provider outages remain explicit; manual entry is available.
- Authenticated POST `/locations/azure/session` returns a 30-minute Halaa rendering ticket signed with a separate derived key. A rendering ticket cannot authenticate as a Halaa login token.
- `/locations/azure/render/:resource` verifies the rendering ticket, limits requests per user, validates coordinates, and forwards only road tiles or attribution to a fixed Azure host. It does not accept upstream URLs, caller-supplied API keys, arbitrary tilesets or operations. The account key stays on the backend.
- The web iframe and mobile WebView share a Leaflet 1.9.4 renderer with integrity-pinned assets, using Azure raster API `2024-04-01`. This avoids the retired Azure native SDKs. Attribution is obtained for the current viewport and updated after movement/zoom. Tiles remain hidden if attribution cannot be obtained.
- Search results and reverse lookup responses are guarded against late responses overwriting newer selections. Existing location objects and old Google endpoints remain compatible.
- Existing external navigation links (Google Maps/Uber) still open by coordinates and do not call paid Google APIs.

## Configuration and rollout order

1. Deploy the backend additions and set `AZURE_MAPS_SERVER_API_KEY` in its secret configuration; set `MAPS_PROVIDER=azure` so readiness requires the correct key. Keep any legacy Google key needed by older app builds.
2. Build the website with `NEXT_PUBLIC_MAPS_PROVIDER=azure`. Docker/Compose accept that build argument; CI reads the repository variable `NEXT_PUBLIC_MAPS_PROVIDER`. Its default remains `google` to avoid switching an unconfigured deployment. No public Azure key is required.
3. Build native apps with `EXPO_PUBLIC_MAPS_PROVIDER=azure`. `eas build --profile azure-preview` prepares an internal preview against the existing API URL; deploy the backend first or override `EXPO_PUBLIC_API_URL` for staging. `react-native-webview@13.15.0` was added using Expo SDK 54's installer. This requires a new native build; do not ship the dependency solely via an OTA update to old binaries.
4. On Android and iOS devices, check venue search, pin dragging, geolocation permissions, modal cancel/confirm, editing an existing event, manual fallback, slow/offline networks, token renewal and RTL. Exercise the real event-save flow before releasing.
5. Enable the same flag in the production EAS build environment after device checks. Existing installed apps do not change until upgraded.

Ignored local configuration already selects Azure for backend, web and mobile. No real key is included in this document. The resource can be managed in Azure Portal under Azure Maps Accounts → halaa-maps.

Rollback: rebuild affected clients with the provider flags set to `google` and retain the Google configuration; saved coordinates and addresses do not require data migration.

## Verification

The subsequent refactor and complete test results are recorded in [AZURE_MAPS_REVIEW.md](./AZURE_MAPS_REVIEW.md), including the seeded-host browser create/edit/persistence checks. The initial migration checks below are retained for context.

- Eleven map-focused backend tests passed across Azure search/reverse lookup, rendering-ticket isolation and tampering, proxy path/coordinate validation, shared/create/update/persisted event-location validation, manual addresses without coordinates, and legacy Google adapter behavior. Six existing event-validation tests also passed.
- Live Azure fuzzy searches returned Riyadh Front, Jeddah Hilton and قصر المؤتمرات جدة with Arabic addresses. Arabic reverse lookup returned a street address and preserved input coordinates.
- Live road tiles and dynamic OSM/TomTom attribution rendered in the local browser. Pin placement and zoom were checked.
- Next production build passed. Existing unrelated lint warnings remain. Targeted JSX lint was run explicitly because the repository's default file matching omits JSX.
- Expo Android and iOS JavaScript/Hermes exports passed; these are not native binary/device tests.
- Existing mobile map/wizard regression checks passed (three tests).

Local visual check: from `halaa-backend`, run `node scripts/preview-azure-maps.mjs` and open `http://127.0.0.1:4187`. It listens on loopback only and uses the real configured Azure resource. Add `?language=en` to check English labels. Do not deploy this developer preview server.

## Operating considerations

Azure removes the quoted reseller's mandatory $350/month support fee; usage still has separate search and tile meters. No spending cap or budget alert was configured. Render proxying consumes Halaa backend bandwidth and requests. The 300 requests/minute/user limit is an abuse control, not a monthly billing cap. CDN availability is required to load Leaflet. Spot checks do not establish complete venue coverage.

Sources: [Azure raster tiles](https://learn.microsoft.com/en-us/rest/api/maps/render/get-map-tile?view=rest-maps-2026-01-01), [attribution](https://learn.microsoft.com/en-us/azure/azure-maps/how-to-show-attribution), [Leaflet distribution and integrity hashes](https://leafletjs.com/download.html).
