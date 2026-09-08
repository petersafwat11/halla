/**
 * @halaa-checkin/api
 * Centralized error handling and request ID middleware.
 * Adheres to Technical Contract Section 4.
 */

import crypto from 'node:crypto';
import { ERROR_CODES, DomainError, createErrorEnvelope } from '@halaa-checkin/contracts';

/**
 * Middleware to generate a unique server-side request ID and security headers.
 */
export function requestIdMiddleware(req, res, next) {
  req.id = `req_${crypto.randomBytes(12).toString('hex')}`;
  res.setHeader('X-Request-Id', req.id);
  // Ensure private responses are never cached by intermediate proxies
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  next();
}

/**
 * Central Express error-handling middleware.
 */
export function errorHandler(err, req, res, _next) {
  const requestId = req.id || '';

  // 1. Domain Errors
  if (err instanceof DomainError) {
    return res.status(err.status).json(
      createErrorEnvelope({
        code: err.code,
        message: err.message,
        fieldErrors: err.fieldErrors,
        requestId,
        details: err.details,
      })
    );
  }

  // 2. Zod Validation Errors
  if (err && (err.name === 'ZodError' || Array.isArray(err.issues))) {
    const fieldErrors = {};
    for (const issue of err.issues || []) {
      const field = issue.path && issue.path.length > 0 ? issue.path.join('.') : 'root';
      fieldErrors[field] = issue.message;
    }

    return res.status(400).json(
      createErrorEnvelope({
        code: ERROR_CODES.VALIDATION_FAILED,
        message: 'Validation failed',
        fieldErrors,
        requestId,
      })
    );
  }

  // 3. Malformed JSON Body Errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json(
      createErrorEnvelope({
        code: ERROR_CODES.VALIDATION_FAILED,
        message: 'Malformed JSON payload',
        requestId,
      })
    );
  }

  // 4. MongoDB Duplicate Key (E11000) errors
  if (err && err.code === 11000) {
    const isRefConflict =
      (err.keyPattern && err.keyPattern.referenceKey) ||
      (err.message && err.message.includes('referenceKey'));

    if (isRefConflict) {
      return res.status(409).json(
        createErrorEnvelope({
          code: ERROR_CODES.REFERENCE_CONFLICT,
          message: 'Reference is already used by another guest in this event',
          fieldErrors: { reference: 'Reference already exists in this event' },
          requestId,
        })
      );
    }

    return res.status(409).json(
      createErrorEnvelope({
        code: ERROR_CODES.VERSION_CONFLICT,
        message: 'A resource conflict occurred',
        requestId,
      })
    );
  }

  // 5. Unexpected server error
  return res.status(500).json(
    createErrorEnvelope({
      code: ERROR_CODES.SERVICE_UNAVAILABLE,
      message: 'Internal server error',
      requestId,
    })
  );
}
