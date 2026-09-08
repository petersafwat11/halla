import { useCallback, useEffect, useRef, useState } from 'react';
import { azureMapsApi } from '@/services/mapsApi';

export function useAzureLocationPicker({ value, onChange, onSelected, language }) {
  const [query, updateQuery] = useState(value?.address || '');
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [focused, setFocused] = useState(-1);
  const valueRef = useRef(value), searchVersion = useRef(0), pickVersion = useRef(0);
  const searchAbort = useRef(null), pickAbort = useRef(null);
  const appliedValue = useRef(value);
  valueRef.current = value;
  const closeSuggestions = useCallback(() => {
    ++searchVersion.current; searchAbort.current?.abort();
    setSuggestions([]); setFocused(-1); setSearching(false);
  }, []);
  useEffect(() => {
    if (value === appliedValue.current) return;
    appliedValue.current = value;
    ++pickVersion.current; pickAbort.current?.abort();
    closeSuggestions(); setBusy(false); updateQuery(value?.address || '');
  }, [value, closeSuggestions]);
  useEffect(() => () => { ++pickVersion.current; searchAbort.current?.abort(); pickAbort.current?.abort(); }, []);
  const apply = useCallback(location => {
    appliedValue.current = location;
    closeSuggestions(); updateQuery(location.address); onChange(location); onSelected(); setFailed(false);
  }, [onChange, onSelected, closeSuggestions]);
  const setQuery = nextQuery => {
    ++pickVersion.current; pickAbort.current?.abort(); setBusy(false);
    // An edited search must not silently save the previously selected venue.
    appliedValue.current = null;
    onChange(null); updateQuery(nextQuery);
  };
  const reverse = useCallback(async coordinate => {
    const version = ++pickVersion.current;
    pickAbort.current?.abort();
    const controller = new AbortController();
    pickAbort.current = controller;
    closeSuggestions(); setBusy(true);
    try {
      const data = await azureMapsApi.reverseGeocode({ ...coordinate, language }, controller.signal);
      if (version === pickVersion.current) apply(data.location);
    } catch {
      if (version === pickVersion.current && !controller.signal.aborted) {
        onChange({ address: '', ...coordinate, city: '', country: '', placeId: null, provider: 'manual' });
        setFailed(true);
      }
    } finally { if (version === pickVersion.current) setBusy(false); }
  }, [language, apply, onChange, closeSuggestions]);
  useEffect(() => {
    const version = ++searchVersion.current, controller = new AbortController();
    searchAbort.current = controller;
    setSuggestions([]); setFocused(-1); setSearching(false);
    if (query.trim().length < 3 || query === value?.address) return;
    const timer = setTimeout(async () => {
      if (controller.signal.aborted || version !== searchVersion.current) return;
      setSearching(true);
      try {
        const data = await azureMapsApi.autocomplete({ q: query.trim(), language,
          latitude: valueRef.current?.latitude, longitude: valueRef.current?.longitude }, controller.signal);
        if (!controller.signal.aborted && version === searchVersion.current) { setSuggestions(data.predictions || []); setFailed(false); }
      } catch {
        if (!controller.signal.aborted && version === searchVersion.current) setFailed(true);
      } finally { if (version === searchVersion.current) setSearching(false); }
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, language, value?.address]);
  const select = item => {
    ++pickVersion.current; pickAbort.current?.abort(); setBusy(false); apply(item.location);
  };
  const manual = () => select({ location: { address: query.trim(), latitude: null, longitude: null,
    city: '', country: '', placeId: null, provider: 'manual' } });
  const locate = () => {
    if (!navigator.geolocation) { setFailed(true); return; }
    const version = ++pickVersion.current;
    setBusy(true);
    navigator.geolocation.getCurrentPosition(point => {
      if (version === pickVersion.current) reverse({ latitude: point.coords.latitude, longitude: point.coords.longitude });
    }, () => { if (version === pickVersion.current) { setFailed(true); setBusy(false); } }, { timeout: 10000 });
  };
  return { query, setQuery, suggestions, searching, busy, failed, focused, setFocused,
    closeSuggestions, reverse, select, manual, locate };
}
