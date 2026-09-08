/**
 * @halaa-checkin/api
 * Rate limiting middleware with structured domain error envelopes.
 */

import rateLimit from 'express-rate-limit';
import { ERROR_CODES, createErrorEnvelope } from '@halaa-checkin/contracts';

/**
 * Custom rate limit handler returning standard error envelope.
 */
function rateLimitHandler(message) {
  return function (req, res) {
    res.status(429).json(
      createErrorEnvelope({
        code: ERROR_CODES.RATE_LIMITED,
        message: message || 'Too many requests. Please try again later.',
        requestId: req.id || '',
      })
    );
  };
}

/**
 * Create a rate limiter for the login endpoint.
 *
 * @param {object} [options]
 * @returns {import('express').RequestHandler}
 */
export function createLoginRateLimiter(options = {}) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: options.max !== undefined ? options.max : 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler('Too many login attempts. Please try again later.'),
    ...options,
  });
}

/**
 * Create a general API rate limiter.
 *
 * @param {object} [options]
 * @returns {import('express').RequestHandler}
 */
export function createApiRateLimiter(options = {}) {
  return rateLimit({
    windowMs: 60 * 1000,
    max: options.max !== undefined ? options.max : 120,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler('Rate limit exceeded. Please slow down.'),
    ...options,
  });
}

export const loginRateLimiter = createLoginRateLimiter();
export const apiRateLimiter = createApiRateLimiter();
