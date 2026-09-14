/**
 * Shared Utils Index
 * @module shared/utils
 */

const catchAsync = require('./catchAsync');
const responseHelper = require('./responseHelper');
const localUpload = require('./localUpload');
const idempotency = require('./idempotency');

module.exports = {
  catchAsync,
  ...responseHelper,
  localUpload,
  withIdempotency: idempotency.withIdempotency,
  sha256: idempotency.sha256,
  IdempotencyConflictError: idempotency.IdempotencyConflictError,
  IdempotencyPendingTimeoutError: idempotency.IdempotencyPendingTimeoutError,
};
