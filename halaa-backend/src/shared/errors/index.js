/**
 * Error Handling Exports
 * @module shared/errors
 */

const AppError = require('./AppError');
const errorTypes = require('./errorTypes');
const globalErrorHandler = require('./globalErrorHandler');

module.exports = {
  AppError,
  ...errorTypes,
  globalErrorHandler,
};
