import { z } from "zod";

/**
 * Schema for editing plan pricing and limits
 */
export const editPlanSchema = z.object({
  nameAr: z
    .string()
    .min(2, "الاسم العربي مطلوب")
    .max(100, "الاسم لا يمكن أن يتجاوز 100 حرف"),
  nameEn: z
    .string()
    .min(2, "English name is required")
    .max(100, "Name cannot exceed 100 characters"),
  planType: z.enum([
    'basic_event',
    'basic_monthly',
    'premium_event',
    'premium_monthly',
    'business_event',
    'business_quarterly',
    'business_annual',
  ]).optional(),
  pricing: z.object({ oneTime: z.number().min(0) }).optional(),
  limits: z.object({
    maxEvents: z.number().min(-1),
    maxInvitesPerEvent: z.number().min(0).nullable().optional(),
    invitePool: z.number().min(0).nullable().optional(),
    durationDays: z.number().min(1).optional(),
  }).optional(),
  isActive: z.boolean(),
});

/**
 * Plan types for display
 */
export const PLAN_TYPES = {
  direct: {
    labelAr: "هلا مباشر",
    labelEn: "Halaa Direct",
  },
  managed: {
    labelAr: "هلا علينا",
    labelEn: "Halaa Managed",
  },
  business_client: {
    labelAr: "هلا أعمال — بالعميل",
    labelEn: "Halaa Business — By Client",
  },
  business_team: {
    labelAr: "هلا أعمال — بفريق هلا",
    labelEn: "Halaa Business — By Halaa Team",
  },
  trial: {
    labelAr: "الباقات التجريبية",
    labelEn: "Trial Plans",
  },
  unlimited: {
    labelAr: "غير محدود",
    labelEn: "Unlimited",
  },
};
