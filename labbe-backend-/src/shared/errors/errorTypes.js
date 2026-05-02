/**
 * Specialized Error Types
 * Extends AppError for specific error scenarios
 * @module shared/errors/errorTypes
 */

const AppError = require('./AppError');

/**
 * Resource not found error (404)
 */
class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.resource = resource;
  }
}

/**
 * Authentication required error (401)
 */
class UnauthorizedError extends AppError {
  constructor(message = 'Please log in to access this resource') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

/**
 * Permission denied error (403)
 */
class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action') {
    super(message, 403, 'FORBIDDEN');
  }
}

/**
 * Input validation error (400)
 */
class ValidationError extends AppError {
  constructor(message = 'Validation failed', errors = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      errors: this.errors,
    };
  }
}

/**
 * Duplicate resource error (409)
 */
class ConflictError extends AppError {
  constructor(message = 'Resource already exists', field = null) {
    super(message, 409, 'CONFLICT');
    this.field = field;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      field: this.field,
    };
  }
}

/**
 * Subscription/Plan limit exceeded error (403)
 */
class PackageLimitError extends AppError {
  constructor(feature, limit, currentUsage = null) {
    super(
      `You have reached the ${feature} limit (${limit}). Please upgrade your plan.`,
      403,
      'PACKAGE_LIMIT_EXCEEDED'
    );
    this.feature = feature;
    this.limit = limit;
    this.currentUsage = currentUsage;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      feature: this.feature,
      limit: this.limit,
      currentUsage: this.currentUsage,
    };
  }
}

/**
 * Payment/Subscription required error (402)
 */
class PaymentRequiredError extends AppError {
  constructor(message = 'Please subscribe to a plan to access this feature') {
    super(message, 402, 'PAYMENT_REQUIRED');
  }
}

/**
 * Account status error (403)
 * For suspended, inactive, or rejected accounts
 */
class AccountStatusError extends AppError {
  constructor(status, message = null) {
    const messages = {
      suspended: 'Your account has been suspended. Please contact support.',
      inactive: 'Your account is inactive.',
      rejected: 'Your account application was rejected.',
      pending: 'Your account is pending approval.',
    };
    super(message || messages[status] || 'Account status error', 403, 'ACCOUNT_STATUS_ERROR');
    this.accountStatus = status;
  }
}

/**
 * Account locked error (423)
 * For accounts locked due to failed login attempts
 */
class AccountLockedError extends AppError {
  constructor(remainingMinutes) {
    super(
      `Account temporarily locked due to too many failed attempts. Try again in ${remainingMinutes} minutes.`,
      423,
      'ACCOUNT_LOCKED'
    );
    this.remainingMinutes = remainingMinutes;
  }
}

/**
 * Rate limit exceeded error (429)
 */
class RateLimitError extends AppError {
  constructor(message = 'Too many requests. Please try again later.') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

/**
 * OTP related errors (400)
 */
class OTPError extends AppError {
  constructor(type = 'invalid', message = null) {
    const messages = {
      invalid: 'Invalid OTP code',
      expired: 'OTP has expired',
      already_used: 'OTP has already been used',
      max_attempts: 'Maximum OTP attempts exceeded',
      cooldown: 'Please wait before requesting a new OTP',
    };
    super(message || messages[type] || 'OTP error', 400, 'OTP_ERROR');
    this.otpErrorType = type;
  }
}

module.exports = {
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
  ConflictError,
  PackageLimitError,
  PaymentRequiredError,
  AccountStatusError,
  AccountLockedError,
  RateLimitError,
  OTPError,
};
