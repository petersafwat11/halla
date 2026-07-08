import { z } from "zod";

const idT = (k) => k;

export const SERVICE_TYPES = [
  { value: "eventPlanning", label: "تخطيط الفعاليات" },
  { value: "mediaProduction", label: "الإنتاج الإعلامي" },
  { value: "giftsAndGiveaways", label: "الهدايا والتوزيعات" },
  { value: "foodAndBeverages", label: "الأطعمة والمشروبات" },
  { value: "beautyAndFashion", label: "التجميل والأزياء" },
  { value: "logisticsAndDelivery", label: "اللوجستيات والتوصيل" },
  { value: "corporateServices", label: "خدمات الشركات" },
  { value: "supportServices", label: "خدمات الدعم" },
  { value: "technicalServices", label: "الخدمات التقنية" },
  { value: "soundLightingEntertainment", label: "الصوت والإضاءة والترفيه" },
  { value: "hallsAndVenues", label: "القاعات والأماكن" },
];

export const PREDEFINED_TAGS = [
  { value: "weddings", label: "افراح" },
  { value: "graduation", label: "تخرج" },
  { value: "birthdays", label: "أعياد ميلاد" },
  { value: "corporate", label: "فعاليات شركات" },
  { value: "engagement", label: "خطوبة" },
  { value: "baby_shower", label: "استقبال مولود" },
];

export const addServiceSchema = (t = idT) =>
  z.object({
    serviceName: z
      .string()
      .min(2, t("services.validation.nameMinLength")),
    serviceNameAr: z.string().trim().max(200).optional().or(z.literal("")),
    serviceType: z
      .string()
      .min(1, t("services.validation.typeRequired")),
    description: z
      .string()
      .min(10, t("services.validation.descriptionMinLength")),
    descriptionAr: z.string().trim().max(2000).optional().or(z.literal("")),
    price: z
      .string()
      .min(1, t("services.validation.priceRequired")),
    serviceImage: z.any().optional(),
  });
