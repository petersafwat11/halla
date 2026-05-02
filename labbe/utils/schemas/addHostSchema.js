import { z } from "zod";

const phoneRegex = /^[0-9]{7,15}$/;

export const addHostSchema = z.object({
  username: z
    .string()
    .min(1, "اسم المستخدم مطلوب")
    .min(2, "اسم المستخدم يجب أن يكون على الأقل 2 أحرف")
    .max(100, "اسم المستخدم يجب أن يكون أقل من 100 حرف")
    .optional(),

  email: z
    .string()
    .email("يرجى إدخال بريد إلكتروني صحيح")
    .optional()
    .or(z.literal("")),

  phoneNumber: z
    .string()
    .min(1, "رقم الهاتف مطلوب")
    .regex(phoneRegex, "رقم الهاتف يجب أن يكون بين 7 و 15 رقم"),
});
