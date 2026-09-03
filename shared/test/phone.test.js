import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizePhoneNumber,
  toE164,
  validateAndFormatPhone,
  isValidPhone,
  formatPhoneDisplay,
} from '../src/utils/phone.js';

describe('Phone Utilities (@halaa/shared/utils/phone)', () => {
  describe('normalizePhoneNumber & toE164', () => {
    it('normalizes Saudi local 10-digit format (05xxxxxxxx)', () => {
      assert.equal(normalizePhoneNumber('0501234567'), '966501234567');
      assert.equal(toE164('0501234567'), '+966501234567');
    });

    it('normalizes Saudi local 9-digit format (5xxxxxxxx)', () => {
      assert.equal(normalizePhoneNumber('501234567'), '966501234567');
      assert.equal(toE164('501234567'), '+966501234567');
    });

    it('normalizes Saudi international format (+9665xxxxxxxx)', () => {
      assert.equal(normalizePhoneNumber('+966501234567'), '966501234567');
      assert.equal(toE164('+966501234567'), '+966501234567');
    });

    it('handles accidental redundant zero after Saudi country code (+96605xxxxxxxx)', () => {
      assert.equal(normalizePhoneNumber('+9660501234567'), '966501234567');
      assert.equal(toE164('+9660501234567'), '+966501234567');
    });

    it('handles 00 international prefix (009665xxxxxxxx)', () => {
      assert.equal(normalizePhoneNumber('00966501234567'), '966501234567');
      assert.equal(toE164('00966501234567'), '+966501234567');
    });

    it('normalizes Egyptian local 11-digit format (01xxxxxxxxx)', () => {
      assert.equal(normalizePhoneNumber('01012345678'), '201012345678');
      assert.equal(toE164('01012345678'), '+201012345678');
    });

    it('normalizes Egyptian international format (+201xxxxxxxxx)', () => {
      assert.equal(normalizePhoneNumber('+201012345678'), '201012345678');
      assert.equal(toE164('+201012345678'), '+201012345678');
    });

    it('handles accidental redundant zero after Egypt country code (+2001xxxxxxxxx)', () => {
      assert.equal(normalizePhoneNumber('+2001012345678'), '201012345678');
      assert.equal(toE164('+2001012345678'), '+201012345678');
    });

    it('strips spaces, dashes, and parentheses cleanly', () => {
      assert.equal(normalizePhoneNumber('+966 (50) 123-4567'), '966501234567');
      assert.equal(toE164('+966 (50) 123-4567'), '+966501234567');
      assert.equal(normalizePhoneNumber('055-123-4567'), '966551234567');
      assert.equal(toE164('055-123-4567'), '+966551234567');
      assert.equal(normalizePhoneNumber('(055) 123 4567'), '966551234567');
      assert.equal(toE164('(055) 123 4567'), '+966551234567');
      assert.equal(normalizePhoneNumber('55 123 4567'), '966551234567');
      assert.equal(toE164('55 123 4567'), '+966551234567');
      assert.equal(normalizePhoneNumber('55-123-4567'), '966551234567');
      assert.equal(toE164('55-123-4567'), '+966551234567');
    });

    it('handles empty / invalid input gracefully', () => {
      assert.equal(normalizePhoneNumber(''), '');
      assert.equal(normalizePhoneNumber(null), '');
      assert.equal(toE164(''), '');
      assert.equal(toE164(null), '');
    });
  });

  describe('validateAndFormatPhone & isValidPhone', () => {
    it('validates correct Saudi numbers', () => {
      const res = validateAndFormatPhone('0501234567');
      assert.equal(res.isValid, true);
      assert.equal(res.country, 'SA');
      assert.equal(res.formatted, '966501234567');
      assert.equal(res.e164, '+966501234567');
      assert.equal(isValidPhone('0501234567'), true);
    });

    it('validates correct Egypt numbers', () => {
      const res = validateAndFormatPhone('01012345678');
      assert.equal(res.isValid, true);
      assert.equal(res.country, 'EG');
      assert.equal(res.formatted, '201012345678');
      assert.equal(res.e164, '+201012345678');
      assert.equal(isValidPhone('01012345678'), true);
    });

    it('rejects invalid Saudi numbers with wrong starting digit', () => {
      const res = validateAndFormatPhone('+966401234567');
      assert.equal(res.isValid, false);
      assert.equal(isValidPhone('+966401234567'), false);
    });

    it('rejects numbers from unsupported country codes', () => {
      const res = validateAndFormatPhone('+14155552671');
      assert.equal(res.isValid, false);
      assert.equal(isValidPhone('+14155552671'), false);
    });
  });

  describe('formatPhoneDisplay', () => {
    it('formats Saudi phone numbers for display', () => {
      assert.equal(formatPhoneDisplay('0501234567'), '+966 50 123 4567');
      assert.equal(formatPhoneDisplay('+966501234567'), '+966 50 123 4567');
    });

    it('formats Egypt phone numbers for display', () => {
      assert.equal(formatPhoneDisplay('01012345678'), '+20 10 1234 5678');
      assert.equal(formatPhoneDisplay('+201012345678'), '+20 10 1234 5678');
    });
  });
});
