import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { transform } from 'sucrase';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

test('reviews stay hidden by default; malformed/empty translations and rerenders are hook-safe', async () => {
  const dom = new JSDOM('<div id="root"></div>');
  const previous = {};
  const globals = { window: dom.window, document: dom.window.document,
    getComputedStyle: dom.window.getComputedStyle.bind(dom.window), IS_REACT_ACT_ENVIRONMENT: true };
  for (const [key, value] of Object.entries(globals)) { previous[key] = Object.getOwnPropertyDescriptor(globalThis, key); globalThis[key] = value; }
  const require = createRequire(import.meta.url);
  const compile = (path, resolver) => {
    const source = fs.readFileSync(new URL(path, import.meta.url), 'utf8');
    const code = transform(source, { transforms: ['jsx', 'imports'], jsxRuntime: 'automatic', production: true }).code;
    const module = { exports: {} };
    new Function('require', 'module', 'exports', code)(resolver, module, module.exports);
    return module.exports.default;
  };
  const carousel = compile('../ui/landing/_shared/useCarouselSnap.js', require);
  let items;
  const Component = compile('../ui/landing/TestimonialsSection.jsx', (specifier) => {
    if (specifier.endsWith('.css')) return {};
    if (specifier === 'react-i18next') return { useTranslation: () => ({ t: (key) => key === 'testimonials.items' ? items : key }) };
    if (specifier === './_shared/useCarouselSnap') return carousel;
    if (specifier === './_shared/CarouselDots') return () => null;
    return require(specifier);
  });
  const root = createRoot(document.getElementById('root'));
  const render = async (value, enabled) => { items = value; await act(async () => root.render(React.createElement(Component, { enabled }))); };
  const review = { name: 'Test fixture', text: 'Approved feedback fixture' };
  try {
    await render([review]);
    assert.equal(document.getElementById('root').innerHTML, '');
    for (const value of [undefined, null, 'testimonials.items', {}, [], [null, {}, { name: 2, text: 3 }]]) {
      await render(value, true);
      assert.equal(document.getElementById('root').innerHTML, '');
    }
    await render([review], true);
    assert.ok(document.getElementById('reviews'));
    assert.doesNotMatch(document.getElementById('reviews').textContent, /★/);
    await render([], true);
    assert.equal(document.getElementById('root').innerHTML, '');
    await render([{ ...review, rating: 4 }], true);
    assert.match(document.getElementById('reviews').textContent, /★★★★/);
    await render([review], false);
    assert.equal(document.getElementById('root').innerHTML, '');
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
    for (const key of Object.keys(globals)) {
      if (previous[key]) Object.defineProperty(globalThis, key, previous[key]); else delete globalThis[key];
    }
  }
});
