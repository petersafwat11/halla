import { z } from "zod";

// Email Login Schema (for Vendors/Admins)
export const emailLoginSchema = z.object({
  email: z
    .string()
    .min(1, "validation.required")
    .email("validation.invalidEmail"),
  password: z
    .string()
    .min(1, "validation.required")
    .min(8, "validation.passwordMinLength"),
});

// Mobile Login Schema (for Hosts)
export const mobileLoginSchema = z.object({
  mobile: z
    .string()
    .min(1, "validation.required")
    .min(9, "validation.mobileMinLength")
    .max(15, "validation.mobileMaxLength")
    .regex(/^[0-9]+$/, "validation.invalidMobile"),
});

// OTP Verification Schema
export const otpSchema = z.object({
  otp: z
    .string()
    .min(1, "validation.otpRequired")
    .length(6, "validation.otpLength")
    .regex(/^[0-9]+$/, "validation.otpInvalid"),
});

// Signup Mobile Schema (for Hosts)
export const signupMobileSchema = z.object({
  mobile: z
    .string()
    .min(1, "validation.required")
    .min(9, "validation.mobileMinLength")
    .max(15, "validation.mobileMaxLength")
    .regex(/^[0-9]+$/, "validation.invalidMobile"),
});

// Complete Profile Schema (for Hosts after OTP)
export const completeProfileSchema = z
  .object({
    fullName: z
      .string()
      .min(1, "validation.required")
      .min(2, "validation.nameMinLength"),
    email: z
      .string()
      .min(1, "validation.required")
      .email("validation.invalidEmail"),
    password: z
      .string()
      .min(1, "validation.required")
      .min(8, "validation.passwordMinLength"),
    confirmPassword: z.string().min(1, "validation.required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "validation.passwordMismatch",
    path: ["confirmPassword"],
  });

// Vendor Signup Schema (nested, multi-step)
export const vendorSignupSchema = z.object({
  identity: z
    .object({
      brandName: z
        .string()
        .min(1, "validation.required")
        .min(2, "validation.brandNameMinLength"),
      ownerFullName: z
        .string()
        .min(1, "validation.required")
        .min(2, "validation.nameMinLength"),
      phoneNumber: z
        .string()
        .min(1, "validation.required")
        .min(9, "validation.mobileMinLength")
        .max(15, "validation.mobileMaxLength")
        .regex(/^[0-9]+$/, "validation.invalidMobile"),
      email: z
        .string()
        .min(1, "validation.required")
        .email("validation.invalidEmail"),
      password: z
        .string()
        .min(1, "validation.required")
        .min(8, "validation.passwordMinLength"),
      passwordConfirm: z.string().min(1, "validation.required"),
    })
    .refine((data) => data.password === data.passwordConfirm, {
      message: "validation.passwordMismatch",
      path: ["passwordConfirm"],
    }),

  serviceData: z.object({
    serviceDescription: z
      .string()
      .min(1, "validation.required")
      .min(10, "validation.descriptionMinLength"),
    serviceCategories: z.object({
      eventPlanning: z.array(z.string()).optional().default([]),
      mediaProduction: z.array(z.string()).optional().default([]),
      giftsAndGiveaways: z.array(z.string()).optional().default([]),
      foodAndBeverages: z.array(z.string()).optional().default([]),
      beautyAndFashion: z.array(z.string()).optional().default([]),
      logisticsAndDelivery: z.array(z.string()).optional().default([]),
      corporateServices: z.array(z.string()).optional().default([]),
      supportServices: z.array(z.string()).optional().default([]),
      technicalServices: z.array(z.string()).optional().default([]),
      soundLightingEntertainment: z.array(z.string()).optional().default([]),
      hallsAndVenues: z.array(z.string()).optional().default([]),
    }).optional().default({}),
    serviceLocation: z.object({
      regionId: z.string().optional(),
      regionNameAr: z.string().optional(),
      regionNameEn: z.string().optional(),
      cityId: z.string().optional(),
      cityNameAr: z.string().optional(),
      cityNameEn: z.string().optional(),
      districtIds: z.array(z.string()).optional().default([]),
      districtNames: z.array(z.string()).optional().default([]),
      coverageType: z.enum(["region", "city", "districts"]).optional(),
    }).optional().default({}),
    otherData: z.string().optional(),
  }),

  samplesAndPackages: z.object({
    portfolioImages: z.array(z.any()).optional().default([]),
    businessLogo: z.any().optional(),
    pricePackages: z.array(z.any()).optional().default([]),
  }).optional().default({}),

  commercialVerification: z.object({
    commercialRecordNumber: z.string().optional(),
    commercialRecordImage: z.any().optional(),
    nationalId: z.string().optional(),
    nationalIdImage: z.any().optional(),
  }).optional().default({}),

  socialLinks: z.object({
    instagram: z.string().optional(),
    facebook: z.string().optional(),
    tiktok: z.string().optional(),
    website: z.string().optional(),
  }).optional().default({}),
});

// Whitelabel Signup Schema (nested, multi-step)
export const whitelabelSignupSchema = z.object({
  identity: z.object({
    arabicName: z
      .string()
      .min(1, "validation.required")
      .min(2, "validation.nameMinLength"),
    englishName: z
      .string()
      .min(1, "validation.required")
      .min(2, "validation.nameMinLength"),
    companyName: z
      .string()
      .min(1, "validation.required")
      .min(2, "validation.nameMinLength"),
    licenseNumber: z.string().min(1, "validation.required"),
    taxNumber: z.string().optional(),
    address: z.object({
      city: z.string().min(1, "validation.required"),
      neighborhood: z.string().min(1, "validation.required"),
      street: z.string().min(1, "validation.required"),
      buildingNumber: z.string().min(1, "validation.required"),
      additionalNumber: z.string().min(1, "validation.required"),
      placeType: z.string().optional(),
      placeNumber: z.string().optional(),
    }),
  }),

  loginData: z.object({
    email: z
      .string()
      .min(1, "validation.required")
      .email("validation.invalidEmail"),
    phoneNumber: z
      .string()
      .min(1, "validation.required")
      .min(9, "validation.mobileMinLength")
      .max(15, "validation.mobileMaxLength")
      .regex(/^[0-9]+$/, "validation.invalidMobile"),
  }),

  systemRequirements: z.object({
    numberOfEventsMonthly: z.string().min(1, "validation.required"),
    numberOfGuestsMonthly: z.string().min(1, "validation.required"),
    eventTypes: z
      .array(z.string())
      .min(1, "signupForm.whiteLabel.systemRequirements.eventTypesRequired"),
    eventsTypesOther: z.string().optional(),
  }),

  planSelection: z.object({
    planCode: z.string().optional(),
    billingCycle: z.enum(["monthly", "yearly"]).default("monthly"),
    needsCustomBranding: z.boolean().default(false),
  }).optional().default({ billingCycle: "monthly", needsCustomBranding: false }),
});

// Forget Password Schema
export const forgetPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "validation.required")
    .email("validation.invalidEmail"),
});
