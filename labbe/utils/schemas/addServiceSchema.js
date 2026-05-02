/**
 * Add Service Schema
 * Defines validation, fields, and metadata for the add service form
 */

export const SERVICE_TYPES = [
  {
    value: "eventPlanning",
    labelKey: "addServicePopup.serviceTypes.eventPlanning",
    labelAr: "تخطيط الفعاليات",
  },
  {
    value: "mediaProduction",
    labelKey: "addServicePopup.serviceTypes.mediaProduction",
    labelAr: "الإنتاج الإعلامي",
  },
  {
    value: "giftsAndGiveaways",
    labelKey: "addServicePopup.serviceTypes.giftsAndGiveaways",
    labelAr: "الهدايا والتوزيعات",
  },
  {
    value: "foodAndBeverages",
    labelKey: "addServicePopup.serviceTypes.foodAndBeverages",
    labelAr: "الأطعمة والمشروبات",
  },
  {
    value: "beautyAndFashion",
    labelKey: "addServicePopup.serviceTypes.beautyAndFashion",
    labelAr: "التجميل والأزياء",
  },
  {
    value: "logisticsAndDelivery",
    labelKey: "addServicePopup.serviceTypes.logisticsAndDelivery",
    labelAr: "اللوجستيات والتوصيل",
  },
  {
    value: "corporateServices",
    labelKey: "addServicePopup.serviceTypes.corporateServices",
    labelAr: "خدمات الشركات",
  },
  {
    value: "supportServices",
    labelKey: "addServicePopup.serviceTypes.supportServices",
    labelAr: "خدمات الدعم",
  },
  {
    value: "technicalServices",
    labelKey: "addServicePopup.serviceTypes.technicalServices",
    labelAr: "الخدمات التقنية",
  },
  {
    value: "soundLightingEntertainment",
    labelKey: "addServicePopup.serviceTypes.soundLightingEntertainment",
    labelAr: "الصوت والإضاءة والترفيه",
  },
  {
    value: "hallsAndVenues",
    labelKey: "addServicePopup.serviceTypes.hallsAndVenues",
    labelAr: "القاعات والأماكن",
  },
];

export const PREDEFINED_TAGS = [
  {
    value: "weddings",
    labelKey: "addServicePopup.tags.weddings",
    labelAr: "افراح",
  },
  {
    value: "graduation",
    labelKey: "addServicePopup.tags.graduation",
    labelAr: "تخرج",
  },
  {
    value: "birthdays",
    labelKey: "addServicePopup.tags.birthdays",
    labelAr: "أعياد ميلاد",
  },
  {
    value: "corporate",
    labelKey: "addServicePopup.tags.corporate",
    labelAr: "فعاليات شركات",
  },
  {
    value: "engagement",
    labelKey: "addServicePopup.tags.engagement",
    labelAr: "خطوبة",
  },
  {
    value: "baby_shower",
    labelKey: "addServicePopup.tags.babyShower",
    labelAr: "استقبال مولود",
  },
];

export const addServiceSchema = {
  fields: [
    {
      name: "image",
      type: "file",
      labelKey: "addServicePopup.imageUpload.label",
      labelAr: "صورة الخدمة",
      required: false,
      accept: "image/*",
      multiple: false,
    },
    {
      name: "serviceName",
      type: "text",
      labelKey: "addServicePopup.serviceName.label",
      labelAr: "اسم الخدمة",
      placeholderKey: "addServicePopup.serviceName.placeholder",
      placeholderAr: "ادخل اسم الخدمة",
      required: true,
      validation: {
        minLength: 2,
        maxLength: 100,
      },
    },
    {
      name: "serviceType",
      type: "select",
      labelKey: "addServicePopup.serviceType.label",
      labelAr: "نوع الخدمة",
      placeholderKey: "addServicePopup.serviceType.placeholder",
      placeholderAr: "اختر نوع الخدمة",
      required: true,
      options: SERVICE_TYPES,
    },
    {
      name: "description",
      type: "textarea",
      labelKey: "addServicePopup.description.label",
      labelAr: "وصف الخدمة",
      placeholderKey: "addServicePopup.description.placeholder",
      placeholderAr: "ادخل وصف الخدمة",
      required: true,
      validation: {
        minLength: 10,
        maxLength: 1000,
      },
    },
    {
      name: "price",
      type: "number",
      labelKey: "addServicePopup.price.label",
      labelAr: "سعر الخدمة",
      placeholderKey: "addServicePopup.price.placeholder",
      placeholderAr: "ادخل سعر الخدمة",
      required: true,
      validation: {
        min: 0,
      },
    },
    {
      name: "tags",
      type: "tags",
      labelKey: "addServicePopup.category.label",
      labelAr: "اختر التصنيف",
      placeholderKey: "addServicePopup.category.placeholder",
      placeholderAr: "التصنيفات المحددة",
      required: false,
      predefinedTags: PREDEFINED_TAGS,
    },
  ],
  defaultValues: {
    serviceName: "",
    serviceType: "",
    description: "",
    price: "",
    tags: [],
    image: [],
  },
};

/**
 * Validation function for add service form
 * @param {Object} data - Form data to validate
 * @returns {Object} - { isValid: boolean, errors: Object }
 */
export const validateAddService = (data) => {
  const errors = {};

  // Service Name
  if (!data.serviceName || data.serviceName.trim() === "") {
    errors.serviceName = "اسم الخدمة مطلوب";
  } else if (data.serviceName.length < 2) {
    errors.serviceName = "اسم الخدمة يجب أن يكون أكثر من حرفين";
  } else if (data.serviceName.length > 100) {
    errors.serviceName = "اسم الخدمة يجب أن يكون أقل من 100 حرف";
  }

  // Service Type
  if (!data.serviceType) {
    errors.serviceType = "نوع الخدمة مطلوب";
  }

  // Description (required)
  if (!data.description || data.description.trim() === "") {
    errors.description = "وصف الخدمة مطلوب";
  } else if (data.description.length < 10) {
    errors.description = "وصف الخدمة يجب أن يكون أكثر من 10 أحرف";
  } else if (data.description.length > 1000) {
    errors.description = "وصف الخدمة يجب أن يكون أقل من 1000 حرف";
  }

  // Price
  if (!data.price && data.price !== 0) {
    errors.price = "سعر الخدمة مطلوب";
  } else if (isNaN(data.price) || Number(data.price) < 0) {
    errors.price = "يرجى إدخال سعر صحيح";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export default addServiceSchema;
