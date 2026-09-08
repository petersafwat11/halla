/**
 * @halaa-checkin/api
 * Origin validation and CSRF protection middleware.
 * Adheres to Technical Contract Section 2.
 */

import { ERROR_CODES, DomainError } from '@halaa-checkin/contracts';
import { safeCompare } from '../utils/crypto.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Creates CSRF and Origin verification middleware.
 *
 * @param {object} config
 * @returns {import('express').RequestHandler}
 */
export function createCsrfMiddleware(config) {
  return function csrfMiddleware(req, res, next) {
    // 1. Safe methods bypass mutation checks
    if (SAFE_METHODS.has(req.method)) {
      return next();
    }

    // 2. Strict Origin check on all unsafe browser API routes
    const origin = req.headers.origin;
    if (!origin || origin !== config.appOrigin) {
      return next(
        new DomainError({
          code: ERROR_CODES.FORBIDDEN,
          message: 'Cross-origin or missing Origin header rejected',
          status: 403,
        })
      );
    }

    // 3. Content-Type check on requests with bodies (application/json required)
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    const hasBody = contentLength > 0 || req.headers['transfer-encoding'] === 'chunked';
    if (hasBody && !req.is('application/json')) {
      return next(
        new DomainError({
          code: ERROR_CODES.VALIDATION_FAILED,
          message: 'Content-Type must be application/json',
          status: 400,
        })
      );
    }

    // 4. Authenticated unsafe requests require a matching X-CSRF-Token header
    if (req.session) {
      const csrfHeader = req.headers['x-csrf-token'];
      if (!csrfHeader || typeof csrfHeader !== 'string' || !safeCompare(csrfHeader, req.session.csrfToken)) {
        return next(
          new DomainError({
            code: ERROR_CODES.CSRF_INVALID,
            message: 'Invalid or missing X-CSRF-Token header',
            status: 403,
          })
        );
      }
    }

    return next();
  };
}
