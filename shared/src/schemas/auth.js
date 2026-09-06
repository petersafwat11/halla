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
  SAUDI_NATIONAL_ID_REGEX,
  SAUDI_COMMERCIAL_REG_REGEX,
} from "./_shared.js";
import { isValidPhone } from "../utils/phone.js";
import {
  containsOnlyArabicText,
  containsOnlyEnglishText,
} from "../utils/languageInput.js";

const idT = (k) => k;

const optionalLanguageText = (max, predicate, message) =>
  z.string().trim().max(max).refine(predicate, { message }).optional().or(z.literal(""));
const presentString = (schema) => z.preprocess((value) => value ?? "", schema);

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
      name: z
        .string()
        .trim()
        .min(
          2,
          t("signupForm.hostSignup.errors.nameMinLength", {
            defaultValue: t("validation.nameMinLength", {
              defaultValue: "Name must be at least 2 characters",
            }),
          })
        ),
      email: z
        .string()
        .trim()
        .min(1, t("signupForm.hostSignup.errors.emailRequired"))
        .email(t("signupForm.hostSignup.errors.invalidEmail")),
      password: password(t),
      passwordConfirm: z
        .string()
        .min(
          1,
          t("signupForm.hostSignup.errors.passwordConfirmRequired")
        ),
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
        .trim()
        .min(2, t("validation.nameMinLength")),
      email: z
        .string()
        .trim()
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

export const AUTHORITATIVE_CATEGORY_OPTIONS = Object.freeze({
  eventPlanning: Object.freeze([
    "hallAndLoungeRentals", "tableOrganizationAndSeating", "flowerAndDecoration",
    "partyAndWeddingCoordination", "digitalAndPrintedInvitation", "hospitalityServices",
  ]),
  mediaProduction: Object.freeze([
    "photoAndVideoForOccasions", "eventVideoEditing", "aerialDronePhotography", "eventVideoMontage",
  ]),
  giftsAndGiveaways: Object.freeze([
    "guestGiftAndDistribution", "chocolateAndIncenseBoxes", "giftWrappingAndCustomDesigns", "congratulationsAndGiftCards",
  ]),
  foodAndBeverages: Object.freeze([
    "occasionCakes", "traditionalOrInternationalCuisine", "slaughterAndRice", "mobileFoodTrucks", "completeHospitalityBuffet",
  ]),
  beautyAndFashion: Object.freeze([
    "homeBeautyServices", "weddingAndOccasionDressRentals", "abayaDesignAndWomensTailoring", "barberAndGroomingSalons", "mensClothingTailoring",
  ]),
  logisticsAndDelivery: Object.freeze([
    "vipDriverAndHospitality", "giftAndOrderDelivery", "guestTransportationCoordination", "occasionCarRentals",
  ]),
  corporateServices: Object.freeze([
    "conferenceAndExhibitionOrganization", "corporatePromotionalGiftPreparation", "officialPrintingAndDesignSolutions", "guestReceptionAndRegistration",
  ]),
  supportServices: Object.freeze([
    "eventPlanners", "guestCoordinators", "receptionStaff", "entrySupervisors",
  ]),
  technicalServices: Object.freeze([
    "liveStreaming", "ticketingPlatforms", "arVrServices",
  ]),
  soundLightingEntertainment: Object.freeze([
    "professionalSoundSystems", "lightingVisualEffects", "musicalEntertainment",
  ]),
  hallsAndVenues: Object.freeze([
    "eventHalls", "privateResthouses", "hotelBallrooms",
  ]),
});
export const ALLOWED_CATEGORY_KEYS = Object.freeze(Object.keys(AUTHORITATIVE_CATEGORY_OPTIONS));

const isFilePresent = (val) => {
  if (!val) return false;
  if (typeof File !== "undefined" && val instanceof File) return true;
  if (typeof val === "object" && (val.uri || val.name || val.path)) return true;
  if (Array.isArray(val) && val.length > 0) return true;
  return false;
};

const MAX_VENDOR_FILE_SIZE = 10 * 1024 * 1024;
const IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);
const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);
const MIXED_MIMES = new Set(["image/jpeg", "image/png", "application/pdf"]);
const MIXED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "pdf"]);
const PROFILE_MIMES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const PROFILE_EXTENSIONS = new Set(["pdf", "doc", "docx"]);
const MIME_BY_EXTENSION = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

const getFileMetadata = (value) => {
  if (!value || typeof value !== "object") return null;
  const name = value.name || value.fileName || value.uri || value.path || "";
  const extension = String(name).split("?")[0].split(".").pop()?.toLowerCase() || "";
  const declaredType = value.mimeType || value.type || "";
  const mime = typeof declaredType === "string" && declaredType.includes("/")
    ? declaredType.toLowerCase()
    : "";
  return { extension, mime, size: Number(value.size) || 0 };
};

const isAllowedFile = (value, allowedMimes, allowedExtensions) => {
  const metadata = getFileMetadata(value);
  if (!metadata || metadata.size > MAX_VENDOR_FILE_SIZE) return false;
  if (!allowedExtensions.has(metadata.extension)) return false;
  if (!metadata.mime) return true;
  return allowedMimes.has(metadata.mime) && MIME_BY_EXTENSION[metadata.extension] === metadata.mime;
};

const optionalHttpUrl = () =>
  z.union([
    z.literal(""),
    z.string().trim().url().refine((value) => /^https?:\/\//i.test(value), {
      message: "URL must use http or https",
    }),
  ]).optional();

export const vendorSignupSchema = (t = idT) =>
  z.object({
    identity: z
      .object({
        brandName: presentString(z
          .string()
          .min(2, t("signupForm.vendor.identity.errors.brandNameMinLength", { defaultValue: "Brand name must be at least 2 characters" }))
          .max(100, t("signupForm.vendor.identity.errors.brandNameMaxLength", { defaultValue: "Brand name must not exceed 100 characters" }))),
        ownerFullName: presentString(z
          .string()
          .min(2, t("signupForm.vendor.identity.errors.ownerFullNameMinLength", { defaultValue: "Owner full name must be at least 2 characters" }))
          .max(100, t("signupForm.vendor.identity.errors.ownerFullNameMaxLength", { defaultValue: "Owner full name must not exceed 100 characters" }))),
        phoneNumber: saudiPhone(t),
        email: email(t),
        password: password(t),
        passwordConfirm: presentString(z.string().min(1, t("signupForm.vendor.identity.errors.passwordConfirmRequired", { defaultValue: "Password confirmation is required" }))),
        preferredLanguage: z.enum(["ar", "en"]).optional().default("ar"),
      })
      .refine((data) => data.password === data.passwordConfirm, {
        message: t("signupForm.vendor.identity.errors.passwordsDoNotMatch", { defaultValue: "Passwords do not match" }),
        path: ["passwordConfirm"],
      }),

    serviceData: z
      .object({
        serviceDescription: presentString(z
          .string()
          .min(10, t("signupForm.vendor.serviceData.errors.serviceDescriptionMinLength", { defaultValue: "Service description must be at least 10 characters" }))
          .max(500, t("signupForm.vendor.serviceData.errors.serviceDescriptionMaxLength", { defaultValue: "Service description must not exceed 500 characters" }))),
        taglineAr: optionalLanguageText(160, containsOnlyArabicText, t("signupForm.vendor.serviceData.errors.arabicOnly", { defaultValue: "Use Arabic letters only" })),
        taglineEn: optionalLanguageText(160, containsOnlyEnglishText, t("signupForm.vendor.serviceData.errors.englishOnly", { defaultValue: "Use English letters only" })),
        aboutAr: optionalLanguageText(2000, containsOnlyArabicText, t("signupForm.vendor.serviceData.errors.arabicOnly", { defaultValue: "Use Arabic letters only" })),
        aboutEn: optionalLanguageText(2000, containsOnlyEnglishText, t("signupForm.vendor.serviceData.errors.englishOnly", { defaultValue: "Use English letters only" })),
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
          regionId: z
            .coerce
            .number()
            .int()
            .min(1, t("signupForm.vendor.serviceData.errors.regionRequired", { defaultValue: "Region is required" })),
          regionNameAr: z.string().optional(),
          regionNameEn: z.string().optional(),
          cityId: z.coerce.number().int().nullable().optional(),
          cityNameAr: z.string().optional(),
          cityNameEn: z.string().optional(),
          districtIds: z.array(z.coerce.number().int()).optional().default([]),
          districtNames: z
            .array(z.object({ nameAr: z.string().optional(), nameEn: z.string().optional() }))
            .optional()
            .default([]),
          coverageType: z.enum(["region", "city", "districts"]).default("city"),
        }),
        otherData: z.string().optional(),
      })
      .superRefine((data, ctx) => {
        let totalSelections = 0;
        for (const key of ALLOWED_CATEGORY_KEYS) {
          if (Array.isArray(data[key])) {
            totalSelections += data[key].length;
            const allowed = new Set(AUTHORITATIVE_CATEGORY_OPTIONS[key]);
            const invalid = data[key].filter((opt) => !allowed.has(opt));
            if (invalid.length > 0) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: [key],
                message: `Invalid option IDs for category ${key}: ${invalid.join(", ")}`,
              });
            }
          }
        }
        if (totalSelections === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["eventPlanning"],
            message: t("signupForm.vendor.serviceData.errors.categoriesRequired", {
              defaultValue: "At least one service category option must be selected",
            }),
          });
        }
        const location = data.serviceLocation;
        if (location.coverageType === "city" && !location.cityId) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["serviceLocation", "cityId"],
            message: t("signupForm.vendor.serviceData.errors.cityRequired", { defaultValue: "City is required when city coverage is selected" }),
          });
        }
        if (location.coverageType === "districts" && (!location.cityId || location.districtIds.length === 0)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["serviceLocation", "districtIds"],
            message: t("signupForm.vendor.serviceData.errors.districtsRequired", { defaultValue: "Choose at least one district" }),
          });
        }
      }),

    samplesAndPackages: z.object({
      portfolioImages: z
        .array(z.any().refine((file) => isAllowedFile(file, IMAGE_MIMES, IMAGE_EXTENSIONS), {
          message: t("signupForm.vendor.samplesAndPackages.errors.invalidPortfolioFile", { defaultValue: "Portfolio files must be JPG, PNG, or WebP images up to 10 MB" }),
        }))
        .min(1, t("signupForm.vendor.samplesAndPackages.errors.portfolioImagesRequired", { defaultValue: "At least one portfolio image is required" }))
        .max(10, t("signupForm.vendor.samplesAndPackages.errors.portfolioImagesMax", { defaultValue: "Maximum 10 portfolio images allowed" })),
      businessLogo: z.any().optional().refine(
        (file) => !file || isAllowedFile(Array.isArray(file) ? file[0] : file, IMAGE_MIMES, IMAGE_EXTENSIONS),
        { message: t("signupForm.vendor.samplesAndPackages.errors.invalidLogoFile", { defaultValue: "Logo must be a JPG, PNG, or WebP image up to 10 MB" }) }
      ),
      pricePackages: z
        .array(z.any().refine((file) => isAllowedFile(file, MIXED_MIMES, MIXED_EXTENSIONS), {
          message: t("signupForm.vendor.samplesAndPackages.errors.invalidPricePackageFile", { defaultValue: "Price packages must be PDF, JPG, or PNG files up to 10 MB" }),
        }))
        .min(1, t("signupForm.vendor.samplesAndPackages.errors.pricePackagesRequired", { defaultValue: "At least one price package file is required" }))
        .max(5, t("signupForm.vendor.samplesAndPackages.errors.pricePackagesMax", { defaultValue: "Maximum 5 price packages allowed" })),
      profileFile: z.any().optional().refine(
        (file) => !file || isAllowedFile(Array.isArray(file) ? file[0] : file, PROFILE_MIMES, PROFILE_EXTENSIONS),
        { message: t("signupForm.vendor.samplesAndPackages.errors.invalidProfileFile", { defaultValue: "Company profile must be a PDF, DOC, or DOCX file up to 10 MB" }) }
      ),
    }),

    commercialVerification: z.object({
      commercialRecordNumber: z
        .string()
        .min(1, t("signupForm.vendor.paymentData.errors.licenseNumberRequired", { defaultValue: "Commercial registration number is required" }))
        .regex(
          SAUDI_COMMERCIAL_REG_REGEX,
          t("signupForm.vendor.commercialVerification.commercialRecord.invalidFormat", { defaultValue: "Commercial registration number must be 10 digits" })
        ),
      commercialRecordImage: z
        .any()
        .refine(isFilePresent, {
          message: t("signupForm.vendor.commercialVerification.commercialRecord.imageRequired", {
            defaultValue: "Commercial registration document is required",
          }),
        })
        .refine((file) => isAllowedFile(Array.isArray(file) ? file[0] : file, MIXED_MIMES, MIXED_EXTENSIONS), {
          message: t("signupForm.vendor.commercialVerification.commercialRecord.invalidFile", { defaultValue: "Commercial registration document must be PDF, JPG, or PNG up to 10 MB" }),
        }),
      nationalId: z
        .string()
        .min(1, t("signupForm.vendor.commercialVerification.nationalId.label", { defaultValue: "National ID is required" }))
        .regex(
          SAUDI_NATIONAL_ID_REGEX,
          t("signupForm.vendor.commercialVerification.nationalId.invalidFormat", { defaultValue: "National ID must be 10 digits starting with 1 or 2" })
        ),
      nationalIdImage: z
        .any()
        .refine(isFilePresent, {
          message: t("signupForm.vendor.commercialVerification.nationalId.imageRequired", {
            defaultValue: "National ID document is required",
          }),
        })
        .refine((file) => isAllowedFile(Array.isArray(file) ? file[0] : file, MIXED_MIMES, MIXED_EXTENSIONS), {
          message: t("signupForm.vendor.commercialVerification.nationalId.invalidFile", { defaultValue: "National ID document must be PDF, JPG, or PNG up to 10 MB" }),
        }),
    }),

    socialLinks: z
      .object({
        instagram: optionalHttpUrl(),
        facebook: optionalHttpUrl(),
        tiktok: optionalHttpUrl(),
        twitter: optionalHttpUrl(),
        linkedin: optionalHttpUrl(),
        youtube: optionalHttpUrl(),
        website: optionalHttpUrl(),
        whatsapp: z
          .string()
          .trim()
          .refine(
            (val) => !val || isValidPhone(val) || /^\+?[0-9]{8,15}$/.test(val.replace(/[\s()-]/g, "")),
            {
              message: t("signupForm.vendor.socialLinks.errors.invalidWhatsApp", {
                defaultValue: "Invalid WhatsApp phone number",
              }),
            }
          )
          .optional()
          .or(z.literal("")),
      })
      .optional()
      .default({}),
  });

export const canonicalVendorApplicationSchema = (t = idT) =>
  z
    .object({
      email: email(t),
      phoneNumber: saudiPhone(t),
      password: password(t),
      passwordConfirm: z.string().min(1, t("validation.required", { defaultValue: "Password confirmation is required" })),
      preferredLanguage: z.enum(["ar", "en"]).optional().default("ar"),
      brandName: z.string().trim().min(2).max(100),
      ownerFullName: z.string().trim().min(2).max(100),
      serviceDescription: z.string().trim().min(10).max(500),
      taglineAr: optionalLanguageText(160, containsOnlyArabicText, "Use Arabic letters only"),
      taglineEn: optionalLanguageText(160, containsOnlyEnglishText, "Use English letters only"),
      aboutAr: optionalLanguageText(2000, containsOnlyArabicText, "Use Arabic letters only"),
      aboutEn: optionalLanguageText(2000, containsOnlyEnglishText, "Use English letters only"),
      serviceCategories: z.record(z.string(), z.array(z.string())).superRefine((categories, ctx) => {
        if (!categories || typeof categories !== "object") {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Service categories must be an object" });
          return;
        }
        const keys = Object.keys(categories);
        const unknownKeys = keys.filter((k) => !ALLOWED_CATEGORY_KEYS.includes(k));
        if (unknownKeys.length > 0) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Invalid service category keys: ${unknownKeys.join(", ")}` });
        }
        let totalSelections = 0;
        for (const [key, options] of Object.entries(categories)) {
          if (Array.isArray(options)) {
            totalSelections += options.length;
            const allowed = new Set(AUTHORITATIVE_CATEGORY_OPTIONS[key] || []);
            const unknownOptions = options.filter((opt) => !allowed.has(opt));
            if (unknownOptions.length > 0) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Invalid option IDs for category "${key}": ${unknownOptions.join(", ")}`,
              });
            }
          }
        }
        if (totalSelections === 0) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "At least one service category option must be selected" });
        }
      }),
      location: z.object({
        regionId: z.coerce.number().int().min(1),
        regionNameAr: z.string().optional(),
        regionNameEn: z.string().optional(),
        cityId: z.coerce.number().int().nullable().optional(),
        cityNameAr: z.string().optional(),
        cityNameEn: z.string().optional(),
        districtIds: z.array(z.coerce.number().int()).optional().default([]),
        districtNames: z.array(z.object({ nameAr: z.string().optional(), nameEn: z.string().optional() })).optional().default([]),
        coverageType: z.enum(["region", "city", "districts"]).default("city"),
      }),
      socialLinks: z.object({
        instagram: optionalHttpUrl(),
        facebook: optionalHttpUrl(),
        tiktok: optionalHttpUrl(),
        twitter: optionalHttpUrl(),
        linkedin: optionalHttpUrl(),
        youtube: optionalHttpUrl(),
        website: optionalHttpUrl(),
        whatsapp: z.string().trim().optional().or(z.literal("")),
      }).optional().default({}),
      nationalId: z.string().trim().regex(SAUDI_NATIONAL_ID_REGEX),
      commercialRegistrationNumber: z.string().trim().regex(SAUDI_COMMERCIAL_REG_REGEX),
      otherData: z.string().optional(),
    })
    .strict()
    .refine((data) => data.password === data.passwordConfirm, {
      message: t("validation.passwordMismatch", { defaultValue: "Passwords do not match" }),
      path: ["passwordConfirm"],
    })
    .superRefine((data, ctx) => {
      const location = data.location;
      if (location?.coverageType === "city" && !location.cityId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["location", "cityId"],
          message: "City is required when city coverage is selected",
        });
      }
      if (location?.coverageType === "districts" && (!location.cityId || location.districtIds.length === 0)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["location", "districtIds"],
          message: "Choose at least one district",
        });
      }
      if (data.socialLinks && data.socialLinks.whatsapp) {
        const wa = data.socialLinks.whatsapp.trim();
        if (wa !== "" && !isValidPhone(wa) && !/^\+?[0-9]{8,15}$/.test(wa.replace(/[\s()-]/g, ""))) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["socialLinks", "whatsapp"],
            message: "Invalid WhatsApp phone number",
          });
        }
      }
    });

// ============================================================
// PROFILE
// ============================================================

export const updateProfileSchema = (t = idT) =>
  z.object({
    name: z.string().optional(),
    phoneNumber: saudiPhone(t).optional().or(z.literal("")),
    avatar: z.any().optional(),
  });

// ============================================================
// AUTH STORE SNAPSHOT
// ============================================================
// Canonical shape of the persisted slice of both apps' auth stores.
// Web persists to localStorage via zustand `persist`; mobile mirrors the
// user object to secure-store as a cold-launch shadow. The full store
// object holds additional in-memory fields (status machine, OTP flow
// state, errors); only the fields below are *durable* and shared.
//
// Tokens are NEVER part of the snapshot:
//   - web: access + refresh tokens live in HttpOnly cookies (server-set)
//   - mobile: refresh token lives in expo-secure-store; access token is
//     in-memory only (rotated via /auth/refresh on cold-launch)
//
// `subscription` is optional because mobile fetches it through a
// dedicated RQ query (`hooks/subscriptions/`) rather than persisting it
// in the auth store. Web keeps it here because the login response
// envelope returns it inline.
export const AUTH_STATUS_VALUES = [
  "checking",
  "loading",
  "authenticated",
  "unauthenticated",
];

export const authStatusSchema = z.enum(AUTH_STATUS_VALUES);

export const authStoreSnapshotSchema = z
  .object({
    user: z
      .object({
        _id: z.string().optional(),
        id: z.string().optional(),
        role: z.string(),
        email: z.string().optional().nullable(),
        phoneNumber: z.string().optional().nullable(),
        name: z.string().optional().nullable(),
        roleData: z.record(z.any()).optional(),
      })
      .passthrough()
      .nullable(),
    subscription: z.record(z.any()).nullable().optional(),
  })
  .passthrough();

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
  canonicalVendorApplication: canonicalVendorApplicationSchema,

  updateProfile: updateProfileSchema,

  authStoreSnapshot: authStoreSnapshotSchema,
  authStatus: authStatusSchema,
};

export default authSchemas;
