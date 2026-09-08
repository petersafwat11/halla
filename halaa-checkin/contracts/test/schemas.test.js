import test from 'node:test';
import assert from 'node:assert/strict';
import {
  guestCreateSchema,
  guestUpdateSchema,
  eventCreateSchema,
  eventUpdateSchema,
  eventStatusTransitionSchema,
  validateEventStatusTransition,
  gateResolveSchema,
  gateSearchQuerySchema,
  checkInAdmissionSchema,
  admissionCorrectionSchema,
  admissionResetSchema,
  exportCreateSchema,
  guestDtoSchema,
  objectIdSchema,
  shortCodeSchema,
  qrTokenSchema,
  isoTimestampWithOffsetSchema,
  EVENT_STATUSES,
} from '../src/index.js';

// ============================================================================
// 1. Guest Names: Arabic, English, Mixed, Whitespace & Lengths
// ============================================================================

test('guestCreateSchema: accepts valid Arabic, English, and mixed names', () => {
  const validNames = [
    'أحمد حسن',
    'نورة عبدالله الشمري',
    'محمد بن سلمان بن عبدالعزيز',
    'John Smith',
    'Sara Connor',
    'Dr. أحمد Smith',
    'Hala Guest - ضيف هلا',
    'A', // 1 char minimum
    'x'.repeat(120), // 120 chars maximum
  ];

  for (const name of validNames) {
    const result = guestCreateSchema.safeParse({
      name,
      allowedCompanions: 0,
    });
    assert.ok(result.success, `Expected name '${name}' to be valid: ${JSON.stringify(result.error?.issues)}`);
  }
});

test('guestCreateSchema: rejects empty, whitespace-only, and oversized names', () => {
  const invalidNames = [
    '',
    '   ',
    '\t\n',
    'x'.repeat(121), // 121 chars exceeds 120 limit
  ];

  for (const name of invalidNames) {
    const result = guestCreateSchema.safeParse({
      name,
      allowedCompanions: 0,
    });
    assert.equal(result.success, false, `Expected name '${name}' to be rejected`);
  }
});

test('guestCreateSchema: trims leading and trailing whitespace from names', () => {
  const result = guestCreateSchema.safeParse({
    name: '   سلطان العتيبي   ',
    allowedCompanions: 1,
    companionNames: ['   فيصل العتيبي   '],
  });

  assert.ok(result.success);
  assert.equal(result.data.name, 'سلطان العتيبي');
  assert.equal(result.data.companionNames[0], 'فيصل العتيبي');
});

// ============================================================================
// 2. Companion Counts: 0, 20, Negative, Fractional, >20, and Excess Names
// ============================================================================

test('guestCreateSchema: accepts companion boundary values 0 and 20', () => {
  const zeroCompanions = guestCreateSchema.safeParse({
    name: 'Guest Zero',
    allowedCompanions: 0,
  });
  assert.ok(zeroCompanions.success);
  assert.equal(zeroCompanions.data.allowedCompanions, 0);
  assert.deepEqual(zeroCompanions.data.companionNames, []);

  const twentyCompanions = guestCreateSchema.safeParse({
    name: 'Guest Twenty',
    allowedCompanions: 20,
    companionNames: Array.from({ length: 20 }, (_, i) => `Companion ${i + 1}`),
  });
  assert.ok(twentyCompanions.success);
  assert.equal(twentyCompanions.data.allowedCompanions, 20);
  assert.equal(twentyCompanions.data.companionNames.length, 20);
});

test('guestCreateSchema: rejects negative companion counts', () => {
  const negativeCases = [-1, -5];
  for (const count of negativeCases) {
    const result = guestCreateSchema.safeParse({
      name: 'Guest',
      allowedCompanions: count,
    });
    assert.equal(result.success, false, `Expected negative count ${count} to be rejected`);
  }
});

test('guestCreateSchema: rejects fractional companion counts', () => {
  const fractionalCases = [0.5, 1.5, 2.9];
  for (const count of fractionalCases) {
    const result = guestCreateSchema.safeParse({
      name: 'Guest',
      allowedCompanions: count,
    });
    assert.equal(result.success, false, `Expected fractional count ${count} to be rejected`);
  }
});

test('guestCreateSchema: rejects companion counts greater than 20', () => {
  const excessCases = [21, 25, 100];
  for (const count of excessCases) {
    const result = guestCreateSchema.safeParse({
      name: 'Guest',
      allowedCompanions: count,
    });
    assert.equal(result.success, false, `Expected count ${count} (>20) to be rejected`);
  }
});

test('guestCreateSchema: rejects excess companion names beyond allowance', () => {
  // Allowed 2, but provided 3 names
  const result = guestCreateSchema.safeParse({
    name: 'Guest With Excess',
    allowedCompanions: 2,
    companionNames: ['Companion 1', 'Companion 2', 'Companion 3'],
  });

  assert.equal(result.success, false);
  const issues = result.error.issues;
  assert.ok(
    issues.some((issue) => issue.message.includes('companionNames count cannot exceed allowedCompanions')),
    'Must report that companionNames exceeds allowedCompanions'
  );
});

test('guestCreateSchema: accepts companion names fewer than allowed count', () => {
  // Allowed 3, but only 1 named companion provided
  const result = guestCreateSchema.safeParse({
    name: 'Guest Fewer',
    allowedCompanions: 3,
    companionNames: ['Companion 1'],
  });

  assert.ok(result.success);
  assert.equal(result.data.companionNames.length, 1);
});

// ============================================================================
// 3. Identification: ObjectId, ShortCode, QR Token
// ============================================================================

test('objectIdSchema: validates 24-character hexadecimal IDs and rejects malformed IDs', () => {
  const validIds = [
    '507f1f77bcf86cd799439011',
    '000000000000000000000000',
    'ffffffffffffffffffffffff',
    'ABCDEF1234567890abcdef12',
  ];

  for (const id of validIds) {
    const result = objectIdSchema.safeParse(id);
    assert.ok(result.success, `Expected valid ObjectId '${id}'`);
  }

  const malformedIds = [
    '507f1f77bcf86cd79943901', // 23 chars
    '507f1f77bcf86cd7994390111', // 25 chars
    '507f1f77bcf86cd79943901z', // non-hex character 'z'
    '507f1f77bcf86cd79943901-', // special character '-'
    '',
    'not-an-id',
  ];

  for (const id of malformedIds) {
    const result = objectIdSchema.safeParse(id);
    assert.equal(result.success, false, `Expected malformed ObjectId '${id}' to fail`);
  }
});

test('shortCodeSchema: validates 10-character Crockford base32 and rejects invalid formats', () => {
  const validCodes = ['ABCDEFGHJK', '0123456789', 'MNPQRSTVWX', 'YZ01234567'];

  for (const code of validCodes) {
    assert.ok(shortCodeSchema.safeParse(code).success);
  }

  const invalidCodes = [
    'ABCDEFGHIJ', // contains 'I' (invalid Crockford)
    'ABCDEFGHLO', // contains 'L' or 'O'
    'abcdefghjk', // lowercase (must be uppercase Crockford)
    'ABCDEF', // too short
    'ABCDEFGHIJKLM', // too long
  ];

  for (const code of invalidCodes) {
    assert.equal(shortCodeSchema.safeParse(code).success, false);
  }
});

test('qrTokenSchema: validates HGC1 prefixed tokens and rejects invalid', () => {
  const validToken = 'HGC1.abcdefghijklmnopqrstuvwxyz0123456789-_ABCDEFGHIJK';
  assert.ok(qrTokenSchema.safeParse(validToken).success);

  assert.equal(qrTokenSchema.safeParse('HGC2.abcdefg').success, false);
  assert.equal(qrTokenSchema.safeParse('HGC1.short').success, false);
  assert.equal(qrTokenSchema.safeParse('raw-token-without-prefix').success, false);
});

// ============================================================================
// 4. Strict Rejection of Unknown Writable Fields (No Injections)
// ============================================================================

test('guestCreateSchema: strictly rejects unknown writable fields and injection attempts', () => {
  const injectionAttempts = [
    { qrToken: 'HGC1.injectedToken12345678901234567890123456789012' },
    { shortCode: 'ABCDEFGHJK' },
    { checkIn: { actualCompanions: 1 } },
    { deletedAt: new Date().toISOString() },
    { version: 2 },
    { eventId: '507f1f77bcf86cd799439011' },
    { arbitraryField: 'malicious' },
  ];

  for (const injection of injectionAttempts) {
    const payload = {
      name: 'Legitimate Name',
      allowedCompanions: 1,
      ...injection,
    };
    const result = guestCreateSchema.safeParse(payload);
    assert.equal(
      result.success,
      false,
      `Expected injection ${JSON.stringify(injection)} to be rejected by strict schema`
    );
  }
});

test('eventCreateSchema: strictly rejects unknown fields and internal state injections', () => {
  const payload = {
    name: 'Hilton Gala',
    venue: 'Grand Ballroom',
    startsAt: '2026-09-08T20:00:00+03:00',
    status: 'live', // injection attempt: events start as draft
    activitySeq: 10,
    version: 5,
  };

  const result = eventCreateSchema.safeParse(payload);
  assert.equal(result.success, false, 'Expected status/activitySeq/version injections to be rejected');
});

test('checkInAdmissionSchema: strictly rejects unknown fields and operator/time injections', () => {
  const payload = {
    guestId: '507f1f77bcf86cd799439011',
    version: 1,
    actualCompanions: 1,
    method: 'scanner',
    checkedInAt: '2026-09-08T18:00:00.000Z', // server-owned!
    operatorName: 'Fake Operator', // server-owned!
    checkedInBy: '507f1f77bcf86cd799439099', // server-owned!
  };

  const result = checkInAdmissionSchema.safeParse(payload);
  assert.equal(result.success, false, 'Expected checkedInAt/operator injections to be rejected');
});

test('admissionCorrectionSchema and admissionResetSchema: strictly reject unknown fields', () => {
  const correctionWithExtra = admissionCorrectionSchema.safeParse({
    version: 1,
    actualCompanions: 2,
    reason: 'Updated count per host request',
    operatorName: 'Unauthorized Override',
  });
  assert.equal(correctionWithExtra.success, false);

  const resetWithExtra = admissionResetSchema.safeParse({
    version: 1,
    reason: 'Accidental scan reset',
    status: 'pending',
  });
  assert.equal(resetWithExtra.success, false);
});

// ============================================================================
// 5. PATCH Schemas: Must Contain an Allowed Change in Addition to Version
// ============================================================================

test('eventUpdateSchema: requires at least one allowed field in addition to version', () => {
  // Only version -> rejected
  const onlyVersion = eventUpdateSchema.safeParse({ version: 1 });
  assert.equal(onlyVersion.success, false);
  assert.ok(
    onlyVersion.error.issues.some((i) => i.message.includes('PATCH must contain at least one field to update'))
  );

  // Version + valid field -> accepted
  const validPatch = eventUpdateSchema.safeParse({
    version: 1,
    name: 'New Event Name',
  });
  assert.ok(validPatch.success);
});

test('guestUpdateSchema: requires at least one allowed field in addition to version', () => {
  // Only version -> rejected
  const onlyVersion = guestUpdateSchema.safeParse({ version: 1 });
  assert.equal(onlyVersion.success, false);

  // Version + allowedCompanions -> accepted
  const validPatch = guestUpdateSchema.safeParse({
    version: 1,
    allowedCompanions: 2,
  });
  assert.ok(validPatch.success);

  // Version + excess companion names -> rejected
  const excessPatch = guestUpdateSchema.safeParse({
    version: 1,
    allowedCompanions: 1,
    companionNames: ['Comp 1', 'Comp 2'],
  });
  assert.equal(excessPatch.success, false);
});

// ============================================================================
// 6. Event Status Transitions and Reopening Rules
// ============================================================================

test('validateEventStatusTransition: enforces allowed lifecycle transitions', () => {
  // draft -> live
  assert.equal(
    validateEventStatusTransition({
      currentStatus: EVENT_STATUSES.DRAFT,
      targetStatus: EVENT_STATUSES.LIVE,
    }).valid,
    true
  );

  // live -> closed
  assert.equal(
    validateEventStatusTransition({
      currentStatus: EVENT_STATUSES.LIVE,
      targetStatus: EVENT_STATUSES.CLOSED,
    }).valid,
    true
  );

  // closed -> live requires 5..500 character reason
  const reopenNoReason = validateEventStatusTransition({
    currentStatus: EVENT_STATUSES.CLOSED,
    targetStatus: EVENT_STATUSES.LIVE,
  });
  assert.equal(reopenNoReason.valid, false);

  const reopenShortReason = validateEventStatusTransition({
    currentStatus: EVENT_STATUSES.CLOSED,
    targetStatus: EVENT_STATUSES.LIVE,
    reason: 'tiny',
  });
  assert.equal(reopenShortReason.valid, false);

  const reopenValidReason = validateEventStatusTransition({
    currentStatus: EVENT_STATUSES.CLOSED,
    targetStatus: EVENT_STATUSES.LIVE,
    reason: 'Reopening event for late arriving VIP delegation',
  });
  assert.equal(reopenValidReason.valid, true);

  // Same status transition rejected
  assert.equal(
    validateEventStatusTransition({
      currentStatus: EVENT_STATUSES.LIVE,
      targetStatus: EVENT_STATUSES.LIVE,
    }).valid,
    false
  );
});

test('eventStatusTransitionSchema: validates status update payloads and bounds', () => {
  // Valid status payload without reason
  const validLive = eventStatusTransitionSchema.safeParse({
    version: 1,
    status: 'live',
  });
  assert.ok(validLive.success);

  // Valid status payload with reason
  const validReopen = eventStatusTransitionSchema.safeParse({
    version: 2,
    status: 'live',
    reason: 'Reopening for late arriving delegation',
  });
  assert.ok(validReopen.success);

  // Invalid: reason too short (< 5 chars)
  const shortReason = eventStatusTransitionSchema.safeParse({
    version: 2,
    status: 'live',
    reason: 'bad',
  });
  assert.equal(shortReason.success, false);

  // Invalid: missing version
  const missingVersion = eventStatusTransitionSchema.safeParse({
    status: 'live',
  });
  assert.equal(missingVersion.success, false);
});

// ============================================================================
// 7. Gate Resolve & Search Schemas
// ============================================================================

test('gateResolveSchema: accepts exactly one of token or guestId', () => {
  // Only token -> valid
  const withToken = gateResolveSchema.safeParse({
    token: 'HGC1.validtoken12345678901234567890123456789012',
  });
  assert.ok(withToken.success);

  // Only guestId -> valid
  const withGuestId = gateResolveSchema.safeParse({
    guestId: '507f1f77bcf86cd799439011',
  });
  assert.ok(withGuestId.success);

  // Both token and guestId -> rejected
  const withBoth = gateResolveSchema.safeParse({
    token: 'HGC1.validtoken12345678901234567890123456789012',
    guestId: '507f1f77bcf86cd799439011',
  });
  assert.equal(withBoth.success, false);

  // Neither -> rejected
  const withNeither = gateResolveSchema.safeParse({});
  assert.equal(withNeither.success, false);
});

test('gateSearchQuerySchema: validates bounds (2..120 chars)', () => {
  assert.ok(gateSearchQuerySchema.safeParse({ q: 'Ah' }).success);
  assert.ok(gateSearchQuerySchema.safeParse({ q: 'أحمد' }).success);
  assert.equal(gateSearchQuerySchema.safeParse({ q: 'A' }).success, false); // < 2 chars
  assert.equal(gateSearchQuerySchema.safeParse({ q: 'x'.repeat(121) }).success, false); // > 120 chars
});

// ============================================================================
// 8. Timestamps with Explicit Offsets
// ============================================================================

test('isoTimestampWithOffsetSchema: requires explicit timezone offset or Z', () => {
  const validTimestamps = [
    '2026-09-08T20:00:00+03:00',
    '2026-09-08T17:00:00Z',
    '2026-09-08T17:00:00.000Z',
    '2026-09-08T12:00:00-05:00',
  ];

  for (const ts of validTimestamps) {
    assert.ok(isoTimestampWithOffsetSchema.safeParse(ts).success, `Expected timestamp '${ts}' to be valid`);
  }

  const invalidTimestamps = [
    '2026-09-08T20:00:00', // naive timestamp without offset
    '2026-09-08',
    'invalid-date-string',
    '2026-02-31T20:00:00Z', // impossible date
  ];

  for (const ts of invalidTimestamps) {
    assert.equal(isoTimestampWithOffsetSchema.safeParse(ts).success, false, `Expected timestamp '${ts}' to fail`);
  }
});

// ============================================================================
// 9. Export Schemas
// ============================================================================

test('exportCreateSchema: validates QR and Report export constraints', () => {
  // Valid QR export (all)
  assert.ok(
    exportCreateSchema.safeParse({
      kind: 'qr',
      locale: 'ar',
      scope: 'all',
    }).success
  );

  // Valid QR export (selected)
  assert.ok(
    exportCreateSchema.safeParse({
      kind: 'qr',
      locale: 'en',
      scope: 'selected',
      guestIds: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
    }).success
  );

  // QR export (selected) without guestIds -> rejected
  assert.equal(
    exportCreateSchema.safeParse({
      kind: 'qr',
      locale: 'ar',
      scope: 'selected',
    }).success,
    false
  );

  // QR export (selected) with duplicate guestIds -> rejected
  assert.equal(
    exportCreateSchema.safeParse({
      kind: 'qr',
      locale: 'ar',
      scope: 'selected',
      guestIds: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439011'],
    }).success,
    false
  );

  // Valid Report export (event-wide, no scope or guestIds)
  assert.ok(
    exportCreateSchema.safeParse({
      kind: 'report',
      locale: 'ar',
    }).success
  );

  // Report export with scope -> rejected
  assert.equal(
    exportCreateSchema.safeParse({
      kind: 'report',
      locale: 'ar',
      scope: 'all',
    }).success,
    false
  );
});

// ============================================================================
// 10. DTO Projection Schemas (Omission of Sensitive Fields)
// ============================================================================

test('guestDtoSchema: verifies valid DTO shape and rejects qrToken', () => {
  const validDto = {
    id: '507f1f77bcf86cd799439011',
    eventId: '507f1f77bcf86cd799439099',
    name: 'سلطان الدوسري',
    reference: 'REF-001',
    shortCode: 'ABCDEFGHJK',
    allowedCompanions: 2,
    companionNames: ['خالد', 'سعد'],
    totalAllowed: 3,
    version: 1,
    checkIn: null,
    createdAt: '2026-09-08T18:00:00.000Z',
    updatedAt: '2026-09-08T18:00:00.000Z',
  };

  assert.ok(guestDtoSchema.safeParse(validDto).success);

  // If qrToken is inadvertently leaked into DTO, strict DTO schema fails!
  const leakedDto = {
    ...validDto,
    qrToken: 'HGC1.leakedtoken12345678901234567890123456789012',
  };
  assert.equal(guestDtoSchema.safeParse(leakedDto).success, false);
});
