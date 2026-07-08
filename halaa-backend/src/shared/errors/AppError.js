/**
 * Application Error Class
 * Base error class for all operational errors
 * @module shared/errors/AppError
 */

class AppError extends Error {
  /**
   * Create an operational error
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {string} [code] - Error code for client identification
   */
  constructor(message, statusCode, code = null) {
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to JSON response format
   * @returns {Object}
   */
  toJSON() {
    return {
      success: false,
      status: this.status,
      message: this.message,
      code: this.code,
    };
  }
}

module.exports = AppError;
