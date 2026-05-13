import { z } from "zod";

const phoneRegex = /^[0-9]{7,15}$/;

// ============================================
// HOST SCHEMAS
// ============================================

export const addHostSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب").max(100),
  email: z.string().email("يرجى إدخال بريد إلكتروني صحيح"),
  phoneNumber: z.string().min(1, "رقم الهاتف مطلوب").regex(phoneRegex, "رقم الهاتف يجب أن يكون بين 7 و 15 رقم"),
  password: z.string().optional().or(z.literal("")),
});

export const hostSubscriptionSchema = z.object({
  planCode: z.string().min(1, "الرجاء اختيار خطة"),
  status: z.enum(["active", "expired", "cancelled"]),
});

export const subscriptionAssignmentSchema = hostSubscriptionSchema;

// ============================================
// MODERATOR SCHEMAS
// ============================================

export const addModeratorSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب").max(100),
  email: z.string().email("يرجى إدخال بريد إلكتروني صحيح"),
  phoneNumber: z.string().min(1, "رقم الهاتف مطلوب").regex(phoneRegex, "رقم الهاتف يجب أن يكون بين 7 و 15 رقم"),
  password: z.string().optional().or(z.literal("")),
  role: z.string().min(1, "الرجاء اختيار الدور"),
  // H-15: SUPER_ADMIN supplies a tenant scope for ADMIN/MODERATOR/WL_*
  // creations. The popup component validates "required when shown" at
  // submit time; here we just allow the field through.
  whitelabelId: z.string().optional().or(z.literal("")),
});

export const editModeratorSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب").max(100),
  email: z.string().email("يرجى إدخال بريد إلكتروني صحيح"),
  phoneNumber: z.string().min(1, "رقم الهاتف مطلوب").regex(phoneRegex, "رقم الهاتف يجب أن يكون بين 7 و 15 رقم"),
  role: z.string().min(1, "الرجاء اختيار الدور"),
});

// ============================================
// VENDOR SCHEMAS
// ============================================

export const vendorRatingSchema = z.object({
  rating: z.number().min(1, "الرجاء اختيار تقييم").max(5),
});

// ============================================
// WHITELABEL SCHEMAS
// ============================================

export const whitelabelSubscriptionSchema = z.object({
  planCode: z.string().min(1, "الرجاء اختيار خطة"),
  status: z.enum(["active", "expired", "cancelled"]),
});

// ============================================
// TICKET SCHEMAS
// ============================================

export const assignTicketSchema = z.object({
  assigneeId: z.string().min(1, "الرجاء اختيار مشرف"),
});

export const ticketResponseSchema = z.object({
  response: z.string().min(1, "الرجاء إدخال رد").max(5000),
});

// ============================================
// TEMPLATE CATEGORY SCHEMAS
// ============================================

export const categoryFormSchema = z.object({
  code: z.string().min(1, "الكود مطلوب"),
  nameEn: z.string().min(1, "الاسم بالإنجليزية مطلوب"),
  nameAr: z.string().min(1, "الاسم بالعربية مطلوب"),
  sortOrder: z.coerce.number().min(0).default(0),
});

// ============================================
// NOTIFICATION SCHEMAS
// ============================================

export const sendNotificationSchema = z.object({
  titleAr: z.string().min(1, "العنوان بالعربية مطلوب"),
  titleEn: z.string().optional().or(z.literal("")),
  messageAr: z.string().min(1, "الرسالة بالعربية مطلوبة"),
  messageEn: z.string().optional().or(z.literal("")),
});

// ============================================
// TAQNYAT TEMPLATE SCHEMAS
// ============================================

export const assignTaqnyatSchema = z.object({
  category: z.string().optional().or(z.literal("")),
  active: z.boolean().default(true),
  sortOrder: z.coerce.number().min(0).default(0),
  varMapping: z.array(
    z.object({
      placeholder: z.string(),
      sourceKey: z.string(),
      fallback: z.string().optional().or(z.literal("")),
    })
  ).default([]),
});

// Meta requires lowercase, snake_case, ≤512 chars, starting with a letter.
const taqnyatTemplateNameRegex = /^[a-z][a-z0-9_]{0,511}$/;

// ============================================
// DISCOUNT SCHEMAS
// ============================================

const discountCodePattern = /^[A-Za-z0-9_-]{3,30}$/;

export const discountSchema = z
  .object({
    code: z
      .string()
      .min(3, "الكود يجب أن يكون 3 أحرف على الأقل")
      .max(30, "الكود يجب أن لا يتجاوز 30 حرف")
      .regex(discountCodePattern, "الكود يجب أن يحتوي فقط على أحرف إنجليزية وأرقام و _ و -")
      .transform((v) => v.toUpperCase()),
    descriptionEn: z.string().optional().or(z.literal("")),
    descriptionAr: z.string().optional().or(z.literal("")),
    discountType: z.enum(["percentage", "fixed"]),
    value: z.coerce.number().min(0.01, "القيمة يجب أن تكون أكبر من 0"),
    maxUses: z.coerce.number().min(0, "الحد الأدنى 0").default(0),
    minimumAmount: z.coerce.number().min(0, "الحد الأدنى 0").default(0),
    validFrom: z.date().nullable().optional(),
    validUntil: z.date().nullable().optional(),
    isActive: z.boolean().default(true),
    applicablePlanTypes: z.array(z.string()).default([]),
  })
  .superRefine((data, ctx) => {
    if (data.discountType === "percentage" && data.value > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["value"],
        message: "النسبة لا تتجاوز 100%",
      });
    }
    if (
      data.validFrom &&
      data.validUntil &&
      data.validFrom >= data.validUntil
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["validUntil"],
        message: "تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء",
      });
    }
  });

export const createTaqnyatTemplateSchema = z
  .object({
    name: z
      .string()
      .min(1, "اسم القالب مطلوب")
      .regex(
        taqnyatTemplateNameRegex,
        "الاسم يجب أن يبدأ بحرف صغير ويحتوي فقط على أحرف إنجليزية صغيرة وأرقام و _"
      ),
    category: z.enum(["UTILITY", "MARKETING", "AUTHENTICATION"], {
      errorMap: () => ({ message: "الرجاء اختيار الفئة" }),
    }),
    language: z.enum(["ar", "en"]).default("ar"),
    headerText: z.string().max(60, "الحد الأقصى 60 حرفاً").optional().or(z.literal("")),
    bodyText: z.string().min(1, "نص الرسالة مطلوب").max(1024, "الحد الأقصى 1024 حرف"),
    footerText: z.string().max(60, "الحد الأقصى 60 حرفاً").optional().or(z.literal("")),
    // One example value per detected `{{N}}` placeholder. Length is
    // validated against the body in the popup component (resolver runs
    // before placeholder count is known here).
    bodyExamples: z.array(z.string().min(1, "مطلوب")).default([]),
  })
  .superRefine((data, ctx) => {
    const placeholders = (data.bodyText.match(/\{\{\d+\}\}/g) || []);
    const uniqueCount = new Set(placeholders).size;
    if (uniqueCount !== data.bodyExamples.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["bodyExamples"],
        message: `يجب توفير ${uniqueCount} مثال لكل متغير في النص`,
      });
    }
  });
