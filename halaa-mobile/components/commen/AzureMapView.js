import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { WebView } from 'react-native-webview';
import { azureMapDocument } from '@halaa/shared/utils/azureMapDocument';
import { createMapSessionManager } from '@halaa/shared/utils/mapSession';
import { API_PATHS } from '@halaa/shared/api/paths';
import { API_BASE_URL } from '../../config/api';
import mapsApi from '../../services/mapsApi';

export default forwardRef(function AzureMapView({ coordinate, language, onPick, onError, style }, ref) {
  const view = useRef(null), latest = useRef({ coordinate, onPick, onError });
  latest.current = { coordinate, onPick, onError };
  const [html, setHtml] = useState('');
  const managerRef = useRef(null);
  const source = useMemo(() => ({ html, baseUrl: API_BASE_URL }), [html]);
  const send = data => view.current?.postMessage(JSON.stringify({ source: 'halaa-azure-host', ...data }));
  useImperativeHandle(ref, () => ({ animateToRegion: point => send({ type: 'position', latitude: point.latitude, longitude: point.longitude }) }), []);
  useEffect(() => { send({ type: 'position', latitude: coordinate?.latitude ?? null, longitude: coordinate?.longitude ?? null }); }, [coordinate?.latitude, coordinate?.longitude]);
  useEffect(() => {
    let first = true;
    const manager = createMapSessionManager({
      requestSession: mapsApi.createMapSession,
      onSession: session => {
        if (first) {
          setHtml(azureMapDocument({ renderUrl: `${API_BASE_URL}${API_PATHS.locations.azureRender}`, token: session.token, language,
            latitude: latest.current.coordinate?.latitude, longitude: latest.current.coordinate?.longitude }));
          first = false;
        } else send({ type: 'token', token: session.token });
      },
      onError: () => latest.current.onError?.(),
    });
    managerRef.current = manager;
    const listener = AppState.addEventListener('change', state => { if (state === 'active') manager.refresh(); });
    manager.refresh();
    return () => { manager.dispose(); listener.remove(); };
  }, [language]);
  if (!html) return null;
  return <WebView ref={view} source={source} style={style}
    javaScriptEnabled originWhitelist={['*']} mixedContentMode="never" setSupportMultipleWindows={false}
    onShouldStartLoadWithRequest={request => request.url === 'about:blank' || request.url === API_BASE_URL || request.url === `${API_BASE_URL}/`}
    onError={() => latest.current.onError?.()}
    onMessage={event => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.source !== 'halaa-azure-map') return;
        if (data.type === 'ready') send({ type: 'position', latitude: latest.current.coordinate?.latitude ?? null, longitude: latest.current.coordinate?.longitude ?? null });
        if (data.type === 'error') latest.current.onError?.();
        if (data.type === 'session-expired') managerRef.current?.refresh(true);
        if (data.type === 'pick' && Number.isFinite(data.latitude) && Number.isFinite(data.longitude) && Math.abs(data.latitude) <= 90 && Math.abs(data.longitude) <= 180) latest.current.onPick({ latitude: data.latitude, longitude: data.longitude });
      } catch { /* Ignore malformed bridge messages. */ }
    }} />;
});
