import test from 'node:test';
import assert from 'node:assert/strict';
import { waitForTemplateImage } from '../../app/[lang]/host/create-event/_components/templateForm/useTemplateBake.js';

test('a previously failed image rejects immediately instead of hanging Save forever', async () => {
  await assert.rejects(waitForTemplateImage({ complete: true, naturalWidth: 0 }), /image-load-failed/);
  await waitForTemplateImage({ complete: true, naturalWidth: 200 });
});

test('pending image load settles and releases listeners on error', async () => {
  const listeners = new Map();
  const pending = waitForTemplateImage({ complete: false,
    addEventListener: (name, callback) => listeners.set(name, callback),
    removeEventListener: name => listeners.delete(name),
  });
  listeners.get('error')();
  await assert.rejects(pending, /image-load-failed/);
  assert.equal(listeners.size, 0);
});
