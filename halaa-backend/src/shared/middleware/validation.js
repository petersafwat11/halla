/**
 * Validation Middleware
 * Common validation utilities for request data
 */

const AppError = require("../errors/AppError");
const { ValidationError } = require("../errors/errorTypes");
const validator = require("validator");

/**
 * Validate MongoDB ObjectId
 * @param {string} paramName - Name of the route parameter to validate
 */
exports.validateObjectId = (paramName = "id") => {
  return (req, res, next) => {
    const id = req.params[paramName];

    if (!id) {
      return next(new AppError(`${paramName} is required`, 400));
    }

    const objectIdPattern = /^[0-9a-fA-F]{24}$/;

    if (!objectIdPattern.test(id)) {
      return next(new AppError(`Invalid ${paramName} format`, 400));
    }

    next();
  };
};

/**
 * Validate email format using validator.js
 * @param {string} fieldName - Name of the field containing email
 * @param {Object} options - Validation options
 * @param {boolean} options.required - Whether the field is required
 */
exports.validateEmail = (fieldName = "email", options = {}) => {
  return (req, res, next) => {
    const email = req.body[fieldName];

    if (!email) {
      if (options.required) {
        return next(new AppError(`${fieldName} is required`, 400));
      }
      return next();
    }

    if (typeof email !== "string") {
      return next(new AppError(`${fieldName} must be a string`, 400));
    }

    const trimmedEmail = email.trim();

    if (!validator.isEmail(trimmedEmail)) {
      return next(new AppError("Invalid email format", 400));
    }

    req.body[fieldName] =
      validator.normalizeEmail(trimmedEmail) || trimmedEmail.toLowerCase();

    next();
  };
};

const { isValidPhone, normalizePhoneNumber, normalizeDigits } = require("../utils/phone");

/**
 * Validate phone number format
 * @param {string} fieldName - Name of the field containing the phone number
 * @param {Object} options - Validation options
 * @param {boolean} options.required - Whether the field is required (default: true)
 * @param {boolean} options.saudiOnly - Whether to only accept Saudi format (default: true)
 */
exports.validatePhoneNumber = (fieldName = "phoneNumber", options = {}) => {
  const opts = { required: true, saudiOnly: true, ...options };

  return (req, res, next) => {
    let phone = req.body[fieldName];

    if (!phone) {
      if (opts.required) {
        return next(new AppError(`${fieldName} is required`, 400));
      }
      return next();
    }

    if (typeof phone !== "string") {
      phone = String(phone);
    }

    phone = normalizeDigits(phone).replace(/[\s\-\(\)\.]/g, "");

    if (opts.saudiOnly) {
      if (!isValidPhone(phone)) {
        return next(
          new AppError(
            "Invalid phone number format. Must be 10 digits starting with 05 or 9 digits starting with 5",
            400
          )
        );
      }
    } else {
      const phonePattern = /^[\+]?[0-9]{7,15}$/;
      if (!phonePattern.test(phone)) {
        return next(new AppError("Invalid phone number format", 400));
      }
    }

    req.body[fieldName] = phone;
    next();
  };
};

/**
 * Validate password strength
 * @param {string} fieldName - Name of the field containing password
 * @param {Object} options - Validation options
 * @param {boolean} options.required - Whether the field is required
 */
exports.validatePassword = (fieldName = "password", options = {}) => {
  return (req, res, next) => {
    const password = req.body[fieldName];

    if (!password) {
      if (options.required) {
        return next(new AppError(`${fieldName} is required`, 400));
      }
      return next();
    }

    if (typeof password !== "string") {
      return next(new AppError(`${fieldName} must be a string`, 400));
    }

    if (password.length < 8) {
      return next(
        new AppError("Password must be at least 8 characters long", 400)
      );
    }

    if (password.length > 128) {
      return next(
        new AppError("Password must be less than 128 characters", 400)
      );
    }

    if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]+$/.test(password)) {
      return next(
        new AppError(
          "Password may contain letters and numbers only and must include at least one of each",
          400
        )
      );
    }

    next();
  };
};

/**
 * Validate string length
 * @param {string} fieldName - Name of the field to validate
 * @param {Object} options - Validation options
 * @param {number} options.min - Minimum length
 * @param {number} options.max - Maximum length
 * @param {boolean} options.required - Whether the field is required
 */
exports.validateStringLength = (fieldName, options = {}) => {
  return (req, res, next) => {
    const value = req.body[fieldName];

    if (!value) {
      if (options.required) {
        return next(new AppError(`${fieldName} is required`, 400));
      }
      return next();
    }

    if (typeof value !== "string") {
      return next(new AppError(`${fieldName} must be a string`, 400));
    }

    const trimmed = value.trim();

    if (options.min !== undefined && trimmed.length < options.min) {
      return next(
        new AppError(
          `${fieldName} must be at least ${options.min} characters long`,
          400
        )
      );
    }

    if (options.max !== undefined && trimmed.length > options.max) {
      return next(
        new AppError(
          `${fieldName} must be less than ${options.max} characters`,
          400
        )
      );
    }

    req.body[fieldName] = trimmed;
    next();
  };
};

/**
 * Validate array field
 * @param {string} fieldName - Name of the field
 * @param {Object} options - Validation options
 * @param {number} options.minLength - Minimum array length
 * @param {number} options.maxLength - Maximum array length
 * @param {string} options.itemType - Expected type of items
 */
exports.validateArray = (fieldName, options = {}) => {
  return (req, res, next) => {
    const array = req.body[fieldName];

    if (!array) {
      return next();
    }

    if (!Array.isArray(array)) {
      return next(new AppError(`${fieldName} must be an array`, 400));
    }

    if (options.minLength !== undefined && array.length < options.minLength) {
      return next(
        new AppError(
          `${fieldName} must have at least ${options.minLength} items`,
          400
        )
      );
    }

    if (options.maxLength !== undefined && array.length > options.maxLength) {
      return next(
        new AppError(
          `${fieldName} cannot have more than ${options.maxLength} items`,
          400
        )
      );
    }

    if (options.itemType) {
      const invalidItems = array.some(
        (item) => typeof item !== options.itemType
      );
      if (invalidItems) {
        return next(
          new AppError(
            `All items in ${fieldName} must be of type ${options.itemType}`,
            400
          )
        );
      }
    }

    next();
  };
};

/**
 * Validate array of MongoDB ObjectIds
 * @param {string} fieldName - Name of the field containing the array
 */
exports.validateObjectIdArray = (fieldName) => {
  return (req, res, next) => {
    const array = req.body[fieldName];

    if (!array) {
      return next();
    }

    if (!Array.isArray(array)) {
      return next(new AppError(`${fieldName} must be an array`, 400));
    }

    const objectIdPattern = /^[0-9a-fA-F]{24}$/;

    const invalidIds = array.some((id) => !objectIdPattern.test(id));

    if (invalidIds) {
      return next(new AppError(`Invalid ${fieldName} format`, 400));
    }

    next();
  };
};

/**
 * Validate pagination parameters
 */
exports.validatePagination = (req, res, next) => {
  let { page, limit, skip } = req.query;

  page = parseInt(page) || 1;
  limit = parseInt(limit) || 10;

  if (page < 1) page = 1;
  if (limit < 1) limit = 1;
  if (limit > 100) limit = 100;

  skip = skip ? parseInt(skip) : (page - 1) * limit;

  req.pagination = { page, limit, skip };
  next();
};

exports.validatePhone = exports.validatePhoneNumber;

/**
 * Validate vendor signup data
 */
exports.validateVendorSignup = [
  exports.validateEmail("email", { required: true }),
  exports.validatePhoneNumber("phoneNumber", { required: true }),
  exports.validatePassword("password", { required: true }),
  exports.validateStringLength("brandName", {
    required: true,
    min: 2,
    max: 100,
  }),
  exports.validateStringLength("ownerFullName", {
    required: true,
    min: 2,
    max: 100,
  }),
];

/**
 * Validate event creation data
 */
exports.validateEventCreation = (req, res, next) => {
  if (!req.body.eventDetails && !req.body.guestList) {
    return next(new AppError("Event details or guest list is required", 400));
  }
  next();
};

/**
 * Generic Joi schema validation middleware
 * @param {Object} schema - Joi schema object
 * @param {string} [source='body'] - Request property to validate ('body', 'query', 'params')
 * @returns {Function} Express middleware
 */
exports.validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], { abortEarly: false, stripUnknown: true });
    if (error) {
      const message = error.details.map(d => d.message).join(', ');
      return next(new AppError(message, 400));
    }
    req[source] = value;
    next();
  };
};

/**
 * Parse JSON-encoded fields from a multipart/form-data request body.
 * Multer delivers FormData text fields as raw strings; this middleware
 * walks a list of expected keys and JSON.parses any that are strings.
 * Non-string values pass through untouched. Invalid JSON returns 400.
 *
 * Apply AFTER the upload middleware and BEFORE `validateZod`.
 *
 * @param {string[]} fields - Body keys whose values should be JSON.parsed
 */
exports.parseFormDataJsonFields = (fields = []) => {
  return (req, res, next) => {
    if (!req.body) return next();
    for (const key of fields) {
      const value = req.body[key];
      if (typeof value !== 'string') continue;
      const trimmed = value.trim();
      if (trimmed === '') {
        delete req.body[key];
        continue;
      }
      try {
        req.body[key] = JSON.parse(trimmed);
      } catch (err) {
        return next(
          new AppError(`Invalid JSON in field "${key}": ${err.message}`, 400)
        );
      }
    }
    next();
  };
};

/**
 * Generic Zod schema validation middleware
 * Mirrors `validate` but accepts a Zod schema. On parse success the parsed
 * (coerced + stripped) value replaces req[source] so downstream handlers
 * read the canonical shape.
 *
 * @param {import('zod').ZodTypeAny} schema - Zod schema
 * @param {string} [source='body'] - Request property to validate ('body', 'query', 'params')
 * @returns {Function} Express middleware
 */
exports.validateZod = (schema, source = 'body') => {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      // Produce a structured errors[] so clients can attach inline field
      // errors. We still build a flat `message` for non-localized consumers.
      const errors = result.error.issues.map((i) => ({
        field: i.path.join('.') || source,
        message: i.message,
        code: i.code,
      }));
      const message = errors
        .map((e) => `${e.field}: ${e.message}`)
        .join(', ');
      return next(new ValidationError(message, errors));
    }
    req[source] = result.data;
    next();
  };
};
