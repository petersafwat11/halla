import { z } from "zod";
import {
  SERVICE_LIMITS,
  SERVICE_TYPES,
  PREDEFINED_TAGS,
  normalizeArabicDigits,
  serviceLocationSchema,
  addServiceDefaultValues,
} from "@halaa/shared/schemas/vendor";

export {
  SERVICE_LIMITS,
  SERVICE_TYPES,
  PREDEFINED_TAGS,
  normalizeArabicDigits,
  serviceLocationSchema,
  addServiceDefaultValues,
};

const idT = (k) => k;

export const addServiceSchema = (t = idT) =>
  z.object({
    serviceName: z
      .string({ required_error: t("services.validation.nameRequired") })
      .trim()
      .min(SERVICE_LIMITS.NAME_MIN, t("services.validation.nameMinLength"))
      .max(SERVICE_LIMITS.NAME_MAX, t("services.validation.nameMaxLength")),
    serviceNameAr: z
      .string()
      .trim()
      .max(SERVICE_LIMITS.NAME_AR_MAX, t("services.validation.nameMaxLength"))
      .optional()
      .or(z.literal("")),
    serviceType: z
      .string({ required_error: t("services.validation.typeRequired") })
      .min(1, t("services.validation.typeRequired")),
    description: z
      .string({ required_error: t("services.validation.descriptionRequired") })
      .trim()
      .min(SERVICE_LIMITS.DESCRIPTION_MIN, t("services.validation.descriptionMinLength"))
      .max(SERVICE_LIMITS.DESCRIPTION_MAX, t("services.validation.descriptionMaxLength")),
    descriptionAr: z
      .string()
      .trim()
      .max(SERVICE_LIMITS.DESCRIPTION_AR_MAX, t("services.validation.descriptionMaxLength"))
      .optional()
      .or(z.literal("")),
    price: z
      .union([z.string(), z.number()])
      .transform((val) => (typeof val === "string" ? normalizeArabicDigits(val.trim()) : String(val)))
      .refine((val) => val != null && val.length > 0, {
        message: t("services.validation.priceRequired"),
      })
      .refine((val) => /^\d+(\.\d{1,2})?$/.test(val), {
        message: t("services.validation.priceInvalid"),
      }),
    serviceImage: z.any().optional(),
    serviceLocation: serviceLocationSchema.optional(),
    tags: z.array(z.string()).optional(),
    included: z.array(z.string()).optional(),
    duration: z.string().trim().max(SERVICE_LIMITS.DURATION_MAX).optional().or(z.literal("")),
  });

