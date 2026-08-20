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

export const normalizeArabicDigits = (str) =>
  typeof str === "string"
    ? str
        .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
        .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    : str;

export const addServiceSchema = (t = idT) =>
  z.object({
    serviceName: z
      .string()
      .trim()
      .min(2, t("services.validation.nameMinLength"))
      .max(200),
    serviceNameAr: z.string().trim().max(200).optional().or(z.literal("")),
    serviceType: z
      .string()
      .min(1, t("services.validation.typeRequired")),
    description: z
      .string()
      .trim()
      .min(10, t("services.validation.descriptionMinLength"))
      .max(2000),
    descriptionAr: z.string().trim().max(2000).optional().or(z.literal("")),
    price: z
      .string()
      .trim()
      .transform(normalizeArabicDigits)
      .refine((val) => val != null && val.length > 0, {
        message: t("services.validation.priceRequired"),
      })
      .refine((val) => /^\d+(\.\d{1,2})?$/.test(val), {
        message: t("services.validation.priceInvalid"),
      }),
    serviceImage: z.any().optional(),
  });
