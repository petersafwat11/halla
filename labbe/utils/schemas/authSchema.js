"use client";
import { z } from "zod";

// ============================================
// COMMON VALIDATION HELPERS
// ============================================

// Phone regex: 9 digits starting with 5 (Saudi), 10 digits starting with 05 (Saudi), or 11 digits starting with 01 (Egypt)
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const arabicRegex = /^[\u0600-\u06FF\s]+$/;
const englishRegex = /^[a-zA-Z\s]+$/;
const licenseRegex = /^70\d{8}$/;
const taxRegex = /^30\d{13}$/;

// Saudi Arabia National ID: 10 digits, starts with 1 (citizen) or 2 (resident)
const saudiNationalIdRegex = /^[12]\d{9}$/;

// Saudi Arabia Commercial Registration Number: 10 digits
const saudiCommercialRegRegex = /^\d{10}$/;

// ============================================
// LOGIN SCHEMAS
// ============================================

export const emailLoginSchema = (t) =>
  z.object({
    email: z
      .string()
      .min(1, t("loginForm.errors.emailRequired"))
      .email(t("loginForm.errors.invalidEmail")),
    password: z.string().min(8, t("loginForm.errors.passwordMinLength")),
  });

export const phoneLoginSchema = (t) =>
  z.object({
    phoneNumber: z
      .string()
      .min(9, t("loginForm.errors.phoneNumberInvalid"))
      .max(11, t("loginForm.errors.phoneNumberInvalid"))
      .refine(
        (val) => {
          const cleaned = val.replace(/\D/g, "");
          if (cleaned.length === 9) return cleaned.startsWith("5");
          if (cleaned.length === 10) return cleaned.startsWith("05");
          if (cleaned.length === 11) return cleaned.startsWith("01");
          return false;
        },
        {
          message: t("loginForm.errors.phoneNumberInvalid"),
        }
      ),
  });

export const otpVerificationSchema = (t) =>
  z.object({
    phoneNumber: z.string().min(9).max(11),
    otp: z
      .string()
      .length(6, t("loginForm.errors.otpInvalid"))
      .regex(/^[0-9]+$/, t("loginForm.errors.otpInvalid")),
  });

// ============================================
// PASSWORD SCHEMAS
// ============================================

export const forgotPasswordSchema = (t) =>
  z.object({
    email: z
      .string()
      .min(1, t("forgetPasswordForm.errors.emailRequired"))
      .email(t("forgetPasswordForm.errors.invalidEmail")),
  });

export const resetPasswordSchema = (t) =>
  z
    .object({
      password: z
        .string()
        .min(8, t("changePasswordForm.errors.passwordMinLength"))
        .regex(
          passwordRegex,
          t("changePasswordForm.errors.passwordComplexity")
        ),
      passwordConfirm: z
        .string()
        .min(1, t("changePasswordForm.errors.confirmPasswordRequired")),
    })
    .refine((data) => data.password === data.passwordConfirm, {
      message: t("changePasswordForm.errors.passwordsNotMatch"),
      path: ["passwordConfirm"],
    });

export const updatePasswordSchema = (t) =>
  z
    .object({
      currentPassword: z
        .string()
        .min(
          1,
          t("changePasswordForm.errors.newPasswordRequired")
        ),
      newPassword: z
        .string()
        .min(8, t("changePasswordForm.errors.passwordMinLength"))
        .regex(
          passwordRegex,
          t("changePasswordForm.errors.passwordComplexity")
        ),
      newPasswordConfirm: z
        .string()
        .min(1, t("changePasswordForm.errors.confirmPasswordRequired")),
    })
    .refine((data) => data.newPassword === data.newPasswordConfirm, {
      message: t("changePasswordForm.errors.passwordsNotMatch"),
      path: ["newPasswordConfirm"],
    });

// ============================================
// HOST SIGNUP SCHEMAS
// ============================================

export const hostSignupSchema = (t) =>
  z.object({
    phoneNumber: z
      .string()
      .min(
        9,
        t("signupForm.hostSignup.errors.phoneNumberInvalid")
      )
      .max(
        11,
        t("signupForm.hostSignup.errors.phoneNumberInvalid")
      )
      .refine(
        (val) => {
          const cleaned = val.replace(/\D/g, "");
          if (cleaned.length === 9) return cleaned.startsWith("5");
          if (cleaned.length === 10) return cleaned.startsWith("05");
          if (cleaned.length === 11) return cleaned.startsWith("01");
          return false;
        },
        {
          message:
            t("signupForm.hostSignup.errors.phoneNumberInvalid"),
        }
      ),
  });

export const hostProfileCompletionSchema = (t) =>
  z
    .object({
      username: z
        .string()
        .min(
          3,
          t("signupForm.hostSignup.errors.usernameMinLength")
        ),
      email: z
        .string()
        .min(
          1,
          t("signupForm.hostSignup.errors.emailRequired")
        )
        .email(
          t("signupForm.hostSignup.errors.invalidEmail")
        ),
      password: z
        .string()
        .min(
          8,
          t("signupForm.hostSignup.errors.passwordMinLength")
        ),
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
      message:
        t("signupForm.hostSignup.errors.passwordsDoNotMatch"),
      path: ["passwordConfirm"],
    });

// ============================================
// VENDOR SIGNUP SCHEMA
// ============================================

export const vendorSignupSchema = (t) =>
  z.object({
    // Identity Section
    identity: z
      .object({
        brandName: z
          .string()
          .min(2, t("signupForm.vendor.identity.errors.brandNameMinLength"))
          .max(100, t("signupForm.vendor.identity.errors.brandNameMaxLength")),
        ownerFullName: z
          .string()
          .min(2, t("signupForm.vendor.identity.errors.ownerFullNameMinLength"))
          .max(
            100,
            t("signupForm.vendor.identity.errors.ownerFullNameMaxLength")
          ),
        phoneNumber: z
          .string()
          .min(9, t("signupForm.vendor.identity.errors.phoneNumberInvalid"))
          .max(11, t("signupForm.vendor.identity.errors.phoneNumberInvalid"))
          .refine(
            (val) => {
              const cleaned = val.replace(/\D/g, "");
              if (cleaned.length === 9) return cleaned.startsWith("5");
              if (cleaned.length === 10) return cleaned.startsWith("05");
              if (cleaned.length === 11) return cleaned.startsWith("01");
              return false;
            },
            {
              message: t(
                "signupForm.vendor.identity.errors.phoneNumberInvalid"
              ),
            }
          ),
        email: z
          .string()
          .email(t("signupForm.vendor.identity.errors.emailInvalid")),
        password: z
          .string()
          .min(8, t("signupForm.vendor.identity.errors.passwordRequired")),
        passwordConfirm: z
          .string()
          .min(
            1,
            t("signupForm.vendor.identity.errors.passwordConfirmRequired")
          ),
      })
      .refine((data) => data.password === data.passwordConfirm, {
        message: t("signupForm.vendor.identity.errors.passwordsDoNotMatch"),
        path: ["passwordConfirm"],
      }),

    // Service Data Section
    serviceData: z.object({
      serviceDescription: z
        .string()
        .min(
          10,
          t("signupForm.vendor.serviceData.errors.serviceDescriptionMinLength")
        )
        .max(
          500,
          t("signupForm.vendor.serviceData.errors.serviceDescriptionMaxLength")
        ),
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
      // Service location (Saudi Arabia regions/cities/districts)
      serviceLocation: z.object({
        regionId: z
          .number()
          .min(
            1,
            t("signupForm.vendor.serviceData.errors.regionRequired")
          ),
        regionNameAr: z.string().optional(),
        regionNameEn: z.string().optional(),
        cityId: z.number().nullable().optional(), // null = all cities in region
        cityNameAr: z.string().optional(),
        cityNameEn: z.string().optional(),
        districtIds: z.array(z.number()).optional(), // empty = all districts
        districtNames: z
          .array(z.object({ nameAr: z.string(), nameEn: z.string() }))
          .optional(),
        coverageType: z.enum(["region", "city", "districts"]).default("city"),
      }),
      otherData: z.string().optional(),
    }),

    // Portfolio Section
    samplesAndPackages: z.object({
      portfolioImages: z
        .array(z.any())
        .min(
          1,
          t(
            "signupForm.vendor.samplesAndPackages.errors.portfolioImagesRequired"
          )
        ),
      businessLogo: z.any().optional(),
      pricePackages: z
        .array(z.any())
        .min(
          1,
          t("signupForm.vendor.samplesAndPackages.errors.pricePackagesRequired")
        ),
      profileFile: z.any().optional(),
    }),

    // Commercial Verification Section
    commercialVerification: z.object({
      commercialRecordNumber: z
        .string()
        .min(1, t("signupForm.vendor.paymentData.errors.licenseNumberRequired"))
        .regex(
          saudiCommercialRegRegex,
          t(
            "signupForm.vendor.commercialVerification.commercialRecord.invalidFormat"
          )
        ),
      commercialRecordImage: z.any().optional(),
      nationalId: z
        .string()
        .min(
          1,
          t("signupForm.vendor.commercialVerification.nationalId.label")
        )
        .regex(
          saudiNationalIdRegex,
          t(
            "signupForm.vendor.commercialVerification.nationalId.invalidFormat"
          )
        ),
      nationalIdImage: z.any().optional(),
    }),

    // Social Links Section
    socialLinks: z
      .object({
        instagram: z.string().url().optional().or(z.literal("")),
        facebook: z.string().url().optional().or(z.literal("")),
        tiktok: z.string().url().optional().or(z.literal("")),
        twitter: z.string().url().optional().or(z.literal("")),
        website: z.string().url().optional().or(z.literal("")),
      })
      .optional(),
  });

// ============================================
// WHITELABEL SIGNUP SCHEMA
// ============================================

export const whitelabelSignupSchema = (t) =>
  z.object({
    // Identity Section - Business Information
    identity: z.object({
      arabicName: z
        .string()
        .min(2, t("signupForm.whiteLabel.identity.errors.arabicNameMinLength"))
        .max(
          100,
          t("signupForm.whiteLabel.identity.errors.arabicNameMaxLength")
        )
        .regex(
          arabicRegex,
          t("signupForm.whiteLabel.identity.errors.arabicNameFormat")
        ),
      englishName: z
        .string()
        .min(2, t("signupForm.whiteLabel.identity.errors.englishNameMinLength"))
        .max(
          100,
          t("signupForm.whiteLabel.identity.errors.englishNameMaxLength")
        )
        .regex(
          englishRegex,
          t("signupForm.whiteLabel.identity.errors.englishNameFormat")
        ),
      companyName: z
        .string()
        .min(1, t("signupForm.whiteLabel.payment.errors.companyNameRequired")),
      licenseNumber: z
        .string()
        .min(1, t("signupForm.whiteLabel.payment.errors.licenseNumberRequired"))
        .regex(
          licenseRegex,
          t("signupForm.whiteLabel.payment.errors.licenseNumberInvalid")
        ),
      taxNumber: z
        .string()
        .optional()
        .refine(
          (val) => !val || val === "" || taxRegex.test(val),
          t("signupForm.whiteLabel.payment.errors.taxNumberInvalid")
        ),
      address: z.object({
        city: z
          .string()
          .min(1, t("signupForm.whiteLabel.payment.errors.cityRequired")),
        neighborhood: z
          .string()
          .min(
            1,
            t("signupForm.whiteLabel.payment.errors.neighborhoodRequired")
          ),
        street: z
          .string()
          .min(1, t("signupForm.whiteLabel.payment.errors.streetRequired")),
        buildingNumber: z
          .string()
          .min(
            1,
            t("signupForm.whiteLabel.payment.errors.buildingNumberRequired")
          )
          .regex(
            /^\d{1,4}$/,
            t("signupForm.whiteLabel.payment.errors.buildingNumberRequired")
          ),
        additionalNumber: z
          .string()
          .min(
            1,
            t("signupForm.whiteLabel.payment.errors.additionalNumberRequired")
          )
          .regex(
            /^\d{1,4}$/,
            t("signupForm.whiteLabel.payment.errors.additionalNumberRequired")
          ),
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

    // Login Data Section - Email and Phone only
    loginData: z.object({
      email: z
        .string()
        .email(t("signupForm.whiteLabel.login.fields.email.invalid")),
      phoneNumber: z
        .string()
        .min(
          9,
          t("signupForm.whiteLabel.login.fields.phoneNumber.invalid")
        )
        .max(
          11,
          t("signupForm.whiteLabel.login.fields.phoneNumber.invalid")
        ),
    }),

    // System Requirements Section
    systemRequirements: z.object({
      numberOfEventsMonthly: z
        .string()
        .min(
          1,
          t("signupForm.whiteLabel.requirements.errors.numberOfEventsRequired")
        )
        .regex(
          /^\d+$/,
          t("signupForm.whiteLabel.requirements.errors.numberOfEventsInvalid")
        ),
      numberOfGuestsMonthly: z
        .string()
        .min(
          1,
          t("signupForm.whiteLabel.requirements.errors.numberOfGuestsRequired")
        )
        .regex(
          /^\d+$/,
          t("signupForm.whiteLabel.requirements.errors.numberOfGuestsInvalid")
        ),
      eventTypes: z
        .array(z.string())
        .min(
          1,
          t("signupForm.whiteLabel.requirements.errors.eventsTypesRequired")
        ),
      eventsTypesOther: z.string().optional(),
    }),

    // Plan Selection - Required
    planSelection: z.object({
      planCode: z.string().min(1, t("signupForm.whiteLabel.planSelection.planRequired")),
      billingCycle: z.enum(["monthly", "yearly"]).default("yearly"),
      needsCustomBranding: z.boolean().default(false),
    }),
  });

// ============================================
// ADMIN LOGIN SCHEMA
// ============================================

export const adminLoginSchema = (t) =>
  z.object({
    email: z
      .string()
      .min(1, t("loginForm.errors.emailRequired"))
      .email(t("loginForm.errors.invalidEmail")),
    password: z.string().min(8, t("loginForm.errors.passwordMinLength")),
  });

// ============================================
// PROFILE UPDATE SCHEMA
// ============================================

export const updateProfileSchema = (t) =>
  z.object({
    username: z
      .string()
      .min(
        2,
        t("signupForm.hostSignup.errors.usernameMinLength")
      )
      .optional(),
    name: z.string().optional(),
    phoneNumber: z
      .string()
      .length(
        9,
        t("signupForm.hostSignup.errors.phoneNumberInvalid")
      )
      .optional()
      .or(z.literal("")),
    avatar: z.any().optional(),
  });

// ============================================
// EXPORT ALL SCHEMAS
// ============================================

export const authSchemas = {
  // Login
  emailLogin: emailLoginSchema,
  phoneLogin: phoneLoginSchema,
  otpVerification: otpVerificationSchema,
  adminLogin: adminLoginSchema,

  // Password
  forgotPassword: forgotPasswordSchema,
  resetPassword: resetPasswordSchema,
  updatePassword: updatePasswordSchema,

  // Signup
  hostSignup: hostSignupSchema,
  hostProfileCompletion: hostProfileCompletionSchema,
  vendorSignup: vendorSignupSchema,
  whitelabelSignup: whitelabelSignupSchema,

  // Profile
  updateProfile: updateProfileSchema,
};

export default authSchemas;
