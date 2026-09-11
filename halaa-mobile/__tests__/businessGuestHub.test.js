import test from 'node:test';
import assert from 'node:assert/strict';
import { validateStepData } from '../hooks/events/useEventForm.js';

test('business creation requires a logo while existing event edits remain available', () => {
  const form = { isBusinessEvent: true, eventType: 'conference', eventName: 'Event', eventDate: '2026-10-20', eventTime: '06:30:PM', address: { address: 'Riyadh' } };
  assert.equal(Boolean(validateStepData(1, form)), true);
  assert.equal(Boolean(validateStepData(1, { ...form, businessLogoMissing: true })), false);
  assert.equal(Boolean(validateStepData(1, { ...form, isExistingEvent: true })), true);
});
