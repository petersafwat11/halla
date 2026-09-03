const { test } = require('node:test');
const assert = require('node:assert/strict');

const { formatRiyadh } = require('../src/shared/utils/timezone');
const { formatDate: formatMessageDate, formatDay } = require('../src/modules/messaging/messaging.formatting');
const { formatDate: formatRsvpDate } = require('../src/shared/utils/rsvpMessages');

test('formatRiyadh: defaults to Gregorian calendar (F-04) and Latin digits (F-15)', () => {
  const d = new Date('2026-05-25T17:00:00.000Z'); // 20:00 Riyadh time

  const arDate = formatRiyadh(d, { style: 'date' });
  assert.ok(arDate.includes('25'), `Arabic date must contain Latin day 25: ${arDate}`);
  assert.ok(arDate.includes('مايو'), `Arabic date must contain Gregorian month مايو: ${arDate}`);
  assert.ok(arDate.includes('2026'), `Arabic date must contain Latin year 2026: ${arDate}`);
  assert.ok(!arDate.includes('صفر') && !arDate.includes('شوال') && !arDate.includes('محرم'), 'Must not use Islamic calendar');

  const enDate = formatRiyadh(d, { style: 'date', locale: 'en-US' });
  assert.ok(enDate.includes('25'), `English date must contain day 25: ${enDate}`);
  assert.ok(enDate.includes('May'), `English date must contain month May: ${enDate}`);
  assert.ok(enDate.includes('2026'), `English date must contain year 2026: ${enDate}`);
});

test('messaging.formatting: formatDate and formatDay use explicit Gregorian and Latin numerals', () => {
  const dateStr = '2026-08-31T15:00:00.000Z'; // 18:00 Riyadh

  const arFormatted = formatMessageDate(dateStr, 'ar');
  assert.ok(arFormatted.includes('31'), `Must contain Latin 31: ${arFormatted}`);
  assert.ok(arFormatted.includes('أغسطس'), `Must contain Gregorian أغسطس: ${arFormatted}`);
  assert.ok(arFormatted.includes('2026'), `Must contain Latin 2026: ${arFormatted}`);

  const enFormatted = formatMessageDate(dateStr, 'en');
  assert.ok(enFormatted.includes('31'), `Must contain 31: ${enFormatted}`);
  assert.ok(enFormatted.includes('August'), `Must contain August: ${enFormatted}`);
  assert.ok(enFormatted.includes('2026'), `Must contain 2026: ${enFormatted}`);

  const arDay = formatDay(dateStr, 'ar');
  assert.ok(arDay.length > 0, 'Weekday name formatted in Arabic');
});

test('rsvpMessages: formatDate uses explicit Gregorian and Latin numerals', () => {
  const dateStr = '2026-08-30T10:00:00.000Z';

  const arFormatted = formatRsvpDate(dateStr, 'ar');
  assert.ok(arFormatted.includes('30'), `Must contain Latin 30: ${arFormatted}`);
  assert.ok(arFormatted.includes('أغسطس'), `Must contain Gregorian أغسطس: ${arFormatted}`);
  assert.ok(arFormatted.includes('2026'), `Must contain Latin 2026: ${arFormatted}`);

  const enFormatted = formatRsvpDate(dateStr, 'en');
  assert.ok(enFormatted.includes('30'), `Must contain 30: ${enFormatted}`);
  assert.ok(enFormatted.includes('August'), `Must contain August: ${enFormatted}`);
  assert.ok(enFormatted.includes('2026'), `Must contain 2026: ${enFormatted}`);
});
