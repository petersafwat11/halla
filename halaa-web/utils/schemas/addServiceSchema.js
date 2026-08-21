/**
 * Add Service Schema
 * Zod validation schema + form metadata for the vendor add/edit service flow.
 * Unified with @halaa/shared/schemas/vendor for full contract parity.
 */

import { z } from "zod";
import {
  SERVICE_LIMITS,
  SERVICE_TYPES,
  PREDEFINED_TAGS,
  normalizeArabicDigits,
  addServiceDefaultValues,
} from "@halaa/shared/schemas/vendor";

export { SERVICE_LIMITS, SERVICE_TYPES, PREDEFINED_TAGS, normalizeArabicDigits, addServiceDefaultValues };

const idT = (k) => k;

export const addServiceSchema = (t = idT) =>
  z.object({
    serviceName: z
      .string()
      .trim()
      .min(SERVICE_LIMITS.NAME_MIN, t("addServicePopup.validation.serviceNameMinLength"))
      .max(SERVICE_LIMITS.NAME_MAX, t("addServicePopup.validation.serviceNameMaxLength")),
    serviceNameAr: z
      .string()
      .trim()
      .max(SERVICE_LIMITS.NAME_AR_MAX, t("addServicePopup.validation.serviceNameMaxLength"))
      .optional()
      .or(z.literal("")),
    serviceType: z.string().min(1, t("addServicePopup.validation.serviceTypeRequired")),
    description: z
      .string()
      .trim()
      .min(SERVICE_LIMITS.DESCRIPTION_MIN, t("addServicePopup.validation.descriptionMinLength"))
      .max(SERVICE_LIMITS.DESCRIPTION_MAX, t("addServicePopup.validation.descriptionMaxLength")),
    descriptionAr: z
      .string()
      .trim()
      .max(SERVICE_LIMITS.DESCRIPTION_AR_MAX, t("addServicePopup.validation.descriptionMaxLength"))
      .optional()
      .or(z.literal("")),
    price: z
      .union([z.string(), z.number()])
      .transform((val) => (typeof val === "string" ? normalizeArabicDigits(val.trim()) : val))
      .refine((v) => v !== "" && v !== null && v !== undefined, {
        message: t("addServicePopup.validation.priceRequired"),
      })
      .refine((v) => !Number.isNaN(Number(v)) && Number(v) >= SERVICE_LIMITS.PRICE_MIN, {
        message: t("addServicePopup.validation.priceInvalid"),
      }),
    image: z.any().optional(),
    serviceLocation: z.any().optional(),
    tags: z.any().optional(),
    included: z.any().optional(),
    duration: z.string().trim().max(SERVICE_LIMITS.DURATION_MAX).optional().or(z.literal("")),
  });

export default addServiceSchema;

