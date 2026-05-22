/**
 * Vendor settings Zod schemas (mobile).
 * Pure Zod — no Yup. Field shapes mirror the backend exactly so the same
 * payload format works for web and mobile.
 */
import { z } from "zod";

const optionalUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((v) => v === "" || /^https?:\/\/.+/i.test(v), {
    message: "Invalid URL format",
  })
  .optional();

const emailField = z
  .string({ required_error: "Email is required" })
  .trim()
  .email("Invalid email format");

const phoneField = z
  .string({ required_error: "Phone number is required" })
  .trim()
  .regex(/^[+]?[0-9]{7,15}$/, "Invalid phone number format");

// --- Top-level user fields (no phone — phone is OTP-gated separately) ----
export const personalInfoSchema = z.object({
  name: z
    .string({ required_error: "Name is required" })
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100),
  email: emailField,
});

// --- Vendor identity (sent to /users/profile/vendorData) ----------------
export const basicAccountInfoSchema = z.object({
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
});

// --- Service details (vendor section) -----------------------------------
export const serviceDetailsSchema = z.object({
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

// --- Social links --------------------------------------------------------
export const socialLinksSchema = z.object({
  website: optionalUrl,
  instagram: optionalUrl,
  facebook: optionalUrl,
  twitter: optionalUrl,
  tiktok: optionalUrl,
});

// --- Phone change OTP ----------------------------------------------------
export const phoneChangeSchema = z.object({
  phoneNumber: phoneField,
});

export const phoneVerifySchema = z.object({
  phoneNumber: phoneField,
  otp: z
    .string({ required_error: "Verification code is required" })
    .trim()
    .regex(/^\d{4,8}$/, "Verification code must be 4-8 digits"),
});

// --- Password change -----------------------------------------------------
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
