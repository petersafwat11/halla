/**
 * Auth Validation Schemas
 * Zod schemas for request input validation
 * @module modules/auth/auth.validation
 */

const { z } = require('zod');
const { clampPhoneInput, SAUDI_PHONE_REGEX } = require('../../shared/utils/phone');

const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]+$/;

const phoneNumber = z
  .string()
  .trim()
  .transform((val) => clampPhoneInput(val))
  .refine((val) => SAUDI_PHONE_REGEX.test(val), {
    message: 'Invalid Saudi phone number format. Must be 10 digits starting with 05 or 9 digits starting with 5',
  });

const email = z
  .string()
  .trim()
  .toLowerCase()
  .email('Invalid email format');

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(passwordPattern, 'Password may contain letters and numbers only and must include at least one of each');
const username = z
  .string()
  .trim()
  .min(3, 'Username must be at least 3 characters')
  .max(50, 'Username must be at most 50 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Username may contain letters, numbers, and underscores only');

// Display identity (الاسم الكامل). Arbitrary user text — Arabic, Latin, or
// mixed. Deliberately NOT the legacy `username` charset rule: signup asks
// for a full name and users type it in their own script.
const displayName = z
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name cannot exceed 100 characters');

const stringOrJson = z.union([z.string(), z.record(z.any()), z.array(z.any())]);

const otpCode = z
  .string()
  .length(6, 'OTP must be 6 digits')
  .regex(/^\d+$/, 'OTP must contain only digits');

const passwordsMatch = (passwordField, confirmField) => (data, ctx) => {
  if (data[confirmField] !== data[passwordField]) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [confirmField],
      message: 'Passwords do not match',
    });
  }
};

const loginSchema = z
  .object({
    email: email.optional(),
    phoneNumber: phoneNumber.optional(),
    password: z.string().min(1, 'Password is required'),
  })
  .refine((data) => data.email || data.phoneNumber, {
    message: 'Email or phone number is required',
    path: ['email'],
  });

const hostSignupSchema = z
  .object({
    email: email.optional(),
    phoneNumber,
    password,
    passwordConfirm: z.string(),
    username: username.optional(),
    name: z.string().trim().min(2).max(100).optional(),
  })
  .superRefine(passwordsMatch('password', 'passwordConfirm'));

const vendorSignupSchema = z
  .object({
    email,
    phoneNumber,
    password,
    brandName: z.string().trim().min(2).max(100),
    ownerFullName: z.string().trim().min(2).max(100),
    serviceDescription: z.string().max(1000).optional(),
    taglineAr: z.string().trim().max(160).optional(),
    taglineEn: z.string().trim().max(160).optional(),
    aboutAr: z.string().trim().max(2000).optional(),
    aboutEn: z.string().trim().max(2000).optional(),
    serviceCategories: stringOrJson.optional(),
    serviceLocation: stringOrJson.optional(),
    socialLinks: stringOrJson.optional(),
    nationalId: z.string().optional(),
    commercialRecordNumber: z.string().optional(),
    otherData: z.string().optional(),
  })
  .passthrough();

const otpSendSchema = z.object({
  phoneNumber,
});

const otpVerifySchema = z.object({
  phoneNumber,
  otp: otpCode,
});

const otpResendSchema = z.object({
  phoneNumber,
  type: z.enum(['signup', 'login']),
});

const forgotPasswordSchema = z.object({
  email,
});

const resetPasswordSchema = z
  .object({
    password,
    passwordConfirm: z.string(),
  })
  .superRefine(passwordsMatch('password', 'passwordConfirm'));

const updatePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: password,
    passwordConfirm: z.string(),
  })
  .superRefine(passwordsMatch('newPassword', 'passwordConfirm'));

const completeProfileSchema = z
  .object({
    // Preferred field: the user's full display name.
    name: displayName.optional(),
    // Legacy clients (and current web/mobile signup builds) send the
    // "Full Name" input under this key — accepted and normalized to `name`
    // by the service. No charset restriction: Arabic names are valid.
    username: displayName.optional(),
    email: email.optional(),
    password: password.optional(),
    passwordConfirm: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.password && data.passwordConfirm !== data.password) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['passwordConfirm'],
        message: 'Passwords do not match',
      });
    }
  });

const verifyEmailSchema = z.object({
  code: z
    .string()
    .length(6, 'Verification code must be 6 digits')
    .regex(/^\d+$/, 'Verification code must contain only digits'),
});

const verifyEmailLinkSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

const resendEmailVerificationSchema = z.object({
  email,
});

module.exports = {
  loginSchema,
  hostSignupSchema,
  vendorSignupSchema,
  otpSendSchema,
  otpVerifySchema,
  otpResendSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updatePasswordSchema,
  completeProfileSchema,
  verifyEmailSchema,
  verifyEmailLinkSchema,
  resendEmailVerificationSchema,
};
