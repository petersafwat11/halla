import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTaqnyatPreviewContext, resolveTaqnyatPlaceholders } from '../src/utils/resolveTaqnyatPlaceholders.js';

test('invitation preview resolves the weekday from the selected Riyadh calendar date', () => {
  const context = buildTaqnyatPreviewContext({eventDate:'2026-09-12T21:00:00.000Z',locale:'en'});
  assert.equal(resolveTaqnyatPlaceholders('{{1}}', [{placeholder:'{{1}}',sourceKey:'eventDetails.dayFormatted'}], context), 'Sunday');
});

test('message locale controls date and time independently of a preformatted UI date', () => {
  const context = buildTaqnyatPreviewContext({ eventDate: '2026-09-14T21:00:00.000Z',
    eventTime: '12:00:PM', dateFormatted: 'September 15, 2026', locale: 'ar' });
  assert.equal(context.eventDetails.dateFormatted, '15 سبتمبر 2026');
  assert.equal(context.eventDetails.dayFormatted, 'الثلاثاء');
  assert.equal(context.eventDetails.time, '12:00 م');
});
