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
// NOTIFICATION SCHEMAS
// ============================================

export const sendNotificationSchema = z.object({
  titleAr: z.string().min(1, "العنوان بالعربية مطلوب"),
  titleEn: z.string().optional().or(z.literal("")),
  messageAr: z.string().min(1, "الرسالة بالعربية مطلوبة"),
  messageEn: z.string().optional().or(z.literal("")),
});
