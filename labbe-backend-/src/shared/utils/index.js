/**
 * Shared Utils Index
 * @module shared/utils
 */

const catchAsync = require('./catchAsync');
const responseHelper = require('./responseHelper');
const s3Upload = require('./s3Upload');

module.exports = {
  catchAsync,
  ...responseHelper,
  s3Upload,
};
