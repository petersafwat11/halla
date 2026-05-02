/**
 * Auth Validation Schemas
 * Joi schemas for input validation
 * @module modules/auth/auth.validation
 */

const Joi = require('joi');

/**
 * Phone number pattern (Saudi format)
 */
const phonePattern = /^(\+966|966|0)?5\d{8}$/;

/**
 * Password requirements
 */
const passwordSchema = Joi.string()
  .min(8)
  .max(128)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  .messages({
    'string.min': 'Password must be at least 8 characters',
    'string.max': 'Password must be at most 128 characters',
    'string.pattern.base': 'Password must contain uppercase, lowercase, and number',
  });

/**
 * Login schema
 */
const loginSchema = Joi.object({
  email: Joi.string().email().lowercase(),
  phoneNumber: Joi.string().pattern(phonePattern),
  password: Joi.string().required(),
}).or('email', 'phoneNumber').messages({
  'object.missing': 'Email or phone number is required',
});

/**
 * Host signup schema
 */
const hostSignupSchema = Joi.object({
  email: Joi.string().email().lowercase(),
  phoneNumber: Joi.string().pattern(phonePattern).required().messages({
    'string.pattern.base': 'Invalid Saudi phone number format',
    'any.required': 'Phone number is required',
  }),
  password: passwordSchema.required(),
  passwordConfirm: Joi.string().valid(Joi.ref('password')).required().messages({
    'any.only': 'Passwords do not match',
  }),
  username: Joi.string().min(3).max(50).pattern(/^[a-zA-Z0-9_]+$/),
  name: Joi.string().min(2).max(100),
});

/**
 * Vendor signup schema
 */
const vendorSignupSchema = Joi.object({
  email: Joi.string().email().lowercase().required(),
  phoneNumber: Joi.string().pattern(phonePattern).required(),
  password: passwordSchema.required(),
  brandName: Joi.string().min(2).max(100).required(),
  ownerFullName: Joi.string().min(2).max(100).required(),
  serviceDescription: Joi.string().max(1000),
  serviceCategories: Joi.alternatives().try(Joi.string(), Joi.object()),
  serviceLocation: Joi.alternatives().try(Joi.string(), Joi.object()),
  socialLinks: Joi.alternatives().try(Joi.string(), Joi.object()),
  nationalId: Joi.string(),
  commercialRecordNumber: Joi.string(),
  otherData: Joi.string(),
});

/**
 * Whitelabel signup schema
 */
const whitelabelSignupSchema = Joi.object({
  email: Joi.string().email().lowercase(),
  phoneNumber: Joi.string().pattern(phonePattern),
  englishName: Joi.string().min(2).max(100),
  arabicName: Joi.string().min(2).max(100),
  platformName: Joi.string().max(100),
  companyName: Joi.string().max(100),
  requirements: Joi.alternatives().try(Joi.string(), Joi.object()),
  address: Joi.alternatives().try(Joi.string(), Joi.object()),
  planSelection: Joi.alternatives().try(Joi.string(), Joi.object()),
  licenseNumber: Joi.string(),
  taxNumber: Joi.string(),
}).or('email', 'phoneNumber');

/**
 * OTP send schema
 */
const otpSendSchema = Joi.object({
  phoneNumber: Joi.string().pattern(phonePattern).required().messages({
    'string.pattern.base': 'Invalid Saudi phone number format',
    'any.required': 'Phone number is required',
  }),
});

/**
 * OTP verify schema
 */
const otpVerifySchema = Joi.object({
  phoneNumber: Joi.string().pattern(phonePattern).required(),
  otp: Joi.string().length(6).pattern(/^\d+$/).required().messages({
    'string.length': 'OTP must be 6 digits',
    'string.pattern.base': 'OTP must contain only digits',
  }),
});

/**
 * OTP resend schema
 */
const otpResendSchema = Joi.object({
  phoneNumber: Joi.string().pattern(phonePattern).required(),
  type: Joi.string().valid('signup', 'login').required(),
});

/**
 * Forgot password schema
 */
const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().lowercase().required(),
});

/**
 * Reset password schema
 */
const resetPasswordSchema = Joi.object({
  password: passwordSchema.required(),
  passwordConfirm: Joi.string().valid(Joi.ref('password')).required().messages({
    'any.only': 'Passwords do not match',
  }),
});

/**
 * Update password schema
 */
const updatePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: passwordSchema.required(),
  passwordConfirm: Joi.string().valid(Joi.ref('newPassword')).required().messages({
    'any.only': 'Passwords do not match',
  }),
});

/**
 * Complete profile schema
 */
const completeProfileSchema = Joi.object({
  username: Joi.string().min(3).max(50).pattern(/^[a-zA-Z0-9_]+$/),
  email: Joi.string().email().lowercase(),
  password: passwordSchema,
  passwordConfirm: Joi.string().valid(Joi.ref('password')).messages({
    'any.only': 'Passwords do not match',
  }),
});

/**
 * Verify email schema
 */
const verifyEmailSchema = Joi.object({
  code: Joi.string().length(6).pattern(/^\d+$/).required().messages({
    'string.length': 'Verification code must be 6 digits',
  }),
});

module.exports = {
  loginSchema,
  hostSignupSchema,
  vendorSignupSchema,
  whitelabelSignupSchema,
  otpSendSchema,
  otpVerifySchema,
  otpResendSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updatePasswordSchema,
  completeProfileSchema,
  verifyEmailSchema,
};
