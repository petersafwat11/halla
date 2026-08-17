/**
 * Each export is a factory `(t) => ZodSchema` — call sites pass `t` from
 * `useTranslation("auth")` so validation messages are pre-translated before
 * reaching `zodResolver`.
 */
export {
  emailLoginSchema,
  mobileLoginSchema,
  otpSchema,
  signupMobileSchema,
  completeProfileSchema,
  vendorSignupSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@halaa/shared/schemas/auth";
