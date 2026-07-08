/**
 * Primitive schema fragments shared across domains.
 *
 * All exports are FACTORY FUNCTIONS taking an optional translator
 * `t(key)`. When `t` is omitted (or left as the default identity),
 * Zod's error messages become opaque i18n keys (e.g.
 * `"validation.invalidSaudiPhone"`) — mobile screens translate these
 * downstream via `react-i18next`'s `t`. When `t` is passed in,
 * messages are pre-translated — web's `useForm` call sites do this
 * so the `Schema(t)` pattern keeps working unchanged.
 *
 * Patterns mirror `halaa-backend/src/modules/auth/auth.validation.js`
 * so client-side validation never accepts what the backend rejects.
 */
import { z } from "zod";

// Backend canonical Saudi phone pattern (auth.validation.js#phonePattern).
// Accepts: 5XXXXXXXX, 05XXXXXXXX, 9665XXXXXXXX, +9665XXXXXXXX.
export const SAUDI_PHONE_REGEX = /^(\+966|966|0)?5\d{8}$/;

// Backend canonical password complexity (auth.validation.js#passwordPattern).
export const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;

// OTP pattern (6 digits).
export const OTP_REGEX = /^\d{6}$/;

// Saudi National ID (10 digits, starts with 1 or 2).
export const SAUDI_NATIONAL_ID_REGEX = /^[12]\d{9}$/;

// Saudi Commercial Registration (10 digits).
export const SAUDI_COMMERCIAL_REG_REGEX = /^\d{10}$/;

const idT = (k) => k;

export const saudiPhone = (t = idT) =>
  z
    .string()
    .trim()
    .regex(SAUDI_PHONE_REGEX, t("validation.invalidSaudiPhone"));

export const email = (t = idT) =>
  z
    .string()
    .trim()
    .toLowerCase()
    .email(t("validation.invalidEmail"));

export const requiredString = (t = idT, minMessageKey = "validation.required") =>
  z.string().trim().min(1, t(minMessageKey));

export const password = (t = idT) =>
  z
    .string()
    .min(8, t("validation.passwordMinLength"))
    .max(128, t("validation.passwordMaxLength"))
    .regex(PASSWORD_COMPLEXITY_REGEX, t("validation.passwordComplexity"));

export const otpCode = (t = idT) =>
  z
    .string()
    .length(6, t("validation.otpLength"))
    .regex(/^\d+$/, t("validation.otpInvalid"));

export const optionalUrl = () =>
  z.string().url().optional().or(z.literal(""));
