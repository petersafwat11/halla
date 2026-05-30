/**
 * Vendor Settings — section schemas (UI metadata + shared Zod)
 *
 * The Zod validation rules now live in
 * `@halla/shared/schemas/vendor` (per Phase 1). This file keeps the
 * web-side `{ sectionKey, titleKey, zodSchema, fields, ... }` wrappers
 * that `DynamicForm` consumes for rendering, so consumers keep their
 * exact import shape.
 *
 * Field metadata (labels in Arabic, placeholder copy, input types) is
 * a web-side rendering concern and intentionally stays here, not in
 * the cross-platform shared package.
 */

import {
  personalInfoZodSchema,
  serviceDetailsZodSchema,
  socialLinksZodSchema,
  imagesAndPricingZodSchema,
} from "@halla/shared/schemas/vendor";

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
// 1) Personal Info (consolidated)
//
// Holds everything a vendor edits about their own account: identity
// (ownerFullName, brandName), contact (email, phone), the store logo, and an
// optional password change. The previous "Basic Account Info" section was
// removed and its fields folded in here so each key has exactly one writer.
// ---------------------------------------------------------------------------
export const personalInfoSchema = {
  sectionKey: "personalInfo",
  titleKey: "personalInfo.title",
  titleAr: "المعلومات الشخصية",
  zodSchema: personalInfoZodSchema,
  fields: [
    { name: "avatar", type: FIELD_TYPES.FILE, labelKey: "personalInfo.storeLogo", labelAr: "شعار المتجر", required: false, accept: "image/*", multiple: false },
    { name: "ownerFullName", type: FIELD_TYPES.TEXT, labelKey: "personalInfo.fullName", labelAr: "الاسم بالكامل", placeholderKey: "personalInfo.fullNamePlaceholder", placeholderAr: "أدخل اسمك الكامل", required: true },
    { name: "brandName", type: FIELD_TYPES.TEXT, labelKey: "personalInfo.businessName", labelAr: "اسم النشاط التجاري", placeholderKey: "personalInfo.businessNamePlaceholder", placeholderAr: "أدخل اسم النشاط التجاري", required: true },
    { name: "email", type: FIELD_TYPES.EMAIL, labelKey: "personalInfo.email", labelAr: "البريد الإلكتروني", placeholderKey: "personalInfo.emailPlaceholder", placeholderAr: "أدخل بريدك الإلكتروني", required: true },
    { name: "phoneNumber", type: FIELD_TYPES.TEL, labelKey: "personalInfo.phoneWhatsapp", labelAr: "رقم الهاتف / واتساب", placeholderKey: "personalInfo.phonePlaceholder", placeholderAr: "+966 5XX XXX XXXX", required: false },
    { name: "currentPassword", type: FIELD_TYPES.PASSWORD, labelKey: "personalInfo.currentPassword", labelAr: "كلمة المرور الحالية", placeholderKey: "personalInfo.currentPasswordPlaceholder", placeholderAr: "••••••••", required: false },
    { name: "newPassword", type: FIELD_TYPES.PASSWORD, labelKey: "personalInfo.newPassword", labelAr: "كلمة المرور الجديدة", placeholderKey: "personalInfo.newPasswordPlaceholder", placeholderAr: "••••••••", required: false },
    { name: "confirmPassword", type: FIELD_TYPES.PASSWORD, labelKey: "personalInfo.confirmPassword", labelAr: "تأكيد كلمة المرور", placeholderKey: "personalInfo.confirmPasswordPlaceholder", placeholderAr: "••••••••", required: false },
  ],
};

// ---------------------------------------------------------------------------
// 3) Service Details
// ---------------------------------------------------------------------------
export const serviceDetailsSchema = {
  sectionKey: "serviceDetails",
  titleKey: "serviceDetails.title",
  titleAr: "تفاصيل الخدمة",
  zodSchema: serviceDetailsZodSchema,
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
  zodSchema: socialLinksZodSchema,
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
  zodSchema: imagesAndPricingZodSchema,
  fields: [
    { name: "portfolioImages", type: FIELD_TYPES.FILE, labelKey: "imagesAndPricing.previousWorkImages", labelAr: "صور الأعمال السابقة", required: false, accept: "image/*", multiple: true },
    { name: "pricePackages", type: FIELD_TYPES.FILE, labelKey: "imagesAndPricing.priceListsAndPackages", labelAr: "قوائم الأسعار والباقات", required: false, accept: "image/*", multiple: true },
  ],
};

export const vendorSettingsSchemas = {
  personalInfo: personalInfoSchema,
  serviceDetails: serviceDetailsSchema,
  socialLinks: socialLinksSchema,
  imagesAndPricing: imagesAndPricingSchema,
};

// ---------------------------------------------------------------------------
// Validation helpers (Zod-backed) — kept here so DynamicForm consumers
// don't need to relink. They delegate to the shared schemas above.
// ---------------------------------------------------------------------------

export const validateField = (value, field, formData = {}, schema = null) => {
  if (!schema?.zodSchema) return null;
  const candidate = { ...formData, [field.name]: value };
  const result = schema.zodSchema.safeParse(candidate);
  if (result.success) return null;
  const issue = result.error.issues.find((i) => i.path?.[0] === field.name);
  return issue ? issue.message : null;
};

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
