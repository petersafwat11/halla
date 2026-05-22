/**
 * Vendor Settings Schema (Zod-backed)
 *
 * Each section exports:
 *   - field metadata (consumed by DynamicForm to render inputs)
 *   - a `zodSchema` (consumed by validateField / validateForm)
 *
 * Field metadata mirrors the legacy shape so DynamicForm requires no change.
 * Validation rules live in the Zod schema — DO NOT duplicate them in metadata.
 */

import { z } from "zod";

export const FIELD_TYPES = {
  TEXT: "text",
  EMAIL: "email",
  PASSWORD: "password",
  TEL: "tel",
  NUMBER: "number",
  TEXTAREA: "textarea",
  SELECT: "select",
  FILE: "file",
  URL: "url",
};

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------
const emailField = z
  .string({ required_error: "البريد الإلكتروني مطلوب" })
  .trim()
  .min(1, "البريد الإلكتروني مطلوب")
  .email("البريد الإلكتروني غير صالح");

const optionalUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((v) => v === "" || /^https?:\/\/.+/i.test(v), {
    message: "الرابط غير صالح",
  });

const phoneField = z
  .string({ required_error: "رقم الهاتف مطلوب" })
  .trim()
  .regex(/^[+]?[0-9]{7,15}$/, "رقم الهاتف غير صالح");

// ---------------------------------------------------------------------------
// 1) Personal Info — top-level (name, email, avatar/businessLogo, password)
// ---------------------------------------------------------------------------
export const personalInfoSchema = {
  sectionKey: "personalInfo",
  titleKey: "personalInfo.title",
  titleAr: "المعلومات الشخصية",
  zodSchema: z
    .object({
      avatar: z.any().optional(),
      name: z
        .string({ required_error: "الاسم مطلوب" })
        .trim()
        .min(2, "الاسم يجب أن يكون حرفين على الأقل")
        .max(100, "الاسم يجب أن يكون أقل من 100 حرف"),
      email: emailField,
      currentPassword: z.string().optional(),
      newPassword: z
        .string()
        .optional()
        .refine((v) => !v || v.length >= 8, {
          message: "كلمة المرور يجب أن تكون 8 أحرف على الأقل",
        }),
      confirmPassword: z.string().optional(),
    })
    .superRefine((d, ctx) => {
      if (d.newPassword) {
        if (!d.currentPassword) {
          ctx.addIssue({
            path: ["currentPassword"],
            code: "custom",
            message: "كلمة المرور الحالية مطلوبة لتغيير كلمة المرور",
          });
        }
        if (d.newPassword !== d.confirmPassword) {
          ctx.addIssue({
            path: ["confirmPassword"],
            code: "custom",
            message: "كلمة المرور غير متطابقة",
          });
        }
      }
    }),
  fields: [
    { name: "avatar", type: FIELD_TYPES.FILE, labelKey: "personalInfo.storeLogo", labelAr: "شعار المتجر", required: false, accept: "image/*", multiple: false },
    { name: "name", type: FIELD_TYPES.TEXT, labelKey: "personalInfo.fullName", labelAr: "الاسم الكامل", placeholderKey: "personalInfo.fullNamePlaceholder", placeholderAr: "أدخل اسمك الكامل", required: true },
    { name: "email", type: FIELD_TYPES.EMAIL, labelKey: "personalInfo.email", labelAr: "البريد الإلكتروني", placeholderKey: "personalInfo.emailPlaceholder", placeholderAr: "أدخل بريدك الإلكتروني", required: true },
    { name: "currentPassword", type: FIELD_TYPES.PASSWORD, labelKey: "personalInfo.currentPassword", labelAr: "كلمة المرور الحالية", placeholderKey: "personalInfo.currentPasswordPlaceholder", placeholderAr: "••••••••", required: false },
    { name: "newPassword", type: FIELD_TYPES.PASSWORD, labelKey: "personalInfo.newPassword", labelAr: "كلمة المرور الجديدة", placeholderKey: "personalInfo.newPasswordPlaceholder", placeholderAr: "••••••••", required: false },
    { name: "confirmPassword", type: FIELD_TYPES.PASSWORD, labelKey: "personalInfo.confirmPassword", labelAr: "تأكيد كلمة المرور", placeholderKey: "personalInfo.confirmPasswordPlaceholder", placeholderAr: "••••••••", required: false },
  ],
};

// ---------------------------------------------------------------------------
// 2) Basic Account Info — vendor identity + email/phone (phone change is
//    OTP-gated; the schema validates the format but the actual write goes
//    through PATCH /users/profile/phone)
// ---------------------------------------------------------------------------
export const basicAccountInfoSchema = {
  sectionKey: "basicAccountInfo",
  titleKey: "basicAccountInfo.title",
  titleAr: "معلومات الحساب الأساسية",
  zodSchema: z.object({
    ownerFullName: z
      .string({ required_error: "اسم المالك مطلوب" })
      .trim()
      .min(2, "اسم المالك يجب أن يكون حرفين على الأقل")
      .max(100),
    brandName: z
      .string({ required_error: "اسم النشاط التجاري مطلوب" })
      .trim()
      .min(2, "اسم النشاط التجاري يجب أن يكون حرفين على الأقل")
      .max(100),
    email: emailField,
    phoneNumber: phoneField,
  }),
  fields: [
    { name: "ownerFullName", type: FIELD_TYPES.TEXT, labelKey: "basicAccountInfo.ownerFullName", labelAr: "الاسم الكامل للمالك", placeholderKey: "basicAccountInfo.ownerFullNamePlaceholder", placeholderAr: "أدخل اسم المالك", required: true },
    { name: "brandName", type: FIELD_TYPES.TEXT, labelKey: "basicAccountInfo.businessName", labelAr: "اسم النشاط التجاري", placeholderKey: "basicAccountInfo.businessNamePlaceholder", placeholderAr: "أدخل اسم النشاط التجاري", required: true },
    { name: "email", type: FIELD_TYPES.EMAIL, labelKey: "basicAccountInfo.email", labelAr: "البريد الإلكتروني", placeholderKey: "basicAccountInfo.emailPlaceholder", placeholderAr: "أدخل بريدك الإلكتروني", required: true },
    { name: "phoneNumber", type: FIELD_TYPES.TEL, labelKey: "basicAccountInfo.phoneWhatsapp", labelAr: "رقم الهاتف / واتساب", placeholderKey: "basicAccountInfo.phonePlaceholder", placeholderAr: "+966 5XX XXX XXXX", required: true },
  ],
};

// ---------------------------------------------------------------------------
// 3) Service Details
// ---------------------------------------------------------------------------
export const serviceDetailsSchema = {
  sectionKey: "serviceDetails",
  titleKey: "serviceDetails.title",
  titleAr: "تفاصيل الخدمة",
  zodSchema: z.object({
    nationalIdImage: z.any().optional(),
    commercialRecordImage: z.any().optional(),
    nationalId: z
      .string()
      .trim()
      .optional()
      .refine((v) => !v || /^[0-9]{10}$/.test(v), {
        message: "رقم الهوية يجب أن يكون 10 أرقام",
      }),
    serviceDescription: z
      .string()
      .trim()
      .max(1000, "وصف الخدمة يجب أن يكون أقل من 1000 حرف")
      .optional(),
  }),
  fields: [
    { name: "nationalIdImage", type: FIELD_TYPES.FILE, labelKey: "serviceDetails.otherLicenses", labelAr: "التراخيص الأخرى", required: false, accept: "image/*,application/pdf", multiple: false },
    { name: "commercialRecordImage", type: FIELD_TYPES.FILE, labelKey: "serviceDetails.commercialRegister", labelAr: "السجل التجاري", required: false, accept: "image/*,application/pdf", multiple: false },
    { name: "nationalId", type: FIELD_TYPES.TEXT, labelKey: "serviceDetails.nationalIdLabel", labelAr: "رقم الهوية", placeholderKey: "serviceDetails.nationalIdPlaceholder", placeholderAr: "أدخل رقم الهوية", required: false },
    { name: "serviceDescription", type: FIELD_TYPES.TEXTAREA, labelKey: "serviceDetails.serviceDescription", labelAr: "وصف الخدمة", placeholderKey: "serviceDetails.serviceDescriptionPlaceholder", placeholderAr: "أدخل وصف الخدمة", required: false },
  ],
  locationFields: {
    region: { name: "regionId", labelKey: "serviceDetails.region", labelAr: "المنطقة" },
    city: { name: "cityId", labelKey: "serviceDetails.city", labelAr: "المدينة" },
    districts: { name: "districtIds", labelKey: "serviceDetails.districts", labelAr: "الأحياء" },
  },
};

// ---------------------------------------------------------------------------
// 4) Social / Additional Links
// ---------------------------------------------------------------------------
export const socialLinksSchema = {
  sectionKey: "additionalLinks",
  titleKey: "additionalLinks.title",
  titleAr: "روابط إضافية",
  zodSchema: z.object({
    website: optionalUrl.optional(),
    instagram: optionalUrl.optional(),
    facebook: optionalUrl.optional(),
    twitter: optionalUrl.optional(),
    tiktok: optionalUrl.optional(),
  }),
  fields: [
    { name: "website", type: FIELD_TYPES.URL, labelKey: "additionalLinks.websiteLink", labelAr: "رابط الموقع", placeholderKey: "additionalLinks.websitePlaceholder", placeholderAr: "https://example.com", required: false, icon: "globe", iconColor: "#6366f1" },
    { name: "instagram", type: FIELD_TYPES.URL, labelKey: "additionalLinks.instagramLink", labelAr: "انستجرام", placeholderKey: "additionalLinks.instagramPlaceholder", placeholderAr: "https://instagram.com/...", required: false, icon: "instagram", iconColor: "#E4405F" },
    { name: "facebook", type: FIELD_TYPES.URL, labelKey: "additionalLinks.facebookLink", labelAr: "فيسبوك", placeholderKey: "additionalLinks.facebookPlaceholder", placeholderAr: "https://facebook.com/...", required: false, icon: "facebook", iconColor: "#1877F2" },
    { name: "twitter", type: FIELD_TYPES.URL, labelKey: "additionalLinks.twitterLink", labelAr: "تويتر", placeholderKey: "additionalLinks.twitterPlaceholder", placeholderAr: "https://twitter.com/...", required: false, icon: "twitter", iconColor: "#000000" },
    { name: "tiktok", type: FIELD_TYPES.URL, labelKey: "additionalLinks.tiktokLink", labelAr: "تيك توك", placeholderKey: "additionalLinks.tiktokPlaceholder", placeholderAr: "https://tiktok.com/...", required: false, icon: "tiktok", iconColor: "#000000" },
  ],
};

// ---------------------------------------------------------------------------
// 5) Images & Pricing
// ---------------------------------------------------------------------------
export const imagesAndPricingSchema = {
  sectionKey: "imagesAndPricing",
  titleKey: "imagesAndPricing.title",
  titleAr: "الصور والأسعار",
  zodSchema: z.object({
    portfolioImages: z.any().optional(),
    pricePackages: z.any().optional(),
  }),
  fields: [
    { name: "portfolioImages", type: FIELD_TYPES.FILE, labelKey: "imagesAndPricing.previousWorkImages", labelAr: "صور الأعمال السابقة", required: false, accept: "image/*", multiple: true },
    { name: "pricePackages", type: FIELD_TYPES.FILE, labelKey: "imagesAndPricing.priceListsAndPackages", labelAr: "قوائم الأسعار والباقات", required: false, accept: "image/*", multiple: true },
  ],
};

export const vendorSettingsSchemas = {
  personalInfo: personalInfoSchema,
  basicAccountInfo: basicAccountInfoSchema,
  serviceDetails: serviceDetailsSchema,
  socialLinks: socialLinksSchema,
  imagesAndPricing: imagesAndPricingSchema,
};

// ---------------------------------------------------------------------------
// Validation helpers (Zod-backed)
// ---------------------------------------------------------------------------

/**
 * Validate a single field. Uses the section's zodSchema. Returns an error
 * string for that field or null. `formData` is required for cross-field
 * rules (e.g. confirmPassword).
 */
export const validateField = (value, field, formData = {}, schema = null) => {
  if (!schema?.zodSchema) {
    // Fallback: when called from DynamicForm we always pass a schema; this
    // path keeps it safe for any stray callers.
    return null;
  }
  const candidate = { ...formData, [field.name]: value };
  const result = schema.zodSchema.safeParse(candidate);
  if (result.success) return null;
  const issue = result.error.issues.find(
    (i) => i.path?.[0] === field.name
  );
  return issue ? issue.message : null;
};

/**
 * Validate an entire section. Returns `{ isValid, errors, data }` where
 * `data` is the Zod-parsed payload on success.
 */
export const validateForm = (formData, schema) => {
  if (!schema?.zodSchema) {
    return { isValid: true, errors: {}, data: formData };
  }
  const result = schema.zodSchema.safeParse(formData);
  if (result.success) {
    return { isValid: true, errors: {}, data: result.data };
  }
  const errors = {};
  for (const issue of result.error.issues) {
    const key = issue.path?.[0];
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return { isValid: false, errors, data: null };
};

export default vendorSettingsSchemas;
