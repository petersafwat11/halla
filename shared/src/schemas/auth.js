/**
 * Auth schemas — login, signup variants, OTP, password reset.
 * Factory functions; pass `t` for translation, omit for opaque keys.
 * See `_shared.js` header for the pattern rationale.
 */
import { z } from "zod";
import {
  saudiPhone,
  email,
  password,
  otpCode,
  ARABIC_TEXT_REGEX,
  ENGLISH_TEXT_REGEX,
  LICENSE_REGEX,
  TAX_REGEX,
  SAUDI_NATIONAL_ID_REGEX,
  SAUDI_COMMERCIAL_REG_REGEX,
  optionalUrl,
} from "./_shared.js";

const idT = (k) => k;

// ============================================================
// LOGIN
// ============================================================

export const emailLoginSchema = (t = idT) =>
  z.object({
    email: z
      .string()
      .min(1, t("loginForm.errors.emailRequired"))
      .email(t("loginForm.errors.invalidEmail")),
    password: z
      .string()
      .min(8, t("loginForm.errors.passwordMinLength")),
  });

export const phoneLoginSchema = (t = idT) =>
  z.object({
    phoneNumber: saudiPhone(t),
  });

export const adminLoginSchema = emailLoginSchema;

export const otpVerificationSchema = (t = idT) =>
  z.object({
    phoneNumber: saudiPhone(t),
    otp: otpCode(t),
  });

// Mobile alias for the same idea, accepts `mobile` field name.
export const mobileLoginSchema = (t = idT) =>
  z.object({
    mobile: saudiPhone(t),
  });

export const otpSchema = (t = idT) =>
  z.object({
    otp: otpCode(t),
  });

// ============================================================
// PASSWORD
// ============================================================

export const forgotPasswordSchema = (t = idT) =>
  z.object({
    email: z
      .string()
      .min(1, t("forgetPasswordForm.errors.emailRequired"))
      .email(t("forgetPasswordForm.errors.invalidEmail")),
  });

export const resetPasswordSchema = (t = idT) =>
  z
    .object({
      password: password(t),
      passwordConfirm: z
        .string()
        .min(1, t("changePasswordForm.errors.confirmPasswordRequired")),
    })
    .refine((data) => data.password === data.passwordConfirm, {
      message: t("changePasswordForm.errors.passwordsNotMatch"),
      path: ["passwordConfirm"],
    });

export const updatePasswordSchema = (t = idT) =>
  z
    .object({
      currentPassword: z
        .string()
        .min(1, t("changePasswordForm.errors.newPasswordRequired")),
      newPassword: password(t),
      newPasswordConfirm: z
        .string()
        .min(1, t("changePasswordForm.errors.confirmPasswordRequired")),
    })
    .refine((data) => data.newPassword === data.newPasswordConfirm, {
      message: t("changePasswordForm.errors.passwordsNotMatch"),
      path: ["newPasswordConfirm"],
    });

// ============================================================
// SIGNUP — HOST
// ============================================================

export const hostSignupSchema = (t = idT) =>
  z.object({
    phoneNumber: saudiPhone(t),
  });

export const signupMobileSchema = (t = idT) =>
  z.object({
    mobile: saudiPhone(t),
  });

export const hostProfileCompletionSchema = (t = idT) =>
  z
    .object({
      username: z
        .string()
        .min(3, t("signupForm.hostSignup.errors.usernameMinLength")),
      email: z
        .string()
        .min(1, t("signupForm.hostSignup.errors.emailRequired"))
        .email(t("signupForm.hostSignup.errors.invalidEmail")),
      password: password(t),
      passwordConfirm: z
        .string()
        .min(
          1,
          t("signupForm.hostSignup.errors.passwordConfirmRequired")
        ),
      name: z.string().optional(),
      company: z.string().optional(),
      position: z.string().optional(),
      bio: z.string().optional(),
    })
    .refine((data) => data.password === data.passwordConfirm, {
      message: t("signupForm.hostSignup.errors.passwordsDoNotMatch"),
      path: ["passwordConfirm"],
    });

// Mobile naming used by completeProfile screen.
export const completeProfileSchema = (t = idT) =>
  z
    .object({
      fullName: z
        .string()
        .min(2, t("validation.nameMinLength")),
      email: z
        .string()
        .min(1, t("validation.required"))
        .email(t("validation.invalidEmail")),
      password: password(t),
      confirmPassword: z
        .string()
        .min(1, t("validation.required")),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("validation.passwordMismatch"),
      path: ["confirmPassword"],
    });

// ============================================================
// SIGNUP — VENDOR
// ============================================================

export const vendorSignupSchema = (t = idT) =>
  z.object({
    identity: z
      .object({
        brandName: z
          .string()
          .min(2, t("signupForm.vendor.identity.errors.brandNameMinLength"))
          .max(100, t("signupForm.vendor.identity.errors.brandNameMaxLength")),
        ownerFullName: z
          .string()
          .min(2, t("signupForm.vendor.identity.errors.ownerFullNameMinLength"))
          .max(100, t("signupForm.vendor.identity.errors.ownerFullNameMaxLength")),
        phoneNumber: saudiPhone(t),
        email: email(t),
        password: password(t),
        passwordConfirm: z
          .string()
          .min(1, t("signupForm.vendor.identity.errors.passwordConfirmRequired")),
      })
      .refine((data) => data.password === data.passwordConfirm, {
        message: t("signupForm.vendor.identity.errors.passwordsDoNotMatch"),
        path: ["passwordConfirm"],
      }),

    serviceData: z.object({
      serviceDescription: z
        .string()
        .min(10, t("signupForm.vendor.serviceData.errors.serviceDescriptionMinLength"))
        .max(500, t("signupForm.vendor.serviceData.errors.serviceDescriptionMaxLength")),
      categories: z.array(z.string()).optional(),
      serviceCategories: z
        .object({
          eventPlanning: z.array(z.string()).optional(),
          mediaProduction: z.array(z.string()).optional(),
          giftsAndGiveaways: z.array(z.string()).optional(),
          foodAndBeverages: z.array(z.string()).optional(),
          beautyAndFashion: z.array(z.string()).optional(),
          logisticsAndDelivery: z.array(z.string()).optional(),
          corporateServices: z.array(z.string()).optional(),
          supportServices: z.array(z.string()).optional(),
          technicalServices: z.array(z.string()).optional(),
          soundLightingEntertainment: z.array(z.string()).optional(),
          hallsAndVenues: z.array(z.string()).optional(),
        })
        .optional(),
      serviceLocation: z.object({
        regionId: z
          .number()
          .min(1, t("signupForm.vendor.serviceData.errors.regionRequired")),
        regionNameAr: z.string().optional(),
        regionNameEn: z.string().optional(),
        cityId: z.number().nullable().optional(),
        cityNameAr: z.string().optional(),
        cityNameEn: z.string().optional(),
        districtIds: z.array(z.number()).optional(),
        districtNames: z
          .array(z.object({ nameAr: z.string(), nameEn: z.string() }))
          .optional(),
        coverageType: z.enum(["region", "city", "districts"]).default("city"),
      }),
      otherData: z.string().optional(),
    }),

    samplesAndPackages: z.object({
      portfolioImages: z
        .array(z.any())
        .min(1, t("signupForm.vendor.samplesAndPackages.errors.portfolioImagesRequired")),
      businessLogo: z.any().optional(),
      pricePackages: z
        .array(z.any())
        .min(1, t("signupForm.vendor.samplesAndPackages.errors.pricePackagesRequired")),
      profileFile: z.any().optional(),
    }),

    commercialVerification: z.object({
      commercialRecordNumber: z
        .string()
        .min(1, t("signupForm.vendor.paymentData.errors.licenseNumberRequired"))
        .regex(
          SAUDI_COMMERCIAL_REG_REGEX,
          t("signupForm.vendor.commercialVerification.commercialRecord.invalidFormat")
        ),
      commercialRecordImage: z.any().optional(),
      nationalId: z
        .string()
        .min(1, t("signupForm.vendor.commercialVerification.nationalId.label"))
        .regex(
          SAUDI_NATIONAL_ID_REGEX,
          t("signupForm.vendor.commercialVerification.nationalId.invalidFormat")
        ),
      nationalIdImage: z.any().optional(),
    }),

    socialLinks: z
      .object({
        instagram: optionalUrl(),
        facebook: optionalUrl(),
        tiktok: optionalUrl(),
        twitter: optionalUrl(),
        website: optionalUrl(),
      })
      .optional(),
  });

// ============================================================
// SIGNUP — WHITELABEL
// ============================================================

export const whitelabelSignupSchema = (t = idT) =>
  z.object({
    identity: z.object({
      arabicName: z
        .string()
        .min(2, t("signupForm.whiteLabel.identity.errors.arabicNameMinLength"))
        .max(100, t("signupForm.whiteLabel.identity.errors.arabicNameMaxLength"))
        .regex(ARABIC_TEXT_REGEX, t("signupForm.whiteLabel.identity.errors.arabicNameFormat")),
      englishName: z
        .string()
        .min(2, t("signupForm.whiteLabel.identity.errors.englishNameMinLength"))
        .max(100, t("signupForm.whiteLabel.identity.errors.englishNameMaxLength"))
        .regex(ENGLISH_TEXT_REGEX, t("signupForm.whiteLabel.identity.errors.englishNameFormat")),
      companyName: z
        .string()
        .min(1, t("signupForm.whiteLabel.payment.errors.companyNameRequired")),
      licenseNumber: z
        .string()
        .min(1, t("signupForm.whiteLabel.payment.errors.licenseNumberRequired"))
        .regex(LICENSE_REGEX, t("signupForm.whiteLabel.payment.errors.licenseNumberInvalid")),
      taxNumber: z
        .string()
        .optional()
        .refine(
          (val) => !val || val === "" || TAX_REGEX.test(val),
          t("signupForm.whiteLabel.payment.errors.taxNumberInvalid")
        ),
      address: z.object({
        city: z
          .string()
          .min(1, t("signupForm.whiteLabel.payment.errors.cityRequired")),
        neighborhood: z
          .string()
          .min(1, t("signupForm.whiteLabel.payment.errors.neighborhoodRequired")),
        street: z
          .string()
          .min(1, t("signupForm.whiteLabel.payment.errors.streetRequired")),
        buildingNumber: z
          .string()
          .min(1, t("signupForm.whiteLabel.payment.errors.buildingNumberRequired"))
          .regex(/^\d{1,4}$/, t("signupForm.whiteLabel.payment.errors.buildingNumberRequired")),
        additionalNumber: z
          .string()
          .min(1, t("signupForm.whiteLabel.payment.errors.additionalNumberRequired"))
          .regex(/^\d{1,4}$/, t("signupForm.whiteLabel.payment.errors.additionalNumberRequired")),
        placeType: z.string().optional(),
        placeNumber: z
          .string()
          .optional()
          .refine(
            (val) => !val || /^\d{1,4}$/.test(val),
            t("signupForm.whiteLabel.payment.errors.buildingNumberRequired")
          ),
      }),
    }),

    loginData: z.object({
      email: email(t),
      phoneNumber: saudiPhone(t),
    }),

    systemRequirements: z.object({
      numberOfEventsMonthly: z
        .string()
        .min(1, t("signupForm.whiteLabel.requirements.errors.numberOfEventsRequired"))
        .regex(/^\d+$/, t("signupForm.whiteLabel.requirements.errors.numberOfEventsInvalid")),
      numberOfGuestsMonthly: z
        .string()
        .min(1, t("signupForm.whiteLabel.requirements.errors.numberOfGuestsRequired"))
        .regex(/^\d+$/, t("signupForm.whiteLabel.requirements.errors.numberOfGuestsInvalid")),
      eventTypes: z
        .array(z.string())
        .min(1, t("signupForm.whiteLabel.requirements.errors.eventsTypesRequired")),
      eventsTypesOther: z.string().optional(),
    }),

    planSelection: z.object({
      planCode: z.string().min(1, t("signupForm.whiteLabel.planSelection.planRequired")),
      billingCycle: z.enum(["monthly", "yearly"]).default("yearly"),
      needsCustomBranding: z.boolean().default(false),
    }),
  });

// ============================================================
// PROFILE
// ============================================================

export const updateProfileSchema = (t = idT) =>
  z.object({
    username: z
      .string()
      .min(2, t("signupForm.hostSignup.errors.usernameMinLength"))
      .optional(),
    name: z.string().optional(),
    phoneNumber: saudiPhone(t).optional().or(z.literal("")),
    avatar: z.any().optional(),
  });

// ============================================================
// SCHEMA BARREL (object form for legacy `schemas.foo` access)
// ============================================================

export const authSchemas = {
  emailLogin: emailLoginSchema,
  phoneLogin: phoneLoginSchema,
  mobileLogin: mobileLoginSchema,
  otpVerification: otpVerificationSchema,
  otp: otpSchema,
  adminLogin: adminLoginSchema,

  forgotPassword: forgotPasswordSchema,
  resetPassword: resetPasswordSchema,
  updatePassword: updatePasswordSchema,

  hostSignup: hostSignupSchema,
  signupMobile: signupMobileSchema,
  hostProfileCompletion: hostProfileCompletionSchema,
  completeProfile: completeProfileSchema,
  vendorSignup: vendorSignupSchema,
  whitelabelSignup: whitelabelSignupSchema,

  updateProfile: updateProfileSchema,
};

export default authSchemas;
