import { z } from "zod";

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

export const addServiceSchema = z.object({
  serviceName: z.string().min(2, "اسم الخدمة يجب أن يكون أكثر من حرفين"),
  serviceType: z.string().min(1, "نوع الخدمة مطلوب"),
  description: z.string().min(10, "وصف الخدمة يجب أن يكون أكثر من 10 أحرف"),
  price: z.string().min(1, "سعر الخدمة مطلوب"),
  serviceImage: z.any().optional(),
});
