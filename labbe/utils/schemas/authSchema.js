/**
 * Compat re-export. Canonical schemas live in `@halla/shared/schemas/auth`.
 * Existing call sites (`emailLoginSchema(t)`) keep working because the
 * shared schemas are factory functions that accept an optional `t`.
 *
 * Phase 5/8 will migrate imports to `@halla/shared/schemas/auth` directly
 * and this file will be deleted.
 */
"use client";
export {
  emailLoginSchema,
  phoneLoginSchema,
  otpVerificationSchema,
  adminLoginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updatePasswordSchema,
  hostSignupSchema,
  hostProfileCompletionSchema,
  vendorSignupSchema,
  whitelabelSignupSchema,
  updateProfileSchema,
  authSchemas,
} from "@halla/shared/schemas/auth";

export { default } from "@halla/shared/schemas/auth";
