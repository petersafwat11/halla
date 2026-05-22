import { z } from "zod";

// Phone regex: 9 digits starting with 5 (Saudi), 10 digits starting with 05 (Saudi), or 11 digits starting with 01 (Egypt)
const phoneRegex = /^(5\d{8}|05\d{8}|01\d{9})$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const saudiNationalIdRegex = /^[12]\d{9}$/;
const saudiCommercialRegRegex = /^\d{10}$/;

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

// Vendor Signup Schema (nested, multi-step) — matches web exactly
export const vendorSignupSchema = z.object({
  identity: z
    .object({
      brandName: z
        .string()
        .min(2, "signupForm.vendor.identity.errors.brandNameMinLength")
        .max(100, "signupForm.vendor.identity.errors.brandNameMaxLength"),
      ownerFullName: z
        .string()
        .min(2, "signupForm.vendor.identity.errors.ownerFullNameMinLength")
        .max(100, "signupForm.vendor.identity.errors.ownerFullNameMaxLength"),
      phoneNumber: z
        .string()
        .min(9, "signupForm.vendor.identity.errors.phoneNumberInvalid")
        .max(11, "signupForm.vendor.identity.errors.phoneNumberInvalid")
        .refine(
          (val) => {
            const cleaned = val.replace(/\D/g, "");
            if (cleaned.length === 9) return cleaned.startsWith("5");
            if (cleaned.length === 10) return cleaned.startsWith("05");
            if (cleaned.length === 11) return cleaned.startsWith("01");
            return false;
          },
          { message: "signupForm.vendor.identity.errors.phoneNumberInvalid" }
        ),
      email: z
        .string()
        .min(1, "signupForm.vendor.identity.errors.emailRequired")
        .email("signupForm.vendor.identity.errors.emailInvalid"),
      password: z
        .string()
        .min(8, "signupForm.vendor.identity.errors.passwordRequired")
        .regex(passwordRegex, "signupForm.vendor.identity.errors.passwordComplexity"),
      passwordConfirm: z
        .string()
        .min(1, "signupForm.vendor.identity.errors.passwordConfirmRequired"),
    })
    .refine((data) => data.password === data.passwordConfirm, {
      message: "signupForm.vendor.identity.errors.passwordsDoNotMatch",
      path: ["passwordConfirm"],
    }),

  serviceData: z.object({
    serviceDescription: z
      .string()
      .min(10, "signupForm.vendor.serviceData.errors.serviceDescriptionMinLength")
      .max(500, "signupForm.vendor.serviceData.errors.serviceDescriptionMaxLength"),
    categories: z.array(z.string()).optional(),
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
    serviceLocation: z.object({
      regionId: z.union([z.number(), z.string()]).optional(),
      regionNameAr: z.string().optional(),
      regionNameEn: z.string().optional(),
      cityId: z.union([z.number(), z.string()]).nullable().optional(),
      cityNameAr: z.string().optional(),
      cityNameEn: z.string().optional(),
      districtIds: z.array(z.union([z.number(), z.string()])).optional().default([]),
      districtNames: z.array(z.object({ nameAr: z.string(), nameEn: z.string() })).optional().default([]),
      coverageType: z.enum(["region", "city", "districts"]).default("city"),
    }).optional().default({ coverageType: "city" }),
    otherData: z.string().optional(),
  }),

  samplesAndPackages: z.object({
    portfolioImages: z.array(z.any()).min(1, "signupForm.vendor.samplesAndPackages.errors.portfolioImagesRequired"),
    businessLogo: z.any().optional(),
    pricePackages: z.array(z.any()).min(1, "signupForm.vendor.samplesAndPackages.errors.pricePackagesRequired"),
    profileFile: z.any().optional(),
  }),

  commercialVerification: z.object({
    commercialRecordNumber: z
      .string()
      .min(1, "signupForm.vendor.paymentData.errors.licenseNumberRequired")
      .regex(saudiCommercialRegRegex, "signupForm.vendor.commercialVerification.commercialRecord.invalidFormat"),
    commercialRecordImage: z.any().optional(),
    nationalId: z
      .string()
      .min(1, "signupForm.vendor.commercialVerification.nationalId.label")
      .regex(saudiNationalIdRegex, "signupForm.vendor.commercialVerification.nationalId.invalidFormat"),
    nationalIdImage: z.any().optional(),
  }),

  socialLinks: z.object({
    instagram: z.string().optional().or(z.literal("")),
    facebook: z.string().optional().or(z.literal("")),
    tiktok: z.string().optional().or(z.literal("")),
    twitter: z.string().optional().or(z.literal("")),
    website: z.string().optional().or(z.literal("")),
  }).optional().default({}),
});

const arabicRegex = /^[\u0600-\u06FF\s]+$/;
const englishRegex = /^[a-zA-Z\s]+$/;
const licenseRegex = /^70\d{8}$/;
const taxRegex = /^30\d{13}$/;

// Whitelabel Signup Schema (nested, multi-step) — matches web exactly
export const whitelabelSignupSchema = z.object({
  identity: z.object({
    arabicName: z
      .string()
      .min(2, "signupForm.whiteLabel.identity.errors.arabicNameMinLength")
      .max(100, "signupForm.whiteLabel.identity.errors.arabicNameMaxLength")
      .regex(arabicRegex, "signupForm.whiteLabel.identity.errors.arabicNameFormat"),
    englishName: z
      .string()
      .min(2, "signupForm.whiteLabel.identity.errors.englishNameMinLength")
      .max(100, "signupForm.whiteLabel.identity.errors.englishNameMaxLength")
      .regex(englishRegex, "signupForm.whiteLabel.identity.errors.englishNameFormat"),
    companyName: z
      .string()
      .min(1, "signupForm.whiteLabel.payment.errors.companyNameRequired"),
    licenseNumber: z
      .string()
      .min(1, "signupForm.whiteLabel.payment.errors.licenseNumberRequired")
      .regex(licenseRegex, "signupForm.whiteLabel.payment.errors.licenseNumberInvalid"),
    taxNumber: z
      .string()
      .optional()
      .refine(
        (val) => !val || val === "" || taxRegex.test(val),
        "signupForm.whiteLabel.payment.errors.taxNumberInvalid"
      ),
    address: z.object({
      city: z.string().min(1, "signupForm.whiteLabel.payment.errors.cityRequired"),
      neighborhood: z.string().min(1, "signupForm.whiteLabel.payment.errors.neighborhoodRequired"),
      street: z.string().min(1, "signupForm.whiteLabel.payment.errors.streetRequired"),
      buildingNumber: z
        .string()
        .min(1, "signupForm.whiteLabel.payment.errors.buildingNumberRequired")
        .regex(/^\d{1,4}$/, "signupForm.whiteLabel.payment.errors.buildingNumberRequired"),
      additionalNumber: z
        .string()
        .min(1, "signupForm.whiteLabel.payment.errors.additionalNumberRequired")
        .regex(/^\d{1,4}$/, "signupForm.whiteLabel.payment.errors.additionalNumberRequired"),
      placeType: z.string().optional(),
      placeNumber: z
        .string()
        .optional()
        .refine(
          (val) => !val || /^\d{1,4}$/.test(val),
          "signupForm.whiteLabel.payment.errors.buildingNumberRequired"
        ),
    }),
  }),

  loginData: z.object({
    email: z
      .string()
      .email("signupForm.whiteLabel.login.fields.email.invalid"),
    phoneNumber: z
      .string()
      .min(9, "signupForm.whiteLabel.login.fields.phoneNumber.invalid")
      .max(11, "signupForm.whiteLabel.login.fields.phoneNumber.invalid"),
  }),

  systemRequirements: z.object({
    numberOfEventsMonthly: z
      .string()
      .min(1, "signupForm.whiteLabel.requirements.errors.numberOfEventsRequired")
      .regex(/^\d+$/, "signupForm.whiteLabel.requirements.errors.numberOfEventsInvalid"),
    numberOfGuestsMonthly: z
      .string()
      .min(1, "signupForm.whiteLabel.requirements.errors.numberOfGuestsRequired")
      .regex(/^\d+$/, "signupForm.whiteLabel.requirements.errors.numberOfGuestsInvalid"),
    eventTypes: z
      .array(z.string())
      .min(1, "signupForm.whiteLabel.requirements.errors.eventsTypesRequired"),
    eventsTypesOther: z.string().optional(),
  }),

  planSelection: z.object({
    planCode: z.string().min(1, "signupForm.whiteLabel.planSelection.planRequired"),
    billingCycle: z.enum(["monthly", "yearly"]).default("yearly"),
    needsCustomBranding: z.boolean().default(false),
  }),
});

// Forget Password Schema
export const forgetPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "validation.required")
    .email("validation.invalidEmail"),
});
