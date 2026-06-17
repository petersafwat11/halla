/**
 * Add Service Schema
 * Zod validation schema + form metadata for the vendor add/edit service flow.
 * Factory function; pass `t` for translation, omit for opaque keys.
 * Structure mirrors halla-mobile/utils/schemas/vendorServiceSchema.js for parity.
 */

import { z } from "zod";

const idT = (k) => k;

export const SERVICE_TYPES = [
  { value: "eventPlanning", labelKey: "addServicePopup.serviceTypes.eventPlanning", labelAr: "تخطيط الفعاليات" },
  { value: "mediaProduction", labelKey: "addServicePopup.serviceTypes.mediaProduction", labelAr: "الإنتاج الإعلامي" },
  { value: "giftsAndGiveaways", labelKey: "addServicePopup.serviceTypes.giftsAndGiveaways", labelAr: "الهدايا والتوزيعات" },
  { value: "foodAndBeverages", labelKey: "addServicePopup.serviceTypes.foodAndBeverages", labelAr: "الأطعمة والمشروبات" },
  { value: "beautyAndFashion", labelKey: "addServicePopup.serviceTypes.beautyAndFashion", labelAr: "التجميل والأزياء" },
  { value: "logisticsAndDelivery", labelKey: "addServicePopup.serviceTypes.logisticsAndDelivery", labelAr: "اللوجستيات والتوصيل" },
  { value: "corporateServices", labelKey: "addServicePopup.serviceTypes.corporateServices", labelAr: "خدمات الشركات" },
  { value: "supportServices", labelKey: "addServicePopup.serviceTypes.supportServices", labelAr: "خدمات الدعم" },
  { value: "technicalServices", labelKey: "addServicePopup.serviceTypes.technicalServices", labelAr: "الخدمات التقنية" },
  { value: "soundLightingEntertainment", labelKey: "addServicePopup.serviceTypes.soundLightingEntertainment", labelAr: "الصوت والإضاءة والترفيه" },
  { value: "hallsAndVenues", labelKey: "addServicePopup.serviceTypes.hallsAndVenues", labelAr: "القاعات والأماكن" },
];

export const PREDEFINED_TAGS = [
  { value: "weddings", labelKey: "addServicePopup.tags.weddings", labelAr: "افراح" },
  { value: "graduation", labelKey: "addServicePopup.tags.graduation", labelAr: "تخرج" },
  { value: "birthdays", labelKey: "addServicePopup.tags.birthdays", labelAr: "أعياد ميلاد" },
  { value: "corporate", labelKey: "addServicePopup.tags.corporate", labelAr: "فعاليات شركات" },
  { value: "engagement", labelKey: "addServicePopup.tags.engagement", labelAr: "خطوبة" },
  { value: "baby_shower", labelKey: "addServicePopup.tags.babyShower", labelAr: "استقبال مولود" },
];

export const addServiceSchema = (t = idT) =>
  z.object({
    serviceName: z
      .string()
      .trim()
      .min(2, t("addServicePopup.validation.serviceNameMinLength"))
      .max(100, t("addServicePopup.validation.serviceNameMaxLength")),
    serviceType: z.string().min(1, t("addServicePopup.validation.serviceTypeRequired")),
    description: z
      .string()
      .trim()
      .min(10, t("addServicePopup.validation.descriptionMinLength"))
      .max(1000, t("addServicePopup.validation.descriptionMaxLength")),
    price: z
      .union([z.string(), z.number()])
      .refine((v) => v !== "" && v !== null && v !== undefined, {
        message: t("addServicePopup.validation.priceRequired"),
      })
      .refine((v) => !Number.isNaN(Number(v)) && Number(v) >= 0, {
        message: t("addServicePopup.validation.priceInvalid"),
      }),
    duration: z
      .string()
      .trim()
      .max(100, t("addServicePopup.validation.durationMaxLength"))
      .optional()
      .or(z.literal("")),
    image: z.any().optional(),
  });

export const addServiceDefaultValues = {
  serviceName: "",
  serviceType: "",
  description: "",
  price: "",
  duration: "",
  image: undefined,
};

export default addServiceSchema;
