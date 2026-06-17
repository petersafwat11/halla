/**
 * Vendor schemas — vendor settings sections + service form.
 *
 * Hosts the union of the pure-Zod portions of:
 *   - `labbe/utils/schemas/vendorSettings.js` (web — schemas split out from
 *     the section objects; field metadata stays in the app file since it
 *     drives `DynamicForm` rendering)
 *   - `halla-mobile/utils/schemas/vendorSchemas.js`
 *
 * Factory functions; pass `t` for translation, omit for opaque keys.
 * Field shapes mirror backend `users.validation.js#vendorData`.
 */
import { z } from "zod";

const idT = (k) => k;

// ============================================================
// PRIMITIVES (vendor-local; mirrors the regex backend accepts)
// ============================================================

const optionalUrl = (t = idT) =>
  z
    .string()
    .trim()
    .max(2048)
    .refine((v) => v === "" || /^https?:\/\/.+/i.test(v), {
      message: t("validation.invalidUrl"),
    });

const optionalUrlEn = (t = idT) =>
  z
    .string()
    .trim()
    .max(2048)
    .refine((v) => v === "" || /^https?:\/\/.+/i.test(v), {
      message: t("validation.invalidUrl"),
    })
    .optional();

const emailField = (t = idT) =>
  z
    .string({ required_error: t("validation.emailRequired") })
    .trim()
    .min(1, t("validation.emailRequired"))
    .email(t("validation.emailInvalid"));

const phoneField = (t = idT) =>
  z
    .string({ required_error: t("validation.phoneRequired") })
    .trim()
    .regex(/^[+]?[0-9]{7,15}$/, t("validation.phoneInvalid"));

// ============================================================
// WEB — VENDOR SETTINGS ZOD SCHEMAS (consumed by DynamicForm wrappers)
// ============================================================

export const personalInfoZodSchema = (t = idT) =>
  z
    .object({
      avatar: z.any().optional(),
      ownerFullName: z
        .string({ required_error: t("validation.ownerNameRequired") })
        .trim()
        .min(2, t("validation.ownerNameMinLength"))
        .max(100, t("validation.ownerNameMaxLength")),
      brandName: z
        .string({ required_error: t("validation.brandNameRequired") })
        .trim()
        .min(2, t("validation.brandNameMinLength"))
        .max(100, t("validation.brandNameMaxLength")),
      email: emailField(t),
      phoneNumber: z
        .string()
        .trim()
        .optional()
        .refine((v) => !v || /^[+]?[0-9]{7,15}$/.test(v), {
          message: t("validation.phoneInvalid"),
        }),
      currentPassword: z.string().optional(),
      newPassword: z
        .string()
        .optional()
        .refine((v) => !v || v.length >= 8, {
          message: t("validation.passwordMinLength"),
        }),
      confirmPassword: z.string().optional(),
    })
    .superRefine((d, ctx) => {
      if (d.newPassword) {
        if (!d.currentPassword) {
          ctx.addIssue({
            path: ["currentPassword"],
            code: "custom",
            message: t("validation.currentPasswordRequired"),
          });
        }
        if (d.newPassword !== d.confirmPassword) {
          ctx.addIssue({
            path: ["confirmPassword"],
            code: "custom",
            message: t("validation.passwordMismatch"),
          });
        }
      }
    });

export const serviceDetailsZodSchema = (t = idT) =>
  z.object({
    nationalIdImage: z.any().optional(),
    commercialRecordImage: z.any().optional(),
    nationalId: z
      .string()
      .trim()
      .optional()
      .refine((v) => !v || /^[0-9]{10}$/.test(v), {
        message: t("validation.nationalIdInvalid"),
      }),
    serviceDescription: z
      .string()
      .trim()
      .max(1000, t("validation.descriptionMaxLength"))
      .optional(),
  });

export const socialLinksZodSchema = (t = idT) =>
  z.object({
    website: optionalUrl(t).optional(),
    instagram: optionalUrl(t).optional(),
    facebook: optionalUrl(t).optional(),
    twitter: optionalUrl(t).optional(),
    tiktok: optionalUrl(t).optional(),
  });

export const imagesAndPricingZodSchema = z.object({
  portfolioImages: z.any().optional(),
  pricePackages: z.any().optional(),
});

// ============================================================
// MOBILE — VENDOR SETTINGS SCHEMAS
// ============================================================

export const mobilePersonalInfoSchema = (t = idT) =>
  z.object({
    ownerFullName: z
      .string({ required_error: t("validation.ownerNameRequired") })
      .trim()
      .min(2, t("validation.ownerNameMinLength"))
      .max(100, t("validation.ownerNameMaxLength")),
    brandName: z
      .string({ required_error: t("validation.brandNameRequired") })
      .trim()
      .min(2, t("validation.brandNameMinLength"))
      .max(100, t("validation.brandNameMaxLength")),
    email: emailField(t),
    phoneNumber: z
      .string()
      .trim()
      .optional()
      .refine((v) => !v || /^[+]?[0-9]{7,15}$/.test(v), {
        message: t("validation.phoneInvalid"),
      }),
  });

export const mobileServiceDetailsSchema = (t = idT) =>
  z.object({
    serviceDescription: z
      .string()
      .trim()
      .max(1000, t("validation.descriptionMaxLength"))
      .optional(),
    nationalId: z
      .string()
      .trim()
      .optional()
      .refine((v) => !v || /^\d{10}$/.test(v), {
        message: t("validation.nationalIdInvalid"),
      }),
  });

export const mobileSocialLinksSchema = (t = idT) =>
  z.object({
    website: optionalUrlEn(t),
    instagram: optionalUrlEn(t),
    facebook: optionalUrlEn(t),
    twitter: optionalUrlEn(t),
    tiktok: optionalUrlEn(t),
  });

export const phoneChangeSchema = (t = idT) =>
  z.object({
    phoneNumber: phoneField(t),
  });

export const phoneVerifySchema = (t = idT) =>
  z.object({
    phoneNumber: phoneField(t),
    otp: z
      .string({ required_error: t("validation.otpRequired") })
      .trim()
      .regex(/^\d{4,8}$/, t("validation.otpInvalid")),
  });

export const passwordChangeSchema = (t = idT) =>
  z
    .object({
      currentPassword: z
        .string({ required_error: t("validation.currentPasswordRequired") })
        .min(1, t("validation.currentPasswordRequired")),
      newPassword: z
        .string({ required_error: t("validation.passwordMinLength") })
        .min(8, t("validation.passwordMinLength")),
      passwordConfirm: z
        .string({ required_error: t("validation.confirmPasswordRequired") })
        .min(1, t("validation.confirmPasswordRequired")),
    })
    .refine((d) => d.newPassword === d.passwordConfirm, {
      path: ["passwordConfirm"],
      message: t("validation.passwordMismatch"),
    });
