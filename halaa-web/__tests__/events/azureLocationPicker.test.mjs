import test from 'node:test';
import assert from 'node:assert/strict';
import React, { useState } from 'react';
import { setupDom } from '../helpers/domSetup.mjs';
import { azureMapsApi } from '../../services/mapsApi.js';
import { useAzureLocationPicker } from '../../hooks/useAzureLocationPicker.js';

const original = { ...azureMapsApi };
let dom, renderHook, act, cleanup;
test.before(async () => {
  dom = setupDom();
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  ({ renderHook, act, cleanup } = await import('@testing-library/react'));
});
test.afterEach(() => { cleanup(); Object.assign(azureMapsApi, original); });
test.after(() => dom.window.close());
const venue = { address: 'Selected venue', latitude: 21.6, longitude: 39.1, provider: 'azure' };
function usePicker() {
  const [value, onChange] = useState(venue);
  const picker = useAzureLocationPicker({ value, onChange, onSelected: () => {}, language: 'en' });
  return { ...picker, value, reset: onChange };
}

test('editing search clears the saved venue; confirming manual text drops stale coordinates', () => {
  const { result } = renderHook(usePicker);
  act(() => result.current.setQuery('Private venue'));
  assert.equal(result.current.value, null);
  assert.equal(result.current.query, 'Private venue');
  act(() => result.current.manual());
  assert.equal(result.current.value.address, 'Private venue');
  assert.equal(result.current.value.latitude, null);
  assert.equal(result.current.value.longitude, null);
  assert.equal(result.current.value.provider, 'manual');
});

test('late reverse lookup cannot overwrite a newer search or external form reset', async () => {
  let resolve;
  azureMapsApi.reverseGeocode = () => new Promise(done => { resolve = done; });
  const { result } = renderHook(usePicker);
  let pending;
  act(() => { pending = result.current.reverse({ latitude: 22, longitude: 40 }); });
  act(() => result.current.setQuery('Another venue'));
  await act(async () => { resolve({ location: { ...venue, address: 'Stale reverse result' } }); await pending; });
  assert.equal(result.current.query, 'Another venue');
  assert.equal(result.current.value, null);
  act(() => { pending = result.current.reverse({ latitude: 23, longitude: 41 }); });
  act(() => result.current.reset({ ...venue, address: 'Loaded event' }));
  await act(async () => { resolve({ location: venue }); await pending; });
  assert.equal(result.current.query, 'Loaded event');
  assert.equal(result.current.busy, false);
});

test('closing autocomplete during debounce never starts a hidden request or spinner', async () => {
  let calls = 0;
  azureMapsApi.autocomplete = async () => { calls++; return { predictions: [] }; };
  const { result } = renderHook(usePicker);
  act(() => result.current.setQuery('Jeddah'));
  act(() => result.current.closeSuggestions());
  await act(async () => { await new Promise(done => setTimeout(done, 400)); });
  assert.equal(calls, 0);
  assert.equal(result.current.searching, false);
});
