import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateEventStep } from '../../hooks/events/eventFormValidation.js';
import { publicNamespacesForPath } from '../../localization/publicNamespaces.js';

test('business creation requires a logo, not a separate cover', () => {
  const form = { isBusinessEvent: true, eventType: 'conference', eventName: 'Event', eventDate: '2026-10-20', eventTime: '06:30:PM', address: { address: 'Riyadh' } };
  assert.equal(validateEventStep(1, form), true);
  assert.equal(validateEventStep(1, { ...form, businessLogoMissing: true }), false);
  assert.equal(validateEventStep(1, { ...form, isExistingEvent: true }), true);
  assert.equal(validateEventStep(1, { ...form, isBusinessEvent: false }), true);
});

test('business guest dictionaries are loaded independently and have matching translations', () => {
  for (const lang of ['ar', 'en']) assert.deepEqual(publicNamespacesForPath(`/${lang}/business-invitation/token`), ['common', 'businessGuestHub']);
  const keys = obj => Object.entries(obj).flatMap(([key, value]) => typeof value === 'object' ? keys(value).map(child => `${key}.${child}`) : [key]).filter(key => !/_(zero|one|two|few|many|other)$/.test(key)).sort();
  for (const namespace of ['businessGuestHub', 'createEvent']) {
    const read = lang => JSON.parse(fs.readFileSync(new URL(`../../localization/locales/${lang}/${namespace}.json`, import.meta.url), 'utf8'));
    const en = namespace === 'createEvent' ? read('en').businessBranding : read('en');
    const ar = namespace === 'createEvent' ? read('ar').businessBranding : read('ar');
    assert.deepEqual(keys(en), keys(ar));
    assert.ok(Object.values(en).every(value => value));
    assert.ok(Object.values(ar).every(value => value));
  }
});
