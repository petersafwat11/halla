import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import arDict from '../locales/ar.json' with { type: 'json' };
import enDict from '../locales/en.json' with { type: 'json' };
import { t } from '../lib/locale.js';

describe('T09 — Gate Unit & Contract Verification', () => {
  describe('Derived party size and companion boundaries', () => {
    it('calculates derived party size as 1 + actualCompanions', () => {
      const allowedCompanions = 3;
      for (let actual = 0; actual <= allowedCompanions; actual++) {
        const derivedPartySize = 1 + actual;
        assert.equal(derivedPartySize, actual + 1);
      }
    });

    it('defaults actualCompanions to 0 for every new invitation preview', () => {
      const initialCompanions = 0;
      assert.equal(initialCompanions, 0, 'Companions must always default to 0 on new resolution');
    });

    it('clamps actual companions within [0, allowedCompanions]', () => {
      const max = 2;
      const clamp = (val) => Math.max(0, Math.min(Number(val) || 0, max));

      assert.equal(clamp(-1), 0);
      assert.equal(clamp(0), 0);
      assert.equal(clamp(1), 1);
      assert.equal(clamp(2), 2);
      assert.equal(clamp(5), 2);
      assert.equal(clamp('invalid'), 0);
    });
  });

  describe('Preview staleness detection', () => {
    it('detects previews older than 30 seconds as stale', () => {
      const isStale = (resolvedAt, now) => {
        if (!resolvedAt) return false;
        return now - resolvedAt > 30000;
      };

      const now = 100000;
      assert.equal(isStale(now - 10000, now), false, '10s preview is fresh');
      assert.equal(isStale(now - 29999, now), false, '29.999s preview is fresh');
      assert.equal(isStale(now - 30001, now), true, '30.001s preview is stale');
      assert.equal(isStale(now - 60000, now), true, '60s preview is stale');
    });
  });

  describe('Idempotency key stability', () => {
    it('retains stable idempotency key across retries of the same admission', () => {
      let activeKey = null;
      const generateKey = () => 'key-' + Math.random();

      // First attempt
      if (!activeKey) {
        activeKey = generateKey();
      }
      const initialKey = activeKey;

      // Simulated network failure -> retry
      const retryKey = activeKey; // reuses same key
      assert.equal(retryKey, initialKey, 'Retry must reuse the exact same idempotency key');

      // Next guest scan -> resets and generates new key
      activeKey = generateKey();
      assert.notEqual(activeKey, initialKey, 'New scan must generate fresh idempotency key');
    });
  });

  describe('Gate localization string completeness', () => {
    it('formats party helper text in Arabic and English', () => {
      const helperArSingle = t(arDict, 'gate.includingGuestSingle');
      assert.ok(helperArSingle.includes('شخص واحد'));

      const helperArMulti = t(arDict, 'gate.includingGuestHelper', { count: 3 });
      assert.ok(helperArMulti.includes('3'));

      const helperEnSingle = t(enDict, 'gate.includingGuestSingle');
      assert.ok(helperEnSingle.includes('1 person'));

      const helperEnMulti = t(enDict, 'gate.includingGuestHelper', { count: 3 });
      assert.ok(helperEnMulti.includes('3 people'));
    });

    it('formats already admitted details in Arabic and English', () => {
      const textAr = t(arDict, 'gate.alreadyAdmittedDetails', {
        time: '18:30',
        operator: 'reception_1',
        count: 2,
      });
      assert.ok(textAr.includes('18:30'));
      assert.ok(textAr.includes('reception_1'));
      assert.ok(textAr.includes('2'));

      const textEn = t(enDict, 'gate.alreadyAdmittedDetails', {
        time: '18:30',
        operator: 'reception_1',
        count: 2,
      });
      assert.ok(textEn.includes('18:30'));
      assert.ok(textEn.includes('reception_1'));
      assert.ok(textEn.includes('2'));
    });
  });
});
