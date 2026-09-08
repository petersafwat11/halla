import { AZURE_MAP_RUNTIME } from './azureMapRuntime.js';

/** Same isolated map document for browser and native. Only the limited render
 * ticket is embedded; never a Halaa login token or Azure subscription key. */
export function azureMapDocument({ renderUrl, token, parentOrigin, language = 'ar', latitude, longitude }) {
  const config = JSON.stringify({
    renderUrl, token, parentOrigin: parentOrigin || new URL(renderUrl).origin,
    language: language === 'en' ? 'en' : 'ar',
    latitude: Number.isFinite(latitude) ? latitude : 24.7136,
    longitude: Number.isFinite(longitude) ? longitude : 46.6753,
    hasPin: Number.isFinite(latitude) && Number.isFinite(longitude),
  }).replace(/</g, '\\u003c');
  return `<!doctype html>
<html><head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="referrer" content="no-referrer">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="anonymous">
<style>
html,body,#map{height:100%;width:100%;margin:0}body{background:#f4f0e9}
.pin{background:#b6804d;border:3px solid white;border-radius:50%;box-shadow:0 1px 6px #555}
.leaflet-control-attribution{font:11px sans-serif;max-width:90vw}
</style></head><body><div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin="anonymous"></script>
<script>(${AZURE_MAP_RUNTIME})(${config});</script>
</body></html>`;
}
