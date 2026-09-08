import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ERROR_CODES,
  ERROR_CODE_VALUES,
  ERROR_STATUS_MAP,
  DomainError,
  createErrorEnvelope,
  createSuccessEnvelope,
  createPaginatedEnvelope,
} from '../src/index.js';

test('errors: all 18 core error codes are defined with appropriate HTTP status codes', () => {
  const expectedCodes = [
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

  for (const code of expectedCodes) {
    assert.ok(ERROR_CODES[code], `ERROR_CODES must include ${code}`);
    const status = ERROR_STATUS_MAP[code];
    assert.ok(
      typeof status === 'number' && status >= 400 && status <= 599,
      `ERROR_STATUS_MAP for ${code} must be a valid HTTP error status (got ${status})`
    );
  }

  assert.equal(ERROR_CODE_VALUES.length, expectedCodes.length);
});

test('DomainError: correctly instantiates with code, message, status, fieldErrors, details', () => {
  const err = new DomainError({
    code: ERROR_CODES.ALREADY_CHECKED_IN,
    message: 'Invitation already admitted',
    fieldErrors: { guestId: 'Already admitted at gate' },
    details: { checkedInAt: '2026-09-08T18:00:00.000Z', operatorName: 'Sara' },
  });

  assert.ok(err instanceof Error);
  assert.equal(err.name, 'DomainError');
  assert.equal(err.code, ERROR_CODES.ALREADY_CHECKED_IN);
  assert.equal(err.status, 409);
  assert.equal(err.message, 'Invitation already admitted');
  assert.deepEqual(err.fieldErrors, { guestId: 'Already admitted at gate' });
  assert.equal(err.details.operatorName, 'Sara');
});

test('createErrorEnvelope: generates exact response shape from Section 4', () => {
  const envelope = createErrorEnvelope({
    code: ERROR_CODES.ALREADY_CHECKED_IN,
    message: 'Invitation already admitted',
    fieldErrors: {},
    requestId: 'req-12345',
    details: { actualPartySize: 2 },
  });

  assert.deepEqual(envelope, {
    error: {
      code: 'ALREADY_CHECKED_IN',
      message: 'Invitation already admitted',
      fieldErrors: {},
      requestId: 'req-12345',
      details: { actualPartySize: 2 },
    },
  });
});

test('createSuccessEnvelope and createPaginatedEnvelope: generate exact response shapes', () => {
  const single = createSuccessEnvelope({ id: '507f1f77bcf86cd799439011' });
  assert.deepEqual(single, {
    data: { id: '507f1f77bcf86cd799439011' },
  });

  const paginated = createPaginatedEnvelope([{ id: '1' }, { id: '2' }], {
    page: 1,
    pageSize: 25,
    total: 2,
  });

  assert.deepEqual(paginated, {
    data: [{ id: '1' }, { id: '2' }],
    meta: {
      page: 1,
      pageSize: 25,
      total: 2,
    },
  });
});
