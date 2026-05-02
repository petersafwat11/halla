/**
 * Vendor Settings Schema
 * Defines all form sections, fields, validation, and metadata for vendor settings
 * Based on UserModel.vendorData schema from backend
 */

// Field types enum
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

/**
 * Personal Info Section Schema
 * Maps to: name, email, avatar, password fields in UserModel
 */
export const personalInfoSchema = {
  sectionKey: "personalInfo",
  titleKey: "personalInfo.title",
  titleAr: "المعلومات الشخصية",
  fields: [
    {
      name: "avatar",
      key: "avatar",
      type: FIELD_TYPES.FILE,
      labelKey: "personalInfo.storeLogo",
      labelAr: "شعار المتجر",
      required: false,
      accept: "image/*",
      multiple: false,
    },
    {
      name: "name",
      key: "name",
      type: FIELD_TYPES.TEXT,
      labelKey: "personalInfo.fullName",
      labelAr: "الاسم الكامل",
      placeholderKey: "personalInfo.fullNamePlaceholder",
      placeholderAr: "أدخل اسمك الكامل",
      required: true,
      validation: {
        minLength: 2,
        maxLength: 100,
      },
    },
    {
      name: "email",
      key: "email",
      type: FIELD_TYPES.EMAIL,
      labelKey: "personalInfo.email",
      labelAr: "البريد الإلكتروني",
      placeholderKey: "personalInfo.emailPlaceholder",
      placeholderAr: "أدخل بريدك الإلكتروني",
      required: true,
      validation: {
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      },
    },
    {
      name: "newPassword",
      key: "newPassword",
      type: FIELD_TYPES.PASSWORD,
      labelKey: "personalInfo.newPassword",
      labelAr: "كلمة المرور الجديدة",
      placeholderKey: "personalInfo.newPasswordPlaceholder",
      placeholderAr: "••••••••",
      required: false,
      validation: {
        minLength: 8,
      },
    },
    {
      name: "confirmPassword",
      key: "confirmPassword",
      type: FIELD_TYPES.PASSWORD,
      labelKey: "personalInfo.confirmPassword",
      labelAr: "تأكيد كلمة المرور",
      placeholderKey: "personalInfo.confirmPasswordPlaceholder",
      placeholderAr: "••••••••",
      required: false,
      validation: {
        matchField: "newPassword",
      },
    },
  ],
};

/**
 * Basic Account Info Section Schema
 * Maps to: profile.vendorData (ownerFullName, brandName) + phoneNumber, email
 */
export const basicAccountInfoSchema = {
  sectionKey: "basicAccountInfo",
  titleKey: "basicAccountInfo.title",
  titleAr: "معلومات الحساب الأساسية",
  fields: [
    {
      name: "ownerFullName",
      key: "profile.vendorData.ownerFullName",
      type: FIELD_TYPES.TEXT,
      labelKey: "basicAccountInfo.ownerFullName",
      labelAr: "الاسم الكامل للمالك",
      placeholderKey: "basicAccountInfo.ownerFullNamePlaceholder",
      placeholderAr: "أدخل اسم المالك",
      required: true,
      validation: {
        minLength: 2,
        maxLength: 100,
      },
    },
    {
      name: "brandName",
      key: "profile.vendorData.brandName",
      type: FIELD_TYPES.TEXT,
      labelKey: "basicAccountInfo.businessName",
      labelAr: "اسم النشاط التجاري",
      placeholderKey: "basicAccountInfo.businessNamePlaceholder",
      placeholderAr: "أدخل اسم النشاط التجاري",
      required: true,
      validation: {
        minLength: 2,
        maxLength: 100,
      },
    },
    {
      name: "email",
      key: "email",
      type: FIELD_TYPES.EMAIL,
      labelKey: "basicAccountInfo.email",
      labelAr: "البريد الإلكتروني",
      placeholderKey: "basicAccountInfo.emailPlaceholder",
      placeholderAr: "أدخل بريدك الإلكتروني",
      required: true,
      validation: {
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      },
    },
    {
      name: "phoneNumber",
      key: "phoneNumber",
      type: FIELD_TYPES.TEL,
      labelKey: "basicAccountInfo.phoneWhatsapp",
      labelAr: "رقم الهاتف / واتساب",
      placeholderKey: "basicAccountInfo.phonePlaceholder",
      placeholderAr: "+966 5XX XXX XXXX",
      required: true,
      validation: {
        pattern: /^[\+]?[0-9]{7,15}$/,
      },
    },
  ],
};

/**
 * Service Details Section Schema
 * Maps to: profile.vendorData (serviceDescription, nationalId, commercialRecordNumber, serviceLocation)
 */
export const serviceDetailsSchema = {
  sectionKey: "serviceDetails",
  titleKey: "serviceDetails.title",
  titleAr: "تفاصيل الخدمة",
  fields: [
    {
      name: "nationalIdImage",
      key: "profile.vendorData.nationalIdImage",
      type: FIELD_TYPES.FILE,
      labelKey: "serviceDetails.otherLicenses",
      labelAr: "التراخيص الأخرى",
      required: false,
      accept: "image/*",
      multiple: false,
    },
    {
      name: "commercialRecordImage",
      key: "profile.vendorData.commercialRecordImage",
      type: FIELD_TYPES.FILE,
      labelKey: "serviceDetails.commercialRegister",
      labelAr: "السجل التجاري",
      required: false,
      accept: "image/*",
      multiple: false,
    },
    {
      name: "nationalId",
      key: "profile.vendorData.nationalId",
      type: FIELD_TYPES.TEXT,
      labelKey: "serviceDetails.nationalIdLabel",
      labelAr: "رقم الهوية",
      placeholderKey: "serviceDetails.nationalIdPlaceholder",
      placeholderAr: "أدخل رقم الهوية",
      required: false,
      validation: {
        pattern: /^[0-9]{10}$/,
      },
    },
    {
      name: "serviceDescription",
      key: "profile.vendorData.serviceDescription",
      type: FIELD_TYPES.TEXTAREA,
      labelKey: "serviceDetails.serviceDescription",
      labelAr: "وصف الخدمة",
      placeholderKey: "serviceDetails.serviceDescriptionPlaceholder",
      placeholderAr: "أدخل وصف الخدمة",
      required: false,
      validation: {
        maxLength: 1000,
      },
    },
  ],
  // Location fields are handled separately due to their dynamic nature
  locationFields: {
    region: {
      name: "regionId",
      key: "profile.vendorData.serviceLocation.regionId",
      labelKey: "serviceDetails.region",
      labelAr: "المنطقة",
    },
    city: {
      name: "cityId",
      key: "profile.vendorData.serviceLocation.cityId",
      labelKey: "serviceDetails.city",
      labelAr: "المدينة",
    },
    districts: {
      name: "districtIds",
      key: "profile.vendorData.serviceLocation.districtIds",
      labelKey: "serviceDetails.districts",
      labelAr: "الأحياء",
    },
  },
};

/**
 * Social Links Section Schema
 * Maps to: profile.vendorData.socialLinks
 */
export const socialLinksSchema = {
  sectionKey: "additionalLinks",
  titleKey: "additionalLinks.title",
  titleAr: "روابط إضافية",
  fields: [
    {
      name: "website",
      key: "profile.vendorData.socialLinks.website",
      type: FIELD_TYPES.URL,
      labelKey: "additionalLinks.websiteLink",
      labelAr: "رابط الموقع",
      placeholderKey: "additionalLinks.websitePlaceholder",
      placeholderAr: "https://example.com",
      required: false,
      icon: "globe",
      iconColor: "#6366f1",
    },
    {
      name: "instagram",
      key: "profile.vendorData.socialLinks.instagram",
      type: FIELD_TYPES.URL,
      labelKey: "additionalLinks.instagramLink",
      labelAr: "انستجرام",
      placeholderKey: "additionalLinks.instagramPlaceholder",
      placeholderAr: "https://instagram.com/...",
      required: false,
      icon: "instagram",
      iconColor: "#E4405F",
    },
    {
      name: "facebook",
      key: "profile.vendorData.socialLinks.facebook",
      type: FIELD_TYPES.URL,
      labelKey: "additionalLinks.facebookLink",
      labelAr: "فيسبوك",
      placeholderKey: "additionalLinks.facebookPlaceholder",
      placeholderAr: "https://facebook.com/...",
      required: false,
      icon: "facebook",
      iconColor: "#1877F2",
    },
    {
      name: "twitter",
      key: "profile.vendorData.socialLinks.twitter",
      type: FIELD_TYPES.URL,
      labelKey: "additionalLinks.twitterLink",
      labelAr: "تويتر",
      placeholderKey: "additionalLinks.twitterPlaceholder",
      placeholderAr: "https://twitter.com/...",
      required: false,
      icon: "twitter",
      iconColor: "#000000",
    },
    {
      name: "tiktok",
      key: "profile.vendorData.socialLinks.tiktok",
      type: FIELD_TYPES.URL,
      labelKey: "additionalLinks.tiktokLink",
      labelAr: "تيك توك",
      placeholderKey: "additionalLinks.tiktokPlaceholder",
      placeholderAr: "https://tiktok.com/...",
      required: false,
      icon: "tiktok",
      iconColor: "#000000",
    },
  ],
};

/**
 * Images and Pricing Section Schema
 * Maps to: profile.vendorData (portfolioImages, pricePackages)
 */
export const imagesAndPricingSchema = {
  sectionKey: "imagesAndPricing",
  titleKey: "imagesAndPricing.title",
  titleAr: "الصور والأسعار",
  fields: [
    {
      name: "portfolioImages",
      key: "profile.vendorData.portfolioImages",
      type: FIELD_TYPES.FILE,
      labelKey: "imagesAndPricing.previousWorkImages",
      labelAr: "صور الأعمال السابقة",
      required: false,
      accept: "image/*",
      multiple: true,
    },
    {
      name: "pricePackages",
      key: "profile.vendorData.pricePackages",
      type: FIELD_TYPES.FILE,
      labelKey: "imagesAndPricing.priceListsAndPackages",
      labelAr: "قوائم الأسعار والباقات",
      required: false,
      accept: "image/*",
      multiple: true,
    },
  ],
};

/**
 * All vendor settings schemas combined
 */
export const vendorSettingsSchemas = {
  personalInfo: personalInfoSchema,
  basicAccountInfo: basicAccountInfoSchema,
  serviceDetails: serviceDetailsSchema,
  socialLinks: socialLinksSchema,
  imagesAndPricing: imagesAndPricingSchema,
};

/**
 * Get value from nested object using dot notation key
 * @param {Object} obj - Source object
 * @param {string} key - Dot notation key (e.g., "profile.vendorData.brandName")
 * @returns {any} - Value at the key path
 */
export const getNestedValue = (obj, key) => {
  if (!obj || !key) return undefined;
  return key.split(".").reduce((acc, part) => acc?.[part], obj);
};

/**
 * Set value in nested object using dot notation key
 * @param {Object} obj - Target object
 * @param {string} key - Dot notation key
 * @param {any} value - Value to set
 * @returns {Object} - Updated object
 */
export const setNestedValue = (obj, key, value) => {
  const keys = key.split(".");
  const result = { ...obj };
  let current = result;

  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    current[k] = current[k] ? { ...current[k] } : {};
    current = current[k];
  }

  current[keys[keys.length - 1]] = value;
  return result;
};

/**
 * Extract form data from user object based on schema
 * @param {Object} userData - User data from API
 * @param {Object} schema - Schema definition
 * @returns {Object} - Form data object
 */
export const extractFormData = (userData, schema) => {
  const formData = {};
  schema.fields.forEach((field) => {
    const value = getNestedValue(userData, field.key);
    formData[field.name] = value ?? "";
  });
  return formData;
};

/**
 * Validate a single field
 * @param {any} value - Field value
 * @param {Object} field - Field schema
 * @param {Object} formData - Full form data (for cross-field validation)
 * @returns {string|null} - Error message or null
 */
export const validateField = (value, field, formData = {}) => {
  // Required check
  if (
    field.required &&
    (!value || (typeof value === "string" && !value.trim()))
  ) {
    return `${field.labelAr} مطلوب`;
  }

  // Skip further validation if empty and not required
  if (!value || (typeof value === "string" && !value.trim())) {
    return null;
  }

  const validation = field.validation || {};

  // Min length
  if (validation.minLength && value.length < validation.minLength) {
    return `${field.labelAr} يجب أن يكون ${validation.minLength} أحرف على الأقل`;
  }

  // Max length
  if (validation.maxLength && value.length > validation.maxLength) {
    return `${field.labelAr} يجب أن يكون أقل من ${validation.maxLength} حرف`;
  }

  // Pattern
  if (validation.pattern && !validation.pattern.test(value)) {
    return `${field.labelAr} غير صالح`;
  }

  // Match field (for password confirmation)
  if (validation.matchField && value !== formData[validation.matchField]) {
    return "كلمة المرور غير متطابقة";
  }

  // Min value (for numbers)
  if (validation.min !== undefined && Number(value) < validation.min) {
    return `${field.labelAr} يجب أن يكون أكبر من ${validation.min}`;
  }

  return null;
};

/**
 * Validate entire form based on schema
 * @param {Object} formData - Form data
 * @param {Object} schema - Schema definition
 * @returns {Object} - { isValid: boolean, errors: Object }
 */
export const validateForm = (formData, schema) => {
  const errors = {};

  schema.fields.forEach((field) => {
    const error = validateField(formData[field.name], field, formData);
    if (error) {
      errors[field.name] = error;
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export default vendorSettingsSchemas;
