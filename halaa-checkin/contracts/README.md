# @halaa-checkin/contracts

Shared TypeScript/JSDoc types, strict Zod schemas, constants, domain errors, and pure statistics calculations for Halaa Guest Check-in.

## Structure

- `src/constants.js`: System limits, enums, regex patterns, ports, metadata, and design tokens.
- `src/errors.js`: Core domain error codes, `DomainError` class, and API response envelope factories.
- `src/schemas.js`: Strict Zod validation schemas for requests and safe response DTOs, plus text/reference/date normalization helpers.
- `src/stats.js`: Pure, authoritative event attendance statistics calculation function (`calculateStats`) matching Section 6 of `02-TECHNICAL-CONTRACT.md`.
- `src/index.js`: Main entry point re-exporting all modules.

## Key Usage Examples

### 1. Request Validation with Strict Schemas

```javascript
import { guestCreateSchema, checkInAdmissionSchema } from '@halaa-checkin/contracts';

// Validating guest creation payload
const guestPayload = {
  name: 'أحمد حسن',
  reference: 'INV-001',
  allowedCompanions: 2,
  companionNames: ['سارة حسن', 'عمر حسن'],
};
const parsedGuest = guestCreateSchema.parse(guestPayload);

// Unknown writable fields are strictly rejected
try {
  guestCreateSchema.parse({
    ...guestPayload,
    qrToken: 'HGC1.injectionAttempt',
  });
} catch (err) {
  // ZodError: unrecognized_keys
}
```

### 2. Pure Event Attendance Statistics

```javascript
import { calculateStats, formatRate } from '@halaa-checkin/contracts';

const guests = [
  { id: '1', allowedCompanions: 2, checkIn: { actualCompanions: 1 } },
  { id: '2', allowedCompanions: 0, checkIn: null },
  { id: '3', allowedCompanions: 3, checkIn: { actualCompanions: 3 } },
];

const stats = calculateStats(guests);

console.log(stats);
// {
//   totalInvitations: 3,
//   totalAllowedCompanions: 5,
//   expectedPeople: 8,
//   admittedInvitations: 2,
//   actualCompanions: 4,
//   actualAttendees: 6,
//   pendingInvitations: 1,
//   invitationAttendanceRate: 66.7,
//   capacityAttendanceRate: 75.0,
//   asOf: '...'
// }

console.log(formatRate(stats.invitationAttendanceRate)); // "66.7%"
```

### 3. Normalization Helpers

```javascript
import { normalizeForSearch, normalizeReferenceKey } from '@halaa-checkin/contracts';

// Arabic search normalization (NFKC, tashkeel/tatweel removal, alef unification)
const searchKey = normalizeForSearch('  أَحْمَدُ   حَسَنٌ  ');
console.log(searchKey); // "احمد حسن" (original displayed name is never mutated)

// Reference key uniqueness normalization
const refKey = normalizeReferenceKey('  inv-001  ');
console.log(refKey); // "INV-001"
```

### 4. Domain Errors & Response Envelopes

```javascript
import {
  DomainError,
  ERROR_CODES,
  createErrorEnvelope,
  createSuccessEnvelope,
  createPaginatedEnvelope,
} from '@halaa-checkin/contracts';

// Throwing a domain error
throw new DomainError({
  code: ERROR_CODES.ALREADY_CHECKED_IN,
  message: 'Invitation already admitted',
  details: { checkedInAt: '2026-09-08T18:00:00.000Z', operatorName: 'Sara' },
});

// Standard API response envelope
const resBody = createErrorEnvelope({
  code: ERROR_CODES.ALREADY_CHECKED_IN,
  message: 'Invitation already admitted',
  requestId: 'req-12345',
});
```

## Running Tests

From `halaa-checkin/`:

```bash
npm test
```
