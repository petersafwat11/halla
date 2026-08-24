/**
 * Vendor schemas — vendor settings sections + service form.
 *
 * Factory functions; pass `t` for translation, omit for opaque keys.
 * Field shapes mirror backend `users.validation.js#vendorData`.
 */
import { z } from "zod";
import { saudiPhone } from "./_shared.js";

const idT = (k) => k;

// ============================================================
// PRIMITIVES (vendor-local; mirrors the regex backend accepts)
// ============================================================

const optionalUrl = (t = idT) =>
  z
    .string()
    .trim()
    .max(2048)
    .refine((v) => v === "" || /^https?:\/\/.+/i.test(v), {
      message: t("validation.invalidUrl"),
    });

const optionalUrlEn = (t = idT) =>
  z
    .string()
    .trim()
    .max(2048)
    .refine((v) => v === "" || /^https?:\/\/.+/i.test(v), {
      message: t("validation.invalidUrl"),
    })
    .optional();

const emailField = (t = idT) =>
  z
    .string({ required_error: t("validation.emailRequired") })
    .trim()
    .min(1, t("validation.emailRequired"))
    .email(t("validation.emailInvalid"));

const phoneField = (t = idT) => saudiPhone(t);

// ============================================================
// WEB — VENDOR SETTINGS ZOD SCHEMAS (consumed by DynamicForm wrappers)
// ============================================================

export const personalInfoZodSchema = (t = idT) =>
  z
    .object({
      avatar: z.any().optional(),
      ownerFullName: z
        .string({ required_error: t("validation.ownerNameRequired") })
        .trim()
        .min(2, t("validation.ownerNameMinLength"))
        .max(100, t("validation.ownerNameMaxLength")),
      brandName: z
        .string({ required_error: t("validation.brandNameRequired") })
        .trim()
        .min(2, t("validation.brandNameMinLength"))
        .max(100, t("validation.brandNameMaxLength")),
      email: emailField(t),
      phoneNumber: saudiPhone(t).optional().or(z.literal("")),
      currentPassword: z.string().optional(),
      newPassword: z
        .string()
        .optional()
        .refine((v) => !v || v.length >= 8, {
          message: t("validation.passwordMinLength"),
        }),
      confirmPassword: z.string().optional(),
    })
    .superRefine((d, ctx) => {
      if (d.newPassword) {
        if (!d.currentPassword) {
          ctx.addIssue({
            path: ["currentPassword"],
            code: "custom",
            message: t("validation.currentPasswordRequired"),
          });
        }
        if (d.newPassword !== d.confirmPassword) {
          ctx.addIssue({
            path: ["confirmPassword"],
            code: "custom",
            message: t("validation.passwordMismatch"),
          });
        }
      }
    });

export const serviceDetailsZodSchema = (t = idT) =>
  z.object({
    nationalIdImage: z.any().optional(),
    commercialRecordImage: z.any().optional(),
    nationalId: z
      .string()
      .trim()
      .optional()
      .refine((v) => !v || /^[0-9]{10}$/.test(v), {
        message: t("validation.nationalIdInvalid"),
      }),
    serviceDescription: z
      .string()
      .trim()
      .max(1000, t("validation.descriptionMaxLength"))
      .optional(),
    taglineAr: z.string().trim().max(160).optional(),
    taglineEn: z.string().trim().max(160).optional(),
    aboutAr: z.string().trim().max(2000).optional(),
    aboutEn: z.string().trim().max(2000).optional(),
  });

export const socialLinksZodSchema = (t = idT) =>
  z.object({
    website: optionalUrl(t).optional(),
    instagram: optionalUrl(t).optional(),
    facebook: optionalUrl(t).optional(),
    twitter: optionalUrl(t).optional(),
    tiktok: optionalUrl(t).optional(),
    whatsapp: saudiPhone(t).optional().or(z.literal("")),
  });

export const imagesAndPricingZodSchema = z.object({
  portfolioImages: z.any().optional(),
  pricePackages: z.any().optional(),
});

// ============================================================
// MOBILE — VENDOR SETTINGS SCHEMAS
// ============================================================

export const mobilePersonalInfoSchema = (t = idT) =>
  z.object({
    ownerFullName: z
      .string({ required_error: t("validation.ownerNameRequired") })
      .trim()
      .min(2, t("validation.ownerNameMinLength"))
      .max(100, t("validation.ownerNameMaxLength")),
    brandName: z
      .string({ required_error: t("validation.brandNameRequired") })
      .trim()
      .min(2, t("validation.brandNameMinLength"))
      .max(100, t("validation.brandNameMaxLength")),
    email: emailField(t),
    phoneNumber: saudiPhone(t).optional().or(z.literal("")),
  });

export const mobileServiceDetailsSchema = (t = idT) =>
  z.object({
    serviceDescription: z
      .string()
      .trim()
      .max(1000, t("validation.descriptionMaxLength"))
      .optional(),
    taglineAr: z.string().trim().max(160).optional(),
    taglineEn: z.string().trim().max(160).optional(),
    aboutAr: z.string().trim().max(2000).optional(),
    aboutEn: z.string().trim().max(2000).optional(),
    nationalId: z
      .string()
      .trim()
      .optional()
      .refine((v) => !v || /^\d{10}$/.test(v), {
        message: t("validation.nationalIdInvalid"),
      }),
  });

export const mobileSocialLinksSchema = (t = idT) =>
  z.object({
    website: optionalUrlEn(t),
    instagram: optionalUrlEn(t),
    facebook: optionalUrlEn(t),
    twitter: optionalUrlEn(t),
    tiktok: optionalUrlEn(t),
    whatsapp: saudiPhone(t).optional().or(z.literal("")),
  });

export const phoneChangeSchema = (t = idT) =>
  z.object({
    phoneNumber: phoneField(t),
  });

export const phoneVerifySchema = (t = idT) =>
  z.object({
    phoneNumber: phoneField(t),
    otp: z
      .string({ required_error: t("validation.otpRequired") })
      .trim()
      .regex(/^\d{4,8}$/, t("validation.otpInvalid")),
  });

export const passwordChangeSchema = (t = idT) =>
  z
    .object({
      currentPassword: z
        .string({ required_error: t("validation.currentPasswordRequired") })
        .min(1, t("validation.currentPasswordRequired")),
      newPassword: z
        .string({ required_error: t("validation.passwordMinLength") })
        .min(8, t("validation.passwordMinLength")),
      passwordConfirm: z
        .string({ required_error: t("validation.confirmPasswordRequired") })
        .min(1, t("validation.confirmPasswordRequired")),
    })
    .refine((d) => d.newPassword === d.passwordConfirm, {
      path: ["passwordConfirm"],
      message: t("validation.passwordMismatch"),
    });

// ============================================================
// VENDOR SERVICE FORM & LIMITS CONTRACT (MKT-03, MKT-04)
// ============================================================

export const SERVICE_LIMITS = Object.freeze({
  NAME_MIN: 2,
  NAME_MAX: 200,
  NAME_AR_MAX: 200,
  DESCRIPTION_MIN: 10,
  DESCRIPTION_MAX: 2000,
  DESCRIPTION_AR_MAX: 2000,
  DURATION_MAX: 100,
  PRICE_MIN: 0,
});

export const SERVICE_TYPES = [
  { value: "eventPlanning", labelKey: "services.serviceTypes.eventPlanning", labelAr: "تخطيط الفعاليات", labelEn: "Event Planning" },
  { value: "mediaProduction", labelKey: "services.serviceTypes.mediaProduction", labelAr: "الإنتاج الإعلامي", labelEn: "Media Production" },
  { value: "giftsAndGiveaways", labelKey: "services.serviceTypes.giftsAndGiveaways", labelAr: "الهدايا والتوزيعات", labelEn: "Gifts & Giveaways" },
  { value: "foodAndBeverages", labelKey: "services.serviceTypes.foodAndBeverages", labelAr: "الأطعمة والمشروبات", labelEn: "Food & Beverages" },
  { value: "beautyAndFashion", labelKey: "services.serviceTypes.beautyAndFashion", labelAr: "التجميل والأزياء", labelEn: "Beauty & Fashion" },
  { value: "logisticsAndDelivery", labelKey: "services.serviceTypes.logisticsAndDelivery", labelAr: "اللوجستيات والتوصيل", labelEn: "Logistics & Delivery" },
  { value: "corporateServices", labelKey: "services.serviceTypes.corporateServices", labelAr: "خدمات الشركات", labelEn: "Corporate Services" },
  { value: "supportServices", labelKey: "services.serviceTypes.supportServices", labelAr: "خدمات الدعم", labelEn: "Support Services" },
  { value: "technicalServices", labelKey: "services.serviceTypes.technicalServices", labelAr: "الخدمات التقنية", labelEn: "Technical Services" },
  { value: "soundLightingEntertainment", labelKey: "services.serviceTypes.soundLightingEntertainment", labelAr: "الصوت والإضاءة والترفيه", labelEn: "Sound, Lighting & Entertainment" },
  { value: "hallsAndVenues", labelKey: "services.serviceTypes.hallsAndVenues", labelAr: "القاعات والأماكن", labelEn: "Halls & Venues" },
];

export const PREDEFINED_TAGS = [
  { value: "weddings", labelKey: "services.tags.weddings", labelAr: "افراح", labelEn: "Weddings" },
  { value: "graduation", labelKey: "services.tags.graduation", labelAr: "تخرج", labelEn: "Graduation" },
  { value: "birthdays", labelKey: "services.tags.birthdays", labelAr: "أعياد ميلاد", labelEn: "Birthdays" },
  { value: "corporate", labelKey: "services.tags.corporate", labelAr: "فعاليات شركات", labelEn: "Corporate" },
  { value: "engagement", labelKey: "services.tags.engagement", labelAr: "خطوبة", labelEn: "Engagement" },
  { value: "baby_shower", labelKey: "services.tags.babyShower", labelAr: "استقبال مولود", labelEn: "Baby Shower" },
];

export const serviceLocationSchema = z
  .object({
    regionId: z.coerce.number().int().nullable().optional(),
    regionNameAr: z.string().nullable().optional(),
    regionNameEn: z.string().nullable().optional(),
    cityId: z.coerce.number().int().nullable().optional(),
    cityNameAr: z.string().nullable().optional(),
    cityNameEn: z.string().nullable().optional(),
    districtIds: z.array(z.coerce.number().int()).optional(),
    districtNames: z
      .array(z.object({ nameAr: z.string().optional(), nameEn: z.string().optional() }))
      .optional(),
    coverageType: z.enum(["region", "city", "districts"]).optional(),
  })
  .partial()
  .optional();

export const normalizeArabicDigits = (str) =>
  typeof str === "string"
    ? str
        .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
        .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    : str;

/**
 * Unified Vendor Service Form Schema (used across web and mobile)
 */
export const vendorServiceFormSchema = (t = idT) =>
  z.object({
    serviceName: z
      .string({ required_error: t("services.validation.nameRequired") })
      .trim()
      .min(SERVICE_LIMITS.NAME_MIN, t("services.validation.nameMinLength"))
      .max(SERVICE_LIMITS.NAME_MAX, t("services.validation.nameMaxLength")),
    serviceNameAr: z
      .string()
      .trim()
      .max(SERVICE_LIMITS.NAME_AR_MAX, t("services.validation.nameMaxLength"))
      .optional()
      .or(z.literal("")),
    serviceType: z
      .string({ required_error: t("services.validation.typeRequired") })
      .min(1, t("services.validation.typeRequired")),
    description: z
      .string({ required_error: t("services.validation.descriptionRequired") })
      .trim()
      .min(SERVICE_LIMITS.DESCRIPTION_MIN, t("services.validation.descriptionMinLength"))
      .max(SERVICE_LIMITS.DESCRIPTION_MAX, t("services.validation.descriptionMaxLength")),
    descriptionAr: z
      .string()
      .trim()
      .max(SERVICE_LIMITS.DESCRIPTION_AR_MAX, t("services.validation.descriptionMaxLength"))
      .optional()
      .or(z.literal("")),
    price: z
      .union([z.string(), z.number()])
      .transform((val) => (typeof val === "string" ? normalizeArabicDigits(val.trim()) : val))
      .refine((v) => v !== "" && v !== null && v !== undefined, {
        message: t("services.validation.priceRequired"),
      })
      .refine((v) => !Number.isNaN(Number(v)) && Number(v) >= SERVICE_LIMITS.PRICE_MIN, {
        message: t("services.validation.priceInvalid"),
      }),
    serviceLocation: serviceLocationSchema,
    image: z.any().optional(),
    serviceImage: z.any().optional(),
    tags: z.array(z.string()).optional(),
    included: z.array(z.string()).optional(),
    duration: z.string().trim().max(SERVICE_LIMITS.DURATION_MAX).optional().or(z.literal("")),
  });

export const addServiceDefaultValues = {
  serviceName: "",
  serviceNameAr: "",
  serviceType: "",
  description: "",
  descriptionAr: "",
  price: "",
  image: undefined,
  serviceImage: undefined,
  tags: [],
  included: [],
};

// ============================================================
// MARKETPLACE QUERY CONTRACT SCHEMAS (MKT-01, MKT-02)
// ============================================================

export const parseDistrictIds = (val) => {
  if (!val) return undefined;
  if (Array.isArray(val)) {
    const numbers = val.map(Number).filter((n) => Number.isInteger(n) && n > 0);
    return numbers.length > 0 ? numbers : undefined;
  }
  if (typeof val === "string") {
    const numbers = val
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n > 0);
    return numbers.length > 0 ? numbers : undefined;
  }
  if (typeof val === "number" && Number.isInteger(val) && val > 0) {
    return [val];
  }
  return undefined;
};

export const marketplaceSortOptions = [
  "rating",
  "price_asc",
  "price_desc",
  "recent",
  "default",
];

export const getPublicVendorsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(12),
    search: z.string().trim().optional(),
    category: z.string().trim().optional(),
    regionId: z.coerce.number().int().positive().optional(),
    cityId: z.coerce.number().int().positive().optional(),
    districtIds: z.any().transform(parseDistrictIds).optional(),
    districtId: z.coerce.number().int().positive().optional(),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    rating: z.coerce.number().min(0).max(5).optional(),
    minRating: z.coerce.number().min(0).max(5).optional(),
    sort: z.enum(marketplaceSortOptions).optional().default("default"),
    lang: z.enum(["ar", "en"]).optional().default("ar"),
  })
  .transform((data) => {
    if (!data.districtIds && data.districtId) {
      data.districtIds = [data.districtId];
    }
    if (data.rating !== undefined && data.minRating === undefined) {
      data.minRating = data.rating;
    }
    return data;
  });

export const getPublicServicesQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().optional(),
    category: z.string().trim().optional(),
    vendorId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
    regionId: z.coerce.number().int().positive().optional(),
    cityId: z.coerce.number().int().positive().optional(),
    districtIds: z.any().transform(parseDistrictIds).optional(),
    districtId: z.coerce.number().int().positive().optional(),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    minRating: z.coerce.number().min(0).max(5).optional(),
    sort: z.string().optional(),
  })
  .transform((data) => {
    if (!data.districtIds && data.districtId) {
      data.districtIds = [data.districtId];
    }
    return data;
  });

// ============================================================
// MARKETPLACE ANALYTICS EVENT TRACKING CONTRACT (MKT-10)
// ============================================================

export const MARKETPLACE_EVENT_TYPES = Object.freeze([
  "service_view",
  "vendor_view",
  "contact_click",
]);

export const MARKETPLACE_TARGET_TYPES = Object.freeze([
  "service",
  "vendor",
]);

export const MARKETPLACE_CONTACT_METHODS = Object.freeze([
  "whatsapp",
  "phone",
  "email",
  "website",
  "social",
  "service_request",
]);

export const marketplaceTrackSchema = z.object({
  eventType: z.enum(MARKETPLACE_EVENT_TYPES),
  targetType: z.enum(MARKETPLACE_TARGET_TYPES),
  targetId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId"),
  contactMethod: z.enum(MARKETPLACE_CONTACT_METHODS).optional(),
  metadata: z.record(z.any()).optional(),
});


