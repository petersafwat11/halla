/**
 * Auth Validation Schemas
 * Zod schemas for request input validation
 * @module modules/auth/auth.validation
 */

const { z } = require('zod');
const { clampPhoneInput, SAUDI_PHONE_REGEX, isValidPhone } = require('../../shared/utils/phone');

const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)/;

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
  .regex(passwordPattern, 'Password must be at least 8 characters and contain at least one letter and one number');

// Display identity (الاسم الكامل). Arbitrary user text — Arabic, Latin, or
// mixed. Deliberately NOT the legacy `username` charset rule: signup asks
// for a full name and users type it in their own script.
const displayName = z
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name cannot exceed 100 characters');

const stringOrJson = z.union([z.string(), z.record(z.any()), z.array(z.any())]);

const AUTHORITATIVE_CATEGORY_OPTIONS = {
  eventPlanning: [
    'hallAndLoungeRentals', 'tableOrganizationAndSeating', 'flowerAndDecoration',
    'partyAndWeddingCoordination', 'digitalAndPrintedInvitation', 'hospitalityServices',
  ],
  mediaProduction: [
    'photoAndVideoForOccasions', 'eventVideoEditing', 'aerialDronePhotography', 'eventVideoMontage',
  ],
  giftsAndGiveaways: [
    'guestGiftAndDistribution', 'chocolateAndIncenseBoxes', 'giftWrappingAndCustomDesigns', 'congratulationsAndGiftCards',
  ],
  foodAndBeverages: [
    'occasionCakes', 'traditionalOrInternationalCuisine', 'slaughterAndRice', 'mobileFoodTrucks', 'completeHospitalityBuffet',
  ],
  beautyAndFashion: [
    'homeBeautyServices', 'weddingAndOccasionDressRentals', 'abayaDesignAndWomensTailoring', 'barberAndGroomingSalons', 'mensClothingTailoring',
  ],
  logisticsAndDelivery: [
    'vipDriverAndHospitality', 'giftAndOrderDelivery', 'guestTransportationCoordination', 'occasionCarRentals',
  ],
  corporateServices: [
    'conferenceAndExhibitionOrganization', 'corporatePromotionalGiftPreparation', 'officialPrintingAndDesignSolutions', 'guestReceptionAndRegistration',
  ],
  supportServices: [
    'eventPlanners', 'guestCoordinators', 'receptionStaff', 'entrySupervisors',
  ],
  technicalServices: [
    'liveStreaming', 'ticketingPlatforms', 'arVrServices',
  ],
  soundLightingEntertainment: [
    'professionalSoundSystems', 'lightingVisualEffects', 'musicalEntertainment',
  ],
  hallsAndVenues: [
    'eventHalls', 'privateResthouses', 'hotelBallrooms',
  ],
};
const ALLOWED_CATEGORY_KEYS = new Set(Object.keys(AUTHORITATIVE_CATEGORY_OPTIONS));

const categorySchema = z.record(z.string(), z.array(z.string())).superRefine((categories, ctx) => {
  if (!categories || typeof categories !== 'object') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Service categories must be an object',
    });
    return;
  }
  const keys = Object.keys(categories);
  const unknownKeys = keys.filter((k) => !ALLOWED_CATEGORY_KEYS.has(k));
  if (unknownKeys.length > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Invalid service category keys: ${unknownKeys.join(', ')}`,
    });
  }
  let totalSelections = 0;
  for (const [key, options] of Object.entries(categories)) {
    if (Array.isArray(options)) {
      totalSelections += options.length;
      const allowedOptions = AUTHORITATIVE_CATEGORY_OPTIONS[key];
      if (allowedOptions) {
        const allowedSet = new Set(allowedOptions);
        const unknownOptions = options.filter((opt) => !allowedSet.has(opt));
        if (unknownOptions.length > 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Invalid option IDs for category "${key}": ${unknownOptions.join(', ')}`,
          });
        }
      }
    }
  }
  if (totalSelections === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'At least one service category option must be selected',
    });
  }
});

const serviceLocationSchema = z.object({
  regionId: z.coerce.number().int().min(1, 'Region is required'),
  regionNameAr: z.string().optional(),
  regionNameEn: z.string().optional(),
  cityId: z.coerce.number().int().nullable().optional(),
  cityNameAr: z.string().optional(),
  cityNameEn: z.string().optional(),
  districtIds: z.array(z.coerce.number().int()).optional().default([]),
  districtNames: z.array(z.object({ nameAr: z.string().optional(), nameEn: z.string().optional() })).optional().default([]),
  coverageType: z.enum(['region', 'city', 'districts']).default('city'),
}).strict().superRefine((location, ctx) => {
  if (location.coverageType === 'city' && !location.cityId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['cityId'],
      message: 'City is required when city coverage is selected',
    });
  }
  if (location.coverageType === 'districts') {
    if (!location.cityId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['cityId'],
        message: 'City is required when district coverage is selected',
      });
    }
    if (!Array.isArray(location.districtIds) || location.districtIds.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['districtIds'],
        message: 'At least one district is required when district coverage is selected',
      });
    }
  }
});

const optionalUrlField = z.union([
  z.literal(''),
  z.string().trim().url('Invalid URL').refine((value) => /^https?:\/\//i.test(value), {
    message: 'URL must use http or https',
  }),
]).optional();
const socialLinksSchema = z.object({
  instagram: optionalUrlField,
  facebook: optionalUrlField,
  tiktok: optionalUrlField,
  twitter: optionalUrlField,
  linkedin: optionalUrlField,
  youtube: optionalUrlField,
  website: optionalUrlField,
  whatsapp: z.string().trim().optional().or(z.literal('')),
}).strict().optional().default({});

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
    name: z.string().trim().min(2).max(100).optional(),
  })
  .strict()
  .refine((data) => !('username' in data) || data.username === undefined, {
    message: 'Unrecognized field: username',
    path: ['username'],
  })
  .superRefine(passwordsMatch('password', 'passwordConfirm'));

const vendorSignupSchema = z
  .object({
    email,
    phoneNumber,
    password,
    passwordConfirm: z.string().min(1, 'Password confirmation is required'),
    preferredLanguage: z.enum(['ar', 'en']).optional().default('ar'),
    brandName: z.string().trim().min(2, 'Brand name must be at least 2 characters').max(100, 'Brand name must not exceed 100 characters'),
    ownerFullName: z.string().trim().min(2, 'Owner full name must be at least 2 characters').max(100, 'Owner full name must not exceed 100 characters'),
    serviceDescription: z.string().trim().min(10, 'Service description must be at least 10 characters').max(500, 'Service description must not exceed 500 characters'),
    taglineAr: z.string().trim().max(160, 'Tagline (Arabic) cannot exceed 160 characters').optional(),
    taglineEn: z.string().trim().max(160, 'Tagline (English) cannot exceed 160 characters').optional(),
    aboutAr: z.string().trim().max(2000, 'About (Arabic) cannot exceed 2000 characters').optional(),
    aboutEn: z.string().trim().max(2000, 'About (English) cannot exceed 2000 characters').optional(),
    serviceCategories: categorySchema,
    serviceLocation: serviceLocationSchema.optional(),
    location: serviceLocationSchema.optional(),
    socialLinks: socialLinksSchema,
    nationalId: z.string().trim().regex(/^[12]\d{9}$/, 'National ID must be 10 digits starting with 1 or 2'),
    commercialRecordNumber: z.string().trim().regex(/^\d{10}$/, 'Commercial registration number must be 10 digits').optional(),
    commercialRegistrationNumber: z.string().trim().regex(/^\d{10}$/, 'Commercial registration number must be 10 digits').optional(),
    otherData: z.string().optional(),
  })
  .strict()
  .superRefine(passwordsMatch('password', 'passwordConfirm'))
  .superRefine((data, ctx) => {
    if (!data.commercialRecordNumber && !data.commercialRegistrationNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['commercialRecordNumber'],
        message: 'Commercial registration number is required',
      });
    }
    if (!data.serviceLocation && !data.location) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['serviceLocation'],
        message: 'Service location is required',
      });
    }
    if (data.socialLinks && data.socialLinks.whatsapp) {
      const wa = data.socialLinks.whatsapp.trim();
      if (wa !== '' && !isValidPhone(wa) && !/^\+?[0-9]{8,15}$/.test(wa.replace(/[\s\-\(\)]/g, ''))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['socialLinks', 'whatsapp'],
          message: 'Invalid WhatsApp phone number',
        });
      }
    }
  });

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
    name: displayName,
    email: email.optional(),
    password: password.optional(),
    passwordConfirm: z.string().optional(),
  })
  .passthrough()
  .refine((data) => !('username' in data) || data.username === undefined, {
    message: 'Unrecognized field: username',
    path: ['username'],
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
  AUTHORITATIVE_CATEGORY_OPTIONS,
  ALLOWED_CATEGORY_KEYS,
};
