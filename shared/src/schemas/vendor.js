/**
 * Vendor schemas — vendor settings sections + service form.
 *
 * Hosts the union of the pure-Zod portions of:
 *   - `labbe/utils/schemas/vendorSettings.js` (web — schemas split out from
 *     the section objects; field metadata stays in the app file since it
 *     drives `DynamicForm` rendering)
 *   - `halla-mobile/utils/schemas/vendorSchemas.js`
 *
 * Field shapes mirror backend `users.validation.js#vendorData`. Web's
 * hardcoded Arabic messages and mobile's English messages are kept
 * as-is in each export; the existing call sites already render the
 * right copy per-app.
 */
import { z } from "zod";

// ============================================================
// PRIMITIVES (vendor-local; mirrors the regex backend accepts)
// ============================================================

const optionalUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((v) => v === "" || /^https?:\/\/.+/i.test(v), {
    message: "الرابط غير صالح",
  });

const optionalUrlEn = z
  .string()
  .trim()
  .max(2048)
  .refine((v) => v === "" || /^https?:\/\/.+/i.test(v), {
    message: "Invalid URL format",
  })
  .optional();

const emailFieldAr = z
  .string({ required_error: "البريد الإلكتروني مطلوب" })
  .trim()
  .min(1, "البريد الإلكتروني مطلوب")
  .email("البريد الإلكتروني غير صالح");

const emailFieldEn = z
  .string({ required_error: "Email is required" })
  .trim()
  .email("Invalid email format");

// Backend's vendor profile accepts the loose 7-15 digit phone pattern
// (international staff/owner numbers, distinct from Saudi-only customer
// auth flows). Keep matched.
const phoneFieldAr = z
  .string({ required_error: "رقم الهاتف مطلوب" })
  .trim()
  .regex(/^[+]?[0-9]{7,15}$/, "رقم الهاتف غير صالح");

const phoneFieldEn = z
  .string({ required_error: "Phone number is required" })
  .trim()
  .regex(/^[+]?[0-9]{7,15}$/, "Invalid phone number format");

// ============================================================
// WEB — VENDOR SETTINGS ZOD SCHEMAS (consumed by DynamicForm wrappers)
//
// The original `vendorSettings.js` exports `personalInfoSchema = { fields, zodSchema }`.
// Here we expose only the `zodSchema` payloads. The app re-wraps them
// with its `fields` metadata so DynamicForm keeps working unchanged.
// ============================================================

// Personal Info — single consolidated section. Owns identity (ownerFullName +
// brandName), contact (email, phone), avatar/logo, and password change. Phone
// is OTP-gated and is not committed by the form submit itself — it's submitted
// via the dedicated /users/profile/phone endpoints. Keep it optional here so
// the form validates even when the phone hasn't changed.
export const personalInfoZodSchema = z
  .object({
    avatar: z.any().optional(),
    ownerFullName: z
      .string({ required_error: "اسم المالك مطلوب" })
      .trim()
      .min(2, "اسم المالك يجب أن يكون حرفين على الأقل")
      .max(100, "اسم المالك يجب أن يكون أقل من 100 حرف"),
    brandName: z
      .string({ required_error: "اسم النشاط التجاري مطلوب" })
      .trim()
      .min(2, "اسم النشاط التجاري يجب أن يكون حرفين على الأقل")
      .max(100, "اسم النشاط التجاري يجب أن يكون أقل من 100 حرف"),
    email: emailFieldAr,
    phoneNumber: z
      .string()
      .trim()
      .optional()
      .refine((v) => !v || /^[+]?[0-9]{7,15}$/.test(v), {
        message: "رقم الهاتف غير صالح",
      }),
    currentPassword: z.string().optional(),
    newPassword: z
      .string()
      .optional()
      .refine((v) => !v || v.length >= 8, {
        message: "كلمة المرور يجب أن تكون 8 أحرف على الأقل",
      }),
    confirmPassword: z.string().optional(),
  })
  .superRefine((d, ctx) => {
    if (d.newPassword) {
      if (!d.currentPassword) {
        ctx.addIssue({
          path: ["currentPassword"],
          code: "custom",
          message: "كلمة المرور الحالية مطلوبة لتغيير كلمة المرور",
        });
      }
      if (d.newPassword !== d.confirmPassword) {
        ctx.addIssue({
          path: ["confirmPassword"],
          code: "custom",
          message: "كلمة المرور غير متطابقة",
        });
      }
    }
  });

export const serviceDetailsZodSchema = z.object({
  nationalIdImage: z.any().optional(),
  commercialRecordImage: z.any().optional(),
  nationalId: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^[0-9]{10}$/.test(v), {
      message: "رقم الهوية يجب أن يكون 10 أرقام",
    }),
  serviceDescription: z
    .string()
    .trim()
    .max(1000, "وصف الخدمة يجب أن يكون أقل من 1000 حرف")
    .optional(),
});

export const socialLinksZodSchema = z.object({
  website: optionalUrl.optional(),
  instagram: optionalUrl.optional(),
  facebook: optionalUrl.optional(),
  twitter: optionalUrl.optional(),
  tiktok: optionalUrl.optional(),
});

export const imagesAndPricingZodSchema = z.object({
  portfolioImages: z.any().optional(),
  pricePackages: z.any().optional(),
});

// ============================================================
// MOBILE — VENDOR SETTINGS SCHEMAS (English messages, opaque)
// ============================================================

// Consolidated mobile personal-info schema — identity (ownerFullName +
// brandName) and contact (email + phone). Phone is OTP-gated; the form keeps
// it optional and the OTP flow handles the actual commit.
export const mobilePersonalInfoSchema = z.object({
  ownerFullName: z
    .string({ required_error: "Owner name is required" })
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100),
  brandName: z
    .string({ required_error: "Brand name is required" })
    .trim()
    .min(2, "Brand name must be at least 2 characters")
    .max(100),
  email: emailFieldEn,
  phoneNumber: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^[+]?[0-9]{7,15}$/.test(v), {
      message: "Invalid phone number format",
    }),
});

export const mobileServiceDetailsSchema = z.object({
  serviceDescription: z
    .string()
    .trim()
    .max(1000, "Description must not exceed 1000 characters")
    .optional(),
  nationalId: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^\d{10}$/.test(v), {
      message: "National ID must be 10 digits",
    }),
});

export const mobileSocialLinksSchema = z.object({
  website: optionalUrlEn,
  instagram: optionalUrlEn,
  facebook: optionalUrlEn,
  twitter: optionalUrlEn,
  tiktok: optionalUrlEn,
});

export const phoneChangeSchema = z.object({
  phoneNumber: phoneFieldEn,
});

export const phoneVerifySchema = z.object({
  phoneNumber: phoneFieldEn,
  otp: z
    .string({ required_error: "Verification code is required" })
    .trim()
    .regex(/^\d{4,8}$/, "Verification code must be 4-8 digits"),
});

export const passwordChangeSchema = z
  .object({
    currentPassword: z
      .string({ required_error: "Current password is required" })
      .min(1, "Current password is required"),
    newPassword: z
      .string({ required_error: "New password is required" })
      .min(8, "Password must be at least 8 characters"),
    passwordConfirm: z
      .string({ required_error: "Please confirm your password" })
      .min(1, "Please confirm your password"),
  })
  .refine((d) => d.newPassword === d.passwordConfirm, {
    path: ["passwordConfirm"],
    message: "Passwords do not match",
  });
