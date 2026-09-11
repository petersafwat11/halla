/**
 * @halaa-checkin/api
 * Imports Service.
 * Implements strict UTF-8/BOM CSV parsing, non-destructive preview,
 * atomic batch commit with idempotency, event fence, and transaction rollback.
 * Adheres to Technical Contract Sections 4–5 and Product Section 5.
 */

import { parse } from 'csv-parse/sync';
import {
  ERROR_CODES,
  DomainError,
  EVENT_STATUSES,
  LIMITS,
  CSV_REQUIRED_HEADERS,
  validateCsvRow,
  normalizeForSearch,
} from '@halaa-checkin/contracts';
import { Event } from '../events/event.model.js';
import { Guest } from '../guests/guest.model.js';
import { GuestsRepository } from '../guests/guests.repository.js';
import { AuditService } from '../audit/audit.service.js';
import { IdempotencyService } from '../idempotency/idempotency.service.js';
import { withTransaction } from '../../db/transaction.js';
import { generateShortCode, generateQrToken } from '../../utils/crypto.js';

export const CSV_TEMPLATES = Object.freeze({
  ar:
    '\uFEFFname,allowedCompanions,companionNames,reference\n' +
    'أحمد حسن,2,سارة حسن|عمر حسن,INV-001\n' +
    'نورة عبدالله,0,,INV-002\n',
  en:
    '\uFEFFname,allowedCompanions,companionNames,reference\n' +
    'Ahmed Hassan,2,Sara Hassan|Omar Hassan,INV-001\n' +
    'Noura Abdullah,0,,INV-002\n',
});

/**
 * Parse raw CSV string and validate headers strictly.
 *
 * @param {string} rawCsv
 * @returns {{ records: object[], headers: string[], error?: string }}
 */
export function parseAndValidateHeaders(rawCsv) {
  if (typeof rawCsv !== 'string') {
    return { records: [], headers: [], error: 'CSV content must be a string' };
  }

  // Enforce byte size limit before expensive parsing
  const byteLength = Buffer.byteLength(rawCsv, 'utf8');
  if (byteLength > LIMITS.MAX_CSV_BYTES) {
    return {
      records: [],
      headers: [],
      error: `CSV file exceeds maximum limit of 2 MB (${Math.round(byteLength / 1024)} KB)`,
    };
  }

  // Strip BOM if present
  const cleanCsv = rawCsv.replace(/^\uFEFF/, '').trim();
  if (cleanCsv.length === 0) {
    return { records: [], headers: [], error: 'CSV file is empty' };
  }

  let records = [];
  let rawHeaders = [];
  try {
    // F14: validate the raw header array BEFORE object mapping so duplicate
    // headers cannot silently collapse (e.g. `name,name,...`).
    const headerRows = parse(cleanCsv, {
      bom: true,
      columns: false,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: false,
      to_line: 1,
    });
    rawHeaders = (headerRows?.[0] || []).map((h) => String(h).trim());
    const seen = new Set();
    const duplicates = [];
    for (const h of rawHeaders) {
      if (seen.has(h)) duplicates.push(h);
      else seen.add(h);
    }
    if (duplicates.length > 0) {
      return {
        records: [],
        headers: rawHeaders,
        error: `Duplicate header(s): ${[...new Set(duplicates)].join(', ')}. Each of the four headers must appear exactly once.`,
      };
    }

    records = parse(cleanCsv, {
      bom: true,
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: false,
    });
  } catch (err) {
    return { records: [], headers: [], error: `CSV parse error: ${err.message}` };
  }

  if (!records || records.length === 0) {
    return { records: [], headers: [], error: 'CSV file contains no guest data rows' };
  }

  if (records.length > LIMITS.MAX_CSV_ROWS) {
    return {
      records: [],
      headers: [],
      error: `CSV file exceeds maximum limit of 1,000 data rows (found ${records.length})`,
    };
  }

  const discoveredHeaders = Object.keys(records[0]);
  const missingHeaders = CSV_REQUIRED_HEADERS.filter((h) => !discoveredHeaders.includes(h));
  const unexpectedHeaders = discoveredHeaders.filter((h) => !CSV_REQUIRED_HEADERS.includes(h));

  if (missingHeaders.length > 0 || unexpectedHeaders.length > 0) {
    const errorParts = [];
    if (missingHeaders.length > 0) {
      errorParts.push(`Missing required header(s): ${missingHeaders.join(', ')}`);
    }
    if (unexpectedHeaders.length > 0) {
      errorParts.push(`Unexpected header(s): ${unexpectedHeaders.join(', ')}`);
    }
    return { records: [], headers: discoveredHeaders, error: errorParts.join('; ') };
  }

  return { records, headers: discoveredHeaders };
}

export const ImportsService = {
  /**
   * Preview a CSV import file without modifying the database.
   * Identifies row errors, intra-file duplicates, database reference collisions,
   * non-blocking duplicate-name warnings, and remaining capacity.
   *
   * @param {string} eventId
   * @param {string} rawCsv
   * @param {object} _user
   * @returns {Promise<object>}
   */
  async previewImport(eventId, rawCsv, _user) {
    const event = await Event.findById(eventId);
    if (!event) {
      throw new DomainError({
        code: ERROR_CODES.NOT_FOUND,
        message: 'Event not found',
        status: 404,
      });
    }

    if (event.status === EVENT_STATUSES.CLOSED) {
      throw new DomainError({
        code: ERROR_CODES.EVENT_CLOSED,
        message: 'Cannot preview imports for a closed event',
        status: 409,
      });
    }

    const parseResult = parseAndValidateHeaders(rawCsv);
    if (parseResult.error) {
      const headerIssue = {
        row: null,
        lineNumber: null,
        field: 'header',
        code: 'IMPORT_INVALID',
        message: parseResult.error,
      };
      return {
        rows: [],
        // Structured issues (F13); clients must read .message, not assume strings.
        errors: [headerIssue],
        warnings: [],
        validCount: 0,
        remainingCapacity: 0,
        canCommit: false,
      };
    }

    const { records } = parseResult;
    const activeCount = await GuestsRepository.countActive(eventId);
    const remainingCapacity = Math.max(0, LIMITS.MAX_EVENT_INVITATIONS - activeCount);

    const rows = [];
    const allErrors = [];
    const allWarnings = [];
    let validCount = 0;

    const seenReferences = new Map(); // referenceKey -> lineNumber
    const seenNames = new Map(); // normalizedName -> lineNumber

    // Pre-fetch active guests' references and names in this event for collision detection
    const existingGuests = await Guest.find({ eventId, deletedAt: null })
      .select('nameSearch referenceKey name reference')
      .lean();

    const existingRefKeys = new Set(
      existingGuests.map((g) => g.referenceKey).filter(Boolean)
    );
    const existingNames = new Set(existingGuests.map((g) => g.nameSearch));

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      // Logical data-row numbering: header is row 1, first data record is row 2.
      // Blank lines are skipped by the parser, so this is a stable logical
      // reference (not a physical source line after quoted multiline records).
      const lineNumber = i + 2; // Line 1 is header
      const rowValidation = validateCsvRow(row, lineNumber);

      const toIssue = (msg, kind) => {
        const lower = String(msg).toLowerCase();
        let field = null;
        let code = kind === 'warning' ? 'DUPLICATE_NAME' : 'IMPORT_INVALID';
        if (lower.includes('allowedcompanions')) { field = 'allowedCompanions'; code = 'VALIDATION_FAILED'; }
        else if (lower.includes('companionnames') || lower.includes('companion name')) { field = 'companionNames'; code = 'VALIDATION_FAILED'; }
        else if (lower.includes('reference')) { field = 'reference'; code = lower.includes('duplicate') || lower.includes('already used') ? 'REFERENCE_CONFLICT' : 'VALIDATION_FAILED'; }
        else if (lower.includes('name')) { field = 'name'; code = kind === 'warning' ? 'DUPLICATE_NAME' : 'VALIDATION_FAILED'; }
        else if (lower.includes('capacity')) { field = null; code = 'CAPACITY_EXCEEDED'; }
        else if (lower.includes('header')) { field = 'header'; code = 'IMPORT_INVALID'; }
        return { row: lineNumber, lineNumber, field, code, message: String(msg) };
      };

      const rowErrors = (rowValidation.errors || []).map((m) => toIssue(m, 'error'));
      const rowWarnings = [];

      if (rowValidation.valid && rowValidation.data) {
        const { name, reference, referenceKey } = rowValidation.data;
        const normName = normalizeForSearch(name);

        // 1. Intra-file duplicate reference check (blocking error)
        if (referenceKey) {
          if (seenReferences.has(referenceKey)) {
            const prevLine = seenReferences.get(referenceKey);
            rowErrors.push({
              row: lineNumber,
              lineNumber,
              field: 'reference',
              code: 'REFERENCE_CONFLICT',
              message: `Row ${lineNumber}: duplicate reference '${reference}' within import file (first defined at row ${prevLine})`,
            });
          } else {
            seenReferences.set(referenceKey, lineNumber);
          }

          // 2. Database reference collision check (blocking error)
          if (existingRefKeys.has(referenceKey)) {
            rowErrors.push({
              row: lineNumber,
              lineNumber,
              field: 'reference',
              code: 'REFERENCE_CONFLICT',
              message: `Row ${lineNumber}: reference '${reference}' is already used by an active guest in this event`,
            });
          }
        }

        // 3. Intra-file matching name check (non-blocking warning)
        if (seenNames.has(normName)) {
          const prevLine = seenNames.get(normName);
          rowWarnings.push({
            row: lineNumber,
            lineNumber,
            field: 'name',
            code: 'DUPLICATE_NAME',
            message: `Row ${lineNumber}: matching name '${name}' found in import file (also at row ${prevLine})`,
          });
        } else {
          seenNames.set(normName, lineNumber);
        }

        // 4. Database matching name check (non-blocking warning)
        if (existingNames.has(normName)) {
          rowWarnings.push({
            row: lineNumber,
            lineNumber,
            field: 'name',
            code: 'DUPLICATE_NAME',
            message: `Row ${lineNumber}: a guest with matching name '${name}' already exists in this event`,
          });
        }
      }

      if (rowErrors.length === 0 && rowValidation.valid) {
        validCount += 1;
      }

      for (const err of rowErrors) {
        allErrors.push(err);
      }
      for (const w of rowWarnings) {
        allWarnings.push(w);
      }

      rows.push({
        lineNumber,
        row: lineNumber,
        valid: rowErrors.length === 0,
        data: rowValidation.data || null,
        errors: rowErrors,
        warnings: rowWarnings,
      });
    }

    // Capacity limit check
    if (validCount > remainingCapacity) {
      allErrors.push({
        row: null,
        lineNumber: null,
        field: null,
        code: 'CAPACITY_EXCEEDED',
        message: `Import of ${validCount} guests exceeds remaining event capacity of ${remainingCapacity}`,
      });
    }

    const canCommit = allErrors.length === 0 && validCount > 0 && validCount <= remainingCapacity;

    return {
      rows,
      errors: allErrors,
      warnings: allWarnings,
      validCount,
      remainingCapacity,
      canCommit,
    };
  },

  /**
   * Commit a CSV import file atomically within a multi-document replica-set transaction.
   * Revalidates original CSV, locks event, verifies capacity/references, bulk-inserts guests
   * with new tokens, and commits audit and idempotency records atomically.
   *
   * @param {string} eventId
   * @param {string} rawCsv
   * @param {string} idempotencyKey
   * @param {object} user
   * @param {object} [context]
   * @param {string} [context.requestId]
   * @returns {Promise<{ createdCount: number, guestIds: string[] }>}
   */
  async commitImport(eventId, rawCsv, idempotencyKey, user, { requestId } = {}) {
    const actorId = user.id || user._id;
    const canonicalHash = IdempotencyService.computeHash(rawCsv);

    try {
      return await withTransaction(async (session) => {
        // 1. Check existing idempotency record
        const existingIdempotency = await IdempotencyService.findExisting(
          {
            actorId,
            operation: 'IMPORT_COMMIT',
            eventId,
            key: idempotencyKey,
          },
          { session }
        );

        if (existingIdempotency) {
          if (existingIdempotency.requestHash !== canonicalHash) {
            throw new DomainError({
              code: ERROR_CODES.IDEMPOTENCY_CONFLICT,
              message: 'Idempotency key was previously used with different content',
              status: 409,
            });
          }
          // Safe playback of committed response
          return existingIdempotency.response.body.data;
        }

        // 2. Event fence: check lifecycle and increment activitySeq
        const event = await Event.findById(eventId).session(session);
        if (!event) {
          throw new DomainError({
            code: ERROR_CODES.NOT_FOUND,
            message: 'Event not found',
            status: 404,
          });
        }

        if (event.status === EVENT_STATUSES.CLOSED) {
          throw new DomainError({
            code: ERROR_CODES.EVENT_CLOSED,
            message: 'Cannot commit imports to a closed event',
            status: 409,
          });
        }

        const fenceResult = await Event.updateOne(
          { _id: eventId, status: { $ne: EVENT_STATUSES.CLOSED } },
          { $inc: { activitySeq: 1 } },
          { session }
        );
        if (fenceResult.matchedCount === 0) {
          throw new DomainError({
            code: ERROR_CODES.EVENT_CLOSED,
            message: 'Cannot commit imports to a closed event',
            status: 409,
          });
        }

        // 3. Re-parse and validate original CSV
        const parseResult = parseAndValidateHeaders(rawCsv);
        if (parseResult.error) {
          throw new DomainError({
            code: ERROR_CODES.IMPORT_INVALID,
            message: parseResult.error,
            status: 422,
          });
        }

        const { records } = parseResult;
        const seenReferences = new Set();
        const validRows = [];
        const validationErrors = [];

        for (let i = 0; i < records.length; i++) {
          const lineNumber = i + 2;
          const rowValidation = validateCsvRow(records[i], lineNumber);

          if (!rowValidation.valid || !rowValidation.data) {
            validationErrors.push(...(rowValidation.errors || []));
            continue;
          }

          const { referenceKey, reference } = rowValidation.data;
          if (referenceKey) {
            if (seenReferences.has(referenceKey)) {
              validationErrors.push(
                `Row ${lineNumber}: duplicate reference '${reference}' within import file`
              );
            } else {
              seenReferences.add(referenceKey);
            }
          }

          validRows.push(rowValidation.data);
        }

        if (validationErrors.length > 0 || validRows.length !== records.length) {
          throw new DomainError({
            code: ERROR_CODES.IMPORT_INVALID,
            message: 'CSV validation failed. Zero guests were committed.',
            status: 422,
            details: { errors: validationErrors },
          });
        }

        // 4. Capacity limit recheck inside transaction
        const activeCount = await GuestsRepository.countActive(eventId, { session });
        if (activeCount + validRows.length > LIMITS.MAX_EVENT_INVITATIONS) {
          throw new DomainError({
            code: ERROR_CODES.CAPACITY_EXCEEDED,
            message: `Import of ${validRows.length} guests exceeds event capacity (${LIMITS.MAX_EVENT_INVITATIONS - activeCount} remaining)`,
            status: 409,
          });
        }

        // 5. Database reference uniqueness recheck inside transaction
        for (const row of validRows) {
          if (row.referenceKey) {
            const conflict = await GuestsRepository.findByReferenceKey(eventId, row.referenceKey, {
              session,
            });
            if (conflict) {
              throw new DomainError({
                code: ERROR_CODES.REFERENCE_CONFLICT,
                message: `Reference '${row.reference}' is already used by another guest in this event`,
                status: 409,
                fieldErrors: { reference: 'Reference already exists in this event' },
              });
            }
          }
        }

        // 6. Generate secure tokens and insert guests
        const createdGuestIds = [];
        const batchShortCodes = new Set();

        for (const row of validRows) {
          const qrToken = generateQrToken();

          let shortCode = null;
          for (let attempt = 0; attempt < 5; attempt++) {
            const candidate = generateShortCode();
            if (batchShortCodes.has(candidate)) continue;
            const exists = await GuestsRepository.existsShortCode(eventId, candidate, { session });
            if (!exists) {
              shortCode = candidate;
              batchShortCodes.add(candidate);
              break;
            }
          }

          if (!shortCode) {
            throw new Error('Failed to generate unique short code during import');
          }

          const guest = await GuestsRepository.create(
            {
              eventId,
              name: row.name,
              nameSearch: row.nameSearch,
              reference: row.reference,
              referenceKey: row.referenceKey,
              allowedCompanions: row.allowedCompanions,
              companionNames: row.companionNames || [],
              qrToken,
              shortCode,
              version: 1,
              checkIn: null,
              deletedAt: null,
            },
            { session }
          );

          createdGuestIds.push(guest._id.toString());
        }

        const responseData = {
          createdCount: createdGuestIds.length,
          guestIds: createdGuestIds,
        };

        // 7. Insert Audit record
        await AuditService.record({
          eventId,
          actorId,
          actorName: user.displayName,
          action: 'IMPORT_COMMIT',
          changes: {
            after: responseData,
          },
          requestId,
          session,
        });

        // 8. Insert Idempotency record
        await IdempotencyService.record(
          {
            actorId,
            operation: 'IMPORT_COMMIT',
            eventId,
            key: idempotencyKey,
            requestHash: canonicalHash,
            status: 201,
            body: { data: responseData },
          },
          { session }
        );

        return responseData;
      });
    } catch (err) {
      // If concurrent identical requests race on the unique idempotency index (E11000)
      if (err && err.code === 11000) {
        const existing = await IdempotencyService.findExisting({
          actorId,
          operation: 'IMPORT_COMMIT',
          eventId,
          key: idempotencyKey,
        });
        if (existing) {
          return existing.response.body.data;
        }
      }
      throw err;
    }
  },

  /**
   * Return a downloadable UTF-8 BOM CSV template.
   *
   * @param {string} [locale='ar']
   * @returns {string} UTF-8 BOM CSV string
   */
  getTemplate(locale = 'ar') {
    return CSV_TEMPLATES[locale] || CSV_TEMPLATES.ar;
  },
};
