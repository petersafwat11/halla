/**
 * @halaa-checkin/contracts
 * Shared domain error codes, DomainError class, and standard API response envelopes.
 */

export const ERROR_CODES = Object.freeze({
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  CSRF_INVALID: 'CSRF_INVALID',
  NOT_FOUND: 'NOT_FOUND',
  EVENT_NOT_LIVE: 'EVENT_NOT_LIVE',
  EVENT_CLOSED: 'EVENT_CLOSED',
  VERSION_CONFLICT: 'VERSION_CONFLICT',
  ALREADY_CHECKED_IN: 'ALREADY_CHECKED_IN',
  INVALID_INVITATION: 'INVALID_INVITATION',
  REFERENCE_CONFLICT: 'REFERENCE_CONFLICT',
  CAPACITY_EXCEEDED: 'CAPACITY_EXCEEDED',
  IMPORT_INVALID: 'IMPORT_INVALID',
  IDEMPOTENCY_CONFLICT: 'IDEMPOTENCY_CONFLICT',
  EXPORT_NOT_READY: 'EXPORT_NOT_READY',
  EXPORT_EXPIRED: 'EXPORT_EXPIRED',
  EXPORT_FAILED: 'EXPORT_FAILED',
  RATE_LIMITED: 'RATE_LIMITED',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
});

export const ERROR_CODE_VALUES = Object.freeze(Object.values(ERROR_CODES));

/**
 * Standard HTTP status codes associated with domain error codes.
 */
export const ERROR_STATUS_MAP = Object.freeze({
  [ERROR_CODES.VALIDATION_FAILED]: 400,
  [ERROR_CODES.UNAUTHENTICATED]: 401,
  [ERROR_CODES.FORBIDDEN]: 403,
  [ERROR_CODES.CSRF_INVALID]: 403,
  [ERROR_CODES.NOT_FOUND]: 404,
  [ERROR_CODES.INVALID_INVITATION]: 404,
  [ERROR_CODES.EVENT_NOT_LIVE]: 409,
  [ERROR_CODES.EVENT_CLOSED]: 409,
  [ERROR_CODES.VERSION_CONFLICT]: 409,
  [ERROR_CODES.ALREADY_CHECKED_IN]: 409,
  [ERROR_CODES.REFERENCE_CONFLICT]: 409,
  [ERROR_CODES.CAPACITY_EXCEEDED]: 409,
  [ERROR_CODES.IDEMPOTENCY_CONFLICT]: 409,
  [ERROR_CODES.EXPORT_NOT_READY]: 409,
  [ERROR_CODES.EXPORT_FAILED]: 409,
  [ERROR_CODES.EXPORT_EXPIRED]: 410,
  [ERROR_CODES.IMPORT_INVALID]: 422,
  [ERROR_CODES.RATE_LIMITED]: 429,
  [ERROR_CODES.SERVICE_UNAVAILABLE]: 503,
});

/**
 * Custom Domain Error for Halaa Check-in business and validation rules.
 */
export class DomainError extends Error {
  /**
   * @param {object} params
   * @param {string} params.code One of ERROR_CODES
   * @param {string} params.message Human-readable safe fallback message
   * @param {number} [params.status] HTTP status code (defaults to ERROR_STATUS_MAP[code] || 400)
   * @param {Record<string, string>} [params.fieldErrors] Field-level validation errors
   * @param {object} [params.details] Safe projection of contextual error details
   */
  constructor({ code, message, status, fieldErrors = {}, details = {} }) {
    super(message || code);
    this.name = 'DomainError';
    this.code = code;
    this.status = status || ERROR_STATUS_MAP[code] || 400;
    this.fieldErrors = fieldErrors || {};
    this.details = details || {};
  }
}

/**
 * Create a structured error response envelope matching Section 4.
 *
 * @param {object} params
 * @param {string} params.code
 * @param {string} params.message
 * @param {Record<string, string>} [params.fieldErrors]
 * @param {string} [params.requestId]
 * @param {object} [params.details]
 * @returns {{ error: { code: string, message: string, fieldErrors: Record<string, string>, requestId: string, details: object } }}
 */
export function createErrorEnvelope({
  code,
  message,
  fieldErrors = {},
  requestId = '',
  details = {},
}) {
  return {
    error: {
      code,
      message: message || code,
      fieldErrors: fieldErrors || {},
      requestId: requestId || '',
      details: details || {},
    },
  };
}

/**
 * Create a structured success response envelope.
 *
 * @template T
 * @param {T} data
 * @param {object} [meta]
 * @returns {{ data: T, meta?: object }}
 */
export function createSuccessEnvelope(data, meta) {
  const envelope = { data };
  if (meta !== undefined && meta !== null) {
    envelope.meta = meta;
  }
  return envelope;
}

/**
 * Create a structured paginated list response envelope.
 *
 * @template T
 * @param {T[]} data
 * @param {{ page: number, pageSize: number, total: number }} meta
 * @returns {{ data: T[], meta: { page: number, pageSize: number, total: number } }}
 */
export function createPaginatedEnvelope(data, { page, pageSize, total }) {
  return {
    data: Array.isArray(data) ? data : [],
    meta: {
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 25,
      total: Number(total) || 0,
    },
  };
}
