/**
 * Shared Utils Index
 * @module shared/utils
 */

const catchAsync = require('./catchAsync');
const responseHelper = require('./responseHelper');
const s3Upload = require('./s3Upload');
const idempotency = require('./idempotency');

module.exports = {
  catchAsync,
  ...responseHelper,
  s3Upload,
  // Idempotency helpers (Phase 1b foundation, post-H-5/H-6 fixes)
  withIdempotency: idempotency.withIdempotency,
  sha256: idempotency.sha256,
  IdempotencyConflictError: idempotency.IdempotencyConflictError,
  IdempotencyPendingTimeoutError: idempotency.IdempotencyPendingTimeoutError,
};
