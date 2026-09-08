import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeForSearch,
  normalizeReference,
  normalizeReferenceKey,
  parseExplicitOffsetDate,
  validateCsvRow,
} from '../src/index.js';

test('normalizeForSearch: normalizes Arabic, English, whitespace without mutating original', () => {
  const originalArabic = '   أَحْمَدُ   حَسَنٌ   ';
  const normalizedArabic = normalizeForSearch(originalArabic);

  assert.equal(normalizedArabic, 'احمد حسن');
  assert.equal(originalArabic, '   أَحْمَدُ   حَسَنٌ   ', 'Original text must remain unchanged');

  // Tatweel removal
  assert.equal(normalizeForSearch('مـــحـــمـــد'), 'محمد');

  // Alef variants
  assert.equal(normalizeForSearch('إبراهيم'), 'ابراهيم');
  assert.equal(normalizeForSearch('آمنة'), 'امنه');
  assert.equal(normalizeForSearch('أحمد'), 'احمد');

  // Alef maksura and Taa marbuta
  assert.equal(normalizeForSearch('منى'), 'مني');
  assert.equal(normalizeForSearch('سارة'), 'ساره');

  // English case folding and whitespace collapsing
  assert.equal(normalizeForSearch('  Dr.  Ahmed   SMITH  '), 'dr. ahmed smith');
});

test('normalizeReference: trims and handles empty/null references', () => {
  assert.equal(normalizeReference('  INV-001  '), 'INV-001');
  assert.equal(normalizeReference(''), undefined);
  assert.equal(normalizeReference('   '), undefined);
  assert.equal(normalizeReference(null), undefined);
  assert.equal(normalizeReference(undefined), undefined);
});

test('normalizeReferenceKey: produces uppercase normalized key or undefined', () => {
  assert.equal(normalizeReferenceKey('  inv-001-a  '), 'INV-001-A');
  assert.equal(normalizeReferenceKey('  '), undefined);
  assert.equal(normalizeReferenceKey(null), undefined);
});

test('parseExplicitOffsetDate: parses ISO strings with offset and rejects naive strings', () => {
  const validWithOffset = parseExplicitOffsetDate('2026-09-08T20:00:00+03:00');
  assert.ok(validWithOffset instanceof Date);
  assert.ok(!Number.isNaN(validWithOffset.getTime()));

  const validWithZ = parseExplicitOffsetDate('2026-09-08T17:00:00Z');
  assert.ok(validWithZ instanceof Date);
  assert.equal(validWithOffset.toISOString(), validWithZ.toISOString());

  // Naive date string throws
  assert.throws(() => {
    parseExplicitOffsetDate('2026-09-08T20:00:00');
  }, /explicit timezone offset/);
});

test('validateCsvRow: parses valid CSV rows and flags specific validation errors', () => {
  // Valid row
  const validRow = {
    name: 'أحمد حسن',
    allowedCompanions: '2',
    companionNames: 'سارة حسن|عمر حسن',
    reference: 'INV-001',
  };
  const validResult = validateCsvRow(validRow, 1);
  assert.equal(validResult.valid, true);
  assert.equal(validResult.data.name, 'أحمد حسن');
  assert.equal(validResult.data.allowedCompanions, 2);
  assert.deepEqual(validResult.data.companionNames, ['سارة حسن', 'عمر حسن']);
  assert.equal(validResult.data.reference, 'INV-001');
  assert.equal(validResult.data.referenceKey, 'INV-001');
  assert.equal(validResult.data.nameSearch, 'احمد حسن');

  // Blank companionNames cell becomes empty array
  const blankCompanionsRow = {
    name: 'نورة عبدالله',
    allowedCompanions: '0',
    companionNames: '',
    reference: '',
  };
  const blankResult = validateCsvRow(blankCompanionsRow, 2);
  assert.equal(blankResult.valid, true);
  assert.equal(blankResult.data.allowedCompanions, 0);
  assert.deepEqual(blankResult.data.companionNames, []);
  assert.equal(blankResult.data.reference, undefined);
  assert.equal(blankResult.data.referenceKey, undefined);

  // Invalid: missing allowedCompanions
  const missingAllowed = validateCsvRow({ name: 'Guest', allowedCompanions: '' }, 3);
  assert.equal(missingAllowed.valid, false);
  assert.ok(missingAllowed.errors.some((e) => e.includes('allowedCompanions is required')));

  // Invalid: negative allowedCompanions
  const negativeAllowed = validateCsvRow({ name: 'Guest', allowedCompanions: '-1' }, 4);
  assert.equal(negativeAllowed.valid, false);

  // Invalid: fractional allowedCompanions
  const fractionalAllowed = validateCsvRow({ name: 'Guest', allowedCompanions: '1.5' }, 5);
  assert.equal(fractionalAllowed.valid, false);

  // Invalid: excess companion names
  const excessCompanions = validateCsvRow(
    { name: 'Guest', allowedCompanions: '1', companionNames: 'Comp 1|Comp 2' },
    6
  );
  assert.equal(excessCompanions.valid, false);
  assert.ok(excessCompanions.errors.some((e) => e.includes('exceeds allowedCompanions')));
});
