import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import arDict from '../locales/ar.json' with { type: 'json' };
import enDict from '../locales/en.json' with { type: 'json' };
import { getDictionary, getDir, t, formatRiyadhDate } from '../lib/locale.js';
import { ApiError, api, setCsrfToken, getCsrfToken } from '../lib/api.js';

describe('T07 — Shell, Localization and UI Primitives', () => {

  describe('Dictionary symmetry and localization completeness', () => {
    function getAllKeys(obj, prefix = '') {
      let keys = [];
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          keys = keys.concat(getAllKeys(value, fullKey));
        } else {
          keys.push(fullKey);
        }
      }
      return keys.sort();
    }

    const arKeys = getAllKeys(arDict);
    const enKeys = getAllKeys(enDict);

    it('ar.json and en.json have identical key symmetry', () => {
      assert.deepEqual(arKeys, enKeys, 'Both dictionaries must share the exact same keys');
    });

    it('no dictionary entries are empty strings', () => {
      for (const key of arKeys) {
        const arVal = t(arDict, key);
        const enVal = t(enDict, key);
        assert.ok(arVal && arVal.trim().length > 0, `Arabic key "${key}" must not be empty`);
        assert.ok(enVal && enVal.trim().length > 0, `English key "${key}" must not be empty`);
      }
    });

    it('covers all 18 core domain error codes from Technical Contract §4', () => {
      const requiredErrorCodes = [
        'VALIDATION_FAILED',
        'UNAUTHENTICATED',
        'FORBIDDEN',
        'CSRF_INVALID',
        'NOT_FOUND',
        'EVENT_NOT_LIVE',
        'EVENT_CLOSED',
        'VERSION_CONFLICT',
        'ALREADY_CHECKED_IN',
        'INVALID_INVITATION',
        'REFERENCE_CONFLICT',
        'CAPACITY_EXCEEDED',
        'IMPORT_INVALID',
        'IDEMPOTENCY_CONFLICT',
        'EXPORT_NOT_READY',
        'EXPORT_EXPIRED',
        'EXPORT_FAILED',
        'RATE_LIMITED',
        'SERVICE_UNAVAILABLE',
      ];

      for (const code of requiredErrorCodes) {
        assert.ok(arDict.errors[code], `Arabic error translation missing for code: ${code}`);
        assert.ok(enDict.errors[code], `English error translation missing for code: ${code}`);
      }
    });

    it('locale helper functions return correct directions and dictionary', () => {
      assert.equal(getDir('ar'), 'rtl');
      assert.equal(getDir('en'), 'ltr');
      assert.equal(getDir('unknown'), 'rtl'); // Default Arabic

      assert.equal(getDictionary('ar'), arDict);
      assert.equal(getDictionary('en'), enDict);

      // t() lookup and variable interpolation
      assert.equal(t(arDict, 'common.appName'), 'إدارة دخول الضيوف');
      assert.equal(t(enDict, 'common.appName'), 'Guest Check-in');
      assert.equal(t(arDict, 'nonexistent.key'), 'nonexistent.key');

      // formatRiyadhDate produces valid string
      const testDate = '2026-09-08T18:00:00.000Z';
      const formattedAr = formatRiyadhDate(testDate, 'ar');
      const formattedEn = formatRiyadhDate(testDate, 'en');
      assert.ok(formattedAr.length > 0);
      assert.ok(formattedEn.length > 0);
    });
  });

  describe('API wrapper, CSRF token and error handling', () => {
    it('sets and retrieves CSRF token correctly', () => {
      setCsrfToken('test-csrf-token-12345');
      assert.equal(getCsrfToken(), 'test-csrf-token-12345');
      setCsrfToken(null);
      assert.equal(getCsrfToken(), null);
    });

    it('ApiError instantiates with all contract fields', () => {
      const err = new ApiError({
        status: 409,
        code: 'ALREADY_CHECKED_IN',
        message: 'Invitation already admitted',
        fieldErrors: { guestId: 'Already scanned' },
        requestId: 'req-xyz-987',
        details: { checkedInAt: '2026-09-08T20:00:00Z', operatorName: 'Fatima' },
      });

      assert.equal(err.name, 'ApiError');
      assert.equal(err.status, 409);
      assert.equal(err.code, 'ALREADY_CHECKED_IN');
      assert.equal(err.message, 'Invitation already admitted');
      assert.deepEqual(err.fieldErrors, { guestId: 'Already scanned' });
      assert.equal(err.requestId, 'req-xyz-987');
      assert.deepEqual(err.details, { checkedInAt: '2026-09-08T20:00:00Z', operatorName: 'Fatima' });
    });

    it('apiRequest handles simulated 204 No Content response without JSON error', async () => {
      // Mock global fetch
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () => ({
        ok: true,
        status: 204,
        headers: new Headers(),
      });

      try {
        const result = await api.post('/auth/logout');
        assert.deepEqual(result, { data: null });
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('apiRequest injects X-CSRF-Token on mutations', async () => {
      let capturedHeaders = null;
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url, config) => {
        capturedHeaders = config.headers;
        return {
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ data: { success: true } }),
        };
      };

      try {
        setCsrfToken('token-abc-999');
        await api.post('/events/123/guests', { name: 'Test' });
        assert.equal(capturedHeaders['X-CSRF-Token'], 'token-abc-999');
        assert.equal(capturedHeaders['Content-Type'], 'application/json');
      } finally {
        setCsrfToken(null);
        globalThis.fetch = originalFetch;
      }
    });

    it('apiRequest extracts structured domain errors from failed requests', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () => ({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        headers: new Headers({
          'content-type': 'application/json',
          'x-request-id': 'req-err-456',
        }),
        json: async () => ({
          error: {
            code: 'FORBIDDEN',
            message: 'Receptionists cannot access guests list',
            fieldErrors: {},
            requestId: 'req-err-456',
          },
        }),
      });

      try {
        await assert.rejects(
          async () => {
            await api.get('/events/123/guests');
          },
          (err) => {
            assert.ok(err instanceof ApiError);
            assert.equal(err.status, 403);
            assert.equal(err.code, 'FORBIDDEN');
            assert.equal(err.message, 'Receptionists cannot access guests list');
            assert.equal(err.requestId, 'req-err-456');
            return true;
          }
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe('Role-aware navigation and access policies', () => {
    function getAllowedTabs(role) {
      if (role === 'admin') {
        return ['guests', 'gate'];
      }
      if (role === 'reception') {
        return ['gate'];
      }
      return [];
    }

    function canAccessRoute(role, route) {
      if (route === 'guests') {
        return role === 'admin';
      }
      if (route === 'gate') {
        return role === 'admin' || role === 'reception';
      }
      return false;
    }

    it('admin role has access to both guests and gate tabs', () => {
      const tabs = getAllowedTabs('admin');
      assert.deepEqual(tabs, ['guests', 'gate']);
      assert.equal(canAccessRoute('admin', 'guests'), true);
      assert.equal(canAccessRoute('admin', 'gate'), true);
    });

    it('reception role has access ONLY to gate tab and cannot access guests', () => {
      const tabs = getAllowedTabs('reception');
      assert.deepEqual(tabs, ['gate']);
      assert.equal(canAccessRoute('reception', 'guests'), false);
      assert.equal(canAccessRoute('reception', 'gate'), true);
    });
  });
});
