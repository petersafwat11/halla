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
  withIdempotency: idempotency.withIdempotency,
  sha256: idempotency.sha256,
  IdempotencyConflictError: idempotency.IdempotencyConflictError,
  IdempotencyPendingTimeoutError: idempotency.IdempotencyPendingTimeoutError,
};
