export const AZURE_MAP_RUNTIME = String.raw`
/** Runs inside the map document. All dependencies stay inside this function so
 * browser and native execute the same serializable implementation. */
function startAzureMap(config) {
  let marker, attribution = '', attributionVersion = 0;
  let disposed = false, reportedError = false;
  const requests = new Set(), objectUrls = new Set();

  function emit(type, data = {}) {
    if (disposed) return;
    const message = JSON.stringify({ source: 'halaa-azure-map', type, ...data });
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(message);
    else parent.postMessage(message, config.parentOrigin);
  }
  function reportError(error) {
    if (disposed || error?.name === 'AbortError' || reportedError) return;
    reportedError = true;
    emit(error?.status === 401 ? 'session-expired' : 'error');
  }
  if (!window.L) { reportError(); return; }
  const map = L.map('map', {
    minZoom: 2, maxZoom: 19, zoomControl: false,
    maxBounds: [[-85, -180], [85, 180]], maxBoundsViscosity: 1,
  }).setView([config.latitude, config.longitude], config.hasPin ? 15 : 11);
  L.control.zoom({ zoomInTitle: config.language === 'ar' ? 'تكبير' : 'Zoom in',
    zoomOutTitle: config.language === 'ar' ? 'تصغير' : 'Zoom out' }).addTo(map);
  map.attributionControl.setPrefix('Azure Maps');

  function request(resource, params, controller = new AbortController()) {
    requests.add(controller);
    const timer = setTimeout(() => controller.abort(), 12000);
    return fetch(config.renderUrl + '/' + resource + '?' + new URLSearchParams(params), {
      headers: { Authorization: 'Bearer ' + config.token }, credentials: 'omit', signal: controller.signal,
    }).then(async response => {
      if (!response.ok) {
        const error = new Error('Map unavailable');
        error.status = response.status;
        throw error;
      }
      return resource === 'tile' ? response.blob() : response.json();
    }).catch(error => {
      if (controller.signal.aborted && !controller.cancelled && !disposed) throw new Error('Map request timed out');
      throw error;
    }).finally(() => { clearTimeout(timer); requests.delete(controller); });
  }
  const Tiles = L.GridLayer.extend({
    createTile(coordinates, done) {
      const tile = document.createElement('img'), controller = new AbortController();
      let objectUrl;
      tile.alt = '';
      tile.setAttribute('role', 'presentation');
      function release() {
        if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrls.delete(objectUrl); objectUrl = null; }
      }
      tile.cancel = () => { controller.cancelled = true; controller.abort(); release(); };
      request('tile', { x: coordinates.x, y: coordinates.y, zoom: coordinates.z, language: config.language }, controller)
        .then(blob => {
          if (disposed || controller.cancelled) return;
          objectUrl = URL.createObjectURL(blob);
          objectUrls.add(objectUrl);
          tile.onload = () => { release(); done(null, tile); };
          tile.onerror = () => { release(); reportError(); done(new Error('Tile unavailable'), tile); };
          tile.src = objectUrl;
        }).catch(error => {
          if (disposed || controller.cancelled) return;
          reportError(error);
          done(error, tile);
        });
      return tile;
    },
  });
  const tiles = new Tiles({ tileSize: 256, noWrap: true, updateWhenIdle: true, keepBuffer: 1 });
  tiles.on('tileunload', event => event.tile.cancel?.());

  async function updateAttribution() {
    const version = ++attributionVersion, bounds = map.getBounds();
    const viewport = [Math.max(-180, bounds.getWest()), Math.max(-85, bounds.getSouth()),
      Math.min(180, bounds.getEast()), Math.min(85, bounds.getNorth())];
    try {
      const data = await request('attribution', { zoom: map.getZoom(), bounds: viewport.join(',') });
      if (disposed || version !== attributionVersion) return;
      // Provider markup is not inserted into the page; keep its visible text.
      const text = data.copyrights.map(html => new DOMParser().parseFromString(html, 'text/html').body.textContent || '').join(' | ');
      if (!text.trim()) throw new Error('Missing attribution');
      const safe = document.createElement('span');
      safe.textContent = text;
      if (attribution) map.attributionControl.removeAttribution(attribution);
      attribution = safe.innerHTML;
      map.attributionControl.addAttribution(attribution);
      if (!map.hasLayer(tiles)) tiles.addTo(map);
    } catch (error) {
      if (disposed || version !== attributionVersion) return;
      map.removeLayer(tiles);
      reportError(error);
    }
  }
  function validPoint(latitude, longitude) {
    return Number.isFinite(latitude) && Number.isFinite(longitude)
      && Math.abs(latitude) <= 85 && Math.abs(longitude) <= 180;
  }
  function pin(latitude, longitude, pan) {
    if (!validPoint(latitude, longitude)) return;
    const previous = marker?.getLatLng();
    const changed = !previous || Math.abs(previous.lat - latitude) > 1e-8 || Math.abs(previous.lng - longitude) > 1e-8;
    const point = [latitude, longitude];
    if (!marker) {
      marker = L.marker(point, {
        draggable: true, title: config.language === 'ar' ? 'موقع الفعالية' : 'Event location',
        icon: L.divIcon({ className: 'pin', iconSize: [20, 20], iconAnchor: [10, 10] }),
      }).addTo(map);
      marker.on('dragend', () => {
        const point = marker.getLatLng();
        if (validPoint(point.lat, point.lng)) emit('pick', { latitude: point.lat, longitude: point.lng });
      });
    } else marker.setLatLng(point);
    // Reverse-geocoding echoes the same point: preserve the user's zoom.
    if (pan && changed) map.setView(point, 15);
  }
  map.on('click', event => {
    const point = event.latlng;
    if (!validPoint(point.lat, point.lng)) return;
    pin(point.lat, point.lng, false);
    emit('pick', { latitude: point.lat, longitude: point.lng });
  });
  function receive(event) {
    if (!window.ReactNativeWebView && (event.source !== parent || event.origin !== config.parentOrigin)) return;
    try {
      const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      if (data?.source !== 'halaa-azure-host') return;
      if (data.type === 'position') {
        if (data.latitude == null || data.longitude == null) {
          if (marker) { map.removeLayer(marker); marker = null; }
        } else pin(data.latitude, data.longitude, true);
      }
      if (data.type === 'token' && typeof data.token === 'string') {
        config.token = data.token;
        reportedError = false;
        updateAttribution();
        tiles.redraw();
      }
    } catch { /* Ignore unrelated or malformed host messages. */ }
  }
  function dispose() {
    disposed = true;
    requests.forEach(controller => { controller.cancelled = true; controller.abort(); });
    objectUrls.forEach(url => URL.revokeObjectURL(url));
    window.removeEventListener('message', receive);
    document.removeEventListener('message', receive);
    map.remove();
  }
  window.addEventListener('message', receive);
  document.addEventListener('message', receive);
  window.addEventListener('pagehide', dispose, { once: true });
  map.on('moveend', updateAttribution);
  if (config.hasPin) pin(config.latitude, config.longitude, false);
  updateAttribution();
  emit('ready');
}
`;
