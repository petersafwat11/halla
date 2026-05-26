/**
 * Global Error Handler
 * Express error handling middleware
 * @module shared/errors/globalErrorHandler
 */

const config = require('../../config');
const AppError = require('./AppError');
const { ValidationError } = require('./errorTypes');

/**
 * Handle MongoDB CastError (invalid ObjectId)
 * @param {Error} err
 * @returns {AppError}
 */
const handleCastErrorDB = (err) => {
  return new AppError(`Invalid ${err.path}: ${err.value}`, 400, 'INVALID_ID');
};

/**
 * Handle MongoDB duplicate key error
 * @param {Error} err
 * @returns {AppError}
 */
const handleDuplicateFieldsDB = (err) => {
  const field = Object.keys(err.keyValue || {})[0] || 'field';
  const value = err.keyValue ? err.keyValue[field] : 'unknown';
  
  // User-friendly messages for common duplicate fields
  const fieldMessages = {
    email: 'This email is already registered',
    phoneNumber: 'This phone number is already registered',
    username: 'This username is already taken',
  };

  const message = fieldMessages[field] || `${field} already exists: ${value}`;
  const error = new AppError(message, 409, 'DUPLICATE_FIELD');
  error.field = field;
  return error;
};

/**
 * Handle Mongoose validation error
 * @param {Error} err
 * @returns {ValidationError}
 */
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => ({
    field: el.path,
    message: el.message,
  }));
  return new ValidationError('Validation failed', errors);
};

/**
 * Handle JWT invalid token error
 * @returns {AppError}
 */
const handleJWTError = () => {
  return new AppError('Invalid token. Please log in again.', 401, 'INVALID_TOKEN');
};

/**
 * Handle JWT expired token error
 * @returns {AppError}
 */
const handleJWTExpiredError = () => {
  return new AppError('Your session has expired. Please log in again.', 401, 'TOKEN_EXPIRED');
};

/**
 * Send error response in development mode
 * Includes full error details for debugging
 * @param {Error} err
 * @param {Object} res
 */
const sendErrorDev = (err, res) => {
  const response = {
    success: false,
    status: err.status,
    message: err.message,
    code: err.code || null,
  };
  // Mirror the prod top-level shape so clients see the same fields in both
  // environments. Without this, the structured fields (field/errors/meta/
  // otpErrorType/etc.) end up nested under `error` only in dev, and any
  // client logic that reads them silently breaks.
  if (err.errors) response.errors = err.errors;
  if (err.field) response.field = err.field;
  if (err.feature) response.feature = err.feature;
  if (err.otpErrorType) response.otpErrorType = err.otpErrorType;
  if (err.accountStatus) response.accountStatus = err.accountStatus;
  if (err.remainingMinutes !== undefined) response.remainingMinutes = err.remainingMinutes;
  if (err.retryAfterSeconds !== undefined) response.retryAfterSeconds = err.retryAfterSeconds;
  if (err.meta) response.meta = err.meta;
  if (err.body && typeof err.body === 'object') Object.assign(response, err.body);
  response.error = err;
  response.stack = err.stack;
  res.status(err.statusCode).json(response);
};

/**
 * Send error response in production mode
 * Hides internal error details from client
 * @param {Error} err
 * @param {Object} res
 */
const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    const response = {
      success: false,
      status: err.status,
      message: err.message,
      code: err.code || null,
    };

    // Include additional error data if present
    if (err.errors) response.errors = err.errors;
    if (err.field) response.field = err.field;
    if (err.feature) response.feature = err.feature;
    if (err.otpErrorType) response.otpErrorType = err.otpErrorType;
    if (err.accountStatus) response.accountStatus = err.accountStatus;
    if (err.remainingMinutes !== undefined) response.remainingMinutes = err.remainingMinutes;
    if (err.retryAfterSeconds !== undefined) response.retryAfterSeconds = err.retryAfterSeconds;
    if (err.meta) response.meta = err.meta;
    if (err.body && typeof err.body === 'object') Object.assign(response, err.body);

    res.status(err.statusCode).json(response);
  } else {
    // Programming or unknown error: don't leak details
    console.error('💥 UNEXPECTED ERROR:', err);

    res.status(500).json({
      success: false,
      status: 'error',
      message: 'Something went wrong. Please try again later.',
      code: 'INTERNAL_ERROR',
    });
  }
};

/**
 * Global error handling middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log error for monitoring
  if (err.statusCode >= 500) {
    console.error(`[${new Date().toISOString()}] ${err.statusCode} - ${err.message}`);
    if (config.isDev) {
      console.error(err.stack);
    }
  }

  // Transform known error types in both dev and prod
  let error = Object.create(err);
  error.message = err.message;
  error.statusCode = err.statusCode;
  error.status = err.status;
  error.code = err.code;
  error.isOperational = err.isOperational;

  if (err.name === 'CastError') error = handleCastErrorDB(err);
  if (err.code === 11000) error = handleDuplicateFieldsDB(err);
  if (err.name === 'ValidationError' && err.errors) error = handleValidationErrorDB(err);
  if (err.name === 'JsonWebTokenError') error = handleJWTError();
  if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

  if (config.isDev) {
    sendErrorDev(error, res);
  } else {
    sendErrorProd(error, res);
  }
};
