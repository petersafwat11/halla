import { z } from "zod";

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
