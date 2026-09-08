import test from 'node:test';
import assert from 'node:assert/strict';
import { validateStepData } from '../hooks/events/useEventForm.js';

test('business creation requires cover and logo while existing event edits remain available', () => {
  const form = { isBusinessEvent: true, eventType: 'conference', eventName: 'Event', eventDate: '2026-10-20', eventTime: '06:30:PM', address: { address: 'Riyadh' } };
  assert.equal(Boolean(validateStepData(1, form)), false);
  assert.equal(Boolean(validateStepData(1, { ...form, coverImage: { uri: 'file:///cover.jpg' } })), true);
  assert.equal(Boolean(validateStepData(1, { ...form, coverImage: {}, businessLogoMissing: true })), false);
  assert.equal(Boolean(validateStepData(1, { ...form, isExistingEvent: true })), true);
});
