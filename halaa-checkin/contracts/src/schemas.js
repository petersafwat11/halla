/**
 * @halaa-checkin/contracts
 * Strict Zod schemas, normalization helpers, and DTO definitions.
 * Authoritative contracts for request validation and response shapes.
 */

import { z } from 'zod';
import {
  ROLE_VALUES,
  EVENT_STATUSES,
  EVENT_STATUS_VALUES,
  EVENT_TIMEZONE,
  ADMISSION_METHOD_VALUES,
  EXPORT_KINDS,
  EXPORT_KIND_VALUES,
  EXPORT_SCOPES,
  EXPORT_SCOPE_VALUES,
  EXPORT_STATE_VALUES,
  LOCALE_VALUES,
  GUEST_ATTENDANCE_FILTERS,
  GUEST_ATTENDANCE_FILTER_VALUES,
  LIMITS,
  REGEXES,
} from './constants.js';

// ============================================================================
// Normalization Helpers
// ============================================================================

/**
 * Normalize a text string for search indexing or query matching.
 * NFKC-normalized, strips Arabic diacritics/tatweel, normalizes Arabic letter variants,
 * case-folds, and collapses whitespace.
 * Does NOT mutate displayed names.
 *
 * @param {string} text
 * @returns {string}
 */
export function normalizeForSearch(text) {
  if (typeof text !== 'string') return '';
  return text
    .normalize('NFKC')
    // Remove Arabic diacritics (tashkeel): fathatan, dammatan, kasratan, fatha, damma, kasra, shadda, sukun, dagger alif
    .replace(/[\u064B-\u0652\u0670]/g, '')
    // Remove Arabic tatweel (kashida)
    .replace(/\u0640/g, '')
    // Normalize Alef variants (إ, أ, آ, ٱ) to plain Alef (ا)
    .replace(/[إأآٱ]/g, 'ا')
    // Normalize Alef Maksura (ى) to Yaa (ي)
    .replace(/ى/g, 'ي')
    // Normalize Taa Marbuta (ة) to Haa (ه)
    .replace(/ة/g, 'ه')
    // Fold Latin case
    .toLowerCase()
    // Trim and collapse whitespace
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Normalize an optional reference string for display/storage.
 * Trims whitespace; returns undefined if absent or empty.
 *
 * @param {string | null | undefined} reference
 * @returns {string | undefined}
 */
export function normalizeReference(reference) {
  if (reference === null || reference === undefined) return undefined;
  const trimmed = String(reference).trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Normalize a reference string into a unique key (referenceKey).
 * NFKC-normalized, trimmed, and upper-cased.
 * Omit blank reference keys rather than storing empty strings.
 *
 * @param {string | null | undefined} reference
 * @returns {string | undefined}
 */
export function normalizeReferenceKey(reference) {
  const ref = normalizeReference(reference);
  if (!ref) return undefined;
  return ref.normalize('NFKC').toUpperCase();
}

/**
 * Parse an ISO 8601 string requiring an explicit timezone offset or Z.
 *
 * @param {string} isoString
 * @returns {Date}
 * @throws {Error} If invalid or missing timezone offset
 */
export function parseExplicitOffsetDate(isoString) {
  if (typeof isoString !== 'string' || !REGEXES.ISO_8601_WITH_OFFSET.test(isoString)) {
    throw new Error('Timestamp must be an ISO 8601 string with an explicit timezone offset or Z');
  }
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid calendar date');
  }
  // Validate calendar day does not roll over (e.g. Feb 31)
  const match = isoString.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const y = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const d = parseInt(match[3], 10);
    const check = new Date(Date.UTC(y, m - 1, d));
    if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) {
      throw new Error('Invalid calendar date');
    }
  }
  return date;
}

// ============================================================================
// Primitive / Atomic Schemas
// ============================================================================

export const objectIdSchema = z
  .string()
  .trim()
  .regex(REGEXES.OBJECT_ID, 'Must be a valid 24-character hexadecimal ObjectId');

export const shortCodeSchema = z
  .string()
  .trim()
  .regex(REGEXES.CROCKFORD_BASE32_SHORT_CODE, 'Must be a 10-character Crockford base32 code');

export const qrTokenSchema = z
  .string()
  .trim()
  .regex(REGEXES.QR_TOKEN, 'Must be a valid HGC1 QR token');

export const idempotencyKeySchema = z
  .string()
  .trim()
  .min(1, 'Idempotency key cannot be empty')
  .max(128, 'Idempotency key exceeds maximum length of 128')
  .regex(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    'Idempotency key must be a UUID',
  );

export const isoTimestampWithOffsetSchema = z
  .string()
  .trim()
  .regex(
    REGEXES.ISO_8601_WITH_OFFSET,
    'Must be an ISO 8601 timestamp with an explicit offset or Z (e.g. 2026-09-08T20:00:00+03:00)'
  )
  .refine(
    (val) => {
      const date = new Date(val);
      if (Number.isNaN(date.getTime())) return false;
      const match = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (!match) return false;
      const y = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const d = parseInt(match[3], 10);
      const check = new Date(Date.UTC(y, m - 1, d));
      return check.getUTCFullYear() === y && check.getUTCMonth() === m - 1 && check.getUTCDate() === d;
    },
    {
      message: 'Invalid calendar date',
    }
  );

export const localeSchema = z.enum(LOCALE_VALUES, {
  errorMap: () => ({ message: `Locale must be one of: ${LOCALE_VALUES.join(', ')}` }),
});

export const roleSchema = z.enum(ROLE_VALUES, {
  errorMap: () => ({ message: `Role must be one of: ${ROLE_VALUES.join(', ')}` }),
});

export const eventStatusSchema = z.enum(EVENT_STATUS_VALUES, {
  errorMap: () => ({ message: `Status must be one of: ${EVENT_STATUS_VALUES.join(', ')}` }),
});

export const admissionMethodSchema = z.enum(ADMISSION_METHOD_VALUES, {
  errorMap: () => ({ message: `Method must be one of: ${ADMISSION_METHOD_VALUES.join(', ')}` }),
});

export const exportKindSchema = z.enum(EXPORT_KIND_VALUES, {
  errorMap: () => ({ message: `Kind must be one of: ${EXPORT_KIND_VALUES.join(', ')}` }),
});

export const exportScopeSchema = z.enum(EXPORT_SCOPE_VALUES, {
  errorMap: () => ({ message: `Scope must be one of: ${EXPORT_SCOPE_VALUES.join(', ')}` }),
});

export const exportStateSchema = z.enum(EXPORT_STATE_VALUES, {
  errorMap: () => ({ message: `State must be one of: ${EXPORT_STATE_VALUES.join(', ')}` }),
});

export const versionSchema = z
  .number()
  .int('Version must be an integer')
  .min(1, 'Version must be at least 1');

// ============================================================================
// Event Schemas & DTOs
// ============================================================================

/**
 * Writable payload for POST /api/checkin/v1/events
 */
export const eventCreateSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(LIMITS.MIN_GUEST_NAME_LENGTH, 'Event name cannot be empty')
      .max(LIMITS.MAX_EVENT_NAME_LENGTH, `Event name cannot exceed ${LIMITS.MAX_EVENT_NAME_LENGTH} characters`),
    venue: z
      .string()
      .trim()
      .min(1, 'Venue cannot be empty')
      .max(LIMITS.MAX_EVENT_VENUE_LENGTH, `Venue cannot exceed ${LIMITS.MAX_EVENT_VENUE_LENGTH} characters`),
    startsAt: isoTimestampWithOffsetSchema,
    timezone: z.literal(EVENT_TIMEZONE).default(EVENT_TIMEZONE),
  })
  .strict();

/**
 * Writable payload for PATCH /api/checkin/v1/events/:eventId
 */
export const eventUpdateSchema = z
  .object({
    version: versionSchema,
    name: z
      .string()
      .trim()
      .min(LIMITS.MIN_GUEST_NAME_LENGTH, 'Event name cannot be empty')
      .max(LIMITS.MAX_EVENT_NAME_LENGTH, `Event name cannot exceed ${LIMITS.MAX_EVENT_NAME_LENGTH} characters`)
      .optional(),
    venue: z
      .string()
      .trim()
      .min(1, 'Venue cannot be empty')
      .max(LIMITS.MAX_EVENT_VENUE_LENGTH, `Venue cannot exceed ${LIMITS.MAX_EVENT_VENUE_LENGTH} characters`)
      .optional(),
    startsAt: isoTimestampWithOffsetSchema.optional(),
  })
  .strict()
  .refine(
    (data) => data.name !== undefined || data.venue !== undefined || data.startsAt !== undefined,
    {
      message: 'PATCH must contain at least one field to update (name, venue, startsAt) in addition to version',
    }
  );

/**
 * Writable payload for POST /api/checkin/v1/events/:eventId/status
 */
export const eventStatusTransitionSchema = z
  .object({
    version: versionSchema,
    status: eventStatusSchema,
    reason: z
      .string()
      .trim()
      .min(LIMITS.MIN_REASON_LENGTH, `Reason must be at least ${LIMITS.MIN_REASON_LENGTH} characters`)
      .max(LIMITS.MAX_REASON_LENGTH, `Reason cannot exceed ${LIMITS.MAX_REASON_LENGTH} characters`)
      .optional(),
  })
  .strict();

/**
 * Validate an event lifecycle transition.
 *
 * @param {object} params
 * @param {string} params.currentStatus
 * @param {string} params.targetStatus
 * @param {string} [params.reason]
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateEventStatusTransition({ currentStatus, targetStatus, reason }) {
  if (currentStatus === targetStatus) {
    return { valid: false, error: `Event is already in status '${targetStatus}'` };
  }

  // Allowed transitions:
  // draft -> live
  // draft -> closed
  // live -> closed
  // closed -> live (requires 5..500 char reason)
  if (currentStatus === EVENT_STATUSES.DRAFT) {
    if (targetStatus === EVENT_STATUSES.LIVE || targetStatus === EVENT_STATUSES.CLOSED) {
      return { valid: true };
    }
  }

  if (currentStatus === EVENT_STATUSES.LIVE) {
    if (targetStatus === EVENT_STATUSES.CLOSED) {
      return { valid: true };
    }
  }

  if (currentStatus === EVENT_STATUSES.CLOSED) {
    if (targetStatus === EVENT_STATUSES.LIVE) {
      const trimmedReason = typeof reason === 'string' ? reason.trim() : '';
      if (trimmedReason.length < LIMITS.MIN_REASON_LENGTH || trimmedReason.length > LIMITS.MAX_REASON_LENGTH) {
        return {
          valid: false,
          error: `Reopening a closed event requires a reason between ${LIMITS.MIN_REASON_LENGTH} and ${LIMITS.MAX_REASON_LENGTH} characters`,
        };
      }
      return { valid: true };
    }
  }

  return {
    valid: false,
    error: `Transition from '${currentStatus}' to '${targetStatus}' is not allowed`,
  };
}

/**
 * Event Response DTO schema.
 */
export const eventDtoSchema = z
  .object({
    id: objectIdSchema,
    name: z.string(),
    venue: z.string(),
    startsAt: z.string(),
    timezone: z.literal(EVENT_TIMEZONE),
    status: eventStatusSchema,
    version: versionSchema,
    activitySeq: z.number().int().min(0),
    closedAt: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strict();

// ============================================================================
// Guest Schemas & DTOs
// ============================================================================

/**
 * Writable payload for POST /api/checkin/v1/events/:eventId/guests
 */
export const guestCreateSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(LIMITS.MIN_GUEST_NAME_LENGTH, 'Guest name cannot be empty')
      .max(LIMITS.MAX_GUEST_NAME_LENGTH, `Guest name cannot exceed ${LIMITS.MAX_GUEST_NAME_LENGTH} characters`),
    reference: z
      .string()
      .trim()
      .min(LIMITS.MIN_REFERENCE_LENGTH, 'Reference cannot be empty')
      .max(LIMITS.MAX_REFERENCE_LENGTH, `Reference cannot exceed ${LIMITS.MAX_REFERENCE_LENGTH} characters`)
      .optional()
      .nullable(),
    allowedCompanions: z
      .number({ invalid_type_error: 'allowedCompanions must be a number' })
      .int('allowedCompanions must be an integer')
      .min(
        LIMITS.MIN_COMPANIONS_PER_GUEST,
        `allowedCompanions cannot be less than ${LIMITS.MIN_COMPANIONS_PER_GUEST}`
      )
      .max(
        LIMITS.MAX_COMPANIONS_PER_GUEST,
        `allowedCompanions cannot exceed ${LIMITS.MAX_COMPANIONS_PER_GUEST}`
      ),
    companionNames: z
      .array(
        z
          .string()
          .trim()
          .min(LIMITS.MIN_COMPANION_NAME_LENGTH, 'Companion name cannot be empty')
          .max(
            LIMITS.MAX_COMPANION_NAME_LENGTH,
            `Companion name cannot exceed ${LIMITS.MAX_COMPANION_NAME_LENGTH} characters`
          )
      )
      .default([]),
  })
  .strict()
  .refine(
    (data) => data.companionNames.length <= data.allowedCompanions,
    {
      message: 'companionNames count cannot exceed allowedCompanions',
      path: ['companionNames'],
    }
  );

/**
 * Writable payload for PATCH /api/checkin/v1/events/:eventId/guests/:guestId
 */
export const guestUpdateSchema = z
  .object({
    version: versionSchema,
    name: z
      .string()
      .trim()
      .min(LIMITS.MIN_GUEST_NAME_LENGTH, 'Guest name cannot be empty')
      .max(LIMITS.MAX_GUEST_NAME_LENGTH, `Guest name cannot exceed ${LIMITS.MAX_GUEST_NAME_LENGTH} characters`)
      .optional(),
    reference: z
      .string()
      .trim()
      .min(LIMITS.MIN_REFERENCE_LENGTH, 'Reference cannot be empty')
      .max(LIMITS.MAX_REFERENCE_LENGTH, `Reference cannot exceed ${LIMITS.MAX_REFERENCE_LENGTH} characters`)
      .optional()
      .nullable(),
    allowedCompanions: z
      .number({ invalid_type_error: 'allowedCompanions must be a number' })
      .int('allowedCompanions must be an integer')
      .min(
        LIMITS.MIN_COMPANIONS_PER_GUEST,
        `allowedCompanions cannot be less than ${LIMITS.MIN_COMPANIONS_PER_GUEST}`
      )
      .max(
        LIMITS.MAX_COMPANIONS_PER_GUEST,
        `allowedCompanions cannot exceed ${LIMITS.MAX_COMPANIONS_PER_GUEST}`
      )
      .optional(),
    companionNames: z
      .array(
        z
          .string()
          .trim()
          .min(LIMITS.MIN_COMPANION_NAME_LENGTH, 'Companion name cannot be empty')
          .max(
            LIMITS.MAX_COMPANION_NAME_LENGTH,
            `Companion name cannot exceed ${LIMITS.MAX_COMPANION_NAME_LENGTH} characters`
          )
      )
      .optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.name !== undefined ||
      data.reference !== undefined ||
      data.allowedCompanions !== undefined ||
      data.companionNames !== undefined,
    {
      message: 'PATCH must contain at least one field to update in addition to version',
    }
  )
  .refine(
    (data) => {
      if (data.allowedCompanions !== undefined && data.companionNames !== undefined) {
        return data.companionNames.length <= data.allowedCompanions;
      }
      return true;
    },
    {
      message: 'companionNames count cannot exceed allowedCompanions',
      path: ['companionNames'],
    }
  );

/**
 * Writable payload for DELETE /api/checkin/v1/events/:eventId/guests/:guestId
 */
export const guestSoftDeleteSchema = z
  .object({
    version: versionSchema,
  })
  .strict();

/**
 * Nested CheckIn DTO schema inside Guest DTO.
 */
export const checkInDtoSchema = z
  .object({
    actualCompanions: z
      .number()
      .int()
      .min(LIMITS.MIN_COMPANIONS_PER_GUEST)
      .max(LIMITS.MAX_COMPANIONS_PER_GUEST),
    actualPartySize: z
      .number()
      .int()
      .min(1)
      .max(LIMITS.MAX_COMPANIONS_PER_GUEST + 1),
    checkedInAt: z.string(),
    checkedInBy: objectIdSchema,
    operatorName: z.string(),
    method: admissionMethodSchema,
  })
  .strict();

/**
 * Guest Response DTO schema.
 * Notice: qrToken is explicitly omitted.
 */
export const guestDtoSchema = z
  .object({
    id: objectIdSchema,
    eventId: objectIdSchema,
    name: z.string(),
    reference: z.string().nullable(),
    shortCode: shortCodeSchema,
    allowedCompanions: z
      .number()
      .int()
      .min(LIMITS.MIN_COMPANIONS_PER_GUEST)
      .max(LIMITS.MAX_COMPANIONS_PER_GUEST),
    companionNames: z.array(z.string()),
    totalAllowed: z.number().int().min(1).max(LIMITS.MAX_COMPANIONS_PER_GUEST + 1),
    version: versionSchema,
    checkIn: checkInDtoSchema.nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strict();

// ============================================================================
// Gate & Check-in Schemas
// ============================================================================

/**
 * Writable payload for POST /api/checkin/v1/events/:eventId/gate/resolve
 */
export const gateResolveSchema = z
  .object({
    token: z.string().trim().min(1, 'Token cannot be empty').optional(),
    guestId: objectIdSchema.optional(),
  })
  .strict()
  .refine(
    (data) => (data.token !== undefined) !== (data.guestId !== undefined),
    {
      message: 'Exactly one of token or guestId must be provided',
    }
  );

/**
 * Query schema for GET /api/checkin/v1/events/:eventId/gate/search
 */
export const gateSearchQuerySchema = z
  .object({
    q: z
      .string()
      .trim()
      .min(
        LIMITS.MIN_SEARCH_QUERY_LENGTH,
        `Search query must be at least ${LIMITS.MIN_SEARCH_QUERY_LENGTH} characters`
      )
      .max(
        LIMITS.MAX_SEARCH_QUERY_LENGTH,
        `Search query cannot exceed ${LIMITS.MAX_SEARCH_QUERY_LENGTH} characters`
      ),
  })
  .strict();

/**
 * Writable payload for POST /api/checkin/v1/events/:eventId/checkins
 */
export const checkInAdmissionSchema = z
  .object({
    guestId: objectIdSchema,
    version: versionSchema,
    actualCompanions: z
      .number({ invalid_type_error: 'actualCompanions must be a number' })
      .int('actualCompanions must be an integer')
      .min(
        LIMITS.MIN_COMPANIONS_PER_GUEST,
        `actualCompanions cannot be less than ${LIMITS.MIN_COMPANIONS_PER_GUEST}`
      )
      .max(
        LIMITS.MAX_COMPANIONS_PER_GUEST,
        `actualCompanions cannot exceed ${LIMITS.MAX_COMPANIONS_PER_GUEST}`
      ),
    method: admissionMethodSchema,
  })
  .strict();

/**
 * Writable payload for PATCH /api/checkin/v1/events/:eventId/guests/:guestId/checkin
 */
export const admissionCorrectionSchema = z
  .object({
    version: versionSchema,
    actualCompanions: z
      .number({ invalid_type_error: 'actualCompanions must be a number' })
      .int('actualCompanions must be an integer')
      .min(
        LIMITS.MIN_COMPANIONS_PER_GUEST,
        `actualCompanions cannot be less than ${LIMITS.MIN_COMPANIONS_PER_GUEST}`
      )
      .max(
        LIMITS.MAX_COMPANIONS_PER_GUEST,
        `actualCompanions cannot exceed ${LIMITS.MAX_COMPANIONS_PER_GUEST}`
      ),
    reason: z
      .string()
      .trim()
      .min(
        LIMITS.MIN_REASON_LENGTH,
        `Reason must be at least ${LIMITS.MIN_REASON_LENGTH} characters`
      )
      .max(
        LIMITS.MAX_REASON_LENGTH,
        `Reason cannot exceed ${LIMITS.MAX_REASON_LENGTH} characters`
      ),
  })
  .strict();

/**
 * Writable payload for DELETE /api/checkin/v1/events/:eventId/guests/:guestId/checkin
 */
export const admissionResetSchema = z
  .object({
    version: versionSchema,
    reason: z
      .string()
      .trim()
      .min(
        LIMITS.MIN_REASON_LENGTH,
        `Reason must be at least ${LIMITS.MIN_REASON_LENGTH} characters`
      )
      .max(
        LIMITS.MAX_REASON_LENGTH,
        `Reason cannot exceed ${LIMITS.MAX_REASON_LENGTH} characters`
      ),
  })
  .strict();

// ============================================================================
// CSV Import Schemas
// ============================================================================

/**
 * Writable payload for POST /api/checkin/v1/events/:eventId/imports/preview and /commit
 */
export const csvPayloadSchema = z
  .object({
    csv: z
      .string()
      .min(1, 'CSV content cannot be empty')
      .max(LIMITS.MAX_CSV_BYTES, 'CSV file exceeds 2 MB limit'),
  })
  .strict();

/**
 * Validated row structure extracted from CSV.
 * Mirrors validateCsvRow() bounds: reference 1..60 when present,
 * companionNames each 1..120 and count <= allowedCompanions.
 * validateCsvRow() remains authoritative for raw CSV string parsing;
 * this schema guards already-parsed objects passed between layers.
 */
export const csvParsedRowSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(LIMITS.MIN_GUEST_NAME_LENGTH, 'Name cannot be empty')
      .max(LIMITS.MAX_GUEST_NAME_LENGTH, `Name cannot exceed ${LIMITS.MAX_GUEST_NAME_LENGTH} characters`),
    allowedCompanions: z
      .number()
      .int()
      .min(LIMITS.MIN_COMPANIONS_PER_GUEST)
      .max(LIMITS.MAX_COMPANIONS_PER_GUEST),
    companionNames: z
      .array(z.string().trim().min(1).max(LIMITS.MAX_COMPANION_NAME_LENGTH))
      .max(LIMITS.MAX_COMPANIONS_PER_GUEST),
    reference: z
      .string()
      .trim()
      .min(1)
      .max(LIMITS.MAX_REFERENCE_LENGTH, `Reference cannot exceed ${LIMITS.MAX_REFERENCE_LENGTH} characters`)
      .optional(),
    referenceKey: z.string().optional(),
    nameSearch: z.string(),
  })
  .strict()
  .refine((data) => data.companionNames.length <= data.allowedCompanions, {
    message: 'companionNames count cannot exceed allowedCompanions',
    path: ['companionNames'],
  });

/**
 * Parse and validate an individual CSV row representation.
 *
 * @param {object} row Raw record object from CSV parser
 * @param {number} rowNumber Line/row index (1-based)
 * @returns {{ valid: boolean, data?: object, errors?: string[] }}
 */
export function validateCsvRow(row, rowNumber = 1) {
  const errors = [];

  // 1. Name
  const rawName = row.name !== undefined && row.name !== null ? String(row.name).trim() : '';
  if (rawName.length < LIMITS.MIN_GUEST_NAME_LENGTH) {
    errors.push(`Row ${rowNumber}: name is required and cannot be empty`);
  } else if (rawName.length > LIMITS.MAX_GUEST_NAME_LENGTH) {
    errors.push(`Row ${rowNumber}: name exceeds ${LIMITS.MAX_GUEST_NAME_LENGTH} characters`);
  }

  // 2. Allowed companions
  const rawAllowed = row.allowedCompanions !== undefined && row.allowedCompanions !== null
    ? String(row.allowedCompanions).trim()
    : '';

  let allowedCompanions = 0;
  if (rawAllowed === '') {
    errors.push(`Row ${rowNumber}: allowedCompanions is required`);
  } else if (!/^\d+$/.test(rawAllowed)) {
    errors.push(`Row ${rowNumber}: allowedCompanions must be a non-negative integer`);
  } else {
    allowedCompanions = parseInt(rawAllowed, 10);
    if (allowedCompanions < LIMITS.MIN_COMPANIONS_PER_GUEST || allowedCompanions > LIMITS.MAX_COMPANIONS_PER_GUEST) {
      errors.push(
        `Row ${rowNumber}: allowedCompanions must be between ${LIMITS.MIN_COMPANIONS_PER_GUEST} and ${LIMITS.MAX_COMPANIONS_PER_GUEST}`
      );
    }
  }

  // 3. Companion names (pipe-separated)
  let companionNames = [];
  if (row.companionNames !== undefined && row.companionNames !== null) {
    const rawCompanions = String(row.companionNames).trim();
    if (rawCompanions.length > 0) {
      companionNames = rawCompanions
        .split('|')
        .map((n) => n.trim())
        .filter((n) => n.length > 0);
    }
  }

  if (companionNames.length > allowedCompanions) {
    errors.push(
      `Row ${rowNumber}: companionNames count (${companionNames.length}) exceeds allowedCompanions (${allowedCompanions})`
    );
  }

  for (const cName of companionNames) {
    if (cName.length > LIMITS.MAX_COMPANION_NAME_LENGTH) {
      errors.push(`Row ${rowNumber}: companion name '${cName}' exceeds ${LIMITS.MAX_COMPANION_NAME_LENGTH} characters`);
    }
  }

  // 4. Reference
  const rawRef = row.reference !== undefined && row.reference !== null ? String(row.reference).trim() : '';
  let reference;
  let referenceKey;

  if (rawRef.length > 0) {
    if (rawRef.length > LIMITS.MAX_REFERENCE_LENGTH) {
      errors.push(`Row ${rowNumber}: reference exceeds ${LIMITS.MAX_REFERENCE_LENGTH} characters`);
    } else {
      reference = rawRef;
      referenceKey = normalizeReferenceKey(rawRef);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: {
      name: rawName,
      allowedCompanions,
      companionNames,
      reference,
      referenceKey,
      nameSearch: normalizeForSearch(rawName),
    },
  };
}

// ============================================================================
// Export Schemas & DTOs
// ============================================================================

/**
 * Writable payload for POST /api/checkin/v1/events/:eventId/exports
 */
export const exportCreateSchema = z
  .object({
    kind: exportKindSchema,
    locale: localeSchema,
    scope: exportScopeSchema.optional(),
    guestIds: z
      .array(objectIdSchema)
      .min(1, 'guestIds must contain at least 1 guest ID')
      .max(LIMITS.MAX_EVENT_INVITATIONS, `guestIds cannot exceed ${LIMITS.MAX_EVENT_INVITATIONS} items`)
      .optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.kind === EXPORT_KINDS.QR) {
      if (!data.scope) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['scope'],
          message: "Scope ('all' or 'selected') is required for QR export",
        });
      } else if (data.scope === EXPORT_SCOPES.SELECTED) {
        if (!data.guestIds || data.guestIds.length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['guestIds'],
            message: "guestIds array is required when scope is 'selected'",
          });
        } else {
          const uniqueIds = new Set(data.guestIds);
          if (uniqueIds.size !== data.guestIds.length) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['guestIds'],
              message: 'guestIds must contain unique IDs',
            });
          }
        }
      } else if (data.scope === EXPORT_SCOPES.ALL) {
        if (data.guestIds !== undefined && data.guestIds.length > 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['guestIds'],
            message: "guestIds must not be supplied when scope is 'all'",
          });
        }
      }
    } else if (data.kind === EXPORT_KINDS.REPORT) {
      if (data.scope !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['scope'],
          message: 'Report export is event-wide; scope is not allowed',
        });
      }
      if (data.guestIds !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['guestIds'],
          message: 'Report export is event-wide; guestIds is not allowed',
        });
      }
    }
  });

/**
 * Export Job Response DTO schema.
 */
export const exportJobDtoSchema = z
  .object({
    id: objectIdSchema,
    eventId: objectIdSchema,
    kind: exportKindSchema,
    locale: localeSchema,
    state: exportStateSchema,
    createdAt: z.string(),
    snapshotAt: z.string(),
    expiresAt: z.string(),
    errorCode: z.string().nullable(),
    attempts: z.number().int().min(0),
  })
  .strict();

// ============================================================================
// Pagination & Query Schemas
// ============================================================================

export const paginationQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(LIMITS.DEFAULT_PAGE),
    pageSize: z.coerce
      .number()
      .int()
      .min(1)
      .max(LIMITS.MAX_PAGE_SIZE)
      .default(LIMITS.DEFAULT_PAGE_SIZE),
  })
  .strict();

export const guestListQuerySchema = z
  .object({
    q: z.string().trim().max(LIMITS.MAX_SEARCH_QUERY_LENGTH).optional(),
    status: z.enum(GUEST_ATTENDANCE_FILTER_VALUES).default(GUEST_ATTENDANCE_FILTERS.ALL),
    page: z.coerce.number().int().min(1).default(LIMITS.DEFAULT_PAGE),
    pageSize: z.coerce
      .number()
      .int()
      .min(1)
      .max(LIMITS.MAX_PAGE_SIZE)
      .default(LIMITS.DEFAULT_PAGE_SIZE),
  })
  .strict();

// ============================================================================
// Auth Schemas & DTOs
// ============================================================================

export const loginSchema = z
  .object({
    username: z.string().trim().min(1, 'Username is required').max(100),
    password: z.string().min(1, 'Password is required').max(200),
  })
  .strict();

export const sessionUserDtoSchema = z
  .object({
    id: objectIdSchema,
    username: z.string(),
    displayName: z.string(),
    role: roleSchema,
    assignedEventIds: z.array(objectIdSchema),
  })
  .strict();

export const sessionDtoSchema = z
  .object({
    user: sessionUserDtoSchema,
    csrfToken: z.string(),
    expiresAt: z.string(),
  })
  .strict();
