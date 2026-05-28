/**
 * Compat re-export. Canonical auth schemas live in
 * `@halla/shared/schemas/auth`. Mobile call sites previously called the
 * factories without `t` (opaque keys) — that behavior is preserved.
 *
 * Each export here materializes the schema once at import time so that
 * existing imports (`import { mobileLoginSchema } from ".../authSchemas"`)
 * receive a Zod schema object, not a factory.
 */
import {
  emailLoginSchema as _emailLogin,
  mobileLoginSchema as _mobileLogin,
  otpSchema as _otp,
  signupMobileSchema as _signupMobile,
  completeProfileSchema as _completeProfile,
  vendorSignupSchema as _vendorSignup,
  whitelabelSignupSchema as _whitelabelSignup,
  forgotPasswordSchema as _forgotPassword,
  resetPasswordSchema as _resetPassword,
} from "@halla/shared/schemas/auth";

export const emailLoginSchema = _emailLogin();
export const mobileLoginSchema = _mobileLogin();
export const otpSchema = _otp();
export const signupMobileSchema = _signupMobile();
export const completeProfileSchema = _completeProfile();
export const vendorSignupSchema = _vendorSignup();
export const whitelabelSignupSchema = _whitelabelSignup();
export const forgotPasswordSchema = _forgotPassword();
export const resetPasswordSchema = _resetPassword();
