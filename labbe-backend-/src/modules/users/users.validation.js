const { z } = require("zod");

// ============================================================================
// PASSWORD
// ============================================================================
const updatePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    passwordConfirm: z.string().min(1, "Password confirmation is required"),
  })
  .refine((d) => d.newPassword === d.passwordConfirm, {
    path: ["passwordConfirm"],
    message: "Passwords do not match",
  });

// ============================================================================
// TOP-LEVEL PROFILE UPDATE
// `phoneNumber` is NOT here — phone changes go through the dedicated OTP-gated
// route. Email change is allowed and resets `emailVerified` server-side.
// ============================================================================
const updateProfileSchema = z
  .object({
    username: z.string().min(2).max(50).optional(),
    name: z.string().min(1).max(100).optional(),
    email: z.string().email().optional(),
    preferredLanguage: z.enum(["ar", "en"]).optional(),
  })
  .strict();

// ============================================================================
// SECTION-DISCRIMINATED UPDATE SCHEMAS
// ============================================================================
const profileSectionParamSchema = z.object({
  section: z.enum([
    "hostData",
    "vendorData",
    "businessInfo",
    "contactInfo",
    "documents",
  ]),
});

const VENDOR_CATEGORY_KEYS = [
  "eventPlanning",
  "mediaProduction",
  "giftsAndGiveaways",
  "foodAndBeverages",
  "beautyAndFashion",
  "logisticsAndDelivery",
  "corporateServices",
  "supportServices",
  "technicalServices",
  "soundLightingEntertainment",
  "hallsAndVenues",
];

const serviceCategoriesSchema = z
  .object(
    VENDOR_CATEGORY_KEYS.reduce((acc, k) => {
      acc[k] = z.array(z.string()).optional();
      return acc;
    }, {})
  )
  .strict();

const serviceLocationSchema = z
  .object({
    regionId: z.number().int().optional(),
    regionNameAr: z.string().optional(),
    regionNameEn: z.string().optional(),
    cityId: z.number().int().nullable().optional(),
    cityNameAr: z.string().optional(),
    cityNameEn: z.string().optional(),
    districtIds: z.array(z.number().int()).optional(),
    districtNames: z
      .array(z.object({ nameAr: z.string().optional(), nameEn: z.string().optional() }))
      .optional(),
    coverageType: z.enum(["region", "city", "districts"]).optional(),
  })
  .strict();

const optionalUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((v) => v === "" || /^https?:\/\/.+/i.test(v), {
    message: "Must be a valid http(s) URL",
  })
  .optional();

const socialLinksSchema = z
  .object({
    instagram: optionalUrl,
    facebook: optionalUrl,
    tiktok: optionalUrl,
    twitter: optionalUrl,
    website: optionalUrl,
    whatsapp: z.string().trim().max(50).optional(),
  })
  .strict();

const vendorDataUpdateSchema = z
  .object({
    brandName: z.string().trim().min(2).max(100).optional(),
    ownerFullName: z.string().trim().min(2).max(100).optional(),
    serviceDescription: z.string().trim().max(1000).optional(),
    serviceCategories: serviceCategoriesSchema.optional(),
    serviceLocation: serviceLocationSchema.optional(),
    socialLinks: socialLinksSchema.optional(),
    nationalId: z.string().trim().regex(/^\d{10}$/, "National ID must be 10 digits").optional().or(z.literal("")),
    commercialRecordNumber: z.string().trim().max(50).optional().or(z.literal("")),
    otherData: z.string().trim().max(1000).optional(),
  })
  .strict();

const hostDataUpdateSchema = z
  .object({
    bio: z.string().trim().max(1000).optional(),
    company: z.string().trim().max(200).optional(),
    position: z.string().trim().max(200).optional(),
  })
  .strict();

// Documents section is image-only — multer middleware handles the files; the
// body should not carry any user-supplied scalar keys.
const documentsUpdateSchema = z.object({}).strict();

const businessInfoUpdateSchema = z.object({}).strict();
const contactInfoUpdateSchema = z.object({}).strict();

const SECTION_SCHEMAS = {
  vendorData: vendorDataUpdateSchema,
  hostData: hostDataUpdateSchema,
  documents: documentsUpdateSchema,
  businessInfo: businessInfoUpdateSchema,
  contactInfo: contactInfoUpdateSchema,
};

/**
 * Build a per-request Zod validator that picks the right schema based on the
 * `section` route param. Returns the matched schema or throws if unknown.
 */
const getSectionSchema = (section) => {
  const schema = SECTION_SCHEMAS[section];
  if (!schema) throw new Error(`No schema registered for section: ${section}`);
  return schema;
};

// ============================================================================
// NOTIFICATIONS
// ============================================================================
const notificationKeysSchema = z.record(z.boolean());

const updateNotificationPreferencesSchema = z
  .object({
    appNotifications: notificationKeysSchema.optional(),
    emailNotifications: notificationKeysSchema.optional(),
    smsNotifications: notificationKeysSchema.optional(),
  })
  .strict();

// ============================================================================
// PHONE CHANGE (OTP-GATED)
// ============================================================================
const phoneNumberField = z
  .string()
  .trim()
  .min(7, "Phone number is too short")
  .max(20, "Phone number is too long");

const sendPhoneOtpSchema = z.object({ phoneNumber: phoneNumberField }).strict();

const updatePhoneSchema = z
  .object({
    phoneNumber: phoneNumberField,
    otp: z.string().trim().regex(/^\d{4,8}$/, "OTP must be 4-8 digits"),
  })
  .strict();

// ============================================================================
// IMAGE DELETE
// ============================================================================
const DELETABLE_IMAGE_FIELDS = [
  "businessLogo",
  "nationalIdImage",
  "commercialRecordImage",
  "profileFile",
  "cv",
  "portfolioImages",
  "pricePackages",
  "avatar",
];

const deleteImageSchema = z
  .object({
    field: z.enum(DELETABLE_IMAGE_FIELDS),
    key: z.string().trim().min(1, "key is required").optional(),
  })
  .strict()
  .refine(
    (d) => {
      const requiresKey = ["portfolioImages", "pricePackages"].includes(d.field);
      return requiresKey ? !!d.key : true;
    },
    { path: ["key"], message: "key is required for array image fields" }
  );

module.exports = {
  updatePasswordSchema,
  updateProfileSchema,
  profileSectionParamSchema,
  getSectionSchema,
  SECTION_SCHEMAS,
  vendorDataUpdateSchema,
  hostDataUpdateSchema,
  documentsUpdateSchema,
  updateNotificationPreferencesSchema,
  sendPhoneOtpSchema,
  updatePhoneSchema,
  deleteImageSchema,
  VENDOR_CATEGORY_KEYS,
  DELETABLE_IMAGE_FIELDS,
};
