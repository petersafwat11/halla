import { useCallback, useEffect, useRef, useState } from 'react';
import { azureMapDocument } from '@halaa/shared/utils/azureMapDocument';
import { createMapSessionManager } from '@halaa/shared/utils/mapSession';
import { azureMapsApi } from '@/services/mapsApi';

export function useAzureMapFrame({ value, language, onPick }) {
  const frame = useRef(null), sessionManager = useRef(null), latest = useRef({ value, onPick });
  latest.current = { value, onPick };
  const [html, setHtml] = useState('');
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  const send = useCallback(data => frame.current?.contentWindow?.postMessage(
    JSON.stringify({ source: 'halaa-azure-host', ...data }), window.location.origin), []);
  const position = useCallback(() => send({ type: 'position',
    latitude: latest.current.value?.latitude ?? null, longitude: latest.current.value?.longitude ?? null,
  }), [send]);
  useEffect(position, [position, value?.latitude, value?.longitude]);
  useEffect(() => {
    let first = true;
    const manager = createMapSessionManager({
      requestSession: azureMapsApi.createSession,
      onSession: session => {
        if (first) {
          setHtml(azureMapDocument({ renderUrl: azureMapsApi.renderUrl(), token: session.token,
            parentOrigin: window.location.origin, language,
            latitude: latest.current.value?.latitude, longitude: latest.current.value?.longitude }));
          first = false;
        } else send({ type: 'token', token: session.token });
      },
      onError: () => setFailed(true),
    });
    sessionManager.current = manager;
    const foreground = () => { if (document.visibilityState === 'visible') manager.refresh(); };
    document.addEventListener('visibilitychange', foreground);
    manager.refresh();
    return () => { manager.dispose(); document.removeEventListener('visibilitychange', foreground); };
  }, [language, revision, send]);
  useEffect(() => {
    const receive = event => {
      if (event.source !== frame.current?.contentWindow || event.origin !== window.location.origin) return;
      try {
        const data = JSON.parse(event.data);
        if (data.source !== 'halaa-azure-map') return;
        if (data.type === 'ready') position();
        if (data.type === 'error') setFailed(true);
        if (data.type === 'session-expired') sessionManager.current?.refresh(true);
        if (data.type === 'pick' && Number.isFinite(data.latitude) && Math.abs(data.latitude) <= 90
          && Number.isFinite(data.longitude) && Math.abs(data.longitude) <= 180) {
          latest.current.onPick({ latitude: data.latitude, longitude: data.longitude });
        }
      } catch { /* Ignore unrelated messages. */ }
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [position]);
  const retry = () => { setFailed(false); setHtml(''); setRevision(value => value + 1); };
  return { frame, html, failed, retry, revision };
}
