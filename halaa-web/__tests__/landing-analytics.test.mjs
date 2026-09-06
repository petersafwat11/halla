import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { transform } from 'sucrase';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import * as properties from '../ui/landing/analyticsProperties.js';

test('analytics requires consent, records safe clicks, and stops after withdrawal/unmount', async () => {
  const dom = new JSDOM('<div id="root"></div><section id="pricing"><a href="/en/signup">Sign up</a></section>', { url: 'https://halaa.com.sa/en?token=secret' });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.location = dom.window.location;
  globalThis.localStorage = dom.window.localStorage;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let scriptLoads = 0;
  function ScriptMock({ onReady }) {
    React.useEffect(() => { scriptLoads++; onReady(); }, []);
    return null;
  }
  const require = createRequire(import.meta.url);
  const source = fs.readFileSync(new URL('../ui/landing/LandingAnalytics.jsx', import.meta.url), 'utf8');
  const code = transform(source, { transforms: ['jsx', 'imports'], jsxRuntime: 'automatic', production: true }).code;
  const module = { exports: {} };
  const mockedRequire = (specifier) => {
    if (specifier === 'next/script') return ScriptMock;
    if (specifier.endsWith('.css')) return {};
    if (specifier === './analyticsProperties') return properties;
    return require(specifier);
  };
  new Function('require', 'module', 'exports', 'process', code)(mockedRequire, module, module.exports, { env: { NODE_ENV: 'production', NEXT_PUBLIC_GA4_MEASUREMENT_ID: 'G-TEST123' } });
  const Component = module.exports.default;
  const root = createRoot(document.getElementById('root'));
  const click = async (text) => {
    const button = [...document.querySelectorAll('button')].find(node => node.textContent === text);
    assert.ok(button, `Missing button: ${text}`);
    await act(async () => button.click());
  };
  try {
    await act(async () => root.render(React.createElement(Component, { lang: 'en' })));
    assert.equal(scriptLoads, 0);
    await click('No thanks');
    assert.equal(scriptLoads, 0);
    await click('Analytics preferences');
    await click('Allow analytics');
    assert.equal(scriptLoads, 1);
    const events = () => window.dataLayer.map(args => [...args]).filter(args => args[0] === 'event');
    assert.equal(events().filter(args => args[1] === 'page_view').length, 1);
    assert.equal(JSON.stringify(events()).includes('secret'), false);
    const anchor = document.querySelector('section a');
    anchor.addEventListener('click', event => event.preventDefault());
    anchor.click();
    assert.equal(events().at(-1)[1], 'signup_cta_click');
    assert.equal(events().at(-1)[2].placement, 'pricing');
    await click('Analytics preferences');
    await click('No thanks');
    const count = events().length;
    anchor.click();
    assert.equal(events().length, count);
    assert.equal(window['ga-disable-G-TEST123'], true);
    await act(async () => root.unmount());
    assert.equal(window['ga-disable-G-TEST123'], true);
  } finally {
    dom.window.close();
    delete globalThis.window;
    delete globalThis.document;
    delete globalThis.location;
    delete globalThis.localStorage;
  }
});
